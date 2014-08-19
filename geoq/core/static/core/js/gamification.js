//TODO: Have multiple projects
//TODO: Show Leaderboard
//TODO: Save badge json to user model

var gamification = {};
gamification.server_url = "";
gamification.project_names = "geoq";
gamification.user_name = "";
gamification.proxy_url = "/geoq/proxy/";
gamification.$badge_container = null;
gamification.no_badges_message = "No badges yet";
gamification.maxBadgesToShow = 6;

gamification.init = function(options){
    gamification.server_url = options.server_url;
    if (options.project_names) gamification.project_names = options.project_names;
    gamification.user_name = options.user_name;
    gamification.$badge_container = options.$badge_container;
    if (typeof gamification.$badge_container == "string") {
        if (gamification.$badge_container.substr(0,1) != "#") {
            gamification.$badge_container = "#"+gamification.$badge_container;
        }
        gamification.$badge_container = $(gamification.$badge_container);
    }

    if (options.proxy_url) gamification.proxy_url = options.proxy_url;

    gamification.loadBadges();
};
gamification.proxify = function(url){
    url = gamification.proxy_url + encodeURI(url);
    return url.replace(/%253D/g,'%3D');
};
gamification.loadBadges = function(){

    //TODO: Work with multiple projects
    if ( gamification.$badge_container && gamification.user_name && gamification.server_url && gamification.project_names) {
        var badgeUrl = gamification.server_url + '/users/' + gamification.user_name + '/projects/' + gamification.project_names + '/badges?format=json';

        var url = gamification.proxify(badgeUrl);
        $.ajax({
            type: 'GET',
            url: url,
            dataType: 'json',
            timeout: 3000,
            success: gamification.badgeDataReturned,
            error: gamification.badgeDataError
        });
    } else {
        gamification.badgeDataError();
    }
};
gamification.badgeDataError = function() {
    if (gamification.$badge_container) {
        gamification.$badge_container.hide();
    }
};
gamification.badgeDataReturned = function (badge_info) {
    if (badge_info && badge_info.profile && badge_info.profile.length ) {

        var allBadges = badge_info.profile;
        allBadges = _.sortBy(allBadges,function(b){return -b.count}); //Reverse count order

        var badgesToShow = _.first(allBadges,gamification.maxBadgesToShow);

        _.each(badgesToShow,function(badge){
            var name = badge.projectbadge__name;
            var count = badge.count;
            var description = badge.projectbadge__description;
            var icon_url = badge.projectbadge__badge__icon;
            var $span = $('<span>')
                    .attr('id','badge_header_'+ _.str.dasherize(name))
                    .attr('title',name)
                    .popover({
                        title:name + " ("+count+")",
                        content:description,
                        trigger:'hover',
                        placement:'bottom'
                    })
                    .addClass('badge_holder')
                    .appendTo(gamification.$badge_container);

            var image_url = encodeURI(icon_url);
            image_url = gamification.proxify(image_url);

            $('<img>')
                    .attr('src',image_url)
                    .appendTo($span);
            $('<span>')
                    .text(count)
                    .appendTo($span);
        });

        gamification.$badge_container
            .click(function(){
                window.open(gamification.server_url+'/projects/'+gamification.project_names+'/','_blank');
            })
            .css({cursor:'pointer'});

        gamification.$badge_container.show();
    } else {
        gamification.$badge_container.append(gamification.no_badges_message);
    }
};