// This technical data was produced for the U. S. Government under Contract No. W15P7T-13-C-F600, and
// is subject to the Rights in Technical Data-Noncommercial Items clause at DFARS 252.227-7013 (FEB 2012)

//requires leaflet_helper.js, underscore, jquery, leaflet, log4javascript

var job_map = {};
job_map.data = [];
job_map.groups_url = "#";
job_map.users_url = "#";
job_map.popup_template = '';

job_map.status_colors = [
    {name:'Assigned', color: leaflet_helper.styles.assigned, slug:'assigned'},  //TODO: Are we still using 'Assigned'?
    {name:'Completed', color: leaflet_helper.styles.completed, slug:'completed'},
    {name:'In work', color: leaflet_helper.styles.in_work, slug:'in-work'},
    {name:'In review', color: leaflet_helper.styles.in_review, slug:'in-review'},
    {name:'Awaiting review', color: leaflet_helper.styles.awaiting_review, slug:'awaiting-review'},
    {name:'Unassigned', color: leaflet_helper.styles.extentStyle, slug:'unassigned'}
];

var aoi_extents;
function mapInit(map, bounds) {

    aoi_extents = L.geoJson(job_map.data, {
        style: function(feature) {
            var status = _.find(job_map.status_colors,function(stat){return stat.name==feature.properties.status});
            return (status && status.color) ? status.color : '#ffffff';
        },
        onEachFeature: function(feature, layer) {

            job_properties = feature.properties;
            var popupContent = _.template(job_map.popup_template, job_properties);
            layer.bindPopup(popupContent);

            var $tr = $('<tr>');

            var $td = $('<td>')
                .appendTo($tr);

            $('<a>')
                .attr('href','#')
                .text(job_properties.id)
                .appendTo($td);
            $('<td>')
                .text(job_properties.status)
                .appendTo($tr);
            $('<td>')
                .text(job_properties.analyst)
                .appendTo($tr);

            $('#workcell-list tbody').append($tr);

            layer.on({
                mouseover: highlightFeature,
                mouseout: resetHighlight
            });
        }
    }).addTo(map);

// Map doesn't update without this delay.
    setTimeout(function(){
        try {
            //AOI is sometimes getting no bounds data, which causes error
            var test = aoi_extents.getBounds().getCenter();
            map.fitBounds(aoi_extents.getBounds());
        } catch(ex){
            log.error("aoi_extents not being passed in valid bounds");
        }
    }, 1);

    var options = {
        position: 'topright', /* The position of the control */
        hideText: true,  // bool
        toggle: true,  // bool
        iconUrl: '/static/images/markers/tux.png'
    };
    var boxselector = new L.Control.Select(options);
    boxselector.addTo(map);


    var drawnItems = new L.FeatureGroup();
    map.addLayer(drawnItems);

    configurePageUI();
}

function highlightFeature(e) {
    var layer = e.target;
    layer.setStyle({
        color: 'black',
        weight: 3,
        opacity: 1,
        fillOpacity:.3,
        fillColor: 'gray'
    });
}

function resetHighlight(e) {
    aoi_extents.resetStyle(e.target);
}


function setList(listmembers) {
    var clist = $('#assign-choices');
    clist.empty();
    _.each(listmembers, function(member) {
        $option = $('<option>')
            .attr('value', member)
            .text(member)
            .appendTo(clist);
    });
}

function getList() {
    var type = $('#type-select :selected').val();
    url = (type == 'user') ? job_map.users_url : job_map.groups_url;
    $.ajax({
        url: url,
        type: 'GET',
        success: function(data) {
            setList(data);
        },
        failure: function() { log.error('Failed to retrieve user list ');}
    })
}

function assignAOI(id, assign_url) {


    BootstrapDialog.show({
        message: function(dialogItself) {
            var $assign_form = $('<form>')
                .attr('id','assign-workcell');
            $('<label>Type</label>')
                .appendTo($assign_form);
            var $combo1 = $('<select>')
                .attr('id','type-select')
                .attr('onchange', 'getList(this);')
                .appendTo($assign_form);
            $('<option>')
                .attr('value', 'choose')
                .text('Choose one')
                .appendTo($combo1);
            $('<option>')
                .attr('value', 'user')
                .text('User')
                .appendTo($combo1);
            $('<option>')
                .attr('value', 'group')
                .text('Group')
                .appendTo($combo1);
            $('<label>Choices</label>')
                .appendTo($assign_form);
            $('<select>')
                .attr('id', 'assign-choices')
                .appendTo($assign_form);
            $('<option>')

            return $assign_form;
        },
        buttons: [{
            label: 'Save',
            action: function(dialogItself) {
                alert('saving user');
            }
        },
            {
                label: 'Cancel',
                action: function(dialogItself) {
                    alert('cancel');
                }
            }]
    });
}

function configurePageUI () {
    //Color tabs with same colors as features
    _.each(job_map.status_colors, function(stat){
        var tab_name = '#tab_'+stat.slug;
        var $tab = $(tab_name);
        var bg_color = (stat.color) ? stat.color.fillColor : '';
        bg_color = bg_color || '#ffffff';
        var color = maths.idealTextColor(bg_color);

        if ($tab.length && bg_color) {
            $tab.css({backgroundColor:bg_color, color:color});
        }
    });
}
