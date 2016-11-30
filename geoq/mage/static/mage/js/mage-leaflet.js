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

L.MarkerClusterGroup.include({
    setStyle: function(style) {
        var iconStyle = style;
        // only way I can seem to make this work is by removing layer
        if (this.getLayers().length > 0) {
            if (iconStyle.opacity === 0) {
                aoi_feature_edit.map.removeLayer(this);
                this._map = aoi_feature_edit.map;
            }
            else {
                aoi_feature_edit.map.addLayer(this);
            }
        }
    }

});

L.MAGELayer = L.GeoJSON.extend({
    // Options are JSON object found in database core.setting
    options: {
        debug: true,
        url: '/mage/api',
        event: "None",
        startDate: undefined,
        type: "observations",
        refresh: 300000
    },

    initialize: function (map, options) {
        var _this = this;
        this._layers = {};

        L.Util.setOptions(this, options);

        if (this.options.type === "users") {
            this.options.onEachFeature = this.onEachUserFeature;
        } else {
            this.options.onEachFeature = this.onEachObservationFeature;
        }


        var mage_callback = function (msg) {
            if (msg.failed) {
                console.log('MAGE failed');
            } else if (msg.events_loading) {
                console.log('MAGE events loading');
            } else if (msg.events_loaded) {
                console.log('MAGE events loaded');
                // grab event id and set that value for getting observations
                var event = _.find(magehelper.getEvents(), function (o) {
                    return o.name === _this.options.event;
                });
                if (event) {
                    magehelper.setCurrentEvent(event.id);
                }

                magehelper.loadObservations();

            } else if (msg.observations_loading) {
                console.log('MAGE observations loading');
                _this.clearLayers();
            } else if (msg.observations_loaded) {
                console.log('MAGE observations_loaded');

                var fc = {
                    "type": "FeatureCollection",
                    "features": magehelper.getObservations()
                };
                _this.addData(fc);

                // signal data loaded
                _this.fire("MageLoaded");
            } else if (msg.users_loading) {
                console.log('MAGE users loading');
                _this.clearLayers();
            } else if (msg.users_loaded) {
                console.log('MAGE users loaded');

                var fc = {
                    "type": "FeatureCollection",
                    "features": magehelper.getAllUsers()
                }
                _this.addData(fc);

                // signal data loaded
                _this.fire("MageLoaded");
            }
        };

        // load helper functions
        var load_callback = function (data, textStatus, jqxhr) {
            console.log('magehelper loaded. Trying to download events');
            magehelper.setUrl(options.url);
            if (_this.options.parameters) {
                magehelper.setParameters(_this.options.parameters);
            }

            magehelper.squawk(mage_callback);
            magehelper.getAllUsers();
            magehelper.loadEvents();
        };

        $.getScript('/static/leaflet/magehelper.js', load_callback);

        // 5 Minute Refresh
        setInterval(function () {
            _this.clearLayers();
            if (_this.options.type === "users") {
                magehelper.loadUsers();
            } else {
                magehelper.loadEvents();
            }

        }, _this.options.refresh)

    },

    onEachObservationFeature: function (feature, layer) {
        window.lastfl = [feature, layer];
        if (feature.properties) {
            var props = feature.properties;
            var pics = feature.attachments;

            var html = "";
            if (props.type) {
                var t = props.type;
                var iurl = magehelper.getIconURL(
                    magehelper.getCurrentEvent(), t);
                var obIcon = L.icon({
                    iconUrl: iurl,
                    iconSize: [72 / 2, 92 / 2]
                });
                layer.setIcon(obIcon);

                html += "Type: " + t + "<br />";

            }
            if (pics.length > 0) {
                _.each(pics, function(p) {
                    // add a thumbnail for each pic
                    var parser = document.createElement('a');
                    parser.href = p.url;
                    parser.host = location.host;
                    parser.search = "?size=150&oriented=true";
                    parser.pathname = "/mage" + parser.pathname;   // TODO: figure out how to do this when app isn't at top level
                    parser.protocol = location.protocol;

                    html += "<p><img src=\'" + parser.href + "\' onclick=\'window.open(\"" + parser.origin + parser.pathname
                        + "\")\'><br/>";
                });
            }
            for (p in props) {
                if ("type" == p || props[p] == "")
                    continue;
                html += p + ": " + props[p] + "<br />";
            }
            layer.bindPopup(html);
        }
    },

    onEachUserFeature: function (feature, layer) {
        window.lastfl = [feature, layer];
        if (feature.id) {
            var id = feature.id;
            var html = "";
            var userinfo = magehelper.getUser(id);
            if (userinfo) {
                html += "<p>Name: " + userinfo.displayName + "<br>";
                html += "Email: " + userinfo.email + "<br>";
                html += "Last Updated: " + userinfo.lastUpdated + "<br></p>";
                layer.bindPopup(html);
            }
           var iurl = magehelper.getUserIconURL();
            var uIcon = L.icon({
                iconUrl: iurl,
                iconSize: [8,8]
            });
            layer.setIcon(uIcon);
        }
    },

    // Gets the bounds of the Workcell and calls for GeoCode info
    geocode: function () {
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
