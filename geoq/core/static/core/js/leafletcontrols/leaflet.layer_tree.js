var leaflet_layer_control = {};

//TODO: Make an icon that is expanded to list when clicked (maybe have list on left)
//TODO: Add to Layer module a "show on all map" variable and a "is Base Layer" variable
//TODO: Pull ordering from map object
//TODO: Remove scrolling on list
//TODO: Allow drag-and-drop sorting that controls layer
//TODO: Show layer-relevant icons
//TODO: have an info control that modifies things like opactiy/IA tools/icons
//TODO: Save info about layer configuration, then have a way to load that back in or save as settings for a Job
//TODO: Have a control to add new layers


leaflet_layer_control.layerDataList = function (options) {

    var baseLayers = options.base_layers || [];
    var dataLayers = options.data_layers || [];
    var featuresLayers = options.feature_layers || [];

    var treeData = [
        {title: "Base Maps", folder: true, key: "folder1", children: [] },
        {title: "Data Layers", folder: true, key: "folder2", children: [] },
        {title: "Features", folder: true, key: "folder3", children: []}
    ];

    _.each(dataLayers, function (layer, i) {
        var name = layer.name || layer.options.name;
        var layer_obj = {title: name, key: 'folder1.' + i, data:layer};
        treeData[0].children.push(layer_obj);
    });

    _.each(baseLayers, function (layer, i) {
        var name = layer.name || layer.options.name;
        var layer_obj = {title: name, key: 'folder2.' + i, data:layer};
        treeData[1].children.push(layer_obj);
    });

    _.each(featuresLayers, function (layer, i) {
        var name = layer.name || layer.options.name;
        var layer_obj = {title: name, key: 'folder3.' + i, data:layer};

        if (layer.getLayers && layer.getLayers() && layer.getLayers()[0]) {
            var options = layer.getLayers()[0]._options;
            if (options && options.style) {
                if (options.style.opacity == 1 || options.style.fillOpacity == 1){
                    layer_obj.selected = true;
                }
            }
        }

        treeData[2].children.push(layer_obj);
    });



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
leaflet_layer_control.addLayerControl = function (map, options) {

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

    //Build the layer schema
    var treeData = leaflet_layer_control.layerDataList(options);

    $tree.fancytree({
//        extensions: ["dnd"],
        checkbox: true,
        autoScroll: true,
        selectMode: 2,
        source: treeData,
        activate: function (event, data) {
            //Click on title
            //TODO: Show an info box to control layer settings

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

            function setOpacity(layer,num){
                if (layer.setStyle){
                    layer.setStyle({opacity:num, fillOpacity:num});
                } else  if (layer.setOpacity){
                    layer.setOpacity(num);
                }
            }

            //TODO:
            // Loop through sub-folder objects, too
            // If it's selected but not in list then create as a layer and turn it on

            var all_layers = _.flatten(aoi_feature_edit.layers);
            var all_active_layers = _.filter(all_layers,function(l){return (l._initHooksCalled && l._layers && l._map)});

            _.each(all_active_layers,function(l){
                setOpacity(l,0);
            });


            var selectedLayers = data.tree.getSelectedNodes();
            _.each(selectedLayers,function(layer_obj){
                if (layer_obj && layer_obj.data) {
                    var layer = layer_obj.data;
                    var name = layer.name;
                    if (!name && layer.options) name = layer.options.name;

                    log.info(name, " = ", layer.url);

                    setOpacity(layer,1);
                } else {
                    log.error("A layer with no data was clicked");
                }

            });
        },

        focus: function (event, data) {
        },
        blur: function (event, data) {
        }

//        ,dnd: {
//            preventVoidMoves: true, // Prevent dropping nodes 'before self', etc.
//            preventRecursiveMoves: true, // Prevent dropping nodes on own descendants
//            autoExpandMS: 400,
//            dragStart: function(node, data) {
//              /** This function MUST be defined to enable dragging for the tree.
//               *  Return false to cancel dragging of node.
//               */
//              return true;
//            },
//            dragEnter: function(node, data) {
//              /** data.otherNode may be null for non-fancytree droppables.
//               *  Return false to disallow dropping on node. In this case
//               *  dragOver and dragLeave are not called.
//               *  Return 'over', 'before, or 'after' to force a hitMode.
//               *  Return ['before', 'after'] to restrict available hitModes.
//               *  Any other return value will calc the hitMode from the cursor position.
//               */
//              // Prevent dropping a parent below another parent (only sort
//              // nodes under the same parent)
//              if(node.parent !== data.otherNode.parent){
//                return false;
//              }
//              // Don't allow dropping *over* a node (would create a child)
//              return ["before", "after"];
//            },
//            dragDrop: function(node, data) {
//              /** This function MUST be defined to enable dropping of items on
//               *  the tree.
//               */
//              data.otherNode.moveTo(node, data.hitMode);
//            }
//        }

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
