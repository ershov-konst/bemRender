var
   express = require('express'),
   app = express(),
   path = require('path'),
   bemUtil = require('../lib/bemUtil'),
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

      bemRender.prototype.loadHTML = function(isElement, parent, name, blocksHash){
         var
            bPath = path.join("", isElement ? parent : "", name, name),
            html = "";

         if (bPath in blocksHash){
            html = blocksHash[bPath]["html"];
         }
         else{
            switch (name){
               case "simple-block":
                  html = '<div id="{{=it.id}}" class="{{=it.blockName}} {{=it.mods}}">{{=it.content}}</div>';
                  break;
               case "simple-element":
                  html = '<span id="{{=it.id}}" class="{{=it.blockName}} {{=it.mods}}">{{=it.content}}</span>';
                  break;
               case "table":
                  html = '<table id="{{=it.id}}" class="{{=it.blockName}} {{=it.mods}}">{{=it.content}}</table>';
                  break;
               case "tr":
                  html = '{{~it.content :value:index}}\
<tr id="{{=it.id + \'-\' + index}}" class="{{=it.blockName}} {{=it.mods}} {{=it.getMod(it.blockName, \'row\', index%2 ? \'odd\' : \'even\')}}">\
<td class="{{=it.getElementName(it.blockName, \'td\')}}">{{=value.f}}</td>\
<td class="{{=it.getElementName(it.blockName, \'td\')}}">{{=value.s}}</td>\
</tr>\
{{~}}';
                  break;
               case "multiple-element":
                  html = '{{=(function(c, blockName){\
                     var str = "";\
                     for(var i = 0, l = c.length; i < l; i++){\
                        str += "<span id=\'" + it.id + "-" + i +"\' class=\'" + it.blockName + "\'>" + c[i].text + "</span>";\
                     }\
                     return str;\
                  })(it.content, it.blockName)}}';
                  break;
               case "multiple-element-inner-var":
                  html = '{{=(function(c, blockName){\
                     var str = "";\
                     for(var i = 0, l = c.length; i < l; i++){\
                        str += "<span id=\'" + it.id + "-" + i +"\' class=\'" + it.blockName + "\'>" + c[i].text + "</span>";\
                     }\
                     return str;\
                  })(it.content, it.blockName)}}';
                  break;
            }

            blocksHash[bPath] = {
               "html": html,
               "css" : bemUtil.getCssName(isElement, parent, name)
            };
         }
         return html;
      };

      bemRender.prototype.readJSON = function(jsonPath, cb){
         var json = "";
         switch (jsonPath){
            case "testSimpleContentText.json":
               json = {
                  "id" : "id1",
                  "block" : "simple-block",
                  "content": "content"
               };
               break;
            case "testSimpleContentVariable.json":
               json = {
                  "id" : "id2",
                  "block" : "simple-block",
                  "content": "{{=it.val}}"
               };
               break;
            case "testBlockMods.json":
               json = {
                  "id" : "id3",
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
                  "id" : "id4",
                  "block" : "simple-block",
                  "content": [
                     {
                        "id" : "id5",
                        "element" : "simple-element",
                        "content" : "{{=it.val}}"
                     }
                  ]
               };
               break;
            case "testElementMods.json":
               json = {
                  "id" : "id6",
                  "block" : "simple-block",
                  "content": [
                     {
                        "id" : "id7",
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
                  "id" : "id8",
                  "block" : "table",
                  "content": [
                     {
                        "id" : "id9",
                        "element" : "tr",
                        "multiple": true,
                        "content" : "{{=it.val}}"
                     }
                  ]
               };
               break;
            case "tableContent.json":
               json = {
                  "id" : "id10",
                  "block" : "table",
                  "content": [
                     {
                        "id" : "id11",
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
            case "testHtmlTplWithJS1.json":
               json = {
                  "id" : "id12",
                  "block" : "simple-block",
                  "content": [
                     {
                        "id" : "id13",
                        "element" : "multiple-element",
                        "multiple": true,
                        "content" : [
                           {"text": "text1"},
                           {"text": "text2"},
                           {"text": "text3"}
                        ]
                     }
                  ]
               };
               break;
            case "testHtmlTplWithJS2.json":
               json = {
                  "id" : "id14",
                  "block" : "simple-block",
                  "content": [
                     {
                        "id" : "id15",
                        "element" : "multiple-element-inner-var",
                        "multiple": true,
                        "content" : [
                           {"text": "text1"},
                           {"text": "text2"},
                           {"text": "text3"}
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
         test.equal('<div id="id1" class="simple-block ">content</div>', string);
      });
      test.done();
   },
   testSimpleContentVariable : function(test){
      new bemRender("testSimpleContentVariable.json", {val : "content"}, function(err, string){
         test.equal('<div id="id2" class="simple-block ">content</div>', string);
      });
      test.done();
   },
   testBlockMods : function(test){
      new bemRender("testBlockMods.json", {}, function(err, string){
         test.equal('<div id="id3" class="simple-block simple-block__size-big simple-block__color-red">content</div>', string);
      });
      test.done();
   },
   testElement : function(test){
      new bemRender("testElement.json", {val : "text"}, function(err, string){
         test.equal('<div id="id4" class="simple-block "><span id="id5" class="simple-block__simple-element ">text</span></div>', string);
      });
      test.done();
   },
   testElementMods : function(test){
      new bemRender("testElementMods.json", {}, function(err, string){
         test.equal('<div id="id6" class="simple-block "><span id="id7" class="simple-block__simple-element simple-block__simple-element__size-big simple-block__simple-element__color-red">content</span></div>', string);
      });
      test.done();
   },
   testMultipleVariable : function(test){
      new bemRender("tableVariable.json", {val : [{f:1,s:2}, {f:3,s:4}]}, function(err, string){
         test.equal('<table id="id8" class="table "><tr id="id9-0" class="table__tr  table__tr__row-even"><td class="table__tr__td">1</td><td class="table__tr__td">2</td></tr><tr id="id9-1" class="table__tr  table__tr__row-odd"><td class="table__tr__td">3</td><td class="table__tr__td">4</td></tr></table>', string);
      });
      test.done();
   },
   testMultipleContent : function(test){
      new bemRender("tableContent.json", {}, function(err, string){
         test.equal('<table id="id10" class="table "><tr id="id11-0" class="table__tr  table__tr__row-even"><td class="table__tr__td">1</td><td class="table__tr__td">2</td></tr><tr id="id11-1" class="table__tr  table__tr__row-odd"><td class="table__tr__td">3</td><td class="table__tr__td">4</td></tr></table>', string);
      });
      test.done();
   },
   testHtmlTplWithJs1 : function(test){
      new bemRender("testHtmlTplWithJS1.json", {}, function(err, string){
         test.equal("<div id=\"id12\" class=\"simple-block \"><span id='id13-0' class='simple-block__multiple-element'>text1</span><span id='id13-1' class='simple-block__multiple-element'>text2</span><span id='id13-2' class='simple-block__multiple-element'>text3</span></div>", string);
      });
      test.done();
   },
   testHtmlTplWithJs2 : function(test){
      new bemRender("testHtmlTplWithJS2.json", {}, function(err, string){
         test.equal("<div id=\"id14\" class=\"simple-block \"><span id='id15-0' class='simple-block__multiple-element-inner-var'>text1</span><span id='id15-1' class='simple-block__multiple-element-inner-var'>text2</span><span id='id15-2' class='simple-block__multiple-element-inner-var'>text3</span></div>", string);
      });
      test.done();
   }
};
