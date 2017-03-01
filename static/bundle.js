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

/**
 * An indexed db adaptor
 */

var idb = require("idb");

var VALID_STORES = ["assignments", "sync-store"];

// open/setup the database
var dbPromise = idb.open("data-stores", 3, function (db) {
	// upgrade or create the db
	if (db.oldVersion < 1) db.createObjectStore("assignments", { keyPath: "id" });
	if (db.oldVersion < 2) db.createObjectStore("sync-store", { keyPath: "id" });

	// the version 2 sync-store had a different structure that the version 3
	if (db.oldVersion == 2) {
		db.deleteObjectStore("sync-store");
		db.createObjectStore("sync-store", { keyPath: "id" });
	}
});

var IdbAdaptor = function () {
	function IdbAdaptor(name) {
		_classCallCheck(this, IdbAdaptor);

		this.name = name;

		// check the store is valid
		if (VALID_STORES.indexOf(name) === -1) {
			throw new Error("The data store " + name + " is not in idb update the db");
		}
	}

	// create a transaction


	_createClass(IdbAdaptor, [{
		key: "_transaction",
		value: function _transaction(readWrite) {
			var _this = this;

			return dbPromise.then(function (db) {
				return db.transaction(_this.name, readWrite && "readwrite").objectStore(_this.name);
			});
		}

		/**
   * Get all the values in the object store
   */

	}, {
		key: "getAll",
		value: function getAll() {
			return this._transaction().then(function (trans) {
				return trans.getAll();
			});
		}

		/**
   * Get a specific value
   */

	}, {
		key: "get",
		value: function get(key) {
			return this._transaction().then(function (trans) {
				return trans.get(key);
			});
		}

		/**
   * Store a value in idb
   */

	}, {
		key: "set",
		value: function set(value) {
			return this._transaction(true).then(function (trans) {
				return trans.put(value);
			});
		}

		/**
   * Remove a value from idb
   */

	}, {
		key: "remove",
		value: function remove(key) {
			return this._transaction(true).then(function (trans) {
				return trans.delete(key);
			});
		}
	}]);

	return IdbAdaptor;
}();

