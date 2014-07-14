//TODO: Should prioritization colors/labels be pulled from a DB table?
//TODO: What should be done with points/lines uploaded from a shapefile? Does this cause things to break?
//TODO: How to assign users to a cell? Paintbrush?
//TODO: Can there be a 'select/paintbrush' to remove large amounts of cells?

var create_aois = {};
create_aois.colors = ['red','#00FF00','#00BB00','#008800','#004400','#001100'];
create_aois.helpText = ['unassigned','Highest','High','Medium','Low','Lowest'];
create_aois.map_object = null;
create_aois.df = null;
create_aois.aois = new L.FeatureGroup();
create_aois.priority_to_use = 1;
create_aois.draw_method = 'usng'; //This should be updated on page creation
create_aois.get_grids_url = ''; //This should be updated on page creation
create_aois.batch_redirect_url = '';
//create_aois.batch_prioritize_rand = "";  //Included as an example
create_aois.drawControl = null;
create_aois.last_shapes = null;
create_aois.$feature_info = null;
create_aois.data_fields_obj = {};
create_aois.data_fields = [];
create_aois.highlightMode = 'delete';


function mapInit(map) {
    //Auto-called after leaflet map is initialized
    create_aois.mapInit(map);
}

create_aois.init = function(){
    var $usng = $('#option_usng').click(function () {
        create_aois.draw_method = 'usng';
        create_aois.get_grids_url = '/geoq/api/geo/usng';
        $('#poly_split_holder').hide();
        $('#file_uploader_holder').hide();
        $('a.leaflet-draw-draw-polygon').hide();
        $('a.leaflet-draw-draw-rectangle').show();
        create_aois.disableToolbars();
    }).popover({
        title:"Zoom in",
        content:"Zoom in to City level or below in the US to create USNG cells",
        trigger:"hover",
        placement:"bottom",
        container: 'body'
    });
    var $mgrs = $('#option_mgrs').click(function () {
        create_aois.draw_method = 'mgrs';
        create_aois.get_grids_url = '/geoq/api/geo/mgrs';
        $('#poly_split_holder').hide();
        $('#file_uploader_holder').hide();
        $('a.leaflet-draw-draw-polygon').hide();
        $('a.leaflet-draw-draw-rectangle').show();
        create_aois.disableToolbars();
    }).popover({
        title:"Zoom in",
        content:"Zoom in to City level or below",
        trigger:"hover",
        placement:"bottom",
        container: 'body'
    });
    $('#option_polygon').click(function () {
        create_aois.draw_method = 'polygon';
        $('#poly_split_holder').css('display','inline-block');
        $('#file_uploader_holder').hide();
        $('a.leaflet-draw-draw-polygon').show();
        $('a.leaflet-draw-draw-rectangle').show();
        create_aois.disableToolbars();
    });

    $('#option_shapefile').click(function () {
        create_aois.draw_method = 'polygon';
        $('#file_uploader_holder').css('display','inline-block');
        $('a.leaflet-draw-draw-polygon').hide();
        $('a.leaflet-draw-draw-rectangle').hide();
        $('#poly_split_holder').hide();
        create_aois.disableToolbars();
    });

    //This isn't really needed anymore as they start zoomed out
    if (create_aois.get_grids_url.indexOf('mgrs')>0){
        $mgrs.button("toggle");
        create_aois.draw_method = 'mgrs';
    } else {
        $usng.button("toggle");
        create_aois.draw_method = 'usng';
    }

    $("#poly_split_holder_select").on('change',function(ev){
        var $n = $("#poly_split_n_cells");
        var $n_sized = $("#poly_split_n_sized_cells");
        if (ev.target.value=='n_cells'){
            $n.show();
            $n_sized.hide();
        } else if (ev.target.value=='n_sized_cells'){
            $n.hide();
            $n_sized.show();
        }
    });

    $("#poly_split_button").click(function(){
        var $n = $("#poly_split_n_cells");
        var $n_sized = $("#poly_split_n_sized_cells");
        var num = 1;
        var splitIntoSized = false;
        if ($n.css('display')!='none'){
            num = parseInt($("#split_number").val());
            splitIntoSized=false;
        } else if ($n_sized.css('display')!='none'){
            num = parseInt($("#split_sized").val());
            splitIntoSized=true;
        }

        if (num>0) {
            create_aois.removeAllFeatures();
            var geoJSON = create_aois.splitPolygonsIntoSections(create_aois.last_polygon_drawn, num, splitIntoSized);

            var data = {"type":"FeatureCollection","features":geoJSON};
            create_aois.last_polygon_workcells = create_aois.createWorkCellsFromService(data);
        }

    });

    $("#file_holder_select").on('change',function(ev){
        var $n = $("#holder_smooth_polys");
        var $n2 = $("#holder_points_polys");
        if (ev.target.value=='holder_smooth'){
            $n.show();
            $n2.hide();
        } else if (ev.target.value=='holder_points'){
            $n.hide();
            $n2.show();
        }
    });

    $("#file_holder_edit_btn").click(function(){
        var $n = $("#holder_smooth_polys");
        var $n2 = $("#file_holder_edit_btn");
        if ($n.css('display')!='none'){
            if (create_aois.last_shapes){
                create_aois.smoothWorkCells(create_aois.last_shapes);
            }
        } else if ($n2.css('display')!='none'){
            var num_point_size = parseInt($('#holder_points_polys_num').val()) || 100;
            var geoJSON = create_aois.turnPointsToPolys(num_point_size);
            create_aois.createWorkCellsFromService(geoJSON);
        }
    });

    $("#holder_smooth_polys").popover({
        title:"Smooth points in a Polygon",
        content:"If your polygon is very complex, it will be much faster for everyone if you smooth the points down. The smoothing amount is in meters, and will remove points that are within that distance of each other.",
        placement:"bottom",
        trigger:"hover",
        container: 'body'
    });

    $("#geocomplete").geocomplete()
        .bind("geocode:result", function(event,result) {
            create_aois.update_info("Geocode Result: " + result.formatted_address);
            if (create_aois.map_object) {
                create_aois.map_object.setView([result.geometry.location.lat(),result.geometry.location.lng()],13);
            }
        })
        .bind("geocode:error", function(event,status){
            create_aois.update_info("Geocode Error: " + status);
        })
        .bind("geocode:multiple", function(event,results) {
            create_aois.update_info("Geocode Multiple: " + results.length + " results found");
        });

    $("#find").click(function() {
        $("#geocomplete").trigger("geocode");
    });

    $("#save-aois-button").on('click',function(){
        var boundaries = create_aois.getBoundaries();

        if (boundaries) {
            create_aois.update_info("Saving work cells to server");
            $("#save-aois-button")
                .attr('disabled', true)
                .text('Sending cells to server...');
            $.post(create_aois.save_url,
               {aois: JSON.stringify(boundaries), csrftoken:geoq.csrftoken},
               function(data, textStatus) {
                   log.log("Batch creating service - Got response: " + textStatus);
                   window.location.href = create_aois.batch_redirect_url;
               });
        }
    });

    $("#prioritize-aois-clear-button").on('click',function(){create_aois.removeAllFeatures();});

    $("#prioritize-selector").on('change select',function(option){
        var field = option.target.value;
        if (field){
//  This is how we can pass cells to a server function to prioritize, if needed in the future:

//            if (field=="Random"){
//                var boundaries = create_aois.getBoundaries();
//                if (boundaries) {
//                    create_aois.update_info("Sending Work Cells to the server to prioritize");
//                    $.post(create_aois.batch_prioritize_rand,
//                       {aois: JSON.stringify(boundaries), csrftoken:geoq.csrftoken},
//                       function(data, textStatus) {
//                           log.log("Batch creating service Random - Got response: " + textStatus);
//                           create_aois.resetBoundaries(data);
//                       });
//                }
//            } else
            if (field=="--select--" || field=="add cells first") {
                //Ignore choice
            } else {
                //Verify the case is correct
                for (var key in create_aois.data_fields_obj) {
                    if (field.toLowerCase() == key.toLowerCase()) {
                        field = key;
                    }
                }
                create_aois.prioritizeCellsBy(field);
            }
        }
    });

    _.each([1,2,3,4,5],function(num){
        var $bottomBtn = $("#prioritize-aois-"+num+"-button");
        $bottomBtn
            .on('click',function(){create_aois.setAllCellsTo(num);})
            .css({backgroundColor:create_aois.colors[num],backgroundImage:'none'});
        $bottomBtn.css({color:(num > 2)?'white':'black'});
    });

    $("#reset-from-textarea-button").on('click',function(){
        var $aois = $("#current-aois");
        var data = $aois.val() || [];
        data = '{"type":"FeatureCollection","features":'+data+'}';
        try{
            data=JSON.parse(data);
            create_aois.createWorkCellsFromService(data);
            $aois.css('backgroundColor','lightgreen');
            create_aois.resetBoundaries();
        } catch (ex) {
            create_aois.update_info("Couldn't parse text inside CurrentAOIs text box");
            $aois.css('backgroundColor','red');
        }
    });

    $("#prioritize-reverse").click(create_aois.reversePriorities);

    $("#show-geojson-textarea").click(function(){
        $("#geojson-textarea").show();
        $("#show-geojson-textarea").hide();
    });

    create_aois.initializeFileUploads();
};

