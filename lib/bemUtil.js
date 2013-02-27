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
   }

})(exports !== 'undefined' ? exports : (this["bemRender"] = this["bemRender"] || {})["util"] = {});