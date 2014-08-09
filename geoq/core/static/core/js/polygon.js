// depends on jQuery for creating shallow copies of javascript objects - $.extend({}, object). Also for various utility functions like $.grep()
// Author: Andrija Cajic, XEETech.com



/**
Returns a new polygon (array of points) which represents an intersection of the two polygons that were passed as arguments.
If intersection of two polygons results in multiple polygons, function only returns one of them.
Supports concave polygons but does not support complex polygons (http://upload.wikimedia.org/wikipedia/commons/3/34/Complex_polygon.png).

This implementation is similar to the one described by Margalit & Knott: "An algorithm for computing the union, intersection or difference of two polygons" (http://gvu.gatech.edu/people/official/jarek/graphics/papers/04PolygonBooleansMargalit.pdf)
Its complexity is O(n^2). 4*n1*n2, to be more precise, where n1 is number of points in the first polygon, and n2 number of points in second polygon.
With a few tweaks, the algorithm could be optimized, but with the same general idea in place, it is impossible to get rid of n^2 complexity.
*/
function intersectionPolygons(polygon1, polygon2) {
    polygon1 = clockwisePolygon(polygon1);
    polygon2 = clockwisePolygon(polygon2);


    var polygon1ExpandedDict = {};
    var polygon2ExpandedDict = {};
    for (var i = 0; i < polygon1.length; i++) {
        var polygon1Line = [polygon1[i], polygon1[(i + 1) % polygon1.length]];
        polygon1ExpandedDict[i] = [cloneObject(polygon1[i])];
        for (var j = 0; j < polygon2.length; j++) {
            if (i == 0)
                polygon2ExpandedDict[j] = [cloneObject(polygon2[j])];

            var polygon2Line = [polygon2[j], polygon2[(j + 1) % polygon2.length]];
            var intersectionResult = intersectionLines(polygon1Line, polygon2Line);
            

            if (intersectionResult.onLine1 && intersectionResult.onLine2) {
                if (pointsEqual(intersectionResult, polygon1[i])) {
                    polygon1ExpandedDict[i][0].isCrossPoint = true;
                    polygon1ExpandedDict[i][0].isOriginalPoint = true;
                    polygon1ExpandedDict[i][0].crossingLine = polygon2Line;
                } else if (pointsEqual(intersectionResult, polygon1[(i + 1) % polygon1.length])) {
                    
                } else {
                    var newPolygon1Point = cloneObject(intersectionResult);
                    newPolygon1Point.isCrossPoint = true;
                    newPolygon1Point.crossingLine = polygon2Line;
                    newPolygon1Point.distanceFromPreviousPoint = pointsDistance(polygon1[i], newPolygon1Point);
                    var lastIndex = polygon1ExpandedDict[i].length - 1;
                    while (polygon1ExpandedDict[i][lastIndex].distanceFromPreviousPoint && polygon1ExpandedDict[i][lastIndex].distanceFromPreviousPoint > newPolygon1Point.distanceFromPreviousPoint) {
                        lastIndex--; // maybe current polygon1Line will be intersected in many places,
                        // when intersection points are added to polygon1Expanded, they need to be properly sorted
                    }
                    if (!pointsEqual(polygon1ExpandedDict[i][lastIndex], newPolygon1Point) && !pointsEqual(polygon1ExpandedDict[i][lastIndex + 1], newPolygon1Point)) {
                        polygon1ExpandedDict[i].splice(lastIndex + 1, 0, newPolygon1Point);
                    }
                }

                if (pointsEqual(intersectionResult, polygon2[j])) {
                    polygon2ExpandedDict[j][0].isCrossPoint = true;
                    polygon2ExpandedDict[j][0].isOriginalPoint = true;
                    polygon2ExpandedDict[j][0].crossingLine = polygon1Line;
                } else if (pointsEqual(intersectionResult, polygon2[(j + 1) % polygon2.length])) {

                } else {
                    var newPolygon2Point = cloneObject(intersectionResult);
                    newPolygon2Point.isCrossPoint = true;
                    newPolygon2Point.crossingLine = polygon1Line;
                    newPolygon2Point.distanceFromPreviousPoint = pointsDistance(polygon2[j], newPolygon2Point);
                    lastIndex = polygon2ExpandedDict[j].length - 1;
                    while (polygon2ExpandedDict[j][lastIndex].distanceFromPreviousPoint && polygon2ExpandedDict[j][lastIndex].distanceFromPreviousPoint > newPolygon2Point.distanceFromPreviousPoint) {
                        lastIndex--;
                    }
                    if (!pointsEqual(polygon2ExpandedDict[j][lastIndex], newPolygon2Point) && !pointsEqual(polygon2ExpandedDict[j][lastIndex+1], newPolygon2Point)) {
                        polygon2ExpandedDict[j].splice(lastIndex + 1, 0, newPolygon2Point);
                    }
                    
                }
            }
        }
    }
    

    var polygon1Expanded = [];
    for (i = 0; i < polygon1.length; i++) {
        for (j = 0; j < polygon1ExpandedDict[i].length; j++) {
            var polygon1ExpandedPoint = polygon1ExpandedDict[i][j];
            polygon1Expanded.push(polygon1ExpandedPoint);
        }
    }

    var polygon2Expanded = [];
    var startingPoint = null;
    var currentPolygon = null;
    var otherPolygon = null;
    var currentIndex = null;
    var currentPoint = null;
    
    var polygon2ExpandedIndex = null;
    var index = 0;
    for (i = 0; i < polygon2.length; i++) {
        for (j = 0; j < polygon2ExpandedDict[i].length; j++) {
            var polygon2ExpandedPoint = polygon2ExpandedDict[i][j];
            polygon2Expanded.push(polygon2ExpandedPoint);
            
            if (startingPoint == null && polygon2ExpandedPoint.isCrossPoint) {
                startingPoint = polygon2ExpandedPoint;
                polygon2ExpandedIndex = index;
            }
            index++;
        }
    }
    

    if (startingPoint == null) {
        // either polygons are separated, or one contains another <==> polygons' lines never intersect one another
        var isPolygon2WithinPolygon1 = isPointInsidePolygon(polygon2[0], polygon1);
        if (isPolygon2WithinPolygon1) {
            startingPoint = polygon2Expanded[0];
            currentPolygon = polygon2Expanded;
            otherPolygon = polygon1Expanded;
            currentIndex = 0;
        } else {
            var isPolygon1WithinPolygon2 = isPointInsidePolygon(polygon1[0], polygon2);
            if (isPolygon1WithinPolygon2) {
                startingPoint = polygon1Expanded[0];
                currentPolygon = polygon1Expanded;
                otherPolygon = polygon2Expanded;
                currentIndex = 0;
            } else {
                // these two polygons are completely separated
                return [];
            }
        }
    } else {
        currentPolygon = polygon2Expanded;
        otherPolygon = polygon1Expanded;
        currentIndex = polygon2ExpandedIndex;
    }

    var intersectingPolygon = [startingPoint];
    
    var switchPolygons = false;
    if (startingPoint.isCrossPoint) {
        var pointJustAfterStartingPoint = justAfterPointOfACrossPoint(currentIndex, currentPolygon);
        if (isPointInsidePolygon(pointJustAfterStartingPoint, otherPolygon)) {
            switchPolygons = false;
        } else {
            switchPolygons = true;
        }
    } else {
        switchPolygons = false;
    }

    if (switchPolygons) {
        var temp = currentPolygon;
        currentPolygon = otherPolygon;
        otherPolygon = temp;

        currentIndex = indexElementMatchingFunction(currentPolygon, function (point) {
            return pointsEqual(startingPoint, point);
        });
    } 
    
    currentPoint = currentPolygon[(currentIndex + 1) % currentPolygon.length];;
    currentIndex = (currentIndex + 1) % currentPolygon.length;

    
    while (!pointsEqual(currentPoint, startingPoint)) {
        intersectingPolygon.push(currentPoint);
        if (currentPoint.isCrossPoint) {
            if (currentPoint.crossingLine && currentPoint.isOriginalPoint) {
                var pointJustBeforeCurrent = justBeforePointOfACrossPoint(currentIndex, currentPolygon);
                var pointJustAfterCurrent = justAfterPointOfACrossPoint(currentIndex, currentPolygon);

                var isBeforeLeft = isPointLeftOfLine(pointJustBeforeCurrent, currentPoint.crossingLine);
                var isAfterLeft = isPointLeftOfLine(pointJustAfterCurrent, currentPoint.crossingLine);
                if (isBeforeLeft == isAfterLeft) {
                    // do not switch to different polygon
                } else {
                    var temp = currentPolygon;
                    currentPolygon = otherPolygon;
                    otherPolygon = temp;
                }
            } else {
                var temp = currentPolygon;
                currentPolygon = otherPolygon;
                otherPolygon = temp;
            }

            currentIndex = indexElementMatchingFunction(currentPolygon, function(point) {
                return pointsEqual(currentPoint, point);
            });
        }        

        currentIndex = (currentIndex + 1) % currentPolygon.length;
        currentPoint = currentPolygon[currentIndex];
    }

    return intersectingPolygon;
}

