L.Control.Button = L.Control.extend({
// Requires jQuery for some functions
//
//  USAGE:
//    var myButtonOptions = {
//      'text': 'MyButton',  // string
//      'iconUrl': 'images/myButton.png',  // string
//      'onClick': my_button_onClick,  // callback function
//      'hideText': true,  // bool
//      'maxWidth': 30,  // number
//      'doToggle': false,  // bool
//      'toggleStatus': false  // bool
//    }
//
//    var myButton = new L.Control.Button(myButtonOptions).addTo(map);
//    function my_button_onClick() {
//      console.log("someone clicked my button");
//    }

  options: {
    position: 'bottomleft'
  },
  initialize: function (options) {
    this._button = {};
    if (options.position) {
        this.options.position = options.position;
    } else {
        this.options.position = 'bottomleft'
    }
    this.setButton(options);
  },

  onAdd: function (map) {
    this._map = map;
    var container = L.DomUtil.create('div', 'leaflet-control-button');

    L.DomEvent.on(container, 'mousedown', L.DomEvent.stopPropagation)
        .on(container, 'doubleclick', L.DomEvent.stopPropagation)
        .on(container, 'click', L.DomEvent.stopPropagation);

    this._container = container;

    this._update();
    return this._container;
  },

  onRemove: function (map) {
  },

  setButton: function (options) {
    var button = {
      'text': options.text || '',                 //string
      'title': options.title || '',				// string
      'iconUrl': options.iconUrl || '',           //string
      'onClick': options.onClick || function(){},           //callback function
      'hideText': !!options.hideText,         //forced bool
      'maxWidth': options.maxWidth || 70,     //number
      'doToggle': options.toggle,			//bool
      'toggleStatus': false,				//bool
      'html': options.html
    };

    this._button = button;
    this._update();
  },
  
  getText: function () {
  	return this._button.text;
  },
  
  getIconUrl: function () {
  	return this._button.iconUrl;
  },
  
  destroy: function () {
  	this._button = {};
  	this._update();
  },
  
  toggle: function (e) {
  	if(typeof e === 'boolean'){
  		this._button.toggleStatus = e;
  	}
  	else{
  		this._button.toggleStatus = !this._button.toggleStatus;
  	}
  	this._update();
  },
  
  _update: function () {
    if (!this._map) {
      return;
    }

    this._container.innerHTML = '';
    this._makeButton(this._button);
 
  },

  _makeButton: function (button) {
    var newButton = L.DomUtil.create('div', 'leaflet-buttons-control-button', this._container);
    if(button.toggleStatus)
    	L.DomUtil.addClass(newButton,'leaflet-buttons-control-toggleon');

    if (button.iconUrl != '') {
    	// wrap in an anchor tag so we can add title as a hover
    	var anchor = L.DomUtil.create('a', undefined, newButton);
    	if (button.title != '') {
    		anchor.setAttribute('title', button.title);
    	}
        var image = L.DomUtil.create('img', 'leaflet-buttons-control-img', anchor);
        image.setAttribute('src',button.iconUrl);
    }

    if(button.text !== ''){

      L.DomUtil.create('br','',newButton);  //there must be a better way

      var span = L.DomUtil.create('span', 'leaflet-buttons-control-text', newButton);
      var text = document.createTextNode(button.text);  //is there an L.DomUtil for this?
      span.appendChild(text);

      if(button.hideText)
        L.DomUtil.addClass(span,'leaflet-buttons-control-text-hide');
    }
    if (button.html) {
      $(newButton).append(button.html);
    }

    L.DomEvent
      .addListener(newButton, 'click', L.DomEvent.stop)
      .addListener(newButton, 'click', button.onClick,this)
      .addListener(newButton, 'click', this._clicked,this);
    L.DomEvent.disableClickPropagation(newButton);
    return newButton;

  },
  
  _clicked: function () {  //'this' refers to button
  	if(this._button.doToggle){
  		if(this._button.toggleStatus) {	//currently true, remove class
  			L.DomUtil.removeClass(this._container.childNodes[0],'leaflet-buttons-control-toggleon');
  		}
  		else{
  			L.DomUtil.addClass(this._container.childNodes[0],'leaflet-buttons-control-toggleon');
  		}
  		this.toggle();
  	}
  	return;
  }

});