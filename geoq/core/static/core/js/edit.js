// This technical data was produced for the U. S. Government under Contract No. W15P7T-13-C-F600, and
// is subject to the Rights in Technical Data-Noncommercial Items clause at DFARS 252.227-7013 (FEB 2012)

//requires leaflet_helper.js, underscore, jquery, leaflet, log4javascript

var aoi_feature_edit = {};

aoi_feature_edit.options = {
    drawControlLocation: "topleft"
};

aoi_feature_edit.init = function (aoi_id, aoi_map_json, aoi_extent, job_features_geojson, feature_types, create_feature_url) {
    aoi_feature_edit.aoi_id = aoi_id;
    aoi_feature_edit.aoi_map_json = aoi_map_json;
    aoi_feature_edit.aoi_extents_geojson = aoi_extent;
    aoi_feature_edit.job_features_geojson = job_features_geojson;
    aoi_feature_edit.feature_types = feature_types;
    aoi_feature_edit.create_feature_url = create_feature_url;
    aoi_feature_edit.drawcontrol = null;
    aoi_feature_edit.featureLayers = [];
    aoi_feature_edit.icons = [];

/*    for( var i = 1; i <= aoi_feature_edit.feature_types.length; i++) {
        aoi_feature_edit.featureLayers[i] = L.geoJson( null,
            {style: function(feature){
                feature_type = aoi_feature_edit.feature_types[feature.properties.template];
                if (feature_type && feature_type.hasOwnProperty("style")){
                    return feature_type.style;
            };
        }});
    }*/

    _.each(aoi_feature_edit.feature_types, function (ftype) {
        var featureLayer = L.geoJson(null,
            {style: function (ftype) {
                var feature_type = aoi_feature_edit.feature_types[ftype.properties.template];
                if (feature_type && feature_type.hasOwnProperty("style")) {
                    return feature_type.style;
                }
            }}
        );
        aoi_feature_edit.featureLayers[ftype.id] = featureLayer;
    });
};

aoi_feature_edit.get_feature_type = function (i) {
    return aoi_feature_edit.feature_types[i];
};

