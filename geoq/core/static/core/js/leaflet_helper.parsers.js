//====================================
leaflet_helper.constructors = {};
leaflet_helper.static_root = "/static";

// MIT-licensed code by Benjamin Becquet
// https://github.com/bbecquet/Leaflet.PolylineDecorator
L.RotatedMarker = null;
L.rotatedMarker = null;
//Set up base icon
var MapMarker = null;

leaflet_helper.init = function(){

    leaflet_helper.static_root = (typeof aoi_feature_edit!="undefined")?aoi_feature_edit.static_root:"/static";

    L.RotatedMarker = L.Marker.extend({
      options: { angle: 0 },
      _setPos: function(pos) {
        L.Marker.prototype._setPos.call(this, pos);
        if (L.DomUtil.TRANSFORM) {
          // use the CSS transform rule if available
          this._icon.style[L.DomUtil.TRANSFORM] += ' rotate(' + this.options.angle + 'deg)';
        } else if (L.Browser.ie) {
          // fallback for IE6, IE7, IE8
          var rad = this.options.angle * L.LatLng.DEG_TO_RAD,
          costheta = Math.cos(rad),
          sintheta = Math.sin(rad);
          this._icon.style.filter += ' progid:DXImageTransform.Microsoft.Matrix(sizingMethod=\'auto expand\', M11=' +
            costheta + ', M12=' + (-sintheta) + ', M21=' + sintheta + ', M22=' + costheta + ')';
        }
      }
    });
    L.rotatedMarker = function(pos, options) {
        return new L.RotatedMarker(pos, options);
    };
    //Set up base icon
    MapMarker = L.Icon.extend({
        options: {
            id: 0,
            shadowUrl: null,
            iconAnchor: new L.Point(7, 24),
            iconSize: new L.Point(15, 24),
            repeatMode: true,
            text: 'Social Media Pointer',
            iconUrl: leaflet_helper.static_root +"/leaflet/images/orange-marker-icon.png"
        }
    });

};

leaflet_helper.constructors.identifyParser = function(result, outputLayer){
    //Use GeoJSON as the standard to try if no matches are found
    var parser = L.GeoJSON;
    var parserName = "Leaflet GeoJSON";
    result = result || {};

    if (result.results && result.results.length &&
        result.results[0].layerName && result.results[0].attributes &&
        result.results[0].attributes.Latitude && result.results[0].attributes.ImageMissionId && result.results[0].attributes.ImageURL &&
        result.results[0].attributes.ThumbnailURL && result.results[0].attributes.Heading && result.results[0].geometryType) {

        //Parser is CAP imagery Format
        parser = leaflet_helper.parsers.addFEMAImageEventsData;
        parserName = "FEMA ImageEvents";

    } else if (result.results && result.results.length &&
            result.results[0].layerName && result.results[0].attributes &&
            result.results[0].attributes.latitude && result.results[0].attributes.ProjectName && result.results[0].attributes.ImageURL &&
            result.results[0].attributes.ThumbnailURL && result.results[0].attributes.ImageDirection && result.results[0].geometryType) {

            //Parser is CAP imagery Format (but the new revised metadata)
            parser = leaflet_helper.parsers.addDynamicCapimageData;
            parserName = "CAP CapImages";

    } else if (result.results && result.results.length &&
               result.results[0].layerName && result.results && result.results[0].attributes &&
               result.results[0].attributes.dod_txt && result.results[0].attributes.event_id &&
               result.results[0].attributes.comments && result.results[0].attributes.OBJECTID &&
               result.results[0].geometryType) {

        parser = leaflet_helper.parsers.addNOAADamageAssessmentToolkit;
        parserName = "NOAA Damage Toolkit";

    } else if (result.geometryType && result.geometryType == "esriGeometryPoint" &&
               result.features && result.features.length &&
               result.features[0] && result.features[0].attributes) {

        //Parser is CAP imagery Format
        parser = leaflet_helper.parsers.addDynamicCapimageData;
        parserName = "CAP GeoJSON";

    } else if (result.stat == "ok" && result.photos && result.photos.page &&
               result.photos.photo && result.photos.perpage) {

        parser = leaflet_helper.parsers.flickrImages;
        parserName = "Flickr Photo Search";
    } else if (result.meta && result.meta.code && result.meta.code==200 &&
               result.data && _.isArray(result.data)) {

        parser = leaflet_helper.parsers.instagramImages;
        parserName = "Instagram Search";
    } else if (result && result.summary=="YouTube") {

        parser = leaflet_helper.parsers.youTube;
        parserName = "YouTube Videos";
    } else if (result && result.type && result.type=="FeatureCollection" && result.features && result.features[0] &&
        result.features[0].properties && result.features[0].properties.status && result.features[0].properties.created_at &&
        result.features[0].properties.analyst && result.features[0].properties.updated_at && result.features[0].properties.template ) {

        parser = leaflet_helper.parsers.geoq_exported_json;
        parserName = "GeoQ GeoJSON";

    } else if (result && result.type && result.type=="FeatureCollection" && result.features && result.features[0] &&
        result.features[0].properties && result.features[0].properties.status && result.features[0].properties.created_at &&
        result.features[0].properties.analyst && result.features[0].properties.updated_at && result.features[0].style) {

        parser = leaflet_helper.parsers.leaflet_geojson;
        parserName = "Leaflet GeoJSON";
    } else if (result && result.type && result.type=="FeatureCollection" && result.features && result.features[0] &&
        result.features[0].properties && result.features[0].properties.fulcrum_id && result.features[0].properties.created_at &&
        result.features[0].properties.system_created_at && result.features[0].properties.updated_at ) {

        parser = leaflet_helper.parsers.fulcrum_exported_json;
        parserName = "Fulcrum GeoJSON";



    } else if (result && result.type && result.type=="FeatureCollection" && result.features) {

        parser = leaflet_helper.parsers.basicJson;
        parserName = "Basic JSON";
    } else if (result && result.geonames && result.geonames.length && false) { //TODO: Why not turned on?

        parser = leaflet_helper.parsers.geoNameWikiData;
        parserName = "GeoName Lookup";

    } else if (result && outputLayer && outputLayer.config && outputLayer.config.type && outputLayer.config.type=="Web Data Link") {

        parser = leaflet_helper.parsers.webDataLink;
        parserName = "Web Data Lookup";
    } else if (result && result[0] && result[0].key && result[0].skey && result[0].clon!==undefined
        && result[0].clat!==undefined && result[0].location!==undefined && result[0].ca!==undefined
        && result[0].cd!==undefined && result[0].image_url!==undefined) {

        parser = leaflet_helper.parsers.mapillaryImages;
        parserName = "Mapillary Images";
    }
    //ADD new parser detectors here

    return {parser: parser, parserName:parserName};
};