module.exports = IdbAdaptor;

},{"idb":1}],4:[function(require,module,exports){
"use strict";

/**
 * Instantiate all the data stores
 */

var HttpAdaptor = require("../../common/data-stores/http-adaptor");
var PoolStore = require("../../common/data-stores/pool-store");
var Syncer = require("../../common/data-stores/syncer");
var IdbAdaptor = require("./idb-adaptor");

var initItem = function (item) {
	// instantiate the date
	if (item.date) {
		item.date = new Date(item.date);
	}
};

// create a syncer
var assignmentsAdaptor = new Syncer({
	remote: new HttpAdaptor("/api/data/"),
	local: new IdbAdaptor("assignments"),
	changeStore: new IdbAdaptor("sync-store")
});

exports.assignments = new PoolStore(assignmentsAdaptor, initItem);

// check our access level
assignmentsAdaptor.accessLevel().then(function (level) {
	// we are logged out
	if (level == "none") {
		lifeLine.nav.navigate("/login");
	}
});

// trigger a sync
lifeLine.sync = function () {
	// trigger a sync
	return assignmentsAdaptor.sync()

	// force a refesh
	.then(function () {
		return lifeLine.nav.navigate(location.pathname);
	});
};

if (typeof window == "object") {
	// initial sync
	lifeLine.sync();

	// sync when we revisit the page
	window.addEventListener("visibilitychange", function () {
		if (!document.hidden) {
			lifeLine.sync();
		}
	});
}

},{"../../common/data-stores/http-adaptor":24,"../../common/data-stores/pool-store":27,"../../common/data-stores/syncer":28,"./idb-adaptor":3}],5:[function(require,module,exports){
"use strict";

/**
 * Browser specific globals
 */

lifeLine.makeDom = require("./util/dom-maker");

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

},{"./util/dom-maker":9}],6:[function(require,module,exports){
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

},{"../common/global":29,"./global":5,"./sw-helper":7,"./views/account":10,"./views/edit":11,"./views/item":12,"./views/lists":13,"./views/login":14,"./views/todo":15,"./views/users":16,"./widgets/content":17,"./widgets/input":18,"./widgets/link":19,"./widgets/list":20,"./widgets/sidebar":21,"./widgets/toggle-btns":22}],7:[function(require,module,exports){
"use strict";

/**
 * Register and communicate with the service worker
 */

// register the service worker
if (navigator.serviceWorker) {
	// make sure it's registered
	navigator.serviceWorker.register("/service-worker.js");

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

},{}],9:[function(require,module,exports){
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

},{}],10:[function(require,module,exports){
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

},{"../../common/backup":23}],11:[function(require,module,exports){
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

},{"../data-stores":4,"../util/date":8}],12:[function(require,module,exports){
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

},{"../data-stores":4,"../util/date":8}],13:[function(require,module,exports){
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

},{"../data-stores":4,"../util/date":8}],14:[function(require,module,exports){
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

							// sync now that we are logged in
							if (lifeLine.sync) {
								lifeLine.sync();
							}

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

},{}],15:[function(require,module,exports){
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

},{"../data-stores":4,"../util/date":8}],16:[function(require,module,exports){
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

},{}],17:[function(require,module,exports){
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

},{}],18:[function(require,module,exports){
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

},{}],19:[function(require,module,exports){
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

},{}],20:[function(require,module,exports){
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

},{}],21:[function(require,module,exports){
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

},{}],22:[function(require,module,exports){
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

},{}],23:[function(require,module,exports){
"use strict";

/**
 * Name generator for backups
 */

exports.genBackupName = function () {
  var date = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : new Date();

  return "backup-" + date.getFullYear() + "-" + (date.getMonth() + 1) + "-" + date.getDate() + ("-" + date.getHours() + "-" + date.getMinutes() + ".zip");
};

},{}],24:[function(require,module,exports){
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
					opts.credentials = "include";
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

},{}],25:[function(require,module,exports){
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

},{}],26:[function(require,module,exports){
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

},{}],27:[function(require,module,exports){
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

},{}],28:[function(require,module,exports){
"use strict";

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

/**
 * A wrapper that syncronizes local changes with a remote host
 */

var KeyValueStore = require("./key-value-store");

var Syncer = function () {
	function Syncer(opts) {
		_classCallCheck(this, Syncer);

		this._local = opts.local;
		this._remote = opts.remote;
		this._changeStore = new KeyValueStore(opts.changeStore);
		this._changesName = opts.changesName || "changes";

		// save all the ids to optimize creates
		this._ids = this.getAll().then(function (all) {
			return all.map(function (value) {
				return value.id;
			});
		});
	}

	// pass through get and getAll


	_createClass(Syncer, [{
		key: "getAll",
		value: function getAll() {
			return this._local.getAll();
		}
	}, {
		key: "get",
		value: function get(key) {
			return this._local.get(key);
		}

		// keep track of any created values

	}, {
		key: "set",
		value: function set(value) {
			var _this = this;

			// check if this is a create
			this._ids = this._ids.then(function (ids) {
				// new value
				if (ids.indexOf(value.id) === -1) {
					ids.push(value.id);

					// save the change
					_this._change("create", value.id);
				}

				return ids;
			});

			// store the value
			return this._ids.then(function () {
				return _this._local.set(value);
			});
		}

		// keep track of deleted values

	}, {
		key: "remove",
		value: function remove(key) {
			var _this2 = this;

			this._ids = this._ids.then(function (ids) {
				// remove this from the all ids list
				var index = ids.indexOf(key);

				if (index !== -1) {
					ids.splice(index, 1);
				}

				// save the change
				_this2._change("remove", key);
			});

			// remove the actual value
			return this._ids.then(function () {
				return _this2._local.remove(key);
			});
		}

		// store a change in the change store

	}, {
		key: "_change",
		value: function _change(type, id) {
			var _this3 = this;

			// get the changes
			this._changeStore.get(this._changesName, []).then(function (changes) {
				// add the change
				changes.push({ type: type, id: id, timestamp: Date.now() });

				// save the changes
				return _this3._changeStore.set(_this3._changesName, changes);
			});
		}

		// sync the two stores

	}, {
		key: "sync",
		value: function sync() {
			return new Sync(this._local, this._remote, this._changeStore, this._changesName).sync();
		}

		// get the remote access level

	}, {
		key: "accessLevel",
		value: function accessLevel() {
			return this._remote.accessLevel()

			// if anything goes wrong assume full permissions
			.catch(function () {
				return "full";
			});
		}
	}]);

	return Syncer;
}();

// a single sync


var Sync = function () {
	function Sync(local, remote, changeStore, changesName) {
		_classCallCheck(this, Sync);

		this._local = local;
		this._remote = remote;
		this._changeStore = changeStore;
		this._changesName = changesName;
	}

	_createClass(Sync, [{
		key: "sync",
		value: function sync() {
			var _this4 = this;

			// get the ids and last modified dates for all remote values
			return this.getModifieds().then(function (modifieds) {
				// remove the values we deleted from the remote host
				return _this4.remove(modifieds)

				// merge modified values
				.then(function () {
					return _this4.mergeModifieds(modifieds);
				});
			}).then(function (remoteDeletes) {
				// send values we created since the last sync
				return _this4.create(remoteDeletes)

				// remove any items that where deleted remotly
				.then(function () {
					return _this4.applyDeletes(remoteDeletes);
				});
			})

			// clear the changes
			.then(function () {
				return _this4._changeStore.set(_this4._changesName, []);
			});
		}

		// get the last modified times for each value

	}, {
		key: "getModifieds",
		value: function getModifieds() {
			var _this5 = this;

			this._items = {};

			return this._remote.getAll().then(function (values) {
				var modifieds = {};

				var _iteratorNormalCompletion = true;
				var _didIteratorError = false;
				var _iteratorError = undefined;

				try {
					for (var _iterator = values[Symbol.iterator](), _step; !(_iteratorNormalCompletion = (_step = _iterator.next()).done); _iteratorNormalCompletion = true) {
						var value = _step.value;

						// store the items
						_this5._items[value.id] = value;
						// get the modified times
						modifieds[value.id] = value.modified;
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

				return modifieds;
			});
		}

		// remove values we have deleted since the last sync

	}, {
		key: "remove",
		value: function remove(modifieds) {
			var _this6 = this;

			return this._changeStore.get(this._changesName, []).then(function (changes) {
				var promises = [];

				// remove the items we remove from modifieds
				var _iteratorNormalCompletion2 = true;
				var _didIteratorError2 = false;
				var _iteratorError2 = undefined;

				try {
					for (var _iterator2 = changes[Symbol.iterator](), _step2; !(_iteratorNormalCompletion2 = (_step2 = _iterator2.next()).done); _iteratorNormalCompletion2 = true) {
						var change = _step2.value;

						if (change.type == "remove" && change.timestamp >= modifieds[change.id]) {
							// don't try to create the item locally
							delete modifieds[change.id];

							// delete it remotely
							promises.push(_this6._remote.remove(change.id));
						}
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

				return Promise.all(promises);
			});
		}

		// update the local/remote values that where changed

	}, {
		key: "mergeModifieds",
		value: function mergeModifieds(modifieds) {
			var _this7 = this;

			var remoteDeletes = [];

			// go through all the modifieds
			return this._local.getAll().then(function (values) {
				var promises = [];
				// start with a list of all the ids and remove ids we have locally
				var remoteCreates = Object.getOwnPropertyNames(modifieds);

				// check all the local values against the remote ones
				var _iteratorNormalCompletion3 = true;
				var _didIteratorError3 = false;
				var _iteratorError3 = undefined;

				try {
					for (var _iterator3 = values[Symbol.iterator](), _step3; !(_iteratorNormalCompletion3 = (_step3 = _iterator3.next()).done); _iteratorNormalCompletion3 = true) {
						var value = _step3.value;

						// remove items we already have from the creates
						var index = remoteCreates.indexOf(value.id);

						if (index !== -1) {
							remoteCreates.splice(index, 1);
						}

						// deleted from the remote adaptor
						if (!modifieds[value.id]) {
							remoteDeletes.push(value.id);
						}
						// the remote version is newer
						else if (modifieds[value.id] > value.modified) {
								promises.push(
								// fetch the remote value
								_this7.get(value.id).then(function (newValue) {
									return _this7._local.set(newValue);
								}));
							}
							// the local version is newer
							else {
									promises.push(_this7._remote.set(value));
								}
					}

					// get values from the remote we are missing
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

				var _iteratorNormalCompletion4 = true;
				var _didIteratorError4 = false;
				var _iteratorError4 = undefined;

				try {
					for (var _iterator4 = remoteCreates[Symbol.iterator](), _step4; !(_iteratorNormalCompletion4 = (_step4 = _iterator4.next()).done); _iteratorNormalCompletion4 = true) {
						var id = _step4.value;

						promises.push(_this7.get(id).then(function (newValue) {
							return _this7._local.set(newValue);
						}));
					}
				} catch (err) {
					_didIteratorError4 = true;
					_iteratorError4 = err;
				} finally {
					try {
						if (!_iteratorNormalCompletion4 && _iterator4.return) {
							_iterator4.return();
						}
					} finally {
						if (_didIteratorError4) {
							throw _iteratorError4;
						}
					}
				}

				return Promise.all(promises);
			})

			// return the deletes
			.then(function () {
				return remoteDeletes;
			});
		}

		// get a remote value

	}, {
		key: "get",
		value: function get(id) {
			return Promise.resolve(this._items[id]);
		}

		// send created values to the server

	}, {
		key: "create",
		value: function create(remoteDeletes) {
			var _this8 = this;

			return this._changeStore.get(this._changesName).then(function () {
				var changes = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : [];

				var promises = [];

				// remove the items we remove from modifieds
				var _iteratorNormalCompletion5 = true;
				var _didIteratorError5 = false;
				var _iteratorError5 = undefined;

				try {
					for (var _iterator5 = changes[Symbol.iterator](), _step5; !(_iteratorNormalCompletion5 = (_step5 = _iterator5.next()).done); _iteratorNormalCompletion5 = true) {
						var change = _step5.value;

						if (change.type == "create") {
							// if we marked this value as a delete undo that
							var index = remoteDeletes.indexOf(change.id);

							if (index !== -1) {
								remoteDeletes.splice(index, 1);
							}

							// save the value to the remote
							promises.push(_this8._local.get(change.id).then(function (value) {
								return _this8._remote.set(value);
							}));
						}
					}
				} catch (err) {
					_didIteratorError5 = true;
					_iteratorError5 = err;
				} finally {
					try {
						if (!_iteratorNormalCompletion5 && _iterator5.return) {
							_iterator5.return();
						}
					} finally {
						if (_didIteratorError5) {
							throw _iteratorError5;
						}
					}
				}

				return Promise.all(promises);
			});
		}

		// delete values that where deleted from the remote host

	}, {
		key: "applyDeletes",
		value: function applyDeletes(remoteDeletes) {
			var _this9 = this;

			return Promise.all(remoteDeletes.map(function (id) {
				return _this9._local.remove(id);
			}));
		}
	}]);

	return Sync;
}();

module.exports = Syncer;

},{"./key-value-store":25}],29:[function(require,module,exports){
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

},{"./data-stores/key-value-store":25,"./data-stores/mem-adaptor":26,"./util/disposable":30,"./util/event-emitter":31,"_process":2}],30:[function(require,module,exports){
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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCJub2RlX21vZHVsZXMvaWRiL2xpYi9pZGIuanMiLCJub2RlX21vZHVsZXMvcHJvY2Vzcy9icm93c2VyLmpzIiwic3JjXFxjbGllbnRcXGRhdGEtc3RvcmVzXFxpZGItYWRhcHRvci5qcyIsInNyY1xcY2xpZW50XFxkYXRhLXN0b3Jlc1xcaW5kZXguanMiLCJzcmNcXGNsaWVudFxcZ2xvYmFsLmpzIiwic3JjXFxjbGllbnRcXGluZGV4LmpzIiwic3JjXFxjbGllbnRcXHN3LWhlbHBlci5qcyIsInNyY1xcY2xpZW50XFx1dGlsXFxkYXRlLmpzIiwic3JjXFxjbGllbnRcXHV0aWxcXGRvbS1tYWtlci5qcyIsInNyY1xcY2xpZW50XFx2aWV3c1xcYWNjb3VudC5qcyIsInNyY1xcY2xpZW50XFx2aWV3c1xcZWRpdC5qcyIsInNyY1xcY2xpZW50XFx2aWV3c1xcaXRlbS5qcyIsInNyY1xcY2xpZW50XFx2aWV3c1xcbGlzdHMuanMiLCJzcmNcXGNsaWVudFxcdmlld3NcXGxvZ2luLmpzIiwic3JjXFxjbGllbnRcXHZpZXdzXFx0b2RvLmpzIiwic3JjXFxjbGllbnRcXHZpZXdzXFx1c2Vycy5qcyIsInNyY1xcY2xpZW50XFx3aWRnZXRzXFxjb250ZW50LmpzIiwic3JjXFxjbGllbnRcXHdpZGdldHNcXGlucHV0LmpzIiwic3JjXFxjbGllbnRcXHdpZGdldHNcXGxpbmsuanMiLCJzcmNcXGNsaWVudFxcd2lkZ2V0c1xcbGlzdC5qcyIsInNyY1xcY2xpZW50XFx3aWRnZXRzXFxzaWRlYmFyLmpzIiwic3JjXFxjbGllbnRcXHdpZGdldHNcXHRvZ2dsZS1idG5zLmpzIiwic3JjXFxjb21tb25cXGJhY2t1cC5qcyIsInNyY1xcY29tbW9uXFxkYXRhLXN0b3Jlc1xcaHR0cC1hZGFwdG9yLmpzIiwic3JjXFxjb21tb25cXGRhdGEtc3RvcmVzXFxrZXktdmFsdWUtc3RvcmUuanMiLCJzcmNcXGNvbW1vblxcZGF0YS1zdG9yZXNcXG1lbS1hZGFwdG9yLmpzIiwic3JjXFxjb21tb25cXGRhdGEtc3RvcmVzXFxwb29sLXN0b3JlLmpzIiwic3JjXFxjb21tb25cXGRhdGEtc3RvcmVzXFxzeW5jZXIuanMiLCJzcmNcXGNvbW1vblxcc3JjXFxjb21tb25cXGdsb2JhbC5qcyIsInNyY1xcY29tbW9uXFx1dGlsXFxkaXNwb3NhYmxlLmpzIiwic3JjXFxjb21tb25cXHV0aWxcXGV2ZW50LWVtaXR0ZXIuanMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7QUNBQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3RUQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNB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QTs7QUFFRDtBQUNBLE9BQUcsS0FBSyxVQUFMLENBQWdCLElBQWhCLENBQUgsRUFBMEI7QUFBQSx1Q0FQTSxJQU9OO0FBUE0sU0FPTjtBQUFBOztBQUFBLDBCQUNqQixRQURpQjtBQUV4QjtBQUNBLFNBQUcsTUFBTSxJQUFOLENBQVc7QUFBQSxhQUFRLEtBQUssU0FBTCxJQUFrQixRQUExQjtBQUFBLE1BQVgsQ0FBSCxFQUFtRDtBQUNsRDtBQUNBOztBQUVEO0FBQ0EsK0JBQVksSUFBWjtBQVJ3Qjs7QUFBQTtBQUFBO0FBQUE7O0FBQUE7QUFDekIsMkJBQW9CLEtBQUssVUFBTCxDQUFnQixJQUFoQixDQUFwQixtSUFBMkM7QUFBQSxVQUFuQyxRQUFtQzs7QUFBQSx1QkFBbkMsUUFBbUM7O0FBQUEsK0JBR3pDO0FBS0Q7QUFUd0I7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQVV6QjtBQUNEOzs7Ozs7QUFHRixPQUFPLE9BQVAsR0FBaUIsWUFBakIiLCJmaWxlIjoiZ2VuZXJhdGVkLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXNDb250ZW50IjpbIihmdW5jdGlvbiBlKHQsbixyKXtmdW5jdGlvbiBzKG8sdSl7aWYoIW5bb10pe2lmKCF0W29dKXt2YXIgYT10eXBlb2YgcmVxdWlyZT09XCJmdW5jdGlvblwiJiZyZXF1aXJlO2lmKCF1JiZhKXJldHVybiBhKG8sITApO2lmKGkpcmV0dXJuIGkobywhMCk7dmFyIGY9bmV3IEVycm9yKFwiQ2Fubm90IGZpbmQgbW9kdWxlICdcIitvK1wiJ1wiKTt0aHJvdyBmLmNvZGU9XCJNT0RVTEVfTk9UX0ZPVU5EXCIsZn12YXIgbD1uW29dPXtleHBvcnRzOnt9fTt0W29dWzBdLmNhbGwobC5leHBvcnRzLGZ1bmN0aW9uKGUpe3ZhciBuPXRbb11bMV1bZV07cmV0dXJuIHMobj9uOmUpfSxsLGwuZXhwb3J0cyxlLHQsbixyKX1yZXR1cm4gbltvXS5leHBvcnRzfXZhciBpPXR5cGVvZiByZXF1aXJlPT1cImZ1bmN0aW9uXCImJnJlcXVpcmU7Zm9yKHZhciBvPTA7bzxyLmxlbmd0aDtvKyspcyhyW29dKTtyZXR1cm4gc30pIiwiJ3VzZSBzdHJpY3QnO1xuXG4oZnVuY3Rpb24oKSB7XG4gIGZ1bmN0aW9uIHRvQXJyYXkoYXJyKSB7XG4gICAgcmV0dXJuIEFycmF5LnByb3RvdHlwZS5zbGljZS5jYWxsKGFycik7XG4gIH1cblxuICBmdW5jdGlvbiBwcm9taXNpZnlSZXF1ZXN0KHJlcXVlc3QpIHtcbiAgICByZXR1cm4gbmV3IFByb21pc2UoZnVuY3Rpb24ocmVzb2x2ZSwgcmVqZWN0KSB7XG4gICAgICByZXF1ZXN0Lm9uc3VjY2VzcyA9IGZ1bmN0aW9uKCkge1xuICAgICAgICByZXNvbHZlKHJlcXVlc3QucmVzdWx0KTtcbiAgICAgIH07XG5cbiAgICAgIHJlcXVlc3Qub25lcnJvciA9IGZ1bmN0aW9uKCkge1xuICAgICAgICByZWplY3QocmVxdWVzdC5lcnJvcik7XG4gICAgICB9O1xuICAgIH0pO1xuICB9XG5cbiAgZnVuY3Rpb24gcHJvbWlzaWZ5UmVxdWVzdENhbGwob2JqLCBtZXRob2QsIGFyZ3MpIHtcbiAgICB2YXIgcmVxdWVzdDtcbiAgICB2YXIgcCA9IG5ldyBQcm9taXNlKGZ1bmN0aW9uKHJlc29sdmUsIHJlamVjdCkge1xuICAgICAgcmVxdWVzdCA9IG9ialttZXRob2RdLmFwcGx5KG9iaiwgYXJncyk7XG4gICAgICBwcm9taXNpZnlSZXF1ZXN0KHJlcXVlc3QpLnRoZW4ocmVzb2x2ZSwgcmVqZWN0KTtcbiAgICB9KTtcblxuICAgIHAucmVxdWVzdCA9IHJlcXVlc3Q7XG4gICAgcmV0dXJuIHA7XG4gIH1cblxuICBmdW5jdGlvbiBwcm9taXNpZnlDdXJzb3JSZXF1ZXN0Q2FsbChvYmosIG1ldGhvZCwgYXJncykge1xuICAgIHZhciBwID0gcHJvbWlzaWZ5UmVxdWVzdENhbGwob2JqLCBtZXRob2QsIGFyZ3MpO1xuICAgIHJldHVybiBwLnRoZW4oZnVuY3Rpb24odmFsdWUpIHtcbiAgICAgIGlmICghdmFsdWUpIHJldHVybjtcbiAgICAgIHJldHVybiBuZXcgQ3Vyc29yKHZhbHVlLCBwLnJlcXVlc3QpO1xuICAgIH0pO1xuICB9XG5cbiAgZnVuY3Rpb24gcHJveHlQcm9wZXJ0aWVzKFByb3h5Q2xhc3MsIHRhcmdldFByb3AsIHByb3BlcnRpZXMpIHtcbiAgICBwcm9wZXJ0aWVzLmZvckVhY2goZnVuY3Rpb24ocHJvcCkge1xuICAgICAgT2JqZWN0LmRlZmluZVByb3BlcnR5KFByb3h5Q2xhc3MucHJvdG90eXBlLCBwcm9wLCB7XG4gICAgICAgIGdldDogZnVuY3Rpb24oKSB7XG4gICAgICAgICAgcmV0dXJuIHRoaXNbdGFyZ2V0UHJvcF1bcHJvcF07XG4gICAgICAgIH0sXG4gICAgICAgIHNldDogZnVuY3Rpb24odmFsKSB7XG4gICAgICAgICAgdGhpc1t0YXJnZXRQcm9wXVtwcm9wXSA9IHZhbDtcbiAgICAgICAgfVxuICAgICAgfSk7XG4gICAgfSk7XG4gIH1cblxuICBmdW5jdGlvbiBwcm94eVJlcXVlc3RNZXRob2RzKFByb3h5Q2xhc3MsIHRhcmdldFByb3AsIENvbnN0cnVjdG9yLCBwcm9wZXJ0aWVzKSB7XG4gICAgcHJvcGVydGllcy5mb3JFYWNoKGZ1bmN0aW9uKHByb3ApIHtcbiAgICAgIGlmICghKHByb3AgaW4gQ29uc3RydWN0b3IucHJvdG90eXBlKSkgcmV0dXJuO1xuICAgICAgUHJveHlDbGFzcy5wcm90b3R5cGVbcHJvcF0gPSBmdW5jdGlvbigpIHtcbiAgICAgICAgcmV0dXJuIHByb21pc2lmeVJlcXVlc3RDYWxsKHRoaXNbdGFyZ2V0UHJvcF0sIHByb3AsIGFyZ3VtZW50cyk7XG4gICAgICB9O1xuICAgIH0pO1xuICB9XG5cbiAgZnVuY3Rpb24gcHJveHlNZXRob2RzKFByb3h5Q2xhc3MsIHRhcmdldFByb3AsIENvbnN0cnVjdG9yLCBwcm9wZXJ0aWVzKSB7XG4gICAgcHJvcGVydGllcy5mb3JFYWNoKGZ1bmN0aW9uKHByb3ApIHtcbiAgICAgIGlmICghKHByb3AgaW4gQ29uc3RydWN0b3IucHJvdG90eXBlKSkgcmV0dXJuO1xuICAgICAgUHJveHlDbGFzcy5wcm90b3R5cGVbcHJvcF0gPSBmdW5jdGlvbigpIHtcbiAgICAgICAgcmV0dXJuIHRoaXNbdGFyZ2V0UHJvcF1bcHJvcF0uYXBwbHkodGhpc1t0YXJnZXRQcm9wXSwgYXJndW1lbnRzKTtcbiAgICAgIH07XG4gICAgfSk7XG4gIH1cblxuICBmdW5jdGlvbiBwcm94eUN1cnNvclJlcXVlc3RNZXRob2RzKFByb3h5Q2xhc3MsIHRhcmdldFByb3AsIENvbnN0cnVjdG9yLCBwcm9wZXJ0aWVzKSB7XG4gICAgcHJvcGVydGllcy5mb3JFYWNoKGZ1bmN0aW9uKHByb3ApIHtcbiAgICAgIGlmICghKHByb3AgaW4gQ29uc3RydWN0b3IucHJvdG90eXBlKSkgcmV0dXJuO1xuICAgICAgUHJveHlDbGFzcy5wcm90b3R5cGVbcHJvcF0gPSBmdW5jdGlvbigpIHtcbiAgICAgICAgcmV0dXJuIHByb21pc2lmeUN1cnNvclJlcXVlc3RDYWxsKHRoaXNbdGFyZ2V0UHJvcF0sIHByb3AsIGFyZ3VtZW50cyk7XG4gICAgICB9O1xuICAgIH0pO1xuICB9XG5cbiAgZnVuY3Rpb24gSW5kZXgoaW5kZXgpIHtcbiAgICB0aGlzLl9pbmRleCA9IGluZGV4O1xuICB9XG5cbiAgcHJveHlQcm9wZXJ0aWVzKEluZGV4LCAnX2luZGV4JywgW1xuICAgICduYW1lJyxcbiAgICAna2V5UGF0aCcsXG4gICAgJ211bHRpRW50cnknLFxuICAgICd1bmlxdWUnXG4gIF0pO1xuXG4gIHByb3h5UmVxdWVzdE1ldGhvZHMoSW5kZXgsICdfaW5kZXgnLCBJREJJbmRleCwgW1xuICAgICdnZXQnLFxuICAgICdnZXRLZXknLFxuICAgICdnZXRBbGwnLFxuICAgICdnZXRBbGxLZXlzJyxcbiAgICAnY291bnQnXG4gIF0pO1xuXG4gIHByb3h5Q3Vyc29yUmVxdWVzdE1ldGhvZHMoSW5kZXgsICdfaW5kZXgnLCBJREJJbmRleCwgW1xuICAgICdvcGVuQ3Vyc29yJyxcbiAgICAnb3BlbktleUN1cnNvcidcbiAgXSk7XG5cbiAgZnVuY3Rpb24gQ3Vyc29yKGN1cnNvciwgcmVxdWVzdCkge1xuICAgIHRoaXMuX2N1cnNvciA9IGN1cnNvcjtcbiAgICB0aGlzLl9yZXF1ZXN0ID0gcmVxdWVzdDtcbiAgfVxuXG4gIHByb3h5UHJvcGVydGllcyhDdXJzb3IsICdfY3Vyc29yJywgW1xuICAgICdkaXJlY3Rpb24nLFxuICAgICdrZXknLFxuICAgICdwcmltYXJ5S2V5JyxcbiAgICAndmFsdWUnXG4gIF0pO1xuXG4gIHByb3h5UmVxdWVzdE1ldGhvZHMoQ3Vyc29yLCAnX2N1cnNvcicsIElEQkN1cnNvciwgW1xuICAgICd1cGRhdGUnLFxuICAgICdkZWxldGUnXG4gIF0pO1xuXG4gIC8vIHByb3h5ICduZXh0JyBtZXRob2RzXG4gIFsnYWR2YW5jZScsICdjb250aW51ZScsICdjb250aW51ZVByaW1hcnlLZXknXS5mb3JFYWNoKGZ1bmN0aW9uKG1ldGhvZE5hbWUpIHtcbiAgICBpZiAoIShtZXRob2ROYW1lIGluIElEQkN1cnNvci5wcm90b3R5cGUpKSByZXR1cm47XG4gICAgQ3Vyc29yLnByb3RvdHlwZVttZXRob2ROYW1lXSA9IGZ1bmN0aW9uKCkge1xuICAgICAgdmFyIGN1cnNvciA9IHRoaXM7XG4gICAgICB2YXIgYXJncyA9IGFyZ3VtZW50cztcbiAgICAgIHJldHVybiBQcm9taXNlLnJlc29sdmUoKS50aGVuKGZ1bmN0aW9uKCkge1xuICAgICAgICBjdXJzb3IuX2N1cnNvclttZXRob2ROYW1lXS5hcHBseShjdXJzb3IuX2N1cnNvciwgYXJncyk7XG4gICAgICAgIHJldHVybiBwcm9taXNpZnlSZXF1ZXN0KGN1cnNvci5fcmVxdWVzdCkudGhlbihmdW5jdGlvbih2YWx1ZSkge1xuICAgICAgICAgIGlmICghdmFsdWUpIHJldHVybjtcbiAgICAgICAgICByZXR1cm4gbmV3IEN1cnNvcih2YWx1ZSwgY3Vyc29yLl9yZXF1ZXN0KTtcbiAgICAgICAgfSk7XG4gICAgICB9KTtcbiAgICB9O1xuICB9KTtcblxuICBmdW5jdGlvbiBPYmplY3RTdG9yZShzdG9yZSkge1xuICAgIHRoaXMuX3N0b3JlID0gc3RvcmU7XG4gIH1cblxuICBPYmplY3RTdG9yZS5wcm90b3R5cGUuY3JlYXRlSW5kZXggPSBmdW5jdGlvbigpIHtcbiAgICByZXR1cm4gbmV3IEluZGV4KHRoaXMuX3N0b3JlLmNyZWF0ZUluZGV4LmFwcGx5KHRoaXMuX3N0b3JlLCBhcmd1bWVudHMpKTtcbiAgfTtcblxuICBPYmplY3RTdG9yZS5wcm90b3R5cGUuaW5kZXggPSBmdW5jdGlvbigpIHtcbiAgICByZXR1cm4gbmV3IEluZGV4KHRoaXMuX3N0b3JlLmluZGV4LmFwcGx5KHRoaXMuX3N0b3JlLCBhcmd1bWVudHMpKTtcbiAgfTtcblxuICBwcm94eVByb3BlcnRpZXMoT2JqZWN0U3RvcmUsICdfc3RvcmUnLCBbXG4gICAgJ25hbWUnLFxuICAgICdrZXlQYXRoJyxcbiAgICAnaW5kZXhOYW1lcycsXG4gICAgJ2F1dG9JbmNyZW1lbnQnXG4gIF0pO1xuXG4gIHByb3h5UmVxdWVzdE1ldGhvZHMoT2JqZWN0U3RvcmUsICdfc3RvcmUnLCBJREJPYmplY3RTdG9yZSwgW1xuICAgICdwdXQnLFxuICAgICdhZGQnLFxuICAgICdkZWxldGUnLFxuICAgICdjbGVhcicsXG4gICAgJ2dldCcsXG4gICAgJ2dldEFsbCcsXG4gICAgJ2dldEtleScsXG4gICAgJ2dldEFsbEtleXMnLFxuICAgICdjb3VudCdcbiAgXSk7XG5cbiAgcHJveHlDdXJzb3JSZXF1ZXN0TWV0aG9kcyhPYmplY3RTdG9yZSwgJ19zdG9yZScsIElEQk9iamVjdFN0b3JlLCBbXG4gICAgJ29wZW5DdXJzb3InLFxuICAgICdvcGVuS2V5Q3Vyc29yJ1xuICBdKTtcblxuICBwcm94eU1ldGhvZHMoT2JqZWN0U3RvcmUsICdfc3RvcmUnLCBJREJPYmplY3RTdG9yZSwgW1xuICAgICdkZWxldGVJbmRleCdcbiAgXSk7XG5cbiAgZnVuY3Rpb24gVHJhbnNhY3Rpb24oaWRiVHJhbnNhY3Rpb24pIHtcbiAgICB0aGlzLl90eCA9IGlkYlRyYW5zYWN0aW9uO1xuICAgIHRoaXMuY29tcGxldGUgPSBuZXcgUHJvbWlzZShmdW5jdGlvbihyZXNvbHZlLCByZWplY3QpIHtcbiAgICAgIGlkYlRyYW5zYWN0aW9uLm9uY29tcGxldGUgPSBmdW5jdGlvbigpIHtcbiAgICAgICAgcmVzb2x2ZSgpO1xuICAgICAgfTtcbiAgICAgIGlkYlRyYW5zYWN0aW9uLm9uZXJyb3IgPSBmdW5jdGlvbigpIHtcbiAgICAgICAgcmVqZWN0KGlkYlRyYW5zYWN0aW9uLmVycm9yKTtcbiAgICAgIH07XG4gICAgICBpZGJUcmFuc2FjdGlvbi5vbmFib3J0ID0gZnVuY3Rpb24oKSB7XG4gICAgICAgIHJlamVjdChpZGJUcmFuc2FjdGlvbi5lcnJvcik7XG4gICAgICB9O1xuICAgIH0pO1xuICB9XG5cbiAgVHJhbnNhY3Rpb24ucHJvdG90eXBlLm9iamVjdFN0b3JlID0gZnVuY3Rpb24oKSB7XG4gICAgcmV0dXJuIG5ldyBPYmplY3RTdG9yZSh0aGlzLl90eC5vYmplY3RTdG9yZS5hcHBseSh0aGlzLl90eCwgYXJndW1lbnRzKSk7XG4gIH07XG5cbiAgcHJveHlQcm9wZXJ0aWVzKFRyYW5zYWN0aW9uLCAnX3R4JywgW1xuICAgICdvYmplY3RTdG9yZU5hbWVzJyxcbiAgICAnbW9kZSdcbiAgXSk7XG5cbiAgcHJveHlNZXRob2RzKFRyYW5zYWN0aW9uLCAnX3R4JywgSURCVHJhbnNhY3Rpb24sIFtcbiAgICAnYWJvcnQnXG4gIF0pO1xuXG4gIGZ1bmN0aW9uIFVwZ3JhZGVEQihkYiwgb2xkVmVyc2lvbiwgdHJhbnNhY3Rpb24pIHtcbiAgICB0aGlzLl9kYiA9IGRiO1xuICAgIHRoaXMub2xkVmVyc2lvbiA9IG9sZFZlcnNpb247XG4gICAgdGhpcy50cmFuc2FjdGlvbiA9IG5ldyBUcmFuc2FjdGlvbih0cmFuc2FjdGlvbik7XG4gIH1cblxuICBVcGdyYWRlREIucHJvdG90eXBlLmNyZWF0ZU9iamVjdFN0b3JlID0gZnVuY3Rpb24oKSB7XG4gICAgcmV0dXJuIG5ldyBPYmplY3RTdG9yZSh0aGlzLl9kYi5jcmVhdGVPYmplY3RTdG9yZS5hcHBseSh0aGlzLl9kYiwgYXJndW1lbnRzKSk7XG4gIH07XG5cbiAgcHJveHlQcm9wZXJ0aWVzKFVwZ3JhZGVEQiwgJ19kYicsIFtcbiAgICAnbmFtZScsXG4gICAgJ3ZlcnNpb24nLFxuICAgICdvYmplY3RTdG9yZU5hbWVzJ1xuICBdKTtcblxuICBwcm94eU1ldGhvZHMoVXBncmFkZURCLCAnX2RiJywgSURCRGF0YWJhc2UsIFtcbiAgICAnZGVsZXRlT2JqZWN0U3RvcmUnLFxuICAgICdjbG9zZSdcbiAgXSk7XG5cbiAgZnVuY3Rpb24gREIoZGIpIHtcbiAgICB0aGlzLl9kYiA9IGRiO1xuICB9XG5cbiAgREIucHJvdG90eXBlLnRyYW5zYWN0aW9uID0gZnVuY3Rpb24oKSB7XG4gICAgcmV0dXJuIG5ldyBUcmFuc2FjdGlvbih0aGlzLl9kYi50cmFuc2FjdGlvbi5hcHBseSh0aGlzLl9kYiwgYXJndW1lbnRzKSk7XG4gIH07XG5cbiAgcHJveHlQcm9wZXJ0aWVzKERCLCAnX2RiJywgW1xuICAgICduYW1lJyxcbiAgICAndmVyc2lvbicsXG4gICAgJ29iamVjdFN0b3JlTmFtZXMnXG4gIF0pO1xuXG4gIHByb3h5TWV0aG9kcyhEQiwgJ19kYicsIElEQkRhdGFiYXNlLCBbXG4gICAgJ2Nsb3NlJ1xuICBdKTtcblxuICAvLyBBZGQgY3Vyc29yIGl0ZXJhdG9yc1xuICAvLyBUT0RPOiByZW1vdmUgdGhpcyBvbmNlIGJyb3dzZXJzIGRvIHRoZSByaWdodCB0aGluZyB3aXRoIHByb21pc2VzXG4gIFsnb3BlbkN1cnNvcicsICdvcGVuS2V5Q3Vyc29yJ10uZm9yRWFjaChmdW5jdGlvbihmdW5jTmFtZSkge1xuICAgIFtPYmplY3RTdG9yZSwgSW5kZXhdLmZvckVhY2goZnVuY3Rpb24oQ29uc3RydWN0b3IpIHtcbiAgICAgIENvbnN0cnVjdG9yLnByb3RvdHlwZVtmdW5jTmFtZS5yZXBsYWNlKCdvcGVuJywgJ2l0ZXJhdGUnKV0gPSBmdW5jdGlvbigpIHtcbiAgICAgICAgdmFyIGFyZ3MgPSB0b0FycmF5KGFyZ3VtZW50cyk7XG4gICAgICAgIHZhciBjYWxsYmFjayA9IGFyZ3NbYXJncy5sZW5ndGggLSAxXTtcbiAgICAgICAgdmFyIG5hdGl2ZU9iamVjdCA9IHRoaXMuX3N0b3JlIHx8IHRoaXMuX2luZGV4O1xuICAgICAgICB2YXIgcmVxdWVzdCA9IG5hdGl2ZU9iamVjdFtmdW5jTmFtZV0uYXBwbHkobmF0aXZlT2JqZWN0LCBhcmdzLnNsaWNlKDAsIC0xKSk7XG4gICAgICAgIHJlcXVlc3Qub25zdWNjZXNzID0gZnVuY3Rpb24oKSB7XG4gICAgICAgICAgY2FsbGJhY2socmVxdWVzdC5yZXN1bHQpO1xuICAgICAgICB9O1xuICAgICAgfTtcbiAgICB9KTtcbiAgfSk7XG5cbiAgLy8gcG9seWZpbGwgZ2V0QWxsXG4gIFtJbmRleCwgT2JqZWN0U3RvcmVdLmZvckVhY2goZnVuY3Rpb24oQ29uc3RydWN0b3IpIHtcbiAgICBpZiAoQ29uc3RydWN0b3IucHJvdG90eXBlLmdldEFsbCkgcmV0dXJuO1xuICAgIENvbnN0cnVjdG9yLnByb3RvdHlwZS5nZXRBbGwgPSBmdW5jdGlvbihxdWVyeSwgY291bnQpIHtcbiAgICAgIHZhciBpbnN0YW5jZSA9IHRoaXM7XG4gICAgICB2YXIgaXRlbXMgPSBbXTtcblxuICAgICAgcmV0dXJuIG5ldyBQcm9taXNlKGZ1bmN0aW9uKHJlc29sdmUpIHtcbiAgICAgICAgaW5zdGFuY2UuaXRlcmF0ZUN1cnNvcihxdWVyeSwgZnVuY3Rpb24oY3Vyc29yKSB7XG4gICAgICAgICAgaWYgKCFjdXJzb3IpIHtcbiAgICAgICAgICAgIHJlc29sdmUoaXRlbXMpO1xuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICAgIH1cbiAgICAgICAgICBpdGVtcy5wdXNoKGN1cnNvci52YWx1ZSk7XG5cbiAgICAgICAgICBpZiAoY291bnQgIT09IHVuZGVmaW5lZCAmJiBpdGVtcy5sZW5ndGggPT0gY291bnQpIHtcbiAgICAgICAgICAgIHJlc29sdmUoaXRlbXMpO1xuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICAgIH1cbiAgICAgICAgICBjdXJzb3IuY29udGludWUoKTtcbiAgICAgICAgfSk7XG4gICAgICB9KTtcbiAgICB9O1xuICB9KTtcblxuICB2YXIgZXhwID0ge1xuICAgIG9wZW46IGZ1bmN0aW9uKG5hbWUsIHZlcnNpb24sIHVwZ3JhZGVDYWxsYmFjaykge1xuICAgICAgdmFyIHAgPSBwcm9taXNpZnlSZXF1ZXN0Q2FsbChpbmRleGVkREIsICdvcGVuJywgW25hbWUsIHZlcnNpb25dKTtcbiAgICAgIHZhciByZXF1ZXN0ID0gcC5yZXF1ZXN0O1xuXG4gICAgICByZXF1ZXN0Lm9udXBncmFkZW5lZWRlZCA9IGZ1bmN0aW9uKGV2ZW50KSB7XG4gICAgICAgIGlmICh1cGdyYWRlQ2FsbGJhY2spIHtcbiAgICAgICAgICB1cGdyYWRlQ2FsbGJhY2sobmV3IFVwZ3JhZGVEQihyZXF1ZXN0LnJlc3VsdCwgZXZlbnQub2xkVmVyc2lvbiwgcmVxdWVzdC50cmFuc2FjdGlvbikpO1xuICAgICAgICB9XG4gICAgICB9O1xuXG4gICAgICByZXR1cm4gcC50aGVuKGZ1bmN0aW9uKGRiKSB7XG4gICAgICAgIHJldHVybiBuZXcgREIoZGIpO1xuICAgICAgfSk7XG4gICAgfSxcbiAgICBkZWxldGU6IGZ1bmN0aW9uKG5hbWUpIHtcbiAgICAgIHJldHVybiBwcm9taXNpZnlSZXF1ZXN0Q2FsbChpbmRleGVkREIsICdkZWxldGVEYXRhYmFzZScsIFtuYW1lXSk7XG4gICAgfVxuICB9O1xuXG4gIGlmICh0eXBlb2YgbW9kdWxlICE9PSAndW5kZWZpbmVkJykge1xuICAgIG1vZHVsZS5leHBvcnRzID0gZXhwO1xuICB9XG4gIGVsc2Uge1xuICAgIHNlbGYuaWRiID0gZXhwO1xuICB9XG59KCkpO1xuIiwiLy8gc2hpbSBmb3IgdXNpbmcgcHJvY2VzcyBpbiBicm93c2VyXG52YXIgcHJvY2VzcyA9IG1vZHVsZS5leHBvcnRzID0ge307XG5cbi8vIGNhY2hlZCBmcm9tIHdoYXRldmVyIGdsb2JhbCBpcyBwcmVzZW50IHNvIHRoYXQgdGVzdCBydW5uZXJzIHRoYXQgc3R1YiBpdFxuLy8gZG9uJ3QgYnJlYWsgdGhpbmdzLiAgQnV0IHdlIG5lZWQgdG8gd3JhcCBpdCBpbiBhIHRyeSBjYXRjaCBpbiBjYXNlIGl0IGlzXG4vLyB3cmFwcGVkIGluIHN0cmljdCBtb2RlIGNvZGUgd2hpY2ggZG9lc24ndCBkZWZpbmUgYW55IGdsb2JhbHMuICBJdCdzIGluc2lkZSBhXG4vLyBmdW5jdGlvbiBiZWNhdXNlIHRyeS9jYXRjaGVzIGRlb3B0aW1pemUgaW4gY2VydGFpbiBlbmdpbmVzLlxuXG52YXIgY2FjaGVkU2V0VGltZW91dDtcbnZhciBjYWNoZWRDbGVhclRpbWVvdXQ7XG5cbmZ1bmN0aW9uIGRlZmF1bHRTZXRUaW1vdXQoKSB7XG4gICAgdGhyb3cgbmV3IEVycm9yKCdzZXRUaW1lb3V0IGhhcyBub3QgYmVlbiBkZWZpbmVkJyk7XG59XG5mdW5jdGlvbiBkZWZhdWx0Q2xlYXJUaW1lb3V0ICgpIHtcbiAgICB0aHJvdyBuZXcgRXJyb3IoJ2NsZWFyVGltZW91dCBoYXMgbm90IGJlZW4gZGVmaW5lZCcpO1xufVxuKGZ1bmN0aW9uICgpIHtcbiAgICB0cnkge1xuICAgICAgICBpZiAodHlwZW9mIHNldFRpbWVvdXQgPT09ICdmdW5jdGlvbicpIHtcbiAgICAgICAgICAgIGNhY2hlZFNldFRpbWVvdXQgPSBzZXRUaW1lb3V0O1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgY2FjaGVkU2V0VGltZW91dCA9IGRlZmF1bHRTZXRUaW1vdXQ7XG4gICAgICAgIH1cbiAgICB9IGNhdGNoIChlKSB7XG4gICAgICAgIGNhY2hlZFNldFRpbWVvdXQgPSBkZWZhdWx0U2V0VGltb3V0O1xuICAgIH1cbiAgICB0cnkge1xuICAgICAgICBpZiAodHlwZW9mIGNsZWFyVGltZW91dCA9PT0gJ2Z1bmN0aW9uJykge1xuICAgICAgICAgICAgY2FjaGVkQ2xlYXJUaW1lb3V0ID0gY2xlYXJUaW1lb3V0O1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgY2FjaGVkQ2xlYXJUaW1lb3V0ID0gZGVmYXVsdENsZWFyVGltZW91dDtcbiAgICAgICAgfVxuICAgIH0gY2F0Y2ggKGUpIHtcbiAgICAgICAgY2FjaGVkQ2xlYXJUaW1lb3V0ID0gZGVmYXVsdENsZWFyVGltZW91dDtcbiAgICB9XG59ICgpKVxuZnVuY3Rpb24gcnVuVGltZW91dChmdW4pIHtcbiAgICBpZiAoY2FjaGVkU2V0VGltZW91dCA9PT0gc2V0VGltZW91dCkge1xuICAgICAgICAvL25vcm1hbCBlbnZpcm9tZW50cyBpbiBzYW5lIHNpdHVhdGlvbnNcbiAgICAgICAgcmV0dXJuIHNldFRpbWVvdXQoZnVuLCAwKTtcbiAgICB9XG4gICAgLy8gaWYgc2V0VGltZW91dCB3YXNuJ3QgYXZhaWxhYmxlIGJ1dCB3YXMgbGF0dGVyIGRlZmluZWRcbiAgICBpZiAoKGNhY2hlZFNldFRpbWVvdXQgPT09IGRlZmF1bHRTZXRUaW1vdXQgfHwgIWNhY2hlZFNldFRpbWVvdXQpICYmIHNldFRpbWVvdXQpIHtcbiAgICAgICAgY2FjaGVkU2V0VGltZW91dCA9IHNldFRpbWVvdXQ7XG4gICAgICAgIHJldHVybiBzZXRUaW1lb3V0KGZ1biwgMCk7XG4gICAgfVxuICAgIHRyeSB7XG4gICAgICAgIC8vIHdoZW4gd2hlbiBzb21lYm9keSBoYXMgc2NyZXdlZCB3aXRoIHNldFRpbWVvdXQgYnV0IG5vIEkuRS4gbWFkZG5lc3NcbiAgICAgICAgcmV0dXJuIGNhY2hlZFNldFRpbWVvdXQoZnVuLCAwKTtcbiAgICB9IGNhdGNoKGUpe1xuICAgICAgICB0cnkge1xuICAgICAgICAgICAgLy8gV2hlbiB3ZSBhcmUgaW4gSS5FLiBidXQgdGhlIHNjcmlwdCBoYXMgYmVlbiBldmFsZWQgc28gSS5FLiBkb2Vzbid0IHRydXN0IHRoZSBnbG9iYWwgb2JqZWN0IHdoZW4gY2FsbGVkIG5vcm1hbGx5XG4gICAgICAgICAgICByZXR1cm4gY2FjaGVkU2V0VGltZW91dC5jYWxsKG51bGwsIGZ1biwgMCk7XG4gICAgICAgIH0gY2F0Y2goZSl7XG4gICAgICAgICAgICAvLyBzYW1lIGFzIGFib3ZlIGJ1dCB3aGVuIGl0J3MgYSB2ZXJzaW9uIG9mIEkuRS4gdGhhdCBtdXN0IGhhdmUgdGhlIGdsb2JhbCBvYmplY3QgZm9yICd0aGlzJywgaG9wZnVsbHkgb3VyIGNvbnRleHQgY29ycmVjdCBvdGhlcndpc2UgaXQgd2lsbCB0aHJvdyBhIGdsb2JhbCBlcnJvclxuICAgICAgICAgICAgcmV0dXJuIGNhY2hlZFNldFRpbWVvdXQuY2FsbCh0aGlzLCBmdW4sIDApO1xuICAgICAgICB9XG4gICAgfVxuXG5cbn1cbmZ1bmN0aW9uIHJ1bkNsZWFyVGltZW91dChtYXJrZXIpIHtcbiAgICBpZiAoY2FjaGVkQ2xlYXJUaW1lb3V0ID09PSBjbGVhclRpbWVvdXQpIHtcbiAgICAgICAgLy9ub3JtYWwgZW52aXJvbWVudHMgaW4gc2FuZSBzaXR1YXRpb25zXG4gICAgICAgIHJldHVybiBjbGVhclRpbWVvdXQobWFya2VyKTtcbiAgICB9XG4gICAgLy8gaWYgY2xlYXJUaW1lb3V0IHdhc24ndCBhdmFpbGFibGUgYnV0IHdhcyBsYXR0ZXIgZGVmaW5lZFxuICAgIGlmICgoY2FjaGVkQ2xlYXJUaW1lb3V0ID09PSBkZWZhdWx0Q2xlYXJUaW1lb3V0IHx8ICFjYWNoZWRDbGVhclRpbWVvdXQpICYmIGNsZWFyVGltZW91dCkge1xuICAgICAgICBjYWNoZWRDbGVhclRpbWVvdXQgPSBjbGVhclRpbWVvdXQ7XG4gICAgICAgIHJldHVybiBjbGVhclRpbWVvdXQobWFya2VyKTtcbiAgICB9XG4gICAgdHJ5IHtcbiAgICAgICAgLy8gd2hlbiB3aGVuIHNvbWVib2R5IGhhcyBzY3Jld2VkIHdpdGggc2V0VGltZW91dCBidXQgbm8gSS5FLiBtYWRkbmVzc1xuICAgICAgICByZXR1cm4gY2FjaGVkQ2xlYXJUaW1lb3V0KG1hcmtlcik7XG4gICAgfSBjYXRjaCAoZSl7XG4gICAgICAgIHRyeSB7XG4gICAgICAgICAgICAvLyBXaGVuIHdlIGFyZSBpbiBJLkUuIGJ1dCB0aGUgc2NyaXB0IGhhcyBiZWVuIGV2YWxlZCBzbyBJLkUuIGRvZXNuJ3QgIHRydXN0IHRoZSBnbG9iYWwgb2JqZWN0IHdoZW4gY2FsbGVkIG5vcm1hbGx5XG4gICAgICAgICAgICByZXR1cm4gY2FjaGVkQ2xlYXJUaW1lb3V0LmNhbGwobnVsbCwgbWFya2VyKTtcbiAgICAgICAgfSBjYXRjaCAoZSl7XG4gICAgICAgICAgICAvLyBzYW1lIGFzIGFib3ZlIGJ1dCB3aGVuIGl0J3MgYSB2ZXJzaW9uIG9mIEkuRS4gdGhhdCBtdXN0IGhhdmUgdGhlIGdsb2JhbCBvYmplY3QgZm9yICd0aGlzJywgaG9wZnVsbHkgb3VyIGNvbnRleHQgY29ycmVjdCBvdGhlcndpc2UgaXQgd2lsbCB0aHJvdyBhIGdsb2JhbCBlcnJvci5cbiAgICAgICAgICAgIC8vIFNvbWUgdmVyc2lvbnMgb2YgSS5FLiBoYXZlIGRpZmZlcmVudCBydWxlcyBmb3IgY2xlYXJUaW1lb3V0IHZzIHNldFRpbWVvdXRcbiAgICAgICAgICAgIHJldHVybiBjYWNoZWRDbGVhclRpbWVvdXQuY2FsbCh0aGlzLCBtYXJrZXIpO1xuICAgICAgICB9XG4gICAgfVxuXG5cblxufVxudmFyIHF1ZXVlID0gW107XG52YXIgZHJhaW5pbmcgPSBmYWxzZTtcbnZhciBjdXJyZW50UXVldWU7XG52YXIgcXVldWVJbmRleCA9IC0xO1xuXG5mdW5jdGlvbiBjbGVhblVwTmV4dFRpY2soKSB7XG4gICAgaWYgKCFkcmFpbmluZyB8fCAhY3VycmVudFF1ZXVlKSB7XG4gICAgICAgIHJldHVybjtcbiAgICB9XG4gICAgZHJhaW5pbmcgPSBmYWxzZTtcbiAgICBpZiAoY3VycmVudFF1ZXVlLmxlbmd0aCkge1xuICAgICAgICBxdWV1ZSA9IGN1cnJlbnRRdWV1ZS5jb25jYXQocXVldWUpO1xuICAgIH0gZWxzZSB7XG4gICAgICAgIHF1ZXVlSW5kZXggPSAtMTtcbiAgICB9XG4gICAgaWYgKHF1ZXVlLmxlbmd0aCkge1xuICAgICAgICBkcmFpblF1ZXVlKCk7XG4gICAgfVxufVxuXG5mdW5jdGlvbiBkcmFpblF1ZXVlKCkge1xuICAgIGlmIChkcmFpbmluZykge1xuICAgICAgICByZXR1cm47XG4gICAgfVxuICAgIHZhciB0aW1lb3V0ID0gcnVuVGltZW91dChjbGVhblVwTmV4dFRpY2spO1xuICAgIGRyYWluaW5nID0gdHJ1ZTtcblxuICAgIHZhciBsZW4gPSBxdWV1ZS5sZW5ndGg7XG4gICAgd2hpbGUobGVuKSB7XG4gICAgICAgIGN1cnJlbnRRdWV1ZSA9IHF1ZXVlO1xuICAgICAgICBxdWV1ZSA9IFtdO1xuICAgICAgICB3aGlsZSAoKytxdWV1ZUluZGV4IDwgbGVuKSB7XG4gICAgICAgICAgICBpZiAoY3VycmVudFF1ZXVlKSB7XG4gICAgICAgICAgICAgICAgY3VycmVudFF1ZXVlW3F1ZXVlSW5kZXhdLnJ1bigpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIHF1ZXVlSW5kZXggPSAtMTtcbiAgICAgICAgbGVuID0gcXVldWUubGVuZ3RoO1xuICAgIH1cbiAgICBjdXJyZW50UXVldWUgPSBudWxsO1xuICAgIGRyYWluaW5nID0gZmFsc2U7XG4gICAgcnVuQ2xlYXJUaW1lb3V0KHRpbWVvdXQpO1xufVxuXG5wcm9jZXNzLm5leHRUaWNrID0gZnVuY3Rpb24gKGZ1bikge1xuICAgIHZhciBhcmdzID0gbmV3IEFycmF5KGFyZ3VtZW50cy5sZW5ndGggLSAxKTtcbiAgICBpZiAoYXJndW1lbnRzLmxlbmd0aCA+IDEpIHtcbiAgICAgICAgZm9yICh2YXIgaSA9IDE7IGkgPCBhcmd1bWVudHMubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgICAgIGFyZ3NbaSAtIDFdID0gYXJndW1lbnRzW2ldO1xuICAgICAgICB9XG4gICAgfVxuICAgIHF1ZXVlLnB1c2gobmV3IEl0ZW0oZnVuLCBhcmdzKSk7XG4gICAgaWYgKHF1ZXVlLmxlbmd0aCA9PT0gMSAmJiAhZHJhaW5pbmcpIHtcbiAgICAgICAgcnVuVGltZW91dChkcmFpblF1ZXVlKTtcbiAgICB9XG59O1xuXG4vLyB2OCBsaWtlcyBwcmVkaWN0aWJsZSBvYmplY3RzXG5mdW5jdGlvbiBJdGVtKGZ1biwgYXJyYXkpIHtcbiAgICB0aGlzLmZ1biA9IGZ1bjtcbiAgICB0aGlzLmFycmF5ID0gYXJyYXk7XG59XG5JdGVtLnByb3RvdHlwZS5ydW4gPSBmdW5jdGlvbiAoKSB7XG4gICAgdGhpcy5mdW4uYXBwbHkobnVsbCwgdGhpcy5hcnJheSk7XG59O1xucHJvY2Vzcy50aXRsZSA9ICdicm93c2VyJztcbnByb2Nlc3MuYnJvd3NlciA9IHRydWU7XG5wcm9jZXNzLmVudiA9IHt9O1xucHJvY2Vzcy5hcmd2ID0gW107XG5wcm9jZXNzLnZlcnNpb24gPSAnJzsgLy8gZW1wdHkgc3RyaW5nIHRvIGF2b2lkIHJlZ2V4cCBpc3N1ZXNcbnByb2Nlc3MudmVyc2lvbnMgPSB7fTtcblxuZnVuY3Rpb24gbm9vcCgpIHt9XG5cbnByb2Nlc3Mub24gPSBub29wO1xucHJvY2Vzcy5hZGRMaXN0ZW5lciA9IG5vb3A7XG5wcm9jZXNzLm9uY2UgPSBub29wO1xucHJvY2Vzcy5vZmYgPSBub29wO1xucHJvY2Vzcy5yZW1vdmVMaXN0ZW5lciA9IG5vb3A7XG5wcm9jZXNzLnJlbW92ZUFsbExpc3RlbmVycyA9IG5vb3A7XG5wcm9jZXNzLmVtaXQgPSBub29wO1xuXG5wcm9jZXNzLmJpbmRpbmcgPSBmdW5jdGlvbiAobmFtZSkge1xuICAgIHRocm93IG5ldyBFcnJvcigncHJvY2Vzcy5iaW5kaW5nIGlzIG5vdCBzdXBwb3J0ZWQnKTtcbn07XG5cbnByb2Nlc3MuY3dkID0gZnVuY3Rpb24gKCkgeyByZXR1cm4gJy8nIH07XG5wcm9jZXNzLmNoZGlyID0gZnVuY3Rpb24gKGRpcikge1xuICAgIHRocm93IG5ldyBFcnJvcigncHJvY2Vzcy5jaGRpciBpcyBub3Qgc3VwcG9ydGVkJyk7XG59O1xucHJvY2Vzcy51bWFzayA9IGZ1bmN0aW9uKCkgeyByZXR1cm4gMDsgfTtcbiIsIi8qKlxyXG4gKiBBbiBpbmRleGVkIGRiIGFkYXB0b3JcclxuICovXHJcblxyXG52YXIgaWRiID0gcmVxdWlyZShcImlkYlwiKTtcclxuXHJcbmNvbnN0IFZBTElEX1NUT1JFUyA9IFtcImFzc2lnbm1lbnRzXCIsIFwic3luYy1zdG9yZVwiXTtcclxuXHJcbi8vIG9wZW4vc2V0dXAgdGhlIGRhdGFiYXNlXHJcbnZhciBkYlByb21pc2UgPSBpZGIub3BlbihcImRhdGEtc3RvcmVzXCIsIDMsIGRiID0+IHtcclxuXHQvLyB1cGdyYWRlIG9yIGNyZWF0ZSB0aGUgZGJcclxuXHRpZihkYi5vbGRWZXJzaW9uIDwgMSlcclxuXHRcdGRiLmNyZWF0ZU9iamVjdFN0b3JlKFwiYXNzaWdubWVudHNcIiwgeyBrZXlQYXRoOiBcImlkXCIgfSk7XHJcblx0aWYoZGIub2xkVmVyc2lvbiA8IDIpXHJcblx0XHRkYi5jcmVhdGVPYmplY3RTdG9yZShcInN5bmMtc3RvcmVcIiwgeyBrZXlQYXRoOiBcImlkXCIgfSk7XHJcblxyXG5cdC8vIHRoZSB2ZXJzaW9uIDIgc3luYy1zdG9yZSBoYWQgYSBkaWZmZXJlbnQgc3RydWN0dXJlIHRoYXQgdGhlIHZlcnNpb24gM1xyXG5cdGlmKGRiLm9sZFZlcnNpb24gPT0gMikge1xyXG5cdFx0ZGIuZGVsZXRlT2JqZWN0U3RvcmUoXCJzeW5jLXN0b3JlXCIpO1xyXG5cdFx0ZGIuY3JlYXRlT2JqZWN0U3RvcmUoXCJzeW5jLXN0b3JlXCIsIHsga2V5UGF0aDogXCJpZFwiIH0pO1xyXG5cdH1cclxufSk7XHJcblxyXG5jbGFzcyBJZGJBZGFwdG9yIHtcclxuXHRjb25zdHJ1Y3RvcihuYW1lKSB7XHJcblx0XHR0aGlzLm5hbWUgPSBuYW1lO1xyXG5cclxuXHRcdC8vIGNoZWNrIHRoZSBzdG9yZSBpcyB2YWxpZFxyXG5cdFx0aWYoVkFMSURfU1RPUkVTLmluZGV4T2YobmFtZSkgPT09IC0xKSB7XHJcblx0XHRcdHRocm93IG5ldyBFcnJvcihgVGhlIGRhdGEgc3RvcmUgJHtuYW1lfSBpcyBub3QgaW4gaWRiIHVwZGF0ZSB0aGUgZGJgKTtcclxuXHRcdH1cclxuXHR9XHJcblxyXG5cdC8vIGNyZWF0ZSBhIHRyYW5zYWN0aW9uXHJcblx0X3RyYW5zYWN0aW9uKHJlYWRXcml0ZSkge1xyXG5cdFx0cmV0dXJuIGRiUHJvbWlzZS50aGVuKGRiID0+IHtcclxuXHRcdFx0cmV0dXJuIGRiXHJcblx0XHRcdFx0LnRyYW5zYWN0aW9uKHRoaXMubmFtZSwgcmVhZFdyaXRlICYmIFwicmVhZHdyaXRlXCIpXHJcblx0XHRcdFx0Lm9iamVjdFN0b3JlKHRoaXMubmFtZSk7XHJcblx0XHR9KTtcclxuXHR9XHJcblxyXG5cdC8qKlxyXG5cdCAqIEdldCBhbGwgdGhlIHZhbHVlcyBpbiB0aGUgb2JqZWN0IHN0b3JlXHJcblx0ICovXHJcblx0Z2V0QWxsKCkge1xyXG5cdFx0cmV0dXJuIHRoaXMuX3RyYW5zYWN0aW9uKClcclxuXHRcdFx0LnRoZW4odHJhbnMgPT4gdHJhbnMuZ2V0QWxsKCkpO1xyXG5cdH1cclxuXHJcblx0LyoqXHJcblx0ICogR2V0IGEgc3BlY2lmaWMgdmFsdWVcclxuXHQgKi9cclxuXHRnZXQoa2V5KSB7XHJcblx0XHRyZXR1cm4gdGhpcy5fdHJhbnNhY3Rpb24oKVxyXG5cdFx0XHQudGhlbih0cmFucyA9PiB0cmFucy5nZXQoa2V5KSk7XHJcblx0fVxyXG5cclxuXHQvKipcclxuXHQgKiBTdG9yZSBhIHZhbHVlIGluIGlkYlxyXG5cdCAqL1xyXG5cdHNldCh2YWx1ZSkge1xyXG5cdFx0cmV0dXJuIHRoaXMuX3RyYW5zYWN0aW9uKHRydWUpXHJcblx0XHRcdC50aGVuKHRyYW5zID0+IHRyYW5zLnB1dCh2YWx1ZSkpO1xyXG5cdH1cclxuXHJcblx0LyoqXHJcblx0ICogUmVtb3ZlIGEgdmFsdWUgZnJvbSBpZGJcclxuXHQgKi9cclxuXHRyZW1vdmUoa2V5KSB7XHJcblx0XHRyZXR1cm4gdGhpcy5fdHJhbnNhY3Rpb24odHJ1ZSlcclxuXHRcdFx0LnRoZW4odHJhbnMgPT4gdHJhbnMuZGVsZXRlKGtleSkpO1xyXG5cdH1cclxufVxyXG5cclxubW9kdWxlLmV4cG9ydHMgPSBJZGJBZGFwdG9yO1xyXG4iLCIvKipcclxuICogSW5zdGFudGlhdGUgYWxsIHRoZSBkYXRhIHN0b3Jlc1xyXG4gKi9cclxuXHJcbnZhciBIdHRwQWRhcHRvciA9IHJlcXVpcmUoXCIuLi8uLi9jb21tb24vZGF0YS1zdG9yZXMvaHR0cC1hZGFwdG9yXCIpO1xyXG52YXIgUG9vbFN0b3JlID0gcmVxdWlyZShcIi4uLy4uL2NvbW1vbi9kYXRhLXN0b3Jlcy9wb29sLXN0b3JlXCIpO1xyXG52YXIgU3luY2VyID0gcmVxdWlyZShcIi4uLy4uL2NvbW1vbi9kYXRhLXN0b3Jlcy9zeW5jZXJcIik7XHJcbnZhciBJZGJBZGFwdG9yID0gcmVxdWlyZShcIi4vaWRiLWFkYXB0b3JcIik7XHJcblxyXG52YXIgaW5pdEl0ZW0gPSBpdGVtID0+IHtcclxuXHQvLyBpbnN0YW50aWF0ZSB0aGUgZGF0ZVxyXG5cdGlmKGl0ZW0uZGF0ZSkge1xyXG5cdFx0aXRlbS5kYXRlID0gbmV3IERhdGUoaXRlbS5kYXRlKTtcclxuXHR9XHJcbn07XHJcblxyXG4vLyBjcmVhdGUgYSBzeW5jZXJcclxudmFyIGFzc2lnbm1lbnRzQWRhcHRvciA9IG5ldyBTeW5jZXIoe1xyXG5cdHJlbW90ZTogbmV3IEh0dHBBZGFwdG9yKFwiL2FwaS9kYXRhL1wiKSxcclxuXHRsb2NhbDogbmV3IElkYkFkYXB0b3IoXCJhc3NpZ25tZW50c1wiKSxcclxuXHRjaGFuZ2VTdG9yZTogbmV3IElkYkFkYXB0b3IoXCJzeW5jLXN0b3JlXCIpXHJcbn0pO1xyXG5cclxuZXhwb3J0cy5hc3NpZ25tZW50cyA9IG5ldyBQb29sU3RvcmUoYXNzaWdubWVudHNBZGFwdG9yLCBpbml0SXRlbSk7XHJcblxyXG4vLyBjaGVjayBvdXIgYWNjZXNzIGxldmVsXHJcbmFzc2lnbm1lbnRzQWRhcHRvci5hY2Nlc3NMZXZlbCgpXHJcblxyXG4udGhlbihsZXZlbCA9PiB7XHJcblx0Ly8gd2UgYXJlIGxvZ2dlZCBvdXRcclxuXHRpZihsZXZlbCA9PSBcIm5vbmVcIikge1xyXG5cdFx0bGlmZUxpbmUubmF2Lm5hdmlnYXRlKFwiL2xvZ2luXCIpO1xyXG5cdH1cclxufSk7XHJcblxyXG4vLyB0cmlnZ2VyIGEgc3luY1xyXG5saWZlTGluZS5zeW5jID0gZnVuY3Rpb24oKSB7XHJcblx0Ly8gdHJpZ2dlciBhIHN5bmNcclxuXHRyZXR1cm4gYXNzaWdubWVudHNBZGFwdG9yLnN5bmMoKVxyXG5cclxuXHQvLyBmb3JjZSBhIHJlZmVzaFxyXG5cdC50aGVuKCgpID0+IGxpZmVMaW5lLm5hdi5uYXZpZ2F0ZShsb2NhdGlvbi5wYXRobmFtZSkpO1xyXG59O1xyXG5cclxuaWYodHlwZW9mIHdpbmRvdyA9PSBcIm9iamVjdFwiKSB7XHJcblx0Ly8gaW5pdGlhbCBzeW5jXHJcblx0bGlmZUxpbmUuc3luYygpO1xyXG5cclxuXHQvLyBzeW5jIHdoZW4gd2UgcmV2aXNpdCB0aGUgcGFnZVxyXG5cdHdpbmRvdy5hZGRFdmVudExpc3RlbmVyKFwidmlzaWJpbGl0eWNoYW5nZVwiLCAoKSA9PiB7XHJcblx0XHRpZighZG9jdW1lbnQuaGlkZGVuKSB7XHJcblx0XHRcdGxpZmVMaW5lLnN5bmMoKTtcclxuXHRcdH1cclxuXHR9KTtcclxufVxyXG4iLCIvKipcclxuICogQnJvd3NlciBzcGVjaWZpYyBnbG9iYWxzXHJcbiAqL1xyXG5cclxubGlmZUxpbmUubWFrZURvbSA9IHJlcXVpcmUoXCIuL3V0aWwvZG9tLW1ha2VyXCIpO1xyXG5cclxuLy8gYWRkIGEgZnVuY3Rpb24gZm9yIGFkZGluZyBhY3Rpb25zXHJcbmxpZmVMaW5lLmFkZEFjdGlvbiA9IGZ1bmN0aW9uKG5hbWUsIGZuKSB7XHJcblx0Ly8gYXR0YWNoIHRoZSBjYWxsYmFja1xyXG5cdHZhciBsaXN0ZW5lciA9IGxpZmVMaW5lLm9uKFwiYWN0aW9uLWV4ZWMtXCIgKyBuYW1lLCBmbik7XHJcblxyXG5cdC8vIGluZm9ybSBhbnkgYWN0aW9uIHByb3ZpZGVyc1xyXG5cdGxpZmVMaW5lLmVtaXQoXCJhY3Rpb24tY3JlYXRlXCIsIG5hbWUpO1xyXG5cclxuXHQvLyBhbGwgYWN0aW9ucyByZW1vdmVkXHJcblx0dmFyIHJlbW92ZUFsbCA9IGxpZmVMaW5lLm9uKFwiYWN0aW9uLXJlbW92ZS1hbGxcIiwgKCkgPT4ge1xyXG5cdFx0Ly8gcmVtb3ZlIHRoZSBhY3Rpb24gbGlzdGVuZXJcclxuXHRcdGxpc3RlbmVyLnVuc3Vic2NyaWJlKCk7XHJcblx0XHRyZW1vdmVBbGwudW5zdWJzY3JpYmUoKTtcclxuXHR9KTtcclxuXHJcblx0cmV0dXJuIHtcclxuXHRcdHVuc3Vic2NyaWJlKCkge1xyXG5cdFx0XHQvLyByZW1vdmUgdGhlIGFjdGlvbiBsaXN0ZW5lclxyXG5cdFx0XHRsaXN0ZW5lci51bnN1YnNjcmliZSgpO1xyXG5cdFx0XHRyZW1vdmVBbGwudW5zdWJzY3JpYmUoKTtcclxuXHJcblx0XHRcdC8vIGluZm9ybSBhbnkgYWN0aW9uIHByb3ZpZGVyc1xyXG5cdFx0XHRsaWZlTGluZS5lbWl0KFwiYWN0aW9uLXJlbW92ZVwiLCBuYW1lKTtcclxuXHRcdH1cclxuXHR9O1xyXG59O1xyXG4iLCIvLyBjcmVhdGUgdGhlIGdsb2JhbCBvYmplY3RcclxucmVxdWlyZShcIi4uL2NvbW1vbi9nbG9iYWxcIik7XHJcbnJlcXVpcmUoXCIuL2dsb2JhbFwiKTtcclxuXHJcbi8vIGxvYWQgYWxsIHRoZSB3aWRnZXRzXHJcbnJlcXVpcmUoXCIuL3dpZGdldHMvc2lkZWJhclwiKTtcclxucmVxdWlyZShcIi4vd2lkZ2V0cy9jb250ZW50XCIpO1xyXG5yZXF1aXJlKFwiLi93aWRnZXRzL2xpbmtcIik7XHJcbnJlcXVpcmUoXCIuL3dpZGdldHMvbGlzdFwiKTtcclxucmVxdWlyZShcIi4vd2lkZ2V0cy9pbnB1dFwiKTtcclxucmVxdWlyZShcIi4vd2lkZ2V0cy90b2dnbGUtYnRuc1wiKTtcclxuXHJcbi8vIGxvYWQgYWxsIHRoZSB2aWV3c1xyXG52YXIge2luaXROYXZCYXJ9ID0gcmVxdWlyZShcIi4vdmlld3MvbGlzdHNcIik7XHJcbnJlcXVpcmUoXCIuL3ZpZXdzL2l0ZW1cIik7XHJcbnJlcXVpcmUoXCIuL3ZpZXdzL2VkaXRcIik7XHJcbnJlcXVpcmUoXCIuL3ZpZXdzL2xvZ2luXCIpO1xyXG5yZXF1aXJlKFwiLi92aWV3cy9hY2NvdW50XCIpO1xyXG5yZXF1aXJlKFwiLi92aWV3cy91c2Vyc1wiKTtcclxucmVxdWlyZShcIi4vdmlld3MvdG9kb1wiKTtcclxuXHJcbi8vIGluc3RhbnRpYXRlIHRoZSBkb21cclxubGlmZUxpbmUubWFrZURvbSh7XHJcblx0cGFyZW50OiBkb2N1bWVudC5ib2R5LFxyXG5cdGdyb3VwOiBbXHJcblx0XHR7IHdpZGdldDogXCJzaWRlYmFyXCIgfSxcclxuXHRcdHsgd2lkZ2V0OiBcImNvbnRlbnRcIiB9XHJcblx0XVxyXG59KTtcclxuXHJcbi8vIEFkZCBhIGxpbmsgdG8gdGhlIHRvZGEvaG9tZSBwYWdlXHJcbmxpZmVMaW5lLmFkZE5hdkNvbW1hbmQoXCJUb2RvXCIsIFwiL1wiKTtcclxuXHJcbi8vIGFkZCBsaXN0IHZpZXdzIHRvIHRoZSBuYXZiYXJcclxuaW5pdE5hdkJhcigpO1xyXG5cclxuLy8gY3JlYXRlIGEgbmV3IGFzc2lnbm1lbnRcclxubGlmZUxpbmUuYWRkQ29tbWFuZChcIk5ldyBhc3NpZ25tZW50XCIsICgpID0+IHtcclxuXHR2YXIgaWQgPSBNYXRoLmZsb29yKE1hdGgucmFuZG9tKCkgKiAxMDAwMDAwMDApO1xyXG5cclxuXHRsaWZlTGluZS5uYXYubmF2aWdhdGUoXCIvZWRpdC9cIiArIGlkKTtcclxufSk7XHJcblxyXG4vLyBjcmVhdGUgdGhlIGxvZ291dCBidXR0b25cclxubGlmZUxpbmUuYWRkTmF2Q29tbWFuZChcIkFjY291bnRcIiwgXCIvYWNjb3VudFwiKTtcclxuXHJcbi8vIHJlZ2lzdGVyIHRoZSBzZXJ2aWNlIHdvcmtlclxyXG5yZXF1aXJlKFwiLi9zdy1oZWxwZXJcIik7XHJcbiIsIi8qKlxyXG4gKiBSZWdpc3RlciBhbmQgY29tbXVuaWNhdGUgd2l0aCB0aGUgc2VydmljZSB3b3JrZXJcclxuICovXHJcblxyXG4gLy8gcmVnaXN0ZXIgdGhlIHNlcnZpY2Ugd29ya2VyXHJcbiBpZihuYXZpZ2F0b3Iuc2VydmljZVdvcmtlcikge1xyXG5cdCAvLyBtYWtlIHN1cmUgaXQncyByZWdpc3RlcmVkXHJcblx0IG5hdmlnYXRvci5zZXJ2aWNlV29ya2VyLnJlZ2lzdGVyKFwiL3NlcnZpY2Utd29ya2VyLmpzXCIpO1xyXG5cclxuXHQgLy8gbGlzdGVuIGZvciBtZXNzYWdlc1xyXG5cdCBuYXZpZ2F0b3Iuc2VydmljZVdvcmtlci5hZGRFdmVudExpc3RlbmVyKFwibWVzc2FnZVwiLCBlID0+IHtcclxuXHRcdCAvLyB3ZSBqdXN0IHVwZGF0ZWRcclxuXHRcdCBpZihlLmRhdGEudHlwZSA9PSBcInZlcnNpb24tY2hhbmdlXCIpIHtcclxuXHRcdFx0IGNvbnNvbGUubG9nKFwiVXBkYXRlZCB0b1wiLCBlLmRhdGEudmVyc2lvbik7XHJcblxyXG5cdFx0XHQgLy8gaW4gZGV2IG1vZGUgcmVsb2FkIHRoZSBwYWdlXHJcblx0XHRcdCBpZihlLmRhdGEudmVyc2lvbi5pbmRleE9mKFwiQFwiKSAhPT0gLTEpIHtcclxuXHRcdFx0XHQgbG9jYXRpb24ucmVsb2FkKCk7XHJcblx0XHRcdCB9XHJcblx0XHQgfVxyXG5cdCB9KTtcclxuIH1cclxuIiwiLyoqXHJcbiogRGF0ZSByZWxhdGVkIHRvb2xzXHJcbiovXHJcblxyXG4vLyBjaGVjayBpZiB0aGUgZGF0ZXMgYXJlIHRoZSBzYW1lIGRheVxyXG5leHBvcnRzLmlzU2FtZURhdGUgPSBmdW5jdGlvbihkYXRlMSwgZGF0ZTIpIHtcclxuXHRyZXR1cm4gZGF0ZTEuZ2V0RnVsbFllYXIoKSA9PSBkYXRlMi5nZXRGdWxsWWVhcigpICYmXHJcblx0XHRkYXRlMS5nZXRNb250aCgpID09IGRhdGUyLmdldE1vbnRoKCkgJiZcclxuXHRcdGRhdGUxLmdldERhdGUoKSA9PSBkYXRlMi5nZXREYXRlKCk7XHJcbn07XHJcblxyXG4vLyBjaGVjayBpZiBhIGRhdGUgaXMgbGVzcyB0aGFuIGFub3RoZXJcclxuZXhwb3J0cy5pc1Nvb25lckRhdGUgPSBmdW5jdGlvbihkYXRlMSwgZGF0ZTIpIHtcclxuICAgIC8vIGNoZWNrIHRoZSB5ZWFyIGZpcnN0XHJcbiAgICBpZihkYXRlMS5nZXRGdWxsWWVhcigpICE9IGRhdGUyLmdldEZ1bGxZZWFyKCkpIHtcclxuICAgICAgICByZXR1cm4gZGF0ZTEuZ2V0RnVsbFllYXIoKSA8IGRhdGUyLmdldEZ1bGxZZWFyKCk7XHJcbiAgICB9XHJcblxyXG4gICAgLy8gY2hlY2sgdGhlIG1vbnRoIG5leHRcclxuICAgIGlmKGRhdGUxLmdldE1vbnRoKCkgIT0gZGF0ZTIuZ2V0TW9udGgoKSkge1xyXG4gICAgICAgIHJldHVybiBkYXRlMS5nZXRNb250aCgpIDwgZGF0ZTIuZ2V0TW9udGgoKTtcclxuICAgIH1cclxuXHJcbiAgICAvLyBjaGVjayB0aGUgZGF5XHJcbiAgICByZXR1cm4gZGF0ZTEuZ2V0RGF0ZSgpIDwgZGF0ZTIuZ2V0RGF0ZSgpO1xyXG59O1xyXG5cclxuLy8gZ2V0IHRoZSBkYXRlIGRheXMgZnJvbSBub3dcclxuZXhwb3J0cy5kYXlzRnJvbU5vdyA9IGZ1bmN0aW9uKGRheXMpIHtcclxuXHR2YXIgZGF0ZSA9IG5ldyBEYXRlKCk7XHJcblxyXG5cdC8vIGFkdmFuY2UgdGhlIGRhdGVcclxuXHRkYXRlLnNldERhdGUoZGF0ZS5nZXREYXRlKCkgKyBkYXlzKTtcclxuXHJcblx0cmV0dXJuIGRhdGU7XHJcbn07XHJcblxyXG5jb25zdCBTVFJJTkdfREFZUyA9IFtcIlN1bmRheVwiLCBcIk1vbmRheVwiLCBcIlR1ZXNkYXlcIiwgXCJXZWRlbnNkYXlcIiwgXCJUaHVyc2RheVwiLCBcIkZyaWRheVwiLCBcIlNhdHVyZGF5XCJdO1xyXG5cclxuLy8gY29udmVydCBhIGRhdGUgdG8gYSBzdHJpbmdcclxuZXhwb3J0cy5zdHJpbmdpZnlEYXRlID0gZnVuY3Rpb24oZGF0ZSwgb3B0cyA9IHt9KSB7XHJcblx0IHZhciBzdHJEYXRlLCBzdHJUaW1lID0gXCJcIjtcclxuXHJcbiAgICAvLyBjaGVjayBpZiB0aGUgZGF0ZSBpcyBiZWZvcmUgdG9kYXlcclxuICAgIHZhciBiZWZvcmVOb3cgPSBkYXRlLmdldFRpbWUoKSA8IERhdGUubm93KCk7XHJcblxyXG5cdC8vIFRvZGF5XHJcblx0aWYoZXhwb3J0cy5pc1NhbWVEYXRlKGRhdGUsIG5ldyBEYXRlKCkpKVxyXG5cdFx0c3RyRGF0ZSA9IFwiVG9kYXlcIjtcclxuXHJcblx0Ly8gVG9tb3Jyb3dcclxuXHRlbHNlIGlmKGV4cG9ydHMuaXNTYW1lRGF0ZShkYXRlLCBleHBvcnRzLmRheXNGcm9tTm93KDEpKSAmJiAhYmVmb3JlTm93KVxyXG5cdFx0c3RyRGF0ZSA9IFwiVG9tb3Jyb3dcIjtcclxuXHJcblx0Ly8gZGF5IG9mIHRoZSB3ZWVrICh0aGlzIHdlZWspXHJcblx0ZWxzZSBpZihleHBvcnRzLmlzU29vbmVyRGF0ZShkYXRlLCBleHBvcnRzLmRheXNGcm9tTm93KDcpKSAmJiAhYmVmb3JlTm93KVxyXG5cdFx0c3RyRGF0ZSA9IFNUUklOR19EQVlTW2RhdGUuZ2V0RGF5KCldO1xyXG5cclxuXHQvLyBwcmludCB0aGUgZGF0ZVxyXG5cdGVsc2VcclxuXHQgXHRzdHJEYXRlID0gYCR7U1RSSU5HX0RBWVNbZGF0ZS5nZXREYXkoKV19ICR7ZGF0ZS5nZXRNb250aCgpICsgMX0vJHtkYXRlLmdldERhdGUoKX1gO1xyXG5cclxuXHQvLyBhZGQgdGhlIHRpbWUgb25cclxuXHRpZihvcHRzLmluY2x1ZGVUaW1lICYmICFleHBvcnRzLmlzU2tpcFRpbWUoZGF0ZSwgb3B0cy5za2lwVGltZXMpKSB7XHJcblx0XHRyZXR1cm4gc3RyRGF0ZSArIFwiLCBcIiArIGV4cG9ydHMuc3RyaW5naWZ5VGltZShkYXRlKTtcclxuXHR9XHJcblxyXG5cdHJldHVybiBzdHJEYXRlO1xyXG59O1xyXG5cclxuLy8gY2hlY2sgaWYgdGhpcyBpcyBvbmUgb2YgdGhlIGdpdmVuIHNraXAgdGltZXNcclxuZXhwb3J0cy5pc1NraXBUaW1lID0gZnVuY3Rpb24oZGF0ZSwgc2tpcHMgPSBbXSkge1xyXG5cdHJldHVybiBza2lwcy5maW5kKHNraXAgPT4ge1xyXG5cdFx0cmV0dXJuIHNraXAuaG91ciA9PT0gZGF0ZS5nZXRIb3VycygpICYmIHNraXAubWludXRlID09PSBkYXRlLmdldE1pbnV0ZXMoKTtcclxuXHR9KTtcclxufTtcclxuXHJcbi8vIGNvbnZlcnQgYSB0aW1lIHRvIGEgc3RyaW5nXHJcbmV4cG9ydHMuc3RyaW5naWZ5VGltZSA9IGZ1bmN0aW9uKGRhdGUpIHtcclxuXHR2YXIgaG91ciA9IGRhdGUuZ2V0SG91cnMoKTtcclxuXHJcblx0Ly8gZ2V0IHRoZSBhbS9wbSB0aW1lXHJcblx0dmFyIGlzQW0gPSBob3VyIDwgMTI7XHJcblxyXG5cdC8vIG1pZG5pZ2h0XHJcblx0aWYoaG91ciA9PT0gMCkgaG91ciA9IDEyO1xyXG5cdC8vIGFmdGVyIG5vb25cclxuXHRpZihob3VyID4gMTIpIGhvdXIgPSBob3VyIC0gMTI7XHJcblxyXG5cdHZhciBtaW51dGUgPSBkYXRlLmdldE1pbnV0ZXMoKTtcclxuXHJcblx0Ly8gYWRkIGEgbGVhZGluZyAwXHJcblx0aWYobWludXRlIDwgMTApIG1pbnV0ZSA9IFwiMFwiICsgbWludXRlO1xyXG5cclxuXHRyZXR1cm4gaG91ciArIFwiOlwiICsgbWludXRlICsgKGlzQW0gPyBcImFtXCIgOiBcInBtXCIpO1xyXG59XHJcbiIsIi8qKlxyXG4gKiBBIGhlbHBlciBmb3IgYnVpbGRpbmcgZG9tIG5vZGVzXHJcbiAqL1xyXG5cclxuY29uc3QgU1ZHX0VMRU1FTlRTID0gW1wic3ZnXCIsIFwibGluZVwiXTtcclxuY29uc3QgU1ZHX05BTUVTUEFDRSA9IFwiaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmdcIjtcclxuXHJcbi8vIGJ1aWxkIGEgc2luZ2xlIGRvbSBub2RlXHJcbnZhciBtYWtlRG9tID0gZnVuY3Rpb24ob3B0cyA9IHt9KSB7XHJcblx0Ly8gZ2V0IG9yIGNyZWF0ZSB0aGUgbmFtZSBtYXBwaW5nXHJcblx0dmFyIG1hcHBlZCA9IG9wdHMubWFwcGVkIHx8IHt9O1xyXG5cclxuXHR2YXIgJGVsO1xyXG5cclxuXHQvLyB0aGUgZWxlbWVudCBpcyBwYXJ0IG9mIHRoZSBzdmcgbmFtZXNwYWNlXHJcblx0aWYoU1ZHX0VMRU1FTlRTLmluZGV4T2Yob3B0cy50YWcpICE9PSAtMSkge1xyXG5cdFx0JGVsID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudE5TKFNWR19OQU1FU1BBQ0UsIG9wdHMudGFnKTtcclxuXHR9XHJcblx0Ly8gYSBwbGFpbiBlbGVtZW50XHJcblx0ZWxzZSB7XHJcblx0XHQkZWwgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KG9wdHMudGFnIHx8IFwiZGl2XCIpO1xyXG5cdH1cclxuXHJcblx0Ly8gc2V0IHRoZSBjbGFzc2VzXHJcblx0aWYob3B0cy5jbGFzc2VzKSB7XHJcblx0XHQkZWwuc2V0QXR0cmlidXRlKFwiY2xhc3NcIiwgdHlwZW9mIG9wdHMuY2xhc3NlcyA9PSBcInN0cmluZ1wiID8gb3B0cy5jbGFzc2VzIDogb3B0cy5jbGFzc2VzLmpvaW4oXCIgXCIpKTtcclxuXHR9XHJcblxyXG5cdC8vIGF0dGFjaCB0aGUgYXR0cmlidXRlc1xyXG5cdGlmKG9wdHMuYXR0cnMpIHtcclxuXHRcdE9iamVjdC5nZXRPd25Qcm9wZXJ0eU5hbWVzKG9wdHMuYXR0cnMpXHJcblxyXG5cdFx0LmZvckVhY2goYXR0ciA9PiAkZWwuc2V0QXR0cmlidXRlKGF0dHIsIG9wdHMuYXR0cnNbYXR0cl0pKTtcclxuXHR9XHJcblxyXG5cdC8vIHNldCB0aGUgdGV4dCBjb250ZW50XHJcblx0aWYob3B0cy50ZXh0KSB7XHJcblx0XHQkZWwuaW5uZXJUZXh0ID0gb3B0cy50ZXh0O1xyXG5cdH1cclxuXHJcblx0Ly8gYXR0YWNoIHRoZSBub2RlIHRvIGl0cyBwYXJlbnRcclxuXHRpZihvcHRzLnBhcmVudCkge1xyXG5cdFx0b3B0cy5wYXJlbnQuaW5zZXJ0QmVmb3JlKCRlbCwgb3B0cy5iZWZvcmUpO1xyXG5cdH1cclxuXHJcblx0Ly8gYWRkIGV2ZW50IGxpc3RlbmVyc1xyXG5cdGlmKG9wdHMub24pIHtcclxuXHRcdGZvcihsZXQgbmFtZSBvZiBPYmplY3QuZ2V0T3duUHJvcGVydHlOYW1lcyhvcHRzLm9uKSkge1xyXG5cdFx0XHQkZWwuYWRkRXZlbnRMaXN0ZW5lcihuYW1lLCBvcHRzLm9uW25hbWVdKTtcclxuXHJcblx0XHRcdC8vIGF0dGFjaCB0aGUgZG9tIHRvIGEgZGlzcG9zYWJsZVxyXG5cdFx0XHRpZihvcHRzLmRpc3ApIHtcclxuXHRcdFx0XHRvcHRzLmRpc3AuYWRkKHtcclxuXHRcdFx0XHRcdHVuc3Vic2NyaWJlOiAoKSA9PiAkZWwucmVtb3ZlRXZlbnRMaXN0ZW5lcihuYW1lLCBvcHRzLm9uW25hbWVdKVxyXG5cdFx0XHRcdH0pO1xyXG5cdFx0XHR9XHJcblx0XHR9XHJcblx0fVxyXG5cclxuXHQvLyBzZXQgdGhlIHZhbHVlIG9mIGFuIGlucHV0IGVsZW1lbnRcclxuXHRpZihvcHRzLnZhbHVlKSB7XHJcblx0XHQkZWwudmFsdWUgPSBvcHRzLnZhbHVlO1xyXG5cdH1cclxuXHJcblx0Ly8gYWRkIHRoZSBuYW1lIG1hcHBpbmdcclxuXHRpZihvcHRzLm5hbWUpIHtcclxuXHRcdG1hcHBlZFtvcHRzLm5hbWVdID0gJGVsO1xyXG5cdH1cclxuXHJcblx0Ly8gY3JlYXRlIHRoZSBjaGlsZCBkb20gbm9kZXNcclxuXHRpZihvcHRzLmNoaWxkcmVuKSB7XHJcblx0XHRmb3IobGV0IGNoaWxkIG9mIG9wdHMuY2hpbGRyZW4pIHtcclxuXHRcdFx0Ly8gbWFrZSBhbiBhcnJheSBpbnRvIGEgZ3JvdXAgT2JqZWN0XHJcblx0XHRcdGlmKEFycmF5LmlzQXJyYXkoY2hpbGQpKSB7XHJcblx0XHRcdFx0Y2hpbGQgPSB7XHJcblx0XHRcdFx0XHRncm91cDogY2hpbGRcclxuXHRcdFx0XHR9O1xyXG5cdFx0XHR9XHJcblxyXG5cdFx0XHQvLyBhdHRhY2ggaW5mb3JtYXRpb24gZm9yIHRoZSBncm91cFxyXG5cdFx0XHRjaGlsZC5wYXJlbnQgPSAkZWw7XHJcblx0XHRcdGNoaWxkLmRpc3AgPSBvcHRzLmRpc3A7XHJcblx0XHRcdGNoaWxkLm1hcHBlZCA9IG1hcHBlZDtcclxuXHJcblx0XHRcdC8vIGJ1aWxkIHRoZSBub2RlIG9yIGdyb3VwXHJcblx0XHRcdG1ha2UoY2hpbGQpO1xyXG5cdFx0fVxyXG5cdH1cclxuXHJcblx0cmV0dXJuIG1hcHBlZDtcclxufVxyXG5cclxuLy8gYnVpbGQgYSBncm91cCBvZiBkb20gbm9kZXNcclxudmFyIG1ha2VHcm91cCA9IGZ1bmN0aW9uKGdyb3VwKSB7XHJcblx0Ly8gc2hvcnRoYW5kIGZvciBhIGdyb3Vwc1xyXG5cdGlmKEFycmF5LmlzQXJyYXkoZ3JvdXApKSB7XHJcblx0XHRncm91cCA9IHtcclxuXHRcdFx0Y2hpbGRyZW46IGdyb3VwXHJcblx0XHR9O1xyXG5cdH1cclxuXHJcblx0Ly8gZ2V0IG9yIGNyZWF0ZSB0aGUgbmFtZSBtYXBwaW5nXHJcblx0dmFyIG1hcHBlZCA9IHt9O1xyXG5cclxuXHRmb3IobGV0IG5vZGUgb2YgZ3JvdXAuZ3JvdXApIHtcclxuXHRcdC8vIGNvcHkgb3ZlciBwcm9wZXJ0aWVzIGZyb20gdGhlIGdyb3VwXHJcblx0XHRub2RlLnBhcmVudCB8fCAobm9kZS5wYXJlbnQgPSBncm91cC5wYXJlbnQpO1xyXG5cdFx0bm9kZS5kaXNwIHx8IChub2RlLmRpc3AgPSBncm91cC5kaXNwKTtcclxuXHRcdG5vZGUubWFwcGVkID0gbWFwcGVkO1xyXG5cclxuXHRcdC8vIG1ha2UgdGhlIGRvbVxyXG5cdFx0bWFrZShub2RlKTtcclxuXHR9XHJcblxyXG5cdC8vIGNhbGwgdGhlIGNhbGxiYWNrIHdpdGggdGhlIG1hcHBlZCBuYW1lc1xyXG5cdGlmKGdyb3VwLmJpbmQpIHtcclxuXHRcdHZhciBzdWJzY3JpcHRpb24gPSBncm91cC5iaW5kKG1hcHBlZCk7XHJcblxyXG5cdFx0Ly8gaWYgdGhlIHJldHVybiBhIHN1YnNjcmlwdGlvbiBhdHRhY2ggaXQgdG8gdGhlIGRpc3Bvc2FibGVcclxuXHRcdGlmKHN1YnNjcmlwdGlvbiAmJiBncm91cC5kaXNwKSB7XHJcblx0XHRcdGdyb3VwLmRpc3AuYWRkKHN1YnNjcmlwdGlvbik7XHJcblx0XHR9XHJcblx0fVxyXG5cclxuXHRyZXR1cm4gbWFwcGVkO1xyXG59O1xyXG5cclxuLy8gYSBjb2xsZWN0aW9uIG9mIHdpZGdldHNcclxudmFyIHdpZGdldHMgPSB7fTtcclxuXHJcbnZhciBtYWtlID0gbW9kdWxlLmV4cG9ydHMgPSBmdW5jdGlvbihvcHRzKSB7XHJcblx0Ly8gaGFuZGxlIGEgZ3JvdXBcclxuXHRpZihBcnJheS5pc0FycmF5KG9wdHMpIHx8IG9wdHMuZ3JvdXApIHtcclxuXHRcdHJldHVybiBtYWtlR3JvdXAob3B0cyk7XHJcblx0fVxyXG5cdC8vIG1ha2UgYSB3aWRnZXRcclxuXHRlbHNlIGlmKG9wdHMud2lkZ2V0KSB7XHJcblx0XHR2YXIgd2lkZ2V0ID0gd2lkZ2V0c1tvcHRzLndpZGdldF07XHJcblxyXG5cdFx0Ly8gbm90IGRlZmluZWRcclxuXHRcdGlmKCF3aWRnZXQpIHtcclxuXHRcdFx0dGhyb3cgbmV3IEVycm9yKGBXaWRnZXQgJyR7b3B0cy53aWRnZXR9JyBpcyBub3QgZGVmaW5lZCBtYWtlIHN1cmUgaXRzIGJlZW4gaW1wb3J0ZWRgKTtcclxuXHRcdH1cclxuXHJcblx0XHQvLyBnZW5lcmF0ZSB0aGUgd2lkZ2V0IGNvbnRlbnRcclxuXHRcdHZhciBidWlsdCA9IHdpZGdldC5tYWtlKG9wdHMpO1xyXG5cclxuXHRcdHJldHVybiBtYWtlR3JvdXAoe1xyXG5cdFx0XHRwYXJlbnQ6IG9wdHMucGFyZW50LFxyXG5cdFx0XHRkaXNwOiBvcHRzLmRpc3AsXHJcblx0XHRcdGdyb3VwOiBBcnJheS5pc0FycmF5KGJ1aWx0KSA/IGJ1aWx0IDogW2J1aWx0XSxcclxuXHRcdFx0YmluZDogd2lkZ2V0LmJpbmQgJiYgd2lkZ2V0LmJpbmQuYmluZCh3aWRnZXQsIG9wdHMpXHJcblx0XHR9KTtcclxuXHR9XHJcblx0Ly8gbWFrZSBhIHNpbmdsZSBub2RlXHJcblx0ZWxzZSB7XHJcblx0XHRyZXR1cm4gbWFrZURvbShvcHRzKTtcclxuXHR9XHJcbn07XHJcblxyXG4vLyByZWdpc3RlciBhIHdpZGdldFxyXG5tYWtlLnJlZ2lzdGVyID0gZnVuY3Rpb24obmFtZSwgd2lkZ2V0KSB7XHJcblx0d2lkZ2V0c1tuYW1lXSA9IHdpZGdldDtcclxufTtcclxuIiwiLyoqXHJcbiAqIEEgdmlldyBmb3IgYWNjZXNzaW5nL21vZGlmeWluZyBpbmZvcm1hdGlvbiBhYm91dCB0aGUgY3VycmVudCB1c2VyXHJcbiAqL1xyXG5cclxudmFyIHtnZW5CYWNrdXBOYW1lfSA9IHJlcXVpcmUoXCIuLi8uLi9jb21tb24vYmFja3VwXCIpO1xyXG5cclxubGlmZUxpbmUubmF2LnJlZ2lzdGVyKHtcclxuXHRtYXRjaGVyOiAvXig/OlxcL3VzZXJcXC8oLis/KXxcXC9hY2NvdW50KSQvLFxyXG5cclxuXHRtYWtlKHtzZXRUaXRsZSwgY29udGVudCwgbWF0Y2h9KSB7XHJcblx0XHRzZXRUaXRsZShcIkFjY291bnRcIik7XHJcblxyXG5cdFx0dmFyIHVybCA9IFwiL2FwaS9hdXRoL2luZm8vZ2V0XCI7XHJcblxyXG5cdFx0Ly8gYWRkIHRoZSB1c2VybmFtZSBpZiBvbmUgaXMgZ2l2ZW5cclxuXHRcdGlmKG1hdGNoWzFdKSB1cmwgKz0gYD91c2VybmFtZT0ke21hdGNoWzFdfWA7XHJcblxyXG5cdFx0Ly8gbG9hZCB0aGUgdXNlciBkYXRhXHJcblx0XHRmZXRjaCh1cmwsIHsgY3JlZGVudGlhbHM6IFwiaW5jbHVkZVwiIH0pXHJcblxyXG5cdFx0LnRoZW4ocmVzID0+IHJlcy5qc29uKCkpXHJcblxyXG5cdFx0LnRoZW4ocmVzID0+IHtcclxuXHRcdFx0Ly8gbm8gc3VjaCB1c2VyIG9yIGFjY2VzcyBpcyBkZW5pZWRcclxuXHRcdFx0aWYocmVzLnN0YXR1cyA9PSBcImZhaWxcIikge1xyXG5cdFx0XHRcdGxpZmVMaW5lLm1ha2VEb20oe1xyXG5cdFx0XHRcdFx0cGFyZW50OiBjb250ZW50LFxyXG5cdFx0XHRcdFx0Y2xhc3NlczogXCJjb250ZW50LXBhZGRlZFwiLFxyXG5cdFx0XHRcdFx0dGV4dDogXCJDb3VsZCBub3QgYWNjZXNzIHRoZSB1c2VyIHlvdSB3ZXJlIGxvb2tpbmcgZm9yXCJcclxuXHRcdFx0XHR9KTtcclxuXHJcblx0XHRcdFx0cmV0dXJuO1xyXG5cdFx0XHR9XHJcblxyXG5cdFx0XHR2YXIgdXNlciA9IHJlcy5kYXRhO1xyXG5cclxuXHRcdFx0Ly8gZ2VuZXJhdGUgdGhlIHBhZ2VcclxuXHRcdFx0dmFyIGNoaWxkcmVuID0gW107XHJcblxyXG5cdFx0XHRjaGlsZHJlbi5wdXNoKHtcclxuXHRcdFx0XHR0YWc6IFwiaDJcIixcclxuXHRcdFx0XHR0ZXh0OiB1c2VyLnVzZXJuYW1lXHJcblx0XHRcdH0pO1xyXG5cclxuXHRcdFx0Ly8gZGlzcGxheSB0aGUgYWRtaW4gc3RhdHVzIG9mIGFub3RoZXIgdXNlclxyXG5cdFx0XHRpZihtYXRjaFsxXSkge1xyXG5cdFx0XHRcdGNoaWxkcmVuLnB1c2goe1xyXG5cdFx0XHRcdFx0dGV4dDogYCR7dXNlci51c2VybmFtZX0gaXMgJHt1c2VyLmFkbWluID8gXCJcIiA6IFwibm90XCJ9IGFuIGFkbWluYFxyXG5cdFx0XHRcdH0pO1xyXG5cdFx0XHR9XHJcblx0XHRcdC8vIGRpc3BsYXkgdGhlIGFkbWluIHN0YXR1cyBvZiB0aGlzIHVzZXJcclxuXHRcdFx0ZWxzZSB7XHJcblx0XHRcdFx0Y2hpbGRyZW4ucHVzaCh7XHJcblx0XHRcdFx0XHR0ZXh0OiBgWW91IGFyZSAke3VzZXIuYWRtaW4gPyBcIlwiIDogXCJub3RcIn0gYW4gYWRtaW5gXHJcblx0XHRcdFx0fSk7XHJcblxyXG5cdFx0XHRcdC8vIGFkZCBhIGxpbmsgYXQgYSBsaXN0IG9mIGFsbCB1c2Vyc1xyXG5cdFx0XHRcdGlmKHVzZXIuYWRtaW4pIHtcclxuXHRcdFx0XHRcdGNoaWxkcmVuLnB1c2goeyB0YWc6IFwiYnJcIiB9KTtcclxuXHJcblx0XHRcdFx0XHRjaGlsZHJlbi5wdXNoKHtcclxuXHRcdFx0XHRcdFx0d2lkZ2V0OiBcImxpbmtcIixcclxuXHRcdFx0XHRcdFx0aHJlZjogXCIvdXNlcnNcIixcclxuXHRcdFx0XHRcdFx0dGV4dDogXCJWaWV3IGFsbCB1c2Vyc1wiXHJcblx0XHRcdFx0XHR9KTtcclxuXHRcdFx0XHR9XHJcblx0XHRcdH1cclxuXHJcblx0XHRcdC8vIGNyZWF0ZSBhIGJhY2t1cCBsaW5rXHJcblx0XHRcdGlmKCFtYXRjaFsxXSkge1xyXG5cdFx0XHRcdGNoaWxkcmVuLnB1c2goeyB0YWc6IFwiYnJcIiB9KTtcclxuXHRcdFx0XHRjaGlsZHJlbi5wdXNoKHsgdGFnOiBcImJyXCIgfSk7XHJcblxyXG5cdFx0XHRcdGNoaWxkcmVuLnB1c2goe1xyXG5cdFx0XHRcdFx0dGFnOiBcImFcIixcclxuXHRcdFx0XHRcdHRleHQ6IFwiRG93bmxvYWQgYmFja3VwXCIsXHJcblx0XHRcdFx0XHRhdHRyczoge1xyXG5cdFx0XHRcdFx0XHRocmVmOiBcIi9hcGkvYmFja3VwXCIsXHJcblx0XHRcdFx0XHRcdGRvd25sb2FkOiBnZW5CYWNrdXBOYW1lKClcclxuXHRcdFx0XHRcdH1cclxuXHRcdFx0XHR9KTtcclxuXHRcdFx0fVxyXG5cclxuXHRcdFx0dmFyIHBhc3N3b3JkQ2hhbmdlID0ge307XHJcblxyXG5cdFx0XHRjaGlsZHJlbi5wdXNoKHtcclxuXHRcdFx0XHR0YWc6IFwiZm9ybVwiLFxyXG5cdFx0XHRcdGNoaWxkcmVuOiBbXHJcblx0XHRcdFx0XHR7XHJcblx0XHRcdFx0XHRcdGNsYXNzZXM6IFwiZWRpdG9yLXJvd1wiLFxyXG5cdFx0XHRcdFx0XHRjaGlsZHJlbjogW1xyXG5cdFx0XHRcdFx0XHRcdHtcclxuXHRcdFx0XHRcdFx0XHRcdHdpZGdldDogXCJpbnB1dFwiLFxyXG5cdFx0XHRcdFx0XHRcdFx0dHlwZTogXCJwYXNzd29yZFwiLFxyXG5cdFx0XHRcdFx0XHRcdFx0cGxhY2Vob2xkZXI6IFwiT2xkIHBhc3N3b3JkXCIsXHJcblx0XHRcdFx0XHRcdFx0XHRiaW5kOiBwYXNzd29yZENoYW5nZSxcclxuXHRcdFx0XHRcdFx0XHRcdHByb3A6IFwib2xkUGFzc3dvcmRcIlxyXG5cdFx0XHRcdFx0XHRcdH0sXHJcblx0XHRcdFx0XHRcdFx0e1xyXG5cdFx0XHRcdFx0XHRcdFx0d2lkZ2V0OiBcImlucHV0XCIsXHJcblx0XHRcdFx0XHRcdFx0XHR0eXBlOiBcInBhc3N3b3JkXCIsXHJcblx0XHRcdFx0XHRcdFx0XHRwbGFjZWhvbGRlcjogXCJOZXcgcGFzc3dvcmRcIixcclxuXHRcdFx0XHRcdFx0XHRcdGJpbmQ6IHBhc3N3b3JkQ2hhbmdlLFxyXG5cdFx0XHRcdFx0XHRcdFx0cHJvcDogXCJwYXNzd29yZFwiXHJcblx0XHRcdFx0XHRcdFx0fVxyXG5cdFx0XHRcdFx0XHRdXHJcblx0XHRcdFx0XHR9LFxyXG5cdFx0XHRcdFx0e1xyXG5cdFx0XHRcdFx0XHR0YWc6IFwiYnV0dG9uXCIsXHJcblx0XHRcdFx0XHRcdGNsYXNzZXM6IFwiZmFuY3ktYnV0dG9uXCIsXHJcblx0XHRcdFx0XHRcdHRleHQ6IFwiQ2hhbmdlIHBhc3N3b3JkXCIsXHJcblx0XHRcdFx0XHRcdGF0dHJzOiB7XHJcblx0XHRcdFx0XHRcdFx0dHlwZTogXCJzdWJtaXRcIlxyXG5cdFx0XHRcdFx0XHR9XHJcblx0XHRcdFx0XHR9LFxyXG5cdFx0XHRcdFx0e1xyXG5cdFx0XHRcdFx0XHRuYW1lOiBcIm1zZ1wiXHJcblx0XHRcdFx0XHR9XHJcblx0XHRcdFx0XSxcclxuXHRcdFx0XHRvbjoge1xyXG5cdFx0XHRcdFx0Ly8gY2hhbmdlIHRoZSBwYXNzd29yZFxyXG5cdFx0XHRcdFx0c3VibWl0OiBlID0+IHtcclxuXHRcdFx0XHRcdFx0ZS5wcmV2ZW50RGVmYXVsdCgpO1xyXG5cclxuXHRcdFx0XHRcdFx0Ly8gbm8gcGFzc3dvcmQgc3VwcGxpZWRcclxuXHRcdFx0XHRcdFx0aWYoIXBhc3N3b3JkQ2hhbmdlLnBhc3N3b3JkKSB7XHJcblx0XHRcdFx0XHRcdFx0c2hvd01zZyhcIkVudGVyIGEgbmV3IHBhc3N3b3JkXCIpO1xyXG5cdFx0XHRcdFx0XHRcdHJldHVybjtcclxuXHRcdFx0XHRcdFx0fVxyXG5cclxuXHRcdFx0XHRcdFx0Ly8gc2VuZCB0aGUgcGFzc3dvcmQgY2hhbmdlIHJlcXVlc3RcclxuXHRcdFx0XHRcdFx0ZmV0Y2goYC9hcGkvYXV0aC9pbmZvL3NldD91c2VybmFtZT0ke3VzZXIudXNlcm5hbWV9YCwge1xyXG5cdFx0XHRcdFx0XHRcdGNyZWRlbnRpYWxzOiBcImluY2x1ZGVcIixcclxuXHRcdFx0XHRcdFx0XHRtZXRob2Q6IFwiUE9TVFwiLFxyXG5cdFx0XHRcdFx0XHRcdGJvZHk6IEpTT04uc3RyaW5naWZ5KHBhc3N3b3JkQ2hhbmdlKVxyXG5cdFx0XHRcdFx0XHR9KVxyXG5cclxuXHRcdFx0XHRcdFx0LnRoZW4ocmVzID0+IHJlcy5qc29uKCkpXHJcblxyXG5cdFx0XHRcdFx0XHQudGhlbihyZXMgPT4ge1xyXG5cdFx0XHRcdFx0XHRcdC8vIHBhc3N3b3JkIGNoYW5nZSBmYWlsZWRcclxuXHRcdFx0XHRcdFx0XHRpZihyZXMuc3RhdHVzID09IFwiZmFpbFwiKSB7XHJcblx0XHRcdFx0XHRcdFx0XHRzaG93TXNnKHJlcy5kYXRhLm1zZyk7XHJcblx0XHRcdFx0XHRcdFx0fVxyXG5cclxuXHRcdFx0XHRcdFx0XHRpZihyZXMuc3RhdHVzID09IFwic3VjY2Vzc1wiKSB7XHJcblx0XHRcdFx0XHRcdFx0XHRzaG93TXNnKFwiUGFzc3dvcmQgY2hhbmdlZFwiKTtcclxuXHRcdFx0XHRcdFx0XHR9XHJcblx0XHRcdFx0XHRcdH0pO1xyXG5cdFx0XHRcdFx0fVxyXG5cdFx0XHRcdH1cclxuXHRcdFx0fSk7XHJcblxyXG5cdFx0XHRjaGlsZHJlbi5wdXNoKHsgdGFnOiBcImJyXCIgfSk7XHJcblx0XHRcdGNoaWxkcmVuLnB1c2goeyB0YWc6IFwiYnJcIiB9KTtcclxuXHJcblx0XHRcdC8vIG9ubHkgZGlzcGxheSB0aGUgbG9nb3V0IGJ1dHRvbiBpZiB3ZSBhcmUgb24gdGhlIC9hY2NvdW50IHBhZ2VcclxuXHRcdFx0aWYoIW1hdGNoWzFdKSB7XHJcblx0XHRcdFx0Y2hpbGRyZW4ucHVzaCh7XHJcblx0XHRcdFx0XHR0YWc6IFwiYnV0dG9uXCIsXHJcblx0XHRcdFx0XHRjbGFzc2VzOiBcImZhbmN5LWJ1dHRvblwiLFxyXG5cdFx0XHRcdFx0dGV4dDogXCJMb2dvdXRcIixcclxuXHRcdFx0XHRcdG9uOiB7XHJcblx0XHRcdFx0XHRcdGNsaWNrOiAoKSA9PiB7XHJcblx0XHRcdFx0XHRcdFx0Ly8gc2VuZCB0aGUgbG9nb3V0IHJlcXVlc3RcclxuXHRcdFx0XHRcdFx0XHRmZXRjaChcIi9hcGkvYXV0aC9sb2dvdXRcIiwgeyBjcmVkZW50aWFsczogXCJpbmNsdWRlXCIgfSlcclxuXHJcblx0XHRcdFx0XHRcdFx0Ly8gcmV0dXJuIHRvIHRoZSBsb2dpbiBwYWdlXHJcblx0XHRcdFx0XHRcdFx0LnRoZW4oKCkgPT4gbGlmZUxpbmUubmF2Lm5hdmlnYXRlKFwiL2xvZ2luXCIpKTtcclxuXHRcdFx0XHRcdFx0fVxyXG5cdFx0XHRcdFx0fVxyXG5cdFx0XHRcdH0pO1xyXG5cdFx0XHR9XHJcblxyXG5cdFx0XHR2YXIge21zZ30gPSBsaWZlTGluZS5tYWtlRG9tKHtcclxuXHRcdFx0XHRwYXJlbnQ6IGNvbnRlbnQsXHJcblx0XHRcdFx0Y2xhc3NlczogXCJjb250ZW50LXBhZGRlZFwiLFxyXG5cdFx0XHRcdGNoaWxkcmVuXHJcblx0XHRcdH0pO1xyXG5cclxuXHRcdFx0Ly8gc2hvdyBhIG1lc3NhZ2VcclxuXHRcdFx0dmFyIHNob3dNc2cgPSBmdW5jdGlvbih0ZXh0KSB7XHJcblx0XHRcdFx0bXNnLmlubmVyVGV4dCA9IHRleHQ7XHJcblx0XHRcdH07XHJcblx0XHR9KVxyXG5cdH1cclxufSk7XHJcbiIsIi8qKlxyXG4gKiBFZGl0IGFuIGFzc2lnbmVtbnRcclxuICovXHJcblxyXG52YXIge2RheXNGcm9tTm93LCBzdHJpbmdpZnlEYXRlfSA9IHJlcXVpcmUoXCIuLi91dGlsL2RhdGVcIik7XHJcbnZhciB7YXNzaWdubWVudHN9ID0gcmVxdWlyZShcIi4uL2RhdGEtc3RvcmVzXCIpOztcclxuXHJcbmxpZmVMaW5lLm5hdi5yZWdpc3Rlcih7XHJcblx0bWF0Y2hlcjogL15cXC9lZGl0XFwvKC4rPykkLyxcclxuXHJcblx0bWFrZSh7bWF0Y2gsIGNvbnRlbnQsIHNldFRpdGxlLCBkaXNwb3NhYmxlfSkge1xyXG5cdFx0dmFyIGFjdGlvblN1YiwgZGVsZXRlU3ViO1xyXG5cclxuXHRcdC8vIGlmIHdlIG1ha2UgYSBjaGFuZ2UgZG9uJ3QgcmVmcmVzaCB0aGUgcGFnZVxyXG5cdFx0dmFyIGRlYm91bmNlO1xyXG5cclxuXHRcdHZhciBjaGFuZ2VTdWIgPSBhc3NpZ25tZW50cy5xdWVyeSh7IGlkOiBtYXRjaFsxXSB9LCBmdW5jdGlvbihbaXRlbV0pIHtcclxuXHRcdFx0Ly8gaWYgd2UgbWFrZSBhIGNoYW5nZSBkb24ndCByZWZyZXNoIHRoZSBwYWdlXHJcblx0XHRcdGlmKGRlYm91bmNlKSB7XHJcblx0XHRcdFx0ZGVib3VuY2UgPSBmYWxzZTtcclxuXHJcblx0XHRcdFx0cmV0dXJuO1xyXG5cdFx0XHR9XHJcblxyXG5cdFx0XHQvLyBjbGVhciB0aGUgY29udGVudFxyXG5cdFx0XHRjb250ZW50LmlubmVySFRNTCA9IFwiXCI7XHJcblxyXG5cdFx0XHQvLyByZW1vdmUgdGhlIHByZXZpb3VzIGFjdGlvblxyXG5cdFx0XHRpZihhY3Rpb25TdWIpIHtcclxuXHRcdFx0XHRhY3Rpb25TdWIudW5zdWJzY3JpYmUoKTtcclxuXHRcdFx0XHRkZWxldGVTdWIudW5zdWJzY3JpYmUoKTtcclxuXHRcdFx0fVxyXG5cclxuXHRcdFx0Ly8gYWRkIGEgYnV0dG9uIGJhY2sgdG8gdGhlIHZpZXdcclxuXHRcdFx0aWYoaXRlbSkge1xyXG5cdFx0XHRcdGFjdGlvblN1YiA9IGxpZmVMaW5lLmFkZEFjdGlvbihcIlZpZXdcIiwgKCkgPT4gbGlmZUxpbmUubmF2Lm5hdmlnYXRlKFwiL2l0ZW0vXCIgKyBpdGVtLmlkKSk7XHJcblxyXG5cdFx0XHRcdGRlbGV0ZVN1YiA9IGxpZmVMaW5lLmFkZEFjdGlvbihcIkRlbGV0ZVwiLCAoKSA9PiB7XHJcblx0XHRcdFx0XHQvLyByZW1vdmUgdGhlIGl0ZW1cclxuXHRcdFx0XHRcdGFzc2lnbm1lbnRzLnJlbW92ZShpdGVtLmlkKTtcclxuXHJcblx0XHRcdFx0XHQvLyBuYXZpZ2F0ZSBhd2F5XHJcblx0XHRcdFx0XHRsaWZlTGluZS5uYXYubmF2aWdhdGUoXCIvXCIpO1xyXG5cdFx0XHRcdH0pO1xyXG5cdFx0XHR9XHJcblxyXG5cdFx0XHQvLyBpZiB0aGUgaXRlbSBkb2VzIG5vdCBleGlzdCBjcmVhdGUgaXRcclxuXHRcdFx0aWYoIWl0ZW0pIHtcclxuXHRcdFx0XHRpdGVtID0ge1xyXG5cdFx0XHRcdFx0bmFtZTogXCJVbm5hbWVkIGl0ZW1cIixcclxuXHRcdFx0XHRcdGNsYXNzOiBcIkNsYXNzXCIsXHJcblx0XHRcdFx0XHRkYXRlOiBnZW5EYXRlKCksXHJcblx0XHRcdFx0XHRpZDogbWF0Y2hbMV0sXHJcblx0XHRcdFx0XHRkZXNjcmlwdGlvbjogXCJcIixcclxuXHRcdFx0XHRcdG1vZGlmaWVkOiBEYXRlLm5vdygpLFxyXG5cdFx0XHRcdFx0dHlwZTogXCJhc3NpZ25tZW50XCIsXHJcblx0XHRcdFx0XHRkb25lOiBmYWxzZVxyXG5cdFx0XHRcdH07XHJcblx0XHRcdH1cclxuXHJcblx0XHRcdC8vIHNldCB0aGUgaW5pdGFsIHRpdGxlXHJcblx0XHRcdHNldFRpdGxlKFwiRWRpdGluZ1wiKTtcclxuXHJcblx0XHRcdC8vIHNhdmUgY2hhbmdlc1xyXG5cdFx0XHR2YXIgY2hhbmdlID0gKCkgPT4ge1xyXG5cdFx0XHRcdC8vIHVwZGF0ZSB0aGUgbW9kaWZpZWQgZGF0ZVxyXG5cdFx0XHRcdGl0ZW0ubW9kaWZpZWQgPSBEYXRlLm5vdygpO1xyXG5cclxuXHRcdFx0XHQvLyBmaW5kIHRoZSBkYXRlIGFuZCB0aW1lIGlucHV0c1xyXG5cdFx0XHRcdHZhciBkYXRlSW5wdXQgPSBkb2N1bWVudC5xdWVyeVNlbGVjdG9yKFwiaW5wdXRbdHlwZT1kYXRlXVwiKTtcclxuXHRcdFx0XHR2YXIgdGltZUlucHV0ID0gZG9jdW1lbnQucXVlcnlTZWxlY3RvcihcImlucHV0W3R5cGU9dGltZV1cIik7XHJcblxyXG5cdFx0XHRcdC8vIHBhcnNlIHRoZSBkYXRlXHJcblx0XHRcdFx0aXRlbS5kYXRlID0gbmV3IERhdGUoZGF0ZUlucHV0LnZhbHVlICsgXCIgXCIgKyB0aW1lSW5wdXQudmFsdWUpO1xyXG5cclxuXHRcdFx0XHQvLyByZW1vdmUgYXNzaWduZW1udCBmaWVsZHMgZnJvbSB0YXNrc1xyXG5cdFx0XHRcdGlmKGl0ZW0udHlwZSA9PSBcInRhc2tcIikge1xyXG5cdFx0XHRcdFx0ZGVsZXRlIGl0ZW0uZGF0ZTtcclxuXHRcdFx0XHRcdGRlbGV0ZSBpdGVtLmNsYXNzO1xyXG5cdFx0XHRcdH1cclxuXHJcblx0XHRcdFx0Ly8gYWRkIGEgYnV0dG9uIGJhY2sgdG8gdGhlIHZpZXdcclxuXHRcdFx0XHRpZighYWN0aW9uU3ViKSB7XHJcblx0XHRcdFx0XHRhY3Rpb25TdWIgPSBsaWZlTGluZS5hZGRBY3Rpb24oXCJWaWV3XCIsICgpID0+IGxpZmVMaW5lLm5hdi5uYXZpZ2F0ZShcIi9pdGVtL1wiICsgaXRlbS5pZCkpO1xyXG5cclxuXHRcdFx0XHRcdGRlbGV0ZVN1YiA9IGxpZmVMaW5lLmFkZEFjdGlvbihcIkRlbGV0ZVwiLCAoKSA9PiB7XHJcblx0XHRcdFx0XHRcdC8vIHJlbW92ZSB0aGUgaXRlbVxyXG5cdFx0XHRcdFx0XHRhc3NpZ25tZW50cy5yZW1vdmUoaXRlbS5pZCk7XHJcblxyXG5cdFx0XHRcdFx0XHQvLyBuYXZpZ2F0ZSBhd2F5XHJcblx0XHRcdFx0XHRcdGxpZmVMaW5lLm5hdi5uYXZpZ2F0ZShcIi9cIik7XHJcblx0XHRcdFx0XHR9KTtcclxuXHRcdFx0XHR9XHJcblxyXG5cdFx0XHRcdGRlYm91bmNlID0gdHJ1ZTtcclxuXHJcblx0XHRcdFx0Ly8gc2F2ZSB0aGUgY2hhbmdlc1xyXG5cdFx0XHRcdGFzc2lnbm1lbnRzLnNldChpdGVtKTtcclxuXHRcdFx0fTtcclxuXHJcblx0XHRcdC8vIGhpZGUgYW5kIHNob3cgc3BlY2lmaWMgZmllbGRzIGZvciBkaWZmZXJlbnQgYXNzaWdubWVudCB0eXBlc1xyXG5cdFx0XHR2YXIgdG9nZ2xlRmllbGRzID0gKCkgPT4ge1xyXG5cdFx0XHRcdGlmKGl0ZW0udHlwZSA9PSBcInRhc2tcIikge1xyXG5cdFx0XHRcdFx0bWFwcGVkLmNsYXNzRmllbGQuc3R5bGUuZGlzcGxheSA9IFwibm9uZVwiO1xyXG5cdFx0XHRcdFx0bWFwcGVkLmRhdGVGaWVsZC5zdHlsZS5kaXNwbGF5ID0gXCJub25lXCI7XHJcblx0XHRcdFx0fVxyXG5cdFx0XHRcdGVsc2Uge1xyXG5cdFx0XHRcdFx0bWFwcGVkLmNsYXNzRmllbGQuc3R5bGUuZGlzcGxheSA9IFwiXCI7XHJcblx0XHRcdFx0XHRtYXBwZWQuZGF0ZUZpZWxkLnN0eWxlLmRpc3BsYXkgPSBcIlwiO1xyXG5cdFx0XHRcdH1cclxuXHJcblx0XHRcdFx0Ly8gZmlsbCBpbiBkYXRlIGlmIGl0IGlzIG1pc3NpbmdcclxuXHRcdFx0XHRpZighaXRlbS5kYXRlKSB7XHJcblx0XHRcdFx0XHRpdGVtLmRhdGUgPSBnZW5EYXRlKCk7XHJcblx0XHRcdFx0fVxyXG5cclxuXHRcdFx0XHRpZighaXRlbS5jbGFzcykge1xyXG5cdFx0XHRcdFx0aXRlbS5jbGFzcyA9IFwiQ2xhc3NcIjtcclxuXHRcdFx0XHR9XHJcblx0XHRcdH07XHJcblxyXG5cdFx0XHQvLyByZW5kZXIgdGhlIHVpXHJcblx0XHRcdHZhciBtYXBwZWQgPSBsaWZlTGluZS5tYWtlRG9tKHtcclxuXHRcdFx0XHRwYXJlbnQ6IGNvbnRlbnQsXHJcblx0XHRcdFx0Z3JvdXA6IFtcclxuXHRcdFx0XHRcdHtcclxuXHRcdFx0XHRcdFx0Y2xhc3NlczogXCJlZGl0b3Itcm93XCIsXHJcblx0XHRcdFx0XHRcdGNoaWxkcmVuOiBbXHJcblx0XHRcdFx0XHRcdFx0e1xyXG5cdFx0XHRcdFx0XHRcdFx0d2lkZ2V0OiBcImlucHV0XCIsXHJcblx0XHRcdFx0XHRcdFx0XHRiaW5kOiBpdGVtLFxyXG5cdFx0XHRcdFx0XHRcdFx0cHJvcDogXCJuYW1lXCIsXHJcblx0XHRcdFx0XHRcdFx0XHRjaGFuZ2VcclxuXHRcdFx0XHRcdFx0XHR9XHJcblx0XHRcdFx0XHRcdF1cclxuXHRcdFx0XHRcdH0sXHJcblx0XHRcdFx0XHR7XHJcblx0XHRcdFx0XHRcdGNsYXNzZXM6IFwiZWRpdG9yLXJvd1wiLFxyXG5cdFx0XHRcdFx0XHRjaGlsZHJlbjogW1xyXG5cdFx0XHRcdFx0XHRcdHtcclxuXHRcdFx0XHRcdFx0XHRcdHdpZGdldDogXCJ0b2dnbGUtYnRuc1wiLFxyXG5cdFx0XHRcdFx0XHRcdFx0YnRuczogW1xyXG5cdFx0XHRcdFx0XHRcdFx0XHR7IHRleHQ6IFwiQXNzaWdubWVudFwiLCB2YWx1ZTogXCJhc3NpZ25tZW50XCIgfSxcclxuXHRcdFx0XHRcdFx0XHRcdFx0eyB0ZXh0OiBcIlRhc2tcIiwgdmFsdWU6IFwidGFza1wiIH0sXHJcblx0XHRcdFx0XHRcdFx0XHRdLFxyXG5cdFx0XHRcdFx0XHRcdFx0dmFsdWU6IGl0ZW0udHlwZSxcclxuXHRcdFx0XHRcdFx0XHRcdGNoYW5nZTogdHlwZSA9PiB7XHJcblx0XHRcdFx0XHRcdFx0XHRcdC8vIHVwZGF0ZSB0aGUgaXRlbSB0eXBlXHJcblx0XHRcdFx0XHRcdFx0XHRcdGl0ZW0udHlwZSA9IHR5cGU7XHJcblxyXG5cdFx0XHRcdFx0XHRcdFx0XHQvLyBoaWRlL3Nob3cgc3BlY2lmaWMgZmllbGRzXHJcblx0XHRcdFx0XHRcdFx0XHRcdHRvZ2dsZUZpZWxkcygpO1xyXG5cclxuXHRcdFx0XHRcdFx0XHRcdFx0Ly8gZW1pdCB0aGUgY2hhbmdlXHJcblx0XHRcdFx0XHRcdFx0XHRcdGNoYW5nZSgpO1xyXG5cdFx0XHRcdFx0XHRcdFx0fVxyXG5cdFx0XHRcdFx0XHRcdH1cclxuXHRcdFx0XHRcdFx0XVxyXG5cdFx0XHRcdFx0fSxcclxuXHRcdFx0XHRcdHtcclxuXHRcdFx0XHRcdFx0bmFtZTogXCJjbGFzc0ZpZWxkXCIsXHJcblx0XHRcdFx0XHRcdGNsYXNzZXM6IFwiZWRpdG9yLXJvd1wiLFxyXG5cdFx0XHRcdFx0XHRjaGlsZHJlbjogW1xyXG5cdFx0XHRcdFx0XHRcdHtcclxuXHRcdFx0XHRcdFx0XHRcdHdpZGdldDogXCJpbnB1dFwiLFxyXG5cdFx0XHRcdFx0XHRcdFx0YmluZDogaXRlbSxcclxuXHRcdFx0XHRcdFx0XHRcdHByb3A6IFwiY2xhc3NcIixcclxuXHRcdFx0XHRcdFx0XHRcdGNoYW5nZVxyXG5cdFx0XHRcdFx0XHRcdH1cclxuXHRcdFx0XHRcdFx0XVxyXG5cdFx0XHRcdFx0fSxcclxuXHRcdFx0XHRcdHtcclxuXHRcdFx0XHRcdFx0bmFtZTogXCJkYXRlRmllbGRcIixcclxuXHRcdFx0XHRcdFx0Y2xhc3NlczogXCJlZGl0b3Itcm93XCIsXHJcblx0XHRcdFx0XHRcdGNoaWxkcmVuOiBbXHJcblx0XHRcdFx0XHRcdFx0e1xyXG5cdFx0XHRcdFx0XHRcdFx0d2lkZ2V0OiBcImlucHV0XCIsXHJcblx0XHRcdFx0XHRcdFx0XHR0eXBlOiBcImRhdGVcIixcclxuXHRcdFx0XHRcdFx0XHRcdHZhbHVlOiBpdGVtLmRhdGUgJiYgYCR7aXRlbS5kYXRlLmdldEZ1bGxZZWFyKCl9LSR7cGFkKGl0ZW0uZGF0ZS5nZXRNb250aCgpICsgMSl9LSR7cGFkKGl0ZW0uZGF0ZS5nZXREYXRlKCkpfWAsXHJcblx0XHRcdFx0XHRcdFx0XHRjaGFuZ2VcclxuXHRcdFx0XHRcdFx0XHR9LFxyXG5cdFx0XHRcdFx0XHRcdHtcclxuXHRcdFx0XHRcdFx0XHRcdHdpZGdldDogXCJpbnB1dFwiLFxyXG5cdFx0XHRcdFx0XHRcdFx0dHlwZTogXCJ0aW1lXCIsXHJcblx0XHRcdFx0XHRcdFx0XHR2YWx1ZTogaXRlbS5kYXRlICYmIGAke2l0ZW0uZGF0ZS5nZXRIb3VycygpfToke3BhZChpdGVtLmRhdGUuZ2V0TWludXRlcygpKX1gLFxyXG5cdFx0XHRcdFx0XHRcdFx0Y2hhbmdlXHJcblx0XHRcdFx0XHRcdFx0fVxyXG5cdFx0XHRcdFx0XHRdXHJcblx0XHRcdFx0XHR9LFxyXG5cdFx0XHRcdFx0e1xyXG5cdFx0XHRcdFx0XHRjbGFzc2VzOiBcInRleHRhcmVhLXdyYXBwZXJcIixcclxuXHRcdFx0XHRcdFx0Y2hpbGRyZW46IFtcclxuXHRcdFx0XHRcdFx0XHR7XHJcblx0XHRcdFx0XHRcdFx0XHR3aWRnZXQ6IFwiaW5wdXRcIixcclxuXHRcdFx0XHRcdFx0XHRcdHRhZzogXCJ0ZXh0YXJlYVwiLFxyXG5cdFx0XHRcdFx0XHRcdFx0Y2xhc3NlczogXCJ0ZXh0YXJlYS1maWxsXCIsXHJcblx0XHRcdFx0XHRcdFx0XHRwbGFjZWhvbGRlcjogXCJEZXNjcmlwdGlvblwiLFxyXG5cdFx0XHRcdFx0XHRcdFx0YmluZDogaXRlbSxcclxuXHRcdFx0XHRcdFx0XHRcdHByb3A6IFwiZGVzY3JpcHRpb25cIixcclxuXHRcdFx0XHRcdFx0XHRcdGNoYW5nZVxyXG5cdFx0XHRcdFx0XHRcdH1cclxuXHRcdFx0XHRcdFx0XVxyXG5cdFx0XHRcdFx0fVxyXG5cdFx0XHRcdF1cclxuXHRcdFx0fSk7XHJcblxyXG5cdFx0XHQvLyBzaG93IHRoZSBmaWVsZHMgZm9yIHRoaXMgaXRlbSB0eXBlXHJcblx0XHRcdHRvZ2dsZUZpZWxkcygpO1xyXG5cdFx0fSk7XHJcblxyXG5cdFx0Ly8gcmVtb3ZlIHRoZSBzdWJzY3JpcHRpb24gd2hlbiB0aGlzIHZpZXcgaXMgZGVzdHJveWVkXHJcblx0XHRkaXNwb3NhYmxlLmFkZChjaGFuZ2VTdWIpO1xyXG5cdH1cclxufSk7XHJcblxyXG4vLyBhZGQgYSBsZWFkaW5nIDAgaWYgYSBudW1iZXIgaXMgbGVzcyB0aGFuIDEwXHJcbnZhciBwYWQgPSBudW1iZXIgPT4gKG51bWJlciA8IDEwKSA/IFwiMFwiICsgbnVtYmVyIDogbnVtYmVyO1xyXG5cclxuLy8gY3JlYXRlIGEgZGF0ZSBvZiB0b2RheSBhdCAxMTo1OXBtXHJcbnZhciBnZW5EYXRlID0gKCkgPT4ge1xyXG5cdHZhciBkYXRlID0gbmV3IERhdGUoKTtcclxuXHJcblx0Ly8gc2V0IHRoZSB0aW1lXHJcblx0ZGF0ZS5zZXRIb3VycygyMyk7XHJcblx0ZGF0ZS5zZXRNaW51dGVzKDU5KTtcclxuXHJcblx0cmV0dXJuIGRhdGU7XHJcbn07XHJcbiIsIi8qKlxyXG4gKiBUaGUgdmlldyBmb3IgYW4gYXNzaWdubWVudFxyXG4gKi9cclxuXHJcbnZhciB7ZGF5c0Zyb21Ob3csIHN0cmluZ2lmeURhdGV9ID0gcmVxdWlyZShcIi4uL3V0aWwvZGF0ZVwiKTtcclxudmFyIHthc3NpZ25tZW50c30gPSByZXF1aXJlKFwiLi4vZGF0YS1zdG9yZXNcIik7XHJcblxyXG5saWZlTGluZS5uYXYucmVnaXN0ZXIoe1xyXG5cdG1hdGNoZXI6IC9eXFwvaXRlbVxcLyguKz8pJC8sXHJcblxyXG5cdG1ha2Uoe21hdGNoLCBzZXRUaXRsZSwgY29udGVudCwgZGlzcG9zYWJsZX0pIHtcclxuXHRcdHZhciBhY3Rpb25Eb25lU3ViLCBhY3Rpb25FZGl0U3ViO1xyXG5cclxuXHQgXHRkaXNwb3NhYmxlLmFkZChcclxuXHRcdFx0YXNzaWdubWVudHMucXVlcnkoeyBpZDogbWF0Y2hbMV0gfSwgZnVuY3Rpb24oW2l0ZW1dKSB7XHJcblx0XHRcdFx0Ly8gY2xlYXIgdGhlIGNvbnRlbnRcclxuXHRcdFx0XHRjb250ZW50LmlubmVySFRNTCA9IFwiXCI7XHJcblxyXG5cdFx0XHRcdC8vIHJlbW92ZSB0aGUgb2xkIGFjdGlvblxyXG5cdFx0XHRcdGlmKGFjdGlvbkRvbmVTdWIpIHtcclxuXHRcdFx0XHRcdGFjdGlvbkRvbmVTdWIudW5zdWJzY3JpYmUoKTtcclxuXHRcdFx0XHRcdGFjdGlvbkVkaXRTdWIudW5zdWJzY3JpYmUoKTtcclxuXHRcdFx0XHR9XHJcblxyXG5cdFx0XHRcdC8vIG5vIHN1Y2ggYXNzaWdubWVudFxyXG5cdFx0XHRcdGlmKCFpdGVtKSB7XHJcblx0XHRcdFx0XHRzZXRUaXRsZShcIk5vdCBmb3VuZFwiKTtcclxuXHJcblx0XHRcdFx0XHRsaWZlTGluZS5tYWtlRG9tKHtcclxuXHRcdFx0XHRcdFx0cGFyZW50OiBjb250ZW50LFxyXG5cdFx0XHRcdFx0XHRjbGFzc2VzOiBcImNvbnRlbnQtcGFkZGVkXCIsXHJcblx0XHRcdFx0XHRcdGNoaWxkcmVuOiBbXHJcblx0XHRcdFx0XHRcdFx0e1xyXG5cdFx0XHRcdFx0XHRcdFx0dGFnOiBcInNwYW5cIixcclxuXHRcdFx0XHRcdFx0XHRcdHRleHQ6IFwiVGhlIGFzc2lnbm1lbnQgeW91IHdoZXJlIGxvb2tpbmcgZm9yIGNvdWxkIG5vdCBiZSBmb3VuZC4gXCJcclxuXHRcdFx0XHRcdFx0XHR9LFxyXG5cdFx0XHRcdFx0XHRcdHtcclxuXHRcdFx0XHRcdFx0XHRcdHdpZGdldDogXCJsaW5rXCIsXHJcblx0XHRcdFx0XHRcdFx0XHRocmVmOiBcIi9cIixcclxuXHRcdFx0XHRcdFx0XHRcdHRleHQ6IFwiR28gaG9tZS5cIlxyXG5cdFx0XHRcdFx0XHRcdH1cclxuXHRcdFx0XHRcdFx0XVxyXG5cdFx0XHRcdFx0fSk7XHJcblxyXG5cdFx0XHRcdFx0cmV0dXJuO1xyXG5cdFx0XHRcdH1cclxuXHJcblx0XHRcdFx0Ly8gc2V0IHRoZSB0aXRsZSBmb3IgdGhlIGNvbnRlbnRcclxuXHRcdFx0XHRzZXRUaXRsZShcIkFzc2lnbm1lbnRcIik7XHJcblxyXG5cdFx0XHRcdC8vIG1hcmsgdGhlIGl0ZW0gYXMgZG9uZVxyXG5cdFx0XHRcdGFjdGlvbkRvbmVTdWIgPSBsaWZlTGluZS5hZGRBY3Rpb24oaXRlbS5kb25lID8gXCJEb25lXCIgOiBcIk5vdCBkb25lXCIsICgpID0+IHtcclxuXHRcdFx0XHRcdC8vIG1hcmsgdGhlIGl0ZW0gZG9uZVxyXG5cdFx0XHRcdFx0aXRlbS5kb25lID0gIWl0ZW0uZG9uZTtcclxuXHJcblx0XHRcdFx0XHQvLyB1cGRhdGUgdGhlIG1vZGlmaWVkIHRpbWVcclxuXHRcdFx0XHRcdGl0ZW0ubW9kaWZpZWQgPSBEYXRlLm5vdygpO1xyXG5cclxuXHRcdFx0XHRcdC8vIHNhdmUgdGhlIGNoYW5nZVxyXG5cdFx0XHRcdFx0YXNzaWdubWVudHMuc2V0KGl0ZW0pO1xyXG5cdFx0XHRcdH0pO1xyXG5cclxuXHRcdFx0XHQvLyBlZGl0IHRoZSBpdGVtXHJcblx0XHRcdFx0YWN0aW9uRWRpdFN1YiA9IGxpZmVMaW5lLmFkZEFjdGlvbihcIkVkaXRcIixcclxuXHRcdFx0XHRcdCgpID0+IGxpZmVMaW5lLm5hdi5uYXZpZ2F0ZShcIi9lZGl0L1wiICsgaXRlbS5pZCkpO1xyXG5cclxuXHRcdFx0XHQvLyB0aW1lcyB0byBza2lwXHJcblx0XHRcdFx0dmFyIHNraXBUaW1lcyA9IFtcclxuXHRcdFx0XHRcdHsgaG91cjogMjMsIG1pbnV0ZTogNTkgfVxyXG5cdFx0XHRcdF07XHJcblxyXG5cdFx0XHRcdGxpZmVMaW5lLm1ha2VEb20oe1xyXG5cdFx0XHRcdFx0cGFyZW50OiBjb250ZW50LFxyXG5cdFx0XHRcdFx0Y2xhc3NlczogXCJjb250ZW50LXBhZGRlZFwiLFxyXG5cdFx0XHRcdFx0Y2hpbGRyZW46IFtcclxuXHRcdFx0XHRcdFx0e1xyXG5cdFx0XHRcdFx0XHRcdGNsYXNzZXM6IFwiYXNzaWdubWVudC1uYW1lXCIsXHJcblx0XHRcdFx0XHRcdFx0dGV4dDogaXRlbS5uYW1lXHJcblx0XHRcdFx0XHRcdH0sXHJcblx0XHRcdFx0XHRcdHtcclxuXHRcdFx0XHRcdFx0XHRjbGFzc2VzOiBcImFzc2lnbm1lbnQtaW5mby1yb3dcIixcclxuXHRcdFx0XHRcdFx0XHRjaGlsZHJlbjogW1xyXG5cdFx0XHRcdFx0XHRcdFx0e1xyXG5cdFx0XHRcdFx0XHRcdFx0XHRjbGFzc2VzOiBcImFzc2lnbm1lbnQtaW5mby1ncm93XCIsXHJcblx0XHRcdFx0XHRcdFx0XHRcdHRleHQ6IGl0ZW0uY2xhc3NcclxuXHRcdFx0XHRcdFx0XHRcdH0sXHJcblx0XHRcdFx0XHRcdFx0XHR7XHJcblx0XHRcdFx0XHRcdFx0XHRcdHRleHQ6IGl0ZW0uZGF0ZSAmJiBzdHJpbmdpZnlEYXRlKGl0ZW0uZGF0ZSwgeyBpbmNsdWRlVGltZTogdHJ1ZSwgc2tpcFRpbWVzIH0pXHJcblx0XHRcdFx0XHRcdFx0XHR9XHJcblx0XHRcdFx0XHRcdFx0XVxyXG5cdFx0XHRcdFx0XHR9LFxyXG5cdFx0XHRcdFx0XHR7XHJcblx0XHRcdFx0XHRcdFx0Y2xhc3NlczogXCJhc3NpZ25tZW50LWRlc2NyaXB0aW9uXCIsXHJcblx0XHRcdFx0XHRcdFx0dGV4dDogaXRlbS5kZXNjcmlwdGlvblxyXG5cdFx0XHRcdFx0XHR9XHJcblx0XHRcdFx0XHRdXHJcblx0XHRcdFx0fSk7XHJcblx0XHRcdH0pXHJcblx0XHQpO1xyXG5cdH1cclxufSk7XHJcbiIsIi8qKlxyXG4gKiBEaXNwbGF5IGEgbGlzdCBvZiB1cGNvbW1pbmcgYXNzaWdubWVudHNcclxuICovXHJcblxyXG52YXIge2RheXNGcm9tTm93LCBpc1NhbWVEYXRlLCBzdHJpbmdpZnlEYXRlLCBzdHJpbmdpZnlUaW1lLCBpc1Nvb25lckRhdGV9ID0gcmVxdWlyZShcIi4uL3V0aWwvZGF0ZVwiKTtcclxudmFyIHthc3NpZ25tZW50c30gPSByZXF1aXJlKFwiLi4vZGF0YS1zdG9yZXNcIik7XHJcblxyXG4vLyBhbGwgdGhlIGRpZmZlcmVudCBsaXN0c1xyXG5jb25zdCBMSVNUUyA9IFtcclxuXHR7XHJcblx0XHR1cmw6IFwiL3dlZWtcIixcclxuXHRcdHRpdGxlOiBcIlRoaXMgd2Vla1wiLFxyXG5cdFx0Y3JlYXRlQ3R4OiAoKSA9PiAoe1xyXG5cdFx0XHQvLyBkYXlzIHRvIHRoZSBlbmQgb2YgdGhpcyB3ZWVrXHJcblx0XHRcdGVuZERhdGU6IGRheXNGcm9tTm93KDcgLSAobmV3IERhdGUoKSkuZ2V0RGF5KCkpLFxyXG5cdFx0XHQvLyB0b2RheXMgZGF0ZVxyXG5cdFx0XHR0b2RheTogbmV3IERhdGUoKVxyXG5cdFx0fSksXHJcblx0XHQvLyBzaG93IGFsbCBhdCByZWFzb25hYmxlIG51bWJlciBvZiBpbmNvbXBsZXRlIGFzc2lnbm1lbnRzXHJcblx0XHRmaWx0ZXI6IChpdGVtLCB7dG9kYXksIGVuZERhdGV9KSA9PiB7XHJcblx0XHRcdC8vIHNob3cgYWxsIHRhc2tzXHJcblx0XHRcdGlmKGl0ZW0udHlwZSA9PSBcInRhc2tcIikgcmV0dXJuIHRydWU7XHJcblxyXG5cdFx0XHQvLyBjaGVjayBpZiB0aGUgaXRlbSBpcyBwYXN0IHRoaXMgd2Vla1xyXG5cdFx0XHRpZighaXNTb29uZXJEYXRlKGl0ZW0uZGF0ZSwgZW5kRGF0ZSkgJiYgIWlzU2FtZURhdGUoaXRlbS5kYXRlLCBlbmREYXRlKSkgcmV0dXJuO1xyXG5cclxuXHRcdFx0Ly8gY2hlY2sgaWYgdGhlIGRhdGUgaXMgYmVmb3JlIHRvZGF5XHJcblx0XHRcdGlmKGlzU29vbmVyRGF0ZShpdGVtLmRhdGUsIHRvZGF5KSkgcmV0dXJuO1xyXG5cclxuXHRcdFx0cmV0dXJuIHRydWU7XHJcblx0XHR9LFxyXG5cdFx0cXVlcnk6IHsgZG9uZTogZmFsc2UgfVxyXG5cdH0sXHJcblx0e1xyXG5cdFx0dXJsOiBcIi91cGNvbWluZ1wiLFxyXG5cdFx0cXVlcnk6IHsgZG9uZTogZmFsc2UgfSxcclxuXHRcdHRpdGxlOiBcIlVwY29taW5nXCJcclxuXHR9LFxyXG5cdHtcclxuXHRcdHVybDogXCIvZG9uZVwiLFxyXG5cdFx0cXVlcnk6IHsgZG9uZTogdHJ1ZSB9LFxyXG5cdFx0dGl0bGU6IFwiRG9uZVwiXHJcblx0fVxyXG5dO1xyXG5cclxuLy8gYWRkIGxpc3QgdmlldyBsaW5rcyB0byB0aGUgbmF2YmFyXHJcbmV4cG9ydHMuaW5pdE5hdkJhciA9IGZ1bmN0aW9uKCkge1xyXG5cdExJU1RTLmZvckVhY2gobGlzdCA9PiBsaWZlTGluZS5hZGROYXZDb21tYW5kKGxpc3QudGl0bGUsIGxpc3QudXJsKSk7XHJcbn07XHJcblxyXG5saWZlTGluZS5uYXYucmVnaXN0ZXIoe1xyXG5cdG1hdGNoZXIodXJsKSB7XHJcblx0XHRyZXR1cm4gTElTVFMuZmluZChsaXN0ID0+IGxpc3QudXJsID09IHVybCk7XHJcblx0fSxcclxuXHJcblx0Ly8gbWFrZSB0aGUgbGlzdFxyXG5cdG1ha2Uoe3NldFRpdGxlLCBjb250ZW50LCBkaXNwb3NhYmxlLCBtYXRjaH0pIHtcclxuXHRcdGRpc3Bvc2FibGUuYWRkKFxyXG5cdFx0XHRhc3NpZ25tZW50cy5xdWVyeShtYXRjaC5xdWVyeSB8fCB7fSwgZnVuY3Rpb24oZGF0YSkge1xyXG5cdFx0XHRcdC8vIGNsZWFyIHRoZSBjb250ZW50XHJcblx0XHRcdFx0Y29udGVudC5pbm5lckhUTUwgPSBcIlwiO1xyXG5cclxuXHRcdFx0XHQvLyBzZXQgdGhlIHBhZ2UgdGl0bGVcclxuXHRcdFx0XHRzZXRUaXRsZShtYXRjaC50aXRsZSk7XHJcblxyXG5cdFx0XHRcdC8vIHRoZSBjb250ZXh0IGZvciB0aGUgZmlsdGVyIGZ1bmN0aW9uXHJcblx0XHRcdFx0dmFyIGN0eDtcclxuXHJcblx0XHRcdFx0aWYobWF0Y2guY3JlYXRlQ3R4KSB7XHJcblx0XHRcdFx0XHRjdHggPSBtYXRjaC5jcmVhdGVDdHgoKTtcclxuXHRcdFx0XHR9XHJcblxyXG5cdFx0XHRcdC8vIHJ1biB0aGUgZmlsdGVyIGZ1bmN0aW9uXHJcblx0XHRcdFx0aWYobWF0Y2guZmlsdGVyKSB7XHJcblx0XHRcdFx0XHRkYXRhID0gZGF0YS5maWx0ZXIoaXRlbSA9PiBtYXRjaC5maWx0ZXIoaXRlbSwgY3R4KSk7XHJcblx0XHRcdFx0fVxyXG5cclxuXHRcdFx0XHQvLyBzb3J0IHRoZSBhc3NpbmdtZW50c1xyXG5cdFx0XHRcdGRhdGEuc29ydCgoYSwgYikgPT4ge1xyXG5cdFx0XHRcdFx0Ly8gdGFza3MgYXJlIGJlbG93IGFzc2lnbm1lbnRzXHJcblx0XHRcdFx0XHRpZihhLnR5cGUgPT0gXCJ0YXNrXCIgJiYgYi50eXBlICE9IFwidGFza1wiKSByZXR1cm4gMTtcclxuXHRcdFx0XHRcdGlmKGEudHlwZSAhPSBcInRhc2tcIiAmJiBiLnR5cGUgPT0gXCJ0YXNrXCIpIHJldHVybiAtMTtcclxuXHJcblx0XHRcdFx0XHQvLyBzb3J0IGJ5IGR1ZSBkYXRlXHJcblx0XHRcdFx0XHRpZihhLnR5cGUgPT0gXCJhc3NpZ25tZW50XCIgJiYgYi50eXBlID09IFwiYXNzaWdubWVudFwiKSB7XHJcblx0XHRcdFx0XHRcdGlmKGEuZGF0ZS5nZXRUaW1lKCkgIT0gYi5kYXRlLmdldFRpbWUoKSkge1xyXG5cdFx0XHRcdFx0XHRcdHJldHVybiBhLmRhdGUuZ2V0VGltZSgpIC0gYi5kYXRlLmdldFRpbWUoKTtcclxuXHRcdFx0XHRcdFx0fVxyXG5cdFx0XHRcdFx0fVxyXG5cclxuXHRcdFx0XHRcdC8vIG9yZGVyIGJ5IG5hbWVcclxuXHRcdFx0XHRcdGlmKGEubmFtZSA8IGIubmFtZSkgcmV0dXJuIC0xO1xyXG5cdFx0XHRcdFx0aWYoYS5uYW1lID4gYi5uYW1lKSByZXR1cm4gMTtcclxuXHJcblx0XHRcdFx0XHRyZXR1cm4gMDtcclxuXHRcdFx0XHR9KTtcclxuXHJcblx0XHRcdFx0Ly8gbWFrZSB0aGUgZ3JvdXBzXHJcblx0XHRcdFx0dmFyIGdyb3VwcyA9IHt9O1xyXG5cclxuXHRcdFx0XHQvLyByZW5kZXIgdGhlIGxpc3RcclxuXHRcdFx0XHRkYXRhLmZvckVhY2goKGl0ZW0sIGkpID0+IHtcclxuXHRcdFx0XHRcdC8vIGdldCB0aGUgaGVhZGVyIG5hbWVcclxuXHRcdFx0XHRcdHZhciBkYXRlU3RyID0gaXRlbS50eXBlID09IFwidGFza1wiID8gXCJUYXNrc1wiIDogc3RyaW5naWZ5RGF0ZShpdGVtLmRhdGUpO1xyXG5cclxuXHRcdFx0XHRcdC8vIG1ha2Ugc3VyZSB0aGUgaGVhZGVyIGV4aXN0c1xyXG5cdFx0XHRcdFx0Z3JvdXBzW2RhdGVTdHJdIHx8IChncm91cHNbZGF0ZVN0cl0gPSBbXSk7XHJcblxyXG5cdFx0XHRcdFx0Ly8gYWRkIHRoZSBpdGVtIHRvIHRoZSBsaXN0XHJcblx0XHRcdFx0XHR2YXIgaXRlbXMgPSBbXHJcblx0XHRcdFx0XHRcdHsgdGV4dDogaXRlbS5uYW1lLCBncm93OiB0cnVlIH1cclxuXHRcdFx0XHRcdF07XHJcblxyXG5cdFx0XHRcdFx0aWYoaXRlbS50eXBlICE9IFwidGFza1wiKSB7XHJcblx0XHRcdFx0XHRcdC8vIHNob3cgdGhlIGVuZCB0aW1lIGZvciBhbnkgbm9uIDExOjU5cG0gdGltZXNcclxuXHRcdFx0XHRcdFx0aWYoaXRlbS5kYXRlLmdldEhvdXJzKCkgIT0gMjMgfHwgaXRlbS5kYXRlLmdldE1pbnV0ZXMoKSAhPSA1OSkge1xyXG5cdFx0XHRcdFx0XHRcdGl0ZW1zLnB1c2goc3RyaW5naWZ5VGltZShpdGVtLmRhdGUpKTtcclxuXHRcdFx0XHRcdFx0fVxyXG5cclxuXHRcdFx0XHRcdFx0Ly8gc2hvdyB0aGUgY2xhc3NcclxuXHRcdFx0XHRcdFx0aXRlbXMucHVzaChpdGVtLmNsYXNzKTtcclxuXHRcdFx0XHRcdH1cclxuXHJcblx0XHRcdFx0XHRncm91cHNbZGF0ZVN0cl0ucHVzaCh7XG5cdFx0XHRcdFx0XHRocmVmOiBgL2l0ZW0vJHtpdGVtLmlkfWAsXG5cdFx0XHRcdFx0XHRpdGVtc1xyXG5cdFx0XHRcdFx0fSk7XHJcblx0XHRcdFx0fSk7XHJcblxyXG5cdFx0XHRcdC8vIGRpc3BsYXkgYWxsIGl0ZW1zXHJcblx0XHRcdFx0bGlmZUxpbmUubWFrZURvbSh7XHJcblx0XHRcdFx0XHRwYXJlbnQ6IGNvbnRlbnQsXHJcblx0XHRcdFx0XHR3aWRnZXQ6IFwibGlzdFwiLFxyXG5cdFx0XHRcdFx0aXRlbXM6IGdyb3Vwc1xyXG5cdFx0XHRcdH0pO1xyXG5cdFx0XHR9KVxyXG5cdFx0KTtcclxuXHR9XHJcbn0pO1xyXG4iLCIvKipcclxuICogU2hvdyBhIGxvZ2luIGJ1dHRvbiB0byB0aGUgdXNlclxyXG4gKi9cclxuXHJcbmxpZmVMaW5lLm5hdi5yZWdpc3Rlcih7XHJcblx0bWF0Y2hlcjogXCIvbG9naW5cIixcclxuXHJcblx0bWFrZSh7c2V0VGl0bGUsIGNvbnRlbnR9KSB7XHJcblx0XHQvLyBzZXQgdGhlIHBhZ2UgdGl0bGVcclxuXHRcdHNldFRpdGxlKFwiTG9naW5cIik7XHJcblxyXG5cdFx0Ly8gdGhlIHVzZXJzIGNyZWRlbnRpYWxzXHJcblx0XHR2YXIgYXV0aCA9IHt9O1xyXG5cclxuXHRcdC8vIGNyZWF0ZSB0aGUgbG9naW4gZm9ybVxyXG5cdFx0dmFyIHt1c2VybmFtZSwgcGFzc3dvcmQsIG1zZ30gPSBsaWZlTGluZS5tYWtlRG9tKHtcclxuXHRcdFx0cGFyZW50OiBjb250ZW50LFxyXG5cdFx0XHR0YWc6IFwiZm9ybVwiLFxyXG5cdFx0XHRjbGFzc2VzOiBcImNvbnRlbnQtcGFkZGVkXCIsXHJcblx0XHRcdGNoaWxkcmVuOiBbXHJcblx0XHRcdFx0e1xyXG5cdFx0XHRcdFx0Y2xhc3NlczogXCJlZGl0b3Itcm93XCIsXHJcblx0XHRcdFx0XHRjaGlsZHJlbjogW1xyXG5cdFx0XHRcdFx0XHR7XHJcblx0XHRcdFx0XHRcdFx0d2lkZ2V0OiBcImlucHV0XCIsXHJcblx0XHRcdFx0XHRcdFx0YmluZDogYXV0aCxcclxuXHRcdFx0XHRcdFx0XHRwcm9wOiBcInVzZXJuYW1lXCIsXHJcblx0XHRcdFx0XHRcdFx0cGxhY2Vob2xkZXI6IFwiVXNlcm5hbWVcIlxyXG5cdFx0XHRcdFx0XHR9XHJcblx0XHRcdFx0XHRdXHJcblx0XHRcdFx0fSxcclxuXHRcdFx0XHR7XHJcblx0XHRcdFx0XHRjbGFzc2VzOiBcImVkaXRvci1yb3dcIixcclxuXHRcdFx0XHRcdGNoaWxkcmVuOiBbXHJcblx0XHRcdFx0XHRcdHtcclxuXHRcdFx0XHRcdFx0XHR3aWRnZXQ6IFwiaW5wdXRcIixcclxuXHRcdFx0XHRcdFx0XHRiaW5kOiBhdXRoLFxyXG5cdFx0XHRcdFx0XHRcdHByb3A6IFwicGFzc3dvcmRcIixcclxuXHRcdFx0XHRcdFx0XHR0eXBlOiBcInBhc3N3b3JkXCIsXHJcblx0XHRcdFx0XHRcdFx0cGxhY2Vob2xkZXI6IFwiUGFzc3dvcmRcIlxyXG5cdFx0XHRcdFx0XHR9XHJcblx0XHRcdFx0XHRdXHJcblx0XHRcdFx0fSxcclxuXHRcdFx0XHR7XHJcblx0XHRcdFx0XHR0YWc6IFwiYnV0dG9uXCIsXHJcblx0XHRcdFx0XHR0ZXh0OiBcIkxvZ2luXCIsXHJcblx0XHRcdFx0XHRjbGFzc2VzOiBcImZhbmN5LWJ1dHRvblwiLFxyXG5cdFx0XHRcdFx0YXR0cnM6IHtcclxuXHRcdFx0XHRcdFx0dHlwZTogXCJzdWJtaXRcIlxyXG5cdFx0XHRcdFx0fVxyXG5cdFx0XHRcdH0sXHJcblx0XHRcdFx0e1xyXG5cdFx0XHRcdFx0Y2xhc3NlczogXCJlcnJvci1tc2dcIixcclxuXHRcdFx0XHRcdG5hbWU6IFwibXNnXCJcclxuXHRcdFx0XHR9XHJcblx0XHRcdF0sXHJcblx0XHRcdG9uOiB7XHJcblx0XHRcdFx0c3VibWl0OiBlID0+IHtcclxuXHRcdFx0XHRcdGUucHJldmVudERlZmF1bHQoKTtcclxuXHJcblx0XHRcdFx0XHQvLyBzZW5kIHRoZSBsb2dpbiByZXF1ZXN0XHJcblx0XHRcdFx0XHRmZXRjaChcIi9hcGkvYXV0aC9sb2dpblwiLCB7XHJcblx0XHRcdFx0XHRcdG1ldGhvZDogXCJQT1NUXCIsXHJcblx0XHRcdFx0XHRcdGNyZWRlbnRpYWxzOiBcImluY2x1ZGVcIixcclxuXHRcdFx0XHRcdFx0Ym9keTogSlNPTi5zdHJpbmdpZnkoYXV0aClcclxuXHRcdFx0XHRcdH0pXHJcblxyXG5cdFx0XHRcdFx0Ly8gcGFyc2UgdGhlIGpzb25cclxuXHRcdFx0XHRcdC50aGVuKHJlcyA9PiByZXMuanNvbigpKVxyXG5cclxuXHRcdFx0XHRcdC8vIHByb2Nlc3MgdGhlIHJlc3BvbnNlXHJcblx0XHRcdFx0XHQudGhlbihyZXMgPT4ge1xyXG5cdFx0XHRcdFx0XHQvLyBsb2dpbiBzdWNlZWRlZCBnbyBob21lXHJcblx0XHRcdFx0XHRcdGlmKHJlcy5zdGF0dXMgPT0gXCJzdWNjZXNzXCIpIHtcclxuXHRcdFx0XHRcdFx0XHRsaWZlTGluZS5uYXYubmF2aWdhdGUoXCIvXCIpO1xyXG5cclxuXHRcdFx0XHRcdFx0XHQvLyBzeW5jIG5vdyB0aGF0IHdlIGFyZSBsb2dnZWQgaW5cclxuXHRcdFx0XHRcdFx0XHRpZihsaWZlTGluZS5zeW5jKSB7XHJcblx0XHRcdFx0XHRcdFx0XHRsaWZlTGluZS5zeW5jKCk7XHJcblx0XHRcdFx0XHRcdFx0fVxyXG5cclxuXHRcdFx0XHRcdFx0XHRyZXR1cm47XHJcblx0XHRcdFx0XHRcdH1cclxuXHJcblx0XHRcdFx0XHRcdC8vIGxvZ2luIGZhaWxlZFxyXG5cdFx0XHRcdFx0XHRpZihyZXMuc3RhdHVzID09IFwiZmFpbFwiKSB7XHJcblx0XHRcdFx0XHRcdFx0ZXJyb3JNc2coXCJMb2dpbiBmYWlsZWRcIik7XHJcblx0XHRcdFx0XHRcdH1cclxuXHRcdFx0XHRcdH0pO1xyXG5cdFx0XHRcdH1cclxuXHRcdFx0fVxyXG5cdFx0fSk7XHJcblxyXG5cdFx0Ly8gZGlzcGxheSBhbiBlcnJvciBtZXNzYWdlXHJcblx0XHR2YXIgZXJyb3JNc2cgPSBmdW5jdGlvbih0ZXh0KSB7XHJcblx0XHRcdG1zZy5pbm5lclRleHQgPSB0ZXh0O1xyXG5cdFx0fTtcclxuXHR9XHJcbn0pO1xyXG5cclxuLy8gbG9nb3V0XHJcbmxpZmVMaW5lLmxvZ291dCA9IGZ1bmN0aW9uKCkge1xyXG5cdC8vIHNlbmQgdGhlIGxvZ291dCByZXF1ZXN0XHJcblx0ZmV0Y2goXCIvYXBpL2F1dGgvbG9nb3V0XCIsIHtcclxuXHRcdGNyZWRlbnRpYWxzOiBcImluY2x1ZGVcIlxyXG5cdH0pXHJcblxyXG5cdC8vIGdvIHRvIHRoZSBsb2dpbiBwYWdlXHJcblx0LnRoZW4oKCkgPT4gbGlmZUxpbmUubmF2Lm5hdmlnYXRlKFwiL2xvZ2luXCIpKTtcclxufTtcclxuIiwiLyoqXHJcbiAqIEEgbGlzdCBvZiB0aGluZ3MgdG9kb1xyXG4gKi9cclxuXHJcbnZhciB7ZGF5c0Zyb21Ob3csIGlzU2FtZURhdGUsIHN0cmluZ2lmeVRpbWV9ID0gcmVxdWlyZShcIi4uL3V0aWwvZGF0ZVwiKTtcclxudmFyIHthc3NpZ25tZW50c30gPSByZXF1aXJlKFwiLi4vZGF0YS1zdG9yZXNcIik7XHJcblxyXG5saWZlTGluZS5uYXYucmVnaXN0ZXIoe1xyXG5cdG1hdGNoZXI6IFwiL1wiLFxyXG5cclxuXHRtYWtlKHtzZXRUaXRsZSwgY29udGVudCwgZGlzcG9zYWJsZX0pIHtcclxuXHRcdHNldFRpdGxlKFwiVG9kb1wiKTtcclxuXHJcblx0XHQvLyBsb2FkIHRoZSBpdGVtc1xyXG5cdFx0ZGlzcG9zYWJsZS5hZGQoXHJcblx0XHRcdGFzc2lnbm1lbnRzLnF1ZXJ5KHsgZG9uZTogZmFsc2UgfSwgZnVuY3Rpb24oZGF0YSkge1xyXG5cdFx0XHRcdC8vIGNsZWFyIHRoZSBvbGQgY29udGVudFxyXG5cdFx0XHRcdGNvbnRlbnQuaW5uZXJIVE1MID0gXCJcIjtcclxuXHJcblx0XHRcdFx0dmFyIGdyb3VwcyA9IHtcclxuXHRcdFx0XHRcdFRhc2tzOiBbXSxcclxuXHRcdFx0XHRcdFRvZGF5OiBbXSxcclxuXHRcdFx0XHRcdFRvbW9ycm93OiBbXVxyXG5cdFx0XHRcdH07XHJcblxyXG5cdFx0XHRcdC8vIHRvZGF5IGFuZCB0b21vcnJvd3MgZGF0ZXNcclxuXHRcdFx0XHR2YXIgdG9kYXkgPSBuZXcgRGF0ZSgpO1xyXG5cdFx0XHRcdHZhciB0b21vcnJvdyA9IGRheXNGcm9tTm93KDEpO1xyXG5cclxuXHRcdFx0XHQvLyBzZWxlY3QgdGhlIGl0ZW1zIHRvIGRpc3BsYXlcclxuXHRcdFx0XHRkYXRhLmZvckVhY2goaXRlbSA9PiB7XHJcblx0XHRcdFx0XHQvLyBhc3NpZ25tZW50cyBmb3IgdG9kYXlcclxuXHRcdFx0XHRcdGlmKGl0ZW0udHlwZSA9PSBcImFzc2lnbm1lbnRcIikge1xyXG5cdFx0XHRcdFx0XHQvLyB0b2RheVxyXG5cdFx0XHRcdFx0XHRpZihpc1NhbWVEYXRlKHRvZGF5LCBpdGVtLmRhdGUpKSB7XHJcblx0XHRcdFx0XHRcdFx0Z3JvdXBzLlRvZGF5LnB1c2goY3JlYXRlVWkoaXRlbSkpO1xyXG5cdFx0XHRcdFx0XHR9XHJcblx0XHRcdFx0XHRcdC8vIHRvbW9ycm93XHJcblx0XHRcdFx0XHRcdGVsc2UgaWYoaXNTYW1lRGF0ZSh0b21vcnJvdywgaXRlbS5kYXRlKSkge1xyXG5cdFx0XHRcdFx0XHRcdGdyb3Vwcy5Ub21vcnJvdy5wdXNoKGNyZWF0ZVVpKGl0ZW0pKTtcclxuXHRcdFx0XHRcdFx0fVxyXG5cdFx0XHRcdFx0fVxyXG5cclxuXHRcdFx0XHRcdC8vIHNob3cgYW55IHRhc2tzXHJcblx0XHRcdFx0XHRpZihpdGVtLnR5cGUgPT0gXCJ0YXNrXCIpIHtcclxuXHRcdFx0XHRcdFx0Z3JvdXBzLlRhc2tzLnB1c2goY3JlYXRlVWkoaXRlbSkpO1xyXG5cdFx0XHRcdFx0fVxyXG5cdFx0XHRcdH0pO1xyXG5cclxuXHRcdFx0XHQvLyByZW1vdmUgYW55IGVtcHR5IGZpZWxkc1xyXG5cdFx0XHRcdE9iamVjdC5nZXRPd25Qcm9wZXJ0eU5hbWVzKGdyb3VwcylcclxuXHJcblx0XHRcdFx0LmZvckVhY2gobmFtZSA9PiB7XHJcblx0XHRcdFx0XHQvLyByZW1vdmUgZW1wdHkgZ3JvdXBzXHJcblx0XHRcdFx0XHRpZihncm91cHNbbmFtZV0ubGVuZ3RoID09PSAwKSB7XHJcblx0XHRcdFx0XHRcdGRlbGV0ZSBncm91cHNbbmFtZV07XHJcblx0XHRcdFx0XHR9XHJcblx0XHRcdFx0fSk7XHJcblxyXG5cdFx0XHRcdC8vIHJlbmRlciB0aGUgbGlzdFxyXG5cdFx0XHRcdGxpZmVMaW5lLm1ha2VEb20oe1xyXG5cdFx0XHRcdFx0cGFyZW50OiBjb250ZW50LFxyXG5cdFx0XHRcdFx0d2lkZ2V0OiBcImxpc3RcIixcclxuXHRcdFx0XHRcdGl0ZW1zOiBncm91cHNcclxuXHRcdFx0XHR9KTtcclxuXHRcdFx0fSlcclxuXHRcdCk7XHJcblx0fVxyXG59KTtcclxuXHJcbi8vIGNyZWF0ZSBhIGxpc3QgaXRlbVxyXG52YXIgY3JlYXRlVWkgPSBmdW5jdGlvbihpdGVtKSB7XHJcblx0Ly8gcmVuZGVyIGEgdGFza1xyXG5cdGlmKGl0ZW0udHlwZSA9PSBcInRhc2tcIikge1xyXG5cdFx0cmV0dXJuIHtcclxuXHRcdFx0aHJlZjogYC9pdGVtLyR7aXRlbS5pZH1gLFxyXG5cdFx0XHRpdGVtczogW1xyXG5cdFx0XHRcdHtcclxuXHRcdFx0XHRcdHRleHQ6IGl0ZW0ubmFtZSxcclxuXHRcdFx0XHRcdGdyb3c6IHRydWVcclxuXHRcdFx0XHR9XHJcblx0XHRcdF1cclxuXHRcdH07XHJcblx0fVxyXG5cdC8vIHJlbmRlciBhbiBpdGVtXHJcblx0ZWxzZSB7XHJcblx0XHRyZXR1cm4ge1xyXG5cdFx0XHRocmVmOiBgL2l0ZW0vJHtpdGVtLmlkfWAsXHJcblx0XHRcdGl0ZW1zOiBbXHJcblx0XHRcdFx0e1xyXG5cdFx0XHRcdFx0dGV4dDogaXRlbS5uYW1lLFxyXG5cdFx0XHRcdFx0Z3JvdzogdHJ1ZVxyXG5cdFx0XHRcdH0sXHJcblx0XHRcdFx0c3RyaW5naWZ5VGltZShpdGVtLmRhdGUpLFxyXG5cdFx0XHRcdGl0ZW0uY2xhc3NcclxuXHRcdFx0XVxyXG5cdFx0fTtcclxuXHR9XHJcbn07XHJcbiIsIi8qKlxyXG4gKiBBIHBhZ2Ugd2l0aCBsaW5rcyB0byBhbGwgdXNlcnNcclxuICovXHJcblxyXG5saWZlTGluZS5uYXYucmVnaXN0ZXIoe1xyXG5cdG1hdGNoZXI6IFwiL3VzZXJzXCIsXHJcblxyXG5cdG1ha2Uoe3NldFRpdGxlLCBjb250ZW50fSkge1xyXG5cdFx0c2V0VGl0bGUoXCJBbGwgdXNlcnNcIik7XHJcblxyXG5cdFx0Ly8gbG9hZCB0aGUgbGlzdCBvZiB1c2Vyc1xyXG5cdFx0ZmV0Y2goXCIvYXBpL2F1dGgvaW5mby91c2Vyc1wiLCB7XHJcblx0XHRcdGNyZWRlbnRpYWxzOiBcImluY2x1ZGVcIlxyXG5cdFx0fSlcclxuXHJcblx0XHQudGhlbihyZXMgPT4gcmVzLmpzb24oKSlcclxuXHJcblx0XHQudGhlbigoe3N0YXR1cywgZGF0YTogdXNlcnN9KSA9PiB7XHJcblx0XHRcdC8vIG5vdCBhdXRoZW50aWNhdGVkXHJcblx0XHRcdGlmKHN0YXR1cyA9PSBcImZhaWxcIikge1xyXG5cdFx0XHRcdGxpZmVMaW5lLm1ha2VEb20oe1xyXG5cdFx0XHRcdFx0cGFyZW50OiBjb250ZW50LFxyXG5cdFx0XHRcdFx0Y2xhc3NlczogXCJjb250ZW50LXBhZGRlZFwiLFxyXG5cdFx0XHRcdFx0dGV4dDogXCJZb3UgZG8gbm90IGhhdmUgYWNjZXNzIHRvIHRoZSB1c2VyIGxpc3RcIlxyXG5cdFx0XHRcdH0pO1xyXG5cclxuXHRcdFx0XHRyZXR1cm47XHJcblx0XHRcdH1cclxuXHJcblx0XHRcdC8vIHNvcnQgYnkgYWRtaW4gc3RhdHVzXHJcblx0XHRcdHVzZXJzLnNvcnQoKGEsIGIpID0+IHtcclxuXHRcdFx0XHQvLyBzb3J0IGFkbWluc1xyXG5cdFx0XHRcdGlmKGEuYWRtaW4gJiYgIWIuYWRtaW4pIHJldHVybiAtMTtcclxuXHRcdFx0XHRpZighYS5hZG1pbiAmJiBiLmFkbWluKSByZXR1cm4gMTtcclxuXHJcblx0XHRcdFx0Ly8gc29ydCBieSB1c2VybmFtZVxyXG5cdFx0XHRcdGlmKGEudXNlcm5hbWUgPCBiLnVzZXJuYW1lKSByZXR1cm4gLTE7XHJcblx0XHRcdFx0aWYoYS51c2VybmFtZSA+IGIudXNlcm5hbWUpIHJldHVybiAxO1xyXG5cclxuXHRcdFx0XHRyZXR1cm4gMDtcclxuXHRcdFx0fSk7XHJcblxyXG5cdFx0XHR2YXIgZGlzcGxheVVzZXJzID0ge1xyXG5cdFx0XHRcdEFkbWluczogW10sXHJcblx0XHRcdFx0VXNlcnM6IFtdXHJcblx0XHRcdH07XHJcblxyXG5cdFx0XHQvLyBnZW5lcmF0ZSB0aGUgdXNlciBsaXN0XHJcblx0XHRcdHVzZXJzLmZvckVhY2godXNlciA9PiB7XHJcblx0XHRcdFx0Ly8gc29ydCB0aGUgdXNlcnMgaW50byBhZG1pbnMgYW5kIHVzZXJzXHJcblx0XHRcdFx0ZGlzcGxheVVzZXJzW3VzZXIuYWRtaW4gPyBcIkFkbWluc1wiIDogXCJVc2Vyc1wiXVxyXG5cclxuXHRcdFx0XHQucHVzaCh7XHJcblx0XHRcdFx0XHRocmVmOiBgL3VzZXIvJHt1c2VyLnVzZXJuYW1lfWAsXHJcblx0XHRcdFx0XHRpdGVtczogW3tcclxuXHRcdFx0XHRcdFx0dGV4dDogdXNlci51c2VybmFtZSxcclxuXHRcdFx0XHRcdFx0Z3JvdzogdHJ1ZVxyXG5cdFx0XHRcdFx0fV1cclxuXHRcdFx0XHR9KTtcclxuXHRcdFx0fSk7XHJcblxyXG5cdFx0XHQvLyBkaXNwbGF5IHRoZSB1c2VyIGxpc3RcclxuXHRcdFx0bGlmZUxpbmUubWFrZURvbSh7XHJcblx0XHRcdFx0cGFyZW50OiBjb250ZW50LFxyXG5cdFx0XHRcdHdpZGdldDogXCJsaXN0XCIsXHJcblx0XHRcdFx0aXRlbXM6IGRpc3BsYXlVc2Vyc1xyXG5cdFx0XHR9KTtcclxuXHRcdH0pXHJcblxyXG5cdFx0Ly8gc29tZXRoaW5nIHdlbnQgd3Jvbmcgc2hvdyBhbiBlcnJvciBtZXNzYWdlXHJcblx0XHQuY2F0Y2goZXJyID0+IHtcclxuXHRcdFx0bGlmZUxpbmUubWFrZURvbSh7XHJcblx0XHRcdFx0Y2xhc3NlczogXCJjb250ZW50LXBhZGRlZFwiLFxyXG5cdFx0XHRcdHRleHQ6IGVyci5tZXNzYWdlXHJcblx0XHRcdH0pO1xyXG5cdFx0fSk7XHJcblx0fVxyXG59KTtcclxuIiwiLyoqXHJcbiAqIFRoZSBtYWluIGNvbnRlbnQgcGFuZSBmb3IgdGhlIGFwcFxyXG4gKi9cclxuXHJcbmxpZmVMaW5lLm1ha2VEb20ucmVnaXN0ZXIoXCJjb250ZW50XCIsIHtcclxuXHRtYWtlKCkge1xyXG5cdFx0cmV0dXJuIFtcclxuXHRcdFx0e1xyXG5cdFx0XHRcdGNsYXNzZXM6IFwidG9vbGJhclwiLFxyXG5cdFx0XHRcdGNoaWxkcmVuOiBbXHJcblx0XHRcdFx0XHR7XHJcblx0XHRcdFx0XHRcdHRhZzogXCJzdmdcIixcclxuXHRcdFx0XHRcdFx0Y2xhc3NlczogXCJtZW51LWljb25cIixcclxuXHRcdFx0XHRcdFx0YXR0cnM6IHtcclxuXHRcdFx0XHRcdFx0XHR2aWV3Qm94OiBcIjAgMCA2MCA1MFwiLFxyXG5cdFx0XHRcdFx0XHRcdHdpZHRoOiBcIjIwXCIsXHJcblx0XHRcdFx0XHRcdFx0aGVpZ2h0OiBcIjE1XCJcclxuXHRcdFx0XHRcdFx0fSxcclxuXHRcdFx0XHRcdFx0Y2hpbGRyZW46IFtcclxuXHRcdFx0XHRcdFx0XHR7IHRhZzogXCJsaW5lXCIsIGF0dHJzOiB7IHgxOiBcIjBcIiwgeTE6IFwiNVwiLCB4MjogXCI2MFwiLCB5MjogXCI1XCIgfSB9LFxyXG5cdFx0XHRcdFx0XHRcdHsgdGFnOiBcImxpbmVcIiwgYXR0cnM6IHsgeDE6IFwiMFwiLCB5MTogXCIyNVwiLCB4MjogXCI2MFwiLCB5MjogXCIyNVwiIH0gfSxcclxuXHRcdFx0XHRcdFx0XHR7IHRhZzogXCJsaW5lXCIsIGF0dHJzOiB7IHgxOiBcIjBcIiwgeTE6IFwiNDVcIiwgeDI6IFwiNjBcIiwgeTI6IFwiNDVcIiB9IH1cclxuXHRcdFx0XHRcdFx0XSxcclxuXHRcdFx0XHRcdFx0b246IHtcclxuXHRcdFx0XHRcdFx0XHRjbGljazogKCkgPT4gZG9jdW1lbnQuYm9keS5jbGFzc0xpc3QudG9nZ2xlKFwic2lkZWJhci1vcGVuXCIpXHJcblx0XHRcdFx0XHRcdH1cclxuXHRcdFx0XHRcdH0sXHJcblx0XHRcdFx0XHR7XHJcblx0XHRcdFx0XHRcdGNsYXNzZXM6IFwidG9vbGJhci10aXRsZVwiLFxyXG5cdFx0XHRcdFx0XHRuYW1lOiBcInRpdGxlXCJcclxuXHRcdFx0XHRcdH0sXHJcblx0XHRcdFx0XHR7XHJcblx0XHRcdFx0XHRcdGNsYXNzZXM6IFwidG9vbGJhci1idXR0b25zXCIsXHJcblx0XHRcdFx0XHRcdG5hbWU6IFwiYnRuc1wiXHJcblx0XHRcdFx0XHR9XHJcblx0XHRcdFx0XVxyXG5cdFx0XHR9LFxyXG5cdFx0XHR7XHJcblx0XHRcdFx0Y2xhc3NlczogXCJjb250ZW50XCIsXHJcblx0XHRcdFx0bmFtZTogXCJjb250ZW50XCJcclxuXHRcdFx0fVxyXG5cdFx0XTtcclxuXHR9LFxyXG5cclxuXHRiaW5kKG9wdHMsIHt0aXRsZSwgYnRucywgY29udGVudH0pIHtcclxuXHRcdHZhciBkaXNwb3NhYmxlO1xyXG5cclxuXHRcdC8vIHNldCB0aGUgcGFnZSB0aXRsZVxyXG5cdFx0dmFyIHNldFRpdGxlID0gZnVuY3Rpb24odGl0bGVUZXh0KSB7XHJcblx0XHRcdHRpdGxlLmlubmVyVGV4dCA9IHRpdGxlVGV4dDtcclxuXHRcdFx0ZG9jdW1lbnQudGl0bGUgPSB0aXRsZVRleHQ7XHJcblx0XHR9O1xyXG5cclxuXHRcdC8vIGFkZCBhbiBhY3Rpb24gYnV0dG9uXHJcblx0XHRsaWZlTGluZS5vbihcImFjdGlvbi1jcmVhdGVcIiwgbmFtZSA9PiB7XHJcblx0XHRcdGxpZmVMaW5lLm1ha2VEb20oe1xyXG5cdFx0XHRcdHBhcmVudDogYnRucyxcclxuXHRcdFx0XHR0YWc6IFwiYnV0dG9uXCIsXHJcblx0XHRcdFx0Y2xhc3NlczogXCJ0b29sYmFyLWJ1dHRvblwiLFxyXG5cdFx0XHRcdHRleHQ6IG5hbWUsXHJcblx0XHRcdFx0YXR0cnM6IHtcclxuXHRcdFx0XHRcdFwiZGF0YS1uYW1lXCI6IG5hbWVcclxuXHRcdFx0XHR9LFxyXG5cdFx0XHRcdG9uOiB7XHJcblx0XHRcdFx0XHRjbGljazogKCkgPT4gbGlmZUxpbmUuZW1pdChcImFjdGlvbi1leGVjLVwiICsgbmFtZSlcclxuXHRcdFx0XHR9XHJcblx0XHRcdH0pO1xyXG5cdFx0fSk7XHJcblxyXG5cdFx0Ly8gcmVtb3ZlIGFuIGFjdGlvbiBidXR0b25cclxuXHRcdGxpZmVMaW5lLm9uKFwiYWN0aW9uLXJlbW92ZVwiLCBuYW1lID0+IHtcclxuXHRcdFx0dmFyIGJ0biA9IGJ0bnMucXVlcnlTZWxlY3RvcihgW2RhdGEtbmFtZT1cIiR7bmFtZX1cIl1gKTtcclxuXHJcblx0XHRcdGlmKGJ0bikgYnRuLnJlbW92ZSgpO1xyXG5cdFx0fSk7XHJcblxyXG5cdFx0Ly8gcmVtb3ZlIGFsbCB0aGUgYWN0aW9uIGJ1dHRvbnNcclxuXHRcdGxpZmVMaW5lLm9uKFwiYWN0aW9uLXJlbW92ZS1hbGxcIiwgKCkgPT4gYnRucy5pbm5lckhUTUwgPSBcIlwiKTtcclxuXHJcblx0XHQvLyBkaXNwbGF5IHRoZSBjb250ZW50IGZvciB0aGUgdmlld1xyXG5cdFx0dmFyIHVwZGF0ZVZpZXcgPSAoKSA9PiB7XHJcblx0XHRcdC8vIGRlc3Ryb3kgYW55IGxpc3RlbmVycyBmcm9tIG9sZCBjb250ZW50XHJcblx0XHRcdGlmKGRpc3Bvc2FibGUpIHtcclxuXHRcdFx0XHRkaXNwb3NhYmxlLmRpc3Bvc2UoKTtcclxuXHRcdFx0fVxyXG5cclxuXHRcdFx0Ly8gcmVtb3ZlIGFueSBhY3Rpb24gYnV0dG9uc1xyXG5cdFx0XHRsaWZlTGluZS5lbWl0KFwiYWN0aW9uLXJlbW92ZS1hbGxcIik7XHJcblxyXG5cdFx0XHQvLyBjbGVhciBhbGwgdGhlIG9sZCBjb250ZW50XHJcblx0XHRcdGNvbnRlbnQuaW5uZXJIVE1MID0gXCJcIjtcclxuXHJcblx0XHRcdC8vIGNyZWF0ZSB0aGUgZGlzcG9zYWJsZSBmb3IgdGhlIGNvbnRlbnRcclxuXHRcdFx0ZGlzcG9zYWJsZSA9IG5ldyBsaWZlTGluZS5EaXNwb3NhYmxlKCk7XHJcblxyXG5cdFx0XHR2YXIgbWFrZXIgPSBub3RGb3VuZE1ha2VyLCBtYXRjaDtcclxuXHJcblx0XHRcdC8vIGZpbmQgdGhlIGNvcnJlY3QgY29udGVudCBtYWtlclxyXG5cdFx0XHRmb3IobGV0ICRtYWtlciBvZiBjb250ZW50TWFrZXJzKSB7XHJcblx0XHRcdFx0Ly8gcnVuIGEgbWF0Y2hlciBmdW5jdGlvblxyXG5cdFx0XHRcdGlmKHR5cGVvZiAkbWFrZXIubWF0Y2hlciA9PSBcImZ1bmN0aW9uXCIpIHtcclxuXHRcdFx0XHRcdG1hdGNoID0gJG1ha2VyLm1hdGNoZXIobG9jYXRpb24ucGF0aG5hbWUpO1xyXG5cdFx0XHRcdH1cclxuXHRcdFx0XHQvLyBhIHN0cmluZyBtYXRjaFxyXG5cdFx0XHRcdGVsc2UgaWYodHlwZW9mICRtYWtlci5tYXRjaGVyID09IFwic3RyaW5nXCIpIHtcclxuXHRcdFx0XHRcdGlmKCRtYWtlci5tYXRjaGVyID09IGxvY2F0aW9uLnBhdGhuYW1lKSB7XHJcblx0XHRcdFx0XHRcdG1hdGNoID0gJG1ha2VyLm1hdGNoZXI7XHJcblx0XHRcdFx0XHR9XHJcblx0XHRcdFx0fVxyXG5cdFx0XHRcdC8vIGEgcmVnZXggbWF0Y2hcclxuXHRcdFx0XHRlbHNlIHtcclxuXHRcdFx0XHRcdG1hdGNoID0gJG1ha2VyLm1hdGNoZXIuZXhlYyhsb2NhdGlvbi5wYXRobmFtZSk7XHJcblx0XHRcdFx0fVxyXG5cclxuXHRcdFx0XHQvLyBtYXRjaCBmb3VuZCBzdG9wIHNlYXJjaGluZ1xyXG5cdFx0XHRcdGlmKG1hdGNoKSB7XHJcblx0XHRcdFx0XHRtYWtlciA9ICRtYWtlcjtcclxuXHJcblx0XHRcdFx0XHRicmVhaztcclxuXHRcdFx0XHR9XHJcblx0XHRcdH1cclxuXHJcblx0XHRcdC8vIG1ha2UgdGhlIGNvbnRlbnQgZm9yIHRoaXMgcm91dGVcclxuXHRcdFx0bWFrZXIubWFrZSh7ZGlzcG9zYWJsZSwgc2V0VGl0bGUsIGNvbnRlbnQsIG1hdGNofSk7XHJcblx0XHR9O1xyXG5cclxuXHRcdC8vIHN3aXRjaCBwYWdlc1xyXG5cdFx0bGlmZUxpbmUubmF2Lm5hdmlnYXRlID0gZnVuY3Rpb24odXJsKSB7XHJcblx0XHRcdC8vIHVwZGF0ZSB0aGUgdXJsXHJcblx0XHRcdGhpc3RvcnkucHVzaFN0YXRlKG51bGwsIG51bGwsIHVybCk7XHJcblxyXG5cdFx0XHQvLyBzaG93IHRoZSBuZXcgdmlld1xyXG5cdFx0XHR1cGRhdGVWaWV3KCk7XHJcblx0XHR9O1xyXG5cclxuXHRcdC8vIHN3aXRjaCBwYWdlcyB3aGVuIHRoZSB1c2VyIHB1c2hlcyB0aGUgYmFjayBidXR0b25cclxuXHRcdHdpbmRvdy5hZGRFdmVudExpc3RlbmVyKFwicG9wc3RhdGVcIiwgKCkgPT4gdXBkYXRlVmlldygpKTtcclxuXHJcblx0XHQvLyBzaG93IHRoZSBpbml0aWFsIHZpZXdcclxuXHRcdHVwZGF0ZVZpZXcoKTtcclxuXHR9XHJcbn0pO1xyXG5cclxuLy8gYWxsIGNvbnRlbnQgcHJvZHVjZXJzXHJcbnZhciBjb250ZW50TWFrZXJzID0gW107XHJcblxyXG4vLyBjcmVhdGUgdGhlIG5hbWVzcGFjZVxyXG5saWZlTGluZS5uYXYgPSB7fTtcclxuXHJcbi8vIHJlZ2lzdGVyIGEgY29udGVudCBtYWtlclxyXG5saWZlTGluZS5uYXYucmVnaXN0ZXIgPSBmdW5jdGlvbihtYWtlcikge1xyXG5cdGNvbnRlbnRNYWtlcnMucHVzaChtYWtlcik7XHJcbn07XHJcblxyXG4vLyB0aGUgZmFsbCBiYWNrIG1ha2VyIGZvciBubyBzdWNoIHBhZ2VcclxudmFyIG5vdEZvdW5kTWFrZXIgPSB7XHJcblx0bWFrZSh7c2V0VGl0bGUsIGNvbnRlbnR9KSB7XHJcblx0XHQvLyB1cGRhdGUgdGhlIHBhZ2UgdGl0bGVcclxuXHRcdHNldFRpdGxlKFwiTm90IGZvdW5kXCIpO1xyXG5cclxuXHRcdGxpZmVMaW5lLm1ha2VEb20oe1xyXG5cdFx0XHRwYXJlbnQ6IGNvbnRlbnQsXHJcblx0XHRcdGNsYXNzZXM6IFwiY29udGVudC1wYWRkZWRcIixcclxuXHRcdFx0Y2hpbGRyZW46IFtcclxuXHRcdFx0XHR7XHJcblx0XHRcdFx0XHR0YWc6IFwic3BhblwiLFxyXG5cdFx0XHRcdFx0dGV4dDogXCJUaGUgcGFnZSB5b3UgYXJlIGxvb2tpbmcgZm9yIGNvdWxkIG5vdCBiZSBmb3VuZC4gXCJcclxuXHRcdFx0XHR9LFxyXG5cdFx0XHRcdHtcclxuXHRcdFx0XHRcdHdpZGdldDogXCJsaW5rXCIsXHJcblx0XHRcdFx0XHRocmVmOiBcIi9cIixcclxuXHRcdFx0XHRcdHRleHQ6IFwiR28gaG9tZVwiXHJcblx0XHRcdFx0fVxyXG5cdFx0XHRdXHJcblx0XHR9KTtcclxuXHR9XHJcbn07XHJcbiIsIi8qKlxyXG4gKiBDcmVhdGUgYW4gaW5wdXQgZmllbGRcclxuICovXHJcblxyXG5saWZlTGluZS5tYWtlRG9tLnJlZ2lzdGVyKFwiaW5wdXRcIiwge1xyXG5cdG1ha2Uoe3RhZywgdHlwZSwgdmFsdWUsIGNoYW5nZSwgYmluZCwgcHJvcCwgcGxhY2Vob2xkZXIsIGNsYXNzZXN9KSB7XHJcblx0XHQvLyBzZXQgdGhlIGluaXRpYWwgdmFsdWUgb2YgdGhlIGJvdW5kIG9iamVjdFxyXG5cdFx0aWYodHlwZW9mIGJpbmQgPT0gXCJvYmplY3RcIiAmJiAhdmFsdWUpIHtcclxuXHRcdFx0dmFsdWUgPSBiaW5kW3Byb3BdO1xyXG5cdFx0fVxyXG5cclxuXHRcdHZhciBpbnB1dCA9IHtcclxuXHRcdFx0dGFnOiB0YWcgfHwgXCJpbnB1dFwiLFxyXG5cdFx0XHRjbGFzc2VzOiBjbGFzc2VzIHx8IGAke3RhZyA9PSBcInRleHRhcmVhXCIgPyBcInRleHRhcmVhXCIgOiBcImlucHV0XCJ9LWZpbGxgLFxyXG5cdFx0XHRhdHRyczoge30sXHJcblx0XHRcdG9uOiB7XHJcblx0XHRcdFx0aW5wdXQ6IGUgPT4ge1xyXG5cdFx0XHRcdFx0Ly8gdXBkYXRlIHRoZSBwcm9wZXJ0eSBjaGFuZ2VkXHJcblx0XHRcdFx0XHRpZih0eXBlb2YgYmluZCA9PSBcIm9iamVjdFwiKSB7XHJcblx0XHRcdFx0XHRcdGJpbmRbcHJvcF0gPSBlLnRhcmdldC52YWx1ZTtcclxuXHRcdFx0XHRcdH1cclxuXHJcblx0XHRcdFx0XHQvLyBjYWxsIHRoZSBjYWxsYmFja1xyXG5cdFx0XHRcdFx0aWYodHlwZW9mIGNoYW5nZSA9PSBcImZ1bmN0aW9uXCIpIHtcclxuXHRcdFx0XHRcdFx0Y2hhbmdlKGUudGFyZ2V0LnZhbHVlKTtcclxuXHRcdFx0XHRcdH1cclxuXHRcdFx0XHR9XHJcblx0XHRcdH1cclxuXHRcdH07XHJcblxyXG5cdFx0Ly8gYXR0YWNoIHZhbHVlcyBpZiB0aGV5IGFyZSBnaXZlblxyXG5cdFx0aWYodHlwZSkgaW5wdXQuYXR0cnMudHlwZSA9IHR5cGU7XHJcblx0XHRpZih2YWx1ZSkgaW5wdXQuYXR0cnMudmFsdWUgPSB2YWx1ZTtcclxuXHRcdGlmKHBsYWNlaG9sZGVyKSBpbnB1dC5hdHRycy5wbGFjZWhvbGRlciA9IHBsYWNlaG9sZGVyO1xyXG5cclxuXHRcdC8vIGZvciB0ZXh0YXJlYXMgc2V0IGlubmVyVGV4dFxyXG5cdFx0aWYodGFnID09IFwidGV4dGFyZWFcIikge1xyXG5cdFx0XHRpbnB1dC50ZXh0ID0gdmFsdWU7XHJcblx0XHR9XHJcblxyXG5cdFx0cmV0dXJuIGlucHV0O1xyXG5cdH1cclxufSk7XHJcbiIsIi8qKlxyXG4gKiBBIHdpZGdldCB0aGF0IGNyZWF0ZXMgYSBsaW5rIHRoYXQgaG9va3MgaW50byB0aGUgbmF2aWdhdG9yXHJcbiAqL1xyXG5cclxubGlmZUxpbmUubWFrZURvbS5yZWdpc3RlcihcImxpbmtcIiwge1xyXG5cdG1ha2Uob3B0cykge1xyXG5cdFx0cmV0dXJuIHtcclxuXHRcdFx0dGFnOiBcImFcIixcclxuXHRcdFx0YXR0cnM6IHtcclxuXHRcdFx0XHRocmVmOiBvcHRzLmhyZWZcclxuXHRcdFx0fSxcclxuXHRcdFx0b246IHtcclxuXHRcdFx0XHRjbGljazogZSA9PiB7XHJcblx0XHRcdFx0XHQvLyBkb24ndCBvdmVyIHJpZGUgY3RybCBvciBhbHQgb3Igc2hpZnQgY2xpY2tzXHJcblx0XHRcdFx0XHRpZihlLmN0cmxLZXkgfHwgZS5hbHRLZXkgfHwgZS5zaGlmdEtleSkgcmV0dXJuO1xyXG5cclxuXHRcdFx0XHRcdC8vIGRvbid0IG5hdmlnYXRlIHRoZSBwYWdlXHJcblx0XHRcdFx0XHRlLnByZXZlbnREZWZhdWx0KCk7XHJcblxyXG5cdFx0XHRcdFx0bGlmZUxpbmUubmF2Lm5hdmlnYXRlKG9wdHMuaHJlZilcclxuXHRcdFx0XHR9XHJcblx0XHRcdH0sXHJcblx0XHRcdHRleHQ6IG9wdHMudGV4dFxyXG5cdFx0fTtcclxuXHR9XHJcbn0pO1xyXG4iLCIvKipcclxuICogRGlzcGxheSBhIGxpc3Qgd2l0aCBncm91cCBoZWFkaW5nc1xyXG4gKi9cclxuXHJcbmxpZmVMaW5lLm1ha2VEb20ucmVnaXN0ZXIoXCJsaXN0XCIsIHtcclxuXHRtYWtlKHtpdGVtc30pIHtcclxuXHRcdC8vIGFkZCBhbGwgdGhlIGdyb3Vwc1xyXG5cdFx0cmV0dXJuIE9iamVjdC5nZXRPd25Qcm9wZXJ0eU5hbWVzKGl0ZW1zKVxyXG5cclxuXHRcdC5tYXAoZ3JvdXBOYW1lID0+IG1ha2VHcm91cChncm91cE5hbWUsIGl0ZW1zW2dyb3VwTmFtZV0pKTtcclxuXHR9XHJcbn0pO1xyXG5cclxuLy8gbWFrZSBhIHNpbmdsZSBncm91cFxyXG52YXIgbWFrZUdyb3VwID0gZnVuY3Rpb24obmFtZSwgaXRlbXMsIHBhcmVudCkge1xyXG5cdC8vIGFkZCB0aGUgbGlzdCBoZWFkZXJcclxuXHRpdGVtcy51bnNoaWZ0KHtcclxuXHRcdGNsYXNzZXM6IFwibGlzdC1oZWFkZXJcIixcclxuXHRcdHRleHQ6IG5hbWVcclxuXHR9KTtcclxuXHJcblx0Ly8gcmVuZGVyIHRoZSBpdGVtXHJcblx0cmV0dXJuIHtcclxuXHRcdHBhcmVudCxcclxuXHRcdGNsYXNzZXM6IFwibGlzdC1zZWN0aW9uXCIsXHJcblx0XHRjaGlsZHJlbjogaXRlbXMubWFwKChpdGVtLCBpbmRleCkgPT4ge1xyXG5cdFx0XHQvLyBkb24ndCBtb2RpZnkgdGhlIGhlYWRlclxyXG5cdFx0XHRpZihpbmRleCA9PT0gMCkgcmV0dXJuIGl0ZW07XHJcblxyXG5cdFx0XHR2YXIgaXRlbURvbTtcclxuXHJcblx0XHRcdC8vIGNyZWF0ZSBhbiBpdGVtXHJcblx0XHRcdGlmKHR5cGVvZiBpdGVtICE9IFwic3RyaW5nXCIpIHtcclxuXHRcdFx0XHRpdGVtRG9tID0ge1xyXG5cdFx0XHRcdFx0Y2xhc3NlczogXCJsaXN0LWl0ZW1cIixcclxuXHRcdFx0XHRcdGNoaWxkcmVuOiAoaXRlbS5pdGVtcyB8fCBpdGVtKS5tYXAoaXRlbSA9PiB7XHJcblx0XHRcdFx0XHRcdHJldHVybiB7XHJcblx0XHRcdFx0XHRcdFx0Ly8gZ2V0IHRoZSBuYW1lIG9mIHRoZSBpdGVtXHJcblx0XHRcdFx0XHRcdFx0dGV4dDogdHlwZW9mIGl0ZW0gPT0gXCJzdHJpbmdcIiA/IGl0ZW0gOiBpdGVtLnRleHQsXHJcblx0XHRcdFx0XHRcdFx0Ly8gc2V0IHdoZXRoZXIgdGhlIGl0ZW0gc2hvdWxkIGdyb3dcclxuXHRcdFx0XHRcdFx0XHRjbGFzc2VzOiBpdGVtLmdyb3cgPyBcImxpc3QtaXRlbS1ncm93XCIgOiBcImxpc3QtaXRlbS1wYXJ0XCJcclxuXHRcdFx0XHRcdFx0fTtcclxuXHRcdFx0XHRcdH0pXHJcblx0XHRcdFx0fTtcclxuXHRcdFx0fVxyXG5cdFx0XHRlbHNlIHtcclxuXHRcdFx0XHRpdGVtRG9tID0ge1xyXG5cdFx0XHRcdFx0Y2xhc3NlczogXCJsaXN0LWl0ZW1cIixcclxuXHRcdFx0XHRcdHRleHQ6IGl0ZW1cclxuXHRcdFx0XHR9O1xyXG5cdFx0XHR9XHJcblxyXG5cdFx0XHQvLyBtYWtlIHRoZSBpdGVtIGEgbGlua1xyXG5cdFx0XHRpZihpdGVtLmhyZWYpIHtcclxuXHRcdFx0XHRpdGVtRG9tLm9uID0ge1xyXG5cdFx0XHRcdFx0Y2xpY2s6ICgpID0+IGxpZmVMaW5lLm5hdi5uYXZpZ2F0ZShpdGVtLmhyZWYpXHJcblx0XHRcdFx0fTtcclxuXHRcdFx0fVxyXG5cclxuXHRcdFx0cmV0dXJuIGl0ZW1Eb207XHJcblx0XHR9KVxyXG5cdH07XHJcbn07XHJcbiIsIi8qKlxyXG4gKiBUaGUgd2lkZ2V0IGZvciB0aGUgc2lkZWJhclxyXG4gKi9cclxuXHJcbmxpZmVMaW5lLm1ha2VEb20ucmVnaXN0ZXIoXCJzaWRlYmFyXCIsIHtcclxuXHRtYWtlKCkge1xyXG5cdFx0cmV0dXJuIFtcclxuXHRcdFx0e1xyXG5cdFx0XHRcdGNsYXNzZXM6IFwic2lkZWJhclwiLFxyXG5cdFx0XHRcdG5hbWU6IFwic2lkZWJhclwiLFxyXG5cdFx0XHRcdGNoaWxkcmVuOiBbXHJcblx0XHRcdFx0XHR7XHJcblx0XHRcdFx0XHRcdGNsYXNzZXM6IFtcInNpZGViYXItYWN0aW9uc1wiLCBcImhpZGRlblwiXSxcclxuXHRcdFx0XHRcdFx0bmFtZTogXCJhY3Rpb25zXCIsXHJcblx0XHRcdFx0XHRcdGNoaWxkcmVuOiBbXHJcblx0XHRcdFx0XHRcdFx0e1xyXG5cdFx0XHRcdFx0XHRcdFx0Y2xhc3NlczogXCJzaWRlYmFyLWhlYWRpbmdcIixcclxuXHRcdFx0XHRcdFx0XHRcdHRleHQ6IFwiUGFnZSBhY3Rpb25zXCJcclxuXHRcdFx0XHRcdFx0XHR9XHJcblx0XHRcdFx0XHRcdF1cclxuXHRcdFx0XHRcdH0sXHJcblx0XHRcdFx0XHR7XHJcblx0XHRcdFx0XHRcdGNsYXNzZXM6IFwic2lkZWJhci1oZWFkaW5nXCIsXHJcblx0XHRcdFx0XHRcdHRleHQ6IFwiTW9yZSBhY3Rpb25zXCJcclxuXHRcdFx0XHRcdH1cclxuXHRcdFx0XHRdXHJcblx0XHRcdH0sXHJcblx0XHRcdHtcclxuXHRcdFx0XHRjbGFzc2VzOiBcInNoYWRlXCIsXHJcblx0XHRcdFx0b246IHtcclxuXHRcdFx0XHRcdC8vIGNsb3NlIHRoZSBzaWRlYmFyXHJcblx0XHRcdFx0XHRjbGljazogKCkgPT4gZG9jdW1lbnQuYm9keS5jbGFzc0xpc3QucmVtb3ZlKFwic2lkZWJhci1vcGVuXCIpXHJcblx0XHRcdFx0fVxyXG5cdFx0XHR9XHJcblx0XHRdO1xyXG5cdH0sXHJcblxyXG5cdGJpbmQob3B0cywge2FjdGlvbnMsIHNpZGViYXJ9KSB7XHJcblx0XHQvLyBhZGQgYSBjb21tYW5kIHRvIHRoZSBzaWRlYmFyXHJcblx0XHRsaWZlTGluZS5hZGRDb21tYW5kID0gZnVuY3Rpb24obmFtZSwgZm4pIHtcclxuXHRcdFx0Ly8gbWFrZSB0aGUgc2lkZWJhciBpdGVtXHJcblx0XHRcdHZhciB7aXRlbX0gPSBsaWZlTGluZS5tYWtlRG9tKHtcclxuXHRcdFx0XHRwYXJlbnQ6IHNpZGViYXIsXHJcblx0XHRcdFx0dGFnOiBcImRpdlwiLFxyXG5cdFx0XHRcdG5hbWU6IFwiaXRlbVwiLFxyXG5cdFx0XHRcdGNsYXNzZXM6IFwic2lkZWJhci1pdGVtXCIsXHJcblx0XHRcdFx0dGV4dDogbmFtZSxcclxuXHRcdFx0XHRvbjoge1xyXG5cdFx0XHRcdFx0Y2xpY2s6ICgpID0+IHtcclxuXHRcdFx0XHRcdFx0Ly8gY2xvc2UgdGhlIHNpZGViYXJcclxuXHRcdFx0XHRcdFx0ZG9jdW1lbnQuYm9keS5jbGFzc0xpc3QucmVtb3ZlKFwic2lkZWJhci1vcGVuXCIpO1xyXG5cclxuXHRcdFx0XHRcdFx0Ly8gY2FsbCB0aGUgbGlzdGVuZXJcclxuXHRcdFx0XHRcdFx0Zm4oKTtcclxuXHRcdFx0XHRcdH1cclxuXHRcdFx0XHR9XHJcblx0XHRcdH0pO1xyXG5cclxuXHRcdFx0cmV0dXJuIHtcclxuXHRcdFx0XHR1bnN1YnNjcmliZTogKCkgPT4gaXRlbS5yZW1vdmUoKVxyXG5cdFx0XHR9O1xyXG5cdFx0fTtcclxuXHJcblx0XHQvLyBhZGQgYSBuYXZpZ2F0aW9uYWwgY29tbWFuZFxyXG5cdFx0bGlmZUxpbmUuYWRkTmF2Q29tbWFuZCA9IGZ1bmN0aW9uKG5hbWUsIHRvKSB7XHJcblx0XHRcdGxpZmVMaW5lLmFkZENvbW1hbmQobmFtZSwgKCkgPT4gbGlmZUxpbmUubmF2Lm5hdmlnYXRlKHRvKSk7XHJcblx0XHR9O1xyXG5cclxuXHRcdC8vIGFkZCBhIHNpZGViYXIgYWN0aW9uXHJcblx0XHRsaWZlTGluZS5vbihcImFjdGlvbi1jcmVhdGVcIiwgbmFtZSA9PiB7XHJcblx0XHRcdC8vIHNob3cgdGhlIGFjdGlvbnNcclxuXHRcdFx0YWN0aW9ucy5jbGFzc0xpc3QucmVtb3ZlKFwiaGlkZGVuXCIpO1xyXG5cclxuXHRcdFx0Ly8gY3JlYXRlIHRoZSBidXR0b25cclxuXHRcdFx0bGlmZUxpbmUubWFrZURvbSh7XHJcblx0XHRcdFx0cGFyZW50OiBhY3Rpb25zLFxyXG5cdFx0XHRcdHRhZzogXCJkaXZcIixcclxuXHRcdFx0XHRuYW1lOiBcIml0ZW1cIixcclxuXHRcdFx0XHRjbGFzc2VzOiBcInNpZGViYXItaXRlbVwiLFxyXG5cdFx0XHRcdHRleHQ6IG5hbWUsXHJcblx0XHRcdFx0YXR0cnM6IHtcclxuXHRcdFx0XHRcdFwiZGF0YS1uYW1lXCI6IG5hbWVcclxuXHRcdFx0XHR9LFxyXG5cdFx0XHRcdG9uOiB7XHJcblx0XHRcdFx0XHRjbGljazogKCkgPT4ge1xyXG5cdFx0XHRcdFx0XHQvLyBjbG9zZSB0aGUgc2lkZWJhclxyXG5cdFx0XHRcdFx0XHRkb2N1bWVudC5ib2R5LmNsYXNzTGlzdC5yZW1vdmUoXCJzaWRlYmFyLW9wZW5cIik7XHJcblxyXG5cdFx0XHRcdFx0XHQvLyB0cmlnZ2VyIHRoZSBhY3Rpb25cclxuXHRcdFx0XHRcdFx0bGlmZUxpbmUuZW1pdChcImFjdGlvbi1leGVjLVwiICsgbmFtZSk7XHJcblx0XHRcdFx0XHR9XHJcblx0XHRcdFx0fVxyXG5cdFx0XHR9KTtcclxuXHJcblx0XHRcdC8vIHJlbW92ZSBhIHNpZGViYXIgYWN0aW9uXHJcblx0XHRcdGxpZmVMaW5lLm9uKFwiYWN0aW9uLXJlbW92ZVwiLCBuYW1lID0+IHtcclxuXHRcdFx0XHQvLyByZW1vdmUgdGhlIGJ1dHRvblxyXG5cdFx0XHRcdHZhciBidG4gPSBhY3Rpb25zLnF1ZXJ5U2VsZWN0b3IoYFtkYXRhLW5hbWU9XCIke25hbWV9XCJdYCk7XHJcblxyXG5cdFx0XHRcdGlmKGJ0bikgYnRuLnJlbW92ZSgpO1xyXG5cclxuXHRcdFx0XHQvLyBoaWRlIHRoZSBwYWdlIGFjdGlvbnMgaWYgdGhlcmUgYXJlIG5vbmVcclxuXHRcdFx0XHRpZihhY3Rpb25zLmNoaWxkcmVuLmxlbmd0aCA9PSAxKSB7XHJcblx0XHRcdFx0XHRhY3Rpb25zLmNsYXNzTGlzdC5hZGQoXCJoaWRkZW5cIik7XHJcblx0XHRcdFx0fVxyXG5cdFx0XHR9KTtcclxuXHJcblx0XHRcdC8vIHJlbW92ZSBhbGwgdGhlIHNpZGViYXIgYWN0aW9uc1xyXG5cdFx0XHRsaWZlTGluZS5vbihcImFjdGlvbi1yZW1vdmUtYWxsXCIsICgpID0+IHtcclxuXHRcdFx0XHQvLyByZW1vdmUgYWxsIHRoZSBhY3Rpb25zXHJcblx0XHRcdFx0dmFyIF9hY3Rpb25zID0gQXJyYXkuZnJvbShhY3Rpb25zLnF1ZXJ5U2VsZWN0b3JBbGwoXCIuc2lkZWJhci1pdGVtXCIpKTtcclxuXHJcblx0XHRcdFx0X2FjdGlvbnMuZm9yRWFjaChhY3Rpb24gPT4gYWN0aW9uLnJlbW92ZSgpKTtcclxuXHJcblx0XHRcdFx0Ly8gc2lkZSB0aGUgcGFnZSBhY3Rpb25zXHJcblx0XHRcdFx0YWN0aW9ucy5jbGFzc0xpc3QuYWRkKFwiaGlkZGVuXCIpO1xyXG5cdFx0XHR9KTtcclxuXHRcdH0pO1xyXG5cdH1cclxufSk7XHJcbiIsIi8qKlxyXG4gKiBBIHJvdyBvZiByYWRpbyBzdHlsZSBidXR0b25zXHJcbiAqL1xyXG5cclxubGlmZUxpbmUubWFrZURvbS5yZWdpc3RlcihcInRvZ2dsZS1idG5zXCIsIHtcclxuXHRtYWtlKHtidG5zLCB2YWx1ZX0pIHtcclxuXHRcdC8vIGF1dG8gc2VsZWN0IHRoZSBmaXJzdCBidXR0b25cclxuXHRcdGlmKCF2YWx1ZSkge1xyXG5cdFx0XHR2YWx1ZSA9IHR5cGVvZiBidG5zWzBdID09IFwic3RyaW5nXCIgPyBidG5zWzBdIDogYnRuc1swXS52YWx1ZTtcclxuXHRcdH1cclxuXHJcblx0XHRyZXR1cm4ge1xyXG5cdFx0XHRuYW1lOiBcInRvZ2dsZUJhclwiLFxyXG5cdFx0XHRjbGFzc2VzOiBcInRvZ2dsZS1iYXJcIixcclxuXHRcdFx0Y2hpbGRyZW46IGJ0bnMubWFwKGJ0biA9PiB7XHJcblx0XHRcdFx0Ly8gY29udmVydCB0aGUgcGxhaW4gc3RyaW5nIHRvIGFuIG9iamVjdFxyXG5cdFx0XHRcdGlmKHR5cGVvZiBidG4gPT0gXCJzdHJpbmdcIikge1xyXG5cdFx0XHRcdFx0YnRuID0geyB0ZXh0OiBidG4sIHZhbHVlOiBidG4gfTtcclxuXHRcdFx0XHR9XHJcblxyXG5cdFx0XHRcdHZhciBjbGFzc2VzID0gW1widG9nZ2xlLWJ0blwiXTtcclxuXHJcblx0XHRcdFx0Ly8gYWRkIHRoZSBzZWxlY3RlZCBjbGFzc1xyXG5cdFx0XHRcdGlmKHZhbHVlID09IGJ0bi52YWx1ZSkge1xyXG5cdFx0XHRcdFx0Y2xhc3Nlcy5wdXNoKFwidG9nZ2xlLWJ0bi1zZWxlY3RlZFwiKTtcclxuXHJcblx0XHRcdFx0XHQvLyBkb24ndCBzZWxlY3QgdHdvIGJ1dHRvbnNcclxuXHRcdFx0XHRcdHZhbHVlID0gdW5kZWZpbmVkO1xyXG5cdFx0XHRcdH1cclxuXHJcblx0XHRcdFx0cmV0dXJuIHtcclxuXHRcdFx0XHRcdHRhZzogXCJidXR0b25cIixcclxuXHRcdFx0XHRcdGNsYXNzZXMsXHJcblx0XHRcdFx0XHR0ZXh0OiBidG4udGV4dCxcclxuXHRcdFx0XHRcdGF0dHJzOiB7XHJcblx0XHRcdFx0XHRcdFwiZGF0YS12YWx1ZVwiOiBidG4udmFsdWVcclxuXHRcdFx0XHRcdH1cclxuXHRcdFx0XHR9O1xyXG5cdFx0XHR9KVxyXG5cdFx0fTtcclxuXHR9LFxyXG5cclxuXHRiaW5kKHtjaGFuZ2V9LCB7dG9nZ2xlQmFyfSkge1xyXG5cdFx0Ly8gYXR0YWNoIGxpc3RlbmVyc1xyXG5cdFx0Zm9yKGxldCBidG4gb2YgdG9nZ2xlQmFyLnF1ZXJ5U2VsZWN0b3JBbGwoXCIudG9nZ2xlLWJ0blwiKSkge1xyXG5cdFx0XHRidG4uYWRkRXZlbnRMaXN0ZW5lcihcImNsaWNrXCIsICgpID0+IHtcclxuXHRcdFx0XHR2YXIgc2VsZWN0ZWQgPSB0b2dnbGVCYXIucXVlcnlTZWxlY3RvcihcIi50b2dnbGUtYnRuLXNlbGVjdGVkXCIpO1xyXG5cclxuXHRcdFx0XHQvLyB0aGUgYnV0dG9uIGhhcyBhbHJlYWR5IGJlZW4gc2VsZWN0ZWRcclxuXHRcdFx0XHRpZihzZWxlY3RlZCA9PSBidG4pIHtcclxuXHRcdFx0XHRcdHJldHVybjtcclxuXHRcdFx0XHR9XHJcblxyXG5cdFx0XHRcdC8vIHVudG9nZ2xlIHRoZSBvdGhlciBidXR0b25cclxuXHRcdFx0XHRpZihzZWxlY3RlZCkge1xyXG5cdFx0XHRcdFx0c2VsZWN0ZWQuY2xhc3NMaXN0LnJlbW92ZShcInRvZ2dsZS1idG4tc2VsZWN0ZWRcIik7XHJcblx0XHRcdFx0fVxyXG5cclxuXHRcdFx0XHQvLyBzZWxlY3QgdGhpcyBidXR0b25cclxuXHRcdFx0XHRidG4uY2xhc3NMaXN0LmFkZChcInRvZ2dsZS1idG4tc2VsZWN0ZWRcIik7XHJcblxyXG5cdFx0XHRcdC8vIHRyaWdnZXIgYSBzZWxlY3Rpb24gY2hhbmdlXHJcblx0XHRcdFx0Y2hhbmdlKGJ0bi5kYXRhc2V0LnZhbHVlKTtcclxuXHRcdFx0fSk7XHJcblx0XHR9XHJcblx0fVxyXG59KTtcclxuIiwiLyoqXHJcbiAqIE5hbWUgZ2VuZXJhdG9yIGZvciBiYWNrdXBzXHJcbiAqL1xyXG5cclxuZXhwb3J0cy5nZW5CYWNrdXBOYW1lID0gZnVuY3Rpb24oZGF0ZSA9IG5ldyBEYXRlKCkpIHtcclxuXHRyZXR1cm4gYGJhY2t1cC0ke2RhdGUuZ2V0RnVsbFllYXIoKX0tJHtkYXRlLmdldE1vbnRoKCkrMX0tJHtkYXRlLmdldERhdGUoKX1gXHJcblx0XHQrIGAtJHtkYXRlLmdldEhvdXJzKCl9LSR7ZGF0ZS5nZXRNaW51dGVzKCl9LnppcGA7XHJcbn07XHJcbiIsIi8qKlxyXG4gKiBBbiBhZGFwdG9yIGZvciBodHRwIGJhc2VkIHN0b3Jlc1xyXG4gKi9cclxuXHJcbmNsYXNzIEh0dHBBZGFwdG9yIHtcclxuXHRjb25zdHJ1Y3RvcihvcHRzKSB7XHJcblx0XHQvLyBpZiB3ZSBhcmUganVzdCBnaXZlbiBhIHN0cmluZyB1c2UgaXQgYXMgdGhlIHNvdXJjZVxyXG5cdFx0aWYodHlwZW9mIG9wdHMgPT0gXCJzdHJpbmdcIikge1xyXG5cdFx0XHRvcHRzID0ge1xyXG5cdFx0XHRcdHNyYzogb3B0c1xyXG5cdFx0XHR9O1xyXG5cdFx0fVxyXG5cclxuXHRcdC8vIHNhdmUgdGhlIG9wdGlvbnNcclxuXHRcdHRoaXMuX29wdHMgPSBvcHRzO1xyXG5cdH1cclxuXHJcblx0Ly8gY3JlYXRlIHRoZSBvcHRpb25zIGZvciBhIGZldGNoIHJlcXVlc3RcclxuXHRfY3JlYXRlT3B0cygpIHtcclxuXHRcdHZhciBvcHRzID0ge307XHJcblxyXG5cdFx0Ly8gdXNlIHRoZSBzZXNzaW9uIGNvb2tpZSB3ZSB3ZXJlIGdpdmVuXHJcblx0XHRpZih0aGlzLl9vcHRzLnNlc3Npb24pIHtcclxuXHRcdFx0b3B0cy5oZWFkZXJzID0ge1xyXG5cdFx0XHRcdGNvb2tpZTogYHNlc3Npb249JHt0aGlzLl9vcHRzLnNlc3Npb259YFxyXG5cdFx0XHR9O1xyXG5cdFx0fVxyXG5cdFx0Ly8gdXNlIHRoZSBjcmVhZGVudGlhbHMgZnJvbSB0aGUgYnJvd3NlclxyXG5cdFx0ZWxzZSB7XHJcblx0XHRcdG9wdHMuY3JlZGVudGlhbHMgPSBcImluY2x1ZGVcIjtcclxuXHRcdH1cclxuXHJcblx0XHRyZXR1cm4gb3B0cztcclxuXHR9XHJcblxyXG5cdC8qKlxyXG5cdCAqIEdldCBhbGwgdGhlIHZhbHVlcyBpbiBhIHN0b3JlXHJcblx0ICovXHJcblx0Z2V0QWxsKCkge1xyXG5cdFx0cmV0dXJuIGZldGNoKHRoaXMuX29wdHMuc3JjLCB0aGlzLl9jcmVhdGVPcHRzKCkpXHJcblxyXG5cdFx0Ly8gcGFyc2UgdGhlIGpzb24gcmVzcG9uc2VcclxuXHRcdC50aGVuKHJlcyA9PiByZXMuanNvbigpKVxyXG5cdH1cclxuXHJcblx0LyoqXHJcblx0ICogR2V0IGEgc2luZ2xlIHZhbHVlXHJcblx0ICovXHJcblx0Z2V0KGtleSkge1xyXG5cdFx0cmV0dXJuIGZldGNoKHRoaXMuX29wdHMuc3JjICsgXCJ2YWx1ZS9cIiArIGtleSwgdGhpcy5fY3JlYXRlT3B0cygpKVxyXG5cclxuXHRcdC50aGVuKHJlcyA9PiB7XHJcblx0XHRcdC8vIG5vdCBsb2dnZWQgaW5cclxuXHRcdFx0aWYocmVzLnN0YXR1cyA9PSA0MDMpIHtcclxuXHRcdFx0XHRsZXQgZXJyb3IgPSBuZXcgRXJyb3IoXCJOb3QgbG9nZ2VkIGluXCIpO1xyXG5cclxuXHRcdFx0XHQvLyBhZGQgYW4gZXJyb3IgY29kZVxyXG5cdFx0XHRcdGVycm9yLmNvZGUgPSBcIm5vdC1sb2dnZWQtaW5cIjtcclxuXHJcblx0XHRcdFx0dGhyb3cgZXJyb3I7XHJcblx0XHRcdH1cclxuXHJcblx0XHRcdC8vIG5vIHN1Y2ggaXRlbVxyXG5cdFx0XHRpZihyZXMuc3RhdHVzID09IDQwNCkge1xyXG5cdFx0XHRcdHJldHVybiB1bmRlZmluZWQ7XHJcblx0XHRcdH1cclxuXHJcblx0XHRcdC8vIHBhcnNlIHRoZSBpdGVtXHJcblx0XHRcdHJldHVybiByZXMuanNvbigpO1xyXG5cdFx0fSk7XHJcblx0fVxyXG5cclxuXHQvKipcclxuXHQgKiBTdG9yZSBhbiB2YWx1ZSBvbiB0aGUgc2VydmVyXHJcblx0ICovXHJcblx0c2V0KHZhbHVlKSB7XHJcblx0XHR2YXIgZmV0Y2hPcHRzID0gdGhpcy5fY3JlYXRlT3B0cygpO1xyXG5cclxuXHRcdC8vIGFkZCB0aGUgaGVhZGVycyB0byB0aGUgZGVmYXVsdCBoZWFkZXJzXHJcblx0XHRmZXRjaE9wdHMubWV0aG9kID0gXCJQVVRcIjtcclxuXHRcdGZldGNoT3B0cy5ib2R5ID0gSlNPTi5zdHJpbmdpZnkodmFsdWUpO1xyXG5cclxuXHRcdC8vIHNlbmQgdGhlIGl0ZW1cclxuXHRcdHJldHVybiBmZXRjaCh0aGlzLl9vcHRzLnNyYyArIFwidmFsdWUvXCIgKyB2YWx1ZS5pZCwgZmV0Y2hPcHRzKVxyXG5cclxuXHRcdC50aGVuKHJlcyA9PiB7XHJcblx0XHRcdC8vIG5vdCBsb2dnZWQgaW5cclxuXHRcdFx0aWYocmVzLnN0YXR1cyA9PSA0MDMpIHtcclxuXHRcdFx0XHRsZXQgZXJyb3IgPSBuZXcgRXJyb3IoXCJOb3QgbG9nZ2VkIGluXCIpO1xyXG5cclxuXHRcdFx0XHQvLyBhZGQgYW4gZXJyb3IgY29kZVxyXG5cdFx0XHRcdGVycm9yLmNvZGUgPSBcIm5vdC1sb2dnZWQtaW5cIjtcclxuXHJcblx0XHRcdFx0dGhyb3cgZXJyb3I7XHJcblx0XHRcdH1cclxuXHRcdH0pO1xyXG5cdH1cclxuXHJcblx0LyoqXHJcblx0ICogUmVtb3ZlIHRoZSB2YWx1ZSBmcm9tIHRoZSBzdG9yZVxyXG5cdCAqL1xyXG5cdHJlbW92ZShrZXkpIHtcclxuXHRcdHZhciBmZXRjaE9wdHMgPSB0aGlzLl9jcmVhdGVPcHRzKCk7XHJcblxyXG5cdFx0Ly8gYWRkIHRoZSBoZWFkZXJzIHRvIHRoZSBkZWZhdWx0IGhlYWRlcnNcclxuXHRcdGZldGNoT3B0cy5tZXRob2QgPSBcIkRFTEVURVwiO1xyXG5cclxuXHRcdC8vIHNlbmQgdGhlIGl0ZW1cclxuXHRcdHJldHVybiBmZXRjaCh0aGlzLl9vcHRzLnNyYyArIFwidmFsdWUvXCIgKyBrZXksIGZldGNoT3B0cylcclxuXHJcblx0XHQudGhlbihyZXMgPT4ge1xyXG5cdFx0XHQvLyBub3QgbG9nZ2VkIGluXHJcblx0XHRcdGlmKHJlcy5zdGF0dXMgPT0gNDAzKSB7XHJcblx0XHRcdFx0bGV0IGVycm9yID0gbmV3IEVycm9yKFwiTm90IGxvZ2dlZCBpblwiKTtcclxuXHJcblx0XHRcdFx0Ly8gYWRkIGFuIGVycm9yIGNvZGVcclxuXHRcdFx0XHRlcnJvci5jb2RlID0gXCJub3QtbG9nZ2VkLWluXCI7XHJcblxyXG5cdFx0XHRcdHRocm93IGVycm9yO1xyXG5cdFx0XHR9XHJcblx0XHR9KTtcclxuXHR9XHJcblxyXG5cdC8vIGNoZWNrIG91ciBhY2Nlc3MgbGV2ZWxcclxuXHRhY2Nlc3NMZXZlbCgpIHtcclxuXHRcdHJldHVybiBmZXRjaCh0aGlzLl9vcHRzLnNyYyArIFwiYWNjZXNzXCIsIHRoaXMuX2NyZWF0ZU9wdHMoKSlcclxuXHRcdFx0Ly8gdGhlIHJlc3BvbnNlIGlzIGp1c3QgYSBzdHJpbmdcclxuXHRcdFx0LnRoZW4ocmVzID0+IHJlcy50ZXh0KCkpO1xyXG5cdH1cclxufVxyXG5cclxubW9kdWxlLmV4cG9ydHMgPSBIdHRwQWRhcHRvcjtcclxuIiwiLyoqXHJcbiAqIEEgYmFzaWMga2V5IHZhbHVlIGRhdGEgc3RvcmVcclxuICovXHJcblxyXG5jbGFzcyBLZXlWYWx1ZVN0b3JlIGV4dGVuZHMgbGlmZUxpbmUuRXZlbnRFbWl0dGVyIHtcclxuXHRjb25zdHJ1Y3RvcihhZGFwdGVyKSB7XHJcblx0XHRzdXBlcigpO1xyXG5cdFx0dGhpcy5fYWRhcHRlciA9IGFkYXB0ZXI7XHJcblxyXG5cdFx0Ly8gbWFrZSBzdXJlIHdlIGhhdmUgYW4gYWRhcHRlclxyXG5cdFx0aWYoIWFkYXB0ZXIpIHtcclxuXHRcdFx0dGhyb3cgbmV3IEVycm9yKFwiS2V5VmFsdWVTdG9yZSBtdXN0IGJlIGluaXRpYWxpemVkIHdpdGggYW4gYWRhcHRlclwiKVxyXG5cdFx0fVxyXG5cdH1cclxuXHJcblx0LyoqXHJcblx0ICogR2V0IHRoZSBjb3JyaXNwb25kaW5nIHZhbHVlIG91dCBvZiB0aGUgZGF0YSBzdG9yZSBvdGhlcndpc2UgcmV0dXJuIGRlZmF1bHRcclxuXHQgKi9cclxuXHRnZXQoa2V5LCBfZGVmYXVsdCkge1xyXG5cdFx0Ly8gY2hlY2sgaWYgdGhpcyB2YWx1ZSBoYXMgYmVlbiBvdmVycmlkZW5cclxuXHRcdGlmKHRoaXMuX292ZXJyaWRlcyAmJiB0aGlzLl9vdmVycmlkZXMuaGFzT3duUHJvcGVydHkoa2V5KSkge1xyXG5cdFx0XHRyZXR1cm4gUHJvbWlzZS5yZXNvbHZlKHRoaXMuX292ZXJyaWRlc1trZXldKTtcclxuXHRcdH1cclxuXHJcblx0XHRyZXR1cm4gdGhpcy5fYWRhcHRlci5nZXQoa2V5KVxyXG5cclxuXHRcdC50aGVuKHJlc3VsdCA9PiB7XHJcblx0XHRcdC8vIHRoZSBpdGVtIGlzIG5vdCBkZWZpbmVkXHJcblx0XHRcdGlmKCFyZXN1bHQpIHtcclxuXHRcdFx0XHRyZXR1cm4gX2RlZmF1bHQ7XHJcblx0XHRcdH1cclxuXHJcblx0XHRcdHJldHVybiByZXN1bHQudmFsdWU7XHJcblx0XHR9KTtcclxuXHR9XHJcblxyXG5cdC8qKlxyXG5cdCAqIFNldCBhIHNpbmdsZSB2YWx1ZSBvciBzZXZlcmFsIHZhbHVlc1xyXG5cdCAqXHJcblx0ICoga2V5IC0+IHZhbHVlXHJcblx0ICogb3JcclxuXHQgKiB7IGtleTogdmFsdWUgfVxyXG5cdCAqL1xyXG5cdHNldChrZXksIHZhbHVlKSB7XHJcblx0XHQvLyBzZXQgYSBzaW5nbGUgdmFsdWVcclxuXHRcdGlmKHR5cGVvZiBrZXkgPT0gXCJzdHJpbmdcIikge1xyXG5cdFx0XHR2YXIgcHJvbWlzZSA9IHRoaXMuX2FkYXB0ZXIuc2V0KHtcclxuXHRcdFx0XHRpZDoga2V5LFxyXG5cdFx0XHRcdHZhbHVlLFxyXG5cdFx0XHRcdG1vZGlmaWVkOiBEYXRlLm5vdygpXHJcblx0XHRcdH0pO1xyXG5cclxuXHRcdFx0Ly8gdHJpZ2dlciB0aGUgY2hhbmdlXHJcblx0XHRcdHRoaXMuZW1pdChrZXksIHZhbHVlKTtcclxuXHJcblx0XHRcdHJldHVybiBwcm9taXNlO1xyXG5cdFx0fVxyXG5cdFx0Ly8gc2V0IHNldmVyYWwgdmFsdWVzXHJcblx0XHRlbHNlIHtcclxuXHRcdFx0Ly8gdGVsbCB0aGUgY2FsbGVyIHdoZW4gd2UgYXJlIGRvbmVcclxuXHRcdFx0bGV0IHByb21pc2VzID0gW107XHJcblxyXG5cdFx0XHRmb3IobGV0IF9rZXkgb2YgT2JqZWN0LmdldE93blByb3BlcnR5TmFtZXMoa2V5KSkge1xyXG5cdFx0XHRcdHByb21pc2VzLnB1c2goXHJcblx0XHRcdFx0XHR0aGlzLl9hZGFwdGVyLnNldCh7XHJcblx0XHRcdFx0XHRcdGlkOiBfa2V5LFxyXG5cdFx0XHRcdFx0XHR2YWx1ZToga2V5W19rZXldLFxyXG5cdFx0XHRcdFx0XHRtb2RpZmllZDogRGF0ZS5ub3coKVxyXG5cdFx0XHRcdFx0fSlcclxuXHRcdFx0XHQpO1xyXG5cclxuXHRcdFx0XHQvLyB0cmlnZ2VyIHRoZSBjaGFuZ2VcclxuXHRcdFx0XHR0aGlzLmVtaXQoX2tleSwga2V5W19rZXldKTtcclxuXHRcdFx0fVxyXG5cclxuXHRcdFx0cmV0dXJuIFByb21pc2UuYWxsKHByb21pc2VzKTtcclxuXHRcdH1cclxuXHR9XHJcblxyXG5cdCAvKipcclxuXHQgICogV2F0Y2ggdGhlIHZhbHVlIGZvciBjaGFuZ2VzXHJcblx0ICAqXHJcblx0ICAqIG9wdHMuY3VycmVudCAtIHNlbmQgdGhlIGN1cnJlbnQgdmFsdWUgb2Yga2V5IChkZWZhdWx0OiBmYWxzZSlcclxuXHQgICogb3B0cy5kZWZhdWx0IC0gdGhlIGRlZmF1bHQgdmFsdWUgdG8gc2VuZCBmb3Igb3B0cy5jdXJyZW50XHJcblx0ICAqL1xyXG5cdCB3YXRjaChrZXksIG9wdHMsIGZuKSB7XHJcblx0XHQgLy8gbWFrZSBvcHRzIG9wdGlvbmFsXHJcblx0XHQgaWYodHlwZW9mIG9wdHMgPT0gXCJmdW5jdGlvblwiKSB7XHJcblx0XHRcdCBmbiA9IG9wdHM7XHJcblx0XHRcdCBvcHRzID0ge307XHJcblx0XHQgfVxyXG5cclxuXHRcdCAvLyBzZW5kIHRoZSBjdXJyZW50IHZhbHVlXHJcblx0XHQgaWYob3B0cy5jdXJyZW50KSB7XHJcblx0XHRcdCB0aGlzLmdldChrZXksIG9wdHMuZGVmYXVsdClcclxuXHRcdFx0IFx0LnRoZW4odmFsdWUgPT4gZm4odmFsdWUpKTtcclxuXHRcdCB9XHJcblxyXG5cdFx0IC8vIGxpc3RlbiBmb3IgYW55IGNoYW5nZXNcclxuXHRcdCByZXR1cm4gdGhpcy5vbihrZXksIHZhbHVlID0+IHtcclxuXHRcdFx0IC8vIG9ubHkgZW1pdCB0aGUgY2hhbmdlIGlmIHRoZXJlIGlzIG5vdCBhbiBvdmVycmlkZSBpbiBwbGFjZVxyXG5cdFx0XHQgaWYoIXRoaXMuX292ZXJyaWRlcyB8fCAhdGhpcy5fb3ZlcnJpZGVzLmhhc093blByb3BlcnR5KGtleSkpIHtcclxuXHRcdFx0XHQgZm4odmFsdWUpO1xyXG5cdFx0XHQgfVxyXG5cdFx0IH0pO1xyXG5cdCB9XHJcblxyXG5cdCAvKipcclxuXHQgICogT3ZlcnJpZGUgdGhlIHZhbHVlcyBmcm9tIHRoZSBhZGFwdG9yIHdpdGhvdXQgd3JpdGluZyB0byB0aGVtXHJcblx0ICAqXHJcblx0ICAqIFVzZWZ1bCBmb3IgY29tYmluaW5nIGpzb24gc2V0dGluZ3Mgd2l0aCBjb21tYW5kIGxpbmUgZmxhZ3NcclxuXHQgICovXHJcblx0IHNldE92ZXJyaWRlcyhvdmVycmlkZXMpIHtcclxuXHRcdCB0aGlzLl9vdmVycmlkZXMgPSBvdmVycmlkZXM7XHJcblxyXG5cdFx0IC8vIGVtaXQgY2hhbmdlcyBmb3IgZWFjaCBvZiB0aGUgb3ZlcnJpZGVzXHJcblx0XHQgT2JqZWN0LmdldE93blByb3BlcnR5TmFtZXMob3ZlcnJpZGVzKVxyXG5cclxuXHRcdCAuZm9yRWFjaChrZXkgPT4gdGhpcy5lbWl0KGtleSwgb3ZlcnJpZGVzW2tleV0pKTtcclxuXHQgfVxyXG59XHJcblxyXG5tb2R1bGUuZXhwb3J0cyA9IEtleVZhbHVlU3RvcmU7XHJcbiIsIi8qKlxyXG4gKiBBbiBpbiBtZW1vcnkgYWRhcHRlciBmb3IgZGF0YSBzdG9yZXNcclxuICovXHJcblxyXG5jbGFzcyBNZW1BZGFwdG9yIHtcclxuXHRjb25zdHJ1Y3RvcigpIHtcclxuXHRcdHRoaXMuX2RhdGEgPSB7fTtcclxuXHR9XHJcblxyXG5cdC8qKlxyXG5cdCAqIEdldCBhbiBhcnJheSBvZiB2YWx1ZXNcclxuXHQgKi9cclxuXHRnZXRBbGwoKSB7XHJcblx0XHRyZXR1cm4gUHJvbWlzZS5yZXNvbHZlKFxyXG5cdFx0XHRPYmplY3QuZ2V0T3duUHJvcGVydHlOYW1lcyh0aGlzLl9kYXRhKVxyXG5cclxuXHRcdFx0Lm1hcChuYW1lID0+IHRoaXMuX2RhdGFbbmFtZV0pXHJcblx0XHQpO1xyXG5cdH1cclxuXHJcblx0LyoqXHJcblx0ICogTG9va3VwIGEgdmFsdWVcclxuXHQgKlxyXG5cdCAqIHJldHVybnMge2lkLCB2YWx1ZX1cclxuXHQgKi9cclxuXHRnZXQoaWQpIHtcclxuXHRcdC8vIGNoZWNrIGlmIHdlIGhhdmUgdGhlIHZhbHVlXHJcblx0XHRpZih0aGlzLl9kYXRhLmhhc093blByb3BlcnR5KGlkKSkge1xyXG5cdFx0XHRyZXR1cm4gUHJvbWlzZS5yZXNvbHZlKHRoaXMuX2RhdGFbaWRdKTtcclxuXHRcdH1cclxuXHJcblx0XHRyZXR1cm4gUHJvbWlzZS5yZXNvbHZlKCk7XHJcblx0fVxyXG5cclxuXHQvKipcclxuXHQgKiBTdG9yZSBhIHZhbHVlXHJcblx0ICpcclxuXHQgKiBUaGUgdmFsdWUgaXMgc3RvcmVkIGJ5IGl0cyBpZCBwcm9wZXJ0eVxyXG5cdCAqL1xyXG5cdHNldCh2YWx1ZSkge1xyXG5cdFx0Ly8gc3RvcmUgdGhlIHZhbHVlXHJcblx0XHR0aGlzLl9kYXRhW3ZhbHVlLmlkXSA9IHZhbHVlO1xyXG5cclxuXHRcdHJldHVybiBQcm9taXNlLnJlc29sdmUoKTtcclxuXHR9XHJcblxyXG5cdC8qKlxyXG5cdCAqIFJlbW92ZSBhIHZhbHVlIGZyb20gdGhlIGFkYXB0b3JcclxuXHQgKi9cclxuXHRyZW1vdmUoa2V5KSB7XHJcblx0XHRkZWxldGUgdGhpcy5fZGF0YVtrZXldO1xyXG5cclxuXHRcdHJldHVybiBQcm9taXNlLnJlc29sdmUoKTtcclxuXHR9XHJcbn1cclxuXHJcbm1vZHVsZS5leHBvcnRzID0gTWVtQWRhcHRvcjtcclxuIiwiLyoqXHJcbiAqIEEgZGF0YSBzdG9yZSB3aGljaCBjb250YWlucyBhIHBvb2wgb2Ygb2JqZWN0cyB3aGljaCBhcmUgcXVlcnlhYmxlIGJ5IGFueSBwcm9wZXJ0eVxyXG4gKi9cclxuXHJcbmNsYXNzIFBvb2xTdG9yZSBleHRlbmRzIGxpZmVMaW5lLkV2ZW50RW1pdHRlciB7XHJcblx0Y29uc3RydWN0b3IoYWRhcHRvciwgaW5pdEZuKSB7XHJcblx0XHRzdXBlcigpO1xyXG5cdFx0dGhpcy5fYWRhcHRvciA9IGFkYXB0b3I7XHJcblx0XHR0aGlzLl9pbml0Rm4gPSBpbml0Rm47XHJcblx0fVxyXG5cclxuXHQvKipcclxuXHQgKiBHZXQgYWxsIGl0ZW1zIG1hdGNpbmcgdGhlIHByb3ZpZGVkIHByb3BlcnRpZXNcclxuXHQgKi9cclxuXHRxdWVyeShwcm9wcywgZm4pIHtcclxuXHRcdC8vIGNoZWNrIGlmIGEgdmFsdWUgbWF0Y2hlcyB0aGUgcXVlcnlcclxuXHRcdHZhciBmaWx0ZXIgPSB2YWx1ZSA9PiB7XHJcblx0XHRcdC8vIGNoZWNrIHRoYXQgYWxsIHRoZSBwcm9wZXJ0aWVzIG1hdGNoXHJcblx0XHRcdHJldHVybiBPYmplY3QuZ2V0T3duUHJvcGVydHlOYW1lcyhwcm9wcylcclxuXHJcblx0XHRcdC5ldmVyeShwcm9wTmFtZSA9PiB7XHJcblx0XHRcdFx0Ly8gYSBmdW5jdGlvbiB0byBjaGVjayBpZiBhIHZhbHVlIG1hdGNoZXNcclxuXHRcdFx0XHRpZih0eXBlb2YgcHJvcHNbcHJvcE5hbWVdID09IFwiZnVuY3Rpb25cIikge1xyXG5cdFx0XHRcdFx0cmV0dXJuIHByb3BzW3Byb3BOYW1lXSh2YWx1ZVtwcm9wTmFtZV0pO1xyXG5cdFx0XHRcdH1cclxuXHRcdFx0XHQvLyBwbGFpbiBlcXVhbGl0eVxyXG5cdFx0XHRcdGVsc2Uge1xyXG5cdFx0XHRcdFx0cmV0dXJuIHByb3BzW3Byb3BOYW1lXSA9PSB2YWx1ZVtwcm9wTmFtZV1cclxuXHRcdFx0XHR9XHJcblx0XHRcdH0pO1xyXG5cdFx0fTtcclxuXHJcblx0XHQvLyBnZXQgYWxsIGN1cnJlbnQgaXRlbXMgdGhhdCBtYXRjaCB0aGUgZmlsdGVyXHJcblx0XHR2YXIgY3VycmVudCA9IHRoaXMuX2FkYXB0b3IuZ2V0QWxsKClcclxuXHJcblx0XHQudGhlbih2YWx1ZXMgPT4ge1xyXG5cdFx0XHQvLyBmaWx0ZXIgb3V0IHRoZSB2YWx1ZXNcclxuXHRcdFx0dmFsdWVzID0gdmFsdWVzLmZpbHRlcihmaWx0ZXIpO1xyXG5cclxuXHRcdFx0Ly8gZG8gYW55IGluaXRpYWxpemF0aW9uXHJcblx0XHRcdGlmKHRoaXMuX2luaXRGbikge1xyXG5cdFx0XHRcdHZhbHVlcyA9IHZhbHVlcy5tYXAodmFsdWUgPT4gdGhpcy5faW5pdEZuKHZhbHVlKSB8fCB2YWx1ZSk7XHJcblx0XHRcdH1cclxuXHJcblx0XHRcdHJldHVybiB2YWx1ZXM7XHJcblx0XHR9KTtcclxuXHJcblx0XHQvLyBvcHRpb25hbHkgcnVuIGNoYW5nZXMgdGhyb3VnaCB0aGUgcXVlcnkgYXMgd2VsbFxyXG5cdFx0aWYodHlwZW9mIGZuID09IFwiZnVuY3Rpb25cIikge1xyXG5cdFx0XHRsZXQgc3Vic2NyaXB0aW9uLCBzdG9wcGVkO1xyXG5cclxuXHRcdFx0Ly8gd3JhcCB0aGUgdmFsdWVzIGluIGNoYW5nZSBvYmplY3RzIGFuZCBzZW5kIHRoZSB0byB0aGUgY29uc3VtZXJcclxuXHRcdFx0Y3VycmVudC50aGVuKHZhbHVlcyA9PiB7XHJcblx0XHRcdFx0Ly8gZG9uJ3QgbGlzdGVuIGlmIHVuc3Vic2NyaWJlIHdhcyBhbHJlYWR5IGNhbGxlZFxyXG5cdFx0XHRcdGlmKHN0b3BwZWQpIHJldHVybjtcclxuXHJcblx0XHRcdFx0Ly8gc2VuZCB0aGUgdmFsdWVzIHdlIGN1cnJlbnRseSBoYXZlXHJcblx0XHRcdFx0Zm4odmFsdWVzLnNsaWNlKDApKTtcclxuXHJcblx0XHRcdFx0Ly8gd2F0Y2ggZm9yIGNoYW5nZXMgYWZ0ZXIgdGhlIGluaXRpYWwgdmFsdWVzIGFyZSBzZW5kXHJcblx0XHRcdFx0c3Vic2NyaXB0aW9uID0gdGhpcy5vbihcImNoYW5nZVwiLCBjaGFuZ2UgPT4ge1xyXG5cdFx0XHRcdFx0Ly8gZmluZCB0aGUgcHJldmlvdXMgdmFsdWVcclxuXHRcdFx0XHRcdHZhciBpbmRleCA9IHZhbHVlcy5maW5kSW5kZXgodmFsdWUgPT4gdmFsdWUuaWQgPT0gY2hhbmdlLmlkKTtcclxuXHJcblx0XHRcdFx0XHRpZihjaGFuZ2UudHlwZSA9PSBcImNoYW5nZVwiKSB7XHJcblx0XHRcdFx0XHRcdC8vIGNoZWNrIGlmIHRoZSB2YWx1ZSBtYXRjaGVzIHRoZSBxdWVyeVxyXG5cdFx0XHRcdFx0XHRsZXQgbWF0Y2hlcyA9IGZpbHRlcihjaGFuZ2UudmFsdWUpO1xyXG5cclxuXHRcdFx0XHRcdFx0aWYobWF0Y2hlcykge1xyXG5cdFx0XHRcdFx0XHRcdC8vIGZyZXNobHkgY3JlYXRlZFxyXG5cdFx0XHRcdFx0XHRcdGlmKGluZGV4ID09PSAtMSkge1xyXG5cdFx0XHRcdFx0XHRcdFx0bGV0IHt2YWx1ZX0gPSBjaGFuZ2U7XHJcblxyXG5cdFx0XHRcdFx0XHRcdFx0Ly8gZG8gYW55IGluaXRpYWxpemF0aW9uXHJcblx0XHRcdFx0XHRcdFx0XHRpZih0aGlzLl9pbml0Rm4pIHtcclxuXHRcdFx0XHRcdFx0XHRcdFx0dmFsdWUgPSB0aGlzLl9pbml0Rm4odmFsdWUpIHx8IHZhbHVlO1xyXG5cdFx0XHRcdFx0XHRcdFx0fVxyXG5cclxuXHRcdFx0XHRcdFx0XHRcdHZhbHVlcy5wdXNoKHZhbHVlKTtcclxuXHRcdFx0XHRcdFx0XHR9XHJcblx0XHRcdFx0XHRcdFx0Ly8gdXBkYXRlIGFuIGV4aXN0aW5nIHZhbHVlXHJcblx0XHRcdFx0XHRcdFx0ZWxzZSB7XHJcblx0XHRcdFx0XHRcdFx0XHR2YWx1ZXNbaW5kZXhdID0gY2hhbmdlLnZhbHVlO1xyXG5cdFx0XHRcdFx0XHRcdH1cclxuXHJcblx0XHRcdFx0XHRcdFx0Zm4odmFsdWVzLnNsaWNlKDApKTtcclxuXHRcdFx0XHRcdFx0fVxyXG5cdFx0XHRcdFx0XHQvLyB0ZWxsIHRoZSBjb25zdW1lciB0aGlzIHZhbHVlIG5vIGxvbmdlciBtYXRjaGVzXHJcblx0XHRcdFx0XHRcdGVsc2UgaWYoaW5kZXggIT09IC0xKSB7XHJcblx0XHRcdFx0XHRcdFx0Ly8gcmVtb3ZlIHRoZSBpdGVtXHJcblx0XHRcdFx0XHRcdFx0aWYoaW5kZXggIT09IC0xKSB7XHJcblx0XHRcdFx0XHRcdFx0XHR2YWx1ZXMuc3BsaWNlKGluZGV4LCAxKTtcclxuXHRcdFx0XHRcdFx0XHR9XHJcblxyXG5cdFx0XHRcdFx0XHRcdGZuKHZhbHVlcy5zbGljZSgwKSk7XHJcblx0XHRcdFx0XHRcdH1cclxuXHRcdFx0XHRcdH1cclxuXHRcdFx0XHRcdGVsc2UgaWYoY2hhbmdlLnR5cGUgPT0gXCJyZW1vdmVcIiAmJiBpbmRleCAhPT0gLTEpIHtcclxuXHRcdFx0XHRcdFx0Ly8gcmVtb3ZlIHRoZSBpdGVtXHJcblx0XHRcdFx0XHRcdGlmKGluZGV4ICE9PSAtMSkge1xyXG5cdFx0XHRcdFx0XHRcdHZhbHVlcy5zcGxpY2UoaW5kZXgsIDEpO1xyXG5cdFx0XHRcdFx0XHR9XHJcblxyXG5cdFx0XHRcdFx0XHRmbih2YWx1ZXMuc2xpY2UoMCkpO1xyXG5cdFx0XHRcdFx0fVxyXG5cdFx0XHRcdH0pO1xyXG5cdFx0XHR9KTtcclxuXHJcblx0XHRcdHJldHVybiB7XHJcblx0XHRcdFx0dW5zdWJzY3JpYmUoKSB7XHJcblx0XHRcdFx0XHQvLyBpZiB3ZSBhcmUgbGlzdGVuaW5nIHN0b3BcclxuXHRcdFx0XHRcdGlmKHN1YnNjcmlwdGlvbikge1xyXG5cdFx0XHRcdFx0XHRzdWJzY3JpcHRpb24udW5zdWJzY3JpYmUoKVxyXG5cdFx0XHRcdFx0fVxyXG5cclxuXHRcdFx0XHRcdC8vIGRvbid0IGxpc3RlblxyXG5cdFx0XHRcdFx0c3RvcHBlZCA9IHRydWU7XHJcblx0XHRcdFx0fVxyXG5cdFx0XHR9XHJcblx0XHR9XHJcblx0XHRlbHNlIHtcclxuXHRcdFx0cmV0dXJuIGN1cnJlbnQ7XHJcblx0XHR9XHJcblx0fVxyXG5cclxuXHQvKipcclxuXHQgKiBTdG9yZSBhIHZhbHVlIGluIHRoZSBwb29sXHJcblx0ICovXHJcblx0c2V0KHZhbHVlKSB7XHJcblx0XHQvLyBzZXQgdGhlIG1vZGlmaWVkIGRhdGVcclxuXHRcdHZhbHVlLm1vZGlmaWVkID0gRGF0ZS5ub3coKTtcclxuXHJcblx0XHQvLyBzdG9yZSB0aGUgdmFsdWUgaW4gdGhlIGFkYXB0b3JcclxuXHRcdHRoaXMuX2FkYXB0b3Iuc2V0KHZhbHVlKTtcclxuXHJcblx0XHQvLyBwcm9wb2dhdGUgdGhlIGNoYW5nZVxyXG5cdFx0dGhpcy5lbWl0KFwiY2hhbmdlXCIsIHtcclxuXHRcdFx0dHlwZTogXCJjaGFuZ2VcIixcclxuXHRcdFx0aWQ6IHZhbHVlLmlkLFxyXG5cdFx0XHR2YWx1ZVxyXG5cdFx0fSk7XHJcblx0fVxyXG5cclxuXHQvKipcclxuXHQgKiBSZW1vdmUgYSB2YWx1ZSBmcm9tIHRoZSBwb29sXHJcblx0ICovXHJcblx0cmVtb3ZlKGlkKSB7XHJcblx0XHQvLyByZW1vdmUgdGhlIHZhbHVlIGZyb20gdGhlIGFkYXB0b3JcclxuXHRcdHRoaXMuX2FkYXB0b3IucmVtb3ZlKGlkLCBEYXRlLm5vdygpKTtcclxuXHJcblx0XHQvLyBwcm9wb2dhdGUgdGhlIGNoYW5nZVxyXG5cdFx0dGhpcy5lbWl0KFwiY2hhbmdlXCIsIHtcclxuXHRcdFx0dHlwZTogXCJyZW1vdmVcIixcclxuXHRcdFx0aWRcclxuXHRcdH0pO1xyXG5cdH1cclxufVxyXG5cclxubW9kdWxlLmV4cG9ydHMgPSBQb29sU3RvcmU7XHJcbiIsIi8qKlxyXG4gKiBBIHdyYXBwZXIgdGhhdCBzeW5jcm9uaXplcyBsb2NhbCBjaGFuZ2VzIHdpdGggYSByZW1vdGUgaG9zdFxyXG4gKi9cclxuXHJcbnZhciBLZXlWYWx1ZVN0b3JlID0gcmVxdWlyZShcIi4va2V5LXZhbHVlLXN0b3JlXCIpO1xyXG5cclxuY2xhc3MgU3luY2VyIHtcclxuXHRjb25zdHJ1Y3RvcihvcHRzKSB7XHJcblx0XHR0aGlzLl9sb2NhbCA9IG9wdHMubG9jYWw7XHJcblx0XHR0aGlzLl9yZW1vdGUgPSBvcHRzLnJlbW90ZTtcclxuXHRcdHRoaXMuX2NoYW5nZVN0b3JlID0gbmV3IEtleVZhbHVlU3RvcmUob3B0cy5jaGFuZ2VTdG9yZSk7XHJcblx0XHR0aGlzLl9jaGFuZ2VzTmFtZSA9IG9wdHMuY2hhbmdlc05hbWUgfHwgXCJjaGFuZ2VzXCI7XHJcblxyXG5cdFx0Ly8gc2F2ZSBhbGwgdGhlIGlkcyB0byBvcHRpbWl6ZSBjcmVhdGVzXHJcblx0XHR0aGlzLl9pZHMgPSB0aGlzLmdldEFsbCgpXHJcblx0XHRcdC50aGVuKGFsbCA9PiBhbGwubWFwKHZhbHVlID0+IHZhbHVlLmlkKSk7XHJcblx0fVxyXG5cclxuXHQvLyBwYXNzIHRocm91Z2ggZ2V0IGFuZCBnZXRBbGxcclxuXHRnZXRBbGwoKSB7IHJldHVybiB0aGlzLl9sb2NhbC5nZXRBbGwoKTsgfVxyXG5cdGdldChrZXkpIHsgcmV0dXJuIHRoaXMuX2xvY2FsLmdldChrZXkpOyB9XHJcblxyXG5cdC8vIGtlZXAgdHJhY2sgb2YgYW55IGNyZWF0ZWQgdmFsdWVzXHJcblx0c2V0KHZhbHVlKSB7XHJcblx0XHQvLyBjaGVjayBpZiB0aGlzIGlzIGEgY3JlYXRlXHJcblx0XHR0aGlzLl9pZHMgPSB0aGlzLl9pZHMudGhlbihpZHMgPT4ge1xyXG5cdFx0XHQvLyBuZXcgdmFsdWVcclxuXHRcdFx0aWYoaWRzLmluZGV4T2YodmFsdWUuaWQpID09PSAtMSkge1xyXG5cdFx0XHRcdGlkcy5wdXNoKHZhbHVlLmlkKTtcclxuXHJcblx0XHRcdFx0Ly8gc2F2ZSB0aGUgY2hhbmdlXHJcblx0XHRcdFx0dGhpcy5fY2hhbmdlKFwiY3JlYXRlXCIsIHZhbHVlLmlkKTtcclxuXHRcdFx0fVxyXG5cclxuXHRcdFx0cmV0dXJuIGlkcztcclxuXHRcdH0pO1xyXG5cclxuXHRcdC8vIHN0b3JlIHRoZSB2YWx1ZVxyXG5cdFx0cmV0dXJuIHRoaXMuX2lkcy50aGVuKCgpID0+IHRoaXMuX2xvY2FsLnNldCh2YWx1ZSkpO1xyXG5cdH1cclxuXHJcblx0Ly8ga2VlcCB0cmFjayBvZiBkZWxldGVkIHZhbHVlc1xyXG5cdHJlbW92ZShrZXkpIHtcclxuXHRcdHRoaXMuX2lkcyA9IHRoaXMuX2lkcy50aGVuKGlkcyA9PiB7XHJcblx0XHRcdC8vIHJlbW92ZSB0aGlzIGZyb20gdGhlIGFsbCBpZHMgbGlzdFxyXG5cdFx0XHR2YXIgaW5kZXggPSBpZHMuaW5kZXhPZihrZXkpO1xyXG5cclxuXHRcdFx0aWYoaW5kZXggIT09IC0xKSB7XHJcblx0XHRcdFx0aWRzLnNwbGljZShpbmRleCwgMSk7XHJcblx0XHRcdH1cclxuXHJcblx0XHRcdC8vIHNhdmUgdGhlIGNoYW5nZVxyXG5cdFx0XHR0aGlzLl9jaGFuZ2UoXCJyZW1vdmVcIiwga2V5KTtcclxuXHRcdH0pO1xyXG5cclxuXHRcdC8vIHJlbW92ZSB0aGUgYWN0dWFsIHZhbHVlXHJcblx0XHRyZXR1cm4gdGhpcy5faWRzLnRoZW4oKCkgPT4gdGhpcy5fbG9jYWwucmVtb3ZlKGtleSkpO1xyXG5cdH1cclxuXHJcblx0Ly8gc3RvcmUgYSBjaGFuZ2UgaW4gdGhlIGNoYW5nZSBzdG9yZVxyXG5cdF9jaGFuZ2UodHlwZSwgaWQpIHtcclxuXHRcdC8vIGdldCB0aGUgY2hhbmdlc1xyXG5cdFx0dGhpcy5fY2hhbmdlU3RvcmUuZ2V0KHRoaXMuX2NoYW5nZXNOYW1lLCBbXSlcclxuXHJcblx0XHQudGhlbihjaGFuZ2VzID0+IHtcclxuXHRcdFx0Ly8gYWRkIHRoZSBjaGFuZ2VcclxuXHRcdFx0Y2hhbmdlcy5wdXNoKHsgdHlwZSwgaWQsIHRpbWVzdGFtcDogRGF0ZS5ub3coKSB9KTtcclxuXHJcblx0XHRcdC8vIHNhdmUgdGhlIGNoYW5nZXNcclxuXHRcdFx0cmV0dXJuIHRoaXMuX2NoYW5nZVN0b3JlLnNldCh0aGlzLl9jaGFuZ2VzTmFtZSwgY2hhbmdlcyk7XHJcblx0XHR9KTtcclxuXHR9XHJcblxyXG5cdC8vIHN5bmMgdGhlIHR3byBzdG9yZXNcclxuXHRzeW5jKCkge1xyXG5cdFx0cmV0dXJuIG5ldyBTeW5jKHRoaXMuX2xvY2FsLCB0aGlzLl9yZW1vdGUsIHRoaXMuX2NoYW5nZVN0b3JlLCB0aGlzLl9jaGFuZ2VzTmFtZSkuc3luYygpO1xyXG5cdH1cclxuXHJcblx0Ly8gZ2V0IHRoZSByZW1vdGUgYWNjZXNzIGxldmVsXHJcblx0YWNjZXNzTGV2ZWwoKSB7XHJcblx0XHRyZXR1cm4gdGhpcy5fcmVtb3RlLmFjY2Vzc0xldmVsKClcclxuXHJcblx0XHQvLyBpZiBhbnl0aGluZyBnb2VzIHdyb25nIGFzc3VtZSBmdWxsIHBlcm1pc3Npb25zXHJcblx0XHQuY2F0Y2goKCkgPT4gXCJmdWxsXCIpO1xyXG5cdH1cclxufVxyXG5cclxuLy8gYSBzaW5nbGUgc3luY1xyXG5jbGFzcyBTeW5jIHtcclxuXHRjb25zdHJ1Y3Rvcihsb2NhbCwgcmVtb3RlLCBjaGFuZ2VTdG9yZSwgY2hhbmdlc05hbWUpIHtcclxuXHRcdHRoaXMuX2xvY2FsID0gbG9jYWw7XHJcblx0XHR0aGlzLl9yZW1vdGUgPSByZW1vdGU7XHJcblx0XHR0aGlzLl9jaGFuZ2VTdG9yZSA9IGNoYW5nZVN0b3JlO1xyXG5cdFx0dGhpcy5fY2hhbmdlc05hbWUgPSBjaGFuZ2VzTmFtZTtcclxuXHR9XHJcblxyXG5cdHN5bmMoKSB7XHJcblx0XHQvLyBnZXQgdGhlIGlkcyBhbmQgbGFzdCBtb2RpZmllZCBkYXRlcyBmb3IgYWxsIHJlbW90ZSB2YWx1ZXNcclxuXHRcdHJldHVybiB0aGlzLmdldE1vZGlmaWVkcygpXHJcblxyXG5cdFx0LnRoZW4obW9kaWZpZWRzID0+IHtcclxuXHRcdFx0Ly8gcmVtb3ZlIHRoZSB2YWx1ZXMgd2UgZGVsZXRlZCBmcm9tIHRoZSByZW1vdGUgaG9zdFxyXG5cdFx0XHRyZXR1cm4gdGhpcy5yZW1vdmUobW9kaWZpZWRzKVxyXG5cclxuXHRcdFx0Ly8gbWVyZ2UgbW9kaWZpZWQgdmFsdWVzXHJcblx0XHRcdC50aGVuKCgpID0+IHRoaXMubWVyZ2VNb2RpZmllZHMobW9kaWZpZWRzKSk7XHJcblx0XHR9KVxyXG5cclxuXHRcdC50aGVuKHJlbW90ZURlbGV0ZXMgPT4ge1xyXG5cdFx0XHQvLyBzZW5kIHZhbHVlcyB3ZSBjcmVhdGVkIHNpbmNlIHRoZSBsYXN0IHN5bmNcclxuXHRcdFx0cmV0dXJuIHRoaXMuY3JlYXRlKHJlbW90ZURlbGV0ZXMpXHJcblxyXG5cdFx0XHQvLyByZW1vdmUgYW55IGl0ZW1zIHRoYXQgd2hlcmUgZGVsZXRlZCByZW1vdGx5XHJcblx0XHRcdC50aGVuKCgpID0+IHRoaXMuYXBwbHlEZWxldGVzKHJlbW90ZURlbGV0ZXMpKTtcclxuXHRcdH0pXHJcblxyXG5cdFx0Ly8gY2xlYXIgdGhlIGNoYW5nZXNcclxuXHRcdC50aGVuKCgpID0+IHRoaXMuX2NoYW5nZVN0b3JlLnNldCh0aGlzLl9jaGFuZ2VzTmFtZSwgW10pKTtcclxuXHR9XHJcblxyXG5cdC8vIGdldCB0aGUgbGFzdCBtb2RpZmllZCB0aW1lcyBmb3IgZWFjaCB2YWx1ZVxyXG5cdGdldE1vZGlmaWVkcygpIHtcclxuXHRcdHRoaXMuX2l0ZW1zID0ge307XHJcblxyXG5cdFx0cmV0dXJuIHRoaXMuX3JlbW90ZS5nZXRBbGwoKVxyXG5cclxuXHRcdC50aGVuKHZhbHVlcyA9PiB7XHJcblx0XHRcdHZhciBtb2RpZmllZHMgPSB7fTtcclxuXHJcblx0XHRcdGZvcihsZXQgdmFsdWUgb2YgdmFsdWVzKSB7XHJcblx0XHRcdFx0Ly8gc3RvcmUgdGhlIGl0ZW1zXHJcblx0XHRcdFx0dGhpcy5faXRlbXNbdmFsdWUuaWRdID0gdmFsdWU7XHJcblx0XHRcdFx0Ly8gZ2V0IHRoZSBtb2RpZmllZCB0aW1lc1xyXG5cdFx0XHRcdG1vZGlmaWVkc1t2YWx1ZS5pZF0gPSB2YWx1ZS5tb2RpZmllZDtcclxuXHRcdFx0fVxyXG5cclxuXHRcdFx0cmV0dXJuIG1vZGlmaWVkcztcclxuXHRcdH0pO1xyXG5cdH1cclxuXHJcblx0Ly8gcmVtb3ZlIHZhbHVlcyB3ZSBoYXZlIGRlbGV0ZWQgc2luY2UgdGhlIGxhc3Qgc3luY1xyXG5cdHJlbW92ZShtb2RpZmllZHMpIHtcclxuXHRcdHJldHVybiB0aGlzLl9jaGFuZ2VTdG9yZS5nZXQodGhpcy5fY2hhbmdlc05hbWUsIFtdKVxyXG5cclxuXHRcdC50aGVuKGNoYW5nZXMgPT4ge1xyXG5cdFx0XHR2YXIgcHJvbWlzZXMgPSBbXTtcclxuXHJcblx0XHRcdC8vIHJlbW92ZSB0aGUgaXRlbXMgd2UgcmVtb3ZlIGZyb20gbW9kaWZpZWRzXHJcblx0XHRcdGZvcihsZXQgY2hhbmdlIG9mIGNoYW5nZXMpIHtcclxuXHRcdFx0XHRpZihjaGFuZ2UudHlwZSA9PSBcInJlbW92ZVwiICYmIGNoYW5nZS50aW1lc3RhbXAgPj0gbW9kaWZpZWRzW2NoYW5nZS5pZF0pIHtcclxuXHRcdFx0XHRcdC8vIGRvbid0IHRyeSB0byBjcmVhdGUgdGhlIGl0ZW0gbG9jYWxseVxyXG5cdFx0XHRcdFx0ZGVsZXRlIG1vZGlmaWVkc1tjaGFuZ2UuaWRdO1xyXG5cclxuXHRcdFx0XHRcdC8vIGRlbGV0ZSBpdCByZW1vdGVseVxyXG5cdFx0XHRcdFx0cHJvbWlzZXMucHVzaCh0aGlzLl9yZW1vdGUucmVtb3ZlKGNoYW5nZS5pZCkpXHJcblx0XHRcdFx0fVxyXG5cdFx0XHR9XHJcblxyXG5cdFx0XHRyZXR1cm4gUHJvbWlzZS5hbGwocHJvbWlzZXMpO1xyXG5cdFx0fSk7XHJcblx0fVxyXG5cclxuXHQvLyB1cGRhdGUgdGhlIGxvY2FsL3JlbW90ZSB2YWx1ZXMgdGhhdCB3aGVyZSBjaGFuZ2VkXHJcblx0bWVyZ2VNb2RpZmllZHMobW9kaWZpZWRzKSB7XHJcblx0XHR2YXIgcmVtb3RlRGVsZXRlcyA9IFtdO1xyXG5cclxuXHRcdC8vIGdvIHRocm91Z2ggYWxsIHRoZSBtb2RpZmllZHNcclxuXHRcdHJldHVybiB0aGlzLl9sb2NhbC5nZXRBbGwoKVxyXG5cclxuXHRcdC50aGVuKHZhbHVlcyA9PiB7XHJcblx0XHRcdHZhciBwcm9taXNlcyA9IFtdO1xyXG5cdFx0XHQvLyBzdGFydCB3aXRoIGEgbGlzdCBvZiBhbGwgdGhlIGlkcyBhbmQgcmVtb3ZlIGlkcyB3ZSBoYXZlIGxvY2FsbHlcclxuXHRcdFx0dmFyIHJlbW90ZUNyZWF0ZXMgPSBPYmplY3QuZ2V0T3duUHJvcGVydHlOYW1lcyhtb2RpZmllZHMpO1xyXG5cclxuXHRcdFx0Ly8gY2hlY2sgYWxsIHRoZSBsb2NhbCB2YWx1ZXMgYWdhaW5zdCB0aGUgcmVtb3RlIG9uZXNcclxuXHRcdFx0Zm9yKGxldCB2YWx1ZSBvZiB2YWx1ZXMpIHtcclxuXHRcdFx0XHQvLyByZW1vdmUgaXRlbXMgd2UgYWxyZWFkeSBoYXZlIGZyb20gdGhlIGNyZWF0ZXNcclxuXHRcdFx0XHRsZXQgaW5kZXggPSByZW1vdGVDcmVhdGVzLmluZGV4T2YodmFsdWUuaWQpO1xyXG5cclxuXHRcdFx0XHRpZihpbmRleCAhPT0gLTEpIHtcclxuXHRcdFx0XHRcdHJlbW90ZUNyZWF0ZXMuc3BsaWNlKGluZGV4LCAxKTtcclxuXHRcdFx0XHR9XHJcblxyXG5cdFx0XHRcdC8vIGRlbGV0ZWQgZnJvbSB0aGUgcmVtb3RlIGFkYXB0b3JcclxuXHRcdFx0XHRpZighbW9kaWZpZWRzW3ZhbHVlLmlkXSkge1xyXG5cdFx0XHRcdFx0cmVtb3RlRGVsZXRlcy5wdXNoKHZhbHVlLmlkKTtcclxuXHRcdFx0XHR9XHJcblx0XHRcdFx0Ly8gdGhlIHJlbW90ZSB2ZXJzaW9uIGlzIG5ld2VyXHJcblx0XHRcdFx0ZWxzZSBpZihtb2RpZmllZHNbdmFsdWUuaWRdID4gdmFsdWUubW9kaWZpZWQpIHtcclxuXHRcdFx0XHRcdHByb21pc2VzLnB1c2goXHJcblx0XHRcdFx0XHRcdC8vIGZldGNoIHRoZSByZW1vdGUgdmFsdWVcclxuXHRcdFx0XHRcdFx0dGhpcy5nZXQodmFsdWUuaWQpXHJcblxyXG5cdFx0XHRcdFx0XHQudGhlbihuZXdWYWx1ZSA9PiB0aGlzLl9sb2NhbC5zZXQobmV3VmFsdWUpKVxyXG5cdFx0XHRcdFx0KTtcclxuXHRcdFx0XHR9XHJcblx0XHRcdFx0Ly8gdGhlIGxvY2FsIHZlcnNpb24gaXMgbmV3ZXJcclxuXHRcdFx0XHRlbHNlIHtcclxuXHRcdFx0XHRcdHByb21pc2VzLnB1c2godGhpcy5fcmVtb3RlLnNldCh2YWx1ZSkpO1xyXG5cdFx0XHRcdH1cclxuXHRcdFx0fVxyXG5cclxuXHRcdFx0Ly8gZ2V0IHZhbHVlcyBmcm9tIHRoZSByZW1vdGUgd2UgYXJlIG1pc3NpbmdcclxuXHRcdFx0Zm9yKGxldCBpZCBvZiByZW1vdGVDcmVhdGVzKSB7XHJcblx0XHRcdFx0cHJvbWlzZXMucHVzaChcclxuXHRcdFx0XHRcdHRoaXMuZ2V0KGlkKVxyXG5cclxuXHRcdFx0XHRcdC50aGVuKG5ld1ZhbHVlID0+IHRoaXMuX2xvY2FsLnNldChuZXdWYWx1ZSkpXHJcblx0XHRcdFx0KTtcclxuXHRcdFx0fVxyXG5cclxuXHRcdFx0cmV0dXJuIFByb21pc2UuYWxsKHByb21pc2VzKTtcclxuXHRcdH0pXHJcblxyXG5cdFx0Ly8gcmV0dXJuIHRoZSBkZWxldGVzXHJcblx0XHQudGhlbigoKSA9PiByZW1vdGVEZWxldGVzKTtcclxuXHR9XHJcblxyXG5cdC8vIGdldCBhIHJlbW90ZSB2YWx1ZVxyXG5cdGdldChpZCkge1xyXG5cdFx0cmV0dXJuIFByb21pc2UucmVzb2x2ZSh0aGlzLl9pdGVtc1tpZF0pO1xyXG5cdH1cclxuXHJcblx0Ly8gc2VuZCBjcmVhdGVkIHZhbHVlcyB0byB0aGUgc2VydmVyXHJcblx0Y3JlYXRlKHJlbW90ZURlbGV0ZXMpIHtcclxuXHRcdHJldHVybiB0aGlzLl9jaGFuZ2VTdG9yZS5nZXQodGhpcy5fY2hhbmdlc05hbWUpXHJcblxyXG5cdFx0LnRoZW4oKGNoYW5nZXMgPSBbXSkgPT4ge1xyXG5cdFx0XHR2YXIgcHJvbWlzZXMgPSBbXTtcclxuXHJcblx0XHRcdC8vIHJlbW92ZSB0aGUgaXRlbXMgd2UgcmVtb3ZlIGZyb20gbW9kaWZpZWRzXHJcblx0XHRcdGZvcihsZXQgY2hhbmdlIG9mIGNoYW5nZXMpIHtcclxuXHRcdFx0XHRpZihjaGFuZ2UudHlwZSA9PSBcImNyZWF0ZVwiKSB7XHJcblx0XHRcdFx0XHQvLyBpZiB3ZSBtYXJrZWQgdGhpcyB2YWx1ZSBhcyBhIGRlbGV0ZSB1bmRvIHRoYXRcclxuXHRcdFx0XHRcdGxldCBpbmRleCA9IHJlbW90ZURlbGV0ZXMuaW5kZXhPZihjaGFuZ2UuaWQpO1xyXG5cclxuXHRcdFx0XHRcdGlmKGluZGV4ICE9PSAtMSkge1xyXG5cdFx0XHRcdFx0XHRyZW1vdGVEZWxldGVzLnNwbGljZShpbmRleCwgMSk7XHJcblx0XHRcdFx0XHR9XHJcblxyXG5cdFx0XHRcdFx0Ly8gc2F2ZSB0aGUgdmFsdWUgdG8gdGhlIHJlbW90ZVxyXG5cdFx0XHRcdFx0cHJvbWlzZXMucHVzaChcclxuXHRcdFx0XHRcdFx0dGhpcy5fbG9jYWwuZ2V0KGNoYW5nZS5pZClcclxuXHJcblx0XHRcdFx0XHRcdC50aGVuKHZhbHVlID0+IHRoaXMuX3JlbW90ZS5zZXQodmFsdWUpKVxyXG5cdFx0XHRcdFx0KTtcclxuXHRcdFx0XHR9XHJcblx0XHRcdH1cclxuXHJcblx0XHRcdHJldHVybiBQcm9taXNlLmFsbChwcm9taXNlcyk7XHJcblx0XHR9KTtcclxuXHR9XHJcblxyXG5cdC8vIGRlbGV0ZSB2YWx1ZXMgdGhhdCB3aGVyZSBkZWxldGVkIGZyb20gdGhlIHJlbW90ZSBob3N0XHJcblx0YXBwbHlEZWxldGVzKHJlbW90ZURlbGV0ZXMpIHtcclxuXHRcdHJldHVybiBQcm9taXNlLmFsbChyZW1vdGVEZWxldGVzLm1hcChpZCA9PiB0aGlzLl9sb2NhbC5yZW1vdmUoaWQpKSk7XHJcblx0fVxyXG59XHJcblxyXG5tb2R1bGUuZXhwb3J0cyA9IFN5bmNlcjtcclxuIiwiLyoqXHJcbiAqIENyZWF0ZSBhIGdsb2JhbCBvYmplY3Qgd2l0aCBjb21tb25seSB1c2VkIG1vZHVsZXMgdG8gYXZvaWQgNTAgbWlsbGlvbiByZXF1aXJlc1xyXG4gKi9cclxuXHJcbnZhciBFdmVudEVtaXR0ZXIgPSByZXF1aXJlKFwiLi91dGlsL2V2ZW50LWVtaXR0ZXJcIik7XHJcblxyXG52YXIgbGlmZUxpbmUgPSBuZXcgRXZlbnRFbWl0dGVyKCk7XHJcblxyXG4vLyBwbGF0Zm9ybSBkZXRlY3Rpb25cclxubGlmZUxpbmUubm9kZSA9IHR5cGVvZiBwcm9jZXNzID09IFwib2JqZWN0XCI7XHJcbmxpZmVMaW5lLmJyb3dzZXIgPSB0eXBlb2Ygd2luZG93ID09IFwib2JqZWN0XCI7XHJcblxyXG4vLyBhdHRhY2ggdXRpbHNcclxubGlmZUxpbmUuRGlzcG9zYWJsZSA9IHJlcXVpcmUoXCIuL3V0aWwvZGlzcG9zYWJsZVwiKTtcclxubGlmZUxpbmUuRXZlbnRFbWl0dGVyID0gRXZlbnRFbWl0dGVyO1xyXG5cclxuLy8gYXR0YWNoIGxpZmVsaW5lIHRvIHRoZSBnbG9iYWwgb2JqZWN0XHJcbihsaWZlTGluZS5ub2RlID8gZ2xvYmFsIDogYnJvd3NlcikubGlmZUxpbmUgPSBsaWZlTGluZTtcclxuXHJcbi8vIGF0dGFjaCBjb25maWdcclxudmFyIE1lbUFkYXB0b3IgPSByZXF1aXJlKFwiLi9kYXRhLXN0b3Jlcy9tZW0tYWRhcHRvclwiKTtcclxudmFyIEtleVZhbHVlU3RvcmUgPSByZXF1aXJlKFwiLi9kYXRhLXN0b3Jlcy9rZXktdmFsdWUtc3RvcmVcIik7XHJcblxyXG5saWZlTGluZS5jb25maWcgPSBuZXcgS2V5VmFsdWVTdG9yZShuZXcgTWVtQWRhcHRvcigpKTtcclxuIiwiLyoqXHJcbiAqIEtlZXAgYSBsaXN0IG9mIHN1YnNjcmlwdGlvbnMgdG8gdW5zdWJzY3JpYmUgZnJvbSB0b2dldGhlclxyXG4gKi9cclxuXHJcbmNsYXNzIERpc3Bvc2FibGUge1xyXG5cdGNvbnN0cnVjdG9yKCkge1xyXG5cdFx0dGhpcy5fc3Vic2NyaXB0aW9ucyA9IFtdO1xyXG5cdH1cclxuXHJcblx0Ly8gVW5zdWJzY3JpYmUgZnJvbSBhbGwgc3Vic2NyaXB0aW9uc1xyXG5cdGRpc3Bvc2UoKSB7XHJcblx0XHQvLyByZW1vdmUgdGhlIGZpcnN0IHN1YnNjcmlwdGlvbiB1bnRpbCB0aGVyZSBhcmUgbm9uZSBsZWZ0XHJcblx0XHR3aGlsZSh0aGlzLl9zdWJzY3JpcHRpb25zLmxlbmd0aCA+IDApIHtcclxuXHRcdFx0dGhpcy5fc3Vic2NyaXB0aW9ucy5zaGlmdCgpLnVuc3Vic2NyaWJlKCk7XHJcblx0XHR9XHJcblx0fVxyXG5cclxuXHQvLyBBZGQgYSBzdWJzY3JpcHRpb24gdG8gdGhlIGRpc3Bvc2FibGVcclxuXHRhZGQoc3Vic2NyaXB0aW9uKSB7XHJcblx0XHR0aGlzLl9zdWJzY3JpcHRpb25zLnB1c2goc3Vic2NyaXB0aW9uKTtcclxuXHR9XHJcblxyXG5cdC8vIGRpc3Bvc2Ugd2hlbiBhbiBldmVudCBpcyBmaXJlZFxyXG5cdGRpc3Bvc2VPbihlbWl0dGVyLCBldmVudCkge1xyXG5cdFx0dGhpcy5hZGQoZW1pdHRlci5vbihldmVudCwgKCkgPT4gdGhpcy5kaXNwb3NlKCkpKTtcclxuXHR9XHJcbn07XHJcblxyXG5tb2R1bGUuZXhwb3J0cyA9IERpc3Bvc2FibGU7XHJcbiIsIi8qKlxyXG4gKiBBIGJhc2ljIGV2ZW50IGVtaXR0ZXJcclxuICovXHJcblxyXG5jbGFzcyBFdmVudEVtaXR0ZXIge1xyXG5cdGNvbnN0cnVjdG9yKCkge1xyXG5cdFx0dGhpcy5fbGlzdGVuZXJzID0ge307XHJcblx0fVxyXG5cclxuXHQvKipcclxuXHQgKiBBZGQgYW4gZXZlbnQgbGlzdGVuZXJcclxuXHQgKi9cclxuXHRvbihuYW1lLCBsaXN0ZW5lcikge1xyXG5cdFx0Ly8gaWYgd2UgZG9uJ3QgaGF2ZSBhbiBleGlzdGluZyBsaXN0ZW5lcnMgYXJyYXkgY3JlYXRlIG9uZVxyXG5cdFx0aWYoIXRoaXMuX2xpc3RlbmVyc1tuYW1lXSkge1xyXG5cdFx0XHR0aGlzLl9saXN0ZW5lcnNbbmFtZV0gPSBbXTtcclxuXHRcdH1cclxuXHJcblx0XHQvLyBhZGQgdGhlIGxpc3RlbmVyXHJcblx0XHR0aGlzLl9saXN0ZW5lcnNbbmFtZV0ucHVzaChsaXN0ZW5lcik7XHJcblxyXG5cdFx0Ly8gZ2l2ZSB0aGVtIGEgc3Vic2NyaXB0aW9uXHJcblx0XHRyZXR1cm4ge1xyXG5cdFx0XHRfbGlzdGVuZXI6IGxpc3RlbmVyLFxyXG5cclxuXHRcdFx0dW5zdWJzY3JpYmU6ICgpID0+IHtcclxuXHRcdFx0XHQvLyBmaW5kIHRoZSBsaXN0ZW5lclxyXG5cdFx0XHRcdHZhciBpbmRleCA9IHRoaXMuX2xpc3RlbmVyc1tuYW1lXS5pbmRleE9mKGxpc3RlbmVyKTtcclxuXHJcblx0XHRcdFx0aWYoaW5kZXggIT09IC0xKSB7XHJcblx0XHRcdFx0XHR0aGlzLl9saXN0ZW5lcnNbbmFtZV0uc3BsaWNlKGluZGV4LCAxKTtcclxuXHRcdFx0XHR9XHJcblx0XHRcdH1cclxuXHRcdH07XHJcblx0fVxyXG5cclxuXHQvKipcclxuXHQgKiBFbWl0IGFuIGV2ZW50XHJcblx0ICovXHJcblx0ZW1pdChuYW1lLCAuLi5hcmdzKSB7XHJcblx0XHQvLyBjaGVjayBmb3IgbGlzdGVuZXJzXHJcblx0XHRpZih0aGlzLl9saXN0ZW5lcnNbbmFtZV0pIHtcclxuXHRcdFx0Zm9yKGxldCBsaXN0ZW5lciBvZiB0aGlzLl9saXN0ZW5lcnNbbmFtZV0pIHtcclxuXHRcdFx0XHQvLyBjYWxsIHRoZSBsaXN0ZW5lcnNcclxuXHRcdFx0XHRsaXN0ZW5lciguLi5hcmdzKTtcclxuXHRcdFx0fVxyXG5cdFx0fVxyXG5cdH1cclxuXHJcblx0LyoqXHJcblx0ICogRW1pdCBhbiBldmVudCBhbmQgc2tpcCBzb21lIGxpc3RlbmVyc1xyXG5cdCAqL1xyXG5cdHBhcnRpYWxFbWl0KG5hbWUsIHNraXBzID0gW10sIC4uLmFyZ3MpIHtcclxuXHRcdC8vIGFsbG93IGEgc2luZ2xlIGl0ZW1cclxuXHRcdGlmKCFBcnJheS5pc0FycmF5KHNraXBzKSkge1xyXG5cdFx0XHRza2lwcyA9IFtza2lwc107XHJcblx0XHR9XHJcblxyXG5cdFx0Ly8gY2hlY2sgZm9yIGxpc3RlbmVyc1xyXG5cdFx0aWYodGhpcy5fbGlzdGVuZXJzW25hbWVdKSB7XHJcblx0XHRcdGZvcihsZXQgbGlzdGVuZXIgb2YgdGhpcy5fbGlzdGVuZXJzW25hbWVdKSB7XHJcblx0XHRcdFx0Ly8gdGhpcyBldmVudCBsaXN0ZW5lciBpcyBiZWluZyBza2lwZWRcclxuXHRcdFx0XHRpZihza2lwcy5maW5kKHNraXAgPT4gc2tpcC5fbGlzdGVuZXIgPT0gbGlzdGVuZXIpKSB7XHJcblx0XHRcdFx0XHRjb250aW51ZTtcclxuXHRcdFx0XHR9XHJcblxyXG5cdFx0XHRcdC8vIGNhbGwgdGhlIGxpc3RlbmVyc1xyXG5cdFx0XHRcdGxpc3RlbmVyKC4uLmFyZ3MpO1xyXG5cdFx0XHR9XHJcblx0XHR9XHJcblx0fVxyXG59XHJcblxyXG5tb2R1bGUuZXhwb3J0cyA9IEV2ZW50RW1pdHRlcjtcclxuIl19
