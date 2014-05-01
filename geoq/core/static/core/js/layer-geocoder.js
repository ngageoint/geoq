var layer_geocoder = {};
layer_geocoder.searchPhrase = "Search Google", layer_geocoder.map = null, layer_geocoder.lookupBoxID = "#address_lookup_box", layer_geocoder.$lookupBox = null, layer_geocoder.lookupButtonID = "#address_lookup_submit", layer_geocoder.$lookupButton = null, typeof String.prototype.trim != "function" && (String.prototype.trim = function () {
    return this.replace(/^\s+|\s+$/g, "")
}), layer_geocoder.lookup_server = "http://maps.googleapis.com/maps/api/geocode/json?sensor=false&address=", layer_geocoder.setupMap = function () {
    if (layer_geocoder.map)return;
    typeof GeoQ_map != "undefined" && (layer_geocoder.map = GeoQ_map), typeof map != "undefined" && map.zoomToExtent && (layer_geocoder.map = map), typeof incident_support != "undefined" && incident_support.map && incident_support.map.zoomToExtent && (layer_geocoder.map = incident_support.map)
}, layer_geocoder.submitAddressLookup = function (e) {
    layer_geocoder.$lookupButton.text("Searching...");
    if (e && e.length && e.indexOf(",") > -1) {
        var t = e.split(",");
        if (t.length && t.length == 2) {
            var n = parseFloat(t[0]), r = parseFloat(t[1]);
            if (_.isNumber(n) && _.isNumber(r) && !isNaN(n) && !isNaN(r)) {
                var i = new OpenLayers.LonLat(r, n);
                layer_geocoder.setupMap(), layer_geocoder.map.setCenter(i, 10);
                return
            }
        }
    }
    if (layer_geocoder.lookup_server) {
        layer_geocoder.$lookupBox.css({backgroundColor: "lightblue"});
        var s = layer_geocoder.lookup_server + encodeURIComponent(e);
        s = event_pages.proxify(s), $.get(s + "&callback=?",function (e) {
            layer_geocoder.requestGoogleGeoCodeSuccess(e)
        }).fail(function (e) {
            layer_geocoder.LocLookupFailure(e)
        }).always(function () {
            console.log("Geocode lookup complete - " + s)
        })
    }
}, layer_geocoder.requestGoogleGeoCodeSuccess = function (e) {
    try {
        _.isString(e) && (e = JSON.parse(e)), layer_geocoder.$lookupButton.text("Response received.");
        var t = e.results[0], n = t.latitude, r = t.longitude;
        (!n || !r) && t && t.geometry && t.geometry.location && (n = t.geometry.location.lat || t.geometry.location.latitude, r = t.geometry.location.lng || t.geometry.location.lon || t.geometry.location.longitude);
        var i = t.formatted_address, s = t.bounds || (t.geometry ? t.geometry.bounds : !1), o = .025;
        s || (s = {northeast: {lat: n + o, lng: r + o}, southwest: {lat: n - o, lng: r - o}}), layer_geocoder.addRect(s, i), s && s.southwest && s.southwest.lat && (layer_geocoder.setupMap(), layer_geocoder.map.zoomToExtent([s.southwest.lng, s.southwest.lat, s.northeast.lng, s.northeast.lat], !1)), layer_geocoder.$lookupBox.css({backgroundColor: "lightgreen"})
    } catch (u) {
        layer_geocoder.LocLookupFailure("Problem Parsing Result")
    }
}, layer_geocoder.addRect = function (e, t) {
    var n = e.northeast.lat, r = e.northeast.lng, i = e.southwest.lat, s = e.southwest.lng, o = {strokeColor: "#00FF00", strokeOpacity: .5, strokeWidth: 3, fillColor: "#00FF00", fillOpacity: 0}, u = new OpenLayers.Geometry.Point(r, n), a = new OpenLayers.Geometry.Point(r, i), f = new OpenLayers.Geometry.Point(s, i), l = new OpenLayers.Geometry.Point(s, n), c = new OpenLayers.Geometry.Point(r, n), h = [];
    h.push(u, a, f, l, c);
    var p = new OpenLayers.Geometry.LinearRing(h), d = new OpenLayers.Feature.Vector(p, null, o), v = new OpenLayers.Layer.Vector(t);
    v.addFeatures([d]), layer_geocoder.setupMap(), layer_geocoder.map.addLayer(v)
}, layer_geocoder.LocLookupFailure = function (e) {
    e = e || "Lookup failed", _.isString(e) || (e.statusText ? e = e.statusText : e = "Error"), layer_geocoder.$lookupButton.text(e), layer_geocoder.$lookupBox.text(e).css({backgroundColor: "lightred"})
}, layer_geocoder.setupAddressLookup = function () {
    typeof _ != "undefined" && _.throttle && (layer_geocoder.submitAddressLookup = _.throttle(layer_geocoder.submitAddressLookup, 500)), typeof settings != "undefined" && settings.serverurl_google_geocode && (layer_geocoder.lookup_server = settings.serverurl_google_geocode), layer_geocoder.$lookupBox = $(layer_geocoder.lookupBoxID), layer_geocoder.$lookupButton = $(layer_geocoder.lookupButtonID);
    if (!layer_geocoder.$lookupBox || !layer_geocoder.$lookupButton) {
        console.log("No lookupbox found, not showing geocoder");
        return
    }
    var e = function (e) {
        var t = layer_geocoder.searchPhrase;
        if (!e || e.trim == "")t = "Enter Location"; else {
            var n = e.match(/^([-+]?\d{1,2}([.]\d+)?),\s*([-+]?\d{1,3}([.]\d+)?)$/);
            n ? t = "Go to this Lat/Lng" : e.trim() == "" && (t = "Enter Location")
        }
        layer_geocoder.$lookupButton.text(t)
    };
    layer_geocoder.lookup_server ? (layer_geocoder.$lookupBox.keyup(function (t) {
        var n = layer_geocoder.$lookupBox.val();
        e(n)
    }).keypress(function (t) {
        var n = layer_geocoder.$lookupBox.val();
        t.which == 13 && layer_geocoder.submitAddressLookup(n), e(n)
    }).on("click",function () {
        this.select(), layer_geocoder.$lookupBox.css({backgroundColor: "white"})
    }).css({height: "14px", fontSize: "12px"}).popover({title: "Search for location", content: "Enter lat,lng or a placename to search for it", trigger: "hover", placement: "right"}), $(layer_geocoder.lookupButtonID).on("click mousedown",function () {
        var e = layer_geocoder.$lookupBox.val();
        layer_geocoder.submitAddressLookup(e)
    }).popover({title: "Search for location", content: "Enter lat,lng or a placename to search for it", trigger: "hover", placement: "top"})) : (layer_geocoder.$lookupButton.hide(), layer_geocoder.$lookupBox.hide())
};