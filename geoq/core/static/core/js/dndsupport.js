fileDragHelper = (function () {
  var _me = {
    watched: {},
    stopDropWatch: function (where, handler, asBinary, kind) {
      if (watched[where]) {
        var ww = watched[where];
        var ww2 = [];
        for (var i = 0; i < ww.length; i++) {
          var cur = ww[i];
          if (cur.handler === handler && cur.kind === kind &&
                  cur.asBinary === asBinary)
            continue;
          else
            ww2.push(cur);
        }
        if (ww2.length === 0)
          delete watched[where];
      }
    },
    forceStopDropWatch: function (where) {
      where.removeEventListener("dragover", dragoverHandler);
      where.removeEventListener("drop", dropHandler);
    },
    dropWatch: function (where, handler, asBinary, kind) {
      if (where === null || where === undefined ||
              typeof (where.addEventListener) !== "function" ||
              typeof (handler) !== "function")
        return false;
      where.addEventListener('dragover', _me.dragoverHandler, false);
      where.addEventListener('drop', _me.dropHandler, false);
      if (_me.watched[where]) {
        var ww = _me.watched[where];
        for (var i = 0; i < ww.length; i++) {
          if (ww.handler === handler && ww.kind === kind)
            return true; // already watching
        }
        ww.push({handler: handler, kind: kind, asBinary: asBinary});
      } else {
        _me.watched[where] = [{handler: handler, kind: kind, asBinary: asBinary}];
      }

      return true;
    },
    dragoverHandler: function (evt) {
      _me.stopProp(evt);
      evt.dataTransfer.dropEffect = 'copy';
    },
    dropHandler: function (evt) {
      _me.stopProp();
      if (evt.dataTransfer) {
        if (evt.dataTransfer.files.length === 0)
          return;
      } else return; 
      var dt = evt.dataTransfer;
      where = evt.target;
      if (_me.watched[where]) {
        var ww = _me.watched[where];
        for (var i = 0; i < ww.length; i++) {
          var cur = ww[i];
          if (cur.kind) {
            for (var fi = 0; fi < dt.files.length; fi++) {
              var f = dt.files[fi];

              if (f.type in cur.kind)
                _me.send(f, cur.handler, cur.asBinary);
            }
          } else {
            for (var fi = 0; fi < dt.files.length; fi++) {
              var f = dt.files[fi];
              _me.send(f, cur.handler, cur.asBinary);
            }
          }
        }
      }

    },
    send: function (file, handler, asBinary) {
      var reader = new FileReader();
      reader.onload = function (e) {
        handler.apply(this, [reader.result, file]);
      };
      if (asBinary)
        reader.readAsArrayBuffer(file);
      else
        reader.readAsText(file);
    },
    stopProp: function (evt) {
      if (!evt)
        return;
      evt.stopPropagation();
      evt.preventDefault();
    }
  };

  return {
    stopWindowDrop: function () {
      window.addEventListener("dragover", function (e) {
        e = e || event;
        e.preventDefault();
      }, false);
      window.addEventListener("drop", function (e) {
        e = e || event;
        e.preventDefault();
      }, false);
    },
    watchFor: function (where, handler, asBinary, kind) {
      return _me.dropWatch(where, handler, asBinary, kind);
    },
    stopWatchingFor: function (where, handler, asBinary, kind) {
      _me.stopDropWatch(where, handler, asBinary, kind);
    },
    stopWatchingTarget: function (where) {
      _me.forceStopDropWatch(where);
    }
  };

})(this);