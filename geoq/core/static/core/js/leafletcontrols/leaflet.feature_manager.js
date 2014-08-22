var feature_manager = {};
feature_manager.features = {};
feature_manager.statuses = ['Unassigned','In Work','Awaiting Review','In Review','Completed','All'];
feature_manager.$status_buttons = [];

feature_manager.addStatusControl = function(map) {

    //Check that user has reviewer permissions
    if (!aoi_feature_edit.permissions_review) return;

    var $statusButton = $('<div class="btn-group">');
    $('<button class="btn">Features:</button>').appendTo($statusButton);

    _.each(feature_manager.statuses,function(status){
        var $btn = $('<button class="btn">')
            .text(status)
            .on('click',function(){
                var val = $(this).text();
                val = _.str.trim(_.str.strLeft(val,"("));
                if (val=="All") {
                    feature_manager.setOpacityToFull();
                } else {
                    feature_manager.setOpacityByProperty('status',val);
                }
            })
            .appendTo($statusButton);
        feature_manager.$status_buttons.push($btn);
    });

    var statusButtonOptions = {
        'html': $statusButton,
        'hideText': false,  // bool
        position: 'bottomleft',
        'maxWidth': 60,  // number
        'doToggle': true,  // bool
        'toggleStatus': false  // bool
    };
    new L.Control.Button(statusButtonOptions).addTo(map);

};
feature_manager.updateStatusButtonCounts=_.throttle(function(){
    var status_count = {};
    var count = 0;
    _.each(feature_manager.features,function(f){
        var status = f.layer.feature.properties.status || "unknown";
        status = status.toLowerCase();

        var s_c = status_count[status];
        status_count[status] = s_c ? status_count[status]+1 : 1;
    });
    _.each(feature_manager.statuses,function(status,i){
        var $btn = feature_manager.$status_buttons[i];
        status = status.toLowerCase();

        var this_count = status_count[status] || 0;
        var title = _.str.titleize(status) + " ("+this_count+")";
        if ($btn && $btn.length) $btn.text(title);
        count+=this_count;
    });

    var $btn = feature_manager.$status_buttons[5];
    if ($btn && $btn.length) $btn.text("All ("+count+")");
}
,500);

feature_manager.addFeatureToLayer=function(layer,feature,deleteInstead){
    //This is only for adding 'features', not for JSON or other data that is handled through leaflet_helper.parsers.js

    //TODO: Build a tracking object that looks for dupes, can handle new adds and removes, and can change style of those selected
    if (layer && feature && feature.features && layer.addData) {
        layer.addData(feature);
    } else {
        log.error("Tried to add a feature to a layer that doesn't seem to support it.");
    }
    feature_manager.updateStatusButtonCounts();
};
feature_manager.findById=function(id){
    return feature_manager.features[id];
};
feature_manager.removeId=function(id){
    delete feature_manager.features[id];
};
feature_manager.addAtId=function(id,feature_group){
    feature_manager.features[id] = feature_group;
};
feature_manager.findByProperty=function(property,value){
    return _.filter(feature_manager.features,function(f){
        var prop = f.layer.feature.properties[property] || "";
        return prop.toLowerCase()==value.toLowerCase();
    });
};
feature_manager.findByNotProperty=function(property,value){
    return _.reject(feature_manager.features,function(f){
        var prop = f.layer.feature.properties[property] || "";
        return prop.toLowerCase()==value.toLowerCase();
    });
};
feature_manager.setOpacityByProperty=function(property,value,opacity,opacityNot){
    opacity = opacity || 1;
    opacityNot = opacityNot || 0.3;

    _.each(feature_manager.features,function(f){
        var op = opacityNot;
        var prop = f.layer.feature.properties[property] || "";
        if (prop.toLowerCase()==value.toLowerCase()){
            op = opacity;
        }
        feature_manager.setOpacity(f.layer,op);
    });
};
feature_manager.setOpacityToFull=function(){
    _.each(feature_manager.features,function(f){
        feature_manager.setOpacity(f.layer,1);
    });
};
feature_manager.setOpacity=function(layer,amount){

    if (layer.setStyle){
        layer.setStyle({opacity:amount, fillOpacity:amount});
    } else if (layer.setOpacity){
        layer.setOpacity(amount);
    }

    if (amount==0){
        if (layer._layers) {
            _.each(layer._layers,function(f){
                $(f._icon).hide();
                if (f._shadow){
                    $(f._shadow).hide();
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
            });
        }
        if (layer.getContainer) {
            var $lc = $(layer.getContainer());
            $lc.show();
        } else if (layer._container) {
            var $lc = $(layer._container);
            $lc.css('opacity',amount);
        }
    }
};
feature_manager.featuresInWorkcell = function(property,value){
    var featuresToCheck = [];
    if (property && value) {
        featuresToCheck = feature_manager.findByProperty(property,value);
    } else {
        featuresToCheck = _.toArray(feature_manager.features);
    }

    return _.filter(featuresToCheck,function(f){
        if (f.layer && f.layer.feature && f.layer.feature.geometry) {
            //TODO: Turn Polys into center points
            return gju.pointInPolygon(f.layer.feature.geometry,aoi_feature_edit.aoi_extents_geojson);
        } else {
            return false;
        }
    });
};
feature_manager.featuresInWorkcellAsIds = function(property,value){
    var features = feature_manager.featuresInWorkcell(property,value);
    var ids = [];
    _.each(features,function(f){
        var id = f.layer.feature.properties.id;
        if (id) {
            ids.push(id);
        }
    });
    return ids.join(',');
};