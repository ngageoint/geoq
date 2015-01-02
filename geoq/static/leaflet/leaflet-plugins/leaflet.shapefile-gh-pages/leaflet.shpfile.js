L.Shapefile =L.GeoJSON.extend({
    initialize: function (file, options) {
        if(typeof cw !== 'undefined'){
            this.worker = cw(function(data,cb){
                importScripts('shp.js');
	            shp(data).then(cb);
            });
        }
        L.GeoJSON.prototype.initialize.call(this,{features:[]},options);
        this.addFileData(file);
    },
    addFileData:function(file){
        var self = this;
        self.fire('data:loading');
        if(typeof file !== 'string' && !('byteLength' in file)){
            var data = self.addData(file);
            self.fire('data:loaded');
            return data;
        }
        if(self.worker){
            self.worker.data(cw.makeUrl(file)).then(function(data){
                self.addData(data);
                self.fire('data:loaded');
                self.worker.close();
            });
        }else{
            shp(file).then(function(data){
                self.addData(data);
                self.fire('data:loaded');
            });
        }
        return this;
    }
});

L.shapefile= function(a,b){
    return new L.Shapefile(a,b);
}
