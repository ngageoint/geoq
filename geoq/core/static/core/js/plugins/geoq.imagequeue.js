/*
 Footprints plugin for geoq
 Used to show a list of features from esri server that returns json, and allow user to filter them in a customized manner

 NOTE: Requires a number of JS libraries and CSS files

 TODO: Show Workcell as highest vis layer
 TODO: Allow this class to be loaded multiple times in separate namespaces via closure


 */
var imagequeue = {};
imagequeue.title = "ImageQueue";
imagequeue.plugin_title = "Imagery Queue";
imagequeue.accordion_id = "#layer-control-accordion";

imagequeue.$accordion = null;
imagequeue.$title = null;
imagequeue.$content = null;
imagequeue.$filter_holder = null;
imagequeue.$searchBox = null;
imagequeue.$matching_count = null;
imagequeue.$matching_total = null;
imagequeue.$error_div = null;

imagequeue.outline_layer_group = null;
imagequeue.image_layer_group = null;
imagequeue.rejected_layer_group = null;
imagequeue.accepted_layer_group = null;
imagequeue.dataInTable = null;

imagequeue.defaultFootprintStyle = {color: 'blue', weight: 1, opacity: 0.8, fillOpacity: 0.3};
imagequeue.hiddenFootprintStyle = {color: 'blue', weight: 1, opacity: 0, fillOpacity: 0};
imagequeue.acceptedFootprintStyle = {color: 'green', weight: 1};
imagequeue.rejectedFootprintStyle = {color: 'red', weight: 1};
imagequeue.selectedFootprintStyle = {color: 'yellow', weight: 1};
imagequeue.wfs_max_records = 50;
imagequeue.next_index = 1;
imagequeue.current_index = 1;
imagequeue.record_count = 0;

imagequeue.WCS_URL = "/geoq/proxy/https://evwhs.digitalglobe.com/deliveryservice/wcsaccess";

imagequeue.selectStyle = function(status) {
    switch(status) {
        case 'Accepted':
            return imagequeue.acceptedFootprintStyle;
        case 'RejectedQuality':
            return imagequeue.rejectedFootprintStyle;
        case 'Selected':
            return imagequeue.selectedFootprintStyle;
        default:
            return imagequeue.defaultFootprintStyle;

    }
};

imagequeue.getLayerGroup = function(status) {
    switch(status) {
        case 'RejectedQuality':
            return imagequeue.rejected_layer_group;
        case 'Accepted':
            return imagequeue.accepted_layer_group;
        default:
            return imagequeue.outline_layer_group;
    }
};

imagequeue.clearFootprints = function() {
    // remove features that have not been evaluated
    imagequeue.features = _.filter(imagequeue.features, function(f) {
        return f.status !== "NotEvaluated";
    });

    //imagequeue.features.length = 0;
    if (imagequeue.outline_layer_group) {imagequeue.outline_layer_group.clearLayers();}
    if (imagequeue.image_layer_group) { imagequeue.image_layer_group.clearLayers();}

    $.tablesorter.clearTableBody($('#imagelayer-list'));
};

imagequeue.ops = ['equal', 'not_equal', 'less', 'less_or_equal', 'greater', 'greater_or_equal', 'is_null', 'is_not_null',
                    'contains'];

