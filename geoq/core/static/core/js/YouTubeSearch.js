/*************************************************************************************************

										Point Class

**************************************************************************************************/

function Point (x, y) {
//X = lat Y = Long
	this.x = x;
	this.y = y;
}




/*************************************************************************************************

										Vector Class

**************************************************************************************************/

function Vector() {

}

Vector.prototype.squaredLength = function(point) {
	return (this.dot(point,point));
}

Vector.prototype.subtraction = function (P1, P2) {
	var vectorPoint = new Point((P1.x - P2.x), P1.y - P2.y);
	return vectorPoint;
}

Vector.prototype.dot = function (P1, P2) {
	return ((P1.x * P2.x) + (P1.y * P2.y));
}

//

/*************************************************************************************************

										Youtube Class

**************************************************************************************************/

function YouTubeSearch() {
	this.API_ACCESS_KEY = site_settings.YouTube["key"];
	this.searchResults = [];
	this.inputObject = {};
	

	this.publishAfterTime = '';
	this.publishBeforeTime = '';
}

YouTubeSearch.prototype.haversineGreatCircleDistance =  function (latitudeFrom, longitudeFrom, latitudeTo, longitudeTo) {
	var earthRadius = 6371000;
	//var YouTubeSearchWorker = new YouTubeSearch();

	var latFrom = this.toRadians(latitudeFrom);
	var longFrom = this.toRadians(longitudeFrom);
	var latTo = this.toRadians(latitudeTo);
	var longTo = this.toRadians(longitudeTo);

	var latDelta = latTo - latFrom;
	var longDelta = longTo - longFrom;

	//$angle = 2 * asin(sqrt(pow(sin($latDelta / 2), 2) + cos($latFrom) * cos($latTo) * pow(sin($lonDelta / 2), 2)));
	var angle = 2 * Math.asin(Math.sqrt(Math.pow(Math.sin(latDelta / 2), 2) + Math.cos(latFrom) * Math.cos(latTo) * Math.pow(Math.sin(longDelta / 2), 2)));

	return angle * earthRadius;
}

YouTubeSearch.prototype.toRadians = function (degrees) {
	return degrees * Math.PI / 180;
}

YouTubeSearch.prototype.generateCircle = function (pointArray) {
	var center = new Point(0,0); 
	var rad, rad2;
	var xmin, xmax, ymin, ymax;

	var Pxmin, Pxmax, Pymin, Pymax;


	xmin = xmax = pointArray[0].x;
	ymin = ymax = pointArray[0].y;

	Pxmin = Pxmax = Pymin = Pymax = 0;


	for (var i = 0; i < pointArray.length; i++) {
		if (pointArray[i].x < xmin) {
            xmin = pointArray[i].x;
            Pxmin = i;
        }
        else if (pointArray[i].x > xmax) {
            xmax = pointArray[i].x;
            Pxmax = i;
        }
        if (pointArray[i].y < ymin) {
            ymin = pointArray[i].y;
            Pymin = i;
        }
        else if (pointArray[i].y > ymax) {
            ymax = pointArray[i].y;
            Pymax = i;
        }
	}	

	var VectorWorker = new Vector();
	var deltaXVector = VectorWorker.subtraction(pointArray[Pxmax], pointArray[Pxmin]);
	var deltaYSquaredLength = VectorWorker.squaredLength(deltaXVector);

	var deltaYVector = VectorWorker.subtraction(pointArray[Pymax], pointArray[Pymin]);
	var deltaYSquaredLength = VectorWorker.squaredLength(deltaYVector);

	//If the deltaXSquaredLength is larger, we have picked the largest X difference between two points
	if (deltaYSquaredLength >= deltaYSquaredLength) {
		
		//Update deltaXVector
		deltaXVector.x = (deltaXVector.x / 2);
		deltaXVector.y = (deltaXVector.y / 2);
		
		//Update Center initial guess Point
		center.x = (pointArray[Pxmin].x + deltaXVector.x);
		center.y = (pointArray[Pxmin].y + deltaXVector.y);

		rad2 = VectorWorker.squaredLength(VectorWorker.subtraction(pointArray[Pxmax], center));
	} else {

		//Update deltaYVector
		deltaYVector.x = (deltaYVector.x / 2);
		deltaYVector.y = (deltaYVector.y / 2);

		//Create Center Point initial guess
		center.x = (pointArray[Pymin].x + deltaYVector.x);
		center.y = (pointArray[Pymin].y + deltaYVector.y);

		rad2 = VectorWorker.squaredLength(VectorWorker.subtraction(pointArray[Pxmax], center));
	}

	rad = Math.sqrt(rad2);

	var vectorDistance;
	var dist, dist2;
	var lastPointExtended = pointArray[0];
	for (var i = 0; i < pointArray.length; i++) {
		vectorDistance = VectorWorker.subtraction(pointArray[i], center);
		dist2 = VectorWorker.squaredLength(vectorDistance);

		// Point is not inside of the circle
		if (dist2 > rad2) {
			dist = Math.sqrt(dist2);
			rad = (rad + dist) / 2.0;
			rad2 = rad * rad;

			var temp = ((dist-rad)/dist);
			vectorDistance.x = vectorDistance.x * temp;
			vectorDistance.y = vectorDistance.y * temp;

			center.x = center.x + (temp * vectorDistance.x);
			center.y = center.y + (temp * vectorDistance.y);
			lastPointExtended.x = pointArray[i].x;
			lastPointExtended.y = pointArray[i].y;
		} 
	}

	var distance = this.haversineGreatCircleDistance(center.x, center.y, lastPointExtended.x, lastPointExtended.y);
	return {
		currentCenterPoint: center,
		distanceToSearch: distance
	};
}

