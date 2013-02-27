/**
 * bemRender.js
 * 2012, Ershov Konstantin, https://github.com/ershov-konst/bemRender
 */
var
   fs     = require('fs'),
   mkdipr = require('mkdirp'),
   doT    = require('dot'),
   less   = require('less'),
   path   = require('path'),
   express= require('express'),
   bemUtil = require('./bemUtil');

/**
 *
 * @param config
 * @param config.express
 * @param config.rootPath
 * @param config.cache
 * @param config.blocksPath
 * @param config.publicPath
 * @param config.nameRule
 * @return {Function}
 */
module.exports = function(config){
   //config checking
   if (!config.express){
      throw new Error("express variable is not defined for bemRender");
   }
   if (!config.rootPath){
      throw new Error("root path is not defined for bemRender");
   }

   config.cache = config.cache !== undefined ? config.cache : false;
   config.blocksPath = config.blocksPath || config.rootPath + "/blocks";
   config.publicPath = config.publicPath || config.rootPath + "/public";
   config.nameRule = config.nameRule || "%block%__%element%__%modname%-%modvalue%";

   bemUtil.setRuleName = config.nameRule;

   //block files are available as static files(important for the image specified in css)
   config.express.use("/" + path.basename(config.blocksPath), express.static(config.blocksPath));

   //templates functions cache
   var cache = {};

   var bemRender = function(jsonPath, options, fn){
      var self = this;

      this.bemJson = "";
      this.blocksHash = {};
      this.addJS = [];
      this.addCSS = [];
      this.baseName = path.basename(jsonPath, '.json');

      if (config.cache && jsonPath in cache && typeof cache[jsonPath] == "function"){
         var
            dotFunc = cache[jsonPath],
            result;
         try{
            result = dotFunc(options);
            fn(null, result);
         }
         catch(e){
            fn(e);
         }
      }
      else{
         self.readJSON(jsonPath, function(err, str){
            if (err) fn(err);

            try{
               self.bemJson = JSON.parse(str);
            }
            catch(e){
               fn(e);
            }

            self.defineTplAPI(options);

            //prepare page template
            var pageTpl = self.prepareTemplate(self.bemJson);

            self.prepareCSS(function(e, css){
               if (e) fn(e);
               self.savePackage("all.css", css, function(err){
                  if (err)
                     fn(err);
                  else
                     self.prepareJS(function(js){
                        if (!js.length) fn(null, result);
                        self.savePackage("all.js", js, function(err){
                           if (err) fn(err);
                           try{
                              cache[jsonPath] = doT.template(pageTpl);
                              var result = cache[jsonPath](options);
                              fn(null, result);
                           }
                           catch(e){
                              fn(e);
                           }
                        })
                     })
               });
            });
         });
      }
   };

   /**
    * Prepare page template
    * @param json
    * @param [parent]
    * @return {*}
    */
   bemRender.prototype.prepareTemplate = function(json, parent){
      var
         self = this,
         entity = ("block" in json) ? "block" : ("element" in json) ? "element" : "",
         isElement = entity == "element",
         isMultiple = "multiple" in json,
         name = json[entity],
         html = this.loadHTML(isElement, parent, name),
         serviceVars = {};

      for (var i in json){
         if (json.hasOwnProperty(i)){
            if (i == "content"){
               if (json[i] instanceof Array && !isMultiple){
                  var content = [];
                  json[i].forEach(function(str){
                     content.push(self.prepareTemplate(str, name));
                  });
                  serviceVars[i] = content.join("");
               }
               else{
                  serviceVars[i] = json[i];
               }
            }
            else if(i == "mods" && json[i] instanceof Array){
               var mods = [];
               json[i].forEach(function(mod){
                  for (var m in mod){
                     if (mod.hasOwnProperty(m)){
                        mods.push(bemUtil.getCssName(isElement, parent, name, m, mod[m]));
                        break;
                     }
                  }
               });
               serviceVars["mods"] = mods.join(" ");
            }
            else if(i == "js" && json[i] instanceof Array){
               json[i].forEach(function(js){
                  self.addJS.push(js);
               });
               serviceVars[i] = ["",self.baseName, "all.js"].join("/");
            }
            else if(i == "css" && json[i] instanceof Array){
               json[i].forEach(function(css){
                  self.addCSS.push(css);
               });
               serviceVars[i] = ["",self.baseName, "all.css"].join("/");
            }
         }
         serviceVars["blockName"] = bemUtil.getCssName(isElement, parent, name);
         serviceVars["mods"] = serviceVars["mods"] || "";
      }

      for (var v in serviceVars){
         if (serviceVars.hasOwnProperty(v)){
            html = html.replace(new RegExp("(?:{{[=~]it\\.(" + v + ")}})|(?:it\\.(" + v + "))", "g"), function(str, variable, v){
               var
                  simpleUsage = !!variable,
                  res = serviceVars[variable = simpleUsage ? variable : v];

               if (variable == "content" && res){
                  if (typeof res == "string" && !simpleUsage){
                     if (res.indexOf("{{=") == 0){
                        res = res.replace(/(\{\{=)|(\}\})/g, "");
                     }
                     else{
                        res = ["'","'"].join(res);
                     }
                  }
                  if (typeof res == "object"){
                     res = JSON.stringify(res);
                  }
               }
               else if (typeof res == "string" && !simpleUsage){
                  res = ["'","'"].join(res);
               }

               return res;
            });
         }
      }

      if (serviceVars["content"] && serviceVars["content"] instanceof  Array){
         var opt = this.defineTplAPI({content : serviceVars["content"]});
         html = doT.template(html)(opt);
      }
      return html;
   };

   /**
    * load HTML template
    * @param isElement
    * @param parent
    * @param name
    * @return {String}
    */
   bemRender.prototype.loadHTML = function(isElement, parent, name){
      var
         bPath = path.join(config.blocksPath, isElement ? parent : "", name, name),
         html = "";

      if (bPath in this.blocksHash){
         html = this.blocksHash[bPath]["html"];
      }
      else{
         try{
            html = fs.readFileSync(bPath + ".html", 'utf8');
            this.blocksHash[bPath] = {
               "html": html,
               "css" : this.getCssName(isElement, parent, name)
            };
         }
         catch(e){
            html = "";
            console.log(e.message);
         }
      }
      return html;
   };

   /**
    * read JSON file
    * @param {String} jsonPath
    * @param {function} cb
    */
   bemRender.prototype.readJSON = function(jsonPath, cb){
      fs.readFile(jsonPath, "utf8", cb);
   };

   /**
    * prepare string of all.js
    * @param {function} handler
    */
   bemRender.prototype.prepareJS = function(handler){
      var
         blocks = this.blocksHash,
         addJS = this.addJS,
         bemObj = {},
         indexJS = [];

      addJS.forEach(function(js){
         try{
            indexJS.push(fs.readFileSync(path.join(config.rootPath, js), "utf-8"));
         }
         catch(e){
            console.log(e.message);
         }
      });

      indexJS.push("var bemObj = {};");
      for (var i in blocks){
         if (blocks.hasOwnProperty(i)){
            var js;
            try{
               js = fs.readFileSync(i + ".js", "utf-8");
               indexJS.push("bemObj['"+ blocks[i]["css"] +"'] = " + js + ";");
            }
            catch(e){}
         }
      }

      try{
         indexJS.push(fs.readFileSync(path.join(__dirname, "bemBehavior.js")));
      }
      catch(e){
         handler("//" + e.message);
      }

      handler(indexJS.join('\n'));
   };

   /**
    * prepare string of all.css
    * @param {function} handler
    */
   bemRender.prototype.prepareCSS = function(handler){
      var
         blocks = this.blocksHash,
         addCSS = this.addCSS,
         indexLess = [];

      addCSS.forEach(function(css){
         indexLess.push('@import "' + path.join(config.rootPath, css) + '";');
      });
      for (var i in blocks){
         if (blocks.hasOwnProperty(i)){
            if (fs.existsSync(i + ".less")){
               indexLess.push('@import "' + i + '.less";');
            }
            else if (fs.existsSync(i + ".css")){
               indexLess.push('@import "' + i + '.css";');
            }
         }
      }
      less.render(indexLess.join("\n"), handler);
   };

   /**
    * Save string in a file
    * @param name
    * @param str
    * @param handler
    */
   bemRender.prototype.savePackage = function(name, str, handler){
      var
         jsPath = path.join(config.publicPath, this.baseName);
      mkdipr(jsPath, function(){
         fs.writeFile(path.join(jsPath, name), str, function (err) {
            if (err) handler(err);
            handler(null);
         });
      });
   };

   /**
    * Define api
    * @param options
    */
   bemRender.prototype.defineTplAPI = function(options){
      var self = this;

      //@tplProperty {String} js - link for js file, which include all the scripts
      options.js = path.join("/", self.baseName, "all.js");

      //@tplProperty {String} css - link for css file, which include all the styles
      options.css = path.join("/", self.baseName, "all.css");

      //@tplProperty {String} blockName - css class for block or element
      //@tplProperty {String} modifiers - css classes for predefined modifiers

      /**
       * @tplFunction getElementName - return valid css name for inner element
       * @param {String} blockName
       * @param {String} elementName
       * @return {String}
       */
      options.getElementName = function(blockName, elementName){
         return bemUtil.getCssName(true, blockName, elementName);
      };
      /**
       * @tplFunction getMod - return modifier css class
       * @param {String} blockName
       * @param {String} mod
       * @param {String} val
       * @return {String}
       */
      options.getMod = function(blockName, mod, val){
         return bemUtil.getCssName(false, "", blockName, mod, val);
      };

      return options;
   };

   return function(jsonPath, options, fn){
      if (arguments.length == 1)
         return bemRender;

      return new bemRender(jsonPath, options, fn);
   }
};