// This technical data was produced for the U. S. Government under Contract No. W15P7T-13-C-F600, and
// is subject to the Rights in Technical Data-Noncommercial Items clause at DFARS 252.227-7013 (FEB 2012)

//requires leaflet_helper.js, underscore, jquery, leaflet, log4javascript

var aoi_feature_edit = {};
aoi_feature_edit.layers = {features:[], base:[], overlays:[]};

var feature_hash = {};

aoi_feature_edit.options = {
};

aoi_feature_edit.all_polygons = [];
aoi_feature_edit.all_markers = [];

aoi_feature_edit.MapMarker = L.Icon.extend({
    options: {
        id: 0,
        shadowUrl: null,
        iconAnchor: new L.Point(12, 41),
        iconSize: new L.Point(25, 41),
        repeatMode: true,
        text: 'Draw a marker',
        iconUrl: '/static/images/badge_images/silver.png' //TODO: Replace with better default image
    }
});

aoi_feature_edit.init = function () {

    aoi_feature_edit.drawcontrol = null;
    aoi_feature_edit.featureLayers = [];
    aoi_feature_edit.icons = {};

    // on each feature use feature data to create a pop-up
//    function onEachFeature(feature, layer) {
//        if (feature.properties) {
//            var popupContent;

//    _.each(aoi_feature_edit.feature_types, function (ftype) {
//        // if this is a point, create icon for it first
//        if (ftype.type == 'Point') {
//            aoi_feature_edit.icons[ftype.id] = {
//                iconUrl: ftype.style.iconUrl,
//                text: ftype.name
//            };
//        }
//        layer.bindPopup(popupContent);
//    }

    _.each(aoi_feature_edit.feature_types, function (ftype) {
        // if this is a point, create icon for it first
        if (ftype.type == 'Point' && ftype.style && (ftype.style.iconUrl || ftype.style.icon)) {
            aoi_feature_edit.icons[ftype.id] = {
                iconUrl: ftype.style.iconUrl || ftype.style.icon,
                text: ftype.name
            };
        }


        var featureLayer = L.geoJson(null, {
            onEachFeature: function (feature, layer) {
                if (feature.properties) {
                    feature_hash[feature.properties.id] = {layerGroup: featureLayer, layer: layer};

                    var popupContent = '<h5>Feature #' + feature.properties.id + '</h5>';
                    if (feature.properties.template) {
                        var template = aoi_feature_edit.feature_types[parseInt(feature.properties.template)];
                        popupContent += '<b>' + template.name + '</b><br/>';
                    }
                    popupContent += '<b>Analyst:</b> ' + feature.properties.analyst;
                    popupContent += '<br/><b>Created:</b> ' + feature.properties.created_at;
                    popupContent += '<br/><b>Updated:</b> ' + feature.properties.updated_at;
                    popupContent += '<br/><a onclick="javascript:deleteFeature(\'' + feature.properties.id + '\', \'/geoq/features/delete/' + feature.properties.id + '\');">Delete Feature</a>';
                    layer.bindPopup(popupContent);
                }
            },
            pointToLayer: function (feature, latlng) {
                return new L.Marker(latlng, {
                    icon: new aoi_feature_edit.MapMarker(aoi_feature_edit.icons[feature.properties.template])
                });
            }
        });
        var feature_type = aoi_feature_edit.feature_types[ftype.properties.template];
        if (feature_type && feature_type.hasOwnProperty("style")) {
            featureLayer.style = feature_type.style;
        }

        featureLayer.name = ftype.name;
        aoi_feature_edit.featureLayers[ftype.id] = featureLayer;
    });
};

aoi_feature_edit.get_feature_type = function (i) {
    return aoi_feature_edit.feature_types[i] || {style: {"weight": 2, "color": "yellow", "fillColor": "orange", "fillOpacity": .9, "opacity": 1}};
};

