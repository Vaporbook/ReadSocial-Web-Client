
/**

ReadSocial Universal Annotation

Javascript API v1.2

Copyright (c) ReadSocial, Inc.

**Requires LAB.js for loading, jQuery, and jQuery UI for optional UI components

**Browser requirements: IE 10+, Safari 5+, Chrome and Firefox 7+

**MIT Licensed**

*/
var _RS_DEBUG = false;

if(typeof window.console == 'undefined')
	window.console = { log: function () {} };

if (typeof ReadSocial == 'undefined')
	ReadSocial = {};
	
ReadSocial.log = function (m) {
  if(_RS_DEBUG) {
    console.log(m);
  }
}	

var _RS_PROXY_SIZE_LIMIT = 512000;

if(typeof _RS_ROOT == 'undefined') {

  var _RS_ROOT = 'https://api.readsocial.net';      

}

ReadSocial.API = (function () {
	
	// switch on dev environment
	var dev = (document.location.search == '?dev=1' || document.location.search == '?stage=1');
	var hash = '';
	var excerpt = '';
	var channel = '';
	var highlight = '';
	var beforedate = null;
	var partnerId;
	var useUI = false;
	var debugging = true;
	var xdframe;
	var isXD = false;
	var proxy;
	var authstatus;
	var contentdoc, content, node, locator, thumbprint, loadCallback;
	var authed = false;
	var SID;

  // added a XD proxy channel which is only used
  // when the host domain (origin) for the UI
  // differs from the domain that delivers the
  // service - will be used for privileged ajax
  // calls such as authentication and posting

  var proxycallbacks = {};	// proxy callbacks container

  // a proxy callback reaper will clear out timed-out
  // proxied requests. if no response has been rcvd,
  // the requests are removed from the proxy container

  var proxy_cb_ttl = 200000; // time to live before getting reaped
  var proxy_cb_reap_interval = 100000; // reaper runs at this interval
	
	setInterval(_reapProxyCallbacks, proxy_cb_reap_interval);
    
	var hasJQ = (typeof jQuery != 'undefined');
	var hasJQUI = (typeof jQuery != 'undefined') ?
		              (typeof jQuery.ui != 'undefined') ? true : false : false;
	var JQversion = (hasJQ) ? jQuery().jquery : false;
	var JQUIversion = (hasJQUI) ? jQuery.ui.version : false;	

  function _setContentDoc(c)
  {
    if(typeof c == 'undefined') throw ('Undefined content doc!');
    if(typeof c.css == 'function') { // jQuery
      contentdoc = c[0];
    } else { // assume its a string ID
      document.getElementById(c);
  		if(!contentdoc) {
  			contentdoc = document.getElementsByTagName('body').item(0);
  			if(!contentdoc) {
  				contentdoc = document;
  			}	
  		}
  	}
		return contentdoc;
  }

	function _init(config) {
		
		var host_uri, id, ch, c, cb, useUI;
		
    host_uri = config.host_uri;
    id = config.partner_id;
    ch = config.group_id;
    c = config.container;
    cb = config.load_handler;
		useUI = config.use_ui;
		
		if(typeof host_uri == 'undefined') throw "Host URI not defined.";
		if(typeof id != 'number') throw "Network id must be a number.";
		if(typeof ch != 'string') throw "Group id must a character string.";
		
		ReadSocial.log('ReadSocial API init on host '+host_uri+' for partner id '+id+' with channel '+ch);
		ReadSocial.log('jQuery:'+JQversion);
  	ReadSocial.log('jQuery UI:'+JQUIversion);
  	
	  host_uri = host_uri.replace(/\/$/,'');
		_RS_ROOT = host_uri;

		channel = _createChannelName(ch);
		partnerId = id;
		contentdoc = _setContentDoc(c);
		loadCallback = cb;
		var pre = _RS_ROOT;
				
    // load jquery and ping the server for valid network
    
    var jqloaded = function () { // what we will do when confirm jquery is loaded

	     jQuery.ajax({
         url:_formatUrl('/v1/{partnerId}/auth/status', [partnerId]),
         complete: function (s,d,x) {

           if(d=='error') {
             
             ReadSocial.log('The network or server is invalid: '+s.status);
             ReadSocial.log(s.responseText);
             
           } else {
             
              ReadSocial.log(s.responseText);
              var d = jQuery.parseJSON(s.responseText);
              ReadSocial.API.authed = d.authed;
              $LAB
                   .script("js/readsocial/lib/porthole.min.js").wait() 
            			 .script("js/readsocial/libRSTmpl.js").wait() /* wait for template variable to exist */
            			 .script("js/readsocial/libRSSel.js").wait()
            			 .script("js/readsocial/libRSUI.js").wait()
            			 .script("js/readsocial/libRSHASH.js")
            			 .wait(finalizeInit);
             
             
             
           }
         }
       });
	  }
	  
	  var finalizeInit = function () { 

					// mustache style templates
					_.templateSettings = {
					  interpolate : /\{\{(.+?)\}\}/g
					};
					
					if(jQuery('.readsocial-modal').size()<1) {
					  jQuery(document.body).append('<div class="readsocial-modal"><div class="readsocial-uipane"></div></div>');
				  }
				  
					if(document.location.origin!=_RS_ROOT) {
					  isXD= true;
					  _createProxyChannel(go);
					} else {
					  go();
					}

		}
		
		var go = function () {// last step in loading chain
		    
		    ReadSocial.log('go');
		    
				contentdoc = jQuery(contentdoc);

				if(typeof contentdoc == 'undefined') {
					ReadSocial.log('Error: content doc area undefined');
					throw ('Content doc area undefined');
				}

				content = jQuery('p', contentdoc);	

				if(typeof content == 'undefined') {
					ReadSocial.log('Error: content elements empty set -- no paragraphs in this document!');
				}

				if(useUI) {
				  ReadSocial.UI.init({
				    uri:_RS_ROOT,
				    debug:true
				  });
        }
        
				loadCallback();
		}
	  
    if(!hasJQ) {
      $LAB.script("js/readsocial/lib/jquery-1.7.1.min.js").wait(jqloaded);
    } else {
      jqloaded();
    }

	}
	
  function  _createProxyChannel(cb)
  { // requires porthole
    // set the ready callback and dont finish init until we get a ready event back:
    _xdReadyCallback = cb;
    
    jQuery('.readsocial-modal').append('<iframe scrolling="0"  src="'+_formatUrl('/js/auth.html?u='+escape(ReadSocial.API.getLoginURL())+'&amp;s='+escape(window.location.href))+'" name="readsocial-xd-proxy" class="readsocial-xd" tabindex="-1" role="presentation" style="position:absolute;top:-9999px;overflow:none"></iframe>');
    xdframe = jQuery('iframe.readsocial-xd');
    proxy = new Porthole.WindowProxy(_formatUrl('/js/auth.html'), 'readsocial-xd-proxy');
    proxy.addEventListener(_handleProxyIncoming);
    
  }
  
  function _popXdFrame(o)
  {
    xdframe.css(o);
  }
  
  function _getXdFrame(o)
  {
    return xdframe;
  }
  
  
  function _getEligibleContent()
  {
    return content;
  }

  function _getContentDoc()
  {
    return contentdoc;
  }
	
	
	function _getChannel(channelname)
	{
		return channel;
	}	
	
	function _setChannel(channelname)
	{
	  ReadSocial.log('setChannel called');
		channel = _createChannelName(channelname);
		ReadSocial.log('set channel to '+channel);
	}
	
	function _setContext(c)
	{
	  context = ReadSocial.hasher.normalize(c);
	  thumbprint = ReadSocial.hasher.thumbprint(context);
		ReadSocial.log('set context to '+context);	  
		ReadSocial.log('set thumbprint to '+thumbprint);	  
	}
	
	function _setHighlight(h)
	{
    highlight = h;
    ReadSocial.log('set highlight to '+highlight);
	}
	
	function _getHighlight()
	{
    return highlight;
	}

	function _setLocator(l)
	{
    locator = l;
    ReadSocial.log('set locator to '+locator);

	}

	function _setNode(n)
	{
    node = n;
    ReadSocial.log('set node to '+node);
    
	}

	function _setBeforedate(t)
	{
	  beforedate = t;
	  ReadSocial.log('set beforedate to '+beforedate);
  }

	/* Control methods/data routing */


  function _endSession(cb)
  {
      var o = {
        url: _formatUrl('/v1/{partnerId}/auth/logout', [partnerId]),
        type:'post',
        success:function (s,d,x) {
          ReadSocial.log('returned from logout successfully')
           ReadSocial.API.getAuthStatus(function (st) {
              ReadSocial.log('returned after logout with new auth status');
              cb(st);
           });
        },
        error:function(r) {
          ReadSocial.log('returned from logout with error');
          ReadSocial.log(r);
        }
      };
      _smartRequest(o);
    
  }


	function _createChannelName(s)
	{
		return s.replace(/[^A-Za-z0-9\-]/g,'').toLowerCase();
	}
	



  function _refreshNotes(cb)
  {
    // resets date and makes call to getNotes
    
		beforedate = null;
		_getNotes(cb);
		
  }
  
	function _getNotes(cb)
	{
	  // pass in a paragraph to get notes about that paragraph
	  if(typeof cb == 'undefined') throw "This function requires a callback function argument.";
    ReadSocial.log('getting notes...');
	  var d = {};
	 
	  var url = (!beforedate) ?
	    _formatUrl('/v1/{partnerId}/{channel}/notes?par_hash={par_hash}',
	                      [partnerId, channel, thumbprint]) :
	    _formatUrl('/v1/{partnerId}/{channel}/notes?par_hash={par_hash}&before={beforedate}',
	                      [partnerId, channel, thumbprint,  beforedate]);
	                      
	  ReadSocial.log('URL is '+url);
	  jQuery.ajax({
	    url: url,
			data: d,
			complete: function (s,d,x) {
				var d = jQuery.parseJSON(s.responseText);
  	    if(d.length) {
    	    var lastnote = d[d.length-1];
    	    if (typeof lastnote != 'undefined') {
    	      _setBeforedate(lastnote.crstamp);
    	    }
        }
  		  cb(d);
			}
		});
	}
	
	function _getResponses(note_id, cb)
	{

	  if(typeof cb == 'undefined') throw "This function requires a callback function argument.";
	  
    ReadSocial.log('getting responses to note_id '+note_id+' ...');

	  var url = _formatUrl('/v1/{partnerId}/notes/{note_id}/responses', [partnerId,note_id]);
	                      
	  ReadSocial.log('URL is '+url);
	  
	  jQuery.ajax({
	    url: url,
			complete: function (s,d,x) {
				var d = jQuery.parseJSON(s.responseText);
				ReadSocial.log(d);
  		  cb(d);
			}
		});
	}
	
	function _getNoteDetail(noteId, cb)
  {
        

    if(typeof noteId=='undefined') {
      ReadSocial.log('noteId must be defined to fetch a note detail');
      return;
    }

    jQuery.ajax({
      
      url: _formatUrl('/v1/{net_id}/notes/{note_id}', [

        partnerId,
        noteId

      ]),
      type: 'get',
      complete: function (s,d,x) {
        
        var d = jQuery.parseJSON(s.responseText);
        
        cb(d);
        
      }
    });

  }
  
	function _postNote(n, cb) {

    // pass in either a string n, as the note body, or
    // an object n, of the form:
    // { link: "", img: "", body: "" }
    // depending on which properties you set, the
    // content will be displayed as an image, link
    // or enhanced note

    if(
      typeof channel=='undefined' ||
       typeof context=='undefined'
    ) throw "Both channel (group) and context (paragraph text) must be defined before calling this.";
    
    var hi_raw =  highlight;
    var hi_nrml = ReadSocial.hasher.normalize(hi_raw);
    var hi_hash = ReadSocial.hasher.thumbprint(hi_nrml);
    var link, img, note;
    
	  
	  if(typeof n=='object') {
	    var link = n.link;
	    var img = n.img;
	    var note = n.body;
	  } else {
	    var note = n;
	  }
	  
		var d = {
			doc_url: window.location.href,
			doc_title: window.document.title,
			doc_view: window.location.search,
			lang: window.navigator.language,
			crstamp: (new Date()).getTime(),
	    note_body: note,
	    note_link: link,
	    note_img: img,
      hi_raw: highlight,
  	  hi_nrml: ReadSocial.hasher.normalize(highlight),
  	  hi_hash: ReadSocial.hasher.thumbprint(highlight),
  	  par_hash: thumbprint,
  	  root_selector: ''
		};

  	if(typeof channel == 'undefined' || typeof partnerId == 'undefined') throw ('must set a net id and group hashtag before creating notes');
 
		var o = {
		  url:_formatUrl('/v1/{partnerId}/{channel}/notes/create', [partnerId, channel]),
			type: 'post',
			data: JSON.stringify(d),
			contentType: "application/json",
			error: function (r) {
			  if(r.status==401) {
			    ReadSocial.log('401-Auth Required');
			    var d = jQuery.parseJSON(r.responseText);
          cb({auth:d.url});
			  }
			},
			success: function (s,d,x) {
			  cb(s);
				_callHandlers('postComplete', s);
			}
		};
		_smartRequest(o);
		
	}

	function _postResponse(note_id, response, cb) {

		var d = {
			crstamp: (new Date()).getTime(),
			resp_body: response,
			note_id: note_id
		};

  	if(typeof channel == 'undefined' || typeof partnerId == 'undefined') throw ('must set a net id and group hashtag before creating notes');
		var o = {
		  url:_formatUrl('/v1/{partnerId}/notes/{note_id}/responses/create', [partnerId,note_id]),
			type: 'post',
			data: JSON.stringify(d),
			contentType: "application/json",
			error: function (r) {
			  if(r.status==401) {
			    ReadSocial.log('401-Auth Required');
			    var d = jQuery.parseJSON(r.responseText);
          cb({auth:d.url});
			  }
			},
			success: function (s,d,x) {
			  cb(s);
				_callHandlers('responseComplete', s);
			}
		};
		_smartRequest(o);
		
	}

  function _reapProxyCallbacks()
  {
    ReadSocial.log('the reaper is calling...');
    for(prop in proxycallbacks) {
      ReadSocial.log('checking proxy callback:'+prop);
      var s = /xdcb_(\d+?)_/.exec(prop);
      if(!s) throw "Bad xd callback signature. Something is b0rken!";
      var expired = ((new Date()).getTime()-proxy_cb_ttl) > s[1];
      if(expired) {
        ReadSocial.log('removing an expired proxy callback:'+prop);
        delete proxycallbacks[prop];
      }      
    }
    ReadSocial.log('proxy callback object:');
    ReadSocial.log(proxycallbacks);
  }
  
  function _runProxyCb(o)
  {
    var opid = o.opid;
    var cbname = o.cbname;
    var d = o.json;
    if(typeof proxycallbacks[opid] != 'undefined') {
      if(typeof proxycallbacks[opid][cbname] != 'undefined') {
        var cb = proxycallbacks[opid][cbname];
        // quite a hack here
        if(cbname=='success') {
          cb(d,cbname,{responseText:d});
        } else {
          cb({error:cbname});          
        }
        delete proxycallbacks[opid][cbname];
      } else {
        ReadSocial.log('callback name '+cbname+' is undefined');
      }
    } else {
      ReadSocial.log('callback operation id '+opid+' is undefined');      
    }
  }

  function _handleProxyIncoming(e)
  {
    var o = e.data;
    if(typeof o != 'object') {
      throw "Invalid data format from proxy channel!";
      return;
    } else {
      switch(o.op) {
       case('cb'): /* when op='cb' we interpret as a proxied callback */
         ReadSocial.log('Incoming proxy callback event');
         ReadSocial.log(o);
         /* the .d property should hold the object data */
         /* opid - the corresponding proxied callback id */
         /* cbname - the name of this callback property, eg 'complete' 'error' etc */
         /* json - json representation of the payload */
         _runProxyCb(o);
         break;
       case('log'):
         ReadSocial.log('Incoming proxy log event:');
         ReadSocial.log(o.d.m);
         break;
       case('auth'):
         ReadSocial.log('Xd auth event:');
         ReadSocial.log(o.d.url);
         _oauthCallback(3);
         break;
       case('ready'):
         ReadSocial.log('Xd ready event:');
         ReadSocial.log(o.d.url);
         _xdReadyCallback();
         break;
       default:
         ReadSocial.log('unsupported proxy op');
         break; 
      }
    }
    
  }
  
  function _xdReadyCallback() {;}

  function _proxy(o)
  {

    // cross domain proxy for ajax requests
    // allows requests to retain headers from
    // readsocial domain, including cookies
    
    if (typeof o.data != 'undefined') {
      // if data contains a long string, stream it
      if(o.data.length > _RS_PROXY_SIZE_LIMIT) {
        _streamProxy(o);        
      }
    }

    // the id for this call
    var id = 'xdcb_'+(new Date()).getTime()+'_'+Math.round(Math.random()*1000000);
    var haul = {
      
      op:'ajax', /* indicate the operation type */
      cbid:id, /* identify the id for all callbacks */
      d:{}
      
    };
    for(prop in o) {
      
      if(typeof o[prop] == 'function') {
        // cannot serialize functions in older browsers
        // store the function in a callback with an id
        // then store the id in the transport itself, to be
        // invoked when the transport container comes back
        if(typeof proxycallbacks[id] == 'undefined') proxycallbacks[id] = {};
        proxycallbacks[id][prop] = o[prop];
      
      } else { // add other data to the payload
   
        haul.d[prop] = o[prop];
   
      }
    }
    proxy.postMessage(haul);
    
  }
  
  function _streamProxy(o)
  {
    /* A streaming x-domain proxy for large data objects */
    /* Takes a JSON serialization of a fat object */
    /* o.data contains a JSON string payload, a la jquery */
    
    /* This is designed for new browsers and may not work 
    /* in older ones */

    /* Hi Corey! */
    
    // the id for this call
    
    var id = 'xdcb_'+(new Date()).getTime()+'_'+Math.round(Math.random()*1000000);

    var json = o.data;
  
    // chunk it up
    var chunks = [];
    var chunkSize = 4096 * 4;
    var numChunks = (json.length/chunkSize);
    ReadSocial.log('numChunks is '+numChunks);

    for(var p=0; p < json.length; p = p + chunkSize) {
      ReadSocial.log(p+'+'+chunkSize);
      chunks.push(json.substr(p,chunkSize));
    }
    ReadSocial.log('chunked into '+chunks.length+' parts');

    // load into an x-domain streamhauler
    var streamhaul = [];
    for(var c=0; c < chunks.length; c++) {
      var chunk = chunks[c];
      streamhaul.push({
        op:'streamhaul', /* indicate the operation type */
        cbid:id, /* identify the id for all callbacks */
        chunkid:c,
        totalnum:chunks.length,
        d:chunk
      });
    }

    var haul = {
      
      op:'stream', /* indicate the operation type */
      cbid:id, /* identify the id for all callbacks */
      d:{}
      
    };

    for(prop in o) {
        if(typeof o[prop] == 'function') {
          // cannot serialize functions 
          if(typeof proxycallbacks[id] == 'undefined') proxycallbacks[id] = {};
          proxycallbacks[id][prop] = o[prop];

        } else if (prop != 'data') {
          // 'data' prop goes to stream,
          // but add other prop values here
          
          haul.d[prop] = o[prop];
        }
    }
    
    // start the stream - no callback til complete:
    proxy.postMessage(haul);

    for(var i = 0; i < streamhaul.length; i++) {
      proxy.postMessage(streamhaul[i]);
    }

    
  }
  
  function _smartRequest(o)
  {
    if(isXD) {
      _proxy(o);
    } else {
      jQuery.ajax(o);
    }
  }

  function _getAuthStatus(cb)
  {
    ReadSocial.log('getting auth status');
    var u = _formatUrl('/v1/{partnerId}/auth/status', [partnerId]);
    ReadSocial.log(u);
    var transport = {
      url:u,
      error: function (jqXHR) {
			  cb({error:jqXHR.status});
			},
      success: function (data, textStatus, jqXHR) {
        var d = jQuery.parseJSON(jqXHR.responseText);
        ReadSocial.log(jqXHR);
        ReadSocial.API.authed = d.authed;
        cb(d);
      }
    };
    _smartRequest(transport);
  }
  
  function _getOAuthStatus(cb) {
    var u = _formatUrl('/v1/{partnerId}/auth/oauth', [partnerId]);
    jQuery.ajax({
      url:u,
      contentType:'application/json',
      error: function (jqXHR) {
			  cb({error:jqXHR.status});
			},
      success: function (data, textStatus, jqXHR) {
        var d = jQuery.parseJSON(jqXHR.responseText);
        ReadSocial.log(jqXHR);
        cb(d);
      }
      
    });
  }
  
  function _getOAuthRequestToken(cb) {
    var u = _formatUrl('/v1/{partnerId}/auth/orequest', [partnerId]);
    jQuery.ajax({
      url:u,
      error: function (jqXHR) {
			  cb({error:jqXHR.status});
			},
      success: function (data, textStatus, jqXHR) {
        var d = jQuery.parseJSON(jqXHR.responseText);
        ReadSocial.log(jqXHR);
        cb(d);
      }
      
    });
  }

  function _getNotesCount(phash, cb)
  {
    
    jQuery.ajax({
      url:_formatUrl('/v1/{partnerId}/{channel}/notes/count?par_hash={phash}', [partnerId,channel,phash]),
      error: function (jqXHR) {
			  if(jqXHR.status==502) {
          cb({count:0});
			  } else {
			    cb({count:0});
			  }
			},
      success: function (data, textStatus, jqXHR) {
        var d = jQuery.parseJSON(jqXHR.responseText);
        cb(d);
      }
    });
    
    
  }
 	
  function _formatUrl(url, args)
  {
    if(typeof args=='undefined') return _RS_ROOT + url;
    ReadSocial.log(url);
    for(var i = 0; i < args.length; i++) {
  //    ReadSocial.log('URL argument:'+args[i]);
      url = url.replace(
        /\{[^\}]+?\}/, args[i]
      );
    }
    return _RS_ROOT + url;
  }
  
  function setCookie(name,value,expires,path,domain,secure){var today=new Date();today.setTime(today.getTime());if(expires){expires=expires*1000*60*60*24}var expires_date=new Date(today.getTime()+(expires));document.cookie=name+"="+encodeURIComponent(value)+((expires)?";expires="+expires_date.toGMTString():"")+((path)?";path="+path:"")+((domain)?";domain="+domain:"")+((secure)?";secure":"")};  
  
  function _getLoginURL()
  {
    return _formatUrl('/v1/{partnerId}/auth/login', [partnerId]);
  }
  
  function _isXd() 
  {
    return isXD;
  }
  
  function _requestAuthXd()
  {
      if(arguments.length) {
        var e = arguments[1];
      }
      var haul = {
        op:'auth', /* indicate the operation type */
        d:{
         
        }
      };
      proxy.postMessage(haul);
  }
  
  function _oauthCallback()
  {
     ReadSocial.log('oauth callback, getting new auth status');
     _getAuthStatus(function (s) {
        ReadSocial.log(s);
        if(typeof ReadSocial.UI != 'undefined') {
          ReadSocial.log('UI enabled, will notify');
          ReadSocial.UI.updateAuthStatus(s);
        } else {
          ReadSocial.log('UI not enabled, will not notify');
        }
     });
  }

	/* Model getters */


	var dataHandlers = {};
	
	function _addHandler(type, cb)
	{
		if(typeof dataHandlers[type] == 'undefined') {
			dataHandlers[type] = [];
		}
		dataHandlers[type].push(cb);
	}
	
	function _callHandlers(type, payload)
	{
		if(typeof payload != 'array') {
			payload = [ payload ];
		}
		if(typeof dataHandlers[type] == 'undefined') {
			dataHandlers[type] = [];
		}
		for(var i = 0; i < dataHandlers[type].length; i++) {
			if(typeof dataHandlers[type][i] != 'undefined') {
			  dataHandlers[type][i].apply(this, payload);
		  }
		}
	}


  

	return {
		
		load: _init,
		postNote: _postNote,
		postResponse: _postResponse,
		refreshNotes: _refreshNotes,
		getNotes: _getNotes,
		getNotesCount: _getNotesCount,
		getResponses: _getResponses,
		setContext: _setContext,
		setHighlight: _setHighlight,
		getHighlight: _getHighlight,
		setLocator: _setLocator,
		setNode: _setNode,
		getXdFrame: _getXdFrame,
		isXd: _isXd,
		requestAuthXd: _requestAuthXd,
		setGroupName: _setChannel,
		getGroupName: _getChannel,
		getNoteDetail: _getNoteDetail,
		addHandler: _addHandler,
		getAuthStatus: _getAuthStatus,
		getOAuthStatus: _getOAuthStatus,
		getOAuthRequestToken: _getOAuthRequestToken,		
		endSession: _endSession,
		oauthCallback: _oauthCallback,
		getContent: _getEligibleContent,
		getContentDoc: _getContentDoc,
		getLoginURL: _getLoginURL,
		authed: authed,
		isAuthed: function () {
		  return authed;
		}
		
	};
	
	
	
})();


