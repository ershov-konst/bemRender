/**
 * bemUtil.js
 * 2013, Ershov Konstantin, https://github.com/ershov-konst/bemRender
 */
(function(exports){

   var ruleName = "%block%__%element%__%modname%-%modvalue%";

   /**
    *
    * @param isElement
    * @param parent
    * @param name
    * @param mod
    * @param modV
    * @return {String}
    */
   exports.getCssName = function (isElement, parent, name, mod, modV) {
      var css = ruleName;
      if (mod && modV) {
         css = css
            .replace(/%modname%/, mod)
            .replace(/%modvalue%/, modV)
      }
      else {
         css = css
            .replace(/[^%]*%modname%/, "")
            .replace(/[^%]*%modvalue%/, "")
      }
      if (isElement) {
         css = css
            .replace(/%element%/, name)
            .replace(/%block%/, parent)
      }
      else {
         css = css
            .replace(/[^%]*%element%/, "")
            .replace(/%block%/, name)
      }

      return css;
   };

   /**
    *
    * @param rN
    */
   exports.setRuleName = function(rN){
      ruleName = rN;
   };

   /**
    *
    * @param html
    * @param serviceVars
    * @return {*}
    */
   exports.prepareTemplate = function(html, serviceVars){
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
                  res = ["\'","\'"].join(res);
               }

               return res;
            });
         }
      }
      return html;
   };

   /**
    *
    * @param json
    * @param config
    * @return {Object}
    */
   exports.getPage = function(json, config){

      var
         baseName = config.baseName,
         loadHTML = config.loadHTML,
         doT      = config.doT,
         blockHash= config.blocksHash,
         addJS    = [],
         addCSS   = [];


      function getTemplate(json, parent){
         var
            entity = ("block" in json) ? "block" : ("element" in json) ? "element" : "",
            isElement = entity == "element",
            isMultiple = "multiple" in json,
            name = json[entity],
            html = loadHTML(isElement, parent, name, blockHash),
            serviceVars = {};


         for (var i in json){
            if (json.hasOwnProperty(i)){
               if (i == "id"){
                  serviceVars[i] = json[i];
               }
               else if (i == "content"){
                  if (json[i] instanceof Array && !isMultiple){
                     var content = [];
                     json[i].forEach(function(str){
                        content.push(getTemplate(str, name));
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
                           mods.push(exports.getCssName(isElement, parent, name, m, mod[m]));
                           break;
                        }
                     }
                  });
                  serviceVars["mods"] = mods.join(" ");
               }
               else if(i == "js" && json[i] instanceof Array){
                  json[i].forEach(function(js){
                     addJS.push(js);
                  });
                  serviceVars[i] = ["", baseName, "all.js"].join("/");
               }
               else if(i == "css" && json[i] instanceof Array){
                  json[i].forEach(function(css){
                     addCSS.push(css);
                  });
                  serviceVars[i] = ["", baseName, "all.css"].join("/");
               }
            }
            serviceVars["blockName"] = exports.getCssName(isElement, parent, name);
            serviceVars["mods"] = serviceVars["mods"] || "";
         }

         html = exports.prepareTemplate(html, serviceVars);

         if (serviceVars["content"] && serviceVars["content"] instanceof  Array){
            var opt = exports.defineTplAPI({content : serviceVars["content"]}, baseName);
            html = doT.template(html)(opt);
         }
         return html;

      }

      return {
         html    : getTemplate(json),
         addJS   : addJS,
         addCSS  : addCSS
      };
   };

   /**
    *
    * @param options
    * @param baseName
    * @return {*}
    */
   exports.defineTplAPI = function(options, baseName){

      //@tplProperty {String} js - link for js file, which include all the scripts
      options.js = ["/", baseName, "/all.js"].join("");

      //@tplProperty {String} css - link for css file, which include all the styles
      options.css = ["/", baseName, "/all.css"].join("");

      //@tplProperty {String} blockName - css class for block or element
      //@tplProperty {String} modifiers - css classes for predefined modifiers

      /**
       * @tplFunction getElementName - return valid css name for inner element
       * @param {String} blockName
       * @param {String} elementName
       * @return {String}
       */
      options.getElementName = function(blockName, elementName){
         return exports.getCssName(true, blockName, elementName);
      };
      /**
       * @tplFunction getMod - return modifier css class
       * @param {String} blockName
       * @param {String} mod
       * @param {String} val
       * @return {String}
       */
      options.getMod = function(blockName, mod, val){
         return exports.getCssName(false, "", blockName, mod, val);
      };

      return options;
   }

})(typeof exports !== 'undefined' ? exports : this["$br"]["util"] = {});