const ASSETS = [
	"/index.html",
	"/{{offline.html}}",
	"/{{style.css}}",
	"/{{favicon.png}}",
	"/{{manifest.json}}",
	"/{{bundle.js}}",
	"/__/firebase/4.1.3/firebase-app.js",
    "/__/firebase/4.1.3/firebase-auth.js",
    "/__/firebase/4.1.3/firebase-database.js",
    "/__/firebase/init.js"
];

const CONTROLLED_ORIGINS = [
	"https://life-line-7739c.firebaseapp.com",
	"http://localhost:5000"
];

// download the assets
self.addEventListener("install", function(e) {
	e.waitUntil(
		// open the offline cache
		caches.open("offline")

		.then(cache => {
			// check the cache for
			return Promise.all(
				ASSETS.map(url => {
					// check if this asset is in the cache
					return cache.match(new Request(url))

					.then(match => {
						// we already cached this
						if(match) return;

						// cache the resource
						return cache.add(url);
					})
				})
			);
		})
	);
});

// remove any old resources
self.addEventListener("activate", function(e) {
	e.waitUntil(
		// open the offline cache
		caches.open("offline")

		.then(cache => {
			// load the cached resources
			return cache.keys()

			.then(requests => {
				return Promise.all(
					requests.map(request => {
						// parse the url
						const url = new URL(request.url);

						// we don't need this asset anymore
						if(ASSETS.indexOf(url.pathname) === -1) {
							return cache.delete(request);
						}
					})
				);
			});
		})
	);
});

self.addEventListener("fetch", function(e) {
	// parse the url
	const parsed = new URL(e.request.url);
	const url = parsed.pathname;

	// go directly to the cache for assets
	if(url != "/index.html" && ASSETS.indexOf(url) !== -1) {
		e.respondWith(caches.match(e.request));
	}
	// show the offline page
	else if(!navigator.onLine) {
		e.respondWith(caches.match(new Request("/{{offline.html}}")));
	}
	// pass the websocket and authentication through
	else if(CONTROLLED_ORIGINS.indexOf(parsed.origin) === -1) {
		e.respondWith(fetch(e.request));
	}
	// go to the network first then hit the cache
	else {
		e.respondWith(
			fetch(e.request)

			// cache the response
			.then(res => {
				// bad response or nothing new
				if(!res.ok || res.status !== 200) {
					return res;
				}

				// clone the response to save later
				let clone = res.clone();

				return caches.open("offline")

				// save the new version to the cache
				.then(cache => {
					return cache.put(new Request("/index.html"), clone);
				})

				// make sure the original response is returned
				.then(() => res);
			})

			// network failed use the cached version
			.catch(() => {
				return caches.match(new Request("/index.html"));
			})
		)
	}
});
