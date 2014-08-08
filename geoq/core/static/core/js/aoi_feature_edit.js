// This technical data was produced for the U. S. Government under Contract No. W15P7T-13-C-F600, and
// is subject to the Rights in Technical Data-Noncommercial Items clause at DFARS 252.227-7013 (FEB 2012)

//requires leaflet_helper.js, underscore, jquery, leaflet, log4javascript

var aoi_feature_edit = {};
aoi_feature_edit.layers = {features:[], base:[], overlays:[]};

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

    //Start building feature icons
    _.each(aoi_feature_edit.feature_types, function (ftype) {
        // if this is a point, create icon for it first
        if (ftype.type == 'Point' && ftype.style) {
            aoi_feature_edit.icon_style[ftype.id] = ftype.style || {"type":"image"};
            if (ftype.style.type == 'maki') {
                aoi_feature_edit.icons[ftype.id] = L.MakiMarkers.Icon;
                aoi_feature_edit.icons[ftype.id].type = 'maki';
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
            pointToLayer: function(feature, latlng) {
                return aoi_feature_edit.featureLayer_pointToLayer(feature, latlng, featureLayer, ftype);
            }
        });
        featureLayer.on('click', function(e){
            if (typeof leaflet_layer_control!="undefined"){
                leaflet_layer_control.show_feature_info(e.layer.feature);
            }
        });

        featureLayer.name = ftype.name;
        aoi_feature_edit.featureLayers[ftype.id] = featureLayer;
    });

    //Set up icons to be used by feeds
    var icons = "blue green orange purple yellow red gray".split(" ");
    _.each(icons,function(icon){
        aoi_feature_edit.available_icons.push(aoi_feature_edit.static_root + "/leaflet/images/"+icon+"-marker-icon.png");
    });

    //Close Alert field if shown
    setTimeout(function(){$('div.alert').css({display:'none'});},3000);

};

aoi_feature_edit.featureLayer_pointToLayer = function (feature, latlng, featureLayer, featureType) {
    var featureTypeID = feature.properties.template;
    var style_obj = featureType.style;
    var iconW,iconH,iconAnchorW,iconAnchorH;

    if (style_obj.iconSize && typeof style_obj.iconSize != "object") {
        if (style_obj.iconSize) {
            iconW = iconH = style_obj.iconSize;
        }
        if (style_obj.iconWidth) iconW = parseInt(style_obj.iconWidth);
        if (style_obj.iconHeight) iconH = parseInt(style_obj.iconHeight);

        if (iconW || iconH){
            if (!iconW) iconW = iconH;
            if (!iconH) iconH = iconW;
            if (!iconAnchorW) iconAnchorW = Math.ceil(iconW/2);
            if (!iconAnchorH) iconAnchorH = Math.ceil(iconH/2);

            style_obj.iconAnchor = new L.Point(iconAnchorW, iconAnchorH);
            style_obj.iconSize = new L.Point(iconW, iconH);
        }
    }

    var icon = new aoi_feature_edit.icons[featureTypeID](style_obj);
    var marker = new L.Marker(latlng, {
        icon: icon
    });
    if (style_obj.color) {
        marker.on('add',function(evt){
            marker = evt.target
            var $icon = $(marker._icon);
            aoi_feature_edit.colorIconFromStyle($icon,style_obj);
        });
    }
    return marker;
};
aoi_feature_edit.colorIconFromStyle = function ($icon,style_obj){
    var color = maths.getRGBComponents(style_obj.color);

    var color_options = {
        mode: style_obj.color_mode || 'replace_red',
        method: style_obj.color_method || 'replace',

        r_intensity:color.R,
        g_intensity:color.G,
        b_intensity:color.B,
        r_max:style_obj.r_max,
        g_max:style_obj.g_max,
        b_max:style_obj.b_max,
        r_min:style_obj.r_min,
        g_min:style_obj.g_min,
        b_min:style_obj.b_min,

        blend_weight:style_obj.blend_weight || 3
    };

    var color2 = maths.getRGBComponents(style_obj.color2);
    if (color2) {
        color_options.mode2 = style_obj.color_mode2 || 'replace_white';
        color_options.r2_intensity = color2.R;
        color_options.g2_intensity = color2.G;
        color_options.b2_intensity = color2.B;
        color_options.r2_max = style_obj.r2_max;
        color_options.g2_max = style_obj.g2_max;
        color_options.b2_max = style_obj.b2_max;
        color_options.r2_min = style_obj.r2_min;
        color_options.g2_min = style_obj.g2_min;
        color_options.b2_min = style_obj.b2_min;
    }

    //Modify the icon
    $icon.tancolor(color_options);
};

