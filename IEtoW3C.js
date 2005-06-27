/*
**  IEtoW3C Script written by Jason Johnston (jj{at}lojjic[dot]net)
**
**  Including this file as the first script in your HTML document will make 
**  MSIE 5+ conform to most of the W3C DOM2 Events, Views, and Style modules.
**  For details see the documentation at:
**  http://lojjic.net/script-library/IEtoW3C-doc.html
**
**  The contents of this file are subject to the Mozilla Public License
**  Version 1.1; for more details see the documentation file.
*/


// Initialize everything locally within an anonymous function so we don't pollute the global scope.
(function() {

/*=== DOM2 Events: ===*/
if(!window.Event) {
	Event = {
		CAPTURING_PHASE : 1,
		AT_TARGET : 2,
		BUBBLING_PHASE : 3
	};
}

if(!window.EventException) {
	function EventException(code, message) {
		this.code = code;
		this.message = message;
	};
	EventException.UNSPECIFIED_EVENT_TYPE_ERR = 0;
	EventException.prototype = new Error;
}

if (!window.addEventListener && document.all /*(remove to enable partial (buggy) MacIE support:)*/ && window.attachEvent) {
	// A list of the natively handled events, which can appear as "onevent" attributes:
	// This is an incomplete list of native IE events, limited to the most common for
	// performance reasons. If you need to use other native events, add them here.
	var nativeEvents = {mouseover:1,mouseout:1,mousemove:1,mousedown:1,mouseup:1,click:1,change:1,focus:1,blur:1,load:1,unload:1,keypress:1,keyup:1,keydown:1};

	function grabEventAttributes(elt) { //make on* attributes into DOM event listeners:
		if(!elt.attachEvent) return; //HACK: don't do this on Mac, since we have to preserve the onclick property later to listen for events.
		if(elt.nodeType != 1) return; //elements only
		for(var evtName in nativeEvents) {
			var attr = (elt.getAttribute) ? elt.getAttribute("on"+evtName) : null;
			if(attr) {
				elt["IEtoW3C_on"+evtName] = elt["on"+evtName]; //use later to test if "return false" should preventDefault().
				elt.addEventListener(evtName,execAttrEvent,false);
				elt["on"+evtName] = null;
			}
		}
	};

	function execAttrEvent(evt) {
		var func = this["IEtoW3C_on"+evt.type].toString();
		var funcBody = func.substring(func.indexOf("{")+1, func.lastIndexOf("}"));
		funcBody = funcBody.replace(/([\W])this([\W])/,"$1event.currentTarget$2"); //fix "this" references
		funcBody = "(function(event) {" + funcBody + "})(evt);";
		var result = eval(funcBody);
		if(result == false) evt.preventDefault(); //"return false;" prevents default action
	};

	function stopPropagation() {
		this.IEtoW3C_canceled = true;
	};

	function preventDefault() {
		this.returnValue = false;
	};

	function handleEvent(elt,evt) {
		//fixup event object with DOM properties and methods:
		if(!evt) var evt = window.event;
		if(!evt.currentTarget) evt.currentTarget = elt;
		if(!evt.target) evt.target = evt.srcElement || elt;
		if(evt.bubbles == null) evt.bubbles = true;
		if(evt.cancelable == null) evt.cancelable = true;
		evt.stopPropagation = stopPropagation;
		evt.preventDefault = preventDefault;
		if(!evt.relatedTarget) evt.relatedTarget = evt.fromElement || evt.toElement || null;
		evt.pageX = evt.clientX + document.body.scrollLeft;
		evt.pageY = evt.clientY + document.body.scrollTop;
		evt.timeStamp = new Date().valueOf(); //this is arbitrary by the spec?
		if(String.fromCharCode(evt.keyCode).match(/[\w\d]/)) { //this is incomplete list of keyChars.
			evt.charCode = evt.keyCode; evt.keyCode = 0;
		} else evt.charCode = 0;
		evt.returnValue = true;
		evt.IEtoW3C_canceled = false;

		//make sure the event doesn't bubble to ancestors so it doesn't get handled more than once:
		evt.cancelBubble = true;

		//get all ancestors:
		var ancestors = [];
		var tmp = evt.target;
		while(tmp) {
			hookupDOMEventsOn(tmp);
			ancestors[ancestors.length] = tmp;
			tmp = tmp.parentNode;
		}
		//add document and window at top of tree:
		tmp = ancestors[ancestors.length-1];
		if(tmp === document.documentElement) tmp = ancestors[ancestors.length] = document;
		if(tmp === document) ancestors[ancestors.length] = window;

		//fire each handler in correct order, passing the event object as sole parameter:
		//capturing:
		evt.eventPhase = Event.CAPTURING_PHASE;
		for(var i=ancestors.length-1; (tmp = ancestors[i]) && (!evt.cancelable || !evt.IEtoW3C_canceled); i--) {
			if(i==0) evt.eventPhase = Event.AT_TARGET;
			evt.currentTarget = tmp;
			var hdlrs = tmp.IEtoW3C_onevent[evt.type];
			for(var j=0,h; hdlrs && (h=hdlrs.capture[j]); j++) h.invoke(evt);
		}
		//bubbling:
		for(var i=0; (tmp = ancestors[i]) && (!evt.cancelable || !evt.IEtoW3C_canceled); i++) {
			evt.currentTarget = tmp;
			var hdlrs = tmp.IEtoW3C_onevent[evt.type];
			for(var j=0, h; hdlrs && (h=hdlrs.bubble[j]); j++) h.invoke(evt);
			if(i==0) {
				if(!evt.bubbles) break;
				evt.eventPhase = Event.BUBBLING_PHASE;
			}
		}
		//restore keyCode so form fields will get keystroke
		if(evt.charCode > 0 && evt.keyCode == 0) evt.keyCode = evt.charCode;
	};

	function ListenerWrapper(elt, lst) {
		this.listener = lst;
		this.invoke = function(evt) {
			if(typeof lst == "function") {
				elt._lstnr = lst;
				elt._lstnr(evt);
				elt._lstnr = null;
			}
			else lst.handleEvent(evt);
		};
	};

	function addEventListener(type,listener,useCapture) {
		var onevent = this.IEtoW3C_onevent[type];
		if(!onevent) {
			onevent = this.IEtoW3C_onevent[type] = {capture:[],bubble:[]};
			//Set base listener to fire off custom event handling flow, but only for the "native"
			//events, since there's no use in having IE listen for events that will never be fired.
			//We cache a reference to the handler function so we can remove the listener during teardown
			if(type in nativeEvents) {
				var thisRef = this;
				if(!this.IEtoW3C_listen) this.IEtoW3C_listen = {/*evtType : handler*/};
				var lstn = this.IEtoW3C_listen[type] = function() { handleEvent(thisRef) };
				if(this.attachEvent) this.attachEvent("on"+type, lstn);
				else this["on"+evtType] = lstn; //IE Mac
			}
		}
		var wrapper = new ListenerWrapper(this, listener);
		this.removeEventListener(type,listener,useCapture); //avoid duplicates
		var list = (useCapture) ? onevent.capture : onevent.bubble;
		list[list.length] = wrapper;
	};

	function removeEventListener(type,listener,useCapture) {
		var onevent = this.IEtoW3C_onevent[type];
		if(!onevent) return;
		var list = (useCapture) ? onevent.capture : onevent.bubble;
		for(var i=0; i<list.length; i++) { //remove any instances of handler from list:
			if(list[i].listener === listener) {
				for(var j=i; j<list.length-1; j++) list[j] = list[j+1];
				list.length--;
			}
		}
	};

	function dispatchEvent(evt) {
		if(!evt.type) throw new EventException(EventException.UNSPECIFIED_EVENT_TYPE_ERR);
		evt.target = evt.currentTarget = this;
		handleEvent(this,evt);
	};

	function hookupDOMEventsOn(elt) {
		if(elt.IEtoW3C_onevent) return;
		elt.IEtoW3C_onevent = {};
		elt.addEventListener = addEventListener;
		elt.removeEventListener = removeEventListener;
		elt.dispatchEvent = dispatchEvent;
		grabEventAttributes(elt);
	};

	function unhookDOMEventsFrom(elt) {
		// detach all listeners attached in addEventListener above:
		if(elt.IEtoW3C_listen) {
			for(var i in elt.IEtoW3C_listen) {
				if(elt.detachEvent) elt.detachEvent("on"+i, elt.IEtoW3C_listen[i]);
				else elt["on"+i] = null;
			}
		}
		// remove cached "onevent" attributes:
		for(var evtName in nativeEvents) {
			elt["IEtoW3C_on"+evtName] = null;
		}
		// destroy all other added properties/methods:
		elt.IEtoW3C_listen = elt.IEtoW3C_onevent = elt.addEventListener = elt.removeEventListener = elt.dispatchEvent = null;
	};

	document.createEvent = function(evtFam) {
		var evt = {}; //new Event object
		if(evtFam=="UIEvents") {
			evt.initUIEvent = function(/*t,b,c,v,d*/) {
				var initArgs = ["type","bubbles","cancelable","view","detail"];
				for(var i=0,x; (x=initArgs[i]); i++) this[x]=arguments[i];
			};
		}
		else if(evtFam=="MouseEvents") {
			evt.initMouseEvent = function(/*t,b,c,v,d,sx,sy,cx,cy,ck,ak,sk,mk,b,r*/) {
				var initArgs = ["type","bubbles","cancelable","view","detail","screenX","screenY","clientX","clientY","ctrlKey","altKey","shiftKey","metaKey","button","relatedTarget"];
				for(var i=0,x; (x=initArgs[i]); i++) this[x]=arguments[i];
			};
		}
		else if(evtFam=="MutationEvents") {
			evt.initMutationEvent = function(/*t,b,c,r,p,n,an,ac*/) {
				var initArgs = ["type","bubbles","cancelable","relatedNode","prevValue","newValue","attrName","attrChange"];
				for(var i=0,x; (x=initArgs[i]); i++) this[x]=arguments[i];
			};
		}
		else evt.initEvent = function(type,bub,can) {
			this.type = type; this.bubbles = bub; this.cancelable = can;
		};
		return evt;
	};

	hookupDOMEventsOn(window);
	hookupDOMEventsOn(document);

	window.addEventListener("load",function() {
		var all = document.all;
		for(var i=0; i<all.length; i++) hookupDOMEventsOn(all[i]);
		
		//set dummy listeners for mouse events that natively fire on document but
		//not on window, so they will bubble up in our custom loop:
		var dummies = ["click","mouseover","mouseout","mousemove"];
		for(var i=0; i<dummies.length; i++) document.addEventListener(dummies[i],function(){},false);
	},false);

	window.addEventListener("unload",function() { //clean up:
		unhookDOMEventsFrom(window);
		unhookDOMEventsFrom(document);
		var all = document.all;
		for(var i=0; i<all.length; i++) unhookDOMEventsFrom(all[i]);
		document.createEvent = document.IEtoW3C_createElement = document.createElement = IEtoW3C = null;
	},false);

	//make it work for newly created elements:
	document.IEtoW3C_createElement = document.createElement;
	document.createElement = function(tagName) {
		var newElt = document.IEtoW3C_createElement(tagName);
		hookupDOMEventsOn(newElt);
		return newElt;
	};
}

/*=== DOM2 Core: ===*/
if(!document.implementation) {
	document.implementation = {
		hasFeature : function(feature,version) {},
		createDocumentType : function(qName,pubId,sysId) {}
	};
}
/* Experimental: add createDocument() -- IE6 fails on this, because it doesn't allow custom properties to be added to its partially-implemented document.implementation. Grr.
if(!document.implementation.createDocument && window.ActiveXObject) {
	document.implementation.createDocument = function(namespace,rootNode,doctype) {
		var progIDs = ["Msxml2.DOMDocument.4.0", "Msxml2.DOMDocument.3.0", "MSXML2.DOMDocument", "MSXML.DOMDocument", "Microsoft.XmlDom"];
		var getProgID = function() {
			for(var i=0; i<progIDs.length; i++) {
				try {
					var tmp = new ActiveXObject(progIDs[i]);
					return progIDs[i];
				} catch(e) {}
			}
			throw "No MSXML found on system";
		};
		var newDoc = new ActiveXObject(getProgID());
		hookupDOMEventsOn(newDoc);
		newDoc.onreadystatechange = function() {
			if(this.readyState == 4) {
				if(this.onload) this.onload();
				var newEvt = document.createEvent("HTMLEvents");
				newEvt.initEvent("load",true,true);
				this.dispatchEvent(newEvt);
			}
		};
		return newDoc;
	};
} */

// Namespace methods (XML only):
var isXML = (document.documentElement && document.documentElement.namespaceURI) ? true : false;
if(isXML && !document.createElementNS && document.createElement) {
	document.createElementNS = function(ns,tagName) {
		var elt = document.createElement(tagName);
		elt.namespaceURI = ns;
		return elt;
	};
}
if(isXML && !document.getElementsByTagNameNS && document.getElementsByTagName) {
	function hookupNamespaceMethodsOn(elt) {
		elt.getElementsByTagNameNS = function(ns,tagName) {
			var allElts = this.getElementsByTagName(tagName);
			var nsElts = [];
			for(var i=0; i<allElts.length; i++) {
				if(allElts[i].namespaceURI == ns) nsElts[nsElts.length] = allElts[i];
			}
			return nsElts;
		};
	};
	window.addEventListener("load",function(evt) {
		var all = document.all;
		for(var i=0; i<all.length; i++) hookupNamespaceMethodsOn(all[i]);
		hookupNamespaceMethodsOn(document);
	},false);
}


/*=== DOM2 Views: ===*/
if(!document.defaultView) document.defaultView = window;

/*=== DOM2 Style: ===*/
//NOTE: these will not always return the same values as an actual implementation, but will usually be close.
if(!window.getComputedStyle) {
	window.getComputedStyle = function(elt,pseudo) { //pseudo is ignored
		return {
			getPropertyValue : function(prop) {
				//get actual values for width and height:
				var offsetTest = elt["offset" + prop.charAt(0).toUpperCase() + prop.substring(1)];
				if(offsetTest) return offsetTest + "px";

				//use currentStyle for IE:
				if(elt.currentStyle) {
					var jsProp = "";
					for(var i=0; i<prop.length; i++) {
						if(prop.charAt(i) == "-") jsProp += prop.charAt(++i).toUpperCase();
						else jsProp += prop.charAt(i);
					}
					return elt.currentStyle[jsProp];
				}
				
				//last chance:
				return elt.style[jsProp];
			}
		};
	};
}

})();