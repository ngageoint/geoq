/*
 Footprints plugin for geoq
 Used to show a list of features from esri server that returns json, and allow user to filter them in a customized manner

 NOTE: Requires a number of JS libraries and CSS files

 TODO: Show Workcell as highest vis layer
 TODO: Allow this class to be loaded multiple times in separate namespaces via closure


 */
var footprints = {};
footprints.title = "Footprint";
footprints.plugin_title = "Layer Discovery";
footprints.accordion_id = "#layer-control-accordion";

footprints.$accordion = null;
footprints.$title = null;
footprints.$content = null;
footprints.$filter_holder = null;
footprints.$searchBox = null;
footprints.$matching_count = null;
footprints.$matching_total = null;
footprints.$error_div = null;

footprints.outline_layer_group = null;
footprints.image_layer_group = null;
footprints.rejected_layer_group = null;
footprints.accepted_layer_group = null;
footprints.dataInTable = null;

footprints.defaultFootprintStyle = {color: 'blue', weight: 1, opacity: 0.8, fillOpacity: 0.3};
footprints.hiddenFootprintStyle = {color: 'blue', weight: 1, opacity: 0, fillOpacity: 0};
footprints.acceptedFootprintStyle = {color: 'green', weight: 1};
footprints.rejectedFootprintStyle = {color: 'red', weight: 1};
footprints.selectedFootprintStyle = {color: 'yellow', weight: 1};
footprints.csw_max_records = 50;
footprints.next_index = 1;
footprints.current_index = 1;
footprints.record_count = 0;

footprints.selectStyle = function(status) {
    switch(status) {
        case 'Accepted':
            return footprints.acceptedFootprintStyle;
        case 'RejectedQuality':
            return footprints.rejectedFootprintStyle;
        case 'Selected':
            return footprints.selectedFootprintStyle;
        default:
            return footprints.defaultFootprintStyle;

    }
};

footprints.getLayerGroup = function(status) {
    switch(status) {
        case 'RejectedQuality':
            return footprints.rejected_layer_group;
        case 'Accepted':
            return footprints.accepted_layer_group;
        default:
            return footprints.outline_layer_group;
    }
};

footprints.clearFootprints = function() {
    // remove features that have not been evaluated
    footprints.features = _.filter(footprints.features, function(f) {
        return f.status !== "NotEvaluated";
    });

    //footprints.features.length = 0;
    if (footprints.outline_layer_group) {footprints.outline_layer_group.clearLayers();}
    if (footprints.image_layer_group) { footprints.image_layer_group.clearLayers();}

    $.tablesorter.clearTableBody($('#imagelayer-list'));
};

footprints.ops = ['equal', 'not_equal', 'less', 'less_or_equal', 'greater', 'greater_or_equal', 'is_null', 'is_not_null',
                    'contains'];

footprints.schema = [
    {name: 'image_id', title: 'Id', id: true, type: 'string'},
    {name: 'layerName', title: 'Name', show: 'small-table',
        query_filter: {id: 'name', field: 'dc:title', label: 'Name', type: 'string', operators: footprints.ops} },
    {name: 'format', title: 'Format', show: 'small-table',
        query_filter: {id: 'format', field: 'dc:format', label: 'Format', type: 'string', size: 30, operators: footprints.ops} },
    {name: 'platformCode', title: 'Source', filter: 'options', show: 'small-table' },
    //TODO: Show image name as mouseover or small text field?
    {
        name: 'maxCloudCoverPercentageRate',
        cswid: '',
        title: 'Cloud%',
        type: 'integer',
        // filter: 'slider-max',
        min: 0,
        max: 100,
        start: 10,
        sizeMarker: true
    },
    {name: 'status', title: 'Status', filter: 'options'},
    {name: 'url', title: "Url"},
    {
        name: 'ObservationDate',
        title: 'Observe Date',
        cswid: '',
        type: 'date',
        filter: 'date-range',
        transform: 'day',
        show: 'small-table',
        showSizeMultiplier: 2,
        initialDateRange: 365,
        colorMarker: true
    },
    {name: 'keyword', title: 'keyword', query_filter: {id: 'keyword', field: 'dc:subject', label: 'Keyword', type: 'string', size: 50, operators: footprints.ops} }
];