aoi_feature_edit.featureLayer_onEachFeature = function (feature, layer, featureLayer) {
    if (feature.properties) {
        var id = feature.properties.id;
        feature_manager.addAtId(id,{layerGroup: featureLayer, layer: layer});

        var popupContent = "<h5>Feature</h5>";
        if (id){
            popupContent = '<h5>Feature #' + id + '</h5>';
        }
        if (feature.properties.template) {
            var template = aoi_feature_edit.feature_types[parseInt(feature.properties.template)];
            popupContent += '<b>' + template.name + '</b><br/>';
        }
        if (feature.properties.analyst){
            popupContent += '<b>Analyst:</b> ' + feature.properties.analyst;
        }
        if (feature.properties.updated_at){
            var datetime = feature.properties.updated_at;
            datetime = datetime.replace("T"," ");
            datetime = datetime.replace("UTC"," UTC");
            var dtg = moment(datetime);

            if (dtg.isValid()){
                popupContent += '<br/><b>Updated:</b> ' + dtg.calendar();
            }
        }
        if (feature.properties.feature_note){
            popupContent += '<br/><b>Note:</b> ' + feature.properties.feature_note;
        }
        if (id){
            popupContent += '<br/><a onclick="javascript:aoi_feature_edit.deleteFeature(\'' + id + '\', \'/geoq/features/delete/' + id + '\');">Delete Feature</a>';
        }
        popupContent += leaflet_helper.addLinksToPopup(featureLayer.name, id, false, false, true);

        layer.bindPopup(popupContent);
    }
};
aoi_feature_edit.deleteFeature = function(id, delete_url) {
    var confirmText = 'Delete feature #' + id + '?';
    var confirmFunction = function(result) {
        if (result) {
            $.ajax({
                url: delete_url,
                type: 'GET',
                success: function(data) {
                    aoi_feature_edit.deleteFeatureFromHash(data);
                },
                failure: function() { log.error('Failed to delete feature ' + id);}
            })
        }
    };
    BootstrapDialog.confirm(confirmText, confirmFunction);
};
aoi_feature_edit.deleteFeatureFromHash = function (id) {
    var feature = feature_manager.findById(id);
    if (feature) {
        feature.layerGroup.removeLayer(feature.layer);
        aoi_feature_edit.drawnItems.removeLayer(feature.layer);
        feature_manager.removeId(id);
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

        var newWidth = $(aoi_feature_edit.map._container).width();
        $('#aoi-status-box').css('width', newWidth-164);
    }
};

