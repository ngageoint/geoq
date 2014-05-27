var leaflet_layer_control = {};

//TODO: Add to Layer module a "show on all map" variable and a "is Base Layer" variable
//TODO: Pull ordering from map object
//TODO: Allow drag-and-drop sorting that controls layer
//TODO: Show layer-relevant icons
//TODO: have an info control that modifies things like IA tools/icons
//TODO: Save info about layer configuration, then have a way to load that back in or save as settings for a Job
//TODO: Have a control to add new layers
//TODO: Layer drawer have a button to create a layer
//TODO: Be able to drag and drop layers onto the page
//TODO: Integrate with GeoNode to auto-build layers in GeoServer
//TODO: When adding ?request=GetCapabilities links to layers, do it smartly

leaflet_layer_control.$map = undefined;
leaflet_layer_control.$drawer = undefined;
leaflet_layer_control.$drawer_tray = undefined;

leaflet_layer_control.init = function(){
    leaflet_layer_control.$map = $("#map");
    leaflet_layer_control.initDrawer();
};
leaflet_layer_control.initDrawer = function(){
    //Build the drawer and add it after the map
    var $drawer = $("<div>")
        .attr({id:"layer_info_drawer"});
    leaflet_layer_control.$drawer = $drawer;
    leaflet_layer_control.$map.after($drawer);


    $('<a id="add_layer_button" href="/maps/layers/create" target="_new" class="btn">Add A Layer</a>')
        .appendTo($drawer);

    var $drawer_inner = $("<div>")
        .addClass("inner-padding")
        .appendTo($drawer);
    var $drawer_tray = $("<div>")
        .attr({id:"drawer_tray"})
        .appendTo($drawer_inner);

    leaflet_layer_control.$drawer_tray = $drawer_tray;
    $drawer_tray.html("Click a layer above to see more information.")

};

leaflet_layer_control.show_info = function (objToShow, node) {
    var html = "";
    var $html; //TODO: This is kinda wonky, should always return jquery objects not strings of html

    if (typeof objToShow == "string"){
        html = objToShow;
    } else {
        if (objToShow.options && objToShow._leaflet_id) {
            //Probably a Leaflet layer
            html = leaflet_layer_control.parsers.infoFromLayer(objToShow);
            $html = leaflet_layer_control.parsers.opacityControls(objToShow);
        } else if (objToShow.name && objToShow.url && objToShow.type) {
            //Probably a map info object
            html = leaflet_layer_control.parsers.infoFromInfoObj(objToShow);
        } else {

            if (typeof objToShow == "object"){
                var obj_size = _.toArray(objToShow).length;
                if (obj_size > 1) {
                    //Show all items from the object
                    html = leaflet_layer_control.parsers.infoFromObject(objToShow);
                } else {
                    //Likely a title/folder of the tree
                    html = leaflet_layer_control.parsers.infoFromFolder(node);
                }
            }
        }
    }
    leaflet_layer_control.$drawer_tray.html(html);
    if ($html){
        leaflet_layer_control.$drawer_tray.append($html);
    }
};
//=========================================

