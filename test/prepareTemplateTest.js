var
   express = require('express'),
   app = express(),
   path = require('path'),
   bemRender = require("../lib/bemRender")({
      express : app,
      rootPath : __dirname
   })(true),
   trueMethods = {
      loadHTML   : bemRender.prototype.loadHTML,
      readJSON   : bemRender.prototype.readJSON,
      prepareJS  : bemRender.prototype.prepareJS,
      prepareCSS : bemRender.prototype.prepareCSS,
      savePackage: bemRender.prototype.savePackage
   };

exports.prepareTemplate = {
   setUp : function(callback){

      bemRender.prototype.loadHTML = function(isElement, parent, name){
         var
            bPath = path.join("", isElement ? parent : "", name, name),
            html = "";

         if (bPath in this.blocksHash){
            html = this.blocksHash[bPath]["html"];
         }
         else{
            switch (name){
               case "block":
                  html = '<div class="{{=it.blockName}} {{=it.mods}}">{{=it.content}}</div>';
                  break;
               case "element":
                  html = '<span class="{{=it.blockName}} {{=it.mods}}">{{=it.content}}</span>';
                  break;
               case "table":
                  html = '<table class="{{=it.blockName}} {{=it.mods}}">{{=it.content}}</table>';
                  break;
               case "tr":
                  html = '{{~it.content :value:index}}\
<tr class="{{=it.blockName}} {{=it.mods}} {{=it.getMod(it.blockName, \'row\', index%2 ? \'odd\' : \'even\')}}">\
<td class="{{=it.getElementName(it.blockName, \'td\')}}">{{=value.f}}</td>\
<td class="{{=it.getElementName(it.blockName, \'td\')}}">{{=value.s}}</td>\
</tr>\
{{~}}';
                  break;
            }

            this.blocksHash[bPath] = {
               "html": html,
               "css" : this.getCssName(isElement, parent, name)
            };
         }
         return html;
      };

      bemRender.prototype.readJSON = function(jsonPath, cb){
         var json = "";
         switch (jsonPath){
            case "block1.json":
               json = {
                  "block" : "block",
                  "content": "content"
               };
               break;
            case "block2.json":
               json = {
                  "block" : "block",
                  "content": "{{=it.val}}",
                  "mods" : [
                     {"size" : "big"},
                     {"color" : "red"}
                  ]
               };
               break;
            case "block3.json":
               json = {
                  "block" : "block",
                  "content": [
                     {
                        "element" : "element",
                        "content" : "{{=it.val}}"
                     }
                  ]
               };
               break;
            case "block4.json":
               json = {
                  "block" : "table",
                  "content": [
                     {
                        "element" : "tr",
                        "multiple": true,
                        "content" : "{{=it.val}}"
                     }
                  ]
               };
               break;
         }

         cb(null, JSON.stringify(json));
      };

      bemRender.prototype.prepareJS = function(handler){
         handler("fake");
      };

      bemRender.prototype.prepareCSS = function(handler){
         handler(null, "fake");
      };

      bemRender.prototype.savePackage = function(name, str, handler){
         handler(null);
      };

      callback();
   },
   tearDown : function(callback){
      for (var i in trueMethods){
         if (trueMethods.hasOwnProperty(i)){
            bemRender.prototype[i] = trueMethods[i];
         }
      }
      callback();
   },
   test1 : function(test){
      new bemRender("block1.json", {}, function(err, string){
         test.equal('<div class="block ">content</div>', string);
      });
      test.done();
   },
   test2 : function(test){
      new bemRender("block2.json", {val : "text"}, function(err, string){
         test.equal('<div class=\"block block__size-big block__color-red\">text</div>', string);
      });
      test.done();
   },
   test3 : function(test){
      new bemRender("block3.json", {val : "text"}, function(err, string){
         test.equal('<div class="block "><span class="block__element ">text</span></div>', string);
      });
      test.done();
   },
   test4 : function(test){
      new bemRender("block4.json", {val : [{f:1,s:2}, {f:3,s:4}]}, function(err, string){
         test.equal('<table class="table "><tr class="table__tr  table__tr__row-even"><td class="table__tr__td">1</td><td class="table__tr__td">2</td></tr><tr class="table__tr  table__tr__row-odd"><td class="table__tr__td">3</td><td class="table__tr__td">4</td></tr></table>', string);
      });
      test.done();
   }
};
