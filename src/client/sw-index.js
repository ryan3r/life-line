// create the global object
require("../common/global");
require("./global");

var KeyValueStore = require("../common/data-stores/key-value-store");
var IdbAdaptor = require("./data-stores/idb-adaptor");

var syncStore = new KeyValueStore(new IdbAdaptor("sync-store"));

// all the files to cache
const CACHED_FILES = [
	"/",
	"/static/bundle.js",
	"/static/style.css",
	"/static/icon-144.png",
	"/static/manifest.json"
];

const STATIC_CACHE = "static";

// cache the version of the client
var clientVersion;
// don't run 2 downloads at the same time
var downloading;
// we installed a new version in the install phase
var newVersionInstalled;

// download a new version
var download = function(install) {
	// already downloading
	if(downloading) {
		return downloading;
	}

	// save the new version
	var version;

	// open the cache
	downloading = caches.open(STATIC_CACHE)

	.then(cache => {
		// download all the files
		return Promise.all(
			CACHED_FILES.map(url => {
				// download the file
				return fetch(url)

				.then(res => {
					// save the file
					var promises = [
						cache.put(new Request(url), res)
					];

					// save the version
					if(!version) {
						version = clientVersion = res.headers.get("server");

						promises.push(syncStore.set("version", version));
					}

					return promises.length == 1 ? promises[0] : Promise.all(promises);
				});
			})
		)

		// notify the client(s) of the update
		.then(() => {
			// wait for activation
			if(install) {
				newVersionInstalled = version;
			}
			// updated on reload tell the clients
			else {
				return notifyClients(version);
			}
		});
	});

	return downloading

	// release the lock
	.then(() => downloading = undefined);
};

// notify the client(s) of an update
var notifyClients = function(version) {
	// get all the clients
	return clients.matchAll({})

	.then(clients => {
		for(let client of clients) {
			// send the version
			client.postMessage({
				type: "version-change",
				version
			});
		}
	});
};

// check for updates
var checkForUpdates = function({newVersion, install} = {}) {
	// if we have a version use that
	if(newVersion) {
		newVersion = Promise.resolve(newVersion);
	}
	// fetch the version
	else {
		newVersion = fetch("/")

		.then(res => res.headers.get("server"));
	}

	var oldVersion;

	// already in memory
	if(clientVersion) {
		oldVersion = Promise.resolve(clientVersion);
	}
	else {
		oldVersion = syncStore.get("version");
	}

	return Promise.all([
		newVersion,
		oldVersion
	])

	.then(([newVersion, oldVersion]) => {
		// same version do nothing
		if(newVersion == oldVersion) {
			return syncStore.set("version", oldVersion);
		}

		// download the new version
		return download(install);
	});
};

// when we are installed check for updates
self.addEventListener("install", e => {
	e.waitUntil(
		checkForUpdates({ install: true })

		.then(() => self.skipWaiting())
	);
});

self.addEventListener("activate", e => {
	e.waitUntil(
		self.clients.claim()

		.then(() => {
			// notify clients of the update
			if(newVersionInstalled) {
				notifyClients(newVersionInstalled);

				newVersionInstalled = undefined;
			}
		})
	)
});

// handle a network Request
self.addEventListener("fetch", e => {
	// get the page url
	var url = new URL(e.request.url).pathname;

	// just go to the server for api calls
	if(url.substr(0, 5) == "/api/") {
		e.respondWith(
			fetch(e.request, {
				credentials: "include"
			})

			// network error
			.catch(err => {
				// send an error response
				return new Response(err.message, {
					status: 500
				});
			})

			.then(res => {
				// check for updates
				checkForUpdates({
					newVersion: res.headers.get("server")
				});

				return res;
			})
		);
	}
	// respond from the cache
	else {
		e.respondWith(
			caches.match(e.request)

			.then(res => {
				// if there was no match send the index page
				if(!res) {
					return caches.match(new Request("/"));
				}

				return res;
			})
		);
	}
});
