//TODO: Popups are blocking cells, maybe show info differently

var create_aois = {};
create_aois.colors = ['red','#003300','#006600','#009900','#00CC00','#00FF00'];
create_aois.helpText = ['unassigned','Lowest','Low','Medium','High','Highest'];
create_aois.map_object = null;
create_aois.df = null;
create_aois.aois = new L.FeatureGroup();
create_aois.priority_to_use = 1;
create_aois.draw_method = 'usng';
create_aois.get_grids_url = '/geoq/api/geo/usng';
create_aois.drawControl = null;
create_aois.last_shapes = null;

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
        create_aois.disableToolbars();

    });
    var $mgrs = $('#option_mgrs').click(function () {
        create_aois.draw_method = 'mgrs';
        create_aois.get_grids_url = '/geoq/api/geo/mgrs';
        $('#poly_split_holder').hide();
        $('#file_uploader_holder').hide();
        $('a.leaflet-draw-draw-polygon').hide();
        create_aois.disableToolbars();
    });
    $('#option_polygon').click(function () {
        create_aois.draw_method = 'polygon';
        $('#poly_split_holder').css('display','inline-block');
        $('#file_uploader_holder').hide();
        $('a.leaflet-draw-draw-polygon').show();
        create_aois.disableToolbars();
    });

    $('#option_shapefile').click(function () {
        create_aois.draw_method = 'polygon';
        $('#file_uploader_holder').css('display','inline-block');
        $('a.leaflet-draw-draw-polygon').hide();
        $('#poly_split_holder').hide();
        create_aois.disableToolbars();
    });

    if (create_aois.get_grids_url.indexOf('mgrs')>0){
        $mgrs.button("toggle");
        create_aois.draw_method = 'mgrs';
    } else {
        $usng.button("toggle");
        create_aois.draw_method = 'usng';
    }


    $("#geocomplete").geocomplete()
        .bind("geocode:result", function(event,result) {
            log.log("Geocode Result: " + result.formatted_address);
            if ( create_aois.df._map ) {
                create_aois.df._map.setView([result.geometry.location.lat(),result.geometry.location.lng()],13);
            }
        })
        .bind("geocode:error", function(event,status){
            log.error("Geocode: " + status);
        })
        .bind("geocode:multiple", function(event,results) {
            log.log("Geocode Multiple: " + results.length + " results found");
        });

    $("#find").click(function() {
        $("#geocomplete").trigger("geocode");
    });

    $("#save-aois-button").on('click',function(){
        var boundaries = create_aois.getBoundaries();

        if (boundaries) {
            $("#save-aois-button")
                .attr('disabled', true)
                .text('Sending cells to server...');
            $.post(create_aois.save_url,
               { aois: JSON.stringify(boundaries), csrftoken:geoq.csrftoken},
               function(data, textStatus) {
                   log.log("Batch creating service - Got response: " + textStatus);
                   window.location.href = create_aois.batch_redirect_url;
               });
        }
    });

    $("#prioritize-aois-day-button").on('click',function(){create_aois.prioritizeCellsBy('daypop');});
    $("#prioritize-aois-night-button").on('click',function(){create_aois.prioritizeCellsBy('nightpop');});
    $("#prioritize-aois-clear-button").on('click',function(){create_aois.removeAllFeatures();});
    _.each([1,2,3,4,5],function(num){
        var $bottomBtn = $("#prioritize-aois-"+num+"-button");
        $bottomBtn
            .on('click',function(){create_aois.setAllCellsTo(num);})
            .css({backgroundColor:create_aois.colors[num],backgroundImage:'none'});
        $bottomBtn.css({color:(num < 4)?'white':'black'});
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
            log.error("Couldn't parse text inside CurrentAOIs text box");
            $aois.css('backgroundColor','red');
        }
    });

    $("#prioritize-aois-random-button").on('click',function(){
        var boundaries = create_aois.getBoundaries();
        if (boundaries) {
            $.post(create_aois.batch_prioritize_rand,
               {aois: JSON.stringify(boundaries), csrftoken:geoq.csrftoken},
               function(data, textStatus) {
                   log.log("Batch creating service Random - Got response: " + textStatus);
                   create_aois.resetBoundaries(data);
               });
        }
    });

    $("#simplify_btn").click(function(){
        if (create_aois.last_shapes){
            create_aois.smoothWorkCells(create_aois.last_shapes);
        }
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

    map.on('draw:created', function (e) {
        var type = e.layerType,
            layer = e.layer;

        if (type === 'rectangle' || type === 'circle' || type === 'polygon-undefined' ) {
            if (create_aois.draw_method=="polygon") {
                //Using free-form polygon
                var x = parseInt($("#split_wide").val());
                var y = parseInt($("#split_high").val());

                var geoJSON;
                if (x>1 || y>1) {
                    geoJSON = create_aois.splitPolygonsIntoSections(layer, x, y);
                } else {
                    geoJSON = create_aois.turnPolygonsIntoMultis(layer);
                }

                var data = {"type":"FeatureCollection","features":geoJSON};
                create_aois.createWorkCellsFromService(data);
            } else {
                //Using USNG or MGRS
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
            .text('Priority '+num+' : '+helpText)
            .attr({id:'priority-map-'+num})
            .css('width','140px')
            .popover({
                title:'Set Priority',
                content:'The next cells you draw will have the priority of level '+num+', which means '+helpText,
                trigger:'hover',
                placement:'left'
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
        $btn.css({color:(num < 4)?'white':'black'});
        $btn.parent().css({backgroundColor:create_aois.colors[num]});

    });
};

create_aois.splitPolygonsIntoSections = function(layer,x,y){
    x = (x<1)?1:x;
    y = (y<1)?1:y;

    var layer_poly = {type:'Polygon',coordinates:[[]]};
    var cs = layer.getLatLngs();
    _.each(cs,function(c){
       layer_poly.coordinates[0].push([c.lng, c.lat]);
    });

    //When checking if cells are in a poly, check cells be subdividing by this amount
    var tessalationCheckAmount = 3;
    if (x>6 && y>6) tessalationCheckAmount = 2;
    if (x>10 && y>10) tessalationCheckAmount = 1;

    var bounds = layer.getBounds();
    var left = bounds.getWest();
    var right = bounds.getEast();
    var north = bounds.getNorth();
    var south = bounds.getSouth();
    var width = right-left;
    var height = north-south;
    var x_slice = width/x;
    var y_slice = height/y;

    var layers = [];
    var id_root = "handmade."+parseInt(Math.random()*1000000);
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

            var isBoxInPoly=false;
            if (x >4 && y >4) {
                //If it's a lot of boxes, test each one

                //Break each box into smaller points and check the corners as well as those points to see if it's in the poly
                var coordsToCheck = _.clone(coords);
                var l_slice = (l1-l0)/(tessalationCheckAmount+2);
                var t_slice = (t1-t0)/(tessalationCheckAmount+2);

                for (var l_step=1;l_step<(tessalationCheckAmount+1);l_step++){
                    for (var t_step=1;t_step<(tessalationCheckAmount+1);t_step++){
                        coordsToCheck.push([l0+(l_slice*l_step),t0+(t_slice*t_step)]);
                    }
                }

                _.each(coordsToCheck,function(coord){
                    if (!isBoxInPoly && gju.pointInPolygon({coordinates:coord},layer_poly)) {
                        isBoxInPoly = true;
                    }
                });
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

create_aois.turnPolygonsIntoMultis = function(layers){
    //Convert from single polygon to multipolygon format
    if (!_.isArray(layers)) layers = [layers];
    var geoJSONFeatures = [];
    _.each(layers,function(layer){

        var geoJSON;
        if (layer.toGeoJSON) {
            geoJSON = layer.toGeoJSON();
        } else {
            geoJSON = layer;
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
    var color = create_aois.colors[1];
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
    layer.setStyle({
        color: create_aois.colors[0],
        weight: 3,
        opacity: 1,
        fillOpacity: 1,
        fillColor: create_aois.colors[0]
    });
    this.openPopup();
};

create_aois.resetHighlight = function(e) {
    var layer = e.target;

    var style = create_aois.styleFromPriority(layer.feature);
    layer.setStyle(style);

    create_aois.map_object.closePopup();
};

create_aois.removeFeature = function(e) {
    // get FeatureLayer key
    for (var key in create_aois.aois._layers) {
        if (create_aois.aois._layers[key]._layers[e.target._leaflet_id]) {
            create_aois.aois._layers[key].removeLayer(e.target);
        }
    }
    create_aois.updateCellCount();
};

create_aois.createWorkCellsFromService = function(data,zoomAfter){

    data.features = create_aois.turnPolygonsIntoMultis(data.features);

    var features = L.geoJson(data, {
        style: function(feature) {
            //Test: If this isn't on each feature, do it onEachFeature below
            return create_aois.styleFromPriority(feature);
        },
        onEachFeature: function(feature, layer) {
            var popupContent = "";
            if (feature.properties) {
            } else {
                feature.properties = {};
            }
            feature.properties.priority = feature.properties.priority || create_aois.priority_to_use;
            for(var k in feature.properties){
                popupContent += "<b>"+k+":</b> " + feature.properties[k]+"<br/>";
            }

            layer.bindPopup(popupContent);

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

        create_aois.map_object.fitBounds(features.getBounds());
        create_aois.last_shapes = features;
    }
    create_aois.updateCellCount();
};

create_aois.updateCellCount = function() {
    var aoi_count = 0;
    _.each(create_aois.aois._layers,function(layergroup){
        if (layergroup && layergroup._layers){
            aoi_count += _.toArray(layergroup._layers).length;
        }
    });
    $('#num_workcells').text(aoi_count);

    var boundaries = create_aois.getBoundaries();
    $('#current-aois')
        .val(JSON.stringify(boundaries));
};

create_aois.removeAllFeatures = function () {
    var m = create_aois.aois._map;
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

create_aois.getBoundaries = function() {
    var boundaries = [];

    var m = create_aois.aois._map;
    if (m && (m._container.id == 'map') && (m.hasLayer(create_aois.aois))){
        _.each(create_aois.aois.getLayers(), function(l){
           _.each(l.getLayers(), function(f){
               f.feature.name = $('#aoi-name').val();
               boundaries.push(f.toGeoJSON());
           });
        });
    } else {
        log.error("No Map object found when trying to getBoundaries");
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

    var m = create_aois.aois._map;
    if (m && (m._container.id == 'map') && (m.hasLayer(create_aois.aois))){
        var maxPop = 0;

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
                    props.priority = parseInt((5 * props[numField]) / maxPop) || create_aois.priority_to_use;
                }
            });
        });
        create_aois.resetBoundaries();
    }
};

create_aois.setAllCellsTo = function (num){
    num = num || create_aois.priority_to_use;

    var m = create_aois.aois._map;
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
    var smooth_num = parseFloat($('#simplify_polys').val());

    _.each(shape_layers._layers,function(layer){
        var latlngs = layer.getLatLngs()[0];
        var points = [];
        _.each(latlngs,function(ll){points.push({x:ll.lng,y:ll.lat})});
        var smoothedPoints = L.LineUtil.simplify(points,smooth_num);
        var newPointsLL = [];
        _.each(smoothedPoints,function(ll){newPointsLL.push({lng:ll.x,lat:ll.y})});
        layer.setLatLngs([newPointsLL]);
    });

};

create_aois.initializeFileUploads = function(){
    var holder = document.getElementById('file_holder');

    if (typeof window.FileReader === 'undefined') {
        $("#option_shapefile").css('display','none');
    }

    holder.ondragover = function () { this.className = 'hover'; return false; };
    holder.ondragend = function () { this.className = ''; return false; };
    holder.ondrop = function (e) {
      this.className = '';
      e.preventDefault();

      var file = e.dataTransfer.files[0], reader = new FileReader();

      reader.onload = function (event) {

          shp(reader.result).then(function(geojson){
              create_aois.createWorkCellsFromService(geojson,true);
          },function(a){
              log.log(a);
          });
      };
      reader.readAsArrayBuffer(file);

      return false;
    };
};