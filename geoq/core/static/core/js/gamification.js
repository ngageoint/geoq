//TODO: Show Leaderboard
//TODO: Save badge json to user model

/*
Gamification-server include script, version 0.1, 3 Oct 2014
Source: https://github.com/ngageoint/gamification-server/

Usage: Within a page that includes this file, use JQuery to initialize a call to the gamificaiton server and
 show results within a DIV object on the page. Other options can be set, but the 4 below are required.  Feel
 free to tweak and update this file, it is mostly to be used as a placeholder.

<script src="/static/gamification-server-request.js"></script>
<script>
    $(document).ready(function() {
        gamification.init({
            server_url:"http://gamification-server.com/,
            project_names:"my_app,overall_game",
            user_name: "{{ request.user.username }}",
            $badge_container: $('#badge-container')
        });
    });
</script>

 */

var gamification = {};
gamification.server_url = ""; //This should contain the name of the gamification server
gamification.project_names = ""; //Replace this with the name of the "Project" that is on the gamificaiton server, or a comma-seperated list of projects
gamification.user_name = ""; //This should contain the user that you are requesting information about
gamification.proxy_url = "/geoq/proxy/"; //Replace this with your local proxy that the JSON will be requested through

gamification.$badge_container = null;
gamification.no_badges_message = "No badges yet";
gamification.badges_to_show_max = 8;
gamification.tag_size_max = 18;
gamification.tag_size_min = 8;
gamification.tag_max_shown = 20;

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
    var gpu = gamification.proxy_url;
    if (gpu.length == 0 || gpu[gpu.length-1] != "/")
	{
	    gpu = gpu + "/";
	}
    var url = gpu + encodeURI(url);
    return url.replace(/%253D/g,'%3D');
};
gamification.loadBadges = function(){

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

        var points = badge_info.points || 0;
        var badge_text = 'Badges: ';
        if (points) badge_text = 'Points: <b>'+points+'</b>, '+badge_text;

        var $tagText = gamification.createTagCloud(badge_info.tags);

        var $title = $('<span>')
            .addClass('muted')
            .css({verticalAlign: 'super'})
            .html(badge_text)
            .appendTo(gamification.$badge_container);
        if ($tagText) {
            $title.popover({
                title: 'Tags',
                html : true,
                content:$tagText,
                trigger:'hover',
                placement:'bottom'
            });
        }

        var allBadges = badge_info.profile;
        allBadges = _.sortBy(allBadges,function(b){return -b.count}); //Reverse count order

        var badgesToShow = _.first(allBadges,gamification.badges_to_show_max); //Only grab the first few badges
        _.each(badgesToShow,function(badge){
            var name = badge.projectbadge__name || "Badge";
            var count = badge.count || 1;
            var description = badge.projectbadge__description || "";
            var icon_url = badge.projectbadge__badge__icon || "";
            var project = badge.projectbadge__project__name || "";
            if (project) {
                description = "<b>"+_.str.titleize(project)+":</b> " + description;
            } else {
                project = gamification.project_names;
            }

            var image_url = encodeURI(icon_url);
            image_url = gamification.proxify(image_url);

            if (image_url) {
                description = "<img src='"+image_url+"' style='width:64px;float:left'/> "+description;
            }
            var $span = $('<span>')
                .attr({id:'badge_header_'+ _.str.dasherize(name), title:name})
                .addClass('badge_holder')
                .popover({
                    html:true,
                    title:name + " ("+count+")",
                    content:description,
                    trigger:'hover',
                    placement:'bottom'
                })
                .appendTo(gamification.$badge_container);

            var page_url = gamification.server_url+'/projects/'+project+'/';
            $('<img>')
                .attr({src:image_url})
                .click(function(){
                    window.open(page_url,'_blank');
                })
                .css({cursor:'pointer'})
                .appendTo($span);

            $('<span>')
                .text(count)
                .click(function(){
                    window.open(page_url,'_blank');
                })
                .css({cursor:'pointer'})
                .appendTo($span);
        });

        gamification.$badge_container.show();
    } else {
        gamification.$badge_container.append(gamification.no_badges_message);
    }
};
gamification.createTagCloud=function(tag_array){
    if (tag_array && _.isArray(tag_array)) {
        var tag_smallest = 100000;
        var tag_largest = 0;

        var $holder = $('<div>')
            .css({width:'200px'});
        $('<span>')
            .text('Tags:')
            .css({fontSize:'14px',fontWeight:'bold'})
            .appendTo($holder);

        //Build the list of tags
        var tags = [];
        for (var field in tag_array) {
            tags.push({name:field, num:tag_array[field]});
        }
        tags = _.sortBy(tags,"num");
        tags = tags.reverse();
        tags = _.first(tags,gamification.tag_max_shown);


        //Find the small/large count of the top n tags
        _.each(tags,function(tag){
            if (tag.num > tag_largest) tag_largest = tag.num;
            if (tag.num < tag_smallest) tag_smallest = tag.num;
        });

        //Add each tag as a sized span
        _.each(tags,function(tag){
            var percent = (tag.num-tag_smallest) / (tag_largest-tag_smallest);
            var size = tag_smallest + ((gamification.tag_size_max-gamification.tag_size_min) * percent);
            size = parseInt(size);

            $('<span>')
                .html(tag.name)
                .css({fontSize:size+'px', border:'1px solid blue', padding:'4px', borderRadius:'4px'})
                .appendTo($holder);
        });
    }
    return $holder;
};