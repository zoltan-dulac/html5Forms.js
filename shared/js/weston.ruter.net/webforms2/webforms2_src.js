/*
 * Web Forms 2.0 Cross-browser Implementation <http://code.google.com/p/webforms2/>
 * Version: 0.7 (2011-03-01)
 * Copyright: 2007, Weston Ruter <http://weston.ruter.net/> 
 *    with additions by Zoltan Hawryluk <http://www.useragentman.com>
 * Licenses (as of Feb 6, 2011)
 * - MIT License (http://www.opensource.org/licenses/mit-license.php)
 * - GPL (http://creativecommons.org/licenses/GPL/2.0/)
 * 
 * The comments contained in this code are largely quotations from the 
 * WebForms 2.0 specification: <http://whatwg.org/specs/web-forms/current-work/>
 *
 * Usage: <script type="text/javascript" src="webforms2_src.js"></script>
 * 
 * Changelog:
 * version 0.5.4  - initial release by Weston Ruter
 * version 0.6    - refactored for use with HTML5Widgets by Zoltan Hawryluk (July 27th, 2010)
 * version 0.6.1  - updated to deal with WebKit's half-implemented WebForms 2 Implementation (Sept 10, 2010)
 * version 0.7    - abug fixes with nested repetition models by Zoltan Hawryluk.
 * version 0.7.1  - updated to dual MIT/GPL 2.0 license.
 * version 1.0    - Updated to mimic CSS validation pseudo-classes, support for newer browsers
 *                  native support (IE10, Firefox 4, Webkit, Opera 11.11).  This version does rely on 
 *                  the WebForms.js framework.
 */

