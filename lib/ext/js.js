define("js", function(){
   function nameParser(name){
      var
         temp = name.split("__"),
         pathWithoutExt = ["blocks"],
         parent = temp[1] ? temp[0] : false,
         element = temp[1] || temp[0];

      if (parent)
         pathWithoutExt.push(parent);
      pathWithoutExt.push(element);
      pathWithoutExt.push(element + ".js");

      return pathWithoutExt.join("/");
   }

   return {
      load: function (name, req, onload, config) {
         req([nameParser(name)], function (js) {
            onload(js);
         });
      }
   }
});