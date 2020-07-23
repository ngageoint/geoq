/*
 Sparkle Query Builder plugin for geoq
 */
console.log("hellp")
var sparkle_builder = {};
sparkle_builder.title = "Sparkle Query Builder";
sparkle_builder.plugin_title = "Feature Search";
sparkle_builder.accordion_id = "#layer-control-accordion";

sparkle_builder.$content = null;
sparkle_builder.$accordion = null;
sparkle_builder.map = aoi_feature_edit.map;
sparkle_builder.results_layer_group = null;
sparkle_builder.workcellGeojson = aoi_feature_edit.aoi_extents_geojson;

sparkle_builder.init = function (options) {

    //Add a shim in to fill a jquery version gap
    if (typeof $.curCSS == "undefined") {
        $.curCSS = function (element, attrib, val) {
            $(element).css(attrib, val);
        }
    }
    if (options) sparkle_builder = $.extend(sparkle_builder, options);
    sparkle_builder.$accordion = $(sparkle_builder.accordion_id);
    sparkle_builder.buildAccordionPanel();

    if (!sparkle_builder.map && aoi_feature_edit && aoi_feature_edit.map) {
        sparkle_builder.map = aoi_feature_edit.map;
    }

    //Prepare Layer Group
    if (sparkle_builder.map) {
        sparkle_builder.results_layer_group = L.layerGroup()
        sparkle_builder.results_layer_group.addTo(sparkle_builder.map)
    }

};

sparkle_builder.buildAccordionPanel = function () {
    sparkle_builder.$title = leaflet_layer_control.buildAccordionPanel(sparkle_builder.$accordion, sparkle_builder.plugin_title);

    var nouns = ['Chinese', 'Airplane', 'Freighter', 'Fighter', 'Length', 'Air Battery', 'Shenyang J-11', 'Width', "Jet"]
    var verbs = ['Has', 'With']
    var descriptor = ['greater than', 'less than', 'equal to']

    var query_shenyang = [{"friendly_name" : "Airplane", "type" : "Shenyang J-11", "description" : "Lorem Ipsum Dolor Set Amet", "lat" : 9.558687, "lng" : 112.900143, "date" : "04/21/20"}]
    var query_chinese_wingspan = [{"friendly_name" : "Airplane", "type" : "Shenyang J-11", "description" : "Lorem Ipsum Dolor Set Amet", "lat" : 9.558687, "lng" : 112.895594, "date":"08/01/19"}, {"friendly_name" : "Fighter Jet", "type" : "Shijiazhuang Y-5", "description" : "Lorem Ipsum Dolor Set Amet", "lat" : 9.543282, "lng" : 112.879715, "date":"02/15/20"}]
    var query_chinese_air_battery = [{"friendly_name" : "Air Battery Wildwood", "type" : "Air Battery", "description" : "Lorem Ipsum Dolor Set Amet", "lat" : 9.556486, "lng" : 112.905550}, {"friendly_name" : "Air Battery Wildwood 2", "type" : "Air Battery", "description" : "Lorem Ipsum Dolor Set Amet", "lat" : 9.538965, "lng" : 112.877398, "date":"05/29/19"}]
    var query_chinese_freighter = [{"friendly_name" : "Danyao I AF", "type" : "StoresShip", "description" : "Island Supply Ship", "lat" : 9.551821, "lng" : 112.895551, "date":"10/22/19"}]

    var lastTerm = "noun"

    //Fake data
    var qb = new Bloodhound({
        datumTokenizer: Bloodhound.tokenizers.whitespace,
        queryTokenizer: Bloodhound.tokenizers.whitespace,
        local: [...nouns, ...verbs, ...descriptor]
      });


    //Build Content Holder
    sparkle_builder.$content = $(
        '<h3><small>Create Query Below</small></h3>' +
        '<div> \
            <div class="input-group"> \
                <span class="input-group-addon" id="basic-addon1"><i class="icon-search"></i></span> \
                <input class="form-control typeahead" id="sb_tags" type="text" value="" data-role="tagsinput" style="width:100%"> \
            </div> \
            <h5>Suggested Common Search Terms</h5> \
            <div class="container"> \
                <div class="row"> \
                    <div class="col-xs-2" style="width: 13%; padding-left: 2px; padding-right: 2px"> \
                        <div id="suggestion-list-noun" class="list-group"> \
                        </div> \
                    </div> \
                    <div class="col-xs-2" style="width: 13%; padding-left: 2px; padding-right: 2px"> \
                        <div id="suggestion-list-verb" class="list-group"> \
                        </div> \
                    </div> \
                </div> \
            </div> \
            <button id="sb_btn_clear" type="button" class="btn btn-default">Clear</button> \
            <button id="sb_btn_search" type="button" class="btn btn-primary">Search</button> \
        </div>').appendTo(sparkle_builder.$title);

    const suggestion_size = 5

    nouns.slice(0, suggestion_size).map(i => {
        $('#suggestion-list-noun').append('<button type="button" class="list-group-item list-group-item-action suggestion-btn">' + i +'</button>')
    })

    //For some reason JS gets mad if unwrap and then map in the same command?
    var combined = [...verbs, ...descriptor]
    combined.slice(0, suggestion_size).map(i => {
        $('#suggestion-list-verb').append('<button type="button" class="list-group-item list-group-item-action suggestion-btn">' + i +'</button>')
    })

    var input = $('input[data-role="tagsinput"]')
    input.tagsinput({
        typeaheadjs: {
          source: qb,
          name: 'QueryBuilder',
          autoselect: true
        },
        freeInput: true
    })

    // Fixes race condition
    $(".tt-input").blur(function() {
        $(".tt-input")[0].value = ""
    })

    $("#sb_btn").click( () => {
        alert(input.val())
    })

    $(".suggestion-btn").click(function (self) {
        input.tagsinput('add', self.target.innerHTML);
    })

    /*$('input').on('itemAdded', function(event) {
        /*if (lastTerm == "noun") {
            qb.clear()
            qb.local = [...verbs, ...descriptor]
            qb.initialize(true)
            lastTerm = "verb"
        } else {
            qb.clear()
            qb.local = nouns
            qb.initialize(true)
            lastTerm = "noun"
        }
    });*/


    $('#sb_btn_clear').click(() => {
        input.tagsinput('removeAll');
    });



    $('#sb_btn_search').click(() => {
        //alert(input.val())
        //42.503596, -71.223613
        sparkle_builder.results_layer_group.clearLayers()
        console.log(input.val())
        if ((input.val()).toLowerCase() == "chinese,airplane,with,wingspan,greater than,20,ft") {
            results = query_chinese_wingspan
        } else if ((input.val()).toLowerCase() == "chinese,freighter,length,greater than,450,ft") {
            results = query_chinese_freighter
        } else if ((input.val()).toLowerCase() == "chinese,air battery") {
            results = query_chinese_air_battery
        } else if  ((input.val()).toLowerCase() == "shenyang j-11") {
            results = query_shenyang
        } else {
            results = []
        }

        results.forEach(function (item, index) {
            console.log(item)
            sparkle_builder.results_layer_group.addLayer(new L.Marker([item.lat, item.lng]).bindPopup('<h4>Name: ' + item.friendly_name + '</h4><h3>Type: ' + item.type + '</h3><p>Observed Date</p>' + item.date ));
        })

    });


};


geoq.sparkle_builder = sparkle_builder;
