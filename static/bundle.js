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

// all valid data stores
var DATA_STORES = ["assignments"];
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
		_this._db = idb.open("data-stores", 1, function (db) {
			// upgrade or create the db
			switch (db.oldVersion) {
				// NOTE: We want cases to fall through so all setup is completed
				case 0:
					var _iteratorNormalCompletion = true;
					var _didIteratorError = false;
					var _iteratorError = undefined;

					try {
						for (var _iterator = DATA_STORES[Symbol.iterator](), _step; !(_iteratorNormalCompletion = (_step = _iterator.next()).done); _iteratorNormalCompletion = true) {
							var _name = _step.value;

							db.createObjectStore(_name, { keyPath: "id" });
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

			// go to the cache first
			fn(arrayFromObject(this._cache));

			// load items from idb
			this._db.then(function (db) {
				db.transaction(_this2.name).objectStore(_this2.name).getAll().then(function (all) {
					// store items in the cache
					var _iteratorNormalCompletion2 = true;
					var _didIteratorError2 = false;
					var _iteratorError2 = undefined;

					try {
						for (var _iterator2 = all[Symbol.iterator](), _step2; !(_iteratorNormalCompletion2 = (_step2 = _iterator2.next()).done); _iteratorNormalCompletion2 = true) {
							var item = _step2.value;

							_this2._cache[item.id] = item;
						}

						// notify listeners we loaded the data
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

			// store the value in the cache
			this._cache[value.id] = value;

			// save the item
			var save = function () {
				// save the item in the db
				_this4._db.then(function (db) {
					db.transaction(_this4.name, "readwrite").objectStore(_this4.name).put(value);
				});

				// sync the changes to the server
				_this4.partialEmit("sync", skips);
			};

			// don't wait to send the changes to the server
			if (opts.saveNow) save();else debounce(this.name + "/" + value.id, save);

			// emit a change
			this.partialEmit("change", skips);
		}

		// remove a value from the store

	}, {
		key: "remove",
		value: function remove(id, skips) {
			var _this5 = this;

			// remove the value from the cache
			delete this._cache[id];

			// delete the item
			// load items from idb
			this._db.then(function (db) {
				db.transaction(_this5.name, "readwrite").objectStore(_this5.name).delete(id);
			});

			// emit a change
			this.partialEmit("change", skips);

			// sync the changes to the server
			this.partialEmit("sync", skips);
		}

		// force saves to go through

	}, {
		key: "forceSave",
		value: function forceSave() {
			var _this6 = this;

			var _iteratorNormalCompletion3 = true;
			var _didIteratorError3 = false;
			var _iteratorError3 = undefined;

			try {
				for (var _iterator3 = Object.getOwnPropertyNames(debounceTimers)[Symbol.iterator](), _step3; !(_iteratorNormalCompletion3 = (_step3 = _iterator3.next()).done); _iteratorNormalCompletion3 = true) {
					var timer = _step3.value;

					// only save items from this data store
					if (timer.indexOf(this.name + "/") === 0) {
						continue;
					}

					// look up the timer id
					var id = timer.substr(timer.indexOf("/") + 1);

					// save the item in the db
					this._db.then(function (db) {
						db.transaction(_this6.name, "readwrite").objectStore(_this6.name).put(value);
					});

					// clear the timer
					clearTimeout(timer);

					// remove the timer from the list
					delete debounceTimers[timer];

					// sync the changes to the server
					this.emit("sync");
				}
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

},{"./util/dom-maker":7}],5:[function(require,module,exports){
"use strict";

require("../common/global");

require("./global");

require("./widgets/sidebar");

require("./widgets/content");

require("./widgets/link");

require("./widgets/list");

require("./widgets/input");

require("./widgets/toggle-btns");

var _lists = require("./views/lists");

require("./views/item");

require("./views/edit");

require("./views/login");

require("./views/account");

require("./views/users");

require("./views/todo");

var _dataStore = require("./data-store");

// load all the views


// load all the widgets
// create the global object
(0, _dataStore.store)("assignments").setInit(function (item) {
	// parse the date
	if (typeof item.date == "string") {
		item.date = new Date(item.date);
	}
});

// instantiate the dom


// set up the data store
lifeLine.makeDom({
	parent: document.body,
	group: [{ widget: "sidebar" }, { widget: "content" }]
});

// Add a link to the toda/home page
lifeLine.addNavCommand("Todo", "/");

// add list views to the navbar
(0, _lists.initNavBar)();

// create a new assignment
lifeLine.addCommand("New assignment", function () {
	var id = Math.floor(Math.random() * 100000000);

	lifeLine.nav.navigate("/edit/" + id);
});

// create the logout button
lifeLine.addNavCommand("Account", "/account");

},{"../common/global":24,"./data-store":3,"./global":4,"./views/account":8,"./views/edit":9,"./views/item":10,"./views/lists":11,"./views/login":12,"./views/todo":13,"./views/users":14,"./widgets/content":15,"./widgets/input":16,"./widgets/link":17,"./widgets/list":18,"./widgets/sidebar":19,"./widgets/toggle-btns":20}],6:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.isSameDate = isSameDate;
exports.isSoonerDate = isSoonerDate;
exports.daysFromNow = daysFromNow;
exports.stringifyDate = stringifyDate;
exports.isSkipTime = isSkipTime;
exports.stringifyTime = stringifyTime;
/**
 * Date related tools
 */

// check if the dates are the same day
function isSameDate(date1, date2) {
  return date1.getFullYear() == date2.getFullYear() && date1.getMonth() == date2.getMonth() && date1.getDate() == date2.getDate();
};

// check if a date is less than another
function isSoonerDate(date1, date2) {
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
function daysFromNow(days) {
  var date = new Date();

  // advance the date
  date.setDate(date.getDate() + days);

  return date;
};

var STRING_DAYS = ["Sunday", "Monday", "Tuesday", "Wedensday", "Thursday", "Friday", "Saturday"];

// convert a date to a string
function stringifyDate(date) {
  var opts = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : {};

  var strDate,
      strTime = "";

  // check if the date is before today
  var beforeNow = date.getTime() < Date.now();

  // Today
  if (isSameDate(date, new Date())) strDate = "Today";

  // Tomorrow
  else if (isSameDate(date, daysFromNow(1)) && !beforeNow) strDate = "Tomorrow";

    // day of the week (this week)
    else if (isSoonerDate(date, daysFromNow(7)) && !beforeNow) strDate = STRING_DAYS[date.getDay()];

      // print the date
      else strDate = STRING_DAYS[date.getDay()] + " " + (date.getMonth() + 1) + "/" + date.getDate();

  // add the time on
  if (opts.includeTime && !isSkipTime(date, opts.skipTimes)) {
    return strDate + ", " + stringifyTime(date);
  }

  return strDate;
};

// check if this is one of the given skip times
function isSkipTime(date) {
  var skips = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : [];

  return skips.find(function (skip) {
    return skip.hour === date.getHours() && skip.minute === date.getMinutes();
  });
};

// convert a time to a string
function stringifyTime(date) {
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
}

},{}],7:[function(require,module,exports){
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

var _backup = require("../../common/backup");

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
						download: (0, _backup.genBackupName)()
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
}); /**
     * A view for accessing/modifying information about the current user
     */

},{"../../common/backup":21}],9:[function(require,module,exports){
"use strict";

var _date = require("../util/date");

var _dataStore = require("../data-store");

/**
 * Edit an assignemnt
 */

var assignments = (0, _dataStore.store)("assignments");

lifeLine.nav.register({
	matcher: /^\/edit\/(.+?)$/,

	make: function (_ref) {
		var match = _ref.match,
		    content = _ref.content,
		    setTitle = _ref.setTitle,
		    disposable = _ref.disposable;

		var actionSub, deleteSub;

		// push the changes through when the page is closed
		disposable.add({
			unsubscribe: function () {
				return assignments.forceSave();
			}
		});

		var changeSub = assignments.get(match[1], function (item) {
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
					type: "assignment"
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

				// save the changes
				assignments.set(item, changeSub);
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

},{"../data-store":3,"../util/date":6}],10:[function(require,module,exports){
"use strict";

var _date = require("../util/date");

var _dataStore = require("../data-store");

/**
 * The view for an assignment
 */

var assignments = (0, _dataStore.store)("assignments");

lifeLine.nav.register({
	matcher: /^\/item\/(.+?)$/,

	make: function (_ref) {
		var match = _ref.match,
		    setTitle = _ref.setTitle,
		    content = _ref.content,
		    disposable = _ref.disposable;

		var actionDoneSub, actionEditSub;

		disposable.add(assignments.get(match[1], function (item) {
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
				assignments.set(item, [], { saveNow: true });
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
						text: item.date && (0, _date.stringifyDate)(item.date, { includeTime: true, skipTimes: skipTimes })
					}]
				}, {
					classes: "assignment-description",
					text: item.description
				}]
			});
		}));
	}
});

},{"../data-store":3,"../util/date":6}],11:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
	value: true
});
exports.initNavBar = initNavBar;

var _date = require("../util/date");

var _dataStore = require("../data-store");

/**
 * Display a list of upcomming assignments
 */

var assignments = (0, _dataStore.store)("assignments");

// all the different lists
var LISTS = [{
	url: "/week",
	title: "This week",
	createCtx: function () {
		return {
			// days to the end of this week
			endDate: (0, _date.daysFromNow)(7 - new Date().getDay()),
			// todays date
			today: new Date()
		};
	},
	// show all at reasonable number of incomplete assignments
	filter: function (item, _ref) {
		var today = _ref.today,
		    endDate = _ref.endDate;

		// already done
		if (item.done) return;

		// show all tasks
		if (item.type == "task") return true;

		// check if the item is past this week
		if (!(0, _date.isSoonerDate)(item.date, endDate) && !(0, _date.isSameDate)(item.date, endDate)) return;

		// check if the date is before today
		if ((0, _date.isSoonerDate)(item.date, today)) return;

		return true;
	}
}, {
	url: "/upcoming",
	filter: function (item) {
		return !item.done;
	},
	title: "Upcoming"
}, {
	url: "/done",
	filter: function (item) {
		return item.done;
	},
	title: "Done"
}];

// add list view links to the navbar
function initNavBar() {
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

		disposable.add(assignments.getAll(function (data) {
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
			data = data.filter(function (item) {
				return match.filter(item, ctx);
			});

			// sort the assingments
			data.sort(function (a, b) {
				// tasks are below assignments
				if (a.type == "task" && b.type != "task") return 1;
				if (a.type != "task" && b.type == "task") return -1;
				//if(a.type == "task" || b.type == "task") return 0;

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
				var dateStr = item.type == "task" ? "Tasks" : (0, _date.stringifyDate)(item.date);

				// make sure the header exists
				groups[dateStr] || (groups[dateStr] = []);

				// add the item to the list
				var items = [{ text: item.name, grow: true }];

				if (item.type != "task") {
					// show the end time for any non 11:59pm times
					if (item.date.getHours() != 23 || item.date.getMinutes() != 59) {
						items.push((0, _date.stringifyTime)(item.date));
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

},{"../data-store":3,"../util/date":6}],12:[function(require,module,exports){
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

},{}],13:[function(require,module,exports){
"use strict";

var _date = require("../util/date");

var _dataStore = require("../data-store");

/**
 * A list of things todo
 */

var assignments = (0, _dataStore.store)("assignments");

lifeLine.nav.register({
	matcher: "/",

	make: function (_ref) {
		var setTitle = _ref.setTitle,
		    content = _ref.content,
		    disposable = _ref.disposable;

		setTitle("Todo");

		// load the items
		disposable.add(assignments.getAll(function (data) {
			// clear the old content
			content.innerHTML = "";

			var groups = {
				Tasks: [],
				Today: [],
				Tomorrow: []
			};

			// today and tomorrows dates
			var today = new Date();
			var tomorrow = (0, _date.daysFromNow)(1);

			// select the items to display
			data.forEach(function (item) {
				// skip completed items
				if (item.done) return;

				// assignments for today
				if (item.type == "assignment") {
					// today
					if ((0, _date.isSameDate)(today, item.date)) {
						groups.Today.push(createUi(item));
					}
					// tomorrow
					else if ((0, _date.isSameDate)(tomorrow, item.date)) {
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
				}, (0, _date.stringifyTime)(item.date), item.class]
			};
		}
};

},{"../data-store":3,"../util/date":6}],14:[function(require,module,exports){
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

},{}],15:[function(require,module,exports){
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

},{}],16:[function(require,module,exports){
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

},{}],17:[function(require,module,exports){
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

},{}],18:[function(require,module,exports){
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

},{}],19:[function(require,module,exports){
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

},{}],20:[function(require,module,exports){
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

},{}],21:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
	value: true
});
exports.genBackupName = genBackupName;
/**
 * Name generator for backups
 */

function genBackupName() {
	var date = new Date();

	return "backup-" + date.getFullYear() + "-" + (date.getMonth() + 1) + "-" + date.getDate() + ("-" + date.getHours() + "-" + date.getMinutes() + ".zip");
}

},{}],22:[function(require,module,exports){
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

},{}],23:[function(require,module,exports){
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

},{}],24:[function(require,module,exports){
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

},{"./disposable":22,"./event-emitter":23,"_process":2}]},{},[5])
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCJub2RlX21vZHVsZXMvaWRiL2xpYi9pZGIuanMiLCJub2RlX21vZHVsZXMvcHJvY2Vzcy9icm93c2VyLmpzIiwic3JjXFxjbGllbnRcXGRhdGEtc3RvcmUuanMiLCJzcmNcXGNsaWVudFxcZ2xvYmFsLmpzIiwic3JjXFxjbGllbnRcXGluZGV4LmpzIiwic3JjXFxjbGllbnRcXHV0aWxcXGRhdGUuanMiLCJzcmNcXGNsaWVudFxcdXRpbFxcZG9tLW1ha2VyLmpzIiwic3JjXFxjbGllbnRcXHZpZXdzXFxhY2NvdW50LmpzIiwic3JjXFxjbGllbnRcXHZpZXdzXFxlZGl0LmpzIiwic3JjXFxjbGllbnRcXHZpZXdzXFxpdGVtLmpzIiwic3JjXFxjbGllbnRcXHZpZXdzXFxsaXN0cy5qcyIsInNyY1xcY2xpZW50XFx2aWV3c1xcbG9naW4uanMiLCJzcmNcXGNsaWVudFxcdmlld3NcXHRvZG8uanMiLCJzcmNcXGNsaWVudFxcdmlld3NcXHVzZXJzLmpzIiwic3JjXFxjbGllbnRcXHdpZGdldHNcXGNvbnRlbnQuanMiLCJzcmNcXGNsaWVudFxcd2lkZ2V0c1xcaW5wdXQuanMiLCJzcmNcXGNsaWVudFxcd2lkZ2V0c1xcbGluay5qcyIsInNyY1xcY2xpZW50XFx3aWRnZXRzXFxsaXN0LmpzIiwic3JjXFxjbGllbnRcXHdpZGdldHNcXHNpZGViYXIuanMiLCJzcmNcXGNsaWVudFxcd2lkZ2V0c1xcdG9nZ2xlLWJ0bnMuanMiLCJzcmNcXGNvbW1vblxcYmFja3VwLmpzIiwic3JjXFxjb21tb25cXGRpc3Bvc2FibGUuanMiLCJzcmNcXGNvbW1vblxcZXZlbnQtZW1pdHRlci5qcyIsInNyY1xcY29tbW9uXFxzcmNcXGNvbW1vblxcZ2xvYmFsLmpzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBO0FDQUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN0VEE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNB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Ozs7O0FBRUEsSUFBSSxXQUFXLDRCQUFmOztBQUVBO0FBUkE7Ozs7QUFTQSxTQUFTLElBQVQsR0FBZ0IsT0FBTyxPQUFQLElBQWtCLFFBQWxDO0FBQ0EsU0FBUyxPQUFULEdBQW1CLE9BQU8sTUFBUCxJQUFpQixRQUFwQzs7QUFFQTtBQUNBLFNBQVMsVUFBVCxHQUFzQixRQUFRLGNBQVIsRUFBd0IsT0FBOUM7QUFDQSxTQUFTLFlBQVQ7O0FBRUE7QUFDQSxDQUFDLFNBQVMsSUFBVCxHQUFnQixNQUFoQixHQUF5QixPQUExQixFQUFtQyxRQUFuQyxHQUE4QyxRQUE5QyIsImZpbGUiOiJnZW5lcmF0ZWQuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlc0NvbnRlbnQiOlsiKGZ1bmN0aW9uIGUodCxuLHIpe2Z1bmN0aW9uIHMobyx1KXtpZighbltvXSl7aWYoIXRbb10pe3ZhciBhPXR5cGVvZiByZXF1aXJlPT1cImZ1bmN0aW9uXCImJnJlcXVpcmU7aWYoIXUmJmEpcmV0dXJuIGEobywhMCk7aWYoaSlyZXR1cm4gaShvLCEwKTt2YXIgZj1uZXcgRXJyb3IoXCJDYW5ub3QgZmluZCBtb2R1bGUgJ1wiK28rXCInXCIpO3Rocm93IGYuY29kZT1cIk1PRFVMRV9OT1RfRk9VTkRcIixmfXZhciBsPW5bb109e2V4cG9ydHM6e319O3Rbb11bMF0uY2FsbChsLmV4cG9ydHMsZnVuY3Rpb24oZSl7dmFyIG49dFtvXVsxXVtlXTtyZXR1cm4gcyhuP246ZSl9LGwsbC5leHBvcnRzLGUsdCxuLHIpfXJldHVybiBuW29dLmV4cG9ydHN9dmFyIGk9dHlwZW9mIHJlcXVpcmU9PVwiZnVuY3Rpb25cIiYmcmVxdWlyZTtmb3IodmFyIG89MDtvPHIubGVuZ3RoO28rKylzKHJbb10pO3JldHVybiBzfSkiLCIndXNlIHN0cmljdCc7XG5cbihmdW5jdGlvbigpIHtcbiAgZnVuY3Rpb24gdG9BcnJheShhcnIpIHtcbiAgICByZXR1cm4gQXJyYXkucHJvdG90eXBlLnNsaWNlLmNhbGwoYXJyKTtcbiAgfVxuXG4gIGZ1bmN0aW9uIHByb21pc2lmeVJlcXVlc3QocmVxdWVzdCkge1xuICAgIHJldHVybiBuZXcgUHJvbWlzZShmdW5jdGlvbihyZXNvbHZlLCByZWplY3QpIHtcbiAgICAgIHJlcXVlc3Qub25zdWNjZXNzID0gZnVuY3Rpb24oKSB7XG4gICAgICAgIHJlc29sdmUocmVxdWVzdC5yZXN1bHQpO1xuICAgICAgfTtcblxuICAgICAgcmVxdWVzdC5vbmVycm9yID0gZnVuY3Rpb24oKSB7XG4gICAgICAgIHJlamVjdChyZXF1ZXN0LmVycm9yKTtcbiAgICAgIH07XG4gICAgfSk7XG4gIH1cblxuICBmdW5jdGlvbiBwcm9taXNpZnlSZXF1ZXN0Q2FsbChvYmosIG1ldGhvZCwgYXJncykge1xuICAgIHZhciByZXF1ZXN0O1xuICAgIHZhciBwID0gbmV3IFByb21pc2UoZnVuY3Rpb24ocmVzb2x2ZSwgcmVqZWN0KSB7XG4gICAgICByZXF1ZXN0ID0gb2JqW21ldGhvZF0uYXBwbHkob2JqLCBhcmdzKTtcbiAgICAgIHByb21pc2lmeVJlcXVlc3QocmVxdWVzdCkudGhlbihyZXNvbHZlLCByZWplY3QpO1xuICAgIH0pO1xuXG4gICAgcC5yZXF1ZXN0ID0gcmVxdWVzdDtcbiAgICByZXR1cm4gcDtcbiAgfVxuXG4gIGZ1bmN0aW9uIHByb21pc2lmeUN1cnNvclJlcXVlc3RDYWxsKG9iaiwgbWV0aG9kLCBhcmdzKSB7XG4gICAgdmFyIHAgPSBwcm9taXNpZnlSZXF1ZXN0Q2FsbChvYmosIG1ldGhvZCwgYXJncyk7XG4gICAgcmV0dXJuIHAudGhlbihmdW5jdGlvbih2YWx1ZSkge1xuICAgICAgaWYgKCF2YWx1ZSkgcmV0dXJuO1xuICAgICAgcmV0dXJuIG5ldyBDdXJzb3IodmFsdWUsIHAucmVxdWVzdCk7XG4gICAgfSk7XG4gIH1cblxuICBmdW5jdGlvbiBwcm94eVByb3BlcnRpZXMoUHJveHlDbGFzcywgdGFyZ2V0UHJvcCwgcHJvcGVydGllcykge1xuICAgIHByb3BlcnRpZXMuZm9yRWFjaChmdW5jdGlvbihwcm9wKSB7XG4gICAgICBPYmplY3QuZGVmaW5lUHJvcGVydHkoUHJveHlDbGFzcy5wcm90b3R5cGUsIHByb3AsIHtcbiAgICAgICAgZ2V0OiBmdW5jdGlvbigpIHtcbiAgICAgICAgICByZXR1cm4gdGhpc1t0YXJnZXRQcm9wXVtwcm9wXTtcbiAgICAgICAgfSxcbiAgICAgICAgc2V0OiBmdW5jdGlvbih2YWwpIHtcbiAgICAgICAgICB0aGlzW3RhcmdldFByb3BdW3Byb3BdID0gdmFsO1xuICAgICAgICB9XG4gICAgICB9KTtcbiAgICB9KTtcbiAgfVxuXG4gIGZ1bmN0aW9uIHByb3h5UmVxdWVzdE1ldGhvZHMoUHJveHlDbGFzcywgdGFyZ2V0UHJvcCwgQ29uc3RydWN0b3IsIHByb3BlcnRpZXMpIHtcbiAgICBwcm9wZXJ0aWVzLmZvckVhY2goZnVuY3Rpb24ocHJvcCkge1xuICAgICAgaWYgKCEocHJvcCBpbiBDb25zdHJ1Y3Rvci5wcm90b3R5cGUpKSByZXR1cm47XG4gICAgICBQcm94eUNsYXNzLnByb3RvdHlwZVtwcm9wXSA9IGZ1bmN0aW9uKCkge1xuICAgICAgICByZXR1cm4gcHJvbWlzaWZ5UmVxdWVzdENhbGwodGhpc1t0YXJnZXRQcm9wXSwgcHJvcCwgYXJndW1lbnRzKTtcbiAgICAgIH07XG4gICAgfSk7XG4gIH1cblxuICBmdW5jdGlvbiBwcm94eU1ldGhvZHMoUHJveHlDbGFzcywgdGFyZ2V0UHJvcCwgQ29uc3RydWN0b3IsIHByb3BlcnRpZXMpIHtcbiAgICBwcm9wZXJ0aWVzLmZvckVhY2goZnVuY3Rpb24ocHJvcCkge1xuICAgICAgaWYgKCEocHJvcCBpbiBDb25zdHJ1Y3Rvci5wcm90b3R5cGUpKSByZXR1cm47XG4gICAgICBQcm94eUNsYXNzLnByb3RvdHlwZVtwcm9wXSA9IGZ1bmN0aW9uKCkge1xuICAgICAgICByZXR1cm4gdGhpc1t0YXJnZXRQcm9wXVtwcm9wXS5hcHBseSh0aGlzW3RhcmdldFByb3BdLCBhcmd1bWVudHMpO1xuICAgICAgfTtcbiAgICB9KTtcbiAgfVxuXG4gIGZ1bmN0aW9uIHByb3h5Q3Vyc29yUmVxdWVzdE1ldGhvZHMoUHJveHlDbGFzcywgdGFyZ2V0UHJvcCwgQ29uc3RydWN0b3IsIHByb3BlcnRpZXMpIHtcbiAgICBwcm9wZXJ0aWVzLmZvckVhY2goZnVuY3Rpb24ocHJvcCkge1xuICAgICAgaWYgKCEocHJvcCBpbiBDb25zdHJ1Y3Rvci5wcm90b3R5cGUpKSByZXR1cm47XG4gICAgICBQcm94eUNsYXNzLnByb3RvdHlwZVtwcm9wXSA9IGZ1bmN0aW9uKCkge1xuICAgICAgICByZXR1cm4gcHJvbWlzaWZ5Q3Vyc29yUmVxdWVzdENhbGwodGhpc1t0YXJnZXRQcm9wXSwgcHJvcCwgYXJndW1lbnRzKTtcbiAgICAgIH07XG4gICAgfSk7XG4gIH1cblxuICBmdW5jdGlvbiBJbmRleChpbmRleCkge1xuICAgIHRoaXMuX2luZGV4ID0gaW5kZXg7XG4gIH1cblxuICBwcm94eVByb3BlcnRpZXMoSW5kZXgsICdfaW5kZXgnLCBbXG4gICAgJ25hbWUnLFxuICAgICdrZXlQYXRoJyxcbiAgICAnbXVsdGlFbnRyeScsXG4gICAgJ3VuaXF1ZSdcbiAgXSk7XG5cbiAgcHJveHlSZXF1ZXN0TWV0aG9kcyhJbmRleCwgJ19pbmRleCcsIElEQkluZGV4LCBbXG4gICAgJ2dldCcsXG4gICAgJ2dldEtleScsXG4gICAgJ2dldEFsbCcsXG4gICAgJ2dldEFsbEtleXMnLFxuICAgICdjb3VudCdcbiAgXSk7XG5cbiAgcHJveHlDdXJzb3JSZXF1ZXN0TWV0aG9kcyhJbmRleCwgJ19pbmRleCcsIElEQkluZGV4LCBbXG4gICAgJ29wZW5DdXJzb3InLFxuICAgICdvcGVuS2V5Q3Vyc29yJ1xuICBdKTtcblxuICBmdW5jdGlvbiBDdXJzb3IoY3Vyc29yLCByZXF1ZXN0KSB7XG4gICAgdGhpcy5fY3Vyc29yID0gY3Vyc29yO1xuICAgIHRoaXMuX3JlcXVlc3QgPSByZXF1ZXN0O1xuICB9XG5cbiAgcHJveHlQcm9wZXJ0aWVzKEN1cnNvciwgJ19jdXJzb3InLCBbXG4gICAgJ2RpcmVjdGlvbicsXG4gICAgJ2tleScsXG4gICAgJ3ByaW1hcnlLZXknLFxuICAgICd2YWx1ZSdcbiAgXSk7XG5cbiAgcHJveHlSZXF1ZXN0TWV0aG9kcyhDdXJzb3IsICdfY3Vyc29yJywgSURCQ3Vyc29yLCBbXG4gICAgJ3VwZGF0ZScsXG4gICAgJ2RlbGV0ZSdcbiAgXSk7XG5cbiAgLy8gcHJveHkgJ25leHQnIG1ldGhvZHNcbiAgWydhZHZhbmNlJywgJ2NvbnRpbnVlJywgJ2NvbnRpbnVlUHJpbWFyeUtleSddLmZvckVhY2goZnVuY3Rpb24obWV0aG9kTmFtZSkge1xuICAgIGlmICghKG1ldGhvZE5hbWUgaW4gSURCQ3Vyc29yLnByb3RvdHlwZSkpIHJldHVybjtcbiAgICBDdXJzb3IucHJvdG90eXBlW21ldGhvZE5hbWVdID0gZnVuY3Rpb24oKSB7XG4gICAgICB2YXIgY3Vyc29yID0gdGhpcztcbiAgICAgIHZhciBhcmdzID0gYXJndW1lbnRzO1xuICAgICAgcmV0dXJuIFByb21pc2UucmVzb2x2ZSgpLnRoZW4oZnVuY3Rpb24oKSB7XG4gICAgICAgIGN1cnNvci5fY3Vyc29yW21ldGhvZE5hbWVdLmFwcGx5KGN1cnNvci5fY3Vyc29yLCBhcmdzKTtcbiAgICAgICAgcmV0dXJuIHByb21pc2lmeVJlcXVlc3QoY3Vyc29yLl9yZXF1ZXN0KS50aGVuKGZ1bmN0aW9uKHZhbHVlKSB7XG4gICAgICAgICAgaWYgKCF2YWx1ZSkgcmV0dXJuO1xuICAgICAgICAgIHJldHVybiBuZXcgQ3Vyc29yKHZhbHVlLCBjdXJzb3IuX3JlcXVlc3QpO1xuICAgICAgICB9KTtcbiAgICAgIH0pO1xuICAgIH07XG4gIH0pO1xuXG4gIGZ1bmN0aW9uIE9iamVjdFN0b3JlKHN0b3JlKSB7XG4gICAgdGhpcy5fc3RvcmUgPSBzdG9yZTtcbiAgfVxuXG4gIE9iamVjdFN0b3JlLnByb3RvdHlwZS5jcmVhdGVJbmRleCA9IGZ1bmN0aW9uKCkge1xuICAgIHJldHVybiBuZXcgSW5kZXgodGhpcy5fc3RvcmUuY3JlYXRlSW5kZXguYXBwbHkodGhpcy5fc3RvcmUsIGFyZ3VtZW50cykpO1xuICB9O1xuXG4gIE9iamVjdFN0b3JlLnByb3RvdHlwZS5pbmRleCA9IGZ1bmN0aW9uKCkge1xuICAgIHJldHVybiBuZXcgSW5kZXgodGhpcy5fc3RvcmUuaW5kZXguYXBwbHkodGhpcy5fc3RvcmUsIGFyZ3VtZW50cykpO1xuICB9O1xuXG4gIHByb3h5UHJvcGVydGllcyhPYmplY3RTdG9yZSwgJ19zdG9yZScsIFtcbiAgICAnbmFtZScsXG4gICAgJ2tleVBhdGgnLFxuICAgICdpbmRleE5hbWVzJyxcbiAgICAnYXV0b0luY3JlbWVudCdcbiAgXSk7XG5cbiAgcHJveHlSZXF1ZXN0TWV0aG9kcyhPYmplY3RTdG9yZSwgJ19zdG9yZScsIElEQk9iamVjdFN0b3JlLCBbXG4gICAgJ3B1dCcsXG4gICAgJ2FkZCcsXG4gICAgJ2RlbGV0ZScsXG4gICAgJ2NsZWFyJyxcbiAgICAnZ2V0JyxcbiAgICAnZ2V0QWxsJyxcbiAgICAnZ2V0S2V5JyxcbiAgICAnZ2V0QWxsS2V5cycsXG4gICAgJ2NvdW50J1xuICBdKTtcblxuICBwcm94eUN1cnNvclJlcXVlc3RNZXRob2RzKE9iamVjdFN0b3JlLCAnX3N0b3JlJywgSURCT2JqZWN0U3RvcmUsIFtcbiAgICAnb3BlbkN1cnNvcicsXG4gICAgJ29wZW5LZXlDdXJzb3InXG4gIF0pO1xuXG4gIHByb3h5TWV0aG9kcyhPYmplY3RTdG9yZSwgJ19zdG9yZScsIElEQk9iamVjdFN0b3JlLCBbXG4gICAgJ2RlbGV0ZUluZGV4J1xuICBdKTtcblxuICBmdW5jdGlvbiBUcmFuc2FjdGlvbihpZGJUcmFuc2FjdGlvbikge1xuICAgIHRoaXMuX3R4ID0gaWRiVHJhbnNhY3Rpb247XG4gICAgdGhpcy5jb21wbGV0ZSA9IG5ldyBQcm9taXNlKGZ1bmN0aW9uKHJlc29sdmUsIHJlamVjdCkge1xuICAgICAgaWRiVHJhbnNhY3Rpb24ub25jb21wbGV0ZSA9IGZ1bmN0aW9uKCkge1xuICAgICAgICByZXNvbHZlKCk7XG4gICAgICB9O1xuICAgICAgaWRiVHJhbnNhY3Rpb24ub25lcnJvciA9IGZ1bmN0aW9uKCkge1xuICAgICAgICByZWplY3QoaWRiVHJhbnNhY3Rpb24uZXJyb3IpO1xuICAgICAgfTtcbiAgICAgIGlkYlRyYW5zYWN0aW9uLm9uYWJvcnQgPSBmdW5jdGlvbigpIHtcbiAgICAgICAgcmVqZWN0KGlkYlRyYW5zYWN0aW9uLmVycm9yKTtcbiAgICAgIH07XG4gICAgfSk7XG4gIH1cblxuICBUcmFuc2FjdGlvbi5wcm90b3R5cGUub2JqZWN0U3RvcmUgPSBmdW5jdGlvbigpIHtcbiAgICByZXR1cm4gbmV3IE9iamVjdFN0b3JlKHRoaXMuX3R4Lm9iamVjdFN0b3JlLmFwcGx5KHRoaXMuX3R4LCBhcmd1bWVudHMpKTtcbiAgfTtcblxuICBwcm94eVByb3BlcnRpZXMoVHJhbnNhY3Rpb24sICdfdHgnLCBbXG4gICAgJ29iamVjdFN0b3JlTmFtZXMnLFxuICAgICdtb2RlJ1xuICBdKTtcblxuICBwcm94eU1ldGhvZHMoVHJhbnNhY3Rpb24sICdfdHgnLCBJREJUcmFuc2FjdGlvbiwgW1xuICAgICdhYm9ydCdcbiAgXSk7XG5cbiAgZnVuY3Rpb24gVXBncmFkZURCKGRiLCBvbGRWZXJzaW9uLCB0cmFuc2FjdGlvbikge1xuICAgIHRoaXMuX2RiID0gZGI7XG4gICAgdGhpcy5vbGRWZXJzaW9uID0gb2xkVmVyc2lvbjtcbiAgICB0aGlzLnRyYW5zYWN0aW9uID0gbmV3IFRyYW5zYWN0aW9uKHRyYW5zYWN0aW9uKTtcbiAgfVxuXG4gIFVwZ3JhZGVEQi5wcm90b3R5cGUuY3JlYXRlT2JqZWN0U3RvcmUgPSBmdW5jdGlvbigpIHtcbiAgICByZXR1cm4gbmV3IE9iamVjdFN0b3JlKHRoaXMuX2RiLmNyZWF0ZU9iamVjdFN0b3JlLmFwcGx5KHRoaXMuX2RiLCBhcmd1bWVudHMpKTtcbiAgfTtcblxuICBwcm94eVByb3BlcnRpZXMoVXBncmFkZURCLCAnX2RiJywgW1xuICAgICduYW1lJyxcbiAgICAndmVyc2lvbicsXG4gICAgJ29iamVjdFN0b3JlTmFtZXMnXG4gIF0pO1xuXG4gIHByb3h5TWV0aG9kcyhVcGdyYWRlREIsICdfZGInLCBJREJEYXRhYmFzZSwgW1xuICAgICdkZWxldGVPYmplY3RTdG9yZScsXG4gICAgJ2Nsb3NlJ1xuICBdKTtcblxuICBmdW5jdGlvbiBEQihkYikge1xuICAgIHRoaXMuX2RiID0gZGI7XG4gIH1cblxuICBEQi5wcm90b3R5cGUudHJhbnNhY3Rpb24gPSBmdW5jdGlvbigpIHtcbiAgICByZXR1cm4gbmV3IFRyYW5zYWN0aW9uKHRoaXMuX2RiLnRyYW5zYWN0aW9uLmFwcGx5KHRoaXMuX2RiLCBhcmd1bWVudHMpKTtcbiAgfTtcblxuICBwcm94eVByb3BlcnRpZXMoREIsICdfZGInLCBbXG4gICAgJ25hbWUnLFxuICAgICd2ZXJzaW9uJyxcbiAgICAnb2JqZWN0U3RvcmVOYW1lcydcbiAgXSk7XG5cbiAgcHJveHlNZXRob2RzKERCLCAnX2RiJywgSURCRGF0YWJhc2UsIFtcbiAgICAnY2xvc2UnXG4gIF0pO1xuXG4gIC8vIEFkZCBjdXJzb3IgaXRlcmF0b3JzXG4gIC8vIFRPRE86IHJlbW92ZSB0aGlzIG9uY2UgYnJvd3NlcnMgZG8gdGhlIHJpZ2h0IHRoaW5nIHdpdGggcHJvbWlzZXNcbiAgWydvcGVuQ3Vyc29yJywgJ29wZW5LZXlDdXJzb3InXS5mb3JFYWNoKGZ1bmN0aW9uKGZ1bmNOYW1lKSB7XG4gICAgW09iamVjdFN0b3JlLCBJbmRleF0uZm9yRWFjaChmdW5jdGlvbihDb25zdHJ1Y3Rvcikge1xuICAgICAgQ29uc3RydWN0b3IucHJvdG90eXBlW2Z1bmNOYW1lLnJlcGxhY2UoJ29wZW4nLCAnaXRlcmF0ZScpXSA9IGZ1bmN0aW9uKCkge1xuICAgICAgICB2YXIgYXJncyA9IHRvQXJyYXkoYXJndW1lbnRzKTtcbiAgICAgICAgdmFyIGNhbGxiYWNrID0gYXJnc1thcmdzLmxlbmd0aCAtIDFdO1xuICAgICAgICB2YXIgbmF0aXZlT2JqZWN0ID0gdGhpcy5fc3RvcmUgfHwgdGhpcy5faW5kZXg7XG4gICAgICAgIHZhciByZXF1ZXN0ID0gbmF0aXZlT2JqZWN0W2Z1bmNOYW1lXS5hcHBseShuYXRpdmVPYmplY3QsIGFyZ3Muc2xpY2UoMCwgLTEpKTtcbiAgICAgICAgcmVxdWVzdC5vbnN1Y2Nlc3MgPSBmdW5jdGlvbigpIHtcbiAgICAgICAgICBjYWxsYmFjayhyZXF1ZXN0LnJlc3VsdCk7XG4gICAgICAgIH07XG4gICAgICB9O1xuICAgIH0pO1xuICB9KTtcblxuICAvLyBwb2x5ZmlsbCBnZXRBbGxcbiAgW0luZGV4LCBPYmplY3RTdG9yZV0uZm9yRWFjaChmdW5jdGlvbihDb25zdHJ1Y3Rvcikge1xuICAgIGlmIChDb25zdHJ1Y3Rvci5wcm90b3R5cGUuZ2V0QWxsKSByZXR1cm47XG4gICAgQ29uc3RydWN0b3IucHJvdG90eXBlLmdldEFsbCA9IGZ1bmN0aW9uKHF1ZXJ5LCBjb3VudCkge1xuICAgICAgdmFyIGluc3RhbmNlID0gdGhpcztcbiAgICAgIHZhciBpdGVtcyA9IFtdO1xuXG4gICAgICByZXR1cm4gbmV3IFByb21pc2UoZnVuY3Rpb24ocmVzb2x2ZSkge1xuICAgICAgICBpbnN0YW5jZS5pdGVyYXRlQ3Vyc29yKHF1ZXJ5LCBmdW5jdGlvbihjdXJzb3IpIHtcbiAgICAgICAgICBpZiAoIWN1cnNvcikge1xuICAgICAgICAgICAgcmVzb2x2ZShpdGVtcyk7XG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgICAgfVxuICAgICAgICAgIGl0ZW1zLnB1c2goY3Vyc29yLnZhbHVlKTtcblxuICAgICAgICAgIGlmIChjb3VudCAhPT0gdW5kZWZpbmVkICYmIGl0ZW1zLmxlbmd0aCA9PSBjb3VudCkge1xuICAgICAgICAgICAgcmVzb2x2ZShpdGVtcyk7XG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgICAgfVxuICAgICAgICAgIGN1cnNvci5jb250aW51ZSgpO1xuICAgICAgICB9KTtcbiAgICAgIH0pO1xuICAgIH07XG4gIH0pO1xuXG4gIHZhciBleHAgPSB7XG4gICAgb3BlbjogZnVuY3Rpb24obmFtZSwgdmVyc2lvbiwgdXBncmFkZUNhbGxiYWNrKSB7XG4gICAgICB2YXIgcCA9IHByb21pc2lmeVJlcXVlc3RDYWxsKGluZGV4ZWREQiwgJ29wZW4nLCBbbmFtZSwgdmVyc2lvbl0pO1xuICAgICAgdmFyIHJlcXVlc3QgPSBwLnJlcXVlc3Q7XG5cbiAgICAgIHJlcXVlc3Qub251cGdyYWRlbmVlZGVkID0gZnVuY3Rpb24oZXZlbnQpIHtcbiAgICAgICAgaWYgKHVwZ3JhZGVDYWxsYmFjaykge1xuICAgICAgICAgIHVwZ3JhZGVDYWxsYmFjayhuZXcgVXBncmFkZURCKHJlcXVlc3QucmVzdWx0LCBldmVudC5vbGRWZXJzaW9uLCByZXF1ZXN0LnRyYW5zYWN0aW9uKSk7XG4gICAgICAgIH1cbiAgICAgIH07XG5cbiAgICAgIHJldHVybiBwLnRoZW4oZnVuY3Rpb24oZGIpIHtcbiAgICAgICAgcmV0dXJuIG5ldyBEQihkYik7XG4gICAgICB9KTtcbiAgICB9LFxuICAgIGRlbGV0ZTogZnVuY3Rpb24obmFtZSkge1xuICAgICAgcmV0dXJuIHByb21pc2lmeVJlcXVlc3RDYWxsKGluZGV4ZWREQiwgJ2RlbGV0ZURhdGFiYXNlJywgW25hbWVdKTtcbiAgICB9XG4gIH07XG5cbiAgaWYgKHR5cGVvZiBtb2R1bGUgIT09ICd1bmRlZmluZWQnKSB7XG4gICAgbW9kdWxlLmV4cG9ydHMgPSBleHA7XG4gIH1cbiAgZWxzZSB7XG4gICAgc2VsZi5pZGIgPSBleHA7XG4gIH1cbn0oKSk7XG4iLCIvLyBzaGltIGZvciB1c2luZyBwcm9jZXNzIGluIGJyb3dzZXJcbnZhciBwcm9jZXNzID0gbW9kdWxlLmV4cG9ydHMgPSB7fTtcblxuLy8gY2FjaGVkIGZyb20gd2hhdGV2ZXIgZ2xvYmFsIGlzIHByZXNlbnQgc28gdGhhdCB0ZXN0IHJ1bm5lcnMgdGhhdCBzdHViIGl0XG4vLyBkb24ndCBicmVhayB0aGluZ3MuICBCdXQgd2UgbmVlZCB0byB3cmFwIGl0IGluIGEgdHJ5IGNhdGNoIGluIGNhc2UgaXQgaXNcbi8vIHdyYXBwZWQgaW4gc3RyaWN0IG1vZGUgY29kZSB3aGljaCBkb2Vzbid0IGRlZmluZSBhbnkgZ2xvYmFscy4gIEl0J3MgaW5zaWRlIGFcbi8vIGZ1bmN0aW9uIGJlY2F1c2UgdHJ5L2NhdGNoZXMgZGVvcHRpbWl6ZSBpbiBjZXJ0YWluIGVuZ2luZXMuXG5cbnZhciBjYWNoZWRTZXRUaW1lb3V0O1xudmFyIGNhY2hlZENsZWFyVGltZW91dDtcblxuZnVuY3Rpb24gZGVmYXVsdFNldFRpbW91dCgpIHtcbiAgICB0aHJvdyBuZXcgRXJyb3IoJ3NldFRpbWVvdXQgaGFzIG5vdCBiZWVuIGRlZmluZWQnKTtcbn1cbmZ1bmN0aW9uIGRlZmF1bHRDbGVhclRpbWVvdXQgKCkge1xuICAgIHRocm93IG5ldyBFcnJvcignY2xlYXJUaW1lb3V0IGhhcyBub3QgYmVlbiBkZWZpbmVkJyk7XG59XG4oZnVuY3Rpb24gKCkge1xuICAgIHRyeSB7XG4gICAgICAgIGlmICh0eXBlb2Ygc2V0VGltZW91dCA9PT0gJ2Z1bmN0aW9uJykge1xuICAgICAgICAgICAgY2FjaGVkU2V0VGltZW91dCA9IHNldFRpbWVvdXQ7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBjYWNoZWRTZXRUaW1lb3V0ID0gZGVmYXVsdFNldFRpbW91dDtcbiAgICAgICAgfVxuICAgIH0gY2F0Y2ggKGUpIHtcbiAgICAgICAgY2FjaGVkU2V0VGltZW91dCA9IGRlZmF1bHRTZXRUaW1vdXQ7XG4gICAgfVxuICAgIHRyeSB7XG4gICAgICAgIGlmICh0eXBlb2YgY2xlYXJUaW1lb3V0ID09PSAnZnVuY3Rpb24nKSB7XG4gICAgICAgICAgICBjYWNoZWRDbGVhclRpbWVvdXQgPSBjbGVhclRpbWVvdXQ7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBjYWNoZWRDbGVhclRpbWVvdXQgPSBkZWZhdWx0Q2xlYXJUaW1lb3V0O1xuICAgICAgICB9XG4gICAgfSBjYXRjaCAoZSkge1xuICAgICAgICBjYWNoZWRDbGVhclRpbWVvdXQgPSBkZWZhdWx0Q2xlYXJUaW1lb3V0O1xuICAgIH1cbn0gKCkpXG5mdW5jdGlvbiBydW5UaW1lb3V0KGZ1bikge1xuICAgIGlmIChjYWNoZWRTZXRUaW1lb3V0ID09PSBzZXRUaW1lb3V0KSB7XG4gICAgICAgIC8vbm9ybWFsIGVudmlyb21lbnRzIGluIHNhbmUgc2l0dWF0aW9uc1xuICAgICAgICByZXR1cm4gc2V0VGltZW91dChmdW4sIDApO1xuICAgIH1cbiAgICAvLyBpZiBzZXRUaW1lb3V0IHdhc24ndCBhdmFpbGFibGUgYnV0IHdhcyBsYXR0ZXIgZGVmaW5lZFxuICAgIGlmICgoY2FjaGVkU2V0VGltZW91dCA9PT0gZGVmYXVsdFNldFRpbW91dCB8fCAhY2FjaGVkU2V0VGltZW91dCkgJiYgc2V0VGltZW91dCkge1xuICAgICAgICBjYWNoZWRTZXRUaW1lb3V0ID0gc2V0VGltZW91dDtcbiAgICAgICAgcmV0dXJuIHNldFRpbWVvdXQoZnVuLCAwKTtcbiAgICB9XG4gICAgdHJ5IHtcbiAgICAgICAgLy8gd2hlbiB3aGVuIHNvbWVib2R5IGhhcyBzY3Jld2VkIHdpdGggc2V0VGltZW91dCBidXQgbm8gSS5FLiBtYWRkbmVzc1xuICAgICAgICByZXR1cm4gY2FjaGVkU2V0VGltZW91dChmdW4sIDApO1xuICAgIH0gY2F0Y2goZSl7XG4gICAgICAgIHRyeSB7XG4gICAgICAgICAgICAvLyBXaGVuIHdlIGFyZSBpbiBJLkUuIGJ1dCB0aGUgc2NyaXB0IGhhcyBiZWVuIGV2YWxlZCBzbyBJLkUuIGRvZXNuJ3QgdHJ1c3QgdGhlIGdsb2JhbCBvYmplY3Qgd2hlbiBjYWxsZWQgbm9ybWFsbHlcbiAgICAgICAgICAgIHJldHVybiBjYWNoZWRTZXRUaW1lb3V0LmNhbGwobnVsbCwgZnVuLCAwKTtcbiAgICAgICAgfSBjYXRjaChlKXtcbiAgICAgICAgICAgIC8vIHNhbWUgYXMgYWJvdmUgYnV0IHdoZW4gaXQncyBhIHZlcnNpb24gb2YgSS5FLiB0aGF0IG11c3QgaGF2ZSB0aGUgZ2xvYmFsIG9iamVjdCBmb3IgJ3RoaXMnLCBob3BmdWxseSBvdXIgY29udGV4dCBjb3JyZWN0IG90aGVyd2lzZSBpdCB3aWxsIHRocm93IGEgZ2xvYmFsIGVycm9yXG4gICAgICAgICAgICByZXR1cm4gY2FjaGVkU2V0VGltZW91dC5jYWxsKHRoaXMsIGZ1biwgMCk7XG4gICAgICAgIH1cbiAgICB9XG5cblxufVxuZnVuY3Rpb24gcnVuQ2xlYXJUaW1lb3V0KG1hcmtlcikge1xuICAgIGlmIChjYWNoZWRDbGVhclRpbWVvdXQgPT09IGNsZWFyVGltZW91dCkge1xuICAgICAgICAvL25vcm1hbCBlbnZpcm9tZW50cyBpbiBzYW5lIHNpdHVhdGlvbnNcbiAgICAgICAgcmV0dXJuIGNsZWFyVGltZW91dChtYXJrZXIpO1xuICAgIH1cbiAgICAvLyBpZiBjbGVhclRpbWVvdXQgd2Fzbid0IGF2YWlsYWJsZSBidXQgd2FzIGxhdHRlciBkZWZpbmVkXG4gICAgaWYgKChjYWNoZWRDbGVhclRpbWVvdXQgPT09IGRlZmF1bHRDbGVhclRpbWVvdXQgfHwgIWNhY2hlZENsZWFyVGltZW91dCkgJiYgY2xlYXJUaW1lb3V0KSB7XG4gICAgICAgIGNhY2hlZENsZWFyVGltZW91dCA9IGNsZWFyVGltZW91dDtcbiAgICAgICAgcmV0dXJuIGNsZWFyVGltZW91dChtYXJrZXIpO1xuICAgIH1cbiAgICB0cnkge1xuICAgICAgICAvLyB3aGVuIHdoZW4gc29tZWJvZHkgaGFzIHNjcmV3ZWQgd2l0aCBzZXRUaW1lb3V0IGJ1dCBubyBJLkUuIG1hZGRuZXNzXG4gICAgICAgIHJldHVybiBjYWNoZWRDbGVhclRpbWVvdXQobWFya2VyKTtcbiAgICB9IGNhdGNoIChlKXtcbiAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgIC8vIFdoZW4gd2UgYXJlIGluIEkuRS4gYnV0IHRoZSBzY3JpcHQgaGFzIGJlZW4gZXZhbGVkIHNvIEkuRS4gZG9lc24ndCAgdHJ1c3QgdGhlIGdsb2JhbCBvYmplY3Qgd2hlbiBjYWxsZWQgbm9ybWFsbHlcbiAgICAgICAgICAgIHJldHVybiBjYWNoZWRDbGVhclRpbWVvdXQuY2FsbChudWxsLCBtYXJrZXIpO1xuICAgICAgICB9IGNhdGNoIChlKXtcbiAgICAgICAgICAgIC8vIHNhbWUgYXMgYWJvdmUgYnV0IHdoZW4gaXQncyBhIHZlcnNpb24gb2YgSS5FLiB0aGF0IG11c3QgaGF2ZSB0aGUgZ2xvYmFsIG9iamVjdCBmb3IgJ3RoaXMnLCBob3BmdWxseSBvdXIgY29udGV4dCBjb3JyZWN0IG90aGVyd2lzZSBpdCB3aWxsIHRocm93IGEgZ2xvYmFsIGVycm9yLlxuICAgICAgICAgICAgLy8gU29tZSB2ZXJzaW9ucyBvZiBJLkUuIGhhdmUgZGlmZmVyZW50IHJ1bGVzIGZvciBjbGVhclRpbWVvdXQgdnMgc2V0VGltZW91dFxuICAgICAgICAgICAgcmV0dXJuIGNhY2hlZENsZWFyVGltZW91dC5jYWxsKHRoaXMsIG1hcmtlcik7XG4gICAgICAgIH1cbiAgICB9XG5cblxuXG59XG52YXIgcXVldWUgPSBbXTtcbnZhciBkcmFpbmluZyA9IGZhbHNlO1xudmFyIGN1cnJlbnRRdWV1ZTtcbnZhciBxdWV1ZUluZGV4ID0gLTE7XG5cbmZ1bmN0aW9uIGNsZWFuVXBOZXh0VGljaygpIHtcbiAgICBpZiAoIWRyYWluaW5nIHx8ICFjdXJyZW50UXVldWUpIHtcbiAgICAgICAgcmV0dXJuO1xuICAgIH1cbiAgICBkcmFpbmluZyA9IGZhbHNlO1xuICAgIGlmIChjdXJyZW50UXVldWUubGVuZ3RoKSB7XG4gICAgICAgIHF1ZXVlID0gY3VycmVudFF1ZXVlLmNvbmNhdChxdWV1ZSk7XG4gICAgfSBlbHNlIHtcbiAgICAgICAgcXVldWVJbmRleCA9IC0xO1xuICAgIH1cbiAgICBpZiAocXVldWUubGVuZ3RoKSB7XG4gICAgICAgIGRyYWluUXVldWUoKTtcbiAgICB9XG59XG5cbmZ1bmN0aW9uIGRyYWluUXVldWUoKSB7XG4gICAgaWYgKGRyYWluaW5nKSB7XG4gICAgICAgIHJldHVybjtcbiAgICB9XG4gICAgdmFyIHRpbWVvdXQgPSBydW5UaW1lb3V0KGNsZWFuVXBOZXh0VGljayk7XG4gICAgZHJhaW5pbmcgPSB0cnVlO1xuXG4gICAgdmFyIGxlbiA9IHF1ZXVlLmxlbmd0aDtcbiAgICB3aGlsZShsZW4pIHtcbiAgICAgICAgY3VycmVudFF1ZXVlID0gcXVldWU7XG4gICAgICAgIHF1ZXVlID0gW107XG4gICAgICAgIHdoaWxlICgrK3F1ZXVlSW5kZXggPCBsZW4pIHtcbiAgICAgICAgICAgIGlmIChjdXJyZW50UXVldWUpIHtcbiAgICAgICAgICAgICAgICBjdXJyZW50UXVldWVbcXVldWVJbmRleF0ucnVuKCk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgcXVldWVJbmRleCA9IC0xO1xuICAgICAgICBsZW4gPSBxdWV1ZS5sZW5ndGg7XG4gICAgfVxuICAgIGN1cnJlbnRRdWV1ZSA9IG51bGw7XG4gICAgZHJhaW5pbmcgPSBmYWxzZTtcbiAgICBydW5DbGVhclRpbWVvdXQodGltZW91dCk7XG59XG5cbnByb2Nlc3MubmV4dFRpY2sgPSBmdW5jdGlvbiAoZnVuKSB7XG4gICAgdmFyIGFyZ3MgPSBuZXcgQXJyYXkoYXJndW1lbnRzLmxlbmd0aCAtIDEpO1xuICAgIGlmIChhcmd1bWVudHMubGVuZ3RoID4gMSkge1xuICAgICAgICBmb3IgKHZhciBpID0gMTsgaSA8IGFyZ3VtZW50cy5sZW5ndGg7IGkrKykge1xuICAgICAgICAgICAgYXJnc1tpIC0gMV0gPSBhcmd1bWVudHNbaV07XG4gICAgICAgIH1cbiAgICB9XG4gICAgcXVldWUucHVzaChuZXcgSXRlbShmdW4sIGFyZ3MpKTtcbiAgICBpZiAocXVldWUubGVuZ3RoID09PSAxICYmICFkcmFpbmluZykge1xuICAgICAgICBydW5UaW1lb3V0KGRyYWluUXVldWUpO1xuICAgIH1cbn07XG5cbi8vIHY4IGxpa2VzIHByZWRpY3RpYmxlIG9iamVjdHNcbmZ1bmN0aW9uIEl0ZW0oZnVuLCBhcnJheSkge1xuICAgIHRoaXMuZnVuID0gZnVuO1xuICAgIHRoaXMuYXJyYXkgPSBhcnJheTtcbn1cbkl0ZW0ucHJvdG90eXBlLnJ1biA9IGZ1bmN0aW9uICgpIHtcbiAgICB0aGlzLmZ1bi5hcHBseShudWxsLCB0aGlzLmFycmF5KTtcbn07XG5wcm9jZXNzLnRpdGxlID0gJ2Jyb3dzZXInO1xucHJvY2Vzcy5icm93c2VyID0gdHJ1ZTtcbnByb2Nlc3MuZW52ID0ge307XG5wcm9jZXNzLmFyZ3YgPSBbXTtcbnByb2Nlc3MudmVyc2lvbiA9ICcnOyAvLyBlbXB0eSBzdHJpbmcgdG8gYXZvaWQgcmVnZXhwIGlzc3Vlc1xucHJvY2Vzcy52ZXJzaW9ucyA9IHt9O1xuXG5mdW5jdGlvbiBub29wKCkge31cblxucHJvY2Vzcy5vbiA9IG5vb3A7XG5wcm9jZXNzLmFkZExpc3RlbmVyID0gbm9vcDtcbnByb2Nlc3Mub25jZSA9IG5vb3A7XG5wcm9jZXNzLm9mZiA9IG5vb3A7XG5wcm9jZXNzLnJlbW92ZUxpc3RlbmVyID0gbm9vcDtcbnByb2Nlc3MucmVtb3ZlQWxsTGlzdGVuZXJzID0gbm9vcDtcbnByb2Nlc3MuZW1pdCA9IG5vb3A7XG5cbnByb2Nlc3MuYmluZGluZyA9IGZ1bmN0aW9uIChuYW1lKSB7XG4gICAgdGhyb3cgbmV3IEVycm9yKCdwcm9jZXNzLmJpbmRpbmcgaXMgbm90IHN1cHBvcnRlZCcpO1xufTtcblxucHJvY2Vzcy5jd2QgPSBmdW5jdGlvbiAoKSB7IHJldHVybiAnLycgfTtcbnByb2Nlc3MuY2hkaXIgPSBmdW5jdGlvbiAoZGlyKSB7XG4gICAgdGhyb3cgbmV3IEVycm9yKCdwcm9jZXNzLmNoZGlyIGlzIG5vdCBzdXBwb3J0ZWQnKTtcbn07XG5wcm9jZXNzLnVtYXNrID0gZnVuY3Rpb24oKSB7IHJldHVybiAwOyB9O1xuIiwiLyoqXHJcbiAqIFdvcmsgd2l0aCBkYXRhIHN0b3Jlc1xyXG4gKi9cclxuXHJcbmNvbnN0IERFQk9VTkNFX1RJTUUgPSAyMDAwO1xyXG5jb25zdCBEQVRBX1NUT1JFX1JPT1QgPSBcIi9hcGkvZGF0YS9cIjtcclxuXHJcbnZhciBpZGIgPSByZXF1aXJlKFwiaWRiXCIpO1xyXG5cclxuLy8gYWxsIHZhbGlkIGRhdGEgc3RvcmVzXHJcbmNvbnN0IERBVEFfU1RPUkVTID0gW1wiYXNzaWdubWVudHNcIl07XHJcbi8vIGNhY2hlIGRhdGEgc3RvcmUgaW5zdGFuY2VzXHJcbnZhciBzdG9yZXMgPSB7fTtcclxuXHJcbi8vIGdldC9jcmVhdGUgYSBkYXRhc3RvcmVcclxuZXhwb3J0IGZ1bmN0aW9uIHN0b3JlKG5hbWUpIHtcclxuXHQvLyB1c2UgdGhlIGNhY2hlZCBzdG9yZVxyXG5cdGlmKG5hbWUgaW4gc3RvcmVzKSB7XHJcblx0XHRyZXR1cm4gc3RvcmVzW25hbWVdO1xyXG5cdH1cclxuXHJcblx0dmFyIHN0b3JlID0gbmV3IFN0b3JlKG5hbWUpO1xyXG5cclxuXHQvLyBjYWNoZSB0aGUgZGF0YSBzdG9yZSBpbnN0YW5jZVxyXG5cdHN0b3Jlc1tuYW1lXSA9IHN0b3JlO1xyXG5cclxuXHQvLyB0ZWxsIGFueSBsaXN0ZW5lcnMgdGhlIHN0b3JlIGhhcyBiZWVuIGNyZWF0ZWRcclxuXHRsaWZlTGluZS5lbWl0KFwiZGF0YS1zdG9yZS1jcmVhdGVkXCIsIHN0b3JlKTtcclxuXHJcblx0cmV0dXJuIHN0b3JlO1xyXG59O1xyXG5cclxuY2xhc3MgU3RvcmUgZXh0ZW5kcyBsaWZlTGluZS5FdmVudEVtaXR0ZXIge1xyXG5cdGNvbnN0cnVjdG9yKG5hbWUpIHtcclxuXHRcdHN1cGVyKCk7XHJcblx0XHR0aGlzLm5hbWUgPSBuYW1lO1xyXG5cdFx0dGhpcy5fY2FjaGUgPSB7fTtcclxuXHRcdC8vIGRvbid0IHNlbmQgZHVwbGljYXRlIHJlcXVlc3RzXHJcblx0XHR0aGlzLl9yZXF1ZXN0aW5nID0gW107XHJcblx0XHQvLyBwcm9taXNlIGZvciB0aGUgZGF0YWJhc2VcclxuXHRcdHRoaXMuX2RiID0gaWRiLm9wZW4oXCJkYXRhLXN0b3Jlc1wiLCAxLCBkYiA9PiB7XHJcblx0XHRcdC8vIHVwZ3JhZGUgb3IgY3JlYXRlIHRoZSBkYlxyXG5cdFx0XHRzd2l0Y2goZGIub2xkVmVyc2lvbikge1xyXG5cdFx0XHRcdC8vIE5PVEU6IFdlIHdhbnQgY2FzZXMgdG8gZmFsbCB0aHJvdWdoIHNvIGFsbCBzZXR1cCBpcyBjb21wbGV0ZWRcclxuXHRcdFx0XHRjYXNlIDA6XHJcblx0XHRcdFx0XHRmb3IobGV0IG5hbWUgb2YgREFUQV9TVE9SRVMpXHJcblx0XHRcdFx0XHRcdGRiLmNyZWF0ZU9iamVjdFN0b3JlKG5hbWUsIHsga2V5UGF0aDogXCJpZFwiIH0pO1xyXG5cdFx0XHR9XHJcblx0XHR9KTtcclxuXHR9XHJcblxyXG5cdC8vIHNldCB0aGUgZnVuY3Rpb24gdG8gZGVzZXJpYWxpemUgYWxsIGRhdGEgZnJvbSB0aGUgc2VydmVyXHJcblx0c2V0SW5pdChmbikge1xyXG5cdFx0dGhpcy5fZGVzZXJpYWxpemVyID0gZm47XHJcblx0fVxyXG5cclxuXHQvLyBnZXQgYWxsIHRoZSBpdGVtcyBhbmQgbGlzdGVuIGZvciBhbnkgY2hhbmdlc1xyXG5cdGdldEFsbChmbikge1xyXG5cdFx0Ly8gZ28gdG8gdGhlIGNhY2hlIGZpcnN0XHJcblx0XHRmbihhcnJheUZyb21PYmplY3QodGhpcy5fY2FjaGUpKTtcclxuXHJcblx0XHQvLyBsb2FkIGl0ZW1zIGZyb20gaWRiXHJcblx0XHR0aGlzLl9kYi50aGVuKGRiID0+IHtcclxuXHRcdFx0ZGIudHJhbnNhY3Rpb24odGhpcy5uYW1lKVxyXG5cdFx0XHRcdC5vYmplY3RTdG9yZSh0aGlzLm5hbWUpXHJcblx0XHRcdFx0LmdldEFsbCgpXHJcblx0XHRcdFx0LnRoZW4oYWxsID0+IHtcclxuXHRcdFx0XHRcdC8vIHN0b3JlIGl0ZW1zIGluIHRoZSBjYWNoZVxyXG5cdFx0XHRcdFx0Zm9yKGxldCBpdGVtIG9mIGFsbCkge1xyXG5cdFx0XHRcdFx0XHR0aGlzLl9jYWNoZVtpdGVtLmlkXSA9IGl0ZW07XHJcblx0XHRcdFx0XHR9XHJcblxyXG5cdFx0XHRcdFx0Ly8gbm90aWZ5IGxpc3RlbmVycyB3ZSBsb2FkZWQgdGhlIGRhdGFcclxuXHRcdFx0XHRcdHRoaXMuZW1pdChcImNoYW5nZVwiKTtcclxuXHRcdFx0XHR9KTtcclxuXHRcdH0pO1xyXG5cclxuXHRcdC8vIGxpc3RlbiBmb3IgYW55IGNoYW5nZXNcclxuXHRcdHJldHVybiB0aGlzLm9uKFwiY2hhbmdlXCIsICgpID0+IHtcclxuXHRcdFx0Ly8gdGhlIGNoYW5nZXMgd2lsbCB3ZSBpbiB0aGUgY2FjaGVcclxuXHRcdFx0Zm4oYXJyYXlGcm9tT2JqZWN0KHRoaXMuX2NhY2hlKSk7XHJcblx0XHR9KTtcclxuXHR9XHJcblxyXG5cdC8vIGdldCBhIHNpbmdsZSBpdGVtIGFuZCBsaXN0ZW4gZm9yIGNoYW5nZXNcclxuXHRnZXQoaWQsIGZuKSB7XHJcblx0XHQvLyBnbyB0byB0aGUgY2FjaGUgZmlyc3RcclxuXHRcdGZuKHRoaXMuX2NhY2hlW2lkXSk7XHJcblxyXG5cdFx0Ly8gbG9hZCB0aGUgaXRlbSBmcm9tIGlkYlxyXG5cdFx0dGhpcy5fZGIudGhlbihkYiA9PiB7XHJcblx0XHRcdGRiLnRyYW5zYWN0aW9uKHRoaXMubmFtZSlcclxuXHRcdFx0XHQub2JqZWN0U3RvcmUodGhpcy5uYW1lKVxyXG5cdFx0XHRcdC5nZXQoaWQpXHJcblx0XHRcdFx0LnRoZW4oaXRlbSA9PiB7XHJcblx0XHRcdFx0XHRpZihpdGVtKSB7XHJcblx0XHRcdFx0XHRcdC8vIHN0b3JlIGl0ZW0gaW4gdGhlIGNhY2hlXHJcblx0XHRcdFx0XHRcdHRoaXMuX2NhY2hlW2l0ZW0uaWRdID0gaXRlbTtcclxuXHJcblx0XHRcdFx0XHRcdC8vIG5vdGlmeSBsaXN0ZW5lcnMgd2UgbG9hZGVkIHRoZSBkYXRhXHJcblx0XHRcdFx0XHRcdHRoaXMuZW1pdChcImNoYW5nZVwiKTtcclxuXHRcdFx0XHRcdH1cclxuXHRcdFx0XHR9KTtcclxuXHRcdH0pO1xyXG5cclxuXHRcdC8vIGxpc3RlbiBmb3IgYW55IGNoYW5nZXNcclxuXHRcdHJldHVybiB0aGlzLm9uKFwiY2hhbmdlXCIsICgpID0+IHtcclxuXHRcdFx0Zm4odGhpcy5fY2FjaGVbaWRdKTtcclxuXHRcdH0pO1xyXG5cdH1cclxuXHJcblx0Ly8gc3RvcmUgYSB2YWx1ZSBpbiB0aGUgc3RvcmVcclxuXHRzZXQodmFsdWUsIHNraXBzLCBvcHRzID0ge30pIHtcclxuXHRcdC8vIHN0b3JlIHRoZSB2YWx1ZSBpbiB0aGUgY2FjaGVcclxuXHRcdHRoaXMuX2NhY2hlW3ZhbHVlLmlkXSA9IHZhbHVlO1xyXG5cclxuXHRcdC8vIHNhdmUgdGhlIGl0ZW1cclxuXHRcdHZhciBzYXZlID0gKCkgPT4ge1xyXG5cdFx0XHQvLyBzYXZlIHRoZSBpdGVtIGluIHRoZSBkYlxyXG5cdFx0XHR0aGlzLl9kYi50aGVuKGRiID0+IHtcclxuXHRcdFx0XHRkYi50cmFuc2FjdGlvbih0aGlzLm5hbWUsIFwicmVhZHdyaXRlXCIpXHJcblx0XHRcdFx0XHQub2JqZWN0U3RvcmUodGhpcy5uYW1lKVxyXG5cdFx0XHRcdFx0LnB1dCh2YWx1ZSk7XHJcblx0XHRcdH0pO1xyXG5cclxuXHRcdFx0Ly8gc3luYyB0aGUgY2hhbmdlcyB0byB0aGUgc2VydmVyXHJcblx0XHRcdHRoaXMucGFydGlhbEVtaXQoXCJzeW5jXCIsIHNraXBzKTtcclxuXHRcdH07XHJcblxyXG5cdFx0Ly8gZG9uJ3Qgd2FpdCB0byBzZW5kIHRoZSBjaGFuZ2VzIHRvIHRoZSBzZXJ2ZXJcclxuXHRcdGlmKG9wdHMuc2F2ZU5vdykgc2F2ZSgpO1xyXG5cdFx0ZWxzZSBkZWJvdW5jZShgJHt0aGlzLm5hbWV9LyR7dmFsdWUuaWR9YCwgc2F2ZSk7XHJcblxyXG5cdFx0Ly8gZW1pdCBhIGNoYW5nZVxyXG5cdFx0dGhpcy5wYXJ0aWFsRW1pdChcImNoYW5nZVwiLCBza2lwcyk7XHJcblx0fVxyXG5cclxuXHQvLyByZW1vdmUgYSB2YWx1ZSBmcm9tIHRoZSBzdG9yZVxyXG5cdHJlbW92ZShpZCwgc2tpcHMpIHtcclxuXHRcdC8vIHJlbW92ZSB0aGUgdmFsdWUgZnJvbSB0aGUgY2FjaGVcclxuXHRcdGRlbGV0ZSB0aGlzLl9jYWNoZVtpZF07XHJcblxyXG5cdFx0Ly8gZGVsZXRlIHRoZSBpdGVtXHJcblx0XHQvLyBsb2FkIGl0ZW1zIGZyb20gaWRiXHJcblx0XHR0aGlzLl9kYi50aGVuKGRiID0+IHtcclxuXHRcdFx0ZGIudHJhbnNhY3Rpb24odGhpcy5uYW1lLCBcInJlYWR3cml0ZVwiKVxyXG5cdFx0XHQub2JqZWN0U3RvcmUodGhpcy5uYW1lKVxyXG5cdFx0XHQuZGVsZXRlKGlkKTtcclxuXHRcdH0pO1xyXG5cclxuXHRcdC8vIGVtaXQgYSBjaGFuZ2VcclxuXHRcdHRoaXMucGFydGlhbEVtaXQoXCJjaGFuZ2VcIiwgc2tpcHMpO1xyXG5cclxuXHRcdC8vIHN5bmMgdGhlIGNoYW5nZXMgdG8gdGhlIHNlcnZlclxyXG5cdFx0dGhpcy5wYXJ0aWFsRW1pdChcInN5bmNcIiwgc2tpcHMpO1xyXG5cdH1cclxuXHJcblx0Ly8gZm9yY2Ugc2F2ZXMgdG8gZ28gdGhyb3VnaFxyXG5cdGZvcmNlU2F2ZSgpIHtcclxuXHRcdGZvcihsZXQgdGltZXIgb2YgT2JqZWN0LmdldE93blByb3BlcnR5TmFtZXMoZGVib3VuY2VUaW1lcnMpKSB7XHJcblx0XHRcdC8vIG9ubHkgc2F2ZSBpdGVtcyBmcm9tIHRoaXMgZGF0YSBzdG9yZVxyXG5cdFx0XHRpZih0aW1lci5pbmRleE9mKGAke3RoaXMubmFtZX0vYCkgPT09IDApIHtcclxuXHRcdFx0XHRjb250aW51ZTtcclxuXHRcdFx0fVxyXG5cclxuXHRcdFx0Ly8gbG9vayB1cCB0aGUgdGltZXIgaWRcclxuXHRcdFx0bGV0IGlkID0gdGltZXIuc3Vic3RyKHRpbWVyLmluZGV4T2YoXCIvXCIpICsgMSk7XHJcblxyXG5cdFx0XHQvLyBzYXZlIHRoZSBpdGVtIGluIHRoZSBkYlxyXG5cdFx0XHR0aGlzLl9kYi50aGVuKGRiID0+IHtcclxuXHRcdFx0XHRkYi50cmFuc2FjdGlvbih0aGlzLm5hbWUsIFwicmVhZHdyaXRlXCIpXHJcblx0XHRcdFx0XHQub2JqZWN0U3RvcmUodGhpcy5uYW1lKVxyXG5cdFx0XHRcdFx0LnB1dCh2YWx1ZSk7XHJcblx0XHRcdH0pO1xyXG5cclxuXHRcdFx0Ly8gY2xlYXIgdGhlIHRpbWVyXHJcblx0XHRcdGNsZWFyVGltZW91dCh0aW1lcik7XHJcblxyXG5cdFx0XHQvLyByZW1vdmUgdGhlIHRpbWVyIGZyb20gdGhlIGxpc3RcclxuXHRcdFx0ZGVsZXRlIGRlYm91bmNlVGltZXJzW3RpbWVyXTtcclxuXHJcblx0XHRcdC8vIHN5bmMgdGhlIGNoYW5nZXMgdG8gdGhlIHNlcnZlclxyXG5cdFx0XHR0aGlzLmVtaXQoXCJzeW5jXCIpO1xyXG5cdFx0fVxyXG5cdH1cclxufVxyXG5cclxuLy8gZ2V0IGFuIGFycmF5IGZyb20gYW4gb2JqZWN0XHJcbnZhciBhcnJheUZyb21PYmplY3QgPSBmdW5jdGlvbihvYmopIHtcclxuXHRyZXR1cm4gT2JqZWN0LmdldE93blByb3BlcnR5TmFtZXMob2JqKVxyXG5cdFx0Lm1hcChuYW1lID0+IG9ialtuYW1lXSk7XHJcbn07XHJcblxyXG4vLyBkb24ndCBjYWxsIGEgZnVuY3Rpb24gdG9vIG9mdGVuXHJcbnZhciBkZWJvdW5jZVRpbWVycyA9IHt9O1xyXG5cclxudmFyIGRlYm91bmNlID0gKGlkLCBmbikgPT4ge1xyXG5cdC8vIGNhbmNlbCB0aGUgcHJldmlvdXMgZGVsYXlcclxuXHRjbGVhclRpbWVvdXQoZGVib3VuY2VUaW1lcnNbaWRdKTtcclxuXHQvLyBzdGFydCBhIG5ldyBkZWxheVxyXG5cdGRlYm91bmNlVGltZXJzW2lkXSA9IHNldFRpbWVvdXQoZm4sIERFQk9VTkNFX1RJTUUpO1xyXG59O1xyXG4iLCIvKipcclxuICogQnJvd3NlciBzcGVjaWZpYyBnbG9iYWxzXHJcbiAqL1xyXG5cclxubGlmZUxpbmUubWFrZURvbSA9IHJlcXVpcmUoXCIuL3V0aWwvZG9tLW1ha2VyXCIpLmRlZmF1bHQ7XHJcblxyXG4vLyBhZGQgYSBmdW5jdGlvbiBmb3IgYWRkaW5nIGFjdGlvbnNcclxubGlmZUxpbmUuYWRkQWN0aW9uID0gZnVuY3Rpb24obmFtZSwgZm4pIHtcclxuXHQvLyBhdHRhY2ggdGhlIGNhbGxiYWNrXHJcblx0dmFyIGxpc3RlbmVyID0gbGlmZUxpbmUub24oXCJhY3Rpb24tZXhlYy1cIiArIG5hbWUsIGZuKTtcclxuXHJcblx0Ly8gaW5mb3JtIGFueSBhY3Rpb24gcHJvdmlkZXJzXHJcblx0bGlmZUxpbmUuZW1pdChcImFjdGlvbi1jcmVhdGVcIiwgbmFtZSk7XHJcblxyXG5cdC8vIGFsbCBhY3Rpb25zIHJlbW92ZWRcclxuXHR2YXIgcmVtb3ZlQWxsID0gbGlmZUxpbmUub24oXCJhY3Rpb24tcmVtb3ZlLWFsbFwiLCAoKSA9PiB7XHJcblx0XHQvLyByZW1vdmUgdGhlIGFjdGlvbiBsaXN0ZW5lclxyXG5cdFx0bGlzdGVuZXIudW5zdWJzY3JpYmUoKTtcclxuXHRcdHJlbW92ZUFsbC51bnN1YnNjcmliZSgpO1xyXG5cdH0pO1xyXG5cclxuXHRyZXR1cm4ge1xyXG5cdFx0dW5zdWJzY3JpYmUoKSB7XHJcblx0XHRcdC8vIHJlbW92ZSB0aGUgYWN0aW9uIGxpc3RlbmVyXHJcblx0XHRcdGxpc3RlbmVyLnVuc3Vic2NyaWJlKCk7XHJcblx0XHRcdHJlbW92ZUFsbC51bnN1YnNjcmliZSgpO1xyXG5cclxuXHRcdFx0Ly8gaW5mb3JtIGFueSBhY3Rpb24gcHJvdmlkZXJzXHJcblx0XHRcdGxpZmVMaW5lLmVtaXQoXCJhY3Rpb24tcmVtb3ZlXCIsIG5hbWUpO1xyXG5cdFx0fVxyXG5cdH07XHJcbn07XHJcbiIsIi8vIGNyZWF0ZSB0aGUgZ2xvYmFsIG9iamVjdFxyXG5pbXBvcnQgXCIuLi9jb21tb24vZ2xvYmFsXCI7XHJcbmltcG9ydCBcIi4vZ2xvYmFsXCI7XHJcblxyXG4vLyBsb2FkIGFsbCB0aGUgd2lkZ2V0c1xyXG5pbXBvcnQgXCIuL3dpZGdldHMvc2lkZWJhclwiO1xyXG5pbXBvcnQgXCIuL3dpZGdldHMvY29udGVudFwiO1xyXG5pbXBvcnQgXCIuL3dpZGdldHMvbGlua1wiO1xyXG5pbXBvcnQgXCIuL3dpZGdldHMvbGlzdFwiO1xyXG5pbXBvcnQgXCIuL3dpZGdldHMvaW5wdXRcIjtcclxuaW1wb3J0IFwiLi93aWRnZXRzL3RvZ2dsZS1idG5zXCI7XHJcblxyXG4vLyBsb2FkIGFsbCB0aGUgdmlld3NcclxuaW1wb3J0IHtpbml0TmF2QmFyfSBmcm9tIFwiLi92aWV3cy9saXN0c1wiO1xyXG5pbXBvcnQgXCIuL3ZpZXdzL2l0ZW1cIjtcclxuaW1wb3J0IFwiLi92aWV3cy9lZGl0XCI7XHJcbmltcG9ydCBcIi4vdmlld3MvbG9naW5cIjtcclxuaW1wb3J0IFwiLi92aWV3cy9hY2NvdW50XCI7XHJcbmltcG9ydCBcIi4vdmlld3MvdXNlcnNcIjtcclxuaW1wb3J0IFwiLi92aWV3cy90b2RvXCI7XHJcblxyXG4vLyBzZXQgdXAgdGhlIGRhdGEgc3RvcmVcclxuaW1wb3J0IHtzdG9yZX0gZnJvbSBcIi4vZGF0YS1zdG9yZVwiO1xyXG5cclxuc3RvcmUoXCJhc3NpZ25tZW50c1wiKS5zZXRJbml0KGZ1bmN0aW9uKGl0ZW0pIHtcclxuXHQvLyBwYXJzZSB0aGUgZGF0ZVxyXG5cdGlmKHR5cGVvZiBpdGVtLmRhdGUgPT0gXCJzdHJpbmdcIikge1xyXG5cdFx0aXRlbS5kYXRlID0gbmV3IERhdGUoaXRlbS5kYXRlKTtcclxuXHR9XHJcbn0pO1xyXG5cclxuLy8gaW5zdGFudGlhdGUgdGhlIGRvbVxyXG5saWZlTGluZS5tYWtlRG9tKHtcclxuXHRwYXJlbnQ6IGRvY3VtZW50LmJvZHksXHJcblx0Z3JvdXA6IFtcclxuXHRcdHsgd2lkZ2V0OiBcInNpZGViYXJcIiB9LFxyXG5cdFx0eyB3aWRnZXQ6IFwiY29udGVudFwiIH1cclxuXHRdXHJcbn0pO1xyXG5cclxuLy8gQWRkIGEgbGluayB0byB0aGUgdG9kYS9ob21lIHBhZ2VcclxubGlmZUxpbmUuYWRkTmF2Q29tbWFuZChcIlRvZG9cIiwgXCIvXCIpO1xyXG5cclxuLy8gYWRkIGxpc3Qgdmlld3MgdG8gdGhlIG5hdmJhclxyXG5pbml0TmF2QmFyKCk7XHJcblxyXG4vLyBjcmVhdGUgYSBuZXcgYXNzaWdubWVudFxyXG5saWZlTGluZS5hZGRDb21tYW5kKFwiTmV3IGFzc2lnbm1lbnRcIiwgKCkgPT4ge1xyXG5cdHZhciBpZCA9IE1hdGguZmxvb3IoTWF0aC5yYW5kb20oKSAqIDEwMDAwMDAwMCk7XHJcblxyXG5cdGxpZmVMaW5lLm5hdi5uYXZpZ2F0ZShcIi9lZGl0L1wiICsgaWQpO1xyXG59KTtcclxuXHJcbi8vIGNyZWF0ZSB0aGUgbG9nb3V0IGJ1dHRvblxyXG5saWZlTGluZS5hZGROYXZDb21tYW5kKFwiQWNjb3VudFwiLCBcIi9hY2NvdW50XCIpO1xyXG4iLCIvKipcclxuICogRGF0ZSByZWxhdGVkIHRvb2xzXHJcbiAqL1xyXG5cclxuIC8vIGNoZWNrIGlmIHRoZSBkYXRlcyBhcmUgdGhlIHNhbWUgZGF5XHJcbiBleHBvcnQgZnVuY3Rpb24gaXNTYW1lRGF0ZShkYXRlMSwgZGF0ZTIpIHtcclxuIFx0cmV0dXJuIGRhdGUxLmdldEZ1bGxZZWFyKCkgPT0gZGF0ZTIuZ2V0RnVsbFllYXIoKSAmJlxyXG4gXHRcdGRhdGUxLmdldE1vbnRoKCkgPT0gZGF0ZTIuZ2V0TW9udGgoKSAmJlxyXG4gXHRcdGRhdGUxLmdldERhdGUoKSA9PSBkYXRlMi5nZXREYXRlKCk7XHJcbiB9O1xyXG5cclxuIC8vIGNoZWNrIGlmIGEgZGF0ZSBpcyBsZXNzIHRoYW4gYW5vdGhlclxyXG4gZXhwb3J0IGZ1bmN0aW9uIGlzU29vbmVyRGF0ZShkYXRlMSwgZGF0ZTIpIHtcclxuICAgICAvLyBjaGVjayB0aGUgeWVhciBmaXJzdFxyXG4gICAgIGlmKGRhdGUxLmdldEZ1bGxZZWFyKCkgIT0gZGF0ZTIuZ2V0RnVsbFllYXIoKSkge1xyXG4gICAgICAgICByZXR1cm4gZGF0ZTEuZ2V0RnVsbFllYXIoKSA8IGRhdGUyLmdldEZ1bGxZZWFyKCk7XHJcbiAgICAgfVxyXG5cclxuICAgICAvLyBjaGVjayB0aGUgbW9udGggbmV4dFxyXG4gICAgIGlmKGRhdGUxLmdldE1vbnRoKCkgIT0gZGF0ZTIuZ2V0TW9udGgoKSkge1xyXG4gICAgICAgICByZXR1cm4gZGF0ZTEuZ2V0TW9udGgoKSA8IGRhdGUyLmdldE1vbnRoKCk7XHJcbiAgICAgfVxyXG5cclxuICAgICAvLyBjaGVjayB0aGUgZGF5XHJcbiAgICAgcmV0dXJuIGRhdGUxLmdldERhdGUoKSA8IGRhdGUyLmdldERhdGUoKTtcclxuIH07XHJcblxyXG4gLy8gZ2V0IHRoZSBkYXRlIGRheXMgZnJvbSBub3dcclxuIGV4cG9ydCBmdW5jdGlvbiBkYXlzRnJvbU5vdyhkYXlzKSB7XHJcbiBcdHZhciBkYXRlID0gbmV3IERhdGUoKTtcclxuXHJcbiBcdC8vIGFkdmFuY2UgdGhlIGRhdGVcclxuIFx0ZGF0ZS5zZXREYXRlKGRhdGUuZ2V0RGF0ZSgpICsgZGF5cyk7XHJcblxyXG4gXHRyZXR1cm4gZGF0ZTtcclxuIH07XHJcblxyXG4gY29uc3QgU1RSSU5HX0RBWVMgPSBbXCJTdW5kYXlcIiwgXCJNb25kYXlcIiwgXCJUdWVzZGF5XCIsIFwiV2VkZW5zZGF5XCIsIFwiVGh1cnNkYXlcIiwgXCJGcmlkYXlcIiwgXCJTYXR1cmRheVwiXTtcclxuXHJcbiAvLyBjb252ZXJ0IGEgZGF0ZSB0byBhIHN0cmluZ1xyXG4gZXhwb3J0IGZ1bmN0aW9uIHN0cmluZ2lmeURhdGUoZGF0ZSwgb3B0cyA9IHt9KSB7XHJcblx0IHZhciBzdHJEYXRlLCBzdHJUaW1lID0gXCJcIjtcclxuXHJcbiAgICAgLy8gY2hlY2sgaWYgdGhlIGRhdGUgaXMgYmVmb3JlIHRvZGF5XHJcbiAgICAgdmFyIGJlZm9yZU5vdyA9IGRhdGUuZ2V0VGltZSgpIDwgRGF0ZS5ub3coKTtcclxuXHJcbiBcdC8vIFRvZGF5XHJcbiBcdGlmKGlzU2FtZURhdGUoZGF0ZSwgbmV3IERhdGUoKSkpXHJcbiBcdFx0c3RyRGF0ZSA9IFwiVG9kYXlcIjtcclxuXHJcbiBcdC8vIFRvbW9ycm93XHJcbiBcdGVsc2UgaWYoaXNTYW1lRGF0ZShkYXRlLCBkYXlzRnJvbU5vdygxKSkgJiYgIWJlZm9yZU5vdylcclxuIFx0XHRzdHJEYXRlID0gXCJUb21vcnJvd1wiO1xyXG5cclxuIFx0Ly8gZGF5IG9mIHRoZSB3ZWVrICh0aGlzIHdlZWspXHJcbiBcdGVsc2UgaWYoaXNTb29uZXJEYXRlKGRhdGUsIGRheXNGcm9tTm93KDcpKSAmJiAhYmVmb3JlTm93KVxyXG4gXHRcdHN0ckRhdGUgPSBTVFJJTkdfREFZU1tkYXRlLmdldERheSgpXTtcclxuXHJcbiBcdC8vIHByaW50IHRoZSBkYXRlXHJcbiBcdGVsc2VcclxuXHQgXHRzdHJEYXRlID0gYCR7U1RSSU5HX0RBWVNbZGF0ZS5nZXREYXkoKV19ICR7ZGF0ZS5nZXRNb250aCgpICsgMX0vJHtkYXRlLmdldERhdGUoKX1gO1xyXG5cclxuXHQvLyBhZGQgdGhlIHRpbWUgb25cclxuXHRpZihvcHRzLmluY2x1ZGVUaW1lICYmICFpc1NraXBUaW1lKGRhdGUsIG9wdHMuc2tpcFRpbWVzKSkge1xyXG5cdFx0cmV0dXJuIHN0ckRhdGUgKyBcIiwgXCIgKyBzdHJpbmdpZnlUaW1lKGRhdGUpO1xyXG5cdH1cclxuXHJcblx0cmV0dXJuIHN0ckRhdGU7XHJcbiB9O1xyXG5cclxuLy8gY2hlY2sgaWYgdGhpcyBpcyBvbmUgb2YgdGhlIGdpdmVuIHNraXAgdGltZXNcclxuZXhwb3J0IGZ1bmN0aW9uIGlzU2tpcFRpbWUoZGF0ZSwgc2tpcHMgPSBbXSkge1xyXG5cdHJldHVybiBza2lwcy5maW5kKHNraXAgPT4ge1xyXG5cdFx0cmV0dXJuIHNraXAuaG91ciA9PT0gZGF0ZS5nZXRIb3VycygpICYmIHNraXAubWludXRlID09PSBkYXRlLmdldE1pbnV0ZXMoKTtcclxuXHR9KTtcclxufTtcclxuXHJcbi8vIGNvbnZlcnQgYSB0aW1lIHRvIGEgc3RyaW5nXHJcbmV4cG9ydCBmdW5jdGlvbiBzdHJpbmdpZnlUaW1lKGRhdGUpIHtcclxuXHR2YXIgaG91ciA9IGRhdGUuZ2V0SG91cnMoKTtcclxuXHJcblx0Ly8gZ2V0IHRoZSBhbS9wbSB0aW1lXHJcblx0dmFyIGlzQW0gPSBob3VyIDwgMTI7XHJcblxyXG5cdC8vIG1pZG5pZ2h0XHJcblx0aWYoaG91ciA9PT0gMCkgaG91ciA9IDEyO1xyXG5cdC8vIGFmdGVyIG5vb25cclxuXHRpZihob3VyID4gMTIpIGhvdXIgPSBob3VyIC0gMTI7XHJcblxyXG5cdHZhciBtaW51dGUgPSBkYXRlLmdldE1pbnV0ZXMoKTtcclxuXHJcblx0Ly8gYWRkIGEgbGVhZGluZyAwXHJcblx0aWYobWludXRlIDwgMTApIG1pbnV0ZSA9IFwiMFwiICsgbWludXRlO1xyXG5cclxuXHRyZXR1cm4gaG91ciArIFwiOlwiICsgbWludXRlICsgKGlzQW0gPyBcImFtXCIgOiBcInBtXCIpO1xyXG59XHJcbiIsIi8qKlxyXG4gKiBBIGhlbHBlciBmb3IgYnVpbGRpbmcgZG9tIG5vZGVzXHJcbiAqL1xyXG5cclxuY29uc3QgU1ZHX0VMRU1FTlRTID0gW1wic3ZnXCIsIFwibGluZVwiXTtcclxuY29uc3QgU1ZHX05BTUVTUEFDRSA9IFwiaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmdcIjtcclxuXHJcbi8vIGJ1aWxkIGEgc2luZ2xlIGRvbSBub2RlXHJcbnZhciBtYWtlRG9tID0gZnVuY3Rpb24ob3B0cyA9IHt9KSB7XHJcblx0Ly8gZ2V0IG9yIGNyZWF0ZSB0aGUgbmFtZSBtYXBwaW5nXHJcblx0dmFyIG1hcHBlZCA9IG9wdHMubWFwcGVkIHx8IHt9O1xyXG5cclxuXHR2YXIgJGVsO1xyXG5cclxuXHQvLyB0aGUgZWxlbWVudCBpcyBwYXJ0IG9mIHRoZSBzdmcgbmFtZXNwYWNlXHJcblx0aWYoU1ZHX0VMRU1FTlRTLmluZGV4T2Yob3B0cy50YWcpICE9PSAtMSkge1xyXG5cdFx0JGVsID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudE5TKFNWR19OQU1FU1BBQ0UsIG9wdHMudGFnKTtcclxuXHR9XHJcblx0Ly8gYSBwbGFpbiBlbGVtZW50XHJcblx0ZWxzZSB7XHJcblx0XHQkZWwgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KG9wdHMudGFnIHx8IFwiZGl2XCIpO1xyXG5cdH1cclxuXHJcblx0Ly8gc2V0IHRoZSBjbGFzc2VzXHJcblx0aWYob3B0cy5jbGFzc2VzKSB7XHJcblx0XHQkZWwuc2V0QXR0cmlidXRlKFwiY2xhc3NcIiwgdHlwZW9mIG9wdHMuY2xhc3NlcyA9PSBcInN0cmluZ1wiID8gb3B0cy5jbGFzc2VzIDogb3B0cy5jbGFzc2VzLmpvaW4oXCIgXCIpKTtcclxuXHR9XHJcblxyXG5cdC8vIGF0dGFjaCB0aGUgYXR0cmlidXRlc1xyXG5cdGlmKG9wdHMuYXR0cnMpIHtcclxuXHRcdE9iamVjdC5nZXRPd25Qcm9wZXJ0eU5hbWVzKG9wdHMuYXR0cnMpXHJcblxyXG5cdFx0LmZvckVhY2goYXR0ciA9PiAkZWwuc2V0QXR0cmlidXRlKGF0dHIsIG9wdHMuYXR0cnNbYXR0cl0pKTtcclxuXHR9XHJcblxyXG5cdC8vIHNldCB0aGUgdGV4dCBjb250ZW50XHJcblx0aWYob3B0cy50ZXh0KSB7XHJcblx0XHQkZWwuaW5uZXJUZXh0ID0gb3B0cy50ZXh0O1xyXG5cdH1cclxuXHJcblx0Ly8gYXR0YWNoIHRoZSBub2RlIHRvIGl0cyBwYXJlbnRcclxuXHRpZihvcHRzLnBhcmVudCkge1xyXG5cdFx0b3B0cy5wYXJlbnQuaW5zZXJ0QmVmb3JlKCRlbCwgb3B0cy5iZWZvcmUpO1xyXG5cdH1cclxuXHJcblx0Ly8gYWRkIGV2ZW50IGxpc3RlbmVyc1xyXG5cdGlmKG9wdHMub24pIHtcclxuXHRcdGZvcihsZXQgbmFtZSBvZiBPYmplY3QuZ2V0T3duUHJvcGVydHlOYW1lcyhvcHRzLm9uKSkge1xyXG5cdFx0XHQkZWwuYWRkRXZlbnRMaXN0ZW5lcihuYW1lLCBvcHRzLm9uW25hbWVdKTtcclxuXHJcblx0XHRcdC8vIGF0dGFjaCB0aGUgZG9tIHRvIGEgZGlzcG9zYWJsZVxyXG5cdFx0XHRpZihvcHRzLmRpc3ApIHtcclxuXHRcdFx0XHRvcHRzLmRpc3AuYWRkKHtcclxuXHRcdFx0XHRcdHVuc3Vic2NyaWJlOiAoKSA9PiAkZWwucmVtb3ZlRXZlbnRMaXN0ZW5lcihuYW1lLCBvcHRzLm9uW25hbWVdKVxyXG5cdFx0XHRcdH0pO1xyXG5cdFx0XHR9XHJcblx0XHR9XHJcblx0fVxyXG5cclxuXHQvLyBzZXQgdGhlIHZhbHVlIG9mIGFuIGlucHV0IGVsZW1lbnRcclxuXHRpZihvcHRzLnZhbHVlKSB7XHJcblx0XHQkZWwudmFsdWUgPSBvcHRzLnZhbHVlO1xyXG5cdH1cclxuXHJcblx0Ly8gYWRkIHRoZSBuYW1lIG1hcHBpbmdcclxuXHRpZihvcHRzLm5hbWUpIHtcclxuXHRcdG1hcHBlZFtvcHRzLm5hbWVdID0gJGVsO1xyXG5cdH1cclxuXHJcblx0Ly8gY3JlYXRlIHRoZSBjaGlsZCBkb20gbm9kZXNcclxuXHRpZihvcHRzLmNoaWxkcmVuKSB7XHJcblx0XHRmb3IobGV0IGNoaWxkIG9mIG9wdHMuY2hpbGRyZW4pIHtcclxuXHRcdFx0Ly8gbWFrZSBhbiBhcnJheSBpbnRvIGEgZ3JvdXAgT2JqZWN0XHJcblx0XHRcdGlmKEFycmF5LmlzQXJyYXkoY2hpbGQpKSB7XHJcblx0XHRcdFx0Y2hpbGQgPSB7XHJcblx0XHRcdFx0XHRncm91cDogY2hpbGRcclxuXHRcdFx0XHR9O1xyXG5cdFx0XHR9XHJcblxyXG5cdFx0XHQvLyBhdHRhY2ggaW5mb3JtYXRpb24gZm9yIHRoZSBncm91cFxyXG5cdFx0XHRjaGlsZC5wYXJlbnQgPSAkZWw7XHJcblx0XHRcdGNoaWxkLmRpc3AgPSBvcHRzLmRpc3A7XHJcblx0XHRcdGNoaWxkLm1hcHBlZCA9IG1hcHBlZDtcclxuXHJcblx0XHRcdC8vIGJ1aWxkIHRoZSBub2RlIG9yIGdyb3VwXHJcblx0XHRcdG1ha2UoY2hpbGQpO1xyXG5cdFx0fVxyXG5cdH1cclxuXHJcblx0cmV0dXJuIG1hcHBlZDtcclxufVxyXG5cclxuLy8gYnVpbGQgYSBncm91cCBvZiBkb20gbm9kZXNcclxudmFyIG1ha2VHcm91cCA9IGZ1bmN0aW9uKGdyb3VwKSB7XHJcblx0Ly8gc2hvcnRoYW5kIGZvciBhIGdyb3Vwc1xyXG5cdGlmKEFycmF5LmlzQXJyYXkoZ3JvdXApKSB7XHJcblx0XHRncm91cCA9IHtcclxuXHRcdFx0Y2hpbGRyZW46IGdyb3VwXHJcblx0XHR9O1xyXG5cdH1cclxuXHJcblx0Ly8gZ2V0IG9yIGNyZWF0ZSB0aGUgbmFtZSBtYXBwaW5nXHJcblx0dmFyIG1hcHBlZCA9IHt9O1xyXG5cclxuXHRmb3IobGV0IG5vZGUgb2YgZ3JvdXAuZ3JvdXApIHtcclxuXHRcdC8vIGNvcHkgb3ZlciBwcm9wZXJ0aWVzIGZyb20gdGhlIGdyb3VwXHJcblx0XHRub2RlLnBhcmVudCB8fCAobm9kZS5wYXJlbnQgPSBncm91cC5wYXJlbnQpO1xyXG5cdFx0bm9kZS5kaXNwIHx8IChub2RlLmRpc3AgPSBncm91cC5kaXNwKTtcclxuXHRcdG5vZGUubWFwcGVkID0gbWFwcGVkO1xyXG5cclxuXHRcdC8vIG1ha2UgdGhlIGRvbVxyXG5cdFx0bWFrZShub2RlKTtcclxuXHR9XHJcblxyXG5cdC8vIGNhbGwgdGhlIGNhbGxiYWNrIHdpdGggdGhlIG1hcHBlZCBuYW1lc1xyXG5cdGlmKGdyb3VwLmJpbmQpIHtcclxuXHRcdHZhciBzdWJzY3JpcHRpb24gPSBncm91cC5iaW5kKG1hcHBlZCk7XHJcblxyXG5cdFx0Ly8gaWYgdGhlIHJldHVybiBhIHN1YnNjcmlwdGlvbiBhdHRhY2ggaXQgdG8gdGhlIGRpc3Bvc2FibGVcclxuXHRcdGlmKHN1YnNjcmlwdGlvbiAmJiBncm91cC5kaXNwKSB7XHJcblx0XHRcdGdyb3VwLmRpc3AuYWRkKHN1YnNjcmlwdGlvbik7XHJcblx0XHR9XHJcblx0fVxyXG5cclxuXHRyZXR1cm4gbWFwcGVkO1xyXG59O1xyXG5cclxuLy8gYSBjb2xsZWN0aW9uIG9mIHdpZGdldHNcclxudmFyIHdpZGdldHMgPSB7fTtcclxuXHJcbmV4cG9ydCBkZWZhdWx0IGZ1bmN0aW9uIG1ha2Uob3B0cykge1xyXG5cdC8vIGhhbmRsZSBhIGdyb3VwXHJcblx0aWYoQXJyYXkuaXNBcnJheShvcHRzKSB8fCBvcHRzLmdyb3VwKSB7XHJcblx0XHRyZXR1cm4gbWFrZUdyb3VwKG9wdHMpO1xyXG5cdH1cclxuXHQvLyBtYWtlIGEgd2lkZ2V0XHJcblx0ZWxzZSBpZihvcHRzLndpZGdldCkge1xyXG5cdFx0dmFyIHdpZGdldCA9IHdpZGdldHNbb3B0cy53aWRnZXRdO1xyXG5cclxuXHRcdC8vIG5vdCBkZWZpbmVkXHJcblx0XHRpZighd2lkZ2V0KSB7XHJcblx0XHRcdHRocm93IG5ldyBFcnJvcihgV2lkZ2V0ICcke29wdHMud2lkZ2V0fScgaXMgbm90IGRlZmluZWQgbWFrZSBzdXJlIGl0cyBiZWVuIGltcG9ydGVkYCk7XHJcblx0XHR9XHJcblxyXG5cdFx0Ly8gZ2VuZXJhdGUgdGhlIHdpZGdldCBjb250ZW50XHJcblx0XHR2YXIgYnVpbHQgPSB3aWRnZXQubWFrZShvcHRzKTtcclxuXHJcblx0XHRyZXR1cm4gbWFrZUdyb3VwKHtcclxuXHRcdFx0cGFyZW50OiBvcHRzLnBhcmVudCxcclxuXHRcdFx0ZGlzcDogb3B0cy5kaXNwLFxyXG5cdFx0XHRncm91cDogQXJyYXkuaXNBcnJheShidWlsdCkgPyBidWlsdCA6IFtidWlsdF0sXHJcblx0XHRcdGJpbmQ6IHdpZGdldC5iaW5kICYmIHdpZGdldC5iaW5kLmJpbmQod2lkZ2V0LCBvcHRzKVxyXG5cdFx0fSk7XHJcblx0fVxyXG5cdC8vIG1ha2UgYSBzaW5nbGUgbm9kZVxyXG5cdGVsc2Uge1xyXG5cdFx0cmV0dXJuIG1ha2VEb20ob3B0cyk7XHJcblx0fVxyXG59O1xyXG5cclxuLy8gcmVnaXN0ZXIgYSB3aWRnZXRcclxubWFrZS5yZWdpc3RlciA9IGZ1bmN0aW9uKG5hbWUsIHdpZGdldCkge1xyXG5cdHdpZGdldHNbbmFtZV0gPSB3aWRnZXQ7XHJcbn07XHJcbiIsIi8qKlxyXG4gKiBBIHZpZXcgZm9yIGFjY2Vzc2luZy9tb2RpZnlpbmcgaW5mb3JtYXRpb24gYWJvdXQgdGhlIGN1cnJlbnQgdXNlclxyXG4gKi9cclxuXHJcbmltcG9ydCB7Z2VuQmFja3VwTmFtZX0gZnJvbSBcIi4uLy4uL2NvbW1vbi9iYWNrdXBcIjtcclxuXHJcbmxpZmVMaW5lLm5hdi5yZWdpc3Rlcih7XHJcblx0bWF0Y2hlcjogL14oPzpcXC91c2VyXFwvKC4rPyl8XFwvYWNjb3VudCkkLyxcclxuXHJcblx0bWFrZSh7c2V0VGl0bGUsIGNvbnRlbnQsIG1hdGNofSkge1xyXG5cdFx0c2V0VGl0bGUoXCJBY2NvdW50XCIpO1xyXG5cclxuXHRcdHZhciB1cmwgPSBcIi9hcGkvYXV0aC9pbmZvL2dldFwiO1xyXG5cclxuXHRcdC8vIGFkZCB0aGUgdXNlcm5hbWUgaWYgb25lIGlzIGdpdmVuXHJcblx0XHRpZihtYXRjaFsxXSkgdXJsICs9IGA/dXNlcm5hbWU9JHttYXRjaFsxXX1gO1xyXG5cclxuXHRcdC8vIGxvYWQgdGhlIHVzZXIgZGF0YVxyXG5cdFx0ZmV0Y2godXJsLCB7IGNyZWRlbnRpYWxzOiBcImluY2x1ZGVcIiB9KVxyXG5cclxuXHRcdC50aGVuKHJlcyA9PiByZXMuanNvbigpKVxyXG5cclxuXHRcdC50aGVuKHJlcyA9PiB7XHJcblx0XHRcdC8vIG5vIHN1Y2ggdXNlciBvciBhY2Nlc3MgaXMgZGVuaWVkXHJcblx0XHRcdGlmKHJlcy5zdGF0dXMgPT0gXCJmYWlsXCIpIHtcclxuXHRcdFx0XHRsaWZlTGluZS5tYWtlRG9tKHtcclxuXHRcdFx0XHRcdHBhcmVudDogY29udGVudCxcclxuXHRcdFx0XHRcdGNsYXNzZXM6IFwiY29udGVudC1wYWRkZWRcIixcclxuXHRcdFx0XHRcdHRleHQ6IFwiQ291bGQgbm90IGFjY2VzcyB0aGUgdXNlciB5b3Ugd2VyZSBsb29raW5nIGZvclwiXHJcblx0XHRcdFx0fSk7XHJcblxyXG5cdFx0XHRcdHJldHVybjtcclxuXHRcdFx0fVxyXG5cclxuXHRcdFx0dmFyIHVzZXIgPSByZXMuZGF0YTtcclxuXHJcblx0XHRcdC8vIGdlbmVyYXRlIHRoZSBwYWdlXHJcblx0XHRcdHZhciBjaGlsZHJlbiA9IFtdO1xyXG5cclxuXHRcdFx0Y2hpbGRyZW4ucHVzaCh7XHJcblx0XHRcdFx0dGFnOiBcImgyXCIsXHJcblx0XHRcdFx0dGV4dDogdXNlci51c2VybmFtZVxyXG5cdFx0XHR9KTtcclxuXHJcblx0XHRcdC8vIGRpc3BsYXkgdGhlIGFkbWluIHN0YXR1cyBvZiBhbm90aGVyIHVzZXJcclxuXHRcdFx0aWYobWF0Y2hbMV0pIHtcclxuXHRcdFx0XHRjaGlsZHJlbi5wdXNoKHtcclxuXHRcdFx0XHRcdHRleHQ6IGAke3VzZXIudXNlcm5hbWV9IGlzICR7dXNlci5hZG1pbiA/IFwiXCIgOiBcIm5vdFwifSBhbiBhZG1pbmBcclxuXHRcdFx0XHR9KTtcclxuXHRcdFx0fVxyXG5cdFx0XHQvLyBkaXNwbGF5IHRoZSBhZG1pbiBzdGF0dXMgb2YgdGhpcyB1c2VyXHJcblx0XHRcdGVsc2Uge1xyXG5cdFx0XHRcdGNoaWxkcmVuLnB1c2goe1xyXG5cdFx0XHRcdFx0dGV4dDogYFlvdSBhcmUgJHt1c2VyLmFkbWluID8gXCJcIiA6IFwibm90XCJ9IGFuIGFkbWluYFxyXG5cdFx0XHRcdH0pO1xyXG5cclxuXHRcdFx0XHQvLyBhZGQgYSBsaW5rIGF0IGEgbGlzdCBvZiBhbGwgdXNlcnNcclxuXHRcdFx0XHRpZih1c2VyLmFkbWluKSB7XHJcblx0XHRcdFx0XHRjaGlsZHJlbi5wdXNoKHsgdGFnOiBcImJyXCIgfSk7XHJcblxyXG5cdFx0XHRcdFx0Y2hpbGRyZW4ucHVzaCh7XHJcblx0XHRcdFx0XHRcdHdpZGdldDogXCJsaW5rXCIsXHJcblx0XHRcdFx0XHRcdGhyZWY6IFwiL3VzZXJzXCIsXHJcblx0XHRcdFx0XHRcdHRleHQ6IFwiVmlldyBhbGwgdXNlcnNcIlxyXG5cdFx0XHRcdFx0fSk7XHJcblx0XHRcdFx0fVxyXG5cdFx0XHR9XHJcblxyXG5cdFx0XHQvLyBjcmVhdGUgYSBiYWNrdXAgbGlua1xyXG5cdFx0XHRpZighbWF0Y2hbMV0pIHtcclxuXHRcdFx0XHRjaGlsZHJlbi5wdXNoKHsgdGFnOiBcImJyXCIgfSk7XHJcblx0XHRcdFx0Y2hpbGRyZW4ucHVzaCh7IHRhZzogXCJiclwiIH0pO1xyXG5cclxuXHRcdFx0XHRjaGlsZHJlbi5wdXNoKHtcclxuXHRcdFx0XHRcdHRhZzogXCJhXCIsXHJcblx0XHRcdFx0XHR0ZXh0OiBcIkRvd25sb2FkIGJhY2t1cFwiLFxyXG5cdFx0XHRcdFx0YXR0cnM6IHtcclxuXHRcdFx0XHRcdFx0aHJlZjogXCIvYXBpL2JhY2t1cFwiLFxyXG5cdFx0XHRcdFx0XHRkb3dubG9hZDogZ2VuQmFja3VwTmFtZSgpXHJcblx0XHRcdFx0XHR9XHJcblx0XHRcdFx0fSk7XHJcblx0XHRcdH1cclxuXHJcblx0XHRcdHZhciBwYXNzd29yZENoYW5nZSA9IHt9O1xyXG5cclxuXHRcdFx0Y2hpbGRyZW4ucHVzaCh7XHJcblx0XHRcdFx0dGFnOiBcImZvcm1cIixcclxuXHRcdFx0XHRjaGlsZHJlbjogW1xyXG5cdFx0XHRcdFx0e1xyXG5cdFx0XHRcdFx0XHRjbGFzc2VzOiBcImVkaXRvci1yb3dcIixcclxuXHRcdFx0XHRcdFx0Y2hpbGRyZW46IFtcclxuXHRcdFx0XHRcdFx0XHR7XHJcblx0XHRcdFx0XHRcdFx0XHR3aWRnZXQ6IFwiaW5wdXRcIixcclxuXHRcdFx0XHRcdFx0XHRcdHR5cGU6IFwicGFzc3dvcmRcIixcclxuXHRcdFx0XHRcdFx0XHRcdHBsYWNlaG9sZGVyOiBcIk9sZCBwYXNzd29yZFwiLFxyXG5cdFx0XHRcdFx0XHRcdFx0YmluZDogcGFzc3dvcmRDaGFuZ2UsXHJcblx0XHRcdFx0XHRcdFx0XHRwcm9wOiBcIm9sZFBhc3N3b3JkXCJcclxuXHRcdFx0XHRcdFx0XHR9LFxyXG5cdFx0XHRcdFx0XHRcdHtcclxuXHRcdFx0XHRcdFx0XHRcdHdpZGdldDogXCJpbnB1dFwiLFxyXG5cdFx0XHRcdFx0XHRcdFx0dHlwZTogXCJwYXNzd29yZFwiLFxyXG5cdFx0XHRcdFx0XHRcdFx0cGxhY2Vob2xkZXI6IFwiTmV3IHBhc3N3b3JkXCIsXHJcblx0XHRcdFx0XHRcdFx0XHRiaW5kOiBwYXNzd29yZENoYW5nZSxcclxuXHRcdFx0XHRcdFx0XHRcdHByb3A6IFwicGFzc3dvcmRcIlxyXG5cdFx0XHRcdFx0XHRcdH1cclxuXHRcdFx0XHRcdFx0XVxyXG5cdFx0XHRcdFx0fSxcclxuXHRcdFx0XHRcdHtcclxuXHRcdFx0XHRcdFx0dGFnOiBcImJ1dHRvblwiLFxyXG5cdFx0XHRcdFx0XHRjbGFzc2VzOiBcImZhbmN5LWJ1dHRvblwiLFxyXG5cdFx0XHRcdFx0XHR0ZXh0OiBcIkNoYW5nZSBwYXNzd29yZFwiLFxyXG5cdFx0XHRcdFx0XHRhdHRyczoge1xyXG5cdFx0XHRcdFx0XHRcdHR5cGU6IFwic3VibWl0XCJcclxuXHRcdFx0XHRcdFx0fVxyXG5cdFx0XHRcdFx0fSxcclxuXHRcdFx0XHRcdHtcclxuXHRcdFx0XHRcdFx0bmFtZTogXCJtc2dcIlxyXG5cdFx0XHRcdFx0fVxyXG5cdFx0XHRcdF0sXHJcblx0XHRcdFx0b246IHtcclxuXHRcdFx0XHRcdC8vIGNoYW5nZSB0aGUgcGFzc3dvcmRcclxuXHRcdFx0XHRcdHN1Ym1pdDogZSA9PiB7XHJcblx0XHRcdFx0XHRcdGUucHJldmVudERlZmF1bHQoKTtcclxuXHJcblx0XHRcdFx0XHRcdC8vIG5vIHBhc3N3b3JkIHN1cHBsaWVkXHJcblx0XHRcdFx0XHRcdGlmKCFwYXNzd29yZENoYW5nZS5wYXNzd29yZCkge1xyXG5cdFx0XHRcdFx0XHRcdHNob3dNc2coXCJFbnRlciBhIG5ldyBwYXNzd29yZFwiKTtcclxuXHRcdFx0XHRcdFx0XHRyZXR1cm47XHJcblx0XHRcdFx0XHRcdH1cclxuXHJcblx0XHRcdFx0XHRcdC8vIHNlbmQgdGhlIHBhc3N3b3JkIGNoYW5nZSByZXF1ZXN0XHJcblx0XHRcdFx0XHRcdGZldGNoKGAvYXBpL2F1dGgvaW5mby9zZXQ/dXNlcm5hbWU9JHt1c2VyLnVzZXJuYW1lfWAsIHtcclxuXHRcdFx0XHRcdFx0XHRjcmVkZW50aWFsczogXCJpbmNsdWRlXCIsXHJcblx0XHRcdFx0XHRcdFx0bWV0aG9kOiBcIlBPU1RcIixcclxuXHRcdFx0XHRcdFx0XHRib2R5OiBKU09OLnN0cmluZ2lmeShwYXNzd29yZENoYW5nZSlcclxuXHRcdFx0XHRcdFx0fSlcclxuXHJcblx0XHRcdFx0XHRcdC50aGVuKHJlcyA9PiByZXMuanNvbigpKVxyXG5cclxuXHRcdFx0XHRcdFx0LnRoZW4ocmVzID0+IHtcclxuXHRcdFx0XHRcdFx0XHQvLyBwYXNzd29yZCBjaGFuZ2UgZmFpbGVkXHJcblx0XHRcdFx0XHRcdFx0aWYocmVzLnN0YXR1cyA9PSBcImZhaWxcIikge1xyXG5cdFx0XHRcdFx0XHRcdFx0c2hvd01zZyhyZXMuZGF0YS5tc2cpO1xyXG5cdFx0XHRcdFx0XHRcdH1cclxuXHJcblx0XHRcdFx0XHRcdFx0aWYocmVzLnN0YXR1cyA9PSBcInN1Y2Nlc3NcIikge1xyXG5cdFx0XHRcdFx0XHRcdFx0c2hvd01zZyhcIlBhc3N3b3JkIGNoYW5nZWRcIik7XHJcblx0XHRcdFx0XHRcdFx0fVxyXG5cdFx0XHRcdFx0XHR9KTtcclxuXHRcdFx0XHRcdH1cclxuXHRcdFx0XHR9XHJcblx0XHRcdH0pO1xyXG5cclxuXHRcdFx0Y2hpbGRyZW4ucHVzaCh7IHRhZzogXCJiclwiIH0pO1xyXG5cdFx0XHRjaGlsZHJlbi5wdXNoKHsgdGFnOiBcImJyXCIgfSk7XHJcblxyXG5cdFx0XHQvLyBvbmx5IGRpc3BsYXkgdGhlIGxvZ291dCBidXR0b24gaWYgd2UgYXJlIG9uIHRoZSAvYWNjb3VudCBwYWdlXHJcblx0XHRcdGlmKCFtYXRjaFsxXSkge1xyXG5cdFx0XHRcdGNoaWxkcmVuLnB1c2goe1xyXG5cdFx0XHRcdFx0dGFnOiBcImJ1dHRvblwiLFxyXG5cdFx0XHRcdFx0Y2xhc3NlczogXCJmYW5jeS1idXR0b25cIixcclxuXHRcdFx0XHRcdHRleHQ6IFwiTG9nb3V0XCIsXHJcblx0XHRcdFx0XHRvbjoge1xyXG5cdFx0XHRcdFx0XHRjbGljazogKCkgPT4ge1xyXG5cdFx0XHRcdFx0XHRcdC8vIHNlbmQgdGhlIGxvZ291dCByZXF1ZXN0XHJcblx0XHRcdFx0XHRcdFx0ZmV0Y2goXCIvYXBpL2F1dGgvbG9nb3V0XCIsIHsgY3JlZGVudGlhbHM6IFwiaW5jbHVkZVwiIH0pXHJcblxyXG5cdFx0XHRcdFx0XHRcdC8vIHJldHVybiB0byB0aGUgbG9naW4gcGFnZVxyXG5cdFx0XHRcdFx0XHRcdC50aGVuKCgpID0+IGxpZmVMaW5lLm5hdi5uYXZpZ2F0ZShcIi9sb2dpblwiKSk7XHJcblx0XHRcdFx0XHRcdH1cclxuXHRcdFx0XHRcdH1cclxuXHRcdFx0XHR9KTtcclxuXHRcdFx0fVxyXG5cclxuXHRcdFx0dmFyIHttc2d9ID0gbGlmZUxpbmUubWFrZURvbSh7XHJcblx0XHRcdFx0cGFyZW50OiBjb250ZW50LFxyXG5cdFx0XHRcdGNsYXNzZXM6IFwiY29udGVudC1wYWRkZWRcIixcclxuXHRcdFx0XHRjaGlsZHJlblxyXG5cdFx0XHR9KTtcclxuXHJcblx0XHRcdC8vIHNob3cgYSBtZXNzYWdlXHJcblx0XHRcdHZhciBzaG93TXNnID0gZnVuY3Rpb24odGV4dCkge1xyXG5cdFx0XHRcdG1zZy5pbm5lclRleHQgPSB0ZXh0O1xyXG5cdFx0XHR9O1xyXG5cdFx0fSlcclxuXHR9XHJcbn0pO1xyXG4iLCIvKipcclxuICogRWRpdCBhbiBhc3NpZ25lbW50XHJcbiAqL1xyXG5cclxuaW1wb3J0IHtkYXlzRnJvbU5vdywgc3RyaW5naWZ5RGF0ZX0gZnJvbSBcIi4uL3V0aWwvZGF0ZVwiO1xyXG5pbXBvcnQge3N0b3JlfSBmcm9tIFwiLi4vZGF0YS1zdG9yZVwiO1xyXG5cclxudmFyIGFzc2lnbm1lbnRzID0gc3RvcmUoXCJhc3NpZ25tZW50c1wiKTtcclxuXHJcbmxpZmVMaW5lLm5hdi5yZWdpc3Rlcih7XHJcblx0bWF0Y2hlcjogL15cXC9lZGl0XFwvKC4rPykkLyxcclxuXHJcblx0bWFrZSh7bWF0Y2gsIGNvbnRlbnQsIHNldFRpdGxlLCBkaXNwb3NhYmxlfSkge1xyXG5cdFx0dmFyIGFjdGlvblN1YiwgZGVsZXRlU3ViO1xyXG5cclxuXHRcdC8vIHB1c2ggdGhlIGNoYW5nZXMgdGhyb3VnaCB3aGVuIHRoZSBwYWdlIGlzIGNsb3NlZFxyXG5cdFx0ZGlzcG9zYWJsZS5hZGQoe1xyXG5cdFx0XHR1bnN1YnNjcmliZTogKCkgPT4gYXNzaWdubWVudHMuZm9yY2VTYXZlKClcclxuXHRcdH0pO1xyXG5cclxuXHRcdHZhciBjaGFuZ2VTdWIgPSBhc3NpZ25tZW50cy5nZXQobWF0Y2hbMV0sIGZ1bmN0aW9uKGl0ZW0pIHtcclxuXHRcdFx0Ly8gY2xlYXIgdGhlIGNvbnRlbnRcclxuXHRcdFx0Y29udGVudC5pbm5lckhUTUwgPSBcIlwiO1xyXG5cclxuXHRcdFx0Ly8gcmVtb3ZlIHRoZSBwcmV2aW91cyBhY3Rpb25cclxuXHRcdFx0aWYoYWN0aW9uU3ViKSB7XHJcblx0XHRcdFx0YWN0aW9uU3ViLnVuc3Vic2NyaWJlKCk7XHJcblx0XHRcdFx0ZGVsZXRlU3ViLnVuc3Vic2NyaWJlKCk7XHJcblx0XHRcdH1cclxuXHJcblx0XHRcdC8vIGFkZCBhIGJ1dHRvbiBiYWNrIHRvIHRoZSB2aWV3XHJcblx0XHRcdGlmKGl0ZW0pIHtcclxuXHRcdFx0XHRhY3Rpb25TdWIgPSBsaWZlTGluZS5hZGRBY3Rpb24oXCJWaWV3XCIsICgpID0+IGxpZmVMaW5lLm5hdi5uYXZpZ2F0ZShcIi9pdGVtL1wiICsgaXRlbS5pZCkpO1xyXG5cclxuXHRcdFx0XHRkZWxldGVTdWIgPSBsaWZlTGluZS5hZGRBY3Rpb24oXCJEZWxldGVcIiwgKCkgPT4ge1xyXG5cdFx0XHRcdFx0Ly8gcmVtb3ZlIHRoZSBpdGVtXHJcblx0XHRcdFx0XHRhc3NpZ25tZW50cy5yZW1vdmUoaXRlbS5pZCk7XHJcblxyXG5cdFx0XHRcdFx0Ly8gbmF2aWdhdGUgYXdheVxyXG5cdFx0XHRcdFx0bGlmZUxpbmUubmF2Lm5hdmlnYXRlKFwiL1wiKTtcclxuXHRcdFx0XHR9KTtcclxuXHRcdFx0fVxyXG5cclxuXHRcdFx0Ly8gaWYgdGhlIGl0ZW0gZG9lcyBub3QgZXhpc3QgY3JlYXRlIGl0XHJcblx0XHRcdGlmKCFpdGVtKSB7XHJcblx0XHRcdFx0aXRlbSA9IHtcclxuXHRcdFx0XHRcdG5hbWU6IFwiVW5uYW1lZCBpdGVtXCIsXHJcblx0XHRcdFx0XHRjbGFzczogXCJDbGFzc1wiLFxyXG5cdFx0XHRcdFx0ZGF0ZTogZ2VuRGF0ZSgpLFxyXG5cdFx0XHRcdFx0aWQ6IG1hdGNoWzFdLFxyXG5cdFx0XHRcdFx0ZGVzY3JpcHRpb246IFwiXCIsXHJcblx0XHRcdFx0XHRtb2RpZmllZDogRGF0ZS5ub3coKSxcclxuXHRcdFx0XHRcdHR5cGU6IFwiYXNzaWdubWVudFwiXHJcblx0XHRcdFx0fTtcclxuXHRcdFx0fVxyXG5cclxuXHRcdFx0Ly8gc2V0IHRoZSBpbml0YWwgdGl0bGVcclxuXHRcdFx0c2V0VGl0bGUoXCJFZGl0aW5nXCIpO1xyXG5cclxuXHRcdFx0Ly8gc2F2ZSBjaGFuZ2VzXHJcblx0XHRcdHZhciBjaGFuZ2UgPSAoKSA9PiB7XHJcblx0XHRcdFx0Ly8gdXBkYXRlIHRoZSBtb2RpZmllZCBkYXRlXHJcblx0XHRcdFx0aXRlbS5tb2RpZmllZCA9IERhdGUubm93KCk7XHJcblxyXG5cdFx0XHRcdC8vIGZpbmQgdGhlIGRhdGUgYW5kIHRpbWUgaW5wdXRzXHJcblx0XHRcdFx0dmFyIGRhdGVJbnB1dCA9IGRvY3VtZW50LnF1ZXJ5U2VsZWN0b3IoXCJpbnB1dFt0eXBlPWRhdGVdXCIpO1xyXG5cdFx0XHRcdHZhciB0aW1lSW5wdXQgPSBkb2N1bWVudC5xdWVyeVNlbGVjdG9yKFwiaW5wdXRbdHlwZT10aW1lXVwiKTtcclxuXHJcblx0XHRcdFx0Ly8gcGFyc2UgdGhlIGRhdGVcclxuXHRcdFx0XHRpdGVtLmRhdGUgPSBuZXcgRGF0ZShkYXRlSW5wdXQudmFsdWUgKyBcIiBcIiArIHRpbWVJbnB1dC52YWx1ZSk7XHJcblxyXG5cdFx0XHRcdC8vIHJlbW92ZSBhc3NpZ25lbW50IGZpZWxkcyBmcm9tIHRhc2tzXHJcblx0XHRcdFx0aWYoaXRlbS50eXBlID09IFwidGFza1wiKSB7XHJcblx0XHRcdFx0XHRkZWxldGUgaXRlbS5kYXRlO1xyXG5cdFx0XHRcdFx0ZGVsZXRlIGl0ZW0uY2xhc3M7XHJcblx0XHRcdFx0fVxyXG5cclxuXHRcdFx0XHQvLyBhZGQgYSBidXR0b24gYmFjayB0byB0aGUgdmlld1xyXG5cdFx0XHRcdGlmKCFhY3Rpb25TdWIpIHtcclxuXHRcdFx0XHRcdGFjdGlvblN1YiA9IGxpZmVMaW5lLmFkZEFjdGlvbihcIlZpZXdcIiwgKCkgPT4gbGlmZUxpbmUubmF2Lm5hdmlnYXRlKFwiL2l0ZW0vXCIgKyBpdGVtLmlkKSk7XHJcblxyXG5cdFx0XHRcdFx0ZGVsZXRlU3ViID0gbGlmZUxpbmUuYWRkQWN0aW9uKFwiRGVsZXRlXCIsICgpID0+IHtcclxuXHRcdFx0XHRcdFx0Ly8gcmVtb3ZlIHRoZSBpdGVtXHJcblx0XHRcdFx0XHRcdGFzc2lnbm1lbnRzLnJlbW92ZShpdGVtLmlkKTtcclxuXHJcblx0XHRcdFx0XHRcdC8vIG5hdmlnYXRlIGF3YXlcclxuXHRcdFx0XHRcdFx0bGlmZUxpbmUubmF2Lm5hdmlnYXRlKFwiL1wiKTtcclxuXHRcdFx0XHRcdH0pO1xyXG5cdFx0XHRcdH1cclxuXHJcblx0XHRcdFx0Ly8gc2F2ZSB0aGUgY2hhbmdlc1xyXG5cdFx0XHRcdGFzc2lnbm1lbnRzLnNldChpdGVtLCBjaGFuZ2VTdWIpO1xyXG5cdFx0XHR9O1xyXG5cclxuXHRcdFx0Ly8gaGlkZSBhbmQgc2hvdyBzcGVjaWZpYyBmaWVsZHMgZm9yIGRpZmZlcmVudCBhc3NpZ25tZW50IHR5cGVzXHJcblx0XHRcdHZhciB0b2dnbGVGaWVsZHMgPSAoKSA9PiB7XHJcblx0XHRcdFx0aWYoaXRlbS50eXBlID09IFwidGFza1wiKSB7XHJcblx0XHRcdFx0XHRtYXBwZWQuY2xhc3NGaWVsZC5zdHlsZS5kaXNwbGF5ID0gXCJub25lXCI7XHJcblx0XHRcdFx0XHRtYXBwZWQuZGF0ZUZpZWxkLnN0eWxlLmRpc3BsYXkgPSBcIm5vbmVcIjtcclxuXHRcdFx0XHR9XHJcblx0XHRcdFx0ZWxzZSB7XHJcblx0XHRcdFx0XHRtYXBwZWQuY2xhc3NGaWVsZC5zdHlsZS5kaXNwbGF5ID0gXCJcIjtcclxuXHRcdFx0XHRcdG1hcHBlZC5kYXRlRmllbGQuc3R5bGUuZGlzcGxheSA9IFwiXCI7XHJcblx0XHRcdFx0fVxyXG5cclxuXHRcdFx0XHQvLyBmaWxsIGluIGRhdGUgaWYgaXQgaXMgbWlzc2luZ1xyXG5cdFx0XHRcdGlmKCFpdGVtLmRhdGUpIHtcclxuXHRcdFx0XHRcdGl0ZW0uZGF0ZSA9IGdlbkRhdGUoKTtcclxuXHRcdFx0XHR9XHJcblxyXG5cdFx0XHRcdGlmKCFpdGVtLmNsYXNzKSB7XHJcblx0XHRcdFx0XHRpdGVtLmNsYXNzID0gXCJDbGFzc1wiO1xyXG5cdFx0XHRcdH1cclxuXHRcdFx0fTtcclxuXHJcblx0XHRcdC8vIHJlbmRlciB0aGUgdWlcclxuXHRcdFx0dmFyIG1hcHBlZCA9IGxpZmVMaW5lLm1ha2VEb20oe1xyXG5cdFx0XHRcdHBhcmVudDogY29udGVudCxcclxuXHRcdFx0XHRncm91cDogW1xyXG5cdFx0XHRcdFx0e1xyXG5cdFx0XHRcdFx0XHRjbGFzc2VzOiBcImVkaXRvci1yb3dcIixcclxuXHRcdFx0XHRcdFx0Y2hpbGRyZW46IFtcclxuXHRcdFx0XHRcdFx0XHR7XHJcblx0XHRcdFx0XHRcdFx0XHR3aWRnZXQ6IFwiaW5wdXRcIixcclxuXHRcdFx0XHRcdFx0XHRcdGJpbmQ6IGl0ZW0sXHJcblx0XHRcdFx0XHRcdFx0XHRwcm9wOiBcIm5hbWVcIixcclxuXHRcdFx0XHRcdFx0XHRcdGNoYW5nZVxyXG5cdFx0XHRcdFx0XHRcdH1cclxuXHRcdFx0XHRcdFx0XVxyXG5cdFx0XHRcdFx0fSxcclxuXHRcdFx0XHRcdHtcclxuXHRcdFx0XHRcdFx0Y2xhc3NlczogXCJlZGl0b3Itcm93XCIsXHJcblx0XHRcdFx0XHRcdGNoaWxkcmVuOiBbXHJcblx0XHRcdFx0XHRcdFx0e1xyXG5cdFx0XHRcdFx0XHRcdFx0d2lkZ2V0OiBcInRvZ2dsZS1idG5zXCIsXHJcblx0XHRcdFx0XHRcdFx0XHRidG5zOiBbXHJcblx0XHRcdFx0XHRcdFx0XHRcdHsgdGV4dDogXCJBc3NpZ25tZW50XCIsIHZhbHVlOiBcImFzc2lnbm1lbnRcIiB9LFxyXG5cdFx0XHRcdFx0XHRcdFx0XHR7IHRleHQ6IFwiVGFza1wiLCB2YWx1ZTogXCJ0YXNrXCIgfSxcclxuXHRcdFx0XHRcdFx0XHRcdF0sXHJcblx0XHRcdFx0XHRcdFx0XHR2YWx1ZTogaXRlbS50eXBlLFxyXG5cdFx0XHRcdFx0XHRcdFx0Y2hhbmdlOiB0eXBlID0+IHtcclxuXHRcdFx0XHRcdFx0XHRcdFx0Ly8gdXBkYXRlIHRoZSBpdGVtIHR5cGVcclxuXHRcdFx0XHRcdFx0XHRcdFx0aXRlbS50eXBlID0gdHlwZTtcclxuXHJcblx0XHRcdFx0XHRcdFx0XHRcdC8vIGhpZGUvc2hvdyBzcGVjaWZpYyBmaWVsZHNcclxuXHRcdFx0XHRcdFx0XHRcdFx0dG9nZ2xlRmllbGRzKCk7XHJcblxyXG5cdFx0XHRcdFx0XHRcdFx0XHQvLyBlbWl0IHRoZSBjaGFuZ2VcclxuXHRcdFx0XHRcdFx0XHRcdFx0Y2hhbmdlKCk7XHJcblx0XHRcdFx0XHRcdFx0XHR9XHJcblx0XHRcdFx0XHRcdFx0fVxyXG5cdFx0XHRcdFx0XHRdXHJcblx0XHRcdFx0XHR9LFxyXG5cdFx0XHRcdFx0e1xyXG5cdFx0XHRcdFx0XHRuYW1lOiBcImNsYXNzRmllbGRcIixcclxuXHRcdFx0XHRcdFx0Y2xhc3NlczogXCJlZGl0b3Itcm93XCIsXHJcblx0XHRcdFx0XHRcdGNoaWxkcmVuOiBbXHJcblx0XHRcdFx0XHRcdFx0e1xyXG5cdFx0XHRcdFx0XHRcdFx0d2lkZ2V0OiBcImlucHV0XCIsXHJcblx0XHRcdFx0XHRcdFx0XHRiaW5kOiBpdGVtLFxyXG5cdFx0XHRcdFx0XHRcdFx0cHJvcDogXCJjbGFzc1wiLFxyXG5cdFx0XHRcdFx0XHRcdFx0Y2hhbmdlXHJcblx0XHRcdFx0XHRcdFx0fVxyXG5cdFx0XHRcdFx0XHRdXHJcblx0XHRcdFx0XHR9LFxyXG5cdFx0XHRcdFx0e1xyXG5cdFx0XHRcdFx0XHRuYW1lOiBcImRhdGVGaWVsZFwiLFxyXG5cdFx0XHRcdFx0XHRjbGFzc2VzOiBcImVkaXRvci1yb3dcIixcclxuXHRcdFx0XHRcdFx0Y2hpbGRyZW46IFtcclxuXHRcdFx0XHRcdFx0XHR7XHJcblx0XHRcdFx0XHRcdFx0XHR3aWRnZXQ6IFwiaW5wdXRcIixcclxuXHRcdFx0XHRcdFx0XHRcdHR5cGU6IFwiZGF0ZVwiLFxyXG5cdFx0XHRcdFx0XHRcdFx0dmFsdWU6IGl0ZW0uZGF0ZSAmJiBgJHtpdGVtLmRhdGUuZ2V0RnVsbFllYXIoKX0tJHtwYWQoaXRlbS5kYXRlLmdldE1vbnRoKCkgKyAxKX0tJHtwYWQoaXRlbS5kYXRlLmdldERhdGUoKSl9YCxcclxuXHRcdFx0XHRcdFx0XHRcdGNoYW5nZVxyXG5cdFx0XHRcdFx0XHRcdH0sXHJcblx0XHRcdFx0XHRcdFx0e1xyXG5cdFx0XHRcdFx0XHRcdFx0d2lkZ2V0OiBcImlucHV0XCIsXHJcblx0XHRcdFx0XHRcdFx0XHR0eXBlOiBcInRpbWVcIixcclxuXHRcdFx0XHRcdFx0XHRcdHZhbHVlOiBpdGVtLmRhdGUgJiYgYCR7aXRlbS5kYXRlLmdldEhvdXJzKCl9OiR7cGFkKGl0ZW0uZGF0ZS5nZXRNaW51dGVzKCkpfWAsXHJcblx0XHRcdFx0XHRcdFx0XHRjaGFuZ2VcclxuXHRcdFx0XHRcdFx0XHR9XHJcblx0XHRcdFx0XHRcdF1cclxuXHRcdFx0XHRcdH0sXHJcblx0XHRcdFx0XHR7XHJcblx0XHRcdFx0XHRcdGNsYXNzZXM6IFwidGV4dGFyZWEtd3JhcHBlclwiLFxyXG5cdFx0XHRcdFx0XHRjaGlsZHJlbjogW1xyXG5cdFx0XHRcdFx0XHRcdHtcclxuXHRcdFx0XHRcdFx0XHRcdHdpZGdldDogXCJpbnB1dFwiLFxyXG5cdFx0XHRcdFx0XHRcdFx0dGFnOiBcInRleHRhcmVhXCIsXHJcblx0XHRcdFx0XHRcdFx0XHRjbGFzc2VzOiBcInRleHRhcmVhLWZpbGxcIixcclxuXHRcdFx0XHRcdFx0XHRcdHBsYWNlaG9sZGVyOiBcIkRlc2NyaXB0aW9uXCIsXHJcblx0XHRcdFx0XHRcdFx0XHRiaW5kOiBpdGVtLFxyXG5cdFx0XHRcdFx0XHRcdFx0cHJvcDogXCJkZXNjcmlwdGlvblwiLFxyXG5cdFx0XHRcdFx0XHRcdFx0Y2hhbmdlXHJcblx0XHRcdFx0XHRcdFx0fVxyXG5cdFx0XHRcdFx0XHRdXHJcblx0XHRcdFx0XHR9XHJcblx0XHRcdFx0XVxyXG5cdFx0XHR9KTtcclxuXHJcblx0XHRcdC8vIHNob3cgdGhlIGZpZWxkcyBmb3IgdGhpcyBpdGVtIHR5cGVcclxuXHRcdFx0dG9nZ2xlRmllbGRzKCk7XHJcblx0XHR9KTtcclxuXHJcblx0XHQvLyByZW1vdmUgdGhlIHN1YnNjcmlwdGlvbiB3aGVuIHRoaXMgdmlldyBpcyBkZXN0cm95ZWRcclxuXHRcdGRpc3Bvc2FibGUuYWRkKGNoYW5nZVN1Yik7XHJcblx0fVxyXG59KTtcclxuXHJcbi8vIGFkZCBhIGxlYWRpbmcgMCBpZiBhIG51bWJlciBpcyBsZXNzIHRoYW4gMTBcclxudmFyIHBhZCA9IG51bWJlciA9PiAobnVtYmVyIDwgMTApID8gXCIwXCIgKyBudW1iZXIgOiBudW1iZXI7XHJcblxyXG4vLyBjcmVhdGUgYSBkYXRlIG9mIHRvZGF5IGF0IDExOjU5cG1cclxudmFyIGdlbkRhdGUgPSAoKSA9PiB7XHJcblx0dmFyIGRhdGUgPSBuZXcgRGF0ZSgpO1xyXG5cclxuXHQvLyBzZXQgdGhlIHRpbWVcclxuXHRkYXRlLnNldEhvdXJzKDIzKTtcclxuXHRkYXRlLnNldE1pbnV0ZXMoNTkpO1xyXG5cclxuXHRyZXR1cm4gZGF0ZTtcclxufTtcclxuIiwiLyoqXHJcbiAqIFRoZSB2aWV3IGZvciBhbiBhc3NpZ25tZW50XHJcbiAqL1xyXG5cclxuaW1wb3J0IHtkYXlzRnJvbU5vdywgc3RyaW5naWZ5RGF0ZX0gZnJvbSBcIi4uL3V0aWwvZGF0ZVwiO1xyXG5pbXBvcnQge3N0b3JlfSBmcm9tIFwiLi4vZGF0YS1zdG9yZVwiO1xyXG5cclxudmFyIGFzc2lnbm1lbnRzID0gc3RvcmUoXCJhc3NpZ25tZW50c1wiKTtcclxuXHJcbmxpZmVMaW5lLm5hdi5yZWdpc3Rlcih7XHJcblx0bWF0Y2hlcjogL15cXC9pdGVtXFwvKC4rPykkLyxcclxuXHJcblx0bWFrZSh7bWF0Y2gsIHNldFRpdGxlLCBjb250ZW50LCBkaXNwb3NhYmxlfSkge1xyXG5cdFx0dmFyIGFjdGlvbkRvbmVTdWIsIGFjdGlvbkVkaXRTdWI7XHJcblxyXG5cdCBcdGRpc3Bvc2FibGUuYWRkKFxyXG5cdFx0XHRhc3NpZ25tZW50cy5nZXQobWF0Y2hbMV0sIGZ1bmN0aW9uKGl0ZW0pIHtcclxuXHRcdFx0XHQvLyBjbGVhciB0aGUgY29udGVudFxyXG5cdFx0XHRcdGNvbnRlbnQuaW5uZXJIVE1MID0gXCJcIjtcclxuXHJcblx0XHRcdFx0Ly8gcmVtb3ZlIHRoZSBvbGQgYWN0aW9uXHJcblx0XHRcdFx0aWYoYWN0aW9uRG9uZVN1Yikge1xyXG5cdFx0XHRcdFx0YWN0aW9uRG9uZVN1Yi51bnN1YnNjcmliZSgpO1xyXG5cdFx0XHRcdFx0YWN0aW9uRWRpdFN1Yi51bnN1YnNjcmliZSgpO1xyXG5cdFx0XHRcdH1cclxuXHJcblx0XHRcdFx0Ly8gbm8gc3VjaCBhc3NpZ25tZW50XHJcblx0XHRcdFx0aWYoIWl0ZW0pIHtcclxuXHRcdFx0XHRcdHNldFRpdGxlKFwiTm90IGZvdW5kXCIpO1xyXG5cclxuXHRcdFx0XHRcdGxpZmVMaW5lLm1ha2VEb20oe1xyXG5cdFx0XHRcdFx0XHRwYXJlbnQ6IGNvbnRlbnQsXHJcblx0XHRcdFx0XHRcdGNsYXNzZXM6IFwiY29udGVudC1wYWRkZWRcIixcclxuXHRcdFx0XHRcdFx0Y2hpbGRyZW46IFtcclxuXHRcdFx0XHRcdFx0XHR7XHJcblx0XHRcdFx0XHRcdFx0XHR0YWc6IFwic3BhblwiLFxyXG5cdFx0XHRcdFx0XHRcdFx0dGV4dDogXCJUaGUgYXNzaWdubWVudCB5b3Ugd2hlcmUgbG9va2luZyBmb3IgY291bGQgbm90IGJlIGZvdW5kLiBcIlxyXG5cdFx0XHRcdFx0XHRcdH0sXHJcblx0XHRcdFx0XHRcdFx0e1xyXG5cdFx0XHRcdFx0XHRcdFx0d2lkZ2V0OiBcImxpbmtcIixcclxuXHRcdFx0XHRcdFx0XHRcdGhyZWY6IFwiL1wiLFxyXG5cdFx0XHRcdFx0XHRcdFx0dGV4dDogXCJHbyBob21lLlwiXHJcblx0XHRcdFx0XHRcdFx0fVxyXG5cdFx0XHRcdFx0XHRdXHJcblx0XHRcdFx0XHR9KTtcclxuXHJcblx0XHRcdFx0XHRyZXR1cm47XHJcblx0XHRcdFx0fVxyXG5cclxuXHRcdFx0XHQvLyBzZXQgdGhlIHRpdGxlIGZvciB0aGUgY29udGVudFxyXG5cdFx0XHRcdHNldFRpdGxlKFwiQXNzaWdubWVudFwiKTtcclxuXHJcblx0XHRcdFx0Ly8gbWFyayB0aGUgaXRlbSBhcyBkb25lXHJcblx0XHRcdFx0YWN0aW9uRG9uZVN1YiA9IGxpZmVMaW5lLmFkZEFjdGlvbihpdGVtLmRvbmUgPyBcIkRvbmVcIiA6IFwiTm90IGRvbmVcIiwgKCkgPT4ge1xyXG5cdFx0XHRcdFx0Ly8gbWFyayB0aGUgaXRlbSBkb25lXHJcblx0XHRcdFx0XHRpdGVtLmRvbmUgPSAhaXRlbS5kb25lO1xyXG5cclxuXHRcdFx0XHRcdC8vIHVwZGF0ZSB0aGUgbW9kaWZpZWQgdGltZVxyXG5cdFx0XHRcdFx0aXRlbS5tb2RpZmllZCA9IERhdGUubm93KCk7XHJcblxyXG5cdFx0XHRcdFx0Ly8gc2F2ZSB0aGUgY2hhbmdlXHJcblx0XHRcdFx0XHRhc3NpZ25tZW50cy5zZXQoaXRlbSwgW10sIHsgc2F2ZU5vdzogdHJ1ZSB9KTtcclxuXHRcdFx0XHR9KTtcclxuXHJcblx0XHRcdFx0Ly8gZWRpdCB0aGUgaXRlbVxyXG5cdFx0XHRcdGFjdGlvbkVkaXRTdWIgPSBsaWZlTGluZS5hZGRBY3Rpb24oXCJFZGl0XCIsXHJcblx0XHRcdFx0XHQoKSA9PiBsaWZlTGluZS5uYXYubmF2aWdhdGUoXCIvZWRpdC9cIiArIGl0ZW0uaWQpKTtcclxuXHJcblx0XHRcdFx0Ly8gdGltZXMgdG8gc2tpcFxyXG5cdFx0XHRcdHZhciBza2lwVGltZXMgPSBbXHJcblx0XHRcdFx0XHR7IGhvdXI6IDIzLCBtaW51dGU6IDU5IH1cclxuXHRcdFx0XHRdO1xyXG5cclxuXHRcdFx0XHRsaWZlTGluZS5tYWtlRG9tKHtcclxuXHRcdFx0XHRcdHBhcmVudDogY29udGVudCxcclxuXHRcdFx0XHRcdGNsYXNzZXM6IFwiY29udGVudC1wYWRkZWRcIixcclxuXHRcdFx0XHRcdGNoaWxkcmVuOiBbXHJcblx0XHRcdFx0XHRcdHtcclxuXHRcdFx0XHRcdFx0XHRjbGFzc2VzOiBcImFzc2lnbm1lbnQtbmFtZVwiLFxyXG5cdFx0XHRcdFx0XHRcdHRleHQ6IGl0ZW0ubmFtZVxyXG5cdFx0XHRcdFx0XHR9LFxyXG5cdFx0XHRcdFx0XHR7XHJcblx0XHRcdFx0XHRcdFx0Y2xhc3NlczogXCJhc3NpZ25tZW50LWluZm8tcm93XCIsXHJcblx0XHRcdFx0XHRcdFx0Y2hpbGRyZW46IFtcclxuXHRcdFx0XHRcdFx0XHRcdHtcclxuXHRcdFx0XHRcdFx0XHRcdFx0Y2xhc3NlczogXCJhc3NpZ25tZW50LWluZm8tZ3Jvd1wiLFxyXG5cdFx0XHRcdFx0XHRcdFx0XHR0ZXh0OiBpdGVtLmNsYXNzXHJcblx0XHRcdFx0XHRcdFx0XHR9LFxyXG5cdFx0XHRcdFx0XHRcdFx0e1xyXG5cdFx0XHRcdFx0XHRcdFx0XHR0ZXh0OiBpdGVtLmRhdGUgJiYgc3RyaW5naWZ5RGF0ZShpdGVtLmRhdGUsIHsgaW5jbHVkZVRpbWU6IHRydWUsIHNraXBUaW1lcyB9KVxyXG5cdFx0XHRcdFx0XHRcdFx0fVxyXG5cdFx0XHRcdFx0XHRcdF1cclxuXHRcdFx0XHRcdFx0fSxcclxuXHRcdFx0XHRcdFx0e1xyXG5cdFx0XHRcdFx0XHRcdGNsYXNzZXM6IFwiYXNzaWdubWVudC1kZXNjcmlwdGlvblwiLFxyXG5cdFx0XHRcdFx0XHRcdHRleHQ6IGl0ZW0uZGVzY3JpcHRpb25cclxuXHRcdFx0XHRcdFx0fVxyXG5cdFx0XHRcdFx0XVxyXG5cdFx0XHRcdH0pO1xyXG5cdFx0XHR9KVxyXG5cdFx0KTtcclxuXHR9XHJcbn0pO1xyXG4iLCIvKipcclxuICogRGlzcGxheSBhIGxpc3Qgb2YgdXBjb21taW5nIGFzc2lnbm1lbnRzXHJcbiAqL1xyXG5cclxuaW1wb3J0IHtkYXlzRnJvbU5vdywgaXNTYW1lRGF0ZSwgc3RyaW5naWZ5RGF0ZSwgc3RyaW5naWZ5VGltZSwgaXNTb29uZXJEYXRlfSBmcm9tIFwiLi4vdXRpbC9kYXRlXCI7XHJcbmltcG9ydCB7c3RvcmV9IGZyb20gXCIuLi9kYXRhLXN0b3JlXCI7XHJcblxyXG52YXIgYXNzaWdubWVudHMgPSBzdG9yZShcImFzc2lnbm1lbnRzXCIpO1xyXG5cclxuLy8gYWxsIHRoZSBkaWZmZXJlbnQgbGlzdHNcclxuY29uc3QgTElTVFMgPSBbXHJcblx0e1xyXG5cdFx0dXJsOiBcIi93ZWVrXCIsXHJcblx0XHR0aXRsZTogXCJUaGlzIHdlZWtcIixcclxuXHRcdGNyZWF0ZUN0eDogKCkgPT4gKHtcclxuXHRcdFx0Ly8gZGF5cyB0byB0aGUgZW5kIG9mIHRoaXMgd2Vla1xyXG5cdFx0XHRlbmREYXRlOiBkYXlzRnJvbU5vdyg3IC0gKG5ldyBEYXRlKCkpLmdldERheSgpKSxcclxuXHRcdFx0Ly8gdG9kYXlzIGRhdGVcclxuXHRcdFx0dG9kYXk6IG5ldyBEYXRlKClcclxuXHRcdH0pLFxyXG5cdFx0Ly8gc2hvdyBhbGwgYXQgcmVhc29uYWJsZSBudW1iZXIgb2YgaW5jb21wbGV0ZSBhc3NpZ25tZW50c1xyXG5cdFx0ZmlsdGVyOiAoaXRlbSwge3RvZGF5LCBlbmREYXRlfSkgPT4ge1xyXG5cdFx0XHQvLyBhbHJlYWR5IGRvbmVcclxuXHRcdFx0aWYoaXRlbS5kb25lKSByZXR1cm47XHJcblxyXG5cdFx0XHQvLyBzaG93IGFsbCB0YXNrc1xyXG5cdFx0XHRpZihpdGVtLnR5cGUgPT0gXCJ0YXNrXCIpIHJldHVybiB0cnVlO1xyXG5cclxuXHRcdFx0Ly8gY2hlY2sgaWYgdGhlIGl0ZW0gaXMgcGFzdCB0aGlzIHdlZWtcclxuXHRcdFx0aWYoIWlzU29vbmVyRGF0ZShpdGVtLmRhdGUsIGVuZERhdGUpICYmICFpc1NhbWVEYXRlKGl0ZW0uZGF0ZSwgZW5kRGF0ZSkpIHJldHVybjtcclxuXHJcblx0XHRcdC8vIGNoZWNrIGlmIHRoZSBkYXRlIGlzIGJlZm9yZSB0b2RheVxyXG5cdFx0XHRpZihpc1Nvb25lckRhdGUoaXRlbS5kYXRlLCB0b2RheSkpIHJldHVybjtcclxuXHJcblx0XHRcdHJldHVybiB0cnVlO1xyXG5cdFx0fVxyXG5cdH0sXHJcblx0e1xyXG5cdFx0dXJsOiBcIi91cGNvbWluZ1wiLFxyXG5cdFx0ZmlsdGVyOiBpdGVtID0+ICFpdGVtLmRvbmUsXHJcblx0XHR0aXRsZTogXCJVcGNvbWluZ1wiXHJcblx0fSxcclxuXHR7XHJcblx0XHR1cmw6IFwiL2RvbmVcIixcclxuXHRcdGZpbHRlcjogaXRlbSA9PiBpdGVtLmRvbmUsXHJcblx0XHR0aXRsZTogXCJEb25lXCJcclxuXHR9XHJcbl07XHJcblxyXG4vLyBhZGQgbGlzdCB2aWV3IGxpbmtzIHRvIHRoZSBuYXZiYXJcclxuZXhwb3J0IGZ1bmN0aW9uIGluaXROYXZCYXIoKSB7XHJcblx0TElTVFMuZm9yRWFjaChsaXN0ID0+IGxpZmVMaW5lLmFkZE5hdkNvbW1hbmQobGlzdC50aXRsZSwgbGlzdC51cmwpKTtcclxufTtcclxuXHJcbmxpZmVMaW5lLm5hdi5yZWdpc3Rlcih7XHJcblx0bWF0Y2hlcih1cmwpIHtcclxuXHRcdHJldHVybiBMSVNUUy5maW5kKGxpc3QgPT4gbGlzdC51cmwgPT0gdXJsKTtcclxuXHR9LFxyXG5cclxuXHQvLyBtYWtlIHRoZSBsaXN0XHJcblx0bWFrZSh7c2V0VGl0bGUsIGNvbnRlbnQsIGRpc3Bvc2FibGUsIG1hdGNofSkge1xyXG5cdFx0ZGlzcG9zYWJsZS5hZGQoXHJcblx0XHRcdGFzc2lnbm1lbnRzLmdldEFsbChmdW5jdGlvbihkYXRhKSB7XHJcblx0XHRcdFx0Ly8gY2xlYXIgdGhlIGNvbnRlbnRcclxuXHRcdFx0XHRjb250ZW50LmlubmVySFRNTCA9IFwiXCI7XHJcblxyXG5cdFx0XHRcdC8vIHNldCB0aGUgcGFnZSB0aXRsZVxyXG5cdFx0XHRcdHNldFRpdGxlKG1hdGNoLnRpdGxlKTtcclxuXHJcblx0XHRcdFx0Ly8gdGhlIGNvbnRleHQgZm9yIHRoZSBmaWx0ZXIgZnVuY3Rpb25cclxuXHRcdFx0XHR2YXIgY3R4O1xyXG5cclxuXHRcdFx0XHRpZihtYXRjaC5jcmVhdGVDdHgpIHtcclxuXHRcdFx0XHRcdGN0eCA9IG1hdGNoLmNyZWF0ZUN0eCgpO1xyXG5cdFx0XHRcdH1cclxuXHJcblx0XHRcdFx0Ly8gcnVuIHRoZSBmaWx0ZXIgZnVuY3Rpb25cclxuXHRcdFx0XHRkYXRhID0gZGF0YS5maWx0ZXIoaXRlbSA9PiBtYXRjaC5maWx0ZXIoaXRlbSwgY3R4KSk7XHJcblxyXG5cdFx0XHRcdC8vIHNvcnQgdGhlIGFzc2luZ21lbnRzXHJcblx0XHRcdFx0ZGF0YS5zb3J0KChhLCBiKSA9PiB7XHJcblx0XHRcdFx0XHQvLyB0YXNrcyBhcmUgYmVsb3cgYXNzaWdubWVudHNcclxuXHRcdFx0XHRcdGlmKGEudHlwZSA9PSBcInRhc2tcIiAmJiBiLnR5cGUgIT0gXCJ0YXNrXCIpIHJldHVybiAxO1xyXG5cdFx0XHRcdFx0aWYoYS50eXBlICE9IFwidGFza1wiICYmIGIudHlwZSA9PSBcInRhc2tcIikgcmV0dXJuIC0xO1xyXG5cdFx0XHRcdFx0Ly9pZihhLnR5cGUgPT0gXCJ0YXNrXCIgfHwgYi50eXBlID09IFwidGFza1wiKSByZXR1cm4gMDtcclxuXHJcblx0XHRcdFx0XHQvLyBzb3J0IGJ5IGR1ZSBkYXRlXHJcblx0XHRcdFx0XHRpZihhLnR5cGUgPT0gXCJhc3NpZ25tZW50XCIgJiYgYi50eXBlID09IFwiYXNzaWdubWVudFwiKSB7XHJcblx0XHRcdFx0XHRcdGlmKGEuZGF0ZS5nZXRUaW1lKCkgIT0gYi5kYXRlLmdldFRpbWUoKSkge1xyXG5cdFx0XHRcdFx0XHRcdHJldHVybiBhLmRhdGUuZ2V0VGltZSgpIC0gYi5kYXRlLmdldFRpbWUoKTtcclxuXHRcdFx0XHRcdFx0fVxyXG5cdFx0XHRcdFx0fVxyXG5cclxuXHRcdFx0XHRcdC8vIG9yZGVyIGJ5IG5hbWVcclxuXHRcdFx0XHRcdGlmKGEubmFtZSA8IGIubmFtZSkgcmV0dXJuIC0xO1xyXG5cdFx0XHRcdFx0aWYoYS5uYW1lID4gYi5uYW1lKSByZXR1cm4gMTtcclxuXHJcblx0XHRcdFx0XHRyZXR1cm4gMDtcclxuXHRcdFx0XHR9KTtcclxuXHJcblx0XHRcdFx0Ly8gbWFrZSB0aGUgZ3JvdXBzXHJcblx0XHRcdFx0dmFyIGdyb3VwcyA9IHt9O1xyXG5cclxuXHRcdFx0XHQvLyByZW5kZXIgdGhlIGxpc3RcclxuXHRcdFx0XHRkYXRhLmZvckVhY2goKGl0ZW0sIGkpID0+IHtcclxuXHRcdFx0XHRcdC8vIGdldCB0aGUgaGVhZGVyIG5hbWVcclxuXHRcdFx0XHRcdHZhciBkYXRlU3RyID0gaXRlbS50eXBlID09IFwidGFza1wiID8gXCJUYXNrc1wiIDogc3RyaW5naWZ5RGF0ZShpdGVtLmRhdGUpO1xyXG5cclxuXHRcdFx0XHRcdC8vIG1ha2Ugc3VyZSB0aGUgaGVhZGVyIGV4aXN0c1xyXG5cdFx0XHRcdFx0Z3JvdXBzW2RhdGVTdHJdIHx8IChncm91cHNbZGF0ZVN0cl0gPSBbXSk7XHJcblxyXG5cdFx0XHRcdFx0Ly8gYWRkIHRoZSBpdGVtIHRvIHRoZSBsaXN0XHJcblx0XHRcdFx0XHR2YXIgaXRlbXMgPSBbXHJcblx0XHRcdFx0XHRcdHsgdGV4dDogaXRlbS5uYW1lLCBncm93OiB0cnVlIH1cclxuXHRcdFx0XHRcdF07XHJcblxyXG5cdFx0XHRcdFx0aWYoaXRlbS50eXBlICE9IFwidGFza1wiKSB7XHJcblx0XHRcdFx0XHRcdC8vIHNob3cgdGhlIGVuZCB0aW1lIGZvciBhbnkgbm9uIDExOjU5cG0gdGltZXNcclxuXHRcdFx0XHRcdFx0aWYoaXRlbS5kYXRlLmdldEhvdXJzKCkgIT0gMjMgfHwgaXRlbS5kYXRlLmdldE1pbnV0ZXMoKSAhPSA1OSkge1xyXG5cdFx0XHRcdFx0XHRcdGl0ZW1zLnB1c2goc3RyaW5naWZ5VGltZShpdGVtLmRhdGUpKTtcclxuXHRcdFx0XHRcdFx0fVxyXG5cclxuXHRcdFx0XHRcdFx0Ly8gc2hvdyB0aGUgY2xhc3NcclxuXHRcdFx0XHRcdFx0aXRlbXMucHVzaChpdGVtLmNsYXNzKTtcclxuXHRcdFx0XHRcdH1cclxuXHJcblx0XHRcdFx0XHRncm91cHNbZGF0ZVN0cl0ucHVzaCh7XG5cdFx0XHRcdFx0XHRocmVmOiBgL2l0ZW0vJHtpdGVtLmlkfWAsXG5cdFx0XHRcdFx0XHRpdGVtc1xyXG5cdFx0XHRcdFx0fSk7XHJcblx0XHRcdFx0fSk7XHJcblxyXG5cdFx0XHRcdC8vIGRpc3BsYXkgYWxsIGl0ZW1zXHJcblx0XHRcdFx0bGlmZUxpbmUubWFrZURvbSh7XHJcblx0XHRcdFx0XHRwYXJlbnQ6IGNvbnRlbnQsXHJcblx0XHRcdFx0XHR3aWRnZXQ6IFwibGlzdFwiLFxyXG5cdFx0XHRcdFx0aXRlbXM6IGdyb3Vwc1xyXG5cdFx0XHRcdH0pO1xyXG5cdFx0XHR9KVxyXG5cdFx0KTtcclxuXHR9XHJcbn0pO1xyXG4iLCIvKipcclxuICogU2hvdyBhIGxvZ2luIGJ1dHRvbiB0byB0aGUgdXNlclxyXG4gKi9cclxuXHJcbmxpZmVMaW5lLm5hdi5yZWdpc3Rlcih7XHJcblx0bWF0Y2hlcjogXCIvbG9naW5cIixcclxuXHJcblx0bWFrZSh7c2V0VGl0bGUsIGNvbnRlbnR9KSB7XHJcblx0XHQvLyBzZXQgdGhlIHBhZ2UgdGl0bGVcclxuXHRcdHNldFRpdGxlKFwiTG9naW5cIik7XHJcblxyXG5cdFx0Ly8gdGhlIHVzZXJzIGNyZWRlbnRpYWxzXHJcblx0XHR2YXIgYXV0aCA9IHt9O1xyXG5cclxuXHRcdC8vIGNyZWF0ZSB0aGUgbG9naW4gZm9ybVxyXG5cdFx0dmFyIHt1c2VybmFtZSwgcGFzc3dvcmQsIG1zZ30gPSBsaWZlTGluZS5tYWtlRG9tKHtcclxuXHRcdFx0cGFyZW50OiBjb250ZW50LFxyXG5cdFx0XHR0YWc6IFwiZm9ybVwiLFxyXG5cdFx0XHRjbGFzc2VzOiBcImNvbnRlbnQtcGFkZGVkXCIsXHJcblx0XHRcdGNoaWxkcmVuOiBbXHJcblx0XHRcdFx0e1xyXG5cdFx0XHRcdFx0Y2xhc3NlczogXCJlZGl0b3Itcm93XCIsXHJcblx0XHRcdFx0XHRjaGlsZHJlbjogW1xyXG5cdFx0XHRcdFx0XHR7XHJcblx0XHRcdFx0XHRcdFx0d2lkZ2V0OiBcImlucHV0XCIsXHJcblx0XHRcdFx0XHRcdFx0YmluZDogYXV0aCxcclxuXHRcdFx0XHRcdFx0XHRwcm9wOiBcInVzZXJuYW1lXCIsXHJcblx0XHRcdFx0XHRcdFx0cGxhY2Vob2xkZXI6IFwiVXNlcm5hbWVcIlxyXG5cdFx0XHRcdFx0XHR9XHJcblx0XHRcdFx0XHRdXHJcblx0XHRcdFx0fSxcclxuXHRcdFx0XHR7XHJcblx0XHRcdFx0XHRjbGFzc2VzOiBcImVkaXRvci1yb3dcIixcclxuXHRcdFx0XHRcdGNoaWxkcmVuOiBbXHJcblx0XHRcdFx0XHRcdHtcclxuXHRcdFx0XHRcdFx0XHR3aWRnZXQ6IFwiaW5wdXRcIixcclxuXHRcdFx0XHRcdFx0XHRiaW5kOiBhdXRoLFxyXG5cdFx0XHRcdFx0XHRcdHByb3A6IFwicGFzc3dvcmRcIixcclxuXHRcdFx0XHRcdFx0XHR0eXBlOiBcInBhc3N3b3JkXCIsXHJcblx0XHRcdFx0XHRcdFx0cGxhY2Vob2xkZXI6IFwiUGFzc3dvcmRcIlxyXG5cdFx0XHRcdFx0XHR9XHJcblx0XHRcdFx0XHRdXHJcblx0XHRcdFx0fSxcclxuXHRcdFx0XHR7XHJcblx0XHRcdFx0XHR0YWc6IFwiYnV0dG9uXCIsXHJcblx0XHRcdFx0XHR0ZXh0OiBcIkxvZ2luXCIsXHJcblx0XHRcdFx0XHRjbGFzc2VzOiBcImZhbmN5LWJ1dHRvblwiLFxyXG5cdFx0XHRcdFx0YXR0cnM6IHtcclxuXHRcdFx0XHRcdFx0dHlwZTogXCJzdWJtaXRcIlxyXG5cdFx0XHRcdFx0fVxyXG5cdFx0XHRcdH0sXHJcblx0XHRcdFx0e1xyXG5cdFx0XHRcdFx0Y2xhc3NlczogXCJlcnJvci1tc2dcIixcclxuXHRcdFx0XHRcdG5hbWU6IFwibXNnXCJcclxuXHRcdFx0XHR9XHJcblx0XHRcdF0sXHJcblx0XHRcdG9uOiB7XHJcblx0XHRcdFx0c3VibWl0OiBlID0+IHtcclxuXHRcdFx0XHRcdGUucHJldmVudERlZmF1bHQoKTtcclxuXHJcblx0XHRcdFx0XHQvLyBzZW5kIHRoZSBsb2dpbiByZXF1ZXN0XHJcblx0XHRcdFx0XHRmZXRjaChcIi9hcGkvYXV0aC9sb2dpblwiLCB7XHJcblx0XHRcdFx0XHRcdG1ldGhvZDogXCJQT1NUXCIsXHJcblx0XHRcdFx0XHRcdGNyZWRlbnRpYWxzOiBcImluY2x1ZGVcIixcclxuXHRcdFx0XHRcdFx0Ym9keTogSlNPTi5zdHJpbmdpZnkoYXV0aClcclxuXHRcdFx0XHRcdH0pXHJcblxyXG5cdFx0XHRcdFx0Ly8gcGFyc2UgdGhlIGpzb25cclxuXHRcdFx0XHRcdC50aGVuKHJlcyA9PiByZXMuanNvbigpKVxyXG5cclxuXHRcdFx0XHRcdC8vIHByb2Nlc3MgdGhlIHJlc3BvbnNlXHJcblx0XHRcdFx0XHQudGhlbihyZXMgPT4ge1xyXG5cdFx0XHRcdFx0XHQvLyBsb2dpbiBzdWNlZWRlZCBnbyBob21lXHJcblx0XHRcdFx0XHRcdGlmKHJlcy5zdGF0dXMgPT0gXCJzdWNjZXNzXCIpIHtcclxuXHRcdFx0XHRcdFx0XHRsaWZlTGluZS5uYXYubmF2aWdhdGUoXCIvXCIpO1xyXG5cdFx0XHRcdFx0XHRcdHJldHVybjtcclxuXHRcdFx0XHRcdFx0fVxyXG5cclxuXHRcdFx0XHRcdFx0Ly8gbG9naW4gZmFpbGVkXHJcblx0XHRcdFx0XHRcdGlmKHJlcy5zdGF0dXMgPT0gXCJmYWlsXCIpIHtcclxuXHRcdFx0XHRcdFx0XHRlcnJvck1zZyhcIkxvZ2luIGZhaWxlZFwiKTtcclxuXHRcdFx0XHRcdFx0fVxyXG5cdFx0XHRcdFx0fSk7XHJcblx0XHRcdFx0fVxyXG5cdFx0XHR9XHJcblx0XHR9KTtcclxuXHJcblx0XHQvLyBkaXNwbGF5IGFuIGVycm9yIG1lc3NhZ2VcclxuXHRcdHZhciBlcnJvck1zZyA9IGZ1bmN0aW9uKHRleHQpIHtcclxuXHRcdFx0bXNnLmlubmVyVGV4dCA9IHRleHQ7XHJcblx0XHR9O1xyXG5cdH1cclxufSk7XHJcblxyXG4vLyBsb2dvdXRcclxubGlmZUxpbmUubG9nb3V0ID0gZnVuY3Rpb24oKSB7XHJcblx0Ly8gc2VuZCB0aGUgbG9nb3V0IHJlcXVlc3RcclxuXHRmZXRjaChcIi9hcGkvYXV0aC9sb2dvdXRcIiwge1xyXG5cdFx0Y3JlZGVudGlhbHM6IFwiaW5jbHVkZVwiXHJcblx0fSlcclxuXHJcblx0Ly8gZ28gdG8gdGhlIGxvZ2luIHBhZ2VcclxuXHQudGhlbigoKSA9PiBsaWZlTGluZS5uYXYubmF2aWdhdGUoXCIvbG9naW5cIikpO1xyXG59O1xyXG4iLCIvKipcclxuICogQSBsaXN0IG9mIHRoaW5ncyB0b2RvXHJcbiAqL1xyXG5cclxuaW1wb3J0IHtkYXlzRnJvbU5vdywgaXNTYW1lRGF0ZSwgc3RyaW5naWZ5VGltZX0gZnJvbSBcIi4uL3V0aWwvZGF0ZVwiO1xyXG5pbXBvcnQge3N0b3JlfSBmcm9tIFwiLi4vZGF0YS1zdG9yZVwiO1xyXG5cclxudmFyIGFzc2lnbm1lbnRzID0gc3RvcmUoXCJhc3NpZ25tZW50c1wiKTtcclxuXHJcbmxpZmVMaW5lLm5hdi5yZWdpc3Rlcih7XHJcblx0bWF0Y2hlcjogXCIvXCIsXHJcblxyXG5cdG1ha2Uoe3NldFRpdGxlLCBjb250ZW50LCBkaXNwb3NhYmxlfSkge1xyXG5cdFx0c2V0VGl0bGUoXCJUb2RvXCIpO1xyXG5cclxuXHRcdC8vIGxvYWQgdGhlIGl0ZW1zXHJcblx0XHRkaXNwb3NhYmxlLmFkZChcclxuXHRcdFx0YXNzaWdubWVudHMuZ2V0QWxsKGZ1bmN0aW9uKGRhdGEpIHtcclxuXHRcdFx0XHQvLyBjbGVhciB0aGUgb2xkIGNvbnRlbnRcclxuXHRcdFx0XHRjb250ZW50LmlubmVySFRNTCA9IFwiXCI7XHJcblxyXG5cdFx0XHRcdHZhciBncm91cHMgPSB7XHJcblx0XHRcdFx0XHRUYXNrczogW10sXHJcblx0XHRcdFx0XHRUb2RheTogW10sXHJcblx0XHRcdFx0XHRUb21vcnJvdzogW11cclxuXHRcdFx0XHR9O1xyXG5cclxuXHRcdFx0XHQvLyB0b2RheSBhbmQgdG9tb3Jyb3dzIGRhdGVzXHJcblx0XHRcdFx0dmFyIHRvZGF5ID0gbmV3IERhdGUoKTtcclxuXHRcdFx0XHR2YXIgdG9tb3Jyb3cgPSBkYXlzRnJvbU5vdygxKTtcclxuXHJcblx0XHRcdFx0Ly8gc2VsZWN0IHRoZSBpdGVtcyB0byBkaXNwbGF5XHJcblx0XHRcdFx0ZGF0YS5mb3JFYWNoKGl0ZW0gPT4ge1xyXG5cdFx0XHRcdFx0Ly8gc2tpcCBjb21wbGV0ZWQgaXRlbXNcclxuXHRcdFx0XHRcdGlmKGl0ZW0uZG9uZSkgcmV0dXJuO1xyXG5cclxuXHRcdFx0XHRcdC8vIGFzc2lnbm1lbnRzIGZvciB0b2RheVxyXG5cdFx0XHRcdFx0aWYoaXRlbS50eXBlID09IFwiYXNzaWdubWVudFwiKSB7XHJcblx0XHRcdFx0XHRcdC8vIHRvZGF5XHJcblx0XHRcdFx0XHRcdGlmKGlzU2FtZURhdGUodG9kYXksIGl0ZW0uZGF0ZSkpIHtcclxuXHRcdFx0XHRcdFx0XHRncm91cHMuVG9kYXkucHVzaChjcmVhdGVVaShpdGVtKSk7XHJcblx0XHRcdFx0XHRcdH1cclxuXHRcdFx0XHRcdFx0Ly8gdG9tb3Jyb3dcclxuXHRcdFx0XHRcdFx0ZWxzZSBpZihpc1NhbWVEYXRlKHRvbW9ycm93LCBpdGVtLmRhdGUpKSB7XHJcblx0XHRcdFx0XHRcdFx0Z3JvdXBzLlRvbW9ycm93LnB1c2goY3JlYXRlVWkoaXRlbSkpO1xyXG5cdFx0XHRcdFx0XHR9XHJcblx0XHRcdFx0XHR9XHJcblxyXG5cdFx0XHRcdFx0Ly8gc2hvdyBhbnkgdGFza3NcclxuXHRcdFx0XHRcdGlmKGl0ZW0udHlwZSA9PSBcInRhc2tcIikge1xyXG5cdFx0XHRcdFx0XHRncm91cHMuVGFza3MucHVzaChjcmVhdGVVaShpdGVtKSk7XHJcblx0XHRcdFx0XHR9XHJcblx0XHRcdFx0fSk7XHJcblxyXG5cdFx0XHRcdC8vIHJlbW92ZSBhbnkgZW1wdHkgZmllbGRzXHJcblx0XHRcdFx0T2JqZWN0LmdldE93blByb3BlcnR5TmFtZXMoZ3JvdXBzKVxyXG5cclxuXHRcdFx0XHQuZm9yRWFjaChuYW1lID0+IHtcclxuXHRcdFx0XHRcdC8vIHJlbW92ZSBlbXB0eSBncm91cHNcclxuXHRcdFx0XHRcdGlmKGdyb3Vwc1tuYW1lXS5sZW5ndGggPT09IDApIHtcclxuXHRcdFx0XHRcdFx0ZGVsZXRlIGdyb3Vwc1tuYW1lXTtcclxuXHRcdFx0XHRcdH1cclxuXHRcdFx0XHR9KTtcclxuXHJcblx0XHRcdFx0Ly8gcmVuZGVyIHRoZSBsaXN0XHJcblx0XHRcdFx0bGlmZUxpbmUubWFrZURvbSh7XHJcblx0XHRcdFx0XHRwYXJlbnQ6IGNvbnRlbnQsXHJcblx0XHRcdFx0XHR3aWRnZXQ6IFwibGlzdFwiLFxyXG5cdFx0XHRcdFx0aXRlbXM6IGdyb3Vwc1xyXG5cdFx0XHRcdH0pO1xyXG5cdFx0XHR9KVxyXG5cdFx0KTtcclxuXHR9XHJcbn0pO1xyXG5cclxuLy8gY3JlYXRlIGEgbGlzdCBpdGVtXHJcbnZhciBjcmVhdGVVaSA9IGZ1bmN0aW9uKGl0ZW0pIHtcclxuXHQvLyByZW5kZXIgYSB0YXNrXHJcblx0aWYoaXRlbS50eXBlID09IFwidGFza1wiKSB7XHJcblx0XHRyZXR1cm4ge1xyXG5cdFx0XHRocmVmOiBgL2l0ZW0vJHtpdGVtLmlkfWAsXHJcblx0XHRcdGl0ZW1zOiBbXHJcblx0XHRcdFx0e1xyXG5cdFx0XHRcdFx0dGV4dDogaXRlbS5uYW1lLFxyXG5cdFx0XHRcdFx0Z3JvdzogdHJ1ZVxyXG5cdFx0XHRcdH1cclxuXHRcdFx0XVxyXG5cdFx0fTtcclxuXHR9XHJcblx0Ly8gcmVuZGVyIGFuIGl0ZW1cclxuXHRlbHNlIHtcclxuXHRcdHJldHVybiB7XHJcblx0XHRcdGhyZWY6IGAvaXRlbS8ke2l0ZW0uaWR9YCxcclxuXHRcdFx0aXRlbXM6IFtcclxuXHRcdFx0XHR7XHJcblx0XHRcdFx0XHR0ZXh0OiBpdGVtLm5hbWUsXHJcblx0XHRcdFx0XHRncm93OiB0cnVlXHJcblx0XHRcdFx0fSxcclxuXHRcdFx0XHRzdHJpbmdpZnlUaW1lKGl0ZW0uZGF0ZSksXHJcblx0XHRcdFx0aXRlbS5jbGFzc1xyXG5cdFx0XHRdXHJcblx0XHR9O1xyXG5cdH1cclxufTtcclxuIiwiLyoqXHJcbiAqIEEgcGFnZSB3aXRoIGxpbmtzIHRvIGFsbCB1c2Vyc1xyXG4gKi9cclxuXHJcbmxpZmVMaW5lLm5hdi5yZWdpc3Rlcih7XHJcblx0bWF0Y2hlcjogXCIvdXNlcnNcIixcclxuXHJcblx0bWFrZSh7c2V0VGl0bGUsIGNvbnRlbnR9KSB7XHJcblx0XHRzZXRUaXRsZShcIkFsbCB1c2Vyc1wiKTtcclxuXHJcblx0XHQvLyBsb2FkIHRoZSBsaXN0IG9mIHVzZXJzXHJcblx0XHRmZXRjaChcIi9hcGkvYXV0aC9pbmZvL3VzZXJzXCIsIHtcclxuXHRcdFx0Y3JlZGVudGlhbHM6IFwiaW5jbHVkZVwiXHJcblx0XHR9KVxyXG5cclxuXHRcdC50aGVuKHJlcyA9PiByZXMuanNvbigpKVxyXG5cclxuXHRcdC50aGVuKCh7c3RhdHVzLCBkYXRhOiB1c2Vyc30pID0+IHtcclxuXHRcdFx0Ly8gbm90IGF1dGhlbnRpY2F0ZWRcclxuXHRcdFx0aWYoc3RhdHVzID09IFwiZmFpbFwiKSB7XHJcblx0XHRcdFx0bGlmZUxpbmUubWFrZURvbSh7XHJcblx0XHRcdFx0XHRwYXJlbnQ6IGNvbnRlbnQsXHJcblx0XHRcdFx0XHRjbGFzc2VzOiBcImNvbnRlbnQtcGFkZGVkXCIsXHJcblx0XHRcdFx0XHR0ZXh0OiBcIllvdSBkbyBub3QgaGF2ZSBhY2Nlc3MgdG8gdGhlIHVzZXIgbGlzdFwiXHJcblx0XHRcdFx0fSk7XHJcblxyXG5cdFx0XHRcdHJldHVybjtcclxuXHRcdFx0fVxyXG5cclxuXHRcdFx0Ly8gc29ydCBieSBhZG1pbiBzdGF0dXNcclxuXHRcdFx0dXNlcnMuc29ydCgoYSwgYikgPT4ge1xyXG5cdFx0XHRcdC8vIHNvcnQgYWRtaW5zXHJcblx0XHRcdFx0aWYoYS5hZG1pbiAmJiAhYi5hZG1pbikgcmV0dXJuIC0xO1xyXG5cdFx0XHRcdGlmKCFhLmFkbWluICYmIGIuYWRtaW4pIHJldHVybiAxO1xyXG5cclxuXHRcdFx0XHQvLyBzb3J0IGJ5IHVzZXJuYW1lXHJcblx0XHRcdFx0aWYoYS51c2VybmFtZSA8IGIudXNlcm5hbWUpIHJldHVybiAtMTtcclxuXHRcdFx0XHRpZihhLnVzZXJuYW1lID4gYi51c2VybmFtZSkgcmV0dXJuIDE7XHJcblxyXG5cdFx0XHRcdHJldHVybiAwO1xyXG5cdFx0XHR9KTtcclxuXHJcblx0XHRcdHZhciBkaXNwbGF5VXNlcnMgPSB7XHJcblx0XHRcdFx0QWRtaW5zOiBbXSxcclxuXHRcdFx0XHRVc2VyczogW11cclxuXHRcdFx0fTtcclxuXHJcblx0XHRcdC8vIGdlbmVyYXRlIHRoZSB1c2VyIGxpc3RcclxuXHRcdFx0dXNlcnMuZm9yRWFjaCh1c2VyID0+IHtcclxuXHRcdFx0XHQvLyBzb3J0IHRoZSB1c2VycyBpbnRvIGFkbWlucyBhbmQgdXNlcnNcclxuXHRcdFx0XHRkaXNwbGF5VXNlcnNbdXNlci5hZG1pbiA/IFwiQWRtaW5zXCIgOiBcIlVzZXJzXCJdXHJcblxyXG5cdFx0XHRcdC5wdXNoKHtcclxuXHRcdFx0XHRcdGhyZWY6IGAvdXNlci8ke3VzZXIudXNlcm5hbWV9YCxcclxuXHRcdFx0XHRcdGl0ZW1zOiBbe1xyXG5cdFx0XHRcdFx0XHR0ZXh0OiB1c2VyLnVzZXJuYW1lLFxyXG5cdFx0XHRcdFx0XHRncm93OiB0cnVlXHJcblx0XHRcdFx0XHR9XVxyXG5cdFx0XHRcdH0pO1xyXG5cdFx0XHR9KTtcclxuXHJcblx0XHRcdC8vIGRpc3BsYXkgdGhlIHVzZXIgbGlzdFxyXG5cdFx0XHRsaWZlTGluZS5tYWtlRG9tKHtcclxuXHRcdFx0XHRwYXJlbnQ6IGNvbnRlbnQsXHJcblx0XHRcdFx0d2lkZ2V0OiBcImxpc3RcIixcclxuXHRcdFx0XHRpdGVtczogZGlzcGxheVVzZXJzXHJcblx0XHRcdH0pO1xyXG5cdFx0fSlcclxuXHJcblx0XHQvLyBzb21ldGhpbmcgd2VudCB3cm9uZyBzaG93IGFuIGVycm9yIG1lc3NhZ2VcclxuXHRcdC5jYXRjaChlcnIgPT4ge1xyXG5cdFx0XHRsaWZlTGluZS5tYWtlRG9tKHtcclxuXHRcdFx0XHRjbGFzc2VzOiBcImNvbnRlbnQtcGFkZGVkXCIsXHJcblx0XHRcdFx0dGV4dDogZXJyLm1lc3NhZ2VcclxuXHRcdFx0fSk7XHJcblx0XHR9KTtcclxuXHR9XHJcbn0pO1xyXG4iLCIvKipcclxuICogVGhlIG1haW4gY29udGVudCBwYW5lIGZvciB0aGUgYXBwXHJcbiAqL1xyXG5cclxubGlmZUxpbmUubWFrZURvbS5yZWdpc3RlcihcImNvbnRlbnRcIiwge1xyXG5cdG1ha2UoKSB7XHJcblx0XHRyZXR1cm4gW1xyXG5cdFx0XHR7XHJcblx0XHRcdFx0Y2xhc3NlczogXCJ0b29sYmFyXCIsXHJcblx0XHRcdFx0Y2hpbGRyZW46IFtcclxuXHRcdFx0XHRcdHtcclxuXHRcdFx0XHRcdFx0dGFnOiBcInN2Z1wiLFxyXG5cdFx0XHRcdFx0XHRjbGFzc2VzOiBcIm1lbnUtaWNvblwiLFxyXG5cdFx0XHRcdFx0XHRhdHRyczoge1xyXG5cdFx0XHRcdFx0XHRcdHZpZXdCb3g6IFwiMCAwIDYwIDUwXCIsXHJcblx0XHRcdFx0XHRcdFx0d2lkdGg6IFwiMjBcIixcclxuXHRcdFx0XHRcdFx0XHRoZWlnaHQ6IFwiMTVcIlxyXG5cdFx0XHRcdFx0XHR9LFxyXG5cdFx0XHRcdFx0XHRjaGlsZHJlbjogW1xyXG5cdFx0XHRcdFx0XHRcdHsgdGFnOiBcImxpbmVcIiwgYXR0cnM6IHsgeDE6IFwiMFwiLCB5MTogXCI1XCIsIHgyOiBcIjYwXCIsIHkyOiBcIjVcIiB9IH0sXHJcblx0XHRcdFx0XHRcdFx0eyB0YWc6IFwibGluZVwiLCBhdHRyczogeyB4MTogXCIwXCIsIHkxOiBcIjI1XCIsIHgyOiBcIjYwXCIsIHkyOiBcIjI1XCIgfSB9LFxyXG5cdFx0XHRcdFx0XHRcdHsgdGFnOiBcImxpbmVcIiwgYXR0cnM6IHsgeDE6IFwiMFwiLCB5MTogXCI0NVwiLCB4MjogXCI2MFwiLCB5MjogXCI0NVwiIH0gfVxyXG5cdFx0XHRcdFx0XHRdLFxyXG5cdFx0XHRcdFx0XHRvbjoge1xyXG5cdFx0XHRcdFx0XHRcdGNsaWNrOiAoKSA9PiBkb2N1bWVudC5ib2R5LmNsYXNzTGlzdC50b2dnbGUoXCJzaWRlYmFyLW9wZW5cIilcclxuXHRcdFx0XHRcdFx0fVxyXG5cdFx0XHRcdFx0fSxcclxuXHRcdFx0XHRcdHtcclxuXHRcdFx0XHRcdFx0Y2xhc3NlczogXCJ0b29sYmFyLXRpdGxlXCIsXHJcblx0XHRcdFx0XHRcdG5hbWU6IFwidGl0bGVcIlxyXG5cdFx0XHRcdFx0fSxcclxuXHRcdFx0XHRcdHtcclxuXHRcdFx0XHRcdFx0Y2xhc3NlczogXCJ0b29sYmFyLWJ1dHRvbnNcIixcclxuXHRcdFx0XHRcdFx0bmFtZTogXCJidG5zXCJcclxuXHRcdFx0XHRcdH1cclxuXHRcdFx0XHRdXHJcblx0XHRcdH0sXHJcblx0XHRcdHtcclxuXHRcdFx0XHRjbGFzc2VzOiBcImNvbnRlbnRcIixcclxuXHRcdFx0XHRuYW1lOiBcImNvbnRlbnRcIlxyXG5cdFx0XHR9XHJcblx0XHRdO1xyXG5cdH0sXHJcblxyXG5cdGJpbmQob3B0cywge3RpdGxlLCBidG5zLCBjb250ZW50fSkge1xyXG5cdFx0dmFyIGRpc3Bvc2FibGU7XHJcblxyXG5cdFx0Ly8gc2V0IHRoZSBwYWdlIHRpdGxlXHJcblx0XHR2YXIgc2V0VGl0bGUgPSBmdW5jdGlvbih0aXRsZVRleHQpIHtcclxuXHRcdFx0dGl0bGUuaW5uZXJUZXh0ID0gdGl0bGVUZXh0O1xyXG5cdFx0XHRkb2N1bWVudC50aXRsZSA9IHRpdGxlVGV4dDtcclxuXHRcdH07XHJcblxyXG5cdFx0Ly8gYWRkIGFuIGFjdGlvbiBidXR0b25cclxuXHRcdGxpZmVMaW5lLm9uKFwiYWN0aW9uLWNyZWF0ZVwiLCBuYW1lID0+IHtcclxuXHRcdFx0bGlmZUxpbmUubWFrZURvbSh7XHJcblx0XHRcdFx0cGFyZW50OiBidG5zLFxyXG5cdFx0XHRcdHRhZzogXCJidXR0b25cIixcclxuXHRcdFx0XHRjbGFzc2VzOiBcInRvb2xiYXItYnV0dG9uXCIsXHJcblx0XHRcdFx0dGV4dDogbmFtZSxcclxuXHRcdFx0XHRhdHRyczoge1xyXG5cdFx0XHRcdFx0XCJkYXRhLW5hbWVcIjogbmFtZVxyXG5cdFx0XHRcdH0sXHJcblx0XHRcdFx0b246IHtcclxuXHRcdFx0XHRcdGNsaWNrOiAoKSA9PiBsaWZlTGluZS5lbWl0KFwiYWN0aW9uLWV4ZWMtXCIgKyBuYW1lKVxyXG5cdFx0XHRcdH1cclxuXHRcdFx0fSk7XHJcblx0XHR9KTtcclxuXHJcblx0XHQvLyByZW1vdmUgYW4gYWN0aW9uIGJ1dHRvblxyXG5cdFx0bGlmZUxpbmUub24oXCJhY3Rpb24tcmVtb3ZlXCIsIG5hbWUgPT4ge1xyXG5cdFx0XHR2YXIgYnRuID0gYnRucy5xdWVyeVNlbGVjdG9yKGBbZGF0YS1uYW1lPVwiJHtuYW1lfVwiXWApO1xyXG5cclxuXHRcdFx0aWYoYnRuKSBidG4ucmVtb3ZlKCk7XHJcblx0XHR9KTtcclxuXHJcblx0XHQvLyByZW1vdmUgYWxsIHRoZSBhY3Rpb24gYnV0dG9uc1xyXG5cdFx0bGlmZUxpbmUub24oXCJhY3Rpb24tcmVtb3ZlLWFsbFwiLCAoKSA9PiBidG5zLmlubmVySFRNTCA9IFwiXCIpO1xyXG5cclxuXHRcdC8vIGRpc3BsYXkgdGhlIGNvbnRlbnQgZm9yIHRoZSB2aWV3XHJcblx0XHR2YXIgdXBkYXRlVmlldyA9ICgpID0+IHtcclxuXHRcdFx0Ly8gZGVzdHJveSBhbnkgbGlzdGVuZXJzIGZyb20gb2xkIGNvbnRlbnRcclxuXHRcdFx0aWYoZGlzcG9zYWJsZSkge1xyXG5cdFx0XHRcdGRpc3Bvc2FibGUuZGlzcG9zZSgpO1xyXG5cdFx0XHR9XHJcblxyXG5cdFx0XHQvLyByZW1vdmUgYW55IGFjdGlvbiBidXR0b25zXHJcblx0XHRcdGxpZmVMaW5lLmVtaXQoXCJhY3Rpb24tcmVtb3ZlLWFsbFwiKTtcclxuXHJcblx0XHRcdC8vIGNsZWFyIGFsbCB0aGUgb2xkIGNvbnRlbnRcclxuXHRcdFx0Y29udGVudC5pbm5lckhUTUwgPSBcIlwiO1xyXG5cclxuXHRcdFx0Ly8gY3JlYXRlIHRoZSBkaXNwb3NhYmxlIGZvciB0aGUgY29udGVudFxyXG5cdFx0XHRkaXNwb3NhYmxlID0gbmV3IGxpZmVMaW5lLkRpc3Bvc2FibGUoKTtcclxuXHJcblx0XHRcdHZhciBtYWtlciA9IG5vdEZvdW5kTWFrZXIsIG1hdGNoO1xyXG5cclxuXHRcdFx0Ly8gZmluZCB0aGUgY29ycmVjdCBjb250ZW50IG1ha2VyXHJcblx0XHRcdGZvcihsZXQgJG1ha2VyIG9mIGNvbnRlbnRNYWtlcnMpIHtcclxuXHRcdFx0XHQvLyBydW4gYSBtYXRjaGVyIGZ1bmN0aW9uXHJcblx0XHRcdFx0aWYodHlwZW9mICRtYWtlci5tYXRjaGVyID09IFwiZnVuY3Rpb25cIikge1xyXG5cdFx0XHRcdFx0bWF0Y2ggPSAkbWFrZXIubWF0Y2hlcihsb2NhdGlvbi5wYXRobmFtZSk7XHJcblx0XHRcdFx0fVxyXG5cdFx0XHRcdC8vIGEgc3RyaW5nIG1hdGNoXHJcblx0XHRcdFx0ZWxzZSBpZih0eXBlb2YgJG1ha2VyLm1hdGNoZXIgPT0gXCJzdHJpbmdcIikge1xyXG5cdFx0XHRcdFx0aWYoJG1ha2VyLm1hdGNoZXIgPT0gbG9jYXRpb24ucGF0aG5hbWUpIHtcclxuXHRcdFx0XHRcdFx0bWF0Y2ggPSAkbWFrZXIubWF0Y2hlcjtcclxuXHRcdFx0XHRcdH1cclxuXHRcdFx0XHR9XHJcblx0XHRcdFx0Ly8gYSByZWdleCBtYXRjaFxyXG5cdFx0XHRcdGVsc2Uge1xyXG5cdFx0XHRcdFx0bWF0Y2ggPSAkbWFrZXIubWF0Y2hlci5leGVjKGxvY2F0aW9uLnBhdGhuYW1lKTtcclxuXHRcdFx0XHR9XHJcblxyXG5cdFx0XHRcdC8vIG1hdGNoIGZvdW5kIHN0b3Agc2VhcmNoaW5nXHJcblx0XHRcdFx0aWYobWF0Y2gpIHtcclxuXHRcdFx0XHRcdG1ha2VyID0gJG1ha2VyO1xyXG5cclxuXHRcdFx0XHRcdGJyZWFrO1xyXG5cdFx0XHRcdH1cclxuXHRcdFx0fVxyXG5cclxuXHRcdFx0Ly8gbWFrZSB0aGUgY29udGVudCBmb3IgdGhpcyByb3V0ZVxyXG5cdFx0XHRtYWtlci5tYWtlKHtkaXNwb3NhYmxlLCBzZXRUaXRsZSwgY29udGVudCwgbWF0Y2h9KTtcclxuXHRcdH07XHJcblxyXG5cdFx0Ly8gc3dpdGNoIHBhZ2VzXHJcblx0XHRsaWZlTGluZS5uYXYubmF2aWdhdGUgPSBmdW5jdGlvbih1cmwpIHtcclxuXHRcdFx0Ly8gdXBkYXRlIHRoZSB1cmxcclxuXHRcdFx0aGlzdG9yeS5wdXNoU3RhdGUobnVsbCwgbnVsbCwgdXJsKTtcclxuXHJcblx0XHRcdC8vIHNob3cgdGhlIG5ldyB2aWV3XHJcblx0XHRcdHVwZGF0ZVZpZXcoKTtcclxuXHRcdH07XHJcblxyXG5cdFx0Ly8gc3dpdGNoIHBhZ2VzIHdoZW4gdGhlIHVzZXIgcHVzaGVzIHRoZSBiYWNrIGJ1dHRvblxyXG5cdFx0d2luZG93LmFkZEV2ZW50TGlzdGVuZXIoXCJwb3BzdGF0ZVwiLCAoKSA9PiB1cGRhdGVWaWV3KCkpO1xyXG5cclxuXHRcdC8vIHNob3cgdGhlIGluaXRpYWwgdmlld1xyXG5cdFx0dXBkYXRlVmlldygpO1xyXG5cdH1cclxufSk7XHJcblxyXG4vLyBhbGwgY29udGVudCBwcm9kdWNlcnNcclxudmFyIGNvbnRlbnRNYWtlcnMgPSBbXTtcclxuXHJcbi8vIGNyZWF0ZSB0aGUgbmFtZXNwYWNlXHJcbmxpZmVMaW5lLm5hdiA9IHt9O1xyXG5cclxuLy8gcmVnaXN0ZXIgYSBjb250ZW50IG1ha2VyXHJcbmxpZmVMaW5lLm5hdi5yZWdpc3RlciA9IGZ1bmN0aW9uKG1ha2VyKSB7XHJcblx0Y29udGVudE1ha2Vycy5wdXNoKG1ha2VyKTtcclxufTtcclxuXHJcbi8vIHRoZSBmYWxsIGJhY2sgbWFrZXIgZm9yIG5vIHN1Y2ggcGFnZVxyXG52YXIgbm90Rm91bmRNYWtlciA9IHtcclxuXHRtYWtlKHtzZXRUaXRsZSwgY29udGVudH0pIHtcclxuXHRcdC8vIHVwZGF0ZSB0aGUgcGFnZSB0aXRsZVxyXG5cdFx0c2V0VGl0bGUoXCJOb3QgZm91bmRcIik7XHJcblxyXG5cdFx0bGlmZUxpbmUubWFrZURvbSh7XHJcblx0XHRcdHBhcmVudDogY29udGVudCxcclxuXHRcdFx0Y2xhc3NlczogXCJjb250ZW50LXBhZGRlZFwiLFxyXG5cdFx0XHRjaGlsZHJlbjogW1xyXG5cdFx0XHRcdHtcclxuXHRcdFx0XHRcdHRhZzogXCJzcGFuXCIsXHJcblx0XHRcdFx0XHR0ZXh0OiBcIlRoZSBwYWdlIHlvdSBhcmUgbG9va2luZyBmb3IgY291bGQgbm90IGJlIGZvdW5kLiBcIlxyXG5cdFx0XHRcdH0sXHJcblx0XHRcdFx0e1xyXG5cdFx0XHRcdFx0d2lkZ2V0OiBcImxpbmtcIixcclxuXHRcdFx0XHRcdGhyZWY6IFwiL1wiLFxyXG5cdFx0XHRcdFx0dGV4dDogXCJHbyBob21lXCJcclxuXHRcdFx0XHR9XHJcblx0XHRcdF1cclxuXHRcdH0pO1xyXG5cdH1cclxufTtcclxuIiwiLyoqXHJcbiAqIENyZWF0ZSBhbiBpbnB1dCBmaWVsZFxyXG4gKi9cclxuXHJcbmxpZmVMaW5lLm1ha2VEb20ucmVnaXN0ZXIoXCJpbnB1dFwiLCB7XHJcblx0bWFrZSh7dGFnLCB0eXBlLCB2YWx1ZSwgY2hhbmdlLCBiaW5kLCBwcm9wLCBwbGFjZWhvbGRlciwgY2xhc3Nlc30pIHtcclxuXHRcdC8vIHNldCB0aGUgaW5pdGlhbCB2YWx1ZSBvZiB0aGUgYm91bmQgb2JqZWN0XHJcblx0XHRpZih0eXBlb2YgYmluZCA9PSBcIm9iamVjdFwiICYmICF2YWx1ZSkge1xyXG5cdFx0XHR2YWx1ZSA9IGJpbmRbcHJvcF07XHJcblx0XHR9XHJcblxyXG5cdFx0dmFyIGlucHV0ID0ge1xyXG5cdFx0XHR0YWc6IHRhZyB8fCBcImlucHV0XCIsXHJcblx0XHRcdGNsYXNzZXM6IGNsYXNzZXMgfHwgYCR7dGFnID09IFwidGV4dGFyZWFcIiA/IFwidGV4dGFyZWFcIiA6IFwiaW5wdXRcIn0tZmlsbGAsXHJcblx0XHRcdGF0dHJzOiB7fSxcclxuXHRcdFx0b246IHtcclxuXHRcdFx0XHRpbnB1dDogZSA9PiB7XHJcblx0XHRcdFx0XHQvLyB1cGRhdGUgdGhlIHByb3BlcnR5IGNoYW5nZWRcclxuXHRcdFx0XHRcdGlmKHR5cGVvZiBiaW5kID09IFwib2JqZWN0XCIpIHtcclxuXHRcdFx0XHRcdFx0YmluZFtwcm9wXSA9IGUudGFyZ2V0LnZhbHVlO1xyXG5cdFx0XHRcdFx0fVxyXG5cclxuXHRcdFx0XHRcdC8vIGNhbGwgdGhlIGNhbGxiYWNrXHJcblx0XHRcdFx0XHRpZih0eXBlb2YgY2hhbmdlID09IFwiZnVuY3Rpb25cIikge1xyXG5cdFx0XHRcdFx0XHRjaGFuZ2UoZS50YXJnZXQudmFsdWUpO1xyXG5cdFx0XHRcdFx0fVxyXG5cdFx0XHRcdH1cclxuXHRcdFx0fVxyXG5cdFx0fTtcclxuXHJcblx0XHQvLyBhdHRhY2ggdmFsdWVzIGlmIHRoZXkgYXJlIGdpdmVuXHJcblx0XHRpZih0eXBlKSBpbnB1dC5hdHRycy50eXBlID0gdHlwZTtcclxuXHRcdGlmKHZhbHVlKSBpbnB1dC5hdHRycy52YWx1ZSA9IHZhbHVlO1xyXG5cdFx0aWYocGxhY2Vob2xkZXIpIGlucHV0LmF0dHJzLnBsYWNlaG9sZGVyID0gcGxhY2Vob2xkZXI7XHJcblxyXG5cdFx0Ly8gZm9yIHRleHRhcmVhcyBzZXQgaW5uZXJUZXh0XHJcblx0XHRpZih0YWcgPT0gXCJ0ZXh0YXJlYVwiKSB7XHJcblx0XHRcdGlucHV0LnRleHQgPSB2YWx1ZTtcclxuXHRcdH1cclxuXHJcblx0XHRyZXR1cm4gaW5wdXQ7XHJcblx0fVxyXG59KTtcclxuIiwiLyoqXHJcbiAqIEEgd2lkZ2V0IHRoYXQgY3JlYXRlcyBhIGxpbmsgdGhhdCBob29rcyBpbnRvIHRoZSBuYXZpZ2F0b3JcclxuICovXHJcblxyXG5saWZlTGluZS5tYWtlRG9tLnJlZ2lzdGVyKFwibGlua1wiLCB7XHJcblx0bWFrZShvcHRzKSB7XHJcblx0XHRyZXR1cm4ge1xyXG5cdFx0XHR0YWc6IFwiYVwiLFxyXG5cdFx0XHRhdHRyczoge1xyXG5cdFx0XHRcdGhyZWY6IG9wdHMuaHJlZlxyXG5cdFx0XHR9LFxyXG5cdFx0XHRvbjoge1xyXG5cdFx0XHRcdGNsaWNrOiBlID0+IHtcclxuXHRcdFx0XHRcdC8vIGRvbid0IG92ZXIgcmlkZSBjdHJsIG9yIGFsdCBvciBzaGlmdCBjbGlja3NcclxuXHRcdFx0XHRcdGlmKGUuY3RybEtleSB8fCBlLmFsdEtleSB8fCBlLnNoaWZ0S2V5KSByZXR1cm47XHJcblxyXG5cdFx0XHRcdFx0Ly8gZG9uJ3QgbmF2aWdhdGUgdGhlIHBhZ2VcclxuXHRcdFx0XHRcdGUucHJldmVudERlZmF1bHQoKTtcclxuXHJcblx0XHRcdFx0XHRsaWZlTGluZS5uYXYubmF2aWdhdGUob3B0cy5ocmVmKVxyXG5cdFx0XHRcdH1cclxuXHRcdFx0fSxcclxuXHRcdFx0dGV4dDogb3B0cy50ZXh0XHJcblx0XHR9O1xyXG5cdH1cclxufSk7XHJcbiIsIi8qKlxyXG4gKiBEaXNwbGF5IGEgbGlzdCB3aXRoIGdyb3VwIGhlYWRpbmdzXHJcbiAqL1xyXG5cclxubGlmZUxpbmUubWFrZURvbS5yZWdpc3RlcihcImxpc3RcIiwge1xyXG5cdG1ha2Uoe2l0ZW1zfSkge1xyXG5cdFx0Ly8gYWRkIGFsbCB0aGUgZ3JvdXBzXHJcblx0XHRyZXR1cm4gT2JqZWN0LmdldE93blByb3BlcnR5TmFtZXMoaXRlbXMpXHJcblxyXG5cdFx0Lm1hcChncm91cE5hbWUgPT4gbWFrZUdyb3VwKGdyb3VwTmFtZSwgaXRlbXNbZ3JvdXBOYW1lXSkpO1xyXG5cdH1cclxufSk7XHJcblxyXG4vLyBtYWtlIGEgc2luZ2xlIGdyb3VwXHJcbnZhciBtYWtlR3JvdXAgPSBmdW5jdGlvbihuYW1lLCBpdGVtcywgcGFyZW50KSB7XHJcblx0Ly8gYWRkIHRoZSBsaXN0IGhlYWRlclxyXG5cdGl0ZW1zLnVuc2hpZnQoe1xyXG5cdFx0Y2xhc3NlczogXCJsaXN0LWhlYWRlclwiLFxyXG5cdFx0dGV4dDogbmFtZVxyXG5cdH0pO1xyXG5cclxuXHQvLyByZW5kZXIgdGhlIGl0ZW1cclxuXHRyZXR1cm4ge1xyXG5cdFx0cGFyZW50LFxyXG5cdFx0Y2xhc3NlczogXCJsaXN0LXNlY3Rpb25cIixcclxuXHRcdGNoaWxkcmVuOiBpdGVtcy5tYXAoKGl0ZW0sIGluZGV4KSA9PiB7XHJcblx0XHRcdC8vIGRvbid0IG1vZGlmeSB0aGUgaGVhZGVyXHJcblx0XHRcdGlmKGluZGV4ID09PSAwKSByZXR1cm4gaXRlbTtcclxuXHJcblx0XHRcdHZhciBpdGVtRG9tO1xyXG5cclxuXHRcdFx0Ly8gY3JlYXRlIGFuIGl0ZW1cclxuXHRcdFx0aWYodHlwZW9mIGl0ZW0gIT0gXCJzdHJpbmdcIikge1xyXG5cdFx0XHRcdGl0ZW1Eb20gPSB7XHJcblx0XHRcdFx0XHRjbGFzc2VzOiBcImxpc3QtaXRlbVwiLFxyXG5cdFx0XHRcdFx0Y2hpbGRyZW46IChpdGVtLml0ZW1zIHx8IGl0ZW0pLm1hcChpdGVtID0+IHtcclxuXHRcdFx0XHRcdFx0cmV0dXJuIHtcclxuXHRcdFx0XHRcdFx0XHQvLyBnZXQgdGhlIG5hbWUgb2YgdGhlIGl0ZW1cclxuXHRcdFx0XHRcdFx0XHR0ZXh0OiB0eXBlb2YgaXRlbSA9PSBcInN0cmluZ1wiID8gaXRlbSA6IGl0ZW0udGV4dCxcclxuXHRcdFx0XHRcdFx0XHQvLyBzZXQgd2hldGhlciB0aGUgaXRlbSBzaG91bGQgZ3Jvd1xyXG5cdFx0XHRcdFx0XHRcdGNsYXNzZXM6IGl0ZW0uZ3JvdyA/IFwibGlzdC1pdGVtLWdyb3dcIiA6IFwibGlzdC1pdGVtLXBhcnRcIlxyXG5cdFx0XHRcdFx0XHR9O1xyXG5cdFx0XHRcdFx0fSlcclxuXHRcdFx0XHR9O1xyXG5cdFx0XHR9XHJcblx0XHRcdGVsc2Uge1xyXG5cdFx0XHRcdGl0ZW1Eb20gPSB7XHJcblx0XHRcdFx0XHRjbGFzc2VzOiBcImxpc3QtaXRlbVwiLFxyXG5cdFx0XHRcdFx0dGV4dDogaXRlbVxyXG5cdFx0XHRcdH07XHJcblx0XHRcdH1cclxuXHJcblx0XHRcdC8vIG1ha2UgdGhlIGl0ZW0gYSBsaW5rXHJcblx0XHRcdGlmKGl0ZW0uaHJlZikge1xyXG5cdFx0XHRcdGl0ZW1Eb20ub24gPSB7XHJcblx0XHRcdFx0XHRjbGljazogKCkgPT4gbGlmZUxpbmUubmF2Lm5hdmlnYXRlKGl0ZW0uaHJlZilcclxuXHRcdFx0XHR9O1xyXG5cdFx0XHR9XHJcblxyXG5cdFx0XHRyZXR1cm4gaXRlbURvbTtcclxuXHRcdH0pXHJcblx0fTtcclxufTtcclxuIiwiLyoqXHJcbiAqIFRoZSB3aWRnZXQgZm9yIHRoZSBzaWRlYmFyXHJcbiAqL1xyXG5cclxubGlmZUxpbmUubWFrZURvbS5yZWdpc3RlcihcInNpZGViYXJcIiwge1xyXG5cdG1ha2UoKSB7XHJcblx0XHRyZXR1cm4gW1xyXG5cdFx0XHR7XHJcblx0XHRcdFx0Y2xhc3NlczogXCJzaWRlYmFyXCIsXHJcblx0XHRcdFx0bmFtZTogXCJzaWRlYmFyXCIsXHJcblx0XHRcdFx0Y2hpbGRyZW46IFtcclxuXHRcdFx0XHRcdHtcclxuXHRcdFx0XHRcdFx0Y2xhc3NlczogW1wic2lkZWJhci1hY3Rpb25zXCIsIFwiaGlkZGVuXCJdLFxyXG5cdFx0XHRcdFx0XHRuYW1lOiBcImFjdGlvbnNcIixcclxuXHRcdFx0XHRcdFx0Y2hpbGRyZW46IFtcclxuXHRcdFx0XHRcdFx0XHR7XHJcblx0XHRcdFx0XHRcdFx0XHRjbGFzc2VzOiBcInNpZGViYXItaGVhZGluZ1wiLFxyXG5cdFx0XHRcdFx0XHRcdFx0dGV4dDogXCJQYWdlIGFjdGlvbnNcIlxyXG5cdFx0XHRcdFx0XHRcdH1cclxuXHRcdFx0XHRcdFx0XVxyXG5cdFx0XHRcdFx0fSxcclxuXHRcdFx0XHRcdHtcclxuXHRcdFx0XHRcdFx0Y2xhc3NlczogXCJzaWRlYmFyLWhlYWRpbmdcIixcclxuXHRcdFx0XHRcdFx0dGV4dDogXCJNb3JlIGFjdGlvbnNcIlxyXG5cdFx0XHRcdFx0fVxyXG5cdFx0XHRcdF1cclxuXHRcdFx0fSxcclxuXHRcdFx0e1xyXG5cdFx0XHRcdGNsYXNzZXM6IFwic2hhZGVcIixcclxuXHRcdFx0XHRvbjoge1xyXG5cdFx0XHRcdFx0Ly8gY2xvc2UgdGhlIHNpZGViYXJcclxuXHRcdFx0XHRcdGNsaWNrOiAoKSA9PiBkb2N1bWVudC5ib2R5LmNsYXNzTGlzdC5yZW1vdmUoXCJzaWRlYmFyLW9wZW5cIilcclxuXHRcdFx0XHR9XHJcblx0XHRcdH1cclxuXHRcdF07XHJcblx0fSxcclxuXHJcblx0YmluZChvcHRzLCB7YWN0aW9ucywgc2lkZWJhcn0pIHtcclxuXHRcdC8vIGFkZCBhIGNvbW1hbmQgdG8gdGhlIHNpZGViYXJcclxuXHRcdGxpZmVMaW5lLmFkZENvbW1hbmQgPSBmdW5jdGlvbihuYW1lLCBmbikge1xyXG5cdFx0XHQvLyBtYWtlIHRoZSBzaWRlYmFyIGl0ZW1cclxuXHRcdFx0dmFyIHtpdGVtfSA9IGxpZmVMaW5lLm1ha2VEb20oe1xyXG5cdFx0XHRcdHBhcmVudDogc2lkZWJhcixcclxuXHRcdFx0XHR0YWc6IFwiZGl2XCIsXHJcblx0XHRcdFx0bmFtZTogXCJpdGVtXCIsXHJcblx0XHRcdFx0Y2xhc3NlczogXCJzaWRlYmFyLWl0ZW1cIixcclxuXHRcdFx0XHR0ZXh0OiBuYW1lLFxyXG5cdFx0XHRcdG9uOiB7XHJcblx0XHRcdFx0XHRjbGljazogKCkgPT4ge1xyXG5cdFx0XHRcdFx0XHQvLyBjbG9zZSB0aGUgc2lkZWJhclxyXG5cdFx0XHRcdFx0XHRkb2N1bWVudC5ib2R5LmNsYXNzTGlzdC5yZW1vdmUoXCJzaWRlYmFyLW9wZW5cIik7XHJcblxyXG5cdFx0XHRcdFx0XHQvLyBjYWxsIHRoZSBsaXN0ZW5lclxyXG5cdFx0XHRcdFx0XHRmbigpO1xyXG5cdFx0XHRcdFx0fVxyXG5cdFx0XHRcdH1cclxuXHRcdFx0fSk7XHJcblxyXG5cdFx0XHRyZXR1cm4ge1xyXG5cdFx0XHRcdHVuc3Vic2NyaWJlOiAoKSA9PiBpdGVtLnJlbW92ZSgpXHJcblx0XHRcdH07XHJcblx0XHR9O1xyXG5cclxuXHRcdC8vIGFkZCBhIG5hdmlnYXRpb25hbCBjb21tYW5kXHJcblx0XHRsaWZlTGluZS5hZGROYXZDb21tYW5kID0gZnVuY3Rpb24obmFtZSwgdG8pIHtcclxuXHRcdFx0bGlmZUxpbmUuYWRkQ29tbWFuZChuYW1lLCAoKSA9PiBsaWZlTGluZS5uYXYubmF2aWdhdGUodG8pKTtcclxuXHRcdH07XHJcblxyXG5cdFx0Ly8gYWRkIGEgc2lkZWJhciBhY3Rpb25cclxuXHRcdGxpZmVMaW5lLm9uKFwiYWN0aW9uLWNyZWF0ZVwiLCBuYW1lID0+IHtcclxuXHRcdFx0Ly8gc2hvdyB0aGUgYWN0aW9uc1xyXG5cdFx0XHRhY3Rpb25zLmNsYXNzTGlzdC5yZW1vdmUoXCJoaWRkZW5cIik7XHJcblxyXG5cdFx0XHQvLyBjcmVhdGUgdGhlIGJ1dHRvblxyXG5cdFx0XHRsaWZlTGluZS5tYWtlRG9tKHtcclxuXHRcdFx0XHRwYXJlbnQ6IGFjdGlvbnMsXHJcblx0XHRcdFx0dGFnOiBcImRpdlwiLFxyXG5cdFx0XHRcdG5hbWU6IFwiaXRlbVwiLFxyXG5cdFx0XHRcdGNsYXNzZXM6IFwic2lkZWJhci1pdGVtXCIsXHJcblx0XHRcdFx0dGV4dDogbmFtZSxcclxuXHRcdFx0XHRhdHRyczoge1xyXG5cdFx0XHRcdFx0XCJkYXRhLW5hbWVcIjogbmFtZVxyXG5cdFx0XHRcdH0sXHJcblx0XHRcdFx0b246IHtcclxuXHRcdFx0XHRcdGNsaWNrOiAoKSA9PiB7XHJcblx0XHRcdFx0XHRcdC8vIGNsb3NlIHRoZSBzaWRlYmFyXHJcblx0XHRcdFx0XHRcdGRvY3VtZW50LmJvZHkuY2xhc3NMaXN0LnJlbW92ZShcInNpZGViYXItb3BlblwiKTtcclxuXHJcblx0XHRcdFx0XHRcdC8vIHRyaWdnZXIgdGhlIGFjdGlvblxyXG5cdFx0XHRcdFx0XHRsaWZlTGluZS5lbWl0KFwiYWN0aW9uLWV4ZWMtXCIgKyBuYW1lKTtcclxuXHRcdFx0XHRcdH1cclxuXHRcdFx0XHR9XHJcblx0XHRcdH0pO1xyXG5cclxuXHRcdFx0Ly8gcmVtb3ZlIGEgc2lkZWJhciBhY3Rpb25cclxuXHRcdFx0bGlmZUxpbmUub24oXCJhY3Rpb24tcmVtb3ZlXCIsIG5hbWUgPT4ge1xyXG5cdFx0XHRcdC8vIHJlbW92ZSB0aGUgYnV0dG9uXHJcblx0XHRcdFx0dmFyIGJ0biA9IGFjdGlvbnMucXVlcnlTZWxlY3RvcihgW2RhdGEtbmFtZT1cIiR7bmFtZX1cIl1gKTtcclxuXHJcblx0XHRcdFx0aWYoYnRuKSBidG4ucmVtb3ZlKCk7XHJcblxyXG5cdFx0XHRcdC8vIGhpZGUgdGhlIHBhZ2UgYWN0aW9ucyBpZiB0aGVyZSBhcmUgbm9uZVxyXG5cdFx0XHRcdGlmKGFjdGlvbnMuY2hpbGRyZW4ubGVuZ3RoID09IDEpIHtcclxuXHRcdFx0XHRcdGFjdGlvbnMuY2xhc3NMaXN0LmFkZChcImhpZGRlblwiKTtcclxuXHRcdFx0XHR9XHJcblx0XHRcdH0pO1xyXG5cclxuXHRcdFx0Ly8gcmVtb3ZlIGFsbCB0aGUgc2lkZWJhciBhY3Rpb25zXHJcblx0XHRcdGxpZmVMaW5lLm9uKFwiYWN0aW9uLXJlbW92ZS1hbGxcIiwgKCkgPT4ge1xyXG5cdFx0XHRcdC8vIHJlbW92ZSBhbGwgdGhlIGFjdGlvbnNcclxuXHRcdFx0XHR2YXIgX2FjdGlvbnMgPSBBcnJheS5mcm9tKGFjdGlvbnMucXVlcnlTZWxlY3RvckFsbChcIi5zaWRlYmFyLWl0ZW1cIikpO1xyXG5cclxuXHRcdFx0XHRfYWN0aW9ucy5mb3JFYWNoKGFjdGlvbiA9PiBhY3Rpb24ucmVtb3ZlKCkpO1xyXG5cclxuXHRcdFx0XHQvLyBzaWRlIHRoZSBwYWdlIGFjdGlvbnNcclxuXHRcdFx0XHRhY3Rpb25zLmNsYXNzTGlzdC5hZGQoXCJoaWRkZW5cIik7XHJcblx0XHRcdH0pO1xyXG5cdFx0fSk7XHJcblx0fVxyXG59KTtcclxuIiwiLyoqXHJcbiAqIEEgcm93IG9mIHJhZGlvIHN0eWxlIGJ1dHRvbnNcclxuICovXHJcblxyXG5saWZlTGluZS5tYWtlRG9tLnJlZ2lzdGVyKFwidG9nZ2xlLWJ0bnNcIiwge1xyXG5cdG1ha2Uoe2J0bnMsIHZhbHVlfSkge1xyXG5cdFx0Ly8gYXV0byBzZWxlY3QgdGhlIGZpcnN0IGJ1dHRvblxyXG5cdFx0aWYoIXZhbHVlKSB7XHJcblx0XHRcdHZhbHVlID0gdHlwZW9mIGJ0bnNbMF0gPT0gXCJzdHJpbmdcIiA/IGJ0bnNbMF0gOiBidG5zWzBdLnZhbHVlO1xyXG5cdFx0fVxyXG5cclxuXHRcdHJldHVybiB7XHJcblx0XHRcdG5hbWU6IFwidG9nZ2xlQmFyXCIsXHJcblx0XHRcdGNsYXNzZXM6IFwidG9nZ2xlLWJhclwiLFxyXG5cdFx0XHRjaGlsZHJlbjogYnRucy5tYXAoYnRuID0+IHtcclxuXHRcdFx0XHQvLyBjb252ZXJ0IHRoZSBwbGFpbiBzdHJpbmcgdG8gYW4gb2JqZWN0XHJcblx0XHRcdFx0aWYodHlwZW9mIGJ0biA9PSBcInN0cmluZ1wiKSB7XHJcblx0XHRcdFx0XHRidG4gPSB7IHRleHQ6IGJ0biwgdmFsdWU6IGJ0biB9O1xyXG5cdFx0XHRcdH1cclxuXHJcblx0XHRcdFx0dmFyIGNsYXNzZXMgPSBbXCJ0b2dnbGUtYnRuXCJdO1xyXG5cclxuXHRcdFx0XHQvLyBhZGQgdGhlIHNlbGVjdGVkIGNsYXNzXHJcblx0XHRcdFx0aWYodmFsdWUgPT0gYnRuLnZhbHVlKSB7XHJcblx0XHRcdFx0XHRjbGFzc2VzLnB1c2goXCJ0b2dnbGUtYnRuLXNlbGVjdGVkXCIpO1xyXG5cclxuXHRcdFx0XHRcdC8vIGRvbid0IHNlbGVjdCB0d28gYnV0dG9uc1xyXG5cdFx0XHRcdFx0dmFsdWUgPSB1bmRlZmluZWQ7XHJcblx0XHRcdFx0fVxyXG5cclxuXHRcdFx0XHRyZXR1cm4ge1xyXG5cdFx0XHRcdFx0dGFnOiBcImJ1dHRvblwiLFxyXG5cdFx0XHRcdFx0Y2xhc3NlcyxcclxuXHRcdFx0XHRcdHRleHQ6IGJ0bi50ZXh0LFxyXG5cdFx0XHRcdFx0YXR0cnM6IHtcclxuXHRcdFx0XHRcdFx0XCJkYXRhLXZhbHVlXCI6IGJ0bi52YWx1ZVxyXG5cdFx0XHRcdFx0fVxyXG5cdFx0XHRcdH07XHJcblx0XHRcdH0pXHJcblx0XHR9O1xyXG5cdH0sXHJcblxyXG5cdGJpbmQoe2NoYW5nZX0sIHt0b2dnbGVCYXJ9KSB7XHJcblx0XHQvLyBhdHRhY2ggbGlzdGVuZXJzXHJcblx0XHRmb3IobGV0IGJ0biBvZiB0b2dnbGVCYXIucXVlcnlTZWxlY3RvckFsbChcIi50b2dnbGUtYnRuXCIpKSB7XHJcblx0XHRcdGJ0bi5hZGRFdmVudExpc3RlbmVyKFwiY2xpY2tcIiwgKCkgPT4ge1xyXG5cdFx0XHRcdHZhciBzZWxlY3RlZCA9IHRvZ2dsZUJhci5xdWVyeVNlbGVjdG9yKFwiLnRvZ2dsZS1idG4tc2VsZWN0ZWRcIik7XHJcblxyXG5cdFx0XHRcdC8vIHRoZSBidXR0b24gaGFzIGFscmVhZHkgYmVlbiBzZWxlY3RlZFxyXG5cdFx0XHRcdGlmKHNlbGVjdGVkID09IGJ0bikge1xyXG5cdFx0XHRcdFx0cmV0dXJuO1xyXG5cdFx0XHRcdH1cclxuXHJcblx0XHRcdFx0Ly8gdW50b2dnbGUgdGhlIG90aGVyIGJ1dHRvblxyXG5cdFx0XHRcdGlmKHNlbGVjdGVkKSB7XHJcblx0XHRcdFx0XHRzZWxlY3RlZC5jbGFzc0xpc3QucmVtb3ZlKFwidG9nZ2xlLWJ0bi1zZWxlY3RlZFwiKTtcclxuXHRcdFx0XHR9XHJcblxyXG5cdFx0XHRcdC8vIHNlbGVjdCB0aGlzIGJ1dHRvblxyXG5cdFx0XHRcdGJ0bi5jbGFzc0xpc3QuYWRkKFwidG9nZ2xlLWJ0bi1zZWxlY3RlZFwiKTtcclxuXHJcblx0XHRcdFx0Ly8gdHJpZ2dlciBhIHNlbGVjdGlvbiBjaGFuZ2VcclxuXHRcdFx0XHRjaGFuZ2UoYnRuLmRhdGFzZXQudmFsdWUpO1xyXG5cdFx0XHR9KTtcclxuXHRcdH1cclxuXHR9XHJcbn0pO1xyXG4iLCIvKipcclxuICogTmFtZSBnZW5lcmF0b3IgZm9yIGJhY2t1cHNcclxuICovXHJcblxyXG5leHBvcnQgZnVuY3Rpb24gZ2VuQmFja3VwTmFtZSgpIHtcclxuXHR2YXIgZGF0ZSA9IG5ldyBEYXRlKCk7XHJcblxyXG5cdHJldHVybiBgYmFja3VwLSR7ZGF0ZS5nZXRGdWxsWWVhcigpfS0ke2RhdGUuZ2V0TW9udGgoKSsxfS0ke2RhdGUuZ2V0RGF0ZSgpfWBcclxuXHRcdCsgYC0ke2RhdGUuZ2V0SG91cnMoKX0tJHtkYXRlLmdldE1pbnV0ZXMoKX0uemlwYDtcclxufVxyXG4iLCIvKipcclxuICogS2VlcCBhIGxpc3Qgb2Ygc3Vic2NyaXB0aW9ucyB0byB1bnN1YnNjcmliZSBmcm9tIHRvZ2V0aGVyXHJcbiAqL1xyXG5cclxuZXhwb3J0IGRlZmF1bHQgY2xhc3MgRGlzcG9zYWJsZSB7XHJcblx0Y29uc3RydWN0b3IoKSB7XHJcblx0XHR0aGlzLl9zdWJzY3JpcHRpb25zID0gW107XHJcblx0fVxyXG5cclxuXHQvLyBVbnN1YnNjcmliZSBmcm9tIGFsbCBzdWJzY3JpcHRpb25zXHJcblx0ZGlzcG9zZSgpIHtcclxuXHRcdC8vIHJlbW92ZSB0aGUgZmlyc3Qgc3Vic2NyaXB0aW9uIHVudGlsIHRoZXJlIGFyZSBub25lIGxlZnRcclxuXHRcdHdoaWxlKHRoaXMuX3N1YnNjcmlwdGlvbnMubGVuZ3RoID4gMCkge1xyXG5cdFx0XHR0aGlzLl9zdWJzY3JpcHRpb25zLnNoaWZ0KCkudW5zdWJzY3JpYmUoKTtcclxuXHRcdH1cclxuXHR9XHJcblxyXG5cdC8vIEFkZCBhIHN1YnNjcmlwdGlvbiB0byB0aGUgZGlzcG9zYWJsZVxyXG5cdGFkZChzdWJzY3JpcHRpb24pIHtcclxuXHRcdC8vIGNvcHkgdGhlIGRpc3Bvc2FibGVcclxuXHRcdGlmKHN1YnNjcmlwdGlvbiBpbnN0YW5jZW9mIERpc3Bvc2FibGUpIHtcclxuXHRcdFx0Ly8gY29weSB0aGUgc3Vic2NyaXB0aW9ucyBmcm9tIHRoZSBkaXNwb3NhYmxlXHJcblx0XHRcdHRoaXMuX3N1YnNjcmlwdGlvbnMgPSB0aGlzLl9zdWJzY3JpcHRpb25zLmNvbmNhdChzdWJzY3JpcHRpb24uX3N1YnNjcmlwdGlvbnMpO1xyXG5cclxuXHRcdFx0Ly8gcmVtb3ZlIHRoZSByZWZyZW5jZXMgZnJvbSB0aGUgZGlzcG9zYWJsZVxyXG5cdFx0XHRzdWJzY3JpcHRpb24uX3N1YnNjcmlwdGlvbnMgPSBbXTtcclxuXHRcdH1cclxuXHRcdC8vIGFkZCBhIHN1YnNjcmlwdGlvblxyXG5cdFx0ZWxzZSB7XHJcblx0XHRcdHRoaXMuX3N1YnNjcmlwdGlvbnMucHVzaChzdWJzY3JpcHRpb24pO1xyXG5cdFx0fVxyXG5cdH1cclxuXHJcblx0Ly8gZGlzcG9zZSB3aGVuIGFuIGV2ZW50IGlzIGZpcmVkXHJcblx0ZGlzcG9zZU9uKGVtaXR0ZXIsIGV2ZW50KSB7XHJcblx0XHR0aGlzLmFkZChlbWl0dGVyLm9uKGV2ZW50LCAoKSA9PiB0aGlzLmRpc3Bvc2UoKSkpO1xyXG5cdH1cclxufTtcclxuIiwiLyoqXHJcbiAqIEEgYmFzaWMgZXZlbnQgZW1pdHRlclxyXG4gKi9cclxuXHJcbmV4cG9ydCBkZWZhdWx0IGNsYXNzIEV2ZW50RW1pdHRlciB7XHJcblx0Y29uc3RydWN0b3IoKSB7XHJcblx0XHR0aGlzLl9saXN0ZW5lcnMgPSB7fTtcclxuXHR9XHJcblxyXG5cdC8qKlxyXG5cdCAqIEFkZCBhbiBldmVudCBsaXN0ZW5lclxyXG5cdCAqL1xyXG5cdG9uKG5hbWUsIGxpc3RlbmVyKSB7XHJcblx0XHQvLyBpZiB3ZSBkb24ndCBoYXZlIGFuIGV4aXN0aW5nIGxpc3RlbmVycyBhcnJheSBjcmVhdGUgb25lXHJcblx0XHRpZighdGhpcy5fbGlzdGVuZXJzW25hbWVdKSB7XHJcblx0XHRcdHRoaXMuX2xpc3RlbmVyc1tuYW1lXSA9IFtdO1xyXG5cdFx0fVxyXG5cclxuXHRcdC8vIGFkZCB0aGUgbGlzdGVuZXJcclxuXHRcdHRoaXMuX2xpc3RlbmVyc1tuYW1lXS5wdXNoKGxpc3RlbmVyKTtcclxuXHJcblx0XHQvLyBnaXZlIHRoZW0gYSBzdWJzY3JpcHRpb25cclxuXHRcdHJldHVybiB7XHJcblx0XHRcdF9saXN0ZW5lcjogbGlzdGVuZXIsXHJcblxyXG5cdFx0XHR1bnN1YnNjcmliZTogKCkgPT4ge1xyXG5cdFx0XHRcdC8vIGZpbmQgdGhlIGxpc3RlbmVyXHJcblx0XHRcdFx0dmFyIGluZGV4ID0gdGhpcy5fbGlzdGVuZXJzW25hbWVdLmluZGV4T2YobGlzdGVuZXIpO1xyXG5cclxuXHRcdFx0XHRpZihpbmRleCAhPT0gLTEpIHtcclxuXHRcdFx0XHRcdHRoaXMuX2xpc3RlbmVyc1tuYW1lXS5zcGxpY2UoaW5kZXgsIDEpO1xyXG5cdFx0XHRcdH1cclxuXHRcdFx0fVxyXG5cdFx0fTtcclxuXHR9XHJcblxyXG5cdC8qKlxyXG5cdCAqIEVtaXQgYW4gZXZlbnRcclxuXHQgKi9cclxuXHRlbWl0KG5hbWUsIC4uLmFyZ3MpIHtcclxuXHRcdC8vIGNoZWNrIGZvciBsaXN0ZW5lcnNcclxuXHRcdGlmKHRoaXMuX2xpc3RlbmVyc1tuYW1lXSkge1xyXG5cdFx0XHRmb3IobGV0IGxpc3RlbmVyIG9mIHRoaXMuX2xpc3RlbmVyc1tuYW1lXSkge1xyXG5cdFx0XHRcdC8vIGNhbGwgdGhlIGxpc3RlbmVyc1xyXG5cdFx0XHRcdGxpc3RlbmVyKC4uLmFyZ3MpO1xyXG5cdFx0XHR9XHJcblx0XHR9XHJcblx0fVxyXG5cclxuXHQvKipcclxuXHQgKiBFbWl0IGFuIGV2ZW50IGFuZCBza2lwIHNvbWUgbGlzdGVuZXJzXHJcblx0ICovXHJcblx0cGFydGlhbEVtaXQobmFtZSwgc2tpcHMgPSBbXSwgLi4uYXJncykge1xyXG5cdFx0Ly8gYWxsb3cgYSBzaW5nbGUgaXRlbVxyXG5cdFx0aWYoIUFycmF5LmlzQXJyYXkoc2tpcHMpKSB7XHJcblx0XHRcdHNraXBzID0gW3NraXBzXTtcclxuXHRcdH1cclxuXHJcblx0XHQvLyBjaGVjayBmb3IgbGlzdGVuZXJzXHJcblx0XHRpZih0aGlzLl9saXN0ZW5lcnNbbmFtZV0pIHtcclxuXHRcdFx0Zm9yKGxldCBsaXN0ZW5lciBvZiB0aGlzLl9saXN0ZW5lcnNbbmFtZV0pIHtcclxuXHRcdFx0XHQvLyB0aGlzIGV2ZW50IGxpc3RlbmVyIGlzIGJlaW5nIHNraXBlZFxyXG5cdFx0XHRcdGlmKHNraXBzLmZpbmQoc2tpcCA9PiBza2lwLl9saXN0ZW5lciA9PSBsaXN0ZW5lcikpIHtcclxuXHRcdFx0XHRcdGNvbnRpbnVlO1xyXG5cdFx0XHRcdH1cclxuXHJcblx0XHRcdFx0Ly8gY2FsbCB0aGUgbGlzdGVuZXJzXHJcblx0XHRcdFx0bGlzdGVuZXIoLi4uYXJncyk7XHJcblx0XHRcdH1cclxuXHRcdH1cclxuXHR9XHJcbn1cclxuIiwiLyoqXHJcbiAqIENyZWF0ZSBhIGdsb2JhbCBvYmplY3Qgd2l0aCBjb21tb25seSB1c2VkIG1vZHVsZXMgdG8gYXZvaWQgNTAgbWlsbGlvbiByZXF1aXJlc1xyXG4gKi9cclxuXHJcbmltcG9ydCBFdmVudEVtaXR0ZXIgZnJvbSBcIi4vZXZlbnQtZW1pdHRlclwiO1xyXG5cclxudmFyIGxpZmVMaW5lID0gbmV3IEV2ZW50RW1pdHRlcigpO1xyXG5cclxuLy8gcGxhdGZvcm0gZGV0ZWN0aW9uXHJcbmxpZmVMaW5lLm5vZGUgPSB0eXBlb2YgcHJvY2VzcyA9PSBcIm9iamVjdFwiO1xyXG5saWZlTGluZS5icm93c2VyID0gdHlwZW9mIHdpbmRvdyA9PSBcIm9iamVjdFwiO1xyXG5cclxuLy8gYXR0YWNoIHV0aWxzXHJcbmxpZmVMaW5lLkRpc3Bvc2FibGUgPSByZXF1aXJlKFwiLi9kaXNwb3NhYmxlXCIpLmRlZmF1bHQ7XHJcbmxpZmVMaW5lLkV2ZW50RW1pdHRlciA9IEV2ZW50RW1pdHRlcjtcclxuXHJcbi8vIGF0dGFjaCBsaWZlbGluZSB0byB0aGUgZ2xvYmFsIG9iamVjdFxyXG4obGlmZUxpbmUubm9kZSA/IGdsb2JhbCA6IGJyb3dzZXIpLmxpZmVMaW5lID0gbGlmZUxpbmU7XHJcbiJdfQ==
