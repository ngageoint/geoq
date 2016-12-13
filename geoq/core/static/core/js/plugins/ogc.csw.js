/**
 * Created by steve on 4/5/16.
 * Library to handle interactions with a Catalog Service for the Web (CSW) server
 * Dependant on jQuery functions
 */

var ogc_csw = {};

// catalog options
ogc_csw.server = 'localhost';
ogc_csw.port = '8080';
ogc_csw.protocol = 'http';
ogc_csw.path = '/geoserver';
ogc_csw.validated_server;

ogc_csw.current_layer_list = [];

ogc_csw.schema = {
    'image_id': { key: 'dc:identifier', default: 'unknown'},
    'url': { key: 'dct:references', default: null },
    'format': { key: 'dc:format', default: 'OGC:WMS'},
    'ObservationDate': { key: 'dct:modified', default: moment().format('YYYY-MM-DD')},
    'maxCloudCoverPercentageRate': { key: null, default: 1},
    'platformCode': { key: 'dc:platform', default: 'Unknown'},
    'sensor': {key: null, default: 'def456'},
    'layerName': {key: 'dc:title', default: 'Unknown'},
    'status': {key: null, default: 'NotEvaluated'},
    'keyword': {key: 'dc:subject', default: 'unknown'}
};

ogc_csw.filterOperators = {
    equal:            { op: 'ogc:PropertyIsEqualTo' },
    not_equal:        { op: 'ogc:PropertyIsNotEqualTo' },
    less:             { op: 'ogc:PropertyIsLessThan' },
    less_or_equal:    { op: 'ogc:PropertyIsLessThanOrEqualTo' },
    greater:          { op: 'ogc:PropertyIsGreaterThan' },
    greater_or_equal: { op: 'ogc:PropertyIsLessThanOrEqualTo' },
    between:          { op: 'ogc:PropertyIsBetween',      sep: 'And' },
    is_null:          { op: 'ogc:PropertyIsNull' },
    contains:      { op: 'ogc:PropertyIsLike', wildcards: true }
};

ogc_csw.cqlOperators = {
    equal:            { op: '=' },
    not_equal:        { op: '<>' },
    less:             { op: '<' },
    less_or_equal:    { op: '<=' },
    greater:          { op: '>', date_op: " after " },
    greater_or_equal: { op: '>=' , date_op: " after "},
    between:          { op: ' between ',      sep: 'And' },
    is_null:          { op: 'ogc:PropertyIsNull' },
    contains:      { op: ' like ', wildcards: true }
};

ogc_csw.layers = {
    OGC_WMS:                    { type: 'WMS', format: 'image/png'},
    OGC_WMTS:                   { type: 'WMTS'},
    ESRI_ArcGIS_ImageServer:    { type: 'ESRI Image Map Layer'},
    ESRI_ArcGIS_MapServer:      { type: 'ESRI Dynamic Map Layer'}
};

ogc_csw.init = function(options) {
// initialize
    if (options) ogc_csw = $.extend(ogc_csw, options);
};

ogc_csw.getCapabilities = function() {
    var proxy = leaflet_helper.proxy_path || '/geoq/proxy/';
    var params = {
        service: "csw",
        version: "2.0.2",
        request: "GetCapabilities"
    };

    var url = ogc_csw.protocol + "://" + ogc_csw.server + ":" + ogc_csw.port + ogc_csw.path + "/csw?" + $.param(params);

    $.ajax({
        type: 'GET',
        url: proxy + url,
        dataType: 'xml',
        success: function (xml, lang) {
            // make sure it supports GetRecords
            var $xml = $(xml);
            var count = $xml.find('[name="GetRecords"]');
            ogc_csw.validated_server = (count.length > 0);
        },
        failure: function () {
            alert("Couldn't contact CSW server");
        }
    });
};

