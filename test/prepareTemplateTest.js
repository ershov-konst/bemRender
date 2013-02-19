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
               case "simple-block":
                  html = '<div class="{{=it.blockName}} {{=it.mods}}">{{=it.content}}</div>';
                  break;
               case "simple-element":
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
            case "testSimpleContentText.json":
               json = {
                  "block" : "simple-block",
                  "content": "content"
               };
               break;
            case "testSimpleContentVariable.json":
               json = {
                  "block" : "simple-block",
                  "content": "{{=it.val}}"
               };
               break;
            case "testBlockMods.json":
               json = {
                  "block" : "simple-block",
                  "content": "content",
                  "mods" : [
                     {"size" : "big"},
                     {"color" : "red"}
                  ]
               };
               break;
            case "testElement.json":
               json = {
                  "block" : "simple-block",
                  "content": [
                     {
                        "element" : "simple-element",
                        "content" : "{{=it.val}}"
                     }
                  ]
               };
               break;
            case "testElementMods.json":
               json = {
                  "block" : "simple-block",
                  "content": [
                     {
                        "element" : "simple-element",
                        "content" : "content",
                        "mods" : [
                           {"size" : "big"},
                           {"color" : "red"}
                        ]
                     }

                  ]
               };
               break;
            case "tableVariable.json":
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
            case "tableContent.json":
               json = {
                  "block" : "table",
                  "content": [
                     {
                        "element" : "tr",
                        "multiple": true,
                        "content" : [
                           {"f":1,"s":2},
                           {"f":3,"s":4}
                        ]
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
   testSimpleContentText : function(test){
      new bemRender("testSimpleContentText.json", {}, function(err, string){
         test.equal('<div class="simple-block ">content</div>', string);
      });
      test.done();
   },
   testSimpleContentVariable : function(test){
      new bemRender("testSimpleContentVariable.json", {val : "content"}, function(err, string){
         test.equal('<div class="simple-block ">content</div>', string);
      });
      test.done();
   },
   testBlockMods : function(test){
      new bemRender("testBlockMods.json", {}, function(err, string){
         test.equal('<div class="simple-block simple-block__size-big simple-block__color-red">content</div>', string);
      });
      test.done();
   },
   testElement : function(test){
      new bemRender("testElement.json", {val : "text"}, function(err, string){
         test.equal('<div class="simple-block "><span class="simple-block__simple-element ">text</span></div>', string);
      });
      test.done();
   },
   testElementMods : function(test){
      new bemRender("testElementMods.json", {}, function(err, string){
         test.equal('<div class="simple-block "><span class="simple-block__simple-element simple-block__simple-element__size-big simple-block__simple-element__color-red">content</span></div>', string);
      });
      test.done();
   },
   testMultipleVariable : function(test){
      new bemRender("tableVariable.json", {val : [{f:1,s:2}, {f:3,s:4}]}, function(err, string){
         test.equal('<table class="table "><tr class="table__tr  table__tr__row-even"><td class="table__tr__td">1</td><td class="table__tr__td">2</td></tr><tr class="table__tr  table__tr__row-odd"><td class="table__tr__td">3</td><td class="table__tr__td">4</td></tr></table>', string);
      });
      test.done();
   },
   testMultipleContent : function(test){
      new bemRender("tableContent.json", {}, function(err, string){
         test.equal('<table class="table "><tr class="table__tr  table__tr__row-even"><td class="table__tr__td">1</td><td class="table__tr__td">2</td></tr><tr class="table__tr  table__tr__row-odd"><td class="table__tr__td">3</td><td class="table__tr__td">4</td></tr></table>', string);
      });
      test.done();
   }
};
