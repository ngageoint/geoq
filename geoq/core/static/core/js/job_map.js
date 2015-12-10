// This technical data was produced for the U. S. Government under Contract No. W15P7T-13-C-F600, and
// is subject to the Rights in Technical Data-Noncommercial Items clause at DFARS 252.227-7013 (FEB 2012)

//requires leaflet_helper.js, underscore, jquery, leaflet, log4javascript

var job_map = {};
job_map.data = [];
job_map.groups_url = "#";
job_map.users_url = "#";
job_map.popup_template = '';
job_map.token = "";
job_map.map_object = null;
job_map.aois = new L.FeatureGroup();
job_map.url = "#";

job_map.status_colors = [
    {name:'Assigned', color: leaflet_helper.styles.assigned, slug:'assigned'},
    {name:'Completed', color: leaflet_helper.styles.completed, slug:'completed'},
    {name:'In work', color: leaflet_helper.styles.in_work, slug:'in-work'},
    {name:'Awaiting Analysis', color: leaflet_helper.styles.awaiting_analysis, slug:'awaiting-analysis'},
    {name:'Awaiting Imagery', color: leaflet_helper.styles.awaiting_imagery, slug:'awaiting-imagery'},
    {name:'Unassigned', color: leaflet_helper.styles.extentStyle, slug:'unassigned'}
];

var aoi_extents;
function mapInit(map, bounds) {

    job_map.map_object = map;

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

            var $tdc = $('<td>')
                .appendTo($tr);

            $('<input>')
                .attr('type', 'checkbox')
                .appendTo($tdc);

            var $td = $('<td>')
                .appendTo($tr);

            $('<a>')
                .attr('href','#')
                .text(job_properties.id)
                .appendTo($td);
            $('<td>')
                .text(job_properties.priority)
                .appendTo($tr);
            $('<td>')
                .text(job_properties.status)
                .appendTo($tr);
            $('<td>')
                .text(job_properties.assignee)
                .appendTo($tr);
            $('<td>')
                .text(job_properties.analyst)
                .appendTo($tr);

            $('#workcell-list tbody').append($tr);

            layer.on({
                mouseover: job_map.highlightFeature,
                mouseout: job_map.resetHighlight
            });
        }
    }).addTo(map);

    $('#workcell-list').trigger('update');

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

    map.addLayer(job_map.aois);
    map.on('draw:created', job_map.selectionDrawn);


    job_map.addAssignmentControls(map);
}

job_map.assignWorkcells = function (){

    var m = job_map.map_object;
    if (m && (m._container.id == 'map') && (m.hasLayer(job_map.aois))){

        _.each(job_map.aois.getLayers(), function(l){
            _.each(l.getLayers(), function(featureHolder){
                var props = featureHolder.feature.properties;
                //props = props || {};
                //props.priority = num;
            });
        });
        //create_aois.resetBoundaries();
    }
};

job_map.createPolygonOptions = function(opts) {
    var options = {};

    if (opts.name) {
        options.title = opts.name;
    }

    options.allowIntersection = true;
    options.drawError = { color: '#b00b00', timeout: 1000};

    options.shapeOptions = opts.style || {borderColor: "black", backgroundColor: "brown"};
    options.showArea = true;
    options.id = opts.id;

    return options;
};

job_map.selectionDrawn = function (e){
    var type = e.layerType,
        layer = e.layer;

    if (type == 'polygon-assign-workcells') {
        //User drew with assign-workcells control
        job_map.doSomethingWithOverlappingPolys(layer,job_map.assignWorkcellList);
    }
};

job_map.doSomethingWithOverlappingPolys = function (layer, funcToDo, noneMessage) {
    var countOverlaps = 0;
    if (job_map.aois && job_map.aois.getLayers()) {
        var deleteJson = layer.toGeoJSON();
        var selectPoly = deleteJson.geometry.coordinates[0];
        selectPoly = job_map.convertPolyToXY(selectPoly);

        var existingCells = job_map.getBoundaries(true);
        var selectedCells = [];
        _.each(existingCells,function(cell){
            var cellPoly = cell.geometry.coordinates[0][0];
            cellPoly = job_map.convertPolyToXY(cellPoly);

            var intersects = intersectionPolygons(cellPoly,selectPoly);
            if (intersects && intersects.length){
                selectedCells.push(cell);
                countOverlaps++;
            }
        });
        if (selectedCells.length) {
            var cellIds = [];
            _.each(selectedCells, function(cell) {
                cellIds.push(cell.properties.id);
            });
            job_map.assignAOI(cellIds);
        }
    } else {
        create_aois.update_info(noneMessage || "No polygon to remove workcells from");
    }
    return countOverlaps;
};

