// For discussion and comments, see: http://remysharp.com/2009/01/07/html5-enabling-script/
(function(){if(!/*@cc_on!@*/0)return;var e = "abbr,article,aside,audio,canvas,datalist,details,eventsource,figure,footer,header,hgroup,mark,menu,meter,nav,output,progress,section,time,video".split(','),i=e.length;while(i--){document.createElement(e[i])}})()

var html5 = new function () {
	var me = this;
	
	/**
	 * Given an HTML or XML object, find the an attribute by name.
	 * 
	 * @param {Object} obj - a DOM object.
	 * @param {String} attrName - the name of an attribute inside the DOM object.
	 * @return {Object} - the attribute object or null if there isn't one.
	 */
	me.getAttributeByName = function (obj, attrName) {
		var i;
		
		var attributes = obj.attributes;
		for (i=0; i<attributes.length; i++) {
			var attr = attributes[i]
			if (attr.nodeName == attrName && attr.specified) {
			  	return attr;
			}
		}
		return null;
	}
	
	/**
	 * Given an HTML or XML object, find the value of an attribute.
	 * 
	 * @param {Object} obj - a DOM object.
	 * @param {String} attrName - the name of an attribute inside the DOM object.
	 * @return {String} - the value of the attribute.
	 */
	me.getAttributeValue = function (obj, attrName) {
		var attr = me.getAttributeByName(obj, attrName);
		
		if (attr != null) {
			return attr.nodeValue;
		} else {
			return null;
		}
	}
	
	
	
	/**
	 * Given an HTML or XML object, set the value of an attribute.
	 * 
	 * @param {Object} obj - a DOM object.
	 * @param {String} attrName - the name of an attribute inside the DOM object.
	 * @param {String} attrValue - the value of the attribute.
	 */
	me.setAttributeValue = function (obj, attrName, attrValue) {
		var attr = me.getAttributeByName(obj, attrName);
		
		if (attr != null) {
			attr.nodeValue = attrValue;
		} else {
			return;
		}
	}
	
	me.getDefinedAttributes = function (obj) {
		
		var attrs = obj.attributes;
		var r = new Array();
		
		for (var i=0; i<attrs.length; i++) {
			attr = attrs[i];
			if (attr.specified) {
				r[attr.name] = attr.value;
				
			}
		}
	
		return r;
	}
	
	/*
	 * HTML5 dataset
	 */	
	me.getDataset = function (obj) {
		var r = new Array();
		
		var attributes = me.getDefinedAttributes(obj);
		//jslog.debug('entered')
		for (var i=0; i<attributes.length; i++) {
			var attr = attributes[i];
			
			if (attr.indexOf('data-') == 0) {
				//jslog.debug('adding ' + name)
				var name = attr.substring(5);
				//jslog.debug('adding ' + name)
				r[name] = attr.value;
			}
		}
		
		//jslog.debug('dataset = ' + DebugHelpers.getProperties(r))
		return r;
	}
	
	me.getDatasetItem = function (obj, name) {
		var r = me.getAttributeValue(obj, 'data-' + name);
		
		if (!r) {
			r = me.getAttributeValue(obj, 'data-' + name.toLowerCase())
		}
		return r;
	}
	
	me.setDatasetItem = function (obj, name, value) {
		var attrName = 'data-' + name.toLowerCase();
		
		var val = me.setAttributeValue(obj, attrName, value);
		
		if (me.getAttributeValue(obj, attrName) == null) {
			obj[attrName] = value;
			
		}
	}
}