//This is the function that people will call to make the actual request to youtube.
YouTubeSearch.prototype.search = function (pointArray) {
	this.cleanInputObjects();
	this.getInputObjects();
	var pointData = this.generateCircle(pointArray);
	if (pointData) {
		this.inputObject.hasSearchLocation = true;
	}

	
	this.getPublishBeforeAndAfterTime();

	var finalQuery = this.inputObject.inputQuery;

	if (finalQuery != "") {
		if (site_settings.YouTube["exclusionKeywords"] != "") {
			var keywords = site_settings.YouTube["exclusionKeywords"].split(",");
			for (var i = 0; i < keywords.length; i++) {
				finalQuery = finalQuery + " -" + keywords[i];
			}
		}
	}

	
	try {
		 var request = gapi.client.youtube.search.list({
          q: finalQuery,
          order: "date",
          type: 'video',
          part: 'snippet',
          maxResults: site_settings.YouTube["maxResults"],
          videoLiscense: 'any',
          //This might have to change if we only want embeddable videos
          videoEmbeddable: 'any',
          location: pointData.currentCenterPoint.x + "," + pointData.currentCenterPoint.y,
          locationRadius: pointData.distanceToSearch + "m",
          publishedAfter: this.publishAfterTime,
          publishedBefore: this.publishBeforeTime,
          key: this.API_ACCESS_KEY
      });
	} catch (err) {
		console.log(err);
	}

	return request;


}

YouTubeSearch.prototype.cleanInputObjects = function () {
	this.inputObject = {};
}


YouTubeSearch.prototype.getPublishBeforeAndAfterTime = function () {
	if (this.inputObject.publishedBeforeTime.length !== 0 && this.inputObject.publishedAfterTime.length !== 0) {
		var startDate = this.inputObject.publishedAfterTime;
		var endDate = this.inputObject.publishedBeforeTime;

		this.publishBeforeTime = "" + endDate.substr(6, 4) + "-" + endDate.substr(0, 2) + "-" + endDate.substr(3, 2) + "T00:00:00Z";
		this.publishAfterTime = "" + startDate.substr(6, 4) + "-" + startDate.substr(0, 2) + "-" + startDate.substr(3, 2) + "T00:00:00Z";

	} else {
		this.publishAfterTime = '1970-01-01T00:00:00Z';
		this.publishBeforeTime = convertDateToTimeDateStamp(new Date());
 	}

}

YouTubeSearch.prototype.getInputObjects = function () {
	this.inputObject.inputQuery = $('#keyword').val();
	this.inputObject.publishedBeforeTime = $('#endDate').val();
	this.inputObject.publishedAfterTime = $('#startDate').val();
}	


