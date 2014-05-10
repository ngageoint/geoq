//converts leaflet layer to WKT
//requires Leaflet, Leaflet ArcGIS plugin, log4javascript

var leaflet_helper = {};

leaflet_helper.styles = {
    extentStyle: {"weight": 2, "color": "red", "fill": null, "opacity": 1},
    completed: {"weight": 2, "color": "green", "fillColor": "green", "fillOpacity": .9, "opacity": 1},
    in_work: {"weight": 2, "color": "yellow", "fillColor": "orange", "fillOpacity": .9, "opacity": 1},
    assigned: {"weight": 2, "color": "orange", "fillColor": "orange", "fillOpacity": .9, "opacity": 1}
};
leaflet_helper.proxy_path = "/geoq/proxy/";

leaflet_helper.layer_conversion = function (lyr) {

    var options = {
        layers: lyr.layer,
        format: lyr.format,
        transparent: lyr.transparent,
        attribution: lyr.attribution,
        subdomains: lyr.subdomains,
        opacity: lyr.opacity,
        zIndex: lyr.zIndex,
        visibile: lyr.shown
    };
    var layerParams = lyr.layerParams || {};
    var layerOptions;
    var outputLayer = undefined;

    log.trace('Layer requested being drawn. Layer options are', options);
    log.trace('LayerParams are', layerParams);

    var esriPluginInstalled = L.hasOwnProperty('esri');
    if (!esriPluginInstalled) {
        log.warn('Esri Leaflet plugin not installed.  Esri layer types disabled.');
    }

    if (lyr.type == 'WMS') {
        layerOptions = _.extend(options, layerParams);
        outputLayer = new L.tileLayer.wms(lyr.url, layerOptions);
    } else if (lyr.type == 'ESRI Tiled Map Service' && esriPluginInstalled) {
        layerOptions = options;
        outputLayer = new L.esri.tiledMapLayer(lyr.url, layerOptions);
    } else if (lyr.type == 'ESRI Dynamic Map Layer' && esriPluginInstalled) {
        layerOptions = options;
        outputLayer = new L.esri.dynamicMapLayer(lyr.url, layerOptions);
    } else if (lyr.type == 'ESRI Feature Layer' && esriPluginInstalled) {
        layerOptions = options;
        outputLayer = new L.esri.featureLayer(lyr.url, layerOptions);
    } else if (lyr.type == 'ESRI Clustered Feature Layer' && esriPluginInstalled) {
        layerOptions = _.extend(options, layerParams);
        if (layerOptions.createMarker) {
            layerOptions.createMarker = leaflet_helper.createMarker[layerOptions.createMarker];
        }
        outputLayer = new L.esri.clusteredFeatureLayer(lyr.url, layerOptions);
    } else if (lyr.type == 'GeoJSON') {
        layerOptions = options;
        var url = leaflet_helper.proxy_path + lyr.url;

        var resultobj = $.ajax({
            type: 'GET',
            url: url,
            dataType: 'json',
            async: false
        });
        //TODO: Switch away from async to sync and run function on success.
        if (resultobj.status == 200) {
            var result = JSON.parse(resultobj.responseText);
            if (result && result.error && result.error.message){
                log.error("JSON layer error, message was:", result.error.message, "url:", url);
            } else {
                var isESRIpseudoJSON = false;
                if (result &&
                    result.geometryType && result.geometryType == "esriGeometryPoint" &&
                    result.features && result.features.length &&
                    result.features[0] && result.features[0].attributes) isESRIpseudoJSON = true;

                if (isESRIpseudoJSON) {
                    outputLayer = leaflet_helper.add_dynamic_capimage_data(result);
                } else {
                    outputLayer = new L.GeoJSON(result, layerOptions);
                }
            }
        } else {
            log.error ("A JSON layer was requested, but no valid response was received, result:", resultobj);
        }
    } else if (lyr.type == 'KML') {
        layerOptions = options;
        layerOptions['async'] = true;
        outputLayer = new L.KML(leaflet_helper.proxy_path + encodeURI(lyr.url), layerOptions);
    }

    log.info("Trying to create a layer from url:", lyr.url);
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

leaflet_helper.add_dynamic_capimage_data = function (result) {
    var jsonObjects = [];
    $(result.features).each(function () {
        var feature = $(this)[0];
        var json = {
            type: "Feature",
            properties: {
                name: feature.attributes.ID + " - " + feature.attributes.DaysOld + " days old",
                image: feature.attributes.ImageURL,
                thumbnail: feature.attributes.ThumbnailURL,
                popupContent: "<a href='" + feature.attributes.ImageURL + "'><img style='width:256px' src='" + feature.attributes.ThumbnailURL + "' /></a>"
            },
            geometry: {
                type: "Point",
                coordinates: [feature.geometry.x, feature.geometry.y]
            }
        };
        jsonObjects.push(json);
    });

    function onEachFeature(feature, layer) {
        // does this feature have a property named popupContent?
        if (feature.properties && feature.properties.popupContent) {
            layer.bindPopup(feature.properties.popupContent);
        }
    }

//    L.geoJson(jsonObjects, {onEachFeature: onEachFeature}).addTo(aoi_feature_edit.map);
    return new L.geoJson(jsonObjects, {onEachFeature: onEachFeature});
};

leaflet_helper.add_geocoder_control = function(map){

    var options = {
        collapsed: false, /* Whether its collapsed or not */
        position: 'bottomright', /* The position of the control */
        text: 'Locate', /* The text of the submit button */
        bounds: null, /* a L.LatLngBounds object to limit the results to */
        email: null, /* an email string with a contact to provide to Nominatim. Useful if you are doing lots of queries */
        callback: function (results) {
                var bbox = results[0].boundingbox,
                    first = new L.LatLng(bbox[0], bbox[2]),
                    second = new L.LatLng(bbox[1], bbox[3]),
                    bounds = new L.LatLngBounds([first, second]);
                this._map.fitBounds(bounds);
        }
    };
    var osmGeocoder = new L.Control.OSMGeocoder(options);
    map.addControl(osmGeocoder);

    $('form.leaflet-control-geocoder-form').css('margin','0px');

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


