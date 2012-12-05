/**
 * errors.js
 */
var errorHandlers = {
   404 : function(err, req, res, next){
      res.render("404", {page : req.originalUrl});
   }
};

module.exports = function(err, req, res, next){
   if (err.message && err.message in errorHandlers)
      errorHandlers[err.message](err, req, res, next);
   else
      next();
};
