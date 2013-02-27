var
   express = require('express'),
   app = express(),
   bemUtil = require('../lib/bemUtil'),
   bemRender = require("../lib/bemRender")({
      express : app,
      rootPath : __dirname
   })(true);

exports.getCssName = {
   isElement : {
      test1 : function(test){
         var t = bemUtil.getCssName(true, "parent", "name", "modName", "modValue");
         test.equal("parent__name__modName-modValue", t, "method getCssName broken");
         test.done();
      },
      test2 : function(test){
         var t = bemUtil.getCssName(true, "parent", "name", "modName");
         test.equal("parent__name", t, "method getCssName broken");
         test.done();
      },
      test3 : function(test){
         var t = bemUtil.getCssName(true, "parent", "name");
         test.equal("parent__name", t, "method getCssName broken");
         test.done();
      },
      test4 : function(test){
         var t = bemUtil.getCssName(true, "parent");
         test.equal("parent__undefined", t, "method getCssName broken");
         test.done();
      },
      test5 : function(test){
         var t = bemUtil.getCssName(true);
         test.equal("undefined__undefined", t, "method getCssName broken");
         test.done();
      }
   },
   isBlock : {
      test1 : function(test){
         var t = bemUtil.getCssName(false, "parent", "name", "modName", "modValue");
         test.equal("name__modName-modValue", t, "method getCssName broken");
         test.done();
      },
      test2 : function(test){
         var t = bemUtil.getCssName(false, "parent", "name", "modName");
         test.equal("name", t, "method getCssName broken");
         test.done();
      },
      test3 : function(test){
         var t = bemUtil.getCssName(false, "parent", "name");
         test.equal("name", t, "method getCssName broken");
         test.done();
      },
      test4 : function(test){
         var t = bemUtil.getCssName(false, "parent");
         test.equal("undefined", t, "method getCssName broken");
         test.done();
      },
      test5 : function(test){
         var t = bemUtil.getCssName(false);
         test.equal("undefined", t, "method getCssName broken");
         test.done();
      }
   }
};