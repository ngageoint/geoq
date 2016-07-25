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

ogc_csw.getRecords = function() {
    var proxy = leaflet_helper.proxy_path || '/geoq/proxy';

    var params = {
        service: "CSW",
        version: "2.0.2",
        request: "GetRecords",
        typeNames: "csw:Record",
        resultType: "results",
        elementSetName: "full",
        outputSchema: "http://www.opengis.net/cat/csw/2.0.2"
    };

    var url = ogc_csw.protocol + "://" + ogc_csw.server + ":" + ogc_csw.port + ogc_csw.path + "/csw?" + $.param(params);

    $.ajax({
        type: 'GET',
        url: proxy + url,
        dataType: 'xml',
        success: function (xml,lang) {
            var $xml = $(xml);
            ogc_csw.current_layer_list = $xml.find('Record');
        },
        failure: function () {
            alert('unable to retrieve csw records');
        }
    })

};

ogc_csw.createWMSLayerFromRecord = function(record) {
    var newlayer = {};
    try {
        var parser = document.createElement('a');
        parser.href = record.getElementsByTagName('references')[0].innerHTML;
        var search = parser.search.substring(1);
        var parts = JSON.parse('{"' + decodeURI(search).replace(/"/g, '\\"').replace(/&amp;/g, '","').replace(/=/g,'":"') + '"}');
        if (parts.service === 'WMS') {
            newlayer = L.tileLayer.wms(parser.protocol + "//" + parser.host + parser.pathname, {
                layers: parts.layers,
                format: 'image/png',
                transparent: true,
                attribution: record.getElementsByTagName('creator')[0].innerHTML
            });
        }
    } catch (e) {
        console.error(e);
    }

    return newlayer;
};

ogc_csw.createOutlineBoxFromRecord = function(record) {
    var outlineLayer = {};
    try {
        var box = record.getElementsByTagName('BoundingBox')[0];
        var uc = box.getElementsByTagName('UpperCorner')[0].innerHTML;
        var lc = box.getElementsByTagName('LowerCorner')[0].innerHTML;

        outlineLayer = L.rectangle([lc.split(' ').map(Number),uc.split(' ').map(Number)],
            {color:'red', weight: 1});
        outlineLayer.bindPopup(record.getElementsByTagName('title')[0] || 'Unknown');
    } catch (e) {
        console.error(e);
    }

    return outlineLayer;
};

ogc_csw.init({
    server: 'centos.mitre.org',
    port: '8080',
    protocol: 'http',
    path: '/geoserver'
});

ogc_csw.getCapabilities();
ogc_csw.getRecords();
