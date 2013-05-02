define("button", [], function(){
   var c = function(container){
      this.container = container;

      $(this.container).click(function(){
         alert("click");
      });
   };

   c.prototype.setCaption = function(caption){
      this.container.html(caption);
   };

   return c;
});