create_aois.mapInit = function(map) {
    setTimeout(function(){
        map.fitBounds([[52.429222277955134, -51.50390625],[21.043491216803556,-136.58203125]])
    }, 1);

    var drawnItems = new L.FeatureGroup();
    create_aois.df = drawnItems;

    map.addLayer(drawnItems);

    var polygon = {
        title: 'Freeform work cell',
        allowIntersection: false,
        drawError: {color: '#b00b00', timeout: 1000},
        shapeOptions: {borderColor: "black", backgroundColor: "brown"},
        showArea: true
    };

    var drawControl = new L.Control.Draw({
        draw: {
            position: 'topleft',
            polygons: [polygon],
            rectangle: {
                shapeOptions: {
                    color: '#b00b00'
                }
            },
            circle: false,
            polyline: false
        },
        edit: {
            featureGroup: create_aois.aois,
            remove: false
        }
    });
    map.addControl(drawControl);
    create_aois.drawControl = drawControl;
    $('a.leaflet-draw-edit-edit').attr("title","Click Work Cell box to delete it");
    $('div.leaflet-draw.leaflet-control').find('a').popover({trigger:"hover",placement:"right"});
    $('a.leaflet-draw-draw-polygon').hide();

    map.on('zoomend', function(e){
        var zoom = create_aois.map_object.getZoom();
        var $usng = $("#option_usng");
        var $mgrs = $("#option_mgrs");
        var $poly = $("#option_polygon");
        if (zoom > 8){
            $usng.attr('disabled', false).text('USNG Cells (US only)');
            $mgrs.attr('disabled', false).text('MGRS Cells');
        } else {
            if ($usng.hasClass("active") || $mgrs.hasClass("active")){
                $poly.click();
            }
            $usng.attr('disabled', true).text('Zoom in to use USNG/MGRS');
            $mgrs.attr('disabled', true).text('>');
        }
    });

    map.on('draw:created', function (e) {
        var type = e.layerType,
            layer = e.layer;

        if (type === 'rectangle' || type === 'circle' || type === 'polygon-undefined' ) {
            if (create_aois.draw_method=="polygon") {
                //Using free-form polygon
                var geoJSON = create_aois.turnPolygonsIntoMultis(layer);
                create_aois.last_polygon_drawn = layer;

                var data = {"type":"FeatureCollection","features":geoJSON};
                create_aois.last_polygon_workcells = create_aois.createWorkCellsFromService(data);

                $('#poly_split_button').attr('disabled',false);
            } else {
                //Using USNG or MGRS
                create_aois.update_info("Requesting Grid Information from the server");
                var bboxStr = layer.getBounds().toBBoxString();
                $.ajax({
                    type: "GET",
                    url: create_aois.get_grids_url,
                    data: { bbox: bboxStr},
                    contentType: "application/json",
                    success: create_aois.createWorkCellsFromService,
                    beforeSend: function() {
                        $("#map").css({
                           'cursor': 'wait'
                        });
                    },
                    complete: function() {
                        $("#map").css({
                           'cursor': 'default'
                        });
                    },
                    error: function(response) {
                        create_aois.update_info("Error received from server when looking up grid cells");
                        if (response.responseText) {
                            var message = JSON.parse(response.responseText);
                            if (message.details) {
                                log.error(message.details);
                            }
                        }
                    },
                    dataType: "json"
                });
            }
        }
        drawnItems.addLayer(layer);
        create_aois.updateCellCount();
    });

    create_aois.map_object = map;
    
    _.each([1,2,3,4,5],function(num){
        var helpText = create_aois.helpText[num];
        var $btn = $("<button>")
            .text('Pri '+num+' : '+helpText+' (0)')
            .attr({id:'priority-map-'+num})
            .css('width','155px')
            .popover({
                title:'Set Priority',
                content:'The next cells you draw will have a priority of '+num+' ('+helpText+')',
                trigger:'hover',
                placement:'left',
                container: 'body'
            });

        var help_control = new L.Control.Button({
            html:$btn,
            onClick: function(){
                create_aois.priority_to_use = num;
            },
            hideText: false,
            doToggle: false,
            toggleStatus: false,
            position: 'topright'
        });
        help_control.addTo(map);

        $btn.css({backgroundColor:'inherit'});
        $btn.css({color:(num >2)?'white':'black'});
        $btn.parent().css({backgroundColor:create_aois.colors[num]});
    });

    create_aois.$feature_info = $('<div>')
        .addClass('feature_info');

    var status_control = new L.Control.Button({
        html:create_aois.$feature_info,
        hideText: false,
        doToggle: false,
        toggleStatus: false,
        position: 'bottomright'
    });
    status_control.addTo(map);

};

