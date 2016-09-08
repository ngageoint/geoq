/* The MIT License (MIT)
 Copyright (c) 2016 The MITRE Corporation

 Permission is hereby granted, free of charge, to any person obtaining a copy
 of this software and associated documentation files (the "Software"), to deal
 in the Software without restriction, including without limitation the rights
 to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 copies of the Software, and to permit persons to whom the Software is
 furnished to do so, subject to the following conditions:

 The above copyright notice and this permission notice shall be included in all
 copies or substantial portions of the Software.

 THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
 SOFTWARE.
 */

/* MAGE Service Layer */
/* Borrowed from J. Kilgo's NWS Leaflet layer */
/* Makes use of Leaflet JS: http://leafletjs.com/ */


L.MAGELayerGroup = L.LayerGroup.extend({
    addLayer: function (layer) {
        var id = this.getLayerId(layer),
            _this = this;

        this._layers[id] = layer;

        if (this._map) {
            this._map.addLayer(layer);
        }

        layer.options.layer = L.layerGroup();
        layer.options.layer.addTo(_this._map);

        layer.options.holdPolygon = false;
        layer.bindPopup(layer.options.popup);

        layer.on('mouseover', function(e){
            if(!layer.options.holdPolygon)
                layer.options.polygon.addTo(layer.options.layer);
        });
        layer.on('mouseout', function(e){
            if(!layer.options.holdPolygon)
                layer.options.layer.removeLayer(layer.options.polygon);
        });
        layer.on('click', function(e){
            if(layer.options.holdPolygon === false) {
                layer.options.polygon.addTo(layer.options.layer);
                layer.options.holdPolygon = true;
            }
        });
        layer.on('dblclick', function(e){
            layer.options.holdPolygon = false;
            layer.options.layer.removeLayer(layer.options.polygon);
            layer.closePopup();
        });

        // Make sure the Polygon is removed from map.
        layer.on('remove', function(e){
            layer.options.layer.removeLayer(layer.options.polygon);
            _this._map.removeLayer(layer.options.layer);
        });

        return this;
    }
});

L.MAGELayer = L.GeoJSON.extend({
    // Options are JSON object found in database core.setting
    options: {
        debug: true,
        url: '/mage/api',
        eventId: 'eventId'
    },

    initialize: function (load, map, options) {
        var _this = this;
        this._layers = {};

        L.Util.setOptions(this, options);
        this.options.onEachFeature = this.onEachFeature;

        this._map = map;

        var mage_callback = function(msg) {
            if (msg.failed) {
                console.log('MAGE failed');
            } else if (msg.events_loading) {
                console.log('MAGE events loading');
            } else if (msg.events_loaded) {
                console.log('MAGE events loaded');
                // grab event id and set that value for getting observations
                if (_this._map) {
                    magehelper.loadObservations();
                }
            } else if (msg.observations_loading) {
                console.log('MAGE observations loading');
                _this.clearLayers();
            } else if (msg.observations_loaded) {
                console.log('MAGE observations_loaded');
                if (_this._map) {
                    var fc = {
                        "type": "FeatureCollection",
                        "features": magehelper.getObservations()
                    };
                    _this.addData(fc);
                }
            }
        };

        // load helper functions
        var load_callback = function(data, textStatus, jqxhr) {
            console.log('magehelper loaded. Trying to download events');
            magehelper.setUrl(options.url);

            magehelper.squawk(mage_callback);
            magehelper.loadEvents();
        };

        $.getScript('/static/leaflet/magehelper.js', load_callback);

        // 5 Minute Refresh
        setInterval(function () {
            _this.clearLayers();
            magehelper.loadEvents();
        }, 300000)

    },

    onEachFeature: function(feature, layer) {
        window.lastfl = [feature, layer];
        if (feature.properties) {
            var props = feature.properties;

            var html = "";
            if (props.type) {
                var t = props.type;
                var iurl = magehelper.getIconURL(
                            magehelper.getCurrentEvent(), t);
                var obIcon = L.icon({
                                iconUrl: iurl,
                                iconSize: [72/2, 92/2],
                });
                layer.setIcon(obIcon);

                html += "Type: " + t + "<br />";

			}
            for (p in props) {
                if ("type" == p || props[p] == "")
                    continue;
                html += p + ": " + props[p] + "<br />";
            }
            layer.bindPopup(html);
        }
    },

    // Gets the bounds of the Workcell and calls for GeoCode info
    geocode: function() {
        var map = this._map;
        var bounds = map.getBounds();

        var ringObject = '{"rings":[[[' +
            bounds._southWest.lng + ',' + bounds._northEast.lat + '],[' +
            bounds._northEast.lng + ',' + bounds._northEast.lat + '],[' +
            bounds._northEast.lng + ',' + bounds._southWest.lat + '],[' +
            bounds._southWest.lng + ',' + bounds._southWest.lat + '],[' +
            bounds._southWest.lng + ',' + bounds._northEast.lat + ']]],' +
            '"spatialReference":{"wkid":4326}}';

        var url = leaflet_helper.home_url + "proxy/https://tigerweb.geo.census.gov/arcgis/rest/services/Generalized_ACS2015/State_County/MapServer/11/query?where=&text=&objectIds=&time=&geometry=" + ringObject + "&geometryType=esriGeometryPolygon&inSR=&spatialRel=esriSpatialRelIntersects&relationParam=&outFields=GEOID&returnGeometry=false&returnTrueCurves=false&maxAllowableOffset=&geometryPrecision=&outSR=&returnIdsOnly=false&returnCountOnly=false&orderByFields=&groupByFieldsForStatistics=&outStatistics=&returnZ=false&returnM=false&gdbVersion=&returnDistinctValues=false&resultOffset=&resultRecordCount=&f=pjson";

        $.ajax({
            type: 'GET',
            context: this,
            url: url,
            dataType: 'json'
        })
            .done(this._geocode)
            .fail(this.ajaxError)
    },


    // If an ajax error occurs
    ajaxError: function (resultobj) {
        console.error("Ajax error.");
        console.log(resultobj);
        log.error("Request called for, but no valid response was received from the server, result:", resultobj);
    }


});
