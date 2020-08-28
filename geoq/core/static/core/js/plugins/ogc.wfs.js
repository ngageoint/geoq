/**
 * Created by steve on 4/5/16.
 * Library to handle interactions with a Catalog Service for the Web (CSW) server
 * Dependant on jQuery functions
 */

var ogc_wfs = {};

// catalog options
ogc_wfs.server = 'evwhs.digitalglobe.com';
ogc_wfs.port = '443';
ogc_wfs.protocol = 'https';
ogc_wfs.path = '/catalogservice/wfsaccess';
ogc_wfs.validated_server;

ogc_wfs.current_layer_list = [];

ogc_wfs.schema = {
    'featureId': { key: 'DigitalGlobe:featureId', default: 'unknown'},
    'ObservationDate': { key: 'DigitalGlobe:formattedDate', default: moment().format('YYYY-MM-DD')},
    'cloudCover': { key: 'DigitalGlobe:cloudCover', default: 1},
    'source': { key: 'DigitalGlobe:source', default: 'Unknown'},
    'type': { key: 'DigitalGlobe:productType', default: 'Unknown'},
    'offNadirAngle': {key: 'DigitalGlobe:offNadirAngle', default: 'Unknown'},
    'niirs': {key: 'DigitalGlobe:niirs', default: 0}
};