create_aois.splitPolygonsIntoSections = function(layer, num, splitIntoSized){
    var bounds = layer.getBounds();
    var left = bounds.getWest();
    var right = bounds.getEast();
    var north = bounds.getNorth();
    var south = bounds.getSouth();
    var width = right-left;
    var height = north-south;
    var slope = width/height;

    //Build an object that will be used for interior checking of points
    var layer_poly = {type:'Polygon',coordinates:[[]]};
    var cs = layer.getLatLngs();
    _.each(cs,function(c){
       layer_poly.coordinates[0].push([c.lng, c.lat]);
    });

    var x = 1;
    var y = 1;

    if (splitIntoSized){
        //Divide by size of earth/meters
        x = parseInt(width * 111111.111 / num);
        y = parseInt(height * 111111.111 / num); //TODO: use COS to
    } else {
        //Determine what percentage of the poly is filled
        var fillPercentage=create_aois.determine_poly_fill_percentage(layer_poly, left, south, width, height);

        //Use the fillPercentage to determine how much of the target numbers should be grown
        num = num / fillPercentage;

        //Figure out how many x and y rows should be tried
        x = parseInt(Math.sqrt(num*slope));
        y = Math.round(num/x);
    }

    //Clamp to be between 1 and 40k work cells
    x = (x<1)?1:x>200?200:x;
    y = (y<1)?1:y>200?200:y;

    //When checking if cells are in a poly, check cells be subdividing by this amount
    var tessalationCheckAmount = 3;
    if ((x*y)>50) tessalationCheckAmount = 2;
    if ((x*y)>150) tessalationCheckAmount = 1;

    var x_slice = width/x;
    var y_slice = height/y;

    //Build the cells and remove ones that aren't in the original polygon
    var layers = [];
    var id_root = "handmade."+parseInt(Math.random()*100000000);
    for (var x_num=0; x_num<x; x_num++ ){
        for (var y_num=0; y_num<y; y_num++ ){
            var id = id_root+"_"+x_num+"_"+y_num;

            var l0 = left+(x_slice*(x_num));
            var l1 = left+(x_slice*(x_num+1));
            var t0 = south+(y_slice*(y_num));
            var t1 = south+(y_slice*(y_num+1));

            //Build the square
            var coords = [
                [l0,t0],
                [l0,t1],
                [l1,t1],
                [l1,t0]
            ];

            var isBoxInPoly=true;
            if ((fillPercentage<1) || (x >3 && y >3)) {
                //If it's a lot of boxes, test each one
                isBoxInPoly=false;

                //Break each box into smaller points and check the corners as well as those points to see if it's in the poly
                var coordsToCheck = _.clone(coords);
                var l_slice = (l1-l0)/(tessalationCheckAmount+2);
                var t_slice = (t1-t0)/(tessalationCheckAmount+2);

                for (var l_step=1;l_step<(tessalationCheckAmount+1);l_step++){
                    for (var t_step=1;t_step<(tessalationCheckAmount+1);t_step++){
                        coordsToCheck.push([l0+(l_slice*l_step),t0+(t_slice*t_step)]);
                    }
                }

                for(var c=0;c<coordsToCheck.length;c++){
                    var coord = coordsToCheck[c];
                    if (gju.pointInPolygon({coordinates:coord},layer_poly)) {
                        isBoxInPoly = true;
                        break;
                    }
                }

            } else {
                isBoxInPoly = true;
            }

            //Add the closing first point as the last point
            coords.push(coords[0]);
            if (isBoxInPoly){
                var feature = {"type":"Feature","id":id,
                    "geometry_name":"the_geom","properties":{priority:create_aois.priority_to_use},
                    "geometry":{"type":"MultiPolygon","coordinates":[[coords]]}};
                layers.push(feature);
            }
        }
    }

    return layers;
};
create_aois.determine_poly_fill_percentage = function(layer_poly, left, south, width, height){
    //Determine what percentage of the poly is filled
    var fillPercentage;
    var coordsToCheck = [];
    var slices=22;
    for (var x_num=1; x_num<(slices-1); x_num++ ){
        for (var y_num=1; y_num<(slices-1); y_num++ ){
            var l = left+((width/slices)*x_num);
            var t = south+((height/slices)*y_num);
            coordsToCheck.push([l,t]);
        }
    }
    var fillNum = 0;
    for(var c=0;c<coordsToCheck.length;c++){
        var coord = coordsToCheck[c];
        if (gju.pointInPolygon({coordinates:coord},layer_poly)) fillNum++;
    }
    fillPercentage = fillNum/((slices-2)*(slices-2))-.02;
    log.log((fillPercentage*100)+"% filled polygon drawn");
    fillPercentage = fillPercentage<.2?.2:fillPercentage>.97?1:fillPercentage;

    return fillPercentage;
};

