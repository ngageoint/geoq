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

        // Current bounds of map, bounds are pixel coordinates (rectangular)
        if (this._map) { 
            
            this._bounds = map.getBounds();
            var ourmap = this._map;
            
            this.NWSLayerGroup.addTo(this._map);
            
            // When map moves update bounds
            /*this._map.on('moveend', function() {
                this._bounds = ourmap.getBounds();
            });*/
        
        }

        if (load) {
            //this.addMediaQ(options);
            this.geocode();
            this.load(this.testCallBack);
        }
    },
    // Gets the bounds of the Workcell and calls for GeoCode info
    geocode: function(){
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
            url: url,
            dataType: 'json',
            success: function(data){console.log(data);},
            error: this.nwscap_error
        });

        /// PArse out and generate SAME codes and put into array
        //this._sameCodes <<<< John will generate


    },
    /* Old version with MapQuest geocode: function() {
        this._searchCoordinates = new YouTubeSearch();

        var boundingPoints = [];
        for (var i = 0; i < aoi_feature_edit.aoi_extents_geojson["coordinates"][0][0].length; i++) {
            boundingPoints.push(new Point(aoi_feature_edit.aoi_extents_geojson["coordinates"][0][0][i][1],aoi_feature_edit.aoi_extents_geojson["coordinates"][0][0][i][0]));
        }

        this._searchCoordinates = this._searchCoordinates.generateCircle(boundingPoints);

        //console.log(this._searchCoordinates);
        this._center = {};
        this._center.lat = this._searchCoordinates.currentCenterPoint.x;
        this._center.lon = this._searchCoordinates.currentCenterPoint.y;

        var geocode_url = this.options.proxy + this.options.geocodeApi + "&location=" + this._center.lat + "," + this._center.lon;

        $.ajax({
            type: 'GET',
            context: this,
            url: geocode_url,
            dataType: 'json',
            success: this._geocode,
            error: this.nwscap_error
        });
    }, */
    // Parses and saves GeoCode info
    /* OLD VERSION with MApQuest _geocode: function(data) {
        this._geocode = data;

        console.log(this._geocode);
        this._geocode.state = this._geocode.results[0].locations[0].adminArea3;
        this._geocode.county = this._geocode.results[0].locations[0].adminArea4.replace(' County','');

        for(var i = 0, j = this._sameCodes.length; i < j; i++) {
            if(this._sameCodes[i].state === this._geocode.state) {
                if (this._sameCodes[i].county === this._geocode.county) {
                    console.log("SAME CODE IS: " + this._sameCodes[i].SAME);
                    this.options.SAME = this._sameCodes[i].SAME;
                    break;
                }
            }
        }

    }, */
    // Loads the FEMA list server
    load: function(callback) {

        var options = this.options;

        if (!options.FEMA ) {
            log.error("No URL set for NWS Cap messages");
            console.error("No URL set for NWS Cap messages");
            return;
        }

        $.post( "/geoq/api/geo/ipaws", {develop: true, key: this.options.FEMAkey})
            .done(function( data ) {
                console.log(data);
            });
            
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
    testCallBack: function(data){
        console.log(data);
    },
    // NWS Callback IPAWS Parse
    parseIPAWS: function(data){

    },
    // If an error occurs:
    nwscap_error: function (resultobj){
        log.error ("A JSON layer was requested, but no valid response was received from the server, result:", resultobj);
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
    /* Builds URL based on bounds, which we may not have access to in FEMA api
    buildURL: function( url, bounds ) {
        if (! bounds) {
            return undefined;
        }

        var sw = bounds.getSouthWest();
        var ne = bounds.getNorthEast();

        var params = {
            "SWLAT" : sw.lat,
            "SWLNG" : sw.lng,
            "NELAT" : ne.lat,
            "NELNG" : ne.lng
        };

        var url = url.replace(/{[^{}]+}/g, function(k) {
            return params[k.replace(/[{}]+/g, "")] || "";
        });

        return leaflet_helper.proxify(url);
    },*/
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
    // Rewrite to clean once data received

/*
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