leaflet_helper.constructors.urlTemplater =function(url, map, layer_json){
    if (!url || !url.indexOf || url.indexOf("{") < 0) return url;

    //Turn search strings into underscore templates to make parseable text (safer than an eval statement)
    _.templateSettings.interpolate = /\{\{(.+?)\}\}/g;
    var _url_template = _.template(url);

    //Get map info that will be added into the url if needed
    var mapExtent = map.getBounds();
    var center = map.getCenter();
    var size = map.getSize();
    var mapState={
        zoom:map.getZoom(),
        lat:center.lat,
        lon:center.lng,
        lng:center.lng,
        n:mapExtent._northEast.lat,
        s:mapExtent._southWest.lat,
        e:mapExtent._northEast.lng,
        w:mapExtent._southWest.lng,
        width:parseInt(size.x),
        height:parseInt(size.y),
        radius:2
    };
    mapState.bbox = mapState.w+","+mapState.n+","+mapState.e+","+mapState.s;

    //Feed the generated variables into the template, and return the result
    layer_json = $.extend(layer_json,mapState);
    layer_json.tags = aoi_feature_edit.tags  || "disaster";

    var new_url;
    try {
        new_url = _url_template(layer_json);
    } catch (ex) {
        log.error ("Error in parsing a URL template: " + ex.message);
    }

    return new_url || url;
};

leaflet_helper.constructors.geojson_layer_count = 0;
leaflet_helper.constructors.geojson = function(layerConfig, map, useLayerInstead) {

    if (!layerConfig) layerConfig = {};
    var url = layerConfig.url || "";

    if (layerConfig.type == 'ESRI Identifiable MapServer'){
        if (_.str.endsWith(url,'?')) url = url.substr(0,url.length-1);
        if (_.str.endsWith(url,'/')) url = url.substr(0,url.length-1);
        if (_.str.endsWith(url,'/export')) url = url.substr(0,url.length-7) + '/identity';
        url += '?geometryType=esriGeometryEnvelope&geometry={{bbox}}&mapExtent={{bbox}}';
        url += '&imageDisplay={{width}},{{height}},96&tolerance={{width}}&f=json&layers=visible:'+(layerConfig.layer||"all");
    }

    if (useLayerInstead && (useLayerInstead.geojson_layer_count !== undefined)) {
        layerConfig.geojson_layer_count = useLayerInstead.geojson_layer_count;
    } else {
        leaflet_helper.constructors.geojson_layer_count++;
        layerConfig.geojson_layer_count = leaflet_helper.constructors.geojson_layer_count;
    }

    function iconCallback(feature, latlng){
        var iconUrl = "";
        var iconX = 15;
        var iconY = 24;
        var iconAnchor = null;

        //TODO: Move these to a special iconParser?
        if (feature && feature.properties && feature.properties.icon_type=="ImageEvents" &&  feature.properties.layer_type) {

            var imageRoot = leaflet_helper.static_root +"/images/ImageEvents/";
            iconX = 14;
            iconY = 14;
            iconAnchor = new L.Point(7, 7);

            if (feature.properties.layer_type == "Aerial Oblique") {
                if (feature.properties.heading) {
                    //TODO: Rotate properly
                    iconUrl = imageRoot+"c5739cf19fe5e7635c04ae6eb2e7572f.png";
                } else {
                    iconUrl = imageRoot+"32d612809f495aa6e5491efbe6ebc8fd.png";
                }
            } else if (feature.properties.layer_type == "Aerial Oblique Target") {
                iconUrl = imageRoot+"f92b227dfe6c1fbdc122eeeef2904381.png";
            } else if (feature.properties.layer_type == "Aerial Oblique Line") {
                //Should only be lines and set in polygonStyleCallBack, keeping this as a backup
                iconUrl = imageRoot+"f92b227dfe6c1fbdc122eeeef2904381.png";

            } else if (feature.properties.layer_type == "Aerial Nadir") {
                iconUrl = imageRoot+"a2790e3ba9dcb053c40320e539a7ad59.png";


            } else if (feature.properties.layer_type == "Ground Images") {
                if (feature.properties.heading) {
                    //TODO: Validate that these are Rotated properly
                    iconUrl = imageRoot+"3353b7bc2d8b9fa6085b08ba446dfc8a.png";
                } else {
                    iconUrl = imageRoot+"5e65279a5d62555c05d2bc421e7ddc62.png";
                }
            } else if (feature.properties.layer_type == "Ground Targets") {
                iconUrl = imageRoot+"8e4c73a221dda8debdcf2658969c3670.png";
            } else if (feature.properties.layer_type == "Ground Lines") {
                //Should only be lines and set in polygonStyleCallBack, keeping this as a backup
                iconUrl = imageRoot+"8e4c73a221dda8debdcf2658969c3670.png";
            } else {
                var layerNum = layerConfig.geojson_layer_count % aoi_feature_edit.available_icons.length;
                iconUrl = aoi_feature_edit.available_icons[layerNum];
            }

        } else if (layerConfig && layerConfig.layerParams && (layerConfig.layerParams.icon || layerConfig.layerParams.iconUrl)) {
            iconUrl = layerConfig.layerParams.icon || layerConfig.layerParams.iconUrl;
            if (layerConfig.layerParams.iconX && layerConfig.layerParams.iconY) {
                iconX = layerConfig.layerParams.iconX;
                iconY = layerConfig.layerParams.iconY;
            }
        } else {
            var layerNum = layerConfig.geojson_layer_count % aoi_feature_edit.available_icons.length;
            iconUrl = aoi_feature_edit.available_icons[layerNum];
        }

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
    }

    var outputLayer = useLayerInstead || new L.geoJson(undefined,{
        onEachFeature: function(feature, layer) {leaflet_helper.parsers.standard_onEachFeature(feature, layer, layerConfig); },
        style: leaflet_helper.constructors.keepStyleBuilderCallback,
        pointToLayer: iconCallback
    });
    if (outputLayer.geojson_layer_count == undefined) {
        outputLayer.geojson_layer_count = layerConfig.geojson_layer_count;
    }

    if (outputLayer && !outputLayer.options) {
        outputLayer.options = {};
    }

    var opacity = 1;
    if (outputLayer.config) opacity = (outputLayer.config.opacity !== undefined) ? outputLayer.config.opacity : opacity;

    outputLayer.options = $.extend(outputLayer.options, layerConfig.layerParams);

    outputLayer.options.opacity = opacity;
    outputLayer.options.style = outputLayer.options.style || {};
    outputLayer.options.style.opacity = opacity;

    url = leaflet_helper.constructors.urlTemplater(url, map, layerConfig.layerParams);
    var proxiedURL = leaflet_helper.proxify(url);

    $.ajax({
        type: 'GET',
        url: proxiedURL,
        dataType: layerConfig.format || 'json',
        success: function(data){
            leaflet_helper.constructors.geojson_success(data, proxiedURL, map, outputLayer);
            // try to set correct opacity
                leaflet_layer_control.setLayerOpacity(outputLayer, outputLayer.options.opacity, true);
        },
        error: leaflet_helper.constructors.geojson_error
    });

    return outputLayer;
};
leaflet_helper.constructors.iconBuilderCallback = function(feature, latlng, layerConfig){
    var iconX = 15;
    var iconY = 24;
    var iconAnchor = null;

    layerConfig = layerConfig || {geojson_layer_count:1, name:'JSON Layer'};

    var layerNum = layerConfig.geojson_layer_count % aoi_feature_edit.available_icons.length;
    var iconUrl = aoi_feature_edit.available_icons[layerNum];

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
};

