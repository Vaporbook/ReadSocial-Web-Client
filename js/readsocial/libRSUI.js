var _RS_UI = 'ui';

/**
Requires: ReadSocial Selection Lib, ReadSocial Template Lib, LAB.js
Required by: ReadSocial API Lib
*/

ReadSocial.UI = (function () {
  

  var partnerId;
  var debugging = false;
  var authstatus;
  var u, ui, uil, contentdoc, content;
  var modal,xdframe,notelist,authstatus,authedas,attach,respond,excerpt,backNav,groupNav,newGroup,groupText,groupHint,groupEdit,loggedin,loggedout,logoutlink;
  var modalShowing = false;
  var highlight;
  var scrolltop;
  var scrollbot;
  var notescroller;
  var activeView;
  var authwindow;
  var authwindowInterval;
  var dropzone;
  var launcherLoc;
  var fileList;
  var config;
  var fileDataUrl;
  var selectionAnchorPoint, modalAnchorPoint;
  var docOverflowRestore, bodyOverflowRestore;
  var authed = false;
  var posttype = 1;
  var domainIcons = _ReadSocial_UI_tmpl.domainIcons;
  var _deferredAuthCallback = function () {};
  
  var /* function */ _renderUI;
  
  function _init() {
    
    config = arguments[0];
    /*
    
    Configuring the UI:
      The config object has the following optional properties you can set:
        uri -- the base URI for the js root of the client API you use
        css -- an array of URIs to CSS files you want to load into the doc head to style the UI
                these should implement styles that correspond to the ReadSocial base CSS rules,
                or the jQuery UI themes.
    
    */
    
    if(typeof config == 'undefined') config = {}
    if(typeof config.uri == 'undefined') config.uri = 'http://localhost/';

    config.host = config.uri.split('//')[1].split('/')[0];
    
    if(!config.host) throw "Could not get host name from config URI";
    
    if(typeof config.debug != 'undefined') debugging = config.debug;
    if(typeof config.css == 'undefined') config.css = [
                _formatLibUrl("js/readsocial/css/rsui.css")
    ];

    if(typeof ReadSocial.API=='undefined') throw ('ReadSocial.API must be loaded first!');
    if(typeof jQuery=='undefined') throw ('jQuery is required!');
    for(var i=0; i < config.css.length; i++) {
      jQuery('head').append('<link href="'+config.css[i]+'" rel="stylesheet" type="text/css" />');
    };

    $LAB
         .script(_formatLibUrl("js/readsocial/lib/jquery-ui.min.js"))
         .script(_formatLibUrl("js/readsocial/lib/dropfile.js"))
         .wait(function () {
            
               contentdoc = ReadSocial.API.getContentDoc();

               content = ReadSocial.API.getContent();

               var c = contentdoc;

              uil = jQuery('#'+_RS_UI+'-launcher');
              // the modal container must be created
              // and defined by the API core
              modal = jQuery('.readsocial-uipane');
              if(!modal.size()>1) throw "No readsocial-modal container defined!";
              
              
              _renderUI = _.template(ReadSocial.UI.tmpl.dialog);


              modal.append(_renderUI({
                
                /* 
              
                Ultimately, we want to use this call to
                set up any custom parameters that might be
                used to style the chrome for particular
                client applications. Right now it's a
                placeholder.
              
                
                */

              }));
              
         
              authstatus = jQuery('.readsocial-authstatus');
              notelist = jQuery('.readsocial-notelist');
              excerpt = jQuery('.readsocial-selfield', modal);
              attach = jQuery('.readsocial-buttonContainer a.readsocial-attachButton');

              groupNav = jQuery('button.readsocial-groupNav');
              newGroup = jQuery('#readsocial-newgroup');
              groupHint = jQuery('button.readsocial-groupNav, .readsocial-groupbutton-hint');
              groupEdit = jQuery('.readsocial-groupEdit');
              groupText = jQuery('.readsocial-groupbutton-text');

              authedas = jQuery('.readsocial-postidentity');
              
              loggedin = jQuery('.readsocial-authstatus .logged-in');
              loggedout = jQuery('.readsocial-authstatus .logged-out');
              logoutlink = '<a href="#" onclick="ReadSocial.API.endSession(ReadSocial.UI.updateAuthStatus);return false;">Sign out</a>';
              xdframe = ReadSocial.API.getXdFrame();

              // modal window properties
              var tagline = 'ReadSocial';
              var props = {
                  title: '<div class="readsocial-dialogheader">\
                        <button class="readsocial-backNav"  style="inline-block">BACK</button>\
                        <div class="img-wrap"><img style="inline-block" width="93" height="15" title="" alt="" src="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAF0AAAAPCAYAAACGN8M/AAAAGXRFWHRTb2Z0d2FyZQBBZG9iZSBJbWFnZVJlYWR5ccllPAAAAyJpVFh0WE1MOmNvbS5hZG9iZS54bXAAAAAAADw/eHBhY2tldCBiZWdpbj0i77u/IiBpZD0iVzVNME1wQ2VoaUh6cmVTek5UY3prYzlkIj8+IDx4OnhtcG1ldGEgeG1sbnM6eD0iYWRvYmU6bnM6bWV0YS8iIHg6eG1wdGs9IkFkb2JlIFhNUCBDb3JlIDUuMC1jMDYwIDYxLjEzNDc3NywgMjAxMC8wMi8xMi0xNzozMjowMCAgICAgICAgIj4gPHJkZjpSREYgeG1sbnM6cmRmPSJodHRwOi8vd3d3LnczLm9yZy8xOTk5LzAyLzIyLXJkZi1zeW50YXgtbnMjIj4gPHJkZjpEZXNjcmlwdGlvbiByZGY6YWJvdXQ9IiIgeG1sbnM6eG1wPSJodHRwOi8vbnMuYWRvYmUuY29tL3hhcC8xLjAvIiB4bWxuczp4bXBNTT0iaHR0cDovL25zLmFkb2JlLmNvbS94YXAvMS4wL21tLyIgeG1sbnM6c3RSZWY9Imh0dHA6Ly9ucy5hZG9iZS5jb20veGFwLzEuMC9zVHlwZS9SZXNvdXJjZVJlZiMiIHhtcDpDcmVhdG9yVG9vbD0iQWRvYmUgUGhvdG9zaG9wIENTNSBNYWNpbnRvc2giIHhtcE1NOkluc3RhbmNlSUQ9InhtcC5paWQ6RTdBNDJFQTkwQkQ3MTFFMTk3NjBGMUIyMzE1QjEwNEIiIHhtcE1NOkRvY3VtZW50SUQ9InhtcC5kaWQ6RTdBNDJFQUEwQkQ3MTFFMTk3NjBGMUIyMzE1QjEwNEIiPiA8eG1wTU06RGVyaXZlZEZyb20gc3RSZWY6aW5zdGFuY2VJRD0ieG1wLmlpZDpFN0E0MkVBNzBCRDcxMUUxOTc2MEYxQjIzMTVCMTA0QiIgc3RSZWY6ZG9jdW1lbnRJRD0ieG1wLmRpZDpFN0E0MkVBODBCRDcxMUUxOTc2MEYxQjIzMTVCMTA0QiIvPiA8L3JkZjpEZXNjcmlwdGlvbj4gPC9yZGY6UkRGPiA8L3g6eG1wbWV0YT4gPD94cGFja2V0IGVuZD0iciI/PhsegrcAAANJSURBVHja7FgxixNBFN6EQ7C6xUqwcALCwRG4tVSUy1l5VXJibeIvMOm0MnZWniIIFpJYKNh4l0obzYqFZVZyCIKQtRDsLlcJgqxv5Bv5bpjNZS+JHJgHL7ObN+/Nm2/evDezuSRJPBft7OwsS3PBIXpbLBa/eHMyOF2S5oxD9EJw2nPpLKQYCqR5I3zCEj0XfjKHeh99En4kvGT9XxMc113A5zMCfk2M/PqHE/KFK8JqRvZLGfo5+woe3yH7bInOCb8SPBdHgn7EANek/dmaEeh14S7ag0j3W00TZgU+f4QBnzWFxBNTFuAXJgS8hjZGJHwU3qYoLeO5IxyRnk4ZK3h+Cn1DCvJFx3hGbw/jxKRTxTP7MEqvDMCHjnG/CrcPA7xgWYLdJQfwf3J8rt/vTxLhXYBrgH8AZ28LNwnoAO93MLkeZAq8Bkf1pFvQiaDnQ75q2dT9G1j4FsYfQkf7cB22u2hDtLrPWfgQ0NgtvA8RsSFkmhLyf5wTzUkH8Jo+CK/rSL/pAPynBi5DSilQxBiA2cktvJuoLgAAH5Ot0sQNKGbyXavobVCEa/1NsunRgndgV8FeRBHtYcG6NIcG+R/ChrJ2YZaIvyePjx2pZiOPiHhtCY/pgUWxMMYYEQHuUUppIkISRLCZcIAo61EUKoDqI0qHjnEa+H9AURmQjqF3aFcwbmiltjQQ9WLtwqemtUBZz+5XpXnoEN2SBWnn5eeHvFxxAH9K+P2YwLuoie3JHCHqfURmzlHI/BGLW0CQVACO79Dxx7Rn1yZ9irkPn9YmuCxpwJ8hcG3A7/49vUwZ+A4VrxigBrQjFOVfRTXBFLUapRJlFViFqG4DzCFsVShd3aACvQ37dbJRc/h8moow79apA77vyDhF4CMqYgOkl00Ct4nnXchN8VPI16ZAJ1RUPYDZw/91Ou4ZnQFsBhg/Rhti/AR9qg6fTa1poV8NfpUpJdVG7ZpxAdeUs7+9iPJxaV4KX7aUvwlfFAMD6/LiWTmTt3WQkvcVRXxMpwX7phijX0SL45Oe63YZOWpCQDsjsvzj/iXadcrywU+ZZybAnaAfAvj//YNXJsBTP3jpVCPGdKpZnsN6IOkb6Hn7yC0Y9tMUfgswAJLmWDH1LuGJAAAAAElFTkSuQmCC" /></div></div>',
                  modal:true,
                  resizable:false,
                  autoOpen: false,
                  width:470,
                  height:320,
                  show:"scale",
                  close: function () {
                    _hideUI();
                  }
              };
              modal.dialog(props);
              
              
              jQuery('.ui-dialog-titlebar').bind('mousedown',_hideLogin);
              
              
              modal.dialog().bind('startdrag',_hideLogin);
              
              // backNav is in the modal title, so depends on that first
              backNav = jQuery('button.readsocial-backNav');

              jQuery('button.readsocial-makeCommentNav').button().click(_showNoteCreate);

               if(jQuery('.readsocial-tabgroup button').size()<1) {
                 throw ("no publisher panel!");
               }
   
              _setupPostForm();

              backNav.button({

                 icons: {
                     primary: "ui-icon-triangle-1-w"
                 },
                 text: true
                 }).click(function () {

                   _showView('.readsocial-noteListView');
              });
              backNav.css({visibility:'hidden'});
/*
.appendTo('.readsocial-authstatus .authbutton')
*/


              _renderUI = _.template(ReadSocial.UI.tmpl.noteListNoItems);     
              
              jQuery('.readsocial-posts').append(
                _renderUI()
              );

              _setupGroupControl();

              _setupUIHandlers();


              jQuery('.readsocial-noteListView').append(ReadSocial.UI.tmpl.noteListNoItemsImg);
              
                // get initial auth status

              ReadSocial.API.getAuthStatus(function (session) {
      
                  _updateAuthStatus(session);

              });
  
              
              jQuery('p', contentdoc).trigger('count');

              ReadSocial.log('initUI done');

        });
    

  }
  
  function _setupUIHandlers() {
        
    jQuery('p',contentdoc).mousedown(ReadSocial.Sel.toggle);

    jQuery('p',contentdoc).mouseup(ReadSocial.Sel.toggle);

    jQuery('p',contentdoc).mousemove(ReadSocial.Sel.toggle);
        
    jQuery('p',contentdoc).bind('validSelection', function (e) {
      
    });
      
    _addCounters();
    
    var w = jQuery(window);   
    scrolltop = w.scrollTop();
    scrollbot = scrolltop + w.height();
    
    jQuery(window).bind('scroll',function (e) {
      
        var w = jQuery(window);   
        scrolltop = w.scrollTop();
        scrollbot = scrolltop + w.height();
      
        jQuery('p',contentdoc).trigger('count');
      
      });
    
    jQuery(window).bind('resize',function (e) {

        var w = jQuery(window);   
        scrolltop = w.scrollTop();
        scrollbot = scrolltop + w.height();
      
        jQuery('p',contentdoc).trigger('count');
      
      });
    
    
    // Buttons
    ReadSocial.log('setting up buttons');
    
    attach.button({icon:false}).click(_handleAttachButtonClick);
    
    ReadSocial.log('setting up group hashtag controls');
    _connectHashtagDropdown(_handleHashtagDropdownChange);

    // Load More Posts...
    ReadSocial.log('setting up load more button');
    _connectLoadMoreButton(_handleLoadMoreClick);
    
    // hide load more throbber container and fill it out
    
    jQuery('.readsocial-loadmore-throbber').hide();
    _renderUI = _.template(ReadSocial.UI.tmpl.throbberSmall);
    jQuery('.readsocial-loadmore-throbber').html(_renderUI());
    
  }
  

  function _popLogin() {

    
    if(!ReadSocial.API.isAuthed()) {
      
      ReadSocial.log('popping auth window');

      if(ReadSocial.API.isXd()) {
        
        
        attach.hide();
        // respond may not be defined at this point -
        // it's only available while viewing a note detail

        if(typeof respond !='undefined') {
          respond.hide();
        }

        var rf = jQuery('.readsocial-responseFormSubview');
        var nf = jQuery('.readsocial-publisher');

        var f = (rf.size()>0) ? rf : nf;

        var a = f.offset();

        ReadSocial.log(a);

        xdframe.css({
              position:'absolute',
              top:a.top+'px',
              left:a.left+'px',
              height:'100px',
              width:'453px',
              border:'none',
              padding:0,
              margin:0,
              zIndex:10000,
              opacity:1,
              visibility:'visible'
        });
        
      } else {
         authwindow = window.open(ReadSocial.API.getLoginURL(),'ReadSocial Authorization', 'height=500,width=400,resizable=no,scrollbars=no,toolbar=no,location=no,directories=no,status=no,menubar=no');
      	 if(typeof authwindow=='undefined') throw "Pop up windows must be enabled.";
      	 authwindow.focus();
      }

    }
  }
  
  function _hideLogin() {
    if(ReadSocial.API.isXd()) {
      
      attach.show();
      if(typeof respond != 'undefined') {
        respond.show();      
      }
      xdframe.css({
            position:'absolute',
            top:'-9999px',
            left:'0px',
            height:'1px',
            width:'1px',
            zIndex:-1,
            visibility:'hidden'
      });      
    }

  }

  function _setupGroupControl () {

    groupText.html(ReadSocial.API.getGroupName());
   
    groupNav.click(function () {

         var w = groupNav.width();

         groupHint.hide();

         groupEdit.css({display:'block',opacity:0,width:w});
         newGroup.val('[new or known group]');
         groupEdit.fadeTo(300,1,function () {
           newGroup.focus();
           newGroup.select();
         });
         
     });

     newGroup.focus(function () {

     });

     newGroup.blur(function () {
       groupEdit.hide();
       groupHint.fadeTo(300,1,function () {
          
       });
     });

     newGroup.keypress(function (e) {
       

       if(e.keyCode==13) {
         
         _setNewGroup();
         
       }
    
     
     });
  }

  function _setNewGroup()
  {
    if(
       newGroup.val()!=ReadSocial.API.getGroupName() &&
       jQuery.trim(newGroup.val()).length > 0
     ) {
       
       ReadSocial.API.setGroupName(newGroup.val());
       _refreshNotes(function () {
         ReadSocial.log('notes refreshed after group change');
       });
 
       // clear note count cache and recount
       _expireCount(jQuery('p',contentdoc)).trigger('count');
       
     }
     var newname = ReadSocial.API.getGroupName();      

     jQuery('.readsocial-groupNav').html(newname);
     groupEdit.hide();
     groupHint.fadeTo(300,1,function () {

     });
  }

  function _setupPostForm () {
    
     function _userFormShow(which) {

       var userfields = jQuery('.postfield');
       userfields.hide();
       jQuery(which).show();

     }
     
     // set up sprites on publisher buttons
     jQuery('.readsocial-tabgroup button').css({
      backgroundImage: ['url(',
      ReadSocial.UI.tmpl.sprites.publishIcons
      ,')'].join(''),
      height:'21px',
      width:'21px'
     });

     var msgbut =  jQuery('.readsocial-tabbutton-msg');
     var linkbut = jQuery('.readsocial-tabbutton-link');
     var filebut = jQuery('.readsocial-tabbutton-file');
     dropzone = jQuery('.readsocial-filedropzone');
     
    // order is link image note, disabled.enabled
    
     var linkdis = { backgroundPosition: '0 0'};
     var linken = { backgroundPosition: '-21px 0'};
     var filedis = { backgroundPosition: '-42px 0'};
     var fileen = { backgroundPosition: '-63px 0'};
     var notedis = { backgroundPosition: '-84px 0'};
     var noteen = { backgroundPosition: '-105px 0'};
    
     msgbut.css(notedis);
     linkbut.css(linkdis);
     filebut.css(filedis);
     
     jQuery('.readsocial-textentryarea textarea, .readsocial-linkentryarea input').bind('mousedown', function (e) {
       var v = jQuery(e.target).val();
       if(v.match(/^\[\[.+?\]\]/)) { // if placeholder text
         jQuery(e.target).val("");
       }
     });
       
     msgbut.click(function (e) {
       e.preventDefault();
       msgbut.css(noteen);
       linkbut.css(linkdis);
       filebut.css(filedis);
       _userFormShow(".readsocial-textentryarea");
       var fld = jQuery('.readsocial-textentryarea textarea');
       fld.html('enter a note');
       fld.focus();
       fld.select();
       posttype = 1;
     });
     linkbut.click(function (e) {
       e.preventDefault();
       msgbut.css(notedis);
       linkbut.css(linken);
       filebut.css(filedis);
        _userFormShow(".readsocial-linkentryarea");
        var fld = jQuery('.readsocial-linkentryarea input[name="link"]');
        fld.val('http://');
        fld.focus();
        fld.select();
        var fld2 = jQuery('.readsocial-linkentryarea input[name="link_note"]');
        fld2.val('title of link');
        posttype = 2;
     });
     filebut.click(function (e) {
       msgbut.css(notedis);
       linkbut.css(linkdis);
       filebut.css(fileen);
       e.preventDefault();
       _userFormShow(".readsocial-fileentryarea");
       var fld = jQuery('.readsocial-fileentryarea input[name="img_note"]');
       fld.val('image caption');
       posttype = 3;
     });

     var ignoreDrag = function(e) {
        var event = typeof e.originalEvent != 'undefined' ? e.originalEvent : e;
        if (event.stopPropagation) {
        	event.stopPropagation();
        }
        if (event.preventDefault) {
        	event.preventDefault();
        }
     };
     dropzone.bind('dragover', ignoreDrag).bind('dragenter', ignoreDrag).bind('drop', function (e) {
       
       /*
       
       For Safari 5, maybe inject the following in an iframe???
       No way to get a files data otherwise
       
                     <form enctype="multipart/form-data" method="post" class="legacy_image_post"><input type="file" name="img" onchange="ReadSocial.UI.handleFiles(this.files);" /></form><br/>\
                     
                     
       */

       e = (e&&e.originalEvent?e.originalEvent:window.event) || e;
       
       ignoreDrag(e);

       var files = (e.files || e.dataTransfer.files);

       var s = "";
 
       
       _handleFiles(files);

       return false;

     });

     
   }
   
  function _showNoteCreate() {
      
      _showView('.readsocial-noteCreateView');
      
       jQuery('.readsocial-tabbutton-msg').trigger("click");
      
  }

  function _showPublisherModal()
  {

    var mode = (arguments[0]);
     
    var sel = (mode) ? '.readsocial-noteCreateView' : '.readsocial-noteListView';
     
    if(arguments[0]) {
      sel = arguments[0];
    }
    
    ReadSocial.API.getAuthStatus(function (s) {
      ReadSocial.UI.updateAuthStatus(s);
    });
    excerpt.html('&ldquo;&nbsp;'+_shortHighlight(ReadSocial.API.getHighlight()));

// TODO - mark selection so focus change doesnt erase it
// TODO - unmark it when dialog is hidden

    //_hideOverflow();
    groupText.html(ReadSocial.API.getGroupName());
    modal.dialog("open");
    jQuery('button').blur();
    if(mode=='post') {
      _showNoteCreate();
    } else {
      _refreshNotes(function () {
        _showView(sel);
        ReadSocial.log('notes refreshed after publisher modal');
      });      
    }

    modalShowing = true;

  }
  
  function _refreshNotes(cb)
  {
    /*
      Used to completely refresh a note list based on current ReadSocial API state
    */

    ReadSocial.API.refreshNotes(function (o) {
      _updateNoteList(o,true);
      cb();
    });    
  }

 
  function _appendNotes(cb)
  {
    /*
      Used to append page of new results to a note list
    */

    ReadSocial.API.getNotes(function (o) {
      _updateNoteList(o,false);
      cb();
    });
  }

  function _hideUI(immediate)
  {
    ReadSocial.log('hideUI');

    ReadSocial.Sel.clearAll();
    //_restoreOverflow();
    if(immediate) {
      uil.hide();
    } else {
      uil.fadeTo(500, 0, function () {
        uil.hide();
      });
    }
  }


  function _syncContentDocNotes()
  { 
    content.each(function (i, n) {
          
    });
  }
  
  function _hideOverflow()
  {

    bodyOverflowRestore = jQuery('body').css("overflow");
    ReadSocial.log(  bodyOverflowRestore);
    jQuery('body').css({

      overflow:"hidden"

    });
    /*
    ui.css({

      position:"fixed",
      top:"0",
      left:"0",
      height:"100%",
      width:"100%",
      padding:"0px",
      border:"none",
      backgroundColor:"gray",
      color:"#222",
      opacity:".5"

    });
    ui.show();
*/
  }

  function _restoreOverflow()
  {
    //ui.hide();
    jQuery('body').css({

      overflow:bodyOverflowRestore

    }); 
  }
  
  function _addCounters()
  {

    jQuery('p',contentdoc).bind('count', _handleNoteCount);

  }
  
  function _hideNoteFlags()
  {
    jQuery('div.note-flag').hide();  
  }
  
  function _handleNoteCount(e)
  {

      var top = scrolltop;
      var bot = scrollbot;
      var pel = jQuery(this);
      var pt = pel.offset().top;
 
      // if top of para in view
      var inview = (pt > top && pt < bot);
      // last time checked
      var lastcheck = pel.attr('data-lastcheck');
      var maxage, expired;
      // maximum age of count to allow
      maxage = 1 * 60; // 1 minute
      if(typeof lastcheck == 'undefined') { // first run
        expired = true;
      } else {
        // needs to be refreshed or not?
        expired = (new Date()).getTime() > (lastcheck + maxage);
      }

      if(inview) { // if in view 
        if(expired) { // and never checked or expired
          _countNotes(ReadSocial.hasher.hashElement(e.target), function (o) {
            pel.attr('data-notecount',o.count);
            pel.attr('data-lastcheck',(new Date()).getTime());
            var nf = _getNoteFlag(pel); 
            nf.html(o.count);
            if(o.count>0) {
              nf.css({
                display:'block',
                opacity:1,
                top:pt+'px'
              });      
            } else {
              nf.fadeTo(300,0);
            }
          });
        }
        
        if(pel.attr('data-notecount')>0) {
          _getNoteFlag(pel).css({
            position:'absolute',
            right:'0px',
            top:pt+'px',
            opacity:1,
            display:'block'
          });
        }
        
      }
    
  }

  function _expireCount(jq)
  {
    return jq.attr('data-lastcheck',-9999999999);
  }
  
  function _countNotes(hash, cb)
   {
     /*
       Gets a count for the specified par hash
     */

     ReadSocial.API.getNotesCount(hash, function (o) {
       cb(o);
     });

   }
  
  function _getNoteFlag(p)
  {
    // get this paragraph's own note flag
    var noteflag = p.next('div.note-flag');
    if(!noteflag.size()) { // if no, create
      p.after('<div class="note-flag" style="position:absolute;right:0px;display:none">0</div>');
      noteflag = p.next('div.note-flag');
      noteflag.click(function(e){

    		e.preventDefault();
    		p.trigger('mousedown');
    		p.trigger('mousemove');
    		p.trigger('mouseup');
    		ReadSocial.UI.showPublisherModal('post');
    		//return false;

    	});
    }
    return noteflag;
  }

    
  function _requestAuth(url, cb) {
    
    _deferredAuthCallback = cb;
    if(authwindow == null || typeof(authwindow) == "undefined") {
       alert("You will need to enable popups for this page in order to use the login features. Please follow your browser instructions for enabling popups on this page. Thanks."); 
    } else {
      authwindow.location.href = config.uri + url;
      ReadSocial.log('auth window:');
      ReadSocial.log(authwindow);       
    }
  }

  function _updateAuthStatus(session) {
    
    ReadSocial.log('updateAuthStatus:');
    ReadSocial.log(session);
    if(typeof authstatus=='undefined') {
      _handleLogoutEvent();
      return;
    }
    if(session.authed) {
      _handleLoginEvent(session);
    } else {
      _handleLogoutEvent();
    }
  }
  
  function _showView(sel) {

    ReadSocial.log('showView:'+sel);
    ReadSocial.log('hiding this view:');
 
    if(typeof selectedView != 'undefined') {
      jQuery(selectedView).hide(); 
    }
    
    selectedView = sel;
    
    var n = jQuery(sel);

    if(n.show().hasClass('viewlevel0')) {
      backNav.css({visibility:'hidden'});
    } else {
      backNav.css({visibility:'visible'});
    }

  }
  
  function _updateNoteList(notes) {
    
    var replace = true;
    if(arguments.length>1) {
      replace = arguments[1];
    }

    if(typeof notes == 'undefined') return;
    
    if(replace) {
      _clearView('.readsocial-posts ul');
    }
    
    if(notes.length==0) {
      ReadSocial.log('no notes here');

      jQuery('.readsocial-loadmore').hide();
      jQuery('.readsocial-bigzero').show();
      jQuery('.readsocial-background-nocomments').show();

      return;
    }
    jQuery('.readsocial-bigzero').hide();
    jQuery('.readsocial-background-nocomments').hide(); 
    jQuery('.readsocial-loadmore').show();
    // TODO use clear view here, but only conditionally
    //_clearViewjQuery('.readsocial-posts ul');
    
    // clear the newpost status
    jQuery('.readsocial-posts ul li').removeClass('newpost');
        
    for(var i=0; i < notes.length; i++) {
      var note = notes[i];
      if(typeof note.body == 'undefined') {
        note.body = '';
      } else {
        note.body = _shorten(note.body,50);
      }
     
      if(note.img) {
        if(typeof note.img_small == 'undefined') {
          note.img_small = '#';
        }
        note.img_full_url = 
 'https://'+config.host+'/v1/'+note.rid+'/images/'+note.img_small;
        _renderUI = _.template(ReadSocial.UI.tmpl.noteImageListItem);           
      } else if(note.link) {
        _renderUI = _.template(ReadSocial.UI.tmpl.noteLinkListItem);   
      } else {
        _renderUI = _.template(ReadSocial.UI.tmpl.noteListItem);        
      }

      
      
/* TODO will this clobber handlers too? */
      var cl = ((i+1)%2==0) ?
        'noteitem-even':
        'noteitem-odd';
      note.clname = cl;
      if(typeof note.hi_raw == 'undefined') note.hi_raw = "";
      jQuery('.readsocial-posts ul').append(
        _renderUI(note)
      );
      
    }

    // add a newpost status to add handler only to new ones
    
    jQuery('.readsocial-posts ul li.li-noteitem').addClass('newpost'); 

    jQuery('.readsocial-posts ul li.newpost'/* div.readsocial-note-item'*/).click(_handleNoteDetail);
    
    jQuery('.readsocial-loadmore').show();
    
    if(typeof notescroller == 'undefined') {
      
      //notescroller = jQuery(".readsocial-posts").touchScroll();
      
    }
  }
  
  
  function _updateResponseList(responses) {

    ReadSocial.log('updating responses list');

    if(typeof responses == 'undefined') return;
    
    jQuery('.readsocial-responseListSubview .readsocial-responsethrobber').hide();
    
    _clearView('.readsocial-responseListSubview ul');
    
    var rl = jQuery('.readsocial-responseListSubview ul');
    
    if(responses.length==0) {
      
      ReadSocial.log('no responses here');
      
      rl.append('<div>No responses to this. Add one by clicking the "Reply" button above.</div>');

      return;
    }

    jQuery('li',rl).removeClass('newpost');
        
    for(var i=0; i < responses.length; i++) {
      var response = responses[i];
      ReadSocial.log(response);
      _renderUI = _.template(ReadSocial.UI.tmpl.responseListItem);
      rl.append(
        _renderUI(response)
      );
    }

    jQuery('li.li-responseitem', rl).addClass('newpost'); 

    _showResponseListSubview();
    
    if(typeof responsescroller == 'undefined') {
      
    //  responsescroller = jQuery(".readsocial-posts").touchScroll();
      
    }
  }
  
  
  function _clearView(sel) {
    jQuery(sel).empty();
  }
  
  function _handleNoteDetail(e) {
    
    var n = jQuery(e.target);
    if (!n.hasClass('.readsocial-note-item')) {
      ReadSocial.log('does not have class');
      ReadSocial.log(n);
      var n = jQuery(e.target).parents('.li-noteitem'); 
      ReadSocial.log(n);
    }

    var noteId = jQuery('.readsocial-note-item',n).attr('data-note_id');
    
    if(typeof noteId == 'undefined') return;
    
    e.preventDefault();
    e.stopPropagation();
    
    _clearView('.readsocial-magnifier .readsocial-note');
    _showView('.readsocial-noteDetailView');

    ReadSocial.log('getting note '+noteId);
    _clearView('.readsocial-noteDetailView');
    
    jQuery('.readsocial-noteDetailView').append(ReadSocial.UI.tmpl.throbber);
    
    ReadSocial.API.getNoteDetail(noteId, function (o) {
      

      _clearView('.readsocial-noteDetailView');

      
      if (o.link) { // link
           _renderUI = _.template(ReadSocial.UI.tmpl.linkDetail);
      } else if (typeof o.img != 'undefined') { // image
            o.img_full_url = 
          'https://'+config.host+'/v1/'+o.rid+'/images/'+o.img_small;
            ReadSocial.log(o.img_full_url);
           _renderUI = _.template(ReadSocial.UI.tmpl.imgDetail);
      } else { // just note
           _renderUI = _.template(ReadSocial.UI.tmpl.noteDetail);
      }

      
      o.hi_raw = (typeof o.hi_raw !='undefined') ? _shortHighlight(o.hi_raw) :"";

      

      jQuery('.readsocial-noteDetailView').append(_renderUI(o));

      jQuery('.readsocial-reply-button').attr('data-note_id', o._id);

      jQuery('.readsocial-noteDetailView').append(ReadSocial.UI.tmpl.responseFormSubview);

      jQuery('.readsocial-noteDetailView').append(ReadSocial.UI.tmpl.responseListSubview);

      respond = jQuery('.readsocial-buttonContainer a.readsocial-respondButton');

      respond.button(
        {
          text:true,
          icons: { primary: "ui-icon-comment" },
          label: (ReadSocial.API.authed) ? 'Post It!' : 'Login to Post',
      }).click(_handleRespondButtonClick);

      // hook up toggle button
      jQuery('.readsocial-reply-button').button({
           icons: { primary: "ui-icon-comment" },
           text: true
       }).toggle(_showResponseFormSubview, _showResponseListSubview);
       
      // add throbber for loading
      _renderUI = _.template(ReadSocial.UI.tmpl.throbberSmall);
      jQuery('.readsocial-responseListSubview .readsocial-responsethrobber').html(_renderUI());
       
      ReadSocial.API.getResponses(noteId, function (rlist) {
        _updateResponseList(rlist);
      });

    });
    
  }
  
  
  function _showResponseFormSubview () {
        // reveal subview for list
        // show form
        jQuery('.readsocial-reply-button').button({label:'Cancel',icons:{ primary: "ui-icon-cancel" }});
        jQuery('.readsocial-responseListSubview').fadeTo(200, 0, function () {
          jQuery('.readsocial-responseFormSubview').fadeTo(200, 1, function () {
          }).show();
        }).hide();
  }
    
  function _showResponseListSubview() {
        // hide form, reveal subview for form
        jQuery('.readsocial-reply-button').button(
          {
            label:'Reply',
            icons: { primary: "ui-icon-comment" }
          });
        jQuery('.readsocial-responseFormSubview').fadeTo(200, 0, function () {
          jQuery('.readsocial-responseListSubview').fadeTo(200, 1, function () {
          }).show();
        }).hide();
  }
  
  function _handleHashtagDropdownChange(e) {
    ReadSocial.API.changeChannel(jQuery(this).val());
  }

  function _connectHashtagDropdown(f){
    jQuery('.readsocial-hashtag').change(f);
  }


  
  function _connectLoadMoreButton (f) {
    jQuery('.readsocial-loadmore button').click(f);
  }
  
  function _handleLoadMoreClick() {
    
    jQuery('.readsocial-loadmore button').hide();
    jQuery('.readsocial-loadmore-throbber').show();
  
    //var last = jQuery('.readsocial-posts ul li.newpost::last-child div')[0];
    
    //var olderthan = last.dataset.crstamp;
    
    //ReadSocial.log('will retrieve posts older than '+olderthan);
    
    _appendNotes(function (o) {

      jQuery('.readsocial-loadmore-throbber').hide();
      jQuery('.readsocial-loadmore button').show();
          
    });
    
  }
        
  function _handleLoginEvent(session) {
    _hideLogin();
    ReadSocial.log('login event');
    if(!session.authed) return;
    attach.html('Attach It!');
    loggedin.html('<div class="icon">'+domainIcons[session.user.udom]+'</div><div class="link">'+logoutlink+'</div><div class="username">'+session.user.uname+'</div>')
    loggedin.show();
    loggedout.hide();
    jQuery('.readsocial-screen-name',authedas).html('<div class="vc">Posting as  '+session.user.uname.toUpperCase()+'</div>&nbsp;&nbsp;'+domainIcons[session.user.udom]);
    if(typeof respond != 'undefined') {
      
    }
  }

  function _handleLogoutEvent() {
    ReadSocial.log('logout event');
    attach.html(ReadSocial.UI.messaging.LOGIN_TO_POST);
    ReadSocial.log('logout event 2');
    loggedout.html(ReadSocial.UI.messaging.NOT_LOGGED_IN);
        ReadSocial.log('logout event 3');
    loggedout.show();
        ReadSocial.log('logout event 4');
    loggedin.hide();
        ReadSocial.log('logout event 5');
    jQuery('.readsocial-screen-name').html('Not logged in');
     ReadSocial.log('logout event 6');
  }
  



  function _getNoteForPostType() {
    var n = jQuery('.readsocial-note').val();

    if (posttype==1) { // note
      // clear link and image fields
      jQuery('.readsocial-linkentryarea input[name="link_note"]').val('');
      jQuery('.readsocial-linkentryarea input[name="link"]').val('');
    } else if (posttype==2) { // link
      // clear note and img fields
      jQuery('.readsocial-note').val('');
      jQuery('.readsocial-fileentryarea input[name="img_note"]').val('');
      n = {
        body: jQuery('.readsocial-linkentryarea input[name="link_note"]').val(),
        link: jQuery('.readsocial-linkentryarea input[name="link"]').val(),
        img:null
      }
    } else if (posttype==3) { // image
      // clear note and link fields
      jQuery('.readsocial-note').val('');
      jQuery('.readsocial-linkentryarea input[name="link_note"]').val('');
      jQuery('.readsocial-linkentryarea input[name="link"]').val('');
      n = {
        body: jQuery('.readsocial-fileentryarea input[name="img_note"]').val(),
        img: fileDataUrl,
        link: null
      }
      
    }
    return n;
  }
  
   function _handleFiles(files)
   {
     // on file control change event


     fileDataUrl = null;
     
     if(typeof files == 'undefined') return false;
     if(!files.length) return false;
     
     var file = files[0];


     if(file.size > 2000000) { // stub for validation
       alert("Images must be under 2Mb.");
       return false;
     }

     if(!file.type.match(/^image\/(png|jpe?g|gif)/i)) { // stub for validation
       alert("Only png, jpg or gif images are allowed.");
       return false;
     }

     var reader = new FileReader();  
     reader.onload = function(e) {
       ReadSocial.log(e);
         fileDataUrl = e.target.result;
         dropzone.html(file.name);
     };
     reader.onerror = function(e) {
         ReadSocial.log(e);
     };
     reader.readAsDataURL(file);
     
   
     

   }

  function _shortHighlight(h)
  {
    var max = 180;
    return _shorten(h,max);
  }
  
  function _formatLibUrl(url)
 	{
 	  console.log(window.location);
 	  if(window.location.pathname.match(/\.html?$/i)) { // static file load
 	    return url;
 	  } else {
 	    return _RS_ROOT + '/' +url
 	  }
 	}
  
  function _shorten(h,max)
  {
    var ol = h.length;
    if(ol<=max) return h;
    var words = h.substr(0,max).split(' ');
    words.pop();
    var mod = words.join(' ');
    if(mod.length<ol) {
      mod += '...';
    }
    return mod;
  }
  
  function _handleAttachButtonClick(e) {
  
    ReadSocial.log('attach button click handler');

    e.preventDefault();
    e.stopPropagation();

    if(!ReadSocial.API.authed) {
      
        _popLogin();

    } else {
      
        var n = _getNoteForPostType();
        ReadSocial.API.postNote( n, _returnFromPost );
      
    }
    return false;
  }
  

  function _handleRespondButtonClick(e) {
    
    ReadSocial.log('attach button click handler');
    
    e.preventDefault();
    e.stopPropagation();
    
    var noteId = jQuery('.readsocial-note-item-detail').attr('data-note_id');
    
    if(!ReadSocial.API.authed) {
      
      _popLogin();
      
    } else {
      
        ReadSocial.API.postResponse(
          noteId,
          jQuery('.readsocial-response').val(),
          function (d) {
            if(typeof d.auth != 'undefined') {
              
              _popLogin();
      
            } else {
              _returnFromResponse(d);
            }
          });    
    }
    
    return false;
  }
  
  function _returnFromPost(d) {

    _showView('.readsocial-noteListView');
    _refreshNotes(function () {
      ReadSocial.log('notes refreshed after new post');
    });
    _expireCount(jQuery(ReadSocial.Sel.getCurrentPara())).trigger('count');
    
  }
  
  function _returnFromResponse(d) {
    
    var o = (typeof d !== 'object') ? jQuery.parseJSON(d) : d;
    ReadSocial.API.getResponses(o.note_id, function (rlist) {
      _updateResponseList(rlist);
    });
  }

  
  return {
    
    requestAuth: _requestAuth,
    
    updateAuthStatus: _updateAuthStatus,
    
    syncContentDocNotes: _syncContentDocNotes,
    
    updateNoteList: _updateNoteList,
    
    handleFiles: _handleFiles,
    
    getCurrentParagraph: ReadSocial.Sel.getCurrentPara,
    
    showPublisherModal: _showPublisherModal,

    init: _init,

    messaging: {
      
      LOGIN_TO_POST: 'Log in to post',
      NOT_LOGGED_IN: 'NOT LOGGED IN'
      
    },
    
    inlineStyles: {
      
      noteflag: 'float: right; position: relative; right: -3em; top: -3em; padding: .5em; background-color: yellow; border: 1px solid gray;'  
      
    },
    tmpl:  _ReadSocial_UI_tmpl
    
  };
  
  
})();
