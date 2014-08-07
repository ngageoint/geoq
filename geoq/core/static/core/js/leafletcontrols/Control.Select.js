/*
 * L.Control.Select is used for creating a box select button
 */

L.Control.Select = L.Control.extend({
	options: {
		position: 'topleft'
	},
    initialize: function(options) {
        this._button = {};
        this.setButton(options);
    },

	onAdd: function (map) {
		var container = L.DomUtil.create('div', 'leaflet-bar leaflet-control');

		this._map = map;

        this._container = container;
        this._update();

		return this._container;
	},

    onRemove: function(map) {

    },

    _onMouseDown: function (e) {
//        if (!e.shiftKey || ((e.which !== 1) && (e.button !== 1))) { return false; }

        L.DomUtil.disableTextSelection();
        L.DomUtil.disableImageDrag();

        this._startLayerPoint = this._map.mouseEventToLayerPoint(e);

        this._box = L.DomUtil.create('div', 'leaflet-select-box', this._pane);
        L.DomUtil.setPosition(this._box, this._startLayerPoint);

        //TODO refactor: move cursor to styles
        this._container.style.cursor = 'crosshair';

        L.DomEvent
            .on(document, 'mousemove', this._onMouseMove, this)
            .on(document, 'mouseup', this._onMouseUp, this)
            .on(document, 'keydown', this._onKeyDown, this);

        this._map.fire('boxselectstart');
    },

    _onMouseMove: function (e) {
        var startPoint = this._startLayerPoint,
            box = this._box;

            layerPoint = this._map.mouseEventToLayerPoint(e),
            offset = layerPoint.subtract(startPoint),

            newPos = new L.Point(
                Math.min(layerPoint.x, startPoint.x),
                Math.min(layerPoint.y, startPoint.y));

        L.DomUtil.setPosition(box, newPos);

        // TODO refactor: remove hardcoded 4 pixels
        box.style.width  = (Math.max(0, Math.abs(offset.x) - 4)) + 'px';
        box.style.height = (Math.max(0, Math.abs(offset.y) - 4)) + 'px';
    },

    _onMouseUp: function (e) {

        this._finish();

        var map = this._map,
            layerPoint = map.mouseEventToLayerPoint(e);

        if (this._startLayerPoint.equals(layerPoint)) { return; }

        var bounds = new L.LatLngBounds(
            map.layerPointToLatLng(this._startLayerPoint),
            map.layerPointToLatLng(layerPoint));

//        map.fitBounds(bounds);
//
//        map.fire('boxzoomend', {
//            boxZoomBounds: bounds
//        });
    },

    _onKeyDown: function (e) {
        if (e.keyCode === 27) {
            this._finish();
        }
    },

    setButton: function(options) {
        var button = {
            'text' : options.text,
            'iconUrl': options.iconUrl,
            'onClick': options.onClick,
            'hideText': options.hideText,
            'maxWidth': options.maxWidth || 70,
            'doToggle': options.toggle,
            'toggleStatus': true
        };

        this._button = button;
        this._update();
    },

    _finish: function () {
//        this._pane.removeChild(this._box);
        this._container.style.cursor = '';

        L.DomUtil.enableTextSelection();
        L.DomUtil.enableImageDrag();

        L.DomEvent
            .off(document, 'mousemove', this._onMouseMove)
            .off(document, 'mouseup', this._onMouseUp)
            .off(document, 'keydown', this._onKeyDown);
    },

    _update: function() {
        if (!this._map) {
            return;
        }

        this._container.innerHtml = '';
        this._createButton(this._button);
    },

	_createButton: function (button) {
//		var newButton = L.DomUtil.create('div', 'leaflet-buttons-control-button', this._container);
//        if (button.toggleStatus)
//            L.DomUtil.addClass(newButton, 'leaflet-buttons-control-toggleon');

        var newButton = L.DomUtil.create('a', 'leaflet-buttons-control', this._container);
        newButton.href = "#";

//        if (button.text !== '') {
//            var span = L.DomUtil.create('span','leaflet-buttons-control-text', newButton);
//            var text = document.createTextNode(button.text);
//            span.appendChild(text);
//            if (button.hideText)
//                L.DomUtil.addClass(span, 'leaflet-buttons-control-text-hide');
//        }

		L.DomEvent
		    .on(newButton, 'click', L.DomEvent.stopPropagation)
		    .on(newButton, 'mousedown', L.DomEvent.stopPropagation)
            .on(newButton, 'dblclick', L.DomEvent.stopPropagation)
            .on(newButton, 'click', L.DomEvent.preventDefault)
            .addListener(newButton, 'click', this._clicked, this);

		return newButton;
	},

    toggle: function() {
        this._button.toggleStatus = ! this._button.toggleStatus;
    },

	_updateDisabled: function () {
		var map = this._map,
			className = 'leaflet-disabled';

		L.DomUtil.removeClass(this._zoomInButton, className);
		L.DomUtil.removeClass(this._zoomOutButton, className);

		if (map._zoom === map.getMinSelect()) {
			L.DomUtil.addClass(this._zoomOutButton, className);
		}
		if (map._zoom === map.getMaxSelect()) {
			L.DomUtil.addClass(this._zoomInButton, className);
		}
	},

    _clicked: function () {  //'this' refers to button
        if(this._button.doToggle){
            if(this._button.toggleStatus) {	//currently true, remove class
                L.DomUtil.removeClass(this._container.childNodes[0],'leaflet-buttons-control-toggleon');
                this.addHooks();
            }
            else{
                L.DomUtil.addClass(this._container.childNodes[0],'leaflet-buttons-control-toggleon');
                this.removeHooks();
            }
            this.toggle();
        }
        return;
    },

    addHooks: function() {
        if (this._map) {
            this._map.dragging.disable();

            this._container.style.cursor = 'crosshair';

            this._map
                .on('mousedown', this._onMouseDown, this);
//                .on('mousemove', this._onMouseMove, this)
//                .on('mouseup', this._onMouseUp, this);

        }
    },

    removeHooks: function() {
        if (this._map) {
            this._map.dragging.enable();

            this._container.style.cursor = '';

            this._map
                .off('mousedown', this._onMouseDown, this)
                .off('mousemove', this._onMouseMove, this)
                .off('mouseup', this._onMouseUp, this);
        }
    }
});

L.control.select = function (options) {
	return new L.Control.Select(options);
};

