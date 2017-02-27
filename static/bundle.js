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
 * Instantiate all the data stores
 */

var HttpAdaptor = require("../../common/data-stores/http-adaptor");
var PoolStore = require("../../common/data-stores/pool-store");

var initItem = function (item) {
	// instantiate the date
	if (item.date) {
		item.date = new Date(item.date);
	}
};

var assignmentsAdaptor = new HttpAdaptor("/api/data/");

exports.assignments = new PoolStore(assignmentsAdaptor, initItem);

// check our access level
assignmentsAdaptor.accessLevel().then(function (level) {
	// we are logged out
	if (level == "none") {
		lifeLine.nav.navigate("/login");
	}
});

},{"../../common/data-stores/http-adaptor":25,"../../common/data-stores/pool-store":28}],5:[function(require,module,exports){
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

},{"./syncer":8,"./util/dom-maker":10}],6:[function(require,module,exports){
"use strict";

// create the global object
require("../common/global");
require("./global");

// load all the widgets
require("./widgets/sidebar");
require("./widgets/content");
require("./widgets/link");
require("./widgets/list");
require("./widgets/input");
require("./widgets/toggle-btns");

// load all the views

var _require = require("./views/lists"),
    initNavBar = _require.initNavBar;

require("./views/item");
require("./views/edit");
require("./views/login");
require("./views/account");
require("./views/users");
require("./views/todo");

// set up the data store

var _require2 = require("./data-store"),
    store = _require2.store;

store("assignments").setInit(function (item) {
	// parse the date
	if (typeof item.date == "string") {
		item.date = new Date(item.date);
	}
});

// instantiate the dom
lifeLine.makeDom({
	parent: document.body,
	group: [{ widget: "sidebar" }, { widget: "content" }]
});

// Add a link to the toda/home page
lifeLine.addNavCommand("Todo", "/");

// add list views to the navbar
initNavBar();

// create a new assignment
lifeLine.addCommand("New assignment", function () {
	var id = Math.floor(Math.random() * 100000000);

	lifeLine.nav.navigate("/edit/" + id);
});

// create the logout button
lifeLine.addNavCommand("Account", "/account");

// register the service worker
require("./sw-helper");

},{"../common/global":29,"./data-store":3,"./global":5,"./sw-helper":7,"./views/account":11,"./views/edit":12,"./views/item":13,"./views/lists":14,"./views/login":15,"./views/todo":16,"./views/users":17,"./widgets/content":18,"./widgets/input":19,"./widgets/link":20,"./widgets/list":21,"./widgets/sidebar":22,"./widgets/toggle-btns":23}],7:[function(require,module,exports){
"use strict";

/**
 * Register and communicate with the service worker
 */

// register the service worker
if (navigator.serviceWorker) {
	// make sure it's registered
	//navigator.serviceWorker.register("/service-worker.js");

	// listen for messages
	navigator.serviceWorker.addEventListener("message", function (e) {
		// we just updated
		if (e.data.type == "version-change") {
			console.log("Updated to", e.data.version);

			// in dev mode reload the page
			if (e.data.version.indexOf("@") !== -1) {
				location.reload();
			}
		}
	});
}

},{}],8:[function(require,module,exports){
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

},{}],9:[function(require,module,exports){
"use strict";

/**
* Date related tools
*/

// check if the dates are the same day
exports.isSameDate = function (date1, date2) {
	return date1.getFullYear() == date2.getFullYear() && date1.getMonth() == date2.getMonth() && date1.getDate() == date2.getDate();
};

// check if a date is less than another
exports.isSoonerDate = function (date1, date2) {
	// check the year first
	if (date1.getFullYear() != date2.getFullYear()) {
		return date1.getFullYear() < date2.getFullYear();
	}

	// check the month next
	if (date1.getMonth() != date2.getMonth()) {
		return date1.getMonth() < date2.getMonth();
	}

	// check the day
	return date1.getDate() < date2.getDate();
};

// get the date days from now
exports.daysFromNow = function (days) {
	var date = new Date();

	// advance the date
	date.setDate(date.getDate() + days);

	return date;
};

var STRING_DAYS = ["Sunday", "Monday", "Tuesday", "Wedensday", "Thursday", "Friday", "Saturday"];

// convert a date to a string
exports.stringifyDate = function (date) {
	var opts = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : {};

	var strDate,
	    strTime = "";

	// check if the date is before today
	var beforeNow = date.getTime() < Date.now();

	// Today
	if (exports.isSameDate(date, new Date())) strDate = "Today";

	// Tomorrow
	else if (exports.isSameDate(date, exports.daysFromNow(1)) && !beforeNow) strDate = "Tomorrow";

		// day of the week (this week)
		else if (exports.isSoonerDate(date, exports.daysFromNow(7)) && !beforeNow) strDate = STRING_DAYS[date.getDay()];

			// print the date
			else strDate = STRING_DAYS[date.getDay()] + " " + (date.getMonth() + 1) + "/" + date.getDate();

	// add the time on
	if (opts.includeTime && !exports.isSkipTime(date, opts.skipTimes)) {
		return strDate + ", " + exports.stringifyTime(date);
	}

	return strDate;
};

// check if this is one of the given skip times
exports.isSkipTime = function (date) {
	var skips = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : [];

	return skips.find(function (skip) {
		return skip.hour === date.getHours() && skip.minute === date.getMinutes();
	});
};

// convert a time to a string
exports.stringifyTime = function (date) {
	var hour = date.getHours();

	// get the am/pm time
	var isAm = hour < 12;

	// midnight
	if (hour === 0) hour = 12;
	// after noon
	if (hour > 12) hour = hour - 12;

	var minute = date.getMinutes();

	// add a leading 0
	if (minute < 10) minute = "0" + minute;

	return hour + ":" + minute + (isAm ? "am" : "pm");
};

},{}],10:[function(require,module,exports){
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

},{}],11:[function(require,module,exports){
"use strict";

/**
 * A view for accessing/modifying information about the current user
 */

var _require = require("../../common/backup"),
    genBackupName = _require.genBackupName;

lifeLine.nav.register({
	matcher: /^(?:\/user\/(.+?)|\/account)$/,

	make: function (_ref) {
		var setTitle = _ref.setTitle,
		    content = _ref.content,
		    match = _ref.match;

		setTitle("Account");

		var url = "/api/auth/info/get";

		// add the username if one is given
		if (match[1]) url += "?username=" + match[1];

		// load the user data
		fetch(url, { credentials: "include" }).then(function (res) {
			return res.json();
		}).then(function (res) {
			// no such user or access is denied
			if (res.status == "fail") {
				lifeLine.makeDom({
					parent: content,
					classes: "content-padded",
					text: "Could not access the user you were looking for"
				});

				return;
			}

			var user = res.data;

			// generate the page
			var children = [];

			children.push({
				tag: "h2",
				text: user.username
			});

			// display the admin status of another user
			if (match[1]) {
				children.push({
					text: user.username + " is " + (user.admin ? "" : "not") + " an admin"
				});
			}
			// display the admin status of this user
			else {
					children.push({
						text: "You are " + (user.admin ? "" : "not") + " an admin"
					});

					// add a link at a list of all users
					if (user.admin) {
						children.push({ tag: "br" });

						children.push({
							widget: "link",
							href: "/users",
							text: "View all users"
						});
					}
				}

			// create a backup link
			if (!match[1]) {
				children.push({ tag: "br" });
				children.push({ tag: "br" });

				children.push({
					tag: "a",
					text: "Download backup",
					attrs: {
						href: "/api/backup",
						download: genBackupName()
					}
				});
			}

			var passwordChange = {};

			children.push({
				tag: "form",
				children: [{
					classes: "editor-row",
					children: [{
						widget: "input",
						type: "password",
						placeholder: "Old password",
						bind: passwordChange,
						prop: "oldPassword"
					}, {
						widget: "input",
						type: "password",
						placeholder: "New password",
						bind: passwordChange,
						prop: "password"
					}]
				}, {
					tag: "button",
					classes: "fancy-button",
					text: "Change password",
					attrs: {
						type: "submit"
					}
				}, {
					name: "msg"
				}],
				on: {
					// change the password
					submit: function (e) {
						e.preventDefault();

						// no password supplied
						if (!passwordChange.password) {
							showMsg("Enter a new password");
							return;
						}

						// send the password change request
						fetch("/api/auth/info/set?username=" + user.username, {
							credentials: "include",
							method: "POST",
							body: JSON.stringify(passwordChange)
						}).then(function (res) {
							return res.json();
						}).then(function (res) {
							// password change failed
							if (res.status == "fail") {
								showMsg(res.data.msg);
							}

							if (res.status == "success") {
								showMsg("Password changed");
							}
						});
					}
				}
			});

			children.push({ tag: "br" });
			children.push({ tag: "br" });

			// only display the logout button if we are on the /account page
			if (!match[1]) {
				children.push({
					tag: "button",
					classes: "fancy-button",
					text: "Logout",
					on: {
						click: function () {
							// send the logout request
							fetch("/api/auth/logout", { credentials: "include" })

							// return to the login page
							.then(function () {
								return lifeLine.nav.navigate("/login");
							});
						}
					}
				});
			}

			var _lifeLine$makeDom = lifeLine.makeDom({
				parent: content,
				classes: "content-padded",
				children: children
			}),
			    msg = _lifeLine$makeDom.msg;

			// show a message


			var showMsg = function (text) {
				msg.innerText = text;
			};
		});
	}
});

},{"../../common/backup":24}],12:[function(require,module,exports){
"use strict";

var _slicedToArray = function () { function sliceIterator(arr, i) { var _arr = []; var _n = true; var _d = false; var _e = undefined; try { for (var _i = arr[Symbol.iterator](), _s; !(_n = (_s = _i.next()).done); _n = true) { _arr.push(_s.value); if (i && _arr.length === i) break; } } catch (err) { _d = true; _e = err; } finally { try { if (!_n && _i["return"]) _i["return"](); } finally { if (_d) throw _e; } } return _arr; } return function (arr, i) { if (Array.isArray(arr)) { return arr; } else if (Symbol.iterator in Object(arr)) { return sliceIterator(arr, i); } else { throw new TypeError("Invalid attempt to destructure non-iterable instance"); } }; }();

/**
 * Edit an assignemnt
 */

var _require = require("../util/date"),
    daysFromNow = _require.daysFromNow,
    stringifyDate = _require.stringifyDate;

var _require2 = require("../data-stores"),
    assignments = _require2.assignments;

;

lifeLine.nav.register({
	matcher: /^\/edit\/(.+?)$/,

	make: function (_ref) {
		var match = _ref.match,
		    content = _ref.content,
		    setTitle = _ref.setTitle,
		    disposable = _ref.disposable;

		var actionSub, deleteSub;

		// if we make a change don't refresh the page
		var debounce;

		var changeSub = assignments.query({ id: match[1] }, function (_ref2) {
			var _ref3 = _slicedToArray(_ref2, 1),
			    item = _ref3[0];

			// if we make a change don't refresh the page
			if (debounce) {
				debounce = false;

				return;
			}

			// clear the content
			content.innerHTML = "";

			// remove the previous action
			if (actionSub) {
				actionSub.unsubscribe();
				deleteSub.unsubscribe();
			}

			// add a button back to the view
			if (item) {
				actionSub = lifeLine.addAction("View", function () {
					return lifeLine.nav.navigate("/item/" + item.id);
				});

				deleteSub = lifeLine.addAction("Delete", function () {
					// remove the item
					assignments.remove(item.id);

					// navigate away
					lifeLine.nav.navigate("/");
				});
			}

			// if the item does not exist create it
			if (!item) {
				item = {
					name: "Unnamed item",
					class: "Class",
					date: genDate(),
					id: match[1],
					description: "",
					modified: Date.now(),
					type: "assignment",
					done: false
				};
			}

			// set the inital title
			setTitle("Editing");

			// save changes
			var change = function () {
				// update the modified date
				item.modified = Date.now();

				// find the date and time inputs
				var dateInput = document.querySelector("input[type=date]");
				var timeInput = document.querySelector("input[type=time]");

				// parse the date
				item.date = new Date(dateInput.value + " " + timeInput.value);

				// remove assignemnt fields from tasks
				if (item.type == "task") {
					delete item.date;
					delete item.class;
				}

				// add a button back to the view
				if (!actionSub) {
					actionSub = lifeLine.addAction("View", function () {
						return lifeLine.nav.navigate("/item/" + item.id);
					});

					deleteSub = lifeLine.addAction("Delete", function () {
						// remove the item
						assignments.remove(item.id);

						// navigate away
						lifeLine.nav.navigate("/");
					});
				}

				debounce = true;

				// save the changes
				assignments.set(item);
			};

			// hide and show specific fields for different assignment types
			var toggleFields = function () {
				if (item.type == "task") {
					mapped.classField.style.display = "none";
					mapped.dateField.style.display = "none";
				} else {
					mapped.classField.style.display = "";
					mapped.dateField.style.display = "";
				}

				// fill in date if it is missing
				if (!item.date) {
					item.date = genDate();
				}

				if (!item.class) {
					item.class = "Class";
				}
			};

			// render the ui
			var mapped = lifeLine.makeDom({
				parent: content,
				group: [{
					classes: "editor-row",
					children: [{
						widget: "input",
						bind: item,
						prop: "name",
						change: change
					}]
				}, {
					classes: "editor-row",
					children: [{
						widget: "toggle-btns",
						btns: [{ text: "Assignment", value: "assignment" }, { text: "Task", value: "task" }],
						value: item.type,
						change: function (type) {
							// update the item type
							item.type = type;

							// hide/show specific fields
							toggleFields();

							// emit the change
							change();
						}
					}]
				}, {
					name: "classField",
					classes: "editor-row",
					children: [{
						widget: "input",
						bind: item,
						prop: "class",
						change: change
					}]
				}, {
					name: "dateField",
					classes: "editor-row",
					children: [{
						widget: "input",
						type: "date",
						value: item.date && item.date.getFullYear() + "-" + pad(item.date.getMonth() + 1) + "-" + pad(item.date.getDate()),
						change: change
					}, {
						widget: "input",
						type: "time",
						value: item.date && item.date.getHours() + ":" + pad(item.date.getMinutes()),
						change: change
					}]
				}, {
					classes: "textarea-wrapper",
					children: [{
						widget: "input",
						tag: "textarea",
						classes: "textarea-fill",
						placeholder: "Description",
						bind: item,
						prop: "description",
						change: change
					}]
				}]
			});

			// show the fields for this item type
			toggleFields();
		});

		// remove the subscription when this view is destroyed
		disposable.add(changeSub);
	}
});

// add a leading 0 if a number is less than 10
var pad = function (number) {
	return number < 10 ? "0" + number : number;
};

// create a date of today at 11:59pm
var genDate = function () {
	var date = new Date();

	// set the time
	date.setHours(23);
	date.setMinutes(59);

	return date;
};

},{"../data-stores":4,"../util/date":9}],13:[function(require,module,exports){
"use strict";

var _slicedToArray = function () { function sliceIterator(arr, i) { var _arr = []; var _n = true; var _d = false; var _e = undefined; try { for (var _i = arr[Symbol.iterator](), _s; !(_n = (_s = _i.next()).done); _n = true) { _arr.push(_s.value); if (i && _arr.length === i) break; } } catch (err) { _d = true; _e = err; } finally { try { if (!_n && _i["return"]) _i["return"](); } finally { if (_d) throw _e; } } return _arr; } return function (arr, i) { if (Array.isArray(arr)) { return arr; } else if (Symbol.iterator in Object(arr)) { return sliceIterator(arr, i); } else { throw new TypeError("Invalid attempt to destructure non-iterable instance"); } }; }();

/**
 * The view for an assignment
 */

var _require = require("../util/date"),
    daysFromNow = _require.daysFromNow,
    stringifyDate = _require.stringifyDate;

var _require2 = require("../data-stores"),
    assignments = _require2.assignments;

lifeLine.nav.register({
	matcher: /^\/item\/(.+?)$/,

	make: function (_ref) {
		var match = _ref.match,
		    setTitle = _ref.setTitle,
		    content = _ref.content,
		    disposable = _ref.disposable;

		var actionDoneSub, actionEditSub;

		disposable.add(assignments.query({ id: match[1] }, function (_ref2) {
			var _ref3 = _slicedToArray(_ref2, 1),
			    item = _ref3[0];

			// clear the content
			content.innerHTML = "";

			// remove the old action
			if (actionDoneSub) {
				actionDoneSub.unsubscribe();
				actionEditSub.unsubscribe();
			}

			// no such assignment
			if (!item) {
				setTitle("Not found");

				lifeLine.makeDom({
					parent: content,
					classes: "content-padded",
					children: [{
						tag: "span",
						text: "The assignment you where looking for could not be found. "
					}, {
						widget: "link",
						href: "/",
						text: "Go home."
					}]
				});

				return;
			}

			// set the title for the content
			setTitle("Assignment");

			// mark the item as done
			actionDoneSub = lifeLine.addAction(item.done ? "Done" : "Not done", function () {
				// mark the item done
				item.done = !item.done;

				// update the modified time
				item.modified = Date.now();

				// save the change
				assignments.set(item);
			});

			// edit the item
			actionEditSub = lifeLine.addAction("Edit", function () {
				return lifeLine.nav.navigate("/edit/" + item.id);
			});

			// times to skip
			var skipTimes = [{ hour: 23, minute: 59 }];

			lifeLine.makeDom({
				parent: content,
				classes: "content-padded",
				children: [{
					classes: "assignment-name",
					text: item.name
				}, {
					classes: "assignment-info-row",
					children: [{
						classes: "assignment-info-grow",
						text: item.class
					}, {
						text: item.date && stringifyDate(item.date, { includeTime: true, skipTimes: skipTimes })
					}]
				}, {
					classes: "assignment-description",
					text: item.description
				}]
			});
		}));
	}
});

},{"../data-stores":4,"../util/date":9}],14:[function(require,module,exports){
"use strict";

/**
 * Display a list of upcomming assignments
 */

var _require = require("../util/date"),
    daysFromNow = _require.daysFromNow,
    isSameDate = _require.isSameDate,
    stringifyDate = _require.stringifyDate,
    stringifyTime = _require.stringifyTime,
    isSoonerDate = _require.isSoonerDate;

var _require2 = require("../data-stores"),
    assignments = _require2.assignments;

// all the different lists


var LISTS = [{
	url: "/week",
	title: "This week",
	createCtx: function () {
		return {
			// days to the end of this week
			endDate: daysFromNow(7 - new Date().getDay()),
			// todays date
			today: new Date()
		};
	},
	// show all at reasonable number of incomplete assignments
	filter: function (item, _ref) {
		var today = _ref.today,
		    endDate = _ref.endDate;

		// show all tasks
		if (item.type == "task") return true;

		// check if the item is past this week
		if (!isSoonerDate(item.date, endDate) && !isSameDate(item.date, endDate)) return;

		// check if the date is before today
		if (isSoonerDate(item.date, today)) return;

		return true;
	},
	query: { done: false }
}, {
	url: "/upcoming",
	query: { done: false },
	title: "Upcoming"
}, {
	url: "/done",
	query: { done: true },
	title: "Done"
}];

// add list view links to the navbar
exports.initNavBar = function () {
	LISTS.forEach(function (list) {
		return lifeLine.addNavCommand(list.title, list.url);
	});
};

lifeLine.nav.register({
	matcher: function (url) {
		return LISTS.find(function (list) {
			return list.url == url;
		});
	},


	// make the list
	make: function (_ref2) {
		var setTitle = _ref2.setTitle,
		    content = _ref2.content,
		    disposable = _ref2.disposable,
		    match = _ref2.match;

		disposable.add(assignments.query(match.query || {}, function (data) {
			// clear the content
			content.innerHTML = "";

			// set the page title
			setTitle(match.title);

			// the context for the filter function
			var ctx;

			if (match.createCtx) {
				ctx = match.createCtx();
			}

			// run the filter function
			if (match.filter) {
				data = data.filter(function (item) {
					return match.filter(item, ctx);
				});
			}

			// sort the assingments
			data.sort(function (a, b) {
				// tasks are below assignments
				if (a.type == "task" && b.type != "task") return 1;
				if (a.type != "task" && b.type == "task") return -1;

				// sort by due date
				if (a.type == "assignment" && b.type == "assignment") {
					if (a.date.getTime() != b.date.getTime()) {
						return a.date.getTime() - b.date.getTime();
					}
				}

				// order by name
				if (a.name < b.name) return -1;
				if (a.name > b.name) return 1;

				return 0;
			});

			// make the groups
			var groups = {};

			// render the list
			data.forEach(function (item, i) {
				// get the header name
				var dateStr = item.type == "task" ? "Tasks" : stringifyDate(item.date);

				// make sure the header exists
				groups[dateStr] || (groups[dateStr] = []);

				// add the item to the list
				var items = [{ text: item.name, grow: true }];

				if (item.type != "task") {
					// show the end time for any non 11:59pm times
					if (item.date.getHours() != 23 || item.date.getMinutes() != 59) {
						items.push(stringifyTime(item.date));
					}

					// show the class
					items.push(item.class);
				}

				groups[dateStr].push({
					href: "/item/" + item.id,
					items: items
				});
			});

			// display all items
			lifeLine.makeDom({
				parent: content,
				widget: "list",
				items: groups
			});
		}));
	}
});

},{"../data-stores":4,"../util/date":9}],15:[function(require,module,exports){
"use strict";

/**
 * Show a login button to the user
 */

lifeLine.nav.register({
	matcher: "/login",

	make: function (_ref) {
		var setTitle = _ref.setTitle,
		    content = _ref.content;

		// set the page title
		setTitle("Login");

		// the users credentials
		var auth = {};

		// create the login form

		var _lifeLine$makeDom = lifeLine.makeDom({
			parent: content,
			tag: "form",
			classes: "content-padded",
			children: [{
				classes: "editor-row",
				children: [{
					widget: "input",
					bind: auth,
					prop: "username",
					placeholder: "Username"
				}]
			}, {
				classes: "editor-row",
				children: [{
					widget: "input",
					bind: auth,
					prop: "password",
					type: "password",
					placeholder: "Password"
				}]
			}, {
				tag: "button",
				text: "Login",
				classes: "fancy-button",
				attrs: {
					type: "submit"
				}
			}, {
				classes: "error-msg",
				name: "msg"
			}],
			on: {
				submit: function (e) {
					e.preventDefault();

					// send the login request
					fetch("/api/auth/login", {
						method: "POST",
						credentials: "include",
						body: JSON.stringify(auth)
					})

					// parse the json
					.then(function (res) {
						return res.json();
					})

					// process the response
					.then(function (res) {
						// login suceeded go home
						if (res.status == "success") {
							lifeLine.nav.navigate("/");
							return;
						}

						// login failed
						if (res.status == "fail") {
							errorMsg("Login failed");
						}
					});
				}
			}
		}),
		    username = _lifeLine$makeDom.username,
		    password = _lifeLine$makeDom.password,
		    msg = _lifeLine$makeDom.msg;

		// display an error message


		var errorMsg = function (text) {
			msg.innerText = text;
		};
	}
});

// logout
lifeLine.logout = function () {
	// send the logout request
	fetch("/api/auth/logout", {
		credentials: "include"
	})

	// go to the login page
	.then(function () {
		return lifeLine.nav.navigate("/login");
	});
};

},{}],16:[function(require,module,exports){
"use strict";

/**
 * A list of things todo
 */

var _require = require("../util/date"),
    daysFromNow = _require.daysFromNow,
    isSameDate = _require.isSameDate,
    stringifyTime = _require.stringifyTime;

var _require2 = require("../data-stores"),
    assignments = _require2.assignments;

lifeLine.nav.register({
	matcher: "/",

	make: function (_ref) {
		var setTitle = _ref.setTitle,
		    content = _ref.content,
		    disposable = _ref.disposable;

		setTitle("Todo");

		// load the items
		disposable.add(assignments.query({ done: false }, function (data) {
			// clear the old content
			content.innerHTML = "";

			var groups = {
				Tasks: [],
				Today: [],
				Tomorrow: []
			};

			// today and tomorrows dates
			var today = new Date();
			var tomorrow = daysFromNow(1);

			// select the items to display
			data.forEach(function (item) {
				// assignments for today
				if (item.type == "assignment") {
					// today
					if (isSameDate(today, item.date)) {
						groups.Today.push(createUi(item));
					}
					// tomorrow
					else if (isSameDate(tomorrow, item.date)) {
							groups.Tomorrow.push(createUi(item));
						}
				}

				// show any tasks
				if (item.type == "task") {
					groups.Tasks.push(createUi(item));
				}
			});

			// remove any empty fields
			Object.getOwnPropertyNames(groups).forEach(function (name) {
				// remove empty groups
				if (groups[name].length === 0) {
					delete groups[name];
				}
			});

			// render the list
			lifeLine.makeDom({
				parent: content,
				widget: "list",
				items: groups
			});
		}));
	}
});

// create a list item
var createUi = function (item) {
	// render a task
	if (item.type == "task") {
		return {
			href: "/item/" + item.id,
			items: [{
				text: item.name,
				grow: true
			}]
		};
	}
	// render an item
	else {
			return {
				href: "/item/" + item.id,
				items: [{
					text: item.name,
					grow: true
				}, stringifyTime(item.date), item.class]
			};
		}
};

},{"../data-stores":4,"../util/date":9}],17:[function(require,module,exports){
"use strict";

/**
 * A page with links to all users
 */

lifeLine.nav.register({
	matcher: "/users",

	make: function (_ref) {
		var setTitle = _ref.setTitle,
		    content = _ref.content;

		setTitle("All users");

		// load the list of users
		fetch("/api/auth/info/users", {
			credentials: "include"
		}).then(function (res) {
			return res.json();
		}).then(function (_ref2) {
			var status = _ref2.status,
			    users = _ref2.data;

			// not authenticated
			if (status == "fail") {
				lifeLine.makeDom({
					parent: content,
					classes: "content-padded",
					text: "You do not have access to the user list"
				});

				return;
			}

			// sort by admin status
			users.sort(function (a, b) {
				// sort admins
				if (a.admin && !b.admin) return -1;
				if (!a.admin && b.admin) return 1;

				// sort by username
				if (a.username < b.username) return -1;
				if (a.username > b.username) return 1;

				return 0;
			});

			var displayUsers = {
				Admins: [],
				Users: []
			};

			// generate the user list
			users.forEach(function (user) {
				// sort the users into admins and users
				displayUsers[user.admin ? "Admins" : "Users"].push({
					href: "/user/" + user.username,
					items: [{
						text: user.username,
						grow: true
					}]
				});
			});

			// display the user list
			lifeLine.makeDom({
				parent: content,
				widget: "list",
				items: displayUsers
			});
		})

		// something went wrong show an error message
		.catch(function (err) {
			lifeLine.makeDom({
				classes: "content-padded",
				text: err.message
			});
		});
	}
});

},{}],18:[function(require,module,exports){
"use strict";

/**
 * The main content pane for the app
 */

lifeLine.makeDom.register("content", {
	make: function () {
		return [{
			classes: "toolbar",
			children: [{
				tag: "svg",
				classes: "menu-icon",
				attrs: {
					viewBox: "0 0 60 50",
					width: "20",
					height: "15"
				},
				children: [{ tag: "line", attrs: { x1: "0", y1: "5", x2: "60", y2: "5" } }, { tag: "line", attrs: { x1: "0", y1: "25", x2: "60", y2: "25" } }, { tag: "line", attrs: { x1: "0", y1: "45", x2: "60", y2: "45" } }],
				on: {
					click: function () {
						return document.body.classList.toggle("sidebar-open");
					}
				}
			}, {
				classes: "toolbar-title",
				name: "title"
			}, {
				classes: "toolbar-buttons",
				name: "btns"
			}]
		}, {
			classes: "content",
			name: "content"
		}];
	},
	bind: function (opts, _ref) {
		var title = _ref.title,
		    btns = _ref.btns,
		    content = _ref.content;

		var disposable;

		// set the page title
		var setTitle = function (titleText) {
			title.innerText = titleText;
			document.title = titleText;
		};

		// add an action button
		lifeLine.on("action-create", function (name) {
			lifeLine.makeDom({
				parent: btns,
				tag: "button",
				classes: "toolbar-button",
				text: name,
				attrs: {
					"data-name": name
				},
				on: {
					click: function () {
						return lifeLine.emit("action-exec-" + name);
					}
				}
			});
		});

		// remove an action button
		lifeLine.on("action-remove", function (name) {
			var btn = btns.querySelector("[data-name=\"" + name + "\"]");

			if (btn) btn.remove();
		});

		// remove all the action buttons
		lifeLine.on("action-remove-all", function () {
			return btns.innerHTML = "";
		});

		// display the content for the view
		var updateView = function () {
			// destroy any listeners from old content
			if (disposable) {
				disposable.dispose();
			}

			// remove any action buttons
			lifeLine.emit("action-remove-all");

			// clear all the old content
			content.innerHTML = "";

			// create the disposable for the content
			disposable = new lifeLine.Disposable();

			var maker = notFoundMaker,
			    match;

			// find the correct content maker
			var _iteratorNormalCompletion = true;
			var _didIteratorError = false;
			var _iteratorError = undefined;

			try {
				for (var _iterator = contentMakers[Symbol.iterator](), _step; !(_iteratorNormalCompletion = (_step = _iterator.next()).done); _iteratorNormalCompletion = true) {
					var $maker = _step.value;

					// run a matcher function
					if (typeof $maker.matcher == "function") {
						match = $maker.matcher(location.pathname);
					}
					// a string match
					else if (typeof $maker.matcher == "string") {
							if ($maker.matcher == location.pathname) {
								match = $maker.matcher;
							}
						}
						// a regex match
						else {
								match = $maker.matcher.exec(location.pathname);
							}

					// match found stop searching
					if (match) {
						maker = $maker;

						break;
					}
				}

				// make the content for this route
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

			maker.make({ disposable: disposable, setTitle: setTitle, content: content, match: match });
		};

		// switch pages
		lifeLine.nav.navigate = function (url) {
			// update the url
			history.pushState(null, null, url);

			// show the new view
			updateView();
		};

		// switch pages when the user pushes the back button
		window.addEventListener("popstate", function () {
			return updateView();
		});

		// show the initial view
		updateView();
	}
});

// all content producers
var contentMakers = [];

// create the namespace
lifeLine.nav = {};

// register a content maker
lifeLine.nav.register = function (maker) {
	contentMakers.push(maker);
};

// the fall back maker for no such page
var notFoundMaker = {
	make: function (_ref2) {
		var setTitle = _ref2.setTitle,
		    content = _ref2.content;

		// update the page title
		setTitle("Not found");

		lifeLine.makeDom({
			parent: content,
			classes: "content-padded",
			children: [{
				tag: "span",
				text: "The page you are looking for could not be found. "
			}, {
				widget: "link",
				href: "/",
				text: "Go home"
			}]
		});
	}
};

},{}],19:[function(require,module,exports){
"use strict";

/**
 * Create an input field
 */

lifeLine.makeDom.register("input", {
	make: function (_ref) {
		var tag = _ref.tag,
		    type = _ref.type,
		    value = _ref.value,
		    change = _ref.change,
		    bind = _ref.bind,
		    prop = _ref.prop,
		    placeholder = _ref.placeholder,
		    classes = _ref.classes;

		// set the initial value of the bound object
		if (typeof bind == "object" && !value) {
			value = bind[prop];
		}

		var input = {
			tag: tag || "input",
			classes: classes || (tag == "textarea" ? "textarea" : "input") + "-fill",
			attrs: {},
			on: {
				input: function (e) {
					// update the property changed
					if (typeof bind == "object") {
						bind[prop] = e.target.value;
					}

					// call the callback
					if (typeof change == "function") {
						change(e.target.value);
					}
				}
			}
		};

		// attach values if they are given
		if (type) input.attrs.type = type;
		if (value) input.attrs.value = value;
		if (placeholder) input.attrs.placeholder = placeholder;

		// for textareas set innerText
		if (tag == "textarea") {
			input.text = value;
		}

		return input;
	}
});

},{}],20:[function(require,module,exports){
"use strict";

/**
 * A widget that creates a link that hooks into the navigator
 */

lifeLine.makeDom.register("link", {
	make: function (opts) {
		return {
			tag: "a",
			attrs: {
				href: opts.href
			},
			on: {
				click: function (e) {
					// don't over ride ctrl or alt or shift clicks
					if (e.ctrlKey || e.altKey || e.shiftKey) return;

					// don't navigate the page
					e.preventDefault();

					lifeLine.nav.navigate(opts.href);
				}
			},
			text: opts.text
		};
	}
});

},{}],21:[function(require,module,exports){
"use strict";

/**
 * Display a list with group headings
 */

lifeLine.makeDom.register("list", {
	make: function (_ref) {
		var items = _ref.items;

		// add all the groups
		return Object.getOwnPropertyNames(items).map(function (groupName) {
			return makeGroup(groupName, items[groupName]);
		});
	}
});

// make a single group
var makeGroup = function (name, items, parent) {
	// add the list header
	items.unshift({
		classes: "list-header",
		text: name
	});

	// render the item
	return {
		parent: parent,
		classes: "list-section",
		children: items.map(function (item, index) {
			// don't modify the header
			if (index === 0) return item;

			var itemDom;

			// create an item
			if (typeof item != "string") {
				itemDom = {
					classes: "list-item",
					children: (item.items || item).map(function (item) {
						return {
							// get the name of the item
							text: typeof item == "string" ? item : item.text,
							// set whether the item should grow
							classes: item.grow ? "list-item-grow" : "list-item-part"
						};
					})
				};
			} else {
				itemDom = {
					classes: "list-item",
					text: item
				};
			}

			// make the item a link
			if (item.href) {
				itemDom.on = {
					click: function () {
						return lifeLine.nav.navigate(item.href);
					}
				};
			}

			return itemDom;
		})
	};
};

},{}],22:[function(require,module,exports){
"use strict";

/**
 * The widget for the sidebar
 */

lifeLine.makeDom.register("sidebar", {
	make: function () {
		return [{
			classes: "sidebar",
			name: "sidebar",
			children: [{
				classes: ["sidebar-actions", "hidden"],
				name: "actions",
				children: [{
					classes: "sidebar-heading",
					text: "Page actions"
				}]
			}, {
				classes: "sidebar-heading",
				text: "More actions"
			}]
		}, {
			classes: "shade",
			on: {
				// close the sidebar
				click: function () {
					return document.body.classList.remove("sidebar-open");
				}
			}
		}];
	},
	bind: function (opts, _ref) {
		var actions = _ref.actions,
		    sidebar = _ref.sidebar;

		// add a command to the sidebar
		lifeLine.addCommand = function (name, fn) {
			// make the sidebar item
			var _lifeLine$makeDom = lifeLine.makeDom({
				parent: sidebar,
				tag: "div",
				name: "item",
				classes: "sidebar-item",
				text: name,
				on: {
					click: function () {
						// close the sidebar
						document.body.classList.remove("sidebar-open");

						// call the listener
						fn();
					}
				}
			}),
			    item = _lifeLine$makeDom.item;

			return {
				unsubscribe: function () {
					return item.remove();
				}
			};
		};

		// add a navigational command
		lifeLine.addNavCommand = function (name, to) {
			lifeLine.addCommand(name, function () {
				return lifeLine.nav.navigate(to);
			});
		};

		// add a sidebar action
		lifeLine.on("action-create", function (name) {
			// show the actions
			actions.classList.remove("hidden");

			// create the button
			lifeLine.makeDom({
				parent: actions,
				tag: "div",
				name: "item",
				classes: "sidebar-item",
				text: name,
				attrs: {
					"data-name": name
				},
				on: {
					click: function () {
						// close the sidebar
						document.body.classList.remove("sidebar-open");

						// trigger the action
						lifeLine.emit("action-exec-" + name);
					}
				}
			});

			// remove a sidebar action
			lifeLine.on("action-remove", function (name) {
				// remove the button
				var btn = actions.querySelector("[data-name=\"" + name + "\"]");

				if (btn) btn.remove();

				// hide the page actions if there are none
				if (actions.children.length == 1) {
					actions.classList.add("hidden");
				}
			});

			// remove all the sidebar actions
			lifeLine.on("action-remove-all", function () {
				// remove all the actions
				var _actions = Array.from(actions.querySelectorAll(".sidebar-item"));

				_actions.forEach(function (action) {
					return action.remove();
				});

				// side the page actions
				actions.classList.add("hidden");
			});
		});
	}
});

},{}],23:[function(require,module,exports){
"use strict";

/**
 * A row of radio style buttons
 */

lifeLine.makeDom.register("toggle-btns", {
	make: function (_ref) {
		var btns = _ref.btns,
		    value = _ref.value;

		// auto select the first button
		if (!value) {
			value = typeof btns[0] == "string" ? btns[0] : btns[0].value;
		}

		return {
			name: "toggleBar",
			classes: "toggle-bar",
			children: btns.map(function (btn) {
				// convert the plain string to an object
				if (typeof btn == "string") {
					btn = { text: btn, value: btn };
				}

				var classes = ["toggle-btn"];

				// add the selected class
				if (value == btn.value) {
					classes.push("toggle-btn-selected");

					// don't select two buttons
					value = undefined;
				}

				return {
					tag: "button",
					classes: classes,
					text: btn.text,
					attrs: {
						"data-value": btn.value
					}
				};
			})
		};
	},
	bind: function (_ref2, _ref3) {
		var change = _ref2.change;
		var toggleBar = _ref3.toggleBar;

		var _loop = function (btn) {
			btn.addEventListener("click", function () {
				var selected = toggleBar.querySelector(".toggle-btn-selected");

				// the button has already been selected
				if (selected == btn) {
					return;
				}

				// untoggle the other button
				if (selected) {
					selected.classList.remove("toggle-btn-selected");
				}

				// select this button
				btn.classList.add("toggle-btn-selected");

				// trigger a selection change
				change(btn.dataset.value);
			});
		};

		// attach listeners
		var _iteratorNormalCompletion = true;
		var _didIteratorError = false;
		var _iteratorError = undefined;

		try {
			for (var _iterator = toggleBar.querySelectorAll(".toggle-btn")[Symbol.iterator](), _step; !(_iteratorNormalCompletion = (_step = _iterator.next()).done); _iteratorNormalCompletion = true) {
				var btn = _step.value;

				_loop(btn);
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
});

},{}],24:[function(require,module,exports){
"use strict";

/**
 * Name generator for backups
 */

exports.genBackupName = function () {
  var date = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : new Date();

  return "backup-" + date.getFullYear() + "-" + (date.getMonth() + 1) + "-" + date.getDate() + ("-" + date.getHours() + "-" + date.getMinutes() + ".zip");
};

},{}],25:[function(require,module,exports){
"use strict";

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

/**
 * An adaptor for http based stores
 */

var HttpAdaptor = function () {
	function HttpAdaptor(opts) {
		_classCallCheck(this, HttpAdaptor);

		// if we are just given a string use it as the source
		if (typeof opts == "string") {
			opts = {
				src: opts
			};
		}

		// save the options
		this._opts = opts;
	}

	// create the options for a fetch request


	_createClass(HttpAdaptor, [{
		key: "_createOpts",
		value: function _createOpts() {
			var opts = {};

			// use the session cookie we were given
			if (this._opts.session) {
				opts.headers = {
					cookie: "session=" + this._opts.session
				};
			}
			// use the creadentials from the browser
			else {
					opts.creadentials = "include";
				}

			return opts;
		}

		/**
   * Get all the values in a store
   */

	}, {
		key: "getAll",
		value: function getAll() {
			return fetch(this._opts.src, this._createOpts())

			// parse the json response
			.then(function (res) {
				return res.json();
			});
		}

		/**
   * Get a single value
   */

	}, {
		key: "get",
		value: function get(key) {
			return fetch(this._opts.src + "value/" + key, this._createOpts()).then(function (res) {
				// not logged in
				if (res.status == 403) {
					var error = new Error("Not logged in");

					// add an error code
					error.code = "not-logged-in";

					throw error;
				}

				// no such item
				if (res.status == 404) {
					return undefined;
				}

				// parse the item
				return res.json();
			});
		}

		/**
   * Store an value on the server
   */

	}, {
		key: "set",
		value: function set(value) {
			var fetchOpts = this._createOpts();

			// add the headers to the default headers
			fetchOpts.method = "PUT";
			fetchOpts.body = JSON.stringify(value);

			// send the item
			return fetch(this._opts.src + "value/" + value.id, fetchOpts).then(function (res) {
				// not logged in
				if (res.status == 403) {
					var error = new Error("Not logged in");

					// add an error code
					error.code = "not-logged-in";

					throw error;
				}
			});
		}

		/**
   * Remove the value from the store
   */

	}, {
		key: "remove",
		value: function remove(key) {
			var fetchOpts = this._createOpts();

			// add the headers to the default headers
			fetchOpts.method = "DELETE";

			// send the item
			return fetch(this._opts.src + "value/" + key, fetchOpts).then(function (res) {
				// not logged in
				if (res.status == 403) {
					var error = new Error("Not logged in");

					// add an error code
					error.code = "not-logged-in";

					throw error;
				}
			});
		}

		// check our access level

	}, {
		key: "accessLevel",
		value: function accessLevel() {
			return fetch(this._opts.src + "access", this._createOpts())
			// the response is just a string
			.then(function (res) {
				return res.text();
			});
		}
	}]);

	return HttpAdaptor;
}();

module.exports = HttpAdaptor;

},{}],26:[function(require,module,exports){
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

},{}],27:[function(require,module,exports){
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

},{}],28:[function(require,module,exports){
"use strict";

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _possibleConstructorReturn(self, call) { if (!self) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return call && (typeof call === "object" || typeof call === "function") ? call : self; }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }

/**
 * A data store which contains a pool of objects which are queryable by any property
 */

var PoolStore = function (_lifeLine$EventEmitte) {
	_inherits(PoolStore, _lifeLine$EventEmitte);

	function PoolStore(adaptor, initFn) {
		_classCallCheck(this, PoolStore);

		var _this = _possibleConstructorReturn(this, (PoolStore.__proto__ || Object.getPrototypeOf(PoolStore)).call(this));

		_this._adaptor = adaptor;
		_this._initFn = initFn;
		return _this;
	}

	/**
  * Get all items matcing the provided properties
  */


	_createClass(PoolStore, [{
		key: "query",
		value: function query(props, fn) {
			var _this2 = this;

			// check if a value matches the query
			var filter = function (value) {
				// check that all the properties match
				return Object.getOwnPropertyNames(props).every(function (propName) {
					// a function to check if a value matches
					if (typeof props[propName] == "function") {
						return props[propName](value[propName]);
					}
					// plain equality
					else {
							return props[propName] == value[propName];
						}
				});
			};

			// get all current items that match the filter
			var current = this._adaptor.getAll().then(function (values) {
				// filter out the values
				values = values.filter(filter);

				// do any initialization
				if (_this2._initFn) {
					values = values.map(function (value) {
						return _this2._initFn(value) || value;
					});
				}

				return values;
			});

			// optionaly run changes through the query as well
			if (typeof fn == "function") {
				var _ret = function () {
					var subscription = void 0,
					    stopped = void 0;

					// wrap the values in change objects and send the to the consumer
					current.then(function (values) {
						// don't listen if unsubscribe was already called
						if (stopped) return;

						// send the values we currently have
						fn(values.slice(0));

						// watch for changes after the initial values are send
						subscription = _this2.on("change", function (change) {
							// find the previous value
							var index = values.findIndex(function (value) {
								return value.id == change.id;
							});

							if (change.type == "change") {
								// check if the value matches the query
								var matches = filter(change.value);

								if (matches) {
									// freshly created
									if (index === -1) {
										var value = change.value;

										// do any initialization

										if (_this2._initFn) {
											value = _this2._initFn(value) || value;
										}

										values.push(value);
									}
									// update an existing value
									else {
											values[index] = change.value;
										}

									fn(values.slice(0));
								}
								// tell the consumer this value no longer matches
								else if (index !== -1) {
										// remove the item
										if (index !== -1) {
											values.splice(index, 1);
										}

										fn(values.slice(0));
									}
							} else if (change.type == "remove" && index !== -1) {
								// remove the item
								if (index !== -1) {
									values.splice(index, 1);
								}

								fn(values.slice(0));
							}
						});
					});

					return {
						v: {
							unsubscribe: function () {
								// if we are listening stop
								if (subscription) {
									subscription.unsubscribe();
								}

								// don't listen
								stopped = true;
							}
						}
					};
				}();

				if (typeof _ret === "object") return _ret.v;
			} else {
				return current;
			}
		}

		/**
   * Store a value in the pool
   */

	}, {
		key: "set",
		value: function set(value) {
			// set the modified date
			value.modified = Date.now();

			// store the value in the adaptor
			this._adaptor.set(value);

			// propogate the change
			this.emit("change", {
				type: "change",
				id: value.id,
				value: value
			});
		}

		/**
   * Remove a value from the pool
   */

	}, {
		key: "remove",
		value: function remove(id) {
			// remove the value from the adaptor
			this._adaptor.remove(id, Date.now());

			// propogate the change
			this.emit("change", {
				type: "remove",
				id: id
			});
		}
	}]);

	return PoolStore;
}(lifeLine.EventEmitter);

module.exports = PoolStore;

},{}],29:[function(require,module,exports){
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

},{"./data-stores/key-value-store":26,"./data-stores/mem-adaptor":27,"./util/disposable":30,"./util/event-emitter":31,"_process":2}],30:[function(require,module,exports){
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

},{}],31:[function(require,module,exports){
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

},{}]},{},[6])
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCJub2RlX21vZHVsZXMvaWRiL2xpYi9pZGIuanMiLCJub2RlX21vZHVsZXMvcHJvY2Vzcy9icm93c2VyLmpzIiwic3JjXFxjbGllbnRcXGRhdGEtc3RvcmUuanMiLCJzcmNcXGNsaWVudFxcZGF0YS1zdG9yZXNcXGluZGV4LmpzIiwic3JjXFxjbGllbnRcXGdsb2JhbC5qcyIsInNyY1xcY2xpZW50XFxpbmRleC5qcyIsInNyY1xcY2xpZW50XFxzdy1oZWxwZXIuanMiLCJzcmNcXGNsaWVudFxcc3luY2VyLmpzIiwic3JjXFxjbGllbnRcXHV0aWxcXGRhdGUuanMiLCJzcmNcXGNsaWVudFxcdXRpbFxcZG9tLW1ha2VyLmpzIiwic3JjXFxjbGllbnRcXHZpZXdzXFxhY2NvdW50LmpzIiwic3JjXFxjbGllbnRcXHZpZXdzXFxlZGl0LmpzIiwic3JjXFxjbGllbnRcXHZpZXdzXFxpdGVtLmpzIiwic3JjXFxjbGllbnRcXHZpZXdzXFxsaXN0cy5qcyIsInNyY1xcY2xpZW50XFx2aWV3c1xcbG9naW4uanMiLCJzcmNcXGNsaWVudFxcdmlld3NcXHRvZG8uanMiLCJzcmNcXGNsaWVudFxcdmlld3NcXHVzZXJzLmpzIiwic3JjXFxjbGllbnRcXHdpZGdldHNcXGNvbnRlbnQuanMiLCJzcmNcXGNsaWVudFxcd2lkZ2V0c1xcaW5wdXQuanMiLCJzcmNcXGNsaWVudFxcd2lkZ2V0c1xcbGluay5qcyIsInNyY1xcY2xpZW50XFx3aWRnZXRzXFxsaXN0LmpzIiwic3JjXFxjbGllbnRcXHdpZGdldHNcXHNpZGViYXIuanMiLCJzcmNcXGNsaWVudFxcd2lkZ2V0c1xcdG9nZ2xlLWJ0bnMuanMiLCJzcmNcXGNvbW1vblxcYmFja3VwLmpzIiwic3JjXFxjb21tb25cXGRhdGEtc3RvcmVzXFxodHRwLWFkYXB0b3IuanMiLCJzcmNcXGNvbW1vblxcZGF0YS1zdG9yZXNcXGtleS12YWx1ZS1zdG9yZS5qcyIsInNyY1xcY29tbW9uXFxkYXRhLXN0b3Jlc1xcbWVtLWFkYXB0b3IuanMiLCJzcmNcXGNvbW1vblxcZGF0YS1zdG9yZXNcXHBvb2wtc3RvcmUuanMiLCJzcmNcXGNvbW1vblxcc3JjXFxjb21tb25cXGdsb2JhbC5qcyIsInNyY1xcY29tbW9uXFx1dGlsXFxkaXNwb3NhYmxlLmpzIiwic3JjXFxjb21tb25cXHV0aWxcXGV2ZW50LWVtaXR0ZXIuanMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7QUNBQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3RUQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7Ozs7Ozs7Ozs7O0FDcExB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O0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFLekI7QUFDRDs7QUFFRDs7Ozs7OzhCQUdZLEksRUFBMkI7QUFBQSxPQUFyQixLQUFxQix1RUFBYixFQUFhOztBQUN0QztBQUNBLE9BQUcsQ0FBQyxNQUFNLE9BQU4sQ0FBYyxLQUFkLENBQUosRUFBMEI7QUFDekIsWUFBUSxDQUFDLEtBQUQsQ0FBUjtBQUNBOztBQUVEO0FBQ0EsT0FBRyxLQUFLLFVBQUwsQ0FBZ0IsSUFBaEIsQ0FBSCxFQUEwQjtBQUFBLHVDQVBNLElBT047QUFQTSxTQU9OO0FBQUE7O0FBQUEsMEJBQ2pCLFFBRGlCO0FBRXhCO0FBQ0EsU0FBRyxNQUFNLElBQU4sQ0FBVztBQUFBLGFBQVEsS0FBSyxTQUFMLElBQWtCLFFBQTFCO0FBQUEsTUFBWCxDQUFILEVBQW1EO0FBQ2xEO0FBQ0E7O0FBRUQ7QUFDQSwrQkFBWSxJQUFaO0FBUndCOztBQUFBO0FBQUE7QUFBQTs7QUFBQTtBQUN6QiwyQkFBb0IsS0FBSyxVQUFMLENBQWdCLElBQWhCLENBQXBCLG1JQUEyQztBQUFBLFVBQW5DLFFBQW1DOztBQUFBLHVCQUFuQyxRQUFtQzs7QUFBQSwrQkFHekM7QUFLRDtBQVR3QjtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBVXpCO0FBQ0Q7Ozs7OztBQUdGLE9BQU8sT0FBUCxHQUFpQixZQUFqQiIsImZpbGUiOiJnZW5lcmF0ZWQuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlc0NvbnRlbnQiOlsiKGZ1bmN0aW9uIGUodCxuLHIpe2Z1bmN0aW9uIHMobyx1KXtpZighbltvXSl7aWYoIXRbb10pe3ZhciBhPXR5cGVvZiByZXF1aXJlPT1cImZ1bmN0aW9uXCImJnJlcXVpcmU7aWYoIXUmJmEpcmV0dXJuIGEobywhMCk7aWYoaSlyZXR1cm4gaShvLCEwKTt2YXIgZj1uZXcgRXJyb3IoXCJDYW5ub3QgZmluZCBtb2R1bGUgJ1wiK28rXCInXCIpO3Rocm93IGYuY29kZT1cIk1PRFVMRV9OT1RfRk9VTkRcIixmfXZhciBsPW5bb109e2V4cG9ydHM6e319O3Rbb11bMF0uY2FsbChsLmV4cG9ydHMsZnVuY3Rpb24oZSl7dmFyIG49dFtvXVsxXVtlXTtyZXR1cm4gcyhuP246ZSl9LGwsbC5leHBvcnRzLGUsdCxuLHIpfXJldHVybiBuW29dLmV4cG9ydHN9dmFyIGk9dHlwZW9mIHJlcXVpcmU9PVwiZnVuY3Rpb25cIiYmcmVxdWlyZTtmb3IodmFyIG89MDtvPHIubGVuZ3RoO28rKylzKHJbb10pO3JldHVybiBzfSkiLCIndXNlIHN0cmljdCc7XG5cbihmdW5jdGlvbigpIHtcbiAgZnVuY3Rpb24gdG9BcnJheShhcnIpIHtcbiAgICByZXR1cm4gQXJyYXkucHJvdG90eXBlLnNsaWNlLmNhbGwoYXJyKTtcbiAgfVxuXG4gIGZ1bmN0aW9uIHByb21pc2lmeVJlcXVlc3QocmVxdWVzdCkge1xuICAgIHJldHVybiBuZXcgUHJvbWlzZShmdW5jdGlvbihyZXNvbHZlLCByZWplY3QpIHtcbiAgICAgIHJlcXVlc3Qub25zdWNjZXNzID0gZnVuY3Rpb24oKSB7XG4gICAgICAgIHJlc29sdmUocmVxdWVzdC5yZXN1bHQpO1xuICAgICAgfTtcblxuICAgICAgcmVxdWVzdC5vbmVycm9yID0gZnVuY3Rpb24oKSB7XG4gICAgICAgIHJlamVjdChyZXF1ZXN0LmVycm9yKTtcbiAgICAgIH07XG4gICAgfSk7XG4gIH1cblxuICBmdW5jdGlvbiBwcm9taXNpZnlSZXF1ZXN0Q2FsbChvYmosIG1ldGhvZCwgYXJncykge1xuICAgIHZhciByZXF1ZXN0O1xuICAgIHZhciBwID0gbmV3IFByb21pc2UoZnVuY3Rpb24ocmVzb2x2ZSwgcmVqZWN0KSB7XG4gICAgICByZXF1ZXN0ID0gb2JqW21ldGhvZF0uYXBwbHkob2JqLCBhcmdzKTtcbiAgICAgIHByb21pc2lmeVJlcXVlc3QocmVxdWVzdCkudGhlbihyZXNvbHZlLCByZWplY3QpO1xuICAgIH0pO1xuXG4gICAgcC5yZXF1ZXN0ID0gcmVxdWVzdDtcbiAgICByZXR1cm4gcDtcbiAgfVxuXG4gIGZ1bmN0aW9uIHByb21pc2lmeUN1cnNvclJlcXVlc3RDYWxsKG9iaiwgbWV0aG9kLCBhcmdzKSB7XG4gICAgdmFyIHAgPSBwcm9taXNpZnlSZXF1ZXN0Q2FsbChvYmosIG1ldGhvZCwgYXJncyk7XG4gICAgcmV0dXJuIHAudGhlbihmdW5jdGlvbih2YWx1ZSkge1xuICAgICAgaWYgKCF2YWx1ZSkgcmV0dXJuO1xuICAgICAgcmV0dXJuIG5ldyBDdXJzb3IodmFsdWUsIHAucmVxdWVzdCk7XG4gICAgfSk7XG4gIH1cblxuICBmdW5jdGlvbiBwcm94eVByb3BlcnRpZXMoUHJveHlDbGFzcywgdGFyZ2V0UHJvcCwgcHJvcGVydGllcykge1xuICAgIHByb3BlcnRpZXMuZm9yRWFjaChmdW5jdGlvbihwcm9wKSB7XG4gICAgICBPYmplY3QuZGVmaW5lUHJvcGVydHkoUHJveHlDbGFzcy5wcm90b3R5cGUsIHByb3AsIHtcbiAgICAgICAgZ2V0OiBmdW5jdGlvbigpIHtcbiAgICAgICAgICByZXR1cm4gdGhpc1t0YXJnZXRQcm9wXVtwcm9wXTtcbiAgICAgICAgfSxcbiAgICAgICAgc2V0OiBmdW5jdGlvbih2YWwpIHtcbiAgICAgICAgICB0aGlzW3RhcmdldFByb3BdW3Byb3BdID0gdmFsO1xuICAgICAgICB9XG4gICAgICB9KTtcbiAgICB9KTtcbiAgfVxuXG4gIGZ1bmN0aW9uIHByb3h5UmVxdWVzdE1ldGhvZHMoUHJveHlDbGFzcywgdGFyZ2V0UHJvcCwgQ29uc3RydWN0b3IsIHByb3BlcnRpZXMpIHtcbiAgICBwcm9wZXJ0aWVzLmZvckVhY2goZnVuY3Rpb24ocHJvcCkge1xuICAgICAgaWYgKCEocHJvcCBpbiBDb25zdHJ1Y3Rvci5wcm90b3R5cGUpKSByZXR1cm47XG4gICAgICBQcm94eUNsYXNzLnByb3RvdHlwZVtwcm9wXSA9IGZ1bmN0aW9uKCkge1xuICAgICAgICByZXR1cm4gcHJvbWlzaWZ5UmVxdWVzdENhbGwodGhpc1t0YXJnZXRQcm9wXSwgcHJvcCwgYXJndW1lbnRzKTtcbiAgICAgIH07XG4gICAgfSk7XG4gIH1cblxuICBmdW5jdGlvbiBwcm94eU1ldGhvZHMoUHJveHlDbGFzcywgdGFyZ2V0UHJvcCwgQ29uc3RydWN0b3IsIHByb3BlcnRpZXMpIHtcbiAgICBwcm9wZXJ0aWVzLmZvckVhY2goZnVuY3Rpb24ocHJvcCkge1xuICAgICAgaWYgKCEocHJvcCBpbiBDb25zdHJ1Y3Rvci5wcm90b3R5cGUpKSByZXR1cm47XG4gICAgICBQcm94eUNsYXNzLnByb3RvdHlwZVtwcm9wXSA9IGZ1bmN0aW9uKCkge1xuICAgICAgICByZXR1cm4gdGhpc1t0YXJnZXRQcm9wXVtwcm9wXS5hcHBseSh0aGlzW3RhcmdldFByb3BdLCBhcmd1bWVudHMpO1xuICAgICAgfTtcbiAgICB9KTtcbiAgfVxuXG4gIGZ1bmN0aW9uIHByb3h5Q3Vyc29yUmVxdWVzdE1ldGhvZHMoUHJveHlDbGFzcywgdGFyZ2V0UHJvcCwgQ29uc3RydWN0b3IsIHByb3BlcnRpZXMpIHtcbiAgICBwcm9wZXJ0aWVzLmZvckVhY2goZnVuY3Rpb24ocHJvcCkge1xuICAgICAgaWYgKCEocHJvcCBpbiBDb25zdHJ1Y3Rvci5wcm90b3R5cGUpKSByZXR1cm47XG4gICAgICBQcm94eUNsYXNzLnByb3RvdHlwZVtwcm9wXSA9IGZ1bmN0aW9uKCkge1xuICAgICAgICByZXR1cm4gcHJvbWlzaWZ5Q3Vyc29yUmVxdWVzdENhbGwodGhpc1t0YXJnZXRQcm9wXSwgcHJvcCwgYXJndW1lbnRzKTtcbiAgICAgIH07XG4gICAgfSk7XG4gIH1cblxuICBmdW5jdGlvbiBJbmRleChpbmRleCkge1xuICAgIHRoaXMuX2luZGV4ID0gaW5kZXg7XG4gIH1cblxuICBwcm94eVByb3BlcnRpZXMoSW5kZXgsICdfaW5kZXgnLCBbXG4gICAgJ25hbWUnLFxuICAgICdrZXlQYXRoJyxcbiAgICAnbXVsdGlFbnRyeScsXG4gICAgJ3VuaXF1ZSdcbiAgXSk7XG5cbiAgcHJveHlSZXF1ZXN0TWV0aG9kcyhJbmRleCwgJ19pbmRleCcsIElEQkluZGV4LCBbXG4gICAgJ2dldCcsXG4gICAgJ2dldEtleScsXG4gICAgJ2dldEFsbCcsXG4gICAgJ2dldEFsbEtleXMnLFxuICAgICdjb3VudCdcbiAgXSk7XG5cbiAgcHJveHlDdXJzb3JSZXF1ZXN0TWV0aG9kcyhJbmRleCwgJ19pbmRleCcsIElEQkluZGV4LCBbXG4gICAgJ29wZW5DdXJzb3InLFxuICAgICdvcGVuS2V5Q3Vyc29yJ1xuICBdKTtcblxuICBmdW5jdGlvbiBDdXJzb3IoY3Vyc29yLCByZXF1ZXN0KSB7XG4gICAgdGhpcy5fY3Vyc29yID0gY3Vyc29yO1xuICAgIHRoaXMuX3JlcXVlc3QgPSByZXF1ZXN0O1xuICB9XG5cbiAgcHJveHlQcm9wZXJ0aWVzKEN1cnNvciwgJ19jdXJzb3InLCBbXG4gICAgJ2RpcmVjdGlvbicsXG4gICAgJ2tleScsXG4gICAgJ3ByaW1hcnlLZXknLFxuICAgICd2YWx1ZSdcbiAgXSk7XG5cbiAgcHJveHlSZXF1ZXN0TWV0aG9kcyhDdXJzb3IsICdfY3Vyc29yJywgSURCQ3Vyc29yLCBbXG4gICAgJ3VwZGF0ZScsXG4gICAgJ2RlbGV0ZSdcbiAgXSk7XG5cbiAgLy8gcHJveHkgJ25leHQnIG1ldGhvZHNcbiAgWydhZHZhbmNlJywgJ2NvbnRpbnVlJywgJ2NvbnRpbnVlUHJpbWFyeUtleSddLmZvckVhY2goZnVuY3Rpb24obWV0aG9kTmFtZSkge1xuICAgIGlmICghKG1ldGhvZE5hbWUgaW4gSURCQ3Vyc29yLnByb3RvdHlwZSkpIHJldHVybjtcbiAgICBDdXJzb3IucHJvdG90eXBlW21ldGhvZE5hbWVdID0gZnVuY3Rpb24oKSB7XG4gICAgICB2YXIgY3Vyc29yID0gdGhpcztcbiAgICAgIHZhciBhcmdzID0gYXJndW1lbnRzO1xuICAgICAgcmV0dXJuIFByb21pc2UucmVzb2x2ZSgpLnRoZW4oZnVuY3Rpb24oKSB7XG4gICAgICAgIGN1cnNvci5fY3Vyc29yW21ldGhvZE5hbWVdLmFwcGx5KGN1cnNvci5fY3Vyc29yLCBhcmdzKTtcbiAgICAgICAgcmV0dXJuIHByb21pc2lmeVJlcXVlc3QoY3Vyc29yLl9yZXF1ZXN0KS50aGVuKGZ1bmN0aW9uKHZhbHVlKSB7XG4gICAgICAgICAgaWYgKCF2YWx1ZSkgcmV0dXJuO1xuICAgICAgICAgIHJldHVybiBuZXcgQ3Vyc29yKHZhbHVlLCBjdXJzb3IuX3JlcXVlc3QpO1xuICAgICAgICB9KTtcbiAgICAgIH0pO1xuICAgIH07XG4gIH0pO1xuXG4gIGZ1bmN0aW9uIE9iamVjdFN0b3JlKHN0b3JlKSB7XG4gICAgdGhpcy5fc3RvcmUgPSBzdG9yZTtcbiAgfVxuXG4gIE9iamVjdFN0b3JlLnByb3RvdHlwZS5jcmVhdGVJbmRleCA9IGZ1bmN0aW9uKCkge1xuICAgIHJldHVybiBuZXcgSW5kZXgodGhpcy5fc3RvcmUuY3JlYXRlSW5kZXguYXBwbHkodGhpcy5fc3RvcmUsIGFyZ3VtZW50cykpO1xuICB9O1xuXG4gIE9iamVjdFN0b3JlLnByb3RvdHlwZS5pbmRleCA9IGZ1bmN0aW9uKCkge1xuICAgIHJldHVybiBuZXcgSW5kZXgodGhpcy5fc3RvcmUuaW5kZXguYXBwbHkodGhpcy5fc3RvcmUsIGFyZ3VtZW50cykpO1xuICB9O1xuXG4gIHByb3h5UHJvcGVydGllcyhPYmplY3RTdG9yZSwgJ19zdG9yZScsIFtcbiAgICAnbmFtZScsXG4gICAgJ2tleVBhdGgnLFxuICAgICdpbmRleE5hbWVzJyxcbiAgICAnYXV0b0luY3JlbWVudCdcbiAgXSk7XG5cbiAgcHJveHlSZXF1ZXN0TWV0aG9kcyhPYmplY3RTdG9yZSwgJ19zdG9yZScsIElEQk9iamVjdFN0b3JlLCBbXG4gICAgJ3B1dCcsXG4gICAgJ2FkZCcsXG4gICAgJ2RlbGV0ZScsXG4gICAgJ2NsZWFyJyxcbiAgICAnZ2V0JyxcbiAgICAnZ2V0QWxsJyxcbiAgICAnZ2V0S2V5JyxcbiAgICAnZ2V0QWxsS2V5cycsXG4gICAgJ2NvdW50J1xuICBdKTtcblxuICBwcm94eUN1cnNvclJlcXVlc3RNZXRob2RzKE9iamVjdFN0b3JlLCAnX3N0b3JlJywgSURCT2JqZWN0U3RvcmUsIFtcbiAgICAnb3BlbkN1cnNvcicsXG4gICAgJ29wZW5LZXlDdXJzb3InXG4gIF0pO1xuXG4gIHByb3h5TWV0aG9kcyhPYmplY3RTdG9yZSwgJ19zdG9yZScsIElEQk9iamVjdFN0b3JlLCBbXG4gICAgJ2RlbGV0ZUluZGV4J1xuICBdKTtcblxuICBmdW5jdGlvbiBUcmFuc2FjdGlvbihpZGJUcmFuc2FjdGlvbikge1xuICAgIHRoaXMuX3R4ID0gaWRiVHJhbnNhY3Rpb247XG4gICAgdGhpcy5jb21wbGV0ZSA9IG5ldyBQcm9taXNlKGZ1bmN0aW9uKHJlc29sdmUsIHJlamVjdCkge1xuICAgICAgaWRiVHJhbnNhY3Rpb24ub25jb21wbGV0ZSA9IGZ1bmN0aW9uKCkge1xuICAgICAgICByZXNvbHZlKCk7XG4gICAgICB9O1xuICAgICAgaWRiVHJhbnNhY3Rpb24ub25lcnJvciA9IGZ1bmN0aW9uKCkge1xuICAgICAgICByZWplY3QoaWRiVHJhbnNhY3Rpb24uZXJyb3IpO1xuICAgICAgfTtcbiAgICAgIGlkYlRyYW5zYWN0aW9uLm9uYWJvcnQgPSBmdW5jdGlvbigpIHtcbiAgICAgICAgcmVqZWN0KGlkYlRyYW5zYWN0aW9uLmVycm9yKTtcbiAgICAgIH07XG4gICAgfSk7XG4gIH1cblxuICBUcmFuc2FjdGlvbi5wcm90b3R5cGUub2JqZWN0U3RvcmUgPSBmdW5jdGlvbigpIHtcbiAgICByZXR1cm4gbmV3IE9iamVjdFN0b3JlKHRoaXMuX3R4Lm9iamVjdFN0b3JlLmFwcGx5KHRoaXMuX3R4LCBhcmd1bWVudHMpKTtcbiAgfTtcblxuICBwcm94eVByb3BlcnRpZXMoVHJhbnNhY3Rpb24sICdfdHgnLCBbXG4gICAgJ29iamVjdFN0b3JlTmFtZXMnLFxuICAgICdtb2RlJ1xuICBdKTtcblxuICBwcm94eU1ldGhvZHMoVHJhbnNhY3Rpb24sICdfdHgnLCBJREJUcmFuc2FjdGlvbiwgW1xuICAgICdhYm9ydCdcbiAgXSk7XG5cbiAgZnVuY3Rpb24gVXBncmFkZURCKGRiLCBvbGRWZXJzaW9uLCB0cmFuc2FjdGlvbikge1xuICAgIHRoaXMuX2RiID0gZGI7XG4gICAgdGhpcy5vbGRWZXJzaW9uID0gb2xkVmVyc2lvbjtcbiAgICB0aGlzLnRyYW5zYWN0aW9uID0gbmV3IFRyYW5zYWN0aW9uKHRyYW5zYWN0aW9uKTtcbiAgfVxuXG4gIFVwZ3JhZGVEQi5wcm90b3R5cGUuY3JlYXRlT2JqZWN0U3RvcmUgPSBmdW5jdGlvbigpIHtcbiAgICByZXR1cm4gbmV3IE9iamVjdFN0b3JlKHRoaXMuX2RiLmNyZWF0ZU9iamVjdFN0b3JlLmFwcGx5KHRoaXMuX2RiLCBhcmd1bWVudHMpKTtcbiAgfTtcblxuICBwcm94eVByb3BlcnRpZXMoVXBncmFkZURCLCAnX2RiJywgW1xuICAgICduYW1lJyxcbiAgICAndmVyc2lvbicsXG4gICAgJ29iamVjdFN0b3JlTmFtZXMnXG4gIF0pO1xuXG4gIHByb3h5TWV0aG9kcyhVcGdyYWRlREIsICdfZGInLCBJREJEYXRhYmFzZSwgW1xuICAgICdkZWxldGVPYmplY3RTdG9yZScsXG4gICAgJ2Nsb3NlJ1xuICBdKTtcblxuICBmdW5jdGlvbiBEQihkYikge1xuICAgIHRoaXMuX2RiID0gZGI7XG4gIH1cblxuICBEQi5wcm90b3R5cGUudHJhbnNhY3Rpb24gPSBmdW5jdGlvbigpIHtcbiAgICByZXR1cm4gbmV3IFRyYW5zYWN0aW9uKHRoaXMuX2RiLnRyYW5zYWN0aW9uLmFwcGx5KHRoaXMuX2RiLCBhcmd1bWVudHMpKTtcbiAgfTtcblxuICBwcm94eVByb3BlcnRpZXMoREIsICdfZGInLCBbXG4gICAgJ25hbWUnLFxuICAgICd2ZXJzaW9uJyxcbiAgICAnb2JqZWN0U3RvcmVOYW1lcydcbiAgXSk7XG5cbiAgcHJveHlNZXRob2RzKERCLCAnX2RiJywgSURCRGF0YWJhc2UsIFtcbiAgICAnY2xvc2UnXG4gIF0pO1xuXG4gIC8vIEFkZCBjdXJzb3IgaXRlcmF0b3JzXG4gIC8vIFRPRE86IHJlbW92ZSB0aGlzIG9uY2UgYnJvd3NlcnMgZG8gdGhlIHJpZ2h0IHRoaW5nIHdpdGggcHJvbWlzZXNcbiAgWydvcGVuQ3Vyc29yJywgJ29wZW5LZXlDdXJzb3InXS5mb3JFYWNoKGZ1bmN0aW9uKGZ1bmNOYW1lKSB7XG4gICAgW09iamVjdFN0b3JlLCBJbmRleF0uZm9yRWFjaChmdW5jdGlvbihDb25zdHJ1Y3Rvcikge1xuICAgICAgQ29uc3RydWN0b3IucHJvdG90eXBlW2Z1bmNOYW1lLnJlcGxhY2UoJ29wZW4nLCAnaXRlcmF0ZScpXSA9IGZ1bmN0aW9uKCkge1xuICAgICAgICB2YXIgYXJncyA9IHRvQXJyYXkoYXJndW1lbnRzKTtcbiAgICAgICAgdmFyIGNhbGxiYWNrID0gYXJnc1thcmdzLmxlbmd0aCAtIDFdO1xuICAgICAgICB2YXIgbmF0aXZlT2JqZWN0ID0gdGhpcy5fc3RvcmUgfHwgdGhpcy5faW5kZXg7XG4gICAgICAgIHZhciByZXF1ZXN0ID0gbmF0aXZlT2JqZWN0W2Z1bmNOYW1lXS5hcHBseShuYXRpdmVPYmplY3QsIGFyZ3Muc2xpY2UoMCwgLTEpKTtcbiAgICAgICAgcmVxdWVzdC5vbnN1Y2Nlc3MgPSBmdW5jdGlvbigpIHtcbiAgICAgICAgICBjYWxsYmFjayhyZXF1ZXN0LnJlc3VsdCk7XG4gICAgICAgIH07XG4gICAgICB9O1xuICAgIH0pO1xuICB9KTtcblxuICAvLyBwb2x5ZmlsbCBnZXRBbGxcbiAgW0luZGV4LCBPYmplY3RTdG9yZV0uZm9yRWFjaChmdW5jdGlvbihDb25zdHJ1Y3Rvcikge1xuICAgIGlmIChDb25zdHJ1Y3Rvci5wcm90b3R5cGUuZ2V0QWxsKSByZXR1cm47XG4gICAgQ29uc3RydWN0b3IucHJvdG90eXBlLmdldEFsbCA9IGZ1bmN0aW9uKHF1ZXJ5LCBjb3VudCkge1xuICAgICAgdmFyIGluc3RhbmNlID0gdGhpcztcbiAgICAgIHZhciBpdGVtcyA9IFtdO1xuXG4gICAgICByZXR1cm4gbmV3IFByb21pc2UoZnVuY3Rpb24ocmVzb2x2ZSkge1xuICAgICAgICBpbnN0YW5jZS5pdGVyYXRlQ3Vyc29yKHF1ZXJ5LCBmdW5jdGlvbihjdXJzb3IpIHtcbiAgICAgICAgICBpZiAoIWN1cnNvcikge1xuICAgICAgICAgICAgcmVzb2x2ZShpdGVtcyk7XG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgICAgfVxuICAgICAgICAgIGl0ZW1zLnB1c2goY3Vyc29yLnZhbHVlKTtcblxuICAgICAgICAgIGlmIChjb3VudCAhPT0gdW5kZWZpbmVkICYmIGl0ZW1zLmxlbmd0aCA9PSBjb3VudCkge1xuICAgICAgICAgICAgcmVzb2x2ZShpdGVtcyk7XG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgICAgfVxuICAgICAgICAgIGN1cnNvci5jb250aW51ZSgpO1xuICAgICAgICB9KTtcbiAgICAgIH0pO1xuICAgIH07XG4gIH0pO1xuXG4gIHZhciBleHAgPSB7XG4gICAgb3BlbjogZnVuY3Rpb24obmFtZSwgdmVyc2lvbiwgdXBncmFkZUNhbGxiYWNrKSB7XG4gICAgICB2YXIgcCA9IHByb21pc2lmeVJlcXVlc3RDYWxsKGluZGV4ZWREQiwgJ29wZW4nLCBbbmFtZSwgdmVyc2lvbl0pO1xuICAgICAgdmFyIHJlcXVlc3QgPSBwLnJlcXVlc3Q7XG5cbiAgICAgIHJlcXVlc3Qub251cGdyYWRlbmVlZGVkID0gZnVuY3Rpb24oZXZlbnQpIHtcbiAgICAgICAgaWYgKHVwZ3JhZGVDYWxsYmFjaykge1xuICAgICAgICAgIHVwZ3JhZGVDYWxsYmFjayhuZXcgVXBncmFkZURCKHJlcXVlc3QucmVzdWx0LCBldmVudC5vbGRWZXJzaW9uLCByZXF1ZXN0LnRyYW5zYWN0aW9uKSk7XG4gICAgICAgIH1cbiAgICAgIH07XG5cbiAgICAgIHJldHVybiBwLnRoZW4oZnVuY3Rpb24oZGIpIHtcbiAgICAgICAgcmV0dXJuIG5ldyBEQihkYik7XG4gICAgICB9KTtcbiAgICB9LFxuICAgIGRlbGV0ZTogZnVuY3Rpb24obmFtZSkge1xuICAgICAgcmV0dXJuIHByb21pc2lmeVJlcXVlc3RDYWxsKGluZGV4ZWREQiwgJ2RlbGV0ZURhdGFiYXNlJywgW25hbWVdKTtcbiAgICB9XG4gIH07XG5cbiAgaWYgKHR5cGVvZiBtb2R1bGUgIT09ICd1bmRlZmluZWQnKSB7XG4gICAgbW9kdWxlLmV4cG9ydHMgPSBleHA7XG4gIH1cbiAgZWxzZSB7XG4gICAgc2VsZi5pZGIgPSBleHA7XG4gIH1cbn0oKSk7XG4iLCIvLyBzaGltIGZvciB1c2luZyBwcm9jZXNzIGluIGJyb3dzZXJcbnZhciBwcm9jZXNzID0gbW9kdWxlLmV4cG9ydHMgPSB7fTtcblxuLy8gY2FjaGVkIGZyb20gd2hhdGV2ZXIgZ2xvYmFsIGlzIHByZXNlbnQgc28gdGhhdCB0ZXN0IHJ1bm5lcnMgdGhhdCBzdHViIGl0XG4vLyBkb24ndCBicmVhayB0aGluZ3MuICBCdXQgd2UgbmVlZCB0byB3cmFwIGl0IGluIGEgdHJ5IGNhdGNoIGluIGNhc2UgaXQgaXNcbi8vIHdyYXBwZWQgaW4gc3RyaWN0IG1vZGUgY29kZSB3aGljaCBkb2Vzbid0IGRlZmluZSBhbnkgZ2xvYmFscy4gIEl0J3MgaW5zaWRlIGFcbi8vIGZ1bmN0aW9uIGJlY2F1c2UgdHJ5L2NhdGNoZXMgZGVvcHRpbWl6ZSBpbiBjZXJ0YWluIGVuZ2luZXMuXG5cbnZhciBjYWNoZWRTZXRUaW1lb3V0O1xudmFyIGNhY2hlZENsZWFyVGltZW91dDtcblxuZnVuY3Rpb24gZGVmYXVsdFNldFRpbW91dCgpIHtcbiAgICB0aHJvdyBuZXcgRXJyb3IoJ3NldFRpbWVvdXQgaGFzIG5vdCBiZWVuIGRlZmluZWQnKTtcbn1cbmZ1bmN0aW9uIGRlZmF1bHRDbGVhclRpbWVvdXQgKCkge1xuICAgIHRocm93IG5ldyBFcnJvcignY2xlYXJUaW1lb3V0IGhhcyBub3QgYmVlbiBkZWZpbmVkJyk7XG59XG4oZnVuY3Rpb24gKCkge1xuICAgIHRyeSB7XG4gICAgICAgIGlmICh0eXBlb2Ygc2V0VGltZW91dCA9PT0gJ2Z1bmN0aW9uJykge1xuICAgICAgICAgICAgY2FjaGVkU2V0VGltZW91dCA9IHNldFRpbWVvdXQ7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBjYWNoZWRTZXRUaW1lb3V0ID0gZGVmYXVsdFNldFRpbW91dDtcbiAgICAgICAgfVxuICAgIH0gY2F0Y2ggKGUpIHtcbiAgICAgICAgY2FjaGVkU2V0VGltZW91dCA9IGRlZmF1bHRTZXRUaW1vdXQ7XG4gICAgfVxuICAgIHRyeSB7XG4gICAgICAgIGlmICh0eXBlb2YgY2xlYXJUaW1lb3V0ID09PSAnZnVuY3Rpb24nKSB7XG4gICAgICAgICAgICBjYWNoZWRDbGVhclRpbWVvdXQgPSBjbGVhclRpbWVvdXQ7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBjYWNoZWRDbGVhclRpbWVvdXQgPSBkZWZhdWx0Q2xlYXJUaW1lb3V0O1xuICAgICAgICB9XG4gICAgfSBjYXRjaCAoZSkge1xuICAgICAgICBjYWNoZWRDbGVhclRpbWVvdXQgPSBkZWZhdWx0Q2xlYXJUaW1lb3V0O1xuICAgIH1cbn0gKCkpXG5mdW5jdGlvbiBydW5UaW1lb3V0KGZ1bikge1xuICAgIGlmIChjYWNoZWRTZXRUaW1lb3V0ID09PSBzZXRUaW1lb3V0KSB7XG4gICAgICAgIC8vbm9ybWFsIGVudmlyb21lbnRzIGluIHNhbmUgc2l0dWF0aW9uc1xuICAgICAgICByZXR1cm4gc2V0VGltZW91dChmdW4sIDApO1xuICAgIH1cbiAgICAvLyBpZiBzZXRUaW1lb3V0IHdhc24ndCBhdmFpbGFibGUgYnV0IHdhcyBsYXR0ZXIgZGVmaW5lZFxuICAgIGlmICgoY2FjaGVkU2V0VGltZW91dCA9PT0gZGVmYXVsdFNldFRpbW91dCB8fCAhY2FjaGVkU2V0VGltZW91dCkgJiYgc2V0VGltZW91dCkge1xuICAgICAgICBjYWNoZWRTZXRUaW1lb3V0ID0gc2V0VGltZW91dDtcbiAgICAgICAgcmV0dXJuIHNldFRpbWVvdXQoZnVuLCAwKTtcbiAgICB9XG4gICAgdHJ5IHtcbiAgICAgICAgLy8gd2hlbiB3aGVuIHNvbWVib2R5IGhhcyBzY3Jld2VkIHdpdGggc2V0VGltZW91dCBidXQgbm8gSS5FLiBtYWRkbmVzc1xuICAgICAgICByZXR1cm4gY2FjaGVkU2V0VGltZW91dChmdW4sIDApO1xuICAgIH0gY2F0Y2goZSl7XG4gICAgICAgIHRyeSB7XG4gICAgICAgICAgICAvLyBXaGVuIHdlIGFyZSBpbiBJLkUuIGJ1dCB0aGUgc2NyaXB0IGhhcyBiZWVuIGV2YWxlZCBzbyBJLkUuIGRvZXNuJ3QgdHJ1c3QgdGhlIGdsb2JhbCBvYmplY3Qgd2hlbiBjYWxsZWQgbm9ybWFsbHlcbiAgICAgICAgICAgIHJldHVybiBjYWNoZWRTZXRUaW1lb3V0LmNhbGwobnVsbCwgZnVuLCAwKTtcbiAgICAgICAgfSBjYXRjaChlKXtcbiAgICAgICAgICAgIC8vIHNhbWUgYXMgYWJvdmUgYnV0IHdoZW4gaXQncyBhIHZlcnNpb24gb2YgSS5FLiB0aGF0IG11c3QgaGF2ZSB0aGUgZ2xvYmFsIG9iamVjdCBmb3IgJ3RoaXMnLCBob3BmdWxseSBvdXIgY29udGV4dCBjb3JyZWN0IG90aGVyd2lzZSBpdCB3aWxsIHRocm93IGEgZ2xvYmFsIGVycm9yXG4gICAgICAgICAgICByZXR1cm4gY2FjaGVkU2V0VGltZW91dC5jYWxsKHRoaXMsIGZ1biwgMCk7XG4gICAgICAgIH1cbiAgICB9XG5cblxufVxuZnVuY3Rpb24gcnVuQ2xlYXJUaW1lb3V0KG1hcmtlcikge1xuICAgIGlmIChjYWNoZWRDbGVhclRpbWVvdXQgPT09IGNsZWFyVGltZW91dCkge1xuICAgICAgICAvL25vcm1hbCBlbnZpcm9tZW50cyBpbiBzYW5lIHNpdHVhdGlvbnNcbiAgICAgICAgcmV0dXJuIGNsZWFyVGltZW91dChtYXJrZXIpO1xuICAgIH1cbiAgICAvLyBpZiBjbGVhclRpbWVvdXQgd2Fzbid0IGF2YWlsYWJsZSBidXQgd2FzIGxhdHRlciBkZWZpbmVkXG4gICAgaWYgKChjYWNoZWRDbGVhclRpbWVvdXQgPT09IGRlZmF1bHRDbGVhclRpbWVvdXQgfHwgIWNhY2hlZENsZWFyVGltZW91dCkgJiYgY2xlYXJUaW1lb3V0KSB7XG4gICAgICAgIGNhY2hlZENsZWFyVGltZW91dCA9IGNsZWFyVGltZW91dDtcbiAgICAgICAgcmV0dXJuIGNsZWFyVGltZW91dChtYXJrZXIpO1xuICAgIH1cbiAgICB0cnkge1xuICAgICAgICAvLyB3aGVuIHdoZW4gc29tZWJvZHkgaGFzIHNjcmV3ZWQgd2l0aCBzZXRUaW1lb3V0IGJ1dCBubyBJLkUuIG1hZGRuZXNzXG4gICAgICAgIHJldHVybiBjYWNoZWRDbGVhclRpbWVvdXQobWFya2VyKTtcbiAgICB9IGNhdGNoIChlKXtcbiAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgIC8vIFdoZW4gd2UgYXJlIGluIEkuRS4gYnV0IHRoZSBzY3JpcHQgaGFzIGJlZW4gZXZhbGVkIHNvIEkuRS4gZG9lc24ndCAgdHJ1c3QgdGhlIGdsb2JhbCBvYmplY3Qgd2hlbiBjYWxsZWQgbm9ybWFsbHlcbiAgICAgICAgICAgIHJldHVybiBjYWNoZWRDbGVhclRpbWVvdXQuY2FsbChudWxsLCBtYXJrZXIpO1xuICAgICAgICB9IGNhdGNoIChlKXtcbiAgICAgICAgICAgIC8vIHNhbWUgYXMgYWJvdmUgYnV0IHdoZW4gaXQncyBhIHZlcnNpb24gb2YgSS5FLiB0aGF0IG11c3QgaGF2ZSB0aGUgZ2xvYmFsIG9iamVjdCBmb3IgJ3RoaXMnLCBob3BmdWxseSBvdXIgY29udGV4dCBjb3JyZWN0IG90aGVyd2lzZSBpdCB3aWxsIHRocm93IGEgZ2xvYmFsIGVycm9yLlxuICAgICAgICAgICAgLy8gU29tZSB2ZXJzaW9ucyBvZiBJLkUuIGhhdmUgZGlmZmVyZW50IHJ1bGVzIGZvciBjbGVhclRpbWVvdXQgdnMgc2V0VGltZW91dFxuICAgICAgICAgICAgcmV0dXJuIGNhY2hlZENsZWFyVGltZW91dC5jYWxsKHRoaXMsIG1hcmtlcik7XG4gICAgICAgIH1cbiAgICB9XG5cblxuXG59XG52YXIgcXVldWUgPSBbXTtcbnZhciBkcmFpbmluZyA9IGZhbHNlO1xudmFyIGN1cnJlbnRRdWV1ZTtcbnZhciBxdWV1ZUluZGV4ID0gLTE7XG5cbmZ1bmN0aW9uIGNsZWFuVXBOZXh0VGljaygpIHtcbiAgICBpZiAoIWRyYWluaW5nIHx8ICFjdXJyZW50UXVldWUpIHtcbiAgICAgICAgcmV0dXJuO1xuICAgIH1cbiAgICBkcmFpbmluZyA9IGZhbHNlO1xuICAgIGlmIChjdXJyZW50UXVldWUubGVuZ3RoKSB7XG4gICAgICAgIHF1ZXVlID0gY3VycmVudFF1ZXVlLmNvbmNhdChxdWV1ZSk7XG4gICAgfSBlbHNlIHtcbiAgICAgICAgcXVldWVJbmRleCA9IC0xO1xuICAgIH1cbiAgICBpZiAocXVldWUubGVuZ3RoKSB7XG4gICAgICAgIGRyYWluUXVldWUoKTtcbiAgICB9XG59XG5cbmZ1bmN0aW9uIGRyYWluUXVldWUoKSB7XG4gICAgaWYgKGRyYWluaW5nKSB7XG4gICAgICAgIHJldHVybjtcbiAgICB9XG4gICAgdmFyIHRpbWVvdXQgPSBydW5UaW1lb3V0KGNsZWFuVXBOZXh0VGljayk7XG4gICAgZHJhaW5pbmcgPSB0cnVlO1xuXG4gICAgdmFyIGxlbiA9IHF1ZXVlLmxlbmd0aDtcbiAgICB3aGlsZShsZW4pIHtcbiAgICAgICAgY3VycmVudFF1ZXVlID0gcXVldWU7XG4gICAgICAgIHF1ZXVlID0gW107XG4gICAgICAgIHdoaWxlICgrK3F1ZXVlSW5kZXggPCBsZW4pIHtcbiAgICAgICAgICAgIGlmIChjdXJyZW50UXVldWUpIHtcbiAgICAgICAgICAgICAgICBjdXJyZW50UXVldWVbcXVldWVJbmRleF0ucnVuKCk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgcXVldWVJbmRleCA9IC0xO1xuICAgICAgICBsZW4gPSBxdWV1ZS5sZW5ndGg7XG4gICAgfVxuICAgIGN1cnJlbnRRdWV1ZSA9IG51bGw7XG4gICAgZHJhaW5pbmcgPSBmYWxzZTtcbiAgICBydW5DbGVhclRpbWVvdXQodGltZW91dCk7XG59XG5cbnByb2Nlc3MubmV4dFRpY2sgPSBmdW5jdGlvbiAoZnVuKSB7XG4gICAgdmFyIGFyZ3MgPSBuZXcgQXJyYXkoYXJndW1lbnRzLmxlbmd0aCAtIDEpO1xuICAgIGlmIChhcmd1bWVudHMubGVuZ3RoID4gMSkge1xuICAgICAgICBmb3IgKHZhciBpID0gMTsgaSA8IGFyZ3VtZW50cy5sZW5ndGg7IGkrKykge1xuICAgICAgICAgICAgYXJnc1tpIC0gMV0gPSBhcmd1bWVudHNbaV07XG4gICAgICAgIH1cbiAgICB9XG4gICAgcXVldWUucHVzaChuZXcgSXRlbShmdW4sIGFyZ3MpKTtcbiAgICBpZiAocXVldWUubGVuZ3RoID09PSAxICYmICFkcmFpbmluZykge1xuICAgICAgICBydW5UaW1lb3V0KGRyYWluUXVldWUpO1xuICAgIH1cbn07XG5cbi8vIHY4IGxpa2VzIHByZWRpY3RpYmxlIG9iamVjdHNcbmZ1bmN0aW9uIEl0ZW0oZnVuLCBhcnJheSkge1xuICAgIHRoaXMuZnVuID0gZnVuO1xuICAgIHRoaXMuYXJyYXkgPSBhcnJheTtcbn1cbkl0ZW0ucHJvdG90eXBlLnJ1biA9IGZ1bmN0aW9uICgpIHtcbiAgICB0aGlzLmZ1bi5hcHBseShudWxsLCB0aGlzLmFycmF5KTtcbn07XG5wcm9jZXNzLnRpdGxlID0gJ2Jyb3dzZXInO1xucHJvY2Vzcy5icm93c2VyID0gdHJ1ZTtcbnByb2Nlc3MuZW52ID0ge307XG5wcm9jZXNzLmFyZ3YgPSBbXTtcbnByb2Nlc3MudmVyc2lvbiA9ICcnOyAvLyBlbXB0eSBzdHJpbmcgdG8gYXZvaWQgcmVnZXhwIGlzc3Vlc1xucHJvY2Vzcy52ZXJzaW9ucyA9IHt9O1xuXG5mdW5jdGlvbiBub29wKCkge31cblxucHJvY2Vzcy5vbiA9IG5vb3A7XG5wcm9jZXNzLmFkZExpc3RlbmVyID0gbm9vcDtcbnByb2Nlc3Mub25jZSA9IG5vb3A7XG5wcm9jZXNzLm9mZiA9IG5vb3A7XG5wcm9jZXNzLnJlbW92ZUxpc3RlbmVyID0gbm9vcDtcbnByb2Nlc3MucmVtb3ZlQWxsTGlzdGVuZXJzID0gbm9vcDtcbnByb2Nlc3MuZW1pdCA9IG5vb3A7XG5cbnByb2Nlc3MuYmluZGluZyA9IGZ1bmN0aW9uIChuYW1lKSB7XG4gICAgdGhyb3cgbmV3IEVycm9yKCdwcm9jZXNzLmJpbmRpbmcgaXMgbm90IHN1cHBvcnRlZCcpO1xufTtcblxucHJvY2Vzcy5jd2QgPSBmdW5jdGlvbiAoKSB7IHJldHVybiAnLycgfTtcbnByb2Nlc3MuY2hkaXIgPSBmdW5jdGlvbiAoZGlyKSB7XG4gICAgdGhyb3cgbmV3IEVycm9yKCdwcm9jZXNzLmNoZGlyIGlzIG5vdCBzdXBwb3J0ZWQnKTtcbn07XG5wcm9jZXNzLnVtYXNrID0gZnVuY3Rpb24oKSB7IHJldHVybiAwOyB9O1xuIiwiLyoqXHJcbiAqIFdvcmsgd2l0aCBkYXRhIHN0b3Jlc1xyXG4gKi9cclxuXHJcbmNvbnN0IERFQk9VTkNFX1RJTUUgPSAyMDAwO1xyXG5jb25zdCBEQVRBX1NUT1JFX1JPT1QgPSBcIi9hcGkvZGF0YS9cIjtcclxuXHJcbnZhciBpZGIgPSByZXF1aXJlKFwiaWRiXCIpO1xyXG5cclxuLy8gY2FjaGUgZGF0YSBzdG9yZSBpbnN0YW5jZXNcclxudmFyIHN0b3JlcyA9IHt9O1xyXG5cclxuLy8gZ2V0L2NyZWF0ZSBhIGRhdGFzdG9yZVxyXG52YXIgc3RvcmUgPSBleHBvcnRzLnN0b3JlID0gZnVuY3Rpb24obmFtZSkge1xyXG5cdC8vIHVzZSB0aGUgY2FjaGVkIHN0b3JlXHJcblx0aWYobmFtZSBpbiBzdG9yZXMpIHtcclxuXHRcdHJldHVybiBzdG9yZXNbbmFtZV07XHJcblx0fVxyXG5cclxuXHR2YXIgc3RvcmUgPSBuZXcgU3RvcmUobmFtZSk7XHJcblxyXG5cdC8vIGNhY2hlIHRoZSBkYXRhIHN0b3JlIGluc3RhbmNlXHJcblx0c3RvcmVzW25hbWVdID0gc3RvcmU7XHJcblxyXG5cdC8vIHRlbGwgYW55IGxpc3RlbmVycyB0aGUgc3RvcmUgaGFzIGJlZW4gY3JlYXRlZFxyXG5cdGxpZmVMaW5lLmVtaXQoXCJkYXRhLXN0b3JlLWNyZWF0ZWRcIiwgc3RvcmUpO1xyXG5cclxuXHRyZXR1cm4gc3RvcmU7XHJcbn07XHJcblxyXG5jbGFzcyBTdG9yZSBleHRlbmRzIGxpZmVMaW5lLkV2ZW50RW1pdHRlciB7XHJcblx0Y29uc3RydWN0b3IobmFtZSkge1xyXG5cdFx0c3VwZXIoKTtcclxuXHRcdHRoaXMubmFtZSA9IG5hbWU7XHJcblx0XHR0aGlzLl9jYWNoZSA9IHt9O1xyXG5cdFx0Ly8gZG9uJ3Qgc2VuZCBkdXBsaWNhdGUgcmVxdWVzdHNcclxuXHRcdHRoaXMuX3JlcXVlc3RpbmcgPSBbXTtcclxuXHRcdC8vIHByb21pc2UgZm9yIHRoZSBkYXRhYmFzZVxyXG5cdFx0dGhpcy5fZGIgPSBpZGIub3BlbihcImRhdGEtc3RvcmVzXCIsIDIsIGRiID0+IHtcclxuXHRcdFx0Ly8gdXBncmFkZSBvciBjcmVhdGUgdGhlIGRiXHJcblx0XHRcdGlmKGRiLm9sZFZlcnNpb24gPCAxKVxyXG5cdFx0XHRcdGRiLmNyZWF0ZU9iamVjdFN0b3JlKFwiYXNzaWdubWVudHNcIiwgeyBrZXlQYXRoOiBcImlkXCIgfSk7XHJcblx0XHRcdGlmKGRiLm9sZFZlcnNpb24gPCAyKVxyXG5cdFx0XHRcdGRiLmNyZWF0ZU9iamVjdFN0b3JlKFwic3luYy1zdG9yZVwiLCB7IGtleVBhdGg6IFwiaWRcIiB9KTtcclxuXHRcdH0pO1xyXG5cdH1cclxuXHJcblx0Ly8gc2V0IHRoZSBmdW5jdGlvbiB0byBkZXNlcmlhbGl6ZSBhbGwgZGF0YSBmcm9tIHRoZSBzZXJ2ZXJcclxuXHRzZXRJbml0KGZuKSB7XHJcblx0XHR0aGlzLl9kZXNlcmlhbGl6ZXIgPSBmbjtcclxuXHR9XHJcblxyXG5cdC8vIGdldCBhbGwgdGhlIGl0ZW1zIGFuZCBsaXN0ZW4gZm9yIGFueSBjaGFuZ2VzXHJcblx0Z2V0QWxsKGZuKSB7XHJcblx0XHRpZighZm4pIHtcclxuXHRcdFx0Ly8gbG9hZCBpdGVtcyBmcm9tIGlkYlxyXG5cdFx0XHRyZXR1cm4gdGhpcy5fZGIudGhlbihkYiA9PiB7XHJcblx0XHRcdFx0cmV0dXJuIGRiLnRyYW5zYWN0aW9uKHRoaXMubmFtZSlcclxuXHRcdFx0XHRcdC5vYmplY3RTdG9yZSh0aGlzLm5hbWUpXHJcblx0XHRcdFx0XHQuZ2V0QWxsKClcclxuXHRcdFx0fSk7XHJcblx0XHR9XHJcblxyXG5cdFx0Ly8gZ28gdG8gdGhlIGNhY2hlIGZpcnN0XHJcblx0XHRmbihhcnJheUZyb21PYmplY3QodGhpcy5fY2FjaGUpKTtcclxuXHJcblx0XHQvLyBsb2FkIGl0ZW1zIGZyb20gaWRiXHJcblx0XHR0aGlzLl9kYi50aGVuKGRiID0+IHtcclxuXHRcdFx0ZGIudHJhbnNhY3Rpb24odGhpcy5uYW1lKVxyXG5cdFx0XHRcdC5vYmplY3RTdG9yZSh0aGlzLm5hbWUpXHJcblx0XHRcdFx0LmdldEFsbCgpXHJcblx0XHRcdFx0LnRoZW4oYWxsID0+IHtcclxuXHRcdFx0XHRcdC8vIHN0b3JlIGl0ZW1zIGluIHRoZSBjYWNoZVxyXG5cdFx0XHRcdFx0Zm9yKGxldCBpdGVtIG9mIGFsbCkge1xyXG5cdFx0XHRcdFx0XHR0aGlzLl9jYWNoZVtpdGVtLmlkXSA9IGl0ZW07XHJcblx0XHRcdFx0XHR9XHJcblxyXG5cdFx0XHRcdFx0Ly8gbm90aWZ5IGxpc3RlbmVycyB3ZSBsb2FkZWQgdGhlIGRhdGFcclxuXHRcdFx0XHRcdHRoaXMuZW1pdChcImNoYW5nZVwiKTtcclxuXHRcdFx0XHR9KTtcclxuXHRcdH0pO1xyXG5cclxuXHRcdC8vIGxpc3RlbiBmb3IgYW55IGNoYW5nZXNcclxuXHRcdHJldHVybiB0aGlzLm9uKFwiY2hhbmdlXCIsICgpID0+IHtcclxuXHRcdFx0Ly8gdGhlIGNoYW5nZXMgd2lsbCB3ZSBpbiB0aGUgY2FjaGVcclxuXHRcdFx0Zm4oYXJyYXlGcm9tT2JqZWN0KHRoaXMuX2NhY2hlKSk7XHJcblx0XHR9KTtcclxuXHR9XHJcblxyXG5cdC8vIGdldCBhIHNpbmdsZSBpdGVtIGFuZCBsaXN0ZW4gZm9yIGNoYW5nZXNcclxuXHRnZXQoaWQsIGZuKSB7XHJcblx0XHQvLyBqdXN0IGxvYWQgdGhlIHZhbHVlIGZyb20gaWRiXHJcblx0XHRpZighZm4pIHtcclxuXHRcdFx0Ly8gaGl0IHRoZSBjYWNoZVxyXG5cdFx0XHRpZih0aGlzLl9jYWNoZVtpZF0pIHJldHVybiBQcm9taXNlLnJlc29sdmUodGhpcy5fY2FjaGVbaWRdKTtcclxuXHJcblx0XHRcdC8vIGhpdCBpZGJcclxuXHRcdFx0cmV0dXJuIHRoaXMuX2RiLnRoZW4oZGIgPT4ge1xyXG5cdFx0XHRcdHJldHVybiBkYi50cmFuc2FjdGlvbih0aGlzLm5hbWUpXHJcblx0XHRcdFx0XHQub2JqZWN0U3RvcmUodGhpcy5uYW1lKVxyXG5cdFx0XHRcdFx0LmdldChpZClcclxuXHRcdFx0XHRcdC50aGVuKGl0ZW0gPT4ge1xyXG5cdFx0XHRcdFx0XHRpZih0eXBlb2YgdGhpcy5fZGVzZXJpYWxpemVyID09IFwiZnVuY3Rpb25cIikge1xyXG5cdFx0XHRcdFx0XHRcdHJldHVybiB0aGlzLl9kZXNlcmlhbGl6ZXIoaXRlbSkgfHwgaXRlbTtcclxuXHRcdFx0XHRcdFx0fVxyXG5cclxuXHRcdFx0XHRcdFx0cmV0dXJuIGl0ZW07XHJcblx0XHRcdFx0XHR9KTtcclxuXHRcdFx0fSk7XHJcblx0XHR9XHJcblxyXG5cdFx0Ly8gZ28gdG8gdGhlIGNhY2hlIGZpcnN0XHJcblx0XHRmbih0aGlzLl9jYWNoZVtpZF0pO1xyXG5cclxuXHRcdC8vIGxvYWQgdGhlIGl0ZW0gZnJvbSBpZGJcclxuXHRcdHRoaXMuX2RiLnRoZW4oZGIgPT4ge1xyXG5cdFx0XHRkYi50cmFuc2FjdGlvbih0aGlzLm5hbWUpXHJcblx0XHRcdFx0Lm9iamVjdFN0b3JlKHRoaXMubmFtZSlcclxuXHRcdFx0XHQuZ2V0KGlkKVxyXG5cdFx0XHRcdC50aGVuKGl0ZW0gPT4ge1xyXG5cdFx0XHRcdFx0aWYoaXRlbSkge1xyXG5cdFx0XHRcdFx0XHQvLyBzdG9yZSBpdGVtIGluIHRoZSBjYWNoZVxyXG5cdFx0XHRcdFx0XHR0aGlzLl9jYWNoZVtpdGVtLmlkXSA9IGl0ZW07XHJcblxyXG5cdFx0XHRcdFx0XHQvLyBub3RpZnkgbGlzdGVuZXJzIHdlIGxvYWRlZCB0aGUgZGF0YVxyXG5cdFx0XHRcdFx0XHR0aGlzLmVtaXQoXCJjaGFuZ2VcIik7XHJcblx0XHRcdFx0XHR9XHJcblx0XHRcdFx0fSk7XHJcblx0XHR9KTtcclxuXHJcblx0XHQvLyBsaXN0ZW4gZm9yIGFueSBjaGFuZ2VzXHJcblx0XHRyZXR1cm4gdGhpcy5vbihcImNoYW5nZVwiLCAoKSA9PiB7XHJcblx0XHRcdGZuKHRoaXMuX2NhY2hlW2lkXSk7XHJcblx0XHR9KTtcclxuXHR9XHJcblxyXG5cdC8vIHN0b3JlIGEgdmFsdWUgaW4gdGhlIHN0b3JlXHJcblx0c2V0KHZhbHVlLCBza2lwcywgb3B0cyA9IHt9KSB7XHJcblx0XHR2YXIgaXNOZXcgPSAhIXRoaXMuX2NhY2hlW3ZhbHVlLmlkXTtcclxuXHJcblx0XHQvLyBkZXNlcmlhbGl6ZVxyXG5cdFx0aWYodHlwZW9mIHRoaXMuX2Rlc2VyaWFsaXplciA9PSBcImZ1bmN0aW9uXCIpIHtcclxuXHRcdFx0dmFsdWUgPSB0aGlzLl9kZXNlcmlhbGl6ZXIodmFsdWUpIHx8IHZhbHVlO1xyXG5cdFx0fVxyXG5cclxuXHRcdC8vIHN0b3JlIHRoZSB2YWx1ZSBpbiB0aGUgY2FjaGVcclxuXHRcdHRoaXMuX2NhY2hlW3ZhbHVlLmlkXSA9IHZhbHVlO1xyXG5cclxuXHRcdC8vIHNhdmUgdGhlIGl0ZW1cclxuXHRcdHZhciBzYXZlID0gKCkgPT4ge1xyXG5cdFx0XHQvLyBzYXZlIHRoZSBpdGVtIGluIHRoZSBkYlxyXG5cdFx0XHR0aGlzLl9kYi50aGVuKGRiID0+IHtcclxuXHRcdFx0XHRkYi50cmFuc2FjdGlvbih0aGlzLm5hbWUsIFwicmVhZHdyaXRlXCIpXHJcblx0XHRcdFx0XHQub2JqZWN0U3RvcmUodGhpcy5uYW1lKVxyXG5cdFx0XHRcdFx0LnB1dCh2YWx1ZSk7XHJcblx0XHRcdH0pO1xyXG5cclxuXHRcdFx0Ly8gc3luYyB0aGUgY2hhbmdlcyB0byB0aGUgc2VydmVyXHJcblx0XHRcdHRoaXMucGFydGlhbEVtaXQoXCJzeW5jLXB1dFwiLCBza2lwcywgdmFsdWUsIGlzTmV3KTtcclxuXHRcdH07XHJcblxyXG5cdFx0Ly8gZW1pdCBhIGNoYW5nZVxyXG5cdFx0dGhpcy5wYXJ0aWFsRW1pdChcImNoYW5nZVwiLCBza2lwcyk7XHJcblxyXG5cdFx0Ly8gZG9uJ3Qgd2FpdCB0byBzZW5kIHRoZSBjaGFuZ2VzIHRvIHRoZSBzZXJ2ZXJcclxuXHRcdGlmKG9wdHMuc2F2ZU5vdykgcmV0dXJuIHNhdmUoKTtcclxuXHRcdGVsc2UgZGVib3VuY2UoYCR7dGhpcy5uYW1lfS8ke3ZhbHVlLmlkfWAsIHNhdmUpO1xyXG5cdH1cclxuXHJcblx0Ly8gcmVtb3ZlIGEgdmFsdWUgZnJvbSB0aGUgc3RvcmVcclxuXHRyZW1vdmUoaWQsIHNraXBzKSB7XHJcblx0XHQvLyByZW1vdmUgdGhlIHZhbHVlIGZyb20gdGhlIGNhY2hlXHJcblx0XHRkZWxldGUgdGhpcy5fY2FjaGVbaWRdO1xyXG5cclxuXHRcdC8vIGVtaXQgYSBjaGFuZ2VcclxuXHRcdHRoaXMucGFydGlhbEVtaXQoXCJjaGFuZ2VcIiwgc2tpcHMpO1xyXG5cclxuXHRcdC8vIHN5bmMgdGhlIGNoYW5nZXMgdG8gdGhlIHNlcnZlclxyXG5cdFx0dGhpcy5wYXJ0aWFsRW1pdChcInN5bmMtZGVsZXRlXCIsIHNraXBzLCBpZCk7XHJcblxyXG5cdFx0Ly8gZGVsZXRlIHRoZSBpdGVtXHJcblx0XHRyZXR1cm4gdGhpcy5fZGIudGhlbihkYiA9PiB7XHJcblx0XHRcdHJldHVybiBkYi50cmFuc2FjdGlvbih0aGlzLm5hbWUsIFwicmVhZHdyaXRlXCIpXHJcblx0XHRcdFx0Lm9iamVjdFN0b3JlKHRoaXMubmFtZSlcclxuXHRcdFx0XHQuZGVsZXRlKGlkKTtcclxuXHRcdH0pO1xyXG5cdH1cclxuXHJcblx0Ly8gZm9yY2Ugc2F2ZXMgdG8gZ28gdGhyb3VnaFxyXG5cdGZvcmNlU2F2ZSgpIHtcclxuXHRcdGZvcihsZXQgdGltZXIgb2YgT2JqZWN0LmdldE93blByb3BlcnR5TmFtZXMoZGVib3VuY2VUaW1lcnMpKSB7XHJcblx0XHRcdC8vIG9ubHkgc2F2ZSBpdGVtcyBmcm9tIHRoaXMgZGF0YSBzdG9yZVxyXG5cdFx0XHRpZih0aW1lci5pbmRleE9mKGAke3RoaXMubmFtZX0vYCkgPT09IDApIHtcclxuXHRcdFx0XHRjb250aW51ZTtcclxuXHRcdFx0fVxyXG5cclxuXHRcdFx0Ly8gbG9vayB1cCB0aGUgdGltZXIgaWRcclxuXHRcdFx0bGV0IGlkID0gdGltZXIuc3Vic3RyKHRpbWVyLmluZGV4T2YoXCIvXCIpICsgMSk7XHJcblx0XHRcdHZhciB2YWx1ZSA9IHRoaXMuX2NhY2hlW2lkXTtcclxuXHJcblx0XHRcdC8vIGNsZWFyIHRoZSB0aW1lclxyXG5cdFx0XHRjbGVhclRpbWVvdXQodGltZXIpO1xyXG5cclxuXHRcdFx0Ly8gcmVtb3ZlIHRoZSB0aW1lciBmcm9tIHRoZSBsaXN0XHJcblx0XHRcdGRlbGV0ZSBkZWJvdW5jZVRpbWVyc1t0aW1lcl07XHJcblxyXG5cdFx0XHQvLyBkb24ndCBzYXZlIG9uIGRlbGV0ZVxyXG5cdFx0XHRpZighdmFsdWUpIHJldHVybjtcclxuXHJcblx0XHRcdC8vIHNhdmUgdGhlIGl0ZW0gaW4gdGhlIGRiXHJcblx0XHRcdHRoaXMuX2RiLnRoZW4oZGIgPT4ge1xyXG5cdFx0XHRcdGRiLnRyYW5zYWN0aW9uKHRoaXMubmFtZSwgXCJyZWFkd3JpdGVcIilcclxuXHRcdFx0XHRcdC5vYmplY3RTdG9yZSh0aGlzLm5hbWUpXHJcblx0XHRcdFx0XHQucHV0KHZhbHVlKTtcclxuXHRcdFx0fSk7XHJcblxyXG5cdFx0XHQvLyBzeW5jIHRoZSBjaGFuZ2VzIHRvIHRoZSBzZXJ2ZXJcclxuXHRcdFx0dGhpcy5lbWl0KFwic3luYy1wdXRcIiwgdmFsdWUpO1xyXG5cdFx0fVxyXG5cdH1cclxufVxyXG5cclxuLy8gZ2V0IGFuIGFycmF5IGZyb20gYW4gb2JqZWN0XHJcbnZhciBhcnJheUZyb21PYmplY3QgPSBmdW5jdGlvbihvYmopIHtcclxuXHRyZXR1cm4gT2JqZWN0LmdldE93blByb3BlcnR5TmFtZXMob2JqKVxyXG5cdFx0Lm1hcChuYW1lID0+IG9ialtuYW1lXSk7XHJcbn07XHJcblxyXG4vLyBkb24ndCBjYWxsIGEgZnVuY3Rpb24gdG9vIG9mdGVuXHJcbnZhciBkZWJvdW5jZVRpbWVycyA9IHt9O1xyXG5cclxudmFyIGRlYm91bmNlID0gKGlkLCBmbikgPT4ge1xyXG5cdC8vIGNhbmNlbCB0aGUgcHJldmlvdXMgZGVsYXlcclxuXHRjbGVhclRpbWVvdXQoZGVib3VuY2VUaW1lcnNbaWRdKTtcclxuXHQvLyBzdGFydCBhIG5ldyBkZWxheVxyXG5cdGRlYm91bmNlVGltZXJzW2lkXSA9IHNldFRpbWVvdXQoZm4sIERFQk9VTkNFX1RJTUUpO1xyXG59O1xyXG4iLCIvKipcclxuICogSW5zdGFudGlhdGUgYWxsIHRoZSBkYXRhIHN0b3Jlc1xyXG4gKi9cclxuXHJcbnZhciBIdHRwQWRhcHRvciA9IHJlcXVpcmUoXCIuLi8uLi9jb21tb24vZGF0YS1zdG9yZXMvaHR0cC1hZGFwdG9yXCIpO1xyXG52YXIgUG9vbFN0b3JlID0gcmVxdWlyZShcIi4uLy4uL2NvbW1vbi9kYXRhLXN0b3Jlcy9wb29sLXN0b3JlXCIpO1xyXG5cclxudmFyIGluaXRJdGVtID0gaXRlbSA9PiB7XHJcblx0Ly8gaW5zdGFudGlhdGUgdGhlIGRhdGVcclxuXHRpZihpdGVtLmRhdGUpIHtcclxuXHRcdGl0ZW0uZGF0ZSA9IG5ldyBEYXRlKGl0ZW0uZGF0ZSk7XHJcblx0fVxyXG59O1xyXG5cclxudmFyIGFzc2lnbm1lbnRzQWRhcHRvciA9IG5ldyBIdHRwQWRhcHRvcihcIi9hcGkvZGF0YS9cIik7XHJcblxyXG5leHBvcnRzLmFzc2lnbm1lbnRzID0gbmV3IFBvb2xTdG9yZShhc3NpZ25tZW50c0FkYXB0b3IsIGluaXRJdGVtKTtcclxuXHJcbi8vIGNoZWNrIG91ciBhY2Nlc3MgbGV2ZWxcclxuYXNzaWdubWVudHNBZGFwdG9yLmFjY2Vzc0xldmVsKClcclxuXHJcbi50aGVuKGxldmVsID0+IHtcclxuXHQvLyB3ZSBhcmUgbG9nZ2VkIG91dFxyXG5cdGlmKGxldmVsID09IFwibm9uZVwiKSB7XHJcblx0XHRsaWZlTGluZS5uYXYubmF2aWdhdGUoXCIvbG9naW5cIik7XHJcblx0fVxyXG59KTtcclxuIiwiLyoqXHJcbiAqIEJyb3dzZXIgc3BlY2lmaWMgZ2xvYmFsc1xyXG4gKi9cclxuXHJcbmxpZmVMaW5lLm1ha2VEb20gPSByZXF1aXJlKFwiLi91dGlsL2RvbS1tYWtlclwiKTtcclxubGlmZUxpbmUuc3luY2VyID0gcmVxdWlyZShcIi4vc3luY2VyXCIpO1xyXG5cclxuLy8gYWRkIGEgZnVuY3Rpb24gZm9yIGFkZGluZyBhY3Rpb25zXHJcbmxpZmVMaW5lLmFkZEFjdGlvbiA9IGZ1bmN0aW9uKG5hbWUsIGZuKSB7XHJcblx0Ly8gYXR0YWNoIHRoZSBjYWxsYmFja1xyXG5cdHZhciBsaXN0ZW5lciA9IGxpZmVMaW5lLm9uKFwiYWN0aW9uLWV4ZWMtXCIgKyBuYW1lLCBmbik7XHJcblxyXG5cdC8vIGluZm9ybSBhbnkgYWN0aW9uIHByb3ZpZGVyc1xyXG5cdGxpZmVMaW5lLmVtaXQoXCJhY3Rpb24tY3JlYXRlXCIsIG5hbWUpO1xyXG5cclxuXHQvLyBhbGwgYWN0aW9ucyByZW1vdmVkXHJcblx0dmFyIHJlbW92ZUFsbCA9IGxpZmVMaW5lLm9uKFwiYWN0aW9uLXJlbW92ZS1hbGxcIiwgKCkgPT4ge1xyXG5cdFx0Ly8gcmVtb3ZlIHRoZSBhY3Rpb24gbGlzdGVuZXJcclxuXHRcdGxpc3RlbmVyLnVuc3Vic2NyaWJlKCk7XHJcblx0XHRyZW1vdmVBbGwudW5zdWJzY3JpYmUoKTtcclxuXHR9KTtcclxuXHJcblx0cmV0dXJuIHtcclxuXHRcdHVuc3Vic2NyaWJlKCkge1xyXG5cdFx0XHQvLyByZW1vdmUgdGhlIGFjdGlvbiBsaXN0ZW5lclxyXG5cdFx0XHRsaXN0ZW5lci51bnN1YnNjcmliZSgpO1xyXG5cdFx0XHRyZW1vdmVBbGwudW5zdWJzY3JpYmUoKTtcclxuXHJcblx0XHRcdC8vIGluZm9ybSBhbnkgYWN0aW9uIHByb3ZpZGVyc1xyXG5cdFx0XHRsaWZlTGluZS5lbWl0KFwiYWN0aW9uLXJlbW92ZVwiLCBuYW1lKTtcclxuXHRcdH1cclxuXHR9O1xyXG59O1xyXG4iLCIvLyBjcmVhdGUgdGhlIGdsb2JhbCBvYmplY3RcclxucmVxdWlyZShcIi4uL2NvbW1vbi9nbG9iYWxcIik7XHJcbnJlcXVpcmUoXCIuL2dsb2JhbFwiKTtcclxuXHJcbi8vIGxvYWQgYWxsIHRoZSB3aWRnZXRzXHJcbnJlcXVpcmUoXCIuL3dpZGdldHMvc2lkZWJhclwiKTtcclxucmVxdWlyZShcIi4vd2lkZ2V0cy9jb250ZW50XCIpO1xyXG5yZXF1aXJlKFwiLi93aWRnZXRzL2xpbmtcIik7XHJcbnJlcXVpcmUoXCIuL3dpZGdldHMvbGlzdFwiKTtcclxucmVxdWlyZShcIi4vd2lkZ2V0cy9pbnB1dFwiKTtcclxucmVxdWlyZShcIi4vd2lkZ2V0cy90b2dnbGUtYnRuc1wiKTtcclxuXHJcbi8vIGxvYWQgYWxsIHRoZSB2aWV3c1xyXG52YXIge2luaXROYXZCYXJ9ID0gcmVxdWlyZShcIi4vdmlld3MvbGlzdHNcIik7XHJcbnJlcXVpcmUoXCIuL3ZpZXdzL2l0ZW1cIik7XHJcbnJlcXVpcmUoXCIuL3ZpZXdzL2VkaXRcIik7XHJcbnJlcXVpcmUoXCIuL3ZpZXdzL2xvZ2luXCIpO1xyXG5yZXF1aXJlKFwiLi92aWV3cy9hY2NvdW50XCIpO1xyXG5yZXF1aXJlKFwiLi92aWV3cy91c2Vyc1wiKTtcclxucmVxdWlyZShcIi4vdmlld3MvdG9kb1wiKTtcclxuXHJcbi8vIHNldCB1cCB0aGUgZGF0YSBzdG9yZVxyXG52YXIge3N0b3JlfSA9IHJlcXVpcmUoXCIuL2RhdGEtc3RvcmVcIik7XHJcblxyXG5zdG9yZShcImFzc2lnbm1lbnRzXCIpLnNldEluaXQoZnVuY3Rpb24oaXRlbSkge1xyXG5cdC8vIHBhcnNlIHRoZSBkYXRlXHJcblx0aWYodHlwZW9mIGl0ZW0uZGF0ZSA9PSBcInN0cmluZ1wiKSB7XHJcblx0XHRpdGVtLmRhdGUgPSBuZXcgRGF0ZShpdGVtLmRhdGUpO1xyXG5cdH1cclxufSk7XHJcblxyXG4vLyBpbnN0YW50aWF0ZSB0aGUgZG9tXHJcbmxpZmVMaW5lLm1ha2VEb20oe1xyXG5cdHBhcmVudDogZG9jdW1lbnQuYm9keSxcclxuXHRncm91cDogW1xyXG5cdFx0eyB3aWRnZXQ6IFwic2lkZWJhclwiIH0sXHJcblx0XHR7IHdpZGdldDogXCJjb250ZW50XCIgfVxyXG5cdF1cclxufSk7XHJcblxyXG4vLyBBZGQgYSBsaW5rIHRvIHRoZSB0b2RhL2hvbWUgcGFnZVxyXG5saWZlTGluZS5hZGROYXZDb21tYW5kKFwiVG9kb1wiLCBcIi9cIik7XHJcblxyXG4vLyBhZGQgbGlzdCB2aWV3cyB0byB0aGUgbmF2YmFyXHJcbmluaXROYXZCYXIoKTtcclxuXHJcbi8vIGNyZWF0ZSBhIG5ldyBhc3NpZ25tZW50XHJcbmxpZmVMaW5lLmFkZENvbW1hbmQoXCJOZXcgYXNzaWdubWVudFwiLCAoKSA9PiB7XHJcblx0dmFyIGlkID0gTWF0aC5mbG9vcihNYXRoLnJhbmRvbSgpICogMTAwMDAwMDAwKTtcclxuXHJcblx0bGlmZUxpbmUubmF2Lm5hdmlnYXRlKFwiL2VkaXQvXCIgKyBpZCk7XHJcbn0pO1xyXG5cclxuLy8gY3JlYXRlIHRoZSBsb2dvdXQgYnV0dG9uXHJcbmxpZmVMaW5lLmFkZE5hdkNvbW1hbmQoXCJBY2NvdW50XCIsIFwiL2FjY291bnRcIik7XHJcblxyXG4vLyByZWdpc3RlciB0aGUgc2VydmljZSB3b3JrZXJcclxucmVxdWlyZShcIi4vc3ctaGVscGVyXCIpO1xyXG4iLCIvKipcclxuICogUmVnaXN0ZXIgYW5kIGNvbW11bmljYXRlIHdpdGggdGhlIHNlcnZpY2Ugd29ya2VyXHJcbiAqL1xyXG5cclxuIC8vIHJlZ2lzdGVyIHRoZSBzZXJ2aWNlIHdvcmtlclxyXG4gaWYobmF2aWdhdG9yLnNlcnZpY2VXb3JrZXIpIHtcclxuXHQgLy8gbWFrZSBzdXJlIGl0J3MgcmVnaXN0ZXJlZFxyXG5cdCAvL25hdmlnYXRvci5zZXJ2aWNlV29ya2VyLnJlZ2lzdGVyKFwiL3NlcnZpY2Utd29ya2VyLmpzXCIpO1xyXG5cclxuXHQgLy8gbGlzdGVuIGZvciBtZXNzYWdlc1xyXG5cdCBuYXZpZ2F0b3Iuc2VydmljZVdvcmtlci5hZGRFdmVudExpc3RlbmVyKFwibWVzc2FnZVwiLCBlID0+IHtcclxuXHRcdCAvLyB3ZSBqdXN0IHVwZGF0ZWRcclxuXHRcdCBpZihlLmRhdGEudHlwZSA9PSBcInZlcnNpb24tY2hhbmdlXCIpIHtcclxuXHRcdFx0IGNvbnNvbGUubG9nKFwiVXBkYXRlZCB0b1wiLCBlLmRhdGEudmVyc2lvbik7XHJcblxyXG5cdFx0XHQgLy8gaW4gZGV2IG1vZGUgcmVsb2FkIHRoZSBwYWdlXHJcblx0XHRcdCBpZihlLmRhdGEudmVyc2lvbi5pbmRleE9mKFwiQFwiKSAhPT0gLTEpIHtcclxuXHRcdFx0XHQgbG9jYXRpb24ucmVsb2FkKCk7XHJcblx0XHRcdCB9XHJcblx0XHQgfVxyXG5cdCB9KTtcclxuIH1cclxuIiwiLyoqXHJcbiAqIFN5bmNyb25pemUgdGhpcyBjbGllbnQgd2l0aCB0aGUgc2VydmVyXHJcbiAqL1xyXG4vKlxyXG52YXIgZGF0YVN0b3JlID0gcmVxdWlyZShcIi4vZGF0YS1zdG9yZVwiKS5zdG9yZTtcclxuXHJcbnZhciBzeW5jU3RvcmUgPSBkYXRhU3RvcmUoXCJzeW5jLXN0b3JlXCIpO1xyXG5cclxuY29uc3QgU1RPUkVTID0gW1wiYXNzaWdubWVudHNcIl07XHJcblxyXG4vLyBjcmVhdGUgdGhlIGdsb2JhbCBzeW5jZXIgcmVmcmVuY2VcclxudmFyIHN5bmNlciA9IG1vZHVsZS5leHBvcnRzID0gbmV3IGxpZmVMaW5lLkV2ZW50RW1pdHRlcigpO1xyXG5cclxuLy8gc2F2ZSBzdWJzY3JpcHRpb25zIHRvIGRhdGEgc3RvcmUgc3luYyBldmVudHMgc28gd2UgZG9udCB0cmlnZ2VyIG91ciBzZWxmIHdoZW4gd2Ugc3luY1xyXG52YXIgc3luY1N1YnMgPSBbXTtcclxuXHJcbi8vIGRvbid0IHN5bmMgd2hpbGUgd2UgYXJlIHN5bmNpbmdcclxudmFyIGlzU3luY2luZyA9IGZhbHNlO1xyXG52YXIgc3luY0FnYWluID0gZmFsc2U7XHJcblxyXG4vLyBhZGQgYSBjaGFuZ2UgdG8gdGhlIHN5bmMgcXVldWVcclxudmFyIGVucXVldWVDaGFuZ2UgPSBjaGFuZ2UgPT4ge1xyXG5cdC8vIGxvYWQgdGhlIHF1ZXVlXHJcblx0cmV0dXJuIHN5bmNTdG9yZS5nZXQoXCJjaGFuZ2UtcXVldWVcIilcclxuXHJcblx0LnRoZW4oKHtjaGFuZ2VzID0gW119ID0ge30pID0+IHtcclxuXHRcdC8vIGdldCB0aGUgaWQgZm9yIHRoZSBjaGFuZ2VcclxuXHRcdHZhciBjaElkID0gY2hhbmdlLnR5cGUgPT0gXCJkZWxldGVcIiA/IGNoYW5nZS5pZCA6IGNoYW5nZS5kYXRhLmlkO1xyXG5cclxuXHRcdHZhciBleGlzdGluZyA9IGNoYW5nZXMuZmluZEluZGV4KGNoID0+XHJcblx0XHRcdGNoLnR5cGUgPT0gXCJkZWxldGVcIiA/IGNoLmlkID09IGNoSWQgOiBjaC5kYXRhLmlkID09IGNoSWQpO1xyXG5cclxuXHRcdC8vIHJlbW92ZSB0aGUgZXhpc3RpbmcgY2hhbmdlXHJcblx0XHRpZihleGlzdGluZyAhPT0gLTEpIHtcclxuXHRcdFx0Y2hhbmdlcy5zcGxpY2UoZXhpc3RpbmcsIDEpO1xyXG5cdFx0fVxyXG5cclxuXHRcdC8vIGFkZCB0aGUgY2hhbmdlIHRvIHRoZSBxdWV1ZVxyXG5cdFx0Y2hhbmdlcy5wdXNoKGNoYW5nZSk7XHJcblxyXG5cdFx0Ly8gc2F2ZSB0aGUgcXVldWVcclxuXHRcdHJldHVybiBzeW5jU3RvcmUuc2V0KHtcclxuXHRcdFx0aWQ6IFwiY2hhbmdlLXF1ZXVlXCIsXHJcblx0XHRcdGNoYW5nZXNcclxuXHRcdH0pO1xyXG5cdH0pXHJcblxyXG5cdC8vIHN5bmMgd2hlbiBpZGxlXHJcblx0LnRoZW4oKCkgPT4gaWRsZShzeW5jZXIuc3luYykpO1xyXG59O1xyXG5cclxuLy8gYWRkIGEgc3luYyBsaXN0ZW5lciB0byBhIGRhdGEgc3RvcmVcclxudmFyIG9uU3luYyA9IGZ1bmN0aW9uKGRzLCBuYW1lLCBmbikge1xyXG5cdHN5bmNTdWJzLnB1c2goZHMub24oXCJzeW5jLVwiICsgbmFtZSwgZm4pKTtcclxufTtcclxuXHJcbi8vIHdoZW4gYSBkYXRhIHN0b3JlIGlzIG9wZW5lZCBsaXN0ZW4gZm9yIGNoYW5nZXNcclxubGlmZUxpbmUub24oXCJkYXRhLXN0b3JlLWNyZWF0ZWRcIiwgZHMgPT4ge1xyXG5cdC8vIGRvbid0IHN5bmMgdGhlIHN5bmMgc3RvcmVcclxuXHRpZihkcy5uYW1lID09IFwic3luYy1zdG9yZVwiKSByZXR1cm47XHJcblxyXG5cdC8vIGNyZWF0ZSBhbmQgZW5xdWV1ZSBhIHB1dCBjaGFuZ2VcclxuXHRvblN5bmMoZHMsIFwicHV0XCIsICh2YWx1ZSwgaXNOZXcpID0+IHtcclxuXHRcdGVucXVldWVDaGFuZ2Uoe1xyXG5cdFx0XHRzdG9yZTogZHMubmFtZSxcclxuXHRcdFx0dHlwZTogaXNOZXcgPyBcImNyZWF0ZVwiIDogXCJwdXRcIixcclxuXHRcdFx0ZGF0YTogdmFsdWVcclxuXHRcdH0pO1xyXG5cdH0pO1xyXG5cclxuXHQvLyBjcmVhdGUgYW5kIGVucXVldWUgYSBkZWxldGUgY2hhbmdlXHJcblx0b25TeW5jKGRzLCBcImRlbGV0ZVwiLCBpZCA9PiB7XHJcblx0XHRlbnF1ZXVlQ2hhbmdlKHtcclxuXHRcdFx0c3RvcmU6IGRzLm5hbWUsXHJcblx0XHRcdHR5cGU6IFwiZGVsZXRlXCIsXHJcblx0XHRcdGlkLFxyXG5cdFx0XHR0aW1lc3RhbXA6IERhdGUubm93KClcclxuXHRcdH0pO1xyXG5cdH0pO1xyXG59KTtcclxuXHJcbi8vIHdhaXQgZm9yIHNvbWUgaWRsZSB0aW1lXHJcbnZhciBpZGxlID0gZm4gPT4ge1xyXG5cdGlmKHR5cGVvZiByZXF1ZXN0SWRsZUNhbGxiYWNrID09IFwiZnVuY3Rpb25cIikge1xyXG5cdFx0cmVxdWVzdElkbGVDYWxsYmFjayhmbik7XHJcblx0fVxyXG5cdGVsc2Uge1xyXG5cdFx0c2V0VGltZW91dChmbiwgMTAwKTtcclxuXHR9XHJcbn07XHJcblxyXG4vLyBzeW5jIHdpdGggdGhlIHNlcnZlclxyXG5zeW5jZXIuc3luYyA9IGZ1bmN0aW9uKCkge1xyXG5cdC8vIGRvbid0IHN5bmMgd2hpbGUgb2ZmbGluZVxyXG5cdGlmKG5hdmlnYXRvci5vbmxpbmUpIHtcclxuXHRcdHJldHVybjtcclxuXHR9XHJcblxyXG5cdC8vIG9ubHkgZG8gb25lIHN5bmMgYXQgYSB0aW1lXHJcblx0aWYoaXNTeW5jaW5nKSB7XHJcblx0XHRzeW5jQWdhaW4gPSB0cnVlO1xyXG5cdFx0cmV0dXJuO1xyXG5cdH1cclxuXHJcblx0aXNTeW5jaW5nID0gdHJ1ZTtcclxuXHJcblx0c3luY2VyLmVtaXQoXCJzeWNuLXN0YXJ0XCIpO1xyXG5cclxuXHQvLyBsb2FkIHRoZSBjaGFuZ2UgcXVldWVcclxuXHR2YXIgcHJvbWlzZXMgPSBbXHJcblx0XHRzeW5jU3RvcmUuZ2V0KFwiY2hhbmdlLXF1ZXVlXCIpLnRoZW4oKHtjaGFuZ2VzID0gW119ID0ge30pID0+IGNoYW5nZXMpXHJcblx0XTtcclxuXHJcblx0Ly8gbG9hZCBhbGwgaWRzXHJcblx0Zm9yKGxldCBzdG9yZU5hbWUgb2YgU1RPUkVTKSB7XHJcblx0XHRwcm9taXNlcy5wdXNoKFxyXG5cdFx0XHRkYXRhU3RvcmUoc3RvcmVOYW1lKVxyXG5cdFx0XHRcdC5nZXRBbGwoKVxyXG5cdFx0XHRcdC50aGVuKGl0ZW1zID0+IHtcclxuXHRcdFx0XHRcdHZhciBkYXRlcyA9IHt9O1xyXG5cclxuXHRcdFx0XHRcdC8vIG1hcCBtb2RpZmllZCBkYXRlIHRvIHRoZSBpZFxyXG5cdFx0XHRcdFx0aXRlbXMuZm9yRWFjaChpdGVtID0+IGRhdGVzW2l0ZW0uaWRdID0gaXRlbS5tb2RpZmllZCk7XHJcblxyXG5cdFx0XHRcdFx0cmV0dXJuIFtzdG9yZU5hbWUsIGRhdGVzXTtcclxuXHRcdFx0XHR9KVxyXG5cdFx0KTtcclxuXHR9XHJcblxyXG5cdFByb21pc2UuYWxsKHByb21pc2VzKS50aGVuKChbY2hhbmdlcywgLi4ubW9kaWZpZWRzXSkgPT4ge1xyXG5cdFx0Ly8gY29udmVydCBtb2RpZmllZHMgdG8gYW4gb2JqZWN0XHJcblx0XHR2YXIgbW9kaWZpZWRzT2JqID0ge307XHJcblxyXG5cdFx0bW9kaWZpZWRzLmZvckVhY2gobW9kaWZpZWQgPT4gbW9kaWZpZWRzT2JqW21vZGlmaWVkWzBdXSA9IG1vZGlmaWVkWzFdKTtcclxuXHJcblx0XHQvLyBzZW5kIHRoZSBjaGFuZ2VzIHRvIHRoZSBzZXJ2ZXJcclxuXHRcdHJldHVybiBmZXRjaChcIi9hcGkvZGF0YS9cIiwge1xyXG5cdFx0XHRtZXRob2Q6IFwiUE9TVFwiLFxyXG5cdFx0XHRjcmVkZW50aWFsczogXCJpbmNsdWRlXCIsXHJcblx0XHRcdGJvZHk6IEpTT04uc3RyaW5naWZ5KHtcclxuXHRcdFx0XHRjaGFuZ2VzLFxyXG5cdFx0XHRcdG1vZGlmaWVkczogbW9kaWZpZWRzT2JqXHJcblx0XHRcdH0pXHJcblx0XHR9KTtcclxuXHR9KVxyXG5cclxuXHQvLyBwYXJzZSB0aGUgYm9keVxyXG5cdC50aGVuKHJlcyA9PiByZXMuanNvbigpKVxyXG5cclxuXHQvLyBjYXRjaCBhbnkgbmV0d29yayBlcnJvcnNcclxuXHQuY2F0Y2goKCkgPT4gKHsgc3RhdHVzOiBcImZhaWxcIiwgZGF0YTogeyByZWFzb246IFwibmV0d29yay1lcnJvclwiIH0gfSkpXHJcblxyXG5cdC50aGVuKCh7c3RhdHVzLCBkYXRhOiByZXN1bHRzLCByZWFzb259KSA9PiB7XHJcblx0XHQvLyBjYXRjaCBhbnkgZXJyb3JcclxuXHRcdGlmKHN0YXR1cyA9PSBcImZhaWxcIikge1xyXG5cdFx0XHQvLyBsb2cgdGhlIHVzZXIgaW5cclxuXHRcdFx0aWYocmVzdWx0cy5yZWFzb24gPT0gXCJsb2dnZWQtb3V0XCIpIHtcclxuXHRcdFx0XHRsaWZlTGluZS5uYXYubmF2aWdhdGUoXCIvbG9naW5cIik7XHJcblx0XHRcdH1cclxuXHJcblx0XHRcdHJldHVybjtcclxuXHRcdH1cclxuXHJcblx0XHQvLyBjbGVhciB0aGUgY2hhbmdlIHF1ZXVlXHJcblx0XHRyZXN1bHRzLnVuc2hpZnQoXHJcblx0XHRcdHN5bmNTdG9yZS5zZXQoe1xyXG5cdFx0XHRcdGlkOiBcImNoYW5nZS1xdWV1ZVwiLFxyXG5cdFx0XHRcdGNoYW5nZXM6IFtdXHJcblx0XHRcdH0pXHJcblx0XHQpO1xyXG5cclxuXHRcdC8vIGFwcGx5IHRoZSByZXN1bHRzXHJcblx0XHRyZXR1cm4gUHJvbWlzZS5hbGwoXHJcblx0XHRcdHJlc3VsdHMubWFwKChyZXN1bHQsIGluZGV4KSA9PiB7XHJcblx0XHRcdFx0Ly8gZmlyc3QgcmVzdWx0IGlzIHRoZSBwcm9taXNlIHRvIHJlc2V0IHRoZSBjaGFuZ2UgcXVldWVcclxuXHRcdFx0XHRpZihpbmRleCA9PT0gMCkgcmV0dXJuIHJlc3VsdDtcclxuXHJcblx0XHRcdFx0Ly8gZGVsZXRlIHRoZSBsb2NhbCBjb3B5XHJcblx0XHRcdFx0aWYocmVzdWx0LmNvZGUgPT0gXCJpdGVtLWRlbGV0ZWRcIikge1xyXG5cdFx0XHRcdFx0bGV0IHN0b3JlID0gZGF0YVN0b3JlKHJlc3VsdC5zdG9yZSk7XHJcblxyXG5cdFx0XHRcdFx0cmV0dXJuIHN0b3JlLnJlbW92ZShyZXN1bHQuaWQsIHN5bmNTdWJzKTtcclxuXHRcdFx0XHR9XHJcblx0XHRcdFx0Ly8gc2F2ZSB0aGUgbmV3ZXIgdmVyc2lvbiBmcm9tIHRoZSBzZXJ2ZXJcclxuXHRcdFx0XHRlbHNlIGlmKHJlc3VsdC5jb2RlID09IFwibmV3ZXItdmVyc2lvblwiKSB7XHJcblx0XHRcdFx0XHRsZXQgc3RvcmUgPSBkYXRhU3RvcmUocmVzdWx0LnN0b3JlKTtcclxuXHJcblx0XHRcdFx0XHRyZXR1cm4gc3RvcmUuc2V0KHJlc3VsdC5kYXRhLCBzeW5jU3VicywgeyBzYXZlTm93OiB0cnVlIH0pO1xyXG5cdFx0XHRcdH1cclxuXHRcdFx0fSlcclxuXHRcdCk7XHJcblx0fSlcclxuXHJcblx0LnRoZW4oKCkgPT4ge1xyXG5cdFx0Ly8gcmVsZWFzZSB0aGUgbG9ja1xyXG5cdFx0aXNTeW5jaW5nID0gZmFsc2U7XHJcblxyXG5cdFx0Ly8gdGhlcmUgd2FzIGFuIGF0dGVtcHQgdG8gc3luYyB3aGlsZSB3ZSB3aGVyZSBzeW5jaW5nXHJcblx0XHRpZihzeW5jQWdhaW4pIHtcclxuXHRcdFx0c3luY0FnYWluID0gZmFsc2U7XHJcblxyXG5cdFx0XHRpZGxlKHN5bmNlci5zeW5jKTtcclxuXHRcdH1cclxuXHJcblx0XHRzeW5jZXIuZW1pdChcInN5bmMtY29tcGxldGVcIik7XHJcblx0fSk7XHJcbn07XHJcblxyXG4vLyBkb24ndCBhZGQgZXZlbnQgbGlzdGVuZXJzIGluIHRoZSBzZXJ2aWNlIHdvcmtlclxyXG5pZih0eXBlb2Ygd2luZG93ID09IFwib2JqZWN0XCIpIHtcclxuXHQvLyB3aGVuIHdlIGNvbWUgYmFjayBvbiBsaW5lIHN5bmNcclxuXHR3aW5kb3cuYWRkRXZlbnRMaXN0ZW5lcihcIm9ubGluZVwiLCAoKSA9PiBzeW5jZXIuc3luYygpKTtcclxuXHJcblx0Ly8gd2hlbiB0aGUgdXNlciBuYXZpZ2F0ZXMgYmFjayBzeW5jXHJcblx0d2luZG93LmFkZEV2ZW50TGlzdGVuZXIoXCJ2aXNpYmlsaXR5Y2hhbmdlXCIsICgpID0+IHtcclxuXHRcdGlmKCFkb2N1bWVudC5oaWRkZW4pIHtcclxuXHRcdFx0c3luY2VyLnN5bmMoKTtcclxuXHRcdH1cclxuXHR9KTtcclxuXHJcblx0Ly8gc3luYyBvbiBzdGFydHVwXHJcblx0c3luY2VyLnN5bmMoKTtcclxufVxyXG4qL1xyXG4iLCIvKipcclxuKiBEYXRlIHJlbGF0ZWQgdG9vbHNcclxuKi9cclxuXHJcbi8vIGNoZWNrIGlmIHRoZSBkYXRlcyBhcmUgdGhlIHNhbWUgZGF5XHJcbmV4cG9ydHMuaXNTYW1lRGF0ZSA9IGZ1bmN0aW9uKGRhdGUxLCBkYXRlMikge1xyXG5cdHJldHVybiBkYXRlMS5nZXRGdWxsWWVhcigpID09IGRhdGUyLmdldEZ1bGxZZWFyKCkgJiZcclxuXHRcdGRhdGUxLmdldE1vbnRoKCkgPT0gZGF0ZTIuZ2V0TW9udGgoKSAmJlxyXG5cdFx0ZGF0ZTEuZ2V0RGF0ZSgpID09IGRhdGUyLmdldERhdGUoKTtcclxufTtcclxuXHJcbi8vIGNoZWNrIGlmIGEgZGF0ZSBpcyBsZXNzIHRoYW4gYW5vdGhlclxyXG5leHBvcnRzLmlzU29vbmVyRGF0ZSA9IGZ1bmN0aW9uKGRhdGUxLCBkYXRlMikge1xyXG4gICAgLy8gY2hlY2sgdGhlIHllYXIgZmlyc3RcclxuICAgIGlmKGRhdGUxLmdldEZ1bGxZZWFyKCkgIT0gZGF0ZTIuZ2V0RnVsbFllYXIoKSkge1xyXG4gICAgICAgIHJldHVybiBkYXRlMS5nZXRGdWxsWWVhcigpIDwgZGF0ZTIuZ2V0RnVsbFllYXIoKTtcclxuICAgIH1cclxuXHJcbiAgICAvLyBjaGVjayB0aGUgbW9udGggbmV4dFxyXG4gICAgaWYoZGF0ZTEuZ2V0TW9udGgoKSAhPSBkYXRlMi5nZXRNb250aCgpKSB7XHJcbiAgICAgICAgcmV0dXJuIGRhdGUxLmdldE1vbnRoKCkgPCBkYXRlMi5nZXRNb250aCgpO1xyXG4gICAgfVxyXG5cclxuICAgIC8vIGNoZWNrIHRoZSBkYXlcclxuICAgIHJldHVybiBkYXRlMS5nZXREYXRlKCkgPCBkYXRlMi5nZXREYXRlKCk7XHJcbn07XHJcblxyXG4vLyBnZXQgdGhlIGRhdGUgZGF5cyBmcm9tIG5vd1xyXG5leHBvcnRzLmRheXNGcm9tTm93ID0gZnVuY3Rpb24oZGF5cykge1xyXG5cdHZhciBkYXRlID0gbmV3IERhdGUoKTtcclxuXHJcblx0Ly8gYWR2YW5jZSB0aGUgZGF0ZVxyXG5cdGRhdGUuc2V0RGF0ZShkYXRlLmdldERhdGUoKSArIGRheXMpO1xyXG5cclxuXHRyZXR1cm4gZGF0ZTtcclxufTtcclxuXHJcbmNvbnN0IFNUUklOR19EQVlTID0gW1wiU3VuZGF5XCIsIFwiTW9uZGF5XCIsIFwiVHVlc2RheVwiLCBcIldlZGVuc2RheVwiLCBcIlRodXJzZGF5XCIsIFwiRnJpZGF5XCIsIFwiU2F0dXJkYXlcIl07XHJcblxyXG4vLyBjb252ZXJ0IGEgZGF0ZSB0byBhIHN0cmluZ1xyXG5leHBvcnRzLnN0cmluZ2lmeURhdGUgPSBmdW5jdGlvbihkYXRlLCBvcHRzID0ge30pIHtcclxuXHQgdmFyIHN0ckRhdGUsIHN0clRpbWUgPSBcIlwiO1xyXG5cclxuICAgIC8vIGNoZWNrIGlmIHRoZSBkYXRlIGlzIGJlZm9yZSB0b2RheVxyXG4gICAgdmFyIGJlZm9yZU5vdyA9IGRhdGUuZ2V0VGltZSgpIDwgRGF0ZS5ub3coKTtcclxuXHJcblx0Ly8gVG9kYXlcclxuXHRpZihleHBvcnRzLmlzU2FtZURhdGUoZGF0ZSwgbmV3IERhdGUoKSkpXHJcblx0XHRzdHJEYXRlID0gXCJUb2RheVwiO1xyXG5cclxuXHQvLyBUb21vcnJvd1xyXG5cdGVsc2UgaWYoZXhwb3J0cy5pc1NhbWVEYXRlKGRhdGUsIGV4cG9ydHMuZGF5c0Zyb21Ob3coMSkpICYmICFiZWZvcmVOb3cpXHJcblx0XHRzdHJEYXRlID0gXCJUb21vcnJvd1wiO1xyXG5cclxuXHQvLyBkYXkgb2YgdGhlIHdlZWsgKHRoaXMgd2VlaylcclxuXHRlbHNlIGlmKGV4cG9ydHMuaXNTb29uZXJEYXRlKGRhdGUsIGV4cG9ydHMuZGF5c0Zyb21Ob3coNykpICYmICFiZWZvcmVOb3cpXHJcblx0XHRzdHJEYXRlID0gU1RSSU5HX0RBWVNbZGF0ZS5nZXREYXkoKV07XHJcblxyXG5cdC8vIHByaW50IHRoZSBkYXRlXHJcblx0ZWxzZVxyXG5cdCBcdHN0ckRhdGUgPSBgJHtTVFJJTkdfREFZU1tkYXRlLmdldERheSgpXX0gJHtkYXRlLmdldE1vbnRoKCkgKyAxfS8ke2RhdGUuZ2V0RGF0ZSgpfWA7XHJcblxyXG5cdC8vIGFkZCB0aGUgdGltZSBvblxyXG5cdGlmKG9wdHMuaW5jbHVkZVRpbWUgJiYgIWV4cG9ydHMuaXNTa2lwVGltZShkYXRlLCBvcHRzLnNraXBUaW1lcykpIHtcclxuXHRcdHJldHVybiBzdHJEYXRlICsgXCIsIFwiICsgZXhwb3J0cy5zdHJpbmdpZnlUaW1lKGRhdGUpO1xyXG5cdH1cclxuXHJcblx0cmV0dXJuIHN0ckRhdGU7XHJcbn07XHJcblxyXG4vLyBjaGVjayBpZiB0aGlzIGlzIG9uZSBvZiB0aGUgZ2l2ZW4gc2tpcCB0aW1lc1xyXG5leHBvcnRzLmlzU2tpcFRpbWUgPSBmdW5jdGlvbihkYXRlLCBza2lwcyA9IFtdKSB7XHJcblx0cmV0dXJuIHNraXBzLmZpbmQoc2tpcCA9PiB7XHJcblx0XHRyZXR1cm4gc2tpcC5ob3VyID09PSBkYXRlLmdldEhvdXJzKCkgJiYgc2tpcC5taW51dGUgPT09IGRhdGUuZ2V0TWludXRlcygpO1xyXG5cdH0pO1xyXG59O1xyXG5cclxuLy8gY29udmVydCBhIHRpbWUgdG8gYSBzdHJpbmdcclxuZXhwb3J0cy5zdHJpbmdpZnlUaW1lID0gZnVuY3Rpb24oZGF0ZSkge1xyXG5cdHZhciBob3VyID0gZGF0ZS5nZXRIb3VycygpO1xyXG5cclxuXHQvLyBnZXQgdGhlIGFtL3BtIHRpbWVcclxuXHR2YXIgaXNBbSA9IGhvdXIgPCAxMjtcclxuXHJcblx0Ly8gbWlkbmlnaHRcclxuXHRpZihob3VyID09PSAwKSBob3VyID0gMTI7XHJcblx0Ly8gYWZ0ZXIgbm9vblxyXG5cdGlmKGhvdXIgPiAxMikgaG91ciA9IGhvdXIgLSAxMjtcclxuXHJcblx0dmFyIG1pbnV0ZSA9IGRhdGUuZ2V0TWludXRlcygpO1xyXG5cclxuXHQvLyBhZGQgYSBsZWFkaW5nIDBcclxuXHRpZihtaW51dGUgPCAxMCkgbWludXRlID0gXCIwXCIgKyBtaW51dGU7XHJcblxyXG5cdHJldHVybiBob3VyICsgXCI6XCIgKyBtaW51dGUgKyAoaXNBbSA/IFwiYW1cIiA6IFwicG1cIik7XHJcbn1cclxuIiwiLyoqXHJcbiAqIEEgaGVscGVyIGZvciBidWlsZGluZyBkb20gbm9kZXNcclxuICovXHJcblxyXG5jb25zdCBTVkdfRUxFTUVOVFMgPSBbXCJzdmdcIiwgXCJsaW5lXCJdO1xyXG5jb25zdCBTVkdfTkFNRVNQQUNFID0gXCJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2Z1wiO1xyXG5cclxuLy8gYnVpbGQgYSBzaW5nbGUgZG9tIG5vZGVcclxudmFyIG1ha2VEb20gPSBmdW5jdGlvbihvcHRzID0ge30pIHtcclxuXHQvLyBnZXQgb3IgY3JlYXRlIHRoZSBuYW1lIG1hcHBpbmdcclxuXHR2YXIgbWFwcGVkID0gb3B0cy5tYXBwZWQgfHwge307XHJcblxyXG5cdHZhciAkZWw7XHJcblxyXG5cdC8vIHRoZSBlbGVtZW50IGlzIHBhcnQgb2YgdGhlIHN2ZyBuYW1lc3BhY2VcclxuXHRpZihTVkdfRUxFTUVOVFMuaW5kZXhPZihvcHRzLnRhZykgIT09IC0xKSB7XHJcblx0XHQkZWwgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50TlMoU1ZHX05BTUVTUEFDRSwgb3B0cy50YWcpO1xyXG5cdH1cclxuXHQvLyBhIHBsYWluIGVsZW1lbnRcclxuXHRlbHNlIHtcclxuXHRcdCRlbCA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQob3B0cy50YWcgfHwgXCJkaXZcIik7XHJcblx0fVxyXG5cclxuXHQvLyBzZXQgdGhlIGNsYXNzZXNcclxuXHRpZihvcHRzLmNsYXNzZXMpIHtcclxuXHRcdCRlbC5zZXRBdHRyaWJ1dGUoXCJjbGFzc1wiLCB0eXBlb2Ygb3B0cy5jbGFzc2VzID09IFwic3RyaW5nXCIgPyBvcHRzLmNsYXNzZXMgOiBvcHRzLmNsYXNzZXMuam9pbihcIiBcIikpO1xyXG5cdH1cclxuXHJcblx0Ly8gYXR0YWNoIHRoZSBhdHRyaWJ1dGVzXHJcblx0aWYob3B0cy5hdHRycykge1xyXG5cdFx0T2JqZWN0LmdldE93blByb3BlcnR5TmFtZXMob3B0cy5hdHRycylcclxuXHJcblx0XHQuZm9yRWFjaChhdHRyID0+ICRlbC5zZXRBdHRyaWJ1dGUoYXR0ciwgb3B0cy5hdHRyc1thdHRyXSkpO1xyXG5cdH1cclxuXHJcblx0Ly8gc2V0IHRoZSB0ZXh0IGNvbnRlbnRcclxuXHRpZihvcHRzLnRleHQpIHtcclxuXHRcdCRlbC5pbm5lclRleHQgPSBvcHRzLnRleHQ7XHJcblx0fVxyXG5cclxuXHQvLyBhdHRhY2ggdGhlIG5vZGUgdG8gaXRzIHBhcmVudFxyXG5cdGlmKG9wdHMucGFyZW50KSB7XHJcblx0XHRvcHRzLnBhcmVudC5pbnNlcnRCZWZvcmUoJGVsLCBvcHRzLmJlZm9yZSk7XHJcblx0fVxyXG5cclxuXHQvLyBhZGQgZXZlbnQgbGlzdGVuZXJzXHJcblx0aWYob3B0cy5vbikge1xyXG5cdFx0Zm9yKGxldCBuYW1lIG9mIE9iamVjdC5nZXRPd25Qcm9wZXJ0eU5hbWVzKG9wdHMub24pKSB7XHJcblx0XHRcdCRlbC5hZGRFdmVudExpc3RlbmVyKG5hbWUsIG9wdHMub25bbmFtZV0pO1xyXG5cclxuXHRcdFx0Ly8gYXR0YWNoIHRoZSBkb20gdG8gYSBkaXNwb3NhYmxlXHJcblx0XHRcdGlmKG9wdHMuZGlzcCkge1xyXG5cdFx0XHRcdG9wdHMuZGlzcC5hZGQoe1xyXG5cdFx0XHRcdFx0dW5zdWJzY3JpYmU6ICgpID0+ICRlbC5yZW1vdmVFdmVudExpc3RlbmVyKG5hbWUsIG9wdHMub25bbmFtZV0pXHJcblx0XHRcdFx0fSk7XHJcblx0XHRcdH1cclxuXHRcdH1cclxuXHR9XHJcblxyXG5cdC8vIHNldCB0aGUgdmFsdWUgb2YgYW4gaW5wdXQgZWxlbWVudFxyXG5cdGlmKG9wdHMudmFsdWUpIHtcclxuXHRcdCRlbC52YWx1ZSA9IG9wdHMudmFsdWU7XHJcblx0fVxyXG5cclxuXHQvLyBhZGQgdGhlIG5hbWUgbWFwcGluZ1xyXG5cdGlmKG9wdHMubmFtZSkge1xyXG5cdFx0bWFwcGVkW29wdHMubmFtZV0gPSAkZWw7XHJcblx0fVxyXG5cclxuXHQvLyBjcmVhdGUgdGhlIGNoaWxkIGRvbSBub2Rlc1xyXG5cdGlmKG9wdHMuY2hpbGRyZW4pIHtcclxuXHRcdGZvcihsZXQgY2hpbGQgb2Ygb3B0cy5jaGlsZHJlbikge1xyXG5cdFx0XHQvLyBtYWtlIGFuIGFycmF5IGludG8gYSBncm91cCBPYmplY3RcclxuXHRcdFx0aWYoQXJyYXkuaXNBcnJheShjaGlsZCkpIHtcclxuXHRcdFx0XHRjaGlsZCA9IHtcclxuXHRcdFx0XHRcdGdyb3VwOiBjaGlsZFxyXG5cdFx0XHRcdH07XHJcblx0XHRcdH1cclxuXHJcblx0XHRcdC8vIGF0dGFjaCBpbmZvcm1hdGlvbiBmb3IgdGhlIGdyb3VwXHJcblx0XHRcdGNoaWxkLnBhcmVudCA9ICRlbDtcclxuXHRcdFx0Y2hpbGQuZGlzcCA9IG9wdHMuZGlzcDtcclxuXHRcdFx0Y2hpbGQubWFwcGVkID0gbWFwcGVkO1xyXG5cclxuXHRcdFx0Ly8gYnVpbGQgdGhlIG5vZGUgb3IgZ3JvdXBcclxuXHRcdFx0bWFrZShjaGlsZCk7XHJcblx0XHR9XHJcblx0fVxyXG5cclxuXHRyZXR1cm4gbWFwcGVkO1xyXG59XHJcblxyXG4vLyBidWlsZCBhIGdyb3VwIG9mIGRvbSBub2Rlc1xyXG52YXIgbWFrZUdyb3VwID0gZnVuY3Rpb24oZ3JvdXApIHtcclxuXHQvLyBzaG9ydGhhbmQgZm9yIGEgZ3JvdXBzXHJcblx0aWYoQXJyYXkuaXNBcnJheShncm91cCkpIHtcclxuXHRcdGdyb3VwID0ge1xyXG5cdFx0XHRjaGlsZHJlbjogZ3JvdXBcclxuXHRcdH07XHJcblx0fVxyXG5cclxuXHQvLyBnZXQgb3IgY3JlYXRlIHRoZSBuYW1lIG1hcHBpbmdcclxuXHR2YXIgbWFwcGVkID0ge307XHJcblxyXG5cdGZvcihsZXQgbm9kZSBvZiBncm91cC5ncm91cCkge1xyXG5cdFx0Ly8gY29weSBvdmVyIHByb3BlcnRpZXMgZnJvbSB0aGUgZ3JvdXBcclxuXHRcdG5vZGUucGFyZW50IHx8IChub2RlLnBhcmVudCA9IGdyb3VwLnBhcmVudCk7XHJcblx0XHRub2RlLmRpc3AgfHwgKG5vZGUuZGlzcCA9IGdyb3VwLmRpc3ApO1xyXG5cdFx0bm9kZS5tYXBwZWQgPSBtYXBwZWQ7XHJcblxyXG5cdFx0Ly8gbWFrZSB0aGUgZG9tXHJcblx0XHRtYWtlKG5vZGUpO1xyXG5cdH1cclxuXHJcblx0Ly8gY2FsbCB0aGUgY2FsbGJhY2sgd2l0aCB0aGUgbWFwcGVkIG5hbWVzXHJcblx0aWYoZ3JvdXAuYmluZCkge1xyXG5cdFx0dmFyIHN1YnNjcmlwdGlvbiA9IGdyb3VwLmJpbmQobWFwcGVkKTtcclxuXHJcblx0XHQvLyBpZiB0aGUgcmV0dXJuIGEgc3Vic2NyaXB0aW9uIGF0dGFjaCBpdCB0byB0aGUgZGlzcG9zYWJsZVxyXG5cdFx0aWYoc3Vic2NyaXB0aW9uICYmIGdyb3VwLmRpc3ApIHtcclxuXHRcdFx0Z3JvdXAuZGlzcC5hZGQoc3Vic2NyaXB0aW9uKTtcclxuXHRcdH1cclxuXHR9XHJcblxyXG5cdHJldHVybiBtYXBwZWQ7XHJcbn07XHJcblxyXG4vLyBhIGNvbGxlY3Rpb24gb2Ygd2lkZ2V0c1xyXG52YXIgd2lkZ2V0cyA9IHt9O1xyXG5cclxudmFyIG1ha2UgPSBtb2R1bGUuZXhwb3J0cyA9IGZ1bmN0aW9uKG9wdHMpIHtcclxuXHQvLyBoYW5kbGUgYSBncm91cFxyXG5cdGlmKEFycmF5LmlzQXJyYXkob3B0cykgfHwgb3B0cy5ncm91cCkge1xyXG5cdFx0cmV0dXJuIG1ha2VHcm91cChvcHRzKTtcclxuXHR9XHJcblx0Ly8gbWFrZSBhIHdpZGdldFxyXG5cdGVsc2UgaWYob3B0cy53aWRnZXQpIHtcclxuXHRcdHZhciB3aWRnZXQgPSB3aWRnZXRzW29wdHMud2lkZ2V0XTtcclxuXHJcblx0XHQvLyBub3QgZGVmaW5lZFxyXG5cdFx0aWYoIXdpZGdldCkge1xyXG5cdFx0XHR0aHJvdyBuZXcgRXJyb3IoYFdpZGdldCAnJHtvcHRzLndpZGdldH0nIGlzIG5vdCBkZWZpbmVkIG1ha2Ugc3VyZSBpdHMgYmVlbiBpbXBvcnRlZGApO1xyXG5cdFx0fVxyXG5cclxuXHRcdC8vIGdlbmVyYXRlIHRoZSB3aWRnZXQgY29udGVudFxyXG5cdFx0dmFyIGJ1aWx0ID0gd2lkZ2V0Lm1ha2Uob3B0cyk7XHJcblxyXG5cdFx0cmV0dXJuIG1ha2VHcm91cCh7XHJcblx0XHRcdHBhcmVudDogb3B0cy5wYXJlbnQsXHJcblx0XHRcdGRpc3A6IG9wdHMuZGlzcCxcclxuXHRcdFx0Z3JvdXA6IEFycmF5LmlzQXJyYXkoYnVpbHQpID8gYnVpbHQgOiBbYnVpbHRdLFxyXG5cdFx0XHRiaW5kOiB3aWRnZXQuYmluZCAmJiB3aWRnZXQuYmluZC5iaW5kKHdpZGdldCwgb3B0cylcclxuXHRcdH0pO1xyXG5cdH1cclxuXHQvLyBtYWtlIGEgc2luZ2xlIG5vZGVcclxuXHRlbHNlIHtcclxuXHRcdHJldHVybiBtYWtlRG9tKG9wdHMpO1xyXG5cdH1cclxufTtcclxuXHJcbi8vIHJlZ2lzdGVyIGEgd2lkZ2V0XHJcbm1ha2UucmVnaXN0ZXIgPSBmdW5jdGlvbihuYW1lLCB3aWRnZXQpIHtcclxuXHR3aWRnZXRzW25hbWVdID0gd2lkZ2V0O1xyXG59O1xyXG4iLCIvKipcclxuICogQSB2aWV3IGZvciBhY2Nlc3NpbmcvbW9kaWZ5aW5nIGluZm9ybWF0aW9uIGFib3V0IHRoZSBjdXJyZW50IHVzZXJcclxuICovXHJcblxyXG52YXIge2dlbkJhY2t1cE5hbWV9ID0gcmVxdWlyZShcIi4uLy4uL2NvbW1vbi9iYWNrdXBcIik7XHJcblxyXG5saWZlTGluZS5uYXYucmVnaXN0ZXIoe1xyXG5cdG1hdGNoZXI6IC9eKD86XFwvdXNlclxcLyguKz8pfFxcL2FjY291bnQpJC8sXHJcblxyXG5cdG1ha2Uoe3NldFRpdGxlLCBjb250ZW50LCBtYXRjaH0pIHtcclxuXHRcdHNldFRpdGxlKFwiQWNjb3VudFwiKTtcclxuXHJcblx0XHR2YXIgdXJsID0gXCIvYXBpL2F1dGgvaW5mby9nZXRcIjtcclxuXHJcblx0XHQvLyBhZGQgdGhlIHVzZXJuYW1lIGlmIG9uZSBpcyBnaXZlblxyXG5cdFx0aWYobWF0Y2hbMV0pIHVybCArPSBgP3VzZXJuYW1lPSR7bWF0Y2hbMV19YDtcclxuXHJcblx0XHQvLyBsb2FkIHRoZSB1c2VyIGRhdGFcclxuXHRcdGZldGNoKHVybCwgeyBjcmVkZW50aWFsczogXCJpbmNsdWRlXCIgfSlcclxuXHJcblx0XHQudGhlbihyZXMgPT4gcmVzLmpzb24oKSlcclxuXHJcblx0XHQudGhlbihyZXMgPT4ge1xyXG5cdFx0XHQvLyBubyBzdWNoIHVzZXIgb3IgYWNjZXNzIGlzIGRlbmllZFxyXG5cdFx0XHRpZihyZXMuc3RhdHVzID09IFwiZmFpbFwiKSB7XHJcblx0XHRcdFx0bGlmZUxpbmUubWFrZURvbSh7XHJcblx0XHRcdFx0XHRwYXJlbnQ6IGNvbnRlbnQsXHJcblx0XHRcdFx0XHRjbGFzc2VzOiBcImNvbnRlbnQtcGFkZGVkXCIsXHJcblx0XHRcdFx0XHR0ZXh0OiBcIkNvdWxkIG5vdCBhY2Nlc3MgdGhlIHVzZXIgeW91IHdlcmUgbG9va2luZyBmb3JcIlxyXG5cdFx0XHRcdH0pO1xyXG5cclxuXHRcdFx0XHRyZXR1cm47XHJcblx0XHRcdH1cclxuXHJcblx0XHRcdHZhciB1c2VyID0gcmVzLmRhdGE7XHJcblxyXG5cdFx0XHQvLyBnZW5lcmF0ZSB0aGUgcGFnZVxyXG5cdFx0XHR2YXIgY2hpbGRyZW4gPSBbXTtcclxuXHJcblx0XHRcdGNoaWxkcmVuLnB1c2goe1xyXG5cdFx0XHRcdHRhZzogXCJoMlwiLFxyXG5cdFx0XHRcdHRleHQ6IHVzZXIudXNlcm5hbWVcclxuXHRcdFx0fSk7XHJcblxyXG5cdFx0XHQvLyBkaXNwbGF5IHRoZSBhZG1pbiBzdGF0dXMgb2YgYW5vdGhlciB1c2VyXHJcblx0XHRcdGlmKG1hdGNoWzFdKSB7XHJcblx0XHRcdFx0Y2hpbGRyZW4ucHVzaCh7XHJcblx0XHRcdFx0XHR0ZXh0OiBgJHt1c2VyLnVzZXJuYW1lfSBpcyAke3VzZXIuYWRtaW4gPyBcIlwiIDogXCJub3RcIn0gYW4gYWRtaW5gXHJcblx0XHRcdFx0fSk7XHJcblx0XHRcdH1cclxuXHRcdFx0Ly8gZGlzcGxheSB0aGUgYWRtaW4gc3RhdHVzIG9mIHRoaXMgdXNlclxyXG5cdFx0XHRlbHNlIHtcclxuXHRcdFx0XHRjaGlsZHJlbi5wdXNoKHtcclxuXHRcdFx0XHRcdHRleHQ6IGBZb3UgYXJlICR7dXNlci5hZG1pbiA/IFwiXCIgOiBcIm5vdFwifSBhbiBhZG1pbmBcclxuXHRcdFx0XHR9KTtcclxuXHJcblx0XHRcdFx0Ly8gYWRkIGEgbGluayBhdCBhIGxpc3Qgb2YgYWxsIHVzZXJzXHJcblx0XHRcdFx0aWYodXNlci5hZG1pbikge1xyXG5cdFx0XHRcdFx0Y2hpbGRyZW4ucHVzaCh7IHRhZzogXCJiclwiIH0pO1xyXG5cclxuXHRcdFx0XHRcdGNoaWxkcmVuLnB1c2goe1xyXG5cdFx0XHRcdFx0XHR3aWRnZXQ6IFwibGlua1wiLFxyXG5cdFx0XHRcdFx0XHRocmVmOiBcIi91c2Vyc1wiLFxyXG5cdFx0XHRcdFx0XHR0ZXh0OiBcIlZpZXcgYWxsIHVzZXJzXCJcclxuXHRcdFx0XHRcdH0pO1xyXG5cdFx0XHRcdH1cclxuXHRcdFx0fVxyXG5cclxuXHRcdFx0Ly8gY3JlYXRlIGEgYmFja3VwIGxpbmtcclxuXHRcdFx0aWYoIW1hdGNoWzFdKSB7XHJcblx0XHRcdFx0Y2hpbGRyZW4ucHVzaCh7IHRhZzogXCJiclwiIH0pO1xyXG5cdFx0XHRcdGNoaWxkcmVuLnB1c2goeyB0YWc6IFwiYnJcIiB9KTtcclxuXHJcblx0XHRcdFx0Y2hpbGRyZW4ucHVzaCh7XHJcblx0XHRcdFx0XHR0YWc6IFwiYVwiLFxyXG5cdFx0XHRcdFx0dGV4dDogXCJEb3dubG9hZCBiYWNrdXBcIixcclxuXHRcdFx0XHRcdGF0dHJzOiB7XHJcblx0XHRcdFx0XHRcdGhyZWY6IFwiL2FwaS9iYWNrdXBcIixcclxuXHRcdFx0XHRcdFx0ZG93bmxvYWQ6IGdlbkJhY2t1cE5hbWUoKVxyXG5cdFx0XHRcdFx0fVxyXG5cdFx0XHRcdH0pO1xyXG5cdFx0XHR9XHJcblxyXG5cdFx0XHR2YXIgcGFzc3dvcmRDaGFuZ2UgPSB7fTtcclxuXHJcblx0XHRcdGNoaWxkcmVuLnB1c2goe1xyXG5cdFx0XHRcdHRhZzogXCJmb3JtXCIsXHJcblx0XHRcdFx0Y2hpbGRyZW46IFtcclxuXHRcdFx0XHRcdHtcclxuXHRcdFx0XHRcdFx0Y2xhc3NlczogXCJlZGl0b3Itcm93XCIsXHJcblx0XHRcdFx0XHRcdGNoaWxkcmVuOiBbXHJcblx0XHRcdFx0XHRcdFx0e1xyXG5cdFx0XHRcdFx0XHRcdFx0d2lkZ2V0OiBcImlucHV0XCIsXHJcblx0XHRcdFx0XHRcdFx0XHR0eXBlOiBcInBhc3N3b3JkXCIsXHJcblx0XHRcdFx0XHRcdFx0XHRwbGFjZWhvbGRlcjogXCJPbGQgcGFzc3dvcmRcIixcclxuXHRcdFx0XHRcdFx0XHRcdGJpbmQ6IHBhc3N3b3JkQ2hhbmdlLFxyXG5cdFx0XHRcdFx0XHRcdFx0cHJvcDogXCJvbGRQYXNzd29yZFwiXHJcblx0XHRcdFx0XHRcdFx0fSxcclxuXHRcdFx0XHRcdFx0XHR7XHJcblx0XHRcdFx0XHRcdFx0XHR3aWRnZXQ6IFwiaW5wdXRcIixcclxuXHRcdFx0XHRcdFx0XHRcdHR5cGU6IFwicGFzc3dvcmRcIixcclxuXHRcdFx0XHRcdFx0XHRcdHBsYWNlaG9sZGVyOiBcIk5ldyBwYXNzd29yZFwiLFxyXG5cdFx0XHRcdFx0XHRcdFx0YmluZDogcGFzc3dvcmRDaGFuZ2UsXHJcblx0XHRcdFx0XHRcdFx0XHRwcm9wOiBcInBhc3N3b3JkXCJcclxuXHRcdFx0XHRcdFx0XHR9XHJcblx0XHRcdFx0XHRcdF1cclxuXHRcdFx0XHRcdH0sXHJcblx0XHRcdFx0XHR7XHJcblx0XHRcdFx0XHRcdHRhZzogXCJidXR0b25cIixcclxuXHRcdFx0XHRcdFx0Y2xhc3NlczogXCJmYW5jeS1idXR0b25cIixcclxuXHRcdFx0XHRcdFx0dGV4dDogXCJDaGFuZ2UgcGFzc3dvcmRcIixcclxuXHRcdFx0XHRcdFx0YXR0cnM6IHtcclxuXHRcdFx0XHRcdFx0XHR0eXBlOiBcInN1Ym1pdFwiXHJcblx0XHRcdFx0XHRcdH1cclxuXHRcdFx0XHRcdH0sXHJcblx0XHRcdFx0XHR7XHJcblx0XHRcdFx0XHRcdG5hbWU6IFwibXNnXCJcclxuXHRcdFx0XHRcdH1cclxuXHRcdFx0XHRdLFxyXG5cdFx0XHRcdG9uOiB7XHJcblx0XHRcdFx0XHQvLyBjaGFuZ2UgdGhlIHBhc3N3b3JkXHJcblx0XHRcdFx0XHRzdWJtaXQ6IGUgPT4ge1xyXG5cdFx0XHRcdFx0XHRlLnByZXZlbnREZWZhdWx0KCk7XHJcblxyXG5cdFx0XHRcdFx0XHQvLyBubyBwYXNzd29yZCBzdXBwbGllZFxyXG5cdFx0XHRcdFx0XHRpZighcGFzc3dvcmRDaGFuZ2UucGFzc3dvcmQpIHtcclxuXHRcdFx0XHRcdFx0XHRzaG93TXNnKFwiRW50ZXIgYSBuZXcgcGFzc3dvcmRcIik7XHJcblx0XHRcdFx0XHRcdFx0cmV0dXJuO1xyXG5cdFx0XHRcdFx0XHR9XHJcblxyXG5cdFx0XHRcdFx0XHQvLyBzZW5kIHRoZSBwYXNzd29yZCBjaGFuZ2UgcmVxdWVzdFxyXG5cdFx0XHRcdFx0XHRmZXRjaChgL2FwaS9hdXRoL2luZm8vc2V0P3VzZXJuYW1lPSR7dXNlci51c2VybmFtZX1gLCB7XHJcblx0XHRcdFx0XHRcdFx0Y3JlZGVudGlhbHM6IFwiaW5jbHVkZVwiLFxyXG5cdFx0XHRcdFx0XHRcdG1ldGhvZDogXCJQT1NUXCIsXHJcblx0XHRcdFx0XHRcdFx0Ym9keTogSlNPTi5zdHJpbmdpZnkocGFzc3dvcmRDaGFuZ2UpXHJcblx0XHRcdFx0XHRcdH0pXHJcblxyXG5cdFx0XHRcdFx0XHQudGhlbihyZXMgPT4gcmVzLmpzb24oKSlcclxuXHJcblx0XHRcdFx0XHRcdC50aGVuKHJlcyA9PiB7XHJcblx0XHRcdFx0XHRcdFx0Ly8gcGFzc3dvcmQgY2hhbmdlIGZhaWxlZFxyXG5cdFx0XHRcdFx0XHRcdGlmKHJlcy5zdGF0dXMgPT0gXCJmYWlsXCIpIHtcclxuXHRcdFx0XHRcdFx0XHRcdHNob3dNc2cocmVzLmRhdGEubXNnKTtcclxuXHRcdFx0XHRcdFx0XHR9XHJcblxyXG5cdFx0XHRcdFx0XHRcdGlmKHJlcy5zdGF0dXMgPT0gXCJzdWNjZXNzXCIpIHtcclxuXHRcdFx0XHRcdFx0XHRcdHNob3dNc2coXCJQYXNzd29yZCBjaGFuZ2VkXCIpO1xyXG5cdFx0XHRcdFx0XHRcdH1cclxuXHRcdFx0XHRcdFx0fSk7XHJcblx0XHRcdFx0XHR9XHJcblx0XHRcdFx0fVxyXG5cdFx0XHR9KTtcclxuXHJcblx0XHRcdGNoaWxkcmVuLnB1c2goeyB0YWc6IFwiYnJcIiB9KTtcclxuXHRcdFx0Y2hpbGRyZW4ucHVzaCh7IHRhZzogXCJiclwiIH0pO1xyXG5cclxuXHRcdFx0Ly8gb25seSBkaXNwbGF5IHRoZSBsb2dvdXQgYnV0dG9uIGlmIHdlIGFyZSBvbiB0aGUgL2FjY291bnQgcGFnZVxyXG5cdFx0XHRpZighbWF0Y2hbMV0pIHtcclxuXHRcdFx0XHRjaGlsZHJlbi5wdXNoKHtcclxuXHRcdFx0XHRcdHRhZzogXCJidXR0b25cIixcclxuXHRcdFx0XHRcdGNsYXNzZXM6IFwiZmFuY3ktYnV0dG9uXCIsXHJcblx0XHRcdFx0XHR0ZXh0OiBcIkxvZ291dFwiLFxyXG5cdFx0XHRcdFx0b246IHtcclxuXHRcdFx0XHRcdFx0Y2xpY2s6ICgpID0+IHtcclxuXHRcdFx0XHRcdFx0XHQvLyBzZW5kIHRoZSBsb2dvdXQgcmVxdWVzdFxyXG5cdFx0XHRcdFx0XHRcdGZldGNoKFwiL2FwaS9hdXRoL2xvZ291dFwiLCB7IGNyZWRlbnRpYWxzOiBcImluY2x1ZGVcIiB9KVxyXG5cclxuXHRcdFx0XHRcdFx0XHQvLyByZXR1cm4gdG8gdGhlIGxvZ2luIHBhZ2VcclxuXHRcdFx0XHRcdFx0XHQudGhlbigoKSA9PiBsaWZlTGluZS5uYXYubmF2aWdhdGUoXCIvbG9naW5cIikpO1xyXG5cdFx0XHRcdFx0XHR9XHJcblx0XHRcdFx0XHR9XHJcblx0XHRcdFx0fSk7XHJcblx0XHRcdH1cclxuXHJcblx0XHRcdHZhciB7bXNnfSA9IGxpZmVMaW5lLm1ha2VEb20oe1xyXG5cdFx0XHRcdHBhcmVudDogY29udGVudCxcclxuXHRcdFx0XHRjbGFzc2VzOiBcImNvbnRlbnQtcGFkZGVkXCIsXHJcblx0XHRcdFx0Y2hpbGRyZW5cclxuXHRcdFx0fSk7XHJcblxyXG5cdFx0XHQvLyBzaG93IGEgbWVzc2FnZVxyXG5cdFx0XHR2YXIgc2hvd01zZyA9IGZ1bmN0aW9uKHRleHQpIHtcclxuXHRcdFx0XHRtc2cuaW5uZXJUZXh0ID0gdGV4dDtcclxuXHRcdFx0fTtcclxuXHRcdH0pXHJcblx0fVxyXG59KTtcclxuIiwiLyoqXHJcbiAqIEVkaXQgYW4gYXNzaWduZW1udFxyXG4gKi9cclxuXHJcbnZhciB7ZGF5c0Zyb21Ob3csIHN0cmluZ2lmeURhdGV9ID0gcmVxdWlyZShcIi4uL3V0aWwvZGF0ZVwiKTtcclxudmFyIHthc3NpZ25tZW50c30gPSByZXF1aXJlKFwiLi4vZGF0YS1zdG9yZXNcIik7O1xyXG5cclxubGlmZUxpbmUubmF2LnJlZ2lzdGVyKHtcclxuXHRtYXRjaGVyOiAvXlxcL2VkaXRcXC8oLis/KSQvLFxyXG5cclxuXHRtYWtlKHttYXRjaCwgY29udGVudCwgc2V0VGl0bGUsIGRpc3Bvc2FibGV9KSB7XHJcblx0XHR2YXIgYWN0aW9uU3ViLCBkZWxldGVTdWI7XHJcblxyXG5cdFx0Ly8gaWYgd2UgbWFrZSBhIGNoYW5nZSBkb24ndCByZWZyZXNoIHRoZSBwYWdlXHJcblx0XHR2YXIgZGVib3VuY2U7XHJcblxyXG5cdFx0dmFyIGNoYW5nZVN1YiA9IGFzc2lnbm1lbnRzLnF1ZXJ5KHsgaWQ6IG1hdGNoWzFdIH0sIGZ1bmN0aW9uKFtpdGVtXSkge1xyXG5cdFx0XHQvLyBpZiB3ZSBtYWtlIGEgY2hhbmdlIGRvbid0IHJlZnJlc2ggdGhlIHBhZ2VcclxuXHRcdFx0aWYoZGVib3VuY2UpIHtcclxuXHRcdFx0XHRkZWJvdW5jZSA9IGZhbHNlO1xyXG5cclxuXHRcdFx0XHRyZXR1cm47XHJcblx0XHRcdH1cclxuXHJcblx0XHRcdC8vIGNsZWFyIHRoZSBjb250ZW50XHJcblx0XHRcdGNvbnRlbnQuaW5uZXJIVE1MID0gXCJcIjtcclxuXHJcblx0XHRcdC8vIHJlbW92ZSB0aGUgcHJldmlvdXMgYWN0aW9uXHJcblx0XHRcdGlmKGFjdGlvblN1Yikge1xyXG5cdFx0XHRcdGFjdGlvblN1Yi51bnN1YnNjcmliZSgpO1xyXG5cdFx0XHRcdGRlbGV0ZVN1Yi51bnN1YnNjcmliZSgpO1xyXG5cdFx0XHR9XHJcblxyXG5cdFx0XHQvLyBhZGQgYSBidXR0b24gYmFjayB0byB0aGUgdmlld1xyXG5cdFx0XHRpZihpdGVtKSB7XHJcblx0XHRcdFx0YWN0aW9uU3ViID0gbGlmZUxpbmUuYWRkQWN0aW9uKFwiVmlld1wiLCAoKSA9PiBsaWZlTGluZS5uYXYubmF2aWdhdGUoXCIvaXRlbS9cIiArIGl0ZW0uaWQpKTtcclxuXHJcblx0XHRcdFx0ZGVsZXRlU3ViID0gbGlmZUxpbmUuYWRkQWN0aW9uKFwiRGVsZXRlXCIsICgpID0+IHtcclxuXHRcdFx0XHRcdC8vIHJlbW92ZSB0aGUgaXRlbVxyXG5cdFx0XHRcdFx0YXNzaWdubWVudHMucmVtb3ZlKGl0ZW0uaWQpO1xyXG5cclxuXHRcdFx0XHRcdC8vIG5hdmlnYXRlIGF3YXlcclxuXHRcdFx0XHRcdGxpZmVMaW5lLm5hdi5uYXZpZ2F0ZShcIi9cIik7XHJcblx0XHRcdFx0fSk7XHJcblx0XHRcdH1cclxuXHJcblx0XHRcdC8vIGlmIHRoZSBpdGVtIGRvZXMgbm90IGV4aXN0IGNyZWF0ZSBpdFxyXG5cdFx0XHRpZighaXRlbSkge1xyXG5cdFx0XHRcdGl0ZW0gPSB7XHJcblx0XHRcdFx0XHRuYW1lOiBcIlVubmFtZWQgaXRlbVwiLFxyXG5cdFx0XHRcdFx0Y2xhc3M6IFwiQ2xhc3NcIixcclxuXHRcdFx0XHRcdGRhdGU6IGdlbkRhdGUoKSxcclxuXHRcdFx0XHRcdGlkOiBtYXRjaFsxXSxcclxuXHRcdFx0XHRcdGRlc2NyaXB0aW9uOiBcIlwiLFxyXG5cdFx0XHRcdFx0bW9kaWZpZWQ6IERhdGUubm93KCksXHJcblx0XHRcdFx0XHR0eXBlOiBcImFzc2lnbm1lbnRcIixcclxuXHRcdFx0XHRcdGRvbmU6IGZhbHNlXHJcblx0XHRcdFx0fTtcclxuXHRcdFx0fVxyXG5cclxuXHRcdFx0Ly8gc2V0IHRoZSBpbml0YWwgdGl0bGVcclxuXHRcdFx0c2V0VGl0bGUoXCJFZGl0aW5nXCIpO1xyXG5cclxuXHRcdFx0Ly8gc2F2ZSBjaGFuZ2VzXHJcblx0XHRcdHZhciBjaGFuZ2UgPSAoKSA9PiB7XHJcblx0XHRcdFx0Ly8gdXBkYXRlIHRoZSBtb2RpZmllZCBkYXRlXHJcblx0XHRcdFx0aXRlbS5tb2RpZmllZCA9IERhdGUubm93KCk7XHJcblxyXG5cdFx0XHRcdC8vIGZpbmQgdGhlIGRhdGUgYW5kIHRpbWUgaW5wdXRzXHJcblx0XHRcdFx0dmFyIGRhdGVJbnB1dCA9IGRvY3VtZW50LnF1ZXJ5U2VsZWN0b3IoXCJpbnB1dFt0eXBlPWRhdGVdXCIpO1xyXG5cdFx0XHRcdHZhciB0aW1lSW5wdXQgPSBkb2N1bWVudC5xdWVyeVNlbGVjdG9yKFwiaW5wdXRbdHlwZT10aW1lXVwiKTtcclxuXHJcblx0XHRcdFx0Ly8gcGFyc2UgdGhlIGRhdGVcclxuXHRcdFx0XHRpdGVtLmRhdGUgPSBuZXcgRGF0ZShkYXRlSW5wdXQudmFsdWUgKyBcIiBcIiArIHRpbWVJbnB1dC52YWx1ZSk7XHJcblxyXG5cdFx0XHRcdC8vIHJlbW92ZSBhc3NpZ25lbW50IGZpZWxkcyBmcm9tIHRhc2tzXHJcblx0XHRcdFx0aWYoaXRlbS50eXBlID09IFwidGFza1wiKSB7XHJcblx0XHRcdFx0XHRkZWxldGUgaXRlbS5kYXRlO1xyXG5cdFx0XHRcdFx0ZGVsZXRlIGl0ZW0uY2xhc3M7XHJcblx0XHRcdFx0fVxyXG5cclxuXHRcdFx0XHQvLyBhZGQgYSBidXR0b24gYmFjayB0byB0aGUgdmlld1xyXG5cdFx0XHRcdGlmKCFhY3Rpb25TdWIpIHtcclxuXHRcdFx0XHRcdGFjdGlvblN1YiA9IGxpZmVMaW5lLmFkZEFjdGlvbihcIlZpZXdcIiwgKCkgPT4gbGlmZUxpbmUubmF2Lm5hdmlnYXRlKFwiL2l0ZW0vXCIgKyBpdGVtLmlkKSk7XHJcblxyXG5cdFx0XHRcdFx0ZGVsZXRlU3ViID0gbGlmZUxpbmUuYWRkQWN0aW9uKFwiRGVsZXRlXCIsICgpID0+IHtcclxuXHRcdFx0XHRcdFx0Ly8gcmVtb3ZlIHRoZSBpdGVtXHJcblx0XHRcdFx0XHRcdGFzc2lnbm1lbnRzLnJlbW92ZShpdGVtLmlkKTtcclxuXHJcblx0XHRcdFx0XHRcdC8vIG5hdmlnYXRlIGF3YXlcclxuXHRcdFx0XHRcdFx0bGlmZUxpbmUubmF2Lm5hdmlnYXRlKFwiL1wiKTtcclxuXHRcdFx0XHRcdH0pO1xyXG5cdFx0XHRcdH1cclxuXHJcblx0XHRcdFx0ZGVib3VuY2UgPSB0cnVlO1xyXG5cclxuXHRcdFx0XHQvLyBzYXZlIHRoZSBjaGFuZ2VzXHJcblx0XHRcdFx0YXNzaWdubWVudHMuc2V0KGl0ZW0pO1xyXG5cdFx0XHR9O1xyXG5cclxuXHRcdFx0Ly8gaGlkZSBhbmQgc2hvdyBzcGVjaWZpYyBmaWVsZHMgZm9yIGRpZmZlcmVudCBhc3NpZ25tZW50IHR5cGVzXHJcblx0XHRcdHZhciB0b2dnbGVGaWVsZHMgPSAoKSA9PiB7XHJcblx0XHRcdFx0aWYoaXRlbS50eXBlID09IFwidGFza1wiKSB7XHJcblx0XHRcdFx0XHRtYXBwZWQuY2xhc3NGaWVsZC5zdHlsZS5kaXNwbGF5ID0gXCJub25lXCI7XHJcblx0XHRcdFx0XHRtYXBwZWQuZGF0ZUZpZWxkLnN0eWxlLmRpc3BsYXkgPSBcIm5vbmVcIjtcclxuXHRcdFx0XHR9XHJcblx0XHRcdFx0ZWxzZSB7XHJcblx0XHRcdFx0XHRtYXBwZWQuY2xhc3NGaWVsZC5zdHlsZS5kaXNwbGF5ID0gXCJcIjtcclxuXHRcdFx0XHRcdG1hcHBlZC5kYXRlRmllbGQuc3R5bGUuZGlzcGxheSA9IFwiXCI7XHJcblx0XHRcdFx0fVxyXG5cclxuXHRcdFx0XHQvLyBmaWxsIGluIGRhdGUgaWYgaXQgaXMgbWlzc2luZ1xyXG5cdFx0XHRcdGlmKCFpdGVtLmRhdGUpIHtcclxuXHRcdFx0XHRcdGl0ZW0uZGF0ZSA9IGdlbkRhdGUoKTtcclxuXHRcdFx0XHR9XHJcblxyXG5cdFx0XHRcdGlmKCFpdGVtLmNsYXNzKSB7XHJcblx0XHRcdFx0XHRpdGVtLmNsYXNzID0gXCJDbGFzc1wiO1xyXG5cdFx0XHRcdH1cclxuXHRcdFx0fTtcclxuXHJcblx0XHRcdC8vIHJlbmRlciB0aGUgdWlcclxuXHRcdFx0dmFyIG1hcHBlZCA9IGxpZmVMaW5lLm1ha2VEb20oe1xyXG5cdFx0XHRcdHBhcmVudDogY29udGVudCxcclxuXHRcdFx0XHRncm91cDogW1xyXG5cdFx0XHRcdFx0e1xyXG5cdFx0XHRcdFx0XHRjbGFzc2VzOiBcImVkaXRvci1yb3dcIixcclxuXHRcdFx0XHRcdFx0Y2hpbGRyZW46IFtcclxuXHRcdFx0XHRcdFx0XHR7XHJcblx0XHRcdFx0XHRcdFx0XHR3aWRnZXQ6IFwiaW5wdXRcIixcclxuXHRcdFx0XHRcdFx0XHRcdGJpbmQ6IGl0ZW0sXHJcblx0XHRcdFx0XHRcdFx0XHRwcm9wOiBcIm5hbWVcIixcclxuXHRcdFx0XHRcdFx0XHRcdGNoYW5nZVxyXG5cdFx0XHRcdFx0XHRcdH1cclxuXHRcdFx0XHRcdFx0XVxyXG5cdFx0XHRcdFx0fSxcclxuXHRcdFx0XHRcdHtcclxuXHRcdFx0XHRcdFx0Y2xhc3NlczogXCJlZGl0b3Itcm93XCIsXHJcblx0XHRcdFx0XHRcdGNoaWxkcmVuOiBbXHJcblx0XHRcdFx0XHRcdFx0e1xyXG5cdFx0XHRcdFx0XHRcdFx0d2lkZ2V0OiBcInRvZ2dsZS1idG5zXCIsXHJcblx0XHRcdFx0XHRcdFx0XHRidG5zOiBbXHJcblx0XHRcdFx0XHRcdFx0XHRcdHsgdGV4dDogXCJBc3NpZ25tZW50XCIsIHZhbHVlOiBcImFzc2lnbm1lbnRcIiB9LFxyXG5cdFx0XHRcdFx0XHRcdFx0XHR7IHRleHQ6IFwiVGFza1wiLCB2YWx1ZTogXCJ0YXNrXCIgfSxcclxuXHRcdFx0XHRcdFx0XHRcdF0sXHJcblx0XHRcdFx0XHRcdFx0XHR2YWx1ZTogaXRlbS50eXBlLFxyXG5cdFx0XHRcdFx0XHRcdFx0Y2hhbmdlOiB0eXBlID0+IHtcclxuXHRcdFx0XHRcdFx0XHRcdFx0Ly8gdXBkYXRlIHRoZSBpdGVtIHR5cGVcclxuXHRcdFx0XHRcdFx0XHRcdFx0aXRlbS50eXBlID0gdHlwZTtcclxuXHJcblx0XHRcdFx0XHRcdFx0XHRcdC8vIGhpZGUvc2hvdyBzcGVjaWZpYyBmaWVsZHNcclxuXHRcdFx0XHRcdFx0XHRcdFx0dG9nZ2xlRmllbGRzKCk7XHJcblxyXG5cdFx0XHRcdFx0XHRcdFx0XHQvLyBlbWl0IHRoZSBjaGFuZ2VcclxuXHRcdFx0XHRcdFx0XHRcdFx0Y2hhbmdlKCk7XHJcblx0XHRcdFx0XHRcdFx0XHR9XHJcblx0XHRcdFx0XHRcdFx0fVxyXG5cdFx0XHRcdFx0XHRdXHJcblx0XHRcdFx0XHR9LFxyXG5cdFx0XHRcdFx0e1xyXG5cdFx0XHRcdFx0XHRuYW1lOiBcImNsYXNzRmllbGRcIixcclxuXHRcdFx0XHRcdFx0Y2xhc3NlczogXCJlZGl0b3Itcm93XCIsXHJcblx0XHRcdFx0XHRcdGNoaWxkcmVuOiBbXHJcblx0XHRcdFx0XHRcdFx0e1xyXG5cdFx0XHRcdFx0XHRcdFx0d2lkZ2V0OiBcImlucHV0XCIsXHJcblx0XHRcdFx0XHRcdFx0XHRiaW5kOiBpdGVtLFxyXG5cdFx0XHRcdFx0XHRcdFx0cHJvcDogXCJjbGFzc1wiLFxyXG5cdFx0XHRcdFx0XHRcdFx0Y2hhbmdlXHJcblx0XHRcdFx0XHRcdFx0fVxyXG5cdFx0XHRcdFx0XHRdXHJcblx0XHRcdFx0XHR9LFxyXG5cdFx0XHRcdFx0e1xyXG5cdFx0XHRcdFx0XHRuYW1lOiBcImRhdGVGaWVsZFwiLFxyXG5cdFx0XHRcdFx0XHRjbGFzc2VzOiBcImVkaXRvci1yb3dcIixcclxuXHRcdFx0XHRcdFx0Y2hpbGRyZW46IFtcclxuXHRcdFx0XHRcdFx0XHR7XHJcblx0XHRcdFx0XHRcdFx0XHR3aWRnZXQ6IFwiaW5wdXRcIixcclxuXHRcdFx0XHRcdFx0XHRcdHR5cGU6IFwiZGF0ZVwiLFxyXG5cdFx0XHRcdFx0XHRcdFx0dmFsdWU6IGl0ZW0uZGF0ZSAmJiBgJHtpdGVtLmRhdGUuZ2V0RnVsbFllYXIoKX0tJHtwYWQoaXRlbS5kYXRlLmdldE1vbnRoKCkgKyAxKX0tJHtwYWQoaXRlbS5kYXRlLmdldERhdGUoKSl9YCxcclxuXHRcdFx0XHRcdFx0XHRcdGNoYW5nZVxyXG5cdFx0XHRcdFx0XHRcdH0sXHJcblx0XHRcdFx0XHRcdFx0e1xyXG5cdFx0XHRcdFx0XHRcdFx0d2lkZ2V0OiBcImlucHV0XCIsXHJcblx0XHRcdFx0XHRcdFx0XHR0eXBlOiBcInRpbWVcIixcclxuXHRcdFx0XHRcdFx0XHRcdHZhbHVlOiBpdGVtLmRhdGUgJiYgYCR7aXRlbS5kYXRlLmdldEhvdXJzKCl9OiR7cGFkKGl0ZW0uZGF0ZS5nZXRNaW51dGVzKCkpfWAsXHJcblx0XHRcdFx0XHRcdFx0XHRjaGFuZ2VcclxuXHRcdFx0XHRcdFx0XHR9XHJcblx0XHRcdFx0XHRcdF1cclxuXHRcdFx0XHRcdH0sXHJcblx0XHRcdFx0XHR7XHJcblx0XHRcdFx0XHRcdGNsYXNzZXM6IFwidGV4dGFyZWEtd3JhcHBlclwiLFxyXG5cdFx0XHRcdFx0XHRjaGlsZHJlbjogW1xyXG5cdFx0XHRcdFx0XHRcdHtcclxuXHRcdFx0XHRcdFx0XHRcdHdpZGdldDogXCJpbnB1dFwiLFxyXG5cdFx0XHRcdFx0XHRcdFx0dGFnOiBcInRleHRhcmVhXCIsXHJcblx0XHRcdFx0XHRcdFx0XHRjbGFzc2VzOiBcInRleHRhcmVhLWZpbGxcIixcclxuXHRcdFx0XHRcdFx0XHRcdHBsYWNlaG9sZGVyOiBcIkRlc2NyaXB0aW9uXCIsXHJcblx0XHRcdFx0XHRcdFx0XHRiaW5kOiBpdGVtLFxyXG5cdFx0XHRcdFx0XHRcdFx0cHJvcDogXCJkZXNjcmlwdGlvblwiLFxyXG5cdFx0XHRcdFx0XHRcdFx0Y2hhbmdlXHJcblx0XHRcdFx0XHRcdFx0fVxyXG5cdFx0XHRcdFx0XHRdXHJcblx0XHRcdFx0XHR9XHJcblx0XHRcdFx0XVxyXG5cdFx0XHR9KTtcclxuXHJcblx0XHRcdC8vIHNob3cgdGhlIGZpZWxkcyBmb3IgdGhpcyBpdGVtIHR5cGVcclxuXHRcdFx0dG9nZ2xlRmllbGRzKCk7XHJcblx0XHR9KTtcclxuXHJcblx0XHQvLyByZW1vdmUgdGhlIHN1YnNjcmlwdGlvbiB3aGVuIHRoaXMgdmlldyBpcyBkZXN0cm95ZWRcclxuXHRcdGRpc3Bvc2FibGUuYWRkKGNoYW5nZVN1Yik7XHJcblx0fVxyXG59KTtcclxuXHJcbi8vIGFkZCBhIGxlYWRpbmcgMCBpZiBhIG51bWJlciBpcyBsZXNzIHRoYW4gMTBcclxudmFyIHBhZCA9IG51bWJlciA9PiAobnVtYmVyIDwgMTApID8gXCIwXCIgKyBudW1iZXIgOiBudW1iZXI7XHJcblxyXG4vLyBjcmVhdGUgYSBkYXRlIG9mIHRvZGF5IGF0IDExOjU5cG1cclxudmFyIGdlbkRhdGUgPSAoKSA9PiB7XHJcblx0dmFyIGRhdGUgPSBuZXcgRGF0ZSgpO1xyXG5cclxuXHQvLyBzZXQgdGhlIHRpbWVcclxuXHRkYXRlLnNldEhvdXJzKDIzKTtcclxuXHRkYXRlLnNldE1pbnV0ZXMoNTkpO1xyXG5cclxuXHRyZXR1cm4gZGF0ZTtcclxufTtcclxuIiwiLyoqXHJcbiAqIFRoZSB2aWV3IGZvciBhbiBhc3NpZ25tZW50XHJcbiAqL1xyXG5cclxudmFyIHtkYXlzRnJvbU5vdywgc3RyaW5naWZ5RGF0ZX0gPSByZXF1aXJlKFwiLi4vdXRpbC9kYXRlXCIpO1xyXG52YXIge2Fzc2lnbm1lbnRzfSA9IHJlcXVpcmUoXCIuLi9kYXRhLXN0b3Jlc1wiKTtcclxuXHJcbmxpZmVMaW5lLm5hdi5yZWdpc3Rlcih7XHJcblx0bWF0Y2hlcjogL15cXC9pdGVtXFwvKC4rPykkLyxcclxuXHJcblx0bWFrZSh7bWF0Y2gsIHNldFRpdGxlLCBjb250ZW50LCBkaXNwb3NhYmxlfSkge1xyXG5cdFx0dmFyIGFjdGlvbkRvbmVTdWIsIGFjdGlvbkVkaXRTdWI7XHJcblxyXG5cdCBcdGRpc3Bvc2FibGUuYWRkKFxyXG5cdFx0XHRhc3NpZ25tZW50cy5xdWVyeSh7IGlkOiBtYXRjaFsxXSB9LCBmdW5jdGlvbihbaXRlbV0pIHtcclxuXHRcdFx0XHQvLyBjbGVhciB0aGUgY29udGVudFxyXG5cdFx0XHRcdGNvbnRlbnQuaW5uZXJIVE1MID0gXCJcIjtcclxuXHJcblx0XHRcdFx0Ly8gcmVtb3ZlIHRoZSBvbGQgYWN0aW9uXHJcblx0XHRcdFx0aWYoYWN0aW9uRG9uZVN1Yikge1xyXG5cdFx0XHRcdFx0YWN0aW9uRG9uZVN1Yi51bnN1YnNjcmliZSgpO1xyXG5cdFx0XHRcdFx0YWN0aW9uRWRpdFN1Yi51bnN1YnNjcmliZSgpO1xyXG5cdFx0XHRcdH1cclxuXHJcblx0XHRcdFx0Ly8gbm8gc3VjaCBhc3NpZ25tZW50XHJcblx0XHRcdFx0aWYoIWl0ZW0pIHtcclxuXHRcdFx0XHRcdHNldFRpdGxlKFwiTm90IGZvdW5kXCIpO1xyXG5cclxuXHRcdFx0XHRcdGxpZmVMaW5lLm1ha2VEb20oe1xyXG5cdFx0XHRcdFx0XHRwYXJlbnQ6IGNvbnRlbnQsXHJcblx0XHRcdFx0XHRcdGNsYXNzZXM6IFwiY29udGVudC1wYWRkZWRcIixcclxuXHRcdFx0XHRcdFx0Y2hpbGRyZW46IFtcclxuXHRcdFx0XHRcdFx0XHR7XHJcblx0XHRcdFx0XHRcdFx0XHR0YWc6IFwic3BhblwiLFxyXG5cdFx0XHRcdFx0XHRcdFx0dGV4dDogXCJUaGUgYXNzaWdubWVudCB5b3Ugd2hlcmUgbG9va2luZyBmb3IgY291bGQgbm90IGJlIGZvdW5kLiBcIlxyXG5cdFx0XHRcdFx0XHRcdH0sXHJcblx0XHRcdFx0XHRcdFx0e1xyXG5cdFx0XHRcdFx0XHRcdFx0d2lkZ2V0OiBcImxpbmtcIixcclxuXHRcdFx0XHRcdFx0XHRcdGhyZWY6IFwiL1wiLFxyXG5cdFx0XHRcdFx0XHRcdFx0dGV4dDogXCJHbyBob21lLlwiXHJcblx0XHRcdFx0XHRcdFx0fVxyXG5cdFx0XHRcdFx0XHRdXHJcblx0XHRcdFx0XHR9KTtcclxuXHJcblx0XHRcdFx0XHRyZXR1cm47XHJcblx0XHRcdFx0fVxyXG5cclxuXHRcdFx0XHQvLyBzZXQgdGhlIHRpdGxlIGZvciB0aGUgY29udGVudFxyXG5cdFx0XHRcdHNldFRpdGxlKFwiQXNzaWdubWVudFwiKTtcclxuXHJcblx0XHRcdFx0Ly8gbWFyayB0aGUgaXRlbSBhcyBkb25lXHJcblx0XHRcdFx0YWN0aW9uRG9uZVN1YiA9IGxpZmVMaW5lLmFkZEFjdGlvbihpdGVtLmRvbmUgPyBcIkRvbmVcIiA6IFwiTm90IGRvbmVcIiwgKCkgPT4ge1xyXG5cdFx0XHRcdFx0Ly8gbWFyayB0aGUgaXRlbSBkb25lXHJcblx0XHRcdFx0XHRpdGVtLmRvbmUgPSAhaXRlbS5kb25lO1xyXG5cclxuXHRcdFx0XHRcdC8vIHVwZGF0ZSB0aGUgbW9kaWZpZWQgdGltZVxyXG5cdFx0XHRcdFx0aXRlbS5tb2RpZmllZCA9IERhdGUubm93KCk7XHJcblxyXG5cdFx0XHRcdFx0Ly8gc2F2ZSB0aGUgY2hhbmdlXHJcblx0XHRcdFx0XHRhc3NpZ25tZW50cy5zZXQoaXRlbSk7XHJcblx0XHRcdFx0fSk7XHJcblxyXG5cdFx0XHRcdC8vIGVkaXQgdGhlIGl0ZW1cclxuXHRcdFx0XHRhY3Rpb25FZGl0U3ViID0gbGlmZUxpbmUuYWRkQWN0aW9uKFwiRWRpdFwiLFxyXG5cdFx0XHRcdFx0KCkgPT4gbGlmZUxpbmUubmF2Lm5hdmlnYXRlKFwiL2VkaXQvXCIgKyBpdGVtLmlkKSk7XHJcblxyXG5cdFx0XHRcdC8vIHRpbWVzIHRvIHNraXBcclxuXHRcdFx0XHR2YXIgc2tpcFRpbWVzID0gW1xyXG5cdFx0XHRcdFx0eyBob3VyOiAyMywgbWludXRlOiA1OSB9XHJcblx0XHRcdFx0XTtcclxuXHJcblx0XHRcdFx0bGlmZUxpbmUubWFrZURvbSh7XHJcblx0XHRcdFx0XHRwYXJlbnQ6IGNvbnRlbnQsXHJcblx0XHRcdFx0XHRjbGFzc2VzOiBcImNvbnRlbnQtcGFkZGVkXCIsXHJcblx0XHRcdFx0XHRjaGlsZHJlbjogW1xyXG5cdFx0XHRcdFx0XHR7XHJcblx0XHRcdFx0XHRcdFx0Y2xhc3NlczogXCJhc3NpZ25tZW50LW5hbWVcIixcclxuXHRcdFx0XHRcdFx0XHR0ZXh0OiBpdGVtLm5hbWVcclxuXHRcdFx0XHRcdFx0fSxcclxuXHRcdFx0XHRcdFx0e1xyXG5cdFx0XHRcdFx0XHRcdGNsYXNzZXM6IFwiYXNzaWdubWVudC1pbmZvLXJvd1wiLFxyXG5cdFx0XHRcdFx0XHRcdGNoaWxkcmVuOiBbXHJcblx0XHRcdFx0XHRcdFx0XHR7XHJcblx0XHRcdFx0XHRcdFx0XHRcdGNsYXNzZXM6IFwiYXNzaWdubWVudC1pbmZvLWdyb3dcIixcclxuXHRcdFx0XHRcdFx0XHRcdFx0dGV4dDogaXRlbS5jbGFzc1xyXG5cdFx0XHRcdFx0XHRcdFx0fSxcclxuXHRcdFx0XHRcdFx0XHRcdHtcclxuXHRcdFx0XHRcdFx0XHRcdFx0dGV4dDogaXRlbS5kYXRlICYmIHN0cmluZ2lmeURhdGUoaXRlbS5kYXRlLCB7IGluY2x1ZGVUaW1lOiB0cnVlLCBza2lwVGltZXMgfSlcclxuXHRcdFx0XHRcdFx0XHRcdH1cclxuXHRcdFx0XHRcdFx0XHRdXHJcblx0XHRcdFx0XHRcdH0sXHJcblx0XHRcdFx0XHRcdHtcclxuXHRcdFx0XHRcdFx0XHRjbGFzc2VzOiBcImFzc2lnbm1lbnQtZGVzY3JpcHRpb25cIixcclxuXHRcdFx0XHRcdFx0XHR0ZXh0OiBpdGVtLmRlc2NyaXB0aW9uXHJcblx0XHRcdFx0XHRcdH1cclxuXHRcdFx0XHRcdF1cclxuXHRcdFx0XHR9KTtcclxuXHRcdFx0fSlcclxuXHRcdCk7XHJcblx0fVxyXG59KTtcclxuIiwiLyoqXHJcbiAqIERpc3BsYXkgYSBsaXN0IG9mIHVwY29tbWluZyBhc3NpZ25tZW50c1xyXG4gKi9cclxuXHJcbnZhciB7ZGF5c0Zyb21Ob3csIGlzU2FtZURhdGUsIHN0cmluZ2lmeURhdGUsIHN0cmluZ2lmeVRpbWUsIGlzU29vbmVyRGF0ZX0gPSByZXF1aXJlKFwiLi4vdXRpbC9kYXRlXCIpO1xyXG52YXIge2Fzc2lnbm1lbnRzfSA9IHJlcXVpcmUoXCIuLi9kYXRhLXN0b3Jlc1wiKTtcclxuXHJcbi8vIGFsbCB0aGUgZGlmZmVyZW50IGxpc3RzXHJcbmNvbnN0IExJU1RTID0gW1xyXG5cdHtcclxuXHRcdHVybDogXCIvd2Vla1wiLFxyXG5cdFx0dGl0bGU6IFwiVGhpcyB3ZWVrXCIsXHJcblx0XHRjcmVhdGVDdHg6ICgpID0+ICh7XHJcblx0XHRcdC8vIGRheXMgdG8gdGhlIGVuZCBvZiB0aGlzIHdlZWtcclxuXHRcdFx0ZW5kRGF0ZTogZGF5c0Zyb21Ob3coNyAtIChuZXcgRGF0ZSgpKS5nZXREYXkoKSksXHJcblx0XHRcdC8vIHRvZGF5cyBkYXRlXHJcblx0XHRcdHRvZGF5OiBuZXcgRGF0ZSgpXHJcblx0XHR9KSxcclxuXHRcdC8vIHNob3cgYWxsIGF0IHJlYXNvbmFibGUgbnVtYmVyIG9mIGluY29tcGxldGUgYXNzaWdubWVudHNcclxuXHRcdGZpbHRlcjogKGl0ZW0sIHt0b2RheSwgZW5kRGF0ZX0pID0+IHtcclxuXHRcdFx0Ly8gc2hvdyBhbGwgdGFza3NcclxuXHRcdFx0aWYoaXRlbS50eXBlID09IFwidGFza1wiKSByZXR1cm4gdHJ1ZTtcclxuXHJcblx0XHRcdC8vIGNoZWNrIGlmIHRoZSBpdGVtIGlzIHBhc3QgdGhpcyB3ZWVrXHJcblx0XHRcdGlmKCFpc1Nvb25lckRhdGUoaXRlbS5kYXRlLCBlbmREYXRlKSAmJiAhaXNTYW1lRGF0ZShpdGVtLmRhdGUsIGVuZERhdGUpKSByZXR1cm47XHJcblxyXG5cdFx0XHQvLyBjaGVjayBpZiB0aGUgZGF0ZSBpcyBiZWZvcmUgdG9kYXlcclxuXHRcdFx0aWYoaXNTb29uZXJEYXRlKGl0ZW0uZGF0ZSwgdG9kYXkpKSByZXR1cm47XHJcblxyXG5cdFx0XHRyZXR1cm4gdHJ1ZTtcclxuXHRcdH0sXHJcblx0XHRxdWVyeTogeyBkb25lOiBmYWxzZSB9XHJcblx0fSxcclxuXHR7XHJcblx0XHR1cmw6IFwiL3VwY29taW5nXCIsXHJcblx0XHRxdWVyeTogeyBkb25lOiBmYWxzZSB9LFxyXG5cdFx0dGl0bGU6IFwiVXBjb21pbmdcIlxyXG5cdH0sXHJcblx0e1xyXG5cdFx0dXJsOiBcIi9kb25lXCIsXHJcblx0XHRxdWVyeTogeyBkb25lOiB0cnVlIH0sXHJcblx0XHR0aXRsZTogXCJEb25lXCJcclxuXHR9XHJcbl07XHJcblxyXG4vLyBhZGQgbGlzdCB2aWV3IGxpbmtzIHRvIHRoZSBuYXZiYXJcclxuZXhwb3J0cy5pbml0TmF2QmFyID0gZnVuY3Rpb24oKSB7XHJcblx0TElTVFMuZm9yRWFjaChsaXN0ID0+IGxpZmVMaW5lLmFkZE5hdkNvbW1hbmQobGlzdC50aXRsZSwgbGlzdC51cmwpKTtcclxufTtcclxuXHJcbmxpZmVMaW5lLm5hdi5yZWdpc3Rlcih7XHJcblx0bWF0Y2hlcih1cmwpIHtcclxuXHRcdHJldHVybiBMSVNUUy5maW5kKGxpc3QgPT4gbGlzdC51cmwgPT0gdXJsKTtcclxuXHR9LFxyXG5cclxuXHQvLyBtYWtlIHRoZSBsaXN0XHJcblx0bWFrZSh7c2V0VGl0bGUsIGNvbnRlbnQsIGRpc3Bvc2FibGUsIG1hdGNofSkge1xyXG5cdFx0ZGlzcG9zYWJsZS5hZGQoXHJcblx0XHRcdGFzc2lnbm1lbnRzLnF1ZXJ5KG1hdGNoLnF1ZXJ5IHx8IHt9LCBmdW5jdGlvbihkYXRhKSB7XHJcblx0XHRcdFx0Ly8gY2xlYXIgdGhlIGNvbnRlbnRcclxuXHRcdFx0XHRjb250ZW50LmlubmVySFRNTCA9IFwiXCI7XHJcblxyXG5cdFx0XHRcdC8vIHNldCB0aGUgcGFnZSB0aXRsZVxyXG5cdFx0XHRcdHNldFRpdGxlKG1hdGNoLnRpdGxlKTtcclxuXHJcblx0XHRcdFx0Ly8gdGhlIGNvbnRleHQgZm9yIHRoZSBmaWx0ZXIgZnVuY3Rpb25cclxuXHRcdFx0XHR2YXIgY3R4O1xyXG5cclxuXHRcdFx0XHRpZihtYXRjaC5jcmVhdGVDdHgpIHtcclxuXHRcdFx0XHRcdGN0eCA9IG1hdGNoLmNyZWF0ZUN0eCgpO1xyXG5cdFx0XHRcdH1cclxuXHJcblx0XHRcdFx0Ly8gcnVuIHRoZSBmaWx0ZXIgZnVuY3Rpb25cclxuXHRcdFx0XHRpZihtYXRjaC5maWx0ZXIpIHtcclxuXHRcdFx0XHRcdGRhdGEgPSBkYXRhLmZpbHRlcihpdGVtID0+IG1hdGNoLmZpbHRlcihpdGVtLCBjdHgpKTtcclxuXHRcdFx0XHR9XHJcblxyXG5cdFx0XHRcdC8vIHNvcnQgdGhlIGFzc2luZ21lbnRzXHJcblx0XHRcdFx0ZGF0YS5zb3J0KChhLCBiKSA9PiB7XHJcblx0XHRcdFx0XHQvLyB0YXNrcyBhcmUgYmVsb3cgYXNzaWdubWVudHNcclxuXHRcdFx0XHRcdGlmKGEudHlwZSA9PSBcInRhc2tcIiAmJiBiLnR5cGUgIT0gXCJ0YXNrXCIpIHJldHVybiAxO1xyXG5cdFx0XHRcdFx0aWYoYS50eXBlICE9IFwidGFza1wiICYmIGIudHlwZSA9PSBcInRhc2tcIikgcmV0dXJuIC0xO1xyXG5cclxuXHRcdFx0XHRcdC8vIHNvcnQgYnkgZHVlIGRhdGVcclxuXHRcdFx0XHRcdGlmKGEudHlwZSA9PSBcImFzc2lnbm1lbnRcIiAmJiBiLnR5cGUgPT0gXCJhc3NpZ25tZW50XCIpIHtcclxuXHRcdFx0XHRcdFx0aWYoYS5kYXRlLmdldFRpbWUoKSAhPSBiLmRhdGUuZ2V0VGltZSgpKSB7XHJcblx0XHRcdFx0XHRcdFx0cmV0dXJuIGEuZGF0ZS5nZXRUaW1lKCkgLSBiLmRhdGUuZ2V0VGltZSgpO1xyXG5cdFx0XHRcdFx0XHR9XHJcblx0XHRcdFx0XHR9XHJcblxyXG5cdFx0XHRcdFx0Ly8gb3JkZXIgYnkgbmFtZVxyXG5cdFx0XHRcdFx0aWYoYS5uYW1lIDwgYi5uYW1lKSByZXR1cm4gLTE7XHJcblx0XHRcdFx0XHRpZihhLm5hbWUgPiBiLm5hbWUpIHJldHVybiAxO1xyXG5cclxuXHRcdFx0XHRcdHJldHVybiAwO1xyXG5cdFx0XHRcdH0pO1xyXG5cclxuXHRcdFx0XHQvLyBtYWtlIHRoZSBncm91cHNcclxuXHRcdFx0XHR2YXIgZ3JvdXBzID0ge307XHJcblxyXG5cdFx0XHRcdC8vIHJlbmRlciB0aGUgbGlzdFxyXG5cdFx0XHRcdGRhdGEuZm9yRWFjaCgoaXRlbSwgaSkgPT4ge1xyXG5cdFx0XHRcdFx0Ly8gZ2V0IHRoZSBoZWFkZXIgbmFtZVxyXG5cdFx0XHRcdFx0dmFyIGRhdGVTdHIgPSBpdGVtLnR5cGUgPT0gXCJ0YXNrXCIgPyBcIlRhc2tzXCIgOiBzdHJpbmdpZnlEYXRlKGl0ZW0uZGF0ZSk7XHJcblxyXG5cdFx0XHRcdFx0Ly8gbWFrZSBzdXJlIHRoZSBoZWFkZXIgZXhpc3RzXHJcblx0XHRcdFx0XHRncm91cHNbZGF0ZVN0cl0gfHwgKGdyb3Vwc1tkYXRlU3RyXSA9IFtdKTtcclxuXHJcblx0XHRcdFx0XHQvLyBhZGQgdGhlIGl0ZW0gdG8gdGhlIGxpc3RcclxuXHRcdFx0XHRcdHZhciBpdGVtcyA9IFtcclxuXHRcdFx0XHRcdFx0eyB0ZXh0OiBpdGVtLm5hbWUsIGdyb3c6IHRydWUgfVxyXG5cdFx0XHRcdFx0XTtcclxuXHJcblx0XHRcdFx0XHRpZihpdGVtLnR5cGUgIT0gXCJ0YXNrXCIpIHtcclxuXHRcdFx0XHRcdFx0Ly8gc2hvdyB0aGUgZW5kIHRpbWUgZm9yIGFueSBub24gMTE6NTlwbSB0aW1lc1xyXG5cdFx0XHRcdFx0XHRpZihpdGVtLmRhdGUuZ2V0SG91cnMoKSAhPSAyMyB8fCBpdGVtLmRhdGUuZ2V0TWludXRlcygpICE9IDU5KSB7XHJcblx0XHRcdFx0XHRcdFx0aXRlbXMucHVzaChzdHJpbmdpZnlUaW1lKGl0ZW0uZGF0ZSkpO1xyXG5cdFx0XHRcdFx0XHR9XHJcblxyXG5cdFx0XHRcdFx0XHQvLyBzaG93IHRoZSBjbGFzc1xyXG5cdFx0XHRcdFx0XHRpdGVtcy5wdXNoKGl0ZW0uY2xhc3MpO1xyXG5cdFx0XHRcdFx0fVxyXG5cclxuXHRcdFx0XHRcdGdyb3Vwc1tkYXRlU3RyXS5wdXNoKHtcblx0XHRcdFx0XHRcdGhyZWY6IGAvaXRlbS8ke2l0ZW0uaWR9YCxcblx0XHRcdFx0XHRcdGl0ZW1zXHJcblx0XHRcdFx0XHR9KTtcclxuXHRcdFx0XHR9KTtcclxuXHJcblx0XHRcdFx0Ly8gZGlzcGxheSBhbGwgaXRlbXNcclxuXHRcdFx0XHRsaWZlTGluZS5tYWtlRG9tKHtcclxuXHRcdFx0XHRcdHBhcmVudDogY29udGVudCxcclxuXHRcdFx0XHRcdHdpZGdldDogXCJsaXN0XCIsXHJcblx0XHRcdFx0XHRpdGVtczogZ3JvdXBzXHJcblx0XHRcdFx0fSk7XHJcblx0XHRcdH0pXHJcblx0XHQpO1xyXG5cdH1cclxufSk7XHJcbiIsIi8qKlxyXG4gKiBTaG93IGEgbG9naW4gYnV0dG9uIHRvIHRoZSB1c2VyXHJcbiAqL1xyXG5cclxubGlmZUxpbmUubmF2LnJlZ2lzdGVyKHtcclxuXHRtYXRjaGVyOiBcIi9sb2dpblwiLFxyXG5cclxuXHRtYWtlKHtzZXRUaXRsZSwgY29udGVudH0pIHtcclxuXHRcdC8vIHNldCB0aGUgcGFnZSB0aXRsZVxyXG5cdFx0c2V0VGl0bGUoXCJMb2dpblwiKTtcclxuXHJcblx0XHQvLyB0aGUgdXNlcnMgY3JlZGVudGlhbHNcclxuXHRcdHZhciBhdXRoID0ge307XHJcblxyXG5cdFx0Ly8gY3JlYXRlIHRoZSBsb2dpbiBmb3JtXHJcblx0XHR2YXIge3VzZXJuYW1lLCBwYXNzd29yZCwgbXNnfSA9IGxpZmVMaW5lLm1ha2VEb20oe1xyXG5cdFx0XHRwYXJlbnQ6IGNvbnRlbnQsXHJcblx0XHRcdHRhZzogXCJmb3JtXCIsXHJcblx0XHRcdGNsYXNzZXM6IFwiY29udGVudC1wYWRkZWRcIixcclxuXHRcdFx0Y2hpbGRyZW46IFtcclxuXHRcdFx0XHR7XHJcblx0XHRcdFx0XHRjbGFzc2VzOiBcImVkaXRvci1yb3dcIixcclxuXHRcdFx0XHRcdGNoaWxkcmVuOiBbXHJcblx0XHRcdFx0XHRcdHtcclxuXHRcdFx0XHRcdFx0XHR3aWRnZXQ6IFwiaW5wdXRcIixcclxuXHRcdFx0XHRcdFx0XHRiaW5kOiBhdXRoLFxyXG5cdFx0XHRcdFx0XHRcdHByb3A6IFwidXNlcm5hbWVcIixcclxuXHRcdFx0XHRcdFx0XHRwbGFjZWhvbGRlcjogXCJVc2VybmFtZVwiXHJcblx0XHRcdFx0XHRcdH1cclxuXHRcdFx0XHRcdF1cclxuXHRcdFx0XHR9LFxyXG5cdFx0XHRcdHtcclxuXHRcdFx0XHRcdGNsYXNzZXM6IFwiZWRpdG9yLXJvd1wiLFxyXG5cdFx0XHRcdFx0Y2hpbGRyZW46IFtcclxuXHRcdFx0XHRcdFx0e1xyXG5cdFx0XHRcdFx0XHRcdHdpZGdldDogXCJpbnB1dFwiLFxyXG5cdFx0XHRcdFx0XHRcdGJpbmQ6IGF1dGgsXHJcblx0XHRcdFx0XHRcdFx0cHJvcDogXCJwYXNzd29yZFwiLFxyXG5cdFx0XHRcdFx0XHRcdHR5cGU6IFwicGFzc3dvcmRcIixcclxuXHRcdFx0XHRcdFx0XHRwbGFjZWhvbGRlcjogXCJQYXNzd29yZFwiXHJcblx0XHRcdFx0XHRcdH1cclxuXHRcdFx0XHRcdF1cclxuXHRcdFx0XHR9LFxyXG5cdFx0XHRcdHtcclxuXHRcdFx0XHRcdHRhZzogXCJidXR0b25cIixcclxuXHRcdFx0XHRcdHRleHQ6IFwiTG9naW5cIixcclxuXHRcdFx0XHRcdGNsYXNzZXM6IFwiZmFuY3ktYnV0dG9uXCIsXHJcblx0XHRcdFx0XHRhdHRyczoge1xyXG5cdFx0XHRcdFx0XHR0eXBlOiBcInN1Ym1pdFwiXHJcblx0XHRcdFx0XHR9XHJcblx0XHRcdFx0fSxcclxuXHRcdFx0XHR7XHJcblx0XHRcdFx0XHRjbGFzc2VzOiBcImVycm9yLW1zZ1wiLFxyXG5cdFx0XHRcdFx0bmFtZTogXCJtc2dcIlxyXG5cdFx0XHRcdH1cclxuXHRcdFx0XSxcclxuXHRcdFx0b246IHtcclxuXHRcdFx0XHRzdWJtaXQ6IGUgPT4ge1xyXG5cdFx0XHRcdFx0ZS5wcmV2ZW50RGVmYXVsdCgpO1xyXG5cclxuXHRcdFx0XHRcdC8vIHNlbmQgdGhlIGxvZ2luIHJlcXVlc3RcclxuXHRcdFx0XHRcdGZldGNoKFwiL2FwaS9hdXRoL2xvZ2luXCIsIHtcclxuXHRcdFx0XHRcdFx0bWV0aG9kOiBcIlBPU1RcIixcclxuXHRcdFx0XHRcdFx0Y3JlZGVudGlhbHM6IFwiaW5jbHVkZVwiLFxyXG5cdFx0XHRcdFx0XHRib2R5OiBKU09OLnN0cmluZ2lmeShhdXRoKVxyXG5cdFx0XHRcdFx0fSlcclxuXHJcblx0XHRcdFx0XHQvLyBwYXJzZSB0aGUganNvblxyXG5cdFx0XHRcdFx0LnRoZW4ocmVzID0+IHJlcy5qc29uKCkpXHJcblxyXG5cdFx0XHRcdFx0Ly8gcHJvY2VzcyB0aGUgcmVzcG9uc2VcclxuXHRcdFx0XHRcdC50aGVuKHJlcyA9PiB7XHJcblx0XHRcdFx0XHRcdC8vIGxvZ2luIHN1Y2VlZGVkIGdvIGhvbWVcclxuXHRcdFx0XHRcdFx0aWYocmVzLnN0YXR1cyA9PSBcInN1Y2Nlc3NcIikge1xyXG5cdFx0XHRcdFx0XHRcdGxpZmVMaW5lLm5hdi5uYXZpZ2F0ZShcIi9cIik7XHJcblx0XHRcdFx0XHRcdFx0cmV0dXJuO1xyXG5cdFx0XHRcdFx0XHR9XHJcblxyXG5cdFx0XHRcdFx0XHQvLyBsb2dpbiBmYWlsZWRcclxuXHRcdFx0XHRcdFx0aWYocmVzLnN0YXR1cyA9PSBcImZhaWxcIikge1xyXG5cdFx0XHRcdFx0XHRcdGVycm9yTXNnKFwiTG9naW4gZmFpbGVkXCIpO1xyXG5cdFx0XHRcdFx0XHR9XHJcblx0XHRcdFx0XHR9KTtcclxuXHRcdFx0XHR9XHJcblx0XHRcdH1cclxuXHRcdH0pO1xyXG5cclxuXHRcdC8vIGRpc3BsYXkgYW4gZXJyb3IgbWVzc2FnZVxyXG5cdFx0dmFyIGVycm9yTXNnID0gZnVuY3Rpb24odGV4dCkge1xyXG5cdFx0XHRtc2cuaW5uZXJUZXh0ID0gdGV4dDtcclxuXHRcdH07XHJcblx0fVxyXG59KTtcclxuXHJcbi8vIGxvZ291dFxyXG5saWZlTGluZS5sb2dvdXQgPSBmdW5jdGlvbigpIHtcclxuXHQvLyBzZW5kIHRoZSBsb2dvdXQgcmVxdWVzdFxyXG5cdGZldGNoKFwiL2FwaS9hdXRoL2xvZ291dFwiLCB7XHJcblx0XHRjcmVkZW50aWFsczogXCJpbmNsdWRlXCJcclxuXHR9KVxyXG5cclxuXHQvLyBnbyB0byB0aGUgbG9naW4gcGFnZVxyXG5cdC50aGVuKCgpID0+IGxpZmVMaW5lLm5hdi5uYXZpZ2F0ZShcIi9sb2dpblwiKSk7XHJcbn07XHJcbiIsIi8qKlxyXG4gKiBBIGxpc3Qgb2YgdGhpbmdzIHRvZG9cclxuICovXHJcblxyXG52YXIge2RheXNGcm9tTm93LCBpc1NhbWVEYXRlLCBzdHJpbmdpZnlUaW1lfSA9IHJlcXVpcmUoXCIuLi91dGlsL2RhdGVcIik7XHJcbnZhciB7YXNzaWdubWVudHN9ID0gcmVxdWlyZShcIi4uL2RhdGEtc3RvcmVzXCIpO1xyXG5cclxubGlmZUxpbmUubmF2LnJlZ2lzdGVyKHtcclxuXHRtYXRjaGVyOiBcIi9cIixcclxuXHJcblx0bWFrZSh7c2V0VGl0bGUsIGNvbnRlbnQsIGRpc3Bvc2FibGV9KSB7XHJcblx0XHRzZXRUaXRsZShcIlRvZG9cIik7XHJcblxyXG5cdFx0Ly8gbG9hZCB0aGUgaXRlbXNcclxuXHRcdGRpc3Bvc2FibGUuYWRkKFxyXG5cdFx0XHRhc3NpZ25tZW50cy5xdWVyeSh7IGRvbmU6IGZhbHNlIH0sIGZ1bmN0aW9uKGRhdGEpIHtcclxuXHRcdFx0XHQvLyBjbGVhciB0aGUgb2xkIGNvbnRlbnRcclxuXHRcdFx0XHRjb250ZW50LmlubmVySFRNTCA9IFwiXCI7XHJcblxyXG5cdFx0XHRcdHZhciBncm91cHMgPSB7XHJcblx0XHRcdFx0XHRUYXNrczogW10sXHJcblx0XHRcdFx0XHRUb2RheTogW10sXHJcblx0XHRcdFx0XHRUb21vcnJvdzogW11cclxuXHRcdFx0XHR9O1xyXG5cclxuXHRcdFx0XHQvLyB0b2RheSBhbmQgdG9tb3Jyb3dzIGRhdGVzXHJcblx0XHRcdFx0dmFyIHRvZGF5ID0gbmV3IERhdGUoKTtcclxuXHRcdFx0XHR2YXIgdG9tb3Jyb3cgPSBkYXlzRnJvbU5vdygxKTtcclxuXHJcblx0XHRcdFx0Ly8gc2VsZWN0IHRoZSBpdGVtcyB0byBkaXNwbGF5XHJcblx0XHRcdFx0ZGF0YS5mb3JFYWNoKGl0ZW0gPT4ge1xyXG5cdFx0XHRcdFx0Ly8gYXNzaWdubWVudHMgZm9yIHRvZGF5XHJcblx0XHRcdFx0XHRpZihpdGVtLnR5cGUgPT0gXCJhc3NpZ25tZW50XCIpIHtcclxuXHRcdFx0XHRcdFx0Ly8gdG9kYXlcclxuXHRcdFx0XHRcdFx0aWYoaXNTYW1lRGF0ZSh0b2RheSwgaXRlbS5kYXRlKSkge1xyXG5cdFx0XHRcdFx0XHRcdGdyb3Vwcy5Ub2RheS5wdXNoKGNyZWF0ZVVpKGl0ZW0pKTtcclxuXHRcdFx0XHRcdFx0fVxyXG5cdFx0XHRcdFx0XHQvLyB0b21vcnJvd1xyXG5cdFx0XHRcdFx0XHRlbHNlIGlmKGlzU2FtZURhdGUodG9tb3Jyb3csIGl0ZW0uZGF0ZSkpIHtcclxuXHRcdFx0XHRcdFx0XHRncm91cHMuVG9tb3Jyb3cucHVzaChjcmVhdGVVaShpdGVtKSk7XHJcblx0XHRcdFx0XHRcdH1cclxuXHRcdFx0XHRcdH1cclxuXHJcblx0XHRcdFx0XHQvLyBzaG93IGFueSB0YXNrc1xyXG5cdFx0XHRcdFx0aWYoaXRlbS50eXBlID09IFwidGFza1wiKSB7XHJcblx0XHRcdFx0XHRcdGdyb3Vwcy5UYXNrcy5wdXNoKGNyZWF0ZVVpKGl0ZW0pKTtcclxuXHRcdFx0XHRcdH1cclxuXHRcdFx0XHR9KTtcclxuXHJcblx0XHRcdFx0Ly8gcmVtb3ZlIGFueSBlbXB0eSBmaWVsZHNcclxuXHRcdFx0XHRPYmplY3QuZ2V0T3duUHJvcGVydHlOYW1lcyhncm91cHMpXHJcblxyXG5cdFx0XHRcdC5mb3JFYWNoKG5hbWUgPT4ge1xyXG5cdFx0XHRcdFx0Ly8gcmVtb3ZlIGVtcHR5IGdyb3Vwc1xyXG5cdFx0XHRcdFx0aWYoZ3JvdXBzW25hbWVdLmxlbmd0aCA9PT0gMCkge1xyXG5cdFx0XHRcdFx0XHRkZWxldGUgZ3JvdXBzW25hbWVdO1xyXG5cdFx0XHRcdFx0fVxyXG5cdFx0XHRcdH0pO1xyXG5cclxuXHRcdFx0XHQvLyByZW5kZXIgdGhlIGxpc3RcclxuXHRcdFx0XHRsaWZlTGluZS5tYWtlRG9tKHtcclxuXHRcdFx0XHRcdHBhcmVudDogY29udGVudCxcclxuXHRcdFx0XHRcdHdpZGdldDogXCJsaXN0XCIsXHJcblx0XHRcdFx0XHRpdGVtczogZ3JvdXBzXHJcblx0XHRcdFx0fSk7XHJcblx0XHRcdH0pXHJcblx0XHQpO1xyXG5cdH1cclxufSk7XHJcblxyXG4vLyBjcmVhdGUgYSBsaXN0IGl0ZW1cclxudmFyIGNyZWF0ZVVpID0gZnVuY3Rpb24oaXRlbSkge1xyXG5cdC8vIHJlbmRlciBhIHRhc2tcclxuXHRpZihpdGVtLnR5cGUgPT0gXCJ0YXNrXCIpIHtcclxuXHRcdHJldHVybiB7XHJcblx0XHRcdGhyZWY6IGAvaXRlbS8ke2l0ZW0uaWR9YCxcclxuXHRcdFx0aXRlbXM6IFtcclxuXHRcdFx0XHR7XHJcblx0XHRcdFx0XHR0ZXh0OiBpdGVtLm5hbWUsXHJcblx0XHRcdFx0XHRncm93OiB0cnVlXHJcblx0XHRcdFx0fVxyXG5cdFx0XHRdXHJcblx0XHR9O1xyXG5cdH1cclxuXHQvLyByZW5kZXIgYW4gaXRlbVxyXG5cdGVsc2Uge1xyXG5cdFx0cmV0dXJuIHtcclxuXHRcdFx0aHJlZjogYC9pdGVtLyR7aXRlbS5pZH1gLFxyXG5cdFx0XHRpdGVtczogW1xyXG5cdFx0XHRcdHtcclxuXHRcdFx0XHRcdHRleHQ6IGl0ZW0ubmFtZSxcclxuXHRcdFx0XHRcdGdyb3c6IHRydWVcclxuXHRcdFx0XHR9LFxyXG5cdFx0XHRcdHN0cmluZ2lmeVRpbWUoaXRlbS5kYXRlKSxcclxuXHRcdFx0XHRpdGVtLmNsYXNzXHJcblx0XHRcdF1cclxuXHRcdH07XHJcblx0fVxyXG59O1xyXG4iLCIvKipcclxuICogQSBwYWdlIHdpdGggbGlua3MgdG8gYWxsIHVzZXJzXHJcbiAqL1xyXG5cclxubGlmZUxpbmUubmF2LnJlZ2lzdGVyKHtcclxuXHRtYXRjaGVyOiBcIi91c2Vyc1wiLFxyXG5cclxuXHRtYWtlKHtzZXRUaXRsZSwgY29udGVudH0pIHtcclxuXHRcdHNldFRpdGxlKFwiQWxsIHVzZXJzXCIpO1xyXG5cclxuXHRcdC8vIGxvYWQgdGhlIGxpc3Qgb2YgdXNlcnNcclxuXHRcdGZldGNoKFwiL2FwaS9hdXRoL2luZm8vdXNlcnNcIiwge1xyXG5cdFx0XHRjcmVkZW50aWFsczogXCJpbmNsdWRlXCJcclxuXHRcdH0pXHJcblxyXG5cdFx0LnRoZW4ocmVzID0+IHJlcy5qc29uKCkpXHJcblxyXG5cdFx0LnRoZW4oKHtzdGF0dXMsIGRhdGE6IHVzZXJzfSkgPT4ge1xyXG5cdFx0XHQvLyBub3QgYXV0aGVudGljYXRlZFxyXG5cdFx0XHRpZihzdGF0dXMgPT0gXCJmYWlsXCIpIHtcclxuXHRcdFx0XHRsaWZlTGluZS5tYWtlRG9tKHtcclxuXHRcdFx0XHRcdHBhcmVudDogY29udGVudCxcclxuXHRcdFx0XHRcdGNsYXNzZXM6IFwiY29udGVudC1wYWRkZWRcIixcclxuXHRcdFx0XHRcdHRleHQ6IFwiWW91IGRvIG5vdCBoYXZlIGFjY2VzcyB0byB0aGUgdXNlciBsaXN0XCJcclxuXHRcdFx0XHR9KTtcclxuXHJcblx0XHRcdFx0cmV0dXJuO1xyXG5cdFx0XHR9XHJcblxyXG5cdFx0XHQvLyBzb3J0IGJ5IGFkbWluIHN0YXR1c1xyXG5cdFx0XHR1c2Vycy5zb3J0KChhLCBiKSA9PiB7XHJcblx0XHRcdFx0Ly8gc29ydCBhZG1pbnNcclxuXHRcdFx0XHRpZihhLmFkbWluICYmICFiLmFkbWluKSByZXR1cm4gLTE7XHJcblx0XHRcdFx0aWYoIWEuYWRtaW4gJiYgYi5hZG1pbikgcmV0dXJuIDE7XHJcblxyXG5cdFx0XHRcdC8vIHNvcnQgYnkgdXNlcm5hbWVcclxuXHRcdFx0XHRpZihhLnVzZXJuYW1lIDwgYi51c2VybmFtZSkgcmV0dXJuIC0xO1xyXG5cdFx0XHRcdGlmKGEudXNlcm5hbWUgPiBiLnVzZXJuYW1lKSByZXR1cm4gMTtcclxuXHJcblx0XHRcdFx0cmV0dXJuIDA7XHJcblx0XHRcdH0pO1xyXG5cclxuXHRcdFx0dmFyIGRpc3BsYXlVc2VycyA9IHtcclxuXHRcdFx0XHRBZG1pbnM6IFtdLFxyXG5cdFx0XHRcdFVzZXJzOiBbXVxyXG5cdFx0XHR9O1xyXG5cclxuXHRcdFx0Ly8gZ2VuZXJhdGUgdGhlIHVzZXIgbGlzdFxyXG5cdFx0XHR1c2Vycy5mb3JFYWNoKHVzZXIgPT4ge1xyXG5cdFx0XHRcdC8vIHNvcnQgdGhlIHVzZXJzIGludG8gYWRtaW5zIGFuZCB1c2Vyc1xyXG5cdFx0XHRcdGRpc3BsYXlVc2Vyc1t1c2VyLmFkbWluID8gXCJBZG1pbnNcIiA6IFwiVXNlcnNcIl1cclxuXHJcblx0XHRcdFx0LnB1c2goe1xyXG5cdFx0XHRcdFx0aHJlZjogYC91c2VyLyR7dXNlci51c2VybmFtZX1gLFxyXG5cdFx0XHRcdFx0aXRlbXM6IFt7XHJcblx0XHRcdFx0XHRcdHRleHQ6IHVzZXIudXNlcm5hbWUsXHJcblx0XHRcdFx0XHRcdGdyb3c6IHRydWVcclxuXHRcdFx0XHRcdH1dXHJcblx0XHRcdFx0fSk7XHJcblx0XHRcdH0pO1xyXG5cclxuXHRcdFx0Ly8gZGlzcGxheSB0aGUgdXNlciBsaXN0XHJcblx0XHRcdGxpZmVMaW5lLm1ha2VEb20oe1xyXG5cdFx0XHRcdHBhcmVudDogY29udGVudCxcclxuXHRcdFx0XHR3aWRnZXQ6IFwibGlzdFwiLFxyXG5cdFx0XHRcdGl0ZW1zOiBkaXNwbGF5VXNlcnNcclxuXHRcdFx0fSk7XHJcblx0XHR9KVxyXG5cclxuXHRcdC8vIHNvbWV0aGluZyB3ZW50IHdyb25nIHNob3cgYW4gZXJyb3IgbWVzc2FnZVxyXG5cdFx0LmNhdGNoKGVyciA9PiB7XHJcblx0XHRcdGxpZmVMaW5lLm1ha2VEb20oe1xyXG5cdFx0XHRcdGNsYXNzZXM6IFwiY29udGVudC1wYWRkZWRcIixcclxuXHRcdFx0XHR0ZXh0OiBlcnIubWVzc2FnZVxyXG5cdFx0XHR9KTtcclxuXHRcdH0pO1xyXG5cdH1cclxufSk7XHJcbiIsIi8qKlxyXG4gKiBUaGUgbWFpbiBjb250ZW50IHBhbmUgZm9yIHRoZSBhcHBcclxuICovXHJcblxyXG5saWZlTGluZS5tYWtlRG9tLnJlZ2lzdGVyKFwiY29udGVudFwiLCB7XHJcblx0bWFrZSgpIHtcclxuXHRcdHJldHVybiBbXHJcblx0XHRcdHtcclxuXHRcdFx0XHRjbGFzc2VzOiBcInRvb2xiYXJcIixcclxuXHRcdFx0XHRjaGlsZHJlbjogW1xyXG5cdFx0XHRcdFx0e1xyXG5cdFx0XHRcdFx0XHR0YWc6IFwic3ZnXCIsXHJcblx0XHRcdFx0XHRcdGNsYXNzZXM6IFwibWVudS1pY29uXCIsXHJcblx0XHRcdFx0XHRcdGF0dHJzOiB7XHJcblx0XHRcdFx0XHRcdFx0dmlld0JveDogXCIwIDAgNjAgNTBcIixcclxuXHRcdFx0XHRcdFx0XHR3aWR0aDogXCIyMFwiLFxyXG5cdFx0XHRcdFx0XHRcdGhlaWdodDogXCIxNVwiXHJcblx0XHRcdFx0XHRcdH0sXHJcblx0XHRcdFx0XHRcdGNoaWxkcmVuOiBbXHJcblx0XHRcdFx0XHRcdFx0eyB0YWc6IFwibGluZVwiLCBhdHRyczogeyB4MTogXCIwXCIsIHkxOiBcIjVcIiwgeDI6IFwiNjBcIiwgeTI6IFwiNVwiIH0gfSxcclxuXHRcdFx0XHRcdFx0XHR7IHRhZzogXCJsaW5lXCIsIGF0dHJzOiB7IHgxOiBcIjBcIiwgeTE6IFwiMjVcIiwgeDI6IFwiNjBcIiwgeTI6IFwiMjVcIiB9IH0sXHJcblx0XHRcdFx0XHRcdFx0eyB0YWc6IFwibGluZVwiLCBhdHRyczogeyB4MTogXCIwXCIsIHkxOiBcIjQ1XCIsIHgyOiBcIjYwXCIsIHkyOiBcIjQ1XCIgfSB9XHJcblx0XHRcdFx0XHRcdF0sXHJcblx0XHRcdFx0XHRcdG9uOiB7XHJcblx0XHRcdFx0XHRcdFx0Y2xpY2s6ICgpID0+IGRvY3VtZW50LmJvZHkuY2xhc3NMaXN0LnRvZ2dsZShcInNpZGViYXItb3BlblwiKVxyXG5cdFx0XHRcdFx0XHR9XHJcblx0XHRcdFx0XHR9LFxyXG5cdFx0XHRcdFx0e1xyXG5cdFx0XHRcdFx0XHRjbGFzc2VzOiBcInRvb2xiYXItdGl0bGVcIixcclxuXHRcdFx0XHRcdFx0bmFtZTogXCJ0aXRsZVwiXHJcblx0XHRcdFx0XHR9LFxyXG5cdFx0XHRcdFx0e1xyXG5cdFx0XHRcdFx0XHRjbGFzc2VzOiBcInRvb2xiYXItYnV0dG9uc1wiLFxyXG5cdFx0XHRcdFx0XHRuYW1lOiBcImJ0bnNcIlxyXG5cdFx0XHRcdFx0fVxyXG5cdFx0XHRcdF1cclxuXHRcdFx0fSxcclxuXHRcdFx0e1xyXG5cdFx0XHRcdGNsYXNzZXM6IFwiY29udGVudFwiLFxyXG5cdFx0XHRcdG5hbWU6IFwiY29udGVudFwiXHJcblx0XHRcdH1cclxuXHRcdF07XHJcblx0fSxcclxuXHJcblx0YmluZChvcHRzLCB7dGl0bGUsIGJ0bnMsIGNvbnRlbnR9KSB7XHJcblx0XHR2YXIgZGlzcG9zYWJsZTtcclxuXHJcblx0XHQvLyBzZXQgdGhlIHBhZ2UgdGl0bGVcclxuXHRcdHZhciBzZXRUaXRsZSA9IGZ1bmN0aW9uKHRpdGxlVGV4dCkge1xyXG5cdFx0XHR0aXRsZS5pbm5lclRleHQgPSB0aXRsZVRleHQ7XHJcblx0XHRcdGRvY3VtZW50LnRpdGxlID0gdGl0bGVUZXh0O1xyXG5cdFx0fTtcclxuXHJcblx0XHQvLyBhZGQgYW4gYWN0aW9uIGJ1dHRvblxyXG5cdFx0bGlmZUxpbmUub24oXCJhY3Rpb24tY3JlYXRlXCIsIG5hbWUgPT4ge1xyXG5cdFx0XHRsaWZlTGluZS5tYWtlRG9tKHtcclxuXHRcdFx0XHRwYXJlbnQ6IGJ0bnMsXHJcblx0XHRcdFx0dGFnOiBcImJ1dHRvblwiLFxyXG5cdFx0XHRcdGNsYXNzZXM6IFwidG9vbGJhci1idXR0b25cIixcclxuXHRcdFx0XHR0ZXh0OiBuYW1lLFxyXG5cdFx0XHRcdGF0dHJzOiB7XHJcblx0XHRcdFx0XHRcImRhdGEtbmFtZVwiOiBuYW1lXHJcblx0XHRcdFx0fSxcclxuXHRcdFx0XHRvbjoge1xyXG5cdFx0XHRcdFx0Y2xpY2s6ICgpID0+IGxpZmVMaW5lLmVtaXQoXCJhY3Rpb24tZXhlYy1cIiArIG5hbWUpXHJcblx0XHRcdFx0fVxyXG5cdFx0XHR9KTtcclxuXHRcdH0pO1xyXG5cclxuXHRcdC8vIHJlbW92ZSBhbiBhY3Rpb24gYnV0dG9uXHJcblx0XHRsaWZlTGluZS5vbihcImFjdGlvbi1yZW1vdmVcIiwgbmFtZSA9PiB7XHJcblx0XHRcdHZhciBidG4gPSBidG5zLnF1ZXJ5U2VsZWN0b3IoYFtkYXRhLW5hbWU9XCIke25hbWV9XCJdYCk7XHJcblxyXG5cdFx0XHRpZihidG4pIGJ0bi5yZW1vdmUoKTtcclxuXHRcdH0pO1xyXG5cclxuXHRcdC8vIHJlbW92ZSBhbGwgdGhlIGFjdGlvbiBidXR0b25zXHJcblx0XHRsaWZlTGluZS5vbihcImFjdGlvbi1yZW1vdmUtYWxsXCIsICgpID0+IGJ0bnMuaW5uZXJIVE1MID0gXCJcIik7XHJcblxyXG5cdFx0Ly8gZGlzcGxheSB0aGUgY29udGVudCBmb3IgdGhlIHZpZXdcclxuXHRcdHZhciB1cGRhdGVWaWV3ID0gKCkgPT4ge1xyXG5cdFx0XHQvLyBkZXN0cm95IGFueSBsaXN0ZW5lcnMgZnJvbSBvbGQgY29udGVudFxyXG5cdFx0XHRpZihkaXNwb3NhYmxlKSB7XHJcblx0XHRcdFx0ZGlzcG9zYWJsZS5kaXNwb3NlKCk7XHJcblx0XHRcdH1cclxuXHJcblx0XHRcdC8vIHJlbW92ZSBhbnkgYWN0aW9uIGJ1dHRvbnNcclxuXHRcdFx0bGlmZUxpbmUuZW1pdChcImFjdGlvbi1yZW1vdmUtYWxsXCIpO1xyXG5cclxuXHRcdFx0Ly8gY2xlYXIgYWxsIHRoZSBvbGQgY29udGVudFxyXG5cdFx0XHRjb250ZW50LmlubmVySFRNTCA9IFwiXCI7XHJcblxyXG5cdFx0XHQvLyBjcmVhdGUgdGhlIGRpc3Bvc2FibGUgZm9yIHRoZSBjb250ZW50XHJcblx0XHRcdGRpc3Bvc2FibGUgPSBuZXcgbGlmZUxpbmUuRGlzcG9zYWJsZSgpO1xyXG5cclxuXHRcdFx0dmFyIG1ha2VyID0gbm90Rm91bmRNYWtlciwgbWF0Y2g7XHJcblxyXG5cdFx0XHQvLyBmaW5kIHRoZSBjb3JyZWN0IGNvbnRlbnQgbWFrZXJcclxuXHRcdFx0Zm9yKGxldCAkbWFrZXIgb2YgY29udGVudE1ha2Vycykge1xyXG5cdFx0XHRcdC8vIHJ1biBhIG1hdGNoZXIgZnVuY3Rpb25cclxuXHRcdFx0XHRpZih0eXBlb2YgJG1ha2VyLm1hdGNoZXIgPT0gXCJmdW5jdGlvblwiKSB7XHJcblx0XHRcdFx0XHRtYXRjaCA9ICRtYWtlci5tYXRjaGVyKGxvY2F0aW9uLnBhdGhuYW1lKTtcclxuXHRcdFx0XHR9XHJcblx0XHRcdFx0Ly8gYSBzdHJpbmcgbWF0Y2hcclxuXHRcdFx0XHRlbHNlIGlmKHR5cGVvZiAkbWFrZXIubWF0Y2hlciA9PSBcInN0cmluZ1wiKSB7XHJcblx0XHRcdFx0XHRpZigkbWFrZXIubWF0Y2hlciA9PSBsb2NhdGlvbi5wYXRobmFtZSkge1xyXG5cdFx0XHRcdFx0XHRtYXRjaCA9ICRtYWtlci5tYXRjaGVyO1xyXG5cdFx0XHRcdFx0fVxyXG5cdFx0XHRcdH1cclxuXHRcdFx0XHQvLyBhIHJlZ2V4IG1hdGNoXHJcblx0XHRcdFx0ZWxzZSB7XHJcblx0XHRcdFx0XHRtYXRjaCA9ICRtYWtlci5tYXRjaGVyLmV4ZWMobG9jYXRpb24ucGF0aG5hbWUpO1xyXG5cdFx0XHRcdH1cclxuXHJcblx0XHRcdFx0Ly8gbWF0Y2ggZm91bmQgc3RvcCBzZWFyY2hpbmdcclxuXHRcdFx0XHRpZihtYXRjaCkge1xyXG5cdFx0XHRcdFx0bWFrZXIgPSAkbWFrZXI7XHJcblxyXG5cdFx0XHRcdFx0YnJlYWs7XHJcblx0XHRcdFx0fVxyXG5cdFx0XHR9XHJcblxyXG5cdFx0XHQvLyBtYWtlIHRoZSBjb250ZW50IGZvciB0aGlzIHJvdXRlXHJcblx0XHRcdG1ha2VyLm1ha2Uoe2Rpc3Bvc2FibGUsIHNldFRpdGxlLCBjb250ZW50LCBtYXRjaH0pO1xyXG5cdFx0fTtcclxuXHJcblx0XHQvLyBzd2l0Y2ggcGFnZXNcclxuXHRcdGxpZmVMaW5lLm5hdi5uYXZpZ2F0ZSA9IGZ1bmN0aW9uKHVybCkge1xyXG5cdFx0XHQvLyB1cGRhdGUgdGhlIHVybFxyXG5cdFx0XHRoaXN0b3J5LnB1c2hTdGF0ZShudWxsLCBudWxsLCB1cmwpO1xyXG5cclxuXHRcdFx0Ly8gc2hvdyB0aGUgbmV3IHZpZXdcclxuXHRcdFx0dXBkYXRlVmlldygpO1xyXG5cdFx0fTtcclxuXHJcblx0XHQvLyBzd2l0Y2ggcGFnZXMgd2hlbiB0aGUgdXNlciBwdXNoZXMgdGhlIGJhY2sgYnV0dG9uXHJcblx0XHR3aW5kb3cuYWRkRXZlbnRMaXN0ZW5lcihcInBvcHN0YXRlXCIsICgpID0+IHVwZGF0ZVZpZXcoKSk7XHJcblxyXG5cdFx0Ly8gc2hvdyB0aGUgaW5pdGlhbCB2aWV3XHJcblx0XHR1cGRhdGVWaWV3KCk7XHJcblx0fVxyXG59KTtcclxuXHJcbi8vIGFsbCBjb250ZW50IHByb2R1Y2Vyc1xyXG52YXIgY29udGVudE1ha2VycyA9IFtdO1xyXG5cclxuLy8gY3JlYXRlIHRoZSBuYW1lc3BhY2VcclxubGlmZUxpbmUubmF2ID0ge307XHJcblxyXG4vLyByZWdpc3RlciBhIGNvbnRlbnQgbWFrZXJcclxubGlmZUxpbmUubmF2LnJlZ2lzdGVyID0gZnVuY3Rpb24obWFrZXIpIHtcclxuXHRjb250ZW50TWFrZXJzLnB1c2gobWFrZXIpO1xyXG59O1xyXG5cclxuLy8gdGhlIGZhbGwgYmFjayBtYWtlciBmb3Igbm8gc3VjaCBwYWdlXHJcbnZhciBub3RGb3VuZE1ha2VyID0ge1xyXG5cdG1ha2Uoe3NldFRpdGxlLCBjb250ZW50fSkge1xyXG5cdFx0Ly8gdXBkYXRlIHRoZSBwYWdlIHRpdGxlXHJcblx0XHRzZXRUaXRsZShcIk5vdCBmb3VuZFwiKTtcclxuXHJcblx0XHRsaWZlTGluZS5tYWtlRG9tKHtcclxuXHRcdFx0cGFyZW50OiBjb250ZW50LFxyXG5cdFx0XHRjbGFzc2VzOiBcImNvbnRlbnQtcGFkZGVkXCIsXHJcblx0XHRcdGNoaWxkcmVuOiBbXHJcblx0XHRcdFx0e1xyXG5cdFx0XHRcdFx0dGFnOiBcInNwYW5cIixcclxuXHRcdFx0XHRcdHRleHQ6IFwiVGhlIHBhZ2UgeW91IGFyZSBsb29raW5nIGZvciBjb3VsZCBub3QgYmUgZm91bmQuIFwiXHJcblx0XHRcdFx0fSxcclxuXHRcdFx0XHR7XHJcblx0XHRcdFx0XHR3aWRnZXQ6IFwibGlua1wiLFxyXG5cdFx0XHRcdFx0aHJlZjogXCIvXCIsXHJcblx0XHRcdFx0XHR0ZXh0OiBcIkdvIGhvbWVcIlxyXG5cdFx0XHRcdH1cclxuXHRcdFx0XVxyXG5cdFx0fSk7XHJcblx0fVxyXG59O1xyXG4iLCIvKipcclxuICogQ3JlYXRlIGFuIGlucHV0IGZpZWxkXHJcbiAqL1xyXG5cclxubGlmZUxpbmUubWFrZURvbS5yZWdpc3RlcihcImlucHV0XCIsIHtcclxuXHRtYWtlKHt0YWcsIHR5cGUsIHZhbHVlLCBjaGFuZ2UsIGJpbmQsIHByb3AsIHBsYWNlaG9sZGVyLCBjbGFzc2VzfSkge1xyXG5cdFx0Ly8gc2V0IHRoZSBpbml0aWFsIHZhbHVlIG9mIHRoZSBib3VuZCBvYmplY3RcclxuXHRcdGlmKHR5cGVvZiBiaW5kID09IFwib2JqZWN0XCIgJiYgIXZhbHVlKSB7XHJcblx0XHRcdHZhbHVlID0gYmluZFtwcm9wXTtcclxuXHRcdH1cclxuXHJcblx0XHR2YXIgaW5wdXQgPSB7XHJcblx0XHRcdHRhZzogdGFnIHx8IFwiaW5wdXRcIixcclxuXHRcdFx0Y2xhc3NlczogY2xhc3NlcyB8fCBgJHt0YWcgPT0gXCJ0ZXh0YXJlYVwiID8gXCJ0ZXh0YXJlYVwiIDogXCJpbnB1dFwifS1maWxsYCxcclxuXHRcdFx0YXR0cnM6IHt9LFxyXG5cdFx0XHRvbjoge1xyXG5cdFx0XHRcdGlucHV0OiBlID0+IHtcclxuXHRcdFx0XHRcdC8vIHVwZGF0ZSB0aGUgcHJvcGVydHkgY2hhbmdlZFxyXG5cdFx0XHRcdFx0aWYodHlwZW9mIGJpbmQgPT0gXCJvYmplY3RcIikge1xyXG5cdFx0XHRcdFx0XHRiaW5kW3Byb3BdID0gZS50YXJnZXQudmFsdWU7XHJcblx0XHRcdFx0XHR9XHJcblxyXG5cdFx0XHRcdFx0Ly8gY2FsbCB0aGUgY2FsbGJhY2tcclxuXHRcdFx0XHRcdGlmKHR5cGVvZiBjaGFuZ2UgPT0gXCJmdW5jdGlvblwiKSB7XHJcblx0XHRcdFx0XHRcdGNoYW5nZShlLnRhcmdldC52YWx1ZSk7XHJcblx0XHRcdFx0XHR9XHJcblx0XHRcdFx0fVxyXG5cdFx0XHR9XHJcblx0XHR9O1xyXG5cclxuXHRcdC8vIGF0dGFjaCB2YWx1ZXMgaWYgdGhleSBhcmUgZ2l2ZW5cclxuXHRcdGlmKHR5cGUpIGlucHV0LmF0dHJzLnR5cGUgPSB0eXBlO1xyXG5cdFx0aWYodmFsdWUpIGlucHV0LmF0dHJzLnZhbHVlID0gdmFsdWU7XHJcblx0XHRpZihwbGFjZWhvbGRlcikgaW5wdXQuYXR0cnMucGxhY2Vob2xkZXIgPSBwbGFjZWhvbGRlcjtcclxuXHJcblx0XHQvLyBmb3IgdGV4dGFyZWFzIHNldCBpbm5lclRleHRcclxuXHRcdGlmKHRhZyA9PSBcInRleHRhcmVhXCIpIHtcclxuXHRcdFx0aW5wdXQudGV4dCA9IHZhbHVlO1xyXG5cdFx0fVxyXG5cclxuXHRcdHJldHVybiBpbnB1dDtcclxuXHR9XHJcbn0pO1xyXG4iLCIvKipcclxuICogQSB3aWRnZXQgdGhhdCBjcmVhdGVzIGEgbGluayB0aGF0IGhvb2tzIGludG8gdGhlIG5hdmlnYXRvclxyXG4gKi9cclxuXHJcbmxpZmVMaW5lLm1ha2VEb20ucmVnaXN0ZXIoXCJsaW5rXCIsIHtcclxuXHRtYWtlKG9wdHMpIHtcclxuXHRcdHJldHVybiB7XHJcblx0XHRcdHRhZzogXCJhXCIsXHJcblx0XHRcdGF0dHJzOiB7XHJcblx0XHRcdFx0aHJlZjogb3B0cy5ocmVmXHJcblx0XHRcdH0sXHJcblx0XHRcdG9uOiB7XHJcblx0XHRcdFx0Y2xpY2s6IGUgPT4ge1xyXG5cdFx0XHRcdFx0Ly8gZG9uJ3Qgb3ZlciByaWRlIGN0cmwgb3IgYWx0IG9yIHNoaWZ0IGNsaWNrc1xyXG5cdFx0XHRcdFx0aWYoZS5jdHJsS2V5IHx8IGUuYWx0S2V5IHx8IGUuc2hpZnRLZXkpIHJldHVybjtcclxuXHJcblx0XHRcdFx0XHQvLyBkb24ndCBuYXZpZ2F0ZSB0aGUgcGFnZVxyXG5cdFx0XHRcdFx0ZS5wcmV2ZW50RGVmYXVsdCgpO1xyXG5cclxuXHRcdFx0XHRcdGxpZmVMaW5lLm5hdi5uYXZpZ2F0ZShvcHRzLmhyZWYpXHJcblx0XHRcdFx0fVxyXG5cdFx0XHR9LFxyXG5cdFx0XHR0ZXh0OiBvcHRzLnRleHRcclxuXHRcdH07XHJcblx0fVxyXG59KTtcclxuIiwiLyoqXHJcbiAqIERpc3BsYXkgYSBsaXN0IHdpdGggZ3JvdXAgaGVhZGluZ3NcclxuICovXHJcblxyXG5saWZlTGluZS5tYWtlRG9tLnJlZ2lzdGVyKFwibGlzdFwiLCB7XHJcblx0bWFrZSh7aXRlbXN9KSB7XHJcblx0XHQvLyBhZGQgYWxsIHRoZSBncm91cHNcclxuXHRcdHJldHVybiBPYmplY3QuZ2V0T3duUHJvcGVydHlOYW1lcyhpdGVtcylcclxuXHJcblx0XHQubWFwKGdyb3VwTmFtZSA9PiBtYWtlR3JvdXAoZ3JvdXBOYW1lLCBpdGVtc1tncm91cE5hbWVdKSk7XHJcblx0fVxyXG59KTtcclxuXHJcbi8vIG1ha2UgYSBzaW5nbGUgZ3JvdXBcclxudmFyIG1ha2VHcm91cCA9IGZ1bmN0aW9uKG5hbWUsIGl0ZW1zLCBwYXJlbnQpIHtcclxuXHQvLyBhZGQgdGhlIGxpc3QgaGVhZGVyXHJcblx0aXRlbXMudW5zaGlmdCh7XHJcblx0XHRjbGFzc2VzOiBcImxpc3QtaGVhZGVyXCIsXHJcblx0XHR0ZXh0OiBuYW1lXHJcblx0fSk7XHJcblxyXG5cdC8vIHJlbmRlciB0aGUgaXRlbVxyXG5cdHJldHVybiB7XHJcblx0XHRwYXJlbnQsXHJcblx0XHRjbGFzc2VzOiBcImxpc3Qtc2VjdGlvblwiLFxyXG5cdFx0Y2hpbGRyZW46IGl0ZW1zLm1hcCgoaXRlbSwgaW5kZXgpID0+IHtcclxuXHRcdFx0Ly8gZG9uJ3QgbW9kaWZ5IHRoZSBoZWFkZXJcclxuXHRcdFx0aWYoaW5kZXggPT09IDApIHJldHVybiBpdGVtO1xyXG5cclxuXHRcdFx0dmFyIGl0ZW1Eb207XHJcblxyXG5cdFx0XHQvLyBjcmVhdGUgYW4gaXRlbVxyXG5cdFx0XHRpZih0eXBlb2YgaXRlbSAhPSBcInN0cmluZ1wiKSB7XHJcblx0XHRcdFx0aXRlbURvbSA9IHtcclxuXHRcdFx0XHRcdGNsYXNzZXM6IFwibGlzdC1pdGVtXCIsXHJcblx0XHRcdFx0XHRjaGlsZHJlbjogKGl0ZW0uaXRlbXMgfHwgaXRlbSkubWFwKGl0ZW0gPT4ge1xyXG5cdFx0XHRcdFx0XHRyZXR1cm4ge1xyXG5cdFx0XHRcdFx0XHRcdC8vIGdldCB0aGUgbmFtZSBvZiB0aGUgaXRlbVxyXG5cdFx0XHRcdFx0XHRcdHRleHQ6IHR5cGVvZiBpdGVtID09IFwic3RyaW5nXCIgPyBpdGVtIDogaXRlbS50ZXh0LFxyXG5cdFx0XHRcdFx0XHRcdC8vIHNldCB3aGV0aGVyIHRoZSBpdGVtIHNob3VsZCBncm93XHJcblx0XHRcdFx0XHRcdFx0Y2xhc3NlczogaXRlbS5ncm93ID8gXCJsaXN0LWl0ZW0tZ3Jvd1wiIDogXCJsaXN0LWl0ZW0tcGFydFwiXHJcblx0XHRcdFx0XHRcdH07XHJcblx0XHRcdFx0XHR9KVxyXG5cdFx0XHRcdH07XHJcblx0XHRcdH1cclxuXHRcdFx0ZWxzZSB7XHJcblx0XHRcdFx0aXRlbURvbSA9IHtcclxuXHRcdFx0XHRcdGNsYXNzZXM6IFwibGlzdC1pdGVtXCIsXHJcblx0XHRcdFx0XHR0ZXh0OiBpdGVtXHJcblx0XHRcdFx0fTtcclxuXHRcdFx0fVxyXG5cclxuXHRcdFx0Ly8gbWFrZSB0aGUgaXRlbSBhIGxpbmtcclxuXHRcdFx0aWYoaXRlbS5ocmVmKSB7XHJcblx0XHRcdFx0aXRlbURvbS5vbiA9IHtcclxuXHRcdFx0XHRcdGNsaWNrOiAoKSA9PiBsaWZlTGluZS5uYXYubmF2aWdhdGUoaXRlbS5ocmVmKVxyXG5cdFx0XHRcdH07XHJcblx0XHRcdH1cclxuXHJcblx0XHRcdHJldHVybiBpdGVtRG9tO1xyXG5cdFx0fSlcclxuXHR9O1xyXG59O1xyXG4iLCIvKipcclxuICogVGhlIHdpZGdldCBmb3IgdGhlIHNpZGViYXJcclxuICovXHJcblxyXG5saWZlTGluZS5tYWtlRG9tLnJlZ2lzdGVyKFwic2lkZWJhclwiLCB7XHJcblx0bWFrZSgpIHtcclxuXHRcdHJldHVybiBbXHJcblx0XHRcdHtcclxuXHRcdFx0XHRjbGFzc2VzOiBcInNpZGViYXJcIixcclxuXHRcdFx0XHRuYW1lOiBcInNpZGViYXJcIixcclxuXHRcdFx0XHRjaGlsZHJlbjogW1xyXG5cdFx0XHRcdFx0e1xyXG5cdFx0XHRcdFx0XHRjbGFzc2VzOiBbXCJzaWRlYmFyLWFjdGlvbnNcIiwgXCJoaWRkZW5cIl0sXHJcblx0XHRcdFx0XHRcdG5hbWU6IFwiYWN0aW9uc1wiLFxyXG5cdFx0XHRcdFx0XHRjaGlsZHJlbjogW1xyXG5cdFx0XHRcdFx0XHRcdHtcclxuXHRcdFx0XHRcdFx0XHRcdGNsYXNzZXM6IFwic2lkZWJhci1oZWFkaW5nXCIsXHJcblx0XHRcdFx0XHRcdFx0XHR0ZXh0OiBcIlBhZ2UgYWN0aW9uc1wiXHJcblx0XHRcdFx0XHRcdFx0fVxyXG5cdFx0XHRcdFx0XHRdXHJcblx0XHRcdFx0XHR9LFxyXG5cdFx0XHRcdFx0e1xyXG5cdFx0XHRcdFx0XHRjbGFzc2VzOiBcInNpZGViYXItaGVhZGluZ1wiLFxyXG5cdFx0XHRcdFx0XHR0ZXh0OiBcIk1vcmUgYWN0aW9uc1wiXHJcblx0XHRcdFx0XHR9XHJcblx0XHRcdFx0XVxyXG5cdFx0XHR9LFxyXG5cdFx0XHR7XHJcblx0XHRcdFx0Y2xhc3NlczogXCJzaGFkZVwiLFxyXG5cdFx0XHRcdG9uOiB7XHJcblx0XHRcdFx0XHQvLyBjbG9zZSB0aGUgc2lkZWJhclxyXG5cdFx0XHRcdFx0Y2xpY2s6ICgpID0+IGRvY3VtZW50LmJvZHkuY2xhc3NMaXN0LnJlbW92ZShcInNpZGViYXItb3BlblwiKVxyXG5cdFx0XHRcdH1cclxuXHRcdFx0fVxyXG5cdFx0XTtcclxuXHR9LFxyXG5cclxuXHRiaW5kKG9wdHMsIHthY3Rpb25zLCBzaWRlYmFyfSkge1xyXG5cdFx0Ly8gYWRkIGEgY29tbWFuZCB0byB0aGUgc2lkZWJhclxyXG5cdFx0bGlmZUxpbmUuYWRkQ29tbWFuZCA9IGZ1bmN0aW9uKG5hbWUsIGZuKSB7XHJcblx0XHRcdC8vIG1ha2UgdGhlIHNpZGViYXIgaXRlbVxyXG5cdFx0XHR2YXIge2l0ZW19ID0gbGlmZUxpbmUubWFrZURvbSh7XHJcblx0XHRcdFx0cGFyZW50OiBzaWRlYmFyLFxyXG5cdFx0XHRcdHRhZzogXCJkaXZcIixcclxuXHRcdFx0XHRuYW1lOiBcIml0ZW1cIixcclxuXHRcdFx0XHRjbGFzc2VzOiBcInNpZGViYXItaXRlbVwiLFxyXG5cdFx0XHRcdHRleHQ6IG5hbWUsXHJcblx0XHRcdFx0b246IHtcclxuXHRcdFx0XHRcdGNsaWNrOiAoKSA9PiB7XHJcblx0XHRcdFx0XHRcdC8vIGNsb3NlIHRoZSBzaWRlYmFyXHJcblx0XHRcdFx0XHRcdGRvY3VtZW50LmJvZHkuY2xhc3NMaXN0LnJlbW92ZShcInNpZGViYXItb3BlblwiKTtcclxuXHJcblx0XHRcdFx0XHRcdC8vIGNhbGwgdGhlIGxpc3RlbmVyXHJcblx0XHRcdFx0XHRcdGZuKCk7XHJcblx0XHRcdFx0XHR9XHJcblx0XHRcdFx0fVxyXG5cdFx0XHR9KTtcclxuXHJcblx0XHRcdHJldHVybiB7XHJcblx0XHRcdFx0dW5zdWJzY3JpYmU6ICgpID0+IGl0ZW0ucmVtb3ZlKClcclxuXHRcdFx0fTtcclxuXHRcdH07XHJcblxyXG5cdFx0Ly8gYWRkIGEgbmF2aWdhdGlvbmFsIGNvbW1hbmRcclxuXHRcdGxpZmVMaW5lLmFkZE5hdkNvbW1hbmQgPSBmdW5jdGlvbihuYW1lLCB0bykge1xyXG5cdFx0XHRsaWZlTGluZS5hZGRDb21tYW5kKG5hbWUsICgpID0+IGxpZmVMaW5lLm5hdi5uYXZpZ2F0ZSh0bykpO1xyXG5cdFx0fTtcclxuXHJcblx0XHQvLyBhZGQgYSBzaWRlYmFyIGFjdGlvblxyXG5cdFx0bGlmZUxpbmUub24oXCJhY3Rpb24tY3JlYXRlXCIsIG5hbWUgPT4ge1xyXG5cdFx0XHQvLyBzaG93IHRoZSBhY3Rpb25zXHJcblx0XHRcdGFjdGlvbnMuY2xhc3NMaXN0LnJlbW92ZShcImhpZGRlblwiKTtcclxuXHJcblx0XHRcdC8vIGNyZWF0ZSB0aGUgYnV0dG9uXHJcblx0XHRcdGxpZmVMaW5lLm1ha2VEb20oe1xyXG5cdFx0XHRcdHBhcmVudDogYWN0aW9ucyxcclxuXHRcdFx0XHR0YWc6IFwiZGl2XCIsXHJcblx0XHRcdFx0bmFtZTogXCJpdGVtXCIsXHJcblx0XHRcdFx0Y2xhc3NlczogXCJzaWRlYmFyLWl0ZW1cIixcclxuXHRcdFx0XHR0ZXh0OiBuYW1lLFxyXG5cdFx0XHRcdGF0dHJzOiB7XHJcblx0XHRcdFx0XHRcImRhdGEtbmFtZVwiOiBuYW1lXHJcblx0XHRcdFx0fSxcclxuXHRcdFx0XHRvbjoge1xyXG5cdFx0XHRcdFx0Y2xpY2s6ICgpID0+IHtcclxuXHRcdFx0XHRcdFx0Ly8gY2xvc2UgdGhlIHNpZGViYXJcclxuXHRcdFx0XHRcdFx0ZG9jdW1lbnQuYm9keS5jbGFzc0xpc3QucmVtb3ZlKFwic2lkZWJhci1vcGVuXCIpO1xyXG5cclxuXHRcdFx0XHRcdFx0Ly8gdHJpZ2dlciB0aGUgYWN0aW9uXHJcblx0XHRcdFx0XHRcdGxpZmVMaW5lLmVtaXQoXCJhY3Rpb24tZXhlYy1cIiArIG5hbWUpO1xyXG5cdFx0XHRcdFx0fVxyXG5cdFx0XHRcdH1cclxuXHRcdFx0fSk7XHJcblxyXG5cdFx0XHQvLyByZW1vdmUgYSBzaWRlYmFyIGFjdGlvblxyXG5cdFx0XHRsaWZlTGluZS5vbihcImFjdGlvbi1yZW1vdmVcIiwgbmFtZSA9PiB7XHJcblx0XHRcdFx0Ly8gcmVtb3ZlIHRoZSBidXR0b25cclxuXHRcdFx0XHR2YXIgYnRuID0gYWN0aW9ucy5xdWVyeVNlbGVjdG9yKGBbZGF0YS1uYW1lPVwiJHtuYW1lfVwiXWApO1xyXG5cclxuXHRcdFx0XHRpZihidG4pIGJ0bi5yZW1vdmUoKTtcclxuXHJcblx0XHRcdFx0Ly8gaGlkZSB0aGUgcGFnZSBhY3Rpb25zIGlmIHRoZXJlIGFyZSBub25lXHJcblx0XHRcdFx0aWYoYWN0aW9ucy5jaGlsZHJlbi5sZW5ndGggPT0gMSkge1xyXG5cdFx0XHRcdFx0YWN0aW9ucy5jbGFzc0xpc3QuYWRkKFwiaGlkZGVuXCIpO1xyXG5cdFx0XHRcdH1cclxuXHRcdFx0fSk7XHJcblxyXG5cdFx0XHQvLyByZW1vdmUgYWxsIHRoZSBzaWRlYmFyIGFjdGlvbnNcclxuXHRcdFx0bGlmZUxpbmUub24oXCJhY3Rpb24tcmVtb3ZlLWFsbFwiLCAoKSA9PiB7XHJcblx0XHRcdFx0Ly8gcmVtb3ZlIGFsbCB0aGUgYWN0aW9uc1xyXG5cdFx0XHRcdHZhciBfYWN0aW9ucyA9IEFycmF5LmZyb20oYWN0aW9ucy5xdWVyeVNlbGVjdG9yQWxsKFwiLnNpZGViYXItaXRlbVwiKSk7XHJcblxyXG5cdFx0XHRcdF9hY3Rpb25zLmZvckVhY2goYWN0aW9uID0+IGFjdGlvbi5yZW1vdmUoKSk7XHJcblxyXG5cdFx0XHRcdC8vIHNpZGUgdGhlIHBhZ2UgYWN0aW9uc1xyXG5cdFx0XHRcdGFjdGlvbnMuY2xhc3NMaXN0LmFkZChcImhpZGRlblwiKTtcclxuXHRcdFx0fSk7XHJcblx0XHR9KTtcclxuXHR9XHJcbn0pO1xyXG4iLCIvKipcclxuICogQSByb3cgb2YgcmFkaW8gc3R5bGUgYnV0dG9uc1xyXG4gKi9cclxuXHJcbmxpZmVMaW5lLm1ha2VEb20ucmVnaXN0ZXIoXCJ0b2dnbGUtYnRuc1wiLCB7XHJcblx0bWFrZSh7YnRucywgdmFsdWV9KSB7XHJcblx0XHQvLyBhdXRvIHNlbGVjdCB0aGUgZmlyc3QgYnV0dG9uXHJcblx0XHRpZighdmFsdWUpIHtcclxuXHRcdFx0dmFsdWUgPSB0eXBlb2YgYnRuc1swXSA9PSBcInN0cmluZ1wiID8gYnRuc1swXSA6IGJ0bnNbMF0udmFsdWU7XHJcblx0XHR9XHJcblxyXG5cdFx0cmV0dXJuIHtcclxuXHRcdFx0bmFtZTogXCJ0b2dnbGVCYXJcIixcclxuXHRcdFx0Y2xhc3NlczogXCJ0b2dnbGUtYmFyXCIsXHJcblx0XHRcdGNoaWxkcmVuOiBidG5zLm1hcChidG4gPT4ge1xyXG5cdFx0XHRcdC8vIGNvbnZlcnQgdGhlIHBsYWluIHN0cmluZyB0byBhbiBvYmplY3RcclxuXHRcdFx0XHRpZih0eXBlb2YgYnRuID09IFwic3RyaW5nXCIpIHtcclxuXHRcdFx0XHRcdGJ0biA9IHsgdGV4dDogYnRuLCB2YWx1ZTogYnRuIH07XHJcblx0XHRcdFx0fVxyXG5cclxuXHRcdFx0XHR2YXIgY2xhc3NlcyA9IFtcInRvZ2dsZS1idG5cIl07XHJcblxyXG5cdFx0XHRcdC8vIGFkZCB0aGUgc2VsZWN0ZWQgY2xhc3NcclxuXHRcdFx0XHRpZih2YWx1ZSA9PSBidG4udmFsdWUpIHtcclxuXHRcdFx0XHRcdGNsYXNzZXMucHVzaChcInRvZ2dsZS1idG4tc2VsZWN0ZWRcIik7XHJcblxyXG5cdFx0XHRcdFx0Ly8gZG9uJ3Qgc2VsZWN0IHR3byBidXR0b25zXHJcblx0XHRcdFx0XHR2YWx1ZSA9IHVuZGVmaW5lZDtcclxuXHRcdFx0XHR9XHJcblxyXG5cdFx0XHRcdHJldHVybiB7XHJcblx0XHRcdFx0XHR0YWc6IFwiYnV0dG9uXCIsXHJcblx0XHRcdFx0XHRjbGFzc2VzLFxyXG5cdFx0XHRcdFx0dGV4dDogYnRuLnRleHQsXHJcblx0XHRcdFx0XHRhdHRyczoge1xyXG5cdFx0XHRcdFx0XHRcImRhdGEtdmFsdWVcIjogYnRuLnZhbHVlXHJcblx0XHRcdFx0XHR9XHJcblx0XHRcdFx0fTtcclxuXHRcdFx0fSlcclxuXHRcdH07XHJcblx0fSxcclxuXHJcblx0YmluZCh7Y2hhbmdlfSwge3RvZ2dsZUJhcn0pIHtcclxuXHRcdC8vIGF0dGFjaCBsaXN0ZW5lcnNcclxuXHRcdGZvcihsZXQgYnRuIG9mIHRvZ2dsZUJhci5xdWVyeVNlbGVjdG9yQWxsKFwiLnRvZ2dsZS1idG5cIikpIHtcclxuXHRcdFx0YnRuLmFkZEV2ZW50TGlzdGVuZXIoXCJjbGlja1wiLCAoKSA9PiB7XHJcblx0XHRcdFx0dmFyIHNlbGVjdGVkID0gdG9nZ2xlQmFyLnF1ZXJ5U2VsZWN0b3IoXCIudG9nZ2xlLWJ0bi1zZWxlY3RlZFwiKTtcclxuXHJcblx0XHRcdFx0Ly8gdGhlIGJ1dHRvbiBoYXMgYWxyZWFkeSBiZWVuIHNlbGVjdGVkXHJcblx0XHRcdFx0aWYoc2VsZWN0ZWQgPT0gYnRuKSB7XHJcblx0XHRcdFx0XHRyZXR1cm47XHJcblx0XHRcdFx0fVxyXG5cclxuXHRcdFx0XHQvLyB1bnRvZ2dsZSB0aGUgb3RoZXIgYnV0dG9uXHJcblx0XHRcdFx0aWYoc2VsZWN0ZWQpIHtcclxuXHRcdFx0XHRcdHNlbGVjdGVkLmNsYXNzTGlzdC5yZW1vdmUoXCJ0b2dnbGUtYnRuLXNlbGVjdGVkXCIpO1xyXG5cdFx0XHRcdH1cclxuXHJcblx0XHRcdFx0Ly8gc2VsZWN0IHRoaXMgYnV0dG9uXHJcblx0XHRcdFx0YnRuLmNsYXNzTGlzdC5hZGQoXCJ0b2dnbGUtYnRuLXNlbGVjdGVkXCIpO1xyXG5cclxuXHRcdFx0XHQvLyB0cmlnZ2VyIGEgc2VsZWN0aW9uIGNoYW5nZVxyXG5cdFx0XHRcdGNoYW5nZShidG4uZGF0YXNldC52YWx1ZSk7XHJcblx0XHRcdH0pO1xyXG5cdFx0fVxyXG5cdH1cclxufSk7XHJcbiIsIi8qKlxyXG4gKiBOYW1lIGdlbmVyYXRvciBmb3IgYmFja3Vwc1xyXG4gKi9cclxuXHJcbmV4cG9ydHMuZ2VuQmFja3VwTmFtZSA9IGZ1bmN0aW9uKGRhdGUgPSBuZXcgRGF0ZSgpKSB7XHJcblx0cmV0dXJuIGBiYWNrdXAtJHtkYXRlLmdldEZ1bGxZZWFyKCl9LSR7ZGF0ZS5nZXRNb250aCgpKzF9LSR7ZGF0ZS5nZXREYXRlKCl9YFxyXG5cdFx0KyBgLSR7ZGF0ZS5nZXRIb3VycygpfS0ke2RhdGUuZ2V0TWludXRlcygpfS56aXBgO1xyXG59O1xyXG4iLCIvKipcclxuICogQW4gYWRhcHRvciBmb3IgaHR0cCBiYXNlZCBzdG9yZXNcclxuICovXHJcblxyXG5jbGFzcyBIdHRwQWRhcHRvciB7XHJcblx0Y29uc3RydWN0b3Iob3B0cykge1xyXG5cdFx0Ly8gaWYgd2UgYXJlIGp1c3QgZ2l2ZW4gYSBzdHJpbmcgdXNlIGl0IGFzIHRoZSBzb3VyY2VcclxuXHRcdGlmKHR5cGVvZiBvcHRzID09IFwic3RyaW5nXCIpIHtcclxuXHRcdFx0b3B0cyA9IHtcclxuXHRcdFx0XHRzcmM6IG9wdHNcclxuXHRcdFx0fTtcclxuXHRcdH1cclxuXHJcblx0XHQvLyBzYXZlIHRoZSBvcHRpb25zXHJcblx0XHR0aGlzLl9vcHRzID0gb3B0cztcclxuXHR9XHJcblxyXG5cdC8vIGNyZWF0ZSB0aGUgb3B0aW9ucyBmb3IgYSBmZXRjaCByZXF1ZXN0XHJcblx0X2NyZWF0ZU9wdHMoKSB7XHJcblx0XHR2YXIgb3B0cyA9IHt9O1xyXG5cclxuXHRcdC8vIHVzZSB0aGUgc2Vzc2lvbiBjb29raWUgd2Ugd2VyZSBnaXZlblxyXG5cdFx0aWYodGhpcy5fb3B0cy5zZXNzaW9uKSB7XHJcblx0XHRcdG9wdHMuaGVhZGVycyA9IHtcclxuXHRcdFx0XHRjb29raWU6IGBzZXNzaW9uPSR7dGhpcy5fb3B0cy5zZXNzaW9ufWBcclxuXHRcdFx0fTtcclxuXHRcdH1cclxuXHRcdC8vIHVzZSB0aGUgY3JlYWRlbnRpYWxzIGZyb20gdGhlIGJyb3dzZXJcclxuXHRcdGVsc2Uge1xyXG5cdFx0XHRvcHRzLmNyZWFkZW50aWFscyA9IFwiaW5jbHVkZVwiO1xyXG5cdFx0fVxyXG5cclxuXHRcdHJldHVybiBvcHRzO1xyXG5cdH1cclxuXHJcblx0LyoqXHJcblx0ICogR2V0IGFsbCB0aGUgdmFsdWVzIGluIGEgc3RvcmVcclxuXHQgKi9cclxuXHRnZXRBbGwoKSB7XHJcblx0XHRyZXR1cm4gZmV0Y2godGhpcy5fb3B0cy5zcmMsIHRoaXMuX2NyZWF0ZU9wdHMoKSlcclxuXHJcblx0XHQvLyBwYXJzZSB0aGUganNvbiByZXNwb25zZVxyXG5cdFx0LnRoZW4ocmVzID0+IHJlcy5qc29uKCkpXHJcblx0fVxyXG5cclxuXHQvKipcclxuXHQgKiBHZXQgYSBzaW5nbGUgdmFsdWVcclxuXHQgKi9cclxuXHRnZXQoa2V5KSB7XHJcblx0XHRyZXR1cm4gZmV0Y2godGhpcy5fb3B0cy5zcmMgKyBcInZhbHVlL1wiICsga2V5LCB0aGlzLl9jcmVhdGVPcHRzKCkpXHJcblxyXG5cdFx0LnRoZW4ocmVzID0+IHtcclxuXHRcdFx0Ly8gbm90IGxvZ2dlZCBpblxyXG5cdFx0XHRpZihyZXMuc3RhdHVzID09IDQwMykge1xyXG5cdFx0XHRcdGxldCBlcnJvciA9IG5ldyBFcnJvcihcIk5vdCBsb2dnZWQgaW5cIik7XHJcblxyXG5cdFx0XHRcdC8vIGFkZCBhbiBlcnJvciBjb2RlXHJcblx0XHRcdFx0ZXJyb3IuY29kZSA9IFwibm90LWxvZ2dlZC1pblwiO1xyXG5cclxuXHRcdFx0XHR0aHJvdyBlcnJvcjtcclxuXHRcdFx0fVxyXG5cclxuXHRcdFx0Ly8gbm8gc3VjaCBpdGVtXHJcblx0XHRcdGlmKHJlcy5zdGF0dXMgPT0gNDA0KSB7XHJcblx0XHRcdFx0cmV0dXJuIHVuZGVmaW5lZDtcclxuXHRcdFx0fVxyXG5cclxuXHRcdFx0Ly8gcGFyc2UgdGhlIGl0ZW1cclxuXHRcdFx0cmV0dXJuIHJlcy5qc29uKCk7XHJcblx0XHR9KTtcclxuXHR9XHJcblxyXG5cdC8qKlxyXG5cdCAqIFN0b3JlIGFuIHZhbHVlIG9uIHRoZSBzZXJ2ZXJcclxuXHQgKi9cclxuXHRzZXQodmFsdWUpIHtcclxuXHRcdHZhciBmZXRjaE9wdHMgPSB0aGlzLl9jcmVhdGVPcHRzKCk7XHJcblxyXG5cdFx0Ly8gYWRkIHRoZSBoZWFkZXJzIHRvIHRoZSBkZWZhdWx0IGhlYWRlcnNcclxuXHRcdGZldGNoT3B0cy5tZXRob2QgPSBcIlBVVFwiO1xyXG5cdFx0ZmV0Y2hPcHRzLmJvZHkgPSBKU09OLnN0cmluZ2lmeSh2YWx1ZSk7XHJcblxyXG5cdFx0Ly8gc2VuZCB0aGUgaXRlbVxyXG5cdFx0cmV0dXJuIGZldGNoKHRoaXMuX29wdHMuc3JjICsgXCJ2YWx1ZS9cIiArIHZhbHVlLmlkLCBmZXRjaE9wdHMpXHJcblxyXG5cdFx0LnRoZW4ocmVzID0+IHtcclxuXHRcdFx0Ly8gbm90IGxvZ2dlZCBpblxyXG5cdFx0XHRpZihyZXMuc3RhdHVzID09IDQwMykge1xyXG5cdFx0XHRcdGxldCBlcnJvciA9IG5ldyBFcnJvcihcIk5vdCBsb2dnZWQgaW5cIik7XHJcblxyXG5cdFx0XHRcdC8vIGFkZCBhbiBlcnJvciBjb2RlXHJcblx0XHRcdFx0ZXJyb3IuY29kZSA9IFwibm90LWxvZ2dlZC1pblwiO1xyXG5cclxuXHRcdFx0XHR0aHJvdyBlcnJvcjtcclxuXHRcdFx0fVxyXG5cdFx0fSk7XHJcblx0fVxyXG5cclxuXHQvKipcclxuXHQgKiBSZW1vdmUgdGhlIHZhbHVlIGZyb20gdGhlIHN0b3JlXHJcblx0ICovXHJcblx0cmVtb3ZlKGtleSkge1xyXG5cdFx0dmFyIGZldGNoT3B0cyA9IHRoaXMuX2NyZWF0ZU9wdHMoKTtcclxuXHJcblx0XHQvLyBhZGQgdGhlIGhlYWRlcnMgdG8gdGhlIGRlZmF1bHQgaGVhZGVyc1xyXG5cdFx0ZmV0Y2hPcHRzLm1ldGhvZCA9IFwiREVMRVRFXCI7XHJcblxyXG5cdFx0Ly8gc2VuZCB0aGUgaXRlbVxyXG5cdFx0cmV0dXJuIGZldGNoKHRoaXMuX29wdHMuc3JjICsgXCJ2YWx1ZS9cIiArIGtleSwgZmV0Y2hPcHRzKVxyXG5cclxuXHRcdC50aGVuKHJlcyA9PiB7XHJcblx0XHRcdC8vIG5vdCBsb2dnZWQgaW5cclxuXHRcdFx0aWYocmVzLnN0YXR1cyA9PSA0MDMpIHtcclxuXHRcdFx0XHRsZXQgZXJyb3IgPSBuZXcgRXJyb3IoXCJOb3QgbG9nZ2VkIGluXCIpO1xyXG5cclxuXHRcdFx0XHQvLyBhZGQgYW4gZXJyb3IgY29kZVxyXG5cdFx0XHRcdGVycm9yLmNvZGUgPSBcIm5vdC1sb2dnZWQtaW5cIjtcclxuXHJcblx0XHRcdFx0dGhyb3cgZXJyb3I7XHJcblx0XHRcdH1cclxuXHRcdH0pO1xyXG5cdH1cclxuXHJcblx0Ly8gY2hlY2sgb3VyIGFjY2VzcyBsZXZlbFxyXG5cdGFjY2Vzc0xldmVsKCkge1xyXG5cdFx0cmV0dXJuIGZldGNoKHRoaXMuX29wdHMuc3JjICsgXCJhY2Nlc3NcIiwgdGhpcy5fY3JlYXRlT3B0cygpKVxyXG5cdFx0XHQvLyB0aGUgcmVzcG9uc2UgaXMganVzdCBhIHN0cmluZ1xyXG5cdFx0XHQudGhlbihyZXMgPT4gcmVzLnRleHQoKSk7XHJcblx0fVxyXG59XHJcblxyXG5tb2R1bGUuZXhwb3J0cyA9IEh0dHBBZGFwdG9yO1xyXG4iLCIvKipcclxuICogQSBiYXNpYyBrZXkgdmFsdWUgZGF0YSBzdG9yZVxyXG4gKi9cclxuXHJcbmNsYXNzIEtleVZhbHVlU3RvcmUgZXh0ZW5kcyBsaWZlTGluZS5FdmVudEVtaXR0ZXIge1xyXG5cdGNvbnN0cnVjdG9yKGFkYXB0ZXIpIHtcclxuXHRcdHN1cGVyKCk7XHJcblx0XHR0aGlzLl9hZGFwdGVyID0gYWRhcHRlcjtcclxuXHJcblx0XHQvLyBtYWtlIHN1cmUgd2UgaGF2ZSBhbiBhZGFwdGVyXHJcblx0XHRpZighYWRhcHRlcikge1xyXG5cdFx0XHR0aHJvdyBuZXcgRXJyb3IoXCJLZXlWYWx1ZVN0b3JlIG11c3QgYmUgaW5pdGlhbGl6ZWQgd2l0aCBhbiBhZGFwdGVyXCIpXHJcblx0XHR9XHJcblx0fVxyXG5cclxuXHQvKipcclxuXHQgKiBHZXQgdGhlIGNvcnJpc3BvbmRpbmcgdmFsdWUgb3V0IG9mIHRoZSBkYXRhIHN0b3JlIG90aGVyd2lzZSByZXR1cm4gZGVmYXVsdFxyXG5cdCAqL1xyXG5cdGdldChrZXksIF9kZWZhdWx0KSB7XHJcblx0XHQvLyBjaGVjayBpZiB0aGlzIHZhbHVlIGhhcyBiZWVuIG92ZXJyaWRlblxyXG5cdFx0aWYodGhpcy5fb3ZlcnJpZGVzICYmIHRoaXMuX292ZXJyaWRlcy5oYXNPd25Qcm9wZXJ0eShrZXkpKSB7XHJcblx0XHRcdHJldHVybiBQcm9taXNlLnJlc29sdmUodGhpcy5fb3ZlcnJpZGVzW2tleV0pO1xyXG5cdFx0fVxyXG5cclxuXHRcdHJldHVybiB0aGlzLl9hZGFwdGVyLmdldChrZXkpXHJcblxyXG5cdFx0LnRoZW4ocmVzdWx0ID0+IHtcclxuXHRcdFx0Ly8gdGhlIGl0ZW0gaXMgbm90IGRlZmluZWRcclxuXHRcdFx0aWYoIXJlc3VsdCkge1xyXG5cdFx0XHRcdHJldHVybiBfZGVmYXVsdDtcclxuXHRcdFx0fVxyXG5cclxuXHRcdFx0cmV0dXJuIHJlc3VsdC52YWx1ZTtcclxuXHRcdH0pO1xyXG5cdH1cclxuXHJcblx0LyoqXHJcblx0ICogU2V0IGEgc2luZ2xlIHZhbHVlIG9yIHNldmVyYWwgdmFsdWVzXHJcblx0ICpcclxuXHQgKiBrZXkgLT4gdmFsdWVcclxuXHQgKiBvclxyXG5cdCAqIHsga2V5OiB2YWx1ZSB9XHJcblx0ICovXHJcblx0c2V0KGtleSwgdmFsdWUpIHtcclxuXHRcdC8vIHNldCBhIHNpbmdsZSB2YWx1ZVxyXG5cdFx0aWYodHlwZW9mIGtleSA9PSBcInN0cmluZ1wiKSB7XHJcblx0XHRcdHZhciBwcm9taXNlID0gdGhpcy5fYWRhcHRlci5zZXQoe1xyXG5cdFx0XHRcdGlkOiBrZXksXHJcblx0XHRcdFx0dmFsdWUsXHJcblx0XHRcdFx0bW9kaWZpZWQ6IERhdGUubm93KClcclxuXHRcdFx0fSk7XHJcblxyXG5cdFx0XHQvLyB0cmlnZ2VyIHRoZSBjaGFuZ2VcclxuXHRcdFx0dGhpcy5lbWl0KGtleSwgdmFsdWUpO1xyXG5cclxuXHRcdFx0cmV0dXJuIHByb21pc2U7XHJcblx0XHR9XHJcblx0XHQvLyBzZXQgc2V2ZXJhbCB2YWx1ZXNcclxuXHRcdGVsc2Uge1xyXG5cdFx0XHQvLyB0ZWxsIHRoZSBjYWxsZXIgd2hlbiB3ZSBhcmUgZG9uZVxyXG5cdFx0XHRsZXQgcHJvbWlzZXMgPSBbXTtcclxuXHJcblx0XHRcdGZvcihsZXQgX2tleSBvZiBPYmplY3QuZ2V0T3duUHJvcGVydHlOYW1lcyhrZXkpKSB7XHJcblx0XHRcdFx0cHJvbWlzZXMucHVzaChcclxuXHRcdFx0XHRcdHRoaXMuX2FkYXB0ZXIuc2V0KHtcclxuXHRcdFx0XHRcdFx0aWQ6IF9rZXksXHJcblx0XHRcdFx0XHRcdHZhbHVlOiBrZXlbX2tleV0sXHJcblx0XHRcdFx0XHRcdG1vZGlmaWVkOiBEYXRlLm5vdygpXHJcblx0XHRcdFx0XHR9KVxyXG5cdFx0XHRcdCk7XHJcblxyXG5cdFx0XHRcdC8vIHRyaWdnZXIgdGhlIGNoYW5nZVxyXG5cdFx0XHRcdHRoaXMuZW1pdChfa2V5LCBrZXlbX2tleV0pO1xyXG5cdFx0XHR9XHJcblxyXG5cdFx0XHRyZXR1cm4gUHJvbWlzZS5hbGwocHJvbWlzZXMpO1xyXG5cdFx0fVxyXG5cdH1cclxuXHJcblx0IC8qKlxyXG5cdCAgKiBXYXRjaCB0aGUgdmFsdWUgZm9yIGNoYW5nZXNcclxuXHQgICpcclxuXHQgICogb3B0cy5jdXJyZW50IC0gc2VuZCB0aGUgY3VycmVudCB2YWx1ZSBvZiBrZXkgKGRlZmF1bHQ6IGZhbHNlKVxyXG5cdCAgKiBvcHRzLmRlZmF1bHQgLSB0aGUgZGVmYXVsdCB2YWx1ZSB0byBzZW5kIGZvciBvcHRzLmN1cnJlbnRcclxuXHQgICovXHJcblx0IHdhdGNoKGtleSwgb3B0cywgZm4pIHtcclxuXHRcdCAvLyBtYWtlIG9wdHMgb3B0aW9uYWxcclxuXHRcdCBpZih0eXBlb2Ygb3B0cyA9PSBcImZ1bmN0aW9uXCIpIHtcclxuXHRcdFx0IGZuID0gb3B0cztcclxuXHRcdFx0IG9wdHMgPSB7fTtcclxuXHRcdCB9XHJcblxyXG5cdFx0IC8vIHNlbmQgdGhlIGN1cnJlbnQgdmFsdWVcclxuXHRcdCBpZihvcHRzLmN1cnJlbnQpIHtcclxuXHRcdFx0IHRoaXMuZ2V0KGtleSwgb3B0cy5kZWZhdWx0KVxyXG5cdFx0XHQgXHQudGhlbih2YWx1ZSA9PiBmbih2YWx1ZSkpO1xyXG5cdFx0IH1cclxuXHJcblx0XHQgLy8gbGlzdGVuIGZvciBhbnkgY2hhbmdlc1xyXG5cdFx0IHJldHVybiB0aGlzLm9uKGtleSwgdmFsdWUgPT4ge1xyXG5cdFx0XHQgLy8gb25seSBlbWl0IHRoZSBjaGFuZ2UgaWYgdGhlcmUgaXMgbm90IGFuIG92ZXJyaWRlIGluIHBsYWNlXHJcblx0XHRcdCBpZighdGhpcy5fb3ZlcnJpZGVzIHx8ICF0aGlzLl9vdmVycmlkZXMuaGFzT3duUHJvcGVydHkoa2V5KSkge1xyXG5cdFx0XHRcdCBmbih2YWx1ZSk7XHJcblx0XHRcdCB9XHJcblx0XHQgfSk7XHJcblx0IH1cclxuXHJcblx0IC8qKlxyXG5cdCAgKiBPdmVycmlkZSB0aGUgdmFsdWVzIGZyb20gdGhlIGFkYXB0b3Igd2l0aG91dCB3cml0aW5nIHRvIHRoZW1cclxuXHQgICpcclxuXHQgICogVXNlZnVsIGZvciBjb21iaW5pbmcganNvbiBzZXR0aW5ncyB3aXRoIGNvbW1hbmQgbGluZSBmbGFnc1xyXG5cdCAgKi9cclxuXHQgc2V0T3ZlcnJpZGVzKG92ZXJyaWRlcykge1xyXG5cdFx0IHRoaXMuX292ZXJyaWRlcyA9IG92ZXJyaWRlcztcclxuXHJcblx0XHQgLy8gZW1pdCBjaGFuZ2VzIGZvciBlYWNoIG9mIHRoZSBvdmVycmlkZXNcclxuXHRcdCBPYmplY3QuZ2V0T3duUHJvcGVydHlOYW1lcyhvdmVycmlkZXMpXHJcblxyXG5cdFx0IC5mb3JFYWNoKGtleSA9PiB0aGlzLmVtaXQoa2V5LCBvdmVycmlkZXNba2V5XSkpO1xyXG5cdCB9XHJcbn1cclxuXHJcbm1vZHVsZS5leHBvcnRzID0gS2V5VmFsdWVTdG9yZTtcclxuIiwiLyoqXHJcbiAqIEFuIGluIG1lbW9yeSBhZGFwdGVyIGZvciBkYXRhIHN0b3Jlc1xyXG4gKi9cclxuXHJcbmNsYXNzIE1lbUFkYXB0b3Ige1xyXG5cdGNvbnN0cnVjdG9yKCkge1xyXG5cdFx0dGhpcy5fZGF0YSA9IHt9O1xyXG5cdH1cclxuXHJcblx0LyoqXHJcblx0ICogR2V0IGFuIGFycmF5IG9mIHZhbHVlc1xyXG5cdCAqL1xyXG5cdGdldEFsbCgpIHtcclxuXHRcdHJldHVybiBQcm9taXNlLnJlc29sdmUoXHJcblx0XHRcdE9iamVjdC5nZXRPd25Qcm9wZXJ0eU5hbWVzKHRoaXMuX2RhdGEpXHJcblxyXG5cdFx0XHQubWFwKG5hbWUgPT4gdGhpcy5fZGF0YVtuYW1lXSlcclxuXHRcdCk7XHJcblx0fVxyXG5cclxuXHQvKipcclxuXHQgKiBMb29rdXAgYSB2YWx1ZVxyXG5cdCAqXHJcblx0ICogcmV0dXJucyB7aWQsIHZhbHVlfVxyXG5cdCAqL1xyXG5cdGdldChpZCkge1xyXG5cdFx0Ly8gY2hlY2sgaWYgd2UgaGF2ZSB0aGUgdmFsdWVcclxuXHRcdGlmKHRoaXMuX2RhdGEuaGFzT3duUHJvcGVydHkoaWQpKSB7XHJcblx0XHRcdHJldHVybiBQcm9taXNlLnJlc29sdmUodGhpcy5fZGF0YVtpZF0pO1xyXG5cdFx0fVxyXG5cclxuXHRcdHJldHVybiBQcm9taXNlLnJlc29sdmUoKTtcclxuXHR9XHJcblxyXG5cdC8qKlxyXG5cdCAqIFN0b3JlIGEgdmFsdWVcclxuXHQgKlxyXG5cdCAqIFRoZSB2YWx1ZSBpcyBzdG9yZWQgYnkgaXRzIGlkIHByb3BlcnR5XHJcblx0ICovXHJcblx0c2V0KHZhbHVlKSB7XHJcblx0XHQvLyBzdG9yZSB0aGUgdmFsdWVcclxuXHRcdHRoaXMuX2RhdGFbdmFsdWUuaWRdID0gdmFsdWU7XHJcblxyXG5cdFx0cmV0dXJuIFByb21pc2UucmVzb2x2ZSgpO1xyXG5cdH1cclxuXHJcblx0LyoqXHJcblx0ICogUmVtb3ZlIGEgdmFsdWUgZnJvbSB0aGUgYWRhcHRvclxyXG5cdCAqL1xyXG5cdHJlbW92ZShrZXkpIHtcclxuXHRcdGRlbGV0ZSB0aGlzLl9kYXRhW2tleV07XHJcblxyXG5cdFx0cmV0dXJuIFByb21pc2UucmVzb2x2ZSgpO1xyXG5cdH1cclxufVxyXG5cclxubW9kdWxlLmV4cG9ydHMgPSBNZW1BZGFwdG9yO1xyXG4iLCIvKipcclxuICogQSBkYXRhIHN0b3JlIHdoaWNoIGNvbnRhaW5zIGEgcG9vbCBvZiBvYmplY3RzIHdoaWNoIGFyZSBxdWVyeWFibGUgYnkgYW55IHByb3BlcnR5XHJcbiAqL1xyXG5cclxuY2xhc3MgUG9vbFN0b3JlIGV4dGVuZHMgbGlmZUxpbmUuRXZlbnRFbWl0dGVyIHtcclxuXHRjb25zdHJ1Y3RvcihhZGFwdG9yLCBpbml0Rm4pIHtcclxuXHRcdHN1cGVyKCk7XHJcblx0XHR0aGlzLl9hZGFwdG9yID0gYWRhcHRvcjtcclxuXHRcdHRoaXMuX2luaXRGbiA9IGluaXRGbjtcclxuXHR9XHJcblxyXG5cdC8qKlxyXG5cdCAqIEdldCBhbGwgaXRlbXMgbWF0Y2luZyB0aGUgcHJvdmlkZWQgcHJvcGVydGllc1xyXG5cdCAqL1xyXG5cdHF1ZXJ5KHByb3BzLCBmbikge1xyXG5cdFx0Ly8gY2hlY2sgaWYgYSB2YWx1ZSBtYXRjaGVzIHRoZSBxdWVyeVxyXG5cdFx0dmFyIGZpbHRlciA9IHZhbHVlID0+IHtcclxuXHRcdFx0Ly8gY2hlY2sgdGhhdCBhbGwgdGhlIHByb3BlcnRpZXMgbWF0Y2hcclxuXHRcdFx0cmV0dXJuIE9iamVjdC5nZXRPd25Qcm9wZXJ0eU5hbWVzKHByb3BzKVxyXG5cclxuXHRcdFx0LmV2ZXJ5KHByb3BOYW1lID0+IHtcclxuXHRcdFx0XHQvLyBhIGZ1bmN0aW9uIHRvIGNoZWNrIGlmIGEgdmFsdWUgbWF0Y2hlc1xyXG5cdFx0XHRcdGlmKHR5cGVvZiBwcm9wc1twcm9wTmFtZV0gPT0gXCJmdW5jdGlvblwiKSB7XHJcblx0XHRcdFx0XHRyZXR1cm4gcHJvcHNbcHJvcE5hbWVdKHZhbHVlW3Byb3BOYW1lXSk7XHJcblx0XHRcdFx0fVxyXG5cdFx0XHRcdC8vIHBsYWluIGVxdWFsaXR5XHJcblx0XHRcdFx0ZWxzZSB7XHJcblx0XHRcdFx0XHRyZXR1cm4gcHJvcHNbcHJvcE5hbWVdID09IHZhbHVlW3Byb3BOYW1lXVxyXG5cdFx0XHRcdH1cclxuXHRcdFx0fSk7XHJcblx0XHR9O1xyXG5cclxuXHRcdC8vIGdldCBhbGwgY3VycmVudCBpdGVtcyB0aGF0IG1hdGNoIHRoZSBmaWx0ZXJcclxuXHRcdHZhciBjdXJyZW50ID0gdGhpcy5fYWRhcHRvci5nZXRBbGwoKVxyXG5cclxuXHRcdC50aGVuKHZhbHVlcyA9PiB7XHJcblx0XHRcdC8vIGZpbHRlciBvdXQgdGhlIHZhbHVlc1xyXG5cdFx0XHR2YWx1ZXMgPSB2YWx1ZXMuZmlsdGVyKGZpbHRlcik7XHJcblxyXG5cdFx0XHQvLyBkbyBhbnkgaW5pdGlhbGl6YXRpb25cclxuXHRcdFx0aWYodGhpcy5faW5pdEZuKSB7XHJcblx0XHRcdFx0dmFsdWVzID0gdmFsdWVzLm1hcCh2YWx1ZSA9PiB0aGlzLl9pbml0Rm4odmFsdWUpIHx8IHZhbHVlKTtcclxuXHRcdFx0fVxyXG5cclxuXHRcdFx0cmV0dXJuIHZhbHVlcztcclxuXHRcdH0pO1xyXG5cclxuXHRcdC8vIG9wdGlvbmFseSBydW4gY2hhbmdlcyB0aHJvdWdoIHRoZSBxdWVyeSBhcyB3ZWxsXHJcblx0XHRpZih0eXBlb2YgZm4gPT0gXCJmdW5jdGlvblwiKSB7XHJcblx0XHRcdGxldCBzdWJzY3JpcHRpb24sIHN0b3BwZWQ7XHJcblxyXG5cdFx0XHQvLyB3cmFwIHRoZSB2YWx1ZXMgaW4gY2hhbmdlIG9iamVjdHMgYW5kIHNlbmQgdGhlIHRvIHRoZSBjb25zdW1lclxyXG5cdFx0XHRjdXJyZW50LnRoZW4odmFsdWVzID0+IHtcclxuXHRcdFx0XHQvLyBkb24ndCBsaXN0ZW4gaWYgdW5zdWJzY3JpYmUgd2FzIGFscmVhZHkgY2FsbGVkXHJcblx0XHRcdFx0aWYoc3RvcHBlZCkgcmV0dXJuO1xyXG5cclxuXHRcdFx0XHQvLyBzZW5kIHRoZSB2YWx1ZXMgd2UgY3VycmVudGx5IGhhdmVcclxuXHRcdFx0XHRmbih2YWx1ZXMuc2xpY2UoMCkpO1xyXG5cclxuXHRcdFx0XHQvLyB3YXRjaCBmb3IgY2hhbmdlcyBhZnRlciB0aGUgaW5pdGlhbCB2YWx1ZXMgYXJlIHNlbmRcclxuXHRcdFx0XHRzdWJzY3JpcHRpb24gPSB0aGlzLm9uKFwiY2hhbmdlXCIsIGNoYW5nZSA9PiB7XHJcblx0XHRcdFx0XHQvLyBmaW5kIHRoZSBwcmV2aW91cyB2YWx1ZVxyXG5cdFx0XHRcdFx0dmFyIGluZGV4ID0gdmFsdWVzLmZpbmRJbmRleCh2YWx1ZSA9PiB2YWx1ZS5pZCA9PSBjaGFuZ2UuaWQpO1xyXG5cclxuXHRcdFx0XHRcdGlmKGNoYW5nZS50eXBlID09IFwiY2hhbmdlXCIpIHtcclxuXHRcdFx0XHRcdFx0Ly8gY2hlY2sgaWYgdGhlIHZhbHVlIG1hdGNoZXMgdGhlIHF1ZXJ5XHJcblx0XHRcdFx0XHRcdGxldCBtYXRjaGVzID0gZmlsdGVyKGNoYW5nZS52YWx1ZSk7XHJcblxyXG5cdFx0XHRcdFx0XHRpZihtYXRjaGVzKSB7XHJcblx0XHRcdFx0XHRcdFx0Ly8gZnJlc2hseSBjcmVhdGVkXHJcblx0XHRcdFx0XHRcdFx0aWYoaW5kZXggPT09IC0xKSB7XHJcblx0XHRcdFx0XHRcdFx0XHRsZXQge3ZhbHVlfSA9IGNoYW5nZTtcclxuXHJcblx0XHRcdFx0XHRcdFx0XHQvLyBkbyBhbnkgaW5pdGlhbGl6YXRpb25cclxuXHRcdFx0XHRcdFx0XHRcdGlmKHRoaXMuX2luaXRGbikge1xyXG5cdFx0XHRcdFx0XHRcdFx0XHR2YWx1ZSA9IHRoaXMuX2luaXRGbih2YWx1ZSkgfHwgdmFsdWU7XHJcblx0XHRcdFx0XHRcdFx0XHR9XHJcblxyXG5cdFx0XHRcdFx0XHRcdFx0dmFsdWVzLnB1c2godmFsdWUpO1xyXG5cdFx0XHRcdFx0XHRcdH1cclxuXHRcdFx0XHRcdFx0XHQvLyB1cGRhdGUgYW4gZXhpc3RpbmcgdmFsdWVcclxuXHRcdFx0XHRcdFx0XHRlbHNlIHtcclxuXHRcdFx0XHRcdFx0XHRcdHZhbHVlc1tpbmRleF0gPSBjaGFuZ2UudmFsdWU7XHJcblx0XHRcdFx0XHRcdFx0fVxyXG5cclxuXHRcdFx0XHRcdFx0XHRmbih2YWx1ZXMuc2xpY2UoMCkpO1xyXG5cdFx0XHRcdFx0XHR9XHJcblx0XHRcdFx0XHRcdC8vIHRlbGwgdGhlIGNvbnN1bWVyIHRoaXMgdmFsdWUgbm8gbG9uZ2VyIG1hdGNoZXNcclxuXHRcdFx0XHRcdFx0ZWxzZSBpZihpbmRleCAhPT0gLTEpIHtcclxuXHRcdFx0XHRcdFx0XHQvLyByZW1vdmUgdGhlIGl0ZW1cclxuXHRcdFx0XHRcdFx0XHRpZihpbmRleCAhPT0gLTEpIHtcclxuXHRcdFx0XHRcdFx0XHRcdHZhbHVlcy5zcGxpY2UoaW5kZXgsIDEpO1xyXG5cdFx0XHRcdFx0XHRcdH1cclxuXHJcblx0XHRcdFx0XHRcdFx0Zm4odmFsdWVzLnNsaWNlKDApKTtcclxuXHRcdFx0XHRcdFx0fVxyXG5cdFx0XHRcdFx0fVxyXG5cdFx0XHRcdFx0ZWxzZSBpZihjaGFuZ2UudHlwZSA9PSBcInJlbW92ZVwiICYmIGluZGV4ICE9PSAtMSkge1xyXG5cdFx0XHRcdFx0XHQvLyByZW1vdmUgdGhlIGl0ZW1cclxuXHRcdFx0XHRcdFx0aWYoaW5kZXggIT09IC0xKSB7XHJcblx0XHRcdFx0XHRcdFx0dmFsdWVzLnNwbGljZShpbmRleCwgMSk7XHJcblx0XHRcdFx0XHRcdH1cclxuXHJcblx0XHRcdFx0XHRcdGZuKHZhbHVlcy5zbGljZSgwKSk7XHJcblx0XHRcdFx0XHR9XHJcblx0XHRcdFx0fSk7XHJcblx0XHRcdH0pO1xyXG5cclxuXHRcdFx0cmV0dXJuIHtcclxuXHRcdFx0XHR1bnN1YnNjcmliZSgpIHtcclxuXHRcdFx0XHRcdC8vIGlmIHdlIGFyZSBsaXN0ZW5pbmcgc3RvcFxyXG5cdFx0XHRcdFx0aWYoc3Vic2NyaXB0aW9uKSB7XHJcblx0XHRcdFx0XHRcdHN1YnNjcmlwdGlvbi51bnN1YnNjcmliZSgpXHJcblx0XHRcdFx0XHR9XHJcblxyXG5cdFx0XHRcdFx0Ly8gZG9uJ3QgbGlzdGVuXHJcblx0XHRcdFx0XHRzdG9wcGVkID0gdHJ1ZTtcclxuXHRcdFx0XHR9XHJcblx0XHRcdH1cclxuXHRcdH1cclxuXHRcdGVsc2Uge1xyXG5cdFx0XHRyZXR1cm4gY3VycmVudDtcclxuXHRcdH1cclxuXHR9XHJcblxyXG5cdC8qKlxyXG5cdCAqIFN0b3JlIGEgdmFsdWUgaW4gdGhlIHBvb2xcclxuXHQgKi9cclxuXHRzZXQodmFsdWUpIHtcclxuXHRcdC8vIHNldCB0aGUgbW9kaWZpZWQgZGF0ZVxyXG5cdFx0dmFsdWUubW9kaWZpZWQgPSBEYXRlLm5vdygpO1xyXG5cclxuXHRcdC8vIHN0b3JlIHRoZSB2YWx1ZSBpbiB0aGUgYWRhcHRvclxyXG5cdFx0dGhpcy5fYWRhcHRvci5zZXQodmFsdWUpO1xyXG5cclxuXHRcdC8vIHByb3BvZ2F0ZSB0aGUgY2hhbmdlXHJcblx0XHR0aGlzLmVtaXQoXCJjaGFuZ2VcIiwge1xyXG5cdFx0XHR0eXBlOiBcImNoYW5nZVwiLFxyXG5cdFx0XHRpZDogdmFsdWUuaWQsXHJcblx0XHRcdHZhbHVlXHJcblx0XHR9KTtcclxuXHR9XHJcblxyXG5cdC8qKlxyXG5cdCAqIFJlbW92ZSBhIHZhbHVlIGZyb20gdGhlIHBvb2xcclxuXHQgKi9cclxuXHRyZW1vdmUoaWQpIHtcclxuXHRcdC8vIHJlbW92ZSB0aGUgdmFsdWUgZnJvbSB0aGUgYWRhcHRvclxyXG5cdFx0dGhpcy5fYWRhcHRvci5yZW1vdmUoaWQsIERhdGUubm93KCkpO1xyXG5cclxuXHRcdC8vIHByb3BvZ2F0ZSB0aGUgY2hhbmdlXHJcblx0XHR0aGlzLmVtaXQoXCJjaGFuZ2VcIiwge1xyXG5cdFx0XHR0eXBlOiBcInJlbW92ZVwiLFxyXG5cdFx0XHRpZFxyXG5cdFx0fSk7XHJcblx0fVxyXG59XHJcblxyXG5tb2R1bGUuZXhwb3J0cyA9IFBvb2xTdG9yZTtcclxuIiwiLyoqXHJcbiAqIENyZWF0ZSBhIGdsb2JhbCBvYmplY3Qgd2l0aCBjb21tb25seSB1c2VkIG1vZHVsZXMgdG8gYXZvaWQgNTAgbWlsbGlvbiByZXF1aXJlc1xyXG4gKi9cclxuXHJcbnZhciBFdmVudEVtaXR0ZXIgPSByZXF1aXJlKFwiLi91dGlsL2V2ZW50LWVtaXR0ZXJcIik7XHJcblxyXG52YXIgbGlmZUxpbmUgPSBuZXcgRXZlbnRFbWl0dGVyKCk7XHJcblxyXG4vLyBwbGF0Zm9ybSBkZXRlY3Rpb25cclxubGlmZUxpbmUubm9kZSA9IHR5cGVvZiBwcm9jZXNzID09IFwib2JqZWN0XCI7XHJcbmxpZmVMaW5lLmJyb3dzZXIgPSB0eXBlb2Ygd2luZG93ID09IFwib2JqZWN0XCI7XHJcblxyXG4vLyBhdHRhY2ggdXRpbHNcclxubGlmZUxpbmUuRGlzcG9zYWJsZSA9IHJlcXVpcmUoXCIuL3V0aWwvZGlzcG9zYWJsZVwiKTtcclxubGlmZUxpbmUuRXZlbnRFbWl0dGVyID0gRXZlbnRFbWl0dGVyO1xyXG5cclxuLy8gYXR0YWNoIGxpZmVsaW5lIHRvIHRoZSBnbG9iYWwgb2JqZWN0XHJcbihsaWZlTGluZS5ub2RlID8gZ2xvYmFsIDogYnJvd3NlcikubGlmZUxpbmUgPSBsaWZlTGluZTtcclxuXHJcbi8vIGF0dGFjaCBjb25maWdcclxudmFyIE1lbUFkYXB0b3IgPSByZXF1aXJlKFwiLi9kYXRhLXN0b3Jlcy9tZW0tYWRhcHRvclwiKTtcclxudmFyIEtleVZhbHVlU3RvcmUgPSByZXF1aXJlKFwiLi9kYXRhLXN0b3Jlcy9rZXktdmFsdWUtc3RvcmVcIik7XHJcblxyXG5saWZlTGluZS5jb25maWcgPSBuZXcgS2V5VmFsdWVTdG9yZShuZXcgTWVtQWRhcHRvcigpKTtcclxuIiwiLyoqXHJcbiAqIEtlZXAgYSBsaXN0IG9mIHN1YnNjcmlwdGlvbnMgdG8gdW5zdWJzY3JpYmUgZnJvbSB0b2dldGhlclxyXG4gKi9cclxuXHJcbmNsYXNzIERpc3Bvc2FibGUge1xyXG5cdGNvbnN0cnVjdG9yKCkge1xyXG5cdFx0dGhpcy5fc3Vic2NyaXB0aW9ucyA9IFtdO1xyXG5cdH1cclxuXHJcblx0Ly8gVW5zdWJzY3JpYmUgZnJvbSBhbGwgc3Vic2NyaXB0aW9uc1xyXG5cdGRpc3Bvc2UoKSB7XHJcblx0XHQvLyByZW1vdmUgdGhlIGZpcnN0IHN1YnNjcmlwdGlvbiB1bnRpbCB0aGVyZSBhcmUgbm9uZSBsZWZ0XHJcblx0XHR3aGlsZSh0aGlzLl9zdWJzY3JpcHRpb25zLmxlbmd0aCA+IDApIHtcclxuXHRcdFx0dGhpcy5fc3Vic2NyaXB0aW9ucy5zaGlmdCgpLnVuc3Vic2NyaWJlKCk7XHJcblx0XHR9XHJcblx0fVxyXG5cclxuXHQvLyBBZGQgYSBzdWJzY3JpcHRpb24gdG8gdGhlIGRpc3Bvc2FibGVcclxuXHRhZGQoc3Vic2NyaXB0aW9uKSB7XHJcblx0XHR0aGlzLl9zdWJzY3JpcHRpb25zLnB1c2goc3Vic2NyaXB0aW9uKTtcclxuXHR9XHJcblxyXG5cdC8vIGRpc3Bvc2Ugd2hlbiBhbiBldmVudCBpcyBmaXJlZFxyXG5cdGRpc3Bvc2VPbihlbWl0dGVyLCBldmVudCkge1xyXG5cdFx0dGhpcy5hZGQoZW1pdHRlci5vbihldmVudCwgKCkgPT4gdGhpcy5kaXNwb3NlKCkpKTtcclxuXHR9XHJcbn07XHJcblxyXG5tb2R1bGUuZXhwb3J0cyA9IERpc3Bvc2FibGU7XHJcbiIsIi8qKlxyXG4gKiBBIGJhc2ljIGV2ZW50IGVtaXR0ZXJcclxuICovXHJcblxyXG5jbGFzcyBFdmVudEVtaXR0ZXIge1xyXG5cdGNvbnN0cnVjdG9yKCkge1xyXG5cdFx0dGhpcy5fbGlzdGVuZXJzID0ge307XHJcblx0fVxyXG5cclxuXHQvKipcclxuXHQgKiBBZGQgYW4gZXZlbnQgbGlzdGVuZXJcclxuXHQgKi9cclxuXHRvbihuYW1lLCBsaXN0ZW5lcikge1xyXG5cdFx0Ly8gaWYgd2UgZG9uJ3QgaGF2ZSBhbiBleGlzdGluZyBsaXN0ZW5lcnMgYXJyYXkgY3JlYXRlIG9uZVxyXG5cdFx0aWYoIXRoaXMuX2xpc3RlbmVyc1tuYW1lXSkge1xyXG5cdFx0XHR0aGlzLl9saXN0ZW5lcnNbbmFtZV0gPSBbXTtcclxuXHRcdH1cclxuXHJcblx0XHQvLyBhZGQgdGhlIGxpc3RlbmVyXHJcblx0XHR0aGlzLl9saXN0ZW5lcnNbbmFtZV0ucHVzaChsaXN0ZW5lcik7XHJcblxyXG5cdFx0Ly8gZ2l2ZSB0aGVtIGEgc3Vic2NyaXB0aW9uXHJcblx0XHRyZXR1cm4ge1xyXG5cdFx0XHRfbGlzdGVuZXI6IGxpc3RlbmVyLFxyXG5cclxuXHRcdFx0dW5zdWJzY3JpYmU6ICgpID0+IHtcclxuXHRcdFx0XHQvLyBmaW5kIHRoZSBsaXN0ZW5lclxyXG5cdFx0XHRcdHZhciBpbmRleCA9IHRoaXMuX2xpc3RlbmVyc1tuYW1lXS5pbmRleE9mKGxpc3RlbmVyKTtcclxuXHJcblx0XHRcdFx0aWYoaW5kZXggIT09IC0xKSB7XHJcblx0XHRcdFx0XHR0aGlzLl9saXN0ZW5lcnNbbmFtZV0uc3BsaWNlKGluZGV4LCAxKTtcclxuXHRcdFx0XHR9XHJcblx0XHRcdH1cclxuXHRcdH07XHJcblx0fVxyXG5cclxuXHQvKipcclxuXHQgKiBFbWl0IGFuIGV2ZW50XHJcblx0ICovXHJcblx0ZW1pdChuYW1lLCAuLi5hcmdzKSB7XHJcblx0XHQvLyBjaGVjayBmb3IgbGlzdGVuZXJzXHJcblx0XHRpZih0aGlzLl9saXN0ZW5lcnNbbmFtZV0pIHtcclxuXHRcdFx0Zm9yKGxldCBsaXN0ZW5lciBvZiB0aGlzLl9saXN0ZW5lcnNbbmFtZV0pIHtcclxuXHRcdFx0XHQvLyBjYWxsIHRoZSBsaXN0ZW5lcnNcclxuXHRcdFx0XHRsaXN0ZW5lciguLi5hcmdzKTtcclxuXHRcdFx0fVxyXG5cdFx0fVxyXG5cdH1cclxuXHJcblx0LyoqXHJcblx0ICogRW1pdCBhbiBldmVudCBhbmQgc2tpcCBzb21lIGxpc3RlbmVyc1xyXG5cdCAqL1xyXG5cdHBhcnRpYWxFbWl0KG5hbWUsIHNraXBzID0gW10sIC4uLmFyZ3MpIHtcclxuXHRcdC8vIGFsbG93IGEgc2luZ2xlIGl0ZW1cclxuXHRcdGlmKCFBcnJheS5pc0FycmF5KHNraXBzKSkge1xyXG5cdFx0XHRza2lwcyA9IFtza2lwc107XHJcblx0XHR9XHJcblxyXG5cdFx0Ly8gY2hlY2sgZm9yIGxpc3RlbmVyc1xyXG5cdFx0aWYodGhpcy5fbGlzdGVuZXJzW25hbWVdKSB7XHJcblx0XHRcdGZvcihsZXQgbGlzdGVuZXIgb2YgdGhpcy5fbGlzdGVuZXJzW25hbWVdKSB7XHJcblx0XHRcdFx0Ly8gdGhpcyBldmVudCBsaXN0ZW5lciBpcyBiZWluZyBza2lwZWRcclxuXHRcdFx0XHRpZihza2lwcy5maW5kKHNraXAgPT4gc2tpcC5fbGlzdGVuZXIgPT0gbGlzdGVuZXIpKSB7XHJcblx0XHRcdFx0XHRjb250aW51ZTtcclxuXHRcdFx0XHR9XHJcblxyXG5cdFx0XHRcdC8vIGNhbGwgdGhlIGxpc3RlbmVyc1xyXG5cdFx0XHRcdGxpc3RlbmVyKC4uLmFyZ3MpO1xyXG5cdFx0XHR9XHJcblx0XHR9XHJcblx0fVxyXG59XHJcblxyXG5tb2R1bGUuZXhwb3J0cyA9IEV2ZW50RW1pdHRlcjtcclxuIl19
