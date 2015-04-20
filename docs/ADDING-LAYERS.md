# GeoQ - Adding Layers

## ESRI Image Layer provided via a Query Map Service
- This method was created to work with FEMA CAP data and also has been tested with FEMA Disaster Reporter Photos

1. Go to Layer management page
2. Add a new layer
3. Name: pick something appropriate - "FEMA EA Disaster Reporter Photos"
4. Type: "ESRI Cluster Feature Layer"
5. Url: This is the Url for the restful endpoint - "http://services.femadata.com/arcgis/rest/services/ExternalAffairs/DisasterReporterService/MapServer/0"
7. Layer params: This is used to pass information to layer handler.  You can use any of the parameters for an [ArcGIS Query Map Service Layer](http://resources.arcgis.com/en/help/arcgis-rest-api/index.html#//02r3000000p1000000).  Additionaly, you if you want to customize your markers, you will need to set "createMarker" with an appropriate function name from the leaflet_helper.createMarker javascript object.
   Supported functions are:
    1. esriImageMapService - Processes images from an ESRI MapService

   All of the data should be in JSON format:
    ```javascript
    {
     "returnGeometry":"true",
     "where":"1=1",
     "createMarker":"esriImageMapService",
     "spatialRel":"esriSpatialRelIntersects"
    }
    ```
8. Save your layer
9. You can now add your layer to a map and test for functionality

