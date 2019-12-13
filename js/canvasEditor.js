window.onerror = function (msg, url, lineNo, columnNo, error) {
  if (typeof Raven !== 'undefined') {
    Raven.captureMessage('Error loading image:  ' + msg + '. At line: ' + lineNo + '. In the file: ' + url, {
      user: Fliplet.User.get('id'),
      mediaFile: _this.originalImage,
      errorObject: error
    });
  }
  return false;
}

var CanvasEditor = function(config){
  this.sourceCanvas = config.sourceCanvas;
  this.editorCanvas = config.editorCanvas;
  this.originalImage = config.image;
  this.isDev = config.isDev || false;
  this.currentImage = null; // this is current image
  this.HERMITE = new Hermite_class();
  this.lastCropCoordindates;
  this.MAX_CANVAS_HEIGHT = 250;
  this.CROP_MASK_IDENTATION = 15;
  this.currentMode = 'main';
  this.beforeRenderCallback = config.beforeRenderCallback || function(){};
  this.afterRenderCallback = config.afterRenderCallback || function(){};
};


CanvasEditor.prototype.init = function(callback){
  var that = this;
  this.beforeRenderCallback();
  this.loadImageFromUrl(this.originalImage.url, function (err, image){
    that.currentImage = image;
    that.drawImage(that.sourceCanvas, image);
    that.drawImage(that.editorCanvas, image);
    callback();
    that.afterRenderCallback();
  });
};

CanvasEditor.prototype.loadImageFromUrl = function(imgUrl, callback) {
  //add local dev
  var _this = this;
  var img = new Image;
  var src = imgUrl + (this.isDev ? '?_=' + Date.now() : ''); // insert image url here

  img.crossOrigin = "Anonymous";

  img.onload = function() {
    callback(null, img);
  };

  img.src = src;

// make sure the load event fires for cached images too
  if ( img.complete || img.complete === undefined ) {
    img.src = "data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///ywAAAAAAQABAAACAUwAOw==";
    img.src = src;
  }
};

CanvasEditor.prototype.loadImageFromData = function(imgData, callback){
  var img = new Image,
    src = imgData;

  img.onload = function() {
    callback(null, img);
  };

  img.src = src;
};

CanvasEditor.prototype.drawImage = function(canvas, img){
  var ctx = canvas.getContext("2d");
  canvas.width = img.width;
  canvas.height = img.height;
  ctx.drawImage( img, 0, 0 );
};

CanvasEditor.prototype.drawCanvas = function(sourceCanvas, destinationCanvas) {
  var destinationContext = destinationCanvas.getContext('2d');
  destinationCanvas.width = sourceCanvas.width;
  destinationCanvas.height = sourceCanvas.height;
  destinationContext.drawImage(sourceCanvas, 0, 0);
};

CanvasEditor.prototype.resetEditorCanvas = function() {
  this.drawCanvas(this.sourceCanvas, this.editorCanvas);
};

CanvasEditor.prototype.applyEditorCanvasChanges = function() {
  this.drawCanvas(this.editorCanvas, this.sourceCanvas);
  //save new image
};


CanvasEditor.prototype.resizeCanvas = function(canvas, width, height, callback) {
  var that = this;
  var canvasObject = this.currentMode === 'crop' ? this.trimCanvas(canvas) : canvas;

  callback = callback || function(){};

  if (width < 1) width = 1;
  if (height < 1) height = 1;
  
  this.beforeRenderCallback();
  this.HERMITE.resample(canvasObject, width, height, true, function() {
    that.afterRenderCallback();
    callback()
  });
};

CanvasEditor.prototype.resizeEditorCanvas = function(width, height, callback) {
  this.resetEditorCanvas();
  this.resizeCanvas(this.editorCanvas, width, height, callback);
};

CanvasEditor.prototype.rotateCanvas = function(canvas, degrees, callback) {
  var that = this;
  callback = callback || function(){};
  this.beforeRenderCallback();

  setTimeout(function(){
    that.loadImageFromData(canvas.toDataURL(), function(err, image){
      var context = canvas.getContext('2d');
      canvas.width =  image.height;
      canvas.height = image.width;
      context.rotate(degrees * Math.PI / 180);

      switch (degrees) {
        case 90 :
          context.drawImage(image, 0, -image.height);
          break;
        case -90 :
          context.drawImage(image, -image.width, 0);
          break;
      }
      callback();
      that.afterRenderCallback();
    }, 100);
  })

};

CanvasEditor.prototype.rotateEditorCanvas =  function(degrees, callback) {
  this.rotateCanvas(this.editorCanvas, degrees, callback);
};

CanvasEditor.prototype.cropCanvas = function (canvas, x, y, w, h, callback) {
  var that = this;
  callback = callback || function(){};
  this.beforeRenderCallback();
  this.loadImageFromData(canvas.toDataURL(), function(err, image) {
    var context = canvas.getContext('2d');
    canvas.width = w;
    canvas.height = h;
    context.drawImage(image, x, y, w, h, 0, 0, w, h);
    callback();
    that.afterRenderCallback();
  });
};

