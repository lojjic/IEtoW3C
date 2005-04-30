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



/*=== DOM2 Events: ===*/
if (!window.addEventListener && document.all /*(remove to enable partial (buggy) MacIE support:)*/ && window.attachEvent) {
	var IEtoW3C_evtAttrs = ["mouseover","mouseout","mousemove","click","change","focus","blur","load","keypress"];
	function IEtoW3C_grabEventAttributes(elt) { //make on* attributes into DOM event listeners:
		if(!elt.attachEvent) return; //HACK: don't do this on Mac, since we have to preserve the onclick property later to listen for events.
		if(elt.nodeType != 1) return; //elements only
		for(var i=0; i<IEtoW3C_evtAttrs.length; i++) {
			var evtName = IEtoW3C_evtAttrs[i];
			var attr = (elt.getAttribute) ? elt.getAttribute("on"+evtName) : null;
			if(attr) {
				elt["IEtoW3C_on"+evtName] = elt["on"+evtName]; //use later to test if "return false" should preventDefault().
				elt.addEventListener(evtName,IEtoW3C_execAttrEvent,false);
				elt["on"+evtName] = null;
			}
		}
	};
	function IEtoW3C_execAttrEvent(evt) {
		var func = this["IEtoW3C_on"+evt.type].toString();
		var funcBody = func.substring(func.indexOf("{")+1, func.lastIndexOf("}"));
		funcBody = funcBody.replace(/([\W])this([\W])/,"$1event.currentTarget$2"); //fix "this" references
		funcBody = "(function(event) {" + funcBody + "})(evt);";
		var result = eval(funcBody);
		if(result == false) evt.preventDefault(); //"return false;" prevents default action
		func = funcBody = null;
	};
	function IEtoW3C_stopPropagation() {
		this.cancelBubble = true;
	};
	function IEtoW3C_preventDefault() {
		this.returnValue = false;
	};
	function IEtoW3C_handleEvent(elt,evt) {
		//fixup event object with DOM properties and methods:
		if(!evt) var evt = window.event;
		if(!evt.currentTarget) evt.currentTarget = elt;
		if(!evt.target) evt.target = evt.srcElement || elt;
		if(evt.bubbles == null) evt.bubbles = true;
		if(evt.cancelable == null) evt.cancelable = true;
		evt.stopPropagation = IEtoW3C_stopPropagation;
		evt.preventDefault = IEtoW3C_preventDefault;
		if(!evt.relatedTarget) evt.relatedTarget = evt.fromElement || evt.toElement || null;
		evt.pageX = evt.clientX + document.body.scrollLeft;
		evt.pageY = evt.clientY + document.body.scrollTop;
		evt.timeStamp = new Date().valueOf(); //this is arbitrary by the spec?
		if(String.fromCharCode(evt.keyCode).match(/[\w\d]/)) { //this is incomplete list of keyChars.
			evt.charCode = evt.keyCode; evt.keyCode = 0;
		} else evt.charCode = 0;
		
		//get all ancestors:
		var ancestors = [];
		var tmp = evt.target;
		while(tmp) {
			IEtoW3C_grabEventAttributes(tmp);
			ancestors[ancestors.length] = tmp;
			tmp = tmp.parentNode;
		}
		//add document and window at top of tree:
		tmp = ancestors[ancestors.length-1];
		if(window != tmp) { //note the order of comparison is important here due to an IE quirk
			if(document != tmp) ancestors[ancestors.length] = document;
			ancestors[ancestors.length] = window;
		}
		
		//don't handle if anything higher up will also handle (prevents duplicate firing):
		for(var i=ancestors.length-1; (tmp=ancestors[i]); i--) {
			if(!tmp.IEtoW3C_onevent) IEtoW3C_hookupDOMEventsOn(tmp);
			if(tmp === elt) break; //stop at currentTarget
			var hdlrs = tmp.IEtoW3C_onevent[evt.type];
			if(hdlrs && ((hdlrs.capture && hdlrs.capture[0]) || (hdlrs.bubble && hdlrs.bubble[0]))) return; //exit if handler found
		}
		
		//fire each handler in correct order, passing the event object as sole parameter:
		evt.cancelBubble = false;
		evt.returnValue = true;
		evt.eventPhase = 1;
		//capturing:
		for(var i=ancestors.length-1; (tmp = ancestors[i]) && (!evt.cancelable || !evt.cancelBubble); i--) {
			if(i==0) evt.eventPhase = 2;
			evt.currentTarget = tmp;
			var hdlrs = tmp.IEtoW3C_onevent[evt.type];
			for(var j=0; hdlrs && j<hdlrs.capture.length; j++) {
				tmp.IEtoW3C_handler = hdlrs.capture[j]; //make "this" refer to currentTarget
				tmp.IEtoW3C_handler(evt);
				tmp.IEtoW3C_handler = null;
			}
		}
		//bubbling:
		for(var i=0; (tmp = ancestors[i]) && (!evt.cancelable || !evt.cancelBubble); i++) {
			if(tmp != evt.target) evt.eventPhase = 3;
			evt.currentTarget = tmp;
			var hdlrs = tmp.IEtoW3C_onevent[evt.type];
			for(var j=0; hdlrs && j<hdlrs.bubble.length; j++) {
				tmp.IEtoW3C_handler = hdlrs.bubble[j]; //make "this" refer to currentTarget
				tmp.IEtoW3C_handler(evt);
				tmp.IEtoW3C_handler = null;
			}
		}

		//restore keyCode so form fields will get keystroke
		if(evt.charCode > 0 && evt.keyCode == 0) evt.keyCode = evt.charCode;
	};

	function IEtoW3C_addEventListener(evtType,handler,capture) {
		var onevent = this.IEtoW3C_onevent[evtType];
		if(!onevent) {
			onevent = this.IEtoW3C_onevent[evtType] = {capture:[],bubble:[]};
			//set base listener to fire off custom event handling flow (it all starts here):
			//we cache a reference to the handler function so we can remove the listener during teardown
			var thisRef = this;
			if(!this.IEtoW3C_listen) this.IEtoW3C_listen = {/*evtType : handler*/};
			var lstn = this.IEtoW3C_listen[evtType] = function() { IEtoW3C_handleEvent(thisRef) };
			if(this.attachEvent) this.attachEvent("on"+evtType, lstn);
			else this["on"+evtType] = lstn; //IE Mac
		}
		var handlers = (capture) ? onevent.capture : onevent.bubble;
		for(var i=0; i<handlers.length; i++) {
			if(handlers[i] === handler) { //avoid duplicates; move duped handler to end:
				for(var j=i; j<handlers.length-1; j++) handlers[j] = handlers[j+1];
				handlers.length--;
			}
		}
		handlers[handlers.length] = handler;
		handlers = null;
	};
	
	function IEtoW3C_removeEventListener(evtType,handler,capture) {
		var onevent = this.IEtoW3C_onevent[evtType];
		if(!onevent) return;
		var handlers = (capture) ? onevent.capture : onevent.bubble;
		for(var i=0; i<handlers.length; i++) { //remove any instances of handler from list:
			if(handlers[i] === handler) {
				for(var j=i; j<handlers.length-1; j++) handlers[j] = handlers[j+1];
				handlers.length--;
			}
		}
	};
	
	function IEtoW3C_dispatchEvent(evt) {
		if(!evt.type) return;
		evt.target = evt.currentTarget = this;
		IEtoW3C_handleEvent(this,evt);
	};
	
	function IEtoW3C_hookupDOMEventsOn(elt) {
		if(elt.IEtoW3C_onevent) return;
		elt.IEtoW3C_onevent = {};

		elt.addEventListener = IEtoW3C_addEventListener;
		elt.removeEventListener = IEtoW3C_removeEventListener;
		elt.dispatchEvent = IEtoW3C_dispatchEvent;
		IEtoW3C_grabEventAttributes(elt);
	};
	
	function IEtoW3C_unhookDOMEventsFrom(elt) {
		// detach all listeners attached in IEtoW3C_addEventListener above:
		if(elt.IEtoW3C_listen) {
			for(var i in elt.IEtoW3C_listen) {
				if(elt.detachEvent) elt.detachEvent("on"+i, elt.IEtoW3C_listen[i]);
				else elt["on"+i] = null;
			}
		}
		// remove cached "onevent" attributes:
		for(var i=0; i<IEtoW3C_evtAttrs.length; i++) {
			elt["IEtoW3C_tmp"+IEtoW3C_evtAttrs[i]] = null;
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

	IEtoW3C_hookupDOMEventsOn(window);
	IEtoW3C_hookupDOMEventsOn(document);
	window.addEventListener("load",function() {
		var all = document.all;
		for(var i=0; i<all.length; i++) IEtoW3C_hookupDOMEventsOn(all[i]);
	},false);

	window.addEventListener("unload",function() { //clean up:
		IEtoW3C_unhookDOMEventsFrom(window);
		IEtoW3C_unhookDOMEventsFrom(document);
		var all = document.all;
		for(var i=0; i<all.length; i++) IEtoW3C_unhookDOMEventsFrom(all[i]);
		document.createEvent = null;
	},false);
	
	//make it work for newly created elements:
	document.IEtoW3C_createElement = document.createElement;
	document.createElement = function(tagName) {
		var newElt = document.IEtoW3C_createElement(tagName);
		IEtoW3C_hookupDOMEventsOn(newElt);
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
		IEtoW3C_hookupDOMEventsOn(newDoc);
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
