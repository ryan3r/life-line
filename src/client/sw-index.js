// create the global object
import "../common/global";
import "./global";

import {store} from "./data-store";

var syncStore = store("sync-store");

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

// download a new version
var download = function() {
	// save the new version
	var version;

	// open the cache
	return caches.open(STATIC_CACHE)

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

						promises.push(
							syncStore.set({
								id: "version",
								value: version
							})
						);
					}

					return promises.length == 1 ? promises[0] : Promise.all(promises);
				});
			})
		)

		// notify the client(s) of the update
		.then(() => notifyClients(version));
	});
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
var checkForUpdates = function(newVersion) {
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
		oldVersion = syncStore.get("version").then((value = {}) => value.value)
	}

	return Promise.all([
		newVersion,
		oldVersion
	])

	.then(([newVersion, oldVersion]) => {
		// same version do nothing
		if(newVersion == oldVersion) {

			return syncStore.set({
				id: "version",
				value: oldVersion
			});
		}

		// download the new version
		return download();
	});
};

// when we are installed check for updates
self.addEventListener("install", e => e.waitUntil(checkForUpdates()));

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
				return new Response(JSON.stringify({
					status: "fail",
					data: {
						reason: "networ-error"
					}
				}), {
					headers: {
						"content-type": "application/json"
					}
				});
			})

			.then(res => {
				// check for updates
				checkForUpdates(res.headers.get("server"));

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