CanvasEditor.prototype.trimCanvas = function (canvas) {
  var ctx = canvas.getContext('2d'),
        copy = document.createElement('canvas').getContext('2d'),
        pixels = ctx.getImageData(0, 0, canvas.width, canvas.height),
        l = pixels.data.length,
        i,
        bound = {
            top: null,
            left: null,
            right: null,
            bottom: null
        },
        x, y;
    
    // Iterate over every pixel to find the highest
    // and where it ends on every axis ()
    for (i = 0; i < l; i += 4) {
        if (pixels.data[i + 3] !== 0) {
            x = (i / 4) % canvas.width;
            y = Math.floor((i / 4) / canvas.width);

            if (bound.top === null) {
                bound.top = y;
            }

            if (bound.left === null) {
                bound.left = x;
            } else if (x < bound.left) {
                bound.left = x;
            }

            if (bound.right === null) {
                bound.right = x;
            } else if (bound.right < x) {
                bound.right = x;
            }

            if (bound.bottom === null) {
                bound.bottom = y;
            } else if (bound.bottom < y) {
                bound.bottom = y;
            }
        }
    }
    
    // Calculate the height and width of the content
    var trimHeight = bound.bottom - bound.top,
        trimWidth = bound.right - bound.left,
        trimmed = ctx.getImageData(bound.left, bound.top, trimWidth, trimHeight);

    copy.canvas.width = trimWidth;
    copy.canvas.height = trimHeight;
    copy.putImageData(trimmed, 0, 0);

    // Return trimmed canvas
    return copy.canvas;
};

CanvasEditor.prototype.cropEditorCanvas = function(x, y, w, h, callback) {
  this.resetEditorCanvas();
  this.cropCanvas(this.editorCanvas, x, y, w, h, callback);
};

CanvasEditor.prototype.notInBorders = function(coords, mousePos) {
  if (!mousePos) {
    return false;
  }
  
  var $container = $(this.editorCanvas).parent();
  var containerSize = {
    height: $container.innerHeight(),
    width: $container.innerWidth()
  };
  var mouseX = mousePos.pageX - $container.offset().left;
  var mouseY = mousePos.pageY - $container.offset().top;

  return (coords.x === 0 && mouseX < 0)
    ||  (coords.y === 0 &&  mouseY < 0)
    ||  (coords.x2 === containerSize.width && mouseX > containerSize.width)
    ||  (mouseY > containerSize.height && coords.y2 === containerSize.height);
}

CanvasEditor.prototype.createCropMask = function(updateCropCoords) {
  var that = this;

  var ratio = this.sourceCanvas.width / this.sourceCanvas.height;
  var width =  Math.round(this.MAX_CANVAS_HEIGHT * ratio);
  var proportion = this.sourceCanvas.width / this.editorCanvas.clientWidth;

  this.resizeEditorCanvas(width, this.MAX_CANVAS_HEIGHT, function() {
    $(that.editorCanvas).parent().Jcrop({
      setSelect: [
        that.CROP_MASK_IDENTATION,
        that.CROP_MASK_IDENTATION,
        that.editorCanvas.clientWidth - that.CROP_MASK_IDENTATION * 2,
        that.editorCanvas.clientHeight - that.CROP_MASK_IDENTATION * 2
      ],
      onChange: function (coords) {
        if (!that.isCoordsEquel(coords, that.lastCropCoordindates)) {
          updateCropCoords(coords, proportion);
          lastCropCoordindates = coords;
        }

        if (that.notInBorders(coords, event)) {
          $(event.target).trigger('mouseup');
        }
      },
      onRelease: function () {
      }
    });
    updateCropCoords({
      x: that.CROP_MASK_IDENTATION,
      y: that.CROP_MASK_IDENTATION,
      w: that.editorCanvas.clientWidth - that.CROP_MASK_IDENTATION * 2,
      h: that.editorCanvas.clientHeight - that.CROP_MASK_IDENTATION * 2
    }, proportion);
  });
};

CanvasEditor.prototype.isCoordsEquel = function(coords, coords2){
  if (!coords || !coords2) return false;
  return coords.x === coords2.x && coords.y === coords2.y && coords.w === coords2.w && coords.h === coords2.h
};

CanvasEditor.prototype.destroyCropMask = function(container) {
  var jcropApi = $(this.editorCanvas).parent().data('Jcrop');
  jcropApi.destroy();
  this.appendEditorCanvas(container);
};

CanvasEditor.prototype.appendEditorCanvas = function(container) {
  var wrapper = $('<div class="editCanvasWrapper" id="editCanvasWrapper"></div>');
  var canvas = $(this.editorCanvas);
  container.append(wrapper);
  wrapper.append(canvas);
  return canvas;
};

CanvasEditor.prototype.getProportion = function() {
  var ratio = this.sourceCanvas.width / this.sourceCanvas.height;
  var width =  Math.round(this.MAX_CANVAS_HEIGHT * ratio);
  return this.sourceCanvas.width / width;
};

CanvasEditor.prototype.updateCropMask = function(x, y, w, h) {
  var proportion = this.getProportion();

  var maskX = Math.round(x / proportion);
  var maskY = Math.round(y / proportion);
  var maskW = Math.round(w / proportion);
  var maskH = Math.round(h / proportion);

  this.lastCropCoordindates = {
    x: maskX,
    y: maskY,
    w: maskW,
    h: maskH
  };

  var jcropApi = $(this.editorCanvas).parent().data('Jcrop');
  jcropApi.setOptions({
    setSelect: [maskX, maskY, maskW, maskH]
  });
};

CanvasEditor.prototype.resetCropMaskToDefault = function() {

  var jcropApi = $(this.editorCanvas).parent().data('Jcrop');
  jcropApi.setOptions({
    setSelect: [
      this.CROP_MASK_IDENTATION,
      this.CROP_MASK_IDENTATION,
      this.editorCanvas.clientWidth - this.CROP_MASK_IDENTATION * 2,
      this.editorCanvas.clientHeight - this.CROP_MASK_IDENTATION * 2
    ]
  });
};
