// From: https://raw.githubusercontent.com/nicolaisi/tancolor/master/jquery/jquery.tancolor.js
// Heavily modified by Jay Crossler
(function ($) {
    $.fn.tancolor = function(options) {
        var settings = $.extend({
            mode: 'grayscale',
            method: '',
            blend_weight: 5,

            r_weight: 0.34,
            g_weight: 0.5,
            b_weight: 0.16,

            r_intensity: 1,
            g_intensity: 1,
            b_intensity: 1,
            r_max: 100,
            r_min: 0,
            g_max: 100,
            g_min: 0,
            b_max: 100,
            b_min: 0,

            mode2: '',
            r2_intensity: 1,
            g2_intensity: 1,
            b2_intensity: 1,
            r2_max: 100,
            r2_min: 0,
            g2_max: 100,
            g2_min: 0,
            b2_max: 100,
            b2_min: 0,

            load: null
        }, options );

        var img = $(this).length ? $(this)[0] : document.getElementById($(this).attr("id"));
        if(settings.load){
            img.src = settings.load;
            return;
        }

        var load_later_function = function(){tintImage(img,$(this),settings);};

        if (isImageOk(img)){
            tintImage(img,$(this),settings);
        } else {
            img.addEventListener("load", load_later_function, true);
        }

        function tintImage(img,$img,settings){
            var method = settings.method || "tint";
            var blend_weight = settings.blend_weight;

            var r_weight = settings.r_weight;
            var g_weight = settings.g_weight;
            var b_weight = settings.b_weight;

            var r_intensity = settings.r_intensity;
            var g_intensity = settings.g_intensity;
            var b_intensity = settings.b_intensity;
            var r_max = settings.r_max;
            var r_min = settings.r_min;
            var g_max = settings.g_max;
            var g_min = settings.g_min;
            var b_max = settings.b_max;
            var b_min = settings.b_min;

            var r2_intensity = settings.r2_intensity;
            var g2_intensity = settings.g2_intensity;
            var b2_intensity = settings.b2_intensity;
            var r2_max = settings.r2_max;
            var r2_min = settings.r2_min;
            var g2_max = settings.g2_max;
            var g2_min = settings.g2_min;
            var b2_max = settings.b2_max;
            var b2_min = settings.b2_min;

            // settings value
            switch(settings.mode){
                case 'red':
                    r_intensity = 255;
                    break;
                case 'green':
                    g_intensity = 255;
                    break;
                case 'blue':
                    b_intensity = 255;
                    break;
                case 'blend_red':
                case 'replace_red':
                    r_min = 120;
                    r_max = 255;
                    method = settings.method || 'blend';
                    break;
                case 'blend_green':
                case 'replace_green':
                    g_min = 120;
                    g_max = 255;
                    method = settings.method || 'blend';
                    break;
                case 'blend_blue':
                case 'replace_blue':
                    b_min = 120;
                    b_max = 255;
                    method = settings.method || 'blend';
                    break;
                case 'grayscale':
                    //Use all the defaults
                    break;
                default:
                    break;
            }
            switch(settings.mode2){
                case 'blend_black':
                case 'replace_black':
                    r2_min = 0;
                    r2_max = 5;
                    g2_min = 0;
                    g2_max = 5;
                    b2_min = 0;
                    b2_max = 5;
                    method = settings.method2 || 'replace';
                    break;
                case 'blend_white':
                case 'replace_white':
                    r2_min = 240;
                    r2_max = 255;
                    g2_min = 240;
                    g2_max = 255;
                    b2_min = 240;
                    b2_max = 255;
                    method = settings.method2 || 'replace';
                    break;
                default:
                    break;

            }
            // convert image to canvas
            var w = img.naturalWidth || img.width;
            var h = img.naturalHeight || img.height;
            var canvas = convertImageToCanvas(img,w,h);
            var ctx = canvas.getContext("2d");
            var imageData;
            try {
                imageData = ctx.getImageData(0, 0, w, h);
            } catch (ex) {
                return false;
            }

            // Processing image data
            var data = imageData.data;
            var weightOld = 1;
            var weightNew = blend_weight || 3;

            var alphas=[];

            for(var i = 0; i < data.length; i += 4) {
                var r = data[i];
                var g = data[i + 1];
                var b = data[i + 2];
                alphas[i+3] = data[i + 3];

                if (method == "tint") {
                    var brightness = r_weight * data[i] + g_weight * data[i + 1] + b_weight * data[i + 2];
                    data[i] = r_intensity * brightness;
                    data[i + 1] = g_intensity * brightness;
                    data[i + 2] = b_intensity * brightness;
                } else if (method == "blend") {
                    if ((r>=r_min && r<=r_max) && (g>=g_min && g<=g_max) && (b>=b_min && b<=b_max)) {
                        data[i] = Math.round(((r*weightOld) + (r_intensity*weightNew)) / (weightNew+weightOld));
                        data[i + 1] = Math.round(((g*weightOld) + (g_intensity*weightNew)) / (weightNew+weightOld));
                        data[i + 2] = Math.round(((b*weightOld) + (b_intensity*weightNew)) / (weightNew+weightOld));
                    }

                    if ((r>=r2_min && r<=r2_max) && (g>=g2_min && g<=g2_max) && (b>=b2_min && b<=b2_max)) {
                        data[i] = Math.round(((r*weightOld) + (r2_intensity*weightNew)) / (weightNew+weightOld));
                        data[i + 1] = Math.round(((g*weightOld) + (g2_intensity*weightNew)) / (weightNew+weightOld));
                        data[i + 2] = Math.round(((b*weightOld) + (b2_intensity*weightNew)) / (weightNew+weightOld));
                    }

                } else if (method == "replace") {
                    if ((r>=r_min && r<=r_max) && (g>=g_min && g<=g_max) && (b>=b_min && b<=b_max)) {
                        data[i] = Math.round(r_intensity);
                        data[i + 1] = Math.round(g_intensity);
                        data[i + 2] = Math.round(b_intensity);
                    }

                    if ((r>=r2_min && r<=r2_max) && (g>=g2_min && g<=g2_max) && (b>=b2_min && b<=b2_max)) {
                        data[i] = Math.round(r2_intensity);
                        data[i + 1] = Math.round(g2_intensity);
                        data[i + 2] = Math.round(b2_intensity);
                    }

                }
            }
            ctx.putImageData(imageData, 0, 0);


            //Reapply the transparencies
            imageData = ctx.getImageData(0, 0, w, h);
            data = imageData.data;
            //TODO: This can run slow especially on IE. Speed it up
            for(var p = 0, len = data.length; p < len; p+=4) {
                data[p+3] = alphas[p+3];
            }
            ctx.putImageData(imageData,0,0);

            // Remove the load event listener to fix infinite loop
            img.removeEventListener("load", load_later_function, true); // MUST match addEventListener params as above perfectly
            //Write the changes back to the image
            var img_data = canvas.toDataURL("image/png");
            $img.attr('src',img_data);

        }

        // Converts image to canvas; returns new canvas element
        function convertImageToCanvas(image,w,h) {
            var canvas = document.createElement("canvas");
            canvas.width = w || image.width;
            canvas.height = h || image.height;
                if(image.id) {
                    canvas.id = image.id;
                }
                if(image.className) {
                    canvas.className = image.className;
                }
            canvas.getContext("2d").drawImage(image, 0, 0);

            return canvas;
        }

        // Converts canvas to an image
        function convertCanvasToImage(canvas) {
            var image = new Image();
            image.src = canvas.toDataURL("image/png");
            return image;
        }

        //From: http://stackoverflow.com/questions/1977871/check-if-an-image-is-loaded-no-errors-in-javascript
        function isImageOk(img) {
            // During the onload event, IE correctly identifies any images that
            // weren’t downloaded as not complete. Others should too. Gecko-based
            // browsers act like NS4 in that they report this incorrectly.
            if (!img.complete) {
                return false;
            }

            // However, they do have two very useful properties: naturalWidth and
            // naturalHeight. These give the true size of the image. If it failed
            // to load, either of these should be zero.

            if (typeof img.naturalWidth !== "undefined" && img.naturalWidth === 0) {
                return false;
            }

            // No other way of checking: assume it’s ok.
            return true;
        }

    };
}(jQuery));