aoi_feature_edit.layer_oversight = {
  pending: [],
  watched: [],
  warned: [],
  failing: []
};
aoi_feature_edit.watch_layer = function(layer, watch) {
    oversight = aoi_feature_edit.layer_oversight;
    name = layer.name;
    pending = oversight.pending;
    watched = oversight.watched;
    failing = oversight.failing;
    if(watch) {
        if(watched.indexOf(name) < 0) watched[watched.length] = name;
        layer.on("loading", function () {
            if(pending.indexOf(name) < 0) {
              pending[pending.length] = name;
              $("#layer-status").addClass("icon-refresh");
            }
        });
        layer.on("load", function() {
             if(watched.indexOf(name) > -1) {
                pending.splice(watched.indexOf(name),1);
             }
             if(pending.length == 0) {
                  $("#layer-status").removeClass("icon-refresh");
             }
        });
        layer.on("tileerror", function(evt) {
          var errorSrc = evt.target.name;
          var layerErrorI = $("#layer-error");
          if(!layerErrorI.hasClass("icon-flag")) layerErrorI.addClass("icon-flag");
          if(pending.indexOf(errorSrc) > -1) pending.splice(pending.indexOf(errorSrc),1);
          if(pending.length == 0) layerErrorI.removeClass("icon-refresh");

          if(failing.indexOf(errorSrc) < 0) {
            failing[failing.length] = errorSrc;
          }
          var toggleDrawer = $("#toggle-drawer");
          toggleDrawer.tooltip("destroy");
          toggleDrawer.prop("title", "Layer Issue(s): " + failing.join(", "));
          toggleDrawer.tooltip();
        });
    } else {
        if(watched.indexOf(name) > -1) {
            layer.off("loading");
            layer.off("load");
            layer.off("tileerror");
        }
    }
};

