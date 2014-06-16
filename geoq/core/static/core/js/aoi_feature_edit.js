// This technical data was produced for the U. S. Government under Contract No. W15P7T-13-C-F600, and
// is subject to the Rights in Technical Data-Noncommercial Items clause at DFARS 252.227-7013 (FEB 2012)

//requires leaflet_helper.js, underscore, jquery, leaflet, log4javascript

var aoi_feature_edit = {};
aoi_feature_edit.layers = {features:[], base:[], overlays:[]};

var feature_hash = {};
aoi_feature_edit.drawnItems = new L.FeatureGroup();
aoi_feature_edit.options = {};
aoi_feature_edit.all_polygons = [];
aoi_feature_edit.all_markers = [];
aoi_feature_edit.available_icons = [];
aoi_feature_edit.MapIcon = null;

aoi_feature_edit.init = function () {
    aoi_feature_edit.drawcontrol = null;
    aoi_feature_edit.featureLayers = [];
    aoi_feature_edit.icons = {};
    aoi_feature_edit.icon_style = {};


    //Set up base icon
    aoi_feature_edit.MapIcon = L.Icon.extend({
        options: {
            id: 0,
            shadowUrl: null,
            iconAnchor: new L.Point(7, 24),
            iconSize: new L.Point(15, 24),
            repeatMode: true,
            text: 'Draw a marker'
        }
    });

    _.each(aoi_feature_edit.feature_types, function (ftype) {
        // if this is a point, create icon for it first
        if (ftype.type == 'Point' && ftype.style) {
            aoi_feature_edit.icon_style[ftype.id] = ftype.style || {"type":"image"};
            if (ftype.style.type == 'maki') {
                aoi_feature_edit.icons[ftype.id] = L.MakiMarkers.Icon;
            }
            else {
                aoi_feature_edit.icons[ftype.id] = aoi_feature_edit.MapIcon;
            }
            if (ftype.name) {
                aoi_feature_edit.icons[ftype.id].title = ftype.name;
                aoi_feature_edit.icons[ftype.id].text = ftype.name;
            }

        }

        var featureLayer = L.geoJson(null, {
            style: function (ftype) {
                var feature_type = aoi_feature_edit.feature_types[ftype.properties.template];
                if (feature_type && feature_type.hasOwnProperty("style")) {
                    return feature_type.style;
                }
            },
            onEachFeature: function(feature, layer) {
                aoi_feature_edit.featureLayer_onEachFeature(feature, layer, featureLayer);
            },
            pointToLayer: aoi_feature_edit.featureLayer_pointToLayer
        });

        featureLayer.name = ftype.name;
        aoi_feature_edit.featureLayers[ftype.id] = featureLayer;
    });

    //Set up icons to be used by feeds
    var icons = "blue green orange purple yellow red gray".split(" ");
    _.each(icons,function(icon){
        aoi_feature_edit.available_icons.push(aoi_feature_edit.static_root + "/leaflet/images/"+icon+"-marker-icon.png");
    });

};

aoi_feature_edit.featureLayer_pointToLayer = function (feature, latlng) {
    var icon = new aoi_feature_edit.icons[feature.properties.template](aoi_feature_edit.icon_style[feature.properties.template])
    var marker = new L.Marker(latlng, {
//        icon: new aoi_feature_edit.MapIcon(aoi_feature_edit.icons[feature.properties.template])
        icon: icon
    });
    return marker
};
aoi_feature_edit.featureLayer_onEachFeature = function (feature, layer, featureLayer) {
    if (feature.properties) {
        feature_hash[feature.properties.id] = {layerGroup: featureLayer, layer: layer};

        var popupContent = "<h5>Feature</h5>";
        if (feature.properties.id){
            popupContent = '<h5>Feature #' + feature.properties.id + '</h5>';
        }
        if (feature.properties.template) {
            var template = aoi_feature_edit.feature_types[parseInt(feature.properties.template)];
            popupContent += '<b>' + template.name + '</b><br/>';
        }
        if (feature.properties.analyst){
            popupContent += '<b>Analyst:</b> ' + feature.properties.analyst;
        }
        if (feature.properties.created_at){
            popupContent += '<br/><b>Created:</b> ' + feature.properties.created_at;
        }
        if (feature.properties.updated_at){
            popupContent += '<br/><b>Updated:</b> ' + feature.properties.updated_at;
        }
        if (feature.properties.id){
            popupContent += '<br/><a onclick="javascript:deleteFeature(\'' + feature.properties.id + '\', \'/geoq/features/delete/' + feature.properties.id + '\');">Delete Feature</a>';
        }
        layer.bindPopup(popupContent);
    }
};

