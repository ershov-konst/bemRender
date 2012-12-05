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
   express= require('express');

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
         fs.readFile(jsonPath, 'utf8', function(err, str){
            if (err) return fn(err);

            try{
               self.bemJson = JSON.parse(str);
            }
            catch(e){
               fn(e);
            }

            options.js = path.join("/", self.baseName, "all.js");
            options.css = path.join("/", self.baseName, "all.css");

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
    * @param parent
    * @return {*}
    */
   bemRender.prototype.prepareTemplate = function(json, parent){
      var
         self = this,
         entity = ("block" in json) ? "block" : ("element" in json) ? "element" : "",
         isElement = entity == "element",
         name = json[entity],
         html = "",
         bPath = path.join(config.blocksPath, isElement ? parent : "", name, name);

      for (var i in json){
         if (json.hasOwnProperty(i)){
            if (i == "content" && json[i] instanceof Array){
               var content = [];
               json[i].forEach(function(str){
                  content.push(self.prepareTemplate(str, name));
               });
               json["content"] = content.join("");
            }
            else if(i == "mods" && json[i] instanceof Array){
               var mods = [];
               json[i].forEach(function(mod){
                  for (var m in mod){
                     if (mod.hasOwnProperty(m)){
                        mods.push(self.getCssName(isElement, parent, name, m, mod[m]));
                        break;
                     }
                  }
               });
               json["mods"] = mods.join(" ");
            }
            else if(i == "js" && json[i] instanceof Array){
               json[i].forEach(function(js){
                  self.addJS.push(js);
               });
               json[i] = ["",self.baseName, "all.js"].join("/");
            }
            else if(i == "css" && json[i] instanceof Array){
               json[i].forEach(function(css){
                  self.addCSS.push(css);
               });
               json[i] = ["",self.baseName, "all.css"].join("/");
            }
         }
         json["blockName"] = self.getCssName(isElement, parent, name);
         json["getBlockName"] = function(n){
            return self.getCssName(isElement, parent, name + n);
         };
         json["mods"] = json["mods"] || "";
      }
      if (bPath in self.blocksHash)
         html = self.blocksHash[bPath]["html"];
      else{
         try{
            html = fs.readFileSync(bPath + ".html", 'utf8');
            self.blocksHash[bPath] = {
               "html": html,
               "css" : self.getCssName(isElement, parent, name)
            };
         }
         catch(e){
            console.log(e.message);
            html = "";
         }
      }
      return doT.template(html)(json);
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
    * return css name of (block || element || modifier)
    * @param {Boolean} isElement
    * @param {String} parent
    * @param {String} name
    * @param {String} mod
    * @param {String} modV
    * @return {String}
    */
   bemRender.prototype.getCssName = function(isElement, parent, name, mod, modV){
      var css = config.nameRule;
      if (mod && modV){
         css = css
            .replace(/%modname%/, mod)
            .replace(/%modvalue%/, modV)
      }
      else{
         css = css
            .replace(/[^%]*%modname%/, "")
            .replace(/[^%]*%modvalue%/, "")
      }
      if (isElement){
         css = css
            .replace(/%element%/, name)
            .replace(/%block%/, parent)
      }
      else{
         css = css
            .replace(/[^%]*%element%/, "")
            .replace(/%block%/, name)
      }

      return css;
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

   return function(jsonPath, options, fn){
      return new bemRender(jsonPath, options, fn);
   }
};