aoi_feature_edit.map_init = function (map, bounds) {

    map.on("layer_add", function(e) {
        aoi_feature_edit.watch_layer(e.layer, true);
    });
    map.on("layer_remove", function(e) {
        aoi_feature_edit.watch_layer(e.layer, false);
    });

    map.options.maxZoom = 19;

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

    //Add the Base OSM Layer
    var baselayer = _.toArray(aoi_feature_edit.map._layers);
    if (baselayer && baselayer[0]) {
        baselayer[0].name="OpenStreetMap";
        aoi_feature_edit.layers.base.push(baselayer[0]);
    }

    //Add Editing Buttons
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

    //Zoom to the bounds of the Workcell, then one more level
    aoi_feature_edit.map.fitBounds(aoi_extents.getBounds());
    aoi_feature_edit.map.setZoom(aoi_feature_edit.map.getZoom()+1);


    //Build layers, parse them, and add them to the map and to memory
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
            if (built_layer) {
                aoi_feature_edit.watch_layer(built_layer, true);
                aoi_feature_edit.map.addLayer(built_layer);
            }
        });
    }

    // For each feature template, add features to map and layer control
    _.each(_.sortBy(aoi_feature_edit.feature_types,'order'), function (ftype) {

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
                featureCollection.features.push(feature);
            }
        });

        var featureLayer = aoi_feature_edit.featureLayers[tnum];
        var featureType = aoi_feature_edit.feature_types[tnum];

        if (featureLayer && featureType) {
            feature_manager.addFeatureToLayer(featureLayer,featureCollection);
//            featureLayer.addData(featureCollection);
            featureLayer.eachLayer(function (layer) {
                aoi_feature_edit.drawnItems.addLayer(layer);
            });
            featureLayer.addTo(aoi_feature_edit.map);
            featureLayer.options.is_geoq_feature = true;
            if (_.isNumber(ftype.order)) featureLayer.options.order = ftype.order;
            aoi_feature_edit.layers.features.push(featureLayer);
        } else {
            log.error("A FeatureLayer was supposed to be drawn, but didn't seem to exist.")
        }
    });

    aoi_feature_edit.layers.features = aoi_feature_edit.featureLayers;

    //Add other controls
    leaflet_helper.addLocatorControl(map);
    aoi_feature_edit.buildDrawingControl(aoi_feature_edit.drawnItems);
    leaflet_helper.addGeocoderControl(map);
    feature_manager.addStatusControl(map);

    //Build the filter drawer (currently on left, TODO: move to bottom)
    leaflet_filter_bar.init();
    leaflet_filter_bar.addLayerControl(map, {hiddenTagInput:true});

    //Build the layer tree on the left
    var $accordion = leaflet_layer_control.init();
    var options = aoi_feature_edit.buildTreeLayers();
    leaflet_layer_control.addLayerControl(map, options, $accordion);
    leaflet_layer_control.addPreferenceListener($accordion);

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
        var feature = data[0];
        if (feature && feature.geojson) {
            var tnum = feature.fields.template;

            //Create the feature
            var featureCollection = aoi_feature_edit.createFeatureCollection(tnum);
            featureCollection.features.push($.parseJSON(feature.geojson));

            //Add the feature to the layer
            feature_manager.addFeatureToLayer(aoi_feature_edit.featureLayers[tnum],featureCollection);
//            aoi_feature_edit.featureLayers[tnum].addData(featureCollection);

            var layer_holder = feature_manager.findById(feature.pk);
            aoi_feature_edit.drawnItems.addLayer(layer_holder.layer);
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
        var id = 1;
        var matches = e.layerType.match(/\d+$/);
        if (matches) {
            id = matches[0];
        }

        var map_item_type = parseInt(id);
        if (isNaN(map_item_type)){
            var features = _.sortBy(_.toArray(aoi_feature_edit.feature_types),'order');
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
            log.error("Error while editing feature: " + errorThrown);
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

    //Look for 'Hints' within popups (which only hold text) and replace them with code that runs functions
    map.on('popupopen', function(popupEvent) {
        var $holder = $('a.make-draggable-hint').click(function(){
            var layer = $holder.find('.layer-name-hint').text();
            var feature_id = $holder.find('.feature-id-hint').text();

            var feature = aoi_feature_edit.findPopupByLayerAndFeature(layer,feature_id);
            if (feature) {
                aoi_feature_edit.draggingFeature = feature;

                aoi_feature_edit.map.closePopup();
            }
        });

        var $holder2 = $('a.make-deletable-hint').click(function(){
            var layer = $holder2.find('.layer-name-hint').text();
            var feature_id = $holder2.find('.feature-id-hint').text();

            var feature = aoi_feature_edit.findPopupByLayerAndFeature(layer,feature_id);
            if (feature) {
                aoi_feature_edit.map.closePopup();
                map.removeLayer(feature);
            }
        });

        var $holder3 = $('a.make-droppable-hint');
        var $text3 = $holder3.find('.text-hint');
        if (aoi_feature_edit.draggingFeature && !jQuery.isEmptyObject($text3)) {
            var layer = $holder3.find('.layer-name-hint').text();
            var feature_id = $holder3.find('.feature-id-hint').text();

            var feature_to_link = aoi_feature_edit.findPopupByLayerAndFeature(layer,feature_id);

            if (feature_to_link) {
                var feature_from_link = aoi_feature_edit.draggingFeature;
                var feature_id_from = (feature_from_link.feature.properties.source || "Feed item") + ' #' +_.str.truncate(feature_from_link.feature.properties.id, 6);
                $text3
                    .html('<hr/>Link: '+feature_id_from)
                    .on('click',function(){

                        $holder3.empty();

                        var props = _.clone(feature_from_link.feature.properties);
                        props.popupContent="";
                        delete props.popupContent;

                        var json = JSON.stringify(props);

                        var editableUrl = '/geoq/api/feature/update/'+feature_id;
                        $.ajax({
                            type: "POST",
                            url: editableUrl,
                            data: { id: 'add_link',
                                value: json
                            },
                            success: function(result){
                                log.log("Success in linking image");
                                var feature = feature_to_link.feature;
                                feature.properties = feature.properties || {};
                                feature.properties.linked_items = feature.properties.linked_items || [];
                                feature.properties.linked_items.push(result);

                                leaflet_layer_control.show_feature_info(feature);
                            },
                            error: function(){log.log("Error in linking image")},
                            dataType: "json"
                        });

                        aoi_feature_edit.draggingFeature = null;
                    });
            } else {
                $text3
                    .off('click')
                    .empty();
            }
        } else {
            if (!jQuery.isEmptyObject($text3)){
                $text3
                    .off('click')
                    .empty();
            }
        }


    });

    $('div.leaflet-draw.leaflet-control').find('a').popover({trigger:"hover",placement:"right"});

    //Resize the map
    aoi_feature_edit.mapResize();
    //Resize it on screen resize, but no more than every .3 seconds
    var lazyResize = _.debounce(aoi_feature_edit.mapResize, 300);
    $(window).resize(lazyResize);
};
aoi_feature_edit.findPopupByLayerAndFeature = function (layer_name, feature_id){
    var all_layers = _.flatten(aoi_feature_edit.layers);
    var all_active_layers = _.filter(all_layers,function(l){return (l._layers && l._map)});
    var feature = undefined;

    _.each(all_active_layers,function(layer){
        if (layer.name == layer_name){
            _.each(layer._layers,function(f){
                if (f.feature && f.feature.properties && f.feature.properties.id && (f.feature.properties.id==feature_id)){
                    feature = f;
                }
            });
        }
    });

    return feature;
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

    L.drawLocal.draw.toolbar.actions.text = "Finish";
    L.drawLocal.draw.toolbar.actions.title = "Finish Drawing Features";

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

        var setColorBG = true;
        if ($icon) {
            var bg_color = ftype.style.color;
            var bg_image = ftype.style.iconUrl || ftype.style.icon;

            if (ftype.style.type=="maki"){
                $icon
                    .addClass('maki-icon '+ftype.style.icon)
                    .css('backgroundImage', "url(/static/images/maki/images/maki-sprite.png)");
            } else if (bg_image) {
                //Find the offset to center the icon
                var widthOffset = 5;
                var width = ftype.style.iconWidth || 11;
                if (ftype.style.iconSize){
                    if (ftype.style.iconSize.x) {
                        width = ftype.style.iconSize.x;
                    } else {
                        width = ftype.style.iconSize;
                    }
                }
                width = parseInt(width);
                if (width){
                    widthOffset = parseInt((17 - width)/2);
                    if (widthOffset<1) widthOffset=0;
                }

                if (ftype.style.color_mode) {
                    if (width>21) width=21;
                    $icon.css({position:'relative', background:'none'});
                    setColorBG = false;

                    var left_slide = 0;
                    var $icon_infront = $('<img>')
                        .attr('src',bg_image)
                        .css({position:'absolute',width:width+'px',left:5+widthOffset+'px', top:5+widthOffset+'px'})
                        .appendTo($icon);

                    aoi_feature_edit.colorIconFromStyle($icon_infront,ftype.style);

                } else {
                    bg_image = 'url("'+bg_image+'")';
                    $icon.css({background:bg_image, backgroundSize:'contain', backgroundRepeat:'no-repeat',backgroundPosition:widthOffset+'px'});
                }
            }
            if (bg_color && setColorBG) {
                $icon.css({backgroundColor:bg_color,opacity:0.7, borderColor:bg_color, borderWidth:1});
            }

        }
    });
};