ogc_csw.getRecordsGet = function(params,input,callback) {
    var proxy = leaflet_helper.proxy_path || '/geoq/proxy';

    params['constraint'] = ogc_csw.createCQLConstraint(input);
    params['constraintLanguage'] = "CQL_TEXT";
    params['constraint_language_version'] = "1.1.0";

    var url = ogc_csw.protocol + "://" + ogc_csw.server + ":" + ogc_csw.port + ogc_csw.path + "/csw?" + $.param(params);

    $.ajax({
        type: 'GET',
        url: proxy + url,
        dataType: 'xml',
        success: callback,
        failure: function () {
            alert('unable to retrieve csw records');
        }
    });

};

ogc_csw.createCQLConstraint = function(input) {
    var cql = {constraintLanguage: "CQL_TEXT"};
    if (_.size(input) > 1) {
        return ogc_csw.write_cql_group_rules(input);
    }

    // else
    return '';
};

ogc_csw.write_cql_group_rules = function(input) {
    var boolean_expr = input.condition ? input.condition.toLowerCase() : "and";
    var constraints = [];
    if (input.rules) {
        _.each(input.rules, function(rule) {
            if (_.isArray(rule)) {
                if (rule[0].condition) {
                    // this is a subgroup
                    constraints.push("(" + ogc_csw.write_cql_group_rules(rule[0]) + ")");
                } else {
                    // just append these rules
                    _.each(rule, function(r) {
                        constraints.push(ogc_csw.write_cql_constraint(r));
                    })
                }
            } else {
                constraints.push(ogc_csw.write_cql_constraint(rule));
            }
        });
    } else if (input.length > 0) {
        _.each(input, function(rule) {
            constraints.push(ogc_csw.write_cql_constraint(rule));
        });
    }

    return constraints.join( " " + boolean_expr + " " );
};

ogc_csw.write_cql_constraint = function(input) {
    // write element rule depending on type
    if (input.type === "location") {
        return ogc_csw.createCQLBoundsConstraint(input);
    } else if (input.type === "date" ) {
        return ogc_csw.createCQLDateConstraint(input);
    } else {
        return ogc_csw.createCQLNamedConstraint(input);
    }
};

ogc_csw.createCQLBoundsConstraint = function(input) {
    if (input.field && input.value && input.value.length == 2) {
        return "BBOX(" + input.field + "," + input.value[0].lon + "," + input.value[0].lat +
            "," + input.value[1].lon + "," + input.value[1].lat + ")";
    }

    // else
    return '';
};

ogc_csw.createCQLDateConstraint = function(input) {
    if (input.field && input.operation && input.value) {
        return input.field + (ogc_csw.cqlOperators[input.operation]).date_op + input.value;
    }
};

ogc_csw.createCQLNamedConstraint = function(input) {
    if (input.field && input.operator && input.value) {
        return input.field + (ogc_csw.cqlOperators[input.operator]).op + "\'" + input.value + "\'";
    }

    // else
    return '';
};

ogc_csw.getRecordsPost = function(params,input,callback) {
    var proxy = leaflet_helper.proxy_path || '/geoq/proxy';

    var url = ogc_csw.protocol + "://" + ogc_csw.server + ":" + ogc_csw.port + ogc_csw.path + "/csw";

    var data = ogc_csw.createXMLPostData(params,input);

    $.ajax({
        type: 'POST',
        url: encodeURI(proxy + url),
        contentType: 'text/xml',
        dataType: 'xml',
        data: ((new XMLSerializer()).serializeToString(data)),
        success: callback,
        failure: function() {
            alert('unable to retrieve csw records');
        }
    });
};