create_aois.turnPolygonsIntoMultis = function(layers){
    //Convert from single polygon to multipolygon format
    if (!_.isArray(layers)) layers = [layers];
    var geoJSONFeatures = [];
    _.each(layers,function(layer){

        var geoJSON;
        if (layer && layer.toGeoJSON) {
            geoJSON = layer.toGeoJSON();
        } else {
            geoJSON = layer || {};
        }
        if (!geoJSON.id) geoJSON.id = "handmade."+parseInt(Math.random()*1000000);
        geoJSON.geometry_name = "the_geom";
        geoJSON.properties = geoJSON.properties || {};
        geoJSON.properties = _.extend(geoJSON.properties,{priority:create_aois.priority_to_use});
        if (geoJSON.geometry.type == "Polygon") {
            geoJSON.geometry.type = "MultiPolygon";
            geoJSON.geometry.coordinates = [geoJSON.geometry.coordinates];
        }
        geoJSONFeatures.push(geoJSON);

        //Set the style properly while we're here
        if (layer.setStyle){
            layer.setStyle(create_aois.styleFromPriority(create_aois.priority_to_use));
        }
    });

    return geoJSONFeatures;
};

create_aois.disableToolbars = function(){
    if (create_aois.drawControl && create_aois.drawControl._toolbars) {
        var toolbars = _.toArray(create_aois.drawControl._toolbars);
        _.each(toolbars,function(t){
            if (t.disable) t.disable();
        })
    }
};
create_aois.styleFromPriority = function(feature){
    var priority = create_aois.priority_to_use;
    if (feature.properties && feature.properties.priority) {
        priority = feature.properties.priority;
    }
    var color = create_aois.colors[5];
    if (priority > 0 && priority < create_aois.colors.length) {
        color = create_aois.colors[priority];
    }
    return {
        "weight": 2,
        "color": color,
        "opacity": .7,
        fillOpacity: 0.3,
        fillColor: color
    };
};

