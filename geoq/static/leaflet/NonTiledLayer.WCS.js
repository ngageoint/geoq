/*
 * L.NonTiledLayer.WCS is used for putting WCS non tiled layers on the map.
 */

L.NonTiledLayer.WCS = L.NonTiledLayer.extend({

    defaultWcsParams: {
        service: 'WCS',
        request: 'GetCoverage',
        version: '1.1.0',
        format: 'IMAGE/GEOTIFF',
        gridoffsets: '.000045,.000045',
        gridbasecrs: 'EPSG:4326',
        connectid: '<connectid>'
    },

    options: {
        crs: null,
        uppercase: true,
        username: "1040272700",
        password: ""
    },

    initialize: function (url, options) { // (String, Object)
        this._wcsUrl = url;
        this.raster = {};

        var wcsParams = L.extend({}, this.defaultWcsParams);

        // all keys that are not NonTiledLayer options go to WCS params
        for (var i in options.wcsOptions) {
            wcsParams[i] = options.wcsOptions[i];
        }
        this.wcsParams = wcsParams;

        this.options.colorScale = (options.colorScale==undefined) ? 'viridis' : options.colorScale;
        this.options.clampLow = (options.clampLow==undefined) ? true : options.clampLow;
        this.options.clampHigh = (options.clampHigh==undefined) ? true : options.clampHigh;
        this._preLoadColorScale(); //Done to make sure colorScale is ready even if image takes a while to load

        L.setOptions(this, options);
    },

    onAdd: function (map) {

        this._crs = this.options.crs || map.options.crs;
        this._wcsVersion = parseFloat(this.wcsParams.version);

        var projectionKey = 'crs';
        this.wcsParams[projectionKey] = this._crs.code;

        L.NonTiledLayer.prototype.onAdd.call(this, map);
    },

    getImageUrl: function (world1, world2, width, height) {

        var wcsParams = this.wcsParams;
        wcsParams.width = width;
        wcsParams.height = height;

        var sw = this._crs.project(world1);
        var ne = this._crs.project(world2);

        var url = this._wcsUrl;

        var bbox = [sw.y, sw.x, ne.y, ne.x].join(',');

        return url +
            L.Util.getParamString(this.wcsParams, url, this.options.uppercase) +
            (this.options.uppercase ? '&BOUNDINGBOX=' : '&boundingBox=') + "9.5337,112.8701,9.6115,112.6496";
    },

    setParams: function (params, noRedraw) {

        L.extend(this.wcsParams, params);

        if (!noRedraw) {
            this.redraw();
        }

        return this;
    },
    setBand: function (band) {
        this.options.band = band
        var image = this.tiff.getImage(this.options.image);
        this.raster.data = image.readRasters({samples: [band]})[0];
        this.raster.width = image.getWidth();
        this.raster.height = image.getHeight();
    },
    setColorScale: function (colorScale)  {
        this.options.colorScale = colorScale;
        this._preLoadColorScale();
        this._renderImage();

    },
    getValueAtPoint: function (location) {
        var i = parseInt(location.y*this.raster.width+location.x);
        return this.raster.data[i];
    },
    _getData: function(url) {
        if (this._map) {
            this._map.fire('wcsloading');
        }
        var self = this;
        var request = new XMLHttpRequest();
        request.withCredentials = true;
        request.onload = function(i) {
            if (this.status >= 200 && this.status < 400) {
                self._parseTIFF(this.response);
            } else {
                console.log("Got an error retrieving image");
            }//TODO else handle error
        };
        request.open("GET", url, true);
        request.setRequestHeader("Authorization", "Basic "+btoa(this.options.username + ":" + this.options.password));
        // request.responseType = "arraybuffer";
        request.send();
    },
    _parseTIFF: function (arrayBuffer) {
        this.tiff = GeoTIFF.parse(arrayBuffer);
        this._map.fire('wcsloaded');

        if (typeof(this.options.image)=='undefined') {
            this.options.image = 0;
        }
        if (typeof(this.options.band)=='undefined') {
            this.options.band = 0;
        }
        this.setBand(this.options.band);
        this._renderImage();
    },
    _preLoadColorScale: function () {
        var canvas = document.createElement('canvas');
        plot = new plotty.plot({
            canvas: canvas, data: [0],
            width: 1, height: 1,
            domain: [this.options.displayMin, this.options.displayMax],
            colorScale: this.options.colorScale,
        });
        this.colorScaleData = plot.colorScaleCanvas.toDataURL();
    },
    _drawImage: function () {
        var self = this;
        this.plotCanvas = document.createElement('canvas');
        this.plotCanvas.width = self.raster.width;
        this.plotCanvas.height = self.raster.height;
        if (self.raster.hasOwnProperty('data')) {
            this.plot = new plotty.plot({
                canvas: self.plotCanvas,
                data: self.raster.data,
                width: self.raster.width, height: self.raster.height,
                domain: [self.options.displayMin, self.options.displayMax], colorScale: this.options.colorScale,
                clampLow: self.options.clampLow, clampHigh: self.options.clampHigh,
            });
            this.plot.setNoDataValue(-9999); //TODO: This should be an option not a magic number
            this.plot.render();
            this.colorScaleData = plot.colorScaleCanvas.toDataURL();
            this.dataURL = this.plotCanvas.toDataURL();
        }
    },
    _renderImage: function () {
        if (this.hasOwnProperty('_map')) {
            this._drawImage();
            if (this._useCanvas) {
                var bounds = this._getClippedBounds();
                this._currentCanvas._bounds = bounds;
                this._resetImage(this._currentCanvas);

                this._currentCanvas._image.key = this.key;
                this._currentCanvas._image.src = this.dataURL;
            } else {
                var bounds = this._getClippedBounds();
                this._currentImage._bounds = bounds;
                this._resetImage(this._currentImage);

                this._currentImage.key = this.key;
                this._currentImage.src = this.dataURL;
            }
        };
    },
    _update: function () {
        var bounds = this._getClippedBounds();

        if (this._map.getZoom() < this.options.minZoom ||
            this._map.getZoom() > this.options.maxZoom) {
            this._div.style.visibility = 'hidden';
            return;
        }
        else {
            this._div.style.visibility = 'visible';
        }


        // re-project to corresponding pixel bounds
        var pix1 = this._map.latLngToContainerPoint(bounds.getNorthWest());
        var pix2 = this._map.latLngToContainerPoint(bounds.getSouthEast());

        // get pixel size
        var width = pix2.x - pix1.x;
        var height = pix2.y - pix1.y;

        // resulting image is too small
        if (width < 32 || height < 32)
            return;

        var i;
        if (this._useCanvas) {
            // set scales for zoom animation
            this._bufferCanvas._scale = this._bufferCanvas._lastScale;
            this._currentCanvas._scale = this._currentCanvas._lastScale = 1;
            this._bufferCanvas._sscale = 1;

            this._currentCanvas._bounds = bounds;

            this._resetImage(this._currentCanvas);

            i = this._currentCanvas._image;
        } else {
            // set scales for zoom animation
            this._bufferImage._scale = this._bufferImage._lastScale;
            this._currentImage._scale = this._currentImage._lastScale = 1;
            this._bufferImage._sscale = 1;

            this._currentImage._bounds = bounds;

            this._resetImage(this._currentImage);

            i = this._currentImage;
        }

        // create a key identifying the current request
        this.key = '' + bounds.getNorthWest() + ', ' + bounds.getSouthEast() + ', ' + width + ', ' + height;
        i.key = this.key;

        //Request coverage from the WCS server
        var url = this.getImageUrl(bounds.getSouthWest(), bounds.getNorthEast(), width, height);
        this._getData(url);

        if (this._useCanvas) {
            L.DomUtil.setOpacity(this._currentCanvas, 0);
        } else {
            L.DomUtil.setOpacity(this._currentImage, 0);
        }
    }

});

L.nonTiledLayer.wcs = function (url, options) {
    return new L.NonTiledLayer.WCS(url, options);
};
