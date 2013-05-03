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
   async = require('async');

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

   config.debug = config.debug || false;
   config.cache = config.cache !== undefined ? config.cache : false;
   config.blocksPath = config.blocksPath || config.rootPath + "/blocks";
   config.publicPath = config.publicPath || config.rootPath + "/public";
   config.nameRule = config.nameRule || "%block%__%element%__%modname%-%modvalue%";

   bemUtil.setRuleName = config.nameRule;

   //block files are available as static files(important for the image specified in css)
   config.express.use("/" + path.basename(config.blocksPath), express.static(config.blocksPath));
   config.express.use("/lib", express.static(__dirname));

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
               if (e){
                  fn(e);
               }
               else{
                  options["css"] = css;
                  self.prepareJS(function(e, js){
                     if (e){
                        fn(e);
                     }
                     else{
                        options["js"] = js;
                        cache[jsonPath] = doT.template(pageTpl);
                        fn(null, cache[jsonPath](options));
                     }
                  })
               }
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
         self = this,
         blocks = this.blocksHash,
         addJS = this.addJS,
         preparedJS,         //путь до пакета со всеми модулями
         libsArray = [],     //список зависимостей (библиотеки)
         libsJs = "",        //скрипт склееный из необходимых библиотек
         modulesArray = [],  //список зависимостей (модули блоков и прикладные модули)
         modulesJs = "";     //скрипт склееный из модулей


      if (config.debug){
         //если включен режим отладки, то заполняем массив зависимостей необходимыми библиотеками
         libsArray.push("/lib/ext/js.js");
         libsArray.push("/lib/ext/jquery.js");
         libsArray.push("/lib/bemBehavior.js");
         libsArray.push("/lib/bemUtil.js");
      }
      else{
         //если режим отладки выключен, то собираем библиотеки в пакет
         libsArray.push("/libs.js");
         try{
            var temp = [];
            temp.push(fs.readFileSync(path.join(__dirname, "/ext/js.js")));
            temp.push(fs.readFileSync(path.join(__dirname, "/ext/jquery.js")));
            temp.push(fs.readFileSync(path.join(__dirname, "bemBehavior.js")));
            temp.push(fs.readFileSync(path.join(__dirname, "bemUtil.js")));
            libsJs = temp.join("\n");
         }
         catch(e){
            libsJs = "//" + e.message;
         }
      }

      var mTemp = []; //временный массив с прочитанными модулями
      for (var i in blocks){
         if (blocks.hasOwnProperty(i)){
            if (fs.existsSync(i + ".js")){
               modulesArray.push("js!" + blocks[i]["css"]);
               if (!config.debug){
                  try{
                     mTemp.push(fs.readFileSync(i + ".js", "utf-8"))
                  }
                  catch (e){}
               }
            }
         }
      }
      addJS.forEach(function(js){
         modulesArray.push(js);
         if (!config.debug){
            try{
               mTemp.push(fs.readFileSync(i + ".js", "utf-8"))
            }
            catch (e){}
         }
      });

      modulesJs = mTemp.join("\n");


      var asyncArray = [];

      if (libsJs.length){
         asyncArray.push(function(callback){
            self.savePackage("libs.js", libsJs, callback);
         })
      }
      if (modulesJs.length){
         preparedJS = path.join(self.baseName, "all.js");
         asyncArray.push(function(callback){
            self.savePackage(preparedJS, modulesJs, callback);
         })
      }

      async.parallel(asyncArray, function(err, results){
         if (!err){
            fs.readFile(path.join(__dirname, "bemStart.dot"), "utf8", function(err, res){
               if (!err){
                  var dotFunc = doT.template(res);
                  handler(null, dotFunc({
                     preparedJS  : preparedJS,                   //путь к пакету из модулей блоков и клиентских модулей
                     libs        : JSON.stringify(libsArray),                    //список зависимостей (библиотек)
                     dependencies: JSON.stringify(modulesArray),                 //список зависимостей (модулей блоков и клиентских модулей)
                     config      : JSON.stringify(self.bemJson)  //конфигурация страницы
                  }))
               }
               else{
                  handler(err);
               }
            })
         }
      });
   };

   /**
    * prepare string of all.css
    * @param {function} handler
    */
   bemRender.prototype.prepareCSS = function(handler){
      var
         self = this,
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
      less.render(indexLess.join("\n"), function(err, css){
         if (err){
            handler(err);
         }
         else{
            var cssPath = path.join(self.baseName, "all.css");
            self.savePackage(cssPath, css, function(err){
               if (!err){
                  handler(null, '<link rel="stylesheet" href="'+ cssPath +'"/>');
               }
               else{
                  handler(err);
               }
            });
         }
      });
   };

   /**
    * Save string in a file for public access
    * @param name
    * @param str
    * @param handler
    */
   bemRender.prototype.savePackage = function(name, str, handler){
      var
         filePath = path.join(config.publicPath, name),
         dirName = path.dirname(filePath);
      mkdipr(dirName, function(){
         fs.writeFile(filePath, str, function (err) {
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