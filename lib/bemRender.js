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

module.exports = function(config){
   //config checking
   if (!config.express){
      throw new Error("express variable is not defined for bemRender");
   }
   if (!config.blocksPath){
      throw new Error("blocks path is not defined for bemRender");
   }
   if (!config.publicPath){
      throw new Error("public path is not defined for bemRender");
   }
   if (!config.nameRule){
      config.nameRule = "%block%__%element%__%modname%-%modvalue%";
   }
   //block files are available as static files(important for the image specified in css)
   config.express.use("/" + path.basename(config.blocksPath), express.static(config.blocksPath));

   /**
    * prepare text of all.js
    * @param {Object} blocks
    * @param {Array} addJS
    * @param {function} handler
    */
   function prepareJS (blocks, addJS, handler){
      var
         bemObj = {},
         indexJS = [];

      addJS.forEach(function(js){
         try{
            indexJS.push(fs.readFileSync(js, "utf-8"));
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
   }

   /**
    * prepare text of all.css
    * @param {Object} blocks
    * @param {Array} addCSS
    * @param {function} handler
    */
   function prepareCSS (blocks, addCSS, handler){
      var indexLess = [];
      addCSS.forEach(function(css){
         indexLess.push('@import "' + css + '";');
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
   }

   /**
    * return css name of (block || element || modifier)
    * @param {Boolean} isElement
    * @param {String} parent
    * @param {String} name
    * @param {String} mod
    * @param {String} modV
    * @return {String}
    */
   function getCssName(isElement, parent, name, mod, modV){
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
   }

   return function(jsonPath, options, fn){
      fs.readFile(jsonPath, 'utf8', function(err, str){
         if (err) return fn(err);

         var
            bemJson = "",
            blocksHash = {},
            addJS = [],
            addCSS= [],
            baseName = path.basename(jsonPath, '.json');

         options.js = path.join(baseName, "all.js");
         options.css = path.join(baseName, "all.css");

         try{
            bemJson = JSON.parse(str);
         }
         catch(e){
            fn(e);
         }

         //prepare page template
         var pageTpl = (function prepareTemplate(json, parent){
            var
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
                        content.push(prepareTemplate(str, name));
                     });
                     json["content"] = content.join("");
                  }
                  else if(i == "mods" && json[i] instanceof Array){
                     var mods = [];
                     json[i].forEach(function(mod){
                        for (var m in mod){
                           if (mod.hasOwnProperty(m)){
                              mods.push(getCssName(isElement, parent, name, m, mod[m]));
                              break;
                           }
                        }
                     });
                     json["mods"] = mods.join(" ");
                  }
                  else if(i == "js" && json[i] instanceof Array){
                     json[i].forEach(function(js){
                        addJS.push(js);
                     });
                     json[i] = path.join(baseName, "all.js");
                  }
                  else if(i == "css" && json[i] instanceof Array){
                     json[i].forEach(function(css){
                        addCSS.push(css);
                     });
                     json[i] = path.join(baseName, "all.css");
                  }
               }
               json["blockName"] = getCssName(isElement, parent, name);
            }
            if (bPath in blocksHash)
               html = blocksHash[bPath]["html"];
            else{
               try{
                  html = fs.readFileSync(bPath + ".html", 'utf8');
                  blocksHash[bPath] = {
                     "html": html,
                     "css" : getCssName(isElement, parent, name)
                  };
               }
               catch(e){
                  console.log(e.message);
                  html = "";
               }
            }
            return doT.template(html)(json);
         })(bemJson);

         var result = doT.template(pageTpl)(options);

         prepareCSS(blocksHash, addCSS, function(e, css){
            if (e) throw e;
            var cssPath = path.join(config.publicPath, baseName);
            mkdipr(cssPath, function(){
               fs.writeFile(path.join(cssPath, "all.css"), css, function (err) {
                  if (err) throw err;
               });
            });
         });
         prepareJS(blocksHash, addJS, function(js){
            if (!js.length) return;
            var jsPath = path.join(config.publicPath, baseName);
            mkdipr(jsPath, function(){
               fs.writeFile(path.join(jsPath, "all.js"), js, function (err) {
                  if (err) throw err;
               });
            });
         });

         fn(null, result);
      });
   }
};