leaflet_layer_control.parsers = {};
leaflet_layer_control.parsers.infoFromLayer = function (obj){
    var html = "";
    obj = obj || {};

    html+=leaflet_layer_control.parsers.textIfExists({name: obj.name, title:"Layer", header:true});
    html+=leaflet_layer_control.parsers.textIfExists({name: obj._url, title:"URL", linkify:true, linkSuffix:"?request=GetCapabilities", style_class:'scroll-link'});

    if (obj._layers) {
        var count = _.toArray(obj._layers).length;
        html+=leaflet_layer_control.parsers.textIfExists({name: count, title:"Feature Count"});
        //TODO: Some way to highlight these or show more info?
    }
    if (obj.options) {
        html+=leaflet_layer_control.parsers.textIfExists({name: obj.options.attribution});
        html+=leaflet_layer_control.parsers.textIfExists({name: obj.options.layers, title:"Layers"});
    }

    return html;
};
leaflet_layer_control.parsers.infoFromInfoObj = function (obj){
    var html = "";
    obj = obj || {};

    html+=leaflet_layer_control.parsers.textIfExists({name: obj.name, title:"Layer", header:true});
    html+=leaflet_layer_control.parsers.textIfExists({name: obj.type, title:"Type"});
    html+=leaflet_layer_control.parsers.textIfExists({name: obj.url, title:"URL", linkify:true, linkSuffix:"?request=GetCapabilities", style_class:'scroll-link'});
    html+=leaflet_layer_control.parsers.textIfExists({name: obj.layer, title:"Layers"});
    html+=leaflet_layer_control.parsers.textIfExists({name: obj.description, style_class:'scroll-link'});
    return html;
};
leaflet_layer_control.parsers.infoFromObject = function (obj){
    var html = "";
    for(var k in obj) {
        html+=leaflet_layer_control.parsers.textIfExists({name: obj[k], title:k});
    }
    return html;
};
leaflet_layer_control.parsers.infoFromFolder = function (obj){
    var html = "";
    obj = obj || {};
    html+=leaflet_layer_control.parsers.textIfExists({name: obj.title, title:"Group", header:true});
    if (obj.children) {
        var children = _.pluck(obj.children,'title').join(", ");
        html+=leaflet_layer_control.parsers.textIfExists({name: children, title:"Sub-layers"});
    }
    html+=leaflet_layer_control.parsers.textIfExists({name: obj.selected, title:"Selected"});

    return html;
};
leaflet_layer_control.parsers.textIfExists = function(options) {
    options = options || {};
    var obj = options.name;
    var title = options.title;
    var noBold = options.noBold;
    var noBreak = options.noBreak;
    var header = options.header;
    if (header) noBreak = true;
    var linkify = options.linkify;
    var linkSuffix = options.linkSuffix;
    var style = options.style;
    var style_class = options.style_class;

    var html = "";
    if (typeof obj != "undefined" && obj !== "") {
        if (header) {
            html+="<h5>";
        }
        if (title){
            if (noBold){
                html+= title +": ";
            } else {
                html+= "<b>"+title+":</b> ";
            }
        }
        if (obj.toString) {
            var text = obj.toString();
            if (linkify) {
                html += "<a target='_new' href='"+text;
                if (linkSuffix){
                    html += linkSuffix;
                }
                html += "'>" + text + "</a>";
            } else {
                html += text;
            }
        } else {
            log.error("Something was sent to a layer info area that wasn't valid text");
            html += obj; //TODO: Think through this... .toString should always be true
        }
        if (header) {
            html+="</h5>";
        }
        if ((style || style_class) && html){
            var style_input = "";
            if (style) {
                style = style.replace(/'/g, '"');
                style_input += " style='"+style+"'";
            }
            if (style_class) {
                style_input += " class='"+style_class+"'";
            }
            html = "<span "+style_input+">"+html+"</span>";
        }
        if (!noBreak && html){
            html += "<br/>";
        }
    }

    return html;
};

leaflet_layer_control.parsers.opacityControls = function(layer) {
    if (!layer || !layer.options || typeof layer.options.opacity=="undefined") {
        return undefined;
    }
    var opacity = Math.round(layer.options.opacity * 100)+"%";
    var $opacity = $('<div>');
    var $opacity_title = $("<span>")
        .html("Opacity: <b>"+opacity+"</b> (")
        .appendTo($opacity);
    _.each([100,75,50,25,0],function(num){
        $("<span>")
            .text(num+"% ")
            .css({color:'#39c',cursor:'pointer'})
            .bind('click mouseup',function(){
                leaflet_layer_control.setLayerOpacity(layer,num/100);
                $opacity_title
                    .html("Opacity: <b>"+(num)+"%</b> (");
            })
            .appendTo($opacity);
    });
    $("<span>")
        .html(")")
        .appendTo($opacity);
    return $opacity;
};

//=========================================
leaflet_layer_control.layerDataList = function (options) {

    var treeData = [];

    var layerGroups = options.layers;

    //For each layer group
    _.each(layerGroups,function(layerGroup,groupNum){
        var layerName = options.titles[groupNum] || "Layers";
        var folderName = "folder."+ groupNum;
        treeData.push({title: layerName, folder: true, key: folderName, children: [], expanded:true });

        //For each layer
        _.each(layerGroup, function (layer, i) {
            var name = layer.name || layer.options.name;
            var layer_obj = {title: name, key: folderName+"."+i, data:layer};

            if (!layer.skipThis) {
                //If there are any later layers with same name/settings, mark them to skip
                leaflet_layer_control.removeDuplicateLayers(layerGroups,layer);

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
                } else if (layer.options && layer.options.opacity){
                    layer_obj.selected = true;
                }

                //Add this to the json to build the treeview
                treeData[groupNum].children.push(layer_obj);
            }
        },layerGroups);

    },layerGroups);
    return treeData;
};
leaflet_layer_control.removeDuplicateLayers = function(layerList, layer){
    var layerSearchStart = false;

    _.each(layerList,function(layerGroup){
        _.each(layerGroup, function (layer_orig, layer_num) {
            if (layerSearchStart) {
                //It's been found previously, so only look at next layers
                var layerLookingAt = layerGroup[layer_num];
                //Check if names exist and are the same
                if (layer.name && layerLookingAt.name) {
                    if (layer.name == layerLookingAt.name) {
                        layerLookingAt.skipThis = true;
                    }
                //Check if the URL and Layer exist and are the same
                } else if (layer.url && layerLookingAt.url && layer.layer && layerLookingAt.layer) {
                    if ((layer.url == layerLookingAt.url) && (layer.layer == layerLookingAt.layer)) {
                        layerLookingAt.skipThis = true;
                    }
                }

            } else {
                if (layer_orig == layer) layerSearchStart = true;
            }
        });
    });

};