if(!window.$wf2){
var $wf2 = {};

if(document.implementation && document.implementation.hasFeature && 
  !document.implementation.hasFeature('WebForms', '2.0')){

$wf2 = {
	version : '0.5.4',
	isInitialized : false,
	libpath : '',
	globalEvent: null,
	
	hasElementExtensions : (window.HTMLElement && HTMLElement.prototype),
	hasGettersAndSetters : ($wf2.__defineGetter__ && $wf2.__defineSetter__),
	
	hasBadImplementation: navigator.userAgent.indexOf('WebKit') > 0,
	
	// WebKit less than 534 doesn't show validation UI - we need to check for this (from http://stackoverflow.com/questions/6030522/html5-form-validation-modernizr-safari)
	hasNativeBubbles: navigator.userAgent.indexOf('WebKit') < 0 || parseInt(navigator.userAgent.match(/AppleWebKit\/([^ ]*)/)[1].split('.')[0])  > 534,
	
	callBeforeValidation : new Array(),
	callAfterValidation : new Array(),
	callAfterDOMContentLoaded: new Array(),
	
	
	onDOMContentLoaded : function(){
		
		if($wf2.isInitialized)
			return;
		
		$wf2.isInitialized = true;  //Safari needs this here for some reason
		
		var i,j,k,node;
		
		//set global event for fireEvent method
		if (document.createEventObject){
	        // dispatch for IE
	        $wf2.globalEvent = document.createEventObject();
	    } else 	if (document.createEvent) {
			$wf2.globalEvent = document.createEvent("HTMLEvents");
		} 
		
		//Include stylesheet
		var style = document.createElement('link');
		style.setAttribute('type', 'text/css');
		style.setAttribute('rel', 'stylesheet');
		style.setAttribute('href', $wf2.libpath + 'webforms2.css');
		var parent = document.getElementsByTagName('head')[0];
		if(!parent)
			parent = document.getElementsByTagName('*')[0];
		parent.insertBefore(style, parent.firstChild);

		//The zero point for datetime  controls is 1970-01-01T00:00:00.0Z, for datetime-local is
		//   1970-01-01T00:00:00.0, for date controls is 1970-01-01, for month controls is 1970-01, for week
		//   controls is 1970-W01 (the week starting 1969-12-29 and containing 1970-01-01), and for time controls
		//   is 00:00.
		$wf2.zeroPoint = {};
		$wf2.zeroPoint.datetime          = $wf2.parseISO8601("1970-01-01T00:00:00.0Z");
		$wf2.zeroPoint['datetime-local'] = $wf2.parseISO8601("1970-01-01T00:00:00.0");
		$wf2.zeroPoint.date              = $wf2.zeroPoint.datetime; //parseISO8601("1970-01-01"); //.zeroPointDatetime; //1970-01-01 (UTC)
		$wf2.zeroPoint.month             = $wf2.zeroPoint.datetime; //parseISO8601("1970-01"); //1970-01 (UTC)
		$wf2.zeroPoint.week              = $wf2.parseISO8601("1970-W01"); //(UTC)
		$wf2.zeroPoint.time              = $wf2.zeroPoint.datetime; //parseISO8601("00:00"); //00:00 (UTC)

		//## Fetching data from external resources ##################################
		$wf2.xhr = null;
		if(window.XMLHttpRequest)
			$wf2.xhr = new XMLHttpRequest();
		else if(window.ActiveXObject){
			try {
				$wf2.xhr = new ActiveXObject("Msxml2.XMLHTTP");
			} catch(e){
				try {
					$wf2.xhr = new ActiveXObject("Microsoft.XMLHTTP");
				} catch(e){}
			}
		}
		if($wf2.xhr){
			$wf2.prefillSelectElements();
			$wf2.prefillFormElements();
		}

		//Initialize Repetition Behaviors ****************************************
		//Before load events are fired, but after the entire document has been parsed and after forms with data 
		//   attributes are prefilled (if necessary), UAs must iterate through every node in the document, depth 
		//   first, looking for templates so that their initial repetition blocks can be created. ... UAs should not 
		//   specifically wait for images and style sheets to be loaded before creating initial repetition blocks 
		//   as described above.
		if (window.$wf2Rep) {
			$wf2.initRepetitionBlocks();
			$wf2.initRepetitionTemplates();
			$wf2.initRepetitionButtons('add');
			$wf2.initRepetitionButtons('remove');
			$wf2.initRepetitionButtons('move-up');
			$wf2.initRepetitionButtons('move-down');
			$wf2.updateAddButtons();
			$wf2.updateMoveButtons();
		}
		// Initialize Non-Repetition Behaviors ****************************************
		if(document.addEventListener){
			document.addEventListener('mousedown', $wf2.clearInvalidIndicators, false);
			document.addEventListener('keydown', $wf2.clearInvalidIndicators, false);
		}
		else if(document.attachEvent){
			document.attachEvent('onmousedown', $wf2.clearInvalidIndicators);
			document.attachEvent('onkeydown', $wf2.clearInvalidIndicators);
		}
		
		$wf2.initNonRepetitionFunctionality();
		
		for (var i=0; i<$wf2.callAfterDOMContentLoaded.length; i++) {
			$wf2.callAfterDOMContentLoaded[i]();
		}
		
		
	},

	
	



	/*##############################################################################################
	 # Section: Fetching data from external resources
	 ##############################################################################################*/

	prefillSelectElements : function(){
		//If a select element or a datalist element being parsed has a data attribute, then as soon
		//   as the element and all its children have been parsed and added to the document, the
		//   prefilling process described here should start.
		var select, selects = $wf2.getElementsByTagNames.apply(document.documentElement, ['select', 'datalist']); //$wf2.getElementsByTagNamesAndAttribute.apply(document.documentElement, [['select', 'datalist']]); //, 'data'
		for(var i = 0; select = selects[i]; i++){
			//If a select element or a datalist element has a data  attribute, it must be a URI or
			//   IRI that points to a well-formed XML file whose root element is a select element
			//   in the http://www.w3.org/1999/xhtml namespace. The MIME type must be an XML MIME
			//   type [RFC3023], preferably application/xml. It should not be application/xhtml+xml
			//   since the root element is not html.
			//UAs must process this file if it has an XML MIME type [RFC3023], if it is a well-formed
			//   XML file, and if the root element is the right root element in the right namespace.
			//   If any of these conditions are not met, UAs must act as if the attribute was not
			//   specified, although they may report the error to the user. UAs are expected to
			//   correctly handle namespaces, so the file may use prefixes, etc.
			var xmlDoc = $wf2.loadDataURI(select);
			if(///\bxml\b/.test(xhr.getResponseHeader('Content-Type') && 
			   xmlDoc &&
			   xmlDoc.documentElement &&
			   /:?\bselect$/i.test(xmlDoc.documentElement.nodeName) &&
			   xmlDoc.documentElement.namespaceURI == 'http://www.w3.org/1999/xhtml'
			   )
			{
				var root = xmlDoc.documentElement;
				//1. Unless the root element of the file has a type attribute with the exact literal
				//   string incremental, the children of the select or datalist  element in the original
				//   document must all be removed from the document.
				if(root.getAttribute('type') != 'incremental'){
					while(select.lastChild)
						select.removeChild(select.lastChild);
				}
				
				//2. The entire contents of the select element in the referenced document are imported
				//   into the original document and appended as children of the select or datalist
				//   element. (Even if importing into a text/html document, the newly imported nodes
				//   will still be namespaced.)
				//3. All nodes outside the select (such as style sheet processing instructions, whitespace
				//   text nodes, and DOCTYPEs) are ignored, as are attributes (other than type) on the
				//   select element.
				node = root.firstChild;
				while(node){
					//select.appendChild(node.cloneNode(true)); //MSIE BUG: Throws "No such interface supported" exception
					select.appendChild($wf2.cloneNode(node));
					node = node.nextSibling;
				}
			}
		}
	},

	prefillFormElements : function(){
		//-- Seeding a form with initial values -------------------------------
		//Before load events are fired, but after the entire document has been parsed and after select
		//   elements have been filled from external data sources (if necessary), forms with data attributes
		//   are prefilled.
		var frm, frms = document.getElementsByTagName('form'); //$wf2.getElementsByTagNamesAndAttribute.apply(document.documentElement, [['form'], 'data']);
		for(var i = 0; frm = frms[i]; i++){
			//If a form has a data attribute, it must be a URI or IRI that points to a well-formed XML file
			//   whose root element is a formdata element in the http://n.whatwg.org/formdata namespace. The
			//   MIME type must be an XML MIME type [RFC3023], preferably application/xml.
			//UAs must process this file if these conditions are met. If any of these conditions are not met,
			//   UAs must act as if the attribute was not specified, although they may report the error to
			//   the user. UAs are expected to correctly handle namespaces, so the file may use prefixes, etc.
			var xmlDoc = $wf2.loadDataURI(frm);
			if(///\bxml\b/.test(xhr.getResponseHeader('Content-Type') && 
			   xmlDoc &&
			   xmlDoc.documentElement &&
			   /:?\bformdata$/.test(xmlDoc.documentElement.nodeName) &&
			   xmlDoc.documentElement.namespaceURI == 'http://n.whatwg.org/formdata'
			   )
			{
				var rt;
				var root = xmlDoc.documentElement;
				//1. Unless the root element has a type attribute with the exact literal string incremental,
				//   the form must be reset to its initial values as specified in the markup.
				if(root.getAttribute('type') != 'incremental')
					frm.reset();

				//The algorithm must be processed in the order given above, meaning any clear  elements are
				//   handled before any repeat  elements which are handled before the field elements, regardless
				//   of the order in which the elements are given. (Note that this implies that this process
				//   cannot be performed incrementally.)
				
				//clear elements in the http://n.whatwg.org/formdata namespace that are children of
				//   the root element, have a non-empty template attribute, have no other non-namespaced
				//   attributes (ignoring xmlns attributes), and have no content, must be processed...:
				//The template attribute should contain the ID of an element in the document. If the
				//   template attribute specifies an element that is not a repetition template, then
				//   the clear element is ignored.
				var clr, clrs = root.getElementsByTagName('clear'); //getElementsByTagNameNS('http://n.whatwg.org/formdata', 'clr')
				for(j = 0; clr = clrs[j]; j++){
					if(clr.namespaceURI == 'http://n.whatwg.org/formdata' &&
					   clr.parentNode == root &&
					   !clr.firstChild &&
					   (rt = document.getElementById(clr.getAttribute('template'))) &&
					   rt.getAttribute('repeat') == 'template'
					   /*Examining of non-namespaced attributes skipped*/
					   )
					{
						//The user must make a note of the list of repetition blocks associated with that
						//   template that are siblings of the template, and must then go through this list,
						//   removing each repetition block in turn.
						//Note that we cannot use rt.repetitionBlocks since the repetition behavior has
						//   not yet been initialized.
						var attr,node,next;
						node = rt.parentNode.firstChild;
						while(node){
							if(node.nodeType == 1 && (attr = node.getAttributeNode('repeat')) && attr.value != 'template'){
								next = node.nextSibling;
								node.parentNode.removeChild(node);
								node = next;
							}
							else node = node.nextSibling;
						}
					}
				}
				
				//repeat elements in the http://n.whatwg.org/formdata namespace that are children of
				//   the root element, have a non-empty template attribute and an index  attribute that
				//   contains only one or more digits in the range 0-9 with an optional leading minus
				//   sign (U+002D, "-"), have no other non-namespaced attributes (ignoring xmlns
				//   attributes), and have no content, must be processed as follows:
				//The template attribute should contain the ID of an element in the document. If the
				//   template attribute specifies an element that is not a repetition template, then
				//   the repeat element is ignored.
				var index, rpt, rpts = root.getElementsByTagName('repeat');
				for(j = 0; rpt = rpts[j]; j++){
					if(rpt.namespaceURI == 'http://n.whatwg.org/formdata' &&
					   rpt.parentNode == root &&
					   !rpt.firstChild &&
					   (rt = document.getElementById(rpt.getAttribute('template'))) &&
					   rt.getAttribute('repeat') == 'template' &&
					   /^-?\d+$/.test(index = rpt.getAttribute('index'))
					   /*Examining of non-namespaced attributes skipped*/
					   )
					{
						//If the template attribute specifies a repetition template and that template
						//   already has a repetition block with the index specified by the index attribute,
						//   then the element is ignored.
						//for(j = 0; j < rt.repetitionBlocks.length; j++){
						//	if(rt.repetitionBlocks[j].repetititionIndex == index){
						//		hasIndex = true;
						//		break;
						//	}
						//}
						var hasIndex,attr,node,next;
						node = rt.parentNode.firstChild;
						while(node){
							if(node.nodeType == 1 && (attr = node.getAttributeNode('repeat')) && attr.value == index){
								hasIndex = true;
								break;
							}
							node = node.nextSibling;
						}
						
						if(!hasIndex){
							//Otherwise, the specified template's addRepetitionBlockByIndex()  method is
							//   called, with a null first argument and the index specified by the repeat
							//   element's index attribute as the second.
							$wf2.addRepetitionBlockByIndex.apply(rt, [null, index]);
						}
					}
				}
				
				//field elements in the http://n.whatwg.org/formdata namespace that are children of
				//   the root element, have a non-empty name  attribute, either an index attribute
				//   that contains only one or more digits in the range 0-9 or no index attribute at
				//   all, have no other non-namespaced attributes (ignoring xmlns  attributes), and
				//   have either nothing or only text and CDATA nodes as children, must be used to
				//   initialize controls...
				var fld, flds = root.getElementsByTagName('field');
				var formElements = $wf2.getFormElements.apply(frm);
				for(j = 0; fld = flds[j]; j++){
					var indexAttr = fld.getAttributeNode('index');
					var name = fld.getAttribute('name');
					if(!name || (indexAttr && !/^\d+$/.test(indexAttr.value)))
					   /*Examining of non-namespaced attributes skipped*/
					   /*Verification of the presence of text and CDATA nodes below*/
						continue;
					//First, the form control that the field references must be identified. 
					var value = '';
					for(k = 0; node = fld.childNodes[k]; k++){
						if(node.nodeType == 3 /*text*/ || node.nodeType == 4 /*CDATA*/)
							value += node.data;
						else break; //only text and CDATA nodes allowed
					}
					var ctrl, count = 0;
					for(k = 0; ctrl = formElements[k]; k++){
						//console.info(ctrl.name + ' == ' + name)
						if(ctrl.type == 'image'){
							//For image controls, instead of using the name given by the name attribute,
							//   the field's name is checked against two names, the first being the value
							//   of the name attribute with the string .x appended to it, and the second
							//   being the same but with .y appended instead. If an image control's name
							//   is the empty string (e.g. if its name attribute is omitted) then the
							//   names x and y must be used instead. Thus image controls are handled as
							//   if they were two controls.
							if(ctrl.name ?
								  (ctrl.name + '.x' == name || ctrl.name + '.y' == name)
								: (name == 'x' || name == 'y') ){

								if(!indexAttr || ++count-1 >= indexAttr.value)	
									break;
							}
						}
						//This is done by walking the list of form controls associated with the form until
						//   one is found that has a name exactly equal to the name given in the field
						//   element's name attribute, skipping as many such matches as is specified in
						//   the index attribute, or, if the index attribute was omitted, skipping over
						//   any type="radio" and type="checkbox" controls that have the exact name given
						//   but have a value that is not exactly the same as the contents of the field element.
						// SPECIFICATION DEFICIENCY: Note that this is not completely true. If the value of
						//   a field element is empty, then it should not be skipped if it associated with
						//   a radio button or checkbox. For example, the specification states four paragraphs
						//   later, "The only values that would have an effect in this example are "", which
						//   would uncheck the checkbox, and "green", which would check the checkbox."
						else if(ctrl.name == name){
							if(indexAttr){
								if(++count-1 < indexAttr.value)	
									continue;
							}
							else if((ctrl.type == 'radio' || ctrl.type == 'checkbox') &&
									 (value && ctrl.value != value))
								continue;
							break;
						}
					}
					
					//If the identified form control is a file upload control, a push button control, or
					//   an image control, then the field element is now skipped.
					if(ctrl.type == 'file' || ctrl.type == 'button' || ctrl.type == 'image')
						continue;

					//Next, if the identified form control is not a multiple-valued control (a multiple-
					//   valued control is one that can generate more than one value on submission, such
					//   as a <select multiple="multiple">), or if it is a multiple-valued control but it
					//   is the first time the control has been identified by a field element in this
					//   data file that was not ignored, then it is set to the given value (the contents
					//   of the field  element), removing any previous values (even if these values were
					//   the result of processing previous field elements in the same data file).
					if(!ctrl.getAttributeNode('multiple') || !ctrl.wf2Prefilled){
						//If the element cannot be given the value specified, the field element is
						//   ignored and the control's value is left unchanged. For example, if a
						//   checkbox has its value attribute set to green and the field element
						//   specifies that its value should be set to blue, it won't be changed from
						//   its current value. (The only values that would have an effect in this
						//   example are "", which would uncheck the checkbox, and "green", which would
						//   check the checkbox.)
						if(ctrl.type == 'checkbox' || ctrl.type == 'radio'){
							if(!value)
								ctrl.checked = false;
							else if(ctrl.value == value)
								ctrl.checked = true;
							else break;
						}
						else if(ctrl.nodeName.toLowerCase() == 'select'){
							ctrl.selectedIndex = -1;
							for(var opt,k = 0; opt = ctrl.options[k]; k++){
								if(opt.value ? opt.value == value : opt.text == value){
									opt.selected = true;
									break;
								}
							}
						}
						//Another example would be a datetime control where the specified value is
						//   outside the range allowed by the min  and max attributes. The format
						//   must match the allowed formats for that type for the value to be set.
						else {
							ctrl.value = value;
							$wf2.updateValidityState(ctrl);
							if(!ctrl.validity.valid){
								ctrl.value = ctrl.defaultValue;
								$wf2.updateValidityState(ctrl);
							}
						}
						ctrl.wf2Prefilled = true; //TRACE
					}
					//Otherwise, this is a subsequent value for a multiple-valued control, and the
					//   given value (the contents of the field element) should be added to the list of
					//   values that the element has selected.
					//If the element is a multiple-valued control and the control already has the given
					//   value selected, but it can be given the value again, then that occurs. 
					else if(ctrl.getAttributeNode('multiple')){
						for(var opt,k = 0; opt = ctrl.options[k]; k++){
							if(!opt.selected && (opt.value ? opt.value == value : opt.text == value)){
								opt.selected = true;
								break;
							}
						}
					}
					
					//if(ctrl){
					//	
					//}
				}
				
				//A formchange event is then fired on all the form controls of the form.
				var formElements = $wf2.getFormElements.apply(frm);
				for(j = 0; j < formElements.length; j++){
					//onformchange();
					//fireEvent()
				}
			}
		}
	},



	/*#############################################################################################
	 # Section: Extensions to the input element
	 ##############################################################################################*/
	
	initNonRepetitionFunctionality : function(parent){
		parent = (parent || document.documentElement);
		var i,j, frm, frms = parent.getElementsByTagName('form');
		for(i = 0; frm = frms[i]; i++){
			
			// use the native validation if the browser has it, unless 
			// the form has a data-webforms2-force-js-validation attribute
			// set to "true". 
			if(frm.checkValidity && !$wf2.hasBadImplementation && $wf2.getAttributeValue(frm, 'data-webforms2-force-js-validation') != 'true') {
				continue;
			}
			frm.checkValidity = $wf2.formCheckValidity;
			
			if(frm.addEventListener)
				frm.addEventListener('submit', $wf2.onsubmitValidityHandler, false);
			else
				frm.attachEvent('onsubmit', $wf2.onsubmitValidityHandler);
		}
		
		var ctrl, ctrls = $wf2.getElementsByTagNames.apply(parent, ['input','select','textarea', 'button']);//parent.getElementsByTagName([i]);
		for(i = 0; ctrl = ctrls[i]; i++){
			$wf2.applyValidityInterface(ctrl);
			$wf2.updateValidityState(ctrl); //ctrl._updateValidityState();
			
			// add CSS focus-like support for IE7 and under
			/*@cc_on
			  
			 	ctrl.attachEvent('onfocus', function (e) {
			 		
			 		$wf2.css.addClass(e.srcElement, 'wf2_focus');
			 		
			 	});
			 	
			 	ctrl.attachEvent('onblur', function (e) { 
			 		
			 		$wf2.css.removeClass(e.srcElement, 'wf2_focus')
			 	});
			 
			  
			 @*/
		}
		
		//Autofocus **********************************************************
		//Authors must not set the autofocus attribute on multiple enabled elements in a document.
		//  If multiple elements with the autofocus attribute set are inserted into a document, each one
		//  will be processed as described above, as they are inserted. This means that during document
		//  load, for example, the last focusable form control in document order with the attribute set
		//  will end up with the focus.
		var els = $wf2.getElementsByTagNamesAndAttribute.apply(document.documentElement, [['*'], 'autofocus']); //ISSUE: Any form control (except hidden and output controls) can have an autofocus attribute specified. //var elName = els[i].nodeName.toLowerCase(); if(elName == 'output' || (elName == 'input' && els[i].type == 'hidden'))
		if(parent.getAttribute('autofocus'))
			els.unshift(parent);
		for(i = 0; i < els.length; i++)
			$wf2.initAutofocusElement(els[i]);

		// Maxlength for textareas ******************************************************
		var textareas = $wf2.getElementsByTagNamesAndAttribute.apply(parent, [['textarea'], 'maxlength']);
		if(parent.nodeName.toLowerCase() == 'textarea')
			textareas.unshift(parent);
		for(i = 0; i < textareas.length; i++)
			textareas[i].maxLength = parseInt(textareas[i].getAttribute('maxlength'));
		//TODO: we must dynamically apply this behavior for new textareas (via repetition model or eventlistener)
	},
	
	initAutofocusElement : function(el){
		//skip if already initialized
		if(el.autofocus === false || el.autofocus === true) //(el.autofocus !== undefined) does not work due to MSIE's handling of attributes
			return;
		el.autofocus = true;
		
		//[autofocus if] the control is not disabled
		if(el.disabled)
			return;

		//[control] is of a type normally focusable in the user's operating environment
		//Don't focus on the control if it is not visible or nor displayed
		var node = el;
		while(node && node.nodeType == 1){
			if($wf2.getElementStyle(node, 'visibility') == 'hidden' || $wf2.getElementStyle(node, 'display') == 'none')
				return;
			node = node.parentNode;
		}

		//Then the UA should focus the control, as if the control's focus() method was invoked.
		//  UAs with a viewport should also scroll the document enough to make the control visible,
		//  [[even if it is not of a type normally focusable.]] //WHAT DOES THIS MEAN?
		el.focus(); //BUG: in Gecko this does not work within DOMNodeInserted event handler, but the following does; setTimeout(function(){el.focus();}, 0);
		
		
	},

	/*#############################################################################################
	 # Section: Form Validation model
	 ##############################################################################################*/

	formCheckValidity : function(){
		var i, el, valid = true;
		
		//When a form is submitted, user agents must act as if they used the following algorithm.
		//   First, each element in that form's elements list is added to a temporary list (note that
		//   the elements list is defined to be in document order).
		
		//An invalid event must be fired on each element that, when checked, is found to fail to
		//   comply with its constraints (i.e. each element whose validity.valid DOM attribute is
		//   false) and is still a member of the form after the event has been handled.
		//var _elements = [];
		var formElements = $wf2.getFormElements.apply(this);
		//for(i = 0; i < formElements.length; i++)
		//	_elements.push(formElements[i]);
		for(i = 0; el = formElements[i]; i++){ 
			var type = (el.getAttribute('type') ? el.getAttribute('type').toLowerCase() : el.type);
			
			try {
				el.willValidate = !(/(hidden|button|reset|add|remove|move-up|move-down)/.test(type) || !el.name || el.disabled)
			} catch (ex) {
				// do nothing.
			}
			//Then, each element in this list whose willValidate DOM attribute is true is checked for validity
			if(el.checkValidity && el.willValidate){
				if(!el.checkValidity() && el.checkValidity() != undefined) {
					valid = false;
					
					/* var oninvalid = el.getAttribute('oninvalid');
					if (oninvalid) {
						oninvalid();
					} */
					
					
					/* we change this to only show the first error.
					if (!$wf2.showAllErrors) {
						break;
					}
					*/
				}
			}
		}
		
		if (!valid) {
			$wf2.hiliteFirstError();
		}
		return valid;
	},
	
	hiliteFirstError: function () {
		
		if($wf2.invalidIndicators.length){ //second condition needed because modal in oninvalid handler may cause indicators to disappear before this is reached
			//$wf2.invalidIndicators[0].errorMsg.className += " wf2_firstErrorMsg";
			$wf2.css.addClass($wf2.invalidIndicators[0].errorMsg, "wf2_firstErrorMsg");
			//scroll to near the location where invalid control is
			el = $wf2.invalidIndicators[0].target;
			
			var doScroll = (el.form.getAttribute('data-wf2-no-scroll-on-error') != 'true')
			
			if(el.style.display == 'none' || !el.offsetParent){
				while(el && (el.nodeType != 1 || (el.style.display == 'none' || !el.offsetParent)))
					el = el.previousSibling;
				var cur = el;
				var top = 0;
				if(cur && cur.offsetParent) {
					top = cur.offsetTop;
					while (cur = cur.offsetParent)
						top += cur.offsetTop;
				}
				if (doScroll) {
					scrollTo(0, top);
				}
			}
			//focus on the first invalid control and make sure error message is visible
			else {
				
				setTimeout(
					function() {
						el.focus();
						$wf2.fireEvent(el, 'focus');
					}
				, 10)
				
				
				var elPos = $wf2.css.getAbsoluteCoords(el);
				var maxBottom = $wf2.css.getScrollY() + $wf2.css.getWindowHeight();
				var errorMsgHeight = $wf2.invalidIndicators[0].errorMsg.offsetHeight;
				
				//console.log(elPos.y + errorMsgHeight, maxBottom)
				//NOTE: We should only do this if the control's style.bottom == 0
				if (doScroll && elPos.y + errorMsgHeight > maxBottom) {
					
					scrollBy(0, errorMsgHeight );
				}
			}
		}
		
	},
	
	controlCheckValidity : function(){
		return $wf2.controlCheckValidityOfElement(this);
		
	},
	
	controlCheckValidityOfElement: function (el) {
		
	
		
		$wf2.updateValidityState(el);
		
		if (el.validity.valid) {
			
			return true;
		}
		
		var canceled = false;
		
		var evt;
		try {
			if(document.createEvent)
				evt = document.createEvent('Events'); //document.createEvent("RepetitionEvent")
			else if(document.createEventObject)
				evt = document.createEventObject();
			evt.initEvent('invalid', true /*canBubble*/, true /*cancelable*/);
			evt.srcElement = el;
			if(el.dispatchEvent)
				canceled = !el.dispatchEvent(evt);
			else if(el.fireEvent){
				//console.warn("fireEvent('oninvalid') for MSIE is not yet working");
				//el.fireEvent('oninvalid', invalidEvt);
			}
		}
		catch(err){
			evt = new Object();
			if(evt.initEvent)
				evt.initEvent('invalid', true /*canBubble*/, true /*cancelable*/);
			else {
				evt.type = 'invalid';
				evt.cancelBubble = false;
			}
			evt.target = evt.srcElement = el;
		}
		
		var oninvalidAttr = el.getAttribute('oninvalid');
		if(oninvalidAttr && (!el.oninvalid || typeof el.oninvalid != 'function')) //in MSIE, attribute == property
			el.oninvalid = new Function('event', oninvalidAttr);

		try {
			//Dispatch events for the old event model
			if(el.oninvalid){
				//canceled = el.oninvalid(evt) === false || canceled; 
				canceled = el.oninvalid.apply(el, [evt]) === false || canceled; //for some reason, exceptions cannot be caught if using the method above in MSIE
			}
		}
		catch(err){
			var myErr = err;
			//throw exception within setTimeout so that the current execution will not be aborted
			setTimeout(function(){
				throw myErr;
			}, 0);
		}

		//Determine if this radio/checkbox already has an invalid indicator
		var hasInvalidIndicator = false;
		if(el.type == 'radio' || el.type == 'checkbox'){
			for(var i = 0; i < $wf2.invalidIndicators.length; i++){
				if(el.form[el.name][0] == $wf2.invalidIndicators[i].target){
					hasInvalidIndicator = true;
					break;
				}
			}
		}

		//Do default action
		if(!canceled && !hasInvalidIndicator) //(!(el.form && el.form[el.name]) || !el.form[el.name].wf2HasInvalidIndicator)
			$wf2.addInvalidIndicator(el);
		return false;
	},

	//Frequently used regular expressions //W(?:0[1-9]|[1-4]\d|5[0-2])|
	//monthRegExp : /^\d\d\d\d-(0\d|1[0-2])$/,
	//weekRegExp : /^(\d\d\d\d)-W(0[1-9]|[1-4]\d|5[0-2])$/,
	//timeRegExp : /^(0\d|1\d|2[0-4]):([0-5]\d)(:[0-5]\d(.\d+)?)?$/,
	numberRegExp : /^-?\d+(.\d+)?(e-?\d+)?$/,
	//numberOrAnyRegExp : /^(any|-?\d+(.\d+)?(e-?\d+)?)$/i,
	urlRegExp : /^(\w+):(\/\/)?.+$/i,
	emailRegExp : /^\S+@\S+$/i,
	
	//Zero points for datetime-related types (set in onDOMContentLoaded function)
//	zeroPointDatetime      : null,
//	zeroPointDatetimeLocal : null,
//	zeroPointDate          : null,
//	zeroPointMonth         : null,
//	zeroPointWeek          : null,
//	zeroPointTime          : null,
	
	copyOf: function(obj) {
		if (obj !== null && obj !== undefined) {
			var r = new Object();
			for (i in obj) {
				
				try {
					r[i] = obj[i];
				} 
				catch (ex) {
				// do nothing;
				}
			}
			
		} else {
			r = null;
		}
		
		return r;
	},
	
	getOriginalAttrNode: function (node, attrName) {
		var r;
		
		/* var dataSetItemName = attrName + 'AttrNode';
		
		if ($wf2.getDatasetItem(node, dataSetItemName) == null) {
			r = $wf2.copyOf(node.getAttributeNode(attrName));
			$wf2.setDatasetItem(node, dataSetItemName, r.value);
		} else {
			r = $wf2.getDatasetItem(node, dataSetItemName);
			if (r == 'null') {
				r = null;
			}
		} */
		
		r = $wf2.copyOf(node.getAttributeNode(attrName));
		
		return r;
	},
	
	//This function is called "live" 
	updateValidityState : function(node){
		
		var customErrorMessage = $wf2.getAttributeValue(node, 'data-errormessage');
		var isCustomErrorMessageSet = (customErrorMessage == node.validationMessage);
		
		if (isCustomErrorMessageSet) {
			node.validationMessage = '';
		}
		
		
		//if(node.form && node.form[node.name] && node.form[node.name].wf2HasInvalidIndicator)
		//	return;
		var type = (node.getAttribute('type') ? node.getAttribute('type').toLowerCase() : node.type);
		// for range, we need to make sure this doesn't run
		if (type == 'range' && node.type == 'range') {
			return;
		}
		
		
		var minAttrNode, maxAttrNode, valueAttrNode;
		
		minAttrNode = $wf2.getOriginalAttrNode(node, 'min');
		maxAttrNode = $wf2.getOriginalAttrNode(node, 'max');
		stepAttrNode = $wf2.getOriginalAttrNode(node, 'step');
		valueAttrNode = $wf2.getOriginalAttrNode(node, 'value');
		
		
		node.min = undefined; //wf2Min
		node.max = undefined; //wf2Max
		node.step = undefined; //wf2Step
		
		// only do this if node.validity is set, or Opera will complain.
		if (!node.validity) {
			node.validity = $wf2.createValidityState();
		}
		
		node.validity.customError = !!node.validationMessage;
		
		//var type = node.type ? node.type.toLowerCase() : 'text';
		//var type = (node.type ? node.getAttribute('type').toLowerCase() :
		//                       (node.nodeName.toLowerCase() == 'input' ? 'text' : ''));
		
		var isTimeRelated = (type == 'datetime' || type == 'datetime-local' || type == 'time'); //datetime, datetime-local, time
		var isDateRelated = (type == 'date' || type == 'month' || type == 'week'); //date, month, week
		var isNumberRelated = (type == 'number' || type == 'range'); //number, range
		var isFileInput = (type == 'file');
		var doCheckPrecision = (isTimeRelated || isDateRelated || isNumberRelated); //datetime, datetime-local, time, date, month, week, number, range
		var doMaxLengthCheck = doCheckPrecision || node.nodeName.toLowerCase() == 'textarea'; //datetime, datetime-local, time, date, month, week, number, range, textarea
		var doCheckRange = (doCheckPrecision || isFileInput); //datetime, datetime-local, time, date, month, week, number, range, file
		var isRadioOrCheckbox = (type == 'radio' || type == 'checkbox');
		var isSelect = (node.nodeName == 'SELECT');
		var doRequiredCheck = (doMaxLengthCheck  || //datetime, datetime-local, time, date, month, week, number, range, textarea
							   isFileInput       ||
							   isSelect ||
							   type == 'email'   ||
							   type == 'url'     ||
							   type == 'text'    ||
							   type == 'password'||
							   type == 'tel' ||
							   isRadioOrCheckbox);
		
		//If a control has its type attribute changed to another type, then the user agent must reinterpret the min and
		//   max  attributes. If an attribute has an invalid value according to the new type, then the appropriate
		//   default must be used (and not, e.g., the default appropriate for the previous type). Control values that
		//   no longer match the range allowed for the control must be handled as described in the error handling section.
		//if(!node.wf2PreviousType)
		//	node.wf2PreviousType == type;
		//else if(type != node.wf2PreviousType){
		//	throw Error("Currently unable to change the type of a control."); //TODO
		//}
		
		if(type == 'range'){
			//For this type...min defaults to 0...and value defaults to the min value.
			
			node.min = (minAttrNode && $wf2.numberRegExp.test(minAttrNode.value)) ? Number(minAttrNode.value) : 0;
			node.max = (maxAttrNode && $wf2.numberRegExp.test(maxAttrNode.value)) ? Number(maxAttrNode.value) : 0;
			if((!valueAttrNode || !valueAttrNode.specified) && node.value === '' && !node.wf2ValueProvided){ //(!valueAttrNode || !valueAttrNode.specified) && 
				node.setAttribute('value', node.min);
				node.value = node.min;
				node.wf2ValueProvided = true;
			}
			
			return;
		}
		
		if ($wf2.css.isMemberOfClass(node, 'html5-hasPlaceholderText')) {
			node.wf2Value = '';
		} else {
			node.wf2Value = node.value;
		}
		//console.log("changing:", node.value, ", " , node.wf2Value)

		//valueMissing -- The control has the required attribute set but it has not been satisfied.
		//The required attribute applies to all form controls except controls with the type hidden,
		//   image inputs, buttons (submit, move-up, etc), and select and output elements. For
		//   disabled or readonly controls, the attribute has no effect.
		var type = (node.getAttribute('type') ? node.getAttribute('type').toLowerCase() : node.type);
		
		// do this only when node.willValidate doesn't exist or Opera will complain
		try {
			node.willValidate = !(/(hidden|button|reset|add|remove|move-up|move-down)/.test(type) || !node.name || node.disabled);
		} catch (ex) {
			// do nothing.
		}
		if(doRequiredCheck && node.willValidate){
			//For checkboxes, the required  attribute shall only be satisfied when one or more of
			//  the checkboxes with that name in that form are checked.
			//For radio buttons, the required attribute shall only be satisfied when exactly one of
			//  the radio buttons in that radio group is checked. 
			if(isRadioOrCheckbox){
				if(node.form && node.form[node.name]){
					var isRequired = false;
					var hasChecked = false;
					
					var inputs =  node.form[node.name];
					
					/* 
					 * remember: the above expression may return an array
					 * or a single value.  Must check for this.
					 */
					if (inputs.length == undefined) {
						if (inputs.getAttributeNode('required')) 
							isRequired = true;
						if (inputs.checked) 
							hasChecked = true;
					} else {
						for (var i = 0; i < inputs.length; i++) {
							if (inputs[i].getAttributeNode('required')) 
								isRequired = true;
							if (inputs[i].checked) 
								hasChecked = true;
						}
					}
					node.validity.valueMissing = (isRequired && !hasChecked);
				}
			}
			//The required attribute applies to all form controls except controls with the type hidden,
			//   image inputs, buttons (submit, move-up, etc), and select and output elements. For
			//   disabled or readonly controls, the attribute has no effect.
			else if(node.getAttributeNode('required')){
				//if(node.options)
				//	node.validity.valueMissing = (node.selectedIndex == -1);
				//For other controls, any non-empty value shall satisfy the required condition,
				//   including a simple whitespace character.
				//else
					node.validity.valueMissing = (node.wf2Value == '');
			}
			//if(node.options ? node.selectedIndex == -1 : node.value === '')
			//	node.validity.valueMissing = true;
			//
		}
		if(!node.validity.valueMissing && node.wf2Value){
			//patternMismatch -- The value of the control with a pattern attribute doesn't match the pattern. 
			//   If the control is empty, this flag must not be set.
			//If the pattern attribute is present but empty, it doesn't match any value, and thus the
			//   patternMismatch flag shall be set whenever the control's value isn't empty.
			var patternAttr = node.getAttributeNode('pattern');
			if(patternAttr){
				//the pattern attribute must match the entire value, not just any subset (somewhat as if
				//   it implied a ^(?: at the start of the pattern and a )$ at the end).
				var rePattern = new RegExp("^(?:" + patternAttr.value + ")$");
				//The pattern must be compiled with the global, ignoreCase, and multiline flags disabled
				rePattern.global = false;
				rePattern.ignoreCase = false;
				rePattern.multiline = false;
				//When the pattern is not a valid regular expression, it is ignored for the purposes of
				//   validation, as if it wasn't specified.
				if(rePattern)
					node.validity.patternMismatch = !rePattern.test(node.wf2Value);
			}
			
			//typeMismatch -- The data entered does not match the type of the control. For example, if the UA 
			//   allows uninterpreted arbitrary text entry for month controls, and the user has entered SEP02, 
			//   then this flag would be set. This code is also used when the selected file in a file upload 
			//   control does not have an appropriate MIME type. If the control is empty, this flag must not be set.
			if(isDateRelated || isTimeRelated) {
				//node.validity.typeMismatch = ((node.value = $wf2.parseISO8601(node.wf2Value, type)) == null);
				//node.wf2Value = node.value;
			} else {
				switch(type){
					case 'number':
					case 'range':
						node.validity.typeMismatch = !$wf2.numberRegExp.test(node.wf2Value);
	//						if(!node.validity.typeMismatch && node.getAttribute("step") != 'any'){
	//							if(node.step == undefined)
	//								node.step = 1;
	//							var val = Number(node.value);
	//							node.validity.stepMismatch = (val == parseInt(val) && node.step != parseInt(node.step));
	//						}
						break;
					case 'email':
						//An e-mail address, following the format of the addr-spec  token defined in RFC 2822 section
						//   3.4.1 [RFC2822], but excluding the CFWS  subtoken everywhere, and excluding the FWS
						//   subtoken everywhere except in the quoted-string subtoken. UAs could, for example, offer
						//   e-mail addresses from the user's address book. (See below for notes on IDN.)
						//http://www.ietf.org/rfc/rfc2822						
						node.validity.typeMismatch = !$wf2.emailRegExp.test(node.wf2Value);
						break;
					case 'url':
						//An IRI, as defined by [RFC3987] (the IRI token, defined in RFC 3987 section 2.2). UAs could,
						//   for example, offer the user URIs from his bookmarks. (See below for notes on IDN.) The value
						//   is called url (as opposed to iri or uri) for consistency with CSS syntax and because it is
						//   generally felt authors are more familiar with the term "URL" than the other, more technically
						//   correct terms.
						//http://www.ietf.org/rfc/rfc3987
						node.validity.typeMismatch = !$wf2.urlRegExp.test(node.wf2Value);
						break;
				}
			}
			
			if(!node.validity.patternMismatch && !node.validity.typeMismatch){
				//To limit the range of values allowed by some of the above types, two new attributes are introduced, which
				//   apply to the date-related, time-related, numeric, and file upload types: min and max
				
				//rangeUnderflow -- The numeric, date, or time value of a control with a min attribute is lower than 
				//   the minimum, or a file upload control has fewer files selected than the minimum. If the control 
				//   is empty or if the typeMismatch flag is set, this flag must not be set. 
				//rangeOverflow -- The numeric, date, or time value of a control with a max attribute is higher than 
				//   the maximum, or a file upload control has more files selected than the maximum. If the control 
				//   is empty or if the typeMismatch flag is set, this flag must not be set. 
				if(doCheckRange){
					if(isNumberRelated){
						//For numeric types (number  and range) the value must exactly match the number type (numberRegExp)
						if(type == 'range'){
							//For this type...max defaults to 100
							node.max = (maxAttrNode && $wf2.numberRegExp.test(maxAttrNode.value)) ? Number(maxAttrNode.value) : 100;
							
							
							//node.min is set at the beginning of this function so that the min value can be set as the default value
						}
						else {
							if(minAttrNode && $wf2.numberRegExp.test(minAttrNode.value))
								node.min = Number(minAttrNode.value);
							if(maxAttrNode && $wf2.numberRegExp.test(maxAttrNode.value))
								node.max = Number(maxAttrNode.value);
							if(stepAttrNode && $wf2.numberRegExp.test(stepAttrNode.value))
								node.step = Number(stepAttrNode.value);
						}
						node.validity.rangeUnderflow = (node.min != undefined && Number(node.wf2Value) < node.min);
						node.validity.rangeOverflow  = (node.max != undefined && Number(node.wf2Value) > node.max);
						node.validity.stepMismatch = !$wf2.isValidNumber(node);
						//console.log('first: ', node.validity.stepMismatch, ',', node.getAttribute('type'))
					}
					//For file types it must be a sequence of digits 0-9, treated as a base ten integer.
					else if(type == 'file'){
						if(minAttrNode && /^\d+$/.test(minAttrNode.value))
							node.min = Number(minAttrNode.value);
						//If absent, or if the minimum value is not in exactly the expected format, there
						//   is no minimum restriction, except for the ... file types, where the default is zero.
						else node.min = 0;
						if(maxAttrNode && /^\d+$/.test(maxAttrNode.value))
							node.max = Number(maxAttrNode.value);
						//If absent, or if the maximum value is not in exactly the expected format, there is no
						//  maximum restriction (beyond those intrinsic to the type), except for ... the file
						//  type, where the default is 1.
						else node.max = 1;
						
						//node.validity.rangeUnderflow = (node.min != undefined && Number(node.value) < node.min);
						//node.validity.rangeOverflow  = (node.max != undefined && Number(node.value) > node.max);
					}
					//Date related
					else {
						//For date and time types it must match the relevant format mentioned for that type, all fields
						//   having the right number of digits, with the right separating punctuation.
						if(minAttrNode){
							node.min = $wf2.parseISO8601(minAttrNode.value, type);
							node.validity.rangeUnderflow = (node.min && node.wf2Value < node.min);
						}
						if(maxAttrNode){
							node.max = $wf2.parseISO8601(maxAttrNode.value, type);
							node.validity.rangeOverflow = (node.max && node.wf2Value > node.max);
						}
					}
				}
				//The step attribute controls the precision allowed for the date-related, time-related, and numeric types.
				
				//Note: webforms2 as of March 6, 2012 does not support step for time related inputs.  Will revisit later.
				if(!(isDateRelated || isTimeRelated) && doCheckPrecision && !node.validity.rangeUnderflow && !node.validity.rangeOverflow){
					//stepMismatch -- The value is not one of the values allowed by the step attribute, and the UA will 
					//   not be rounding the value for submission. Empty values and values that caused the typeMismatch 
					//   flag to be set must not cause this flag to be set.
					
					var stepAttrNode = $wf2.getOriginalAttrNode(node, 'step'); //node.getAttributeNode('step');
					
					if(!stepAttrNode){
						//The step attribute [for types datetime, datetime-local, and time] ... defaulting to 60 (one minute).
						//For time controls, the value of the step attribute is in seconds, although it may be a fractional
						//   number as well to allow fractional times.  The default value of the step
						//   attribute for datetime, datetime-local and time controls is 60 (one minute).
						//The step [for type date] attribute specifies the precision in days, defaulting to 1.
						//The step [for type month] attribute specifies the precision in months, defaulting to 1.
						//The step [for type week] attribute specifies the precision in weeks, defaulting to 1.
						//For date controls, the value of the step attribute is in days, weeks, or months, for the date,
						//   week, and month  types respectively. The format is a non-negative integer; one or more digits
						//   0-9 interpreted as base ten. If the step is zero, it is interpreted as the default. The default
						//   for the step  attribute for these control types is 1.
						//The step [for types number and range] attribute specifies the precision, defaulting to 1.
						node.step = isTimeRelated ? 60 : 1;
					}
					//The literal value 'any' may be used as the value of the step attribute. This keyword indicates that
					//   any value may be used (within the bounds of other restrictions placed on the control).
					else if(stepAttrNode.value == 'any')
						node.step = 'any'; //isStepAny = true;
					//The format of the step attribute is the number format described above, except that
					//   the value must be greater than zero.
					else if($wf2.numberRegExp.test(stepAttrNode.value) && stepAttrNode.value > 0)
						node.step = Number(stepAttrNode.value);
					else
						node.step = isTimeRelated ? 60 : 1;
					
					if(node.step != 'any'){
						node.wf2StepDatum = null;
						if(minAttrNode)
							node.wf2StepDatum = node.min;
						else if(maxAttrNode)
							node.wf2StepDatum = node.max;
						else
							node.wf2StepDatum = $wf2.zeroPoint[type] ? $wf2.zeroPoint[type] : 0;
						
						//The zero point for datetime  controls is 1970-01-01T00:00:00.0Z, for datetime-local is
						//   1970-01-01T00:00:00.0, for date controls is 1970-01-01, for month controls is 1970-01,
						//   for week controls is 1970-W01 (the week starting 1969-12-29 and containing 1970-01-01),
						//   and for time controls is 00:00.
						var _step = node.step;
						if(type == 'month' && node.wf2StepDatum && node.wf2StepDatum.getUTCFullYear){
							//var month1 = node.wf2StepDatum.getUTCFullYear()*12 + node.wf2StepDatum.getUTCMonth();
							//var month2 = node.wf2Value.getUTCFullYear()*12 + node.wf2Value.getUTCMonth();
							//node.validity.stepMismatch = (month2 - month1)%_step != 0;
						}
						else {
							switch(type){
								case 'datetime':
								case 'datetime-local':
								case 'time':
									_step = parseInt(_step * 1000); //for millisecond comparisons
									break;
								case 'date':
									_step = parseInt(_step * 24*60*60*1000);
									break;
								case 'week':
									_step = parseInt(_step * 7*24*60*60*1000);
									break;
							}

							//For the control to be valid, the control's value must be an integral number of steps from the min value,
							//   or, if there is no min attribute, the max value, or if there is neither attribute, from the zero point.
							//allow decimal places to the 1,000th place
							node.validity.stepMismatch = (Math.round((node.wf2Value - node.wf2StepDatum)*1000) % Math.round(_step*1000)) != 0;
						}
					}
				}
			}
			
			//[TEXTAREA] tooLong -- The value of a control with a maxlength attribute is longer than the attribute allows, 
			//   and the value of the control doesn't exactly match the control's default value. 
			//[The maxlength] attribute must not affect the initial value (the DOM defaultValue attribute). It must only
			//   affect what the user may enter and whether a validity error is flagged during validation.
			if(doMaxLengthCheck && node.maxLength >= 0 && node.wf2Value != node.defaultValue){
				//A newline in a textarea's value must count as two code points for maxlength processing (because
				//   newlines in textareas are submitted as U+000D U+000A). [[NOT IMPLEMENTED: This includes the
				//   implied newlines that are added for submission when the wrap attribute has the value hard.]]
				//var matches = node.value.match(/((?<!\x0D|^)\x0A|\x0D(?!^\x0A|$))/g); //no negative lookbehind
				var shortNewlines = 0;
				var v = node.wf2Value;
				node.wf2ValueLength = v.length;
				for(var i = 1; i < v.length; i++){
					if(v[i] === "\x0A" && v[i-1] !== "\x0D" || v[i] == "\x0D" && (v[i+1] && v[i+1] !== "\x0A"))
						node.wf2ValueLength++;
				}
				
				//The tooLong flag is used when this attribute is specified on a ... textarea control and the control
				//   has more than the specified number of code points and the value doesn't match the control's default value.
				node.validity.tooLong = node.wf2ValueLength > node.maxLength;
			}
		} else {
			if(minAttrNode && $wf2.numberRegExp.test(minAttrNode.value))
				node.min = Number(minAttrNode.value);
			if(maxAttrNode && $wf2.numberRegExp.test(maxAttrNode.value))
				node.max = Number(maxAttrNode.value);
			if(stepAttrNode && $wf2.numberRegExp.test(stepAttrNode.value))
				node.step = Number(stepAttrNode.value);
		}

		//customError -- The control was marked invalid from script. See the definition of the setCustomValiditiy() method.
		//console.log('second: ', node.validity.stepMismatch)
		node.validity.valid = !$wf2.hasInvalidState(node.validity);
		var nextSib = (node.nextSibling);
		if (nextSib && nextSib.nodeName != 'SPAN' && !$wf2.css.isMemberOfClass(nextSib, 'wf2-validityIndicator')) {
			nextSib = null;
		}
		
		if (node.validity.valid) {
			$wf2.css.removeClass(node, 'wf2_invalid');
			$wf2.css.addClass(node, 'wf2_valid');
			
			/*
			 * If we have an .wf2-validityIndicator span after the input, mark these as well
			 */
			if (nextSib) {
				$wf2.css.removeClass(nextSib, 'wf2_invalid');
				$wf2.css.addClass(nextSib, 'wf2_valid');
				//console.log('valid: ', nextSib.className);
			}
			
			//node.className = node.className.replace(/\s?wf2_invalid/g, "") + ' wf2_valid';
			
		} else { 
			$wf2.css.removeClass(node, 'wf2_valid');
			$wf2.css.addClass(node, 'wf2_invalid');
			
			/*
			 * If we have an .wf2-validityIndicator span after the input, mark these as well
			 */
			if (nextSib) {
				$wf2.css.removeClass(nextSib, 'wf2_valid');
				$wf2.css.addClass(nextSib, 'wf2_invalid');
				//node.className = node.className.replace(/\s?wf2_valid/g, "") + ' wf2_invalid';
				//console.log('not valid: ', nextSib.className, 'value:', node.value, 'wtfValue:', node.wf2Value)
			}
			
			
		}
		
		
		
		
		if (isCustomErrorMessageSet) {
			node.validationMessage = customErrorMessage;
		}
		
		
		//This is now done onmousedown or onkeydown, just as Opera does
		//if(node.validity.valid){
		//	node.className = node.className.replace(/\s*\binvalid\b\s*/g, " "); //substitute for :invalid pseudo class
		//	//if(node.wf2_errorMsg){
		//	//	node.wf2_errorMsg.parentNode.removeChild(node.wf2_errorMsg);
		//	//	node.wf2_errorMsg = null;
		//	//}
		//	var errMsg = document.getElementById((node.id || node.name) + '_wf2_errorMsg');
		//	if(errMsg)
		//		errMsg.parentNode.removeChild(errMsg);
		//}
	},
	
	// checks to see if a number node has a value that is valid.
	isValidNumber: function (node) {
		//console.log(node.wf2Value + ", " + node.min + ", " + node.max + ", " + node.step);
		var n = (parseFloat(node.wf2Value) - parseFloat(node.min))/parseFloat(node.step);
		//console.log('!' , n == parseInt(n))
		return (n == parseInt(n));
	},

	applyValidityInterface : function(node){
		//console.log('applying ' + node.name)
		/* Webkit browsers need this */
		if (!$wf2.hasNativeBubbles || (node.form && $wf2.getAttributeValue(node.form, 'data-webforms2-force-js-validation') == 'true')) {
			//console.log(node.name)
			if (node.type == 'submit' || node.type == 'button') {
				
				node.formNoValidate=true;
				
			}
		}
	
		/* Made a change here to ensure Google's unfinished native implementation is not used. */
		else if((node.validity && node.validity.typeMismatch !== undefined)) {//MSIE needs the second test for some reason
			//	console.log('bad implementation!! ' + node.id);
			
			return node;
		}
		
		try {
		node.validationMessage = "";
		
		//ValidityState interface
		node.validity = $wf2.createValidityState();
		node.willValidate = true;
		} catch (ex) {
			// do nothing.
		}
		var nodeName = node.nodeName.toLowerCase();
		if(nodeName == 'button' || nodeName == 'fieldset'){
			node.setCustomValidity = function(error){
				throw $wf2.DOMException(9); //NOT_SUPPORTED_ERR
			};
			node.checkValidity = function(){
				return true;
			};
			return node;
		}
		//node._updateValidityState = $wf2._updateValidityState;
		
		if (!node.setCustomValidity) {
			node.setCustomValidity = $wf2.controlSetCustomValidity;
		}
		
		
		node.checkValidity = $wf2.controlCheckValidity;
		
		
		//var type = (node.type ? node.type.toLowerCase() : (nodeName == 'input' ? 'text' : ''));
		var type = (node.getAttribute('type') ? node.getAttribute('type').toLowerCase() : node.type);
		
		if(/(hidden|button|reset|add|remove|move-up|move-down)/.test(type) || !node.name || node.disabled) {
			try {
				node.willValidate = false;
			} catch (ex) {
				// do nothing.
			}
		}
		else if(window.RepetitionElement) {
			var parent = node;
			while(parent = parent.parentNode){
				if(parent.repetitionType == RepetitionElement.REPETITION_TEMPLATE){
					try {
						node.willValidate = false;
					} catch (ex) {
						// do nothing.
					}
					break;
				}
			}
		}
		
		
		
		var handler = function(event){
			return $wf2.updateValidityState(event.currentTarget || event.srcElement);
		};
		
		//attempt to check validity live
		if(document.addEventListener){
			node.addEventListener('change', handler, false);
			node.addEventListener('blur', handler, false);
			node.addEventListener('keyup', handler, false);
		}
		else if(window.attachEvent){
			node.attachEvent('onchange', handler);
			node.attachEvent('onblur', handler);
			node.attachEvent('onkeyup', handler);
		}
		else {
		
		}
		
		return node;
	},
	
	/* updateValidityState: function (node) {
		if (node.checkValidity()){
			node.className = node.className.replace(/\s?wf2_invalid/, "");
			
		} else {
			node.className += ' wf2_invalid';
		}
	}, */

	onsubmitValidityHandler : function(event){
		var frm = event.currentTarget || event.srcElement;
		var r;
		
		// call routines other libraries have set to be run before
		// validation.
		for (var i=0; i<$wf2.callBeforeValidation.length; i++) {
			$wf2.callBeforeValidation[i](event);
		}
		
		
		if(!frm.checkValidity()){
			if(event.preventDefault)
				event.preventDefault();
			event.returnValue = false;
			r = false;
		} else {
			event.returnValue = true;
			r = true;
		}
		
		// call routines other libraries have set to be run before
		// validation.
		for (var i=0; i<$wf2.callAfterValidation.length; i++) {
			$wf2.callAfterValidation[i](event, r);
		}
		
		// Finally .. set a class on the form to indicate that a form
		// submit was attempted
		$wf2.css.addClass(frm, 'wf2_submitAttempted');
		
		return r;
	},

	controlSetCustomValidity : function(error){
		if(error){
			this.validationMessage = String(error);
			this.validity.customError = true;
		}
		else {
			this.validationMessage = "";
			this.validity.customError = false;
		}
		this.validity.valid = !$wf2.hasInvalidState(this.validity);
	},
	hasInvalidState : function(validity){
		return validity.typeMismatch 
			|| validity.rangeUnderflow 
			|| validity.rangeOverflow
			|| validity.stepMismatch
			|| validity.tooLong 
			|| validity.patternMismatch 
			|| validity.valueMissing 
			|| validity.customError;
	},
	createValidityState : function(){
		return {
			typeMismatch    : false,
			rangeUnderflow  : false,
			rangeOverflow   : false,
			stepMismatch    : false,
			tooLong         : false,
			patternMismatch : false,
			valueMissing    : false,
			customError     : false,
			valid           : true
		};
	},

	//## Default action functions for invalid events ##################################################

	invalidIndicators : [],
	indicatorTimeoutId : null,
	indicatorIntervalId : null,
	
	stepUnits : {
		'datetime' : 'second',
		'datetime-local': 'second',
		'time': 'second',
		'date': 'day',
		'week': 'week',
		'month': 'month'
	},

	invalidMessages : {
		valueMissing   : 'Please fill out this field.',
		typeMismatch   : 'Please enter a valid %s.',
		rangeUnderflow : 'The value must be equal to or greater than %s.',
		rangeOverflow  : 'The value must be equal to or less than %s.',
		stepMismatch   : 'The value has a step mismatch; it must be a certain number multiples of %s from %s.',
		tooLong        : 'The value is too long. The field may have a maximum of %s characters but you supplied %s. Note that each line-break counts as two characters.',
		patternMismatch: 'Please match the requested format.'
	},
	
	valueToWF2Type : function(value, type){
		switch(String(type).toLowerCase()){
			case 'datetime':
			case 'datetime-local':
			case 'date':
			case 'month':
			case 'week':
			case 'time':
				return $wf2.dateToISO8601(value, type);
			default:
				return value;
		}
	},

	addInvalidIndicator : function(target){
		//show contextual help message
		var msg = document.createElement('div');
		msg.className = 'wf2_errorMsg wf2_fromForm_' + (target.form.id || target.form.name);
		
		//Let's put in a container in here so IE9- can put a gradient filter in here.
		/* var msgContainer = document.createElement('div');
		msgContainer.className = 'wf2_errorMsgContainer';
		msg.appendChild(msgContainer);  */
		
		
		
		var IEmsgContainer = document.createElement('div');
		IEmsgContainer.className = 'wf2_IEerrorMsgContainer';
		msg.appendChild(IEmsgContainer); 
		
		var msgContainer = document.createElement('div');
		msgContainer.className = 'wf2_errorMsgContainer';
		IEmsgContainer.appendChild(msgContainer); 
		
		
		
		//msg.title = "Close";
		msg.id = (target.id || target.name) + '_wf2_errorMsg'; //QUESTION: does this work for MSIE?
		msg.onmousedown = function(){
			this.parentNode.removeChild(this);
		};
		//var type = String(target.getAttribute('type')).toLowerCase();
		//var type = (target.type ? target.type.toLowerCase() : (target.nodeName.toLowerCase() == 'input' ? 'text' : ''));
		var type = (target.getAttribute('type') ? target.getAttribute('type').toLowerCase() : target.type);
		var isDateTimeRelated = (type == 'datetime' || type == 'datetime-local' || type == 'time' || type == 'date' || type == 'month' || type == 'week');

		var ol = document.createElement('ol');
		if(target.validity.customError) {
			ol.appendChild($wf2.createLI(target.validationMessage));
		} else {
			if(target.validity.valueMissing)
				ol.appendChild($wf2.createLI($wf2.invalidMessages.valueMissing));
			if(target.validity.typeMismatch)
				ol.appendChild($wf2.createLI($wf2.invalidMessages.typeMismatch.replace(/%s/, type)));
			if(target.validity.rangeUnderflow)
				ol.appendChild($wf2.createLI($wf2.invalidMessages.rangeUnderflow.replace(/%s/, $wf2.valueToWF2Type(target.min, type))));
			if(target.validity.rangeOverflow)
				ol.appendChild($wf2.createLI($wf2.invalidMessages.rangeOverflow.replace(/%s/, $wf2.valueToWF2Type(target.max, type))));
			if(target.validity.stepMismatch)
				ol.appendChild($wf2.createLI($wf2.invalidMessages.stepMismatch.replace(/%s/, target.step + ($wf2.stepUnits[type] ? ' ' + $wf2.stepUnits[type] + '(s)' : '')).replace(/%s/, $wf2.valueToWF2Type(target.wf2StepDatum, type))));
			if(target.validity.tooLong)
				ol.appendChild($wf2.createLI($wf2.invalidMessages.tooLong.replace(/%s/, target.maxLength).replace(/%s/, target.wf2ValueLength ? target.wf2ValueLength : target.value.length)));
			if(target.validity.patternMismatch)
				ol.appendChild($wf2.createLI($wf2.invalidMessages.patternMismatch.replace(/%s/, target.title ? target.title : ' "' + target.getAttribute('pattern') + '"')));
		}
		
		if(ol.childNodes.length == 1)
			ol.className = 'single';
		
		msgContainer.appendChild(ol);
		
		
		
		////remove existing error message
		//if(document.getElementById(msg.id))
		//	document.documentElement.removeChild(document.getElementById(msg.id));
		//target.parentNode.insertBefore(msg, target); //Inserting error message next to element in question causes problems when the element has a positioned containing block
		var parent = document.body ? document.body : document.documentElement;
		if($wf2.invalidIndicators.length) //insert before other error messages so that it appears on top
			parent.insertBefore(msg, $wf2.invalidIndicators[$wf2.invalidIndicators.length-1].errorMsg);
		else //insert at the end of the document
			parent.insertBefore(msg, null); 
		//target.wf2_errorMsg = msg;
		//if(target.style.display == 'none' || !target.offsetParent){
		//	var prevEl = target.previousSibling;
		//	var nextEl = target.nextSibling;
		//	var prevCount = 0, nextCount = 0;
		//	while(prevEl && (prevEl.nodeType != 1 || (prevEl.style.display == 'none' || !prevEl.offsetParent)) && ++prevCount)
		//		prevEl = prevEl.previousSibling;
		//	while(nextEl && (nextEl.nodeType != 1 || (nextEl.style.display == 'none' || !nextEl.offsetParent)) && ++nextCount)
		//		nextEl = nextEl.nextSibling;
		//	
		//	if(prevEl && prevCount > nextCount)
		//	
		//}
		
		// this allows a border radius on the msg to play well with IE9 and lower's Gradient filter on the msgContainer.
		if (msg.currentStyle && msg.currentStyle.borderRadius && msgContainer.currentStyle.filter.indexOf('Gradient') > -1) {
			
			IEmsgContainer.style.borderRadius = msg.currentStyle.borderRadius;
			IEmsgContainer.style.overflow = 'hidden';
		}
		
		var el = target;
		while(el && (el.nodeType != 1 || (el.style.display == 'none' || el.style.visibility == 'hidden' || !el.offsetParent)))
			el = el.parentNode;
		
		var top = left = 0;
		var cur = el;
		
		
		var s = $wf2.css.getAbsoluteCoords(el);	
		top = s.y + el.offsetHeight;
		left = s.x;	
		
		
		msg.style.top = top + 'px';
		msg.style.left = left + 'px';
		
		$wf2.invalidIndicators.push({
			target : target,
			errorMsg : msg
		});
		//if(target.form && target.form[target.name]){
		//	target.form[target.name].wf2HasInvalidIndicator = true;
		//	console.info('set')
		//}
		/* if(!target.className.match(/\bwf2_invalid\b/))
			target.className += " wf2_invalid"; */
		$wf2.css.addClass(target, 'wf2_invalid');
		
		
		// WR: We removed the commented stuff below because it is not needed for the new validation routines.
		/* if($wf2.indicatorIntervalId == null){
			//var i = $wf2.invalidIndicators.length - 1;
			$wf2.indicatorIntervalId = setInterval(function(){
				var invalidIndicator;
				
				for(var i = 0; invalidIndicator = $wf2.invalidIndicators[i]; i++){
					
					if (!$wf2.css.isMemberOfClass(invalidIndicator.target, 'wf2_invalid')) {
						$wf2.css.addClass(invalidIndicator.target, 'wf2_invalid')
					} else {
						$wf2.css.removeClass(invalidIndicator.target, 'wf2_invalid');
					}
					
					
					
				}
				
			}, 500); 
			return;
			// call routines other libraries have set to be run before
			// validation.
			setTimeout(function() {
				for (var i=0; i<$wf2.callAfterValidation.length; i++) {
					$wf2.callAfterValidation[i](null, false);
				}
			}, 1);
			$wf2.indicatorTimeoutId = setTimeout($wf2.clearInvalidIndicators, 4000);
		}*/
		
	},

	clearInvalidIndicators : function(e){
		
		if (e.type == 'mousedown') {
			var coords = $wf2.css.getMouseCoords(e),
				browserWidth = $wf2.css.getWindowWidth(),
				offset = (window.innerWidth )?16:0;
				
				if (coords.x >= browserWidth - offset) {
					return;
				}
		}
		
		
		clearTimeout($wf2.indicatorTimeoutId);
		$wf2.indicatorTimeoutId = null;
		clearInterval($wf2.indicatorIntervalId);
		$wf2.indicatorIntervalId = null;

		var invalidIndicator;
		while(invalidIndicator = $wf2.invalidIndicators[0]){
			if(invalidIndicator.errorMsg && invalidIndicator.errorMsg.parentNode)
				invalidIndicator.errorMsg.parentNode.removeChild(invalidIndicator.errorMsg);
			//clearInterval(insts[0].intervalId);
			var target = invalidIndicator.target;
			
			// Removed
			// target.className = target.className.replace(/\s?wf2_invalid/, ""); //([^\b]\s)?
			$wf2.invalidIndicators.shift();
		}
		
	},

	/*##############################################################################################
	 # Other helper functions (not made into methods)
	 ##############################################################################################*/

	cloneNode_customAttrs : { //FOR MSIE BUG: it cannot perceive the attributes that were actually specified
		'type':1,'template':1,'repeat':1,'repeat-template':1,'repeat-min':1,
		'repeat-max':1,'repeat-start':1,'value':1,'class':1,'required':1,
		'pattern':1,'form':1,'autocomplete':1,'autofocus':1,'inputmode':1,
		'max':1,'min':1,'step':1,
		onmoved:1,onadded:1,onremoved:1, 
		onadd:1,onremove:1,onmove:1 //deprecated
	},
	cloneNode_skippedAttrs : {
		'name':1,  //due to MSIE bug, set via $wf2.createElement
		'class':1, //due to MSIE bug, set below (see http://www.alistapart.com/articles/jslogging)
		'for':1,   //due to preceived MSIE bug, set below
		'style':1, //inline styles require special handling
		'checked':1, //set by $wf2.createElement due to MSIE bug creating INPUT@type=radio
		
		//for MSIE, properties (or methods) == attributes
		addRepetitionBlock:1,addRepetitionBlockByIndex:1,moveRepetitionBlock:1,
		removeRepetitionBlock:1, repetitionBlocks:1,
		setCustomValidity:1,checkValidity:1,validity:1,validationMessage:1,willValidate:1,
		wf2StepDatum:1,wf2Value:1,wf2Initialized:1,wf2ValueLength:1
	},
	cloneNode_rtEventHandlerAttrs : {
		onmoved:1,onadded:1,onremoved:1, //don't copy Repetition old model event attributes not methods
		onadd:1,onremove:1,onmove:1 //deprecated
		//QUESTION: is this right???
	},

	//The following cloneNode algorithm was designed to handle the attribute processing that the repetition
	//  model specifies. Gecko starts to have irratic behavior with a cloned input's value attribute and value
	//  property when using DOM cloneNode; furthermore, various MSIE bugs prevent its use of DOM cloneNode
	cloneNode : function (node, processAttr, rtNestedDepth){
		if(!rtNestedDepth)
			rtNestedDepth = 0;
		var clone, i, attr;
		switch(node.nodeType){
			case 1: /*Node.ELEMENT_NODE*/
				//if(node.nodeType == 1 /*Node.ELEMENT_NODE*/){
				var isTemplate = node.getAttribute('repeat') == 'template';
				if(isTemplate)
					rtNestedDepth++;
				//BROWSER BUGS: MSIE does not allow the setting of the node.name, except when creating the new node
				//              MSIE neither permits the standard DOM creation of radio buttons
				var attrs = [];
				if(node.name)
					attrs.name = processAttr ? processAttr(node.name) : node.name;
				if(node.type == 'radio')
					attrs.type = node.type;
				if(node.checked)
					attrs.checked = 'checked';
				clone = $wf2.createElement(node.nodeName, attrs);
				//clone = node.name  ? 
				//		$wf2.createElement(node.nodeName, attrs) 
				//	  : document.createElement(node.nodeName);
						
				for(i = 0; attr = node.attributes[i]; i++){
					
					//MSIE ISSUE: Custom attributes specified do not have .specified property set to true?
					//ISSUE: VALUE IS REPEATED IN MSIE WHEN VALUE ATTRIBUTE SET?
					//if(attr.specified || node.getAttribute(attr.nodeName)) //$wf2.cloneNode_customAttrs[attr.nodeName] || 
					//	if(window.console && console.info) console.info(node.nodeName + "@" + attr.nodeName + " -- " + attr.specified + " <font color=red>" + node.getAttribute(attr.nodeName) + "</font>(" + typeof node.getAttribute(attr.nodeName) + ")<br>");
	
					//MSIE needs $wf2.cloneNode_customAttrs[attr.name] test since attr.specified does not work with custom attributes
					//If the node is a template, the repetition event handlers should only be copied
					//   if the template is nested and is being cloned by a parent repetition template.
					if((attr.specified || $wf2.cloneNode_customAttrs[attr.name])
						  && !$wf2.cloneNode_skippedAttrs[attr.name] && (
								(!isTemplate || (rtNestedDepth > 1 || !$wf2.cloneNode_rtEventHandlerAttrs[attr.name])) // && 
							))
					{
						
						//MSIE BUG: when button[type=add|remove|move-up|move-down], then (attr.nodeValue and attr.value == 'button') but node.getAttribute(attr.nodeName) == 'add|remove|move-up|move-down' (as desired)
						
						//clone and process an event handler property (attribute);
						//   keep event handler attributes as plain text if nested repetition template
						if(rtNestedDepth < 2 && (attr.name.indexOf('on') === 0) && (typeof node[attr.name] == 'function')){
							var funcBody = processAttr(node[attr.name].toString().match(/{((?:.|\n)+)}/)[1]);
							funcBody = processAttr(funcBody);
							clone[attr.name] = new Function('event', funcBody);
						}
						//clone and process other attributes
						else {
							var attrValue = node.getAttribute(attr.name);
							attrValue = (processAttr ? processAttr(attrValue) : attrValue);
							clone.setAttribute(attr.name, attrValue);
						}
						//console.log(StringHelpers.sprintf("AFTER attr: %s val: %s (%s)", attr.name, attr.value, processAttr(attrValue)))
					}
				}
				//MSIE BUG: setAttribute('class') creates duplicate value attribute in MSIE; 
				//QUESTION: will setting className on this clonedNode still cause this error later on for users? will addClassName croak? Should it be improved?
				//see: http://www.alistapart.com/articles/jslogging
				if(node.className){
					var _className = (processAttr ? processAttr(node.className) : node.className);
					if(clone.getAttributeNode('class')){
						for(i = 0; i < clone.attributes.length; i++) {
							if(clone.attributes[i].name == 'class')
								clone.attributes[i].value = _className;
						}
					}
					else clone.setAttribute('class', _className);
				}
	
				//Restore the template's elements to the originally coded disabled state (indicated by 'disabled' class name)
				// All elements within the repetition template are disabled to prevent them from being successful.
				if(!/\bdisabled\b/.test(node.className))
					clone.disabled = false;
				
				//Process the inline style
				if(node.style && node.style.cssText){
					//clone.setAttribute('style', processAttr(node.style.cssText));
					clone.style.cssText = (processAttr ? processAttr(node.style.cssText) : node.style.cssText);
				}
				
				//label's 'for' attribute, set here due to MSIE bug
				if(node.nodeName && node.nodeName.toLowerCase() == 'label' && node.htmlFor)
					clone.htmlFor = (processAttr ? processAttr(node.htmlFor) : node.htmlFor);
				

				if(clone.nodeName.toLowerCase() == 'option'){ //MSIE clone element bug requires this
					clone.selected = node.selected;
					clone.defaultSelected = node.defaultSelected;
				}
				
				for(i = 0; i < node.childNodes.length; i++){
					clone.appendChild($wf2.cloneNode(node.childNodes[i], processAttr, rtNestedDepth));
				}
				break;
			//MSIE BUG: The following three cases are for MSIE because when cloning nodes from XML
			//          files loaded via SELECT@data attribute, MSIE fails when performing appendChild.
			case 3: /*Node.TEXT_NODE*/
			case 4: /*Node.CDATA_SECTION_NODE*/
				clone = document.createTextNode(node.data);
				break;
			case 8: /*Node.COMMENT_NODE*/
				clone = document.createComment(node.data);
				break;
			default:
				clone = node.cloneNode(true)
		}
		//else clone = node.cloneNode(true);
		return clone;
	},
	
	getFormElements : function(){
		var elements = [];
		var allElements = $wf2.getElementsByTagNames.apply(this, ['input','output','select','textarea','button']); //fieldset
		for(var i = 0; i < allElements.length; i++){
			var node = allElements[i].parentNode;
			while(node && node.nodeType == 1 && node.getAttribute('repeat') != 'template')
				node = node.parentNode;
			if(!node || node.nodeType != 1)
				elements.push(allElements[i]);
		}
		return elements;
	},
	
	loadDataURI : function(el){
		var uri = el.data || el.getAttribute('data');
		if(!uri)
			return null;
		var doc = null, matches;
		try {
			if(matches = uri.match(/^data:[^,]*xml[^,]*,((?:.|\n)+)/)){
				var xml = decodeURI(matches[1].replace(/%3D/ig, '=').replace(/%3A/ig, ':').replace(/%2F/ig, '/'));
				if(window.DOMParser){
					var parser = new DOMParser();
					doc = parser.parseFromString(xml, 'text/xml');
				}
				else if(window.ActiveXObject){
					doc = new ActiveXObject("Microsoft.XMLDOM");
					doc.async = 'false';
					doc.loadXML(xml);
				}
			}
			else {
				$wf2.xhr.open('GET', uri, false);
				$wf2.xhr.send(null); //Note: if in Firefox and null not provided, and if Firebug is disabled, an error occurs
				doc = $wf2.xhr.responseXML;
			}
		}
		catch(e){
			return null;
		}
		return doc;
	},
	
	getAttributeByName: function (obj, attrName) {
		var i;
		
		var attributes = obj.attributes;
		for (i=0; i<attributes.length; i++) {
			var attr = attributes[i]
			if (attr.nodeName == attrName && attr.specified) {
			  	return attr;
			}
		}
		return null;
	},
	
	getAttributeValue: function (obj, attrName) {
		var attr = $wf2.getAttributeByName(obj, attrName);
		
		if (attr != null) {
			return attr.nodeValue;
		} else {
			return null;
		}
	},	
	
	setAttributeValue: function (obj, attrName, attrValue) {
		var attr = $wf2.getAttributeByName(obj, attrName);
		
		if (attr != null) {
			attr.nodeValue = attrValue;
		} else {
			return;
		}
	},
	
	
	getDatasetItem: function (obj, name) {
		var r = $wf2.getAttributeValue(obj, 'data-' + name);
		
		if (!r) {
			r = $wf2.getAttributeValue(obj, 'data-' + name.toLowerCase())
		} 
		
		if (!r) {
			r = obj['data-' + name.toLowerCase()]
		}
		return r;
	},
	
	setDatasetItem: function (obj, name, value) {
		var attrName = 'data-' + name.toLowerCase();
		
		var val = $wf2.setAttributeValue(obj, attrName, value);
		
		if ($wf2.getAttributeValue(obj, attrName) == null) {
			obj[attrName] = value;
			
		}
	},

	getElementsByTagNames : function(/* ... */){
		var els,i,results = [];
		if(document.evaluate){
			var _tagNames = [];
			for(i = 0; i < arguments.length; i++)
				_tagNames.push(".//" + arguments[i]);
			els = document.evaluate(_tagNames.join('|'), this, null, XPathResult.ORDERED_NODE_SNAPSHOT_TYPE, null); 
			for(i = 0; i < els.snapshotLength; i++)
				results.push(els.snapshotItem(i));
		}
		else {
			for(i = 0; i < arguments.length; i++){
				els = this.getElementsByTagName(arguments[i]);
				for(var j = 0; j < els.length; j++){
					results.push(els[j]);
				}
			}
			if($wf2.sortNodes)
				results.sort($wf2.sortNodes);
		}
		return results;
	},
	
	getElementsByTagNamesAndAttribute : function(elNames, attrName, attrValue, isNotEqual){
		var els,el,i,j,results = [];
		
		//QUESTION!!! Can we exclude all nodes that are not decendents of the repetition template?
		if(document.evaluate){
			var attrExpr = '';
			if(attrName)
				attrExpr = '[@' + attrName + (attrValue ? (isNotEqual ? '!=' : '=') + '"' + attrValue + '"' : "") + "]";
			var xPaths = [];
			for(i = 0; i < elNames.length; i++)
				xPaths.push('.//' + elNames[i] + attrExpr);
			els = document.evaluate(xPaths.join('|'), this, null, XPathResult.ORDERED_NODE_SNAPSHOT_TYPE, null); 
			for(i = 0; i < els.snapshotLength; i++)
				results.push(els.snapshotItem(i));
		}
		else {
			for(i = 0; i < elNames.length; i++){
				els = this.getElementsByTagName(elNames[i]);
				for(j = 0; el = els[j]; j++){
					var thisAttrNode = el.getAttributeNode(attrName);
					var thisAttrValue = el.getAttribute(attrName); //MSIE needs getAttribute here for custom button types to be read
					if(!attrName || (thisAttrNode && (attrValue === undefined || (isNotEqual ? thisAttrValue != attrValue : thisAttrValue == attrValue) ))){
						results.push(el);
					}
				}
			}
			if($wf2.sortNodes)
				results.sort($wf2.sortNodes);
		}
		return results;
	},
	
	arrayHasItem : function(arr, item){
		for(var i = 0; i < arr.length; i++){
			if(arr[i] == item)
				return true;
		}
		return false;
	},
	
	//Note: this function has been deemed harmful
	getElementStyle : function(el, property) { //adapted from Danny Goodman <http://www.oreillynet.com/pub/a/javascript/excerpt/JSDHTMLCkbk_chap5/index5.html>
		if(el.currentStyle)
			return el.currentStyle[property];
		else if(window.getComputedStyle)
			return getComputedStyle(el, '').getPropertyValue(property);
		else if(el.style)
			return el.style[property];
		else return '';
	},

	//createElement code based on Anthony Lieuallen's work <http://www.easy-reader.net/archives/2005/09/02/death-to-bad-dom-implementations/#comment-444>
	//   The following function enables MSIE to create elements with the name attribute set, per MSDN:
	//   The NAME attribute cannot be set at run time on elements dynamically created with the 
	//   createElement method. To create an element with a name attribute, include the attribute 
	//   and value when using the createElement method.
	//   The same goes for creating radio buttons and creating defaultly checked checkboxes,
	//   per <http://channel9.msdn.com/wiki/default.aspx/Channel9.InternetExplorerProgrammingBugs>
	createElement : (function(){
		try {
			var el = document.createElement('<div name="foo">'); //MSIE memory leak according to Drip
			if(el.tagName.toLowerCase() != 'div' || el.name != 'foo')
				throw 'create element error';
				
			return function(tag, attrs){
				var html = '<' + tag;
				for(var name in attrs)
					html += ' ' + name + '="' + attrs[name] + '"';
				html += '>';
				if(tag.toLowerCase() != 'input')
					html += '</'+tag+'>';
				return document.createElement(html); //'<'+tag+' name="'+name+'"></'+tag+'>'
			};
		}
		catch(err){
			return function(tag, attrs){
				var el = document.createElement(tag);
				for(var name in attrs)
					el.setAttribute(name, attrs[name]);
				return el;
			};
		}
	})(),

	//Sort elements in document order (from ppk)
	sortNodes : (function(){
		var n = document.documentElement.firstChild;
		if(n.sourceIndex){
			return function (a,b){
				return a.sourceIndex - b.sourceIndex;
			};
		}
		else if(n.compareDocumentPosition){
			return function (a,b){
				return 3 - (a.compareDocumentPosition(b) & 6);
			};
		}
	})(),

	//Shortcut to create new list items; used by default invalid event handler in listing the errors
	createLI : function(text){
		var li = document.createElement('li');
		li.appendChild(document.createTextNode(text));
		return li;
	},
	
	//Initially inspired by Paul Sowden <http://delete.me.uk/2005/03/iso8601.html>
	ISO8601RegExp : /^(?:(\d\d\d\d)-(W(0[1-9]|[1-4]\d|5[0-2])|(0\d|1[0-2])(-(0\d|[1-2]\d|3[0-1])(T(0\d|1\d|2[0-4]):([0-5]\d)(:([0-5]\d)(\.(\d+))?)?(Z)?)?)?)|(0\d|1\d|2[0-4]):([0-5]\d)(:([0-5]\d)(\.(\d+))?)?)$/,
	parseISO8601 : function (str, type) {
		var d = $wf2.validateDateTimeType(str, type);
		if(!d)
			return null;
		
		var date = new Date(0);
		var _timePos = 8;
		
		if(d[15]){ //Time
			if(type && type != 'time') // a time date
				return null;
			_timePos = 15;
		}
		else {
			date.setUTCFullYear(d[1]);
			
			//ISO8601 Week
			if(d[3]){
				if(type && type != 'week')
					return null;
				date.setUTCDate(date.getUTCDate() + ((8 - date.getUTCDay()) % 7) + (d[3]-1)*7); //set week day and week
				return date;
			}
			//Other date-related types
			else {
				date.setUTCMonth(d[4] - 1); //Month must be supplied for WF2
				if(d[6])
					date.setUTCDate(d[6]);
			}
		}

		//Set time-related fields
		if(d[_timePos+0]) date.setUTCHours(d[_timePos+0]);
		if(d[_timePos+1]) date.setUTCMinutes(d[_timePos+1]);
		if(d[_timePos+2]) date.setUTCSeconds(d[_timePos+3]);
		if(d[_timePos+4]) date.setUTCMilliseconds(Math.round(Number(d[_timePos+4]) * 1000));
		
		//Set to local time if date given, hours present and no 'Z' provided
		if(d[4] && d[_timePos+0] && !d[_timePos+6])
			date.setUTCMinutes(date.getUTCMinutes()+date.getTimezoneOffset());

		return date;
	},

	validateDateTimeType : function(value, type){ //returns RegExp matches
		var isValid = false;
		var d = $wf2.ISO8601RegExp.exec(value); //var d = string.match(new RegExp(regexp));
		if(!d || !type)
			return d;
		type = type.toLowerCase();
		
		if(type == 'week') // a week date
			isValid = (d[2].toString().indexOf('W') === 0); //valid if W present
		else if(type == 'time') // a time date
			isValid = !!d[15];
		else if(type == 'month')
			isValid = !d[5];
		else { //a date related value
			//Verify that the number of days in the month are valid
			if(d[6]){
				var date = new Date(d[1], d[4]-1, d[6]);
				if(date.getMonth() != d[4]-1)
					isValid = false;
				else switch(type){
					case 'date':
						isValid = (d[4] && !d[7]); //valid if day of month supplied and time field not present
						break;
					case 'datetime':
						isValid = !!d[14]; //valid if Z present
						break;
					case 'datetime-local':
						isValid = (d[7] && !d[14]); //valid if time present and Z not provided
						break;
				}
			}
		}
		return isValid ? d : null;
	},
	
	zeroPad : function(num, pad){
		if(!pad)
			pad = 2;
		var str = num.toString();
		while(str.length < pad)
			str = '0' + str;
		return str;
	},
	
	dateToISO8601 : function(date, type){
		type = String(type).toLowerCase();
		var ms = '';
		if(date.getUTCMilliseconds())
			ms = '.' + $wf2.zeroPad(date.getUTCMilliseconds(), 3).replace(/0+$/,'');
		switch(type){
			case 'date':
				return date.getUTCFullYear() + '-' + $wf2.zeroPad(date.getUTCMonth()+1) + '-' + $wf2.zeroPad(date.getUTCDate());
			case 'datetime-local':
				return date.getFullYear() + '-' + $wf2.zeroPad(date.getMonth()+1) + '-' + $wf2.zeroPad(date.getDate()) + 
				       'T' + $wf2.zeroPad(date.getHours()) + ':' + $wf2.zeroPad(date.getMinutes()) + ':' + $wf2.zeroPad(date.getMinutes()) + ms + 'Z';
			case 'month':
				return date.getUTCFullYear() + '-' + $wf2.zeroPad(date.getUTCMonth()+1);
			case 'week':
				var week1 = $wf2.parseISO8601(date.getUTCFullYear() + '-W01');
				return date.getUTCFullYear() + '-W' + $wf2.zeroPad(((date.valueOf() - week1.valueOf()) / (7*24*60*60*1000)) + 1);
			case 'time':
				return $wf2.zeroPad(date.getUTCHours()) + ':' + $wf2.zeroPad(date.getUTCMinutes()) + ':' + $wf2.zeroPad(date.getUTCMinutes()) + ms;
			case 'datetime':
			default:
				return date.getUTCFullYear() + '-' + $wf2.zeroPad(date.getUTCMonth()+1) + '-' + $wf2.zeroPad(date.getUTCDate()) + 
				       'T' + $wf2.zeroPad(date.getUTCHours()) + ':' + $wf2.zeroPad(date.getUTCMinutes()) + ':' + $wf2.zeroPad(date.getUTCMinutes()) + ms + 'Z';
		}
	},
	
	/* 
	 * Fires an event manually.
	 * @author Scott Andrew - http://www.scottandrew.com/weblog/articles/cbs-events
	 * @author John Resig - http://ejohn.org/projects/flexible-javascript-events/
	 * @param {Object} obj - a javascript object.
	 * @param {String} evType - an event attached to the object.
	 * @param {Function} fn - the function that is called when the event fires.
	 * 
	 */
	fireEvent: function (element, event, options){
		
		if(!element) {
			return;
		}
		
	    if (document.createEventObject){
			return element.fireEvent('on' + event, $wf2.globalEvent);
	    } else{
	        // dispatch for firefox + others
	        $wf2.globalEvent.initEvent(event, true, true); // event type,bubbling,cancelable
	        return !element.dispatchEvent($wf2.globalEvent);
	    }
	},
	
	//Emulation of DOMException
	DOMException : function(code){
		var message = 'DOMException: ';
		switch(code){
			case  1: message += 'INDEX_SIZE_ERR'; break;
			case  9: message += 'NOT_SUPPORTED_ERR'; break;
			case 11: message += 'INVALID_STATE_ERR'; break;
			case 12: message += 'SYNTAX_ERR'; break;
			case 13: message += 'INVALID_MODIFICATION_ERR'; break;
		}
	
		var err = new Error(message);
		err.code = code;
		err.name = 'DOMException';
	
		//Provide error codes and messages for the exception types that are raised by WF2
		err.INDEX_SIZE_ERR = 1;
		err.NOT_SUPPORTED_ERR = 9;
		err.INVALID_STATE_ERR = 11;
		err.SYNTAX_ERR = 12;
		err.INVALID_MODIFICATION_ERR = 13;
	
		//with($wf2.DOMException.prototype){
		//	INDEX_SIZE_ERR = 1;
		//	DOMSTRING_SIZE_ERR = 2;
		//	HIERARCHY_REQUEST_ERR = 3;
		//	WRONG_DOCUMENT_ERR = 4;
		//	INVALID_CHARACTER_ERR = 5;
		//	NO_DATA_ALLOWED_ERR = 6;
		//	NO_MODIFICATION_ALLOWED_ERR = 7;
		//	NOT_FOUND_ERR = 8;
		//	NOT_SUPPORTED_ERR = 9;
		//	INUSE_ATTRIBUTE_ERR = 10;
		//	INVALID_STATE_ERR = 11;
		//	SYNTAX_ERR = 12;
		//	INVALID_MODIFICATION_ERR = 13;
		//	NAMESPACE_ERR = 14;
		//	INVALID_ACCESS_ERR = 15;
		//};
	
		return err;
	},
	
	css: new function () {
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
		
		me.getAbsoluteCoords = function(obj) {
		
			var curleft = obj.offsetLeft;
			var curtop = obj.offsetTop;
			
			/*
			 * IE and Gecko
			 */
			if (obj.getBoundingClientRect) {
				var temp = obj.getBoundingClientRect();
				
				curleft = temp.left + me.getScrollX();
				curtop = temp.top + me.getScrollY();
			} else {
			
				/* Everything else must do the quirkmode.org way */
			
				if (obj.offsetParent) {
				
					while (obj = obj.offsetParent) {
						curleft += obj.offsetLeft - obj.scrollLeft;
						curtop += obj.offsetTop - obj.scrollTop;
					}
				}
			}
			return {
				x: curleft,
				y: curtop
			};
		}
		
		/**
		 * Get the the amount of pixels the window has been scrolled from the top.  If there is no
		 * vertical scrollbar, this function return 0.
		 *
		 * @return {int} - the amount of pixels the window has been scrolled to the right, in pixels.
		 */
		me.getScrollX = function (myWindow)
		{
			var myDocument;
			
			if (myWindow) {
				myDocument = myWindow.document;
			} else {
				myWindow = window;
				myDocument = document;
			}
			
			// All except that I know of except IE
			if (myWindow.pageXOffset != null) {
				return myWindow.pageXOffset;
			// IE 6.x strict
			} else if (myDocument.documentElement != null 
					&& myDocument.documentElement.scrollLeft !="0px" 
						&& myDocument.documentElement.scrollLeft !=0)  {
				return myDocument.documentElement.scrollLeft;
			// all other IE
			} else if (myDocument.body != null && 
				myDocument.body.scrollLeft != null) {
				return myDocument.body.scrollLeft;
			// if for some reason none of the above work, this should.
			} else if (myWindow.scrollX != null) {
				return myWindow.scrollX;
			} else {
				return null;
			}
		}
		
		/**
		 * Get the the amount of pixels the window has been scrolled to the right.  If there is no
		 * horizontal scrollbar, this function return 0.
		 * 
		 * @return {int} - the amount of pixels the window has been scrolled to the right, in pixels.
		 */
		me.getScrollY = function(myWindow)
		{
			var myDocument;
			
			if (myWindow) {
				myDocument = myWindow.document;
			} else {
				myWindow = window;
				myDocument = document;
			}
			
			// All except that I know of except IE
			if (myWindow.pageYOffset != null) {
				return myWindow.pageYOffset;
			// IE 6.x strict
			} else if (myDocument.documentElement != null
					&& myDocument.documentElement.scrollTop !="0px" 
						&& myDocument.documentElement.scrollTop !=0) {
				return myDocument.documentElement.scrollTop;
			// all other IE
			} else if (myDocument.body && myDocument.body.scrollTop != null) { 
				return myDocument.body.scrollTop;
			// if for some reason none of the above work, this should.
			} else if (myWindow.scrollY != null) { 
				return myWindow.scrollY;
			} else {
				return null;
			}
		}
		
		/**
		 * gets the current window's width.  
		 * 
		 * @author Peter-Paul Koch - http://www.quirksmode.org
		 * @license see http://www.quirksmode.org/about/copyright.html
		 * @return {int} - the window's width, in pixels.
		 */
		me.getWindowWidth = function (theWindow)
		{
			if (!theWindow) {
				theWindow = window;
			}
			
			var theDocument = theWindow.document;
			
			// all except IE
			if (theWindow.innerWidth != null)  {
				return theWindow.innerWidth;
			// IE6 Strict mode
			} else if (theDocument.documentElement && 
					theDocument.documentElement.clientWidth ) {
				return theDocument.documentElement.clientWidth;	
			// IE strictly less than 6
			} else if (theDocument.body != null) {
				return theDocument.body.clientWidth;
			} else {	
				return null;
			}
		}
		
		/**
		 * gets the current window's height.  
		 * 
		 * @author Peter-Paul Koch - http://www.quirksmode.org
		 * @license see http://www.quirksmode.org/about/copyright.html
		 * @return {int} - the window's height in pixels.
		 */
		me.getWindowHeight = function  (theWindow)
		{
			if (!theWindow) {
				theWindow = window;
			}
				
			var theDocument = theWindow.document;
			
			// all except IE
			if (theWindow.innerHeight != null) {
				return theWindow.innerHeight;
			// IE6 Strict mode
			} else if (theDocument.documentElement && 
					theDocument.documentElement.clientHeight ) {
				return theDocument.documentElement.clientHeight;
			// IE strictly less than 6
			} else if (theDocument.body != null) {
				return theDocument.body.clientHeight;
			} else {
				return null;
			}
		}
		
		me.getMouseCoords = function (e) {
			if (!e) {
				return;
			}
			// IE
			if (e.clientX != null) {
				return {
					x: e.clientX,
					y: e.clientY
				}
			
			}
			// NS4
			else if (e.pageX != null) {
				return {
					x: e.pageX,
					y: e.pageY
				}
			// W3C
			}  else if (window.event != null && window.event.clientX != null 
					&& document.body != null && 
					document.body.scrollLeft != null) {
				return {
					x: window.event.clientX + document.body.scrollLeft,
					y: window.event.clientY + document.body.scrollTop
				}
						
			} else { 
				return null;
			}
		}
	}
}; //End $wf2 = {




/*##############################################################################################
 # Change the prototypes of HTML elements
 ##############################################################################################*/


/*##############################################################################################
 # Set mutation event handlers to automatically add WF2 behaviors
 ##############################################################################################*/

//When a form control is inserted into a document, the UA must check to see if it has [the autofocus]
//  attribute set. If it does, and the control is not disabled, and it is of a type normally
//  focusable in the user's operating environment, then the UA should focus the control, as if
//  the control's focus() method was invoked. UAs with a viewport should also scroll the document
//  enough to make the control visible, even if it is not of a type normally focusable.
//REVISE: there should be one handler for all attr events on the page.
if(document.addEventListener){
	document.addEventListener('DOMNodeInsertedIntoDocument', function(evt){ //DOMNodeInserted? DOMNodeInsertedIntoDocument
		if(evt.target.nodeType == 1 && evt.target.hasAttribute('autofocus')){
			$wf2.initAutofocusElement(evt.target);
		}
		//[[UAs may ignore this attribute if the user has indicated (for example, by starting to type in a
		//    form control) that he does not wish focus to be changed.]]
	}, false);

	//NOT CURRENTLY IMPLEMENTABLE:
	//  Setting the DOM attribute to true must set the content attribute to the value autofocus.
	//  Setting the DOM attribute to false must remove the content attribute.

	document.addEventListener('DOMAttrModified', function(evt){
		//The autofocus DOM attribute must return true when the content attribute is present (regardless
		//   of its value, even if it is the empty string), and false when it is absent.
		if(evt.attrName == 'autofocus'){
			if(evt.attrChange == evt.ADDITION)
				//evt.relatedNode.autofocus = true;
				$wf2.initAutofocusElement(evt.target);
			else if(evt.attrChange == evt.REMOVAL)
				evt.target.autofocus = false;
		}
	}, false);
}

(function(){
//Get the path to the library base directory
var match;
//For some reason, if not using documentElement, scriptaculous fails to load if reference to
//   webforms2 script placed beforehand in Firefox
var scripts = document.documentElement.getElementsByTagName('script'); 
for(var i = 0; i < scripts.length; i++){
	if(match = scripts[i].src.match(/^(.*)webforms2[^\/]+$/))
		$wf2.libpath = match[1];
}

EventHelpers.addPageLoadEvent('$wf2.onDOMContentLoaded', true)

})();
} //End If(!document.implementation...



} //end if(!window.$wf2)



//if(!window.ValidityState){
	//var ValidityState = {
	//	
	//};
	
	
	//if(HTMLElement.prototype)
	
	//ValidityState interface
	
	//node.validity = {
	//	typeMismatch    : false,
	//	rangeUnderflow  : false,
	//	rangeOverflow   : false,
	//	stepMismatch    : false,
	//	tooLong         : false,
	//	patternMismatch : false,
	//	valueMissing    : false,
	//	customError     : false,
	//	valid           : true
	//};
	
//}

//if(!window.HTMLOutputElement){ 
	
//}
