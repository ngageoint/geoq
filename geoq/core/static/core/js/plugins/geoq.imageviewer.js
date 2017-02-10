/*
 Imageviewer plugin for geoq
 Used to display images from server , and allow user to filter them in a customized manner

 NOTE: Requires a number of JS libraries and CSS files

 TODO: Show Workcell as highest vis layer
 TODO: Allow this class to be loaded multiple times in separate namespaces via closure

 */
var imageviewer = {};
imageviewer.title = "Images";
imageviewer.plugin_title = "Imagery Viewer";
imageviewer.accordion_id = "#layer-control-accordion";

imageviewer.$accordion = null;
imageviewer.$title = null;
imageviewer.$content = null;
imageviewer.$filter_holder = null;
imageviewer.$searchBox = null;
imageviewer.$matching_count = null;
imageviewer.$matching_total = null;
imageviewer.$error_div = null;
imageviewer.displayed_layers = {};

imageviewer.defaultFootprintStyle = {color: 'blue', weight: 1, opacity: 0.8, fillOpacity: 0.5};
imageviewer.hiddenFootprintStyle = {color: 'blue', weight: 1, opacity: 0, fillOpacity: 0};

imageviewer.schema = [
    {name: 'image_id', title: 'Id', id: true},
    {name: 'id', title: 'GeoQ Id' },
    {name: 'layerName', title: 'Name', show: 'small-table' },
    {name: 'format', title: 'Format' },
    {name: 'platformCode', title: 'Source' },
    {
        name: 'maxCloudCoverPercentageRate',
        title: 'Cloud%'
    },
    {name: 'status', title: 'Status'},
    {name: 'url', title: "Url"},
    {
        name: 'ObservationDate',
        title: 'Observe Date',
        show: 'small-table'
    }
];


imageviewer.finishImageUrl = null;

imageviewer.map = null;
imageviewer.layerHolder = null;
imageviewer.workcellGeojson = null;

imageviewer.image_layer_group = null;
imageviewer.footprint_layer_group = null;

imageviewer.init = function (options) {

    //Add a shim in to fill a jquery version gap
    if (typeof $.curCSS == "undefined") {
        $.curCSS = function (element, attrib, val) {
            $(element).css(attrib, val);
        }
    }

    if (options) imageviewer = $.extend(imageviewer, options);
    imageviewer.$accordion = $(imageviewer.accordion_id);
    imageviewer.buildAccordionPanel();

    //Set up map and workcells
    if (!imageviewer.map && aoi_feature_edit && aoi_feature_edit.map) {
        imageviewer.map = aoi_feature_edit.map;
    }
    if (!imageviewer.workcellGeojson && aoi_feature_edit && aoi_feature_edit.aoi_extents_geojson) {
        imageviewer.workcellGeojson = aoi_feature_edit.aoi_extents_geojson;
    }

    // Set up layers for overlays
    if (imageviewer.map) {
        imageviewer.image_layer_group = L.layerGroup();
        imageviewer.image_layer_group.lastHighlight = undefined;
        imageviewer.image_layer_group.addTo(imageviewer.map);

        imageviewer.footprint_layer_group = L.layerGroup();
        imageviewer.footprint_layer_group.lastHighlight = undefined;
        imageviewer.footprint_layer_group.addTo(imageviewer.map);
    }

    // Now load initial data
    imageviewer.addInitialImages();

};

imageviewer.addInitialImages = function () {
    var accepted_images = _.where(aoi_feature_edit.workcell_images, {status: 'Accepted'});
    _.each(accepted_images, function(data_row){
        var layer_id = data_row.sensor;
        var geo_json = JSON.parse(data_row.img_geom);
        var rings = [];
        _.each(geo_json.coordinates[0], function(point){
            rings.push(point);
        });

        //Convert the json output from saved images into the format the list is expecting
        var data = {
            options:{
                id: data_row.id,
                image_id: data_row.image_id,
                platformCode: data_row.platform,
                image_sensor: data_row.sensor,
                format: data_row.format,
                maxCloudCoverPercentageRate : data_row.cloud_cover,
                ObservationDate: data_row.acq_date,
                layerName: data_row.nef_name,
                area: data_row.area,
                geometry: { rings: [rings]},
                status: data_row.status,
                url: data_row.url
            }
        };

        imageviewer.populateTable(data);

        // now add footprint to map, but not shown
        var style = imageviewer.defaultFootprintStyle;
        var footprint = ogc_csw.createPolygonFromGeometry(data.options.geometry, data.options, imageviewer.defaultFootprintStyle);

        imageviewer.footprint_layer_group.addLayer(footprint);
        imageviewer.hideFootprint(footprint);
    });

};