create_aois.highlightFeature = function(e) {
    var layer = e.target;
    if (create_aois.highlightMode == 'delete'){
        if (layer.setStyle){
            layer.setStyle({
                color: create_aois.colors[0],
                weight: 3,
                opacity: 1,
                fillOpacity: 1,
                fillColor: create_aois.colors[0]
            });
        } else {
            if (layer._icon){
                layer.oldIcon = layer._icon.getAttribute('src');
                layer.setIcon(L.icon({iconUrl: "/static/leaflet/images/red-marker-icon.png"}));
            }
        }
    }
    if (layer.popupContent){
        create_aois.update_info(layer.popupContent);
    }
};

create_aois.update_info=function(html){
    if (create_aois.$feature_info) {
        create_aois.$feature_info.html(html);
    }
};

create_aois.resetHighlight = function(e) {
    var layer = e.target;

    if (layer.setStyle){
        var style = create_aois.styleFromPriority(layer.feature);
        layer.setStyle(style);
    } else {
        if (layer.oldIcon){
            layer.setIcon(L.icon({iconUrl: layer.oldIcon}));
        }
    }

    create_aois.update_info("");
};

create_aois.removeFeature = function(e) {
    for (var key in create_aois.aois._layers) {
        if (create_aois.aois._layers[key]._layers[e.target._leaflet_id]) {
            create_aois.aois._layers[key].removeLayer(e.target);
        }
    }
    create_aois.updateCellCount();
};

