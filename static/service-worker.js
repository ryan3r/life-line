(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
// shim for using process in browser
var process = module.exports = {};

// cached from whatever global is present so that test runners that stub it
// don't break things.  But we need to wrap it in a try catch in case it is
// wrapped in strict mode code which doesn't define any globals.  It's inside a
// function because try/catches deoptimize in certain engines.

var cachedSetTimeout;
var cachedClearTimeout;

function defaultSetTimout() {
    throw new Error('setTimeout has not been defined');
}
function defaultClearTimeout () {
    throw new Error('clearTimeout has not been defined');
}
(function () {
    try {
        if (typeof setTimeout === 'function') {
            cachedSetTimeout = setTimeout;
        } else {
            cachedSetTimeout = defaultSetTimout;
        }
    } catch (e) {
        cachedSetTimeout = defaultSetTimout;
    }
    try {
        if (typeof clearTimeout === 'function') {
            cachedClearTimeout = clearTimeout;
        } else {
            cachedClearTimeout = defaultClearTimeout;
        }
    } catch (e) {
        cachedClearTimeout = defaultClearTimeout;
    }
} ())
function runTimeout(fun) {
    if (cachedSetTimeout === setTimeout) {
        //normal enviroments in sane situations
        return setTimeout(fun, 0);
    }
    // if setTimeout wasn't available but was latter defined
    if ((cachedSetTimeout === defaultSetTimout || !cachedSetTimeout) && setTimeout) {
        cachedSetTimeout = setTimeout;
        return setTimeout(fun, 0);
    }
    try {
        // when when somebody has screwed with setTimeout but no I.E. maddness
        return cachedSetTimeout(fun, 0);
    } catch(e){
        try {
            // When we are in I.E. but the script has been evaled so I.E. doesn't trust the global object when called normally
            return cachedSetTimeout.call(null, fun, 0);
        } catch(e){
            // same as above but when it's a version of I.E. that must have the global object for 'this', hopfully our context correct otherwise it will throw a global error
            return cachedSetTimeout.call(this, fun, 0);
        }
    }


}
function runClearTimeout(marker) {
    if (cachedClearTimeout === clearTimeout) {
        //normal enviroments in sane situations
        return clearTimeout(marker);
    }
    // if clearTimeout wasn't available but was latter defined
    if ((cachedClearTimeout === defaultClearTimeout || !cachedClearTimeout) && clearTimeout) {
        cachedClearTimeout = clearTimeout;
        return clearTimeout(marker);
    }
    try {
        // when when somebody has screwed with setTimeout but no I.E. maddness
        return cachedClearTimeout(marker);
    } catch (e){
        try {
            // When we are in I.E. but the script has been evaled so I.E. doesn't  trust the global object when called normally
            return cachedClearTimeout.call(null, marker);
        } catch (e){
            // same as above but when it's a version of I.E. that must have the global object for 'this', hopfully our context correct otherwise it will throw a global error.
            // Some versions of I.E. have different rules for clearTimeout vs setTimeout
            return cachedClearTimeout.call(this, marker);
        }
    }



}
var queue = [];
var draining = false;
var currentQueue;
var queueIndex = -1;

function cleanUpNextTick() {
    if (!draining || !currentQueue) {
        return;
    }
    draining = false;
    if (currentQueue.length) {
        queue = currentQueue.concat(queue);
    } else {
        queueIndex = -1;
    }
    if (queue.length) {
        drainQueue();
    }
}

function drainQueue() {
    if (draining) {
        return;
    }
    var timeout = runTimeout(cleanUpNextTick);
    draining = true;

    var len = queue.length;
    while(len) {
        currentQueue = queue;
        queue = [];
        while (++queueIndex < len) {
            if (currentQueue) {
                currentQueue[queueIndex].run();
            }
        }
        queueIndex = -1;
        len = queue.length;
    }
    currentQueue = null;
    draining = false;
    runClearTimeout(timeout);
}

process.nextTick = function (fun) {
    var args = new Array(arguments.length - 1);
    if (arguments.length > 1) {
        for (var i = 1; i < arguments.length; i++) {
            args[i - 1] = arguments[i];
        }
    }
    queue.push(new Item(fun, args));
    if (queue.length === 1 && !draining) {
        runTimeout(drainQueue);
    }
};

// v8 likes predictible objects
function Item(fun, array) {
    this.fun = fun;
    this.array = array;
}
Item.prototype.run = function () {
    this.fun.apply(null, this.array);
};
process.title = 'browser';
process.browser = true;
process.env = {};
process.argv = [];
process.version = ''; // empty string to avoid regexp issues
process.versions = {};

function noop() {}

process.on = noop;
process.addListener = noop;
process.once = noop;
process.off = noop;
process.removeListener = noop;
process.removeAllListeners = noop;
process.emit = noop;

process.binding = function (name) {
    throw new Error('process.binding is not supported');
};

process.cwd = function () { return '/' };
process.chdir = function (dir) {
    throw new Error('process.chdir is not supported');
};
process.umask = function() { return 0; };

},{}],2:[function(require,module,exports){
"use strict";

/**
 * Browser specific globals
 */

lifeLine.makeDom = require("./util/dom-maker");
lifeLine.syncer = require("./syncer");

// add a function for adding actions
lifeLine.addAction = function (name, fn) {
	// attach the callback
	var listener = lifeLine.on("action-exec-" + name, fn);

	// inform any action providers
	lifeLine.emit("action-create", name);

	// all actions removed
	var removeAll = lifeLine.on("action-remove-all", function () {
		// remove the action listener
		listener.unsubscribe();
		removeAll.unsubscribe();
	});

	return {
		unsubscribe: function () {
			// remove the action listener
			listener.unsubscribe();
			removeAll.unsubscribe();

			// inform any action providers
			lifeLine.emit("action-remove", name);
		}
	};
};

},{"./syncer":4,"./util/dom-maker":5}],3:[function(require,module,exports){
"use strict";

var _slicedToArray = function () { function sliceIterator(arr, i) { var _arr = []; var _n = true; var _d = false; var _e = undefined; try { for (var _i = arr[Symbol.iterator](), _s; !(_n = (_s = _i.next()).done); _n = true) { _arr.push(_s.value); if (i && _arr.length === i) break; } } catch (err) { _d = true; _e = err; } finally { try { if (!_n && _i["return"]) _i["return"](); } finally { if (_d) throw _e; } } return _arr; } return function (arr, i) { if (Array.isArray(arr)) { return arr; } else if (Symbol.iterator in Object(arr)) { return sliceIterator(arr, i); } else { throw new TypeError("Invalid attempt to destructure non-iterable instance"); } }; }();

// create the global object
require("../common/global");
require("./global");

var KeyValueStore = require("../common/data-stores/key-value-store");
var MemAdaptor = require("../common/data-stores/mem-adaptor");

var syncStore = new KeyValueStore(new MemAdaptor());

// all the files to cache
var CACHED_FILES = ["/", "/static/bundle.js", "/static/style.css", "/static/icon-144.png", "/static/manifest.json"];

var STATIC_CACHE = "static";

// cache the version of the client
var clientVersion;

// download a new version
var download = function () {
	// save the new version
	var version;

	// open the cache
	return caches.open(STATIC_CACHE).then(function (cache) {
		// download all the files
		return Promise.all(CACHED_FILES.map(function (url) {
			// download the file
			return fetch(url).then(function (res) {
				// save the file
				var promises = [cache.put(new Request(url), res)];

				// save the version
				if (!version) {
					version = clientVersion = res.headers.get("server");

					promises.push(syncStore.set("version", version));
				}

				return promises.length == 1 ? promises[0] : Promise.all(promises);
			});
		}))

		// notify the client(s) of the update
		.then(function () {
			return notifyClients(version);
		});
	});
};

// notify the client(s) of an update
var notifyClients = function (version) {
	// get all the clients
	return clients.matchAll({}).then(function (clients) {
		var _iteratorNormalCompletion = true;
		var _didIteratorError = false;
		var _iteratorError = undefined;

		try {
			for (var _iterator = clients[Symbol.iterator](), _step; !(_iteratorNormalCompletion = (_step = _iterator.next()).done); _iteratorNormalCompletion = true) {
				var client = _step.value;

				// send the version
				client.postMessage({
					type: "version-change",
					version: version
				});
			}
		} catch (err) {
			_didIteratorError = true;
			_iteratorError = err;
		} finally {
			try {
				if (!_iteratorNormalCompletion && _iterator.return) {
					_iterator.return();
				}
			} finally {
				if (_didIteratorError) {
					throw _iteratorError;
				}
			}
		}
	});
};

// check for updates
var checkForUpdates = function (newVersion) {
	// if we have a version use that
	if (newVersion) {
		newVersion = Promise.resolve(newVersion);
	}
	// fetch the version
	else {
			newVersion = fetch("/").then(function (res) {
				return res.headers.get("server");
			});
		}

	var oldVersion;

	// already in memory
	if (clientVersion) {
		oldVersion = Promise.resolve(clientVersion);
	} else {
		oldVersion = syncStore.get("version").then(function () {
			var value = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : {};
			return value.value;
		});
	}

	return Promise.all([newVersion, oldVersion]).then(function (_ref) {
		var _ref2 = _slicedToArray(_ref, 2),
		    newVersion = _ref2[0],
		    oldVersion = _ref2[1];

		// same version do nothing
		if (newVersion == oldVersion) {

			return syncStore.set("version", oldVersion);
		}

		// download the new version
		return download();
	});
};

// when we are installed check for updates
self.addEventListener("install", function (e) {
	return e.waitUntil(checkForUpdates());
});

// handle a network Request
self.addEventListener("fetch", function (e) {
	// get the page url
	var url = new URL(e.request.url).pathname;

	// just go to the server for api calls
	if (url.substr(0, 5) == "/api/") {

		e.respondWith(fetch(e.request, {
			credentials: "include"
		})

		// network error
		.catch(function (err) {
			// send an error response
			return new Response(JSON.stringify({
				status: "fail",
				data: {
					reason: "network-error"
				}
			}), {
				headers: {
					"content-type": "application/json"
				}
			});
		}).then(function (res) {
			// check for updates
			checkForUpdates(res.headers.get("server"));

			return res;
		}));
	}
	// respond from the cache
	else {
			e.respondWith(caches.match(e.request).then(function (res) {
				// if there was no match send the index page
				if (!res) {
					return caches.match(new Request("/"));
				}

				return res;
			}));
		}
});

},{"../common/data-stores/key-value-store":6,"../common/data-stores/mem-adaptor":7,"../common/global":8,"./global":2}],4:[function(require,module,exports){
/**
 * Syncronize this client with the server
 */
/*
var dataStore = require("./data-store").store;

var syncStore = dataStore("sync-store");

const STORES = ["assignments"];

// create the global syncer refrence
var syncer = module.exports = new lifeLine.EventEmitter();

// save subscriptions to data store sync events so we dont trigger our self when we sync
var syncSubs = [];

// don't sync while we are syncing
var isSyncing = false;
var syncAgain = false;

// add a change to the sync queue
var enqueueChange = change => {
	// load the queue
	return syncStore.get("change-queue")

	.then(({changes = []} = {}) => {
		// get the id for the change
		var chId = change.type == "delete" ? change.id : change.data.id;

		var existing = changes.findIndex(ch =>
			ch.type == "delete" ? ch.id == chId : ch.data.id == chId);

		// remove the existing change
		if(existing !== -1) {
			changes.splice(existing, 1);
		}

		// add the change to the queue
		changes.push(change);

		// save the queue
		return syncStore.set({
			id: "change-queue",
			changes
		});
	})

	// sync when idle
	.then(() => idle(syncer.sync));
};

// add a sync listener to a data store
var onSync = function(ds, name, fn) {
	syncSubs.push(ds.on("sync-" + name, fn));
};

// when a data store is opened listen for changes
lifeLine.on("data-store-created", ds => {
	// don't sync the sync store
	if(ds.name == "sync-store") return;

	// create and enqueue a put change
	onSync(ds, "put", (value, isNew) => {
		enqueueChange({
			store: ds.name,
			type: isNew ? "create" : "put",
			data: value
		});
	});

	// create and enqueue a delete change
	onSync(ds, "delete", id => {
		enqueueChange({
			store: ds.name,
			type: "delete",
			id,
			timestamp: Date.now()
		});
	});
});

// wait for some idle time
var idle = fn => {
	if(typeof requestIdleCallback == "function") {
		requestIdleCallback(fn);
	}
	else {
		setTimeout(fn, 100);
	}
};

// sync with the server
syncer.sync = function() {
	// don't sync while offline
	if(navigator.online) {
		return;
	}

	// only do one sync at a time
	if(isSyncing) {
		syncAgain = true;
		return;
	}

	isSyncing = true;

	syncer.emit("sycn-start");

	// load the change queue
	var promises = [
		syncStore.get("change-queue").then(({changes = []} = {}) => changes)
	];

	// load all ids
	for(let storeName of STORES) {
		promises.push(
			dataStore(storeName)
				.getAll()
				.then(items => {
					var dates = {};

					// map modified date to the id
					items.forEach(item => dates[item.id] = item.modified);

					return [storeName, dates];
				})
		);
	}

	Promise.all(promises).then(([changes, ...modifieds]) => {
		// convert modifieds to an object
		var modifiedsObj = {};

		modifieds.forEach(modified => modifiedsObj[modified[0]] = modified[1]);

		// send the changes to the server
		return fetch("/api/data/", {
			method: "POST",
			credentials: "include",
			body: JSON.stringify({
				changes,
				modifieds: modifiedsObj
			})
		});
	})

	// parse the body
	.then(res => res.json())

	// catch any network errors
	.catch(() => ({ status: "fail", data: { reason: "network-error" } }))

	.then(({status, data: results, reason}) => {
		// catch any error
		if(status == "fail") {
			// log the user in
			if(results.reason == "logged-out") {
				lifeLine.nav.navigate("/login");
			}

			return;
		}

		// clear the change queue
		results.unshift(
			syncStore.set({
				id: "change-queue",
				changes: []
			})
		);

		// apply the results
		return Promise.all(
			results.map((result, index) => {
				// first result is the promise to reset the change queue
				if(index === 0) return result;

				// delete the local copy
				if(result.code == "item-deleted") {
					let store = dataStore(result.store);

					return store.remove(result.id, syncSubs);
				}
				// save the newer version from the server
				else if(result.code == "newer-version") {
					let store = dataStore(result.store);

					return store.set(result.data, syncSubs, { saveNow: true });
				}
			})
		);
	})

	.then(() => {
		// release the lock
		isSyncing = false;

		// there was an attempt to sync while we where syncing
		if(syncAgain) {
			syncAgain = false;

			idle(syncer.sync);
		}

		syncer.emit("sync-complete");
	});
};

// don't add event listeners in the service worker
if(typeof window == "object") {
	// when we come back on line sync
	window.addEventListener("online", () => syncer.sync());

	// when the user navigates back sync
	window.addEventListener("visibilitychange", () => {
		if(!document.hidden) {
			syncer.sync();
		}
	});

	// sync on startup
	syncer.sync();
}
*/
"use strict";

},{}],5:[function(require,module,exports){
"use strict";

/**
 * A helper for building dom nodes
 */

var SVG_ELEMENTS = ["svg", "line"];
var SVG_NAMESPACE = "http://www.w3.org/2000/svg";

// build a single dom node
var makeDom = function () {
	var opts = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : {};

	// get or create the name mapping
	var mapped = opts.mapped || {};

	var $el;

	// the element is part of the svg namespace
	if (SVG_ELEMENTS.indexOf(opts.tag) !== -1) {
		$el = document.createElementNS(SVG_NAMESPACE, opts.tag);
	}
	// a plain element
	else {
			$el = document.createElement(opts.tag || "div");
		}

	// set the classes
	if (opts.classes) {
		$el.setAttribute("class", typeof opts.classes == "string" ? opts.classes : opts.classes.join(" "));
	}

	// attach the attributes
	if (opts.attrs) {
		Object.getOwnPropertyNames(opts.attrs).forEach(function (attr) {
			return $el.setAttribute(attr, opts.attrs[attr]);
		});
	}

	// set the text content
	if (opts.text) {
		$el.innerText = opts.text;
	}

	// attach the node to its parent
	if (opts.parent) {
		opts.parent.insertBefore($el, opts.before);
	}

	// add event listeners
	if (opts.on) {
		var _loop = function (name) {
			$el.addEventListener(name, opts.on[name]);

			// attach the dom to a disposable
			if (opts.disp) {
				opts.disp.add({
					unsubscribe: function () {
						return $el.removeEventListener(name, opts.on[name]);
					}
				});
			}
		};

		var _iteratorNormalCompletion = true;
		var _didIteratorError = false;
		var _iteratorError = undefined;

		try {
			for (var _iterator = Object.getOwnPropertyNames(opts.on)[Symbol.iterator](), _step; !(_iteratorNormalCompletion = (_step = _iterator.next()).done); _iteratorNormalCompletion = true) {
				var name = _step.value;

				_loop(name);
			}
		} catch (err) {
			_didIteratorError = true;
			_iteratorError = err;
		} finally {
			try {
				if (!_iteratorNormalCompletion && _iterator.return) {
					_iterator.return();
				}
			} finally {
				if (_didIteratorError) {
					throw _iteratorError;
				}
			}
		}
	}

	// set the value of an input element
	if (opts.value) {
		$el.value = opts.value;
	}

	// add the name mapping
	if (opts.name) {
		mapped[opts.name] = $el;
	}

	// create the child dom nodes
	if (opts.children) {
		var _iteratorNormalCompletion2 = true;
		var _didIteratorError2 = false;
		var _iteratorError2 = undefined;

		try {
			for (var _iterator2 = opts.children[Symbol.iterator](), _step2; !(_iteratorNormalCompletion2 = (_step2 = _iterator2.next()).done); _iteratorNormalCompletion2 = true) {
				var child = _step2.value;

				// make an array into a group Object
				if (Array.isArray(child)) {
					child = {
						group: child
					};
				}

				// attach information for the group
				child.parent = $el;
				child.disp = opts.disp;
				child.mapped = mapped;

				// build the node or group
				make(child);
			}
		} catch (err) {
			_didIteratorError2 = true;
			_iteratorError2 = err;
		} finally {
			try {
				if (!_iteratorNormalCompletion2 && _iterator2.return) {
					_iterator2.return();
				}
			} finally {
				if (_didIteratorError2) {
					throw _iteratorError2;
				}
			}
		}
	}

	return mapped;
};

// build a group of dom nodes
var makeGroup = function (group) {
	// shorthand for a groups
	if (Array.isArray(group)) {
		group = {
			children: group
		};
	}

	// get or create the name mapping
	var mapped = {};

	var _iteratorNormalCompletion3 = true;
	var _didIteratorError3 = false;
	var _iteratorError3 = undefined;

	try {
		for (var _iterator3 = group.group[Symbol.iterator](), _step3; !(_iteratorNormalCompletion3 = (_step3 = _iterator3.next()).done); _iteratorNormalCompletion3 = true) {
			var node = _step3.value;

			// copy over properties from the group
			node.parent || (node.parent = group.parent);
			node.disp || (node.disp = group.disp);
			node.mapped = mapped;

			// make the dom
			make(node);
		}

		// call the callback with the mapped names
	} catch (err) {
		_didIteratorError3 = true;
		_iteratorError3 = err;
	} finally {
		try {
			if (!_iteratorNormalCompletion3 && _iterator3.return) {
				_iterator3.return();
			}
		} finally {
			if (_didIteratorError3) {
				throw _iteratorError3;
			}
		}
	}

	if (group.bind) {
		var subscription = group.bind(mapped);

		// if the return a subscription attach it to the disposable
		if (subscription && group.disp) {
			group.disp.add(subscription);
		}
	}

	return mapped;
};

// a collection of widgets
var widgets = {};

var make = module.exports = function (opts) {
	// handle a group
	if (Array.isArray(opts) || opts.group) {
		return makeGroup(opts);
	}
	// make a widget
	else if (opts.widget) {
			var widget = widgets[opts.widget];

			// not defined
			if (!widget) {
				throw new Error("Widget '" + opts.widget + "' is not defined make sure its been imported");
			}

			// generate the widget content
			var built = widget.make(opts);

			return makeGroup({
				parent: opts.parent,
				disp: opts.disp,
				group: Array.isArray(built) ? built : [built],
				bind: widget.bind && widget.bind.bind(widget, opts)
			});
		}
		// make a single node
		else {
				return makeDom(opts);
			}
};

// register a widget
make.register = function (name, widget) {
	widgets[name] = widget;
};

},{}],6:[function(require,module,exports){
"use strict";

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _possibleConstructorReturn(self, call) { if (!self) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return call && (typeof call === "object" || typeof call === "function") ? call : self; }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }

/**
 * A basic key value data store
 */

var KeyValueStore = function (_lifeLine$EventEmitte) {
	_inherits(KeyValueStore, _lifeLine$EventEmitte);

	function KeyValueStore(adapter) {
		_classCallCheck(this, KeyValueStore);

		var _this = _possibleConstructorReturn(this, (KeyValueStore.__proto__ || Object.getPrototypeOf(KeyValueStore)).call(this));

		_this._adapter = adapter;

		// make sure we have an adapter
		if (!adapter) {
			throw new Error("KeyValueStore must be initialized with an adapter");
		}
		return _this;
	}

	/**
  * Get the corrisponding value out of the data store otherwise return default
  */


	_createClass(KeyValueStore, [{
		key: "get",
		value: function get(key, _default) {
			// check if this value has been overriden
			if (this._overrides && this._overrides.hasOwnProperty(key)) {
				return Promise.resolve(this._overrides[key]);
			}

			return this._adapter.get(key).then(function (result) {
				// the item is not defined
				if (!result) {
					return _default;
				}

				return result.value;
			});
		}

		/**
   * Set a single value or several values
   *
   * key -> value
   * or
   * { key: value }
   */

	}, {
		key: "set",
		value: function set(key, value) {
			// set a single value
			if (typeof key == "string") {
				var promise = this._adapter.set({
					id: key,
					value: value,
					modified: Date.now()
				});

				// trigger the change
				this.emit(key, value);

				return promise;
			}
			// set several values
			else {
					// tell the caller when we are done
					var promises = [];

					var _iteratorNormalCompletion = true;
					var _didIteratorError = false;
					var _iteratorError = undefined;

					try {
						for (var _iterator = Object.getOwnPropertyNames(key)[Symbol.iterator](), _step; !(_iteratorNormalCompletion = (_step = _iterator.next()).done); _iteratorNormalCompletion = true) {
							var _key = _step.value;

							promises.push(this._adapter.set({
								id: _key,
								value: key[_key],
								modified: Date.now()
							}));

							// trigger the change
							this.emit(_key, key[_key]);
						}
					} catch (err) {
						_didIteratorError = true;
						_iteratorError = err;
					} finally {
						try {
							if (!_iteratorNormalCompletion && _iterator.return) {
								_iterator.return();
							}
						} finally {
							if (_didIteratorError) {
								throw _iteratorError;
							}
						}
					}

					return Promise.all(promises);
				}
		}

		/**
   * Watch the value for changes
   *
   * opts.current - send the current value of key (default: false)
   * opts.default - the default value to send for opts.current
   */

	}, {
		key: "watch",
		value: function watch(key, opts, fn) {
			var _this2 = this;

			// make opts optional
			if (typeof opts == "function") {
				fn = opts;
				opts = {};
			}

			// send the current value
			if (opts.current) {
				this.get(key, opts.default).then(function (value) {
					return fn(value);
				});
			}

			// listen for any changes
			return this.on(key, function (value) {
				// only emit the change if there is not an override in place
				if (!_this2._overrides || !_this2._overrides.hasOwnProperty(key)) {
					fn(value);
				}
			});
		}

		/**
   * Override the values from the adaptor without writing to them
   *
   * Useful for combining json settings with command line flags
   */

	}, {
		key: "setOverrides",
		value: function setOverrides(overrides) {
			var _this3 = this;

			this._overrides = overrides;

			// emit changes for each of the overrides
			Object.getOwnPropertyNames(overrides).forEach(function (key) {
				return _this3.emit(key, overrides[key]);
			});
		}
	}]);

	return KeyValueStore;
}(lifeLine.EventEmitter);

module.exports = KeyValueStore;

},{}],7:[function(require,module,exports){
"use strict";

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

/**
 * An in memory adapter for data stores
 */

var MemAdaptor = function () {
	function MemAdaptor() {
		_classCallCheck(this, MemAdaptor);

		this._data = {};
	}

	/**
  * Get an array of values
  */


	_createClass(MemAdaptor, [{
		key: "getAll",
		value: function getAll() {
			var _this = this;

			return Promise.resolve(Object.getOwnPropertyNames(this._data).map(function (name) {
				return _this._data[name];
			}));
		}

		/**
   * Lookup a value
   *
   * returns {id, value}
   */

	}, {
		key: "get",
		value: function get(id) {
			// check if we have the value
			if (this._data.hasOwnProperty(id)) {
				return Promise.resolve(this._data[id]);
			}

			return Promise.resolve();
		}

		/**
   * Store a value
   *
   * The value is stored by its id property
   */

	}, {
		key: "set",
		value: function set(value) {
			// store the value
			this._data[value.id] = value;

			return Promise.resolve();
		}

		/**
   * Remove a value from the adaptor
   */

	}, {
		key: "remove",
		value: function remove(key) {
			delete this._data[key];

			return Promise.resolve();
		}
	}]);

	return MemAdaptor;
}();

module.exports = MemAdaptor;

},{}],8:[function(require,module,exports){
(function (process,global){
"use strict";

/**
 * Create a global object with commonly used modules to avoid 50 million requires
 */

var EventEmitter = require("./util/event-emitter");

var lifeLine = new EventEmitter();

// platform detection
lifeLine.node = typeof process == "object";
lifeLine.browser = typeof window == "object";

// attach utils
lifeLine.Disposable = require("./util/disposable");
lifeLine.EventEmitter = EventEmitter;

// attach lifeline to the global object
(lifeLine.node ? global : browser).lifeLine = lifeLine;

// attach config
var MemAdaptor = require("./data-stores/mem-adaptor");
var KeyValueStore = require("./data-stores/key-value-store");

lifeLine.config = new KeyValueStore(new MemAdaptor());

}).call(this,require('_process'),typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})

},{"./data-stores/key-value-store":6,"./data-stores/mem-adaptor":7,"./util/disposable":9,"./util/event-emitter":10,"_process":1}],9:[function(require,module,exports){
"use strict";

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

/**
 * Keep a list of subscriptions to unsubscribe from together
 */

var Disposable = function () {
	function Disposable() {
		_classCallCheck(this, Disposable);

		this._subscriptions = [];
	}

	// Unsubscribe from all subscriptions


	_createClass(Disposable, [{
		key: "dispose",
		value: function dispose() {
			// remove the first subscription until there are none left
			while (this._subscriptions.length > 0) {
				this._subscriptions.shift().unsubscribe();
			}
		}

		// Add a subscription to the disposable

	}, {
		key: "add",
		value: function add(subscription) {
			this._subscriptions.push(subscription);
		}

		// dispose when an event is fired

	}, {
		key: "disposeOn",
		value: function disposeOn(emitter, event) {
			var _this = this;

			this.add(emitter.on(event, function () {
				return _this.dispose();
			}));
		}
	}]);

	return Disposable;
}();

;

module.exports = Disposable;

},{}],10:[function(require,module,exports){
"use strict";

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

/**
 * A basic event emitter
 */

var EventEmitter = function () {
	function EventEmitter() {
		_classCallCheck(this, EventEmitter);

		this._listeners = {};
	}

	/**
  * Add an event listener
  */


	_createClass(EventEmitter, [{
		key: "on",
		value: function on(name, listener) {
			var _this = this;

			// if we don't have an existing listeners array create one
			if (!this._listeners[name]) {
				this._listeners[name] = [];
			}

			// add the listener
			this._listeners[name].push(listener);

			// give them a subscription
			return {
				_listener: listener,

				unsubscribe: function () {
					// find the listener
					var index = _this._listeners[name].indexOf(listener);

					if (index !== -1) {
						_this._listeners[name].splice(index, 1);
					}
				}
			};
		}

		/**
   * Emit an event
   */

	}, {
		key: "emit",
		value: function emit(name) {
			// check for listeners
			if (this._listeners[name]) {
				for (var _len = arguments.length, args = Array(_len > 1 ? _len - 1 : 0), _key = 1; _key < _len; _key++) {
					args[_key - 1] = arguments[_key];
				}

				var _iteratorNormalCompletion = true;
				var _didIteratorError = false;
				var _iteratorError = undefined;

				try {
					for (var _iterator = this._listeners[name][Symbol.iterator](), _step; !(_iteratorNormalCompletion = (_step = _iterator.next()).done); _iteratorNormalCompletion = true) {
						var listener = _step.value;

						// call the listeners
						listener.apply(undefined, args);
					}
				} catch (err) {
					_didIteratorError = true;
					_iteratorError = err;
				} finally {
					try {
						if (!_iteratorNormalCompletion && _iterator.return) {
							_iterator.return();
						}
					} finally {
						if (_didIteratorError) {
							throw _iteratorError;
						}
					}
				}
			}
		}

		/**
   * Emit an event and skip some listeners
   */

	}, {
		key: "partialEmit",
		value: function partialEmit(name) {
			var skips = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : [];

			// allow a single item
			if (!Array.isArray(skips)) {
				skips = [skips];
			}

			// check for listeners
			if (this._listeners[name]) {
				for (var _len2 = arguments.length, args = Array(_len2 > 2 ? _len2 - 2 : 0), _key2 = 2; _key2 < _len2; _key2++) {
					args[_key2 - 2] = arguments[_key2];
				}

				var _loop = function (listener) {
					// this event listener is being skiped
					if (skips.find(function (skip) {
						return skip._listener == listener;
					})) {
						return "continue";
					}

					// call the listeners
					listener.apply(undefined, args);
				};

				var _iteratorNormalCompletion2 = true;
				var _didIteratorError2 = false;
				var _iteratorError2 = undefined;

				try {
					for (var _iterator2 = this._listeners[name][Symbol.iterator](), _step2; !(_iteratorNormalCompletion2 = (_step2 = _iterator2.next()).done); _iteratorNormalCompletion2 = true) {
						var listener = _step2.value;

						var _ret = _loop(listener);

						if (_ret === "continue") continue;
					}
				} catch (err) {
					_didIteratorError2 = true;
					_iteratorError2 = err;
				} finally {
					try {
						if (!_iteratorNormalCompletion2 && _iterator2.return) {
							_iterator2.return();
						}
					} finally {
						if (_didIteratorError2) {
							throw _iteratorError2;
						}
					}
				}
			}
		}
	}]);

	return EventEmitter;
}();

module.exports = EventEmitter;

},{}]},{},[3])
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCJub2RlX21vZHVsZXMvcHJvY2Vzcy9icm93c2VyLmpzIiwic3JjXFxjbGllbnRcXGdsb2JhbC5qcyIsInNyY1xcY2xpZW50XFxzdy1pbmRleC5qcyIsInNyY1xcY2xpZW50XFxzeW5jZXIuanMiLCJzcmNcXGNsaWVudFxcdXRpbFxcZG9tLW1ha2VyLmpzIiwic3JjXFxjb21tb25cXGRhdGEtc3RvcmVzXFxrZXktdmFsdWUtc3RvcmUuanMiLCJzcmNcXGNvbW1vblxcZGF0YS1zdG9yZXNcXG1lbS1hZGFwdG9yLmpzIiwic3JjXFxjb21tb25cXHNyY1xcY29tbW9uXFxnbG9iYWwuanMiLCJzcmNcXGNvbW1vblxcdXRpbFxcZGlzcG9zYWJsZS5qcyIsInNyY1xcY29tbW9uXFx1dGlsXFxldmVudC1lbWl0dGVyLmpzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBO0FDQUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtB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O0FBQ0E7O0FBRUQ7QUFDQSwrQkFBWSxJQUFaO0FBUndCOztBQUFBO0FBQUE7QUFBQTs7QUFBQTtBQUN6QiwyQkFBb0IsS0FBSyxVQUFMLENBQWdCLElBQWhCLENBQXBCLG1JQUEyQztBQUFBLFVBQW5DLFFBQW1DOztBQUFBLHVCQUFuQyxRQUFtQzs7QUFBQSwrQkFHekM7QUFLRDtBQVR3QjtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBVXpCO0FBQ0Q7Ozs7OztBQUdGLE9BQU8sT0FBUCxHQUFpQixZQUFqQiIsImZpbGUiOiJnZW5lcmF0ZWQuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlc0NvbnRlbnQiOlsiKGZ1bmN0aW9uIGUodCxuLHIpe2Z1bmN0aW9uIHMobyx1KXtpZighbltvXSl7aWYoIXRbb10pe3ZhciBhPXR5cGVvZiByZXF1aXJlPT1cImZ1bmN0aW9uXCImJnJlcXVpcmU7aWYoIXUmJmEpcmV0dXJuIGEobywhMCk7aWYoaSlyZXR1cm4gaShvLCEwKTt2YXIgZj1uZXcgRXJyb3IoXCJDYW5ub3QgZmluZCBtb2R1bGUgJ1wiK28rXCInXCIpO3Rocm93IGYuY29kZT1cIk1PRFVMRV9OT1RfRk9VTkRcIixmfXZhciBsPW5bb109e2V4cG9ydHM6e319O3Rbb11bMF0uY2FsbChsLmV4cG9ydHMsZnVuY3Rpb24oZSl7dmFyIG49dFtvXVsxXVtlXTtyZXR1cm4gcyhuP246ZSl9LGwsbC5leHBvcnRzLGUsdCxuLHIpfXJldHVybiBuW29dLmV4cG9ydHN9dmFyIGk9dHlwZW9mIHJlcXVpcmU9PVwiZnVuY3Rpb25cIiYmcmVxdWlyZTtmb3IodmFyIG89MDtvPHIubGVuZ3RoO28rKylzKHJbb10pO3JldHVybiBzfSkiLCIvLyBzaGltIGZvciB1c2luZyBwcm9jZXNzIGluIGJyb3dzZXJcbnZhciBwcm9jZXNzID0gbW9kdWxlLmV4cG9ydHMgPSB7fTtcblxuLy8gY2FjaGVkIGZyb20gd2hhdGV2ZXIgZ2xvYmFsIGlzIHByZXNlbnQgc28gdGhhdCB0ZXN0IHJ1bm5lcnMgdGhhdCBzdHViIGl0XG4vLyBkb24ndCBicmVhayB0aGluZ3MuICBCdXQgd2UgbmVlZCB0byB3cmFwIGl0IGluIGEgdHJ5IGNhdGNoIGluIGNhc2UgaXQgaXNcbi8vIHdyYXBwZWQgaW4gc3RyaWN0IG1vZGUgY29kZSB3aGljaCBkb2Vzbid0IGRlZmluZSBhbnkgZ2xvYmFscy4gIEl0J3MgaW5zaWRlIGFcbi8vIGZ1bmN0aW9uIGJlY2F1c2UgdHJ5L2NhdGNoZXMgZGVvcHRpbWl6ZSBpbiBjZXJ0YWluIGVuZ2luZXMuXG5cbnZhciBjYWNoZWRTZXRUaW1lb3V0O1xudmFyIGNhY2hlZENsZWFyVGltZW91dDtcblxuZnVuY3Rpb24gZGVmYXVsdFNldFRpbW91dCgpIHtcbiAgICB0aHJvdyBuZXcgRXJyb3IoJ3NldFRpbWVvdXQgaGFzIG5vdCBiZWVuIGRlZmluZWQnKTtcbn1cbmZ1bmN0aW9uIGRlZmF1bHRDbGVhclRpbWVvdXQgKCkge1xuICAgIHRocm93IG5ldyBFcnJvcignY2xlYXJUaW1lb3V0IGhhcyBub3QgYmVlbiBkZWZpbmVkJyk7XG59XG4oZnVuY3Rpb24gKCkge1xuICAgIHRyeSB7XG4gICAgICAgIGlmICh0eXBlb2Ygc2V0VGltZW91dCA9PT0gJ2Z1bmN0aW9uJykge1xuICAgICAgICAgICAgY2FjaGVkU2V0VGltZW91dCA9IHNldFRpbWVvdXQ7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBjYWNoZWRTZXRUaW1lb3V0ID0gZGVmYXVsdFNldFRpbW91dDtcbiAgICAgICAgfVxuICAgIH0gY2F0Y2ggKGUpIHtcbiAgICAgICAgY2FjaGVkU2V0VGltZW91dCA9IGRlZmF1bHRTZXRUaW1vdXQ7XG4gICAgfVxuICAgIHRyeSB7XG4gICAgICAgIGlmICh0eXBlb2YgY2xlYXJUaW1lb3V0ID09PSAnZnVuY3Rpb24nKSB7XG4gICAgICAgICAgICBjYWNoZWRDbGVhclRpbWVvdXQgPSBjbGVhclRpbWVvdXQ7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBjYWNoZWRDbGVhclRpbWVvdXQgPSBkZWZhdWx0Q2xlYXJUaW1lb3V0O1xuICAgICAgICB9XG4gICAgfSBjYXRjaCAoZSkge1xuICAgICAgICBjYWNoZWRDbGVhclRpbWVvdXQgPSBkZWZhdWx0Q2xlYXJUaW1lb3V0O1xuICAgIH1cbn0gKCkpXG5mdW5jdGlvbiBydW5UaW1lb3V0KGZ1bikge1xuICAgIGlmIChjYWNoZWRTZXRUaW1lb3V0ID09PSBzZXRUaW1lb3V0KSB7XG4gICAgICAgIC8vbm9ybWFsIGVudmlyb21lbnRzIGluIHNhbmUgc2l0dWF0aW9uc1xuICAgICAgICByZXR1cm4gc2V0VGltZW91dChmdW4sIDApO1xuICAgIH1cbiAgICAvLyBpZiBzZXRUaW1lb3V0IHdhc24ndCBhdmFpbGFibGUgYnV0IHdhcyBsYXR0ZXIgZGVmaW5lZFxuICAgIGlmICgoY2FjaGVkU2V0VGltZW91dCA9PT0gZGVmYXVsdFNldFRpbW91dCB8fCAhY2FjaGVkU2V0VGltZW91dCkgJiYgc2V0VGltZW91dCkge1xuICAgICAgICBjYWNoZWRTZXRUaW1lb3V0ID0gc2V0VGltZW91dDtcbiAgICAgICAgcmV0dXJuIHNldFRpbWVvdXQoZnVuLCAwKTtcbiAgICB9XG4gICAgdHJ5IHtcbiAgICAgICAgLy8gd2hlbiB3aGVuIHNvbWVib2R5IGhhcyBzY3Jld2VkIHdpdGggc2V0VGltZW91dCBidXQgbm8gSS5FLiBtYWRkbmVzc1xuICAgICAgICByZXR1cm4gY2FjaGVkU2V0VGltZW91dChmdW4sIDApO1xuICAgIH0gY2F0Y2goZSl7XG4gICAgICAgIHRyeSB7XG4gICAgICAgICAgICAvLyBXaGVuIHdlIGFyZSBpbiBJLkUuIGJ1dCB0aGUgc2NyaXB0IGhhcyBiZWVuIGV2YWxlZCBzbyBJLkUuIGRvZXNuJ3QgdHJ1c3QgdGhlIGdsb2JhbCBvYmplY3Qgd2hlbiBjYWxsZWQgbm9ybWFsbHlcbiAgICAgICAgICAgIHJldHVybiBjYWNoZWRTZXRUaW1lb3V0LmNhbGwobnVsbCwgZnVuLCAwKTtcbiAgICAgICAgfSBjYXRjaChlKXtcbiAgICAgICAgICAgIC8vIHNhbWUgYXMgYWJvdmUgYnV0IHdoZW4gaXQncyBhIHZlcnNpb24gb2YgSS5FLiB0aGF0IG11c3QgaGF2ZSB0aGUgZ2xvYmFsIG9iamVjdCBmb3IgJ3RoaXMnLCBob3BmdWxseSBvdXIgY29udGV4dCBjb3JyZWN0IG90aGVyd2lzZSBpdCB3aWxsIHRocm93IGEgZ2xvYmFsIGVycm9yXG4gICAgICAgICAgICByZXR1cm4gY2FjaGVkU2V0VGltZW91dC5jYWxsKHRoaXMsIGZ1biwgMCk7XG4gICAgICAgIH1cbiAgICB9XG5cblxufVxuZnVuY3Rpb24gcnVuQ2xlYXJUaW1lb3V0KG1hcmtlcikge1xuICAgIGlmIChjYWNoZWRDbGVhclRpbWVvdXQgPT09IGNsZWFyVGltZW91dCkge1xuICAgICAgICAvL25vcm1hbCBlbnZpcm9tZW50cyBpbiBzYW5lIHNpdHVhdGlvbnNcbiAgICAgICAgcmV0dXJuIGNsZWFyVGltZW91dChtYXJrZXIpO1xuICAgIH1cbiAgICAvLyBpZiBjbGVhclRpbWVvdXQgd2Fzbid0IGF2YWlsYWJsZSBidXQgd2FzIGxhdHRlciBkZWZpbmVkXG4gICAgaWYgKChjYWNoZWRDbGVhclRpbWVvdXQgPT09IGRlZmF1bHRDbGVhclRpbWVvdXQgfHwgIWNhY2hlZENsZWFyVGltZW91dCkgJiYgY2xlYXJUaW1lb3V0KSB7XG4gICAgICAgIGNhY2hlZENsZWFyVGltZW91dCA9IGNsZWFyVGltZW91dDtcbiAgICAgICAgcmV0dXJuIGNsZWFyVGltZW91dChtYXJrZXIpO1xuICAgIH1cbiAgICB0cnkge1xuICAgICAgICAvLyB3aGVuIHdoZW4gc29tZWJvZHkgaGFzIHNjcmV3ZWQgd2l0aCBzZXRUaW1lb3V0IGJ1dCBubyBJLkUuIG1hZGRuZXNzXG4gICAgICAgIHJldHVybiBjYWNoZWRDbGVhclRpbWVvdXQobWFya2VyKTtcbiAgICB9IGNhdGNoIChlKXtcbiAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgIC8vIFdoZW4gd2UgYXJlIGluIEkuRS4gYnV0IHRoZSBzY3JpcHQgaGFzIGJlZW4gZXZhbGVkIHNvIEkuRS4gZG9lc24ndCAgdHJ1c3QgdGhlIGdsb2JhbCBvYmplY3Qgd2hlbiBjYWxsZWQgbm9ybWFsbHlcbiAgICAgICAgICAgIHJldHVybiBjYWNoZWRDbGVhclRpbWVvdXQuY2FsbChudWxsLCBtYXJrZXIpO1xuICAgICAgICB9IGNhdGNoIChlKXtcbiAgICAgICAgICAgIC8vIHNhbWUgYXMgYWJvdmUgYnV0IHdoZW4gaXQncyBhIHZlcnNpb24gb2YgSS5FLiB0aGF0IG11c3QgaGF2ZSB0aGUgZ2xvYmFsIG9iamVjdCBmb3IgJ3RoaXMnLCBob3BmdWxseSBvdXIgY29udGV4dCBjb3JyZWN0IG90aGVyd2lzZSBpdCB3aWxsIHRocm93IGEgZ2xvYmFsIGVycm9yLlxuICAgICAgICAgICAgLy8gU29tZSB2ZXJzaW9ucyBvZiBJLkUuIGhhdmUgZGlmZmVyZW50IHJ1bGVzIGZvciBjbGVhclRpbWVvdXQgdnMgc2V0VGltZW91dFxuICAgICAgICAgICAgcmV0dXJuIGNhY2hlZENsZWFyVGltZW91dC5jYWxsKHRoaXMsIG1hcmtlcik7XG4gICAgICAgIH1cbiAgICB9XG5cblxuXG59XG52YXIgcXVldWUgPSBbXTtcbnZhciBkcmFpbmluZyA9IGZhbHNlO1xudmFyIGN1cnJlbnRRdWV1ZTtcbnZhciBxdWV1ZUluZGV4ID0gLTE7XG5cbmZ1bmN0aW9uIGNsZWFuVXBOZXh0VGljaygpIHtcbiAgICBpZiAoIWRyYWluaW5nIHx8ICFjdXJyZW50UXVldWUpIHtcbiAgICAgICAgcmV0dXJuO1xuICAgIH1cbiAgICBkcmFpbmluZyA9IGZhbHNlO1xuICAgIGlmIChjdXJyZW50UXVldWUubGVuZ3RoKSB7XG4gICAgICAgIHF1ZXVlID0gY3VycmVudFF1ZXVlLmNvbmNhdChxdWV1ZSk7XG4gICAgfSBlbHNlIHtcbiAgICAgICAgcXVldWVJbmRleCA9IC0xO1xuICAgIH1cbiAgICBpZiAocXVldWUubGVuZ3RoKSB7XG4gICAgICAgIGRyYWluUXVldWUoKTtcbiAgICB9XG59XG5cbmZ1bmN0aW9uIGRyYWluUXVldWUoKSB7XG4gICAgaWYgKGRyYWluaW5nKSB7XG4gICAgICAgIHJldHVybjtcbiAgICB9XG4gICAgdmFyIHRpbWVvdXQgPSBydW5UaW1lb3V0KGNsZWFuVXBOZXh0VGljayk7XG4gICAgZHJhaW5pbmcgPSB0cnVlO1xuXG4gICAgdmFyIGxlbiA9IHF1ZXVlLmxlbmd0aDtcbiAgICB3aGlsZShsZW4pIHtcbiAgICAgICAgY3VycmVudFF1ZXVlID0gcXVldWU7XG4gICAgICAgIHF1ZXVlID0gW107XG4gICAgICAgIHdoaWxlICgrK3F1ZXVlSW5kZXggPCBsZW4pIHtcbiAgICAgICAgICAgIGlmIChjdXJyZW50UXVldWUpIHtcbiAgICAgICAgICAgICAgICBjdXJyZW50UXVldWVbcXVldWVJbmRleF0ucnVuKCk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgcXVldWVJbmRleCA9IC0xO1xuICAgICAgICBsZW4gPSBxdWV1ZS5sZW5ndGg7XG4gICAgfVxuICAgIGN1cnJlbnRRdWV1ZSA9IG51bGw7XG4gICAgZHJhaW5pbmcgPSBmYWxzZTtcbiAgICBydW5DbGVhclRpbWVvdXQodGltZW91dCk7XG59XG5cbnByb2Nlc3MubmV4dFRpY2sgPSBmdW5jdGlvbiAoZnVuKSB7XG4gICAgdmFyIGFyZ3MgPSBuZXcgQXJyYXkoYXJndW1lbnRzLmxlbmd0aCAtIDEpO1xuICAgIGlmIChhcmd1bWVudHMubGVuZ3RoID4gMSkge1xuICAgICAgICBmb3IgKHZhciBpID0gMTsgaSA8IGFyZ3VtZW50cy5sZW5ndGg7IGkrKykge1xuICAgICAgICAgICAgYXJnc1tpIC0gMV0gPSBhcmd1bWVudHNbaV07XG4gICAgICAgIH1cbiAgICB9XG4gICAgcXVldWUucHVzaChuZXcgSXRlbShmdW4sIGFyZ3MpKTtcbiAgICBpZiAocXVldWUubGVuZ3RoID09PSAxICYmICFkcmFpbmluZykge1xuICAgICAgICBydW5UaW1lb3V0KGRyYWluUXVldWUpO1xuICAgIH1cbn07XG5cbi8vIHY4IGxpa2VzIHByZWRpY3RpYmxlIG9iamVjdHNcbmZ1bmN0aW9uIEl0ZW0oZnVuLCBhcnJheSkge1xuICAgIHRoaXMuZnVuID0gZnVuO1xuICAgIHRoaXMuYXJyYXkgPSBhcnJheTtcbn1cbkl0ZW0ucHJvdG90eXBlLnJ1biA9IGZ1bmN0aW9uICgpIHtcbiAgICB0aGlzLmZ1bi5hcHBseShudWxsLCB0aGlzLmFycmF5KTtcbn07XG5wcm9jZXNzLnRpdGxlID0gJ2Jyb3dzZXInO1xucHJvY2Vzcy5icm93c2VyID0gdHJ1ZTtcbnByb2Nlc3MuZW52ID0ge307XG5wcm9jZXNzLmFyZ3YgPSBbXTtcbnByb2Nlc3MudmVyc2lvbiA9ICcnOyAvLyBlbXB0eSBzdHJpbmcgdG8gYXZvaWQgcmVnZXhwIGlzc3Vlc1xucHJvY2Vzcy52ZXJzaW9ucyA9IHt9O1xuXG5mdW5jdGlvbiBub29wKCkge31cblxucHJvY2Vzcy5vbiA9IG5vb3A7XG5wcm9jZXNzLmFkZExpc3RlbmVyID0gbm9vcDtcbnByb2Nlc3Mub25jZSA9IG5vb3A7XG5wcm9jZXNzLm9mZiA9IG5vb3A7XG5wcm9jZXNzLnJlbW92ZUxpc3RlbmVyID0gbm9vcDtcbnByb2Nlc3MucmVtb3ZlQWxsTGlzdGVuZXJzID0gbm9vcDtcbnByb2Nlc3MuZW1pdCA9IG5vb3A7XG5cbnByb2Nlc3MuYmluZGluZyA9IGZ1bmN0aW9uIChuYW1lKSB7XG4gICAgdGhyb3cgbmV3IEVycm9yKCdwcm9jZXNzLmJpbmRpbmcgaXMgbm90IHN1cHBvcnRlZCcpO1xufTtcblxucHJvY2Vzcy5jd2QgPSBmdW5jdGlvbiAoKSB7IHJldHVybiAnLycgfTtcbnByb2Nlc3MuY2hkaXIgPSBmdW5jdGlvbiAoZGlyKSB7XG4gICAgdGhyb3cgbmV3IEVycm9yKCdwcm9jZXNzLmNoZGlyIGlzIG5vdCBzdXBwb3J0ZWQnKTtcbn07XG5wcm9jZXNzLnVtYXNrID0gZnVuY3Rpb24oKSB7IHJldHVybiAwOyB9O1xuIiwiLyoqXHJcbiAqIEJyb3dzZXIgc3BlY2lmaWMgZ2xvYmFsc1xyXG4gKi9cclxuXHJcbmxpZmVMaW5lLm1ha2VEb20gPSByZXF1aXJlKFwiLi91dGlsL2RvbS1tYWtlclwiKTtcclxubGlmZUxpbmUuc3luY2VyID0gcmVxdWlyZShcIi4vc3luY2VyXCIpO1xyXG5cclxuLy8gYWRkIGEgZnVuY3Rpb24gZm9yIGFkZGluZyBhY3Rpb25zXHJcbmxpZmVMaW5lLmFkZEFjdGlvbiA9IGZ1bmN0aW9uKG5hbWUsIGZuKSB7XHJcblx0Ly8gYXR0YWNoIHRoZSBjYWxsYmFja1xyXG5cdHZhciBsaXN0ZW5lciA9IGxpZmVMaW5lLm9uKFwiYWN0aW9uLWV4ZWMtXCIgKyBuYW1lLCBmbik7XHJcblxyXG5cdC8vIGluZm9ybSBhbnkgYWN0aW9uIHByb3ZpZGVyc1xyXG5cdGxpZmVMaW5lLmVtaXQoXCJhY3Rpb24tY3JlYXRlXCIsIG5hbWUpO1xyXG5cclxuXHQvLyBhbGwgYWN0aW9ucyByZW1vdmVkXHJcblx0dmFyIHJlbW92ZUFsbCA9IGxpZmVMaW5lLm9uKFwiYWN0aW9uLXJlbW92ZS1hbGxcIiwgKCkgPT4ge1xyXG5cdFx0Ly8gcmVtb3ZlIHRoZSBhY3Rpb24gbGlzdGVuZXJcclxuXHRcdGxpc3RlbmVyLnVuc3Vic2NyaWJlKCk7XHJcblx0XHRyZW1vdmVBbGwudW5zdWJzY3JpYmUoKTtcclxuXHR9KTtcclxuXHJcblx0cmV0dXJuIHtcclxuXHRcdHVuc3Vic2NyaWJlKCkge1xyXG5cdFx0XHQvLyByZW1vdmUgdGhlIGFjdGlvbiBsaXN0ZW5lclxyXG5cdFx0XHRsaXN0ZW5lci51bnN1YnNjcmliZSgpO1xyXG5cdFx0XHRyZW1vdmVBbGwudW5zdWJzY3JpYmUoKTtcclxuXHJcblx0XHRcdC8vIGluZm9ybSBhbnkgYWN0aW9uIHByb3ZpZGVyc1xyXG5cdFx0XHRsaWZlTGluZS5lbWl0KFwiYWN0aW9uLXJlbW92ZVwiLCBuYW1lKTtcclxuXHRcdH1cclxuXHR9O1xyXG59O1xyXG4iLCIvLyBjcmVhdGUgdGhlIGdsb2JhbCBvYmplY3RcclxucmVxdWlyZShcIi4uL2NvbW1vbi9nbG9iYWxcIik7XHJcbnJlcXVpcmUoXCIuL2dsb2JhbFwiKTtcclxuXHJcbnZhciBLZXlWYWx1ZVN0b3JlID0gcmVxdWlyZShcIi4uL2NvbW1vbi9kYXRhLXN0b3Jlcy9rZXktdmFsdWUtc3RvcmVcIik7XHJcbnZhciBNZW1BZGFwdG9yID0gcmVxdWlyZShcIi4uL2NvbW1vbi9kYXRhLXN0b3Jlcy9tZW0tYWRhcHRvclwiKTtcclxuXHJcbnZhciBzeW5jU3RvcmUgPSBuZXcgS2V5VmFsdWVTdG9yZShuZXcgTWVtQWRhcHRvcigpKTtcclxuXHJcbi8vIGFsbCB0aGUgZmlsZXMgdG8gY2FjaGVcclxuY29uc3QgQ0FDSEVEX0ZJTEVTID0gW1xyXG5cdFwiL1wiLFxyXG5cdFwiL3N0YXRpYy9idW5kbGUuanNcIixcclxuXHRcIi9zdGF0aWMvc3R5bGUuY3NzXCIsXHJcblx0XCIvc3RhdGljL2ljb24tMTQ0LnBuZ1wiLFxyXG5cdFwiL3N0YXRpYy9tYW5pZmVzdC5qc29uXCJcclxuXTtcclxuXHJcbmNvbnN0IFNUQVRJQ19DQUNIRSA9IFwic3RhdGljXCI7XHJcblxyXG4vLyBjYWNoZSB0aGUgdmVyc2lvbiBvZiB0aGUgY2xpZW50XHJcbnZhciBjbGllbnRWZXJzaW9uO1xyXG5cclxuLy8gZG93bmxvYWQgYSBuZXcgdmVyc2lvblxyXG52YXIgZG93bmxvYWQgPSBmdW5jdGlvbigpIHtcclxuXHQvLyBzYXZlIHRoZSBuZXcgdmVyc2lvblxyXG5cdHZhciB2ZXJzaW9uO1xyXG5cclxuXHQvLyBvcGVuIHRoZSBjYWNoZVxyXG5cdHJldHVybiBjYWNoZXMub3BlbihTVEFUSUNfQ0FDSEUpXHJcblxyXG5cdC50aGVuKGNhY2hlID0+IHtcclxuXHRcdC8vIGRvd25sb2FkIGFsbCB0aGUgZmlsZXNcclxuXHRcdHJldHVybiBQcm9taXNlLmFsbChcclxuXHRcdFx0Q0FDSEVEX0ZJTEVTLm1hcCh1cmwgPT4ge1xyXG5cdFx0XHRcdC8vIGRvd25sb2FkIHRoZSBmaWxlXHJcblx0XHRcdFx0cmV0dXJuIGZldGNoKHVybClcclxuXHJcblx0XHRcdFx0LnRoZW4ocmVzID0+IHtcclxuXHRcdFx0XHRcdC8vIHNhdmUgdGhlIGZpbGVcclxuXHRcdFx0XHRcdHZhciBwcm9taXNlcyA9IFtcclxuXHRcdFx0XHRcdFx0Y2FjaGUucHV0KG5ldyBSZXF1ZXN0KHVybCksIHJlcylcclxuXHRcdFx0XHRcdF07XHJcblxyXG5cdFx0XHRcdFx0Ly8gc2F2ZSB0aGUgdmVyc2lvblxyXG5cdFx0XHRcdFx0aWYoIXZlcnNpb24pIHtcclxuXHRcdFx0XHRcdFx0dmVyc2lvbiA9IGNsaWVudFZlcnNpb24gPSByZXMuaGVhZGVycy5nZXQoXCJzZXJ2ZXJcIik7XHJcblxyXG5cdFx0XHRcdFx0XHRwcm9taXNlcy5wdXNoKHN5bmNTdG9yZS5zZXQoXCJ2ZXJzaW9uXCIsIHZlcnNpb24pKTtcclxuXHRcdFx0XHRcdH1cclxuXHJcblx0XHRcdFx0XHRyZXR1cm4gcHJvbWlzZXMubGVuZ3RoID09IDEgPyBwcm9taXNlc1swXSA6IFByb21pc2UuYWxsKHByb21pc2VzKTtcclxuXHRcdFx0XHR9KTtcclxuXHRcdFx0fSlcclxuXHRcdClcclxuXHJcblx0XHQvLyBub3RpZnkgdGhlIGNsaWVudChzKSBvZiB0aGUgdXBkYXRlXHJcblx0XHQudGhlbigoKSA9PiBub3RpZnlDbGllbnRzKHZlcnNpb24pKTtcclxuXHR9KTtcclxufTtcclxuXHJcbi8vIG5vdGlmeSB0aGUgY2xpZW50KHMpIG9mIGFuIHVwZGF0ZVxyXG52YXIgbm90aWZ5Q2xpZW50cyA9IGZ1bmN0aW9uKHZlcnNpb24pIHtcclxuXHQvLyBnZXQgYWxsIHRoZSBjbGllbnRzXHJcblx0cmV0dXJuIGNsaWVudHMubWF0Y2hBbGwoe30pXHJcblxyXG5cdC50aGVuKGNsaWVudHMgPT4ge1xyXG5cdFx0Zm9yKGxldCBjbGllbnQgb2YgY2xpZW50cykge1xyXG5cdFx0XHQvLyBzZW5kIHRoZSB2ZXJzaW9uXHJcblx0XHRcdGNsaWVudC5wb3N0TWVzc2FnZSh7XHJcblx0XHRcdFx0dHlwZTogXCJ2ZXJzaW9uLWNoYW5nZVwiLFxyXG5cdFx0XHRcdHZlcnNpb25cclxuXHRcdFx0fSk7XHJcblx0XHR9XHJcblx0fSk7XHJcbn07XHJcblxyXG4vLyBjaGVjayBmb3IgdXBkYXRlc1xyXG52YXIgY2hlY2tGb3JVcGRhdGVzID0gZnVuY3Rpb24obmV3VmVyc2lvbikge1xyXG5cdC8vIGlmIHdlIGhhdmUgYSB2ZXJzaW9uIHVzZSB0aGF0XHJcblx0aWYobmV3VmVyc2lvbikge1xyXG5cdFx0bmV3VmVyc2lvbiA9IFByb21pc2UucmVzb2x2ZShuZXdWZXJzaW9uKTtcclxuXHR9XHJcblx0Ly8gZmV0Y2ggdGhlIHZlcnNpb25cclxuXHRlbHNlIHtcclxuXHRcdG5ld1ZlcnNpb24gPSBmZXRjaChcIi9cIilcclxuXHJcblx0XHQudGhlbihyZXMgPT4gcmVzLmhlYWRlcnMuZ2V0KFwic2VydmVyXCIpKTtcclxuXHR9XHJcblxyXG5cdHZhciBvbGRWZXJzaW9uO1xyXG5cclxuXHQvLyBhbHJlYWR5IGluIG1lbW9yeVxyXG5cdGlmKGNsaWVudFZlcnNpb24pIHtcclxuXHRcdG9sZFZlcnNpb24gPSBQcm9taXNlLnJlc29sdmUoY2xpZW50VmVyc2lvbik7XHJcblx0fVxyXG5cdGVsc2Uge1xyXG5cdFx0b2xkVmVyc2lvbiA9IHN5bmNTdG9yZS5nZXQoXCJ2ZXJzaW9uXCIpLnRoZW4oKHZhbHVlID0ge30pID0+IHZhbHVlLnZhbHVlKVxyXG5cdH1cclxuXHJcblx0cmV0dXJuIFByb21pc2UuYWxsKFtcclxuXHRcdG5ld1ZlcnNpb24sXHJcblx0XHRvbGRWZXJzaW9uXHJcblx0XSlcclxuXHJcblx0LnRoZW4oKFtuZXdWZXJzaW9uLCBvbGRWZXJzaW9uXSkgPT4ge1xyXG5cdFx0Ly8gc2FtZSB2ZXJzaW9uIGRvIG5vdGhpbmdcclxuXHRcdGlmKG5ld1ZlcnNpb24gPT0gb2xkVmVyc2lvbikge1xyXG5cclxuXHRcdFx0cmV0dXJuIHN5bmNTdG9yZS5zZXQoXCJ2ZXJzaW9uXCIsIG9sZFZlcnNpb24pO1xyXG5cdFx0fVxyXG5cclxuXHRcdC8vIGRvd25sb2FkIHRoZSBuZXcgdmVyc2lvblxyXG5cdFx0cmV0dXJuIGRvd25sb2FkKCk7XHJcblx0fSk7XHJcbn07XHJcblxyXG4vLyB3aGVuIHdlIGFyZSBpbnN0YWxsZWQgY2hlY2sgZm9yIHVwZGF0ZXNcclxuc2VsZi5hZGRFdmVudExpc3RlbmVyKFwiaW5zdGFsbFwiLCBlID0+IGUud2FpdFVudGlsKGNoZWNrRm9yVXBkYXRlcygpKSk7XHJcblxyXG4vLyBoYW5kbGUgYSBuZXR3b3JrIFJlcXVlc3Rcclxuc2VsZi5hZGRFdmVudExpc3RlbmVyKFwiZmV0Y2hcIiwgZSA9PiB7XHJcblx0Ly8gZ2V0IHRoZSBwYWdlIHVybFxyXG5cdHZhciB1cmwgPSBuZXcgVVJMKGUucmVxdWVzdC51cmwpLnBhdGhuYW1lO1xyXG5cclxuXHQvLyBqdXN0IGdvIHRvIHRoZSBzZXJ2ZXIgZm9yIGFwaSBjYWxsc1xyXG5cdGlmKHVybC5zdWJzdHIoMCwgNSkgPT0gXCIvYXBpL1wiKSB7XHJcblxyXG5cdFx0ZS5yZXNwb25kV2l0aChcclxuXHRcdFx0ZmV0Y2goZS5yZXF1ZXN0LCB7XHJcblx0XHRcdFx0Y3JlZGVudGlhbHM6IFwiaW5jbHVkZVwiXHJcblx0XHRcdH0pXHJcblxyXG5cdFx0XHQvLyBuZXR3b3JrIGVycm9yXHJcblx0XHRcdC5jYXRjaChlcnIgPT4ge1xyXG5cdFx0XHRcdC8vIHNlbmQgYW4gZXJyb3IgcmVzcG9uc2VcclxuXHRcdFx0XHRyZXR1cm4gbmV3IFJlc3BvbnNlKEpTT04uc3RyaW5naWZ5KHtcclxuXHRcdFx0XHRcdHN0YXR1czogXCJmYWlsXCIsXHJcblx0XHRcdFx0XHRkYXRhOiB7XHJcblx0XHRcdFx0XHRcdHJlYXNvbjogXCJuZXR3b3JrLWVycm9yXCJcclxuXHRcdFx0XHRcdH1cclxuXHRcdFx0XHR9KSwge1xyXG5cdFx0XHRcdFx0aGVhZGVyczoge1xyXG5cdFx0XHRcdFx0XHRcImNvbnRlbnQtdHlwZVwiOiBcImFwcGxpY2F0aW9uL2pzb25cIlxyXG5cdFx0XHRcdFx0fVxyXG5cdFx0XHRcdH0pO1xyXG5cdFx0XHR9KVxyXG5cclxuXHRcdFx0LnRoZW4ocmVzID0+IHtcclxuXHRcdFx0XHQvLyBjaGVjayBmb3IgdXBkYXRlc1xyXG5cdFx0XHRcdGNoZWNrRm9yVXBkYXRlcyhyZXMuaGVhZGVycy5nZXQoXCJzZXJ2ZXJcIikpO1xyXG5cclxuXHRcdFx0XHRyZXR1cm4gcmVzO1xyXG5cdFx0XHR9KVxyXG5cdFx0KTtcclxuXHR9XHJcblx0Ly8gcmVzcG9uZCBmcm9tIHRoZSBjYWNoZVxyXG5cdGVsc2Uge1xyXG5cdFx0ZS5yZXNwb25kV2l0aChcclxuXHRcdFx0Y2FjaGVzLm1hdGNoKGUucmVxdWVzdClcclxuXHJcblx0XHRcdC50aGVuKHJlcyA9PiB7XHJcblx0XHRcdFx0Ly8gaWYgdGhlcmUgd2FzIG5vIG1hdGNoIHNlbmQgdGhlIGluZGV4IHBhZ2VcclxuXHRcdFx0XHRpZighcmVzKSB7XHJcblx0XHRcdFx0XHRyZXR1cm4gY2FjaGVzLm1hdGNoKG5ldyBSZXF1ZXN0KFwiL1wiKSk7XHJcblx0XHRcdFx0fVxyXG5cclxuXHRcdFx0XHRyZXR1cm4gcmVzO1xyXG5cdFx0XHR9KVxyXG5cdFx0KTtcclxuXHR9XHJcbn0pO1xyXG4iLCIvKipcclxuICogU3luY3Jvbml6ZSB0aGlzIGNsaWVudCB3aXRoIHRoZSBzZXJ2ZXJcclxuICovXHJcbi8qXHJcbnZhciBkYXRhU3RvcmUgPSByZXF1aXJlKFwiLi9kYXRhLXN0b3JlXCIpLnN0b3JlO1xyXG5cclxudmFyIHN5bmNTdG9yZSA9IGRhdGFTdG9yZShcInN5bmMtc3RvcmVcIik7XHJcblxyXG5jb25zdCBTVE9SRVMgPSBbXCJhc3NpZ25tZW50c1wiXTtcclxuXHJcbi8vIGNyZWF0ZSB0aGUgZ2xvYmFsIHN5bmNlciByZWZyZW5jZVxyXG52YXIgc3luY2VyID0gbW9kdWxlLmV4cG9ydHMgPSBuZXcgbGlmZUxpbmUuRXZlbnRFbWl0dGVyKCk7XHJcblxyXG4vLyBzYXZlIHN1YnNjcmlwdGlvbnMgdG8gZGF0YSBzdG9yZSBzeW5jIGV2ZW50cyBzbyB3ZSBkb250IHRyaWdnZXIgb3VyIHNlbGYgd2hlbiB3ZSBzeW5jXHJcbnZhciBzeW5jU3VicyA9IFtdO1xyXG5cclxuLy8gZG9uJ3Qgc3luYyB3aGlsZSB3ZSBhcmUgc3luY2luZ1xyXG52YXIgaXNTeW5jaW5nID0gZmFsc2U7XHJcbnZhciBzeW5jQWdhaW4gPSBmYWxzZTtcclxuXHJcbi8vIGFkZCBhIGNoYW5nZSB0byB0aGUgc3luYyBxdWV1ZVxyXG52YXIgZW5xdWV1ZUNoYW5nZSA9IGNoYW5nZSA9PiB7XHJcblx0Ly8gbG9hZCB0aGUgcXVldWVcclxuXHRyZXR1cm4gc3luY1N0b3JlLmdldChcImNoYW5nZS1xdWV1ZVwiKVxyXG5cclxuXHQudGhlbigoe2NoYW5nZXMgPSBbXX0gPSB7fSkgPT4ge1xyXG5cdFx0Ly8gZ2V0IHRoZSBpZCBmb3IgdGhlIGNoYW5nZVxyXG5cdFx0dmFyIGNoSWQgPSBjaGFuZ2UudHlwZSA9PSBcImRlbGV0ZVwiID8gY2hhbmdlLmlkIDogY2hhbmdlLmRhdGEuaWQ7XHJcblxyXG5cdFx0dmFyIGV4aXN0aW5nID0gY2hhbmdlcy5maW5kSW5kZXgoY2ggPT5cclxuXHRcdFx0Y2gudHlwZSA9PSBcImRlbGV0ZVwiID8gY2guaWQgPT0gY2hJZCA6IGNoLmRhdGEuaWQgPT0gY2hJZCk7XHJcblxyXG5cdFx0Ly8gcmVtb3ZlIHRoZSBleGlzdGluZyBjaGFuZ2VcclxuXHRcdGlmKGV4aXN0aW5nICE9PSAtMSkge1xyXG5cdFx0XHRjaGFuZ2VzLnNwbGljZShleGlzdGluZywgMSk7XHJcblx0XHR9XHJcblxyXG5cdFx0Ly8gYWRkIHRoZSBjaGFuZ2UgdG8gdGhlIHF1ZXVlXHJcblx0XHRjaGFuZ2VzLnB1c2goY2hhbmdlKTtcclxuXHJcblx0XHQvLyBzYXZlIHRoZSBxdWV1ZVxyXG5cdFx0cmV0dXJuIHN5bmNTdG9yZS5zZXQoe1xyXG5cdFx0XHRpZDogXCJjaGFuZ2UtcXVldWVcIixcclxuXHRcdFx0Y2hhbmdlc1xyXG5cdFx0fSk7XHJcblx0fSlcclxuXHJcblx0Ly8gc3luYyB3aGVuIGlkbGVcclxuXHQudGhlbigoKSA9PiBpZGxlKHN5bmNlci5zeW5jKSk7XHJcbn07XHJcblxyXG4vLyBhZGQgYSBzeW5jIGxpc3RlbmVyIHRvIGEgZGF0YSBzdG9yZVxyXG52YXIgb25TeW5jID0gZnVuY3Rpb24oZHMsIG5hbWUsIGZuKSB7XHJcblx0c3luY1N1YnMucHVzaChkcy5vbihcInN5bmMtXCIgKyBuYW1lLCBmbikpO1xyXG59O1xyXG5cclxuLy8gd2hlbiBhIGRhdGEgc3RvcmUgaXMgb3BlbmVkIGxpc3RlbiBmb3IgY2hhbmdlc1xyXG5saWZlTGluZS5vbihcImRhdGEtc3RvcmUtY3JlYXRlZFwiLCBkcyA9PiB7XHJcblx0Ly8gZG9uJ3Qgc3luYyB0aGUgc3luYyBzdG9yZVxyXG5cdGlmKGRzLm5hbWUgPT0gXCJzeW5jLXN0b3JlXCIpIHJldHVybjtcclxuXHJcblx0Ly8gY3JlYXRlIGFuZCBlbnF1ZXVlIGEgcHV0IGNoYW5nZVxyXG5cdG9uU3luYyhkcywgXCJwdXRcIiwgKHZhbHVlLCBpc05ldykgPT4ge1xyXG5cdFx0ZW5xdWV1ZUNoYW5nZSh7XHJcblx0XHRcdHN0b3JlOiBkcy5uYW1lLFxyXG5cdFx0XHR0eXBlOiBpc05ldyA/IFwiY3JlYXRlXCIgOiBcInB1dFwiLFxyXG5cdFx0XHRkYXRhOiB2YWx1ZVxyXG5cdFx0fSk7XHJcblx0fSk7XHJcblxyXG5cdC8vIGNyZWF0ZSBhbmQgZW5xdWV1ZSBhIGRlbGV0ZSBjaGFuZ2VcclxuXHRvblN5bmMoZHMsIFwiZGVsZXRlXCIsIGlkID0+IHtcclxuXHRcdGVucXVldWVDaGFuZ2Uoe1xyXG5cdFx0XHRzdG9yZTogZHMubmFtZSxcclxuXHRcdFx0dHlwZTogXCJkZWxldGVcIixcclxuXHRcdFx0aWQsXHJcblx0XHRcdHRpbWVzdGFtcDogRGF0ZS5ub3coKVxyXG5cdFx0fSk7XHJcblx0fSk7XHJcbn0pO1xyXG5cclxuLy8gd2FpdCBmb3Igc29tZSBpZGxlIHRpbWVcclxudmFyIGlkbGUgPSBmbiA9PiB7XHJcblx0aWYodHlwZW9mIHJlcXVlc3RJZGxlQ2FsbGJhY2sgPT0gXCJmdW5jdGlvblwiKSB7XHJcblx0XHRyZXF1ZXN0SWRsZUNhbGxiYWNrKGZuKTtcclxuXHR9XHJcblx0ZWxzZSB7XHJcblx0XHRzZXRUaW1lb3V0KGZuLCAxMDApO1xyXG5cdH1cclxufTtcclxuXHJcbi8vIHN5bmMgd2l0aCB0aGUgc2VydmVyXHJcbnN5bmNlci5zeW5jID0gZnVuY3Rpb24oKSB7XHJcblx0Ly8gZG9uJ3Qgc3luYyB3aGlsZSBvZmZsaW5lXHJcblx0aWYobmF2aWdhdG9yLm9ubGluZSkge1xyXG5cdFx0cmV0dXJuO1xyXG5cdH1cclxuXHJcblx0Ly8gb25seSBkbyBvbmUgc3luYyBhdCBhIHRpbWVcclxuXHRpZihpc1N5bmNpbmcpIHtcclxuXHRcdHN5bmNBZ2FpbiA9IHRydWU7XHJcblx0XHRyZXR1cm47XHJcblx0fVxyXG5cclxuXHRpc1N5bmNpbmcgPSB0cnVlO1xyXG5cclxuXHRzeW5jZXIuZW1pdChcInN5Y24tc3RhcnRcIik7XHJcblxyXG5cdC8vIGxvYWQgdGhlIGNoYW5nZSBxdWV1ZVxyXG5cdHZhciBwcm9taXNlcyA9IFtcclxuXHRcdHN5bmNTdG9yZS5nZXQoXCJjaGFuZ2UtcXVldWVcIikudGhlbigoe2NoYW5nZXMgPSBbXX0gPSB7fSkgPT4gY2hhbmdlcylcclxuXHRdO1xyXG5cclxuXHQvLyBsb2FkIGFsbCBpZHNcclxuXHRmb3IobGV0IHN0b3JlTmFtZSBvZiBTVE9SRVMpIHtcclxuXHRcdHByb21pc2VzLnB1c2goXHJcblx0XHRcdGRhdGFTdG9yZShzdG9yZU5hbWUpXHJcblx0XHRcdFx0LmdldEFsbCgpXHJcblx0XHRcdFx0LnRoZW4oaXRlbXMgPT4ge1xyXG5cdFx0XHRcdFx0dmFyIGRhdGVzID0ge307XHJcblxyXG5cdFx0XHRcdFx0Ly8gbWFwIG1vZGlmaWVkIGRhdGUgdG8gdGhlIGlkXHJcblx0XHRcdFx0XHRpdGVtcy5mb3JFYWNoKGl0ZW0gPT4gZGF0ZXNbaXRlbS5pZF0gPSBpdGVtLm1vZGlmaWVkKTtcclxuXHJcblx0XHRcdFx0XHRyZXR1cm4gW3N0b3JlTmFtZSwgZGF0ZXNdO1xyXG5cdFx0XHRcdH0pXHJcblx0XHQpO1xyXG5cdH1cclxuXHJcblx0UHJvbWlzZS5hbGwocHJvbWlzZXMpLnRoZW4oKFtjaGFuZ2VzLCAuLi5tb2RpZmllZHNdKSA9PiB7XHJcblx0XHQvLyBjb252ZXJ0IG1vZGlmaWVkcyB0byBhbiBvYmplY3RcclxuXHRcdHZhciBtb2RpZmllZHNPYmogPSB7fTtcclxuXHJcblx0XHRtb2RpZmllZHMuZm9yRWFjaChtb2RpZmllZCA9PiBtb2RpZmllZHNPYmpbbW9kaWZpZWRbMF1dID0gbW9kaWZpZWRbMV0pO1xyXG5cclxuXHRcdC8vIHNlbmQgdGhlIGNoYW5nZXMgdG8gdGhlIHNlcnZlclxyXG5cdFx0cmV0dXJuIGZldGNoKFwiL2FwaS9kYXRhL1wiLCB7XHJcblx0XHRcdG1ldGhvZDogXCJQT1NUXCIsXHJcblx0XHRcdGNyZWRlbnRpYWxzOiBcImluY2x1ZGVcIixcclxuXHRcdFx0Ym9keTogSlNPTi5zdHJpbmdpZnkoe1xyXG5cdFx0XHRcdGNoYW5nZXMsXHJcblx0XHRcdFx0bW9kaWZpZWRzOiBtb2RpZmllZHNPYmpcclxuXHRcdFx0fSlcclxuXHRcdH0pO1xyXG5cdH0pXHJcblxyXG5cdC8vIHBhcnNlIHRoZSBib2R5XHJcblx0LnRoZW4ocmVzID0+IHJlcy5qc29uKCkpXHJcblxyXG5cdC8vIGNhdGNoIGFueSBuZXR3b3JrIGVycm9yc1xyXG5cdC5jYXRjaCgoKSA9PiAoeyBzdGF0dXM6IFwiZmFpbFwiLCBkYXRhOiB7IHJlYXNvbjogXCJuZXR3b3JrLWVycm9yXCIgfSB9KSlcclxuXHJcblx0LnRoZW4oKHtzdGF0dXMsIGRhdGE6IHJlc3VsdHMsIHJlYXNvbn0pID0+IHtcclxuXHRcdC8vIGNhdGNoIGFueSBlcnJvclxyXG5cdFx0aWYoc3RhdHVzID09IFwiZmFpbFwiKSB7XHJcblx0XHRcdC8vIGxvZyB0aGUgdXNlciBpblxyXG5cdFx0XHRpZihyZXN1bHRzLnJlYXNvbiA9PSBcImxvZ2dlZC1vdXRcIikge1xyXG5cdFx0XHRcdGxpZmVMaW5lLm5hdi5uYXZpZ2F0ZShcIi9sb2dpblwiKTtcclxuXHRcdFx0fVxyXG5cclxuXHRcdFx0cmV0dXJuO1xyXG5cdFx0fVxyXG5cclxuXHRcdC8vIGNsZWFyIHRoZSBjaGFuZ2UgcXVldWVcclxuXHRcdHJlc3VsdHMudW5zaGlmdChcclxuXHRcdFx0c3luY1N0b3JlLnNldCh7XHJcblx0XHRcdFx0aWQ6IFwiY2hhbmdlLXF1ZXVlXCIsXHJcblx0XHRcdFx0Y2hhbmdlczogW11cclxuXHRcdFx0fSlcclxuXHRcdCk7XHJcblxyXG5cdFx0Ly8gYXBwbHkgdGhlIHJlc3VsdHNcclxuXHRcdHJldHVybiBQcm9taXNlLmFsbChcclxuXHRcdFx0cmVzdWx0cy5tYXAoKHJlc3VsdCwgaW5kZXgpID0+IHtcclxuXHRcdFx0XHQvLyBmaXJzdCByZXN1bHQgaXMgdGhlIHByb21pc2UgdG8gcmVzZXQgdGhlIGNoYW5nZSBxdWV1ZVxyXG5cdFx0XHRcdGlmKGluZGV4ID09PSAwKSByZXR1cm4gcmVzdWx0O1xyXG5cclxuXHRcdFx0XHQvLyBkZWxldGUgdGhlIGxvY2FsIGNvcHlcclxuXHRcdFx0XHRpZihyZXN1bHQuY29kZSA9PSBcIml0ZW0tZGVsZXRlZFwiKSB7XHJcblx0XHRcdFx0XHRsZXQgc3RvcmUgPSBkYXRhU3RvcmUocmVzdWx0LnN0b3JlKTtcclxuXHJcblx0XHRcdFx0XHRyZXR1cm4gc3RvcmUucmVtb3ZlKHJlc3VsdC5pZCwgc3luY1N1YnMpO1xyXG5cdFx0XHRcdH1cclxuXHRcdFx0XHQvLyBzYXZlIHRoZSBuZXdlciB2ZXJzaW9uIGZyb20gdGhlIHNlcnZlclxyXG5cdFx0XHRcdGVsc2UgaWYocmVzdWx0LmNvZGUgPT0gXCJuZXdlci12ZXJzaW9uXCIpIHtcclxuXHRcdFx0XHRcdGxldCBzdG9yZSA9IGRhdGFTdG9yZShyZXN1bHQuc3RvcmUpO1xyXG5cclxuXHRcdFx0XHRcdHJldHVybiBzdG9yZS5zZXQocmVzdWx0LmRhdGEsIHN5bmNTdWJzLCB7IHNhdmVOb3c6IHRydWUgfSk7XHJcblx0XHRcdFx0fVxyXG5cdFx0XHR9KVxyXG5cdFx0KTtcclxuXHR9KVxyXG5cclxuXHQudGhlbigoKSA9PiB7XHJcblx0XHQvLyByZWxlYXNlIHRoZSBsb2NrXHJcblx0XHRpc1N5bmNpbmcgPSBmYWxzZTtcclxuXHJcblx0XHQvLyB0aGVyZSB3YXMgYW4gYXR0ZW1wdCB0byBzeW5jIHdoaWxlIHdlIHdoZXJlIHN5bmNpbmdcclxuXHRcdGlmKHN5bmNBZ2Fpbikge1xyXG5cdFx0XHRzeW5jQWdhaW4gPSBmYWxzZTtcclxuXHJcblx0XHRcdGlkbGUoc3luY2VyLnN5bmMpO1xyXG5cdFx0fVxyXG5cclxuXHRcdHN5bmNlci5lbWl0KFwic3luYy1jb21wbGV0ZVwiKTtcclxuXHR9KTtcclxufTtcclxuXHJcbi8vIGRvbid0IGFkZCBldmVudCBsaXN0ZW5lcnMgaW4gdGhlIHNlcnZpY2Ugd29ya2VyXHJcbmlmKHR5cGVvZiB3aW5kb3cgPT0gXCJvYmplY3RcIikge1xyXG5cdC8vIHdoZW4gd2UgY29tZSBiYWNrIG9uIGxpbmUgc3luY1xyXG5cdHdpbmRvdy5hZGRFdmVudExpc3RlbmVyKFwib25saW5lXCIsICgpID0+IHN5bmNlci5zeW5jKCkpO1xyXG5cclxuXHQvLyB3aGVuIHRoZSB1c2VyIG5hdmlnYXRlcyBiYWNrIHN5bmNcclxuXHR3aW5kb3cuYWRkRXZlbnRMaXN0ZW5lcihcInZpc2liaWxpdHljaGFuZ2VcIiwgKCkgPT4ge1xyXG5cdFx0aWYoIWRvY3VtZW50LmhpZGRlbikge1xyXG5cdFx0XHRzeW5jZXIuc3luYygpO1xyXG5cdFx0fVxyXG5cdH0pO1xyXG5cclxuXHQvLyBzeW5jIG9uIHN0YXJ0dXBcclxuXHRzeW5jZXIuc3luYygpO1xyXG59XHJcbiovXHJcbiIsIi8qKlxyXG4gKiBBIGhlbHBlciBmb3IgYnVpbGRpbmcgZG9tIG5vZGVzXHJcbiAqL1xyXG5cclxuY29uc3QgU1ZHX0VMRU1FTlRTID0gW1wic3ZnXCIsIFwibGluZVwiXTtcclxuY29uc3QgU1ZHX05BTUVTUEFDRSA9IFwiaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmdcIjtcclxuXHJcbi8vIGJ1aWxkIGEgc2luZ2xlIGRvbSBub2RlXHJcbnZhciBtYWtlRG9tID0gZnVuY3Rpb24ob3B0cyA9IHt9KSB7XHJcblx0Ly8gZ2V0IG9yIGNyZWF0ZSB0aGUgbmFtZSBtYXBwaW5nXHJcblx0dmFyIG1hcHBlZCA9IG9wdHMubWFwcGVkIHx8IHt9O1xyXG5cclxuXHR2YXIgJGVsO1xyXG5cclxuXHQvLyB0aGUgZWxlbWVudCBpcyBwYXJ0IG9mIHRoZSBzdmcgbmFtZXNwYWNlXHJcblx0aWYoU1ZHX0VMRU1FTlRTLmluZGV4T2Yob3B0cy50YWcpICE9PSAtMSkge1xyXG5cdFx0JGVsID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudE5TKFNWR19OQU1FU1BBQ0UsIG9wdHMudGFnKTtcclxuXHR9XHJcblx0Ly8gYSBwbGFpbiBlbGVtZW50XHJcblx0ZWxzZSB7XHJcblx0XHQkZWwgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KG9wdHMudGFnIHx8IFwiZGl2XCIpO1xyXG5cdH1cclxuXHJcblx0Ly8gc2V0IHRoZSBjbGFzc2VzXHJcblx0aWYob3B0cy5jbGFzc2VzKSB7XHJcblx0XHQkZWwuc2V0QXR0cmlidXRlKFwiY2xhc3NcIiwgdHlwZW9mIG9wdHMuY2xhc3NlcyA9PSBcInN0cmluZ1wiID8gb3B0cy5jbGFzc2VzIDogb3B0cy5jbGFzc2VzLmpvaW4oXCIgXCIpKTtcclxuXHR9XHJcblxyXG5cdC8vIGF0dGFjaCB0aGUgYXR0cmlidXRlc1xyXG5cdGlmKG9wdHMuYXR0cnMpIHtcclxuXHRcdE9iamVjdC5nZXRPd25Qcm9wZXJ0eU5hbWVzKG9wdHMuYXR0cnMpXHJcblxyXG5cdFx0LmZvckVhY2goYXR0ciA9PiAkZWwuc2V0QXR0cmlidXRlKGF0dHIsIG9wdHMuYXR0cnNbYXR0cl0pKTtcclxuXHR9XHJcblxyXG5cdC8vIHNldCB0aGUgdGV4dCBjb250ZW50XHJcblx0aWYob3B0cy50ZXh0KSB7XHJcblx0XHQkZWwuaW5uZXJUZXh0ID0gb3B0cy50ZXh0O1xyXG5cdH1cclxuXHJcblx0Ly8gYXR0YWNoIHRoZSBub2RlIHRvIGl0cyBwYXJlbnRcclxuXHRpZihvcHRzLnBhcmVudCkge1xyXG5cdFx0b3B0cy5wYXJlbnQuaW5zZXJ0QmVmb3JlKCRlbCwgb3B0cy5iZWZvcmUpO1xyXG5cdH1cclxuXHJcblx0Ly8gYWRkIGV2ZW50IGxpc3RlbmVyc1xyXG5cdGlmKG9wdHMub24pIHtcclxuXHRcdGZvcihsZXQgbmFtZSBvZiBPYmplY3QuZ2V0T3duUHJvcGVydHlOYW1lcyhvcHRzLm9uKSkge1xyXG5cdFx0XHQkZWwuYWRkRXZlbnRMaXN0ZW5lcihuYW1lLCBvcHRzLm9uW25hbWVdKTtcclxuXHJcblx0XHRcdC8vIGF0dGFjaCB0aGUgZG9tIHRvIGEgZGlzcG9zYWJsZVxyXG5cdFx0XHRpZihvcHRzLmRpc3ApIHtcclxuXHRcdFx0XHRvcHRzLmRpc3AuYWRkKHtcclxuXHRcdFx0XHRcdHVuc3Vic2NyaWJlOiAoKSA9PiAkZWwucmVtb3ZlRXZlbnRMaXN0ZW5lcihuYW1lLCBvcHRzLm9uW25hbWVdKVxyXG5cdFx0XHRcdH0pO1xyXG5cdFx0XHR9XHJcblx0XHR9XHJcblx0fVxyXG5cclxuXHQvLyBzZXQgdGhlIHZhbHVlIG9mIGFuIGlucHV0IGVsZW1lbnRcclxuXHRpZihvcHRzLnZhbHVlKSB7XHJcblx0XHQkZWwudmFsdWUgPSBvcHRzLnZhbHVlO1xyXG5cdH1cclxuXHJcblx0Ly8gYWRkIHRoZSBuYW1lIG1hcHBpbmdcclxuXHRpZihvcHRzLm5hbWUpIHtcclxuXHRcdG1hcHBlZFtvcHRzLm5hbWVdID0gJGVsO1xyXG5cdH1cclxuXHJcblx0Ly8gY3JlYXRlIHRoZSBjaGlsZCBkb20gbm9kZXNcclxuXHRpZihvcHRzLmNoaWxkcmVuKSB7XHJcblx0XHRmb3IobGV0IGNoaWxkIG9mIG9wdHMuY2hpbGRyZW4pIHtcclxuXHRcdFx0Ly8gbWFrZSBhbiBhcnJheSBpbnRvIGEgZ3JvdXAgT2JqZWN0XHJcblx0XHRcdGlmKEFycmF5LmlzQXJyYXkoY2hpbGQpKSB7XHJcblx0XHRcdFx0Y2hpbGQgPSB7XHJcblx0XHRcdFx0XHRncm91cDogY2hpbGRcclxuXHRcdFx0XHR9O1xyXG5cdFx0XHR9XHJcblxyXG5cdFx0XHQvLyBhdHRhY2ggaW5mb3JtYXRpb24gZm9yIHRoZSBncm91cFxyXG5cdFx0XHRjaGlsZC5wYXJlbnQgPSAkZWw7XHJcblx0XHRcdGNoaWxkLmRpc3AgPSBvcHRzLmRpc3A7XHJcblx0XHRcdGNoaWxkLm1hcHBlZCA9IG1hcHBlZDtcclxuXHJcblx0XHRcdC8vIGJ1aWxkIHRoZSBub2RlIG9yIGdyb3VwXHJcblx0XHRcdG1ha2UoY2hpbGQpO1xyXG5cdFx0fVxyXG5cdH1cclxuXHJcblx0cmV0dXJuIG1hcHBlZDtcclxufVxyXG5cclxuLy8gYnVpbGQgYSBncm91cCBvZiBkb20gbm9kZXNcclxudmFyIG1ha2VHcm91cCA9IGZ1bmN0aW9uKGdyb3VwKSB7XHJcblx0Ly8gc2hvcnRoYW5kIGZvciBhIGdyb3Vwc1xyXG5cdGlmKEFycmF5LmlzQXJyYXkoZ3JvdXApKSB7XHJcblx0XHRncm91cCA9IHtcclxuXHRcdFx0Y2hpbGRyZW46IGdyb3VwXHJcblx0XHR9O1xyXG5cdH1cclxuXHJcblx0Ly8gZ2V0IG9yIGNyZWF0ZSB0aGUgbmFtZSBtYXBwaW5nXHJcblx0dmFyIG1hcHBlZCA9IHt9O1xyXG5cclxuXHRmb3IobGV0IG5vZGUgb2YgZ3JvdXAuZ3JvdXApIHtcclxuXHRcdC8vIGNvcHkgb3ZlciBwcm9wZXJ0aWVzIGZyb20gdGhlIGdyb3VwXHJcblx0XHRub2RlLnBhcmVudCB8fCAobm9kZS5wYXJlbnQgPSBncm91cC5wYXJlbnQpO1xyXG5cdFx0bm9kZS5kaXNwIHx8IChub2RlLmRpc3AgPSBncm91cC5kaXNwKTtcclxuXHRcdG5vZGUubWFwcGVkID0gbWFwcGVkO1xyXG5cclxuXHRcdC8vIG1ha2UgdGhlIGRvbVxyXG5cdFx0bWFrZShub2RlKTtcclxuXHR9XHJcblxyXG5cdC8vIGNhbGwgdGhlIGNhbGxiYWNrIHdpdGggdGhlIG1hcHBlZCBuYW1lc1xyXG5cdGlmKGdyb3VwLmJpbmQpIHtcclxuXHRcdHZhciBzdWJzY3JpcHRpb24gPSBncm91cC5iaW5kKG1hcHBlZCk7XHJcblxyXG5cdFx0Ly8gaWYgdGhlIHJldHVybiBhIHN1YnNjcmlwdGlvbiBhdHRhY2ggaXQgdG8gdGhlIGRpc3Bvc2FibGVcclxuXHRcdGlmKHN1YnNjcmlwdGlvbiAmJiBncm91cC5kaXNwKSB7XHJcblx0XHRcdGdyb3VwLmRpc3AuYWRkKHN1YnNjcmlwdGlvbik7XHJcblx0XHR9XHJcblx0fVxyXG5cclxuXHRyZXR1cm4gbWFwcGVkO1xyXG59O1xyXG5cclxuLy8gYSBjb2xsZWN0aW9uIG9mIHdpZGdldHNcclxudmFyIHdpZGdldHMgPSB7fTtcclxuXHJcbnZhciBtYWtlID0gbW9kdWxlLmV4cG9ydHMgPSBmdW5jdGlvbihvcHRzKSB7XHJcblx0Ly8gaGFuZGxlIGEgZ3JvdXBcclxuXHRpZihBcnJheS5pc0FycmF5KG9wdHMpIHx8IG9wdHMuZ3JvdXApIHtcclxuXHRcdHJldHVybiBtYWtlR3JvdXAob3B0cyk7XHJcblx0fVxyXG5cdC8vIG1ha2UgYSB3aWRnZXRcclxuXHRlbHNlIGlmKG9wdHMud2lkZ2V0KSB7XHJcblx0XHR2YXIgd2lkZ2V0ID0gd2lkZ2V0c1tvcHRzLndpZGdldF07XHJcblxyXG5cdFx0Ly8gbm90IGRlZmluZWRcclxuXHRcdGlmKCF3aWRnZXQpIHtcclxuXHRcdFx0dGhyb3cgbmV3IEVycm9yKGBXaWRnZXQgJyR7b3B0cy53aWRnZXR9JyBpcyBub3QgZGVmaW5lZCBtYWtlIHN1cmUgaXRzIGJlZW4gaW1wb3J0ZWRgKTtcclxuXHRcdH1cclxuXHJcblx0XHQvLyBnZW5lcmF0ZSB0aGUgd2lkZ2V0IGNvbnRlbnRcclxuXHRcdHZhciBidWlsdCA9IHdpZGdldC5tYWtlKG9wdHMpO1xyXG5cclxuXHRcdHJldHVybiBtYWtlR3JvdXAoe1xyXG5cdFx0XHRwYXJlbnQ6IG9wdHMucGFyZW50LFxyXG5cdFx0XHRkaXNwOiBvcHRzLmRpc3AsXHJcblx0XHRcdGdyb3VwOiBBcnJheS5pc0FycmF5KGJ1aWx0KSA/IGJ1aWx0IDogW2J1aWx0XSxcclxuXHRcdFx0YmluZDogd2lkZ2V0LmJpbmQgJiYgd2lkZ2V0LmJpbmQuYmluZCh3aWRnZXQsIG9wdHMpXHJcblx0XHR9KTtcclxuXHR9XHJcblx0Ly8gbWFrZSBhIHNpbmdsZSBub2RlXHJcblx0ZWxzZSB7XHJcblx0XHRyZXR1cm4gbWFrZURvbShvcHRzKTtcclxuXHR9XHJcbn07XHJcblxyXG4vLyByZWdpc3RlciBhIHdpZGdldFxyXG5tYWtlLnJlZ2lzdGVyID0gZnVuY3Rpb24obmFtZSwgd2lkZ2V0KSB7XHJcblx0d2lkZ2V0c1tuYW1lXSA9IHdpZGdldDtcclxufTtcclxuIiwiLyoqXHJcbiAqIEEgYmFzaWMga2V5IHZhbHVlIGRhdGEgc3RvcmVcclxuICovXHJcblxyXG5jbGFzcyBLZXlWYWx1ZVN0b3JlIGV4dGVuZHMgbGlmZUxpbmUuRXZlbnRFbWl0dGVyIHtcclxuXHRjb25zdHJ1Y3RvcihhZGFwdGVyKSB7XHJcblx0XHRzdXBlcigpO1xyXG5cdFx0dGhpcy5fYWRhcHRlciA9IGFkYXB0ZXI7XHJcblxyXG5cdFx0Ly8gbWFrZSBzdXJlIHdlIGhhdmUgYW4gYWRhcHRlclxyXG5cdFx0aWYoIWFkYXB0ZXIpIHtcclxuXHRcdFx0dGhyb3cgbmV3IEVycm9yKFwiS2V5VmFsdWVTdG9yZSBtdXN0IGJlIGluaXRpYWxpemVkIHdpdGggYW4gYWRhcHRlclwiKVxyXG5cdFx0fVxyXG5cdH1cclxuXHJcblx0LyoqXHJcblx0ICogR2V0IHRoZSBjb3JyaXNwb25kaW5nIHZhbHVlIG91dCBvZiB0aGUgZGF0YSBzdG9yZSBvdGhlcndpc2UgcmV0dXJuIGRlZmF1bHRcclxuXHQgKi9cclxuXHRnZXQoa2V5LCBfZGVmYXVsdCkge1xyXG5cdFx0Ly8gY2hlY2sgaWYgdGhpcyB2YWx1ZSBoYXMgYmVlbiBvdmVycmlkZW5cclxuXHRcdGlmKHRoaXMuX292ZXJyaWRlcyAmJiB0aGlzLl9vdmVycmlkZXMuaGFzT3duUHJvcGVydHkoa2V5KSkge1xyXG5cdFx0XHRyZXR1cm4gUHJvbWlzZS5yZXNvbHZlKHRoaXMuX292ZXJyaWRlc1trZXldKTtcclxuXHRcdH1cclxuXHJcblx0XHRyZXR1cm4gdGhpcy5fYWRhcHRlci5nZXQoa2V5KVxyXG5cclxuXHRcdC50aGVuKHJlc3VsdCA9PiB7XHJcblx0XHRcdC8vIHRoZSBpdGVtIGlzIG5vdCBkZWZpbmVkXHJcblx0XHRcdGlmKCFyZXN1bHQpIHtcclxuXHRcdFx0XHRyZXR1cm4gX2RlZmF1bHQ7XHJcblx0XHRcdH1cclxuXHJcblx0XHRcdHJldHVybiByZXN1bHQudmFsdWU7XHJcblx0XHR9KTtcclxuXHR9XHJcblxyXG5cdC8qKlxyXG5cdCAqIFNldCBhIHNpbmdsZSB2YWx1ZSBvciBzZXZlcmFsIHZhbHVlc1xyXG5cdCAqXHJcblx0ICoga2V5IC0+IHZhbHVlXHJcblx0ICogb3JcclxuXHQgKiB7IGtleTogdmFsdWUgfVxyXG5cdCAqL1xyXG5cdHNldChrZXksIHZhbHVlKSB7XHJcblx0XHQvLyBzZXQgYSBzaW5nbGUgdmFsdWVcclxuXHRcdGlmKHR5cGVvZiBrZXkgPT0gXCJzdHJpbmdcIikge1xyXG5cdFx0XHR2YXIgcHJvbWlzZSA9IHRoaXMuX2FkYXB0ZXIuc2V0KHtcclxuXHRcdFx0XHRpZDoga2V5LFxyXG5cdFx0XHRcdHZhbHVlLFxyXG5cdFx0XHRcdG1vZGlmaWVkOiBEYXRlLm5vdygpXHJcblx0XHRcdH0pO1xyXG5cclxuXHRcdFx0Ly8gdHJpZ2dlciB0aGUgY2hhbmdlXHJcblx0XHRcdHRoaXMuZW1pdChrZXksIHZhbHVlKTtcclxuXHJcblx0XHRcdHJldHVybiBwcm9taXNlO1xyXG5cdFx0fVxyXG5cdFx0Ly8gc2V0IHNldmVyYWwgdmFsdWVzXHJcblx0XHRlbHNlIHtcclxuXHRcdFx0Ly8gdGVsbCB0aGUgY2FsbGVyIHdoZW4gd2UgYXJlIGRvbmVcclxuXHRcdFx0bGV0IHByb21pc2VzID0gW107XHJcblxyXG5cdFx0XHRmb3IobGV0IF9rZXkgb2YgT2JqZWN0LmdldE93blByb3BlcnR5TmFtZXMoa2V5KSkge1xyXG5cdFx0XHRcdHByb21pc2VzLnB1c2goXHJcblx0XHRcdFx0XHR0aGlzLl9hZGFwdGVyLnNldCh7XHJcblx0XHRcdFx0XHRcdGlkOiBfa2V5LFxyXG5cdFx0XHRcdFx0XHR2YWx1ZToga2V5W19rZXldLFxyXG5cdFx0XHRcdFx0XHRtb2RpZmllZDogRGF0ZS5ub3coKVxyXG5cdFx0XHRcdFx0fSlcclxuXHRcdFx0XHQpO1xyXG5cclxuXHRcdFx0XHQvLyB0cmlnZ2VyIHRoZSBjaGFuZ2VcclxuXHRcdFx0XHR0aGlzLmVtaXQoX2tleSwga2V5W19rZXldKTtcclxuXHRcdFx0fVxyXG5cclxuXHRcdFx0cmV0dXJuIFByb21pc2UuYWxsKHByb21pc2VzKTtcclxuXHRcdH1cclxuXHR9XHJcblxyXG5cdCAvKipcclxuXHQgICogV2F0Y2ggdGhlIHZhbHVlIGZvciBjaGFuZ2VzXHJcblx0ICAqXHJcblx0ICAqIG9wdHMuY3VycmVudCAtIHNlbmQgdGhlIGN1cnJlbnQgdmFsdWUgb2Yga2V5IChkZWZhdWx0OiBmYWxzZSlcclxuXHQgICogb3B0cy5kZWZhdWx0IC0gdGhlIGRlZmF1bHQgdmFsdWUgdG8gc2VuZCBmb3Igb3B0cy5jdXJyZW50XHJcblx0ICAqL1xyXG5cdCB3YXRjaChrZXksIG9wdHMsIGZuKSB7XHJcblx0XHQgLy8gbWFrZSBvcHRzIG9wdGlvbmFsXHJcblx0XHQgaWYodHlwZW9mIG9wdHMgPT0gXCJmdW5jdGlvblwiKSB7XHJcblx0XHRcdCBmbiA9IG9wdHM7XHJcblx0XHRcdCBvcHRzID0ge307XHJcblx0XHQgfVxyXG5cclxuXHRcdCAvLyBzZW5kIHRoZSBjdXJyZW50IHZhbHVlXHJcblx0XHQgaWYob3B0cy5jdXJyZW50KSB7XHJcblx0XHRcdCB0aGlzLmdldChrZXksIG9wdHMuZGVmYXVsdClcclxuXHRcdFx0IFx0LnRoZW4odmFsdWUgPT4gZm4odmFsdWUpKTtcclxuXHRcdCB9XHJcblxyXG5cdFx0IC8vIGxpc3RlbiBmb3IgYW55IGNoYW5nZXNcclxuXHRcdCByZXR1cm4gdGhpcy5vbihrZXksIHZhbHVlID0+IHtcclxuXHRcdFx0IC8vIG9ubHkgZW1pdCB0aGUgY2hhbmdlIGlmIHRoZXJlIGlzIG5vdCBhbiBvdmVycmlkZSBpbiBwbGFjZVxyXG5cdFx0XHQgaWYoIXRoaXMuX292ZXJyaWRlcyB8fCAhdGhpcy5fb3ZlcnJpZGVzLmhhc093blByb3BlcnR5KGtleSkpIHtcclxuXHRcdFx0XHQgZm4odmFsdWUpO1xyXG5cdFx0XHQgfVxyXG5cdFx0IH0pO1xyXG5cdCB9XHJcblxyXG5cdCAvKipcclxuXHQgICogT3ZlcnJpZGUgdGhlIHZhbHVlcyBmcm9tIHRoZSBhZGFwdG9yIHdpdGhvdXQgd3JpdGluZyB0byB0aGVtXHJcblx0ICAqXHJcblx0ICAqIFVzZWZ1bCBmb3IgY29tYmluaW5nIGpzb24gc2V0dGluZ3Mgd2l0aCBjb21tYW5kIGxpbmUgZmxhZ3NcclxuXHQgICovXHJcblx0IHNldE92ZXJyaWRlcyhvdmVycmlkZXMpIHtcclxuXHRcdCB0aGlzLl9vdmVycmlkZXMgPSBvdmVycmlkZXM7XHJcblxyXG5cdFx0IC8vIGVtaXQgY2hhbmdlcyBmb3IgZWFjaCBvZiB0aGUgb3ZlcnJpZGVzXHJcblx0XHQgT2JqZWN0LmdldE93blByb3BlcnR5TmFtZXMob3ZlcnJpZGVzKVxyXG5cclxuXHRcdCAuZm9yRWFjaChrZXkgPT4gdGhpcy5lbWl0KGtleSwgb3ZlcnJpZGVzW2tleV0pKTtcclxuXHQgfVxyXG59XHJcblxyXG5tb2R1bGUuZXhwb3J0cyA9IEtleVZhbHVlU3RvcmU7XHJcbiIsIi8qKlxyXG4gKiBBbiBpbiBtZW1vcnkgYWRhcHRlciBmb3IgZGF0YSBzdG9yZXNcclxuICovXHJcblxyXG5jbGFzcyBNZW1BZGFwdG9yIHtcclxuXHRjb25zdHJ1Y3RvcigpIHtcclxuXHRcdHRoaXMuX2RhdGEgPSB7fTtcclxuXHR9XHJcblxyXG5cdC8qKlxyXG5cdCAqIEdldCBhbiBhcnJheSBvZiB2YWx1ZXNcclxuXHQgKi9cclxuXHRnZXRBbGwoKSB7XHJcblx0XHRyZXR1cm4gUHJvbWlzZS5yZXNvbHZlKFxyXG5cdFx0XHRPYmplY3QuZ2V0T3duUHJvcGVydHlOYW1lcyh0aGlzLl9kYXRhKVxyXG5cclxuXHRcdFx0Lm1hcChuYW1lID0+IHRoaXMuX2RhdGFbbmFtZV0pXHJcblx0XHQpO1xyXG5cdH1cclxuXHJcblx0LyoqXHJcblx0ICogTG9va3VwIGEgdmFsdWVcclxuXHQgKlxyXG5cdCAqIHJldHVybnMge2lkLCB2YWx1ZX1cclxuXHQgKi9cclxuXHRnZXQoaWQpIHtcclxuXHRcdC8vIGNoZWNrIGlmIHdlIGhhdmUgdGhlIHZhbHVlXHJcblx0XHRpZih0aGlzLl9kYXRhLmhhc093blByb3BlcnR5KGlkKSkge1xyXG5cdFx0XHRyZXR1cm4gUHJvbWlzZS5yZXNvbHZlKHRoaXMuX2RhdGFbaWRdKTtcclxuXHRcdH1cclxuXHJcblx0XHRyZXR1cm4gUHJvbWlzZS5yZXNvbHZlKCk7XHJcblx0fVxyXG5cclxuXHQvKipcclxuXHQgKiBTdG9yZSBhIHZhbHVlXHJcblx0ICpcclxuXHQgKiBUaGUgdmFsdWUgaXMgc3RvcmVkIGJ5IGl0cyBpZCBwcm9wZXJ0eVxyXG5cdCAqL1xyXG5cdHNldCh2YWx1ZSkge1xyXG5cdFx0Ly8gc3RvcmUgdGhlIHZhbHVlXHJcblx0XHR0aGlzLl9kYXRhW3ZhbHVlLmlkXSA9IHZhbHVlO1xyXG5cclxuXHRcdHJldHVybiBQcm9taXNlLnJlc29sdmUoKTtcclxuXHR9XHJcblxyXG5cdC8qKlxyXG5cdCAqIFJlbW92ZSBhIHZhbHVlIGZyb20gdGhlIGFkYXB0b3JcclxuXHQgKi9cclxuXHRyZW1vdmUoa2V5KSB7XHJcblx0XHRkZWxldGUgdGhpcy5fZGF0YVtrZXldO1xyXG5cclxuXHRcdHJldHVybiBQcm9taXNlLnJlc29sdmUoKTtcclxuXHR9XHJcbn1cclxuXHJcbm1vZHVsZS5leHBvcnRzID0gTWVtQWRhcHRvcjtcclxuIiwiLyoqXHJcbiAqIENyZWF0ZSBhIGdsb2JhbCBvYmplY3Qgd2l0aCBjb21tb25seSB1c2VkIG1vZHVsZXMgdG8gYXZvaWQgNTAgbWlsbGlvbiByZXF1aXJlc1xyXG4gKi9cclxuXHJcbnZhciBFdmVudEVtaXR0ZXIgPSByZXF1aXJlKFwiLi91dGlsL2V2ZW50LWVtaXR0ZXJcIik7XHJcblxyXG52YXIgbGlmZUxpbmUgPSBuZXcgRXZlbnRFbWl0dGVyKCk7XHJcblxyXG4vLyBwbGF0Zm9ybSBkZXRlY3Rpb25cclxubGlmZUxpbmUubm9kZSA9IHR5cGVvZiBwcm9jZXNzID09IFwib2JqZWN0XCI7XHJcbmxpZmVMaW5lLmJyb3dzZXIgPSB0eXBlb2Ygd2luZG93ID09IFwib2JqZWN0XCI7XHJcblxyXG4vLyBhdHRhY2ggdXRpbHNcclxubGlmZUxpbmUuRGlzcG9zYWJsZSA9IHJlcXVpcmUoXCIuL3V0aWwvZGlzcG9zYWJsZVwiKTtcclxubGlmZUxpbmUuRXZlbnRFbWl0dGVyID0gRXZlbnRFbWl0dGVyO1xyXG5cclxuLy8gYXR0YWNoIGxpZmVsaW5lIHRvIHRoZSBnbG9iYWwgb2JqZWN0XHJcbihsaWZlTGluZS5ub2RlID8gZ2xvYmFsIDogYnJvd3NlcikubGlmZUxpbmUgPSBsaWZlTGluZTtcclxuXHJcbi8vIGF0dGFjaCBjb25maWdcclxudmFyIE1lbUFkYXB0b3IgPSByZXF1aXJlKFwiLi9kYXRhLXN0b3Jlcy9tZW0tYWRhcHRvclwiKTtcclxudmFyIEtleVZhbHVlU3RvcmUgPSByZXF1aXJlKFwiLi9kYXRhLXN0b3Jlcy9rZXktdmFsdWUtc3RvcmVcIik7XHJcblxyXG5saWZlTGluZS5jb25maWcgPSBuZXcgS2V5VmFsdWVTdG9yZShuZXcgTWVtQWRhcHRvcigpKTtcclxuIiwiLyoqXHJcbiAqIEtlZXAgYSBsaXN0IG9mIHN1YnNjcmlwdGlvbnMgdG8gdW5zdWJzY3JpYmUgZnJvbSB0b2dldGhlclxyXG4gKi9cclxuXHJcbmNsYXNzIERpc3Bvc2FibGUge1xyXG5cdGNvbnN0cnVjdG9yKCkge1xyXG5cdFx0dGhpcy5fc3Vic2NyaXB0aW9ucyA9IFtdO1xyXG5cdH1cclxuXHJcblx0Ly8gVW5zdWJzY3JpYmUgZnJvbSBhbGwgc3Vic2NyaXB0aW9uc1xyXG5cdGRpc3Bvc2UoKSB7XHJcblx0XHQvLyByZW1vdmUgdGhlIGZpcnN0IHN1YnNjcmlwdGlvbiB1bnRpbCB0aGVyZSBhcmUgbm9uZSBsZWZ0XHJcblx0XHR3aGlsZSh0aGlzLl9zdWJzY3JpcHRpb25zLmxlbmd0aCA+IDApIHtcclxuXHRcdFx0dGhpcy5fc3Vic2NyaXB0aW9ucy5zaGlmdCgpLnVuc3Vic2NyaWJlKCk7XHJcblx0XHR9XHJcblx0fVxyXG5cclxuXHQvLyBBZGQgYSBzdWJzY3JpcHRpb24gdG8gdGhlIGRpc3Bvc2FibGVcclxuXHRhZGQoc3Vic2NyaXB0aW9uKSB7XHJcblx0XHR0aGlzLl9zdWJzY3JpcHRpb25zLnB1c2goc3Vic2NyaXB0aW9uKTtcclxuXHR9XHJcblxyXG5cdC8vIGRpc3Bvc2Ugd2hlbiBhbiBldmVudCBpcyBmaXJlZFxyXG5cdGRpc3Bvc2VPbihlbWl0dGVyLCBldmVudCkge1xyXG5cdFx0dGhpcy5hZGQoZW1pdHRlci5vbihldmVudCwgKCkgPT4gdGhpcy5kaXNwb3NlKCkpKTtcclxuXHR9XHJcbn07XHJcblxyXG5tb2R1bGUuZXhwb3J0cyA9IERpc3Bvc2FibGU7XHJcbiIsIi8qKlxyXG4gKiBBIGJhc2ljIGV2ZW50IGVtaXR0ZXJcclxuICovXHJcblxyXG5jbGFzcyBFdmVudEVtaXR0ZXIge1xyXG5cdGNvbnN0cnVjdG9yKCkge1xyXG5cdFx0dGhpcy5fbGlzdGVuZXJzID0ge307XHJcblx0fVxyXG5cclxuXHQvKipcclxuXHQgKiBBZGQgYW4gZXZlbnQgbGlzdGVuZXJcclxuXHQgKi9cclxuXHRvbihuYW1lLCBsaXN0ZW5lcikge1xyXG5cdFx0Ly8gaWYgd2UgZG9uJ3QgaGF2ZSBhbiBleGlzdGluZyBsaXN0ZW5lcnMgYXJyYXkgY3JlYXRlIG9uZVxyXG5cdFx0aWYoIXRoaXMuX2xpc3RlbmVyc1tuYW1lXSkge1xyXG5cdFx0XHR0aGlzLl9saXN0ZW5lcnNbbmFtZV0gPSBbXTtcclxuXHRcdH1cclxuXHJcblx0XHQvLyBhZGQgdGhlIGxpc3RlbmVyXHJcblx0XHR0aGlzLl9saXN0ZW5lcnNbbmFtZV0ucHVzaChsaXN0ZW5lcik7XHJcblxyXG5cdFx0Ly8gZ2l2ZSB0aGVtIGEgc3Vic2NyaXB0aW9uXHJcblx0XHRyZXR1cm4ge1xyXG5cdFx0XHRfbGlzdGVuZXI6IGxpc3RlbmVyLFxyXG5cclxuXHRcdFx0dW5zdWJzY3JpYmU6ICgpID0+IHtcclxuXHRcdFx0XHQvLyBmaW5kIHRoZSBsaXN0ZW5lclxyXG5cdFx0XHRcdHZhciBpbmRleCA9IHRoaXMuX2xpc3RlbmVyc1tuYW1lXS5pbmRleE9mKGxpc3RlbmVyKTtcclxuXHJcblx0XHRcdFx0aWYoaW5kZXggIT09IC0xKSB7XHJcblx0XHRcdFx0XHR0aGlzLl9saXN0ZW5lcnNbbmFtZV0uc3BsaWNlKGluZGV4LCAxKTtcclxuXHRcdFx0XHR9XHJcblx0XHRcdH1cclxuXHRcdH07XHJcblx0fVxyXG5cclxuXHQvKipcclxuXHQgKiBFbWl0IGFuIGV2ZW50XHJcblx0ICovXHJcblx0ZW1pdChuYW1lLCAuLi5hcmdzKSB7XHJcblx0XHQvLyBjaGVjayBmb3IgbGlzdGVuZXJzXHJcblx0XHRpZih0aGlzLl9saXN0ZW5lcnNbbmFtZV0pIHtcclxuXHRcdFx0Zm9yKGxldCBsaXN0ZW5lciBvZiB0aGlzLl9saXN0ZW5lcnNbbmFtZV0pIHtcclxuXHRcdFx0XHQvLyBjYWxsIHRoZSBsaXN0ZW5lcnNcclxuXHRcdFx0XHRsaXN0ZW5lciguLi5hcmdzKTtcclxuXHRcdFx0fVxyXG5cdFx0fVxyXG5cdH1cclxuXHJcblx0LyoqXHJcblx0ICogRW1pdCBhbiBldmVudCBhbmQgc2tpcCBzb21lIGxpc3RlbmVyc1xyXG5cdCAqL1xyXG5cdHBhcnRpYWxFbWl0KG5hbWUsIHNraXBzID0gW10sIC4uLmFyZ3MpIHtcclxuXHRcdC8vIGFsbG93IGEgc2luZ2xlIGl0ZW1cclxuXHRcdGlmKCFBcnJheS5pc0FycmF5KHNraXBzKSkge1xyXG5cdFx0XHRza2lwcyA9IFtza2lwc107XHJcblx0XHR9XHJcblxyXG5cdFx0Ly8gY2hlY2sgZm9yIGxpc3RlbmVyc1xyXG5cdFx0aWYodGhpcy5fbGlzdGVuZXJzW25hbWVdKSB7XHJcblx0XHRcdGZvcihsZXQgbGlzdGVuZXIgb2YgdGhpcy5fbGlzdGVuZXJzW25hbWVdKSB7XHJcblx0XHRcdFx0Ly8gdGhpcyBldmVudCBsaXN0ZW5lciBpcyBiZWluZyBza2lwZWRcclxuXHRcdFx0XHRpZihza2lwcy5maW5kKHNraXAgPT4gc2tpcC5fbGlzdGVuZXIgPT0gbGlzdGVuZXIpKSB7XHJcblx0XHRcdFx0XHRjb250aW51ZTtcclxuXHRcdFx0XHR9XHJcblxyXG5cdFx0XHRcdC8vIGNhbGwgdGhlIGxpc3RlbmVyc1xyXG5cdFx0XHRcdGxpc3RlbmVyKC4uLmFyZ3MpO1xyXG5cdFx0XHR9XHJcblx0XHR9XHJcblx0fVxyXG59XHJcblxyXG5tb2R1bGUuZXhwb3J0cyA9IEV2ZW50RW1pdHRlcjtcclxuIl19
