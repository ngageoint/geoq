//converts leaflet layer to WKT
//requires Leaflet, Leaflet ArcGIS plugin,
var leaflet_helper = {};

leaflet_helper.styles = {};
leaflet_helper.styles.extentStyle = {"weight": 2, "color": "red", "fill": null, "opacity": 1};
leaflet_helper.styles.completed = {"weight": 2, "color": "green", "fillColor": "green", "fillOpacity": .9, "opacity": 1};
leaflet_helper.styles.in_work = {"weight": 2, "color": "yellow", "fillColor": "orange", "fillOpacity": .9, "opacity": 1};
leaflet_helper.styles.assigned = {"weight": 2, "color": "orange", "fillColor": "orange", "fillOpacity": .9, "opacity": 1};


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
    var layerParams = lyr.layerParams;
    var layerOptions;

    console.log(layerParams);

    var esriPluginInstalled = L.hasOwnProperty('esri');

    if (!esriPluginInstalled) {
        console.log('Esri Leaflet plugin not installed.  Esri layer types disabled.');
    }

    if (lyr.type == 'WMS') {

        layerOptions = _.extend(options, layerParams);

        return new L.tileLayer.wms(lyr.url, layerOptions);
    }

    if (lyr.type == 'ESRI Tiled Map Service' && esriPluginInstalled) {

        layerOptions = options;

        return new L.esri.tiledMapLayer(lyr.url, layerOptions);
    }

    if (lyr.type == 'ESRI Dynamic Map Layer' && esriPluginInstalled) {

        layerOptions = options;

        return new L.esri.dynamicMapLayer(lyr.url, layerOptions);
    }

    if (lyr.type == 'ESRI Feature Layer' && esriPluginInstalled) {

        layerOptions = options;

        return new L.esri.featureLayer(lyr.url, layerOptions);
    }

    if (lyr.type == 'GeoJSON') {
        layerOptions = options;

        function addGeojson(e) {
            return new L.GeoJSON(e, layerOptions);
        }

        var url = lyr.url;
        if (url && url.substr(0,4) == "http") {
            url = "/geoq/proxy/" + url;
        }

        $.ajax({
            type: 'GET',
            url: lyr.url,
            dataType: 'json',
            success: function (result) {
                var isESRIpseudoJSON = false;
                if (result &&
                    result.geometryType && result.geometryType == "esriGeometryPoint" &&
                    result.features && result.features.length &&
                    result.features[0] && result.features[0].attributes) isESRIpseudoJSON = true;

                if (isESRIpseudoJSON) {
                    leaflet_helper.add_dynamic_capimage_data(result);
                } else {
                    addGeojson(result);
                }
            }

        })

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

    L.geoJson(jsonObjects, {onEachFeature: onEachFeature}).addTo(map);
};

//TODO: Add MULTIPOLYGON support and commit back to https://gist.github.com/bmcbride/4248238
leaflet_helper.toWKT = function (layer) {
    var lng, lat, coords = [];
    if (layer instanceof L.Polygon || layer instanceof L.Polyline) {
        var latlngs = layer.getLatLngs();
        for (var i = 0; i < latlngs.length; i++) {
            latlngs[i]
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


