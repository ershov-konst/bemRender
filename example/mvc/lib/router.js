/**
 * router.js
 */

var
   fs = require('fs'),
   controllers = {};

fs.readdirSync('./controllers').forEach(function(controller){
   controllers[controller.replace(/\..*$/, "")] = require('../controllers/' + controller);
});

module.exports = function(req, res, next){
   var
      controller = req.params[0] || "index",
      action = req.params[1] || "index";

   if (controller in controllers && action in controllers[controller]){
      req.params = req.params[2] ? req.params[2].split("/") : [];
      controllers[controller][action](req, res, next);
   }
   else{
      throw new Error('404');
   }
};