leaflet_helper.constructors.polygonStyleBuilderCallback =function(feature) {
//
    var polyFillColor = '#ff0000';
//    if (feature.properties && feature.properties.status) {
//        var status = feature.properties.status.toLowerCase().replace(" ","_");
//        polyFillColor = leaflet_helper.styles[status].fillColor;
//    }

    var style = {
        weight: 2,
        opacity: 1,
        color: 'white',
        fillOpacity: 0.1,
        fillColor: polyFillColor};
    if (feature.properties.layer_type == "Aerial Oblique Line") {
        style.color = 'green';
        style.dashArray = '3';
    } else if (feature.properties.layer_type == "Ground Lines") {
        style.color = 'orange';
        style.dashArray = '3';
    }
    return style;
};

leaflet_helper.constructors.keepStyleBuilderCallback = function(feature) {
    var style;
    if (feature.style) {
        style = feature.style;
    } else {
        style = {
            weight: 2,
            opacity: 1,
            color: 'white',
            fillOpacity: 0.1,
            fillColor: '#ff0000'
        };
    }

    return style;
};

leaflet_helper.constructors.geojson_error = function (resultobj){
    log.error ("A JSON layer was requested, but no valid response was received from the server, result:", resultobj);
};
leaflet_helper.constructors.geojson_success = function (data, proxiedURL, map, outputLayer, noparse) {
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

    if (!noparse){
        if (result && result.error && result.error.message){
            log.error("JSON layer error, message was: " + result.error.message + " url: "+ proxiedURL);
        } else {
            var parserInfo = leaflet_helper.constructors.identifyParser(result, outputLayer);
            if (parserInfo && parserInfo.parser) {
                parserInfo.parser(result, map, outputLayer);

                var features = 0;
                if (result && result.features && result.features.length) {
                    features = result.features.length;
                } else if (result) {
                    try {
                        features = _.toArray(result)[0].length;
                    } catch (ex) {}
                }
//                log.info("+ JSON loaded from : "+ proxiedURL+ " - features: "+ features+ " - parser type: " + parserInfo.parserName);
            }
        }
    }

    if (outputLayer) {
        leaflet_helper.update_tree_title(outputLayer);
    }
    if (outputLayer && !outputLayer.options) {
        outputLayer.options = {};
    }

    return outputLayer;
};


//====================================
leaflet_helper.id_count = 0;
leaflet_helper.clean = function (text) {
    return jQuery("<div>"+text+"</div>").text() || "";
};
leaflet_helper.addLinksToPopup = function (layerName,id,useMove,useHide,useDrop) {

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

};
leaflet_helper.update_tree_title = function(outputLayer) {
    var treeNodes;
    if (leaflet_layer_control && leaflet_layer_control.$tree && leaflet_layer_control.$tree.fancytree) {
        treeNodes = leaflet_layer_control.$tree.fancytree('getTree');
        if (treeNodes) {
            treeNodes = treeNodes.rootNode;
        } else {
            return;
        }
    } else {
        return;
    }


    var layerName = outputLayer.name;
    var treeItem = null;
    _.each(treeNodes.children,function(treeCats){
        _.each(treeCats.children,function(treeNode){
            var treeNodeTitle = treeNode.title;

            if (_.str.startsWith(treeNodeTitle,layerName)){
                treeItem = treeNode;
            }
        });
    });

    if (treeItem){
        if (outputLayer._layers) {
            var numFeatures = _.toArray(outputLayer._layers).length;
            treeItem.setTitle(layerName + " ("+numFeatures+")");
        }
    }
};

