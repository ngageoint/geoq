//TODO: What should be done with lines uploaded from a shapefile? Does this cause things to break?
//TODO: How to assign users to a cell? Paintbrush?

var create_aois = {};
create_aois.colors = site_settings.priority_colors || ['#ff0000', '#00ff00', '#00BB00', '#008800', '#004400', '#001100'];
create_aois.helpText = site_settings.priority_text || ['unassigned', 'Highest', 'High', 'Medium', 'Low', 'Lowest'];
create_aois.map_object = null;
create_aois.aois = new L.FeatureGroup();
create_aois.priority_to_use = 5;
create_aois.draw_method = 'usng'; //This should be updated on page creation
create_aois.get_grids_url = ''; //This should be updated on page creation
create_aois.batch_redirect_url = '';
//create_aois.batch_prioritize_rand = "";  //Included as an example

create_aois.drawControl = null;
create_aois.deleteControl = null;
create_aois.removeControl = null;
create_aois.prioritizeControl = [];
create_aois.drawnItems = null;
create_aois.removeOrSplit = false;

create_aois.last_shapes = null;
create_aois.$feature_info = null;
create_aois.data_fields_obj = {};
create_aois.data_fields = [];
create_aois.highlightMode = 'delete';


function mapInit(map) {
    //Auto-called after leaflet map is initialized
    create_aois.map_object = map;
    setTimeout(function () {
        var startingBounds = site_settings.map_starting_bounds || [
            [52.429222277955134, -51.50390625],
            [21.043491216803556, -136.58203125]
        ];
        map.fitBounds(startingBounds);
    }, 1);

    create_aois.drawnItems = new L.FeatureGroup();
    map.addLayer(create_aois.drawnItems);

    map.on('zoomend', create_aois.mapWasZoomed);
    map.on('draw:created', create_aois.somethingWasDrawn);

    create_aois.addDrawingControls(map);
    create_aois.addLocatorControl(map);
    create_aois.addPrioritizeControls(map);
    create_aois.addDeleteControls(map);
//    create_aois.buildPriorityBoxes(map);
    create_aois.setupStatusControls(map);
    $('div.leaflet-left div.leaflet-draw.leaflet-control').find('a').popover({trigger: "hover", placement: "right"});
    $('div.leaflet-right div.leaflet-draw.leaflet-control').find('a').popover({trigger: "hover", placement: "left"});

    create_aois.map_updates();
}