aoi_feature_edit.mapResize = function () {
    var toLower = parseInt($('div.navbar-inner').css('height'));
    var newHeight = $(window).height() - toLower;
    $(map).height(newHeight);
    $(map).css('top', toLower + 'px');

    $('.navbar-fixed-top').css('margin-bottom', 0);
    $('body').css({'padding-left': 0, 'padding-right': 0});

};
aoi_feature_edit.map_init = function (map, bounds) {
    var custom_map = aoi_feature_edit.aoi_map_json;
    aoi_feature_edit.map = map;

    // SRJ: move zoom control
    //aoi_feature_edit.map.removeControl(aoi_feature_edit.map.zoomControl);
    //aoi_feature_edit.map.addControl(L.control.zoom({position: 'bottomright'}));

    var baseLayers = {};
    var layerSwitcher = {};
    //var editableLayers = new L.FeatureGroup();
    // Only layer in here should be base OSM layer
    _.each(aoi_feature_edit.map._layers, function (l) {
        baseLayers["OpenStreetMap"] = l;
    });

    aoi_feature_edit.layers.base = [];
    aoi_feature_edit.layers.overlays = [];
    if (custom_map.hasOwnProperty("layers")) {
        _.each(custom_map.layers, function (l) {
            var n = leaflet_helper.layer_conversion(l);
            if (n !== undefined) {
                if (l.isBaseLayer) {
                    baseLayers[l.name] = n;
                    log.info("Added " + l.name + " as an overlay layer.")
                    aoi_feature_edit.layers.overlays.push(l);
                } else {
                    layerSwitcher[l.name] = n;
                    log.info("Added " + l.name + " as a base layer.")
                    aoi_feature_edit.layers.base.push(l);
                }
            }
        });
    }
    //TODO: Remove all this code when layer builder is working
    var layercontrol = L.control.layers(baseLayers, layerSwitcher).addTo(aoi_feature_edit.map);


    aoi_feature_edit.addMapControlButtons(aoi_feature_edit.map);

    //Build a red box surrounding the AOI and zoom to that
    var aoi_extents = L.geoJson(aoi_feature_edit.aoi_extents_geojson,
        {
            style: leaflet_helper.styles.extentStyle,
            zIndex: 1000,
            name: "Bounds of this AOI"
        });
    aoi_extents.addTo(aoi_feature_edit.map);
    aoi_feature_edit.layers.features.push(aoi_extents);
    //Build a reset button that zooms to the extents of the AOI
    function locateBounds() {
        return aoi_extents.getBounds();
    }
    (new L.Control.ResetView(locateBounds)).addTo(aoi_feature_edit.map);


    // For each feature template, add features to map and layer control
    _.each(aoi_feature_edit.feature_types, function (ftype) {

        if (ftype.type == 'Polygon') {
            aoi_feature_edit.all_polygons.push(aoi_feature_edit.createPolygonOptions(ftype));
        } else if (ftype.type == 'Point') {
            var point = aoi_feature_edit.createPointOptions(ftype);
            if (point) aoi_feature_edit.all_markers.push(point);
        } else {
            log.error("Item should be drawn, but not a Polygon or Point object.")
        }
        var tnum = ftype.id;
        var featuretype = ftype.type;
        var featureCollection = aoi_feature_edit.createFeatureCollection(tnum);

        _.each(aoi_feature_edit.job_features_geojson.features, function (feature) {
            if (feature.properties.template == tnum && feature.geometry.type == featuretype) {
                //TODO: Change icon here depending on feature type, Issue #27
                featureCollection.features.push(feature);
            }
        });

        var featureLayer = aoi_feature_edit.featureLayers[tnum];
        var featureType = aoi_feature_edit.feature_types[tnum];

        if (featureLayer && featureType) {
            featureLayer.addData(featureCollection);
            featureLayer.addTo(aoi_feature_edit.map);
            layercontrol.addOverlay(featureLayer, featureType.name);
            aoi_feature_edit.layers.features.push(featureLayer);
        } else {
            log.error("A FeatureLayer was supposed to be drawn, but didn't seem to exist.")
        }

    });

    setTimeout(function () {
        aoi_feature_edit.map.fitBounds(aoi_extents.getBounds());
    }, 1);


    var drawnItems = new L.FeatureGroup();
//    aoi_feature_edit.map.addLayer(drawnItems);
//    aoi_feature_edit.drawnItems = drawnItems;
//
    leaflet_helper.addLocatorControl(map);
    aoi_feature_edit.buildDrawingControl(drawnItems);
    leaflet_helper.addGeocoderControl(map);

    var options = aoi_feature_edit.buildTreeLayers();
    leaflet_layer_control.addLayerControl(map, options);



    function onSuccess(data, textStatus, jqXHR) {
        if (data[0] && data[0].geojson) {
            var tnum = data[0].fields.template;
            var featureCollection = aoi_feature_edit.createFeatureCollection(tnum);
            featureCollection.features.push($.parseJSON(data[0].geojson));
            aoi_feature_edit.featureLayers[tnum].addData(featureCollection);
        }
    }

    function onError(jqXHR, textStatus, errorThrown) {
        log.error("Error while adding feature: " + errorThrown);
    }

    map.on('draw:created', function (e) {
        var type = e.layerType;
        var layer = e.layer;

        var geojson = e.layer.toGeoJSON();
        geojson.properties.template = aoi_feature_edit.current_feature_type_id || 1;
        geojson = JSON.stringify(geojson);

        $.ajax({
            type: "POST",
            url: aoi_feature_edit.create_feature_url,
            data: { aoi: aoi_feature_edit.aoi_id,
                geometry: geojson
            },
            success: onSuccess,
            error: onError,
            dataType: "json"
        });

        //layer.bindPopup('Feature Created!');
        //drawnItems.addLayer(layer);
    });

    map.on('draw:drawstart', function (e) {
        var id = e.layerType.slice(-1);
        var map_item_type = parseInt(id);
        if (isNaN(map_item_type)){
            //TODO: This is a temporary fix when the feature editing type isn't set properly
            var features = _.toArray(aoi_feature_edit.feature_types);
            if (features && features[0] && features[0].id) {
                map_item_type = features[0].id;
            } else {
                map_item_type = 1;  //NOTE: This should always be set to something, or throw an error
            }
        }
        aoi_feature_edit.current_feature_type_id = map_item_type;
    });

    //Resize the map
    aoi_feature_edit.mapResize();
    //Resize it on screen resize, but no more than every .3 seconds
    var lazyResize = _.debounce(aoi_feature_edit.mapResize, 300);
    $(window).resize(lazyResize);
};