leaflet_helper.parsers = {};
leaflet_helper.parsers.basicJson = function (geojson, map, outputLayer, keepOld) {
    if (outputLayer) {
        if (!keepOld) {
            outputLayer.options.items = [];
            outputLayer.clearLayers();
        }
        outputLayer.options.onEachFeature = function(feature, layer) {
            leaflet_helper.parsers.standard_onEachFeature(feature, layer, outputLayer);
        };
        outputLayer.options.pointToLayer = function(feature, latlng) {
            return leaflet_helper.constructors.iconBuilderCallback(feature, latlng, outputLayer);
        };

        outputLayer.addData(geojson);
    } else {
        outputLayer = L.geoJson(geojson,{
            onEachFeature: function(feature, layer) {
                leaflet_helper.parsers.standard_onEachFeature(feature, layer, outputLayer);
            },
            style: leaflet_helper.constructors.polygonStyleBuilderCallback,
            pointToLayer: function(feature, latlng) {
                return leaflet_helper.constructors.iconBuilderCallback(feature, latlng, outputLayer);
            }
        }).addTo(map);
    }

    if (outputLayer) {
        leaflet_helper.update_tree_title(outputLayer);
    }
    if (outputLayer && !outputLayer.options) {
        outputLayer.options = {};
    }

    return outputLayer;
};
leaflet_helper.parsers.fulcrum_exported_json = function (geojson, map, outputLayer, keepOld) {
    if (outputLayer) {
        if (!keepOld) {
            outputLayer.options.items = [];
            outputLayer.clearLayers();
        }
        outputLayer.options.onEachFeature = function(feature, layer) {
            aoi_feature_edit.fulcrumfeatureLayer_onEachFeature(feature, layer, outputLayer, true);
        };
        outputLayer.addData(geojson);

    } else {
        outputLayer = L.geoJson(geojson,{
            style: leaflet_helper.constructors.polygonStyleBuilderCallback,
            onEachFeature: function(feature, layer) {
                aoi_feature_edit.fulcrumfeatureLayer_onEachFeature(feature, layer, outputLayer, true);
            }
        }).addTo(map);
        outputLayer.on('click', function(e){
            if (typeof leaflet_layer_control!="undefined"){
                leaflet_layer_control.show_feature_info(e.layer.feature);
            }
        });
    }

    if (outputLayer) {
        leaflet_helper.update_tree_title(outputLayer);
    }
    if (outputLayer && !outputLayer.options) {
        outputLayer.options = {};
    }
    outputLayer.options.opacity = outputLayer.options.opacity || 1;

    return outputLayer;
};
leaflet_helper.parsers.geoq_exported_json = function (geojson, map, outputLayer, keepOld) {
    if (outputLayer) {
        if (!keepOld) {
            outputLayer.options.items = [];
            outputLayer.clearLayers();
        }
        outputLayer.options.onEachFeature = function(feature, layer) {
            aoi_feature_edit.featureLayer_onEachFeature(feature, layer, outputLayer, true);
        };
        outputLayer.options.pointToLayer = function(feature, latlng) {
                return aoi_feature_edit.featureLayer_pointToLayer(feature, latlng, outputLayer, undefined);
        };

        outputLayer.addData(geojson);
    } else {
        outputLayer = L.geoJson(geojson,{
            style: leaflet_helper.constructors.polygonStyleBuilderCallback,
            onEachFeature: function(feature, layer) {
                aoi_feature_edit.featureLayer_onEachFeature(feature, layer, outputLayer, true);
            },

            pointToLayer: function(feature, latlng) {
                return aoi_feature_edit.featureLayer_pointToLayer(feature, latlng, outputLayer, undefined);
            }

        }).addTo(map);
        outputLayer.on('click', function(e){
            if (typeof leaflet_layer_control!="undefined"){
                leaflet_layer_control.show_feature_info(e.layer.feature);
            }
        });
    }

    if (outputLayer) {
        leaflet_helper.update_tree_title(outputLayer);
    }
    if (outputLayer && !outputLayer.options) {
        outputLayer.options = {};
    }
    outputLayer.options.opacity = outputLayer.options.opacity || 1;

    return outputLayer;
};
leaflet_helper.parsers.leaflet_geojson = function (geojson, map, outputLayer, keepOld) {
    if (outputLayer) {
        if (!keepOld) {
            outputLayer.options.items = [];
            outputLayer.clearLayers();
        }
        outputLayer.options.onEachFeature = function(feature, layer) {
            aoi_feature_edit.featureLayer_onEachFeature(feature, layer, outputLayer, true);
        };
        outputLayer.options.pointToLayer = function(feature, latlng) {
//            return aoi_feature_edit.featureLayer_pointToLayer(feature, latlng, outputLayer, undefined);
            var style = feature.style || {"type":"image"};
            var icon;
            var marker;
            if (style.type == 'maki') {
                icon = L.MakiMarkers.Icon;
                icon.type = 'maki';
            }
            else {
                icon = aoi_feature_edit.MapIcon;
            }
            if (feature.name) {
                icon.title = ftype.name;
                icon.text = ftype.name;
            }
            if (feature.icon) {
                style.iconUrl = feature.icon;
            }

            if (style) {
                style.iconUrl = style.iconUrl || style.iconURL || style.iconurl ||  aoi_feature_edit.static_root +"/leaflet/images/red-marker-icon.png";
            } else {
                style.iconUrl = aoi_feature_edit.static_root +"/leaflet/images/red-marker-icon.png";
            }

            return new L.Marker(latlng, {
                icon: new icon(style)
            });
        };

        outputLayer.addData(geojson);
    } else {
        outputLayer = L.geoJson(geojson,{
            style: leaflet_helper.constructors.keepStyleBuilderCallback,
            onEachFeature: function(feature, layer) {
                aoi_feature_edit.featureLayer_onEachFeature(feature, layer, outputLayer, true);
            },

            pointToLayer: function(feature, latlng) {
                return aoi_feature_edit.featureLayer_pointToLayer(feature, latlng, outputLayer, undefined);
            }

        }).addTo(map);
        outputLayer.on('click', function(e){
            if (typeof leaflet_layer_control!="undefined"){
                leaflet_layer_control.show_feature_info(e.layer.feature);
            }
        });
    }

    if (outputLayer) {
        leaflet_helper.update_tree_title(outputLayer);
    }
    if (outputLayer && !outputLayer.options) {
        outputLayer.options = {};
    }
    outputLayer.options.opacity = outputLayer.options.opacity || 1;

    return outputLayer;
};

