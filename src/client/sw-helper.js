/**
 * Register and communicate with the service worker
 */

 // register the service worker
 if(navigator.serviceWorker) {
	 // make sure it's registered
	 navigator.serviceWorker.register("/service-worker.js");

	 // listen for messages
	 navigator.serviceWorker.addEventListener("message", e => {
		 // we just updated
		 if(e.data.type == "version-change") {
			 console.log("Updated to", e.data.version);

			 // in dev mode reload the page
			 if(e.data.version.indexOf("@") !== -1) {
				 location.reload();
			 }
		 }
         // a notification was just clicked or something
         else if(e.data.type == "navigate") {
             lifeLine.nav.navigate(e.data.url);
         }
	 });
 }
