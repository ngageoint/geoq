//converts leaflet layer to WKT
//requires Leaflet, Leaflet ArcGIS plugin, log4javascript

//TODO: Add "Assigned" style to settings object and UI

var leaflet_helper = {};

var c;
if (typeof site_settings=="undefined") {
    c = [];
} else {
    c = site_settings.cell_status_colors || ["green","#cf8601","#cf6201","#cf4001","#cf0101"];
}
leaflet_helper.styles = {
    extentStyle:     {"weight": 2, "color": "green","fillColor": c[0], "fillOpacity": .2, "opacity": 1},
    in_work:         {"weight": 2, "color": "green","fillColor": c[1], "fillOpacity": .3, "opacity": 1},
    awaiting_review: {"weight": 2, "color": "red",  "fillColor": c[2], "fillOpacity": .5, "opacity": 1},
    in_review:       {"weight": 2, "color": "red",  "fillColor": c[3], "fillOpacity": .7, "opacity": 1},
    completed:       {"weight": 2, "color": "red",  "fillColor": c[4], "fillOpacity": .9, "opacity": 1},
    assigned:        {"weight": 2, "color": "black", "fillColor": "gray", "fillOpacity": .9, "opacity": 1},
    extentStyle_hollow: {"weight": 2, "color": "red", "opacity": 1, "fillOpacity":0 }
};

leaflet_helper.proxy_path = "/geoq/proxy/";

