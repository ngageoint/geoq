/*
Factory for creating a number of different Leaflet layers from an options file
Depends on JQuery, Leaflet, and a number of plugins
 */

var layerBuilder = {};

// This would be better in a utilities files
layerBuilder.keysToLowerCase = function(obj) {
    _.keys(obj).forEach(function (key) {
        var k = key.toLowerCase();

        if (k !== key) {
            obj[k] = obj[key];
            delete obj[key];
        }
    });
    return (obj);
};

layerBuilder.checkParameters = function( type, parameters ) {
    // make sure that required parameters exist, and are valid
    var valid = true;
    _.each(type['parameters'], function(p) {
        if (! p in parameters) {
            valid = false;
        } else {
            if (typeof(parameters[p] == 'undefined' || parameters[p] == '' )) {
                valid = false;
            }
        }
    });

    return valid;
};

layerBuilder.buildLayer = function( format, parameters) {
    var type = _.find(layerBuilder.layers, function(layer) { return layer.format == format;})
    return type.builder(parameters);
};

layerBuilder.WMS = function( parameters ) {
    var newlayer;
    var parser = document.createElement('a');
    parser.href = parameters.url;
    var search = parser.search.substring(1);
    var parts = JSON.parse('{"' + decodeURI(search).replace(/"/g, '\\"').replace(/&amp;/g, '&').replace(/&/g, '","').replace(/=/g,'":"') + '"}');
    layerBuilder.keysToLowerCase(parts);
    if (parts.service === 'WMS') {
        newlayer = L.tileLayer.wms(parser.protocol + "//" + parser.host + parser.pathname, {
            layers: parts.layers,
            format: 'image/png',
            transparent: true,
            attribution: parser.host
        });
    }

    return newlayer;
};

layerBuilder.WMTS = function( parameters ) {
    var defaults = {tileSize: 256, noWrap: true, continuousWorld: true, format: 'image/png'};
    var newlayer;

    try {
        newLayer = new L.tileLayer(parameters.url, defaults);
    }
    catch (e) {
        log.warn('Unable to create WMTS layer: ' + e.toString());
    }

    return newLayer;
};

layerBuilder.DML = function( parameters ) {
    var defaults = {position: 'front', format: 'png', useCors: false, url: parameters.url};
    var newLayer;

    try {
        newLayer = new L.esri.dynamicMapLayer(defaults);
        newLayer.identifiedFeature = null;

        newLayer.clickListener = function(e) {
            if (this.identifiedFeature) {
            }
        }
    }
    catch (e) {
        log.warn("Unable to create DML layer: " + e.toString());
    }

    return newLayer;
};

layerBuilder.GeoJSON = function( parameters ) {
    var newLayer;
    try {
        newLayer = leaflet_helper.constructors.geojson(parameters, aoi_feature_edit.map);
    }
    catch (e) {
        log.warn("Unable to create DML layer: " + e.toString());
    }

    return newLayer;
};


layerBuilder.layers = {
    wms: { builder: layerBuilder.WMS, format: "OGC:WMS", parameters: ["url","format"]},
    wmts: { builder: layerBuilder.WMTS, format: "OGC:WMTS", parameters: ["url","subdomains","maxZoom","minZoom"]},
    dml: {builder: layerBuilder.DML, format: "ESRI:DynamicMapLayer", parameters: ["url","format"]},
    geojson: {builder: layerBuilder.GeoJSON, format: "GeoJSON", parameters: ["url"]}
};