create_aois.createWorkCellsFromService = function(data,zoomAfter,saveLayerTo){

    data.features = create_aois.turnPolygonsIntoMultis(data.features || data);

    var features = L.geoJson(data, {
        style: function(feature) {
            //Test: If this isn't on each feature, do it onEachFeature below
            return create_aois.styleFromPriority(feature);
        },
        onEachFeature: function(feature, layer) {
            var popupContent = "";
            if (!feature.properties) {
                feature.properties = {};
            }
            if (_.isString(feature.properties.properties)){
                try {
                    var newProps = JSON.parse(feature.properties.properties);
                    feature.properties = $.extend(feature.properties, newProps);
                    delete(feature.properties.properties);
                } catch (ex) {}
            }
            feature.priority = feature.properties.priority = parseInt(feature.properties.priority) || create_aois.priority_to_use;
            for(var k in feature.properties){
                if (k!="priority"){
                    popupContent += "<b>"+k+":</b> " + feature.properties[k]+"<br/>";

                    //Add fields to search if they are numeric
                    for (var key in feature.properties){
                        if ($.isNumeric(feature.properties[key])){
                            create_aois.data_fields_obj[key] = true;
                        }
                    }
                }
            }

            //Add Size information
            if (layer.getBounds){
                var bounds = layer.getBounds();
                bounds._northWest = new L.LatLng(bounds._northEast.lat,bounds._southWest.lng);
                var width_m = bounds._northEast.distanceTo(bounds._northWest);
                var height_m = bounds._southWest.distanceTo(bounds._northWest);
                popupContent += "<b>Width:</b>: "+L.GeometryUtil.readableDistance(width_m, true)+"<br/>";
                popupContent += "<b>Height:</b>: "+L.GeometryUtil.readableDistance(height_m, true)+"<br/>";
                try{
                    var area = L.GeometryUtil.geodesicArea(layer.getLatLngs()[0]);
                    if (area>990){
                        area = area/1000;
                        popupContent += "<b>Area:</b>: "+L.GeometryUtil.readableDistance(area, true)+" sq<br/>";
                    }
                } catch (ex){}
            }
            layer.popupContent = popupContent;

            layer.on({
                mouseover: create_aois.highlightFeature,
                mouseout: create_aois.resetHighlight,
                click: create_aois.removeFeature
            });
        }
    });

    if (features){
        create_aois.aois.addLayer(features);
        create_aois.map_object.addLayer(create_aois.aois);

        if (zoomAfter){
            create_aois.map_object.fitBounds(features.getBounds());
        }
        create_aois.last_shapes = features;
    }
    create_aois.updateCellCount();
    create_aois.redrawStyles();

    create_aois.buildFilterDropdown();

    return features;
};
create_aois.buildFilterDropdown = function(){
    var $prioritizeSelector = $('#prioritize-selector').empty();
    if (create_aois.data_fields_obj){
        $('<option>')
            .text("--select--")
            .appendTo($prioritizeSelector);
        for (var key in create_aois.data_fields_obj){
            if (key!="priority"){
                $('<option>')
                    .text(_.str.capitalize(key))
                    .appendTo($prioritizeSelector);
            }
        }
        $('<option>')
            .text("Random")
            .appendTo($prioritizeSelector);
    }
};
create_aois.turnPointsToPolys = function(sizeWidth) {
    var geoJSONFeatures = [];

    var m = create_aois.map_object;
    if (m && (m._container.id == 'map') && (m.hasLayer(create_aois.aois))){
        var sizer = sizeWidth/111111.11 / 2;

        _.each(m._layers, function(layer){
            var feature = layer.feature;
            if (feature && feature.geometry && feature.geometry.type == "Point"){

                var geoJSON;
                if (layer && layer.toGeoJSON) {
                    geoJSON = layer.toGeoJSON();
                } else {
                    geoJSON = layer || {};
                }
                if (!geoJSON.id) geoJSON.id = "handmade."+parseInt(Math.random()*1000000);
                geoJSON.geometry_name = "the_geom";
                geoJSON.properties = geoJSON.properties || {};
                geoJSON.properties = _.extend(geoJSON.properties,{priority:create_aois.priority_to_use});
                if (geoJSON.geometry.type == "Point") {
                    geoJSON.geometry.type = "MultiPolygon";
                    var pointCoords = geoJSON.geometry.coordinates;
                    var square = [[pointCoords[0]-sizer,pointCoords[1]-sizer],
                                  [pointCoords[0]-sizer,pointCoords[1]+sizer],
                                  [pointCoords[0]+sizer,pointCoords[1]+sizer],
                                  [pointCoords[0]+sizer,pointCoords[1]-sizer],
                                  [pointCoords[0]-sizer,pointCoords[1]-sizer]];
                    geoJSON.geometry.coordinates = [[square]];
                }
                geoJSONFeatures.push(geoJSON);

                m.removeLayer(layer);
            }
        })
    }
    return geoJSONFeatures;
};