leaflet_helper.proxify = function (url) {
    //TODO: Don't add if string already starts with proxy
    var proxiedURL = leaflet_helper.proxy_path + encodeURI(url);
    proxiedURL = proxiedURL.replace(/%253D/g,'%3D');

    return proxiedURL;
};
leaflet_helper.layer_conversion = function (lyr, map) {

    var options = {
        layers: lyr.layer,
        format: lyr.format,
        transparent: lyr.transparent,
        attribution: lyr.attribution,
        subdomains: lyr.subdomains,
        opacity: lyr.opacity,
        zIndex: lyr.zIndex,
        visibile: lyr.shown,
        url: lyr.url,
        name: lyr.name,
        details: lyr.details
    };

    var layerParams = lyr.layerParams || {};

    // Add in user saved parameters
    var layerUserParams = aoi_feature_edit.aoi_user_remembered_params[lyr.maplayer_id];
    $.extend(layerParams, layerUserParams); 

    var layerOptions;
    var outputLayer = undefined;

    var esriPluginInstalled = L.hasOwnProperty('esri');
    if (!esriPluginInstalled) {
        log.warn('Esri Leaflet plugin not installed.  Esri layer types disabled.');
    }

    layerOptions = _.extend(options, layerParams);
    if (lyr.type == 'WMS') {
        outputLayer = new L.tileLayer.wms(lyr.url, layerOptions);
    } else if (lyr.type == 'WFS') {

        try {          
            if (layerOptions.crs) {
                var crs = layerOptions.crs.replace(/::/g, ':').split(':');
                layerOptions.crs = eval('L.CRS.' + crs[crs.length - 2] + crs[crs.length - 1]);
            }
            else
               layerOptions.crs = L.CRS.EPSG4326;

            outputLayer = new L.WFS(layerOptions);
            
        }
        catch (e) {
            console.error('Unable to create WFS layer: ' + e.toString());
        }
    
    } else if (lyr.type == 'WMTS') {
        // this seems a bit fussy, so will make sure we can create this without errors
        try {
            outputLayer = new L.tileLayer(lyr.url, layerOptions);
        }
        catch (e) {
            log.warn('Unable to create WMTS layer: ' + e.toString());
        }
    } else if (lyr.type == 'ESRI Tiled Map Service' && esriPluginInstalled) {
        outputLayer = new L.esri.tiledMapLayer(lyr.url, layerOptions);
    } else if (lyr.type == 'ESRI Dynamic Map Layer' && esriPluginInstalled) {
        // SRJ - DynamicMapLayer looking for an array passed in
        try {
            layerOptions.layers = JSON.parse(layerOptions.layers);
        } catch (err) {
            layerOptions.layers = [];
        }
        outputLayer = new L.esri.dynamicMapLayer(lyr.url, layerOptions);
    } else if (lyr.type == 'ESRI Feature Layer' && esriPluginInstalled) {
        outputLayer = new L.esri.featureLayer(lyr.url, layerOptions);
        if (layerOptions.popupTemplate) {
            var template = layerOptions.popupTemplate;
            outputLayer.bindPopup(function (feature) {
                return L.Util.template(template, feature.properties);
            });
        }
    } else if (lyr.type == 'ESRI Clustered Feature Layer' && esriPluginInstalled) {
        if (layerOptions.createMarker) {
            layerOptions.createMarker = leaflet_helper.createMarker[layerOptions.createMarker];
        }
        outputLayer = new L.esri.clusteredFeatureLayer(lyr.url, layerOptions);
    } else if (lyr.type == 'GeoJSON' || lyr.type == 'Social Networking Link') {
        outputLayer = leaflet_helper.constructors.geojson(lyr, map);

    } else if (lyr.type == 'KML') {
        if (/kmz$/i.test(proxiedURL)) {
            log.error("Trying to load a KML layer that ends with KMZ - these aren't supported, skipping");
            outputLayer = undefined;
        } else {
            layerOptions = options;

            var url = leaflet_helper.constructors.urlTemplater(lyr.url, map, layerOptions);
            var proxiedURL = leaflet_helper.proxify(url);

            outputLayer = new L.KML(proxiedURL, layerOptions);
        }
    } else if (lyr.type == 'Bing') {
        var key = lyr.token;
//        var overrideUrl = lyr.url; //TODO: Modify library to use alternate URL, or to pass through proxy and swap key
        if (key && key.length > 20) {
            outputLayer = new L.BingLayer(key);
        }
    } else if (lyr.type == 'Google Maps') {
        var layerName = lyr.layer;
        if (layerName && layerName.toUpperCase) {
            layerName = layerName.toUpperCase();
            //Only allow these 4 types
            if ("TERRAIN ROADMAP SATELLITE HYBRID".indexOf(layerName) < 0) {
                layerName = undefined;
            }
        }

        if (layerName) {
            outputLayer = new L.Google(layerName);
        } else {
            outputLayer = new L.Google();
        }
    } else if (lyr.type == 'Leaflet Tile Layer') {
        outputLayer = L.tileLayer(lyr.url, lyr.layerParams);
    } else if (lyr.type == 'ESRI Identifiable MapServer') {
        outputLayer = leaflet_helper.constructors.geojson(lyr, map);
    } else if (lyr.type == 'Web Data Link') {
        outputLayer = leaflet_helper.constructors.geojson(lyr, map);
    } else if (lyr.type == 'MediaQ') {
        outputLayer = new L.MediaQLayer(true, map, layerOptions);
    } else if (lyr.type == 'WFS') {
        outputLayer = new L.WFS(layerOptions);
    } else if (lyr.type == 'ESRI Shapefile') {
        outputLayer = new L.shapefile(lyr.url, layerOptions);
    }

    //Make sure the name is set for showing up in the layer menu
    if (lyr.name && outputLayer) outputLayer.name = lyr.name;
    if (outputLayer) outputLayer.config = lyr;

    return outputLayer;
};

leaflet_helper.createMarker = {
    esriImageMapService: function (geojson, latlng) {
        return new L.marker(latlng, {
            title: geojson.properties.Title || geojson.properties.ProjectName,
            alt: geojson.properties.Description
        }).bindPopup(
            "<a href='" + geojson.properties.ImageURL + "' target='geoqwindow'><img style='width:256px' src='" + geojson.properties.ThumbnailURL + "' /></a>"
        );
    }
};



//====================================
leaflet_helper.addGeocoderControl = function(map){

    var options = {
        collapsed: true, /* Whether its collapsed or not */
        position: 'topright', /* The position of the control */
        text: 'Locate', /* The text of the submit button */
        bounds: null, /* a L.LatLngBounds object to limit the results to */
        email: null, /* an email string with a contact to provide to Nominatim. Useful if you are doing lots of queries */
        callback: function (results) {
            if (results && results.length && results[0].boundingbox){
                var bbox = results[0].boundingbox,
                    first = new L.LatLng(bbox[0], bbox[2]),
                    second = new L.LatLng(bbox[1], bbox[3]),
                    bounds = new L.LatLngBounds([first, second]);
                this._map.fitBounds(bounds);
            }
        }
    };
    var osmGeocoder = new L.Control.OSMGeocoder(options);
    map.addControl(osmGeocoder);
};

