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

/* National Weather Service Icons */
/* Makes use of Leaflet JS: http://leafletjs.com/ */
/* SVG Icons courtesy of GEOHuntsville: http://geohuntsville.org/page/geoq */

/* Dependent on L.Marker.AutoResizeSVG found at 
   http://github.com/john-kilgo/L.Marker.AutoResizeSVG
   Include marker-resize-svg.js in your HTML document */

L.NWSIconsLayer = L.GeoJSON.extend({
    // Options are JSON object found in database
    options: {
        debug: true
    },

    // NOTE: A possible way to organize (possible list) of icons?
    _icons: {
        statement : {
            flood : "StatementFloodOutlineHaloed.svg",
            tornado : "StatementHurricaneOutlineHaloed.svg",
            hurricane : "StatementHurricaneOutlineHaloed.svg",
            tropicalStorm : "StatementTropicalStormOutlineHaloed.svg"
        },
        warning : {
            evacuate : "warningEvacuateImmediatelyHaloed.svg",
            fire : "warningFireOutlineHaloed.svg",
            flood : "warningFloodOutlineHaloed.svg",
            hurricane : "warningHurricaneOutlineHaloed.svg",
            thunderstorm : "warningSevereThunderstormOutlineHaloed.svg",
            tropicalStorm : "warningTropicalStormOutlineHaloed1.svg",
            tsunami : "warningTsumaniDraftHaloed.svg"
        },
        watch : {
            fire : "watchFireOutlineHaloed.svg",
            flood : "watchFloodOutlineHaloed.svg",
            hurricane : "watchHurricaneOutlineHaloed.svg",
            thunderstorm : "watchSevereThunderstormOutlineHaloed.svg",
            tornado : "watchTornadoColorOutlineHaloed.svg",
            tropicalStorm : "watchTropicalStormOutlineHaloed.svg",
            winterStorm : "watchWinterStormHaloed.svg"
        },
    },

    initialize: function (load, map, options) {
        // Merge options together
        L.Util.setOptions(this, options);

        if (site_settings.FEMA_IPAWS) {
            L.Util.setOptions(this, site_settings.FEMA_IPAWS);
            console.log(this.options);
        } else {
            console.error("NWS Icons: Fatal Error. site_settings missing. Please visit GeoQ Admin site and add FEMA_IPAWS json settings object.")
            return;
        }

        // Markers to add to map
        this._layers = {};
        // Our map
        this._map = map;

        if (this._map) {   
            this.NWSLayerGroup.addTo(this._map);
            
            // When map moves update bounds
            var _this = this; // Set the context of the event handler
            this._map.on('moveend', function() {
                _this.geocode();
                _this.load(_this.parseIPAWS);
            }); 
        }

        // Map adjusts onload triggering the moveend event handler several times
        // this section may therefore be redundant?
        /*if (load) {
            //this.addMediaQ(options);
            this.geocode();
            this.load(this.testCallBack);
        }*/
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

        var url = "/geoq/proxy/https://tigerweb.geo.census.gov/arcgis/rest/services/Generalized_ACS2015/State_County/MapServer/11/query?where=&text=&objectIds=&time=&geometry=" + ringObject + "&geometryType=esriGeometryPolygon&inSR=&spatialRel=esriSpatialRelIntersects&relationParam=&outFields=GEOID&returnGeometry=false&returnTrueCurves=false&maxAllowableOffset=&geometryPrecision=&outSR=&returnIdsOnly=false&returnCountOnly=false&orderByFields=&groupByFieldsForStatistics=&outStatistics=&returnZ=false&returnM=false&gdbVersion=&returnDistinctValues=false&resultOffset=&resultRecordCount=&f=pjson";

        $.ajax({
            type: 'GET',
            context: this,
            url: url,
            dataType: 'json',
        })
        .done(this._geocode)
        .fail(this.ajaxError)

        /// PArse out and generate SAME codes and put into array
        //this._sameCodes <<<< John will generate


    },

    // Finds and saves SAME codes
    _geocode: function(data) {
        var features = data.features;
        this._sameCodes = [];

        for (var i=0; i < features.length; i++) {
            var tmp = features[i]["attributes"]["GEOID"];
            tmp = tmp.toString();
            // Prepend '0' in order to convert FIPS 5-1 to NWS SAME code
            tmp = '0' + tmp;
            this._sameCodes.push(tmp);
        }
    },

    // Loads the FEMA list server
    load: function(callback) {
        var options = this.options;

        if (!options.FEMAkey) {
            log.error("No key set for NWS Cap messages");
            console.error("No key set for NWS Cap messages");
            return;
        }
 
        $.ajax({
            type: "POST",
            url: "/geoq/api/geo/ipaws",
            context: this,
            data: {develop: true, key: this.options.FEMAkey}
        }).done(callback)
        .fail(this.ajaxError);  
    },

    // On add of the layer
   /* addMediaQ: function(options) {
        var _this = this;
        // Below is the function called on each piece of data.
        var cb = function(data) { _this._addMediaQ(data, this.options); };
        this.loadMediaQ(cb, options);
    },
    // Parses JSON
    _addMediaQ: function(data, options) {
        L.MediaQLayer.parseJSON(data, this);
        if (!this) return;

        this.addTo(this._map);
    },*/
    
    // NWS Callback IPAWS Parse
    parseIPAWS: function(data) {
        this._jsonData = [];
        var control;
        var alerts = data.getElementsByTagName("alert");
        console.log(alerts);
        for (var i = 0; i < alerts.length; i++) {
            control = false;
            var info = alerts[i].getElementsByTagName("info");
            var area = info[0].getElementsByTagName("area");
            var geocodes = area[0].getElementsByTagName("geocode");
            var polygon = area[0].getElementsByTagName("polygon");

            if (info && area && geocodes && (polygon[0]) && this._sameCodes) {
                for (var j = 0; j < geocodes.length; j++) {
                    if (geocodes[j].childNodes[0].innerHTML == "SAME" && control != true) {
                        for (var k = 0; k < this._sameCodes.length; k++) {
                            if (this._sameCodes[k] == geocodes[j].childNodes[1].innerHTML) {
                                control = true;
                            }
                        }

                    }
                }
            }

            if (control) {
                var tmpJson = {};
                tmpJson["identifier"] = String(alerts[i].getElementsByTagName("identifier")[0].innerHTML);
                tmpJson["sent"] = alerts[i].getElementsByTagName("sent")[0].innerHTML;
                tmpJson["status"] = alerts[i].getElementsByTagName("status")[0].innerHTML;
                tmpJson["event"] = info[0].getElementsByTagName("event")[0].innerHTML;
                tmpJson["severity"] = info[0].getElementsByTagName("severity")[0].innerHTML;
                tmpJson["certainty"] = info[0].getElementsByTagName("certainty")[0].innerHTML;
                tmpJson["effective"] = info[0].getElementsByTagName("effective")[0].innerHTML;
                tmpJson["onset"] = info[0].getElementsByTagName("onset")[0].innerHTML;
                tmpJson["expires"] = info[0].getElementsByTagName("expires")[0].innerHTML;
                tmpJson["headline"] = info[0].getElementsByTagName("headline")[0].innerHTML;
                tmpJson["description"] = info[0].getElementsByTagName("description")[0].innerHTML;
                tmpJson["instruction"] = info[0].getElementsByTagName("instruction")[0].innerHTML;

                var mapData, jsonMapData = [];
                console.log(polygon);
                var rawData = polygon[0].innerHTML;
                mapData = rawData.split(" ");

                for (var j = 0; j < mapData.length; j++) {
                    var latlong = mapData[j].split(",");
                    var jsonLatLong = {};
                    jsonLatLong["lat"] = latlong[0];
                    jsonLatLong["lon"] = latlong[1];

                    jsonMapData.push(jsonLatLong);
                }

                var searchCoordinates = new YouTubeSearch();

                var boundingPoints = [];
                for (var j = 0; j < jsonMapData.length; j++) {
                    boundingPoints.push(new Point(jsonMapData[j].lat,jsonMapData[j].lon));
                }

                var center = searchCoordinates.generateCircle(boundingPoints);

                tmpJson["center"] = {"lat": center.currentCenterPoint.x, "lon": center.currentCenterPoint.y};
                //tmpJson["msgtype"] = alerts[i].getElementsByTagName("msgtype")[0].innerHTML;

                tmpJson["coordinates"] = jsonMapData;

                this._jsonData.push(tmpJson);

            } 
            
            console.log(this._jsonData);

        }

    },
    // If an ajax error occurs
    ajaxError: function (resultobj) {
        console.error("Ajax error.");
        console.log(resultobj);
        log.error("Request called for, but no valid response was received from the server, result:", resultobj);
    },
    // Where icons/paths are stored
    NWSLayerGroup: L.layerGroup(),
    // IDs of layers??
    layer_ids: {},


// begin break with old code in extend

    parseJSON: function (data, layer){
        var result;
        if (typeof data=="object") {
            result = data;
        } else {
            try {
                result = JSON.parse(data);
            } catch (ex){
                log.error("Error parsing JSON returned from server");
                return;
            }
        }

        layer.options.onEachFeature = function(feature, layer) {
            L.MediaQLayer.onEachFeature(feature, layer, layer.options, this);
        };

        // layer.options.style = leaflet_helper.constructors.polygonStyleBuilderCallback;
        layer.pointToLayer = function(feature, latlng) {
            return L.MediaQLayer.iconBuilderCallback(feature, latlng, layer);
        };

        layer.addData(data);
    },

    // Make icon and place in marker.
    iconBuilderCallback: function(feature, latlng, layerConfig){
        var iconX = 15;
        var iconY = 24;
        var iconAnchor = null;

        layerConfig = layerConfig || {geojson_layer_count:1, name:'MediaQ Layer'};

        var iconUrl = this.options.iconUrl || "";

        //Build the icon injects
        var iconData = {
            iconUrl: iconUrl,
            iconSize: new L.Point(iconX, iconY),
            text: layerConfig.name
        };
        if (iconAnchor) iconData.iconAnchor = iconAnchor;
        var icon = new MapMarker(iconData);

        //Construct the final Icon
        return L.rotatedMarker(latlng, {icon: icon});
    },

    // Polygon Style
    /*polygonStyleBuilderCallback: function(feature) {
        var polyFillColor = '#ff0000';

        var style = {
            weight: 2,
            opacity: 1,
            color: 'white',
            fillOpacity: 0.1,
            fillColor: polyFillColor};

        return style;
    },*/

    // Assign popups to each feature
    onEachFeature: function (feature, layer, layerConfig, mediaqOptions) {
        if (feature.properties) {
            var popupContent = "";
            if (feature.properties.popupContent) {
                popupContent = feature.properties.popupContent;
            } else if (feature.properties.vid) {
                popupContent = L.MediaQLayer.clean("MediaQ Id: " + feature.properties.vid);
                if (feature.properties.href){
                    var link = L.MediaQLayer.clean(feature.properties.href); //Strip out any offending
                    popupContent = "<span><h5>MediaQ Video</h5>"+
                        "</h5></span><video width='320' height='240' controls><source src='"+link+"' type='video/mp4'></video>"+
                        "<br/><button type='button' class='btn btn-small' " +
                        "onclick='L.MediaQLayer.displayHidePath(\"" + feature.properties.vid + "\", \"" +
                        mediaqOptions.url + mediaqOptions.metadata_link + "\", \"" +
                        mediaqOptions.key + "\");' >Display/Hide Path</button><br/>";
                }
            }
            if (popupContent && _.isString(popupContent)) {

                if (!popupContent.indexOf("<span class='hide feature-id-hint'>")){
                    if (layerConfig && layerConfig.name) {
                        if (!feature.properties.id) {
                            feature.properties.id = leaflet_helper.id_count++;
                        }
                        var id = feature.properties.id;
                        popupContent += L.MediaQLayer.addLinksToPopup(layerConfig.name, id, true, false);
                    }
                }
                layer.bindPopup(popupContent);
            }
            if (feature.properties.heading && parseInt(feature.properties.heading) && layer.options){
                layer.options.angle = parseInt(feature.properties.heading);
            }
        }
    },

    // Path of video
    /* displayHidePath: function(vid, queryurl, key) {
        var layer_ids = this.prototype.layer_ids;
        var ourlayergroup = this.prototype.mediaqLayerGroup;


        if (layer_ids[vid]) {
            // remove layer from layer group
            var layer = ourlayergroup.getLayer(layer_ids[vid]);
            ourlayergroup.removeLayer(layer);
            delete layer_ids[vid];
            return;
        }
        var params = {'VID':vid};
        var url = queryurl.replace(/{[^{}]+}/g, function(k) {
            return params[k.replace(/[{}]+/g, "")] || "";
        });

        var cb = function(data) {
            try {
                var markerOptions = { radius: 4, fillColor: "#ff0000", color: "#f00", weight: 1, opacity: 1};
                var newlayer = L.geoJson(data, {
                    pointToLayer: function (feature, latlng) {
                        return L.circleMarker(latlng, markerOptions);
                    }
                });
                newlayer.addTo(ourlayergroup);
                var id = ourlayergroup.getLayerId(newlayer);
                layer_ids[vid] = id;
            } catch (ex){
                log.error("Error parsing JSON returned from server");
                return;
            }
        };

        var error = function(data) {
            log.error("got error");
        };

        $.ajax({
            type: 'GET',
            url: leaflet_helper.proxify(url),
            headers: {
                'X-API-KEY': key
            },
            dataType: 'json',
            success: cb,
            error: error
        });
    },*/
    // Add links to popup (not needed)
    /*addLinksToPopup: function (layerName,id,useMove,useHide,useDrop) {

        var spanLink = "<span class='hide layer-name-hint'>"+layerName+"</span>";
        spanLink += "<span class='hide feature-id-hint'>"+id+"</span>";
        var output = "";
        if (useMove) {
            output += "<br/><a href='#' class='make-draggable-hint'>Click on a feature to link this to it"+spanLink+"</a>"
        }
        if (useHide) {
            output += "<br/><a href='#' class='make-deletable-hint'>Hide this Item"+spanLink+"</a>";
        }
        if (useDrop) {
            output += "<br/><a href='#' class='make-droppable-hint'><span class='text-hint'></span>"+spanLink+"</a>";
        }
        if (output) output = "<br/>"+output;

        return output;

    },*/
    /* Rewrite to clean once data received
    clean: function (text) {
        return jQuery("<div>"+text+"</div>").text() || "";
    },
    // ??????
    getLatLngs: function (xml) {
        var el = xml.getElementsByTagName('coordinates');
        var coords = [];
        for (var j = 0; j < el.length; j++) {
            // text might span many childNodes
            coords = coords.concat(this._read_coords(el[j]));
        }
        return coords;
    },
    // ???????
    _read_coords: function (el) {
        var text = '', coords = [], i;
        for (i = 0; i < el.childNodes.length; i++) {
            text = text + el.childNodes[i].nodeValue;
        }
        text = text.split(/[\s\n]+/);
        for (i = 0; i < text.length; i++) {
            var ll = text[i].split(',');
            if (ll.length < 2) {
                continue;
            }
            coords.push(new L.LatLng(ll[1], ll[0]));
        }
        return coords;
    },*/
});