function justBeforePointOfACrossPoint(pointIndex, polygon) {
    var point = polygon[pointIndex];
    var previousIndex = (polygon.length + pointIndex - 1) % polygon.length;
    var previousPoint = polygon[previousIndex];

    var pointJustBeforeCurrent = {
        x: (point.x + previousPoint.x) / 2,
        y: (point.y + previousPoint.y) / 2
    };

    return pointJustBeforeCurrent;
}

function justAfterPointOfACrossPoint(pointIndex, polygon) {
    var point = polygon[pointIndex];
    var nextIndex = (pointIndex + 1) % polygon.length;
    var nextPoint = polygon[nextIndex];

    var pointJustAfterCurrent = {
        x: (point.x + nextPoint.x) / 2,
        y: (point.y + nextPoint.y) / 2
    };

    return pointJustAfterCurrent;
}


/**
If the polygon that is passed as argument is clockwise, that polygon is returned. If it is counter-clockwise, a polygon with same points but in reversed order is returned.
Complexity O(n)
*/
function clockwisePolygon(polygon) {
    var sum = 0;
    var filterDuplicates = [];
    var reversedPolygon = [];
    for (var i = 0; i < polygon.length; i++) {
        var currentPoint = polygon[i];
        var nextPoint = polygon[(i + 1) % polygon.length];
        if (!pointsEqual(currentPoint, nextPoint)) {
            filterDuplicates.push(currentPoint);
            reversedPolygon.splice(0, 0, currentPoint);
        }
        sum += (nextPoint.x - currentPoint.x) * (nextPoint.y + currentPoint.y);
    }
    if (sum > 0) {
        // polygon is clockwise
        return polygon;
    } else {
        // polygon is counter-clockwise
        return reversedPolygon;
    }
}


