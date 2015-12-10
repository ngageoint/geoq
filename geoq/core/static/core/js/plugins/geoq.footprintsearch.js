/*
 Footprints plugin for geoq
 Used to show a list of features from esri server that returns json, and allow user to filter them in a customized manner

 NOTE: Requires a number of JS libraries and CSS files

 TODO: Show Workcell as highest vis layer
 TODO: Allow this class to be loaded multiple times in separate namespaces via closure
 TODO: Update pqgrid to v 2.0.4 to improve scrolling

 TODO: MINOR: Cloud filter slider in middle, not at 10%

 */
var footprints = {};
footprints.title = "Footprint";
footprints.plugin_title = "Imagery Query";
footprints.accordion_id = "#layer-control-accordion";

footprints.$accordion = null;
footprints.$title = null;
footprints.$content = null;
footprints.$filter_holder = null;
footprints.$searchBox = null;
footprints.$matching_count = null;
footprints.$matching_total = null;
footprints.$error_div = null;

footprints.schema = [
    {name: 'image_id', id: true},
    {name: 'layerId', title: 'Platform', filter: 'options', show: 'small-table', showSizeMultiplier: 2},
    {name: 'image_sensor', title: 'Sensor', filter: 'options'},
    //TODO: Show image name as mouseover or small text field?
    {
        name: 'cloud_cover',
        title: 'Cloud%',
        type: 'integer',
        filter: 'slider-max',
        min: 0,
        max: 100,
        start: 10,
        show: 'small-table',
        sizeMarker: true
    },
    {name: 'status', title: 'Status', filter: 'options'},
    {
        name: 'date_image',
        title: 'Date Taken',
        type: 'date',
        filter: 'date-range',
        transform: 'day',
        show: 'small-table',
        showSizeMultiplier: 2,
        initialDateRange: 30,
        colorMarker: true
    },
    {
        name: 'value', title: 'NEF name', filter: 'textbox', onNotFound: function (name) {
        console.log("TODO: Load If not found: " + name)
    }
    }
];

footprints.url_template = 'http://server.com/arcgis/rest/services/ImageEvents/MapServer/req_{{layer}}/query?&geometry={{bounds}}&geometryType=esriGeometryEnvelope&spatialRel=esriSpatialRelIntersects&outFields=*&outSR=4326&f=json';
footprints.layerList = "1, 2, 3".split(', ');
footprints.layerNames = "Ground, Links, Sky".split(', ');
footprints.layerColors = "#00ff00, #ff0000, #0000ff".split(', ');

footprints.featureSelectFunction = function (feature) {
    console.log("Lookup more info on " + feature.name);
};
footprints.featureSelectUrl = null;
footprints.filters = {in_bounds: true, previously_rejected: false};
footprints.prompts = {};
footprints.features = [];

footprints.markerRadiusMax = 12;
footprints.markerColorMin = "#333333";
footprints.markerColorMax = "#ff9000";

footprints.map = aoi_feature_edit.map;
footprints.layerHolder = null;
footprints.workcellGeojson = aoi_feature_edit.aoi_extents_geojson;

