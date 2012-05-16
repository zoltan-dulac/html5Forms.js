var autocomplete = new function () { 
	var me = this;

	var inputNodes;
	var listContainerNode;
	var bodyNode;
	var minLength;
	var req;
	var currentLookupString = "";
	var currentFocusedInputNode = null;
	var numberCurrentValues;
	
	var lastLookupString ="", lastLookupValues;

	me.values = null;
	me.x = -1;
	me.y = -1;
	
	me.init = function () {
		
		if (EventHelpers.hasPageLoadHappened(arguments)) return;
		
		bodyNode = document.getElementsByTagName('body')[0];
		minLength = config.getIntegerValue('autocomplete.values.minLength', 0);
		createListContainerNode();
		setInitialEvents();
	}
	
	function createListContainerNode () {
		
			
		listContainerNode = document.createElement('div');
		
		listContainerNode.style.display = 'none';
		listContainerNode.style.position= 'absolute';
		listContainerNode.id = 'autocomplete-selection'
		

		bodyNode.appendChild(listContainerNode);
		
	}
	
	function setInitialEvents () {
		inputNodes = CSSHelpers.getElementsByClassName(document, 
			'autocomplete_input');
			
		for (var i=0; i<inputNodes.length; i++) {
			
			EventHelpers.addEvent(inputNodes[i], 'keyup', keyUpEvent);
			EventHelpers.addEvent(inputNodes[i], 'keypress', keyPressEvent);
			formNode = DOMHelpers.getAncestorByTagName(inputNodes[i], 'form');
			turnOffNativeAutocomplete(formNode);
		}
		
		EventHelpers.addEvent(bodyNode, 'click', hideAutocompleteBox);
		EventHelpers.addEvent(document, 'click', hideAutocompleteBox)
	}
	
	function keyUpEvent(e) {
		var key = EventHelpers.getKey(e);
		currentFocusedInputNode = EventHelpers.getEventTarget(e);
		 switch (key) {
			case CharCode.DOWN:
				moveFocusOnListEvent(e);
				break;
			case CharCode.ESC:
				break;
			case CharCode.ENTER:
				EventHelpers.preventDefault(e);
				break;
			default: 
				getListEvent(e);
		} 
		
		//getListEvent(e);
	}
	
	function keyPressEvent(e) {
		var key = EventHelpers.getKey(e);
		switch (key) {
			case CharCode.DOWN:
				moveFocusOnListEvent(e);
				EventHelpers.preventDefault(e);
				break;
			case CharCode.ENTER:
				EventHelpers.preventDefault(e);
				break;
		}
		
	}
	
	function moveFocusOnListEvent(e) {
		activeInputNode = EventHelpers.getEventTarget(e);
		
		activeInputNode.blur();
		
		var listNode = getListNode();
		
		
		// jslog.debug(listNode.nodeName)
		var listItemNodes = getListItemNodes();
		var firstListItemNode;
		
		
		
		
		if (listItemNodes.length > 0) {
			firstListItemNode = listItemNodes[0]
		} else  {
			firstListItemNode = listItemNodes;
		}
		
		jslog.debug('firstListItemNode: ' + firstListItemNode.nodeName)
		
		if (firstListItemNode) {
			
			switch (firstListItemNode.nodeName) {
				case "OPTION":
					
						//listNode.focus();
						//jslog.debug(DebugHelpers.getProperties(firstListItemNode));
						firstListItemNode.selected = 'selected';
						replaceValue(firstListItemNode);
						listNode.focus();
						
						
					
					break;
			}
			
			//firstListItemNode.focus();
		}
		
		
		
		
		
		//jslog.debug('listNode properties: ' + DebugHelpers.getProperties(listNode))	
		
	}
	
	
	
	function getListEvent(e) {
		activeInputNode = EventHelpers.getEventTarget(e);
		currentLookupString=activeInputNode.value;
		
		if (currentLookupString.length < minLength) {
			listContainerNode.innerHTML = "";
			return;
		}
		
		
		
		me.x = CSSHelpers.getAbsoluteLeft(activeInputNode);
		me.y = CSSHelpers.getAbsoluteTop(activeInputNode) 
			+ CSSHelpers.getHeight(activeInputNode);
		
		
		var id=activeInputNode.name.replace(/ /g, '_' );
		
		
		var URL = config.getScriptedValue('autocomplete.urls.' + id,
			{
				inputID:	id,
				inputValue:	currentLookupString
			});
			
		listContainerNode.innerHTML = config.getValue('autocomplete.templates.pleaseWait');
		showAutocompleteBox();
		
		
		/* 
		 * if this is not the old request with a few letters tacked on, 
		 * do an httpRequest to this.  Otherwise, do call setValues().
		 */
		
		if (lastLookupString != "" && currentLookupString.toLowerCase().indexOf(lastLookupString.toLowerCase()) == 0) {
			showDropDown(lastLookupValues);
		} else {
			if (req) {
				req.abort();
			}
			req = XMLHelpers.getXMLHttpRequest(URL, getListRequest);
			
		}
		
	
	}
	
	function getListRequest() {
		if (!req) {
			//DebugHelpers.log("XMLHttpRequest was null: exiting");
			return;
	    }
		


	    if (req.readyState == ReadyState.COMPLETED) {
	        // only if "OK"

	        if (req.status == HttpCode.OK) {
				var values = req.responseText.split('\n');
				showDropDown(values);
				lastLookupString=currentLookupString;
				lastLookupValues=values;
			}
		}
	}
	
	function showDropDown(values) {
				removeAutocompleteBoxEvents();
				me.setValues(values);
				jslog.debug(numberCurrentValues)
				if (numberCurrentValues == 0) {
					hideAutocompleteBox();
				} else {
					jslog.debug('not zeri')
					setAutocompleteBoxEvents();
					showAutocompleteBox();
				} 
	}
	
	me.setValues = function (values) {
		me.values = values;
		
		var lastElement = me.values.pop();
		
		if (lastElement.trim() != "") {
			me.values.push(lastElement)
		}
		
		
		if (me.values.length == 0) {
			listContainerNode.innerHTML = "";
		}
		else {
		
			var valuesHTMLSb = new StringBuffer();
			numberCurrentValues = 0;
			for (var i = 0; i < me.values.length; i++) {
				var value = me.values[i].trim();
				
				if (value != "" && value.toLowerCase().indexOf(currentLookupString.toLowerCase()) == 0 ) {
					numberCurrentValues++;
					valuesHTMLSb.append(config.getScriptedValue('autocomplete.templates.listItem', {
						listItem: me.values[i]
					}))
				}
			}
			
			listContainerNode.innerHTML = config.getScriptedValue('autocomplete.templates.list', {
				listItemsHTML: valuesHTMLSb.toString()
			});
		}
	}
	
	function selectKeyEvent (e) {
		var key = EventHelpers.getKey(e);
		
		
		switch(key){
			case CharCode.ESC:
			case CharCode.ENTER:
				hideAutocompleteBox(e);
				currentFocusedInputNode.focus();
				
				break;
			case CharCode.TAB:
				focusOnInputField(e);
				break;
			case CharCode.BACKSPACE:
				currentFocusedInputNode.value = "";
				hideAutocompleteBox(e);
				currentFocusedInputNode.focus();
				// prevents browser from going back a page.
				EventHelpers.preventDefault(e);
				break;
		}
	}
	
	function focusOnInputField(e) {
		currentFocusedInputNode.focus();
		if (BrowserDetect.browser == "Explorer") {
			EventHelpers.preventDefault(e);
		}
	}
	
	function showAutocompleteBox () {
		CSSHelpers.moveTo(listContainerNode, me.x, me.y)
		listContainerNode.style.display = 'block';	
	}
	
	function hideAutocompleteBox(e) {
		listContainerNode.style.display = 'none';
		removeAutocompleteBoxEvents();
		listContainerNode.innerHTML = '';
	}
	
	function getListItemNodes () {
		var valueNodes = cssQuery(
			config.getValue('autocomplete.selectors.listItem'),
			listContainerNode
		); 
		
		return valueNodes;
	}
	
	function getListNode () {
		var listNodes = cssQuery(
			config.getValue('autocomplete.selectors.list'),
			listContainerNode
		); 
		
		if (listNodes && listNodes.length > 0) {
			return listNodes[0];
		}
		else {
			return null;
		}
		
	}
	
	function setAutocompleteBoxEvents() {
		var valueNodes = getListItemNodes();
			
		var listNode = getListNode();
		
		if (listNode) {
			EventHelpers.addEvent(listNode, 'change', replaceValueEvent);
			EventHelpers.addEvent(listNode, 'blur', hideAutocompleteBox);
			EventHelpers.addEvent(listNode, 'keyup', selectKeyEvent);
			EventHelpers.addEvent(listNode, 'keydown', selectKeyEvent);
			EventHelpers.addEvent(listNode, 'blur', focusOnInputField);
		}
		
		if (valueNodes) {
			for (var i = 0; i < valueNodes.length; i++) {
				
				EventHelpers.addEvent(valueNodes[i], 'click', replaceValueEvent);	
				
			}
		}
	}
	
	function removeAutocompleteBoxEvents() {
		
		
		var valueNodes =  getListItemNodes();
		
		var listNode = getListNode();
		
		if (listNode) {
			EventHelpers.removeEvent(listNode, 'change', replaceValueEvent);
			EventHelpers.removeEvent(listNode, 'blur', hideAutocompleteBox);
		}
		
		if (valueNodes) {
			for (var i = 0; i < valueNodes.length; i++) {
				EventHelpers.removeEvent(valueNodes[i], 'click', replaceValueEvent);
				
			}
		}
	}
	
	function replaceValueEvent(e){
		var valueNode = EventHelpers.getEventTarget(e);
		replaceValue(valueNode)
	}
	 
	function replaceValue(valueNode) {	
		var value = valueNode.value;
		jslog.debug(valueNode.value);
		if (!value) {
			value = valueNode.innerHTML;
		} 
		
		activeInputNode.value = value;
		
	}
	
	function turnOffNativeAutocomplete(formNode) {
        formNode.setAttribute('autocomplete', 'off');
    }
}

EventHelpers.addPageLoadEvent('autocomplete.init'); 
