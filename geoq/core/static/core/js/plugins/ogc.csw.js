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
    'wmsUrl': { key: 'dct:references', default: null },
    'ObservationDate': { key: null, default: moment().format('YYYY-MM-DD')},
    'maxCloudCoverPercentageRate': { key: null, default: 1},
    'platformCode': { key: null, default: 'abc123'},
    'sensor': {key: null, default: 'def456'},
    'nef_name': {key: null, default: 'unknown'},
    'layerName': {key: 'dc:title', default: 'Unknown'},
    'status': {key: null, default: 'NotEvaluated'}
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

ogc_csw.getRecords = function(params,callback) {
    var proxy = leaflet_helper.proxy_path || '/geoq/proxy';

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
        return $(record).filterNode(ogc_csw.schema[attribute].key).text() || 'unknown';
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

        oRecord.options.image_id = ogc_csw.getRecordValue(record, 'image_id');
        oRecord.options.wmsUrl = ogc_csw.getRecordValue(record, 'wmsUrl');
        oRecord.options.ObservationDate = ogc_csw.getRecordValue(record, 'ObservationDate');
        oRecord.options.maxCloudCoverPercentageRate = ogc_csw.getRecordValue(record, 'maxCloudCoverPercentageRate');
        oRecord.options.platformCode = ogc_csw.getRecordValue(record, 'platformCode');

        oRecord.layerName = ogc_csw.getRecordValue(record, 'layerName');
        oRecord.options.status = ogc_csw.getRecordValue(record, 'status');
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

ogc_csw.createLayerPopup = function(name,options) {
    var layerName = name;
    var func = 'footprints.removeCSWOutline("' + options.image_id + '","' + options.status + '")';
    var func2 = 'footprints.replaceCSWOutlineWithLayer("' + options.image_id + '")';
    var html = "<p>Name: " + layerName + "<br/><a href=\'#\' onclick=\'" + func + "\'>Remove Outline</a><br/>" +
        "<a href=\'#\' onclick=\'" + func2 + "\'>Replace with WMS</a>";

    return html;
};

ogc_csw.init({
    server: 'centos.mitre.org',
    port: '8080',
    protocol: 'http',
    path: '/geoserver'
});