footprints.init = function (options) {

    //Add a shim in to fill a jquery version gap
    if (typeof $.curCSS == "undefined") {
        $.curCSS = function (element, attrib, val) {
            $(element).css(attrib, val);
        }
    }

    if (options) footprints = $.extend(footprints, options);
    footprints.$accordion = $(footprints.accordion_id);
    footprints.buildAccordionPanel();

    function onEachFeature(feature, layer) {
        // If this feature have a property named popupContent, show it
        if (feature.popupContent) {
            layer.bindPopup(feature.popupContent);
        }
    }

    //Set up map and workcells
    if (!footprints.map && aoi_feature_edit && aoi_feature_edit.map) {
        footprints.map = aoi_feature_edit.map;
    }
    if (!footprints.workcellGeojson && aoi_feature_edit && aoi_feature_edit.aoi_extents_geojson) {
        footprints.workcellGeojson = aoi_feature_edit.aoi_extents_geojson;
    }

    //Set up GeoJSON layer
    if (footprints.map) {
        footprints.layerHolder = L.geoJson([], {
            onEachFeature: onEachFeature,
            style: footprints.polyToLayer,
            pointToLayer: footprints.pointToLayer
        }).addTo(footprints.map);
    } else {
        console.error("Footprint Plugin could not load layerHolder");
    }

    if (aoi_feature_edit.workcell_images && aoi_feature_edit.workcell_images.length) {
        footprints.addInitialImages();
    }
};
footprints.addInitialImages = function () {
    _.each(aoi_feature_edit.workcell_images, function(data_row){
        var layer_id = data_row.sensor;
        var geo_json = JSON.parse(data_row.img_geom);
        var rings = [];
        _.each(geo_json.coordinates[0], function(point){
            rings.push(point);
        });

        //Convert the json output from saved images into the format the list is expecting
        var data = {
            attributes:{
                id: data_row.image_id,
                image_id: data_row.image_id,
                layerId: data_row.platform, //TODO: Was this saved?
                image_sensor: data_row.sensor,
                cloud_cover : data_row.cloud_cover,
                date_image: data_row.acq_date,
                value: data_row.nef_name,
                area: data_row.area,
                status: data_row.status
            },
            geometry: {rings: [rings]}
        };

        var layer_name = "Layer";
        if (footprints.layerNames && footprints.layerNames.length && footprints.layerNames.length >= layer_id) {
            layer_name = footprints.layerNames[layer_id];
        }
        footprints.newFeaturesArrived({features:[data]}, "[initial]", layer_id, layer_name);
    });

};
footprints.buildAccordionPanel = function () {
    footprints.$title = leaflet_layer_control.buildAccordionPanel(footprints.$accordion, footprints.plugin_title);

    //Build Content Holder
    footprints.$content = $("<div>").appendTo(footprints.$title);

    footprints.addFilterPrompts(footprints.$content);

    footprints.addFilterButton(footprints.$content);

    //Build Toggled Filter Holder
    footprints.$filter_holder = $("<div>").css({display: 'none'}).appendTo(footprints.$title);

    //Show count of items returned
    footprints.addResultCount(footprints.$filter_holder);

    //For every item in the schema that has a filter, draw the filter chrome and link it to the item
    _.each(footprints.schema, function (schema_item) {
        if (schema_item.filter) {
            if (schema_item.filter == 'options') {
                schema_item.update = footprints.addFilterOptions(footprints.$filter_holder, schema_item);
            } else if (schema_item.filter == 'slider-max') {
                schema_item.update = footprints.addFilterSliderMax(footprints.$filter_holder, schema_item);
            } else if (schema_item.filter == 'date-range') {
                schema_item.update = footprints.addFilterDateMax(footprints.$filter_holder, schema_item);
            } else if (schema_item.filter == 'textbox') {
                schema_item.update = footprints.addFilterTextbox(footprints.$filter_holder, schema_item);
            }
        }
    });
    footprints.addWorkcellBounds(footprints.$filter_holder);
    if (footprints.showRejectOption) footprints.addRejectButton(footprints.$filter_holder);

    footprints.addResultTable(footprints.$filter_holder);
};
footprints.clamp = function (num, min, max) {
    return num < min ? min : (num > max ? max : num);
};
footprints.percent_range = function (value, start_min, start_max, end_min, end_max) {
    value = parseFloat(value);

    var start_pct = footprints.clamp(parseFloat(value - start_min) / parseFloat(start_max - start_min), 0, 1);
    return (parseFloat(start_pct) * parseFloat(end_max - end_min)) + parseFloat(end_min);
};
footprints.colorBlendFromAmountRange = function (color_start, color_end, amount, amount_min, amount_max) {
    var percent = (amount - amount_min) / (amount_max - amount_min);

    if (color_start.substring(0, 1) == "#") color_start = color_start.substring(1, 7);
    if (color_end.substring(0, 1) == "#") color_end = color_end.substring(1, 7);

    var s_r = color_start.substring(0, 2);
    var s_g = color_start.substring(2, 4);
    var s_b = color_start.substring(4, 6);
    var e_r = color_end.substring(0, 2);
    var e_g = color_end.substring(2, 4);
    var e_b = color_end.substring(4, 6);

    var n_r = Math.abs(parseInt((parseInt(s_r, 16) * percent) + (parseInt(e_r, 16) * (1 - percent))));
    var n_g = Math.abs(parseInt((parseInt(s_g, 16) * percent) + (parseInt(e_g, 16) * (1 - percent))));
    var n_b = Math.abs(parseInt((parseInt(s_b, 16) * percent) + (parseInt(e_b, 16) * (1 - percent))));
    var rgb = maths.decimalToHex(n_r) + maths.decimalToHex(n_g) + maths.decimalToHex(n_b);

    return "#" + rgb;
};

footprints.polyToLayer = function (feature) {
    var color;

    //Determine the Color of the points
    var size_field = {};
    if (footprints.colorMarker) {
        size_field = footprints.colorMarker;
    } else {
        size_field = _.find(footprints.schema, function (s) {
            return s.colorMarker
        });
        footprints.colorMarker = size_field;
    }
    if (size_field) {
        var size_max = size_field._max || size_field.max || 1000;
        var size_min = size_field._min || size_field.min || 0;
        var val = feature.properties[size_field.name] || feature[size_field.name] || size_min;
        if ((size_field.type && size_field.type == 'date') || (size_field.filter && size_field.filter == 'date-range')) {
            var date_val = val;
            var date_format = null;
            if (size_field.transform == 'day') {
                date_val = val.substr(0, 4) + '-' + val.substr(4, 2) + '-' + val.substr(6, 2);
                date_format = "YYYY-MM-DD";
            }
            date_val = moment(date_val, date_format);
            if (date_val && date_val.isValid()) val = date_val.unix();
        }
        var color_prime = footprints.markerColorMax;
        if (footprints.layerColors && feature.layer_id && feature.layer_id <= footprints.layerColors.length) {
            color_prime = footprints.layerColors[feature.layer_id];
        }
        color = footprints.colorBlendFromAmountRange(color_prime, footprints.markerColorMin, val, size_min, size_max);
    } else {
        color = footprints.markerColorMax;
    }

    return {
        fillColor: color,
        color: "#000",
        weight: 3,
        opacity: 0.5,
        fillOpacity: 0.5
    };
};

