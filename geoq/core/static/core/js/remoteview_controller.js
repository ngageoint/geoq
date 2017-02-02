var remoteview_controller = {};
remoteview_controller.$rvButton = undefined;
remoteview_controller.$map = undefined;
remoteview_controller.RVBaseUrl = "http://localhost:4000/cgi-bin/Extensions/GeoLinkConsole/evaljs.html";
remoteview_controller.connected = false;

remoteview_controller.ZoomLevels = [1564120,782060,391030,195510,97760,48880,24440,12220,6109,3054,1527,763,381,190,95,48,24,12,6,3];

remoteview_controller.init = function() {
    remoteview_controller.$map = $("#map");
};

remoteview_controller.addLayerControl = function(map) {
    remoteview_controller.$rvButton = $('<a id="rv_button" href="#" class="btn">RemoteView Off</a>');
    var rvButtonOptions = {
        'html': remoteview_controller.$rvButton,
        'onClick': remoteview_controller.toggle,  // callback function
        'hideText': false,  // bool
        position: 'bottomright',
        'maxWidth': 100,  // number
        'doToggle': true,  // bool
        'toggleStatus': false  // bool
    };
    var layerButton = new L.Control.Button(rvButtonOptions).addTo(map);
};

remoteview_controller.toggle = function(e) {
    remoteview_controller.connected = !remoteview_controller.connected;
    if (remoteview_controller.connected) {
        $('#rv_button').text("RemoteView On");
    } else {
        $('#rv_button').text("RemoteView Off");
    }
};

remoteview_controller.onLoad = function(url, layer) {
    var script = "var args = { \n" +
        "'FileName': '" + url + "', 'Layer': '" + layer + "','LoadElevation': false };\n" +
        "Viewer.OpenImage(args);\n";

    var re = /\((.*)\)/;

    var callback = function(jqXHR) {
        console.log("RV load command sent");
        // since we have a good load, connect pan and zoom events ...
        // TODO: Fix this so return is correct
        if (jqXHR.readyState === 0) {
            aoi_feature_edit.map.on('zoomend', function(e,t) {
                // figure out what the zoom level is, then go to same level in rv
                remoteview_controller.onZoom(aoi_feature_edit.map.getZoom());
            });
            aoi_feature_edit.map.on('moveend', function(e,t) {
                remoteview_controller.onPan(aoi_feature_edit.map.getCenter().toString().match(re)[1]);
            });

            remoteview_controller.onZoom(aoi_feature_edit.map.getZoom());
        }
    };

    remoteview_controller.sendToRV(script, callback);
};

remoteview_controller.onPan = function(center) {
    var script = "var geo = new GeoCoord('" + center + "');" +
        "var arg = { 'GeoCoordinate': geo }; " +
        "Viewer.GeoJump(arg);";

    var callback = function(jqXHR) {
        console.log("RV move complete");
    };

    remoteview_controller.sendToRV(script, callback);
};

remoteview_controller.onZoom = function(level) {
    var script = "Viewer.Zoom = 1/" + remoteview_controller.ZoomLevels[level] + ";";
    var callback = function(response) {
        console.log("RV zoom command sent");
    };

    remoteview_controller.sendToRV(script,callback);
};

remoteview_controller.sendToRV = function(script, callback) {
    $.ajax({
        type: "POST",
        url: remoteview_controller.RVBaseUrl,
        data: script,
        dataType: 'arraybuffer',
        contentType: "text/plain",
        complete: callback
    });

//    var xmlhttp = new XMLHttpRequest();
//    xmlhttp.onreadystatechange = function() {
//        if (xmlhttp.readyState == 4 && xmlhttp.status == 200) {
//            callback(xmlhttp.response);
//        }
//    };
//    xmlhttp.open("POST", remoteview_controller.RVBaseUrl, true);
//    xmlhttp.setRequestHeader("Content-Type", "text/plain");
//    xmlhttp.responseType = "arraybuffer";
//    xmlhttp.send(script)
};