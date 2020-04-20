
function initResponders() {

    var responderIcon = L.icon({
        iconUrl: '/static/leaflet/images/user.png',
    //    shadowUrl: 'leaf-shadow.png',

        iconSize:     [20, 20], // size of the icon
    //    shadowSize:   [50, 64], // size of the shadow
        iconAnchor:   [10, 10], // point of the icon which will correspond to marker's location
    //    shadowAnchor: [4, 62],  // the same for the shadow
        popupAnchor:  [-3, -76] // point from which the popup should open relative to the iconAnchor
    });
    encodeHTML = function(s) {
        if(s instanceof String)
            return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/"/g, '&quot;');
        return s;
    };

    realtime = L.realtime(
        function(success, error) {
            $.getJSON("/geoq/responders/geojson", function(data) {
                if(data.features) {
                    for(var i = 0; i<data.features.length; i++) {
                        // haaaax
                        for(var ci=0; ci<data.features[i].geometry.coordinates.length; ci++) {
                            data.features[i].geometry.coordinates[ci]  = Number(data.features[i].geometry.coordinates[ci]);
                        }
                    }

                }
                success(data);

            });
        },
        {
            interval: 60 * 1000,
            pointToLayer: function(geoJsonPoint, latlng) {
                props = geoJsonPoint.properties;
                var id = props.id;
                var marker =  L.marker(latlng, {icon: responderIcon});
                var fields = ["name", "contact_instructions", "in_field", "last_seen"];
                var ph = "<ul>";
                for(var i=0; i<fields.length; i++)
                    ph += "<li>" + fields[i] + ": " + encodeHTML(props[fields[i]]) +"</li>";
                ph += "</ul>";
                marker.bindPopup(ph);
                for(var i=0; i<fields.length; i++)
                    $("#" + fields[i] + id).text(props[fields[i]]);

                return marker;
            }
        }
    ).addTo(aoi_feature_edit.map);

 }

setTimeout(initResponders, 5000);