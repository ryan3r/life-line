(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
'use strict';

(function() {
  function toArray(arr) {
    return Array.prototype.slice.call(arr);
  }

  function promisifyRequest(request) {
    return new Promise(function(resolve, reject) {
      request.onsuccess = function() {
        resolve(request.result);
      };

      request.onerror = function() {
        reject(request.error);
      };
    });
  }

  function promisifyRequestCall(obj, method, args) {
    var request;
    var p = new Promise(function(resolve, reject) {
      request = obj[method].apply(obj, args);
      promisifyRequest(request).then(resolve, reject);
    });

    p.request = request;
    return p;
  }

  function promisifyCursorRequestCall(obj, method, args) {
    var p = promisifyRequestCall(obj, method, args);
    return p.then(function(value) {
      if (!value) return;
      return new Cursor(value, p.request);
    });
  }

  function proxyProperties(ProxyClass, targetProp, properties) {
    properties.forEach(function(prop) {
      Object.defineProperty(ProxyClass.prototype, prop, {
        get: function() {
          return this[targetProp][prop];
        },
        set: function(val) {
          this[targetProp][prop] = val;
        }
      });
    });
  }

  function proxyRequestMethods(ProxyClass, targetProp, Constructor, properties) {
    properties.forEach(function(prop) {
      if (!(prop in Constructor.prototype)) return;
      ProxyClass.prototype[prop] = function() {
        return promisifyRequestCall(this[targetProp], prop, arguments);
      };
    });
  }

  function proxyMethods(ProxyClass, targetProp, Constructor, properties) {
    properties.forEach(function(prop) {
      if (!(prop in Constructor.prototype)) return;
      ProxyClass.prototype[prop] = function() {
        return this[targetProp][prop].apply(this[targetProp], arguments);
      };
    });
  }

  function proxyCursorRequestMethods(ProxyClass, targetProp, Constructor, properties) {
    properties.forEach(function(prop) {
      if (!(prop in Constructor.prototype)) return;
      ProxyClass.prototype[prop] = function() {
        return promisifyCursorRequestCall(this[targetProp], prop, arguments);
      };
    });
  }

  function Index(index) {
    this._index = index;
  }

  proxyProperties(Index, '_index', [
    'name',
    'keyPath',
    'multiEntry',
    'unique'
  ]);

  proxyRequestMethods(Index, '_index', IDBIndex, [
    'get',
    'getKey',
    'getAll',
    'getAllKeys',
    'count'
  ]);

  proxyCursorRequestMethods(Index, '_index', IDBIndex, [
    'openCursor',
    'openKeyCursor'
  ]);

  function Cursor(cursor, request) {
    this._cursor = cursor;
    this._request = request;
  }

  proxyProperties(Cursor, '_cursor', [
    'direction',
    'key',
    'primaryKey',
    'value'
  ]);

  proxyRequestMethods(Cursor, '_cursor', IDBCursor, [
    'update',
    'delete'
  ]);

  // proxy 'next' methods
  ['advance', 'continue', 'continuePrimaryKey'].forEach(function(methodName) {
    if (!(methodName in IDBCursor.prototype)) return;
    Cursor.prototype[methodName] = function() {
      var cursor = this;
      var args = arguments;
      return Promise.resolve().then(function() {
        cursor._cursor[methodName].apply(cursor._cursor, args);
        return promisifyRequest(cursor._request).then(function(value) {
          if (!value) return;
          return new Cursor(value, cursor._request);
        });
      });
    };
  });

  function ObjectStore(store) {
    this._store = store;
  }

  ObjectStore.prototype.createIndex = function() {
    return new Index(this._store.createIndex.apply(this._store, arguments));
  };

  ObjectStore.prototype.index = function() {
    return new Index(this._store.index.apply(this._store, arguments));
  };

  proxyProperties(ObjectStore, '_store', [
    'name',
    'keyPath',
    'indexNames',
    'autoIncrement'
  ]);

  proxyRequestMethods(ObjectStore, '_store', IDBObjectStore, [
    'put',
    'add',
    'delete',
    'clear',
    'get',
    'getAll',
    'getKey',
    'getAllKeys',
    'count'
  ]);

  proxyCursorRequestMethods(ObjectStore, '_store', IDBObjectStore, [
    'openCursor',
    'openKeyCursor'
  ]);

  proxyMethods(ObjectStore, '_store', IDBObjectStore, [
    'deleteIndex'
  ]);

  function Transaction(idbTransaction) {
    this._tx = idbTransaction;
    this.complete = new Promise(function(resolve, reject) {
      idbTransaction.oncomplete = function() {
        resolve();
      };
      idbTransaction.onerror = function() {
        reject(idbTransaction.error);
      };
      idbTransaction.onabort = function() {
        reject(idbTransaction.error);
      };
    });
  }

  Transaction.prototype.objectStore = function() {
    return new ObjectStore(this._tx.objectStore.apply(this._tx, arguments));
  };

  proxyProperties(Transaction, '_tx', [
    'objectStoreNames',
    'mode'
  ]);

  proxyMethods(Transaction, '_tx', IDBTransaction, [
    'abort'
  ]);

  function UpgradeDB(db, oldVersion, transaction) {
    this._db = db;
    this.oldVersion = oldVersion;
    this.transaction = new Transaction(transaction);
  }

  UpgradeDB.prototype.createObjectStore = function() {
    return new ObjectStore(this._db.createObjectStore.apply(this._db, arguments));
  };

  proxyProperties(UpgradeDB, '_db', [
    'name',
    'version',
    'objectStoreNames'
  ]);

  proxyMethods(UpgradeDB, '_db', IDBDatabase, [
    'deleteObjectStore',
    'close'
  ]);

  function DB(db) {
    this._db = db;
  }

  DB.prototype.transaction = function() {
    return new Transaction(this._db.transaction.apply(this._db, arguments));
  };

  proxyProperties(DB, '_db', [
    'name',
    'version',
    'objectStoreNames'
  ]);

  proxyMethods(DB, '_db', IDBDatabase, [
    'close'
  ]);

  // Add cursor iterators
  // TODO: remove this once browsers do the right thing with promises
  ['openCursor', 'openKeyCursor'].forEach(function(funcName) {
    [ObjectStore, Index].forEach(function(Constructor) {
      Constructor.prototype[funcName.replace('open', 'iterate')] = function() {
        var args = toArray(arguments);
        var callback = args[args.length - 1];
        var nativeObject = this._store || this._index;
        var request = nativeObject[funcName].apply(nativeObject, args.slice(0, -1));
        request.onsuccess = function() {
          callback(request.result);
        };
      };
    });
  });

  // polyfill getAll
  [Index, ObjectStore].forEach(function(Constructor) {
    if (Constructor.prototype.getAll) return;
    Constructor.prototype.getAll = function(query, count) {
      var instance = this;
      var items = [];

      return new Promise(function(resolve) {
        instance.iterateCursor(query, function(cursor) {
          if (!cursor) {
            resolve(items);
            return;
          }
          items.push(cursor.value);

          if (count !== undefined && items.length == count) {
            resolve(items);
            return;
          }
          cursor.continue();
        });
      });
    };
  });

  var exp = {
    open: function(name, version, upgradeCallback) {
      var p = promisifyRequestCall(indexedDB, 'open', [name, version]);
      var request = p.request;

      request.onupgradeneeded = function(event) {
        if (upgradeCallback) {
          upgradeCallback(new UpgradeDB(request.result, event.oldVersion, request.transaction));
        }
      };

      return p.then(function(db) {
        return new DB(db);
      });
    },
    delete: function(name) {
      return promisifyRequestCall(indexedDB, 'deleteDatabase', [name]);
    }
  };

  if (typeof module !== 'undefined') {
    module.exports = exp;
  }
  else {
    self.idb = exp;
  }
}());

},{}],2:[function(require,module,exports){
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

},{}],3:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
	value: true
});

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

exports.store = store;

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _possibleConstructorReturn(self, call) { if (!self) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return call && (typeof call === "object" || typeof call === "function") ? call : self; }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }

/**
 * Work with data stores
 */

var DEBOUNCE_TIME = 2000;
var DATA_STORE_ROOT = "/api/data/";

var idb = require("idb");

// cache data store instances
var stores = {};

// get/create a datastore
function store(name) {
	// use the cached store
	if (name in stores) {
		return stores[name];
	}

	var store = new Store(name);

	// cache the data store instance
	stores[name] = store;

	// tell any listeners the store has been created
	lifeLine.emit("data-store-created", store);

	return store;
};

var Store = function (_lifeLine$EventEmitte) {
	_inherits(Store, _lifeLine$EventEmitte);

	function Store(name) {
		_classCallCheck(this, Store);

		var _this = _possibleConstructorReturn(this, (Store.__proto__ || Object.getPrototypeOf(Store)).call(this));

		_this.name = name;
		_this._cache = {};
		// don't send duplicate requests
		_this._requesting = [];
		// promise for the database
		_this._db = idb.open("data-stores", 2, function (db) {
			// upgrade or create the db
			if (db.oldVersion < 1) db.createObjectStore("assignments", { keyPath: "id" });
			if (db.oldVersion < 2) db.createObjectStore("sync-store", { keyPath: "id" });
		});
		return _this;
	}

	// set the function to deserialize all data from the server


	_createClass(Store, [{
		key: "setInit",
		value: function setInit(fn) {
			this._deserializer = fn;
		}

		// get all the items and listen for any changes

	}, {
		key: "getAll",
		value: function getAll(fn) {
			var _this2 = this;

			if (!fn) {
				// load items from idb
				return this._db.then(function (db) {
					return db.transaction(_this2.name).objectStore(_this2.name).getAll();
				});
			}

			// go to the cache first
			fn(arrayFromObject(this._cache));

			// load items from idb
			this._db.then(function (db) {
				db.transaction(_this2.name).objectStore(_this2.name).getAll().then(function (all) {
					// store items in the cache
					var _iteratorNormalCompletion = true;
					var _didIteratorError = false;
					var _iteratorError = undefined;

					try {
						for (var _iterator = all[Symbol.iterator](), _step; !(_iteratorNormalCompletion = (_step = _iterator.next()).done); _iteratorNormalCompletion = true) {
							var item = _step.value;

							_this2._cache[item.id] = item;
						}

						// notify listeners we loaded the data
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

					_this2.emit("change");
				});
			});

			// listen for any changes
			return this.on("change", function () {
				// the changes will we in the cache
				fn(arrayFromObject(_this2._cache));
			});
		}

		// get a single item and listen for changes

	}, {
		key: "get",
		value: function get(id, fn) {
			var _this3 = this;

			// just load the value from idb
			if (!fn) {
				// hit the cache
				if (this._cache[id]) return Promise.resolve(this._cache[id]);

				// hit idb
				return this._db.then(function (db) {
					return db.transaction(_this3.name).objectStore(_this3.name).get(id).then(function (item) {
						if (typeof _this3._deserializer == "function") {
							return _this3._deserializer(item) || item;
						}

						return item;
					});
				});
			}

			// go to the cache first
			fn(this._cache[id]);

			// load the item from idb
			this._db.then(function (db) {
				db.transaction(_this3.name).objectStore(_this3.name).get(id).then(function (item) {
					if (item) {
						// store item in the cache
						_this3._cache[item.id] = item;

						// notify listeners we loaded the data
						_this3.emit("change");
					}
				});
			});

			// listen for any changes
			return this.on("change", function () {
				fn(_this3._cache[id]);
			});
		}

		// store a value in the store

	}, {
		key: "set",
		value: function set(value, skips) {
			var _this4 = this;

			var opts = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : {};

			var isNew = !!this._cache[value.id];

			// deserialize
			if (typeof this._deserializer == "function") {
				value = this._deserializer(value) || value;
			}

			// store the value in the cache
			this._cache[value.id] = value;

			// save the item
			var save = function () {
				// save the item in the db
				_this4._db.then(function (db) {
					db.transaction(_this4.name, "readwrite").objectStore(_this4.name).put(value);
				});

				// sync the changes to the server
				_this4.partialEmit("sync-put", skips, value, isNew);
			};

			// emit a change
			this.partialEmit("change", skips);

			// don't wait to send the changes to the server
			if (opts.saveNow) return save();else debounce(this.name + "/" + value.id, save);
		}

		// remove a value from the store

	}, {
		key: "remove",
		value: function remove(id, skips) {
			var _this5 = this;

			// remove the value from the cache
			delete this._cache[id];

			// emit a change
			this.partialEmit("change", skips);

			// sync the changes to the server
			this.partialEmit("sync-delete", skips, id);

			// delete the item
			return this._db.then(function (db) {
				return db.transaction(_this5.name, "readwrite").objectStore(_this5.name).delete(id);
			});
		}

		// force saves to go through

	}, {
		key: "forceSave",
		value: function forceSave() {
			var _this6 = this;

			var _iteratorNormalCompletion2 = true;
			var _didIteratorError2 = false;
			var _iteratorError2 = undefined;

			try {
				for (var _iterator2 = Object.getOwnPropertyNames(debounceTimers)[Symbol.iterator](), _step2; !(_iteratorNormalCompletion2 = (_step2 = _iterator2.next()).done); _iteratorNormalCompletion2 = true) {
					var timer = _step2.value;

					// only save items from this data store
					if (timer.indexOf(this.name + "/") === 0) {
						continue;
					}

					// look up the timer id
					var id = timer.substr(timer.indexOf("/") + 1);
					var value = this._cache[id];

					// clear the timer
					clearTimeout(timer);

					// remove the timer from the list
					delete debounceTimers[timer];

					// don't save on delete
					if (!value) return;

					// save the item in the db
					this._db.then(function (db) {
						db.transaction(_this6.name, "readwrite").objectStore(_this6.name).put(value);
					});

					// sync the changes to the server
					this.emit("sync-put", value);
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
	}]);

	return Store;
}(lifeLine.EventEmitter);

// get an array from an object


var arrayFromObject = function (obj) {
	return Object.getOwnPropertyNames(obj).map(function (name) {
		return obj[name];
	});
};

// don't call a function too often
var debounceTimers = {};

var debounce = function (id, fn) {
	// cancel the previous delay
	clearTimeout(debounceTimers[id]);
	// start a new delay
	debounceTimers[id] = setTimeout(fn, DEBOUNCE_TIME);
};

},{"idb":1}],4:[function(require,module,exports){
"use strict";

/**
 * Browser specific globals
 */

lifeLine.makeDom = require("./util/dom-maker").default;
lifeLine.syncer = require("./syncer").syncer;

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

},{"./syncer":6,"./util/dom-maker":7}],5:[function(require,module,exports){
"use strict";

var _slicedToArray = function () { function sliceIterator(arr, i) { var _arr = []; var _n = true; var _d = false; var _e = undefined; try { for (var _i = arr[Symbol.iterator](), _s; !(_n = (_s = _i.next()).done); _n = true) { _arr.push(_s.value); if (i && _arr.length === i) break; } } catch (err) { _d = true; _e = err; } finally { try { if (!_n && _i["return"]) _i["return"](); } finally { if (_d) throw _e; } } return _arr; } return function (arr, i) { if (Array.isArray(arr)) { return arr; } else if (Symbol.iterator in Object(arr)) { return sliceIterator(arr, i); } else { throw new TypeError("Invalid attempt to destructure non-iterable instance"); } }; }(); // create the global object


require("../common/global");

require("./global");

var _dataStore = require("./data-store");

var syncStore = (0, _dataStore.store)("sync-store");

// all the files to cache
var CACHED_FILES = ["/", "/static/bundle.js", "/static/style.css", "/static/icon-144.png"];

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

					promises.push(syncStore.set({
						id: "version",
						value: version
					}));
				}

				return promises.length == 1 ? promises[0] : Promise.all(promises);
			});
		})).then(function () {
			return console.log("Update complete");
		});
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
					reason: "networ-error"
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

},{"../common/global":10,"./data-store":3,"./global":4}],6:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
	value: true
});
exports.syncer = undefined;

var _dataStore = require("./data-store");

function _toArray(arr) { return Array.isArray(arr) ? arr : Array.from(arr); } /**
                                                                               * Syncronize this client with the server
                                                                               */

var syncStore = (0, _dataStore.store)("sync-store");

var STORES = ["assignments"];

// create the global syncer refrence
var syncer = exports.syncer = new lifeLine.EventEmitter();

// save subscriptions to data store sync events so we dont trigger our self when we sync
var syncSubs = [];

// don't sync while we are syncing
var isSyncing = false;
var syncAgain = false;

// add a change to the sync queue
var enqueueChange = function (change) {
	// load the queue
	return syncStore.get("change-queue").then(function () {
		var _ref = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : {},
		    _ref$changes = _ref.changes,
		    changes = _ref$changes === undefined ? [] : _ref$changes;

		// get the id for the change
		var chId = change.type == "delete" ? change.id : change.data.id;

		var existing = changes.findIndex(function (ch) {
			return ch.type == "delete" ? ch.id == chId : ch.data.id == chId;
		});

		// remove the existing change
		if (existing !== -1) {
			changes.splice(existing, 1);
		}

		// add the change to the queue
		changes.push(change);

		// save the queue
		return syncStore.set({
			id: "change-queue",
			changes: changes
		});
	})

	// sync when idle
	.then(function () {
		return idle(syncer.sync);
	});
};

// add a sync listener to a data store
var onSync = function (ds, name, fn) {
	syncSubs.push(ds.on("sync-" + name, fn));
};

// when a data store is opened listen for changes
lifeLine.on("data-store-created", function (ds) {
	// don't sync the sync store
	if (ds.name == "sync-store") return;

	// create and enqueue a put change
	onSync(ds, "put", function (value, isNew) {
		enqueueChange({
			store: ds.name,
			type: isNew ? "create" : "put",
			data: value
		});
	});

	// create and enqueue a delete change
	onSync(ds, "delete", function (id) {
		enqueueChange({
			store: ds.name,
			type: "delete",
			id: id,
			timestamp: Date.now()
		});
	});
});

