var split_aois = {};

split_aois.priority_to_use = 5;

//TODO: Turn this into a Leaflet Plugin
split_aois.splitFeature = function (layer, num) {

    var simplerLayer = _.toArray(layer._layers)[0];
    var layers = split_aois.splitPolygonsIntoSections(simplerLayer, 4);
    var properties = layer.feature.properties || {};
    var priority = properties.priority || split_aois.priority_to_use || 5;
    properties.priority = priority > 1 ? priority - 1 : 1;

    _.each(layers, function (l) {
        l.properties = properties;
    });
    
    return layers;
};

split_aois.splitPolygonsIntoSections = function (layer, num, splitIntoSized) {
    var bounds = layer.getBounds();
    var left = bounds.getWest();
    var right = bounds.getEast();
    var north = bounds.getNorth();
    var south = bounds.getSouth();
    var width = right - left;
    var height = north - south;
    var slope = width / height;

    //Build an object that will be used for interior checking of points
    var layer_poly = {type: 'Polygon', coordinates: [
        []
    ]};
    var cs = layer.getLatLngs();
    _.each(cs, function (c) {
        layer_poly.coordinates[0].push([c.lng, c.lat]);
    });

    var x = 1;
    var y = 1;

    if (splitIntoSized) {
        //Divide by size of earth/meters
        x = parseInt(width * 111111.111 / num);
        y = parseInt(height * 111111.111 / num); //TODO: use COS to
    } else {
        //Determine what percentage of the poly is filled
        var fillPercentage = split_aois.determine_poly_fill_percentage(layer_poly, left, south, width, height);

        //Use the fillPercentage to determine how much of the target numbers should be grown
        num = num / fillPercentage;

        //Figure out how many x and y rows should be tried
        x = parseInt(Math.sqrt(num * slope));
        y = Math.round(num / x);
    }

    //Clamp to be between 1 and 40k work cells
    x = (x < 1) ? 1 : x > 200 ? 200 : x;
    y = (y < 1) ? 1 : y > 200 ? 200 : y;

    //When checking if cells are in a poly, check cells be subdividing by this amount
    var tessalationCheckAmount = 3;
    if ((x * y) > 50) tessalationCheckAmount = 2;
    if ((x * y) > 150) tessalationCheckAmount = 1;

    var x_slice = width / x;
    var y_slice = height / y;

    //Build the cells and remove ones that aren't in the original polygon
    var layers = [];
    var id_root = "handmade." + parseInt(Math.random() * 100000000);
    for (var x_num = 0; x_num < x; x_num++) {
        for (var y_num = 0; y_num < y; y_num++) {
            var id = id_root + "_" + x_num + "_" + y_num;

            var l0 = left + (x_slice * (x_num));
            var l1 = left + (x_slice * (x_num + 1));
            var t0 = south + (y_slice * (y_num));
            var t1 = south + (y_slice * (y_num + 1));

            //Build the square
            var coords = [
                [l0, t0],
                [l0, t1],
                [l1, t1],
                [l1, t0]
            ];

            var isBoxInPoly = true;
            if ((fillPercentage < 1) || (x > 3 && y > 3)) {
                //If it's a lot of boxes, test each one
                isBoxInPoly = false;

                //Break each box into smaller points and check the corners as well as those points to see if it's in the poly
                var coordsToCheck = _.clone(coords);
                var l_slice = (l1 - l0) / (tessalationCheckAmount + 2);
                var t_slice = (t1 - t0) / (tessalationCheckAmount + 2);

                for (var l_step = 1; l_step < (tessalationCheckAmount + 1); l_step++) {
                    for (var t_step = 1; t_step < (tessalationCheckAmount + 1); t_step++) {
                        coordsToCheck.push([l0 + (l_slice * l_step), t0 + (t_slice * t_step)]);
                    }
                }

                for (var c = 0; c < coordsToCheck.length; c++) {
                    var coord = coordsToCheck[c];
                    if (gju.pointInPolygon({coordinates: coord}, layer_poly)) {
                        isBoxInPoly = true;
                        break;
                    }
                }

            } else {
                isBoxInPoly = true;
            }

            //Add the closing first point as the last point
            coords.push(coords[0]);
            if (isBoxInPoly) {
                var feature = {"type": "Feature", "id": id,
                    "geometry_name": "the_geom", "properties": {priority: split_aois.priority_to_use},
                    "geometry": {"type": "MultiPolygon", "coordinates": [
                        [coords]
                    ]}};
                layers.push(feature);
            }
        }
    }

    return layers;
};
split_aois.determine_poly_fill_percentage = function (layer_poly, left, south, width, height) {
    //Determine what percentage of the poly is filled
    var fillPercentage;
    var coordsToCheck = [];
    var slices = 22;
    for (var x_num = 1; x_num < (slices - 1); x_num++) {
        for (var y_num = 1; y_num < (slices - 1); y_num++) {
            var l = left + ((width / slices) * x_num);
            var t = south + ((height / slices) * y_num);
            coordsToCheck.push([l, t]);
        }
    }
    var fillNum = 0;
    for (var c = 0; c < coordsToCheck.length; c++) {
        var coord = coordsToCheck[c];
        if (gju.pointInPolygon({coordinates: coord}, layer_poly)) fillNum++;
    }
    fillPercentage = fillNum / ((slices - 2) * (slices - 2)) - .02;

    fillPercentage = fillPercentage < .2 ? .2 : fillPercentage > .97 ? 1 : fillPercentage;

    return fillPercentage;
};