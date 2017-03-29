Fliplet.Widget.instance('image', function (data) {

  $.fn.fadeInImg = function(img){
    return $(this).each(function(){
      var $placeholder = $(this);
      $placeholder.replaceWith(img);
      setTimeout(function(){
        img.classList.add('lazy-loaded');
        setTimeout(function(){
          img.classList.remove('lazy-placeholder');
        }, 0);
      }, 0);
    });
  }

  var canvas = this;
  var imageUrl = data.image && data.image.url;

  if (!imageUrl) {
    return;
  }

  var $placeholder = $(canvas);
  var img = document.createElement('IMG');
  img.className = canvas.className;
  img.style = canvas.style;
  img.width = canvas.width;
  img.height = canvas.height;
  img.dataset.imageId = canvas.dataset.imageId;
  var $img = $(img);
  $img.on('load', function(){
    $placeholder.fadeInImg(this);
  }).on('error', function(){
    $placeholder.fadeInImg(this);
  }).attr('src', imageUrl);

  if (!data.action) {
    return;
  }
  $img.on('click', function (event) {
    event.preventDefault();
    Fliplet.Navigate.to(data.action);
  });
});