footprints.url_template = 'http://server.com/arcgis/rest/services/ImageEvents/MapServer/req_{{layer}}/query?&geometry={{bounds}}&geometryType=esriGeometryEnvelope&spatialRel=esriSpatialRelIntersects&outFields=*&outSR=4326&f=json';
footprints.layerList = "1, 2, 3".split(', ');
footprints.layerNames = "Ground, Links, Sky".split(', ');
footprints.layerColors = "#00ff00, #ff0000, #0000ff".split(', ');

footprints.featureSelectFunction = function (feature) {
    console.log("Lookup more info on " + feature.name);
};
footprints.featureSelectUrl = null;
footprints.filters = {in_bounds: true, previously_rejected: false, previously_accepted: true};
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

    // Set up layers for overlays
    if (footprints.map) {
        footprints.outline_layer_group = L.layerGroup();
        footprints.outline_layer_group.lastHighlight = {'id': undefined, 'status': undefined};
        footprints.outline_layer_group.addTo(footprints.map);
        footprints.rejected_layer_group = L.layerGroup();
        footprints.accepted_layer_group = L.layerGroup();
        footprints.image_layer_group = L.layerGroup();
        footprints.image_layer_group.addTo(footprints.map);
    }

    // finally add any layers that have already been vetted
    footprints.addInitialImages();

};

footprints.buildAccordionPanel = function () {
    footprints.$title = leaflet_layer_control.buildAccordionPanel(footprints.$accordion, footprints.plugin_title);

    //Build Content Holder
    footprints.$content = $("<div>").appendTo(footprints.$title);

    footprints.addFilterPrompts(footprints.$content);

    footprints.addFilterButton(footprints.$content);

    //Build Toggled Filter Holder
    footprints.$filter_holder = $("<div>").appendTo(footprints.$title);

    //Show count of items returned
    footprints.addResultCount(footprints.$filter_holder);

    //Add a query filter builder
    footprints.addFilterTextbox(footprints.$filter_holder);

    //For every item in the schema that has a filter, draw the filter chrome and link it to the item
    _.each(footprints.schema, function (schema_item) {
        if (schema_item.filter) {
            if (schema_item.filter == 'options') {
                schema_item.update = footprints.addFilterOptions(footprints.$filter_holder, schema_item);
            } else if (schema_item.filter == 'slider-max') {
                schema_item.update = footprints.addFilterSliderMax(footprints.$filter_holder, schema_item);
            } else if (schema_item.filter == 'date-range') {
                schema_item.update = footprints.addFilterDateMax(footprints.$filter_holder, schema_item);
            }
        }
    });
    footprints.addWorkcellBounds(footprints.$filter_holder);
    //footprints.addAcceptedButton(footprints.$filter_holder);
    //footprints.addRejectButton(footprints.$filter_holder);

    footprints.addResultTable(footprints.$filter_holder);
    //footprints.addHideButton(footprints.$filter_holder);
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
            options:{
                id: data_row.image_id,
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

        var layer_name = "Layer";
        if (footprints.layerNames && footprints.layerNames.length && footprints.layerNames.length >= layer_id) {
            layer_name = footprints.layerNames[layer_id];
        }
        footprints.newFeaturesArrived({features:[data]}, "[initial]", layer_id, layer_name);
    });

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
footprints.updateFootprintDataFromCSWServer = function () {
    // clear any previous footprints
    footprints.clearFootprints();

    var proxy = leaflet_helper.proxy_path || '/geoq/proxy/';
    var mapbounds = footprints.map.getBounds();
    var geom_string = footprints.boundsToGeometryPolygon(mapbounds);

    var inputs = {
        geometryPolygon: geom_string,
        responseFormat: 'xml',
        outputSchema: 'RESTfulView-1.1',
        streamable: 'immediate'
    };
    var params = {
        service: "CSW",
        version: "2.0.2",
        request: "GetRecords",
        typeNames: "csw:Record",
        resultType: "results",
        elementSetName: "full",
        maxRecords: footprints.csw_max_records,
        startPosition: footprints.current_index,
        outputSchema: "http://www.opengis.net/cat/csw/2.0.2"
    };
    var callback = function (xml,lang) {
        var $xml = $(xml);
        footprints.record_count = parseInt($xml.filterNode('csw:SearchResults').attr('numberOfRecordsMatched')) || 0;
        footprints.next_index = parseInt($xml.filterNode('csw:SearchResults').attr('nextRecord')) || 1;

        if (footprints.record_count && footprints.$matching_count) {
            footprints.$matching_count.text(footprints.record_count);
            footprints.$matching_total.text(footprints.record_count);
        }
        var data = $xml.filterNode('csw:Record') || [];
        footprints.newCSWFeaturesArrived(data);
    };
    //If there are any WHERE clauses, add those in
    _.each(footprints.promptFields, function (field) {
        inputs[field.name] = footprints.expandPromptSettings(field);
    });

    var bounds = [{"lat":mapbounds._southWest.lat, "lon":mapbounds._southWest.lng},
        {"lat":mapbounds._northEast.lat,"lon":mapbounds._northEast.lng}];

    var query_rules = { condition: "AND", rules: [{field: "ows:BoundingBox", id: "location", input: "text",
                        operation: "equals", type: "location", value: bounds}]};
    var startdate = footprints.filters['ObservationDate'].startdate_moment.format('YYYY-MM-DDT00:00:00Z') || null;
    if (startdate) {
        query_rules.rules.push({field: "dct:modified", id: "startdate", input: "text", operation: "greater",
                                    type: "date", value: startdate})
    }

    if ($('#builder').queryBuilder('validate')) {
        query_rules.rules.push($('#builder').queryBuilder('getRules').rules);
    }

/*    _.each([{'startdate':startdate},{'keyword': keyword}], function(item) {
        if (item[_.keys(item)[0]]) {
            input[_.keys(item)[0]] = _.values(item)[0];
        }
    });*/

    // check if there are any query rules
    var qb = $('#builder').queryBuilder('getRules');

    // ogc_csw.getRecordsPost(params, query_rules, callback);
    ogc_csw.getRecordsGet(params, query_rules, callback);

};

