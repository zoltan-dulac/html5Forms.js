var html5Forms = new function () {
	var me = this;
	
	var scriptNode = null,
		scriptDir = null,
		isScriptCompressed = false,
		
		// WebKit less than 534 doesn't show validation UI - we need to check for this (from http://stackoverflow.com/questions/6030522/html5-form-validation-modernizr-safari)
		hasNativeBubbles = navigator.userAgent.indexOf('WebKit') < 0 || parseInt(navigator.userAgent.match(/AppleWebKit\/([^ ]*)/)[1].split('.')[0])  > 534,
		hasBadValidationImplementation = !hasNativeBubbles;  // making another var for this in case we have more criteria in the future.
		
	
	var globalEvent = document.addEventListener?document.createEvent("HTMLEvents"):null;
	
	function getBrowserLanguage() {
		var r = navigator.language;
		if (!r) {
			r = navigator.browserLanguage;
		}
		return r;
	}
	
	
	me.start = function () {
		
		var split = navigator.userAgent.split('Firefox/');
		
		//Firefox 3.6 gives a wierd error when using the Twitter API
		//unless you do this onload.
		if (split.length>=1 && parseFloat(split[1]) <= 3.6) {
			EventHelpers.addEvent(window, 'load', me.init);
		} else {
			me.init();
		}
	}
	
	me.init = function () {
		var scriptNodes = document.getElementsByTagName('script');
		
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
				me.forceJSValidation = (scriptNode.getAttribute('data-webforms2-force-js-validation') == 'true');
				me.turnOffValidation = (scriptNode.getAttribute('data-webforms2-turn-off-validation') == 'true');
				me.forceJSDatePicker = (scriptNode.getAttribute('data-webforms2-force-js-date-picker') == 'true');
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
							if (me.turnOffValidation) {
								//me.turnOffNativeValidation();
								EventHelpers.addPageLoadEvent('html5Forms.turnOffNativeValidation')
							} else {
						
								if (!Modernizr.input.required || hasBadValidationImplementation || me.forceJSValidation) {
									
									if (isScriptCompressed) {
										toLoad = toLoad.concat([  
											scriptDir + '../../shared/js/weston.ruter.net/webforms2/webforms2-p.js']);
									} else {
										toLoad = toLoad.concat([  
											scriptDir + '../../shared/js/weston.ruter.net/webforms2/webforms2_src.js']);
									}
									
									if (supportReq == 'autofocus') {
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
				
				
				if (toLoad.length == 0) {
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
		 * It sets up extra features for HTML5Forms like:
		 * 1) Setting custom error messages on form elements.
		 * 2) setting up isBlank and isBlurred classes.
		 * 3) settung up form.wf2_submitAttempted
		 */
		function setupExtraFeatures() {
			var nodeNames = ["input", "select", "textarea"];
			for (var i=0; i<nodeNames.length; i++) {
				var nodes = document.getElementsByTagName(nodeNames[i]);
				
				for (var j=0; j<nodes.length; j++) {
					var node = nodes[j];
					setErrorMessageEvents(node);
					setCustomClassesEvents(node);
					setNodeClasses(node, true);
				}
				
				if (i==0 && node.type=="submit") {
					EventHelpers.addEvent(node, 'click', submitClickEvent);
				}
			}
			
			var forms = document.getElementsByTagName('form');
			for (var i=0; i<forms.length; i++) {
				EventHelpers.addEvent(forms[i], 'submit', submitEvent);
				EventHelpers.addEvent(forms[i], 'reset', resetEvent);
			}
		}
		
		function submitEvent(e) {
			var target = EventHelpers.getEventTarget(e);
			markSubmitAttempt(target);
		}
		
		function resetEvent(e) {
			var target = EventHelpers.getEventTarget(e);
			
			resetForm(target);
		}
		function submitClickEvent(e) {
			var target = EventHelpers.getEventTarget(e);
			markSubmitAttempt(target.form);
		}
		
		function markSubmitAttempt(form) {
			me.css.addClass(form, 'wf2_submitAttempted');
		}
		
		function removeSubmitAttempt(form) {
			me.css.removeClass(form, 'wf2_submitAttempted');
		}
		
		function resetForm(form) {
			removeSubmitAttempt(form);
			var nodeNames = ["input", "select", "textarea"];
			for (var i=0; i<nodeNames.length; i++) {
				var nodes = form.getElementsByTagName(nodeNames[i]);
				
				for (var j=0; j<nodes.length; j++) {
					var node = nodes[j];
					
					me.css.removeClass(node, 'wf2_lostFocus');
					me.css.removeClass(node, 'wf2_notBlank');
					me.css.addClass(node, 'wf2_isBlank');
				}
				
			}
		}
		
		function setCustomClassesEvents(node) {
			EventHelpers.addEvent(node, 'keyup', nodeChangeEvent);
			EventHelpers.addEvent(node, 'change', nodeChangeEvent);
			EventHelpers.addEvent(node, 'blur', nodeBlurEvent);
		}
		
		function nodeChangeEvent(e) {
			var node = EventHelpers.getEventTarget(e);
			setNodeClasses(node);
		}
		
		function setNodeClasses(node, isLoadEvent) {	
			if (node.value === '') {
				
				me.css.addClass(node, 'wf2_isBlank');
				me.css.removeClass(node, 'wf2_notBlank');
			} else {
				me.css.addClass(node, 'wf2_notBlank');
				me.css.removeClass(node, 'wf2_isBlank');
			}
			
			if (isLoadEvent && node.nodeName == 'SELECT') {
				node.setAttribute('data-wf2-initialvalue', node.value)
			}
			
			if ((node.nodeName == 'SELECT' && me.getAttributeValue(node, 'data-wf2-initialvalue') != node.value)
			    || (node.nodeName != 'SELECT' && me.getAttributeValue(node, 'value') != node.value)) {
				me.css.removeClass(node, 'wf2_defaultValue');
				me.css.addClass(node, 'wf2_notDefaultValue');
			} else {
				me.css.addClass(node, 'wf2_defaultValue');
				me.css.removeClass(node, 'wf2_notDefaultValue');
			}
		}
		
		function nodeBlurEvent(e) {
			var node = EventHelpers.getEventTarget(e);
			
			me.css.addClass(node, 'wf2_lostFocus');
		}
		
		function setErrorMessageEvents(node) {
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
					
					if (node.nodeName == 'SELECT') {
						node.addEventListener('change', clearMessageIfValidEvent, false);
						node.addEventListener('click', clearMessageIfValidEvent, false);
					}
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
					
					if (node.nodeName == 'SELECT') {
						node.attachEvent('change', clearMessageIfValidEvent, false);
						node.attachEvent('click', clearMessageIfValidEvent, false);
					}
				}
				
				
				clearMessageIfValid(node);
	
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
	
	me.css = new function () {
		var me = this;
		
		var blankRe = new RegExp('\\s');

		/**
		 * Generates a regular expression string that can be used to detect a class name
		 * in a tag's class attribute.  It is used by a few methods, so I 
		 * centralized it.
		 * 
		 * @param {String} className - a name of a CSS class.
		 */
		
		function getClassReString(className) {
			return '\\s'+className+'\\s|^' + className + '\\s|\\s' + className + '$|' + '^' + className +'$';
		}
		
		function getClassPrefixReString(className) {
			return '\\s'+className+'-[0-9a-zA-Z_]+\\s|^' + className + '[0-9a-zA-Z_]+\\s|\\s' + className + '[0-9a-zA-Z_]+$|' + '^' + className +'[0-9a-zA-Z_]+$';
		}
		
		
		/**
		 * Make an HTML object be a member of a certain class.
		 * 
		 * @param {Object} obj - an HTML object
		 * @param {String} className - a CSS class name.
		 */
		me.addClass = function (obj, className) {
			
			if (blankRe.test(className)) {
				return;
			}
			
			// only add class if the object is not a member of it yet.
			if (!me.isMemberOfClass(obj, className)) {
				obj.className += " " + className;
			}
			
		}
		
		/**
		 * Make an HTML object *not* be a member of a certain class.
		 * 
		 * @param {Object} obj - an HTML object
		 * @param {Object} className - a CSS class name.
		 */
		me.removeClass = function (obj, className) {
			
			if (blankRe.test(className)) {
				return; 
			}
			
			
			var re = new RegExp(getClassReString(className) , "g");
			
			var oldClassName = obj.className;
		
		
			if (obj.className) {
				obj.className = oldClassName.replace(re, ' ');
			}
		
			
		}
		
		/**
		 * Determines if an HTML object is a member of a specific class.
		 * @param {Object} obj - an HTML object.
		 * @param {Object} className - the CSS class name.
		 */
		me.isMemberOfClass = function (obj, className) {
			
			if (blankRe.test(className))
				return false;
			
			var re = new RegExp(getClassReString(className) , "g");
		
			return (re.test(obj.className));
		
		
		}
		
	}

}

/*******************************************************************************
 * This notice must be untouched at all times.
 *
 * This javascript library contains helper routines to assist with event 
 * handling consistently among browsers
 *
 * EventHelpers.js v.1.4 available at http://www.useragentman.com/
 *
 * released under the MIT License:
 *   http://www.opensource.org/licenses/mit-license.php
 *   
 * Chagelog: 1.4: fix fireEvent to work correctly for IE9.
 *
 *******************************************************************************/
var EventHelpers = new function(){
    var me = this;
    
    var safariTimer;
    var isSafari = /WebKit/i.test(navigator.userAgent);
    var isIEPolling = false;
    var globalEvent;
	var safariVer = navigator.userAgent.match(/Version\/([^\s]*)/);
	
	if (safariVer != null && safariVer.length == 2) {
		safariVer = parseFloat(safariVer[1]);
	}
	
	
	me.init = function () {
		if (me.hasPageLoadHappened(arguments)) {
			return;	
		}
		
		/* This is for fireEvent */
		if (document.createEvent) {
			globalEvent = document.createEvent("HTMLEvents");
		} else if (document.createEventObject){
	        // dispatch for IE8 and lower.
	        globalEvent = document.createEventObject();
	    } 	
		
		me.docIsLoaded = true;
	}
	
    /**
     * Adds an event to the document.  Examples of usage:
     * me.addEvent(window, "load", myFunction);
     * me.addEvent(docunent, "keydown", keyPressedFunc);
     * me.addEvent(document, "keyup", keyPressFunc);
     *
     * @author Scott Andrew - http://www.scottandrew.com/weblog/articles/cbs-events
     * @author John Resig - http://ejohn.org/projects/flexible-javascript-events/
     * @param {Object} obj - a javascript object.
     * @param {String} evType - an event to attach to the object.
     * @param {Function} fn - the function that is attached to the event.
     */
    me.addEvent = function(obj, evType, fn){
    
        if (obj.addEventListener) {
            obj.addEventListener(evType, fn, false);
        } else if (obj.attachEvent) {
            obj['e' + evType + fn] = fn;
            obj[evType + fn] = function(){
                obj["e" + evType + fn](self.event);
            }
            obj.attachEvent("on" + evType, obj[evType + fn]);
        }
    }
    
    
    /**
     * Removes an event that is attached to a javascript object.
     *
     * @author Scott Andrew - http://www.scottandrew.com/weblog/articles/cbs-events
     * @author John Resig - http://ejohn.org/projects/flexible-javascript-events/	 * @param {Object} obj - a javascript object.
     * @param {String} evType - an event attached to the object.
     * @param {Function} fn - the function that is called when the event fires.
     */
    me.removeEvent = function(obj, evType, fn){
    
        if (obj.removeEventListener) {
            obj.removeEventListener(evType, fn, false);
        } else if (obj.detachEvent) {
            try {
                obj.detachEvent("on" + evType, obj[evType + fn]);
                obj[evType + fn] = null;
                obj["e" + evType + fn] = null;
            } 
            catch (ex) {
                // do nothing;
            }
        }
    }
    
   
    /** 
     * Find the HTML object that fired an Event.
     *
     * @param {Object} e - an HTML object
     * @return {Object} - the HTML object that fired the event.
     */
    me.getEventTarget = function(e){
        // first, IE method for mouse events(also supported by Safari and Opera)
        if (e.toElement) {
            return e.toElement;
            // W3C
        } else if (e.currentTarget) {
            return e.currentTarget;
            
            // MS way
        } else if (e.srcElement) {
            return e.srcElement;
        } else {
            return null;
        }
    }
    
    
    
    
    /**
     * Given an event fired by the keyboard, find the key associated with that event.
     *
     * @param {Object} e - an event object.
     * @return {String} - the ASCII character code representing the key associated with the event.
     */
    me.getKey = function(e){
        if (e.keyCode) {
            return e.keyCode;
        } else if (e.event && e.event.keyCode) {
            return window.event.keyCode;
        } else if (e.which) {
            return e.which;
        }
    }
    
    function mylog(s) {
    	if (window.console && window.console.log) {
    		console.log(s);
    	} 
    	
    }
    /** 
     *  Will execute a function when the page's DOM has fully loaded (and before all attached images, iframes,
     *  etc., are).
     *
     *  Usage:
     *
     *  EventHelpers.addPageLoadEvent('init');
     *
     *  where the function init() has this code at the beginning:
     *
     *  function init() {
     *
     *  if (EventHelpers.hasPageLoadHappened(arguments)) return;
     *
     *	// rest of code
     *   ....
     *  }
     *
     * @author This code is based off of code from http://dean.edwards.name/weblog/2005/09/busted/ by Dean
     * Edwards, with a modification by me.
     *
     * @param {String} funcName - a string containing the function to be called.
     */
    me.addPageLoadEvent = function(funcName, timerForIE){
    
        var func = eval(funcName);
       
        // for Internet Explorer < 9 (using conditional comments)
        /*@cc_on @*/
        /*@if (@_win32 && @_jscript_version < 10)
		 if (timerForIE) {
		 	isIEPolling = true;
		 } else {
	      	pageLoadEventArray.push(func);
	     	return;
		 }
         /*@end @*/
        
        // if document is already loaded, then just execute.
        if (!isIEPolling && /loaded|complete|interactive/.test(document.readyState)) {
        	mylog('execute immediately')
        	func();
        	return;
       	}
        
        
        
        
        if ((isSafari && safariVer < 3.1) || isIEPolling) { // sniff
        	mylog('polling')
            pageLoadEventArray.push(func);
            
            if (!safariTimer) {
            
                safariTimer = setInterval(function(){
                    if (/loaded|complete/.test(document.readyState)) {
                        clearInterval(safariTimer);
                        
                        /*
                         * call the onload handler
                         * func();
                         */
                        me.runPageLoadEvents();
                        return;
                    }
                    set = true;
                }, 10);
            }
            /* for Mozilla */
        } else if (document.addEventListener) {
        	
            document.addEventListener("DOMContentLoaded", func, null);
            mylog("DOMContentLoaded " + document.readyState);
            /* Others */
        } else {
        	mylog('window.load')
            me.addEvent(window, 'load', func);
        }
    }
    
    var pageLoadEventArray = new Array();
    
    me.runPageLoadEvents = function(e){
        if (isSafari || isIEPolling || e.srcElement.readyState == "complete") {
        
            for (var i = 0; i < pageLoadEventArray.length; i++) {
                pageLoadEventArray[i]();
            }
        }
    }
    /**
     * Determines if either addPageLoadEvent('funcName') or addEvent(window, 'load', funcName)
     * has been executed.
     *
     * @see addPageLoadEvent
     * @param {Function} funcArgs - the arguments of the containing. function
     */
    me.hasPageLoadHappened = function(funcArgs){
        // If the function already been called, return true;
        if (funcArgs.callee.done) 
            return true;
        
        // flag this function so we don't do the same thing twice
        funcArgs.callee.done = true;
    }
    
    
    
    /**
     * Used in an event method/function to indicate that the default behaviour of the event
     * should *not* happen.
     *
     * @param {Object} e - an event object.
     * @return {Boolean} - always false
     */
    me.preventDefault = function(e){
    
        if (e.preventDefault) {
            e.preventDefault();
        }
        
        try {
            e.returnValue = false;
        } 
        catch (ex) {
            // do nothing
        }
        
    }
    
	
	/* 
	 * Fires an event manually.
	 * @author Scott Andrew - http://www.scottandrew.com/weblog/articles/cbs-events
	 * @author John Resig - http://ejohn.org/projects/flexible-javascript-events/	 
	 * @param {Object} obj - a javascript object.
	 * @param {String} evType - an event attached to the object.
	 * @param {Function} fn - the function that is called when the event fires.
	 * 
	 */
	me.fireEvent = function (element,event, options){
		
		if(!element) {
			return;
		}
		
		if (element.dispatchEvent) {
	        // dispatch for firefox + ie9 + others
	        globalEvent.initEvent(event, true, true); // event type,bubbling,cancelable
	        return !element.dispatchEvent(globalEvent);
	    } else if (document.createEventObject){
			return element.fireEvent('on' + event, globalEvent)	
		} else {
			return false;
		}
	}
	
	/*
	 * Detects whether the event "eventName" is supported on a tag with name 
	 * "nodeName".  Based on code from 
	 * http://perfectionkills.com/detecting-event-support-without-browser-sniffing/
	 */
	me.isSupported = function (eventName, nodeName) {
      var el = document.createElement(nodeName);
      eventName = 'on' + eventName;
      var isSupported = (eventName in el);
      if (!isSupported) {
        el.setAttribute(eventName, 'return;');
        isSupported = typeof el[eventName] == 'function';
      }
      el = null;
      return isSupported;
    }
    
    
    /* EventHelpers.init () */
    function init(){
        // Conditional comment alert: Do not remove comments.  Leave intact.
        // The detection if the page is secure or not is important. If 
        // this logic is removed, Internet Explorer will give security
        // alerts.
        /*@cc_on @*/
        /*@if (@_win32)
        
         document.write('<script id="__ie_onload" defer src="' +
        
         ((location.protocol == 'https:') ? '//0' : 'javascript:void(0)') + '"><\/script>');
        
         var script = document.getElementById("__ie_onload");
        
         me.addEvent(script, 'readystatechange', me.runPageLoadEvents);
        
         /*@end @*/
        
    }
    if (!window.html5Forms) {
    	init();
    }
}

html5Forms.start();
