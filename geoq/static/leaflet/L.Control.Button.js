// Author: Jerroyd Moore

L.Control.JButton = L.Control.extend({
    includes: L.Mixin.Events,
    options: {
        position: 'topright',
    },
    initialize: function (label, options) {
        L.setOptions(this, options);
        var button = null;

        if (label instanceof HTMLElement) {
            button = label;
            try {
                button.parentNode.removeChild(button);
            } catch (e) { }
        } else if (typeof label === "string") {
            button = L.DomUtil.create('button', this.options.className)
        } else {
            throw new Error('L.Control.JButton: failed to initialize, label must either be text or a dom element');
        }

        L.DomUtil.addClass(button, this.options.position);

        this._container = button;

        return this;
    },
    isToggled: function () {
        return L.DomUtil.hasClass(this._container, this.options.toggleButton);
    },
    _fireClick: function (e) {
        $('#finish-button-dropdown').dropdown();
        this.fire('click');

        if (this.options.toggleButton) {
            var btn = this._container;
            if (this.isToggled()) {
                L.DomUtil.removeClass(this._container, this.options.toggleButton);
            } else {
                L.DomUtil.addClass(this._container, this.options.toggleButton);
            }
        }
    },
    onAdd: function (map) {
        if (this._container) {
            L.DomEvent.on(this._container, 'click', this._fireClick, this);
            var stop = L.DomEvent.stopPropagation;
            L.DomEvent.on(this._container, 'mousedown', stop)
                      .on(this._container, 'touchstart', stop)
                      .on(this._container, 'dblclick', stop)
                      .on(this._container, 'mousewheel', stop)
                      .on(this._container, 'MozMozMousePixelScroll', stop)
            this.fire('load');

            this._map = map;
        }

        return this._container;
    },
    onRemove: function (map) {
        if (this._container && this._map) {
            L.DomEvent.off(this._container, 'click', this._fireClick, this);
            L.DomEvent.off(this._container, 'mousedown', stop)
                      .off(this._container, 'touchstart', stop)
                      .off(this._container, 'dblclick', stop)
                      .off(this._container, 'mousewheel', stop)
                      .off(this._container, 'MozMozMousePixelScroll', stop)

            this.fire('unload');
            this._map = null;
        }

        return this;
    }
});

L.control.jbutton = function (label, options) {
    return new L.Control.JButton(label, options);
};