/**
Works for any polygon, not just convex polygons.
@param bordersCountAsOutside - if point is exactly on the polygon's border, this parameter determines whether the point will be classified as 'inside' or 'outside'
*/
function isPointInsidePolygon(point, polygon, onBorderCountsAsOutside) {
    // point is any javascript object that contains both x & y numeric parameters
    // polygon is array of points, properly sorted to form a polygon
    var pointVerticalLine = [point, { x: point.x, y: point.y + 1 }];
    var higherIntersectionsCount = 0;
    var lowerIntersectionCount = 0;
	for (var i = 0; i < polygon.length; i++) {
	    var polygonLine = [polygon[i], polygon[(i+1) % polygon.length]];
	    var result = intersectionLines(pointVerticalLine, polygonLine);

	    if (result.onLine2) {
	        if (pointsEqual(point, result)) {
	            return !onBorderCountsAsOutside;
	        }

	        if (result.y > point.y) {
	            higherIntersectionsCount++;
	        } else {
	            lowerIntersectionCount++;
	        }
	    }
	}  
    if (higherIntersectionsCount % 2 != 0 && lowerIntersectionCount % 2 != 0) {
        return true;
    } else {
        return false;
    }
}

function intersectionLines(line1, line2, excludeStartingPoints, includeEndingPoints) {
    return checkLineIntersection(line1[0].x, line1[0].y, line1[1].x, line1[1].y, line2[0].x, line2[0].y, line2[1].x, line2[1].y, excludeStartingPoints, includeEndingPoints);
}