// wait for some idle time
var idle = function (fn) {
	if (typeof requestIdleCallback == "function") {
		requestIdleCallback(fn);
	} else {
		setTimeout(fn, 100);
	}
};

// sync with the server
syncer.sync = function () {
	// don't sync while offline
	if (navigator.online) {
		return;
	}

	// only do one sync at a time
	if (isSyncing) {
		syncAgain = true;
		return;
	}

	isSyncing = true;

	syncer.emit("sycn-start");

	// load the change queue
	var promises = [syncStore.get("change-queue").then(function () {
		var _ref2 = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : {},
		    _ref2$changes = _ref2.changes,
		    changes = _ref2$changes === undefined ? [] : _ref2$changes;

		return changes;
	})];

	// load all ids

	var _loop = function (storeName) {
		promises.push((0, _dataStore.store)(storeName).getAll().then(function (items) {
			var dates = {};

			// map modified date to the id
			items.forEach(function (item) {
				return dates[item.id] = item.modified;
			});

			return [storeName, dates];
		}));
	};

	var _iteratorNormalCompletion = true;
	var _didIteratorError = false;
	var _iteratorError = undefined;

	try {
		for (var _iterator = STORES[Symbol.iterator](), _step; !(_iteratorNormalCompletion = (_step = _iterator.next()).done); _iteratorNormalCompletion = true) {
			var storeName = _step.value;

			_loop(storeName);
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

	Promise.all(promises).then(function (_ref3) {
		var _ref4 = _toArray(_ref3),
		    changes = _ref4[0],
		    modifieds = _ref4.slice(1);

		// convert modifieds to an object
		var modifiedsObj = {};

		modifieds.forEach(function (modified) {
			return modifiedsObj[modified[0]] = modified[1];
		});

		// send the changes to the server
		return fetch("/api/data/", {
			method: "POST",
			credentials: "include",
			body: JSON.stringify({
				changes: changes,
				modifieds: modifiedsObj
			})
		});
	})

	// parse the body
	.then(function (res) {
		return res.json();
	})

	// catch any network errors
	.catch(function () {
		return { status: "fail", data: { reason: "network-error" } };
	}).then(function (_ref5) {
		var status = _ref5.status,
		    results = _ref5.data,
		    reason = _ref5.reason;

		// catch any error
		if (status == "fail") {
			// log the user in
			if (results.reason == "logged-out") {
				lifeLine.nav.navigate("/login");
			}

			return;
		}

		// clear the change queue
		results.unshift(syncStore.set({
			id: "change-queue",
			changes: []
		}));

		// apply the results
		return Promise.all(results.map(function (result, index) {
			// first result is the promise to reset the change queue
			if (index === 0) return result;
			console.log(result);

			// delete the local copy
			if (result.code == "item-deleted") {
				var store = (0, _dataStore.store)(result.store);

				return store.remove(result.id, syncSubs);
			}
			// save the newer version from the server
			else if (result.code == "newer-version") {
					var _store = (0, _dataStore.store)(result.store);

					return _store.set(result.data, syncSubs, { saveNow: true });
				}
		}));
	}).then(function () {
		// release the lock
		isSyncing = false;

		// there was an attempt to sync while we where syncing
		if (syncAgain) {
			syncAgain = false;

			idle(syncer.sync);
		}

		syncer.emit("sync-complete");
	});
};

// don't add event listeners in the service worker
if (typeof window == "object") {
	// when we come back on line sync
	window.addEventListener("online", function () {
		return syncer.sync();
	});

	// when the user navigates back sync
	window.addEventListener("visibilitychange", function () {
		if (!document.hidden) {
			syncer.sync();
		}
	});

	// sync on startup
	syncer.sync();
}

},{"./data-store":3}],7:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
	value: true
});
exports.default = make;
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

function make(opts) {
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

},{}],8:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
	value: true
});

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
			// copy the disposable
			if (subscription instanceof Disposable) {
				// copy the subscriptions from the disposable
				this._subscriptions = this._subscriptions.concat(subscription._subscriptions);

				// remove the refrences from the disposable
				subscription._subscriptions = [];
			}
			// add a subscription
			else {
					this._subscriptions.push(subscription);
				}
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

exports.default = Disposable;
;

},{}],9:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
	value: true
});

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

