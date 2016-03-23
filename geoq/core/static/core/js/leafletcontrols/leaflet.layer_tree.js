var leaflet_layer_control = {};

//TODO: Allow drag-and-drop sorting that controls layer
//TODO: have an info control that modifies things like IA tools/icons
//TODO: Save info about layer configuration, then have a way to load that back in or save as settings for a Job
//TODO: Have a control to add new layers
//TODO: Be able to drag and drop layers onto the page
//TODO: Integrate with GeoNode to auto-build layers in GeoServer

//TODO: When changing order of Google Maps, always put below Features layers

leaflet_layer_control.$map = undefined;
leaflet_layer_control.$drawer = undefined;
leaflet_layer_control.$drawer_tray = undefined;
leaflet_layer_control.$tree = undefined;
leaflet_layer_control.accordion_sections = [];
leaflet_layer_control.$feature_info = undefined;
leaflet_layer_control.finish_options = [];

leaflet_layer_control.init = function(){
    leaflet_layer_control.$map = $("#map");
    return leaflet_layer_control.initDrawer();
};
leaflet_layer_control.initDrawer = function(){
    //Build the drawer with an Accordion and add it after the map
    var $drawer = $("<div>")
        .attr({id:"layer_info_drawer"});
    leaflet_layer_control.$drawer = $drawer;
    leaflet_layer_control.$map.after($drawer);

    var $accordion = $('<div>')
        .addClass("accordion")
        .attr('id','layer-control-accordion')
        .appendTo($drawer);

    //Build the first row of the accordion if workcell info exists
    leaflet_layer_control.addWorkCellInfo($accordion);

    //Build the next row of the accordion with details about a selected feature
    leaflet_layer_control.addFeatureInfo($accordion);

    //Build an accordion row to view workcell log
    leaflet_layer_control.addLogInfo($accordion);
    leaflet_layer_control.addLayerComparison($accordion);
    leaflet_layer_control.addGeoOverview($accordion);
    leaflet_layer_control.addRotationHelper($accordion);


    //The Layer Controls should also be built and added later in another script, something like:
    // var options = aoi_feature_edit.buildTreeLayers();
    // leaflet_layer_control.addLayerControl(map, options, $accordion);

    return $accordion;
};

leaflet_layer_control.addPreferenceListener = function($accordion){
    var lastOpened = store.get('leaflet_layer_control.layer_accordion');
    if (lastOpened) {
        $('#'+lastOpened).collapse('toggle');
    } else {
        // by default, open work cell details
        $('#collapse-work-cell-details').collapse('toggle');
    }

    //Use a cookie to remember last accordion window opened
    $accordion.on("shown",function(event){
        store.set('leaflet_layer_control.layer_accordion',event.target.id);
    });
};

leaflet_layer_control.addFeatureInfo = function($accordion){
    var $content = leaflet_layer_control.buildAccordionPanel($accordion,"Feature Details");
    leaflet_layer_control.$feature_info = $("<div>")
        .html("Click a feature on the map to see an information associated with it")
        .appendTo($content);
};

leaflet_layer_control.pan = function(dir, amt) {
    var map =  aoi_feature_edit.map;
    var mapsize = map.getSize();
    if(amt === null || amt === undefined) {
        var ms = aoi_feature_edit.map.getSize();
        if(dir === 0 || dir === 180)
            amt = mapsize.y / 4;
        else amt = mapsize.x / 4;
    }
    switch(dir) {
        case 0: map.panBy([0, -1*amt]); break;
        case 90: map.panBy([amt, 0]); break;
        case 180: map.panBy([0, amt]); break;
        case 270: map.panBy([-1*amt,0]); break;
    }
};
leaflet_layer_control.rotateMap = function(deg) {
    var map = document.getElementById("map");
    var rh = document.getElementById("roseHolder");


    map.style.webkitTransform = 'rotate('+deg+'deg)';
    map.style.mozTransform    = 'rotate('+deg+'deg)';
    map.style.msTransform     = 'rotate('+deg+'deg)';
    map.style.oTransform      = 'rotate('+deg+'deg)';
    map.style.transform       = 'rotate('+deg+'deg)';

    rh.style.webkitTransform = 'rotate('+deg+'deg)';
    rh.style.mozTransform    = 'rotate('+deg+'deg)';
    rh.style.msTransform     = 'rotate('+deg+'deg)';
    rh.style.oTransform      = 'rotate('+deg+'deg)';
    rh.style.transform       = 'rotate('+deg+'deg)';

};

leaflet_layer_control.addRotationHelper = function($accordion) {
     var rh = leaflet_layer_control.buildAccordionPanel($accordion,"Rotation Helper");
     var rhHTML = '<div style="overflow:hidden;background-color: white;"><div id="roseHolder" >'+
    '<div><span onclick="leaflet_layer_control.pan(0)">N</span></div>'+
    '<div><span onclick="leaflet_layer_control.pan(270)">E</span>'+
    '<img src="/static/images/200px-rose-bw.png " /><span onclick="leaflet_layer_control.pan(90)">W</span></div>'+
    '<div><span onclick="leaflet_layer_control.pan(180)">S</span></div></div></div>'+
    '<div id="roseSpinner" style="background-color: white;"><input id="roseSpinnerInput" type="range" min="-180" max="180" value="0" oninput="leaflet_layer_control.rotateMap(this.value)" />' +
    '&nbsp;<button id="spinnerResetButton">Reset</button></div>';
    var rhdom = $(rhHTML);
    rhdom.appendTo(rh);
    $("#spinnerResetButton").click(function(evt) { leaflet_layer_control.rotateMap(0); $("#roseSpinnerInput").val(0); });

};
leaflet_layer_control.addGeoOverview = function($accordion) {
    var go = leaflet_layer_control.buildAccordionPanel($accordion,"Geo Overview");
    var ghtml = "<div id='goMap'></div><div id='goMapStatus' "
        +"style='text-align:center; color:red;'></div>";
    var godom = $(ghtml);
    godom.appendTo(go);
    $("#goMap").height(250);
    var big = aoi_feature_edit.map;
    var minimap = L.map("goMap", {
        center: big.getCenter(),
        zoom: big.getZoom(),
        dragging: false,
        touchZoom: false,
        scrollWheelZoom: false,
        doubleClickZoom: false,
        boxZoom: false,
        tap: false,
        keyboard: false,
        zoomControl :false,
        attributionControl: false,

    });
    var osmAttr = '&copy; <a href="http://openstreetmap.org">OpenStreetMap</a> contributors, <a href="http://creativecommons.org/licenses/by-sa/2.0/">CC-BY-SA</a>';
    var defaultLayer =L.tileLayer('http://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',{attribution: osmAttr});
    defaultLayer.addTo(minimap);
    setTimeout(function() { minimap.fitBounds(big.getBounds());}, 500);
    var aoi_extents = L.geoJson(aoi_feature_edit.aoi_extents_geojson,
        {
            style: leaflet_helper.styles.extentStyle_hollow,
            zIndex: 1000,
            name: "Bounds of this AOI"
    });
    aoi_extents.addTo(minimap);
    var aeb = aoi_extents.getBounds();
    var asd = aeb.getSouthWest().distanceTo(aeb.getSouthEast());
    var bb = big.getBounds();
    var viewRect = L.rectangle([bb.getNorthWest(), bb.getNorthEast(),
        bb.getSouthEast(), bb.getSouthWest],
        {"weight": 2, "color": "green", "opacity": 1, "fillOpacity":.25 }
     );
     viewRect.addTo(minimap);
     big.on("moveend", function(evt) {
        var bigBounds = big.getBounds();
        viewRect.setBounds(bigBounds);
        if(aeb.intersects(bigBounds)) {
            var bsd = bigBounds.getSouthWest().distanceTo(bigBounds.getSouthEast());
            if((bsd/asd) > 10 ) {
                $("#goMapStatus").html("Zoom Warning")
            } else $("#goMapStatus").html("");
        } else
            $("#goMapStatus").html("AOI out of view");


     });
}

