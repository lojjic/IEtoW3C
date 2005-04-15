/*
**  IEtoW3C Loader script written by Jason Johnston (jj{at}lojjic[dot]net)
**
**  This file checks for various W3C DOM properties
**  and loads IEtoW3C.js if any of them is not supported.
**
**  The contents of this file are subject to the Mozilla Public License
**  Version 1.1; for more details see the documentation file at
**  http://lojjic.net/script-library/IEtoW3C-doc.html
*/

var isXML = (document.documentElement && document.documentElement.namespaceURI) ? true : false;
if(!document.getElementById || 
   !window.addEventListener || 
   !document.implementation || 
   !document.implementation.createDocument || 
   (isXML && !document.createElementNS) || 
   (isXML && !document.getElementsByTagNameNS) || 
   !document.defaultView || 
   !document.defaultView.getComputedStyle) {
	document.write('<script type="text/javascript" src="' + (document.scriptPath || "") + 'IEtoW3C.js"></script>'); 
}

// Lightweight fix for window.addEventListener in KHTML:
if(navigator.userAgent.match(/(Konqueror|AppleWebKit)/i)) {
	KHTMLLoadListener = {
		handlers : [],
		add : function(evt, handler, capture) {
			var k = KHTMLLoadListener;
			k.handlers[k.handlers.length] = handler;
		},
		fire : function() {
			var k = KHTMLLoadListener;
			for(var i=0; i<k.handlers.length; i++) k.handlers[i]();
		}
	}
	window.addEventListener = KHTMLLoadListener.add;
	window.onload = KHTMLLoadListener.fire;
}
