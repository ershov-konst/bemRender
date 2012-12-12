/**
 * Created with JetBrains PhpStorm.
 * User: Konstantin
 * Date: 13.10.12
 * Time: 17:32
 * To change this template use File | Settings | File Templates.
 */
module.exports = {
   index : function(req, res, next){
      var values = {
         text : "<h1>index page</h1>Lorem Ipsum is simply dummy text of the printing and typesetting industry. Lorem Ipsum has been the industry's standard dummy text ever since the 1500s, when an unknown printer took a galley of type and scrambled it to make a type specimen book. It has survived not only five centuries, but also the leap into electronic typesetting, remaining essentially unchanged. It was popularised in the 1960s with the release of Letraset sheets containing Lorem Ipsum passages, and more recently with desktop publishing software like Aldus PageMaker including versions of Lorem Ipsum.",
         tableData : [
            {
               first : "aaaa",
               second : "bbbb"
            },
            {
               first : "ccccc",
               second : "dddd"
            },
            {
               first : "eeeee",
               second : "fffff"
            }
         ]
      };
      res.render('index', values, function(err, string){
         res.send(string);
      })
   }
};