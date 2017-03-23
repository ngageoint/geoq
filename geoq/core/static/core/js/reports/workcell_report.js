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



workcell_report.setList = function(datalist) {
    var tbody = $('#workcell-status-list tbody');

    _.each(datalist, function(cell) {
        var $tr = $('<tr>');

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
            .text(cell.completion_date | "")
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

