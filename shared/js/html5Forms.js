var html5Forms = new function () {
	var me = this;
	
	var scriptNode = null,
		scriptDir = null,
		isScriptCompressed = false,
		bodyEl,
		globalEvent = document.createEvent("HTMLEvents"),
		
		// WebKit less than 534 doesn't show validation UI - we need to check for this (from http://stackoverflow.com/questions/6030522/html5-form-validation-modernizr-safari)
		hasNativeBubbles = navigator.userAgent.indexOf('WebKit') < 0 || parseInt(navigator.userAgent.match(/AppleWebKit\/([^ ]*)/)[1].split('.')[0])  > 534,
		hasBadValidationImplementation = !hasNativeBubbles;  // making another var for this in case we have more criteria in the future.
		
	
	function getBrowserLanguage() {
		var r = navigator.language;
		if (!r) {
			r = navigator.browserLanguage;
		}
		return r;
	}
	
	me.init = function () {
		var scriptNodes = document.getElementsByTagName('script');
		
		bodyEl=document.body;
		
		/* This is for fireEvent */
		me.globalEvent = document.createEvent("HTMLEvents");
		
		for (var i=0; i<scriptNodes.length; i++) {
			scriptNode = scriptNodes[i];
			
			if (scriptNode.src.match('html5Forms(_src|-p|)\.js$')) {
				scriptNode = scriptNode;
				scriptDir = getScriptDir();
				if (scriptNode.src.indexOf('html5Forms-p.js') >= 0) {
					isScriptCompressed = true;
				}
				break;
			}
		}
		
		if (scriptNode) {
			if (window.yepnope) {
				var inputSupport = Modernizr.inputtypes;
				/* let's load the supporting scripts according to what is in data-webforms2-support */
				var supportArray = scriptNode.getAttribute('data-webforms2-support');
				me.forceJSValidation = (scriptNode.getAttribute('data-webforms2-force-js-validation') === 'true');
				me.turnOffValidation = (scriptNode.getAttribute('data-webforms2-turn-off-validation') === 'true');
				me.forceJSDatePicker = (scriptNode.getAttribute('data-webforms2-force-js-date-picker') === 'true');
				if (!supportArray) {
					return;
				} else if (trim(supportArray) === 'all') {
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
							if (me.turnOffValidation) {
								//me.turnOffNativeValidation();
								EventHelpers.addPageLoadEvent('html5Forms.turnOffNativeValidation');
							} else {
						
								if (!Modernizr.input.required || hasBadValidationImplementation || me.forceJSValidation) {
									
									if (isScriptCompressed) {
										toLoad = toLoad.concat([  
											scriptDir + '../../shared/js/weston.ruter.net/webforms2/webforms2-p.js']);
									} else {
										toLoad = toLoad.concat([  
											scriptDir + '../../shared/js/weston.ruter.net/webforms2/webforms2_src.js']);
									}
									
									if (supportReq === 'autofocus') {
										loadHTML5Widgets = true;
									}
									
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
							
							
							
							if (!inputSupport.date || me.forceJSDatePicker) {
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
				
				
				if (toLoad.length === 0) {
					loadWidgets();
					
					// allow browsers that don't need webforms2 to handle custom error messages populated
					// in the data-errormessage attribute
					if (document.addEventListener) {
						document.addEventListener('DOMContentLoaded', setupExtraFeatures, false);
					}
				} else {
					yepnope({
						load: toLoad,
						complete: function (){
							loadWidgets();
							setupExtraFeatures();
						}
					});
				}
			}
		};
		
		function loadWidgets() {
			
			yepnope({
				test: loadHTML5Widgets,
				yep: scriptDir + '../../shared/js/html5Widgets.js',
				complete: function () {
					if (loadHTML5Widgets) {
						for (var i=0; i<toRunAfterLoad.length; i++)  {
							eval(toRunAfterLoad[i] + '()');
						}
						html5Widgets.init();
						//toRunAfterLoad.push('html5Widgets.init');
					}
				}
			})
			
		}
		
		
		
		/*
		 * This should work even when webforms2 is not loaded.
		 * It sets up extra features for HTML5Forms like:
		 * 1) Setting custom error messages on form elements.
		 * 2) setting up isBlank and isBlurred classes.
		 * 3) settung up form.wf2_submitAttempted
		 */
		function setupExtraFeatures() {
			setErrorMessageEvents(node);
			setCustomClassesEvents(node);
			bodyEl.addEventListener('click', submitClickEvent, true);
			bodyEl.addEventListener('submit', submitEvent, true);
			bodyEl.addEventListener('reset', resetEvent, true);
			
			var nodes = document.querySelectorAll(':enabled, :disabled');
			
			for (var j=0; j<nodes.length; j++) {
				var node = nodes[j];
				setNodeClasses(node, true);
			}
		}
		
		function submitEvent(e) {
			var target = e.currentTarget;
			markSubmitAttempt(target);
		}
		
		function resetEvent(e) {
			var target = e.currentTarget;
			
			if (target.nodeName === 'FORM') {
				resetForm(target);
			}
		}
		function submitClickEvent(e) {
			var target = e.currentTarget;
			
			if (target && target.form && target.type === "submit") {
				markSubmitAttempt(target.form);
			}
		}
		
		function markSubmitAttempt(form) {
			form.classList.add('wf2_submitAttempted');
		}
		
		function removeSubmitAttempt(form) {
			form.classList.remove('wf2_submitAttempted');
		}
		
		function resetForm(form) {
			removeSubmitAttempt(form);
			
			var nodes = form.querySelectorAll(':enabled, :disabled');
			
			for (var j=0; j<nodes.length; j++) {
				var node = nodes[j];
				
				node.classList.remove('wf2_lostFocus');
				node.classList.remove('wf2_notBlank');
				node.classList.add('wf2_isBlank');
			}
				
		}
		
		function setCustomClassesEvents() {
			bodyEl.addEventListener('keyup', nodeChangeEvent);
			bodyEl.addEventListener('change', nodeChangeEvent);
			bodyEl.addEventListener('blur', nodeBlurEvent);
		}
		
		function nodeChangeEvent(e) {
			var node = e.currentTarget;
			setNodeClasses(node);
		}
		
		function setNodeClasses(node, isLoadEvent) {	
			if (node.value === '') {
				
				node.classList.add('wf2_isBlank');
				node.classList.remove('wf2_notBlank');
			} else {
				node.classList.add('wf2_notBlank');
				node.classList.remove('wf2_isBlank');
			}
			
			if (isLoadEvent && node.nodeName === 'SELECT') {
				node.setAttribute('data-wf2-initialvalue', node.value)
			}
			
			if ((node.nodeName === 'SELECT' && node.getAttribute('data-wf2-initialvalue') !== node.value)
			    || (node.nodeName !== 'SELECT' && node.getAttribute('value', node.value))) {
				node.classList.remove('wf2_defaultValue');
				node.classList.add('wf2_notDefaultValue');
			} else {
				node.classList.add('wf2_defaultValue');
				node.classList.remove('wf2_notDefaultValue');
			}
		}
		
		function nodeBlurEvent(e) {
			var node = e.currentTarget;
			
			node.classList.add('wf2_lostFocus');
		}
		
		function setErrorMessageEvents() {
			bodyEl.addEventListener('invalid', showCustomMessageEvent, true);
			bodyEl.addEventListener('focus', showCustomMessageEvent, true);
			bodyEl.addEventListener('input', clearMessageIfValidEvent, true);
			
			bodyEl.addEventListener('change', clearMessageIfValidEvent, true);
			bodyEl.addEventListener('submit', clearMessageIfValidEvent, true);
			
		}
		
		function showCustomMessageEvent(event) {
			var node = event.target;
			
			showCustomMessage(node);
		}
		
		function showCustomMessage(node) {
			if (node.validity && node.validity.valid) {
				return;
			}
			var message = node.getAttribute('data-errormessage');
			
			if (message) {
				node.setCustomValidity(message)
			}
		}
		
		function clearMessageIfValidEvent (event) {
			//console.log(event.type)
			var node = event.target ;
			clearMessageIfValid(node);
		}
		
		function clearMessageIfValid(node) {
			if (!node.setCustomValidity) {
				// this happens when webforms2 is not loaded yet.  Bail.
				return; 
			}
			
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
	
	me.turnOffNativeValidation = function () {
		var formNodes = document.getElementsByTagName('form');
		for (var i=0; i<formNodes.length; i++) {
			formNodes[i].setAttribute('novalidate', 'novalidate');
		}
	}
	
	var supportsOutput = function () {
		var outputEl = document.createElement('output');
		return (outputEl.value !== undefined && (outputEl.onforminput !== undefined || outputEl.oninput !== undefined));
		
	}
	
	var getScriptDir = function () {
		var arr = scriptNode.src.split('/');
		arr.pop();
		
		return arr.join('/') + '/';
	}
	
	
	me.isEventSupported = function(eventName, nodeName) {
		var el = document.createElement(nodeName);
		eventName = 'on' + eventName;
		var isSupported = ( eventName in el);
		if (!isSupported) {
			el.setAttribute(eventName, 'return;');
			isSupported = typeof el[eventName] == 'function';
		}
		el = null;
		return isSupported;
	}

	me.fireEvent = function (element,event, options){
		if(!element) {
			return;
		}
		
		// dispatch for firefox + ie9 + others
		globalEvent.initEvent(event, true, true); // event type,bubbling,cancelable
		return !element.dispatchEvent(globalEvent);
	}
	
	me.getKey = function(e){
		if (e.keyCode) {
			return e.keyCode;
		} else if (e.event && e.event.keyCode) {
			return window.event.keyCode;
		} else if (e.which) {
			return e.which;
		}
	}
	
	var initWhitespaceRe = /^\s\s*/;
	var endWhitespaceRe = /\s\s*$/;
	
	function trim(str) {
		return str.replace(initWhitespaceRe, '')
			.replace(endWhitespaceRe, '');
	}  
};

window.addEventListener('load', html5Forms.init);
