function readsocial(config) { /* readsocial bootstrapper for x-domain loading */
  if(typeof document != 'undefined') {
   if(typeof document.body != 'undefined') {
     if(typeof config !='undefined') {
       if(typeof config.host_uri !='undefined') {
         if(typeof config.partner_id !='undefined') {
           if(typeof config.group_id !='undefined') {
             if(typeof config.container !='undefined') {
               if(typeof config.load_handler != 'function') config.load_handler = function(){;};
               if(typeof config.use_ui == 'undefined') config.use_ui = false;
               var s1 = document.createElement('SC'+'RIPT');
               s1.setAttribute('type', 'text/javascript');
               s1.onload=function() {
                 if(typeof ReadSocial!='undefined') {
                   ReadSocial.API.load(config);
                 }
               }
               s1.src = /*config.host_uri + window.location.path + */'js/readsocial/libRSAPI.js';
               document.body.appendChild(s1);
             }
            }
         }
       }
     }
   } 
  }
}