aoi_feature_edit.addMapControlButtons = function (map) {

    var $finishButton = aoi_feature_edit.buildDropdownMenu();
    var completeButtonOptions = {
        html: $finishButton,  // callback function
        hideText: false,  // bool
        position: 'bottomright',
        maxWidth: 60,  // number
        doToggle: false,  // bool
        toggleStatus: false  // bool
    };
    var completeButton = new L.Control.Button(completeButtonOptions).addTo(map);

    var title = "<h4 id='aoi-status-box'><a href='" + aoi_feature_edit.job_absolute_url + "'>" + aoi_feature_edit.job_name + " (" + aoi_feature_edit.percent_complete + "% Complete)</a> >";
    title += "<span class='aoi-status muted'> AOI #" + aoi_feature_edit.aoi_id + " > " +aoi_feature_edit.description + "</span></h4>";
    var $title = $(title)
        .on('click',function(){
           window.open(aoi_feature_edit.job_absolute_url);
        });
    var titleInfoOptions = {
        'html': $title,  // string
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
        if (!style_obj.iconUrl && icon_obj.type != 'maki') {
            style_obj.iconUrl = "/static/leaflet/images/red-marker-icon.png";
        }
        options.icon = new icon_obj(style_obj);
    }

//  TODO: Add support for circle markers
//            marker = new L.CircleMarker(latlng, {
//                radius: style_obj.iconSize || style_obj.iconWidth || style_obj.iconHeight || 9,
//                fillColor: style_obj.color,
//                color: "#000",
//                weight: style_obj.weight || 1,
//                opacity: 1,
//                fillOpacity: 0.8,
//            });


    options.repeatMode = true;
    options.id = opts.id;

    return options;
};

