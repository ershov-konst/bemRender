define("module", function(){
   return {
      load: function (name, req, onload, config) {
         var
            paths = config["paths"],
            path = paths[["module", name].join("!")] || name;
         req([path], function (js) {
            onload(js);
         });
      }
   }
});