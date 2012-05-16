/*
        Unobtrusive Slider Control by frequency decoder v2.6 (http://www.frequency-decoder.com/)

        Released under a creative commons Attribution-Share Alike 3.0 Unported license (http://creativecommons.org/licenses/by-sa/3.0/)

        You are free:

        * to copy, distribute, display, and perform the work
        * to make derivative works
        * to make commercial use of the work

        Under the following conditions:

                by Attribution.
                --------------
                You must attribute the work in the manner specified by the author or licensor.

                sa
                --
                Share Alike. If you alter, transform, or build upon this work, you may distribute the resulting work only under a license identical to this one.

        * For any reuse or distribution, you must make clear to others the license terms of this work.
        * Any of these conditions can be waived if you get permission from the copyright holder.
*/

var fdSliderController = (function() {
        var sliders           = {},
            uniqueid          = 0,
            mouseWheelEnabled = true;
                
        var removeMouseWheelSupport = function() {
                mouseWheelEnabled = false;
        };                       
        var addEvent = function(obj, type, fn) {
                if( obj.attachEvent ) {
                        obj["e"+type+fn] = fn;
                        obj[type+fn] = function(){obj["e"+type+fn]( window.event );};
                        obj.attachEvent( "on"+type, obj[type+fn] );
                } else { obj.addEventListener( type, fn, true ); }
        };
        var removeEvent = function(obj, type, fn) {
                if( obj.detachEvent ) {
                        try {
                                obj.detachEvent( "on"+type, obj[type+fn] );
                                obj[type+fn] = null;
                        } catch(err) { };
                } else { obj.removeEventListener( type, fn, true ); }
        };
        var stopEvent = function(e) {
                if(e == null) e = document.parentWindow.event;
                if(e.stopPropagation) {
                        e.stopPropagation();
                        e.preventDefault();
                };
                
                /*@cc_on@*/
                /*@if(@_win32)
                e.cancelBubble = true;
                e.returnValue = false;
                /*@end@*/
                
                return false;
        };                                           
        var joinNodeLists = function() {
                if(!arguments.length) { return []; };
                var nodeList = [];
                for (var i = 0; i < arguments.length; i++) {
                        for (var j = 0, item; item = arguments[i][j]; j++) { nodeList[nodeList.length] = item; };
                };
                return nodeList;
        };

        // Function by Artem B. with a minor change by f.d.
        var parseCallbacks = function(cbs) {
                if(cbs == null) { return {}; };
                var func,
                    type,
                    cbObj = {},
                    parts,
                    obj;
                for(var i = 0, fn; fn = cbs[i]; i++) {
                        type = fn.match(/(fd_slider_cb_(update|create|destroy|redraw|move|focus|blur|enable|disable)_)([^\s|$]+)/i)[1];
                        fn   = fn.replace(new RegExp("^"+type), "").replace(/-/g, ".");
                        type = type.replace(/^fd_slider_cb_/i, "").replace(/_$/, "");

                        try {
                                if(fn.indexOf(".") != -1) {
                                        parts = fn.split('.');
                                        obj   = window;
                                        for (var x = 0, part; part = obj[parts[x]]; x++) {
                                                if(part instanceof Function) {
                                                        (function() {
                                                                var method = part;
                                                                func = function (data) { method.apply(obj, [data]) };
                                                        })();
                                                } else {
                                                obj = part;
                                                };
                                        };
                                } else {
                                        func = window[fn];
                                };
                            
                                if(!(func instanceof Function)) continue;
                                if(!(type in cbObj)) { cbObj[type] = []; };
                                cbObj[type][cbObj[type].length] = func;
                        } catch (err) {};
                };
                return cbObj;
        };
                
        var parseClassNames = function(cbs) {
                if(cbs == null) { return ""; };
                var cns = [];                    
                for(var i = 0, cn; cn = cbs[i]; i++) { 
                        cns[cns.length] = cn.replace(/^fd_slider_cn_/, "");                                                                 
                };                 
                return cns.join(" ");
        };
        var createSlider = function(options) {
                if(!options || !options.inp || !options.inp.id) { return false; };
                destroySingleSlider(options.inp.id);
                sliders[options.inp.id] = new fdSlider(options);
                return true;
        };                
        var init = function( elem ) {
                var ranges     = /fd_range_([-]{0,1}[0-9]+(d[0-9]+){0,1}){1}_([-]{0,1}[0-9]+(d[0-9]+){0,1}){1}/i,
                    increment  = /fd_inc_([-]{0,1}[0-9]+(d[0-9]+){0,1}){1}/,
                    kIncrement = /fd_maxinc_([-]{0,1}[0-9]+(d[0-9]+){0,1}){1}/,
                    callbacks  = /((fd_slider_cb_(update|create|destroy|redraw|move|focus|blur|enable|disable)_)([^\s|$]+))/ig, 
                    classnames = /(fd_slider_cn_([a-zA-Z0-9_\-]+))/ig,
                    inputs     = elem && elem.tagName && elem.tagName.search(/input|select/i) != -1 ? [elem] : joinNodeLists(document.getElementsByTagName('input'), document.getElementsByTagName('select')),
                    range, 
                    tmp, 
                    options;

                for(var i = 0, inp; inp = inputs[i]; i++) {
                        if((inp.tagName.toLowerCase() == "input" && inp.type == "text" && (inp.className.search(ranges) != -1 || inp.className.search(/fd_slider/) != -1)) || (inp.tagName.toLowerCase() == "select" && inp.className.search(/fd_slider/) != -1)) {
                                // If we haven't been passed a specific id and the slider exists then continue
                                if(!elem && inp.id && document.getElementById("fd-slider-"+inp.id)) { continue; };
                                        
                                // Create an id if necessary
                                if(!inp.id) { inp.id == "sldr" + uniqueid++; };                       
                                        
                                options = {
                                        inp:            inp,
                                        inc:            inp.className.search(increment)  != -1 ? inp.className.match(increment)[0].replace("fd_inc_", "").replace("d",".") : "1",
                                        maxInc:         inp.className.search(kIncrement) != -1 ? inp.className.match(kIncrement)[0].replace("fd_maxinc_", "").replace("d",".") : false,
                                        range:          [0,100],
                                        callbacks:      parseCallbacks(inp.className.match(callbacks)),
                                        classNames:     parseClassNames(inp.className.match(classnames)),
                                        tween:          inp.className.search(/fd_tween/i) != -1,
                                        vertical:       inp.className.search(/fd_vertical/i) != -1,
                                        hideInput:      inp.className.search(/fd_hide_input/i) != -1,
                                        clickJump:      inp.className.search(/fd_jump/i) != -1,
                                        fullARIA:       inp.className.search(/fd_full_aria/i) != -1,
                                        noMouseWheel:   inp.className.search(/fd_disable_mousewheel/i) != -1
                                };
                                        
                                if(inp.tagName.toLowerCase() == "select") {
                                        options.range = [0, inp.options.length - 1];                                                
                                } else if(inp.className.search(ranges) != -1) {                                                
                                        range = inp.className.match(ranges)[0].replace("fd_range_", "").replace(/d/g,".").split("_");                                                 
                                        options.range = [range[0], range[1]];                                                                                                  
                                };                                       
                                        
                                createSlider(options);                                        
                        };
                };
                
                return true;
        };
        var destroySingleSlider = function(id) {
                if(id in sliders) { 
                        sliders[id].destroy(); 
                        delete sliders[id]; 
                        return true;
                };
                return false;
        };
        var destroyAllsliders = function(e) {
                for(slider in sliders) { sliders[slider].destroy(); };                        
        };
        var unload = function(e) {
                destroyAllsliders();
                sliders = null;                         
                removeEvent(window, "unload", unload);
                removeEvent(window, "resize", resize);
                removeOnloadEvent();
        };                  
        var resize = function(e) {
                for(slider in sliders) { sliders[slider].onResize(); };        
        };                 
        var removeOnloadEvent = function() {
                removeEvent(window, "load", init);
                /*@cc_on@*/
                /*@if(@_win32)
                removeEvent(window, "load",   function() { setTimeout(onload, 200) });
                /*@end@*/
        };              
        function fdSlider(options) {
        	
                var inp         = options.inp,
                    disabled    = false,
                    tagName     = inp.tagName.toLowerCase(),                      
                    min         = +options.range[0],
                    max         = +options.range[1], 
                    range       = Math.abs(max - min),
                    inc         = tagName == "select" ? 1 : +options.inc||1,
                    maxInc      = options.maxInc && options.maxInc != 'undefined' ? options.maxInc : inc * 2;
                   // alert(options.maxInc + "," + maxInc) 
                    
                    var precision   = options.inc.search(".") != -1 ? options.inc.substr(options.inc.indexOf(".")+1, options.inc.length - 1).length : 0,
                    steps       = Math.ceil(range / inc),
                    useTween    = !!options.tween,
                    fullARIA    = !!options.fullARIA,
                    hideInput   = !!options.hideInput,                                                 
                    clickJump   = useTween ? false : !!options.clickJump,                                        
                    vertical    = !!options.vertical,
                    callbacks   = options.callbacks,
                    classNames  = options.classNames,
                    noMWheel    = !!options.noMouseWheel,                    
                    timer       = null,
                    kbEnabled   = true,                    
                    sliderH     = 0,
                    sliderW     = 0, 
                    tweenX      = 0,
                    tweenB      = 0,
                    tweenC      = 0,
                    tweenD      = 0,
                    frame       = 0,
                    x           = 0,                    
                    y           = 0,                    
                    maxPx       = 0,
                    handlePos   = 0,                    
                    destPos     = 0,                    
                    mousePos    = 0,
                    deltaPx     = 0, 
                    stepPx      = 0,
                    self        = this,
                    changeList  = {},
                    initVal     = null,
                    outerWrapper,
                    wrapper,
                    handle,
                    bar;                                 
                  
                if(max < min) {
                        inc    = -inc;
                        maxInc = -maxInc;
                };
                
                function disableSlider(noCallback) {                         
                        if(disabled && !noCallback) { return; };
                        
                        try {     
                                removeEvent(outerWrapper, "mouseover", onMouseOver);
                                removeEvent(outerWrapper, "mouseout",  onMouseOut);
                                removeEvent(outerWrapper, "mousedown", onMouseDown);
                                removeEvent(handle, "focus",     onFocus);
                                removeEvent(handle, "blur",      onBlur);                        
                                if(!window.opera) {
                                        removeEvent(handle, "keydown",   onKeyDown);  
                                        removeEvent(handle, "keypress",  onKeyPress); 
                                } else {
                                        removeEvent(handle, "keypress",  onKeyDown);
                                };                                             
                                removeEvent(handle, "mousedown", onHandleMouseDown);
                                removeEvent(handle, "mouseup",   onHandleMouseUp);

                                if(mouseWheelEnabled && !noMWheel) {
                                        if (window.addEventListener && !window.devicePixelRatio) window.removeEventListener('DOMMouseScroll', trackMouseWheel, false);
                                        else {
                                                removeEvent(document, "mousewheel", trackMouseWheel);
                                                removeEvent(window,   "mousewheel", trackMouseWheel);
                                        };
                                };
                        } catch(err) {};
                        
                        clearTimeout(timer);
                        outerWrapper.className = outerWrapper.className.replace("slider-disabled", "") + " slider-disabled";
                        outerWrapper.setAttribute("aria-disabled", true);                        
                        inp.disabled = disabled = true;
                        
                        if(!noCallback) {
                                callback("disable");
                        };                        
                };
                
                function enableSlider(noCallback) {                         
                        if(!disabled && !noCallback) return;
                        addEvent(outerWrapper, "mouseover", onMouseOver);
                        addEvent(outerWrapper, "mouseout",  onMouseOut);
                        addEvent(outerWrapper, "mousedown", onMouseDown);                        
                        if(!window.opera) {
                                addEvent(handle, "keydown",   onKeyDown);  
                                addEvent(handle, "keypress",  onKeyPress); 
                        } else {
                                addEvent(handle, "keypress",  onKeyDown);
                        };
                        addEvent(handle, "focus",     onFocus);
                        addEvent(handle, "blur",      onBlur);                       
                        addEvent(handle, "mousedown", onHandleMouseDown);
                        addEvent(handle, "mouseup",   onHandleMouseUp); 
                        
                        outerWrapper.className = outerWrapper.className.replace("slider-disabled", "");
                        outerWrapper.setAttribute("aria-disabled", false);                         
                        inp.disabled = disabled = false;
                        
                        if(!noCallback) {
                                callback("enable");
                        };
                };
                 
                function destroySlider() {
                        try {                                         
                                disableSlider();                                
                                outerWrapper.parentNode.removeChild(outerWrapper);
                        } catch(err) {};
                        
                        wrapper = bar = handle = outerWrapper = timer = null;
                        callback("destroy");
                        callbacks = null;
                };
                
                function redraw() {
                        locate();
                        // Internet Explorer requires the try catch
                        try {
                                var sW = outerWrapper.offsetWidth,
                                    sH = outerWrapper.offsetHeight,
                                    hW = handle.offsetWidth,
                                    hH = handle.offsetHeight,
                                    bH = bar.offsetHeight,
                                    bW = bar.offsetWidth; 
                                
                                maxPx     = vertical ? sH - hH : sW - hW;
                                stepPx    = maxPx / steps;                                                 
                                deltaPx   = maxPx / Math.ceil(range / maxInc);
                               
                                
                                sliderW = sW;
                                sliderH = sH;
                                
                                valueToPixels();
                        } catch(err) { };
                        callback("redraw");
                };
                
                function callback(type) {                         
                        var cbObj = {"elem":inp, "value":tagName == "select" ? inp.options[inp.selectedIndex].value : inp.value};
                        if(type in callbacks) {
                                for(var i = 0, func; func = callbacks[type][i]; i++) {
                                        func(cbObj);
                                };
                        }; 
                };

                function onFocus(e) {
                        outerWrapper.className = outerWrapper.className.replace('focused','') + ' focused';
                        if(mouseWheelEnabled && !noMWheel) {
                                addEvent(window, 'DOMMouseScroll', trackMouseWheel);
                                addEvent(document, 'mousewheel', trackMouseWheel);
                                if(!window.opera) addEvent(window,   'mousewheel', trackMouseWheel); 
                        }; 
                        callback("focus");                      
                };
                
                function onBlur(e) {
                        outerWrapper.className = outerWrapper.className.replace(/focused|fd-fc-slider-hover|fd-slider-hover/g,'');
                        if(mouseWheelEnabled && !noMWheel) {
                                removeEvent(document, 'mousewheel', trackMouseWheel);
                                removeEvent(window, 'DOMMouseScroll', trackMouseWheel);
                                if(!window.opera) removeEvent(window,   'mousewheel', trackMouseWheel);
                        };
                        callback("blur");
                };
                
                function trackMouseWheel(e) {
                        if(!kbEnabled) return;
                        e = e || window.event;
                        var delta = 0;
                            
                        if (e.wheelDelta) {
                                delta = e.wheelDelta/120;
                                if (window.opera && window.opera.version() < 9.2) delta = -delta;
                        } else if(e.detail) {
                                delta = -e.detail/3;
                        };
                        
                        if(vertical) { delta = -delta; };
                        
                        if(delta) {
                                var xtmp = vertical ? handle.offsetTop : handle.offsetLeft;
                                xtmp = (delta < 0) ? Math.ceil(xtmp + deltaPx) : Math.floor(xtmp - deltaPx);                                
                                pixelsToValue(Math.min(Math.max(xtmp, 0), maxPx));
                        }
                        return stopEvent(e);
                };                  
                
                function onKeyPress(e) {                        
                        e = e || document.parentWindow.event;                         
                        if ((e.keyCode >= 33 && e.keyCode <= 40) || !kbEnabled || e.keyCode == 45 || e.keyCode == 46) {                                 
                                return stopEvent(e);
                        };
                        return true;
                };               
                        
                function onKeyDown(e) {
                        if(!kbEnabled) return true;

                        e = e || document.parentWindow.event;
                        var kc = e.keyCode != null ? e.keyCode : e.charCode;
                        
                        if ( kc < 33 || (kc > 40 && (kc != 45 && kc != 46))) return true;

                        var value = tagName == "input" ? parseFloat(inp.value) : inp.selectedIndex;
                        if(isNaN(value) || value < Math.min(min,max)) value = Math.min(min,max);    
                        
                        if( kc == 37 || kc == 40 || kc == 46 || kc == 34) {
                                // left, down, ins, page down                                                              
                                value -= (e.ctrlKey || kc == 34 ? maxInc : inc)
                        } else if( kc == 39 || kc == 38 || kc == 45 || kc == 33) {
                                // right, up, del, page up                                                                  
                                value += (e.ctrlKey || kc == 33 ? maxInc : inc)
                        } else if( kc == 35 ) {
                                // max                                
                                value = max;
                        } else if( kc == 36 ) {
                                // min                                
                                value = min;
                        };  
                        
                        valueToPixels(value);
                        callback("update");
                        
                        // Opera doesn't let us cancel key events so the up/down arrows and home/end buttons will scroll the screen - which sucks
                        return stopEvent(e);
                };                                     
                               
                function onMouseOver( e ) {
                        /*@cc_on@*/
                        /*@if(@_jscript_version <= 5.6)
                        if(this.className.search(/focused/) != -1) {
                                this.className = this.className.replace("fd-fc-slider-hover", "") +' fd-fc-slider-hover';
                                return;
                        }
                        /*@end@*/
                        this.className = this.className.replace(/fd\-slider\-hover/g,"") +' fd-slider-hover';
                };  
                              
                function onMouseOut( e ) {
                        /*@cc_on@*/
                        /*@if(@_jscript_version <= 5.6)
                        if(this.className.search(/focused/) != -1) {
                                this.className = this.className.replace("fd-fc-slider-hover", "");
                                return;
                        }
                        /*@end@*/
                        this.className = this.className.replace(/fd\-slider\-hover/g,"");
                };
                
                function onHandleMouseUp(e) {
                        e = e || window.event;
                        removeEvent(document, 'mousemove', trackMouse);
                        removeEvent(document, 'mouseup',   onHandleMouseUp);
                        
                        kbEnabled = true;

                        // Opera fires the blur event when the mouseup event occurs on a button, so we attept to force a focus
                        if(window.opera) try { setTimeout(function() { onfocus(); }, 0); } catch(err) {};
                        document.body.className = document.body.className.replace(/slider-drag-vertical|slider-drag-horizontal/g, "");
                              
                        return stopEvent(e);
                };
                
                function onHandleMouseDown(e) {
                        e = e || window.event;
                        mousePos  = vertical ? e.clientY : e.clientX;
                        handlePos = parseInt(vertical ? handle.offsetTop : handle.offsetLeft)||0;                        
                        kbEnabled = false;
                        
                        clearTimeout(timer);
                        timer = null;
                                
                        addEvent(document, 'mousemove', trackMouse);
                        addEvent(document, 'mouseup', onHandleMouseUp);
                                
                        // Force a "focus" on the button on mouse events
                        if(window.devicePixelRatio || (document.all && !window.opera)) try { setTimeout(function() { handle.focus(); }, 0); } catch(err) {};
                        
                        document.body.className += " slider-drag-" + (vertical ? "vertical" : "horizontal");
                };
                
                function onMouseUp( e ) {
                        e = e || window.event;
                        removeEvent(document, 'mouseup', onMouseUp);
                        if(!useTween) {
                                clearTimeout(timer);
                                timer = null;
                                kbEnabled = true;
                        };                        
                        return stopEvent(e);
                };
                
                function trackMouse( e ) {                                                  
                        e = e || window.event;                        
                        pixelsToValue(snapToNearestValue(handlePos + (vertical ? e.clientY - mousePos : e.clientX - mousePos)));                                          
                };
                
                function onMouseDown( e ) {
                        e = e || window.event;
                        var targ;                          
                        if (e.target) targ = e.target;
                        else if (e.srcElement) targ = e.srcElement;
                        if (targ.nodeType == 3) targ = targ.parentNode;

                        if(targ.className.search("fd-slider-handle") != -1) { return true; };
                                
                        try { setTimeout(function() { handle.focus(); }, 0); } catch(err) { };                                               
                        
                        clearTimeout(timer);
                        locate();
                        
                        timer     = null;
                        kbEnabled = false;                           
                        
                        var posx        = 0,
                            sLft        = 0,
                            sTop        = 0;

                        // Internet Explorer doctype woes
                        if (document.documentElement && document.documentElement.scrollTop) {
                                sTop = document.documentElement.scrollTop;
                                sLft = document.documentElement.scrollLeft;
                        } else if (document.body) {
                                sTop = document.body.scrollTop;
                                sLft = document.body.scrollLeft;
                        };

                        if (e.pageX)            posx = vertical ? e.pageY : e.pageX;
                        else if (e.clientX)     posx = vertical ? e.clientY + sTop : e.clientX + sLft;
                        posx -= vertical ? y + Math.round(handle.offsetHeight / 2) : x + Math.round(handle.offsetWidth / 2);                         
                        posx = snapToNearestValue(posx);                         
                        
                        if(useTween) {
                                tweenTo(posx);
                        } else if(clickJump) {
                                pixelsToValue(posx);
                        } else {
                                addEvent(document, 'mouseup', onMouseUp);
                                destPos = posx;
                                onTimer();
                        };                    
                };

                function incrementHandle(numOfSteps) { 
                        var value = tagName == "input" ? parseFloat(inp.value) : inp.selectedIndex;
                        if(isNaN(value) || value < Math.min(min,max)) value = Math.min(min,max);  
                        value += inc * numOfSteps;
                        valueToPixels(value);                                               
                };
                
                function snapToNearestValue(px) {
                        var rem = px % stepPx;
                        if(rem && rem >= (stepPx / 2)) { px += (stepPx - rem); } 
                        else { px -= rem;  };                        
                        return Math.min(Math.max(parseInt(px, 10), 0), maxPx);        
                };                 
                
                function locate(){
                        var curleft = 0,
                            curtop  = 0,
                            obj     = outerWrapper;
                            
                        // Try catch for IE's benefit
                        try {
                                while (obj.offsetParent) {
                                        curleft += obj.offsetLeft;
                                        curtop  += obj.offsetTop;
                                        obj      = obj.offsetParent;
                                };
                        } catch(err) {};
                        x = curleft;
                        y = curtop;
                };
                
                function onTimer() {
                        var xtmp = vertical ? handle.offsetTop : handle.offsetLeft;
                        xtmp = Math.round((destPos < xtmp) ? Math.max(destPos, Math.floor(xtmp - deltaPx)) : Math.min(destPos, Math.ceil(xtmp + deltaPx)));                  
                        pixelsToValue(xtmp);
                        if(xtmp != destPos) timer = setTimeout(onTimer, steps > 20 ? 50 : 100);
                        else kbEnabled = true;
                };

                var tween = function(){
                        frame++;
                        var c = tweenC,
                            d = 20,
                            t = frame,
                            b = tweenB,
                            x = Math.ceil((t==d) ? b+c : c * (-Math.pow(2, -10 * t/d) + 1) + b);

                        pixelsToValue(t == d ? tweenX : x);
                        callback("move");
                        if(t!=d) timer = setTimeout(tween, 20);
                        else {
                                clearTimeout(timer);
                                timer     = null;
                                kbEnabled = true;
                        };
                };

                function tweenTo(tx){
                        kbEnabled = false;
                        tweenX = parseInt(tx, 10);
                        tweenB = parseInt(vertical ? handle.style.top : handle.style.left, 10);
                        tweenC = tweenX - tweenB;
                        tweenD = 20;
                        frame  = 0;
                        if(!timer) timer = setTimeout(tween, 20);
                };
                
                function pixelsToValue(px) {                       
						//jslog.debug(DebugHelpers.getStackTrace())
                        handle.style[vertical ? "top" : "left"] = px + "px";                                                                                                                              
                        var val = min + (Math.round(px / stepPx) * inc);                                                                                                                                                      
                        setInputValue((tagName == "select" || inc == 1) ? Math.round(val) : val);                         
                };
                
                function valueToPixels(val) {
                        var value = isNaN(val) ? tagName == "input" ? parseFloat(inp.value) : inp.selectedIndex : val;
                        if(isNaN(value) || value < Math.min(min,max)) value = Math.min(min,max);
                        else if(value > Math.max(min,max)) value = Math.max(min,max);                         
                        setInputValue(value);                                                                    
                        handle.style[vertical ? "top" : "left"] = Math.round(((value - min) / inc) * stepPx) + "px";                                                                                                                                 
                };

                function setInputValue(val) {                                             
                        val = isNaN(val) ? min : val; 
                        if(tagName == "select") {
                                try {                                               
                                        val = parseInt(val, 10);
                                        if(inp.selectedIndex == val) return;
                                        inp.options[val].selected = true;                                                                             
                                } catch (err) {};
                        } else {                                                                                                                                                                                                                                                                               
                                val = (min + (Math.round((val - min) / inc) * inc)).toFixed(precision);    
                                if(inp.value == val) return;
                                inp.value = val;                                 
                        };
                        updateAriaValues();                        
                        callback("update");
                };
                
                function findLabel() {
                        var label;
                        if(inp.parentNode && inp.parentNode.tagName.toLowerCase() == "label") label = inp.parentNode;
                        else {
                                var labelList = document.getElementsByTagName('label');
                                // loop through label array attempting to match each 'for' attribute to the id of the current element
                                for(var i = 0, lbl; lbl = labelList[i]; i++) {
                                        // Internet Explorer requires the htmlFor test
                                        if((lbl['htmlFor'] && lbl['htmlFor'] == inp.id) || (lbl.getAttribute('for') == inp.id)) {
                                                label = lbl;
                                                break;
                                        };
                                };
                        };
                        if(label && !label.id) { label.id = inp.id + "_label"; };
                        return label;
                };
                
                function updateAriaValues() {
                        handle.setAttribute("aria-valuenow",  tagName == "select" ? inp.options[inp.selectedIndex].value : inp.value);
                        handle.setAttribute("aria-valuetext", tagName == "select" ? inp.options[inp.selectedIndex].text  : inp.value);
                };
                
                function onChange( e ) {
                        valueToPixels();
                        callback("update"); 
                        return true;
                };                  
                
                (function() { 
                        if(hideInput) { inp.className += " fd_hide_slider_input"; }
                        else { addEvent(inp, 'change', onChange); };
                        
                        outerWrapper              = document.createElement('div');
                        outerWrapper.className    = "fd-slider" + (vertical ? "-vertical " : " ") + classNames;
                        outerWrapper.id           = "fd-slider-" + inp.id;

                        wrapper                   = document.createElement('span');
                        wrapper.className         = "fd-slider-inner";

                        bar                       = document.createElement('span');
                        bar.className             = "fd-slider-bar";

                        if(fullARIA) {
                                handle            = document.createElement('span');
                                handle.setAttribute(!/*@cc_on!@*/false ? "tabIndex" : "tabindex", "0");
                        } else {
                                handle            = document.createElement('button');                                 
                                handle.setAttribute("type", "button");
                        };
                        
                        handle.className          = "fd-slider-handle";                        
                        handle.appendChild(document.createTextNode(String.fromCharCode(160)));                         
                        
                        outerWrapper.appendChild(wrapper);
                        outerWrapper.appendChild(bar);
                        outerWrapper.appendChild(handle);
                        
                        inp.parentNode.insertBefore(outerWrapper, inp);

                        /*@cc_on@*/
                        /*@if(@_win32)
                        handle.unselectable       = "on";
                        bar.unselectable          = "on";
                        wrapper.unselectable      = "on";
                        outerWrapper.unselectable = "on";
                        /*@end@*/                             
                        
                        // Add ARIA accessibility info programmatically                         
                        handle.setAttribute("role",           "slider");
                        handle.setAttribute("aria-valuemin",  min);
                        handle.setAttribute("aria-valuemax",  max);                     
                        
                        var lbl = findLabel();
                        if(lbl) {                                 
                                handle.setAttribute("aria-labelledby", lbl.id);
                                handle.id = "fd-slider-handle-" + inp.id;
                                /*@cc_on
                                /*@if(@_win32)
                                lbl.setAttribute("htmlFor", handle.id);
                                @else @*/
                                lbl.setAttribute("for", handle.id);
                                /*@end
                                @*/
                        };
                        
                        // Are there page instructions - the creation of the instructions has been left up to you fine reader...
                        if(document.getElementById("fd_slider_describedby")) {                                  
                                handle.setAttribute("aria-describedby", "fd_slider_describedby");  // aaa:describedby
                        };                                               
                        
                        if(inp.getAttribute("disabled") == true) {                         
                                disableSlider(true);
                        } else {                                  
                                enableSlider(true);
                        };
                                                       
                        updateAriaValues();                        
                        callback("create");                            
                        redraw();                                                                                  
                })();
               
                return {
                        onResize:       function(e) { if(outerWrapper.offsetHeight != sliderH || outerWrapper.offsetWidth != sliderW) { redraw(); }; },
                        destroy:        function()  { destroySlider(); },
                        reset:          function()  { valueToPixels(); },
                        increment:      function(n) { incrementHandle(n); },
                        disable:        function()  { disableSlider(); },
                        enable:         function()  { enableSlider(); }
                };
        }; 
           
        addEvent(window, "load",   init);
        addEvent(window, "unload", unload);
        addEvent(window, "resize", resize);
        /*@cc_on@*/
        /*@if(@_win32)
        var onload = function(e) {
                for(slider in sliders) { sliders[slider].reset(); }
        };                   
        addEvent(window, "load", function() { setTimeout(onload, 200) });
        /*@end@*/
                
        return {                          
                        create:                 function(elem) { init(elem) },    
                        createSlider:           function(opts) { createSlider(opts); },                    
                        destroyAll:             function() { destroyAllsliders(); },
                        destroySlider:          function(id) { return destroySingleSlider(id); },
                        redrawAll:              function() { resize(); },
                        increment:              function(id, numSteps) { if(!(id in sliders)) { return false; }; sliders[id].increment(numSteps); },
                        addEvent:               addEvent,
                        removeEvent:            removeEvent,
                        stopEvent:              stopEvent,
                        updateSlider:           function(id) { if(!(id in sliders)) { return false; }; sliders[id].reset(); },
                        disableMouseWheel:      function() { removeMouseWheelSupport(); },
                        removeOnLoadEvent:      function() { removeOnloadEvent(); },
                        disableSlider:          function(id) { if(!(id in sliders)) { return false; }; sliders[id].disable(); }, 
                        enableSlider:           function(id) { if(!(id in sliders)) { return false; }; sliders[id].enable(); }                      
        }
})();             
                       
     