job_map.convertPolyToXY = function(poly){
    var newPoly = [];
    _.each(poly,function(p){
        newPoly.push({x:p[0],y:p[1]});
    });
    return newPoly;
};

job_map.getBoundaries = function(useCellsInstead) {
    var boundaries = [];

    var featureName = $('#aoi-name').val();
    var m = job_map.map_object;
    if (m && (m._container.id == 'map') && (m.hasLayer(job_map.aois))){
        job_map.map_object.eachLayer(function(l) {
            if (l.feature) {
                var f = l.feature;
                if (useCellsInstead) {
                    boundaries.push(f);
                } else {
                    boundaries.push(f.toGeoJSON());
                }
            }
        });
    }
    if (!boundaries.length) boundaries = false;

    return boundaries;
};

job_map.addAssignmentControls = function(map){

    //Add Delete Control
    L.drawLocal.draw.toolbar.actions.text = "Assign";
    L.drawLocal.draw.toolbar.actions.title = "Assign Workcells";

    var helpText = "Select Workcells to Assign";
    var polygon = job_map.createPolygonOptions({id:'assign-workcells',name:"Assign Workcells"});

    var assignControl = new L.Control.Draw({
        position: 'topleft',
        draw: {
            rectangle: false,
            polygons: [polygon],
            circle: false,
            polyline: false
        },
        edit: false
    });
    map.addControl(assignControl);
    job_map.assignControl = assignControl;

};

job_map.highlightFeature = function(e) {
    var layer = e.target;
    layer.setStyle({
        color: 'black',
        weight: 3,
        opacity: 1,
        fillOpacity:.3,
        fillColor: 'gray'
    });
};

job_map.resetHighlight = function(e) {
    aoi_extents.resetStyle(e.target);
};


job_map.setList = function(listmembers) {
    var clist = $('#assign-choices');
    clist.empty();
    _.each(listmembers, function(member) {
        $option = $('<option>')
            .attr('value', member)
            .text(member)
            .appendTo(clist);
    });
};

job_map.getList = function() {
    var type = $('#type-select :selected').val();
    url = (type == 'user') ? job_map.users_url : job_map.groups_url;
    $.ajax({
        url: url,
        type: 'GET',
        success: function(data) {
            job_map.setList(data);
        },
        failure: function() { log.error('Failed to retrieve user list ');}
    })
};

job_map.assignAOI = function(selected_workcells) {

    // make sure they've selected some workcells. If not, show error
    if ( selected_workcells.length == 0 ) {
        $('#workcell-list tr').filter(':has(:checkbox:checked)').find('a').each( function() {
            selected_workcells.push(this.text);
        });
    }

    if ( selected_workcells.length == 0 ) {
        BootstrapDialog.alert({
            title: 'Assign Workcells',
            message: 'Please check workcells from the list to assign, \nor use polygon tool on map',
            type: BootstrapDialog.TYPE_INFO,
            closable: true,
            buttonLabel: 'Return'
        })
    } else {


        BootstrapDialog.show({
            message: function (dialogItself) {
                var $assign_form = $('<form>')
                    .attr('id', 'assign-workcell');
                $('<label>Type</label>')
                    .appendTo($assign_form);
                var $combo1 = $('<select>')
                    .attr('id', 'type-select')
                    .attr('onchange', 'job_map.getList(this);')
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
                $('<div><label class="checkbox inline"><input id="email-users" type="checkbox">Email User(s)</label></div>')
                    .appendTo($assign_form);
                $('<option>')

                return $assign_form;
            },
            buttons: [
                {
                    label: 'Save',
                    action: function (dialogItself) {
                        var data = {};
                        data.workcells = selected_workcells;
                        data.email = $('#email-users').filter(':checked').length == 1;
                        data.user_type = $('#type-select option').filter(':selected').val();
                        data.user_data = $('#assign-choices option').filter(':selected').val();

                        $.ajax({
                            type: 'POST',
                            url: job_map.url,
                            data: data,
                            csrfmiddlewaretoken: job_map.token,
                            success: function() {
                                dialogItself.close();
                                location.reload();
                            },
                            error: function() {
                                alert('Failed to update workcell assignments');
                            }
                        });
                    }
                },
                {
                    label: 'Cancel',
                    action: function (dialogItself) {
                        dialogItself.close();
                    }
                }
            ]
        });
    }
};