/**
Credits to: http://jsfiddle.net/justin_c_rounds/Gd2S2/light/
example:
 returns {
    x : 12,
    y : 16,
    onLine1 : false,
    onLine2 : true
 }
*/
function checkLineIntersection(line1StartX, line1StartY, line1EndX, line1EndY, line2StartX, line2StartY, line2EndX, line2EndY, excludeStartingPoints, includeEndingPoints) {
    // if the lines intersect, the result contains the x and y of the intersection (treating the lines as infinite) and booleans for whether line segment 1 or line segment 2 contain the point
    var denominator, a, b, numerator1, numerator2, result = {
        x: null,
        y: null,
        onLine1: false,
        onLine2: false
    };
    denominator = ((line2EndY - line2StartY) * (line1EndX - line1StartX)) - ((line2EndX - line2StartX) * (line1EndY - line1StartY));
    if (denominator == 0) {
        return result;
    }
    a = line1StartY - line2StartY;
    b = line1StartX - line2StartX;
    numerator1 = ((line2EndX - line2StartX) * a) - ((line2EndY - line2StartY) * b);
    numerator2 = ((line1EndX - line1StartX) * a) - ((line1EndY - line1StartY) * b);
    a = numerator1 / denominator;
    b = numerator2 / denominator;

    // if we cast these lines infinitely in both directions, they intersect here:
    result.x = line1StartX + (a * (line1EndX - line1StartX));
    result.y = line1StartY + (a * (line1EndY - line1StartY));
    /*
            // it is worth noting that this should be the same as:
            x = line2StartX + (b * (line2EndX - line2StartX));
            y = line2StartX + (b * (line2EndY - line2StartY));
            */
    
    // if line1 is a segment and line2 is infinite, they intersect if:
    if (!excludeStartingPoints && numbersEqual(a,0)) {
        result.onLine1 = true;
    }
    if (includeEndingPoints && numbersEqual(a, 1)) {
        result.onLine1 = true;
    }
    if (firstGreaterThanSecond(a,0) && firstLessThanSecond(a,1)) {
        result.onLine1 = true;
    }
    
    // if line2 is a segment and line1 is infinite, they intersect if:
    if (!excludeStartingPoints && numbersEqual(b, 0)) {
        result.onLine2 = true;
    }
    if (includeEndingPoints && numbersEqual(b, 1)) {
        result.onLine2 = true;
    }
    if (firstGreaterThanSecond(b, 0) && firstLessThanSecond(b, 1)) {
        result.onLine2 = true;
    }
    // if line1 and line2 are segments, they intersect if both of the above are true
    return result;
};

function isPointLeftOfLine(point, line) {
    var linePoint1 = line[0];
    var linePoint2 = line[1];
    return ((linePoint2.x - linePoint1.x)*(point.y - linePoint1.y) - (linePoint2.y - linePoint1.y)*(point.x - linePoint1.x)) > 0;
}

function pointsEqual(point1, point2) {
    if (!point1)
        return false;
    if (!point2)
        return false;
    // return point1.x == point2.x && point1.y == point2.y;
    return numbersEqual(pointsDistance(point1, point2), 0);
}

function numbersEqual(num1, num2) {
    return Math.abs(num2 - num1) < 1e-14;
}

function firstGreaterThanSecond(a,b) {
    return !numbersEqual(a, b) && a > b;
}

function firstLessThanSecond(a, b) {
    return !numbersEqual(a, b) && a < b;
}

function pointsDistance(point1, point2) {
    return Math.pow(Math.pow(point2.x - point1.x, 2) + Math.pow(point2.y - point1.y, 2), 0.5);
}

function cloneObject(object) {
    return $.extend({}, object);
}

function filterFirstMatchingElement(array, fn) {
    var element = $.grep(array, fn)[0];
    return element;
}

function indexElementMatchingFunction(array, fn) {
    var element = filterFirstMatchingElement(array, fn);
    return array.indexOf(element);
}

