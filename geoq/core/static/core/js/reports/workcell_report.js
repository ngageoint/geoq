// This technical data was produced for the U. S. Government under Contract No. W15P7T-13-C-F600, and
// is subject to the Rights in Technical Data-Noncommercial Items clause at DFARS 252.227-7013 (FEB 2012)

//requires leaflet_helper.js, underscore, jquery, leaflet, log4javascript

var workcell_report = {};
workcell_report.data = [];
workcell_report.groups_url = "#";
workcell_report.users_url = "#";
workcell_report.popup_template = '';
workcell_report.token = "";
workcell_report.map_object = null;
workcell_report.url = "#";
workcell_report.map_object = null;
workcell_report.aois = null;

workcell_report.default_style = {"color":"gray","fillOpacity":0.5,"opacity":0.8};

workcell_report.status_colors = [
    {name:'Assigned', color: leaflet_helper.styles.assigned, slug:'assigned'},
    {name:'Completed', color: leaflet_helper.styles.completed, slug:'completed'},
    {name:'In work', color: leaflet_helper.styles.in_work, slug:'in-work'},
    {name:'Awaiting Analysis', color: leaflet_helper.styles.awaiting_analysis, slug:'awaiting-analysis'},
    {name:'Awaiting Imagery', color: leaflet_helper.styles.awaiting_imagery, slug:'awaiting-imagery'},
    {name:'Unassigned', color: leaflet_helper.styles.extentStyle, slug:'unassigned'}
];

workcell_report.mapInit = function(map, bounds) {
    // throw in a pause as there seems to be some overlapping with the table write
    setTimeout(function() {
        workcell_report.map_object = map;
        workcell_report.aois = L.geoJson(false, {
            onEachFeature: workcell_report.onEachFeature
        }).addTo(workcell_report.map_object);

        // load layer
        _.each(aoi_data, function(data,key) {
            data.geometry.status = data.status;
            data.geometry.key = key;
            data.geometry.analyst = data.analyst;
            data.geometry.id = data.GEO_ID;
            data.geometry.priority = data.priority;
            workcell_report.appendWorkcell(data.geometry);
        });

        // set bounds of map
        workcell_report.map_object.fitBounds(workcell_report.aois.getBounds());
    }, 500);
};

workcell_report.filterLayers = function(ids) {
    // filter map view to show only the object ids listed in the array passed in
    workcell_report.aois.eachLayer( function (layer) {
        var status = "Unassigned";
        var id = "0";
        if (layer.feature && layer.feature.geometry && layer.feature.geometry.status) {
            status = layer.feature.geometry.status;
            id = layer.feature.geometry.key;
        }

        if (_.contains(ids,id)) {
            layer.setStyle(workcell_report.getStyle(status,true));
        } else {
            layer.setStyle(workcell_report.getStyle(status,false));
        }
    })
};

workcell_report.filterTimeline = function(ids) {
    // filter timeline to show on the object ids listed in the array passed in
    var date_set = _.pick.apply({}, [aoi_data].concat(_.filter(_.keys(aoi_data), function(K) {
        return ids.includes(K) && aoi_data[K].started_date;
    })));
    var timeline_data = _.map(date_set, function(o,k) {
        var record = {id: k, content: o.GEO_ID, start: o.started_date};
        if (o.completion_date && o.completion_date != 'Not finished' && o.completion_date != o.started_date) {
            record['end'] = o.completion_date;
        }
        return record;
    });

    timeline.setItems(timeline_data);
    timeline.fit();
};

workcell_report.onEachFeature = function(feature,layer) {
    var summary = feature;
    var popupContent = _.template(workcell_report.popup_template, summary);
    layer.bindPopup(popupContent);

    layer.setStyle(workcell_report.getStyle(feature.status, true));
};

workcell_report.getStyle = function(status,visible) {
    var system_style = _.find(workcell_report.status_colors, function(e) { return e.name == status; });
    var style = workcell_report.default_style;
    if (system_style && system_style.color) {
        style = system_style.color;
    }

    if (!visible) {
        style.opacity = 0;
        style.fillOpacity = 0;
    } else {
        style.opacity = 0.8;
        style.fillOpacity = 0.5;
    }

    return style;
};

workcell_report.appendWorkcell = function(workcell) {
    r = workcell_report.aois.addData(workcell);
};

workcell_report.setList = function(datalist) {
    var tbody = $('#workcell-status-list tbody');

    _.each(datalist, function(cell,id) {
        var $tr = $('<tr>');

        $('<td>')
            .text(id)
            .appendTo($tr);
        $('<td>')
            .text(cell.GEO_ID)
            .appendTo($tr);
        $('<td>')
            .text(cell.MISQRD|0)
            .appendTo($tr);
        $('<td>')
            .text(cell.analyst)
            .appendTo($tr);
        $('<td>')
            .text(cell.team)
            .appendTo($tr);
        $('<td>')
            .text(cell.status)
            .appendTo($tr);
        $('<td>')
            .text(cell.analyzed)
            .appendTo($tr);
        $('<td>')
            .text(cell.timer['In work'])
            .appendTo($tr);
        $('<td>')
            .text(cell.completion_date)
            .appendTo($tr);
        $('<td>')
            .text(cell.features)
            .appendTo($tr);

        tbody.append($tr);
    });
};

workcell_report.check_all = function() {
    // Get the value of the header checkbox and apply to all rows in table
    var selected = $('#batch-assign-workcells')[0].checked;
    var boxes = $('.tablesorter tbody :input');
    _.each(boxes, function(b) {
        b.checked = selected;
    });
};