/*! LAB.js (LABjs :: Loading And Blocking JavaScript)
    v2.0 (c) Kyle Simpson
    MIT License
*/
(function(o){var K=o.$LAB,y="UseLocalXHR",z="AlwaysPreserveOrder",u="AllowDuplicates",A="CacheBust",B="BasePath",C=/^[^?#]*\//.exec(location.href)[0],D=/^\w+\:\/\/\/?[^\/]+/.exec(C)[0],i=document.head||document.getElementsByTagName("head"),L=(o.opera&&Object.prototype.toString.call(o.opera)=="[object Opera]")||("MozAppearance"in document.documentElement.style),q=document.createElement("script"),E=typeof q.preload=="boolean",r=E||(q.readyState&&q.readyState=="uninitialized"),F=!r&&q.async===true,M=!r&&!F&&!L;function G(a){return Object.prototype.toString.call(a)=="[object Function]"}function H(a){return Object.prototype.toString.call(a)=="[object Array]"}function N(a,c){var b=/^\w+\:\/\//;if(/^\/\/\/?/.test(a)){a=location.protocol+a}else if(!b.test(a)&&a[0]!="/"){a=(c||"")+a}return b.test(a)?a:((a[0]=="/"?D:C)+a)}function s(a,c){for(var b in a){if(a.hasOwnProperty(b)){c[b]=a[b]}}return c}function O(a){var c=false;for(var b=0;b<a.scripts.length;b++){if(a.scripts[b].ready&&a.scripts[b].exec_trigger){c=true;a.scripts[b].exec_trigger();a.scripts[b].exec_trigger=null}}return c}function t(a,c,b,d){a.onload=a.onreadystatechange=function(){if((a.readyState&&a.readyState!="complete"&&a.readyState!="loaded")||c[b])return;a.onload=a.onreadystatechange=null;d()}}function I(a){a.ready=a.finished=true;for(var c=0;c<a.finished_listeners.length;c++){setTimeout(a.finished_listeners[c],0)}a.ready_listeners=[];a.finished_listeners=[]}function P(d,f,e,g,h){setTimeout(function(){var a,c=f.real_src,b;if("item"in i){if(!i[0]){setTimeout(arguments.callee,25);return}i=i[0]}a=document.createElement("script");if(f.type)a.type=f.type;if(f.charset)a.charset=f.charset;if(h){if(r){e.elem=a;if(E){a.preload=true;a.onpreload=g}else{a.onreadystatechange=function(){if(a.readyState=="loaded")g();a.onreadystatechange=null}}a.src=c}else if(h&&c.indexOf(D)==0&&d[y]){b=new XMLHttpRequest();b.onreadystatechange=function(){if(b.readyState==4){b.onreadystatechange=function(){};e.text=b.responseText+"\n//@ sourceURL="+c;g()}};b.open("GET",c);b.send()}else{a.type="text/cache-script";t(a,e,"ready",function(){i.removeChild(a);g()});a.src=c;i.insertBefore(a,i.firstChild)}}else if(F){a.async=false;t(a,e,"finished",g);a.src=c;i.insertBefore(a,i.firstChild)}else{t(a,e,"finished",g);a.src=c;i.insertBefore(a,i.firstChild)}},0)}function J(){var l={},Q=r||M,n=[],p={},m;l[y]=true;l[z]=false;l[u]=false;l[A]=false;l[B]="";function R(a,c,b){var d;function f(){if(d!=null){I(b);d=null}}if(p[c.src].finished)return;if(!a[u])p[c.src].finished=true;d=b.elem||document.createElement("script");if(c.type)d.type=c.type;if(c.charset)d.charset=c.charset;t(d,b,"finished",f);if(b.elem){b.elem=null}else if(b.text){d.onload=d.onreadystatechange=null;d.text=b.text}else{d.src=c.real_src}i.insertBefore(d,i.firstChild);if(b.text){f()}}function S(c,b,d,f){var e,g,h=function(){b.ready_cb(b,function(){R(c,b,e)})},j=function(){b.finished_cb(b,d)};b.src=N(b.src,c[B]);b.real_src=b.src+(c[A]?((/\?.*$/.test(b.src)?"&_":"?_")+~~(Math.random()*1E9)+"="):"");if(!p[b.src])p[b.src]={items:[],finished:false};g=p[b.src].items;if(c[u]||g.length==0){e=g[g.length]={ready:false,finished:false,ready_listeners:[h],finished_listeners:[j]};P(c,b,e,((f)?function(){e.ready=true;for(var a=0;a<e.ready_listeners.length;a++){setTimeout(e.ready_listeners[a],0)}e.ready_listeners=[]}:function(){I(e)}),f)}else{e=g[0];if(e.finished){setTimeout(j,0)}else{e.finished_listeners.push(j)}}}function v(){var e,g=s(l,{}),h=[],j=0,w=false,k;function T(a,c){a.ready=true;a.exec_trigger=c;x()}function U(a,c){a.ready=a.finished=true;a.exec_trigger=null;for(var b=0;b<c.scripts.length;b++){if(!c.scripts[b].finished)return}c.finished=true;x()}function x(){while(j<h.length){if(G(h[j])){try{h[j]()}catch(err){}}else if(!h[j].finished){if(O(h[j]))continue;break}j++}if(j==h.length){w=false;k=false}}function V(){if(!k||!k.scripts){h.push(k={scripts:[],finished:true})}}e={script:function(){for(var f=0;f<arguments.length;f++){(function(a,c){var b;if(!H(a)){c=[a]}for(var d=0;d<c.length;d++){V();a=c[d];if(G(a))a=a();if(!a)continue;if(H(a)){b=[].slice.call(a);b.push(d,1);c.splice.call(c,b);d--;continue}if(typeof a=="string")a={src:a};a=s(a,{ready:false,ready_cb:T,finished:false,finished_cb:U});k.finished=false;k.scripts.push(a);S(g,a,k,(Q&&w));w=true;if(g[z])e.wait()}})(arguments[f],arguments[f])}return e},wait:function(){if(arguments.length>0){for(var a=0;a<arguments.length;a++){h.push(arguments[a])}k=h[h.length-1]}else k=false;x();return e}};return{script:e.script,wait:e.wait,setOptions:function(a){s(a,g);return e}}}m={setGlobalDefaults:function(a){s(a,l);return m},setOptions:function(){return v().setOptions.apply(null,arguments)},script:function(){return v().script.apply(null,arguments)},wait:function(){return v().wait.apply(null,arguments)},queueScript:function(){n[n.length]={type:"script",args:[].slice.call(arguments)};return m},queueWait:function(){n[n.length]={type:"wait",args:[].slice.call(arguments)};return m},runQueue:function(){var a=m,c=n.length,b=c,d;for(;--b>=0;){d=n.shift();a=a[d.type].apply(null,d.args)}return a},noConflict:function(){o.$LAB=K;return m},sandbox:function(){return J()}};return m}o.$LAB=J();(function(a,c,b){if(document.readyState==null&&document[a]){document.readyState="loading";document[a](c,b=function(){document.removeEventListener(c,b,false);document.readyState="complete"},false)}})("addEventListener","DOMContentLoaded")})(this);


/* Modernizr 2.0.6 (Custom Build) | MIT & BSD
 * Build: http://www.modernizr.com/download/#-fontface-borderradius-cssgradients-draganddrop-hashchange-localstorage-postmessage-sessionstorage-geolocation-iepp-cssclasses-teststyles-testprop-testallprops-hasevent-prefixes-domprefixes-load
 */
;window.Modernizr=function(a,b,c){function D(a,b){var c=a.charAt(0).toUpperCase()+a.substr(1),d=(a+" "+o.join(c+" ")+c).split(" ");return C(d,b)}function C(a,b){for(var d in a)if(k[a[d]]!==c)return b=="pfx"?a[d]:!0;return!1}function B(a,b){return!!~(""+a).indexOf(b)}function A(a,b){return typeof a===b}function z(a,b){return y(n.join(a+";")+(b||""))}function y(a){k.cssText=a}var d="2.0.6",e={},f=!0,g=b.documentElement,h=b.head||b.getElementsByTagName("head")[0],i="modernizr",j=b.createElement(i),k=j.style,l,m=Object.prototype.toString,n=" -webkit- -moz- -o- -ms- -khtml- ".split(" "),o="Webkit Moz O ms Khtml".split(" "),p={},q={},r={},s=[],t=function(a,c,d,e){var f,h,j,k=b.createElement("div");if(parseInt(d,10))while(d--)j=b.createElement("div"),j.id=e?e[d]:i+(d+1),k.appendChild(j);f=["&shy;","<style>",a,"</style>"].join(""),k.id=i,k.innerHTML+=f,g.appendChild(k),h=c(k,a),k.parentNode.removeChild(k);return!!h},u=function(){function d(d,e){e=e||b.createElement(a[d]||"div"),d="on"+d;var f=d in e;f||(e.setAttribute||(e=b.createElement("div")),e.setAttribute&&e.removeAttribute&&(e.setAttribute(d,""),f=A(e[d],"function"),A(e[d],c)||(e[d]=c),e.removeAttribute(d))),e=null;return f}var a={select:"input",change:"input",submit:"form",reset:"form",error:"img",load:"img",abort:"img"};return d}(),v,w={}.hasOwnProperty,x;!A(w,c)&&!A(w.call,c)?x=function(a,b){return w.call(a,b)}:x=function(a,b){return b in a&&A(a.constructor.prototype[b],c)};var E=function(a,c){var d=a.join(""),f=c.length;t(d,function(a,c){var d=b.styleSheets[b.styleSheets.length-1],g=d.cssRules&&d.cssRules[0]?d.cssRules[0].cssText:d.cssText||"",h=a.childNodes,i={};while(f--)i[h[f].id]=h[f];e.fontface=/src/i.test(g)&&g.indexOf(c.split(" ")[0])===0},f,c)}(['@font-face {font-family:"font";src:url("https://")}'],["fontface"]);p.geolocation=function(){return!!navigator.geolocation},p.postmessage=function(){return!!a.postMessage},p.hashchange=function(){return u("hashchange",a)&&(b.documentMode===c||b.documentMode>7)},p.draganddrop=function(){return u("dragstart")&&u("drop")},p.borderradius=function(){return D("borderRadius")},p.cssgradients=function(){var a="background-image:",b="gradient(linear,left top,right bottom,from(#9f9),to(white));",c="linear-gradient(left top,#9f9, white);";y((a+n.join(b+a)+n.join(c+a)).slice(0,-a.length));return B(k.backgroundImage,"gradient")},p.fontface=function(){return e.fontface},p.localstorage=function(){try{return!!localStorage.getItem}catch(a){return!1}},p.sessionstorage=function(){try{return!!sessionStorage.getItem}catch(a){return!1}};for(var F in p)x(p,F)&&(v=F.toLowerCase(),e[v]=p[F](),s.push((e[v]?"":"no-")+v));y(""),j=l=null,a.attachEvent&&function(){var a=b.createElement("div");a.innerHTML="<elem></elem>";return a.childNodes.length!==1}()&&function(a,b){function s(a){var b=-1;while(++b<g)a.createElement(f[b])}a.iepp=a.iepp||{};var d=a.iepp,e=d.html5elements||"abbr|article|aside|audio|canvas|datalist|details|figcaption|figure|footer|header|hgroup|mark|meter|nav|output|progress|section|summary|time|video",f=e.split("|"),g=f.length,h=new RegExp("(^|\\s)("+e+")","gi"),i=new RegExp("<(/*)("+e+")","gi"),j=/^\s*[\{\}]\s*$/,k=new RegExp("(^|[^\\n]*?\\s)("+e+")([^\\n]*)({[\\n\\w\\W]*?})","gi"),l=b.createDocumentFragment(),m=b.documentElement,n=m.firstChild,o=b.createElement("body"),p=b.createElement("style"),q=/print|all/,r;d.getCSS=function(a,b){if(a+""===c)return"";var e=-1,f=a.length,g,h=[];while(++e<f){g=a[e];if(g.disabled)continue;b=g.media||b,q.test(b)&&h.push(d.getCSS(g.imports,b),g.cssText),b="all"}return h.join("")},d.parseCSS=function(a){var b=[],c;while((c=k.exec(a))!=null)b.push(((j.exec(c[1])?"\n":c[1])+c[2]+c[3]).replace(h,"$1.iepp_$2")+c[4]);return b.join("\n")},d.writeHTML=function(){var a=-1;r=r||b.body;while(++a<g){var c=b.getElementsByTagName(f[a]),d=c.length,e=-1;while(++e<d)c[e].className.indexOf("iepp_")<0&&(c[e].className+=" iepp_"+f[a])}l.appendChild(r),m.appendChild(o),o.className=r.className,o.id=r.id,o.innerHTML=r.innerHTML.replace(i,"<$1font")},d._beforePrint=function(){p.styleSheet.cssText=d.parseCSS(d.getCSS(b.styleSheets,"all")),d.writeHTML()},d.restoreHTML=function(){o.innerHTML="",m.removeChild(o),m.appendChild(r)},d._afterPrint=function(){d.restoreHTML(),p.styleSheet.cssText=""},s(b),s(l);d.disablePP||(n.insertBefore(p,n.firstChild),p.media="print",p.className="iepp-printshim",a.attachEvent("onbeforeprint",d._beforePrint),a.attachEvent("onafterprint",d._afterPrint))}(a,b),e._version=d,e._prefixes=n,e._domPrefixes=o,e.hasEvent=u,e.testProp=function(a){return C([a])},e.testAllProps=D,e.testStyles=t,g.className=g.className.replace(/\bno-js\b/,"")+(f?" js "+s.join(" "):"");return e}(this,this.document),function(a,b,c){function k(a){return!a||a=="loaded"||a=="complete"}function j(){var a=1,b=-1;while(p.length- ++b)if(p[b].s&&!(a=p[b].r))break;a&&g()}function i(a){var c=b.createElement("script"),d;c.src=a.s,c.onreadystatechange=c.onload=function(){!d&&k(c.readyState)&&(d=1,j(),c.onload=c.onreadystatechange=null)},m(function(){d||(d=1,j())},H.errorTimeout),a.e?c.onload():n.parentNode.insertBefore(c,n)}function h(a){var c=b.createElement("link"),d;c.href=a.s,c.rel="stylesheet",c.type="text/css";if(!a.e&&(w||r)){var e=function(a){m(function(){if(!d)try{a.sheet.cssRules.length?(d=1,j()):e(a)}catch(b){b.code==1e3||b.message=="security"||b.message=="denied"?(d=1,m(function(){j()},0)):e(a)}},0)};e(c)}else c.onload=function(){d||(d=1,m(function(){j()},0))},a.e&&c.onload();m(function(){d||(d=1,j())},H.errorTimeout),!a.e&&n.parentNode.insertBefore(c,n)}function g(){var a=p.shift();q=1,a?a.t?m(function(){a.t=="c"?h(a):i(a)},0):(a(),j()):q=0}function f(a,c,d,e,f,h){function i(){!o&&k(l.readyState)&&(r.r=o=1,!q&&j(),l.onload=l.onreadystatechange=null,m(function(){u.removeChild(l)},0))}var l=b.createElement(a),o=0,r={t:d,s:c,e:h};l.src=l.data=c,!s&&(l.style.display="none"),l.width=l.height="0",a!="object"&&(l.type=d),l.onload=l.onreadystatechange=i,a=="img"?l.onerror=i:a=="script"&&(l.onerror=function(){r.e=r.r=1,g()}),p.splice(e,0,r),u.insertBefore(l,s?null:n),m(function(){o||(u.removeChild(l),r.r=r.e=o=1,j())},H.errorTimeout)}function e(a,b,c){var d=b=="c"?z:y;q=0,b=b||"j",C(a)?f(d,a,b,this.i++,l,c):(p.splice(this.i++,0,a),p.length==1&&g());return this}function d(){var a=H;a.loader={load:e,i:0};return a}var l=b.documentElement,m=a.setTimeout,n=b.getElementsByTagName("script")[0],o={}.toString,p=[],q=0,r="MozAppearance"in l.style,s=r&&!!b.createRange().compareNode,t=r&&!s,u=s?l:n.parentNode,v=a.opera&&o.call(a.opera)=="[object Opera]",w="webkitAppearance"in l.style,x=w&&"async"in b.createElement("script"),y=r?"object":v||x?"img":"script",z=w?"img":y,A=Array.isArray||function(a){return o.call(a)=="[object Array]"},B=function(a){return Object(a)===a},C=function(a){return typeof a=="string"},D=function(a){return o.call(a)=="[object Function]"},E=[],F={},G,H;H=function(a){function f(a){var b=a.split("!"),c=E.length,d=b.pop(),e=b.length,f={url:d,origUrl:d,prefixes:b},g,h;for(h=0;h<e;h++)g=F[b[h]],g&&(f=g(f));for(h=0;h<c;h++)f=E[h](f);return f}function e(a,b,e,g,h){var i=f(a),j=i.autoCallback;if(!i.bypass){b&&(b=D(b)?b:b[a]||b[g]||b[a.split("/").pop().split("?")[0]]);if(i.instead)return i.instead(a,b,e,g,h);e.load(i.url,i.forceCSS||!i.forceJS&&/css$/.test(i.url)?"c":c,i.noexec),(D(b)||D(j))&&e.load(function(){d(),b&&b(i.origUrl,h,g),j&&j(i.origUrl,h,g)})}}function b(a,b){function c(a){if(C(a))e(a,h,b,0,d);else if(B(a))for(i in a)a.hasOwnProperty(i)&&e(a[i],h,b,i,d)}var d=!!a.test,f=d?a.yep:a.nope,g=a.load||a.both,h=a.callback,i;c(f),c(g),a.complete&&b.load(a.complete)}var g,h,i=this.yepnope.loader;if(C(a))e(a,0,i,0);else if(A(a))for(g=0;g<a.length;g++)h=a[g],C(h)?e(h,0,i,0):A(h)?H(h):B(h)&&b(h,i);else B(a)&&b(a,i)},H.addPrefix=function(a,b){F[a]=b},H.addFilter=function(a){E.push(a)},H.errorTimeout=1e4,b.readyState==null&&b.addEventListener&&(b.readyState="loading",b.addEventListener("DOMContentLoaded",G=function(){b.removeEventListener("DOMContentLoaded",G,0),b.readyState="complete"},0)),a.yepnope=d()}(this,this.document),Modernizr.load=function(){yepnope.apply(window,[].slice.call(arguments,0))};

var JSON;if(!JSON){JSON={}}(function(){function str(a,b){var c,d,e,f,g=gap,h,i=b[a];if(i&&typeof i==="object"&&typeof i.toJSON==="function"){i=i.toJSON(a)}if(typeof rep==="function"){i=rep.call(b,a,i)}switch(typeof i){case"string":return quote(i);case"number":return isFinite(i)?String(i):"null";case"boolean":case"null":return String(i);case"object":if(!i){return"null"}gap+=indent;h=[];if(Object.prototype.toString.apply(i)==="[object Array]"){f=i.length;for(c=0;c<f;c+=1){h[c]=str(c,i)||"null"}e=h.length===0?"[]":gap?"[\n"+gap+h.join(",\n"+gap)+"\n"+g+"]":"["+h.join(",")+"]";gap=g;return e}if(rep&&typeof rep==="object"){f=rep.length;for(c=0;c<f;c+=1){if(typeof rep[c]==="string"){d=rep[c];e=str(d,i);if(e){h.push(quote(d)+(gap?": ":":")+e)}}}}else{for(d in i){if(Object.prototype.hasOwnProperty.call(i,d)){e=str(d,i);if(e){h.push(quote(d)+(gap?": ":":")+e)}}}}e=h.length===0?"{}":gap?"{\n"+gap+h.join(",\n"+gap)+"\n"+g+"}":"{"+h.join(",")+"}";gap=g;return e}}function quote(a){escapable.lastIndex=0;return escapable.test(a)?'"'+a.replace(escapable,function(a){var b=meta[a];return typeof b==="string"?b:"\\u"+("0000"+a.charCodeAt(0).toString(16)).slice(-4)})+'"':'"'+a+'"'}function f(a){return a<10?"0"+a:a}"use strict";if(typeof Date.prototype.toJSON!=="function"){Date.prototype.toJSON=function(a){return isFinite(this.valueOf())?this.getUTCFullYear()+"-"+f(this.getUTCMonth()+1)+"-"+f(this.getUTCDate())+"T"+f(this.getUTCHours())+":"+f(this.getUTCMinutes())+":"+f(this.getUTCSeconds())+"Z":null};String.prototype.toJSON=Number.prototype.toJSON=Boolean.prototype.toJSON=function(a){return this.valueOf()}}var cx=/[\u0000\u00ad\u0600-\u0604\u070f\u17b4\u17b5\u200c-\u200f\u2028-\u202f\u2060-\u206f\ufeff\ufff0-\uffff]/g,escapable=/[\\\"\x00-\x1f\x7f-\x9f\u00ad\u0600-\u0604\u070f\u17b4\u17b5\u200c-\u200f\u2028-\u202f\u2060-\u206f\ufeff\ufff0-\uffff]/g,gap,indent,meta={"\b":"\\b","\t":"\\t","\n":"\\n","\f":"\\f","\r":"\\r",'"':'\\"',"\\":"\\\\"},rep;if(typeof JSON.stringify!=="function"){JSON.stringify=function(a,b,c){var d;gap="";indent="";if(typeof c==="number"){for(d=0;d<c;d+=1){indent+=" "}}else if(typeof c==="string"){indent=c}rep=b;if(b&&typeof b!=="function"&&(typeof b!=="object"||typeof b.length!=="number")){throw new Error("JSON.stringify")}return str("",{"":a})}}if(typeof JSON.parse!=="function"){JSON.parse=function(text,reviver){function walk(a,b){var c,d,e=a[b];if(e&&typeof e==="object"){for(c in e){if(Object.prototype.hasOwnProperty.call(e,c)){d=walk(e,c);if(d!==undefined){e[c]=d}else{delete e[c]}}}}return reviver.call(a,b,e)}var j;text=String(text);cx.lastIndex=0;if(cx.test(text)){text=text.replace(cx,function(a){return"\\u"+("0000"+a.charCodeAt(0).toString(16)).slice(-4)})}if(/^[\],:{}\s]*$/.test(text.replace(/\\(?:["\\\/bfnrt]|u[0-9a-fA-F]{4})/g,"@").replace(/"[^"\\\n\r]*"|true|false|null|-?\d+(?:\.\d*)?(?:[eE][+\-]?\d+)?/g,"]").replace(/(?:^|:|,)(?:\s*\[)+/g,""))){j=eval("("+text+")");return typeof reviver==="function"?walk({"":j},""):j}throw new SyntaxError("JSON.parse")}}})()

/*
 * A JavaScript implementation of the RSA Data Security, Inc. MD5 Message
 * Digest Algorithm, as defined in RFC 1321.
 * Version 2.2 Copyright (C) Paul Johnston 1999 - 2009
 * Other contributors: Greg Holt, Andrew Kepert, Ydnar, Lostinet
 * Distributed under the BSD License
 * See http://pajhome.org.uk/crypt/md5 for more info.
 */
var hexcase=0;function hex_md5(a){return rstr2hex(rstr_md5(str2rstr_utf8(a)))}function hex_hmac_md5(a,b){return rstr2hex(rstr_hmac_md5(str2rstr_utf8(a),str2rstr_utf8(b)))}function md5_vm_test(){return hex_md5("abc").toLowerCase()=="900150983cd24fb0d6963f7d28e17f72"}function rstr_md5(a){return binl2rstr(binl_md5(rstr2binl(a),a.length*8))}function rstr_hmac_md5(c,f){var e=rstr2binl(c);if(e.length>16){e=binl_md5(e,c.length*8)}var a=Array(16),d=Array(16);for(var b=0;b<16;b++){a[b]=e[b]^909522486;d[b]=e[b]^1549556828}var g=binl_md5(a.concat(rstr2binl(f)),512+f.length*8);return binl2rstr(binl_md5(d.concat(g),512+128))}function rstr2hex(c){try{hexcase}catch(g){hexcase=0}var f=hexcase?"0123456789ABCDEF":"0123456789abcdef";var b="";var a;for(var d=0;d<c.length;d++){a=c.charCodeAt(d);b+=f.charAt((a>>>4)&15)+f.charAt(a&15)}return b}function str2rstr_utf8(c){var b="";var d=-1;var a,e;while(++d<c.length){a=c.charCodeAt(d);e=d+1<c.length?c.charCodeAt(d+1):0;if(55296<=a&&a<=56319&&56320<=e&&e<=57343){a=65536+((a&1023)<<10)+(e&1023);d++}if(a<=127){b+=String.fromCharCode(a)}else{if(a<=2047){b+=String.fromCharCode(192|((a>>>6)&31),128|(a&63))}else{if(a<=65535){b+=String.fromCharCode(224|((a>>>12)&15),128|((a>>>6)&63),128|(a&63))}else{if(a<=2097151){b+=String.fromCharCode(240|((a>>>18)&7),128|((a>>>12)&63),128|((a>>>6)&63),128|(a&63))}}}}}return b}function rstr2binl(b){var a=Array(b.length>>2);for(var c=0;c<a.length;c++){a[c]=0}for(var c=0;c<b.length*8;c+=8){a[c>>5]|=(b.charCodeAt(c/8)&255)<<(c%32)}return a}function binl2rstr(b){var a="";for(var c=0;c<b.length*32;c+=8){a+=String.fromCharCode((b[c>>5]>>>(c%32))&255)}return a}function binl_md5(p,k){p[k>>5]|=128<<((k)%32);p[(((k+64)>>>9)<<4)+14]=k;var o=1732584193;var n=-271733879;var m=-1732584194;var l=271733878;for(var g=0;g<p.length;g+=16){var j=o;var h=n;var f=m;var e=l;o=md5_ff(o,n,m,l,p[g+0],7,-680876936);l=md5_ff(l,o,n,m,p[g+1],12,-389564586);m=md5_ff(m,l,o,n,p[g+2],17,606105819);n=md5_ff(n,m,l,o,p[g+3],22,-1044525330);o=md5_ff(o,n,m,l,p[g+4],7,-176418897);l=md5_ff(l,o,n,m,p[g+5],12,1200080426);m=md5_ff(m,l,o,n,p[g+6],17,-1473231341);n=md5_ff(n,m,l,o,p[g+7],22,-45705983);o=md5_ff(o,n,m,l,p[g+8],7,1770035416);l=md5_ff(l,o,n,m,p[g+9],12,-1958414417);m=md5_ff(m,l,o,n,p[g+10],17,-42063);n=md5_ff(n,m,l,o,p[g+11],22,-1990404162);o=md5_ff(o,n,m,l,p[g+12],7,1804603682);l=md5_ff(l,o,n,m,p[g+13],12,-40341101);m=md5_ff(m,l,o,n,p[g+14],17,-1502002290);n=md5_ff(n,m,l,o,p[g+15],22,1236535329);o=md5_gg(o,n,m,l,p[g+1],5,-165796510);l=md5_gg(l,o,n,m,p[g+6],9,-1069501632);m=md5_gg(m,l,o,n,p[g+11],14,643717713);n=md5_gg(n,m,l,o,p[g+0],20,-373897302);o=md5_gg(o,n,m,l,p[g+5],5,-701558691);l=md5_gg(l,o,n,m,p[g+10],9,38016083);m=md5_gg(m,l,o,n,p[g+15],14,-660478335);n=md5_gg(n,m,l,o,p[g+4],20,-405537848);o=md5_gg(o,n,m,l,p[g+9],5,568446438);l=md5_gg(l,o,n,m,p[g+14],9,-1019803690);m=md5_gg(m,l,o,n,p[g+3],14,-187363961);n=md5_gg(n,m,l,o,p[g+8],20,1163531501);o=md5_gg(o,n,m,l,p[g+13],5,-1444681467);l=md5_gg(l,o,n,m,p[g+2],9,-51403784);m=md5_gg(m,l,o,n,p[g+7],14,1735328473);n=md5_gg(n,m,l,o,p[g+12],20,-1926607734);o=md5_hh(o,n,m,l,p[g+5],4,-378558);l=md5_hh(l,o,n,m,p[g+8],11,-2022574463);m=md5_hh(m,l,o,n,p[g+11],16,1839030562);n=md5_hh(n,m,l,o,p[g+14],23,-35309556);o=md5_hh(o,n,m,l,p[g+1],4,-1530992060);l=md5_hh(l,o,n,m,p[g+4],11,1272893353);m=md5_hh(m,l,o,n,p[g+7],16,-155497632);n=md5_hh(n,m,l,o,p[g+10],23,-1094730640);o=md5_hh(o,n,m,l,p[g+13],4,681279174);l=md5_hh(l,o,n,m,p[g+0],11,-358537222);m=md5_hh(m,l,o,n,p[g+3],16,-722521979);n=md5_hh(n,m,l,o,p[g+6],23,76029189);o=md5_hh(o,n,m,l,p[g+9],4,-640364487);l=md5_hh(l,o,n,m,p[g+12],11,-421815835);m=md5_hh(m,l,o,n,p[g+15],16,530742520);n=md5_hh(n,m,l,o,p[g+2],23,-995338651);o=md5_ii(o,n,m,l,p[g+0],6,-198630844);l=md5_ii(l,o,n,m,p[g+7],10,1126891415);m=md5_ii(m,l,o,n,p[g+14],15,-1416354905);n=md5_ii(n,m,l,o,p[g+5],21,-57434055);o=md5_ii(o,n,m,l,p[g+12],6,1700485571);l=md5_ii(l,o,n,m,p[g+3],10,-1894986606);m=md5_ii(m,l,o,n,p[g+10],15,-1051523);n=md5_ii(n,m,l,o,p[g+1],21,-2054922799);o=md5_ii(o,n,m,l,p[g+8],6,1873313359);l=md5_ii(l,o,n,m,p[g+15],10,-30611744);m=md5_ii(m,l,o,n,p[g+6],15,-1560198380);n=md5_ii(n,m,l,o,p[g+13],21,1309151649);o=md5_ii(o,n,m,l,p[g+4],6,-145523070);l=md5_ii(l,o,n,m,p[g+11],10,-1120210379);m=md5_ii(m,l,o,n,p[g+2],15,718787259);n=md5_ii(n,m,l,o,p[g+9],21,-343485551);o=safe_add(o,j);n=safe_add(n,h);m=safe_add(m,f);l=safe_add(l,e)}return Array(o,n,m,l)}function md5_cmn(h,e,d,c,g,f){return safe_add(bit_rol(safe_add(safe_add(e,h),safe_add(c,f)),g),d)}function md5_ff(g,f,k,j,e,i,h){return md5_cmn((f&k)|((~f)&j),g,f,e,i,h)}function md5_gg(g,f,k,j,e,i,h){return md5_cmn((f&j)|(k&(~j)),g,f,e,i,h)}function md5_hh(g,f,k,j,e,i,h){return md5_cmn(f^k^j,g,f,e,i,h)}function md5_ii(g,f,k,j,e,i,h){return md5_cmn(k^(f|(~j)),g,f,e,i,h)}function safe_add(a,d){var c=(a&65535)+(d&65535);var b=(a>>16)+(d>>16)+(c>>16);return(b<<16)|(c&65535)}function bit_rol(a,b){return(a<<b)|(a>>>(32-b))};


(function(){var a=this;var b=a._;var c={};var d=Array.prototype,e=Object.prototype,f=Function.prototype;var g=d.slice,h=d.unshift,i=e.toString,j=e.hasOwnProperty;var k=d.forEach,l=d.map,m=d.reduce,n=d.reduceRight,o=d.filter,p=d.every,q=d.some,r=d.indexOf,s=d.lastIndexOf,t=Array.isArray,u=Object.keys,v=f.bind;var w=function(a){return new B(a)};if(typeof module!=="undefined"&&module.exports){module.exports=w;w._=w}else{a._=w}w.VERSION="1.1.6";var x=w.each=w.forEach=function(a,b,d){if(a==null)return;if(k&&a.forEach===k){a.forEach(b,d)}else if(w.isNumber(a.length)){for(var e=0,f=a.length;e<f;e++){if(b.call(d,a[e],e,a)===c)return}}else{for(var g in a){if(j.call(a,g)){if(b.call(d,a[g],g,a)===c)return}}}};w.map=function(a,b,c){var d=[];if(a==null)return d;if(l&&a.map===l)return a.map(b,c);x(a,function(a,e,f){d[d.length]=b.call(c,a,e,f)});return d};w.reduce=w.foldl=w.inject=function(a,b,c,d){var e=c!==void 0;if(a==null)a=[];if(m&&a.reduce===m){if(d)b=w.bind(b,d);return e?a.reduce(b,c):a.reduce(b)}x(a,function(a,f,g){if(!e&&f===0){c=a;e=true}else{c=b.call(d,c,a,f,g)}});if(!e)throw new TypeError("Reduce of empty array with no initial value");return c};w.reduceRight=w.foldr=function(a,b,c,d){if(a==null)a=[];if(n&&a.reduceRight===n){if(d)b=w.bind(b,d);return c!==void 0?a.reduceRight(b,c):a.reduceRight(b)}var e=(w.isArray(a)?a.slice():w.toArray(a)).reverse();return w.reduce(e,b,c,d)};w.find=w.detect=function(a,b,c){var d;y(a,function(a,e,f){if(b.call(c,a,e,f)){d=a;return true}});return d};w.filter=w.select=function(a,b,c){var d=[];if(a==null)return d;if(o&&a.filter===o)return a.filter(b,c);x(a,function(a,e,f){if(b.call(c,a,e,f))d[d.length]=a});return d};w.reject=function(a,b,c){var d=[];if(a==null)return d;x(a,function(a,e,f){if(!b.call(c,a,e,f))d[d.length]=a});return d};w.every=w.all=function(a,b,d){var e=true;if(a==null)return e;if(p&&a.every===p)return a.every(b,d);x(a,function(a,f,g){if(!(e=e&&b.call(d,a,f,g)))return c});return e};var y=w.some=w.any=function(a,b,d){b||(b=w.identity);var e=false;if(a==null)return e;if(q&&a.some===q)return a.some(b,d);x(a,function(a,f,g){if(e=b.call(d,a,f,g))return c});return e};w.include=w.contains=function(a,b){var c=false;if(a==null)return c;if(r&&a.indexOf===r)return a.indexOf(b)!=-1;y(a,function(a){if(c=a===b)return true});return c};w.invoke=function(a,b){var c=g.call(arguments,2);return w.map(a,function(a){return(b.call?b||a:a[b]).apply(a,c)})};w.pluck=function(a,b){return w.map(a,function(a){return a[b]})};w.max=function(a,b,c){if(!b&&w.isArray(a))return Math.max.apply(Math,a);var d={computed:-Infinity};x(a,function(a,e,f){var g=b?b.call(c,a,e,f):a;g>=d.computed&&(d={value:a,computed:g})});return d.value};w.min=function(a,b,c){if(!b&&w.isArray(a))return Math.min.apply(Math,a);var d={computed:Infinity};x(a,function(a,e,f){var g=b?b.call(c,a,e,f):a;g<d.computed&&(d={value:a,computed:g})});return d.value};w.sortBy=function(a,b,c){return w.pluck(w.map(a,function(a,d,e){return{value:a,criteria:b.call(c,a,d,e)}}).sort(function(a,b){var c=a.criteria,d=b.criteria;return c<d?-1:c>d?1:0}),"value")};w.sortedIndex=function(a,b,c){c||(c=w.identity);var d=0,e=a.length;while(d<e){var f=d+e>>1;c(a[f])<c(b)?d=f+1:e=f}return d};w.toArray=function(a){if(!a)return[];if(a.toArray)return a.toArray();if(w.isArray(a))return a;if(w.isArguments(a))return g.call(a);return w.values(a)};w.size=function(a){return w.toArray(a).length};w.first=w.head=function(a,b,c){return b!=null&&!c?g.call(a,0,b):a[0]};w.rest=w.tail=function(a,b,c){return g.call(a,b==null||c?1:b)};w.last=function(a){return a[a.length-1]};w.compact=function(a){return w.filter(a,function(a){return!!a})};w.flatten=function(a){return w.reduce(a,function(a,b){if(w.isArray(b))return a.concat(w.flatten(b));a[a.length]=b;return a},[])};w.without=function(a){var b=g.call(arguments,1);return w.filter(a,function(a){return!w.include(b,a)})};w.uniq=w.unique=function(a,b){return w.reduce(a,function(a,c,d){if(0==d||(b===true?w.last(a)!=c:!w.include(a,c)))a[a.length]=c;return a},[])};w.intersect=function(a){var b=g.call(arguments,1);return w.filter(w.uniq(a),function(a){return w.every(b,function(b){return w.indexOf(b,a)>=0})})};w.zip=function(){var a=g.call(arguments);var b=w.max(w.pluck(a,"length"));var c=new Array(b);for(var d=0;d<b;d++)c[d]=w.pluck(a,""+d);return c};w.indexOf=function(a,b,c){if(a==null)return-1;var d,e;if(c){d=w.sortedIndex(a,b);return a[d]===b?d:-1}if(r&&a.indexOf===r)return a.indexOf(b);for(d=0,e=a.length;d<e;d++)if(a[d]===b)return d;return-1};w.lastIndexOf=function(a,b){if(a==null)return-1;if(s&&a.lastIndexOf===s)return a.lastIndexOf(b);var c=a.length;while(c--)if(a[c]===b)return c;return-1};w.range=function(a,b,c){if(arguments.length<=1){b=a||0;a=0}c=arguments[2]||1;var d=Math.max(Math.ceil((b-a)/c),0);var e=0;var f=new Array(d);while(e<d){f[e++]=a;a+=c}return f};w.bind=function(a,b){if(a.bind===v&&v)return v.apply(a,g.call(arguments,1));var c=g.call(arguments,2);return function(){return a.apply(b,c.concat(g.call(arguments)))}};w.bindAll=function(a){var b=g.call(arguments,1);if(b.length==0)b=w.functions(a);x(b,function(b){a[b]=w.bind(a[b],a)});return a};w.memoize=function(a,b){var c={};b||(b=w.identity);return function(){var d=b.apply(this,arguments);return j.call(c,d)?c[d]:c[d]=a.apply(this,arguments)}};w.delay=function(a,b){var c=g.call(arguments,2);return setTimeout(function(){return a.apply(a,c)},b)};w.defer=function(a){return w.delay.apply(w,[a,1].concat(g.call(arguments,1)))};var z=function(a,b,c){var d;return function(){var e=this,f=arguments;var g=function(){d=null;a.apply(e,f)};if(c)clearTimeout(d);if(c||!d)d=setTimeout(g,b)}};w.throttle=function(a,b){return z(a,b,false)};w.debounce=function(a,b){return z(a,b,true)};w.once=function(a){var b=false,c;return function(){if(b)return c;b=true;return c=a.apply(this,arguments)}};w.wrap=function(a,b){return function(){var c=[a].concat(g.call(arguments));return b.apply(this,c)}};w.compose=function(){var a=g.call(arguments);return function(){var b=g.call(arguments);for(var c=a.length-1;c>=0;c--){b=[a[c].apply(this,b)]}return b[0]}};w.after=function(a,b){return function(){if(--a<1){return b.apply(this,arguments)}}};w.keys=u||function(a){if(a!==Object(a))throw new TypeError("Invalid object");var b=[];for(var c in a)if(j.call(a,c))b[b.length]=c;return b};w.values=function(a){return w.map(a,w.identity)};w.functions=w.methods=function(a){return w.filter(w.keys(a),function(b){return w.isFunction(a[b])}).sort()};w.extend=function(a){x(g.call(arguments,1),function(b){for(var c in b){if(b[c]!==void 0)a[c]=b[c]}});return a};w.defaults=function(a){x(g.call(arguments,1),function(b){for(var c in b){if(a[c]==null)a[c]=b[c]}});return a};w.clone=function(a){return w.isArray(a)?a.slice():w.extend({},a)};w.tap=function(a,b){b(a);return a};w.isEqual=function(a,b){if(a===b)return true;var c=typeof a,d=typeof b;if(c!=d)return false;if(a==b)return true;if(!a&&b||a&&!b)return false;if(a._chain)a=a._wrapped;if(b._chain)b=b._wrapped;if(a.isEqual)return a.isEqual(b);if(w.isDate(a)&&w.isDate(b))return a.getTime()===b.getTime();if(w.isNaN(a)&&w.isNaN(b))return false;if(w.isRegExp(a)&&w.isRegExp(b))return a.source===b.source&&a.global===b.global&&a.ignoreCase===b.ignoreCase&&a.multiline===b.multiline;if(c!=="object")return false;if(a.length&&a.length!==b.length)return false;var e=w.keys(a),f=w.keys(b);if(e.length!=f.length)return false;for(var g in a)if(!(g in b)||!w.isEqual(a[g],b[g]))return false;return true};w.isEmpty=function(a){if(w.isArray(a)||w.isString(a))return a.length===0;for(var b in a)if(j.call(a,b))return false;return true};w.isElement=function(a){return!!(a&&a.nodeType==1)};w.isArray=t||function(a){return i.call(a)==="[object Array]"};w.isArguments=function(a){return!!(a&&j.call(a,"callee"))};w.isFunction=function(a){return!!(a&&a.constructor&&a.call&&a.apply)};w.isString=function(a){return!!(a===""||a&&a.charCodeAt&&a.substr)};w.isNumber=function(a){return!!(a===0||a&&a.toExponential&&a.toFixed)};w.isNaN=function(a){return a!==a};w.isBoolean=function(a){return a===true||a===false};w.isDate=function(a){return!!(a&&a.getTimezoneOffset&&a.setUTCFullYear)};w.isRegExp=function(a){return!!(a&&a.test&&a.exec&&(a.ignoreCase||a.ignoreCase===false))};w.isNull=function(a){return a===null};w.isUndefined=function(a){return a===void 0};w.noConflict=function(){a._=b;return this};w.identity=function(a){return a};w.times=function(a,b,c){for(var d=0;d<a;d++)b.call(c,d)};w.mixin=function(a){x(w.functions(a),function(b){D(b,w[b]=a[b])})};var A=0;w.uniqueId=function(a){var b=A++;return a?a+b:b};w.templateSettings={evaluate:/<%([\s\S]+?)%>/g,interpolate:/<%=([\s\S]+?)%>/g};w.template=function(a,b){var c=w.templateSettings;var d="var __p=[],print=function(){__p.push.apply(__p,arguments);};"+"with(obj||{}){__p.push('"+a.replace(/\\/g,"\\\\").replace(/'/g,"\\'").replace(c.interpolate,function(a,b){return"',"+b.replace(/\\'/g,"'")+",'"}).replace(c.evaluate||null,function(a,b){return"');"+b.replace(/\\'/g,"'").replace(/[\r\n\t]/g," ")+"__p.push('"}).replace(/\r/g,"\\r").replace(/\n/g,"\\n").replace(/\t/g,"\\t")+"');}return __p.join('');";var e=new Function("obj",d);return b?e(b):e};var B=function(a){this._wrapped=a};w.prototype=B.prototype;var C=function(a,b){return b?w(a).chain():a};var D=function(a,b){B.prototype[a]=function(){var a=g.call(arguments);h.call(a,this._wrapped);return C(b.apply(w,a),this._chain)}};w.mixin(w);x(["pop","push","reverse","shift","sort","splice","unshift"],function(a){var b=d[a];B.prototype[a]=function(){b.apply(this._wrapped,arguments);return C(this._wrapped,this._chain)}});x(["concat","join","slice"],function(a){var b=d[a];B.prototype[a]=function(){return C(b.apply(this._wrapped,arguments),this._chain)}});B.prototype.chain=function(){this._chain=true;return this};B.prototype.value=function(){return this._wrapped}})()