imageviewer.buildAccordionPanel = function () {
    imageviewer.$title = leaflet_layer_control.buildAccordionPanel(imageviewer.$accordion, imageviewer.plugin_title);

    //Build Content Holder
    imageviewer.$content = $("<div>").appendTo(imageviewer.$title);

    //imageviewer.addFilterPrompts(imageviewer.$content);

    //imageviewer.addFilterButton(imageviewer.$content);

    //Build Toggled Filter Holder
    imageviewer.$filter_holder = $("<div>").appendTo(imageviewer.$title);

    //Show count of items returned
    imageviewer.addResultCount(imageviewer.$filter_holder);

    imageviewer.addResultTable(imageviewer.$filter_holder);

};

imageviewer.userMessage = function (text, color) {
    imageviewer.$error_div
        .html(text)
        .css({backgroundColor: color || ''})
        .delay(3000).fadeOut('slow');
};

imageviewer.hideFootprint = function (layer) {
    layer.setStyle(imageviewer.hiddenFootprintStyle);
    layer.bringToBack();
    layer.unbindPopup();
};

imageviewer.unhideFootprint = function (layer) {
    layer.setStyle(imageviewer.defaultFootprintStyle);
    layer.bringToFront();
    var title = layer.options['layerName'] || layer.options['image_id'];
    layer.bindPopup("<p><a href='http://localhost:4000'>Open " + title + " with RemoteView</a></p>");
};

imageviewer.updateImageFootprints = function (images) {
    //Add the feature to the map
    _.each(images, function(image) {
        if (image.img_geom) {
            if (!image._geojson) {
                image._geojson = imageviewer.convertFeatureToGeoJson(image);
                image._geojson.layer_id = layer_id;
                image._geojson.layer_name = layer_name;

                if (image._geojson.geometry) {
                    imageviwer.layerHolder.addData(image._geojson);
                    //feature._marker = footprints.findMarkerByFeature(feature);
                    //footprints.setOpacity(feature._marker, 0);
                }
            }

        }

    });

};
imageviewer.convertFeatureToGeoJson = function (feature) {
    var geojsonFeature = {
        "type": "Feature",
        "properties": feature.attributes,
        "popupContent": footprints.popupContentOfFeature(feature)
    };

    var field_id = _.find(imageviewer.schema, function (s) {
        return s.id
    }).name || "id";

    geojsonFeature.name = feature[field_id] || feature.attributes[field_id];
    if (feature.geometry && feature.geometry.x && feature.geometry.y) {
        geojsonFeature.geometry = {
            "type": "Point",
            "coordinates": [feature.geometry.x, feature.geometry.y]
        }
    } else if (feature.geometry && feature.geometry.lat && feature.geometry.lng) {
        geojsonFeature.geometry = {
            "type": "Point",
            "coordinates": [feature.geometry.lat, feature.geometry.lng]
        }
    } else if (feature.geometry && feature.geometry.rings && feature.geometry.rings[0]) {
        var poly = [];
        _.each(feature.geometry.rings[0], function (ring) {
            poly.push([ring[0], ring[1]]);
        });
        geojsonFeature.geometry = {
            "type": "Polygon",
            "coordinates": [poly]
        }
    }
    return geojsonFeature;
};
imageviewer.popupContentOfFeature = function (feature) {
    var out = "";
    _.each(footprints.schema, function (schema_item) {
        var val = (feature.attributes[schema_item.name] || feature[schema_item.name]);
        var title = (schema_item.title || schema_item.name);

        if (val && schema_item.visualize == 'thumbnail') {
            var val_url = val;
            if (schema_item.linkField) {
                val_url = (feature.attributes[schema_item.linkField] || feature[schema_item.linkField]) || val;
            }
            out += "<a href='" + val_url + "' target='_blank'><img src='" + val + "' style='height:60'></a><br/>";
        } else if (val && schema_item.visualize == 'link') {
            var val_url = val;
            if (schema_item.linkField) {
                val_url = (feature.attributes[schema_item.linkField] || feature[schema_item.linkField]) || val;
            }
            out += "<b>" + title + ":</b> <a href='" + val_url + "' target='_blank'>Link</a><br/>";
        } else if (val && (schema_item.type && schema_item.type == 'date') || (schema_item.filter && schema_item.filter == 'date-range')) {
            var date_format = null;
            if (schema_item.transform == 'day') {
                val = val.substr(0, 4) + '-' + val.substr(4, 2) + '-' + val.substr(6, 2);
                date_format = "YYYY-MM-DD";
            }
            var date_val = moment(val, date_format);
            if (date_val && date_val.isValid && date_val.isValid()) {
                val = date_val.format('YYYY-MM-DD') + ' - ' + date_val.fromNow();
            }
            out += "<b>" + title + ":</b> " + val + "<br/>";
        } else if (schema_item.visualize == 'none') {
            //Skip showing it
        } else {
            if (val) {
                out += "<b>" + title + ":</b> " + val + "<br/>";
            }
        }
    });
    return out;
};

