/**
 * bemRender.js
 * 2013, Ershov Konstantin, https://github.com/ershov-konst/bemRender
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

            bemUtil.defineTplAPI(options, self.baseName);

            //prepare page template
            var
               pageObj = bemUtil.getPage(self.bemJson, {
                  baseName  : self.baseName,
                  loadHTML  : self.loadHTML,
                  blocksHash: self.blocksHash,
                  doT       : doT
               }),
               pageTpl = pageObj.html;


            self.addCSS = pageObj.addCSS;
            self.addJS = pageObj.addJS;

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
    *
    * @param isElement
    * @param parent
    * @param name
    * @param blocksHash
    * @return {String}
    */
   bemRender.prototype.loadHTML = function(isElement, parent, name, blocksHash){
      var
         bPath = path.join(config.blocksPath, isElement ? parent : "", name, name),
         html = "";

      if (bPath in blocksHash){
         html = blocksHash[bPath]["html"];
      }
      else{
         try{
            html = fs.readFileSync(bPath + ".html", 'utf8');
            blocksHash[bPath] = {
               "html": html,
               "css" : bemUtil.getCssName(isElement, parent, name)
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

      try{
         indexJS.push(fs.readFileSync(path.join(__dirname, "bemBehavior.js")));
         indexJS.push(fs.readFileSync(path.join(__dirname, "bemUtil.js")));
      }
      catch(e){
         handler("//" + e.message);
      }

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

   return function(jsonPath, options, fn){
      if (arguments.length == 1)
         return bemRender;

      return new bemRender(jsonPath, options, fn);
   }
};