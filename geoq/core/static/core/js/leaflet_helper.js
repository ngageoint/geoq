//converts leaflet layer to WKT
//requires Leaflet, Leaflet ArcGIS plugin,
leaflet_helper = {}

leaflet_helper.styles = {};
leaflet_helper.styles.extentStyle = {"weight":2,"color":"red","fill":null,"opacity":1};
leaflet_helper.styles.completed = {"weight":2,"color":"green","fillColor":"green","fillOpacity":.9,"opacity":1};
leaflet_helper.styles.in_work = {"weight":2,"color":"yellow","fillColor":"orange","fillOpacity":.9,"opacity":1};
leaflet_helper.styles.assigned = {"weight":2,"color":"orange","fillColor":"orange","fillOpacity":.9,"opacity":1};


leaflet_helper.layer_conversion = function(lyr){


    options = {
        layers: lyr.layer,
        format: lyr.format,
        transparent: lyr.transparent,
        attribution: lyr.attribution,
        subdomains: lyr.subdomains,
        opacity: lyr.opacity,
        zIndex: lyr.zIndex,
        visibile: lyr.shown
        }
    var layerParams = lyr.layerParams;

    console.log(layerParams);

    var esriPluginInstalled = L.hasOwnProperty('esri');

    if (!esriPluginInstalled){
        console.log('Esri Leaflet plugin not installed.  Esri layer types disabled.');
    }

    if (lyr.type=='WMS'){

        layerOptions = _.extend(options, layerParams);

        return new L.tileLayer.wms(lyr.url, layerOptions);
    }

    if (lyr.type=='ESRI Tiled Map Service' && esriPluginInstalled){

        layerOptions = options;

        return new L.esri.tiledMapLayer(lyr.url, layerOptions);
    }

    if (lyr.type=='ESRI Dynamic Map Layer' && esriPluginInstalled){

        layerOptions = options;

        return new L.esri.dynamicMapLayer(lyr.url, layerOptions);
    }

    if (lyr.type=='ESRI Feature Layer' && esriPluginInstalled){

        layerOptions = options;

        return new L.esri.featureLayer(lyr.url, layerOptions);
    }

    if (lyr.type=='ESRI Clustered Feature Layer' && esriPluginInstalled){

        layerOptions = _.extend(options, layerParams);
        if (layerOptions.createMarker){
            layerOptions.createMarker = leaflet_helper.createMarker[layerOptions.createMarker];
        }

        return new L.esri.clusteredFeatureLayer(lyr.url, layerOptions);
    }

    if (lyr.type=='GeoJSON'){
        layerOptions = options;

        function addGeojson(e){
            alert('here');
            return new L.GeoJSON(e, layerOptions);
        }

        $.ajax({
            type: 'GET',
            url: lyr.url,
            dataType: 'json',
            success: function(result){
                addGeojson(result);
            }

        })

    }

}

leaflet_helper.createMarker = {
    esriImageMapService: function(geojson, latlng) {
        return new L.marker(latlng, {
            title: geojson.properties.Title || geojson.properties.ProjectName,
            alt: geojson.properties.Description
        }).bindPopup(
                "<a href='" + geojson.properties.ImageURL + "' target='geoqwindow'><img style='width:256px' src='" + geojson.properties.ThumbnailURL + "' /></a>"
            );
    }
}

//TODO: Add MULTIPOLYGON support and commit back to https://gist.github.com/bmcbride/4248238
leaflet_helper.toWKT = function(layer) {
    var lng, lat, coords = [];
    if (layer instanceof L.Polygon || layer instanceof L.Polyline) {
        var latlngs = layer.getLatLngs();
        for (var i = 0; i < latlngs.length; i++) {
	    	latlngs[i]
	    	coords.push(latlngs[i].lng + " " + latlngs[i].lat);
	        if (i === 0) {
	        	lng = latlngs[i].lng;
	        	lat = latlngs[i].lat;
	        }
	};
        if (layer instanceof L.Polygon) {
            return "POLYGON((" + coords.join(",") + "," + lng + " " + lat + "))";
        } else if (layer instanceof L.Polyline) {
            return "LINESTRING(" + coords.join(",") + ")";
        }
    } else if (layer instanceof L.Marker) {
        return "POINT(" + layer.getLatLng().lng + " " + layer.getLatLng().lat + ")";
    }
}