leaflet_layer_control.addLayerComparison = function($accordion) {

    var c = leaflet_layer_control.buildAccordionPanel($accordion,"Layer Comparison");

    var chtml = "<div>" +
        "<div style='text-align: center'>" +
        "    <select id='comparisonLayer1'></select>" +
        "    <span id='comparisonLayerStatus1'></span><br />" +
        "    <select id='comparisonLayer2'></select>"+
        "    <span id='comparisonLayerStatus1'></span>"+
        "</div>"+
        " <div style='text-align: center'>"+
        "    <input id='comparisonSlider' style='display: none' type='range' min='-50' max='50' step='5' value='0' oninput='aoi_feature_edit.handleComparisonSlide(this.value)' />"+
        "    <br />"+
        "    <button id='comparisonButton' onclick='aoi_feature_edit.startOrEndComparison(this)'>Start</button>"+
        " </div>"+
    "</div>";
    var cdom = $(chtml);
    cdom.appendTo(c);
    var overlays = aoi_feature_edit.layers.base.concat(aoi_feature_edit.layers.overlays);


    if(!overlays || overlays.length < 2) {
        var cb = document.getElementById("comparisonButton");
        cb.disabled = true;
        cb.innerHTML = "Unavailable";
    } else {
        var optionHTML = "";
        for(var i = 0; i<overlays.length; i++) {
            optionHTML += "<option value='" + i + "'>" + overlays[i].name + "</option>";
        }
        $("#comparisonLayer1").html(optionHTML).prop("selectedIndex", 0);
        $("#comparisonLayer2").html(optionHTML).prop("selectedIndex", 1);
    }

    aoi_feature_edit.startOrEndComparison = function(b) {
        $("#comparisonSlider").toggle();
        if(b.innerHTML === "Reset") {
         b.innerHTML = "Start";
         aoi_feature_edit.resetOverlays();
        } else {
            var overlay1 = overlays[$("#comparisonLayer1").val()];
            var overlay2 = overlays[$("#comparisonLayer2").val()];
            overlay1.setOpacity(.5);
            overlay2.setOpacity(.5);
            b.innerHTML = "Reset";
        }
    };
    aoi_feature_edit.handleComparisonSlide = function(val) {
        var v1 = (50-Number(val))/100.;
        var v2 = (50+Number(val))/100.;

        var overlay1 = overlays[$("#comparisonLayer1").val()];
        var overlay2 = overlays[$("#comparisonLayer2").val()];
        overlay1.setOpacity(v1);
        overlay2.setOpacity(v2);
    };
    aoi_feature_edit.resetOverlays = function() {
        for(var i=0; i<overlays.length; i++) {
            var overlay = overlays[i];
            if(overlay.config && overlay.config.opacity)
                overlay.setOpacity(overlay.config.opacity);
        }
    };
}

leaflet_layer_control.addLogInfo = function($accordion) {

    var $content = leaflet_layer_control.buildAccordionPanel($accordion, "Workcell Log");
    var $messageScroll = $("<div id='message_scroll'>")
        .addClass("message-panel")
        .appendTo($content);
    var $messageTable = $("<table id='message_table'>")
        .addClass("table table-bordered header-fixed")
        .appendTo($messageScroll);
    var $header = $("<thead><tr><th>DateTime</th><th>User</th><th>Comment</th></tr></thead>")
        .appendTo($messageTable);
    var $body = $("<tbody id='messages'></tbody>")
        .appendTo($messageTable);
    var $buttonRow = $("<div id='button_row'>")
        .appendTo($content);
    $("<button>Submit a Comment</button>")
        .addClass("btn btn-primary")
        .click(leaflet_layer_control.submitComment)
        .appendTo($buttonRow);

    leaflet_layer_control.refreshLogInfo();
};
leaflet_layer_control.submitComment = function() {
    BootstrapDialog.show({
        title: 'Submit Comment',
        message: "Comment: <input type='text' maxlength='200'>",
        buttons: [{
            label: 'Submit',
            action: function(dialog) {
                var text = dialog.getModalBody().find('input').val();
                $.ajax({
                    url: leaflet_helper.home_url+"aois/work/" + aoi_feature_edit.aoi_id + "/comment",
                    type: 'POST',
                    data: {
                        comment : text,
                        csrfmiddlewaretoken: aoi_feature_edit.csrf
                    }
                })
                .done( function (msg) {
                    leaflet_layer_control.refreshLogInfo();
                    dialog.close();
                });
            }
        }, {
            label: 'Cancel',
            action: function(dialog) {
                dialog.close();
            }
        }]
    });
};
leaflet_layer_control.refreshLogInfo = function() {
    var body = $('#messages');
    if ($('#messages tr').length > 0) {
        body.empty();
    }

    $.ajax({
            url: aoi_feature_edit.api_url_log,
            dataType: "json"
        })
        .done(function(entries) {
            body.empty();
            entries = entries.reverse();
            _.each(entries, function(entry) {
                $("<tr><td>" + entry.timestamp + "</td><td>" +
                    entry.user + "</td><td>" + entry.text + "</td></tr>")
                    .appendTo(body);
            })
        });

};

leaflet_layer_control.buildAccordionPanel = function($accordion,title){
    var sectionName = _.str.dasherize(_.str.stripTags(title));

    var $drawerHolder = $("<div>")
        .addClass("accordion-group")
        .appendTo($accordion);
    var $drawerInner = $("<div>")
        .addClass("accordion-heading gray-header")
        .appendTo($drawerHolder);
    $('<a class="accordion-collapse" data-toggle="collapse" data-parent="#layer-control-accordion" href="#collapse'+sectionName+'">')
        .text(title)
        .appendTo($drawerInner);

    var $contentHolder = $('<div id="collapse'+sectionName+'" class="accordion-body collapse">')
        .appendTo($drawerHolder);
    var $content = $("<div>")
        .addClass('accordion-inner')
        .appendTo($contentHolder);

    leaflet_layer_control.accordion_sections.push('#collapse'+sectionName)

    return $content;
};