ogc_wfs.filterOperators = {
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

ogc_wfs.cqlOperators = {
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

ogc_wfs.layers = {
    OGC_WMS:                    { type: 'WMS', format: 'image/png'},
    OGC_WMTS:                   { type: 'WMTS'},
    ESRI_ArcGIS_ImageServer:    { type: 'ESRI Image Map Layer'},
    ESRI_ArcGIS_MapServer:      { type: 'ESRI Dynamic Map Layer'}
};

ogc_wfs.init = function(options) {
// initialize
    if (options) ogc_wfs = $.extend(ogc_wfs, options);
};

ogc_wfs.getCapabilities = function() {
    var proxy = leaflet_helper.proxy_path || '/geoq/proxy/';
    var params = {
        service: "csw",
        version: "2.0.2",
        request: "GetCapabilities"
    };

    var url = ogc_wfs.protocol + "://" + ogc_wfs.server + ":" + ogc_wfs.port + ogc_wfs.path + "/csw?" + $.param(params);

    $.ajax({
        type: 'GET',
        url: proxy + url,
        dataType: 'xml',
        success: function (xml, lang) {
            // make sure it supports GetRecords
            var $xml = $(xml);
            var count = $xml.find('[name="GetRecords"]');
            ogc_wfs.validated_server = (count.length > 0);
        },
        failure: function () {
            alert("Couldn't contact CSW server");
        }
    });
};

ogc_wfs.getRecordsGet = function(params,input,callback) {
    var proxy = leaflet_helper.proxy_path || '/geoq/proxy';

    //params['constraint'] = ogc_wfs.createCQLConstraint(input);
    //params['constraintLanguage'] = "CQL_TEXT";
    //params['constraint_language_version'] = "1.1.0";
    params['BBOX'] = "9.48597427929077,112.76950836181642,9.739850531834515,113.16707611083986";
    var username = "1040272700";
    var password = "438qzbVJUwwi9r7!";

    var url = ogc_wfs.protocol + "://" + ogc_wfs.server + ":" + ogc_wfs.port + ogc_wfs.path + "?" + $.param(params);

    $.ajax({
        type: 'GET',
        crossDomain: true,
        url: proxy + url,
        dataType: 'xml',
        success: callback,
        beforeSend: function(xhr) {
          xhr.withCredentials = true;
          xhr.setRequestHeader('Authorization', 'Basic ' + btoa(username + ":" + password));
        },
        failure: function () {
            alert('unable to retrieve wfs records');
        }
    });

};

ogc_wfs.createCQLConstraint = function(input) {
    var cql = {constraintLanguage: "CQL_TEXT"};
    if (_.size(input) > 1) {
        return ogc_wfs.write_cql_group_rules(input);
    }

    // else
    return '';
};

ogc_wfs.write_cql_group_rules = function(input) {
    var boolean_expr = input.condition ? input.condition.toLowerCase() : "and";
    var constraints = [];
    if (input.rules) {
        _.each(input.rules, function(rule) {
            if (_.isArray(rule)) {
                if (rule[0].condition) {
                    // this is a subgroup
                    constraints.push("(" + ogc_wfs.write_cql_group_rules(rule[0]) + ")");
                } else {
                    // just append these rules
                    _.each(rule, function(r) {
                        constraints.push(ogc_wfs.write_cql_constraint(r));
                    })
                }
            } else {
                constraints.push(ogc_wfs.write_cql_constraint(rule));
            }
        });
    } else if (input.length > 0) {
        _.each(input, function(rule) {
            constraints.push(ogc_wfs.write_cql_constraint(rule));
        });
    }

    return constraints.join( " " + boolean_expr + " " );
};

ogc_wfs.write_cql_constraint = function(input) {
    // write element rule depending on type
    if (input.type === "location") {
        return ogc_wfs.createCQLBoundsConstraint(input);
    } else if (input.type === "date" ) {
        return ogc_wfs.createCQLDateConstraint(input);
    } else {
        return ogc_wfs.createCQLNamedConstraint(input);
    }
};

ogc_wfs.createCQLBoundsConstraint = function(input) {
    if (input.field && input.value && input.value.length == 2) {
        return "BBOX(" + input.field + "," + input.value[0].lon + "," + input.value[0].lat +
            "," + input.value[1].lon + "," + input.value[1].lat + ")";
    }

    // else
    return '';
};

ogc_wfs.createCQLDateConstraint = function(input) {
    if (input.field && input.operation && input.value) {
        return input.field + (ogc_wfs.cqlOperators[input.operation]).date_op + input.value;
    }
};

ogc_wfs.createCQLNamedConstraint = function(input) {
    if (input.field && input.operator && input.value) {
        return input.field + (ogc_wfs.cqlOperators[input.operator]).op + "\'" + input.value + "\'";
    }

    // else
    return '';
};

ogc_wfs.getRecordsPost = function(params,input,callback) {
    var proxy = leaflet_helper.proxy_path || '/geoq/proxy';

    var url = ogc_wfs.protocol + "://" + ogc_wfs.server + ":" + ogc_wfs.port + ogc_wfs.path + "/csw";

    var data = ogc_wfs.createXMLPostData(params,input);

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

ogc_wfs.createXMLPostData = function(params,input) {
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
            ogc_wfs.write_group_rules(xw, input);
        }

        // end constraints
        xw.writeEndElement();  // Filter
        xw.writeEndElement();  // Constraint

      xw.writeEndElement(); // Query
    xw.writeEndElement();   // GetRecords
    xw.writeEndDocument();

    return xw.getDocument();
};

ogc_wfs.write_group_rules = function(xw, input) {
    // write group rules
    var group_tag = (input.condition === "AND") ? "ogc:And" : "ogc:Or";
    xw.writeStartElement(group_tag);
    _.each(input.rules, function(rule) {
        if (rule.condition) {
            ogc_wfs.write_group_rules(xw,rule);
        } else {
            ogc_wfs.write_element_rule(xw,rule);
        }
    });
    xw.writeEndElement();
};

ogc_wfs.write_element_rule = function(xw, input) {
    // write element rule depending on type
    if (input.type === "location") {
        ogc_wfs.createBoundsConstraint(xw, input);
    } else if (input.type === "date" ) {
        ogc_wfs.createDateConstraint(xw, input);
    } else {
        ogc_wfs.createNamedConstraint(xw, input);
    }
};

ogc_wfs.createBoundsConstraint = function(xdoc, element) {
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

ogc_wfs.createDateConstraint = function(xdoc, element) {
    xdoc.writeStartElement("ogc:PropertyIsGreaterThan");
    xdoc.writeStartElement("ogc:PropertyName");
    xdoc.writeString(element.field);
    xdoc.writeEndElement(); // PropertyName
    xdoc.writeStartElement("ogc:Literal");
    xdoc.writeString(element.value);
    xdoc.writeEndElement();  // Literal
    xdoc.writeEndElement(); // PropertyIsGreaterThan
};

ogc_wfs.createNamedConstraint = function(xdoc, element) {
    element = element[0];
    xdoc.writeStartElement((ogc_wfs.filterOperators[element.operator]).op);
    if ((ogc_wfs.filterOperators[element.operator]).wildcards) {
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
    if ((ogc_wfs.filterOperators[element.operator]).wildcards) {
        xdoc.writeString("*");
    }
    xdoc.writeEndElement(); // Literal
    xdoc.writeEndElement(); // <operator>
};

ogc_wfs.createWMSLayerFromRecord = function(record) {
    var newlayer = {};
    try {
        //var parser = document.createElement('a');
        //parser.href = ogc_wfs.getRecordValue(record, 'wms');
        var u = "";
        var p = "!";
        //var search = parser.search.substring(1);
        //var parts = JSON.parse('{"' + decodeURI(search).replace(/"/g, '\\"').replace(/&amp;/g, '","').replace(/=/g,'":"') + '"}');
        var parts = {service:'WMS'};
        if (parts.service === 'WMS') {
            newlayer = L.TileLayer.wmsHeader("/geoq/proxy/https://evwhs.digitalglobe.com/mapservice/wmsaccess?connectid=<connectid>", {
                layers: "DigitalGlobe:Imagery",
                format: 'image/png',
                transparent: true,
                attribution: "DigitalGlobe",
                styles: "",
                FeatureProfile: "Default_Profile",
                featureId: record.options.featureId,
                COVERAGE_CQL_FILTER: "featureId='" + record.options.featureId + "'"
            },
            [
              { header: 'Authorization', value: 'Basic ' + btoa(u+':'+p)}
            ],
              null
            );

            var html = "<p>Image</p>";
            newlayer.bindPopup(html);
        }
    } catch (e) {
        console.error(e);
    }

    return newlayer;
};

ogc_wfs.getRecordValue = function(record, attribute) {

    if (ogc_wfs.schema[attribute].key) {
        // TODO: only grabbing the first record, but will probably want to see which one (if more than one) is most appropriate
        return $(record).filterNode(ogc_wfs.schema[attribute].key).first().text() || 'unknown';
    } else {
        return ogc_wfs.schema[attribute].default;
    }
};

// take a CSW xml object in and create an object we can use
ogc_wfs.parseWFSRecord = function(record) {
    var oRecord = {};
    oRecord.options = {};

    try {
        var $poly = $(record).filterNode('gml:posList').text();
        // convert string list of coords to 2D array of latlongs
        oRecord.coords = $poly.match(/[^ ]+ [^ ]+/g)
          .map(function(ll) {
            return ll.split(" ").map(function c(x) {
              return Number(x);
            });
          });
        // oRecord.uc = $box.filterNode('ows:UpperCorner').text();
        // oRecord.lc = $box.filterNode('ows:LowerCorner').text();

        _.each(_.keys(ogc_wfs.schema), function(key) {
            oRecord.options[key] = ogc_wfs.getRecordValue(record, key);
        });

    } catch (e) {
        console.error(e);
    }

    return oRecord;
};

ogc_wfs.createRectangleFromBoundingBox = function(box, style) {
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

ogc_wfs.createPolygonFromCoordinates = function(record, style) {
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

ogc_wfs.createPolygonFromGeometry = function(geometry, options, style) {
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

ogc_wfs.createLayerPopup = function(options) {
    var layerName = options.layerName;
    var func2 = 'footprints.replaceCSWOutlineWithLayer("' + options.image_id + '")';
    var html = "<p><b>Name: </b>" + layerName +
        "<br/><a href=\'#\' onclick=\'" + func2 + "\'>Replace with layer data</a>";

    return html;
};
