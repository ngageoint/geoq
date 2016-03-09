// This technical data was produced for the U. S. Government under Contract No. W15P7T-13-C-F600, and
// is subject to the Rights in Technical Data-Noncommercial Items clause at DFARS 252.227-7013 (FEB 2012)

//requires leaflet_helper.js, underscore, jquery, leaflet, log4javascript

//TODO: Have a view-only mode

// Feature Styles can be:
//            style_obj.color // FillColor
//            style_obj.weight // Border Weight
//            style_obj.mapTextStyle // "red_overlay"
//            style_obj.opacity // Opacity
//            style_obj.iconType // "circle"
//            style_obj.schema (array of {properties:options} and others)

//            feature.properties.mapText = "Whatever"

var aoi_feature_edit = {};
aoi_feature_edit.layers = {features:[], base:[], overlays:[], jobs:[]};

aoi_feature_edit.drawnItems = new L.FeatureGroup();
aoi_feature_edit.options = {};
aoi_feature_edit.all_polygons = [];
aoi_feature_edit.all_markers = [];
aoi_feature_edit.all_geomarkers = [];
aoi_feature_edit.all_polylines = [];
aoi_feature_edit.available_icons = [];
aoi_feature_edit.MapIcon = null;

aoi_feature_edit.findMePoint = null;
aoi_feature_edit.findMeCircle = null;
aoi_feature_edit.showMyLocation = false;

aoi_feature_edit.init = function () {
    aoi_feature_edit.drawcontrol = null;
    aoi_feature_edit.featureLayers = [];
    aoi_feature_edit.icons = {};
    aoi_feature_edit.icon_style = {};
    aoi_feature_edit.featureLayersSelected = [];    
    aoi_feature_edit.deleteBoundLayers = [];    
    aoi_feature_edit.ctlKeyPressed = false;
    aoi_feature_edit.hidden_tools = site_settings.hidden_tools ? site_settings.hidden_tools[aoi_feature_edit.status] : [];

    leaflet_helper.init();

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
        // if this is a point, create default icons for it first (they might be later modified in pointToLayer)
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
            if (ftype.icon) {
                aoi_feature_edit.icon_style[ftype.id].iconUrl = ftype.icon;
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
                var options = {};
                leaflet_layer_control.show_feature_info(e.layer.feature);      
                if (e.originalEvent.ctrlKey || e.originalEvent.shiftKey) {
                    e.layer.closePopup();
                    if (e.layer.feature.geometry.type == "Point") {
                        var icon = e.layer._icon;
                        L.DomUtil.addClass(icon, 'leaflet-edit-marker-selected');                    
                    } else {
                        e.layer.options.previousOptions = e.layer.options;
                        options = { color: '#fe57a1',
                                    opacity: 0.6,
                                    dashArray: '10, 10',
                                    fill: true,
                                    fillColor: '#fe57a1',
                                    fillOpacity: 0.1};
                        e.layer.setStyle(options);    
                    }
                    aoi_feature_edit.featureLayersSelected.push(e.layer);
                } 
            }
        });

        //Build mouseover table of data
        if (ftype.style && ftype.style.showOnMouseOver) {
            var layerPopup;
            featureLayer.on('mouseover', function(e){
                var coordinates = e.layer.feature.geometry.coordinates;
                if (coordinates && coordinates[1] && aoi_feature_edit.map) {
                    var swapped_coordinates = [coordinates[1], coordinates[0]];

                    var popupContent = 'Feature #'+e.layer.feature.properties.id;
                    popupContent = aoi_feature_edit.addFeatureTable(e.layer.feature, ftype) || popupContent;

                    layerPopup = L.popup()
                       .setLatLng(swapped_coordinates)
                       .setContent(popupContent)
                       .openOn(aoi_feature_edit.map);
                }
            });
            featureLayer.on('mouseout', function (e) {
                if (layerPopup && aoi_feature_edit.map && aoi_feature_edit.map.closePopup) {
                    aoi_feature_edit.map.closePopup(layerPopup);
                    layerPopup = null;
                }
            });
        }

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

    //Open Terms of Use prompt if necessary
    $(document).ready(aoi_feature_edit.promptForUserAcceptance);
};

