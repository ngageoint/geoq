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
        "Emergency Action Notification" : ["PAWS_WARNING_RED_Local-Area-Emergency.svg"],
        "Avalanche Warning" : ["PAWS_WARNING_RED_Avalanche.svg"],
        "Avalanche Watch" : ["PAWS_WATCH_YELLOW_Avalanche.svg"],
        "Blizzard Warning" : ["PAWS_WARNING_RED_Blizzard.svg"],
        "Child Abduction Emergency" : ["PAWS_STATEMENT_BLUE_Child-Abduction-Emergency.svg"],
        "Civil Danger Warning" : ["PAWS_WARNING_RED_CivilDanger.svg"],
        "Coastal Flood Warning" : ["PAWS_WARNING_RED_Coastal-Flood.svg"],
        "Coastal Flood Watch" : ["PAWS_WATCH_YELLOW_Coastal-Flood.svg"],
        "Dust Storm Warning" : ["PAWS_WARNING_RED_Dust-Storm.svg"],
        "Earthquake Warning" : ["PAWS_WARNING_RED_Earthquake.svg"],
        "Evacuation Immediate" : ["PAWS_WARNING_RED_Evacuate-Immediately.svg"],
        "Fire Warning" : ["PAWS_WARNING_RED_Fire.svg"],
        "Flash Flood Warning" : ["PAWS_WARNING_RED_Flash-Flood.svg"],
        "Flash Flood Watch" : ["PAWS_WATCH_YELLOW_Flash-Flood.svg"],
        "Flash Flood Statement" : ["PAWS_STATEMENT_BLUE_Flash-Flood.svg"],
        "Flood Warning" : ["PAWS_WARNING_RED_Flood.svg"],
        "Flood Watch" : ["PAWS_WATCH_YELLOW_Flood.svg"],
        "Flood Statement" : ["PAWS_STATEMENT_BLUE_Flood.svg"],
        "Flood Advisory" : ["PAWS_STATEMENT_BLUE_Flood.svg"],
        "Hazardous Materials Warning" : ["PAWS_WARNING_RED_Hazardous-Materials-Warning.svg"],
        "High Wind Warning" : ["PAWS_WARNING_RED_High-Wind.svg"],
        "High Wind Watch" : ["PAWS_WATCH_YELLOW_High-Wind.svg"],
        "Hurricane Warning" : ["PAWS_WARNING_RED_Hurricane.svg"],
        "Hurricane Watch" : ["PAWS_WATCH_YELLOW_Hurricane.svg"],
        "Hurricane Statement" : ["PAWS_STATEMENT_BLUE_Hurricane.svg"],
        "Law Enforcement Warning" : ["PAWS_WARNING_RED_Law-Enforcement.svg"],
        "Local Area Emergency" : ["PAWS_WARNING_RED_Local-Area-Emergency.svg"],
        "911 Telephone Outage Emergency" : ["PAWS_WARNING_RED_911TelephoneOutageEmergency.svg"],
        "Nuclear Power Plant Warning" : ["PAWS_WARNING_RED_Nuclear_Powerplant-Warning.svg"],
        "Radiological Hazard Warning" : ["PAWS_WARNING_RED_Radiological-Hazard-Warning.svg"],
        "Severe Thunderstorm Warning" : ["PAWS_WARNING_RED_Severe-Thunderstorm.svg"],
        "Severe Thunderstorm Watch" : ["PAWS_WATCH_YELLOW_Severe-Thunderstorm.svg"],
        "Severe Weather Statement" : ["PAWS_STATEMENT_BLUE_Severe-Weather.svg"],
        "Shelter in Place Warning" : ["PAWS_WARNING_RED_Shelter-In-Place.svg"],
        "Special Marine Warning" : ["PAWS_WARNING_RED_SpecialMarine.svg"],
        "Special Weather Statement" : ["PAWS_STATEMENT_BLUE_Special-Weather.svg"],
        "Tornado Warning" : ["PAWS_WARNING_RED_Tornado.svg"],
        "Tornado Watch" : ["PAWS_WATCH_YELLOW_Tornado.svg"],
        "Tropical Storm Warning" : ["PAWS_WARNING_RED_Tropical-Storm.svg"],
        "Tropical Storm Watch" : ["PAWS_WATCH_YELLOW_Tropical-Storm.svg"],
        "Tsunami Warning" : ["PAWS_WARNING_RED_Tsunami.svg"],
        "Tsunami Watch" : ["PAWS_WATCH_YELLOW_Tsunami.svg"],
        "Volcano Warning" : ["PAWS_WARNING_RED_Volcano.svg"],
        "Winter Storm Warning" : ["PAWS_WARNING_RED_Winter-Storm.svg"],
        "Winter Storm Watch" : ["PAWS_WATCH_YELLOW_Winter-Storm.svg"],
    },

    initialize: function (load, map, options) {
        // Note: load is unused at this time

        // Merge options together
        L.Util.setOptions(this, options);

        if (site_settings.FEMA_IPAWS) {
            L.Util.setOptions(this, site_settings.FEMA_IPAWS);
            //console.log(this.options);
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
            this._map.on('moveend', function(e) {
                //console.log(e)
                _this.geocode();
                _this.load(_this.parseIPAWS);
                //_this.createMarkers();
            }); 
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

        var url = "/geoq/proxy/https://tigerweb.geo.census.gov/arcgis/rest/services/Generalized_ACS2015/State_County/MapServer/11/query?where=&text=&objectIds=&time=&geometry=" + ringObject + "&geometryType=esriGeometryPolygon&inSR=&spatialRel=esriSpatialRelIntersects&relationParam=&outFields=GEOID&returnGeometry=false&returnTrueCurves=false&maxAllowableOffset=&geometryPrecision=&outSR=&returnIdsOnly=false&returnCountOnly=false&orderByFields=&groupByFieldsForStatistics=&outStatistics=&returnZ=false&returnM=false&gdbVersion=&returnDistinctValues=false&resultOffset=&resultRecordCount=&f=pjson";

        $.ajax({
            type: 'GET',
            context: this,
            url: url,
            dataType: 'json',
        })
        .done(this._geocode)
        .fail(this.ajaxError)
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

    // NWS Callback IPAWS Parse
    parseIPAWS: function(data) {
        this._jsonData = [];
        var control,
            alerts = data.getElementsByTagName("alert"),
            searchCoordinates = new YouTubeSearch();
        //console.log(alerts);

        for (var i = 0; i < alerts.length; i++) {
            control = false;
            var info = alerts[i].getElementsByTagName("info"),
                area = info[0].getElementsByTagName("area"),
                geocodes = area[0].getElementsByTagName("geocode"),
                polygon = area[0].getElementsByTagName("polygon");

            if (info && area && geocodes && (polygon[0]) && this._sameCodes && alerts[i].getElementsByTagName("status")[0].innerHTML != "Cancelled") {
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
                //console.log(polygon);
                var rawData = polygon[0].innerHTML;
                mapData = rawData.split(" ");

                for (var j = 0; j < mapData.length; j++) {
                    var latlong = mapData[j].split(",");
                    var jsonLatLong = {};
                    jsonLatLong["lat"] = latlong[0];
                    jsonLatLong["lon"] = latlong[1];

                    jsonMapData.push(jsonLatLong);
                }

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

            this.createMarkers();
        }
    },

    // If an ajax error occurs
    ajaxError: function (resultobj) {
        console.error("Ajax error.");
        console.log(resultobj);
        log.error("Request called for, but no valid response was received from the server, result:", resultobj);
    },

    // provide a way to hide layer
    setStyle: function (style) {
        this.NWSLayerGroup.eachLayer(function(lyr_group) {
            lyr_group.eachLayer(function(layer) {
                if (layer.setStyle){
                    layer.setStyle(style);
                } else if (layer.setOpacity){
                    layer.setOpacity(style.opacity);
                }
            });
        });
    },

    // Where icons/paths are stored
    NWSLayerGroup: L.layerGroup(),

    // Create markers and add layers to map
    createMarkers: function (){
        this.NWSLayerGroup.clearLayers();

        var _this = this;

        this._iconsTmp = null;
        this._iconsTmp = [];

        for (var i = 0; i < this._jsonData.length; i++){
            var tmpMarker, tmpPolygon, polyArr = [];
            var tmpLayer = L.layerGroup();

            // Polygon points array
            for (var j = 0; j < this._jsonData[i].coordinates.length; j++){
                var tmpArr = [];
                tmpArr.push(Number(this._jsonData[i].coordinates[j].lat));
                tmpArr.push(Number(this._jsonData[i].coordinates[j].lon));
                polyArr.push(tmpArr);
            }

            tmpPolygon = L.polygon(polyArr);

            this._iconsTmp.push(L.icon({
                iconUrl: this.options.iconPath + this._icons[this._jsonData[i].event][0],
                iconSize: [32,32],
                iconAnchor: [16, 32],
                popupAnchor: [0, -32],
                /*iconSizeArray: // For use when Leaflet 1.0 Implemented
                [
                    [32, 32], [96, 96], [256, 256]
                ],
                iconAnchorArray: 
                [
                    [16, 32], [48, 96], [128, 256]
                ] */
            }));
            //console.log("icons:" + this._icons[this._jsonData[i].event][0])

            var center = this._jsonData[i].center;
            var lat = center.lat;
            var lon = center.lon;

            tmpMarker = L.marker([lat, lon], {icon: _this._iconsTmp[i]});

            var popupContent = 'Event: <b>' + this._jsonData[i].event +
                                '</b><br/>Description: ' +
                                this._jsonData[i].description + '<br />' +
                                'Onset: <b>' + this._jsonData[i].onset + '</b>';
            var popup = L.popup().setContent(popupContent);

            tmpMarker.bindPopup(popup);
            tmpLayer.addLayer(tmpPolygon);
            tmpLayer.addLayer(tmpMarker);

            this.NWSLayerGroup.addLayer(tmpLayer);
        }
    }
});