ogc_csw.createXMLPostData = function(params,input) {
    var xw = new XMLWriter('UTF-8');

    xw.writeStartDocument();
    xw.writeStartElement("csw:GetRecords");
      xw.writeAttributeString("xmlns:csw", "http://www.opengis.net/cat/csw/2.0.2");
      xw.writeAttributeString("xmlns:ogc", "http://www.opengis.net/ogc");
      xw.writeAttributeString("xmlns:gml", "http://www.opengis.net/gml");
      xw.writeAttributeString("service",params.service);
      xw.writeAttributeString("version",params.version);
      xw.writeAttributeString("resultType",params.resultType);
      xw.writeAttributeString("maxRecords",params.maxRecords);
      xw.writeAttributeString("startPosition", params.startPosition);
      xw.writeAttributeString("outputSchema",params.outputSchema);

      xw.writeStartElement("csw:Query");
        xw.writeAttributeString("typeNames",params.typeNames);
        xw.writeStartElement("csw:ElementSetName");
          xw.writeString(params.elementSetName);
        xw.writeEndElement();

        // start the constraints section
        xw.writeStartElement("csw:Constraint");
        xw.writeAttributeString("version", "1.1.0");
        xw.writeStartElement("ogc:Filter");

        // write out filter depending on rules. top level will always be a group
        if (_.size(input) > 1) {
            ogc_csw.write_group_rules(xw, input);
        }

        // end constraints
        xw.writeEndElement();  // Filter
        xw.writeEndElement();  // Constraint

      xw.writeEndElement(); // Query
    xw.writeEndElement();   // GetRecords
    xw.writeEndDocument();

    return xw.getDocument();
};

ogc_csw.write_group_rules = function(xw, input) {
    // write group rules
    var group_tag = (input.condition === "AND") ? "ogc:And" : "ogc:Or";
    xw.writeStartElement(group_tag);
    _.each(input.rules, function(rule) {
        if (rule.condition) {
            ogc_csw.write_group_rules(xw,rule);
        } else {
            ogc_csw.write_element_rule(xw,rule);
        }
    });
    xw.writeEndElement();
};

ogc_csw.write_element_rule = function(xw, input) {
    // write element rule depending on type
    if (input.type === "location") {
        ogc_csw.createBoundsConstraint(xw, input);
    } else if (input.type === "date" ) {
        ogc_csw.createDateConstraint(xw, input);
    } else {
        ogc_csw.createNamedConstraint(xw, input);
    }
};

ogc_csw.createBoundsConstraint = function(xdoc, element) {
    xdoc.writeStartElement("ogc:Contains");
    xdoc.writeStartElement("ogc:PropertyName");
    xdoc.writeString("ows:BoundingBox");
    xdoc.writeEndElement();  // PropertyName
    xdoc.writeStartElement("gml:Envelope");
    xdoc.writeStartElement("gml:lowerCorner");
    xdoc.writeString(element.value[0]['lon'] + " " + element.value[0]['lat']);
    xdoc.writeEndElement();  // lowerCorner
    xdoc.writeStartElement("gml:upperCorner");
    xdoc.writeString(element.value[1]['lon'] + " " + element.value[1]['lat']);
    xdoc.writeEndElement(); // upperCorner
    xdoc.writeEndElement(); // Envelope
    xdoc.writeEndElement(); // Contains
};

ogc_csw.createDateConstraint = function(xdoc, element) {
    xdoc.writeStartElement("ogc:PropertyIsGreaterThan");
    xdoc.writeStartElement("ogc:PropertyName");
    xdoc.writeString(element.field);
    xdoc.writeEndElement(); // PropertyName
    xdoc.writeStartElement("ogc:Literal");
    xdoc.writeString(element.value);
    xdoc.writeEndElement();  // Literal
    xdoc.writeEndElement(); // PropertyIsGreaterThan
};

ogc_csw.createNamedConstraint = function(xdoc, element) {
    element = element[0];
    xdoc.writeStartElement((ogc_csw.filterOperators[element.operator]).op);
    if ((ogc_csw.filterOperators[element.operator]).wildcards) {
        xdoc.writeAttributeString("wildCard","*");
        xdoc.writeAttributeString("singleChar","#");
        xdoc.writeAttributeString("escapeChar","!");
    }
    xdoc.writeStartElement("ogc:PropertyName");
    xdoc.writeString(element.field);
    xdoc.writeEndElement(); // PropertyName
    xdoc.writeStartElement("ogc:Literal");
    xdoc.writeString(element.value);
    // TODO: support something other than begins_with
    if ((ogc_csw.filterOperators[element.operator]).wildcards) {
        xdoc.writeString("*");
    }
    xdoc.writeEndElement(); // Literal
    xdoc.writeEndElement(); // <operator>
};

