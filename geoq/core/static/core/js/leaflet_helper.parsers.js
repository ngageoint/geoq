//====================================
leaflet_helper.constructors = {};
leaflet_helper.constructors.identifyParser = function(result){
    //Use GeoJSON as the standard to try if no matches are found
    var parser = L.GeoJSON;
    var parserName = "Leaflet GeoJSON";

    if (result &&
        result.geometryType && result.geometryType == "esriGeometryPoint" &&
        result.features && result.features.length &&
        result.features[0] && result.features[0].attributes) {

        //Parser is CAP imagery Format
        parser = leaflet_helper.parsers.addDynamicCapimageData;
        parserName = "CAP GeoJSON";

    } else if (result &&
        result.stat == "ok" && result.photos && result.photos.page &&
        result.photos.photo && result.photos.perpage) {

        parser = leaflet_helper.parsers.flickrImages;
        parserName = "Flickr Photo Search";
    } else if (result &&
        result.meta && result.meta.code && result.meta.code==200 &&
        result.data && _.isArray(result.data)) {

        parser = leaflet_helper.parsers.instagramImages;
        parserName = "Instagram Search";
    } else if (result && result.summary=="YouTube") {

        parser = leaflet_helper.parsers.youTube;
        parserName = "YouTube Videos";
    }
    //ADD new parser detectors here

    return {parser: parser, parserName:parserName};
};


leaflet_helper.constructors.urlTemplater =function(url, map, layer_json){
    if (url.indexOf("{") < 0) return url;

    //Turn search strings into underscore templates to make parseable text (safer than an eval statement)
    _.templateSettings.interpolate = /\{\{(.+?)\}\}/g;
    var _url_template = _.template(url);

    //Get map info that will be added into the url if needed
    var mapExtent=map.getBounds();
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
        width:size.x,
        height:size.y,
        radius:2
    };

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
leaflet_helper.constructors.geojson = function(lyr, map, useLayerInstead) {

    function iconCallback(feature, latlng){
        var layerNum = leaflet_helper.constructors.geojson_layer_count % aoi_feature_edit.available_icons.length;
        var icon = new aoi_feature_edit.MapMarker({
            iconUrl: aoi_feature_edit.available_icons[layerNum],
            text: lyr.name
        });
        return L.marker(latlng, {icon: icon});
    }

    var outputLayer = useLayerInstead || new L.geoJson(undefined,{
        onEachFeature: leaflet_helper.parsers.standard_onEachFeature,
        pointToLayer: iconCallback
    });

    if (!useLayerInstead) leaflet_helper.constructors.geojson_layer_count++;

    var url = leaflet_helper.constructors.urlTemplater(lyr.url, map, lyr.layerParams);
    var proxiedURL = leaflet_helper.proxify(url);

    $.ajax({
        type: 'GET',
        url: proxiedURL,
        dataType: lyr.format || 'json',
        success: function(data){
            leaflet_helper.constructors.geojson_success(data, proxiedURL, map, outputLayer);
        },
        error: leaflet_helper.constructors.geojson_error
    });

    return outputLayer;
};
leaflet_helper.constructors.geojson_error = function (resultobj){
    log.error ("A JSON layer was requested, but no valid response was received from the server, result:", resultobj);
};
leaflet_helper.constructors.geojson_success = function (data, proxiedURL, map, outputLayer) {
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

    if (result && result.error && result.error.message){
        log.error("JSON layer error, message was: " + result.error.message + " url: "+ proxiedURL);
    } else {
        var parserInfo = leaflet_helper.constructors.identifyParser(result);
        if (parserInfo && parserInfo.parser) {
            parserInfo.parser(result, map, outputLayer);

            var features = "NONE";
            if (result && result.features && result.features.length) features = result.features.length;
            log.info("JSON layer was created from : "+ proxiedURL+ " - features:"+ features+ " - parser type: ", parserInfo.parserName);
        }
    }
    return outputLayer;
};


//====================================
leaflet_helper.parsers = {};
leaflet_helper.parsers.standard_onEachFeature = function (feature, layer) {
    if (feature.properties && feature.properties.popupContent) {
        layer.bindPopup(feature.properties.popupContent);
    }
};
leaflet_helper.parsers.addDynamicCapimageData = function (result, map, outputLayer) {
    //TODO: Handle de-dupes of all features returned

    var jsonObjects = [];
    $(result.features).each(function () {
        var feature = $(this)[0];
        var popupContent = "<a href='" + feature.attributes.ImageURL + "' target='_new'><img style='width:256px' src='" + feature.attributes.ThumbnailURL + "' /></a>";

        var json = {
            type: "Feature",
            properties: {
                name: feature.attributes.ID + " - " + feature.attributes.DaysOld + " days old",
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
    });
    outputLayer.addData(jsonObjects);
    if (result.features && result.features.length) {
        log.info("A FEMA CAP layer was updated adding "+ result.features.length+ " features");
    } else {
        log.info("A FEMA CAP request was returned, but no features were found");
    }

    return outputLayer;
};
leaflet_helper.parsers.instagramImages = function (result, map, outputLayer) {
    var jsonObjects = [];
    var photos = result.data;

    if (!outputLayer.options) { outputLayer.options = {}};
    if (!outputLayer.options.items) { outputLayer.options.items = []};

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
            //TODO: Add "Delete This" button

            var json = {
                type: "Feature",
                properties: {
                    name: title,
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
            //TODO: Add Delete this button

            var json = {
                type: "Feature",
                properties: {
                    name: title,
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