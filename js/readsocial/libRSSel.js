ReadSocial.Sel = (function () {
  
  
  var launcherLoc = { left:0, top:0 };
  var pointerLoc = { x:0, y:0 }
  var currentParagraph;
  var currentHighlight;
  var mouseIsDown = false;
  var markid;
  var launcherHTML = '<div id="selui-launcher" class="launcher readsocial-buttonbox launcherButtonBox launcherButton" style="display:none">\
				</div>';

  var launcher;

  jQuery(document).ready(function () {
    
	  jQuery('body').append(launcherHTML);    

  	launcher = jQuery('#selui-launcher');

  	launcher.mousedown(function(e){

  		e.preventDefault();
  		e.stopPropagation();
  	  ReadSocial.UI.showPublisherModal();
  		//return false;

  	});

  });

	  /*
	  
	  Same deal as above with the launcher button
	  
	  */

	
  jQuery(window).resize(function (e) {
    _showCursor();
  });

  function _toggleBySelector (sel) {
    
    jQuery(sel).trigger('mouseup');
    
  }


  HTMLParagraphElement.prototype.relMouseCoords = function (event){
      var totalOffsetX = 0;
      var totalOffsetY = 0;
      var elX = 0;
      var elY = 0;
      var currentElement = this;

      do{
          totalOffsetX += currentElement.offsetLeft;
          totalOffsetY += currentElement.offsetTop;
      }
      while(currentElement = currentElement.offsetParent)

      elX = event.pageX - totalOffsetX;
      elY = event.pageY - totalOffsetY;

      return {x:elX, y:elY}
  }

   
  function _toggleParagraph (e) {
    
    var type = (e.type=='mouseup') ? 'selend' :
                  (e.type=='mousedown') ? 'selstart' :
                    'selmove';
    
    var p = e.target;
    var el = jQuery(p);
    if(el[0].nodeName.toLowerCase()!='p') {
     var el = el.parents('p');
    }
    if(!el.size()) {
      
      ReadSocial.log('there is no paragraph here');
      return false;
    }
    var eln = el[0];
    if(type=='selstart') {
      
      _clearAll();
      mouseIsDown = true;
      currentParagraph = eln;
      ReadSocial.API.setContext(_getSelectionContext());
      ReadSocial.API.setLocator(_getDOMLocation(eln));
      ReadSocial.API.setNode(currentParagraph);
      // highlight this item as selected
      var p = jQuery(currentParagraph);
      p.addClass('bghilite');

      // capture mousedown location for pointer placement
      pointerLoc = currentParagraph.relMouseCoords(e);

    } else if(type=='selend') {
      
      ReadSocial.log('selection ending...');
      ReadSocial.log(_getHighlight());
      
      mouseIsDown = false;
      if(eln==currentParagraph && _getHighlight().length<1) {
        
        alert('you clicked the same paragraph and there is no selection');
        
      }
      ReadSocial.API.setHighlight(_getHighlight());

      //_markSelection();

    } else if(type=='selmove') {
      if(mouseIsDown) {
      
      }
    }

    _showCursor();

  //  e.preventDefault();


   
  }
  
  function _getHighlight()
  {
    
    if(currentParagraph) {
      var s = window.getSelection();
      if(s.toString().length) {
        return s.toString();
      } else {
        return _getSelectionContext();
      }
    } else {
      return '';
    }
    
  }
  
  
   function _getSelectionContext ()
   {
      return jQuery(currentParagraph).text().trim();
   }
  
   function _clearAll () {
     
      jQuery(currentParagraph).removeClass('bghilite');
      jQuery('p.bghilite').removeClass('bghilite');
      // remove selected status from selected items
      jQuery('p.readsocial-selected').removeClass('readsocial-selected');
      currentParagraph = null;
      currentHighlight = null;
      launcher.hide();
   }
   
  function _showCursor() {

    launcherLoc = _getCursorLoc();
    _reposLauncher(launcherLoc);
    launcher.show();
    //pointer.show();

  }
  
  function _getCursorLoc() {
    launcherLoc = {
         left:-7000,
         top:0
    };

    var p = jQuery(currentParagraph);
    
    var ox = -1 * pointerLoc.x - 20;//20;
    var oy = -1 * pointerLoc.y + 40;//10;

    var cpp = p.position();
    if(cpp) {
      launcherLoc.left=cpp.left-ox;
      launcherLoc.top=cpp.top-oy;      
    }
    
   
    return launcherLoc;

  }

  function _reposLauncher(launcherLoc) {

      launcher.css({
        top:launcherLoc.top+"px",
        left:launcherLoc.left+"px",
        position:"absolute",
        opacity:1
      }); 

  }

  function _markSelection()
  {

    if(window.getSelection().toString().length>0) {
      var r = window.getSelection().getRangeAt(0);
      ReadSocial.log(r);
      if(r.startContainer.nodeType==3) {
        var p = jQuery(r.startContainer).parent('p');
        if(p.size()) {
          var newh = _mark(p.html(), r);
          p.html(newh); 
        }
      } else if(r.startContainer.nodeType==1) {
        
        
      }

    }
  }

  function _unmark(html) {
    //jQuery('#')
  }

  function _mark(html,r)
  {
      if(!html) return "";
      markid = 'mark'+(new Date()).getTime();
      return [
          html.slice(0, r.startOffset),
          '<mark id="'+markid+'"><span>',
          html.slice(r.startOffset, r.endOffset),
          '</span></mark>',
          html.slice(r.endOffset)
        ].join('');
  }
  
  
	function _getDOMLocation(p) {
	  
	  // generate a location string for this dom element
	  var tags = [];
	  var index = jQuery(p).prevAll('p').size();
	  jQuery(p).parents().each(function (i, n) {
	    
	    tags.unshift(n.nodeName.toLowerCase());
	    
	  });
	  
	  var sel = (tags.join(' > ')+' > p:nth-child('+(index+1)+')');
 
	  return sel;
	  
	}
	
	
  return {
    
      toggle: _toggleParagraph,
      toggleBySelector: _toggleBySelector,
      clearAll: _clearAll,
      getContext: _getSelectionContext,
      getHighlight: _getHighlight,
      getLoc: _getCursorLoc,
      getCurrentPara: function () {
        return currentParagraph;
      }
    
  };

})();