/**
 * Handle reminders being pushed from the server
 */

self.addEventListener("push", function(e) {
	// parse the json
	var assignment = e.data.json();

	// get the title for the notification
	var title = assignment.type == "exam" ?
		`${assignment.name} - ${assignment.location}` :
		assignment.name;

	e.waitUntil(
		// load the fav icon from the cache
		getFavicon()

		.then(icon => {
			registration.showNotification(title, {
				icon,
				body: assignment.description || assignment.class,
				data: assignment
			});
		})
	);
});

self.addEventListener("notificationclick", function(e) {
	// get the url for the item
	var url = "/item/" + e.notification.data.id;

	// close when they click
	e.notification.close();

	e.waitUntil(
		// get all the windows
		clients.matchAll({ type: "window" })

		.then(wins => {
			for(let win of wins) {
				// check if we have a window we can focus
				if(win.focus) {
					// tell the window to navigate
					win.postMessage({
						type: "navigate",
						url
					});

					win.focus();
					return;
				}
			}

			// open a new window
			if(clients.openWindow) {
				clients.openWindow(url);
			}
		})
	);
});

// The code to load an image as a data url is paraphrased from the chrome devsummit site
// https://github.com/GoogleChrome/devsummit/blob/master/static/scripts/sw.js (around line 100)
//
// Reason: when browser loads the image for a notification it ignores the service worker
//   so we give the browser a data url from the cache
function getFavicon() {
	return caches.match(new Request("/static/icon-144.png"))
	// get the image as a blob
	.then(res => res.blob())
	// pass the blob to FileReader because URL.createObjectURL is not defined in this context
	.then(img => {
		var reader = new FileReader();

		return new Promise(resolve => {
			reader.addEventListener("load", () => resolve(reader.result));

			reader.readAsDataURL(img);
		});
	});
}