YouTubeSearch.prototype.processYouTubeRequest = function (request, pointArray, callback) {
	var resultsArr = [];
	var finalResults = [];
	request.execute(function(response) {
		var videoIDString = '';
		if ('error' in response || !response) {
			console.log(response);
		} else if (!response.result || !response.result.items) {
			console.log("There were no results returned");
		} else {
			var entryArr = response.result.items;
			for (var i = 0; i < entryArr.length; i++) {
				var videoResult = new Object();
				videoResult.title = entryArr[i].snippet.title;
				if (entryArr[i].georss$where) {
					var latlong = entryArr[i].georss$where.gml$point.gml$pos.$t;
					var latlongArr = latlong.split(' ');
          			videoResult.lat = latlongArr[0].trim();
          			videoResult.long = latlongArr[1].trim();
				}

				videoResult.videoID = entryArr[i].id.videoId;
				videoIDString = videoIDString + videoResult.videoID + ",";
				var MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
				var year = entryArr[i].snippet.publishedAt.substr(0, 4);
        		var monthNumeric = entryArr[i].snippet.publishedAt.substr(5, 2);
       			var monthInt = 0;

        		if (monthNumeric.indexOf("0") === 0) {
		          monthInt = monthNumeric.substr(1, 1);
		        } else {
		          monthInt = monthNumeric;
		        }
		        var day = entryArr[i].snippet.publishedAt.substr(8, 2);
		        var time = entryArr[i].snippet.publishedAt.substr(11, 8);

		        var monthString = MONTH_NAMES[monthInt - 1];

		        videoResult.displayTimeStamp = monthString + " " + day + ", " + year + " - " + time + " UTC";
		        videoResult.publishTimeStamp = entryArr[i].snippet.publishedAt;

				resultsArr.push(videoResult);
			}
		}

		var videoIDStringFinal = videoIDString.substring(0, videoIDString.length - 1);


		var videoIDRequest = gapi.client.youtube.videos.list({
			id: videoIDStringFinal,
			part: 'id,snippet,recordingDetails',
			key: this.API_ACCESS_KEY
		});

		videoIDRequest.execute(function(response) {
			var tempPoint = new Point();
			if ('error' in response || !response) {
				console.log(response);
			} else {
				$.each(response.items, function() {
					var videoRequestVideoId = this.id;
					for (var i = 0; i < resultsArr.length; i++) {
                		if (resultsArr[i].videoID === videoRequestVideoId) {
                  			resultsArr[i].lat = this.recordingDetails.location.latitude;
                  			resultsArr[i].long = this.recordingDetails.location.longitude;

                  			tempPoint.x = resultsArr[i].lat;
                  			tempPoint.y = resultsArr[i].long;

                  			if ((windingNumber(tempPoint, pointArray, (pointArray.length - 1))) != 0) {
                  				finalResults.push(resultsArr[i]);
                  			}
                  			break;
                		}
             		 }

				});
				callback(finalResults);
			}
		});
	});

}


YouTubeSearch.prototype.filterIrrelevantResults = function (finalResults) {

}


/*************************************************************************************************

										Misc Functions

**************************************************************************************************/

//On Document Load
$(document).ready(function() {
	$.getScript('https://apis.google.com/js/client.js?onload=loadGAPI');
});


//Load YouTubeAPI
function loadGAPI() {
	gapi.client.load('youtube', 'v3', function() {
		console.log("Google Youtube API Loaded.....");
		gapi.client.setApiKey(site_settings.YouTube["key"], function() {
			console.log("api key loaded");
		});
	});
}
//Taken from Youtube Example
function convertDateToTimeDateStamp(dateObj) {
 	return dateObj.getUTCFullYear() + '-' + formatAsTwoDigitNumber(dateObj.getUTCMonth() + 1) + '-' + formatAsTwoDigitNumber(dateObj.getUTCDate()) + 'T' + formatAsTwoDigitNumber(dateObj.getUTCHours()) + ':' + formatAsTwoDigitNumber(dateObj.getUTCMinutes()) + ':' + formatAsTwoDigitNumber(dateObj.getUTCSeconds()) + 'Z';
}

//Also taken from youtube example
function formatAsTwoDigitNumber(numb) {
  if (numb < 10) {
    return String('0' + numb);
  } else {
  	return String(numb);
	}
}

//Influenced by 2000, Dan Sunday
function isLeft (P0, P1, P2) {
	return ( (P1.x - P0.x) * (P2.y - P0.y)
            - (P2.x -  P0.x) * (P1.y - P0.y) );
}

function windingNumber (P, pointArray, n) {
	var wn = 0;
	for (var i=0; i<n; i++) {   // edge from V[i] to  V[i+1]
        if (pointArray[i].y <= P.y) {          // start y <= P.y
            if (pointArray[i+1].y  > P.y)      // an upward crossing
                 if (isLeft( pointArray[i], pointArray[i+1], P) > 0)  // P left of  edge
                     ++wn;            // have  a valid up intersect
        }
        else {                        // start y > P.y (no test needed)
            if (pointArray[i+1].y  <= P.y)     // a downward crossing
                 if (isLeft( pointArray[i], pointArray[i+1], P) < 0)  // P right of  edge
                     --wn;            // have  a valid down intersect
        }
    }
    return wn;
}
