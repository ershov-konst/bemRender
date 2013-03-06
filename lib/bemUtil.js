/**
 * bemUtil.js
 * 2013, Ershov Konstantin, https://github.com/ershov-konst/bemRender
 */
(function(exports){

   var ruleName = "%block%__%element%__%modname%-%modvalue%";

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

   exports.setRuleName = function(rN){
      ruleName = rN;
   };

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
                  res = ["'","'"].join(res);
               }

               return res;
            });
         }
      }
      return html;
   }

})(typeof exports !== 'undefined' ? exports : (this["bemRender"] = this["bemRender"] || {})["util"] = {});