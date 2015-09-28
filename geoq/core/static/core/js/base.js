// This technical data was produced for the U. S. Government under Contract No. W15P7T-13-C-F600, and
// is subject to the Rights in Technical Data-Noncommercial Items clause at DFARS 252.227-7013 (FEB 2012)

//requires jquery, underscore
var geoq = {};

geoq.init = function(){

    geoq.csrftoken = geoq.getCookie('csrftoken');
    geoq.ajaxSetup();
    geoq.underscoreSettings();
};


geoq.csrfSafeMethod = function(method) {
    // these HTTP methods do not require CSRF protection
    return (/^(GET|HEAD|OPTIONS|TRACE)$/.test(method));
};

geoq.sameOrigin = function(url) {
    // test that a given url is a same-origin URL
    // url could be relative or scheme relative or absolute
    var host = document.location.host; // host + port
    var protocol = document.location.protocol;
    var sr_origin = '//' + host;
    var origin = protocol + sr_origin;
    // Allow absolute or scheme relative URLs to same origin
    return (url == origin || url.slice(0, origin.length + 1) == origin + '/') ||
        (url == sr_origin || url.slice(0, sr_origin.length + 1) == sr_origin + '/') ||
        // or any other URL that isn't scheme relative or absolute i.e relative.
        !(/^(\/\/|http:|https:).*/.test(url));
};

geoq.getCookie = function(name) {
    var cookieValue = null;
    if (document.cookie && document.cookie.length) {
        var cookies = document.cookie.split(';');
        for (var i = 0; i < cookies.length; i++) {
            var cookie = jQuery.trim(cookies[i]);
            // Does this cookie string begin with the name we want?
            if (cookie.substring(0, name.length + 1) == (name + '=')) {
                cookieValue = decodeURIComponent(cookie.substring(name.length + 1));
                break;
            }
        }
    }
    return cookieValue;
};

geoq.ajaxSetup = function(){
    $.ajaxSetup({
        beforeSend: function(xhr, settings) {
            if (!geoq.csrfSafeMethod(settings.type) && geoq.sameOrigin(settings.url)) {
                // Send the token to same-origin, relative URLs only.
                // Send the token only if the method warrants CSRF protection
                // Using the CSRFToken value acquired earlier
                xhr.setRequestHeader("X-CSRFToken", geoq.csrftoken);
            }
        }
    });
};

geoq.redirect = function(url){
    window.location = url;
};

geoq.underscoreSettings= function(){
    _.templateSettings = {
      interpolate : /\{\{(.+?)\}\}/g,
      evaluate : /\{\%(.+?)\%\}/g
    };
};

geoq.init();