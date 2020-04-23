window.rsim = (function () {

  // private
  var responders, maxDist=2000, latC=42.4455, lonC = -71.241,
  center = new LatLon(latC, lonC);
  responders = [];
  responderCoords = [];
  running = false;
  timeout = 5000;

  go = function() {
    for(var i=0; i<responders.length; i++) {

        current = responderCoords[i];
        id = responders[i];
        if(current == null) current = new LatLon(latC, lonC);
        if(current.distanceTo(center)> maxDist) {
            responderCoords[i] = new LatLon(latC, lonC);
        } else {
           var bearing = randomFromInterval(0,360);
           var distance = randomFromInterval(20, 500);
           current = current.destinationPoint(distance, bearing);
           responderCoords[i] = current;
       }
       $.post("/geoq/responder/update",
            {
                id:id,
                latitude: current.lat,
                longitude: current.lon
            }
       );
    }
    if(running) setTimeout(go, timeout);

  };

   randomFromInterval = function(min,max) {
    //   https://stackoverflow.com/a/7228322
    return Math.floor(Math.random()*(max-min+1)+min);
    };

  return {
    //public boundary

    version: "0.1",
    setInterval: function(interval) {
        timeout = Number(interval);
    },
    addResponders: function(ids) {
        if(ids instanceof Array) {
            for(var i=0; i<ids.length; i++)
                this.addResponder(ids[i]);
        }
    },

    addResponder: function( id ) {
      if(! (id in responders)) {
           responders[responders.length]  = id;
           responderCoords[responders.length] = new LatLon(latC,lonC);
       }

    },
    start: function() {
       if(!running) {
        running = true;
        go();
       }
    }


  };

})();
rsim.addResponders([2,3]);
rsim.start();