aoi_feature_edit.get_feature_type = function (i) {
    return aoi_feature_edit.feature_types[i] || {style: {"weight": 2, "color": "yellow", "fillColor": "orange", "fillOpacity": .9, "opacity": 1}};
};

aoi_feature_edit.mapResize = function () {
    var toLower = parseInt($('div.navbar-inner').css('height'));
    var newHeight = $(window).height() - toLower;

    $(map).height(newHeight);
    $('#layer_info_drawer').height(newHeight-10);

    $('.navbar-fixed-top').css('margin-bottom', 0);
    $('body').height(newHeight-20).css({'padding-left': 0, 'padding-right': 0});

    if (aoi_feature_edit.map && aoi_feature_edit.map.invalidateSize) {
        aoi_feature_edit.map.invalidateSize(false);
    }
};
aoi_feature_edit.map_init = function (map, bounds) {
    var custom_map = aoi_feature_edit.aoi_map_json;
    aoi_feature_edit.map = map;

    var baseLayers = {};
    var layerSwitcher = {};
    //var editableLayers = new L.FeatureGroup();
    // Only layer in here should be base OSM layer
    _.each(aoi_feature_edit.map._layers, function (l) {
        baseLayers["OpenStreetMap"] = l;
    });

    aoi_feature_edit.layers.base = [];
    aoi_feature_edit.layers.overlays = [];

    var baselayer = _.toArray(aoi_feature_edit.map._layers);
    if (baselayer && baselayer[0]) {
        baselayer[0].name="OpenStreetMap";
        aoi_feature_edit.layers.base.push(baselayer[0]);
    }

    if (custom_map.hasOwnProperty("layers")) {
        _.each(custom_map.layers, function (layer_data) {
            var built_layer = leaflet_helper.layer_conversion(layer_data, map);
            if (built_layer !== undefined) {
                if (layer_data.isBaseLayer) {
                    baseLayers[layer_data.name] = built_layer;
                    aoi_feature_edit.layers.base.push(built_layer);
                } else {
                    layerSwitcher[layer_data.name] = built_layer;
                    aoi_feature_edit.layers.overlays.push(built_layer);
                }
            } else {
                log.error("Tried to add a layer, but didn't work: "+layer_data.url)
            }
            if (built_layer) aoi_feature_edit.map.addLayer(built_layer);
        });
    }

    aoi_feature_edit.addMapControlButtons(aoi_feature_edit.map);

    //Build a red box surrounding the AOI and zoom to that
    var aoi_extents = L.geoJson(aoi_feature_edit.aoi_extents_geojson,
        {
            style: leaflet_helper.styles.extentStyle_hollow,
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
            featureLayer.eachLayer(function (layer) {
                aoi_feature_edit.drawnItems.addLayer(layer);
            });
            featureLayer.addTo(aoi_feature_edit.map);
            aoi_feature_edit.layers.features.push(featureLayer);
        } else {
            log.error("A FeatureLayer was supposed to be drawn, but didn't seem to exist.")
        }
    });

    aoi_feature_edit.layers.features = aoi_feature_edit.featureLayers;

    setTimeout(function () {
        if (aoi_extents.getBounds) {
            aoi_feature_edit.map.fitBounds(aoi_extents.getBounds());
        }
    }, 1);


    leaflet_helper.addLocatorControl(map);
    aoi_feature_edit.buildDrawingControl(aoi_feature_edit.drawnItems);
    leaflet_helper.addGeocoderControl(map);

    //Build the filter drawer (currently on left, TODO: move to bottom)
    leaflet_filter_bar.init();
    leaflet_filter_bar.addLayerControl(map, {hiddenTagInput:true});

    //Build the layer tree on the left
    leaflet_layer_control.init();
    var options = aoi_feature_edit.buildTreeLayers();
    leaflet_layer_control.addLayerControl(map, options);

    function help_onclick() {
        window.open(aoi_feature_edit.help_url);
    }

    var help_control = new L.Control.Button({
        'iconUrl': aoi_feature_edit.static_root + 'images/question.png',
        'onClick': help_onclick,
        'hideText': true,
        'doToggle': false,
        'toggleStatus': false
    });

    help_control.addTo(map, {'position':'topleft'});

    function onSuccess(data, textStatus, jqXHR) {
        if (data[0] && data[0].geojson) {
            var tnum = data[0].fields.template;
            var featureCollection = aoi_feature_edit.createFeatureCollection(tnum);
            featureCollection.features.push($.parseJSON(data[0].geojson));
            aoi_feature_edit.featureLayers[tnum].addData(featureCollection);

            var layer = feature_hash[data[0].pk].layer;
            aoi_feature_edit.drawnItems.addLayer(layer);
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

    function onSuccessEdit(data, textStatus, jqXHR) {}
    function onErrorEdit(jqXHR, textStatus, errorThrown) {
            alert("Error while editing feature: " + errorThrown);
    }

    map.on('draw:edited', function (e) {
        var layers = e.layers;
        layers.eachLayer(function (layer) {
            var geojson = layer.toGeoJSON();
            geojson = JSON.stringify(geojson);

            $.ajax({
                type: "POST",
                url: aoi_feature_edit.edit_feature_url,
                data: { aoi: aoi_feature_edit.aoi_id,
                        geometry: geojson
                },
                success: onSuccessEdit,
                error: onErrorEdit,
                dataType: "json"
            });
        });
    });

    $('div.leaflet-draw.leaflet-control').find('a').popover({trigger:"hover",placement:"right"})

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

    _.each(aoi_feature_edit.all_markers,function(marker){
        if (marker.title && marker.icon && marker.icon.options) {
            marker.icon.options.text = marker.title
        }
    });

    var drawControl = new L.Control.Draw({
        position: "topleft",

        draw: {
            polyline: false,
            circle: false,
            rectangle: false,

            markers: aoi_feature_edit.all_markers,
            polygons: aoi_feature_edit.all_polygons
        },
        edit: {
            featureGroup: drawnItems,
            remove: false
        }
    });

    //Create the drawing objects control
    aoi_feature_edit.map.addControl(drawControl);
    aoi_feature_edit.drawcontrol = drawControl;

    //Change the color of the icons or add an Image of the icon if there is one
    var icons = $('div.leaflet-draw.leaflet-control').find('a');
    _.each(aoi_feature_edit.feature_types, function (ftype) {
        var $icon = undefined;
        _.each (icons,function(icon_obj){
            var $icon_obj = $(icon_obj);
            var icon_title = $icon_obj.attr('title') || $icon_obj.attr('data-original-title');
            if (icon_title == ftype.name){
                $icon = $icon_obj;
            }
        });

        if ($icon) {
            var bg_color = ftype.style.color;
            var bg_image = ftype.style.iconUrl || ftype.style.icon;

            if (bg_color) {
                $icon.css({backgroundColor:bg_color,opacity:0.7, borderColor:bg_color, borderWidth:1});
            }
            if (bg_image) {
                bg_image = 'url("'+bg_image+'")';
                $icon.css({background:bg_image, backgroundSize:'contain', backgroundRepeat:'no-repeat'});

            }
        }
    });
};

aoi_feature_edit.addMapControlButtons = function (map) {

    function complete_button_onClick() {
        $.ajax({
            type: "POST",
            url: aoi_feature_edit.finishUrl,
            dataType: "json",
            success: function (response) {
                //geoq.redirect(aoi_feature_edit.complete_redirect_url);
                finishAOI();
            }
        });
    }

    var completeButtonOptions = {
        'html': '<a id="aoi-submit" href="#" class="btn">' + aoi_feature_edit.finishLabel+ '</a>',  // string
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

    function layers_only_non_transparent(not_these){
        var layers = [];
        try {
            var all_layers = JSON.parse(aoi_feature_edit.aoi_map_json.all_layers);
            layers = _.filter(all_layers, function(l){
                return ((l.type == "WMS" || l.type == "WMTS") && l.transparent == false);
            });
            if (not_these) {
                //layers = _.difference(layers,not_these);
                var keep_layers = [];
                _.each(layers,function(l_main){
                    var l_keep = true;
                    _.each(not_these, function(l_not){
                        if (l_main.id === l_not.id) {
                            l_keep = false;
                            return false;
                        }
                    });
                    if (l_keep) keep_layers.push(l_main);
                });
                layers = keep_layers;
            }
        } catch (ex) {
            log.error("aoi_map_json.all_layers isn't being parsed as valid JSON.")
        }
        return layers;
    }

    function layers_only_social(){
        var layers = [];
        try {
            var all_layers = JSON.parse(aoi_feature_edit.aoi_map_json.all_layers);
            var social_layers = _.filter(all_layers, function(l){
                return (l.type == "Social Networking Link");
            });
            aoi_feature_edit.layers.social = social_layers;
            _.each(social_layers,function(l){
                var l_all = _.clone(l);
                l_all.name = l.name + " - All";
                layers.push(l_all);
            });

        } catch (ex) {
            log.error("aoi_map_json.all_layers isn't being parsed as valid JSON.");
        }
        return layers;
    }

    function removeEmptyParents(options){
        var optionsNew = {titles:[], layers:[]};

        _.each(options.layers,function(layerGroup,i){
            if (layerGroup.length > 0) {
                optionsNew.titles.push(options.titles[i]);
                optionsNew.layers.push(options.layers[i]);
            }
        });

        return optionsNew;
    }

    var options = {};
    options.titles = [];
    options.layers = [];

    options.titles.push('AOI Base Maps');
    options.layers.push(aoi_feature_edit.layers.base);

    options.titles.push('Other Base Maps');
    options.layers.push(layers_only_non_transparent(aoi_feature_edit.layers.base));

    options.titles.push('Features');
    options.layers.push(aoi_feature_edit.layers.features);

    options.titles.push('Data Feeds');
    options.layers.push(aoi_feature_edit.layers.overlays);

    options.titles.push('Social Networking Feeds');
    options.layers.push(layers_only_social());

    options = removeEmptyParents(options);

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
        aoi_feature_edit.drawnItems.removeLayer(feature.layer);
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

    options.shapeOptions = opts.style || {borderColor: "black", backgroundColor: "brown"};
    options.showArea = true;
    options.id = opts.id;

    return options;
};

aoi_feature_edit.createPointOptions = function (opts) {
    var options = {};

    if (opts.name) {
        options.title = opts.name;
        options.text = opts.name;
    }

    if (opts.style) {
        options.style = opts.style;
    }

    var id = opts.id;
    var style_obj = aoi_feature_edit.icon_style[id];
    var icon_obj = aoi_feature_edit.icons[id];
    if (style_obj && icon_obj) {
        options.icon = new icon_obj(style_obj);
    }

    options.repeatMode = true;
    options.id = opts.id;

    return options;
};