leaflet_helper.generic_popup_content = function (properties) {
    var popupContent = document.createElement('div');
    for (var idx in properties) {
        if (idx[0] === '_') continue;
        var entry = document.createElement('div');
        var label = document.createElement('b');
        label.appendChild(document.createTextNode(idx+": "));
        entry.appendChild(label);
        entry.appendChild(document.createTextNode(properties[idx]));
        popupContent.appendChild(entry);
    }
    return popupContent;
}

leaflet_helper.parsers.standard_onEachFeature = function (feature, layer, layerConfig) {
    if (feature.properties) {
        var popupContent = "";
        if (feature.properties.popupContent) {
            popupContent = feature.properties.popupContent;
        } else if (feature.properties.name) {
            popupContent = leaflet_helper.clean(feature.properties.name);
            if (feature.properties.link){
                var link = leaflet_helper.clean(feature.properties.link); //Strip out any offending
                popupContent = "<a href='"+link+"' target='_blank'>"+popupContent+"</a>";
            }
        } else {
            popupContent = leaflet_helper.generic_popup_content(feature.properties);
        }
        if (popupContent) {
            if (_.isString(popupContent)) {
                if (!popupContent.indexOf("<span class='hide feature-id-hint'>")){
                    if (layerConfig && layerConfig.name) {
                        if (!feature.properties.id) {
                            feature.properties.id = leaflet_helper.id_count++;
                        }
                        var id = feature.properties.id;
                        popupContent += leaflet_helper.addLinksToPopup(layerConfig.name, id, true, false);
                    }
                }
                layer.bindPopup(popupContent);
            } else if (_.isElement(popupContent)) {
                layer.bindPopup(popupContent);
            }
        }
        if (feature.properties.heading && parseInt(feature.properties.heading) && layer.options){
            layer.options.angle = parseInt(feature.properties.heading);
        }
    }

};
leaflet_helper.parsers.addNOAADamageAssessmentToolkit = function (result, map, outputLayer) {

    if (!outputLayer.options) outputLayer.options = {};
    if (!outputLayer.options.items) outputLayer.options.items = [];

    var jsonObjects = [];
    $(result.results).each(function () {
        var feature = $(this)[0];
        var id = feature.attributes.OBJECTID;

        var itemFound = false;
        _.each(outputLayer.options.items,function(item){
           if (item.id == id) itemFound = true;
        });
        if (!itemFound) {
            outputLayer.options.items.push(feature);

            feature.attributes = feature.attributes || {};
            var attributes = feature.attributes;

            var lat = feature.geometry.y || attributes.lat || 0;
            var lng = feature.geometry.x || attributes.lon || 0;
            lat = parseFloat(lat);
            lng = parseFloat(lng);

            var survey_date = attributes.surveydate;
            var storm_date = attributes.stormdate;
            var damage_txt = attributes.damage_txt;
            var dod_txt = attributes.dod_txt;
            var windspeed = attributes.windspeed;
            var injuries = parseInt(attributes.injuries);
            var deaths = parseInt(attributes.deaths);
            var comments = attributes.comments;
            var image = attributes.image;

            var display = "";
            if (feature.layerName) {
                display = feature.layerName + ': ' + id;
            } else {
                display = "NOAA Damage Assessment";
            }

            var popupContent = leaflet_layer_control.parsers.textIfExists({name: display, title:"", header:true, linkit:image});
            popupContent += leaflet_layer_control.parsers.textIfExists({name: survey_date, title:"Survey Date", datify:"calendar"});
            popupContent += leaflet_layer_control.parsers.textIfExists({name: storm_date, title:"Storm Date", datify:"calendar"});
            popupContent += leaflet_layer_control.parsers.textIfExists({name: damage_txt, title:"Damage"});
            popupContent += leaflet_layer_control.parsers.textIfExists({name: dod_txt, title:"Dod Text"});
            popupContent += leaflet_layer_control.parsers.textIfExists({name: windspeed, title:"Windspeed"});
            popupContent += leaflet_layer_control.parsers.textIfExists({name: injuries, title:"Injuries"});
            popupContent += leaflet_layer_control.parsers.textIfExists({name: deaths, title:"Deaths"});
            popupContent += leaflet_layer_control.parsers.textIfExists({name: comments, title:"Comments"});

            popupContent += leaflet_helper.addLinksToPopup(outputLayer.name, id, true, false);

            var json = {
                type: "Feature",
                properties: {
                    id: id,
                    source: 'FEMA Damage Assessment',
                    name: display,
                    image: image,
                    thumbnail: image,
                    popupContent: popupContent
                },
                geometry: {
                    type: "Point",
                    coordinates: [lng, lat]
                }

            };
            jsonObjects.push(json);
        }
    });
    outputLayer.addData(jsonObjects);
    if (result.features && result.features.length) {
        log.info("A NOAA Damage Assessment Toolkit layer was updated adding "+ jsonObjects.length+ " features");
    } else {
        log.info("A NOAA Damage Assessment Toolkit request was returned, but no features were found");
    }

    return outputLayer;
};
leaflet_helper.parsers.addFEMAImageEventsData = function (result, map, outputLayer) {

    if (!outputLayer.options) outputLayer.options = {};
    if (!outputLayer.options.items) outputLayer.options.items = [];

    var jsonObjects = [];
    $(result.results).each(function () {
        var feature = $(this)[0];
        var id = feature.attributes.Id;

        var itemFound = false;
        _.each(outputLayer.options.items,function(item){
           if (item.id == id) itemFound = true;
        });
        if (!itemFound) {
            outputLayer.options.items.push(feature);

            feature.attributes = feature.attributes || {};
            var attributes = feature.attributes;

            try {
                var lat = feature.geometry.y || attributes.Latitutde || 0;
                var lng = feature.geometry.x || attributes.Longitude || 0;
                lat = parseFloat(lat);
                lng = parseFloat(lng);

                var photo_date = attributes.EXIFPhotoDate;
                var altitude = attributes.Altitude;
                var team_name = attributes.TeamName;
                var event_name = attributes.EventName;

                var display = "";
                if (feature.displayFieldName) {
                    display = attributes[feature.displayFieldName];
                } else if (feature.value) {
                    display = feature.value;
                } else if (event_name && team_name) {
                    display = event_name+": "+team_name;
                } else {
                    display = "Uploaded Photo";
                }

                var image_type = "";
                if (feature.attributes.ImageTypeId == 1) {
                    image_type = "Aerial Oblique";
                } else if (feature.attributes.ImageTypeId == 2) {
                    image_type = "Aerial Nadir";
                } else if (feature.attributes.ImageTypeId == 3) {
                    image_type = "Ground";
                }

                var popupContent = leaflet_layer_control.parsers.textIfExists({name: display, title:"Image", header:true, linkit:attributes.ThumbnailURL});
                popupContent += leaflet_layer_control.parsers.textIfExists({name: photo_date, title:"Photo Date", datify:"calendar, fromnow"});
                popupContent += "<a href='" + attributes.ImageURL + "' target='_new'><img style='width:150px' src='" + attributes.ThumbnailURL + "' /></a><br/>";
                popupContent += leaflet_layer_control.parsers.textIfExists({name: altitude, title:"Altitude", suffix:" meters"});
                popupContent += leaflet_layer_control.parsers.textIfExists({name: image_type, title:"Collection Type"});
                popupContent += leaflet_helper.addLinksToPopup(outputLayer.name, id, true, false);

                //TODO: Not using color yet
                var color = "blue";
                if (feature.layerName == "Track Points") {
                    color = "purple";
                } else if (feature.layerName == "Ground Images") {
                    color = "orange";
                } else if (feature.layerName == "Ground Targets") {
                    color = "green";
                } else if (feature.layerName == "Ground Lines") {
                    color = "yellow";
                }
                //Adjust heading 90 degrees to the right
                var heading = feature.attributes.CalculatedHeading || feature.attributes.Heading || 0;
                heading = 90 + parseInt(heading);
                if (heading > 360) heading -= 360;

                var geometry = {};
                if (feature.geometry && feature.geometry.paths) {
                    geometry = { type: "MultiLineString",
                        coordinates: feature.geometry.paths //[ [100.0, 0.0], [101.0, 1.0] ]
                    }
                } else {
                    geometry = {
                        type: "Point",
                        coordinates: [lng, lat]
                    }
                }

                var json = {
                    type: "Feature",
                    properties: {
                        id: id,
                        source: 'CAP ImageEvents',
                        name: display,
                        image: feature.attributes.ImageURL,
                        thumbnail: feature.attributes.ThumbnailURL,
                        popupContent: popupContent,
                        icon_type: "ImageEvents",
                        layer_type: feature.layerName,
                        heading: heading,
                        color: color
                    },
                    geometry: geometry
                };
                jsonObjects.push(json);
            } catch (ex) {
                log.error("There was an error importing a CAP ImageEvents feature", feature);
            }
        }
    });
    outputLayer.addData(jsonObjects);
    if (result.features && result.features.length) {
        log.info("A FEMA ImageEvents layer was updated adding "+ jsonObjects.length+ " features");
    } else {
        log.info("A FEMA ImageEvents request was returned, but no features were found");
    }

    return outputLayer;
};

