(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){

},{}],2:[function(require,module,exports){
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

},{}],3:[function(require,module,exports){
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

},{"idb":2}],4:[function(require,module,exports){
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
		if (typeof window == "object") {
			lifeLine.nav.navigate(location.pathname);
		}
	});
};

if (typeof window == "object") {
	var progress = void 0;

	// start the sync
	assignmentsAdaptor.on("sync-start", function () {
		return progress = new lifeLine.Progress();
	});
	// update the progress
	assignmentsAdaptor.on("progress", function (value) {
		return progress.set(value);
	});
	// the sync is done
	assignmentsAdaptor.on("sync-complete", function (value) {
		return progress.set(1);
	});

	// initial sync
	setTimeout(function () {
		return lifeLine.sync();
	});

	// sync when we revisit the page
	window.addEventListener("visibilitychange", function () {
		if (!document.hidden) {
			lifeLine.sync();
		}
	});

	// sync when we reconnect
	window.addEventListener("online", function () {
		lifeLine.sync();
	});
}

},{"../../common/data-stores/http-adaptor":25,"../../common/data-stores/pool-store":27,"../../common/data-stores/syncer":28,"./idb-adaptor":3}],5:[function(require,module,exports){
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
// create the global object
require("../common/global");
require("./global");

// load all the widgets
require("./widgets/sidebar");
require("./widgets/content");
require("./widgets/link");
require("./widgets/list");
require("./widgets/input");
require("./widgets/progress");
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
	group: [{ widget: "sidebar" }, { widget: "progress" }, { widget: "content" }]
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

},{"../common/global":29,"./global":5,"./sw-helper":7,"./views/account":10,"./views/edit":11,"./views/item":12,"./views/lists":13,"./views/login":14,"./views/todo":15,"./views/users":16,"./widgets/content":17,"./widgets/input":18,"./widgets/link":19,"./widgets/list":20,"./widgets/progress":21,"./widgets/sidebar":22,"./widgets/toggle-btns":23}],7:[function(require,module,exports){
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
		// a notification was just clicked or something
		else if (e.data.type == "navigate") {
				lifeLine.nav.navigate(e.data.url);
			}
	});
}

},{}],8:[function(require,module,exports){
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

			// add the enable reminders button
			children.push({
				tag: "button",
				classes: "fancy-button",
				attrs: { style: "display: none;" },
				text: "Enable reminders",
				name: "pushBtn",
				on: {
					click: function () {
						navigator.serviceWorker.ready.then(function (reg) {
							// get the public key
							fetch("/api/public-key", {
								credentials: "include"
							}).then(function (res) {
								return res.arrayBuffer();
							}).then(function (key) {
								// get a subscription
								return reg.pushManager.subscribe({
									userVisibleOnly: true,
									applicationServerKey: new Uint8Array(key)
								});
							}).then(function (sub) {
								// send the subscription to the server
								fetch("/api/subscription", {
									method: "POST",
									body: JSON.stringify(sub),
									credentials: "include"
								})

								// hide the button
								.then(function () {
									return pushBtn.style.display = "none";
								});
							});
						});
					}
				}
			});

			// check if they are already enabled
			if (navigator.serviceWorker) {
				navigator.serviceWorker.ready.then(function (reg) {
					// check that push is supported
					if (reg.pushManager) {
						reg.pushManager.getSubscription().then(function (sub) {
							// no subscription
							if (!sub) {
								pushBtn.style.display = "block";
							}
						});
					}
				});
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
			    msg = _lifeLine$makeDom.msg,
			    pushBtn = _lifeLine$makeDom.pushBtn;

			// show a message


			var showMsg = function (text) {
				msg.innerText = text;
			};
		});
	}
});

},{"../../common/backup":24}],11:[function(require,module,exports){
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

		// sync if anything is changed
		var changed = false;

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

					// sync the changes
					lifeLine.sync();
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

				// remove exam fields from tasks and assignments
				if (item.type != "exam") {
					delete item.location;
				} else {
					delete item.description;
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
				changed = true;

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

				if (item.type == "exam") {
					mapped.descriptionField.style.display = "none";
					mapped.locationField.style.display = "";
				} else {
					mapped.descriptionField.style.display = "";
					mapped.locationField.style.display = "none";
				}

				// fill in date if it is missing
				if (item.type != "task") {
					if (!item.date) {
						item.date = genDate();
					}

					if (!item.class) {
						item.class = "Class";
					}

					if (item.type == "exam" && !item.location) {
						item.location = "Location";
					}
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
						btns: [{ text: "Assignment", value: "assignment" }, { text: "Task", value: "task" }, { text: "Exam", value: "exam" }],
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
					name: "locationField",
					classes: "editor-row",
					children: [{
						widget: "input",
						bind: item,
						prop: "location",
						change: change
					}]
				}, {
					name: "descriptionField",
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

		// sync if we changed anything
		disposable.add({
			unsubscribe: function () {
				if (changed) {
					lifeLine.sync();
				}
			}
		});
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
			if (actionEditSub) {
				if (actionDoneSub) actionDoneSub.unsubscribe();
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
			setTitle(item.type[0].toUpperCase() + item.type.substr(1));

			if (item.type != "exam") {
				// mark the item as done
				actionDoneSub = lifeLine.addAction(item.done ? "Done" : "Not done", function () {
					// mark the item done
					item.done = !item.done;

					// update the modified time
					item.modified = Date.now();

					// save the change
					assignments.set(item);

					// sync the change
					lifeLine.sync();
				});
			}

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
					text: item.description || item.location
				}]
			});
		}));
	}
});

},{"../data-stores":4,"../util/date":8}],13:[function(require,module,exports){
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
				if (a.type != "task" && b.type != "task") {
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
					items.push(item.class || item.location);
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
/**
 * A list of things todo
 */

var _require = require("../util/date"),
    daysFromNow = _require.daysFromNow,
    isSameDate = _require.isSameDate,
    stringifyTime = _require.stringifyTime,
    stringifyDate = _require.stringifyDate,
    isSoonerDate = _require.isSoonerDate;

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
		disposable.add(assignments.query({
			done: false,
			// make sure the assignment is in the future
			date: function (date) {
				var today = new Date();

				return !date || isSoonerDate(today, new Date(date)) || isSameDate(today, new Date(date));
			}
		}, function (data) {
			// clear the old content
			content.innerHTML = "";

			var groups = {
				Tasks: [],
				Today: [],
				Tomorrow: []
			};

			var upcomming = [];

			// today and tomorrows dates
			var today = new Date();
			var tomorrow = daysFromNow(1);

			// sort by date
			data.sort(function (a, b) {
				if (a.type != "task" && b.type != "task") {
					return a.date.getTime() - b.date.getTime();
				}
			});

			// select the items to display
			data.forEach(function (item) {
				// assignments for today
				if (item.type != "task") {
					// today
					if (isSameDate(today, item.date)) {
						groups.Today.push(createUi(item));
					}
					// tomorrow
					else if (isSameDate(tomorrow, item.date)) {
							groups.Tomorrow.push(createUi(item));
						}
						// add upcomming items
						else if (upcomming.length < 10) {
								upcomming.push([item, createUi(item)]);
							}
				}

				// show any tasks
				if (item.type == "task") {
					groups.Tasks.push(createUi(item));
				}
			});

			// don't have too many items in the todo page
			var toRemove = groups.Today.length + groups.Tomorrow.length + groups.Tasks.length;

			upcomming = upcomming.slice(0, Math.max(0, 10 - toRemove));

			// add groups for each of the upcoming
			var _iteratorNormalCompletion = true;
			var _didIteratorError = false;
			var _iteratorError = undefined;

			try {
				for (var _iterator = upcomming[Symbol.iterator](), _step; !(_iteratorNormalCompletion = (_step = _iterator.next()).done); _iteratorNormalCompletion = true) {
					var day = _step.value;

					var strDate = stringifyDate(day[0].date);

					groups[strDate] || (groups[strDate] = []);

					groups[strDate].push(day[1]);
				}

				// remove any empty fields
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
	// render an assignment or exam
	else {
			return {
				href: "/item/" + item.id,
				items: [{
					text: item.type == "assignment" ? item.name : item.name + " - " + item.class,
					grow: true
				}, stringifyTime(item.date), item.type == "assignment" ? item.class : item.location]
			};
		}
};

},{"../data-stores":4,"../util/date":8}],16:[function(require,module,exports){
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
var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

/**
 * The progress bar at the top of the page
 */

lifeLine.makeDom.register("progress", {
	make: function () {
		return {
			classes: "progress",
			name: "progress"
		};
	},
	bind: function (opts, _ref) {
		var progress = _ref.progress;

		// set the progress bar value [0, 1]
		var setProgress = function (value) {
			var adjustBy = 0;

			if (value > 0) {
				// scale leaves the progress bar perfectly in the middle of the page
				// 1 - value gets the amount of space remaining
				// / 2 gets just the space on one side
				// / value gets that amount relitive to the progress bars scaled width
				// * 100 converts it to a percent
				adjustBy = (1 - value) / 2 / value * 100;
			}

			progress.style.transform = "scaleX(" + value + ") translateX(-" + adjustBy + "%)";
		};

		// hide the progress bar initially
		progress.style.transform = "scaleX(0)";

		render = function () {
			// calculate how much this percent contributes to the overall progress
			var contribution = 1 / progresses.length;

			setProgress(progresses.reduce(function (prog, perc) {
				return prog + perc.value * contribution;
			}, 0));
		};

		render();
	}
});

// sub render until progress is created
var render = function () {};

var progresses = [];

// combine multiple progress levels
lifeLine.Progress = function () {
	function _class() {
		_classCallCheck(this, _class);

		this.value = 0;

		progresses.push(this);

		render();
	}

	// set the progress


	_createClass(_class, [{
		key: "set",
		value: function set(value) {
			this.value = value;

			// all the jobs are done remove them
			if (progresses.every(function (prog) {
				return prog.value == 1;
			})) {
				progresses = [];
			}

			render();
		}
	}]);

	return _class;
}();

},{}],22:[function(require,module,exports){
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
/**
 * Name generator for backups
 */

exports.genBackupName = function () {
  var date = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : new Date();

  return "backup-" + date.getFullYear() + "-" + (date.getMonth() + 1) + "-" + date.getDate() + ("-" + date.getHours() + "-" + date.getMinutes() + ".zip");
};

},{}],25:[function(require,module,exports){
var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

/**
 * An adaptor for http based stores
 */

if (typeof window != "object" && typeof self != "object") {
	// polyfill fetch for node
	fetch = require("node-fetch");
}

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
				// server/service worker error
				if (res.status == 500) {
					return res.text().then(function (msg) {
						throw new Error(msg);
					});
				}

				return res.json();
			}).then(function (json) {
				// an error occured on the server
				if (json.status == "error") {
					throw new Error(json.data);
				}

				return json;
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

				// server/service worker error
				if (res.status == 500) {
					return res.text().then(function (msg) {
						throw new Error(msg);
					});
				}

				// parse the item
				return res.json();
			}).then(function (json) {
				// an error occured on the server
				if (json && json.status == "error") {
					throw new Error(json.data);
				}

				return json;
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

				// server/service worker error
				if (res.status == 500) {
					return res.text().then(function (msg) {
						throw new Error(msg);
					});
				}

				// parse the error message
				if (res.status != 304) {
					return res.json();
				}
			}).then(function (json) {
				// an error occured on the server
				if (json.status == "error") {
					throw new Error(json.data);
				}

				return json;
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

				// server/service worker error
				if (res.status == 500) {
					return res.text().then(function (msg) {
						throw new Error(msg);
					});
				}

				// parse the error message
				if (res.status != 304) {
					return res.json();
				}
			}).then(function (json) {
				// an error occured on the server
				if (json.status == "error") {
					throw new Error(json.data);
				}

				return json;
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

},{"node-fetch":1}],26:[function(require,module,exports){
var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _possibleConstructorReturn(self, call) { if (!self) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return call && (typeof call === "object" || typeof call === "function") ? call : self; }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }

/**
 * A basic key value data store
 */

var EventEmitter = require("../util/event-emitter");

var KeyValueStore = function (_EventEmitter) {
	_inherits(KeyValueStore, _EventEmitter);

	function KeyValueStore(adaptor) {
		_classCallCheck(this, KeyValueStore);

		var _this = _possibleConstructorReturn(this, (KeyValueStore.__proto__ || Object.getPrototypeOf(KeyValueStore)).call(this));

		_this._adaptor = adaptor;

		// make sure we have an adaptor
		if (!adaptor) {
			throw new Error("KeyValueStore must be initialized with an adaptor");
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

			return this._adaptor.get(key).then(function (result) {
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
				var promise = this._adaptor.set({
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

							promises.push(this._adaptor.set({
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

			// if a change is triggered before get comes back don't emit the value from get
			var changeRecieved = false;

			// send the current value
			if (opts.current) {
				this.get(key, opts.default).then(function (value) {
					if (!changeRecieved) {
						fn(value);
					}
				});
			}

			// listen for any changes
			return this.on(key, function (value) {
				// only emit the change if there is not an override in place
				if (!_this2._overrides || !_this2._overrides.hasOwnProperty(key)) {
					fn(value);
				}

				changeRecieved = true;
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

			// emit changes for each of the overrides
			Object.getOwnPropertyNames(overrides).forEach(function (key) {
				return _this3.emit(key, overrides[key]);
			});

			// set the overrides after so the emit is not blocked
			this._overrides = overrides;
		}
	}]);

	return KeyValueStore;
}(EventEmitter);

module.exports = KeyValueStore;

},{"../util/event-emitter":31}],27:[function(require,module,exports){
var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _possibleConstructorReturn(self, call) { if (!self) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return call && (typeof call === "object" || typeof call === "function") ? call : self; }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }

/**
 * A data store which contains a pool of objects which are queryable by any property
 */

var EventEmitter = require("../util/event-emitter");

var PoolStore = function (_EventEmitter) {
	_inherits(PoolStore, _EventEmitter);

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
				// not an item
				if (!value) return false;

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
			var current = "id" in props ? this._adaptor.get(props.id).then(function (value) {
				return [value];
			}) : this._adaptor.getAll();

			current = current.then(function (values) {
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
					unsubscribe: function () {
						// if we are listening stop
						if (subscription) {
							subscription.unsubscribe();
						}

						// don't listen
						stopped = true;
					}
				};
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
			var result = this._adaptor.set(value);

			// propogate the change
			this.emit("change", {
				type: "change",
				id: value.id,
				value: value
			});

			return result;
		}

		/**
   * Remove a value from the pool
   */

	}, {
		key: "remove",
		value: function remove(id) {
			// remove the value from the adaptor
			var result = this._adaptor.remove(id, Date.now());

			// propogate the change
			this.emit("change", {
				type: "remove",
				id: id
			});

			return result;
		}
	}]);

	return PoolStore;
}(EventEmitter);

module.exports = PoolStore;

},{"../util/event-emitter":31}],28:[function(require,module,exports){
var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _possibleConstructorReturn(self, call) { if (!self) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return call && (typeof call === "object" || typeof call === "function") ? call : self; }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }

/**
 * A wrapper that syncronizes local changes with a remote host
 */

var KeyValueStore = require("./key-value-store");
var EventEmitter = require("../util/event-emitter");

var Syncer = function (_EventEmitter) {
	_inherits(Syncer, _EventEmitter);

	function Syncer(opts) {
		_classCallCheck(this, Syncer);

		var _this = _possibleConstructorReturn(this, (Syncer.__proto__ || Object.getPrototypeOf(Syncer)).call(this));

		_this._local = opts.local;
		_this._remote = opts.remote;
		_this._changeStore = new KeyValueStore(opts.changeStore);
		_this._changesName = opts.changesName || "changes";

		// save all the ids to optimize creates
		_this._ids = _this.getAll().then(function (all) {
			return all.map(function (value) {
				return value.id;
			});
		});
		return _this;
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
			var _this2 = this;

			// check if this is a create
			this._ids = this._ids.then(function (ids) {
				// new value
				if (ids.indexOf(value.id) === -1) {
					ids.push(value.id);

					// save the change
					_this2._change("create", value.id);
				}

				return ids;
			});

			// store the value
			return this._ids.then(function () {
				return _this2._local.set(value);
			});
		}

		// keep track of deleted values

	}, {
		key: "remove",
		value: function remove(key) {
			var _this3 = this;

			this._ids = this._ids.then(function (ids) {
				// remove this from the all ids list
				var index = ids.indexOf(key);

				if (index !== -1) {
					ids.splice(index, 1);
				}

				// save the change
				_this3._change("remove", key);
			});

			// remove the actual value
			return this._ids.then(function () {
				return _this3._local.remove(key);
			});
		}

		// store a change in the change store

	}, {
		key: "_change",
		value: function _change(type, id) {
			var _this4 = this;

			// get the changes
			this._changeStore.get(this._changesName, []).then(function (changes) {
				// add the change
				changes.push({ type: type, id: id, timestamp: Date.now() });

				// save the changes
				return _this4._changeStore.set(_this4._changesName, changes);
			});
		}

		// sync the two stores

	}, {
		key: "sync",
		value: function sync() {
			var _this5 = this;

			// only run one sync at a time
			if (this._syncing) return this._syncing;

			var retryCount = 3;
			var $sync = new Sync(this._local, this._remote, this._changeStore, this._changesName);

			// pass on the progress
			var sub = $sync.on("progress", function (value) {
				return _this5.emit("progress", value);
			});

			var sync = function () {
				// tell the ui we are syncing
				_this5.emit("sync-start");

				// attempt to sync
				return $sync.sync().then(function () {
					// the the ui the sync has succeeded
					_this5.emit("sync-complete", { failed: false });
				}).catch(function (err) {
					var retrying = retryCount-- > 0 && (typeof navigator != "object" || navigator.onLine);

					// tell the ui the sync failed
					_this5.emit("sync-complete", { retrying: retrying, failed: true });

					// retry if it fails
					if (retrying) {
						return new Promise(function (resolve) {
							// wait 1 second
							setTimeout(function () {
								return resolve(sync());
							}, 1000);
						});
					}
				});
			};

			// start the sync
			this._syncing = sync()

			// release the lock
			.then(function () {
				_this5._syncing = undefined;
				sub.unsubscribe();
			});

			return this._syncing;
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
}(EventEmitter);

// a single sync


var Sync = function (_EventEmitter2) {
	_inherits(Sync, _EventEmitter2);

	function Sync(local, remote, changeStore, changesName) {
		_classCallCheck(this, Sync);

		var _this6 = _possibleConstructorReturn(this, (Sync.__proto__ || Object.getPrototypeOf(Sync)).call(this));

		_this6._local = local;
		_this6._remote = remote;
		_this6._changeStore = changeStore;
		_this6._changesName = changesName;
		_this6._progress = 0;
		return _this6;
	}

	_createClass(Sync, [{
		key: "stepProgress",
		value: function stepProgress() {
			this._progress += 1 / 7;

			this.emit("progress", this._progress);
		}
	}, {
		key: "sync",
		value: function sync() {
			var _this7 = this;

			this.stepProgress();

			// get the ids and last modified dates for all remote values
			return this.getModifieds().then(function (modifieds) {
				_this7.stepProgress();

				// remove the values we deleted from the remote host
				return _this7.remove(modifieds)

				// merge modified values
				.then(function () {
					_this7.stepProgress();

					return _this7.mergeModifieds(modifieds);
				});
			}).then(function (remoteDeletes) {
				_this7.stepProgress();

				// send values we created since the last sync
				return _this7.create(remoteDeletes)

				// remove any items that where deleted remotly
				.then(function () {
					_this7.stepProgress();

					return _this7.applyDeletes(remoteDeletes);
				});
			})

			// clear the changes
			.then(function () {
				_this7.stepProgress();

				return _this7._changeStore.set(_this7._changesName, []);
			}).then(function () {
				_this7.stepProgress();
			});
		}

		// get the last modified times for each value

	}, {
		key: "getModifieds",
		value: function getModifieds() {
			var _this8 = this;

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
						_this8._items[value.id] = value;
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
			var _this9 = this;

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
							promises.push(_this9._remote.remove(change.id));
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
			var _this10 = this;

			var remoteDeletes = [];

			// go through all the modifieds
			return this._local.getAll().then(function (values) {
				var promises = [];

				// check all the local values against the remote ones
				var _iteratorNormalCompletion3 = true;
				var _didIteratorError3 = false;
				var _iteratorError3 = undefined;

				try {
					for (var _iterator3 = values[Symbol.iterator](), _step3; !(_iteratorNormalCompletion3 = (_step3 = _iterator3.next()).done); _iteratorNormalCompletion3 = true) {
						var value = _step3.value;

						// deleted from the remote adaptor
						if (!modifieds[value.id]) {
							remoteDeletes.push(value.id);
						}
						// the remote version is newer
						else if (modifieds[value.id] > value.modified) {
								promises.push(
								// fetch the remote value
								_this10.get(value.id).then(function (newValue) {
									return _this10._local.set(newValue);
								}));
							}
							// the local version is newer
							else if (modifieds[value.id] < value.modified) {
									promises.push(_this10._remote.set(value));
								}

						// remove items we already have from the creates
						if (modifieds[value.id]) {
							delete modifieds[value.id];
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
					for (var _iterator4 = Object.getOwnPropertyNames(modifieds)[Symbol.iterator](), _step4; !(_iteratorNormalCompletion4 = (_step4 = _iterator4.next()).done); _iteratorNormalCompletion4 = true) {
						var id = _step4.value;

						promises.push(_this10.get(id).then(function (newValue) {
							return _this10._local.set(newValue);
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
			var _this11 = this;

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
							promises.push(_this11._local.get(change.id).then(function (value) {
								return _this11._remote.set(value);
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
			var _this12 = this;

			return Promise.all(remoteDeletes.map(function (id) {
				return _this12._local.remove(id);
			}));
		}
	}]);

	return Sync;
}(EventEmitter);

module.exports = Syncer;

},{"../util/event-emitter":31,"./key-value-store":26}],29:[function(require,module,exports){
/**
 * Create a global object with commonly used modules to avoid 50 million requires
 */

var EventEmitter = require("./util/event-emitter");

var lifeLine = new EventEmitter();

// attach utils
lifeLine.Disposable = require("./util/disposable");
lifeLine.EventEmitter = EventEmitter;

// attach lifeline to the global object
(typeof window == "object" ? window : self).lifeLine = lifeLine;

},{"./util/disposable":30,"./util/event-emitter":31}],30:[function(require,module,exports){
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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCJub2RlX21vZHVsZXMvYnJvd3NlcmlmeS9saWIvX2VtcHR5LmpzIiwibm9kZV9tb2R1bGVzL2lkYi9saWIvaWRiLmpzIiwic3JjXFxjbGllbnRcXGRhdGEtc3RvcmVzXFxpZGItYWRhcHRvci5qcyIsInNyY1xcY2xpZW50XFxkYXRhLXN0b3Jlc1xcaW5kZXguanMiLCJzcmNcXGNsaWVudFxcZ2xvYmFsLmpzIiwic3JjXFxjbGllbnRcXGluZGV4LmpzIiwic3JjXFxjbGllbnRcXHN3LWhlbHBlci5qcyIsInNyY1xcY2xpZW50XFx1dGlsXFxkYXRlLmpzIiwic3JjXFxjbGllbnRcXHV0aWxcXGRvbS1tYWtlci5qcyIsInNyY1xcY2xpZW50XFx2aWV3c1xcYWNjb3VudC5qcyIsInNyY1xcY2xpZW50XFx2aWV3c1xcZWRpdC5qcyIsInNyY1xcY2xpZW50XFx2aWV3c1xcaXRlbS5qcyIsInNyY1xcY2xpZW50XFx2aWV3c1xcbGlzdHMuanMiLCJzcmNcXGNsaWVudFxcdmlld3NcXGxvZ2luLmpzIiwic3JjXFxjbGllbnRcXHZpZXdzXFx0b2RvLmpzIiwic3JjXFxjbGllbnRcXHZpZXdzXFx1c2Vycy5qcyIsInNyY1xcY2xpZW50XFx3aWRnZXRzXFxjb250ZW50LmpzIiwic3JjXFxjbGllbnRcXHdpZGdldHNcXGlucHV0LmpzIiwic3JjXFxjbGllbnRcXHdpZGdldHNcXGxpbmsuanMiLCJzcmNcXGNsaWVudFxcd2lkZ2V0c1xcbGlzdC5qcyIsInNyY1xcY2xpZW50XFx3aWRnZXRzXFxwcm9ncmVzcy5qcyIsInNyY1xcY2xpZW50XFx3aWRnZXRzXFxzaWRlYmFyLmpzIiwic3JjXFxjbGllbnRcXHdpZGdldHNcXHRvZ2dsZS1idG5zLmpzIiwic3JjXFxjb21tb25cXGJhY2t1cC5qcyIsInNyY1xcY29tbW9uXFxkYXRhLXN0b3Jlc1xcaHR0cC1hZGFwdG9yLmpzIiwic3JjXFxjb21tb25cXGRhdGEtc3RvcmVzXFxrZXktdmFsdWUtc3RvcmUuanMiLCJzcmNcXGNvbW1vblxcZGF0YS1zdG9yZXNcXHBvb2wtc3RvcmUuanMiLCJzcmNcXGNvbW1vblxcZGF0YS1zdG9yZXNcXHN5bmNlci5qcyIsInNyY1xcY29tbW9uXFxnbG9iYWwuanMiLCJzcmNcXGNvbW1vblxcdXRpbFxcZGlzcG9zYWJsZS5qcyIsInNyY1xcY29tbW9uXFx1dGlsXFxldmVudC1lbWl0dGVyLmpzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBO0FDQUE7O0FDQUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7Ozs7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c0NvbnRlbnQiOlsiKGZ1bmN0aW9uIGUodCxuLHIpe2Z1bmN0aW9uIHMobyx1KXtpZighbltvXSl7aWYoIXRbb10pe3ZhciBhPXR5cGVvZiByZXF1aXJlPT1cImZ1bmN0aW9uXCImJnJlcXVpcmU7aWYoIXUmJmEpcmV0dXJuIGEobywhMCk7aWYoaSlyZXR1cm4gaShvLCEwKTt2YXIgZj1uZXcgRXJyb3IoXCJDYW5ub3QgZmluZCBtb2R1bGUgJ1wiK28rXCInXCIpO3Rocm93IGYuY29kZT1cIk1PRFVMRV9OT1RfRk9VTkRcIixmfXZhciBsPW5bb109e2V4cG9ydHM6e319O3Rbb11bMF0uY2FsbChsLmV4cG9ydHMsZnVuY3Rpb24oZSl7dmFyIG49dFtvXVsxXVtlXTtyZXR1cm4gcyhuP246ZSl9LGwsbC5leHBvcnRzLGUsdCxuLHIpfXJldHVybiBuW29dLmV4cG9ydHN9dmFyIGk9dHlwZW9mIHJlcXVpcmU9PVwiZnVuY3Rpb25cIiYmcmVxdWlyZTtmb3IodmFyIG89MDtvPHIubGVuZ3RoO28rKylzKHJbb10pO3JldHVybiBzfSkiLCIiLCIndXNlIHN0cmljdCc7XG5cbihmdW5jdGlvbigpIHtcbiAgZnVuY3Rpb24gdG9BcnJheShhcnIpIHtcbiAgICByZXR1cm4gQXJyYXkucHJvdG90eXBlLnNsaWNlLmNhbGwoYXJyKTtcbiAgfVxuXG4gIGZ1bmN0aW9uIHByb21pc2lmeVJlcXVlc3QocmVxdWVzdCkge1xuICAgIHJldHVybiBuZXcgUHJvbWlzZShmdW5jdGlvbihyZXNvbHZlLCByZWplY3QpIHtcbiAgICAgIHJlcXVlc3Qub25zdWNjZXNzID0gZnVuY3Rpb24oKSB7XG4gICAgICAgIHJlc29sdmUocmVxdWVzdC5yZXN1bHQpO1xuICAgICAgfTtcblxuICAgICAgcmVxdWVzdC5vbmVycm9yID0gZnVuY3Rpb24oKSB7XG4gICAgICAgIHJlamVjdChyZXF1ZXN0LmVycm9yKTtcbiAgICAgIH07XG4gICAgfSk7XG4gIH1cblxuICBmdW5jdGlvbiBwcm9taXNpZnlSZXF1ZXN0Q2FsbChvYmosIG1ldGhvZCwgYXJncykge1xuICAgIHZhciByZXF1ZXN0O1xuICAgIHZhciBwID0gbmV3IFByb21pc2UoZnVuY3Rpb24ocmVzb2x2ZSwgcmVqZWN0KSB7XG4gICAgICByZXF1ZXN0ID0gb2JqW21ldGhvZF0uYXBwbHkob2JqLCBhcmdzKTtcbiAgICAgIHByb21pc2lmeVJlcXVlc3QocmVxdWVzdCkudGhlbihyZXNvbHZlLCByZWplY3QpO1xuICAgIH0pO1xuXG4gICAgcC5yZXF1ZXN0ID0gcmVxdWVzdDtcbiAgICByZXR1cm4gcDtcbiAgfVxuXG4gIGZ1bmN0aW9uIHByb21pc2lmeUN1cnNvclJlcXVlc3RDYWxsKG9iaiwgbWV0aG9kLCBhcmdzKSB7XG4gICAgdmFyIHAgPSBwcm9taXNpZnlSZXF1ZXN0Q2FsbChvYmosIG1ldGhvZCwgYXJncyk7XG4gICAgcmV0dXJuIHAudGhlbihmdW5jdGlvbih2YWx1ZSkge1xuICAgICAgaWYgKCF2YWx1ZSkgcmV0dXJuO1xuICAgICAgcmV0dXJuIG5ldyBDdXJzb3IodmFsdWUsIHAucmVxdWVzdCk7XG4gICAgfSk7XG4gIH1cblxuICBmdW5jdGlvbiBwcm94eVByb3BlcnRpZXMoUHJveHlDbGFzcywgdGFyZ2V0UHJvcCwgcHJvcGVydGllcykge1xuICAgIHByb3BlcnRpZXMuZm9yRWFjaChmdW5jdGlvbihwcm9wKSB7XG4gICAgICBPYmplY3QuZGVmaW5lUHJvcGVydHkoUHJveHlDbGFzcy5wcm90b3R5cGUsIHByb3AsIHtcbiAgICAgICAgZ2V0OiBmdW5jdGlvbigpIHtcbiAgICAgICAgICByZXR1cm4gdGhpc1t0YXJnZXRQcm9wXVtwcm9wXTtcbiAgICAgICAgfSxcbiAgICAgICAgc2V0OiBmdW5jdGlvbih2YWwpIHtcbiAgICAgICAgICB0aGlzW3RhcmdldFByb3BdW3Byb3BdID0gdmFsO1xuICAgICAgICB9XG4gICAgICB9KTtcbiAgICB9KTtcbiAgfVxuXG4gIGZ1bmN0aW9uIHByb3h5UmVxdWVzdE1ldGhvZHMoUHJveHlDbGFzcywgdGFyZ2V0UHJvcCwgQ29uc3RydWN0b3IsIHByb3BlcnRpZXMpIHtcbiAgICBwcm9wZXJ0aWVzLmZvckVhY2goZnVuY3Rpb24ocHJvcCkge1xuICAgICAgaWYgKCEocHJvcCBpbiBDb25zdHJ1Y3Rvci5wcm90b3R5cGUpKSByZXR1cm47XG4gICAgICBQcm94eUNsYXNzLnByb3RvdHlwZVtwcm9wXSA9IGZ1bmN0aW9uKCkge1xuICAgICAgICByZXR1cm4gcHJvbWlzaWZ5UmVxdWVzdENhbGwodGhpc1t0YXJnZXRQcm9wXSwgcHJvcCwgYXJndW1lbnRzKTtcbiAgICAgIH07XG4gICAgfSk7XG4gIH1cblxuICBmdW5jdGlvbiBwcm94eU1ldGhvZHMoUHJveHlDbGFzcywgdGFyZ2V0UHJvcCwgQ29uc3RydWN0b3IsIHByb3BlcnRpZXMpIHtcbiAgICBwcm9wZXJ0aWVzLmZvckVhY2goZnVuY3Rpb24ocHJvcCkge1xuICAgICAgaWYgKCEocHJvcCBpbiBDb25zdHJ1Y3Rvci5wcm90b3R5cGUpKSByZXR1cm47XG4gICAgICBQcm94eUNsYXNzLnByb3RvdHlwZVtwcm9wXSA9IGZ1bmN0aW9uKCkge1xuICAgICAgICByZXR1cm4gdGhpc1t0YXJnZXRQcm9wXVtwcm9wXS5hcHBseSh0aGlzW3RhcmdldFByb3BdLCBhcmd1bWVudHMpO1xuICAgICAgfTtcbiAgICB9KTtcbiAgfVxuXG4gIGZ1bmN0aW9uIHByb3h5Q3Vyc29yUmVxdWVzdE1ldGhvZHMoUHJveHlDbGFzcywgdGFyZ2V0UHJvcCwgQ29uc3RydWN0b3IsIHByb3BlcnRpZXMpIHtcbiAgICBwcm9wZXJ0aWVzLmZvckVhY2goZnVuY3Rpb24ocHJvcCkge1xuICAgICAgaWYgKCEocHJvcCBpbiBDb25zdHJ1Y3Rvci5wcm90b3R5cGUpKSByZXR1cm47XG4gICAgICBQcm94eUNsYXNzLnByb3RvdHlwZVtwcm9wXSA9IGZ1bmN0aW9uKCkge1xuICAgICAgICByZXR1cm4gcHJvbWlzaWZ5Q3Vyc29yUmVxdWVzdENhbGwodGhpc1t0YXJnZXRQcm9wXSwgcHJvcCwgYXJndW1lbnRzKTtcbiAgICAgIH07XG4gICAgfSk7XG4gIH1cblxuICBmdW5jdGlvbiBJbmRleChpbmRleCkge1xuICAgIHRoaXMuX2luZGV4ID0gaW5kZXg7XG4gIH1cblxuICBwcm94eVByb3BlcnRpZXMoSW5kZXgsICdfaW5kZXgnLCBbXG4gICAgJ25hbWUnLFxuICAgICdrZXlQYXRoJyxcbiAgICAnbXVsdGlFbnRyeScsXG4gICAgJ3VuaXF1ZSdcbiAgXSk7XG5cbiAgcHJveHlSZXF1ZXN0TWV0aG9kcyhJbmRleCwgJ19pbmRleCcsIElEQkluZGV4LCBbXG4gICAgJ2dldCcsXG4gICAgJ2dldEtleScsXG4gICAgJ2dldEFsbCcsXG4gICAgJ2dldEFsbEtleXMnLFxuICAgICdjb3VudCdcbiAgXSk7XG5cbiAgcHJveHlDdXJzb3JSZXF1ZXN0TWV0aG9kcyhJbmRleCwgJ19pbmRleCcsIElEQkluZGV4LCBbXG4gICAgJ29wZW5DdXJzb3InLFxuICAgICdvcGVuS2V5Q3Vyc29yJ1xuICBdKTtcblxuICBmdW5jdGlvbiBDdXJzb3IoY3Vyc29yLCByZXF1ZXN0KSB7XG4gICAgdGhpcy5fY3Vyc29yID0gY3Vyc29yO1xuICAgIHRoaXMuX3JlcXVlc3QgPSByZXF1ZXN0O1xuICB9XG5cbiAgcHJveHlQcm9wZXJ0aWVzKEN1cnNvciwgJ19jdXJzb3InLCBbXG4gICAgJ2RpcmVjdGlvbicsXG4gICAgJ2tleScsXG4gICAgJ3ByaW1hcnlLZXknLFxuICAgICd2YWx1ZSdcbiAgXSk7XG5cbiAgcHJveHlSZXF1ZXN0TWV0aG9kcyhDdXJzb3IsICdfY3Vyc29yJywgSURCQ3Vyc29yLCBbXG4gICAgJ3VwZGF0ZScsXG4gICAgJ2RlbGV0ZSdcbiAgXSk7XG5cbiAgLy8gcHJveHkgJ25leHQnIG1ldGhvZHNcbiAgWydhZHZhbmNlJywgJ2NvbnRpbnVlJywgJ2NvbnRpbnVlUHJpbWFyeUtleSddLmZvckVhY2goZnVuY3Rpb24obWV0aG9kTmFtZSkge1xuICAgIGlmICghKG1ldGhvZE5hbWUgaW4gSURCQ3Vyc29yLnByb3RvdHlwZSkpIHJldHVybjtcbiAgICBDdXJzb3IucHJvdG90eXBlW21ldGhvZE5hbWVdID0gZnVuY3Rpb24oKSB7XG4gICAgICB2YXIgY3Vyc29yID0gdGhpcztcbiAgICAgIHZhciBhcmdzID0gYXJndW1lbnRzO1xuICAgICAgcmV0dXJuIFByb21pc2UucmVzb2x2ZSgpLnRoZW4oZnVuY3Rpb24oKSB7XG4gICAgICAgIGN1cnNvci5fY3Vyc29yW21ldGhvZE5hbWVdLmFwcGx5KGN1cnNvci5fY3Vyc29yLCBhcmdzKTtcbiAgICAgICAgcmV0dXJuIHByb21pc2lmeVJlcXVlc3QoY3Vyc29yLl9yZXF1ZXN0KS50aGVuKGZ1bmN0aW9uKHZhbHVlKSB7XG4gICAgICAgICAgaWYgKCF2YWx1ZSkgcmV0dXJuO1xuICAgICAgICAgIHJldHVybiBuZXcgQ3Vyc29yKHZhbHVlLCBjdXJzb3IuX3JlcXVlc3QpO1xuICAgICAgICB9KTtcbiAgICAgIH0pO1xuICAgIH07XG4gIH0pO1xuXG4gIGZ1bmN0aW9uIE9iamVjdFN0b3JlKHN0b3JlKSB7XG4gICAgdGhpcy5fc3RvcmUgPSBzdG9yZTtcbiAgfVxuXG4gIE9iamVjdFN0b3JlLnByb3RvdHlwZS5jcmVhdGVJbmRleCA9IGZ1bmN0aW9uKCkge1xuICAgIHJldHVybiBuZXcgSW5kZXgodGhpcy5fc3RvcmUuY3JlYXRlSW5kZXguYXBwbHkodGhpcy5fc3RvcmUsIGFyZ3VtZW50cykpO1xuICB9O1xuXG4gIE9iamVjdFN0b3JlLnByb3RvdHlwZS5pbmRleCA9IGZ1bmN0aW9uKCkge1xuICAgIHJldHVybiBuZXcgSW5kZXgodGhpcy5fc3RvcmUuaW5kZXguYXBwbHkodGhpcy5fc3RvcmUsIGFyZ3VtZW50cykpO1xuICB9O1xuXG4gIHByb3h5UHJvcGVydGllcyhPYmplY3RTdG9yZSwgJ19zdG9yZScsIFtcbiAgICAnbmFtZScsXG4gICAgJ2tleVBhdGgnLFxuICAgICdpbmRleE5hbWVzJyxcbiAgICAnYXV0b0luY3JlbWVudCdcbiAgXSk7XG5cbiAgcHJveHlSZXF1ZXN0TWV0aG9kcyhPYmplY3RTdG9yZSwgJ19zdG9yZScsIElEQk9iamVjdFN0b3JlLCBbXG4gICAgJ3B1dCcsXG4gICAgJ2FkZCcsXG4gICAgJ2RlbGV0ZScsXG4gICAgJ2NsZWFyJyxcbiAgICAnZ2V0JyxcbiAgICAnZ2V0QWxsJyxcbiAgICAnZ2V0S2V5JyxcbiAgICAnZ2V0QWxsS2V5cycsXG4gICAgJ2NvdW50J1xuICBdKTtcblxuICBwcm94eUN1cnNvclJlcXVlc3RNZXRob2RzKE9iamVjdFN0b3JlLCAnX3N0b3JlJywgSURCT2JqZWN0U3RvcmUsIFtcbiAgICAnb3BlbkN1cnNvcicsXG4gICAgJ29wZW5LZXlDdXJzb3InXG4gIF0pO1xuXG4gIHByb3h5TWV0aG9kcyhPYmplY3RTdG9yZSwgJ19zdG9yZScsIElEQk9iamVjdFN0b3JlLCBbXG4gICAgJ2RlbGV0ZUluZGV4J1xuICBdKTtcblxuICBmdW5jdGlvbiBUcmFuc2FjdGlvbihpZGJUcmFuc2FjdGlvbikge1xuICAgIHRoaXMuX3R4ID0gaWRiVHJhbnNhY3Rpb247XG4gICAgdGhpcy5jb21wbGV0ZSA9IG5ldyBQcm9taXNlKGZ1bmN0aW9uKHJlc29sdmUsIHJlamVjdCkge1xuICAgICAgaWRiVHJhbnNhY3Rpb24ub25jb21wbGV0ZSA9IGZ1bmN0aW9uKCkge1xuICAgICAgICByZXNvbHZlKCk7XG4gICAgICB9O1xuICAgICAgaWRiVHJhbnNhY3Rpb24ub25lcnJvciA9IGZ1bmN0aW9uKCkge1xuICAgICAgICByZWplY3QoaWRiVHJhbnNhY3Rpb24uZXJyb3IpO1xuICAgICAgfTtcbiAgICAgIGlkYlRyYW5zYWN0aW9uLm9uYWJvcnQgPSBmdW5jdGlvbigpIHtcbiAgICAgICAgcmVqZWN0KGlkYlRyYW5zYWN0aW9uLmVycm9yKTtcbiAgICAgIH07XG4gICAgfSk7XG4gIH1cblxuICBUcmFuc2FjdGlvbi5wcm90b3R5cGUub2JqZWN0U3RvcmUgPSBmdW5jdGlvbigpIHtcbiAgICByZXR1cm4gbmV3IE9iamVjdFN0b3JlKHRoaXMuX3R4Lm9iamVjdFN0b3JlLmFwcGx5KHRoaXMuX3R4LCBhcmd1bWVudHMpKTtcbiAgfTtcblxuICBwcm94eVByb3BlcnRpZXMoVHJhbnNhY3Rpb24sICdfdHgnLCBbXG4gICAgJ29iamVjdFN0b3JlTmFtZXMnLFxuICAgICdtb2RlJ1xuICBdKTtcblxuICBwcm94eU1ldGhvZHMoVHJhbnNhY3Rpb24sICdfdHgnLCBJREJUcmFuc2FjdGlvbiwgW1xuICAgICdhYm9ydCdcbiAgXSk7XG5cbiAgZnVuY3Rpb24gVXBncmFkZURCKGRiLCBvbGRWZXJzaW9uLCB0cmFuc2FjdGlvbikge1xuICAgIHRoaXMuX2RiID0gZGI7XG4gICAgdGhpcy5vbGRWZXJzaW9uID0gb2xkVmVyc2lvbjtcbiAgICB0aGlzLnRyYW5zYWN0aW9uID0gbmV3IFRyYW5zYWN0aW9uKHRyYW5zYWN0aW9uKTtcbiAgfVxuXG4gIFVwZ3JhZGVEQi5wcm90b3R5cGUuY3JlYXRlT2JqZWN0U3RvcmUgPSBmdW5jdGlvbigpIHtcbiAgICByZXR1cm4gbmV3IE9iamVjdFN0b3JlKHRoaXMuX2RiLmNyZWF0ZU9iamVjdFN0b3JlLmFwcGx5KHRoaXMuX2RiLCBhcmd1bWVudHMpKTtcbiAgfTtcblxuICBwcm94eVByb3BlcnRpZXMoVXBncmFkZURCLCAnX2RiJywgW1xuICAgICduYW1lJyxcbiAgICAndmVyc2lvbicsXG4gICAgJ29iamVjdFN0b3JlTmFtZXMnXG4gIF0pO1xuXG4gIHByb3h5TWV0aG9kcyhVcGdyYWRlREIsICdfZGInLCBJREJEYXRhYmFzZSwgW1xuICAgICdkZWxldGVPYmplY3RTdG9yZScsXG4gICAgJ2Nsb3NlJ1xuICBdKTtcblxuICBmdW5jdGlvbiBEQihkYikge1xuICAgIHRoaXMuX2RiID0gZGI7XG4gIH1cblxuICBEQi5wcm90b3R5cGUudHJhbnNhY3Rpb24gPSBmdW5jdGlvbigpIHtcbiAgICByZXR1cm4gbmV3IFRyYW5zYWN0aW9uKHRoaXMuX2RiLnRyYW5zYWN0aW9uLmFwcGx5KHRoaXMuX2RiLCBhcmd1bWVudHMpKTtcbiAgfTtcblxuICBwcm94eVByb3BlcnRpZXMoREIsICdfZGInLCBbXG4gICAgJ25hbWUnLFxuICAgICd2ZXJzaW9uJyxcbiAgICAnb2JqZWN0U3RvcmVOYW1lcydcbiAgXSk7XG5cbiAgcHJveHlNZXRob2RzKERCLCAnX2RiJywgSURCRGF0YWJhc2UsIFtcbiAgICAnY2xvc2UnXG4gIF0pO1xuXG4gIC8vIEFkZCBjdXJzb3IgaXRlcmF0b3JzXG4gIC8vIFRPRE86IHJlbW92ZSB0aGlzIG9uY2UgYnJvd3NlcnMgZG8gdGhlIHJpZ2h0IHRoaW5nIHdpdGggcHJvbWlzZXNcbiAgWydvcGVuQ3Vyc29yJywgJ29wZW5LZXlDdXJzb3InXS5mb3JFYWNoKGZ1bmN0aW9uKGZ1bmNOYW1lKSB7XG4gICAgW09iamVjdFN0b3JlLCBJbmRleF0uZm9yRWFjaChmdW5jdGlvbihDb25zdHJ1Y3Rvcikge1xuICAgICAgQ29uc3RydWN0b3IucHJvdG90eXBlW2Z1bmNOYW1lLnJlcGxhY2UoJ29wZW4nLCAnaXRlcmF0ZScpXSA9IGZ1bmN0aW9uKCkge1xuICAgICAgICB2YXIgYXJncyA9IHRvQXJyYXkoYXJndW1lbnRzKTtcbiAgICAgICAgdmFyIGNhbGxiYWNrID0gYXJnc1thcmdzLmxlbmd0aCAtIDFdO1xuICAgICAgICB2YXIgbmF0aXZlT2JqZWN0ID0gdGhpcy5fc3RvcmUgfHwgdGhpcy5faW5kZXg7XG4gICAgICAgIHZhciByZXF1ZXN0ID0gbmF0aXZlT2JqZWN0W2Z1bmNOYW1lXS5hcHBseShuYXRpdmVPYmplY3QsIGFyZ3Muc2xpY2UoMCwgLTEpKTtcbiAgICAgICAgcmVxdWVzdC5vbnN1Y2Nlc3MgPSBmdW5jdGlvbigpIHtcbiAgICAgICAgICBjYWxsYmFjayhyZXF1ZXN0LnJlc3VsdCk7XG4gICAgICAgIH07XG4gICAgICB9O1xuICAgIH0pO1xuICB9KTtcblxuICAvLyBwb2x5ZmlsbCBnZXRBbGxcbiAgW0luZGV4LCBPYmplY3RTdG9yZV0uZm9yRWFjaChmdW5jdGlvbihDb25zdHJ1Y3Rvcikge1xuICAgIGlmIChDb25zdHJ1Y3Rvci5wcm90b3R5cGUuZ2V0QWxsKSByZXR1cm47XG4gICAgQ29uc3RydWN0b3IucHJvdG90eXBlLmdldEFsbCA9IGZ1bmN0aW9uKHF1ZXJ5LCBjb3VudCkge1xuICAgICAgdmFyIGluc3RhbmNlID0gdGhpcztcbiAgICAgIHZhciBpdGVtcyA9IFtdO1xuXG4gICAgICByZXR1cm4gbmV3IFByb21pc2UoZnVuY3Rpb24ocmVzb2x2ZSkge1xuICAgICAgICBpbnN0YW5jZS5pdGVyYXRlQ3Vyc29yKHF1ZXJ5LCBmdW5jdGlvbihjdXJzb3IpIHtcbiAgICAgICAgICBpZiAoIWN1cnNvcikge1xuICAgICAgICAgICAgcmVzb2x2ZShpdGVtcyk7XG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgICAgfVxuICAgICAgICAgIGl0ZW1zLnB1c2goY3Vyc29yLnZhbHVlKTtcblxuICAgICAgICAgIGlmIChjb3VudCAhPT0gdW5kZWZpbmVkICYmIGl0ZW1zLmxlbmd0aCA9PSBjb3VudCkge1xuICAgICAgICAgICAgcmVzb2x2ZShpdGVtcyk7XG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgICAgfVxuICAgICAgICAgIGN1cnNvci5jb250aW51ZSgpO1xuICAgICAgICB9KTtcbiAgICAgIH0pO1xuICAgIH07XG4gIH0pO1xuXG4gIHZhciBleHAgPSB7XG4gICAgb3BlbjogZnVuY3Rpb24obmFtZSwgdmVyc2lvbiwgdXBncmFkZUNhbGxiYWNrKSB7XG4gICAgICB2YXIgcCA9IHByb21pc2lmeVJlcXVlc3RDYWxsKGluZGV4ZWREQiwgJ29wZW4nLCBbbmFtZSwgdmVyc2lvbl0pO1xuICAgICAgdmFyIHJlcXVlc3QgPSBwLnJlcXVlc3Q7XG5cbiAgICAgIHJlcXVlc3Qub251cGdyYWRlbmVlZGVkID0gZnVuY3Rpb24oZXZlbnQpIHtcbiAgICAgICAgaWYgKHVwZ3JhZGVDYWxsYmFjaykge1xuICAgICAgICAgIHVwZ3JhZGVDYWxsYmFjayhuZXcgVXBncmFkZURCKHJlcXVlc3QucmVzdWx0LCBldmVudC5vbGRWZXJzaW9uLCByZXF1ZXN0LnRyYW5zYWN0aW9uKSk7XG4gICAgICAgIH1cbiAgICAgIH07XG5cbiAgICAgIHJldHVybiBwLnRoZW4oZnVuY3Rpb24oZGIpIHtcbiAgICAgICAgcmV0dXJuIG5ldyBEQihkYik7XG4gICAgICB9KTtcbiAgICB9LFxuICAgIGRlbGV0ZTogZnVuY3Rpb24obmFtZSkge1xuICAgICAgcmV0dXJuIHByb21pc2lmeVJlcXVlc3RDYWxsKGluZGV4ZWREQiwgJ2RlbGV0ZURhdGFiYXNlJywgW25hbWVdKTtcbiAgICB9XG4gIH07XG5cbiAgaWYgKHR5cGVvZiBtb2R1bGUgIT09ICd1bmRlZmluZWQnKSB7XG4gICAgbW9kdWxlLmV4cG9ydHMgPSBleHA7XG4gIH1cbiAgZWxzZSB7XG4gICAgc2VsZi5pZGIgPSBleHA7XG4gIH1cbn0oKSk7XG4iLCIvKipcclxuICogQW4gaW5kZXhlZCBkYiBhZGFwdG9yXHJcbiAqL1xyXG5cclxudmFyIGlkYiA9IHJlcXVpcmUoXCJpZGJcIik7XHJcblxyXG5jb25zdCBWQUxJRF9TVE9SRVMgPSBbXCJhc3NpZ25tZW50c1wiLCBcInN5bmMtc3RvcmVcIl07XHJcblxyXG4vLyBvcGVuL3NldHVwIHRoZSBkYXRhYmFzZVxyXG52YXIgZGJQcm9taXNlID0gaWRiLm9wZW4oXCJkYXRhLXN0b3Jlc1wiLCAzLCBkYiA9PiB7XHJcblx0Ly8gdXBncmFkZSBvciBjcmVhdGUgdGhlIGRiXHJcblx0aWYoZGIub2xkVmVyc2lvbiA8IDEpXHJcblx0XHRkYi5jcmVhdGVPYmplY3RTdG9yZShcImFzc2lnbm1lbnRzXCIsIHsga2V5UGF0aDogXCJpZFwiIH0pO1xyXG5cdGlmKGRiLm9sZFZlcnNpb24gPCAyKVxyXG5cdFx0ZGIuY3JlYXRlT2JqZWN0U3RvcmUoXCJzeW5jLXN0b3JlXCIsIHsga2V5UGF0aDogXCJpZFwiIH0pO1xyXG5cclxuXHQvLyB0aGUgdmVyc2lvbiAyIHN5bmMtc3RvcmUgaGFkIGEgZGlmZmVyZW50IHN0cnVjdHVyZSB0aGF0IHRoZSB2ZXJzaW9uIDNcclxuXHRpZihkYi5vbGRWZXJzaW9uID09IDIpIHtcclxuXHRcdGRiLmRlbGV0ZU9iamVjdFN0b3JlKFwic3luYy1zdG9yZVwiKTtcclxuXHRcdGRiLmNyZWF0ZU9iamVjdFN0b3JlKFwic3luYy1zdG9yZVwiLCB7IGtleVBhdGg6IFwiaWRcIiB9KTtcclxuXHR9XHJcbn0pO1xyXG5cclxuY2xhc3MgSWRiQWRhcHRvciB7XHJcblx0Y29uc3RydWN0b3IobmFtZSkge1xyXG5cdFx0dGhpcy5uYW1lID0gbmFtZTtcclxuXHJcblx0XHQvLyBjaGVjayB0aGUgc3RvcmUgaXMgdmFsaWRcclxuXHRcdGlmKFZBTElEX1NUT1JFUy5pbmRleE9mKG5hbWUpID09PSAtMSkge1xyXG5cdFx0XHR0aHJvdyBuZXcgRXJyb3IoYFRoZSBkYXRhIHN0b3JlICR7bmFtZX0gaXMgbm90IGluIGlkYiB1cGRhdGUgdGhlIGRiYCk7XHJcblx0XHR9XHJcblx0fVxyXG5cclxuXHQvLyBjcmVhdGUgYSB0cmFuc2FjdGlvblxyXG5cdF90cmFuc2FjdGlvbihyZWFkV3JpdGUpIHtcclxuXHRcdHJldHVybiBkYlByb21pc2UudGhlbihkYiA9PiB7XHJcblx0XHRcdHJldHVybiBkYlxyXG5cdFx0XHRcdC50cmFuc2FjdGlvbih0aGlzLm5hbWUsIHJlYWRXcml0ZSAmJiBcInJlYWR3cml0ZVwiKVxyXG5cdFx0XHRcdC5vYmplY3RTdG9yZSh0aGlzLm5hbWUpO1xyXG5cdFx0fSk7XHJcblx0fVxyXG5cclxuXHQvKipcclxuXHQgKiBHZXQgYWxsIHRoZSB2YWx1ZXMgaW4gdGhlIG9iamVjdCBzdG9yZVxyXG5cdCAqL1xyXG5cdGdldEFsbCgpIHtcclxuXHRcdHJldHVybiB0aGlzLl90cmFuc2FjdGlvbigpXHJcblx0XHRcdC50aGVuKHRyYW5zID0+IHRyYW5zLmdldEFsbCgpKTtcclxuXHR9XHJcblxyXG5cdC8qKlxyXG5cdCAqIEdldCBhIHNwZWNpZmljIHZhbHVlXHJcblx0ICovXHJcblx0Z2V0KGtleSkge1xyXG5cdFx0cmV0dXJuIHRoaXMuX3RyYW5zYWN0aW9uKClcclxuXHRcdFx0LnRoZW4odHJhbnMgPT4gdHJhbnMuZ2V0KGtleSkpO1xyXG5cdH1cclxuXHJcblx0LyoqXHJcblx0ICogU3RvcmUgYSB2YWx1ZSBpbiBpZGJcclxuXHQgKi9cclxuXHRzZXQodmFsdWUpIHtcclxuXHRcdHJldHVybiB0aGlzLl90cmFuc2FjdGlvbih0cnVlKVxyXG5cdFx0XHQudGhlbih0cmFucyA9PiB0cmFucy5wdXQodmFsdWUpKTtcclxuXHR9XHJcblxyXG5cdC8qKlxyXG5cdCAqIFJlbW92ZSBhIHZhbHVlIGZyb20gaWRiXHJcblx0ICovXHJcblx0cmVtb3ZlKGtleSkge1xyXG5cdFx0cmV0dXJuIHRoaXMuX3RyYW5zYWN0aW9uKHRydWUpXHJcblx0XHRcdC50aGVuKHRyYW5zID0+IHRyYW5zLmRlbGV0ZShrZXkpKTtcclxuXHR9XHJcbn1cclxuXHJcbm1vZHVsZS5leHBvcnRzID0gSWRiQWRhcHRvcjtcclxuIiwiLyoqXHJcbiAqIEluc3RhbnRpYXRlIGFsbCB0aGUgZGF0YSBzdG9yZXNcclxuICovXHJcblxyXG52YXIgSHR0cEFkYXB0b3IgPSByZXF1aXJlKFwiLi4vLi4vY29tbW9uL2RhdGEtc3RvcmVzL2h0dHAtYWRhcHRvclwiKTtcclxudmFyIFBvb2xTdG9yZSA9IHJlcXVpcmUoXCIuLi8uLi9jb21tb24vZGF0YS1zdG9yZXMvcG9vbC1zdG9yZVwiKTtcclxudmFyIFN5bmNlciA9IHJlcXVpcmUoXCIuLi8uLi9jb21tb24vZGF0YS1zdG9yZXMvc3luY2VyXCIpO1xyXG52YXIgSWRiQWRhcHRvciA9IHJlcXVpcmUoXCIuL2lkYi1hZGFwdG9yXCIpO1xyXG5cclxudmFyIGluaXRJdGVtID0gaXRlbSA9PiB7XHJcblx0Ly8gaW5zdGFudGlhdGUgdGhlIGRhdGVcclxuXHRpZihpdGVtLmRhdGUpIHtcclxuXHRcdGl0ZW0uZGF0ZSA9IG5ldyBEYXRlKGl0ZW0uZGF0ZSk7XHJcblx0fVxyXG59O1xyXG5cclxuLy8gY3JlYXRlIGEgc3luY2VyXHJcbnZhciBhc3NpZ25tZW50c0FkYXB0b3IgPSBuZXcgU3luY2VyKHtcclxuXHRyZW1vdGU6IG5ldyBIdHRwQWRhcHRvcihcIi9hcGkvZGF0YS9cIiksXHJcblx0bG9jYWw6IG5ldyBJZGJBZGFwdG9yKFwiYXNzaWdubWVudHNcIiksXHJcblx0Y2hhbmdlU3RvcmU6IG5ldyBJZGJBZGFwdG9yKFwic3luYy1zdG9yZVwiKVxyXG59KTtcclxuXHJcbmV4cG9ydHMuYXNzaWdubWVudHMgPSBuZXcgUG9vbFN0b3JlKGFzc2lnbm1lbnRzQWRhcHRvciwgaW5pdEl0ZW0pO1xyXG5cclxuLy8gY2hlY2sgb3VyIGFjY2VzcyBsZXZlbFxyXG5hc3NpZ25tZW50c0FkYXB0b3IuYWNjZXNzTGV2ZWwoKVxyXG5cclxuLnRoZW4obGV2ZWwgPT4ge1xyXG5cdC8vIHdlIGFyZSBsb2dnZWQgb3V0XHJcblx0aWYobGV2ZWwgPT0gXCJub25lXCIpIHtcclxuXHRcdGxpZmVMaW5lLm5hdi5uYXZpZ2F0ZShcIi9sb2dpblwiKTtcclxuXHR9XHJcbn0pO1xyXG5cclxuLy8gdHJpZ2dlciBhIHN5bmNcclxubGlmZUxpbmUuc3luYyA9IGZ1bmN0aW9uKCkge1xyXG5cdC8vIHRyaWdnZXIgYSBzeW5jXHJcblx0cmV0dXJuIGFzc2lnbm1lbnRzQWRhcHRvci5zeW5jKClcclxuXHJcblx0Ly8gZm9yY2UgYSByZWZlc2hcclxuXHQudGhlbigoKSA9PiB7XHJcblx0XHRpZih0eXBlb2Ygd2luZG93ID09IFwib2JqZWN0XCIpIHtcclxuXHRcdFx0bGlmZUxpbmUubmF2Lm5hdmlnYXRlKGxvY2F0aW9uLnBhdGhuYW1lKTtcclxuXHRcdH1cclxuXHR9KTtcclxufTtcclxuXHJcbmlmKHR5cGVvZiB3aW5kb3cgPT0gXCJvYmplY3RcIikge1xyXG5cdGxldCBwcm9ncmVzcztcclxuXHJcblx0Ly8gc3RhcnQgdGhlIHN5bmNcclxuXHRhc3NpZ25tZW50c0FkYXB0b3Iub24oXCJzeW5jLXN0YXJ0XCIsICgpID0+IHByb2dyZXNzID0gbmV3IGxpZmVMaW5lLlByb2dyZXNzKCkpXHJcblx0Ly8gdXBkYXRlIHRoZSBwcm9ncmVzc1xyXG5cdGFzc2lnbm1lbnRzQWRhcHRvci5vbihcInByb2dyZXNzXCIsIHZhbHVlID0+IHByb2dyZXNzLnNldCh2YWx1ZSkpO1xyXG5cdC8vIHRoZSBzeW5jIGlzIGRvbmVcclxuXHRhc3NpZ25tZW50c0FkYXB0b3Iub24oXCJzeW5jLWNvbXBsZXRlXCIsIHZhbHVlID0+IHByb2dyZXNzLnNldCgxKSk7XHJcblxyXG5cdC8vIGluaXRpYWwgc3luY1xyXG5cdHNldFRpbWVvdXQoKCkgPT4gbGlmZUxpbmUuc3luYygpKTtcclxuXHJcblx0Ly8gc3luYyB3aGVuIHdlIHJldmlzaXQgdGhlIHBhZ2VcclxuXHR3aW5kb3cuYWRkRXZlbnRMaXN0ZW5lcihcInZpc2liaWxpdHljaGFuZ2VcIiwgKCkgPT4ge1xyXG5cdFx0aWYoIWRvY3VtZW50LmhpZGRlbikge1xyXG5cdFx0XHRsaWZlTGluZS5zeW5jKCk7XHJcblx0XHR9XHJcblx0fSk7XHJcblxyXG5cdC8vIHN5bmMgd2hlbiB3ZSByZWNvbm5lY3RcclxuXHR3aW5kb3cuYWRkRXZlbnRMaXN0ZW5lcihcIm9ubGluZVwiLCAoKSA9PiB7XHJcblx0XHRsaWZlTGluZS5zeW5jKCk7XHJcblx0fSk7XHJcbn1cclxuIiwiLyoqXHJcbiAqIEJyb3dzZXIgc3BlY2lmaWMgZ2xvYmFsc1xyXG4gKi9cclxuXHJcbmxpZmVMaW5lLm1ha2VEb20gPSByZXF1aXJlKFwiLi91dGlsL2RvbS1tYWtlclwiKTtcclxuXHJcbi8vIGFkZCBhIGZ1bmN0aW9uIGZvciBhZGRpbmcgYWN0aW9uc1xyXG5saWZlTGluZS5hZGRBY3Rpb24gPSBmdW5jdGlvbihuYW1lLCBmbikge1xyXG5cdC8vIGF0dGFjaCB0aGUgY2FsbGJhY2tcclxuXHR2YXIgbGlzdGVuZXIgPSBsaWZlTGluZS5vbihcImFjdGlvbi1leGVjLVwiICsgbmFtZSwgZm4pO1xyXG5cclxuXHQvLyBpbmZvcm0gYW55IGFjdGlvbiBwcm92aWRlcnNcclxuXHRsaWZlTGluZS5lbWl0KFwiYWN0aW9uLWNyZWF0ZVwiLCBuYW1lKTtcclxuXHJcblx0Ly8gYWxsIGFjdGlvbnMgcmVtb3ZlZFxyXG5cdHZhciByZW1vdmVBbGwgPSBsaWZlTGluZS5vbihcImFjdGlvbi1yZW1vdmUtYWxsXCIsICgpID0+IHtcclxuXHRcdC8vIHJlbW92ZSB0aGUgYWN0aW9uIGxpc3RlbmVyXHJcblx0XHRsaXN0ZW5lci51bnN1YnNjcmliZSgpO1xyXG5cdFx0cmVtb3ZlQWxsLnVuc3Vic2NyaWJlKCk7XHJcblx0fSk7XHJcblxyXG5cdHJldHVybiB7XHJcblx0XHR1bnN1YnNjcmliZSgpIHtcclxuXHRcdFx0Ly8gcmVtb3ZlIHRoZSBhY3Rpb24gbGlzdGVuZXJcclxuXHRcdFx0bGlzdGVuZXIudW5zdWJzY3JpYmUoKTtcclxuXHRcdFx0cmVtb3ZlQWxsLnVuc3Vic2NyaWJlKCk7XHJcblxyXG5cdFx0XHQvLyBpbmZvcm0gYW55IGFjdGlvbiBwcm92aWRlcnNcclxuXHRcdFx0bGlmZUxpbmUuZW1pdChcImFjdGlvbi1yZW1vdmVcIiwgbmFtZSk7XHJcblx0XHR9XHJcblx0fTtcclxufTtcclxuIiwiLy8gY3JlYXRlIHRoZSBnbG9iYWwgb2JqZWN0XHJcbnJlcXVpcmUoXCIuLi9jb21tb24vZ2xvYmFsXCIpO1xyXG5yZXF1aXJlKFwiLi9nbG9iYWxcIik7XHJcblxyXG4vLyBsb2FkIGFsbCB0aGUgd2lkZ2V0c1xyXG5yZXF1aXJlKFwiLi93aWRnZXRzL3NpZGViYXJcIik7XHJcbnJlcXVpcmUoXCIuL3dpZGdldHMvY29udGVudFwiKTtcclxucmVxdWlyZShcIi4vd2lkZ2V0cy9saW5rXCIpO1xyXG5yZXF1aXJlKFwiLi93aWRnZXRzL2xpc3RcIik7XHJcbnJlcXVpcmUoXCIuL3dpZGdldHMvaW5wdXRcIik7XHJcbnJlcXVpcmUoXCIuL3dpZGdldHMvcHJvZ3Jlc3NcIik7XHJcbnJlcXVpcmUoXCIuL3dpZGdldHMvdG9nZ2xlLWJ0bnNcIik7XHJcblxyXG4vLyBsb2FkIGFsbCB0aGUgdmlld3NcclxudmFyIHtpbml0TmF2QmFyfSA9IHJlcXVpcmUoXCIuL3ZpZXdzL2xpc3RzXCIpO1xyXG5yZXF1aXJlKFwiLi92aWV3cy9pdGVtXCIpO1xyXG5yZXF1aXJlKFwiLi92aWV3cy9lZGl0XCIpO1xyXG5yZXF1aXJlKFwiLi92aWV3cy9sb2dpblwiKTtcclxucmVxdWlyZShcIi4vdmlld3MvYWNjb3VudFwiKTtcclxucmVxdWlyZShcIi4vdmlld3MvdXNlcnNcIik7XHJcbnJlcXVpcmUoXCIuL3ZpZXdzL3RvZG9cIik7XHJcblxyXG4vLyBpbnN0YW50aWF0ZSB0aGUgZG9tXHJcbmxpZmVMaW5lLm1ha2VEb20oe1xyXG5cdHBhcmVudDogZG9jdW1lbnQuYm9keSxcclxuXHRncm91cDogW1xyXG5cdFx0eyB3aWRnZXQ6IFwic2lkZWJhclwiIH0sXHJcblx0XHR7IHdpZGdldDogXCJwcm9ncmVzc1wiIH0sXHJcblx0XHR7IHdpZGdldDogXCJjb250ZW50XCIgfVxyXG5cdF1cclxufSk7XHJcblxyXG4vLyBBZGQgYSBsaW5rIHRvIHRoZSB0b2RhL2hvbWUgcGFnZVxyXG5saWZlTGluZS5hZGROYXZDb21tYW5kKFwiVG9kb1wiLCBcIi9cIik7XHJcblxyXG4vLyBhZGQgbGlzdCB2aWV3cyB0byB0aGUgbmF2YmFyXHJcbmluaXROYXZCYXIoKTtcclxuXHJcbi8vIGNyZWF0ZSBhIG5ldyBhc3NpZ25tZW50XHJcbmxpZmVMaW5lLmFkZENvbW1hbmQoXCJOZXcgYXNzaWdubWVudFwiLCAoKSA9PiB7XHJcblx0dmFyIGlkID0gTWF0aC5mbG9vcihNYXRoLnJhbmRvbSgpICogMTAwMDAwMDAwKTtcclxuXHJcblx0bGlmZUxpbmUubmF2Lm5hdmlnYXRlKFwiL2VkaXQvXCIgKyBpZCk7XHJcbn0pO1xyXG5cclxuLy8gY3JlYXRlIHRoZSBsb2dvdXQgYnV0dG9uXHJcbmxpZmVMaW5lLmFkZE5hdkNvbW1hbmQoXCJBY2NvdW50XCIsIFwiL2FjY291bnRcIik7XHJcblxyXG4vLyByZWdpc3RlciB0aGUgc2VydmljZSB3b3JrZXJcclxucmVxdWlyZShcIi4vc3ctaGVscGVyXCIpO1xyXG4iLCIvKipcclxuICogUmVnaXN0ZXIgYW5kIGNvbW11bmljYXRlIHdpdGggdGhlIHNlcnZpY2Ugd29ya2VyXHJcbiAqL1xyXG5cclxuIC8vIHJlZ2lzdGVyIHRoZSBzZXJ2aWNlIHdvcmtlclxyXG4gaWYobmF2aWdhdG9yLnNlcnZpY2VXb3JrZXIpIHtcclxuXHQgLy8gbWFrZSBzdXJlIGl0J3MgcmVnaXN0ZXJlZFxyXG5cdCBuYXZpZ2F0b3Iuc2VydmljZVdvcmtlci5yZWdpc3RlcihcIi9zZXJ2aWNlLXdvcmtlci5qc1wiKTtcclxuXHJcblx0IC8vIGxpc3RlbiBmb3IgbWVzc2FnZXNcclxuXHQgbmF2aWdhdG9yLnNlcnZpY2VXb3JrZXIuYWRkRXZlbnRMaXN0ZW5lcihcIm1lc3NhZ2VcIiwgZSA9PiB7XHJcblx0XHQgLy8gd2UganVzdCB1cGRhdGVkXHJcblx0XHQgaWYoZS5kYXRhLnR5cGUgPT0gXCJ2ZXJzaW9uLWNoYW5nZVwiKSB7XHJcblx0XHRcdCBjb25zb2xlLmxvZyhcIlVwZGF0ZWQgdG9cIiwgZS5kYXRhLnZlcnNpb24pO1xyXG5cclxuXHRcdFx0IC8vIGluIGRldiBtb2RlIHJlbG9hZCB0aGUgcGFnZVxyXG5cdFx0XHQgaWYoZS5kYXRhLnZlcnNpb24uaW5kZXhPZihcIkBcIikgIT09IC0xKSB7XHJcblx0XHRcdFx0IGxvY2F0aW9uLnJlbG9hZCgpO1xyXG5cdFx0XHQgfVxyXG5cdFx0IH1cclxuICAgICAgICAgLy8gYSBub3RpZmljYXRpb24gd2FzIGp1c3QgY2xpY2tlZCBvciBzb21ldGhpbmdcclxuICAgICAgICAgZWxzZSBpZihlLmRhdGEudHlwZSA9PSBcIm5hdmlnYXRlXCIpIHtcclxuICAgICAgICAgICAgIGxpZmVMaW5lLm5hdi5uYXZpZ2F0ZShlLmRhdGEudXJsKTtcclxuICAgICAgICAgfVxyXG5cdCB9KTtcclxuIH1cclxuIiwiLyoqXHJcbiogRGF0ZSByZWxhdGVkIHRvb2xzXHJcbiovXHJcblxyXG4vLyBjaGVjayBpZiB0aGUgZGF0ZXMgYXJlIHRoZSBzYW1lIGRheVxyXG5leHBvcnRzLmlzU2FtZURhdGUgPSBmdW5jdGlvbihkYXRlMSwgZGF0ZTIpIHtcclxuXHRyZXR1cm4gZGF0ZTEuZ2V0RnVsbFllYXIoKSA9PSBkYXRlMi5nZXRGdWxsWWVhcigpICYmXHJcblx0XHRkYXRlMS5nZXRNb250aCgpID09IGRhdGUyLmdldE1vbnRoKCkgJiZcclxuXHRcdGRhdGUxLmdldERhdGUoKSA9PSBkYXRlMi5nZXREYXRlKCk7XHJcbn07XHJcblxyXG4vLyBjaGVjayBpZiBhIGRhdGUgaXMgbGVzcyB0aGFuIGFub3RoZXJcclxuZXhwb3J0cy5pc1Nvb25lckRhdGUgPSBmdW5jdGlvbihkYXRlMSwgZGF0ZTIpIHtcclxuICAgIC8vIGNoZWNrIHRoZSB5ZWFyIGZpcnN0XHJcbiAgICBpZihkYXRlMS5nZXRGdWxsWWVhcigpICE9IGRhdGUyLmdldEZ1bGxZZWFyKCkpIHtcclxuICAgICAgICByZXR1cm4gZGF0ZTEuZ2V0RnVsbFllYXIoKSA8IGRhdGUyLmdldEZ1bGxZZWFyKCk7XHJcbiAgICB9XHJcblxyXG4gICAgLy8gY2hlY2sgdGhlIG1vbnRoIG5leHRcclxuICAgIGlmKGRhdGUxLmdldE1vbnRoKCkgIT0gZGF0ZTIuZ2V0TW9udGgoKSkge1xyXG4gICAgICAgIHJldHVybiBkYXRlMS5nZXRNb250aCgpIDwgZGF0ZTIuZ2V0TW9udGgoKTtcclxuICAgIH1cclxuXHJcbiAgICAvLyBjaGVjayB0aGUgZGF5XHJcbiAgICByZXR1cm4gZGF0ZTEuZ2V0RGF0ZSgpIDwgZGF0ZTIuZ2V0RGF0ZSgpO1xyXG59O1xyXG5cclxuLy8gZ2V0IHRoZSBkYXRlIGRheXMgZnJvbSBub3dcclxuZXhwb3J0cy5kYXlzRnJvbU5vdyA9IGZ1bmN0aW9uKGRheXMpIHtcclxuXHR2YXIgZGF0ZSA9IG5ldyBEYXRlKCk7XHJcblxyXG5cdC8vIGFkdmFuY2UgdGhlIGRhdGVcclxuXHRkYXRlLnNldERhdGUoZGF0ZS5nZXREYXRlKCkgKyBkYXlzKTtcclxuXHJcblx0cmV0dXJuIGRhdGU7XHJcbn07XHJcblxyXG5jb25zdCBTVFJJTkdfREFZUyA9IFtcIlN1bmRheVwiLCBcIk1vbmRheVwiLCBcIlR1ZXNkYXlcIiwgXCJXZWRlbnNkYXlcIiwgXCJUaHVyc2RheVwiLCBcIkZyaWRheVwiLCBcIlNhdHVyZGF5XCJdO1xyXG5cclxuLy8gY29udmVydCBhIGRhdGUgdG8gYSBzdHJpbmdcclxuZXhwb3J0cy5zdHJpbmdpZnlEYXRlID0gZnVuY3Rpb24oZGF0ZSwgb3B0cyA9IHt9KSB7XHJcblx0IHZhciBzdHJEYXRlLCBzdHJUaW1lID0gXCJcIjtcclxuXHJcbiAgICAvLyBjaGVjayBpZiB0aGUgZGF0ZSBpcyBiZWZvcmUgdG9kYXlcclxuICAgIHZhciBiZWZvcmVOb3cgPSBkYXRlLmdldFRpbWUoKSA8IERhdGUubm93KCk7XHJcblxyXG5cdC8vIFRvZGF5XHJcblx0aWYoZXhwb3J0cy5pc1NhbWVEYXRlKGRhdGUsIG5ldyBEYXRlKCkpKVxyXG5cdFx0c3RyRGF0ZSA9IFwiVG9kYXlcIjtcclxuXHJcblx0Ly8gVG9tb3Jyb3dcclxuXHRlbHNlIGlmKGV4cG9ydHMuaXNTYW1lRGF0ZShkYXRlLCBleHBvcnRzLmRheXNGcm9tTm93KDEpKSAmJiAhYmVmb3JlTm93KVxyXG5cdFx0c3RyRGF0ZSA9IFwiVG9tb3Jyb3dcIjtcclxuXHJcblx0Ly8gZGF5IG9mIHRoZSB3ZWVrICh0aGlzIHdlZWspXHJcblx0ZWxzZSBpZihleHBvcnRzLmlzU29vbmVyRGF0ZShkYXRlLCBleHBvcnRzLmRheXNGcm9tTm93KDcpKSAmJiAhYmVmb3JlTm93KVxyXG5cdFx0c3RyRGF0ZSA9IFNUUklOR19EQVlTW2RhdGUuZ2V0RGF5KCldO1xyXG5cclxuXHQvLyBwcmludCB0aGUgZGF0ZVxyXG5cdGVsc2VcclxuXHQgXHRzdHJEYXRlID0gYCR7U1RSSU5HX0RBWVNbZGF0ZS5nZXREYXkoKV19ICR7ZGF0ZS5nZXRNb250aCgpICsgMX0vJHtkYXRlLmdldERhdGUoKX1gO1xyXG5cclxuXHQvLyBhZGQgdGhlIHRpbWUgb25cclxuXHRpZihvcHRzLmluY2x1ZGVUaW1lICYmICFleHBvcnRzLmlzU2tpcFRpbWUoZGF0ZSwgb3B0cy5za2lwVGltZXMpKSB7XHJcblx0XHRyZXR1cm4gc3RyRGF0ZSArIFwiLCBcIiArIGV4cG9ydHMuc3RyaW5naWZ5VGltZShkYXRlKTtcclxuXHR9XHJcblxyXG5cdHJldHVybiBzdHJEYXRlO1xyXG59O1xyXG5cclxuLy8gY2hlY2sgaWYgdGhpcyBpcyBvbmUgb2YgdGhlIGdpdmVuIHNraXAgdGltZXNcclxuZXhwb3J0cy5pc1NraXBUaW1lID0gZnVuY3Rpb24oZGF0ZSwgc2tpcHMgPSBbXSkge1xyXG5cdHJldHVybiBza2lwcy5maW5kKHNraXAgPT4ge1xyXG5cdFx0cmV0dXJuIHNraXAuaG91ciA9PT0gZGF0ZS5nZXRIb3VycygpICYmIHNraXAubWludXRlID09PSBkYXRlLmdldE1pbnV0ZXMoKTtcclxuXHR9KTtcclxufTtcclxuXHJcbi8vIGNvbnZlcnQgYSB0aW1lIHRvIGEgc3RyaW5nXHJcbmV4cG9ydHMuc3RyaW5naWZ5VGltZSA9IGZ1bmN0aW9uKGRhdGUpIHtcclxuXHR2YXIgaG91ciA9IGRhdGUuZ2V0SG91cnMoKTtcclxuXHJcblx0Ly8gZ2V0IHRoZSBhbS9wbSB0aW1lXHJcblx0dmFyIGlzQW0gPSBob3VyIDwgMTI7XHJcblxyXG5cdC8vIG1pZG5pZ2h0XHJcblx0aWYoaG91ciA9PT0gMCkgaG91ciA9IDEyO1xyXG5cdC8vIGFmdGVyIG5vb25cclxuXHRpZihob3VyID4gMTIpIGhvdXIgPSBob3VyIC0gMTI7XHJcblxyXG5cdHZhciBtaW51dGUgPSBkYXRlLmdldE1pbnV0ZXMoKTtcclxuXHJcblx0Ly8gYWRkIGEgbGVhZGluZyAwXHJcblx0aWYobWludXRlIDwgMTApIG1pbnV0ZSA9IFwiMFwiICsgbWludXRlO1xyXG5cclxuXHRyZXR1cm4gaG91ciArIFwiOlwiICsgbWludXRlICsgKGlzQW0gPyBcImFtXCIgOiBcInBtXCIpO1xyXG59XHJcbiIsIi8qKlxyXG4gKiBBIGhlbHBlciBmb3IgYnVpbGRpbmcgZG9tIG5vZGVzXHJcbiAqL1xyXG5cclxuY29uc3QgU1ZHX0VMRU1FTlRTID0gW1wic3ZnXCIsIFwibGluZVwiXTtcclxuY29uc3QgU1ZHX05BTUVTUEFDRSA9IFwiaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmdcIjtcclxuXHJcbi8vIGJ1aWxkIGEgc2luZ2xlIGRvbSBub2RlXHJcbnZhciBtYWtlRG9tID0gZnVuY3Rpb24ob3B0cyA9IHt9KSB7XHJcblx0Ly8gZ2V0IG9yIGNyZWF0ZSB0aGUgbmFtZSBtYXBwaW5nXHJcblx0dmFyIG1hcHBlZCA9IG9wdHMubWFwcGVkIHx8IHt9O1xyXG5cclxuXHR2YXIgJGVsO1xyXG5cclxuXHQvLyB0aGUgZWxlbWVudCBpcyBwYXJ0IG9mIHRoZSBzdmcgbmFtZXNwYWNlXHJcblx0aWYoU1ZHX0VMRU1FTlRTLmluZGV4T2Yob3B0cy50YWcpICE9PSAtMSkge1xyXG5cdFx0JGVsID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudE5TKFNWR19OQU1FU1BBQ0UsIG9wdHMudGFnKTtcclxuXHR9XHJcblx0Ly8gYSBwbGFpbiBlbGVtZW50XHJcblx0ZWxzZSB7XHJcblx0XHQkZWwgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KG9wdHMudGFnIHx8IFwiZGl2XCIpO1xyXG5cdH1cclxuXHJcblx0Ly8gc2V0IHRoZSBjbGFzc2VzXHJcblx0aWYob3B0cy5jbGFzc2VzKSB7XHJcblx0XHQkZWwuc2V0QXR0cmlidXRlKFwiY2xhc3NcIiwgdHlwZW9mIG9wdHMuY2xhc3NlcyA9PSBcInN0cmluZ1wiID8gb3B0cy5jbGFzc2VzIDogb3B0cy5jbGFzc2VzLmpvaW4oXCIgXCIpKTtcclxuXHR9XHJcblxyXG5cdC8vIGF0dGFjaCB0aGUgYXR0cmlidXRlc1xyXG5cdGlmKG9wdHMuYXR0cnMpIHtcclxuXHRcdE9iamVjdC5nZXRPd25Qcm9wZXJ0eU5hbWVzKG9wdHMuYXR0cnMpXHJcblxyXG5cdFx0LmZvckVhY2goYXR0ciA9PiAkZWwuc2V0QXR0cmlidXRlKGF0dHIsIG9wdHMuYXR0cnNbYXR0cl0pKTtcclxuXHR9XHJcblxyXG5cdC8vIHNldCB0aGUgdGV4dCBjb250ZW50XHJcblx0aWYob3B0cy50ZXh0KSB7XHJcblx0XHQkZWwuaW5uZXJUZXh0ID0gb3B0cy50ZXh0O1xyXG5cdH1cclxuXHJcblx0Ly8gYXR0YWNoIHRoZSBub2RlIHRvIGl0cyBwYXJlbnRcclxuXHRpZihvcHRzLnBhcmVudCkge1xyXG5cdFx0b3B0cy5wYXJlbnQuaW5zZXJ0QmVmb3JlKCRlbCwgb3B0cy5iZWZvcmUpO1xyXG5cdH1cclxuXHJcblx0Ly8gYWRkIGV2ZW50IGxpc3RlbmVyc1xyXG5cdGlmKG9wdHMub24pIHtcclxuXHRcdGZvcihsZXQgbmFtZSBvZiBPYmplY3QuZ2V0T3duUHJvcGVydHlOYW1lcyhvcHRzLm9uKSkge1xyXG5cdFx0XHQkZWwuYWRkRXZlbnRMaXN0ZW5lcihuYW1lLCBvcHRzLm9uW25hbWVdKTtcclxuXHJcblx0XHRcdC8vIGF0dGFjaCB0aGUgZG9tIHRvIGEgZGlzcG9zYWJsZVxyXG5cdFx0XHRpZihvcHRzLmRpc3ApIHtcclxuXHRcdFx0XHRvcHRzLmRpc3AuYWRkKHtcclxuXHRcdFx0XHRcdHVuc3Vic2NyaWJlOiAoKSA9PiAkZWwucmVtb3ZlRXZlbnRMaXN0ZW5lcihuYW1lLCBvcHRzLm9uW25hbWVdKVxyXG5cdFx0XHRcdH0pO1xyXG5cdFx0XHR9XHJcblx0XHR9XHJcblx0fVxyXG5cclxuXHQvLyBzZXQgdGhlIHZhbHVlIG9mIGFuIGlucHV0IGVsZW1lbnRcclxuXHRpZihvcHRzLnZhbHVlKSB7XHJcblx0XHQkZWwudmFsdWUgPSBvcHRzLnZhbHVlO1xyXG5cdH1cclxuXHJcblx0Ly8gYWRkIHRoZSBuYW1lIG1hcHBpbmdcclxuXHRpZihvcHRzLm5hbWUpIHtcclxuXHRcdG1hcHBlZFtvcHRzLm5hbWVdID0gJGVsO1xyXG5cdH1cclxuXHJcblx0Ly8gY3JlYXRlIHRoZSBjaGlsZCBkb20gbm9kZXNcclxuXHRpZihvcHRzLmNoaWxkcmVuKSB7XHJcblx0XHRmb3IobGV0IGNoaWxkIG9mIG9wdHMuY2hpbGRyZW4pIHtcclxuXHRcdFx0Ly8gbWFrZSBhbiBhcnJheSBpbnRvIGEgZ3JvdXAgT2JqZWN0XHJcblx0XHRcdGlmKEFycmF5LmlzQXJyYXkoY2hpbGQpKSB7XHJcblx0XHRcdFx0Y2hpbGQgPSB7XHJcblx0XHRcdFx0XHRncm91cDogY2hpbGRcclxuXHRcdFx0XHR9O1xyXG5cdFx0XHR9XHJcblxyXG5cdFx0XHQvLyBhdHRhY2ggaW5mb3JtYXRpb24gZm9yIHRoZSBncm91cFxyXG5cdFx0XHRjaGlsZC5wYXJlbnQgPSAkZWw7XHJcblx0XHRcdGNoaWxkLmRpc3AgPSBvcHRzLmRpc3A7XHJcblx0XHRcdGNoaWxkLm1hcHBlZCA9IG1hcHBlZDtcclxuXHJcblx0XHRcdC8vIGJ1aWxkIHRoZSBub2RlIG9yIGdyb3VwXHJcblx0XHRcdG1ha2UoY2hpbGQpO1xyXG5cdFx0fVxyXG5cdH1cclxuXHJcblx0cmV0dXJuIG1hcHBlZDtcclxufVxyXG5cclxuLy8gYnVpbGQgYSBncm91cCBvZiBkb20gbm9kZXNcclxudmFyIG1ha2VHcm91cCA9IGZ1bmN0aW9uKGdyb3VwKSB7XHJcblx0Ly8gc2hvcnRoYW5kIGZvciBhIGdyb3Vwc1xyXG5cdGlmKEFycmF5LmlzQXJyYXkoZ3JvdXApKSB7XHJcblx0XHRncm91cCA9IHtcclxuXHRcdFx0Y2hpbGRyZW46IGdyb3VwXHJcblx0XHR9O1xyXG5cdH1cclxuXHJcblx0Ly8gZ2V0IG9yIGNyZWF0ZSB0aGUgbmFtZSBtYXBwaW5nXHJcblx0dmFyIG1hcHBlZCA9IHt9O1xyXG5cclxuXHRmb3IobGV0IG5vZGUgb2YgZ3JvdXAuZ3JvdXApIHtcclxuXHRcdC8vIGNvcHkgb3ZlciBwcm9wZXJ0aWVzIGZyb20gdGhlIGdyb3VwXHJcblx0XHRub2RlLnBhcmVudCB8fCAobm9kZS5wYXJlbnQgPSBncm91cC5wYXJlbnQpO1xyXG5cdFx0bm9kZS5kaXNwIHx8IChub2RlLmRpc3AgPSBncm91cC5kaXNwKTtcclxuXHRcdG5vZGUubWFwcGVkID0gbWFwcGVkO1xyXG5cclxuXHRcdC8vIG1ha2UgdGhlIGRvbVxyXG5cdFx0bWFrZShub2RlKTtcclxuXHR9XHJcblxyXG5cdC8vIGNhbGwgdGhlIGNhbGxiYWNrIHdpdGggdGhlIG1hcHBlZCBuYW1lc1xyXG5cdGlmKGdyb3VwLmJpbmQpIHtcclxuXHRcdHZhciBzdWJzY3JpcHRpb24gPSBncm91cC5iaW5kKG1hcHBlZCk7XHJcblxyXG5cdFx0Ly8gaWYgdGhlIHJldHVybiBhIHN1YnNjcmlwdGlvbiBhdHRhY2ggaXQgdG8gdGhlIGRpc3Bvc2FibGVcclxuXHRcdGlmKHN1YnNjcmlwdGlvbiAmJiBncm91cC5kaXNwKSB7XHJcblx0XHRcdGdyb3VwLmRpc3AuYWRkKHN1YnNjcmlwdGlvbik7XHJcblx0XHR9XHJcblx0fVxyXG5cclxuXHRyZXR1cm4gbWFwcGVkO1xyXG59O1xyXG5cclxuLy8gYSBjb2xsZWN0aW9uIG9mIHdpZGdldHNcclxudmFyIHdpZGdldHMgPSB7fTtcclxuXHJcbnZhciBtYWtlID0gbW9kdWxlLmV4cG9ydHMgPSBmdW5jdGlvbihvcHRzKSB7XHJcblx0Ly8gaGFuZGxlIGEgZ3JvdXBcclxuXHRpZihBcnJheS5pc0FycmF5KG9wdHMpIHx8IG9wdHMuZ3JvdXApIHtcclxuXHRcdHJldHVybiBtYWtlR3JvdXAob3B0cyk7XHJcblx0fVxyXG5cdC8vIG1ha2UgYSB3aWRnZXRcclxuXHRlbHNlIGlmKG9wdHMud2lkZ2V0KSB7XHJcblx0XHR2YXIgd2lkZ2V0ID0gd2lkZ2V0c1tvcHRzLndpZGdldF07XHJcblxyXG5cdFx0Ly8gbm90IGRlZmluZWRcclxuXHRcdGlmKCF3aWRnZXQpIHtcclxuXHRcdFx0dGhyb3cgbmV3IEVycm9yKGBXaWRnZXQgJyR7b3B0cy53aWRnZXR9JyBpcyBub3QgZGVmaW5lZCBtYWtlIHN1cmUgaXRzIGJlZW4gaW1wb3J0ZWRgKTtcclxuXHRcdH1cclxuXHJcblx0XHQvLyBnZW5lcmF0ZSB0aGUgd2lkZ2V0IGNvbnRlbnRcclxuXHRcdHZhciBidWlsdCA9IHdpZGdldC5tYWtlKG9wdHMpO1xyXG5cclxuXHRcdHJldHVybiBtYWtlR3JvdXAoe1xyXG5cdFx0XHRwYXJlbnQ6IG9wdHMucGFyZW50LFxyXG5cdFx0XHRkaXNwOiBvcHRzLmRpc3AsXHJcblx0XHRcdGdyb3VwOiBBcnJheS5pc0FycmF5KGJ1aWx0KSA/IGJ1aWx0IDogW2J1aWx0XSxcclxuXHRcdFx0YmluZDogd2lkZ2V0LmJpbmQgJiYgd2lkZ2V0LmJpbmQuYmluZCh3aWRnZXQsIG9wdHMpXHJcblx0XHR9KTtcclxuXHR9XHJcblx0Ly8gbWFrZSBhIHNpbmdsZSBub2RlXHJcblx0ZWxzZSB7XHJcblx0XHRyZXR1cm4gbWFrZURvbShvcHRzKTtcclxuXHR9XHJcbn07XHJcblxyXG4vLyByZWdpc3RlciBhIHdpZGdldFxyXG5tYWtlLnJlZ2lzdGVyID0gZnVuY3Rpb24obmFtZSwgd2lkZ2V0KSB7XHJcblx0d2lkZ2V0c1tuYW1lXSA9IHdpZGdldDtcclxufTtcclxuIiwiLyoqXHJcbiAqIEEgdmlldyBmb3IgYWNjZXNzaW5nL21vZGlmeWluZyBpbmZvcm1hdGlvbiBhYm91dCB0aGUgY3VycmVudCB1c2VyXHJcbiAqL1xyXG5cclxudmFyIHtnZW5CYWNrdXBOYW1lfSA9IHJlcXVpcmUoXCIuLi8uLi9jb21tb24vYmFja3VwXCIpO1xyXG5cclxubGlmZUxpbmUubmF2LnJlZ2lzdGVyKHtcclxuXHRtYXRjaGVyOiAvXig/OlxcL3VzZXJcXC8oLis/KXxcXC9hY2NvdW50KSQvLFxyXG5cclxuXHRtYWtlKHtzZXRUaXRsZSwgY29udGVudCwgbWF0Y2h9KSB7XHJcblx0XHRzZXRUaXRsZShcIkFjY291bnRcIik7XHJcblxyXG5cdFx0dmFyIHVybCA9IFwiL2FwaS9hdXRoL2luZm8vZ2V0XCI7XHJcblxyXG5cdFx0Ly8gYWRkIHRoZSB1c2VybmFtZSBpZiBvbmUgaXMgZ2l2ZW5cclxuXHRcdGlmKG1hdGNoWzFdKSB1cmwgKz0gYD91c2VybmFtZT0ke21hdGNoWzFdfWA7XHJcblxyXG5cdFx0Ly8gbG9hZCB0aGUgdXNlciBkYXRhXHJcblx0XHRmZXRjaCh1cmwsIHsgY3JlZGVudGlhbHM6IFwiaW5jbHVkZVwiIH0pXHJcblxyXG5cdFx0LnRoZW4ocmVzID0+IHJlcy5qc29uKCkpXHJcblxyXG5cdFx0LnRoZW4ocmVzID0+IHtcclxuXHRcdFx0Ly8gbm8gc3VjaCB1c2VyIG9yIGFjY2VzcyBpcyBkZW5pZWRcclxuXHRcdFx0aWYocmVzLnN0YXR1cyA9PSBcImZhaWxcIikge1xyXG5cdFx0XHRcdGxpZmVMaW5lLm1ha2VEb20oe1xyXG5cdFx0XHRcdFx0cGFyZW50OiBjb250ZW50LFxyXG5cdFx0XHRcdFx0Y2xhc3NlczogXCJjb250ZW50LXBhZGRlZFwiLFxyXG5cdFx0XHRcdFx0dGV4dDogXCJDb3VsZCBub3QgYWNjZXNzIHRoZSB1c2VyIHlvdSB3ZXJlIGxvb2tpbmcgZm9yXCJcclxuXHRcdFx0XHR9KTtcclxuXHJcblx0XHRcdFx0cmV0dXJuO1xyXG5cdFx0XHR9XHJcblxyXG5cdFx0XHR2YXIgdXNlciA9IHJlcy5kYXRhO1xyXG5cclxuXHRcdFx0Ly8gZ2VuZXJhdGUgdGhlIHBhZ2VcclxuXHRcdFx0dmFyIGNoaWxkcmVuID0gW107XHJcblxyXG5cdFx0XHRjaGlsZHJlbi5wdXNoKHtcclxuXHRcdFx0XHR0YWc6IFwiaDJcIixcclxuXHRcdFx0XHR0ZXh0OiB1c2VyLnVzZXJuYW1lXHJcblx0XHRcdH0pO1xyXG5cclxuXHRcdFx0Ly8gZGlzcGxheSB0aGUgYWRtaW4gc3RhdHVzIG9mIGFub3RoZXIgdXNlclxyXG5cdFx0XHRpZihtYXRjaFsxXSkge1xyXG5cdFx0XHRcdGNoaWxkcmVuLnB1c2goe1xyXG5cdFx0XHRcdFx0dGV4dDogYCR7dXNlci51c2VybmFtZX0gaXMgJHt1c2VyLmFkbWluID8gXCJcIiA6IFwibm90XCJ9IGFuIGFkbWluYFxyXG5cdFx0XHRcdH0pO1xyXG5cdFx0XHR9XHJcblx0XHRcdC8vIGRpc3BsYXkgdGhlIGFkbWluIHN0YXR1cyBvZiB0aGlzIHVzZXJcclxuXHRcdFx0ZWxzZSB7XHJcblx0XHRcdFx0Y2hpbGRyZW4ucHVzaCh7XHJcblx0XHRcdFx0XHR0ZXh0OiBgWW91IGFyZSAke3VzZXIuYWRtaW4gPyBcIlwiIDogXCJub3RcIn0gYW4gYWRtaW5gXHJcblx0XHRcdFx0fSk7XHJcblxyXG5cdFx0XHRcdC8vIGFkZCBhIGxpbmsgYXQgYSBsaXN0IG9mIGFsbCB1c2Vyc1xyXG5cdFx0XHRcdGlmKHVzZXIuYWRtaW4pIHtcclxuXHRcdFx0XHRcdGNoaWxkcmVuLnB1c2goeyB0YWc6IFwiYnJcIiB9KTtcclxuXHJcblx0XHRcdFx0XHRjaGlsZHJlbi5wdXNoKHtcclxuXHRcdFx0XHRcdFx0d2lkZ2V0OiBcImxpbmtcIixcclxuXHRcdFx0XHRcdFx0aHJlZjogXCIvdXNlcnNcIixcclxuXHRcdFx0XHRcdFx0dGV4dDogXCJWaWV3IGFsbCB1c2Vyc1wiXHJcblx0XHRcdFx0XHR9KTtcclxuXHRcdFx0XHR9XHJcblx0XHRcdH1cclxuXHJcblx0XHRcdC8vIGFkZCB0aGUgZW5hYmxlIHJlbWluZGVycyBidXR0b25cclxuXHRcdFx0Y2hpbGRyZW4ucHVzaCh7XHJcblx0XHRcdFx0dGFnOiBcImJ1dHRvblwiLFxyXG5cdFx0XHRcdGNsYXNzZXM6IFwiZmFuY3ktYnV0dG9uXCIsXHJcblx0XHRcdFx0YXR0cnM6IHsgc3R5bGU6IFwiZGlzcGxheTogbm9uZTtcIiB9LFxyXG5cdFx0XHRcdHRleHQ6IFwiRW5hYmxlIHJlbWluZGVyc1wiLFxyXG5cdFx0XHRcdG5hbWU6IFwicHVzaEJ0blwiLFxyXG5cdFx0XHRcdG9uOiB7XHJcblx0XHRcdFx0XHRjbGljazogKCkgPT4ge1xyXG5cdFx0XHRcdFx0XHRuYXZpZ2F0b3Iuc2VydmljZVdvcmtlci5yZWFkeS50aGVuKHJlZyA9PiB7XHJcblx0XHRcdFx0XHRcdFx0Ly8gZ2V0IHRoZSBwdWJsaWMga2V5XHJcblx0XHRcdFx0XHRcdFx0ZmV0Y2goXCIvYXBpL3B1YmxpYy1rZXlcIiwge1xyXG5cdFx0XHRcdFx0XHRcdFx0Y3JlZGVudGlhbHM6IFwiaW5jbHVkZVwiXHJcblx0XHRcdFx0XHRcdFx0fSlcclxuXHJcblx0XHRcdFx0XHRcdFx0LnRoZW4ocmVzID0+IHJlcy5hcnJheUJ1ZmZlcigpKVxyXG5cclxuXHRcdFx0XHRcdFx0XHQudGhlbihrZXkgPT4ge1xyXG5cdFx0XHRcdFx0XHRcdFx0Ly8gZ2V0IGEgc3Vic2NyaXB0aW9uXHJcblx0XHRcdFx0XHRcdFx0XHRyZXR1cm4gcmVnLnB1c2hNYW5hZ2VyLnN1YnNjcmliZSh7XHJcblx0XHRcdFx0XHRcdFx0XHRcdHVzZXJWaXNpYmxlT25seTogdHJ1ZSxcclxuXHRcdFx0XHRcdFx0XHRcdFx0YXBwbGljYXRpb25TZXJ2ZXJLZXk6IG5ldyBVaW50OEFycmF5KGtleSlcclxuXHRcdFx0XHRcdFx0XHRcdH0pO1xyXG5cdFx0XHRcdFx0XHRcdH0pXHJcblxyXG5cdFx0XHRcdFx0XHRcdC50aGVuKHN1YiA9PiB7XHJcblx0XHRcdFx0XHRcdFx0XHQvLyBzZW5kIHRoZSBzdWJzY3JpcHRpb24gdG8gdGhlIHNlcnZlclxyXG5cdFx0XHRcdFx0XHRcdFx0ZmV0Y2goXCIvYXBpL3N1YnNjcmlwdGlvblwiLCB7XHJcblx0XHRcdFx0XHRcdFx0XHRcdG1ldGhvZDogXCJQT1NUXCIsXHJcblx0XHRcdFx0XHRcdFx0XHRcdGJvZHk6IEpTT04uc3RyaW5naWZ5KHN1YiksXHJcblx0XHRcdFx0XHRcdFx0XHRcdGNyZWRlbnRpYWxzOiBcImluY2x1ZGVcIlxyXG5cdFx0XHRcdFx0XHRcdFx0fSlcclxuXHJcblx0XHRcdFx0XHRcdFx0XHQvLyBoaWRlIHRoZSBidXR0b25cclxuXHRcdFx0XHRcdFx0XHRcdC50aGVuKCgpID0+IHB1c2hCdG4uc3R5bGUuZGlzcGxheSA9IFwibm9uZVwiKVxyXG5cdFx0XHRcdFx0XHRcdH0pO1xyXG5cdFx0XHRcdFx0XHR9KTtcclxuXHRcdFx0XHRcdH1cclxuXHRcdFx0XHR9XHJcblx0XHRcdH0pO1xyXG5cclxuXHRcdFx0Ly8gY2hlY2sgaWYgdGhleSBhcmUgYWxyZWFkeSBlbmFibGVkXHJcblx0XHRcdGlmKG5hdmlnYXRvci5zZXJ2aWNlV29ya2VyKSB7XHJcblx0XHRcdFx0bmF2aWdhdG9yLnNlcnZpY2VXb3JrZXIucmVhZHkudGhlbihyZWcgPT4ge1xyXG5cdFx0XHRcdFx0Ly8gY2hlY2sgdGhhdCBwdXNoIGlzIHN1cHBvcnRlZFxyXG5cdFx0XHRcdFx0aWYocmVnLnB1c2hNYW5hZ2VyKSB7XHJcblx0XHRcdFx0XHRcdHJlZy5wdXNoTWFuYWdlci5nZXRTdWJzY3JpcHRpb24oKS50aGVuKHN1YiA9PiB7XHJcblx0XHRcdFx0XHRcdFx0Ly8gbm8gc3Vic2NyaXB0aW9uXHJcblx0XHRcdFx0XHRcdFx0aWYoIXN1Yikge1xyXG5cdFx0XHRcdFx0XHRcdFx0cHVzaEJ0bi5zdHlsZS5kaXNwbGF5ID0gXCJibG9ja1wiO1xyXG5cdFx0XHRcdFx0XHRcdH1cclxuXHRcdFx0XHRcdFx0fSk7XHJcblx0XHRcdFx0XHR9XHJcblx0XHRcdFx0fSk7XHJcblx0XHRcdH1cclxuXHJcblx0XHRcdC8vIGNyZWF0ZSBhIGJhY2t1cCBsaW5rXHJcblx0XHRcdGlmKCFtYXRjaFsxXSkge1xyXG5cdFx0XHRcdGNoaWxkcmVuLnB1c2goeyB0YWc6IFwiYnJcIiB9KTtcclxuXHRcdFx0XHRjaGlsZHJlbi5wdXNoKHsgdGFnOiBcImJyXCIgfSk7XHJcblxyXG5cdFx0XHRcdGNoaWxkcmVuLnB1c2goe1xyXG5cdFx0XHRcdFx0dGFnOiBcImFcIixcclxuXHRcdFx0XHRcdHRleHQ6IFwiRG93bmxvYWQgYmFja3VwXCIsXHJcblx0XHRcdFx0XHRhdHRyczoge1xyXG5cdFx0XHRcdFx0XHRocmVmOiBcIi9hcGkvYmFja3VwXCIsXHJcblx0XHRcdFx0XHRcdGRvd25sb2FkOiBnZW5CYWNrdXBOYW1lKClcclxuXHRcdFx0XHRcdH1cclxuXHRcdFx0XHR9KTtcclxuXHRcdFx0fVxyXG5cclxuXHRcdFx0dmFyIHBhc3N3b3JkQ2hhbmdlID0ge307XHJcblxyXG5cdFx0XHRjaGlsZHJlbi5wdXNoKHtcclxuXHRcdFx0XHR0YWc6IFwiZm9ybVwiLFxyXG5cdFx0XHRcdGNoaWxkcmVuOiBbXHJcblx0XHRcdFx0XHR7XHJcblx0XHRcdFx0XHRcdGNsYXNzZXM6IFwiZWRpdG9yLXJvd1wiLFxyXG5cdFx0XHRcdFx0XHRjaGlsZHJlbjogW1xyXG5cdFx0XHRcdFx0XHRcdHtcclxuXHRcdFx0XHRcdFx0XHRcdHdpZGdldDogXCJpbnB1dFwiLFxyXG5cdFx0XHRcdFx0XHRcdFx0dHlwZTogXCJwYXNzd29yZFwiLFxyXG5cdFx0XHRcdFx0XHRcdFx0cGxhY2Vob2xkZXI6IFwiT2xkIHBhc3N3b3JkXCIsXHJcblx0XHRcdFx0XHRcdFx0XHRiaW5kOiBwYXNzd29yZENoYW5nZSxcclxuXHRcdFx0XHRcdFx0XHRcdHByb3A6IFwib2xkUGFzc3dvcmRcIlxyXG5cdFx0XHRcdFx0XHRcdH0sXHJcblx0XHRcdFx0XHRcdFx0e1xyXG5cdFx0XHRcdFx0XHRcdFx0d2lkZ2V0OiBcImlucHV0XCIsXHJcblx0XHRcdFx0XHRcdFx0XHR0eXBlOiBcInBhc3N3b3JkXCIsXHJcblx0XHRcdFx0XHRcdFx0XHRwbGFjZWhvbGRlcjogXCJOZXcgcGFzc3dvcmRcIixcclxuXHRcdFx0XHRcdFx0XHRcdGJpbmQ6IHBhc3N3b3JkQ2hhbmdlLFxyXG5cdFx0XHRcdFx0XHRcdFx0cHJvcDogXCJwYXNzd29yZFwiXHJcblx0XHRcdFx0XHRcdFx0fVxyXG5cdFx0XHRcdFx0XHRdXHJcblx0XHRcdFx0XHR9LFxyXG5cdFx0XHRcdFx0e1xyXG5cdFx0XHRcdFx0XHR0YWc6IFwiYnV0dG9uXCIsXHJcblx0XHRcdFx0XHRcdGNsYXNzZXM6IFwiZmFuY3ktYnV0dG9uXCIsXHJcblx0XHRcdFx0XHRcdHRleHQ6IFwiQ2hhbmdlIHBhc3N3b3JkXCIsXHJcblx0XHRcdFx0XHRcdGF0dHJzOiB7XHJcblx0XHRcdFx0XHRcdFx0dHlwZTogXCJzdWJtaXRcIlxyXG5cdFx0XHRcdFx0XHR9XHJcblx0XHRcdFx0XHR9LFxyXG5cdFx0XHRcdFx0e1xyXG5cdFx0XHRcdFx0XHRuYW1lOiBcIm1zZ1wiXHJcblx0XHRcdFx0XHR9XHJcblx0XHRcdFx0XSxcclxuXHRcdFx0XHRvbjoge1xyXG5cdFx0XHRcdFx0Ly8gY2hhbmdlIHRoZSBwYXNzd29yZFxyXG5cdFx0XHRcdFx0c3VibWl0OiBlID0+IHtcclxuXHRcdFx0XHRcdFx0ZS5wcmV2ZW50RGVmYXVsdCgpO1xyXG5cclxuXHRcdFx0XHRcdFx0Ly8gbm8gcGFzc3dvcmQgc3VwcGxpZWRcclxuXHRcdFx0XHRcdFx0aWYoIXBhc3N3b3JkQ2hhbmdlLnBhc3N3b3JkKSB7XHJcblx0XHRcdFx0XHRcdFx0c2hvd01zZyhcIkVudGVyIGEgbmV3IHBhc3N3b3JkXCIpO1xyXG5cdFx0XHRcdFx0XHRcdHJldHVybjtcclxuXHRcdFx0XHRcdFx0fVxyXG5cclxuXHRcdFx0XHRcdFx0Ly8gc2VuZCB0aGUgcGFzc3dvcmQgY2hhbmdlIHJlcXVlc3RcclxuXHRcdFx0XHRcdFx0ZmV0Y2goYC9hcGkvYXV0aC9pbmZvL3NldD91c2VybmFtZT0ke3VzZXIudXNlcm5hbWV9YCwge1xyXG5cdFx0XHRcdFx0XHRcdGNyZWRlbnRpYWxzOiBcImluY2x1ZGVcIixcclxuXHRcdFx0XHRcdFx0XHRtZXRob2Q6IFwiUE9TVFwiLFxyXG5cdFx0XHRcdFx0XHRcdGJvZHk6IEpTT04uc3RyaW5naWZ5KHBhc3N3b3JkQ2hhbmdlKVxyXG5cdFx0XHRcdFx0XHR9KVxyXG5cclxuXHRcdFx0XHRcdFx0LnRoZW4ocmVzID0+IHJlcy5qc29uKCkpXHJcblxyXG5cdFx0XHRcdFx0XHQudGhlbihyZXMgPT4ge1xyXG5cdFx0XHRcdFx0XHRcdC8vIHBhc3N3b3JkIGNoYW5nZSBmYWlsZWRcclxuXHRcdFx0XHRcdFx0XHRpZihyZXMuc3RhdHVzID09IFwiZmFpbFwiKSB7XHJcblx0XHRcdFx0XHRcdFx0XHRzaG93TXNnKHJlcy5kYXRhLm1zZyk7XHJcblx0XHRcdFx0XHRcdFx0fVxyXG5cclxuXHRcdFx0XHRcdFx0XHRpZihyZXMuc3RhdHVzID09IFwic3VjY2Vzc1wiKSB7XHJcblx0XHRcdFx0XHRcdFx0XHRzaG93TXNnKFwiUGFzc3dvcmQgY2hhbmdlZFwiKTtcclxuXHRcdFx0XHRcdFx0XHR9XHJcblx0XHRcdFx0XHRcdH0pO1xyXG5cdFx0XHRcdFx0fVxyXG5cdFx0XHRcdH1cclxuXHRcdFx0fSk7XHJcblxyXG5cdFx0XHRjaGlsZHJlbi5wdXNoKHsgdGFnOiBcImJyXCIgfSk7XHJcblx0XHRcdGNoaWxkcmVuLnB1c2goeyB0YWc6IFwiYnJcIiB9KTtcclxuXHJcblx0XHRcdC8vIG9ubHkgZGlzcGxheSB0aGUgbG9nb3V0IGJ1dHRvbiBpZiB3ZSBhcmUgb24gdGhlIC9hY2NvdW50IHBhZ2VcclxuXHRcdFx0aWYoIW1hdGNoWzFdKSB7XHJcblx0XHRcdFx0Y2hpbGRyZW4ucHVzaCh7XHJcblx0XHRcdFx0XHR0YWc6IFwiYnV0dG9uXCIsXHJcblx0XHRcdFx0XHRjbGFzc2VzOiBcImZhbmN5LWJ1dHRvblwiLFxyXG5cdFx0XHRcdFx0dGV4dDogXCJMb2dvdXRcIixcclxuXHRcdFx0XHRcdG9uOiB7XHJcblx0XHRcdFx0XHRcdGNsaWNrOiAoKSA9PiB7XHJcblx0XHRcdFx0XHRcdFx0Ly8gc2VuZCB0aGUgbG9nb3V0IHJlcXVlc3RcclxuXHRcdFx0XHRcdFx0XHRmZXRjaChcIi9hcGkvYXV0aC9sb2dvdXRcIiwgeyBjcmVkZW50aWFsczogXCJpbmNsdWRlXCIgfSlcclxuXHJcblx0XHRcdFx0XHRcdFx0Ly8gcmV0dXJuIHRvIHRoZSBsb2dpbiBwYWdlXHJcblx0XHRcdFx0XHRcdFx0LnRoZW4oKCkgPT4gbGlmZUxpbmUubmF2Lm5hdmlnYXRlKFwiL2xvZ2luXCIpKTtcclxuXHRcdFx0XHRcdFx0fVxyXG5cdFx0XHRcdFx0fVxyXG5cdFx0XHRcdH0pO1xyXG5cdFx0XHR9XHJcblxyXG5cdFx0XHR2YXIge21zZywgcHVzaEJ0bn0gPSBsaWZlTGluZS5tYWtlRG9tKHtcclxuXHRcdFx0XHRwYXJlbnQ6IGNvbnRlbnQsXHJcblx0XHRcdFx0Y2xhc3NlczogXCJjb250ZW50LXBhZGRlZFwiLFxyXG5cdFx0XHRcdGNoaWxkcmVuXHJcblx0XHRcdH0pO1xyXG5cclxuXHRcdFx0Ly8gc2hvdyBhIG1lc3NhZ2VcclxuXHRcdFx0dmFyIHNob3dNc2cgPSBmdW5jdGlvbih0ZXh0KSB7XHJcblx0XHRcdFx0bXNnLmlubmVyVGV4dCA9IHRleHQ7XHJcblx0XHRcdH07XHJcblx0XHR9KVxyXG5cdH1cclxufSk7XHJcbiIsIi8qKlxyXG4gKiBFZGl0IGFuIGFzc2lnbmVtbnRcclxuICovXHJcblxyXG52YXIge2RheXNGcm9tTm93LCBzdHJpbmdpZnlEYXRlfSA9IHJlcXVpcmUoXCIuLi91dGlsL2RhdGVcIik7XHJcbnZhciB7YXNzaWdubWVudHN9ID0gcmVxdWlyZShcIi4uL2RhdGEtc3RvcmVzXCIpOztcclxuXHJcbmxpZmVMaW5lLm5hdi5yZWdpc3Rlcih7XHJcblx0bWF0Y2hlcjogL15cXC9lZGl0XFwvKC4rPykkLyxcclxuXHJcblx0bWFrZSh7bWF0Y2gsIGNvbnRlbnQsIHNldFRpdGxlLCBkaXNwb3NhYmxlfSkge1xyXG5cdFx0dmFyIGFjdGlvblN1YiwgZGVsZXRlU3ViO1xyXG5cclxuXHRcdC8vIGlmIHdlIG1ha2UgYSBjaGFuZ2UgZG9uJ3QgcmVmcmVzaCB0aGUgcGFnZVxyXG5cdFx0dmFyIGRlYm91bmNlO1xyXG5cclxuXHRcdC8vIHN5bmMgaWYgYW55dGhpbmcgaXMgY2hhbmdlZFxyXG5cdFx0dmFyIGNoYW5nZWQgPSBmYWxzZTtcclxuXHJcblx0XHR2YXIgY2hhbmdlU3ViID0gYXNzaWdubWVudHMucXVlcnkoeyBpZDogbWF0Y2hbMV0gfSwgZnVuY3Rpb24oW2l0ZW1dKSB7XHJcblx0XHRcdC8vIGlmIHdlIG1ha2UgYSBjaGFuZ2UgZG9uJ3QgcmVmcmVzaCB0aGUgcGFnZVxyXG5cdFx0XHRpZihkZWJvdW5jZSkge1xyXG5cdFx0XHRcdGRlYm91bmNlID0gZmFsc2U7XHJcblxyXG5cdFx0XHRcdHJldHVybjtcclxuXHRcdFx0fVxyXG5cclxuXHRcdFx0Ly8gY2xlYXIgdGhlIGNvbnRlbnRcclxuXHRcdFx0Y29udGVudC5pbm5lckhUTUwgPSBcIlwiO1xyXG5cclxuXHRcdFx0Ly8gcmVtb3ZlIHRoZSBwcmV2aW91cyBhY3Rpb25cclxuXHRcdFx0aWYoYWN0aW9uU3ViKSB7XHJcblx0XHRcdFx0YWN0aW9uU3ViLnVuc3Vic2NyaWJlKCk7XHJcblx0XHRcdFx0ZGVsZXRlU3ViLnVuc3Vic2NyaWJlKCk7XHJcblx0XHRcdH1cclxuXHJcblx0XHRcdC8vIGFkZCBhIGJ1dHRvbiBiYWNrIHRvIHRoZSB2aWV3XHJcblx0XHRcdGlmKGl0ZW0pIHtcclxuXHRcdFx0XHRhY3Rpb25TdWIgPSBsaWZlTGluZS5hZGRBY3Rpb24oXCJWaWV3XCIsICgpID0+IGxpZmVMaW5lLm5hdi5uYXZpZ2F0ZShcIi9pdGVtL1wiICsgaXRlbS5pZCkpO1xyXG5cclxuXHRcdFx0XHRkZWxldGVTdWIgPSBsaWZlTGluZS5hZGRBY3Rpb24oXCJEZWxldGVcIiwgKCkgPT4ge1xyXG5cdFx0XHRcdFx0Ly8gcmVtb3ZlIHRoZSBpdGVtXHJcblx0XHRcdFx0XHRhc3NpZ25tZW50cy5yZW1vdmUoaXRlbS5pZCk7XHJcblxyXG5cdFx0XHRcdFx0Ly8gbmF2aWdhdGUgYXdheVxyXG5cdFx0XHRcdFx0bGlmZUxpbmUubmF2Lm5hdmlnYXRlKFwiL1wiKTtcclxuXHJcblx0XHRcdFx0XHQvLyBzeW5jIHRoZSBjaGFuZ2VzXHJcblx0XHRcdFx0XHRsaWZlTGluZS5zeW5jKCk7XHJcblx0XHRcdFx0fSk7XHJcblx0XHRcdH1cclxuXHJcblx0XHRcdC8vIGlmIHRoZSBpdGVtIGRvZXMgbm90IGV4aXN0IGNyZWF0ZSBpdFxyXG5cdFx0XHRpZighaXRlbSkge1xyXG5cdFx0XHRcdGl0ZW0gPSB7XHJcblx0XHRcdFx0XHRuYW1lOiBcIlVubmFtZWQgaXRlbVwiLFxyXG5cdFx0XHRcdFx0Y2xhc3M6IFwiQ2xhc3NcIixcclxuXHRcdFx0XHRcdGRhdGU6IGdlbkRhdGUoKSxcclxuXHRcdFx0XHRcdGlkOiBtYXRjaFsxXSxcclxuXHRcdFx0XHRcdGRlc2NyaXB0aW9uOiBcIlwiLFxyXG5cdFx0XHRcdFx0bW9kaWZpZWQ6IERhdGUubm93KCksXHJcblx0XHRcdFx0XHR0eXBlOiBcImFzc2lnbm1lbnRcIixcclxuXHRcdFx0XHRcdGRvbmU6IGZhbHNlXHJcblx0XHRcdFx0fTtcclxuXHRcdFx0fVxyXG5cclxuXHRcdFx0Ly8gc2V0IHRoZSBpbml0YWwgdGl0bGVcclxuXHRcdFx0c2V0VGl0bGUoXCJFZGl0aW5nXCIpO1xyXG5cclxuXHRcdFx0Ly8gc2F2ZSBjaGFuZ2VzXHJcblx0XHRcdHZhciBjaGFuZ2UgPSAoKSA9PiB7XHJcblx0XHRcdFx0Ly8gdXBkYXRlIHRoZSBtb2RpZmllZCBkYXRlXHJcblx0XHRcdFx0aXRlbS5tb2RpZmllZCA9IERhdGUubm93KCk7XHJcblxyXG5cdFx0XHRcdC8vIGZpbmQgdGhlIGRhdGUgYW5kIHRpbWUgaW5wdXRzXHJcblx0XHRcdFx0dmFyIGRhdGVJbnB1dCA9IGRvY3VtZW50LnF1ZXJ5U2VsZWN0b3IoXCJpbnB1dFt0eXBlPWRhdGVdXCIpO1xyXG5cdFx0XHRcdHZhciB0aW1lSW5wdXQgPSBkb2N1bWVudC5xdWVyeVNlbGVjdG9yKFwiaW5wdXRbdHlwZT10aW1lXVwiKTtcclxuXHJcblx0XHRcdFx0Ly8gcGFyc2UgdGhlIGRhdGVcclxuXHRcdFx0XHRpdGVtLmRhdGUgPSBuZXcgRGF0ZShkYXRlSW5wdXQudmFsdWUgKyBcIiBcIiArIHRpbWVJbnB1dC52YWx1ZSk7XHJcblxyXG5cdFx0XHRcdC8vIHJlbW92ZSBhc3NpZ25lbW50IGZpZWxkcyBmcm9tIHRhc2tzXHJcblx0XHRcdFx0aWYoaXRlbS50eXBlID09IFwidGFza1wiKSB7XHJcblx0XHRcdFx0XHRkZWxldGUgaXRlbS5kYXRlO1xyXG5cdFx0XHRcdFx0ZGVsZXRlIGl0ZW0uY2xhc3M7XHJcblx0XHRcdFx0fVxyXG5cclxuXHRcdFx0XHQvLyByZW1vdmUgZXhhbSBmaWVsZHMgZnJvbSB0YXNrcyBhbmQgYXNzaWdubWVudHNcclxuXHRcdFx0XHRpZihpdGVtLnR5cGUgIT0gXCJleGFtXCIpIHtcclxuXHRcdFx0XHRcdGRlbGV0ZSBpdGVtLmxvY2F0aW9uO1xyXG5cdFx0XHRcdH1cclxuXHRcdFx0XHRlbHNlIHtcclxuXHRcdFx0XHRcdGRlbGV0ZSBpdGVtLmRlc2NyaXB0aW9uO1xyXG5cdFx0XHRcdH1cclxuXHJcblx0XHRcdFx0Ly8gYWRkIGEgYnV0dG9uIGJhY2sgdG8gdGhlIHZpZXdcclxuXHRcdFx0XHRpZighYWN0aW9uU3ViKSB7XHJcblx0XHRcdFx0XHRhY3Rpb25TdWIgPSBsaWZlTGluZS5hZGRBY3Rpb24oXCJWaWV3XCIsICgpID0+IGxpZmVMaW5lLm5hdi5uYXZpZ2F0ZShcIi9pdGVtL1wiICsgaXRlbS5pZCkpO1xyXG5cclxuXHRcdFx0XHRcdGRlbGV0ZVN1YiA9IGxpZmVMaW5lLmFkZEFjdGlvbihcIkRlbGV0ZVwiLCAoKSA9PiB7XHJcblx0XHRcdFx0XHRcdC8vIHJlbW92ZSB0aGUgaXRlbVxyXG5cdFx0XHRcdFx0XHRhc3NpZ25tZW50cy5yZW1vdmUoaXRlbS5pZCk7XHJcblxyXG5cdFx0XHRcdFx0XHQvLyBuYXZpZ2F0ZSBhd2F5XHJcblx0XHRcdFx0XHRcdGxpZmVMaW5lLm5hdi5uYXZpZ2F0ZShcIi9cIik7XHJcblx0XHRcdFx0XHR9KTtcclxuXHRcdFx0XHR9XHJcblxyXG5cdFx0XHRcdGRlYm91bmNlID0gdHJ1ZTtcclxuXHRcdFx0XHRjaGFuZ2VkID0gdHJ1ZTtcclxuXHJcblx0XHRcdFx0Ly8gc2F2ZSB0aGUgY2hhbmdlc1xyXG5cdFx0XHRcdGFzc2lnbm1lbnRzLnNldChpdGVtKTtcclxuXHRcdFx0fTtcclxuXHJcblx0XHRcdC8vIGhpZGUgYW5kIHNob3cgc3BlY2lmaWMgZmllbGRzIGZvciBkaWZmZXJlbnQgYXNzaWdubWVudCB0eXBlc1xyXG5cdFx0XHR2YXIgdG9nZ2xlRmllbGRzID0gKCkgPT4ge1xyXG5cdFx0XHRcdGlmKGl0ZW0udHlwZSA9PSBcInRhc2tcIikge1xyXG5cdFx0XHRcdFx0bWFwcGVkLmNsYXNzRmllbGQuc3R5bGUuZGlzcGxheSA9IFwibm9uZVwiO1xyXG5cdFx0XHRcdFx0bWFwcGVkLmRhdGVGaWVsZC5zdHlsZS5kaXNwbGF5ID0gXCJub25lXCI7XHJcblx0XHRcdFx0fVxyXG5cdFx0XHRcdGVsc2Uge1xyXG5cdFx0XHRcdFx0bWFwcGVkLmNsYXNzRmllbGQuc3R5bGUuZGlzcGxheSA9IFwiXCI7XHJcblx0XHRcdFx0XHRtYXBwZWQuZGF0ZUZpZWxkLnN0eWxlLmRpc3BsYXkgPSBcIlwiO1xyXG5cdFx0XHRcdH1cclxuXHJcblx0XHRcdFx0aWYoaXRlbS50eXBlID09IFwiZXhhbVwiKSB7XHJcblx0XHRcdFx0XHRtYXBwZWQuZGVzY3JpcHRpb25GaWVsZC5zdHlsZS5kaXNwbGF5ID0gXCJub25lXCI7XHJcblx0XHRcdFx0XHRtYXBwZWQubG9jYXRpb25GaWVsZC5zdHlsZS5kaXNwbGF5ID0gXCJcIjtcclxuXHRcdFx0XHR9XHJcblx0XHRcdFx0ZWxzZSB7XHJcblx0XHRcdFx0XHRtYXBwZWQuZGVzY3JpcHRpb25GaWVsZC5zdHlsZS5kaXNwbGF5ID0gXCJcIjtcclxuXHRcdFx0XHRcdG1hcHBlZC5sb2NhdGlvbkZpZWxkLnN0eWxlLmRpc3BsYXkgPSBcIm5vbmVcIjtcclxuXHRcdFx0XHR9XHJcblxyXG5cdFx0XHRcdC8vIGZpbGwgaW4gZGF0ZSBpZiBpdCBpcyBtaXNzaW5nXHJcblx0XHRcdFx0aWYoaXRlbS50eXBlICE9IFwidGFza1wiKSB7XHJcblx0XHRcdFx0XHRpZighaXRlbS5kYXRlKSB7XHJcblx0XHRcdFx0XHRcdGl0ZW0uZGF0ZSA9IGdlbkRhdGUoKTtcclxuXHRcdFx0XHRcdH1cclxuXHJcblx0XHRcdFx0XHRpZighaXRlbS5jbGFzcykge1xyXG5cdFx0XHRcdFx0XHRpdGVtLmNsYXNzID0gXCJDbGFzc1wiO1xyXG5cdFx0XHRcdFx0fVxyXG5cclxuXHRcdFx0XHRcdGlmKGl0ZW0udHlwZSA9PSBcImV4YW1cIiAmJiAhaXRlbS5sb2NhdGlvbikge1xyXG5cdFx0XHRcdFx0XHRpdGVtLmxvY2F0aW9uID0gXCJMb2NhdGlvblwiO1xyXG5cdFx0XHRcdFx0fVxyXG5cdFx0XHRcdH1cclxuXHRcdFx0fTtcclxuXHJcblx0XHRcdC8vIHJlbmRlciB0aGUgdWlcclxuXHRcdFx0dmFyIG1hcHBlZCA9IGxpZmVMaW5lLm1ha2VEb20oe1xyXG5cdFx0XHRcdHBhcmVudDogY29udGVudCxcclxuXHRcdFx0XHRncm91cDogW1xyXG5cdFx0XHRcdFx0e1xyXG5cdFx0XHRcdFx0XHRjbGFzc2VzOiBcImVkaXRvci1yb3dcIixcclxuXHRcdFx0XHRcdFx0Y2hpbGRyZW46IFtcclxuXHRcdFx0XHRcdFx0XHR7XHJcblx0XHRcdFx0XHRcdFx0XHR3aWRnZXQ6IFwiaW5wdXRcIixcclxuXHRcdFx0XHRcdFx0XHRcdGJpbmQ6IGl0ZW0sXHJcblx0XHRcdFx0XHRcdFx0XHRwcm9wOiBcIm5hbWVcIixcclxuXHRcdFx0XHRcdFx0XHRcdGNoYW5nZVxyXG5cdFx0XHRcdFx0XHRcdH1cclxuXHRcdFx0XHRcdFx0XVxyXG5cdFx0XHRcdFx0fSxcclxuXHRcdFx0XHRcdHtcclxuXHRcdFx0XHRcdFx0Y2xhc3NlczogXCJlZGl0b3Itcm93XCIsXHJcblx0XHRcdFx0XHRcdGNoaWxkcmVuOiBbXHJcblx0XHRcdFx0XHRcdFx0e1xyXG5cdFx0XHRcdFx0XHRcdFx0d2lkZ2V0OiBcInRvZ2dsZS1idG5zXCIsXHJcblx0XHRcdFx0XHRcdFx0XHRidG5zOiBbXHJcblx0XHRcdFx0XHRcdFx0XHRcdHsgdGV4dDogXCJBc3NpZ25tZW50XCIsIHZhbHVlOiBcImFzc2lnbm1lbnRcIiB9LFxyXG5cdFx0XHRcdFx0XHRcdFx0XHR7IHRleHQ6IFwiVGFza1wiLCB2YWx1ZTogXCJ0YXNrXCIgfSxcclxuXHRcdFx0XHRcdFx0XHRcdFx0eyB0ZXh0OiBcIkV4YW1cIiwgdmFsdWU6IFwiZXhhbVwiIH1cclxuXHRcdFx0XHRcdFx0XHRcdF0sXHJcblx0XHRcdFx0XHRcdFx0XHR2YWx1ZTogaXRlbS50eXBlLFxyXG5cdFx0XHRcdFx0XHRcdFx0Y2hhbmdlOiB0eXBlID0+IHtcclxuXHRcdFx0XHRcdFx0XHRcdFx0Ly8gdXBkYXRlIHRoZSBpdGVtIHR5cGVcclxuXHRcdFx0XHRcdFx0XHRcdFx0aXRlbS50eXBlID0gdHlwZTtcclxuXHJcblx0XHRcdFx0XHRcdFx0XHRcdC8vIGhpZGUvc2hvdyBzcGVjaWZpYyBmaWVsZHNcclxuXHRcdFx0XHRcdFx0XHRcdFx0dG9nZ2xlRmllbGRzKCk7XHJcblxyXG5cdFx0XHRcdFx0XHRcdFx0XHQvLyBlbWl0IHRoZSBjaGFuZ2VcclxuXHRcdFx0XHRcdFx0XHRcdFx0Y2hhbmdlKCk7XHJcblx0XHRcdFx0XHRcdFx0XHR9XHJcblx0XHRcdFx0XHRcdFx0fVxyXG5cdFx0XHRcdFx0XHRdXHJcblx0XHRcdFx0XHR9LFxyXG5cdFx0XHRcdFx0e1xyXG5cdFx0XHRcdFx0XHRuYW1lOiBcImNsYXNzRmllbGRcIixcclxuXHRcdFx0XHRcdFx0Y2xhc3NlczogXCJlZGl0b3Itcm93XCIsXHJcblx0XHRcdFx0XHRcdGNoaWxkcmVuOiBbXHJcblx0XHRcdFx0XHRcdFx0e1xyXG5cdFx0XHRcdFx0XHRcdFx0d2lkZ2V0OiBcImlucHV0XCIsXHJcblx0XHRcdFx0XHRcdFx0XHRiaW5kOiBpdGVtLFxyXG5cdFx0XHRcdFx0XHRcdFx0cHJvcDogXCJjbGFzc1wiLFxyXG5cdFx0XHRcdFx0XHRcdFx0Y2hhbmdlXHJcblx0XHRcdFx0XHRcdFx0fVxyXG5cdFx0XHRcdFx0XHRdXHJcblx0XHRcdFx0XHR9LFxyXG5cdFx0XHRcdFx0e1xyXG5cdFx0XHRcdFx0XHRuYW1lOiBcImRhdGVGaWVsZFwiLFxyXG5cdFx0XHRcdFx0XHRjbGFzc2VzOiBcImVkaXRvci1yb3dcIixcclxuXHRcdFx0XHRcdFx0Y2hpbGRyZW46IFtcclxuXHRcdFx0XHRcdFx0XHR7XHJcblx0XHRcdFx0XHRcdFx0XHR3aWRnZXQ6IFwiaW5wdXRcIixcclxuXHRcdFx0XHRcdFx0XHRcdHR5cGU6IFwiZGF0ZVwiLFxyXG5cdFx0XHRcdFx0XHRcdFx0dmFsdWU6IGl0ZW0uZGF0ZSAmJiBgJHtpdGVtLmRhdGUuZ2V0RnVsbFllYXIoKX0tJHtwYWQoaXRlbS5kYXRlLmdldE1vbnRoKCkgKyAxKX0tJHtwYWQoaXRlbS5kYXRlLmdldERhdGUoKSl9YCxcclxuXHRcdFx0XHRcdFx0XHRcdGNoYW5nZVxyXG5cdFx0XHRcdFx0XHRcdH0sXHJcblx0XHRcdFx0XHRcdFx0e1xyXG5cdFx0XHRcdFx0XHRcdFx0d2lkZ2V0OiBcImlucHV0XCIsXHJcblx0XHRcdFx0XHRcdFx0XHR0eXBlOiBcInRpbWVcIixcclxuXHRcdFx0XHRcdFx0XHRcdHZhbHVlOiBpdGVtLmRhdGUgJiYgYCR7aXRlbS5kYXRlLmdldEhvdXJzKCl9OiR7cGFkKGl0ZW0uZGF0ZS5nZXRNaW51dGVzKCkpfWAsXHJcblx0XHRcdFx0XHRcdFx0XHRjaGFuZ2VcclxuXHRcdFx0XHRcdFx0XHR9XHJcblx0XHRcdFx0XHRcdF1cclxuXHRcdFx0XHRcdH0sXHJcblx0XHRcdFx0XHR7XHJcblx0XHRcdFx0XHRcdG5hbWU6IFwibG9jYXRpb25GaWVsZFwiLFxyXG5cdFx0XHRcdFx0XHRjbGFzc2VzOiBcImVkaXRvci1yb3dcIixcclxuXHRcdFx0XHRcdFx0Y2hpbGRyZW46IFtcclxuXHRcdFx0XHRcdFx0XHR7XHJcblx0XHRcdFx0XHRcdFx0XHR3aWRnZXQ6IFwiaW5wdXRcIixcclxuXHRcdFx0XHRcdFx0XHRcdGJpbmQ6IGl0ZW0sXHJcblx0XHRcdFx0XHRcdFx0XHRwcm9wOiBcImxvY2F0aW9uXCIsXHJcblx0XHRcdFx0XHRcdFx0XHRjaGFuZ2VcclxuXHRcdFx0XHRcdFx0XHR9XHJcblx0XHRcdFx0XHRcdF1cclxuXHRcdFx0XHRcdH0sXHJcblx0XHRcdFx0XHR7XHJcblx0XHRcdFx0XHRcdG5hbWU6IFwiZGVzY3JpcHRpb25GaWVsZFwiLFxyXG5cdFx0XHRcdFx0XHRjbGFzc2VzOiBcInRleHRhcmVhLXdyYXBwZXJcIixcclxuXHRcdFx0XHRcdFx0Y2hpbGRyZW46IFtcclxuXHRcdFx0XHRcdFx0XHR7XHJcblx0XHRcdFx0XHRcdFx0XHR3aWRnZXQ6IFwiaW5wdXRcIixcclxuXHRcdFx0XHRcdFx0XHRcdHRhZzogXCJ0ZXh0YXJlYVwiLFxyXG5cdFx0XHRcdFx0XHRcdFx0Y2xhc3NlczogXCJ0ZXh0YXJlYS1maWxsXCIsXHJcblx0XHRcdFx0XHRcdFx0XHRwbGFjZWhvbGRlcjogXCJEZXNjcmlwdGlvblwiLFxyXG5cdFx0XHRcdFx0XHRcdFx0YmluZDogaXRlbSxcclxuXHRcdFx0XHRcdFx0XHRcdHByb3A6IFwiZGVzY3JpcHRpb25cIixcclxuXHRcdFx0XHRcdFx0XHRcdGNoYW5nZVxyXG5cdFx0XHRcdFx0XHRcdH1cclxuXHRcdFx0XHRcdFx0XVxyXG5cdFx0XHRcdFx0fVxyXG5cdFx0XHRcdF1cclxuXHRcdFx0fSk7XHJcblxyXG5cdFx0XHQvLyBzaG93IHRoZSBmaWVsZHMgZm9yIHRoaXMgaXRlbSB0eXBlXHJcblx0XHRcdHRvZ2dsZUZpZWxkcygpO1xyXG5cdFx0fSk7XHJcblxyXG5cdFx0Ly8gcmVtb3ZlIHRoZSBzdWJzY3JpcHRpb24gd2hlbiB0aGlzIHZpZXcgaXMgZGVzdHJveWVkXHJcblx0XHRkaXNwb3NhYmxlLmFkZChjaGFuZ2VTdWIpO1xyXG5cclxuXHRcdC8vIHN5bmMgaWYgd2UgY2hhbmdlZCBhbnl0aGluZ1xyXG5cdFx0ZGlzcG9zYWJsZS5hZGQoe1xyXG5cdFx0XHR1bnN1YnNjcmliZTogZnVuY3Rpb24oKSB7XHJcblx0XHRcdFx0aWYoY2hhbmdlZCkge1xyXG5cdFx0XHRcdFx0bGlmZUxpbmUuc3luYygpO1xyXG5cdFx0XHRcdH1cclxuXHRcdFx0fVxyXG5cdFx0fSk7XHJcblx0fVxyXG59KTtcclxuXHJcbi8vIGFkZCBhIGxlYWRpbmcgMCBpZiBhIG51bWJlciBpcyBsZXNzIHRoYW4gMTBcclxudmFyIHBhZCA9IG51bWJlciA9PiAobnVtYmVyIDwgMTApID8gXCIwXCIgKyBudW1iZXIgOiBudW1iZXI7XHJcblxyXG4vLyBjcmVhdGUgYSBkYXRlIG9mIHRvZGF5IGF0IDExOjU5cG1cclxudmFyIGdlbkRhdGUgPSAoKSA9PiB7XHJcblx0dmFyIGRhdGUgPSBuZXcgRGF0ZSgpO1xyXG5cclxuXHQvLyBzZXQgdGhlIHRpbWVcclxuXHRkYXRlLnNldEhvdXJzKDIzKTtcclxuXHRkYXRlLnNldE1pbnV0ZXMoNTkpO1xyXG5cclxuXHRyZXR1cm4gZGF0ZTtcclxufTtcclxuIiwiLyoqXHJcbiAqIFRoZSB2aWV3IGZvciBhbiBhc3NpZ25tZW50XHJcbiAqL1xyXG5cclxudmFyIHtkYXlzRnJvbU5vdywgc3RyaW5naWZ5RGF0ZX0gPSByZXF1aXJlKFwiLi4vdXRpbC9kYXRlXCIpO1xyXG52YXIge2Fzc2lnbm1lbnRzfSA9IHJlcXVpcmUoXCIuLi9kYXRhLXN0b3Jlc1wiKTtcclxuXHJcbmxpZmVMaW5lLm5hdi5yZWdpc3Rlcih7XHJcblx0bWF0Y2hlcjogL15cXC9pdGVtXFwvKC4rPykkLyxcclxuXHJcblx0bWFrZSh7bWF0Y2gsIHNldFRpdGxlLCBjb250ZW50LCBkaXNwb3NhYmxlfSkge1xyXG5cdFx0dmFyIGFjdGlvbkRvbmVTdWIsIGFjdGlvbkVkaXRTdWI7XHJcblxyXG5cdCBcdGRpc3Bvc2FibGUuYWRkKFxyXG5cdFx0XHRhc3NpZ25tZW50cy5xdWVyeSh7IGlkOiBtYXRjaFsxXSB9LCBmdW5jdGlvbihbaXRlbV0pIHtcclxuXHRcdFx0XHQvLyBjbGVhciB0aGUgY29udGVudFxyXG5cdFx0XHRcdGNvbnRlbnQuaW5uZXJIVE1MID0gXCJcIjtcclxuXHJcblx0XHRcdFx0Ly8gcmVtb3ZlIHRoZSBvbGQgYWN0aW9uXHJcblx0XHRcdFx0aWYoYWN0aW9uRWRpdFN1Yikge1xyXG5cdFx0XHRcdFx0aWYoYWN0aW9uRG9uZVN1YikgYWN0aW9uRG9uZVN1Yi51bnN1YnNjcmliZSgpO1xyXG5cdFx0XHRcdFx0YWN0aW9uRWRpdFN1Yi51bnN1YnNjcmliZSgpO1xyXG5cdFx0XHRcdH1cclxuXHJcblx0XHRcdFx0Ly8gbm8gc3VjaCBhc3NpZ25tZW50XHJcblx0XHRcdFx0aWYoIWl0ZW0pIHtcclxuXHRcdFx0XHRcdHNldFRpdGxlKFwiTm90IGZvdW5kXCIpO1xyXG5cclxuXHRcdFx0XHRcdGxpZmVMaW5lLm1ha2VEb20oe1xyXG5cdFx0XHRcdFx0XHRwYXJlbnQ6IGNvbnRlbnQsXHJcblx0XHRcdFx0XHRcdGNsYXNzZXM6IFwiY29udGVudC1wYWRkZWRcIixcclxuXHRcdFx0XHRcdFx0Y2hpbGRyZW46IFtcclxuXHRcdFx0XHRcdFx0XHR7XHJcblx0XHRcdFx0XHRcdFx0XHR0YWc6IFwic3BhblwiLFxyXG5cdFx0XHRcdFx0XHRcdFx0dGV4dDogXCJUaGUgYXNzaWdubWVudCB5b3Ugd2hlcmUgbG9va2luZyBmb3IgY291bGQgbm90IGJlIGZvdW5kLiBcIlxyXG5cdFx0XHRcdFx0XHRcdH0sXHJcblx0XHRcdFx0XHRcdFx0e1xyXG5cdFx0XHRcdFx0XHRcdFx0d2lkZ2V0OiBcImxpbmtcIixcclxuXHRcdFx0XHRcdFx0XHRcdGhyZWY6IFwiL1wiLFxyXG5cdFx0XHRcdFx0XHRcdFx0dGV4dDogXCJHbyBob21lLlwiXHJcblx0XHRcdFx0XHRcdFx0fVxyXG5cdFx0XHRcdFx0XHRdXHJcblx0XHRcdFx0XHR9KTtcclxuXHJcblx0XHRcdFx0XHRyZXR1cm47XHJcblx0XHRcdFx0fVxyXG5cclxuXHRcdFx0XHQvLyBzZXQgdGhlIHRpdGxlIGZvciB0aGUgY29udGVudFxyXG5cdFx0XHRcdHNldFRpdGxlKGl0ZW0udHlwZVswXS50b1VwcGVyQ2FzZSgpICsgaXRlbS50eXBlLnN1YnN0cigxKSk7XHJcblxyXG5cdFx0XHRcdGlmKGl0ZW0udHlwZSAhPSBcImV4YW1cIikge1xyXG5cdFx0XHRcdFx0Ly8gbWFyayB0aGUgaXRlbSBhcyBkb25lXHJcblx0XHRcdFx0XHRhY3Rpb25Eb25lU3ViID0gbGlmZUxpbmUuYWRkQWN0aW9uKGl0ZW0uZG9uZSA/IFwiRG9uZVwiIDogXCJOb3QgZG9uZVwiLCAoKSA9PiB7XHJcblx0XHRcdFx0XHRcdC8vIG1hcmsgdGhlIGl0ZW0gZG9uZVxyXG5cdFx0XHRcdFx0XHRpdGVtLmRvbmUgPSAhaXRlbS5kb25lO1xyXG5cclxuXHRcdFx0XHRcdFx0Ly8gdXBkYXRlIHRoZSBtb2RpZmllZCB0aW1lXHJcblx0XHRcdFx0XHRcdGl0ZW0ubW9kaWZpZWQgPSBEYXRlLm5vdygpO1xyXG5cclxuXHRcdFx0XHRcdFx0Ly8gc2F2ZSB0aGUgY2hhbmdlXHJcblx0XHRcdFx0XHRcdGFzc2lnbm1lbnRzLnNldChpdGVtKTtcclxuXHJcblx0XHRcdFx0XHRcdC8vIHN5bmMgdGhlIGNoYW5nZVxyXG5cdFx0XHRcdFx0XHRsaWZlTGluZS5zeW5jKCk7XHJcblx0XHRcdFx0XHR9KTtcclxuXHRcdFx0XHR9XHJcblxyXG5cdFx0XHRcdC8vIGVkaXQgdGhlIGl0ZW1cclxuXHRcdFx0XHRhY3Rpb25FZGl0U3ViID0gbGlmZUxpbmUuYWRkQWN0aW9uKFwiRWRpdFwiLFxyXG5cdFx0XHRcdFx0KCkgPT4gbGlmZUxpbmUubmF2Lm5hdmlnYXRlKFwiL2VkaXQvXCIgKyBpdGVtLmlkKSk7XHJcblxyXG5cdFx0XHRcdC8vIHRpbWVzIHRvIHNraXBcclxuXHRcdFx0XHR2YXIgc2tpcFRpbWVzID0gW1xyXG5cdFx0XHRcdFx0eyBob3VyOiAyMywgbWludXRlOiA1OSB9XHJcblx0XHRcdFx0XTtcclxuXHJcblx0XHRcdFx0bGlmZUxpbmUubWFrZURvbSh7XHJcblx0XHRcdFx0XHRwYXJlbnQ6IGNvbnRlbnQsXHJcblx0XHRcdFx0XHRjbGFzc2VzOiBcImNvbnRlbnQtcGFkZGVkXCIsXHJcblx0XHRcdFx0XHRjaGlsZHJlbjogW1xyXG5cdFx0XHRcdFx0XHR7XHJcblx0XHRcdFx0XHRcdFx0Y2xhc3NlczogXCJhc3NpZ25tZW50LW5hbWVcIixcclxuXHRcdFx0XHRcdFx0XHR0ZXh0OiBpdGVtLm5hbWVcclxuXHRcdFx0XHRcdFx0fSxcclxuXHRcdFx0XHRcdFx0e1xyXG5cdFx0XHRcdFx0XHRcdGNsYXNzZXM6IFwiYXNzaWdubWVudC1pbmZvLXJvd1wiLFxyXG5cdFx0XHRcdFx0XHRcdGNoaWxkcmVuOiBbXHJcblx0XHRcdFx0XHRcdFx0XHR7XHJcblx0XHRcdFx0XHRcdFx0XHRcdGNsYXNzZXM6IFwiYXNzaWdubWVudC1pbmZvLWdyb3dcIixcclxuXHRcdFx0XHRcdFx0XHRcdFx0dGV4dDogaXRlbS5jbGFzc1xyXG5cdFx0XHRcdFx0XHRcdFx0fSxcclxuXHRcdFx0XHRcdFx0XHRcdHtcclxuXHRcdFx0XHRcdFx0XHRcdFx0dGV4dDogaXRlbS5kYXRlICYmIHN0cmluZ2lmeURhdGUoaXRlbS5kYXRlLCB7IGluY2x1ZGVUaW1lOiB0cnVlLCBza2lwVGltZXMgfSlcclxuXHRcdFx0XHRcdFx0XHRcdH1cclxuXHRcdFx0XHRcdFx0XHRdXHJcblx0XHRcdFx0XHRcdH0sXHJcblx0XHRcdFx0XHRcdHtcclxuXHRcdFx0XHRcdFx0XHRjbGFzc2VzOiBcImFzc2lnbm1lbnQtZGVzY3JpcHRpb25cIixcclxuXHRcdFx0XHRcdFx0XHR0ZXh0OiBpdGVtLmRlc2NyaXB0aW9uIHx8IGl0ZW0ubG9jYXRpb25cclxuXHRcdFx0XHRcdFx0fVxyXG5cdFx0XHRcdFx0XVxyXG5cdFx0XHRcdH0pO1xyXG5cdFx0XHR9KVxyXG5cdFx0KTtcclxuXHR9XHJcbn0pO1xyXG4iLCIvKipcclxuICogRGlzcGxheSBhIGxpc3Qgb2YgdXBjb21taW5nIGFzc2lnbm1lbnRzXHJcbiAqL1xyXG5cclxudmFyIHtkYXlzRnJvbU5vdywgaXNTYW1lRGF0ZSwgc3RyaW5naWZ5RGF0ZSwgc3RyaW5naWZ5VGltZSwgaXNTb29uZXJEYXRlfSA9IHJlcXVpcmUoXCIuLi91dGlsL2RhdGVcIik7XHJcbnZhciB7YXNzaWdubWVudHN9ID0gcmVxdWlyZShcIi4uL2RhdGEtc3RvcmVzXCIpO1xyXG5cclxuLy8gYWxsIHRoZSBkaWZmZXJlbnQgbGlzdHNcclxuY29uc3QgTElTVFMgPSBbXHJcblx0e1xyXG5cdFx0dXJsOiBcIi93ZWVrXCIsXHJcblx0XHR0aXRsZTogXCJUaGlzIHdlZWtcIixcclxuXHRcdGNyZWF0ZUN0eDogKCkgPT4gKHtcclxuXHRcdFx0Ly8gZGF5cyB0byB0aGUgZW5kIG9mIHRoaXMgd2Vla1xyXG5cdFx0XHRlbmREYXRlOiBkYXlzRnJvbU5vdyg3IC0gKG5ldyBEYXRlKCkpLmdldERheSgpKSxcclxuXHRcdFx0Ly8gdG9kYXlzIGRhdGVcclxuXHRcdFx0dG9kYXk6IG5ldyBEYXRlKClcclxuXHRcdH0pLFxyXG5cdFx0Ly8gc2hvdyBhbGwgYXQgcmVhc29uYWJsZSBudW1iZXIgb2YgaW5jb21wbGV0ZSBhc3NpZ25tZW50c1xyXG5cdFx0ZmlsdGVyOiAoaXRlbSwge3RvZGF5LCBlbmREYXRlfSkgPT4ge1xyXG5cdFx0XHQvLyBzaG93IGFsbCB0YXNrc1xyXG5cdFx0XHRpZihpdGVtLnR5cGUgPT0gXCJ0YXNrXCIpIHJldHVybiB0cnVlO1xyXG5cclxuXHRcdFx0Ly8gY2hlY2sgaWYgdGhlIGl0ZW0gaXMgcGFzdCB0aGlzIHdlZWtcclxuXHRcdFx0aWYoIWlzU29vbmVyRGF0ZShpdGVtLmRhdGUsIGVuZERhdGUpICYmICFpc1NhbWVEYXRlKGl0ZW0uZGF0ZSwgZW5kRGF0ZSkpIHJldHVybjtcclxuXHJcblx0XHRcdC8vIGNoZWNrIGlmIHRoZSBkYXRlIGlzIGJlZm9yZSB0b2RheVxyXG5cdFx0XHRpZihpc1Nvb25lckRhdGUoaXRlbS5kYXRlLCB0b2RheSkpIHJldHVybjtcclxuXHJcblx0XHRcdHJldHVybiB0cnVlO1xyXG5cdFx0fSxcclxuXHRcdHF1ZXJ5OiB7IGRvbmU6IGZhbHNlIH1cclxuXHR9LFxyXG5cdHtcclxuXHRcdHVybDogXCIvdXBjb21pbmdcIixcclxuXHRcdHF1ZXJ5OiB7IGRvbmU6IGZhbHNlIH0sXHJcblx0XHR0aXRsZTogXCJVcGNvbWluZ1wiXHJcblx0fSxcclxuXHR7XHJcblx0XHR1cmw6IFwiL2RvbmVcIixcclxuXHRcdHF1ZXJ5OiB7IGRvbmU6IHRydWUgfSxcclxuXHRcdHRpdGxlOiBcIkRvbmVcIlxyXG5cdH1cclxuXTtcclxuXHJcbi8vIGFkZCBsaXN0IHZpZXcgbGlua3MgdG8gdGhlIG5hdmJhclxyXG5leHBvcnRzLmluaXROYXZCYXIgPSBmdW5jdGlvbigpIHtcclxuXHRMSVNUUy5mb3JFYWNoKGxpc3QgPT4gbGlmZUxpbmUuYWRkTmF2Q29tbWFuZChsaXN0LnRpdGxlLCBsaXN0LnVybCkpO1xyXG59O1xyXG5cclxubGlmZUxpbmUubmF2LnJlZ2lzdGVyKHtcclxuXHRtYXRjaGVyKHVybCkge1xyXG5cdFx0cmV0dXJuIExJU1RTLmZpbmQobGlzdCA9PiBsaXN0LnVybCA9PSB1cmwpO1xyXG5cdH0sXHJcblxyXG5cdC8vIG1ha2UgdGhlIGxpc3RcclxuXHRtYWtlKHtzZXRUaXRsZSwgY29udGVudCwgZGlzcG9zYWJsZSwgbWF0Y2h9KSB7XHJcblx0XHRkaXNwb3NhYmxlLmFkZChcclxuXHRcdFx0YXNzaWdubWVudHMucXVlcnkobWF0Y2gucXVlcnkgfHwge30sIGZ1bmN0aW9uKGRhdGEpIHtcclxuXHRcdFx0XHQvLyBjbGVhciB0aGUgY29udGVudFxyXG5cdFx0XHRcdGNvbnRlbnQuaW5uZXJIVE1MID0gXCJcIjtcclxuXHJcblx0XHRcdFx0Ly8gc2V0IHRoZSBwYWdlIHRpdGxlXHJcblx0XHRcdFx0c2V0VGl0bGUobWF0Y2gudGl0bGUpO1xyXG5cclxuXHRcdFx0XHQvLyB0aGUgY29udGV4dCBmb3IgdGhlIGZpbHRlciBmdW5jdGlvblxyXG5cdFx0XHRcdHZhciBjdHg7XHJcblxyXG5cdFx0XHRcdGlmKG1hdGNoLmNyZWF0ZUN0eCkge1xyXG5cdFx0XHRcdFx0Y3R4ID0gbWF0Y2guY3JlYXRlQ3R4KCk7XHJcblx0XHRcdFx0fVxyXG5cclxuXHRcdFx0XHQvLyBydW4gdGhlIGZpbHRlciBmdW5jdGlvblxyXG5cdFx0XHRcdGlmKG1hdGNoLmZpbHRlcikge1xyXG5cdFx0XHRcdFx0ZGF0YSA9IGRhdGEuZmlsdGVyKGl0ZW0gPT4gbWF0Y2guZmlsdGVyKGl0ZW0sIGN0eCkpO1xyXG5cdFx0XHRcdH1cclxuXHJcblx0XHRcdFx0Ly8gc29ydCB0aGUgYXNzaW5nbWVudHNcclxuXHRcdFx0XHRkYXRhLnNvcnQoKGEsIGIpID0+IHtcclxuXHRcdFx0XHRcdC8vIHRhc2tzIGFyZSBiZWxvdyBhc3NpZ25tZW50c1xyXG5cdFx0XHRcdFx0aWYoYS50eXBlID09IFwidGFza1wiICYmIGIudHlwZSAhPSBcInRhc2tcIikgcmV0dXJuIDE7XHJcblx0XHRcdFx0XHRpZihhLnR5cGUgIT0gXCJ0YXNrXCIgJiYgYi50eXBlID09IFwidGFza1wiKSByZXR1cm4gLTE7XHJcblxyXG5cdFx0XHRcdFx0Ly8gc29ydCBieSBkdWUgZGF0ZVxyXG5cdFx0XHRcdFx0aWYoYS50eXBlICE9IFwidGFza1wiICYmIGIudHlwZSAhPSBcInRhc2tcIikge1xyXG5cdFx0XHRcdFx0XHRpZihhLmRhdGUuZ2V0VGltZSgpICE9IGIuZGF0ZS5nZXRUaW1lKCkpIHtcclxuXHRcdFx0XHRcdFx0XHRyZXR1cm4gYS5kYXRlLmdldFRpbWUoKSAtIGIuZGF0ZS5nZXRUaW1lKCk7XHJcblx0XHRcdFx0XHRcdH1cclxuXHRcdFx0XHRcdH1cclxuXHJcblx0XHRcdFx0XHQvLyBvcmRlciBieSBuYW1lXHJcblx0XHRcdFx0XHRpZihhLm5hbWUgPCBiLm5hbWUpIHJldHVybiAtMTtcclxuXHRcdFx0XHRcdGlmKGEubmFtZSA+IGIubmFtZSkgcmV0dXJuIDE7XHJcblxyXG5cdFx0XHRcdFx0cmV0dXJuIDA7XHJcblx0XHRcdFx0fSk7XHJcblxyXG5cdFx0XHRcdC8vIG1ha2UgdGhlIGdyb3Vwc1xyXG5cdFx0XHRcdHZhciBncm91cHMgPSB7fTtcclxuXHJcblx0XHRcdFx0Ly8gcmVuZGVyIHRoZSBsaXN0XHJcblx0XHRcdFx0ZGF0YS5mb3JFYWNoKChpdGVtLCBpKSA9PiB7XHJcblx0XHRcdFx0XHQvLyBnZXQgdGhlIGhlYWRlciBuYW1lXHJcblx0XHRcdFx0XHR2YXIgZGF0ZVN0ciA9IGl0ZW0udHlwZSA9PSBcInRhc2tcIiA/IFwiVGFza3NcIiA6IHN0cmluZ2lmeURhdGUoaXRlbS5kYXRlKTtcclxuXHJcblx0XHRcdFx0XHQvLyBtYWtlIHN1cmUgdGhlIGhlYWRlciBleGlzdHNcclxuXHRcdFx0XHRcdGdyb3Vwc1tkYXRlU3RyXSB8fCAoZ3JvdXBzW2RhdGVTdHJdID0gW10pO1xyXG5cclxuXHRcdFx0XHRcdC8vIGFkZCB0aGUgaXRlbSB0byB0aGUgbGlzdFxyXG5cdFx0XHRcdFx0dmFyIGl0ZW1zID0gW1xyXG5cdFx0XHRcdFx0XHR7IHRleHQ6IGl0ZW0ubmFtZSwgZ3JvdzogdHJ1ZSB9XHJcblx0XHRcdFx0XHRdO1xyXG5cclxuXHRcdFx0XHRcdGlmKGl0ZW0udHlwZSAhPSBcInRhc2tcIikge1xyXG5cdFx0XHRcdFx0XHQvLyBzaG93IHRoZSBlbmQgdGltZSBmb3IgYW55IG5vbiAxMTo1OXBtIHRpbWVzXHJcblx0XHRcdFx0XHRcdGlmKGl0ZW0uZGF0ZS5nZXRIb3VycygpICE9IDIzIHx8IGl0ZW0uZGF0ZS5nZXRNaW51dGVzKCkgIT0gNTkpIHtcclxuXHRcdFx0XHRcdFx0XHRpdGVtcy5wdXNoKHN0cmluZ2lmeVRpbWUoaXRlbS5kYXRlKSk7XHJcblx0XHRcdFx0XHRcdH1cclxuXHJcblx0XHRcdFx0XHRcdC8vIHNob3cgdGhlIGNsYXNzXHJcblx0XHRcdFx0XHRcdGl0ZW1zLnB1c2goaXRlbS5jbGFzcyB8fCBpdGVtLmxvY2F0aW9uKTtcclxuXHRcdFx0XHRcdH1cclxuXHJcblx0XHRcdFx0XHRncm91cHNbZGF0ZVN0cl0ucHVzaCh7XG5cdFx0XHRcdFx0XHRocmVmOiBgL2l0ZW0vJHtpdGVtLmlkfWAsXG5cdFx0XHRcdFx0XHRpdGVtc1xyXG5cdFx0XHRcdFx0fSk7XHJcblx0XHRcdFx0fSk7XHJcblxyXG5cdFx0XHRcdC8vIGRpc3BsYXkgYWxsIGl0ZW1zXHJcblx0XHRcdFx0bGlmZUxpbmUubWFrZURvbSh7XHJcblx0XHRcdFx0XHRwYXJlbnQ6IGNvbnRlbnQsXHJcblx0XHRcdFx0XHR3aWRnZXQ6IFwibGlzdFwiLFxyXG5cdFx0XHRcdFx0aXRlbXM6IGdyb3Vwc1xyXG5cdFx0XHRcdH0pO1xyXG5cdFx0XHR9KVxyXG5cdFx0KTtcclxuXHR9XHJcbn0pO1xyXG4iLCIvKipcclxuICogU2hvdyBhIGxvZ2luIGJ1dHRvbiB0byB0aGUgdXNlclxyXG4gKi9cclxuXHJcbmxpZmVMaW5lLm5hdi5yZWdpc3Rlcih7XHJcblx0bWF0Y2hlcjogXCIvbG9naW5cIixcclxuXHJcblx0bWFrZSh7c2V0VGl0bGUsIGNvbnRlbnR9KSB7XHJcblx0XHQvLyBzZXQgdGhlIHBhZ2UgdGl0bGVcclxuXHRcdHNldFRpdGxlKFwiTG9naW5cIik7XHJcblxyXG5cdFx0Ly8gdGhlIHVzZXJzIGNyZWRlbnRpYWxzXHJcblx0XHR2YXIgYXV0aCA9IHt9O1xyXG5cclxuXHRcdC8vIGNyZWF0ZSB0aGUgbG9naW4gZm9ybVxyXG5cdFx0dmFyIHt1c2VybmFtZSwgcGFzc3dvcmQsIG1zZ30gPSBsaWZlTGluZS5tYWtlRG9tKHtcclxuXHRcdFx0cGFyZW50OiBjb250ZW50LFxyXG5cdFx0XHR0YWc6IFwiZm9ybVwiLFxyXG5cdFx0XHRjbGFzc2VzOiBcImNvbnRlbnQtcGFkZGVkXCIsXHJcblx0XHRcdGNoaWxkcmVuOiBbXHJcblx0XHRcdFx0e1xyXG5cdFx0XHRcdFx0Y2xhc3NlczogXCJlZGl0b3Itcm93XCIsXHJcblx0XHRcdFx0XHRjaGlsZHJlbjogW1xyXG5cdFx0XHRcdFx0XHR7XHJcblx0XHRcdFx0XHRcdFx0d2lkZ2V0OiBcImlucHV0XCIsXHJcblx0XHRcdFx0XHRcdFx0YmluZDogYXV0aCxcclxuXHRcdFx0XHRcdFx0XHRwcm9wOiBcInVzZXJuYW1lXCIsXHJcblx0XHRcdFx0XHRcdFx0cGxhY2Vob2xkZXI6IFwiVXNlcm5hbWVcIlxyXG5cdFx0XHRcdFx0XHR9XHJcblx0XHRcdFx0XHRdXHJcblx0XHRcdFx0fSxcclxuXHRcdFx0XHR7XHJcblx0XHRcdFx0XHRjbGFzc2VzOiBcImVkaXRvci1yb3dcIixcclxuXHRcdFx0XHRcdGNoaWxkcmVuOiBbXHJcblx0XHRcdFx0XHRcdHtcclxuXHRcdFx0XHRcdFx0XHR3aWRnZXQ6IFwiaW5wdXRcIixcclxuXHRcdFx0XHRcdFx0XHRiaW5kOiBhdXRoLFxyXG5cdFx0XHRcdFx0XHRcdHByb3A6IFwicGFzc3dvcmRcIixcclxuXHRcdFx0XHRcdFx0XHR0eXBlOiBcInBhc3N3b3JkXCIsXHJcblx0XHRcdFx0XHRcdFx0cGxhY2Vob2xkZXI6IFwiUGFzc3dvcmRcIlxyXG5cdFx0XHRcdFx0XHR9XHJcblx0XHRcdFx0XHRdXHJcblx0XHRcdFx0fSxcclxuXHRcdFx0XHR7XHJcblx0XHRcdFx0XHR0YWc6IFwiYnV0dG9uXCIsXHJcblx0XHRcdFx0XHR0ZXh0OiBcIkxvZ2luXCIsXHJcblx0XHRcdFx0XHRjbGFzc2VzOiBcImZhbmN5LWJ1dHRvblwiLFxyXG5cdFx0XHRcdFx0YXR0cnM6IHtcclxuXHRcdFx0XHRcdFx0dHlwZTogXCJzdWJtaXRcIlxyXG5cdFx0XHRcdFx0fVxyXG5cdFx0XHRcdH0sXHJcblx0XHRcdFx0e1xyXG5cdFx0XHRcdFx0Y2xhc3NlczogXCJlcnJvci1tc2dcIixcclxuXHRcdFx0XHRcdG5hbWU6IFwibXNnXCJcclxuXHRcdFx0XHR9XHJcblx0XHRcdF0sXHJcblx0XHRcdG9uOiB7XHJcblx0XHRcdFx0c3VibWl0OiBlID0+IHtcclxuXHRcdFx0XHRcdGUucHJldmVudERlZmF1bHQoKTtcclxuXHJcblx0XHRcdFx0XHQvLyBzZW5kIHRoZSBsb2dpbiByZXF1ZXN0XHJcblx0XHRcdFx0XHRmZXRjaChcIi9hcGkvYXV0aC9sb2dpblwiLCB7XHJcblx0XHRcdFx0XHRcdG1ldGhvZDogXCJQT1NUXCIsXHJcblx0XHRcdFx0XHRcdGNyZWRlbnRpYWxzOiBcImluY2x1ZGVcIixcclxuXHRcdFx0XHRcdFx0Ym9keTogSlNPTi5zdHJpbmdpZnkoYXV0aClcclxuXHRcdFx0XHRcdH0pXHJcblxyXG5cdFx0XHRcdFx0Ly8gcGFyc2UgdGhlIGpzb25cclxuXHRcdFx0XHRcdC50aGVuKHJlcyA9PiByZXMuanNvbigpKVxyXG5cclxuXHRcdFx0XHRcdC8vIHByb2Nlc3MgdGhlIHJlc3BvbnNlXHJcblx0XHRcdFx0XHQudGhlbihyZXMgPT4ge1xyXG5cdFx0XHRcdFx0XHQvLyBsb2dpbiBzdWNlZWRlZCBnbyBob21lXHJcblx0XHRcdFx0XHRcdGlmKHJlcy5zdGF0dXMgPT0gXCJzdWNjZXNzXCIpIHtcclxuXHRcdFx0XHRcdFx0XHRsaWZlTGluZS5uYXYubmF2aWdhdGUoXCIvXCIpO1xyXG5cclxuXHRcdFx0XHRcdFx0XHQvLyBzeW5jIG5vdyB0aGF0IHdlIGFyZSBsb2dnZWQgaW5cclxuXHRcdFx0XHRcdFx0XHRpZihsaWZlTGluZS5zeW5jKSB7XHJcblx0XHRcdFx0XHRcdFx0XHRsaWZlTGluZS5zeW5jKCk7XHJcblx0XHRcdFx0XHRcdFx0fVxyXG5cclxuXHRcdFx0XHRcdFx0XHRyZXR1cm47XHJcblx0XHRcdFx0XHRcdH1cclxuXHJcblx0XHRcdFx0XHRcdC8vIGxvZ2luIGZhaWxlZFxyXG5cdFx0XHRcdFx0XHRpZihyZXMuc3RhdHVzID09IFwiZmFpbFwiKSB7XHJcblx0XHRcdFx0XHRcdFx0ZXJyb3JNc2coXCJMb2dpbiBmYWlsZWRcIik7XHJcblx0XHRcdFx0XHRcdH1cclxuXHRcdFx0XHRcdH0pO1xyXG5cdFx0XHRcdH1cclxuXHRcdFx0fVxyXG5cdFx0fSk7XHJcblxyXG5cdFx0Ly8gZGlzcGxheSBhbiBlcnJvciBtZXNzYWdlXHJcblx0XHR2YXIgZXJyb3JNc2cgPSBmdW5jdGlvbih0ZXh0KSB7XHJcblx0XHRcdG1zZy5pbm5lclRleHQgPSB0ZXh0O1xyXG5cdFx0fTtcclxuXHR9XHJcbn0pO1xyXG5cclxuLy8gbG9nb3V0XHJcbmxpZmVMaW5lLmxvZ291dCA9IGZ1bmN0aW9uKCkge1xyXG5cdC8vIHNlbmQgdGhlIGxvZ291dCByZXF1ZXN0XHJcblx0ZmV0Y2goXCIvYXBpL2F1dGgvbG9nb3V0XCIsIHtcclxuXHRcdGNyZWRlbnRpYWxzOiBcImluY2x1ZGVcIlxyXG5cdH0pXHJcblxyXG5cdC8vIGdvIHRvIHRoZSBsb2dpbiBwYWdlXHJcblx0LnRoZW4oKCkgPT4gbGlmZUxpbmUubmF2Lm5hdmlnYXRlKFwiL2xvZ2luXCIpKTtcclxufTtcclxuIiwiLyoqXHJcbiAqIEEgbGlzdCBvZiB0aGluZ3MgdG9kb1xyXG4gKi9cclxuXHJcbnZhciB7ZGF5c0Zyb21Ob3csIGlzU2FtZURhdGUsIHN0cmluZ2lmeVRpbWUsIHN0cmluZ2lmeURhdGUsIGlzU29vbmVyRGF0ZX0gPSByZXF1aXJlKFwiLi4vdXRpbC9kYXRlXCIpO1xyXG52YXIge2Fzc2lnbm1lbnRzfSA9IHJlcXVpcmUoXCIuLi9kYXRhLXN0b3Jlc1wiKTtcclxuXHJcbmxpZmVMaW5lLm5hdi5yZWdpc3Rlcih7XHJcblx0bWF0Y2hlcjogXCIvXCIsXHJcblxyXG5cdG1ha2Uoe3NldFRpdGxlLCBjb250ZW50LCBkaXNwb3NhYmxlfSkge1xyXG5cdFx0c2V0VGl0bGUoXCJUb2RvXCIpO1xyXG5cclxuXHRcdC8vIGxvYWQgdGhlIGl0ZW1zXHJcblx0XHRkaXNwb3NhYmxlLmFkZChcclxuXHRcdFx0YXNzaWdubWVudHMucXVlcnkoe1xyXG5cdFx0XHRcdGRvbmU6IGZhbHNlLFxyXG5cdFx0XHRcdC8vIG1ha2Ugc3VyZSB0aGUgYXNzaWdubWVudCBpcyBpbiB0aGUgZnV0dXJlXHJcblx0XHRcdFx0ZGF0ZTogZGF0ZSA9PiB7XG5cdFx0XHRcdFx0dmFyIHRvZGF5ID0gbmV3IERhdGUoKTtcblxuXHRcdFx0XHRcdHJldHVybiAhZGF0ZSB8fFxuXHRcdFx0XHRcdFx0aXNTb29uZXJEYXRlKHRvZGF5LCBuZXcgRGF0ZShkYXRlKSkgfHxcblx0XHRcdFx0XHRcdGlzU2FtZURhdGUodG9kYXksIG5ldyBEYXRlKGRhdGUpKTtcblx0XHRcdFx0fVxyXG5cdFx0XHR9LCBmdW5jdGlvbihkYXRhKSB7XHJcblx0XHRcdFx0Ly8gY2xlYXIgdGhlIG9sZCBjb250ZW50XHJcblx0XHRcdFx0Y29udGVudC5pbm5lckhUTUwgPSBcIlwiO1xyXG5cclxuXHRcdFx0XHR2YXIgZ3JvdXBzID0ge1xyXG5cdFx0XHRcdFx0VGFza3M6IFtdLFxyXG5cdFx0XHRcdFx0VG9kYXk6IFtdLFxyXG5cdFx0XHRcdFx0VG9tb3Jyb3c6IFtdXHJcblx0XHRcdFx0fTtcclxuXHJcblx0XHRcdFx0dmFyIHVwY29tbWluZyA9IFtdO1xyXG5cclxuXHRcdFx0XHQvLyB0b2RheSBhbmQgdG9tb3Jyb3dzIGRhdGVzXHJcblx0XHRcdFx0dmFyIHRvZGF5ID0gbmV3IERhdGUoKTtcclxuXHRcdFx0XHR2YXIgdG9tb3Jyb3cgPSBkYXlzRnJvbU5vdygxKTtcclxuXHJcblx0XHRcdFx0Ly8gc29ydCBieSBkYXRlXHJcblx0XHRcdFx0ZGF0YS5zb3J0KChhLCBiKSA9PiB7XHJcblx0XHRcdFx0XHRpZihhLnR5cGUgIT0gXCJ0YXNrXCIgJiYgYi50eXBlICE9IFwidGFza1wiKSB7XHJcblx0XHRcdFx0XHRcdHJldHVybiBhLmRhdGUuZ2V0VGltZSgpIC0gYi5kYXRlLmdldFRpbWUoKTtcclxuXHRcdFx0XHRcdH1cclxuXHRcdFx0XHR9KTtcclxuXHJcblx0XHRcdFx0Ly8gc2VsZWN0IHRoZSBpdGVtcyB0byBkaXNwbGF5XHJcblx0XHRcdFx0ZGF0YS5mb3JFYWNoKGl0ZW0gPT4ge1xyXG5cdFx0XHRcdFx0Ly8gYXNzaWdubWVudHMgZm9yIHRvZGF5XHJcblx0XHRcdFx0XHRpZihpdGVtLnR5cGUgIT0gXCJ0YXNrXCIpIHtcclxuXHRcdFx0XHRcdFx0Ly8gdG9kYXlcclxuXHRcdFx0XHRcdFx0aWYoaXNTYW1lRGF0ZSh0b2RheSwgaXRlbS5kYXRlKSkge1xyXG5cdFx0XHRcdFx0XHRcdGdyb3Vwcy5Ub2RheS5wdXNoKGNyZWF0ZVVpKGl0ZW0pKTtcclxuXHRcdFx0XHRcdFx0fVxyXG5cdFx0XHRcdFx0XHQvLyB0b21vcnJvd1xyXG5cdFx0XHRcdFx0XHRlbHNlIGlmKGlzU2FtZURhdGUodG9tb3Jyb3csIGl0ZW0uZGF0ZSkpIHtcclxuXHRcdFx0XHRcdFx0XHRncm91cHMuVG9tb3Jyb3cucHVzaChjcmVhdGVVaShpdGVtKSk7XHJcblx0XHRcdFx0XHRcdH1cclxuXHRcdFx0XHRcdFx0Ly8gYWRkIHVwY29tbWluZyBpdGVtc1xyXG5cdFx0XHRcdFx0XHRlbHNlIGlmKHVwY29tbWluZy5sZW5ndGggPCAxMCkge1xyXG5cdFx0XHRcdFx0XHRcdHVwY29tbWluZy5wdXNoKFtcclxuXHRcdFx0XHRcdFx0XHRcdGl0ZW0sXHJcblx0XHRcdFx0XHRcdFx0XHRjcmVhdGVVaShpdGVtKVxyXG5cdFx0XHRcdFx0XHRcdF0pO1xyXG5cdFx0XHRcdFx0XHR9XHJcblx0XHRcdFx0XHR9XHJcblxyXG5cdFx0XHRcdFx0Ly8gc2hvdyBhbnkgdGFza3NcclxuXHRcdFx0XHRcdGlmKGl0ZW0udHlwZSA9PSBcInRhc2tcIikge1xyXG5cdFx0XHRcdFx0XHRncm91cHMuVGFza3MucHVzaChjcmVhdGVVaShpdGVtKSk7XHJcblx0XHRcdFx0XHR9XHJcblx0XHRcdFx0fSk7XHJcblxyXG5cdFx0XHRcdC8vIGRvbid0IGhhdmUgdG9vIG1hbnkgaXRlbXMgaW4gdGhlIHRvZG8gcGFnZVxyXG5cdFx0XHRcdHZhciB0b1JlbW92ZSA9IGdyb3Vwcy5Ub2RheS5sZW5ndGggKyBncm91cHMuVG9tb3Jyb3cubGVuZ3RoICsgZ3JvdXBzLlRhc2tzLmxlbmd0aDtcclxuXHJcblx0XHRcdFx0dXBjb21taW5nID0gdXBjb21taW5nLnNsaWNlKDAsIE1hdGgubWF4KDAsIDEwIC0gdG9SZW1vdmUpKTtcclxuXHJcblx0XHRcdFx0Ly8gYWRkIGdyb3VwcyBmb3IgZWFjaCBvZiB0aGUgdXBjb21pbmdcclxuXHRcdFx0XHRmb3IobGV0IGRheSBvZiB1cGNvbW1pbmcpIHtcclxuXHRcdFx0XHRcdGxldCBzdHJEYXRlID0gc3RyaW5naWZ5RGF0ZShkYXlbMF0uZGF0ZSk7XHJcblxyXG5cdFx0XHRcdFx0Z3JvdXBzW3N0ckRhdGVdIHx8IChncm91cHNbc3RyRGF0ZV0gPSBbXSk7XHJcblxyXG5cdFx0XHRcdFx0Z3JvdXBzW3N0ckRhdGVdLnB1c2goZGF5WzFdKTtcclxuXHRcdFx0XHR9XHJcblxyXG5cdFx0XHRcdC8vIHJlbW92ZSBhbnkgZW1wdHkgZmllbGRzXHJcblx0XHRcdFx0T2JqZWN0LmdldE93blByb3BlcnR5TmFtZXMoZ3JvdXBzKVxyXG5cclxuXHRcdFx0XHQuZm9yRWFjaChuYW1lID0+IHtcclxuXHRcdFx0XHRcdC8vIHJlbW92ZSBlbXB0eSBncm91cHNcclxuXHRcdFx0XHRcdGlmKGdyb3Vwc1tuYW1lXS5sZW5ndGggPT09IDApIHtcclxuXHRcdFx0XHRcdFx0ZGVsZXRlIGdyb3Vwc1tuYW1lXTtcclxuXHRcdFx0XHRcdH1cclxuXHRcdFx0XHR9KTtcclxuXHJcblx0XHRcdFx0Ly8gcmVuZGVyIHRoZSBsaXN0XHJcblx0XHRcdFx0bGlmZUxpbmUubWFrZURvbSh7XHJcblx0XHRcdFx0XHRwYXJlbnQ6IGNvbnRlbnQsXHJcblx0XHRcdFx0XHR3aWRnZXQ6IFwibGlzdFwiLFxyXG5cdFx0XHRcdFx0aXRlbXM6IGdyb3Vwc1xyXG5cdFx0XHRcdH0pO1xyXG5cdFx0XHR9KVxyXG5cdFx0KTtcclxuXHR9XHJcbn0pO1xyXG5cclxuLy8gY3JlYXRlIGEgbGlzdCBpdGVtXHJcbnZhciBjcmVhdGVVaSA9IGZ1bmN0aW9uKGl0ZW0pIHtcclxuXHQvLyByZW5kZXIgYSB0YXNrXHJcblx0aWYoaXRlbS50eXBlID09IFwidGFza1wiKSB7XHJcblx0XHRyZXR1cm4ge1xyXG5cdFx0XHRocmVmOiBgL2l0ZW0vJHtpdGVtLmlkfWAsXHJcblx0XHRcdGl0ZW1zOiBbXHJcblx0XHRcdFx0e1xyXG5cdFx0XHRcdFx0dGV4dDogaXRlbS5uYW1lLFxyXG5cdFx0XHRcdFx0Z3JvdzogdHJ1ZVxyXG5cdFx0XHRcdH1cclxuXHRcdFx0XVxyXG5cdFx0fTtcclxuXHR9XHJcblx0Ly8gcmVuZGVyIGFuIGFzc2lnbm1lbnQgb3IgZXhhbVxyXG5cdGVsc2Uge1xyXG5cdFx0cmV0dXJuIHtcclxuXHRcdFx0aHJlZjogYC9pdGVtLyR7aXRlbS5pZH1gLFxyXG5cdFx0XHRpdGVtczogW1xyXG5cdFx0XHRcdHtcclxuXHRcdFx0XHRcdHRleHQ6IGl0ZW0udHlwZSA9PSBcImFzc2lnbm1lbnRcIiA/ICBpdGVtLm5hbWUgOiBgJHtpdGVtLm5hbWV9IC0gJHtpdGVtLmNsYXNzfWAsXHJcblx0XHRcdFx0XHRncm93OiB0cnVlXHJcblx0XHRcdFx0fSxcclxuXHRcdFx0XHRzdHJpbmdpZnlUaW1lKGl0ZW0uZGF0ZSksXHJcblx0XHRcdFx0aXRlbS50eXBlID09IFwiYXNzaWdubWVudFwiID8gaXRlbS5jbGFzcyA6IGl0ZW0ubG9jYXRpb25cclxuXHRcdFx0XVxyXG5cdFx0fTtcclxuXHR9XHJcbn07XHJcbiIsIi8qKlxyXG4gKiBBIHBhZ2Ugd2l0aCBsaW5rcyB0byBhbGwgdXNlcnNcclxuICovXHJcblxyXG5saWZlTGluZS5uYXYucmVnaXN0ZXIoe1xyXG5cdG1hdGNoZXI6IFwiL3VzZXJzXCIsXHJcblxyXG5cdG1ha2Uoe3NldFRpdGxlLCBjb250ZW50fSkge1xyXG5cdFx0c2V0VGl0bGUoXCJBbGwgdXNlcnNcIik7XHJcblxyXG5cdFx0Ly8gbG9hZCB0aGUgbGlzdCBvZiB1c2Vyc1xyXG5cdFx0ZmV0Y2goXCIvYXBpL2F1dGgvaW5mby91c2Vyc1wiLCB7XHJcblx0XHRcdGNyZWRlbnRpYWxzOiBcImluY2x1ZGVcIlxyXG5cdFx0fSlcclxuXHJcblx0XHQudGhlbihyZXMgPT4gcmVzLmpzb24oKSlcclxuXHJcblx0XHQudGhlbigoe3N0YXR1cywgZGF0YTogdXNlcnN9KSA9PiB7XHJcblx0XHRcdC8vIG5vdCBhdXRoZW50aWNhdGVkXHJcblx0XHRcdGlmKHN0YXR1cyA9PSBcImZhaWxcIikge1xyXG5cdFx0XHRcdGxpZmVMaW5lLm1ha2VEb20oe1xyXG5cdFx0XHRcdFx0cGFyZW50OiBjb250ZW50LFxyXG5cdFx0XHRcdFx0Y2xhc3NlczogXCJjb250ZW50LXBhZGRlZFwiLFxyXG5cdFx0XHRcdFx0dGV4dDogXCJZb3UgZG8gbm90IGhhdmUgYWNjZXNzIHRvIHRoZSB1c2VyIGxpc3RcIlxyXG5cdFx0XHRcdH0pO1xyXG5cclxuXHRcdFx0XHRyZXR1cm47XHJcblx0XHRcdH1cclxuXHJcblx0XHRcdC8vIHNvcnQgYnkgYWRtaW4gc3RhdHVzXHJcblx0XHRcdHVzZXJzLnNvcnQoKGEsIGIpID0+IHtcclxuXHRcdFx0XHQvLyBzb3J0IGFkbWluc1xyXG5cdFx0XHRcdGlmKGEuYWRtaW4gJiYgIWIuYWRtaW4pIHJldHVybiAtMTtcclxuXHRcdFx0XHRpZighYS5hZG1pbiAmJiBiLmFkbWluKSByZXR1cm4gMTtcclxuXHJcblx0XHRcdFx0Ly8gc29ydCBieSB1c2VybmFtZVxyXG5cdFx0XHRcdGlmKGEudXNlcm5hbWUgPCBiLnVzZXJuYW1lKSByZXR1cm4gLTE7XHJcblx0XHRcdFx0aWYoYS51c2VybmFtZSA+IGIudXNlcm5hbWUpIHJldHVybiAxO1xyXG5cclxuXHRcdFx0XHRyZXR1cm4gMDtcclxuXHRcdFx0fSk7XHJcblxyXG5cdFx0XHR2YXIgZGlzcGxheVVzZXJzID0ge1xyXG5cdFx0XHRcdEFkbWluczogW10sXHJcblx0XHRcdFx0VXNlcnM6IFtdXHJcblx0XHRcdH07XHJcblxyXG5cdFx0XHQvLyBnZW5lcmF0ZSB0aGUgdXNlciBsaXN0XHJcblx0XHRcdHVzZXJzLmZvckVhY2godXNlciA9PiB7XHJcblx0XHRcdFx0Ly8gc29ydCB0aGUgdXNlcnMgaW50byBhZG1pbnMgYW5kIHVzZXJzXHJcblx0XHRcdFx0ZGlzcGxheVVzZXJzW3VzZXIuYWRtaW4gPyBcIkFkbWluc1wiIDogXCJVc2Vyc1wiXVxyXG5cclxuXHRcdFx0XHQucHVzaCh7XHJcblx0XHRcdFx0XHRocmVmOiBgL3VzZXIvJHt1c2VyLnVzZXJuYW1lfWAsXHJcblx0XHRcdFx0XHRpdGVtczogW3tcclxuXHRcdFx0XHRcdFx0dGV4dDogdXNlci51c2VybmFtZSxcclxuXHRcdFx0XHRcdFx0Z3JvdzogdHJ1ZVxyXG5cdFx0XHRcdFx0fV1cclxuXHRcdFx0XHR9KTtcclxuXHRcdFx0fSk7XHJcblxyXG5cdFx0XHQvLyBkaXNwbGF5IHRoZSB1c2VyIGxpc3RcclxuXHRcdFx0bGlmZUxpbmUubWFrZURvbSh7XHJcblx0XHRcdFx0cGFyZW50OiBjb250ZW50LFxyXG5cdFx0XHRcdHdpZGdldDogXCJsaXN0XCIsXHJcblx0XHRcdFx0aXRlbXM6IGRpc3BsYXlVc2Vyc1xyXG5cdFx0XHR9KTtcclxuXHRcdH0pXHJcblxyXG5cdFx0Ly8gc29tZXRoaW5nIHdlbnQgd3Jvbmcgc2hvdyBhbiBlcnJvciBtZXNzYWdlXHJcblx0XHQuY2F0Y2goZXJyID0+IHtcclxuXHRcdFx0bGlmZUxpbmUubWFrZURvbSh7XHJcblx0XHRcdFx0Y2xhc3NlczogXCJjb250ZW50LXBhZGRlZFwiLFxyXG5cdFx0XHRcdHRleHQ6IGVyci5tZXNzYWdlXHJcblx0XHRcdH0pO1xyXG5cdFx0fSk7XHJcblx0fVxyXG59KTtcclxuIiwiLyoqXHJcbiAqIFRoZSBtYWluIGNvbnRlbnQgcGFuZSBmb3IgdGhlIGFwcFxyXG4gKi9cclxuXHJcbmxpZmVMaW5lLm1ha2VEb20ucmVnaXN0ZXIoXCJjb250ZW50XCIsIHtcclxuXHRtYWtlKCkge1xyXG5cdFx0cmV0dXJuIFtcclxuXHRcdFx0e1xyXG5cdFx0XHRcdGNsYXNzZXM6IFwidG9vbGJhclwiLFxyXG5cdFx0XHRcdGNoaWxkcmVuOiBbXHJcblx0XHRcdFx0XHR7XHJcblx0XHRcdFx0XHRcdHRhZzogXCJzdmdcIixcclxuXHRcdFx0XHRcdFx0Y2xhc3NlczogXCJtZW51LWljb25cIixcclxuXHRcdFx0XHRcdFx0YXR0cnM6IHtcclxuXHRcdFx0XHRcdFx0XHR2aWV3Qm94OiBcIjAgMCA2MCA1MFwiLFxyXG5cdFx0XHRcdFx0XHRcdHdpZHRoOiBcIjIwXCIsXHJcblx0XHRcdFx0XHRcdFx0aGVpZ2h0OiBcIjE1XCJcclxuXHRcdFx0XHRcdFx0fSxcclxuXHRcdFx0XHRcdFx0Y2hpbGRyZW46IFtcclxuXHRcdFx0XHRcdFx0XHR7IHRhZzogXCJsaW5lXCIsIGF0dHJzOiB7IHgxOiBcIjBcIiwgeTE6IFwiNVwiLCB4MjogXCI2MFwiLCB5MjogXCI1XCIgfSB9LFxyXG5cdFx0XHRcdFx0XHRcdHsgdGFnOiBcImxpbmVcIiwgYXR0cnM6IHsgeDE6IFwiMFwiLCB5MTogXCIyNVwiLCB4MjogXCI2MFwiLCB5MjogXCIyNVwiIH0gfSxcclxuXHRcdFx0XHRcdFx0XHR7IHRhZzogXCJsaW5lXCIsIGF0dHJzOiB7IHgxOiBcIjBcIiwgeTE6IFwiNDVcIiwgeDI6IFwiNjBcIiwgeTI6IFwiNDVcIiB9IH1cclxuXHRcdFx0XHRcdFx0XSxcclxuXHRcdFx0XHRcdFx0b246IHtcclxuXHRcdFx0XHRcdFx0XHRjbGljazogKCkgPT4gZG9jdW1lbnQuYm9keS5jbGFzc0xpc3QudG9nZ2xlKFwic2lkZWJhci1vcGVuXCIpXHJcblx0XHRcdFx0XHRcdH1cclxuXHRcdFx0XHRcdH0sXHJcblx0XHRcdFx0XHR7XHJcblx0XHRcdFx0XHRcdGNsYXNzZXM6IFwidG9vbGJhci10aXRsZVwiLFxyXG5cdFx0XHRcdFx0XHRuYW1lOiBcInRpdGxlXCJcclxuXHRcdFx0XHRcdH0sXHJcblx0XHRcdFx0XHR7XHJcblx0XHRcdFx0XHRcdGNsYXNzZXM6IFwidG9vbGJhci1idXR0b25zXCIsXHJcblx0XHRcdFx0XHRcdG5hbWU6IFwiYnRuc1wiXHJcblx0XHRcdFx0XHR9XHJcblx0XHRcdFx0XVxyXG5cdFx0XHR9LFxyXG5cdFx0XHR7XHJcblx0XHRcdFx0Y2xhc3NlczogXCJjb250ZW50XCIsXHJcblx0XHRcdFx0bmFtZTogXCJjb250ZW50XCJcclxuXHRcdFx0fVxyXG5cdFx0XTtcclxuXHR9LFxyXG5cclxuXHRiaW5kKG9wdHMsIHt0aXRsZSwgYnRucywgY29udGVudH0pIHtcclxuXHRcdHZhciBkaXNwb3NhYmxlO1xyXG5cclxuXHRcdC8vIHNldCB0aGUgcGFnZSB0aXRsZVxyXG5cdFx0dmFyIHNldFRpdGxlID0gZnVuY3Rpb24odGl0bGVUZXh0KSB7XHJcblx0XHRcdHRpdGxlLmlubmVyVGV4dCA9IHRpdGxlVGV4dDtcclxuXHRcdFx0ZG9jdW1lbnQudGl0bGUgPSB0aXRsZVRleHQ7XHJcblx0XHR9O1xyXG5cclxuXHRcdC8vIGFkZCBhbiBhY3Rpb24gYnV0dG9uXHJcblx0XHRsaWZlTGluZS5vbihcImFjdGlvbi1jcmVhdGVcIiwgbmFtZSA9PiB7XHJcblx0XHRcdGxpZmVMaW5lLm1ha2VEb20oe1xyXG5cdFx0XHRcdHBhcmVudDogYnRucyxcclxuXHRcdFx0XHR0YWc6IFwiYnV0dG9uXCIsXHJcblx0XHRcdFx0Y2xhc3NlczogXCJ0b29sYmFyLWJ1dHRvblwiLFxyXG5cdFx0XHRcdHRleHQ6IG5hbWUsXHJcblx0XHRcdFx0YXR0cnM6IHtcclxuXHRcdFx0XHRcdFwiZGF0YS1uYW1lXCI6IG5hbWVcclxuXHRcdFx0XHR9LFxyXG5cdFx0XHRcdG9uOiB7XHJcblx0XHRcdFx0XHRjbGljazogKCkgPT4gbGlmZUxpbmUuZW1pdChcImFjdGlvbi1leGVjLVwiICsgbmFtZSlcclxuXHRcdFx0XHR9XHJcblx0XHRcdH0pO1xyXG5cdFx0fSk7XHJcblxyXG5cdFx0Ly8gcmVtb3ZlIGFuIGFjdGlvbiBidXR0b25cclxuXHRcdGxpZmVMaW5lLm9uKFwiYWN0aW9uLXJlbW92ZVwiLCBuYW1lID0+IHtcclxuXHRcdFx0dmFyIGJ0biA9IGJ0bnMucXVlcnlTZWxlY3RvcihgW2RhdGEtbmFtZT1cIiR7bmFtZX1cIl1gKTtcclxuXHJcblx0XHRcdGlmKGJ0bikgYnRuLnJlbW92ZSgpO1xyXG5cdFx0fSk7XHJcblxyXG5cdFx0Ly8gcmVtb3ZlIGFsbCB0aGUgYWN0aW9uIGJ1dHRvbnNcclxuXHRcdGxpZmVMaW5lLm9uKFwiYWN0aW9uLXJlbW92ZS1hbGxcIiwgKCkgPT4gYnRucy5pbm5lckhUTUwgPSBcIlwiKTtcclxuXHJcblx0XHQvLyBkaXNwbGF5IHRoZSBjb250ZW50IGZvciB0aGUgdmlld1xyXG5cdFx0dmFyIHVwZGF0ZVZpZXcgPSAoKSA9PiB7XHJcblx0XHRcdC8vIGRlc3Ryb3kgYW55IGxpc3RlbmVycyBmcm9tIG9sZCBjb250ZW50XHJcblx0XHRcdGlmKGRpc3Bvc2FibGUpIHtcclxuXHRcdFx0XHRkaXNwb3NhYmxlLmRpc3Bvc2UoKTtcclxuXHRcdFx0fVxyXG5cclxuXHRcdFx0Ly8gcmVtb3ZlIGFueSBhY3Rpb24gYnV0dG9uc1xyXG5cdFx0XHRsaWZlTGluZS5lbWl0KFwiYWN0aW9uLXJlbW92ZS1hbGxcIik7XHJcblxyXG5cdFx0XHQvLyBjbGVhciBhbGwgdGhlIG9sZCBjb250ZW50XHJcblx0XHRcdGNvbnRlbnQuaW5uZXJIVE1MID0gXCJcIjtcclxuXHJcblx0XHRcdC8vIGNyZWF0ZSB0aGUgZGlzcG9zYWJsZSBmb3IgdGhlIGNvbnRlbnRcclxuXHRcdFx0ZGlzcG9zYWJsZSA9IG5ldyBsaWZlTGluZS5EaXNwb3NhYmxlKCk7XHJcblxyXG5cdFx0XHR2YXIgbWFrZXIgPSBub3RGb3VuZE1ha2VyLCBtYXRjaDtcclxuXHJcblx0XHRcdC8vIGZpbmQgdGhlIGNvcnJlY3QgY29udGVudCBtYWtlclxyXG5cdFx0XHRmb3IobGV0ICRtYWtlciBvZiBjb250ZW50TWFrZXJzKSB7XHJcblx0XHRcdFx0Ly8gcnVuIGEgbWF0Y2hlciBmdW5jdGlvblxyXG5cdFx0XHRcdGlmKHR5cGVvZiAkbWFrZXIubWF0Y2hlciA9PSBcImZ1bmN0aW9uXCIpIHtcclxuXHRcdFx0XHRcdG1hdGNoID0gJG1ha2VyLm1hdGNoZXIobG9jYXRpb24ucGF0aG5hbWUpO1xyXG5cdFx0XHRcdH1cclxuXHRcdFx0XHQvLyBhIHN0cmluZyBtYXRjaFxyXG5cdFx0XHRcdGVsc2UgaWYodHlwZW9mICRtYWtlci5tYXRjaGVyID09IFwic3RyaW5nXCIpIHtcclxuXHRcdFx0XHRcdGlmKCRtYWtlci5tYXRjaGVyID09IGxvY2F0aW9uLnBhdGhuYW1lKSB7XHJcblx0XHRcdFx0XHRcdG1hdGNoID0gJG1ha2VyLm1hdGNoZXI7XHJcblx0XHRcdFx0XHR9XHJcblx0XHRcdFx0fVxyXG5cdFx0XHRcdC8vIGEgcmVnZXggbWF0Y2hcclxuXHRcdFx0XHRlbHNlIHtcclxuXHRcdFx0XHRcdG1hdGNoID0gJG1ha2VyLm1hdGNoZXIuZXhlYyhsb2NhdGlvbi5wYXRobmFtZSk7XHJcblx0XHRcdFx0fVxyXG5cclxuXHRcdFx0XHQvLyBtYXRjaCBmb3VuZCBzdG9wIHNlYXJjaGluZ1xyXG5cdFx0XHRcdGlmKG1hdGNoKSB7XHJcblx0XHRcdFx0XHRtYWtlciA9ICRtYWtlcjtcclxuXHJcblx0XHRcdFx0XHRicmVhaztcclxuXHRcdFx0XHR9XHJcblx0XHRcdH1cclxuXHJcblx0XHRcdC8vIG1ha2UgdGhlIGNvbnRlbnQgZm9yIHRoaXMgcm91dGVcclxuXHRcdFx0bWFrZXIubWFrZSh7ZGlzcG9zYWJsZSwgc2V0VGl0bGUsIGNvbnRlbnQsIG1hdGNofSk7XHJcblx0XHR9O1xyXG5cclxuXHRcdC8vIHN3aXRjaCBwYWdlc1xyXG5cdFx0bGlmZUxpbmUubmF2Lm5hdmlnYXRlID0gZnVuY3Rpb24odXJsKSB7XHJcblx0XHRcdC8vIHVwZGF0ZSB0aGUgdXJsXHJcblx0XHRcdGhpc3RvcnkucHVzaFN0YXRlKG51bGwsIG51bGwsIHVybCk7XHJcblxyXG5cdFx0XHQvLyBzaG93IHRoZSBuZXcgdmlld1xyXG5cdFx0XHR1cGRhdGVWaWV3KCk7XHJcblx0XHR9O1xyXG5cclxuXHRcdC8vIHN3aXRjaCBwYWdlcyB3aGVuIHRoZSB1c2VyIHB1c2hlcyB0aGUgYmFjayBidXR0b25cclxuXHRcdHdpbmRvdy5hZGRFdmVudExpc3RlbmVyKFwicG9wc3RhdGVcIiwgKCkgPT4gdXBkYXRlVmlldygpKTtcclxuXHJcblx0XHQvLyBzaG93IHRoZSBpbml0aWFsIHZpZXdcclxuXHRcdHVwZGF0ZVZpZXcoKTtcclxuXHR9XHJcbn0pO1xyXG5cclxuLy8gYWxsIGNvbnRlbnQgcHJvZHVjZXJzXHJcbnZhciBjb250ZW50TWFrZXJzID0gW107XHJcblxyXG4vLyBjcmVhdGUgdGhlIG5hbWVzcGFjZVxyXG5saWZlTGluZS5uYXYgPSB7fTtcclxuXHJcbi8vIHJlZ2lzdGVyIGEgY29udGVudCBtYWtlclxyXG5saWZlTGluZS5uYXYucmVnaXN0ZXIgPSBmdW5jdGlvbihtYWtlcikge1xyXG5cdGNvbnRlbnRNYWtlcnMucHVzaChtYWtlcik7XHJcbn07XHJcblxyXG4vLyB0aGUgZmFsbCBiYWNrIG1ha2VyIGZvciBubyBzdWNoIHBhZ2VcclxudmFyIG5vdEZvdW5kTWFrZXIgPSB7XHJcblx0bWFrZSh7c2V0VGl0bGUsIGNvbnRlbnR9KSB7XHJcblx0XHQvLyB1cGRhdGUgdGhlIHBhZ2UgdGl0bGVcclxuXHRcdHNldFRpdGxlKFwiTm90IGZvdW5kXCIpO1xyXG5cclxuXHRcdGxpZmVMaW5lLm1ha2VEb20oe1xyXG5cdFx0XHRwYXJlbnQ6IGNvbnRlbnQsXHJcblx0XHRcdGNsYXNzZXM6IFwiY29udGVudC1wYWRkZWRcIixcclxuXHRcdFx0Y2hpbGRyZW46IFtcclxuXHRcdFx0XHR7XHJcblx0XHRcdFx0XHR0YWc6IFwic3BhblwiLFxyXG5cdFx0XHRcdFx0dGV4dDogXCJUaGUgcGFnZSB5b3UgYXJlIGxvb2tpbmcgZm9yIGNvdWxkIG5vdCBiZSBmb3VuZC4gXCJcclxuXHRcdFx0XHR9LFxyXG5cdFx0XHRcdHtcclxuXHRcdFx0XHRcdHdpZGdldDogXCJsaW5rXCIsXHJcblx0XHRcdFx0XHRocmVmOiBcIi9cIixcclxuXHRcdFx0XHRcdHRleHQ6IFwiR28gaG9tZVwiXHJcblx0XHRcdFx0fVxyXG5cdFx0XHRdXHJcblx0XHR9KTtcclxuXHR9XHJcbn07XHJcbiIsIi8qKlxyXG4gKiBDcmVhdGUgYW4gaW5wdXQgZmllbGRcclxuICovXHJcblxyXG5saWZlTGluZS5tYWtlRG9tLnJlZ2lzdGVyKFwiaW5wdXRcIiwge1xyXG5cdG1ha2Uoe3RhZywgdHlwZSwgdmFsdWUsIGNoYW5nZSwgYmluZCwgcHJvcCwgcGxhY2Vob2xkZXIsIGNsYXNzZXN9KSB7XHJcblx0XHQvLyBzZXQgdGhlIGluaXRpYWwgdmFsdWUgb2YgdGhlIGJvdW5kIG9iamVjdFxyXG5cdFx0aWYodHlwZW9mIGJpbmQgPT0gXCJvYmplY3RcIiAmJiAhdmFsdWUpIHtcclxuXHRcdFx0dmFsdWUgPSBiaW5kW3Byb3BdO1xyXG5cdFx0fVxyXG5cclxuXHRcdHZhciBpbnB1dCA9IHtcclxuXHRcdFx0dGFnOiB0YWcgfHwgXCJpbnB1dFwiLFxyXG5cdFx0XHRjbGFzc2VzOiBjbGFzc2VzIHx8IGAke3RhZyA9PSBcInRleHRhcmVhXCIgPyBcInRleHRhcmVhXCIgOiBcImlucHV0XCJ9LWZpbGxgLFxyXG5cdFx0XHRhdHRyczoge30sXHJcblx0XHRcdG9uOiB7XHJcblx0XHRcdFx0aW5wdXQ6IGUgPT4ge1xyXG5cdFx0XHRcdFx0Ly8gdXBkYXRlIHRoZSBwcm9wZXJ0eSBjaGFuZ2VkXHJcblx0XHRcdFx0XHRpZih0eXBlb2YgYmluZCA9PSBcIm9iamVjdFwiKSB7XHJcblx0XHRcdFx0XHRcdGJpbmRbcHJvcF0gPSBlLnRhcmdldC52YWx1ZTtcclxuXHRcdFx0XHRcdH1cclxuXHJcblx0XHRcdFx0XHQvLyBjYWxsIHRoZSBjYWxsYmFja1xyXG5cdFx0XHRcdFx0aWYodHlwZW9mIGNoYW5nZSA9PSBcImZ1bmN0aW9uXCIpIHtcclxuXHRcdFx0XHRcdFx0Y2hhbmdlKGUudGFyZ2V0LnZhbHVlKTtcclxuXHRcdFx0XHRcdH1cclxuXHRcdFx0XHR9XHJcblx0XHRcdH1cclxuXHRcdH07XHJcblxyXG5cdFx0Ly8gYXR0YWNoIHZhbHVlcyBpZiB0aGV5IGFyZSBnaXZlblxyXG5cdFx0aWYodHlwZSkgaW5wdXQuYXR0cnMudHlwZSA9IHR5cGU7XHJcblx0XHRpZih2YWx1ZSkgaW5wdXQuYXR0cnMudmFsdWUgPSB2YWx1ZTtcclxuXHRcdGlmKHBsYWNlaG9sZGVyKSBpbnB1dC5hdHRycy5wbGFjZWhvbGRlciA9IHBsYWNlaG9sZGVyO1xyXG5cclxuXHRcdC8vIGZvciB0ZXh0YXJlYXMgc2V0IGlubmVyVGV4dFxyXG5cdFx0aWYodGFnID09IFwidGV4dGFyZWFcIikge1xyXG5cdFx0XHRpbnB1dC50ZXh0ID0gdmFsdWU7XHJcblx0XHR9XHJcblxyXG5cdFx0cmV0dXJuIGlucHV0O1xyXG5cdH1cclxufSk7XHJcbiIsIi8qKlxyXG4gKiBBIHdpZGdldCB0aGF0IGNyZWF0ZXMgYSBsaW5rIHRoYXQgaG9va3MgaW50byB0aGUgbmF2aWdhdG9yXHJcbiAqL1xyXG5cclxubGlmZUxpbmUubWFrZURvbS5yZWdpc3RlcihcImxpbmtcIiwge1xyXG5cdG1ha2Uob3B0cykge1xyXG5cdFx0cmV0dXJuIHtcclxuXHRcdFx0dGFnOiBcImFcIixcclxuXHRcdFx0YXR0cnM6IHtcclxuXHRcdFx0XHRocmVmOiBvcHRzLmhyZWZcclxuXHRcdFx0fSxcclxuXHRcdFx0b246IHtcclxuXHRcdFx0XHRjbGljazogZSA9PiB7XHJcblx0XHRcdFx0XHQvLyBkb24ndCBvdmVyIHJpZGUgY3RybCBvciBhbHQgb3Igc2hpZnQgY2xpY2tzXHJcblx0XHRcdFx0XHRpZihlLmN0cmxLZXkgfHwgZS5hbHRLZXkgfHwgZS5zaGlmdEtleSkgcmV0dXJuO1xyXG5cclxuXHRcdFx0XHRcdC8vIGRvbid0IG5hdmlnYXRlIHRoZSBwYWdlXHJcblx0XHRcdFx0XHRlLnByZXZlbnREZWZhdWx0KCk7XHJcblxyXG5cdFx0XHRcdFx0bGlmZUxpbmUubmF2Lm5hdmlnYXRlKG9wdHMuaHJlZilcclxuXHRcdFx0XHR9XHJcblx0XHRcdH0sXHJcblx0XHRcdHRleHQ6IG9wdHMudGV4dFxyXG5cdFx0fTtcclxuXHR9XHJcbn0pO1xyXG4iLCIvKipcclxuICogRGlzcGxheSBhIGxpc3Qgd2l0aCBncm91cCBoZWFkaW5nc1xyXG4gKi9cclxuXHJcbmxpZmVMaW5lLm1ha2VEb20ucmVnaXN0ZXIoXCJsaXN0XCIsIHtcclxuXHRtYWtlKHtpdGVtc30pIHtcclxuXHRcdC8vIGFkZCBhbGwgdGhlIGdyb3Vwc1xyXG5cdFx0cmV0dXJuIE9iamVjdC5nZXRPd25Qcm9wZXJ0eU5hbWVzKGl0ZW1zKVxyXG5cclxuXHRcdC5tYXAoZ3JvdXBOYW1lID0+IG1ha2VHcm91cChncm91cE5hbWUsIGl0ZW1zW2dyb3VwTmFtZV0pKTtcclxuXHR9XHJcbn0pO1xyXG5cclxuLy8gbWFrZSBhIHNpbmdsZSBncm91cFxyXG52YXIgbWFrZUdyb3VwID0gZnVuY3Rpb24obmFtZSwgaXRlbXMsIHBhcmVudCkge1xyXG5cdC8vIGFkZCB0aGUgbGlzdCBoZWFkZXJcclxuXHRpdGVtcy51bnNoaWZ0KHtcclxuXHRcdGNsYXNzZXM6IFwibGlzdC1oZWFkZXJcIixcclxuXHRcdHRleHQ6IG5hbWVcclxuXHR9KTtcclxuXHJcblx0Ly8gcmVuZGVyIHRoZSBpdGVtXHJcblx0cmV0dXJuIHtcclxuXHRcdHBhcmVudCxcclxuXHRcdGNsYXNzZXM6IFwibGlzdC1zZWN0aW9uXCIsXHJcblx0XHRjaGlsZHJlbjogaXRlbXMubWFwKChpdGVtLCBpbmRleCkgPT4ge1xyXG5cdFx0XHQvLyBkb24ndCBtb2RpZnkgdGhlIGhlYWRlclxyXG5cdFx0XHRpZihpbmRleCA9PT0gMCkgcmV0dXJuIGl0ZW07XHJcblxyXG5cdFx0XHR2YXIgaXRlbURvbTtcclxuXHJcblx0XHRcdC8vIGNyZWF0ZSBhbiBpdGVtXHJcblx0XHRcdGlmKHR5cGVvZiBpdGVtICE9IFwic3RyaW5nXCIpIHtcclxuXHRcdFx0XHRpdGVtRG9tID0ge1xyXG5cdFx0XHRcdFx0Y2xhc3NlczogXCJsaXN0LWl0ZW1cIixcclxuXHRcdFx0XHRcdGNoaWxkcmVuOiAoaXRlbS5pdGVtcyB8fCBpdGVtKS5tYXAoaXRlbSA9PiB7XHJcblx0XHRcdFx0XHRcdHJldHVybiB7XHJcblx0XHRcdFx0XHRcdFx0Ly8gZ2V0IHRoZSBuYW1lIG9mIHRoZSBpdGVtXHJcblx0XHRcdFx0XHRcdFx0dGV4dDogdHlwZW9mIGl0ZW0gPT0gXCJzdHJpbmdcIiA/IGl0ZW0gOiBpdGVtLnRleHQsXHJcblx0XHRcdFx0XHRcdFx0Ly8gc2V0IHdoZXRoZXIgdGhlIGl0ZW0gc2hvdWxkIGdyb3dcclxuXHRcdFx0XHRcdFx0XHRjbGFzc2VzOiBpdGVtLmdyb3cgPyBcImxpc3QtaXRlbS1ncm93XCIgOiBcImxpc3QtaXRlbS1wYXJ0XCJcclxuXHRcdFx0XHRcdFx0fTtcclxuXHRcdFx0XHRcdH0pXHJcblx0XHRcdFx0fTtcclxuXHRcdFx0fVxyXG5cdFx0XHRlbHNlIHtcclxuXHRcdFx0XHRpdGVtRG9tID0ge1xyXG5cdFx0XHRcdFx0Y2xhc3NlczogXCJsaXN0LWl0ZW1cIixcclxuXHRcdFx0XHRcdHRleHQ6IGl0ZW1cclxuXHRcdFx0XHR9O1xyXG5cdFx0XHR9XHJcblxyXG5cdFx0XHQvLyBtYWtlIHRoZSBpdGVtIGEgbGlua1xyXG5cdFx0XHRpZihpdGVtLmhyZWYpIHtcclxuXHRcdFx0XHRpdGVtRG9tLm9uID0ge1xyXG5cdFx0XHRcdFx0Y2xpY2s6ICgpID0+IGxpZmVMaW5lLm5hdi5uYXZpZ2F0ZShpdGVtLmhyZWYpXHJcblx0XHRcdFx0fTtcclxuXHRcdFx0fVxyXG5cclxuXHRcdFx0cmV0dXJuIGl0ZW1Eb207XHJcblx0XHR9KVxyXG5cdH07XHJcbn07XHJcbiIsIi8qKlxyXG4gKiBUaGUgcHJvZ3Jlc3MgYmFyIGF0IHRoZSB0b3Agb2YgdGhlIHBhZ2VcclxuICovXHJcblxyXG5saWZlTGluZS5tYWtlRG9tLnJlZ2lzdGVyKFwicHJvZ3Jlc3NcIiwge1xyXG5cdG1ha2UoKSB7XHJcblx0XHRyZXR1cm4ge1xyXG5cdFx0XHRjbGFzc2VzOiBcInByb2dyZXNzXCIsXHJcblx0XHRcdG5hbWU6IFwicHJvZ3Jlc3NcIlxyXG5cdFx0fTtcclxuXHR9LFxyXG5cclxuXHRiaW5kKG9wdHMsIHtwcm9ncmVzc30pIHtcclxuXHRcdC8vIHNldCB0aGUgcHJvZ3Jlc3MgYmFyIHZhbHVlIFswLCAxXVxyXG5cdFx0dmFyIHNldFByb2dyZXNzID0gZnVuY3Rpb24odmFsdWUpIHtcclxuXHRcdFx0dmFyIGFkanVzdEJ5ID0gMDtcclxuXHJcblx0XHRcdGlmKHZhbHVlID4gMCkge1xyXG5cdFx0XHRcdC8vIHNjYWxlIGxlYXZlcyB0aGUgcHJvZ3Jlc3MgYmFyIHBlcmZlY3RseSBpbiB0aGUgbWlkZGxlIG9mIHRoZSBwYWdlXHJcblx0XHRcdFx0Ly8gMSAtIHZhbHVlIGdldHMgdGhlIGFtb3VudCBvZiBzcGFjZSByZW1haW5pbmdcclxuXHRcdFx0XHQvLyAvIDIgZ2V0cyBqdXN0IHRoZSBzcGFjZSBvbiBvbmUgc2lkZVxyXG5cdFx0XHRcdC8vIC8gdmFsdWUgZ2V0cyB0aGF0IGFtb3VudCByZWxpdGl2ZSB0byB0aGUgcHJvZ3Jlc3MgYmFycyBzY2FsZWQgd2lkdGhcclxuXHRcdFx0XHQvLyAqIDEwMCBjb252ZXJ0cyBpdCB0byBhIHBlcmNlbnRcclxuXHRcdFx0XHRhZGp1c3RCeSA9ICgxIC0gdmFsdWUpIC8gMiAvIHZhbHVlICogMTAwO1xyXG5cdFx0XHR9XHJcblxyXG5cdFx0XHRwcm9ncmVzcy5zdHlsZS50cmFuc2Zvcm0gPSBgc2NhbGVYKCR7dmFsdWV9KSB0cmFuc2xhdGVYKC0ke2FkanVzdEJ5fSUpYDtcclxuXHRcdH07XHJcblxyXG5cdFx0Ly8gaGlkZSB0aGUgcHJvZ3Jlc3MgYmFyIGluaXRpYWxseVxyXG5cdFx0cHJvZ3Jlc3Muc3R5bGUudHJhbnNmb3JtID0gXCJzY2FsZVgoMClcIjtcclxuXHJcblx0XHRyZW5kZXIgPSBmdW5jdGlvbigpIHtcclxuXHRcdFx0Ly8gY2FsY3VsYXRlIGhvdyBtdWNoIHRoaXMgcGVyY2VudCBjb250cmlidXRlcyB0byB0aGUgb3ZlcmFsbCBwcm9ncmVzc1xyXG5cdFx0XHR2YXIgY29udHJpYnV0aW9uID0gMSAvIHByb2dyZXNzZXMubGVuZ3RoO1xyXG5cclxuXHRcdFx0c2V0UHJvZ3Jlc3MoXHJcblx0XHRcdFx0cHJvZ3Jlc3Nlcy5yZWR1Y2UoKHByb2csIHBlcmMpID0+IHByb2cgKyBwZXJjLnZhbHVlICogY29udHJpYnV0aW9uLCAwKVxyXG5cdFx0XHQpO1xyXG5cdFx0fTtcclxuXHJcblx0XHRyZW5kZXIoKTtcclxuXHR9XHJcbn0pO1xyXG5cclxuLy8gc3ViIHJlbmRlciB1bnRpbCBwcm9ncmVzcyBpcyBjcmVhdGVkXHJcbnZhciByZW5kZXIgPSAoKSA9PiB7fTtcclxuXHJcbnZhciBwcm9ncmVzc2VzID0gW107XHJcblxyXG4vLyBjb21iaW5lIG11bHRpcGxlIHByb2dyZXNzIGxldmVsc1xyXG5saWZlTGluZS5Qcm9ncmVzcyA9IGNsYXNzIHtcclxuXHRjb25zdHJ1Y3RvcigpIHtcclxuXHRcdHRoaXMudmFsdWUgPSAwO1xyXG5cclxuXHRcdHByb2dyZXNzZXMucHVzaCh0aGlzKTtcclxuXHJcblx0XHRyZW5kZXIoKTtcclxuXHR9XHJcblxyXG5cdC8vIHNldCB0aGUgcHJvZ3Jlc3NcclxuXHRzZXQodmFsdWUpIHtcclxuXHRcdHRoaXMudmFsdWUgPSB2YWx1ZTtcclxuXHJcblx0XHQvLyBhbGwgdGhlIGpvYnMgYXJlIGRvbmUgcmVtb3ZlIHRoZW1cclxuXHRcdGlmKHByb2dyZXNzZXMuZXZlcnkocHJvZyA9PiBwcm9nLnZhbHVlID09IDEpKSB7XHJcblx0XHRcdHByb2dyZXNzZXMgPSBbXTtcclxuXHRcdH1cclxuXHJcblx0XHRyZW5kZXIoKTtcclxuXHR9XHJcbn07XHJcbiIsIi8qKlxyXG4gKiBUaGUgd2lkZ2V0IGZvciB0aGUgc2lkZWJhclxyXG4gKi9cclxuXHJcbmxpZmVMaW5lLm1ha2VEb20ucmVnaXN0ZXIoXCJzaWRlYmFyXCIsIHtcclxuXHRtYWtlKCkge1xyXG5cdFx0cmV0dXJuIFtcclxuXHRcdFx0e1xyXG5cdFx0XHRcdGNsYXNzZXM6IFwic2lkZWJhclwiLFxyXG5cdFx0XHRcdG5hbWU6IFwic2lkZWJhclwiLFxyXG5cdFx0XHRcdGNoaWxkcmVuOiBbXHJcblx0XHRcdFx0XHR7XHJcblx0XHRcdFx0XHRcdGNsYXNzZXM6IFtcInNpZGViYXItYWN0aW9uc1wiLCBcImhpZGRlblwiXSxcclxuXHRcdFx0XHRcdFx0bmFtZTogXCJhY3Rpb25zXCIsXHJcblx0XHRcdFx0XHRcdGNoaWxkcmVuOiBbXHJcblx0XHRcdFx0XHRcdFx0e1xyXG5cdFx0XHRcdFx0XHRcdFx0Y2xhc3NlczogXCJzaWRlYmFyLWhlYWRpbmdcIixcclxuXHRcdFx0XHRcdFx0XHRcdHRleHQ6IFwiUGFnZSBhY3Rpb25zXCJcclxuXHRcdFx0XHRcdFx0XHR9XHJcblx0XHRcdFx0XHRcdF1cclxuXHRcdFx0XHRcdH0sXHJcblx0XHRcdFx0XHR7XHJcblx0XHRcdFx0XHRcdGNsYXNzZXM6IFwic2lkZWJhci1oZWFkaW5nXCIsXHJcblx0XHRcdFx0XHRcdHRleHQ6IFwiTW9yZSBhY3Rpb25zXCJcclxuXHRcdFx0XHRcdH1cclxuXHRcdFx0XHRdXHJcblx0XHRcdH0sXHJcblx0XHRcdHtcclxuXHRcdFx0XHRjbGFzc2VzOiBcInNoYWRlXCIsXHJcblx0XHRcdFx0b246IHtcclxuXHRcdFx0XHRcdC8vIGNsb3NlIHRoZSBzaWRlYmFyXHJcblx0XHRcdFx0XHRjbGljazogKCkgPT4gZG9jdW1lbnQuYm9keS5jbGFzc0xpc3QucmVtb3ZlKFwic2lkZWJhci1vcGVuXCIpXHJcblx0XHRcdFx0fVxyXG5cdFx0XHR9XHJcblx0XHRdO1xyXG5cdH0sXHJcblxyXG5cdGJpbmQob3B0cywge2FjdGlvbnMsIHNpZGViYXJ9KSB7XHJcblx0XHQvLyBhZGQgYSBjb21tYW5kIHRvIHRoZSBzaWRlYmFyXHJcblx0XHRsaWZlTGluZS5hZGRDb21tYW5kID0gZnVuY3Rpb24obmFtZSwgZm4pIHtcclxuXHRcdFx0Ly8gbWFrZSB0aGUgc2lkZWJhciBpdGVtXHJcblx0XHRcdHZhciB7aXRlbX0gPSBsaWZlTGluZS5tYWtlRG9tKHtcclxuXHRcdFx0XHRwYXJlbnQ6IHNpZGViYXIsXHJcblx0XHRcdFx0dGFnOiBcImRpdlwiLFxyXG5cdFx0XHRcdG5hbWU6IFwiaXRlbVwiLFxyXG5cdFx0XHRcdGNsYXNzZXM6IFwic2lkZWJhci1pdGVtXCIsXHJcblx0XHRcdFx0dGV4dDogbmFtZSxcclxuXHRcdFx0XHRvbjoge1xyXG5cdFx0XHRcdFx0Y2xpY2s6ICgpID0+IHtcclxuXHRcdFx0XHRcdFx0Ly8gY2xvc2UgdGhlIHNpZGViYXJcclxuXHRcdFx0XHRcdFx0ZG9jdW1lbnQuYm9keS5jbGFzc0xpc3QucmVtb3ZlKFwic2lkZWJhci1vcGVuXCIpO1xyXG5cclxuXHRcdFx0XHRcdFx0Ly8gY2FsbCB0aGUgbGlzdGVuZXJcclxuXHRcdFx0XHRcdFx0Zm4oKTtcclxuXHRcdFx0XHRcdH1cclxuXHRcdFx0XHR9XHJcblx0XHRcdH0pO1xyXG5cclxuXHRcdFx0cmV0dXJuIHtcclxuXHRcdFx0XHR1bnN1YnNjcmliZTogKCkgPT4gaXRlbS5yZW1vdmUoKVxyXG5cdFx0XHR9O1xyXG5cdFx0fTtcclxuXHJcblx0XHQvLyBhZGQgYSBuYXZpZ2F0aW9uYWwgY29tbWFuZFxyXG5cdFx0bGlmZUxpbmUuYWRkTmF2Q29tbWFuZCA9IGZ1bmN0aW9uKG5hbWUsIHRvKSB7XHJcblx0XHRcdGxpZmVMaW5lLmFkZENvbW1hbmQobmFtZSwgKCkgPT4gbGlmZUxpbmUubmF2Lm5hdmlnYXRlKHRvKSk7XHJcblx0XHR9O1xyXG5cclxuXHRcdC8vIGFkZCBhIHNpZGViYXIgYWN0aW9uXHJcblx0XHRsaWZlTGluZS5vbihcImFjdGlvbi1jcmVhdGVcIiwgbmFtZSA9PiB7XHJcblx0XHRcdC8vIHNob3cgdGhlIGFjdGlvbnNcclxuXHRcdFx0YWN0aW9ucy5jbGFzc0xpc3QucmVtb3ZlKFwiaGlkZGVuXCIpO1xyXG5cclxuXHRcdFx0Ly8gY3JlYXRlIHRoZSBidXR0b25cclxuXHRcdFx0bGlmZUxpbmUubWFrZURvbSh7XHJcblx0XHRcdFx0cGFyZW50OiBhY3Rpb25zLFxyXG5cdFx0XHRcdHRhZzogXCJkaXZcIixcclxuXHRcdFx0XHRuYW1lOiBcIml0ZW1cIixcclxuXHRcdFx0XHRjbGFzc2VzOiBcInNpZGViYXItaXRlbVwiLFxyXG5cdFx0XHRcdHRleHQ6IG5hbWUsXHJcblx0XHRcdFx0YXR0cnM6IHtcclxuXHRcdFx0XHRcdFwiZGF0YS1uYW1lXCI6IG5hbWVcclxuXHRcdFx0XHR9LFxyXG5cdFx0XHRcdG9uOiB7XHJcblx0XHRcdFx0XHRjbGljazogKCkgPT4ge1xyXG5cdFx0XHRcdFx0XHQvLyBjbG9zZSB0aGUgc2lkZWJhclxyXG5cdFx0XHRcdFx0XHRkb2N1bWVudC5ib2R5LmNsYXNzTGlzdC5yZW1vdmUoXCJzaWRlYmFyLW9wZW5cIik7XHJcblxyXG5cdFx0XHRcdFx0XHQvLyB0cmlnZ2VyIHRoZSBhY3Rpb25cclxuXHRcdFx0XHRcdFx0bGlmZUxpbmUuZW1pdChcImFjdGlvbi1leGVjLVwiICsgbmFtZSk7XHJcblx0XHRcdFx0XHR9XHJcblx0XHRcdFx0fVxyXG5cdFx0XHR9KTtcclxuXHJcblx0XHRcdC8vIHJlbW92ZSBhIHNpZGViYXIgYWN0aW9uXHJcblx0XHRcdGxpZmVMaW5lLm9uKFwiYWN0aW9uLXJlbW92ZVwiLCBuYW1lID0+IHtcclxuXHRcdFx0XHQvLyByZW1vdmUgdGhlIGJ1dHRvblxyXG5cdFx0XHRcdHZhciBidG4gPSBhY3Rpb25zLnF1ZXJ5U2VsZWN0b3IoYFtkYXRhLW5hbWU9XCIke25hbWV9XCJdYCk7XHJcblxyXG5cdFx0XHRcdGlmKGJ0bikgYnRuLnJlbW92ZSgpO1xyXG5cclxuXHRcdFx0XHQvLyBoaWRlIHRoZSBwYWdlIGFjdGlvbnMgaWYgdGhlcmUgYXJlIG5vbmVcclxuXHRcdFx0XHRpZihhY3Rpb25zLmNoaWxkcmVuLmxlbmd0aCA9PSAxKSB7XHJcblx0XHRcdFx0XHRhY3Rpb25zLmNsYXNzTGlzdC5hZGQoXCJoaWRkZW5cIik7XHJcblx0XHRcdFx0fVxyXG5cdFx0XHR9KTtcclxuXHJcblx0XHRcdC8vIHJlbW92ZSBhbGwgdGhlIHNpZGViYXIgYWN0aW9uc1xyXG5cdFx0XHRsaWZlTGluZS5vbihcImFjdGlvbi1yZW1vdmUtYWxsXCIsICgpID0+IHtcclxuXHRcdFx0XHQvLyByZW1vdmUgYWxsIHRoZSBhY3Rpb25zXHJcblx0XHRcdFx0dmFyIF9hY3Rpb25zID0gQXJyYXkuZnJvbShhY3Rpb25zLnF1ZXJ5U2VsZWN0b3JBbGwoXCIuc2lkZWJhci1pdGVtXCIpKTtcclxuXHJcblx0XHRcdFx0X2FjdGlvbnMuZm9yRWFjaChhY3Rpb24gPT4gYWN0aW9uLnJlbW92ZSgpKTtcclxuXHJcblx0XHRcdFx0Ly8gc2lkZSB0aGUgcGFnZSBhY3Rpb25zXHJcblx0XHRcdFx0YWN0aW9ucy5jbGFzc0xpc3QuYWRkKFwiaGlkZGVuXCIpO1xyXG5cdFx0XHR9KTtcclxuXHRcdH0pO1xyXG5cdH1cclxufSk7XHJcbiIsIi8qKlxyXG4gKiBBIHJvdyBvZiByYWRpbyBzdHlsZSBidXR0b25zXHJcbiAqL1xyXG5cclxubGlmZUxpbmUubWFrZURvbS5yZWdpc3RlcihcInRvZ2dsZS1idG5zXCIsIHtcclxuXHRtYWtlKHtidG5zLCB2YWx1ZX0pIHtcclxuXHRcdC8vIGF1dG8gc2VsZWN0IHRoZSBmaXJzdCBidXR0b25cclxuXHRcdGlmKCF2YWx1ZSkge1xyXG5cdFx0XHR2YWx1ZSA9IHR5cGVvZiBidG5zWzBdID09IFwic3RyaW5nXCIgPyBidG5zWzBdIDogYnRuc1swXS52YWx1ZTtcclxuXHRcdH1cclxuXHJcblx0XHRyZXR1cm4ge1xyXG5cdFx0XHRuYW1lOiBcInRvZ2dsZUJhclwiLFxyXG5cdFx0XHRjbGFzc2VzOiBcInRvZ2dsZS1iYXJcIixcclxuXHRcdFx0Y2hpbGRyZW46IGJ0bnMubWFwKGJ0biA9PiB7XHJcblx0XHRcdFx0Ly8gY29udmVydCB0aGUgcGxhaW4gc3RyaW5nIHRvIGFuIG9iamVjdFxyXG5cdFx0XHRcdGlmKHR5cGVvZiBidG4gPT0gXCJzdHJpbmdcIikge1xyXG5cdFx0XHRcdFx0YnRuID0geyB0ZXh0OiBidG4sIHZhbHVlOiBidG4gfTtcclxuXHRcdFx0XHR9XHJcblxyXG5cdFx0XHRcdHZhciBjbGFzc2VzID0gW1widG9nZ2xlLWJ0blwiXTtcclxuXHJcblx0XHRcdFx0Ly8gYWRkIHRoZSBzZWxlY3RlZCBjbGFzc1xyXG5cdFx0XHRcdGlmKHZhbHVlID09IGJ0bi52YWx1ZSkge1xyXG5cdFx0XHRcdFx0Y2xhc3Nlcy5wdXNoKFwidG9nZ2xlLWJ0bi1zZWxlY3RlZFwiKTtcclxuXHJcblx0XHRcdFx0XHQvLyBkb24ndCBzZWxlY3QgdHdvIGJ1dHRvbnNcclxuXHRcdFx0XHRcdHZhbHVlID0gdW5kZWZpbmVkO1xyXG5cdFx0XHRcdH1cclxuXHJcblx0XHRcdFx0cmV0dXJuIHtcclxuXHRcdFx0XHRcdHRhZzogXCJidXR0b25cIixcclxuXHRcdFx0XHRcdGNsYXNzZXMsXHJcblx0XHRcdFx0XHR0ZXh0OiBidG4udGV4dCxcclxuXHRcdFx0XHRcdGF0dHJzOiB7XHJcblx0XHRcdFx0XHRcdFwiZGF0YS12YWx1ZVwiOiBidG4udmFsdWVcclxuXHRcdFx0XHRcdH1cclxuXHRcdFx0XHR9O1xyXG5cdFx0XHR9KVxyXG5cdFx0fTtcclxuXHR9LFxyXG5cclxuXHRiaW5kKHtjaGFuZ2V9LCB7dG9nZ2xlQmFyfSkge1xyXG5cdFx0Ly8gYXR0YWNoIGxpc3RlbmVyc1xyXG5cdFx0Zm9yKGxldCBidG4gb2YgdG9nZ2xlQmFyLnF1ZXJ5U2VsZWN0b3JBbGwoXCIudG9nZ2xlLWJ0blwiKSkge1xyXG5cdFx0XHRidG4uYWRkRXZlbnRMaXN0ZW5lcihcImNsaWNrXCIsICgpID0+IHtcclxuXHRcdFx0XHR2YXIgc2VsZWN0ZWQgPSB0b2dnbGVCYXIucXVlcnlTZWxlY3RvcihcIi50b2dnbGUtYnRuLXNlbGVjdGVkXCIpO1xyXG5cclxuXHRcdFx0XHQvLyB0aGUgYnV0dG9uIGhhcyBhbHJlYWR5IGJlZW4gc2VsZWN0ZWRcclxuXHRcdFx0XHRpZihzZWxlY3RlZCA9PSBidG4pIHtcclxuXHRcdFx0XHRcdHJldHVybjtcclxuXHRcdFx0XHR9XHJcblxyXG5cdFx0XHRcdC8vIHVudG9nZ2xlIHRoZSBvdGhlciBidXR0b25cclxuXHRcdFx0XHRpZihzZWxlY3RlZCkge1xyXG5cdFx0XHRcdFx0c2VsZWN0ZWQuY2xhc3NMaXN0LnJlbW92ZShcInRvZ2dsZS1idG4tc2VsZWN0ZWRcIik7XHJcblx0XHRcdFx0fVxyXG5cclxuXHRcdFx0XHQvLyBzZWxlY3QgdGhpcyBidXR0b25cclxuXHRcdFx0XHRidG4uY2xhc3NMaXN0LmFkZChcInRvZ2dsZS1idG4tc2VsZWN0ZWRcIik7XHJcblxyXG5cdFx0XHRcdC8vIHRyaWdnZXIgYSBzZWxlY3Rpb24gY2hhbmdlXHJcblx0XHRcdFx0Y2hhbmdlKGJ0bi5kYXRhc2V0LnZhbHVlKTtcclxuXHRcdFx0fSk7XHJcblx0XHR9XHJcblx0fVxyXG59KTtcclxuIiwiLyoqXHJcbiAqIE5hbWUgZ2VuZXJhdG9yIGZvciBiYWNrdXBzXHJcbiAqL1xyXG5cclxuZXhwb3J0cy5nZW5CYWNrdXBOYW1lID0gZnVuY3Rpb24oZGF0ZSA9IG5ldyBEYXRlKCkpIHtcclxuXHRyZXR1cm4gYGJhY2t1cC0ke2RhdGUuZ2V0RnVsbFllYXIoKX0tJHtkYXRlLmdldE1vbnRoKCkrMX0tJHtkYXRlLmdldERhdGUoKX1gXHJcblx0XHQrIGAtJHtkYXRlLmdldEhvdXJzKCl9LSR7ZGF0ZS5nZXRNaW51dGVzKCl9LnppcGA7XHJcbn07XHJcbiIsIi8qKlxyXG4gKiBBbiBhZGFwdG9yIGZvciBodHRwIGJhc2VkIHN0b3Jlc1xyXG4gKi9cclxuXHJcbmlmKHR5cGVvZiB3aW5kb3cgIT0gXCJvYmplY3RcIiAmJiB0eXBlb2Ygc2VsZiAhPSBcIm9iamVjdFwiKSB7XHJcblx0Ly8gcG9seWZpbGwgZmV0Y2ggZm9yIG5vZGVcclxuXHRmZXRjaCA9IHJlcXVpcmUoXCJub2RlLWZldGNoXCIpO1xyXG59XHJcblxyXG5jbGFzcyBIdHRwQWRhcHRvciB7XHJcblx0Y29uc3RydWN0b3Iob3B0cykge1xyXG5cdFx0Ly8gaWYgd2UgYXJlIGp1c3QgZ2l2ZW4gYSBzdHJpbmcgdXNlIGl0IGFzIHRoZSBzb3VyY2VcclxuXHRcdGlmKHR5cGVvZiBvcHRzID09IFwic3RyaW5nXCIpIHtcclxuXHRcdFx0b3B0cyA9IHtcclxuXHRcdFx0XHRzcmM6IG9wdHNcclxuXHRcdFx0fTtcclxuXHRcdH1cclxuXHJcblx0XHQvLyBzYXZlIHRoZSBvcHRpb25zXHJcblx0XHR0aGlzLl9vcHRzID0gb3B0cztcclxuXHR9XHJcblxyXG5cdC8vIGNyZWF0ZSB0aGUgb3B0aW9ucyBmb3IgYSBmZXRjaCByZXF1ZXN0XHJcblx0X2NyZWF0ZU9wdHMoKSB7XHJcblx0XHR2YXIgb3B0cyA9IHt9O1xyXG5cclxuXHRcdC8vIHVzZSB0aGUgc2Vzc2lvbiBjb29raWUgd2Ugd2VyZSBnaXZlblxyXG5cdFx0aWYodGhpcy5fb3B0cy5zZXNzaW9uKSB7XHJcblx0XHRcdG9wdHMuaGVhZGVycyA9IHtcclxuXHRcdFx0XHRjb29raWU6IGBzZXNzaW9uPSR7dGhpcy5fb3B0cy5zZXNzaW9ufWBcclxuXHRcdFx0fTtcclxuXHRcdH1cclxuXHRcdC8vIHVzZSB0aGUgY3JlYWRlbnRpYWxzIGZyb20gdGhlIGJyb3dzZXJcclxuXHRcdGVsc2Uge1xyXG5cdFx0XHRvcHRzLmNyZWRlbnRpYWxzID0gXCJpbmNsdWRlXCI7XHJcblx0XHR9XHJcblxyXG5cdFx0cmV0dXJuIG9wdHM7XHJcblx0fVxyXG5cclxuXHQvKipcclxuXHQgKiBHZXQgYWxsIHRoZSB2YWx1ZXMgaW4gYSBzdG9yZVxyXG5cdCAqL1xyXG5cdGdldEFsbCgpIHtcclxuXHRcdHJldHVybiBmZXRjaCh0aGlzLl9vcHRzLnNyYywgdGhpcy5fY3JlYXRlT3B0cygpKVxyXG5cclxuXHRcdC8vIHBhcnNlIHRoZSBqc29uIHJlc3BvbnNlXHJcblx0XHQudGhlbihyZXMgPT4ge1xyXG5cdFx0XHQvLyBzZXJ2ZXIvc2VydmljZSB3b3JrZXIgZXJyb3JcclxuXHRcdFx0aWYocmVzLnN0YXR1cyA9PSA1MDApIHtcclxuXHRcdFx0XHRyZXR1cm4gcmVzLnRleHQoKVxyXG5cclxuXHRcdFx0XHQudGhlbihtc2cgPT4ge1xyXG5cdFx0XHRcdFx0dGhyb3cgbmV3IEVycm9yKG1zZyk7XHJcblx0XHRcdFx0fSk7XHJcblx0XHRcdH1cclxuXHJcblx0XHRcdHJldHVybiByZXMuanNvbigpO1xyXG5cdFx0fSlcclxuXHJcblx0XHQudGhlbihqc29uID0+IHtcclxuXHRcdFx0Ly8gYW4gZXJyb3Igb2NjdXJlZCBvbiB0aGUgc2VydmVyXHJcblx0XHRcdGlmKGpzb24uc3RhdHVzID09IFwiZXJyb3JcIikge1xyXG5cdFx0XHRcdHRocm93IG5ldyBFcnJvcihqc29uLmRhdGEpO1xyXG5cdFx0XHR9XHJcblxyXG5cdFx0XHRyZXR1cm4ganNvbjtcclxuXHRcdH0pO1xyXG5cdH1cclxuXHJcblx0LyoqXHJcblx0ICogR2V0IGEgc2luZ2xlIHZhbHVlXHJcblx0ICovXHJcblx0Z2V0KGtleSkge1xyXG5cdFx0cmV0dXJuIGZldGNoKHRoaXMuX29wdHMuc3JjICsgXCJ2YWx1ZS9cIiArIGtleSwgdGhpcy5fY3JlYXRlT3B0cygpKVxyXG5cclxuXHRcdC50aGVuKHJlcyA9PiB7XHJcblx0XHRcdC8vIG5vdCBsb2dnZWQgaW5cclxuXHRcdFx0aWYocmVzLnN0YXR1cyA9PSA0MDMpIHtcclxuXHRcdFx0XHRsZXQgZXJyb3IgPSBuZXcgRXJyb3IoXCJOb3QgbG9nZ2VkIGluXCIpO1xyXG5cclxuXHRcdFx0XHQvLyBhZGQgYW4gZXJyb3IgY29kZVxyXG5cdFx0XHRcdGVycm9yLmNvZGUgPSBcIm5vdC1sb2dnZWQtaW5cIjtcclxuXHJcblx0XHRcdFx0dGhyb3cgZXJyb3I7XHJcblx0XHRcdH1cclxuXHJcblx0XHRcdC8vIG5vIHN1Y2ggaXRlbVxyXG5cdFx0XHRpZihyZXMuc3RhdHVzID09IDQwNCkge1xyXG5cdFx0XHRcdHJldHVybiB1bmRlZmluZWQ7XHJcblx0XHRcdH1cclxuXHJcblx0XHRcdC8vIHNlcnZlci9zZXJ2aWNlIHdvcmtlciBlcnJvclxyXG5cdFx0XHRpZihyZXMuc3RhdHVzID09IDUwMCkge1xyXG5cdFx0XHRcdHJldHVybiByZXMudGV4dCgpXHJcblxyXG5cdFx0XHRcdC50aGVuKG1zZyA9PiB7XHJcblx0XHRcdFx0XHR0aHJvdyBuZXcgRXJyb3IobXNnKTtcclxuXHRcdFx0XHR9KTtcclxuXHRcdFx0fVxyXG5cclxuXHRcdFx0Ly8gcGFyc2UgdGhlIGl0ZW1cclxuXHRcdFx0cmV0dXJuIHJlcy5qc29uKCk7XHJcblx0XHR9KVxyXG5cclxuXHRcdC50aGVuKGpzb24gPT4ge1xyXG5cdFx0XHQvLyBhbiBlcnJvciBvY2N1cmVkIG9uIHRoZSBzZXJ2ZXJcclxuXHRcdFx0aWYoanNvbiAmJiBqc29uLnN0YXR1cyA9PSBcImVycm9yXCIpIHtcclxuXHRcdFx0XHR0aHJvdyBuZXcgRXJyb3IoanNvbi5kYXRhKTtcclxuXHRcdFx0fVxyXG5cclxuXHRcdFx0cmV0dXJuIGpzb247XHJcblx0XHR9KTtcclxuXHR9XHJcblxyXG5cdC8qKlxyXG5cdCAqIFN0b3JlIGFuIHZhbHVlIG9uIHRoZSBzZXJ2ZXJcclxuXHQgKi9cclxuXHRzZXQodmFsdWUpIHtcclxuXHRcdHZhciBmZXRjaE9wdHMgPSB0aGlzLl9jcmVhdGVPcHRzKCk7XHJcblxyXG5cdFx0Ly8gYWRkIHRoZSBoZWFkZXJzIHRvIHRoZSBkZWZhdWx0IGhlYWRlcnNcclxuXHRcdGZldGNoT3B0cy5tZXRob2QgPSBcIlBVVFwiO1xyXG5cdFx0ZmV0Y2hPcHRzLmJvZHkgPSBKU09OLnN0cmluZ2lmeSh2YWx1ZSk7XHJcblxyXG5cdFx0Ly8gc2VuZCB0aGUgaXRlbVxyXG5cdFx0cmV0dXJuIGZldGNoKHRoaXMuX29wdHMuc3JjICsgXCJ2YWx1ZS9cIiArIHZhbHVlLmlkLCBmZXRjaE9wdHMpXHJcblxyXG5cdFx0LnRoZW4ocmVzID0+IHtcclxuXHRcdFx0Ly8gbm90IGxvZ2dlZCBpblxyXG5cdFx0XHRpZihyZXMuc3RhdHVzID09IDQwMykge1xyXG5cdFx0XHRcdGxldCBlcnJvciA9IG5ldyBFcnJvcihcIk5vdCBsb2dnZWQgaW5cIik7XHJcblxyXG5cdFx0XHRcdC8vIGFkZCBhbiBlcnJvciBjb2RlXHJcblx0XHRcdFx0ZXJyb3IuY29kZSA9IFwibm90LWxvZ2dlZC1pblwiO1xyXG5cclxuXHRcdFx0XHR0aHJvdyBlcnJvcjtcclxuXHRcdFx0fVxyXG5cclxuXHRcdFx0Ly8gc2VydmVyL3NlcnZpY2Ugd29ya2VyIGVycm9yXHJcblx0XHRcdGlmKHJlcy5zdGF0dXMgPT0gNTAwKSB7XHJcblx0XHRcdFx0cmV0dXJuIHJlcy50ZXh0KClcclxuXHJcblx0XHRcdFx0LnRoZW4obXNnID0+IHtcclxuXHRcdFx0XHRcdHRocm93IG5ldyBFcnJvcihtc2cpO1xyXG5cdFx0XHRcdH0pO1xyXG5cdFx0XHR9XHJcblxyXG5cdFx0XHQvLyBwYXJzZSB0aGUgZXJyb3IgbWVzc2FnZVxyXG5cdFx0XHRpZihyZXMuc3RhdHVzICE9IDMwNCkge1xyXG5cdFx0XHRcdHJldHVybiByZXMuanNvbigpO1xyXG5cdFx0XHR9XHJcblx0XHR9KVxyXG5cclxuXHRcdC50aGVuKGpzb24gPT4ge1xyXG5cdFx0XHQvLyBhbiBlcnJvciBvY2N1cmVkIG9uIHRoZSBzZXJ2ZXJcclxuXHRcdFx0aWYoanNvbi5zdGF0dXMgPT0gXCJlcnJvclwiKSB7XHJcblx0XHRcdFx0dGhyb3cgbmV3IEVycm9yKGpzb24uZGF0YSk7XHJcblx0XHRcdH1cclxuXHJcblx0XHRcdHJldHVybiBqc29uO1xyXG5cdFx0fSk7XHJcblx0fVxyXG5cclxuXHQvKipcclxuXHQgKiBSZW1vdmUgdGhlIHZhbHVlIGZyb20gdGhlIHN0b3JlXHJcblx0ICovXHJcblx0cmVtb3ZlKGtleSkge1xyXG5cdFx0dmFyIGZldGNoT3B0cyA9IHRoaXMuX2NyZWF0ZU9wdHMoKTtcclxuXHJcblx0XHQvLyBhZGQgdGhlIGhlYWRlcnMgdG8gdGhlIGRlZmF1bHQgaGVhZGVyc1xyXG5cdFx0ZmV0Y2hPcHRzLm1ldGhvZCA9IFwiREVMRVRFXCI7XHJcblxyXG5cdFx0Ly8gc2VuZCB0aGUgaXRlbVxyXG5cdFx0cmV0dXJuIGZldGNoKHRoaXMuX29wdHMuc3JjICsgXCJ2YWx1ZS9cIiArIGtleSwgZmV0Y2hPcHRzKVxyXG5cclxuXHRcdC50aGVuKHJlcyA9PiB7XHJcblx0XHRcdC8vIG5vdCBsb2dnZWQgaW5cclxuXHRcdFx0aWYocmVzLnN0YXR1cyA9PSA0MDMpIHtcclxuXHRcdFx0XHRsZXQgZXJyb3IgPSBuZXcgRXJyb3IoXCJOb3QgbG9nZ2VkIGluXCIpO1xyXG5cclxuXHRcdFx0XHQvLyBhZGQgYW4gZXJyb3IgY29kZVxyXG5cdFx0XHRcdGVycm9yLmNvZGUgPSBcIm5vdC1sb2dnZWQtaW5cIjtcclxuXHJcblx0XHRcdFx0dGhyb3cgZXJyb3I7XHJcblx0XHRcdH1cclxuXHJcblx0XHRcdC8vIHNlcnZlci9zZXJ2aWNlIHdvcmtlciBlcnJvclxyXG5cdFx0XHRpZihyZXMuc3RhdHVzID09IDUwMCkge1xyXG5cdFx0XHRcdHJldHVybiByZXMudGV4dCgpXHJcblxyXG5cdFx0XHRcdC50aGVuKG1zZyA9PiB7XHJcblx0XHRcdFx0XHR0aHJvdyBuZXcgRXJyb3IobXNnKTtcclxuXHRcdFx0XHR9KTtcclxuXHRcdFx0fVxyXG5cclxuXHRcdFx0Ly8gcGFyc2UgdGhlIGVycm9yIG1lc3NhZ2VcclxuXHRcdFx0aWYocmVzLnN0YXR1cyAhPSAzMDQpIHtcclxuXHRcdFx0XHRyZXR1cm4gcmVzLmpzb24oKTtcclxuXHRcdFx0fVxyXG5cdFx0fSlcclxuXHJcblx0XHQudGhlbihqc29uID0+IHtcclxuXHRcdFx0Ly8gYW4gZXJyb3Igb2NjdXJlZCBvbiB0aGUgc2VydmVyXHJcblx0XHRcdGlmKGpzb24uc3RhdHVzID09IFwiZXJyb3JcIikge1xyXG5cdFx0XHRcdHRocm93IG5ldyBFcnJvcihqc29uLmRhdGEpO1xyXG5cdFx0XHR9XHJcblxyXG5cdFx0XHRyZXR1cm4ganNvbjtcclxuXHRcdH0pO1xyXG5cdH1cclxuXHJcblx0Ly8gY2hlY2sgb3VyIGFjY2VzcyBsZXZlbFxyXG5cdGFjY2Vzc0xldmVsKCkge1xyXG5cdFx0cmV0dXJuIGZldGNoKHRoaXMuX29wdHMuc3JjICsgXCJhY2Nlc3NcIiwgdGhpcy5fY3JlYXRlT3B0cygpKVxyXG5cdFx0XHQvLyB0aGUgcmVzcG9uc2UgaXMganVzdCBhIHN0cmluZ1xyXG5cdFx0XHQudGhlbihyZXMgPT4gcmVzLnRleHQoKSk7XHJcblx0fVxyXG59XHJcblxyXG5tb2R1bGUuZXhwb3J0cyA9IEh0dHBBZGFwdG9yO1xyXG4iLCIvKipcclxuICogQSBiYXNpYyBrZXkgdmFsdWUgZGF0YSBzdG9yZVxyXG4gKi9cclxuXHJcbnZhciBFdmVudEVtaXR0ZXIgPSByZXF1aXJlKFwiLi4vdXRpbC9ldmVudC1lbWl0dGVyXCIpO1xyXG5cclxuY2xhc3MgS2V5VmFsdWVTdG9yZSBleHRlbmRzIEV2ZW50RW1pdHRlciB7XHJcblx0Y29uc3RydWN0b3IoYWRhcHRvcikge1xyXG5cdFx0c3VwZXIoKTtcclxuXHRcdHRoaXMuX2FkYXB0b3IgPSBhZGFwdG9yO1xyXG5cclxuXHRcdC8vIG1ha2Ugc3VyZSB3ZSBoYXZlIGFuIGFkYXB0b3JcclxuXHRcdGlmKCFhZGFwdG9yKSB7XHJcblx0XHRcdHRocm93IG5ldyBFcnJvcihcIktleVZhbHVlU3RvcmUgbXVzdCBiZSBpbml0aWFsaXplZCB3aXRoIGFuIGFkYXB0b3JcIilcclxuXHRcdH1cclxuXHR9XHJcblxyXG5cdC8qKlxyXG5cdCAqIEdldCB0aGUgY29ycmlzcG9uZGluZyB2YWx1ZSBvdXQgb2YgdGhlIGRhdGEgc3RvcmUgb3RoZXJ3aXNlIHJldHVybiBkZWZhdWx0XHJcblx0ICovXHJcblx0Z2V0KGtleSwgX2RlZmF1bHQpIHtcclxuXHRcdC8vIGNoZWNrIGlmIHRoaXMgdmFsdWUgaGFzIGJlZW4gb3ZlcnJpZGVuXHJcblx0XHRpZih0aGlzLl9vdmVycmlkZXMgJiYgdGhpcy5fb3ZlcnJpZGVzLmhhc093blByb3BlcnR5KGtleSkpIHtcclxuXHRcdFx0cmV0dXJuIFByb21pc2UucmVzb2x2ZSh0aGlzLl9vdmVycmlkZXNba2V5XSk7XHJcblx0XHR9XHJcblxyXG5cdFx0cmV0dXJuIHRoaXMuX2FkYXB0b3IuZ2V0KGtleSlcclxuXHJcblx0XHQudGhlbihyZXN1bHQgPT4ge1xyXG5cdFx0XHQvLyB0aGUgaXRlbSBpcyBub3QgZGVmaW5lZFxyXG5cdFx0XHRpZighcmVzdWx0KSB7XHJcblx0XHRcdFx0cmV0dXJuIF9kZWZhdWx0O1xyXG5cdFx0XHR9XHJcblxyXG5cdFx0XHRyZXR1cm4gcmVzdWx0LnZhbHVlO1xyXG5cdFx0fSk7XHJcblx0fVxyXG5cclxuXHQvKipcclxuXHQgKiBTZXQgYSBzaW5nbGUgdmFsdWUgb3Igc2V2ZXJhbCB2YWx1ZXNcclxuXHQgKlxyXG5cdCAqIGtleSAtPiB2YWx1ZVxyXG5cdCAqIG9yXHJcblx0ICogeyBrZXk6IHZhbHVlIH1cclxuXHQgKi9cclxuXHRzZXQoa2V5LCB2YWx1ZSkge1xyXG5cdFx0Ly8gc2V0IGEgc2luZ2xlIHZhbHVlXHJcblx0XHRpZih0eXBlb2Yga2V5ID09IFwic3RyaW5nXCIpIHtcclxuXHRcdFx0dmFyIHByb21pc2UgPSB0aGlzLl9hZGFwdG9yLnNldCh7XHJcblx0XHRcdFx0aWQ6IGtleSxcclxuXHRcdFx0XHR2YWx1ZSxcclxuXHRcdFx0XHRtb2RpZmllZDogRGF0ZS5ub3coKVxyXG5cdFx0XHR9KTtcclxuXHJcblx0XHRcdC8vIHRyaWdnZXIgdGhlIGNoYW5nZVxyXG5cdFx0XHR0aGlzLmVtaXQoa2V5LCB2YWx1ZSk7XHJcblxyXG5cdFx0XHRyZXR1cm4gcHJvbWlzZTtcclxuXHRcdH1cclxuXHRcdC8vIHNldCBzZXZlcmFsIHZhbHVlc1xyXG5cdFx0ZWxzZSB7XHJcblx0XHRcdC8vIHRlbGwgdGhlIGNhbGxlciB3aGVuIHdlIGFyZSBkb25lXHJcblx0XHRcdGxldCBwcm9taXNlcyA9IFtdO1xyXG5cclxuXHRcdFx0Zm9yKGxldCBfa2V5IG9mIE9iamVjdC5nZXRPd25Qcm9wZXJ0eU5hbWVzKGtleSkpIHtcclxuXHRcdFx0XHRwcm9taXNlcy5wdXNoKFxyXG5cdFx0XHRcdFx0dGhpcy5fYWRhcHRvci5zZXQoe1xyXG5cdFx0XHRcdFx0XHRpZDogX2tleSxcclxuXHRcdFx0XHRcdFx0dmFsdWU6IGtleVtfa2V5XSxcclxuXHRcdFx0XHRcdFx0bW9kaWZpZWQ6IERhdGUubm93KClcclxuXHRcdFx0XHRcdH0pXHJcblx0XHRcdFx0KTtcclxuXHJcblx0XHRcdFx0Ly8gdHJpZ2dlciB0aGUgY2hhbmdlXHJcblx0XHRcdFx0dGhpcy5lbWl0KF9rZXksIGtleVtfa2V5XSk7XHJcblx0XHRcdH1cclxuXHJcblx0XHRcdHJldHVybiBQcm9taXNlLmFsbChwcm9taXNlcyk7XHJcblx0XHR9XHJcblx0fVxyXG5cclxuXHQgLyoqXHJcblx0ICAqIFdhdGNoIHRoZSB2YWx1ZSBmb3IgY2hhbmdlc1xyXG5cdCAgKlxyXG5cdCAgKiBvcHRzLmN1cnJlbnQgLSBzZW5kIHRoZSBjdXJyZW50IHZhbHVlIG9mIGtleSAoZGVmYXVsdDogZmFsc2UpXHJcblx0ICAqIG9wdHMuZGVmYXVsdCAtIHRoZSBkZWZhdWx0IHZhbHVlIHRvIHNlbmQgZm9yIG9wdHMuY3VycmVudFxyXG5cdCAgKi9cclxuXHQgd2F0Y2goa2V5LCBvcHRzLCBmbikge1xyXG5cdFx0IC8vIG1ha2Ugb3B0cyBvcHRpb25hbFxyXG5cdFx0IGlmKHR5cGVvZiBvcHRzID09IFwiZnVuY3Rpb25cIikge1xyXG5cdFx0XHQgZm4gPSBvcHRzO1xyXG5cdFx0XHQgb3B0cyA9IHt9O1xyXG5cdFx0IH1cclxuXHJcblx0XHQgLy8gaWYgYSBjaGFuZ2UgaXMgdHJpZ2dlcmVkIGJlZm9yZSBnZXQgY29tZXMgYmFjayBkb24ndCBlbWl0IHRoZSB2YWx1ZSBmcm9tIGdldFxyXG5cdFx0IHZhciBjaGFuZ2VSZWNpZXZlZCA9IGZhbHNlO1xyXG5cclxuXHRcdCAvLyBzZW5kIHRoZSBjdXJyZW50IHZhbHVlXHJcblx0XHQgaWYob3B0cy5jdXJyZW50KSB7XHJcblx0XHRcdCB0aGlzLmdldChrZXksIG9wdHMuZGVmYXVsdClcclxuXHJcblx0XHQgXHQudGhlbih2YWx1ZSA9PiB7XHJcblx0XHRcdFx0aWYoIWNoYW5nZVJlY2lldmVkKSB7XHJcblx0XHRcdFx0XHRmbih2YWx1ZSk7XHJcblx0XHRcdFx0fVxyXG5cdFx0XHR9KTtcclxuXHRcdCB9XHJcblxyXG5cdFx0IC8vIGxpc3RlbiBmb3IgYW55IGNoYW5nZXNcclxuXHRcdCByZXR1cm4gdGhpcy5vbihrZXksIHZhbHVlID0+IHtcclxuXHRcdFx0IC8vIG9ubHkgZW1pdCB0aGUgY2hhbmdlIGlmIHRoZXJlIGlzIG5vdCBhbiBvdmVycmlkZSBpbiBwbGFjZVxyXG5cdFx0XHQgaWYoIXRoaXMuX292ZXJyaWRlcyB8fCAhdGhpcy5fb3ZlcnJpZGVzLmhhc093blByb3BlcnR5KGtleSkpIHtcclxuXHRcdFx0XHQgZm4odmFsdWUpO1xyXG5cdFx0XHQgfVxyXG5cclxuXHRcdFx0IGNoYW5nZVJlY2lldmVkID0gdHJ1ZTtcclxuXHRcdCB9KTtcclxuXHQgfVxyXG5cclxuXHQgLyoqXHJcblx0ICAqIE92ZXJyaWRlIHRoZSB2YWx1ZXMgZnJvbSB0aGUgYWRhcHRvciB3aXRob3V0IHdyaXRpbmcgdG8gdGhlbVxyXG5cdCAgKlxyXG5cdCAgKiBVc2VmdWwgZm9yIGNvbWJpbmluZyBqc29uIHNldHRpbmdzIHdpdGggY29tbWFuZCBsaW5lIGZsYWdzXHJcblx0ICAqL1xyXG5cdCBzZXRPdmVycmlkZXMob3ZlcnJpZGVzKSB7XHJcblx0XHQgLy8gZW1pdCBjaGFuZ2VzIGZvciBlYWNoIG9mIHRoZSBvdmVycmlkZXNcclxuXHRcdCBPYmplY3QuZ2V0T3duUHJvcGVydHlOYW1lcyhvdmVycmlkZXMpXHJcblxyXG5cdFx0IC5mb3JFYWNoKGtleSA9PiB0aGlzLmVtaXQoa2V5LCBvdmVycmlkZXNba2V5XSkpO1xyXG5cclxuXHRcdCAvLyBzZXQgdGhlIG92ZXJyaWRlcyBhZnRlciBzbyB0aGUgZW1pdCBpcyBub3QgYmxvY2tlZFxyXG5cdFx0IHRoaXMuX292ZXJyaWRlcyA9IG92ZXJyaWRlcztcclxuXHQgfVxyXG59XHJcblxyXG5tb2R1bGUuZXhwb3J0cyA9IEtleVZhbHVlU3RvcmU7XHJcbiIsIi8qKlxyXG4gKiBBIGRhdGEgc3RvcmUgd2hpY2ggY29udGFpbnMgYSBwb29sIG9mIG9iamVjdHMgd2hpY2ggYXJlIHF1ZXJ5YWJsZSBieSBhbnkgcHJvcGVydHlcclxuICovXHJcblxyXG52YXIgRXZlbnRFbWl0dGVyID0gcmVxdWlyZShcIi4uL3V0aWwvZXZlbnQtZW1pdHRlclwiKTtcclxuXHJcbmNsYXNzIFBvb2xTdG9yZSBleHRlbmRzIEV2ZW50RW1pdHRlciB7XHJcblx0Y29uc3RydWN0b3IoYWRhcHRvciwgaW5pdEZuKSB7XHJcblx0XHRzdXBlcigpO1xyXG5cdFx0dGhpcy5fYWRhcHRvciA9IGFkYXB0b3I7XHJcblx0XHR0aGlzLl9pbml0Rm4gPSBpbml0Rm47XHJcblx0fVxyXG5cclxuXHQvKipcclxuXHQgKiBHZXQgYWxsIGl0ZW1zIG1hdGNpbmcgdGhlIHByb3ZpZGVkIHByb3BlcnRpZXNcclxuXHQgKi9cclxuXHRxdWVyeShwcm9wcywgZm4pIHtcclxuXHRcdC8vIGNoZWNrIGlmIGEgdmFsdWUgbWF0Y2hlcyB0aGUgcXVlcnlcclxuXHRcdHZhciBmaWx0ZXIgPSB2YWx1ZSA9PiB7XHJcblx0XHRcdC8vIG5vdCBhbiBpdGVtXHJcblx0XHRcdGlmKCF2YWx1ZSkgcmV0dXJuIGZhbHNlO1xyXG5cclxuXHRcdFx0Ly8gY2hlY2sgdGhhdCBhbGwgdGhlIHByb3BlcnRpZXMgbWF0Y2hcclxuXHRcdFx0cmV0dXJuIE9iamVjdC5nZXRPd25Qcm9wZXJ0eU5hbWVzKHByb3BzKVxyXG5cclxuXHRcdFx0LmV2ZXJ5KHByb3BOYW1lID0+IHtcclxuXHRcdFx0XHQvLyBhIGZ1bmN0aW9uIHRvIGNoZWNrIGlmIGEgdmFsdWUgbWF0Y2hlc1xyXG5cdFx0XHRcdGlmKHR5cGVvZiBwcm9wc1twcm9wTmFtZV0gPT0gXCJmdW5jdGlvblwiKSB7XHJcblx0XHRcdFx0XHRyZXR1cm4gcHJvcHNbcHJvcE5hbWVdKHZhbHVlW3Byb3BOYW1lXSk7XHJcblx0XHRcdFx0fVxyXG5cdFx0XHRcdC8vIHBsYWluIGVxdWFsaXR5XHJcblx0XHRcdFx0ZWxzZSB7XHJcblx0XHRcdFx0XHRyZXR1cm4gcHJvcHNbcHJvcE5hbWVdID09IHZhbHVlW3Byb3BOYW1lXVxyXG5cdFx0XHRcdH1cclxuXHRcdFx0fSk7XHJcblx0XHR9O1xyXG5cclxuXHRcdC8vIGdldCBhbGwgY3VycmVudCBpdGVtcyB0aGF0IG1hdGNoIHRoZSBmaWx0ZXJcclxuXHRcdHZhciBjdXJyZW50ID0gKFwiaWRcIiBpbiBwcm9wcykgP1xyXG5cdFx0XHR0aGlzLl9hZGFwdG9yLmdldChwcm9wcy5pZCkudGhlbih2YWx1ZSA9PiBbdmFsdWVdKTpcclxuXHRcdFx0dGhpcy5fYWRhcHRvci5nZXRBbGwoKTtcclxuXHJcblx0XHRjdXJyZW50ID0gY3VycmVudC50aGVuKHZhbHVlcyA9PiB7XHJcblx0XHRcdC8vIGZpbHRlciBvdXQgdGhlIHZhbHVlc1xyXG5cdFx0XHR2YWx1ZXMgPSB2YWx1ZXMuZmlsdGVyKGZpbHRlcik7XHJcblxyXG5cdFx0XHQvLyBkbyBhbnkgaW5pdGlhbGl6YXRpb25cclxuXHRcdFx0aWYodGhpcy5faW5pdEZuKSB7XHJcblx0XHRcdFx0dmFsdWVzID0gdmFsdWVzLm1hcCh2YWx1ZSA9PiB0aGlzLl9pbml0Rm4odmFsdWUpIHx8IHZhbHVlKTtcclxuXHRcdFx0fVxyXG5cclxuXHRcdFx0cmV0dXJuIHZhbHVlcztcclxuXHRcdH0pO1xyXG5cclxuXHRcdC8vIG9wdGlvbmFseSBydW4gY2hhbmdlcyB0aHJvdWdoIHRoZSBxdWVyeSBhcyB3ZWxsXHJcblx0XHRpZih0eXBlb2YgZm4gPT0gXCJmdW5jdGlvblwiKSB7XHJcblx0XHRcdGxldCBzdWJzY3JpcHRpb24sIHN0b3BwZWQ7XHJcblxyXG5cdFx0XHQvLyB3cmFwIHRoZSB2YWx1ZXMgaW4gY2hhbmdlIG9iamVjdHMgYW5kIHNlbmQgdGhlIHRvIHRoZSBjb25zdW1lclxyXG5cdFx0XHRjdXJyZW50LnRoZW4odmFsdWVzID0+IHtcclxuXHRcdFx0XHQvLyBkb24ndCBsaXN0ZW4gaWYgdW5zdWJzY3JpYmUgd2FzIGFscmVhZHkgY2FsbGVkXHJcblx0XHRcdFx0aWYoc3RvcHBlZCkgcmV0dXJuO1xyXG5cclxuXHRcdFx0XHQvLyBzZW5kIHRoZSB2YWx1ZXMgd2UgY3VycmVudGx5IGhhdmVcclxuXHRcdFx0XHRmbih2YWx1ZXMuc2xpY2UoMCkpO1xyXG5cclxuXHRcdFx0XHQvLyB3YXRjaCBmb3IgY2hhbmdlcyBhZnRlciB0aGUgaW5pdGlhbCB2YWx1ZXMgYXJlIHNlbmRcclxuXHRcdFx0XHRzdWJzY3JpcHRpb24gPSB0aGlzLm9uKFwiY2hhbmdlXCIsIGNoYW5nZSA9PiB7XHJcblx0XHRcdFx0XHQvLyBmaW5kIHRoZSBwcmV2aW91cyB2YWx1ZVxyXG5cdFx0XHRcdFx0dmFyIGluZGV4ID0gdmFsdWVzLmZpbmRJbmRleCh2YWx1ZSA9PiB2YWx1ZS5pZCA9PSBjaGFuZ2UuaWQpO1xyXG5cclxuXHRcdFx0XHRcdGlmKGNoYW5nZS50eXBlID09IFwiY2hhbmdlXCIpIHtcclxuXHRcdFx0XHRcdFx0Ly8gY2hlY2sgaWYgdGhlIHZhbHVlIG1hdGNoZXMgdGhlIHF1ZXJ5XHJcblx0XHRcdFx0XHRcdGxldCBtYXRjaGVzID0gZmlsdGVyKGNoYW5nZS52YWx1ZSk7XHJcblxyXG5cdFx0XHRcdFx0XHRpZihtYXRjaGVzKSB7XHJcblx0XHRcdFx0XHRcdFx0Ly8gZnJlc2hseSBjcmVhdGVkXHJcblx0XHRcdFx0XHRcdFx0aWYoaW5kZXggPT09IC0xKSB7XHJcblx0XHRcdFx0XHRcdFx0XHRsZXQge3ZhbHVlfSA9IGNoYW5nZTtcclxuXHJcblx0XHRcdFx0XHRcdFx0XHQvLyBkbyBhbnkgaW5pdGlhbGl6YXRpb25cclxuXHRcdFx0XHRcdFx0XHRcdGlmKHRoaXMuX2luaXRGbikge1xyXG5cdFx0XHRcdFx0XHRcdFx0XHR2YWx1ZSA9IHRoaXMuX2luaXRGbih2YWx1ZSkgfHwgdmFsdWU7XHJcblx0XHRcdFx0XHRcdFx0XHR9XHJcblxyXG5cdFx0XHRcdFx0XHRcdFx0dmFsdWVzLnB1c2godmFsdWUpO1xyXG5cdFx0XHRcdFx0XHRcdH1cclxuXHRcdFx0XHRcdFx0XHQvLyB1cGRhdGUgYW4gZXhpc3RpbmcgdmFsdWVcclxuXHRcdFx0XHRcdFx0XHRlbHNlIHtcclxuXHRcdFx0XHRcdFx0XHRcdHZhbHVlc1tpbmRleF0gPSBjaGFuZ2UudmFsdWU7XHJcblx0XHRcdFx0XHRcdFx0fVxyXG5cclxuXHRcdFx0XHRcdFx0XHRmbih2YWx1ZXMuc2xpY2UoMCkpO1xyXG5cdFx0XHRcdFx0XHR9XHJcblx0XHRcdFx0XHRcdC8vIHRlbGwgdGhlIGNvbnN1bWVyIHRoaXMgdmFsdWUgbm8gbG9uZ2VyIG1hdGNoZXNcclxuXHRcdFx0XHRcdFx0ZWxzZSBpZihpbmRleCAhPT0gLTEpIHtcclxuXHRcdFx0XHRcdFx0XHQvLyByZW1vdmUgdGhlIGl0ZW1cclxuXHRcdFx0XHRcdFx0XHRpZihpbmRleCAhPT0gLTEpIHtcclxuXHRcdFx0XHRcdFx0XHRcdHZhbHVlcy5zcGxpY2UoaW5kZXgsIDEpO1xyXG5cdFx0XHRcdFx0XHRcdH1cclxuXHJcblx0XHRcdFx0XHRcdFx0Zm4odmFsdWVzLnNsaWNlKDApKTtcclxuXHRcdFx0XHRcdFx0fVxyXG5cdFx0XHRcdFx0fVxyXG5cdFx0XHRcdFx0ZWxzZSBpZihjaGFuZ2UudHlwZSA9PSBcInJlbW92ZVwiICYmIGluZGV4ICE9PSAtMSkge1xyXG5cdFx0XHRcdFx0XHQvLyByZW1vdmUgdGhlIGl0ZW1cclxuXHRcdFx0XHRcdFx0aWYoaW5kZXggIT09IC0xKSB7XHJcblx0XHRcdFx0XHRcdFx0dmFsdWVzLnNwbGljZShpbmRleCwgMSk7XHJcblx0XHRcdFx0XHRcdH1cclxuXHJcblx0XHRcdFx0XHRcdGZuKHZhbHVlcy5zbGljZSgwKSk7XHJcblx0XHRcdFx0XHR9XHJcblx0XHRcdFx0fSk7XHJcblx0XHRcdH0pO1xyXG5cclxuXHRcdFx0cmV0dXJuIHtcclxuXHRcdFx0XHR1bnN1YnNjcmliZSgpIHtcclxuXHRcdFx0XHRcdC8vIGlmIHdlIGFyZSBsaXN0ZW5pbmcgc3RvcFxyXG5cdFx0XHRcdFx0aWYoc3Vic2NyaXB0aW9uKSB7XHJcblx0XHRcdFx0XHRcdHN1YnNjcmlwdGlvbi51bnN1YnNjcmliZSgpXHJcblx0XHRcdFx0XHR9XHJcblxyXG5cdFx0XHRcdFx0Ly8gZG9uJ3QgbGlzdGVuXHJcblx0XHRcdFx0XHRzdG9wcGVkID0gdHJ1ZTtcclxuXHRcdFx0XHR9XHJcblx0XHRcdH1cclxuXHRcdH1cclxuXHRcdGVsc2Uge1xyXG5cdFx0XHRyZXR1cm4gY3VycmVudDtcclxuXHRcdH1cclxuXHR9XHJcblxyXG5cdC8qKlxyXG5cdCAqIFN0b3JlIGEgdmFsdWUgaW4gdGhlIHBvb2xcclxuXHQgKi9cclxuXHRzZXQodmFsdWUpIHtcclxuXHRcdC8vIHNldCB0aGUgbW9kaWZpZWQgZGF0ZVxyXG5cdFx0dmFsdWUubW9kaWZpZWQgPSBEYXRlLm5vdygpO1xyXG5cclxuXHRcdC8vIHN0b3JlIHRoZSB2YWx1ZSBpbiB0aGUgYWRhcHRvclxyXG5cdFx0dmFyIHJlc3VsdCA9IHRoaXMuX2FkYXB0b3Iuc2V0KHZhbHVlKTtcclxuXHJcblx0XHQvLyBwcm9wb2dhdGUgdGhlIGNoYW5nZVxyXG5cdFx0dGhpcy5lbWl0KFwiY2hhbmdlXCIsIHtcclxuXHRcdFx0dHlwZTogXCJjaGFuZ2VcIixcclxuXHRcdFx0aWQ6IHZhbHVlLmlkLFxyXG5cdFx0XHR2YWx1ZVxyXG5cdFx0fSk7XHJcblxyXG5cdFx0cmV0dXJuIHJlc3VsdDtcclxuXHR9XHJcblxyXG5cdC8qKlxyXG5cdCAqIFJlbW92ZSBhIHZhbHVlIGZyb20gdGhlIHBvb2xcclxuXHQgKi9cclxuXHRyZW1vdmUoaWQpIHtcclxuXHRcdC8vIHJlbW92ZSB0aGUgdmFsdWUgZnJvbSB0aGUgYWRhcHRvclxyXG5cdFx0dmFyIHJlc3VsdCA9IHRoaXMuX2FkYXB0b3IucmVtb3ZlKGlkLCBEYXRlLm5vdygpKTtcclxuXHJcblx0XHQvLyBwcm9wb2dhdGUgdGhlIGNoYW5nZVxyXG5cdFx0dGhpcy5lbWl0KFwiY2hhbmdlXCIsIHtcclxuXHRcdFx0dHlwZTogXCJyZW1vdmVcIixcclxuXHRcdFx0aWRcclxuXHRcdH0pO1xyXG5cclxuXHRcdHJldHVybiByZXN1bHQ7XHJcblx0fVxyXG59XHJcblxyXG5tb2R1bGUuZXhwb3J0cyA9IFBvb2xTdG9yZTtcclxuIiwiLyoqXHJcbiAqIEEgd3JhcHBlciB0aGF0IHN5bmNyb25pemVzIGxvY2FsIGNoYW5nZXMgd2l0aCBhIHJlbW90ZSBob3N0XHJcbiAqL1xyXG5cclxudmFyIEtleVZhbHVlU3RvcmUgPSByZXF1aXJlKFwiLi9rZXktdmFsdWUtc3RvcmVcIik7XHJcbnZhciBFdmVudEVtaXR0ZXIgPSByZXF1aXJlKFwiLi4vdXRpbC9ldmVudC1lbWl0dGVyXCIpO1xyXG5cclxuY2xhc3MgU3luY2VyIGV4dGVuZHMgRXZlbnRFbWl0dGVyIHtcclxuXHRjb25zdHJ1Y3RvcihvcHRzKSB7XHJcblx0XHRzdXBlcigpO1xyXG5cclxuXHRcdHRoaXMuX2xvY2FsID0gb3B0cy5sb2NhbDtcclxuXHRcdHRoaXMuX3JlbW90ZSA9IG9wdHMucmVtb3RlO1xyXG5cdFx0dGhpcy5fY2hhbmdlU3RvcmUgPSBuZXcgS2V5VmFsdWVTdG9yZShvcHRzLmNoYW5nZVN0b3JlKTtcclxuXHRcdHRoaXMuX2NoYW5nZXNOYW1lID0gb3B0cy5jaGFuZ2VzTmFtZSB8fCBcImNoYW5nZXNcIjtcclxuXHJcblx0XHQvLyBzYXZlIGFsbCB0aGUgaWRzIHRvIG9wdGltaXplIGNyZWF0ZXNcclxuXHRcdHRoaXMuX2lkcyA9IHRoaXMuZ2V0QWxsKClcclxuXHRcdFx0LnRoZW4oYWxsID0+IGFsbC5tYXAodmFsdWUgPT4gdmFsdWUuaWQpKTtcclxuXHR9XHJcblxyXG5cdC8vIHBhc3MgdGhyb3VnaCBnZXQgYW5kIGdldEFsbFxyXG5cdGdldEFsbCgpIHsgcmV0dXJuIHRoaXMuX2xvY2FsLmdldEFsbCgpOyB9XHJcblx0Z2V0KGtleSkgeyByZXR1cm4gdGhpcy5fbG9jYWwuZ2V0KGtleSk7IH1cclxuXHJcblx0Ly8ga2VlcCB0cmFjayBvZiBhbnkgY3JlYXRlZCB2YWx1ZXNcclxuXHRzZXQodmFsdWUpIHtcclxuXHRcdC8vIGNoZWNrIGlmIHRoaXMgaXMgYSBjcmVhdGVcclxuXHRcdHRoaXMuX2lkcyA9IHRoaXMuX2lkcy50aGVuKGlkcyA9PiB7XHJcblx0XHRcdC8vIG5ldyB2YWx1ZVxyXG5cdFx0XHRpZihpZHMuaW5kZXhPZih2YWx1ZS5pZCkgPT09IC0xKSB7XHJcblx0XHRcdFx0aWRzLnB1c2godmFsdWUuaWQpO1xyXG5cclxuXHRcdFx0XHQvLyBzYXZlIHRoZSBjaGFuZ2VcclxuXHRcdFx0XHR0aGlzLl9jaGFuZ2UoXCJjcmVhdGVcIiwgdmFsdWUuaWQpO1xyXG5cdFx0XHR9XHJcblxyXG5cdFx0XHRyZXR1cm4gaWRzO1xyXG5cdFx0fSk7XHJcblxyXG5cdFx0Ly8gc3RvcmUgdGhlIHZhbHVlXHJcblx0XHRyZXR1cm4gdGhpcy5faWRzLnRoZW4oKCkgPT4gdGhpcy5fbG9jYWwuc2V0KHZhbHVlKSk7XHJcblx0fVxyXG5cclxuXHQvLyBrZWVwIHRyYWNrIG9mIGRlbGV0ZWQgdmFsdWVzXHJcblx0cmVtb3ZlKGtleSkge1xyXG5cdFx0dGhpcy5faWRzID0gdGhpcy5faWRzLnRoZW4oaWRzID0+IHtcclxuXHRcdFx0Ly8gcmVtb3ZlIHRoaXMgZnJvbSB0aGUgYWxsIGlkcyBsaXN0XHJcblx0XHRcdHZhciBpbmRleCA9IGlkcy5pbmRleE9mKGtleSk7XHJcblxyXG5cdFx0XHRpZihpbmRleCAhPT0gLTEpIHtcclxuXHRcdFx0XHRpZHMuc3BsaWNlKGluZGV4LCAxKTtcclxuXHRcdFx0fVxyXG5cclxuXHRcdFx0Ly8gc2F2ZSB0aGUgY2hhbmdlXHJcblx0XHRcdHRoaXMuX2NoYW5nZShcInJlbW92ZVwiLCBrZXkpO1xyXG5cdFx0fSk7XHJcblxyXG5cdFx0Ly8gcmVtb3ZlIHRoZSBhY3R1YWwgdmFsdWVcclxuXHRcdHJldHVybiB0aGlzLl9pZHMudGhlbigoKSA9PiB0aGlzLl9sb2NhbC5yZW1vdmUoa2V5KSk7XHJcblx0fVxyXG5cclxuXHQvLyBzdG9yZSBhIGNoYW5nZSBpbiB0aGUgY2hhbmdlIHN0b3JlXHJcblx0X2NoYW5nZSh0eXBlLCBpZCkge1xyXG5cdFx0Ly8gZ2V0IHRoZSBjaGFuZ2VzXHJcblx0XHR0aGlzLl9jaGFuZ2VTdG9yZS5nZXQodGhpcy5fY2hhbmdlc05hbWUsIFtdKVxyXG5cclxuXHRcdC50aGVuKGNoYW5nZXMgPT4ge1xyXG5cdFx0XHQvLyBhZGQgdGhlIGNoYW5nZVxyXG5cdFx0XHRjaGFuZ2VzLnB1c2goeyB0eXBlLCBpZCwgdGltZXN0YW1wOiBEYXRlLm5vdygpIH0pO1xyXG5cclxuXHRcdFx0Ly8gc2F2ZSB0aGUgY2hhbmdlc1xyXG5cdFx0XHRyZXR1cm4gdGhpcy5fY2hhbmdlU3RvcmUuc2V0KHRoaXMuX2NoYW5nZXNOYW1lLCBjaGFuZ2VzKTtcclxuXHRcdH0pO1xyXG5cdH1cclxuXHJcblx0Ly8gc3luYyB0aGUgdHdvIHN0b3Jlc1xyXG5cdHN5bmMoKSB7XHJcblx0XHQvLyBvbmx5IHJ1biBvbmUgc3luYyBhdCBhIHRpbWVcclxuXHRcdGlmKHRoaXMuX3N5bmNpbmcpIHJldHVybiB0aGlzLl9zeW5jaW5nO1xyXG5cclxuXHRcdHZhciByZXRyeUNvdW50ID0gMztcclxuXHRcdHZhciAkc3luYyA9IG5ldyBTeW5jKHRoaXMuX2xvY2FsLCB0aGlzLl9yZW1vdGUsIHRoaXMuX2NoYW5nZVN0b3JlLCB0aGlzLl9jaGFuZ2VzTmFtZSk7XHJcblxyXG5cdFx0Ly8gcGFzcyBvbiB0aGUgcHJvZ3Jlc3NcclxuXHRcdHZhciBzdWIgPSAkc3luYy5vbihcInByb2dyZXNzXCIsIHZhbHVlID0+IHRoaXMuZW1pdChcInByb2dyZXNzXCIsIHZhbHVlKSk7XHJcblxyXG5cdFx0dmFyIHN5bmMgPSAoKSA9PiB7XHJcblx0XHRcdC8vIHRlbGwgdGhlIHVpIHdlIGFyZSBzeW5jaW5nXHJcblx0XHRcdHRoaXMuZW1pdChcInN5bmMtc3RhcnRcIik7XHJcblxyXG5cdFx0XHQvLyBhdHRlbXB0IHRvIHN5bmNcclxuXHRcdFx0cmV0dXJuICRzeW5jLnN5bmMoKVxyXG5cclxuXHRcdFx0LnRoZW4oKCkgPT4ge1xyXG5cdFx0XHRcdC8vIHRoZSB0aGUgdWkgdGhlIHN5bmMgaGFzIHN1Y2NlZWRlZFxyXG5cdFx0XHRcdHRoaXMuZW1pdChcInN5bmMtY29tcGxldGVcIiwgeyBmYWlsZWQ6IGZhbHNlIH0pO1xyXG5cdFx0XHR9KVxyXG5cclxuXHRcdFx0LmNhdGNoKGVyciA9PiB7XHJcblx0XHRcdFx0dmFyIHJldHJ5aW5nID0gcmV0cnlDb3VudC0tID4gMCAmJiAodHlwZW9mIG5hdmlnYXRvciAhPSBcIm9iamVjdFwiIHx8IG5hdmlnYXRvci5vbkxpbmUpO1xyXG5cclxuXHRcdFx0XHQvLyB0ZWxsIHRoZSB1aSB0aGUgc3luYyBmYWlsZWRcclxuXHRcdFx0XHR0aGlzLmVtaXQoXCJzeW5jLWNvbXBsZXRlXCIsIHsgcmV0cnlpbmcsIGZhaWxlZDogdHJ1ZSB9KTtcclxuXHJcblx0XHRcdFx0Ly8gcmV0cnkgaWYgaXQgZmFpbHNcclxuXHRcdFx0XHRpZihyZXRyeWluZykge1xyXG5cdFx0XHRcdFx0cmV0dXJuIG5ldyBQcm9taXNlKHJlc29sdmUgPT4ge1xyXG5cdFx0XHRcdFx0XHQvLyB3YWl0IDEgc2Vjb25kXHJcblx0XHRcdFx0XHRcdHNldFRpbWVvdXQoKCkgPT4gcmVzb2x2ZShzeW5jKCkpLCAxMDAwKTtcclxuXHRcdFx0XHRcdH0pO1xyXG5cdFx0XHRcdH1cclxuXHRcdFx0fSk7XHJcblx0XHR9O1xyXG5cclxuXHRcdC8vIHN0YXJ0IHRoZSBzeW5jXHJcblx0XHR0aGlzLl9zeW5jaW5nID0gc3luYygpXHJcblxyXG5cdFx0Ly8gcmVsZWFzZSB0aGUgbG9ja1xyXG5cdFx0LnRoZW4oKCkgPT4ge1xyXG5cdFx0XHR0aGlzLl9zeW5jaW5nID0gdW5kZWZpbmVkO1xyXG5cdFx0XHRzdWIudW5zdWJzY3JpYmUoKTtcclxuXHRcdH0pO1xyXG5cclxuXHRcdHJldHVybiB0aGlzLl9zeW5jaW5nO1xyXG5cdH1cclxuXHJcblx0Ly8gZ2V0IHRoZSByZW1vdGUgYWNjZXNzIGxldmVsXHJcblx0YWNjZXNzTGV2ZWwoKSB7XHJcblx0XHRyZXR1cm4gdGhpcy5fcmVtb3RlLmFjY2Vzc0xldmVsKClcclxuXHJcblx0XHQvLyBpZiBhbnl0aGluZyBnb2VzIHdyb25nIGFzc3VtZSBmdWxsIHBlcm1pc3Npb25zXHJcblx0XHQuY2F0Y2goKCkgPT4gXCJmdWxsXCIpO1xyXG5cdH1cclxufVxyXG5cclxuLy8gYSBzaW5nbGUgc3luY1xyXG5jbGFzcyBTeW5jIGV4dGVuZHMgRXZlbnRFbWl0dGVyIHtcclxuXHRjb25zdHJ1Y3Rvcihsb2NhbCwgcmVtb3RlLCBjaGFuZ2VTdG9yZSwgY2hhbmdlc05hbWUpIHtcclxuXHRcdHN1cGVyKCk7XHJcblx0XHR0aGlzLl9sb2NhbCA9IGxvY2FsO1xyXG5cdFx0dGhpcy5fcmVtb3RlID0gcmVtb3RlO1xyXG5cdFx0dGhpcy5fY2hhbmdlU3RvcmUgPSBjaGFuZ2VTdG9yZTtcclxuXHRcdHRoaXMuX2NoYW5nZXNOYW1lID0gY2hhbmdlc05hbWU7XHJcblx0XHR0aGlzLl9wcm9ncmVzcyA9IDA7XHJcblx0fVxyXG5cclxuXHRzdGVwUHJvZ3Jlc3MoKSB7XHJcblx0XHR0aGlzLl9wcm9ncmVzcyArPSAxIC8gNztcclxuXHJcblx0XHR0aGlzLmVtaXQoXCJwcm9ncmVzc1wiLCB0aGlzLl9wcm9ncmVzcyk7XHJcblx0fVxyXG5cclxuXHRzeW5jKCkge1xyXG5cdFx0dGhpcy5zdGVwUHJvZ3Jlc3MoKTtcclxuXHJcblx0XHQvLyBnZXQgdGhlIGlkcyBhbmQgbGFzdCBtb2RpZmllZCBkYXRlcyBmb3IgYWxsIHJlbW90ZSB2YWx1ZXNcclxuXHRcdHJldHVybiB0aGlzLmdldE1vZGlmaWVkcygpXHJcblxyXG5cdFx0LnRoZW4obW9kaWZpZWRzID0+IHtcclxuXHRcdFx0dGhpcy5zdGVwUHJvZ3Jlc3MoKTtcclxuXHJcblx0XHRcdC8vIHJlbW92ZSB0aGUgdmFsdWVzIHdlIGRlbGV0ZWQgZnJvbSB0aGUgcmVtb3RlIGhvc3RcclxuXHRcdFx0cmV0dXJuIHRoaXMucmVtb3ZlKG1vZGlmaWVkcylcclxuXHJcblx0XHRcdC8vIG1lcmdlIG1vZGlmaWVkIHZhbHVlc1xyXG5cdFx0XHQudGhlbigoKSA9PiB7XHJcblx0XHRcdFx0dGhpcy5zdGVwUHJvZ3Jlc3MoKTtcclxuXHJcblx0XHRcdFx0cmV0dXJuIHRoaXMubWVyZ2VNb2RpZmllZHMobW9kaWZpZWRzKTtcclxuXHRcdFx0fSk7XHJcblx0XHR9KVxyXG5cclxuXHRcdC50aGVuKHJlbW90ZURlbGV0ZXMgPT4ge1xyXG5cdFx0XHR0aGlzLnN0ZXBQcm9ncmVzcygpO1xyXG5cclxuXHRcdFx0Ly8gc2VuZCB2YWx1ZXMgd2UgY3JlYXRlZCBzaW5jZSB0aGUgbGFzdCBzeW5jXHJcblx0XHRcdHJldHVybiB0aGlzLmNyZWF0ZShyZW1vdGVEZWxldGVzKVxyXG5cclxuXHRcdFx0Ly8gcmVtb3ZlIGFueSBpdGVtcyB0aGF0IHdoZXJlIGRlbGV0ZWQgcmVtb3RseVxyXG5cdFx0XHQudGhlbigoKSA9PiB7XHJcblx0XHRcdFx0dGhpcy5zdGVwUHJvZ3Jlc3MoKTtcclxuXHJcblx0XHRcdFx0cmV0dXJuIHRoaXMuYXBwbHlEZWxldGVzKHJlbW90ZURlbGV0ZXMpO1xyXG5cdFx0XHR9KTtcclxuXHRcdH0pXHJcblxyXG5cdFx0Ly8gY2xlYXIgdGhlIGNoYW5nZXNcclxuXHRcdC50aGVuKCgpID0+IHtcclxuXHRcdFx0dGhpcy5zdGVwUHJvZ3Jlc3MoKTtcclxuXHJcblx0XHRcdHJldHVybiB0aGlzLl9jaGFuZ2VTdG9yZS5zZXQodGhpcy5fY2hhbmdlc05hbWUsIFtdKTtcclxuXHRcdH0pXHJcblxyXG5cdFx0LnRoZW4oKCkgPT4ge1xyXG5cdFx0XHR0aGlzLnN0ZXBQcm9ncmVzcygpO1xyXG5cdFx0fSk7XHJcblx0fVxyXG5cclxuXHQvLyBnZXQgdGhlIGxhc3QgbW9kaWZpZWQgdGltZXMgZm9yIGVhY2ggdmFsdWVcclxuXHRnZXRNb2RpZmllZHMoKSB7XHJcblx0XHR0aGlzLl9pdGVtcyA9IHt9O1xyXG5cclxuXHRcdHJldHVybiB0aGlzLl9yZW1vdGUuZ2V0QWxsKClcclxuXHJcblx0XHQudGhlbih2YWx1ZXMgPT4ge1xyXG5cdFx0XHR2YXIgbW9kaWZpZWRzID0ge307XHJcblxyXG5cdFx0XHRmb3IobGV0IHZhbHVlIG9mIHZhbHVlcykge1xyXG5cdFx0XHRcdC8vIHN0b3JlIHRoZSBpdGVtc1xyXG5cdFx0XHRcdHRoaXMuX2l0ZW1zW3ZhbHVlLmlkXSA9IHZhbHVlO1xyXG5cdFx0XHRcdC8vIGdldCB0aGUgbW9kaWZpZWQgdGltZXNcclxuXHRcdFx0XHRtb2RpZmllZHNbdmFsdWUuaWRdID0gdmFsdWUubW9kaWZpZWQ7XHJcblx0XHRcdH1cclxuXHJcblx0XHRcdHJldHVybiBtb2RpZmllZHM7XHJcblx0XHR9KTtcclxuXHR9XHJcblxyXG5cdC8vIHJlbW92ZSB2YWx1ZXMgd2UgaGF2ZSBkZWxldGVkIHNpbmNlIHRoZSBsYXN0IHN5bmNcclxuXHRyZW1vdmUobW9kaWZpZWRzKSB7XHJcblx0XHRyZXR1cm4gdGhpcy5fY2hhbmdlU3RvcmUuZ2V0KHRoaXMuX2NoYW5nZXNOYW1lLCBbXSlcclxuXHJcblx0XHQudGhlbihjaGFuZ2VzID0+IHtcclxuXHRcdFx0dmFyIHByb21pc2VzID0gW107XHJcblxyXG5cdFx0XHQvLyByZW1vdmUgdGhlIGl0ZW1zIHdlIHJlbW92ZSBmcm9tIG1vZGlmaWVkc1xyXG5cdFx0XHRmb3IobGV0IGNoYW5nZSBvZiBjaGFuZ2VzKSB7XHJcblx0XHRcdFx0aWYoY2hhbmdlLnR5cGUgPT0gXCJyZW1vdmVcIiAmJiBjaGFuZ2UudGltZXN0YW1wID49IG1vZGlmaWVkc1tjaGFuZ2UuaWRdKSB7XHJcblx0XHRcdFx0XHQvLyBkb24ndCB0cnkgdG8gY3JlYXRlIHRoZSBpdGVtIGxvY2FsbHlcclxuXHRcdFx0XHRcdGRlbGV0ZSBtb2RpZmllZHNbY2hhbmdlLmlkXTtcclxuXHJcblx0XHRcdFx0XHQvLyBkZWxldGUgaXQgcmVtb3RlbHlcclxuXHRcdFx0XHRcdHByb21pc2VzLnB1c2godGhpcy5fcmVtb3RlLnJlbW92ZShjaGFuZ2UuaWQpKVxyXG5cdFx0XHRcdH1cclxuXHRcdFx0fVxyXG5cclxuXHRcdFx0cmV0dXJuIFByb21pc2UuYWxsKHByb21pc2VzKTtcclxuXHRcdH0pO1xyXG5cdH1cclxuXHJcblx0Ly8gdXBkYXRlIHRoZSBsb2NhbC9yZW1vdGUgdmFsdWVzIHRoYXQgd2hlcmUgY2hhbmdlZFxyXG5cdG1lcmdlTW9kaWZpZWRzKG1vZGlmaWVkcykge1xyXG5cdFx0dmFyIHJlbW90ZURlbGV0ZXMgPSBbXTtcclxuXHJcblx0XHQvLyBnbyB0aHJvdWdoIGFsbCB0aGUgbW9kaWZpZWRzXHJcblx0XHRyZXR1cm4gdGhpcy5fbG9jYWwuZ2V0QWxsKClcclxuXHJcblx0XHQudGhlbih2YWx1ZXMgPT4ge1xyXG5cdFx0XHR2YXIgcHJvbWlzZXMgPSBbXTtcclxuXHJcblx0XHRcdC8vIGNoZWNrIGFsbCB0aGUgbG9jYWwgdmFsdWVzIGFnYWluc3QgdGhlIHJlbW90ZSBvbmVzXHJcblx0XHRcdGZvcihsZXQgdmFsdWUgb2YgdmFsdWVzKSB7XHJcblx0XHRcdFx0Ly8gZGVsZXRlZCBmcm9tIHRoZSByZW1vdGUgYWRhcHRvclxyXG5cdFx0XHRcdGlmKCFtb2RpZmllZHNbdmFsdWUuaWRdKSB7XHJcblx0XHRcdFx0XHRyZW1vdGVEZWxldGVzLnB1c2godmFsdWUuaWQpO1xyXG5cdFx0XHRcdH1cclxuXHRcdFx0XHQvLyB0aGUgcmVtb3RlIHZlcnNpb24gaXMgbmV3ZXJcclxuXHRcdFx0XHRlbHNlIGlmKG1vZGlmaWVkc1t2YWx1ZS5pZF0gPiB2YWx1ZS5tb2RpZmllZCkge1xyXG5cdFx0XHRcdFx0cHJvbWlzZXMucHVzaChcclxuXHRcdFx0XHRcdFx0Ly8gZmV0Y2ggdGhlIHJlbW90ZSB2YWx1ZVxyXG5cdFx0XHRcdFx0XHR0aGlzLmdldCh2YWx1ZS5pZClcclxuXHJcblx0XHRcdFx0XHRcdC50aGVuKG5ld1ZhbHVlID0+IHRoaXMuX2xvY2FsLnNldChuZXdWYWx1ZSkpXHJcblx0XHRcdFx0XHQpO1xyXG5cdFx0XHRcdH1cclxuXHRcdFx0XHQvLyB0aGUgbG9jYWwgdmVyc2lvbiBpcyBuZXdlclxyXG5cdFx0XHRcdGVsc2UgaWYobW9kaWZpZWRzW3ZhbHVlLmlkXSA8IHZhbHVlLm1vZGlmaWVkKSB7XHJcblx0XHRcdFx0XHRwcm9taXNlcy5wdXNoKHRoaXMuX3JlbW90ZS5zZXQodmFsdWUpKTtcclxuXHRcdFx0XHR9XHJcblxyXG5cdFx0XHRcdC8vIHJlbW92ZSBpdGVtcyB3ZSBhbHJlYWR5IGhhdmUgZnJvbSB0aGUgY3JlYXRlc1xyXG5cdFx0XHRcdGlmKG1vZGlmaWVkc1t2YWx1ZS5pZF0pIHtcclxuXHRcdFx0XHRcdGRlbGV0ZSBtb2RpZmllZHNbdmFsdWUuaWRdO1xyXG5cdFx0XHRcdH1cclxuXHRcdFx0fVxyXG5cclxuXHRcdFx0Ly8gZ2V0IHZhbHVlcyBmcm9tIHRoZSByZW1vdGUgd2UgYXJlIG1pc3NpbmdcclxuXHRcdFx0Zm9yKGxldCBpZCBvZiBPYmplY3QuZ2V0T3duUHJvcGVydHlOYW1lcyhtb2RpZmllZHMpKSB7XHJcblx0XHRcdFx0cHJvbWlzZXMucHVzaChcclxuXHRcdFx0XHRcdHRoaXMuZ2V0KGlkKVxyXG5cclxuXHRcdFx0XHRcdC50aGVuKG5ld1ZhbHVlID0+IHRoaXMuX2xvY2FsLnNldChuZXdWYWx1ZSkpXHJcblx0XHRcdFx0KTtcclxuXHRcdFx0fVxyXG5cclxuXHRcdFx0cmV0dXJuIFByb21pc2UuYWxsKHByb21pc2VzKTtcclxuXHRcdH0pXHJcblxyXG5cdFx0Ly8gcmV0dXJuIHRoZSBkZWxldGVzXHJcblx0XHQudGhlbigoKSA9PiByZW1vdGVEZWxldGVzKTtcclxuXHR9XHJcblxyXG5cdC8vIGdldCBhIHJlbW90ZSB2YWx1ZVxyXG5cdGdldChpZCkge1xyXG5cdFx0cmV0dXJuIFByb21pc2UucmVzb2x2ZSh0aGlzLl9pdGVtc1tpZF0pO1xyXG5cdH1cclxuXHJcblx0Ly8gc2VuZCBjcmVhdGVkIHZhbHVlcyB0byB0aGUgc2VydmVyXHJcblx0Y3JlYXRlKHJlbW90ZURlbGV0ZXMpIHtcclxuXHRcdHJldHVybiB0aGlzLl9jaGFuZ2VTdG9yZS5nZXQodGhpcy5fY2hhbmdlc05hbWUpXHJcblxyXG5cdFx0LnRoZW4oKGNoYW5nZXMgPSBbXSkgPT4ge1xyXG5cdFx0XHR2YXIgcHJvbWlzZXMgPSBbXTtcclxuXHJcblx0XHRcdC8vIHJlbW92ZSB0aGUgaXRlbXMgd2UgcmVtb3ZlIGZyb20gbW9kaWZpZWRzXHJcblx0XHRcdGZvcihsZXQgY2hhbmdlIG9mIGNoYW5nZXMpIHtcclxuXHRcdFx0XHRpZihjaGFuZ2UudHlwZSA9PSBcImNyZWF0ZVwiKSB7XHJcblx0XHRcdFx0XHQvLyBpZiB3ZSBtYXJrZWQgdGhpcyB2YWx1ZSBhcyBhIGRlbGV0ZSB1bmRvIHRoYXRcclxuXHRcdFx0XHRcdGxldCBpbmRleCA9IHJlbW90ZURlbGV0ZXMuaW5kZXhPZihjaGFuZ2UuaWQpO1xyXG5cclxuXHRcdFx0XHRcdGlmKGluZGV4ICE9PSAtMSkge1xyXG5cdFx0XHRcdFx0XHRyZW1vdGVEZWxldGVzLnNwbGljZShpbmRleCwgMSk7XHJcblx0XHRcdFx0XHR9XHJcblxyXG5cdFx0XHRcdFx0Ly8gc2F2ZSB0aGUgdmFsdWUgdG8gdGhlIHJlbW90ZVxyXG5cdFx0XHRcdFx0cHJvbWlzZXMucHVzaChcclxuXHRcdFx0XHRcdFx0dGhpcy5fbG9jYWwuZ2V0KGNoYW5nZS5pZClcclxuXHJcblx0XHRcdFx0XHRcdC50aGVuKHZhbHVlID0+IHRoaXMuX3JlbW90ZS5zZXQodmFsdWUpKVxyXG5cdFx0XHRcdFx0KTtcclxuXHRcdFx0XHR9XHJcblx0XHRcdH1cclxuXHJcblx0XHRcdHJldHVybiBQcm9taXNlLmFsbChwcm9taXNlcyk7XHJcblx0XHR9KTtcclxuXHR9XHJcblxyXG5cdC8vIGRlbGV0ZSB2YWx1ZXMgdGhhdCB3aGVyZSBkZWxldGVkIGZyb20gdGhlIHJlbW90ZSBob3N0XHJcblx0YXBwbHlEZWxldGVzKHJlbW90ZURlbGV0ZXMpIHtcclxuXHRcdHJldHVybiBQcm9taXNlLmFsbChyZW1vdGVEZWxldGVzLm1hcChpZCA9PiB0aGlzLl9sb2NhbC5yZW1vdmUoaWQpKSk7XHJcblx0fVxyXG59XHJcblxyXG5tb2R1bGUuZXhwb3J0cyA9IFN5bmNlcjtcclxuIiwiLyoqXHJcbiAqIENyZWF0ZSBhIGdsb2JhbCBvYmplY3Qgd2l0aCBjb21tb25seSB1c2VkIG1vZHVsZXMgdG8gYXZvaWQgNTAgbWlsbGlvbiByZXF1aXJlc1xyXG4gKi9cclxuXHJcbnZhciBFdmVudEVtaXR0ZXIgPSByZXF1aXJlKFwiLi91dGlsL2V2ZW50LWVtaXR0ZXJcIik7XHJcblxyXG52YXIgbGlmZUxpbmUgPSBuZXcgRXZlbnRFbWl0dGVyKCk7XHJcblxyXG4vLyBhdHRhY2ggdXRpbHNcclxubGlmZUxpbmUuRGlzcG9zYWJsZSA9IHJlcXVpcmUoXCIuL3V0aWwvZGlzcG9zYWJsZVwiKTtcclxubGlmZUxpbmUuRXZlbnRFbWl0dGVyID0gRXZlbnRFbWl0dGVyO1xyXG5cclxuLy8gYXR0YWNoIGxpZmVsaW5lIHRvIHRoZSBnbG9iYWwgb2JqZWN0XHJcbih0eXBlb2Ygd2luZG93ID09IFwib2JqZWN0XCIgPyB3aW5kb3cgOiBzZWxmKS5saWZlTGluZSA9IGxpZmVMaW5lO1xyXG4iLCIvKipcclxuICogS2VlcCBhIGxpc3Qgb2Ygc3Vic2NyaXB0aW9ucyB0byB1bnN1YnNjcmliZSBmcm9tIHRvZ2V0aGVyXHJcbiAqL1xyXG5cclxuY2xhc3MgRGlzcG9zYWJsZSB7XHJcblx0Y29uc3RydWN0b3IoKSB7XHJcblx0XHR0aGlzLl9zdWJzY3JpcHRpb25zID0gW107XHJcblx0fVxyXG5cclxuXHQvLyBVbnN1YnNjcmliZSBmcm9tIGFsbCBzdWJzY3JpcHRpb25zXHJcblx0ZGlzcG9zZSgpIHtcclxuXHRcdC8vIHJlbW92ZSB0aGUgZmlyc3Qgc3Vic2NyaXB0aW9uIHVudGlsIHRoZXJlIGFyZSBub25lIGxlZnRcclxuXHRcdHdoaWxlKHRoaXMuX3N1YnNjcmlwdGlvbnMubGVuZ3RoID4gMCkge1xyXG5cdFx0XHR0aGlzLl9zdWJzY3JpcHRpb25zLnNoaWZ0KCkudW5zdWJzY3JpYmUoKTtcclxuXHRcdH1cclxuXHR9XHJcblxyXG5cdC8vIEFkZCBhIHN1YnNjcmlwdGlvbiB0byB0aGUgZGlzcG9zYWJsZVxyXG5cdGFkZChzdWJzY3JpcHRpb24pIHtcclxuXHRcdHRoaXMuX3N1YnNjcmlwdGlvbnMucHVzaChzdWJzY3JpcHRpb24pO1xyXG5cdH1cclxuXHJcblx0Ly8gZGlzcG9zZSB3aGVuIGFuIGV2ZW50IGlzIGZpcmVkXHJcblx0ZGlzcG9zZU9uKGVtaXR0ZXIsIGV2ZW50KSB7XHJcblx0XHR0aGlzLmFkZChlbWl0dGVyLm9uKGV2ZW50LCAoKSA9PiB0aGlzLmRpc3Bvc2UoKSkpO1xyXG5cdH1cclxufTtcclxuXHJcbm1vZHVsZS5leHBvcnRzID0gRGlzcG9zYWJsZTtcclxuIiwiLyoqXHJcbiAqIEEgYmFzaWMgZXZlbnQgZW1pdHRlclxyXG4gKi9cclxuXHJcbmNsYXNzIEV2ZW50RW1pdHRlciB7XHJcblx0Y29uc3RydWN0b3IoKSB7XHJcblx0XHR0aGlzLl9saXN0ZW5lcnMgPSB7fTtcclxuXHR9XHJcblxyXG5cdC8qKlxyXG5cdCAqIEFkZCBhbiBldmVudCBsaXN0ZW5lclxyXG5cdCAqL1xyXG5cdG9uKG5hbWUsIGxpc3RlbmVyKSB7XHJcblx0XHQvLyBpZiB3ZSBkb24ndCBoYXZlIGFuIGV4aXN0aW5nIGxpc3RlbmVycyBhcnJheSBjcmVhdGUgb25lXHJcblx0XHRpZighdGhpcy5fbGlzdGVuZXJzW25hbWVdKSB7XHJcblx0XHRcdHRoaXMuX2xpc3RlbmVyc1tuYW1lXSA9IFtdO1xyXG5cdFx0fVxyXG5cclxuXHRcdC8vIGFkZCB0aGUgbGlzdGVuZXJcclxuXHRcdHRoaXMuX2xpc3RlbmVyc1tuYW1lXS5wdXNoKGxpc3RlbmVyKTtcclxuXHJcblx0XHQvLyBnaXZlIHRoZW0gYSBzdWJzY3JpcHRpb25cclxuXHRcdHJldHVybiB7XHJcblx0XHRcdF9saXN0ZW5lcjogbGlzdGVuZXIsXHJcblxyXG5cdFx0XHR1bnN1YnNjcmliZTogKCkgPT4ge1xyXG5cdFx0XHRcdC8vIGZpbmQgdGhlIGxpc3RlbmVyXHJcblx0XHRcdFx0dmFyIGluZGV4ID0gdGhpcy5fbGlzdGVuZXJzW25hbWVdLmluZGV4T2YobGlzdGVuZXIpO1xyXG5cclxuXHRcdFx0XHRpZihpbmRleCAhPT0gLTEpIHtcclxuXHRcdFx0XHRcdHRoaXMuX2xpc3RlbmVyc1tuYW1lXS5zcGxpY2UoaW5kZXgsIDEpO1xyXG5cdFx0XHRcdH1cclxuXHRcdFx0fVxyXG5cdFx0fTtcclxuXHR9XHJcblxyXG5cdC8qKlxyXG5cdCAqIEVtaXQgYW4gZXZlbnRcclxuXHQgKi9cclxuXHRlbWl0KG5hbWUsIC4uLmFyZ3MpIHtcclxuXHRcdC8vIGNoZWNrIGZvciBsaXN0ZW5lcnNcclxuXHRcdGlmKHRoaXMuX2xpc3RlbmVyc1tuYW1lXSkge1xyXG5cdFx0XHRmb3IobGV0IGxpc3RlbmVyIG9mIHRoaXMuX2xpc3RlbmVyc1tuYW1lXSkge1xyXG5cdFx0XHRcdC8vIGNhbGwgdGhlIGxpc3RlbmVyc1xyXG5cdFx0XHRcdGxpc3RlbmVyKC4uLmFyZ3MpO1xyXG5cdFx0XHR9XHJcblx0XHR9XHJcblx0fVxyXG5cclxuXHQvKipcclxuXHQgKiBFbWl0IGFuIGV2ZW50IGFuZCBza2lwIHNvbWUgbGlzdGVuZXJzXHJcblx0ICovXHJcblx0cGFydGlhbEVtaXQobmFtZSwgc2tpcHMgPSBbXSwgLi4uYXJncykge1xyXG5cdFx0Ly8gYWxsb3cgYSBzaW5nbGUgaXRlbVxyXG5cdFx0aWYoIUFycmF5LmlzQXJyYXkoc2tpcHMpKSB7XHJcblx0XHRcdHNraXBzID0gW3NraXBzXTtcclxuXHRcdH1cclxuXHJcblx0XHQvLyBjaGVjayBmb3IgbGlzdGVuZXJzXHJcblx0XHRpZih0aGlzLl9saXN0ZW5lcnNbbmFtZV0pIHtcclxuXHRcdFx0Zm9yKGxldCBsaXN0ZW5lciBvZiB0aGlzLl9saXN0ZW5lcnNbbmFtZV0pIHtcclxuXHRcdFx0XHQvLyB0aGlzIGV2ZW50IGxpc3RlbmVyIGlzIGJlaW5nIHNraXBlZFxyXG5cdFx0XHRcdGlmKHNraXBzLmZpbmQoc2tpcCA9PiBza2lwLl9saXN0ZW5lciA9PSBsaXN0ZW5lcikpIHtcclxuXHRcdFx0XHRcdGNvbnRpbnVlO1xyXG5cdFx0XHRcdH1cclxuXHJcblx0XHRcdFx0Ly8gY2FsbCB0aGUgbGlzdGVuZXJzXHJcblx0XHRcdFx0bGlzdGVuZXIoLi4uYXJncyk7XHJcblx0XHRcdH1cclxuXHRcdH1cclxuXHR9XHJcbn1cclxuXHJcbm1vZHVsZS5leHBvcnRzID0gRXZlbnRFbWl0dGVyO1xyXG4iXX0=
