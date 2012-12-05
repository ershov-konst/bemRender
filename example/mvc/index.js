var
   express = require('express'),
   app = express();

//doT template engine
app.set('view cache', false);
app.set('view engine', 'json');
app.engine('json', require('../../lib/bemRender')({
   express : app,
   rootPath : __dirname
}));
//static files
app.use(express.static(__dirname + '/public'));
//routing
app.all(/\/(?:([^\/]*)\/?)?(?:([^\/]*)\/?)?(.*)?/, require('./lib/router'));
//errors
app.use(require('./lib/errors'));


app.listen(process.env.PORT || 555);
console.log("application was started");