/**
 * Adds items from the resulting query. Assumes old data is invalid and clears it out.
 * @param {[type]} result      [description]
 * @param {[type]} map         [description]
 * @param {[type]} outputLayer [description]
 * @param {boolean} keepOld    true to keep old data (e.g. combinging paginated results)
 */
leaflet_helper.parsers.addDynamicCapimageData = function (result, map, outputLayer, keepOld) {
    if (!outputLayer.options) outputLayer.options = {};
    if (!outputLayer.options.items) outputLayer.options.items = [];

    var jsonObjects = [];

    var results = result.features || result.results;

    if (!keepOld) {
        outputLayer.options.items = [];
        outputLayer.clearLayers();
    }

    $(results).each(function () {
        var feature = $(this)[0];
        var id = feature.attributes.ID;

        var itemFound = false;
        if (keepOld) {
            _.each(outputLayer.options.items,function(item){
               if (item.attributes.ID == id) itemFound = true;
            });
        }
        if (!itemFound) {
            outputLayer.options.items.push(feature);

            var popupContent = "<h5>CAP Item #"+id+"</h5><a href='" + feature.attributes.ImageURL + "' target='_new'><img style='width:256px' src='" + feature.attributes.ThumbnailURL + "' /></a>";
            popupContent += leaflet_helper.addLinksToPopup(outputLayer.name, id, true, false);

            var json = {
                type: "Feature",
                properties: {
                    id: id,
                    source: 'CAP Imagery',
                    name: id + " - " + feature.attributes.DaysOld + " days old",
                    image: feature.attributes.ImageURL,
                    thumbnail: feature.attributes.ThumbnailURL,
                    popupContent: popupContent
                },
                geometry: {
                    type: "Point",
                    coordinates: [feature.geometry.x, feature.geometry.y]
                }
            };
            jsonObjects.push(json);
        }
    });
    outputLayer.addData(jsonObjects);
    if (result.features && result.features.length) {
        log.info("A FEMA CAP layer was updated adding "+ jsonObjects.length+ " features");
    } else {
        log.info("A FEMA CAP request was returned, but no features were found");
    }

    return outputLayer;
};
leaflet_helper.parsers.instagramImages = function (result, map, outputLayer) {
    var jsonObjects = [];
    var photos = result.data;

    if (!outputLayer.options) outputLayer.options = {};
    if (!outputLayer.options.items) outputLayer.options.items = [];

    _.each(photos,function(image){
        var itemFound = false;
        _.each(outputLayer.options.items,function(item){
           if (item.id == image.id) itemFound = true;
        });
        if (!itemFound) {
            outputLayer.options.items.push(image);

            var imageURL = image.link;
            var thumbnailURL = image.images.thumbnail.url;

            var id = image.id;
            var title = "Instagram: "+id;
            var location = image.location;
            var tags = image.tags.join(", ");


            var popupContent = "<h5>Instagram Picture</h5>";
            popupContent += "Posted by: "+image.user.username+"<br/>";
            if (tags) popupContent += "Tags: "+tags+"<br/>";
            popupContent += "<a href='" + imageURL + "' target='_new'><img style='width:150px' src='" + thumbnailURL + "' /></a>";
            popupContent += leaflet_helper.addLinksToPopup(outputLayer.name, id, true, true);

            var json = {
                type: "Feature",
                properties: {
                    name: title,
                    id: id,
                    source: 'Instagram',
                    image: imageURL,
                    thumbnail: thumbnailURL,
                    popupContent: popupContent,
                    tags: aoi_feature_edit.tags || "Disaster"
                },
                geometry: {
                    type: "Point",
                    coordinates: [location.longitude, location.latitude]
                }
            };
            jsonObjects.push(json);
        }
    });


    outputLayer.addData(jsonObjects);
    if (photos && photos.length) {
        log.info("An Instagram Social Photos layer was appended with "+ photos.length+" features");
    } else {
        log.info("An Instagram Social Photos response was returned, but with no features.");
    }

    return outputLayer;
};