leaflet_layer_control.addWorkCellInfo = function($accordion) {

    if (!_.isObject(aoi_feature_edit.aoi_properties)){
        log.error("No Workcell Properties set for building side menu");
        return;
    }

    var editableUrl = leaflet_helper.home_url+'api/job/update/'+aoi_feature_edit.aoi_id;

    var $content = leaflet_layer_control.buildAccordionPanel($accordion,"Work Cell Details");
    $content.attr({id:"drawer_tray_top"});

    var workcell_note = 'Click here to add a note';
    $.each(aoi_feature_edit.aoi_properties, function(index, value) {

        var skipIt = false;
        if (index == 'workcell_note') {
            workcell_note = value;
            skipIt = true;
        } else if (index == 'status') {
            skipIt = true;
            var $status = $('<div>')
                .addClass('status_block')
                .html('<b>Status</b>: ')
                .appendTo($content);
            $('<span class="editable" id="status" style="display: inline">'+_.str.capitalize(value)+'</span>')
                .appendTo($status)
                .editable(editableUrl, {
                    data   : " {'Unassigned':'Unassigned','In work':'In work', 'In review':'In review', 'Completed':'Completed'}",
                    type   : 'select',
                    submit : 'OK',
                    style  : 'inherit',
                    tooltip: 'Click to change the status of this cell'
                });
        } else if (index == 'priority') {
            skipIt = true;
            var $status = $('<div>')
                .addClass('status_block')
                .html('<b>Priority</b>: ')
                .appendTo($content);
            $('<span class="editable tight" id="priority" style="display: inline">'+_.str.capitalize(aoi_feature_edit.priority)+'</span>')
                .appendTo($status)
                .editable(editableUrl, {
                    data   : " {'1':'1','2':'2','3':'3','4':'4','5':'5'}",
                    type   : 'select',
                    submit : 'OK',
                    style  : 'inherit',
                    tooltip: 'Click to change the priority of this cell'
                });
        }

        if (!skipIt){
            var html = '<b>'+_.str.capitalize(index)+'</b>: '+_.str.capitalize(value);
            $('<div>')
                .addClass('status_block')
                .html(html)
                .appendTo($content);
        }
    });

    //Add the note editing piece at the end
    $('<div>')
        .addClass('editable')
        .attr('id','workcell_note')
        .html(workcell_note)
        .appendTo($content)
        .editable(editableUrl, {select:true});

    // add function buttons
    var $submitDiv = $('<div>')
        .addClass("dropdown")
        .appendTo($content);

    var $ul2 = $('<ul>');

    var $exportButton = $("<a>")
        .addClass("btn dropdown-toggle")
        .attr({id:'export-button-dropdown', 'data-toggle':"dropdown", type:"button", href:'#'})
        .css({textAlign: "left"})
        .click(function(){
            $ul2.dropdown('toggle');
            return false;
        })
        .append($('<span>Export</span>'))
        .append($('<b class="caret"></b>'))
        .appendTo($submitDiv);

    $ul2
        .addClass("dropdown-menu")
        .css({textAlign: "left", left: '30px'})
        .attr("role", "menu")
        .appendTo($submitDiv);

    var $li21 = $('<li>')
        .attr({role:"presentation"})
        .appendTo($ul2);
    $("<a>")
        .attr({role:"menuitem", tabindex:"-1", href:"#"})
        .text("Job as KML")
        .on("click",function(ev){
            window.open(aoi_feature_edit.api_url_job_kml, "_blank");
            $ul2.dropdown("toggle");
            return false;
        })
        .appendTo($li21);

    var $li22 = $('<li>')
        .attr({role:"presentation"})
        .appendTo($ul2);
    $("<a>")
        .attr({role:"menuitem", tabindex:"-1", href:"#"})
        .text("Job as Networked KML")
        .on("click",function(ev){
            window.open(aoi_feature_edit.api_url_job_kml_networked, "_blank");
            $ul2.dropdown("toggle");
            return false;
        })
        .appendTo($li22);

    var $li23 = $('<li>')
        .attr({role:"presentation"})
        .appendTo($ul2);
    $("<a>")
        .attr({role:"menuitem", tabindex:"-1", href:"#"})
        .text("Job as GeoJSON")
        .on("click",function(ev){
            window.open(aoi_feature_edit.api_url_job_georss, "_blank");
            $ul2.dropdown("toggle");
            return false;
        })
        .appendTo($li23);

    var $li24 = $('<li>')
        .attr({role:"presentation"})
        .appendTo($ul2);
    $("<a>")
        .attr({role:"menuitem", tabindex:"-1", href:"#"})
        .text("This Cell's bounds as GeoJSON")
        .on("click",function(ev){
            window.open(aoi_feature_edit.api_url_aoi_georss, "_blank");
            $ul2.dropdown("toggle");
            return false;
        })
        .appendTo($li24);

};
leaflet_layer_control.removePythonDateTime = function(value) {
    var isUTC = _.str.endsWith(value,"UTC");
    if (isUTC) {
        var newValue = value.substr(0,value.length-3)+"+0000";
        var tryMoment = moment(newValue);
        if (tryMoment && tryMoment.isValid()){
            var cal = tryMoment.calendar();
            var dtg = tryMoment.format('YYYY-MM-DD HH:mm');
            value = "<span title='"+dtg+"'>"+cal+"</span>";
        }
    }
    return value;
};
leaflet_layer_control.show_feature_info = function (feature) {

    var $content = leaflet_layer_control.$feature_info;
    if (!feature || !feature.properties || !$content || jQuery.isEmptyObject($content)) {
        return;
    }
    $content.empty();

    var editableUrl = leaflet_helper.home_url+'api/feature/update/'+feature.properties.id;

    var feature_note_original = "Click here to add a note to this feature";
    var feature_note = feature_note_original;
    $.each(feature.properties, function(index, value) {

        var skipIt = false;
        if (index == 'feature_note') {
            feature_note = value;
            skipIt = true;
        } else if (index == 'mapText') {
            skipIt = true;
            var $status = $('<div>')
                .html('<b>Map Text</b>: ')
                .appendTo($content);
            $('<span class="editable" id="mapText" style="display: inline">'+value+'</span>')
                .appendTo($status)
                .editable(editableUrl, {
                    select:true,
                    tooltip: 'Enter text if it should be shown as a map overlay',
                    callback:function(newText,settings){
                        if (feature.layer && feature.layer._icon) {
                            //Find the layer item and update it's text and text size
                            var $icon = $(feature.layer._icon);
                            $icon.text(newText);

                            var mapTextSize = aoi_feature_edit.getMapTextDivSize(newText);
                            $icon.css({width:mapTextSize[0]+'px',height:mapTextSize[1]+'px'});
                        }
                    }
                });
        } else if (index == 'status') {
            skipIt = true;
            var $status = $('<div>')
                .addClass('status_block')
                .html('<b>Status</b>: ')
                .appendTo($content);
            $('<span class="editable" id="status" style="display: inline">'+_.str.capitalize(value)+'</span>')
                .appendTo($status)
                .editable(editableUrl, {
                    data   : " {'Unassigned':'Unassigned','In work':'In work', 'In review':'In review', 'Completed':'Completed'}",
                    type   : 'select',
                    submit : 'OK',
                    style  : 'inherit',
                    tooltip: 'Click to change the status of this cell'
                });

        } else if (index == 'linked_items') {
            skipIt = true;
            if (_.isArray(value) && value.length) {
                var $status = $('<div>')
                    .appendTo($content);
                $('<div>')
                    .html('<b>Linked Items:</b>')
                    .addClass('status-block')
                    .appendTo($status);

                _.each(value,function(linked_item){
                    var properties = linked_item.properties;
                    if (!_.isObject(properties)) properties = {};

                    var html = "";
                    if (linked_item.user) {
                        html += "Posted by "+linked_item.user+"</br>";
                    }
                    if (linked_item.created_at) {
                        if (moment(linked_item.created_at).isValid()){
                            html += "Linked "+moment(linked_item.created_at).calendar()+"</br>";
                        } else {
                            html += "Linked "+linked_item.created_at+"</br>";
                        }
                    }
                    if (properties) {
                        if (properties.name) {
                            html += "Name: <b>"+ _.str.truncate(properties.name,80)+"</b></br>";
                        }
                        if (properties.source) {
                            html += "From "+properties.source+"</br>";
                        }
                        if (properties.id) {
                            html += "Source ID: "+ _.str.truncate(properties.id,9)+"</br>";
                        }
                        if (properties.thumbnail) {
                            html += "<img src='"+properties.thumbnail+"' width='100'><br/>";
                        }
                        if (properties.image) {
                            html += "<a href='"+properties.image+"' target='_blank'>Linked Image</a>";
                        }
                    }
                    var img = $('<div>')
                        .addClass('linked-item status_block')
                        .popover({
                            title:'Linked ' + properties.source + ' Item',
                            content:JSON.stringify(properties)||"No properties",
                            trigger:'click',
                            placement:'right'
                        })
                        .html(html)
                        .appendTo($status);
                });
            }
        } else {
            value = leaflet_layer_control.removePythonDateTime(value);

            var schemaSettings = leaflet_layer_control.featureSchemaSelect(feature, index);
            if (schemaSettings && schemaSettings.type) {
                skipIt = true;
                var $schemaItem = $('<div>')
                    .html('<b>'+ _.str.capitalize(index)+'</b>: ')
                    .appendTo($content);
                $('<span class="editable" id="'+index+'" style="display: inline">'+_.str.capitalize(value)+'</span>')
                    .appendTo($schemaItem)
                    .editable(editableUrl, {
                        data   : schemaSettings.data,
                        type   : schemaSettings.type,
                        submit : 'OK',
                        style  : 'inherit',
                        tooltip: 'Click to change this value',
                        callback:function(newText,settings){
                            var property_name = this.id;
                            if (feature.properties) {
                                feature.properties[property_name] = newText;
                            }
                        }

                    });
            }
        }

        if (!skipIt && _.isString(value)){
            var html = '<b>'+_.str.capitalize(index)+'</b>: '+_.str.capitalize(value);
            $('<div>')
                .html(html)
                .appendTo($content);
        }
    });

    //Add the note editing piece at the end
    $('<div>')
        .addClass('editable')
        .attr('id','feature_note')
        .html(feature_note)
        .appendTo($content)
        .editable(editableUrl, {
            select : true,
            tooltip: 'Set a note on this feature'
        });

};
leaflet_layer_control.featureSchemaSelect = function (feature, index) {
    var settings = {};

    //data   : " {'Unassigned':'Unassigned','In work':'In work', 'In review':'In review', 'Completed':'Completed'}",
    var styles = feature.style || {};

    if (styles && styles.schema && _.isArray(styles.schema)) {
        var schemaInfo = _.find(styles.schema, function(setting) {return setting.property==index;});

        if (schemaInfo && schemaInfo.options) {
            settings.type = "select";
            settings.data = {};
            _.each(schemaInfo.options, function(opt){
               settings.data[opt] = opt;
            });
        } else if (schemaInfo && schemaInfo.text) {
            //TODO: check
            settings.type = "text";
            settings.data = null;
        }
    }
    return settings;
};
leaflet_layer_control.show_info = function (objToShow, node) {
    var html_objects = [];

    if (typeof objToShow == "string"){
        html_objects.push(objToShow);
    } else {
        if (objToShow.options && objToShow._leaflet_id) {
            //Probably a Leaflet layer
            html_objects.push(leaflet_layer_control.parsers.infoFromLayer(objToShow));
            html_objects.push(leaflet_layer_control.parsers.opacityControls(objToShow));
            html_objects.push(leaflet_layer_control.parsers.dynamicParamsControls(objToShow));

            if (leaflet_layer_control.likelyHasFeatures(objToShow)) {
                var $btn = $('<a href="#" class="btn">Refresh based on current map</a>')
                    .on('click',function(){
                        leaflet_helper.constructors.geojson(objToShow.config, aoi_feature_edit.map, objToShow);
                    });
                html_objects.push($btn);
            }
        } else if (objToShow.name && objToShow.url && objToShow.type) {
            //Probably a map info object
            html_objects.push(leaflet_layer_control.parsers.infoFromInfoObj(objToShow));
        } else {

            if (typeof objToShow == "object"){
                var obj_size = _.toArray(objToShow).length;
                if (obj_size > 1) {
                    //Show all items from the object
                    html_objects.push(leaflet_layer_control.parsers.infoFromObject(objToShow));
                } else {
                    //Likely a title/folder of the tree
                    html_objects.push(leaflet_layer_control.parsers.infoFromFolder(node));
                }
            }
        }
    }

    //Clear the tray and add each html object generated from above
    if (leaflet_layer_control.$drawer_tray) {
        leaflet_layer_control.$drawer_tray.empty();
        _.each(html_objects, function (html) {
            leaflet_layer_control.$drawer_tray.append(html);
        });
    }
};
//=========================================