create_aois.init = function () {
    var $usng = $('#option_usng').click(function () {
        create_aois.draw_method = 'usng';
        create_aois.get_grids_url = '/geoq/api/geo/usng';
        $('#poly_split_holder').hide();
        $('#file_uploader_holder').hide();
        $('a.leaflet-draw-draw-polygon').hide();
        $('a.leaflet-draw-draw-rectangle').show();
        create_aois.disableToolbars();
    }).popover({
        title: "Zoom in",
        content: "Zoom in to City level or below in the US to create USNG cells",
        trigger: "hover",
        placement: "bottom",
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
        title: "Zoom in",
        content: "Zoom in to City level or below",
        trigger: "hover",
        placement: "bottom",
        container: 'body'
    });
    $('#option_polygon').click(function () {
        create_aois.draw_method = 'polygon';
        create_aois.get_grids_url = '/geoq/api/geo/usng';
        $('#poly_split_holder').css('display', 'inline-block');
        $('#file_uploader_holder').hide();
        $('a.leaflet-draw-draw-polygon').show();
        $('a.leaflet-draw-draw-rectangle').show();
        create_aois.disableToolbars();
    });

    $('#option_shapefile').click(function () {
        create_aois.draw_method = 'polygon';
        create_aois.get_grids_url = '/geoq/api/geo/usng';
        $('#file_uploader_holder').css('display', 'inline-block');
        $('a.leaflet-draw-draw-polygon').hide();
        $('a.leaflet-draw-draw-rectangle').hide();
        $('#poly_split_holder').hide();
        create_aois.disableToolbars();
    });

    //This isn't really needed anymore as they start zoomed out
    if (create_aois.get_grids_url.indexOf('mgrs') > 0) {
        $mgrs.button("toggle");
        create_aois.draw_method = 'mgrs';
    } else {
        $usng.button("toggle");
        create_aois.draw_method = 'usng';
    }

    $("#poly_split_holder_select").on('change', function (ev) {
        var $n = $("#poly_split_n_cells");
        var $n_sized = $("#poly_split_n_sized_cells");
        if (ev.target.value == 'n_cells') {
            $n.show();
            $n_sized.hide();
        } else if (ev.target.value == 'n_sized_cells') {
            $n.hide();
            $n_sized.show();
        }
    });

    $("#file_holder_select").on('change', function (ev) {
        var $n = $("#holder_smooth_polys");
        var $n2 = $("#holder_points_polys");
        if (ev.target.value == 'holder_smooth') {
            $n.show();
            $n2.hide();
        } else if (ev.target.value == 'holder_points') {
            $n.hide();
            $n2.show();
        }
    });

    $("#file_holder_edit_btn").click(function () {
        var $n = $("#holder_smooth_polys");
        var $n2 = $("#file_holder_edit_btn");
        if ($n.css('display') != 'none') {
            if (create_aois.last_shapes) {
                create_aois.smoothWorkCells(create_aois.last_shapes);
            }
        } else if ($n2.css('display') != 'none') {
            var num_point_size = parseInt($('#holder_points_polys_num').val()) || 100;
            var geoJSON = create_aois.turnPointsToPolys(num_point_size);
            create_aois.createWorkCellsFromService(geoJSON);
        }
    });

    $("#holder_smooth_polys").popover({
        title: "Smooth points in a Polygon",
        content: "If your polygon is very complex, it will be much faster for everyone if you smooth the points down. The smoothing amount is in meters, and will remove points that are within that distance of each other.",
        placement: "bottom",
        trigger: "hover",
        container: 'body'
    });

    // only create geocompletion if we're able to load the appropriate javascript file
    if (google && google.maps) {
        $("#geocomplete").geocomplete()
            .bind("geocode:result", function (event, result) {
                create_aois.update_info("Geocode Result: " + result.formatted_address);
                if (create_aois.map_object) {
                    create_aois.map_object.setView([result.geometry.location.lat(), result.geometry.location.lng()], 13);
                    create_aois.map_object.fire('zoomend');
                }
            })
            .bind("geocode:error", function (event, status) {
                create_aois.update_info("Geocode Error: " + status);
            })
            .bind("geocode:multiple", function (event, results) {
                create_aois.update_info("Geocode Multiple: " + results.length + " results found");
            });
    } else {
        $("#geocomplete").attr('disabled', true);
    }

    $("#find").click(function () {
        $("#geocomplete").trigger("geocode");
    });

    $("#save-aois-button").on('click', function () {
        var boundaries = create_aois.getBoundaries();

        if (boundaries) {
            create_aois.update_info("Saving work cells to server");
            $("#save-aois-button")
                .attr('disabled', true)
                .text('Sending cells to server...');
            $.post(create_aois.save_url,
                {aois: JSON.stringify(boundaries), csrftoken: geoq.csrftoken},
                function (data, textStatus) {
                    log.log("Batch creating service - Got response: " + textStatus);
                    window.location.href = create_aois.batch_redirect_url;
                });
        }
    });

    $("#prioritize-aois-clear-button").on('click', function () {
        create_aois.removeAllFeatures();
    });

    $("#prioritize-selector").on('change select', function (option) {
        var field = option.target.value;
        if (field) {
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
            if (field == "--select--" || field == "add cells first") {
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

    _.each([1, 2, 3, 4, 5], function (num) {
        var $bottomBtn = $("#prioritize-aois-" + num + "-button");
        $bottomBtn
            .on('click', function () {
                create_aois.setAllCellsTo(num);
            })
            .css({backgroundColor: create_aois.colors[num], backgroundImage: 'none'});
        $bottomBtn.css({color: (num > 2) ? 'white' : 'black'});
    });

    $("#reset-from-textarea-button").on('click', function () {
        var $aois = $("#current-aois");
        var data = $aois.val() || [];
        data = '{"type":"FeatureCollection","features":' + data + '}';
        try {
            data = JSON.parse(data);
            create_aois.createWorkCellsFromService(data);
            $aois.css('backgroundColor', 'lightgreen');
            create_aois.resetBoundaries();
        } catch (ex) {
            create_aois.update_info("Couldn't parse text inside CurrentAOIs text box");
            $aois.css('backgroundColor', 'red');
        }
    });

    $("#prioritize-reverse").click(create_aois.reversePriorities);

    $("#show-geojson-textarea").click(function () {
        $("#geojson-textarea").show();
        $("#show-geojson-textarea").hide();
    });

    create_aois.initializeFileUploads();
};

//
create_aois.splitWorkcell = function(){

    var $n = $("#poly_split_n_cells");
    var $n_sized = $("#poly_split_n_sized_cells");
    var num = 1;
    var splitIntoSized = false;
    if ($n.css('display') != 'none') {
        num = parseInt($("#split_number").val());
        splitIntoSized = false;
    } else if ($n_sized.css('display') != 'none') {
        num = parseInt($("#split_sized").val());
        splitIntoSized = true;
    }

    if (num > 0) {
        if (create_aois.last_polygon_workcells) {
            create_aois.removeFeatures(create_aois.last_polygon_workcells);
        }
        var geoJSON = create_aois.splitPolygonsIntoSections(create_aois.last_polygon_drawn, num, splitIntoSized);

        var data = {"type": "FeatureCollection", "features": geoJSON};
        create_aois.last_polygon_workcells = create_aois.createWorkCellsFromService(data);
    }

};

create_aois.removeFeatures = function (e) {
    _.each(e._layers, function (layer) {
        create_aois.removeFeature(layer);
    });
};

create_aois.map_updates = function () {
    var layers = _.filter(map_layers.layers, function (l) {
        return l.type == "WMS" || l.type == "KML";
    });

    var overlayMaps = {
        "No Overlays": L.layerGroup([])
    };

    _.each(layers, function (layer) {
        if (layer.displayInLayerSwitcher) {
            if (layer.type == "WMS") {
                var mywms = L.tileLayer.wms(layer.url, {
                    layers: layer.layer,
                    format: layer.format,
                    transparent: layer.transparent,
                    attribution: layer.attribution
                });
                overlayMaps[layer.name] = mywms;
            }
            else if (layer.type == "KML") {
                mykml = new L.KML(layer.url, {
                    layers: layer.layer,
                    format: layer.format,
                    transparent: layer.transparent,
                    attribution: layer.attribution
                });
                overlayMaps[layer.name] = mykml;
            }
        }
    });

    if (layers && layers.length) {
        L.control.layers(overlayMaps).addTo(create_aois.map_object);
    }
};



create_aois.addLocatorControl = function (map) {

    var $map_move_info_update = $('<h4 class="location_info">Location Info</h4>');

    var infoButtonOptions = {
        html: $map_move_info_update,
        position: 'bottomleft', /* The position of the control */
        hideText: false,  // bool
        maxWidth: 60,  // number
        doToggle: false,  // bool
        toggleStatus: false  // bool
    };
    var infoButton = new L.Control.Button(infoButtonOptions).addTo(map);

    map.on('mousemove click', function (e) {
        var ll = e.latlng;

        var pt = maptools.locationInfoString({lat: ll.lat, lng: ll.lng, separator: "<br/>", boldTitles: true});

        //Build text output to show in info box
        var country = pt.country.name_long || pt.country.name || "";
        var text = pt.usngCoords.usngString + "<br/><b>Lat:</b> " + pt.lat + "<br/><b>Lon:</b> " + pt.lng;
        if (country) text += "<br/>" + country;
        if (pt.state && pt.state.name) text += "<br/>" + pt.state.name;

        $map_move_info_update.html(text);
    });

};
create_aois.createPolygonOptions = function (opts) {
    var options = {};

    if (opts.name) {
        options.title = opts.name;
    }

    options.allowIntersection = true;
    options.drawError = { color: '#b00b00', timeout: 1000};

    options.shapeOptions = opts.style || {borderColor: "black", backgroundColor: "brown"};
    options.showArea = true;
    options.id = opts.id;

    return options;
};
create_aois.addDrawingControls = function (map) {

    var polygon = {
        title: 'Freeform work cell',
        allowIntersection: true,
        drawError: {color: '#b00b00', timeout: 1000},
        shapeOptions: {borderColor: "black", backgroundColor: "brown"},
        showArea: true
    };

    L.drawLocal.draw.toolbar.actions.text = "Create";
    L.drawLocal.draw.toolbar.actions.title = "Create Workcell Boundary";

    var drawControl = new L.Control.Draw({
        draw: {
            position: 'topleft',
            rectangle: {
                shapeOptions: {
                    color: '#b00b00'
                }
            },
            polygons: [polygon],
            circle: false,
            polyline: false
        },
        edit: false
    });
    map.addControl(drawControl);
    create_aois.drawControl = drawControl;

    //Tweak Drawing Controls
    $('a.leaflet-draw-edit-edit').attr("title", "Click Workcell to delete it");
    $('a.leaflet-draw-draw-polygon').hide();


    create_aois.setDrawingControlColor();
};

create_aois.setDrawingControlColor = function () {
    //Find the create icons and color them
    var icons = $('div.leaflet-draw.leaflet-control').find('a');
    _.each(icons, function (icon_obj) {
        var $icon_obj = $(icon_obj);
        var icon_title = $icon_obj.attr('title') || $icon_obj.attr('data-original-title');
        if (icon_title == "Freeform work cell" || icon_title == "Draw a rectangle") {

            var color = create_aois.colors[create_aois.priority_to_use];
            $icon_obj.css('backgroundColor', color);
        }
    });
};
create_aois.addDeleteControls = function (map) {

    //Add Delete Control
    L.drawLocal.draw.toolbar.actions.text = "Delete";
    L.drawLocal.draw.toolbar.actions.title = "Remove Workcells within polygon";

    var polygon = create_aois.createPolygonOptions({id: 'delete', name: "Remove Workcells", style: {backgroundColor: 'red'}})

    var deleteControl = new L.Control.Draw({
        position: 'topright',
        draw: {
            rectangle: false,
            polygons: [polygon],
            circle: false,
            polyline: false
        },
        edit: false
    });
    map.addControl(deleteControl);
    create_aois.deleteControl = deleteControl;

    //Find the remove icon
    var icons = $('div.leaflet-draw.leaflet-control').find('a');
    _.each(icons, function (icon_obj) {
        var $icon_obj = $(icon_obj);
        var icon_title = $icon_obj.attr('title') || $icon_obj.attr('data-original-title');
        if (icon_title == "Remove Workcells") {
            $icon_obj
                .css('backgroundColor', "red");
        }
    });
};
create_aois.addPrioritizeControls = function (map) {

    //Add Delete Control
    L.drawLocal.draw.toolbar.actions.text = "Prioritize";
    L.drawLocal.draw.toolbar.actions.title = "Prioritize Workcells within polygon";

    var polyOptions = [];
    _.each([1, 2, 3, 4, 5], function (num) {
        var helpText = create_aois.helpText[num];
        var polygon = create_aois.createPolygonOptions({id: 'pri_' + num, name: "Prioritize " + num + ": " + helpText});
        polyOptions.push(polygon);
    });

    var prioritizeControl = new L.Control.Draw({
        position: 'topright',
        draw: {
            rectangle: false,
            polygons: polyOptions,
            circle: false,
            polyline: false
        },
        edit: false
    });
    map.addControl(prioritizeControl);
    create_aois.prioritizeControl = prioritizeControl;

    //Find the prioritize icons
    var icons = $('div.leaflet-draw.leaflet-control').find('a');
    _.each(icons, function (icon_obj) {
        var $icon_obj = $(icon_obj);
        var icon_title = $icon_obj.attr('title') || $icon_obj.attr('data-original-title');
        if (_.str.startsWith(icon_title, "Prioritize ")) {
            var num = parseInt(icon_title.split(" ")[1]);
            var color = create_aois.colors[num] || '';
            $icon_obj
                .css('backgroundColor', color)
                .on('click', function () {
                    create_aois.priority_to_use = num;
                    create_aois.setDrawingControlColor();
                });
        }
    });
};

create_aois.convertPolyToXY = function (poly) {
    var newPoly = [];
    _.each(poly, function (p) {
        newPoly.push({x: p[0], y: p[1]});
    });
    return newPoly;
};
create_aois.doSomethingWithOverlappingPolys = function (layer, funcToDo, noneMessage) {
    var countOverlaps = 0;
    if (create_aois.aois && create_aois.aois.getLayers()) {
        var deleteJson = layer.toGeoJSON();
        var selectPoly = deleteJson.geometry.coordinates[0];
        selectPoly = create_aois.convertPolyToXY(selectPoly);

        var existingCells = create_aois.getBoundaries(true);
        _.each(existingCells, function (cell) {
            var cellJSON = cell.toGeoJSON();  //TODO: Can be more efficient
            var cellPoly = cellJSON.geometry.coordinates[0][0];
            cellPoly = create_aois.convertPolyToXY(cellPoly);

            var intersects = intersectionPolygons(cellPoly, selectPoly);
            if (intersects && intersects.length) {
                funcToDo(cell);
                countOverlaps++;
            }
        });
    } else {
        create_aois.update_info(noneMessage || "No polygon to remove workcells from");
    }
    return countOverlaps;
};

create_aois.somethingWasDrawn = function (e) {
    var type = e.layerType,
        layer = e.layer;

    if (type == 'polygon-delete') {
        //User drew with delete control
        var func = function (cell) {
            create_aois.removeWorkcell(cell);
        };
        create_aois.doSomethingWithOverlappingPolys(layer, func);
    } else if (_.str.startsWith(type, "polygon-pri_")) {
        var num = parseInt(type.split("_")[1]);

        var func = function (cell) {
            cell.feature.properties.priority = num;
            cell.feature.priority = num;

            if (cell.setStyle) {
                cell.setStyle(create_aois.styleFromPriority(num));
            }

        };
        var count = create_aois.doSomethingWithOverlappingPolys(layer, func, "No existing polygon to change priorities of");
        create_aois.updateCellCount();
        create_aois.redrawStyles();

        if (count) create_aois.update_info(count + " workcell priorities updated");

    } else if (type === 'rectangle' || type === 'circle' || type === 'polygon-undefined') {
        if (create_aois.draw_method == "polygon") {
            //Using free-form polygon
            var geoJSON = create_aois.turnPolygonsIntoMultis(layer);
            create_aois.last_polygon_drawn = layer;

            var data = {"type": "FeatureCollection", "features": geoJSON};
            create_aois.last_polygon_workcells = create_aois.createWorkCellsFromService(data, false, true);

            create_aois.splitWorkcell();
        } else {
            //Using USNG or MGRS
            create_aois.update_info("Requesting Grid Information from the server");
            var bboxStr = layer.getBounds().toBBoxString();
            $.ajax({
                type: "GET",
                url: create_aois.get_grids_url,
                data: { bbox: bboxStr},
                contentType: "application/json",
                success: function (data) {
                    if (data && data.features && data.features.length) {
                        create_aois.createWorkCellsFromService(data);
                        if (create_aois.data_fields_obj && create_aois.data_fields_obj.daypop) {
                            $("#prioritize-selector").val('Daypop').change();
                        }
                    } else {
                        create_aois.update_info("No LANDSCAN Population data available here");
                    }
                },
                beforeSend: function () {
                    $("#map").css({
                        'cursor': 'wait'
                    });
                },
                complete: function () {
                    $("#map").css({
                        'cursor': 'default'
                    });
                },
                error: function (response) {
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
            create_aois.drawnItems.addLayer(layer);
        }
    }
    create_aois.updateCellCount();
};

create_aois.mapWasZoomed = function (e) {
    var zoom = create_aois.map_object.getZoom();
    var $usng = $("#option_usng");
    var $mgrs = $("#option_mgrs");
    var $poly = $("#option_polygon");

    var isCONUS = true;
    if (typeof maptools != "undefined") {
        var ll = e.target.getCenter();
        var pt = maptools.locationInfoString({lat: ll.lat, lng: ll.lng, separator: "<br/>", boldTitles: true});

        isCONUS = (pt.country && pt.state && pt.country.abbr == "USA" && pt.state.name != "Hawaii" && pt.state.name != "Alaska");
    }

    if (zoom > 8) {
        //Hide USNG Menu if it's outside CONUS
        $usng.attr('disabled', !isCONUS).text('USNG Cells (US only)');
        $mgrs.attr('disabled', false).text('MGRS Cells');
    } else {
        if ($usng.hasClass("active") || $mgrs.hasClass("active")) {
            $poly.click();
        }
        $usng.attr('disabled', true).text('Zoom in to use USNG/MGRS');
        $mgrs.attr('disabled', true).text('>');
    }
};
create_aois.buildPriorityBoxes = function (map) {
    _.each([1, 2, 3, 4, 5], function (num) {
        var helpText = create_aois.helpText[num];
        var $btn = $("<button>")
            .text(helpText + ' Priority (0)')
            .attr({id: 'priority-map-' + num})
            .css('width', '155px')
            .popover({
                title: 'Set Priority',
                content: 'The next cells you draw will have a priority of ' + num + ' (' + helpText + ')',
                trigger: 'hover',
                placement: 'left',
                container: 'body'
            });

        var help_control = new L.Control.Button({
            html: $btn,
            onClick: function () {
                create_aois.priority_to_use = num;
            },
            hideText: false,
            doToggle: false,
            toggleStatus: false,
            position: 'topright'
        });
        help_control.addTo(map);

        $btn.css({backgroundColor: 'inherit'});
        $btn.css({color: (num > 2) ? 'white' : 'black'});
        $btn.parent().css({backgroundColor: create_aois.colors[num]});
    });
};

create_aois.setupStatusControls = function (map) {
    create_aois.$feature_info = $('<div>')
        .addClass('feature_info');

    var status_control = new L.Control.Button({
        html: create_aois.$feature_info,
        hideText: false,
        doToggle: false,
        toggleStatus: false,
        position: 'bottomright'
    });
    status_control.addTo(map);
};

//TODO: Turn this into a Leaflet Plugin
create_aois.splitPolygonsIntoSections = function (layer, num, splitIntoSized) {
    var bounds = layer.getBounds();
    var left = bounds.getWest();
    var right = bounds.getEast();
    var north = bounds.getNorth();
    var south = bounds.getSouth();
    var width = right - left;
    var height = north - south;
    var slope = width / height;

    //Build an object that will be used for interior checking of points
    var layer_poly = {type: 'Polygon', coordinates: [
        []
    ]};
    var cs = layer.getLatLngs();
    _.each(cs, function (c) {
        layer_poly.coordinates[0].push([c.lng, c.lat]);
    });

    var x = 1;
    var y = 1;

    if (splitIntoSized) {
        //Divide by size of earth/meters
        x = parseInt(width * 111111.111 / num);
        y = parseInt(height * 111111.111 / num); //TODO: use COS to
    } else {
        //Determine what percentage of the poly is filled
        var fillPercentage = create_aois.determine_poly_fill_percentage(layer_poly, left, south, width, height);

        //Use the fillPercentage to determine how much of the target numbers should be grown
        num = num / fillPercentage;

        //Figure out how many x and y rows should be tried
        x = parseInt(Math.sqrt(num * slope));
        y = Math.round(num / x);
    }

    //Clamp to be between 1 and 40k work cells
    x = (x < 1) ? 1 : x > 200 ? 200 : x;
    y = (y < 1) ? 1 : y > 200 ? 200 : y;

    //When checking if cells are in a poly, check cells be subdividing by this amount
    var tessalationCheckAmount = 3;
    if ((x * y) > 50) tessalationCheckAmount = 2;
    if ((x * y) > 150) tessalationCheckAmount = 1;

    var x_slice = width / x;
    var y_slice = height / y;

    //Build the cells and remove ones that aren't in the original polygon
    var layers = [];
    var id_root = "handmade." + parseInt(Math.random() * 100000000);
    for (var x_num = 0; x_num < x; x_num++) {
        for (var y_num = 0; y_num < y; y_num++) {
            var id = id_root + "_" + x_num + "_" + y_num;

            var l0 = left + (x_slice * (x_num));
            var l1 = left + (x_slice * (x_num + 1));
            var t0 = south + (y_slice * (y_num));
            var t1 = south + (y_slice * (y_num + 1));

            //Build the square
            var coords = [
                [l0, t0],
                [l0, t1],
                [l1, t1],
                [l1, t0]
            ];

            var isBoxInPoly = true;
            if ((fillPercentage < 1) || (x > 3 && y > 3)) {
                //If it's a lot of boxes, test each one
                isBoxInPoly = false;

                //Break each box into smaller points and check the corners as well as those points to see if it's in the poly
                var coordsToCheck = _.clone(coords);
                var l_slice = (l1 - l0) / (tessalationCheckAmount + 2);
                var t_slice = (t1 - t0) / (tessalationCheckAmount + 2);

                for (var l_step = 1; l_step < (tessalationCheckAmount + 1); l_step++) {
                    for (var t_step = 1; t_step < (tessalationCheckAmount + 1); t_step++) {
                        coordsToCheck.push([l0 + (l_slice * l_step), t0 + (t_slice * t_step)]);
                    }
                }

                for (var c = 0; c < coordsToCheck.length; c++) {
                    var coord = coordsToCheck[c];
                    if (gju.pointInPolygon({coordinates: coord}, layer_poly)) {
                        isBoxInPoly = true;
                        break;
                    }
                }

            } else {
                isBoxInPoly = true;
            }

            //Add the closing first point as the last point
            coords.push(coords[0]);
            if (isBoxInPoly) {
                var feature = {"type": "Feature", "id": id,
                    "geometry_name": "the_geom", "properties": {priority: create_aois.priority_to_use},
                    "geometry": {"type": "MultiPolygon", "coordinates": [
                        [coords]
                    ]}};
                layers.push(feature);
            }
        }
    }

    return layers;
};
create_aois.determine_poly_fill_percentage = function (layer_poly, left, south, width, height) {
    //Determine what percentage of the poly is filled
    var fillPercentage;
    var coordsToCheck = [];
    var slices = 22;
    for (var x_num = 1; x_num < (slices - 1); x_num++) {
        for (var y_num = 1; y_num < (slices - 1); y_num++) {
            var l = left + ((width / slices) * x_num);
            var t = south + ((height / slices) * y_num);
            coordsToCheck.push([l, t]);
        }
    }
    var fillNum = 0;
    for (var c = 0; c < coordsToCheck.length; c++) {
        var coord = coordsToCheck[c];
        if (gju.pointInPolygon({coordinates: coord}, layer_poly)) fillNum++;
    }
    fillPercentage = fillNum / ((slices - 2) * (slices - 2)) - .02;
//    log.log((fillPercentage*100)+"% filled polygon drawn");
    fillPercentage = fillPercentage < .2 ? .2 : fillPercentage > .97 ? 1 : fillPercentage;

    return fillPercentage;
};

create_aois.turnPolygonsIntoMultis = function (layers) {
    //Convert from single polygon to multipolygon format
    if (!_.isArray(layers)) layers = [layers];
    var geoJSONFeatures = [];
    _.each(layers, function (layer) {

        var geoJSON;
        if (layer && layer.toGeoJSON) {
            geoJSON = layer.toGeoJSON();
        } else {
            geoJSON = layer || {};
        }
        if (!geoJSON.id) geoJSON.id = "handmade." + parseInt(Math.random() * 1000000);
        geoJSON.geometry_name = "the_geom";
        geoJSON.properties = geoJSON.properties || {};
        geoJSON.properties = _.extend(geoJSON.properties, {priority: create_aois.priority_to_use});
        if (geoJSON.geometry.type == "Polygon") {
            geoJSON.geometry.type = "MultiPolygon";
            geoJSON.geometry.coordinates = [geoJSON.geometry.coordinates];
        }
        geoJSONFeatures.push(geoJSON);

        //Set the style properly while we're here
        if (layer.setStyle) {
            layer.setStyle(create_aois.styleFromPriority(create_aois.priority_to_use));
        }
    });

    return geoJSONFeatures;
};

create_aois.disableToolbars = function () {
    if (create_aois.drawControl && create_aois.drawControl._toolbars) {
        var toolbars = _.toArray(create_aois.drawControl._toolbars);
        _.each(toolbars, function (t) {
            if (t.disable) t.disable();
        })
    }
};
create_aois.styleFromPriority = function (feature) {
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

create_aois.highlightFeature = function (e) {
    var layer = e.target;
    if (create_aois.highlightMode == 'delete') {
        if (layer.setStyle) {
            layer.setStyle({
                color: create_aois.colors[0],
                weight: 3,
                opacity: 1,
                fillOpacity: 1,
                fillColor: create_aois.colors[0]
            });
        } else {
            if (layer._icon) {
                layer.oldIcon = layer._icon.getAttribute('src');
                layer.setIcon(L.icon({iconUrl: "/static/leaflet/images/red-marker-icon.png"}));
            }
        }
    }
     //Commenting this out to replace $feature_info with popup
    // if (layer.popupContent) {
    //     create_aois.update_info(layer.popupContent);
    // }
};


create_aois.update_info = function (html) {
    if (create_aois.$feature_info) {
        create_aois.$feature_info.html(html);
    }
};

create_aois.resetHighlight = function (e) {
    var layer = e.target;

    if (layer.setStyle) {
        var style = create_aois.styleFromPriority(layer.feature);
        layer.setStyle(style);
    } else {
        if (layer.oldIcon) {
            layer.setIcon(L.icon({iconUrl: layer.oldIcon}));
        }
    }
 //Commenting this out to replace $feature_info with popup
 //   create_aois.update_info("");
};

create_aois.splitOrRemove = function (e) {
    var layer = e.target;
    if(!create_aois.removeOrSplit){
        create_aois.splitFeature(layer);
    }
    else{
        create_aois.removeFeature(layer);
    }
}

create_aois.removeFeature = function (e) {
    for (var key in create_aois.aois._layers) {
        var layer = create_aois.aois._layers[key];
        if (e.target) {
            if (layer._layers[e.target._leaflet_id]) {
                layer.removeLayer(e.target);
            }
        } else if (e._leaflet_id) {
            if (layer._layers[e._leaflet_id]) {
                layer.removeLayer(e);
            }
        }
    }
    create_aois.updateCellCount();
};
create_aois.splitFeature = function (layer) {
    var layerParent;
    //var layer = e.target;

    for (var key in create_aois.aois._layers) {
        if (create_aois.aois._layers[key]._layers[layer._leaflet_id]) {
            layerParent = create_aois.aois._layers[key];
        }
    }
    console.log(layerParent);

    if (layerParent) {
        var simplerLayer = _.toArray(layer._layers)[0];
        var layers = create_aois.splitPolygonsIntoSections(simplerLayer, 4);
        var properties = layer.feature.properties || {};
        var priority = properties.priority || create_aois.priority_to_use || 5;
        properties.priority = priority > 1 ? priority - 1 : 1;

        _.each(layers, function (l) {
            l.properties = properties;
        });
        layerParent.removeLayer(layer);
        layerParent.addData(layers);
    }

    create_aois.redrawStyles();
    create_aois.updateCellCount();
};


create_aois.createWorkCellsFromService = function (data, zoomAfter, skipFeatureSplitting) {

    if (!skipFeatureSplitting) {
        data.features = create_aois.turnPolygonsIntoMultis(data.features || data);
    }

    var features = L.geoJson(data, {
        style: function (feature) {
            //Test: If this isn't on each feature, do it onEachFeature below
            return create_aois.styleFromPriority(feature);
        },
        onEachFeature: function (feature, layer) {
            
            var popupContent = "";
            if (!feature.properties) {
                feature.properties = {};
            }
            if (_.isString(feature.properties.properties)) {
                try {
                    var newProps = JSON.parse(feature.properties.properties);
                    feature.properties = $.extend(feature.properties, newProps);
                    delete(feature.properties.properties);
                } catch (ex) {
                }
            }
            feature.priority = feature.properties.priority = parseInt(feature.properties.priority) || create_aois.priority_to_use;
            for (var k in feature.properties) {
                if (k != "priority") {
                    popupContent += "<b>" + k + ":</b> " + feature.properties[k] + "<br/>";

                    //Add fields to search if they are numeric
                    for (var key in feature.properties) {
                        if ($.isNumeric(feature.properties[key])) {
                            create_aois.data_fields_obj[key] = true;
                        }
                    }
                }
            }

            //Add Size information
            if (layer.getBounds) {
                var bounds = layer.getBounds();
                bounds._northWest = new L.LatLng(bounds._northEast.lat, bounds._southWest.lng);
                var width_m = bounds._northEast.distanceTo(bounds._northWest);
                var height_m = bounds._southWest.distanceTo(bounds._northWest);
                popupContent += "<b>Width:</b>: " + L.GeometryUtil.readableDistance(width_m, true) + "<br/>";
                popupContent += "<b>Height:</b>: " + L.GeometryUtil.readableDistance(height_m, true) + "<br/>";
                try {
                    var area = L.GeometryUtil.geodesicArea(layer.getLatLngs()[0]);
                    if (area > 990) {
                        area = area / 1000;
                        popupContent += "<b>Area:</b>: " + L.GeometryUtil.readableDistance(area, true) + " sq<br/>";
                    }
                } catch (ex) {
                }
            }
            layer.popupContent = popupContent;

            //TODO: Figure out why the layer does not have a map, causing openPopup to throw an error
            // layer.bindPopup(layer.popupContent).openPopup();

            layer.on({
                mouseover: create_aois.highlightFeature,
                mouseout: create_aois.resetHighlight,
                click: create_aois.splitOrRemove
            });
        }
    });

    if (features && !skipFeatureSplitting) {
        create_aois.aois.addLayer(features);
        create_aois.map_object.addLayer(create_aois.aois);

        if (zoomAfter) {
            create_aois.map_object.fitBounds(features.getBounds());
        }
        create_aois.last_shapes = features;
    }
    create_aois.updateCellCount();
    create_aois.redrawStyles();

    create_aois.buildFilterDropdown();

    return features;
};
create_aois.buildFilterDropdown = function () {
    var $prioritizeSelector = $('#prioritize-selector').empty();
    if (create_aois.data_fields_obj) {
        $('<option>')
            .text("--select--")
            .appendTo($prioritizeSelector);
        for (var key in create_aois.data_fields_obj) {
            if (key != "priority") {
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
create_aois.turnPointsToPolys = function (sizeWidth) {
    var geoJSONFeatures = [];

    var m = create_aois.map_object;
    if (m && (m._container.id == 'map') && (m.hasLayer(create_aois.aois))) {
        var sizer = sizeWidth / 111111.11 / 2;

        _.each(m._layers, function (layer) {
            var feature = layer.feature;
            if (feature && feature.geometry && feature.geometry.type == "Point") {

                var geoJSON;
                if (layer && layer.toGeoJSON) {
                    geoJSON = layer.toGeoJSON();
                } else {
                    geoJSON = layer || {};
                }
                if (!geoJSON.id) geoJSON.id = "handmade." + parseInt(Math.random() * 1000000);
                geoJSON.geometry_name = "the_geom";
                geoJSON.properties = geoJSON.properties || {};
                geoJSON.properties = _.extend(geoJSON.properties, {priority: create_aois.priority_to_use});
                if (geoJSON.geometry.type == "Point") {
                    geoJSON.geometry.type = "MultiPolygon";
                    var pointCoords = geoJSON.geometry.coordinates;
                    var square = [
                        [pointCoords[0] - sizer, pointCoords[1] - sizer],
                        [pointCoords[0] - sizer, pointCoords[1] + sizer],
                        [pointCoords[0] + sizer, pointCoords[1] + sizer],
                        [pointCoords[0] + sizer, pointCoords[1] - sizer],
                        [pointCoords[0] - sizer, pointCoords[1] - sizer]
                    ];
                    geoJSON.geometry.coordinates = [
                        [square]
                    ];
                }
                geoJSONFeatures.push(geoJSON);

                m.removeLayer(layer);
            }
        })
    }
    return geoJSONFeatures;
};

create_aois.updateCellCount = function () {
    var aoi_count = 0;
    var counts = [0, 0, 0, 0, 0, 0];
    //TODO: Have a count for points?

    _.each(create_aois.aois._layers, function (layergroup) {
        if (layergroup && layergroup._layers) {
            aoi_count += _.toArray(layergroup._layers).length;

            _.each(layergroup._layers, function (layer) {
                if (layer.feature && layer.feature.properties && layer.feature.properties.priority) {
                    var pri = layer.feature.properties.priority;
                    if (_.isNumber(pri) && pri > 0 && pri < 6) counts[pri]++;
                }
            });
        }
    });
    $('#num_workcells').text(aoi_count);
    $("#save-aois-button").attr('disabled', (aoi_count == 0));

    //Update Priority on-map Buttons
    _.each([1, 2, 3, 4, 5], function (num) {
        var $bottomBtn = $("#priority-map-" + num);
        var helpText = create_aois.helpText[num];

        var text = helpText + ' Priority: (' + counts[num] + ')';
        $bottomBtn.text(text);
    });

    //Fill in bottom text area with geojson
    var boundaries = JSON.stringify(create_aois.getBoundaries());
    if (boundaries == "false") boundaries = '{"message":"No cells entered"}';
    $('#current-aois')
        .val(boundaries);
};

create_aois.removeAllFeatures = function () {
    create_aois.data_fields_obj = {};
    create_aois.buildFilterDropdown();
    var m = create_aois.map_object;
    if (m && (m._container.id == 'map') && (m.hasLayer(create_aois.aois))) {
        _.each(m._layers, function (l) {
            if (l._layers || l._path) {
                m.removeLayer(l);
            }
        });
        create_aois.aois = new L.FeatureGroup();
    }
    create_aois.updateCellCount();
};

create_aois.redrawStyles = function () {
    var m = create_aois.map_object;
    if (m && (m._container.id == 'map') && (m.hasLayer(create_aois.aois))) {
        _.each(create_aois.aois.getLayers(), function (l) {
            _.each(l.getLayers(), function (f) {
                if (f.setStyle && f.feature) {
                    f.setStyle(create_aois.styleFromPriority(f.feature));
                }
            });
        });
    }
};

create_aois.removeWorkcell = function (cell) {
    var m = create_aois.map_object;
    if (m && (m._container.id == 'map') && (m.hasLayer(create_aois.aois))) {
        _.each(create_aois.aois.getLayers(), function (l) {
            if (l.hasLayer(cell)) l.removeLayer(cell);
        });
    }
};
create_aois.getBoundaries = function (useCellsInstead) {
    var boundaries = [];

    var featureName = $('#aoi-name').val();
    var m = create_aois.map_object;
    if (m && (m._container.id == 'map') && (m.hasLayer(create_aois.aois))) {
        _.each(create_aois.aois.getLayers(), function (l) {
            _.each(l.getLayers(), function (f) {
                f.feature.name = featureName;
                if (useCellsInstead) {
                    boundaries.push(f);
                } else {
                    boundaries.push(f.toGeoJSON());
                }
            });
        });
    }
    if (!boundaries.length) boundaries = false;

    return boundaries;
};

create_aois.resetBoundaries = function (data) {
    if (data == undefined) {
        data = create_aois.getBoundaries();
    }
    create_aois.removeAllFeatures();

    //Add back AOI Layers
    create_aois.createWorkCellsFromService(data);
};

create_aois.prioritizeCellsBy = function (numField) {
    numField = numField || "daypop";

    var m = create_aois.map_object;
    if (m && (m._container.id == 'map') && (m.hasLayer(create_aois.aois))) {
        var maxPop = 0;

        if (numField == "Random") {
            _.each(create_aois.aois.getLayers(), function (l) {
                _.each(l.getLayers(), function (featureHolder) {
                    var props = featureHolder.feature.properties;
                    props = props || {};
                    props.priority = Math.ceil(Math.random() * 5);
                });
            });
            return;
        }

        //Get the highest population count
        _.each(create_aois.aois.getLayers(), function (l) {
            _.each(l.getLayers(), function (featureHolder) {
                var props = featureHolder.feature.properties;
                props = props || {};

                if (props[numField]) {
                    if (props[numField] > maxPop) maxPop = props[numField];
                }
            });
        });

        //Group Priorities by 1/maxPops
        _.each(create_aois.aois.getLayers(), function (l) {
            _.each(l.getLayers(), function (featureHolder) {
                var props = featureHolder.feature.properties;
                props = props || {};

                if (props[numField]) {
                    props.priority = 6 - Math.ceil(5 * (props[numField] / maxPop)) || create_aois.priority_to_use;
                    if (featureHolder.setStyle) {
                        featureHolder.setStyle(create_aois.styleFromPriority(featureHolder.feature));
                    }
                }
            });
        });
        create_aois.updateCellCount();
    }
};
create_aois.reversePriorities = function () {
    var m = create_aois.map_object;
    if (m && (m._container.id == 'map') && (m.hasLayer(create_aois.aois))) {

        _.each(create_aois.aois.getLayers(), function (l) {
            _.each(l.getLayers(), function (featureHolder) {
                var props = featureHolder.feature.properties;
                props = props || {};

                if (props.priority) {
                    props.priority = 6 - props.priority;
                }
                if (featureHolder.setStyle) {
                    featureHolder.setStyle(create_aois.styleFromPriority(featureHolder.feature));
                }
            });
        });
    }
    create_aois.updateCellCount();

};

create_aois.setAllCellsTo = function (num) {
    num = num || create_aois.priority_to_use;

    var m = create_aois.map_object;
    if (m && (m._container.id == 'map') && (m.hasLayer(create_aois.aois))) {

        _.each(create_aois.aois.getLayers(), function (l) {
            _.each(l.getLayers(), function (featureHolder) {
                var props = featureHolder.feature.properties;
                props = props || {};
                props.priority = num;
            });
        });
        create_aois.resetBoundaries();
    }
};

create_aois.smoothWorkCells = function (shape_layers) {
    var smooth_num = parseInt($('#holder_smooth_num').val());
    if (!smooth_num) smooth_num = 500;

    //Convert meters to Lat/Long smoothing ratio
    //1 Longitude (at 48-Lat) ~= 75000m, 1 Latitude ~= 111111m, so using 80km as 1
    smooth_num = smooth_num / 80000;

    _.each(shape_layers._layers, function (layer) {
        var latlngs = layer.getLatLngs ? layer.getLatLngs() : null;
        if (latlngs && latlngs.length) {
            latlngs = latlngs[0];
            //Convert the points to a format the library expects
            var points = [];
            _.each(latlngs, function (ll) {
                points.push({x: ll.lng, y: ll.lat})
            });

            //Do the point smoothing
            var smoothedPoints = L.LineUtil.simplify(points, smooth_num);

            //Convert it back
            var newPointsLL = [];
            _.each(smoothedPoints, function (ll) {
                newPointsLL.push({lng: ll.x, lat: ll.y})
            });

            //Add the start point to close the poly
            newPointsLL.push(newPointsLL[0]);
            layer.setLatLngs([newPointsLL]);
        }
    });
};

create_aois.initializeFileUploads = function () {
    var holder = document.getElementById('file_holder');
    var $holder = $('#file_holder').popover({
        title: "Drag zipped shapefile or GeoJSON file here",
        content: "You can drag a .zip or .shp shapefile, or a .json GeoJSON file here. All polygons/multipolygons within will be created as work cells. Please make files as small as possible (<5mb).",
        trigger: "hover",
        placement: "bottom",
        container: 'body'
    });

    if (typeof window.FileReader === 'undefined') {
        $("#option_shapefile").css('display', 'none');
    }

    holder.ondragover = function () {
        this.className = 'hover';
        return false;
    };
    holder.ondragend = function () {
        this.className = '';
        return false;
    };
    holder.ondrop = function (e) {
        this.className = '';
        e.preventDefault();
        create_aois.update_info("Loading File...");
        $holder.css({backgroundColor: 'lightgreen'});

        var file = e.dataTransfer.files[0], reader = new FileReader();
        var extension = file.name.split('.').slice(-1)[0];

        reader.onload = function (event) {
            var size = "";
            if (event.loaded) {
                var kb = event.loaded / 1024;
                if (kb > 1000) {
                    kb = kb / 1024;
                    kb = parseInt(kb * 10) / 10;
                    size = kb + " mb";
                } else {
                    kb = parseInt(kb * 10) / 10;
                    size = kb + " kb";
                }
                $holder.text(size + " file loaded");
            }

            $holder.css({backgroundColor: ''});
            create_aois.update_info("Importing Shapes: " + size);

            if (extension === 'json') {
                create_aois.createWorkCellsFromService(JSON.parse(reader.result), true);
                create_aois.update_info("GeoJSON Imported");
            } else {
                shp(reader.result).then(function (geojson) {
                    create_aois.createWorkCellsFromService(geojson, true);

                    create_aois.update_info("Shapes Imported");
                }, function (a) {
                    log.log(a);
                });
            }

            $('#file_holder_edit_btn').attr('disabled', false);

        };

        if ( extension === 'json') {
            reader.readAsText(file);
        } else {
            reader.readAsArrayBuffer(file);
        }

        return false;
    };
};