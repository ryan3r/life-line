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

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

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
var store = exports.store = function (name) {
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

},{"./syncer":6,"./util/dom-maker":7}],5:[function(require,module,exports){
"use strict";

var _slicedToArray = function () { function sliceIterator(arr, i) { var _arr = []; var _n = true; var _d = false; var _e = undefined; try { for (var _i = arr[Symbol.iterator](), _s; !(_n = (_s = _i.next()).done); _n = true) { _arr.push(_s.value); if (i && _arr.length === i) break; } } catch (err) { _d = true; _e = err; } finally { try { if (!_n && _i["return"]) _i["return"](); } finally { if (_d) throw _e; } } return _arr; } return function (arr, i) { if (Array.isArray(arr)) { return arr; } else if (Symbol.iterator in Object(arr)) { return sliceIterator(arr, i); } else { throw new TypeError("Invalid attempt to destructure non-iterable instance"); } }; }();

// create the global object
require("../common/global");
require("./global");

var _require = require("./data-store"),
    store = _require.store;

var syncStore = store("sync-store");

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

					promises.push(syncStore.set({
						id: "version",
						value: version
					}));
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

function _toArray(arr) { return Array.isArray(arr) ? arr : Array.from(arr); }

/**
 * Syncronize this client with the server
 */

var dataStore = require("./data-store").store;

var syncStore = dataStore("sync-store");

var STORES = ["assignments"];

// create the global syncer refrence
var syncer = module.exports = new lifeLine.EventEmitter();

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
		promises.push(dataStore(storeName).getAll().then(function (items) {
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

			// delete the local copy
			if (result.code == "item-deleted") {
				var store = dataStore(result.store);

				return store.remove(result.id, syncSubs);
			}
			// save the newer version from the server
			else if (result.code == "newer-version") {
					var _store = dataStore(result.store);

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

},{}],8:[function(require,module,exports){
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

},{}],9:[function(require,module,exports){
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

},{}],10:[function(require,module,exports){
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

},{"./data-stores/key-value-store":8,"./data-stores/mem-adaptor":9,"./util/disposable":11,"./util/event-emitter":12,"_process":2}],11:[function(require,module,exports){
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

},{}],12:[function(require,module,exports){
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

},{}]},{},[5])
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCJub2RlX21vZHVsZXMvaWRiL2xpYi9pZGIuanMiLCJub2RlX21vZHVsZXMvcHJvY2Vzcy9icm93c2VyLmpzIiwic3JjXFxjbGllbnRcXGRhdGEtc3RvcmUuanMiLCJzcmNcXGNsaWVudFxcZ2xvYmFsLmpzIiwic3JjXFxjbGllbnRcXHN3LWluZGV4LmpzIiwic3JjXFxjbGllbnRcXHN5bmNlci5qcyIsInNyY1xcY2xpZW50XFx1dGlsXFxkb20tbWFrZXIuanMiLCJzcmNcXGNvbW1vblxcZGF0YS1zdG9yZXNcXGtleS12YWx1ZS1zdG9yZS5qcyIsInNyY1xcY29tbW9uXFxkYXRhLXN0b3Jlc1xcbWVtLWFkYXB0b3IuanMiLCJzcmNcXGNvbW1vblxcc3JjXFxjb21tb25cXGdsb2JhbC5qcyIsInNyY1xcY29tbW9uXFx1dGlsXFxkaXNwb3NhYmxlLmpzIiwic3JjXFxjb21tb25cXHV0aWxcXGV2ZW50LWVtaXR0ZXIuanMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7QUNBQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3RUQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7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QUFBQSx1QkFBbkMsUUFBbUM7O0FBQUEsK0JBR3pDO0FBS0Q7QUFUd0I7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQVV6QjtBQUNEOzs7Ozs7QUFHRixPQUFPLE9BQVAsR0FBaUIsWUFBakIiLCJmaWxlIjoiZ2VuZXJhdGVkLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXNDb250ZW50IjpbIihmdW5jdGlvbiBlKHQsbixyKXtmdW5jdGlvbiBzKG8sdSl7aWYoIW5bb10pe2lmKCF0W29dKXt2YXIgYT10eXBlb2YgcmVxdWlyZT09XCJmdW5jdGlvblwiJiZyZXF1aXJlO2lmKCF1JiZhKXJldHVybiBhKG8sITApO2lmKGkpcmV0dXJuIGkobywhMCk7dmFyIGY9bmV3IEVycm9yKFwiQ2Fubm90IGZpbmQgbW9kdWxlICdcIitvK1wiJ1wiKTt0aHJvdyBmLmNvZGU9XCJNT0RVTEVfTk9UX0ZPVU5EXCIsZn12YXIgbD1uW29dPXtleHBvcnRzOnt9fTt0W29dWzBdLmNhbGwobC5leHBvcnRzLGZ1bmN0aW9uKGUpe3ZhciBuPXRbb11bMV1bZV07cmV0dXJuIHMobj9uOmUpfSxsLGwuZXhwb3J0cyxlLHQsbixyKX1yZXR1cm4gbltvXS5leHBvcnRzfXZhciBpPXR5cGVvZiByZXF1aXJlPT1cImZ1bmN0aW9uXCImJnJlcXVpcmU7Zm9yKHZhciBvPTA7bzxyLmxlbmd0aDtvKyspcyhyW29dKTtyZXR1cm4gc30pIiwiJ3VzZSBzdHJpY3QnO1xuXG4oZnVuY3Rpb24oKSB7XG4gIGZ1bmN0aW9uIHRvQXJyYXkoYXJyKSB7XG4gICAgcmV0dXJuIEFycmF5LnByb3RvdHlwZS5zbGljZS5jYWxsKGFycik7XG4gIH1cblxuICBmdW5jdGlvbiBwcm9taXNpZnlSZXF1ZXN0KHJlcXVlc3QpIHtcbiAgICByZXR1cm4gbmV3IFByb21pc2UoZnVuY3Rpb24ocmVzb2x2ZSwgcmVqZWN0KSB7XG4gICAgICByZXF1ZXN0Lm9uc3VjY2VzcyA9IGZ1bmN0aW9uKCkge1xuICAgICAgICByZXNvbHZlKHJlcXVlc3QucmVzdWx0KTtcbiAgICAgIH07XG5cbiAgICAgIHJlcXVlc3Qub25lcnJvciA9IGZ1bmN0aW9uKCkge1xuICAgICAgICByZWplY3QocmVxdWVzdC5lcnJvcik7XG4gICAgICB9O1xuICAgIH0pO1xuICB9XG5cbiAgZnVuY3Rpb24gcHJvbWlzaWZ5UmVxdWVzdENhbGwob2JqLCBtZXRob2QsIGFyZ3MpIHtcbiAgICB2YXIgcmVxdWVzdDtcbiAgICB2YXIgcCA9IG5ldyBQcm9taXNlKGZ1bmN0aW9uKHJlc29sdmUsIHJlamVjdCkge1xuICAgICAgcmVxdWVzdCA9IG9ialttZXRob2RdLmFwcGx5KG9iaiwgYXJncyk7XG4gICAgICBwcm9taXNpZnlSZXF1ZXN0KHJlcXVlc3QpLnRoZW4ocmVzb2x2ZSwgcmVqZWN0KTtcbiAgICB9KTtcblxuICAgIHAucmVxdWVzdCA9IHJlcXVlc3Q7XG4gICAgcmV0dXJuIHA7XG4gIH1cblxuICBmdW5jdGlvbiBwcm9taXNpZnlDdXJzb3JSZXF1ZXN0Q2FsbChvYmosIG1ldGhvZCwgYXJncykge1xuICAgIHZhciBwID0gcHJvbWlzaWZ5UmVxdWVzdENhbGwob2JqLCBtZXRob2QsIGFyZ3MpO1xuICAgIHJldHVybiBwLnRoZW4oZnVuY3Rpb24odmFsdWUpIHtcbiAgICAgIGlmICghdmFsdWUpIHJldHVybjtcbiAgICAgIHJldHVybiBuZXcgQ3Vyc29yKHZhbHVlLCBwLnJlcXVlc3QpO1xuICAgIH0pO1xuICB9XG5cbiAgZnVuY3Rpb24gcHJveHlQcm9wZXJ0aWVzKFByb3h5Q2xhc3MsIHRhcmdldFByb3AsIHByb3BlcnRpZXMpIHtcbiAgICBwcm9wZXJ0aWVzLmZvckVhY2goZnVuY3Rpb24ocHJvcCkge1xuICAgICAgT2JqZWN0LmRlZmluZVByb3BlcnR5KFByb3h5Q2xhc3MucHJvdG90eXBlLCBwcm9wLCB7XG4gICAgICAgIGdldDogZnVuY3Rpb24oKSB7XG4gICAgICAgICAgcmV0dXJuIHRoaXNbdGFyZ2V0UHJvcF1bcHJvcF07XG4gICAgICAgIH0sXG4gICAgICAgIHNldDogZnVuY3Rpb24odmFsKSB7XG4gICAgICAgICAgdGhpc1t0YXJnZXRQcm9wXVtwcm9wXSA9IHZhbDtcbiAgICAgICAgfVxuICAgICAgfSk7XG4gICAgfSk7XG4gIH1cblxuICBmdW5jdGlvbiBwcm94eVJlcXVlc3RNZXRob2RzKFByb3h5Q2xhc3MsIHRhcmdldFByb3AsIENvbnN0cnVjdG9yLCBwcm9wZXJ0aWVzKSB7XG4gICAgcHJvcGVydGllcy5mb3JFYWNoKGZ1bmN0aW9uKHByb3ApIHtcbiAgICAgIGlmICghKHByb3AgaW4gQ29uc3RydWN0b3IucHJvdG90eXBlKSkgcmV0dXJuO1xuICAgICAgUHJveHlDbGFzcy5wcm90b3R5cGVbcHJvcF0gPSBmdW5jdGlvbigpIHtcbiAgICAgICAgcmV0dXJuIHByb21pc2lmeVJlcXVlc3RDYWxsKHRoaXNbdGFyZ2V0UHJvcF0sIHByb3AsIGFyZ3VtZW50cyk7XG4gICAgICB9O1xuICAgIH0pO1xuICB9XG5cbiAgZnVuY3Rpb24gcHJveHlNZXRob2RzKFByb3h5Q2xhc3MsIHRhcmdldFByb3AsIENvbnN0cnVjdG9yLCBwcm9wZXJ0aWVzKSB7XG4gICAgcHJvcGVydGllcy5mb3JFYWNoKGZ1bmN0aW9uKHByb3ApIHtcbiAgICAgIGlmICghKHByb3AgaW4gQ29uc3RydWN0b3IucHJvdG90eXBlKSkgcmV0dXJuO1xuICAgICAgUHJveHlDbGFzcy5wcm90b3R5cGVbcHJvcF0gPSBmdW5jdGlvbigpIHtcbiAgICAgICAgcmV0dXJuIHRoaXNbdGFyZ2V0UHJvcF1bcHJvcF0uYXBwbHkodGhpc1t0YXJnZXRQcm9wXSwgYXJndW1lbnRzKTtcbiAgICAgIH07XG4gICAgfSk7XG4gIH1cblxuICBmdW5jdGlvbiBwcm94eUN1cnNvclJlcXVlc3RNZXRob2RzKFByb3h5Q2xhc3MsIHRhcmdldFByb3AsIENvbnN0cnVjdG9yLCBwcm9wZXJ0aWVzKSB7XG4gICAgcHJvcGVydGllcy5mb3JFYWNoKGZ1bmN0aW9uKHByb3ApIHtcbiAgICAgIGlmICghKHByb3AgaW4gQ29uc3RydWN0b3IucHJvdG90eXBlKSkgcmV0dXJuO1xuICAgICAgUHJveHlDbGFzcy5wcm90b3R5cGVbcHJvcF0gPSBmdW5jdGlvbigpIHtcbiAgICAgICAgcmV0dXJuIHByb21pc2lmeUN1cnNvclJlcXVlc3RDYWxsKHRoaXNbdGFyZ2V0UHJvcF0sIHByb3AsIGFyZ3VtZW50cyk7XG4gICAgICB9O1xuICAgIH0pO1xuICB9XG5cbiAgZnVuY3Rpb24gSW5kZXgoaW5kZXgpIHtcbiAgICB0aGlzLl9pbmRleCA9IGluZGV4O1xuICB9XG5cbiAgcHJveHlQcm9wZXJ0aWVzKEluZGV4LCAnX2luZGV4JywgW1xuICAgICduYW1lJyxcbiAgICAna2V5UGF0aCcsXG4gICAgJ211bHRpRW50cnknLFxuICAgICd1bmlxdWUnXG4gIF0pO1xuXG4gIHByb3h5UmVxdWVzdE1ldGhvZHMoSW5kZXgsICdfaW5kZXgnLCBJREJJbmRleCwgW1xuICAgICdnZXQnLFxuICAgICdnZXRLZXknLFxuICAgICdnZXRBbGwnLFxuICAgICdnZXRBbGxLZXlzJyxcbiAgICAnY291bnQnXG4gIF0pO1xuXG4gIHByb3h5Q3Vyc29yUmVxdWVzdE1ldGhvZHMoSW5kZXgsICdfaW5kZXgnLCBJREJJbmRleCwgW1xuICAgICdvcGVuQ3Vyc29yJyxcbiAgICAnb3BlbktleUN1cnNvcidcbiAgXSk7XG5cbiAgZnVuY3Rpb24gQ3Vyc29yKGN1cnNvciwgcmVxdWVzdCkge1xuICAgIHRoaXMuX2N1cnNvciA9IGN1cnNvcjtcbiAgICB0aGlzLl9yZXF1ZXN0ID0gcmVxdWVzdDtcbiAgfVxuXG4gIHByb3h5UHJvcGVydGllcyhDdXJzb3IsICdfY3Vyc29yJywgW1xuICAgICdkaXJlY3Rpb24nLFxuICAgICdrZXknLFxuICAgICdwcmltYXJ5S2V5JyxcbiAgICAndmFsdWUnXG4gIF0pO1xuXG4gIHByb3h5UmVxdWVzdE1ldGhvZHMoQ3Vyc29yLCAnX2N1cnNvcicsIElEQkN1cnNvciwgW1xuICAgICd1cGRhdGUnLFxuICAgICdkZWxldGUnXG4gIF0pO1xuXG4gIC8vIHByb3h5ICduZXh0JyBtZXRob2RzXG4gIFsnYWR2YW5jZScsICdjb250aW51ZScsICdjb250aW51ZVByaW1hcnlLZXknXS5mb3JFYWNoKGZ1bmN0aW9uKG1ldGhvZE5hbWUpIHtcbiAgICBpZiAoIShtZXRob2ROYW1lIGluIElEQkN1cnNvci5wcm90b3R5cGUpKSByZXR1cm47XG4gICAgQ3Vyc29yLnByb3RvdHlwZVttZXRob2ROYW1lXSA9IGZ1bmN0aW9uKCkge1xuICAgICAgdmFyIGN1cnNvciA9IHRoaXM7XG4gICAgICB2YXIgYXJncyA9IGFyZ3VtZW50cztcbiAgICAgIHJldHVybiBQcm9taXNlLnJlc29sdmUoKS50aGVuKGZ1bmN0aW9uKCkge1xuICAgICAgICBjdXJzb3IuX2N1cnNvclttZXRob2ROYW1lXS5hcHBseShjdXJzb3IuX2N1cnNvciwgYXJncyk7XG4gICAgICAgIHJldHVybiBwcm9taXNpZnlSZXF1ZXN0KGN1cnNvci5fcmVxdWVzdCkudGhlbihmdW5jdGlvbih2YWx1ZSkge1xuICAgICAgICAgIGlmICghdmFsdWUpIHJldHVybjtcbiAgICAgICAgICByZXR1cm4gbmV3IEN1cnNvcih2YWx1ZSwgY3Vyc29yLl9yZXF1ZXN0KTtcbiAgICAgICAgfSk7XG4gICAgICB9KTtcbiAgICB9O1xuICB9KTtcblxuICBmdW5jdGlvbiBPYmplY3RTdG9yZShzdG9yZSkge1xuICAgIHRoaXMuX3N0b3JlID0gc3RvcmU7XG4gIH1cblxuICBPYmplY3RTdG9yZS5wcm90b3R5cGUuY3JlYXRlSW5kZXggPSBmdW5jdGlvbigpIHtcbiAgICByZXR1cm4gbmV3IEluZGV4KHRoaXMuX3N0b3JlLmNyZWF0ZUluZGV4LmFwcGx5KHRoaXMuX3N0b3JlLCBhcmd1bWVudHMpKTtcbiAgfTtcblxuICBPYmplY3RTdG9yZS5wcm90b3R5cGUuaW5kZXggPSBmdW5jdGlvbigpIHtcbiAgICByZXR1cm4gbmV3IEluZGV4KHRoaXMuX3N0b3JlLmluZGV4LmFwcGx5KHRoaXMuX3N0b3JlLCBhcmd1bWVudHMpKTtcbiAgfTtcblxuICBwcm94eVByb3BlcnRpZXMoT2JqZWN0U3RvcmUsICdfc3RvcmUnLCBbXG4gICAgJ25hbWUnLFxuICAgICdrZXlQYXRoJyxcbiAgICAnaW5kZXhOYW1lcycsXG4gICAgJ2F1dG9JbmNyZW1lbnQnXG4gIF0pO1xuXG4gIHByb3h5UmVxdWVzdE1ldGhvZHMoT2JqZWN0U3RvcmUsICdfc3RvcmUnLCBJREJPYmplY3RTdG9yZSwgW1xuICAgICdwdXQnLFxuICAgICdhZGQnLFxuICAgICdkZWxldGUnLFxuICAgICdjbGVhcicsXG4gICAgJ2dldCcsXG4gICAgJ2dldEFsbCcsXG4gICAgJ2dldEtleScsXG4gICAgJ2dldEFsbEtleXMnLFxuICAgICdjb3VudCdcbiAgXSk7XG5cbiAgcHJveHlDdXJzb3JSZXF1ZXN0TWV0aG9kcyhPYmplY3RTdG9yZSwgJ19zdG9yZScsIElEQk9iamVjdFN0b3JlLCBbXG4gICAgJ29wZW5DdXJzb3InLFxuICAgICdvcGVuS2V5Q3Vyc29yJ1xuICBdKTtcblxuICBwcm94eU1ldGhvZHMoT2JqZWN0U3RvcmUsICdfc3RvcmUnLCBJREJPYmplY3RTdG9yZSwgW1xuICAgICdkZWxldGVJbmRleCdcbiAgXSk7XG5cbiAgZnVuY3Rpb24gVHJhbnNhY3Rpb24oaWRiVHJhbnNhY3Rpb24pIHtcbiAgICB0aGlzLl90eCA9IGlkYlRyYW5zYWN0aW9uO1xuICAgIHRoaXMuY29tcGxldGUgPSBuZXcgUHJvbWlzZShmdW5jdGlvbihyZXNvbHZlLCByZWplY3QpIHtcbiAgICAgIGlkYlRyYW5zYWN0aW9uLm9uY29tcGxldGUgPSBmdW5jdGlvbigpIHtcbiAgICAgICAgcmVzb2x2ZSgpO1xuICAgICAgfTtcbiAgICAgIGlkYlRyYW5zYWN0aW9uLm9uZXJyb3IgPSBmdW5jdGlvbigpIHtcbiAgICAgICAgcmVqZWN0KGlkYlRyYW5zYWN0aW9uLmVycm9yKTtcbiAgICAgIH07XG4gICAgICBpZGJUcmFuc2FjdGlvbi5vbmFib3J0ID0gZnVuY3Rpb24oKSB7XG4gICAgICAgIHJlamVjdChpZGJUcmFuc2FjdGlvbi5lcnJvcik7XG4gICAgICB9O1xuICAgIH0pO1xuICB9XG5cbiAgVHJhbnNhY3Rpb24ucHJvdG90eXBlLm9iamVjdFN0b3JlID0gZnVuY3Rpb24oKSB7XG4gICAgcmV0dXJuIG5ldyBPYmplY3RTdG9yZSh0aGlzLl90eC5vYmplY3RTdG9yZS5hcHBseSh0aGlzLl90eCwgYXJndW1lbnRzKSk7XG4gIH07XG5cbiAgcHJveHlQcm9wZXJ0aWVzKFRyYW5zYWN0aW9uLCAnX3R4JywgW1xuICAgICdvYmplY3RTdG9yZU5hbWVzJyxcbiAgICAnbW9kZSdcbiAgXSk7XG5cbiAgcHJveHlNZXRob2RzKFRyYW5zYWN0aW9uLCAnX3R4JywgSURCVHJhbnNhY3Rpb24sIFtcbiAgICAnYWJvcnQnXG4gIF0pO1xuXG4gIGZ1bmN0aW9uIFVwZ3JhZGVEQihkYiwgb2xkVmVyc2lvbiwgdHJhbnNhY3Rpb24pIHtcbiAgICB0aGlzLl9kYiA9IGRiO1xuICAgIHRoaXMub2xkVmVyc2lvbiA9IG9sZFZlcnNpb247XG4gICAgdGhpcy50cmFuc2FjdGlvbiA9IG5ldyBUcmFuc2FjdGlvbih0cmFuc2FjdGlvbik7XG4gIH1cblxuICBVcGdyYWRlREIucHJvdG90eXBlLmNyZWF0ZU9iamVjdFN0b3JlID0gZnVuY3Rpb24oKSB7XG4gICAgcmV0dXJuIG5ldyBPYmplY3RTdG9yZSh0aGlzLl9kYi5jcmVhdGVPYmplY3RTdG9yZS5hcHBseSh0aGlzLl9kYiwgYXJndW1lbnRzKSk7XG4gIH07XG5cbiAgcHJveHlQcm9wZXJ0aWVzKFVwZ3JhZGVEQiwgJ19kYicsIFtcbiAgICAnbmFtZScsXG4gICAgJ3ZlcnNpb24nLFxuICAgICdvYmplY3RTdG9yZU5hbWVzJ1xuICBdKTtcblxuICBwcm94eU1ldGhvZHMoVXBncmFkZURCLCAnX2RiJywgSURCRGF0YWJhc2UsIFtcbiAgICAnZGVsZXRlT2JqZWN0U3RvcmUnLFxuICAgICdjbG9zZSdcbiAgXSk7XG5cbiAgZnVuY3Rpb24gREIoZGIpIHtcbiAgICB0aGlzLl9kYiA9IGRiO1xuICB9XG5cbiAgREIucHJvdG90eXBlLnRyYW5zYWN0aW9uID0gZnVuY3Rpb24oKSB7XG4gICAgcmV0dXJuIG5ldyBUcmFuc2FjdGlvbih0aGlzLl9kYi50cmFuc2FjdGlvbi5hcHBseSh0aGlzLl9kYiwgYXJndW1lbnRzKSk7XG4gIH07XG5cbiAgcHJveHlQcm9wZXJ0aWVzKERCLCAnX2RiJywgW1xuICAgICduYW1lJyxcbiAgICAndmVyc2lvbicsXG4gICAgJ29iamVjdFN0b3JlTmFtZXMnXG4gIF0pO1xuXG4gIHByb3h5TWV0aG9kcyhEQiwgJ19kYicsIElEQkRhdGFiYXNlLCBbXG4gICAgJ2Nsb3NlJ1xuICBdKTtcblxuICAvLyBBZGQgY3Vyc29yIGl0ZXJhdG9yc1xuICAvLyBUT0RPOiByZW1vdmUgdGhpcyBvbmNlIGJyb3dzZXJzIGRvIHRoZSByaWdodCB0aGluZyB3aXRoIHByb21pc2VzXG4gIFsnb3BlbkN1cnNvcicsICdvcGVuS2V5Q3Vyc29yJ10uZm9yRWFjaChmdW5jdGlvbihmdW5jTmFtZSkge1xuICAgIFtPYmplY3RTdG9yZSwgSW5kZXhdLmZvckVhY2goZnVuY3Rpb24oQ29uc3RydWN0b3IpIHtcbiAgICAgIENvbnN0cnVjdG9yLnByb3RvdHlwZVtmdW5jTmFtZS5yZXBsYWNlKCdvcGVuJywgJ2l0ZXJhdGUnKV0gPSBmdW5jdGlvbigpIHtcbiAgICAgICAgdmFyIGFyZ3MgPSB0b0FycmF5KGFyZ3VtZW50cyk7XG4gICAgICAgIHZhciBjYWxsYmFjayA9IGFyZ3NbYXJncy5sZW5ndGggLSAxXTtcbiAgICAgICAgdmFyIG5hdGl2ZU9iamVjdCA9IHRoaXMuX3N0b3JlIHx8IHRoaXMuX2luZGV4O1xuICAgICAgICB2YXIgcmVxdWVzdCA9IG5hdGl2ZU9iamVjdFtmdW5jTmFtZV0uYXBwbHkobmF0aXZlT2JqZWN0LCBhcmdzLnNsaWNlKDAsIC0xKSk7XG4gICAgICAgIHJlcXVlc3Qub25zdWNjZXNzID0gZnVuY3Rpb24oKSB7XG4gICAgICAgICAgY2FsbGJhY2socmVxdWVzdC5yZXN1bHQpO1xuICAgICAgICB9O1xuICAgICAgfTtcbiAgICB9KTtcbiAgfSk7XG5cbiAgLy8gcG9seWZpbGwgZ2V0QWxsXG4gIFtJbmRleCwgT2JqZWN0U3RvcmVdLmZvckVhY2goZnVuY3Rpb24oQ29uc3RydWN0b3IpIHtcbiAgICBpZiAoQ29uc3RydWN0b3IucHJvdG90eXBlLmdldEFsbCkgcmV0dXJuO1xuICAgIENvbnN0cnVjdG9yLnByb3RvdHlwZS5nZXRBbGwgPSBmdW5jdGlvbihxdWVyeSwgY291bnQpIHtcbiAgICAgIHZhciBpbnN0YW5jZSA9IHRoaXM7XG4gICAgICB2YXIgaXRlbXMgPSBbXTtcblxuICAgICAgcmV0dXJuIG5ldyBQcm9taXNlKGZ1bmN0aW9uKHJlc29sdmUpIHtcbiAgICAgICAgaW5zdGFuY2UuaXRlcmF0ZUN1cnNvcihxdWVyeSwgZnVuY3Rpb24oY3Vyc29yKSB7XG4gICAgICAgICAgaWYgKCFjdXJzb3IpIHtcbiAgICAgICAgICAgIHJlc29sdmUoaXRlbXMpO1xuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICAgIH1cbiAgICAgICAgICBpdGVtcy5wdXNoKGN1cnNvci52YWx1ZSk7XG5cbiAgICAgICAgICBpZiAoY291bnQgIT09IHVuZGVmaW5lZCAmJiBpdGVtcy5sZW5ndGggPT0gY291bnQpIHtcbiAgICAgICAgICAgIHJlc29sdmUoaXRlbXMpO1xuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICAgIH1cbiAgICAgICAgICBjdXJzb3IuY29udGludWUoKTtcbiAgICAgICAgfSk7XG4gICAgICB9KTtcbiAgICB9O1xuICB9KTtcblxuICB2YXIgZXhwID0ge1xuICAgIG9wZW46IGZ1bmN0aW9uKG5hbWUsIHZlcnNpb24sIHVwZ3JhZGVDYWxsYmFjaykge1xuICAgICAgdmFyIHAgPSBwcm9taXNpZnlSZXF1ZXN0Q2FsbChpbmRleGVkREIsICdvcGVuJywgW25hbWUsIHZlcnNpb25dKTtcbiAgICAgIHZhciByZXF1ZXN0ID0gcC5yZXF1ZXN0O1xuXG4gICAgICByZXF1ZXN0Lm9udXBncmFkZW5lZWRlZCA9IGZ1bmN0aW9uKGV2ZW50KSB7XG4gICAgICAgIGlmICh1cGdyYWRlQ2FsbGJhY2spIHtcbiAgICAgICAgICB1cGdyYWRlQ2FsbGJhY2sobmV3IFVwZ3JhZGVEQihyZXF1ZXN0LnJlc3VsdCwgZXZlbnQub2xkVmVyc2lvbiwgcmVxdWVzdC50cmFuc2FjdGlvbikpO1xuICAgICAgICB9XG4gICAgICB9O1xuXG4gICAgICByZXR1cm4gcC50aGVuKGZ1bmN0aW9uKGRiKSB7XG4gICAgICAgIHJldHVybiBuZXcgREIoZGIpO1xuICAgICAgfSk7XG4gICAgfSxcbiAgICBkZWxldGU6IGZ1bmN0aW9uKG5hbWUpIHtcbiAgICAgIHJldHVybiBwcm9taXNpZnlSZXF1ZXN0Q2FsbChpbmRleGVkREIsICdkZWxldGVEYXRhYmFzZScsIFtuYW1lXSk7XG4gICAgfVxuICB9O1xuXG4gIGlmICh0eXBlb2YgbW9kdWxlICE9PSAndW5kZWZpbmVkJykge1xuICAgIG1vZHVsZS5leHBvcnRzID0gZXhwO1xuICB9XG4gIGVsc2Uge1xuICAgIHNlbGYuaWRiID0gZXhwO1xuICB9XG59KCkpO1xuIiwiLy8gc2hpbSBmb3IgdXNpbmcgcHJvY2VzcyBpbiBicm93c2VyXG52YXIgcHJvY2VzcyA9IG1vZHVsZS5leHBvcnRzID0ge307XG5cbi8vIGNhY2hlZCBmcm9tIHdoYXRldmVyIGdsb2JhbCBpcyBwcmVzZW50IHNvIHRoYXQgdGVzdCBydW5uZXJzIHRoYXQgc3R1YiBpdFxuLy8gZG9uJ3QgYnJlYWsgdGhpbmdzLiAgQnV0IHdlIG5lZWQgdG8gd3JhcCBpdCBpbiBhIHRyeSBjYXRjaCBpbiBjYXNlIGl0IGlzXG4vLyB3cmFwcGVkIGluIHN0cmljdCBtb2RlIGNvZGUgd2hpY2ggZG9lc24ndCBkZWZpbmUgYW55IGdsb2JhbHMuICBJdCdzIGluc2lkZSBhXG4vLyBmdW5jdGlvbiBiZWNhdXNlIHRyeS9jYXRjaGVzIGRlb3B0aW1pemUgaW4gY2VydGFpbiBlbmdpbmVzLlxuXG52YXIgY2FjaGVkU2V0VGltZW91dDtcbnZhciBjYWNoZWRDbGVhclRpbWVvdXQ7XG5cbmZ1bmN0aW9uIGRlZmF1bHRTZXRUaW1vdXQoKSB7XG4gICAgdGhyb3cgbmV3IEVycm9yKCdzZXRUaW1lb3V0IGhhcyBub3QgYmVlbiBkZWZpbmVkJyk7XG59XG5mdW5jdGlvbiBkZWZhdWx0Q2xlYXJUaW1lb3V0ICgpIHtcbiAgICB0aHJvdyBuZXcgRXJyb3IoJ2NsZWFyVGltZW91dCBoYXMgbm90IGJlZW4gZGVmaW5lZCcpO1xufVxuKGZ1bmN0aW9uICgpIHtcbiAgICB0cnkge1xuICAgICAgICBpZiAodHlwZW9mIHNldFRpbWVvdXQgPT09ICdmdW5jdGlvbicpIHtcbiAgICAgICAgICAgIGNhY2hlZFNldFRpbWVvdXQgPSBzZXRUaW1lb3V0O1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgY2FjaGVkU2V0VGltZW91dCA9IGRlZmF1bHRTZXRUaW1vdXQ7XG4gICAgICAgIH1cbiAgICB9IGNhdGNoIChlKSB7XG4gICAgICAgIGNhY2hlZFNldFRpbWVvdXQgPSBkZWZhdWx0U2V0VGltb3V0O1xuICAgIH1cbiAgICB0cnkge1xuICAgICAgICBpZiAodHlwZW9mIGNsZWFyVGltZW91dCA9PT0gJ2Z1bmN0aW9uJykge1xuICAgICAgICAgICAgY2FjaGVkQ2xlYXJUaW1lb3V0ID0gY2xlYXJUaW1lb3V0O1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgY2FjaGVkQ2xlYXJUaW1lb3V0ID0gZGVmYXVsdENsZWFyVGltZW91dDtcbiAgICAgICAgfVxuICAgIH0gY2F0Y2ggKGUpIHtcbiAgICAgICAgY2FjaGVkQ2xlYXJUaW1lb3V0ID0gZGVmYXVsdENsZWFyVGltZW91dDtcbiAgICB9XG59ICgpKVxuZnVuY3Rpb24gcnVuVGltZW91dChmdW4pIHtcbiAgICBpZiAoY2FjaGVkU2V0VGltZW91dCA9PT0gc2V0VGltZW91dCkge1xuICAgICAgICAvL25vcm1hbCBlbnZpcm9tZW50cyBpbiBzYW5lIHNpdHVhdGlvbnNcbiAgICAgICAgcmV0dXJuIHNldFRpbWVvdXQoZnVuLCAwKTtcbiAgICB9XG4gICAgLy8gaWYgc2V0VGltZW91dCB3YXNuJ3QgYXZhaWxhYmxlIGJ1dCB3YXMgbGF0dGVyIGRlZmluZWRcbiAgICBpZiAoKGNhY2hlZFNldFRpbWVvdXQgPT09IGRlZmF1bHRTZXRUaW1vdXQgfHwgIWNhY2hlZFNldFRpbWVvdXQpICYmIHNldFRpbWVvdXQpIHtcbiAgICAgICAgY2FjaGVkU2V0VGltZW91dCA9IHNldFRpbWVvdXQ7XG4gICAgICAgIHJldHVybiBzZXRUaW1lb3V0KGZ1biwgMCk7XG4gICAgfVxuICAgIHRyeSB7XG4gICAgICAgIC8vIHdoZW4gd2hlbiBzb21lYm9keSBoYXMgc2NyZXdlZCB3aXRoIHNldFRpbWVvdXQgYnV0IG5vIEkuRS4gbWFkZG5lc3NcbiAgICAgICAgcmV0dXJuIGNhY2hlZFNldFRpbWVvdXQoZnVuLCAwKTtcbiAgICB9IGNhdGNoKGUpe1xuICAgICAgICB0cnkge1xuICAgICAgICAgICAgLy8gV2hlbiB3ZSBhcmUgaW4gSS5FLiBidXQgdGhlIHNjcmlwdCBoYXMgYmVlbiBldmFsZWQgc28gSS5FLiBkb2Vzbid0IHRydXN0IHRoZSBnbG9iYWwgb2JqZWN0IHdoZW4gY2FsbGVkIG5vcm1hbGx5XG4gICAgICAgICAgICByZXR1cm4gY2FjaGVkU2V0VGltZW91dC5jYWxsKG51bGwsIGZ1biwgMCk7XG4gICAgICAgIH0gY2F0Y2goZSl7XG4gICAgICAgICAgICAvLyBzYW1lIGFzIGFib3ZlIGJ1dCB3aGVuIGl0J3MgYSB2ZXJzaW9uIG9mIEkuRS4gdGhhdCBtdXN0IGhhdmUgdGhlIGdsb2JhbCBvYmplY3QgZm9yICd0aGlzJywgaG9wZnVsbHkgb3VyIGNvbnRleHQgY29ycmVjdCBvdGhlcndpc2UgaXQgd2lsbCB0aHJvdyBhIGdsb2JhbCBlcnJvclxuICAgICAgICAgICAgcmV0dXJuIGNhY2hlZFNldFRpbWVvdXQuY2FsbCh0aGlzLCBmdW4sIDApO1xuICAgICAgICB9XG4gICAgfVxuXG5cbn1cbmZ1bmN0aW9uIHJ1bkNsZWFyVGltZW91dChtYXJrZXIpIHtcbiAgICBpZiAoY2FjaGVkQ2xlYXJUaW1lb3V0ID09PSBjbGVhclRpbWVvdXQpIHtcbiAgICAgICAgLy9ub3JtYWwgZW52aXJvbWVudHMgaW4gc2FuZSBzaXR1YXRpb25zXG4gICAgICAgIHJldHVybiBjbGVhclRpbWVvdXQobWFya2VyKTtcbiAgICB9XG4gICAgLy8gaWYgY2xlYXJUaW1lb3V0IHdhc24ndCBhdmFpbGFibGUgYnV0IHdhcyBsYXR0ZXIgZGVmaW5lZFxuICAgIGlmICgoY2FjaGVkQ2xlYXJUaW1lb3V0ID09PSBkZWZhdWx0Q2xlYXJUaW1lb3V0IHx8ICFjYWNoZWRDbGVhclRpbWVvdXQpICYmIGNsZWFyVGltZW91dCkge1xuICAgICAgICBjYWNoZWRDbGVhclRpbWVvdXQgPSBjbGVhclRpbWVvdXQ7XG4gICAgICAgIHJldHVybiBjbGVhclRpbWVvdXQobWFya2VyKTtcbiAgICB9XG4gICAgdHJ5IHtcbiAgICAgICAgLy8gd2hlbiB3aGVuIHNvbWVib2R5IGhhcyBzY3Jld2VkIHdpdGggc2V0VGltZW91dCBidXQgbm8gSS5FLiBtYWRkbmVzc1xuICAgICAgICByZXR1cm4gY2FjaGVkQ2xlYXJUaW1lb3V0KG1hcmtlcik7XG4gICAgfSBjYXRjaCAoZSl7XG4gICAgICAgIHRyeSB7XG4gICAgICAgICAgICAvLyBXaGVuIHdlIGFyZSBpbiBJLkUuIGJ1dCB0aGUgc2NyaXB0IGhhcyBiZWVuIGV2YWxlZCBzbyBJLkUuIGRvZXNuJ3QgIHRydXN0IHRoZSBnbG9iYWwgb2JqZWN0IHdoZW4gY2FsbGVkIG5vcm1hbGx5XG4gICAgICAgICAgICByZXR1cm4gY2FjaGVkQ2xlYXJUaW1lb3V0LmNhbGwobnVsbCwgbWFya2VyKTtcbiAgICAgICAgfSBjYXRjaCAoZSl7XG4gICAgICAgICAgICAvLyBzYW1lIGFzIGFib3ZlIGJ1dCB3aGVuIGl0J3MgYSB2ZXJzaW9uIG9mIEkuRS4gdGhhdCBtdXN0IGhhdmUgdGhlIGdsb2JhbCBvYmplY3QgZm9yICd0aGlzJywgaG9wZnVsbHkgb3VyIGNvbnRleHQgY29ycmVjdCBvdGhlcndpc2UgaXQgd2lsbCB0aHJvdyBhIGdsb2JhbCBlcnJvci5cbiAgICAgICAgICAgIC8vIFNvbWUgdmVyc2lvbnMgb2YgSS5FLiBoYXZlIGRpZmZlcmVudCBydWxlcyBmb3IgY2xlYXJUaW1lb3V0IHZzIHNldFRpbWVvdXRcbiAgICAgICAgICAgIHJldHVybiBjYWNoZWRDbGVhclRpbWVvdXQuY2FsbCh0aGlzLCBtYXJrZXIpO1xuICAgICAgICB9XG4gICAgfVxuXG5cblxufVxudmFyIHF1ZXVlID0gW107XG52YXIgZHJhaW5pbmcgPSBmYWxzZTtcbnZhciBjdXJyZW50UXVldWU7XG52YXIgcXVldWVJbmRleCA9IC0xO1xuXG5mdW5jdGlvbiBjbGVhblVwTmV4dFRpY2soKSB7XG4gICAgaWYgKCFkcmFpbmluZyB8fCAhY3VycmVudFF1ZXVlKSB7XG4gICAgICAgIHJldHVybjtcbiAgICB9XG4gICAgZHJhaW5pbmcgPSBmYWxzZTtcbiAgICBpZiAoY3VycmVudFF1ZXVlLmxlbmd0aCkge1xuICAgICAgICBxdWV1ZSA9IGN1cnJlbnRRdWV1ZS5jb25jYXQocXVldWUpO1xuICAgIH0gZWxzZSB7XG4gICAgICAgIHF1ZXVlSW5kZXggPSAtMTtcbiAgICB9XG4gICAgaWYgKHF1ZXVlLmxlbmd0aCkge1xuICAgICAgICBkcmFpblF1ZXVlKCk7XG4gICAgfVxufVxuXG5mdW5jdGlvbiBkcmFpblF1ZXVlKCkge1xuICAgIGlmIChkcmFpbmluZykge1xuICAgICAgICByZXR1cm47XG4gICAgfVxuICAgIHZhciB0aW1lb3V0ID0gcnVuVGltZW91dChjbGVhblVwTmV4dFRpY2spO1xuICAgIGRyYWluaW5nID0gdHJ1ZTtcblxuICAgIHZhciBsZW4gPSBxdWV1ZS5sZW5ndGg7XG4gICAgd2hpbGUobGVuKSB7XG4gICAgICAgIGN1cnJlbnRRdWV1ZSA9IHF1ZXVlO1xuICAgICAgICBxdWV1ZSA9IFtdO1xuICAgICAgICB3aGlsZSAoKytxdWV1ZUluZGV4IDwgbGVuKSB7XG4gICAgICAgICAgICBpZiAoY3VycmVudFF1ZXVlKSB7XG4gICAgICAgICAgICAgICAgY3VycmVudFF1ZXVlW3F1ZXVlSW5kZXhdLnJ1bigpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIHF1ZXVlSW5kZXggPSAtMTtcbiAgICAgICAgbGVuID0gcXVldWUubGVuZ3RoO1xuICAgIH1cbiAgICBjdXJyZW50UXVldWUgPSBudWxsO1xuICAgIGRyYWluaW5nID0gZmFsc2U7XG4gICAgcnVuQ2xlYXJUaW1lb3V0KHRpbWVvdXQpO1xufVxuXG5wcm9jZXNzLm5leHRUaWNrID0gZnVuY3Rpb24gKGZ1bikge1xuICAgIHZhciBhcmdzID0gbmV3IEFycmF5KGFyZ3VtZW50cy5sZW5ndGggLSAxKTtcbiAgICBpZiAoYXJndW1lbnRzLmxlbmd0aCA+IDEpIHtcbiAgICAgICAgZm9yICh2YXIgaSA9IDE7IGkgPCBhcmd1bWVudHMubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgICAgIGFyZ3NbaSAtIDFdID0gYXJndW1lbnRzW2ldO1xuICAgICAgICB9XG4gICAgfVxuICAgIHF1ZXVlLnB1c2gobmV3IEl0ZW0oZnVuLCBhcmdzKSk7XG4gICAgaWYgKHF1ZXVlLmxlbmd0aCA9PT0gMSAmJiAhZHJhaW5pbmcpIHtcbiAgICAgICAgcnVuVGltZW91dChkcmFpblF1ZXVlKTtcbiAgICB9XG59O1xuXG4vLyB2OCBsaWtlcyBwcmVkaWN0aWJsZSBvYmplY3RzXG5mdW5jdGlvbiBJdGVtKGZ1biwgYXJyYXkpIHtcbiAgICB0aGlzLmZ1biA9IGZ1bjtcbiAgICB0aGlzLmFycmF5ID0gYXJyYXk7XG59XG5JdGVtLnByb3RvdHlwZS5ydW4gPSBmdW5jdGlvbiAoKSB7XG4gICAgdGhpcy5mdW4uYXBwbHkobnVsbCwgdGhpcy5hcnJheSk7XG59O1xucHJvY2Vzcy50aXRsZSA9ICdicm93c2VyJztcbnByb2Nlc3MuYnJvd3NlciA9IHRydWU7XG5wcm9jZXNzLmVudiA9IHt9O1xucHJvY2Vzcy5hcmd2ID0gW107XG5wcm9jZXNzLnZlcnNpb24gPSAnJzsgLy8gZW1wdHkgc3RyaW5nIHRvIGF2b2lkIHJlZ2V4cCBpc3N1ZXNcbnByb2Nlc3MudmVyc2lvbnMgPSB7fTtcblxuZnVuY3Rpb24gbm9vcCgpIHt9XG5cbnByb2Nlc3Mub24gPSBub29wO1xucHJvY2Vzcy5hZGRMaXN0ZW5lciA9IG5vb3A7XG5wcm9jZXNzLm9uY2UgPSBub29wO1xucHJvY2Vzcy5vZmYgPSBub29wO1xucHJvY2Vzcy5yZW1vdmVMaXN0ZW5lciA9IG5vb3A7XG5wcm9jZXNzLnJlbW92ZUFsbExpc3RlbmVycyA9IG5vb3A7XG5wcm9jZXNzLmVtaXQgPSBub29wO1xuXG5wcm9jZXNzLmJpbmRpbmcgPSBmdW5jdGlvbiAobmFtZSkge1xuICAgIHRocm93IG5ldyBFcnJvcigncHJvY2Vzcy5iaW5kaW5nIGlzIG5vdCBzdXBwb3J0ZWQnKTtcbn07XG5cbnByb2Nlc3MuY3dkID0gZnVuY3Rpb24gKCkgeyByZXR1cm4gJy8nIH07XG5wcm9jZXNzLmNoZGlyID0gZnVuY3Rpb24gKGRpcikge1xuICAgIHRocm93IG5ldyBFcnJvcigncHJvY2Vzcy5jaGRpciBpcyBub3Qgc3VwcG9ydGVkJyk7XG59O1xucHJvY2Vzcy51bWFzayA9IGZ1bmN0aW9uKCkgeyByZXR1cm4gMDsgfTtcbiIsIi8qKlxyXG4gKiBXb3JrIHdpdGggZGF0YSBzdG9yZXNcclxuICovXHJcblxyXG5jb25zdCBERUJPVU5DRV9USU1FID0gMjAwMDtcclxuY29uc3QgREFUQV9TVE9SRV9ST09UID0gXCIvYXBpL2RhdGEvXCI7XHJcblxyXG52YXIgaWRiID0gcmVxdWlyZShcImlkYlwiKTtcclxuXHJcbi8vIGNhY2hlIGRhdGEgc3RvcmUgaW5zdGFuY2VzXHJcbnZhciBzdG9yZXMgPSB7fTtcclxuXHJcbi8vIGdldC9jcmVhdGUgYSBkYXRhc3RvcmVcclxudmFyIHN0b3JlID0gZXhwb3J0cy5zdG9yZSA9IGZ1bmN0aW9uKG5hbWUpIHtcclxuXHQvLyB1c2UgdGhlIGNhY2hlZCBzdG9yZVxyXG5cdGlmKG5hbWUgaW4gc3RvcmVzKSB7XHJcblx0XHRyZXR1cm4gc3RvcmVzW25hbWVdO1xyXG5cdH1cclxuXHJcblx0dmFyIHN0b3JlID0gbmV3IFN0b3JlKG5hbWUpO1xyXG5cclxuXHQvLyBjYWNoZSB0aGUgZGF0YSBzdG9yZSBpbnN0YW5jZVxyXG5cdHN0b3Jlc1tuYW1lXSA9IHN0b3JlO1xyXG5cclxuXHQvLyB0ZWxsIGFueSBsaXN0ZW5lcnMgdGhlIHN0b3JlIGhhcyBiZWVuIGNyZWF0ZWRcclxuXHRsaWZlTGluZS5lbWl0KFwiZGF0YS1zdG9yZS1jcmVhdGVkXCIsIHN0b3JlKTtcclxuXHJcblx0cmV0dXJuIHN0b3JlO1xyXG59O1xyXG5cclxuY2xhc3MgU3RvcmUgZXh0ZW5kcyBsaWZlTGluZS5FdmVudEVtaXR0ZXIge1xyXG5cdGNvbnN0cnVjdG9yKG5hbWUpIHtcclxuXHRcdHN1cGVyKCk7XHJcblx0XHR0aGlzLm5hbWUgPSBuYW1lO1xyXG5cdFx0dGhpcy5fY2FjaGUgPSB7fTtcclxuXHRcdC8vIGRvbid0IHNlbmQgZHVwbGljYXRlIHJlcXVlc3RzXHJcblx0XHR0aGlzLl9yZXF1ZXN0aW5nID0gW107XHJcblx0XHQvLyBwcm9taXNlIGZvciB0aGUgZGF0YWJhc2VcclxuXHRcdHRoaXMuX2RiID0gaWRiLm9wZW4oXCJkYXRhLXN0b3Jlc1wiLCAyLCBkYiA9PiB7XHJcblx0XHRcdC8vIHVwZ3JhZGUgb3IgY3JlYXRlIHRoZSBkYlxyXG5cdFx0XHRpZihkYi5vbGRWZXJzaW9uIDwgMSlcclxuXHRcdFx0XHRkYi5jcmVhdGVPYmplY3RTdG9yZShcImFzc2lnbm1lbnRzXCIsIHsga2V5UGF0aDogXCJpZFwiIH0pO1xyXG5cdFx0XHRpZihkYi5vbGRWZXJzaW9uIDwgMilcclxuXHRcdFx0XHRkYi5jcmVhdGVPYmplY3RTdG9yZShcInN5bmMtc3RvcmVcIiwgeyBrZXlQYXRoOiBcImlkXCIgfSk7XHJcblx0XHR9KTtcclxuXHR9XHJcblxyXG5cdC8vIHNldCB0aGUgZnVuY3Rpb24gdG8gZGVzZXJpYWxpemUgYWxsIGRhdGEgZnJvbSB0aGUgc2VydmVyXHJcblx0c2V0SW5pdChmbikge1xyXG5cdFx0dGhpcy5fZGVzZXJpYWxpemVyID0gZm47XHJcblx0fVxyXG5cclxuXHQvLyBnZXQgYWxsIHRoZSBpdGVtcyBhbmQgbGlzdGVuIGZvciBhbnkgY2hhbmdlc1xyXG5cdGdldEFsbChmbikge1xyXG5cdFx0aWYoIWZuKSB7XHJcblx0XHRcdC8vIGxvYWQgaXRlbXMgZnJvbSBpZGJcclxuXHRcdFx0cmV0dXJuIHRoaXMuX2RiLnRoZW4oZGIgPT4ge1xyXG5cdFx0XHRcdHJldHVybiBkYi50cmFuc2FjdGlvbih0aGlzLm5hbWUpXHJcblx0XHRcdFx0XHQub2JqZWN0U3RvcmUodGhpcy5uYW1lKVxyXG5cdFx0XHRcdFx0LmdldEFsbCgpXHJcblx0XHRcdH0pO1xyXG5cdFx0fVxyXG5cclxuXHRcdC8vIGdvIHRvIHRoZSBjYWNoZSBmaXJzdFxyXG5cdFx0Zm4oYXJyYXlGcm9tT2JqZWN0KHRoaXMuX2NhY2hlKSk7XHJcblxyXG5cdFx0Ly8gbG9hZCBpdGVtcyBmcm9tIGlkYlxyXG5cdFx0dGhpcy5fZGIudGhlbihkYiA9PiB7XHJcblx0XHRcdGRiLnRyYW5zYWN0aW9uKHRoaXMubmFtZSlcclxuXHRcdFx0XHQub2JqZWN0U3RvcmUodGhpcy5uYW1lKVxyXG5cdFx0XHRcdC5nZXRBbGwoKVxyXG5cdFx0XHRcdC50aGVuKGFsbCA9PiB7XHJcblx0XHRcdFx0XHQvLyBzdG9yZSBpdGVtcyBpbiB0aGUgY2FjaGVcclxuXHRcdFx0XHRcdGZvcihsZXQgaXRlbSBvZiBhbGwpIHtcclxuXHRcdFx0XHRcdFx0dGhpcy5fY2FjaGVbaXRlbS5pZF0gPSBpdGVtO1xyXG5cdFx0XHRcdFx0fVxyXG5cclxuXHRcdFx0XHRcdC8vIG5vdGlmeSBsaXN0ZW5lcnMgd2UgbG9hZGVkIHRoZSBkYXRhXHJcblx0XHRcdFx0XHR0aGlzLmVtaXQoXCJjaGFuZ2VcIik7XHJcblx0XHRcdFx0fSk7XHJcblx0XHR9KTtcclxuXHJcblx0XHQvLyBsaXN0ZW4gZm9yIGFueSBjaGFuZ2VzXHJcblx0XHRyZXR1cm4gdGhpcy5vbihcImNoYW5nZVwiLCAoKSA9PiB7XHJcblx0XHRcdC8vIHRoZSBjaGFuZ2VzIHdpbGwgd2UgaW4gdGhlIGNhY2hlXHJcblx0XHRcdGZuKGFycmF5RnJvbU9iamVjdCh0aGlzLl9jYWNoZSkpO1xyXG5cdFx0fSk7XHJcblx0fVxyXG5cclxuXHQvLyBnZXQgYSBzaW5nbGUgaXRlbSBhbmQgbGlzdGVuIGZvciBjaGFuZ2VzXHJcblx0Z2V0KGlkLCBmbikge1xyXG5cdFx0Ly8ganVzdCBsb2FkIHRoZSB2YWx1ZSBmcm9tIGlkYlxyXG5cdFx0aWYoIWZuKSB7XHJcblx0XHRcdC8vIGhpdCB0aGUgY2FjaGVcclxuXHRcdFx0aWYodGhpcy5fY2FjaGVbaWRdKSByZXR1cm4gUHJvbWlzZS5yZXNvbHZlKHRoaXMuX2NhY2hlW2lkXSk7XHJcblxyXG5cdFx0XHQvLyBoaXQgaWRiXHJcblx0XHRcdHJldHVybiB0aGlzLl9kYi50aGVuKGRiID0+IHtcclxuXHRcdFx0XHRyZXR1cm4gZGIudHJhbnNhY3Rpb24odGhpcy5uYW1lKVxyXG5cdFx0XHRcdFx0Lm9iamVjdFN0b3JlKHRoaXMubmFtZSlcclxuXHRcdFx0XHRcdC5nZXQoaWQpXHJcblx0XHRcdFx0XHQudGhlbihpdGVtID0+IHtcclxuXHRcdFx0XHRcdFx0aWYodHlwZW9mIHRoaXMuX2Rlc2VyaWFsaXplciA9PSBcImZ1bmN0aW9uXCIpIHtcclxuXHRcdFx0XHRcdFx0XHRyZXR1cm4gdGhpcy5fZGVzZXJpYWxpemVyKGl0ZW0pIHx8IGl0ZW07XHJcblx0XHRcdFx0XHRcdH1cclxuXHJcblx0XHRcdFx0XHRcdHJldHVybiBpdGVtO1xyXG5cdFx0XHRcdFx0fSk7XHJcblx0XHRcdH0pO1xyXG5cdFx0fVxyXG5cclxuXHRcdC8vIGdvIHRvIHRoZSBjYWNoZSBmaXJzdFxyXG5cdFx0Zm4odGhpcy5fY2FjaGVbaWRdKTtcclxuXHJcblx0XHQvLyBsb2FkIHRoZSBpdGVtIGZyb20gaWRiXHJcblx0XHR0aGlzLl9kYi50aGVuKGRiID0+IHtcclxuXHRcdFx0ZGIudHJhbnNhY3Rpb24odGhpcy5uYW1lKVxyXG5cdFx0XHRcdC5vYmplY3RTdG9yZSh0aGlzLm5hbWUpXHJcblx0XHRcdFx0LmdldChpZClcclxuXHRcdFx0XHQudGhlbihpdGVtID0+IHtcclxuXHRcdFx0XHRcdGlmKGl0ZW0pIHtcclxuXHRcdFx0XHRcdFx0Ly8gc3RvcmUgaXRlbSBpbiB0aGUgY2FjaGVcclxuXHRcdFx0XHRcdFx0dGhpcy5fY2FjaGVbaXRlbS5pZF0gPSBpdGVtO1xyXG5cclxuXHRcdFx0XHRcdFx0Ly8gbm90aWZ5IGxpc3RlbmVycyB3ZSBsb2FkZWQgdGhlIGRhdGFcclxuXHRcdFx0XHRcdFx0dGhpcy5lbWl0KFwiY2hhbmdlXCIpO1xyXG5cdFx0XHRcdFx0fVxyXG5cdFx0XHRcdH0pO1xyXG5cdFx0fSk7XHJcblxyXG5cdFx0Ly8gbGlzdGVuIGZvciBhbnkgY2hhbmdlc1xyXG5cdFx0cmV0dXJuIHRoaXMub24oXCJjaGFuZ2VcIiwgKCkgPT4ge1xyXG5cdFx0XHRmbih0aGlzLl9jYWNoZVtpZF0pO1xyXG5cdFx0fSk7XHJcblx0fVxyXG5cclxuXHQvLyBzdG9yZSBhIHZhbHVlIGluIHRoZSBzdG9yZVxyXG5cdHNldCh2YWx1ZSwgc2tpcHMsIG9wdHMgPSB7fSkge1xyXG5cdFx0dmFyIGlzTmV3ID0gISF0aGlzLl9jYWNoZVt2YWx1ZS5pZF07XHJcblxyXG5cdFx0Ly8gZGVzZXJpYWxpemVcclxuXHRcdGlmKHR5cGVvZiB0aGlzLl9kZXNlcmlhbGl6ZXIgPT0gXCJmdW5jdGlvblwiKSB7XHJcblx0XHRcdHZhbHVlID0gdGhpcy5fZGVzZXJpYWxpemVyKHZhbHVlKSB8fCB2YWx1ZTtcclxuXHRcdH1cclxuXHJcblx0XHQvLyBzdG9yZSB0aGUgdmFsdWUgaW4gdGhlIGNhY2hlXHJcblx0XHR0aGlzLl9jYWNoZVt2YWx1ZS5pZF0gPSB2YWx1ZTtcclxuXHJcblx0XHQvLyBzYXZlIHRoZSBpdGVtXHJcblx0XHR2YXIgc2F2ZSA9ICgpID0+IHtcclxuXHRcdFx0Ly8gc2F2ZSB0aGUgaXRlbSBpbiB0aGUgZGJcclxuXHRcdFx0dGhpcy5fZGIudGhlbihkYiA9PiB7XHJcblx0XHRcdFx0ZGIudHJhbnNhY3Rpb24odGhpcy5uYW1lLCBcInJlYWR3cml0ZVwiKVxyXG5cdFx0XHRcdFx0Lm9iamVjdFN0b3JlKHRoaXMubmFtZSlcclxuXHRcdFx0XHRcdC5wdXQodmFsdWUpO1xyXG5cdFx0XHR9KTtcclxuXHJcblx0XHRcdC8vIHN5bmMgdGhlIGNoYW5nZXMgdG8gdGhlIHNlcnZlclxyXG5cdFx0XHR0aGlzLnBhcnRpYWxFbWl0KFwic3luYy1wdXRcIiwgc2tpcHMsIHZhbHVlLCBpc05ldyk7XHJcblx0XHR9O1xyXG5cclxuXHRcdC8vIGVtaXQgYSBjaGFuZ2VcclxuXHRcdHRoaXMucGFydGlhbEVtaXQoXCJjaGFuZ2VcIiwgc2tpcHMpO1xyXG5cclxuXHRcdC8vIGRvbid0IHdhaXQgdG8gc2VuZCB0aGUgY2hhbmdlcyB0byB0aGUgc2VydmVyXHJcblx0XHRpZihvcHRzLnNhdmVOb3cpIHJldHVybiBzYXZlKCk7XHJcblx0XHRlbHNlIGRlYm91bmNlKGAke3RoaXMubmFtZX0vJHt2YWx1ZS5pZH1gLCBzYXZlKTtcclxuXHR9XHJcblxyXG5cdC8vIHJlbW92ZSBhIHZhbHVlIGZyb20gdGhlIHN0b3JlXHJcblx0cmVtb3ZlKGlkLCBza2lwcykge1xyXG5cdFx0Ly8gcmVtb3ZlIHRoZSB2YWx1ZSBmcm9tIHRoZSBjYWNoZVxyXG5cdFx0ZGVsZXRlIHRoaXMuX2NhY2hlW2lkXTtcclxuXHJcblx0XHQvLyBlbWl0IGEgY2hhbmdlXHJcblx0XHR0aGlzLnBhcnRpYWxFbWl0KFwiY2hhbmdlXCIsIHNraXBzKTtcclxuXHJcblx0XHQvLyBzeW5jIHRoZSBjaGFuZ2VzIHRvIHRoZSBzZXJ2ZXJcclxuXHRcdHRoaXMucGFydGlhbEVtaXQoXCJzeW5jLWRlbGV0ZVwiLCBza2lwcywgaWQpO1xyXG5cclxuXHRcdC8vIGRlbGV0ZSB0aGUgaXRlbVxyXG5cdFx0cmV0dXJuIHRoaXMuX2RiLnRoZW4oZGIgPT4ge1xyXG5cdFx0XHRyZXR1cm4gZGIudHJhbnNhY3Rpb24odGhpcy5uYW1lLCBcInJlYWR3cml0ZVwiKVxyXG5cdFx0XHRcdC5vYmplY3RTdG9yZSh0aGlzLm5hbWUpXHJcblx0XHRcdFx0LmRlbGV0ZShpZCk7XHJcblx0XHR9KTtcclxuXHR9XHJcblxyXG5cdC8vIGZvcmNlIHNhdmVzIHRvIGdvIHRocm91Z2hcclxuXHRmb3JjZVNhdmUoKSB7XHJcblx0XHRmb3IobGV0IHRpbWVyIG9mIE9iamVjdC5nZXRPd25Qcm9wZXJ0eU5hbWVzKGRlYm91bmNlVGltZXJzKSkge1xyXG5cdFx0XHQvLyBvbmx5IHNhdmUgaXRlbXMgZnJvbSB0aGlzIGRhdGEgc3RvcmVcclxuXHRcdFx0aWYodGltZXIuaW5kZXhPZihgJHt0aGlzLm5hbWV9L2ApID09PSAwKSB7XHJcblx0XHRcdFx0Y29udGludWU7XHJcblx0XHRcdH1cclxuXHJcblx0XHRcdC8vIGxvb2sgdXAgdGhlIHRpbWVyIGlkXHJcblx0XHRcdGxldCBpZCA9IHRpbWVyLnN1YnN0cih0aW1lci5pbmRleE9mKFwiL1wiKSArIDEpO1xyXG5cdFx0XHR2YXIgdmFsdWUgPSB0aGlzLl9jYWNoZVtpZF07XHJcblxyXG5cdFx0XHQvLyBjbGVhciB0aGUgdGltZXJcclxuXHRcdFx0Y2xlYXJUaW1lb3V0KHRpbWVyKTtcclxuXHJcblx0XHRcdC8vIHJlbW92ZSB0aGUgdGltZXIgZnJvbSB0aGUgbGlzdFxyXG5cdFx0XHRkZWxldGUgZGVib3VuY2VUaW1lcnNbdGltZXJdO1xyXG5cclxuXHRcdFx0Ly8gZG9uJ3Qgc2F2ZSBvbiBkZWxldGVcclxuXHRcdFx0aWYoIXZhbHVlKSByZXR1cm47XHJcblxyXG5cdFx0XHQvLyBzYXZlIHRoZSBpdGVtIGluIHRoZSBkYlxyXG5cdFx0XHR0aGlzLl9kYi50aGVuKGRiID0+IHtcclxuXHRcdFx0XHRkYi50cmFuc2FjdGlvbih0aGlzLm5hbWUsIFwicmVhZHdyaXRlXCIpXHJcblx0XHRcdFx0XHQub2JqZWN0U3RvcmUodGhpcy5uYW1lKVxyXG5cdFx0XHRcdFx0LnB1dCh2YWx1ZSk7XHJcblx0XHRcdH0pO1xyXG5cclxuXHRcdFx0Ly8gc3luYyB0aGUgY2hhbmdlcyB0byB0aGUgc2VydmVyXHJcblx0XHRcdHRoaXMuZW1pdChcInN5bmMtcHV0XCIsIHZhbHVlKTtcclxuXHRcdH1cclxuXHR9XHJcbn1cclxuXHJcbi8vIGdldCBhbiBhcnJheSBmcm9tIGFuIG9iamVjdFxyXG52YXIgYXJyYXlGcm9tT2JqZWN0ID0gZnVuY3Rpb24ob2JqKSB7XHJcblx0cmV0dXJuIE9iamVjdC5nZXRPd25Qcm9wZXJ0eU5hbWVzKG9iailcclxuXHRcdC5tYXAobmFtZSA9PiBvYmpbbmFtZV0pO1xyXG59O1xyXG5cclxuLy8gZG9uJ3QgY2FsbCBhIGZ1bmN0aW9uIHRvbyBvZnRlblxyXG52YXIgZGVib3VuY2VUaW1lcnMgPSB7fTtcclxuXHJcbnZhciBkZWJvdW5jZSA9IChpZCwgZm4pID0+IHtcclxuXHQvLyBjYW5jZWwgdGhlIHByZXZpb3VzIGRlbGF5XHJcblx0Y2xlYXJUaW1lb3V0KGRlYm91bmNlVGltZXJzW2lkXSk7XHJcblx0Ly8gc3RhcnQgYSBuZXcgZGVsYXlcclxuXHRkZWJvdW5jZVRpbWVyc1tpZF0gPSBzZXRUaW1lb3V0KGZuLCBERUJPVU5DRV9USU1FKTtcclxufTtcclxuIiwiLyoqXHJcbiAqIEJyb3dzZXIgc3BlY2lmaWMgZ2xvYmFsc1xyXG4gKi9cclxuXHJcbmxpZmVMaW5lLm1ha2VEb20gPSByZXF1aXJlKFwiLi91dGlsL2RvbS1tYWtlclwiKTtcclxubGlmZUxpbmUuc3luY2VyID0gcmVxdWlyZShcIi4vc3luY2VyXCIpO1xyXG5cclxuLy8gYWRkIGEgZnVuY3Rpb24gZm9yIGFkZGluZyBhY3Rpb25zXHJcbmxpZmVMaW5lLmFkZEFjdGlvbiA9IGZ1bmN0aW9uKG5hbWUsIGZuKSB7XHJcblx0Ly8gYXR0YWNoIHRoZSBjYWxsYmFja1xyXG5cdHZhciBsaXN0ZW5lciA9IGxpZmVMaW5lLm9uKFwiYWN0aW9uLWV4ZWMtXCIgKyBuYW1lLCBmbik7XHJcblxyXG5cdC8vIGluZm9ybSBhbnkgYWN0aW9uIHByb3ZpZGVyc1xyXG5cdGxpZmVMaW5lLmVtaXQoXCJhY3Rpb24tY3JlYXRlXCIsIG5hbWUpO1xyXG5cclxuXHQvLyBhbGwgYWN0aW9ucyByZW1vdmVkXHJcblx0dmFyIHJlbW92ZUFsbCA9IGxpZmVMaW5lLm9uKFwiYWN0aW9uLXJlbW92ZS1hbGxcIiwgKCkgPT4ge1xyXG5cdFx0Ly8gcmVtb3ZlIHRoZSBhY3Rpb24gbGlzdGVuZXJcclxuXHRcdGxpc3RlbmVyLnVuc3Vic2NyaWJlKCk7XHJcblx0XHRyZW1vdmVBbGwudW5zdWJzY3JpYmUoKTtcclxuXHR9KTtcclxuXHJcblx0cmV0dXJuIHtcclxuXHRcdHVuc3Vic2NyaWJlKCkge1xyXG5cdFx0XHQvLyByZW1vdmUgdGhlIGFjdGlvbiBsaXN0ZW5lclxyXG5cdFx0XHRsaXN0ZW5lci51bnN1YnNjcmliZSgpO1xyXG5cdFx0XHRyZW1vdmVBbGwudW5zdWJzY3JpYmUoKTtcclxuXHJcblx0XHRcdC8vIGluZm9ybSBhbnkgYWN0aW9uIHByb3ZpZGVyc1xyXG5cdFx0XHRsaWZlTGluZS5lbWl0KFwiYWN0aW9uLXJlbW92ZVwiLCBuYW1lKTtcclxuXHRcdH1cclxuXHR9O1xyXG59O1xyXG4iLCIvLyBjcmVhdGUgdGhlIGdsb2JhbCBvYmplY3RcclxucmVxdWlyZShcIi4uL2NvbW1vbi9nbG9iYWxcIik7XHJcbnJlcXVpcmUoXCIuL2dsb2JhbFwiKTtcclxuXHJcbnZhciB7c3RvcmV9ID0gcmVxdWlyZShcIi4vZGF0YS1zdG9yZVwiKTtcclxuXHJcbnZhciBzeW5jU3RvcmUgPSBzdG9yZShcInN5bmMtc3RvcmVcIik7XHJcblxyXG4vLyBhbGwgdGhlIGZpbGVzIHRvIGNhY2hlXHJcbmNvbnN0IENBQ0hFRF9GSUxFUyA9IFtcclxuXHRcIi9cIixcclxuXHRcIi9zdGF0aWMvYnVuZGxlLmpzXCIsXHJcblx0XCIvc3RhdGljL3N0eWxlLmNzc1wiLFxyXG5cdFwiL3N0YXRpYy9pY29uLTE0NC5wbmdcIixcclxuXHRcIi9zdGF0aWMvbWFuaWZlc3QuanNvblwiXHJcbl07XHJcblxyXG5jb25zdCBTVEFUSUNfQ0FDSEUgPSBcInN0YXRpY1wiO1xyXG5cclxuLy8gY2FjaGUgdGhlIHZlcnNpb24gb2YgdGhlIGNsaWVudFxyXG52YXIgY2xpZW50VmVyc2lvbjtcclxuXHJcbi8vIGRvd25sb2FkIGEgbmV3IHZlcnNpb25cclxudmFyIGRvd25sb2FkID0gZnVuY3Rpb24oKSB7XHJcblx0Ly8gc2F2ZSB0aGUgbmV3IHZlcnNpb25cclxuXHR2YXIgdmVyc2lvbjtcclxuXHJcblx0Ly8gb3BlbiB0aGUgY2FjaGVcclxuXHRyZXR1cm4gY2FjaGVzLm9wZW4oU1RBVElDX0NBQ0hFKVxyXG5cclxuXHQudGhlbihjYWNoZSA9PiB7XHJcblx0XHQvLyBkb3dubG9hZCBhbGwgdGhlIGZpbGVzXHJcblx0XHRyZXR1cm4gUHJvbWlzZS5hbGwoXHJcblx0XHRcdENBQ0hFRF9GSUxFUy5tYXAodXJsID0+IHtcclxuXHRcdFx0XHQvLyBkb3dubG9hZCB0aGUgZmlsZVxyXG5cdFx0XHRcdHJldHVybiBmZXRjaCh1cmwpXHJcblxyXG5cdFx0XHRcdC50aGVuKHJlcyA9PiB7XHJcblx0XHRcdFx0XHQvLyBzYXZlIHRoZSBmaWxlXHJcblx0XHRcdFx0XHR2YXIgcHJvbWlzZXMgPSBbXHJcblx0XHRcdFx0XHRcdGNhY2hlLnB1dChuZXcgUmVxdWVzdCh1cmwpLCByZXMpXHJcblx0XHRcdFx0XHRdO1xyXG5cclxuXHRcdFx0XHRcdC8vIHNhdmUgdGhlIHZlcnNpb25cclxuXHRcdFx0XHRcdGlmKCF2ZXJzaW9uKSB7XHJcblx0XHRcdFx0XHRcdHZlcnNpb24gPSBjbGllbnRWZXJzaW9uID0gcmVzLmhlYWRlcnMuZ2V0KFwic2VydmVyXCIpO1xyXG5cclxuXHRcdFx0XHRcdFx0cHJvbWlzZXMucHVzaChcclxuXHRcdFx0XHRcdFx0XHRzeW5jU3RvcmUuc2V0KHtcclxuXHRcdFx0XHRcdFx0XHRcdGlkOiBcInZlcnNpb25cIixcclxuXHRcdFx0XHRcdFx0XHRcdHZhbHVlOiB2ZXJzaW9uXHJcblx0XHRcdFx0XHRcdFx0fSlcclxuXHRcdFx0XHRcdFx0KTtcclxuXHRcdFx0XHRcdH1cclxuXHJcblx0XHRcdFx0XHRyZXR1cm4gcHJvbWlzZXMubGVuZ3RoID09IDEgPyBwcm9taXNlc1swXSA6IFByb21pc2UuYWxsKHByb21pc2VzKTtcclxuXHRcdFx0XHR9KTtcclxuXHRcdFx0fSlcclxuXHRcdClcclxuXHJcblx0XHQvLyBub3RpZnkgdGhlIGNsaWVudChzKSBvZiB0aGUgdXBkYXRlXHJcblx0XHQudGhlbigoKSA9PiBub3RpZnlDbGllbnRzKHZlcnNpb24pKTtcclxuXHR9KTtcclxufTtcclxuXHJcbi8vIG5vdGlmeSB0aGUgY2xpZW50KHMpIG9mIGFuIHVwZGF0ZVxyXG52YXIgbm90aWZ5Q2xpZW50cyA9IGZ1bmN0aW9uKHZlcnNpb24pIHtcclxuXHQvLyBnZXQgYWxsIHRoZSBjbGllbnRzXHJcblx0cmV0dXJuIGNsaWVudHMubWF0Y2hBbGwoe30pXHJcblxyXG5cdC50aGVuKGNsaWVudHMgPT4ge1xyXG5cdFx0Zm9yKGxldCBjbGllbnQgb2YgY2xpZW50cykge1xyXG5cdFx0XHQvLyBzZW5kIHRoZSB2ZXJzaW9uXHJcblx0XHRcdGNsaWVudC5wb3N0TWVzc2FnZSh7XHJcblx0XHRcdFx0dHlwZTogXCJ2ZXJzaW9uLWNoYW5nZVwiLFxyXG5cdFx0XHRcdHZlcnNpb25cclxuXHRcdFx0fSk7XHJcblx0XHR9XHJcblx0fSk7XHJcbn07XHJcblxyXG4vLyBjaGVjayBmb3IgdXBkYXRlc1xyXG52YXIgY2hlY2tGb3JVcGRhdGVzID0gZnVuY3Rpb24obmV3VmVyc2lvbikge1xyXG5cdC8vIGlmIHdlIGhhdmUgYSB2ZXJzaW9uIHVzZSB0aGF0XHJcblx0aWYobmV3VmVyc2lvbikge1xyXG5cdFx0bmV3VmVyc2lvbiA9IFByb21pc2UucmVzb2x2ZShuZXdWZXJzaW9uKTtcclxuXHR9XHJcblx0Ly8gZmV0Y2ggdGhlIHZlcnNpb25cclxuXHRlbHNlIHtcclxuXHRcdG5ld1ZlcnNpb24gPSBmZXRjaChcIi9cIilcclxuXHJcblx0XHQudGhlbihyZXMgPT4gcmVzLmhlYWRlcnMuZ2V0KFwic2VydmVyXCIpKTtcclxuXHR9XHJcblxyXG5cdHZhciBvbGRWZXJzaW9uO1xyXG5cclxuXHQvLyBhbHJlYWR5IGluIG1lbW9yeVxyXG5cdGlmKGNsaWVudFZlcnNpb24pIHtcclxuXHRcdG9sZFZlcnNpb24gPSBQcm9taXNlLnJlc29sdmUoY2xpZW50VmVyc2lvbik7XHJcblx0fVxyXG5cdGVsc2Uge1xyXG5cdFx0b2xkVmVyc2lvbiA9IHN5bmNTdG9yZS5nZXQoXCJ2ZXJzaW9uXCIpLnRoZW4oKHZhbHVlID0ge30pID0+IHZhbHVlLnZhbHVlKVxyXG5cdH1cclxuXHJcblx0cmV0dXJuIFByb21pc2UuYWxsKFtcclxuXHRcdG5ld1ZlcnNpb24sXHJcblx0XHRvbGRWZXJzaW9uXHJcblx0XSlcclxuXHJcblx0LnRoZW4oKFtuZXdWZXJzaW9uLCBvbGRWZXJzaW9uXSkgPT4ge1xyXG5cdFx0Ly8gc2FtZSB2ZXJzaW9uIGRvIG5vdGhpbmdcclxuXHRcdGlmKG5ld1ZlcnNpb24gPT0gb2xkVmVyc2lvbikge1xyXG5cclxuXHRcdFx0cmV0dXJuIHN5bmNTdG9yZS5zZXQoe1xyXG5cdFx0XHRcdGlkOiBcInZlcnNpb25cIixcclxuXHRcdFx0XHR2YWx1ZTogb2xkVmVyc2lvblxyXG5cdFx0XHR9KTtcclxuXHRcdH1cclxuXHJcblx0XHQvLyBkb3dubG9hZCB0aGUgbmV3IHZlcnNpb25cclxuXHRcdHJldHVybiBkb3dubG9hZCgpO1xyXG5cdH0pO1xyXG59O1xyXG5cclxuLy8gd2hlbiB3ZSBhcmUgaW5zdGFsbGVkIGNoZWNrIGZvciB1cGRhdGVzXHJcbnNlbGYuYWRkRXZlbnRMaXN0ZW5lcihcImluc3RhbGxcIiwgZSA9PiBlLndhaXRVbnRpbChjaGVja0ZvclVwZGF0ZXMoKSkpO1xyXG5cclxuLy8gaGFuZGxlIGEgbmV0d29yayBSZXF1ZXN0XHJcbnNlbGYuYWRkRXZlbnRMaXN0ZW5lcihcImZldGNoXCIsIGUgPT4ge1xyXG5cdC8vIGdldCB0aGUgcGFnZSB1cmxcclxuXHR2YXIgdXJsID0gbmV3IFVSTChlLnJlcXVlc3QudXJsKS5wYXRobmFtZTtcclxuXHJcblx0Ly8ganVzdCBnbyB0byB0aGUgc2VydmVyIGZvciBhcGkgY2FsbHNcclxuXHRpZih1cmwuc3Vic3RyKDAsIDUpID09IFwiL2FwaS9cIikge1xyXG5cclxuXHRcdGUucmVzcG9uZFdpdGgoXHJcblx0XHRcdGZldGNoKGUucmVxdWVzdCwge1xyXG5cdFx0XHRcdGNyZWRlbnRpYWxzOiBcImluY2x1ZGVcIlxyXG5cdFx0XHR9KVxyXG5cclxuXHRcdFx0Ly8gbmV0d29yayBlcnJvclxyXG5cdFx0XHQuY2F0Y2goZXJyID0+IHtcclxuXHRcdFx0XHQvLyBzZW5kIGFuIGVycm9yIHJlc3BvbnNlXHJcblx0XHRcdFx0cmV0dXJuIG5ldyBSZXNwb25zZShKU09OLnN0cmluZ2lmeSh7XHJcblx0XHRcdFx0XHRzdGF0dXM6IFwiZmFpbFwiLFxyXG5cdFx0XHRcdFx0ZGF0YToge1xyXG5cdFx0XHRcdFx0XHRyZWFzb246IFwibmV0d29yLWVycm9yXCJcclxuXHRcdFx0XHRcdH1cclxuXHRcdFx0XHR9KSwge1xyXG5cdFx0XHRcdFx0aGVhZGVyczoge1xyXG5cdFx0XHRcdFx0XHRcImNvbnRlbnQtdHlwZVwiOiBcImFwcGxpY2F0aW9uL2pzb25cIlxyXG5cdFx0XHRcdFx0fVxyXG5cdFx0XHRcdH0pO1xyXG5cdFx0XHR9KVxyXG5cclxuXHRcdFx0LnRoZW4ocmVzID0+IHtcclxuXHRcdFx0XHQvLyBjaGVjayBmb3IgdXBkYXRlc1xyXG5cdFx0XHRcdGNoZWNrRm9yVXBkYXRlcyhyZXMuaGVhZGVycy5nZXQoXCJzZXJ2ZXJcIikpO1xyXG5cclxuXHRcdFx0XHRyZXR1cm4gcmVzO1xyXG5cdFx0XHR9KVxyXG5cdFx0KTtcclxuXHR9XHJcblx0Ly8gcmVzcG9uZCBmcm9tIHRoZSBjYWNoZVxyXG5cdGVsc2Uge1xyXG5cdFx0ZS5yZXNwb25kV2l0aChcclxuXHRcdFx0Y2FjaGVzLm1hdGNoKGUucmVxdWVzdClcclxuXHJcblx0XHRcdC50aGVuKHJlcyA9PiB7XHJcblx0XHRcdFx0Ly8gaWYgdGhlcmUgd2FzIG5vIG1hdGNoIHNlbmQgdGhlIGluZGV4IHBhZ2VcclxuXHRcdFx0XHRpZighcmVzKSB7XHJcblx0XHRcdFx0XHRyZXR1cm4gY2FjaGVzLm1hdGNoKG5ldyBSZXF1ZXN0KFwiL1wiKSk7XHJcblx0XHRcdFx0fVxyXG5cclxuXHRcdFx0XHRyZXR1cm4gcmVzO1xyXG5cdFx0XHR9KVxyXG5cdFx0KTtcclxuXHR9XHJcbn0pO1xyXG4iLCIvKipcclxuICogU3luY3Jvbml6ZSB0aGlzIGNsaWVudCB3aXRoIHRoZSBzZXJ2ZXJcclxuICovXHJcblxyXG52YXIgZGF0YVN0b3JlID0gcmVxdWlyZShcIi4vZGF0YS1zdG9yZVwiKS5zdG9yZTtcclxuXHJcbnZhciBzeW5jU3RvcmUgPSBkYXRhU3RvcmUoXCJzeW5jLXN0b3JlXCIpO1xyXG5cclxuY29uc3QgU1RPUkVTID0gW1wiYXNzaWdubWVudHNcIl07XHJcblxyXG4vLyBjcmVhdGUgdGhlIGdsb2JhbCBzeW5jZXIgcmVmcmVuY2VcclxudmFyIHN5bmNlciA9IG1vZHVsZS5leHBvcnRzID0gbmV3IGxpZmVMaW5lLkV2ZW50RW1pdHRlcigpO1xyXG5cclxuLy8gc2F2ZSBzdWJzY3JpcHRpb25zIHRvIGRhdGEgc3RvcmUgc3luYyBldmVudHMgc28gd2UgZG9udCB0cmlnZ2VyIG91ciBzZWxmIHdoZW4gd2Ugc3luY1xyXG52YXIgc3luY1N1YnMgPSBbXTtcclxuXHJcbi8vIGRvbid0IHN5bmMgd2hpbGUgd2UgYXJlIHN5bmNpbmdcclxudmFyIGlzU3luY2luZyA9IGZhbHNlO1xyXG52YXIgc3luY0FnYWluID0gZmFsc2U7XHJcblxyXG4vLyBhZGQgYSBjaGFuZ2UgdG8gdGhlIHN5bmMgcXVldWVcclxudmFyIGVucXVldWVDaGFuZ2UgPSBjaGFuZ2UgPT4ge1xyXG5cdC8vIGxvYWQgdGhlIHF1ZXVlXHJcblx0cmV0dXJuIHN5bmNTdG9yZS5nZXQoXCJjaGFuZ2UtcXVldWVcIilcclxuXHJcblx0LnRoZW4oKHtjaGFuZ2VzID0gW119ID0ge30pID0+IHtcclxuXHRcdC8vIGdldCB0aGUgaWQgZm9yIHRoZSBjaGFuZ2VcclxuXHRcdHZhciBjaElkID0gY2hhbmdlLnR5cGUgPT0gXCJkZWxldGVcIiA/IGNoYW5nZS5pZCA6IGNoYW5nZS5kYXRhLmlkO1xyXG5cclxuXHRcdHZhciBleGlzdGluZyA9IGNoYW5nZXMuZmluZEluZGV4KGNoID0+XHJcblx0XHRcdGNoLnR5cGUgPT0gXCJkZWxldGVcIiA/IGNoLmlkID09IGNoSWQgOiBjaC5kYXRhLmlkID09IGNoSWQpO1xyXG5cclxuXHRcdC8vIHJlbW92ZSB0aGUgZXhpc3RpbmcgY2hhbmdlXHJcblx0XHRpZihleGlzdGluZyAhPT0gLTEpIHtcclxuXHRcdFx0Y2hhbmdlcy5zcGxpY2UoZXhpc3RpbmcsIDEpO1xyXG5cdFx0fVxyXG5cclxuXHRcdC8vIGFkZCB0aGUgY2hhbmdlIHRvIHRoZSBxdWV1ZVxyXG5cdFx0Y2hhbmdlcy5wdXNoKGNoYW5nZSk7XHJcblxyXG5cdFx0Ly8gc2F2ZSB0aGUgcXVldWVcclxuXHRcdHJldHVybiBzeW5jU3RvcmUuc2V0KHtcclxuXHRcdFx0aWQ6IFwiY2hhbmdlLXF1ZXVlXCIsXHJcblx0XHRcdGNoYW5nZXNcclxuXHRcdH0pO1xyXG5cdH0pXHJcblxyXG5cdC8vIHN5bmMgd2hlbiBpZGxlXHJcblx0LnRoZW4oKCkgPT4gaWRsZShzeW5jZXIuc3luYykpO1xyXG59O1xyXG5cclxuLy8gYWRkIGEgc3luYyBsaXN0ZW5lciB0byBhIGRhdGEgc3RvcmVcclxudmFyIG9uU3luYyA9IGZ1bmN0aW9uKGRzLCBuYW1lLCBmbikge1xyXG5cdHN5bmNTdWJzLnB1c2goZHMub24oXCJzeW5jLVwiICsgbmFtZSwgZm4pKTtcclxufTtcclxuXHJcbi8vIHdoZW4gYSBkYXRhIHN0b3JlIGlzIG9wZW5lZCBsaXN0ZW4gZm9yIGNoYW5nZXNcclxubGlmZUxpbmUub24oXCJkYXRhLXN0b3JlLWNyZWF0ZWRcIiwgZHMgPT4ge1xyXG5cdC8vIGRvbid0IHN5bmMgdGhlIHN5bmMgc3RvcmVcclxuXHRpZihkcy5uYW1lID09IFwic3luYy1zdG9yZVwiKSByZXR1cm47XHJcblxyXG5cdC8vIGNyZWF0ZSBhbmQgZW5xdWV1ZSBhIHB1dCBjaGFuZ2VcclxuXHRvblN5bmMoZHMsIFwicHV0XCIsICh2YWx1ZSwgaXNOZXcpID0+IHtcclxuXHRcdGVucXVldWVDaGFuZ2Uoe1xyXG5cdFx0XHRzdG9yZTogZHMubmFtZSxcclxuXHRcdFx0dHlwZTogaXNOZXcgPyBcImNyZWF0ZVwiIDogXCJwdXRcIixcclxuXHRcdFx0ZGF0YTogdmFsdWVcclxuXHRcdH0pO1xyXG5cdH0pO1xyXG5cclxuXHQvLyBjcmVhdGUgYW5kIGVucXVldWUgYSBkZWxldGUgY2hhbmdlXHJcblx0b25TeW5jKGRzLCBcImRlbGV0ZVwiLCBpZCA9PiB7XHJcblx0XHRlbnF1ZXVlQ2hhbmdlKHtcclxuXHRcdFx0c3RvcmU6IGRzLm5hbWUsXHJcblx0XHRcdHR5cGU6IFwiZGVsZXRlXCIsXHJcblx0XHRcdGlkLFxyXG5cdFx0XHR0aW1lc3RhbXA6IERhdGUubm93KClcclxuXHRcdH0pO1xyXG5cdH0pO1xyXG59KTtcclxuXHJcbi8vIHdhaXQgZm9yIHNvbWUgaWRsZSB0aW1lXHJcbnZhciBpZGxlID0gZm4gPT4ge1xyXG5cdGlmKHR5cGVvZiByZXF1ZXN0SWRsZUNhbGxiYWNrID09IFwiZnVuY3Rpb25cIikge1xyXG5cdFx0cmVxdWVzdElkbGVDYWxsYmFjayhmbik7XHJcblx0fVxyXG5cdGVsc2Uge1xyXG5cdFx0c2V0VGltZW91dChmbiwgMTAwKTtcclxuXHR9XHJcbn07XHJcblxyXG4vLyBzeW5jIHdpdGggdGhlIHNlcnZlclxyXG5zeW5jZXIuc3luYyA9IGZ1bmN0aW9uKCkge1xyXG5cdC8vIGRvbid0IHN5bmMgd2hpbGUgb2ZmbGluZVxyXG5cdGlmKG5hdmlnYXRvci5vbmxpbmUpIHtcclxuXHRcdHJldHVybjtcclxuXHR9XHJcblxyXG5cdC8vIG9ubHkgZG8gb25lIHN5bmMgYXQgYSB0aW1lXHJcblx0aWYoaXNTeW5jaW5nKSB7XHJcblx0XHRzeW5jQWdhaW4gPSB0cnVlO1xyXG5cdFx0cmV0dXJuO1xyXG5cdH1cclxuXHJcblx0aXNTeW5jaW5nID0gdHJ1ZTtcclxuXHJcblx0c3luY2VyLmVtaXQoXCJzeWNuLXN0YXJ0XCIpO1xyXG5cclxuXHQvLyBsb2FkIHRoZSBjaGFuZ2UgcXVldWVcclxuXHR2YXIgcHJvbWlzZXMgPSBbXHJcblx0XHRzeW5jU3RvcmUuZ2V0KFwiY2hhbmdlLXF1ZXVlXCIpLnRoZW4oKHtjaGFuZ2VzID0gW119ID0ge30pID0+IGNoYW5nZXMpXHJcblx0XTtcclxuXHJcblx0Ly8gbG9hZCBhbGwgaWRzXHJcblx0Zm9yKGxldCBzdG9yZU5hbWUgb2YgU1RPUkVTKSB7XHJcblx0XHRwcm9taXNlcy5wdXNoKFxyXG5cdFx0XHRkYXRhU3RvcmUoc3RvcmVOYW1lKVxyXG5cdFx0XHRcdC5nZXRBbGwoKVxyXG5cdFx0XHRcdC50aGVuKGl0ZW1zID0+IHtcclxuXHRcdFx0XHRcdHZhciBkYXRlcyA9IHt9O1xyXG5cclxuXHRcdFx0XHRcdC8vIG1hcCBtb2RpZmllZCBkYXRlIHRvIHRoZSBpZFxyXG5cdFx0XHRcdFx0aXRlbXMuZm9yRWFjaChpdGVtID0+IGRhdGVzW2l0ZW0uaWRdID0gaXRlbS5tb2RpZmllZCk7XHJcblxyXG5cdFx0XHRcdFx0cmV0dXJuIFtzdG9yZU5hbWUsIGRhdGVzXTtcclxuXHRcdFx0XHR9KVxyXG5cdFx0KTtcclxuXHR9XHJcblxyXG5cdFByb21pc2UuYWxsKHByb21pc2VzKS50aGVuKChbY2hhbmdlcywgLi4ubW9kaWZpZWRzXSkgPT4ge1xyXG5cdFx0Ly8gY29udmVydCBtb2RpZmllZHMgdG8gYW4gb2JqZWN0XHJcblx0XHR2YXIgbW9kaWZpZWRzT2JqID0ge307XHJcblxyXG5cdFx0bW9kaWZpZWRzLmZvckVhY2gobW9kaWZpZWQgPT4gbW9kaWZpZWRzT2JqW21vZGlmaWVkWzBdXSA9IG1vZGlmaWVkWzFdKTtcclxuXHJcblx0XHQvLyBzZW5kIHRoZSBjaGFuZ2VzIHRvIHRoZSBzZXJ2ZXJcclxuXHRcdHJldHVybiBmZXRjaChcIi9hcGkvZGF0YS9cIiwge1xyXG5cdFx0XHRtZXRob2Q6IFwiUE9TVFwiLFxyXG5cdFx0XHRjcmVkZW50aWFsczogXCJpbmNsdWRlXCIsXHJcblx0XHRcdGJvZHk6IEpTT04uc3RyaW5naWZ5KHtcclxuXHRcdFx0XHRjaGFuZ2VzLFxyXG5cdFx0XHRcdG1vZGlmaWVkczogbW9kaWZpZWRzT2JqXHJcblx0XHRcdH0pXHJcblx0XHR9KTtcclxuXHR9KVxyXG5cclxuXHQvLyBwYXJzZSB0aGUgYm9keVxyXG5cdC50aGVuKHJlcyA9PiByZXMuanNvbigpKVxyXG5cclxuXHQvLyBjYXRjaCBhbnkgbmV0d29yayBlcnJvcnNcclxuXHQuY2F0Y2goKCkgPT4gKHsgc3RhdHVzOiBcImZhaWxcIiwgZGF0YTogeyByZWFzb246IFwibmV0d29yay1lcnJvclwiIH0gfSkpXHJcblxyXG5cdC50aGVuKCh7c3RhdHVzLCBkYXRhOiByZXN1bHRzLCByZWFzb259KSA9PiB7XHJcblx0XHQvLyBjYXRjaCBhbnkgZXJyb3JcclxuXHRcdGlmKHN0YXR1cyA9PSBcImZhaWxcIikge1xyXG5cdFx0XHQvLyBsb2cgdGhlIHVzZXIgaW5cclxuXHRcdFx0aWYocmVzdWx0cy5yZWFzb24gPT0gXCJsb2dnZWQtb3V0XCIpIHtcclxuXHRcdFx0XHRsaWZlTGluZS5uYXYubmF2aWdhdGUoXCIvbG9naW5cIik7XHJcblx0XHRcdH1cclxuXHJcblx0XHRcdHJldHVybjtcclxuXHRcdH1cclxuXHJcblx0XHQvLyBjbGVhciB0aGUgY2hhbmdlIHF1ZXVlXHJcblx0XHRyZXN1bHRzLnVuc2hpZnQoXHJcblx0XHRcdHN5bmNTdG9yZS5zZXQoe1xyXG5cdFx0XHRcdGlkOiBcImNoYW5nZS1xdWV1ZVwiLFxyXG5cdFx0XHRcdGNoYW5nZXM6IFtdXHJcblx0XHRcdH0pXHJcblx0XHQpO1xyXG5cclxuXHRcdC8vIGFwcGx5IHRoZSByZXN1bHRzXHJcblx0XHRyZXR1cm4gUHJvbWlzZS5hbGwoXHJcblx0XHRcdHJlc3VsdHMubWFwKChyZXN1bHQsIGluZGV4KSA9PiB7XHJcblx0XHRcdFx0Ly8gZmlyc3QgcmVzdWx0IGlzIHRoZSBwcm9taXNlIHRvIHJlc2V0IHRoZSBjaGFuZ2UgcXVldWVcclxuXHRcdFx0XHRpZihpbmRleCA9PT0gMCkgcmV0dXJuIHJlc3VsdDtcclxuXHJcblx0XHRcdFx0Ly8gZGVsZXRlIHRoZSBsb2NhbCBjb3B5XHJcblx0XHRcdFx0aWYocmVzdWx0LmNvZGUgPT0gXCJpdGVtLWRlbGV0ZWRcIikge1xyXG5cdFx0XHRcdFx0bGV0IHN0b3JlID0gZGF0YVN0b3JlKHJlc3VsdC5zdG9yZSk7XHJcblxyXG5cdFx0XHRcdFx0cmV0dXJuIHN0b3JlLnJlbW92ZShyZXN1bHQuaWQsIHN5bmNTdWJzKTtcclxuXHRcdFx0XHR9XHJcblx0XHRcdFx0Ly8gc2F2ZSB0aGUgbmV3ZXIgdmVyc2lvbiBmcm9tIHRoZSBzZXJ2ZXJcclxuXHRcdFx0XHRlbHNlIGlmKHJlc3VsdC5jb2RlID09IFwibmV3ZXItdmVyc2lvblwiKSB7XHJcblx0XHRcdFx0XHRsZXQgc3RvcmUgPSBkYXRhU3RvcmUocmVzdWx0LnN0b3JlKTtcclxuXHJcblx0XHRcdFx0XHRyZXR1cm4gc3RvcmUuc2V0KHJlc3VsdC5kYXRhLCBzeW5jU3VicywgeyBzYXZlTm93OiB0cnVlIH0pO1xyXG5cdFx0XHRcdH1cclxuXHRcdFx0fSlcclxuXHRcdCk7XHJcblx0fSlcclxuXHJcblx0LnRoZW4oKCkgPT4ge1xyXG5cdFx0Ly8gcmVsZWFzZSB0aGUgbG9ja1xyXG5cdFx0aXNTeW5jaW5nID0gZmFsc2U7XHJcblxyXG5cdFx0Ly8gdGhlcmUgd2FzIGFuIGF0dGVtcHQgdG8gc3luYyB3aGlsZSB3ZSB3aGVyZSBzeW5jaW5nXHJcblx0XHRpZihzeW5jQWdhaW4pIHtcclxuXHRcdFx0c3luY0FnYWluID0gZmFsc2U7XHJcblxyXG5cdFx0XHRpZGxlKHN5bmNlci5zeW5jKTtcclxuXHRcdH1cclxuXHJcblx0XHRzeW5jZXIuZW1pdChcInN5bmMtY29tcGxldGVcIik7XHJcblx0fSk7XHJcbn07XHJcblxyXG4vLyBkb24ndCBhZGQgZXZlbnQgbGlzdGVuZXJzIGluIHRoZSBzZXJ2aWNlIHdvcmtlclxyXG5pZih0eXBlb2Ygd2luZG93ID09IFwib2JqZWN0XCIpIHtcclxuXHQvLyB3aGVuIHdlIGNvbWUgYmFjayBvbiBsaW5lIHN5bmNcclxuXHR3aW5kb3cuYWRkRXZlbnRMaXN0ZW5lcihcIm9ubGluZVwiLCAoKSA9PiBzeW5jZXIuc3luYygpKTtcclxuXHJcblx0Ly8gd2hlbiB0aGUgdXNlciBuYXZpZ2F0ZXMgYmFjayBzeW5jXHJcblx0d2luZG93LmFkZEV2ZW50TGlzdGVuZXIoXCJ2aXNpYmlsaXR5Y2hhbmdlXCIsICgpID0+IHtcclxuXHRcdGlmKCFkb2N1bWVudC5oaWRkZW4pIHtcclxuXHRcdFx0c3luY2VyLnN5bmMoKTtcclxuXHRcdH1cclxuXHR9KTtcclxuXHJcblx0Ly8gc3luYyBvbiBzdGFydHVwXHJcblx0c3luY2VyLnN5bmMoKTtcclxufVxyXG4iLCIvKipcclxuICogQSBoZWxwZXIgZm9yIGJ1aWxkaW5nIGRvbSBub2Rlc1xyXG4gKi9cclxuXHJcbmNvbnN0IFNWR19FTEVNRU5UUyA9IFtcInN2Z1wiLCBcImxpbmVcIl07XHJcbmNvbnN0IFNWR19OQU1FU1BBQ0UgPSBcImh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnXCI7XHJcblxyXG4vLyBidWlsZCBhIHNpbmdsZSBkb20gbm9kZVxyXG52YXIgbWFrZURvbSA9IGZ1bmN0aW9uKG9wdHMgPSB7fSkge1xyXG5cdC8vIGdldCBvciBjcmVhdGUgdGhlIG5hbWUgbWFwcGluZ1xyXG5cdHZhciBtYXBwZWQgPSBvcHRzLm1hcHBlZCB8fCB7fTtcclxuXHJcblx0dmFyICRlbDtcclxuXHJcblx0Ly8gdGhlIGVsZW1lbnQgaXMgcGFydCBvZiB0aGUgc3ZnIG5hbWVzcGFjZVxyXG5cdGlmKFNWR19FTEVNRU5UUy5pbmRleE9mKG9wdHMudGFnKSAhPT0gLTEpIHtcclxuXHRcdCRlbCA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnROUyhTVkdfTkFNRVNQQUNFLCBvcHRzLnRhZyk7XHJcblx0fVxyXG5cdC8vIGEgcGxhaW4gZWxlbWVudFxyXG5cdGVsc2Uge1xyXG5cdFx0JGVsID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudChvcHRzLnRhZyB8fCBcImRpdlwiKTtcclxuXHR9XHJcblxyXG5cdC8vIHNldCB0aGUgY2xhc3Nlc1xyXG5cdGlmKG9wdHMuY2xhc3Nlcykge1xyXG5cdFx0JGVsLnNldEF0dHJpYnV0ZShcImNsYXNzXCIsIHR5cGVvZiBvcHRzLmNsYXNzZXMgPT0gXCJzdHJpbmdcIiA/IG9wdHMuY2xhc3NlcyA6IG9wdHMuY2xhc3Nlcy5qb2luKFwiIFwiKSk7XHJcblx0fVxyXG5cclxuXHQvLyBhdHRhY2ggdGhlIGF0dHJpYnV0ZXNcclxuXHRpZihvcHRzLmF0dHJzKSB7XHJcblx0XHRPYmplY3QuZ2V0T3duUHJvcGVydHlOYW1lcyhvcHRzLmF0dHJzKVxyXG5cclxuXHRcdC5mb3JFYWNoKGF0dHIgPT4gJGVsLnNldEF0dHJpYnV0ZShhdHRyLCBvcHRzLmF0dHJzW2F0dHJdKSk7XHJcblx0fVxyXG5cclxuXHQvLyBzZXQgdGhlIHRleHQgY29udGVudFxyXG5cdGlmKG9wdHMudGV4dCkge1xyXG5cdFx0JGVsLmlubmVyVGV4dCA9IG9wdHMudGV4dDtcclxuXHR9XHJcblxyXG5cdC8vIGF0dGFjaCB0aGUgbm9kZSB0byBpdHMgcGFyZW50XHJcblx0aWYob3B0cy5wYXJlbnQpIHtcclxuXHRcdG9wdHMucGFyZW50Lmluc2VydEJlZm9yZSgkZWwsIG9wdHMuYmVmb3JlKTtcclxuXHR9XHJcblxyXG5cdC8vIGFkZCBldmVudCBsaXN0ZW5lcnNcclxuXHRpZihvcHRzLm9uKSB7XHJcblx0XHRmb3IobGV0IG5hbWUgb2YgT2JqZWN0LmdldE93blByb3BlcnR5TmFtZXMob3B0cy5vbikpIHtcclxuXHRcdFx0JGVsLmFkZEV2ZW50TGlzdGVuZXIobmFtZSwgb3B0cy5vbltuYW1lXSk7XHJcblxyXG5cdFx0XHQvLyBhdHRhY2ggdGhlIGRvbSB0byBhIGRpc3Bvc2FibGVcclxuXHRcdFx0aWYob3B0cy5kaXNwKSB7XHJcblx0XHRcdFx0b3B0cy5kaXNwLmFkZCh7XHJcblx0XHRcdFx0XHR1bnN1YnNjcmliZTogKCkgPT4gJGVsLnJlbW92ZUV2ZW50TGlzdGVuZXIobmFtZSwgb3B0cy5vbltuYW1lXSlcclxuXHRcdFx0XHR9KTtcclxuXHRcdFx0fVxyXG5cdFx0fVxyXG5cdH1cclxuXHJcblx0Ly8gc2V0IHRoZSB2YWx1ZSBvZiBhbiBpbnB1dCBlbGVtZW50XHJcblx0aWYob3B0cy52YWx1ZSkge1xyXG5cdFx0JGVsLnZhbHVlID0gb3B0cy52YWx1ZTtcclxuXHR9XHJcblxyXG5cdC8vIGFkZCB0aGUgbmFtZSBtYXBwaW5nXHJcblx0aWYob3B0cy5uYW1lKSB7XHJcblx0XHRtYXBwZWRbb3B0cy5uYW1lXSA9ICRlbDtcclxuXHR9XHJcblxyXG5cdC8vIGNyZWF0ZSB0aGUgY2hpbGQgZG9tIG5vZGVzXHJcblx0aWYob3B0cy5jaGlsZHJlbikge1xyXG5cdFx0Zm9yKGxldCBjaGlsZCBvZiBvcHRzLmNoaWxkcmVuKSB7XHJcblx0XHRcdC8vIG1ha2UgYW4gYXJyYXkgaW50byBhIGdyb3VwIE9iamVjdFxyXG5cdFx0XHRpZihBcnJheS5pc0FycmF5KGNoaWxkKSkge1xyXG5cdFx0XHRcdGNoaWxkID0ge1xyXG5cdFx0XHRcdFx0Z3JvdXA6IGNoaWxkXHJcblx0XHRcdFx0fTtcclxuXHRcdFx0fVxyXG5cclxuXHRcdFx0Ly8gYXR0YWNoIGluZm9ybWF0aW9uIGZvciB0aGUgZ3JvdXBcclxuXHRcdFx0Y2hpbGQucGFyZW50ID0gJGVsO1xyXG5cdFx0XHRjaGlsZC5kaXNwID0gb3B0cy5kaXNwO1xyXG5cdFx0XHRjaGlsZC5tYXBwZWQgPSBtYXBwZWQ7XHJcblxyXG5cdFx0XHQvLyBidWlsZCB0aGUgbm9kZSBvciBncm91cFxyXG5cdFx0XHRtYWtlKGNoaWxkKTtcclxuXHRcdH1cclxuXHR9XHJcblxyXG5cdHJldHVybiBtYXBwZWQ7XHJcbn1cclxuXHJcbi8vIGJ1aWxkIGEgZ3JvdXAgb2YgZG9tIG5vZGVzXHJcbnZhciBtYWtlR3JvdXAgPSBmdW5jdGlvbihncm91cCkge1xyXG5cdC8vIHNob3J0aGFuZCBmb3IgYSBncm91cHNcclxuXHRpZihBcnJheS5pc0FycmF5KGdyb3VwKSkge1xyXG5cdFx0Z3JvdXAgPSB7XHJcblx0XHRcdGNoaWxkcmVuOiBncm91cFxyXG5cdFx0fTtcclxuXHR9XHJcblxyXG5cdC8vIGdldCBvciBjcmVhdGUgdGhlIG5hbWUgbWFwcGluZ1xyXG5cdHZhciBtYXBwZWQgPSB7fTtcclxuXHJcblx0Zm9yKGxldCBub2RlIG9mIGdyb3VwLmdyb3VwKSB7XHJcblx0XHQvLyBjb3B5IG92ZXIgcHJvcGVydGllcyBmcm9tIHRoZSBncm91cFxyXG5cdFx0bm9kZS5wYXJlbnQgfHwgKG5vZGUucGFyZW50ID0gZ3JvdXAucGFyZW50KTtcclxuXHRcdG5vZGUuZGlzcCB8fCAobm9kZS5kaXNwID0gZ3JvdXAuZGlzcCk7XHJcblx0XHRub2RlLm1hcHBlZCA9IG1hcHBlZDtcclxuXHJcblx0XHQvLyBtYWtlIHRoZSBkb21cclxuXHRcdG1ha2Uobm9kZSk7XHJcblx0fVxyXG5cclxuXHQvLyBjYWxsIHRoZSBjYWxsYmFjayB3aXRoIHRoZSBtYXBwZWQgbmFtZXNcclxuXHRpZihncm91cC5iaW5kKSB7XHJcblx0XHR2YXIgc3Vic2NyaXB0aW9uID0gZ3JvdXAuYmluZChtYXBwZWQpO1xyXG5cclxuXHRcdC8vIGlmIHRoZSByZXR1cm4gYSBzdWJzY3JpcHRpb24gYXR0YWNoIGl0IHRvIHRoZSBkaXNwb3NhYmxlXHJcblx0XHRpZihzdWJzY3JpcHRpb24gJiYgZ3JvdXAuZGlzcCkge1xyXG5cdFx0XHRncm91cC5kaXNwLmFkZChzdWJzY3JpcHRpb24pO1xyXG5cdFx0fVxyXG5cdH1cclxuXHJcblx0cmV0dXJuIG1hcHBlZDtcclxufTtcclxuXHJcbi8vIGEgY29sbGVjdGlvbiBvZiB3aWRnZXRzXHJcbnZhciB3aWRnZXRzID0ge307XHJcblxyXG52YXIgbWFrZSA9IG1vZHVsZS5leHBvcnRzID0gZnVuY3Rpb24ob3B0cykge1xyXG5cdC8vIGhhbmRsZSBhIGdyb3VwXHJcblx0aWYoQXJyYXkuaXNBcnJheShvcHRzKSB8fCBvcHRzLmdyb3VwKSB7XHJcblx0XHRyZXR1cm4gbWFrZUdyb3VwKG9wdHMpO1xyXG5cdH1cclxuXHQvLyBtYWtlIGEgd2lkZ2V0XHJcblx0ZWxzZSBpZihvcHRzLndpZGdldCkge1xyXG5cdFx0dmFyIHdpZGdldCA9IHdpZGdldHNbb3B0cy53aWRnZXRdO1xyXG5cclxuXHRcdC8vIG5vdCBkZWZpbmVkXHJcblx0XHRpZighd2lkZ2V0KSB7XHJcblx0XHRcdHRocm93IG5ldyBFcnJvcihgV2lkZ2V0ICcke29wdHMud2lkZ2V0fScgaXMgbm90IGRlZmluZWQgbWFrZSBzdXJlIGl0cyBiZWVuIGltcG9ydGVkYCk7XHJcblx0XHR9XHJcblxyXG5cdFx0Ly8gZ2VuZXJhdGUgdGhlIHdpZGdldCBjb250ZW50XHJcblx0XHR2YXIgYnVpbHQgPSB3aWRnZXQubWFrZShvcHRzKTtcclxuXHJcblx0XHRyZXR1cm4gbWFrZUdyb3VwKHtcclxuXHRcdFx0cGFyZW50OiBvcHRzLnBhcmVudCxcclxuXHRcdFx0ZGlzcDogb3B0cy5kaXNwLFxyXG5cdFx0XHRncm91cDogQXJyYXkuaXNBcnJheShidWlsdCkgPyBidWlsdCA6IFtidWlsdF0sXHJcblx0XHRcdGJpbmQ6IHdpZGdldC5iaW5kICYmIHdpZGdldC5iaW5kLmJpbmQod2lkZ2V0LCBvcHRzKVxyXG5cdFx0fSk7XHJcblx0fVxyXG5cdC8vIG1ha2UgYSBzaW5nbGUgbm9kZVxyXG5cdGVsc2Uge1xyXG5cdFx0cmV0dXJuIG1ha2VEb20ob3B0cyk7XHJcblx0fVxyXG59O1xyXG5cclxuLy8gcmVnaXN0ZXIgYSB3aWRnZXRcclxubWFrZS5yZWdpc3RlciA9IGZ1bmN0aW9uKG5hbWUsIHdpZGdldCkge1xyXG5cdHdpZGdldHNbbmFtZV0gPSB3aWRnZXQ7XHJcbn07XHJcbiIsIi8qKlxyXG4gKiBBIGJhc2ljIGtleSB2YWx1ZSBkYXRhIHN0b3JlXHJcbiAqL1xyXG5cclxuY2xhc3MgS2V5VmFsdWVTdG9yZSBleHRlbmRzIGxpZmVMaW5lLkV2ZW50RW1pdHRlciB7XHJcblx0Y29uc3RydWN0b3IoYWRhcHRlcikge1xyXG5cdFx0c3VwZXIoKTtcclxuXHRcdHRoaXMuX2FkYXB0ZXIgPSBhZGFwdGVyO1xyXG5cclxuXHRcdC8vIG1ha2Ugc3VyZSB3ZSBoYXZlIGFuIGFkYXB0ZXJcclxuXHRcdGlmKCFhZGFwdGVyKSB7XHJcblx0XHRcdHRocm93IG5ldyBFcnJvcihcIktleVZhbHVlU3RvcmUgbXVzdCBiZSBpbml0aWFsaXplZCB3aXRoIGFuIGFkYXB0ZXJcIilcclxuXHRcdH1cclxuXHR9XHJcblxyXG5cdC8qKlxyXG5cdCAqIEdldCB0aGUgY29ycmlzcG9uZGluZyB2YWx1ZSBvdXQgb2YgdGhlIGRhdGEgc3RvcmUgb3RoZXJ3aXNlIHJldHVybiBkZWZhdWx0XHJcblx0ICovXHJcblx0Z2V0KGtleSwgX2RlZmF1bHQpIHtcclxuXHRcdC8vIGNoZWNrIGlmIHRoaXMgdmFsdWUgaGFzIGJlZW4gb3ZlcnJpZGVuXHJcblx0XHRpZih0aGlzLl9vdmVycmlkZXMgJiYgdGhpcy5fb3ZlcnJpZGVzLmhhc093blByb3BlcnR5KGtleSkpIHtcclxuXHRcdFx0cmV0dXJuIFByb21pc2UucmVzb2x2ZSh0aGlzLl9vdmVycmlkZXNba2V5XSk7XHJcblx0XHR9XHJcblxyXG5cdFx0cmV0dXJuIHRoaXMuX2FkYXB0ZXIuZ2V0KGtleSlcclxuXHJcblx0XHQudGhlbihyZXN1bHQgPT4ge1xyXG5cdFx0XHQvLyB0aGUgaXRlbSBpcyBub3QgZGVmaW5lZFxyXG5cdFx0XHRpZighcmVzdWx0KSB7XHJcblx0XHRcdFx0cmV0dXJuIF9kZWZhdWx0O1xyXG5cdFx0XHR9XHJcblxyXG5cdFx0XHRyZXR1cm4gcmVzdWx0LnZhbHVlO1xyXG5cdFx0fSk7XHJcblx0fVxyXG5cclxuXHQvKipcclxuXHQgKiBTZXQgYSBzaW5nbGUgdmFsdWUgb3Igc2V2ZXJhbCB2YWx1ZXNcclxuXHQgKlxyXG5cdCAqIGtleSAtPiB2YWx1ZVxyXG5cdCAqIG9yXHJcblx0ICogeyBrZXk6IHZhbHVlIH1cclxuXHQgKi9cclxuXHRzZXQoa2V5LCB2YWx1ZSkge1xyXG5cdFx0Ly8gc2V0IGEgc2luZ2xlIHZhbHVlXHJcblx0XHRpZih0eXBlb2Yga2V5ID09IFwic3RyaW5nXCIpIHtcclxuXHRcdFx0dmFyIHByb21pc2UgPSB0aGlzLl9hZGFwdGVyLnNldCh7XHJcblx0XHRcdFx0aWQ6IGtleSxcclxuXHRcdFx0XHR2YWx1ZSxcclxuXHRcdFx0XHRtb2RpZmllZDogRGF0ZS5ub3coKVxyXG5cdFx0XHR9KTtcclxuXHJcblx0XHRcdC8vIHRyaWdnZXIgdGhlIGNoYW5nZVxyXG5cdFx0XHR0aGlzLmVtaXQoa2V5LCB2YWx1ZSk7XHJcblxyXG5cdFx0XHRyZXR1cm4gcHJvbWlzZTtcclxuXHRcdH1cclxuXHRcdC8vIHNldCBzZXZlcmFsIHZhbHVlc1xyXG5cdFx0ZWxzZSB7XHJcblx0XHRcdC8vIHRlbGwgdGhlIGNhbGxlciB3aGVuIHdlIGFyZSBkb25lXHJcblx0XHRcdGxldCBwcm9taXNlcyA9IFtdO1xyXG5cclxuXHRcdFx0Zm9yKGxldCBfa2V5IG9mIE9iamVjdC5nZXRPd25Qcm9wZXJ0eU5hbWVzKGtleSkpIHtcclxuXHRcdFx0XHRwcm9taXNlcy5wdXNoKFxyXG5cdFx0XHRcdFx0dGhpcy5fYWRhcHRlci5zZXQoe1xyXG5cdFx0XHRcdFx0XHRpZDogX2tleSxcclxuXHRcdFx0XHRcdFx0dmFsdWU6IGtleVtfa2V5XSxcclxuXHRcdFx0XHRcdFx0bW9kaWZpZWQ6IERhdGUubm93KClcclxuXHRcdFx0XHRcdH0pXHJcblx0XHRcdFx0KTtcclxuXHJcblx0XHRcdFx0Ly8gdHJpZ2dlciB0aGUgY2hhbmdlXHJcblx0XHRcdFx0dGhpcy5lbWl0KF9rZXksIGtleVtfa2V5XSk7XHJcblx0XHRcdH1cclxuXHJcblx0XHRcdHJldHVybiBQcm9taXNlLmFsbChwcm9taXNlcyk7XHJcblx0XHR9XHJcblx0fVxyXG5cclxuXHQgLyoqXHJcblx0ICAqIFdhdGNoIHRoZSB2YWx1ZSBmb3IgY2hhbmdlc1xyXG5cdCAgKlxyXG5cdCAgKiBvcHRzLmN1cnJlbnQgLSBzZW5kIHRoZSBjdXJyZW50IHZhbHVlIG9mIGtleSAoZGVmYXVsdDogZmFsc2UpXHJcblx0ICAqIG9wdHMuZGVmYXVsdCAtIHRoZSBkZWZhdWx0IHZhbHVlIHRvIHNlbmQgZm9yIG9wdHMuY3VycmVudFxyXG5cdCAgKi9cclxuXHQgd2F0Y2goa2V5LCBvcHRzLCBmbikge1xyXG5cdFx0IC8vIG1ha2Ugb3B0cyBvcHRpb25hbFxyXG5cdFx0IGlmKHR5cGVvZiBvcHRzID09IFwiZnVuY3Rpb25cIikge1xyXG5cdFx0XHQgZm4gPSBvcHRzO1xyXG5cdFx0XHQgb3B0cyA9IHt9O1xyXG5cdFx0IH1cclxuXHJcblx0XHQgLy8gc2VuZCB0aGUgY3VycmVudCB2YWx1ZVxyXG5cdFx0IGlmKG9wdHMuY3VycmVudCkge1xyXG5cdFx0XHQgdGhpcy5nZXQoa2V5LCBvcHRzLmRlZmF1bHQpXHJcblx0XHRcdCBcdC50aGVuKHZhbHVlID0+IGZuKHZhbHVlKSk7XHJcblx0XHQgfVxyXG5cclxuXHRcdCAvLyBsaXN0ZW4gZm9yIGFueSBjaGFuZ2VzXHJcblx0XHQgcmV0dXJuIHRoaXMub24oa2V5LCB2YWx1ZSA9PiB7XHJcblx0XHRcdCAvLyBvbmx5IGVtaXQgdGhlIGNoYW5nZSBpZiB0aGVyZSBpcyBub3QgYW4gb3ZlcnJpZGUgaW4gcGxhY2VcclxuXHRcdFx0IGlmKCF0aGlzLl9vdmVycmlkZXMgfHwgIXRoaXMuX292ZXJyaWRlcy5oYXNPd25Qcm9wZXJ0eShrZXkpKSB7XHJcblx0XHRcdFx0IGZuKHZhbHVlKTtcclxuXHRcdFx0IH1cclxuXHRcdCB9KTtcclxuXHQgfVxyXG5cclxuXHQgLyoqXHJcblx0ICAqIE92ZXJyaWRlIHRoZSB2YWx1ZXMgZnJvbSB0aGUgYWRhcHRvciB3aXRob3V0IHdyaXRpbmcgdG8gdGhlbVxyXG5cdCAgKlxyXG5cdCAgKiBVc2VmdWwgZm9yIGNvbWJpbmluZyBqc29uIHNldHRpbmdzIHdpdGggY29tbWFuZCBsaW5lIGZsYWdzXHJcblx0ICAqL1xyXG5cdCBzZXRPdmVycmlkZXMob3ZlcnJpZGVzKSB7XHJcblx0XHQgdGhpcy5fb3ZlcnJpZGVzID0gb3ZlcnJpZGVzO1xyXG5cclxuXHRcdCAvLyBlbWl0IGNoYW5nZXMgZm9yIGVhY2ggb2YgdGhlIG92ZXJyaWRlc1xyXG5cdFx0IE9iamVjdC5nZXRPd25Qcm9wZXJ0eU5hbWVzKG92ZXJyaWRlcylcclxuXHJcblx0XHQgLmZvckVhY2goa2V5ID0+IHRoaXMuZW1pdChrZXksIG92ZXJyaWRlc1trZXldKSk7XHJcblx0IH1cclxufVxyXG5cclxubW9kdWxlLmV4cG9ydHMgPSBLZXlWYWx1ZVN0b3JlO1xyXG4iLCIvKipcclxuICogQW4gaW4gbWVtb3J5IGFkYXB0ZXIgZm9yIGRhdGEgc3RvcmVzXHJcbiAqL1xyXG5cclxuY2xhc3MgTWVtQWRhcHRvciB7XHJcblx0Y29uc3RydWN0b3IoKSB7XHJcblx0XHR0aGlzLl9kYXRhID0ge307XHJcblx0fVxyXG5cclxuXHQvKipcclxuXHQgKiBHZXQgYW4gYXJyYXkgb2YgdmFsdWVzXHJcblx0ICovXHJcblx0Z2V0QWxsKCkge1xyXG5cdFx0cmV0dXJuIFByb21pc2UucmVzb2x2ZShcclxuXHRcdFx0T2JqZWN0LmdldE93blByb3BlcnR5TmFtZXModGhpcy5fZGF0YSlcclxuXHJcblx0XHRcdC5tYXAobmFtZSA9PiB0aGlzLl9kYXRhW25hbWVdKVxyXG5cdFx0KTtcclxuXHR9XHJcblxyXG5cdC8qKlxyXG5cdCAqIExvb2t1cCBhIHZhbHVlXHJcblx0ICpcclxuXHQgKiByZXR1cm5zIHtpZCwgdmFsdWV9XHJcblx0ICovXHJcblx0Z2V0KGlkKSB7XHJcblx0XHQvLyBjaGVjayBpZiB3ZSBoYXZlIHRoZSB2YWx1ZVxyXG5cdFx0aWYodGhpcy5fZGF0YS5oYXNPd25Qcm9wZXJ0eShpZCkpIHtcclxuXHRcdFx0cmV0dXJuIFByb21pc2UucmVzb2x2ZSh0aGlzLl9kYXRhW2lkXSk7XHJcblx0XHR9XHJcblxyXG5cdFx0cmV0dXJuIFByb21pc2UucmVzb2x2ZSgpO1xyXG5cdH1cclxuXHJcblx0LyoqXHJcblx0ICogU3RvcmUgYSB2YWx1ZVxyXG5cdCAqXHJcblx0ICogVGhlIHZhbHVlIGlzIHN0b3JlZCBieSBpdHMgaWQgcHJvcGVydHlcclxuXHQgKi9cclxuXHRzZXQodmFsdWUpIHtcclxuXHRcdC8vIHN0b3JlIHRoZSB2YWx1ZVxyXG5cdFx0dGhpcy5fZGF0YVt2YWx1ZS5pZF0gPSB2YWx1ZTtcclxuXHJcblx0XHRyZXR1cm4gUHJvbWlzZS5yZXNvbHZlKCk7XHJcblx0fVxyXG5cclxuXHQvKipcclxuXHQgKiBSZW1vdmUgYSB2YWx1ZSBmcm9tIHRoZSBhZGFwdG9yXHJcblx0ICovXHJcblx0cmVtb3ZlKGtleSkge1xyXG5cdFx0ZGVsZXRlIHRoaXMuX2RhdGFba2V5XTtcclxuXHJcblx0XHRyZXR1cm4gUHJvbWlzZS5yZXNvbHZlKCk7XHJcblx0fVxyXG59XHJcblxyXG5tb2R1bGUuZXhwb3J0cyA9IE1lbUFkYXB0b3I7XHJcbiIsIi8qKlxyXG4gKiBDcmVhdGUgYSBnbG9iYWwgb2JqZWN0IHdpdGggY29tbW9ubHkgdXNlZCBtb2R1bGVzIHRvIGF2b2lkIDUwIG1pbGxpb24gcmVxdWlyZXNcclxuICovXHJcblxyXG52YXIgRXZlbnRFbWl0dGVyID0gcmVxdWlyZShcIi4vdXRpbC9ldmVudC1lbWl0dGVyXCIpO1xyXG5cclxudmFyIGxpZmVMaW5lID0gbmV3IEV2ZW50RW1pdHRlcigpO1xyXG5cclxuLy8gcGxhdGZvcm0gZGV0ZWN0aW9uXHJcbmxpZmVMaW5lLm5vZGUgPSB0eXBlb2YgcHJvY2VzcyA9PSBcIm9iamVjdFwiO1xyXG5saWZlTGluZS5icm93c2VyID0gdHlwZW9mIHdpbmRvdyA9PSBcIm9iamVjdFwiO1xyXG5cclxuLy8gYXR0YWNoIHV0aWxzXHJcbmxpZmVMaW5lLkRpc3Bvc2FibGUgPSByZXF1aXJlKFwiLi91dGlsL2Rpc3Bvc2FibGVcIik7XHJcbmxpZmVMaW5lLkV2ZW50RW1pdHRlciA9IEV2ZW50RW1pdHRlcjtcclxuXHJcbi8vIGF0dGFjaCBsaWZlbGluZSB0byB0aGUgZ2xvYmFsIG9iamVjdFxyXG4obGlmZUxpbmUubm9kZSA/IGdsb2JhbCA6IGJyb3dzZXIpLmxpZmVMaW5lID0gbGlmZUxpbmU7XHJcblxyXG4vLyBhdHRhY2ggY29uZmlnXHJcbnZhciBNZW1BZGFwdG9yID0gcmVxdWlyZShcIi4vZGF0YS1zdG9yZXMvbWVtLWFkYXB0b3JcIik7XHJcbnZhciBLZXlWYWx1ZVN0b3JlID0gcmVxdWlyZShcIi4vZGF0YS1zdG9yZXMva2V5LXZhbHVlLXN0b3JlXCIpO1xyXG5cclxubGlmZUxpbmUuY29uZmlnID0gbmV3IEtleVZhbHVlU3RvcmUobmV3IE1lbUFkYXB0b3IoKSk7XHJcbiIsIi8qKlxyXG4gKiBLZWVwIGEgbGlzdCBvZiBzdWJzY3JpcHRpb25zIHRvIHVuc3Vic2NyaWJlIGZyb20gdG9nZXRoZXJcclxuICovXHJcblxyXG5jbGFzcyBEaXNwb3NhYmxlIHtcclxuXHRjb25zdHJ1Y3RvcigpIHtcclxuXHRcdHRoaXMuX3N1YnNjcmlwdGlvbnMgPSBbXTtcclxuXHR9XHJcblxyXG5cdC8vIFVuc3Vic2NyaWJlIGZyb20gYWxsIHN1YnNjcmlwdGlvbnNcclxuXHRkaXNwb3NlKCkge1xyXG5cdFx0Ly8gcmVtb3ZlIHRoZSBmaXJzdCBzdWJzY3JpcHRpb24gdW50aWwgdGhlcmUgYXJlIG5vbmUgbGVmdFxyXG5cdFx0d2hpbGUodGhpcy5fc3Vic2NyaXB0aW9ucy5sZW5ndGggPiAwKSB7XHJcblx0XHRcdHRoaXMuX3N1YnNjcmlwdGlvbnMuc2hpZnQoKS51bnN1YnNjcmliZSgpO1xyXG5cdFx0fVxyXG5cdH1cclxuXHJcblx0Ly8gQWRkIGEgc3Vic2NyaXB0aW9uIHRvIHRoZSBkaXNwb3NhYmxlXHJcblx0YWRkKHN1YnNjcmlwdGlvbikge1xyXG5cdFx0dGhpcy5fc3Vic2NyaXB0aW9ucy5wdXNoKHN1YnNjcmlwdGlvbik7XHJcblx0fVxyXG5cclxuXHQvLyBkaXNwb3NlIHdoZW4gYW4gZXZlbnQgaXMgZmlyZWRcclxuXHRkaXNwb3NlT24oZW1pdHRlciwgZXZlbnQpIHtcclxuXHRcdHRoaXMuYWRkKGVtaXR0ZXIub24oZXZlbnQsICgpID0+IHRoaXMuZGlzcG9zZSgpKSk7XHJcblx0fVxyXG59O1xyXG5cclxubW9kdWxlLmV4cG9ydHMgPSBEaXNwb3NhYmxlO1xyXG4iLCIvKipcclxuICogQSBiYXNpYyBldmVudCBlbWl0dGVyXHJcbiAqL1xyXG5cclxuY2xhc3MgRXZlbnRFbWl0dGVyIHtcclxuXHRjb25zdHJ1Y3RvcigpIHtcclxuXHRcdHRoaXMuX2xpc3RlbmVycyA9IHt9O1xyXG5cdH1cclxuXHJcblx0LyoqXHJcblx0ICogQWRkIGFuIGV2ZW50IGxpc3RlbmVyXHJcblx0ICovXHJcblx0b24obmFtZSwgbGlzdGVuZXIpIHtcclxuXHRcdC8vIGlmIHdlIGRvbid0IGhhdmUgYW4gZXhpc3RpbmcgbGlzdGVuZXJzIGFycmF5IGNyZWF0ZSBvbmVcclxuXHRcdGlmKCF0aGlzLl9saXN0ZW5lcnNbbmFtZV0pIHtcclxuXHRcdFx0dGhpcy5fbGlzdGVuZXJzW25hbWVdID0gW107XHJcblx0XHR9XHJcblxyXG5cdFx0Ly8gYWRkIHRoZSBsaXN0ZW5lclxyXG5cdFx0dGhpcy5fbGlzdGVuZXJzW25hbWVdLnB1c2gobGlzdGVuZXIpO1xyXG5cclxuXHRcdC8vIGdpdmUgdGhlbSBhIHN1YnNjcmlwdGlvblxyXG5cdFx0cmV0dXJuIHtcclxuXHRcdFx0X2xpc3RlbmVyOiBsaXN0ZW5lcixcclxuXHJcblx0XHRcdHVuc3Vic2NyaWJlOiAoKSA9PiB7XHJcblx0XHRcdFx0Ly8gZmluZCB0aGUgbGlzdGVuZXJcclxuXHRcdFx0XHR2YXIgaW5kZXggPSB0aGlzLl9saXN0ZW5lcnNbbmFtZV0uaW5kZXhPZihsaXN0ZW5lcik7XHJcblxyXG5cdFx0XHRcdGlmKGluZGV4ICE9PSAtMSkge1xyXG5cdFx0XHRcdFx0dGhpcy5fbGlzdGVuZXJzW25hbWVdLnNwbGljZShpbmRleCwgMSk7XHJcblx0XHRcdFx0fVxyXG5cdFx0XHR9XHJcblx0XHR9O1xyXG5cdH1cclxuXHJcblx0LyoqXHJcblx0ICogRW1pdCBhbiBldmVudFxyXG5cdCAqL1xyXG5cdGVtaXQobmFtZSwgLi4uYXJncykge1xyXG5cdFx0Ly8gY2hlY2sgZm9yIGxpc3RlbmVyc1xyXG5cdFx0aWYodGhpcy5fbGlzdGVuZXJzW25hbWVdKSB7XHJcblx0XHRcdGZvcihsZXQgbGlzdGVuZXIgb2YgdGhpcy5fbGlzdGVuZXJzW25hbWVdKSB7XHJcblx0XHRcdFx0Ly8gY2FsbCB0aGUgbGlzdGVuZXJzXHJcblx0XHRcdFx0bGlzdGVuZXIoLi4uYXJncyk7XHJcblx0XHRcdH1cclxuXHRcdH1cclxuXHR9XHJcblxyXG5cdC8qKlxyXG5cdCAqIEVtaXQgYW4gZXZlbnQgYW5kIHNraXAgc29tZSBsaXN0ZW5lcnNcclxuXHQgKi9cclxuXHRwYXJ0aWFsRW1pdChuYW1lLCBza2lwcyA9IFtdLCAuLi5hcmdzKSB7XHJcblx0XHQvLyBhbGxvdyBhIHNpbmdsZSBpdGVtXHJcblx0XHRpZighQXJyYXkuaXNBcnJheShza2lwcykpIHtcclxuXHRcdFx0c2tpcHMgPSBbc2tpcHNdO1xyXG5cdFx0fVxyXG5cclxuXHRcdC8vIGNoZWNrIGZvciBsaXN0ZW5lcnNcclxuXHRcdGlmKHRoaXMuX2xpc3RlbmVyc1tuYW1lXSkge1xyXG5cdFx0XHRmb3IobGV0IGxpc3RlbmVyIG9mIHRoaXMuX2xpc3RlbmVyc1tuYW1lXSkge1xyXG5cdFx0XHRcdC8vIHRoaXMgZXZlbnQgbGlzdGVuZXIgaXMgYmVpbmcgc2tpcGVkXHJcblx0XHRcdFx0aWYoc2tpcHMuZmluZChza2lwID0+IHNraXAuX2xpc3RlbmVyID09IGxpc3RlbmVyKSkge1xyXG5cdFx0XHRcdFx0Y29udGludWU7XHJcblx0XHRcdFx0fVxyXG5cclxuXHRcdFx0XHQvLyBjYWxsIHRoZSBsaXN0ZW5lcnNcclxuXHRcdFx0XHRsaXN0ZW5lciguLi5hcmdzKTtcclxuXHRcdFx0fVxyXG5cdFx0fVxyXG5cdH1cclxufVxyXG5cclxubW9kdWxlLmV4cG9ydHMgPSBFdmVudEVtaXR0ZXI7XHJcbiJdfQ==