create_aois.updateCellCount = function() {
    var aoi_count = 0;
    var counts = [0,0,0,0,0,0];
    //TODO: Have a count for points?

    _.each(create_aois.aois._layers,function(layergroup){
        if (layergroup && layergroup._layers){
            aoi_count += _.toArray(layergroup._layers).length;

            _.each(layergroup._layers,function(layer){
                if (layer.feature && layer.feature.properties && layer.feature.properties.priority) {
                    var pri = layer.feature.properties.priority;
                    if (_.isNumber(pri) && pri>0 && pri<6) counts[pri]++;
                }
            });
        }
    });
    $('#num_workcells').text(aoi_count);

    //Update Priority on-map Buttons
    _.each([1,2,3,4,5],function(num){
        var $bottomBtn = $("#priority-map-"+num);
        var helpText = create_aois.helpText[num];

        var text = 'Priority '+num+' : '+helpText+' ('+counts[num]+')';
        $bottomBtn.text(text);
    });

    //Fill in bottom text area with geojson
    var boundaries = JSON.stringify(create_aois.getBoundaries());
    if (boundaries=="false") boundaries = '{"message":"No cells entered"}';
    $('#current-aois')
        .val(boundaries);
};

create_aois.removeAllFeatures = function () {
    create_aois.data_fields_obj = {};
    create_aois.buildFilterDropdown();
    var m = create_aois.map_object;
    if (m && (m._container.id == 'map') && (m.hasLayer(create_aois.aois))){
        _.each(m._layers, function(l){
            if (l._layers || l._path) {
                m.removeLayer(l);
            }
        });
        create_aois.aois = new L.FeatureGroup();
    }
    create_aois.updateCellCount();
};

create_aois.redrawStyles = function(){
    var m = create_aois.map_object;
    if (m && (m._container.id == 'map') && (m.hasLayer(create_aois.aois))){
        _.each(create_aois.aois.getLayers(), function(l){
           _.each(l.getLayers(), function(f){
               if (f.setStyle && f.feature ){
                   f.setStyle(create_aois.styleFromPriority(f.feature));
               }
           });
        });
    }
};

create_aois.getBoundaries = function() {
    var boundaries = [];

    var m = create_aois.map_object;
    if (m && (m._container.id == 'map') && (m.hasLayer(create_aois.aois))){
        _.each(create_aois.aois.getLayers(), function(l){
           _.each(l.getLayers(), function(f){
               f.feature.name = $('#aoi-name').val();
               boundaries.push(f.toGeoJSON());
           });
        });
    }
    if (!boundaries.length) boundaries = false;

    return boundaries;
};

create_aois.resetBoundaries = function(data) {
    if (data==undefined){
        data = create_aois.getBoundaries();
    }
    create_aois.removeAllFeatures();

    //Add back AOI Layers
    create_aois.createWorkCellsFromService(data);
};

