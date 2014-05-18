// This technical data was produced for the U. S. Government under Contract No. W15P7T-13-C-F600, and
// is subject to the Rights in Technical Data-Noncommercial Items clause at DFARS 252.227-7013 (FEB 2012)

//requires leaflet_helper.js, underscore, jquery, leaflet, log4javascript

var aoi_feature_edit = {};
aoi_feature_edit.layers = {};

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
            style: function (ftype) {
                var feature_type = aoi_feature_edit.feature_types[ftype.properties.template];
                if (feature_type && feature_type.hasOwnProperty("style")) {
                    return feature_type.style;
                }
            },
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

    var layercontrol = L.control.layers(baseLayers, layerSwitcher).addTo(aoi_feature_edit.map);


    aoi_feature_edit.addMapControlButtons(aoi_feature_edit.map);


    var aoi_extents = L.geoJson(aoi_feature_edit.aoi_extents_geojson,
        {
            style: leaflet_helper.styles.extentStyle,
            zIndex: 1000
        });
    aoi_extents.addTo(aoi_feature_edit.map);

    aoi_feature_edit.layers.extent = aoi_extents;

    //Build a reset button that zooms to the extents of the AOI
    function locateBounds() {
        return aoi_extents.getBounds();
    }

    (new L.Control.ResetView(locateBounds)).addTo(aoi_feature_edit.map);

    // for each feature template, add features to map and layer control
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
        } else {
            log.error("A FeatureLayer was supposed to be drawn, but didn't seem to exist.")
        }

    });

    aoi_feature_edit.layers.features = aoi_feature_edit.featureLayers;

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

    function onSuccess(data, textStatus, jqXHR) {
        if (data[0] && data[0].geojson) {
            var tnum = data[0].fields.template;
            var featureCollection = aoi_feature_edit.createFeatureCollection(tnum);
            featureCollection.features.push($.parseJSON(data[0].geojson));
            aoi_feature_edit.featureLayers[tnum].addData(featureCollection);
        }
    }

    function onError(jqXHR, textStatus, errorThrown) {
        alert("Error while adding feature: " + errorThrown);
    }

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
            success: onSuccess,
            error: onError,
            dataType: "json"
        });

        //layer.bindPopup('Feature Created!');
        //drawnItems.addLayer(layer);
    });

    map.on('draw:drawstart', function (e) {
        var id = e.layerType.slice(-1);
        aoi_feature_edit.current_feature_type_id = parseInt(id);
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


//    var featuresButtonOptions = {
//      'html': '<select id="features"></select>',  // string
//      'hideText': false,  // bool
//      'maxWidth': 60,  // number
//      'doToggle': false,  // bool
//      'toggleStatus': false  // bool
//    }
//    var featuresButton = new L.Control.Button(featuresButtonOptions).addTo(map);


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


    aoi_feature_edit.addLayerControl(map);

    //TODO: Fix to make controls positioning more robust (and force to move to top when created)
    // Quick work-around for moving header to top of the page
    var $controls = $(".leaflet-control-button.leaflet-control");
    var $c = $($controls[0]);
    $c.prependTo($c.parent());

};


aoi_feature_edit.layerDataList = function () {

    var treeData = [
        {title: "Base Maps", folder: true, key: "folder1", children: [] },
        {title: "Data Layers", selected: true, folder: true, key: "folder2", children: [] },
        {title: "Features", folder: true, key: "folder3", children: []}
    ];

    //TODO: This is only half implemented to show all layers, finish it
    _.each(aoi_feature_edit.layers.base, function (layer, i) {
        var layer_obj = {title: layer.name, key: 'folder2.' + i};
        treeData[1].children.push(layer_obj);
    });

    try{
        var all_layers = JSON.parse(aoi_feature_edit.aoi_map_json.all_layers);
        _.each(all_layers, function (layer, i) {
            if (layer.type == "WMS" || layer.type == "WMTS") {
                var layer_obj = {title: layer.name, key: 'folder1.' + i, data:layer};
                treeData[0].children.push(layer_obj);
            }
        });
    } catch (ex) {
        log.error("All Layers isn't being parsed as valid JSON")
    }

// Format:
//          children: [
//            {title: "Sub-item 3.1",
//              children: [
//                {title: "Sub-item 3.1.1", key: "id3.1.1" },
//                {title: "Sub-item 3.1.2", key: "id3.1.2" }
//              ]
//            },
//            {title: "Sub-item 3.2",
//              children: [
//                {title: "Sub-item 3.2.1", key: "id3.2.1" },
//                {title: "Sub-item 3.2.2", key: "id3.2.2" }
//              ]
//            }
//          ]
//        }
//    ];
    return treeData;

};
aoi_feature_edit.addLayerControl = function (map) {

    //Hide the existing layer control
    $('.leaflet-control-layers.leaflet-control').css({display: 'none'});

    //Build the tree
    var $tree = $("<div>")
        .attr({name: 'layers_tree_control'});

    var layersOptions = {
        html: $tree,  // string
        position: 'bottomright'
    };
    var layersButton = new L.Control.Button(layersOptions).addTo(map);


    var treeData = aoi_feature_edit.layerDataList();

    $tree.fancytree({
        extensions: ["dnd"],
        checkbox: true,
        autoScroll: true,
        selectMode: 2,
        source: treeData,
        activate: function (event, data) {
            //Click on title
            var node = data.node;
            log.info("Click on ", data);
            if (!$.isEmptyObject(node.data)) {
                log.info("custom node data: " + JSON.stringify(node.data));
            }
        },
        deactivate: function (event, data) {
        },
        select: function (event, data) {
            // Display list of selected nodes
            var selectedLayers = data.tree.getSelectedNodes();
            _.each(selectedLayers,function(layer){
                if (layer && layer.data) {
                    log.info(layer.data.url);

                }
            });
        },

        focus: function (event, data) {
        },
        blur: function (event, data) {
        },

        dnd: {
            preventVoidMoves: true, // Prevent dropping nodes 'before self', etc.
            preventRecursiveMoves: true, // Prevent dropping nodes on own descendants
            autoExpandMS: 400,
            dragStart: function(node, data) {
              /** This function MUST be defined to enable dragging for the tree.
               *  Return false to cancel dragging of node.
               */
              return true;
            },
            dragEnter: function(node, data) {
              /** data.otherNode may be null for non-fancytree droppables.
               *  Return false to disallow dropping on node. In this case
               *  dragOver and dragLeave are not called.
               *  Return 'over', 'before, or 'after' to force a hitMode.
               *  Return ['before', 'after'] to restrict available hitModes.
               *  Any other return value will calc the hitMode from the cursor position.
               */
              // Prevent dropping a parent below another parent (only sort
              // nodes under the same parent)
              if(node.parent !== data.otherNode.parent){
                return false;
              }
              // Don't allow dropping *over* a node (would create a child)
              return ["before", "after"];
            },
            dragDrop: function(node, data) {
              /** This function MUST be defined to enable dropping of items on
               *  the tree.
               */
              data.otherNode.moveTo(node, data.hitMode);
            }
          }

    });

//      var rootNode = $tree.fancytree("getRootNode");
//      var childNode = rootNode.addChildren({
//        title: "Programatically addded nodes",
//        tooltip: "This folder and all child nodes were added programmatically.",
//        folder: true
//      });
//      childNode.addChildren({
//        title: "Document using a custom icon",
//        icon: "customdoc1.gif"
//      });


};


// Changes current features to match the selected style.
//aoi_feature_edit.updateDrawOptions = function (i) {
//    aoi_feature_edit.drawcontrol.setDrawingOptions({ polygon: { shapeOptions: aoi_feature_edit.feature_types[i].style },
//        rectangle: { shapeOptions: aoi_feature_edit.feature_types[i].style}
//    });
//    aoi_feature_edit.buildDrawingControl(i);
//};

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
