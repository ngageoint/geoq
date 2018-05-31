/**
 * Created by steve on 5/29/18.
 */

var ai_agent = {};
ai_agent.socket = null;
ai_agent.map = null;
ai_agent.enabled = false;
ai_agent.point_layer = null;
ai_agent.workcells = [];
ai_agent.base_url = null;

ai_agent.onclick = function(target) {
    if (ai_agent.enabled) {
        // turn off
        ai_agent.stop_ai_agent(target);
        target.innerText = 'Enable AI Agent';
    } else {
        // turn on
        ai_agent.start_ai_agent(target);
        // get list of workcells if we can
        if (aoi_extents) {
            var all_cells = aoi_extents.toGeoJSON().features;
            ai_agent.workcells = _.filter(all_cells, function(cell) { return cell.properties.status == "Monitoring"; })
        }
        target.innerText = 'Disable AI Agent';
    }

};

ai_agent.start_ai_agent = function(target) {
    var host = window.location.hostname;
    ai_agent.socket = new WebSocket("ws:/" + host + ":8888/job/");
    ai_agent.socket.onmessage = function(e) {
        o = JSON.parse(e.data);
        // do something with this
        if (map_object) {
            if (ai_agent.point_layer == null) {
                // create one
                ai_agent.point_layer = L.featureGroup();
                ai_agent.point_layer.addTo(map_object);
            }
            // add point to map
            o.forEach(function(point) {
                var p = L.latLng(point.location[1], point.location[0]);
                var c = L.circleMarker(p, {"radius":5, "color": "black"});
                c.bindPopup("<b>Text:</b> " + point.text);
                c.addTo(ai_agent.point_layer);

                // see if point is contained in one of the workcells
                var pt = turf.point(point.location);
                ai_agent.workcells.forEach(function(cell) {
                    var poly = turf.polygon(cell.geometry.coordinates[0]);
                    if (turf.booleanPointInPolygon(pt,poly)) {
                        ai_agent.changeStatus(cell.properties.id)
                    }
                })
            })
        }
    };

    ai_agent.socket.onopen = function() {
        ai_agent.enabled = true;
        ai_agent.sendMessage();
    };

    if (ai_agent.socket.readyState == WebSocket.OPEN) {
        ai_agent.socket.onopen();
    }
};

ai_agent.sendMessage = function() {
    setTimeout(function() {
        ai_agent.socket.send('get');
        ai_agent.sendMessage();
    }, 30000);
};

ai_agent.changeStatus = function(id) {
    $.ajax({
        type: "GET",
        url: ai_agent.base_url.replace('0',id),
        contentType: "application/json",
        success: function (data) {
            // successfully transitioned workcell. look for the workcell layer and change the style
            lyr = _.filter(aoi_extents.getLayers(), function(l) { return l.feature.properties.id == id; }).pop();
            if (lyr) {
                lyr.setStyle(status_colors[3].color);
            }

        },
        error: function(data) {
        }
    });
};

ai_agent.stop_ai_agent = function(target) {
    ai_agent.socket.close();
    ai_agent.enabled = false;
};