leaflet_helper.addLocatorControl = function(map){

    var $map_move_info_update = $('<h4 class="location_info">Location Info</h4>');

    var infoButtonOptions = {
        html: $map_move_info_update,
        position: 'topright', /* The position of the control */
        hideText: false,  // bool
        maxWidth: 60,  // number
        doToggle: false,  // bool
        toggleStatus: false  // bool
    };
    var infoButton = new L.Control.Button(infoButtonOptions).addTo(map);

    // ugly fix to get map to work correctly on iPad. Need to lose the location box
    var userAgent = navigator.userAgent;
    if (! userAgent.match(/iPad/i)) {
        map.on('mousemove', function (e) {
            var ll = e.latlng;

            var pt = maptools.locationInfoString({lat: ll.lat, lng: ll.lng, separator: "<br/>", boldTitles: true});

            //Build text output to show in info box
            var country = pt.country.name_long || pt.country.name || "";
            var text = pt.usngCoords.usngString + "<br/><b>Lat:</b> " + pt.lat + "<br/><b>Lon:</b> " + pt.lng;
            if (country) text += "<br/>" + country;
            if (pt.state && pt.state.name) text += "<br/>" + pt.state.name;

            $map_move_info_update.html(text);
        });
    }
};

//TODO: Add MULTIPOLYGON support and commit back to https://gist.github.com/bmcbride/4248238
leaflet_helper.toWKT = function (layer) {
    var lng, lat, coords = [];
    if (layer instanceof L.Polygon || layer instanceof L.Polyline) {
        var latlngs = layer.getLatLngs();
        for (var i = 0; i < latlngs.length; i++) {
            latlngs[i] //TODO: What is this?
            coords.push(latlngs[i].lng + " " + latlngs[i].lat);
            if (i === 0) {
                lng = latlngs[i].lng;
                lat = latlngs[i].lat;
            }
        } 
        if (layer instanceof L.Polygon) {
            return "POLYGON((" + coords.join(",") + "," + lng + " " + lat + "))";
        } else if (layer instanceof L.Polyline) {
            return "LINESTRING(" + coords.join(",") + ")";
        }
    } else if (layer instanceof L.Marker) {
        return "POINT(" + layer.getLatLng().lng + " " + layer.getLatLng().lat + ")";
    }
};

leaflet_helper.addLayerControl = function (map) {
    var layers = _.filter(map_layers.layers, function (l) {
        return l.type == "WMS" || l.type == "KML" || l.type == "ESRI Shapefile";
    });

    var overlayMaps = {
    };

    _.each(layers, function (layer) {
        if (layer.displayInLayerSwitcher) {
            if (layer.type == "WMS") {
                var mywms = L.tileLayer.wms(layer.url, {
                    layers: layer.layer,
                    format: layer.format,
                    transparent: layer.transparent,
                    zIndex: layer.zIndex,
                    attribution: layer.attribution
                });
                overlayMaps[layer.name] = mywms;
            }
            else if (layer.type == "KML") {
                mykml = new L.KML(layer.url, {
                    layers: layer.layer,
                    format: layer.format,
                    transparent: layer.transparent,
                    attribution: layer.attribution
                });
                overlayMaps[layer.name] = mykml;
            }
            else if (layer.type == "ESRI Shapefile") {
                var options = {};
                if (layer.layerParams && layer.layerParams.style) {
                    var style = layer.layerParams.style;
                    options.style = function (feature) {
                        return style;
                    };
                }
                var labels;
                if (layer.layerParams && layer.layerParams.label) {
                    var labelstring = layer.layerParams.label;
                    labels = L.layerGroup();
                    options.onEachFeature = function(feature, layer) {
                        var mlabel;
                        try {
                            mlabel = eval(labelstring);
                        } catch (e) {
                            mlabel = "Unknown";
                        }
                        var l = L.marker(layer.getBounds().getCenter(), {
                            icon: L.divIcon({
                                className: 'markerlabelClass',
                                html: mlabel
                            })
                        });
                        labels.addLayer(l);
                    };
                }
                var myshape = L.shapefile(layer.url, options);
                if (myshape) {
                    if (labels) {
                        myshape.addLayer(labels);
                    }
                    overlayMaps[layer.name] = myshape;
                }
            }
        }
    });

    if (_.size(overlayMaps)) {
        L.control.layers(null, overlayMaps).addTo(map);
    }
};