leaflet_helper.parsers.flickrImages = function (result, map, outputLayer) {
    var jsonObjects = [];
    var photos = result.photos;

    if (!outputLayer.options) { outputLayer.options = {}};
    if (!outputLayer.options.items) { outputLayer.options.items = []};

    $(photos.photo).each(function () {
        var feature = $(this)[0];
        var id=feature.id;

        var itemFound = false;
        _.each(outputLayer.options.items,function(item){
           if (item.id == id) itemFound = true;
        });
        if (!itemFound) {
            outputLayer.options.items.push(feature);

            var title=feature.title || "Flickr Photo";
            var secret=feature.secret;
            var id=secret;
            var server=feature.server;
            var farm=feature.farm;
            var owner=feature.owner;
            var base=id+'_'+secret+'_s.jpg';
            var major=id+'_'+secret+'_z.jpg';
            var imageURL= 'http://farm'+farm+'.static.flickr.com/'+server+'/'+major;
            var thumbnailURL='http://farm'+farm+'.static.flickr.com/'+server+'/'+base;

            var center = map.getCenter();
            var popupContent = "<h5>Flickr Picture</h5>";
            popupContent += "Posted by: "+owner+"<br/>";
            if (aoi_feature_edit.tags) popupContent += "Tags: "+aoi_feature_edit.tags+"<br/>";
            popupContent += "<a href='" + imageURL + "' target='_new'><img style='width:256px' src='" + thumbnailURL + "' /></a>";
            popupContent += leaflet_helper.addLinksToPopup(outputLayer.name, id, true, true);

            var json = {
                type: "Feature",
                properties: {
                    id: id,
                    name: title,
                    source: 'Flickr',
                    image: imageURL,
                    thumbnail: thumbnailURL,
                    popupContent: popupContent,
                    tags: aoi_feature_edit.tags || "Disaster"
                },
                geometry: {
                    type: "Point",
                    coordinates: [center.lng, center.lat] //TODO: Make this either random, or show in a tray to dnd onto map
                }
            };
            jsonObjects.push(json);
        }
    });

    outputLayer.addData(jsonObjects);
    if (photos.photo && photos.photo.length) {
        log.info("A Flickr Photos layer was loaded, with "+ photos.photo.length+" features");
    } else {
        log.info("An Flickr Photos response was returned, but with no features.");
    }

    return outputLayer;
};
leaflet_helper.parsers.youTube = function (result, map, outputLayer){
    //TODO: Parsing YouTube requires OAuth2, need a server component to do the handshake
    log.info("YouTube changed their API, v3 is not yet supported.")
};

leaflet_helper.parsers.getTemplateVal = function (template,item,backup_ids,backup_val) {
    // try to find the value in item defined by a template, then loop through all the keys in backup_ids, lastly use backup_val

    var output = undefined;
    if (backup_ids && !_.isArray(backup_ids)) {
        backup_ids = [backup_ids];
    }

    try {
        if (template) output = template(item);
    } catch (ex) {
        output = undefined;
    }

    if (typeof output == "undefined") {
        for(var i=0;i<backup_ids.length;i++){
            var backup_temp_val = item[backup_ids[i]];
            if (backup_temp_val) {
                output = backup_temp_val;
                break;
            }
        }
    }

    return output || backup_val;
};

