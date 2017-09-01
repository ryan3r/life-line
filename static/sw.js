const ASSETS = [
	"/offline.html",
	"/{{style.css}}",
	"/{{favicon.png}}"
];

// download the assets
self.addEventListener("install", function(e) {
	e.waitUntil(
		caches.open("offline")

		.then(cache => {
			return cache.addAll(ASSETS);
		})
	);
});

// go to the network for everything
self.addEventListener("fetch", function(e) {
	// only intercept when we are offline
	if(!navigator.onLine) {
		e.respondWith(
			// go to the cache
			caches.match(e.request)

			.then(res => {
				// if we have a cache hit use that
				if(res) return res;

				// other wise serve the offline page
				return caches.match(new Request("/offline.html"));
			})
		);
	}
});