leaflet_layer_control.zIndexesOfHighest = 2;
leaflet_layer_control.setLayerOpacity = function (layer, amount){

    if (layer.setStyle){
        layer.setStyle({opacity:amount, fillOpacity:amount});
    } else if (layer.setOpacity){
        layer.setOpacity(amount);
    }

    if (amount==0){
        if (layer._layers) {
            _.each(layer._layers,function(f){
                $(f._icon).hide();
                if (f._shadow){
                    $(f._shadow).hide();
                }
            });

        }

        if (layer.getContainer) {
            var $lc = $(layer.getContainer());
            $lc.zIndex(1);
            $lc.hide();
        }
    } else {
        if (layer._layers) {
            _.each(layer._layers,function(f){
                $(f._icon).show().css({opacity:amount});
                if (f._shadow){
                    $(f._shadow).show().css({opacity:amount});
                }

            });
        }

        if (layer.getContainer) {
            var $lc = $(layer.getContainer());
            leaflet_layer_control.zIndexesOfHighest++;
            $lc.zIndex(leaflet_layer_control.zIndexesOfHighest);
            $lc.show();
        }
    }
};
leaflet_layer_control.addLayerControl = function (map, options) {

    //Hide the existing layer control
    $('.leaflet-control-layers.leaflet-control').css({display: 'none'});


    var $layerButton = $('<a id="toggle-drawer" href="#" class="btn">Layers</a>');
    var layerButtonOptions = {
        'html': $layerButton,
        'onClick': leaflet_layer_control.toggleDrawer,  // callback function
        'hideText': false,  // bool
        position: 'bottomright',
        'maxWidth': 60,  // number
        'doToggle': true,  // bool
        'toggleStatus': false  // bool
    };
    var layerButton = new L.Control.Button(layerButtonOptions).addTo(map);



    //Build the tree
    var $tree = $("<div>")
        .attr({name: 'layers_tree_control', id:'layers_tree_control'});

    //Build the layer schema
    var treeData = leaflet_layer_control.layerDataList(options);

    $tree.fancytree({
//        extensions: ["dnd"],
        checkbox: true,
        autoScroll: true,
        selectMode: 2,
        source: treeData,
        activate: function (event, data) {
            //Clicked on a treenode title
            var node = data.node;
            if (node && node.data) {
                leaflet_layer_control.show_info(node.data, node);
            }
        },
        deactivate: function (event, data) {
        },
        select: function (event, data) {
            // A checkbox has been checked or unchecked

            //TODO: Loop through sub-folder objects, too

            var all_layers = _.flatten(aoi_feature_edit.layers);
            var all_active_layers = _.filter(all_layers,function(l){return (l._initHooksCalled && l._map)});

            _.each(all_active_layers,function(l){
                leaflet_layer_control.setLayerOpacity(l,0);
            });

            var selectedLayers = data.tree.getSelectedNodes();
            _.each(selectedLayers,function(layer_obj, layerOrder){
                if (layer_obj && layer_obj.data) {
                    var layer = layer_obj.data;

                    if (layer._map && layer._initHooksCalled) {
                        //It's a layer that's been already built
                        leaflet_layer_control.setLayerOpacity(layer,1);
                    } else {
                        //It's an object with layer info, not yet built
                        var name = layer.name;
                        if (!name && layer.options) name = layer.options.name;
                        log.info("Creating a map layer", name, " URL: ", layer.url);

                        var newLayer = leaflet_helper.layer_conversion(layer);
                        if (newLayer) {
                            aoi_feature_edit.map.addLayer(newLayer);
                            leaflet_layer_control.setLayerOpacity(newLayer,1);
                            //TODO: Rethink if this should become a sub-item of the object
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
//    leaflet_layer_control.toggleZooming($tree);

    var $drawer = $("#layer_info_drawer");
    $tree.appendTo($drawer);

};
leaflet_layer_control.toggleZooming=function($control){
    $control.on('mouseover',function(){
        var map=aoi_feature_edit.map;
        map.dragging.disable();
        map.touchZoom.disable();
        map.doubleClickZoom.disable();
        map.scrollWheelZoom.disable();
        if (map.tap) map.tap.disable();}
    ).on('mouseout',function(){
        var map=aoi_feature_edit.map;
        map.dragging.enable();
        map.touchZoom.enable();
        map.doubleClickZoom.enable();
        map.scrollWheelZoom.enable();
        if (map.tap) map.tap.enable();}
    );
};


//TODO: Abstract these
leaflet_layer_control.drawerIsOpen = false;
leaflet_layer_control.openDrawer = function() {
    leaflet_layer_control.$map.animate({marginLeft: "300px"}, 300);
    leaflet_layer_control.$map.css("overflow", "hidden");
    leaflet_layer_control.$drawer.animate({marginLeft: "0px"}, 300);
};
leaflet_layer_control.closeDrawer = function() {
    leaflet_layer_control.$map.animate({marginLeft: "0px"}, 300);
    leaflet_layer_control.$map.css("overflow", "auto");
    leaflet_layer_control.$drawer.animate({marginLeft: "-300px"}, 300);
};
leaflet_layer_control.toggleDrawer = function() {
    if(leaflet_layer_control.drawerIsOpen) {
        leaflet_layer_control.closeDrawer();
        leaflet_layer_control.drawerIsOpen = false;
    } else {
        leaflet_layer_control.openDrawer();
        leaflet_layer_control.drawerIsOpen = true;
    }
};