ogc_csw.createWMSLayerFromRecord = function(record) {
    var newlayer = {};
    try {
        var parser = document.createElement('a');
        parser.href = ogc_csw.getRecordValue(record, 'wms');
        var search = parser.search.substring(1);
        var parts = JSON.parse('{"' + decodeURI(search).replace(/"/g, '\\"').replace(/&amp;/g, '","').replace(/=/g,'":"') + '"}');
        if (parts.service === 'WMS') {
            newlayer = L.tileLayer.wms(parser.protocol + "//" + parser.host + parser.pathname, {
                layers: parts.layers,
                format: 'image/png',
                transparent: true,
                attribution: $(record).find('creator').text()
            });

            var html = "<p>Image</p>";
            newlayer.bindPopup(html);
        }
    } catch (e) {
        console.error(e);
    }

    return newlayer;
};

ogc_csw.getRecordValue = function(record, attribute) {

    if (ogc_csw.schema[attribute].key) {
        // TODO: only grabbing the first record, but will probably want to see which one (if more than one) is most appropriate
        return $(record).filterNode(ogc_csw.schema[attribute].key).first().text() || 'unknown';
    } else {
        return ogc_csw.schema[attribute].default;
    }
};

// take a CSW xml object in and create an object we can use
ogc_csw.parseCSWRecord = function(record) {
    var oRecord = {};
    oRecord.options = {};

    try {
        var $box = $(record).filterNode('ows:BoundingBox');
        oRecord.uc = $box.filterNode('ows:UpperCorner').text();
        oRecord.lc = $box.filterNode('ows:LowerCorner').text();

        _.each(_.keys(ogc_csw.schema), function(key) {
            oRecord.options[key] = ogc_csw.getRecordValue(record, key);
        });

    } catch (e) {
        console.error(e);
    }

    return oRecord;
};

ogc_csw.createRectangleFromBoundingBox = function(box, style) {
    var outlineLayer = {};
    try {
        outlineLayer = L.rectangle([box.lc.split(' ').map(Number),box.uc.split(' ').map(Number)],
            style);
        $.extend(outlineLayer.options,box.options);
    } catch (e) {
        console.error(e);
    }

    return outlineLayer;
};

ogc_csw.createPolygonFromCoordinates = function(record, style) {
    // create a polygon from a space-delimited list of x y (lon lat) coordinates
    // e.g. "135.75 34.75 136.82 34.75 136.86 33.57 135.75 33.57"
    // 6/13 -- need to reverse the ordering, actually coming in [lat lon lat lon...]
    var outlineLayer  = {};
    try {
        var coordArray = record.posList.split(' ');
        var latlonArray = [];

        for (var i = 0; i < coordArray.length; i+=2 ) {
            var latlng = L.latLng(coordArray[i],coordArray[i+1]);
            latlonArray.push(latlng);
        }

        outlineLayer = L.polygon(latlonArray, style);
        $.extend(outlineLayer.options,record.options)
    } catch (e) {
        console.error(e);
    }

    return outlineLayer;
};

ogc_csw.createPolygonFromGeometry = function(geometry, options, style) {
    // create a polygon from a geometry with a rings array
    var outlineLayer = {};
    try {
        if (geometry.rings) {
            var latlonArray = [];
            var ringArray = geometry.rings[0];
            for (var i = 0; i < ringArray.length; i++) {
                var latlng = L.latLng(ringArray[i][1],ringArray[i][0]);
                latlonArray.push(latlng);
            }
            outlineLayer = L.polygon(latlonArray, style);
            $.extend(outlineLayer.options, options);
        }
    } catch (e) {
        console.error(e);
    }

    return outlineLayer;
};

ogc_csw.createLayerPopup = function(options) {
    var layerName = options.layerName;
    var func2 = 'footprints.replaceCSWOutlineWithLayer("' + options.image_id + '")';
    var html = "<p><b>Name: </b>" + layerName +
        "<br/><a href=\'#\' onclick=\'" + func2 + "\'>Replace with layer data</a>";

    return html;
};