imagequeue.schema = [
    {name: 'featureId', title: 'Id', id: true, type: 'string', show: 'small-table'},
    {name: 'source', title: 'Source', filter: 'options', show: 'small-table' },
    {name: 'productType',
        title: 'Type', filter: 'options',
        query_filter: {id: 'productType', field: 'DigitalGlobe:productType',
          label: 'Type', type: 'string', operators: imagequeue.ops }},
    //TODO: Show image name as mouseover or small text field?
    {
        name: 'cloudCover',
        cswid: '',
        title: 'Cloud%',
        type: 'integer',
        // filter: 'slider-max',
        min: 0,
        max: 100,
        start: 10,
        sizeMarker: true,
        query_filter: {id: 'cloudCover', field: 'DigitalGlobe:cloudCover',
                        label: 'Cloud%', type: 'integer',
                        operators: imagequeue.ops}
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
    {name: 'niirs', title: 'niirs', query_filter: {id: 'niirs', field: 'DigitalGlobe:niirs', label: 'NIIRS', type: 'double', operators: imagequeue.ops} }
];

imagequeue.url_template = 'https://evwhs.digitalglobe.com/catalogservice/wfsaccess?connectid=<connectid>&service=wfs&version=1.1.0&request=GetFeature&typeName=FinishedFeature&BBOX={{bounds}}';
//imagequeue.url_template = 'http://server.com/arcgis/rest/services/ImageEvents/MapServer/req_{{layer}}/query?&geometry={{bounds}}&geometryType=esriGeometryEnvelope&spatialRel=esriSpatialRelIntersects&outFields=*&outSR=4326&f=json';
imagequeue.layerList = "1, 2, 3".split(', ');
imagequeue.layerNames = "Ground, Links, Sky".split(', ');
imagequeue.layerColors = "#00ff00, #ff0000, #0000ff".split(', ');

imagequeue.featureSelectFunction = function (feature) {
    console.log("Lookup more info on " + feature.name);
};
imagequeue.featureSelectUrl = null;
imagequeue.filters = {in_bounds: true, previously_rejected: false, previously_accepted: true};
imagequeue.prompts = {};
imagequeue.features = [];

imagequeue.markerRadiusMax = 12;
imagequeue.markerColorMin = "#333333";
imagequeue.markerColorMax = "#ff9000";

imagequeue.map = aoi_feature_edit.map;
imagequeue.layerHolder = null;
imagequeue.workcellGeojson = aoi_feature_edit.aoi_extents_geojson;

imagequeue.init = function (options) {

    //Add a shim in to fill a jquery version gap
    if (typeof $.curCSS == "undefined") {
        $.curCSS = function (element, attrib, val) {
            $(element).css(attrib, val);
        }
    }

    if (options) imagequeue = $.extend(imagequeue, options);
    imagequeue.$accordion = $(imagequeue.accordion_id);
    imagequeue.buildAccordionPanel();

    function onEachFeature(feature, layer) {
        // If this feature have a property named popupContent, show it
        if (feature.popupContent) {
            layer.bindPopup(feature.popupContent);
        }
    }

    //Set up map and workcells
    if (!imagequeue.map && aoi_feature_edit && aoi_feature_edit.map) {
        imagequeue.map = aoi_feature_edit.map;
    }
    if (!imagequeue.workcellGeojson && aoi_feature_edit && aoi_feature_edit.aoi_extents_geojson) {
        imagequeue.workcellGeojson = aoi_feature_edit.aoi_extents_geojson;
    }

    //Set up GeoJSON layer
    if (imagequeue.map) {
        imagequeue.layerHolder = L.geoJson([], {
            onEachFeature: onEachFeature,
            style: imagequeue.polyToLayer,
            pointToLayer: imagequeue.pointToLayer
        }).addTo(imagequeue.map);
    } else {
        console.error("Footprint Plugin could not load layerHolder");
    }

    // Set up layers for overlays
    if (imagequeue.map) {
        imagequeue.outline_layer_group = L.featureGroup();
        imagequeue.outline_layer_group.lastHighlight = {'id': undefined, 'status': undefined};
        imagequeue.outline_layer_group.addTo(imagequeue.map);
        imagequeue.rejected_layer_group = L.layerGroup();
        imagequeue.accepted_layer_group = L.layerGroup();
        imagequeue.image_layer_group = L.featureGroup();
        imagequeue.image_layer_group.addTo(imagequeue.map);
    }

    // finally add any layers that have already been vetted
    imagequeue.addInitialImages();

};

imagequeue.buildAccordionPanel = function () {
    imagequeue.$title = leaflet_layer_control.buildAccordionPanel(imagequeue.$accordion, imagequeue.plugin_title);

    //Build Content Holder
    imagequeue.$content = $("<div style='margin-top: 10px;'>").appendTo(imagequeue.$title);

    imagequeue.addFilterPrompts(imagequeue.$content);

    imagequeue.addFilterButton(imagequeue.$content);

    //Build Toggled Filter Holder
    imagequeue.$filter_holder = $("<div>").appendTo(imagequeue.$title);

    //Show count of items returned
    imagequeue.addResultCount(imagequeue.$filter_holder);

    //Add a query filter builder
    imagequeue.addFilterTextbox(imagequeue.$filter_holder);

    //For every item in the schema that has a filter, draw the filter chrome and link it to the item
    _.each(imagequeue.schema, function (schema_item) {
        if (schema_item.filter) {
            if (schema_item.filter == 'options') {
                schema_item.update = imagequeue.addFilterOptions(imagequeue.$filter_holder, schema_item);
            } else if (schema_item.filter == 'slider-max') {
                schema_item.update = imagequeue.addFilterSliderMax(imagequeue.$filter_holder, schema_item);
            } else if (schema_item.filter == 'date-range') {
                schema_item.update = imagequeue.addFilterDateMax(imagequeue.$filter_holder, schema_item);
            }
        }
    });
    imagequeue.addWorkcellBounds(imagequeue.$filter_holder);
    //imagequeue.addAcceptedButton(imagequeue.$filter_holder);
    //imagequeue.addRejectButton(imagequeue.$filter_holder);

    imagequeue.addResultTable(imagequeue.$filter_holder);
    //imagequeue.addHideButton(imagequeue.$filter_holder);
};
imagequeue.clamp = function (num, min, max) {
    return num < min ? min : (num > max ? max : num);
};
imagequeue.percent_range = function (value, start_min, start_max, end_min, end_max) {
    value = parseFloat(value);

    var start_pct = imagequeue.clamp(parseFloat(value - start_min) / parseFloat(start_max - start_min), 0, 1);
    return (parseFloat(start_pct) * parseFloat(end_max - end_min)) + parseFloat(end_min);
};
imagequeue.colorBlendFromAmountRange = function (color_start, color_end, amount, amount_min, amount_max) {
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

imagequeue.addInitialImages = function () {
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
                id: data_row.featureId,
                featureId: data_row.featureId,
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
        if (imagequeue.layerNames && imagequeue.layerNames.length && imagequeue.layerNames.length >= layer_id) {
            layer_name = imagequeue.layerNames[layer_id];
        }
        imagequeue.newFeaturesArrived({features:[data]}, "[initial]", layer_id, layer_name);
    });

};

imagequeue.polyToLayer = function (feature) {
    var color;

    //Determine the Color of the points
    var size_field = {};
    if (imagequeue.colorMarker) {
        size_field = imagequeue.colorMarker;
    } else {
        size_field = _.find(imagequeue.schema, function (s) {
            return s.colorMarker
        });
        imagequeue.colorMarker = size_field;
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
        var color_prime = imagequeue.markerColorMax;
        if (imagequeue.layerColors && feature.layer_id && feature.layer_id <= imagequeue.layerColors.length) {
            color_prime = imagequeue.layerColors[feature.layer_id];
        }
        color = imagequeue.colorBlendFromAmountRange(color_prime, imagequeue.markerColorMin, val, size_min, size_max);
    } else {
        color = imagequeue.markerColorMax;
    }

    return {
        fillColor: color,
        color: "#000",
        weight: 3,
        opacity: 0.5,
        fillOpacity: 0.5
    };
};