imageviewer.populateTable = function (data) {
    var $body = $('#imageviewer-list tbody')[0];

    _.each(data, function(d) {
        var $row = $('<tr>');
        $('<td>')
            .text(d.layerName)
            .appendTo($row);
        $('<td>')
            .text(d.ObservationDate)
            .appendTo($row);
        $('<td><input type="checkbox" onclick="imageviewer.showFootprint(this);" value="' + d.id + '"></td>')
            .appendTo($row);
        $('<td><input type="checkbox" onclick="imageviewer.showLayer(this);" value="' + d.id + '"></td>')
            .appendTo($row);
        $('<td><input type="checkbox" class="image-completed"></td>')
            .appendTo($row);
        $('<td style="display:none;">' + JSON.stringify(data.options) + '</td>')
            .attr('id', 'details-' + data.options.id)
            .appendTo($row);

        $row.appendTo($body);
    });

    // update counts
    $('#imageviewer-matching-count-completed').text('0');
    $('#imageviewer-matching-count-total').text($('#imageviewer-list tbody tr').length);
};

imageviewer.showFootprint = function(box) {
    var id = $(box).val();
    var layer = _.find(imageviewer.footprint_layer_group.getLayers(), function(o) { return o.options.id == id;});
    if ($(box).is(':checked')) {
        // show the layer
        if (layer) {
            imageviewer.unhideFootprint(layer);
        }
    } else {
        if (layer) {
            imageviewer.hideFootprint(layer);
        }
    }
};

imageviewer.showLayer = function(box) {
    var id = $(box).val();
    var details = JSON.parse($('#details-' + id).text()) || {};
    var layer = _.find(imageviewer.image_layer_group.getLayers(), function(o) { return o.options.id == id;});
    if ($(box).is(':checked')) {
        if (layer) {
            // layer was already loaded. Just display
            layer.setOpacity(1.0);
            if (remoteview_controller && remoteview_controller.connected) {
                remoteview_controller.onLoad(layer._url, layer.options.layers);
            }
        } else {
            if (details.url) {
                var layer = layerBuilder.buildLayer(details.format, details );
                if (layer) {
                    layer.options.id = id;
                    imageviewer.image_layer_group.addLayer(layer);
                    if (remoteview_controller && remoteview_controller.connected) {
                        remoteview_controller.onLoad(layer._url, layer.options.layers);
                    }
                }
            }
        }
    } else {
        if (layer && layer.setOpacity) {
            // hide the layer
            layer.setOpacity(0);

            // unload layer in RemoteView if connected
            if (remoteview_controller && remoteview_controller.connected) {
                remoteview_controller.fireHideEvent(layer);
            }

        }
    }

};