aoi_feature_edit.buildDrawingControl = function (drawnItems) {

    if (aoi_feature_edit.drawcontrol) {
        //If a current control exists, delete it
        aoi_feature_edit.map.removeControl(aoi_feature_edit.drawcontrol);
    }

    //Find the Feature ID from the drop-down box (or use the one passed in)
    //feature_id = feature_id || aoi_feature_edit.current_feature_type_id || 1;
    //var feature = aoi_feature_edit.get_feature_type(feature_id);

    //Start building the draw options object
    var drawOptions = { draw: {position: "topright"} };
    drawOptions.edit = false;
    //TODO: Add editing back in - currently is not catching edits, as features are saved
    // to server as soon as they are entered

    var drawControl = new L.Control.Draw({
        position: "topright",

        draw: {
            polyline: false,
            circle: false,
            rectangle: false,

            markers: aoi_feature_edit.all_markers,
            polygons: aoi_feature_edit.all_polygons
            // rectangle: {
            //    shapeOptions: aoi_feature_edit.feature_types[aoi_feature_edit.current_feature_type_id].style
            //}
        },
        edit: {
            featureGroup: drawnItems
        }
    });


    //Create the drawing objects control
    //var drawControl = new L.Control.Draw(drawOptions);
    aoi_feature_edit.map.addControl(drawControl);
    aoi_feature_edit.drawcontrol = drawControl;

};

aoi_feature_edit.addMapControlButtons = function (map) {

    function complete_button_onClick() {
        $.ajax({
            type: "POST",
            url: aoi_feature_edit.complete_url,
            dataType: "json",
            success: function (response) {
                geoq.redirect(aoi_feature_edit.complete_redirect_url);
            }
        });
    }

    var completeButtonOptions = {
        'html': '<a id="aoi-submit" href="#" class="btn">Mark as Complete</a>',  // string
        'onClick': complete_button_onClick,  // callback function
        'hideText': false,  // bool
        position: 'bottomright',
        'maxWidth': 60,  // number
        'doToggle': false,  // bool
        'toggleStatus': false  // bool
    };
    var completeButton = new L.Control.Button(completeButtonOptions).addTo(map);


    var title = "<h4><a href='" + aoi_feature_edit.job_absolute_url + "'>" + aoi_feature_edit.job_name + "</a> > AOI #" + aoi_feature_edit.aoi_id + " > ";
    title += "<span class='aoi-status muted'>" + aoi_feature_edit.percent_complete + "% Complete > " + aoi_feature_edit.description + "</span></h4>";
    var titleInfoOptions = {
        'html': title,  // string
        'hideText': false,  // bool
        position: 'topleft',
        'maxWidth': 60,  // number
        'doToggle': false,  // bool
        'toggleStatus': false  // bool
    };
    var titleInfoButton = new L.Control.Button(titleInfoOptions).addTo(map);


    //TODO: Fix to make controls positioning more robust (and force to move to top when created)
    // Quick work-around for moving header to top of the page
    var $controls = $(".leaflet-control-button.leaflet-control");
    var $c = $($controls[0]);
    $c.prependTo($c.parent());

};

aoi_feature_edit.buildTreeLayers = function(){
    var options = {};
    options.base_layers = aoi_feature_edit.layers.base;
    options.feature_layers = aoi_feature_edit.layers.features;
    options.data_layers = [];
    try {
        var all_layers = JSON.parse(aoi_feature_edit.aoi_map_json.all_layers);
        var data_layers = _.filter(all_layers, function(l){
            return (l.type == "WMS" || l.type == "WMTS");
        });
        data_layers = _.difference(data_layers,options.base_layers);
        options.data_layers = data_layers;
    } catch (ex) {
        log.error("aoi_map_json.all_layers isn't being parsed as valid JSON.")
    }
    return options;
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

aoi_feature_edit.deleteFeature = function (id) {
    var feature = feature_hash[id];
    if (feature) {
        feature.layerGroup.removeLayer(feature.layer);
        delete feature_hash[id];
    }
};

aoi_feature_edit.createPolygonOptions = function (opts) {
    var options = {};

    if (opts.name) {
        options.title = opts.name;
    }

    options.allowIntersection = false;
    options.drawError = { color: '#b00b00', timeout: 1000};

    options.shapeOptions = opts.style || {borderColor: "black", backgroundColor: "brown"},
        options.showArea = true;
    options.id = opts.id;

    return options;
};

aoi_feature_edit.createPointOptions = function (opts) {
    var options = null;

    if (opts && opts.style && (opts.style.iconUrl || opts.style.icon)) {
        options = {};
        var marker = new aoi_feature_edit.MapMarker({
            iconUrl: opts.style.iconUrl || opts.style.icon,
            text: opts.name
        });

        options.icon = marker;
        options.repeatMode = true;
        options.id = opts.id;
    }

    return options;
};