imagequeue.pointToLayer = function (feature, latlng) {
    var radius, color;

    //Determine the Size of the points
    var size_field = {};
    if (imagequeue.sizeMarker) {
        size_field = imagequeue.sizeMarker;
    } else {
        size_field = _.find(imagequeue.schema, function (s) {
            return s.sizeMarker
        });
        imagequeue.sizeMarker = size_field;
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
        radius = imagequeue.percent_range(val, size_min, size_max, imagequeue.markerRadiusMax / 3, imagequeue.markerRadiusMax);
    } else {
        radius = imagequeue.markerRadiusMax;
    }

    //Determine the Color of the points
    size_field = {};
    if (imagequeue.colorMarker) {
        size_field = imagequeue.colorMarker;
    } else {
        size_field = _.find(imagequeue.schema, function (s) {
            return s.colorMarker
        });
        imagequeue.colorMarker = size_field;
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

        var color_prime = imagequeue.markerColorMax;
        if (imagequeue.layerColors && feature.layer_id && feature.layer_id <= imagequeue.layerColors.length) {
            color_prime = imagequeue.layerColors[feature.layer_id];
        }
        color = imagequeue.colorBlendFromAmountRange(color_prime, imagequeue.markerColorMin, val, size_min, size_max);
    } else {
        color = imagequeue.markerColorMax;
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
imagequeue.userMessage = function (text, color) {
    imagequeue.$error_div
        .html(text)
        .css({backgroundColor: color || ''})
        .delay(3000).fadeOut('slow');
};
imagequeue.updateFootprintDataFromMap = function () {
    var proxy = leaflet_helper.proxy_path || '/geoq/proxy/';
    var url_template = _.template(imagequeue.url_template);
    var bounds = imagequeue.map.getBounds();

    //Do Ajax requests for each Layer in the LayerList
    var bbox_string = bounds.toBBoxString().replace(/,/gi, '%2C');

    var layers = imagequeue.layerList || [1];
    _.each(layers, function (layer, layer_id) {
        var inputs = {
            bounds: bbox_string,
            layers: "show:" + (imagequeue.layers || '0'),
            layer: layer,
            n: bounds._northEast.lat,
            s: bounds._southWest.lat,
            e: bounds._northEast.lng,
            w: bounds._southWest.lng
        };
        //If there are any WHERE clauses, add those in
        _.each(imagequeue.promptFields, function (field) {
            inputs[field.name] = imagequeue.expandPromptSettings(field);
        });

        //Apply all the above inputs to the url template to build out the final url
        var url = url_template(inputs);

        if (_.str.startsWith(url, 'http')) url = proxy + url;

        var layer_name = "Layer";
        if (imagequeue.layerNames && imagequeue.layerNames.length && imagequeue.layerNames.length >= layer_id) {
            layer_name = imagequeue.layerNames[layer_id];
        }

        console.log(url);
        $.ajax({
            url: url,
            type: 'json',
            success: function (data) {
                imagequeue.newFeaturesArrived(data, url, layer_id, layer_name);
            }
        });
    });
};
imagequeue.updateFootprintDataFromWFSServer = function () {
    // clear any previous imagequeue
    imagequeue.clearFootprints();

    var proxy = leaflet_helper.proxy_path || '/geoq/proxy/';
    var mapbounds = imagequeue.map.getBounds();
    var geom_string = imagequeue.boundsToGeometryPolygon(mapbounds);

    var inputs = {
        geometryPolygon: geom_string,
        responseFormat: 'xml',
        outputSchema: 'RESTfulView-1.1',
        streamable: 'immediate'
    };
    var params = {
        service: "WFS",
        version: "1.1.0",
        request: "GetFeature",
        typeName: "FinishedFeature",
        connectid: "<connectid>s"
    };
    var callback = function (xml,lang) {
        var $xml = $(xml);
        imagequeue.record_count = parseInt($xml.filterNode('wfs:FeatureCollection').attr('numberOfFeatures')) || 0;
        //imagequeue.next_index = parseInt($xml.filterNode('csw:SearchResults').attr('nextRecord')) || 1;
        imagequeue.next_index = 51;

        if (imagequeue.record_count && imagequeue.$matching_count) {
            imagequeue.$matching_count.text(imagequeue.record_count);
            imagequeue.$matching_total.text(imagequeue.record_count);
        }
        var data = $xml.filterNode('DigitalGlobe:FinishedFeature') || [];
        imagequeue.newWFSFeaturesArrived(data);
    };
    //If there are any WHERE clauses, add those in
    _.each(imagequeue.promptFields, function (field) {
        inputs[field.name] = imagequeue.expandPromptSettings(field);
    });

    var bounds = [{"lat":mapbounds._southWest.lat, "lon":mapbounds._southWest.lng},
        {"lat":mapbounds._northEast.lat,"lon":mapbounds._northEast.lng}];

    var query_rules = { condition: "AND", rules: [{field: "ows:BoundingBox", id: "location", input: "text",
                        operation: "equals", type: "location", value: bounds}]};
    var startdate = imagequeue.filters['ObservationDate'].startdate_moment.format('YYYY-MM-DDT00:00:00Z') || null;
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

    // ogc_wfs.getRecordsPost(params, query_rules, callback);
    ogc_wfs.getRecordsGet(params, query_rules, callback);

};

imagequeue.boundsToGeometryPolygon = function(bounds) {
    var polygon = {};
    var sw = bounds.getSouthWest();
    var nw = bounds.getNorthWest();
    var ne = bounds.getNorthEast();
    var se = bounds.getSouthEast();
    polygon.rings = [[[sw.lng,sw.lat],[nw.lng,nw.lat],[ne.lng,ne.lat],[se.lng,se.lat]]];
    return JSON.stringify(polygon);
};
imagequeue.expandPromptSettings = function (field) {
    //If the prompt is a 'where', turns a comma-seperated list into a proper where clause
    var name = field.name;

    var field_values = _.find(imagequeue.prompts, function (f) {
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
imagequeue.newFeaturesArrived = function (data, url, layer_id, layer_name) {
    var returned = {};

    if (_.isObject(data)) {
        returned = data;
    } else {
        try {
            returned = JSON.parse(data);
        } catch (ex) {
            imagequeue.userMessage('Invalid JSON data returned from server', 'red');
        }
    }

    var field_id = _.find(imagequeue.schema, function (s) {
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
                for (var j = 0; j < imagequeue.features.length; j++) {
                    if (feature.options[field_id]) {
                        if (feature.options[field_id] == imagequeue.features[j][field_id]) {
                            found = true;
                            break;
                        }
                    } else if (feature[field_id]) {
                        if (feature[field_id] == imagequeue.features[j][field_id]) {
                            found = true;
                            break;
                        }
                    } else {
                        console.log('Footprints Plugin - Incoming feature does not have a known ID.')
                    }
                }
                if (!found) {
                    //imagequeue.features.push(feature);
                    count_added++;
                }
            }
            //If there are new items, run the update function if it exists on each schema entry
            if (count_added) {
                imagequeue.updateFeatureMinMaxes();

                for (var i = 0; i <  features.length; i++) {
                    var record = features[i];
                    var style = imagequeue.selectStyle(record.options.status);

                    if (record.uc && record.lc) {
                        // this is a BoundingBox
                        wms = ogc_wfs.createRectangleFromBoundingBox(record, style);
                    } else if (record.options.geometry) {
                        wms = ogc_wfs.createPolygonFromGeometry(record.options.geometry, record.options, style);
                    } else {
                        console.error("No coordinates found. Skipping this layer");
                        break;
                    }
                    // wms.bindPopup(ogc_wfs.createLayerPopup(record.options));

                    if (style == imagequeue.rejectedFootprintStyle) {
                        imagequeue.rejected_layer_group.addLayer(wms);
                    }
                    else if (style == imagequeue.acceptedFootprintStyle) {
                        imagequeue.accepted_layer_group.addLayer(wms);
                    }
                    else {
                        imagequeue.outline_layer_group.addLayer(wms);
                    }


                    imagequeue.features.push(feature.options);
                    count_added++;
                }

                //Update the filter controls
                _.each(imagequeue.schema, function (schema_item) {
                    if (schema_item.update) schema_item.update();
                });
                imagequeue.showFilterBoxes();
                imagequeue.updateFootprintFilteredResults();
            }
            imagequeue.userMessage(count_added + ' new ' + imagequeue.title + 's added', 'yellow');
        } else if (features) {
            console.log('No Features found in this area from layer: ' + layer_name + ' (' + layer_id + ')');
        } else {
            imagequeue.userMessage('The Service returned an invalid response', 'red');
            console.log("Invalid feature types returned from url: " + url);
        }
    }
};
imagequeue.newWFSFeaturesArrived = function (items) {

    // var field_id = _.find(imagequeue.schema, function (s) {
    //     return s.id
    // }).name || "id";

    var count_added = 0;
    var mapped_features = [];
    if (items.length > 0) {
        _.each(items, function(layer) {
            var found = false;
            var record = ogc_wfs.parseWFSRecord(layer);

            for (var j = 0; j < imagequeue.features.length; j++) {
                if (record.options["featureId"]) {
                    if (record.options["featureId"] == imagequeue.features[j].featureId) {
                        found = true;
                        break;
                    }
                } else {
                    console.log('Image Queue Plugin - Incoming feature does not have a known ID.')
                }
            }
            if (!found) {

                var outline = {};
                try {
                    if (record.coords) {
                        // this is a BoundingBox
                        outline = L.polygon(record.coords, {
                          color: 'blue',
                          fill: false,
                          weight: 2 });
                    } else {
                        console.error("No coordinates found. Skipping this layer");
                        return;
                    }
                    // wms.bindPopup(ogc_wfs.createLayerPopup(record.options));

                    // add geometry of layer to record
                    // var latlngs = wms.getLatLngs();
                    outline.options.geometry = {};
                    outline.options.geometry.rings = record.coords.map(function(arr) {
                      return arr.slice();
                    });

                    outline.options = L.extend(outline.options, record.options);

                    imagequeue.outline_layer_group.addLayer(outline);

                    // zoom map to outline_layer_group
                    imagequeue.map.fitBounds(imagequeue.outline_layer_group.getBounds());

                    // imagequeue.features.push(wms.options);
                    mapped_features.push(record);
                    count_added++;
                } catch (e) {
                    // error probably parsing coordinates. Let them know if we can
                    console.log("error on id " + record.featureId );
                }

            }

        });


        if (count_added) {
            imagequeue.updateFeatureMinMaxes();

            //Update the filter controls
            _.each(imagequeue.schema, function (schema_item) {
                if (schema_item.update) schema_item.update();
            });
            imagequeue.showFilterBoxes();
            //imagequeue.updateFootprintFilteredResults();
            imagequeue.addToResultTable(mapped_features);
        }
        imagequeue.userMessage(count_added + ' new ' + imagequeue.title + 's added', 'yellow');
    }
};
imagequeue.removeCSWOutline = function (identifier,status) {
    _.each(imagequeue.getLayerGroup(status).getLayers(), function(layer) {
        if (layer.options.featureId === identifier) {
            // see if there's an image layer as well. If so, remove it
            if (layer.image_layer) {
                // imagequeue.image_layer_group.removeLayer(layer.image_layer);
                if (layer.image_layer.setStyle) {
                    layer.image_layer.setStyle({opacity: 0, fillOpacity: 0});
                } else if (layer.image_layer.setOpacity) {
                    layer.image_layer.setOpacity(0);
                }
            }

            imagequeue.getLayerGroup(status).removeLayer(layer);


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


imagequeue.showFootprint = function(box) {
    var id = $(box).val();
    var layer = _.find(imagequeue.outline_layer_group.getLayers(), function(o) { return o.options.featureId == id;});
    if ($(box).is(':checked')) {
        // show the layer
        if (layer) {
            imagequeue.unhideFootprint(layer);
        }
    } else {
        if (layer) {
            imagequeue.hideFootprint(layer);
        }
    }
};

imagequeue.hideFootprint = function (layer) {
    layer.setStyle(imagequeue.hiddenFootprintStyle);
    layer.bringToBack();
    layer.unbindPopup();
};

imagequeue.unhideFootprint = function (layer) {
    layer.setStyle(imagequeue.defaultFootprintStyle);
    layer.bringToFront();
    var title = layer.options['layerName'] || layer.options['featureId'];
    layer.bindPopup("<p>Name: " + title + "</p>");
};

imagequeue.showLayer = function(box) {
    var id = $(box).val();
    var details = JSON.parse($('#details-' + id).text()) || {};
    var layer = _.find(imagequeue.image_layer_group.getLayers(), function(o) { return o.options.featureId == id;});
    if ($(box).is(':checked')) {
        if (layer && layer.setOpacity) {
            // layer was already loaded. Just display
            layer.setOpacity(1.0);
        } else {
            var layer = ogc_wfs.createWMSLayerFromRecord(details);
            imagequeue.image_layer_group.addLayer(layer);
            // var layer = L.nonTiledLayer.wcs(imagequeue.WCS_URL,
            //     {wcsOptions: {identifier: id}, crs: L.CRS.EPSG4326});
            // if (layer) {
            //     layer.options.featureId = id;
            //     imagequeue.image_layer_group.addLayer(layer);
            // }
        }
    } else {
        if (layer && layer.setOpacity) {
            // hide the layer
            layer.setOpacity(0);
        }
    }

};

imagequeue.updateFeatureMinMaxes = function () {
    //If it's a number or date, find the min and max and save it with the schema

    _.each(imagequeue.schema, function (schema_item) {
        if (schema_item.min !== undefined && schema_item.max !== undefined) {
            schema_item._min = schema_item.min;
            schema_item._max = schema_item.max;
        } else {
            var min = Number.MAX_VALUE;
            var max = Number.MIN_VALUE;
            var update = false;

            if ((schema_item.type && schema_item.type == 'integer') || (schema_item.filter && schema_item.filter == 'slider-max')) {
                for (var i = 0; i < imagequeue.features.length; i++) {
                    var feature = imagequeue.features[i];
                    var val = feature[schema_item.name] || feature.options[schema_item.name];
                    val = parseFloat(val);
                    if (val > max) max = val;
                    if (val < min) min = val;
                    update = true;
                }
            } else if ((schema_item.type && schema_item.type == 'date') || (schema_item.filter && schema_item.filter == 'date-range')) {
                for (var i = 0; i < imagequeue.features.length; i++) {
                    var feature = imagequeue.features[i];
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
imagequeue.findMarkerByFeature = function (feature_search) {
    var field_id = _.find(imagequeue.schema, function (s) {
            return s.id
        }).name || "id";

    var marker_found = null;
    var markers = _.toArray(imagequeue.layerHolder._layers);

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
imagequeue.setOpacity = function (layer, amount) {
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
imagequeue.popupContentOfFeature = function (feature) {
    var out = "";
    _.each(imagequeue.schema, function (schema_item) {
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

imagequeue.convertFeatureToGeoJson = function (feature) {
    var geojsonFeature = {
        "type": "Feature",
        "properties": feature.options,
        "popupContent": imagequeue.popupContentOfFeature(feature)
    };

    var field_id = _.find(imagequeue.schema, function (s) {
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
imagequeue.isFeatureInPolygon = function (feature, workcellGeojson) {
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
            var coords = imagequeue.workcellGeojson.coordinates[0][0];
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
imagequeue.updateFootprintFilteredResults = function (options) {
    var matched_list = [];
    var total = 0;
    if (imagequeue.outline_layer_group) {
        total = imagequeue.outline_layer_group.getLayers().length;
    }

    if (total == 0) return [];

    //var workcellGeojson = imagequeue.workcellGeojson;

    // check whether to show already accepted outlines or not
    // if (imagequeue.filters.previously_accepted && !imagequeue.map.hasLayer(imagequeue.accepted_layer_group)) {
    //     imagequeue.map.addLayer(imagequeue.accepted_layer_group);
    // } else if (!imagequeue.filters.previously_accepted && imagequeue.map.hasLayer(imagequeue.accepted_layer_group)) {
    //     imagequeue.map.removeLayer(imagequeue.accepted_layer_group);
    // }
    // // check whether to show rejected outlines or not
    // if (imagequeue.filters.previously_rejected && !imagequeue.map.hasLayer(imagequeue.rejected_layer_group)) {
    //     imagequeue.map.addLayer(imagequeue.rejected_layer_group);
    // } else if (!imagequeue.filters.previously_rejected && imagequeue.map.hasLayer(imagequeue.rejected_layer_group)) {
    //     imagequeue.map.removeLayer(imagequeue.rejected_layer_group);
    // }

    // //Check every feature against filters, then exclude features that don't match
    // for (var i = 0; i < imagequeue.features.length; i++) {
    //     var matched = true;
    //     var feature = imagequeue.features[i];
    //     //Check first if geometry is in bounds (if that's being checked for)
    //     if (feature.geometry && imagequeue.filters.in_bounds) {
    //         if (!imagequeue.isFeatureInPolygon(feature, workcellGeojson)) {
    //             matched = false;
    //         }
    //     }

        // // Check if item has been accepted and whether it should be shown
        // if (feature.status && feature.status == "Accepted" && !imagequeue.filters.previously_accepted) {
        //     matched = false;
        // }
        // //Check if item has been rejected and rejects shouldn't be shown
        // if (feature.status && feature.status == "RejectedQuality" && !imagequeue.filters.previously_rejected) {
        //     matched = false;
        // }
        //TODO: Make sure previous data is returned from AOIs

        //Check through each filter to see if it's excluded
    //     if (matched) _.each(imagequeue.schema, function (schema_item) {
    //         if (schema_item.filter && matched) {
    //             var fieldToCheck = schema_item.name;
    //             var filterSetting = imagequeue.filters[fieldToCheck];
    //             var val = feature[fieldToCheck];
    //
    //             if (val) {
    //                 //Check all possible options and see if the feature has that setting
    //                 if (schema_item.filter == 'options') {
    //                     var option_found = false;
    //                     for (var key in filterSetting) {
    //                         if (filterSetting[key] && (val == key)) {
    //                             option_found = true;
    //                             break;
    //                         }
    //                     }
    //                     if (!option_found) {
    //                         matched = false;
    //                     }
    //                 } else if (schema_item.filter == 'slider-max') {
    //                     if (parseFloat(val) > parseFloat(filterSetting)) {
    //                         matched = false;
    //                     }
    //                 } else if (schema_item.filter == 'date-range') {
    //                     var val_date = val;
    //                     var date_format = 'YYYY-MM-DD';
    //                     if (schema_item.transform == 'day' && val.indexOf('-') < 0) {
    //                         val_date = val.substr(0, 4) + '-' + val.substr(4, 2) + '-' + val.substr(6, 2);
    //                     } else if (schema_item.transform == 'thousands') {
    //                         //No problem if there are miliseconds in the field, moment should interpret it correctly
    //                     }
    //                     var feature_date = moment(val_date, date_format);
    //                     if (feature_date < filterSetting.startdate_moment ||
    //                         feature_date > filterSetting.enddate_moment) {
    //                         matched = false;
    //                     }
    //                 } else if (schema_item.filter == 'textbox') {
    //                     if (filterSetting && filterSetting.length && filterSetting.length > 3) {
    //                         if (val.toLowerCase().indexOf(filterSetting.toLowerCase()) == -1) {
    //                             matched = false;
    //                         }
    //                     }
    //                 }
    //             }
    //         }
    //     });
    //
    //     var opacity = 0;
    //     if (matched) {
    //         matched_list.push(feature);
    //         opacity = 0.6;
    //     }
    //     imagequeue.setOpacity(feature._marker, opacity);
    // }

    //Flatten matched_list to show in data table
    var flattened_list = [];
    for (var i = 0; i < matched_list.length; i++) {
        var feature = matched_list[i];
        var item = {};

        //Only store in the array items mentioned in the schema
        _.each(imagequeue.schema, function (schema_item) {
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
//    if (imagequeue.$matching_count) {
//        imagequeue.$matching_count.text(matched_list.length);
//        imagequeue.$matching_total.text(total);
//    }
    imagequeue.matched = matched_list;
    imagequeue.matched_flattened = flattened_list;

    //Update the grid
    if (imagequeue.$grid && imagequeue.$grid.css) {
        imagequeue.$grid.css({
            display: (matched_list.length > 0) ? 'block' : 'none'
        });
        //imagequeue.$grid.pqGrid("option", "dataModel", {data: flattened_list})
        imagequeue.addToResultTable(flattened_list);
    }
    return matched_list;
};
imagequeue.addResultCount = function ($holder) {
    var $div = $("<div>")
        .css({fontWeight: 'bold'})
        .appendTo($holder);
    imagequeue.$matching_count = $("<span>")
        .attr({id: 'imagequeue-matching-count'})
        .text('0')
        .appendTo($div);
    $("<span>")
        .html(' layers found. ')
        .appendTo($div);
    imagequeue.$matching_total = $("<span>")
        .attr({id: 'imagequeue-matching-count-total'})
        .text('0')
        .appendTo($div);
    $("<span>")
        .html(' match the below filters.')
        .appendTo($div);
};


imagequeue.addToResultTable = function (flattenedList) {

    var length = flattenedList.length;
    imagequeue.dataInTable = flattenedList;

    $('#imagelayer-list tbody').html("");
    for (var i = 0; i < length; i++) {
        // //Add accept toggle
        // var c1 = (flattenedList[i].status && flattenedList[i].status == 'Accepted') ? 'checked' : '';
        // var c2 = (!flattenedList[i].status || (flattenedList[i].status && flattenedList[i].status == 'NotEvaluated')) ? 'checked' : '';
        // var c3 = (flattenedList[i].status && flattenedList[i].status == 'RejectedQuality') ? 'checked' : '';

        var $tr = $('<tr>').on('click', function() {
            imagequeue.rowClicked(this);
        });

        var headers = [];

        $('#imagelayer-list tr').find('th').filter(function() {
            headers.push($(this).find('div')[0].textContent);
        });

        $('<td><input type="checkbox" onclick="imagequeue.showFootprint(this);" value="' + flattenedList[i].options['featureId'] +
            '" checked="checked"></td>').appendTo($tr);
        $('<td><input type="checkbox" onclick="imagequeue.showLayer(this);" value="' + flattenedList[i].options['featureId'] +
            '"></td>').appendTo($tr);

        _.each(headers, function(hdr) {
            var schemaItem = _.findWhere( imagequeue.schema, { title: hdr});
            if (schemaItem) {
                var value = flattenedList[i].options[schemaItem.name] || "";
                if (value.length > 16) {
                    value = value.substr(0,12)+"...";
                }
                $('<td>')
                    .html(value)
                    .css("border", "0px solid black")
                    .appendTo($tr);
            }
        });
        $('<td style="display:none;">' + JSON.stringify(flattenedList[i]) + '</td>')
            .attr('id', 'details-' + flattenedList[i].options['featureId'])
            .appendTo($tr);


        $('#imagelayer-list tbody').append($tr);
    }


    $("#imagelayer-list").trigger('update');
};

imagequeue.updateValueFromRadio = function(id, value) {
    var val, data_row;

    if (value < 0) {
        val = "RejectedQuality";
    } else if (value > 0) {
        val = "Accepted";
    } else {
        val = "NotEvaluated";
    }

    for (var i = 0; i < imagequeue.dataInTable.length; i++) {
        if (id == imagequeue.dataInTable[i].featureId) {
            data_row = imagequeue.dataInTable[i];
            break;
        }
    }

    var featureId = data_row.featureId;

    var inputs = {
        id: encodeURIComponent(featureId),
        evaluation: val
    };

    //Apply all the above inputs to the url template to build out the final url
    var proxy = leaflet_helper.proxy_path || '/geoq/proxy/';
    var url_template = _.template(imagequeue.featureSelectUrl);
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
        featureId: data_row.featureId,
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

    // find that layer in imagequeue.features and update
    for (var i = 0; i < imagequeue.features.length; i++) {
        if (data_row.featureId == imagequeue.features[i].featureId) {
            imagequeue.features[i].status = val;
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

imagequeue.rowClicked = function (row) {
    var index = row.rowIndex -1;
    var imageid = imagequeue.dataInTable[index].featureId;
    var image_status = imagequeue.dataInTable[index].status;

    // change back previous selection if necessary
    if ( imagequeue.outline_layer_group.lastHighlight.id ) {
        var pastlayers = imagequeue.getLayerGroup(imagequeue.outline_layer_group.lastHighlight.status).getLayers();
        var player = pastlayers.filter(function(e) {return e.options.featureId == imagequeue.outline_layer_group.lastHighlight.id})[0];
        if (player) {
            if ($(':input[value=' + player.options.featureId + ']').first().is(':checked')) {
                player.setStyle(imagequeue.defaultFootprintStyle);
                imagequeue.unhideFootprint(player);
            } else {
                imagequeue.hideFootprint(player);
            }
        }
    }

    // change the color of the selected image
    var newlayers = imagequeue.getLayerGroup(image_status).getLayers();
    var layer = newlayers.filter(function(e) { return e.options.featureId == imageid; })[0];
    if (layer) {
        layer.setStyle(imagequeue.selectStyle('Selected'));
        layer.bringToFront();
        imagequeue.outline_layer_group.lastHighlight = {'id': imageid, 'status': layer.options.status};
    }

    $("#imagelayer-list").trigger('update');

};

// pager functions
imagequeue.first = function() {
    imagequeue.current_index = 1;
    imagequeue.updateFootprintDataFromWFSServer();
};

imagequeue.prev = function() {
    imagequeue.current_index = (imagequeue.current_index - imagequeue.wfs_max_records > 0 )?
        imagequeue.current_index -= imagequeue.wfs_max_records : 1;
    imagequeue.updateFootprintDataFromWFSServer();
};

imagequeue.next = function() {
    imagequeue.current_index = imagequeue.next_index;
    imagequeue.updateFootprintDataFromWFSServer();
};

imagequeue.last = function() {
    imagequeue.current_index = imagequeue.record_count - (imagequeue.record_count % imagequeue.wfs_max_records) + 1;
    imagequeue.updateFootprintDataFromWFSServer();
};

imagequeue.addResultTable = function ($holder) {
    //We can change the max height here when we are testing with many elements.
    var $grid = $("<div class='tableContainer' style='overflow-x:auto; overflow-y: auto; max-height: 250px'><table class='tablesorter' id='imagelayer-list'><colgroup><thead><tr></tr></thead><tbody></tbody></table>")
        .appendTo($holder);

    var $row = $grid.find("tr");

    var $fph = $('<th>').text('FP')
        .append($('<input>')
            .attr({'id': 'select-all-footprints', 'type':'checkbox','checked':true})
            );

    $row.append($fph);
    $row.append("<th>IM</th>");

    // first column is the accept/reject buttons
    //$row.append("<th>FP</th>");
    //$row.append("<th>IM</th>");
    //$row.append("<th>Data</th>");

    _.each( imagequeue.schema, function(item) {
        if (item.show && item.show === 'small-table') {
            $row.append("<th>" + item.title + "</th>");
        }
    });

    var $pager = $("<div id='pager' class='pager'><form>" +
        "<img src='/static/images/first.png' class='first' onclick='imagequeue.first()' alt='First'/>" +
        "<img src='/static/images/prev.png' class='prev' onclick='imagequeue.prev()'/><span id='page-view' class='gpagedisplay'></span>" +
        "<img src='/static/images/next.png' class='next' onclick='imagequeue.next()'/>" +
        "<img src='/static/images/last.png' class='last' onclick='imagequeue.last()'/></form></div>")
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
		size: imagequeue.wfs_max_records,

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
        var total_pages = Math.floor(imagequeue.record_count / imagequeue.wfs_max_records) + 1;
        var page_num = Math.floor(imagequeue.current_index / imagequeue.wfs_max_records) + 1;
        $('#page-view').text('Page ' + page_num + " of " + total_pages);
    });

    $("#imagelayer-list").trigger('update');
    //Have to call this function
    $('#imagelayer-list').trigger('pageAndSize');

    // select/deselect all footprints
    $('#select-all-footprints').bind('click',function() {
        var checked = $(this).is(':checked');

        $('#imagelayer-list tr td:first-child input').each(function(index) {
            $(this).click();
        });
    });

    imagequeue.$grid = $grid;
};
imagequeue.getFeatureFromTable = function (rowData) {

    var field_id = _.find(imagequeue.schema, function (s) {
            return s.id
        }).name || "id";

    var feature = null;
    for (var j = 0; j < imagequeue.features.length; j++) {
        feature = imagequeue.features[j];
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

imagequeue.addWorkcellBounds = function ($holder) {
    var $div = $("<div><b>Only show items in workcell:</b> </div>")
        .appendTo($holder);
    $('<input>')
        .attr({type: 'checkbox', value: 'in-geo', checked: true})
        .css({fontSize: '12px', padding: '2px'})
        .on('change', function () {
            var val = $(this).attr('checked');
            imagequeue.filters.in_bounds = !!val;
            imagequeue.updateFootprintFilteredResults();
        })
        .appendTo($div);
};
imagequeue.addAcceptedButton = function ($holder) {
    var $div = $("<div><b>Show items previously accepted:</b> </div>")
        .appendTo($holder);
    $('<input>')
        .attr({type: 'checkbox', value: 'previously_accepted', checked: true})
        .css({fontSize: '12px', padding: '2px'})
        .on('change', function () {
            var val = $(this).attr('checked');
            imagequeue.filters.previously_accepted = !!val;
            imagequeue.updateFootprintFilteredResults();
        })
        .appendTo($div);
};
imagequeue.addRejectButton = function ($holder) {
    var $div = $("<div><b>Show items previously rejected:</b> </div>")
        .appendTo($holder);
    $('<input>')
        .attr({type: 'checkbox', value: 'previously_rejected', checked: false})
        .css({fontSize: '12px', padding: '2px'})
        .on('change', function () {
            var val = $(this).attr('checked');
            imagequeue.filters.previously_rejected = !!val;
            imagequeue.updateFootprintFilteredResults();
        })
        .appendTo($div);
};
imagequeue.addHideButton = function ($holder) {
    var $div = $("<div><b>Hide all imagequeue:</b></div>")
        .appendTo($holder);
    $('<input>')
        .attr({type: 'checkbox', value: 'hide_imagequeue', checked: false})
        .css({fontSize: '12px', padding: '2px'})
        .on('change', function () {
            var val = $(this).attr('checked');
            imagequeue.hideFootprints(!!val);
        })
        .appendTo($div);
};
imagequeue.hideFootprints = function (hide) {
    imagequeue.outline_layer_group.eachLayer( function(layer) {
        if (hide) {
            layer.setStyle({fillOpacity:0, opacity: 0});
        } else {
            layer.setStyle({fillOpacity:.5, opacity:.6});
        }
    })
};
imagequeue.addFilterPrompts = function ($content) {
    _.each(imagequeue.promptFields || [], function (prompt_item) {
        $("<span>")
            .html((prompt_item.title || prompt_item.name) + ": ")
            .attr('title', prompt_item.popover)
            .appendTo($content);
        $("<input>")
            .val(prompt_item.default || '')
            .attr('title', prompt_item.popover)
            .css({minWidth: '100px', maxWidth: '120px'})
            .on('change', function (evt) {
                imagequeue.prompts[prompt_item.name] = evt.target.value;
            })
            .appendTo($content);
        $("<br>")
            .appendTo($content);
    });

};
imagequeue.addFilterTextbox = function ($holder) {
    $("<div><b>Add a search filter:</b></div>")
        .appendTo($holder);

    var $query_builder = $("<div>")
        .attr("id","builder")
        .appendTo($holder);

    var query_filters = [];
    _.each(imagequeue.schema, function(s) { if (s.query_filter) query_filters.push(s.query_filter); });

    $('#builder').queryBuilder( {
        filters: query_filters
    });

    return null;
};
imagequeue.addFilterDateMax = function ($holder, schema_item) {
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

    imagequeue.filters[schema_item.name] = imagequeue.filters[schema_item.name] || {};

    function cb(start, end) {
        $dateVals.find('span').html(start.format('MMMM D, YYYY') + ' - ' + end.format('MMMM D, YYYY'));
        imagequeue.filters[schema_item.name].startdate_moment = start;
        imagequeue.filters[schema_item.name].enddate_moment = end;
        imagequeue.updateFootprintFilteredResults();
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
imagequeue.showFilterBoxes = function (display) {
    display = display || "block";
    if (imagequeue.$filter_holder && imagequeue.$filter_holder.css) {
        imagequeue.$filter_holder.css({display: display});
    }
};
imagequeue.addFilterButton = function ($holder) {
    $('<button>')
        .addClass('btn btn-info')
        .attr({type: 'button'})
        .html('<i class="icon-filter"></i>&nbspSearch for ' + imagequeue.title + ' within view extents')
        .on('click', function () {
            imagequeue.next_index = imagequeue.last_index = 1;
            imagequeue.updateFootprintDataFromWFSServer();
        })
        .appendTo($holder);
    imagequeue.$error_div = $('<div>')
        .html('')
        .css({fontStyle: 'italic'})
        .appendTo($holder);


};

imagequeue.addFilterSliderMax = function ($holder, schema_item) {
    var $slider = $('<div>')
        .appendTo($holder);

    var $cc = $('<div><b>Max ' + (schema_item.title || schema_item.name) + ':</b></div>')
        .appendTo($slider);
    var $cc_count = $('<span>')
        .html(" (" + (schema_item.start || 10) + ")")
        .appendTo($cc);

    imagequeue.filters[schema_item.name] = schema_item._max || schema_item.start || 10;

    var $input = $('<input>')
        .attr('type', 'range')
        .on('input', _.debounce(function () {
            imagequeue.filters[schema_item.name] = this.value;
            imagequeue.updateFootprintFilteredResults();
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
imagequeue.addFilterOptions = function ($holder, schema_item) {
    var $options = $('<div>')
        .appendTo($holder);

    var fieldToUpdate = schema_item.name;
    imagequeue.filters[fieldToUpdate] = imagequeue.filters[fieldToUpdate] || {};

    var update = function () {
        if (imagequeue.features.length == 0) return;

        var $options_new = $('<div>');

        $('<div><b>Filter ' + (schema_item.title || schema_item.name) + ':</b></div>').appendTo($options_new);

        //Find the unique keys
        var option_items = {};
        var options = [];
        var option_ids = [];

        _.each(imagequeue.features, function (feature) {
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
            var val = imagequeue.filters[fieldToUpdate][option];
            if (typeof val != "boolean") {
                val = true;
                imagequeue.filters[fieldToUpdate][option] = val;
            }

            $('<input>')
                .attr({type: 'checkbox', value: option, checked: val})
                .css({fontSize: '12px', padding: '2px'})
                .on('change', function () {
                    var val = $(this).attr('checked');
                    imagequeue.filters[fieldToUpdate][option] = !!val;
                    imagequeue.updateFootprintFilteredResults();
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
                if (imagequeue.layerColors && layer_id <= imagequeue.layerColors.length) {
                    $span
                        .css({backgroundColor: imagequeue.layerColors[layer_id]})
                }
            }
            $holder_div.appendTo($options_new);
        });
        $options.replaceWith($options_new);
    };
    update();
    return update;

};

geoq.imagequeue = imagequeue;