leaflet_helper.parsers.webDataLink = function (result, map, outputLayer) {

    var jsonObjects = [];
    if (!outputLayer.options) outputLayer.options = {};
    if (!outputLayer.options.items) outputLayer.options.items = [];

    var properties = outputLayer.config || {};
    var params = properties.layerParams || {};

    //Fields and selectors:
    var rootField = properties.rootField || "";
    var selDescription = properties.description || "";
    var selFieldsToShow = properties.fieldsToShow || "";
    var selID = params.selectionID || "{{id}}";
    var selPoint = params.selectionPoint || "";
    var selPolygon = params.selectionPolygon || "";
    var selLink = params.selectionLink || "";
    var selThumbnail = params.selectionThumbnail || "";
    var selImage = params.selectionImage || "";

    var newItems = 0;
    try {
        var tID = _.template(selID);
        var tFieldsToShow = selFieldsToShow ? _.template(selFieldsToShow) : "";
        var tDescription = selDescription ? _.template(selDescription) : "";
        var tPoint = selPoint ? _.template(selPoint) : "";
        var tPolygon = selPolygon ? _.template(selPolygon) : "";
        var tLink = selLink ? _.template(selLink) : "";
        var tThumbnail = selThumbnail ? _.template(selThumbnail) : "";
        var tImage = selImage ? _.template(selImage) : "";

        //Some results have multiple levels, build through these
        var results = result;
//        if (rootField.indexOf(".")>0) {
//            var levels = rootField.split(".");
//            _.each(levels,function(level){
//               results =  results[level];
//            });
//        } else {
            results = result[rootField];
//        }

        if (!_.isArray(results)) results = [results]; //Sometimes, a single object is returned. Make it an array

        _.each(results,function(item){
            var id = leaflet_helper.parsers.getTemplateVal (tID,item,['id','title'],parseInt(Math.random() * 1000000));
            if (!item.id) item.id = id;
            var description, fieldsToShow, point, polygon, link, thumbnail, image;

            var itemFound = false;
            _.each(outputLayer.options.items,function(previous_item){
                var prev_id = leaflet_helper.parsers.getTemplateVal (tID,previous_item,['id','title'],-1);
                if (id == prev_id) itemFound = true;
            });
            if (!itemFound) {
                //Item hasn't been previously seen, so add it to the page
                outputLayer.options.items.push(item);

                try {
                    description = leaflet_helper.parsers.getTemplateVal (tDescription,item,'description','');
                    fieldsToShow = leaflet_helper.parsers.getTemplateVal (tFieldsToShow,item,'title',outputLayer.name || "Item");
                    point = leaflet_helper.parsers.getTemplateVal (tPoint,item,'location','');
                    polygon = leaflet_helper.parsers.getTemplateVal (tPolygon,item,'area','');
                    link = leaflet_helper.parsers.getTemplateVal (tLink,item,'link','');
                    thumbnail = leaflet_helper.parsers.getTemplateVal (tThumbnail,item,'thumbnail','');
                    image = leaflet_helper.parsers.getTemplateVal (tImage,item,'image','');
                } catch (ex) {
                    log.error("Error parsing a Web Data template within: "+outputLayer.name);
                }
                //Build Popup text
                var popupContent = "<h5>";
                if (link) popupContent += "<a href='" + link + "' target='_new'>";
                popupContent += fieldsToShow;
                if (link) popupContent += "</a>";
                popupContent += "</h5>";

                if (description) popupContent += description+"<br/>";
                if (image) popupContent += "<a href='" + image + "' target='_new'>";
                if (thumbnail) popupContent += "<img style='width:150px' src='" + thumbnail + "' />";
                if (image) popupContent += "</a>";
                popupContent += leaflet_helper.addLinksToPopup(outputLayer.name, id, true, true);

                //Build JSON for the item
                var json = {
                    type: "Feature",
                    properties: {
                        name: fieldsToShow,
                        id: id,
                        source: outputLayer.name,
                        image: image,
                        thumbnail: thumbnail,
                        popupContent: popupContent
                    }
                };
                if (point) {
                    var point_pieces = point.split(" ");
                    var lat = parseFloat(point_pieces[0]);
                    var lng = parseFloat(point_pieces[1]);

                    json.geometry = {
                        type: "Point",
                        coordinates: [lng, lat]
                    };
                } else if (polygon) {
                    json.geometry = {
                        type: "Polygon",
                        coordinates: JSON.parse(polygon)  //TODO: Verify
                    };
                }

                jsonObjects.push(json);
                newItems++;
            }
        });

        outputLayer.addData(jsonObjects);
        if (newItems) {
            log.info("A Web Data Link layer ("+outputLayer.name+") was appended with "+ newItems+" features");
        } else {
            log.info("A Web Data Link layer ("+outputLayer.name+") response was returned, but with no features.");
        }

    } catch (ex) {
        log.error("Problem parsing a Web Data Link: "+outputLayer.name);
    }
    return outputLayer;
};

leaflet_helper.parsers.mapillaryImages = function (result, map, outputLayer) {
    var jsonObjects = [];
    var formatName = "Mapillary";

    if (!outputLayer.options) { outputLayer.options = {}}
    if (!outputLayer.options.items) { outputLayer.options.items = []}

    $(result).each(function () {
        var feature = $(this)[0];
        var id=feature.key;

        var itemFound = false;
        _.each(outputLayer.options.items,function(item){
           if (item.id == id) itemFound = true;
        });
        if (!itemFound) {
            outputLayer.options.items.push(feature);

            var title=feature.location || "";
            var id=feature.key;
            var imageURL= feature.image_url;
            var thumbnailURL='';

            var thumbs = feature.map_image_versions;
            if (thumbs && thumbs[0] && thumbs[0].url) {
                thumbnailURL = thumbs[0].url;
            }

            var center = map.getCenter();
            var popupContent = "<h5>"+formatName+" Picture</h5>";
            popupContent += "Posted at: "+title+"<br/>";
            popupContent += "<a href='" + imageURL + "' target='_new'><img style='width:256px' src='" + thumbnailURL + "' /></a>";
            popupContent += leaflet_helper.addLinksToPopup(outputLayer.name, id, true, true);

            var lat = feature.lat || center.lat;
            var lng = feature.lon || center.lng;

            var json = {
                type: "Feature",
                properties: {
                    id: id,
                    name: title,
                    source: formatName,
                    image: imageURL,
                    thumbnail: thumbnailURL,
                    popupContent: popupContent,
                    tags: aoi_feature_edit.tags || formatName
                },
                geometry: {
                    type: "Point",
                    coordinates: [lng, lat]
                }
            };
            jsonObjects.push(json);
        }
    });

    outputLayer.addData(jsonObjects);
    if (jsonObjects && jsonObjects.length) {
        log.info("A "+formatName+" Photos layer was loaded, with "+ jsonObjects.length+" features");
    } else {
        log.info("An "+formatName+" Photos response was returned, but with no features.");
    }

    return outputLayer;
};