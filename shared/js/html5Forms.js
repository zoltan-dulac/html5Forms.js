var html5Forms = new function () {
	var me = this;
	
	var scriptNode = null,
		scriptDir = null,
		hasBadValidationImplementation = false; //navigator.userAgent.indexOf('WebKit') > 0,
		// WebKit less than 534 doesn't show validation UI - we need to check for this (from http://stackoverflow.com/questions/6030522/html5-form-validation-modernizr-safari)
		hasNativeBubbles = navigator.userAgent.indexOf('WebKit') < 0 || parseInt(navigator.userAgent.match(/AppleWebKit\/([^ ]*)/)[1].split('.')[0])  > 533;
		
	
	var globalEvent = document.addEventListener?document.createEvent("HTMLEvents"):null;
	
	function getBrowserLanguage() {
		var r = navigator.language;
		if (!r) {
			r = navigator.browserLanguage;
		}
		return r;
	}
	
	me.init = function () {
		var scriptNodes = document.getElementsByTagName('script');
		
		for (var i=0; i<scriptNodes.length; i++) {
			scriptNode = scriptNodes[i];
			
			if (scriptNode.src.match('html5Forms(_src|-p|)\.js')) {
				scriptNode = scriptNode;
				scriptDir = getScriptDir();
				break;
			}
		}
		
		if (scriptNode) {
			if (window.yepnope) {
				var inputSupport = Modernizr.inputtypes;
				/* let's load the supporting scripts according to what is in data-webforms2-support */
				var supportArray = scriptNode.getAttribute('data-webforms2-support');
				var forceJSValidation = (scriptNode.getAttribute('data-webforms2-force-js-validation') == 'true');
				
				if (!supportArray) {
					return;
				} else if (trim(supportArray) == 'all') {
					supportArray="validation,number,color,date,ouput,range,placeholder";
				}
				
				supportArray = supportArray.split(',');
				var toLoad = [];
				var toRunAfterLoad = [];
				var loadHTML5Widgets = false;
				
				
				for (var i=0; i<supportArray.length; i++) {
					var supportReq = trim(supportArray[i]);
					
					switch(supportReq) {
						
						case "validation":
						case "autofocus":
							if (!Modernizr.input.required || hasBadValidationImplementation || forceJSValidation) {
								
								toLoad = toLoad.concat([  
										scriptDir + '../../shared/js/weston.ruter.net/webforms2/webforms2_src.js']);
								
								if (supportReq == 'autofocus') {
									loadHTML5Widgets = true;
								}
								
							}	
							break;
						case "number":
							if (!inputSupport.number) {
								toLoad = toLoad.concat([
										scriptDir + '../../shared/css/number.css']);
								loadHTML5Widgets = true;
							}
							break;
						case "color":
							if (!inputSupport.color) {
								
								toLoad = toLoad.concat([  scriptDir + '../../shared/js/jscolor/jscolor.js']);
								
								loadHTML5Widgets = true;
							}	
							break;
						
						case "datetime":
						case "date":
							var lang = scriptNode.getAttribute('data-lang');
							
							
							/* If data-lang is not set, or is set to an unsupported language, use English by default. */
							if (!lang || 
								!lang.match(/^(af|al|bg|big5|br|ca|cn|cs|da|de|du|el|en|es|fi|fr|he|hr|hu|it|jp|ko|ko|lt|lt|lv|nl|no|pl|pl|pt|ro|ru|si|sk|sp|sv|tr|zh)$/)){

								
								lang = getBrowserLanguage().split('-')[0];
							}
							
							
							
							if (!inputSupport.date) {
								toLoad = toLoad.concat([  
										  scriptDir + '../../shared/js/jscalendar-1.0/calendar-win2k-1.css',
										  scriptDir + '../../shared/js/jscalendar-1.0/calendar.js', 
										  scriptDir + '../../shared/js/jscalendar-1.0/lang/calendar-' + lang + '.js', 
										  scriptDir + '../../shared/js/jscalendar-1.0/calendar-setup.js']);
								loadHTML5Widgets = true;
							}
							break;
							
						case "output":
							if(!supportsOutput()) {
								
								loadHTML5Widgets = true;
							}
							break;
						
						case "range":
						   /* yepnope({
						    	load: ['ie6!' + scriptDir + '../../shared/css/slider.css']
						   }); */
						    
							if(!inputSupport.range) {
								toLoad = toLoad.concat([  scriptDir + '../../shared/css/slider.css',
										  scriptDir + '../../shared/js/frequency-decoder.com/slider.js']);
							
										  
								loadHTML5Widgets = true;
								toRunAfterLoad.push('fdSliderController.redrawAll');
									 
							}
							break;
						case "placeholder":
						case "autofocus":
							if (!Modernizr.input[supportReq]) {
								loadHTML5Widgets = true;
							}
					}
				}
				
				
				if (toLoad.length == 0) {
					loadWidgets();
					
					// allow browsers that don't need webforms2 to handle custom error messages populated
					// in the data-errormessage attribute
					if (document.addEventListener) {
						document.addEventListener('DOMContentLoaded', handleCustomErrorMessages, false);
					}
				} else {
					yepnope({
						load: toLoad,
						complete: function (){
							loadWidgets();
							handleCustomErrorMessages();
						}
					});
				}
			}
		}
		
		function loadWidgets() {
			
			yepnope({
				test: loadHTML5Widgets,
				yep: scriptDir + '../../shared/js/html5Widgets.js',
				complete: function () {
					if (loadHTML5Widgets) {
						for (var i=0; i<toRunAfterLoad.length; i++)  {
							eval(toRunAfterLoad[i] + '()');
						}
						EventHelpers.init();
						html5Widgets.init();
						//toRunAfterLoad.push('html5Widgets.init');
					}
				}
			})
			
		}
		
		/*
		 * This should work even when webforms2 is not loaded.
		 */
		function handleCustomErrorMessages() {
			
			var nodeNames = ["input", "select", "textarea"];
			for (var i=0; i<nodeNames.length; i++) {
				var nodes = document.getElementsByTagName(nodeNames[i]);
				
				for (var j=0; j<nodes.length; j++) {
					var node = nodes[j];
					var message = me.getAttributeValue(node, 'data-errormessage');
					if (message) {
						if(document.addEventListener){
							node.addEventListener('invalid', showCustomMessageEvent, false);
							node.addEventListener('focus', showCustomMessageEvent, false);
							
							// Opera doesn't work well with this.
							if (!window.opera) {
								node.addEventListener('keypress', clearMessageIfValidEvent, false);
							}
							
							node.addEventListener('input', clearMessageIfValidEvent, false);
						} else {
							var invalidEvent = ' this.setCustomValidity("' + message + '");';
							if (node.oninvalid) {
								node.oninvalid += invalidEvent;
							} else {
								node.oninvalid = invalidEvent;
							}
							node.oninvalid = new Function('event', node.oninvalid);
							
							// IE freaks a little on keypress here, so change to keydown.
							node.attachEvent('onkeydown', clearMessageIfValidEvent);
							node.attachEvent('oninput', clearMessageIfValidEvent); 
						}
						clearMessageIfValid(node);
			
					}
				}
			}
		}
		
		function showCustomMessageEvent(event) {
			var node = event.currentTarget || event.srcElement;
			showCustomMessage(node);
		}
		
		function showCustomMessage(node) {
			if (node.validity.valid) {
				return;
			}
			var message = me.getAttributeValue(node, 'data-errormessage');
			node.setCustomValidity(message)
			//console.log('set custom validity')
		}
		
		function clearMessageIfValidEvent (event) {
			//console.log(event.type)
			var node = event.currentTarget || event.srcElement;
			clearMessageIfValid(node);
		}
		
		function clearMessageIfValid(node) {
			node.setCustomValidity(''); 
			if (!node.checkValidity()) {
				showCustomMessage(node);
				//console.log('invalid')
				if (document.addEventListener) {
					globalEvent.initEvent('invalid', true, true); // event type,bubbling,cancelable
	        		node.dispatchEvent(globalEvent);
	        	}
			} else {
				//console.log('valid')
			}
		}
		
	}
	
	var supportsOutput = function () {
		var outputEl = document.createElement('output');
		return (outputEl.value != undefined && (outputEl.onforminput !== undefined || outputEl.oninput !== undefined));
		
	}
	
	var getScriptDir = function () {
		var arr = scriptNode.src.split('/');
		arr.pop();
		
		return arr.join('/') + '/';
	}
	
	me.getAttributeByName = function (obj, attrName) {
		var i;
		
		var attributes = obj.attributes;
		for (var i=0; i<attributes.length; i++) {
			var attr = attributes[i]
			if (attr.nodeName == attrName && attr.specified) {
			  	return attr;
			}
		}
		return null;
	}
	
	me.getAttributeValue = function (obj, attrName) {
		var attr = me.getAttributeByName(obj, attrName);
		
		if (attr != null) {
			return attr.nodeValue;
		} else {
			return null;
		}
	}
	
	var initWhitespaceRe = /^\s\s*/;
	var endWhitespaceRe = /\s\s*$/;
	
	function trim(str) {
		return str.replace(initWhitespaceRe, '')
			.replace(endWhitespaceRe, '');
	}  

}

html5Forms.init();
