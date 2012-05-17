var html5Forms = new function () {
	var me = this;
	
	var scriptNode = null,
		scriptDir = null,
		
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

html5Forms.init();
