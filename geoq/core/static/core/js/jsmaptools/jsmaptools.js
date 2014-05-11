// JS MapTools is a set of JavaScript libraries and functions to facilitate use of Geospatial applications within web pages
// Developed by Jay Crossler
//
// MIT License
//
// If gju (geojson-utils.js) and (jsmaptools_polygons.js) is loaded, will provide additional information on states and countries based on shape outlines

;
(function (global) {
    "use strict";

    // Caveat: Does NOT handle above 84N, below 80S

    var _m = {
        VERSION: '0.0.4',
        summary: 'Useful mapping functions for Lat/Lon to USNG/MGRS conversion and state/country details'
    };

    //From https://github.com/umpirsky/country-list/blob/master/country/cldr/en/country.json
    _m.COUNTRY_CODES = {"AD": "Andorra", "AE": "United Arab Emirates", "AF": "Afghanistan", "AG": "Antigua and Barbuda", "AI": "Anguilla", "AL": "Albania", "AM": "Armenia", "AN": "Netherlands Antilles", "AO": "Angola", "AQ": "Antarctica", "AR": "Argentina", "AS": "American Samoa", "AT": "Austria", "AU": "Australia", "AW": "Aruba", "AX": "\u00c5land Islands", "AZ": "Azerbaijan", "BA": "Bosnia and Herzegovina", "BB": "Barbados", "BD": "Bangladesh", "BE": "Belgium", "BF": "Burkina Faso", "BG": "Bulgaria", "BH": "Bahrain", "BI": "Burundi", "BJ": "Benin", "BL": "Saint Barth\u00e9lemy", "BM": "Bermuda", "BN": "Brunei", "BO": "Bolivia", "BQ": "British Antarctic Territory", "BR": "Brazil", "BS": "Bahamas", "BT": "Bhutan", "BV": "Bouvet Island", "BW": "Botswana", "BY": "Belarus", "BZ": "Belize", "CA": "Canada", "CC": "Cocos [Keeling] Islands", "CD": "Congo - Kinshasa", "CF": "Central African Republic", "CG": "Congo - Brazzaville", "CH": "Switzerland", "CI": "C\u00f4te d\u2019Ivoire", "CK": "Cook Islands", "CL": "Chile", "CM": "Cameroon", "CN": "China", "CO": "Colombia", "CR": "Costa Rica", "CS": "Serbia and Montenegro", "CT": "Canton and Enderbury Islands", "CU": "Cuba", "CV": "Cape Verde", "CX": "Christmas Island", "CY": "Cyprus", "CZ": "Czech Republic", "DD": "East Germany", "DE": "Germany", "DJ": "Djibouti", "DK": "Denmark", "DM": "Dominica", "DO": "Dominican Republic", "DZ": "Algeria", "EC": "Ecuador", "EE": "Estonia", "EG": "Egypt", "EH": "Western Sahara", "ER": "Eritrea", "ES": "Spain", "ET": "Ethiopia", "FI": "Finland", "FJ": "Fiji", "FK": "Falkland Islands", "FM": "Micronesia", "FO": "Faroe Islands", "FQ": "French Southern and Antarctic Territories", "FR": "France", "FX": "Metropolitan France", "GA": "Gabon", "GB": "United Kingdom", "GD": "Grenada", "GE": "Georgia", "GF": "French Guiana", "GG": "Guernsey", "GH": "Ghana", "GI": "Gibraltar", "GL": "Greenland", "GM": "Gambia", "GN": "Guinea", "GP": "Guadeloupe", "GQ": "Equatorial Guinea", "GR": "Greece", "GS": "South Georgia and the South Sandwich Islands", "GT": "Guatemala", "GU": "Guam", "GW": "Guinea-Bissau", "GY": "Guyana", "HK": "Hong Kong SAR China", "HM": "Heard Island and McDonald Islands", "HN": "Honduras", "HR": "Croatia", "HT": "Haiti", "HU": "Hungary", "ID": "Indonesia", "IE": "Ireland", "IL": "Israel", "IM": "Isle of Man", "IN": "India", "IO": "British Indian Ocean Territory", "IQ": "Iraq", "IR": "Iran", "IS": "Iceland", "IT": "Italy", "JE": "Jersey", "JM": "Jamaica", "JO": "Jordan", "JP": "Japan", "JT": "Johnston Island", "KE": "Kenya", "KG": "Kyrgyzstan", "KH": "Cambodia", "KI": "Kiribati", "KM": "Comoros", "KN": "Saint Kitts and Nevis", "KP": "North Korea", "KR": "South Korea", "KW": "Kuwait", "KY": "Cayman Islands", "KZ": "Kazakhstan", "LA": "Laos", "LB": "Lebanon", "LC": "Saint Lucia", "LI": "Liechtenstein", "LK": "Sri Lanka", "LR": "Liberia", "LS": "Lesotho", "LT": "Lithuania", "LU": "Luxembourg", "LV": "Latvia", "LY": "Libya", "MA": "Morocco", "MC": "Monaco", "MD": "Moldova", "ME": "Montenegro", "MF": "Saint Martin", "MG": "Madagascar", "MH": "Marshall Islands", "MI": "Midway Islands", "MK": "Macedonia", "ML": "Mali", "MM": "Myanmar [Burma]", "MN": "Mongolia", "MO": "Macau SAR China", "MP": "Northern Mariana Islands", "MQ": "Martinique", "MR": "Mauritania", "MS": "Montserrat", "MT": "Malta", "MU": "Mauritius", "MV": "Maldives", "MW": "Malawi", "MX": "Mexico", "MY": "Malaysia", "MZ": "Mozambique", "NA": "Namibia", "NC": "New Caledonia", "NE": "Niger", "NF": "Norfolk Island", "NG": "Nigeria", "NI": "Nicaragua", "NL": "Netherlands", "NO": "Norway", "NP": "Nepal", "NQ": "Dronning Maud Land", "NR": "Nauru", "NT": "Neutral Zone", "NU": "Niue", "NZ": "New Zealand", "OM": "Oman", "PA": "Panama", "PC": "Pacific Islands Trust Territory", "PE": "Peru", "PF": "French Polynesia", "PG": "Papua New Guinea", "PH": "Philippines", "PK": "Pakistan", "PL": "Poland", "PM": "Saint Pierre and Miquelon", "PN": "Pitcairn Islands", "PR": "Puerto Rico", "PS": "Palestinian Territories", "PT": "Portugal", "PU": "U.S. Miscellaneous Pacific Islands", "PW": "Palau", "PY": "Paraguay", "PZ": "Panama Canal Zone", "QA": "Qatar", "RE": "R\u00e9union", "RO": "Romania", "RS": "Serbia", "RU": "Russia", "RW": "Rwanda", "SA": "Saudi Arabia", "SB": "Solomon Islands", "SC": "Seychelles", "SD": "Sudan", "SE": "Sweden", "SG": "Singapore", "SH": "Saint Helena", "SI": "Slovenia", "SJ": "Svalbard and Jan Mayen", "SK": "Slovakia", "SL": "Sierra Leone", "SM": "San Marino", "SN": "Senegal", "SO": "Somalia", "SR": "Suriname", "ST": "S\u00e3o Tom\u00e9 and Pr\u00edncipe", "SU": "Union of Soviet Socialist Republics", "SV": "El Salvador", "SY": "Syria", "SZ": "Swaziland", "TC": "Turks and Caicos Islands", "TD": "Chad", "TF": "French Southern Territories", "TG": "Togo", "TH": "Thailand", "TJ": "Tajikistan", "TK": "Tokelau", "TL": "Timor-Leste", "TM": "Turkmenistan", "TN": "Tunisia", "TO": "Tonga", "TR": "Turkey", "TT": "Trinidad and Tobago", "TV": "Tuvalu", "TW": "Taiwan", "TZ": "Tanzania", "UA": "Ukraine", "UG": "Uganda", "UM": "U.S. Minor Outlying Islands", "US": "United States", "UY": "Uruguay", "UZ": "Uzbekistan", "VA": "Vatican City", "VC": "Saint Vincent and the Grenadines", "VD": "North Vietnam", "VE": "Venezuela", "VG": "British Virgin Islands", "VI": "U.S. Virgin Islands", "VN": "Vietnam", "VU": "Vanuatu", "WF": "Wallis and Futuna", "WK": "Wake Island", "WS": "Samoa", "YD": "People's Democratic Republic of Yemen", "YE": "Yemen", "YT": "Mayotte", "ZA": "South Africa", "ZM": "Zambia", "ZW": "Zimbabwe", "ZZ": "Unknown or Invalid Region"};

    var getLatLon = function (lat, lon) {
        /* Convenience internal function to allow everything to accept various lat, lon formats
         */
        if (typeof lon == 'undefined' && lat && lat.lat) {
            lon = lat.lon || lat.long || lat.lng || lat.longitude;
            lat = lat.lat || lat.latitude;
        }
        return { lat: lat, lon: lon};
    };

    _m.inUSBounds = function (lat, lon) {
        var newLat = getLatLon(lat, lon).lat;
        lon = getLatLon(lat, lon).lon;
        lat = newLat;

        var is_in_us = false;

        //If gju and country_detailed_polygons libraries are loaded, do a detailed country lookup
        if (typeof gju!="undefined" && gju.pointInPolygon && _m.COUNTRY_DATA && _m.COUNTRY_US_NUMBER) {
            var us_data = _m.COUNTRY_DATA[_m.COUNTRY_US_NUMBER];
            var point_object = {"type":"Point","coordinates":[lon,lat]};
            is_in_us = gju.pointInPolygon(point_object,us_data);

        } else {
            //Other libraries not loaded, so use a simple rectangle lookup
            var top = 49.3457868;
            var left = -124.7844079;
            var right = -66.9513812;
            var bottom = 24.7433195;
            is_in_us = (bottom <= lat && lat <= top && left <= lon && lon <= right);
        }

        return is_in_us;
    };

    _m.correctDegree = function(m) {
        return ((((180+m) % 360) + 360) % 360)-180;
    };

    _m.inWorldBounds = function (lat, lon) {
        var newLat = getLatLon(lat, lon).lat;
        lon = getLatLon(lat, lon).lon;
        lat = newLat;
        var top = 90;
        var left = -180;
        var right = 180;
        var bottom = -90;

        return (bottom <= lat && lat <= top && left <= lon && lon <= right);
    };


// FROM MGRS Functions within https://github.com/beatgammit/node-coordinator
    var CONSTANTS = {
        DEG_2_RAD: Math.PI / 180,
        RAD_2_DEG: 180.0 / Math.PI,
        EQUATORIAL_RADIUS: 6378137.0,
        ECC_SQUARED: 0.006694380023,
        IS_NAD83_DATUM: true,
        EASTING_OFFSET: 500000.0,
        NORTHING_OFFSET: 10000000.0,
        GRIDSQUARE_SET_COL_SIZE: 8,  // column width of grid square set
        GRIDSQUARE_SET_ROW_SIZE: 20, // row height of grid square set
        BLOCK_SIZE: 100000, // size of square identifier (within grid zone designation),
        ECC_PRIME_SQUARED: 0.006694380023 / (1 - 0.006694380023),
        E1: (1 - Math.sqrt(1 - 0.006694380023)) / (1 + Math.sqrt(1 - 0.006694380023)),
        k0: 0.9996 // scale factor of central meridian
    };
    // check for NAD83
    if (typeof IS_NAD83_DATUM != "undefined" && IS_NAD83_DATUM) {
        CONSTANTS.EQUATORIAL_RADIUS = 6378137.0; // GRS80 ellipsoid (meters)
        CONSTANTS.ECC_SQUARED = 0.006694380023;
    } else {
        // else NAD27 datum is assumed
        CONSTANTS.EQUATORIAL_RADIUS = 6378206.4; // Clarke 1866 ellipsoid (meters)
        CONSTANTS.ECC_SQUARED = 0.006768658;
    }

    _m.getZoneNumber = function (lat, lon) {
        /*
         * Retrieves zone number from latitude and longitude.
         *
         * Zone numbers range from 1 - 60 over the range [-180 to +180]. Each
         * range is 6 degrees wide. Special cases for points outside normal
         * [-80 to +84] latitude zone.
         */
        var zoneNumber;

        lat = parseFloat(lat);
        lon = parseFloat(lon);

        // sanity check on input, remove for production
        if (lon > 360 || lon < -180 || lat > 90 || lat < -90) {
            throw "Bad input. lat: " + lat + " lon: " + lon;
        }

        zoneNumber = parseInt((lon + 180) / 6, 10) + 1;

        // Handle special case of west coast of Norway
        if (lat >= 56.0 && lat < 64.0 && lon >= 3.0 && lon < 12.0) {
            zoneNumber = 32;
        }

        // Special zones for Svalbard
        if (lat >= 72.0 && lat < 84.0) {
            if (lon >= 0.0 && lon < 9.0) {
                zoneNumber = 31;
            } else if (lon >= 9.0 && lon < 21.0) {
                zoneNumber = 33;
            } else if (lon >= 21.0 && lon < 33.0) {
                zoneNumber = 35;
            } else if (lon >= 33.0 && lon < 42.0) {
                zoneNumber = 37;
            }
        }

        return zoneNumber;
    };
    _m.utmLetterDesignator = function (lat) {
        /*
         * Retrieves grid zone designator letter.
         *
         * This routine determines the correct UTM letter designator for the given
         * latitude returns 'Z' if latitude is outside the UTM limits of 84N to 80S
         *
         * Returns letter designator for a given latitude.
         * Letters range from C (-80 lat) to X (+84 lat), with each zone spanning
         * 8 degrees of latitude.
         */

        var letterDesignator;

        lat = parseFloat(lat);

        if ((84 >= lat) && (lat >= 72)) {
            letterDesignator = 'X';
        } else if ((72 > lat) && (lat >= 64)) {
            letterDesignator = 'W';
        } else if ((64 > lat) && (lat >= 56)) {
            letterDesignator = 'V';
        } else if ((56 > lat) && (lat >= 48)) {
            letterDesignator = 'U';
        } else if ((48 > lat) && (lat >= 40)) {
            letterDesignator = 'T';
        } else if ((40 > lat) && (lat >= 32)) {
            letterDesignator = 'S';
        } else if ((32 > lat) && (lat >= 24)) {
            letterDesignator = 'R';
        } else if ((24 > lat) && (lat >= 16)) {
            letterDesignator = 'Q';
        } else if ((16 > lat) && (lat >= 8)) {
            letterDesignator = 'P';
        } else if (( 8 > lat) && (lat >= 0)) {
            letterDesignator = 'N';
        } else if (( 0 > lat) && (lat >= -8)) {
            letterDesignator = 'M';
        } else if ((-8 > lat) && (lat >= -16)) {
            letterDesignator = 'L';
        } else if ((-16 > lat) && (lat >= -24)) {
            letterDesignator = 'K';
        } else if ((-24 > lat) && (lat >= -32)) {
            letterDesignator = 'J';
        } else if ((-32 > lat) && (lat >= -40)) {
            letterDesignator = 'H';
        } else if ((-40 > lat) && (lat >= -48)) {
            letterDesignator = 'G';
        } else if ((-48 > lat) && (lat >= -56)) {
            letterDesignator = 'F';
        } else if ((-56 > lat) && (lat >= -64)) {
            letterDesignator = 'E';
        } else if ((-64 > lat) && (lat >= -72)) {
            letterDesignator = 'D';
        } else if ((-72 > lat) && (lat >= -80)) {
            letterDesignator = 'C';
        } else {
            letterDesignator = 'Z'; // This is here as an error flag to show
            // that the latitude is outside the UTM limits
        }

        return letterDesignator;
    };
    _m.latLongToUtm = function (lat, lon, zone) {
        var zoneNumber,
            latRad,
            lonRad,
            lonOrigin,
            lonOriginRad,
            utmEasting,
            utmNorthing,
            N,
            T,
            C,
            A,
            M,
            utmcoords = {};

        lat = parseFloat(lat);
        lon = parseFloat(lon);

        lon = _m.correctDegree(lon);

        // Constrain reporting USNG coords to the latitude range [80S .. 84N]
        if (lat > 84.0 || lat < -80.0) {
            return "undefined";
        }

        // sanity check on input - remove for production
        // Make sure the longitude is between -180.00 .. 179.99..
        if (lon > 180 || lon < -180 || lat > 90 || lat < -90) {
            throw "Bad input. lat: " + lat + " lon: " + lon;
        }

        // convert lat/lon to radians
        latRad = lat * CONSTANTS.DEG_2_RAD;
        lonRad = lon * CONSTANTS.DEG_2_RAD;

        // User-supplied zone number will force coordinates to be computed in a particular zone
        zoneNumber = zone || _m.getZoneNumber(lat, lon);

        // +3 puts origin in middle of zone
        //TODO: Will this work for ALL zones (including those around Norway/Svalbard,
        // I'd think that the offset/width might be different)...
        lonOrigin = (zoneNumber - 1) * 6 - 180 + 3;
        lonOriginRad = lonOrigin * CONSTANTS.DEG_2_RAD;

        N = CONSTANTS.EQUATORIAL_RADIUS / Math.sqrt(1 - CONSTANTS.ECC_SQUARED * Math.pow(Math.sin(latRad), 2));
        T = Math.pow(Math.tan(latRad), 2);
        C = CONSTANTS.ECC_PRIME_SQUARED * Math.pow(Math.cos(latRad), 2);
        A = Math.cos(latRad) * (lonRad - lonOriginRad);

        // Note that the term Mo drops out of the "M" equation, because phi
        // (latitude crossing the central meridian, lambda0, at the origin of the
        //  x,y coordinates), is equal to zero for UTM.
        M = CONSTANTS.EQUATORIAL_RADIUS * (
            (1 - CONSTANTS.ECC_SQUARED / 4 - 3 * (CONSTANTS.ECC_SQUARED * CONSTANTS.ECC_SQUARED) / 64 - 5 * (CONSTANTS.ECC_SQUARED * CONSTANTS.ECC_SQUARED * CONSTANTS.ECC_SQUARED) / 256) * latRad -
                (3 * CONSTANTS.ECC_SQUARED / 8 + 3 * CONSTANTS.ECC_SQUARED * CONSTANTS.ECC_SQUARED / 32 + 45 * CONSTANTS.ECC_SQUARED * CONSTANTS.ECC_SQUARED * CONSTANTS.ECC_SQUARED / 1024) * Math.sin(2 * latRad) +
                (15 * CONSTANTS.ECC_SQUARED * CONSTANTS.ECC_SQUARED / 256 + 45 * CONSTANTS.ECC_SQUARED * CONSTANTS.ECC_SQUARED * CONSTANTS.ECC_SQUARED / 1024) * Math.sin(4 * latRad) -
                (35 * CONSTANTS.ECC_SQUARED * CONSTANTS.ECC_SQUARED * CONSTANTS.ECC_SQUARED / 3072) * Math.sin(6 * latRad));

        utmEasting = (CONSTANTS.k0 * N *
            (A + (1 - T + C) * (A * A * A) / 6 + (5 - 18 * T + T * T + 72 * C - 58 * CONSTANTS.ECC_PRIME_SQUARED ) * (A * A * A * A * A) / 120) + CONSTANTS.EASTING_OFFSET);

        utmNorthing = (CONSTANTS.k0 * ( M + N * Math.tan(latRad) * (
            (A * A) / 2 + (5 - T + 9 * C + 4 * C * C ) * (A * A * A * A) / 2 +
                (61 - 58 * T + T * T + 600 * C - 330 * CONSTANTS.ECC_PRIME_SQUARED ) *
                    (A * A * A * A * A * A) / 720)
            ) );

        if (utmNorthing < 0) {
            utmNorthing += 10000000;
        }

        utmcoords.easting = Math.round(utmEasting);
        utmcoords.northing = Math.round(utmNorthing);
        utmcoords.zoneNumber = zoneNumber;
        utmcoords.zoneLetter = _m.utmLetterDesignator(lat);
        utmcoords.hemisphere = lat < 0 ? 'S' : 'N';

        return utmcoords;
    };
    _m.utmToLatLong = function(easting, northing, zone, hemisphere) {
        //Convert UTM Coordinates to Lat Long
        //Taken from http://www.uwgb.edu/dutchs/usefuldata/ConvertUTMNoOZ.HTM

        var DatumEqRad = [6378137.0,6378137.0,6378137.0,6378135.0,6378160.0,6378245.0,6378206.4,
            6378388.0,6378388.0,6378249.1,6378206.4,6377563.4,6377397.2,6377276.3];
        var DatumFlat = [298.2572236, 298.2572236, 298.2572215,	298.2597208, 298.2497323, 298.2997381, 294.9786982,
            296.9993621, 296.9993621, 293.4660167, 294.9786982, 299.3247788, 299.1527052, 300.8021499];
        var Item = 0;//Default
        var k0 = 0.9996;//scale on central meridian
        var a = DatumEqRad[Item];//equatorial radius, meters.
        var f = 1/DatumFlat[Item];//polar flattening.
        var b = a*(1-f);//polar axis.
        var e = Math.sqrt(1 - b*b/a*a);//eccentricity
        var drad = Math.PI/180;//Convert degrees to radians)
        var latd = 0;//latitude in degrees
        var phi = 0;//latitude (north +, south -), but uses phi in reference
        var e0 = e/Math.sqrt(1 - e*e);//e prime in reference
        var N = a/Math.sqrt(1-Math.pow(e*Math.sin(phi)),2);
        var T = Math.pow(Math.tan(phi),2);
        var C = Math.pow(e*Math.cos(phi),2);
        var lng = 0;//Longitude (e = +, w = -) - can't use long - reserved word
        var lng0 = 0;//longitude of central meridian
        var lngd = 0;//longitude in degrees
        var M = 0;//M requires calculation
        var x = easting;//x coordinate
        var y = northing;//y coordinate
        var k = 1;//local scale
        var utmz = zone;//utm zone
        var zcm = 0;//zone central meridian
        var DigraphLetrsE = "ABCDEFGHJKLMNPQRSTUVWXYZ";
        var DigraphLetrsN = "ABCDEFGHJKLMNPQRSTUV";
        var OOZok = false;

        k0 = 0.9996;//scale on central meridian
        b = a*(1-f);//polar axis.
        e = Math.sqrt(1 - (b/a)*(b/a));//eccentricity
        e0 = e/Math.sqrt(1 - e*e);//Called e prime in reference
        var esq = (1 - (b/a)*(b/a));//e squared for use in expansions
        var e0sq = e*e/(1-e*e);// e0 squared - always even powers
        if (x<160000 || x>840000){
            console.log("Outside permissible range of easting values \n Results may be unreliable \n Use with caution");
        }
        if (y<0){
            console.log("Negative values not allowed \n Results may be unreliable \n Use with caution");
        }
        if (y>10000000){
            console.log("Northing may not exceed 10,000,000 \n Results may be unreliable \n Use with caution");
        }
        zcm = 3 + 6*(utmz-1) - 180;//Central meridian of zone
        var e1 = (1 - Math.sqrt(1 - e*e))/(1 + Math.sqrt(1 - e*e));//Called e1 in USGS PP 1395 also
        var M0 = 0;//In case origin other than zero lat - not needed for standard UTM
        var M = M0 + y/k0;//Arc length along standard meridian.
        if (hemisphere=="S"){
            M=M0+(y-10000000)/k;
        }
        var mu = M/(a*(1 - esq*(1/4 + esq*(3/64 + 5*esq/256))));
        var phi1 = mu + e1*(3/2 - 27*e1*e1/32)*Math.sin(2*mu) + e1*e1*(21/16 -55*e1*e1/32)*Math.sin(4*mu);//Footprint Latitude
        phi1 = phi1 + e1*e1*e1*(Math.sin(6*mu)*151/96 + e1*Math.sin(8*mu)*1097/512);
        var C1 = e0sq*Math.pow(Math.cos(phi1),2);
        var T1 = Math.pow(Math.tan(phi1),2);
        var N1 = a/Math.sqrt(1-Math.pow(e*Math.sin(phi1),2));
        var R1 = N1*(1-e*e)/(1-Math.pow(e*Math.sin(phi1),2));
        var D = (x-500000)/(N1*k0);
        phi = (D*D)*(1/2 - D*D*(5 + 3*T1 + 10*C1 - 4*C1*C1 - 9*e0sq)/24);
        phi = phi + Math.pow(D,6)*(61 + 90*T1 + 298*C1 + 45*T1*T1 -252*e0sq - 3*C1*C1)/720;
        phi = phi1 - (N1*Math.tan(phi1)/R1)*phi;

        lng = D*(1 + D*D*((-1 -2*T1 -C1)/6 + D*D*(5 - 2*C1 + 28*T1 - 3*C1*C1 +8*e0sq + 24*T1*T1)/120))/Math.cos(phi1);
        lngd = zcm+lng/drad;

        var latitude = Math.floor(1000000*phi/drad)/1000000;
        var longitude = Math.floor(1000000*lngd)/1000000;

        return {lat: latitude, lon: longitude};
	};

    _m.latLongToUsng = function (lat, lon, precision, precisionOfMouseOver) {
        var FOURTHPI    = Math.PI / 4;
        var DEG_2_RAD   = Math.PI / 180;
        var RAD_2_DEG   = 180.0 / Math.PI;
        var BLOCK_SIZE  = 100000; // size of square identifier (within grid zone designation) (meters)
        var k0 = 0.9996;

        var EQUATORIAL_RADIUS;
        var ECCENTRICTY_SQUARED;
        var ECC_SQUARED;
        var IS_NAD83_DATUM = true;  // if false, assumes NAD27 datum

        // check for NAD83
        if (IS_NAD83_DATUM) {
          EQUATORIAL_RADIUS = 6378137.0; // GRS80 ellipsoid (meters)
          ECC_SQUARED = 0.006694380023;
        }
        // else NAD27 datum is assumed
        else {
          EQUATORIAL_RADIUS = 6378206.4;  // Clarke 1866 ellipsoid (meters)
          ECC_SQUARED = 0.006768658;
        }
        var ECC_PRIME_SQUARED = ECC_SQUARED / (1 - ECC_SQUARED);

        // For diagram of zone sets, please see the "United States National Grid" white paper.
        var GRIDSQUARE_SET_COL_SIZE = 8;  // column width of grid square set
        var GRIDSQUARE_SET_ROW_SIZE = 20; // row height of grid square set

        function UTMLetterDesignator(lat) {
            var letterDesignator = '';
            lat = parseFloat(lat);

          if ((84 >= lat) && (lat >= 72))
            letterDesignator = 'X';
          else if ((72 > lat) && (lat >= 64))
            letterDesignator = 'W';
          else if ((64 > lat) && (lat >= 56))
            letterDesignator = 'V';
          else if ((56 > lat) && (lat >= 48))
            letterDesignator = 'U';
          else if ((48 > lat) && (lat >= 40))
            letterDesignator = 'T';
          else if ((40 > lat) && (lat >= 32))
            letterDesignator = 'S';
          else if ((32 > lat) && (lat >= 24))
            letterDesignator = 'R';
          else if ((24 > lat) && (lat >= 16))
            letterDesignator = 'Q';
          else if ((16 > lat) && (lat >= 8))
            letterDesignator = 'P';
          else if (( 8 > lat) && (lat >= 0))
            letterDesignator = 'N';
          else if (( 0 > lat) && (lat >= -8))
            letterDesignator = 'M';
          else if ((-8> lat) && (lat >= -16))
            letterDesignator = 'L';
          else if ((-16 > lat) && (lat >= -24))
            letterDesignator = 'K';
          else if ((-24 > lat) && (lat >= -32))
            letterDesignator = 'J';
          else if ((-32 > lat) && (lat >= -40))
            letterDesignator = 'H';
          else if ((-40 > lat) && (lat >= -48))
            letterDesignator = 'G';
          else if ((-48 > lat) && (lat >= -56))
            letterDesignator = 'F';
          else if ((-56 > lat) && (lat >= -64))
            letterDesignator = 'E';
          else if ((-64 > lat) && (lat >= -72))
            letterDesignator = 'D';
          else if ((-72 > lat) && (lat >= -80))
            letterDesignator = 'C';
          else
            letterDesignator = 'Z'; // This is here as an error flag to show
                                    // that the latitude is outside the UTM limits
          return letterDesignator;
        }

        function findSet (zoneNum) {
            zoneNum = parseInt(zoneNum);
            zoneNum = zoneNum % 6;
            switch (zoneNum) {

            case 0:
              return 6;
              break;

            case 1:
              return 1;
              break;

            case 2:
              return 2;
              break;

            case 3:
              return 3;
              break;

            case 4:
              return 4;
              break;

            case 5:
              return 5;
              break;

            default:
              return -1;
              break;
            }
        }

        function lettersHelper(setL, row, col) {
          var l1, l2;

          // handle case of last row
          if (row == 0) {
            row = GRIDSQUARE_SET_ROW_SIZE - 1;
          }
          else {
            row--;
          }

          // handle case of last column
          if (col == 0) {
            col = GRIDSQUARE_SET_COL_SIZE - 1;
          }
          else {
            col--;
          }

          switch(setL) {

            case 1:
              l1="ABCDEFGH";              // column ids
              l2="ABCDEFGHJKLMNPQRSTUV";  // row ids
              return l1.charAt(col) + l2.charAt(row);
              break;

            case 2:
              l1="JKLMNPQR";
              l2="FGHJKLMNPQRSTUVABCDE";
              return l1.charAt(col) + l2.charAt(row);
              break;

            case 3:
              l1="STUVWXYZ";
              l2="ABCDEFGHJKLMNPQRSTUV";
              return l1.charAt(col) + l2.charAt(row);
              break;

            case 4:
              l1="ABCDEFGH";
              l2="FGHJKLMNPQRSTUVABCDE";
              return l1.charAt(col) + l2.charAt(row);
              break;

            case 5:
              l1="JKLMNPQR";
              l2="ABCDEFGHJKLMNPQRSTUV";
              return l1.charAt(col) + l2.charAt(row);
              break;

            case 6:
              l1="STUVWXYZ";
              l2="FGHJKLMNPQRSTUVABCDE";
              return l1.charAt(col) + l2.charAt(row);
              break;
          }
        }

        function findGridLetters(zoneNum, northing, easting) {

            zoneNum  = parseInt(zoneNum);
            northing = parseFloat(northing);
            easting  = parseFloat(easting);
            var row = 1;

            // northing coordinate to single-meter precision
            var north_1m = Math.round(northing);

            // Get the row position for the square identifier that contains the point
            while (north_1m >= BLOCK_SIZE) {
                north_1m = north_1m - BLOCK_SIZE;
                row++;
            }

            // cycle repeats (wraps) after 20 rows
            row = row % GRIDSQUARE_SET_ROW_SIZE;
            var col = 0;

            // easting coordinate to single-meter precision
            var east_1m = Math.round(easting)

            // Get the column position for the square identifier that contains the point
            while (east_1m >= BLOCK_SIZE){
                east_1m = east_1m - BLOCK_SIZE;
                col++;
            }

            // cycle repeats (wraps) after 8 columns
            col = col % GRIDSQUARE_SET_COL_SIZE;

            return lettersHelper(findSet(zoneNum), row, col);
        }

        function LLtoUTM(lat,lon,utmcoords,zone) {
            // utmcoords is a 2-D array declared by the calling routine
            // note: input of lon = 180 or -180 with zone 60 not allowed; use 179.9999

            lat = parseFloat(lat);
            lon = parseFloat(lon);

            // Constrain reporting USNG coords to the latitude range [80S .. 84N]
            /////////////////
            if (lat > 84.0 || lat < -80.0){
                console.log('Error - LLtoUTM, invalid input. Latitude out of range -80 to +84')
                return([]);
            }
            //////////////////////


            // sanity check on input - turned off when testing with Generic Viewer
            if (lon > 360 || lon < -180 || lat > 90 || lat < -90) {
                console.log('Error - LLtoUTM, invalid input. lat: ' + lat.toFixed(4) + ' lon: ' + lon.toFixed(4));
            }


            // Make sure the longitude is between -180.00 .. 179.99..
            // Convert values on 0-360 range to this range.
            var lonTemp = (lon + 180) - parseInt((lon + 180) / 360) * 360 - 180;
            var latRad = lat     * DEG_2_RAD;
            var lonRad = lonTemp * DEG_2_RAD;

            var zoneNumber;
            // user-supplied zone number will force coordinates to be computed in a particular zone
            if (!zone) {
                zoneNumber = getZoneNumber(lat, lon);
            }
            else {
                zoneNumber = zone
            }

            var lonOrigin = (zoneNumber - 1) * 6 - 180 + 3;  // +3 puts origin in middle of zone
            var lonOriginRad = lonOrigin * DEG_2_RAD;

            // compute the UTM Zone from the latitude and longitude
            var UTMZone = zoneNumber + "" + UTMLetterDesignator(lat) + " ";

            var N = EQUATORIAL_RADIUS / Math.sqrt(1 - ECC_SQUARED *
                                    Math.sin(latRad) * Math.sin(latRad));
            var T = Math.tan(latRad) * Math.tan(latRad);
            var C = ECC_PRIME_SQUARED * Math.cos(latRad) * Math.cos(latRad);
            var A = Math.cos(latRad) * (lonRad - lonOriginRad);

            // Note that the term Mo drops out of the "M" equation, because phi
            // (latitude crossing the central meridian, lambda0, at the origin of the
            //  x,y coordinates), is equal to zero for UTM.
            var M = EQUATORIAL_RADIUS * (( 1 - ECC_SQUARED / 4
                - 3 * (ECC_SQUARED * ECC_SQUARED) / 64
                - 5 * (ECC_SQUARED * ECC_SQUARED * ECC_SQUARED) / 256) * latRad
                - ( 3 * ECC_SQUARED / 8 + 3 * ECC_SQUARED * ECC_SQUARED / 32
                + 45 * ECC_SQUARED * ECC_SQUARED * ECC_SQUARED / 1024)
                    * Math.sin(2 * latRad) + (15 * ECC_SQUARED * ECC_SQUARED / 256
                + 45 * ECC_SQUARED * ECC_SQUARED * ECC_SQUARED / 1024) * Math.sin(4 * latRad)
                - (35 * ECC_SQUARED * ECC_SQUARED * ECC_SQUARED / 3072) * Math.sin(6 * latRad));

            UTMEasting = (k0 * N * (A + (1 - T + C) * (A * A * A) / 6
                        + (5 - 18 * T + T * T + 72 * C - 58 * ECC_PRIME_SQUARED )
                        * (A * A * A * A * A) / 120)
                        + EASTING_OFFSET);

            UTMNorthing = (k0 * (M + N * Math.tan(latRad) * ( (A * A) / 2 + (5 - T + 9
                          * C + 4 * C * C ) * (A * A * A * A) / 24
                          + (61 - 58 * T + T * T + 600 * C - 330 * ECC_PRIME_SQUARED )
                          * (A * A * A * A * A * A) / 720)));

            utmcoords[0] = UTMEasting;
            utmcoords[1] = UTMNorthing;
            utmcoords[2] = zoneNumber;

            return utmcoords;
        }

        function getZoneNumber(lat, lon) {

            lat = parseFloat(lat);
            lon = parseFloat(lon);

            // sanity check on input
            if (lon > 360 || lon < -180 || lat > 84 || lat < -80) {
            //alert('usng.js, getZoneNumber: invalid input. lat: ' + lat.toFixed(4) + ' lon: ' + lon.toFixed(4));
            }

            // convert 0-360 to [-180 to 180] range
            var lonTemp = (lon + 180) - parseInt((lon + 180) / 360) * 360 - 180;
            var zoneNumber = parseInt((lonTemp + 180) / 6) + 1;

            // Handle special case of west coast of Norway
            if ( lat >= 56.0 && lat < 64.0 && lonTemp >= 3.0 && lonTemp < 12.0 ) {
                zoneNumber = 32;
            }

            // Special zones for Svalbard
            if ( lat >= 72.0 && lat < 84.0 ) {
                if ( lonTemp >= 0.0  && lonTemp <  9.0 ) {
                  zoneNumber = 31;
                } else if ( lonTemp >= 9.0  && lonTemp < 21.0 ) {
                  zoneNumber = 33;
                } else if ( lonTemp >= 21.0 && lonTemp < 33.0 ) {
                  zoneNumber = 35;
                } else if ( lonTemp >= 33.0 && lonTemp < 42.0 ) {
                  zoneNumber = 37;
                }
            }
            return zoneNumber;
        } // END getZoneNumber() function

        var USNG = "";
        var UTMGzdLetters="NPQRSTUVWX";
        var USNGSqEast = "ABCDEFGHJKLMNPQRSTUVWXYZ"
        var USNGSqLetOdd="ABCDEFGHJKLMNPQRSTUV";
        var USNGSqLetEven="FGHJKLMNPQRSTUVABCDE";
        var EASTING_OFFSET  = 500000.0;   // (meters)
        var NORTHING_OFFSET = 10000000.0; // (meters)
        //////////??????????????
        if (lon < -180) { lon += 360;}
        else if (lon > 180) { lon -= 360;}

        lat = parseFloat(lat);
        lon = parseFloat(lon);

        // convert lat/lon to UTM coordinates
        var coords = [];
        coords = LLtoUTM(lat, lon, coords);
        var UTMEasting = coords[0];
        var UTMNorthing = coords[1];
        var zoneNumber = coords[2];

        // ...then convert UTM to USNG

        var hemisphere = "N";
        // southern hemispher case
        if (lat < 0) {
        // Use offset for southern hemisphere
            UTMNorthing += NORTHING_OFFSET;
            hemisphere = "S";
        }

        var USNGLetters  = findGridLetters(zoneNumber, UTMNorthing, UTMEasting);
        var USNGNorthing = Math.round(UTMNorthing) % BLOCK_SIZE;
        var USNGEasting  = Math.round(UTMEasting)  % BLOCK_SIZE;

        // added... truncate digits to achieve specified precision
        USNGNorthing = Math.floor(USNGNorthing / Math.pow(10,(5-precision)));
        USNGEasting = Math.floor(USNGEasting / Math.pow(10,(5-precision)));
        USNG = getZoneNumber(lat, lon) +  UTMLetterDesignator(lat) + " " + USNGLetters + " ";

        // REVISIT: Modify to incorporate dynamic precision ?
        for (var i = String(USNGEasting).length; i < precision; i++) {
            USNG += "0";
        }
        USNG += USNGEasting + " ";

        for (var i = String(USNGNorthing).length; i < precision; i++) {
            USNG += "0";
        }
        USNG += USNGNorthing;

        var coords = {usngString:USNG, northing:UTMNorthing, easting:UTMEasting, zoneNumber:zoneNumber, hemisphere:hemisphere};

        var reverse_coords = _m.utmToLatLong(coords.easting, coords.northing, coords.zoneNumber, coords.hemisphere);
        coords.reverseLat = reverse_coords.lat;
        coords.reverseLon = reverse_coords.lon;

        coords.mgrs_bounds = _m.MGRSBoundsFromUTM(coords.easting, coords.northing, coords.zoneNumber, coords.hemisphere, precisionOfMouseOver || precision);

        return coords;
    };

    _m.MGRSBoundsFromUTM = function (easting, northing, zoneNumber, hemisphere, precision) {

        var box_size = precision ? Math.pow(10,precision) : 1000; // TODO: precision might not be the same as otherwise used
        var e = parseInt(easting / box_size) * box_size;
        var n = parseInt(northing / box_size) * box_size;
        var tl = _m.utmToLatLong(e, n, zoneNumber, hemisphere);
        var tr = _m.utmToLatLong(e, n+box_size, zoneNumber, hemisphere);
        var br = _m.utmToLatLong(e+box_size, n+box_size, zoneNumber, hemisphere);
        var bl = _m.utmToLatLong(e+box_size, n, zoneNumber, hemisphere);

        //TODO: Doesn't handle split cells
        return {tl:tl, tr:tr, br:br, bl:bl};
    };


    _m.latLongToMgrs = function (lat, lon, precision, output) {
        /*
         * Creates a Military Grid Reference System string.
         * This is the same as a USNG string, but without spaces.
         *
         * Space delimiters are optional but allowed in USNG, but are not allowed in MGRS.
         *
         * The numbers are the same between the two coordinate systems.
         *
         * @param lat- Latitude in decimal degrees
         * @param lon- longitude in decimal degrees
         * @param precision- How many decimal places (1-5) in USNG (default 5)
         * @param output- Output format. Accepted values are: 'string' and 'object'
         * @return String of the format- DDL LL DDDDD DDDDD (5-digit precision)
         */
        var mgrs,
            usngCoords = _m.latLongToUsng(lat, lon, precision, precision);
        var usng = usngCoords.usngString;

        if (typeof usng === 'string') {
            // remove space delimiters to conform to mgrs spec
            mgrs = usng.replace(/ /g, "");
        } else {
            mgrs = usng;
        }

        return mgrs;
    };
    _m.utmToUsng = function (coords, precision, output) {
        /*
         * Converts a UTM coordinate to USNG:
         *
         * @param coords- object with parts of a UTM coordinate
         * @param precision- How many decimal places (1-5) in USNG (default 5)
         * @param output- Format to output. Options include: 'string' and 'object'
         * @return String of the format- DDL LL DDDDD DDDDD (5-digit precision)
         */
        var utmEasting,
            utmNorthing,
            letters,
            usngNorthing,
            usngEasting,
            usng,
            i;

        if (typeof precision === 'string') {
            precision = parseInt(precision, 10);
        }

        precision = precision ? precision : 5;

        utmEasting = coords.easting;
        utmNorthing = coords.northing;

        // southern hemisphere case
        if (coords.hemisphere === 'S') {
            // Use offset for southern hemisphere
            utmNorthing += CONSTANTS.NORTHING_OFFSET;
        }

        letters = _m.findGridLetters(coords.zoneNumber, utmNorthing, utmEasting);
        usngNorthing = Math.round(utmNorthing) % CONSTANTS.BLOCK_SIZE;
        usngEasting = Math.round(utmEasting) % CONSTANTS.BLOCK_SIZE;

        // added... truncate digits to achieve specified precision
        usngNorthing = Math.floor(usngNorthing / Math.pow(10, (5 - precision)));
        usngEasting = Math.floor(usngEasting / Math.pow(10, (5 - precision)));

        // REVISIT: Modify to incorporate dynamic precision ?
        for (i = String(usngEasting).length; i < precision; i += 1) {
            usngEasting = "0" + usngEasting;
        }

        for (i = String(usngNorthing).length; i < precision; i += 1) {
            usngNorthing = "0" + usngNorthing;
        }

        if (typeof output === 'string' && output === 'object') {
            usng = {
                zone: coords.zoneNumber + coords.zoneLetter,
                square: letters,
                easting: usngEasting,
                northing: usngNorthing
            };
        } else {
            usng = coords.zoneNumber + coords.zoneLetter + " " + letters + " " +
                usngEasting + " " + usngNorthing;
        }

        return usng;
    };
    _m.lettersHelper = function (set, row, col) {
        /*
         * Retrieve the Square Identification (two-character letter code), for the
         * given row, column and set identifier (set refers to the zone set:
         * zones 1-6 have a unique set of square identifiers; these identifiers are
         * repeated for zones 7-12, etc.)

         * See p. 10 of the "United States National Grid" white paper for a diagram
         * of the zone sets.
         */
        var l1, l2;

        // handle case of last row
        if (row === 0) {
            row = CONSTANTS.GRIDSQUARE_SET_ROW_SIZE - 1;
        } else {
            row -= 1;
        }

        // handle case of last column
        if (col === 0) {
            col = CONSTANTS.GRIDSQUARE_SET_COL_SIZE - 1;
        } else {
            col -= 1;
        }

        switch (set) {
            case 1:
                l1 = "ABCDEFGH";              // column ids
                l2 = "ABCDEFGHJKLMNPQRSTUV";  // row ids
                break;

            case 2:
                l1 = "JKLMNPQR";
                l2 = "FGHJKLMNPQRSTUVABCDE";
                break;

            case 3:
                l1 = "STUVWXYZ";
                l2 = "ABCDEFGHJKLMNPQRSTUV";
                break;

            case 4:
                l1 = "ABCDEFGH";
                l2 = "FGHJKLMNPQRSTUVABCDE";
                break;

            case 5:
                l1 = "JKLMNPQR";
                l2 = "ABCDEFGHJKLMNPQRSTUV";
                break;

            case 6:
                l1 = "STUVWXYZ";
                l2 = "FGHJKLMNPQRSTUVABCDE";
                break;
        }

        var text = "..";
        if (l1 && l2) text = l1.charAt(col) + l2.charAt(row);
        return text;
    };


    _m.findGridLetters = function (zoneNum, northing, easting) {
        /*
         * Retrieves the square identification for a given coordinate pair & zone.
         * See "lettersHelper" function documentation for more details.
         */
        var north_1m, east_1m, row, col;

        zoneNum = parseInt(zoneNum, 10);
        northing = parseFloat(northing);
        easting = parseFloat(easting);
        row = 1;

        // northing coordinate to single-meter precision
        north_1m = Math.round(northing);

        // Get the row position for the square identifier that contains the point
        while (north_1m >= CONSTANTS.BLOCK_SIZE) {
            north_1m = north_1m - CONSTANTS.BLOCK_SIZE;
            row += 1;
        }

        // cycle repeats (wraps) after 20 rows
        row = row % CONSTANTS.GRIDSQUARE_SET_ROW_SIZE;
        col = 0;

        // easting coordinate to single-meter precision
        east_1m = Math.round(easting);

        // Get the column position for the square identifier that contains the point
        while (east_1m >= CONSTANTS.BLOCK_SIZE) {
            east_1m = east_1m - CONSTANTS.BLOCK_SIZE;
            col += 1;
        }

        // cycle repeats (wraps) after 8 columns
        col = col % CONSTANTS.GRIDSQUARE_SET_COL_SIZE;

        return _m.lettersHelper(_m.findSet(zoneNum), row, col);
    };
    _m.findSet = function (zoneNum) {
        /*
         * Finds the set for a given zone.
         *
         * There are six unique sets, corresponding to individual grid numbers in
         * sets 1-6, 7-12, 13-18, etc. Set 1 is the same as sets 7, 13, ..; Set 2
         * is the same as sets 8, 14, ..
         *
         * See p. 10 of the "United States National Grid" white paper.
         */

        var tReturn;

        zoneNum = parseInt(zoneNum, 10);
        zoneNum = zoneNum % 6;

        switch (zoneNum) {
            case 0:
                tReturn = 6;
                break;
            case 1:
                tReturn = 1;
                break;
            case 2:
                tReturn = 2;
                break;
            case 3:
                tReturn = 3;
                break;
            case 4:
                tReturn = 4;
                break;
            case 5:
                tReturn = 5;
                break;
            default:
                tReturn = -1;
                break;
        }

        return tReturn;
    };

    _m.countryFromTwoLetter = function (twoLetterCode) {
        var lookup = _m.COUNTRY_CODES[twoLetterCode];
        return lookup ? lookup : "Unrecognized - " + twoLetterCode;
    };
    _m.twoLetterCountryCode = function (countryName) {
        var found = "";
        var lcaseName = countryName.toLowerCase();
        for (var key in _m.COUNTRY_CODES) {
            var val = _m.COUNTRY_CODES[key];
            if (val.toLowerCase() == lcaseName) {
                found = key;
                break;
            }
        }
        return found ? found : "??";
    };

    _m.toRad = function (deg) {
        return (deg * Math.PI / 180);
    };
    _m.toDeg = function (rad) {
        return (rad * 180 / Math.PI);
    };
    _m.destinationFromBearingAndDistance = function (point, bearingDeg, distKM) {
        var lat1 = point.lat || point.y;
        var lon1 = point.lon || point.long || point.lng || point.x;
        var R = 6371;
        lat1 = _m.toRad(lat1);
        lon1 = _m.toRad(lon1);
        var bearingRad = _m.toRad(bearingDeg);

        var lat2 = Math.asin(Math.sin(lat1) * Math.cos(distKM / R) +
            Math.cos(lat1) * Math.sin(distKM / R) * Math.cos(bearingRad));
        var lon2 = lon1 + Math.atan2(Math.sin(bearingRad) * Math.sin(distKM / R) * Math.cos(lat1),
            Math.cos(distKM / R) - Math.sin(lat1) * Math.sin(lat2));

        return {lat: _m.toDeg(lat2), lon: _m.toDeg(lon2)};
    };

    //================
    _m.inWhichUSStateBounds = function (lat, lon) {
        var stateData = false;
//TODO: SPEED: Cache last looked at, and check it first as there is more chance that a nearby point is being checked

        lat = _m.correctDegree(lat);
        lon = _m.correctDegree(lon);

        //If gju library is loaded
        if (typeof gju!="undefined" && gju.pointInPolygon && maptools && maptools.US_STATE_DATA) {
            var states = _m.US_STATE_DATA;
            var statesCount = states.length;

            var point_object = {"type":"Point","coordinates":[lon,lat]};
            for (var i=0; i<statesCount; i++){
                var state = states[i];
                var point_in_poly = gju.pointInPolygon(point_object,state);
                if (point_in_poly){
                    stateData = states[i];
                    break;
                }
            }
        }
        return stateData;
    };
    _m.inWhichCountryBounds = function (lat, lon) {
        var countryData = false;
//TODO: SPEED: Cache last looked at, and check it first as there is more chance that a nearby point is being checked

        lat = _m.correctDegree(lat);
        lon = _m.correctDegree(lon);

        //If gju library is loaded
        if (typeof gju!="undefined" && gju.pointInPolygon && maptools && maptools.COUNTRY_DATA) {
            var countries = _m.COUNTRY_DATA;
            var countriesCount = countries.length;

            var point_object = {"type":"Point","coordinates":[lon,lat]};
            for (var i=0; i<countriesCount; i++){

                var country = countries[i];
                var point_in_poly = gju.pointInPolygon(point_object,country);
                if (point_in_poly){
                    countryData = countries[i];
                    break;
                }
            }
        }
        return countryData;
    };


    _m.locationInfoString = function(options) {
//      Example usage:
//      text = maptools.locationInfoString({lat:lat, lng:lng, zoom:zoom, separator:"<br/>", boldTitles:true, overPrecision:4});

        function boldify(text){
            if (options.boldTitles){
                text = "<b>"+text+"</b>";
            }
            return text;
        }

        var textArray = [];
        var output = {};
        var lat = options.lat;
        var lng = options.lng;
        lng = _m.correctDegree(lng);

        output.lat = lat.toFixed(6);
        output.lng = lng.toFixed(6);
        output.zoom = options.zoom || false;

        textArray.push(boldify("Lat: ") + lat.toFixed(6));
        textArray.push(boldify("Lon: ") + lng.toFixed(6));
        if (output.zoom) textArray.push(boldify("Zoom: ") + output.zoom);

        output.in_bounds_us = _m.inUSBounds(lat, lng);
        output.in_bounds_world = _m.inWorldBounds(lat, lng);

        var ngText = '';
        output.usngCoords = _m.latLongToUsng(lat, lng, 5, options.overPrecision || 4);
        var usngText = output.usngCoords.usngString;
        if (output.usngCoords.easting && output.usngCoords.northing) {
            textArray.push(boldify("Easting: ") + output.usngCoords.easting.toFixed(2));
            textArray.push(boldify("Northing: ") + output.usngCoords.northing.toFixed(2));
        }
        if (output.in_bounds_us) {
            ngText += boldify("USNG: ")+usngText;
            output.state = _m.inWhichUSStateBounds(lat, lng)
        } else {
            ngText += boldify("MGRS: ")+usngText;
        }
        output.country = _m.inWhichCountryBounds(lat, lng);

        if (ngText && ngText.indexOf && ngText.indexOf('NaN')== -1) {
            textArray.push(ngText);
        }

        textArray.push(boldify("in_bounds_world: ") + output.in_bounds_world);
        if (output.country) {
            textArray.push(boldify("Country: ") + output.country.name);
            textArray.push(boldify("Country Code: ") + output.country.abbr);
            var code = _m.twoLetterCountryCode(output.country.name);
            if (code && code!="??") textArray.push(boldify("Country 2-letter: ") + code);

            if (output.country.pop_est) {
                textArray.push(boldify("Country Pop: ") + output.country.pop_est);
            }
            if (output.country.gdp_md_est) {
                textArray.push(boldify("Country GDP: ") + output.country.gdp_md_est);
            }
        }
        textArray.push(boldify("in_bounds_us: ") + output.in_bounds_us);
        if (output.state) {
            textArray.push(boldify("State Name: ") + output.state.name);
            if (output.state.pop_density){
                textArray.push(boldify("Population: ") + output.state.pop_density + " people / mi<sup>2</sup>");
            }
        }

        output.toString = function(){
            return textArray.join(options.separator || "<br/>");
        };
        return output;
    };


    //================
    if (global.maptools) {
        throw new Error('maptools has already been defined');
    } else {
        global.maptools = _m;
    }

})(typeof window === 'undefined' ? this : window);