imageviewer.addResultCount = function ($holder) {
    var $div = $("<div>")
        .css({fontWeight: 'bold'})
        .appendTo($holder);

    imageviewer.$matching_total = $("<span>")
        .attr({id: 'imageviewer-matching-count-completed'})
        .text('0')
        .appendTo($div);
    $("<span>")
        .html(' out of ')
        .appendTo($div);
    $("<span>")
        .attr({id: 'imageviewer-matching-count-total'})
        .text('0')
        .appendTo($div);
    $("<span>")
        .html(' completed')
        .appendTo($div);
};

imageviewer.addResultTable = function ($holder) {
    //We can change the max height here when we are testing with many elements.
    var $grid = $("<div class='tableContainer' style='overflow-x:auto; overflow-y: auto; max-height: 400px'>" +
                  "<table class='tablesorter' id='imageviewer-list'><colgroup><thead><tr></tr></thead><tbody></tbody></table>")
        .appendTo($holder);

    var $row = $grid.find("tr");
    _.each( imageviewer.schema, function(item) {
        if (item.show && item.show === 'small-table') {
            var $header = $("<th>" + item.title + "</th>");
            if (item.type && item.type === 'hidden') {
                $header.hide();
            }
            $row.append($header);
        }
    });

    // Additional headers for images
    $row.append("<th>Show Footprint</th>");
    $row.append("<th>Show Layer Data</th>");
    $row.append("<th>Image Complete</th>");

    var $pager = $("<div id='pager' class='pager'><form><img src='/static/images/first.png' class='first' alt='First'/><img src='/static/images/prev.png' class='prev'/><span class='pagedisplay'></span><img src='/static/images/next.png' class='next'/><img src='/static/images/last.png' class='last'/></form></div>")
        .appendTo($holder);


    $("#imagelayer-list").trigger('update');

    var pagerOptions = {
        // target the pager markup - see the HTML block below
        container: $(".pager"),

        // Taken from the API Documentation
        // output string - default is '{page}/{totalPages}'
        // possible variables: {size}, {page}, {totalPages}, {filteredPages}, {startRow}, {endRow}, {filteredRows} and {totalRows}
        // also {page:input} & {startRow:input} will add a modifiable input in place of the value
        output: '{startRow:input} to {endRow}',

        // apply disabled classname (cssDisabled option) to the pager arrows when the rows
        // are at either extreme is visible; default is true
        updateArrows: true,

        // starting page of the pager (zero based index)
        page: 0,

        // Number of visible rows
        size: footprints.csw_max_records,

        // This is important due to the
        fixedHeight: false,

        // css class names of pager arrows
        cssNext: '.next', // next page arrow
        cssPrev: '.prev', // previous page arrow
        cssFirst: '.first', // go to first page arrow
        cssLast: '.last', // go to last page arrow
        cssGoto: '.gotoPage', // select dropdown to allow choosing a page

        cssPageDisplay: '.pagedisplay', // location of where the "output" is displayed
        cssPageSize: '.pagesize', // page size selector - select dropdown that sets the "size" option
        cssDisabled: ''
    };

    $(".tablesorter").tablesorter({
        theme: 'blue',
        widgets: ['zebra','scroller'],
        widgetOptions: {
            //Sticky headers seems to have some sort of problem. Will h ave to come back to this as it is not pressing ATM.
            //stickyHeaders_attachTo : $('.tableContainer'),
            scroller_barWidth: null,
            scroller_rowHighlight: 'hover'
        }
    })

        // initialize the pager plugin
        // ****************************
        .tablesorterPager(pagerOptions)

        // and listen for page changes for us to get updated results
        .bind('pagerChange pageMoved', function(e,c) {
            //console.log("moved to page " + c.page);
        });

    $("#imagelayer-list").trigger('update');
    //Have to call this function
    $('#imagelayer-list').trigger('pageAndSize');


};

imageviewer.finishImage = function(id) {
    var fin = $('#finish-checkbox-'+id).is(':checked');
    var data = {'value':fin};

    $.ajax({
        type: "POST",
        url: imageviewer.finishImageUrl.replace("{{id}}",id),
        data: data,
        dataType: 'json',
        success: function (data) {
            console.log(data)
        }
    });
};


geoq.imageviewer = imageviewer;