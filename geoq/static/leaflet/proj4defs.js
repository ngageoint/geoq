var Proj4js = {};
Proj4js.defs = {WGS84: "+title=long/lat:WGS84 +proj=longlat +ellps=WGS84 +datum=WGS84 +units=degrees", "EPSG:4326": "+title=long/lat:WGS84 +proj=longlat +a=6378137.0 +b=6356752.31424518 +ellps=WGS84 +datum=WGS84 +units=degrees", "EPSG:4269": "+title=long/lat:NAD83 +proj=longlat +a=6378137.0 +b=6356752.31414036 +ellps=GRS80 +datum=NAD83 +units=degrees", "EPSG:3875": "+title= Google Mercator +proj=merc +a=6378137 +b=6378137 +lat_ts=0.0 +lon_0=0.0 +x_0=0.0 +y_0=0 +k=1.0 +units=m +nadgrids=@null +no_defs"};
// Proj4js.defs["EPSG:3857"] = "+proj=merc +a=6378137 +b=6378137 +lat_ts=0.0 +lon_0=0.0 +x_0=0.0 +y_0=0 +k=1.0 +units=m +nadgrids=@null +wktext  +no_defs"
Proj4js.defs["EPSG:4326"] = "+proj=longlat +datum=WGS84 +no_defs";
Proj4js.defs["EPSG:3785"] = Proj4js.defs["EPSG:3875"];
Proj4js.defs.GOOGLE = Proj4js.defs["EPSG:3875"];
Proj4js.defs["EPSG:900913"] = Proj4js.defs["EPSG:3875"];
Proj4js.defs["EPSG:102113"] = Proj4js.defs["EPSG:3875"];
