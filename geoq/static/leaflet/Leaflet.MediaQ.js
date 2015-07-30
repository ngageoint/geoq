L.MediaQLayer = L.GeoJSON.extend({
    options: {
        debug: true,
        url: "http://media1.usc.edu/MediaQ_MVC_V3/api/geoq/",
        query_link: "rectangle_query?swlat={SWLAT}&swlng={SWLNG}&nelat={NELAT}&nelng={NELNG}",
        metadata_link: "video_metadata?vid={VID}",
        key: "8b51UFM2SlBltx3s6864eUO1zSoefeK5",
        icon: new L.Icon.Default(),
        pointToLayer: this.iconCallback
    },

    initialize: function (load, map, options) {
        L.Util.setOptions(this, options);
        this._layers = {};
        this._map = map;
        if (this._map) {
            this._bounds = map.getBounds();
            var ourmap = this._map;
            this.mediaqLayerGroup.addTo(this._map);
            this._map.on('moveend', function() {
                this._bounds = ourmap.getBounds();
            });
        }

        if (load) {
            this.addMediaQ(options);
        }
    },

    loadMediaQ: function(cb, options) {
        if (options === undefined) options = this.options;

        if (! options.url ) {
            log.error("No url set for MediaQ server");
            return;
        }

        var proxiedURL = L.MediaQLayer.buildURL(this.options.url+this.options.query_link, this._bounds);

        $.ajax({
            type: 'GET',
            url: proxiedURL,
            headers: {
                'X-API-KEY': this.options.key
            },
            dataType: 'json',
            success: cb,
            error: this.geojson_error
        });
    },

    addMediaQ: function(options) {
        var _this = this;
        var cb = function(data) { _this._addMediaQ(data, this.options); };
        this.loadMediaQ(cb, options);
    },

    _addMediaQ: function(data, options) {
        L.MediaQLayer.parseJSON(data, this);
        if (!this) return;

        this.addTo(this._map);
    },

    geojson_error: function (resultobj){
        log.error ("A JSON layer was requested, but no valid response was received from the server, result:", resultobj);
    },

    mediaqLayerGroup: L.layerGroup(),
    layer_ids: {}

});

