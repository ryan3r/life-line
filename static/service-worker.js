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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCJub2RlX21vZHVsZXMvaWRiL2xpYi9pZGIuanMiLCJub2RlX21vZHVsZXMvcHJvY2Vzcy9icm93c2VyLmpzIiwic3JjXFxjbGllbnRcXGRhdGEtc3RvcmUuanMiLCJzcmNcXGNsaWVudFxcZ2xvYmFsLmpzIiwic3JjXFxjbGllbnRcXHN3LWluZGV4LmpzIiwic3JjXFxjbGllbnRcXHN5bmNlci5qcyIsInNyY1xcY2xpZW50XFx1dGlsXFxkb20tbWFrZXIuanMiLCJzcmNcXGNvbW1vblxcZGlzcG9zYWJsZS5qcyIsInNyY1xcY29tbW9uXFxldmVudC1lbWl0dGVyLmpzIiwic3JjXFxjb21tb25cXHNyY1xcY29tbW9uXFxnbG9iYWwuanMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7QUNBQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3RUQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FB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QUFDQSxTQUFTLE9BQVQsR0FBbUIsT0FBTyxNQUFQLElBQWlCLFFBQXBDOztBQUVBO0FBQ0EsU0FBUyxVQUFULEdBQXNCLFFBQVEsY0FBUixFQUF3QixPQUE5QztBQUNBLFNBQVMsWUFBVDs7QUFFQTtBQUNBLENBQUMsU0FBUyxJQUFULEdBQWdCLE1BQWhCLEdBQXlCLE9BQTFCLEVBQW1DLFFBQW5DLEdBQThDLFFBQTlDIiwiZmlsZSI6ImdlbmVyYXRlZC5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzQ29udGVudCI6WyIoZnVuY3Rpb24gZSh0LG4scil7ZnVuY3Rpb24gcyhvLHUpe2lmKCFuW29dKXtpZighdFtvXSl7dmFyIGE9dHlwZW9mIHJlcXVpcmU9PVwiZnVuY3Rpb25cIiYmcmVxdWlyZTtpZighdSYmYSlyZXR1cm4gYShvLCEwKTtpZihpKXJldHVybiBpKG8sITApO3ZhciBmPW5ldyBFcnJvcihcIkNhbm5vdCBmaW5kIG1vZHVsZSAnXCIrbytcIidcIik7dGhyb3cgZi5jb2RlPVwiTU9EVUxFX05PVF9GT1VORFwiLGZ9dmFyIGw9bltvXT17ZXhwb3J0czp7fX07dFtvXVswXS5jYWxsKGwuZXhwb3J0cyxmdW5jdGlvbihlKXt2YXIgbj10W29dWzFdW2VdO3JldHVybiBzKG4/bjplKX0sbCxsLmV4cG9ydHMsZSx0LG4scil9cmV0dXJuIG5bb10uZXhwb3J0c312YXIgaT10eXBlb2YgcmVxdWlyZT09XCJmdW5jdGlvblwiJiZyZXF1aXJlO2Zvcih2YXIgbz0wO288ci5sZW5ndGg7bysrKXMocltvXSk7cmV0dXJuIHN9KSIsIid1c2Ugc3RyaWN0JztcblxuKGZ1bmN0aW9uKCkge1xuICBmdW5jdGlvbiB0b0FycmF5KGFycikge1xuICAgIHJldHVybiBBcnJheS5wcm90b3R5cGUuc2xpY2UuY2FsbChhcnIpO1xuICB9XG5cbiAgZnVuY3Rpb24gcHJvbWlzaWZ5UmVxdWVzdChyZXF1ZXN0KSB7XG4gICAgcmV0dXJuIG5ldyBQcm9taXNlKGZ1bmN0aW9uKHJlc29sdmUsIHJlamVjdCkge1xuICAgICAgcmVxdWVzdC5vbnN1Y2Nlc3MgPSBmdW5jdGlvbigpIHtcbiAgICAgICAgcmVzb2x2ZShyZXF1ZXN0LnJlc3VsdCk7XG4gICAgICB9O1xuXG4gICAgICByZXF1ZXN0Lm9uZXJyb3IgPSBmdW5jdGlvbigpIHtcbiAgICAgICAgcmVqZWN0KHJlcXVlc3QuZXJyb3IpO1xuICAgICAgfTtcbiAgICB9KTtcbiAgfVxuXG4gIGZ1bmN0aW9uIHByb21pc2lmeVJlcXVlc3RDYWxsKG9iaiwgbWV0aG9kLCBhcmdzKSB7XG4gICAgdmFyIHJlcXVlc3Q7XG4gICAgdmFyIHAgPSBuZXcgUHJvbWlzZShmdW5jdGlvbihyZXNvbHZlLCByZWplY3QpIHtcbiAgICAgIHJlcXVlc3QgPSBvYmpbbWV0aG9kXS5hcHBseShvYmosIGFyZ3MpO1xuICAgICAgcHJvbWlzaWZ5UmVxdWVzdChyZXF1ZXN0KS50aGVuKHJlc29sdmUsIHJlamVjdCk7XG4gICAgfSk7XG5cbiAgICBwLnJlcXVlc3QgPSByZXF1ZXN0O1xuICAgIHJldHVybiBwO1xuICB9XG5cbiAgZnVuY3Rpb24gcHJvbWlzaWZ5Q3Vyc29yUmVxdWVzdENhbGwob2JqLCBtZXRob2QsIGFyZ3MpIHtcbiAgICB2YXIgcCA9IHByb21pc2lmeVJlcXVlc3RDYWxsKG9iaiwgbWV0aG9kLCBhcmdzKTtcbiAgICByZXR1cm4gcC50aGVuKGZ1bmN0aW9uKHZhbHVlKSB7XG4gICAgICBpZiAoIXZhbHVlKSByZXR1cm47XG4gICAgICByZXR1cm4gbmV3IEN1cnNvcih2YWx1ZSwgcC5yZXF1ZXN0KTtcbiAgICB9KTtcbiAgfVxuXG4gIGZ1bmN0aW9uIHByb3h5UHJvcGVydGllcyhQcm94eUNsYXNzLCB0YXJnZXRQcm9wLCBwcm9wZXJ0aWVzKSB7XG4gICAgcHJvcGVydGllcy5mb3JFYWNoKGZ1bmN0aW9uKHByb3ApIHtcbiAgICAgIE9iamVjdC5kZWZpbmVQcm9wZXJ0eShQcm94eUNsYXNzLnByb3RvdHlwZSwgcHJvcCwge1xuICAgICAgICBnZXQ6IGZ1bmN0aW9uKCkge1xuICAgICAgICAgIHJldHVybiB0aGlzW3RhcmdldFByb3BdW3Byb3BdO1xuICAgICAgICB9LFxuICAgICAgICBzZXQ6IGZ1bmN0aW9uKHZhbCkge1xuICAgICAgICAgIHRoaXNbdGFyZ2V0UHJvcF1bcHJvcF0gPSB2YWw7XG4gICAgICAgIH1cbiAgICAgIH0pO1xuICAgIH0pO1xuICB9XG5cbiAgZnVuY3Rpb24gcHJveHlSZXF1ZXN0TWV0aG9kcyhQcm94eUNsYXNzLCB0YXJnZXRQcm9wLCBDb25zdHJ1Y3RvciwgcHJvcGVydGllcykge1xuICAgIHByb3BlcnRpZXMuZm9yRWFjaChmdW5jdGlvbihwcm9wKSB7XG4gICAgICBpZiAoIShwcm9wIGluIENvbnN0cnVjdG9yLnByb3RvdHlwZSkpIHJldHVybjtcbiAgICAgIFByb3h5Q2xhc3MucHJvdG90eXBlW3Byb3BdID0gZnVuY3Rpb24oKSB7XG4gICAgICAgIHJldHVybiBwcm9taXNpZnlSZXF1ZXN0Q2FsbCh0aGlzW3RhcmdldFByb3BdLCBwcm9wLCBhcmd1bWVudHMpO1xuICAgICAgfTtcbiAgICB9KTtcbiAgfVxuXG4gIGZ1bmN0aW9uIHByb3h5TWV0aG9kcyhQcm94eUNsYXNzLCB0YXJnZXRQcm9wLCBDb25zdHJ1Y3RvciwgcHJvcGVydGllcykge1xuICAgIHByb3BlcnRpZXMuZm9yRWFjaChmdW5jdGlvbihwcm9wKSB7XG4gICAgICBpZiAoIShwcm9wIGluIENvbnN0cnVjdG9yLnByb3RvdHlwZSkpIHJldHVybjtcbiAgICAgIFByb3h5Q2xhc3MucHJvdG90eXBlW3Byb3BdID0gZnVuY3Rpb24oKSB7XG4gICAgICAgIHJldHVybiB0aGlzW3RhcmdldFByb3BdW3Byb3BdLmFwcGx5KHRoaXNbdGFyZ2V0UHJvcF0sIGFyZ3VtZW50cyk7XG4gICAgICB9O1xuICAgIH0pO1xuICB9XG5cbiAgZnVuY3Rpb24gcHJveHlDdXJzb3JSZXF1ZXN0TWV0aG9kcyhQcm94eUNsYXNzLCB0YXJnZXRQcm9wLCBDb25zdHJ1Y3RvciwgcHJvcGVydGllcykge1xuICAgIHByb3BlcnRpZXMuZm9yRWFjaChmdW5jdGlvbihwcm9wKSB7XG4gICAgICBpZiAoIShwcm9wIGluIENvbnN0cnVjdG9yLnByb3RvdHlwZSkpIHJldHVybjtcbiAgICAgIFByb3h5Q2xhc3MucHJvdG90eXBlW3Byb3BdID0gZnVuY3Rpb24oKSB7XG4gICAgICAgIHJldHVybiBwcm9taXNpZnlDdXJzb3JSZXF1ZXN0Q2FsbCh0aGlzW3RhcmdldFByb3BdLCBwcm9wLCBhcmd1bWVudHMpO1xuICAgICAgfTtcbiAgICB9KTtcbiAgfVxuXG4gIGZ1bmN0aW9uIEluZGV4KGluZGV4KSB7XG4gICAgdGhpcy5faW5kZXggPSBpbmRleDtcbiAgfVxuXG4gIHByb3h5UHJvcGVydGllcyhJbmRleCwgJ19pbmRleCcsIFtcbiAgICAnbmFtZScsXG4gICAgJ2tleVBhdGgnLFxuICAgICdtdWx0aUVudHJ5JyxcbiAgICAndW5pcXVlJ1xuICBdKTtcblxuICBwcm94eVJlcXVlc3RNZXRob2RzKEluZGV4LCAnX2luZGV4JywgSURCSW5kZXgsIFtcbiAgICAnZ2V0JyxcbiAgICAnZ2V0S2V5JyxcbiAgICAnZ2V0QWxsJyxcbiAgICAnZ2V0QWxsS2V5cycsXG4gICAgJ2NvdW50J1xuICBdKTtcblxuICBwcm94eUN1cnNvclJlcXVlc3RNZXRob2RzKEluZGV4LCAnX2luZGV4JywgSURCSW5kZXgsIFtcbiAgICAnb3BlbkN1cnNvcicsXG4gICAgJ29wZW5LZXlDdXJzb3InXG4gIF0pO1xuXG4gIGZ1bmN0aW9uIEN1cnNvcihjdXJzb3IsIHJlcXVlc3QpIHtcbiAgICB0aGlzLl9jdXJzb3IgPSBjdXJzb3I7XG4gICAgdGhpcy5fcmVxdWVzdCA9IHJlcXVlc3Q7XG4gIH1cblxuICBwcm94eVByb3BlcnRpZXMoQ3Vyc29yLCAnX2N1cnNvcicsIFtcbiAgICAnZGlyZWN0aW9uJyxcbiAgICAna2V5JyxcbiAgICAncHJpbWFyeUtleScsXG4gICAgJ3ZhbHVlJ1xuICBdKTtcblxuICBwcm94eVJlcXVlc3RNZXRob2RzKEN1cnNvciwgJ19jdXJzb3InLCBJREJDdXJzb3IsIFtcbiAgICAndXBkYXRlJyxcbiAgICAnZGVsZXRlJ1xuICBdKTtcblxuICAvLyBwcm94eSAnbmV4dCcgbWV0aG9kc1xuICBbJ2FkdmFuY2UnLCAnY29udGludWUnLCAnY29udGludWVQcmltYXJ5S2V5J10uZm9yRWFjaChmdW5jdGlvbihtZXRob2ROYW1lKSB7XG4gICAgaWYgKCEobWV0aG9kTmFtZSBpbiBJREJDdXJzb3IucHJvdG90eXBlKSkgcmV0dXJuO1xuICAgIEN1cnNvci5wcm90b3R5cGVbbWV0aG9kTmFtZV0gPSBmdW5jdGlvbigpIHtcbiAgICAgIHZhciBjdXJzb3IgPSB0aGlzO1xuICAgICAgdmFyIGFyZ3MgPSBhcmd1bWVudHM7XG4gICAgICByZXR1cm4gUHJvbWlzZS5yZXNvbHZlKCkudGhlbihmdW5jdGlvbigpIHtcbiAgICAgICAgY3Vyc29yLl9jdXJzb3JbbWV0aG9kTmFtZV0uYXBwbHkoY3Vyc29yLl9jdXJzb3IsIGFyZ3MpO1xuICAgICAgICByZXR1cm4gcHJvbWlzaWZ5UmVxdWVzdChjdXJzb3IuX3JlcXVlc3QpLnRoZW4oZnVuY3Rpb24odmFsdWUpIHtcbiAgICAgICAgICBpZiAoIXZhbHVlKSByZXR1cm47XG4gICAgICAgICAgcmV0dXJuIG5ldyBDdXJzb3IodmFsdWUsIGN1cnNvci5fcmVxdWVzdCk7XG4gICAgICAgIH0pO1xuICAgICAgfSk7XG4gICAgfTtcbiAgfSk7XG5cbiAgZnVuY3Rpb24gT2JqZWN0U3RvcmUoc3RvcmUpIHtcbiAgICB0aGlzLl9zdG9yZSA9IHN0b3JlO1xuICB9XG5cbiAgT2JqZWN0U3RvcmUucHJvdG90eXBlLmNyZWF0ZUluZGV4ID0gZnVuY3Rpb24oKSB7XG4gICAgcmV0dXJuIG5ldyBJbmRleCh0aGlzLl9zdG9yZS5jcmVhdGVJbmRleC5hcHBseSh0aGlzLl9zdG9yZSwgYXJndW1lbnRzKSk7XG4gIH07XG5cbiAgT2JqZWN0U3RvcmUucHJvdG90eXBlLmluZGV4ID0gZnVuY3Rpb24oKSB7XG4gICAgcmV0dXJuIG5ldyBJbmRleCh0aGlzLl9zdG9yZS5pbmRleC5hcHBseSh0aGlzLl9zdG9yZSwgYXJndW1lbnRzKSk7XG4gIH07XG5cbiAgcHJveHlQcm9wZXJ0aWVzKE9iamVjdFN0b3JlLCAnX3N0b3JlJywgW1xuICAgICduYW1lJyxcbiAgICAna2V5UGF0aCcsXG4gICAgJ2luZGV4TmFtZXMnLFxuICAgICdhdXRvSW5jcmVtZW50J1xuICBdKTtcblxuICBwcm94eVJlcXVlc3RNZXRob2RzKE9iamVjdFN0b3JlLCAnX3N0b3JlJywgSURCT2JqZWN0U3RvcmUsIFtcbiAgICAncHV0JyxcbiAgICAnYWRkJyxcbiAgICAnZGVsZXRlJyxcbiAgICAnY2xlYXInLFxuICAgICdnZXQnLFxuICAgICdnZXRBbGwnLFxuICAgICdnZXRLZXknLFxuICAgICdnZXRBbGxLZXlzJyxcbiAgICAnY291bnQnXG4gIF0pO1xuXG4gIHByb3h5Q3Vyc29yUmVxdWVzdE1ldGhvZHMoT2JqZWN0U3RvcmUsICdfc3RvcmUnLCBJREJPYmplY3RTdG9yZSwgW1xuICAgICdvcGVuQ3Vyc29yJyxcbiAgICAnb3BlbktleUN1cnNvcidcbiAgXSk7XG5cbiAgcHJveHlNZXRob2RzKE9iamVjdFN0b3JlLCAnX3N0b3JlJywgSURCT2JqZWN0U3RvcmUsIFtcbiAgICAnZGVsZXRlSW5kZXgnXG4gIF0pO1xuXG4gIGZ1bmN0aW9uIFRyYW5zYWN0aW9uKGlkYlRyYW5zYWN0aW9uKSB7XG4gICAgdGhpcy5fdHggPSBpZGJUcmFuc2FjdGlvbjtcbiAgICB0aGlzLmNvbXBsZXRlID0gbmV3IFByb21pc2UoZnVuY3Rpb24ocmVzb2x2ZSwgcmVqZWN0KSB7XG4gICAgICBpZGJUcmFuc2FjdGlvbi5vbmNvbXBsZXRlID0gZnVuY3Rpb24oKSB7XG4gICAgICAgIHJlc29sdmUoKTtcbiAgICAgIH07XG4gICAgICBpZGJUcmFuc2FjdGlvbi5vbmVycm9yID0gZnVuY3Rpb24oKSB7XG4gICAgICAgIHJlamVjdChpZGJUcmFuc2FjdGlvbi5lcnJvcik7XG4gICAgICB9O1xuICAgICAgaWRiVHJhbnNhY3Rpb24ub25hYm9ydCA9IGZ1bmN0aW9uKCkge1xuICAgICAgICByZWplY3QoaWRiVHJhbnNhY3Rpb24uZXJyb3IpO1xuICAgICAgfTtcbiAgICB9KTtcbiAgfVxuXG4gIFRyYW5zYWN0aW9uLnByb3RvdHlwZS5vYmplY3RTdG9yZSA9IGZ1bmN0aW9uKCkge1xuICAgIHJldHVybiBuZXcgT2JqZWN0U3RvcmUodGhpcy5fdHgub2JqZWN0U3RvcmUuYXBwbHkodGhpcy5fdHgsIGFyZ3VtZW50cykpO1xuICB9O1xuXG4gIHByb3h5UHJvcGVydGllcyhUcmFuc2FjdGlvbiwgJ190eCcsIFtcbiAgICAnb2JqZWN0U3RvcmVOYW1lcycsXG4gICAgJ21vZGUnXG4gIF0pO1xuXG4gIHByb3h5TWV0aG9kcyhUcmFuc2FjdGlvbiwgJ190eCcsIElEQlRyYW5zYWN0aW9uLCBbXG4gICAgJ2Fib3J0J1xuICBdKTtcblxuICBmdW5jdGlvbiBVcGdyYWRlREIoZGIsIG9sZFZlcnNpb24sIHRyYW5zYWN0aW9uKSB7XG4gICAgdGhpcy5fZGIgPSBkYjtcbiAgICB0aGlzLm9sZFZlcnNpb24gPSBvbGRWZXJzaW9uO1xuICAgIHRoaXMudHJhbnNhY3Rpb24gPSBuZXcgVHJhbnNhY3Rpb24odHJhbnNhY3Rpb24pO1xuICB9XG5cbiAgVXBncmFkZURCLnByb3RvdHlwZS5jcmVhdGVPYmplY3RTdG9yZSA9IGZ1bmN0aW9uKCkge1xuICAgIHJldHVybiBuZXcgT2JqZWN0U3RvcmUodGhpcy5fZGIuY3JlYXRlT2JqZWN0U3RvcmUuYXBwbHkodGhpcy5fZGIsIGFyZ3VtZW50cykpO1xuICB9O1xuXG4gIHByb3h5UHJvcGVydGllcyhVcGdyYWRlREIsICdfZGInLCBbXG4gICAgJ25hbWUnLFxuICAgICd2ZXJzaW9uJyxcbiAgICAnb2JqZWN0U3RvcmVOYW1lcydcbiAgXSk7XG5cbiAgcHJveHlNZXRob2RzKFVwZ3JhZGVEQiwgJ19kYicsIElEQkRhdGFiYXNlLCBbXG4gICAgJ2RlbGV0ZU9iamVjdFN0b3JlJyxcbiAgICAnY2xvc2UnXG4gIF0pO1xuXG4gIGZ1bmN0aW9uIERCKGRiKSB7XG4gICAgdGhpcy5fZGIgPSBkYjtcbiAgfVxuXG4gIERCLnByb3RvdHlwZS50cmFuc2FjdGlvbiA9IGZ1bmN0aW9uKCkge1xuICAgIHJldHVybiBuZXcgVHJhbnNhY3Rpb24odGhpcy5fZGIudHJhbnNhY3Rpb24uYXBwbHkodGhpcy5fZGIsIGFyZ3VtZW50cykpO1xuICB9O1xuXG4gIHByb3h5UHJvcGVydGllcyhEQiwgJ19kYicsIFtcbiAgICAnbmFtZScsXG4gICAgJ3ZlcnNpb24nLFxuICAgICdvYmplY3RTdG9yZU5hbWVzJ1xuICBdKTtcblxuICBwcm94eU1ldGhvZHMoREIsICdfZGInLCBJREJEYXRhYmFzZSwgW1xuICAgICdjbG9zZSdcbiAgXSk7XG5cbiAgLy8gQWRkIGN1cnNvciBpdGVyYXRvcnNcbiAgLy8gVE9ETzogcmVtb3ZlIHRoaXMgb25jZSBicm93c2VycyBkbyB0aGUgcmlnaHQgdGhpbmcgd2l0aCBwcm9taXNlc1xuICBbJ29wZW5DdXJzb3InLCAnb3BlbktleUN1cnNvciddLmZvckVhY2goZnVuY3Rpb24oZnVuY05hbWUpIHtcbiAgICBbT2JqZWN0U3RvcmUsIEluZGV4XS5mb3JFYWNoKGZ1bmN0aW9uKENvbnN0cnVjdG9yKSB7XG4gICAgICBDb25zdHJ1Y3Rvci5wcm90b3R5cGVbZnVuY05hbWUucmVwbGFjZSgnb3BlbicsICdpdGVyYXRlJyldID0gZnVuY3Rpb24oKSB7XG4gICAgICAgIHZhciBhcmdzID0gdG9BcnJheShhcmd1bWVudHMpO1xuICAgICAgICB2YXIgY2FsbGJhY2sgPSBhcmdzW2FyZ3MubGVuZ3RoIC0gMV07XG4gICAgICAgIHZhciBuYXRpdmVPYmplY3QgPSB0aGlzLl9zdG9yZSB8fCB0aGlzLl9pbmRleDtcbiAgICAgICAgdmFyIHJlcXVlc3QgPSBuYXRpdmVPYmplY3RbZnVuY05hbWVdLmFwcGx5KG5hdGl2ZU9iamVjdCwgYXJncy5zbGljZSgwLCAtMSkpO1xuICAgICAgICByZXF1ZXN0Lm9uc3VjY2VzcyA9IGZ1bmN0aW9uKCkge1xuICAgICAgICAgIGNhbGxiYWNrKHJlcXVlc3QucmVzdWx0KTtcbiAgICAgICAgfTtcbiAgICAgIH07XG4gICAgfSk7XG4gIH0pO1xuXG4gIC8vIHBvbHlmaWxsIGdldEFsbFxuICBbSW5kZXgsIE9iamVjdFN0b3JlXS5mb3JFYWNoKGZ1bmN0aW9uKENvbnN0cnVjdG9yKSB7XG4gICAgaWYgKENvbnN0cnVjdG9yLnByb3RvdHlwZS5nZXRBbGwpIHJldHVybjtcbiAgICBDb25zdHJ1Y3Rvci5wcm90b3R5cGUuZ2V0QWxsID0gZnVuY3Rpb24ocXVlcnksIGNvdW50KSB7XG4gICAgICB2YXIgaW5zdGFuY2UgPSB0aGlzO1xuICAgICAgdmFyIGl0ZW1zID0gW107XG5cbiAgICAgIHJldHVybiBuZXcgUHJvbWlzZShmdW5jdGlvbihyZXNvbHZlKSB7XG4gICAgICAgIGluc3RhbmNlLml0ZXJhdGVDdXJzb3IocXVlcnksIGZ1bmN0aW9uKGN1cnNvcikge1xuICAgICAgICAgIGlmICghY3Vyc29yKSB7XG4gICAgICAgICAgICByZXNvbHZlKGl0ZW1zKTtcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgICB9XG4gICAgICAgICAgaXRlbXMucHVzaChjdXJzb3IudmFsdWUpO1xuXG4gICAgICAgICAgaWYgKGNvdW50ICE9PSB1bmRlZmluZWQgJiYgaXRlbXMubGVuZ3RoID09IGNvdW50KSB7XG4gICAgICAgICAgICByZXNvbHZlKGl0ZW1zKTtcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgICB9XG4gICAgICAgICAgY3Vyc29yLmNvbnRpbnVlKCk7XG4gICAgICAgIH0pO1xuICAgICAgfSk7XG4gICAgfTtcbiAgfSk7XG5cbiAgdmFyIGV4cCA9IHtcbiAgICBvcGVuOiBmdW5jdGlvbihuYW1lLCB2ZXJzaW9uLCB1cGdyYWRlQ2FsbGJhY2spIHtcbiAgICAgIHZhciBwID0gcHJvbWlzaWZ5UmVxdWVzdENhbGwoaW5kZXhlZERCLCAnb3BlbicsIFtuYW1lLCB2ZXJzaW9uXSk7XG4gICAgICB2YXIgcmVxdWVzdCA9IHAucmVxdWVzdDtcblxuICAgICAgcmVxdWVzdC5vbnVwZ3JhZGVuZWVkZWQgPSBmdW5jdGlvbihldmVudCkge1xuICAgICAgICBpZiAodXBncmFkZUNhbGxiYWNrKSB7XG4gICAgICAgICAgdXBncmFkZUNhbGxiYWNrKG5ldyBVcGdyYWRlREIocmVxdWVzdC5yZXN1bHQsIGV2ZW50Lm9sZFZlcnNpb24sIHJlcXVlc3QudHJhbnNhY3Rpb24pKTtcbiAgICAgICAgfVxuICAgICAgfTtcblxuICAgICAgcmV0dXJuIHAudGhlbihmdW5jdGlvbihkYikge1xuICAgICAgICByZXR1cm4gbmV3IERCKGRiKTtcbiAgICAgIH0pO1xuICAgIH0sXG4gICAgZGVsZXRlOiBmdW5jdGlvbihuYW1lKSB7XG4gICAgICByZXR1cm4gcHJvbWlzaWZ5UmVxdWVzdENhbGwoaW5kZXhlZERCLCAnZGVsZXRlRGF0YWJhc2UnLCBbbmFtZV0pO1xuICAgIH1cbiAgfTtcblxuICBpZiAodHlwZW9mIG1vZHVsZSAhPT0gJ3VuZGVmaW5lZCcpIHtcbiAgICBtb2R1bGUuZXhwb3J0cyA9IGV4cDtcbiAgfVxuICBlbHNlIHtcbiAgICBzZWxmLmlkYiA9IGV4cDtcbiAgfVxufSgpKTtcbiIsIi8vIHNoaW0gZm9yIHVzaW5nIHByb2Nlc3MgaW4gYnJvd3NlclxudmFyIHByb2Nlc3MgPSBtb2R1bGUuZXhwb3J0cyA9IHt9O1xuXG4vLyBjYWNoZWQgZnJvbSB3aGF0ZXZlciBnbG9iYWwgaXMgcHJlc2VudCBzbyB0aGF0IHRlc3QgcnVubmVycyB0aGF0IHN0dWIgaXRcbi8vIGRvbid0IGJyZWFrIHRoaW5ncy4gIEJ1dCB3ZSBuZWVkIHRvIHdyYXAgaXQgaW4gYSB0cnkgY2F0Y2ggaW4gY2FzZSBpdCBpc1xuLy8gd3JhcHBlZCBpbiBzdHJpY3QgbW9kZSBjb2RlIHdoaWNoIGRvZXNuJ3QgZGVmaW5lIGFueSBnbG9iYWxzLiAgSXQncyBpbnNpZGUgYVxuLy8gZnVuY3Rpb24gYmVjYXVzZSB0cnkvY2F0Y2hlcyBkZW9wdGltaXplIGluIGNlcnRhaW4gZW5naW5lcy5cblxudmFyIGNhY2hlZFNldFRpbWVvdXQ7XG52YXIgY2FjaGVkQ2xlYXJUaW1lb3V0O1xuXG5mdW5jdGlvbiBkZWZhdWx0U2V0VGltb3V0KCkge1xuICAgIHRocm93IG5ldyBFcnJvcignc2V0VGltZW91dCBoYXMgbm90IGJlZW4gZGVmaW5lZCcpO1xufVxuZnVuY3Rpb24gZGVmYXVsdENsZWFyVGltZW91dCAoKSB7XG4gICAgdGhyb3cgbmV3IEVycm9yKCdjbGVhclRpbWVvdXQgaGFzIG5vdCBiZWVuIGRlZmluZWQnKTtcbn1cbihmdW5jdGlvbiAoKSB7XG4gICAgdHJ5IHtcbiAgICAgICAgaWYgKHR5cGVvZiBzZXRUaW1lb3V0ID09PSAnZnVuY3Rpb24nKSB7XG4gICAgICAgICAgICBjYWNoZWRTZXRUaW1lb3V0ID0gc2V0VGltZW91dDtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIGNhY2hlZFNldFRpbWVvdXQgPSBkZWZhdWx0U2V0VGltb3V0O1xuICAgICAgICB9XG4gICAgfSBjYXRjaCAoZSkge1xuICAgICAgICBjYWNoZWRTZXRUaW1lb3V0ID0gZGVmYXVsdFNldFRpbW91dDtcbiAgICB9XG4gICAgdHJ5IHtcbiAgICAgICAgaWYgKHR5cGVvZiBjbGVhclRpbWVvdXQgPT09ICdmdW5jdGlvbicpIHtcbiAgICAgICAgICAgIGNhY2hlZENsZWFyVGltZW91dCA9IGNsZWFyVGltZW91dDtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIGNhY2hlZENsZWFyVGltZW91dCA9IGRlZmF1bHRDbGVhclRpbWVvdXQ7XG4gICAgICAgIH1cbiAgICB9IGNhdGNoIChlKSB7XG4gICAgICAgIGNhY2hlZENsZWFyVGltZW91dCA9IGRlZmF1bHRDbGVhclRpbWVvdXQ7XG4gICAgfVxufSAoKSlcbmZ1bmN0aW9uIHJ1blRpbWVvdXQoZnVuKSB7XG4gICAgaWYgKGNhY2hlZFNldFRpbWVvdXQgPT09IHNldFRpbWVvdXQpIHtcbiAgICAgICAgLy9ub3JtYWwgZW52aXJvbWVudHMgaW4gc2FuZSBzaXR1YXRpb25zXG4gICAgICAgIHJldHVybiBzZXRUaW1lb3V0KGZ1biwgMCk7XG4gICAgfVxuICAgIC8vIGlmIHNldFRpbWVvdXQgd2Fzbid0IGF2YWlsYWJsZSBidXQgd2FzIGxhdHRlciBkZWZpbmVkXG4gICAgaWYgKChjYWNoZWRTZXRUaW1lb3V0ID09PSBkZWZhdWx0U2V0VGltb3V0IHx8ICFjYWNoZWRTZXRUaW1lb3V0KSAmJiBzZXRUaW1lb3V0KSB7XG4gICAgICAgIGNhY2hlZFNldFRpbWVvdXQgPSBzZXRUaW1lb3V0O1xuICAgICAgICByZXR1cm4gc2V0VGltZW91dChmdW4sIDApO1xuICAgIH1cbiAgICB0cnkge1xuICAgICAgICAvLyB3aGVuIHdoZW4gc29tZWJvZHkgaGFzIHNjcmV3ZWQgd2l0aCBzZXRUaW1lb3V0IGJ1dCBubyBJLkUuIG1hZGRuZXNzXG4gICAgICAgIHJldHVybiBjYWNoZWRTZXRUaW1lb3V0KGZ1biwgMCk7XG4gICAgfSBjYXRjaChlKXtcbiAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgIC8vIFdoZW4gd2UgYXJlIGluIEkuRS4gYnV0IHRoZSBzY3JpcHQgaGFzIGJlZW4gZXZhbGVkIHNvIEkuRS4gZG9lc24ndCB0cnVzdCB0aGUgZ2xvYmFsIG9iamVjdCB3aGVuIGNhbGxlZCBub3JtYWxseVxuICAgICAgICAgICAgcmV0dXJuIGNhY2hlZFNldFRpbWVvdXQuY2FsbChudWxsLCBmdW4sIDApO1xuICAgICAgICB9IGNhdGNoKGUpe1xuICAgICAgICAgICAgLy8gc2FtZSBhcyBhYm92ZSBidXQgd2hlbiBpdCdzIGEgdmVyc2lvbiBvZiBJLkUuIHRoYXQgbXVzdCBoYXZlIHRoZSBnbG9iYWwgb2JqZWN0IGZvciAndGhpcycsIGhvcGZ1bGx5IG91ciBjb250ZXh0IGNvcnJlY3Qgb3RoZXJ3aXNlIGl0IHdpbGwgdGhyb3cgYSBnbG9iYWwgZXJyb3JcbiAgICAgICAgICAgIHJldHVybiBjYWNoZWRTZXRUaW1lb3V0LmNhbGwodGhpcywgZnVuLCAwKTtcbiAgICAgICAgfVxuICAgIH1cblxuXG59XG5mdW5jdGlvbiBydW5DbGVhclRpbWVvdXQobWFya2VyKSB7XG4gICAgaWYgKGNhY2hlZENsZWFyVGltZW91dCA9PT0gY2xlYXJUaW1lb3V0KSB7XG4gICAgICAgIC8vbm9ybWFsIGVudmlyb21lbnRzIGluIHNhbmUgc2l0dWF0aW9uc1xuICAgICAgICByZXR1cm4gY2xlYXJUaW1lb3V0KG1hcmtlcik7XG4gICAgfVxuICAgIC8vIGlmIGNsZWFyVGltZW91dCB3YXNuJ3QgYXZhaWxhYmxlIGJ1dCB3YXMgbGF0dGVyIGRlZmluZWRcbiAgICBpZiAoKGNhY2hlZENsZWFyVGltZW91dCA9PT0gZGVmYXVsdENsZWFyVGltZW91dCB8fCAhY2FjaGVkQ2xlYXJUaW1lb3V0KSAmJiBjbGVhclRpbWVvdXQpIHtcbiAgICAgICAgY2FjaGVkQ2xlYXJUaW1lb3V0ID0gY2xlYXJUaW1lb3V0O1xuICAgICAgICByZXR1cm4gY2xlYXJUaW1lb3V0KG1hcmtlcik7XG4gICAgfVxuICAgIHRyeSB7XG4gICAgICAgIC8vIHdoZW4gd2hlbiBzb21lYm9keSBoYXMgc2NyZXdlZCB3aXRoIHNldFRpbWVvdXQgYnV0IG5vIEkuRS4gbWFkZG5lc3NcbiAgICAgICAgcmV0dXJuIGNhY2hlZENsZWFyVGltZW91dChtYXJrZXIpO1xuICAgIH0gY2F0Y2ggKGUpe1xuICAgICAgICB0cnkge1xuICAgICAgICAgICAgLy8gV2hlbiB3ZSBhcmUgaW4gSS5FLiBidXQgdGhlIHNjcmlwdCBoYXMgYmVlbiBldmFsZWQgc28gSS5FLiBkb2Vzbid0ICB0cnVzdCB0aGUgZ2xvYmFsIG9iamVjdCB3aGVuIGNhbGxlZCBub3JtYWxseVxuICAgICAgICAgICAgcmV0dXJuIGNhY2hlZENsZWFyVGltZW91dC5jYWxsKG51bGwsIG1hcmtlcik7XG4gICAgICAgIH0gY2F0Y2ggKGUpe1xuICAgICAgICAgICAgLy8gc2FtZSBhcyBhYm92ZSBidXQgd2hlbiBpdCdzIGEgdmVyc2lvbiBvZiBJLkUuIHRoYXQgbXVzdCBoYXZlIHRoZSBnbG9iYWwgb2JqZWN0IGZvciAndGhpcycsIGhvcGZ1bGx5IG91ciBjb250ZXh0IGNvcnJlY3Qgb3RoZXJ3aXNlIGl0IHdpbGwgdGhyb3cgYSBnbG9iYWwgZXJyb3IuXG4gICAgICAgICAgICAvLyBTb21lIHZlcnNpb25zIG9mIEkuRS4gaGF2ZSBkaWZmZXJlbnQgcnVsZXMgZm9yIGNsZWFyVGltZW91dCB2cyBzZXRUaW1lb3V0XG4gICAgICAgICAgICByZXR1cm4gY2FjaGVkQ2xlYXJUaW1lb3V0LmNhbGwodGhpcywgbWFya2VyKTtcbiAgICAgICAgfVxuICAgIH1cblxuXG5cbn1cbnZhciBxdWV1ZSA9IFtdO1xudmFyIGRyYWluaW5nID0gZmFsc2U7XG52YXIgY3VycmVudFF1ZXVlO1xudmFyIHF1ZXVlSW5kZXggPSAtMTtcblxuZnVuY3Rpb24gY2xlYW5VcE5leHRUaWNrKCkge1xuICAgIGlmICghZHJhaW5pbmcgfHwgIWN1cnJlbnRRdWV1ZSkge1xuICAgICAgICByZXR1cm47XG4gICAgfVxuICAgIGRyYWluaW5nID0gZmFsc2U7XG4gICAgaWYgKGN1cnJlbnRRdWV1ZS5sZW5ndGgpIHtcbiAgICAgICAgcXVldWUgPSBjdXJyZW50UXVldWUuY29uY2F0KHF1ZXVlKTtcbiAgICB9IGVsc2Uge1xuICAgICAgICBxdWV1ZUluZGV4ID0gLTE7XG4gICAgfVxuICAgIGlmIChxdWV1ZS5sZW5ndGgpIHtcbiAgICAgICAgZHJhaW5RdWV1ZSgpO1xuICAgIH1cbn1cblxuZnVuY3Rpb24gZHJhaW5RdWV1ZSgpIHtcbiAgICBpZiAoZHJhaW5pbmcpIHtcbiAgICAgICAgcmV0dXJuO1xuICAgIH1cbiAgICB2YXIgdGltZW91dCA9IHJ1blRpbWVvdXQoY2xlYW5VcE5leHRUaWNrKTtcbiAgICBkcmFpbmluZyA9IHRydWU7XG5cbiAgICB2YXIgbGVuID0gcXVldWUubGVuZ3RoO1xuICAgIHdoaWxlKGxlbikge1xuICAgICAgICBjdXJyZW50UXVldWUgPSBxdWV1ZTtcbiAgICAgICAgcXVldWUgPSBbXTtcbiAgICAgICAgd2hpbGUgKCsrcXVldWVJbmRleCA8IGxlbikge1xuICAgICAgICAgICAgaWYgKGN1cnJlbnRRdWV1ZSkge1xuICAgICAgICAgICAgICAgIGN1cnJlbnRRdWV1ZVtxdWV1ZUluZGV4XS5ydW4oKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICBxdWV1ZUluZGV4ID0gLTE7XG4gICAgICAgIGxlbiA9IHF1ZXVlLmxlbmd0aDtcbiAgICB9XG4gICAgY3VycmVudFF1ZXVlID0gbnVsbDtcbiAgICBkcmFpbmluZyA9IGZhbHNlO1xuICAgIHJ1bkNsZWFyVGltZW91dCh0aW1lb3V0KTtcbn1cblxucHJvY2Vzcy5uZXh0VGljayA9IGZ1bmN0aW9uIChmdW4pIHtcbiAgICB2YXIgYXJncyA9IG5ldyBBcnJheShhcmd1bWVudHMubGVuZ3RoIC0gMSk7XG4gICAgaWYgKGFyZ3VtZW50cy5sZW5ndGggPiAxKSB7XG4gICAgICAgIGZvciAodmFyIGkgPSAxOyBpIDwgYXJndW1lbnRzLmxlbmd0aDsgaSsrKSB7XG4gICAgICAgICAgICBhcmdzW2kgLSAxXSA9IGFyZ3VtZW50c1tpXTtcbiAgICAgICAgfVxuICAgIH1cbiAgICBxdWV1ZS5wdXNoKG5ldyBJdGVtKGZ1biwgYXJncykpO1xuICAgIGlmIChxdWV1ZS5sZW5ndGggPT09IDEgJiYgIWRyYWluaW5nKSB7XG4gICAgICAgIHJ1blRpbWVvdXQoZHJhaW5RdWV1ZSk7XG4gICAgfVxufTtcblxuLy8gdjggbGlrZXMgcHJlZGljdGlibGUgb2JqZWN0c1xuZnVuY3Rpb24gSXRlbShmdW4sIGFycmF5KSB7XG4gICAgdGhpcy5mdW4gPSBmdW47XG4gICAgdGhpcy5hcnJheSA9IGFycmF5O1xufVxuSXRlbS5wcm90b3R5cGUucnVuID0gZnVuY3Rpb24gKCkge1xuICAgIHRoaXMuZnVuLmFwcGx5KG51bGwsIHRoaXMuYXJyYXkpO1xufTtcbnByb2Nlc3MudGl0bGUgPSAnYnJvd3Nlcic7XG5wcm9jZXNzLmJyb3dzZXIgPSB0cnVlO1xucHJvY2Vzcy5lbnYgPSB7fTtcbnByb2Nlc3MuYXJndiA9IFtdO1xucHJvY2Vzcy52ZXJzaW9uID0gJyc7IC8vIGVtcHR5IHN0cmluZyB0byBhdm9pZCByZWdleHAgaXNzdWVzXG5wcm9jZXNzLnZlcnNpb25zID0ge307XG5cbmZ1bmN0aW9uIG5vb3AoKSB7fVxuXG5wcm9jZXNzLm9uID0gbm9vcDtcbnByb2Nlc3MuYWRkTGlzdGVuZXIgPSBub29wO1xucHJvY2Vzcy5vbmNlID0gbm9vcDtcbnByb2Nlc3Mub2ZmID0gbm9vcDtcbnByb2Nlc3MucmVtb3ZlTGlzdGVuZXIgPSBub29wO1xucHJvY2Vzcy5yZW1vdmVBbGxMaXN0ZW5lcnMgPSBub29wO1xucHJvY2Vzcy5lbWl0ID0gbm9vcDtcblxucHJvY2Vzcy5iaW5kaW5nID0gZnVuY3Rpb24gKG5hbWUpIHtcbiAgICB0aHJvdyBuZXcgRXJyb3IoJ3Byb2Nlc3MuYmluZGluZyBpcyBub3Qgc3VwcG9ydGVkJyk7XG59O1xuXG5wcm9jZXNzLmN3ZCA9IGZ1bmN0aW9uICgpIHsgcmV0dXJuICcvJyB9O1xucHJvY2Vzcy5jaGRpciA9IGZ1bmN0aW9uIChkaXIpIHtcbiAgICB0aHJvdyBuZXcgRXJyb3IoJ3Byb2Nlc3MuY2hkaXIgaXMgbm90IHN1cHBvcnRlZCcpO1xufTtcbnByb2Nlc3MudW1hc2sgPSBmdW5jdGlvbigpIHsgcmV0dXJuIDA7IH07XG4iLCIvKipcclxuICogV29yayB3aXRoIGRhdGEgc3RvcmVzXHJcbiAqL1xyXG5cclxuY29uc3QgREVCT1VOQ0VfVElNRSA9IDIwMDA7XHJcbmNvbnN0IERBVEFfU1RPUkVfUk9PVCA9IFwiL2FwaS9kYXRhL1wiO1xyXG5cclxudmFyIGlkYiA9IHJlcXVpcmUoXCJpZGJcIik7XHJcblxyXG4vLyBjYWNoZSBkYXRhIHN0b3JlIGluc3RhbmNlc1xyXG52YXIgc3RvcmVzID0ge307XHJcblxyXG4vLyBnZXQvY3JlYXRlIGEgZGF0YXN0b3JlXHJcbmV4cG9ydCBmdW5jdGlvbiBzdG9yZShuYW1lKSB7XHJcblx0Ly8gdXNlIHRoZSBjYWNoZWQgc3RvcmVcclxuXHRpZihuYW1lIGluIHN0b3Jlcykge1xyXG5cdFx0cmV0dXJuIHN0b3Jlc1tuYW1lXTtcclxuXHR9XHJcblxyXG5cdHZhciBzdG9yZSA9IG5ldyBTdG9yZShuYW1lKTtcclxuXHJcblx0Ly8gY2FjaGUgdGhlIGRhdGEgc3RvcmUgaW5zdGFuY2VcclxuXHRzdG9yZXNbbmFtZV0gPSBzdG9yZTtcclxuXHJcblx0Ly8gdGVsbCBhbnkgbGlzdGVuZXJzIHRoZSBzdG9yZSBoYXMgYmVlbiBjcmVhdGVkXHJcblx0bGlmZUxpbmUuZW1pdChcImRhdGEtc3RvcmUtY3JlYXRlZFwiLCBzdG9yZSk7XHJcblxyXG5cdHJldHVybiBzdG9yZTtcclxufTtcclxuXHJcbmNsYXNzIFN0b3JlIGV4dGVuZHMgbGlmZUxpbmUuRXZlbnRFbWl0dGVyIHtcclxuXHRjb25zdHJ1Y3RvcihuYW1lKSB7XHJcblx0XHRzdXBlcigpO1xyXG5cdFx0dGhpcy5uYW1lID0gbmFtZTtcclxuXHRcdHRoaXMuX2NhY2hlID0ge307XHJcblx0XHQvLyBkb24ndCBzZW5kIGR1cGxpY2F0ZSByZXF1ZXN0c1xyXG5cdFx0dGhpcy5fcmVxdWVzdGluZyA9IFtdO1xyXG5cdFx0Ly8gcHJvbWlzZSBmb3IgdGhlIGRhdGFiYXNlXHJcblx0XHR0aGlzLl9kYiA9IGlkYi5vcGVuKFwiZGF0YS1zdG9yZXNcIiwgMiwgZGIgPT4ge1xyXG5cdFx0XHQvLyB1cGdyYWRlIG9yIGNyZWF0ZSB0aGUgZGJcclxuXHRcdFx0aWYoZGIub2xkVmVyc2lvbiA8IDEpXHJcblx0XHRcdFx0ZGIuY3JlYXRlT2JqZWN0U3RvcmUoXCJhc3NpZ25tZW50c1wiLCB7IGtleVBhdGg6IFwiaWRcIiB9KTtcclxuXHRcdFx0aWYoZGIub2xkVmVyc2lvbiA8IDIpXHJcblx0XHRcdFx0ZGIuY3JlYXRlT2JqZWN0U3RvcmUoXCJzeW5jLXN0b3JlXCIsIHsga2V5UGF0aDogXCJpZFwiIH0pO1xyXG5cdFx0fSk7XHJcblx0fVxyXG5cclxuXHQvLyBzZXQgdGhlIGZ1bmN0aW9uIHRvIGRlc2VyaWFsaXplIGFsbCBkYXRhIGZyb20gdGhlIHNlcnZlclxyXG5cdHNldEluaXQoZm4pIHtcclxuXHRcdHRoaXMuX2Rlc2VyaWFsaXplciA9IGZuO1xyXG5cdH1cclxuXHJcblx0Ly8gZ2V0IGFsbCB0aGUgaXRlbXMgYW5kIGxpc3RlbiBmb3IgYW55IGNoYW5nZXNcclxuXHRnZXRBbGwoZm4pIHtcclxuXHRcdGlmKCFmbikge1xyXG5cdFx0XHQvLyBsb2FkIGl0ZW1zIGZyb20gaWRiXHJcblx0XHRcdHJldHVybiB0aGlzLl9kYi50aGVuKGRiID0+IHtcclxuXHRcdFx0XHRyZXR1cm4gZGIudHJhbnNhY3Rpb24odGhpcy5uYW1lKVxyXG5cdFx0XHRcdFx0Lm9iamVjdFN0b3JlKHRoaXMubmFtZSlcclxuXHRcdFx0XHRcdC5nZXRBbGwoKVxyXG5cdFx0XHR9KTtcclxuXHRcdH1cclxuXHJcblx0XHQvLyBnbyB0byB0aGUgY2FjaGUgZmlyc3RcclxuXHRcdGZuKGFycmF5RnJvbU9iamVjdCh0aGlzLl9jYWNoZSkpO1xyXG5cclxuXHRcdC8vIGxvYWQgaXRlbXMgZnJvbSBpZGJcclxuXHRcdHRoaXMuX2RiLnRoZW4oZGIgPT4ge1xyXG5cdFx0XHRkYi50cmFuc2FjdGlvbih0aGlzLm5hbWUpXHJcblx0XHRcdFx0Lm9iamVjdFN0b3JlKHRoaXMubmFtZSlcclxuXHRcdFx0XHQuZ2V0QWxsKClcclxuXHRcdFx0XHQudGhlbihhbGwgPT4ge1xyXG5cdFx0XHRcdFx0Ly8gc3RvcmUgaXRlbXMgaW4gdGhlIGNhY2hlXHJcblx0XHRcdFx0XHRmb3IobGV0IGl0ZW0gb2YgYWxsKSB7XHJcblx0XHRcdFx0XHRcdHRoaXMuX2NhY2hlW2l0ZW0uaWRdID0gaXRlbTtcclxuXHRcdFx0XHRcdH1cclxuXHJcblx0XHRcdFx0XHQvLyBub3RpZnkgbGlzdGVuZXJzIHdlIGxvYWRlZCB0aGUgZGF0YVxyXG5cdFx0XHRcdFx0dGhpcy5lbWl0KFwiY2hhbmdlXCIpO1xyXG5cdFx0XHRcdH0pO1xyXG5cdFx0fSk7XHJcblxyXG5cdFx0Ly8gbGlzdGVuIGZvciBhbnkgY2hhbmdlc1xyXG5cdFx0cmV0dXJuIHRoaXMub24oXCJjaGFuZ2VcIiwgKCkgPT4ge1xyXG5cdFx0XHQvLyB0aGUgY2hhbmdlcyB3aWxsIHdlIGluIHRoZSBjYWNoZVxyXG5cdFx0XHRmbihhcnJheUZyb21PYmplY3QodGhpcy5fY2FjaGUpKTtcclxuXHRcdH0pO1xyXG5cdH1cclxuXHJcblx0Ly8gZ2V0IGEgc2luZ2xlIGl0ZW0gYW5kIGxpc3RlbiBmb3IgY2hhbmdlc1xyXG5cdGdldChpZCwgZm4pIHtcclxuXHRcdC8vIGp1c3QgbG9hZCB0aGUgdmFsdWUgZnJvbSBpZGJcclxuXHRcdGlmKCFmbikge1xyXG5cdFx0XHQvLyBoaXQgdGhlIGNhY2hlXHJcblx0XHRcdGlmKHRoaXMuX2NhY2hlW2lkXSkgcmV0dXJuIFByb21pc2UucmVzb2x2ZSh0aGlzLl9jYWNoZVtpZF0pO1xyXG5cclxuXHRcdFx0Ly8gaGl0IGlkYlxyXG5cdFx0XHRyZXR1cm4gdGhpcy5fZGIudGhlbihkYiA9PiB7XHJcblx0XHRcdFx0cmV0dXJuIGRiLnRyYW5zYWN0aW9uKHRoaXMubmFtZSlcclxuXHRcdFx0XHRcdC5vYmplY3RTdG9yZSh0aGlzLm5hbWUpXHJcblx0XHRcdFx0XHQuZ2V0KGlkKVxyXG5cdFx0XHRcdFx0LnRoZW4oaXRlbSA9PiB7XHJcblx0XHRcdFx0XHRcdGlmKHR5cGVvZiB0aGlzLl9kZXNlcmlhbGl6ZXIgPT0gXCJmdW5jdGlvblwiKSB7XHJcblx0XHRcdFx0XHRcdFx0cmV0dXJuIHRoaXMuX2Rlc2VyaWFsaXplcihpdGVtKSB8fCBpdGVtO1xyXG5cdFx0XHRcdFx0XHR9XHJcblxyXG5cdFx0XHRcdFx0XHRyZXR1cm4gaXRlbTtcclxuXHRcdFx0XHRcdH0pO1xyXG5cdFx0XHR9KTtcclxuXHRcdH1cclxuXHJcblx0XHQvLyBnbyB0byB0aGUgY2FjaGUgZmlyc3RcclxuXHRcdGZuKHRoaXMuX2NhY2hlW2lkXSk7XHJcblxyXG5cdFx0Ly8gbG9hZCB0aGUgaXRlbSBmcm9tIGlkYlxyXG5cdFx0dGhpcy5fZGIudGhlbihkYiA9PiB7XHJcblx0XHRcdGRiLnRyYW5zYWN0aW9uKHRoaXMubmFtZSlcclxuXHRcdFx0XHQub2JqZWN0U3RvcmUodGhpcy5uYW1lKVxyXG5cdFx0XHRcdC5nZXQoaWQpXHJcblx0XHRcdFx0LnRoZW4oaXRlbSA9PiB7XHJcblx0XHRcdFx0XHRpZihpdGVtKSB7XHJcblx0XHRcdFx0XHRcdC8vIHN0b3JlIGl0ZW0gaW4gdGhlIGNhY2hlXHJcblx0XHRcdFx0XHRcdHRoaXMuX2NhY2hlW2l0ZW0uaWRdID0gaXRlbTtcclxuXHJcblx0XHRcdFx0XHRcdC8vIG5vdGlmeSBsaXN0ZW5lcnMgd2UgbG9hZGVkIHRoZSBkYXRhXHJcblx0XHRcdFx0XHRcdHRoaXMuZW1pdChcImNoYW5nZVwiKTtcclxuXHRcdFx0XHRcdH1cclxuXHRcdFx0XHR9KTtcclxuXHRcdH0pO1xyXG5cclxuXHRcdC8vIGxpc3RlbiBmb3IgYW55IGNoYW5nZXNcclxuXHRcdHJldHVybiB0aGlzLm9uKFwiY2hhbmdlXCIsICgpID0+IHtcclxuXHRcdFx0Zm4odGhpcy5fY2FjaGVbaWRdKTtcclxuXHRcdH0pO1xyXG5cdH1cclxuXHJcblx0Ly8gc3RvcmUgYSB2YWx1ZSBpbiB0aGUgc3RvcmVcclxuXHRzZXQodmFsdWUsIHNraXBzLCBvcHRzID0ge30pIHtcclxuXHRcdHZhciBpc05ldyA9ICEhdGhpcy5fY2FjaGVbdmFsdWUuaWRdO1xyXG5cclxuXHRcdC8vIGRlc2VyaWFsaXplXHJcblx0XHRpZih0eXBlb2YgdGhpcy5fZGVzZXJpYWxpemVyID09IFwiZnVuY3Rpb25cIikge1xyXG5cdFx0XHR2YWx1ZSA9IHRoaXMuX2Rlc2VyaWFsaXplcih2YWx1ZSkgfHwgdmFsdWU7XHJcblx0XHR9XHJcblxyXG5cdFx0Ly8gc3RvcmUgdGhlIHZhbHVlIGluIHRoZSBjYWNoZVxyXG5cdFx0dGhpcy5fY2FjaGVbdmFsdWUuaWRdID0gdmFsdWU7XHJcblxyXG5cdFx0Ly8gc2F2ZSB0aGUgaXRlbVxyXG5cdFx0dmFyIHNhdmUgPSAoKSA9PiB7XHJcblx0XHRcdC8vIHNhdmUgdGhlIGl0ZW0gaW4gdGhlIGRiXHJcblx0XHRcdHRoaXMuX2RiLnRoZW4oZGIgPT4ge1xyXG5cdFx0XHRcdGRiLnRyYW5zYWN0aW9uKHRoaXMubmFtZSwgXCJyZWFkd3JpdGVcIilcclxuXHRcdFx0XHRcdC5vYmplY3RTdG9yZSh0aGlzLm5hbWUpXHJcblx0XHRcdFx0XHQucHV0KHZhbHVlKTtcclxuXHRcdFx0fSk7XHJcblxyXG5cdFx0XHQvLyBzeW5jIHRoZSBjaGFuZ2VzIHRvIHRoZSBzZXJ2ZXJcclxuXHRcdFx0dGhpcy5wYXJ0aWFsRW1pdChcInN5bmMtcHV0XCIsIHNraXBzLCB2YWx1ZSwgaXNOZXcpO1xyXG5cdFx0fTtcclxuXHJcblx0XHQvLyBlbWl0IGEgY2hhbmdlXHJcblx0XHR0aGlzLnBhcnRpYWxFbWl0KFwiY2hhbmdlXCIsIHNraXBzKTtcclxuXHJcblx0XHQvLyBkb24ndCB3YWl0IHRvIHNlbmQgdGhlIGNoYW5nZXMgdG8gdGhlIHNlcnZlclxyXG5cdFx0aWYob3B0cy5zYXZlTm93KSByZXR1cm4gc2F2ZSgpO1xyXG5cdFx0ZWxzZSBkZWJvdW5jZShgJHt0aGlzLm5hbWV9LyR7dmFsdWUuaWR9YCwgc2F2ZSk7XHJcblx0fVxyXG5cclxuXHQvLyByZW1vdmUgYSB2YWx1ZSBmcm9tIHRoZSBzdG9yZVxyXG5cdHJlbW92ZShpZCwgc2tpcHMpIHtcclxuXHRcdC8vIHJlbW92ZSB0aGUgdmFsdWUgZnJvbSB0aGUgY2FjaGVcclxuXHRcdGRlbGV0ZSB0aGlzLl9jYWNoZVtpZF07XHJcblxyXG5cdFx0Ly8gZW1pdCBhIGNoYW5nZVxyXG5cdFx0dGhpcy5wYXJ0aWFsRW1pdChcImNoYW5nZVwiLCBza2lwcyk7XHJcblxyXG5cdFx0Ly8gc3luYyB0aGUgY2hhbmdlcyB0byB0aGUgc2VydmVyXHJcblx0XHR0aGlzLnBhcnRpYWxFbWl0KFwic3luYy1kZWxldGVcIiwgc2tpcHMsIGlkKTtcclxuXHJcblx0XHQvLyBkZWxldGUgdGhlIGl0ZW1cclxuXHRcdHJldHVybiB0aGlzLl9kYi50aGVuKGRiID0+IHtcclxuXHRcdFx0cmV0dXJuIGRiLnRyYW5zYWN0aW9uKHRoaXMubmFtZSwgXCJyZWFkd3JpdGVcIilcclxuXHRcdFx0XHQub2JqZWN0U3RvcmUodGhpcy5uYW1lKVxyXG5cdFx0XHRcdC5kZWxldGUoaWQpO1xyXG5cdFx0fSk7XHJcblx0fVxyXG5cclxuXHQvLyBmb3JjZSBzYXZlcyB0byBnbyB0aHJvdWdoXHJcblx0Zm9yY2VTYXZlKCkge1xyXG5cdFx0Zm9yKGxldCB0aW1lciBvZiBPYmplY3QuZ2V0T3duUHJvcGVydHlOYW1lcyhkZWJvdW5jZVRpbWVycykpIHtcclxuXHRcdFx0Ly8gb25seSBzYXZlIGl0ZW1zIGZyb20gdGhpcyBkYXRhIHN0b3JlXHJcblx0XHRcdGlmKHRpbWVyLmluZGV4T2YoYCR7dGhpcy5uYW1lfS9gKSA9PT0gMCkge1xyXG5cdFx0XHRcdGNvbnRpbnVlO1xyXG5cdFx0XHR9XHJcblxyXG5cdFx0XHQvLyBsb29rIHVwIHRoZSB0aW1lciBpZFxyXG5cdFx0XHRsZXQgaWQgPSB0aW1lci5zdWJzdHIodGltZXIuaW5kZXhPZihcIi9cIikgKyAxKTtcclxuXHRcdFx0dmFyIHZhbHVlID0gdGhpcy5fY2FjaGVbaWRdO1xyXG5cclxuXHRcdFx0Ly8gY2xlYXIgdGhlIHRpbWVyXHJcblx0XHRcdGNsZWFyVGltZW91dCh0aW1lcik7XHJcblxyXG5cdFx0XHQvLyByZW1vdmUgdGhlIHRpbWVyIGZyb20gdGhlIGxpc3RcclxuXHRcdFx0ZGVsZXRlIGRlYm91bmNlVGltZXJzW3RpbWVyXTtcclxuXHJcblx0XHRcdC8vIGRvbid0IHNhdmUgb24gZGVsZXRlXHJcblx0XHRcdGlmKCF2YWx1ZSkgcmV0dXJuO1xyXG5cclxuXHRcdFx0Ly8gc2F2ZSB0aGUgaXRlbSBpbiB0aGUgZGJcclxuXHRcdFx0dGhpcy5fZGIudGhlbihkYiA9PiB7XHJcblx0XHRcdFx0ZGIudHJhbnNhY3Rpb24odGhpcy5uYW1lLCBcInJlYWR3cml0ZVwiKVxyXG5cdFx0XHRcdFx0Lm9iamVjdFN0b3JlKHRoaXMubmFtZSlcclxuXHRcdFx0XHRcdC5wdXQodmFsdWUpO1xyXG5cdFx0XHR9KTtcclxuXHJcblx0XHRcdC8vIHN5bmMgdGhlIGNoYW5nZXMgdG8gdGhlIHNlcnZlclxyXG5cdFx0XHR0aGlzLmVtaXQoXCJzeW5jLXB1dFwiLCB2YWx1ZSk7XHJcblx0XHR9XHJcblx0fVxyXG59XHJcblxyXG4vLyBnZXQgYW4gYXJyYXkgZnJvbSBhbiBvYmplY3RcclxudmFyIGFycmF5RnJvbU9iamVjdCA9IGZ1bmN0aW9uKG9iaikge1xyXG5cdHJldHVybiBPYmplY3QuZ2V0T3duUHJvcGVydHlOYW1lcyhvYmopXHJcblx0XHQubWFwKG5hbWUgPT4gb2JqW25hbWVdKTtcclxufTtcclxuXHJcbi8vIGRvbid0IGNhbGwgYSBmdW5jdGlvbiB0b28gb2Z0ZW5cclxudmFyIGRlYm91bmNlVGltZXJzID0ge307XHJcblxyXG52YXIgZGVib3VuY2UgPSAoaWQsIGZuKSA9PiB7XHJcblx0Ly8gY2FuY2VsIHRoZSBwcmV2aW91cyBkZWxheVxyXG5cdGNsZWFyVGltZW91dChkZWJvdW5jZVRpbWVyc1tpZF0pO1xyXG5cdC8vIHN0YXJ0IGEgbmV3IGRlbGF5XHJcblx0ZGVib3VuY2VUaW1lcnNbaWRdID0gc2V0VGltZW91dChmbiwgREVCT1VOQ0VfVElNRSk7XHJcbn07XHJcbiIsIi8qKlxyXG4gKiBCcm93c2VyIHNwZWNpZmljIGdsb2JhbHNcclxuICovXHJcblxyXG5saWZlTGluZS5tYWtlRG9tID0gcmVxdWlyZShcIi4vdXRpbC9kb20tbWFrZXJcIikuZGVmYXVsdDtcclxubGlmZUxpbmUuc3luY2VyID0gcmVxdWlyZShcIi4vc3luY2VyXCIpLnN5bmNlcjtcclxuXHJcbi8vIGFkZCBhIGZ1bmN0aW9uIGZvciBhZGRpbmcgYWN0aW9uc1xyXG5saWZlTGluZS5hZGRBY3Rpb24gPSBmdW5jdGlvbihuYW1lLCBmbikge1xyXG5cdC8vIGF0dGFjaCB0aGUgY2FsbGJhY2tcclxuXHR2YXIgbGlzdGVuZXIgPSBsaWZlTGluZS5vbihcImFjdGlvbi1leGVjLVwiICsgbmFtZSwgZm4pO1xyXG5cclxuXHQvLyBpbmZvcm0gYW55IGFjdGlvbiBwcm92aWRlcnNcclxuXHRsaWZlTGluZS5lbWl0KFwiYWN0aW9uLWNyZWF0ZVwiLCBuYW1lKTtcclxuXHJcblx0Ly8gYWxsIGFjdGlvbnMgcmVtb3ZlZFxyXG5cdHZhciByZW1vdmVBbGwgPSBsaWZlTGluZS5vbihcImFjdGlvbi1yZW1vdmUtYWxsXCIsICgpID0+IHtcclxuXHRcdC8vIHJlbW92ZSB0aGUgYWN0aW9uIGxpc3RlbmVyXHJcblx0XHRsaXN0ZW5lci51bnN1YnNjcmliZSgpO1xyXG5cdFx0cmVtb3ZlQWxsLnVuc3Vic2NyaWJlKCk7XHJcblx0fSk7XHJcblxyXG5cdHJldHVybiB7XHJcblx0XHR1bnN1YnNjcmliZSgpIHtcclxuXHRcdFx0Ly8gcmVtb3ZlIHRoZSBhY3Rpb24gbGlzdGVuZXJcclxuXHRcdFx0bGlzdGVuZXIudW5zdWJzY3JpYmUoKTtcclxuXHRcdFx0cmVtb3ZlQWxsLnVuc3Vic2NyaWJlKCk7XHJcblxyXG5cdFx0XHQvLyBpbmZvcm0gYW55IGFjdGlvbiBwcm92aWRlcnNcclxuXHRcdFx0bGlmZUxpbmUuZW1pdChcImFjdGlvbi1yZW1vdmVcIiwgbmFtZSk7XHJcblx0XHR9XHJcblx0fTtcclxufTtcclxuIiwiLy8gY3JlYXRlIHRoZSBnbG9iYWwgb2JqZWN0XHJcbmltcG9ydCBcIi4uL2NvbW1vbi9nbG9iYWxcIjtcclxuaW1wb3J0IFwiLi9nbG9iYWxcIjtcclxuXHJcbmltcG9ydCB7c3RvcmV9IGZyb20gXCIuL2RhdGEtc3RvcmVcIjtcclxuXHJcbnZhciBzeW5jU3RvcmUgPSBzdG9yZShcInN5bmMtc3RvcmVcIik7XHJcblxyXG4vLyBhbGwgdGhlIGZpbGVzIHRvIGNhY2hlXHJcbmNvbnN0IENBQ0hFRF9GSUxFUyA9IFtcclxuXHRcIi9cIixcclxuXHRcIi9zdGF0aWMvYnVuZGxlLmpzXCIsXHJcblx0XCIvc3RhdGljL3N0eWxlLmNzc1wiLFxyXG5cdFwiL3N0YXRpYy9pY29uLTE0NC5wbmdcIlxyXG5dO1xyXG5cclxuY29uc3QgU1RBVElDX0NBQ0hFID0gXCJzdGF0aWNcIjtcclxuXHJcbi8vIGNhY2hlIHRoZSB2ZXJzaW9uIG9mIHRoZSBjbGllbnRcclxudmFyIGNsaWVudFZlcnNpb247XHJcblxyXG4vLyBkb3dubG9hZCBhIG5ldyB2ZXJzaW9uXHJcbnZhciBkb3dubG9hZCA9IGZ1bmN0aW9uKCkge1xyXG5cdC8vIHNhdmUgdGhlIG5ldyB2ZXJzaW9uXHJcblx0dmFyIHZlcnNpb247XHJcblxyXG5cdC8vIG9wZW4gdGhlIGNhY2hlXHJcblx0cmV0dXJuIGNhY2hlcy5vcGVuKFNUQVRJQ19DQUNIRSlcclxuXHJcblx0LnRoZW4oY2FjaGUgPT4ge1xyXG5cdFx0Ly8gZG93bmxvYWQgYWxsIHRoZSBmaWxlc1xyXG5cdFx0cmV0dXJuIFByb21pc2UuYWxsKFxyXG5cdFx0XHRDQUNIRURfRklMRVMubWFwKHVybCA9PiB7XHJcblx0XHRcdFx0Ly8gZG93bmxvYWQgdGhlIGZpbGVcclxuXHRcdFx0XHRyZXR1cm4gZmV0Y2godXJsKVxyXG5cclxuXHRcdFx0XHQudGhlbihyZXMgPT4ge1xyXG5cdFx0XHRcdFx0Ly8gc2F2ZSB0aGUgZmlsZVxyXG5cdFx0XHRcdFx0dmFyIHByb21pc2VzID0gW1xyXG5cdFx0XHRcdFx0XHRjYWNoZS5wdXQobmV3IFJlcXVlc3QodXJsKSwgcmVzKVxyXG5cdFx0XHRcdFx0XTtcclxuXHJcblx0XHRcdFx0XHQvLyBzYXZlIHRoZSB2ZXJzaW9uXHJcblx0XHRcdFx0XHRpZighdmVyc2lvbikge1xyXG5cdFx0XHRcdFx0XHR2ZXJzaW9uID0gY2xpZW50VmVyc2lvbiA9IHJlcy5oZWFkZXJzLmdldChcInNlcnZlclwiKTtcclxuXHJcblx0XHRcdFx0XHRcdHByb21pc2VzLnB1c2goXHJcblx0XHRcdFx0XHRcdFx0c3luY1N0b3JlLnNldCh7XHJcblx0XHRcdFx0XHRcdFx0XHRpZDogXCJ2ZXJzaW9uXCIsXHJcblx0XHRcdFx0XHRcdFx0XHR2YWx1ZTogdmVyc2lvblxyXG5cdFx0XHRcdFx0XHRcdH0pXHJcblx0XHRcdFx0XHRcdCk7XHJcblx0XHRcdFx0XHR9XHJcblxyXG5cdFx0XHRcdFx0cmV0dXJuIHByb21pc2VzLmxlbmd0aCA9PSAxID8gcHJvbWlzZXNbMF0gOiBQcm9taXNlLmFsbChwcm9taXNlcyk7XHJcblx0XHRcdFx0fSk7XHJcblx0XHRcdH0pXHJcblx0XHQpXHJcblxyXG5cdFx0Ly8gbm90aWZ5IHRoZSBjbGllbnQocykgb2YgdGhlIHVwZGF0ZVxyXG5cdFx0LnRoZW4oKCkgPT4gbm90aWZ5Q2xpZW50cyh2ZXJzaW9uKSk7XHJcblx0fSk7XHJcbn07XHJcblxyXG4vLyBub3RpZnkgdGhlIGNsaWVudChzKSBvZiBhbiB1cGRhdGVcclxudmFyIG5vdGlmeUNsaWVudHMgPSBmdW5jdGlvbih2ZXJzaW9uKSB7XHJcblx0Ly8gZ2V0IGFsbCB0aGUgY2xpZW50c1xyXG5cdHJldHVybiBjbGllbnRzLm1hdGNoQWxsKHt9KVxyXG5cclxuXHQudGhlbihjbGllbnRzID0+IHtcclxuXHRcdGZvcihsZXQgY2xpZW50IG9mIGNsaWVudHMpIHtcclxuXHRcdFx0Ly8gc2VuZCB0aGUgdmVyc2lvblxyXG5cdFx0XHRjbGllbnQucG9zdE1lc3NhZ2Uoe1xyXG5cdFx0XHRcdHR5cGU6IFwidmVyc2lvbi1jaGFuZ2VcIixcclxuXHRcdFx0XHR2ZXJzaW9uXHJcblx0XHRcdH0pO1xyXG5cdFx0fVxyXG5cdH0pO1xyXG59O1xyXG5cclxuLy8gY2hlY2sgZm9yIHVwZGF0ZXNcclxudmFyIGNoZWNrRm9yVXBkYXRlcyA9IGZ1bmN0aW9uKG5ld1ZlcnNpb24pIHtcclxuXHQvLyBpZiB3ZSBoYXZlIGEgdmVyc2lvbiB1c2UgdGhhdFxyXG5cdGlmKG5ld1ZlcnNpb24pIHtcclxuXHRcdG5ld1ZlcnNpb24gPSBQcm9taXNlLnJlc29sdmUobmV3VmVyc2lvbik7XHJcblx0fVxyXG5cdC8vIGZldGNoIHRoZSB2ZXJzaW9uXHJcblx0ZWxzZSB7XHJcblx0XHRuZXdWZXJzaW9uID0gZmV0Y2goXCIvXCIpXHJcblxyXG5cdFx0LnRoZW4ocmVzID0+IHJlcy5oZWFkZXJzLmdldChcInNlcnZlclwiKSk7XHJcblx0fVxyXG5cclxuXHR2YXIgb2xkVmVyc2lvbjtcclxuXHJcblx0Ly8gYWxyZWFkeSBpbiBtZW1vcnlcclxuXHRpZihjbGllbnRWZXJzaW9uKSB7XHJcblx0XHRvbGRWZXJzaW9uID0gUHJvbWlzZS5yZXNvbHZlKGNsaWVudFZlcnNpb24pO1xyXG5cdH1cclxuXHRlbHNlIHtcclxuXHRcdG9sZFZlcnNpb24gPSBzeW5jU3RvcmUuZ2V0KFwidmVyc2lvblwiKS50aGVuKCh2YWx1ZSA9IHt9KSA9PiB2YWx1ZS52YWx1ZSlcclxuXHR9XHJcblxyXG5cdHJldHVybiBQcm9taXNlLmFsbChbXHJcblx0XHRuZXdWZXJzaW9uLFxyXG5cdFx0b2xkVmVyc2lvblxyXG5cdF0pXHJcblxyXG5cdC50aGVuKChbbmV3VmVyc2lvbiwgb2xkVmVyc2lvbl0pID0+IHtcclxuXHRcdC8vIHNhbWUgdmVyc2lvbiBkbyBub3RoaW5nXHJcblx0XHRpZihuZXdWZXJzaW9uID09IG9sZFZlcnNpb24pIHtcclxuXHJcblx0XHRcdHJldHVybiBzeW5jU3RvcmUuc2V0KHtcclxuXHRcdFx0XHRpZDogXCJ2ZXJzaW9uXCIsXHJcblx0XHRcdFx0dmFsdWU6IG9sZFZlcnNpb25cclxuXHRcdFx0fSk7XHJcblx0XHR9XHJcblxyXG5cdFx0Ly8gZG93bmxvYWQgdGhlIG5ldyB2ZXJzaW9uXHJcblx0XHRyZXR1cm4gZG93bmxvYWQoKTtcclxuXHR9KTtcclxufTtcclxuXHJcbi8vIHdoZW4gd2UgYXJlIGluc3RhbGxlZCBjaGVjayBmb3IgdXBkYXRlc1xyXG5zZWxmLmFkZEV2ZW50TGlzdGVuZXIoXCJpbnN0YWxsXCIsIGUgPT4gZS53YWl0VW50aWwoY2hlY2tGb3JVcGRhdGVzKCkpKTtcclxuXHJcbi8vIGhhbmRsZSBhIG5ldHdvcmsgUmVxdWVzdFxyXG5zZWxmLmFkZEV2ZW50TGlzdGVuZXIoXCJmZXRjaFwiLCBlID0+IHtcclxuXHQvLyBnZXQgdGhlIHBhZ2UgdXJsXHJcblx0dmFyIHVybCA9IG5ldyBVUkwoZS5yZXF1ZXN0LnVybCkucGF0aG5hbWU7XHJcblxyXG5cdC8vIGp1c3QgZ28gdG8gdGhlIHNlcnZlciBmb3IgYXBpIGNhbGxzXHJcblx0aWYodXJsLnN1YnN0cigwLCA1KSA9PSBcIi9hcGkvXCIpIHtcclxuXHJcblx0XHRlLnJlc3BvbmRXaXRoKFxyXG5cdFx0XHRmZXRjaChlLnJlcXVlc3QsIHtcclxuXHRcdFx0XHRjcmVkZW50aWFsczogXCJpbmNsdWRlXCJcclxuXHRcdFx0fSlcclxuXHJcblx0XHRcdC8vIG5ldHdvcmsgZXJyb3JcclxuXHRcdFx0LmNhdGNoKGVyciA9PiB7XHJcblx0XHRcdFx0Ly8gc2VuZCBhbiBlcnJvciByZXNwb25zZVxyXG5cdFx0XHRcdHJldHVybiBuZXcgUmVzcG9uc2UoSlNPTi5zdHJpbmdpZnkoe1xyXG5cdFx0XHRcdFx0c3RhdHVzOiBcImZhaWxcIixcclxuXHRcdFx0XHRcdGRhdGE6IHtcclxuXHRcdFx0XHRcdFx0cmVhc29uOiBcIm5ldHdvci1lcnJvclwiXHJcblx0XHRcdFx0XHR9XHJcblx0XHRcdFx0fSksIHtcclxuXHRcdFx0XHRcdGhlYWRlcnM6IHtcclxuXHRcdFx0XHRcdFx0XCJjb250ZW50LXR5cGVcIjogXCJhcHBsaWNhdGlvbi9qc29uXCJcclxuXHRcdFx0XHRcdH1cclxuXHRcdFx0XHR9KTtcclxuXHRcdFx0fSlcclxuXHJcblx0XHRcdC50aGVuKHJlcyA9PiB7XHJcblx0XHRcdFx0Ly8gY2hlY2sgZm9yIHVwZGF0ZXNcclxuXHRcdFx0XHRjaGVja0ZvclVwZGF0ZXMocmVzLmhlYWRlcnMuZ2V0KFwic2VydmVyXCIpKTtcclxuXHJcblx0XHRcdFx0cmV0dXJuIHJlcztcclxuXHRcdFx0fSlcclxuXHRcdCk7XHJcblx0fVxyXG5cdC8vIHJlc3BvbmQgZnJvbSB0aGUgY2FjaGVcclxuXHRlbHNlIHtcclxuXHRcdGUucmVzcG9uZFdpdGgoXHJcblx0XHRcdGNhY2hlcy5tYXRjaChlLnJlcXVlc3QpXHJcblxyXG5cdFx0XHQudGhlbihyZXMgPT4ge1xyXG5cdFx0XHRcdC8vIGlmIHRoZXJlIHdhcyBubyBtYXRjaCBzZW5kIHRoZSBpbmRleCBwYWdlXHJcblx0XHRcdFx0aWYoIXJlcykge1xyXG5cdFx0XHRcdFx0cmV0dXJuIGNhY2hlcy5tYXRjaChuZXcgUmVxdWVzdChcIi9cIikpO1xyXG5cdFx0XHRcdH1cclxuXHJcblx0XHRcdFx0cmV0dXJuIHJlcztcclxuXHRcdFx0fSlcclxuXHRcdCk7XHJcblx0fVxyXG59KTtcclxuIiwiLyoqXHJcbiAqIFN5bmNyb25pemUgdGhpcyBjbGllbnQgd2l0aCB0aGUgc2VydmVyXHJcbiAqL1xyXG5cclxuaW1wb3J0IHtzdG9yZSBhcyBkYXRhU3RvcmV9IGZyb20gXCIuL2RhdGEtc3RvcmVcIjtcclxuXHJcbnZhciBzeW5jU3RvcmUgPSBkYXRhU3RvcmUoXCJzeW5jLXN0b3JlXCIpO1xyXG5cclxuY29uc3QgU1RPUkVTID0gW1wiYXNzaWdubWVudHNcIl07XHJcblxyXG4vLyBjcmVhdGUgdGhlIGdsb2JhbCBzeW5jZXIgcmVmcmVuY2VcclxuZXhwb3J0IHZhciBzeW5jZXIgPSBuZXcgbGlmZUxpbmUuRXZlbnRFbWl0dGVyKCk7XHJcblxyXG4vLyBzYXZlIHN1YnNjcmlwdGlvbnMgdG8gZGF0YSBzdG9yZSBzeW5jIGV2ZW50cyBzbyB3ZSBkb250IHRyaWdnZXIgb3VyIHNlbGYgd2hlbiB3ZSBzeW5jXHJcbnZhciBzeW5jU3VicyA9IFtdO1xyXG5cclxuLy8gZG9uJ3Qgc3luYyB3aGlsZSB3ZSBhcmUgc3luY2luZ1xyXG52YXIgaXNTeW5jaW5nID0gZmFsc2U7XHJcbnZhciBzeW5jQWdhaW4gPSBmYWxzZTtcclxuXHJcbi8vIGFkZCBhIGNoYW5nZSB0byB0aGUgc3luYyBxdWV1ZVxyXG52YXIgZW5xdWV1ZUNoYW5nZSA9IGNoYW5nZSA9PiB7XHJcblx0Ly8gbG9hZCB0aGUgcXVldWVcclxuXHRyZXR1cm4gc3luY1N0b3JlLmdldChcImNoYW5nZS1xdWV1ZVwiKVxyXG5cclxuXHQudGhlbigoe2NoYW5nZXMgPSBbXX0gPSB7fSkgPT4ge1xyXG5cdFx0Ly8gZ2V0IHRoZSBpZCBmb3IgdGhlIGNoYW5nZVxyXG5cdFx0dmFyIGNoSWQgPSBjaGFuZ2UudHlwZSA9PSBcImRlbGV0ZVwiID8gY2hhbmdlLmlkIDogY2hhbmdlLmRhdGEuaWQ7XHJcblxyXG5cdFx0dmFyIGV4aXN0aW5nID0gY2hhbmdlcy5maW5kSW5kZXgoY2ggPT5cclxuXHRcdFx0Y2gudHlwZSA9PSBcImRlbGV0ZVwiID8gY2guaWQgPT0gY2hJZCA6IGNoLmRhdGEuaWQgPT0gY2hJZCk7XHJcblxyXG5cdFx0Ly8gcmVtb3ZlIHRoZSBleGlzdGluZyBjaGFuZ2VcclxuXHRcdGlmKGV4aXN0aW5nICE9PSAtMSkge1xyXG5cdFx0XHRjaGFuZ2VzLnNwbGljZShleGlzdGluZywgMSk7XHJcblx0XHR9XHJcblxyXG5cdFx0Ly8gYWRkIHRoZSBjaGFuZ2UgdG8gdGhlIHF1ZXVlXHJcblx0XHRjaGFuZ2VzLnB1c2goY2hhbmdlKTtcclxuXHJcblx0XHQvLyBzYXZlIHRoZSBxdWV1ZVxyXG5cdFx0cmV0dXJuIHN5bmNTdG9yZS5zZXQoe1xyXG5cdFx0XHRpZDogXCJjaGFuZ2UtcXVldWVcIixcclxuXHRcdFx0Y2hhbmdlc1xyXG5cdFx0fSk7XHJcblx0fSlcclxuXHJcblx0Ly8gc3luYyB3aGVuIGlkbGVcclxuXHQudGhlbigoKSA9PiBpZGxlKHN5bmNlci5zeW5jKSk7XHJcbn07XHJcblxyXG4vLyBhZGQgYSBzeW5jIGxpc3RlbmVyIHRvIGEgZGF0YSBzdG9yZVxyXG52YXIgb25TeW5jID0gZnVuY3Rpb24oZHMsIG5hbWUsIGZuKSB7XHJcblx0c3luY1N1YnMucHVzaChkcy5vbihcInN5bmMtXCIgKyBuYW1lLCBmbikpO1xyXG59O1xyXG5cclxuLy8gd2hlbiBhIGRhdGEgc3RvcmUgaXMgb3BlbmVkIGxpc3RlbiBmb3IgY2hhbmdlc1xyXG5saWZlTGluZS5vbihcImRhdGEtc3RvcmUtY3JlYXRlZFwiLCBkcyA9PiB7XHJcblx0Ly8gZG9uJ3Qgc3luYyB0aGUgc3luYyBzdG9yZVxyXG5cdGlmKGRzLm5hbWUgPT0gXCJzeW5jLXN0b3JlXCIpIHJldHVybjtcclxuXHJcblx0Ly8gY3JlYXRlIGFuZCBlbnF1ZXVlIGEgcHV0IGNoYW5nZVxyXG5cdG9uU3luYyhkcywgXCJwdXRcIiwgKHZhbHVlLCBpc05ldykgPT4ge1xyXG5cdFx0ZW5xdWV1ZUNoYW5nZSh7XHJcblx0XHRcdHN0b3JlOiBkcy5uYW1lLFxyXG5cdFx0XHR0eXBlOiBpc05ldyA/IFwiY3JlYXRlXCIgOiBcInB1dFwiLFxyXG5cdFx0XHRkYXRhOiB2YWx1ZVxyXG5cdFx0fSk7XHJcblx0fSk7XHJcblxyXG5cdC8vIGNyZWF0ZSBhbmQgZW5xdWV1ZSBhIGRlbGV0ZSBjaGFuZ2VcclxuXHRvblN5bmMoZHMsIFwiZGVsZXRlXCIsIGlkID0+IHtcclxuXHRcdGVucXVldWVDaGFuZ2Uoe1xyXG5cdFx0XHRzdG9yZTogZHMubmFtZSxcclxuXHRcdFx0dHlwZTogXCJkZWxldGVcIixcclxuXHRcdFx0aWQsXHJcblx0XHRcdHRpbWVzdGFtcDogRGF0ZS5ub3coKVxyXG5cdFx0fSk7XHJcblx0fSk7XHJcbn0pO1xyXG5cclxuLy8gd2FpdCBmb3Igc29tZSBpZGxlIHRpbWVcclxudmFyIGlkbGUgPSBmbiA9PiB7XHJcblx0aWYodHlwZW9mIHJlcXVlc3RJZGxlQ2FsbGJhY2sgPT0gXCJmdW5jdGlvblwiKSB7XHJcblx0XHRyZXF1ZXN0SWRsZUNhbGxiYWNrKGZuKTtcclxuXHR9XHJcblx0ZWxzZSB7XHJcblx0XHRzZXRUaW1lb3V0KGZuLCAxMDApO1xyXG5cdH1cclxufTtcclxuXHJcbi8vIHN5bmMgd2l0aCB0aGUgc2VydmVyXHJcbnN5bmNlci5zeW5jID0gZnVuY3Rpb24oKSB7XHJcblx0Ly8gZG9uJ3Qgc3luYyB3aGlsZSBvZmZsaW5lXHJcblx0aWYobmF2aWdhdG9yLm9ubGluZSkge1xyXG5cdFx0cmV0dXJuO1xyXG5cdH1cclxuXHJcblx0Ly8gb25seSBkbyBvbmUgc3luYyBhdCBhIHRpbWVcclxuXHRpZihpc1N5bmNpbmcpIHtcclxuXHRcdHN5bmNBZ2FpbiA9IHRydWU7XHJcblx0XHRyZXR1cm47XHJcblx0fVxyXG5cclxuXHRpc1N5bmNpbmcgPSB0cnVlO1xyXG5cclxuXHRzeW5jZXIuZW1pdChcInN5Y24tc3RhcnRcIik7XHJcblxyXG5cdC8vIGxvYWQgdGhlIGNoYW5nZSBxdWV1ZVxyXG5cdHZhciBwcm9taXNlcyA9IFtcclxuXHRcdHN5bmNTdG9yZS5nZXQoXCJjaGFuZ2UtcXVldWVcIikudGhlbigoe2NoYW5nZXMgPSBbXX0gPSB7fSkgPT4gY2hhbmdlcylcclxuXHRdO1xyXG5cclxuXHQvLyBsb2FkIGFsbCBpZHNcclxuXHRmb3IobGV0IHN0b3JlTmFtZSBvZiBTVE9SRVMpIHtcclxuXHRcdHByb21pc2VzLnB1c2goXHJcblx0XHRcdGRhdGFTdG9yZShzdG9yZU5hbWUpXHJcblx0XHRcdFx0LmdldEFsbCgpXHJcblx0XHRcdFx0LnRoZW4oaXRlbXMgPT4ge1xyXG5cdFx0XHRcdFx0dmFyIGRhdGVzID0ge307XHJcblxyXG5cdFx0XHRcdFx0Ly8gbWFwIG1vZGlmaWVkIGRhdGUgdG8gdGhlIGlkXHJcblx0XHRcdFx0XHRpdGVtcy5mb3JFYWNoKGl0ZW0gPT4gZGF0ZXNbaXRlbS5pZF0gPSBpdGVtLm1vZGlmaWVkKTtcclxuXHJcblx0XHRcdFx0XHRyZXR1cm4gW3N0b3JlTmFtZSwgZGF0ZXNdO1xyXG5cdFx0XHRcdH0pXHJcblx0XHQpO1xyXG5cdH1cclxuXHJcblx0UHJvbWlzZS5hbGwocHJvbWlzZXMpLnRoZW4oKFtjaGFuZ2VzLCAuLi5tb2RpZmllZHNdKSA9PiB7XHJcblx0XHQvLyBjb252ZXJ0IG1vZGlmaWVkcyB0byBhbiBvYmplY3RcclxuXHRcdHZhciBtb2RpZmllZHNPYmogPSB7fTtcclxuXHJcblx0XHRtb2RpZmllZHMuZm9yRWFjaChtb2RpZmllZCA9PiBtb2RpZmllZHNPYmpbbW9kaWZpZWRbMF1dID0gbW9kaWZpZWRbMV0pO1xyXG5cclxuXHRcdC8vIHNlbmQgdGhlIGNoYW5nZXMgdG8gdGhlIHNlcnZlclxyXG5cdFx0cmV0dXJuIGZldGNoKFwiL2FwaS9kYXRhL1wiLCB7XHJcblx0XHRcdG1ldGhvZDogXCJQT1NUXCIsXHJcblx0XHRcdGNyZWRlbnRpYWxzOiBcImluY2x1ZGVcIixcclxuXHRcdFx0Ym9keTogSlNPTi5zdHJpbmdpZnkoe1xyXG5cdFx0XHRcdGNoYW5nZXMsXHJcblx0XHRcdFx0bW9kaWZpZWRzOiBtb2RpZmllZHNPYmpcclxuXHRcdFx0fSlcclxuXHRcdH0pO1xyXG5cdH0pXHJcblxyXG5cdC8vIHBhcnNlIHRoZSBib2R5XHJcblx0LnRoZW4ocmVzID0+IHJlcy5qc29uKCkpXHJcblxyXG5cdC8vIGNhdGNoIGFueSBuZXR3b3JrIGVycm9yc1xyXG5cdC5jYXRjaCgoKSA9PiAoeyBzdGF0dXM6IFwiZmFpbFwiLCBkYXRhOiB7IHJlYXNvbjogXCJuZXR3b3JrLWVycm9yXCIgfSB9KSlcclxuXHJcblx0LnRoZW4oKHtzdGF0dXMsIGRhdGE6IHJlc3VsdHMsIHJlYXNvbn0pID0+IHtcclxuXHRcdC8vIGNhdGNoIGFueSBlcnJvclxyXG5cdFx0aWYoc3RhdHVzID09IFwiZmFpbFwiKSB7XHJcblx0XHRcdC8vIGxvZyB0aGUgdXNlciBpblxyXG5cdFx0XHRpZihyZXN1bHRzLnJlYXNvbiA9PSBcImxvZ2dlZC1vdXRcIikge1xyXG5cdFx0XHRcdGxpZmVMaW5lLm5hdi5uYXZpZ2F0ZShcIi9sb2dpblwiKTtcclxuXHRcdFx0fVxyXG5cclxuXHRcdFx0cmV0dXJuO1xyXG5cdFx0fVxyXG5cclxuXHRcdC8vIGNsZWFyIHRoZSBjaGFuZ2UgcXVldWVcclxuXHRcdHJlc3VsdHMudW5zaGlmdChcclxuXHRcdFx0c3luY1N0b3JlLnNldCh7XHJcblx0XHRcdFx0aWQ6IFwiY2hhbmdlLXF1ZXVlXCIsXHJcblx0XHRcdFx0Y2hhbmdlczogW11cclxuXHRcdFx0fSlcclxuXHRcdCk7XHJcblxyXG5cdFx0Ly8gYXBwbHkgdGhlIHJlc3VsdHNcclxuXHRcdHJldHVybiBQcm9taXNlLmFsbChcclxuXHRcdFx0cmVzdWx0cy5tYXAoKHJlc3VsdCwgaW5kZXgpID0+IHtcclxuXHRcdFx0XHQvLyBmaXJzdCByZXN1bHQgaXMgdGhlIHByb21pc2UgdG8gcmVzZXQgdGhlIGNoYW5nZSBxdWV1ZVxyXG5cdFx0XHRcdGlmKGluZGV4ID09PSAwKSByZXR1cm4gcmVzdWx0O1xyXG5cdFx0XHRcdGNvbnNvbGUubG9nKHJlc3VsdCk7XHJcblxyXG5cdFx0XHRcdC8vIGRlbGV0ZSB0aGUgbG9jYWwgY29weVxyXG5cdFx0XHRcdGlmKHJlc3VsdC5jb2RlID09IFwiaXRlbS1kZWxldGVkXCIpIHtcclxuXHRcdFx0XHRcdGxldCBzdG9yZSA9IGRhdGFTdG9yZShyZXN1bHQuc3RvcmUpO1xyXG5cclxuXHRcdFx0XHRcdHJldHVybiBzdG9yZS5yZW1vdmUocmVzdWx0LmlkLCBzeW5jU3Vicyk7XHJcblx0XHRcdFx0fVxyXG5cdFx0XHRcdC8vIHNhdmUgdGhlIG5ld2VyIHZlcnNpb24gZnJvbSB0aGUgc2VydmVyXHJcblx0XHRcdFx0ZWxzZSBpZihyZXN1bHQuY29kZSA9PSBcIm5ld2VyLXZlcnNpb25cIikge1xyXG5cdFx0XHRcdFx0bGV0IHN0b3JlID0gZGF0YVN0b3JlKHJlc3VsdC5zdG9yZSk7XHJcblxyXG5cdFx0XHRcdFx0cmV0dXJuIHN0b3JlLnNldChyZXN1bHQuZGF0YSwgc3luY1N1YnMsIHsgc2F2ZU5vdzogdHJ1ZSB9KTtcclxuXHRcdFx0XHR9XHJcblx0XHRcdH0pXHJcblx0XHQpO1xyXG5cdH0pXHJcblxyXG5cdC50aGVuKCgpID0+IHtcclxuXHRcdC8vIHJlbGVhc2UgdGhlIGxvY2tcclxuXHRcdGlzU3luY2luZyA9IGZhbHNlO1xyXG5cclxuXHRcdC8vIHRoZXJlIHdhcyBhbiBhdHRlbXB0IHRvIHN5bmMgd2hpbGUgd2Ugd2hlcmUgc3luY2luZ1xyXG5cdFx0aWYoc3luY0FnYWluKSB7XHJcblx0XHRcdHN5bmNBZ2FpbiA9IGZhbHNlO1xyXG5cclxuXHRcdFx0aWRsZShzeW5jZXIuc3luYyk7XHJcblx0XHR9XHJcblxyXG5cdFx0c3luY2VyLmVtaXQoXCJzeW5jLWNvbXBsZXRlXCIpO1xyXG5cdH0pO1xyXG59O1xyXG5cclxuLy8gZG9uJ3QgYWRkIGV2ZW50IGxpc3RlbmVycyBpbiB0aGUgc2VydmljZSB3b3JrZXJcclxuaWYodHlwZW9mIHdpbmRvdyA9PSBcIm9iamVjdFwiKSB7XHJcblx0Ly8gd2hlbiB3ZSBjb21lIGJhY2sgb24gbGluZSBzeW5jXHJcblx0d2luZG93LmFkZEV2ZW50TGlzdGVuZXIoXCJvbmxpbmVcIiwgKCkgPT4gc3luY2VyLnN5bmMoKSk7XHJcblxyXG5cdC8vIHdoZW4gdGhlIHVzZXIgbmF2aWdhdGVzIGJhY2sgc3luY1xyXG5cdHdpbmRvdy5hZGRFdmVudExpc3RlbmVyKFwidmlzaWJpbGl0eWNoYW5nZVwiLCAoKSA9PiB7XHJcblx0XHRpZighZG9jdW1lbnQuaGlkZGVuKSB7XHJcblx0XHRcdHN5bmNlci5zeW5jKCk7XHJcblx0XHR9XHJcblx0fSk7XHJcblxyXG5cdC8vIHN5bmMgb24gc3RhcnR1cFxyXG5cdHN5bmNlci5zeW5jKCk7XHJcbn1cclxuIiwiLyoqXHJcbiAqIEEgaGVscGVyIGZvciBidWlsZGluZyBkb20gbm9kZXNcclxuICovXHJcblxyXG5jb25zdCBTVkdfRUxFTUVOVFMgPSBbXCJzdmdcIiwgXCJsaW5lXCJdO1xyXG5jb25zdCBTVkdfTkFNRVNQQUNFID0gXCJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2Z1wiO1xyXG5cclxuLy8gYnVpbGQgYSBzaW5nbGUgZG9tIG5vZGVcclxudmFyIG1ha2VEb20gPSBmdW5jdGlvbihvcHRzID0ge30pIHtcclxuXHQvLyBnZXQgb3IgY3JlYXRlIHRoZSBuYW1lIG1hcHBpbmdcclxuXHR2YXIgbWFwcGVkID0gb3B0cy5tYXBwZWQgfHwge307XHJcblxyXG5cdHZhciAkZWw7XHJcblxyXG5cdC8vIHRoZSBlbGVtZW50IGlzIHBhcnQgb2YgdGhlIHN2ZyBuYW1lc3BhY2VcclxuXHRpZihTVkdfRUxFTUVOVFMuaW5kZXhPZihvcHRzLnRhZykgIT09IC0xKSB7XHJcblx0XHQkZWwgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50TlMoU1ZHX05BTUVTUEFDRSwgb3B0cy50YWcpO1xyXG5cdH1cclxuXHQvLyBhIHBsYWluIGVsZW1lbnRcclxuXHRlbHNlIHtcclxuXHRcdCRlbCA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQob3B0cy50YWcgfHwgXCJkaXZcIik7XHJcblx0fVxyXG5cclxuXHQvLyBzZXQgdGhlIGNsYXNzZXNcclxuXHRpZihvcHRzLmNsYXNzZXMpIHtcclxuXHRcdCRlbC5zZXRBdHRyaWJ1dGUoXCJjbGFzc1wiLCB0eXBlb2Ygb3B0cy5jbGFzc2VzID09IFwic3RyaW5nXCIgPyBvcHRzLmNsYXNzZXMgOiBvcHRzLmNsYXNzZXMuam9pbihcIiBcIikpO1xyXG5cdH1cclxuXHJcblx0Ly8gYXR0YWNoIHRoZSBhdHRyaWJ1dGVzXHJcblx0aWYob3B0cy5hdHRycykge1xyXG5cdFx0T2JqZWN0LmdldE93blByb3BlcnR5TmFtZXMob3B0cy5hdHRycylcclxuXHJcblx0XHQuZm9yRWFjaChhdHRyID0+ICRlbC5zZXRBdHRyaWJ1dGUoYXR0ciwgb3B0cy5hdHRyc1thdHRyXSkpO1xyXG5cdH1cclxuXHJcblx0Ly8gc2V0IHRoZSB0ZXh0IGNvbnRlbnRcclxuXHRpZihvcHRzLnRleHQpIHtcclxuXHRcdCRlbC5pbm5lclRleHQgPSBvcHRzLnRleHQ7XHJcblx0fVxyXG5cclxuXHQvLyBhdHRhY2ggdGhlIG5vZGUgdG8gaXRzIHBhcmVudFxyXG5cdGlmKG9wdHMucGFyZW50KSB7XHJcblx0XHRvcHRzLnBhcmVudC5pbnNlcnRCZWZvcmUoJGVsLCBvcHRzLmJlZm9yZSk7XHJcblx0fVxyXG5cclxuXHQvLyBhZGQgZXZlbnQgbGlzdGVuZXJzXHJcblx0aWYob3B0cy5vbikge1xyXG5cdFx0Zm9yKGxldCBuYW1lIG9mIE9iamVjdC5nZXRPd25Qcm9wZXJ0eU5hbWVzKG9wdHMub24pKSB7XHJcblx0XHRcdCRlbC5hZGRFdmVudExpc3RlbmVyKG5hbWUsIG9wdHMub25bbmFtZV0pO1xyXG5cclxuXHRcdFx0Ly8gYXR0YWNoIHRoZSBkb20gdG8gYSBkaXNwb3NhYmxlXHJcblx0XHRcdGlmKG9wdHMuZGlzcCkge1xyXG5cdFx0XHRcdG9wdHMuZGlzcC5hZGQoe1xyXG5cdFx0XHRcdFx0dW5zdWJzY3JpYmU6ICgpID0+ICRlbC5yZW1vdmVFdmVudExpc3RlbmVyKG5hbWUsIG9wdHMub25bbmFtZV0pXHJcblx0XHRcdFx0fSk7XHJcblx0XHRcdH1cclxuXHRcdH1cclxuXHR9XHJcblxyXG5cdC8vIHNldCB0aGUgdmFsdWUgb2YgYW4gaW5wdXQgZWxlbWVudFxyXG5cdGlmKG9wdHMudmFsdWUpIHtcclxuXHRcdCRlbC52YWx1ZSA9IG9wdHMudmFsdWU7XHJcblx0fVxyXG5cclxuXHQvLyBhZGQgdGhlIG5hbWUgbWFwcGluZ1xyXG5cdGlmKG9wdHMubmFtZSkge1xyXG5cdFx0bWFwcGVkW29wdHMubmFtZV0gPSAkZWw7XHJcblx0fVxyXG5cclxuXHQvLyBjcmVhdGUgdGhlIGNoaWxkIGRvbSBub2Rlc1xyXG5cdGlmKG9wdHMuY2hpbGRyZW4pIHtcclxuXHRcdGZvcihsZXQgY2hpbGQgb2Ygb3B0cy5jaGlsZHJlbikge1xyXG5cdFx0XHQvLyBtYWtlIGFuIGFycmF5IGludG8gYSBncm91cCBPYmplY3RcclxuXHRcdFx0aWYoQXJyYXkuaXNBcnJheShjaGlsZCkpIHtcclxuXHRcdFx0XHRjaGlsZCA9IHtcclxuXHRcdFx0XHRcdGdyb3VwOiBjaGlsZFxyXG5cdFx0XHRcdH07XHJcblx0XHRcdH1cclxuXHJcblx0XHRcdC8vIGF0dGFjaCBpbmZvcm1hdGlvbiBmb3IgdGhlIGdyb3VwXHJcblx0XHRcdGNoaWxkLnBhcmVudCA9ICRlbDtcclxuXHRcdFx0Y2hpbGQuZGlzcCA9IG9wdHMuZGlzcDtcclxuXHRcdFx0Y2hpbGQubWFwcGVkID0gbWFwcGVkO1xyXG5cclxuXHRcdFx0Ly8gYnVpbGQgdGhlIG5vZGUgb3IgZ3JvdXBcclxuXHRcdFx0bWFrZShjaGlsZCk7XHJcblx0XHR9XHJcblx0fVxyXG5cclxuXHRyZXR1cm4gbWFwcGVkO1xyXG59XHJcblxyXG4vLyBidWlsZCBhIGdyb3VwIG9mIGRvbSBub2Rlc1xyXG52YXIgbWFrZUdyb3VwID0gZnVuY3Rpb24oZ3JvdXApIHtcclxuXHQvLyBzaG9ydGhhbmQgZm9yIGEgZ3JvdXBzXHJcblx0aWYoQXJyYXkuaXNBcnJheShncm91cCkpIHtcclxuXHRcdGdyb3VwID0ge1xyXG5cdFx0XHRjaGlsZHJlbjogZ3JvdXBcclxuXHRcdH07XHJcblx0fVxyXG5cclxuXHQvLyBnZXQgb3IgY3JlYXRlIHRoZSBuYW1lIG1hcHBpbmdcclxuXHR2YXIgbWFwcGVkID0ge307XHJcblxyXG5cdGZvcihsZXQgbm9kZSBvZiBncm91cC5ncm91cCkge1xyXG5cdFx0Ly8gY29weSBvdmVyIHByb3BlcnRpZXMgZnJvbSB0aGUgZ3JvdXBcclxuXHRcdG5vZGUucGFyZW50IHx8IChub2RlLnBhcmVudCA9IGdyb3VwLnBhcmVudCk7XHJcblx0XHRub2RlLmRpc3AgfHwgKG5vZGUuZGlzcCA9IGdyb3VwLmRpc3ApO1xyXG5cdFx0bm9kZS5tYXBwZWQgPSBtYXBwZWQ7XHJcblxyXG5cdFx0Ly8gbWFrZSB0aGUgZG9tXHJcblx0XHRtYWtlKG5vZGUpO1xyXG5cdH1cclxuXHJcblx0Ly8gY2FsbCB0aGUgY2FsbGJhY2sgd2l0aCB0aGUgbWFwcGVkIG5hbWVzXHJcblx0aWYoZ3JvdXAuYmluZCkge1xyXG5cdFx0dmFyIHN1YnNjcmlwdGlvbiA9IGdyb3VwLmJpbmQobWFwcGVkKTtcclxuXHJcblx0XHQvLyBpZiB0aGUgcmV0dXJuIGEgc3Vic2NyaXB0aW9uIGF0dGFjaCBpdCB0byB0aGUgZGlzcG9zYWJsZVxyXG5cdFx0aWYoc3Vic2NyaXB0aW9uICYmIGdyb3VwLmRpc3ApIHtcclxuXHRcdFx0Z3JvdXAuZGlzcC5hZGQoc3Vic2NyaXB0aW9uKTtcclxuXHRcdH1cclxuXHR9XHJcblxyXG5cdHJldHVybiBtYXBwZWQ7XHJcbn07XHJcblxyXG4vLyBhIGNvbGxlY3Rpb24gb2Ygd2lkZ2V0c1xyXG52YXIgd2lkZ2V0cyA9IHt9O1xyXG5cclxuZXhwb3J0IGRlZmF1bHQgZnVuY3Rpb24gbWFrZShvcHRzKSB7XHJcblx0Ly8gaGFuZGxlIGEgZ3JvdXBcclxuXHRpZihBcnJheS5pc0FycmF5KG9wdHMpIHx8IG9wdHMuZ3JvdXApIHtcclxuXHRcdHJldHVybiBtYWtlR3JvdXAob3B0cyk7XHJcblx0fVxyXG5cdC8vIG1ha2UgYSB3aWRnZXRcclxuXHRlbHNlIGlmKG9wdHMud2lkZ2V0KSB7XHJcblx0XHR2YXIgd2lkZ2V0ID0gd2lkZ2V0c1tvcHRzLndpZGdldF07XHJcblxyXG5cdFx0Ly8gbm90IGRlZmluZWRcclxuXHRcdGlmKCF3aWRnZXQpIHtcclxuXHRcdFx0dGhyb3cgbmV3IEVycm9yKGBXaWRnZXQgJyR7b3B0cy53aWRnZXR9JyBpcyBub3QgZGVmaW5lZCBtYWtlIHN1cmUgaXRzIGJlZW4gaW1wb3J0ZWRgKTtcclxuXHRcdH1cclxuXHJcblx0XHQvLyBnZW5lcmF0ZSB0aGUgd2lkZ2V0IGNvbnRlbnRcclxuXHRcdHZhciBidWlsdCA9IHdpZGdldC5tYWtlKG9wdHMpO1xyXG5cclxuXHRcdHJldHVybiBtYWtlR3JvdXAoe1xyXG5cdFx0XHRwYXJlbnQ6IG9wdHMucGFyZW50LFxyXG5cdFx0XHRkaXNwOiBvcHRzLmRpc3AsXHJcblx0XHRcdGdyb3VwOiBBcnJheS5pc0FycmF5KGJ1aWx0KSA/IGJ1aWx0IDogW2J1aWx0XSxcclxuXHRcdFx0YmluZDogd2lkZ2V0LmJpbmQgJiYgd2lkZ2V0LmJpbmQuYmluZCh3aWRnZXQsIG9wdHMpXHJcblx0XHR9KTtcclxuXHR9XHJcblx0Ly8gbWFrZSBhIHNpbmdsZSBub2RlXHJcblx0ZWxzZSB7XHJcblx0XHRyZXR1cm4gbWFrZURvbShvcHRzKTtcclxuXHR9XHJcbn07XHJcblxyXG4vLyByZWdpc3RlciBhIHdpZGdldFxyXG5tYWtlLnJlZ2lzdGVyID0gZnVuY3Rpb24obmFtZSwgd2lkZ2V0KSB7XHJcblx0d2lkZ2V0c1tuYW1lXSA9IHdpZGdldDtcclxufTtcclxuIiwiLyoqXHJcbiAqIEtlZXAgYSBsaXN0IG9mIHN1YnNjcmlwdGlvbnMgdG8gdW5zdWJzY3JpYmUgZnJvbSB0b2dldGhlclxyXG4gKi9cclxuXHJcbmV4cG9ydCBkZWZhdWx0IGNsYXNzIERpc3Bvc2FibGUge1xyXG5cdGNvbnN0cnVjdG9yKCkge1xyXG5cdFx0dGhpcy5fc3Vic2NyaXB0aW9ucyA9IFtdO1xyXG5cdH1cclxuXHJcblx0Ly8gVW5zdWJzY3JpYmUgZnJvbSBhbGwgc3Vic2NyaXB0aW9uc1xyXG5cdGRpc3Bvc2UoKSB7XHJcblx0XHQvLyByZW1vdmUgdGhlIGZpcnN0IHN1YnNjcmlwdGlvbiB1bnRpbCB0aGVyZSBhcmUgbm9uZSBsZWZ0XHJcblx0XHR3aGlsZSh0aGlzLl9zdWJzY3JpcHRpb25zLmxlbmd0aCA+IDApIHtcclxuXHRcdFx0dGhpcy5fc3Vic2NyaXB0aW9ucy5zaGlmdCgpLnVuc3Vic2NyaWJlKCk7XHJcblx0XHR9XHJcblx0fVxyXG5cclxuXHQvLyBBZGQgYSBzdWJzY3JpcHRpb24gdG8gdGhlIGRpc3Bvc2FibGVcclxuXHRhZGQoc3Vic2NyaXB0aW9uKSB7XHJcblx0XHQvLyBjb3B5IHRoZSBkaXNwb3NhYmxlXHJcblx0XHRpZihzdWJzY3JpcHRpb24gaW5zdGFuY2VvZiBEaXNwb3NhYmxlKSB7XHJcblx0XHRcdC8vIGNvcHkgdGhlIHN1YnNjcmlwdGlvbnMgZnJvbSB0aGUgZGlzcG9zYWJsZVxyXG5cdFx0XHR0aGlzLl9zdWJzY3JpcHRpb25zID0gdGhpcy5fc3Vic2NyaXB0aW9ucy5jb25jYXQoc3Vic2NyaXB0aW9uLl9zdWJzY3JpcHRpb25zKTtcclxuXHJcblx0XHRcdC8vIHJlbW92ZSB0aGUgcmVmcmVuY2VzIGZyb20gdGhlIGRpc3Bvc2FibGVcclxuXHRcdFx0c3Vic2NyaXB0aW9uLl9zdWJzY3JpcHRpb25zID0gW107XHJcblx0XHR9XHJcblx0XHQvLyBhZGQgYSBzdWJzY3JpcHRpb25cclxuXHRcdGVsc2Uge1xyXG5cdFx0XHR0aGlzLl9zdWJzY3JpcHRpb25zLnB1c2goc3Vic2NyaXB0aW9uKTtcclxuXHRcdH1cclxuXHR9XHJcblxyXG5cdC8vIGRpc3Bvc2Ugd2hlbiBhbiBldmVudCBpcyBmaXJlZFxyXG5cdGRpc3Bvc2VPbihlbWl0dGVyLCBldmVudCkge1xyXG5cdFx0dGhpcy5hZGQoZW1pdHRlci5vbihldmVudCwgKCkgPT4gdGhpcy5kaXNwb3NlKCkpKTtcclxuXHR9XHJcbn07XHJcbiIsIi8qKlxyXG4gKiBBIGJhc2ljIGV2ZW50IGVtaXR0ZXJcclxuICovXHJcblxyXG5leHBvcnQgZGVmYXVsdCBjbGFzcyBFdmVudEVtaXR0ZXIge1xyXG5cdGNvbnN0cnVjdG9yKCkge1xyXG5cdFx0dGhpcy5fbGlzdGVuZXJzID0ge307XHJcblx0fVxyXG5cclxuXHQvKipcclxuXHQgKiBBZGQgYW4gZXZlbnQgbGlzdGVuZXJcclxuXHQgKi9cclxuXHRvbihuYW1lLCBsaXN0ZW5lcikge1xyXG5cdFx0Ly8gaWYgd2UgZG9uJ3QgaGF2ZSBhbiBleGlzdGluZyBsaXN0ZW5lcnMgYXJyYXkgY3JlYXRlIG9uZVxyXG5cdFx0aWYoIXRoaXMuX2xpc3RlbmVyc1tuYW1lXSkge1xyXG5cdFx0XHR0aGlzLl9saXN0ZW5lcnNbbmFtZV0gPSBbXTtcclxuXHRcdH1cclxuXHJcblx0XHQvLyBhZGQgdGhlIGxpc3RlbmVyXHJcblx0XHR0aGlzLl9saXN0ZW5lcnNbbmFtZV0ucHVzaChsaXN0ZW5lcik7XHJcblxyXG5cdFx0Ly8gZ2l2ZSB0aGVtIGEgc3Vic2NyaXB0aW9uXHJcblx0XHRyZXR1cm4ge1xyXG5cdFx0XHRfbGlzdGVuZXI6IGxpc3RlbmVyLFxyXG5cclxuXHRcdFx0dW5zdWJzY3JpYmU6ICgpID0+IHtcclxuXHRcdFx0XHQvLyBmaW5kIHRoZSBsaXN0ZW5lclxyXG5cdFx0XHRcdHZhciBpbmRleCA9IHRoaXMuX2xpc3RlbmVyc1tuYW1lXS5pbmRleE9mKGxpc3RlbmVyKTtcclxuXHJcblx0XHRcdFx0aWYoaW5kZXggIT09IC0xKSB7XHJcblx0XHRcdFx0XHR0aGlzLl9saXN0ZW5lcnNbbmFtZV0uc3BsaWNlKGluZGV4LCAxKTtcclxuXHRcdFx0XHR9XHJcblx0XHRcdH1cclxuXHRcdH07XHJcblx0fVxyXG5cclxuXHQvKipcclxuXHQgKiBFbWl0IGFuIGV2ZW50XHJcblx0ICovXHJcblx0ZW1pdChuYW1lLCAuLi5hcmdzKSB7XHJcblx0XHQvLyBjaGVjayBmb3IgbGlzdGVuZXJzXHJcblx0XHRpZih0aGlzLl9saXN0ZW5lcnNbbmFtZV0pIHtcclxuXHRcdFx0Zm9yKGxldCBsaXN0ZW5lciBvZiB0aGlzLl9saXN0ZW5lcnNbbmFtZV0pIHtcclxuXHRcdFx0XHQvLyBjYWxsIHRoZSBsaXN0ZW5lcnNcclxuXHRcdFx0XHRsaXN0ZW5lciguLi5hcmdzKTtcclxuXHRcdFx0fVxyXG5cdFx0fVxyXG5cdH1cclxuXHJcblx0LyoqXHJcblx0ICogRW1pdCBhbiBldmVudCBhbmQgc2tpcCBzb21lIGxpc3RlbmVyc1xyXG5cdCAqL1xyXG5cdHBhcnRpYWxFbWl0KG5hbWUsIHNraXBzID0gW10sIC4uLmFyZ3MpIHtcclxuXHRcdC8vIGFsbG93IGEgc2luZ2xlIGl0ZW1cclxuXHRcdGlmKCFBcnJheS5pc0FycmF5KHNraXBzKSkge1xyXG5cdFx0XHRza2lwcyA9IFtza2lwc107XHJcblx0XHR9XHJcblxyXG5cdFx0Ly8gY2hlY2sgZm9yIGxpc3RlbmVyc1xyXG5cdFx0aWYodGhpcy5fbGlzdGVuZXJzW25hbWVdKSB7XHJcblx0XHRcdGZvcihsZXQgbGlzdGVuZXIgb2YgdGhpcy5fbGlzdGVuZXJzW25hbWVdKSB7XHJcblx0XHRcdFx0Ly8gdGhpcyBldmVudCBsaXN0ZW5lciBpcyBiZWluZyBza2lwZWRcclxuXHRcdFx0XHRpZihza2lwcy5maW5kKHNraXAgPT4gc2tpcC5fbGlzdGVuZXIgPT0gbGlzdGVuZXIpKSB7XHJcblx0XHRcdFx0XHRjb250aW51ZTtcclxuXHRcdFx0XHR9XHJcblxyXG5cdFx0XHRcdC8vIGNhbGwgdGhlIGxpc3RlbmVyc1xyXG5cdFx0XHRcdGxpc3RlbmVyKC4uLmFyZ3MpO1xyXG5cdFx0XHR9XHJcblx0XHR9XHJcblx0fVxyXG59XHJcbiIsIi8qKlxyXG4gKiBDcmVhdGUgYSBnbG9iYWwgb2JqZWN0IHdpdGggY29tbW9ubHkgdXNlZCBtb2R1bGVzIHRvIGF2b2lkIDUwIG1pbGxpb24gcmVxdWlyZXNcclxuICovXHJcblxyXG5pbXBvcnQgRXZlbnRFbWl0dGVyIGZyb20gXCIuL2V2ZW50LWVtaXR0ZXJcIjtcclxuXHJcbnZhciBsaWZlTGluZSA9IG5ldyBFdmVudEVtaXR0ZXIoKTtcclxuXHJcbi8vIHBsYXRmb3JtIGRldGVjdGlvblxyXG5saWZlTGluZS5ub2RlID0gdHlwZW9mIHByb2Nlc3MgPT0gXCJvYmplY3RcIjtcclxubGlmZUxpbmUuYnJvd3NlciA9IHR5cGVvZiB3aW5kb3cgPT0gXCJvYmplY3RcIjtcclxuXHJcbi8vIGF0dGFjaCB1dGlsc1xyXG5saWZlTGluZS5EaXNwb3NhYmxlID0gcmVxdWlyZShcIi4vZGlzcG9zYWJsZVwiKS5kZWZhdWx0O1xyXG5saWZlTGluZS5FdmVudEVtaXR0ZXIgPSBFdmVudEVtaXR0ZXI7XHJcblxyXG4vLyBhdHRhY2ggbGlmZWxpbmUgdG8gdGhlIGdsb2JhbCBvYmplY3RcclxuKGxpZmVMaW5lLm5vZGUgPyBnbG9iYWwgOiBicm93c2VyKS5saWZlTGluZSA9IGxpZmVMaW5lO1xyXG4iXX0=