aoi_feature_edit.addFeatureTable = function(feature, ftype){
    var props = feature.properties || {};
    var style = ftype.style || {};
    var html = "";

    html+=leaflet_layer_control.parsers.textIfExists({name: props.mapText || props.name, header:true});

    if (style.showOnMouseOver || style.dataTable) {
        var fields = style.showOnMouseOver || style.dataTable || "";
        fields = fields.split(",");
        _.each(fields,function(field){
            field = _.str.trim(field);
            if (field){
                var val = props[field];
                if (val !== undefined) {
                    field = _.str.capitalize(field);
                    field = field.replace(/_/g," ");
                    html+=leaflet_layer_control.parsers.textIfExists({name: val, title:field});
                }
            }
        });
    }

    return html;
};

aoi_feature_edit.promptForUserAcceptance = function(){
    if (site_settings.user_agreement_text && site_settings.user_agreement_text.text) {
        if (aoi_feature_edit.user_accepted_tems) {
            //log.log("User has previously accepted terms of use");
        } else {

            //Build a dialog to show the user if they haven't seen it yet
            BootstrapDialog.show({
                title: 'Terms of Use',
                message: site_settings.user_agreement_text.text,
                buttons: [{
                    label: 'Accept for only this workcell',
                    action: function(dialog) {
                        dialog.close();
                    }
                }, {
                    label: 'Accept for all future workcells',
                    cssClass: 'btn-primary',
                    action: function(dialog) {
                        $.post(aoi_feature_edit.terms_acceptance_url);
                        dialog.close();
                    }
                },{
                    label: 'Do not accept',
                    cssClass: 'btn-warning',
                    action: function(dialog) {
                        geoq.redirect("/");
                        dialog.close();
                    }

                }]
            });
        }
    }
};
aoi_feature_edit.getMapTextDivSize = function(text){
    var textLen = text.length;
    var mapTextSize = [120, 40];
    if (textLen < 25) {
        mapTextSize = [26 + textLen*7,18];
    } else if (textLen < 50) {
        mapTextSize = [216,35];
    } else if (textLen < 75) {
        mapTextSize = [220,50];
    } else {
        mapTextSize = [240,65];
    }
    return mapTextSize;
};
aoi_feature_edit.buildCustomIcon = function (feature, featureType) {
    feature.properties = feature.properties || {};
    var featureTypeID = parseInt(feature.properties.template);

    if (featureType==undefined) {
        featureType = aoi_feature_edit.feature_types[featureTypeID] || aoi_feature_edit.feature_types_all[featureTypeID] || {};
    }

    var style_obj = featureType.style || {};
    if (featureType.icon) {
        style_obj.iconUrl = featureType.icon;
    }

    if (style_obj) {
        style_obj.iconUrl = style_obj.iconUrl || style_obj.iconURL || style_obj.iconurl ||  aoi_feature_edit.static_root +"/leaflet/images/red-marker-icon.png";
    } else {
        style_obj = {};
        style_obj.iconUrl = aoi_feature_edit.static_root +"/leaflet/images/red-marker-icon.png";
    }

    var icon;

    //The feature has mapText, so draw a rectangle to hold the text
    if (feature.properties.mapText) {
        var text = feature.properties.mapText;
        var mapTextSize = aoi_feature_edit.getMapTextDivSize(text);

        //TODO: Make sure it works with Maki icons
        if (style_obj.iconUrl) {
            text = "<img src='"+style_obj.iconUrl+"' style='height:18px;float:left;'/> "+text;
            //NOTE: These will be recolored later if necessary in featureLayer_pointToLayer
        }
        var className = 'text_marker_background ' + (style_obj.mapTextStyle || 'blue_overlay');
        icon = L.divIcon({
            className: className,
            html: text,
            iconSize: mapTextSize
        });

    } else {
        var iconLoader = aoi_feature_edit.icons[featureTypeID] || aoi_feature_edit.MapIcon;
        icon = new iconLoader(style_obj);
    }
    return icon;
};
aoi_feature_edit.featureLayer_pointToLayer = function (feature, latlng, featureLayer, featureType) {
    if (featureType==undefined) {
        featureType = {};
        if (feature.properties.template) {
            var template_id = parseInt(feature.properties.template);
            featureType = aoi_feature_edit.feature_types[template_id] || aoi_feature_edit.feature_types_all[template_id] || {};
        }
    }
    var style_obj = featureType.style || feature.style || {};
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

    var icon = aoi_feature_edit.buildCustomIcon(feature, featureType);
    var marker;

//  TODO: Verify support for circle markers
    if (style_obj.iconType=='circle') {
        marker = new L.CircleMarker(latlng, {
            radius: style_obj.iconSize || style_obj.iconWidth || style_obj.iconHeight || 9,
            fillColor: style_obj.color,
            color: "#000",
            weight: style_obj.weight || 2,
            opacity: 1,
            fillOpacity: style_obj.opacity || 0.8
        });
    } else {
        marker = new L.Marker(latlng, {
            icon: icon
        });
    }

    if (style_obj.color || style_obj.backgroundColor) {
        marker.on('add',function(evt){
            marker = evt.target;
            var $icon = $(marker._icon);

            if ($icon.is('div')) {
                $icon.css(style_obj);  //Apply any color styles to the div for mapText items

                $icon = $icon.find('img'); //Only apply icon styles to images
            }

            if ($icon.is('img')) {
                aoi_feature_edit.colorIconFromStyle($icon,style_obj);
            }
        });
    }
    return marker;
};
aoi_feature_edit.colorIconFromStyle = function ($icon,style_obj){
    //TODO: Rebuild tancolor API to be more 'flowy'
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

aoi_feature_edit.featureLayer_onEachFeature = function (feature, layer, featureLayer, dontAddDelete) {
    if (feature.properties) {
        var id = feature.properties.id;
        feature_manager.addAtId(id,{layerGroup: featureLayer, layer: layer});

        var popupContent = "<h5>Feature</h5>";
        if (id){
            popupContent = '<h5>Feature #' + id + '</h5>';
        }
        var template;
        if (feature.properties.template) {
            var template_id = parseInt(feature.properties.template);
            template = aoi_feature_edit.feature_types[template_id] || aoi_feature_edit.feature_types_all[template_id] || {};

            if (template.name) popupContent += '<b>' + template.name + '</b><br/>';
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

        if (template) {
            popupContent += aoi_feature_edit.addFeatureTable(feature, template);
        }

        if (id && !dontAddDelete) {
            popupContent += '<br/><a onclick="aoi_feature_edit.deleteFeature(\'' + id + '\', \'' + leaflet_helper.home_url + 'features/delete/' + id + '\');">Delete Feature</a>';
            popupContent += leaflet_helper.addLinksToPopup(featureLayer.name, id, false, false, true);
        }

        layer.bindPopup(popupContent);
        feature.layer = layer;
    }
};
aoi_feature_edit.fulcrumfeatureLayer_onEachFeature = function (feature, layer, featureLayer, dontAddDelete) {
    if (feature.properties) {
        var id = feature.properties.id;
        feature_manager.addAtId(id,{layerGroup: featureLayer, layer: layer});

        var popupContent = "<h5>Fulcrum Feature</h5>";
        if (feature.properties.owner_name){
            popupContent += '<b>Owner: </b>' + feature.properties.owner_name + '<br/>';
        }
        if (feature.properties.occupancy_id) {
            popupContent += '<b>Occupancy: </b>' + feature.properties.occupancy_id + '<br/>';
        }
        if (feature.properties.streethighway) {
            popupContent += '<b>Address: </b><br/>';
            popupContent += '     ' + feature.properties.streethighway + '<br/>';
            popupContent += '     ' + feature.properties.city + ',' + feature.properties.state + '<br/>';
        }
        if (feature.properties.response_district){
            popupContent += '<b>Resp. District: </b> ' + feature.properties.response_district + '<br/>';
        }
        if (feature.properties.station_subdistricts){
            popupContent += '<b>Station Subdist: </b> ' + feature.properties.response_district + '<br/>';
        }
        if (feature.properties.email_address){
            popupContent += '<b>Email: </b> ' + feature.properties.email_address + '<br/>';
        }
        if (feature.properties.total_area_square_feet) {
            popupContent += '<b>Area: </b>' + feature.properties.total_area_square_feet + '<br/>';
        }
        if (feature.properties.specific_property_use) {
            popupContent += '<b>Use: </b>' + feature.properties.specific_property_use + '<br/>';
        }
        if (feature.properties.property_ownership) {
            popupContent += '<b>Owner: </b>' + feature.properties.propery_ownership + '<br/>';
        }
        if (feature.properties.construction_type_check_one_other) {
            popupContent += '<b>Construct Type: </b>' + feature.properties.construction_type_check_one_other + '<br/>';
        }
        if (feature.properties.knox_box_location) {
            popupContent += '<b>Knox Box: </b>' + feature.properties.knox_box_location + '<br/>';
        }
        if (feature.properties.created_at){
            var datetime = feature.properties.created_at;
            datetime = datetime.replace("UTC", "").trim();
            var dtg = moment(datetime);

            if (dtg.isValid()){
                popupContent += '<b>Created:</b> ' + dtg.calendar() + '<br/>';
            }
        }

        layer.bindPopup(popupContent);
        feature.layer = layer;
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
aoi_feature_edit.deleteFeatureWithoutConfirm = function(id, delete_url) {
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
    confirmFunction(true);
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
    "use strict";
    //TODO: Clean this up
    var oversight = aoi_feature_edit.layer_oversight;
    var name = layer.name;
    var pending = oversight.pending;
    var watched = oversight.watched;
    var failing = oversight.failing;
    if(name && watch) {
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
        if(name && watched.indexOf(name) > -1) {
            layer.off("loading");
            layer.off("load");
            layer.off("tileerror");
        }
    }
};

aoi_feature_edit._pendingPoints = {};
aoi_feature_edit.map_init = function (map, bounds) {

    // Events to watch layers being added/loaded/etc.
    map.on("layeradd", function(e) {
        aoi_feature_edit.watch_layer(e.layer, true);
    });
    map.on("layerremove", function(e) {
        aoi_feature_edit.watch_layer(e.layer, false);
    });

    // for some reason nginx isn't keeping MAX_ZOOM defined in settings.py. TODO: Figure out why
    // map.options.maxZoom = 21;

    var custom_map = aoi_feature_edit.aoi_map_json || {};
    aoi_feature_edit.map = map;

    var baseLayers = {};
    var layerSwitcher = {};

    var baseLayerName = (map.options.djoptions.layers[0]) ? map.options.djoptions.layers[0][0] : "Base Layer";
    //var editableLayers = new L.FeatureGroup();
    // Only layer in here should be base OSM layer
    _.each(aoi_feature_edit.map._layers, function (l) {
        baseLayers[baseLayerName] = l;
    });

    aoi_feature_edit.layers.base = [];
    aoi_feature_edit.layers.overlays = [];
    aoi_feature_edit.layers.jobs = [];


    // aoi_feature_edit.map._layers - layers that have been added to the map already
    // map.options.djoptions.layers - layer options that were passed to django
    // Set the name for the base layer and add it to our layer map.
    // TODO: It seems like it's possible to have multiple base maps, but that's not handled here
    var baselayer = _.toArray(aoi_feature_edit.map._layers);
    if (baselayer && baselayer[0]) {
        baselayer[0].name=(map.options.djoptions.layers[0]) ? map.options.djoptions.layers[0][0] : "Base Layer";
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
    };
    (new L.Control.ResetView(locateBounds)).addTo(aoi_feature_edit.map);

    //Zoom to the bounds of the Workcell, then one more level
    aoi_feature_edit.map.fitBounds(aoi_extents.getBounds());
    aoi_feature_edit.map.setZoom(aoi_feature_edit.map.getZoom()+1);

    var layers_to_show = store.get('leaflet_layer_control.layers');
    layers_to_show = layers_to_show ? layers_to_show.split(",") : undefined;

    //Build layers, parse them, and add them to the map and to memory
    if (custom_map.layers) {
        var layers = _.filter(custom_map.layers,function(l){
           return (l.type!="Social Networking Link" && l.type!="Web Data Link")
        });
        _.each(layers, function (layer_data) {
            var built_layer = leaflet_helper.layer_conversion(layer_data, map);
            if (! built_layer) {
                // skip this layer and go to next
                log.error("Tried to add a layer, but didn't work: "+layer_data.url)
                return true;
            }

            var shouldBeShown;
            if (layers_to_show) {
                shouldBeShown = _.indexOf(layers_to_show, built_layer.config.id+"");
                shouldBeShown = shouldBeShown >= 0;
            } else {
                shouldBeShown = built_layer.config.shown;
            }
            built_layer.shown = shouldBeShown;

            if (built_layer !== undefined) {
                if (layer_data.isBaseLayer) {
                    baseLayers[layer_data.name] = built_layer;
                    aoi_feature_edit.layers.base.push(built_layer);
                } else {
                    if (layer_data.job) {
                        layerSwitcher[layer_data.name] = built_layer;
                        aoi_feature_edit.layers.jobs.push(built_layer);
                    } else {
                        layerSwitcher[layer_data.name] = built_layer;
                        aoi_feature_edit.layers.overlays.push(built_layer);
                    }
                }
            } else {
                log.error("Tried to add a layer, but didn't work: "+layer_data.url)
            }
            if (built_layer) {
                // we see errors here on bad layers. try to catch
                try {
                    aoi_feature_edit.watch_layer(built_layer, true);
                    aoi_feature_edit.map.addLayer(built_layer);
                    var shownAmount = shouldBeShown ? built_layer.options.opacity || 0.8 : 0;

                    //TODO: Some layers are showing even when unchecked.  Find out why

                    built_layer.options.toShowOnLoad = shownAmount;
                    built_layer.options.setInitialOpacity = false;

                    // leaflet_layer_control.setLayerOpacity(built_layer, shownAmount, true);
                } catch (e) {
                    log.warn("Error trying to add layer: " + built_layer.name);
                }
            }
        });
    }

    // For each feature template, add features to map and layer control
    _.each(_.sortBy(aoi_feature_edit.feature_types,'order'), function (ftype) {

        if (ftype.type == 'Polygon') {
            aoi_feature_edit.all_polygons.push(aoi_feature_edit.createPolygonOptions(ftype));
        } else if (ftype.type == 'Point') {
            var point = aoi_feature_edit.createPointOptions(ftype);
            if (point) {
                if (ftype && ftype.properties && ftype.properties.type && (ftype.properties.type == 'geomarker')) {
                    aoi_feature_edit.all_geomarkers.push(point);
                } else {
                    aoi_feature_edit.all_markers.push(point);
                }
            }
        } else if (ftype.type == 'LineString') {
            aoi_feature_edit.all_polylines.push(aoi_feature_edit.createPolylineOptions(ftype));
        } else {
            log.error("Item should be drawn, but not a Polygon or Point object.")
        }
        var tnum = ftype.id;
        var featuretype = ftype.type;
        var featureCollection = aoi_feature_edit.createFeatureCollection(tnum);

        //Split all features into the proper feature type layers
        _.each(aoi_feature_edit.job_features_geojson.features, function (feature) {
            if (feature.properties.template == tnum && feature.geometry.type == featuretype) {

                //Add in any default properties from the feature type
                feature.properties = feature.properties || {};
                if (ftype.properties) feature.properties = $.extend({},ftype.properties,feature.properties);

                //Associate this feature with the feature type layer
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
    if ($.inArray("Locator",aoi_feature_edit.hidden_tools) == -1) {
        leaflet_helper.addLocatorControl(map);
    }
    if ($.inArray("Drawing",aoi_feature_edit.hidden_tools) == -1) {
        aoi_feature_edit.buildDrawingControl(aoi_feature_edit.drawnItems);
    }
    if ($.inArray("Geocoder",aoi_feature_edit.hidden_tools) == -1) {
        leaflet_helper.addGeocoderControl(map);
    }
    if ($.inArray("Status",aoi_feature_edit.hidden_tools) == -1) {
        feature_manager.addStatusControl(map);
    }

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

    function draw_and_center_location() {
        map.locate({setView: true, maxZoom: 16});
    }

    help_control.addTo(map, {'position':'topleft'});

    if ($.inArray("Location",aoi_feature_edit.hidden_tools) == -1) {
        var location_control = new L.Control.Button({
            'iconUrl': aoi_feature_edit.static_root + 'images/bullseye.png',
            'onClick': draw_and_center_location,
            'hideText': true,
            'doToggle': false,
            'toggleStatus': false
        });

        location_control.addTo(map, {'position': 'topleft'});
    }

    function pruneTemp(jqXHR) {
        var tmpId = jqXHR.getResponseHeader("Temp-Point-Id");
        var tmpLayer = aoi_feature_edit._pendingPoints[tmpId];
        if(tmpLayer) aoi_feature_edit.map.removeLayer(tmpLayer);
        delete aoi_feature_edit._pendingPoints[tmpId];
    }
    function onSuccess(data, textStatus, jqXHR) {
        pruneTemp(jqXHR);
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
        pruneTemp(jqXHR);
        log.error("Error while adding feature: " + errorThrown);
    }

   aoi_extents.on('click', function (e) {      
        _.each(aoi_feature_edit.deleteBoundLayers, function(layer){
            aoi_feature_edit.map.removeLayer(layer);    
        });
        _.each(aoi_feature_edit.featureLayersSelected, function(layer){
            if (layer.feature.geometry.type == "Point") {
                var icon = layer._icon;
                L.DomUtil.removeClass(icon, 'leaflet-edit-marker-selected');
            }
            else {
                layer.setStyle(layer.options.previousOptions);
                delete layer.options.previousOptions;             
            }
        });
        aoi_feature_edit.featureLayersSelected = [];
        aoi_feature_edit.deleteBoundLayers = [];     
    });
    
    map.on('click', function (e) {      
        _.each(aoi_feature_edit.deleteBoundLayers, function(layer){
            aoi_feature_edit.map.removeLayer(layer);    
        });
        _.each(aoi_feature_edit.featureLayersSelected, function(layer){
            if (layer.feature.geometry.type == "Point") {
                var icon = layer._icon;
                L.DomUtil.removeClass(icon, 'leaflet-edit-marker-selected');
            }
            else {
                layer.setStyle(layer.options.previousOptions);
                delete layer.options.previousOptions;             
            }
        });
        aoi_feature_edit.featureLayersSelected = [];
        aoi_feature_edit.deleteBoundLayers = [];     
    });

    map.on('draw:created', function (e) {
        var type = e.layerType;
        var layer = e.layer;

        var geojson = e.layer.toGeoJSON();
        var headers = {};
        geojson.properties.template = aoi_feature_edit.current_feature_type_id || 1;
        if(geojson.geometry.type === "Point") {
            var icon = null;
            var tmpId = Math.uuidCompact();
            headers = { "Temp-Point-Id": tmpId};
            if(aoi_feature_edit.feature_types[geojson.properties.template]) {
                var ft = aoi_feature_edit.feature_types[geojson.properties.template];
                var style = ft.style;
                if(!$.isEmptyObject(style)) icon = new aoi_feature_edit.MapIcon(style);
            }
            var layer = L.marker([geojson.geometry.coordinates[1], geojson.geometry.coordinates[0]], {
                icon: icon, opacity: .5});

            aoi_feature_edit._pendingPoints[tmpId] = layer;
            aoi_feature_edit.map.addLayer(layer);
        } 
        
        if (type == "rectangle") {
            aoi_feature_edit.map.addLayer(layer);
            aoi_feature_edit.deleteBoundLayers.push(layer);

            var bound = layer.toGeoJSON().geometry.coordinates[0];
            var allLayers = aoi_feature_edit.drawnItems.getLayers();
            _.each(allLayers, function(featureLayer){
                var featureCoordinates = null;
                if (featureLayer.toGeoJSON().geometry.type == "Point") {
                    featureCoordinates = featureLayer.toGeoJSON().geometry.coordinates;
                                if (featureCoordinates[0] >= bound[0][0] && featureCoordinates[0] <= bound[2][0] && featureCoordinates[1] >= bound[0][1] && featureCoordinates[1] <= bound[2][1]) {
                                    aoi_feature_edit.featureLayersSelected.push(featureLayer);
                                    var icon = featureLayer._icon;
                                    L.DomUtil.addClass(icon, 'leaflet-edit-marker-selected');
                                } 
                } else {
                    var selected = true;
                    if (featureLayer.toGeoJSON().geometry.type == "Polygon") {
                        featureCoordinates = featureLayer.toGeoJSON().geometry.coordinates[0];
                       
                        _.each(featureCoordinates, function(point){
                            if (!(point[0] >= bound[0][0] && point[0] <= bound[2][0] && point[1] >= bound[0][1] && point[1] <= bound[2][1])) {
                                selected = false;
                            }
                        });
                    } else if (featureLayer.toGeoJSON().geometry.type == "LineString") {
                        featureCoordinates = featureLayer.toGeoJSON().geometry.coordinates;
                        _.each(featureCoordinates, function(point){
                            if (!(point[0] >= bound[0][0] && point[0] <= bound[2][0] && point[1] >= bound[0][1] && point[1] <= bound[2][1])) {
                                selected = false;
                            }
                        });
                    }
                
                                
                    if (selected) {
                        aoi_feature_edit.featureLayersSelected.push(featureLayer);
                        featureLayer.options.previousOptions = featureLayer.options;
                        var options = { color: '#fe57a1',
                        opacity: 0.6,
                        dashArray: '10, 10',
                        fill: true,
                        fillColor: '#fe57a1',
                        fillOpacity: 0.1};
                        featureLayer.setStyle(options);
                    }                      
                }
            });
            
        } else {
            geojson = JSON.stringify(geojson);
            var data = { aoi: aoi_feature_edit.aoi_id, geometry: geojson }
            $.ajax({
                type: "POST",
                url: aoi_feature_edit.create_feature_url,
                data: data,
                success: onSuccess,
                error: onError,
                dataType: "json",
                headers: headers
            });
        
        }
            
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
            // delete the pointer to layer within geojson so that we can stringify
            if (geojson.layer) {
                delete geojson.layer;
            }

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

                        var editableUrl = leaflet_helper.home_url + 'api/feature/update/'+feature_id;
                        $.ajax({
                            type: "POST",
                            url: editableUrl,
                            data: {
                                id: 'add_link',
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
                            error: function(){
                                log.error("Error in linking image");
                            },
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

    map.on('locationfound', function(e) {
        aoi_feature_edit.showMyLocation = !aoi_feature_edit.showMyLocation;

        if (aoi_feature_edit.showMyLocation) {
            var radius = e.accuracy / 2;

            aoi_feature_edit.findMePoint = L.marker(e.latlng, {icon: new L.Icon({iconUrl: aoi_feature_edit.static_root + 'images/dot.png'})}).addTo(map)
                .bindPopup("Accuracy: " + radius + " meters");

            aoi_feature_edit.findMeCircle = L.circle(e.latlng, radius).addTo(map);
        } else {
            map.removeLayer(aoi_feature_edit.findMePoint);
            map.removeLayer(aoi_feature_edit.findMeCircle);
        }

    });

    map.on('locationerror', function(e) {
        alert('Sorry, but we are not able to determine your location');
    });

    map.on('layeradd', function(e) {
        var layer = e.layer;
        if (layer.options && layer.options.opacity >= 0) {
            leaflet_layer_control.setLayerOpacity(layer, layer.options.opacity);
        }
    });

    $('div.leaflet-draw.leaflet-control').find('a').popover({trigger:"hover",placement:"right"});

    footprints.init({
	    url_template: 'http://dev.femadata.com/arcgis/rest/services/ImageEvents/ImageEvents/MapServer/{{layer}}/query?geometry={{bounds}}&geometryType=esriGeometryEnvelope&spatialRel=esriSpatialRelIntersects&outFields=*&outSR=4326&f=json',
		layerList: [1,2,3,4,5,6,7,8,9],
		/*promptFields: [
			       {name: 'mission', title: 'Mission ID#', popover: 'Comma-separated list of missions to search for', default: '75, 76', type: 'integer', format:'where', compare:'='}
			       ],
		*/
		title: 'CAP Image',
		markerColorMax: '#ffdf00',
		markerColorMin: '#332200',
		schema: [
			 {name: 'Id', id: true, visualize: 'none'},
			 {name: 'layerId', title:'Image Type', color_by_layerid:true, filter:'options', show: 'small-table'},
			 {name: 'EXIFCameraMaker', title: 'Camera Type', filter: 'options'},
			 {name: 'ImageMissionName', title: 'Mission Name', filter: 'options', show: 'small-table', showSizeMultiplier: 2},
			 {name: 'Altitude', title: 'Alt', type: 'integer', filter: 'slider-max', min: 0, max: 10000, start: 2000, show: 'small-table', sizeMarker: true},
			 {name: 'Heading', title: 'Dir', type: 'integer', show: 'small-table'},
			 {name: 'UploadDate', title: 'Date', type: 'date', filter: 'date-range', initialDateRange: 100, colorMarker: true},
			 {name: 'ThumbnailURL', title: 'Thumbnail', visualize: 'thumbnail', linkField: 'ImageURL'},
			 {name: 'Filename', title: 'File Name', filter: 'textbox', visualize: 'none', onNotFound: function (name) {
				 console.log("TODO: Load If not found: " + name)
				     }}
			 ],
		featureSelectFunction: null
                });


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
            marker.icon.options.text = marker.title;
        } else {
            marker.icon = marker.icon || {};
            marker.icon.options = marker.title.options || {};
            marker.icon.options.text = marker.title || "Marker";
        }


    });

    _.each(aoi_feature_edit.all_geomarkers, function(marker){
        if (marker.title && marker.icon && marker.icon.options) {
            marker.icon.options.text = marker.title;
        } else {
            marker.icon = marker.icon || {};
            marker.icon.options = marker.title.options || {};
            marker.icon.options.text = marker.title || "Marker";
        }
    });

    L.drawLocal.draw.toolbar.actions.text = "Finish";
    L.drawLocal.draw.toolbar.actions.title = "Finish Drawing Features";

    var drawControl = new L.Control.Draw({
        position: "topleft",

        draw: {
            circle: false,
            rectangle: false,
            markers: aoi_feature_edit.all_markers,
            geomarkers: aoi_feature_edit.all_geomarkers,
            polygons: aoi_feature_edit.all_polygons,
            polylines: aoi_feature_edit.all_polylines

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
        if ($icon && ftype && ftype.style) {
            var bg_color = ftype.style.color;
            var bg_image = ftype.icon || ftype.style.iconUrl || ftype.style.icon;

            if (ftype.style.type=="maki"){
                $icon
                    .addClass('maki-icon '+ftype.style.icon)
                    .css('backgroundImage', "url("+aoi_feature_edit.static_root +"/images/maki/images/maki-sprite.png)");
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

    if ($.inArray("Title",aoi_feature_edit.hidden_tools) == -1) {
        var titleInfoButton = new L.Control.Button(titleInfoOptions).addTo(map);
    }


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

    options.titles.push('Tasks/Jobs in this Project');
    options.layers.push(aoi_feature_edit.layers.jobs);

    options.titles.push('Features');
    options.layers.push(aoi_feature_edit.layers.features);

    options.titles.push('Data Feeds');
    options.layers.push(aoi_feature_edit.layers.overlays);

    options.titles.push('Social Networking Feeds');
    options.layers.push(aoi_feature_edit.layersOfType("Social Networking Link",'social'));

    options.titles.push('GeoJump Data Lookups');
    options.layers.push(aoi_feature_edit.layersOfType("Web Data Link",'weblinks'));


    options = removeEmptyParents(options);
    return options;
};

aoi_feature_edit.layersOfType = function(layerType,layers_sub_name){
    var layers = [];
    layerType = layerType || "Social Networking Link";
    layers_sub_name = layers_sub_name || 'social';
    try {
        var all_layers = JSON.parse(aoi_feature_edit.aoi_map_json.all_layers);
        var social_layers = _.filter(all_layers, function(l){
            return (l.type == layerType);
        });
        aoi_feature_edit.layers[layers_sub_name] = social_layers;
        _.each(social_layers,function(l){
            var l_all = _.clone(l);
            l_all.name = l.name + " - All";
            layers.push(l_all);
        });

    } catch (ex) {
        log.error("aoi_map_json.all_layers isn't being parsed as valid JSON.");
    }
    return layers;
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

    //TODO: Show mapText if it exists, maybe add a DivIcon?

    return options;
};

aoi_feature_edit.createPolylineOptions = function (opts) {
    var options = {};

    if (opts.name) {
        options.title = opts.name;
    }

    options.allowIntersection = true;
    options.shapeOptions = opts.style || {borderColor: "black"};
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
            style_obj.iconUrl = aoi_feature_edit.static_root +"/leaflet/images/red-marker-icon.png";
        }
        options.icon = new icon_obj(style_obj);
    }
    if (!options.icon){
        style_obj = {
          "iconSize":15,
          "iconUrl":"/static/images/markers/44circle_red_house.png"
        };
        options.icon = new icon_obj(style_obj);
    }

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

aoi_feature_edit.addSelectControl = function (map) {
    var selectControl = new L.Control.Draw({
        position: "topleft",

        draw: {
            circle: false,
            rectangle: {
                shapeOptions: {
                    color: '#808080'
                }
            },

            markers: false,
            geomarkers: false,
            polygons: false,
            polylines: false
        },
        edit: false
    });

    //Create the selecting objects control
    map.addControl(selectControl);
    
    var icons = $('div.leaflet-draw.leaflet-control').find('a');
     _.each (icons,function(icon_obj){
            var $icon_obj = $(icon_obj);
            var icon_title = $icon_obj.attr('title') || $icon_obj.attr('data-original-title');
            if (icon_title == "Draw a rectangle") {
                $icon_obj.attr("title", "Select features");
            }
        });
};

aoi_feature_edit.addDeleteControl = function (map) {
    function deleteMultipleFeatures(){      
        var confirmText = 'Delete feature(s) selected?';
        var confirmFunction = function(result){
            if (result) {     
                if (aoi_feature_edit.deleteBoundLayers.length>0) {
                     
                    _.each(aoi_feature_edit.deleteBoundLayers, function(boundLayer){
                        aoi_feature_edit.map.removeLayer(boundLayer);
                    });
                }
                
                _.each(aoi_feature_edit.featureLayersSelected,function(layer){              
                    var id = layer.feature.properties.id;
                    var deleteURL = leaflet_helper.home_url + 'features/delete/' + id ;
                    aoi_feature_edit.deleteFeatureWithoutConfirm(id , deleteURL);
                });
                
                aoi_feature_edit.featureLayersSelected = [];
                aoi_feature_edit.deleteBoundLayers = [];
            }
        }
        if (aoi_feature_edit.featureLayersSelected.length >0) {
            BootstrapDialog.confirm(confirmText, confirmFunction);
        } else {
            BootstrapDialog.alert("No feature is selected");    
        }
        
    }   
    
    var delete_control = new L.Control.Button({
        'iconUrl': aoi_feature_edit.static_root + 'images/trash_can.png',
        'onClick': deleteMultipleFeatures,
        'position': 'topleft',
        'hideText': true,
        'doToggle': false,
        'toggleStatus': false
    });
    
    delete_control.addTo(map); 
};