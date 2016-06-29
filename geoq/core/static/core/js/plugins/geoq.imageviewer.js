/*
 Imageviewer plugin for geoq
 Used to display images from server , and allow user to filter them in a customized manner

 NOTE: Requires a number of JS libraries and CSS files

 TODO: Show Workcell as highest vis layer
 TODO: Allow this class to be loaded multiple times in separate namespaces via closure
 TODO: Update pqgrid to v 2.0.4 to improve scrolling

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

imageviewer.schema = [
    {name: 'id', title: 'id', filter: 'hidden', show: 'small-table', index: 5, type: 'int', showSizeMultiplier: 0 },
    {name: 'url', title: 'URL', filter: 'hidden', type: 'string'},
    {name: 'image_id', title: 'ID', filter: 'options', show: 'small-table', index: 6, type: 'string', showSizeMultiplier: 3},
    {name: 'sensor', title: 'Sensor', filter: 'options', show: 'small-table', index: 1, type:'string',showSizeMultiplier: 2},
    {name: 'acq_date',title: 'Date Taken',filter: 'options', show: 'small-table', index: 2, type:'date',showSizeMultiplier: 2},
    {name: 'status', title: 'Done', filter: 'checkbox', show: 'small-table', index:3, type:'bool',showSizeMultiplier: 1}
];

imageviewer.finishImageUrl = null;

imageviewer.map = aoi_feature_edit.map;
imageviewer.layerHolder = null;
imageviewer.workcellGeojson = aoi_feature_edit.aoi_extents_geojson;

imageviewer.image_layer_group = null;

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

    function onEachFeature(feature, layer) {
        // If this feature has a property named popupContent, show it
        if (feature.popupContent) {
            layer.bindPopup(feature.popupContent);
        }
    }

    //Set up map and workcells
    if (!imageviewer.map && aoi_feature_edit && aoi_feature_edit.map) {
        imageviewer.map = aoi_feature_edit.map;
    }
    if (!imageviewer.workcellGeojson && aoi_feature_edit && aoi_feature_edit.aoi_extents_geojson) {
        imageviewer.workcellGeojson = aoi_feature_edit.aoi_extents_geojson;
    }

    //Set up GeoJSON layer
    if (imageviewer.map) {
        imageviewer.layerHolder = L.geoJson([], {
            onEachFeature: onEachFeature,
            style: imageviewer.polyToLayer,
            pointToLayer: imageviewer.pointToLayer
        }).addTo(imageviewer.map);
    } else {
        console.error("Imageviewer Plugin could not load layerHolder");
    }

    // Set up layers for overlays
    if (imageviewer.map) {
        imageviewer.image_layer_group = L.layerGroup();
        imageviewer.image_layer_group.lastHighlight = undefined;
        imageviewer.image_layer_group.addTo(imageviewer.map);
    }


};

imageviewer.addInitialImages = function () {
    _.each(aoi_feature_edit.workcell_images, function(data_row){
        var layer_id = data_row.sensor;
        var geo_json = JSON.parse(data_row.img_geom);
        var rings = [];
        _.each(geo_json.coordinates[0], function(point){
            rings.push(point);
        });

        //Convert the json output from saved images into the format the list is expecting
        var data = {
            options:{
                id: data_row.image_id,
                image_id: data_row.image_id,
                platformCode: data_row.platform, //TODO: Was this saved?
                image_sensor: data_row.sensor,
                maxCloudCoverPercentageRate : data_row.cloud_cover,
                ObservationDate: data_row.acq_date,
                value: data_row.nef_name,
                area: data_row.area,
                geometry: { rings: [rings]},
                status: data_row.status
            }
        };

        var layer_name = "Layer";
        if (footprints.layerNames && footprints.layerNames.length && footprints.layerNames.length >= layer_id) {
            layer_name = footprints.layerNames[layer_id];
        }
        imageviewer.newFeaturesArrived({features:[data]}, "[initial]", layer_id, layer_name);
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
    var imagelist = imageviewer.updateImageList();
    //var items_found = imageviewer.updateImageList(imagelist);
};

imageviewer.userMessage = function (text, color) {
    imageviewer.$error_div
        .html(text)
        .css({backgroundColor: color || ''})
        .delay(3000).fadeOut('slow');
};


imageviewer.updateImageList = function(options) {
    var width = 280;
    if (aoi_feature_edit.workcell_images && aoi_feature_edit.workcell_images.length) {
        var matched_list = aoi_feature_edit.workcell_images;
    } else {
        return [];
    }

    var flattened_list = [];
    for (var i = 0; i < matched_list.length; i++) {
        var feature = matched_list[i];
        var item = {};

        //Only store in the array items mentioned in the schema
        _.each(imageviewer.schema, function (schema_item) {
            var fieldToCheck = schema_item.name;
            var val = feature[fieldToCheck];

            if ((schema_item.type && schema_item.type == 'date') || (schema_item.filter && schema_item.filter == 'date-range')) {
                var date_format = null;
                if (schema_item.transform == 'day') {
                    val = val.substr(0, 4) + '-' + val.substr(4, 2) + '-' + val.substr(6, 2);
                    date_format = "YYYY-MM-DD";
                }
                var date_val = moment(val, date_format);
                if (date_val && date_val.isValid && date_val.isValid()) {
                    val = date_val.format('YYYY-MM-DD');
                }
            }

            if (schema_item.type && schema_item.type == 'bool') {
                val = (val == "true");
            }

            item[fieldToCheck] = val;
        });

        flattened_list.push(item);
    }


    //Update the grid
    if (imageviewer.$grid && imageviewer.$grid.css) {
        imageviewer.$grid.css({
            display: (flattened_list.length > 0) ? 'block' : 'none'
        });
        imageviewer.$grid.pqGrid("option", "dataModel", {data: flattened_list});
        $('#imageviewer-matching-count-total').text(flattened_list.length);
    }
    return flattened_list;
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
imageviewer.updateFootprintFilteredResults = function (options) {
    var matched_list = [];
    var total = aoi_feature_edit.workcell_images.length

    if (total == 0) return [];

    var workcellGeojson = imageviewer.workcellGeojson;

    //Flatten matched_list to show in data table
    var flattened_list = [];
    for (var i = 0; i < matched_list.length; i++) {
        var feature = matched_list[i];
        var item = {};

        //Only store in the array items mentioned in the schema
        _.each(imageviewer.schema, function (schema_item) {
            var fieldToCheck = schema_item.name;
            var val = feature[fieldToCheck] || feature.attributes[fieldToCheck] || feature._geojson[fieldToCheck];

            if ((schema_item.type && schema_item.type == 'date') || (schema_item.filter && schema_item.filter == 'date-range')) {
                var date_format = null;
                if (schema_item.transform == 'day') {
                    val = val.substr(0, 4) + '-' + val.substr(4, 2) + '-' + val.substr(6, 2);
                    date_format = "YYYY-MM-DD";
                }
                var date_val = moment(val, date_format);
                if (date_val && date_val.isValid && date_val.isValid()) {
                    val = date_val.format('YYYY-MM-DD');
                }
            }

            item[fieldToCheck] = val;
        });

        //Pull out the geometry
        item.geometry = {};
        if (feature.GeometryType) item.geometry.GeometryType = feature.GeometryType;
        if (feature.Geometry) item.geometry.Geometry = feature.Geometry;
        if (feature.geometry) item.geometry.geometry = feature.geometry;

        flattened_list.push(item);
    }

    //Update counts
    if (imageviewer.$matching_count) {
        imageviewer.$matching_count.text(matched_list.length);
        imageviewer.$matching_total.text(total);
    }
    imageviewer.matched = matched_list;
    imageviewer.matched_flattened = flattened_list;

    //Update the grid
    if (imageviewer.$grid && imageviewer.$grid.css) {
        imageviewer.$grid.css({
            display: (matched_list.length > 0) ? 'block' : 'none'
        });
        imageviewer.$grid.pqGrid("option", "dataModel", {data: flattened_list})
    }
    return matched_list;
};
imageviewer.addResultCount = function ($holder) {
    var $div = $("<div>")
        .css({fontWeight: 'bold'})
        .appendTo($holder);

    imageviewer.$matching_total = $("<span>")
        .attr({id: 'imageviewer-matching-count-total'})
        .text('0')
        .appendTo($div);
    $("<span>")
        .html(' images available')
        .appendTo($div);
};
imageviewer.addResultTable = function ($holder) {
    var $grid = $("<div>")
        .attr({id: "pq-image-grid"})
        .appendTo($holder);

    //Set up table
    var width = 275;
    //if (imageviewer.featureSelectFunction || imageviewer.featureSelectUrl) {
    //    width -= 40;
    //}
    var obj = {
        width: width, height: 180, editable: false, resizeable: true,
        flexHeight: true, topVisible: false, bottomVisible: false, flexWidth: true, numberCell: false
    };


    //Pull out just the columns that will be shown
    var columns = [];
    var column_count = 0;
    var cell_width = 25;

    // Add a 'Load' checkbox to each image
    columns.push({
        title: 'Load',
        type: 'checkBoxSelection',
        align: "center",
        sortable: false,
        width: cell_width,
        minWidth: cell_width,
        render: function (ui) {
            var rowData = ui.rowData;
            var imid = rowData["image_id"] || "unknown";
            var id = rowData["id"];

            return ("<input type='checkbox' id='show-checkbox-" + id + "' onclick='imageviewer.displayImage(\"" + id + "\", \"" + imid + "\")' />");
        }
    });
    column_count++;

    _.each(imageviewer.schema, function (schema_item) {
        if (schema_item.show && schema_item.show == 'small-table') {
            if (schema_item.filter && schema_item.filter == 'options') {
                columns.push({
                    title: schema_item.title || schema_item.name,
                    dataType: 'string',
                    dataIndx: schema_item.name,
                    width: cell_width * schema_item.showSizeMultiplier,
                    minWidth: cell_width * schema_item.showSizeMultiplier
                });
            }
            else if (schema_item.filter && schema_item.filter == 'checkbox') {
                columns.push({
                    title: schema_item.title || "",
                    type: 'checkBoxSelection',
                    dataIndx: schema_item.name,
                    cls: 'checkboxColumn',
                    align: "center",
                    sortable: false,
                    width:cell_width * schema_item.showSizeMultiplier,
                    render: function (ui) {
                        try {
                            var rowData = ui.rowData, dataIndx = ui.dataIndx;
                            var val = rowData["examined"];
                            var id = rowData["id"];

                            str = "";
                            if (val) {
                                str = "checked='checked'";
                            }
                        }
                        catch (exx) {
                            var laa = exx;
                        }
                        return "<input type='checkbox' " + str + " id='finish-checkbox-" + id + "' onclick='imageviewer.finishImage(\"" + id + "\")' />";
                    },
                    className: "checkboxColumn"
                })
            } else if (schema_item.filter && schema_item.filter == 'hidden') {
                // add a hidden column with the image id
                columns.push({
                    title: schema_item.title || "",
                    hidden: true,
                    dataIndx: schema_item.name,
                    sortable: false
                });
            }

            column_count += schema_item.showSizeMultiplier || 1;
        }
    });

    //Shrink them to fit width, apply showSizeMultiplier
    _.each(columns, function (column) {
        column.width = parseInt((width / column_count) - 10);
        if (column.showSizeMultiplier) column.width *= column.showSizeMultiplier;
    });

    //If featureSelectFunction exists as a function, have a checkbox
    obj.colModel = [];
//    if (imageviewer.featureSelectUrl || imageviewer.featureSelectFunction) {
//        obj.colModel = [
//            {
//                title: "Accept",
//                width: 10,
//                dataType: "string",
//                dataIndx: columns.length + 2,
//                editable: false,
//                sortable: false,
//                align: "center",
//                resizable: false,
//                render: function (ui) {
//                    var id = ui.rowIndx;
//                    var data = ui.data[id];
//
//                    var c1 = (data.status && data.status == 'Accepted') ? 'checked' : '';
//                    var c2 = (!data.status || (data.status && data.status == 'NotEvaluated')) ? 'checked' : '';
//                    var c3 = (data.status && data.status == 'RejectedQuality') ? 'checked' : '';
//
//                    var bg = '<input class="accept" id="r1-' + id + '" type="radio" name="acceptance-' + id + '" '+c1+' value="Accepted"/><label for="r1-' + id + '"></label>';
//                    bg += '<input class="unsure" id="r2-' + id + '" type="radio" name="acceptance-' + id + '" '+c2+' value="NotEvaluated"/>';
//                    bg += '<input class="reject" id="r3-' + id + '" type="radio" name="acceptance-' + id + '" '+c3+' value="RejectedQuality"/><label for="r3-' + id + '"></label>';
//
//                    return bg;
//                }
//            }];
//        obj.cellClick = function (evt, ui) {
//            var clicked_on = evt.srcElement;
//            if (!clicked_on) {
//                //Firefox
//                clicked_on = evt.originalEvent.target ? evt.originalEvent.target : false;
//                if (!clicked_on) {
//                    throw "imageviewer error - Could not determine what was clicked on using this browser";
//                }
//            }
//
//            if (clicked_on.nodeName != "INPUT") {
//                return; //Fires for row and for cell, nly want for cell
//            }
//            var $target = $("input:radio[name ='acceptance-" + ui.rowIndx + "']:checked");
//
//            var val = $target.val();
//            if (val && imageviewer.featureSelectUrl) {
//                var data_row = ui.dataModel.data[ui.rowIndx];
//                var image_id = data_row.image_id;
//
//                var inputs = {
//                    id: image_id,
//                    evaluation: val
//                };
//
//                //Apply all the above inputs to the url template to build out the final url
//                var proxy = leaflet_helper.proxy_path || '/geoq/proxy/';
//                var url_template = _.template(imageviewer.featureSelectUrl);
//                var url = url_template(inputs);
//
//                if (_.str.startsWith(url, 'http')) url = proxy + url;
//
//                var geometry = {
//                    "type": "Polygon",
//                    "coordinates": [[]]
//                };
//                _.each(data_row.geometry.geometry.rings[0], function(point) {
//                   geometry.coordinates[0].push(point);
//                });
//
//                var data = {
//                    image_id: data_row.image_id,
//                    nef_name: data_row.value,
//                    sensor: data_row.image_sensor,
//                    platform: data_row.layerId,
//                    cloud_cover: data_row.cloud_cover,
//                    acq_date: data_row.date_image,
//                    img_geom: JSON.stringify(geometry),
//                    area: 1,
//                    status: val,
//                    workcell: aoi_feature_edit.aoi_id
//                };
//
//                console.log(url);
//                $.ajax({
//                    type: "POST",
//                    url: url,
//                    data: data,
//                    dataType: "json",
//                    success: function (data) {
//                        console.log(data)
//                    }
//                });
//            } else if (val && imageviewer.featureSelectFunction) {
//                imageviewer.featureSelectFunction(ui, val);
//            }
//        };
//    }
    obj.colModel = obj.colModel.concat(columns);
    //obj.dataModel = {data: imageviewer.matched_flattened};

    $grid.pqGrid(obj);
    imageviewer.$grid = $grid;
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

imageviewer.displayImage = function(id, imageId) {
    var showImage = $('#show-checkbox-'+id).is(':checked');

    if (site_settings.image_server && site_settings.image_server["url"]) {
        var imageServer = site_settings.image_server["url"];
    } else {
        // let them know that we weren't able to find a server to retrieve images from
        console.log("No imagery server available, so unable to create layer");
        console.log("Look at the site_settings.image_server setting");
        return;
    }

    //TODO: figure out how we translate imageId to a layerId
    var layerId = imageId;


    if (showImage) {
        // if a layer for this image has already been created, then display it again.
        // else go ahead and create a WMS layer using a layer name we get from somewhere...
        var layerOptions = {};
        if (imageviewer.displayed_layers[layerId]) {
            imageviewer.displayed_layers[layerId].opacity = 1.0;
        } else {
            var url = imageServer + layerId;
            var outputLayer = new L.tileLayer.wms(url, layerOptions);
            outputLayer.addTo(imageviewer.map);
            imageviewer.displayed_layers[layerId] = outputLayer;
        }

    } else {
        // make sure we have a handle to the layer
        if (imageviewer.displayed_layers[layerId]) {
            imageviewer.displayed_layers[layerId].opacity = 0.0;
        }
    }
};


geoq.imageviewer = imageviewer;