footprints.boundsToGeometryPolygon = function(bounds) {
    var polygon = {};
    var sw = bounds.getSouthWest();
    var nw = bounds.getNorthWest();
    var ne = bounds.getNorthEast();
    var se = bounds.getSouthEast();
    polygon.rings = [[[sw.lng,sw.lat],[nw.lng,nw.lat],[ne.lng,ne.lat],[se.lng,se.lat]]];
    return JSON.stringify(polygon);
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

        if (features.length && ((features[0].options && features[0].options[field_id]) || features[0][field_id])) {
            //Valid features returned

            var found = false;

            //Check returned features against those already stored, and only add if new
            for (var i = 0; i < features.length; i++) {
                var feature = features[i];
                for (var j = 0; j < footprints.features.length; j++) {
                    if (feature.options[field_id]) {
                        if (feature.options[field_id] == footprints.features[j][field_id]) {
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
                    //footprints.features.push(feature);
                    count_added++;
                }
            }
            //If there are new items, run the update function if it exists on each schema entry
            if (count_added) {
                footprints.updateFeatureMinMaxes();

                for (var i = 0; i <  features.length; i++) {
                    var record = features[i];
                    var style = footprints.selectStyle(record.options.status);

                    if (record.uc && record.lc) {
                        // this is a BoundingBox
                        wms = ogc_csw.createRectangleFromBoundingBox(record, style);
                    } else if (record.options.geometry) {
                        wms = ogc_csw.createPolygonFromGeometry(record.options.geometry, record.options, style);
                    } else {
                        console.error("No coordinates found. Skipping this layer");
                        break;
                    }
                    // wms.bindPopup(ogc_csw.createLayerPopup(record.options));

                    if (style == footprints.rejectedFootprintStyle) {
                        footprints.rejected_layer_group.addLayer(wms);
                    }
                    else if (style == footprints.acceptedFootprintStyle) {
                        footprints.accepted_layer_group.addLayer(wms);
                    }
                    else {
                        footprints.outline_layer_group.addLayer(wms);
                    }


                    footprints.features.push(feature.options);
                    count_added++;
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
footprints.newCSWFeaturesArrived = function (items) {

    var field_id = _.find(footprints.schema, function (s) {
        return s.id
    }).name || "id";

    var count_added = 0;
    if (items.length > 0) {
        _.each(items, function(layer) {
            var found = false;
            var record = ogc_csw.parseCSWRecord(layer);

            for (var j = 0; j < footprints.features.length; j++) {
                if (record.options["image_id"]) {
                    if (record.options["image_id"] == footprints.features[j].image_id) {
                        found = true;
                        break;
                    }
                } else {
                    console.log('Footprints Plugin - Incoming feature does not have a known ID.')
                }
            }
            if (!found) {

                var wms = {};
                if (record.uc && record.lc) {
                    // this is a BoundingBox
                    wms = ogc_csw.createRectangleFromBoundingBox(record, footprints.defaultFootprintStyle);
                } else if (record.rings) {
                    wms = ogc_csw.createPolygonFromCoordinates(record, footprints.defaultFootprintStyle);
                } else {
                    console.error("No coordinates found. Skipping this layer");
                    return;
                }
                // wms.bindPopup(ogc_csw.createLayerPopup(record.options));

                // add geometry of layer to record
                var latlngs = wms.getLatLngs();
                wms.options.geometry = {};
                wms.options.geometry.rings = [];
                wms.options.geometry.rings.push(latlngs.map(function(ll) {return [ll.lng, ll.lat]}));
                wms.options.geometry.rings[0].push(wms.options.geometry.rings[0][0]);

                footprints.outline_layer_group.addLayer(wms);

                footprints.features.push(wms.options);
                count_added++;
            }

        });


        if (count_added) {
            footprints.updateFeatureMinMaxes();

            //Update the filter controls
            _.each(footprints.schema, function (schema_item) {
                if (schema_item.update) schema_item.update();
            });
            footprints.showFilterBoxes();
            footprints.updateFootprintFilteredResults();
        }
        footprints.userMessage(count_added + ' new ' + footprints.title + 's added', 'yellow');
    }
};
footprints.removeCSWOutline = function (identifier,status) {
    _.each(footprints.getLayerGroup(status).getLayers(), function(layer) {
        if (layer.options.image_id === identifier) {
            // see if there's an image layer as well. If so, remove it
            if (layer.image_layer) {
                // footprints.image_layer_group.removeLayer(layer.image_layer);
                if (layer.image_layer.setStyle) {
                    layer.image_layer.setStyle({opacity: 0, fillOpacity: 0});
                } else if (layer.image_layer.setOpacity) {
                    layer.image_layer.setOpacity(0);
                }
            }

            footprints.getLayerGroup(status).removeLayer(layer);


            // now remove from table
            var row = $('#imagelayer-list td').filter(function() { return $(this).text() == identifier;}).closest('tr');
            if (row.length > 0) {
                row[0].remove();
                $("#imagelayer-list").trigger('update');
            }

            return;
        }
    });
};


footprints.showFootprint = function(box) {
    var id = $(box).val();
    var layer = _.find(footprints.outline_layer_group.getLayers(), function(o) { return o.options.image_id == id;});
    if ($(box).is(':checked')) {
        // show the layer
        if (layer) {
            footprints.unhideFootprint(layer);
        }
    } else {
        if (layer) {
            footprints.hideFootprint(layer);
        }
    }
};

footprints.hideFootprint = function (layer) {
    layer.setStyle(footprints.hiddenFootprintStyle);
    layer.bringToBack();
    layer.unbindPopup();
};

footprints.unhideFootprint = function (layer) {
    layer.setStyle(footprints.defaultFootprintStyle);
    layer.bringToFront();
    var title = layer.options['layerName'] || layer.options['image_id'];
    layer.bindPopup("<p>Name: " + title + "</p>");
};

footprints.showLayer = function(box) {
    var id = $(box).val();
    var details = JSON.parse($('#details-' + id).text()) || {};
    var layer = _.find(footprints.image_layer_group.getLayers(), function(o) { return o.options.image_id == id;});
    if ($(box).is(':checked')) {
        if (layer && layer.setOpacity) {
            // layer was already loaded. Just display
            layer.setOpacity(1.0);
        } else {
            if (details.url) {
                var layer = layerBuilder.buildLayer(details.format, details );
                if (layer) {
                    layer.options.image_id = id;
                    footprints.image_layer_group.addLayer(layer);
                }
            }
        }
    } else {
        if (layer && layer.setOpacity) {
            // hide the layer
            layer.setOpacity(0);
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
                    var val = feature[schema_item.name] || feature.options[schema_item.name];
                    val = parseFloat(val);
                    if (val > max) max = val;
                    if (val < min) min = val;
                    update = true;
                }
            } else if ((schema_item.type && schema_item.type == 'date') || (schema_item.filter && schema_item.filter == 'date-range')) {
                for (var i = 0; i < footprints.features.length; i++) {
                    var feature = footprints.features[i];
                    var val = feature[schema_item.name] || feature.options[schema_item.name];
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
            if (marker.feature.properties[field_id] == feature_search.options[field_id]) {
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
        var val = (feature.options[schema_item.name] || feature[schema_item.name]);
        var title = (schema_item.title || schema_item.name);

        if (val && schema_item.visualize == 'thumbnail') {
            var val_url = val;
            if (schema_item.linkField) {
                val_url = (feature.options[schema_item.linkField] || feature[schema_item.linkField]) || val;
            }
            out += "<a href='" + val_url + "' target='_blank'><img src='" + val + "' style='height:60'></a><br/>";
        } else if (val && schema_item.visualize == 'link') {
            var val_url = val;
            if (schema_item.linkField) {
                val_url = (feature.options[schema_item.linkField] || feature[schema_item.linkField]) || val;
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
        "properties": feature.options,
        "popupContent": footprints.popupContentOfFeature(feature)
    };

    var field_id = _.find(footprints.schema, function (s) {
            return s.id
        }).name || "id";
    geojsonFeature.name = feature[field_id] || feature.options[field_id];
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

    // check whether to show already accepted outlines or not
    if (footprints.filters.previously_accepted && !footprints.map.hasLayer(footprints.accepted_layer_group)) {
        footprints.map.addLayer(footprints.accepted_layer_group);
    } else if (!footprints.filters.previously_accepted && footprints.map.hasLayer(footprints.accepted_layer_group)) {
        footprints.map.removeLayer(footprints.accepted_layer_group);
    }
    // check whether to show rejected outlines or not
    if (footprints.filters.previously_rejected && !footprints.map.hasLayer(footprints.rejected_layer_group)) {
        footprints.map.addLayer(footprints.rejected_layer_group);
    } else if (!footprints.filters.previously_rejected && footprints.map.hasLayer(footprints.rejected_layer_group)) {
        footprints.map.removeLayer(footprints.rejected_layer_group);
    }

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

        // Check if item has been accepted and whether it should be shown
        if (feature.status && feature.status == "Accepted" && !footprints.filters.previously_accepted) {
            matched = false;
        }
        //Check if item has been rejected and rejects shouldn't be shown
        if (feature.status && feature.status == "RejectedQuality" && !footprints.filters.previously_rejected) {
            matched = false;
        }
        //TODO: Make sure previous data is returned from AOIs

        //Check through each filter to see if it's excluded
        if (matched) _.each(footprints.schema, function (schema_item) {
            if (schema_item.filter && matched) {
                var fieldToCheck = schema_item.name;
                var filterSetting = footprints.filters[fieldToCheck];
                var val = feature[fieldToCheck];

                if (val) {
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
                        var date_format = 'YYYY-MM-DD';
                        if (schema_item.transform == 'day' && val.indexOf('-') < 0) {
                            val_date = val.substr(0, 4) + '-' + val.substr(4, 2) + '-' + val.substr(6, 2);
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
            var val = feature[fieldToCheck];

            if (val) {
                if ((schema_item.type && schema_item.type == 'date') || (schema_item.filter && schema_item.filter == 'date-range')) {
                    var date_format = null;
                    if (schema_item.transform == 'day') {
                        if (val.indexOf('-') < 0) {
                            val = val.substr(0, 4) + '-' + val.substr(4, 2) + '-' + val.substr(6, 2);
                        }
                        date_format = "YYYY-MM-DD";
                    }
                    var date_val = moment(val, date_format);
                    if (date_val && date_val.isValid && date_val.isValid()) {
                        val = date_val.format('YYYY-MM-DD');
                    }
                }

                item[fieldToCheck] = val;
            }
        });

        //Pull out the geometry
        item.geometry = {};
        if (feature.GeometryType) item.geometry.GeometryType = feature.GeometryType;
        if (feature.Geometry) item.geometry.Geometry = feature.Geometry;
        if (feature.geometry) item.geometry.geometry = feature.geometry;

        flattened_list.push(item);
    }

    //Update counts
//    if (footprints.$matching_count) {
//        footprints.$matching_count.text(matched_list.length);
//        footprints.$matching_total.text(total);
//    }
    footprints.matched = matched_list;
    footprints.matched_flattened = flattened_list;

    //Update the grid
    if (footprints.$grid && footprints.$grid.css) {
        footprints.$grid.css({
            display: (matched_list.length > 0) ? 'block' : 'none'
        });
        //footprints.$grid.pqGrid("option", "dataModel", {data: flattened_list})
        footprints.addToResultTable(flattened_list);
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
        .html(' layers found. ')
        .appendTo($div);
    footprints.$matching_total = $("<span>")
        .attr({id: 'footprints-matching-count-total'})
        .text('0')
        .appendTo($div);
    $("<span>")
        .html(' match the below filters.')
        .appendTo($div);
};


footprints.addToResultTable = function (flattenedList) {

    var length = flattenedList.length;
    footprints.dataInTable = flattenedList;

    $('#imagelayer-list tbody').html("");
    for (var i = 0; i < length; i++) {
        //Add accept toggle
        var c1 = (flattenedList[i].status && flattenedList[i].status == 'Accepted') ? 'checked' : '';
        var c2 = (!flattenedList[i].status || (flattenedList[i].status && flattenedList[i].status == 'NotEvaluated')) ? 'checked' : '';
        var c3 = (flattenedList[i].status && flattenedList[i].status == 'RejectedQuality') ? 'checked' : '';

        var $tr = $('<tr>').on('click', function() {
            footprints.rowClicked(this);
        });

        var headers = [];

        $('#imagelayer-list tr').find('th').filter(function() {
            headers.push($(this).find('div')[0].textContent);
        });

        $('<td><input type="checkbox" onclick="footprints.showFootprint(this);" value="' + flattenedList[i]['image_id'] +
            '" checked="checked"></td>').appendTo($tr);
        $('<td><input type="checkbox" onclick="footprints.showLayer(this);" value="' + flattenedList[i]['image_id'] +
            '"></td>').appendTo($tr);

        _.each(headers, function(hdr) {
            var schemaItem = _.findWhere( footprints.schema, { title: hdr});
            if (schemaItem) {
                $('<td>')
                    .html(flattenedList[i][schemaItem.name])
                    .css("border", "0px solid black")
                    .appendTo($tr);
            }
        });
        $('<td style="display:none;">' + JSON.stringify(flattenedList[i]) + '</td>')
            .attr('id', 'details-' + flattenedList[i]['image_id'])
            .appendTo($tr);


        $('#imagelayer-list tbody').append($tr);
    }


    $("#imagelayer-list").trigger('update');
};

footprints.updateValueFromRadio = function(id, value) {
    var val, data_row;

    if (value < 0) {
        val = "RejectedQuality";
    } else if (value > 0) {
        val = "Accepted";
    } else {
        val = "NotEvaluated";
    }

    for (var i = 0; i < footprints.dataInTable.length; i++) {
        if (id == footprints.dataInTable[i].image_id) {
            data_row = footprints.dataInTable[i];
            break;
        }
    }

    var image_id = data_row.image_id;

    var inputs = {
        id: encodeURIComponent(image_id),
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
        nef_name: data_row.layerName,
        sensor: data_row.image_sensor,
        platform: data_row.platformCode,
        cloud_cover: data_row.maxCloudCoverPercentageRate,
        acq_date: data_row.ObservationDate,
        img_geom: JSON.stringify(geometry),
        wmsUrl: data_row.url,
        area: 1,
        status: val,
        workcell: aoi_feature_edit.aoi_id
    };

    // find that layer in footprints.features and update
    for (var i = 0; i < footprints.features.length; i++) {
        if (data_row.image_id == footprints.features[i].image_id) {
            footprints.features[i].status = val;
            break;
        }
    }
    $.ajax({
        type: "POST",
        url: url,
        data: data,
        dataType: "json",
        success: function (data) {
            console.log(data)
        }
    });

};

footprints.rowClicked = function (row) {
    var index = row.rowIndex -1;
    var imageid = footprints.dataInTable[index].image_id;
    var image_status = footprints.dataInTable[index].status;

    // change back previous selection if necessary
    if ( footprints.outline_layer_group.lastHighlight.id ) {
        var pastlayers = footprints.getLayerGroup(footprints.outline_layer_group.lastHighlight.status).getLayers();
        var player = pastlayers.filter(function(e) {return e.options.image_id == footprints.outline_layer_group.lastHighlight.id})[0];
        if (player) {
            if ($(':input[value=' + player.options.image_id + ']').first().is(':checked')) {
                player.setStyle(footprints.defaultFootprintStyle);
                footprints.unhideFootprint(player);
            } else {
                footprints.hideFootprint(player);
            }
        }
    }

    // change the color of the selected image
    var newlayers = footprints.getLayerGroup(image_status).getLayers();
    var layer = newlayers.filter(function(e) { return e.options.image_id == imageid; })[0];
    if (layer) {
        layer.setStyle(footprints.selectStyle('Selected'));
        layer.bringToFront();
        footprints.outline_layer_group.lastHighlight = {'id': imageid, 'status': layer.options.status};
    }

    $("#imagelayer-list").trigger('update');

};

// pager functions
footprints.first = function() {
    footprints.current_index = 1;
    footprints.updateFootprintDataFromCSWServer();
};

footprints.prev = function() {
    footprints.current_index = (footprints.current_index - footprints.csw_max_records > 0 )?
        footprints.current_index -= footprints.csw_max_records : 1;
    footprints.updateFootprintDataFromCSWServer();
};

footprints.next = function() {
    footprints.current_index = footprints.next_index;
    footprints.updateFootprintDataFromCSWServer();
};

footprints.last = function() {
    footprints.current_index = footprints.record_count - (footprints.record_count % footprints.csw_max_records) + 1;
    footprints.updateFootprintDataFromCSWServer();
};

footprints.addResultTable = function ($holder) {
    //We can change the max height here when we are testing with many elements.
    var $grid = $("<div class='tableContainer' style='overflow-x:auto; overflow-y: auto; max-height: 250px'><table class='tablesorter' id='imagelayer-list'><colgroup><thead><tr></tr></thead><tbody></tbody></table>")
        .appendTo($holder);

    var $row = $grid.find("tr");

    // first row is the accept/reject buttons
    //$row.append("<th>Accept</th>");
    $row.append("<th>FP</th>");
    $row.append("<th>Data</th>");

    _.each( footprints.schema, function(item) {
        if (item.show && item.show === 'small-table') {
            $row.append("<th>" + item.title + "</th>");
        }
    });

    var $pager = $("<div id='pager' class='pager'><form>" +
        "<img src='/static/images/first.png' class='first' onclick='footprints.first()' alt='First'/>" +
        "<img src='/static/images/prev.png' class='prev' onclick='footprints.prev()'/><span id='page-view' class='gpagedisplay'></span>" +
        "<img src='/static/images/next.png' class='next' onclick='footprints.next()'/>" +
        "<img src='/static/images/last.png' class='last' onclick='footprints.last()'/></form></div>")
        .appendTo($holder);


    $("#imagelayer-list").trigger('update');

    var pagerOptions = {
        // target the pager markup - see the HTML block below
		container: $(".pager"),

        // Taken from the API Documentation
		// output string - default is '{page}/{totalPages}'
		// possible variables: {size}, {page}, {totalPages}, {filteredPages}, {startRow}, {endRow}, {filteredRows} and {totalRows}
		// also {page:input} & {startRow:input} will add a modifiable input in place of the value
		output: 'Page {page} of {totalPages}',

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
    .bind('pagerComplete', function(e,c) {
        var total_pages = Math.floor(footprints.record_count / footprints.csw_max_records) + 1;
        var page_num = Math.floor(footprints.current_index / footprints.csw_max_records) + 1;
        $('#page-view').text('Page ' + page_num + " of " + total_pages);
    });

    $("#imagelayer-list").trigger('update');
    //Have to call this function
    $('#imagelayer-list').trigger('pageAndSize');

    footprints.$grid = $grid;
};
footprints.getFeatureFromTable = function (rowData) {

    var field_id = _.find(footprints.schema, function (s) {
            return s.id
        }).name || "id";

    var feature = null;
    for (var j = 0; j < footprints.features.length; j++) {
        feature = footprints.features[j];
        if (feature.options[field_id]) {
            if (feature.options[field_id] == rowData[field_id]) {
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
    var $div = $("<div><b>Only show items in workcell:</b> </div>")
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
footprints.addAcceptedButton = function ($holder) {
    var $div = $("<div><b>Show items previously accepted:</b> </div>")
        .appendTo($holder);
    $('<input>')
        .attr({type: 'checkbox', value: 'previously_accepted', checked: true})
        .css({fontSize: '12px', padding: '2px'})
        .on('change', function () {
            var val = $(this).attr('checked');
            footprints.filters.previously_accepted = !!val;
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
footprints.addHideButton = function ($holder) {
    var $div = $("<div><b>Hide all footprints:</b></div>")
        .appendTo($holder);
    $('<input>')
        .attr({type: 'checkbox', value: 'hide_footprints', checked: false})
        .css({fontSize: '12px', padding: '2px'})
        .on('change', function () {
            var val = $(this).attr('checked');
            footprints.hideFootprints(!!val);
        })
        .appendTo($div);
};
footprints.hideFootprints = function (hide) {
    footprints.outline_layer_group.eachLayer( function(layer) {
        if (hide) {
            layer.setStyle({fillOpacity:0, opacity: 0});
        } else {
            layer.setStyle({fillOpacity:.5, opacity:.6});
        }
    })
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
footprints.addFilterTextbox = function ($holder) {
    $("<div><b>Add a search filter:</b></div>")
        .appendTo($holder);

    var $query_builder = $("<div>")
        .attr("id","builder")
        .appendTo($holder);

    var query_filters = [];
    _.each(footprints.schema, function(s) { if (s.query_filter) query_filters.push(s.query_filter); });

    $('#builder').queryBuilder( {
        filters: query_filters
    });

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
            'Last 4 Months': [moment().subtract(120, 'days'), moment()],
            'Last Year' : [moment().subtract(1, 'years'), moment()]
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
        .html('<i class="icon-filter"></i>&nbspSearch for ' + footprints.title + ' within view extents')
        .on('click', function () {
            footprints.next_index = footprints.last_index = 1;
            footprints.updateFootprintDataFromCSWServer();
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
        .attr('type', 'range')
        .on('input', _.debounce(function () {
            footprints.filters[schema_item.name] = this.value;
            footprints.updateFootprintFilteredResults();
            $cc_count.html(" (" + this.value + ")")
        }, 50))
        .attr({value: schema_item.start || 10})
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
            var val = feature[fieldToUpdate];
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