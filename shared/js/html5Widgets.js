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
	
	var isBadChrome = (navigator.userAgent.indexOf('Chrome') > 0);
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
		
		
		supportsNatively['oninput'] = html5Forms.isEventSupported('input', 'form');
		
		isDebug = document.body.classList.contains('html5Widgets-debug')
		
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
				
				if (node.getAttribute('placeholder')) {
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
			formElement.addEventListener('change', me.resolveOutputs);
			formElement.addEventListener('keyup', me.resolveOutputs);
			formElement.addEventListener('cut', me.resolveOutputs);
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
			var elType = formElement.getAttribute('type');
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
						html5Forms.fireEvent(el, ev);
						
						if (callback) {
							callback();
						}
					}
				, 1);
				
			}
		}
		
	me.fireEvent = function(el, ev){
		html5Forms.fireEvent(el, ev);
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
				var oninput = formNode.getAttribute('oninput');
				if (oninput) {
					eval(me.getValueFormula(oninput, formNode));
				}
			}
		} else if (isIE9 && e) {
			// must deal with buggy implementation - delete and backspace don't fire
			// the oninput event
			var input = e.currentTarget;
			switch (e.type) {
				
				case "keyup":
					var key = html5Forms.getKey(e);
					
					switch (key) {
						case 8:
						case 46:
						case 88:
							html5Forms.fireEvent(input.form, 'input');
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
			var min = parseFloat(me.node.getAttribute('min'));
			var max = parseFloat(me.node.getAttribute('max'));
			
			if (!window.fdSliderController) {
				showError("slider.js must be included in order for the range element to work in this browser. See documentation for more details.");
			}
			
			if (isNaN(min)) {
				min = 0;
			}
			
			if (isNaN(max)) {
				max = 100;
			}
			
			
			var step = me.node.getAttribute('step');
			
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
			me.node.addEventListener('change', changeOriginalNodeEvent);
		}
		
		me.changeEvent = function (e){
			var oninput = parentForm.getAttribute('oninput');
			
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
			
			
			
			
			
			me.node.addEventListener('click', forceCalToTop);
			me.node.addEventListener('focus', focusEvent)
			me.node.addEventListener('keypress', openCalendar);
			me.node.addEventListener('blur', closeCalendar);
			
			me.node.addEventListener('keypress', keydownEvent)
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
			var el = e.currentTarget;
			html5Forms.fireEvent(el, 'click')
		}
		
		function openCalendar(e) {
			
			var cal = window.calendar;
			
			cal.element.style.zIndex = 100;
			if (cal.open != undefined) {
				cal.open();
			} 
			//html5Forms.fireEvent(this, 'blur');
			//html5Forms.fireEvent(this, 'focus');
		}
		
		function closeCalendar(e){
				
				var cal = window.calendar;
				if (cal) {
					cal.hide();
				}
		} 
		
		function keydownEvent(e) {
			
		 	var c = html5Forms.getKey(e);
			
			switch(c){
				case 13:
					html5Widgets.dummyLink.focus();
					this.focus();
					e.preventDefault();
					openCalendar(e);
					break;
				case 9:
					closeCalendar(e);
					break;
				default:
					e.preventDefault();
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
			
			valueFormula = html5Widgets.getValueFormula(me.node.getAttribute('onforminput'), parentForm);
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
			me.node.classList.add('color');
			me.node.classList.add('{hash:true,caps:false}');
			me.node.type = "text";
		}
		
		
		init();
	}
	
	/*
	 * NumberElement: refactored from http://www.kethinov.com/jsstepper.php.
	 */
	
	function NumberElement (node) {
		var me = this,
			min = parseFloat(node.getAttribute('min')),
			max = parseFloat(node.getAttribute('max')),
			step = parseFloat(node.getAttribute('step'));
		
		me.node = node;
		
		
		
		if (isNaN(step)) {
			// we don't have to create the up and down arraw widgets
			return;
		}
		
		node.addEventListener('keyup', keyUpEvent);
		
		
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
			e.preventDefault();
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
			e.preventDefault();
		}
		function buttonMouseUpEvent(e) {
			clearInterval(this.interval);
			e.preventDefault();
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
		
			upbutton.addEventListener('mousedown', buttonMouseDownEvent);
			dnbutton.addEventListener('mousedown', buttonMouseDownEvent);
			
			upbutton.addEventListener('click', buttonClickEvent);
			upbutton.addEventListener('mouseup', buttonMouseUpEvent);
			dnbutton.addEventListener('click', buttonClickEvent);
			dnbutton.addEventListener('mouseup', buttonMouseUpEvent);
			
			
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
				var nodeStyle = document.defaultView.getComputedStyle(node, null);
			
				node.style.width = (nodeWidth - upbutton.offsetWidth -9) + 'px';
				wrapperNode.style.width = nodeWidth + 'px';
				wrapperNode.style.marginTop = nodeStyle.marginTop;
				wrapperNode.style.height = (node.offsetHeight) + 'px';
			}
			
			
			
		}
		/* Finally: if the form field has a value onload that is not a number, remove it 
		if (!isNumeric(node.value)) {
			node.value = '';
			html5Forms.fireEvent(node, 'change');
		}*/
		init();
	}
	
	function PlaceholderInput (node) {
		var me = this;
		
		me.node = node;
		
		var form, defaultText;
				
		function init () {
			defaultText = node.getAttribute('placeholder');
			form = DOMHelpers.getAncestorByTagName(node, 'form');
			
			me.setPlaceholderText(true);
			me.node.addEventListener('blur', blurEvent);
			me.node.addEventListener('focus', focusEvent);
			
			if (me.node.form) {
				me.node.form.addEventListener('submit', removePlaceholderText);
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
			
			var isAutofocus = me.node.getAttribute('autofocus') != null;
			
			
			if (me.node.value == "" || (isLoadEvent && me.node.value == defaultText)) {
				me.node.classList.add('html5-hasPlaceholderText');
				me.node.value = defaultText;
				
			}
			
			if (isLoadEvent && isAutofocus && me.node.value == defaultText ) {
				me.node.classList.remove('html5-hasPlaceholderText');
				me.node.value = '';
			}
			
			
			
		}
		
		function focusEvent(e) {
			
			me.node.classList.add('html5-hasFocus');
			removePlaceholderText();
		}
		
		function blurEvent(e) {
			//jslog.debug('removed focus on ' + me.node.name)
			me.node.classList.remove('html5-hasFocus');
			me.setPlaceholderText();
		}
		
		function removePlaceholderText() {
			//jslog.debug('removePlaceholderText() for ' + me.node.name)
			if (me.node.classList.contains('html5-hasPlaceholderText')) {
				me.node.value = "";
				me.node.classList.remove('html5-hasPlaceholderText');
			}
		}
		
		function postValidationEvent(e, didValidate) {
			if (!didValidate && !me.node.classList.contains('html5-hasFocus')) {
				me.setPlaceholderText();
			} 
		}
		
		init();
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
		     };
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
		     };
		    var converters = new Array();
		    converters['c'] = function(flags,width,precision,arg)
		      { if(typeof(arg) == 'number') return String.fromCharCode(arg);
		        if(typeof(arg) == 'string') return arg.charAt(0);
		        return '';
		     };
		    converters['d'] = function(flags,width,precision,arg)
		      { return converters['i'](flags,width,precision,arg); 
		     };
		    converters['u'] = function(flags,width,precision,arg)
		      { return converters['i'](flags,width,precision,Math.abs(arg)); 
		     };
		    converters['i'] =  function(flags,width,precision,arg)
		      { var iPrecision=parseInt(precision);
		        var rs = ((Math.abs(arg)).toString().split('.'))[0];
		        if(rs.length<iPrecision) rs=pad(rs,' ',iPrecision - rs.length);
		        return processFlags(flags,width,rs,arg); 
		      };
		    converters['E'] = function(flags,width,precision,arg) 
		      { return (converters['e'](flags,width,precision,arg)).toUpperCase();
		     };
		    converters['e'] =  function(flags,width,precision,arg)
		      { iPrecision = parseInt(precision);
		        if(isNaN(iPrecision)) iPrecision = 6;
		        rs = (Math.abs(arg)).toExponential(iPrecision);
		        if(rs.indexOf('.')<0 && flags.indexOf('#')>=0) rs = rs.replace(/^(.*)(e.*)$/,'$1.$2');
		        return processFlags(flags,width,rs,arg);        
		      };
		    converters['f'] = function(flags,width,precision,arg)
		      { iPrecision = parseInt(precision);
		        if(isNaN(iPrecision)) iPrecision = 6;
		        rs = (Math.abs(arg)).toFixed(iPrecision);
		        if(rs.indexOf('.')<0 && flags.indexOf('#')>=0) rs = rs + '.';
		        return processFlags(flags,width,rs,arg);
		      };
		    converters['G'] = function(flags,width,precision,arg)
		      { return (converters['g'](flags,width,precision,arg)).toUpperCase();
		     };
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
		      };
		    converters['o'] = function(flags,width,precision,arg)
		      { var iPrecision=parseInt(precision);
		        var rs = Math.round(Math.abs(arg)).toString(8);
		        if(rs.length<iPrecision) rs=pad(rs,' ',iPrecision - rs.length);
		        if(flags.indexOf('#')>=0) rs='0'+rs;
		        return processFlags(flags,width,rs,arg); 
		      };
		    converters['X'] = function(flags,width,precision,arg)
		      { return (converters['x'](flags,width,precision,arg)).toUpperCase();
		     };
		    converters['x'] = function(flags,width,precision,arg)
		      { var iPrecision=parseInt(precision);
		        arg = Math.abs(arg);
		        var rs = Math.round(arg).toString(16);
		        if(rs.length<iPrecision) rs=pad(rs,' ',iPrecision - rs.length);
		        if(flags.indexOf('#')>=0) rs='0x'+rs;
		        return processFlags(flags,width,rs,arg); 
		      };
		    converters['s'] = function(flags,width,precision,arg)
		      { var iPrecision=parseInt(precision);
		        var rs = arg;
		        if(rs.length > iPrecision) rs = rs.substring(0,iPrecision);
		        return processFlags(flags,width,rs,0);
		      };
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
		};
	};
};

if (/loaded|complete|interactive/.test(document.readyState)) {
	html5Widgets.init();
} else {
	document.addEventListener("DOMContentLoaded", html5Widgets.init, null);
}
