/**
 * bemBehavior.js
 * 2013, Ershov Konstantin, https://github.com/ershov-konst/bemRender
 */

$br = {
   proto   : {},
   modules : {},
   storage : new (function(){
      var storage = [];

      return {
         push : function(ctrl){
            storage.push(ctrl);
         },
         getElementsByName : function(name){
            var results = [];
            for (var i = 0, l = storage.length; i < l; i ++){
               if (storage[i].getName() == name){
                  results.push(storage[i]);
               }
            }
            return results;
         },
         getElementsByClass : function(className){
            var results = [];
            for (var i = 0, l = storage.length; i < l; i ++){
               if (storage[i] instanceof className){
                  results.push(storage[i]);
               }
            }
            return results;
         },
         destroy : function(ctrl){
            for (var i = 0, l = storage.length; i < l; i ++){
               if (storage[i] == ctrl){
                  storage.splice(i, 1);
                  break;
               }
            }
         }
      }
   })(),
   /*!
    * contentloaded.js
    *
    * Author: Diego Perini (diego.perini at gmail.com)
    * Summary: cross-browser wrapper for DOMContentLoaded
    * Updated: 20101020
    * License: MIT
    * Version: 1.2
    *
    * URL:
    * http://javascript.nwbox.com/ContentLoaded/
    * http://javascript.nwbox.com/ContentLoaded/MIT-LICENSE
    *
    */
   ready : function (fn) {
      var win = window, done = false, top = true,

         doc = win.document, root = doc.documentElement,

         add = doc.addEventListener ? 'addEventListener' : 'attachEvent',
         rem = doc.addEventListener ? 'removeEventListener' : 'detachEvent',
         pre = doc.addEventListener ? '' : 'on',

         init = function (e) {
            if (e.type == 'readystatechange' && doc.readyState != 'complete') return;
            (e.type == 'load' ? win : doc)[rem](pre + e.type, init, false);
            if (!done && (done = true)) fn.call(win, e.type || e);
         },

         poll = function () {
            try {
               root.doScroll('left');
            } catch (e) {
               setTimeout(poll, 50);
               return;
            }
            init('poll');
         };

      if (doc.readyState == 'complete') fn.call(win, 'lazy');
      else {
         if (doc.createEventObject && root.doScroll) {
            try {
               top = !win.frameElement;
            } catch (e) {
            }
            if (top) poll();
         }
         doc[add](pre + 'DOMContentLoaded', init, false);
         doc[add](pre + 'readystatechange', init, false);
         win[add](pre + 'load', init, false);
      }
   }
};

/**
 * Abstract class
 * @param cfg
 * @constructor
 */
$br.proto.Abstract = function(cfg){
   cfg = cfg || {};
   this.name = cfg.name || ""
};
$br.proto.Abstract.prototype.destroy = function(){
   $br.storage.destroy(this);
};
$br.proto.getName = function(){
   return this.name;
};

$br.ready(function(){
   if (bemObj){
      for(var i in bemObj){
         if (bemObj.hasOwnProperty(i)){
            var elements = document.getElementsByClassName(i);
            for (var e = 0, l = elements.length; e < l; e++){
               $br.storage.push(new bemObj[i](elements[e]));
            }
         }
      }
   }
});