aoi_feature_edit.map_init = function (map, bounds) {
    var custom_map = aoi_feature_edit.aoi_map_json;
    aoi_feature_edit.map = map;

    var baseLayers = {}
    var layerSwitcher = {};
    //var editableLayers = new L.FeatureGroup();
    // Only layer in here should be base OSM layer
    _.each(aoi_feature_edit.map._layers, function (l) {
        baseLayers["OpenStreetMap"] = l;
    });

    if (custom_map.hasOwnProperty("layers")) {
        _.each(custom_map.layers, function (l) {
            var n = leaflet_helper.layer_conversion(l);
            if (n !== undefined) {
                if (l.isBaseLayer) {
                    baseLayers[l.name] = n
                    log.info ("Added " + l.name + "as a base layer.")
                } else {
                    layerSwitcher[l.name] = n;
                    log.info ("Added " + l.name + "as a layer.")
                }
            }
        });
    }

    var layercontrol = L.control.layers(baseLayers, layerSwitcher).addTo(aoi_feature_edit.map);

    var aoi_extents = L.geoJson(aoi_feature_edit.aoi_extents_geojson,
        {style: leaflet_helper.styles.extentStyle,
            zIndex: 1000
        });

    aoi_extents.addTo(aoi_feature_edit.map);

    // for each feature template, add features to map and layer control
    _.each(aoi_feature_edit.feature_types, function (ftype) {
        var tnum = ftype.id;
        var featuretype = ftype.type;
        var featureCollection = aoi_feature_edit.createFeatureCollection(tnum);

        _.each(aoi_feature_edit.job_features_geojson.features, function (feature) {
            if (feature.properties.template == tnum && feature.geometry.type == featuretype) {
                featureCollection.features.push(feature);
            }
        });

        aoi_feature_edit.featureLayers[tnum].addData(featureCollection);
        aoi_feature_edit.featureLayers[tnum].addTo(aoi_feature_edit.map);
        layercontrol.addOverlay(aoi_feature_edit.featureLayers[tnum], aoi_feature_edit.feature_types[tnum].name);
    });

    // add one for points
//    var pointcollection = _.filter(aoi_feature_edit.job_features_geojson.features, function(feature) {
//         return feature.geometry.type == "Point";
//    });
//
//    if ( pointcollection.length > 0 ) {
//        var fid = aoi_feature_edit.featureLayers.length + 1;
//        var featureCollection = aoi_feature_edit.createFeatureCollection(fid);
//
//        for ( var i = 0; i < pointcollection.length; i++ ) {
//            featureCollection.features.push(pointcollection[i]);
//        }
//
//        aoi_feature_edit.featureLayers[fid] = L.geoJson(featureCollection);
//        aoi_feature_edit.featureLayers[fid].addTo(aoi_feature_edit.map);
//        layercontrol.addOverlay(aoi_feature_edit.featureLayers[fid], "Points");
//    }

    setTimeout(function () {
        aoi_feature_edit.map.fitBounds(aoi_extents.getBounds());
    }, 1);

    var drawnItems = new L.FeatureGroup();
    aoi_feature_edit.map.addLayer(drawnItems);

    var drawControl = new L.Control.Draw({
        draw: {
            position: aoi_feature_edit.options.drawControlLocation,
            polygon: {
                title: 'Draw a polygon!',
                allowIntersection: false,
                drawError: {
                    color: '#b00b00',
                    timeout: 1000
                },
                shapeOptions: aoi_feature_edit.get_feature_type(aoi_feature_edit.current_feature_type_id).style,
                showArea: true
            },
            circle: false,
            rectangle: {
                shapeOptions: aoi_feature_edit.feature_types[aoi_feature_edit.current_feature_type_id].style
            }
        },
        edit: {
            featureGroup: drawnItems
        }
    });

    aoi_feature_edit.map.addControl(drawControl);
    aoi_feature_edit.drawcontrol = drawControl;

    map.on('draw:created', function (e) {
        var type = e.layerType;
        var layer = e.layer;

        var geojson = e.layer.toGeoJSON();
        geojson.properties.template = aoi_feature_edit.current_feature_type_id;
        geojson = JSON.stringify(geojson);

        $.ajax({
            type: "POST",
            url: aoi_feature_edit.create_feature_url,
            data: { aoi: aoi_feature_edit.aoi_id,
                geometry: geojson
            },
            success: alert,
            dataType: "json"
        });

        //layer.bindPopup('Feature Created!');
        drawnItems.addLayer(layer);
    });
};

// Changes current features to match the selected style.
aoi_feature_edit.updateDrawOptions = function (i) {
    aoi_feature_edit.drawcontrol.setDrawingOptions({ polygon: { shapeOptions: aoi_feature_edit.feature_types[i].style },
        rectangle: { shapeOptions: aoi_feature_edit.feature_types[i].style}
    });
};

aoi_feature_edit.getDrawConsole = function () {

    var geometry_type = null;

    if (aoi_feature_edit.hasOwnProperty("current_feature_type_id")) {
        var feature_id = aoi_feature_edit.current_feature_type_id;
        geometry_type = aoi_feature_edit.feature_types[feature_id].type;
    }

    if (geometry_type) {
        if (geometry_type != "Polygon") {
            var marker = false;
        }
        if (geometry_type === "Point") {
            var polygon = false;
            var rectangle = false;
        }
    }

};

// Filters the draw control to allow acceptable feature types.
aoi_feature_edit.filterDrawConsole = function () {
    var control = aoi_feature_edit.drawcontrol;
    var geometry_type = aoi_feature_edit.feature_types[aoi_feature_edit.current_feature_type_id].type;
    var map = control._map;
    map.removeControl(control);
};

aoi_feature_edit.addOptions = function (feature, div) {
    var t = _.template("<option value='{{id}}'>{{name}}</option>");
    $("#" + div).append(t(feature));
};

aoi_feature_edit.createFeatureCollection = function (id) {
    var featureCollection = {};
    featureCollection.type = "FeatureCollection";
    featureCollection.features = [];
    featureCollection.properties = {};
    featureCollection.properties.id = id;

    return featureCollection;
};