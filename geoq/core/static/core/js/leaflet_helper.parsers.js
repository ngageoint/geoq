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

    }
    //ADD new parser detectors here

    return {parser: parser, parserName:parserName};
};

leaflet_helper.constructors.geojson = function(options, proxiedURL) {
    var outputLayer;

    var resultobj = $.ajax({
        type: 'GET',
        url: proxiedURL,
        dataType: 'json',
        async: false
    });
    //TODO: Switch away from async to sync and run function on success.
    if (resultobj.status == 200) {
        var result;
        try {
            result = JSON.parse(resultobj.responseText);
        } catch (ex){
            log.error("Error parsing JSON returned from server");
        }
        if (result && result.error && result.error.message){
            log.error("JSON layer error, message was:", result.error.message, "url:", proxiedURL);
        } else {
            var parserInfo = leaflet_helper.constructors.identifyParser(result, options);
            if (parserInfo && parserInfo.parser) {
                outputLayer = parserInfo.parser(result, options);
                var features = "NONE";
                if (result && result.features && result.features.length) features = result.features.length;

                log.info("JSON layer was created from :", proxiedURL, "features:", result.features.length, "parser type:", parserInfo.parserName);

                if (outputLayer) {
                    outputLayer.name = options.name || (options.type+ " layer");
                }
            }
        }
    } else {
        log.error ("A JSON layer was requested, but no valid response was received from the server, result:", resultobj);
    }
    return outputLayer;
};


//====================================
leaflet_helper.parsers = {};
leaflet_helper.parsers.addDynamicCapimageData = function (result) {
    var jsonObjects = [];
    $(result.features).each(function () {
        var feature = $(this)[0];
        var json = {
            type: "Feature",
            properties: {
                name: feature.attributes.ID + " - " + feature.attributes.DaysOld + " days old",
                image: feature.attributes.ImageURL,
                thumbnail: feature.attributes.ThumbnailURL,
                popupContent: "<a href='" + feature.attributes.ImageURL + "'><img style='width:256px' src='" + feature.attributes.ThumbnailURL + "' /></a>"
            },
            geometry: {
                type: "Point",
                coordinates: [feature.geometry.x, feature.geometry.y]
            }
        };
        jsonObjects.push(json);
    });
    log.info("A FEMA CAP layer was loaded, with", result.features.length, "features");

    function onEachFeature(feature, layer) {
        // does this feature have a property named popupContent?
        if (feature.properties && feature.properties.popupContent) {
            layer.bindPopup(feature.properties.popupContent);
        }
    }

    return new L.geoJson(jsonObjects, {onEachFeature: onEachFeature});
};