leaflet_layer_control.parsers = {};
leaflet_layer_control.parsers.infoFromLayer = function (obj){
    var html = "";
    obj = obj || {};

    var capabilitiesLink = "";
    if (obj.type == "WMS" || obj.type == "WMTS") {
        capabilitiesLink = "?request=GetCapabilities";
    }
    html+=leaflet_layer_control.parsers.textIfExists({name: obj.name, title:"Layer", header:true, linkit:obj._url, linkSuffix:capabilitiesLink});

    if (obj._layers) {
        var features = obj.getLayers();
        var count = features.length;
        html+=leaflet_layer_control.parsers.textIfExists({name: count, title:"Features in this job"});

        var number_by_analyst = 0;
        _.each (features,function(feature){
            var properties = feature.feature ? feature.feature.properties || {} : {};
            if (properties.analyst == aoi_feature_edit.analyst_name) {
                number_by_analyst++;
            }
        });

        if (number_by_analyst){
            html+=leaflet_layer_control.parsers.textIfExists({name: number_by_analyst, title:"Features you entered"});
        }
        //TODO: Some way to highlight these or show more info?
    }
    if (obj.options) {
        html+=leaflet_layer_control.parsers.textIfExists({name: obj.options.attribution});
        html+=leaflet_layer_control.parsers.textIfExists({name: obj.options.layers, title:"Layers"});
    }

    return html;
};
leaflet_layer_control.parsers.infoFromInfoObj = function (obj){
    var html = "";
    obj = obj || {};

    html+=leaflet_layer_control.parsers.textIfExists({name: obj.name, title:"Layer", header:true, linkit:obj.url, linkSuffix:"?request=GetCapabilities"});
    html+=leaflet_layer_control.parsers.textIfExists({name: obj.type, title:"Type"});
    html+=leaflet_layer_control.parsers.textIfExists({name: obj.layer, title:"Layers"});
//    html+=leaflet_layer_control.parsers.textIfExists({name: obj.description, style_class:'scroll-link'});
    return html;
};
leaflet_layer_control.parsers.infoFromObject = function (obj){
    var html = "";
    for(var k in obj) {
        html+=leaflet_layer_control.parsers.textIfExists({name: obj[k], title:k});
    }
    return html;
};
leaflet_layer_control.parsers.infoFromFolder = function (obj){
    var html = "";
    obj = obj || {};
    html+=leaflet_layer_control.parsers.textIfExists({name: obj.title, title:"Group", header:true});
    if (obj.children) {
        var children = _.pluck(obj.children,'title').join(", ");
        html+=leaflet_layer_control.parsers.textIfExists({name: children, title:"Sub-layers"});
    }
    html+=leaflet_layer_control.parsers.textIfExists({name: obj.selected, title:"Selected"});

    return html;
};
leaflet_layer_control.parsers.textIfExists = function(options) {
    options = options || {};
    var obj = options.name;
    var title = options.title || "";
    var noBold = options.noBold;
    var noBreak = options.noBreak;
    var header = options.header;
    if (header) noBreak = true;
    var linkit = options.linkit;
    var linkify = options.linkify;
    var linkSuffix = options.linkSuffix;
    var style = options.style;
    var style_class = options.style_class;
    var datify = options.datify;
    var suffix = options.suffix;

    var html = "";
    if (typeof obj != "undefined" && obj !== "") {
        if (header) {
            html+="<h5>";
        }
        if (title){
            if (noBold){
                html+= title +": ";
            } else {
                html+= "<b>"+title+":</b> ";
            }
        }
        if (obj.toString) {
            var text = obj.toString();
            if (datify && typeof moment != "undefined") {
                var tempDate = moment(text);
                if (tempDate.isValid()) {
                    if (datify == "calendar") {
                        text = tempDate.calendar();
                    } else if (datify == "calendar, fromnow"){
                        text = tempDate.calendar() + " - " + tempDate.fromNow();
                    } else {
                        text = tempDate.fromNow();
                    }
                }
            }
            if (suffix) text+=suffix;
            if (linkify || linkit) {
                html += "<a target='_new' href='"+ (linkit || text);
                if (linkSuffix){
                    html += linkSuffix;
                }
                html += "'>" + text + "</a>";
            } else {
                html += text;
            }
        } else {
            log.error("Something was sent to a layer info area that wasn't valid text");
            html += obj || "";
        }
        if (header) {
            html+="</h5>";
        }
        if ((style || style_class) && html){
            var style_input = "";
            if (style) {
                style = style.replace(/'/g, '"');
                style_input += " style='"+style+"'";
            }
            if (style_class) {
                style_input += " class='"+style_class+"'";
            }
            html = "<span "+style_input+">"+html+"</span>";
        }
        if (!noBreak && html){
            html += "<br/>";
        }
    }

    return html;
};

leaflet_layer_control.parsers.opacityControls = function(layer) {
    //TODO: Replace this with a slider
    if (!layer || !layer.options || typeof layer.options.opacity=="undefined") {
        return undefined;
    }
    var opacity = Math.round(layer.options.opacity * 100)+"%";
    var $opacity = $('<div>');
    var $opacity_title = $("<span>")
        .html("Opacity: <b>"+opacity+"</b> (")
        .appendTo($opacity);
    _.each([100,75,50,25,0],function(num){
        $("<span>")
            .text(num+"% ")
            .css({color:'#39c',cursor:'pointer'})
            .bind('click mouseup',function(){
                leaflet_layer_control.setLayerOpacity(layer,num/100);
                $opacity_title
                    .html("Opacity: <b>"+(num)+"%</b> (");
            })
            .appendTo($opacity);
    });
    $("<span>")
        .html(")")
        .appendTo($opacity);
    return $opacity;
};

/**
 * HTML renderer for dynamic parameters controls in the side bar.
 */
leaflet_layer_control.parsers.dynamicParamsControls = function(layer) {
    "use strict";
    if (!layer || !layer.config || !layer.config.dynamicParams) {
        return undefined;
    }

    var dynamic_params_element = document.createElement("div");
    var dynamic_params_title = document.createElement("span");
    dynamic_params_title.textContent = "Dynamic Feed Parameters";
    dynamic_params_element.appendChild(dynamic_params_title);

    for (var idx in layer.config.dynamicParams) {
        var param = layer.config.dynamicParams[idx];
        var e_param;
        if (leaflet_layer_control.parsers.dynamic_param_parsers[param.type]) {
            e_param = leaflet_layer_control.parsers.dynamic_param_parsers[param.type](layer, param);
        } else {
            e_param = leaflet_layer_control.parsers.dynamic_param_parsers.String(layer, param);
        }
        dynamic_params_element.appendChild(e_param);
    }

    return dynamic_params_element;
};

leaflet_layer_control.parsers.dynamic_param_parsers = {};

leaflet_layer_control.parsers.dynamic_param_parsers.__generic = function(layer, param, input) {
    "use strict";
    var wrapper = document.createElement("div");
    wrapper.className = "input-append input-prepend";


    var label = document.createElement("span");
    label.className = "add-on";
    label.textContent = param.name;

    var button = document.createElement("button");
    button.type = "submit";
    button.className = "btn btn-primary";
    button.textContent = "Change";
    $(button).click((function(lyr, name, inp) {
        return function() {
            leaflet_layer_control.setDynamicParam(lyr, name, inp.value)
        };
    })(layer, param.name, input));

    wrapper.appendChild(label);
    wrapper.appendChild(input);
    wrapper.appendChild(button);

    return wrapper;
}

leaflet_layer_control.parsers.dynamic_param_parsers.__group_box = function(layer, param, input) {
    "use strict";
    var wrapper = document.createElement("div");
    wrapper.className = "geoq-param-group clearfix";
    
    var label = document.createElement("label");
    label.textContent = param.name;
    label.className = "geoq-param-group-label";

    var button = document.createElement("button");
    button.type = "submit";
    button.className = "btn btn-primary pull-right";
    button.textContent = "Change";
    $(button).click((function(lyr, name, inp) {
        return function() {
            leaflet_layer_control.setDynamicParam(lyr, name, inp.value)
        };
    })(layer, param.name, input));

    wrapper.appendChild(label);
    wrapper.appendChild(input);
    wrapper.appendChild(button);

    return wrapper;
}

leaflet_layer_control.parsers.dynamic_param_parsers.String = function(layer, param) {
    "use strict";
    var input = document.createElement("input");
    input.type = "text";
    input.className = "input-small";
    input.value = layer.config.layerParams[param.name];

    return leaflet_layer_control.parsers.dynamic_param_parsers.__generic(layer, param, input);
};

leaflet_layer_control.parsers.dynamic_param_parsers.Date = function(layer, param) {
    "use strict";
    var input = document.createElement("input");
    input.type = "date";
    input.className = "input-medium";
    input.value = layer.config.layerParams[param.name];
    
    if (param.range) {
        var rangeFun = leaflet_layer_control.parsers.dynamic_param_ranges[param.range.type];
        if (rangeFun) rangeFun(input, param.range);
    }

    return leaflet_layer_control.parsers.dynamic_param_parsers.__group_box(layer, param, input);
};

leaflet_layer_control.parsers.dynamic_param_parsers.Number = function(layer, param) {
    "use strict";
    if (window.Slider && param.range) {
        var input = document.createElement("input");
        input.type = "number";
        input.className = "input-small";
        input.value = layer.config.layerParams[param.name];

        var wrapper = leaflet_layer_control.parsers.dynamic_param_parsers.__group_box(layer, param, input);

        if (param.range) {
            var rangeFun = leaflet_layer_control.parsers.dynamic_param_ranges[param.range.type];
            if (rangeFun) rangeFun(input, param.range, function() {
                if (input.min && input.max) { // Only create slider if we have a MIN and max
                    new Slider(input, {
                        min: parseFloat(input.min),
                        max: parseFloat(input.max),
                        step: parseFloat(input.step),
                        value: parseFloat(input.value)
                    });
                }
            });
        }

        return wrapper;
    } else {
        var input = document.createElement("input");
        input.type = "number";
        input.className = "input-small";
        input.value = layer.config.layerParams[param.name];

        if (param.range) {
            var rangeFun = leaflet_layer_control.parsers.dynamic_param_ranges[param.range.type];
            if (rangeFun) rangeFun(input, param.range);
        }

        return leaflet_layer_control.parsers.dynamic_param_parsers.__generic(layer, param, input);
    }
};

leaflet_layer_control.parsers.dynamic_param_ranges = {};

leaflet_layer_control.parsers.dynamic_param_ranges.FixedRange = function(numberInput, range, callback) {
    "use strict";
    numberInput.min = range.start;
    numberInput.max = range.end;
    numberInput.step = range.step;
    if (callback) callback();
    return numberInput;
}

leaflet_layer_control.parsers.dynamic_param_ranges.NumberCapIDRange = function(numberInput, range, callback) {
    "use strict";
    $.ajax({
            url: range.url,
            dataType: "json"
        })
        .done(function(entries) {
            numberInput.min = entries.objectIds[0];
            numberInput.max = entries.objectIds[entries.objectIds.length - 1];
            numberInput.step = range.step;
            if (callback) callback();
        });

    return numberInput;
}

//=========================================
leaflet_layer_control.layerDataList = function (options) {

    var treeData = [];

    var layerGroups = options.layers;

    var previouslyLookedAtLayers = store.get('leaflet_layer_control.layers') || "";
    previouslyLookedAtLayers = previouslyLookedAtLayers.split(",");

    //For each layer group
    _.each(layerGroups,function(layerGroup,groupNum){
        var layerName = options.titles[groupNum] || "Layers";
        var folderName = "folder."+ groupNum;
        var expanded = true;
        if (layerName == "Features" || layerName == "AOI Base Maps") expanded=false;
        treeData.push({title: layerName, folder: true, key: folderName, children: [], expanded:expanded });

        var inUSBounds = true;
        if (typeof maptools != "undefined" && aoi_feature_edit.map && aoi_feature_edit.map.getCenter) {
            var center = aoi_feature_edit.map.getCenter();
            inUSBounds = maptools.inUSBounds(center.lat, center.lng);
        }

        //If there are names, sort by them
//        layerGroup = _.sortBy(layerGroup,'name');

        //For each layer, build tree nodes
        _.each(layerGroup, function (layer, i) {
            var name = layer.name || layer.options.name;
            var layer_obj = {title: name, key: folderName+"."+i, data:layer};

            if (!layer.skipThis) {
                //If there are any later layers with same name/settings, mark them to skip
                leaflet_layer_control.removeDuplicateLayers(layerGroups,layer);

                //Check through cookie info to see if layer was previously selected
                var layerID;
                if (layer && layer.config && layer.config.id) layerID = layer.config.id+""; //NOTE: Convert it to string
                if (layer && layer.id) layerID = layer.id+"";

                var layerPreviouslyChosen = false;
                if (layerID && _.indexOf(previouslyLookedAtLayers,layerID) > -1) {
                    layerPreviouslyChosen = true;
                }

                //Figure out if it is visible and should be "checked"
                var showEvenIfNotInUS = true;
                if (layer.options && layer.options.us_only && !inUSBounds) {
                    showEvenIfNotInUS = false;
                }

                if (showEvenIfNotInUS || layerPreviouslyChosen) {
                    if (layer.getLayers && layer.getLayers() && layer.getLayers()[0]) {
                        var layerItem = layer.getLayers()[0];
                        var options = layerItem._options || layerItem.options;
                        if (options && options.style) {
                            if (options.style.opacity == 1 || options.style.fillOpacity == 1){
                                layer_obj.selected = true;
                            }
                        }
                        if (options && options.opacity && options.opacity == 1) {
                            layer_obj.selected = true;
                        }
                    } else if (layer.options && layer.options.opacity){
                        layer_obj.selected = true;
                    } else if (layer.options && layer.options.is_geoq_feature) {
                        layer_obj.selected = true;
                    }
                    if (layerPreviouslyChosen) layer_obj.selected = true;
                }
                if (!layer_obj.selected) {
                    leaflet_layer_control.setLayerOpacity(layer,0);
                }

                //Add this to the json to build the treeview
                treeData[groupNum].children.push(layer_obj);
            }
        },layerGroups);

        //Sort by order_by if it exists, otherwise sort by name or folder#
        var nodes = treeData[groupNum].children;
        if (nodes && nodes[0] && nodes[0].data && nodes[0].data.options && _.isNumber(nodes[0].data.options.order)) {
            treeData[groupNum].children = _.sortBy(nodes, function(obj){ return +obj.data.options.order });
        } else {
            treeData[groupNum].children = _.sortBy(nodes, function(obj){ return (obj.data && obj.data.name) ? obj.data.name : obj.key;});
        }

    },layerGroups);

    //Mark the parent groups as selected or not if all children are
    _.each(treeData,function(treeGroup){
        var anyLayerUnselected = false;
        _.each(treeGroup.children, function (treeItem) {
            if (!treeItem.selected) anyLayerUnselected = true;
        });
        treeGroup.selected = !anyLayerUnselected;
    });


    return treeData;
};
leaflet_layer_control.removeDuplicateLayers = function(layerList, layer){
    var layerSearchStart = false;

    _.each(layerList,function(layerGroup){
        _.each(layerGroup, function (layer_orig, layer_num) {
            if (layerSearchStart) {
                //It's been found previously, so only look at next layers
                var layerLookingAt = layerGroup[layer_num];
                //Check if names exist and are the same
                if (layer.name && layerLookingAt.name) {
                    if (layer.name == layerLookingAt.name) {
                        layerLookingAt.skipThis = true;
                    }
                //Check if the URL and Layer exist and are the same
                } else if (layer.url && layerLookingAt.url && layer.layer && layerLookingAt.layer) {
                    if ((layer.url == layerLookingAt.url) && (layer.layer == layerLookingAt.layer)) {
                        layerLookingAt.skipThis = true;
                    }
                }
            } else {
                if (layer_orig == layer) layerSearchStart = true;
            }
        });
    });
};


leaflet_layer_control.zIndexesOfHighest = 2;
leaflet_layer_control.setLayerOpacity = function (layer, amount, doNotMoveToTop){

    if (!layer.options) layer.options={};
    layer.options.opacity = amount;

    if (amount > 0) {
        layer.options.oldOpacity = amount;
    }

    if (layer.setStyle){
        layer.setStyle({opacity:amount, fillOpacity:amount});
    } else if (layer.setOpacity){
        try {
            layer.setOpacity(amount);
        } catch(err) {
            //For ESRI Dynamic Layers, sometimes not tracking layer correctly
            var reset = false;
            try {
                var main_layer = _.find(_.flatten(aoi_feature_edit.layers),function(l){return l.name==layer.name});
                if (main_layer && main_layer.setOpacity) {
                    main_layer.setOpacity(amount);
                    reset = true;
                }
            } catch(err){
                reset = false;
            }
            if (!reset) {
                log.error("Error while changing opacity for layer "+layer.name, err);
            }
        }
    }

    if (amount==0){
        if (layer._layers) {
            _.each(layer._layers,function(f){
                $(f._icon).hide();
                if (f._shadow){
                    $(f._shadow).hide();
                }
                // SRJ: do this for kml files with ground overlays
                if (f._image && f._image.style) {
                    f._image.style.opacity = amount;
                }
            });
        }
        if (layer.getContainer) {
            var $lc = $(layer.getContainer());
            $lc.zIndex(1);
            $lc.hide();
        } else if (layer._container) {
            $(layer._container).css('opacity',amount);
        }
    } else {
        if (layer._layers) {
            _.each(layer._layers,function(f){
                $(f._icon).show().css({opacity:amount});
                if (f._shadow){
                    $(f._shadow).show().css({opacity:amount});
                }
                // SRJ: do this for kml files with ground overlays
                if (f._image && f._image.style) {
                    f._image.style.opacity = amount;
                }
            });
        }
        if (layer.getContainer) {
            var $lc = $(layer.getContainer());
            if (!doNotMoveToTop) {
                leaflet_layer_control.zIndexesOfHighest++;
                $lc.zIndex(leaflet_layer_control.zIndexesOfHighest);
            }
            $lc.show();
        } else if (layer._container) {
            var $lc = $(layer._container);
            if (!doNotMoveToTop) {
                leaflet_layer_control.zIndexesOfHighest++;
                $lc.zIndex(leaflet_layer_control.zIndexesOfHighest);
            }
            $lc.css('opacity',amount);
        }
    }
};

/**
 * Sets a dynamic parameter for a layer (validating restrictions) and refreshes the layer.
 */
leaflet_layer_control.setDynamicParam = function(layer, param, setting, noRefresh) {
    console && console.log(param + " " + setting + " for " + layer);
    layer.config.layerParams[param] = setting;

    if (!noRefresh) leaflet_layer_control.refreshLayer(layer);
    //debugger;

    $.ajax({
        url: aoi_feature_edit.api_url_user_param,
        dataType:"json",
        method:'POST',
        contentType: "application/json; charset=utf-8",
        data: JSON.stringify({
            maplayer: layer.config.maplayer_id,
            param: param,
            newValue: setting
        })
    }).fail(function(x, status, err) {
        if (console) console.log(status);
    });
};

leaflet_layer_control.refreshLayer = function(layer) {
    window.test = layer;
    switch (test.config.type) {
        case "GeoJSON":
            leaflet_helper.constructors.geojson(layer.config, aoi_feature_edit.map, layer);
            break;
        default:
            layer.options = $.extend(layer.options, layer.config.layerParams);
            layer.redraw();
            break;
    }
    
}

leaflet_layer_control.addLayerControlInfoPanel = function($content){
    var $drawer_inner = $("<div>")
        .addClass("inner-padding")
        .appendTo($content);
    var $drawer_tray = $("<div>")
        .attr({id:"drawer_tray_bottom"})
        .addClass('drawer_tray')
        .appendTo($drawer_inner);

    leaflet_layer_control.$drawer_tray = $drawer_tray;
    $drawer_tray.html("Click a layer above to see more information.");
};


leaflet_layer_control.filetypeHelper = function(fileHandle, mimes,fileSuffix) {
    var ft = fileHandle.type;
    var fn = fileHandle.name;
    if(typeof(mimes) === "string") { mimes = [mimes] };
    for(var i=0; i<mimes.length; i++) {
        if(ft.match(mimes[i])) return true;
    }
    if(fileSuffix)  {
        var split = fn.split(".");
        if(split.length > 0)
            if(fileSuffix === split[split.length -1])
                return true;
    }

    return false;
};

leaflet_layer_control.stringHelper = function(binary, encoding) {
    var converted = null;
    if(window.TextDecoder) {
        var dv = new DataView(binary);
        var decoder = new TextDecoder(encoding);
        converted = decoder.decode(dv);
    } else {
        converted = String.fromCharCode.apply(null, new Uint8Array(binary));
    }

    return converted;

}
leaflet_layer_control.handleDrop = function(result, fileHandle) {
  var foundLayers = [];
  if(leaflet_layer_control.filetypeHelper(fileHandle, "kml", "kml")) {

    // we are making assumptions about the kml encoding
    // introspect the file encoding for i18n.
    var kmlString = leaflet_layer_control.stringHelper(result, "utf-8");

    var parser = new DOMParser();
    var kmlDOM = parser.parseFromString(kmlString, "text/xml");
    var foundLayers = L.KML.parseKML(kmlDOM);
  } else if(leaflet_layer_control.filetypeHelper(fileHandle, [], "zip")) {

    foundLayers = L.shapefile(result); // we'll get an unpopulated geojson layer even if this ISN'T a shape file
    if(foundLayers && foundLayers.getLayers && foundLayers.getLayers().length == 0) {
        foundLayers = null;
    }
  } else  if(leaflet_layer_control.filetypeHelper(fileHandle, ["geojson", "json"], "json")) {
    var jsonString = leaflet_layer_control.stringHelper(result, "utf-8");
    var json = JSON.parse(jsonString);
    foundLayers = L.geoJson(json);

  } else {

    alert("Sorry, only GeoSJON, KML, and shapefile zip archives are supported at the moment.");
  }
  if(foundLayers !== null && !(foundLayers instanceof Array))
    foundLayers = [foundLayers];
  if(foundLayers !== null) {
    var name =  fileHandle.name;
    for(var i=0; i<foundLayers.length; i++) {
        var layerName = name;
        if(i > 0) layerName = layerName + "-" + (i+1);
        var layer = foundLayers[i];
        if(layer.options)
          layer.options.name = layerName;
        layer.addTo(aoi_feature_edit.map);
        leaflet_layer_control.importNode.addChildren({title:layerName, folder:false, data:layer, selected:true});

    }
    } else {
        alert("Sorry, I couldn't find anything to import.");
    }


};
leaflet_layer_control.addLayerControl = function (map, options, $accordion) {

    //Hide the existing layer control
    $('.leaflet-control-layers.leaflet-control').css({display: 'none'});

    var $layerButton = $('<a id="toggle-drawer" href="#" class="btn">Tools <i id="layer-status"> </i><i id="layer-error"> </i></a>');
    var layerButtonOptions = {
        'html': $layerButton,
        'onClick': leaflet_layer_control.toggleDrawer,  // callback function
        'hideText': false,  // bool
        position: 'bottomright',
        'maxWidth': 60,  // number
        'doToggle': true,  // bool
        'toggleStatus': false  // bool
    };
    var layerButton = new L.Control.Button(layerButtonOptions).addTo(map);

    //Build the tree
    var $tree = $("<div>")
        .attr({name: 'layers_tree_control', id:'layers_tree_control'});

    //Build the layer schema
    var treeData = leaflet_layer_control.layerDataList(options);

    $tree.fancytree({
        checkbox: true,
        autoScroll: true,
        debugLevel: 1,
        selectMode: 3, // Hierarchecal select mode
        source: treeData,
        init: function (event, data) {
            leaflet_layer_control.drawEachLayer(data, map);
        },
        activate: function (event, data) {
            //Clicked on a treenode title
            var node = data.node;
            if (node && node.data) {
                leaflet_layer_control.show_info(node.data, node);
            }
        },
        deactivate: function (event, data) {},
        select: function (event, data) {
            // A checkbox has been checked or unchecked
            leaflet_layer_control.drawEachLayer(data,map);
            leaflet_layer_control.lastSelectedNodes = data.tree.getSelectedNodes();
        },
        focus: function (event, data) {},
        blur: function (event, data) {}
    });

    leaflet_layer_control.$tree = $tree;
    leaflet_layer_control.lastSelectedNodes = $tree.fancytree("getTree").getSelectedNodes();
    var $content = leaflet_layer_control.buildAccordionPanel($accordion,"Geo Layers for Map");

    $tree.appendTo($content);
    leaflet_layer_control.importNode = $("#layers_tree_control").fancytree("getRootNode").addChildren({title:"Imports", key:"imports", folder:true, selected:true});


    $('<div id="importDragTarget" title="Drag GeoJSON and KML files or Shapefile zip archives here" style="text-align: center;border: solid;border-width: thin;">Drag & Drop Import</div>')
        .appendTo($content);

    //TODO: Replace this with a form later to allow user to quick-add layers
    $('<a id="add_layer_button" href="/maps/layers/create" target="_new" class="btn">Add A Layer</a>')
        .appendTo($content);

    leaflet_layer_control.addLayerControlInfoPanel($content);

    var idt = document.getElementById("importDragTarget");
    fileDragHelper.stopWindowDrop();
    fileDragHelper.watchFor(idt, leaflet_layer_control.handleDrop, true);


    //If it was open last time, open it again
    if (store.get('leaflet_layer_control.drawer')) {
        leaflet_layer_control.toggleDrawer();
    }
};
leaflet_layer_control.drawEachLayer=function(data,map,doNotMoveToTop){

    // All of the layers currently checked
    var selectedLayers = data.tree.getSelectedNodes();
    // Layers that used to be checked, but are no longer
    var layersUnClicked = _.difference(leaflet_layer_control.lastSelectedNodes, selectedLayers);
    // Layers that used to be unchecked, but now are.
    var layersClicked = _.difference(selectedLayers, leaflet_layer_control.lastSelectedNodes);
    
    _.each(layersUnClicked,function(layer_obj){
        if (layer_obj && layer_obj.data && _.toArray(layer_obj.data).length) {
            var layer = layer_obj.data;

            leaflet_layer_control.setLayerOpacity(layer,0,doNotMoveToTop);
        } else if (layer_obj.children && layer_obj.children.length) {
            //A category was clicked
            if (layer_obj.partsel) {
                _.each(layer_obj.children, function(layer_obj_item){
                    if (!layer_obj_item.selected) {
                        layer_obj_item.setSelected(false);
                    }                   
                });
            }
            
        }
    });

    _.each(layersClicked,function(layer_obj){
        if (layer_obj && layer_obj.data && _.toArray(layer_obj.data).length) {
            var layer = layer_obj.data;

            if (layer._map && layer._initHooksCalled) {
                //It's a layer that's been already built
                var opacity = layer.options ? layer.options.opacity||layer.options.oldOpacity : 0;
                if (!opacity) {
                    opacity = layer.config ? layer.config.opacity : 1;
                }
                leaflet_layer_control.setLayerOpacity(layer,opacity,doNotMoveToTop);

                if (leaflet_layer_control.likelyHasFeatures(layer)) {
                    leaflet_helper.constructors.geojson(layer.config, map, layer);
                }
                
                aoi_feature_edit.map.addLayer(layer);
            } else {
                //It's an object with layer info, not yet built - build the layer from the config data
                var name = layer.name;
                if (!name && layer.options) name = layer.options.name;
//                log.info("Creating a map layer " + name+ " URL: " + layer.url);

                var newLayer = leaflet_helper.layer_conversion(layer, map);
                if (newLayer) {
                    aoi_feature_edit.map.addLayer(newLayer);
                    leaflet_layer_control.setLayerOpacity(newLayer,1,doNotMoveToTop);

                    layer_obj.data = newLayer;

                    //Replace the old object list with the new layer
                    _.each(aoi_feature_edit.layers,function(layerGroup,l_i){
                        _.each(layerGroup,function(layerGroupItem,l_l){
                            if (layerGroupItem.id == layer.id) {
                                layerGroup[l_l] = newLayer;
                            }

                        });
                    });

                    //TODO: This should be consolidated into one move event
                    //TODO: The 'refresh layer json' should be a function added to the layer
                    if (layer.type == "Social Networking Link" || layer.type == "Web Data Link" || (layer.config && layer.config.job)) {

                        if (layer.type == "Social Networking Link") {
                            leaflet_filter_bar.showInputTags();
                        }
                        //Run every 15 seconds after map move
                        var refreshFunction = _.debounce( function () {
                            log.log('Refreshing Layer at : '+new Date);
                            var currentOpacity = 1;
                            if (newLayer.options) {
                                currentOpacity = newLayer.options.opacity;
                            }
                            if (currentOpacity > 0) {
                                leaflet_helper.constructors.geojson(layer, map, newLayer);
                            }
                        },15000);
                        map.on('moveend viewreset',refreshFunction);
                    }
                }
            }
            if (layersClicked.length==1){
                layer_obj.setActive();
            }

        } else if (layer_obj.children && layer_obj.children.length) {
            //A category was clicked
            _.each(layer_obj.children, function(layer_obj_item){
                layer_obj_item.setSelected(true);
            });
        } else {
            log.error("A layer with no data was clicked");
        }
    });

    //Set a cookie with all viewed Layers
    var checkedIDs = [];
    _.each(data.tree.getSelectedNodes(),function(layer_obj){ // Use data.tree.getSelectedNodes() because we updated recursively so selectedNodes is not up to date
        if (layer_obj.data && layer_obj.data.config && layer_obj.data.config.id && layer_obj.parent.title!="Features") {
            checkedIDs.push(layer_obj.data.config.id);
        }
    });

    var checkedIDs_str = checkedIDs.join(",");
    store.set('leaflet_layer_control.layers', checkedIDs_str);

    store.set('leaflet_layer_control.selected_tree_nodes',_.map(data.tree.getSelectedNodes(), function(layer_obj) {
        return leaflet_layer_control._getLayerStorageID(layer_obj);
    }));
};

leaflet_layer_control._getLayerStorageID = function(layerTreeNode) {
    if (layerTreeNode.data && layerTreeNode.data.config && layerTreeNode.data.config.id) {
        return layerTreeNode.data.config.id;
    } else {
        var tree_objects = [layerTreeNode];
        while (tree_objects[0].parent) {
            tree_objects.unshift(tree_objects[0].parent);
        }

        return _.map(tree_objects, function(tree_obj) {
            return tree_obj.title;
        }).join(':');
    }
}

leaflet_layer_control._uninit_getLayerStorageID = function(uninitTreeNode, uninitTreeGroup) {
    // Get the layer id if it exists, otherwise get the folder it's in
    if (uninitTreeNode.data && uninitTreeNode.data.config && uninitTreeNode.data.config.id) {
        return uninitTreeNode.data.config.id;
    } else if (uninitTreeNode.data && uninitTreeNode.data.id) {
        // Social media feeds seem to have id set in data when uninitialized, then copied over to config after initialized.
        return uninitTreeNode.data.id;
    } else {
        return 'root:' + uninitTreeGroup.title + ":" + uninitTreeNode.title;
    }
}

leaflet_layer_control.toggleZooming=function($control){
    $control.on('mouseover',function(){
        var map=aoi_feature_edit.map;
        map.dragging.disable();
        map.touchZoom.disable();
        map.doubleClickZoom.disable();
        map.scrollWheelZoom.disable();
        if (map.tap) map.tap.disable();}
    ).on('mouseout',function(){
        var map=aoi_feature_edit.map;
        map.dragging.enable();
        map.touchZoom.enable();
        map.doubleClickZoom.enable();
        map.scrollWheelZoom.enable();
        if (map.tap) map.tap.enable();}
    );
};
leaflet_layer_control.likelyHasFeatures = function(layer){
    return ((layer.config && layer.config.type &&
            (layer.config.type=="GeoJSON" || layer.config.type=="Social Networking Link" || layer.config.type=="ESRI Identifiable MapServer")) ||
            (layer.config && layer.config.format && layer.config.format=="json"));
};

//--------------------------------------------
// Drawer open and closing controls
leaflet_layer_control.drawerIsOpen = false;
leaflet_layer_control.openDrawer = function() {
    leaflet_layer_control.$map.animate(
        {marginLeft: "300px"},
        {
            duration: 600,
            specialEasing: {
                width: "linear",
                height: "easeOutBack"
            }
        });
    leaflet_layer_control.$map.css("overflow", "hidden");
    leaflet_layer_control.$drawer.animate(
        {marginLeft: "0px"},
        {
            duration: 600,
            specialEasing: {
                width: "linear",
                height: "easeOutBack"
            }
        });
    store.set('leaflet_layer_control.drawer', 'open');
};
leaflet_layer_control.closeDrawer = function() {
    leaflet_layer_control.$map.animate({marginLeft: "0px"}, 300);
    leaflet_layer_control.$map.css("overflow", "auto");
    leaflet_layer_control.$drawer.animate({marginLeft: "-300px"}, 300);
    store.set('leaflet_layer_control.drawer', '');
};
leaflet_layer_control.toggleDrawer = function() {
    if(leaflet_layer_control.drawerIsOpen) {
        leaflet_layer_control.closeDrawer();
        leaflet_layer_control.drawerIsOpen = false;
    } else {
        leaflet_layer_control.openDrawer();
        leaflet_layer_control.drawerIsOpen = true;
    }
    setTimeout(aoi_feature_edit.mapResize, 400);
};