aoi_feature_edit.buildDropdownMenu = function() {
    var $div = $("<div>")
        .addClass("dropup");

    var $ull = $('<ul>');

    var $finishButton = $("<a>")
        .addClass("btn dropdown-toggle")
        .attr({id:'finish-button-dropdown', 'data-toggle':"dropdown", type:"button", href:'#'})
        .click(function(){
            $ull.dropdown('toggle');
            return false;
        })
        .append($('<span>Finish</span>'))
        .append($('<b class="caret"></b>'))
        .appendTo($div);

    $ull
        .addClass("dropdown-menu")
        .css({textAlign: "left", left: -150})
        .attr("role", "menu")
        .appendTo($div);

    for (var i=0; i<leaflet_layer_control.finish_options.length; i++) {
        var opt = leaflet_layer_control.finish_options[i];
        var $li;

        if (opt=='awaitingreview'){
            $li = $("<li>")
                .appendTo($ull);
            $("<a>")
                .appendTo($li)
                .text("Submit for Review")
                .click(function(){
                    aoi_feature_edit.complete_button_onClick(aoi_feature_edit.awaitingreview_status_url);
                });
        } else if (opt=='unassigned'){
            $li = $("<li>")
                .appendTo($ull);
            $("<a>")
                .appendTo($li)
                .text("Return for further analysis")
                .click(function(){
                    aoi_feature_edit.complete_button_onClick(aoi_feature_edit.unassigned_status_url);
                });
        } else if (opt=='completed'){
            $li = $("<li>")
                .appendTo($ull);
            $("<a>")
                .appendTo($li)
                .text("Certify as complete")
                .click(function(){
                    aoi_feature_edit.complete_button_onClick(aoi_feature_edit.completed_status_url);
                });
        } else {
            //Unrecognized input
        }
    }
    $div.dropdown();

    return $div;
};
aoi_feature_edit.complete_button_onClick = function(url) {
    var data = {"feature_ids":feature_manager.featuresInWorkcellAsIds()};
    $.ajax({
        type: "POST",
        data: data,
        url: url || aoi_feature_edit.awaitingreview_status_url,
        dataType: "json",
        success: function (response) {
            var features_updated = response.features_updated;

            var message = 'Your work has been uploaded. ';
            if (features_updated) message+= features_updated + ' feature statuses updated.';
            message += 'Would you like to:';

            BootstrapDialog.show({
                title: 'Submitted',
                message: message,
                buttons: [{
                    label: 'Go back to the Job page',
                    action: function(dialog) {
                        geoq.redirect(aoi_feature_edit.job_absolute_url);
                    }
                }, {
                    label: 'Work on another Work Cell',
                    action: function(dialog) {
                        geoq.redirect(aoi_feature_edit.next_aoi_url);
                    }
                }]
            });
        },
        error: function (response) {
            log.error(response);
            if (response.status==500){
                geoq.redirect(aoi_feature_edit.job_absolute_url);
            }else {
                $("#finish-button-dropdown")
                    .css({color:'red'})
                    .text("Server Error");
            }
        }
    });
};