footprints.pointToLayer = function (feature, latlng) {
    var radius, color;

    //Determine the Size of the points
    var size_field = {};
    if (footprints.sizeMarker) {
        size_field = footprints.sizeMarker;
    } else {
        size_field = _.find(footprints.schema, function (s) {
            return s.sizeMarker
        });
        footprints.sizeMarker = size_field;
    }
    if (size_field) {
        var size_max = size_field._max || size_field.max || 1000;
        var size_min = size_field._min || size_field.min || 0;
        var val = feature.properties[size_field.name] || feature[size_field.name] || size_min;
        if ((size_field.type && size_field.type == 'date') || (size_field.filter && size_field.filter == 'date-range')) {
            var date_val = val;
            var date_format = null;
            if (size_field.transform == 'day') {
                date_val = val.substr(0, 4) + '-' + val.substr(4, 2) + '-' + val.substr(6, 2);
                date_format = "YYYY-MM-DD";
            }
            date_val = moment(date_val, date_format);

            if (date_val && date_val.isValid()) val = date_val.unix();
        }
        radius = footprints.percent_range(val, size_min, size_max, footprints.markerRadiusMax / 3, footprints.markerRadiusMax);
    } else {
        radius = footprints.markerRadiusMax;
    }

    //Determine the Color of the points
    size_field = {};
    if (footprints.colorMarker) {
        size_field = footprints.colorMarker;
    } else {
        size_field = _.find(footprints.schema, function (s) {
            return s.colorMarker
        });
        footprints.colorMarker = size_field;
    }
    if (size_field) {
        var size_max = size_field._max || size_field.max || 1000;
        var size_min = size_field._min || size_field.min || 0;
        var val = feature.properties[size_field.name] || feature[size_field.name] || size_min;
        if ((size_field.type && size_field.type == 'date') || (size_field.filter && size_field.filter == 'date-range')) {
            var date_val = val;
            var date_format = null;
            if (size_field.transform == 'day') {
                date_val = val.substr(0, 4) + '-' + val.substr(4, 2) + '-' + val.substr(6, 2);
                date_format = "YYYY-MM-DD";
            }
            date_val = moment(date_val, date_format);
            if (date_val && date_val.isValid()) val = date_val.unix();
        }

        var color_prime = footprints.markerColorMax;
        if (footprints.layerColors && feature.layer_id && feature.layer_id <= footprints.layerColors.length) {
            color_prime = footprints.layerColors[feature.layer_id];
        }
        color = footprints.colorBlendFromAmountRange(color_prime, footprints.markerColorMin, val, size_min, size_max);
    } else {
        color = footprints.markerColorMax;
    }

    var geojsonMarkerOptions = {
        radius: radius,
        fillColor: color,
        color: "#000",
        weight: 1,
        opacity: 1,
        fillOpacity: 0.8
    };

    return L.circleMarker(latlng, geojsonMarkerOptions);
};
footprints.userMessage = function (text, color) {
    footprints.$error_div
        .html(text)
        .css({backgroundColor: color || ''})
        .delay(3000).fadeOut('slow');
};
footprints.updateFootprintDataFromMap = function () {
    var proxy = leaflet_helper.proxy_path || '/geoq/proxy/';
    var url_template = _.template(footprints.url_template);
    var bounds = footprints.map.getBounds();

    //Do Ajax requests for each Layer in the LayerList
    var bbox_string = bounds.toBBoxString().replace(/,/gi, '%2C');

    var layers = footprints.layerList || [1];
    _.each(layers, function (layer, layer_id) {
        var inputs = {
            bounds: bbox_string,
            layers: "show:" + (footprints.layers || '0'),
            layer: layer,
            n: bounds._northEast.lat,
            s: bounds._southWest.lat,
            e: bounds._northEast.lng,
            w: bounds._southWest.lng
        };
        //If there are any WHERE clauses, add those in
        _.each(footprints.promptFields, function (field) {
            inputs[field.name] = footprints.expandPromptSettings(field);
        });

        //Apply all the above inputs to the url template to build out the final url
        var url = url_template(inputs);

        if (_.str.startsWith(url, 'http')) url = proxy + url;

        var layer_name = "Layer";
        if (footprints.layerNames && footprints.layerNames.length && footprints.layerNames.length >= layer_id) {
            layer_name = footprints.layerNames[layer_id];
        }

        console.log(url);
        $.ajax({
            url: url,
            type: 'json',
            success: function (data) {
                footprints.newFeaturesArrived(data, url, layer_id, layer_name);
            }
        });
    });
};
footprints.expandPromptSettings = function (field) {
    //If the prompt is a 'where', turns a comma-seperated list into a proper where clause
    var name = field.name;

    var field_values = _.find(footprints.prompts, function (f) {
            return f.name == name
        }) || field.default || '';
    var str = field_values;

    if (field_values.length > 0 && field.format && field.format == 'where') {
        str = 'WHERE=';
        var first = true;
        _.each(field_values.split(','), function (val) {
            val = _.str.trim(val);
            if (!first) {
                str = str + 'OR '
            }
            if (field.type == 'string') {
                str = str + name + ' LIKE %' + val + '% ';
            } else if (field.type == 'integer') {
                var compare = field.compare || '=';
                str = str + ' ' + name + compare + val + ' ';
            }
            first = false;
        });
    }
    return str;
};
footprints.newFeaturesArrived = function (data, url, layer_id, layer_name) {
    var returned = {};

    if (_.isObject(data)) {
        returned = data;
    } else {
        try {
            returned = JSON.parse(data);
        } catch (ex) {
            footprints.userMessage('Invalid JSON data returned from server', 'red');
        }
    }

    var field_id = _.find(footprints.schema, function (s) {
            return s.id
        }).name || "id";

    if (returned) {
        var count_added = 0;
        var features = returned.features || returned.results || [];

        if (features.length && ((features[0].attributes && features[0].attributes[field_id]) || features[0][field_id])) {
            //Valid features returned

            var found = false;

            //Check returned features against those already stored, and only add if new
            for (var i = 0; i < features.length; i++) {
                var feature = features[i];
                for (var j = 0; j < footprints.features.length; j++) {
                    if (feature.attributes[field_id]) {
                        if (feature.attributes[field_id] == footprints.features[j].attributes[field_id]) {
                            found = true;
                            break;
                        }
                    } else if (feature[field_id]) {
                        if (feature[field_id] == footprints.features[j][field_id]) {
                            found = true;
                            break;
                        }
                    } else {
                        console.log('Footprints Plugin - Incoming feature does not have a known ID.')
                    }
                }
                if (!found) {
                    footprints.features.push(feature);
                    count_added++;
                }
            }
            //If there are new items, run the update function if it exists on each schema entry
            if (count_added) {
                footprints.updateFeatureMinMaxes();

                //Add the feature to the map
                for (var i = 0; i < footprints.features.length; i++) {
                    var feature = footprints.features[i];
                    if (!feature._geojson) {
                        feature._geojson = footprints.convertFeatureToGeoJson(feature);
                        feature._geojson.layer_id = layer_id;
                        feature._geojson.layer_name = layer_name;

                        if (feature._geojson.geometry) {
                            footprints.layerHolder.addData(feature._geojson);
                            feature._marker = footprints.findMarkerByFeature(feature);
                            footprints.setOpacity(feature._marker, 0);
                        }
                    }
                }

                //Update the filter controls
                _.each(footprints.schema, function (schema_item) {
                    if (schema_item.update) schema_item.update();
                });
                footprints.showFilterBoxes();
                footprints.updateFootprintFilteredResults();
            }
            footprints.userMessage(count_added + ' new ' + footprints.title + 's added', 'yellow');
        } else if (features) {
            console.log('No Features found in this area from layer: ' + layer_name + ' (' + layer_id + ')');
        } else {
            footprints.userMessage('The Service returned an invalid response', 'red');
            console.log("Invalid feature types returned from url: " + url);
        }
    }
};
footprints.updateFeatureMinMaxes = function () {
    //If it's a number or date, find the min and max and save it with the schema

    _.each(footprints.schema, function (schema_item) {
        if (schema_item.min !== undefined && schema_item.max !== undefined) {
            schema_item._min = schema_item.min;
            schema_item._max = schema_item.max;
        } else {
            var min = Number.MAX_VALUE;
            var max = Number.MIN_VALUE;
            var update = false;

            if ((schema_item.type && schema_item.type == 'integer') || (schema_item.filter && schema_item.filter == 'slider-max')) {
                for (var i = 0; i < footprints.features.length; i++) {
                    var feature = footprints.features[i];
                    var val = feature.attributes[schema_item.name] || feature[schema_item.name];
                    val = parseFloat(val);
                    if (val > max) max = val;
                    if (val < min) min = val;
                    update = true;
                }
            } else if ((schema_item.type && schema_item.type == 'date') || (schema_item.filter && schema_item.filter == 'date-range')) {
                for (var i = 0; i < footprints.features.length; i++) {
                    var feature = footprints.features[i];
                    var val = feature.attributes[schema_item.name] || feature[schema_item.name];
                    var date_val = val;
                    var date_format = null;
                    if (schema_item.transform == 'day') {
                        date_val = val.substr(0, 4) + '-' + val.substr(4, 2) + '-' + val.substr(6, 2);
                        date_format = "YYYY-MM-DD";
                    }
                    date_val = moment(date_val, date_format);


                    if (date_val && date_val.isValid()) {
                        val = date_val.unix();  //Convert it to seconds to compare
                        if (val > max) max = val;
                        if (val < min) min = val;
                        update = true;
                    }
                }
            }
            if (update) {
                if (min < Number.MAX_VALUE) schema_item._min = min;
                if (max > Number.MIN_VALUE) schema_item._max = max;
            }
        }
    });
};
footprints.findMarkerByFeature = function (feature_search) {
    var field_id = _.find(footprints.schema, function (s) {
            return s.id
        }).name || "id";

    var marker_found = null;
    var markers = _.toArray(footprints.layerHolder._layers);

    for (var j = markers.length - 1; j >= 0; j--) {
        var marker = markers[j];
        if (marker.feature.properties[field_id]) {
            if (marker.feature.properties[field_id] == feature_search.attributes[field_id]) {
                marker_found = marker;
                break;
            }
        } else if (marker.feature[field_id]) {
            if (marker.feature[field_id] == feature_search[field_id]) {
                marker_found = marker;
                break;
            }
        }
    }
    return marker_found;
};
footprints.setOpacity = function (layer, amount) {
    if (!layer) return;

    if (layer.setStyle) {
        layer.setStyle({opacity: amount, fillOpacity: amount});
    } else if (layer.setOpacity) {
        layer.setOpacity(amount);
    }

    if (amount == 0) {
        if (layer._layers) {
            _.each(layer._layers, function (f) {
                $(f._icon).hide();
                if (f._shadow) {
                    $(f._shadow).hide();
                }
            });
        }
        if (layer.getContainer) {
            var $lc = $(layer.getContainer());
            $lc.zIndex(1);
            $lc.hide();
        } else if (layer._container) {
            $(layer._container).css('opacity', amount);
        }
    } else {
        if (layer._layers) {
            _.each(layer._layers, function (f) {
                $(f._icon).show().css({opacity: amount});
                if (f._shadow) {
                    $(f._shadow).show().css({opacity: amount});
                }
            });
        }
        if (layer.getContainer) {
            var $lc = $(layer.getContainer());
            $lc.show();
        } else if (layer._container) {
            var $lc = $(layer._container);
            $lc.css('opacity', amount);
        }
    }
};
footprints.popupContentOfFeature = function (feature) {
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

footprints.convertFeatureToGeoJson = function (feature) {
    var geojsonFeature = {
        "type": "Feature",
        "properties": feature.attributes,
        "popupContent": footprints.popupContentOfFeature(feature)
    };

    var field_id = _.find(footprints.schema, function (s) {
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
footprints.isFeatureInPolygon = function (feature, workcellGeojson) {
    var geo = feature.geometry;
    var in_poly = false;

    if (geo.x && geo.y) {
        in_poly = gju.pointInPolygon({"type": "Point", "coordinates": [geo.x, geo.y]}, workcellGeojson);
    } else if (geo.lat && geo.lng) {
        in_poly = gju.pointInPolygon({"type": "Point", "coordinates": [geo.lat, geo.lng]}, workcellGeojson);
    } else if (geo.rings[0]) {

        //Check if the shape (or all the points of the shape's boundary) is within the workcell
        for (var r = 0; r < geo.rings.length; r++) {
            if (gju.pointInPolygon({
                    "type": "Point",
                    "coordinates": [geo.rings[0][r][0], geo.rings[0][r][1]]
                }, workcellGeojson)) {
                in_poly = true;
                break;
            }
        }
        //Check if the center of the shape is within the workcell
        if (!in_poly) {
            var center = gju.centroid({"coordinates": geo.rings});
            if (gju.pointInPolygon(center, workcellGeojson)) {
                in_poly = true;
            }
        }

        //Check this the other way - is the workcell within the shape
        if (!in_poly) {
            var coords = footprints.workcellGeojson.coordinates[0][0];
            for (var r = 0; r < coords.length; r++) {
                if (gju.pointInPolygon({"type": "Point", "coordinates": coords[r]}, {
                        type: "Polygon",
                        coordinates: geo.rings
                    })) {
                    in_poly = true;
                    break;
                }
            }
        }

        //Check if the center of the workcell is within the shape
        if (!in_poly) {
            var center = gju.centroid(workcellGeojson);
            if (gju.pointInPolygon(center, {type: "Polygon", coordinates: geo.rings})) {
                in_poly = true;
            }
        }

    }
    return in_poly;

};
footprints.updateFootprintFilteredResults = function (options) {
    var matched_list = [];
    var total = footprints.features.length;

    if (total == 0) return [];

    var workcellGeojson = footprints.workcellGeojson;

    //Check every feature against filters, then exclude features that don't match
    for (var i = 0; i < footprints.features.length; i++) {
        var matched = true;
        var feature = footprints.features[i];

        //Check first if geometry is in bounds (if that's being checked for)
        if (feature.geometry && footprints.filters.in_bounds) {
            if (!footprints.isFeatureInPolygon(feature, workcellGeojson)) {
                matched = false;
            }
        }

        //Check if item has been rejected and rejects shouldn't be shown
        if (feature.attributes.status && feature.attributes.status == "RejectedQuality" && !footprints.filters.previously_rejected) {
            matched = false;
        }
        //TODO: Make sure previous data is returned from AOIs

        //Check through each filter to see if it's excluded
        if (matched) _.each(footprints.schema, function (schema_item) {
            if (schema_item.filter && matched) {
                var fieldToCheck = schema_item.name;
                var filterSetting = footprints.filters[fieldToCheck];
                var val = feature[fieldToCheck] || feature.attributes[fieldToCheck] || feature._geojson[fieldToCheck];

                if (typeof val != "undefined") {
                    //Check all possible options and see if the feature has that setting
                    if (schema_item.filter == 'options') {
                        var option_found = false;
                        for (var key in filterSetting) {
                            if (filterSetting[key] && (val == key)) {
                                option_found = true;
                                break;
                            }
                        }
                        if (!option_found) {
                            matched = false;
                        }
                    } else if (schema_item.filter == 'slider-max') {
                        if (parseFloat(val) > parseFloat(filterSetting)) {
                            matched = false;
                        }
                    } else if (schema_item.filter == 'date-range') {
                        var val_date = val;
                        var date_format = null;
                        if (schema_item.transform == 'day') {
                            val_date = val.substr(0, 4) + '-' + val.substr(4, 2) + '-' + val.substr(6, 2);
                            date_format = "YYYY-MM-DD";
                        } else if (schema_item.transform == 'thousands') {
                            //No problem if there are miliseconds in the field, moment should interpret it correctly
                        }
                        var feature_date = moment(val_date, date_format);
                        if (feature_date < filterSetting.startdate_moment ||
                            feature_date > filterSetting.enddate_moment) {
                            matched = false;
                        }
                    } else if (schema_item.filter == 'textbox') {
                        if (filterSetting && filterSetting.length && filterSetting.length > 3) {
                            if (val.toLowerCase().indexOf(filterSetting.toLowerCase()) == -1) {
                                matched = false;
                            }
                        }
                    }
                }
            }
        });

        var opacity = 0;
        if (matched) {
            matched_list.push(feature);
            opacity = 0.6;
        }
        footprints.setOpacity(feature._marker, opacity);
    }

    //Flatten matched_list to show in data table
    var flattened_list = [];
    for (var i = 0; i < matched_list.length; i++) {
        var feature = matched_list[i];
        var item = {};

        //Only store in the array items mentioned in the schema
        _.each(footprints.schema, function (schema_item) {
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
    if (footprints.$matching_count) {
        footprints.$matching_count.text(matched_list.length);
        footprints.$matching_total.text(total);
    }
    footprints.matched = matched_list;
    footprints.matched_flattened = flattened_list;

    //Update the grid
    if (footprints.$grid && footprints.$grid.css) {
        footprints.$grid.css({
            display: (matched_list.length > 0) ? 'block' : 'none'
        });
        footprints.$grid.pqGrid("option", "dataModel", {data: flattened_list})
    }
    return matched_list;
};
footprints.addResultCount = function ($holder) {
    var $div = $("<div>")
        .css({fontWeight: 'bold'})
        .appendTo($holder);
    footprints.$matching_count = $("<span>")
        .attr({id: 'footprints-matching-count'})
        .text('0')
        .appendTo($div);
    $("<span>")
        .html(' in map bounds. ')
        .appendTo($div);
    footprints.$matching_total = $("<span>")
        .attr({id: 'footprints-matching-count-total'})
        .text('0')
        .appendTo($div);
    $("<span>")
        .html(' match the below filters.')
        .appendTo($div);
};
footprints.addResultTable = function ($holder) {
    var $grid = $("<div>")
        .appendTo($holder);

    //Set up table
    var width = 300;
    if (footprints.featureSelectFunction || footprints.featureSelectUrl) {
        width -= 40;
    }
    var obj = {
        width: width, height: 180, title: "Matched " + footprints.title + "s", editable: false,
        flexHeight: false, topVisible: false, bottomVisible: false, flexWidth: true, numberCell: false
    };


    //Pull out just the columns that will be shown
    var columns = [];
    var column_count = 0;
    _.each(footprints.schema, function (schema_item) {
        if (schema_item.show && schema_item.show == 'small-table') {
            columns.push({
                title: schema_item.title || schema_item.name,
                dataType: 'string',
                dataIndx: schema_item.name,
                showSizeMultiplier: schema_item.showSizeMultiplier
            });
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
    if (footprints.featureSelectUrl || footprints.featureSelectFunction) {
        obj.colModel = [
            {
                title: "Accept",
                width: 10,
                dataType: "string",
                dataIndx: columns.length + 2,
                editable: false,
                sortable: false,
                align: "center",
                resizable: false,
                render: function (ui) {
                    var id = ui.rowIndx;
                    var data = ui.data[id];

                    var c1 = (data.status && data.status == 'Accepted') ? 'checked' : '';
                    var c2 = (!data.status || (data.status && data.status == 'NotEvaluated')) ? 'checked' : '';
                    var c3 = (data.status && data.status == 'RejectedQuality') ? 'checked' : '';

                    var bg = '<input class="accept" id="r1-' + id + '" type="radio" name="acceptance-' + id + '" '+c1+' value="Accepted"/><label for="r1-' + id + '"></label>';
                    bg += '<input class="unsure" id="r2-' + id + '" type="radio" name="acceptance-' + id + '" '+c2+' value="NotEvaluated"/>';
                    bg += '<input class="reject" id="r3-' + id + '" type="radio" name="acceptance-' + id + '" '+c3+' value="RejectedQuality"/><label for="r3-' + id + '"></label>';

                    return bg;
                }
            }];
        obj.cellClick = function (evt, ui) {
            var clicked_on = evt.srcElement;
            if (!clicked_on) {
                //Firefox
                clicked_on = evt.originalEvent.target ? evt.originalEvent.target : false;
                if (!clicked_on) {
                    throw "footprints error - Could not determine what was clicked on using this browser";
                }
            }

            if (clicked_on.nodeName != "INPUT") {
                return; //Fires for row and for cell, nly want for cell
            }
            var $target = $("input:radio[name ='acceptance-" + ui.rowIndx + "']:checked");

            var val = $target.val();
            if (val && footprints.featureSelectUrl) {
                var data_row = ui.dataModel.data[ui.rowIndx];
                var image_id = data_row.image_id;

                var inputs = {
                    id: image_id,
                    evaluation: val
                };

                //Apply all the above inputs to the url template to build out the final url
                var proxy = leaflet_helper.proxy_path || '/geoq/proxy/';
                var url_template = _.template(footprints.featureSelectUrl);
                var url = url_template(inputs);

                if (_.str.startsWith(url, 'http')) url = proxy + url;

                var geometry = {
                    "type": "Polygon",
                    "coordinates": [[]]
                };
                _.each(data_row.geometry.geometry.rings[0], function(point) {
                   geometry.coordinates[0].push(point);
                });

                var data = {
                    image_id: data_row.image_id,
                    nef_name: data_row.value,
                    sensor: data_row.image_sensor,
                    platform: data_row.layerId,
                    cloud_cover: data_row.cloud_cover,
                    acq_date: data_row.date_image,
                    img_geom: JSON.stringify(geometry),
                    area: 1,
                    status: val,
                    workcell: aoi_feature_edit.aoi_id
                };

                console.log(url);
                $.ajax({
                    type: "POST",
                    url: url,
                    data: data,
                    dataType: "json",
                    success: function (data) {
                        console.log(data)
                    }
                });
            } else if (val && footprints.featureSelectFunction) {
                footprints.featureSelectFunction(ui, val);
            }
        };
    }
    obj.colModel = obj.colModel.concat(columns);
    obj.dataModel = {data: footprints.matched_flattened};

    $grid.pqGrid(obj);
    footprints.$grid = $grid;
};
footprints.getFeatureFromTable = function (rowData) {

    var field_id = _.find(footprints.schema, function (s) {
            return s.id
        }).name || "id";

    var feature = null;
    for (var j = 0; j < footprints.features.length; j++) {
        feature = footprints.features[j];
        if (feature.attributes[field_id]) {
            if (feature.attributes[field_id] == rowData[field_id]) {
                break;
            }
        } else if (feature[field_id]) {
            if (feature[field_id] == rowData[field_id]) {
                break;
            }
        }
    }
    return feature;

};

footprints.addWorkcellBounds = function ($holder) {
    var $div = $("<div><b>Show items in workcell:</b> </div>")
        .appendTo($holder);
    $('<input>')
        .attr({type: 'checkbox', value: 'in-geo', checked: true})
        .css({fontSize: '12px', padding: '2px'})
        .on('change', function () {
            var val = $(this).attr('checked');
            footprints.filters.in_bounds = !!val;
            footprints.updateFootprintFilteredResults();
        })
        .appendTo($div);
};
footprints.addRejectButton = function ($holder) {
    var $div = $("<div><b>Show items previously rejected:</b> </div>")
        .appendTo($holder);
    $('<input>')
        .attr({type: 'checkbox', value: 'previously_rejected', checked: false})
        .css({fontSize: '12px', padding: '2px'})
        .on('change', function () {
            var val = $(this).attr('checked');
            footprints.filters.previously_rejected = !!val;
            footprints.updateFootprintFilteredResults();
        })
        .appendTo($div);
};
footprints.addFilterPrompts = function ($content) {
    _.each(footprints.promptFields || [], function (prompt_item) {
        $("<span>")
            .html((prompt_item.title || prompt_item.name) + ": ")
            .attr('title', prompt_item.popover)
            .appendTo($content);
        $("<input>")
            .val(prompt_item.default || '')
            .attr('title', prompt_item.popover)
            .css({minWidth: '100px', maxWidth: '120px'})
            .on('change', function (evt) {
                footprints.prompts[prompt_item.name] = evt.target.value;
            })
            .appendTo($content);
        $("<br>")
            .appendTo($content);
    });

};
footprints.addFilterTextbox = function ($holder, schema_item) {
    $("<div><b>Or search for specific " + footprints.title + ":</b></div>")
        .appendTo($holder);
    footprints.filters[schema_item.name] = '';

    $("<input>")
        .on('change', function (evt) {
            var val = evt.target.value;
            footprints.filters[schema_item.name] = val;

            var items_found = footprints.updateFootprintFilteredResults();
            //TODO: Specifically search for this one and ajax query to add it to results if not already in
            if ((items_found.length == 0) && schema_item.onNotFound) {
                schema_item.onNotFound(val);
            }
        })
        .appendTo($holder);

    //TODO: If text entered, ignore other filters
    //TODO: Build an autocomplete from possible values - using jquery.Select
    return null;
};
footprints.addFilterDateMax = function ($holder, schema_item) {
    $('<div><b>Filter By Dates:</b></div>').appendTo($holder);

    var $dateVals = $('<div>')
        .attr({id: 'filter-date-range'})
        .css({background: '#fff', cursor: 'pointer', padding: '5px 10px', border: '1px solid #ccc', float: null})
        .appendTo($holder);
    $('<i>')
        .addClass('icon-calendar')
        .html('&nbsp;')
        .appendTo($dateVals);
    $('<span>')
        .appendTo($dateVals);
    $('<b>')
        .addClass('caret')
        .appendTo($dateVals);

    footprints.filters[schema_item.name] = footprints.filters[schema_item.name] || {};

    function cb(start, end) {
        $dateVals.find('span').html(start.format('MMMM D, YYYY') + ' - ' + end.format('MMMM D, YYYY'));
        footprints.filters[schema_item.name].startdate_moment = start;
        footprints.filters[schema_item.name].enddate_moment = end;
        footprints.updateFootprintFilteredResults();
    }

    cb(moment().subtract(schema_item.initialDateRange || 30, 'days'), moment());

    $dateVals.daterangepicker({
        ranges: {
            'Today': [moment(), moment()],
            'Yesterday': [moment().subtract(1, 'days'), moment().subtract(1, 'days')],
            'Last 3 Days': [moment().subtract(2, 'days'), moment()],
            'Last 7 Days': [moment().subtract(6, 'days'), moment()],
            'Last 30 Days': [moment().subtract(29, 'days'), moment()],
            'This Month': [moment().startOf('month'), moment().endOf('month')],
            'Last 4 Months': [moment().subtract(120, 'days'), moment()]

        }
    }, cb);

    return null;
    //TODO: Build a sparkline that is selectable
};
footprints.showFilterBoxes = function (display) {
    display = display || "block";
    if (footprints.$filter_holder && footprints.$filter_holder.css) {
        footprints.$filter_holder.css({display: display});
    }
};
footprints.addFilterButton = function ($holder) {
    $('<button>')
        .addClass('btn btn-info')
        .attr({type: 'button'})
        .html('<i class="icon-filter"></i>&nbspLoad ' + footprints.title + ' within view extents')
        .on('click', function () {
            footprints.updateFootprintDataFromMap();
        })
        .appendTo($holder);
    footprints.$error_div = $('<div>')
        .html('')
        .css({fontStyle: 'italic'})
        .appendTo($holder);


};

footprints.addFilterSliderMax = function ($holder, schema_item) {
    var $slider = $('<div>')
        .appendTo($holder);

    var $cc = $('<div><b>Max ' + (schema_item.title || schema_item.name) + ':</b></div>')
        .appendTo($slider);
    var $cc_count = $('<span>')
        .html(" (" + (schema_item.start || 10) + ")")
        .appendTo($cc);

    footprints.filters[schema_item.name] = schema_item._max || schema_item.start || 10;

    var $input = $('<input>')
        .on('input', _.debounce(function () {
            footprints.filters[schema_item.name] = this.value;
            footprints.updateFootprintFilteredResults();
            $cc_count.html(" (" + this.value + ")")
        }, 50))
        .attr({val: schema_item.start || 10})
        .appendTo($slider);

    var update = function () {
        //Hide if there's no variable in options, so no reason to have a filter
        if (schema_item._max == schema_item._min) {
            $input
                .attr({val: schema_item._min})
                .hide();
        } else if (schema_item._max) {
            var min = schema_item.min !== undefined ? schema_item.min : schema_item._min || 0;
            var max = schema_item.max || schema_item._max;
            $input
                .attr({type: 'range', min: min, max: max})
                .show();
        }
    };
    update();
    return update;
};
footprints.addFilterOptions = function ($holder, schema_item) {
    var $options = $('<div>')
        .appendTo($holder);

    var fieldToUpdate = schema_item.name;
    footprints.filters[fieldToUpdate] = footprints.filters[fieldToUpdate] || {};

    var update = function () {
        if (footprints.features.length == 0) return;

        var $options_new = $('<div>');

        $('<div><b>Filter ' + (schema_item.title || schema_item.name) + ':</b></div>').appendTo($options_new);

        //Find the unique keys
        var option_items = {};
        var options = [];
        var option_ids = [];

        _.each(footprints.features, function (feature) {
            var val = feature[fieldToUpdate] || feature.attributes[fieldToUpdate] || feature._geojson[fieldToUpdate];
            if (val) {
                option_items[val] = feature._geojson ? feature._geojson.layer_id : true;
            }
        });
        if (option_items.length) {
            $options_new.show();
        } else {
            $options_new.hide();
        }
        for (var key in option_items) {
            options.push(key);
            option_ids.push(option_items[key]);
        }

        //For each possibility, show a checkbox
        _.each(options.sort(), function (option, option_id) {
            var $holder_div = $('<div>')
                .css({fontSize: '12px', padding: '4px', paddingRight: '10px', display: 'inline-block'});

            //Set and load the option
            var val = footprints.filters[fieldToUpdate][option];
            if (typeof val != "boolean") {
                val = true;
                footprints.filters[fieldToUpdate][option] = val;
            }

            $('<input>')
                .attr({type: 'checkbox', value: option, checked: val})
                .css({fontSize: '12px', padding: '2px'})
                .on('change', function () {
                    var val = $(this).attr('checked');
                    footprints.filters[fieldToUpdate][option] = !!val;
                    footprints.updateFootprintFilteredResults();
                })
                .appendTo($holder_div);

            //Hide ending if requested, then remove spaces
            var optionText = option;
            if (schema_item.hideSuffix && _.str.endsWith(optionText, schema_item.hideSuffix)) {
                optionText = optionText.substring(0, optionText.length - schema_item.hideSuffix.length);
            }
            optionText = _.str.trim(optionText);

            var $span = $('<span>')
                .html(optionText)
                .appendTo($holder_div);
            if (schema_item.color_by_layerid) {
                var layer_id = option_ids[option_id];
                if (footprints.layerColors && layer_id <= footprints.layerColors.length) {
                    $span
                        .css({backgroundColor: footprints.layerColors[layer_id]})
                }
            }
            $holder_div.appendTo($options_new);
        });
        $options.replaceWith($options_new);
    };
    update();
    return update;

};

geoq.footprints = footprints;