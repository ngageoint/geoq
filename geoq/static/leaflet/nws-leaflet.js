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


L.NWSLayerGroup = L.LayerGroup.extend({
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
    },
});

L.NWSIconsLayer = L.GeoJSON.extend({
    // Options are JSON object found in database core.setting
    options: {
        debug: true
    },

    // Boolean to see if should parse locations via SAME codes, set to true to parse
    _isParse: false,

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
        var _this = this;

        L.Util.setOptions(this, options);

        if (site_settings.FEMA_IPAWS) {
            L.Util.setOptions(this, site_settings.FEMA_IPAWS);
        } else {
            console.error("NWS Icons: Fatal Error. site_settings missing. Please visit GeoQ Admin site and add FEMA_IPAWS json settings object.")
            return;
        }

        this._map = map;

        if (this._map) {   
            this.NWSLayerGroup.addTo(this._map);
                
            // When map moves update bounds
            //this._map.on('moveend', function(e) {
                //console.log(e)
                //_this.geocode();
                _this.load(_this.parseIPAWS);
                //_this.createMarkers();
            //}); 

            // 5 Minute Refresh
            setInterval(function(){
                _this.load(_this.parseIPAWS);
            }, 300000)
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
            url: leaflet_helper.home_url + "api/geo/ipaws",
            context: this,
            // So we know which server to use:
            data: {develop: options.debug, key: this.options.FEMAkey}
        }).done(callback)
        .fail(this.ajaxError);  
    },

    // NWS Callback IPAWS Parse
    parseIPAWS: function(data) {
        this._jsonData = {};

        var control,
            alerts = data.getElementsByTagName("alert"),
            searchCoordinates = new YouTubeSearch();

        for (var i = 0; i < alerts.length; i++) {
            control = false;
            var info = alerts[i].getElementsByTagName("info"),
                area = info[0].getElementsByTagName("area"),
                geocodes = area[0].getElementsByTagName("geocode"),
                polygon = area[0].getElementsByTagName("polygon");

            if (!this._isParse && (polygon[0])) {
            	control = true;
            } else {
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
            }

            if (control) {
                var tmpJson = {};
                try {
                    tmpJson["identifier"] = String(alerts[i].getElementsByTagName("identifier")[0].innerHTML);
                }
                catch(err) {
                    console.log("identifier", alerts[i], err);
                }

                try {
                    tmpJson["sent"] = alerts[i].getElementsByTagName("sent")[0].innerHTML;
                }
                catch(err) {
                    console.log("sent", alerts[i], err);
                }

                try {
                    tmpJson["status"] = alerts[i].getElementsByTagName("status")[0].innerHTML;
                }
                catch(err) {
                    console.log("status", alerts[i], err);
                }

                try {
                    tmpJson["event"] = info[0].getElementsByTagName("event")[0].innerHTML;
                }
                catch(err) {
                    console.log("event", alerts[i], err);
                }

                try {
                    tmpJson["severity"] = info[0].getElementsByTagName("severity")[0].innerHTML;
                }
                catch(err) {
                    console.log("severity", alerts[i], err);
                }

                try {
                    tmpJson["certainty"] = info[0].getElementsByTagName("certainty")[0].innerHTML;
                }
                catch(err) {
                    console.log("certainty", alerts[i], err);
                }

                try {
                    tmpJson["effective"] = info[0].getElementsByTagName("effective")[0].innerHTML;
                }
                catch(err) {
                    console.log("effective", alerts[i], err);
                }

                try {
                    tmpJson["onset"] = info[0].getElementsByTagName("onset")[0].innerHTML;
                }
                catch(err) {
                    console.log("onset", alerts[i], err);
                }

                try {
                    tmpJson["expires"] = info[0].getElementsByTagName("expires")[0].innerHTML;
                }
                catch(err) {
                    console.log("expires", alerts[i], err);
                }

                try {
                    tmpJson["headline"] = info[0].getElementsByTagName("headline")[0].innerHTML;
                }
                catch(err) {
                    console.log("headline", alerts[i], err);
                }

                try {
                    tmpJson["description"] = info[0].getElementsByTagName("description")[0].innerHTML;
                }
                catch(err) {
                    console.log("description", alerts[i], err);
                }

                try {
                    tmpJson["instruction"] = info[0].getElementsByTagName("instruction")[0].innerHTML;
                }
                catch(err) {
                    console.log("instruction", alerts[i], err);
                }

                var mapData, 
                    jsonMapData = [], 
                    rawData = polygon[0].innerHTML;
                
                mapData = rawData.split(" ");

                for (var j = 0; j < mapData.length; j++) {
                    var latlong = mapData[j].split(","),
                        jsonLatLong = {};
                    
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

                this._jsonData[tmpJson.identifier] = tmpJson;

            }

        } // END for{} loop

        this.createMarkers();
    },

    // If an ajax error occurs
    ajaxError: function (resultobj) {
        console.error("Ajax error.");
        console.log(resultobj);
        log.error("Request called for, but no valid response was received from the server, result:", resultobj);
    },

    // provide a way to hide layer
    setStyle: function (style) {
        this.NWSLayerGroup.eachLayer(function(marker) {

            if (marker.setStyle){
                marker.setStyle(style);
            } else if (marker.setOpacity){
                marker.setOpacity(style.opacity);
            }

            marker.options.layer.eachLayer(function(lyr) {
                if (lyr.setStyle){
                    lyr.setStyle(style);
                } else if (lyr.setOpacity){
                    lyr.setOpacity(style.opacity);
                }
            });
        });
    },

    // Where icons/paths are stored
    NWSLayerGroup: new L.NWSLayerGroup,

    // Create markers and add layers to map
    createMarkers: function () {
        var _this = this;

        this.NWSLayerGroup.eachLayer(function(layer){
            var obj;

            if((obj = _.find(_this._jsonData, function(comp){
                return comp.identifier === layer.options.jsonData.identifier && comp.status === layer.options.jsonData.status;
            }))) {
                //console.log("Match");
                delete _this._jsonData[obj.identifier];
            } else {
                // Purge those that don't exist
                //console.log("removing", layer);
                _this.NWSLayerGroup.removeLayer(layer);
            }
        });

        for (var i in this._jsonData) {
            var center = this._jsonData[i].center,
                lat = center.lat,
                lon = center.lon;

            // Pop-up Text
            var severity = function(){
                var threshold = _this._jsonData[i].severity;
                if(threshold === "Severe")
                    return '<span style="color:#ff0000;">' + threshold + '</span>';
                if(threshold === "Moderate")
                    return '<span style="color:#0000ff;">' + threshold + '</span>';
                if(threshold === "Minor")
                    return '<span style="color:#355e3b;">' + threshold + '</span>';
                else
                    return threshold;
            }
            var certainty = function(){
                var certainty = _this._jsonData[i].certainty;
                if(certainty === "Observed")
                    return '<span style="color:#ff0000;">' + certainty + '</span>';
                else
                    return certainty;
            }
            var pTableOpen = '<table style="width:100%;"><colgroup><col style="width:75px"><col></colgroup>',
                pTableClose = '</table>',
                pEvent = '<tr><td>Event:</td><td><b>' + this._jsonData[i].event + '</b></td></tr>',
                pOnset = '<tr><td>Onset:</td><td><b>' + this._jsonData[i].onset + '</b></td></tr>',
                pExpire = '<tr><td>Expires:</td><td><b>' + this._jsonData[i].expires + '</b></td></tr>',
                pCertainty = '<tr><td>Certainty:</td><td><b>' + certainty() + '</b></td></tr>',
                pCertainty = '<tr><td>Certainty:</td><td><b>' + certainty() + '</b></td></tr>',
                pSeverity = '<tr><td>Severity:</td><td><b>' + severity() + '</b></td></tr>',
                pDescription = '<div style="word-wrap:break-word;display:none;"' + 'id="' + this._jsonData[i].identifier + '">' + this._jsonData[i].description + '</div>' + pTableOpen +'<tr><td>Description:</td>' + '<td><a href="#" id="' + this._jsonData[i].identifier + '-show" onclick="jQuery(&quot;#' + this._jsonData[i].identifier +'&quot;).toggle(&quot;show&quot;)&&jQuery(this).toggle()&&jQuery(&quot;#' + this._jsonData[i].identifier +'-hide&quot;).toggle(&quot;show&quot;)">Show</a><a href="#" id="' + this._jsonData[i].identifier + '-hide" style="display:none;" onclick="jQuery(&quot;#' + this._jsonData[i].identifier +'&quot;).toggle(&quot;show&quot;)&&jQuery(this).toggle()&&jQuery(&quot;#' + this._jsonData[i].identifier +'-show&quot;).toggle(&quot;show&quot;)">Hide</a></td></tr>' + pTableClose,
                popupContent = pTableOpen + pEvent + pOnset + pExpire + pCertainty + pSeverity + pTableClose + pDescription;
            // END Pop-up Text
                               
            // Polygon points array
            var polyArr = [];
            for (var j = 0; j < this._jsonData[i].coordinates.length; j++){
                var tmpArr = [];
                tmpArr.push(Number(this._jsonData[i].coordinates[j].lat));
                tmpArr.push(Number(this._jsonData[i].coordinates[j].lon));
                polyArr.push(tmpArr);
            }

            this.NWSLayerGroup.addLayer(L.marker([lat,lon],{
                icon: L.icon({
                    iconUrl: _this.options.iconPath + _this._icons[this._jsonData[i].event][0],
                    iconSize: [32,32],
                    iconAnchor: [16, 32],
                    popupAnchor: [0, -32],
                    iconSizeArray: // For use when Leaflet 1.0 Implemented
                    [
                        [32, 32], [96, 96], [256, 256]
                    ],
                    iconAnchorArray: 
                    [
                        [16, 32], [48, 96], [128, 256]
                    ]
                }),
                polygon: L.polygon(polyArr),
                popup: L.popup({minWidth: "275"}).setContent(popupContent),
                jsonData: _this._jsonData[i]
            }));
        }
    }
});
