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
   http://github.com/john-kilgo/L.Marker.AutoResizeSVG */

// Include marker-resize-svg.js in your HTML document

// Path to SVG Icons from GEOHuntsville
// example: var path = "my/path/to/L.Marker.NWS/GEOHuntsville"

L.Marker.NWS = L.Class.extend({

	initialize: function (options) {
		L.setOptions(this, options);
	},

	// List of Icons:
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

	create : function (latlng, options, type, name) {
		return this._createMarker(latlng, options, type, name);
	},

	_createMarker : function (latlng, options, type, name) {

		this.icons.push( L.icon({
			iconUrl : this.options.path + '/' + this._icons[type][name],
			iconSizeArray : this.options.iconSizeArray
		}) )

		options.icon = this.icons[this.icons.length-1];
		options.iconSizeArray = this.options.iconSizeArray;

		return L.autoResizeMarkerSVG(latlng, options).addTo(this.options.map);

	},
	icons : [] /* Here for storing icons otherwise they seem to disappear */
})


L.marker.NWS = function (options) {
	return new L.Marker.NWS(options);
};
