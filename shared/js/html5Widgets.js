/*******************************************************************************
 * This notice must be untouched at all times.
 *
 * This javascript library contains helper routines to assist with event 
 * handling consinstently among browsers
 *
 * html5Widgets.js v.1.1 by Zoltan Hawryluk
 * latest version and documentation available at http://www.useragentman.com/
 *
 * Changelog:
 *  version 1.0: initial release
 *  version 1.1: implemented oninput method for form elements for unsupported browsers
 *               fix IE9 to ensure backspace and delete keys fire an oninput event.
 *  version 1.2: Added Number Element Widget
 *  
 * released under the MIT License:
 *   http://www.opensource.org/licenses/mit-license.php
 *
 *******************************************************************************/

var html5Widgets = new function(){
	var me = this;
	
	
	var delayEventTimeout = null;
	
	me.inputNodes = new Array();
	me.outputNodes = new Array();
	me.formElements = null;
	me.placeholderNodes = new Array();
	me.dummyLink = document.createElement('input');
	var quoteRe = /\"/g;
	
	var dummyIDCount = 0;
	var supportsNatively = new Object();
	
	var isBadChrome = navigator.userAgent.indexOf('Chrome');
	var valueRe = /this\.value/g;
	var varRe = /([a-zA-Z][a-zA-Z0-9]*\.value)/g;
	var isDebug;
	
	var isIE9 = false;
	
	/*@cc_on
	  @if (@_jscript_version == 9)
	    isIE9 = true;
	  @end
	@*/
	
	
	
	me.init = function(){
		
		if (EventHelpers.hasPageLoadHappened(arguments)) {
			return;
		}
		
		supportsNatively['oninput'] = EventHelpers.isSupported('input', 'form');
		
		isDebug = CSSHelpers.isMemberOfClass(document.body, 'html5Widgets-debug')
		
		// dummy link setup
		me.type = 'text'
		me.dummyLink.style.position = 'absolute';
		me.dummyLink.style.top = '-200px';
		document.body.appendChild(me.dummyLink)
		
		var inputSupport = Modernizr.input
		
		if (!inputSupport['placeholder']) {
			setPlaceholders();
		}
		indexOutputNodes();
		insertElements(); 
		
		me.resolveOutputs();
		
		/* document.getElementById('supports').innerHTML = 
			DebugHelpers.getProperties(Modernizr.inputtypes, 'inputtypes') + " " +
			DebugHelpers.getProperties(Modernizr.input, 'input') + " " + 
			DebugHelpers.getProperties(Modernizr, 'Modernizr'); */
		
	}
	
	
	
	function supports_input_placeholder() {
	  var i = document.createElement('input');
	  return 'placeholder' in i;
	}
	
	function setPlaceholders() {
		
		var nodes = [document.getElementsByTagName('input'), document.getElementsByTagName('textarea')];
		
		for (var i=0; i<nodes.length; i++) {
			for (var j=0; j<nodes[i].length; j++) {
				var node = nodes[i][j];
				
				if (DOMHelpers.getAttributeValue(node, 'placeholder')) {
					me.placeholderNodes.push(new PlaceholderInput(node));
				}
			}
		}
	}
	
	
	
	
	
	function getNextDummyID () {
		dummyIDCount ++;
		return "id" + dummyIDCount;
	}
	
	function indexOutputNodes () {
		var outputElements = document.getElementsByTagName('output');
		for (var i=0; i<outputElements.length; i++) {
			var outputEl = outputElements[i];
			if (outputEl.value != undefined && outputEl.onforminput != undefined) {
				
				// this browser supports the output tag .. bail
				supportsNatively["output"] = true;
				break;
			}
			me.outputNodes.push(new OutputElement(outputEl))
		}
		
		me.formElements = document.getElementsByTagName('form');
		
	}
	
	function setOutputEvents(nodeName) {
		var formElements = document.getElementsByTagName(nodeName);
		
		for (var i=0; i<formElements.length; i++) {
			var formElement = formElements[i];
			// first - set event to resolve output tags
			EventHelpers.addEvent(formElement, 'change', me.resolveOutputs);
			EventHelpers.addEvent(formElement, 'keyup', me.resolveOutputs);
			EventHelpers.addEvent(formElement, 'cut', me.resolveOutputs);
		}	
	}
		
	
	function insertElements(){
		var inputSupport = Modernizr.inputtypes;
		
		
		// Remove the onload event as we are creating the sliders with a JS call
		if (window.fdSliderController) {
			fdSliderController.removeOnLoadEvent();
		}
		
		var formElementTypes = ["input", "select", "textarea"];
		for (var i=0; i<formElementTypes.length; i++) {
			setOutputEvents(formElementTypes[i]);
		}
		
		var formElements = document.getElementsByTagName('input');
		
		// leave if this browser supports the range type.
		if (formElements.length <= 0) {
			return;
		}

		for (var i = 0; i < formElements.length; i++) {
			
			
			var formElement = formElements[i];
			
			
			//var elType = getAttributeValue(formElement, 'type');
			var elType = DOMHelpers.getAttributeValue(formElement, 'type');
			//jslog.debug(elType)
			if (!formElement.name) {
				formElement.name = getNextDummyID();
			}
			
			switch (elType) {
				
				case "range":
				
					if (!inputSupport.range) {
						
						me.inputNodes.push(new RangeElement(formElement));
					}
					
					break;
					
				case "date": 
				case "week":
				case "month":
				case "datetime":
				case "datetime-local":
					
					// check to see if the browser supports the type.
					if (!inputSupport[elType] || (window.html5Forms && html5Forms.forceJSDatePicker)) {
						me.inputNodes.push(new CalendarElement(formElement, elType));
					}
					break;
				case "color":
					if (!inputSupport.color || isBadChrome) {
						me.inputNodes.push(new ColorElement(formElement, elType));
					} 
					
					break;
				case "number":
				
					if (!inputSupport.number) {
						me.inputNodes.push(new NumberElement(formElement, elType));
					} 
					
					break;
			}
			
		}
		
		
		
		if (window.fdSliderController) {
			fdSliderController.redrawAll();
		}
		
		if (window.jscolor) {
			jscolor.init();
		}
	}
	
	
	
	
	function delayedFireEvent(el, ev, callback){
			
			if (!document.createEventObject ) {
				me.fireEvent(el, ev);
				if (callback) {
					callback();
				}
			}
			else {
				
					
				if (delayEventTimeout != null) {
					clearTimeout(delayEventTimeout)
				}
				
				delayEventTimeout = setTimeout(
					function(){
						EventHelpers.fireEvent(el, ev);
						
						if (callback) {
							callback();
						}
					}
				, 1);
				
			}
		}
		
	me.fireEvent = function(el, ev){
		EventHelpers.fireEvent(el, ev);
	}
	
	me.resolveOutputs = function (e) {
		
		// This resolves the onforminput events on the output nodes
		for (var i=0; i<me.outputNodes.length; i++) {
			var outputNode = me.outputNodes[i];
			outputNode.resolve();
		}
		
		// This resolves the oninput events on the form nodes
		if (!supportsNatively['oninput']) {
			for (var i=0; i<me.formElements.length; i++) {
				var formNode = me.formElements[i];
				var oninput = DOMHelpers.getAttributeValue(formNode, 'oninput');
				if (oninput) {
					eval(me.getValueFormula(oninput, formNode));
				}
			}
		} else if (isIE9 && e) {
			// must deal with buggy implementation - delete and backspace don't fire
			// the oninput event
			var input = EventHelpers.getEventTarget(e);
			switch (e.type) {
				
				case "keyup":
					var key = EventHelpers.getKey(e);
					
					switch (key) {
						case 8:
						case 46:
						case 88:
							EventHelpers.fireEvent(input.form, 'input');
					}
					break;
				case "cut":
					delayedFireEvent(input.form, 'input');
					break;
			}
			
		} 
	}
	
	me.hideInput = function (node) {
		
		node.style.position = 'absolute';
		node.style.top = '-1000px';
		node.style.left = '-1000px';
		node.style.visibility = 'hidden'
	}
	
	me.getValueFormula = function(expr, parentForm) {
		var formula = expr
		if (formula == null) {
			return null;
		}
		formula = formula
			.replace(valueRe, 'value')
			.replace(varRe, 'document.forms["' + parentForm.id + '"].$1');
		return formula;
	}
	
	
	function showError(err) {
		if (isDebug) {
			alert(err);
		}
		throw(err);
	}		
	
	
	
	/*
	 * Range Element
	 */
	
	function RangeElement(node){
		var me = this,
			parentForm,
			hasFiredChangeEvent = false;
		
		me.node = node;
		me.sliderNode = null;
		
		
		function init (){
			parentForm = DOMHelpers.getAncestorByTagName(node, 'form');
			var min = parseFloat(DOMHelpers.getAttributeValue(me.node, 'min'));
			var max = parseFloat(DOMHelpers.getAttributeValue(me.node, 'max'));
			
			if (!window.fdSliderController) {
				showError("slider.js must be included in order for the range element to work in this browser. See documentation for more details.");
			}
			
			if (isNaN(min)) {
				min = 0;
			}
			
			if (isNaN(max)) {
				max = 100;
			}
			
			
			var step = DOMHelpers.getAttributeValue(me.node, 'step');
			
			if (step == null) {
				step = "1"
			} else if (typeof(step) == 'number') {
				step = step + "";
			}
			
			// Must add id if not there (Requirement of the script)
			if (!me.node.id) {
				me.node.id = "HTML5Form-slider" + getNextDummyID();
			}
			
			
			
			// Create an Object to hold the slider's initialisation data
			var options = {
				// A reference to the input
				inp: me.node,
				// A String containing the increment value (and the return precision, in this case 2 decimal places "x.20")
				inc: step,
				// Maximum keyboard increment (automatically uses double the normal increment if not given)
				maxInc: step,
				// Numeric range
				range: [min, max],
				// Callback functions
				callbacks: {
					"update": [me.changeEvent]
				},
				// String representing the classNames to give the created slider
				classNames: "html5Widgets-slider fd_jump",
				// Tween the handle onclick?
				tween: false,
				// Is this a vertical slider
				vertical: false,
				// Do we hide the associated input on slider creation
				hideInput: false,
				// Does the handle jump to the nearest click value point when the bar is clicked (tween cannot then be true)
				clickJump: true,
				// Full ARIA required
				fullARIA: false,
				// Do we disable the mouseWheel for this slider
				noMouseWheel: false
			
			};

			// Create the slider
			fdSliderController.createSlider(options);
			
			//tweak styles
			me.sliderNode = document.getElementById('fd-slider-' + me.node.id);
			me.sliderNode.style.width = me.node.offsetWidth + "px";
			
			elDisplay = me.node.style.display
			if (elDisplay != 'block') {
				me.sliderNode.style.display = 'inline-block';
			//me.sliderNode.style.paddingTop = "0.9em";
			}
			
			html5Widgets.hideInput(me.node);
			
			document.getElementById('fd-slider-' + me.node.id).style.zIndex = '0';
		
			me.node.tabIndex = "-1";
			me.node.type = "text";
			
			// Event Handling
			EventHelpers.addEvent(me.node, 'change', changeOriginalNodeEvent);
		}
		
		me.changeEvent = function (e){
			var oninput = DOMHelpers.getAttributeValue(parentForm, 'oninput');
			
			if (oninput) {
				eval(html5Widgets.getValueFormula(oninput, parentForm));
			}
			
			/* The if statement is to prevent this to continuously fire in an endless loop */
			if (!hasFiredChangeEvent) {
				hasFiredChangeEvent = true;
				delayedFireEvent(me.node, 'change', function () {
					hasFiredChangeEvent = false;
				});
			}
		}
			
		function changeOriginalNodeEvent(e) {
			
			fdSliderController.updateSlider(me.node.id);
		}
		
		init();
		
	}
	
	function CalendarElement (node, type) {
		var me = this;
		
		me.node = node;
		me.type = type;
		
		var badDateTimeValueRe = 
			/^[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}Z{0,1}$/;
		var displayDateTimeValueRe = 
			/^[0-9]{4}-[0-9]{2}-[0-9]{2} [0-9]{2}:[0-9]{2}$/;
		var originalVisibilityState;
		
		function init() {
			
			if (!window.Calendar && isDebug) {
				showError("jscalendar scripts and CSS must be included for date and time form elements to work.  See documentation for more details. ")
			}
			
			// Must add id if not there (Requirement of the script)
			if (!me.node.id) {
				me.node.id = "HTML5Form-calendar" + getNextDummyID();
			}
			
			/* 
			 * If this is the result of coming back to the page from history,
			 * then it may have an old reformatted version in it from a previous
			 * submit.  Let's re-format it back.
			 */
			
			prepareForDisplay();
			
			
			var formatString = "";
			switch (me.type) {
				case 'date':
					formatString = "%Y-%m-%d";
					break;
				case 'month':
					formatString = "%Y-%m";
					break;
				case 'week':
					formatString = "%Y-W%W";
					break;
				case 'datetime':
					placeUTCInfo();
				case 'datetime-local':
				case 'datetime':
					formatString = "%Y-%m-%d %H:%M"
					break;
			}
			
			/*
			* Chrome, unfortunately, only implements type="date", and it's
			* implementation displays the data in DD/MM/YYYY format. Even 
			* though it submits the data in YYYY-MM-DD format, this can
			* be confusing to users if there is a, say, datetime widget
			* with a date widget and they show different formats.  In order
			* to fix this, I change the type to "text" so that it uses the
			* polyfill instead of the native one.  Note that type="date" 
			* widgets in Chrome are only changed to type="text" when 
			* html5Forms.js's script tag has its 
			* data-webforms2-force-js-date-picker attribute set to "true".
			*/
			me.node.type = 'text';
			
			//me.node.readOnly = true;
			
			
			
			Calendar.setup(
			    {
				  eventName   :"click",
				  showsTime   : type.indexOf('time') >= 0,
				  cache		  : true,
			      inputField  : me.node.id,      // ID of the input field
			      ifFormat    : formatString,    // the date format
			      button      : me.node.id       // ID of the button
			    }
  			);
			
			
			
			
			
			EventHelpers.addEvent(me.node, 'click', forceCalToTop);
			EventHelpers.addEvent(me.node, 'focus', focusEvent)
			EventHelpers.addEvent(me.node, 'keypress', openCalendar);
			EventHelpers.addEvent(me.node, 'blur', closeCalendar);
			
			EventHelpers.addEvent(me.node, 'keypress', keydownEvent)
			//me.node.type = "text";
			
			// this will call submitEvent() after the form has been validated by
			// webforms2.js
			if (window.$wf2) {
				$wf2.callBeforeValidation.push(prepareForSubmission);
				$wf2.callAfterValidation.push(validationEvent);
			}
			
		}
		
		function placeUTCInfo() {
			
			var label = document.createElement('span');
			label.innerHTML = "UTC";
			label.style.paddingLeft = "5px";
			
			DOMHelpers.insertAfter(me.node, label);
			
			var width = label.offsetWidth;
			
			me.node.style.width = (me.node.offsetWidth - 5 - width) + 'px';
			
		}
		
		function prepareForSubmission() {
			var splitVals;
			
			switch (me.type) {
				case "datetime":
				case "datetime-local":
					
					originalVisibilityState = me.node.style.visibility;
					me.node.style.visibility = 'hidden';
					if (me.node.value.match(displayDateTimeValueRe)) {
						splitVals = me.node.value.split(' ');
						me.node.value = splitVals[0] + "T" + splitVals[1];
					}
					
					switch (me.type) {
						case "datetime-local":
							break;
						case "datetime":
							if (me.node.value != "") {
								me.node.value += "Z";
							}
					}
					
			}
		}
		
		function prepareForDisplay() {
			switch(me.type) {
				case "datetime":
				case "datetime-local":
					if ( me.node.value.match(badDateTimeValueRe)) {
						me.node.value = me.node.value.replace(/T/, ' ').replace(/Z/, '');
					}
					if (originalVisibilityState != null) {
						me.node.style.visibility = originalVisibilityState;
					}
					
			}
			
			
		}
		
		function validationEvent(e, hasValidated) {
			if (!hasValidated) {
				prepareForDisplay();
			}
		}
		
		function forceCalToTop(e) {
			var cal = window.calendar;
			
			cal.element.style.zIndex = 100;
		}
		
		function focusEvent(e) {
			var el = EventHelpers.getEventTarget(e);
			EventHelpers.fireEvent(el, 'click')
		}
		
		function openCalendar(e) {
			
			var cal = window.calendar;
			
			cal.element.style.zIndex = 100;
			if (cal.open != undefined) {
				cal.open();
			} 
			//EventHelpers.fireEvent(this, 'blur');
			//EventHelpers.fireEvent(this, 'focus');
		}
		
		function closeCalendar(e){
				
				var cal = window.calendar;
				if (cal) {
					cal.hide();
				}
		} 
		
		function keydownEvent(e) {
			
		 	var c = EventHelpers.getKey(e);
			
			switch(c){
				case 13:
					html5Widgets.dummyLink.focus();
					this.focus();
					EventHelpers.preventDefault(e);
					openCalendar(e);
					break;
				case 9:
					closeCalendar(e);
					break;
				default:
					EventHelpers.preventDefault(e);
					break;
			}
			
			
		}
		
		function submitEvent(e) {
			prepareForSubmission();
		}
		
		init();
		
	}
	
	
	
	
	
	
	
	/*
	 * Output Element
	 */
	function OutputElement (node) {
		var me = this;
		me.node = node;
		
		var value;
		var valueFormula;
		var parentForm;
	
		
		
		function init () {
			parentForm = DOMHelpers.getAncestorByTagName(node, 'form');
			if (!parentForm.id) {
				parentForm.id = getNextDummyID();
			}
			
			valueFormula = html5Widgets.getValueFormula(DOMHelpers.getAttributeValue(me.node, 'onforminput'), parentForm);
		}
		
		
		
		me.resolve = function () {
			if (valueFormula == null) {
				return;
			} else {
				eval(valueFormula);
				me.node.innerHTML = value;
				me.node.value = value;
			}
			
		}
		
		
		init();
	}
	
	function ColorElement (node) {
		var me = this;
		
		/* note: color picker setPad() is what you are looking for */
		me.node = node;
		
		function init () {
			if (!window.jscolor) {
				showError('jscolor script must be included in order for the color input type to work in this browser. See documentation for more details.')
			}
			CSSHelpers.addClass(me.node, 'color');
			CSSHelpers.addClass(me.node, '{hash:true,caps:false}');
			me.node.type = "text";
		}
		
		
		init();
	}
	
	/*
	 * NumberElement: refactored from http://www.kethinov.com/jsstepper.php.
	 */
	
	function NumberElement (node) {
		var me = this,
			min = parseFloat(DOMHelpers.getAttributeValue(node, 'min')),
			max = parseFloat(DOMHelpers.getAttributeValue(node, 'max')),
			step = parseFloat(DOMHelpers.getAttributeValue(node, 'step'));
		
		me.node = node;
		
		
		
		if (isNaN(step)) {
			// we don't have to create the up and down arraw widgets
			return;
		}
		
		EventHelpers.addEvent(node, 'keyup', keyUpEvent);
		
		
		function keyUpEvent() {
			
			if (isNumeric(this.value)) {
				
					/* if (this.value > max) this.value = max;
					else if (this.value < min) this.value = this.min; */
				
			} else if (this.value != '') {
				var val = parseFloat(this.value);
				if (isNaN(val)) {
					this.value = '';
				} else {
					this.value = val;
				} 
			}
			
		}
	
		
		
		function nearestValid(value, direction) { 
			
			var n = (value - min)/step,
				r;
			//alert(StringHelpers.sprintf("n: %s, value: %s, min: %s, step: %s", n, value, min, step))
			if (n == parseInt(n)) {
				r = value;
			} else {
			
				if (direction < 0) {
					n = Math.floor(n + 1);
				} else {
					n = Math.ceil(n -1);
				}
				
				r = min + step * n;
			}
			
			if (r > max) {
				r -= step;
			} else if (r < min) {
				r+= step
			}
			
			return r;
		}
		
		function buttonMouseDownEvent(e) {
			
			var buttonType = this.className;
			var stepMult = step;
			if (buttonType == 'dnbutton') {
				stepMult = -step;
			}
			
			
			var min = this.min;
			var max = this.max;
			if (
				(stepMult < 0 && (node.value > min || isNaN(min))) ||
				(stepMult > 0 && (node.value < max || isNaN(max)))
			) {
				setValue(me.node, nearestValid(parseFloat(node.value) + stepMult, stepMult));
			}

			var delayedOnce = false;
			var date = new Date();
			var curDate = null;
		
			this.interval = setInterval(function() {
				if (!delayedOnce) {
					curDate = new Date();
					if (curDate - date > 500) delayedOnce = true;
				}
				else if (
					(stepMult < 0 && (node.value > min || isNaN(min))) ||
					(stepMult > 0 && (node.value < max || isNaN(max)))
				) {
					setValue(me.node, nearestValid(parseFloat(node.value) + stepMult, stepMult));
				}
			}, 50);
			EventHelpers.preventDefault(e);
		}
		
		function setValue(node, value) {
			if (isNaN(value)) {
				node.value = '';
			} else {
				node.value = value;
			}
		}
		
		function buttonClickEvent(e) {
			clearInterval(this.interval);
			EventHelpers.preventDefault(e);
		}
		function buttonMouseUpEvent(e) {
			clearInterval(this.interval);
			EventHelpers.preventDefault(e);
		}
		
		function isNumeric(n) {
		  return !isNaN(parseFloat(n)) && isFinite(n);
		}

	
		function hasNativeSpinner() {
			try {
				return window.getComputedStyle(me.node, '-webkit-inner-spin-button').WebkitAppearance != undefined;
			} catch (ex) {
				return false;
			}
		}	
		
		function init () {
			var upbutton = document.createElement('a');
			upbutton.className = 'upbutton';
			upbutton.appendChild(document.createTextNode("\u25B2"));
			upbutton.targInput = node;
			upbutton.max = max;
			
			var dnbutton = document.createElement('a');
			dnbutton.className = 'dnbutton';
			dnbutton.appendChild(document.createTextNode("\u25BC"));
			dnbutton.targInput = node;
			dnbutton.min = min;
			dnbutton.max = max;
		
			EventHelpers.addEvent(upbutton, 'mousedown', buttonMouseDownEvent);
			EventHelpers.addEvent(dnbutton, 'mousedown', buttonMouseDownEvent);
			
			EventHelpers.addEvent(upbutton, 'click', buttonClickEvent);
			EventHelpers.addEvent(upbutton, 'mouseup', buttonMouseUpEvent);
			EventHelpers.addEvent(dnbutton, 'click', buttonClickEvent);
			EventHelpers.addEvent(dnbutton, 'mouseup', buttonMouseUpEvent);
			
			
			if (!hasNativeSpinner()) {
				var controlsNode = document.createElement('div');
				controlsNode.className = 'html5-numberControls';
				controlsNode.appendChild(upbutton);
				controlsNode.appendChild(dnbutton);
				
				var wrapperNode = document.createElement('div')
				wrapperNode.className = 'html5-numberWrapper';
				wrapperNode.appendChild(controlsNode);
				var parentNode = node.parentNode;
				
				
				
				
				parentNode.insertBefore(wrapperNode, node);
				
		
				var nodeWidth = node.offsetWidth;
				var nodeStyle = CSSHelpers.getCurrentStyle(node);
			
				node.style.width = (nodeWidth - upbutton.offsetWidth -9) + 'px';
				wrapperNode.style.width = nodeWidth + 'px';
				wrapperNode.style.marginTop = nodeStyle.marginTop;
				wrapperNode.style.height = (node.offsetHeight) + 'px';
			}
			
			
			
		}
		/* Finally: if the form field has a value onload that is not a number, remove it 
		if (!isNumeric(node.value)) {
			node.value = '';
			EventHelpers.fireEvent(node, 'change');
		}*/
		init();
	}
	
	function PlaceholderInput (node) {
		var me = this;
		
		me.node = node;
		
		var form, defaultText;
				
		function init () {
			defaultText = DOMHelpers.getAttributeValue(node, 'placeholder');
			form = DOMHelpers.getAncestorByTagName(node, 'form');
			
			me.setPlaceholderText(true);
			EventHelpers.addEvent(me.node, 'blur', blurEvent);
			EventHelpers.addEvent(me.node, 'focus', focusEvent);
			
			if (me.node.form) {
				EventHelpers.addEvent(me.node.form, 'submit', removePlaceholderText);
			}
			
			if (window.$wf2) {
				if ($wf2.callBeforeValidation != undefined) {
					$wf2.callBeforeValidation.push(removePlaceholderText);
				}
				
				if ($wf2.callAfterValidation != undefined) {
					$wf2.callAfterValidation.push(postValidationEvent);
				}
			}
		}
		
		me.setPlaceholderText = function (isLoadEvent) {
			//jslog.debug(StringHelpers.sprintf('initiator: %s', this));
			var isAutofocus = DOMHelpers.getAttributeValue(me.node, 'autofocus') != null;
			
			
			if (me.node.value == "" || (isLoadEvent && me.node.value == defaultText)) {
				CSSHelpers.addClass(me.node, 'html5-hasPlaceholderText');
				me.node.value = defaultText;
				
			}
			
			if (isLoadEvent && isAutofocus && me.node.value == defaultText ) {
				CSSHelpers.removeClass(me.node, 'html5-hasPlaceholderText');
				me.node.value = '';
			}
			
			
			
		}
		
		function focusEvent(e) {
			
			CSSHelpers.addClass(me.node, 'html5-hasFocus');
			removePlaceholderText();
		}
		
		function blurEvent(e) {
			//jslog.debug('removed focus on ' + me.node.name)
			CSSHelpers.removeClass(me.node, 'html5-hasFocus');
			me.setPlaceholderText();
		}
		
		function removePlaceholderText() {
			//jslog.debug('removePlaceholderText() for ' + me.node.name)
			if (CSSHelpers.isMemberOfClass(me.node, 'html5-hasPlaceholderText')) {
				me.node.value = "";
				CSSHelpers.removeClass(me.node, 'html5-hasPlaceholderText');
			}
		}
		
		function postValidationEvent(e, didValidate) {
			////jslog.debug(StringHelpers.sprintf('post Validation: %s, didValidate = %s, has focus = %s', me.node.name, didValidate, CSSHelpers.isMemberOfClass(me.node, 'html5-hasFocus') )	)
			if (!didValidate && !CSSHelpers.isMemberOfClass(me.node, 'html5-hasFocus')) {
				me.setPlaceholderText();
			} 
		}
		
		init();
	}
	
	var CSSHelpers = new function () {
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
		
		/* from http://blog.stchur.com/2006/06/21/css-computed-style/ */
		me.getCurrentStyle = function(obj)
		{
		  var computedStyle;
		  if (typeof obj.currentStyle != 'undefined')
		    { computedStyle = obj.currentStyle; }
		  else
		    { computedStyle = document.defaultView.getComputedStyle(obj, null); }
		
		  return computedStyle;
		}
	}
	
	
	
	var DOMHelpers = new function () {
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
				var typeRe = new RegExp(attrName + '=(\\"([a-zA-Z\-]*)\\"|[a-zA-Z\-]*)');
				//jslog.debug(XMLHelpers.getOuterXML(obj))
				var typeVal = XMLHelpers.getOuterXML(obj).split('>')[0].match(typeRe);
				//jslog.debug(typeVal)
				if (typeVal && typeVal.length >= 1) {
					return typeVal[1].replace(quoteRe, '');
				} else {
					return null;
				}
	
			}
		}
		
		me.insertAfter = function (refNode, nodeToInsert) {
			var parent = refNode.parentNode;
			
			var nextSibling = refNode.nextSibling;
			if (nextSibling) {
				parent.insertBefore(nodeToInsert, nextSibling);
			} else {
				parent.appendChild(nodeToInsert);
			}
		}
		
		/**
		 * Given an tag, find the first ancestor tag of a given tag name.
		 * 
		 * @param {Object} obj - a HTML or XML tag.
		 * @param {String} tagName - the name of the ancestor tag to find.
		 * @return {Object} - the ancestor tag, or null if not found.
		 */ 
		me.getAncestorByTagName = function(obj, tagName) {
			
			for (var node = obj.parentNode; 
				  node.nodeName.toLowerCase() != 'body';
				  node = node.parentNode) {
			
				if (tagName.toLowerCase() == node.nodeName.toLowerCase()) {
					return node;
				}
				  
			}
			return null;
		}
		
		me.removeNode = function (node) {
			var parentNode = node.parentNode;
			if (parentNode) {
				parentNode.removeChild(node);
			} 
		}
		
	}
	
	var StringHelpers = new function () {
		var me = this;
		
		/*******************************************************************************
		 * Function sprintf(format_string,arguments...) Javascript emulation of the C
		 * printf function (modifiers and argument types "p" and "n" are not supported
		 * due to language restrictions)
		 * 
		 * Copyright 2003 K&L Productions. All rights reserved
		 * http://www.klproductions.com
		 * 
		 * Terms of use: This function can be used free of charge IF this header is not
		 * modified and remains with the function code.
		 * 
		 * Legal: Use this code at your own risk. K&L Productions assumes NO
		 * resposibility for anything.
		 ******************************************************************************/
		me.sprintf = function (fstring)
		  { var pad = function(str,ch,len)
		      { var ps='';
		        for(var i=0; i<Math.abs(len); i++) ps+=ch;
		        return len>0?str+ps:ps+str;
		      }
		    var processFlags = function(flags,width,rs,arg)
		      { var pn = function(flags,arg,rs)
		          { if(arg>=0)
		              { if(flags.indexOf(' ')>=0) rs = ' ' + rs;
		                else if(flags.indexOf('+')>=0) rs = '+' + rs;
		              }
		            else
		                rs = '-' + rs;
		            return rs;
		          }
		        var iWidth = parseInt(width,10);
		        if(width.charAt(0) == '0')
		          { var ec=0;
		            if(flags.indexOf(' ')>=0 || flags.indexOf('+')>=0) ec++;
		            if(rs.length<(iWidth-ec)) rs = pad(rs,'0',rs.length-(iWidth-ec));
		            return pn(flags,arg,rs);
		          }
		        rs = pn(flags,arg,rs);
		        if(rs.length<iWidth)
		          { if(flags.indexOf('-')<0) rs = pad(rs,' ',rs.length-iWidth);
		            else rs = pad(rs,' ',iWidth - rs.length);
		          }    
		        return rs;
		      }
		    var converters = new Array();
		    converters['c'] = function(flags,width,precision,arg)
		      { if(typeof(arg) == 'number') return String.fromCharCode(arg);
		        if(typeof(arg) == 'string') return arg.charAt(0);
		        return '';
		      }
		    converters['d'] = function(flags,width,precision,arg)
		      { return converters['i'](flags,width,precision,arg); 
		      }
		    converters['u'] = function(flags,width,precision,arg)
		      { return converters['i'](flags,width,precision,Math.abs(arg)); 
		      }
		    converters['i'] =  function(flags,width,precision,arg)
		      { var iPrecision=parseInt(precision);
		        var rs = ((Math.abs(arg)).toString().split('.'))[0];
		        if(rs.length<iPrecision) rs=pad(rs,' ',iPrecision - rs.length);
		        return processFlags(flags,width,rs,arg); 
		      }
		    converters['E'] = function(flags,width,precision,arg) 
		      { return (converters['e'](flags,width,precision,arg)).toUpperCase();
		      }
		    converters['e'] =  function(flags,width,precision,arg)
		      { iPrecision = parseInt(precision);
		        if(isNaN(iPrecision)) iPrecision = 6;
		        rs = (Math.abs(arg)).toExponential(iPrecision);
		        if(rs.indexOf('.')<0 && flags.indexOf('#')>=0) rs = rs.replace(/^(.*)(e.*)$/,'$1.$2');
		        return processFlags(flags,width,rs,arg);        
		      }
		    converters['f'] = function(flags,width,precision,arg)
		      { iPrecision = parseInt(precision);
		        if(isNaN(iPrecision)) iPrecision = 6;
		        rs = (Math.abs(arg)).toFixed(iPrecision);
		        if(rs.indexOf('.')<0 && flags.indexOf('#')>=0) rs = rs + '.';
		        return processFlags(flags,width,rs,arg);
		      }
		    converters['G'] = function(flags,width,precision,arg)
		      { return (converters['g'](flags,width,precision,arg)).toUpperCase();
		      }
		    converters['g'] = function(flags,width,precision,arg)
		      { iPrecision = parseInt(precision);
		        absArg = Math.abs(arg);
		        rse = absArg.toExponential();
		        rsf = absArg.toFixed(6);
		        if(!isNaN(iPrecision))
		          { rsep = absArg.toExponential(iPrecision);
		            rse = rsep.length < rse.length ? rsep : rse;
		            rsfp = absArg.toFixed(iPrecision);
		            rsf = rsfp.length < rsf.length ? rsfp : rsf;
		          }
		        if(rse.indexOf('.')<0 && flags.indexOf('#')>=0) rse = rse.replace(/^(.*)(e.*)$/,'$1.$2');
		        if(rsf.indexOf('.')<0 && flags.indexOf('#')>=0) rsf = rsf + '.';
		        rs = rse.length<rsf.length ? rse : rsf;
		        return processFlags(flags,width,rs,arg);        
		      }  
		    converters['o'] = function(flags,width,precision,arg)
		      { var iPrecision=parseInt(precision);
		        var rs = Math.round(Math.abs(arg)).toString(8);
		        if(rs.length<iPrecision) rs=pad(rs,' ',iPrecision - rs.length);
		        if(flags.indexOf('#')>=0) rs='0'+rs;
		        return processFlags(flags,width,rs,arg); 
		      }
		    converters['X'] = function(flags,width,precision,arg)
		      { return (converters['x'](flags,width,precision,arg)).toUpperCase();
		      }
		    converters['x'] = function(flags,width,precision,arg)
		      { var iPrecision=parseInt(precision);
		        arg = Math.abs(arg);
		        var rs = Math.round(arg).toString(16);
		        if(rs.length<iPrecision) rs=pad(rs,' ',iPrecision - rs.length);
		        if(flags.indexOf('#')>=0) rs='0x'+rs;
		        return processFlags(flags,width,rs,arg); 
		      }
		    converters['s'] = function(flags,width,precision,arg)
		      { var iPrecision=parseInt(precision);
		        var rs = arg;
		        if(rs.length > iPrecision) rs = rs.substring(0,iPrecision);
		        return processFlags(flags,width,rs,0);
		      }
		    farr = fstring.split('%');
		    retstr = farr[0];
		    fpRE = /^([-+ #]*)(\d*)\.?(\d*)([cdieEfFgGosuxX])(.*)$/;
		    for(var i=1; i<farr.length; i++)
		      { fps=fpRE.exec(farr[i]);
		        if(!fps) continue;
		        if(arguments[i]!=null) retstr+=converters[fps[4]](fps[1],fps[2],fps[3],arguments[i]);
		        retstr += fps[5];
		      }
		    return retstr;
		}
	}
	
	var XMLHelpers = new function () {
		var me = this;
		
		/**
		 * Given an XML node, return the XML inside as a string and the XML string of the node itself.
		 * Similar to Internet Explorer's outerHTML property, except it is for XML, not HTML.
		 * Created with information from http://www.codingforums.com/showthread.php?t=31489
		 * and http://www.mercurytide.co.uk/whitepapers/issues-working-with-ajax/		
		 * 
		 * @param {Object} node - a DOM object.
		 * @param {Object} options - a JS object containing options.  To date,
		 * 		the only one supported is "insertClosingTags", when set to
		 * 		true, converts self closing tags, like <td />, to <td></td>.
		 * @return {String} - the XML String inside the object.
		 */
		me.getOuterXML = function (node, options) {
			var r;
				// Internet Explorer
				if (node.xml) {
					r = node.xml;
					
				// Everyone else 
				} else if (node.outerHTML) { 
					r = node.outerHTML;
				} else if (window.XMLSerializer) {
				
					var serializer = new XMLSerializer();
	    			var text = serializer.serializeToString(node);
					r = text;
				} else {
					return null;
				}
				
				/*
				 * If the XML is actually HTML and you are inserting it into an HTML
				 * document, you must use the "insertClosingTags" option, otherwise
				 * Opera will not like you, especially if you have empty <td> tags.
				 */
				if (options) {
					if (options.insertClosingTags) {
						r = r.replace(selfClosingTagRe, "<$1></$1>");
					}
				}
				return r;
		}
	}
	
	
	// default styles 
	var placeholderCSS = 'color: #999999; font-style: italic';
	var placeholderRequiredCSS = 'color: #ffcccc !important;'
	
	var sb = "";
	
	// has to be two seperate rules, or some browsers, like firefox, will not use the rule.
	if (document.getElementsByTagName('body').length == 0) {
		sb = '<style type="text/css" id="testCSS">' +
		StringHelpers.sprintf('.html5-hasPlaceholderText{%s} input::-webkit-input-placeholder {%s}', placeholderCSS, placeholderCSS) +
		'</style>';
		
		
		document.write(sb);
	}
}



EventHelpers.addPageLoadEvent('html5Widgets.init');