L.Util.extend(L.MediaQLayer, {

    parseJSON: function (data, layer) {
        var result;
        if (typeof data=="object") {
            result = data;
        } else {
            try {
                result = JSON.parse(data);
            } catch (ex){
                log.error("Error parsing JSON returned from server");
                return;
            }
        }

        layer.options.onEachFeature = function(feature, layer) {
            L.MediaQLayer.onEachFeature(feature, layer, layer.options, this);
        };

        // layer.options.style = leaflet_helper.constructors.polygonStyleBuilderCallback;
        layer.pointToLayer = function(feature, latlng) {
            return L.MediaQLayer.iconBuilderCallback(feature, latlng, layer);
        };

        layer.addData(data);
    },

    buildURL: function( url, bounds ) {
        if (! bounds) {
            return undefined;
        }

        var sw = bounds.getSouthWest();
        var ne = bounds.getNorthEast();

        var params = {
            "SWLAT" : sw.lat,
            "SWLNG" : sw.lng,
            "NELAT" : ne.lat,
            "NELNG" : ne.lng
        };

        var url = url.replace(/{[^{}]+}/g, function(k) {
            return params[k.replace(/[{}]+/g, "")] || "";
        });

        return leaflet_helper.proxify(url);
    },

    iconBuilderCallback: function(feature, latlng, layerConfig){
        var iconX = 15;
        var iconY = 24;
        var iconAnchor = null;

        layerConfig = layerConfig || {geojson_layer_count:1, name:'MediaQ Layer'};

        var iconUrl = this.options.iconUrl || "";

        //Build the icon injects
        var iconData = {
            iconUrl: iconUrl,
            iconSize: new L.Point(iconX, iconY),
            text: layerConfig.name
        };
        if (iconAnchor) iconData.iconAnchor = iconAnchor;
        var icon = new MapMarker(iconData);

        //Construct the final Icon
        return L.rotatedMarker(latlng, {icon: icon});
    },

    polygonStyleBuilderCallback: function(feature) {
        var polyFillColor = '#ff0000';

        var style = {
            weight: 2,
            opacity: 1,
            color: 'white',
            fillOpacity: 0.1,
            fillColor: polyFillColor};

        return style;
    },

    onEachFeature: function (feature, layer, layerConfig, mediaqOptions) {
        if (feature.properties) {
            var popupContent = "";
            if (feature.properties.popupContent) {
                popupContent = feature.properties.popupContent;
            } else if (feature.properties.vid) {
                popupContent = L.MediaQLayer.clean("MediaQ Id: " + feature.properties.vid);
                if (feature.properties.href){
                    var link = L.MediaQLayer.clean(feature.properties.href); //Strip out any offending
                    popupContent = "<span><h5>MediaQ Video</h5>"+
                        "</h5></span><video width='320' height='240' controls><source src='"+link+"' type='video/mp4'></video>"+
                        "<br/><button type='button' class='btn btn-small' " +
                        "onclick='L.MediaQLayer.displayHidePath(\"" + feature.properties.vid + "\", \"" +
                        mediaqOptions.url + mediaqOptions.metadata_link + "\", \"" +
                        mediaqOptions.key + "\");' >Display/Hide Path</button><br/>";
                }
            }
            if (popupContent && _.isString(popupContent)) {

                if (!popupContent.indexOf("<span class='hide feature-id-hint'>")){
                    if (layerConfig && layerConfig.name) {
                        if (!feature.properties.id) {
                            feature.properties.id = leaflet_helper.id_count++;
                        }
                        var id = feature.properties.id;
                        popupContent += L.MediaQLayer.addLinksToPopup(layerConfig.name, id, true, false);
                    }
                }
                layer.bindPopup(popupContent);
            }
            if (feature.properties.heading && parseInt(feature.properties.heading) && layer.options){
                layer.options.angle = parseInt(feature.properties.heading);
            }
        }

    },

    displayHidePath: function(vid, queryurl, key) {
        var layer_ids = this.prototype.layer_ids;
        var ourlayergroup = this.prototype.mediaqLayerGroup;


        if (layer_ids[vid]) {
            // remove layer from layer group
            var layer = ourlayergroup.getLayer(layer_ids[vid]);
            ourlayergroup.removeLayer(layer);
            delete layer_ids[vid];
            return;
        }
        var params = {'VID':vid};
        var url = queryurl.replace(/{[^{}]+}/g, function(k) {
            return params[k.replace(/[{}]+/g, "")] || "";
        });

        var cb = function(data) {
            try {
                var markerOptions = { radius: 4, fillColor: "#ff0000", color: "#f00", weight: 1, opacity: 1};
                var newlayer = L.geoJson(data, {
                    pointToLayer: function (feature, latlng) {
                        return L.circleMarker(latlng, markerOptions);
                    }
                });
                newlayer.addTo(ourlayergroup);
                var id = ourlayergroup.getLayerId(newlayer);
                layer_ids[vid] = id;
            } catch (ex){
                log.error("Error parsing JSON returned from server");
                return;
            }
        };

        var error = function(data) {
            log.error("got error");
        };

        $.ajax({
            type: 'GET',
            url: leaflet_helper.proxify(url),
            headers: {
                'X-API-KEY': key
            },
            dataType: 'json',
            success: cb,
            error: error
        });
    },

    addLinksToPopup: function (layerName,id,useMove,useHide,useDrop) {

        var spanLink = "<span class='hide layer-name-hint'>"+layerName+"</span>";
        spanLink += "<span class='hide feature-id-hint'>"+id+"</span>";
        var output = "";
        if (useMove) {
            output += "<br/><a href='#' class='make-draggable-hint'>Click on a feature to link this to it"+spanLink+"</a>"
        }
        if (useHide) {
            output += "<br/><a href='#' class='make-deletable-hint'>Hide this Item"+spanLink+"</a>";
        }
        if (useDrop) {
            output += "<br/><a href='#' class='make-droppable-hint'><span class='text-hint'></span>"+spanLink+"</a>";
        }
        if (output) output = "<br/>"+output;

        return output;

    },

    clean: function (text) {
        return jQuery("<div>"+text+"</div>").text() || "";
    },

    getLatLngs: function (json) {
        var el = xml.getElementsByTagName('coordinates');
        var coords = [];
        for (var j = 0; j < el.length; j++) {
            // text might span many childNodes
            coords = coords.concat(this._read_coords(el[j]));
        }
        return coords;
    },

    _read_coords: function (el) {
        var text = '', coords = [], i;
        for (i = 0; i < el.childNodes.length; i++) {
            text = text + el.childNodes[i].nodeValue;
        }
        text = text.split(/[\s\n]+/);
        for (i = 0; i < text.length; i++) {
            var ll = text[i].split(',');
            if (ll.length < 2) {
                continue;
            }
            coords.push(new L.LatLng(ll[1], ll[0]));
        }
        return coords;
    }
});

L.MediaQIcon = L.Icon.extend({

    createIcon: function () {
        var img = this._createIcon('icon');
        img.onload = function () {
            var i = img;
            this.style.width = i.width + 'px';
            this.style.height = i.height + 'px';

            if (this.anchorType.x === 'UNITS_FRACTION' || this.anchorType.x === 'fraction') {
                img.style.marginLeft = (-this.anchor.x * i.width) + 'px';
            }
            if (this.anchorType.y === 'UNITS_FRACTION' || this.anchorType.x === 'fraction') {
                img.style.marginTop  = (-(1 - this.anchor.y) * i.height) + 'px';
            }
            this.style.display = '';
        };
        return img;
    },

    _setIconStyles: function (img, name) {
        L.Icon.prototype._setIconStyles.apply(this, [img, name]);
        // save anchor information to the image
        img.anchor = this.options.iconAnchorRef;
        img.anchorType = this.options.iconAnchorType;
    }
});

L.MediaQMarker = L.Marker.extend({
    options: {
        icon: new L.MediaQIcon.Default()
    }
});