exports.default = EventEmitter;

},{}],10:[function(require,module,exports){
(function (process,global){
"use strict";

var _eventEmitter = require("./event-emitter");

var _eventEmitter2 = _interopRequireDefault(_eventEmitter);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

var lifeLine = new _eventEmitter2.default();

// platform detection
/**
 * Create a global object with commonly used modules to avoid 50 million requires
 */

lifeLine.node = typeof process == "object";
lifeLine.browser = typeof window == "object";

// attach utils
lifeLine.Disposable = require("./disposable").default;
lifeLine.EventEmitter = _eventEmitter2.default;

// attach lifeline to the global object
(lifeLine.node ? global : browser).lifeLine = lifeLine;

}).call(this,require('_process'),typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})

},{"./disposable":8,"./event-emitter":9,"_process":2}]},{},[5])
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCJub2RlX21vZHVsZXMvaWRiL2xpYi9pZGIuanMiLCJub2RlX21vZHVsZXMvcHJvY2Vzcy9icm93c2VyLmpzIiwic3JjXFxjbGllbnRcXGRhdGEtc3RvcmUuanMiLCJzcmNcXGNsaWVudFxcZ2xvYmFsLmpzIiwic3JjXFxjbGllbnRcXHN3LWluZGV4LmpzIiwic3JjXFxjbGllbnRcXHN5bmNlci5qcyIsInNyY1xcY2xpZW50XFx1dGlsXFxkb20tbWFrZXIuanMiLCJzcmNcXGNvbW1vblxcZGlzcG9zYWJsZS5qcyIsInNyY1xcY29tbW9uXFxldmVudC1lbWl0dGVyLmpzIiwic3JjXFxjb21tb25cXHNyY1xcY29tbW9uXFxnbG9iYWwuanMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7QUNBQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3RUQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FB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QTBCO0FBQ3pCLFlBQVEsQ0FBQyxLQUFELENBQVI7QUFDQTs7QUFFRDtBQUNBLE9BQUcsS0FBSyxVQUFMLENBQWdCLElBQWhCLENBQUgsRUFBMEI7QUFBQSx1Q0FQTSxJQU9OO0FBUE0sU0FPTjtBQUFBOztBQUFBLDBCQUNqQixRQURpQjtBQUV4QjtBQUNBLFNBQUcsTUFBTSxJQUFOLENBQVc7QUFBQSxhQUFRLEtBQUssU0FBTCxJQUFrQixRQUExQjtBQUFBLE1BQVgsQ0FBSCxFQUFtRDtBQUNsRDtBQUNBOztBQUVEO0FBQ0EsK0JBQVksSUFBWjtBQVJ3Qjs7QUFBQTtBQUFBO0FBQUE7O0FBQUE7QUFDekIsMkJBQW9CLEtBQUssVUFBTCxDQUFnQixJQUFoQixDQUFwQixtSUFBMkM7QUFBQSxVQUFuQyxRQUFtQzs7QUFBQSx1QkFBbkMsUUFBbUM7O0FBQUEsK0JBR3pDO0FBS0Q7QUFUd0I7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQVV6QjtBQUNEOzs7Ozs7a0JBbEVtQixZOzs7Ozs7QUNBckI7Ozs7OztBQUVBLElBQUksV0FBVyw0QkFBZjs7QUFFQTtBQVJBOzs7O0FBU0EsU0FBUyxJQUFULEdBQWdCLE9BQU8sT0FBUCxJQUFrQixRQUFsQztBQUNBLFNBQVMsT0FBVCxHQUFtQixPQUFPLE1BQVAsSUFBaUIsUUFBcEM7O0FBRUE7QUFDQSxTQUFTLFVBQVQsR0FBc0IsUUFBUSxjQUFSLEVBQXdCLE9BQTlDO0FBQ0EsU0FBUyxZQUFUOztBQUVBO0FBQ0EsQ0FBQyxTQUFTLElBQVQsR0FBZ0IsTUFBaEIsR0FBeUIsT0FBMUIsRUFBbUMsUUFBbkMsR0FBOEMsUUFBOUMiLCJmaWxlIjoiZ2VuZXJhdGVkLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXNDb250ZW50IjpbIihmdW5jdGlvbiBlKHQsbixyKXtmdW5jdGlvbiBzKG8sdSl7aWYoIW5bb10pe2lmKCF0W29dKXt2YXIgYT10eXBlb2YgcmVxdWlyZT09XCJmdW5jdGlvblwiJiZyZXF1aXJlO2lmKCF1JiZhKXJldHVybiBhKG8sITApO2lmKGkpcmV0dXJuIGkobywhMCk7dmFyIGY9bmV3IEVycm9yKFwiQ2Fubm90IGZpbmQgbW9kdWxlICdcIitvK1wiJ1wiKTt0aHJvdyBmLmNvZGU9XCJNT0RVTEVfTk9UX0ZPVU5EXCIsZn12YXIgbD1uW29dPXtleHBvcnRzOnt9fTt0W29dWzBdLmNhbGwobC5leHBvcnRzLGZ1bmN0aW9uKGUpe3ZhciBuPXRbb11bMV1bZV07cmV0dXJuIHMobj9uOmUpfSxsLGwuZXhwb3J0cyxlLHQsbixyKX1yZXR1cm4gbltvXS5leHBvcnRzfXZhciBpPXR5cGVvZiByZXF1aXJlPT1cImZ1bmN0aW9uXCImJnJlcXVpcmU7Zm9yKHZhciBvPTA7bzxyLmxlbmd0aDtvKyspcyhyW29dKTtyZXR1cm4gc30pIiwiJ3VzZSBzdHJpY3QnO1xuXG4oZnVuY3Rpb24oKSB7XG4gIGZ1bmN0aW9uIHRvQXJyYXkoYXJyKSB7XG4gICAgcmV0dXJuIEFycmF5LnByb3RvdHlwZS5zbGljZS5jYWxsKGFycik7XG4gIH1cblxuICBmdW5jdGlvbiBwcm9taXNpZnlSZXF1ZXN0KHJlcXVlc3QpIHtcbiAgICByZXR1cm4gbmV3IFByb21pc2UoZnVuY3Rpb24ocmVzb2x2ZSwgcmVqZWN0KSB7XG4gICAgICByZXF1ZXN0Lm9uc3VjY2VzcyA9IGZ1bmN0aW9uKCkge1xuICAgICAgICByZXNvbHZlKHJlcXVlc3QucmVzdWx0KTtcbiAgICAgIH07XG5cbiAgICAgIHJlcXVlc3Qub25lcnJvciA9IGZ1bmN0aW9uKCkge1xuICAgICAgICByZWplY3QocmVxdWVzdC5lcnJvcik7XG4gICAgICB9O1xuICAgIH0pO1xuICB9XG5cbiAgZnVuY3Rpb24gcHJvbWlzaWZ5UmVxdWVzdENhbGwob2JqLCBtZXRob2QsIGFyZ3MpIHtcbiAgICB2YXIgcmVxdWVzdDtcbiAgICB2YXIgcCA9IG5ldyBQcm9taXNlKGZ1bmN0aW9uKHJlc29sdmUsIHJlamVjdCkge1xuICAgICAgcmVxdWVzdCA9IG9ialttZXRob2RdLmFwcGx5KG9iaiwgYXJncyk7XG4gICAgICBwcm9taXNpZnlSZXF1ZXN0KHJlcXVlc3QpLnRoZW4ocmVzb2x2ZSwgcmVqZWN0KTtcbiAgICB9KTtcblxuICAgIHAucmVxdWVzdCA9IHJlcXVlc3Q7XG4gICAgcmV0dXJuIHA7XG4gIH1cblxuICBmdW5jdGlvbiBwcm9taXNpZnlDdXJzb3JSZXF1ZXN0Q2FsbChvYmosIG1ldGhvZCwgYXJncykge1xuICAgIHZhciBwID0gcHJvbWlzaWZ5UmVxdWVzdENhbGwob2JqLCBtZXRob2QsIGFyZ3MpO1xuICAgIHJldHVybiBwLnRoZW4oZnVuY3Rpb24odmFsdWUpIHtcbiAgICAgIGlmICghdmFsdWUpIHJldHVybjtcbiAgICAgIHJldHVybiBuZXcgQ3Vyc29yKHZhbHVlLCBwLnJlcXVlc3QpO1xuICAgIH0pO1xuICB9XG5cbiAgZnVuY3Rpb24gcHJveHlQcm9wZXJ0aWVzKFByb3h5Q2xhc3MsIHRhcmdldFByb3AsIHByb3BlcnRpZXMpIHtcbiAgICBwcm9wZXJ0aWVzLmZvckVhY2goZnVuY3Rpb24ocHJvcCkge1xuICAgICAgT2JqZWN0LmRlZmluZVByb3BlcnR5KFByb3h5Q2xhc3MucHJvdG90eXBlLCBwcm9wLCB7XG4gICAgICAgIGdldDogZnVuY3Rpb24oKSB7XG4gICAgICAgICAgcmV0dXJuIHRoaXNbdGFyZ2V0UHJvcF1bcHJvcF07XG4gICAgICAgIH0sXG4gICAgICAgIHNldDogZnVuY3Rpb24odmFsKSB7XG4gICAgICAgICAgdGhpc1t0YXJnZXRQcm9wXVtwcm9wXSA9IHZhbDtcbiAgICAgICAgfVxuICAgICAgfSk7XG4gICAgfSk7XG4gIH1cblxuICBmdW5jdGlvbiBwcm94eVJlcXVlc3RNZXRob2RzKFByb3h5Q2xhc3MsIHRhcmdldFByb3AsIENvbnN0cnVjdG9yLCBwcm9wZXJ0aWVzKSB7XG4gICAgcHJvcGVydGllcy5mb3JFYWNoKGZ1bmN0aW9uKHByb3ApIHtcbiAgICAgIGlmICghKHByb3AgaW4gQ29uc3RydWN0b3IucHJvdG90eXBlKSkgcmV0dXJuO1xuICAgICAgUHJveHlDbGFzcy5wcm90b3R5cGVbcHJvcF0gPSBmdW5jdGlvbigpIHtcbiAgICAgICAgcmV0dXJuIHByb21pc2lmeVJlcXVlc3RDYWxsKHRoaXNbdGFyZ2V0UHJvcF0sIHByb3AsIGFyZ3VtZW50cyk7XG4gICAgICB9O1xuICAgIH0pO1xuICB9XG5cbiAgZnVuY3Rpb24gcHJveHlNZXRob2RzKFByb3h5Q2xhc3MsIHRhcmdldFByb3AsIENvbnN0cnVjdG9yLCBwcm9wZXJ0aWVzKSB7XG4gICAgcHJvcGVydGllcy5mb3JFYWNoKGZ1bmN0aW9uKHByb3ApIHtcbiAgICAgIGlmICghKHByb3AgaW4gQ29uc3RydWN0b3IucHJvdG90eXBlKSkgcmV0dXJuO1xuICAgICAgUHJveHlDbGFzcy5wcm90b3R5cGVbcHJvcF0gPSBmdW5jdGlvbigpIHtcbiAgICAgICAgcmV0dXJuIHRoaXNbdGFyZ2V0UHJvcF1bcHJvcF0uYXBwbHkodGhpc1t0YXJnZXRQcm9wXSwgYXJndW1lbnRzKTtcbiAgICAgIH07XG4gICAgfSk7XG4gIH1cblxuICBmdW5jdGlvbiBwcm94eUN1cnNvclJlcXVlc3RNZXRob2RzKFByb3h5Q2xhc3MsIHRhcmdldFByb3AsIENvbnN0cnVjdG9yLCBwcm9wZXJ0aWVzKSB7XG4gICAgcHJvcGVydGllcy5mb3JFYWNoKGZ1bmN0aW9uKHByb3ApIHtcbiAgICAgIGlmICghKHByb3AgaW4gQ29uc3RydWN0b3IucHJvdG90eXBlKSkgcmV0dXJuO1xuICAgICAgUHJveHlDbGFzcy5wcm90b3R5cGVbcHJvcF0gPSBmdW5jdGlvbigpIHtcbiAgICAgICAgcmV0dXJuIHByb21pc2lmeUN1cnNvclJlcXVlc3RDYWxsKHRoaXNbdGFyZ2V0UHJvcF0sIHByb3AsIGFyZ3VtZW50cyk7XG4gICAgICB9O1xuICAgIH0pO1xuICB9XG5cbiAgZnVuY3Rpb24gSW5kZXgoaW5kZXgpIHtcbiAgICB0aGlzLl9pbmRleCA9IGluZGV4O1xuICB9XG5cbiAgcHJveHlQcm9wZXJ0aWVzKEluZGV4LCAnX2luZGV4JywgW1xuICAgICduYW1lJyxcbiAgICAna2V5UGF0aCcsXG4gICAgJ211bHRpRW50cnknLFxuICAgICd1bmlxdWUnXG4gIF0pO1xuXG4gIHByb3h5UmVxdWVzdE1ldGhvZHMoSW5kZXgsICdfaW5kZXgnLCBJREJJbmRleCwgW1xuICAgICdnZXQnLFxuICAgICdnZXRLZXknLFxuICAgICdnZXRBbGwnLFxuICAgICdnZXRBbGxLZXlzJyxcbiAgICAnY291bnQnXG4gIF0pO1xuXG4gIHByb3h5Q3Vyc29yUmVxdWVzdE1ldGhvZHMoSW5kZXgsICdfaW5kZXgnLCBJREJJbmRleCwgW1xuICAgICdvcGVuQ3Vyc29yJyxcbiAgICAnb3BlbktleUN1cnNvcidcbiAgXSk7XG5cbiAgZnVuY3Rpb24gQ3Vyc29yKGN1cnNvciwgcmVxdWVzdCkge1xuICAgIHRoaXMuX2N1cnNvciA9IGN1cnNvcjtcbiAgICB0aGlzLl9yZXF1ZXN0ID0gcmVxdWVzdDtcbiAgfVxuXG4gIHByb3h5UHJvcGVydGllcyhDdXJzb3IsICdfY3Vyc29yJywgW1xuICAgICdkaXJlY3Rpb24nLFxuICAgICdrZXknLFxuICAgICdwcmltYXJ5S2V5JyxcbiAgICAndmFsdWUnXG4gIF0pO1xuXG4gIHByb3h5UmVxdWVzdE1ldGhvZHMoQ3Vyc29yLCAnX2N1cnNvcicsIElEQkN1cnNvciwgW1xuICAgICd1cGRhdGUnLFxuICAgICdkZWxldGUnXG4gIF0pO1xuXG4gIC8vIHByb3h5ICduZXh0JyBtZXRob2RzXG4gIFsnYWR2YW5jZScsICdjb250aW51ZScsICdjb250aW51ZVByaW1hcnlLZXknXS5mb3JFYWNoKGZ1bmN0aW9uKG1ldGhvZE5hbWUpIHtcbiAgICBpZiAoIShtZXRob2ROYW1lIGluIElEQkN1cnNvci5wcm90b3R5cGUpKSByZXR1cm47XG4gICAgQ3Vyc29yLnByb3RvdHlwZVttZXRob2ROYW1lXSA9IGZ1bmN0aW9uKCkge1xuICAgICAgdmFyIGN1cnNvciA9IHRoaXM7XG4gICAgICB2YXIgYXJncyA9IGFyZ3VtZW50cztcbiAgICAgIHJldHVybiBQcm9taXNlLnJlc29sdmUoKS50aGVuKGZ1bmN0aW9uKCkge1xuICAgICAgICBjdXJzb3IuX2N1cnNvclttZXRob2ROYW1lXS5hcHBseShjdXJzb3IuX2N1cnNvciwgYXJncyk7XG4gICAgICAgIHJldHVybiBwcm9taXNpZnlSZXF1ZXN0KGN1cnNvci5fcmVxdWVzdCkudGhlbihmdW5jdGlvbih2YWx1ZSkge1xuICAgICAgICAgIGlmICghdmFsdWUpIHJldHVybjtcbiAgICAgICAgICByZXR1cm4gbmV3IEN1cnNvcih2YWx1ZSwgY3Vyc29yLl9yZXF1ZXN0KTtcbiAgICAgICAgfSk7XG4gICAgICB9KTtcbiAgICB9O1xuICB9KTtcblxuICBmdW5jdGlvbiBPYmplY3RTdG9yZShzdG9yZSkge1xuICAgIHRoaXMuX3N0b3JlID0gc3RvcmU7XG4gIH1cblxuICBPYmplY3RTdG9yZS5wcm90b3R5cGUuY3JlYXRlSW5kZXggPSBmdW5jdGlvbigpIHtcbiAgICByZXR1cm4gbmV3IEluZGV4KHRoaXMuX3N0b3JlLmNyZWF0ZUluZGV4LmFwcGx5KHRoaXMuX3N0b3JlLCBhcmd1bWVudHMpKTtcbiAgfTtcblxuICBPYmplY3RTdG9yZS5wcm90b3R5cGUuaW5kZXggPSBmdW5jdGlvbigpIHtcbiAgICByZXR1cm4gbmV3IEluZGV4KHRoaXMuX3N0b3JlLmluZGV4LmFwcGx5KHRoaXMuX3N0b3JlLCBhcmd1bWVudHMpKTtcbiAgfTtcblxuICBwcm94eVByb3BlcnRpZXMoT2JqZWN0U3RvcmUsICdfc3RvcmUnLCBbXG4gICAgJ25hbWUnLFxuICAgICdrZXlQYXRoJyxcbiAgICAnaW5kZXhOYW1lcycsXG4gICAgJ2F1dG9JbmNyZW1lbnQnXG4gIF0pO1xuXG4gIHByb3h5UmVxdWVzdE1ldGhvZHMoT2JqZWN0U3RvcmUsICdfc3RvcmUnLCBJREJPYmplY3RTdG9yZSwgW1xuICAgICdwdXQnLFxuICAgICdhZGQnLFxuICAgICdkZWxldGUnLFxuICAgICdjbGVhcicsXG4gICAgJ2dldCcsXG4gICAgJ2dldEFsbCcsXG4gICAgJ2dldEtleScsXG4gICAgJ2dldEFsbEtleXMnLFxuICAgICdjb3VudCdcbiAgXSk7XG5cbiAgcHJveHlDdXJzb3JSZXF1ZXN0TWV0aG9kcyhPYmplY3RTdG9yZSwgJ19zdG9yZScsIElEQk9iamVjdFN0b3JlLCBbXG4gICAgJ29wZW5DdXJzb3InLFxuICAgICdvcGVuS2V5Q3Vyc29yJ1xuICBdKTtcblxuICBwcm94eU1ldGhvZHMoT2JqZWN0U3RvcmUsICdfc3RvcmUnLCBJREJPYmplY3RTdG9yZSwgW1xuICAgICdkZWxldGVJbmRleCdcbiAgXSk7XG5cbiAgZnVuY3Rpb24gVHJhbnNhY3Rpb24oaWRiVHJhbnNhY3Rpb24pIHtcbiAgICB0aGlzLl90eCA9IGlkYlRyYW5zYWN0aW9uO1xuICAgIHRoaXMuY29tcGxldGUgPSBuZXcgUHJvbWlzZShmdW5jdGlvbihyZXNvbHZlLCByZWplY3QpIHtcbiAgICAgIGlkYlRyYW5zYWN0aW9uLm9uY29tcGxldGUgPSBmdW5jdGlvbigpIHtcbiAgICAgICAgcmVzb2x2ZSgpO1xuICAgICAgfTtcbiAgICAgIGlkYlRyYW5zYWN0aW9uLm9uZXJyb3IgPSBmdW5jdGlvbigpIHtcbiAgICAgICAgcmVqZWN0KGlkYlRyYW5zYWN0aW9uLmVycm9yKTtcbiAgICAgIH07XG4gICAgICBpZGJUcmFuc2FjdGlvbi5vbmFib3J0ID0gZnVuY3Rpb24oKSB7XG4gICAgICAgIHJlamVjdChpZGJUcmFuc2FjdGlvbi5lcnJvcik7XG4gICAgICB9O1xuICAgIH0pO1xuICB9XG5cbiAgVHJhbnNhY3Rpb24ucHJvdG90eXBlLm9iamVjdFN0b3JlID0gZnVuY3Rpb24oKSB7XG4gICAgcmV0dXJuIG5ldyBPYmplY3RTdG9yZSh0aGlzLl90eC5vYmplY3RTdG9yZS5hcHBseSh0aGlzLl90eCwgYXJndW1lbnRzKSk7XG4gIH07XG5cbiAgcHJveHlQcm9wZXJ0aWVzKFRyYW5zYWN0aW9uLCAnX3R4JywgW1xuICAgICdvYmplY3RTdG9yZU5hbWVzJyxcbiAgICAnbW9kZSdcbiAgXSk7XG5cbiAgcHJveHlNZXRob2RzKFRyYW5zYWN0aW9uLCAnX3R4JywgSURCVHJhbnNhY3Rpb24sIFtcbiAgICAnYWJvcnQnXG4gIF0pO1xuXG4gIGZ1bmN0aW9uIFVwZ3JhZGVEQihkYiwgb2xkVmVyc2lvbiwgdHJhbnNhY3Rpb24pIHtcbiAgICB0aGlzLl9kYiA9IGRiO1xuICAgIHRoaXMub2xkVmVyc2lvbiA9IG9sZFZlcnNpb247XG4gICAgdGhpcy50cmFuc2FjdGlvbiA9IG5ldyBUcmFuc2FjdGlvbih0cmFuc2FjdGlvbik7XG4gIH1cblxuICBVcGdyYWRlREIucHJvdG90eXBlLmNyZWF0ZU9iamVjdFN0b3JlID0gZnVuY3Rpb24oKSB7XG4gICAgcmV0dXJuIG5ldyBPYmplY3RTdG9yZSh0aGlzLl9kYi5jcmVhdGVPYmplY3RTdG9yZS5hcHBseSh0aGlzLl9kYiwgYXJndW1lbnRzKSk7XG4gIH07XG5cbiAgcHJveHlQcm9wZXJ0aWVzKFVwZ3JhZGVEQiwgJ19kYicsIFtcbiAgICAnbmFtZScsXG4gICAgJ3ZlcnNpb24nLFxuICAgICdvYmplY3RTdG9yZU5hbWVzJ1xuICBdKTtcblxuICBwcm94eU1ldGhvZHMoVXBncmFkZURCLCAnX2RiJywgSURCRGF0YWJhc2UsIFtcbiAgICAnZGVsZXRlT2JqZWN0U3RvcmUnLFxuICAgICdjbG9zZSdcbiAgXSk7XG5cbiAgZnVuY3Rpb24gREIoZGIpIHtcbiAgICB0aGlzLl9kYiA9IGRiO1xuICB9XG5cbiAgREIucHJvdG90eXBlLnRyYW5zYWN0aW9uID0gZnVuY3Rpb24oKSB7XG4gICAgcmV0dXJuIG5ldyBUcmFuc2FjdGlvbih0aGlzLl9kYi50cmFuc2FjdGlvbi5hcHBseSh0aGlzLl9kYiwgYXJndW1lbnRzKSk7XG4gIH07XG5cbiAgcHJveHlQcm9wZXJ0aWVzKERCLCAnX2RiJywgW1xuICAgICduYW1lJyxcbiAgICAndmVyc2lvbicsXG4gICAgJ29iamVjdFN0b3JlTmFtZXMnXG4gIF0pO1xuXG4gIHByb3h5TWV0aG9kcyhEQiwgJ19kYicsIElEQkRhdGFiYXNlLCBbXG4gICAgJ2Nsb3NlJ1xuICBdKTtcblxuICAvLyBBZGQgY3Vyc29yIGl0ZXJhdG9yc1xuICAvLyBUT0RPOiByZW1vdmUgdGhpcyBvbmNlIGJyb3dzZXJzIGRvIHRoZSByaWdodCB0aGluZyB3aXRoIHByb21pc2VzXG4gIFsnb3BlbkN1cnNvcicsICdvcGVuS2V5Q3Vyc29yJ10uZm9yRWFjaChmdW5jdGlvbihmdW5jTmFtZSkge1xuICAgIFtPYmplY3RTdG9yZSwgSW5kZXhdLmZvckVhY2goZnVuY3Rpb24oQ29uc3RydWN0b3IpIHtcbiAgICAgIENvbnN0cnVjdG9yLnByb3RvdHlwZVtmdW5jTmFtZS5yZXBsYWNlKCdvcGVuJywgJ2l0ZXJhdGUnKV0gPSBmdW5jdGlvbigpIHtcbiAgICAgICAgdmFyIGFyZ3MgPSB0b0FycmF5KGFyZ3VtZW50cyk7XG4gICAgICAgIHZhciBjYWxsYmFjayA9IGFyZ3NbYXJncy5sZW5ndGggLSAxXTtcbiAgICAgICAgdmFyIG5hdGl2ZU9iamVjdCA9IHRoaXMuX3N0b3JlIHx8IHRoaXMuX2luZGV4O1xuICAgICAgICB2YXIgcmVxdWVzdCA9IG5hdGl2ZU9iamVjdFtmdW5jTmFtZV0uYXBwbHkobmF0aXZlT2JqZWN0LCBhcmdzLnNsaWNlKDAsIC0xKSk7XG4gICAgICAgIHJlcXVlc3Qub25zdWNjZXNzID0gZnVuY3Rpb24oKSB7XG4gICAgICAgICAgY2FsbGJhY2socmVxdWVzdC5yZXN1bHQpO1xuICAgICAgICB9O1xuICAgICAgfTtcbiAgICB9KTtcbiAgfSk7XG5cbiAgLy8gcG9seWZpbGwgZ2V0QWxsXG4gIFtJbmRleCwgT2JqZWN0U3RvcmVdLmZvckVhY2goZnVuY3Rpb24oQ29uc3RydWN0b3IpIHtcbiAgICBpZiAoQ29uc3RydWN0b3IucHJvdG90eXBlLmdldEFsbCkgcmV0dXJuO1xuICAgIENvbnN0cnVjdG9yLnByb3RvdHlwZS5nZXRBbGwgPSBmdW5jdGlvbihxdWVyeSwgY291bnQpIHtcbiAgICAgIHZhciBpbnN0YW5jZSA9IHRoaXM7XG4gICAgICB2YXIgaXRlbXMgPSBbXTtcblxuICAgICAgcmV0dXJuIG5ldyBQcm9taXNlKGZ1bmN0aW9uKHJlc29sdmUpIHtcbiAgICAgICAgaW5zdGFuY2UuaXRlcmF0ZUN1cnNvcihxdWVyeSwgZnVuY3Rpb24oY3Vyc29yKSB7XG4gICAgICAgICAgaWYgKCFjdXJzb3IpIHtcbiAgICAgICAgICAgIHJlc29sdmUoaXRlbXMpO1xuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICAgIH1cbiAgICAgICAgICBpdGVtcy5wdXNoKGN1cnNvci52YWx1ZSk7XG5cbiAgICAgICAgICBpZiAoY291bnQgIT09IHVuZGVmaW5lZCAmJiBpdGVtcy5sZW5ndGggPT0gY291bnQpIHtcbiAgICAgICAgICAgIHJlc29sdmUoaXRlbXMpO1xuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICAgIH1cbiAgICAgICAgICBjdXJzb3IuY29udGludWUoKTtcbiAgICAgICAgfSk7XG4gICAgICB9KTtcbiAgICB9O1xuICB9KTtcblxuICB2YXIgZXhwID0ge1xuICAgIG9wZW46IGZ1bmN0aW9uKG5hbWUsIHZlcnNpb24sIHVwZ3JhZGVDYWxsYmFjaykge1xuICAgICAgdmFyIHAgPSBwcm9taXNpZnlSZXF1ZXN0Q2FsbChpbmRleGVkREIsICdvcGVuJywgW25hbWUsIHZlcnNpb25dKTtcbiAgICAgIHZhciByZXF1ZXN0ID0gcC5yZXF1ZXN0O1xuXG4gICAgICByZXF1ZXN0Lm9udXBncmFkZW5lZWRlZCA9IGZ1bmN0aW9uKGV2ZW50KSB7XG4gICAgICAgIGlmICh1cGdyYWRlQ2FsbGJhY2spIHtcbiAgICAgICAgICB1cGdyYWRlQ2FsbGJhY2sobmV3IFVwZ3JhZGVEQihyZXF1ZXN0LnJlc3VsdCwgZXZlbnQub2xkVmVyc2lvbiwgcmVxdWVzdC50cmFuc2FjdGlvbikpO1xuICAgICAgICB9XG4gICAgICB9O1xuXG4gICAgICByZXR1cm4gcC50aGVuKGZ1bmN0aW9uKGRiKSB7XG4gICAgICAgIHJldHVybiBuZXcgREIoZGIpO1xuICAgICAgfSk7XG4gICAgfSxcbiAgICBkZWxldGU6IGZ1bmN0aW9uKG5hbWUpIHtcbiAgICAgIHJldHVybiBwcm9taXNpZnlSZXF1ZXN0Q2FsbChpbmRleGVkREIsICdkZWxldGVEYXRhYmFzZScsIFtuYW1lXSk7XG4gICAgfVxuICB9O1xuXG4gIGlmICh0eXBlb2YgbW9kdWxlICE9PSAndW5kZWZpbmVkJykge1xuICAgIG1vZHVsZS5leHBvcnRzID0gZXhwO1xuICB9XG4gIGVsc2Uge1xuICAgIHNlbGYuaWRiID0gZXhwO1xuICB9XG59KCkpO1xuIiwiLy8gc2hpbSBmb3IgdXNpbmcgcHJvY2VzcyBpbiBicm93c2VyXG52YXIgcHJvY2VzcyA9IG1vZHVsZS5leHBvcnRzID0ge307XG5cbi8vIGNhY2hlZCBmcm9tIHdoYXRldmVyIGdsb2JhbCBpcyBwcmVzZW50IHNvIHRoYXQgdGVzdCBydW5uZXJzIHRoYXQgc3R1YiBpdFxuLy8gZG9uJ3QgYnJlYWsgdGhpbmdzLiAgQnV0IHdlIG5lZWQgdG8gd3JhcCBpdCBpbiBhIHRyeSBjYXRjaCBpbiBjYXNlIGl0IGlzXG4vLyB3cmFwcGVkIGluIHN0cmljdCBtb2RlIGNvZGUgd2hpY2ggZG9lc24ndCBkZWZpbmUgYW55IGdsb2JhbHMuICBJdCdzIGluc2lkZSBhXG4vLyBmdW5jdGlvbiBiZWNhdXNlIHRyeS9jYXRjaGVzIGRlb3B0aW1pemUgaW4gY2VydGFpbiBlbmdpbmVzLlxuXG52YXIgY2FjaGVkU2V0VGltZW91dDtcbnZhciBjYWNoZWRDbGVhclRpbWVvdXQ7XG5cbmZ1bmN0aW9uIGRlZmF1bHRTZXRUaW1vdXQoKSB7XG4gICAgdGhyb3cgbmV3IEVycm9yKCdzZXRUaW1lb3V0IGhhcyBub3QgYmVlbiBkZWZpbmVkJyk7XG59XG5mdW5jdGlvbiBkZWZhdWx0Q2xlYXJUaW1lb3V0ICgpIHtcbiAgICB0aHJvdyBuZXcgRXJyb3IoJ2NsZWFyVGltZW91dCBoYXMgbm90IGJlZW4gZGVmaW5lZCcpO1xufVxuKGZ1bmN0aW9uICgpIHtcbiAgICB0cnkge1xuICAgICAgICBpZiAodHlwZW9mIHNldFRpbWVvdXQgPT09ICdmdW5jdGlvbicpIHtcbiAgICAgICAgICAgIGNhY2hlZFNldFRpbWVvdXQgPSBzZXRUaW1lb3V0O1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgY2FjaGVkU2V0VGltZW91dCA9IGRlZmF1bHRTZXRUaW1vdXQ7XG4gICAgICAgIH1cbiAgICB9IGNhdGNoIChlKSB7XG4gICAgICAgIGNhY2hlZFNldFRpbWVvdXQgPSBkZWZhdWx0U2V0VGltb3V0O1xuICAgIH1cbiAgICB0cnkge1xuICAgICAgICBpZiAodHlwZW9mIGNsZWFyVGltZW91dCA9PT0gJ2Z1bmN0aW9uJykge1xuICAgICAgICAgICAgY2FjaGVkQ2xlYXJUaW1lb3V0ID0gY2xlYXJUaW1lb3V0O1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgY2FjaGVkQ2xlYXJUaW1lb3V0ID0gZGVmYXVsdENsZWFyVGltZW91dDtcbiAgICAgICAgfVxuICAgIH0gY2F0Y2ggKGUpIHtcbiAgICAgICAgY2FjaGVkQ2xlYXJUaW1lb3V0ID0gZGVmYXVsdENsZWFyVGltZW91dDtcbiAgICB9XG59ICgpKVxuZnVuY3Rpb24gcnVuVGltZW91dChmdW4pIHtcbiAgICBpZiAoY2FjaGVkU2V0VGltZW91dCA9PT0gc2V0VGltZW91dCkge1xuICAgICAgICAvL25vcm1hbCBlbnZpcm9tZW50cyBpbiBzYW5lIHNpdHVhdGlvbnNcbiAgICAgICAgcmV0dXJuIHNldFRpbWVvdXQoZnVuLCAwKTtcbiAgICB9XG4gICAgLy8gaWYgc2V0VGltZW91dCB3YXNuJ3QgYXZhaWxhYmxlIGJ1dCB3YXMgbGF0dGVyIGRlZmluZWRcbiAgICBpZiAoKGNhY2hlZFNldFRpbWVvdXQgPT09IGRlZmF1bHRTZXRUaW1vdXQgfHwgIWNhY2hlZFNldFRpbWVvdXQpICYmIHNldFRpbWVvdXQpIHtcbiAgICAgICAgY2FjaGVkU2V0VGltZW91dCA9IHNldFRpbWVvdXQ7XG4gICAgICAgIHJldHVybiBzZXRUaW1lb3V0KGZ1biwgMCk7XG4gICAgfVxuICAgIHRyeSB7XG4gICAgICAgIC8vIHdoZW4gd2hlbiBzb21lYm9keSBoYXMgc2NyZXdlZCB3aXRoIHNldFRpbWVvdXQgYnV0IG5vIEkuRS4gbWFkZG5lc3NcbiAgICAgICAgcmV0dXJuIGNhY2hlZFNldFRpbWVvdXQoZnVuLCAwKTtcbiAgICB9IGNhdGNoKGUpe1xuICAgICAgICB0cnkge1xuICAgICAgICAgICAgLy8gV2hlbiB3ZSBhcmUgaW4gSS5FLiBidXQgdGhlIHNjcmlwdCBoYXMgYmVlbiBldmFsZWQgc28gSS5FLiBkb2Vzbid0IHRydXN0IHRoZSBnbG9iYWwgb2JqZWN0IHdoZW4gY2FsbGVkIG5vcm1hbGx5XG4gICAgICAgICAgICByZXR1cm4gY2FjaGVkU2V0VGltZW91dC5jYWxsKG51bGwsIGZ1biwgMCk7XG4gICAgICAgIH0gY2F0Y2goZSl7XG4gICAgICAgICAgICAvLyBzYW1lIGFzIGFib3ZlIGJ1dCB3aGVuIGl0J3MgYSB2ZXJzaW9uIG9mIEkuRS4gdGhhdCBtdXN0IGhhdmUgdGhlIGdsb2JhbCBvYmplY3QgZm9yICd0aGlzJywgaG9wZnVsbHkgb3VyIGNvbnRleHQgY29ycmVjdCBvdGhlcndpc2UgaXQgd2lsbCB0aHJvdyBhIGdsb2JhbCBlcnJvclxuICAgICAgICAgICAgcmV0dXJuIGNhY2hlZFNldFRpbWVvdXQuY2FsbCh0aGlzLCBmdW4sIDApO1xuICAgICAgICB9XG4gICAgfVxuXG5cbn1cbmZ1bmN0aW9uIHJ1bkNsZWFyVGltZW91dChtYXJrZXIpIHtcbiAgICBpZiAoY2FjaGVkQ2xlYXJUaW1lb3V0ID09PSBjbGVhclRpbWVvdXQpIHtcbiAgICAgICAgLy9ub3JtYWwgZW52aXJvbWVudHMgaW4gc2FuZSBzaXR1YXRpb25zXG4gICAgICAgIHJldHVybiBjbGVhclRpbWVvdXQobWFya2VyKTtcbiAgICB9XG4gICAgLy8gaWYgY2xlYXJUaW1lb3V0IHdhc24ndCBhdmFpbGFibGUgYnV0IHdhcyBsYXR0ZXIgZGVmaW5lZFxuICAgIGlmICgoY2FjaGVkQ2xlYXJUaW1lb3V0ID09PSBkZWZhdWx0Q2xlYXJUaW1lb3V0IHx8ICFjYWNoZWRDbGVhclRpbWVvdXQpICYmIGNsZWFyVGltZW91dCkge1xuICAgICAgICBjYWNoZWRDbGVhclRpbWVvdXQgPSBjbGVhclRpbWVvdXQ7XG4gICAgICAgIHJldHVybiBjbGVhclRpbWVvdXQobWFya2VyKTtcbiAgICB9XG4gICAgdHJ5IHtcbiAgICAgICAgLy8gd2hlbiB3aGVuIHNvbWVib2R5IGhhcyBzY3Jld2VkIHdpdGggc2V0VGltZW91dCBidXQgbm8gSS5FLiBtYWRkbmVzc1xuICAgICAgICByZXR1cm4gY2FjaGVkQ2xlYXJUaW1lb3V0KG1hcmtlcik7XG4gICAgfSBjYXRjaCAoZSl7XG4gICAgICAgIHRyeSB7XG4gICAgICAgICAgICAvLyBXaGVuIHdlIGFyZSBpbiBJLkUuIGJ1dCB0aGUgc2NyaXB0IGhhcyBiZWVuIGV2YWxlZCBzbyBJLkUuIGRvZXNuJ3QgIHRydXN0IHRoZSBnbG9iYWwgb2JqZWN0IHdoZW4gY2FsbGVkIG5vcm1hbGx5XG4gICAgICAgICAgICByZXR1cm4gY2FjaGVkQ2xlYXJUaW1lb3V0LmNhbGwobnVsbCwgbWFya2VyKTtcbiAgICAgICAgfSBjYXRjaCAoZSl7XG4gICAgICAgICAgICAvLyBzYW1lIGFzIGFib3ZlIGJ1dCB3aGVuIGl0J3MgYSB2ZXJzaW9uIG9mIEkuRS4gdGhhdCBtdXN0IGhhdmUgdGhlIGdsb2JhbCBvYmplY3QgZm9yICd0aGlzJywgaG9wZnVsbHkgb3VyIGNvbnRleHQgY29ycmVjdCBvdGhlcndpc2UgaXQgd2lsbCB0aHJvdyBhIGdsb2JhbCBlcnJvci5cbiAgICAgICAgICAgIC8vIFNvbWUgdmVyc2lvbnMgb2YgSS5FLiBoYXZlIGRpZmZlcmVudCBydWxlcyBmb3IgY2xlYXJUaW1lb3V0IHZzIHNldFRpbWVvdXRcbiAgICAgICAgICAgIHJldHVybiBjYWNoZWRDbGVhclRpbWVvdXQuY2FsbCh0aGlzLCBtYXJrZXIpO1xuICAgICAgICB9XG4gICAgfVxuXG5cblxufVxudmFyIHF1ZXVlID0gW107XG52YXIgZHJhaW5pbmcgPSBmYWxzZTtcbnZhciBjdXJyZW50UXVldWU7XG52YXIgcXVldWVJbmRleCA9IC0xO1xuXG5mdW5jdGlvbiBjbGVhblVwTmV4dFRpY2soKSB7XG4gICAgaWYgKCFkcmFpbmluZyB8fCAhY3VycmVudFF1ZXVlKSB7XG4gICAgICAgIHJldHVybjtcbiAgICB9XG4gICAgZHJhaW5pbmcgPSBmYWxzZTtcbiAgICBpZiAoY3VycmVudFF1ZXVlLmxlbmd0aCkge1xuICAgICAgICBxdWV1ZSA9IGN1cnJlbnRRdWV1ZS5jb25jYXQocXVldWUpO1xuICAgIH0gZWxzZSB7XG4gICAgICAgIHF1ZXVlSW5kZXggPSAtMTtcbiAgICB9XG4gICAgaWYgKHF1ZXVlLmxlbmd0aCkge1xuICAgICAgICBkcmFpblF1ZXVlKCk7XG4gICAgfVxufVxuXG5mdW5jdGlvbiBkcmFpblF1ZXVlKCkge1xuICAgIGlmIChkcmFpbmluZykge1xuICAgICAgICByZXR1cm47XG4gICAgfVxuICAgIHZhciB0aW1lb3V0ID0gcnVuVGltZW91dChjbGVhblVwTmV4dFRpY2spO1xuICAgIGRyYWluaW5nID0gdHJ1ZTtcblxuICAgIHZhciBsZW4gPSBxdWV1ZS5sZW5ndGg7XG4gICAgd2hpbGUobGVuKSB7XG4gICAgICAgIGN1cnJlbnRRdWV1ZSA9IHF1ZXVlO1xuICAgICAgICBxdWV1ZSA9IFtdO1xuICAgICAgICB3aGlsZSAoKytxdWV1ZUluZGV4IDwgbGVuKSB7XG4gICAgICAgICAgICBpZiAoY3VycmVudFF1ZXVlKSB7XG4gICAgICAgICAgICAgICAgY3VycmVudFF1ZXVlW3F1ZXVlSW5kZXhdLnJ1bigpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIHF1ZXVlSW5kZXggPSAtMTtcbiAgICAgICAgbGVuID0gcXVldWUubGVuZ3RoO1xuICAgIH1cbiAgICBjdXJyZW50UXVldWUgPSBudWxsO1xuICAgIGRyYWluaW5nID0gZmFsc2U7XG4gICAgcnVuQ2xlYXJUaW1lb3V0KHRpbWVvdXQpO1xufVxuXG5wcm9jZXNzLm5leHRUaWNrID0gZnVuY3Rpb24gKGZ1bikge1xuICAgIHZhciBhcmdzID0gbmV3IEFycmF5KGFyZ3VtZW50cy5sZW5ndGggLSAxKTtcbiAgICBpZiAoYXJndW1lbnRzLmxlbmd0aCA+IDEpIHtcbiAgICAgICAgZm9yICh2YXIgaSA9IDE7IGkgPCBhcmd1bWVudHMubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgICAgIGFyZ3NbaSAtIDFdID0gYXJndW1lbnRzW2ldO1xuICAgICAgICB9XG4gICAgfVxuICAgIHF1ZXVlLnB1c2gobmV3IEl0ZW0oZnVuLCBhcmdzKSk7XG4gICAgaWYgKHF1ZXVlLmxlbmd0aCA9PT0gMSAmJiAhZHJhaW5pbmcpIHtcbiAgICAgICAgcnVuVGltZW91dChkcmFpblF1ZXVlKTtcbiAgICB9XG59O1xuXG4vLyB2OCBsaWtlcyBwcmVkaWN0aWJsZSBvYmplY3RzXG5mdW5jdGlvbiBJdGVtKGZ1biwgYXJyYXkpIHtcbiAgICB0aGlzLmZ1biA9IGZ1bjtcbiAgICB0aGlzLmFycmF5ID0gYXJyYXk7XG59XG5JdGVtLnByb3RvdHlwZS5ydW4gPSBmdW5jdGlvbiAoKSB7XG4gICAgdGhpcy5mdW4uYXBwbHkobnVsbCwgdGhpcy5hcnJheSk7XG59O1xucHJvY2Vzcy50aXRsZSA9ICdicm93c2VyJztcbnByb2Nlc3MuYnJvd3NlciA9IHRydWU7XG5wcm9jZXNzLmVudiA9IHt9O1xucHJvY2Vzcy5hcmd2ID0gW107XG5wcm9jZXNzLnZlcnNpb24gPSAnJzsgLy8gZW1wdHkgc3RyaW5nIHRvIGF2b2lkIHJlZ2V4cCBpc3N1ZXNcbnByb2Nlc3MudmVyc2lvbnMgPSB7fTtcblxuZnVuY3Rpb24gbm9vcCgpIHt9XG5cbnByb2Nlc3Mub24gPSBub29wO1xucHJvY2Vzcy5hZGRMaXN0ZW5lciA9IG5vb3A7XG5wcm9jZXNzLm9uY2UgPSBub29wO1xucHJvY2Vzcy5vZmYgPSBub29wO1xucHJvY2Vzcy5yZW1vdmVMaXN0ZW5lciA9IG5vb3A7XG5wcm9jZXNzLnJlbW92ZUFsbExpc3RlbmVycyA9IG5vb3A7XG5wcm9jZXNzLmVtaXQgPSBub29wO1xuXG5wcm9jZXNzLmJpbmRpbmcgPSBmdW5jdGlvbiAobmFtZSkge1xuICAgIHRocm93IG5ldyBFcnJvcigncHJvY2Vzcy5iaW5kaW5nIGlzIG5vdCBzdXBwb3J0ZWQnKTtcbn07XG5cbnByb2Nlc3MuY3dkID0gZnVuY3Rpb24gKCkgeyByZXR1cm4gJy8nIH07XG5wcm9jZXNzLmNoZGlyID0gZnVuY3Rpb24gKGRpcikge1xuICAgIHRocm93IG5ldyBFcnJvcigncHJvY2Vzcy5jaGRpciBpcyBub3Qgc3VwcG9ydGVkJyk7XG59O1xucHJvY2Vzcy51bWFzayA9IGZ1bmN0aW9uKCkgeyByZXR1cm4gMDsgfTtcbiIsIi8qKlxyXG4gKiBXb3JrIHdpdGggZGF0YSBzdG9yZXNcclxuICovXHJcblxyXG5jb25zdCBERUJPVU5DRV9USU1FID0gMjAwMDtcclxuY29uc3QgREFUQV9TVE9SRV9ST09UID0gXCIvYXBpL2RhdGEvXCI7XHJcblxyXG52YXIgaWRiID0gcmVxdWlyZShcImlkYlwiKTtcclxuXHJcbi8vIGNhY2hlIGRhdGEgc3RvcmUgaW5zdGFuY2VzXHJcbnZhciBzdG9yZXMgPSB7fTtcclxuXHJcbi8vIGdldC9jcmVhdGUgYSBkYXRhc3RvcmVcclxuZXhwb3J0IGZ1bmN0aW9uIHN0b3JlKG5hbWUpIHtcclxuXHQvLyB1c2UgdGhlIGNhY2hlZCBzdG9yZVxyXG5cdGlmKG5hbWUgaW4gc3RvcmVzKSB7XHJcblx0XHRyZXR1cm4gc3RvcmVzW25hbWVdO1xyXG5cdH1cclxuXHJcblx0dmFyIHN0b3JlID0gbmV3IFN0b3JlKG5hbWUpO1xyXG5cclxuXHQvLyBjYWNoZSB0aGUgZGF0YSBzdG9yZSBpbnN0YW5jZVxyXG5cdHN0b3Jlc1tuYW1lXSA9IHN0b3JlO1xyXG5cclxuXHQvLyB0ZWxsIGFueSBsaXN0ZW5lcnMgdGhlIHN0b3JlIGhhcyBiZWVuIGNyZWF0ZWRcclxuXHRsaWZlTGluZS5lbWl0KFwiZGF0YS1zdG9yZS1jcmVhdGVkXCIsIHN0b3JlKTtcclxuXHJcblx0cmV0dXJuIHN0b3JlO1xyXG59O1xyXG5cclxuY2xhc3MgU3RvcmUgZXh0ZW5kcyBsaWZlTGluZS5FdmVudEVtaXR0ZXIge1xyXG5cdGNvbnN0cnVjdG9yKG5hbWUpIHtcclxuXHRcdHN1cGVyKCk7XHJcblx0XHR0aGlzLm5hbWUgPSBuYW1lO1xyXG5cdFx0dGhpcy5fY2FjaGUgPSB7fTtcclxuXHRcdC8vIGRvbid0IHNlbmQgZHVwbGljYXRlIHJlcXVlc3RzXHJcblx0XHR0aGlzLl9yZXF1ZXN0aW5nID0gW107XHJcblx0XHQvLyBwcm9taXNlIGZvciB0aGUgZGF0YWJhc2VcclxuXHRcdHRoaXMuX2RiID0gaWRiLm9wZW4oXCJkYXRhLXN0b3Jlc1wiLCAyLCBkYiA9PiB7XHJcblx0XHRcdC8vIHVwZ3JhZGUgb3IgY3JlYXRlIHRoZSBkYlxyXG5cdFx0XHRpZihkYi5vbGRWZXJzaW9uIDwgMSlcclxuXHRcdFx0XHRkYi5jcmVhdGVPYmplY3RTdG9yZShcImFzc2lnbm1lbnRzXCIsIHsga2V5UGF0aDogXCJpZFwiIH0pO1xyXG5cdFx0XHRpZihkYi5vbGRWZXJzaW9uIDwgMilcclxuXHRcdFx0XHRkYi5jcmVhdGVPYmplY3RTdG9yZShcInN5bmMtc3RvcmVcIiwgeyBrZXlQYXRoOiBcImlkXCIgfSk7XHJcblx0XHR9KTtcclxuXHR9XHJcblxyXG5cdC8vIHNldCB0aGUgZnVuY3Rpb24gdG8gZGVzZXJpYWxpemUgYWxsIGRhdGEgZnJvbSB0aGUgc2VydmVyXHJcblx0c2V0SW5pdChmbikge1xyXG5cdFx0dGhpcy5fZGVzZXJpYWxpemVyID0gZm47XHJcblx0fVxyXG5cclxuXHQvLyBnZXQgYWxsIHRoZSBpdGVtcyBhbmQgbGlzdGVuIGZvciBhbnkgY2hhbmdlc1xyXG5cdGdldEFsbChmbikge1xyXG5cdFx0aWYoIWZuKSB7XHJcblx0XHRcdC8vIGxvYWQgaXRlbXMgZnJvbSBpZGJcclxuXHRcdFx0cmV0dXJuIHRoaXMuX2RiLnRoZW4oZGIgPT4ge1xyXG5cdFx0XHRcdHJldHVybiBkYi50cmFuc2FjdGlvbih0aGlzLm5hbWUpXHJcblx0XHRcdFx0XHQub2JqZWN0U3RvcmUodGhpcy5uYW1lKVxyXG5cdFx0XHRcdFx0LmdldEFsbCgpXHJcblx0XHRcdH0pO1xyXG5cdFx0fVxyXG5cclxuXHRcdC8vIGdvIHRvIHRoZSBjYWNoZSBmaXJzdFxyXG5cdFx0Zm4oYXJyYXlGcm9tT2JqZWN0KHRoaXMuX2NhY2hlKSk7XHJcblxyXG5cdFx0Ly8gbG9hZCBpdGVtcyBmcm9tIGlkYlxyXG5cdFx0dGhpcy5fZGIudGhlbihkYiA9PiB7XHJcblx0XHRcdGRiLnRyYW5zYWN0aW9uKHRoaXMubmFtZSlcclxuXHRcdFx0XHQub2JqZWN0U3RvcmUodGhpcy5uYW1lKVxyXG5cdFx0XHRcdC5nZXRBbGwoKVxyXG5cdFx0XHRcdC50aGVuKGFsbCA9PiB7XHJcblx0XHRcdFx0XHQvLyBzdG9yZSBpdGVtcyBpbiB0aGUgY2FjaGVcclxuXHRcdFx0XHRcdGZvcihsZXQgaXRlbSBvZiBhbGwpIHtcclxuXHRcdFx0XHRcdFx0dGhpcy5fY2FjaGVbaXRlbS5pZF0gPSBpdGVtO1xyXG5cdFx0XHRcdFx0fVxyXG5cclxuXHRcdFx0XHRcdC8vIG5vdGlmeSBsaXN0ZW5lcnMgd2UgbG9hZGVkIHRoZSBkYXRhXHJcblx0XHRcdFx0XHR0aGlzLmVtaXQoXCJjaGFuZ2VcIik7XHJcblx0XHRcdFx0fSk7XHJcblx0XHR9KTtcclxuXHJcblx0XHQvLyBsaXN0ZW4gZm9yIGFueSBjaGFuZ2VzXHJcblx0XHRyZXR1cm4gdGhpcy5vbihcImNoYW5nZVwiLCAoKSA9PiB7XHJcblx0XHRcdC8vIHRoZSBjaGFuZ2VzIHdpbGwgd2UgaW4gdGhlIGNhY2hlXHJcblx0XHRcdGZuKGFycmF5RnJvbU9iamVjdCh0aGlzLl9jYWNoZSkpO1xyXG5cdFx0fSk7XHJcblx0fVxyXG5cclxuXHQvLyBnZXQgYSBzaW5nbGUgaXRlbSBhbmQgbGlzdGVuIGZvciBjaGFuZ2VzXHJcblx0Z2V0KGlkLCBmbikge1xyXG5cdFx0Ly8ganVzdCBsb2FkIHRoZSB2YWx1ZSBmcm9tIGlkYlxyXG5cdFx0aWYoIWZuKSB7XHJcblx0XHRcdC8vIGhpdCB0aGUgY2FjaGVcclxuXHRcdFx0aWYodGhpcy5fY2FjaGVbaWRdKSByZXR1cm4gUHJvbWlzZS5yZXNvbHZlKHRoaXMuX2NhY2hlW2lkXSk7XHJcblxyXG5cdFx0XHQvLyBoaXQgaWRiXHJcblx0XHRcdHJldHVybiB0aGlzLl9kYi50aGVuKGRiID0+IHtcclxuXHRcdFx0XHRyZXR1cm4gZGIudHJhbnNhY3Rpb24odGhpcy5uYW1lKVxyXG5cdFx0XHRcdFx0Lm9iamVjdFN0b3JlKHRoaXMubmFtZSlcclxuXHRcdFx0XHRcdC5nZXQoaWQpXHJcblx0XHRcdFx0XHQudGhlbihpdGVtID0+IHtcclxuXHRcdFx0XHRcdFx0aWYodHlwZW9mIHRoaXMuX2Rlc2VyaWFsaXplciA9PSBcImZ1bmN0aW9uXCIpIHtcclxuXHRcdFx0XHRcdFx0XHRyZXR1cm4gdGhpcy5fZGVzZXJpYWxpemVyKGl0ZW0pIHx8IGl0ZW07XHJcblx0XHRcdFx0XHRcdH1cclxuXHJcblx0XHRcdFx0XHRcdHJldHVybiBpdGVtO1xyXG5cdFx0XHRcdFx0fSk7XHJcblx0XHRcdH0pO1xyXG5cdFx0fVxyXG5cclxuXHRcdC8vIGdvIHRvIHRoZSBjYWNoZSBmaXJzdFxyXG5cdFx0Zm4odGhpcy5fY2FjaGVbaWRdKTtcclxuXHJcblx0XHQvLyBsb2FkIHRoZSBpdGVtIGZyb20gaWRiXHJcblx0XHR0aGlzLl9kYi50aGVuKGRiID0+IHtcclxuXHRcdFx0ZGIudHJhbnNhY3Rpb24odGhpcy5uYW1lKVxyXG5cdFx0XHRcdC5vYmplY3RTdG9yZSh0aGlzLm5hbWUpXHJcblx0XHRcdFx0LmdldChpZClcclxuXHRcdFx0XHQudGhlbihpdGVtID0+IHtcclxuXHRcdFx0XHRcdGlmKGl0ZW0pIHtcclxuXHRcdFx0XHRcdFx0Ly8gc3RvcmUgaXRlbSBpbiB0aGUgY2FjaGVcclxuXHRcdFx0XHRcdFx0dGhpcy5fY2FjaGVbaXRlbS5pZF0gPSBpdGVtO1xyXG5cclxuXHRcdFx0XHRcdFx0Ly8gbm90aWZ5IGxpc3RlbmVycyB3ZSBsb2FkZWQgdGhlIGRhdGFcclxuXHRcdFx0XHRcdFx0dGhpcy5lbWl0KFwiY2hhbmdlXCIpO1xyXG5cdFx0XHRcdFx0fVxyXG5cdFx0XHRcdH0pO1xyXG5cdFx0fSk7XHJcblxyXG5cdFx0Ly8gbGlzdGVuIGZvciBhbnkgY2hhbmdlc1xyXG5cdFx0cmV0dXJuIHRoaXMub24oXCJjaGFuZ2VcIiwgKCkgPT4ge1xyXG5cdFx0XHRmbih0aGlzLl9jYWNoZVtpZF0pO1xyXG5cdFx0fSk7XHJcblx0fVxyXG5cclxuXHQvLyBzdG9yZSBhIHZhbHVlIGluIHRoZSBzdG9yZVxyXG5cdHNldCh2YWx1ZSwgc2tpcHMsIG9wdHMgPSB7fSkge1xyXG5cdFx0dmFyIGlzTmV3ID0gISF0aGlzLl9jYWNoZVt2YWx1ZS5pZF07XHJcblxyXG5cdFx0Ly8gZGVzZXJpYWxpemVcclxuXHRcdGlmKHR5cGVvZiB0aGlzLl9kZXNlcmlhbGl6ZXIgPT0gXCJmdW5jdGlvblwiKSB7XHJcblx0XHRcdHZhbHVlID0gdGhpcy5fZGVzZXJpYWxpemVyKHZhbHVlKSB8fCB2YWx1ZTtcclxuXHRcdH1cclxuXHJcblx0XHQvLyBzdG9yZSB0aGUgdmFsdWUgaW4gdGhlIGNhY2hlXHJcblx0XHR0aGlzLl9jYWNoZVt2YWx1ZS5pZF0gPSB2YWx1ZTtcclxuXHJcblx0XHQvLyBzYXZlIHRoZSBpdGVtXHJcblx0XHR2YXIgc2F2ZSA9ICgpID0+IHtcclxuXHRcdFx0Ly8gc2F2ZSB0aGUgaXRlbSBpbiB0aGUgZGJcclxuXHRcdFx0dGhpcy5fZGIudGhlbihkYiA9PiB7XHJcblx0XHRcdFx0ZGIudHJhbnNhY3Rpb24odGhpcy5uYW1lLCBcInJlYWR3cml0ZVwiKVxyXG5cdFx0XHRcdFx0Lm9iamVjdFN0b3JlKHRoaXMubmFtZSlcclxuXHRcdFx0XHRcdC5wdXQodmFsdWUpO1xyXG5cdFx0XHR9KTtcclxuXHJcblx0XHRcdC8vIHN5bmMgdGhlIGNoYW5nZXMgdG8gdGhlIHNlcnZlclxyXG5cdFx0XHR0aGlzLnBhcnRpYWxFbWl0KFwic3luYy1wdXRcIiwgc2tpcHMsIHZhbHVlLCBpc05ldyk7XHJcblx0XHR9O1xyXG5cclxuXHRcdC8vIGVtaXQgYSBjaGFuZ2VcclxuXHRcdHRoaXMucGFydGlhbEVtaXQoXCJjaGFuZ2VcIiwgc2tpcHMpO1xyXG5cclxuXHRcdC8vIGRvbid0IHdhaXQgdG8gc2VuZCB0aGUgY2hhbmdlcyB0byB0aGUgc2VydmVyXHJcblx0XHRpZihvcHRzLnNhdmVOb3cpIHJldHVybiBzYXZlKCk7XHJcblx0XHRlbHNlIGRlYm91bmNlKGAke3RoaXMubmFtZX0vJHt2YWx1ZS5pZH1gLCBzYXZlKTtcclxuXHR9XHJcblxyXG5cdC8vIHJlbW92ZSBhIHZhbHVlIGZyb20gdGhlIHN0b3JlXHJcblx0cmVtb3ZlKGlkLCBza2lwcykge1xyXG5cdFx0Ly8gcmVtb3ZlIHRoZSB2YWx1ZSBmcm9tIHRoZSBjYWNoZVxyXG5cdFx0ZGVsZXRlIHRoaXMuX2NhY2hlW2lkXTtcclxuXHJcblx0XHQvLyBlbWl0IGEgY2hhbmdlXHJcblx0XHR0aGlzLnBhcnRpYWxFbWl0KFwiY2hhbmdlXCIsIHNraXBzKTtcclxuXHJcblx0XHQvLyBzeW5jIHRoZSBjaGFuZ2VzIHRvIHRoZSBzZXJ2ZXJcclxuXHRcdHRoaXMucGFydGlhbEVtaXQoXCJzeW5jLWRlbGV0ZVwiLCBza2lwcywgaWQpO1xyXG5cclxuXHRcdC8vIGRlbGV0ZSB0aGUgaXRlbVxyXG5cdFx0cmV0dXJuIHRoaXMuX2RiLnRoZW4oZGIgPT4ge1xyXG5cdFx0XHRyZXR1cm4gZGIudHJhbnNhY3Rpb24odGhpcy5uYW1lLCBcInJlYWR3cml0ZVwiKVxyXG5cdFx0XHRcdC5vYmplY3RTdG9yZSh0aGlzLm5hbWUpXHJcblx0XHRcdFx0LmRlbGV0ZShpZCk7XHJcblx0XHR9KTtcclxuXHR9XHJcblxyXG5cdC8vIGZvcmNlIHNhdmVzIHRvIGdvIHRocm91Z2hcclxuXHRmb3JjZVNhdmUoKSB7XHJcblx0XHRmb3IobGV0IHRpbWVyIG9mIE9iamVjdC5nZXRPd25Qcm9wZXJ0eU5hbWVzKGRlYm91bmNlVGltZXJzKSkge1xyXG5cdFx0XHQvLyBvbmx5IHNhdmUgaXRlbXMgZnJvbSB0aGlzIGRhdGEgc3RvcmVcclxuXHRcdFx0aWYodGltZXIuaW5kZXhPZihgJHt0aGlzLm5hbWV9L2ApID09PSAwKSB7XHJcblx0XHRcdFx0Y29udGludWU7XHJcblx0XHRcdH1cclxuXHJcblx0XHRcdC8vIGxvb2sgdXAgdGhlIHRpbWVyIGlkXHJcblx0XHRcdGxldCBpZCA9IHRpbWVyLnN1YnN0cih0aW1lci5pbmRleE9mKFwiL1wiKSArIDEpO1xyXG5cdFx0XHR2YXIgdmFsdWUgPSB0aGlzLl9jYWNoZVtpZF07XHJcblxyXG5cdFx0XHQvLyBjbGVhciB0aGUgdGltZXJcclxuXHRcdFx0Y2xlYXJUaW1lb3V0KHRpbWVyKTtcclxuXHJcblx0XHRcdC8vIHJlbW92ZSB0aGUgdGltZXIgZnJvbSB0aGUgbGlzdFxyXG5cdFx0XHRkZWxldGUgZGVib3VuY2VUaW1lcnNbdGltZXJdO1xyXG5cclxuXHRcdFx0Ly8gZG9uJ3Qgc2F2ZSBvbiBkZWxldGVcclxuXHRcdFx0aWYoIXZhbHVlKSByZXR1cm47XHJcblxyXG5cdFx0XHQvLyBzYXZlIHRoZSBpdGVtIGluIHRoZSBkYlxyXG5cdFx0XHR0aGlzLl9kYi50aGVuKGRiID0+IHtcclxuXHRcdFx0XHRkYi50cmFuc2FjdGlvbih0aGlzLm5hbWUsIFwicmVhZHdyaXRlXCIpXHJcblx0XHRcdFx0XHQub2JqZWN0U3RvcmUodGhpcy5uYW1lKVxyXG5cdFx0XHRcdFx0LnB1dCh2YWx1ZSk7XHJcblx0XHRcdH0pO1xyXG5cclxuXHRcdFx0Ly8gc3luYyB0aGUgY2hhbmdlcyB0byB0aGUgc2VydmVyXHJcblx0XHRcdHRoaXMuZW1pdChcInN5bmMtcHV0XCIsIHZhbHVlKTtcclxuXHRcdH1cclxuXHR9XHJcbn1cclxuXHJcbi8vIGdldCBhbiBhcnJheSBmcm9tIGFuIG9iamVjdFxyXG52YXIgYXJyYXlGcm9tT2JqZWN0ID0gZnVuY3Rpb24ob2JqKSB7XHJcblx0cmV0dXJuIE9iamVjdC5nZXRPd25Qcm9wZXJ0eU5hbWVzKG9iailcclxuXHRcdC5tYXAobmFtZSA9PiBvYmpbbmFtZV0pO1xyXG59O1xyXG5cclxuLy8gZG9uJ3QgY2FsbCBhIGZ1bmN0aW9uIHRvbyBvZnRlblxyXG52YXIgZGVib3VuY2VUaW1lcnMgPSB7fTtcclxuXHJcbnZhciBkZWJvdW5jZSA9IChpZCwgZm4pID0+IHtcclxuXHQvLyBjYW5jZWwgdGhlIHByZXZpb3VzIGRlbGF5XHJcblx0Y2xlYXJUaW1lb3V0KGRlYm91bmNlVGltZXJzW2lkXSk7XHJcblx0Ly8gc3RhcnQgYSBuZXcgZGVsYXlcclxuXHRkZWJvdW5jZVRpbWVyc1tpZF0gPSBzZXRUaW1lb3V0KGZuLCBERUJPVU5DRV9USU1FKTtcclxufTtcclxuIiwiLyoqXHJcbiAqIEJyb3dzZXIgc3BlY2lmaWMgZ2xvYmFsc1xyXG4gKi9cclxuXHJcbmxpZmVMaW5lLm1ha2VEb20gPSByZXF1aXJlKFwiLi91dGlsL2RvbS1tYWtlclwiKS5kZWZhdWx0O1xyXG5saWZlTGluZS5zeW5jZXIgPSByZXF1aXJlKFwiLi9zeW5jZXJcIikuc3luY2VyO1xyXG5cclxuLy8gYWRkIGEgZnVuY3Rpb24gZm9yIGFkZGluZyBhY3Rpb25zXHJcbmxpZmVMaW5lLmFkZEFjdGlvbiA9IGZ1bmN0aW9uKG5hbWUsIGZuKSB7XHJcblx0Ly8gYXR0YWNoIHRoZSBjYWxsYmFja1xyXG5cdHZhciBsaXN0ZW5lciA9IGxpZmVMaW5lLm9uKFwiYWN0aW9uLWV4ZWMtXCIgKyBuYW1lLCBmbik7XHJcblxyXG5cdC8vIGluZm9ybSBhbnkgYWN0aW9uIHByb3ZpZGVyc1xyXG5cdGxpZmVMaW5lLmVtaXQoXCJhY3Rpb24tY3JlYXRlXCIsIG5hbWUpO1xyXG5cclxuXHQvLyBhbGwgYWN0aW9ucyByZW1vdmVkXHJcblx0dmFyIHJlbW92ZUFsbCA9IGxpZmVMaW5lLm9uKFwiYWN0aW9uLXJlbW92ZS1hbGxcIiwgKCkgPT4ge1xyXG5cdFx0Ly8gcmVtb3ZlIHRoZSBhY3Rpb24gbGlzdGVuZXJcclxuXHRcdGxpc3RlbmVyLnVuc3Vic2NyaWJlKCk7XHJcblx0XHRyZW1vdmVBbGwudW5zdWJzY3JpYmUoKTtcclxuXHR9KTtcclxuXHJcblx0cmV0dXJuIHtcclxuXHRcdHVuc3Vic2NyaWJlKCkge1xyXG5cdFx0XHQvLyByZW1vdmUgdGhlIGFjdGlvbiBsaXN0ZW5lclxyXG5cdFx0XHRsaXN0ZW5lci51bnN1YnNjcmliZSgpO1xyXG5cdFx0XHRyZW1vdmVBbGwudW5zdWJzY3JpYmUoKTtcclxuXHJcblx0XHRcdC8vIGluZm9ybSBhbnkgYWN0aW9uIHByb3ZpZGVyc1xyXG5cdFx0XHRsaWZlTGluZS5lbWl0KFwiYWN0aW9uLXJlbW92ZVwiLCBuYW1lKTtcclxuXHRcdH1cclxuXHR9O1xyXG59O1xyXG4iLCIvLyBjcmVhdGUgdGhlIGdsb2JhbCBvYmplY3RcclxuaW1wb3J0IFwiLi4vY29tbW9uL2dsb2JhbFwiO1xyXG5pbXBvcnQgXCIuL2dsb2JhbFwiO1xyXG5cclxuaW1wb3J0IHtzdG9yZX0gZnJvbSBcIi4vZGF0YS1zdG9yZVwiO1xyXG5cclxudmFyIHN5bmNTdG9yZSA9IHN0b3JlKFwic3luYy1zdG9yZVwiKTtcclxuXHJcbi8vIGFsbCB0aGUgZmlsZXMgdG8gY2FjaGVcclxuY29uc3QgQ0FDSEVEX0ZJTEVTID0gW1xyXG5cdFwiL1wiLFxyXG5cdFwiL3N0YXRpYy9idW5kbGUuanNcIixcclxuXHRcIi9zdGF0aWMvc3R5bGUuY3NzXCIsXHJcblx0XCIvc3RhdGljL2ljb24tMTQ0LnBuZ1wiXHJcbl07XHJcblxyXG5jb25zdCBTVEFUSUNfQ0FDSEUgPSBcInN0YXRpY1wiO1xyXG5cclxuLy8gY2FjaGUgdGhlIHZlcnNpb24gb2YgdGhlIGNsaWVudFxyXG52YXIgY2xpZW50VmVyc2lvbjtcclxuXHJcbi8vIGRvd25sb2FkIGEgbmV3IHZlcnNpb25cclxudmFyIGRvd25sb2FkID0gZnVuY3Rpb24oKSB7XHJcblx0Ly8gc2F2ZSB0aGUgbmV3IHZlcnNpb25cclxuXHR2YXIgdmVyc2lvbjtcclxuXHJcblx0Ly8gb3BlbiB0aGUgY2FjaGVcclxuXHRyZXR1cm4gY2FjaGVzLm9wZW4oU1RBVElDX0NBQ0hFKVxyXG5cclxuXHQudGhlbihjYWNoZSA9PiB7XHJcblx0XHQvLyBkb3dubG9hZCBhbGwgdGhlIGZpbGVzXHJcblx0XHRyZXR1cm4gUHJvbWlzZS5hbGwoXHJcblx0XHRcdENBQ0hFRF9GSUxFUy5tYXAodXJsID0+IHtcclxuXHRcdFx0XHQvLyBkb3dubG9hZCB0aGUgZmlsZVxyXG5cdFx0XHRcdHJldHVybiBmZXRjaCh1cmwpXHJcblxyXG5cdFx0XHRcdC50aGVuKHJlcyA9PiB7XHJcblx0XHRcdFx0XHQvLyBzYXZlIHRoZSBmaWxlXHJcblx0XHRcdFx0XHR2YXIgcHJvbWlzZXMgPSBbXHJcblx0XHRcdFx0XHRcdGNhY2hlLnB1dChuZXcgUmVxdWVzdCh1cmwpLCByZXMpXHJcblx0XHRcdFx0XHRdO1xyXG5cclxuXHRcdFx0XHRcdC8vIHNhdmUgdGhlIHZlcnNpb25cclxuXHRcdFx0XHRcdGlmKCF2ZXJzaW9uKSB7XHJcblx0XHRcdFx0XHRcdHZlcnNpb24gPSBjbGllbnRWZXJzaW9uID0gcmVzLmhlYWRlcnMuZ2V0KFwic2VydmVyXCIpO1xyXG5cclxuXHRcdFx0XHRcdFx0cHJvbWlzZXMucHVzaChcclxuXHRcdFx0XHRcdFx0XHRzeW5jU3RvcmUuc2V0KHtcclxuXHRcdFx0XHRcdFx0XHRcdGlkOiBcInZlcnNpb25cIixcclxuXHRcdFx0XHRcdFx0XHRcdHZhbHVlOiB2ZXJzaW9uXHJcblx0XHRcdFx0XHRcdFx0fSlcclxuXHRcdFx0XHRcdFx0KTtcclxuXHRcdFx0XHRcdH1cclxuXHJcblx0XHRcdFx0XHRyZXR1cm4gcHJvbWlzZXMubGVuZ3RoID09IDEgPyBwcm9taXNlc1swXSA6IFByb21pc2UuYWxsKHByb21pc2VzKTtcclxuXHRcdFx0XHR9KTtcclxuXHRcdFx0fSlcclxuXHRcdClcclxuXHJcblx0XHQudGhlbigoKSA9PiBjb25zb2xlLmxvZyhcIlVwZGF0ZSBjb21wbGV0ZVwiKSk7XHJcblx0fSk7XHJcbn07XHJcblxyXG4vLyBjaGVjayBmb3IgdXBkYXRlc1xyXG52YXIgY2hlY2tGb3JVcGRhdGVzID0gZnVuY3Rpb24obmV3VmVyc2lvbikge1xyXG5cdC8vIGlmIHdlIGhhdmUgYSB2ZXJzaW9uIHVzZSB0aGF0XHJcblx0aWYobmV3VmVyc2lvbikge1xyXG5cdFx0bmV3VmVyc2lvbiA9IFByb21pc2UucmVzb2x2ZShuZXdWZXJzaW9uKTtcclxuXHR9XHJcblx0Ly8gZmV0Y2ggdGhlIHZlcnNpb25cclxuXHRlbHNlIHtcclxuXHRcdG5ld1ZlcnNpb24gPSBmZXRjaChcIi9cIilcclxuXHJcblx0XHQudGhlbihyZXMgPT4gcmVzLmhlYWRlcnMuZ2V0KFwic2VydmVyXCIpKTtcclxuXHR9XHJcblxyXG5cdHZhciBvbGRWZXJzaW9uO1xyXG5cclxuXHQvLyBhbHJlYWR5IGluIG1lbW9yeVxyXG5cdGlmKGNsaWVudFZlcnNpb24pIHtcclxuXHRcdG9sZFZlcnNpb24gPSBQcm9taXNlLnJlc29sdmUoY2xpZW50VmVyc2lvbik7XHJcblx0fVxyXG5cdGVsc2Uge1xyXG5cdFx0b2xkVmVyc2lvbiA9IHN5bmNTdG9yZS5nZXQoXCJ2ZXJzaW9uXCIpLnRoZW4oKHZhbHVlID0ge30pID0+IHZhbHVlLnZhbHVlKVxyXG5cdH1cclxuXHJcblx0cmV0dXJuIFByb21pc2UuYWxsKFtcclxuXHRcdG5ld1ZlcnNpb24sXHJcblx0XHRvbGRWZXJzaW9uXHJcblx0XSlcclxuXHJcblx0LnRoZW4oKFtuZXdWZXJzaW9uLCBvbGRWZXJzaW9uXSkgPT4ge1xyXG5cdFx0Ly8gc2FtZSB2ZXJzaW9uIGRvIG5vdGhpbmdcclxuXHRcdGlmKG5ld1ZlcnNpb24gPT0gb2xkVmVyc2lvbikge1xyXG5cclxuXHRcdFx0cmV0dXJuIHN5bmNTdG9yZS5zZXQoe1xyXG5cdFx0XHRcdGlkOiBcInZlcnNpb25cIixcclxuXHRcdFx0XHR2YWx1ZTogb2xkVmVyc2lvblxyXG5cdFx0XHR9KTtcclxuXHRcdH1cclxuXHJcblx0XHQvLyBkb3dubG9hZCB0aGUgbmV3IHZlcnNpb25cclxuXHRcdHJldHVybiBkb3dubG9hZCgpO1xyXG5cdH0pO1xyXG59O1xyXG5cclxuLy8gd2hlbiB3ZSBhcmUgaW5zdGFsbGVkIGNoZWNrIGZvciB1cGRhdGVzXHJcbnNlbGYuYWRkRXZlbnRMaXN0ZW5lcihcImluc3RhbGxcIiwgZSA9PiBlLndhaXRVbnRpbChjaGVja0ZvclVwZGF0ZXMoKSkpO1xyXG5cclxuLy8gaGFuZGxlIGEgbmV0d29yayBSZXF1ZXN0XHJcbnNlbGYuYWRkRXZlbnRMaXN0ZW5lcihcImZldGNoXCIsIGUgPT4ge1xyXG5cdC8vIGdldCB0aGUgcGFnZSB1cmxcclxuXHR2YXIgdXJsID0gbmV3IFVSTChlLnJlcXVlc3QudXJsKS5wYXRobmFtZTtcclxuXHJcblx0Ly8ganVzdCBnbyB0byB0aGUgc2VydmVyIGZvciBhcGkgY2FsbHNcclxuXHRpZih1cmwuc3Vic3RyKDAsIDUpID09IFwiL2FwaS9cIikge1xyXG5cclxuXHRcdGUucmVzcG9uZFdpdGgoXHJcblx0XHRcdGZldGNoKGUucmVxdWVzdCwge1xyXG5cdFx0XHRcdGNyZWRlbnRpYWxzOiBcImluY2x1ZGVcIlxyXG5cdFx0XHR9KVxyXG5cclxuXHRcdFx0Ly8gbmV0d29yayBlcnJvclxyXG5cdFx0XHQuY2F0Y2goZXJyID0+IHtcclxuXHRcdFx0XHQvLyBzZW5kIGFuIGVycm9yIHJlc3BvbnNlXHJcblx0XHRcdFx0cmV0dXJuIG5ldyBSZXNwb25zZShKU09OLnN0cmluZ2lmeSh7XHJcblx0XHRcdFx0XHRzdGF0dXM6IFwiZmFpbFwiLFxyXG5cdFx0XHRcdFx0ZGF0YToge1xyXG5cdFx0XHRcdFx0XHRyZWFzb246IFwibmV0d29yLWVycm9yXCJcclxuXHRcdFx0XHRcdH1cclxuXHRcdFx0XHR9KSwge1xyXG5cdFx0XHRcdFx0aGVhZGVyczoge1xyXG5cdFx0XHRcdFx0XHRcImNvbnRlbnQtdHlwZVwiOiBcImFwcGxpY2F0aW9uL2pzb25cIlxyXG5cdFx0XHRcdFx0fVxyXG5cdFx0XHRcdH0pO1xyXG5cdFx0XHR9KVxyXG5cclxuXHRcdFx0LnRoZW4ocmVzID0+IHtcclxuXHRcdFx0XHQvLyBjaGVjayBmb3IgdXBkYXRlc1xyXG5cdFx0XHRcdGNoZWNrRm9yVXBkYXRlcyhyZXMuaGVhZGVycy5nZXQoXCJzZXJ2ZXJcIikpO1xyXG5cclxuXHRcdFx0XHRyZXR1cm4gcmVzO1xyXG5cdFx0XHR9KVxyXG5cdFx0KTtcclxuXHR9XHJcblx0Ly8gcmVzcG9uZCBmcm9tIHRoZSBjYWNoZVxyXG5cdGVsc2Uge1xyXG5cdFx0ZS5yZXNwb25kV2l0aChcclxuXHRcdFx0Y2FjaGVzLm1hdGNoKGUucmVxdWVzdClcclxuXHJcblx0XHRcdC50aGVuKHJlcyA9PiB7XHJcblx0XHRcdFx0Ly8gaWYgdGhlcmUgd2FzIG5vIG1hdGNoIHNlbmQgdGhlIGluZGV4IHBhZ2VcclxuXHRcdFx0XHRpZighcmVzKSB7XHJcblx0XHRcdFx0XHRyZXR1cm4gY2FjaGVzLm1hdGNoKG5ldyBSZXF1ZXN0KFwiL1wiKSk7XHJcblx0XHRcdFx0fVxyXG5cclxuXHRcdFx0XHRyZXR1cm4gcmVzO1xyXG5cdFx0XHR9KVxyXG5cdFx0KTtcclxuXHR9XHJcbn0pO1xyXG4iLCIvKipcclxuICogU3luY3Jvbml6ZSB0aGlzIGNsaWVudCB3aXRoIHRoZSBzZXJ2ZXJcclxuICovXHJcblxyXG5pbXBvcnQge3N0b3JlIGFzIGRhdGFTdG9yZX0gZnJvbSBcIi4vZGF0YS1zdG9yZVwiO1xyXG5cclxudmFyIHN5bmNTdG9yZSA9IGRhdGFTdG9yZShcInN5bmMtc3RvcmVcIik7XHJcblxyXG5jb25zdCBTVE9SRVMgPSBbXCJhc3NpZ25tZW50c1wiXTtcclxuXHJcbi8vIGNyZWF0ZSB0aGUgZ2xvYmFsIHN5bmNlciByZWZyZW5jZVxyXG5leHBvcnQgdmFyIHN5bmNlciA9IG5ldyBsaWZlTGluZS5FdmVudEVtaXR0ZXIoKTtcclxuXHJcbi8vIHNhdmUgc3Vic2NyaXB0aW9ucyB0byBkYXRhIHN0b3JlIHN5bmMgZXZlbnRzIHNvIHdlIGRvbnQgdHJpZ2dlciBvdXIgc2VsZiB3aGVuIHdlIHN5bmNcclxudmFyIHN5bmNTdWJzID0gW107XHJcblxyXG4vLyBkb24ndCBzeW5jIHdoaWxlIHdlIGFyZSBzeW5jaW5nXHJcbnZhciBpc1N5bmNpbmcgPSBmYWxzZTtcclxudmFyIHN5bmNBZ2FpbiA9IGZhbHNlO1xyXG5cclxuLy8gYWRkIGEgY2hhbmdlIHRvIHRoZSBzeW5jIHF1ZXVlXHJcbnZhciBlbnF1ZXVlQ2hhbmdlID0gY2hhbmdlID0+IHtcclxuXHQvLyBsb2FkIHRoZSBxdWV1ZVxyXG5cdHJldHVybiBzeW5jU3RvcmUuZ2V0KFwiY2hhbmdlLXF1ZXVlXCIpXHJcblxyXG5cdC50aGVuKCh7Y2hhbmdlcyA9IFtdfSA9IHt9KSA9PiB7XHJcblx0XHQvLyBnZXQgdGhlIGlkIGZvciB0aGUgY2hhbmdlXHJcblx0XHR2YXIgY2hJZCA9IGNoYW5nZS50eXBlID09IFwiZGVsZXRlXCIgPyBjaGFuZ2UuaWQgOiBjaGFuZ2UuZGF0YS5pZDtcclxuXHJcblx0XHR2YXIgZXhpc3RpbmcgPSBjaGFuZ2VzLmZpbmRJbmRleChjaCA9PlxyXG5cdFx0XHRjaC50eXBlID09IFwiZGVsZXRlXCIgPyBjaC5pZCA9PSBjaElkIDogY2guZGF0YS5pZCA9PSBjaElkKTtcclxuXHJcblx0XHQvLyByZW1vdmUgdGhlIGV4aXN0aW5nIGNoYW5nZVxyXG5cdFx0aWYoZXhpc3RpbmcgIT09IC0xKSB7XHJcblx0XHRcdGNoYW5nZXMuc3BsaWNlKGV4aXN0aW5nLCAxKTtcclxuXHRcdH1cclxuXHJcblx0XHQvLyBhZGQgdGhlIGNoYW5nZSB0byB0aGUgcXVldWVcclxuXHRcdGNoYW5nZXMucHVzaChjaGFuZ2UpO1xyXG5cclxuXHRcdC8vIHNhdmUgdGhlIHF1ZXVlXHJcblx0XHRyZXR1cm4gc3luY1N0b3JlLnNldCh7XHJcblx0XHRcdGlkOiBcImNoYW5nZS1xdWV1ZVwiLFxyXG5cdFx0XHRjaGFuZ2VzXHJcblx0XHR9KTtcclxuXHR9KVxyXG5cclxuXHQvLyBzeW5jIHdoZW4gaWRsZVxyXG5cdC50aGVuKCgpID0+IGlkbGUoc3luY2VyLnN5bmMpKTtcclxufTtcclxuXHJcbi8vIGFkZCBhIHN5bmMgbGlzdGVuZXIgdG8gYSBkYXRhIHN0b3JlXHJcbnZhciBvblN5bmMgPSBmdW5jdGlvbihkcywgbmFtZSwgZm4pIHtcclxuXHRzeW5jU3Vicy5wdXNoKGRzLm9uKFwic3luYy1cIiArIG5hbWUsIGZuKSk7XHJcbn07XHJcblxyXG4vLyB3aGVuIGEgZGF0YSBzdG9yZSBpcyBvcGVuZWQgbGlzdGVuIGZvciBjaGFuZ2VzXHJcbmxpZmVMaW5lLm9uKFwiZGF0YS1zdG9yZS1jcmVhdGVkXCIsIGRzID0+IHtcclxuXHQvLyBkb24ndCBzeW5jIHRoZSBzeW5jIHN0b3JlXHJcblx0aWYoZHMubmFtZSA9PSBcInN5bmMtc3RvcmVcIikgcmV0dXJuO1xyXG5cclxuXHQvLyBjcmVhdGUgYW5kIGVucXVldWUgYSBwdXQgY2hhbmdlXHJcblx0b25TeW5jKGRzLCBcInB1dFwiLCAodmFsdWUsIGlzTmV3KSA9PiB7XHJcblx0XHRlbnF1ZXVlQ2hhbmdlKHtcclxuXHRcdFx0c3RvcmU6IGRzLm5hbWUsXHJcblx0XHRcdHR5cGU6IGlzTmV3ID8gXCJjcmVhdGVcIiA6IFwicHV0XCIsXHJcblx0XHRcdGRhdGE6IHZhbHVlXHJcblx0XHR9KTtcclxuXHR9KTtcclxuXHJcblx0Ly8gY3JlYXRlIGFuZCBlbnF1ZXVlIGEgZGVsZXRlIGNoYW5nZVxyXG5cdG9uU3luYyhkcywgXCJkZWxldGVcIiwgaWQgPT4ge1xyXG5cdFx0ZW5xdWV1ZUNoYW5nZSh7XHJcblx0XHRcdHN0b3JlOiBkcy5uYW1lLFxyXG5cdFx0XHR0eXBlOiBcImRlbGV0ZVwiLFxyXG5cdFx0XHRpZCxcclxuXHRcdFx0dGltZXN0YW1wOiBEYXRlLm5vdygpXHJcblx0XHR9KTtcclxuXHR9KTtcclxufSk7XHJcblxyXG4vLyB3YWl0IGZvciBzb21lIGlkbGUgdGltZVxyXG52YXIgaWRsZSA9IGZuID0+IHtcclxuXHRpZih0eXBlb2YgcmVxdWVzdElkbGVDYWxsYmFjayA9PSBcImZ1bmN0aW9uXCIpIHtcclxuXHRcdHJlcXVlc3RJZGxlQ2FsbGJhY2soZm4pO1xyXG5cdH1cclxuXHRlbHNlIHtcclxuXHRcdHNldFRpbWVvdXQoZm4sIDEwMCk7XHJcblx0fVxyXG59O1xyXG5cclxuLy8gc3luYyB3aXRoIHRoZSBzZXJ2ZXJcclxuc3luY2VyLnN5bmMgPSBmdW5jdGlvbigpIHtcclxuXHQvLyBkb24ndCBzeW5jIHdoaWxlIG9mZmxpbmVcclxuXHRpZihuYXZpZ2F0b3Iub25saW5lKSB7XHJcblx0XHRyZXR1cm47XHJcblx0fVxyXG5cclxuXHQvLyBvbmx5IGRvIG9uZSBzeW5jIGF0IGEgdGltZVxyXG5cdGlmKGlzU3luY2luZykge1xyXG5cdFx0c3luY0FnYWluID0gdHJ1ZTtcclxuXHRcdHJldHVybjtcclxuXHR9XHJcblxyXG5cdGlzU3luY2luZyA9IHRydWU7XHJcblxyXG5cdHN5bmNlci5lbWl0KFwic3ljbi1zdGFydFwiKTtcclxuXHJcblx0Ly8gbG9hZCB0aGUgY2hhbmdlIHF1ZXVlXHJcblx0dmFyIHByb21pc2VzID0gW1xyXG5cdFx0c3luY1N0b3JlLmdldChcImNoYW5nZS1xdWV1ZVwiKS50aGVuKCh7Y2hhbmdlcyA9IFtdfSA9IHt9KSA9PiBjaGFuZ2VzKVxyXG5cdF07XHJcblxyXG5cdC8vIGxvYWQgYWxsIGlkc1xyXG5cdGZvcihsZXQgc3RvcmVOYW1lIG9mIFNUT1JFUykge1xyXG5cdFx0cHJvbWlzZXMucHVzaChcclxuXHRcdFx0ZGF0YVN0b3JlKHN0b3JlTmFtZSlcclxuXHRcdFx0XHQuZ2V0QWxsKClcclxuXHRcdFx0XHQudGhlbihpdGVtcyA9PiB7XHJcblx0XHRcdFx0XHR2YXIgZGF0ZXMgPSB7fTtcclxuXHJcblx0XHRcdFx0XHQvLyBtYXAgbW9kaWZpZWQgZGF0ZSB0byB0aGUgaWRcclxuXHRcdFx0XHRcdGl0ZW1zLmZvckVhY2goaXRlbSA9PiBkYXRlc1tpdGVtLmlkXSA9IGl0ZW0ubW9kaWZpZWQpO1xyXG5cclxuXHRcdFx0XHRcdHJldHVybiBbc3RvcmVOYW1lLCBkYXRlc107XHJcblx0XHRcdFx0fSlcclxuXHRcdCk7XHJcblx0fVxyXG5cclxuXHRQcm9taXNlLmFsbChwcm9taXNlcykudGhlbigoW2NoYW5nZXMsIC4uLm1vZGlmaWVkc10pID0+IHtcclxuXHRcdC8vIGNvbnZlcnQgbW9kaWZpZWRzIHRvIGFuIG9iamVjdFxyXG5cdFx0dmFyIG1vZGlmaWVkc09iaiA9IHt9O1xyXG5cclxuXHRcdG1vZGlmaWVkcy5mb3JFYWNoKG1vZGlmaWVkID0+IG1vZGlmaWVkc09ialttb2RpZmllZFswXV0gPSBtb2RpZmllZFsxXSk7XHJcblxyXG5cdFx0Ly8gc2VuZCB0aGUgY2hhbmdlcyB0byB0aGUgc2VydmVyXHJcblx0XHRyZXR1cm4gZmV0Y2goXCIvYXBpL2RhdGEvXCIsIHtcclxuXHRcdFx0bWV0aG9kOiBcIlBPU1RcIixcclxuXHRcdFx0Y3JlZGVudGlhbHM6IFwiaW5jbHVkZVwiLFxyXG5cdFx0XHRib2R5OiBKU09OLnN0cmluZ2lmeSh7XHJcblx0XHRcdFx0Y2hhbmdlcyxcclxuXHRcdFx0XHRtb2RpZmllZHM6IG1vZGlmaWVkc09ialxyXG5cdFx0XHR9KVxyXG5cdFx0fSk7XHJcblx0fSlcclxuXHJcblx0Ly8gcGFyc2UgdGhlIGJvZHlcclxuXHQudGhlbihyZXMgPT4gcmVzLmpzb24oKSlcclxuXHJcblx0Ly8gY2F0Y2ggYW55IG5ldHdvcmsgZXJyb3JzXHJcblx0LmNhdGNoKCgpID0+ICh7IHN0YXR1czogXCJmYWlsXCIsIGRhdGE6IHsgcmVhc29uOiBcIm5ldHdvcmstZXJyb3JcIiB9IH0pKVxyXG5cclxuXHQudGhlbigoe3N0YXR1cywgZGF0YTogcmVzdWx0cywgcmVhc29ufSkgPT4ge1xyXG5cdFx0Ly8gY2F0Y2ggYW55IGVycm9yXHJcblx0XHRpZihzdGF0dXMgPT0gXCJmYWlsXCIpIHtcclxuXHRcdFx0Ly8gbG9nIHRoZSB1c2VyIGluXHJcblx0XHRcdGlmKHJlc3VsdHMucmVhc29uID09IFwibG9nZ2VkLW91dFwiKSB7XHJcblx0XHRcdFx0bGlmZUxpbmUubmF2Lm5hdmlnYXRlKFwiL2xvZ2luXCIpO1xyXG5cdFx0XHR9XHJcblxyXG5cdFx0XHRyZXR1cm47XHJcblx0XHR9XHJcblxyXG5cdFx0Ly8gY2xlYXIgdGhlIGNoYW5nZSBxdWV1ZVxyXG5cdFx0cmVzdWx0cy51bnNoaWZ0KFxyXG5cdFx0XHRzeW5jU3RvcmUuc2V0KHtcclxuXHRcdFx0XHRpZDogXCJjaGFuZ2UtcXVldWVcIixcclxuXHRcdFx0XHRjaGFuZ2VzOiBbXVxyXG5cdFx0XHR9KVxyXG5cdFx0KTtcclxuXHJcblx0XHQvLyBhcHBseSB0aGUgcmVzdWx0c1xyXG5cdFx0cmV0dXJuIFByb21pc2UuYWxsKFxyXG5cdFx0XHRyZXN1bHRzLm1hcCgocmVzdWx0LCBpbmRleCkgPT4ge1xyXG5cdFx0XHRcdC8vIGZpcnN0IHJlc3VsdCBpcyB0aGUgcHJvbWlzZSB0byByZXNldCB0aGUgY2hhbmdlIHF1ZXVlXHJcblx0XHRcdFx0aWYoaW5kZXggPT09IDApIHJldHVybiByZXN1bHQ7XHJcblx0XHRcdFx0Y29uc29sZS5sb2cocmVzdWx0KTtcclxuXHJcblx0XHRcdFx0Ly8gZGVsZXRlIHRoZSBsb2NhbCBjb3B5XHJcblx0XHRcdFx0aWYocmVzdWx0LmNvZGUgPT0gXCJpdGVtLWRlbGV0ZWRcIikge1xyXG5cdFx0XHRcdFx0bGV0IHN0b3JlID0gZGF0YVN0b3JlKHJlc3VsdC5zdG9yZSk7XHJcblxyXG5cdFx0XHRcdFx0cmV0dXJuIHN0b3JlLnJlbW92ZShyZXN1bHQuaWQsIHN5bmNTdWJzKTtcclxuXHRcdFx0XHR9XHJcblx0XHRcdFx0Ly8gc2F2ZSB0aGUgbmV3ZXIgdmVyc2lvbiBmcm9tIHRoZSBzZXJ2ZXJcclxuXHRcdFx0XHRlbHNlIGlmKHJlc3VsdC5jb2RlID09IFwibmV3ZXItdmVyc2lvblwiKSB7XHJcblx0XHRcdFx0XHRsZXQgc3RvcmUgPSBkYXRhU3RvcmUocmVzdWx0LnN0b3JlKTtcclxuXHJcblx0XHRcdFx0XHRyZXR1cm4gc3RvcmUuc2V0KHJlc3VsdC5kYXRhLCBzeW5jU3VicywgeyBzYXZlTm93OiB0cnVlIH0pO1xyXG5cdFx0XHRcdH1cclxuXHRcdFx0fSlcclxuXHRcdCk7XHJcblx0fSlcclxuXHJcblx0LnRoZW4oKCkgPT4ge1xyXG5cdFx0Ly8gcmVsZWFzZSB0aGUgbG9ja1xyXG5cdFx0aXNTeW5jaW5nID0gZmFsc2U7XHJcblxyXG5cdFx0Ly8gdGhlcmUgd2FzIGFuIGF0dGVtcHQgdG8gc3luYyB3aGlsZSB3ZSB3aGVyZSBzeW5jaW5nXHJcblx0XHRpZihzeW5jQWdhaW4pIHtcclxuXHRcdFx0c3luY0FnYWluID0gZmFsc2U7XHJcblxyXG5cdFx0XHRpZGxlKHN5bmNlci5zeW5jKTtcclxuXHRcdH1cclxuXHJcblx0XHRzeW5jZXIuZW1pdChcInN5bmMtY29tcGxldGVcIik7XHJcblx0fSk7XHJcbn07XHJcblxyXG4vLyBkb24ndCBhZGQgZXZlbnQgbGlzdGVuZXJzIGluIHRoZSBzZXJ2aWNlIHdvcmtlclxyXG5pZih0eXBlb2Ygd2luZG93ID09IFwib2JqZWN0XCIpIHtcclxuXHQvLyB3aGVuIHdlIGNvbWUgYmFjayBvbiBsaW5lIHN5bmNcclxuXHR3aW5kb3cuYWRkRXZlbnRMaXN0ZW5lcihcIm9ubGluZVwiLCAoKSA9PiBzeW5jZXIuc3luYygpKTtcclxuXHJcblx0Ly8gd2hlbiB0aGUgdXNlciBuYXZpZ2F0ZXMgYmFjayBzeW5jXHJcblx0d2luZG93LmFkZEV2ZW50TGlzdGVuZXIoXCJ2aXNpYmlsaXR5Y2hhbmdlXCIsICgpID0+IHtcclxuXHRcdGlmKCFkb2N1bWVudC5oaWRkZW4pIHtcclxuXHRcdFx0c3luY2VyLnN5bmMoKTtcclxuXHRcdH1cclxuXHR9KTtcclxuXHJcblx0Ly8gc3luYyBvbiBzdGFydHVwXHJcblx0c3luY2VyLnN5bmMoKTtcclxufVxyXG4iLCIvKipcclxuICogQSBoZWxwZXIgZm9yIGJ1aWxkaW5nIGRvbSBub2Rlc1xyXG4gKi9cclxuXHJcbmNvbnN0IFNWR19FTEVNRU5UUyA9IFtcInN2Z1wiLCBcImxpbmVcIl07XHJcbmNvbnN0IFNWR19OQU1FU1BBQ0UgPSBcImh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnXCI7XHJcblxyXG4vLyBidWlsZCBhIHNpbmdsZSBkb20gbm9kZVxyXG52YXIgbWFrZURvbSA9IGZ1bmN0aW9uKG9wdHMgPSB7fSkge1xyXG5cdC8vIGdldCBvciBjcmVhdGUgdGhlIG5hbWUgbWFwcGluZ1xyXG5cdHZhciBtYXBwZWQgPSBvcHRzLm1hcHBlZCB8fCB7fTtcclxuXHJcblx0dmFyICRlbDtcclxuXHJcblx0Ly8gdGhlIGVsZW1lbnQgaXMgcGFydCBvZiB0aGUgc3ZnIG5hbWVzcGFjZVxyXG5cdGlmKFNWR19FTEVNRU5UUy5pbmRleE9mKG9wdHMudGFnKSAhPT0gLTEpIHtcclxuXHRcdCRlbCA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnROUyhTVkdfTkFNRVNQQUNFLCBvcHRzLnRhZyk7XHJcblx0fVxyXG5cdC8vIGEgcGxhaW4gZWxlbWVudFxyXG5cdGVsc2Uge1xyXG5cdFx0JGVsID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudChvcHRzLnRhZyB8fCBcImRpdlwiKTtcclxuXHR9XHJcblxyXG5cdC8vIHNldCB0aGUgY2xhc3Nlc1xyXG5cdGlmKG9wdHMuY2xhc3Nlcykge1xyXG5cdFx0JGVsLnNldEF0dHJpYnV0ZShcImNsYXNzXCIsIHR5cGVvZiBvcHRzLmNsYXNzZXMgPT0gXCJzdHJpbmdcIiA/IG9wdHMuY2xhc3NlcyA6IG9wdHMuY2xhc3Nlcy5qb2luKFwiIFwiKSk7XHJcblx0fVxyXG5cclxuXHQvLyBhdHRhY2ggdGhlIGF0dHJpYnV0ZXNcclxuXHRpZihvcHRzLmF0dHJzKSB7XHJcblx0XHRPYmplY3QuZ2V0T3duUHJvcGVydHlOYW1lcyhvcHRzLmF0dHJzKVxyXG5cclxuXHRcdC5mb3JFYWNoKGF0dHIgPT4gJGVsLnNldEF0dHJpYnV0ZShhdHRyLCBvcHRzLmF0dHJzW2F0dHJdKSk7XHJcblx0fVxyXG5cclxuXHQvLyBzZXQgdGhlIHRleHQgY29udGVudFxyXG5cdGlmKG9wdHMudGV4dCkge1xyXG5cdFx0JGVsLmlubmVyVGV4dCA9IG9wdHMudGV4dDtcclxuXHR9XHJcblxyXG5cdC8vIGF0dGFjaCB0aGUgbm9kZSB0byBpdHMgcGFyZW50XHJcblx0aWYob3B0cy5wYXJlbnQpIHtcclxuXHRcdG9wdHMucGFyZW50Lmluc2VydEJlZm9yZSgkZWwsIG9wdHMuYmVmb3JlKTtcclxuXHR9XHJcblxyXG5cdC8vIGFkZCBldmVudCBsaXN0ZW5lcnNcclxuXHRpZihvcHRzLm9uKSB7XHJcblx0XHRmb3IobGV0IG5hbWUgb2YgT2JqZWN0LmdldE93blByb3BlcnR5TmFtZXMob3B0cy5vbikpIHtcclxuXHRcdFx0JGVsLmFkZEV2ZW50TGlzdGVuZXIobmFtZSwgb3B0cy5vbltuYW1lXSk7XHJcblxyXG5cdFx0XHQvLyBhdHRhY2ggdGhlIGRvbSB0byBhIGRpc3Bvc2FibGVcclxuXHRcdFx0aWYob3B0cy5kaXNwKSB7XHJcblx0XHRcdFx0b3B0cy5kaXNwLmFkZCh7XHJcblx0XHRcdFx0XHR1bnN1YnNjcmliZTogKCkgPT4gJGVsLnJlbW92ZUV2ZW50TGlzdGVuZXIobmFtZSwgb3B0cy5vbltuYW1lXSlcclxuXHRcdFx0XHR9KTtcclxuXHRcdFx0fVxyXG5cdFx0fVxyXG5cdH1cclxuXHJcblx0Ly8gc2V0IHRoZSB2YWx1ZSBvZiBhbiBpbnB1dCBlbGVtZW50XHJcblx0aWYob3B0cy52YWx1ZSkge1xyXG5cdFx0JGVsLnZhbHVlID0gb3B0cy52YWx1ZTtcclxuXHR9XHJcblxyXG5cdC8vIGFkZCB0aGUgbmFtZSBtYXBwaW5nXHJcblx0aWYob3B0cy5uYW1lKSB7XHJcblx0XHRtYXBwZWRbb3B0cy5uYW1lXSA9ICRlbDtcclxuXHR9XHJcblxyXG5cdC8vIGNyZWF0ZSB0aGUgY2hpbGQgZG9tIG5vZGVzXHJcblx0aWYob3B0cy5jaGlsZHJlbikge1xyXG5cdFx0Zm9yKGxldCBjaGlsZCBvZiBvcHRzLmNoaWxkcmVuKSB7XHJcblx0XHRcdC8vIG1ha2UgYW4gYXJyYXkgaW50byBhIGdyb3VwIE9iamVjdFxyXG5cdFx0XHRpZihBcnJheS5pc0FycmF5KGNoaWxkKSkge1xyXG5cdFx0XHRcdGNoaWxkID0ge1xyXG5cdFx0XHRcdFx0Z3JvdXA6IGNoaWxkXHJcblx0XHRcdFx0fTtcclxuXHRcdFx0fVxyXG5cclxuXHRcdFx0Ly8gYXR0YWNoIGluZm9ybWF0aW9uIGZvciB0aGUgZ3JvdXBcclxuXHRcdFx0Y2hpbGQucGFyZW50ID0gJGVsO1xyXG5cdFx0XHRjaGlsZC5kaXNwID0gb3B0cy5kaXNwO1xyXG5cdFx0XHRjaGlsZC5tYXBwZWQgPSBtYXBwZWQ7XHJcblxyXG5cdFx0XHQvLyBidWlsZCB0aGUgbm9kZSBvciBncm91cFxyXG5cdFx0XHRtYWtlKGNoaWxkKTtcclxuXHRcdH1cclxuXHR9XHJcblxyXG5cdHJldHVybiBtYXBwZWQ7XHJcbn1cclxuXHJcbi8vIGJ1aWxkIGEgZ3JvdXAgb2YgZG9tIG5vZGVzXHJcbnZhciBtYWtlR3JvdXAgPSBmdW5jdGlvbihncm91cCkge1xyXG5cdC8vIHNob3J0aGFuZCBmb3IgYSBncm91cHNcclxuXHRpZihBcnJheS5pc0FycmF5KGdyb3VwKSkge1xyXG5cdFx0Z3JvdXAgPSB7XHJcblx0XHRcdGNoaWxkcmVuOiBncm91cFxyXG5cdFx0fTtcclxuXHR9XHJcblxyXG5cdC8vIGdldCBvciBjcmVhdGUgdGhlIG5hbWUgbWFwcGluZ1xyXG5cdHZhciBtYXBwZWQgPSB7fTtcclxuXHJcblx0Zm9yKGxldCBub2RlIG9mIGdyb3VwLmdyb3VwKSB7XHJcblx0XHQvLyBjb3B5IG92ZXIgcHJvcGVydGllcyBmcm9tIHRoZSBncm91cFxyXG5cdFx0bm9kZS5wYXJlbnQgfHwgKG5vZGUucGFyZW50ID0gZ3JvdXAucGFyZW50KTtcclxuXHRcdG5vZGUuZGlzcCB8fCAobm9kZS5kaXNwID0gZ3JvdXAuZGlzcCk7XHJcblx0XHRub2RlLm1hcHBlZCA9IG1hcHBlZDtcclxuXHJcblx0XHQvLyBtYWtlIHRoZSBkb21cclxuXHRcdG1ha2Uobm9kZSk7XHJcblx0fVxyXG5cclxuXHQvLyBjYWxsIHRoZSBjYWxsYmFjayB3aXRoIHRoZSBtYXBwZWQgbmFtZXNcclxuXHRpZihncm91cC5iaW5kKSB7XHJcblx0XHR2YXIgc3Vic2NyaXB0aW9uID0gZ3JvdXAuYmluZChtYXBwZWQpO1xyXG5cclxuXHRcdC8vIGlmIHRoZSByZXR1cm4gYSBzdWJzY3JpcHRpb24gYXR0YWNoIGl0IHRvIHRoZSBkaXNwb3NhYmxlXHJcblx0XHRpZihzdWJzY3JpcHRpb24gJiYgZ3JvdXAuZGlzcCkge1xyXG5cdFx0XHRncm91cC5kaXNwLmFkZChzdWJzY3JpcHRpb24pO1xyXG5cdFx0fVxyXG5cdH1cclxuXHJcblx0cmV0dXJuIG1hcHBlZDtcclxufTtcclxuXHJcbi8vIGEgY29sbGVjdGlvbiBvZiB3aWRnZXRzXHJcbnZhciB3aWRnZXRzID0ge307XHJcblxyXG5leHBvcnQgZGVmYXVsdCBmdW5jdGlvbiBtYWtlKG9wdHMpIHtcclxuXHQvLyBoYW5kbGUgYSBncm91cFxyXG5cdGlmKEFycmF5LmlzQXJyYXkob3B0cykgfHwgb3B0cy5ncm91cCkge1xyXG5cdFx0cmV0dXJuIG1ha2VHcm91cChvcHRzKTtcclxuXHR9XHJcblx0Ly8gbWFrZSBhIHdpZGdldFxyXG5cdGVsc2UgaWYob3B0cy53aWRnZXQpIHtcclxuXHRcdHZhciB3aWRnZXQgPSB3aWRnZXRzW29wdHMud2lkZ2V0XTtcclxuXHJcblx0XHQvLyBub3QgZGVmaW5lZFxyXG5cdFx0aWYoIXdpZGdldCkge1xyXG5cdFx0XHR0aHJvdyBuZXcgRXJyb3IoYFdpZGdldCAnJHtvcHRzLndpZGdldH0nIGlzIG5vdCBkZWZpbmVkIG1ha2Ugc3VyZSBpdHMgYmVlbiBpbXBvcnRlZGApO1xyXG5cdFx0fVxyXG5cclxuXHRcdC8vIGdlbmVyYXRlIHRoZSB3aWRnZXQgY29udGVudFxyXG5cdFx0dmFyIGJ1aWx0ID0gd2lkZ2V0Lm1ha2Uob3B0cyk7XHJcblxyXG5cdFx0cmV0dXJuIG1ha2VHcm91cCh7XHJcblx0XHRcdHBhcmVudDogb3B0cy5wYXJlbnQsXHJcblx0XHRcdGRpc3A6IG9wdHMuZGlzcCxcclxuXHRcdFx0Z3JvdXA6IEFycmF5LmlzQXJyYXkoYnVpbHQpID8gYnVpbHQgOiBbYnVpbHRdLFxyXG5cdFx0XHRiaW5kOiB3aWRnZXQuYmluZCAmJiB3aWRnZXQuYmluZC5iaW5kKHdpZGdldCwgb3B0cylcclxuXHRcdH0pO1xyXG5cdH1cclxuXHQvLyBtYWtlIGEgc2luZ2xlIG5vZGVcclxuXHRlbHNlIHtcclxuXHRcdHJldHVybiBtYWtlRG9tKG9wdHMpO1xyXG5cdH1cclxufTtcclxuXHJcbi8vIHJlZ2lzdGVyIGEgd2lkZ2V0XHJcbm1ha2UucmVnaXN0ZXIgPSBmdW5jdGlvbihuYW1lLCB3aWRnZXQpIHtcclxuXHR3aWRnZXRzW25hbWVdID0gd2lkZ2V0O1xyXG59O1xyXG4iLCIvKipcclxuICogS2VlcCBhIGxpc3Qgb2Ygc3Vic2NyaXB0aW9ucyB0byB1bnN1YnNjcmliZSBmcm9tIHRvZ2V0aGVyXHJcbiAqL1xyXG5cclxuZXhwb3J0IGRlZmF1bHQgY2xhc3MgRGlzcG9zYWJsZSB7XHJcblx0Y29uc3RydWN0b3IoKSB7XHJcblx0XHR0aGlzLl9zdWJzY3JpcHRpb25zID0gW107XHJcblx0fVxyXG5cclxuXHQvLyBVbnN1YnNjcmliZSBmcm9tIGFsbCBzdWJzY3JpcHRpb25zXHJcblx0ZGlzcG9zZSgpIHtcclxuXHRcdC8vIHJlbW92ZSB0aGUgZmlyc3Qgc3Vic2NyaXB0aW9uIHVudGlsIHRoZXJlIGFyZSBub25lIGxlZnRcclxuXHRcdHdoaWxlKHRoaXMuX3N1YnNjcmlwdGlvbnMubGVuZ3RoID4gMCkge1xyXG5cdFx0XHR0aGlzLl9zdWJzY3JpcHRpb25zLnNoaWZ0KCkudW5zdWJzY3JpYmUoKTtcclxuXHRcdH1cclxuXHR9XHJcblxyXG5cdC8vIEFkZCBhIHN1YnNjcmlwdGlvbiB0byB0aGUgZGlzcG9zYWJsZVxyXG5cdGFkZChzdWJzY3JpcHRpb24pIHtcclxuXHRcdC8vIGNvcHkgdGhlIGRpc3Bvc2FibGVcclxuXHRcdGlmKHN1YnNjcmlwdGlvbiBpbnN0YW5jZW9mIERpc3Bvc2FibGUpIHtcclxuXHRcdFx0Ly8gY29weSB0aGUgc3Vic2NyaXB0aW9ucyBmcm9tIHRoZSBkaXNwb3NhYmxlXHJcblx0XHRcdHRoaXMuX3N1YnNjcmlwdGlvbnMgPSB0aGlzLl9zdWJzY3JpcHRpb25zLmNvbmNhdChzdWJzY3JpcHRpb24uX3N1YnNjcmlwdGlvbnMpO1xyXG5cclxuXHRcdFx0Ly8gcmVtb3ZlIHRoZSByZWZyZW5jZXMgZnJvbSB0aGUgZGlzcG9zYWJsZVxyXG5cdFx0XHRzdWJzY3JpcHRpb24uX3N1YnNjcmlwdGlvbnMgPSBbXTtcclxuXHRcdH1cclxuXHRcdC8vIGFkZCBhIHN1YnNjcmlwdGlvblxyXG5cdFx0ZWxzZSB7XHJcblx0XHRcdHRoaXMuX3N1YnNjcmlwdGlvbnMucHVzaChzdWJzY3JpcHRpb24pO1xyXG5cdFx0fVxyXG5cdH1cclxuXHJcblx0Ly8gZGlzcG9zZSB3aGVuIGFuIGV2ZW50IGlzIGZpcmVkXHJcblx0ZGlzcG9zZU9uKGVtaXR0ZXIsIGV2ZW50KSB7XHJcblx0XHR0aGlzLmFkZChlbWl0dGVyLm9uKGV2ZW50LCAoKSA9PiB0aGlzLmRpc3Bvc2UoKSkpO1xyXG5cdH1cclxufTtcclxuIiwiLyoqXHJcbiAqIEEgYmFzaWMgZXZlbnQgZW1pdHRlclxyXG4gKi9cclxuXHJcbmV4cG9ydCBkZWZhdWx0IGNsYXNzIEV2ZW50RW1pdHRlciB7XHJcblx0Y29uc3RydWN0b3IoKSB7XHJcblx0XHR0aGlzLl9saXN0ZW5lcnMgPSB7fTtcclxuXHR9XHJcblxyXG5cdC8qKlxyXG5cdCAqIEFkZCBhbiBldmVudCBsaXN0ZW5lclxyXG5cdCAqL1xyXG5cdG9uKG5hbWUsIGxpc3RlbmVyKSB7XHJcblx0XHQvLyBpZiB3ZSBkb24ndCBoYXZlIGFuIGV4aXN0aW5nIGxpc3RlbmVycyBhcnJheSBjcmVhdGUgb25lXHJcblx0XHRpZighdGhpcy5fbGlzdGVuZXJzW25hbWVdKSB7XHJcblx0XHRcdHRoaXMuX2xpc3RlbmVyc1tuYW1lXSA9IFtdO1xyXG5cdFx0fVxyXG5cclxuXHRcdC8vIGFkZCB0aGUgbGlzdGVuZXJcclxuXHRcdHRoaXMuX2xpc3RlbmVyc1tuYW1lXS5wdXNoKGxpc3RlbmVyKTtcclxuXHJcblx0XHQvLyBnaXZlIHRoZW0gYSBzdWJzY3JpcHRpb25cclxuXHRcdHJldHVybiB7XHJcblx0XHRcdF9saXN0ZW5lcjogbGlzdGVuZXIsXHJcblxyXG5cdFx0XHR1bnN1YnNjcmliZTogKCkgPT4ge1xyXG5cdFx0XHRcdC8vIGZpbmQgdGhlIGxpc3RlbmVyXHJcblx0XHRcdFx0dmFyIGluZGV4ID0gdGhpcy5fbGlzdGVuZXJzW25hbWVdLmluZGV4T2YobGlzdGVuZXIpO1xyXG5cclxuXHRcdFx0XHRpZihpbmRleCAhPT0gLTEpIHtcclxuXHRcdFx0XHRcdHRoaXMuX2xpc3RlbmVyc1tuYW1lXS5zcGxpY2UoaW5kZXgsIDEpO1xyXG5cdFx0XHRcdH1cclxuXHRcdFx0fVxyXG5cdFx0fTtcclxuXHR9XHJcblxyXG5cdC8qKlxyXG5cdCAqIEVtaXQgYW4gZXZlbnRcclxuXHQgKi9cclxuXHRlbWl0KG5hbWUsIC4uLmFyZ3MpIHtcclxuXHRcdC8vIGNoZWNrIGZvciBsaXN0ZW5lcnNcclxuXHRcdGlmKHRoaXMuX2xpc3RlbmVyc1tuYW1lXSkge1xyXG5cdFx0XHRmb3IobGV0IGxpc3RlbmVyIG9mIHRoaXMuX2xpc3RlbmVyc1tuYW1lXSkge1xyXG5cdFx0XHRcdC8vIGNhbGwgdGhlIGxpc3RlbmVyc1xyXG5cdFx0XHRcdGxpc3RlbmVyKC4uLmFyZ3MpO1xyXG5cdFx0XHR9XHJcblx0XHR9XHJcblx0fVxyXG5cclxuXHQvKipcclxuXHQgKiBFbWl0IGFuIGV2ZW50IGFuZCBza2lwIHNvbWUgbGlzdGVuZXJzXHJcblx0ICovXHJcblx0cGFydGlhbEVtaXQobmFtZSwgc2tpcHMgPSBbXSwgLi4uYXJncykge1xyXG5cdFx0Ly8gYWxsb3cgYSBzaW5nbGUgaXRlbVxyXG5cdFx0aWYoIUFycmF5LmlzQXJyYXkoc2tpcHMpKSB7XHJcblx0XHRcdHNraXBzID0gW3NraXBzXTtcclxuXHRcdH1cclxuXHJcblx0XHQvLyBjaGVjayBmb3IgbGlzdGVuZXJzXHJcblx0XHRpZih0aGlzLl9saXN0ZW5lcnNbbmFtZV0pIHtcclxuXHRcdFx0Zm9yKGxldCBsaXN0ZW5lciBvZiB0aGlzLl9saXN0ZW5lcnNbbmFtZV0pIHtcclxuXHRcdFx0XHQvLyB0aGlzIGV2ZW50IGxpc3RlbmVyIGlzIGJlaW5nIHNraXBlZFxyXG5cdFx0XHRcdGlmKHNraXBzLmZpbmQoc2tpcCA9PiBza2lwLl9saXN0ZW5lciA9PSBsaXN0ZW5lcikpIHtcclxuXHRcdFx0XHRcdGNvbnRpbnVlO1xyXG5cdFx0XHRcdH1cclxuXHJcblx0XHRcdFx0Ly8gY2FsbCB0aGUgbGlzdGVuZXJzXHJcblx0XHRcdFx0bGlzdGVuZXIoLi4uYXJncyk7XHJcblx0XHRcdH1cclxuXHRcdH1cclxuXHR9XHJcbn1cclxuIiwiLyoqXHJcbiAqIENyZWF0ZSBhIGdsb2JhbCBvYmplY3Qgd2l0aCBjb21tb25seSB1c2VkIG1vZHVsZXMgdG8gYXZvaWQgNTAgbWlsbGlvbiByZXF1aXJlc1xyXG4gKi9cclxuXHJcbmltcG9ydCBFdmVudEVtaXR0ZXIgZnJvbSBcIi4vZXZlbnQtZW1pdHRlclwiO1xyXG5cclxudmFyIGxpZmVMaW5lID0gbmV3IEV2ZW50RW1pdHRlcigpO1xyXG5cclxuLy8gcGxhdGZvcm0gZGV0ZWN0aW9uXHJcbmxpZmVMaW5lLm5vZGUgPSB0eXBlb2YgcHJvY2VzcyA9PSBcIm9iamVjdFwiO1xyXG5saWZlTGluZS5icm93c2VyID0gdHlwZW9mIHdpbmRvdyA9PSBcIm9iamVjdFwiO1xyXG5cclxuLy8gYXR0YWNoIHV0aWxzXHJcbmxpZmVMaW5lLkRpc3Bvc2FibGUgPSByZXF1aXJlKFwiLi9kaXNwb3NhYmxlXCIpLmRlZmF1bHQ7XHJcbmxpZmVMaW5lLkV2ZW50RW1pdHRlciA9IEV2ZW50RW1pdHRlcjtcclxuXHJcbi8vIGF0dGFjaCBsaWZlbGluZSB0byB0aGUgZ2xvYmFsIG9iamVjdFxyXG4obGlmZUxpbmUubm9kZSA/IGdsb2JhbCA6IGJyb3dzZXIpLmxpZmVMaW5lID0gbGlmZUxpbmU7XHJcbiJdfQ==
