var
   fs = require("fs"),
   path = require("path");

function walk(walkPath, func){
   var root = walkPath;
   try{
      var files = fs.readdirSync(root);
      files.forEach(function(f){
         var
            filePath = path.join(root, f),
            stat = fs.statSync(filePath);
         if (stat.isDirectory()){
            walk(filePath, func);
         }
         else{
            func(filePath);
         }
      })
   }
   catch (e){
      console.log("mapModule :: walk :: " + e.message);
   }
}

module.exports = {
   /**
    * Generate map of modules for requirejs
    * @param publicPath - generates map for modules in this folder
    */
   generateMap : function(publicPath){
      var map   = {};
      walk(publicPath, function(file){
         if ((file.match(/\.js$/) || []).length){
            try{
               var
                  buf = fs.readFileSync(file),
                  str = buf.toString("utf8", 0, 50);
               if (str.indexOf("define") === 0){
                  var name = str.match(/^define\((?:"|')([^'"]*)(?:"|')/)[1];
                  if (name !== ""){
                     map[name] = "/" + path.relative(publicPath, file).split(path.sep).join("/");
                  }
               }
            }
            catch (e){}
         }
      });
      return map;
   }
};
