var leaflet_filter_bar = {};

//TODO: Drawer not working right with other drawer

leaflet_filter_bar.$map = undefined;
leaflet_filter_bar.$drawer = undefined;
leaflet_filter_bar.$drawer_tray = undefined;
leaflet_filter_bar.$tags_input = undefined;

leaflet_filter_bar.init = function(){
    leaflet_filter_bar.$map = $("#map");
    leaflet_filter_bar.initDrawer();
};
leaflet_filter_bar.initDrawer = function(){
    //Build the drawer and add it after the map
    var $drawer = $("<div>")
        .attr({id:"filter_bar_drawer"});
    leaflet_filter_bar.$drawer = $drawer;
    leaflet_filter_bar.$map.after($drawer);

    var $drawer_inner = $("<div>")
        .addClass("inner-padding")
        .appendTo($drawer);
    var $drawer_tray = $("<div>")
        .attr({id:"drawer_tray"})
        .appendTo($drawer_inner);

    leaflet_filter_bar.$drawer_tray = $drawer_tray;
    $drawer_tray.html("Filter Information Here");
};
leaflet_filter_bar.addLayerControl = function (map, options) {

//    var $layerButton = $('<a id="toggle-drawer" href="#" class="btn">Filters</a>');
//    var layerButtonOptions = {
//        'html': $layerButton,
//        'onClick': leaflet_filter_bar.toggleDrawer,
//        'hideText': false,
//        position: 'bottomright',
//        'maxWidth': 60,
//        'doToggle': true,
//        'toggleStatus': false
//    };
//    var layerButton = new L.Control.Button(layerButtonOptions).addTo(map);

    var $layerButton = $('<input type="text" id="tag_list_box"/>');
    $layerButton
        .attr('value', aoi_feature_edit.tags || "Disaster")
        .popover({title:"Tags to search social media on",placement:"left",trigger:"hover"});


    var layerButtonOptions = {
        'html': $layerButton,
        'onClick': leaflet_filter_bar.filterByTags,
        'hideText': false,
        position: 'bottomright',
        'maxWidth': 60,
        'doToggle': true,
        'toggleStatus': false
    };
    var layerButton = new L.Control.Button(layerButtonOptions).addTo(map);

    function _refreshFeeds(){
        // only search if the value has changed
        var newContent = $("#tag_list_box").val();
        var oldContent = aoi_feature_edit.tags || "";

        if ( oldContent !== newContent ) {
            aoi_feature_edit.tags = newContent;

            console.log("LOOKUP "+ newContent);
            //Refresh existing Social Layers
            _.each(aoi_feature_edit.layers.social,function(layer){
                if (layer.type == "Social Networking Link" && layer._initHooksCalled) {
                    var currentOpacity = 1;
                    if (layer.options) {
                        currentOpacity = layer.options.opacity;
                    }
                    if (currentOpacity > 0) {
                        leaflet_helper.constructors.geojson(layer.config, map, layer);
                    }
                }

            })
        }
    }

    function _searchTimeout ( event ) {
        if (this.searching) clearTimeout( this.searching );
        this.searching = setTimeout(function() {
            _refreshFeeds();
        }, 300 );
    }

    leaflet_filter_bar.$tags_input = $(layerButton._container);
    leaflet_filter_bar.$tags_input
        .bind('input keydown keyup keypress focus',function(event) {

            switch( event.keyCode ) {
                case 13:
                    event.preventDefault();
                    _refreshFeeds();
                    break;
                default:
                    // search timeout should be triggered before the input value is changed
                    _searchTimeout( event );
                    break;
            }
        });
};



//TODO: Abstract these
leaflet_filter_bar.drawerIsOpen = false;
leaflet_filter_bar.openDrawer = function() {
    leaflet_filter_bar.$map.animate({marginLeft: "300px"}, 300);
    leaflet_filter_bar.$map.css("overflow", "hidden");
    leaflet_filter_bar.$drawer.animate({marginLeft: "0px"}, 300);
};
leaflet_filter_bar.closeDrawer = function() {
    leaflet_filter_bar.$map.animate({marginLeft: "0px"}, 300);
    leaflet_filter_bar.$map.css("overflow", "auto");
    leaflet_filter_bar.$drawer.animate({marginLeft: "-300px"}, 300);
};
leaflet_filter_bar.toggleDrawer = function() {
    if(leaflet_filter_bar.drawerIsOpen) {
        leaflet_filter_bar.closeDrawer();
        leaflet_filter_bar.drawerIsOpen = false;
    } else {
        leaflet_filter_bar.openDrawer();
        leaflet_filter_bar.drawerIsOpen = true;
    }
};