var magehelper = (function () {

    var url = null;
    var events = [];
    var observations = [];
    var observationTypes = [];
    var ducklings = [];
    var activeOnly = true;
    var current_event = "none";

    function loudly(msg) {
        for (var i = 0; i < ducklings.length; i++) {
            var callback = ducklings[i];
            if (callback && typeof (callback) === "function") {
                callback(msg);
            }
        }
    }

    // Return an object exposed to the public
    return {
        getIconURL: function (eid, obsType) {
            if (eid === null || obsType == null)
                return null;
            return url + "/events/" + eid + "/form/icons/"
                + encodeURIComponent(obsType);
        },
        getIconURLFromObservation: function (observation) {
            if (observation.properties && observation.properties.type) {
                return magehelper.getIconURL(observation.eventId, observation.properties.type);
            }
        },
        squawk: function (callback) {
            ducklings[ducklings.length] = callback;
        },
        loadEvents: function () {
            loudly({events_loading: true});
            $.get(url + "/events", {},
                function (data, textStatus, jqXHR) {
                    if (data) {
                        events = data;
                        if (events.length > 0) {
                            current_event = events[0].id;
                        }
                        loudly({events_loaded: true});
                    } else
                        loudly({failed: true, details: "Sorry, couldn't list events."});
                });

        },
        loadObservations: function () {
            loudly({observations_loading: true});

            if (current_event == "none") {
                observations = [];
                loudly({observations_loaded: true, observations_count: 0});
                return;
            }
            $.get(url + "/events/" + current_event + "/observations", {},
                function (data, textStatus, jqXHR) {
                    observationTypes = [];
                    if (data) {
                        if (activeOnly) {
                            var trimmed = [];
                            for (var i = 0; i < data.length; i++) {
                                var o = data[i];
                                if (o.state && o.state.name && o.state.name === "active") {
                                    trimmed[trimmed.length] = o;
                                    if (o.properties && o.properties.type)
                                        if (observationTypes.indexOf(o.properties.type) === -1)
                                            observationTypes[observationTypes.length] = o.properties.type;
                                }
                            }
                            observations = trimmed;
                        } else
                            observations = data;
                        loudly({observations_loaded: true, observations_count: observations.length});
                    } else
                        loudly({failed: true, details: "Sorry, couldn't load observations."});
                });

        },
        getEvents: function () {
            return events;
        },
        isActiveOnly: function () {
            return activeOnly;
        },
        setActiveOnly: function (arg) {
            if (arg)
                activeOnly = true;
            else
                activeOnly = false;
        },
        getObservations: function () {
            return observations;
        },
        getObservationTypes: function () {
            return observationTypes;
        },
        getCurrentEvent: function() {
            return current_event;
        },
        setCurrentEvent: function(id) {
            current_event = id;
        },
        setUrl: function(arg) {
            if (arg) {
                url = arg;
            }
        }
        // Public alias to a private function
    };
})();
