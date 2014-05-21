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

    var treeData = [];

    //For each layer group
    _.each(options.layers,function(layerGroup,groupNum){
        var layerName = options.titles[groupNum] || "Layers";
        var folderName = "folder."+ groupNum;
        treeData.push({title: layerName, folder: true, key: folderName, children: [] });

        //For each layer
        _.each(layerGroup, function (layer, i) {
            var name = layer.name || layer.options.name;
            var layer_obj = {title: name, key: folderName+"."+i, data:layer};

            //Figure out if it is visible and should be "checked"
            if (layer.getLayers && layer.getLayers() && layer.getLayers()[0]) {
                var layerItem = layer.getLayers()[0];
                var options = layerItem._options || layerItem.options;
                if (options && options.style) {
                    if (options.style.opacity == 1 || options.style.fillOpacity == 1){
                        layer_obj.selected = true;
                    }
                } else if (options && options.opacity && options.opacity == 1) {
                        layer_obj.selected = true;
                }
            } else if (layer.options && layer.options.opacity && layer.options.opacity == 1){
                layer_obj.selected = true;
            }

            treeData[groupNum].children.push(layer_obj);
        });

    });

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

    var zIndexesOfHighest = 2;
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
            log.info("Clicked on a layer", data);
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

            var all_layers = _.flatten(aoi_feature_edit.layers);
            var all_active_layers = _.filter(all_layers,function(l){return (l._initHooksCalled && l._map)});

            _.each(all_active_layers,function(l){
                setOpacity(l,0);
                if (l.getContainer) {
                    var $lc = $(l.getContainer());
                    $lc.zIndex(1);
                    $lc.hide();
                }
            });

            var selectedLayers = data.tree.getSelectedNodes();
            _.each(selectedLayers,function(layer_obj, layerOrder){
                if (layer_obj && layer_obj.data) {
                    var layer = layer_obj.data;

                    if (layer._map && layer._initHooksCalled) {
                        //It's a layer that's been already built
                        setOpacity(layer,1);
                        if (layer.getContainer) {
                            var $lc = $(layer.getContainer());
                            zIndexesOfHighest++;
                            $lc.zIndex(zIndexesOfHighest);
                            $lc.show();
                        }

                    } else {
                        //It's an object with layer info, not yet built
                        var name = layer.name;
                        if (!name && layer.options) name = layer.options.name;
                        log.info(name, " = ", layer.url);

                        //TODO: Move this to generic layer loading script
                        if (layer.type == "WMS"){

                            var newLayer = L.tileLayer.wms(layer.url, {
                                layers: layer.layer,
                                format: layer.format || 'image/png',
                                transparent: layer.transparent,
                                attribution: layer.attribution,
                                name: layer.name,
                                details: layer
                            });
                            aoi_feature_edit.map.addLayer(newLayer);

                            if (newLayer.getContainer) {
                                var $lc = $(newLayer.getContainer());
                                zIndexesOfHighest++;
                                $lc.zIndex(zIndexesOfHighest);
                                $lc.show();
                            }

                            layer_obj.data = newLayer;

                            //Replace the old object list with the new layer
                            _.each(aoi_feature_edit.layers,function(layerGroup,l_i){
                                _.each(layerGroup,function(layerGroupItem,l_l){
                                    if (layerGroupItem.id == layer.id) {
                                        layerGroup[l_l] = newLayer;
                                    }

                                });
                            });
                        }
                    }

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
