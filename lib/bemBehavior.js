/**
 * bemBehavior.js
 * 2013, Ershov Konstantin, https://github.com/ershov-konst/bemRender
 */

$br = {
   proto   : {},
   modules : {},
   tech : new (function(){
      var storage = {};

      return {
         set : function(css, techName, tech){
            var obj = storage[css] || (storage[css] = {});
            obj[techName] = tech;
         },
         get : function(css, techName){
            return storage[css] && storage[css][techName] ? storage[css][techName] : null;
         },
         getStorage : function(){
            return storage;
         }
      }
   })(),
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
   config : new (function(){
      var config = {};

      return {
         setConfig : function(conf){
            config = conf;
         },
         get : function(id){
            function getConf(conf, id){
               if (conf["id"] == id){
                  return conf;
               }
               else if (conf["content"] instanceof Array){
                  var r;
                  for (var i = 0, l = conf["content"].length; i < l; i++){
                     if (r = getConf(conf["content"][i], id)){
                        return r;
                     }
                  }
               }
               return null;
            }

            return getConf(config, id);
         }
      }
   })()
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

$(function(){
   var storage = $br.tech.getStorage();

   for (var i in storage){
      if (storage.hasOwnProperty(i)){
         var elements = $("." + i);
         for (var e = 0, l = elements.length; e < l; e++){
            var
               conf = $br.config.get(elements[e].id),
               constr = storage[i]["js"];
            if (constr){
               $br.storage.push(new constr(elements[e], conf));
            }
         }
      }
   }
});