create_aois.prioritizeCellsBy = function(numField){
    numField = numField || "daypop";

    var m = create_aois.map_object;
    if (m && (m._container.id == 'map') && (m.hasLayer(create_aois.aois))){
        var maxPop = 0;

        if (numField=="Random"){
            _.each(create_aois.aois.getLayers(), function(l){
                _.each(l.getLayers(), function(featureHolder){
                    var props = featureHolder.feature.properties;
                    props = props || {};
                    props.priority = Math.ceil(Math.random()*5);
                });
            });
            return;
        }

        //Get the highest population count
        _.each(create_aois.aois.getLayers(), function(l){
            _.each(l.getLayers(), function(featureHolder){
                var props = featureHolder.feature.properties;
                props = props || {};

                if (props[numField]) {
                    if (props[numField] > maxPop) maxPop = props[numField];
                }
            });
        });

        //Group Priorities by 1/maxPops
        _.each(create_aois.aois.getLayers(), function(l){
            _.each(l.getLayers(), function(featureHolder){
                var props = featureHolder.feature.properties;
                props = props || {};

                if (props[numField]) {
                    props.priority = 6 - Math.ceil(5 *(props[numField] / maxPop)) || create_aois.priority_to_use;
                    if (featureHolder.setStyle){
                        featureHolder.setStyle(create_aois.styleFromPriority(featureHolder.feature));
                    }
                }
            });
        });
    }
};
create_aois.reversePriorities = function(){
    var m = create_aois.map_object;
    if (m && (m._container.id == 'map') && (m.hasLayer(create_aois.aois))){

        _.each(create_aois.aois.getLayers(), function(l){
            _.each(l.getLayers(), function(featureHolder){
                var props = featureHolder.feature.properties;
                props = props || {};

                if (props.priority) {
                    props.priority = 6 - props.priority;
                }
                if (featureHolder.setStyle){
                    featureHolder.setStyle(create_aois.styleFromPriority(featureHolder.feature));
                }
            });
        });
    }
    create_aois.updateCellCount();

};

create_aois.setAllCellsTo = function (num){
    num = num || create_aois.priority_to_use;

    var m = create_aois.map_object;
    if (m && (m._container.id == 'map') && (m.hasLayer(create_aois.aois))){

        _.each(create_aois.aois.getLayers(), function(l){
            _.each(l.getLayers(), function(featureHolder){
                var props = featureHolder.feature.properties;
                props = props || {};
                props.priority = num;
            });
        });
        create_aois.resetBoundaries();
    }
};

create_aois.smoothWorkCells = function(shape_layers){
    var smooth_num = parseInt($('#holder_smooth_num').val());
    if (!smooth_num) smooth_num = 500;

    //Convert meters to Lat/Long smoothing ratio
    //1 Longitude (at 48-Lat) ~= 75000m, 1 Latitude ~= 111111m, so using 80km as 1
    smooth_num = smooth_num/80000;

    _.each(shape_layers._layers,function(layer){
        var latlngs = layer.getLatLngs?layer.getLatLngs():null;
        if (latlngs && latlngs.length){
            latlngs = latlngs[0];
            //Convert the points to a format the library expects
            var points = [];
            _.each(latlngs,function(ll){points.push({x:ll.lng,y:ll.lat})});

            //Do the point smoothing
            var smoothedPoints = L.LineUtil.simplify(points,smooth_num);

            //Convert it back
            var newPointsLL = [];
            _.each(smoothedPoints,function(ll){newPointsLL.push({lng:ll.x,lat:ll.y})});

            //Add the start point to close the poly
            newPointsLL.push(newPointsLL[0]);
            layer.setLatLngs([newPointsLL]);
        }
    });
};

create_aois.initializeFileUploads = function(){
    var holder = document.getElementById('file_holder');
    var $holder = $('#file_holder').popover({
        title:"Drag zipped shapefile here",
        content:"You can drag a .zip or .shp file here. All polygons/multipolygons within will be created as work cells. Please make files as small as possible (<5mb).",
        trigger: "hover",
        placement: "bottom",
        container: 'body'
    });

    if (typeof window.FileReader === 'undefined') {
        $("#option_shapefile").css('display','none');
    }

    holder.ondragover = function () { this.className = 'hover'; return false; };
    holder.ondragend = function () { this.className = ''; return false; };
    holder.ondrop = function (e) {
      this.className = '';
      e.preventDefault();
      create_aois.update_info("Loading File...");
      $holder.css({backgroundColor:'lightgreen'});

      var file = e.dataTransfer.files[0], reader = new FileReader();

      reader.onload = function (event) {
          var size = "";
          if (event.loaded){
              var kb = event.loaded/1024;
              if (kb>1000) {
                  kb = kb/1024;
                  kb = parseInt(kb*10)/10;
                  size = kb + " mb";
              } else {
                  kb = parseInt(kb*10)/10;
                  size = kb + " kb";
              }
              $holder.text(size + " file loaded");
          }

          $holder.css({backgroundColor:''});
          create_aois.update_info("Importing Shapes: "+size);

          shp(reader.result).then(function(geojson){
              create_aois.createWorkCellsFromService(geojson,true);

              create_aois.update_info("Shapes Imported");
          },function(a){
              log.log(a);
          });
          $('#file_holder_edit_btn').attr('disabled',false);

      };
      reader.readAsArrayBuffer(file);

      return false;
    };
};