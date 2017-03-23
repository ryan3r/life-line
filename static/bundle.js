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

var progress;

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
    stringifyDate = _require.stringifyDate;

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
				return !date || new Date(date).getTime() > Date.now();
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

if (typeof window != "object") {
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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCJub2RlX21vZHVsZXMvYnJvd3NlcmlmeS9saWIvX2VtcHR5LmpzIiwibm9kZV9tb2R1bGVzL2lkYi9saWIvaWRiLmpzIiwic3JjXFxjbGllbnRcXGRhdGEtc3RvcmVzXFxpZGItYWRhcHRvci5qcyIsInNyY1xcY2xpZW50XFxkYXRhLXN0b3Jlc1xcaW5kZXguanMiLCJzcmNcXGNsaWVudFxcZ2xvYmFsLmpzIiwic3JjXFxjbGllbnRcXGluZGV4LmpzIiwic3JjXFxjbGllbnRcXHN3LWhlbHBlci5qcyIsInNyY1xcY2xpZW50XFx1dGlsXFxkYXRlLmpzIiwic3JjXFxjbGllbnRcXHV0aWxcXGRvbS1tYWtlci5qcyIsInNyY1xcY2xpZW50XFx2aWV3c1xcYWNjb3VudC5qcyIsInNyY1xcY2xpZW50XFx2aWV3c1xcZWRpdC5qcyIsInNyY1xcY2xpZW50XFx2aWV3c1xcaXRlbS5qcyIsInNyY1xcY2xpZW50XFx2aWV3c1xcbGlzdHMuanMiLCJzcmNcXGNsaWVudFxcdmlld3NcXGxvZ2luLmpzIiwic3JjXFxjbGllbnRcXHZpZXdzXFx0b2RvLmpzIiwic3JjXFxjbGllbnRcXHZpZXdzXFx1c2Vycy5qcyIsInNyY1xcY2xpZW50XFx3aWRnZXRzXFxjb250ZW50LmpzIiwic3JjXFxjbGllbnRcXHdpZGdldHNcXGlucHV0LmpzIiwic3JjXFxjbGllbnRcXHdpZGdldHNcXGxpbmsuanMiLCJzcmNcXGNsaWVudFxcd2lkZ2V0c1xcbGlzdC5qcyIsInNyY1xcY2xpZW50XFx3aWRnZXRzXFxwcm9ncmVzcy5qcyIsInNyY1xcY2xpZW50XFx3aWRnZXRzXFxzaWRlYmFyLmpzIiwic3JjXFxjbGllbnRcXHdpZGdldHNcXHRvZ2dsZS1idG5zLmpzIiwic3JjXFxjb21tb25cXGJhY2t1cC5qcyIsInNyY1xcY29tbW9uXFxkYXRhLXN0b3Jlc1xcaHR0cC1hZGFwdG9yLmpzIiwic3JjXFxjb21tb25cXGRhdGEtc3RvcmVzXFxrZXktdmFsdWUtc3RvcmUuanMiLCJzcmNcXGNvbW1vblxcZGF0YS1zdG9yZXNcXHBvb2wtc3RvcmUuanMiLCJzcmNcXGNvbW1vblxcZGF0YS1zdG9yZXNcXHN5bmNlci5qcyIsInNyY1xcY29tbW9uXFxnbG9iYWwuanMiLCJzcmNcXGNvbW1vblxcdXRpbFxcZGlzcG9zYWJsZS5qcyIsInNyY1xcY29tbW9uXFx1dGlsXFxldmVudC1lbWl0dGVyLmpzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBO0FDQUE7O0FDQUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7Ozs7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QUE7QUFBQTtBQUFBO0FBQUE7QUFLekI7QUFDRDs7QUFFRDs7Ozs7OzhCQUdZLEksRUFBMkI7QUFBQSxPQUFyQixLQUFxQix1RUFBYixFQUFhOztBQUN0QztBQUNBLE9BQUcsQ0FBQyxNQUFNLE9BQU4sQ0FBYyxLQUFkLENBQUosRUFBMEI7QUFDekIsWUFBUSxDQUFDLEtBQUQsQ0FBUjtBQUNBOztBQUVEO0FBQ0EsT0FBRyxLQUFLLFVBQUwsQ0FBZ0IsSUFBaEIsQ0FBSCxFQUEwQjtBQUFBLHVDQVBNLElBT047QUFQTSxTQU9OO0FBQUE7O0FBQUEsMEJBQ2pCLFFBRGlCO0FBRXhCO0FBQ0EsU0FBRyxNQUFNLElBQU4sQ0FBVztBQUFBLGFBQVEsS0FBSyxTQUFMLElBQWtCLFFBQTFCO0FBQUEsTUFBWCxDQUFILEVBQW1EO0FBQ2xEO0FBQ0E7O0FBRUQ7QUFDQSwrQkFBWSxJQUFaO0FBUndCOztBQUFBO0FBQUE7QUFBQTs7QUFBQTtBQUN6QiwyQkFBb0IsS0FBSyxVQUFMLENBQWdCLElBQWhCLENBQXBCLG1JQUEyQztBQUFBLFVBQW5DLFFBQW1DOztBQUFBLHVCQUFuQyxRQUFtQzs7QUFBQSwrQkFHekM7QUFLRDtBQVR3QjtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBVXpCO0FBQ0Q7Ozs7OztBQUdGLE9BQU8sT0FBUCxHQUFpQixZQUFqQiIsImZpbGUiOiJnZW5lcmF0ZWQuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlc0NvbnRlbnQiOlsiKGZ1bmN0aW9uIGUodCxuLHIpe2Z1bmN0aW9uIHMobyx1KXtpZighbltvXSl7aWYoIXRbb10pe3ZhciBhPXR5cGVvZiByZXF1aXJlPT1cImZ1bmN0aW9uXCImJnJlcXVpcmU7aWYoIXUmJmEpcmV0dXJuIGEobywhMCk7aWYoaSlyZXR1cm4gaShvLCEwKTt2YXIgZj1uZXcgRXJyb3IoXCJDYW5ub3QgZmluZCBtb2R1bGUgJ1wiK28rXCInXCIpO3Rocm93IGYuY29kZT1cIk1PRFVMRV9OT1RfRk9VTkRcIixmfXZhciBsPW5bb109e2V4cG9ydHM6e319O3Rbb11bMF0uY2FsbChsLmV4cG9ydHMsZnVuY3Rpb24oZSl7dmFyIG49dFtvXVsxXVtlXTtyZXR1cm4gcyhuP246ZSl9LGwsbC5leHBvcnRzLGUsdCxuLHIpfXJldHVybiBuW29dLmV4cG9ydHN9dmFyIGk9dHlwZW9mIHJlcXVpcmU9PVwiZnVuY3Rpb25cIiYmcmVxdWlyZTtmb3IodmFyIG89MDtvPHIubGVuZ3RoO28rKylzKHJbb10pO3JldHVybiBzfSkiLCIiLCIndXNlIHN0cmljdCc7XG5cbihmdW5jdGlvbigpIHtcbiAgZnVuY3Rpb24gdG9BcnJheShhcnIpIHtcbiAgICByZXR1cm4gQXJyYXkucHJvdG90eXBlLnNsaWNlLmNhbGwoYXJyKTtcbiAgfVxuXG4gIGZ1bmN0aW9uIHByb21pc2lmeVJlcXVlc3QocmVxdWVzdCkge1xuICAgIHJldHVybiBuZXcgUHJvbWlzZShmdW5jdGlvbihyZXNvbHZlLCByZWplY3QpIHtcbiAgICAgIHJlcXVlc3Qub25zdWNjZXNzID0gZnVuY3Rpb24oKSB7XG4gICAgICAgIHJlc29sdmUocmVxdWVzdC5yZXN1bHQpO1xuICAgICAgfTtcblxuICAgICAgcmVxdWVzdC5vbmVycm9yID0gZnVuY3Rpb24oKSB7XG4gICAgICAgIHJlamVjdChyZXF1ZXN0LmVycm9yKTtcbiAgICAgIH07XG4gICAgfSk7XG4gIH1cblxuICBmdW5jdGlvbiBwcm9taXNpZnlSZXF1ZXN0Q2FsbChvYmosIG1ldGhvZCwgYXJncykge1xuICAgIHZhciByZXF1ZXN0O1xuICAgIHZhciBwID0gbmV3IFByb21pc2UoZnVuY3Rpb24ocmVzb2x2ZSwgcmVqZWN0KSB7XG4gICAgICByZXF1ZXN0ID0gb2JqW21ldGhvZF0uYXBwbHkob2JqLCBhcmdzKTtcbiAgICAgIHByb21pc2lmeVJlcXVlc3QocmVxdWVzdCkudGhlbihyZXNvbHZlLCByZWplY3QpO1xuICAgIH0pO1xuXG4gICAgcC5yZXF1ZXN0ID0gcmVxdWVzdDtcbiAgICByZXR1cm4gcDtcbiAgfVxuXG4gIGZ1bmN0aW9uIHByb21pc2lmeUN1cnNvclJlcXVlc3RDYWxsKG9iaiwgbWV0aG9kLCBhcmdzKSB7XG4gICAgdmFyIHAgPSBwcm9taXNpZnlSZXF1ZXN0Q2FsbChvYmosIG1ldGhvZCwgYXJncyk7XG4gICAgcmV0dXJuIHAudGhlbihmdW5jdGlvbih2YWx1ZSkge1xuICAgICAgaWYgKCF2YWx1ZSkgcmV0dXJuO1xuICAgICAgcmV0dXJuIG5ldyBDdXJzb3IodmFsdWUsIHAucmVxdWVzdCk7XG4gICAgfSk7XG4gIH1cblxuICBmdW5jdGlvbiBwcm94eVByb3BlcnRpZXMoUHJveHlDbGFzcywgdGFyZ2V0UHJvcCwgcHJvcGVydGllcykge1xuICAgIHByb3BlcnRpZXMuZm9yRWFjaChmdW5jdGlvbihwcm9wKSB7XG4gICAgICBPYmplY3QuZGVmaW5lUHJvcGVydHkoUHJveHlDbGFzcy5wcm90b3R5cGUsIHByb3AsIHtcbiAgICAgICAgZ2V0OiBmdW5jdGlvbigpIHtcbiAgICAgICAgICByZXR1cm4gdGhpc1t0YXJnZXRQcm9wXVtwcm9wXTtcbiAgICAgICAgfSxcbiAgICAgICAgc2V0OiBmdW5jdGlvbih2YWwpIHtcbiAgICAgICAgICB0aGlzW3RhcmdldFByb3BdW3Byb3BdID0gdmFsO1xuICAgICAgICB9XG4gICAgICB9KTtcbiAgICB9KTtcbiAgfVxuXG4gIGZ1bmN0aW9uIHByb3h5UmVxdWVzdE1ldGhvZHMoUHJveHlDbGFzcywgdGFyZ2V0UHJvcCwgQ29uc3RydWN0b3IsIHByb3BlcnRpZXMpIHtcbiAgICBwcm9wZXJ0aWVzLmZvckVhY2goZnVuY3Rpb24ocHJvcCkge1xuICAgICAgaWYgKCEocHJvcCBpbiBDb25zdHJ1Y3Rvci5wcm90b3R5cGUpKSByZXR1cm47XG4gICAgICBQcm94eUNsYXNzLnByb3RvdHlwZVtwcm9wXSA9IGZ1bmN0aW9uKCkge1xuICAgICAgICByZXR1cm4gcHJvbWlzaWZ5UmVxdWVzdENhbGwodGhpc1t0YXJnZXRQcm9wXSwgcHJvcCwgYXJndW1lbnRzKTtcbiAgICAgIH07XG4gICAgfSk7XG4gIH1cblxuICBmdW5jdGlvbiBwcm94eU1ldGhvZHMoUHJveHlDbGFzcywgdGFyZ2V0UHJvcCwgQ29uc3RydWN0b3IsIHByb3BlcnRpZXMpIHtcbiAgICBwcm9wZXJ0aWVzLmZvckVhY2goZnVuY3Rpb24ocHJvcCkge1xuICAgICAgaWYgKCEocHJvcCBpbiBDb25zdHJ1Y3Rvci5wcm90b3R5cGUpKSByZXR1cm47XG4gICAgICBQcm94eUNsYXNzLnByb3RvdHlwZVtwcm9wXSA9IGZ1bmN0aW9uKCkge1xuICAgICAgICByZXR1cm4gdGhpc1t0YXJnZXRQcm9wXVtwcm9wXS5hcHBseSh0aGlzW3RhcmdldFByb3BdLCBhcmd1bWVudHMpO1xuICAgICAgfTtcbiAgICB9KTtcbiAgfVxuXG4gIGZ1bmN0aW9uIHByb3h5Q3Vyc29yUmVxdWVzdE1ldGhvZHMoUHJveHlDbGFzcywgdGFyZ2V0UHJvcCwgQ29uc3RydWN0b3IsIHByb3BlcnRpZXMpIHtcbiAgICBwcm9wZXJ0aWVzLmZvckVhY2goZnVuY3Rpb24ocHJvcCkge1xuICAgICAgaWYgKCEocHJvcCBpbiBDb25zdHJ1Y3Rvci5wcm90b3R5cGUpKSByZXR1cm47XG4gICAgICBQcm94eUNsYXNzLnByb3RvdHlwZVtwcm9wXSA9IGZ1bmN0aW9uKCkge1xuICAgICAgICByZXR1cm4gcHJvbWlzaWZ5Q3Vyc29yUmVxdWVzdENhbGwodGhpc1t0YXJnZXRQcm9wXSwgcHJvcCwgYXJndW1lbnRzKTtcbiAgICAgIH07XG4gICAgfSk7XG4gIH1cblxuICBmdW5jdGlvbiBJbmRleChpbmRleCkge1xuICAgIHRoaXMuX2luZGV4ID0gaW5kZXg7XG4gIH1cblxuICBwcm94eVByb3BlcnRpZXMoSW5kZXgsICdfaW5kZXgnLCBbXG4gICAgJ25hbWUnLFxuICAgICdrZXlQYXRoJyxcbiAgICAnbXVsdGlFbnRyeScsXG4gICAgJ3VuaXF1ZSdcbiAgXSk7XG5cbiAgcHJveHlSZXF1ZXN0TWV0aG9kcyhJbmRleCwgJ19pbmRleCcsIElEQkluZGV4LCBbXG4gICAgJ2dldCcsXG4gICAgJ2dldEtleScsXG4gICAgJ2dldEFsbCcsXG4gICAgJ2dldEFsbEtleXMnLFxuICAgICdjb3VudCdcbiAgXSk7XG5cbiAgcHJveHlDdXJzb3JSZXF1ZXN0TWV0aG9kcyhJbmRleCwgJ19pbmRleCcsIElEQkluZGV4LCBbXG4gICAgJ29wZW5DdXJzb3InLFxuICAgICdvcGVuS2V5Q3Vyc29yJ1xuICBdKTtcblxuICBmdW5jdGlvbiBDdXJzb3IoY3Vyc29yLCByZXF1ZXN0KSB7XG4gICAgdGhpcy5fY3Vyc29yID0gY3Vyc29yO1xuICAgIHRoaXMuX3JlcXVlc3QgPSByZXF1ZXN0O1xuICB9XG5cbiAgcHJveHlQcm9wZXJ0aWVzKEN1cnNvciwgJ19jdXJzb3InLCBbXG4gICAgJ2RpcmVjdGlvbicsXG4gICAgJ2tleScsXG4gICAgJ3ByaW1hcnlLZXknLFxuICAgICd2YWx1ZSdcbiAgXSk7XG5cbiAgcHJveHlSZXF1ZXN0TWV0aG9kcyhDdXJzb3IsICdfY3Vyc29yJywgSURCQ3Vyc29yLCBbXG4gICAgJ3VwZGF0ZScsXG4gICAgJ2RlbGV0ZSdcbiAgXSk7XG5cbiAgLy8gcHJveHkgJ25leHQnIG1ldGhvZHNcbiAgWydhZHZhbmNlJywgJ2NvbnRpbnVlJywgJ2NvbnRpbnVlUHJpbWFyeUtleSddLmZvckVhY2goZnVuY3Rpb24obWV0aG9kTmFtZSkge1xuICAgIGlmICghKG1ldGhvZE5hbWUgaW4gSURCQ3Vyc29yLnByb3RvdHlwZSkpIHJldHVybjtcbiAgICBDdXJzb3IucHJvdG90eXBlW21ldGhvZE5hbWVdID0gZnVuY3Rpb24oKSB7XG4gICAgICB2YXIgY3Vyc29yID0gdGhpcztcbiAgICAgIHZhciBhcmdzID0gYXJndW1lbnRzO1xuICAgICAgcmV0dXJuIFByb21pc2UucmVzb2x2ZSgpLnRoZW4oZnVuY3Rpb24oKSB7XG4gICAgICAgIGN1cnNvci5fY3Vyc29yW21ldGhvZE5hbWVdLmFwcGx5KGN1cnNvci5fY3Vyc29yLCBhcmdzKTtcbiAgICAgICAgcmV0dXJuIHByb21pc2lmeVJlcXVlc3QoY3Vyc29yLl9yZXF1ZXN0KS50aGVuKGZ1bmN0aW9uKHZhbHVlKSB7XG4gICAgICAgICAgaWYgKCF2YWx1ZSkgcmV0dXJuO1xuICAgICAgICAgIHJldHVybiBuZXcgQ3Vyc29yKHZhbHVlLCBjdXJzb3IuX3JlcXVlc3QpO1xuICAgICAgICB9KTtcbiAgICAgIH0pO1xuICAgIH07XG4gIH0pO1xuXG4gIGZ1bmN0aW9uIE9iamVjdFN0b3JlKHN0b3JlKSB7XG4gICAgdGhpcy5fc3RvcmUgPSBzdG9yZTtcbiAgfVxuXG4gIE9iamVjdFN0b3JlLnByb3RvdHlwZS5jcmVhdGVJbmRleCA9IGZ1bmN0aW9uKCkge1xuICAgIHJldHVybiBuZXcgSW5kZXgodGhpcy5fc3RvcmUuY3JlYXRlSW5kZXguYXBwbHkodGhpcy5fc3RvcmUsIGFyZ3VtZW50cykpO1xuICB9O1xuXG4gIE9iamVjdFN0b3JlLnByb3RvdHlwZS5pbmRleCA9IGZ1bmN0aW9uKCkge1xuICAgIHJldHVybiBuZXcgSW5kZXgodGhpcy5fc3RvcmUuaW5kZXguYXBwbHkodGhpcy5fc3RvcmUsIGFyZ3VtZW50cykpO1xuICB9O1xuXG4gIHByb3h5UHJvcGVydGllcyhPYmplY3RTdG9yZSwgJ19zdG9yZScsIFtcbiAgICAnbmFtZScsXG4gICAgJ2tleVBhdGgnLFxuICAgICdpbmRleE5hbWVzJyxcbiAgICAnYXV0b0luY3JlbWVudCdcbiAgXSk7XG5cbiAgcHJveHlSZXF1ZXN0TWV0aG9kcyhPYmplY3RTdG9yZSwgJ19zdG9yZScsIElEQk9iamVjdFN0b3JlLCBbXG4gICAgJ3B1dCcsXG4gICAgJ2FkZCcsXG4gICAgJ2RlbGV0ZScsXG4gICAgJ2NsZWFyJyxcbiAgICAnZ2V0JyxcbiAgICAnZ2V0QWxsJyxcbiAgICAnZ2V0S2V5JyxcbiAgICAnZ2V0QWxsS2V5cycsXG4gICAgJ2NvdW50J1xuICBdKTtcblxuICBwcm94eUN1cnNvclJlcXVlc3RNZXRob2RzKE9iamVjdFN0b3JlLCAnX3N0b3JlJywgSURCT2JqZWN0U3RvcmUsIFtcbiAgICAnb3BlbkN1cnNvcicsXG4gICAgJ29wZW5LZXlDdXJzb3InXG4gIF0pO1xuXG4gIHByb3h5TWV0aG9kcyhPYmplY3RTdG9yZSwgJ19zdG9yZScsIElEQk9iamVjdFN0b3JlLCBbXG4gICAgJ2RlbGV0ZUluZGV4J1xuICBdKTtcblxuICBmdW5jdGlvbiBUcmFuc2FjdGlvbihpZGJUcmFuc2FjdGlvbikge1xuICAgIHRoaXMuX3R4ID0gaWRiVHJhbnNhY3Rpb247XG4gICAgdGhpcy5jb21wbGV0ZSA9IG5ldyBQcm9taXNlKGZ1bmN0aW9uKHJlc29sdmUsIHJlamVjdCkge1xuICAgICAgaWRiVHJhbnNhY3Rpb24ub25jb21wbGV0ZSA9IGZ1bmN0aW9uKCkge1xuICAgICAgICByZXNvbHZlKCk7XG4gICAgICB9O1xuICAgICAgaWRiVHJhbnNhY3Rpb24ub25lcnJvciA9IGZ1bmN0aW9uKCkge1xuICAgICAgICByZWplY3QoaWRiVHJhbnNhY3Rpb24uZXJyb3IpO1xuICAgICAgfTtcbiAgICAgIGlkYlRyYW5zYWN0aW9uLm9uYWJvcnQgPSBmdW5jdGlvbigpIHtcbiAgICAgICAgcmVqZWN0KGlkYlRyYW5zYWN0aW9uLmVycm9yKTtcbiAgICAgIH07XG4gICAgfSk7XG4gIH1cblxuICBUcmFuc2FjdGlvbi5wcm90b3R5cGUub2JqZWN0U3RvcmUgPSBmdW5jdGlvbigpIHtcbiAgICByZXR1cm4gbmV3IE9iamVjdFN0b3JlKHRoaXMuX3R4Lm9iamVjdFN0b3JlLmFwcGx5KHRoaXMuX3R4LCBhcmd1bWVudHMpKTtcbiAgfTtcblxuICBwcm94eVByb3BlcnRpZXMoVHJhbnNhY3Rpb24sICdfdHgnLCBbXG4gICAgJ29iamVjdFN0b3JlTmFtZXMnLFxuICAgICdtb2RlJ1xuICBdKTtcblxuICBwcm94eU1ldGhvZHMoVHJhbnNhY3Rpb24sICdfdHgnLCBJREJUcmFuc2FjdGlvbiwgW1xuICAgICdhYm9ydCdcbiAgXSk7XG5cbiAgZnVuY3Rpb24gVXBncmFkZURCKGRiLCBvbGRWZXJzaW9uLCB0cmFuc2FjdGlvbikge1xuICAgIHRoaXMuX2RiID0gZGI7XG4gICAgdGhpcy5vbGRWZXJzaW9uID0gb2xkVmVyc2lvbjtcbiAgICB0aGlzLnRyYW5zYWN0aW9uID0gbmV3IFRyYW5zYWN0aW9uKHRyYW5zYWN0aW9uKTtcbiAgfVxuXG4gIFVwZ3JhZGVEQi5wcm90b3R5cGUuY3JlYXRlT2JqZWN0U3RvcmUgPSBmdW5jdGlvbigpIHtcbiAgICByZXR1cm4gbmV3IE9iamVjdFN0b3JlKHRoaXMuX2RiLmNyZWF0ZU9iamVjdFN0b3JlLmFwcGx5KHRoaXMuX2RiLCBhcmd1bWVudHMpKTtcbiAgfTtcblxuICBwcm94eVByb3BlcnRpZXMoVXBncmFkZURCLCAnX2RiJywgW1xuICAgICduYW1lJyxcbiAgICAndmVyc2lvbicsXG4gICAgJ29iamVjdFN0b3JlTmFtZXMnXG4gIF0pO1xuXG4gIHByb3h5TWV0aG9kcyhVcGdyYWRlREIsICdfZGInLCBJREJEYXRhYmFzZSwgW1xuICAgICdkZWxldGVPYmplY3RTdG9yZScsXG4gICAgJ2Nsb3NlJ1xuICBdKTtcblxuICBmdW5jdGlvbiBEQihkYikge1xuICAgIHRoaXMuX2RiID0gZGI7XG4gIH1cblxuICBEQi5wcm90b3R5cGUudHJhbnNhY3Rpb24gPSBmdW5jdGlvbigpIHtcbiAgICByZXR1cm4gbmV3IFRyYW5zYWN0aW9uKHRoaXMuX2RiLnRyYW5zYWN0aW9uLmFwcGx5KHRoaXMuX2RiLCBhcmd1bWVudHMpKTtcbiAgfTtcblxuICBwcm94eVByb3BlcnRpZXMoREIsICdfZGInLCBbXG4gICAgJ25hbWUnLFxuICAgICd2ZXJzaW9uJyxcbiAgICAnb2JqZWN0U3RvcmVOYW1lcydcbiAgXSk7XG5cbiAgcHJveHlNZXRob2RzKERCLCAnX2RiJywgSURCRGF0YWJhc2UsIFtcbiAgICAnY2xvc2UnXG4gIF0pO1xuXG4gIC8vIEFkZCBjdXJzb3IgaXRlcmF0b3JzXG4gIC8vIFRPRE86IHJlbW92ZSB0aGlzIG9uY2UgYnJvd3NlcnMgZG8gdGhlIHJpZ2h0IHRoaW5nIHdpdGggcHJvbWlzZXNcbiAgWydvcGVuQ3Vyc29yJywgJ29wZW5LZXlDdXJzb3InXS5mb3JFYWNoKGZ1bmN0aW9uKGZ1bmNOYW1lKSB7XG4gICAgW09iamVjdFN0b3JlLCBJbmRleF0uZm9yRWFjaChmdW5jdGlvbihDb25zdHJ1Y3Rvcikge1xuICAgICAgQ29uc3RydWN0b3IucHJvdG90eXBlW2Z1bmNOYW1lLnJlcGxhY2UoJ29wZW4nLCAnaXRlcmF0ZScpXSA9IGZ1bmN0aW9uKCkge1xuICAgICAgICB2YXIgYXJncyA9IHRvQXJyYXkoYXJndW1lbnRzKTtcbiAgICAgICAgdmFyIGNhbGxiYWNrID0gYXJnc1thcmdzLmxlbmd0aCAtIDFdO1xuICAgICAgICB2YXIgbmF0aXZlT2JqZWN0ID0gdGhpcy5fc3RvcmUgfHwgdGhpcy5faW5kZXg7XG4gICAgICAgIHZhciByZXF1ZXN0ID0gbmF0aXZlT2JqZWN0W2Z1bmNOYW1lXS5hcHBseShuYXRpdmVPYmplY3QsIGFyZ3Muc2xpY2UoMCwgLTEpKTtcbiAgICAgICAgcmVxdWVzdC5vbnN1Y2Nlc3MgPSBmdW5jdGlvbigpIHtcbiAgICAgICAgICBjYWxsYmFjayhyZXF1ZXN0LnJlc3VsdCk7XG4gICAgICAgIH07XG4gICAgICB9O1xuICAgIH0pO1xuICB9KTtcblxuICAvLyBwb2x5ZmlsbCBnZXRBbGxcbiAgW0luZGV4LCBPYmplY3RTdG9yZV0uZm9yRWFjaChmdW5jdGlvbihDb25zdHJ1Y3Rvcikge1xuICAgIGlmIChDb25zdHJ1Y3Rvci5wcm90b3R5cGUuZ2V0QWxsKSByZXR1cm47XG4gICAgQ29uc3RydWN0b3IucHJvdG90eXBlLmdldEFsbCA9IGZ1bmN0aW9uKHF1ZXJ5LCBjb3VudCkge1xuICAgICAgdmFyIGluc3RhbmNlID0gdGhpcztcbiAgICAgIHZhciBpdGVtcyA9IFtdO1xuXG4gICAgICByZXR1cm4gbmV3IFByb21pc2UoZnVuY3Rpb24ocmVzb2x2ZSkge1xuICAgICAgICBpbnN0YW5jZS5pdGVyYXRlQ3Vyc29yKHF1ZXJ5LCBmdW5jdGlvbihjdXJzb3IpIHtcbiAgICAgICAgICBpZiAoIWN1cnNvcikge1xuICAgICAgICAgICAgcmVzb2x2ZShpdGVtcyk7XG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgICAgfVxuICAgICAgICAgIGl0ZW1zLnB1c2goY3Vyc29yLnZhbHVlKTtcblxuICAgICAgICAgIGlmIChjb3VudCAhPT0gdW5kZWZpbmVkICYmIGl0ZW1zLmxlbmd0aCA9PSBjb3VudCkge1xuICAgICAgICAgICAgcmVzb2x2ZShpdGVtcyk7XG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgICAgfVxuICAgICAgICAgIGN1cnNvci5jb250aW51ZSgpO1xuICAgICAgICB9KTtcbiAgICAgIH0pO1xuICAgIH07XG4gIH0pO1xuXG4gIHZhciBleHAgPSB7XG4gICAgb3BlbjogZnVuY3Rpb24obmFtZSwgdmVyc2lvbiwgdXBncmFkZUNhbGxiYWNrKSB7XG4gICAgICB2YXIgcCA9IHByb21pc2lmeVJlcXVlc3RDYWxsKGluZGV4ZWREQiwgJ29wZW4nLCBbbmFtZSwgdmVyc2lvbl0pO1xuICAgICAgdmFyIHJlcXVlc3QgPSBwLnJlcXVlc3Q7XG5cbiAgICAgIHJlcXVlc3Qub251cGdyYWRlbmVlZGVkID0gZnVuY3Rpb24oZXZlbnQpIHtcbiAgICAgICAgaWYgKHVwZ3JhZGVDYWxsYmFjaykge1xuICAgICAgICAgIHVwZ3JhZGVDYWxsYmFjayhuZXcgVXBncmFkZURCKHJlcXVlc3QucmVzdWx0LCBldmVudC5vbGRWZXJzaW9uLCByZXF1ZXN0LnRyYW5zYWN0aW9uKSk7XG4gICAgICAgIH1cbiAgICAgIH07XG5cbiAgICAgIHJldHVybiBwLnRoZW4oZnVuY3Rpb24oZGIpIHtcbiAgICAgICAgcmV0dXJuIG5ldyBEQihkYik7XG4gICAgICB9KTtcbiAgICB9LFxuICAgIGRlbGV0ZTogZnVuY3Rpb24obmFtZSkge1xuICAgICAgcmV0dXJuIHByb21pc2lmeVJlcXVlc3RDYWxsKGluZGV4ZWREQiwgJ2RlbGV0ZURhdGFiYXNlJywgW25hbWVdKTtcbiAgICB9XG4gIH07XG5cbiAgaWYgKHR5cGVvZiBtb2R1bGUgIT09ICd1bmRlZmluZWQnKSB7XG4gICAgbW9kdWxlLmV4cG9ydHMgPSBleHA7XG4gIH1cbiAgZWxzZSB7XG4gICAgc2VsZi5pZGIgPSBleHA7XG4gIH1cbn0oKSk7XG4iLCIvKipcclxuICogQW4gaW5kZXhlZCBkYiBhZGFwdG9yXHJcbiAqL1xyXG5cclxudmFyIGlkYiA9IHJlcXVpcmUoXCJpZGJcIik7XHJcblxyXG5jb25zdCBWQUxJRF9TVE9SRVMgPSBbXCJhc3NpZ25tZW50c1wiLCBcInN5bmMtc3RvcmVcIl07XHJcblxyXG4vLyBvcGVuL3NldHVwIHRoZSBkYXRhYmFzZVxyXG52YXIgZGJQcm9taXNlID0gaWRiLm9wZW4oXCJkYXRhLXN0b3Jlc1wiLCAzLCBkYiA9PiB7XHJcblx0Ly8gdXBncmFkZSBvciBjcmVhdGUgdGhlIGRiXHJcblx0aWYoZGIub2xkVmVyc2lvbiA8IDEpXHJcblx0XHRkYi5jcmVhdGVPYmplY3RTdG9yZShcImFzc2lnbm1lbnRzXCIsIHsga2V5UGF0aDogXCJpZFwiIH0pO1xyXG5cdGlmKGRiLm9sZFZlcnNpb24gPCAyKVxyXG5cdFx0ZGIuY3JlYXRlT2JqZWN0U3RvcmUoXCJzeW5jLXN0b3JlXCIsIHsga2V5UGF0aDogXCJpZFwiIH0pO1xyXG5cclxuXHQvLyB0aGUgdmVyc2lvbiAyIHN5bmMtc3RvcmUgaGFkIGEgZGlmZmVyZW50IHN0cnVjdHVyZSB0aGF0IHRoZSB2ZXJzaW9uIDNcclxuXHRpZihkYi5vbGRWZXJzaW9uID09IDIpIHtcclxuXHRcdGRiLmRlbGV0ZU9iamVjdFN0b3JlKFwic3luYy1zdG9yZVwiKTtcclxuXHRcdGRiLmNyZWF0ZU9iamVjdFN0b3JlKFwic3luYy1zdG9yZVwiLCB7IGtleVBhdGg6IFwiaWRcIiB9KTtcclxuXHR9XHJcbn0pO1xyXG5cclxuY2xhc3MgSWRiQWRhcHRvciB7XHJcblx0Y29uc3RydWN0b3IobmFtZSkge1xyXG5cdFx0dGhpcy5uYW1lID0gbmFtZTtcclxuXHJcblx0XHQvLyBjaGVjayB0aGUgc3RvcmUgaXMgdmFsaWRcclxuXHRcdGlmKFZBTElEX1NUT1JFUy5pbmRleE9mKG5hbWUpID09PSAtMSkge1xyXG5cdFx0XHR0aHJvdyBuZXcgRXJyb3IoYFRoZSBkYXRhIHN0b3JlICR7bmFtZX0gaXMgbm90IGluIGlkYiB1cGRhdGUgdGhlIGRiYCk7XHJcblx0XHR9XHJcblx0fVxyXG5cclxuXHQvLyBjcmVhdGUgYSB0cmFuc2FjdGlvblxyXG5cdF90cmFuc2FjdGlvbihyZWFkV3JpdGUpIHtcclxuXHRcdHJldHVybiBkYlByb21pc2UudGhlbihkYiA9PiB7XHJcblx0XHRcdHJldHVybiBkYlxyXG5cdFx0XHRcdC50cmFuc2FjdGlvbih0aGlzLm5hbWUsIHJlYWRXcml0ZSAmJiBcInJlYWR3cml0ZVwiKVxyXG5cdFx0XHRcdC5vYmplY3RTdG9yZSh0aGlzLm5hbWUpO1xyXG5cdFx0fSk7XHJcblx0fVxyXG5cclxuXHQvKipcclxuXHQgKiBHZXQgYWxsIHRoZSB2YWx1ZXMgaW4gdGhlIG9iamVjdCBzdG9yZVxyXG5cdCAqL1xyXG5cdGdldEFsbCgpIHtcclxuXHRcdHJldHVybiB0aGlzLl90cmFuc2FjdGlvbigpXHJcblx0XHRcdC50aGVuKHRyYW5zID0+IHRyYW5zLmdldEFsbCgpKTtcclxuXHR9XHJcblxyXG5cdC8qKlxyXG5cdCAqIEdldCBhIHNwZWNpZmljIHZhbHVlXHJcblx0ICovXHJcblx0Z2V0KGtleSkge1xyXG5cdFx0cmV0dXJuIHRoaXMuX3RyYW5zYWN0aW9uKClcclxuXHRcdFx0LnRoZW4odHJhbnMgPT4gdHJhbnMuZ2V0KGtleSkpO1xyXG5cdH1cclxuXHJcblx0LyoqXHJcblx0ICogU3RvcmUgYSB2YWx1ZSBpbiBpZGJcclxuXHQgKi9cclxuXHRzZXQodmFsdWUpIHtcclxuXHRcdHJldHVybiB0aGlzLl90cmFuc2FjdGlvbih0cnVlKVxyXG5cdFx0XHQudGhlbih0cmFucyA9PiB0cmFucy5wdXQodmFsdWUpKTtcclxuXHR9XHJcblxyXG5cdC8qKlxyXG5cdCAqIFJlbW92ZSBhIHZhbHVlIGZyb20gaWRiXHJcblx0ICovXHJcblx0cmVtb3ZlKGtleSkge1xyXG5cdFx0cmV0dXJuIHRoaXMuX3RyYW5zYWN0aW9uKHRydWUpXHJcblx0XHRcdC50aGVuKHRyYW5zID0+IHRyYW5zLmRlbGV0ZShrZXkpKTtcclxuXHR9XHJcbn1cclxuXHJcbm1vZHVsZS5leHBvcnRzID0gSWRiQWRhcHRvcjtcclxuIiwiLyoqXHJcbiAqIEluc3RhbnRpYXRlIGFsbCB0aGUgZGF0YSBzdG9yZXNcclxuICovXHJcblxyXG52YXIgSHR0cEFkYXB0b3IgPSByZXF1aXJlKFwiLi4vLi4vY29tbW9uL2RhdGEtc3RvcmVzL2h0dHAtYWRhcHRvclwiKTtcclxudmFyIFBvb2xTdG9yZSA9IHJlcXVpcmUoXCIuLi8uLi9jb21tb24vZGF0YS1zdG9yZXMvcG9vbC1zdG9yZVwiKTtcclxudmFyIFN5bmNlciA9IHJlcXVpcmUoXCIuLi8uLi9jb21tb24vZGF0YS1zdG9yZXMvc3luY2VyXCIpO1xyXG52YXIgSWRiQWRhcHRvciA9IHJlcXVpcmUoXCIuL2lkYi1hZGFwdG9yXCIpO1xyXG5cclxudmFyIGluaXRJdGVtID0gaXRlbSA9PiB7XHJcblx0Ly8gaW5zdGFudGlhdGUgdGhlIGRhdGVcclxuXHRpZihpdGVtLmRhdGUpIHtcclxuXHRcdGl0ZW0uZGF0ZSA9IG5ldyBEYXRlKGl0ZW0uZGF0ZSk7XHJcblx0fVxyXG59O1xyXG5cclxuLy8gY3JlYXRlIGEgc3luY2VyXHJcbnZhciBhc3NpZ25tZW50c0FkYXB0b3IgPSBuZXcgU3luY2VyKHtcclxuXHRyZW1vdGU6IG5ldyBIdHRwQWRhcHRvcihcIi9hcGkvZGF0YS9cIiksXHJcblx0bG9jYWw6IG5ldyBJZGJBZGFwdG9yKFwiYXNzaWdubWVudHNcIiksXHJcblx0Y2hhbmdlU3RvcmU6IG5ldyBJZGJBZGFwdG9yKFwic3luYy1zdG9yZVwiKVxyXG59KTtcclxuXHJcbmV4cG9ydHMuYXNzaWdubWVudHMgPSBuZXcgUG9vbFN0b3JlKGFzc2lnbm1lbnRzQWRhcHRvciwgaW5pdEl0ZW0pO1xyXG5cclxuLy8gY2hlY2sgb3VyIGFjY2VzcyBsZXZlbFxyXG5hc3NpZ25tZW50c0FkYXB0b3IuYWNjZXNzTGV2ZWwoKVxyXG5cclxuLnRoZW4obGV2ZWwgPT4ge1xyXG5cdC8vIHdlIGFyZSBsb2dnZWQgb3V0XHJcblx0aWYobGV2ZWwgPT0gXCJub25lXCIpIHtcclxuXHRcdGxpZmVMaW5lLm5hdi5uYXZpZ2F0ZShcIi9sb2dpblwiKTtcclxuXHR9XHJcbn0pO1xyXG5cclxudmFyIHByb2dyZXNzO1xyXG5cclxuLy8gc3RhcnQgdGhlIHN5bmNcclxuYXNzaWdubWVudHNBZGFwdG9yLm9uKFwic3luYy1zdGFydFwiLCAoKSA9PiBwcm9ncmVzcyA9IG5ldyBsaWZlTGluZS5Qcm9ncmVzcygpKVxyXG4vLyB1cGRhdGUgdGhlIHByb2dyZXNzXHJcbmFzc2lnbm1lbnRzQWRhcHRvci5vbihcInByb2dyZXNzXCIsIHZhbHVlID0+IHByb2dyZXNzLnNldCh2YWx1ZSkpO1xyXG4vLyB0aGUgc3luYyBpcyBkb25lXHJcbmFzc2lnbm1lbnRzQWRhcHRvci5vbihcInN5bmMtY29tcGxldGVcIiwgdmFsdWUgPT4gcHJvZ3Jlc3Muc2V0KDEpKTtcclxuXHJcbi8vIHRyaWdnZXIgYSBzeW5jXHJcbmxpZmVMaW5lLnN5bmMgPSBmdW5jdGlvbigpIHtcclxuXHQvLyB0cmlnZ2VyIGEgc3luY1xyXG5cdHJldHVybiBhc3NpZ25tZW50c0FkYXB0b3Iuc3luYygpXHJcblxyXG5cdC8vIGZvcmNlIGEgcmVmZXNoXHJcblx0LnRoZW4oKCkgPT4gbGlmZUxpbmUubmF2Lm5hdmlnYXRlKGxvY2F0aW9uLnBhdGhuYW1lKSk7XHJcbn07XHJcblxyXG5pZih0eXBlb2Ygd2luZG93ID09IFwib2JqZWN0XCIpIHtcclxuXHQvLyBpbml0aWFsIHN5bmNcclxuXHRzZXRUaW1lb3V0KCgpID0+IGxpZmVMaW5lLnN5bmMoKSk7XHJcblxyXG5cdC8vIHN5bmMgd2hlbiB3ZSByZXZpc2l0IHRoZSBwYWdlXHJcblx0d2luZG93LmFkZEV2ZW50TGlzdGVuZXIoXCJ2aXNpYmlsaXR5Y2hhbmdlXCIsICgpID0+IHtcclxuXHRcdGlmKCFkb2N1bWVudC5oaWRkZW4pIHtcclxuXHRcdFx0bGlmZUxpbmUuc3luYygpO1xyXG5cdFx0fVxyXG5cdH0pO1xyXG5cclxuXHQvLyBzeW5jIHdoZW4gd2UgcmVjb25uZWN0XHJcblx0d2luZG93LmFkZEV2ZW50TGlzdGVuZXIoXCJvbmxpbmVcIiwgKCkgPT4ge1xyXG5cdFx0bGlmZUxpbmUuc3luYygpO1xyXG5cdH0pO1xyXG59XHJcbiIsIi8qKlxyXG4gKiBCcm93c2VyIHNwZWNpZmljIGdsb2JhbHNcclxuICovXHJcblxyXG5saWZlTGluZS5tYWtlRG9tID0gcmVxdWlyZShcIi4vdXRpbC9kb20tbWFrZXJcIik7XHJcblxyXG4vLyBhZGQgYSBmdW5jdGlvbiBmb3IgYWRkaW5nIGFjdGlvbnNcclxubGlmZUxpbmUuYWRkQWN0aW9uID0gZnVuY3Rpb24obmFtZSwgZm4pIHtcclxuXHQvLyBhdHRhY2ggdGhlIGNhbGxiYWNrXHJcblx0dmFyIGxpc3RlbmVyID0gbGlmZUxpbmUub24oXCJhY3Rpb24tZXhlYy1cIiArIG5hbWUsIGZuKTtcclxuXHJcblx0Ly8gaW5mb3JtIGFueSBhY3Rpb24gcHJvdmlkZXJzXHJcblx0bGlmZUxpbmUuZW1pdChcImFjdGlvbi1jcmVhdGVcIiwgbmFtZSk7XHJcblxyXG5cdC8vIGFsbCBhY3Rpb25zIHJlbW92ZWRcclxuXHR2YXIgcmVtb3ZlQWxsID0gbGlmZUxpbmUub24oXCJhY3Rpb24tcmVtb3ZlLWFsbFwiLCAoKSA9PiB7XHJcblx0XHQvLyByZW1vdmUgdGhlIGFjdGlvbiBsaXN0ZW5lclxyXG5cdFx0bGlzdGVuZXIudW5zdWJzY3JpYmUoKTtcclxuXHRcdHJlbW92ZUFsbC51bnN1YnNjcmliZSgpO1xyXG5cdH0pO1xyXG5cclxuXHRyZXR1cm4ge1xyXG5cdFx0dW5zdWJzY3JpYmUoKSB7XHJcblx0XHRcdC8vIHJlbW92ZSB0aGUgYWN0aW9uIGxpc3RlbmVyXHJcblx0XHRcdGxpc3RlbmVyLnVuc3Vic2NyaWJlKCk7XHJcblx0XHRcdHJlbW92ZUFsbC51bnN1YnNjcmliZSgpO1xyXG5cclxuXHRcdFx0Ly8gaW5mb3JtIGFueSBhY3Rpb24gcHJvdmlkZXJzXHJcblx0XHRcdGxpZmVMaW5lLmVtaXQoXCJhY3Rpb24tcmVtb3ZlXCIsIG5hbWUpO1xyXG5cdFx0fVxyXG5cdH07XHJcbn07XHJcbiIsIi8vIGNyZWF0ZSB0aGUgZ2xvYmFsIG9iamVjdFxyXG5yZXF1aXJlKFwiLi4vY29tbW9uL2dsb2JhbFwiKTtcclxucmVxdWlyZShcIi4vZ2xvYmFsXCIpO1xyXG5cclxuLy8gbG9hZCBhbGwgdGhlIHdpZGdldHNcclxucmVxdWlyZShcIi4vd2lkZ2V0cy9zaWRlYmFyXCIpO1xyXG5yZXF1aXJlKFwiLi93aWRnZXRzL2NvbnRlbnRcIik7XHJcbnJlcXVpcmUoXCIuL3dpZGdldHMvbGlua1wiKTtcclxucmVxdWlyZShcIi4vd2lkZ2V0cy9saXN0XCIpO1xyXG5yZXF1aXJlKFwiLi93aWRnZXRzL2lucHV0XCIpO1xyXG5yZXF1aXJlKFwiLi93aWRnZXRzL3Byb2dyZXNzXCIpO1xyXG5yZXF1aXJlKFwiLi93aWRnZXRzL3RvZ2dsZS1idG5zXCIpO1xyXG5cclxuLy8gbG9hZCBhbGwgdGhlIHZpZXdzXHJcbnZhciB7aW5pdE5hdkJhcn0gPSByZXF1aXJlKFwiLi92aWV3cy9saXN0c1wiKTtcclxucmVxdWlyZShcIi4vdmlld3MvaXRlbVwiKTtcclxucmVxdWlyZShcIi4vdmlld3MvZWRpdFwiKTtcclxucmVxdWlyZShcIi4vdmlld3MvbG9naW5cIik7XHJcbnJlcXVpcmUoXCIuL3ZpZXdzL2FjY291bnRcIik7XHJcbnJlcXVpcmUoXCIuL3ZpZXdzL3VzZXJzXCIpO1xyXG5yZXF1aXJlKFwiLi92aWV3cy90b2RvXCIpO1xyXG5cclxuLy8gaW5zdGFudGlhdGUgdGhlIGRvbVxyXG5saWZlTGluZS5tYWtlRG9tKHtcclxuXHRwYXJlbnQ6IGRvY3VtZW50LmJvZHksXHJcblx0Z3JvdXA6IFtcclxuXHRcdHsgd2lkZ2V0OiBcInNpZGViYXJcIiB9LFxyXG5cdFx0eyB3aWRnZXQ6IFwicHJvZ3Jlc3NcIiB9LFxyXG5cdFx0eyB3aWRnZXQ6IFwiY29udGVudFwiIH1cclxuXHRdXHJcbn0pO1xyXG5cclxuLy8gQWRkIGEgbGluayB0byB0aGUgdG9kYS9ob21lIHBhZ2VcclxubGlmZUxpbmUuYWRkTmF2Q29tbWFuZChcIlRvZG9cIiwgXCIvXCIpO1xyXG5cclxuLy8gYWRkIGxpc3Qgdmlld3MgdG8gdGhlIG5hdmJhclxyXG5pbml0TmF2QmFyKCk7XHJcblxyXG4vLyBjcmVhdGUgYSBuZXcgYXNzaWdubWVudFxyXG5saWZlTGluZS5hZGRDb21tYW5kKFwiTmV3IGFzc2lnbm1lbnRcIiwgKCkgPT4ge1xyXG5cdHZhciBpZCA9IE1hdGguZmxvb3IoTWF0aC5yYW5kb20oKSAqIDEwMDAwMDAwMCk7XHJcblxyXG5cdGxpZmVMaW5lLm5hdi5uYXZpZ2F0ZShcIi9lZGl0L1wiICsgaWQpO1xyXG59KTtcclxuXHJcbi8vIGNyZWF0ZSB0aGUgbG9nb3V0IGJ1dHRvblxyXG5saWZlTGluZS5hZGROYXZDb21tYW5kKFwiQWNjb3VudFwiLCBcIi9hY2NvdW50XCIpO1xyXG5cclxuLy8gcmVnaXN0ZXIgdGhlIHNlcnZpY2Ugd29ya2VyXHJcbnJlcXVpcmUoXCIuL3N3LWhlbHBlclwiKTtcclxuIiwiLyoqXHJcbiAqIFJlZ2lzdGVyIGFuZCBjb21tdW5pY2F0ZSB3aXRoIHRoZSBzZXJ2aWNlIHdvcmtlclxyXG4gKi9cclxuXHJcbiAvLyByZWdpc3RlciB0aGUgc2VydmljZSB3b3JrZXJcclxuIGlmKG5hdmlnYXRvci5zZXJ2aWNlV29ya2VyKSB7XHJcblx0IC8vIG1ha2Ugc3VyZSBpdCdzIHJlZ2lzdGVyZWRcclxuXHQgbmF2aWdhdG9yLnNlcnZpY2VXb3JrZXIucmVnaXN0ZXIoXCIvc2VydmljZS13b3JrZXIuanNcIik7XHJcblxyXG5cdCAvLyBsaXN0ZW4gZm9yIG1lc3NhZ2VzXHJcblx0IG5hdmlnYXRvci5zZXJ2aWNlV29ya2VyLmFkZEV2ZW50TGlzdGVuZXIoXCJtZXNzYWdlXCIsIGUgPT4ge1xyXG5cdFx0IC8vIHdlIGp1c3QgdXBkYXRlZFxyXG5cdFx0IGlmKGUuZGF0YS50eXBlID09IFwidmVyc2lvbi1jaGFuZ2VcIikge1xyXG5cdFx0XHQgY29uc29sZS5sb2coXCJVcGRhdGVkIHRvXCIsIGUuZGF0YS52ZXJzaW9uKTtcclxuXHJcblx0XHRcdCAvLyBpbiBkZXYgbW9kZSByZWxvYWQgdGhlIHBhZ2VcclxuXHRcdFx0IGlmKGUuZGF0YS52ZXJzaW9uLmluZGV4T2YoXCJAXCIpICE9PSAtMSkge1xyXG5cdFx0XHRcdCBsb2NhdGlvbi5yZWxvYWQoKTtcclxuXHRcdFx0IH1cclxuXHRcdCB9XHJcbiAgICAgICAgIC8vIGEgbm90aWZpY2F0aW9uIHdhcyBqdXN0IGNsaWNrZWQgb3Igc29tZXRoaW5nXHJcbiAgICAgICAgIGVsc2UgaWYoZS5kYXRhLnR5cGUgPT0gXCJuYXZpZ2F0ZVwiKSB7XHJcbiAgICAgICAgICAgICBsaWZlTGluZS5uYXYubmF2aWdhdGUoZS5kYXRhLnVybCk7XHJcbiAgICAgICAgIH1cclxuXHQgfSk7XHJcbiB9XHJcbiIsIi8qKlxyXG4qIERhdGUgcmVsYXRlZCB0b29sc1xyXG4qL1xyXG5cclxuLy8gY2hlY2sgaWYgdGhlIGRhdGVzIGFyZSB0aGUgc2FtZSBkYXlcclxuZXhwb3J0cy5pc1NhbWVEYXRlID0gZnVuY3Rpb24oZGF0ZTEsIGRhdGUyKSB7XHJcblx0cmV0dXJuIGRhdGUxLmdldEZ1bGxZZWFyKCkgPT0gZGF0ZTIuZ2V0RnVsbFllYXIoKSAmJlxyXG5cdFx0ZGF0ZTEuZ2V0TW9udGgoKSA9PSBkYXRlMi5nZXRNb250aCgpICYmXHJcblx0XHRkYXRlMS5nZXREYXRlKCkgPT0gZGF0ZTIuZ2V0RGF0ZSgpO1xyXG59O1xyXG5cclxuLy8gY2hlY2sgaWYgYSBkYXRlIGlzIGxlc3MgdGhhbiBhbm90aGVyXHJcbmV4cG9ydHMuaXNTb29uZXJEYXRlID0gZnVuY3Rpb24oZGF0ZTEsIGRhdGUyKSB7XHJcbiAgICAvLyBjaGVjayB0aGUgeWVhciBmaXJzdFxyXG4gICAgaWYoZGF0ZTEuZ2V0RnVsbFllYXIoKSAhPSBkYXRlMi5nZXRGdWxsWWVhcigpKSB7XHJcbiAgICAgICAgcmV0dXJuIGRhdGUxLmdldEZ1bGxZZWFyKCkgPCBkYXRlMi5nZXRGdWxsWWVhcigpO1xyXG4gICAgfVxyXG5cclxuICAgIC8vIGNoZWNrIHRoZSBtb250aCBuZXh0XHJcbiAgICBpZihkYXRlMS5nZXRNb250aCgpICE9IGRhdGUyLmdldE1vbnRoKCkpIHtcclxuICAgICAgICByZXR1cm4gZGF0ZTEuZ2V0TW9udGgoKSA8IGRhdGUyLmdldE1vbnRoKCk7XHJcbiAgICB9XHJcblxyXG4gICAgLy8gY2hlY2sgdGhlIGRheVxyXG4gICAgcmV0dXJuIGRhdGUxLmdldERhdGUoKSA8IGRhdGUyLmdldERhdGUoKTtcclxufTtcclxuXHJcbi8vIGdldCB0aGUgZGF0ZSBkYXlzIGZyb20gbm93XHJcbmV4cG9ydHMuZGF5c0Zyb21Ob3cgPSBmdW5jdGlvbihkYXlzKSB7XHJcblx0dmFyIGRhdGUgPSBuZXcgRGF0ZSgpO1xyXG5cclxuXHQvLyBhZHZhbmNlIHRoZSBkYXRlXHJcblx0ZGF0ZS5zZXREYXRlKGRhdGUuZ2V0RGF0ZSgpICsgZGF5cyk7XHJcblxyXG5cdHJldHVybiBkYXRlO1xyXG59O1xyXG5cclxuY29uc3QgU1RSSU5HX0RBWVMgPSBbXCJTdW5kYXlcIiwgXCJNb25kYXlcIiwgXCJUdWVzZGF5XCIsIFwiV2VkZW5zZGF5XCIsIFwiVGh1cnNkYXlcIiwgXCJGcmlkYXlcIiwgXCJTYXR1cmRheVwiXTtcclxuXHJcbi8vIGNvbnZlcnQgYSBkYXRlIHRvIGEgc3RyaW5nXHJcbmV4cG9ydHMuc3RyaW5naWZ5RGF0ZSA9IGZ1bmN0aW9uKGRhdGUsIG9wdHMgPSB7fSkge1xyXG5cdCB2YXIgc3RyRGF0ZSwgc3RyVGltZSA9IFwiXCI7XHJcblxyXG4gICAgLy8gY2hlY2sgaWYgdGhlIGRhdGUgaXMgYmVmb3JlIHRvZGF5XHJcbiAgICB2YXIgYmVmb3JlTm93ID0gZGF0ZS5nZXRUaW1lKCkgPCBEYXRlLm5vdygpO1xyXG5cclxuXHQvLyBUb2RheVxyXG5cdGlmKGV4cG9ydHMuaXNTYW1lRGF0ZShkYXRlLCBuZXcgRGF0ZSgpKSlcclxuXHRcdHN0ckRhdGUgPSBcIlRvZGF5XCI7XHJcblxyXG5cdC8vIFRvbW9ycm93XHJcblx0ZWxzZSBpZihleHBvcnRzLmlzU2FtZURhdGUoZGF0ZSwgZXhwb3J0cy5kYXlzRnJvbU5vdygxKSkgJiYgIWJlZm9yZU5vdylcclxuXHRcdHN0ckRhdGUgPSBcIlRvbW9ycm93XCI7XHJcblxyXG5cdC8vIGRheSBvZiB0aGUgd2VlayAodGhpcyB3ZWVrKVxyXG5cdGVsc2UgaWYoZXhwb3J0cy5pc1Nvb25lckRhdGUoZGF0ZSwgZXhwb3J0cy5kYXlzRnJvbU5vdyg3KSkgJiYgIWJlZm9yZU5vdylcclxuXHRcdHN0ckRhdGUgPSBTVFJJTkdfREFZU1tkYXRlLmdldERheSgpXTtcclxuXHJcblx0Ly8gcHJpbnQgdGhlIGRhdGVcclxuXHRlbHNlXHJcblx0IFx0c3RyRGF0ZSA9IGAke1NUUklOR19EQVlTW2RhdGUuZ2V0RGF5KCldfSAke2RhdGUuZ2V0TW9udGgoKSArIDF9LyR7ZGF0ZS5nZXREYXRlKCl9YDtcclxuXHJcblx0Ly8gYWRkIHRoZSB0aW1lIG9uXHJcblx0aWYob3B0cy5pbmNsdWRlVGltZSAmJiAhZXhwb3J0cy5pc1NraXBUaW1lKGRhdGUsIG9wdHMuc2tpcFRpbWVzKSkge1xyXG5cdFx0cmV0dXJuIHN0ckRhdGUgKyBcIiwgXCIgKyBleHBvcnRzLnN0cmluZ2lmeVRpbWUoZGF0ZSk7XHJcblx0fVxyXG5cclxuXHRyZXR1cm4gc3RyRGF0ZTtcclxufTtcclxuXHJcbi8vIGNoZWNrIGlmIHRoaXMgaXMgb25lIG9mIHRoZSBnaXZlbiBza2lwIHRpbWVzXHJcbmV4cG9ydHMuaXNTa2lwVGltZSA9IGZ1bmN0aW9uKGRhdGUsIHNraXBzID0gW10pIHtcclxuXHRyZXR1cm4gc2tpcHMuZmluZChza2lwID0+IHtcclxuXHRcdHJldHVybiBza2lwLmhvdXIgPT09IGRhdGUuZ2V0SG91cnMoKSAmJiBza2lwLm1pbnV0ZSA9PT0gZGF0ZS5nZXRNaW51dGVzKCk7XHJcblx0fSk7XHJcbn07XHJcblxyXG4vLyBjb252ZXJ0IGEgdGltZSB0byBhIHN0cmluZ1xyXG5leHBvcnRzLnN0cmluZ2lmeVRpbWUgPSBmdW5jdGlvbihkYXRlKSB7XHJcblx0dmFyIGhvdXIgPSBkYXRlLmdldEhvdXJzKCk7XHJcblxyXG5cdC8vIGdldCB0aGUgYW0vcG0gdGltZVxyXG5cdHZhciBpc0FtID0gaG91ciA8IDEyO1xyXG5cclxuXHQvLyBtaWRuaWdodFxyXG5cdGlmKGhvdXIgPT09IDApIGhvdXIgPSAxMjtcclxuXHQvLyBhZnRlciBub29uXHJcblx0aWYoaG91ciA+IDEyKSBob3VyID0gaG91ciAtIDEyO1xyXG5cclxuXHR2YXIgbWludXRlID0gZGF0ZS5nZXRNaW51dGVzKCk7XHJcblxyXG5cdC8vIGFkZCBhIGxlYWRpbmcgMFxyXG5cdGlmKG1pbnV0ZSA8IDEwKSBtaW51dGUgPSBcIjBcIiArIG1pbnV0ZTtcclxuXHJcblx0cmV0dXJuIGhvdXIgKyBcIjpcIiArIG1pbnV0ZSArIChpc0FtID8gXCJhbVwiIDogXCJwbVwiKTtcclxufVxyXG4iLCIvKipcclxuICogQSBoZWxwZXIgZm9yIGJ1aWxkaW5nIGRvbSBub2Rlc1xyXG4gKi9cclxuXHJcbmNvbnN0IFNWR19FTEVNRU5UUyA9IFtcInN2Z1wiLCBcImxpbmVcIl07XHJcbmNvbnN0IFNWR19OQU1FU1BBQ0UgPSBcImh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnXCI7XHJcblxyXG4vLyBidWlsZCBhIHNpbmdsZSBkb20gbm9kZVxyXG52YXIgbWFrZURvbSA9IGZ1bmN0aW9uKG9wdHMgPSB7fSkge1xyXG5cdC8vIGdldCBvciBjcmVhdGUgdGhlIG5hbWUgbWFwcGluZ1xyXG5cdHZhciBtYXBwZWQgPSBvcHRzLm1hcHBlZCB8fCB7fTtcclxuXHJcblx0dmFyICRlbDtcclxuXHJcblx0Ly8gdGhlIGVsZW1lbnQgaXMgcGFydCBvZiB0aGUgc3ZnIG5hbWVzcGFjZVxyXG5cdGlmKFNWR19FTEVNRU5UUy5pbmRleE9mKG9wdHMudGFnKSAhPT0gLTEpIHtcclxuXHRcdCRlbCA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnROUyhTVkdfTkFNRVNQQUNFLCBvcHRzLnRhZyk7XHJcblx0fVxyXG5cdC8vIGEgcGxhaW4gZWxlbWVudFxyXG5cdGVsc2Uge1xyXG5cdFx0JGVsID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudChvcHRzLnRhZyB8fCBcImRpdlwiKTtcclxuXHR9XHJcblxyXG5cdC8vIHNldCB0aGUgY2xhc3Nlc1xyXG5cdGlmKG9wdHMuY2xhc3Nlcykge1xyXG5cdFx0JGVsLnNldEF0dHJpYnV0ZShcImNsYXNzXCIsIHR5cGVvZiBvcHRzLmNsYXNzZXMgPT0gXCJzdHJpbmdcIiA/IG9wdHMuY2xhc3NlcyA6IG9wdHMuY2xhc3Nlcy5qb2luKFwiIFwiKSk7XHJcblx0fVxyXG5cclxuXHQvLyBhdHRhY2ggdGhlIGF0dHJpYnV0ZXNcclxuXHRpZihvcHRzLmF0dHJzKSB7XHJcblx0XHRPYmplY3QuZ2V0T3duUHJvcGVydHlOYW1lcyhvcHRzLmF0dHJzKVxyXG5cclxuXHRcdC5mb3JFYWNoKGF0dHIgPT4gJGVsLnNldEF0dHJpYnV0ZShhdHRyLCBvcHRzLmF0dHJzW2F0dHJdKSk7XHJcblx0fVxyXG5cclxuXHQvLyBzZXQgdGhlIHRleHQgY29udGVudFxyXG5cdGlmKG9wdHMudGV4dCkge1xyXG5cdFx0JGVsLmlubmVyVGV4dCA9IG9wdHMudGV4dDtcclxuXHR9XHJcblxyXG5cdC8vIGF0dGFjaCB0aGUgbm9kZSB0byBpdHMgcGFyZW50XHJcblx0aWYob3B0cy5wYXJlbnQpIHtcclxuXHRcdG9wdHMucGFyZW50Lmluc2VydEJlZm9yZSgkZWwsIG9wdHMuYmVmb3JlKTtcclxuXHR9XHJcblxyXG5cdC8vIGFkZCBldmVudCBsaXN0ZW5lcnNcclxuXHRpZihvcHRzLm9uKSB7XHJcblx0XHRmb3IobGV0IG5hbWUgb2YgT2JqZWN0LmdldE93blByb3BlcnR5TmFtZXMob3B0cy5vbikpIHtcclxuXHRcdFx0JGVsLmFkZEV2ZW50TGlzdGVuZXIobmFtZSwgb3B0cy5vbltuYW1lXSk7XHJcblxyXG5cdFx0XHQvLyBhdHRhY2ggdGhlIGRvbSB0byBhIGRpc3Bvc2FibGVcclxuXHRcdFx0aWYob3B0cy5kaXNwKSB7XHJcblx0XHRcdFx0b3B0cy5kaXNwLmFkZCh7XHJcblx0XHRcdFx0XHR1bnN1YnNjcmliZTogKCkgPT4gJGVsLnJlbW92ZUV2ZW50TGlzdGVuZXIobmFtZSwgb3B0cy5vbltuYW1lXSlcclxuXHRcdFx0XHR9KTtcclxuXHRcdFx0fVxyXG5cdFx0fVxyXG5cdH1cclxuXHJcblx0Ly8gc2V0IHRoZSB2YWx1ZSBvZiBhbiBpbnB1dCBlbGVtZW50XHJcblx0aWYob3B0cy52YWx1ZSkge1xyXG5cdFx0JGVsLnZhbHVlID0gb3B0cy52YWx1ZTtcclxuXHR9XHJcblxyXG5cdC8vIGFkZCB0aGUgbmFtZSBtYXBwaW5nXHJcblx0aWYob3B0cy5uYW1lKSB7XHJcblx0XHRtYXBwZWRbb3B0cy5uYW1lXSA9ICRlbDtcclxuXHR9XHJcblxyXG5cdC8vIGNyZWF0ZSB0aGUgY2hpbGQgZG9tIG5vZGVzXHJcblx0aWYob3B0cy5jaGlsZHJlbikge1xyXG5cdFx0Zm9yKGxldCBjaGlsZCBvZiBvcHRzLmNoaWxkcmVuKSB7XHJcblx0XHRcdC8vIG1ha2UgYW4gYXJyYXkgaW50byBhIGdyb3VwIE9iamVjdFxyXG5cdFx0XHRpZihBcnJheS5pc0FycmF5KGNoaWxkKSkge1xyXG5cdFx0XHRcdGNoaWxkID0ge1xyXG5cdFx0XHRcdFx0Z3JvdXA6IGNoaWxkXHJcblx0XHRcdFx0fTtcclxuXHRcdFx0fVxyXG5cclxuXHRcdFx0Ly8gYXR0YWNoIGluZm9ybWF0aW9uIGZvciB0aGUgZ3JvdXBcclxuXHRcdFx0Y2hpbGQucGFyZW50ID0gJGVsO1xyXG5cdFx0XHRjaGlsZC5kaXNwID0gb3B0cy5kaXNwO1xyXG5cdFx0XHRjaGlsZC5tYXBwZWQgPSBtYXBwZWQ7XHJcblxyXG5cdFx0XHQvLyBidWlsZCB0aGUgbm9kZSBvciBncm91cFxyXG5cdFx0XHRtYWtlKGNoaWxkKTtcclxuXHRcdH1cclxuXHR9XHJcblxyXG5cdHJldHVybiBtYXBwZWQ7XHJcbn1cclxuXHJcbi8vIGJ1aWxkIGEgZ3JvdXAgb2YgZG9tIG5vZGVzXHJcbnZhciBtYWtlR3JvdXAgPSBmdW5jdGlvbihncm91cCkge1xyXG5cdC8vIHNob3J0aGFuZCBmb3IgYSBncm91cHNcclxuXHRpZihBcnJheS5pc0FycmF5KGdyb3VwKSkge1xyXG5cdFx0Z3JvdXAgPSB7XHJcblx0XHRcdGNoaWxkcmVuOiBncm91cFxyXG5cdFx0fTtcclxuXHR9XHJcblxyXG5cdC8vIGdldCBvciBjcmVhdGUgdGhlIG5hbWUgbWFwcGluZ1xyXG5cdHZhciBtYXBwZWQgPSB7fTtcclxuXHJcblx0Zm9yKGxldCBub2RlIG9mIGdyb3VwLmdyb3VwKSB7XHJcblx0XHQvLyBjb3B5IG92ZXIgcHJvcGVydGllcyBmcm9tIHRoZSBncm91cFxyXG5cdFx0bm9kZS5wYXJlbnQgfHwgKG5vZGUucGFyZW50ID0gZ3JvdXAucGFyZW50KTtcclxuXHRcdG5vZGUuZGlzcCB8fCAobm9kZS5kaXNwID0gZ3JvdXAuZGlzcCk7XHJcblx0XHRub2RlLm1hcHBlZCA9IG1hcHBlZDtcclxuXHJcblx0XHQvLyBtYWtlIHRoZSBkb21cclxuXHRcdG1ha2Uobm9kZSk7XHJcblx0fVxyXG5cclxuXHQvLyBjYWxsIHRoZSBjYWxsYmFjayB3aXRoIHRoZSBtYXBwZWQgbmFtZXNcclxuXHRpZihncm91cC5iaW5kKSB7XHJcblx0XHR2YXIgc3Vic2NyaXB0aW9uID0gZ3JvdXAuYmluZChtYXBwZWQpO1xyXG5cclxuXHRcdC8vIGlmIHRoZSByZXR1cm4gYSBzdWJzY3JpcHRpb24gYXR0YWNoIGl0IHRvIHRoZSBkaXNwb3NhYmxlXHJcblx0XHRpZihzdWJzY3JpcHRpb24gJiYgZ3JvdXAuZGlzcCkge1xyXG5cdFx0XHRncm91cC5kaXNwLmFkZChzdWJzY3JpcHRpb24pO1xyXG5cdFx0fVxyXG5cdH1cclxuXHJcblx0cmV0dXJuIG1hcHBlZDtcclxufTtcclxuXHJcbi8vIGEgY29sbGVjdGlvbiBvZiB3aWRnZXRzXHJcbnZhciB3aWRnZXRzID0ge307XHJcblxyXG52YXIgbWFrZSA9IG1vZHVsZS5leHBvcnRzID0gZnVuY3Rpb24ob3B0cykge1xyXG5cdC8vIGhhbmRsZSBhIGdyb3VwXHJcblx0aWYoQXJyYXkuaXNBcnJheShvcHRzKSB8fCBvcHRzLmdyb3VwKSB7XHJcblx0XHRyZXR1cm4gbWFrZUdyb3VwKG9wdHMpO1xyXG5cdH1cclxuXHQvLyBtYWtlIGEgd2lkZ2V0XHJcblx0ZWxzZSBpZihvcHRzLndpZGdldCkge1xyXG5cdFx0dmFyIHdpZGdldCA9IHdpZGdldHNbb3B0cy53aWRnZXRdO1xyXG5cclxuXHRcdC8vIG5vdCBkZWZpbmVkXHJcblx0XHRpZighd2lkZ2V0KSB7XHJcblx0XHRcdHRocm93IG5ldyBFcnJvcihgV2lkZ2V0ICcke29wdHMud2lkZ2V0fScgaXMgbm90IGRlZmluZWQgbWFrZSBzdXJlIGl0cyBiZWVuIGltcG9ydGVkYCk7XHJcblx0XHR9XHJcblxyXG5cdFx0Ly8gZ2VuZXJhdGUgdGhlIHdpZGdldCBjb250ZW50XHJcblx0XHR2YXIgYnVpbHQgPSB3aWRnZXQubWFrZShvcHRzKTtcclxuXHJcblx0XHRyZXR1cm4gbWFrZUdyb3VwKHtcclxuXHRcdFx0cGFyZW50OiBvcHRzLnBhcmVudCxcclxuXHRcdFx0ZGlzcDogb3B0cy5kaXNwLFxyXG5cdFx0XHRncm91cDogQXJyYXkuaXNBcnJheShidWlsdCkgPyBidWlsdCA6IFtidWlsdF0sXHJcblx0XHRcdGJpbmQ6IHdpZGdldC5iaW5kICYmIHdpZGdldC5iaW5kLmJpbmQod2lkZ2V0LCBvcHRzKVxyXG5cdFx0fSk7XHJcblx0fVxyXG5cdC8vIG1ha2UgYSBzaW5nbGUgbm9kZVxyXG5cdGVsc2Uge1xyXG5cdFx0cmV0dXJuIG1ha2VEb20ob3B0cyk7XHJcblx0fVxyXG59O1xyXG5cclxuLy8gcmVnaXN0ZXIgYSB3aWRnZXRcclxubWFrZS5yZWdpc3RlciA9IGZ1bmN0aW9uKG5hbWUsIHdpZGdldCkge1xyXG5cdHdpZGdldHNbbmFtZV0gPSB3aWRnZXQ7XHJcbn07XHJcbiIsIi8qKlxyXG4gKiBBIHZpZXcgZm9yIGFjY2Vzc2luZy9tb2RpZnlpbmcgaW5mb3JtYXRpb24gYWJvdXQgdGhlIGN1cnJlbnQgdXNlclxyXG4gKi9cclxuXHJcbnZhciB7Z2VuQmFja3VwTmFtZX0gPSByZXF1aXJlKFwiLi4vLi4vY29tbW9uL2JhY2t1cFwiKTtcclxuXHJcbmxpZmVMaW5lLm5hdi5yZWdpc3Rlcih7XHJcblx0bWF0Y2hlcjogL14oPzpcXC91c2VyXFwvKC4rPyl8XFwvYWNjb3VudCkkLyxcclxuXHJcblx0bWFrZSh7c2V0VGl0bGUsIGNvbnRlbnQsIG1hdGNofSkge1xyXG5cdFx0c2V0VGl0bGUoXCJBY2NvdW50XCIpO1xyXG5cclxuXHRcdHZhciB1cmwgPSBcIi9hcGkvYXV0aC9pbmZvL2dldFwiO1xyXG5cclxuXHRcdC8vIGFkZCB0aGUgdXNlcm5hbWUgaWYgb25lIGlzIGdpdmVuXHJcblx0XHRpZihtYXRjaFsxXSkgdXJsICs9IGA/dXNlcm5hbWU9JHttYXRjaFsxXX1gO1xyXG5cclxuXHRcdC8vIGxvYWQgdGhlIHVzZXIgZGF0YVxyXG5cdFx0ZmV0Y2godXJsLCB7IGNyZWRlbnRpYWxzOiBcImluY2x1ZGVcIiB9KVxyXG5cclxuXHRcdC50aGVuKHJlcyA9PiByZXMuanNvbigpKVxyXG5cclxuXHRcdC50aGVuKHJlcyA9PiB7XHJcblx0XHRcdC8vIG5vIHN1Y2ggdXNlciBvciBhY2Nlc3MgaXMgZGVuaWVkXHJcblx0XHRcdGlmKHJlcy5zdGF0dXMgPT0gXCJmYWlsXCIpIHtcclxuXHRcdFx0XHRsaWZlTGluZS5tYWtlRG9tKHtcclxuXHRcdFx0XHRcdHBhcmVudDogY29udGVudCxcclxuXHRcdFx0XHRcdGNsYXNzZXM6IFwiY29udGVudC1wYWRkZWRcIixcclxuXHRcdFx0XHRcdHRleHQ6IFwiQ291bGQgbm90IGFjY2VzcyB0aGUgdXNlciB5b3Ugd2VyZSBsb29raW5nIGZvclwiXHJcblx0XHRcdFx0fSk7XHJcblxyXG5cdFx0XHRcdHJldHVybjtcclxuXHRcdFx0fVxyXG5cclxuXHRcdFx0dmFyIHVzZXIgPSByZXMuZGF0YTtcclxuXHJcblx0XHRcdC8vIGdlbmVyYXRlIHRoZSBwYWdlXHJcblx0XHRcdHZhciBjaGlsZHJlbiA9IFtdO1xyXG5cclxuXHRcdFx0Y2hpbGRyZW4ucHVzaCh7XHJcblx0XHRcdFx0dGFnOiBcImgyXCIsXHJcblx0XHRcdFx0dGV4dDogdXNlci51c2VybmFtZVxyXG5cdFx0XHR9KTtcclxuXHJcblx0XHRcdC8vIGRpc3BsYXkgdGhlIGFkbWluIHN0YXR1cyBvZiBhbm90aGVyIHVzZXJcclxuXHRcdFx0aWYobWF0Y2hbMV0pIHtcclxuXHRcdFx0XHRjaGlsZHJlbi5wdXNoKHtcclxuXHRcdFx0XHRcdHRleHQ6IGAke3VzZXIudXNlcm5hbWV9IGlzICR7dXNlci5hZG1pbiA/IFwiXCIgOiBcIm5vdFwifSBhbiBhZG1pbmBcclxuXHRcdFx0XHR9KTtcclxuXHRcdFx0fVxyXG5cdFx0XHQvLyBkaXNwbGF5IHRoZSBhZG1pbiBzdGF0dXMgb2YgdGhpcyB1c2VyXHJcblx0XHRcdGVsc2Uge1xyXG5cdFx0XHRcdGNoaWxkcmVuLnB1c2goe1xyXG5cdFx0XHRcdFx0dGV4dDogYFlvdSBhcmUgJHt1c2VyLmFkbWluID8gXCJcIiA6IFwibm90XCJ9IGFuIGFkbWluYFxyXG5cdFx0XHRcdH0pO1xyXG5cclxuXHRcdFx0XHQvLyBhZGQgYSBsaW5rIGF0IGEgbGlzdCBvZiBhbGwgdXNlcnNcclxuXHRcdFx0XHRpZih1c2VyLmFkbWluKSB7XHJcblx0XHRcdFx0XHRjaGlsZHJlbi5wdXNoKHsgdGFnOiBcImJyXCIgfSk7XHJcblxyXG5cdFx0XHRcdFx0Y2hpbGRyZW4ucHVzaCh7XHJcblx0XHRcdFx0XHRcdHdpZGdldDogXCJsaW5rXCIsXHJcblx0XHRcdFx0XHRcdGhyZWY6IFwiL3VzZXJzXCIsXHJcblx0XHRcdFx0XHRcdHRleHQ6IFwiVmlldyBhbGwgdXNlcnNcIlxyXG5cdFx0XHRcdFx0fSk7XHJcblx0XHRcdFx0fVxyXG5cdFx0XHR9XHJcblxyXG5cdFx0XHQvLyBhZGQgdGhlIGVuYWJsZSByZW1pbmRlcnMgYnV0dG9uXHJcblx0XHRcdGNoaWxkcmVuLnB1c2goe1xyXG5cdFx0XHRcdHRhZzogXCJidXR0b25cIixcclxuXHRcdFx0XHRjbGFzc2VzOiBcImZhbmN5LWJ1dHRvblwiLFxyXG5cdFx0XHRcdGF0dHJzOiB7IHN0eWxlOiBcImRpc3BsYXk6IG5vbmU7XCIgfSxcclxuXHRcdFx0XHR0ZXh0OiBcIkVuYWJsZSByZW1pbmRlcnNcIixcclxuXHRcdFx0XHRuYW1lOiBcInB1c2hCdG5cIixcclxuXHRcdFx0XHRvbjoge1xyXG5cdFx0XHRcdFx0Y2xpY2s6ICgpID0+IHtcclxuXHRcdFx0XHRcdFx0bmF2aWdhdG9yLnNlcnZpY2VXb3JrZXIucmVhZHkudGhlbihyZWcgPT4ge1xyXG5cdFx0XHRcdFx0XHRcdC8vIGdldCB0aGUgcHVibGljIGtleVxyXG5cdFx0XHRcdFx0XHRcdGZldGNoKFwiL2FwaS9wdWJsaWMta2V5XCIsIHtcclxuXHRcdFx0XHRcdFx0XHRcdGNyZWRlbnRpYWxzOiBcImluY2x1ZGVcIlxyXG5cdFx0XHRcdFx0XHRcdH0pXHJcblxyXG5cdFx0XHRcdFx0XHRcdC50aGVuKHJlcyA9PiByZXMuYXJyYXlCdWZmZXIoKSlcclxuXHJcblx0XHRcdFx0XHRcdFx0LnRoZW4oa2V5ID0+IHtcclxuXHRcdFx0XHRcdFx0XHRcdC8vIGdldCBhIHN1YnNjcmlwdGlvblxyXG5cdFx0XHRcdFx0XHRcdFx0cmV0dXJuIHJlZy5wdXNoTWFuYWdlci5zdWJzY3JpYmUoe1xyXG5cdFx0XHRcdFx0XHRcdFx0XHR1c2VyVmlzaWJsZU9ubHk6IHRydWUsXHJcblx0XHRcdFx0XHRcdFx0XHRcdGFwcGxpY2F0aW9uU2VydmVyS2V5OiBuZXcgVWludDhBcnJheShrZXkpXHJcblx0XHRcdFx0XHRcdFx0XHR9KTtcclxuXHRcdFx0XHRcdFx0XHR9KVxyXG5cclxuXHRcdFx0XHRcdFx0XHQudGhlbihzdWIgPT4ge1xyXG5cdFx0XHRcdFx0XHRcdFx0Ly8gc2VuZCB0aGUgc3Vic2NyaXB0aW9uIHRvIHRoZSBzZXJ2ZXJcclxuXHRcdFx0XHRcdFx0XHRcdGZldGNoKFwiL2FwaS9zdWJzY3JpcHRpb25cIiwge1xyXG5cdFx0XHRcdFx0XHRcdFx0XHRtZXRob2Q6IFwiUE9TVFwiLFxyXG5cdFx0XHRcdFx0XHRcdFx0XHRib2R5OiBKU09OLnN0cmluZ2lmeShzdWIpLFxyXG5cdFx0XHRcdFx0XHRcdFx0XHRjcmVkZW50aWFsczogXCJpbmNsdWRlXCJcclxuXHRcdFx0XHRcdFx0XHRcdH0pXHJcblxyXG5cdFx0XHRcdFx0XHRcdFx0Ly8gaGlkZSB0aGUgYnV0dG9uXHJcblx0XHRcdFx0XHRcdFx0XHQudGhlbigoKSA9PiBwdXNoQnRuLnN0eWxlLmRpc3BsYXkgPSBcIm5vbmVcIilcclxuXHRcdFx0XHRcdFx0XHR9KTtcclxuXHRcdFx0XHRcdFx0fSk7XHJcblx0XHRcdFx0XHR9XHJcblx0XHRcdFx0fVxyXG5cdFx0XHR9KTtcclxuXHJcblx0XHRcdC8vIGNoZWNrIGlmIHRoZXkgYXJlIGFscmVhZHkgZW5hYmxlZFxyXG5cdFx0XHRpZihuYXZpZ2F0b3Iuc2VydmljZVdvcmtlcikge1xyXG5cdFx0XHRcdG5hdmlnYXRvci5zZXJ2aWNlV29ya2VyLnJlYWR5LnRoZW4ocmVnID0+IHtcclxuXHRcdFx0XHRcdC8vIGNoZWNrIHRoYXQgcHVzaCBpcyBzdXBwb3J0ZWRcclxuXHRcdFx0XHRcdGlmKHJlZy5wdXNoTWFuYWdlcikge1xyXG5cdFx0XHRcdFx0XHRyZWcucHVzaE1hbmFnZXIuZ2V0U3Vic2NyaXB0aW9uKCkudGhlbihzdWIgPT4ge1xyXG5cdFx0XHRcdFx0XHRcdC8vIG5vIHN1YnNjcmlwdGlvblxyXG5cdFx0XHRcdFx0XHRcdGlmKCFzdWIpIHtcclxuXHRcdFx0XHRcdFx0XHRcdHB1c2hCdG4uc3R5bGUuZGlzcGxheSA9IFwiYmxvY2tcIjtcclxuXHRcdFx0XHRcdFx0XHR9XHJcblx0XHRcdFx0XHRcdH0pO1xyXG5cdFx0XHRcdFx0fVxyXG5cdFx0XHRcdH0pO1xyXG5cdFx0XHR9XHJcblxyXG5cdFx0XHQvLyBjcmVhdGUgYSBiYWNrdXAgbGlua1xyXG5cdFx0XHRpZighbWF0Y2hbMV0pIHtcclxuXHRcdFx0XHRjaGlsZHJlbi5wdXNoKHsgdGFnOiBcImJyXCIgfSk7XHJcblx0XHRcdFx0Y2hpbGRyZW4ucHVzaCh7IHRhZzogXCJiclwiIH0pO1xyXG5cclxuXHRcdFx0XHRjaGlsZHJlbi5wdXNoKHtcclxuXHRcdFx0XHRcdHRhZzogXCJhXCIsXHJcblx0XHRcdFx0XHR0ZXh0OiBcIkRvd25sb2FkIGJhY2t1cFwiLFxyXG5cdFx0XHRcdFx0YXR0cnM6IHtcclxuXHRcdFx0XHRcdFx0aHJlZjogXCIvYXBpL2JhY2t1cFwiLFxyXG5cdFx0XHRcdFx0XHRkb3dubG9hZDogZ2VuQmFja3VwTmFtZSgpXHJcblx0XHRcdFx0XHR9XHJcblx0XHRcdFx0fSk7XHJcblx0XHRcdH1cclxuXHJcblx0XHRcdHZhciBwYXNzd29yZENoYW5nZSA9IHt9O1xyXG5cclxuXHRcdFx0Y2hpbGRyZW4ucHVzaCh7XHJcblx0XHRcdFx0dGFnOiBcImZvcm1cIixcclxuXHRcdFx0XHRjaGlsZHJlbjogW1xyXG5cdFx0XHRcdFx0e1xyXG5cdFx0XHRcdFx0XHRjbGFzc2VzOiBcImVkaXRvci1yb3dcIixcclxuXHRcdFx0XHRcdFx0Y2hpbGRyZW46IFtcclxuXHRcdFx0XHRcdFx0XHR7XHJcblx0XHRcdFx0XHRcdFx0XHR3aWRnZXQ6IFwiaW5wdXRcIixcclxuXHRcdFx0XHRcdFx0XHRcdHR5cGU6IFwicGFzc3dvcmRcIixcclxuXHRcdFx0XHRcdFx0XHRcdHBsYWNlaG9sZGVyOiBcIk9sZCBwYXNzd29yZFwiLFxyXG5cdFx0XHRcdFx0XHRcdFx0YmluZDogcGFzc3dvcmRDaGFuZ2UsXHJcblx0XHRcdFx0XHRcdFx0XHRwcm9wOiBcIm9sZFBhc3N3b3JkXCJcclxuXHRcdFx0XHRcdFx0XHR9LFxyXG5cdFx0XHRcdFx0XHRcdHtcclxuXHRcdFx0XHRcdFx0XHRcdHdpZGdldDogXCJpbnB1dFwiLFxyXG5cdFx0XHRcdFx0XHRcdFx0dHlwZTogXCJwYXNzd29yZFwiLFxyXG5cdFx0XHRcdFx0XHRcdFx0cGxhY2Vob2xkZXI6IFwiTmV3IHBhc3N3b3JkXCIsXHJcblx0XHRcdFx0XHRcdFx0XHRiaW5kOiBwYXNzd29yZENoYW5nZSxcclxuXHRcdFx0XHRcdFx0XHRcdHByb3A6IFwicGFzc3dvcmRcIlxyXG5cdFx0XHRcdFx0XHRcdH1cclxuXHRcdFx0XHRcdFx0XVxyXG5cdFx0XHRcdFx0fSxcclxuXHRcdFx0XHRcdHtcclxuXHRcdFx0XHRcdFx0dGFnOiBcImJ1dHRvblwiLFxyXG5cdFx0XHRcdFx0XHRjbGFzc2VzOiBcImZhbmN5LWJ1dHRvblwiLFxyXG5cdFx0XHRcdFx0XHR0ZXh0OiBcIkNoYW5nZSBwYXNzd29yZFwiLFxyXG5cdFx0XHRcdFx0XHRhdHRyczoge1xyXG5cdFx0XHRcdFx0XHRcdHR5cGU6IFwic3VibWl0XCJcclxuXHRcdFx0XHRcdFx0fVxyXG5cdFx0XHRcdFx0fSxcclxuXHRcdFx0XHRcdHtcclxuXHRcdFx0XHRcdFx0bmFtZTogXCJtc2dcIlxyXG5cdFx0XHRcdFx0fVxyXG5cdFx0XHRcdF0sXHJcblx0XHRcdFx0b246IHtcclxuXHRcdFx0XHRcdC8vIGNoYW5nZSB0aGUgcGFzc3dvcmRcclxuXHRcdFx0XHRcdHN1Ym1pdDogZSA9PiB7XHJcblx0XHRcdFx0XHRcdGUucHJldmVudERlZmF1bHQoKTtcclxuXHJcblx0XHRcdFx0XHRcdC8vIG5vIHBhc3N3b3JkIHN1cHBsaWVkXHJcblx0XHRcdFx0XHRcdGlmKCFwYXNzd29yZENoYW5nZS5wYXNzd29yZCkge1xyXG5cdFx0XHRcdFx0XHRcdHNob3dNc2coXCJFbnRlciBhIG5ldyBwYXNzd29yZFwiKTtcclxuXHRcdFx0XHRcdFx0XHRyZXR1cm47XHJcblx0XHRcdFx0XHRcdH1cclxuXHJcblx0XHRcdFx0XHRcdC8vIHNlbmQgdGhlIHBhc3N3b3JkIGNoYW5nZSByZXF1ZXN0XHJcblx0XHRcdFx0XHRcdGZldGNoKGAvYXBpL2F1dGgvaW5mby9zZXQ/dXNlcm5hbWU9JHt1c2VyLnVzZXJuYW1lfWAsIHtcclxuXHRcdFx0XHRcdFx0XHRjcmVkZW50aWFsczogXCJpbmNsdWRlXCIsXHJcblx0XHRcdFx0XHRcdFx0bWV0aG9kOiBcIlBPU1RcIixcclxuXHRcdFx0XHRcdFx0XHRib2R5OiBKU09OLnN0cmluZ2lmeShwYXNzd29yZENoYW5nZSlcclxuXHRcdFx0XHRcdFx0fSlcclxuXHJcblx0XHRcdFx0XHRcdC50aGVuKHJlcyA9PiByZXMuanNvbigpKVxyXG5cclxuXHRcdFx0XHRcdFx0LnRoZW4ocmVzID0+IHtcclxuXHRcdFx0XHRcdFx0XHQvLyBwYXNzd29yZCBjaGFuZ2UgZmFpbGVkXHJcblx0XHRcdFx0XHRcdFx0aWYocmVzLnN0YXR1cyA9PSBcImZhaWxcIikge1xyXG5cdFx0XHRcdFx0XHRcdFx0c2hvd01zZyhyZXMuZGF0YS5tc2cpO1xyXG5cdFx0XHRcdFx0XHRcdH1cclxuXHJcblx0XHRcdFx0XHRcdFx0aWYocmVzLnN0YXR1cyA9PSBcInN1Y2Nlc3NcIikge1xyXG5cdFx0XHRcdFx0XHRcdFx0c2hvd01zZyhcIlBhc3N3b3JkIGNoYW5nZWRcIik7XHJcblx0XHRcdFx0XHRcdFx0fVxyXG5cdFx0XHRcdFx0XHR9KTtcclxuXHRcdFx0XHRcdH1cclxuXHRcdFx0XHR9XHJcblx0XHRcdH0pO1xyXG5cclxuXHRcdFx0Y2hpbGRyZW4ucHVzaCh7IHRhZzogXCJiclwiIH0pO1xyXG5cdFx0XHRjaGlsZHJlbi5wdXNoKHsgdGFnOiBcImJyXCIgfSk7XHJcblxyXG5cdFx0XHQvLyBvbmx5IGRpc3BsYXkgdGhlIGxvZ291dCBidXR0b24gaWYgd2UgYXJlIG9uIHRoZSAvYWNjb3VudCBwYWdlXHJcblx0XHRcdGlmKCFtYXRjaFsxXSkge1xyXG5cdFx0XHRcdGNoaWxkcmVuLnB1c2goe1xyXG5cdFx0XHRcdFx0dGFnOiBcImJ1dHRvblwiLFxyXG5cdFx0XHRcdFx0Y2xhc3NlczogXCJmYW5jeS1idXR0b25cIixcclxuXHRcdFx0XHRcdHRleHQ6IFwiTG9nb3V0XCIsXHJcblx0XHRcdFx0XHRvbjoge1xyXG5cdFx0XHRcdFx0XHRjbGljazogKCkgPT4ge1xyXG5cdFx0XHRcdFx0XHRcdC8vIHNlbmQgdGhlIGxvZ291dCByZXF1ZXN0XHJcblx0XHRcdFx0XHRcdFx0ZmV0Y2goXCIvYXBpL2F1dGgvbG9nb3V0XCIsIHsgY3JlZGVudGlhbHM6IFwiaW5jbHVkZVwiIH0pXHJcblxyXG5cdFx0XHRcdFx0XHRcdC8vIHJldHVybiB0byB0aGUgbG9naW4gcGFnZVxyXG5cdFx0XHRcdFx0XHRcdC50aGVuKCgpID0+IGxpZmVMaW5lLm5hdi5uYXZpZ2F0ZShcIi9sb2dpblwiKSk7XHJcblx0XHRcdFx0XHRcdH1cclxuXHRcdFx0XHRcdH1cclxuXHRcdFx0XHR9KTtcclxuXHRcdFx0fVxyXG5cclxuXHRcdFx0dmFyIHttc2csIHB1c2hCdG59ID0gbGlmZUxpbmUubWFrZURvbSh7XHJcblx0XHRcdFx0cGFyZW50OiBjb250ZW50LFxyXG5cdFx0XHRcdGNsYXNzZXM6IFwiY29udGVudC1wYWRkZWRcIixcclxuXHRcdFx0XHRjaGlsZHJlblxyXG5cdFx0XHR9KTtcclxuXHJcblx0XHRcdC8vIHNob3cgYSBtZXNzYWdlXHJcblx0XHRcdHZhciBzaG93TXNnID0gZnVuY3Rpb24odGV4dCkge1xyXG5cdFx0XHRcdG1zZy5pbm5lclRleHQgPSB0ZXh0O1xyXG5cdFx0XHR9O1xyXG5cdFx0fSlcclxuXHR9XHJcbn0pO1xyXG4iLCIvKipcclxuICogRWRpdCBhbiBhc3NpZ25lbW50XHJcbiAqL1xyXG5cclxudmFyIHtkYXlzRnJvbU5vdywgc3RyaW5naWZ5RGF0ZX0gPSByZXF1aXJlKFwiLi4vdXRpbC9kYXRlXCIpO1xyXG52YXIge2Fzc2lnbm1lbnRzfSA9IHJlcXVpcmUoXCIuLi9kYXRhLXN0b3Jlc1wiKTs7XHJcblxyXG5saWZlTGluZS5uYXYucmVnaXN0ZXIoe1xyXG5cdG1hdGNoZXI6IC9eXFwvZWRpdFxcLyguKz8pJC8sXHJcblxyXG5cdG1ha2Uoe21hdGNoLCBjb250ZW50LCBzZXRUaXRsZSwgZGlzcG9zYWJsZX0pIHtcclxuXHRcdHZhciBhY3Rpb25TdWIsIGRlbGV0ZVN1YjtcclxuXHJcblx0XHQvLyBpZiB3ZSBtYWtlIGEgY2hhbmdlIGRvbid0IHJlZnJlc2ggdGhlIHBhZ2VcclxuXHRcdHZhciBkZWJvdW5jZTtcclxuXHJcblx0XHQvLyBzeW5jIGlmIGFueXRoaW5nIGlzIGNoYW5nZWRcclxuXHRcdHZhciBjaGFuZ2VkID0gZmFsc2U7XHJcblxyXG5cdFx0dmFyIGNoYW5nZVN1YiA9IGFzc2lnbm1lbnRzLnF1ZXJ5KHsgaWQ6IG1hdGNoWzFdIH0sIGZ1bmN0aW9uKFtpdGVtXSkge1xyXG5cdFx0XHQvLyBpZiB3ZSBtYWtlIGEgY2hhbmdlIGRvbid0IHJlZnJlc2ggdGhlIHBhZ2VcclxuXHRcdFx0aWYoZGVib3VuY2UpIHtcclxuXHRcdFx0XHRkZWJvdW5jZSA9IGZhbHNlO1xyXG5cclxuXHRcdFx0XHRyZXR1cm47XHJcblx0XHRcdH1cclxuXHJcblx0XHRcdC8vIGNsZWFyIHRoZSBjb250ZW50XHJcblx0XHRcdGNvbnRlbnQuaW5uZXJIVE1MID0gXCJcIjtcclxuXHJcblx0XHRcdC8vIHJlbW92ZSB0aGUgcHJldmlvdXMgYWN0aW9uXHJcblx0XHRcdGlmKGFjdGlvblN1Yikge1xyXG5cdFx0XHRcdGFjdGlvblN1Yi51bnN1YnNjcmliZSgpO1xyXG5cdFx0XHRcdGRlbGV0ZVN1Yi51bnN1YnNjcmliZSgpO1xyXG5cdFx0XHR9XHJcblxyXG5cdFx0XHQvLyBhZGQgYSBidXR0b24gYmFjayB0byB0aGUgdmlld1xyXG5cdFx0XHRpZihpdGVtKSB7XHJcblx0XHRcdFx0YWN0aW9uU3ViID0gbGlmZUxpbmUuYWRkQWN0aW9uKFwiVmlld1wiLCAoKSA9PiBsaWZlTGluZS5uYXYubmF2aWdhdGUoXCIvaXRlbS9cIiArIGl0ZW0uaWQpKTtcclxuXHJcblx0XHRcdFx0ZGVsZXRlU3ViID0gbGlmZUxpbmUuYWRkQWN0aW9uKFwiRGVsZXRlXCIsICgpID0+IHtcclxuXHRcdFx0XHRcdC8vIHJlbW92ZSB0aGUgaXRlbVxyXG5cdFx0XHRcdFx0YXNzaWdubWVudHMucmVtb3ZlKGl0ZW0uaWQpO1xyXG5cclxuXHRcdFx0XHRcdC8vIG5hdmlnYXRlIGF3YXlcclxuXHRcdFx0XHRcdGxpZmVMaW5lLm5hdi5uYXZpZ2F0ZShcIi9cIik7XHJcblxyXG5cdFx0XHRcdFx0Ly8gc3luYyB0aGUgY2hhbmdlc1xyXG5cdFx0XHRcdFx0bGlmZUxpbmUuc3luYygpO1xyXG5cdFx0XHRcdH0pO1xyXG5cdFx0XHR9XHJcblxyXG5cdFx0XHQvLyBpZiB0aGUgaXRlbSBkb2VzIG5vdCBleGlzdCBjcmVhdGUgaXRcclxuXHRcdFx0aWYoIWl0ZW0pIHtcclxuXHRcdFx0XHRpdGVtID0ge1xyXG5cdFx0XHRcdFx0bmFtZTogXCJVbm5hbWVkIGl0ZW1cIixcclxuXHRcdFx0XHRcdGNsYXNzOiBcIkNsYXNzXCIsXHJcblx0XHRcdFx0XHRkYXRlOiBnZW5EYXRlKCksXHJcblx0XHRcdFx0XHRpZDogbWF0Y2hbMV0sXHJcblx0XHRcdFx0XHRkZXNjcmlwdGlvbjogXCJcIixcclxuXHRcdFx0XHRcdG1vZGlmaWVkOiBEYXRlLm5vdygpLFxyXG5cdFx0XHRcdFx0dHlwZTogXCJhc3NpZ25tZW50XCIsXHJcblx0XHRcdFx0XHRkb25lOiBmYWxzZVxyXG5cdFx0XHRcdH07XHJcblx0XHRcdH1cclxuXHJcblx0XHRcdC8vIHNldCB0aGUgaW5pdGFsIHRpdGxlXHJcblx0XHRcdHNldFRpdGxlKFwiRWRpdGluZ1wiKTtcclxuXHJcblx0XHRcdC8vIHNhdmUgY2hhbmdlc1xyXG5cdFx0XHR2YXIgY2hhbmdlID0gKCkgPT4ge1xyXG5cdFx0XHRcdC8vIHVwZGF0ZSB0aGUgbW9kaWZpZWQgZGF0ZVxyXG5cdFx0XHRcdGl0ZW0ubW9kaWZpZWQgPSBEYXRlLm5vdygpO1xyXG5cclxuXHRcdFx0XHQvLyBmaW5kIHRoZSBkYXRlIGFuZCB0aW1lIGlucHV0c1xyXG5cdFx0XHRcdHZhciBkYXRlSW5wdXQgPSBkb2N1bWVudC5xdWVyeVNlbGVjdG9yKFwiaW5wdXRbdHlwZT1kYXRlXVwiKTtcclxuXHRcdFx0XHR2YXIgdGltZUlucHV0ID0gZG9jdW1lbnQucXVlcnlTZWxlY3RvcihcImlucHV0W3R5cGU9dGltZV1cIik7XHJcblxyXG5cdFx0XHRcdC8vIHBhcnNlIHRoZSBkYXRlXHJcblx0XHRcdFx0aXRlbS5kYXRlID0gbmV3IERhdGUoZGF0ZUlucHV0LnZhbHVlICsgXCIgXCIgKyB0aW1lSW5wdXQudmFsdWUpO1xyXG5cclxuXHRcdFx0XHQvLyByZW1vdmUgYXNzaWduZW1udCBmaWVsZHMgZnJvbSB0YXNrc1xyXG5cdFx0XHRcdGlmKGl0ZW0udHlwZSA9PSBcInRhc2tcIikge1xyXG5cdFx0XHRcdFx0ZGVsZXRlIGl0ZW0uZGF0ZTtcclxuXHRcdFx0XHRcdGRlbGV0ZSBpdGVtLmNsYXNzO1xyXG5cdFx0XHRcdH1cclxuXHJcblx0XHRcdFx0Ly8gcmVtb3ZlIGV4YW0gZmllbGRzIGZyb20gdGFza3MgYW5kIGFzc2lnbm1lbnRzXHJcblx0XHRcdFx0aWYoaXRlbS50eXBlICE9IFwiZXhhbVwiKSB7XHJcblx0XHRcdFx0XHRkZWxldGUgaXRlbS5sb2NhdGlvbjtcclxuXHRcdFx0XHR9XHJcblx0XHRcdFx0ZWxzZSB7XHJcblx0XHRcdFx0XHRkZWxldGUgaXRlbS5kZXNjcmlwdGlvbjtcclxuXHRcdFx0XHR9XHJcblxyXG5cdFx0XHRcdC8vIGFkZCBhIGJ1dHRvbiBiYWNrIHRvIHRoZSB2aWV3XHJcblx0XHRcdFx0aWYoIWFjdGlvblN1Yikge1xyXG5cdFx0XHRcdFx0YWN0aW9uU3ViID0gbGlmZUxpbmUuYWRkQWN0aW9uKFwiVmlld1wiLCAoKSA9PiBsaWZlTGluZS5uYXYubmF2aWdhdGUoXCIvaXRlbS9cIiArIGl0ZW0uaWQpKTtcclxuXHJcblx0XHRcdFx0XHRkZWxldGVTdWIgPSBsaWZlTGluZS5hZGRBY3Rpb24oXCJEZWxldGVcIiwgKCkgPT4ge1xyXG5cdFx0XHRcdFx0XHQvLyByZW1vdmUgdGhlIGl0ZW1cclxuXHRcdFx0XHRcdFx0YXNzaWdubWVudHMucmVtb3ZlKGl0ZW0uaWQpO1xyXG5cclxuXHRcdFx0XHRcdFx0Ly8gbmF2aWdhdGUgYXdheVxyXG5cdFx0XHRcdFx0XHRsaWZlTGluZS5uYXYubmF2aWdhdGUoXCIvXCIpO1xyXG5cdFx0XHRcdFx0fSk7XHJcblx0XHRcdFx0fVxyXG5cclxuXHRcdFx0XHRkZWJvdW5jZSA9IHRydWU7XHJcblx0XHRcdFx0Y2hhbmdlZCA9IHRydWU7XHJcblxyXG5cdFx0XHRcdC8vIHNhdmUgdGhlIGNoYW5nZXNcclxuXHRcdFx0XHRhc3NpZ25tZW50cy5zZXQoaXRlbSk7XHJcblx0XHRcdH07XHJcblxyXG5cdFx0XHQvLyBoaWRlIGFuZCBzaG93IHNwZWNpZmljIGZpZWxkcyBmb3IgZGlmZmVyZW50IGFzc2lnbm1lbnQgdHlwZXNcclxuXHRcdFx0dmFyIHRvZ2dsZUZpZWxkcyA9ICgpID0+IHtcclxuXHRcdFx0XHRpZihpdGVtLnR5cGUgPT0gXCJ0YXNrXCIpIHtcclxuXHRcdFx0XHRcdG1hcHBlZC5jbGFzc0ZpZWxkLnN0eWxlLmRpc3BsYXkgPSBcIm5vbmVcIjtcclxuXHRcdFx0XHRcdG1hcHBlZC5kYXRlRmllbGQuc3R5bGUuZGlzcGxheSA9IFwibm9uZVwiO1xyXG5cdFx0XHRcdH1cclxuXHRcdFx0XHRlbHNlIHtcclxuXHRcdFx0XHRcdG1hcHBlZC5jbGFzc0ZpZWxkLnN0eWxlLmRpc3BsYXkgPSBcIlwiO1xyXG5cdFx0XHRcdFx0bWFwcGVkLmRhdGVGaWVsZC5zdHlsZS5kaXNwbGF5ID0gXCJcIjtcclxuXHRcdFx0XHR9XHJcblxyXG5cdFx0XHRcdGlmKGl0ZW0udHlwZSA9PSBcImV4YW1cIikge1xyXG5cdFx0XHRcdFx0bWFwcGVkLmRlc2NyaXB0aW9uRmllbGQuc3R5bGUuZGlzcGxheSA9IFwibm9uZVwiO1xyXG5cdFx0XHRcdFx0bWFwcGVkLmxvY2F0aW9uRmllbGQuc3R5bGUuZGlzcGxheSA9IFwiXCI7XHJcblx0XHRcdFx0fVxyXG5cdFx0XHRcdGVsc2Uge1xyXG5cdFx0XHRcdFx0bWFwcGVkLmRlc2NyaXB0aW9uRmllbGQuc3R5bGUuZGlzcGxheSA9IFwiXCI7XHJcblx0XHRcdFx0XHRtYXBwZWQubG9jYXRpb25GaWVsZC5zdHlsZS5kaXNwbGF5ID0gXCJub25lXCI7XHJcblx0XHRcdFx0fVxyXG5cclxuXHRcdFx0XHQvLyBmaWxsIGluIGRhdGUgaWYgaXQgaXMgbWlzc2luZ1xyXG5cdFx0XHRcdGlmKGl0ZW0udHlwZSAhPSBcInRhc2tcIikge1xyXG5cdFx0XHRcdFx0aWYoIWl0ZW0uZGF0ZSkge1xyXG5cdFx0XHRcdFx0XHRpdGVtLmRhdGUgPSBnZW5EYXRlKCk7XHJcblx0XHRcdFx0XHR9XHJcblxyXG5cdFx0XHRcdFx0aWYoIWl0ZW0uY2xhc3MpIHtcclxuXHRcdFx0XHRcdFx0aXRlbS5jbGFzcyA9IFwiQ2xhc3NcIjtcclxuXHRcdFx0XHRcdH1cclxuXHJcblx0XHRcdFx0XHRpZihpdGVtLnR5cGUgPT0gXCJleGFtXCIgJiYgIWl0ZW0ubG9jYXRpb24pIHtcclxuXHRcdFx0XHRcdFx0aXRlbS5sb2NhdGlvbiA9IFwiTG9jYXRpb25cIjtcclxuXHRcdFx0XHRcdH1cclxuXHRcdFx0XHR9XHJcblx0XHRcdH07XHJcblxyXG5cdFx0XHQvLyByZW5kZXIgdGhlIHVpXHJcblx0XHRcdHZhciBtYXBwZWQgPSBsaWZlTGluZS5tYWtlRG9tKHtcclxuXHRcdFx0XHRwYXJlbnQ6IGNvbnRlbnQsXHJcblx0XHRcdFx0Z3JvdXA6IFtcclxuXHRcdFx0XHRcdHtcclxuXHRcdFx0XHRcdFx0Y2xhc3NlczogXCJlZGl0b3Itcm93XCIsXHJcblx0XHRcdFx0XHRcdGNoaWxkcmVuOiBbXHJcblx0XHRcdFx0XHRcdFx0e1xyXG5cdFx0XHRcdFx0XHRcdFx0d2lkZ2V0OiBcImlucHV0XCIsXHJcblx0XHRcdFx0XHRcdFx0XHRiaW5kOiBpdGVtLFxyXG5cdFx0XHRcdFx0XHRcdFx0cHJvcDogXCJuYW1lXCIsXHJcblx0XHRcdFx0XHRcdFx0XHRjaGFuZ2VcclxuXHRcdFx0XHRcdFx0XHR9XHJcblx0XHRcdFx0XHRcdF1cclxuXHRcdFx0XHRcdH0sXHJcblx0XHRcdFx0XHR7XHJcblx0XHRcdFx0XHRcdGNsYXNzZXM6IFwiZWRpdG9yLXJvd1wiLFxyXG5cdFx0XHRcdFx0XHRjaGlsZHJlbjogW1xyXG5cdFx0XHRcdFx0XHRcdHtcclxuXHRcdFx0XHRcdFx0XHRcdHdpZGdldDogXCJ0b2dnbGUtYnRuc1wiLFxyXG5cdFx0XHRcdFx0XHRcdFx0YnRuczogW1xyXG5cdFx0XHRcdFx0XHRcdFx0XHR7IHRleHQ6IFwiQXNzaWdubWVudFwiLCB2YWx1ZTogXCJhc3NpZ25tZW50XCIgfSxcclxuXHRcdFx0XHRcdFx0XHRcdFx0eyB0ZXh0OiBcIlRhc2tcIiwgdmFsdWU6IFwidGFza1wiIH0sXHJcblx0XHRcdFx0XHRcdFx0XHRcdHsgdGV4dDogXCJFeGFtXCIsIHZhbHVlOiBcImV4YW1cIiB9XHJcblx0XHRcdFx0XHRcdFx0XHRdLFxyXG5cdFx0XHRcdFx0XHRcdFx0dmFsdWU6IGl0ZW0udHlwZSxcclxuXHRcdFx0XHRcdFx0XHRcdGNoYW5nZTogdHlwZSA9PiB7XHJcblx0XHRcdFx0XHRcdFx0XHRcdC8vIHVwZGF0ZSB0aGUgaXRlbSB0eXBlXHJcblx0XHRcdFx0XHRcdFx0XHRcdGl0ZW0udHlwZSA9IHR5cGU7XHJcblxyXG5cdFx0XHRcdFx0XHRcdFx0XHQvLyBoaWRlL3Nob3cgc3BlY2lmaWMgZmllbGRzXHJcblx0XHRcdFx0XHRcdFx0XHRcdHRvZ2dsZUZpZWxkcygpO1xyXG5cclxuXHRcdFx0XHRcdFx0XHRcdFx0Ly8gZW1pdCB0aGUgY2hhbmdlXHJcblx0XHRcdFx0XHRcdFx0XHRcdGNoYW5nZSgpO1xyXG5cdFx0XHRcdFx0XHRcdFx0fVxyXG5cdFx0XHRcdFx0XHRcdH1cclxuXHRcdFx0XHRcdFx0XVxyXG5cdFx0XHRcdFx0fSxcclxuXHRcdFx0XHRcdHtcclxuXHRcdFx0XHRcdFx0bmFtZTogXCJjbGFzc0ZpZWxkXCIsXHJcblx0XHRcdFx0XHRcdGNsYXNzZXM6IFwiZWRpdG9yLXJvd1wiLFxyXG5cdFx0XHRcdFx0XHRjaGlsZHJlbjogW1xyXG5cdFx0XHRcdFx0XHRcdHtcclxuXHRcdFx0XHRcdFx0XHRcdHdpZGdldDogXCJpbnB1dFwiLFxyXG5cdFx0XHRcdFx0XHRcdFx0YmluZDogaXRlbSxcclxuXHRcdFx0XHRcdFx0XHRcdHByb3A6IFwiY2xhc3NcIixcclxuXHRcdFx0XHRcdFx0XHRcdGNoYW5nZVxyXG5cdFx0XHRcdFx0XHRcdH1cclxuXHRcdFx0XHRcdFx0XVxyXG5cdFx0XHRcdFx0fSxcclxuXHRcdFx0XHRcdHtcclxuXHRcdFx0XHRcdFx0bmFtZTogXCJkYXRlRmllbGRcIixcclxuXHRcdFx0XHRcdFx0Y2xhc3NlczogXCJlZGl0b3Itcm93XCIsXHJcblx0XHRcdFx0XHRcdGNoaWxkcmVuOiBbXHJcblx0XHRcdFx0XHRcdFx0e1xyXG5cdFx0XHRcdFx0XHRcdFx0d2lkZ2V0OiBcImlucHV0XCIsXHJcblx0XHRcdFx0XHRcdFx0XHR0eXBlOiBcImRhdGVcIixcclxuXHRcdFx0XHRcdFx0XHRcdHZhbHVlOiBpdGVtLmRhdGUgJiYgYCR7aXRlbS5kYXRlLmdldEZ1bGxZZWFyKCl9LSR7cGFkKGl0ZW0uZGF0ZS5nZXRNb250aCgpICsgMSl9LSR7cGFkKGl0ZW0uZGF0ZS5nZXREYXRlKCkpfWAsXHJcblx0XHRcdFx0XHRcdFx0XHRjaGFuZ2VcclxuXHRcdFx0XHRcdFx0XHR9LFxyXG5cdFx0XHRcdFx0XHRcdHtcclxuXHRcdFx0XHRcdFx0XHRcdHdpZGdldDogXCJpbnB1dFwiLFxyXG5cdFx0XHRcdFx0XHRcdFx0dHlwZTogXCJ0aW1lXCIsXHJcblx0XHRcdFx0XHRcdFx0XHR2YWx1ZTogaXRlbS5kYXRlICYmIGAke2l0ZW0uZGF0ZS5nZXRIb3VycygpfToke3BhZChpdGVtLmRhdGUuZ2V0TWludXRlcygpKX1gLFxyXG5cdFx0XHRcdFx0XHRcdFx0Y2hhbmdlXHJcblx0XHRcdFx0XHRcdFx0fVxyXG5cdFx0XHRcdFx0XHRdXHJcblx0XHRcdFx0XHR9LFxyXG5cdFx0XHRcdFx0e1xyXG5cdFx0XHRcdFx0XHRuYW1lOiBcImxvY2F0aW9uRmllbGRcIixcclxuXHRcdFx0XHRcdFx0Y2xhc3NlczogXCJlZGl0b3Itcm93XCIsXHJcblx0XHRcdFx0XHRcdGNoaWxkcmVuOiBbXHJcblx0XHRcdFx0XHRcdFx0e1xyXG5cdFx0XHRcdFx0XHRcdFx0d2lkZ2V0OiBcImlucHV0XCIsXHJcblx0XHRcdFx0XHRcdFx0XHRiaW5kOiBpdGVtLFxyXG5cdFx0XHRcdFx0XHRcdFx0cHJvcDogXCJsb2NhdGlvblwiLFxyXG5cdFx0XHRcdFx0XHRcdFx0Y2hhbmdlXHJcblx0XHRcdFx0XHRcdFx0fVxyXG5cdFx0XHRcdFx0XHRdXHJcblx0XHRcdFx0XHR9LFxyXG5cdFx0XHRcdFx0e1xyXG5cdFx0XHRcdFx0XHRuYW1lOiBcImRlc2NyaXB0aW9uRmllbGRcIixcclxuXHRcdFx0XHRcdFx0Y2xhc3NlczogXCJ0ZXh0YXJlYS13cmFwcGVyXCIsXHJcblx0XHRcdFx0XHRcdGNoaWxkcmVuOiBbXHJcblx0XHRcdFx0XHRcdFx0e1xyXG5cdFx0XHRcdFx0XHRcdFx0d2lkZ2V0OiBcImlucHV0XCIsXHJcblx0XHRcdFx0XHRcdFx0XHR0YWc6IFwidGV4dGFyZWFcIixcclxuXHRcdFx0XHRcdFx0XHRcdGNsYXNzZXM6IFwidGV4dGFyZWEtZmlsbFwiLFxyXG5cdFx0XHRcdFx0XHRcdFx0cGxhY2Vob2xkZXI6IFwiRGVzY3JpcHRpb25cIixcclxuXHRcdFx0XHRcdFx0XHRcdGJpbmQ6IGl0ZW0sXHJcblx0XHRcdFx0XHRcdFx0XHRwcm9wOiBcImRlc2NyaXB0aW9uXCIsXHJcblx0XHRcdFx0XHRcdFx0XHRjaGFuZ2VcclxuXHRcdFx0XHRcdFx0XHR9XHJcblx0XHRcdFx0XHRcdF1cclxuXHRcdFx0XHRcdH1cclxuXHRcdFx0XHRdXHJcblx0XHRcdH0pO1xyXG5cclxuXHRcdFx0Ly8gc2hvdyB0aGUgZmllbGRzIGZvciB0aGlzIGl0ZW0gdHlwZVxyXG5cdFx0XHR0b2dnbGVGaWVsZHMoKTtcclxuXHRcdH0pO1xyXG5cclxuXHRcdC8vIHJlbW92ZSB0aGUgc3Vic2NyaXB0aW9uIHdoZW4gdGhpcyB2aWV3IGlzIGRlc3Ryb3llZFxyXG5cdFx0ZGlzcG9zYWJsZS5hZGQoY2hhbmdlU3ViKTtcclxuXHJcblx0XHQvLyBzeW5jIGlmIHdlIGNoYW5nZWQgYW55dGhpbmdcclxuXHRcdGRpc3Bvc2FibGUuYWRkKHtcclxuXHRcdFx0dW5zdWJzY3JpYmU6IGZ1bmN0aW9uKCkge1xyXG5cdFx0XHRcdGlmKGNoYW5nZWQpIHtcclxuXHRcdFx0XHRcdGxpZmVMaW5lLnN5bmMoKTtcclxuXHRcdFx0XHR9XHJcblx0XHRcdH1cclxuXHRcdH0pO1xyXG5cdH1cclxufSk7XHJcblxyXG4vLyBhZGQgYSBsZWFkaW5nIDAgaWYgYSBudW1iZXIgaXMgbGVzcyB0aGFuIDEwXHJcbnZhciBwYWQgPSBudW1iZXIgPT4gKG51bWJlciA8IDEwKSA/IFwiMFwiICsgbnVtYmVyIDogbnVtYmVyO1xyXG5cclxuLy8gY3JlYXRlIGEgZGF0ZSBvZiB0b2RheSBhdCAxMTo1OXBtXHJcbnZhciBnZW5EYXRlID0gKCkgPT4ge1xyXG5cdHZhciBkYXRlID0gbmV3IERhdGUoKTtcclxuXHJcblx0Ly8gc2V0IHRoZSB0aW1lXHJcblx0ZGF0ZS5zZXRIb3VycygyMyk7XHJcblx0ZGF0ZS5zZXRNaW51dGVzKDU5KTtcclxuXHJcblx0cmV0dXJuIGRhdGU7XHJcbn07XHJcbiIsIi8qKlxyXG4gKiBUaGUgdmlldyBmb3IgYW4gYXNzaWdubWVudFxyXG4gKi9cclxuXHJcbnZhciB7ZGF5c0Zyb21Ob3csIHN0cmluZ2lmeURhdGV9ID0gcmVxdWlyZShcIi4uL3V0aWwvZGF0ZVwiKTtcclxudmFyIHthc3NpZ25tZW50c30gPSByZXF1aXJlKFwiLi4vZGF0YS1zdG9yZXNcIik7XHJcblxyXG5saWZlTGluZS5uYXYucmVnaXN0ZXIoe1xyXG5cdG1hdGNoZXI6IC9eXFwvaXRlbVxcLyguKz8pJC8sXHJcblxyXG5cdG1ha2Uoe21hdGNoLCBzZXRUaXRsZSwgY29udGVudCwgZGlzcG9zYWJsZX0pIHtcclxuXHRcdHZhciBhY3Rpb25Eb25lU3ViLCBhY3Rpb25FZGl0U3ViO1xyXG5cclxuXHQgXHRkaXNwb3NhYmxlLmFkZChcclxuXHRcdFx0YXNzaWdubWVudHMucXVlcnkoeyBpZDogbWF0Y2hbMV0gfSwgZnVuY3Rpb24oW2l0ZW1dKSB7XHJcblx0XHRcdFx0Ly8gY2xlYXIgdGhlIGNvbnRlbnRcclxuXHRcdFx0XHRjb250ZW50LmlubmVySFRNTCA9IFwiXCI7XHJcblxyXG5cdFx0XHRcdC8vIHJlbW92ZSB0aGUgb2xkIGFjdGlvblxyXG5cdFx0XHRcdGlmKGFjdGlvbkVkaXRTdWIpIHtcclxuXHRcdFx0XHRcdGlmKGFjdGlvbkRvbmVTdWIpIGFjdGlvbkRvbmVTdWIudW5zdWJzY3JpYmUoKTtcclxuXHRcdFx0XHRcdGFjdGlvbkVkaXRTdWIudW5zdWJzY3JpYmUoKTtcclxuXHRcdFx0XHR9XHJcblxyXG5cdFx0XHRcdC8vIG5vIHN1Y2ggYXNzaWdubWVudFxyXG5cdFx0XHRcdGlmKCFpdGVtKSB7XHJcblx0XHRcdFx0XHRzZXRUaXRsZShcIk5vdCBmb3VuZFwiKTtcclxuXHJcblx0XHRcdFx0XHRsaWZlTGluZS5tYWtlRG9tKHtcclxuXHRcdFx0XHRcdFx0cGFyZW50OiBjb250ZW50LFxyXG5cdFx0XHRcdFx0XHRjbGFzc2VzOiBcImNvbnRlbnQtcGFkZGVkXCIsXHJcblx0XHRcdFx0XHRcdGNoaWxkcmVuOiBbXHJcblx0XHRcdFx0XHRcdFx0e1xyXG5cdFx0XHRcdFx0XHRcdFx0dGFnOiBcInNwYW5cIixcclxuXHRcdFx0XHRcdFx0XHRcdHRleHQ6IFwiVGhlIGFzc2lnbm1lbnQgeW91IHdoZXJlIGxvb2tpbmcgZm9yIGNvdWxkIG5vdCBiZSBmb3VuZC4gXCJcclxuXHRcdFx0XHRcdFx0XHR9LFxyXG5cdFx0XHRcdFx0XHRcdHtcclxuXHRcdFx0XHRcdFx0XHRcdHdpZGdldDogXCJsaW5rXCIsXHJcblx0XHRcdFx0XHRcdFx0XHRocmVmOiBcIi9cIixcclxuXHRcdFx0XHRcdFx0XHRcdHRleHQ6IFwiR28gaG9tZS5cIlxyXG5cdFx0XHRcdFx0XHRcdH1cclxuXHRcdFx0XHRcdFx0XVxyXG5cdFx0XHRcdFx0fSk7XHJcblxyXG5cdFx0XHRcdFx0cmV0dXJuO1xyXG5cdFx0XHRcdH1cclxuXHJcblx0XHRcdFx0Ly8gc2V0IHRoZSB0aXRsZSBmb3IgdGhlIGNvbnRlbnRcclxuXHRcdFx0XHRzZXRUaXRsZShpdGVtLnR5cGVbMF0udG9VcHBlckNhc2UoKSArIGl0ZW0udHlwZS5zdWJzdHIoMSkpO1xyXG5cclxuXHRcdFx0XHRpZihpdGVtLnR5cGUgIT0gXCJleGFtXCIpIHtcclxuXHRcdFx0XHRcdC8vIG1hcmsgdGhlIGl0ZW0gYXMgZG9uZVxyXG5cdFx0XHRcdFx0YWN0aW9uRG9uZVN1YiA9IGxpZmVMaW5lLmFkZEFjdGlvbihpdGVtLmRvbmUgPyBcIkRvbmVcIiA6IFwiTm90IGRvbmVcIiwgKCkgPT4ge1xyXG5cdFx0XHRcdFx0XHQvLyBtYXJrIHRoZSBpdGVtIGRvbmVcclxuXHRcdFx0XHRcdFx0aXRlbS5kb25lID0gIWl0ZW0uZG9uZTtcclxuXHJcblx0XHRcdFx0XHRcdC8vIHVwZGF0ZSB0aGUgbW9kaWZpZWQgdGltZVxyXG5cdFx0XHRcdFx0XHRpdGVtLm1vZGlmaWVkID0gRGF0ZS5ub3coKTtcclxuXHJcblx0XHRcdFx0XHRcdC8vIHNhdmUgdGhlIGNoYW5nZVxyXG5cdFx0XHRcdFx0XHRhc3NpZ25tZW50cy5zZXQoaXRlbSk7XHJcblxyXG5cdFx0XHRcdFx0XHQvLyBzeW5jIHRoZSBjaGFuZ2VcclxuXHRcdFx0XHRcdFx0bGlmZUxpbmUuc3luYygpO1xyXG5cdFx0XHRcdFx0fSk7XHJcblx0XHRcdFx0fVxyXG5cclxuXHRcdFx0XHQvLyBlZGl0IHRoZSBpdGVtXHJcblx0XHRcdFx0YWN0aW9uRWRpdFN1YiA9IGxpZmVMaW5lLmFkZEFjdGlvbihcIkVkaXRcIixcclxuXHRcdFx0XHRcdCgpID0+IGxpZmVMaW5lLm5hdi5uYXZpZ2F0ZShcIi9lZGl0L1wiICsgaXRlbS5pZCkpO1xyXG5cclxuXHRcdFx0XHQvLyB0aW1lcyB0byBza2lwXHJcblx0XHRcdFx0dmFyIHNraXBUaW1lcyA9IFtcclxuXHRcdFx0XHRcdHsgaG91cjogMjMsIG1pbnV0ZTogNTkgfVxyXG5cdFx0XHRcdF07XHJcblxyXG5cdFx0XHRcdGxpZmVMaW5lLm1ha2VEb20oe1xyXG5cdFx0XHRcdFx0cGFyZW50OiBjb250ZW50LFxyXG5cdFx0XHRcdFx0Y2xhc3NlczogXCJjb250ZW50LXBhZGRlZFwiLFxyXG5cdFx0XHRcdFx0Y2hpbGRyZW46IFtcclxuXHRcdFx0XHRcdFx0e1xyXG5cdFx0XHRcdFx0XHRcdGNsYXNzZXM6IFwiYXNzaWdubWVudC1uYW1lXCIsXHJcblx0XHRcdFx0XHRcdFx0dGV4dDogaXRlbS5uYW1lXHJcblx0XHRcdFx0XHRcdH0sXHJcblx0XHRcdFx0XHRcdHtcclxuXHRcdFx0XHRcdFx0XHRjbGFzc2VzOiBcImFzc2lnbm1lbnQtaW5mby1yb3dcIixcclxuXHRcdFx0XHRcdFx0XHRjaGlsZHJlbjogW1xyXG5cdFx0XHRcdFx0XHRcdFx0e1xyXG5cdFx0XHRcdFx0XHRcdFx0XHRjbGFzc2VzOiBcImFzc2lnbm1lbnQtaW5mby1ncm93XCIsXHJcblx0XHRcdFx0XHRcdFx0XHRcdHRleHQ6IGl0ZW0uY2xhc3NcclxuXHRcdFx0XHRcdFx0XHRcdH0sXHJcblx0XHRcdFx0XHRcdFx0XHR7XHJcblx0XHRcdFx0XHRcdFx0XHRcdHRleHQ6IGl0ZW0uZGF0ZSAmJiBzdHJpbmdpZnlEYXRlKGl0ZW0uZGF0ZSwgeyBpbmNsdWRlVGltZTogdHJ1ZSwgc2tpcFRpbWVzIH0pXHJcblx0XHRcdFx0XHRcdFx0XHR9XHJcblx0XHRcdFx0XHRcdFx0XVxyXG5cdFx0XHRcdFx0XHR9LFxyXG5cdFx0XHRcdFx0XHR7XHJcblx0XHRcdFx0XHRcdFx0Y2xhc3NlczogXCJhc3NpZ25tZW50LWRlc2NyaXB0aW9uXCIsXHJcblx0XHRcdFx0XHRcdFx0dGV4dDogaXRlbS5kZXNjcmlwdGlvbiB8fCBpdGVtLmxvY2F0aW9uXHJcblx0XHRcdFx0XHRcdH1cclxuXHRcdFx0XHRcdF1cclxuXHRcdFx0XHR9KTtcclxuXHRcdFx0fSlcclxuXHRcdCk7XHJcblx0fVxyXG59KTtcclxuIiwiLyoqXHJcbiAqIERpc3BsYXkgYSBsaXN0IG9mIHVwY29tbWluZyBhc3NpZ25tZW50c1xyXG4gKi9cclxuXHJcbnZhciB7ZGF5c0Zyb21Ob3csIGlzU2FtZURhdGUsIHN0cmluZ2lmeURhdGUsIHN0cmluZ2lmeVRpbWUsIGlzU29vbmVyRGF0ZX0gPSByZXF1aXJlKFwiLi4vdXRpbC9kYXRlXCIpO1xyXG52YXIge2Fzc2lnbm1lbnRzfSA9IHJlcXVpcmUoXCIuLi9kYXRhLXN0b3Jlc1wiKTtcclxuXHJcbi8vIGFsbCB0aGUgZGlmZmVyZW50IGxpc3RzXHJcbmNvbnN0IExJU1RTID0gW1xyXG5cdHtcclxuXHRcdHVybDogXCIvd2Vla1wiLFxyXG5cdFx0dGl0bGU6IFwiVGhpcyB3ZWVrXCIsXHJcblx0XHRjcmVhdGVDdHg6ICgpID0+ICh7XHJcblx0XHRcdC8vIGRheXMgdG8gdGhlIGVuZCBvZiB0aGlzIHdlZWtcclxuXHRcdFx0ZW5kRGF0ZTogZGF5c0Zyb21Ob3coNyAtIChuZXcgRGF0ZSgpKS5nZXREYXkoKSksXHJcblx0XHRcdC8vIHRvZGF5cyBkYXRlXHJcblx0XHRcdHRvZGF5OiBuZXcgRGF0ZSgpXHJcblx0XHR9KSxcclxuXHRcdC8vIHNob3cgYWxsIGF0IHJlYXNvbmFibGUgbnVtYmVyIG9mIGluY29tcGxldGUgYXNzaWdubWVudHNcclxuXHRcdGZpbHRlcjogKGl0ZW0sIHt0b2RheSwgZW5kRGF0ZX0pID0+IHtcclxuXHRcdFx0Ly8gc2hvdyBhbGwgdGFza3NcclxuXHRcdFx0aWYoaXRlbS50eXBlID09IFwidGFza1wiKSByZXR1cm4gdHJ1ZTtcclxuXHJcblx0XHRcdC8vIGNoZWNrIGlmIHRoZSBpdGVtIGlzIHBhc3QgdGhpcyB3ZWVrXHJcblx0XHRcdGlmKCFpc1Nvb25lckRhdGUoaXRlbS5kYXRlLCBlbmREYXRlKSAmJiAhaXNTYW1lRGF0ZShpdGVtLmRhdGUsIGVuZERhdGUpKSByZXR1cm47XHJcblxyXG5cdFx0XHQvLyBjaGVjayBpZiB0aGUgZGF0ZSBpcyBiZWZvcmUgdG9kYXlcclxuXHRcdFx0aWYoaXNTb29uZXJEYXRlKGl0ZW0uZGF0ZSwgdG9kYXkpKSByZXR1cm47XHJcblxyXG5cdFx0XHRyZXR1cm4gdHJ1ZTtcclxuXHRcdH0sXHJcblx0XHRxdWVyeTogeyBkb25lOiBmYWxzZSB9XHJcblx0fSxcclxuXHR7XHJcblx0XHR1cmw6IFwiL3VwY29taW5nXCIsXHJcblx0XHRxdWVyeTogeyBkb25lOiBmYWxzZSB9LFxyXG5cdFx0dGl0bGU6IFwiVXBjb21pbmdcIlxyXG5cdH0sXHJcblx0e1xyXG5cdFx0dXJsOiBcIi9kb25lXCIsXHJcblx0XHRxdWVyeTogeyBkb25lOiB0cnVlIH0sXHJcblx0XHR0aXRsZTogXCJEb25lXCJcclxuXHR9XHJcbl07XHJcblxyXG4vLyBhZGQgbGlzdCB2aWV3IGxpbmtzIHRvIHRoZSBuYXZiYXJcclxuZXhwb3J0cy5pbml0TmF2QmFyID0gZnVuY3Rpb24oKSB7XHJcblx0TElTVFMuZm9yRWFjaChsaXN0ID0+IGxpZmVMaW5lLmFkZE5hdkNvbW1hbmQobGlzdC50aXRsZSwgbGlzdC51cmwpKTtcclxufTtcclxuXHJcbmxpZmVMaW5lLm5hdi5yZWdpc3Rlcih7XHJcblx0bWF0Y2hlcih1cmwpIHtcclxuXHRcdHJldHVybiBMSVNUUy5maW5kKGxpc3QgPT4gbGlzdC51cmwgPT0gdXJsKTtcclxuXHR9LFxyXG5cclxuXHQvLyBtYWtlIHRoZSBsaXN0XHJcblx0bWFrZSh7c2V0VGl0bGUsIGNvbnRlbnQsIGRpc3Bvc2FibGUsIG1hdGNofSkge1xyXG5cdFx0ZGlzcG9zYWJsZS5hZGQoXHJcblx0XHRcdGFzc2lnbm1lbnRzLnF1ZXJ5KG1hdGNoLnF1ZXJ5IHx8IHt9LCBmdW5jdGlvbihkYXRhKSB7XHJcblx0XHRcdFx0Ly8gY2xlYXIgdGhlIGNvbnRlbnRcclxuXHRcdFx0XHRjb250ZW50LmlubmVySFRNTCA9IFwiXCI7XHJcblxyXG5cdFx0XHRcdC8vIHNldCB0aGUgcGFnZSB0aXRsZVxyXG5cdFx0XHRcdHNldFRpdGxlKG1hdGNoLnRpdGxlKTtcclxuXHJcblx0XHRcdFx0Ly8gdGhlIGNvbnRleHQgZm9yIHRoZSBmaWx0ZXIgZnVuY3Rpb25cclxuXHRcdFx0XHR2YXIgY3R4O1xyXG5cclxuXHRcdFx0XHRpZihtYXRjaC5jcmVhdGVDdHgpIHtcclxuXHRcdFx0XHRcdGN0eCA9IG1hdGNoLmNyZWF0ZUN0eCgpO1xyXG5cdFx0XHRcdH1cclxuXHJcblx0XHRcdFx0Ly8gcnVuIHRoZSBmaWx0ZXIgZnVuY3Rpb25cclxuXHRcdFx0XHRpZihtYXRjaC5maWx0ZXIpIHtcclxuXHRcdFx0XHRcdGRhdGEgPSBkYXRhLmZpbHRlcihpdGVtID0+IG1hdGNoLmZpbHRlcihpdGVtLCBjdHgpKTtcclxuXHRcdFx0XHR9XHJcblxyXG5cdFx0XHRcdC8vIHNvcnQgdGhlIGFzc2luZ21lbnRzXHJcblx0XHRcdFx0ZGF0YS5zb3J0KChhLCBiKSA9PiB7XHJcblx0XHRcdFx0XHQvLyB0YXNrcyBhcmUgYmVsb3cgYXNzaWdubWVudHNcclxuXHRcdFx0XHRcdGlmKGEudHlwZSA9PSBcInRhc2tcIiAmJiBiLnR5cGUgIT0gXCJ0YXNrXCIpIHJldHVybiAxO1xyXG5cdFx0XHRcdFx0aWYoYS50eXBlICE9IFwidGFza1wiICYmIGIudHlwZSA9PSBcInRhc2tcIikgcmV0dXJuIC0xO1xyXG5cclxuXHRcdFx0XHRcdC8vIHNvcnQgYnkgZHVlIGRhdGVcclxuXHRcdFx0XHRcdGlmKGEudHlwZSAhPSBcInRhc2tcIiAmJiBiLnR5cGUgIT0gXCJ0YXNrXCIpIHtcclxuXHRcdFx0XHRcdFx0aWYoYS5kYXRlLmdldFRpbWUoKSAhPSBiLmRhdGUuZ2V0VGltZSgpKSB7XHJcblx0XHRcdFx0XHRcdFx0cmV0dXJuIGEuZGF0ZS5nZXRUaW1lKCkgLSBiLmRhdGUuZ2V0VGltZSgpO1xyXG5cdFx0XHRcdFx0XHR9XHJcblx0XHRcdFx0XHR9XHJcblxyXG5cdFx0XHRcdFx0Ly8gb3JkZXIgYnkgbmFtZVxyXG5cdFx0XHRcdFx0aWYoYS5uYW1lIDwgYi5uYW1lKSByZXR1cm4gLTE7XHJcblx0XHRcdFx0XHRpZihhLm5hbWUgPiBiLm5hbWUpIHJldHVybiAxO1xyXG5cclxuXHRcdFx0XHRcdHJldHVybiAwO1xyXG5cdFx0XHRcdH0pO1xyXG5cclxuXHRcdFx0XHQvLyBtYWtlIHRoZSBncm91cHNcclxuXHRcdFx0XHR2YXIgZ3JvdXBzID0ge307XHJcblxyXG5cdFx0XHRcdC8vIHJlbmRlciB0aGUgbGlzdFxyXG5cdFx0XHRcdGRhdGEuZm9yRWFjaCgoaXRlbSwgaSkgPT4ge1xyXG5cdFx0XHRcdFx0Ly8gZ2V0IHRoZSBoZWFkZXIgbmFtZVxyXG5cdFx0XHRcdFx0dmFyIGRhdGVTdHIgPSBpdGVtLnR5cGUgPT0gXCJ0YXNrXCIgPyBcIlRhc2tzXCIgOiBzdHJpbmdpZnlEYXRlKGl0ZW0uZGF0ZSk7XHJcblxyXG5cdFx0XHRcdFx0Ly8gbWFrZSBzdXJlIHRoZSBoZWFkZXIgZXhpc3RzXHJcblx0XHRcdFx0XHRncm91cHNbZGF0ZVN0cl0gfHwgKGdyb3Vwc1tkYXRlU3RyXSA9IFtdKTtcclxuXHJcblx0XHRcdFx0XHQvLyBhZGQgdGhlIGl0ZW0gdG8gdGhlIGxpc3RcclxuXHRcdFx0XHRcdHZhciBpdGVtcyA9IFtcclxuXHRcdFx0XHRcdFx0eyB0ZXh0OiBpdGVtLm5hbWUsIGdyb3c6IHRydWUgfVxyXG5cdFx0XHRcdFx0XTtcclxuXHJcblx0XHRcdFx0XHRpZihpdGVtLnR5cGUgIT0gXCJ0YXNrXCIpIHtcclxuXHRcdFx0XHRcdFx0Ly8gc2hvdyB0aGUgZW5kIHRpbWUgZm9yIGFueSBub24gMTE6NTlwbSB0aW1lc1xyXG5cdFx0XHRcdFx0XHRpZihpdGVtLmRhdGUuZ2V0SG91cnMoKSAhPSAyMyB8fCBpdGVtLmRhdGUuZ2V0TWludXRlcygpICE9IDU5KSB7XHJcblx0XHRcdFx0XHRcdFx0aXRlbXMucHVzaChzdHJpbmdpZnlUaW1lKGl0ZW0uZGF0ZSkpO1xyXG5cdFx0XHRcdFx0XHR9XHJcblxyXG5cdFx0XHRcdFx0XHQvLyBzaG93IHRoZSBjbGFzc1xyXG5cdFx0XHRcdFx0XHRpdGVtcy5wdXNoKGl0ZW0uY2xhc3MgfHwgaXRlbS5sb2NhdGlvbik7XHJcblx0XHRcdFx0XHR9XHJcblxyXG5cdFx0XHRcdFx0Z3JvdXBzW2RhdGVTdHJdLnB1c2goe1xuXHRcdFx0XHRcdFx0aHJlZjogYC9pdGVtLyR7aXRlbS5pZH1gLFxuXHRcdFx0XHRcdFx0aXRlbXNcclxuXHRcdFx0XHRcdH0pO1xyXG5cdFx0XHRcdH0pO1xyXG5cclxuXHRcdFx0XHQvLyBkaXNwbGF5IGFsbCBpdGVtc1xyXG5cdFx0XHRcdGxpZmVMaW5lLm1ha2VEb20oe1xyXG5cdFx0XHRcdFx0cGFyZW50OiBjb250ZW50LFxyXG5cdFx0XHRcdFx0d2lkZ2V0OiBcImxpc3RcIixcclxuXHRcdFx0XHRcdGl0ZW1zOiBncm91cHNcclxuXHRcdFx0XHR9KTtcclxuXHRcdFx0fSlcclxuXHRcdCk7XHJcblx0fVxyXG59KTtcclxuIiwiLyoqXHJcbiAqIFNob3cgYSBsb2dpbiBidXR0b24gdG8gdGhlIHVzZXJcclxuICovXHJcblxyXG5saWZlTGluZS5uYXYucmVnaXN0ZXIoe1xyXG5cdG1hdGNoZXI6IFwiL2xvZ2luXCIsXHJcblxyXG5cdG1ha2Uoe3NldFRpdGxlLCBjb250ZW50fSkge1xyXG5cdFx0Ly8gc2V0IHRoZSBwYWdlIHRpdGxlXHJcblx0XHRzZXRUaXRsZShcIkxvZ2luXCIpO1xyXG5cclxuXHRcdC8vIHRoZSB1c2VycyBjcmVkZW50aWFsc1xyXG5cdFx0dmFyIGF1dGggPSB7fTtcclxuXHJcblx0XHQvLyBjcmVhdGUgdGhlIGxvZ2luIGZvcm1cclxuXHRcdHZhciB7dXNlcm5hbWUsIHBhc3N3b3JkLCBtc2d9ID0gbGlmZUxpbmUubWFrZURvbSh7XHJcblx0XHRcdHBhcmVudDogY29udGVudCxcclxuXHRcdFx0dGFnOiBcImZvcm1cIixcclxuXHRcdFx0Y2xhc3NlczogXCJjb250ZW50LXBhZGRlZFwiLFxyXG5cdFx0XHRjaGlsZHJlbjogW1xyXG5cdFx0XHRcdHtcclxuXHRcdFx0XHRcdGNsYXNzZXM6IFwiZWRpdG9yLXJvd1wiLFxyXG5cdFx0XHRcdFx0Y2hpbGRyZW46IFtcclxuXHRcdFx0XHRcdFx0e1xyXG5cdFx0XHRcdFx0XHRcdHdpZGdldDogXCJpbnB1dFwiLFxyXG5cdFx0XHRcdFx0XHRcdGJpbmQ6IGF1dGgsXHJcblx0XHRcdFx0XHRcdFx0cHJvcDogXCJ1c2VybmFtZVwiLFxyXG5cdFx0XHRcdFx0XHRcdHBsYWNlaG9sZGVyOiBcIlVzZXJuYW1lXCJcclxuXHRcdFx0XHRcdFx0fVxyXG5cdFx0XHRcdFx0XVxyXG5cdFx0XHRcdH0sXHJcblx0XHRcdFx0e1xyXG5cdFx0XHRcdFx0Y2xhc3NlczogXCJlZGl0b3Itcm93XCIsXHJcblx0XHRcdFx0XHRjaGlsZHJlbjogW1xyXG5cdFx0XHRcdFx0XHR7XHJcblx0XHRcdFx0XHRcdFx0d2lkZ2V0OiBcImlucHV0XCIsXHJcblx0XHRcdFx0XHRcdFx0YmluZDogYXV0aCxcclxuXHRcdFx0XHRcdFx0XHRwcm9wOiBcInBhc3N3b3JkXCIsXHJcblx0XHRcdFx0XHRcdFx0dHlwZTogXCJwYXNzd29yZFwiLFxyXG5cdFx0XHRcdFx0XHRcdHBsYWNlaG9sZGVyOiBcIlBhc3N3b3JkXCJcclxuXHRcdFx0XHRcdFx0fVxyXG5cdFx0XHRcdFx0XVxyXG5cdFx0XHRcdH0sXHJcblx0XHRcdFx0e1xyXG5cdFx0XHRcdFx0dGFnOiBcImJ1dHRvblwiLFxyXG5cdFx0XHRcdFx0dGV4dDogXCJMb2dpblwiLFxyXG5cdFx0XHRcdFx0Y2xhc3NlczogXCJmYW5jeS1idXR0b25cIixcclxuXHRcdFx0XHRcdGF0dHJzOiB7XHJcblx0XHRcdFx0XHRcdHR5cGU6IFwic3VibWl0XCJcclxuXHRcdFx0XHRcdH1cclxuXHRcdFx0XHR9LFxyXG5cdFx0XHRcdHtcclxuXHRcdFx0XHRcdGNsYXNzZXM6IFwiZXJyb3ItbXNnXCIsXHJcblx0XHRcdFx0XHRuYW1lOiBcIm1zZ1wiXHJcblx0XHRcdFx0fVxyXG5cdFx0XHRdLFxyXG5cdFx0XHRvbjoge1xyXG5cdFx0XHRcdHN1Ym1pdDogZSA9PiB7XHJcblx0XHRcdFx0XHRlLnByZXZlbnREZWZhdWx0KCk7XHJcblxyXG5cdFx0XHRcdFx0Ly8gc2VuZCB0aGUgbG9naW4gcmVxdWVzdFxyXG5cdFx0XHRcdFx0ZmV0Y2goXCIvYXBpL2F1dGgvbG9naW5cIiwge1xyXG5cdFx0XHRcdFx0XHRtZXRob2Q6IFwiUE9TVFwiLFxyXG5cdFx0XHRcdFx0XHRjcmVkZW50aWFsczogXCJpbmNsdWRlXCIsXHJcblx0XHRcdFx0XHRcdGJvZHk6IEpTT04uc3RyaW5naWZ5KGF1dGgpXHJcblx0XHRcdFx0XHR9KVxyXG5cclxuXHRcdFx0XHRcdC8vIHBhcnNlIHRoZSBqc29uXHJcblx0XHRcdFx0XHQudGhlbihyZXMgPT4gcmVzLmpzb24oKSlcclxuXHJcblx0XHRcdFx0XHQvLyBwcm9jZXNzIHRoZSByZXNwb25zZVxyXG5cdFx0XHRcdFx0LnRoZW4ocmVzID0+IHtcclxuXHRcdFx0XHRcdFx0Ly8gbG9naW4gc3VjZWVkZWQgZ28gaG9tZVxyXG5cdFx0XHRcdFx0XHRpZihyZXMuc3RhdHVzID09IFwic3VjY2Vzc1wiKSB7XHJcblx0XHRcdFx0XHRcdFx0bGlmZUxpbmUubmF2Lm5hdmlnYXRlKFwiL1wiKTtcclxuXHJcblx0XHRcdFx0XHRcdFx0Ly8gc3luYyBub3cgdGhhdCB3ZSBhcmUgbG9nZ2VkIGluXHJcblx0XHRcdFx0XHRcdFx0aWYobGlmZUxpbmUuc3luYykge1xyXG5cdFx0XHRcdFx0XHRcdFx0bGlmZUxpbmUuc3luYygpO1xyXG5cdFx0XHRcdFx0XHRcdH1cclxuXHJcblx0XHRcdFx0XHRcdFx0cmV0dXJuO1xyXG5cdFx0XHRcdFx0XHR9XHJcblxyXG5cdFx0XHRcdFx0XHQvLyBsb2dpbiBmYWlsZWRcclxuXHRcdFx0XHRcdFx0aWYocmVzLnN0YXR1cyA9PSBcImZhaWxcIikge1xyXG5cdFx0XHRcdFx0XHRcdGVycm9yTXNnKFwiTG9naW4gZmFpbGVkXCIpO1xyXG5cdFx0XHRcdFx0XHR9XHJcblx0XHRcdFx0XHR9KTtcclxuXHRcdFx0XHR9XHJcblx0XHRcdH1cclxuXHRcdH0pO1xyXG5cclxuXHRcdC8vIGRpc3BsYXkgYW4gZXJyb3IgbWVzc2FnZVxyXG5cdFx0dmFyIGVycm9yTXNnID0gZnVuY3Rpb24odGV4dCkge1xyXG5cdFx0XHRtc2cuaW5uZXJUZXh0ID0gdGV4dDtcclxuXHRcdH07XHJcblx0fVxyXG59KTtcclxuXHJcbi8vIGxvZ291dFxyXG5saWZlTGluZS5sb2dvdXQgPSBmdW5jdGlvbigpIHtcclxuXHQvLyBzZW5kIHRoZSBsb2dvdXQgcmVxdWVzdFxyXG5cdGZldGNoKFwiL2FwaS9hdXRoL2xvZ291dFwiLCB7XHJcblx0XHRjcmVkZW50aWFsczogXCJpbmNsdWRlXCJcclxuXHR9KVxyXG5cclxuXHQvLyBnbyB0byB0aGUgbG9naW4gcGFnZVxyXG5cdC50aGVuKCgpID0+IGxpZmVMaW5lLm5hdi5uYXZpZ2F0ZShcIi9sb2dpblwiKSk7XHJcbn07XHJcbiIsIi8qKlxyXG4gKiBBIGxpc3Qgb2YgdGhpbmdzIHRvZG9cclxuICovXHJcblxyXG52YXIge2RheXNGcm9tTm93LCBpc1NhbWVEYXRlLCBzdHJpbmdpZnlUaW1lLCBzdHJpbmdpZnlEYXRlfSA9IHJlcXVpcmUoXCIuLi91dGlsL2RhdGVcIik7XHJcbnZhciB7YXNzaWdubWVudHN9ID0gcmVxdWlyZShcIi4uL2RhdGEtc3RvcmVzXCIpO1xyXG5cclxubGlmZUxpbmUubmF2LnJlZ2lzdGVyKHtcclxuXHRtYXRjaGVyOiBcIi9cIixcclxuXHJcblx0bWFrZSh7c2V0VGl0bGUsIGNvbnRlbnQsIGRpc3Bvc2FibGV9KSB7XHJcblx0XHRzZXRUaXRsZShcIlRvZG9cIik7XHJcblxyXG5cdFx0Ly8gbG9hZCB0aGUgaXRlbXNcclxuXHRcdGRpc3Bvc2FibGUuYWRkKFxyXG5cdFx0XHRhc3NpZ25tZW50cy5xdWVyeSh7XHJcblx0XHRcdFx0ZG9uZTogZmFsc2UsXHJcblx0XHRcdFx0Ly8gbWFrZSBzdXJlIHRoZSBhc3NpZ25tZW50IGlzIGluIHRoZSBmdXR1cmVcclxuXHRcdFx0XHRkYXRlOiBkYXRlID0+ICFkYXRlIHx8IG5ldyBEYXRlKGRhdGUpLmdldFRpbWUoKSA+IERhdGUubm93KClcclxuXHRcdFx0fSwgZnVuY3Rpb24oZGF0YSkge1xyXG5cdFx0XHRcdC8vIGNsZWFyIHRoZSBvbGQgY29udGVudFxyXG5cdFx0XHRcdGNvbnRlbnQuaW5uZXJIVE1MID0gXCJcIjtcclxuXHJcblx0XHRcdFx0dmFyIGdyb3VwcyA9IHtcclxuXHRcdFx0XHRcdFRhc2tzOiBbXSxcclxuXHRcdFx0XHRcdFRvZGF5OiBbXSxcclxuXHRcdFx0XHRcdFRvbW9ycm93OiBbXVxyXG5cdFx0XHRcdH07XHJcblxyXG5cdFx0XHRcdHZhciB1cGNvbW1pbmcgPSBbXTtcclxuXHJcblx0XHRcdFx0Ly8gdG9kYXkgYW5kIHRvbW9ycm93cyBkYXRlc1xyXG5cdFx0XHRcdHZhciB0b2RheSA9IG5ldyBEYXRlKCk7XHJcblx0XHRcdFx0dmFyIHRvbW9ycm93ID0gZGF5c0Zyb21Ob3coMSk7XHJcblxyXG5cdFx0XHRcdC8vIHNvcnQgYnkgZGF0ZVxyXG5cdFx0XHRcdGRhdGEuc29ydCgoYSwgYikgPT4ge1xyXG5cdFx0XHRcdFx0aWYoYS50eXBlICE9IFwidGFza1wiICYmIGIudHlwZSAhPSBcInRhc2tcIikge1xyXG5cdFx0XHRcdFx0XHRyZXR1cm4gYS5kYXRlLmdldFRpbWUoKSAtIGIuZGF0ZS5nZXRUaW1lKCk7XHJcblx0XHRcdFx0XHR9XHJcblx0XHRcdFx0fSk7XHJcblxyXG5cdFx0XHRcdC8vIHNlbGVjdCB0aGUgaXRlbXMgdG8gZGlzcGxheVxyXG5cdFx0XHRcdGRhdGEuZm9yRWFjaChpdGVtID0+IHtcclxuXHRcdFx0XHRcdC8vIGFzc2lnbm1lbnRzIGZvciB0b2RheVxyXG5cdFx0XHRcdFx0aWYoaXRlbS50eXBlICE9IFwidGFza1wiKSB7XHJcblx0XHRcdFx0XHRcdC8vIHRvZGF5XHJcblx0XHRcdFx0XHRcdGlmKGlzU2FtZURhdGUodG9kYXksIGl0ZW0uZGF0ZSkpIHtcclxuXHRcdFx0XHRcdFx0XHRncm91cHMuVG9kYXkucHVzaChjcmVhdGVVaShpdGVtKSk7XHJcblx0XHRcdFx0XHRcdH1cclxuXHRcdFx0XHRcdFx0Ly8gdG9tb3Jyb3dcclxuXHRcdFx0XHRcdFx0ZWxzZSBpZihpc1NhbWVEYXRlKHRvbW9ycm93LCBpdGVtLmRhdGUpKSB7XHJcblx0XHRcdFx0XHRcdFx0Z3JvdXBzLlRvbW9ycm93LnB1c2goY3JlYXRlVWkoaXRlbSkpO1xyXG5cdFx0XHRcdFx0XHR9XHJcblx0XHRcdFx0XHRcdC8vIGFkZCB1cGNvbW1pbmcgaXRlbXNcclxuXHRcdFx0XHRcdFx0ZWxzZSBpZih1cGNvbW1pbmcubGVuZ3RoIDwgMTApIHtcclxuXHRcdFx0XHRcdFx0XHR1cGNvbW1pbmcucHVzaChbXHJcblx0XHRcdFx0XHRcdFx0XHRpdGVtLFxyXG5cdFx0XHRcdFx0XHRcdFx0Y3JlYXRlVWkoaXRlbSlcclxuXHRcdFx0XHRcdFx0XHRdKTtcclxuXHRcdFx0XHRcdFx0fVxyXG5cdFx0XHRcdFx0fVxyXG5cclxuXHRcdFx0XHRcdC8vIHNob3cgYW55IHRhc2tzXHJcblx0XHRcdFx0XHRpZihpdGVtLnR5cGUgPT0gXCJ0YXNrXCIpIHtcclxuXHRcdFx0XHRcdFx0Z3JvdXBzLlRhc2tzLnB1c2goY3JlYXRlVWkoaXRlbSkpO1xyXG5cdFx0XHRcdFx0fVxyXG5cdFx0XHRcdH0pO1xyXG5cclxuXHRcdFx0XHQvLyBkb24ndCBoYXZlIHRvbyBtYW55IGl0ZW1zIGluIHRoZSB0b2RvIHBhZ2VcclxuXHRcdFx0XHR2YXIgdG9SZW1vdmUgPSBncm91cHMuVG9kYXkubGVuZ3RoICsgZ3JvdXBzLlRvbW9ycm93Lmxlbmd0aCArIGdyb3Vwcy5UYXNrcy5sZW5ndGg7XHJcblxyXG5cdFx0XHRcdHVwY29tbWluZyA9IHVwY29tbWluZy5zbGljZSgwLCBNYXRoLm1heCgwLCAxMCAtIHRvUmVtb3ZlKSk7XHJcblxyXG5cdFx0XHRcdC8vIGFkZCBncm91cHMgZm9yIGVhY2ggb2YgdGhlIHVwY29taW5nXHJcblx0XHRcdFx0Zm9yKGxldCBkYXkgb2YgdXBjb21taW5nKSB7XHJcblx0XHRcdFx0XHRsZXQgc3RyRGF0ZSA9IHN0cmluZ2lmeURhdGUoZGF5WzBdLmRhdGUpO1xyXG5cclxuXHRcdFx0XHRcdGdyb3Vwc1tzdHJEYXRlXSB8fCAoZ3JvdXBzW3N0ckRhdGVdID0gW10pO1xyXG5cclxuXHRcdFx0XHRcdGdyb3Vwc1tzdHJEYXRlXS5wdXNoKGRheVsxXSk7XHJcblx0XHRcdFx0fVxyXG5cclxuXHRcdFx0XHQvLyByZW1vdmUgYW55IGVtcHR5IGZpZWxkc1xyXG5cdFx0XHRcdE9iamVjdC5nZXRPd25Qcm9wZXJ0eU5hbWVzKGdyb3VwcylcclxuXHJcblx0XHRcdFx0LmZvckVhY2gobmFtZSA9PiB7XHJcblx0XHRcdFx0XHQvLyByZW1vdmUgZW1wdHkgZ3JvdXBzXHJcblx0XHRcdFx0XHRpZihncm91cHNbbmFtZV0ubGVuZ3RoID09PSAwKSB7XHJcblx0XHRcdFx0XHRcdGRlbGV0ZSBncm91cHNbbmFtZV07XHJcblx0XHRcdFx0XHR9XHJcblx0XHRcdFx0fSk7XHJcblxyXG5cdFx0XHRcdC8vIHJlbmRlciB0aGUgbGlzdFxyXG5cdFx0XHRcdGxpZmVMaW5lLm1ha2VEb20oe1xyXG5cdFx0XHRcdFx0cGFyZW50OiBjb250ZW50LFxyXG5cdFx0XHRcdFx0d2lkZ2V0OiBcImxpc3RcIixcclxuXHRcdFx0XHRcdGl0ZW1zOiBncm91cHNcclxuXHRcdFx0XHR9KTtcclxuXHRcdFx0fSlcclxuXHRcdCk7XHJcblx0fVxyXG59KTtcclxuXHJcbi8vIGNyZWF0ZSBhIGxpc3QgaXRlbVxyXG52YXIgY3JlYXRlVWkgPSBmdW5jdGlvbihpdGVtKSB7XHJcblx0Ly8gcmVuZGVyIGEgdGFza1xyXG5cdGlmKGl0ZW0udHlwZSA9PSBcInRhc2tcIikge1xyXG5cdFx0cmV0dXJuIHtcclxuXHRcdFx0aHJlZjogYC9pdGVtLyR7aXRlbS5pZH1gLFxyXG5cdFx0XHRpdGVtczogW1xyXG5cdFx0XHRcdHtcclxuXHRcdFx0XHRcdHRleHQ6IGl0ZW0ubmFtZSxcclxuXHRcdFx0XHRcdGdyb3c6IHRydWVcclxuXHRcdFx0XHR9XHJcblx0XHRcdF1cclxuXHRcdH07XHJcblx0fVxyXG5cdC8vIHJlbmRlciBhbiBhc3NpZ25tZW50IG9yIGV4YW1cclxuXHRlbHNlIHtcclxuXHRcdHJldHVybiB7XHJcblx0XHRcdGhyZWY6IGAvaXRlbS8ke2l0ZW0uaWR9YCxcclxuXHRcdFx0aXRlbXM6IFtcclxuXHRcdFx0XHR7XHJcblx0XHRcdFx0XHR0ZXh0OiBpdGVtLnR5cGUgPT0gXCJhc3NpZ25tZW50XCIgPyAgaXRlbS5uYW1lIDogYCR7aXRlbS5uYW1lfSAtICR7aXRlbS5jbGFzc31gLFxyXG5cdFx0XHRcdFx0Z3JvdzogdHJ1ZVxyXG5cdFx0XHRcdH0sXHJcblx0XHRcdFx0c3RyaW5naWZ5VGltZShpdGVtLmRhdGUpLFxyXG5cdFx0XHRcdGl0ZW0udHlwZSA9PSBcImFzc2lnbm1lbnRcIiA/IGl0ZW0uY2xhc3MgOiBpdGVtLmxvY2F0aW9uXHJcblx0XHRcdF1cclxuXHRcdH07XHJcblx0fVxyXG59O1xyXG4iLCIvKipcclxuICogQSBwYWdlIHdpdGggbGlua3MgdG8gYWxsIHVzZXJzXHJcbiAqL1xyXG5cclxubGlmZUxpbmUubmF2LnJlZ2lzdGVyKHtcclxuXHRtYXRjaGVyOiBcIi91c2Vyc1wiLFxyXG5cclxuXHRtYWtlKHtzZXRUaXRsZSwgY29udGVudH0pIHtcclxuXHRcdHNldFRpdGxlKFwiQWxsIHVzZXJzXCIpO1xyXG5cclxuXHRcdC8vIGxvYWQgdGhlIGxpc3Qgb2YgdXNlcnNcclxuXHRcdGZldGNoKFwiL2FwaS9hdXRoL2luZm8vdXNlcnNcIiwge1xyXG5cdFx0XHRjcmVkZW50aWFsczogXCJpbmNsdWRlXCJcclxuXHRcdH0pXHJcblxyXG5cdFx0LnRoZW4ocmVzID0+IHJlcy5qc29uKCkpXHJcblxyXG5cdFx0LnRoZW4oKHtzdGF0dXMsIGRhdGE6IHVzZXJzfSkgPT4ge1xyXG5cdFx0XHQvLyBub3QgYXV0aGVudGljYXRlZFxyXG5cdFx0XHRpZihzdGF0dXMgPT0gXCJmYWlsXCIpIHtcclxuXHRcdFx0XHRsaWZlTGluZS5tYWtlRG9tKHtcclxuXHRcdFx0XHRcdHBhcmVudDogY29udGVudCxcclxuXHRcdFx0XHRcdGNsYXNzZXM6IFwiY29udGVudC1wYWRkZWRcIixcclxuXHRcdFx0XHRcdHRleHQ6IFwiWW91IGRvIG5vdCBoYXZlIGFjY2VzcyB0byB0aGUgdXNlciBsaXN0XCJcclxuXHRcdFx0XHR9KTtcclxuXHJcblx0XHRcdFx0cmV0dXJuO1xyXG5cdFx0XHR9XHJcblxyXG5cdFx0XHQvLyBzb3J0IGJ5IGFkbWluIHN0YXR1c1xyXG5cdFx0XHR1c2Vycy5zb3J0KChhLCBiKSA9PiB7XHJcblx0XHRcdFx0Ly8gc29ydCBhZG1pbnNcclxuXHRcdFx0XHRpZihhLmFkbWluICYmICFiLmFkbWluKSByZXR1cm4gLTE7XHJcblx0XHRcdFx0aWYoIWEuYWRtaW4gJiYgYi5hZG1pbikgcmV0dXJuIDE7XHJcblxyXG5cdFx0XHRcdC8vIHNvcnQgYnkgdXNlcm5hbWVcclxuXHRcdFx0XHRpZihhLnVzZXJuYW1lIDwgYi51c2VybmFtZSkgcmV0dXJuIC0xO1xyXG5cdFx0XHRcdGlmKGEudXNlcm5hbWUgPiBiLnVzZXJuYW1lKSByZXR1cm4gMTtcclxuXHJcblx0XHRcdFx0cmV0dXJuIDA7XHJcblx0XHRcdH0pO1xyXG5cclxuXHRcdFx0dmFyIGRpc3BsYXlVc2VycyA9IHtcclxuXHRcdFx0XHRBZG1pbnM6IFtdLFxyXG5cdFx0XHRcdFVzZXJzOiBbXVxyXG5cdFx0XHR9O1xyXG5cclxuXHRcdFx0Ly8gZ2VuZXJhdGUgdGhlIHVzZXIgbGlzdFxyXG5cdFx0XHR1c2Vycy5mb3JFYWNoKHVzZXIgPT4ge1xyXG5cdFx0XHRcdC8vIHNvcnQgdGhlIHVzZXJzIGludG8gYWRtaW5zIGFuZCB1c2Vyc1xyXG5cdFx0XHRcdGRpc3BsYXlVc2Vyc1t1c2VyLmFkbWluID8gXCJBZG1pbnNcIiA6IFwiVXNlcnNcIl1cclxuXHJcblx0XHRcdFx0LnB1c2goe1xyXG5cdFx0XHRcdFx0aHJlZjogYC91c2VyLyR7dXNlci51c2VybmFtZX1gLFxyXG5cdFx0XHRcdFx0aXRlbXM6IFt7XHJcblx0XHRcdFx0XHRcdHRleHQ6IHVzZXIudXNlcm5hbWUsXHJcblx0XHRcdFx0XHRcdGdyb3c6IHRydWVcclxuXHRcdFx0XHRcdH1dXHJcblx0XHRcdFx0fSk7XHJcblx0XHRcdH0pO1xyXG5cclxuXHRcdFx0Ly8gZGlzcGxheSB0aGUgdXNlciBsaXN0XHJcblx0XHRcdGxpZmVMaW5lLm1ha2VEb20oe1xyXG5cdFx0XHRcdHBhcmVudDogY29udGVudCxcclxuXHRcdFx0XHR3aWRnZXQ6IFwibGlzdFwiLFxyXG5cdFx0XHRcdGl0ZW1zOiBkaXNwbGF5VXNlcnNcclxuXHRcdFx0fSk7XHJcblx0XHR9KVxyXG5cclxuXHRcdC8vIHNvbWV0aGluZyB3ZW50IHdyb25nIHNob3cgYW4gZXJyb3IgbWVzc2FnZVxyXG5cdFx0LmNhdGNoKGVyciA9PiB7XHJcblx0XHRcdGxpZmVMaW5lLm1ha2VEb20oe1xyXG5cdFx0XHRcdGNsYXNzZXM6IFwiY29udGVudC1wYWRkZWRcIixcclxuXHRcdFx0XHR0ZXh0OiBlcnIubWVzc2FnZVxyXG5cdFx0XHR9KTtcclxuXHRcdH0pO1xyXG5cdH1cclxufSk7XHJcbiIsIi8qKlxyXG4gKiBUaGUgbWFpbiBjb250ZW50IHBhbmUgZm9yIHRoZSBhcHBcclxuICovXHJcblxyXG5saWZlTGluZS5tYWtlRG9tLnJlZ2lzdGVyKFwiY29udGVudFwiLCB7XHJcblx0bWFrZSgpIHtcclxuXHRcdHJldHVybiBbXHJcblx0XHRcdHtcclxuXHRcdFx0XHRjbGFzc2VzOiBcInRvb2xiYXJcIixcclxuXHRcdFx0XHRjaGlsZHJlbjogW1xyXG5cdFx0XHRcdFx0e1xyXG5cdFx0XHRcdFx0XHR0YWc6IFwic3ZnXCIsXHJcblx0XHRcdFx0XHRcdGNsYXNzZXM6IFwibWVudS1pY29uXCIsXHJcblx0XHRcdFx0XHRcdGF0dHJzOiB7XHJcblx0XHRcdFx0XHRcdFx0dmlld0JveDogXCIwIDAgNjAgNTBcIixcclxuXHRcdFx0XHRcdFx0XHR3aWR0aDogXCIyMFwiLFxyXG5cdFx0XHRcdFx0XHRcdGhlaWdodDogXCIxNVwiXHJcblx0XHRcdFx0XHRcdH0sXHJcblx0XHRcdFx0XHRcdGNoaWxkcmVuOiBbXHJcblx0XHRcdFx0XHRcdFx0eyB0YWc6IFwibGluZVwiLCBhdHRyczogeyB4MTogXCIwXCIsIHkxOiBcIjVcIiwgeDI6IFwiNjBcIiwgeTI6IFwiNVwiIH0gfSxcclxuXHRcdFx0XHRcdFx0XHR7IHRhZzogXCJsaW5lXCIsIGF0dHJzOiB7IHgxOiBcIjBcIiwgeTE6IFwiMjVcIiwgeDI6IFwiNjBcIiwgeTI6IFwiMjVcIiB9IH0sXHJcblx0XHRcdFx0XHRcdFx0eyB0YWc6IFwibGluZVwiLCBhdHRyczogeyB4MTogXCIwXCIsIHkxOiBcIjQ1XCIsIHgyOiBcIjYwXCIsIHkyOiBcIjQ1XCIgfSB9XHJcblx0XHRcdFx0XHRcdF0sXHJcblx0XHRcdFx0XHRcdG9uOiB7XHJcblx0XHRcdFx0XHRcdFx0Y2xpY2s6ICgpID0+IGRvY3VtZW50LmJvZHkuY2xhc3NMaXN0LnRvZ2dsZShcInNpZGViYXItb3BlblwiKVxyXG5cdFx0XHRcdFx0XHR9XHJcblx0XHRcdFx0XHR9LFxyXG5cdFx0XHRcdFx0e1xyXG5cdFx0XHRcdFx0XHRjbGFzc2VzOiBcInRvb2xiYXItdGl0bGVcIixcclxuXHRcdFx0XHRcdFx0bmFtZTogXCJ0aXRsZVwiXHJcblx0XHRcdFx0XHR9LFxyXG5cdFx0XHRcdFx0e1xyXG5cdFx0XHRcdFx0XHRjbGFzc2VzOiBcInRvb2xiYXItYnV0dG9uc1wiLFxyXG5cdFx0XHRcdFx0XHRuYW1lOiBcImJ0bnNcIlxyXG5cdFx0XHRcdFx0fVxyXG5cdFx0XHRcdF1cclxuXHRcdFx0fSxcclxuXHRcdFx0e1xyXG5cdFx0XHRcdGNsYXNzZXM6IFwiY29udGVudFwiLFxyXG5cdFx0XHRcdG5hbWU6IFwiY29udGVudFwiXHJcblx0XHRcdH1cclxuXHRcdF07XHJcblx0fSxcclxuXHJcblx0YmluZChvcHRzLCB7dGl0bGUsIGJ0bnMsIGNvbnRlbnR9KSB7XHJcblx0XHR2YXIgZGlzcG9zYWJsZTtcclxuXHJcblx0XHQvLyBzZXQgdGhlIHBhZ2UgdGl0bGVcclxuXHRcdHZhciBzZXRUaXRsZSA9IGZ1bmN0aW9uKHRpdGxlVGV4dCkge1xyXG5cdFx0XHR0aXRsZS5pbm5lclRleHQgPSB0aXRsZVRleHQ7XHJcblx0XHRcdGRvY3VtZW50LnRpdGxlID0gdGl0bGVUZXh0O1xyXG5cdFx0fTtcclxuXHJcblx0XHQvLyBhZGQgYW4gYWN0aW9uIGJ1dHRvblxyXG5cdFx0bGlmZUxpbmUub24oXCJhY3Rpb24tY3JlYXRlXCIsIG5hbWUgPT4ge1xyXG5cdFx0XHRsaWZlTGluZS5tYWtlRG9tKHtcclxuXHRcdFx0XHRwYXJlbnQ6IGJ0bnMsXHJcblx0XHRcdFx0dGFnOiBcImJ1dHRvblwiLFxyXG5cdFx0XHRcdGNsYXNzZXM6IFwidG9vbGJhci1idXR0b25cIixcclxuXHRcdFx0XHR0ZXh0OiBuYW1lLFxyXG5cdFx0XHRcdGF0dHJzOiB7XHJcblx0XHRcdFx0XHRcImRhdGEtbmFtZVwiOiBuYW1lXHJcblx0XHRcdFx0fSxcclxuXHRcdFx0XHRvbjoge1xyXG5cdFx0XHRcdFx0Y2xpY2s6ICgpID0+IGxpZmVMaW5lLmVtaXQoXCJhY3Rpb24tZXhlYy1cIiArIG5hbWUpXHJcblx0XHRcdFx0fVxyXG5cdFx0XHR9KTtcclxuXHRcdH0pO1xyXG5cclxuXHRcdC8vIHJlbW92ZSBhbiBhY3Rpb24gYnV0dG9uXHJcblx0XHRsaWZlTGluZS5vbihcImFjdGlvbi1yZW1vdmVcIiwgbmFtZSA9PiB7XHJcblx0XHRcdHZhciBidG4gPSBidG5zLnF1ZXJ5U2VsZWN0b3IoYFtkYXRhLW5hbWU9XCIke25hbWV9XCJdYCk7XHJcblxyXG5cdFx0XHRpZihidG4pIGJ0bi5yZW1vdmUoKTtcclxuXHRcdH0pO1xyXG5cclxuXHRcdC8vIHJlbW92ZSBhbGwgdGhlIGFjdGlvbiBidXR0b25zXHJcblx0XHRsaWZlTGluZS5vbihcImFjdGlvbi1yZW1vdmUtYWxsXCIsICgpID0+IGJ0bnMuaW5uZXJIVE1MID0gXCJcIik7XHJcblxyXG5cdFx0Ly8gZGlzcGxheSB0aGUgY29udGVudCBmb3IgdGhlIHZpZXdcclxuXHRcdHZhciB1cGRhdGVWaWV3ID0gKCkgPT4ge1xyXG5cdFx0XHQvLyBkZXN0cm95IGFueSBsaXN0ZW5lcnMgZnJvbSBvbGQgY29udGVudFxyXG5cdFx0XHRpZihkaXNwb3NhYmxlKSB7XHJcblx0XHRcdFx0ZGlzcG9zYWJsZS5kaXNwb3NlKCk7XHJcblx0XHRcdH1cclxuXHJcblx0XHRcdC8vIHJlbW92ZSBhbnkgYWN0aW9uIGJ1dHRvbnNcclxuXHRcdFx0bGlmZUxpbmUuZW1pdChcImFjdGlvbi1yZW1vdmUtYWxsXCIpO1xyXG5cclxuXHRcdFx0Ly8gY2xlYXIgYWxsIHRoZSBvbGQgY29udGVudFxyXG5cdFx0XHRjb250ZW50LmlubmVySFRNTCA9IFwiXCI7XHJcblxyXG5cdFx0XHQvLyBjcmVhdGUgdGhlIGRpc3Bvc2FibGUgZm9yIHRoZSBjb250ZW50XHJcblx0XHRcdGRpc3Bvc2FibGUgPSBuZXcgbGlmZUxpbmUuRGlzcG9zYWJsZSgpO1xyXG5cclxuXHRcdFx0dmFyIG1ha2VyID0gbm90Rm91bmRNYWtlciwgbWF0Y2g7XHJcblxyXG5cdFx0XHQvLyBmaW5kIHRoZSBjb3JyZWN0IGNvbnRlbnQgbWFrZXJcclxuXHRcdFx0Zm9yKGxldCAkbWFrZXIgb2YgY29udGVudE1ha2Vycykge1xyXG5cdFx0XHRcdC8vIHJ1biBhIG1hdGNoZXIgZnVuY3Rpb25cclxuXHRcdFx0XHRpZih0eXBlb2YgJG1ha2VyLm1hdGNoZXIgPT0gXCJmdW5jdGlvblwiKSB7XHJcblx0XHRcdFx0XHRtYXRjaCA9ICRtYWtlci5tYXRjaGVyKGxvY2F0aW9uLnBhdGhuYW1lKTtcclxuXHRcdFx0XHR9XHJcblx0XHRcdFx0Ly8gYSBzdHJpbmcgbWF0Y2hcclxuXHRcdFx0XHRlbHNlIGlmKHR5cGVvZiAkbWFrZXIubWF0Y2hlciA9PSBcInN0cmluZ1wiKSB7XHJcblx0XHRcdFx0XHRpZigkbWFrZXIubWF0Y2hlciA9PSBsb2NhdGlvbi5wYXRobmFtZSkge1xyXG5cdFx0XHRcdFx0XHRtYXRjaCA9ICRtYWtlci5tYXRjaGVyO1xyXG5cdFx0XHRcdFx0fVxyXG5cdFx0XHRcdH1cclxuXHRcdFx0XHQvLyBhIHJlZ2V4IG1hdGNoXHJcblx0XHRcdFx0ZWxzZSB7XHJcblx0XHRcdFx0XHRtYXRjaCA9ICRtYWtlci5tYXRjaGVyLmV4ZWMobG9jYXRpb24ucGF0aG5hbWUpO1xyXG5cdFx0XHRcdH1cclxuXHJcblx0XHRcdFx0Ly8gbWF0Y2ggZm91bmQgc3RvcCBzZWFyY2hpbmdcclxuXHRcdFx0XHRpZihtYXRjaCkge1xyXG5cdFx0XHRcdFx0bWFrZXIgPSAkbWFrZXI7XHJcblxyXG5cdFx0XHRcdFx0YnJlYWs7XHJcblx0XHRcdFx0fVxyXG5cdFx0XHR9XHJcblxyXG5cdFx0XHQvLyBtYWtlIHRoZSBjb250ZW50IGZvciB0aGlzIHJvdXRlXHJcblx0XHRcdG1ha2VyLm1ha2Uoe2Rpc3Bvc2FibGUsIHNldFRpdGxlLCBjb250ZW50LCBtYXRjaH0pO1xyXG5cdFx0fTtcclxuXHJcblx0XHQvLyBzd2l0Y2ggcGFnZXNcclxuXHRcdGxpZmVMaW5lLm5hdi5uYXZpZ2F0ZSA9IGZ1bmN0aW9uKHVybCkge1xyXG5cdFx0XHQvLyB1cGRhdGUgdGhlIHVybFxyXG5cdFx0XHRoaXN0b3J5LnB1c2hTdGF0ZShudWxsLCBudWxsLCB1cmwpO1xyXG5cclxuXHRcdFx0Ly8gc2hvdyB0aGUgbmV3IHZpZXdcclxuXHRcdFx0dXBkYXRlVmlldygpO1xyXG5cdFx0fTtcclxuXHJcblx0XHQvLyBzd2l0Y2ggcGFnZXMgd2hlbiB0aGUgdXNlciBwdXNoZXMgdGhlIGJhY2sgYnV0dG9uXHJcblx0XHR3aW5kb3cuYWRkRXZlbnRMaXN0ZW5lcihcInBvcHN0YXRlXCIsICgpID0+IHVwZGF0ZVZpZXcoKSk7XHJcblxyXG5cdFx0Ly8gc2hvdyB0aGUgaW5pdGlhbCB2aWV3XHJcblx0XHR1cGRhdGVWaWV3KCk7XHJcblx0fVxyXG59KTtcclxuXHJcbi8vIGFsbCBjb250ZW50IHByb2R1Y2Vyc1xyXG52YXIgY29udGVudE1ha2VycyA9IFtdO1xyXG5cclxuLy8gY3JlYXRlIHRoZSBuYW1lc3BhY2VcclxubGlmZUxpbmUubmF2ID0ge307XHJcblxyXG4vLyByZWdpc3RlciBhIGNvbnRlbnQgbWFrZXJcclxubGlmZUxpbmUubmF2LnJlZ2lzdGVyID0gZnVuY3Rpb24obWFrZXIpIHtcclxuXHRjb250ZW50TWFrZXJzLnB1c2gobWFrZXIpO1xyXG59O1xyXG5cclxuLy8gdGhlIGZhbGwgYmFjayBtYWtlciBmb3Igbm8gc3VjaCBwYWdlXHJcbnZhciBub3RGb3VuZE1ha2VyID0ge1xyXG5cdG1ha2Uoe3NldFRpdGxlLCBjb250ZW50fSkge1xyXG5cdFx0Ly8gdXBkYXRlIHRoZSBwYWdlIHRpdGxlXHJcblx0XHRzZXRUaXRsZShcIk5vdCBmb3VuZFwiKTtcclxuXHJcblx0XHRsaWZlTGluZS5tYWtlRG9tKHtcclxuXHRcdFx0cGFyZW50OiBjb250ZW50LFxyXG5cdFx0XHRjbGFzc2VzOiBcImNvbnRlbnQtcGFkZGVkXCIsXHJcblx0XHRcdGNoaWxkcmVuOiBbXHJcblx0XHRcdFx0e1xyXG5cdFx0XHRcdFx0dGFnOiBcInNwYW5cIixcclxuXHRcdFx0XHRcdHRleHQ6IFwiVGhlIHBhZ2UgeW91IGFyZSBsb29raW5nIGZvciBjb3VsZCBub3QgYmUgZm91bmQuIFwiXHJcblx0XHRcdFx0fSxcclxuXHRcdFx0XHR7XHJcblx0XHRcdFx0XHR3aWRnZXQ6IFwibGlua1wiLFxyXG5cdFx0XHRcdFx0aHJlZjogXCIvXCIsXHJcblx0XHRcdFx0XHR0ZXh0OiBcIkdvIGhvbWVcIlxyXG5cdFx0XHRcdH1cclxuXHRcdFx0XVxyXG5cdFx0fSk7XHJcblx0fVxyXG59O1xyXG4iLCIvKipcclxuICogQ3JlYXRlIGFuIGlucHV0IGZpZWxkXHJcbiAqL1xyXG5cclxubGlmZUxpbmUubWFrZURvbS5yZWdpc3RlcihcImlucHV0XCIsIHtcclxuXHRtYWtlKHt0YWcsIHR5cGUsIHZhbHVlLCBjaGFuZ2UsIGJpbmQsIHByb3AsIHBsYWNlaG9sZGVyLCBjbGFzc2VzfSkge1xyXG5cdFx0Ly8gc2V0IHRoZSBpbml0aWFsIHZhbHVlIG9mIHRoZSBib3VuZCBvYmplY3RcclxuXHRcdGlmKHR5cGVvZiBiaW5kID09IFwib2JqZWN0XCIgJiYgIXZhbHVlKSB7XHJcblx0XHRcdHZhbHVlID0gYmluZFtwcm9wXTtcclxuXHRcdH1cclxuXHJcblx0XHR2YXIgaW5wdXQgPSB7XHJcblx0XHRcdHRhZzogdGFnIHx8IFwiaW5wdXRcIixcclxuXHRcdFx0Y2xhc3NlczogY2xhc3NlcyB8fCBgJHt0YWcgPT0gXCJ0ZXh0YXJlYVwiID8gXCJ0ZXh0YXJlYVwiIDogXCJpbnB1dFwifS1maWxsYCxcclxuXHRcdFx0YXR0cnM6IHt9LFxyXG5cdFx0XHRvbjoge1xyXG5cdFx0XHRcdGlucHV0OiBlID0+IHtcclxuXHRcdFx0XHRcdC8vIHVwZGF0ZSB0aGUgcHJvcGVydHkgY2hhbmdlZFxyXG5cdFx0XHRcdFx0aWYodHlwZW9mIGJpbmQgPT0gXCJvYmplY3RcIikge1xyXG5cdFx0XHRcdFx0XHRiaW5kW3Byb3BdID0gZS50YXJnZXQudmFsdWU7XHJcblx0XHRcdFx0XHR9XHJcblxyXG5cdFx0XHRcdFx0Ly8gY2FsbCB0aGUgY2FsbGJhY2tcclxuXHRcdFx0XHRcdGlmKHR5cGVvZiBjaGFuZ2UgPT0gXCJmdW5jdGlvblwiKSB7XHJcblx0XHRcdFx0XHRcdGNoYW5nZShlLnRhcmdldC52YWx1ZSk7XHJcblx0XHRcdFx0XHR9XHJcblx0XHRcdFx0fVxyXG5cdFx0XHR9XHJcblx0XHR9O1xyXG5cclxuXHRcdC8vIGF0dGFjaCB2YWx1ZXMgaWYgdGhleSBhcmUgZ2l2ZW5cclxuXHRcdGlmKHR5cGUpIGlucHV0LmF0dHJzLnR5cGUgPSB0eXBlO1xyXG5cdFx0aWYodmFsdWUpIGlucHV0LmF0dHJzLnZhbHVlID0gdmFsdWU7XHJcblx0XHRpZihwbGFjZWhvbGRlcikgaW5wdXQuYXR0cnMucGxhY2Vob2xkZXIgPSBwbGFjZWhvbGRlcjtcclxuXHJcblx0XHQvLyBmb3IgdGV4dGFyZWFzIHNldCBpbm5lclRleHRcclxuXHRcdGlmKHRhZyA9PSBcInRleHRhcmVhXCIpIHtcclxuXHRcdFx0aW5wdXQudGV4dCA9IHZhbHVlO1xyXG5cdFx0fVxyXG5cclxuXHRcdHJldHVybiBpbnB1dDtcclxuXHR9XHJcbn0pO1xyXG4iLCIvKipcclxuICogQSB3aWRnZXQgdGhhdCBjcmVhdGVzIGEgbGluayB0aGF0IGhvb2tzIGludG8gdGhlIG5hdmlnYXRvclxyXG4gKi9cclxuXHJcbmxpZmVMaW5lLm1ha2VEb20ucmVnaXN0ZXIoXCJsaW5rXCIsIHtcclxuXHRtYWtlKG9wdHMpIHtcclxuXHRcdHJldHVybiB7XHJcblx0XHRcdHRhZzogXCJhXCIsXHJcblx0XHRcdGF0dHJzOiB7XHJcblx0XHRcdFx0aHJlZjogb3B0cy5ocmVmXHJcblx0XHRcdH0sXHJcblx0XHRcdG9uOiB7XHJcblx0XHRcdFx0Y2xpY2s6IGUgPT4ge1xyXG5cdFx0XHRcdFx0Ly8gZG9uJ3Qgb3ZlciByaWRlIGN0cmwgb3IgYWx0IG9yIHNoaWZ0IGNsaWNrc1xyXG5cdFx0XHRcdFx0aWYoZS5jdHJsS2V5IHx8IGUuYWx0S2V5IHx8IGUuc2hpZnRLZXkpIHJldHVybjtcclxuXHJcblx0XHRcdFx0XHQvLyBkb24ndCBuYXZpZ2F0ZSB0aGUgcGFnZVxyXG5cdFx0XHRcdFx0ZS5wcmV2ZW50RGVmYXVsdCgpO1xyXG5cclxuXHRcdFx0XHRcdGxpZmVMaW5lLm5hdi5uYXZpZ2F0ZShvcHRzLmhyZWYpXHJcblx0XHRcdFx0fVxyXG5cdFx0XHR9LFxyXG5cdFx0XHR0ZXh0OiBvcHRzLnRleHRcclxuXHRcdH07XHJcblx0fVxyXG59KTtcclxuIiwiLyoqXHJcbiAqIERpc3BsYXkgYSBsaXN0IHdpdGggZ3JvdXAgaGVhZGluZ3NcclxuICovXHJcblxyXG5saWZlTGluZS5tYWtlRG9tLnJlZ2lzdGVyKFwibGlzdFwiLCB7XHJcblx0bWFrZSh7aXRlbXN9KSB7XHJcblx0XHQvLyBhZGQgYWxsIHRoZSBncm91cHNcclxuXHRcdHJldHVybiBPYmplY3QuZ2V0T3duUHJvcGVydHlOYW1lcyhpdGVtcylcclxuXHJcblx0XHQubWFwKGdyb3VwTmFtZSA9PiBtYWtlR3JvdXAoZ3JvdXBOYW1lLCBpdGVtc1tncm91cE5hbWVdKSk7XHJcblx0fVxyXG59KTtcclxuXHJcbi8vIG1ha2UgYSBzaW5nbGUgZ3JvdXBcclxudmFyIG1ha2VHcm91cCA9IGZ1bmN0aW9uKG5hbWUsIGl0ZW1zLCBwYXJlbnQpIHtcclxuXHQvLyBhZGQgdGhlIGxpc3QgaGVhZGVyXHJcblx0aXRlbXMudW5zaGlmdCh7XHJcblx0XHRjbGFzc2VzOiBcImxpc3QtaGVhZGVyXCIsXHJcblx0XHR0ZXh0OiBuYW1lXHJcblx0fSk7XHJcblxyXG5cdC8vIHJlbmRlciB0aGUgaXRlbVxyXG5cdHJldHVybiB7XHJcblx0XHRwYXJlbnQsXHJcblx0XHRjbGFzc2VzOiBcImxpc3Qtc2VjdGlvblwiLFxyXG5cdFx0Y2hpbGRyZW46IGl0ZW1zLm1hcCgoaXRlbSwgaW5kZXgpID0+IHtcclxuXHRcdFx0Ly8gZG9uJ3QgbW9kaWZ5IHRoZSBoZWFkZXJcclxuXHRcdFx0aWYoaW5kZXggPT09IDApIHJldHVybiBpdGVtO1xyXG5cclxuXHRcdFx0dmFyIGl0ZW1Eb207XHJcblxyXG5cdFx0XHQvLyBjcmVhdGUgYW4gaXRlbVxyXG5cdFx0XHRpZih0eXBlb2YgaXRlbSAhPSBcInN0cmluZ1wiKSB7XHJcblx0XHRcdFx0aXRlbURvbSA9IHtcclxuXHRcdFx0XHRcdGNsYXNzZXM6IFwibGlzdC1pdGVtXCIsXHJcblx0XHRcdFx0XHRjaGlsZHJlbjogKGl0ZW0uaXRlbXMgfHwgaXRlbSkubWFwKGl0ZW0gPT4ge1xyXG5cdFx0XHRcdFx0XHRyZXR1cm4ge1xyXG5cdFx0XHRcdFx0XHRcdC8vIGdldCB0aGUgbmFtZSBvZiB0aGUgaXRlbVxyXG5cdFx0XHRcdFx0XHRcdHRleHQ6IHR5cGVvZiBpdGVtID09IFwic3RyaW5nXCIgPyBpdGVtIDogaXRlbS50ZXh0LFxyXG5cdFx0XHRcdFx0XHRcdC8vIHNldCB3aGV0aGVyIHRoZSBpdGVtIHNob3VsZCBncm93XHJcblx0XHRcdFx0XHRcdFx0Y2xhc3NlczogaXRlbS5ncm93ID8gXCJsaXN0LWl0ZW0tZ3Jvd1wiIDogXCJsaXN0LWl0ZW0tcGFydFwiXHJcblx0XHRcdFx0XHRcdH07XHJcblx0XHRcdFx0XHR9KVxyXG5cdFx0XHRcdH07XHJcblx0XHRcdH1cclxuXHRcdFx0ZWxzZSB7XHJcblx0XHRcdFx0aXRlbURvbSA9IHtcclxuXHRcdFx0XHRcdGNsYXNzZXM6IFwibGlzdC1pdGVtXCIsXHJcblx0XHRcdFx0XHR0ZXh0OiBpdGVtXHJcblx0XHRcdFx0fTtcclxuXHRcdFx0fVxyXG5cclxuXHRcdFx0Ly8gbWFrZSB0aGUgaXRlbSBhIGxpbmtcclxuXHRcdFx0aWYoaXRlbS5ocmVmKSB7XHJcblx0XHRcdFx0aXRlbURvbS5vbiA9IHtcclxuXHRcdFx0XHRcdGNsaWNrOiAoKSA9PiBsaWZlTGluZS5uYXYubmF2aWdhdGUoaXRlbS5ocmVmKVxyXG5cdFx0XHRcdH07XHJcblx0XHRcdH1cclxuXHJcblx0XHRcdHJldHVybiBpdGVtRG9tO1xyXG5cdFx0fSlcclxuXHR9O1xyXG59O1xyXG4iLCIvKipcclxuICogVGhlIHByb2dyZXNzIGJhciBhdCB0aGUgdG9wIG9mIHRoZSBwYWdlXHJcbiAqL1xyXG5cclxubGlmZUxpbmUubWFrZURvbS5yZWdpc3RlcihcInByb2dyZXNzXCIsIHtcclxuXHRtYWtlKCkge1xyXG5cdFx0cmV0dXJuIHtcclxuXHRcdFx0Y2xhc3NlczogXCJwcm9ncmVzc1wiLFxyXG5cdFx0XHRuYW1lOiBcInByb2dyZXNzXCJcclxuXHRcdH07XHJcblx0fSxcclxuXHJcblx0YmluZChvcHRzLCB7cHJvZ3Jlc3N9KSB7XHJcblx0XHQvLyBzZXQgdGhlIHByb2dyZXNzIGJhciB2YWx1ZSBbMCwgMV1cclxuXHRcdHZhciBzZXRQcm9ncmVzcyA9IGZ1bmN0aW9uKHZhbHVlKSB7XHJcblx0XHRcdHZhciBhZGp1c3RCeSA9IDA7XHJcblxyXG5cdFx0XHRpZih2YWx1ZSA+IDApIHtcclxuXHRcdFx0XHQvLyBzY2FsZSBsZWF2ZXMgdGhlIHByb2dyZXNzIGJhciBwZXJmZWN0bHkgaW4gdGhlIG1pZGRsZSBvZiB0aGUgcGFnZVxyXG5cdFx0XHRcdC8vIDEgLSB2YWx1ZSBnZXRzIHRoZSBhbW91bnQgb2Ygc3BhY2UgcmVtYWluaW5nXHJcblx0XHRcdFx0Ly8gLyAyIGdldHMganVzdCB0aGUgc3BhY2Ugb24gb25lIHNpZGVcclxuXHRcdFx0XHQvLyAvIHZhbHVlIGdldHMgdGhhdCBhbW91bnQgcmVsaXRpdmUgdG8gdGhlIHByb2dyZXNzIGJhcnMgc2NhbGVkIHdpZHRoXHJcblx0XHRcdFx0Ly8gKiAxMDAgY29udmVydHMgaXQgdG8gYSBwZXJjZW50XHJcblx0XHRcdFx0YWRqdXN0QnkgPSAoMSAtIHZhbHVlKSAvIDIgLyB2YWx1ZSAqIDEwMDtcclxuXHRcdFx0fVxyXG5cclxuXHRcdFx0cHJvZ3Jlc3Muc3R5bGUudHJhbnNmb3JtID0gYHNjYWxlWCgke3ZhbHVlfSkgdHJhbnNsYXRlWCgtJHthZGp1c3RCeX0lKWA7XHJcblx0XHR9O1xyXG5cclxuXHRcdC8vIGhpZGUgdGhlIHByb2dyZXNzIGJhciBpbml0aWFsbHlcclxuXHRcdHByb2dyZXNzLnN0eWxlLnRyYW5zZm9ybSA9IFwic2NhbGVYKDApXCI7XHJcblxyXG5cdFx0cmVuZGVyID0gZnVuY3Rpb24oKSB7XHJcblx0XHRcdC8vIGNhbGN1bGF0ZSBob3cgbXVjaCB0aGlzIHBlcmNlbnQgY29udHJpYnV0ZXMgdG8gdGhlIG92ZXJhbGwgcHJvZ3Jlc3NcclxuXHRcdFx0dmFyIGNvbnRyaWJ1dGlvbiA9IDEgLyBwcm9ncmVzc2VzLmxlbmd0aDtcclxuXHJcblx0XHRcdHNldFByb2dyZXNzKFxyXG5cdFx0XHRcdHByb2dyZXNzZXMucmVkdWNlKChwcm9nLCBwZXJjKSA9PiBwcm9nICsgcGVyYy52YWx1ZSAqIGNvbnRyaWJ1dGlvbiwgMClcclxuXHRcdFx0KTtcclxuXHRcdH07XHJcblxyXG5cdFx0cmVuZGVyKCk7XHJcblx0fVxyXG59KTtcclxuXHJcbi8vIHN1YiByZW5kZXIgdW50aWwgcHJvZ3Jlc3MgaXMgY3JlYXRlZFxyXG52YXIgcmVuZGVyID0gKCkgPT4ge307XHJcblxyXG52YXIgcHJvZ3Jlc3NlcyA9IFtdO1xyXG5cclxuLy8gY29tYmluZSBtdWx0aXBsZSBwcm9ncmVzcyBsZXZlbHNcclxubGlmZUxpbmUuUHJvZ3Jlc3MgPSBjbGFzcyB7XHJcblx0Y29uc3RydWN0b3IoKSB7XHJcblx0XHR0aGlzLnZhbHVlID0gMDtcclxuXHJcblx0XHRwcm9ncmVzc2VzLnB1c2godGhpcyk7XHJcblxyXG5cdFx0cmVuZGVyKCk7XHJcblx0fVxyXG5cclxuXHQvLyBzZXQgdGhlIHByb2dyZXNzXHJcblx0c2V0KHZhbHVlKSB7XHJcblx0XHR0aGlzLnZhbHVlID0gdmFsdWU7XHJcblxyXG5cdFx0Ly8gYWxsIHRoZSBqb2JzIGFyZSBkb25lIHJlbW92ZSB0aGVtXHJcblx0XHRpZihwcm9ncmVzc2VzLmV2ZXJ5KHByb2cgPT4gcHJvZy52YWx1ZSA9PSAxKSkge1xyXG5cdFx0XHRwcm9ncmVzc2VzID0gW107XHJcblx0XHR9XHJcblxyXG5cdFx0cmVuZGVyKCk7XHJcblx0fVxyXG59O1xyXG4iLCIvKipcclxuICogVGhlIHdpZGdldCBmb3IgdGhlIHNpZGViYXJcclxuICovXHJcblxyXG5saWZlTGluZS5tYWtlRG9tLnJlZ2lzdGVyKFwic2lkZWJhclwiLCB7XHJcblx0bWFrZSgpIHtcclxuXHRcdHJldHVybiBbXHJcblx0XHRcdHtcclxuXHRcdFx0XHRjbGFzc2VzOiBcInNpZGViYXJcIixcclxuXHRcdFx0XHRuYW1lOiBcInNpZGViYXJcIixcclxuXHRcdFx0XHRjaGlsZHJlbjogW1xyXG5cdFx0XHRcdFx0e1xyXG5cdFx0XHRcdFx0XHRjbGFzc2VzOiBbXCJzaWRlYmFyLWFjdGlvbnNcIiwgXCJoaWRkZW5cIl0sXHJcblx0XHRcdFx0XHRcdG5hbWU6IFwiYWN0aW9uc1wiLFxyXG5cdFx0XHRcdFx0XHRjaGlsZHJlbjogW1xyXG5cdFx0XHRcdFx0XHRcdHtcclxuXHRcdFx0XHRcdFx0XHRcdGNsYXNzZXM6IFwic2lkZWJhci1oZWFkaW5nXCIsXHJcblx0XHRcdFx0XHRcdFx0XHR0ZXh0OiBcIlBhZ2UgYWN0aW9uc1wiXHJcblx0XHRcdFx0XHRcdFx0fVxyXG5cdFx0XHRcdFx0XHRdXHJcblx0XHRcdFx0XHR9LFxyXG5cdFx0XHRcdFx0e1xyXG5cdFx0XHRcdFx0XHRjbGFzc2VzOiBcInNpZGViYXItaGVhZGluZ1wiLFxyXG5cdFx0XHRcdFx0XHR0ZXh0OiBcIk1vcmUgYWN0aW9uc1wiXHJcblx0XHRcdFx0XHR9XHJcblx0XHRcdFx0XVxyXG5cdFx0XHR9LFxyXG5cdFx0XHR7XHJcblx0XHRcdFx0Y2xhc3NlczogXCJzaGFkZVwiLFxyXG5cdFx0XHRcdG9uOiB7XHJcblx0XHRcdFx0XHQvLyBjbG9zZSB0aGUgc2lkZWJhclxyXG5cdFx0XHRcdFx0Y2xpY2s6ICgpID0+IGRvY3VtZW50LmJvZHkuY2xhc3NMaXN0LnJlbW92ZShcInNpZGViYXItb3BlblwiKVxyXG5cdFx0XHRcdH1cclxuXHRcdFx0fVxyXG5cdFx0XTtcclxuXHR9LFxyXG5cclxuXHRiaW5kKG9wdHMsIHthY3Rpb25zLCBzaWRlYmFyfSkge1xyXG5cdFx0Ly8gYWRkIGEgY29tbWFuZCB0byB0aGUgc2lkZWJhclxyXG5cdFx0bGlmZUxpbmUuYWRkQ29tbWFuZCA9IGZ1bmN0aW9uKG5hbWUsIGZuKSB7XHJcblx0XHRcdC8vIG1ha2UgdGhlIHNpZGViYXIgaXRlbVxyXG5cdFx0XHR2YXIge2l0ZW19ID0gbGlmZUxpbmUubWFrZURvbSh7XHJcblx0XHRcdFx0cGFyZW50OiBzaWRlYmFyLFxyXG5cdFx0XHRcdHRhZzogXCJkaXZcIixcclxuXHRcdFx0XHRuYW1lOiBcIml0ZW1cIixcclxuXHRcdFx0XHRjbGFzc2VzOiBcInNpZGViYXItaXRlbVwiLFxyXG5cdFx0XHRcdHRleHQ6IG5hbWUsXHJcblx0XHRcdFx0b246IHtcclxuXHRcdFx0XHRcdGNsaWNrOiAoKSA9PiB7XHJcblx0XHRcdFx0XHRcdC8vIGNsb3NlIHRoZSBzaWRlYmFyXHJcblx0XHRcdFx0XHRcdGRvY3VtZW50LmJvZHkuY2xhc3NMaXN0LnJlbW92ZShcInNpZGViYXItb3BlblwiKTtcclxuXHJcblx0XHRcdFx0XHRcdC8vIGNhbGwgdGhlIGxpc3RlbmVyXHJcblx0XHRcdFx0XHRcdGZuKCk7XHJcblx0XHRcdFx0XHR9XHJcblx0XHRcdFx0fVxyXG5cdFx0XHR9KTtcclxuXHJcblx0XHRcdHJldHVybiB7XHJcblx0XHRcdFx0dW5zdWJzY3JpYmU6ICgpID0+IGl0ZW0ucmVtb3ZlKClcclxuXHRcdFx0fTtcclxuXHRcdH07XHJcblxyXG5cdFx0Ly8gYWRkIGEgbmF2aWdhdGlvbmFsIGNvbW1hbmRcclxuXHRcdGxpZmVMaW5lLmFkZE5hdkNvbW1hbmQgPSBmdW5jdGlvbihuYW1lLCB0bykge1xyXG5cdFx0XHRsaWZlTGluZS5hZGRDb21tYW5kKG5hbWUsICgpID0+IGxpZmVMaW5lLm5hdi5uYXZpZ2F0ZSh0bykpO1xyXG5cdFx0fTtcclxuXHJcblx0XHQvLyBhZGQgYSBzaWRlYmFyIGFjdGlvblxyXG5cdFx0bGlmZUxpbmUub24oXCJhY3Rpb24tY3JlYXRlXCIsIG5hbWUgPT4ge1xyXG5cdFx0XHQvLyBzaG93IHRoZSBhY3Rpb25zXHJcblx0XHRcdGFjdGlvbnMuY2xhc3NMaXN0LnJlbW92ZShcImhpZGRlblwiKTtcclxuXHJcblx0XHRcdC8vIGNyZWF0ZSB0aGUgYnV0dG9uXHJcblx0XHRcdGxpZmVMaW5lLm1ha2VEb20oe1xyXG5cdFx0XHRcdHBhcmVudDogYWN0aW9ucyxcclxuXHRcdFx0XHR0YWc6IFwiZGl2XCIsXHJcblx0XHRcdFx0bmFtZTogXCJpdGVtXCIsXHJcblx0XHRcdFx0Y2xhc3NlczogXCJzaWRlYmFyLWl0ZW1cIixcclxuXHRcdFx0XHR0ZXh0OiBuYW1lLFxyXG5cdFx0XHRcdGF0dHJzOiB7XHJcblx0XHRcdFx0XHRcImRhdGEtbmFtZVwiOiBuYW1lXHJcblx0XHRcdFx0fSxcclxuXHRcdFx0XHRvbjoge1xyXG5cdFx0XHRcdFx0Y2xpY2s6ICgpID0+IHtcclxuXHRcdFx0XHRcdFx0Ly8gY2xvc2UgdGhlIHNpZGViYXJcclxuXHRcdFx0XHRcdFx0ZG9jdW1lbnQuYm9keS5jbGFzc0xpc3QucmVtb3ZlKFwic2lkZWJhci1vcGVuXCIpO1xyXG5cclxuXHRcdFx0XHRcdFx0Ly8gdHJpZ2dlciB0aGUgYWN0aW9uXHJcblx0XHRcdFx0XHRcdGxpZmVMaW5lLmVtaXQoXCJhY3Rpb24tZXhlYy1cIiArIG5hbWUpO1xyXG5cdFx0XHRcdFx0fVxyXG5cdFx0XHRcdH1cclxuXHRcdFx0fSk7XHJcblxyXG5cdFx0XHQvLyByZW1vdmUgYSBzaWRlYmFyIGFjdGlvblxyXG5cdFx0XHRsaWZlTGluZS5vbihcImFjdGlvbi1yZW1vdmVcIiwgbmFtZSA9PiB7XHJcblx0XHRcdFx0Ly8gcmVtb3ZlIHRoZSBidXR0b25cclxuXHRcdFx0XHR2YXIgYnRuID0gYWN0aW9ucy5xdWVyeVNlbGVjdG9yKGBbZGF0YS1uYW1lPVwiJHtuYW1lfVwiXWApO1xyXG5cclxuXHRcdFx0XHRpZihidG4pIGJ0bi5yZW1vdmUoKTtcclxuXHJcblx0XHRcdFx0Ly8gaGlkZSB0aGUgcGFnZSBhY3Rpb25zIGlmIHRoZXJlIGFyZSBub25lXHJcblx0XHRcdFx0aWYoYWN0aW9ucy5jaGlsZHJlbi5sZW5ndGggPT0gMSkge1xyXG5cdFx0XHRcdFx0YWN0aW9ucy5jbGFzc0xpc3QuYWRkKFwiaGlkZGVuXCIpO1xyXG5cdFx0XHRcdH1cclxuXHRcdFx0fSk7XHJcblxyXG5cdFx0XHQvLyByZW1vdmUgYWxsIHRoZSBzaWRlYmFyIGFjdGlvbnNcclxuXHRcdFx0bGlmZUxpbmUub24oXCJhY3Rpb24tcmVtb3ZlLWFsbFwiLCAoKSA9PiB7XHJcblx0XHRcdFx0Ly8gcmVtb3ZlIGFsbCB0aGUgYWN0aW9uc1xyXG5cdFx0XHRcdHZhciBfYWN0aW9ucyA9IEFycmF5LmZyb20oYWN0aW9ucy5xdWVyeVNlbGVjdG9yQWxsKFwiLnNpZGViYXItaXRlbVwiKSk7XHJcblxyXG5cdFx0XHRcdF9hY3Rpb25zLmZvckVhY2goYWN0aW9uID0+IGFjdGlvbi5yZW1vdmUoKSk7XHJcblxyXG5cdFx0XHRcdC8vIHNpZGUgdGhlIHBhZ2UgYWN0aW9uc1xyXG5cdFx0XHRcdGFjdGlvbnMuY2xhc3NMaXN0LmFkZChcImhpZGRlblwiKTtcclxuXHRcdFx0fSk7XHJcblx0XHR9KTtcclxuXHR9XHJcbn0pO1xyXG4iLCIvKipcclxuICogQSByb3cgb2YgcmFkaW8gc3R5bGUgYnV0dG9uc1xyXG4gKi9cclxuXHJcbmxpZmVMaW5lLm1ha2VEb20ucmVnaXN0ZXIoXCJ0b2dnbGUtYnRuc1wiLCB7XHJcblx0bWFrZSh7YnRucywgdmFsdWV9KSB7XHJcblx0XHQvLyBhdXRvIHNlbGVjdCB0aGUgZmlyc3QgYnV0dG9uXHJcblx0XHRpZighdmFsdWUpIHtcclxuXHRcdFx0dmFsdWUgPSB0eXBlb2YgYnRuc1swXSA9PSBcInN0cmluZ1wiID8gYnRuc1swXSA6IGJ0bnNbMF0udmFsdWU7XHJcblx0XHR9XHJcblxyXG5cdFx0cmV0dXJuIHtcclxuXHRcdFx0bmFtZTogXCJ0b2dnbGVCYXJcIixcclxuXHRcdFx0Y2xhc3NlczogXCJ0b2dnbGUtYmFyXCIsXHJcblx0XHRcdGNoaWxkcmVuOiBidG5zLm1hcChidG4gPT4ge1xyXG5cdFx0XHRcdC8vIGNvbnZlcnQgdGhlIHBsYWluIHN0cmluZyB0byBhbiBvYmplY3RcclxuXHRcdFx0XHRpZih0eXBlb2YgYnRuID09IFwic3RyaW5nXCIpIHtcclxuXHRcdFx0XHRcdGJ0biA9IHsgdGV4dDogYnRuLCB2YWx1ZTogYnRuIH07XHJcblx0XHRcdFx0fVxyXG5cclxuXHRcdFx0XHR2YXIgY2xhc3NlcyA9IFtcInRvZ2dsZS1idG5cIl07XHJcblxyXG5cdFx0XHRcdC8vIGFkZCB0aGUgc2VsZWN0ZWQgY2xhc3NcclxuXHRcdFx0XHRpZih2YWx1ZSA9PSBidG4udmFsdWUpIHtcclxuXHRcdFx0XHRcdGNsYXNzZXMucHVzaChcInRvZ2dsZS1idG4tc2VsZWN0ZWRcIik7XHJcblxyXG5cdFx0XHRcdFx0Ly8gZG9uJ3Qgc2VsZWN0IHR3byBidXR0b25zXHJcblx0XHRcdFx0XHR2YWx1ZSA9IHVuZGVmaW5lZDtcclxuXHRcdFx0XHR9XHJcblxyXG5cdFx0XHRcdHJldHVybiB7XHJcblx0XHRcdFx0XHR0YWc6IFwiYnV0dG9uXCIsXHJcblx0XHRcdFx0XHRjbGFzc2VzLFxyXG5cdFx0XHRcdFx0dGV4dDogYnRuLnRleHQsXHJcblx0XHRcdFx0XHRhdHRyczoge1xyXG5cdFx0XHRcdFx0XHRcImRhdGEtdmFsdWVcIjogYnRuLnZhbHVlXHJcblx0XHRcdFx0XHR9XHJcblx0XHRcdFx0fTtcclxuXHRcdFx0fSlcclxuXHRcdH07XHJcblx0fSxcclxuXHJcblx0YmluZCh7Y2hhbmdlfSwge3RvZ2dsZUJhcn0pIHtcclxuXHRcdC8vIGF0dGFjaCBsaXN0ZW5lcnNcclxuXHRcdGZvcihsZXQgYnRuIG9mIHRvZ2dsZUJhci5xdWVyeVNlbGVjdG9yQWxsKFwiLnRvZ2dsZS1idG5cIikpIHtcclxuXHRcdFx0YnRuLmFkZEV2ZW50TGlzdGVuZXIoXCJjbGlja1wiLCAoKSA9PiB7XHJcblx0XHRcdFx0dmFyIHNlbGVjdGVkID0gdG9nZ2xlQmFyLnF1ZXJ5U2VsZWN0b3IoXCIudG9nZ2xlLWJ0bi1zZWxlY3RlZFwiKTtcclxuXHJcblx0XHRcdFx0Ly8gdGhlIGJ1dHRvbiBoYXMgYWxyZWFkeSBiZWVuIHNlbGVjdGVkXHJcblx0XHRcdFx0aWYoc2VsZWN0ZWQgPT0gYnRuKSB7XHJcblx0XHRcdFx0XHRyZXR1cm47XHJcblx0XHRcdFx0fVxyXG5cclxuXHRcdFx0XHQvLyB1bnRvZ2dsZSB0aGUgb3RoZXIgYnV0dG9uXHJcblx0XHRcdFx0aWYoc2VsZWN0ZWQpIHtcclxuXHRcdFx0XHRcdHNlbGVjdGVkLmNsYXNzTGlzdC5yZW1vdmUoXCJ0b2dnbGUtYnRuLXNlbGVjdGVkXCIpO1xyXG5cdFx0XHRcdH1cclxuXHJcblx0XHRcdFx0Ly8gc2VsZWN0IHRoaXMgYnV0dG9uXHJcblx0XHRcdFx0YnRuLmNsYXNzTGlzdC5hZGQoXCJ0b2dnbGUtYnRuLXNlbGVjdGVkXCIpO1xyXG5cclxuXHRcdFx0XHQvLyB0cmlnZ2VyIGEgc2VsZWN0aW9uIGNoYW5nZVxyXG5cdFx0XHRcdGNoYW5nZShidG4uZGF0YXNldC52YWx1ZSk7XHJcblx0XHRcdH0pO1xyXG5cdFx0fVxyXG5cdH1cclxufSk7XHJcbiIsIi8qKlxyXG4gKiBOYW1lIGdlbmVyYXRvciBmb3IgYmFja3Vwc1xyXG4gKi9cclxuXHJcbmV4cG9ydHMuZ2VuQmFja3VwTmFtZSA9IGZ1bmN0aW9uKGRhdGUgPSBuZXcgRGF0ZSgpKSB7XHJcblx0cmV0dXJuIGBiYWNrdXAtJHtkYXRlLmdldEZ1bGxZZWFyKCl9LSR7ZGF0ZS5nZXRNb250aCgpKzF9LSR7ZGF0ZS5nZXREYXRlKCl9YFxyXG5cdFx0KyBgLSR7ZGF0ZS5nZXRIb3VycygpfS0ke2RhdGUuZ2V0TWludXRlcygpfS56aXBgO1xyXG59O1xyXG4iLCIvKipcclxuICogQW4gYWRhcHRvciBmb3IgaHR0cCBiYXNlZCBzdG9yZXNcclxuICovXHJcblxyXG5pZih0eXBlb2Ygd2luZG93ICE9IFwib2JqZWN0XCIpIHtcclxuXHQvLyBwb2x5ZmlsbCBmZXRjaCBmb3Igbm9kZVxyXG5cdGZldGNoID0gcmVxdWlyZShcIm5vZGUtZmV0Y2hcIik7XHJcbn1cclxuXHJcbmNsYXNzIEh0dHBBZGFwdG9yIHtcclxuXHRjb25zdHJ1Y3RvcihvcHRzKSB7XHJcblx0XHQvLyBpZiB3ZSBhcmUganVzdCBnaXZlbiBhIHN0cmluZyB1c2UgaXQgYXMgdGhlIHNvdXJjZVxyXG5cdFx0aWYodHlwZW9mIG9wdHMgPT0gXCJzdHJpbmdcIikge1xyXG5cdFx0XHRvcHRzID0ge1xyXG5cdFx0XHRcdHNyYzogb3B0c1xyXG5cdFx0XHR9O1xyXG5cdFx0fVxyXG5cclxuXHRcdC8vIHNhdmUgdGhlIG9wdGlvbnNcclxuXHRcdHRoaXMuX29wdHMgPSBvcHRzO1xyXG5cdH1cclxuXHJcblx0Ly8gY3JlYXRlIHRoZSBvcHRpb25zIGZvciBhIGZldGNoIHJlcXVlc3RcclxuXHRfY3JlYXRlT3B0cygpIHtcclxuXHRcdHZhciBvcHRzID0ge307XHJcblxyXG5cdFx0Ly8gdXNlIHRoZSBzZXNzaW9uIGNvb2tpZSB3ZSB3ZXJlIGdpdmVuXHJcblx0XHRpZih0aGlzLl9vcHRzLnNlc3Npb24pIHtcclxuXHRcdFx0b3B0cy5oZWFkZXJzID0ge1xyXG5cdFx0XHRcdGNvb2tpZTogYHNlc3Npb249JHt0aGlzLl9vcHRzLnNlc3Npb259YFxyXG5cdFx0XHR9O1xyXG5cdFx0fVxyXG5cdFx0Ly8gdXNlIHRoZSBjcmVhZGVudGlhbHMgZnJvbSB0aGUgYnJvd3NlclxyXG5cdFx0ZWxzZSB7XHJcblx0XHRcdG9wdHMuY3JlZGVudGlhbHMgPSBcImluY2x1ZGVcIjtcclxuXHRcdH1cclxuXHJcblx0XHRyZXR1cm4gb3B0cztcclxuXHR9XHJcblxyXG5cdC8qKlxyXG5cdCAqIEdldCBhbGwgdGhlIHZhbHVlcyBpbiBhIHN0b3JlXHJcblx0ICovXHJcblx0Z2V0QWxsKCkge1xyXG5cdFx0cmV0dXJuIGZldGNoKHRoaXMuX29wdHMuc3JjLCB0aGlzLl9jcmVhdGVPcHRzKCkpXHJcblxyXG5cdFx0Ly8gcGFyc2UgdGhlIGpzb24gcmVzcG9uc2VcclxuXHRcdC50aGVuKHJlcyA9PiB7XHJcblx0XHRcdC8vIHNlcnZlci9zZXJ2aWNlIHdvcmtlciBlcnJvclxyXG5cdFx0XHRpZihyZXMuc3RhdHVzID09IDUwMCkge1xyXG5cdFx0XHRcdHJldHVybiByZXMudGV4dCgpXHJcblxyXG5cdFx0XHRcdC50aGVuKG1zZyA9PiB7XHJcblx0XHRcdFx0XHR0aHJvdyBuZXcgRXJyb3IobXNnKTtcclxuXHRcdFx0XHR9KTtcclxuXHRcdFx0fVxyXG5cclxuXHRcdFx0cmV0dXJuIHJlcy5qc29uKCk7XHJcblx0XHR9KVxyXG5cclxuXHRcdC50aGVuKGpzb24gPT4ge1xyXG5cdFx0XHQvLyBhbiBlcnJvciBvY2N1cmVkIG9uIHRoZSBzZXJ2ZXJcclxuXHRcdFx0aWYoanNvbi5zdGF0dXMgPT0gXCJlcnJvclwiKSB7XHJcblx0XHRcdFx0dGhyb3cgbmV3IEVycm9yKGpzb24uZGF0YSk7XHJcblx0XHRcdH1cclxuXHJcblx0XHRcdHJldHVybiBqc29uO1xyXG5cdFx0fSk7XHJcblx0fVxyXG5cclxuXHQvKipcclxuXHQgKiBHZXQgYSBzaW5nbGUgdmFsdWVcclxuXHQgKi9cclxuXHRnZXQoa2V5KSB7XHJcblx0XHRyZXR1cm4gZmV0Y2godGhpcy5fb3B0cy5zcmMgKyBcInZhbHVlL1wiICsga2V5LCB0aGlzLl9jcmVhdGVPcHRzKCkpXHJcblxyXG5cdFx0LnRoZW4ocmVzID0+IHtcclxuXHRcdFx0Ly8gbm90IGxvZ2dlZCBpblxyXG5cdFx0XHRpZihyZXMuc3RhdHVzID09IDQwMykge1xyXG5cdFx0XHRcdGxldCBlcnJvciA9IG5ldyBFcnJvcihcIk5vdCBsb2dnZWQgaW5cIik7XHJcblxyXG5cdFx0XHRcdC8vIGFkZCBhbiBlcnJvciBjb2RlXHJcblx0XHRcdFx0ZXJyb3IuY29kZSA9IFwibm90LWxvZ2dlZC1pblwiO1xyXG5cclxuXHRcdFx0XHR0aHJvdyBlcnJvcjtcclxuXHRcdFx0fVxyXG5cclxuXHRcdFx0Ly8gbm8gc3VjaCBpdGVtXHJcblx0XHRcdGlmKHJlcy5zdGF0dXMgPT0gNDA0KSB7XHJcblx0XHRcdFx0cmV0dXJuIHVuZGVmaW5lZDtcclxuXHRcdFx0fVxyXG5cclxuXHRcdFx0Ly8gc2VydmVyL3NlcnZpY2Ugd29ya2VyIGVycm9yXHJcblx0XHRcdGlmKHJlcy5zdGF0dXMgPT0gNTAwKSB7XHJcblx0XHRcdFx0cmV0dXJuIHJlcy50ZXh0KClcclxuXHJcblx0XHRcdFx0LnRoZW4obXNnID0+IHtcclxuXHRcdFx0XHRcdHRocm93IG5ldyBFcnJvcihtc2cpO1xyXG5cdFx0XHRcdH0pO1xyXG5cdFx0XHR9XHJcblxyXG5cdFx0XHQvLyBwYXJzZSB0aGUgaXRlbVxyXG5cdFx0XHRyZXR1cm4gcmVzLmpzb24oKTtcclxuXHRcdH0pXHJcblxyXG5cdFx0LnRoZW4oanNvbiA9PiB7XHJcblx0XHRcdC8vIGFuIGVycm9yIG9jY3VyZWQgb24gdGhlIHNlcnZlclxyXG5cdFx0XHRpZihqc29uICYmIGpzb24uc3RhdHVzID09IFwiZXJyb3JcIikge1xyXG5cdFx0XHRcdHRocm93IG5ldyBFcnJvcihqc29uLmRhdGEpO1xyXG5cdFx0XHR9XHJcblxyXG5cdFx0XHRyZXR1cm4ganNvbjtcclxuXHRcdH0pO1xyXG5cdH1cclxuXHJcblx0LyoqXHJcblx0ICogU3RvcmUgYW4gdmFsdWUgb24gdGhlIHNlcnZlclxyXG5cdCAqL1xyXG5cdHNldCh2YWx1ZSkge1xyXG5cdFx0dmFyIGZldGNoT3B0cyA9IHRoaXMuX2NyZWF0ZU9wdHMoKTtcclxuXHJcblx0XHQvLyBhZGQgdGhlIGhlYWRlcnMgdG8gdGhlIGRlZmF1bHQgaGVhZGVyc1xyXG5cdFx0ZmV0Y2hPcHRzLm1ldGhvZCA9IFwiUFVUXCI7XHJcblx0XHRmZXRjaE9wdHMuYm9keSA9IEpTT04uc3RyaW5naWZ5KHZhbHVlKTtcclxuXHJcblx0XHQvLyBzZW5kIHRoZSBpdGVtXHJcblx0XHRyZXR1cm4gZmV0Y2godGhpcy5fb3B0cy5zcmMgKyBcInZhbHVlL1wiICsgdmFsdWUuaWQsIGZldGNoT3B0cylcclxuXHJcblx0XHQudGhlbihyZXMgPT4ge1xyXG5cdFx0XHQvLyBub3QgbG9nZ2VkIGluXHJcblx0XHRcdGlmKHJlcy5zdGF0dXMgPT0gNDAzKSB7XHJcblx0XHRcdFx0bGV0IGVycm9yID0gbmV3IEVycm9yKFwiTm90IGxvZ2dlZCBpblwiKTtcclxuXHJcblx0XHRcdFx0Ly8gYWRkIGFuIGVycm9yIGNvZGVcclxuXHRcdFx0XHRlcnJvci5jb2RlID0gXCJub3QtbG9nZ2VkLWluXCI7XHJcblxyXG5cdFx0XHRcdHRocm93IGVycm9yO1xyXG5cdFx0XHR9XHJcblxyXG5cdFx0XHQvLyBzZXJ2ZXIvc2VydmljZSB3b3JrZXIgZXJyb3JcclxuXHRcdFx0aWYocmVzLnN0YXR1cyA9PSA1MDApIHtcclxuXHRcdFx0XHRyZXR1cm4gcmVzLnRleHQoKVxyXG5cclxuXHRcdFx0XHQudGhlbihtc2cgPT4ge1xyXG5cdFx0XHRcdFx0dGhyb3cgbmV3IEVycm9yKG1zZyk7XHJcblx0XHRcdFx0fSk7XHJcblx0XHRcdH1cclxuXHJcblx0XHRcdC8vIHBhcnNlIHRoZSBlcnJvciBtZXNzYWdlXHJcblx0XHRcdGlmKHJlcy5zdGF0dXMgIT0gMzA0KSB7XHJcblx0XHRcdFx0cmV0dXJuIHJlcy5qc29uKCk7XHJcblx0XHRcdH1cclxuXHRcdH0pXHJcblxyXG5cdFx0LnRoZW4oanNvbiA9PiB7XHJcblx0XHRcdC8vIGFuIGVycm9yIG9jY3VyZWQgb24gdGhlIHNlcnZlclxyXG5cdFx0XHRpZihqc29uLnN0YXR1cyA9PSBcImVycm9yXCIpIHtcclxuXHRcdFx0XHR0aHJvdyBuZXcgRXJyb3IoanNvbi5kYXRhKTtcclxuXHRcdFx0fVxyXG5cclxuXHRcdFx0cmV0dXJuIGpzb247XHJcblx0XHR9KTtcclxuXHR9XHJcblxyXG5cdC8qKlxyXG5cdCAqIFJlbW92ZSB0aGUgdmFsdWUgZnJvbSB0aGUgc3RvcmVcclxuXHQgKi9cclxuXHRyZW1vdmUoa2V5KSB7XHJcblx0XHR2YXIgZmV0Y2hPcHRzID0gdGhpcy5fY3JlYXRlT3B0cygpO1xyXG5cclxuXHRcdC8vIGFkZCB0aGUgaGVhZGVycyB0byB0aGUgZGVmYXVsdCBoZWFkZXJzXHJcblx0XHRmZXRjaE9wdHMubWV0aG9kID0gXCJERUxFVEVcIjtcclxuXHJcblx0XHQvLyBzZW5kIHRoZSBpdGVtXHJcblx0XHRyZXR1cm4gZmV0Y2godGhpcy5fb3B0cy5zcmMgKyBcInZhbHVlL1wiICsga2V5LCBmZXRjaE9wdHMpXHJcblxyXG5cdFx0LnRoZW4ocmVzID0+IHtcclxuXHRcdFx0Ly8gbm90IGxvZ2dlZCBpblxyXG5cdFx0XHRpZihyZXMuc3RhdHVzID09IDQwMykge1xyXG5cdFx0XHRcdGxldCBlcnJvciA9IG5ldyBFcnJvcihcIk5vdCBsb2dnZWQgaW5cIik7XHJcblxyXG5cdFx0XHRcdC8vIGFkZCBhbiBlcnJvciBjb2RlXHJcblx0XHRcdFx0ZXJyb3IuY29kZSA9IFwibm90LWxvZ2dlZC1pblwiO1xyXG5cclxuXHRcdFx0XHR0aHJvdyBlcnJvcjtcclxuXHRcdFx0fVxyXG5cclxuXHRcdFx0Ly8gc2VydmVyL3NlcnZpY2Ugd29ya2VyIGVycm9yXHJcblx0XHRcdGlmKHJlcy5zdGF0dXMgPT0gNTAwKSB7XHJcblx0XHRcdFx0cmV0dXJuIHJlcy50ZXh0KClcclxuXHJcblx0XHRcdFx0LnRoZW4obXNnID0+IHtcclxuXHRcdFx0XHRcdHRocm93IG5ldyBFcnJvcihtc2cpO1xyXG5cdFx0XHRcdH0pO1xyXG5cdFx0XHR9XHJcblxyXG5cdFx0XHQvLyBwYXJzZSB0aGUgZXJyb3IgbWVzc2FnZVxyXG5cdFx0XHRpZihyZXMuc3RhdHVzICE9IDMwNCkge1xyXG5cdFx0XHRcdHJldHVybiByZXMuanNvbigpO1xyXG5cdFx0XHR9XHJcblx0XHR9KVxyXG5cclxuXHRcdC50aGVuKGpzb24gPT4ge1xyXG5cdFx0XHQvLyBhbiBlcnJvciBvY2N1cmVkIG9uIHRoZSBzZXJ2ZXJcclxuXHRcdFx0aWYoanNvbi5zdGF0dXMgPT0gXCJlcnJvclwiKSB7XHJcblx0XHRcdFx0dGhyb3cgbmV3IEVycm9yKGpzb24uZGF0YSk7XHJcblx0XHRcdH1cclxuXHJcblx0XHRcdHJldHVybiBqc29uO1xyXG5cdFx0fSk7XHJcblx0fVxyXG5cclxuXHQvLyBjaGVjayBvdXIgYWNjZXNzIGxldmVsXHJcblx0YWNjZXNzTGV2ZWwoKSB7XHJcblx0XHRyZXR1cm4gZmV0Y2godGhpcy5fb3B0cy5zcmMgKyBcImFjY2Vzc1wiLCB0aGlzLl9jcmVhdGVPcHRzKCkpXHJcblx0XHRcdC8vIHRoZSByZXNwb25zZSBpcyBqdXN0IGEgc3RyaW5nXHJcblx0XHRcdC50aGVuKHJlcyA9PiByZXMudGV4dCgpKTtcclxuXHR9XHJcbn1cclxuXHJcbm1vZHVsZS5leHBvcnRzID0gSHR0cEFkYXB0b3I7XHJcbiIsIi8qKlxyXG4gKiBBIGJhc2ljIGtleSB2YWx1ZSBkYXRhIHN0b3JlXHJcbiAqL1xyXG5cclxudmFyIEV2ZW50RW1pdHRlciA9IHJlcXVpcmUoXCIuLi91dGlsL2V2ZW50LWVtaXR0ZXJcIik7XHJcblxyXG5jbGFzcyBLZXlWYWx1ZVN0b3JlIGV4dGVuZHMgRXZlbnRFbWl0dGVyIHtcclxuXHRjb25zdHJ1Y3RvcihhZGFwdG9yKSB7XHJcblx0XHRzdXBlcigpO1xyXG5cdFx0dGhpcy5fYWRhcHRvciA9IGFkYXB0b3I7XHJcblxyXG5cdFx0Ly8gbWFrZSBzdXJlIHdlIGhhdmUgYW4gYWRhcHRvclxyXG5cdFx0aWYoIWFkYXB0b3IpIHtcclxuXHRcdFx0dGhyb3cgbmV3IEVycm9yKFwiS2V5VmFsdWVTdG9yZSBtdXN0IGJlIGluaXRpYWxpemVkIHdpdGggYW4gYWRhcHRvclwiKVxyXG5cdFx0fVxyXG5cdH1cclxuXHJcblx0LyoqXHJcblx0ICogR2V0IHRoZSBjb3JyaXNwb25kaW5nIHZhbHVlIG91dCBvZiB0aGUgZGF0YSBzdG9yZSBvdGhlcndpc2UgcmV0dXJuIGRlZmF1bHRcclxuXHQgKi9cclxuXHRnZXQoa2V5LCBfZGVmYXVsdCkge1xyXG5cdFx0Ly8gY2hlY2sgaWYgdGhpcyB2YWx1ZSBoYXMgYmVlbiBvdmVycmlkZW5cclxuXHRcdGlmKHRoaXMuX292ZXJyaWRlcyAmJiB0aGlzLl9vdmVycmlkZXMuaGFzT3duUHJvcGVydHkoa2V5KSkge1xyXG5cdFx0XHRyZXR1cm4gUHJvbWlzZS5yZXNvbHZlKHRoaXMuX292ZXJyaWRlc1trZXldKTtcclxuXHRcdH1cclxuXHJcblx0XHRyZXR1cm4gdGhpcy5fYWRhcHRvci5nZXQoa2V5KVxyXG5cclxuXHRcdC50aGVuKHJlc3VsdCA9PiB7XHJcblx0XHRcdC8vIHRoZSBpdGVtIGlzIG5vdCBkZWZpbmVkXHJcblx0XHRcdGlmKCFyZXN1bHQpIHtcclxuXHRcdFx0XHRyZXR1cm4gX2RlZmF1bHQ7XHJcblx0XHRcdH1cclxuXHJcblx0XHRcdHJldHVybiByZXN1bHQudmFsdWU7XHJcblx0XHR9KTtcclxuXHR9XHJcblxyXG5cdC8qKlxyXG5cdCAqIFNldCBhIHNpbmdsZSB2YWx1ZSBvciBzZXZlcmFsIHZhbHVlc1xyXG5cdCAqXHJcblx0ICoga2V5IC0+IHZhbHVlXHJcblx0ICogb3JcclxuXHQgKiB7IGtleTogdmFsdWUgfVxyXG5cdCAqL1xyXG5cdHNldChrZXksIHZhbHVlKSB7XHJcblx0XHQvLyBzZXQgYSBzaW5nbGUgdmFsdWVcclxuXHRcdGlmKHR5cGVvZiBrZXkgPT0gXCJzdHJpbmdcIikge1xyXG5cdFx0XHR2YXIgcHJvbWlzZSA9IHRoaXMuX2FkYXB0b3Iuc2V0KHtcclxuXHRcdFx0XHRpZDoga2V5LFxyXG5cdFx0XHRcdHZhbHVlLFxyXG5cdFx0XHRcdG1vZGlmaWVkOiBEYXRlLm5vdygpXHJcblx0XHRcdH0pO1xyXG5cclxuXHRcdFx0Ly8gdHJpZ2dlciB0aGUgY2hhbmdlXHJcblx0XHRcdHRoaXMuZW1pdChrZXksIHZhbHVlKTtcclxuXHJcblx0XHRcdHJldHVybiBwcm9taXNlO1xyXG5cdFx0fVxyXG5cdFx0Ly8gc2V0IHNldmVyYWwgdmFsdWVzXHJcblx0XHRlbHNlIHtcclxuXHRcdFx0Ly8gdGVsbCB0aGUgY2FsbGVyIHdoZW4gd2UgYXJlIGRvbmVcclxuXHRcdFx0bGV0IHByb21pc2VzID0gW107XHJcblxyXG5cdFx0XHRmb3IobGV0IF9rZXkgb2YgT2JqZWN0LmdldE93blByb3BlcnR5TmFtZXMoa2V5KSkge1xyXG5cdFx0XHRcdHByb21pc2VzLnB1c2goXHJcblx0XHRcdFx0XHR0aGlzLl9hZGFwdG9yLnNldCh7XHJcblx0XHRcdFx0XHRcdGlkOiBfa2V5LFxyXG5cdFx0XHRcdFx0XHR2YWx1ZToga2V5W19rZXldLFxyXG5cdFx0XHRcdFx0XHRtb2RpZmllZDogRGF0ZS5ub3coKVxyXG5cdFx0XHRcdFx0fSlcclxuXHRcdFx0XHQpO1xyXG5cclxuXHRcdFx0XHQvLyB0cmlnZ2VyIHRoZSBjaGFuZ2VcclxuXHRcdFx0XHR0aGlzLmVtaXQoX2tleSwga2V5W19rZXldKTtcclxuXHRcdFx0fVxyXG5cclxuXHRcdFx0cmV0dXJuIFByb21pc2UuYWxsKHByb21pc2VzKTtcclxuXHRcdH1cclxuXHR9XHJcblxyXG5cdCAvKipcclxuXHQgICogV2F0Y2ggdGhlIHZhbHVlIGZvciBjaGFuZ2VzXHJcblx0ICAqXHJcblx0ICAqIG9wdHMuY3VycmVudCAtIHNlbmQgdGhlIGN1cnJlbnQgdmFsdWUgb2Yga2V5IChkZWZhdWx0OiBmYWxzZSlcclxuXHQgICogb3B0cy5kZWZhdWx0IC0gdGhlIGRlZmF1bHQgdmFsdWUgdG8gc2VuZCBmb3Igb3B0cy5jdXJyZW50XHJcblx0ICAqL1xyXG5cdCB3YXRjaChrZXksIG9wdHMsIGZuKSB7XHJcblx0XHQgLy8gbWFrZSBvcHRzIG9wdGlvbmFsXHJcblx0XHQgaWYodHlwZW9mIG9wdHMgPT0gXCJmdW5jdGlvblwiKSB7XHJcblx0XHRcdCBmbiA9IG9wdHM7XHJcblx0XHRcdCBvcHRzID0ge307XHJcblx0XHQgfVxyXG5cclxuXHRcdCAvLyBpZiBhIGNoYW5nZSBpcyB0cmlnZ2VyZWQgYmVmb3JlIGdldCBjb21lcyBiYWNrIGRvbid0IGVtaXQgdGhlIHZhbHVlIGZyb20gZ2V0XHJcblx0XHQgdmFyIGNoYW5nZVJlY2lldmVkID0gZmFsc2U7XHJcblxyXG5cdFx0IC8vIHNlbmQgdGhlIGN1cnJlbnQgdmFsdWVcclxuXHRcdCBpZihvcHRzLmN1cnJlbnQpIHtcclxuXHRcdFx0IHRoaXMuZ2V0KGtleSwgb3B0cy5kZWZhdWx0KVxyXG5cclxuXHRcdCBcdC50aGVuKHZhbHVlID0+IHtcclxuXHRcdFx0XHRpZighY2hhbmdlUmVjaWV2ZWQpIHtcclxuXHRcdFx0XHRcdGZuKHZhbHVlKTtcclxuXHRcdFx0XHR9XHJcblx0XHRcdH0pO1xyXG5cdFx0IH1cclxuXHJcblx0XHQgLy8gbGlzdGVuIGZvciBhbnkgY2hhbmdlc1xyXG5cdFx0IHJldHVybiB0aGlzLm9uKGtleSwgdmFsdWUgPT4ge1xyXG5cdFx0XHQgLy8gb25seSBlbWl0IHRoZSBjaGFuZ2UgaWYgdGhlcmUgaXMgbm90IGFuIG92ZXJyaWRlIGluIHBsYWNlXHJcblx0XHRcdCBpZighdGhpcy5fb3ZlcnJpZGVzIHx8ICF0aGlzLl9vdmVycmlkZXMuaGFzT3duUHJvcGVydHkoa2V5KSkge1xyXG5cdFx0XHRcdCBmbih2YWx1ZSk7XHJcblx0XHRcdCB9XHJcblxyXG5cdFx0XHQgY2hhbmdlUmVjaWV2ZWQgPSB0cnVlO1xyXG5cdFx0IH0pO1xyXG5cdCB9XHJcblxyXG5cdCAvKipcclxuXHQgICogT3ZlcnJpZGUgdGhlIHZhbHVlcyBmcm9tIHRoZSBhZGFwdG9yIHdpdGhvdXQgd3JpdGluZyB0byB0aGVtXHJcblx0ICAqXHJcblx0ICAqIFVzZWZ1bCBmb3IgY29tYmluaW5nIGpzb24gc2V0dGluZ3Mgd2l0aCBjb21tYW5kIGxpbmUgZmxhZ3NcclxuXHQgICovXHJcblx0IHNldE92ZXJyaWRlcyhvdmVycmlkZXMpIHtcclxuXHRcdCAvLyBlbWl0IGNoYW5nZXMgZm9yIGVhY2ggb2YgdGhlIG92ZXJyaWRlc1xyXG5cdFx0IE9iamVjdC5nZXRPd25Qcm9wZXJ0eU5hbWVzKG92ZXJyaWRlcylcclxuXHJcblx0XHQgLmZvckVhY2goa2V5ID0+IHRoaXMuZW1pdChrZXksIG92ZXJyaWRlc1trZXldKSk7XHJcblxyXG5cdFx0IC8vIHNldCB0aGUgb3ZlcnJpZGVzIGFmdGVyIHNvIHRoZSBlbWl0IGlzIG5vdCBibG9ja2VkXHJcblx0XHQgdGhpcy5fb3ZlcnJpZGVzID0gb3ZlcnJpZGVzO1xyXG5cdCB9XHJcbn1cclxuXHJcbm1vZHVsZS5leHBvcnRzID0gS2V5VmFsdWVTdG9yZTtcclxuIiwiLyoqXHJcbiAqIEEgZGF0YSBzdG9yZSB3aGljaCBjb250YWlucyBhIHBvb2wgb2Ygb2JqZWN0cyB3aGljaCBhcmUgcXVlcnlhYmxlIGJ5IGFueSBwcm9wZXJ0eVxyXG4gKi9cclxuXHJcbnZhciBFdmVudEVtaXR0ZXIgPSByZXF1aXJlKFwiLi4vdXRpbC9ldmVudC1lbWl0dGVyXCIpO1xyXG5cclxuY2xhc3MgUG9vbFN0b3JlIGV4dGVuZHMgRXZlbnRFbWl0dGVyIHtcclxuXHRjb25zdHJ1Y3RvcihhZGFwdG9yLCBpbml0Rm4pIHtcclxuXHRcdHN1cGVyKCk7XHJcblx0XHR0aGlzLl9hZGFwdG9yID0gYWRhcHRvcjtcclxuXHRcdHRoaXMuX2luaXRGbiA9IGluaXRGbjtcclxuXHR9XHJcblxyXG5cdC8qKlxyXG5cdCAqIEdldCBhbGwgaXRlbXMgbWF0Y2luZyB0aGUgcHJvdmlkZWQgcHJvcGVydGllc1xyXG5cdCAqL1xyXG5cdHF1ZXJ5KHByb3BzLCBmbikge1xyXG5cdFx0Ly8gY2hlY2sgaWYgYSB2YWx1ZSBtYXRjaGVzIHRoZSBxdWVyeVxyXG5cdFx0dmFyIGZpbHRlciA9IHZhbHVlID0+IHtcclxuXHRcdFx0Ly8gbm90IGFuIGl0ZW1cclxuXHRcdFx0aWYoIXZhbHVlKSByZXR1cm4gZmFsc2U7XHJcblxyXG5cdFx0XHQvLyBjaGVjayB0aGF0IGFsbCB0aGUgcHJvcGVydGllcyBtYXRjaFxyXG5cdFx0XHRyZXR1cm4gT2JqZWN0LmdldE93blByb3BlcnR5TmFtZXMocHJvcHMpXHJcblxyXG5cdFx0XHQuZXZlcnkocHJvcE5hbWUgPT4ge1xyXG5cdFx0XHRcdC8vIGEgZnVuY3Rpb24gdG8gY2hlY2sgaWYgYSB2YWx1ZSBtYXRjaGVzXHJcblx0XHRcdFx0aWYodHlwZW9mIHByb3BzW3Byb3BOYW1lXSA9PSBcImZ1bmN0aW9uXCIpIHtcclxuXHRcdFx0XHRcdHJldHVybiBwcm9wc1twcm9wTmFtZV0odmFsdWVbcHJvcE5hbWVdKTtcclxuXHRcdFx0XHR9XHJcblx0XHRcdFx0Ly8gcGxhaW4gZXF1YWxpdHlcclxuXHRcdFx0XHRlbHNlIHtcclxuXHRcdFx0XHRcdHJldHVybiBwcm9wc1twcm9wTmFtZV0gPT0gdmFsdWVbcHJvcE5hbWVdXHJcblx0XHRcdFx0fVxyXG5cdFx0XHR9KTtcclxuXHRcdH07XHJcblxyXG5cdFx0Ly8gZ2V0IGFsbCBjdXJyZW50IGl0ZW1zIHRoYXQgbWF0Y2ggdGhlIGZpbHRlclxyXG5cdFx0dmFyIGN1cnJlbnQgPSAoXCJpZFwiIGluIHByb3BzKSA/XHJcblx0XHRcdHRoaXMuX2FkYXB0b3IuZ2V0KHByb3BzLmlkKS50aGVuKHZhbHVlID0+IFt2YWx1ZV0pOlxyXG5cdFx0XHR0aGlzLl9hZGFwdG9yLmdldEFsbCgpO1xyXG5cclxuXHRcdGN1cnJlbnQgPSBjdXJyZW50LnRoZW4odmFsdWVzID0+IHtcclxuXHRcdFx0Ly8gZmlsdGVyIG91dCB0aGUgdmFsdWVzXHJcblx0XHRcdHZhbHVlcyA9IHZhbHVlcy5maWx0ZXIoZmlsdGVyKTtcclxuXHJcblx0XHRcdC8vIGRvIGFueSBpbml0aWFsaXphdGlvblxyXG5cdFx0XHRpZih0aGlzLl9pbml0Rm4pIHtcclxuXHRcdFx0XHR2YWx1ZXMgPSB2YWx1ZXMubWFwKHZhbHVlID0+IHRoaXMuX2luaXRGbih2YWx1ZSkgfHwgdmFsdWUpO1xyXG5cdFx0XHR9XHJcblxyXG5cdFx0XHRyZXR1cm4gdmFsdWVzO1xyXG5cdFx0fSk7XHJcblxyXG5cdFx0Ly8gb3B0aW9uYWx5IHJ1biBjaGFuZ2VzIHRocm91Z2ggdGhlIHF1ZXJ5IGFzIHdlbGxcclxuXHRcdGlmKHR5cGVvZiBmbiA9PSBcImZ1bmN0aW9uXCIpIHtcclxuXHRcdFx0bGV0IHN1YnNjcmlwdGlvbiwgc3RvcHBlZDtcclxuXHJcblx0XHRcdC8vIHdyYXAgdGhlIHZhbHVlcyBpbiBjaGFuZ2Ugb2JqZWN0cyBhbmQgc2VuZCB0aGUgdG8gdGhlIGNvbnN1bWVyXHJcblx0XHRcdGN1cnJlbnQudGhlbih2YWx1ZXMgPT4ge1xyXG5cdFx0XHRcdC8vIGRvbid0IGxpc3RlbiBpZiB1bnN1YnNjcmliZSB3YXMgYWxyZWFkeSBjYWxsZWRcclxuXHRcdFx0XHRpZihzdG9wcGVkKSByZXR1cm47XHJcblxyXG5cdFx0XHRcdC8vIHNlbmQgdGhlIHZhbHVlcyB3ZSBjdXJyZW50bHkgaGF2ZVxyXG5cdFx0XHRcdGZuKHZhbHVlcy5zbGljZSgwKSk7XHJcblxyXG5cdFx0XHRcdC8vIHdhdGNoIGZvciBjaGFuZ2VzIGFmdGVyIHRoZSBpbml0aWFsIHZhbHVlcyBhcmUgc2VuZFxyXG5cdFx0XHRcdHN1YnNjcmlwdGlvbiA9IHRoaXMub24oXCJjaGFuZ2VcIiwgY2hhbmdlID0+IHtcclxuXHRcdFx0XHRcdC8vIGZpbmQgdGhlIHByZXZpb3VzIHZhbHVlXHJcblx0XHRcdFx0XHR2YXIgaW5kZXggPSB2YWx1ZXMuZmluZEluZGV4KHZhbHVlID0+IHZhbHVlLmlkID09IGNoYW5nZS5pZCk7XHJcblxyXG5cdFx0XHRcdFx0aWYoY2hhbmdlLnR5cGUgPT0gXCJjaGFuZ2VcIikge1xyXG5cdFx0XHRcdFx0XHQvLyBjaGVjayBpZiB0aGUgdmFsdWUgbWF0Y2hlcyB0aGUgcXVlcnlcclxuXHRcdFx0XHRcdFx0bGV0IG1hdGNoZXMgPSBmaWx0ZXIoY2hhbmdlLnZhbHVlKTtcclxuXHJcblx0XHRcdFx0XHRcdGlmKG1hdGNoZXMpIHtcclxuXHRcdFx0XHRcdFx0XHQvLyBmcmVzaGx5IGNyZWF0ZWRcclxuXHRcdFx0XHRcdFx0XHRpZihpbmRleCA9PT0gLTEpIHtcclxuXHRcdFx0XHRcdFx0XHRcdGxldCB7dmFsdWV9ID0gY2hhbmdlO1xyXG5cclxuXHRcdFx0XHRcdFx0XHRcdC8vIGRvIGFueSBpbml0aWFsaXphdGlvblxyXG5cdFx0XHRcdFx0XHRcdFx0aWYodGhpcy5faW5pdEZuKSB7XHJcblx0XHRcdFx0XHRcdFx0XHRcdHZhbHVlID0gdGhpcy5faW5pdEZuKHZhbHVlKSB8fCB2YWx1ZTtcclxuXHRcdFx0XHRcdFx0XHRcdH1cclxuXHJcblx0XHRcdFx0XHRcdFx0XHR2YWx1ZXMucHVzaCh2YWx1ZSk7XHJcblx0XHRcdFx0XHRcdFx0fVxyXG5cdFx0XHRcdFx0XHRcdC8vIHVwZGF0ZSBhbiBleGlzdGluZyB2YWx1ZVxyXG5cdFx0XHRcdFx0XHRcdGVsc2Uge1xyXG5cdFx0XHRcdFx0XHRcdFx0dmFsdWVzW2luZGV4XSA9IGNoYW5nZS52YWx1ZTtcclxuXHRcdFx0XHRcdFx0XHR9XHJcblxyXG5cdFx0XHRcdFx0XHRcdGZuKHZhbHVlcy5zbGljZSgwKSk7XHJcblx0XHRcdFx0XHRcdH1cclxuXHRcdFx0XHRcdFx0Ly8gdGVsbCB0aGUgY29uc3VtZXIgdGhpcyB2YWx1ZSBubyBsb25nZXIgbWF0Y2hlc1xyXG5cdFx0XHRcdFx0XHRlbHNlIGlmKGluZGV4ICE9PSAtMSkge1xyXG5cdFx0XHRcdFx0XHRcdC8vIHJlbW92ZSB0aGUgaXRlbVxyXG5cdFx0XHRcdFx0XHRcdGlmKGluZGV4ICE9PSAtMSkge1xyXG5cdFx0XHRcdFx0XHRcdFx0dmFsdWVzLnNwbGljZShpbmRleCwgMSk7XHJcblx0XHRcdFx0XHRcdFx0fVxyXG5cclxuXHRcdFx0XHRcdFx0XHRmbih2YWx1ZXMuc2xpY2UoMCkpO1xyXG5cdFx0XHRcdFx0XHR9XHJcblx0XHRcdFx0XHR9XHJcblx0XHRcdFx0XHRlbHNlIGlmKGNoYW5nZS50eXBlID09IFwicmVtb3ZlXCIgJiYgaW5kZXggIT09IC0xKSB7XHJcblx0XHRcdFx0XHRcdC8vIHJlbW92ZSB0aGUgaXRlbVxyXG5cdFx0XHRcdFx0XHRpZihpbmRleCAhPT0gLTEpIHtcclxuXHRcdFx0XHRcdFx0XHR2YWx1ZXMuc3BsaWNlKGluZGV4LCAxKTtcclxuXHRcdFx0XHRcdFx0fVxyXG5cclxuXHRcdFx0XHRcdFx0Zm4odmFsdWVzLnNsaWNlKDApKTtcclxuXHRcdFx0XHRcdH1cclxuXHRcdFx0XHR9KTtcclxuXHRcdFx0fSk7XHJcblxyXG5cdFx0XHRyZXR1cm4ge1xyXG5cdFx0XHRcdHVuc3Vic2NyaWJlKCkge1xyXG5cdFx0XHRcdFx0Ly8gaWYgd2UgYXJlIGxpc3RlbmluZyBzdG9wXHJcblx0XHRcdFx0XHRpZihzdWJzY3JpcHRpb24pIHtcclxuXHRcdFx0XHRcdFx0c3Vic2NyaXB0aW9uLnVuc3Vic2NyaWJlKClcclxuXHRcdFx0XHRcdH1cclxuXHJcblx0XHRcdFx0XHQvLyBkb24ndCBsaXN0ZW5cclxuXHRcdFx0XHRcdHN0b3BwZWQgPSB0cnVlO1xyXG5cdFx0XHRcdH1cclxuXHRcdFx0fVxyXG5cdFx0fVxyXG5cdFx0ZWxzZSB7XHJcblx0XHRcdHJldHVybiBjdXJyZW50O1xyXG5cdFx0fVxyXG5cdH1cclxuXHJcblx0LyoqXHJcblx0ICogU3RvcmUgYSB2YWx1ZSBpbiB0aGUgcG9vbFxyXG5cdCAqL1xyXG5cdHNldCh2YWx1ZSkge1xyXG5cdFx0Ly8gc2V0IHRoZSBtb2RpZmllZCBkYXRlXHJcblx0XHR2YWx1ZS5tb2RpZmllZCA9IERhdGUubm93KCk7XHJcblxyXG5cdFx0Ly8gc3RvcmUgdGhlIHZhbHVlIGluIHRoZSBhZGFwdG9yXHJcblx0XHR0aGlzLl9hZGFwdG9yLnNldCh2YWx1ZSk7XHJcblxyXG5cdFx0Ly8gcHJvcG9nYXRlIHRoZSBjaGFuZ2VcclxuXHRcdHRoaXMuZW1pdChcImNoYW5nZVwiLCB7XHJcblx0XHRcdHR5cGU6IFwiY2hhbmdlXCIsXHJcblx0XHRcdGlkOiB2YWx1ZS5pZCxcclxuXHRcdFx0dmFsdWVcclxuXHRcdH0pO1xyXG5cdH1cclxuXHJcblx0LyoqXHJcblx0ICogUmVtb3ZlIGEgdmFsdWUgZnJvbSB0aGUgcG9vbFxyXG5cdCAqL1xyXG5cdHJlbW92ZShpZCkge1xyXG5cdFx0Ly8gcmVtb3ZlIHRoZSB2YWx1ZSBmcm9tIHRoZSBhZGFwdG9yXHJcblx0XHR0aGlzLl9hZGFwdG9yLnJlbW92ZShpZCwgRGF0ZS5ub3coKSk7XHJcblxyXG5cdFx0Ly8gcHJvcG9nYXRlIHRoZSBjaGFuZ2VcclxuXHRcdHRoaXMuZW1pdChcImNoYW5nZVwiLCB7XHJcblx0XHRcdHR5cGU6IFwicmVtb3ZlXCIsXHJcblx0XHRcdGlkXHJcblx0XHR9KTtcclxuXHR9XHJcbn1cclxuXHJcbm1vZHVsZS5leHBvcnRzID0gUG9vbFN0b3JlO1xyXG4iLCIvKipcclxuICogQSB3cmFwcGVyIHRoYXQgc3luY3Jvbml6ZXMgbG9jYWwgY2hhbmdlcyB3aXRoIGEgcmVtb3RlIGhvc3RcclxuICovXHJcblxyXG52YXIgS2V5VmFsdWVTdG9yZSA9IHJlcXVpcmUoXCIuL2tleS12YWx1ZS1zdG9yZVwiKTtcclxudmFyIEV2ZW50RW1pdHRlciA9IHJlcXVpcmUoXCIuLi91dGlsL2V2ZW50LWVtaXR0ZXJcIik7XHJcblxyXG5jbGFzcyBTeW5jZXIgZXh0ZW5kcyBFdmVudEVtaXR0ZXIge1xyXG5cdGNvbnN0cnVjdG9yKG9wdHMpIHtcclxuXHRcdHN1cGVyKCk7XHJcblxyXG5cdFx0dGhpcy5fbG9jYWwgPSBvcHRzLmxvY2FsO1xyXG5cdFx0dGhpcy5fcmVtb3RlID0gb3B0cy5yZW1vdGU7XHJcblx0XHR0aGlzLl9jaGFuZ2VTdG9yZSA9IG5ldyBLZXlWYWx1ZVN0b3JlKG9wdHMuY2hhbmdlU3RvcmUpO1xyXG5cdFx0dGhpcy5fY2hhbmdlc05hbWUgPSBvcHRzLmNoYW5nZXNOYW1lIHx8IFwiY2hhbmdlc1wiO1xyXG5cclxuXHRcdC8vIHNhdmUgYWxsIHRoZSBpZHMgdG8gb3B0aW1pemUgY3JlYXRlc1xyXG5cdFx0dGhpcy5faWRzID0gdGhpcy5nZXRBbGwoKVxyXG5cdFx0XHQudGhlbihhbGwgPT4gYWxsLm1hcCh2YWx1ZSA9PiB2YWx1ZS5pZCkpO1xyXG5cdH1cclxuXHJcblx0Ly8gcGFzcyB0aHJvdWdoIGdldCBhbmQgZ2V0QWxsXHJcblx0Z2V0QWxsKCkgeyByZXR1cm4gdGhpcy5fbG9jYWwuZ2V0QWxsKCk7IH1cclxuXHRnZXQoa2V5KSB7IHJldHVybiB0aGlzLl9sb2NhbC5nZXQoa2V5KTsgfVxyXG5cclxuXHQvLyBrZWVwIHRyYWNrIG9mIGFueSBjcmVhdGVkIHZhbHVlc1xyXG5cdHNldCh2YWx1ZSkge1xyXG5cdFx0Ly8gY2hlY2sgaWYgdGhpcyBpcyBhIGNyZWF0ZVxyXG5cdFx0dGhpcy5faWRzID0gdGhpcy5faWRzLnRoZW4oaWRzID0+IHtcclxuXHRcdFx0Ly8gbmV3IHZhbHVlXHJcblx0XHRcdGlmKGlkcy5pbmRleE9mKHZhbHVlLmlkKSA9PT0gLTEpIHtcclxuXHRcdFx0XHRpZHMucHVzaCh2YWx1ZS5pZCk7XHJcblxyXG5cdFx0XHRcdC8vIHNhdmUgdGhlIGNoYW5nZVxyXG5cdFx0XHRcdHRoaXMuX2NoYW5nZShcImNyZWF0ZVwiLCB2YWx1ZS5pZCk7XHJcblx0XHRcdH1cclxuXHJcblx0XHRcdHJldHVybiBpZHM7XHJcblx0XHR9KTtcclxuXHJcblx0XHQvLyBzdG9yZSB0aGUgdmFsdWVcclxuXHRcdHJldHVybiB0aGlzLl9pZHMudGhlbigoKSA9PiB0aGlzLl9sb2NhbC5zZXQodmFsdWUpKTtcclxuXHR9XHJcblxyXG5cdC8vIGtlZXAgdHJhY2sgb2YgZGVsZXRlZCB2YWx1ZXNcclxuXHRyZW1vdmUoa2V5KSB7XHJcblx0XHR0aGlzLl9pZHMgPSB0aGlzLl9pZHMudGhlbihpZHMgPT4ge1xyXG5cdFx0XHQvLyByZW1vdmUgdGhpcyBmcm9tIHRoZSBhbGwgaWRzIGxpc3RcclxuXHRcdFx0dmFyIGluZGV4ID0gaWRzLmluZGV4T2Yoa2V5KTtcclxuXHJcblx0XHRcdGlmKGluZGV4ICE9PSAtMSkge1xyXG5cdFx0XHRcdGlkcy5zcGxpY2UoaW5kZXgsIDEpO1xyXG5cdFx0XHR9XHJcblxyXG5cdFx0XHQvLyBzYXZlIHRoZSBjaGFuZ2VcclxuXHRcdFx0dGhpcy5fY2hhbmdlKFwicmVtb3ZlXCIsIGtleSk7XHJcblx0XHR9KTtcclxuXHJcblx0XHQvLyByZW1vdmUgdGhlIGFjdHVhbCB2YWx1ZVxyXG5cdFx0cmV0dXJuIHRoaXMuX2lkcy50aGVuKCgpID0+IHRoaXMuX2xvY2FsLnJlbW92ZShrZXkpKTtcclxuXHR9XHJcblxyXG5cdC8vIHN0b3JlIGEgY2hhbmdlIGluIHRoZSBjaGFuZ2Ugc3RvcmVcclxuXHRfY2hhbmdlKHR5cGUsIGlkKSB7XHJcblx0XHQvLyBnZXQgdGhlIGNoYW5nZXNcclxuXHRcdHRoaXMuX2NoYW5nZVN0b3JlLmdldCh0aGlzLl9jaGFuZ2VzTmFtZSwgW10pXHJcblxyXG5cdFx0LnRoZW4oY2hhbmdlcyA9PiB7XHJcblx0XHRcdC8vIGFkZCB0aGUgY2hhbmdlXHJcblx0XHRcdGNoYW5nZXMucHVzaCh7IHR5cGUsIGlkLCB0aW1lc3RhbXA6IERhdGUubm93KCkgfSk7XHJcblxyXG5cdFx0XHQvLyBzYXZlIHRoZSBjaGFuZ2VzXHJcblx0XHRcdHJldHVybiB0aGlzLl9jaGFuZ2VTdG9yZS5zZXQodGhpcy5fY2hhbmdlc05hbWUsIGNoYW5nZXMpO1xyXG5cdFx0fSk7XHJcblx0fVxyXG5cclxuXHQvLyBzeW5jIHRoZSB0d28gc3RvcmVzXHJcblx0c3luYygpIHtcclxuXHRcdC8vIG9ubHkgcnVuIG9uZSBzeW5jIGF0IGEgdGltZVxyXG5cdFx0aWYodGhpcy5fc3luY2luZykgcmV0dXJuIHRoaXMuX3N5bmNpbmc7XHJcblxyXG5cdFx0dmFyIHJldHJ5Q291bnQgPSAzO1xyXG5cdFx0dmFyICRzeW5jID0gbmV3IFN5bmModGhpcy5fbG9jYWwsIHRoaXMuX3JlbW90ZSwgdGhpcy5fY2hhbmdlU3RvcmUsIHRoaXMuX2NoYW5nZXNOYW1lKTtcclxuXHJcblx0XHQvLyBwYXNzIG9uIHRoZSBwcm9ncmVzc1xyXG5cdFx0dmFyIHN1YiA9ICRzeW5jLm9uKFwicHJvZ3Jlc3NcIiwgdmFsdWUgPT4gdGhpcy5lbWl0KFwicHJvZ3Jlc3NcIiwgdmFsdWUpKTtcclxuXHJcblx0XHR2YXIgc3luYyA9ICgpID0+IHtcclxuXHRcdFx0Ly8gdGVsbCB0aGUgdWkgd2UgYXJlIHN5bmNpbmdcclxuXHRcdFx0dGhpcy5lbWl0KFwic3luYy1zdGFydFwiKTtcclxuXHJcblx0XHRcdC8vIGF0dGVtcHQgdG8gc3luY1xyXG5cdFx0XHRyZXR1cm4gJHN5bmMuc3luYygpXHJcblxyXG5cdFx0XHQudGhlbigoKSA9PiB7XHJcblx0XHRcdFx0Ly8gdGhlIHRoZSB1aSB0aGUgc3luYyBoYXMgc3VjY2VlZGVkXHJcblx0XHRcdFx0dGhpcy5lbWl0KFwic3luYy1jb21wbGV0ZVwiLCB7IGZhaWxlZDogZmFsc2UgfSk7XHJcblx0XHRcdH0pXHJcblxyXG5cdFx0XHQuY2F0Y2goZXJyID0+IHtcclxuXHRcdFx0XHR2YXIgcmV0cnlpbmcgPSByZXRyeUNvdW50LS0gPiAwICYmICh0eXBlb2YgbmF2aWdhdG9yICE9IFwib2JqZWN0XCIgfHwgbmF2aWdhdG9yLm9uTGluZSk7XHJcblxyXG5cdFx0XHRcdC8vIHRlbGwgdGhlIHVpIHRoZSBzeW5jIGZhaWxlZFxyXG5cdFx0XHRcdHRoaXMuZW1pdChcInN5bmMtY29tcGxldGVcIiwgeyByZXRyeWluZywgZmFpbGVkOiB0cnVlIH0pO1xyXG5cclxuXHRcdFx0XHQvLyByZXRyeSBpZiBpdCBmYWlsc1xyXG5cdFx0XHRcdGlmKHJldHJ5aW5nKSB7XHJcblx0XHRcdFx0XHRyZXR1cm4gbmV3IFByb21pc2UocmVzb2x2ZSA9PiB7XHJcblx0XHRcdFx0XHRcdC8vIHdhaXQgMSBzZWNvbmRcclxuXHRcdFx0XHRcdFx0c2V0VGltZW91dCgoKSA9PiByZXNvbHZlKHN5bmMoKSksIDEwMDApO1xyXG5cdFx0XHRcdFx0fSk7XHJcblx0XHRcdFx0fVxyXG5cdFx0XHR9KTtcclxuXHRcdH07XHJcblxyXG5cdFx0Ly8gc3RhcnQgdGhlIHN5bmNcclxuXHRcdHRoaXMuX3N5bmNpbmcgPSBzeW5jKClcclxuXHJcblx0XHQvLyByZWxlYXNlIHRoZSBsb2NrXHJcblx0XHQudGhlbigoKSA9PiB7XHJcblx0XHRcdHRoaXMuX3N5bmNpbmcgPSB1bmRlZmluZWQ7XHJcblx0XHRcdHN1Yi51bnN1YnNjcmliZSgpO1xyXG5cdFx0fSk7XHJcblxyXG5cdFx0cmV0dXJuIHRoaXMuX3N5bmNpbmc7XHJcblx0fVxyXG5cclxuXHQvLyBnZXQgdGhlIHJlbW90ZSBhY2Nlc3MgbGV2ZWxcclxuXHRhY2Nlc3NMZXZlbCgpIHtcclxuXHRcdHJldHVybiB0aGlzLl9yZW1vdGUuYWNjZXNzTGV2ZWwoKVxyXG5cclxuXHRcdC8vIGlmIGFueXRoaW5nIGdvZXMgd3JvbmcgYXNzdW1lIGZ1bGwgcGVybWlzc2lvbnNcclxuXHRcdC5jYXRjaCgoKSA9PiBcImZ1bGxcIik7XHJcblx0fVxyXG59XHJcblxyXG4vLyBhIHNpbmdsZSBzeW5jXHJcbmNsYXNzIFN5bmMgZXh0ZW5kcyBFdmVudEVtaXR0ZXIge1xyXG5cdGNvbnN0cnVjdG9yKGxvY2FsLCByZW1vdGUsIGNoYW5nZVN0b3JlLCBjaGFuZ2VzTmFtZSkge1xyXG5cdFx0c3VwZXIoKTtcclxuXHRcdHRoaXMuX2xvY2FsID0gbG9jYWw7XHJcblx0XHR0aGlzLl9yZW1vdGUgPSByZW1vdGU7XHJcblx0XHR0aGlzLl9jaGFuZ2VTdG9yZSA9IGNoYW5nZVN0b3JlO1xyXG5cdFx0dGhpcy5fY2hhbmdlc05hbWUgPSBjaGFuZ2VzTmFtZTtcclxuXHRcdHRoaXMuX3Byb2dyZXNzID0gMDtcclxuXHR9XHJcblxyXG5cdHN0ZXBQcm9ncmVzcygpIHtcclxuXHRcdHRoaXMuX3Byb2dyZXNzICs9IDEgLyA3O1xyXG5cclxuXHRcdHRoaXMuZW1pdChcInByb2dyZXNzXCIsIHRoaXMuX3Byb2dyZXNzKTtcclxuXHR9XHJcblxyXG5cdHN5bmMoKSB7XHJcblx0XHR0aGlzLnN0ZXBQcm9ncmVzcygpO1xyXG5cclxuXHRcdC8vIGdldCB0aGUgaWRzIGFuZCBsYXN0IG1vZGlmaWVkIGRhdGVzIGZvciBhbGwgcmVtb3RlIHZhbHVlc1xyXG5cdFx0cmV0dXJuIHRoaXMuZ2V0TW9kaWZpZWRzKClcclxuXHJcblx0XHQudGhlbihtb2RpZmllZHMgPT4ge1xyXG5cdFx0XHR0aGlzLnN0ZXBQcm9ncmVzcygpO1xyXG5cclxuXHRcdFx0Ly8gcmVtb3ZlIHRoZSB2YWx1ZXMgd2UgZGVsZXRlZCBmcm9tIHRoZSByZW1vdGUgaG9zdFxyXG5cdFx0XHRyZXR1cm4gdGhpcy5yZW1vdmUobW9kaWZpZWRzKVxyXG5cclxuXHRcdFx0Ly8gbWVyZ2UgbW9kaWZpZWQgdmFsdWVzXHJcblx0XHRcdC50aGVuKCgpID0+IHtcclxuXHRcdFx0XHR0aGlzLnN0ZXBQcm9ncmVzcygpO1xyXG5cclxuXHRcdFx0XHRyZXR1cm4gdGhpcy5tZXJnZU1vZGlmaWVkcyhtb2RpZmllZHMpO1xyXG5cdFx0XHR9KTtcclxuXHRcdH0pXHJcblxyXG5cdFx0LnRoZW4ocmVtb3RlRGVsZXRlcyA9PiB7XHJcblx0XHRcdHRoaXMuc3RlcFByb2dyZXNzKCk7XHJcblxyXG5cdFx0XHQvLyBzZW5kIHZhbHVlcyB3ZSBjcmVhdGVkIHNpbmNlIHRoZSBsYXN0IHN5bmNcclxuXHRcdFx0cmV0dXJuIHRoaXMuY3JlYXRlKHJlbW90ZURlbGV0ZXMpXHJcblxyXG5cdFx0XHQvLyByZW1vdmUgYW55IGl0ZW1zIHRoYXQgd2hlcmUgZGVsZXRlZCByZW1vdGx5XHJcblx0XHRcdC50aGVuKCgpID0+IHtcclxuXHRcdFx0XHR0aGlzLnN0ZXBQcm9ncmVzcygpO1xyXG5cclxuXHRcdFx0XHRyZXR1cm4gdGhpcy5hcHBseURlbGV0ZXMocmVtb3RlRGVsZXRlcyk7XHJcblx0XHRcdH0pO1xyXG5cdFx0fSlcclxuXHJcblx0XHQvLyBjbGVhciB0aGUgY2hhbmdlc1xyXG5cdFx0LnRoZW4oKCkgPT4ge1xyXG5cdFx0XHR0aGlzLnN0ZXBQcm9ncmVzcygpO1xyXG5cclxuXHRcdFx0cmV0dXJuIHRoaXMuX2NoYW5nZVN0b3JlLnNldCh0aGlzLl9jaGFuZ2VzTmFtZSwgW10pO1xyXG5cdFx0fSlcclxuXHJcblx0XHQudGhlbigoKSA9PiB7XHJcblx0XHRcdHRoaXMuc3RlcFByb2dyZXNzKCk7XHJcblx0XHR9KTtcclxuXHR9XHJcblxyXG5cdC8vIGdldCB0aGUgbGFzdCBtb2RpZmllZCB0aW1lcyBmb3IgZWFjaCB2YWx1ZVxyXG5cdGdldE1vZGlmaWVkcygpIHtcclxuXHRcdHRoaXMuX2l0ZW1zID0ge307XHJcblxyXG5cdFx0cmV0dXJuIHRoaXMuX3JlbW90ZS5nZXRBbGwoKVxyXG5cclxuXHRcdC50aGVuKHZhbHVlcyA9PiB7XHJcblx0XHRcdHZhciBtb2RpZmllZHMgPSB7fTtcclxuXHJcblx0XHRcdGZvcihsZXQgdmFsdWUgb2YgdmFsdWVzKSB7XHJcblx0XHRcdFx0Ly8gc3RvcmUgdGhlIGl0ZW1zXHJcblx0XHRcdFx0dGhpcy5faXRlbXNbdmFsdWUuaWRdID0gdmFsdWU7XHJcblx0XHRcdFx0Ly8gZ2V0IHRoZSBtb2RpZmllZCB0aW1lc1xyXG5cdFx0XHRcdG1vZGlmaWVkc1t2YWx1ZS5pZF0gPSB2YWx1ZS5tb2RpZmllZDtcclxuXHRcdFx0fVxyXG5cclxuXHRcdFx0cmV0dXJuIG1vZGlmaWVkcztcclxuXHRcdH0pO1xyXG5cdH1cclxuXHJcblx0Ly8gcmVtb3ZlIHZhbHVlcyB3ZSBoYXZlIGRlbGV0ZWQgc2luY2UgdGhlIGxhc3Qgc3luY1xyXG5cdHJlbW92ZShtb2RpZmllZHMpIHtcclxuXHRcdHJldHVybiB0aGlzLl9jaGFuZ2VTdG9yZS5nZXQodGhpcy5fY2hhbmdlc05hbWUsIFtdKVxyXG5cclxuXHRcdC50aGVuKGNoYW5nZXMgPT4ge1xyXG5cdFx0XHR2YXIgcHJvbWlzZXMgPSBbXTtcclxuXHJcblx0XHRcdC8vIHJlbW92ZSB0aGUgaXRlbXMgd2UgcmVtb3ZlIGZyb20gbW9kaWZpZWRzXHJcblx0XHRcdGZvcihsZXQgY2hhbmdlIG9mIGNoYW5nZXMpIHtcclxuXHRcdFx0XHRpZihjaGFuZ2UudHlwZSA9PSBcInJlbW92ZVwiICYmIGNoYW5nZS50aW1lc3RhbXAgPj0gbW9kaWZpZWRzW2NoYW5nZS5pZF0pIHtcclxuXHRcdFx0XHRcdC8vIGRvbid0IHRyeSB0byBjcmVhdGUgdGhlIGl0ZW0gbG9jYWxseVxyXG5cdFx0XHRcdFx0ZGVsZXRlIG1vZGlmaWVkc1tjaGFuZ2UuaWRdO1xyXG5cclxuXHRcdFx0XHRcdC8vIGRlbGV0ZSBpdCByZW1vdGVseVxyXG5cdFx0XHRcdFx0cHJvbWlzZXMucHVzaCh0aGlzLl9yZW1vdGUucmVtb3ZlKGNoYW5nZS5pZCkpXHJcblx0XHRcdFx0fVxyXG5cdFx0XHR9XHJcblxyXG5cdFx0XHRyZXR1cm4gUHJvbWlzZS5hbGwocHJvbWlzZXMpO1xyXG5cdFx0fSk7XHJcblx0fVxyXG5cclxuXHQvLyB1cGRhdGUgdGhlIGxvY2FsL3JlbW90ZSB2YWx1ZXMgdGhhdCB3aGVyZSBjaGFuZ2VkXHJcblx0bWVyZ2VNb2RpZmllZHMobW9kaWZpZWRzKSB7XHJcblx0XHR2YXIgcmVtb3RlRGVsZXRlcyA9IFtdO1xyXG5cclxuXHRcdC8vIGdvIHRocm91Z2ggYWxsIHRoZSBtb2RpZmllZHNcclxuXHRcdHJldHVybiB0aGlzLl9sb2NhbC5nZXRBbGwoKVxyXG5cclxuXHRcdC50aGVuKHZhbHVlcyA9PiB7XHJcblx0XHRcdHZhciBwcm9taXNlcyA9IFtdO1xyXG5cclxuXHRcdFx0Ly8gY2hlY2sgYWxsIHRoZSBsb2NhbCB2YWx1ZXMgYWdhaW5zdCB0aGUgcmVtb3RlIG9uZXNcclxuXHRcdFx0Zm9yKGxldCB2YWx1ZSBvZiB2YWx1ZXMpIHtcclxuXHRcdFx0XHQvLyBkZWxldGVkIGZyb20gdGhlIHJlbW90ZSBhZGFwdG9yXHJcblx0XHRcdFx0aWYoIW1vZGlmaWVkc1t2YWx1ZS5pZF0pIHtcclxuXHRcdFx0XHRcdHJlbW90ZURlbGV0ZXMucHVzaCh2YWx1ZS5pZCk7XHJcblx0XHRcdFx0fVxyXG5cdFx0XHRcdC8vIHRoZSByZW1vdGUgdmVyc2lvbiBpcyBuZXdlclxyXG5cdFx0XHRcdGVsc2UgaWYobW9kaWZpZWRzW3ZhbHVlLmlkXSA+IHZhbHVlLm1vZGlmaWVkKSB7XHJcblx0XHRcdFx0XHRwcm9taXNlcy5wdXNoKFxyXG5cdFx0XHRcdFx0XHQvLyBmZXRjaCB0aGUgcmVtb3RlIHZhbHVlXHJcblx0XHRcdFx0XHRcdHRoaXMuZ2V0KHZhbHVlLmlkKVxyXG5cclxuXHRcdFx0XHRcdFx0LnRoZW4obmV3VmFsdWUgPT4gdGhpcy5fbG9jYWwuc2V0KG5ld1ZhbHVlKSlcclxuXHRcdFx0XHRcdCk7XHJcblx0XHRcdFx0fVxyXG5cdFx0XHRcdC8vIHRoZSBsb2NhbCB2ZXJzaW9uIGlzIG5ld2VyXHJcblx0XHRcdFx0ZWxzZSBpZihtb2RpZmllZHNbdmFsdWUuaWRdIDwgdmFsdWUubW9kaWZpZWQpIHtcclxuXHRcdFx0XHRcdHByb21pc2VzLnB1c2godGhpcy5fcmVtb3RlLnNldCh2YWx1ZSkpO1xyXG5cdFx0XHRcdH1cclxuXHJcblx0XHRcdFx0Ly8gcmVtb3ZlIGl0ZW1zIHdlIGFscmVhZHkgaGF2ZSBmcm9tIHRoZSBjcmVhdGVzXHJcblx0XHRcdFx0aWYobW9kaWZpZWRzW3ZhbHVlLmlkXSkge1xyXG5cdFx0XHRcdFx0ZGVsZXRlIG1vZGlmaWVkc1t2YWx1ZS5pZF07XHJcblx0XHRcdFx0fVxyXG5cdFx0XHR9XHJcblxyXG5cdFx0XHQvLyBnZXQgdmFsdWVzIGZyb20gdGhlIHJlbW90ZSB3ZSBhcmUgbWlzc2luZ1xyXG5cdFx0XHRmb3IobGV0IGlkIG9mIE9iamVjdC5nZXRPd25Qcm9wZXJ0eU5hbWVzKG1vZGlmaWVkcykpIHtcclxuXHRcdFx0XHRwcm9taXNlcy5wdXNoKFxyXG5cdFx0XHRcdFx0dGhpcy5nZXQoaWQpXHJcblxyXG5cdFx0XHRcdFx0LnRoZW4obmV3VmFsdWUgPT4gdGhpcy5fbG9jYWwuc2V0KG5ld1ZhbHVlKSlcclxuXHRcdFx0XHQpO1xyXG5cdFx0XHR9XHJcblxyXG5cdFx0XHRyZXR1cm4gUHJvbWlzZS5hbGwocHJvbWlzZXMpO1xyXG5cdFx0fSlcclxuXHJcblx0XHQvLyByZXR1cm4gdGhlIGRlbGV0ZXNcclxuXHRcdC50aGVuKCgpID0+IHJlbW90ZURlbGV0ZXMpO1xyXG5cdH1cclxuXHJcblx0Ly8gZ2V0IGEgcmVtb3RlIHZhbHVlXHJcblx0Z2V0KGlkKSB7XHJcblx0XHRyZXR1cm4gUHJvbWlzZS5yZXNvbHZlKHRoaXMuX2l0ZW1zW2lkXSk7XHJcblx0fVxyXG5cclxuXHQvLyBzZW5kIGNyZWF0ZWQgdmFsdWVzIHRvIHRoZSBzZXJ2ZXJcclxuXHRjcmVhdGUocmVtb3RlRGVsZXRlcykge1xyXG5cdFx0cmV0dXJuIHRoaXMuX2NoYW5nZVN0b3JlLmdldCh0aGlzLl9jaGFuZ2VzTmFtZSlcclxuXHJcblx0XHQudGhlbigoY2hhbmdlcyA9IFtdKSA9PiB7XHJcblx0XHRcdHZhciBwcm9taXNlcyA9IFtdO1xyXG5cclxuXHRcdFx0Ly8gcmVtb3ZlIHRoZSBpdGVtcyB3ZSByZW1vdmUgZnJvbSBtb2RpZmllZHNcclxuXHRcdFx0Zm9yKGxldCBjaGFuZ2Ugb2YgY2hhbmdlcykge1xyXG5cdFx0XHRcdGlmKGNoYW5nZS50eXBlID09IFwiY3JlYXRlXCIpIHtcclxuXHRcdFx0XHRcdC8vIGlmIHdlIG1hcmtlZCB0aGlzIHZhbHVlIGFzIGEgZGVsZXRlIHVuZG8gdGhhdFxyXG5cdFx0XHRcdFx0bGV0IGluZGV4ID0gcmVtb3RlRGVsZXRlcy5pbmRleE9mKGNoYW5nZS5pZCk7XHJcblxyXG5cdFx0XHRcdFx0aWYoaW5kZXggIT09IC0xKSB7XHJcblx0XHRcdFx0XHRcdHJlbW90ZURlbGV0ZXMuc3BsaWNlKGluZGV4LCAxKTtcclxuXHRcdFx0XHRcdH1cclxuXHJcblx0XHRcdFx0XHQvLyBzYXZlIHRoZSB2YWx1ZSB0byB0aGUgcmVtb3RlXHJcblx0XHRcdFx0XHRwcm9taXNlcy5wdXNoKFxyXG5cdFx0XHRcdFx0XHR0aGlzLl9sb2NhbC5nZXQoY2hhbmdlLmlkKVxyXG5cclxuXHRcdFx0XHRcdFx0LnRoZW4odmFsdWUgPT4gdGhpcy5fcmVtb3RlLnNldCh2YWx1ZSkpXHJcblx0XHRcdFx0XHQpO1xyXG5cdFx0XHRcdH1cclxuXHRcdFx0fVxyXG5cclxuXHRcdFx0cmV0dXJuIFByb21pc2UuYWxsKHByb21pc2VzKTtcclxuXHRcdH0pO1xyXG5cdH1cclxuXHJcblx0Ly8gZGVsZXRlIHZhbHVlcyB0aGF0IHdoZXJlIGRlbGV0ZWQgZnJvbSB0aGUgcmVtb3RlIGhvc3RcclxuXHRhcHBseURlbGV0ZXMocmVtb3RlRGVsZXRlcykge1xyXG5cdFx0cmV0dXJuIFByb21pc2UuYWxsKHJlbW90ZURlbGV0ZXMubWFwKGlkID0+IHRoaXMuX2xvY2FsLnJlbW92ZShpZCkpKTtcclxuXHR9XHJcbn1cclxuXHJcbm1vZHVsZS5leHBvcnRzID0gU3luY2VyO1xyXG4iLCIvKipcclxuICogQ3JlYXRlIGEgZ2xvYmFsIG9iamVjdCB3aXRoIGNvbW1vbmx5IHVzZWQgbW9kdWxlcyB0byBhdm9pZCA1MCBtaWxsaW9uIHJlcXVpcmVzXHJcbiAqL1xyXG5cclxudmFyIEV2ZW50RW1pdHRlciA9IHJlcXVpcmUoXCIuL3V0aWwvZXZlbnQtZW1pdHRlclwiKTtcclxuXHJcbnZhciBsaWZlTGluZSA9IG5ldyBFdmVudEVtaXR0ZXIoKTtcclxuXHJcbi8vIGF0dGFjaCB1dGlsc1xyXG5saWZlTGluZS5EaXNwb3NhYmxlID0gcmVxdWlyZShcIi4vdXRpbC9kaXNwb3NhYmxlXCIpO1xyXG5saWZlTGluZS5FdmVudEVtaXR0ZXIgPSBFdmVudEVtaXR0ZXI7XHJcblxyXG4vLyBhdHRhY2ggbGlmZWxpbmUgdG8gdGhlIGdsb2JhbCBvYmplY3RcclxuKHR5cGVvZiB3aW5kb3cgPT0gXCJvYmplY3RcIiA/IHdpbmRvdyA6IHNlbGYpLmxpZmVMaW5lID0gbGlmZUxpbmU7XHJcbiIsIi8qKlxyXG4gKiBLZWVwIGEgbGlzdCBvZiBzdWJzY3JpcHRpb25zIHRvIHVuc3Vic2NyaWJlIGZyb20gdG9nZXRoZXJcclxuICovXHJcblxyXG5jbGFzcyBEaXNwb3NhYmxlIHtcclxuXHRjb25zdHJ1Y3RvcigpIHtcclxuXHRcdHRoaXMuX3N1YnNjcmlwdGlvbnMgPSBbXTtcclxuXHR9XHJcblxyXG5cdC8vIFVuc3Vic2NyaWJlIGZyb20gYWxsIHN1YnNjcmlwdGlvbnNcclxuXHRkaXNwb3NlKCkge1xyXG5cdFx0Ly8gcmVtb3ZlIHRoZSBmaXJzdCBzdWJzY3JpcHRpb24gdW50aWwgdGhlcmUgYXJlIG5vbmUgbGVmdFxyXG5cdFx0d2hpbGUodGhpcy5fc3Vic2NyaXB0aW9ucy5sZW5ndGggPiAwKSB7XHJcblx0XHRcdHRoaXMuX3N1YnNjcmlwdGlvbnMuc2hpZnQoKS51bnN1YnNjcmliZSgpO1xyXG5cdFx0fVxyXG5cdH1cclxuXHJcblx0Ly8gQWRkIGEgc3Vic2NyaXB0aW9uIHRvIHRoZSBkaXNwb3NhYmxlXHJcblx0YWRkKHN1YnNjcmlwdGlvbikge1xyXG5cdFx0dGhpcy5fc3Vic2NyaXB0aW9ucy5wdXNoKHN1YnNjcmlwdGlvbik7XHJcblx0fVxyXG5cclxuXHQvLyBkaXNwb3NlIHdoZW4gYW4gZXZlbnQgaXMgZmlyZWRcclxuXHRkaXNwb3NlT24oZW1pdHRlciwgZXZlbnQpIHtcclxuXHRcdHRoaXMuYWRkKGVtaXR0ZXIub24oZXZlbnQsICgpID0+IHRoaXMuZGlzcG9zZSgpKSk7XHJcblx0fVxyXG59O1xyXG5cclxubW9kdWxlLmV4cG9ydHMgPSBEaXNwb3NhYmxlO1xyXG4iLCIvKipcclxuICogQSBiYXNpYyBldmVudCBlbWl0dGVyXHJcbiAqL1xyXG5cclxuY2xhc3MgRXZlbnRFbWl0dGVyIHtcclxuXHRjb25zdHJ1Y3RvcigpIHtcclxuXHRcdHRoaXMuX2xpc3RlbmVycyA9IHt9O1xyXG5cdH1cclxuXHJcblx0LyoqXHJcblx0ICogQWRkIGFuIGV2ZW50IGxpc3RlbmVyXHJcblx0ICovXHJcblx0b24obmFtZSwgbGlzdGVuZXIpIHtcclxuXHRcdC8vIGlmIHdlIGRvbid0IGhhdmUgYW4gZXhpc3RpbmcgbGlzdGVuZXJzIGFycmF5IGNyZWF0ZSBvbmVcclxuXHRcdGlmKCF0aGlzLl9saXN0ZW5lcnNbbmFtZV0pIHtcclxuXHRcdFx0dGhpcy5fbGlzdGVuZXJzW25hbWVdID0gW107XHJcblx0XHR9XHJcblxyXG5cdFx0Ly8gYWRkIHRoZSBsaXN0ZW5lclxyXG5cdFx0dGhpcy5fbGlzdGVuZXJzW25hbWVdLnB1c2gobGlzdGVuZXIpO1xyXG5cclxuXHRcdC8vIGdpdmUgdGhlbSBhIHN1YnNjcmlwdGlvblxyXG5cdFx0cmV0dXJuIHtcclxuXHRcdFx0X2xpc3RlbmVyOiBsaXN0ZW5lcixcclxuXHJcblx0XHRcdHVuc3Vic2NyaWJlOiAoKSA9PiB7XHJcblx0XHRcdFx0Ly8gZmluZCB0aGUgbGlzdGVuZXJcclxuXHRcdFx0XHR2YXIgaW5kZXggPSB0aGlzLl9saXN0ZW5lcnNbbmFtZV0uaW5kZXhPZihsaXN0ZW5lcik7XHJcblxyXG5cdFx0XHRcdGlmKGluZGV4ICE9PSAtMSkge1xyXG5cdFx0XHRcdFx0dGhpcy5fbGlzdGVuZXJzW25hbWVdLnNwbGljZShpbmRleCwgMSk7XHJcblx0XHRcdFx0fVxyXG5cdFx0XHR9XHJcblx0XHR9O1xyXG5cdH1cclxuXHJcblx0LyoqXHJcblx0ICogRW1pdCBhbiBldmVudFxyXG5cdCAqL1xyXG5cdGVtaXQobmFtZSwgLi4uYXJncykge1xyXG5cdFx0Ly8gY2hlY2sgZm9yIGxpc3RlbmVyc1xyXG5cdFx0aWYodGhpcy5fbGlzdGVuZXJzW25hbWVdKSB7XHJcblx0XHRcdGZvcihsZXQgbGlzdGVuZXIgb2YgdGhpcy5fbGlzdGVuZXJzW25hbWVdKSB7XHJcblx0XHRcdFx0Ly8gY2FsbCB0aGUgbGlzdGVuZXJzXHJcblx0XHRcdFx0bGlzdGVuZXIoLi4uYXJncyk7XHJcblx0XHRcdH1cclxuXHRcdH1cclxuXHR9XHJcblxyXG5cdC8qKlxyXG5cdCAqIEVtaXQgYW4gZXZlbnQgYW5kIHNraXAgc29tZSBsaXN0ZW5lcnNcclxuXHQgKi9cclxuXHRwYXJ0aWFsRW1pdChuYW1lLCBza2lwcyA9IFtdLCAuLi5hcmdzKSB7XHJcblx0XHQvLyBhbGxvdyBhIHNpbmdsZSBpdGVtXHJcblx0XHRpZighQXJyYXkuaXNBcnJheShza2lwcykpIHtcclxuXHRcdFx0c2tpcHMgPSBbc2tpcHNdO1xyXG5cdFx0fVxyXG5cclxuXHRcdC8vIGNoZWNrIGZvciBsaXN0ZW5lcnNcclxuXHRcdGlmKHRoaXMuX2xpc3RlbmVyc1tuYW1lXSkge1xyXG5cdFx0XHRmb3IobGV0IGxpc3RlbmVyIG9mIHRoaXMuX2xpc3RlbmVyc1tuYW1lXSkge1xyXG5cdFx0XHRcdC8vIHRoaXMgZXZlbnQgbGlzdGVuZXIgaXMgYmVpbmcgc2tpcGVkXHJcblx0XHRcdFx0aWYoc2tpcHMuZmluZChza2lwID0+IHNraXAuX2xpc3RlbmVyID09IGxpc3RlbmVyKSkge1xyXG5cdFx0XHRcdFx0Y29udGludWU7XHJcblx0XHRcdFx0fVxyXG5cclxuXHRcdFx0XHQvLyBjYWxsIHRoZSBsaXN0ZW5lcnNcclxuXHRcdFx0XHRsaXN0ZW5lciguLi5hcmdzKTtcclxuXHRcdFx0fVxyXG5cdFx0fVxyXG5cdH1cclxufVxyXG5cclxubW9kdWxlLmV4cG9ydHMgPSBFdmVudEVtaXR0ZXI7XHJcbiJdfQ==
