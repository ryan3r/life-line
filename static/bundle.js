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

},{"idb":2}],4:[function(require,module,exports){
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

},{"../../common/backup":24}],11:[function(require,module,exports){
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

				// sync the change
				lifeLine.sync();
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
				Tomorrow: [],
				Upcomming: []
			};

			// today and tomorrows dates
			var today = new Date();
			var tomorrow = daysFromNow(1);

			// sort by date
			data.sort(function (a, b) {
				if (a.type == "assignment" && b.type == "assignment") {
					return a.date.getTime() - b.date.getTime();
				}
			});

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
						// add upcomming items
						else if (groups.Upcomming.length < 5) {
								groups.Upcomming.push(createUi(item));
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
				if (json.status == "error") {
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
"use strict";

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
"use strict";

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
}(EventEmitter);

module.exports = PoolStore;

},{"../util/event-emitter":31}],28:[function(require,module,exports){
"use strict";

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
								_this10.get(value.id).then(function (newValue) {
									return _this10._local.set(newValue);
								}));
							}
							// the local version is newer
							else if (modifieds[value.id] < value.modified) {
									promises.push(_this10._remote.set(value));
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
"use strict";

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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCJub2RlX21vZHVsZXMvYnJvd3NlcmlmeS9saWIvX2VtcHR5LmpzIiwibm9kZV9tb2R1bGVzL2lkYi9saWIvaWRiLmpzIiwic3JjXFxjbGllbnRcXGRhdGEtc3RvcmVzXFxpZGItYWRhcHRvci5qcyIsInNyY1xcY2xpZW50XFxkYXRhLXN0b3Jlc1xcaW5kZXguanMiLCJzcmNcXGNsaWVudFxcZ2xvYmFsLmpzIiwic3JjXFxjbGllbnRcXGluZGV4LmpzIiwic3JjXFxjbGllbnRcXHN3LWhlbHBlci5qcyIsInNyY1xcY2xpZW50XFx1dGlsXFxkYXRlLmpzIiwic3JjXFxjbGllbnRcXHV0aWxcXGRvbS1tYWtlci5qcyIsInNyY1xcY2xpZW50XFx2aWV3c1xcYWNjb3VudC5qcyIsInNyY1xcY2xpZW50XFx2aWV3c1xcZWRpdC5qcyIsInNyY1xcY2xpZW50XFx2aWV3c1xcaXRlbS5qcyIsInNyY1xcY2xpZW50XFx2aWV3c1xcbGlzdHMuanMiLCJzcmNcXGNsaWVudFxcdmlld3NcXGxvZ2luLmpzIiwic3JjXFxjbGllbnRcXHZpZXdzXFx0b2RvLmpzIiwic3JjXFxjbGllbnRcXHZpZXdzXFx1c2Vycy5qcyIsInNyY1xcY2xpZW50XFx3aWRnZXRzXFxjb250ZW50LmpzIiwic3JjXFxjbGllbnRcXHdpZGdldHNcXGlucHV0LmpzIiwic3JjXFxjbGllbnRcXHdpZGdldHNcXGxpbmsuanMiLCJzcmNcXGNsaWVudFxcd2lkZ2V0c1xcbGlzdC5qcyIsInNyY1xcY2xpZW50XFx3aWRnZXRzXFxwcm9ncmVzcy5qcyIsInNyY1xcY2xpZW50XFx3aWRnZXRzXFxzaWRlYmFyLmpzIiwic3JjXFxjbGllbnRcXHdpZGdldHNcXHRvZ2dsZS1idG5zLmpzIiwic3JjXFxjb21tb25cXGJhY2t1cC5qcyIsInNyY1xcY29tbW9uXFxkYXRhLXN0b3Jlc1xcaHR0cC1hZGFwdG9yLmpzIiwic3JjXFxjb21tb25cXGRhdGEtc3RvcmVzXFxrZXktdmFsdWUtc3RvcmUuanMiLCJzcmNcXGNvbW1vblxcZGF0YS1zdG9yZXNcXHBvb2wtc3RvcmUuanMiLCJzcmNcXGNvbW1vblxcZGF0YS1zdG9yZXNcXHN5bmNlci5qcyIsInNyY1xcY29tbW9uXFxnbG9iYWwuanMiLCJzcmNcXGNvbW1vblxcdXRpbFxcZGlzcG9zYWJsZS5qcyIsInNyY1xcY29tbW9uXFx1dGlsXFxldmVudC1lbWl0dGVyLmpzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBO0FDQUE7O0FDQUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7Ozs7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QjtBQUNEOzs7Ozs7QUFHRixPQUFPLE9BQVAsR0FBaUIsWUFBakIiLCJmaWxlIjoiZ2VuZXJhdGVkLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXNDb250ZW50IjpbIihmdW5jdGlvbiBlKHQsbixyKXtmdW5jdGlvbiBzKG8sdSl7aWYoIW5bb10pe2lmKCF0W29dKXt2YXIgYT10eXBlb2YgcmVxdWlyZT09XCJmdW5jdGlvblwiJiZyZXF1aXJlO2lmKCF1JiZhKXJldHVybiBhKG8sITApO2lmKGkpcmV0dXJuIGkobywhMCk7dmFyIGY9bmV3IEVycm9yKFwiQ2Fubm90IGZpbmQgbW9kdWxlICdcIitvK1wiJ1wiKTt0aHJvdyBmLmNvZGU9XCJNT0RVTEVfTk9UX0ZPVU5EXCIsZn12YXIgbD1uW29dPXtleHBvcnRzOnt9fTt0W29dWzBdLmNhbGwobC5leHBvcnRzLGZ1bmN0aW9uKGUpe3ZhciBuPXRbb11bMV1bZV07cmV0dXJuIHMobj9uOmUpfSxsLGwuZXhwb3J0cyxlLHQsbixyKX1yZXR1cm4gbltvXS5leHBvcnRzfXZhciBpPXR5cGVvZiByZXF1aXJlPT1cImZ1bmN0aW9uXCImJnJlcXVpcmU7Zm9yKHZhciBvPTA7bzxyLmxlbmd0aDtvKyspcyhyW29dKTtyZXR1cm4gc30pIiwiIiwiJ3VzZSBzdHJpY3QnO1xuXG4oZnVuY3Rpb24oKSB7XG4gIGZ1bmN0aW9uIHRvQXJyYXkoYXJyKSB7XG4gICAgcmV0dXJuIEFycmF5LnByb3RvdHlwZS5zbGljZS5jYWxsKGFycik7XG4gIH1cblxuICBmdW5jdGlvbiBwcm9taXNpZnlSZXF1ZXN0KHJlcXVlc3QpIHtcbiAgICByZXR1cm4gbmV3IFByb21pc2UoZnVuY3Rpb24ocmVzb2x2ZSwgcmVqZWN0KSB7XG4gICAgICByZXF1ZXN0Lm9uc3VjY2VzcyA9IGZ1bmN0aW9uKCkge1xuICAgICAgICByZXNvbHZlKHJlcXVlc3QucmVzdWx0KTtcbiAgICAgIH07XG5cbiAgICAgIHJlcXVlc3Qub25lcnJvciA9IGZ1bmN0aW9uKCkge1xuICAgICAgICByZWplY3QocmVxdWVzdC5lcnJvcik7XG4gICAgICB9O1xuICAgIH0pO1xuICB9XG5cbiAgZnVuY3Rpb24gcHJvbWlzaWZ5UmVxdWVzdENhbGwob2JqLCBtZXRob2QsIGFyZ3MpIHtcbiAgICB2YXIgcmVxdWVzdDtcbiAgICB2YXIgcCA9IG5ldyBQcm9taXNlKGZ1bmN0aW9uKHJlc29sdmUsIHJlamVjdCkge1xuICAgICAgcmVxdWVzdCA9IG9ialttZXRob2RdLmFwcGx5KG9iaiwgYXJncyk7XG4gICAgICBwcm9taXNpZnlSZXF1ZXN0KHJlcXVlc3QpLnRoZW4ocmVzb2x2ZSwgcmVqZWN0KTtcbiAgICB9KTtcblxuICAgIHAucmVxdWVzdCA9IHJlcXVlc3Q7XG4gICAgcmV0dXJuIHA7XG4gIH1cblxuICBmdW5jdGlvbiBwcm9taXNpZnlDdXJzb3JSZXF1ZXN0Q2FsbChvYmosIG1ldGhvZCwgYXJncykge1xuICAgIHZhciBwID0gcHJvbWlzaWZ5UmVxdWVzdENhbGwob2JqLCBtZXRob2QsIGFyZ3MpO1xuICAgIHJldHVybiBwLnRoZW4oZnVuY3Rpb24odmFsdWUpIHtcbiAgICAgIGlmICghdmFsdWUpIHJldHVybjtcbiAgICAgIHJldHVybiBuZXcgQ3Vyc29yKHZhbHVlLCBwLnJlcXVlc3QpO1xuICAgIH0pO1xuICB9XG5cbiAgZnVuY3Rpb24gcHJveHlQcm9wZXJ0aWVzKFByb3h5Q2xhc3MsIHRhcmdldFByb3AsIHByb3BlcnRpZXMpIHtcbiAgICBwcm9wZXJ0aWVzLmZvckVhY2goZnVuY3Rpb24ocHJvcCkge1xuICAgICAgT2JqZWN0LmRlZmluZVByb3BlcnR5KFByb3h5Q2xhc3MucHJvdG90eXBlLCBwcm9wLCB7XG4gICAgICAgIGdldDogZnVuY3Rpb24oKSB7XG4gICAgICAgICAgcmV0dXJuIHRoaXNbdGFyZ2V0UHJvcF1bcHJvcF07XG4gICAgICAgIH0sXG4gICAgICAgIHNldDogZnVuY3Rpb24odmFsKSB7XG4gICAgICAgICAgdGhpc1t0YXJnZXRQcm9wXVtwcm9wXSA9IHZhbDtcbiAgICAgICAgfVxuICAgICAgfSk7XG4gICAgfSk7XG4gIH1cblxuICBmdW5jdGlvbiBwcm94eVJlcXVlc3RNZXRob2RzKFByb3h5Q2xhc3MsIHRhcmdldFByb3AsIENvbnN0cnVjdG9yLCBwcm9wZXJ0aWVzKSB7XG4gICAgcHJvcGVydGllcy5mb3JFYWNoKGZ1bmN0aW9uKHByb3ApIHtcbiAgICAgIGlmICghKHByb3AgaW4gQ29uc3RydWN0b3IucHJvdG90eXBlKSkgcmV0dXJuO1xuICAgICAgUHJveHlDbGFzcy5wcm90b3R5cGVbcHJvcF0gPSBmdW5jdGlvbigpIHtcbiAgICAgICAgcmV0dXJuIHByb21pc2lmeVJlcXVlc3RDYWxsKHRoaXNbdGFyZ2V0UHJvcF0sIHByb3AsIGFyZ3VtZW50cyk7XG4gICAgICB9O1xuICAgIH0pO1xuICB9XG5cbiAgZnVuY3Rpb24gcHJveHlNZXRob2RzKFByb3h5Q2xhc3MsIHRhcmdldFByb3AsIENvbnN0cnVjdG9yLCBwcm9wZXJ0aWVzKSB7XG4gICAgcHJvcGVydGllcy5mb3JFYWNoKGZ1bmN0aW9uKHByb3ApIHtcbiAgICAgIGlmICghKHByb3AgaW4gQ29uc3RydWN0b3IucHJvdG90eXBlKSkgcmV0dXJuO1xuICAgICAgUHJveHlDbGFzcy5wcm90b3R5cGVbcHJvcF0gPSBmdW5jdGlvbigpIHtcbiAgICAgICAgcmV0dXJuIHRoaXNbdGFyZ2V0UHJvcF1bcHJvcF0uYXBwbHkodGhpc1t0YXJnZXRQcm9wXSwgYXJndW1lbnRzKTtcbiAgICAgIH07XG4gICAgfSk7XG4gIH1cblxuICBmdW5jdGlvbiBwcm94eUN1cnNvclJlcXVlc3RNZXRob2RzKFByb3h5Q2xhc3MsIHRhcmdldFByb3AsIENvbnN0cnVjdG9yLCBwcm9wZXJ0aWVzKSB7XG4gICAgcHJvcGVydGllcy5mb3JFYWNoKGZ1bmN0aW9uKHByb3ApIHtcbiAgICAgIGlmICghKHByb3AgaW4gQ29uc3RydWN0b3IucHJvdG90eXBlKSkgcmV0dXJuO1xuICAgICAgUHJveHlDbGFzcy5wcm90b3R5cGVbcHJvcF0gPSBmdW5jdGlvbigpIHtcbiAgICAgICAgcmV0dXJuIHByb21pc2lmeUN1cnNvclJlcXVlc3RDYWxsKHRoaXNbdGFyZ2V0UHJvcF0sIHByb3AsIGFyZ3VtZW50cyk7XG4gICAgICB9O1xuICAgIH0pO1xuICB9XG5cbiAgZnVuY3Rpb24gSW5kZXgoaW5kZXgpIHtcbiAgICB0aGlzLl9pbmRleCA9IGluZGV4O1xuICB9XG5cbiAgcHJveHlQcm9wZXJ0aWVzKEluZGV4LCAnX2luZGV4JywgW1xuICAgICduYW1lJyxcbiAgICAna2V5UGF0aCcsXG4gICAgJ211bHRpRW50cnknLFxuICAgICd1bmlxdWUnXG4gIF0pO1xuXG4gIHByb3h5UmVxdWVzdE1ldGhvZHMoSW5kZXgsICdfaW5kZXgnLCBJREJJbmRleCwgW1xuICAgICdnZXQnLFxuICAgICdnZXRLZXknLFxuICAgICdnZXRBbGwnLFxuICAgICdnZXRBbGxLZXlzJyxcbiAgICAnY291bnQnXG4gIF0pO1xuXG4gIHByb3h5Q3Vyc29yUmVxdWVzdE1ldGhvZHMoSW5kZXgsICdfaW5kZXgnLCBJREJJbmRleCwgW1xuICAgICdvcGVuQ3Vyc29yJyxcbiAgICAnb3BlbktleUN1cnNvcidcbiAgXSk7XG5cbiAgZnVuY3Rpb24gQ3Vyc29yKGN1cnNvciwgcmVxdWVzdCkge1xuICAgIHRoaXMuX2N1cnNvciA9IGN1cnNvcjtcbiAgICB0aGlzLl9yZXF1ZXN0ID0gcmVxdWVzdDtcbiAgfVxuXG4gIHByb3h5UHJvcGVydGllcyhDdXJzb3IsICdfY3Vyc29yJywgW1xuICAgICdkaXJlY3Rpb24nLFxuICAgICdrZXknLFxuICAgICdwcmltYXJ5S2V5JyxcbiAgICAndmFsdWUnXG4gIF0pO1xuXG4gIHByb3h5UmVxdWVzdE1ldGhvZHMoQ3Vyc29yLCAnX2N1cnNvcicsIElEQkN1cnNvciwgW1xuICAgICd1cGRhdGUnLFxuICAgICdkZWxldGUnXG4gIF0pO1xuXG4gIC8vIHByb3h5ICduZXh0JyBtZXRob2RzXG4gIFsnYWR2YW5jZScsICdjb250aW51ZScsICdjb250aW51ZVByaW1hcnlLZXknXS5mb3JFYWNoKGZ1bmN0aW9uKG1ldGhvZE5hbWUpIHtcbiAgICBpZiAoIShtZXRob2ROYW1lIGluIElEQkN1cnNvci5wcm90b3R5cGUpKSByZXR1cm47XG4gICAgQ3Vyc29yLnByb3RvdHlwZVttZXRob2ROYW1lXSA9IGZ1bmN0aW9uKCkge1xuICAgICAgdmFyIGN1cnNvciA9IHRoaXM7XG4gICAgICB2YXIgYXJncyA9IGFyZ3VtZW50cztcbiAgICAgIHJldHVybiBQcm9taXNlLnJlc29sdmUoKS50aGVuKGZ1bmN0aW9uKCkge1xuICAgICAgICBjdXJzb3IuX2N1cnNvclttZXRob2ROYW1lXS5hcHBseShjdXJzb3IuX2N1cnNvciwgYXJncyk7XG4gICAgICAgIHJldHVybiBwcm9taXNpZnlSZXF1ZXN0KGN1cnNvci5fcmVxdWVzdCkudGhlbihmdW5jdGlvbih2YWx1ZSkge1xuICAgICAgICAgIGlmICghdmFsdWUpIHJldHVybjtcbiAgICAgICAgICByZXR1cm4gbmV3IEN1cnNvcih2YWx1ZSwgY3Vyc29yLl9yZXF1ZXN0KTtcbiAgICAgICAgfSk7XG4gICAgICB9KTtcbiAgICB9O1xuICB9KTtcblxuICBmdW5jdGlvbiBPYmplY3RTdG9yZShzdG9yZSkge1xuICAgIHRoaXMuX3N0b3JlID0gc3RvcmU7XG4gIH1cblxuICBPYmplY3RTdG9yZS5wcm90b3R5cGUuY3JlYXRlSW5kZXggPSBmdW5jdGlvbigpIHtcbiAgICByZXR1cm4gbmV3IEluZGV4KHRoaXMuX3N0b3JlLmNyZWF0ZUluZGV4LmFwcGx5KHRoaXMuX3N0b3JlLCBhcmd1bWVudHMpKTtcbiAgfTtcblxuICBPYmplY3RTdG9yZS5wcm90b3R5cGUuaW5kZXggPSBmdW5jdGlvbigpIHtcbiAgICByZXR1cm4gbmV3IEluZGV4KHRoaXMuX3N0b3JlLmluZGV4LmFwcGx5KHRoaXMuX3N0b3JlLCBhcmd1bWVudHMpKTtcbiAgfTtcblxuICBwcm94eVByb3BlcnRpZXMoT2JqZWN0U3RvcmUsICdfc3RvcmUnLCBbXG4gICAgJ25hbWUnLFxuICAgICdrZXlQYXRoJyxcbiAgICAnaW5kZXhOYW1lcycsXG4gICAgJ2F1dG9JbmNyZW1lbnQnXG4gIF0pO1xuXG4gIHByb3h5UmVxdWVzdE1ldGhvZHMoT2JqZWN0U3RvcmUsICdfc3RvcmUnLCBJREJPYmplY3RTdG9yZSwgW1xuICAgICdwdXQnLFxuICAgICdhZGQnLFxuICAgICdkZWxldGUnLFxuICAgICdjbGVhcicsXG4gICAgJ2dldCcsXG4gICAgJ2dldEFsbCcsXG4gICAgJ2dldEtleScsXG4gICAgJ2dldEFsbEtleXMnLFxuICAgICdjb3VudCdcbiAgXSk7XG5cbiAgcHJveHlDdXJzb3JSZXF1ZXN0TWV0aG9kcyhPYmplY3RTdG9yZSwgJ19zdG9yZScsIElEQk9iamVjdFN0b3JlLCBbXG4gICAgJ29wZW5DdXJzb3InLFxuICAgICdvcGVuS2V5Q3Vyc29yJ1xuICBdKTtcblxuICBwcm94eU1ldGhvZHMoT2JqZWN0U3RvcmUsICdfc3RvcmUnLCBJREJPYmplY3RTdG9yZSwgW1xuICAgICdkZWxldGVJbmRleCdcbiAgXSk7XG5cbiAgZnVuY3Rpb24gVHJhbnNhY3Rpb24oaWRiVHJhbnNhY3Rpb24pIHtcbiAgICB0aGlzLl90eCA9IGlkYlRyYW5zYWN0aW9uO1xuICAgIHRoaXMuY29tcGxldGUgPSBuZXcgUHJvbWlzZShmdW5jdGlvbihyZXNvbHZlLCByZWplY3QpIHtcbiAgICAgIGlkYlRyYW5zYWN0aW9uLm9uY29tcGxldGUgPSBmdW5jdGlvbigpIHtcbiAgICAgICAgcmVzb2x2ZSgpO1xuICAgICAgfTtcbiAgICAgIGlkYlRyYW5zYWN0aW9uLm9uZXJyb3IgPSBmdW5jdGlvbigpIHtcbiAgICAgICAgcmVqZWN0KGlkYlRyYW5zYWN0aW9uLmVycm9yKTtcbiAgICAgIH07XG4gICAgICBpZGJUcmFuc2FjdGlvbi5vbmFib3J0ID0gZnVuY3Rpb24oKSB7XG4gICAgICAgIHJlamVjdChpZGJUcmFuc2FjdGlvbi5lcnJvcik7XG4gICAgICB9O1xuICAgIH0pO1xuICB9XG5cbiAgVHJhbnNhY3Rpb24ucHJvdG90eXBlLm9iamVjdFN0b3JlID0gZnVuY3Rpb24oKSB7XG4gICAgcmV0dXJuIG5ldyBPYmplY3RTdG9yZSh0aGlzLl90eC5vYmplY3RTdG9yZS5hcHBseSh0aGlzLl90eCwgYXJndW1lbnRzKSk7XG4gIH07XG5cbiAgcHJveHlQcm9wZXJ0aWVzKFRyYW5zYWN0aW9uLCAnX3R4JywgW1xuICAgICdvYmplY3RTdG9yZU5hbWVzJyxcbiAgICAnbW9kZSdcbiAgXSk7XG5cbiAgcHJveHlNZXRob2RzKFRyYW5zYWN0aW9uLCAnX3R4JywgSURCVHJhbnNhY3Rpb24sIFtcbiAgICAnYWJvcnQnXG4gIF0pO1xuXG4gIGZ1bmN0aW9uIFVwZ3JhZGVEQihkYiwgb2xkVmVyc2lvbiwgdHJhbnNhY3Rpb24pIHtcbiAgICB0aGlzLl9kYiA9IGRiO1xuICAgIHRoaXMub2xkVmVyc2lvbiA9IG9sZFZlcnNpb247XG4gICAgdGhpcy50cmFuc2FjdGlvbiA9IG5ldyBUcmFuc2FjdGlvbih0cmFuc2FjdGlvbik7XG4gIH1cblxuICBVcGdyYWRlREIucHJvdG90eXBlLmNyZWF0ZU9iamVjdFN0b3JlID0gZnVuY3Rpb24oKSB7XG4gICAgcmV0dXJuIG5ldyBPYmplY3RTdG9yZSh0aGlzLl9kYi5jcmVhdGVPYmplY3RTdG9yZS5hcHBseSh0aGlzLl9kYiwgYXJndW1lbnRzKSk7XG4gIH07XG5cbiAgcHJveHlQcm9wZXJ0aWVzKFVwZ3JhZGVEQiwgJ19kYicsIFtcbiAgICAnbmFtZScsXG4gICAgJ3ZlcnNpb24nLFxuICAgICdvYmplY3RTdG9yZU5hbWVzJ1xuICBdKTtcblxuICBwcm94eU1ldGhvZHMoVXBncmFkZURCLCAnX2RiJywgSURCRGF0YWJhc2UsIFtcbiAgICAnZGVsZXRlT2JqZWN0U3RvcmUnLFxuICAgICdjbG9zZSdcbiAgXSk7XG5cbiAgZnVuY3Rpb24gREIoZGIpIHtcbiAgICB0aGlzLl9kYiA9IGRiO1xuICB9XG5cbiAgREIucHJvdG90eXBlLnRyYW5zYWN0aW9uID0gZnVuY3Rpb24oKSB7XG4gICAgcmV0dXJuIG5ldyBUcmFuc2FjdGlvbih0aGlzLl9kYi50cmFuc2FjdGlvbi5hcHBseSh0aGlzLl9kYiwgYXJndW1lbnRzKSk7XG4gIH07XG5cbiAgcHJveHlQcm9wZXJ0aWVzKERCLCAnX2RiJywgW1xuICAgICduYW1lJyxcbiAgICAndmVyc2lvbicsXG4gICAgJ29iamVjdFN0b3JlTmFtZXMnXG4gIF0pO1xuXG4gIHByb3h5TWV0aG9kcyhEQiwgJ19kYicsIElEQkRhdGFiYXNlLCBbXG4gICAgJ2Nsb3NlJ1xuICBdKTtcblxuICAvLyBBZGQgY3Vyc29yIGl0ZXJhdG9yc1xuICAvLyBUT0RPOiByZW1vdmUgdGhpcyBvbmNlIGJyb3dzZXJzIGRvIHRoZSByaWdodCB0aGluZyB3aXRoIHByb21pc2VzXG4gIFsnb3BlbkN1cnNvcicsICdvcGVuS2V5Q3Vyc29yJ10uZm9yRWFjaChmdW5jdGlvbihmdW5jTmFtZSkge1xuICAgIFtPYmplY3RTdG9yZSwgSW5kZXhdLmZvckVhY2goZnVuY3Rpb24oQ29uc3RydWN0b3IpIHtcbiAgICAgIENvbnN0cnVjdG9yLnByb3RvdHlwZVtmdW5jTmFtZS5yZXBsYWNlKCdvcGVuJywgJ2l0ZXJhdGUnKV0gPSBmdW5jdGlvbigpIHtcbiAgICAgICAgdmFyIGFyZ3MgPSB0b0FycmF5KGFyZ3VtZW50cyk7XG4gICAgICAgIHZhciBjYWxsYmFjayA9IGFyZ3NbYXJncy5sZW5ndGggLSAxXTtcbiAgICAgICAgdmFyIG5hdGl2ZU9iamVjdCA9IHRoaXMuX3N0b3JlIHx8IHRoaXMuX2luZGV4O1xuICAgICAgICB2YXIgcmVxdWVzdCA9IG5hdGl2ZU9iamVjdFtmdW5jTmFtZV0uYXBwbHkobmF0aXZlT2JqZWN0LCBhcmdzLnNsaWNlKDAsIC0xKSk7XG4gICAgICAgIHJlcXVlc3Qub25zdWNjZXNzID0gZnVuY3Rpb24oKSB7XG4gICAgICAgICAgY2FsbGJhY2socmVxdWVzdC5yZXN1bHQpO1xuICAgICAgICB9O1xuICAgICAgfTtcbiAgICB9KTtcbiAgfSk7XG5cbiAgLy8gcG9seWZpbGwgZ2V0QWxsXG4gIFtJbmRleCwgT2JqZWN0U3RvcmVdLmZvckVhY2goZnVuY3Rpb24oQ29uc3RydWN0b3IpIHtcbiAgICBpZiAoQ29uc3RydWN0b3IucHJvdG90eXBlLmdldEFsbCkgcmV0dXJuO1xuICAgIENvbnN0cnVjdG9yLnByb3RvdHlwZS5nZXRBbGwgPSBmdW5jdGlvbihxdWVyeSwgY291bnQpIHtcbiAgICAgIHZhciBpbnN0YW5jZSA9IHRoaXM7XG4gICAgICB2YXIgaXRlbXMgPSBbXTtcblxuICAgICAgcmV0dXJuIG5ldyBQcm9taXNlKGZ1bmN0aW9uKHJlc29sdmUpIHtcbiAgICAgICAgaW5zdGFuY2UuaXRlcmF0ZUN1cnNvcihxdWVyeSwgZnVuY3Rpb24oY3Vyc29yKSB7XG4gICAgICAgICAgaWYgKCFjdXJzb3IpIHtcbiAgICAgICAgICAgIHJlc29sdmUoaXRlbXMpO1xuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICAgIH1cbiAgICAgICAgICBpdGVtcy5wdXNoKGN1cnNvci52YWx1ZSk7XG5cbiAgICAgICAgICBpZiAoY291bnQgIT09IHVuZGVmaW5lZCAmJiBpdGVtcy5sZW5ndGggPT0gY291bnQpIHtcbiAgICAgICAgICAgIHJlc29sdmUoaXRlbXMpO1xuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICAgIH1cbiAgICAgICAgICBjdXJzb3IuY29udGludWUoKTtcbiAgICAgICAgfSk7XG4gICAgICB9KTtcbiAgICB9O1xuICB9KTtcblxuICB2YXIgZXhwID0ge1xuICAgIG9wZW46IGZ1bmN0aW9uKG5hbWUsIHZlcnNpb24sIHVwZ3JhZGVDYWxsYmFjaykge1xuICAgICAgdmFyIHAgPSBwcm9taXNpZnlSZXF1ZXN0Q2FsbChpbmRleGVkREIsICdvcGVuJywgW25hbWUsIHZlcnNpb25dKTtcbiAgICAgIHZhciByZXF1ZXN0ID0gcC5yZXF1ZXN0O1xuXG4gICAgICByZXF1ZXN0Lm9udXBncmFkZW5lZWRlZCA9IGZ1bmN0aW9uKGV2ZW50KSB7XG4gICAgICAgIGlmICh1cGdyYWRlQ2FsbGJhY2spIHtcbiAgICAgICAgICB1cGdyYWRlQ2FsbGJhY2sobmV3IFVwZ3JhZGVEQihyZXF1ZXN0LnJlc3VsdCwgZXZlbnQub2xkVmVyc2lvbiwgcmVxdWVzdC50cmFuc2FjdGlvbikpO1xuICAgICAgICB9XG4gICAgICB9O1xuXG4gICAgICByZXR1cm4gcC50aGVuKGZ1bmN0aW9uKGRiKSB7XG4gICAgICAgIHJldHVybiBuZXcgREIoZGIpO1xuICAgICAgfSk7XG4gICAgfSxcbiAgICBkZWxldGU6IGZ1bmN0aW9uKG5hbWUpIHtcbiAgICAgIHJldHVybiBwcm9taXNpZnlSZXF1ZXN0Q2FsbChpbmRleGVkREIsICdkZWxldGVEYXRhYmFzZScsIFtuYW1lXSk7XG4gICAgfVxuICB9O1xuXG4gIGlmICh0eXBlb2YgbW9kdWxlICE9PSAndW5kZWZpbmVkJykge1xuICAgIG1vZHVsZS5leHBvcnRzID0gZXhwO1xuICB9XG4gIGVsc2Uge1xuICAgIHNlbGYuaWRiID0gZXhwO1xuICB9XG59KCkpO1xuIiwiLyoqXHJcbiAqIEFuIGluZGV4ZWQgZGIgYWRhcHRvclxyXG4gKi9cclxuXHJcbnZhciBpZGIgPSByZXF1aXJlKFwiaWRiXCIpO1xyXG5cclxuY29uc3QgVkFMSURfU1RPUkVTID0gW1wiYXNzaWdubWVudHNcIiwgXCJzeW5jLXN0b3JlXCJdO1xyXG5cclxuLy8gb3Blbi9zZXR1cCB0aGUgZGF0YWJhc2VcclxudmFyIGRiUHJvbWlzZSA9IGlkYi5vcGVuKFwiZGF0YS1zdG9yZXNcIiwgMywgZGIgPT4ge1xyXG5cdC8vIHVwZ3JhZGUgb3IgY3JlYXRlIHRoZSBkYlxyXG5cdGlmKGRiLm9sZFZlcnNpb24gPCAxKVxyXG5cdFx0ZGIuY3JlYXRlT2JqZWN0U3RvcmUoXCJhc3NpZ25tZW50c1wiLCB7IGtleVBhdGg6IFwiaWRcIiB9KTtcclxuXHRpZihkYi5vbGRWZXJzaW9uIDwgMilcclxuXHRcdGRiLmNyZWF0ZU9iamVjdFN0b3JlKFwic3luYy1zdG9yZVwiLCB7IGtleVBhdGg6IFwiaWRcIiB9KTtcclxuXHJcblx0Ly8gdGhlIHZlcnNpb24gMiBzeW5jLXN0b3JlIGhhZCBhIGRpZmZlcmVudCBzdHJ1Y3R1cmUgdGhhdCB0aGUgdmVyc2lvbiAzXHJcblx0aWYoZGIub2xkVmVyc2lvbiA9PSAyKSB7XHJcblx0XHRkYi5kZWxldGVPYmplY3RTdG9yZShcInN5bmMtc3RvcmVcIik7XHJcblx0XHRkYi5jcmVhdGVPYmplY3RTdG9yZShcInN5bmMtc3RvcmVcIiwgeyBrZXlQYXRoOiBcImlkXCIgfSk7XHJcblx0fVxyXG59KTtcclxuXHJcbmNsYXNzIElkYkFkYXB0b3Ige1xyXG5cdGNvbnN0cnVjdG9yKG5hbWUpIHtcclxuXHRcdHRoaXMubmFtZSA9IG5hbWU7XHJcblxyXG5cdFx0Ly8gY2hlY2sgdGhlIHN0b3JlIGlzIHZhbGlkXHJcblx0XHRpZihWQUxJRF9TVE9SRVMuaW5kZXhPZihuYW1lKSA9PT0gLTEpIHtcclxuXHRcdFx0dGhyb3cgbmV3IEVycm9yKGBUaGUgZGF0YSBzdG9yZSAke25hbWV9IGlzIG5vdCBpbiBpZGIgdXBkYXRlIHRoZSBkYmApO1xyXG5cdFx0fVxyXG5cdH1cclxuXHJcblx0Ly8gY3JlYXRlIGEgdHJhbnNhY3Rpb25cclxuXHRfdHJhbnNhY3Rpb24ocmVhZFdyaXRlKSB7XHJcblx0XHRyZXR1cm4gZGJQcm9taXNlLnRoZW4oZGIgPT4ge1xyXG5cdFx0XHRyZXR1cm4gZGJcclxuXHRcdFx0XHQudHJhbnNhY3Rpb24odGhpcy5uYW1lLCByZWFkV3JpdGUgJiYgXCJyZWFkd3JpdGVcIilcclxuXHRcdFx0XHQub2JqZWN0U3RvcmUodGhpcy5uYW1lKTtcclxuXHRcdH0pO1xyXG5cdH1cclxuXHJcblx0LyoqXHJcblx0ICogR2V0IGFsbCB0aGUgdmFsdWVzIGluIHRoZSBvYmplY3Qgc3RvcmVcclxuXHQgKi9cclxuXHRnZXRBbGwoKSB7XHJcblx0XHRyZXR1cm4gdGhpcy5fdHJhbnNhY3Rpb24oKVxyXG5cdFx0XHQudGhlbih0cmFucyA9PiB0cmFucy5nZXRBbGwoKSk7XHJcblx0fVxyXG5cclxuXHQvKipcclxuXHQgKiBHZXQgYSBzcGVjaWZpYyB2YWx1ZVxyXG5cdCAqL1xyXG5cdGdldChrZXkpIHtcclxuXHRcdHJldHVybiB0aGlzLl90cmFuc2FjdGlvbigpXHJcblx0XHRcdC50aGVuKHRyYW5zID0+IHRyYW5zLmdldChrZXkpKTtcclxuXHR9XHJcblxyXG5cdC8qKlxyXG5cdCAqIFN0b3JlIGEgdmFsdWUgaW4gaWRiXHJcblx0ICovXHJcblx0c2V0KHZhbHVlKSB7XHJcblx0XHRyZXR1cm4gdGhpcy5fdHJhbnNhY3Rpb24odHJ1ZSlcclxuXHRcdFx0LnRoZW4odHJhbnMgPT4gdHJhbnMucHV0KHZhbHVlKSk7XHJcblx0fVxyXG5cclxuXHQvKipcclxuXHQgKiBSZW1vdmUgYSB2YWx1ZSBmcm9tIGlkYlxyXG5cdCAqL1xyXG5cdHJlbW92ZShrZXkpIHtcclxuXHRcdHJldHVybiB0aGlzLl90cmFuc2FjdGlvbih0cnVlKVxyXG5cdFx0XHQudGhlbih0cmFucyA9PiB0cmFucy5kZWxldGUoa2V5KSk7XHJcblx0fVxyXG59XHJcblxyXG5tb2R1bGUuZXhwb3J0cyA9IElkYkFkYXB0b3I7XHJcbiIsIi8qKlxyXG4gKiBJbnN0YW50aWF0ZSBhbGwgdGhlIGRhdGEgc3RvcmVzXHJcbiAqL1xyXG5cclxudmFyIEh0dHBBZGFwdG9yID0gcmVxdWlyZShcIi4uLy4uL2NvbW1vbi9kYXRhLXN0b3Jlcy9odHRwLWFkYXB0b3JcIik7XHJcbnZhciBQb29sU3RvcmUgPSByZXF1aXJlKFwiLi4vLi4vY29tbW9uL2RhdGEtc3RvcmVzL3Bvb2wtc3RvcmVcIik7XHJcbnZhciBTeW5jZXIgPSByZXF1aXJlKFwiLi4vLi4vY29tbW9uL2RhdGEtc3RvcmVzL3N5bmNlclwiKTtcclxudmFyIElkYkFkYXB0b3IgPSByZXF1aXJlKFwiLi9pZGItYWRhcHRvclwiKTtcclxuXHJcbnZhciBpbml0SXRlbSA9IGl0ZW0gPT4ge1xyXG5cdC8vIGluc3RhbnRpYXRlIHRoZSBkYXRlXHJcblx0aWYoaXRlbS5kYXRlKSB7XHJcblx0XHRpdGVtLmRhdGUgPSBuZXcgRGF0ZShpdGVtLmRhdGUpO1xyXG5cdH1cclxufTtcclxuXHJcbi8vIGNyZWF0ZSBhIHN5bmNlclxyXG52YXIgYXNzaWdubWVudHNBZGFwdG9yID0gbmV3IFN5bmNlcih7XHJcblx0cmVtb3RlOiBuZXcgSHR0cEFkYXB0b3IoXCIvYXBpL2RhdGEvXCIpLFxyXG5cdGxvY2FsOiBuZXcgSWRiQWRhcHRvcihcImFzc2lnbm1lbnRzXCIpLFxyXG5cdGNoYW5nZVN0b3JlOiBuZXcgSWRiQWRhcHRvcihcInN5bmMtc3RvcmVcIilcclxufSk7XHJcblxyXG5leHBvcnRzLmFzc2lnbm1lbnRzID0gbmV3IFBvb2xTdG9yZShhc3NpZ25tZW50c0FkYXB0b3IsIGluaXRJdGVtKTtcclxuXHJcbi8vIGNoZWNrIG91ciBhY2Nlc3MgbGV2ZWxcclxuYXNzaWdubWVudHNBZGFwdG9yLmFjY2Vzc0xldmVsKClcclxuXHJcbi50aGVuKGxldmVsID0+IHtcclxuXHQvLyB3ZSBhcmUgbG9nZ2VkIG91dFxyXG5cdGlmKGxldmVsID09IFwibm9uZVwiKSB7XHJcblx0XHRsaWZlTGluZS5uYXYubmF2aWdhdGUoXCIvbG9naW5cIik7XHJcblx0fVxyXG59KTtcclxuXHJcbnZhciBwcm9ncmVzcztcclxuXHJcbi8vIHN0YXJ0IHRoZSBzeW5jXHJcbmFzc2lnbm1lbnRzQWRhcHRvci5vbihcInN5bmMtc3RhcnRcIiwgKCkgPT4gcHJvZ3Jlc3MgPSBuZXcgbGlmZUxpbmUuUHJvZ3Jlc3MoKSlcclxuLy8gdXBkYXRlIHRoZSBwcm9ncmVzc1xyXG5hc3NpZ25tZW50c0FkYXB0b3Iub24oXCJwcm9ncmVzc1wiLCB2YWx1ZSA9PiBwcm9ncmVzcy5zZXQodmFsdWUpKTtcclxuLy8gdGhlIHN5bmMgaXMgZG9uZVxyXG5hc3NpZ25tZW50c0FkYXB0b3Iub24oXCJzeW5jLWNvbXBsZXRlXCIsIHZhbHVlID0+IHByb2dyZXNzLnNldCgxKSk7XHJcblxyXG4vLyB0cmlnZ2VyIGEgc3luY1xyXG5saWZlTGluZS5zeW5jID0gZnVuY3Rpb24oKSB7XHJcblx0Ly8gdHJpZ2dlciBhIHN5bmNcclxuXHRyZXR1cm4gYXNzaWdubWVudHNBZGFwdG9yLnN5bmMoKVxyXG5cclxuXHQvLyBmb3JjZSBhIHJlZmVzaFxyXG5cdC50aGVuKCgpID0+IGxpZmVMaW5lLm5hdi5uYXZpZ2F0ZShsb2NhdGlvbi5wYXRobmFtZSkpO1xyXG59O1xyXG5cclxuaWYodHlwZW9mIHdpbmRvdyA9PSBcIm9iamVjdFwiKSB7XHJcblx0Ly8gaW5pdGlhbCBzeW5jXHJcblx0c2V0VGltZW91dCgoKSA9PiBsaWZlTGluZS5zeW5jKCkpO1xyXG5cclxuXHQvLyBzeW5jIHdoZW4gd2UgcmV2aXNpdCB0aGUgcGFnZVxyXG5cdHdpbmRvdy5hZGRFdmVudExpc3RlbmVyKFwidmlzaWJpbGl0eWNoYW5nZVwiLCAoKSA9PiB7XHJcblx0XHRpZighZG9jdW1lbnQuaGlkZGVuKSB7XHJcblx0XHRcdGxpZmVMaW5lLnN5bmMoKTtcclxuXHRcdH1cclxuXHR9KTtcclxuXHJcblx0Ly8gc3luYyB3aGVuIHdlIHJlY29ubmVjdFxyXG5cdHdpbmRvdy5hZGRFdmVudExpc3RlbmVyKFwib25saW5lXCIsICgpID0+IHtcclxuXHRcdGxpZmVMaW5lLnN5bmMoKTtcclxuXHR9KTtcclxufVxyXG4iLCIvKipcclxuICogQnJvd3NlciBzcGVjaWZpYyBnbG9iYWxzXHJcbiAqL1xyXG5cclxubGlmZUxpbmUubWFrZURvbSA9IHJlcXVpcmUoXCIuL3V0aWwvZG9tLW1ha2VyXCIpO1xyXG5cclxuLy8gYWRkIGEgZnVuY3Rpb24gZm9yIGFkZGluZyBhY3Rpb25zXHJcbmxpZmVMaW5lLmFkZEFjdGlvbiA9IGZ1bmN0aW9uKG5hbWUsIGZuKSB7XHJcblx0Ly8gYXR0YWNoIHRoZSBjYWxsYmFja1xyXG5cdHZhciBsaXN0ZW5lciA9IGxpZmVMaW5lLm9uKFwiYWN0aW9uLWV4ZWMtXCIgKyBuYW1lLCBmbik7XHJcblxyXG5cdC8vIGluZm9ybSBhbnkgYWN0aW9uIHByb3ZpZGVyc1xyXG5cdGxpZmVMaW5lLmVtaXQoXCJhY3Rpb24tY3JlYXRlXCIsIG5hbWUpO1xyXG5cclxuXHQvLyBhbGwgYWN0aW9ucyByZW1vdmVkXHJcblx0dmFyIHJlbW92ZUFsbCA9IGxpZmVMaW5lLm9uKFwiYWN0aW9uLXJlbW92ZS1hbGxcIiwgKCkgPT4ge1xyXG5cdFx0Ly8gcmVtb3ZlIHRoZSBhY3Rpb24gbGlzdGVuZXJcclxuXHRcdGxpc3RlbmVyLnVuc3Vic2NyaWJlKCk7XHJcblx0XHRyZW1vdmVBbGwudW5zdWJzY3JpYmUoKTtcclxuXHR9KTtcclxuXHJcblx0cmV0dXJuIHtcclxuXHRcdHVuc3Vic2NyaWJlKCkge1xyXG5cdFx0XHQvLyByZW1vdmUgdGhlIGFjdGlvbiBsaXN0ZW5lclxyXG5cdFx0XHRsaXN0ZW5lci51bnN1YnNjcmliZSgpO1xyXG5cdFx0XHRyZW1vdmVBbGwudW5zdWJzY3JpYmUoKTtcclxuXHJcblx0XHRcdC8vIGluZm9ybSBhbnkgYWN0aW9uIHByb3ZpZGVyc1xyXG5cdFx0XHRsaWZlTGluZS5lbWl0KFwiYWN0aW9uLXJlbW92ZVwiLCBuYW1lKTtcclxuXHRcdH1cclxuXHR9O1xyXG59O1xyXG4iLCIvLyBjcmVhdGUgdGhlIGdsb2JhbCBvYmplY3RcclxucmVxdWlyZShcIi4uL2NvbW1vbi9nbG9iYWxcIik7XHJcbnJlcXVpcmUoXCIuL2dsb2JhbFwiKTtcclxuXHJcbi8vIGxvYWQgYWxsIHRoZSB3aWRnZXRzXHJcbnJlcXVpcmUoXCIuL3dpZGdldHMvc2lkZWJhclwiKTtcclxucmVxdWlyZShcIi4vd2lkZ2V0cy9jb250ZW50XCIpO1xyXG5yZXF1aXJlKFwiLi93aWRnZXRzL2xpbmtcIik7XHJcbnJlcXVpcmUoXCIuL3dpZGdldHMvbGlzdFwiKTtcclxucmVxdWlyZShcIi4vd2lkZ2V0cy9pbnB1dFwiKTtcclxucmVxdWlyZShcIi4vd2lkZ2V0cy9wcm9ncmVzc1wiKTtcclxucmVxdWlyZShcIi4vd2lkZ2V0cy90b2dnbGUtYnRuc1wiKTtcclxuXHJcbi8vIGxvYWQgYWxsIHRoZSB2aWV3c1xyXG52YXIge2luaXROYXZCYXJ9ID0gcmVxdWlyZShcIi4vdmlld3MvbGlzdHNcIik7XHJcbnJlcXVpcmUoXCIuL3ZpZXdzL2l0ZW1cIik7XHJcbnJlcXVpcmUoXCIuL3ZpZXdzL2VkaXRcIik7XHJcbnJlcXVpcmUoXCIuL3ZpZXdzL2xvZ2luXCIpO1xyXG5yZXF1aXJlKFwiLi92aWV3cy9hY2NvdW50XCIpO1xyXG5yZXF1aXJlKFwiLi92aWV3cy91c2Vyc1wiKTtcclxucmVxdWlyZShcIi4vdmlld3MvdG9kb1wiKTtcclxuXHJcbi8vIGluc3RhbnRpYXRlIHRoZSBkb21cclxubGlmZUxpbmUubWFrZURvbSh7XHJcblx0cGFyZW50OiBkb2N1bWVudC5ib2R5LFxyXG5cdGdyb3VwOiBbXHJcblx0XHR7IHdpZGdldDogXCJzaWRlYmFyXCIgfSxcclxuXHRcdHsgd2lkZ2V0OiBcInByb2dyZXNzXCIgfSxcclxuXHRcdHsgd2lkZ2V0OiBcImNvbnRlbnRcIiB9XHJcblx0XVxyXG59KTtcclxuXHJcbi8vIEFkZCBhIGxpbmsgdG8gdGhlIHRvZGEvaG9tZSBwYWdlXHJcbmxpZmVMaW5lLmFkZE5hdkNvbW1hbmQoXCJUb2RvXCIsIFwiL1wiKTtcclxuXHJcbi8vIGFkZCBsaXN0IHZpZXdzIHRvIHRoZSBuYXZiYXJcclxuaW5pdE5hdkJhcigpO1xyXG5cclxuLy8gY3JlYXRlIGEgbmV3IGFzc2lnbm1lbnRcclxubGlmZUxpbmUuYWRkQ29tbWFuZChcIk5ldyBhc3NpZ25tZW50XCIsICgpID0+IHtcclxuXHR2YXIgaWQgPSBNYXRoLmZsb29yKE1hdGgucmFuZG9tKCkgKiAxMDAwMDAwMDApO1xyXG5cclxuXHRsaWZlTGluZS5uYXYubmF2aWdhdGUoXCIvZWRpdC9cIiArIGlkKTtcclxufSk7XHJcblxyXG4vLyBjcmVhdGUgdGhlIGxvZ291dCBidXR0b25cclxubGlmZUxpbmUuYWRkTmF2Q29tbWFuZChcIkFjY291bnRcIiwgXCIvYWNjb3VudFwiKTtcclxuXHJcbi8vIHJlZ2lzdGVyIHRoZSBzZXJ2aWNlIHdvcmtlclxyXG5yZXF1aXJlKFwiLi9zdy1oZWxwZXJcIik7XHJcbiIsIi8qKlxyXG4gKiBSZWdpc3RlciBhbmQgY29tbXVuaWNhdGUgd2l0aCB0aGUgc2VydmljZSB3b3JrZXJcclxuICovXHJcblxyXG4gLy8gcmVnaXN0ZXIgdGhlIHNlcnZpY2Ugd29ya2VyXHJcbiBpZihuYXZpZ2F0b3Iuc2VydmljZVdvcmtlcikge1xyXG5cdCAvLyBtYWtlIHN1cmUgaXQncyByZWdpc3RlcmVkXHJcblx0IG5hdmlnYXRvci5zZXJ2aWNlV29ya2VyLnJlZ2lzdGVyKFwiL3NlcnZpY2Utd29ya2VyLmpzXCIpO1xyXG5cclxuXHQgLy8gbGlzdGVuIGZvciBtZXNzYWdlc1xyXG5cdCBuYXZpZ2F0b3Iuc2VydmljZVdvcmtlci5hZGRFdmVudExpc3RlbmVyKFwibWVzc2FnZVwiLCBlID0+IHtcclxuXHRcdCAvLyB3ZSBqdXN0IHVwZGF0ZWRcclxuXHRcdCBpZihlLmRhdGEudHlwZSA9PSBcInZlcnNpb24tY2hhbmdlXCIpIHtcclxuXHRcdFx0IGNvbnNvbGUubG9nKFwiVXBkYXRlZCB0b1wiLCBlLmRhdGEudmVyc2lvbik7XHJcblxyXG5cdFx0XHQgLy8gaW4gZGV2IG1vZGUgcmVsb2FkIHRoZSBwYWdlXHJcblx0XHRcdCBpZihlLmRhdGEudmVyc2lvbi5pbmRleE9mKFwiQFwiKSAhPT0gLTEpIHtcclxuXHRcdFx0XHQgbG9jYXRpb24ucmVsb2FkKCk7XHJcblx0XHRcdCB9XHJcblx0XHQgfVxyXG5cdCB9KTtcclxuIH1cclxuIiwiLyoqXHJcbiogRGF0ZSByZWxhdGVkIHRvb2xzXHJcbiovXHJcblxyXG4vLyBjaGVjayBpZiB0aGUgZGF0ZXMgYXJlIHRoZSBzYW1lIGRheVxyXG5leHBvcnRzLmlzU2FtZURhdGUgPSBmdW5jdGlvbihkYXRlMSwgZGF0ZTIpIHtcclxuXHRyZXR1cm4gZGF0ZTEuZ2V0RnVsbFllYXIoKSA9PSBkYXRlMi5nZXRGdWxsWWVhcigpICYmXHJcblx0XHRkYXRlMS5nZXRNb250aCgpID09IGRhdGUyLmdldE1vbnRoKCkgJiZcclxuXHRcdGRhdGUxLmdldERhdGUoKSA9PSBkYXRlMi5nZXREYXRlKCk7XHJcbn07XHJcblxyXG4vLyBjaGVjayBpZiBhIGRhdGUgaXMgbGVzcyB0aGFuIGFub3RoZXJcclxuZXhwb3J0cy5pc1Nvb25lckRhdGUgPSBmdW5jdGlvbihkYXRlMSwgZGF0ZTIpIHtcclxuICAgIC8vIGNoZWNrIHRoZSB5ZWFyIGZpcnN0XHJcbiAgICBpZihkYXRlMS5nZXRGdWxsWWVhcigpICE9IGRhdGUyLmdldEZ1bGxZZWFyKCkpIHtcclxuICAgICAgICByZXR1cm4gZGF0ZTEuZ2V0RnVsbFllYXIoKSA8IGRhdGUyLmdldEZ1bGxZZWFyKCk7XHJcbiAgICB9XHJcblxyXG4gICAgLy8gY2hlY2sgdGhlIG1vbnRoIG5leHRcclxuICAgIGlmKGRhdGUxLmdldE1vbnRoKCkgIT0gZGF0ZTIuZ2V0TW9udGgoKSkge1xyXG4gICAgICAgIHJldHVybiBkYXRlMS5nZXRNb250aCgpIDwgZGF0ZTIuZ2V0TW9udGgoKTtcclxuICAgIH1cclxuXHJcbiAgICAvLyBjaGVjayB0aGUgZGF5XHJcbiAgICByZXR1cm4gZGF0ZTEuZ2V0RGF0ZSgpIDwgZGF0ZTIuZ2V0RGF0ZSgpO1xyXG59O1xyXG5cclxuLy8gZ2V0IHRoZSBkYXRlIGRheXMgZnJvbSBub3dcclxuZXhwb3J0cy5kYXlzRnJvbU5vdyA9IGZ1bmN0aW9uKGRheXMpIHtcclxuXHR2YXIgZGF0ZSA9IG5ldyBEYXRlKCk7XHJcblxyXG5cdC8vIGFkdmFuY2UgdGhlIGRhdGVcclxuXHRkYXRlLnNldERhdGUoZGF0ZS5nZXREYXRlKCkgKyBkYXlzKTtcclxuXHJcblx0cmV0dXJuIGRhdGU7XHJcbn07XHJcblxyXG5jb25zdCBTVFJJTkdfREFZUyA9IFtcIlN1bmRheVwiLCBcIk1vbmRheVwiLCBcIlR1ZXNkYXlcIiwgXCJXZWRlbnNkYXlcIiwgXCJUaHVyc2RheVwiLCBcIkZyaWRheVwiLCBcIlNhdHVyZGF5XCJdO1xyXG5cclxuLy8gY29udmVydCBhIGRhdGUgdG8gYSBzdHJpbmdcclxuZXhwb3J0cy5zdHJpbmdpZnlEYXRlID0gZnVuY3Rpb24oZGF0ZSwgb3B0cyA9IHt9KSB7XHJcblx0IHZhciBzdHJEYXRlLCBzdHJUaW1lID0gXCJcIjtcclxuXHJcbiAgICAvLyBjaGVjayBpZiB0aGUgZGF0ZSBpcyBiZWZvcmUgdG9kYXlcclxuICAgIHZhciBiZWZvcmVOb3cgPSBkYXRlLmdldFRpbWUoKSA8IERhdGUubm93KCk7XHJcblxyXG5cdC8vIFRvZGF5XHJcblx0aWYoZXhwb3J0cy5pc1NhbWVEYXRlKGRhdGUsIG5ldyBEYXRlKCkpKVxyXG5cdFx0c3RyRGF0ZSA9IFwiVG9kYXlcIjtcclxuXHJcblx0Ly8gVG9tb3Jyb3dcclxuXHRlbHNlIGlmKGV4cG9ydHMuaXNTYW1lRGF0ZShkYXRlLCBleHBvcnRzLmRheXNGcm9tTm93KDEpKSAmJiAhYmVmb3JlTm93KVxyXG5cdFx0c3RyRGF0ZSA9IFwiVG9tb3Jyb3dcIjtcclxuXHJcblx0Ly8gZGF5IG9mIHRoZSB3ZWVrICh0aGlzIHdlZWspXHJcblx0ZWxzZSBpZihleHBvcnRzLmlzU29vbmVyRGF0ZShkYXRlLCBleHBvcnRzLmRheXNGcm9tTm93KDcpKSAmJiAhYmVmb3JlTm93KVxyXG5cdFx0c3RyRGF0ZSA9IFNUUklOR19EQVlTW2RhdGUuZ2V0RGF5KCldO1xyXG5cclxuXHQvLyBwcmludCB0aGUgZGF0ZVxyXG5cdGVsc2VcclxuXHQgXHRzdHJEYXRlID0gYCR7U1RSSU5HX0RBWVNbZGF0ZS5nZXREYXkoKV19ICR7ZGF0ZS5nZXRNb250aCgpICsgMX0vJHtkYXRlLmdldERhdGUoKX1gO1xyXG5cclxuXHQvLyBhZGQgdGhlIHRpbWUgb25cclxuXHRpZihvcHRzLmluY2x1ZGVUaW1lICYmICFleHBvcnRzLmlzU2tpcFRpbWUoZGF0ZSwgb3B0cy5za2lwVGltZXMpKSB7XHJcblx0XHRyZXR1cm4gc3RyRGF0ZSArIFwiLCBcIiArIGV4cG9ydHMuc3RyaW5naWZ5VGltZShkYXRlKTtcclxuXHR9XHJcblxyXG5cdHJldHVybiBzdHJEYXRlO1xyXG59O1xyXG5cclxuLy8gY2hlY2sgaWYgdGhpcyBpcyBvbmUgb2YgdGhlIGdpdmVuIHNraXAgdGltZXNcclxuZXhwb3J0cy5pc1NraXBUaW1lID0gZnVuY3Rpb24oZGF0ZSwgc2tpcHMgPSBbXSkge1xyXG5cdHJldHVybiBza2lwcy5maW5kKHNraXAgPT4ge1xyXG5cdFx0cmV0dXJuIHNraXAuaG91ciA9PT0gZGF0ZS5nZXRIb3VycygpICYmIHNraXAubWludXRlID09PSBkYXRlLmdldE1pbnV0ZXMoKTtcclxuXHR9KTtcclxufTtcclxuXHJcbi8vIGNvbnZlcnQgYSB0aW1lIHRvIGEgc3RyaW5nXHJcbmV4cG9ydHMuc3RyaW5naWZ5VGltZSA9IGZ1bmN0aW9uKGRhdGUpIHtcclxuXHR2YXIgaG91ciA9IGRhdGUuZ2V0SG91cnMoKTtcclxuXHJcblx0Ly8gZ2V0IHRoZSBhbS9wbSB0aW1lXHJcblx0dmFyIGlzQW0gPSBob3VyIDwgMTI7XHJcblxyXG5cdC8vIG1pZG5pZ2h0XHJcblx0aWYoaG91ciA9PT0gMCkgaG91ciA9IDEyO1xyXG5cdC8vIGFmdGVyIG5vb25cclxuXHRpZihob3VyID4gMTIpIGhvdXIgPSBob3VyIC0gMTI7XHJcblxyXG5cdHZhciBtaW51dGUgPSBkYXRlLmdldE1pbnV0ZXMoKTtcclxuXHJcblx0Ly8gYWRkIGEgbGVhZGluZyAwXHJcblx0aWYobWludXRlIDwgMTApIG1pbnV0ZSA9IFwiMFwiICsgbWludXRlO1xyXG5cclxuXHRyZXR1cm4gaG91ciArIFwiOlwiICsgbWludXRlICsgKGlzQW0gPyBcImFtXCIgOiBcInBtXCIpO1xyXG59XHJcbiIsIi8qKlxyXG4gKiBBIGhlbHBlciBmb3IgYnVpbGRpbmcgZG9tIG5vZGVzXHJcbiAqL1xyXG5cclxuY29uc3QgU1ZHX0VMRU1FTlRTID0gW1wic3ZnXCIsIFwibGluZVwiXTtcclxuY29uc3QgU1ZHX05BTUVTUEFDRSA9IFwiaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmdcIjtcclxuXHJcbi8vIGJ1aWxkIGEgc2luZ2xlIGRvbSBub2RlXHJcbnZhciBtYWtlRG9tID0gZnVuY3Rpb24ob3B0cyA9IHt9KSB7XHJcblx0Ly8gZ2V0IG9yIGNyZWF0ZSB0aGUgbmFtZSBtYXBwaW5nXHJcblx0dmFyIG1hcHBlZCA9IG9wdHMubWFwcGVkIHx8IHt9O1xyXG5cclxuXHR2YXIgJGVsO1xyXG5cclxuXHQvLyB0aGUgZWxlbWVudCBpcyBwYXJ0IG9mIHRoZSBzdmcgbmFtZXNwYWNlXHJcblx0aWYoU1ZHX0VMRU1FTlRTLmluZGV4T2Yob3B0cy50YWcpICE9PSAtMSkge1xyXG5cdFx0JGVsID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudE5TKFNWR19OQU1FU1BBQ0UsIG9wdHMudGFnKTtcclxuXHR9XHJcblx0Ly8gYSBwbGFpbiBlbGVtZW50XHJcblx0ZWxzZSB7XHJcblx0XHQkZWwgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KG9wdHMudGFnIHx8IFwiZGl2XCIpO1xyXG5cdH1cclxuXHJcblx0Ly8gc2V0IHRoZSBjbGFzc2VzXHJcblx0aWYob3B0cy5jbGFzc2VzKSB7XHJcblx0XHQkZWwuc2V0QXR0cmlidXRlKFwiY2xhc3NcIiwgdHlwZW9mIG9wdHMuY2xhc3NlcyA9PSBcInN0cmluZ1wiID8gb3B0cy5jbGFzc2VzIDogb3B0cy5jbGFzc2VzLmpvaW4oXCIgXCIpKTtcclxuXHR9XHJcblxyXG5cdC8vIGF0dGFjaCB0aGUgYXR0cmlidXRlc1xyXG5cdGlmKG9wdHMuYXR0cnMpIHtcclxuXHRcdE9iamVjdC5nZXRPd25Qcm9wZXJ0eU5hbWVzKG9wdHMuYXR0cnMpXHJcblxyXG5cdFx0LmZvckVhY2goYXR0ciA9PiAkZWwuc2V0QXR0cmlidXRlKGF0dHIsIG9wdHMuYXR0cnNbYXR0cl0pKTtcclxuXHR9XHJcblxyXG5cdC8vIHNldCB0aGUgdGV4dCBjb250ZW50XHJcblx0aWYob3B0cy50ZXh0KSB7XHJcblx0XHQkZWwuaW5uZXJUZXh0ID0gb3B0cy50ZXh0O1xyXG5cdH1cclxuXHJcblx0Ly8gYXR0YWNoIHRoZSBub2RlIHRvIGl0cyBwYXJlbnRcclxuXHRpZihvcHRzLnBhcmVudCkge1xyXG5cdFx0b3B0cy5wYXJlbnQuaW5zZXJ0QmVmb3JlKCRlbCwgb3B0cy5iZWZvcmUpO1xyXG5cdH1cclxuXHJcblx0Ly8gYWRkIGV2ZW50IGxpc3RlbmVyc1xyXG5cdGlmKG9wdHMub24pIHtcclxuXHRcdGZvcihsZXQgbmFtZSBvZiBPYmplY3QuZ2V0T3duUHJvcGVydHlOYW1lcyhvcHRzLm9uKSkge1xyXG5cdFx0XHQkZWwuYWRkRXZlbnRMaXN0ZW5lcihuYW1lLCBvcHRzLm9uW25hbWVdKTtcclxuXHJcblx0XHRcdC8vIGF0dGFjaCB0aGUgZG9tIHRvIGEgZGlzcG9zYWJsZVxyXG5cdFx0XHRpZihvcHRzLmRpc3ApIHtcclxuXHRcdFx0XHRvcHRzLmRpc3AuYWRkKHtcclxuXHRcdFx0XHRcdHVuc3Vic2NyaWJlOiAoKSA9PiAkZWwucmVtb3ZlRXZlbnRMaXN0ZW5lcihuYW1lLCBvcHRzLm9uW25hbWVdKVxyXG5cdFx0XHRcdH0pO1xyXG5cdFx0XHR9XHJcblx0XHR9XHJcblx0fVxyXG5cclxuXHQvLyBzZXQgdGhlIHZhbHVlIG9mIGFuIGlucHV0IGVsZW1lbnRcclxuXHRpZihvcHRzLnZhbHVlKSB7XHJcblx0XHQkZWwudmFsdWUgPSBvcHRzLnZhbHVlO1xyXG5cdH1cclxuXHJcblx0Ly8gYWRkIHRoZSBuYW1lIG1hcHBpbmdcclxuXHRpZihvcHRzLm5hbWUpIHtcclxuXHRcdG1hcHBlZFtvcHRzLm5hbWVdID0gJGVsO1xyXG5cdH1cclxuXHJcblx0Ly8gY3JlYXRlIHRoZSBjaGlsZCBkb20gbm9kZXNcclxuXHRpZihvcHRzLmNoaWxkcmVuKSB7XHJcblx0XHRmb3IobGV0IGNoaWxkIG9mIG9wdHMuY2hpbGRyZW4pIHtcclxuXHRcdFx0Ly8gbWFrZSBhbiBhcnJheSBpbnRvIGEgZ3JvdXAgT2JqZWN0XHJcblx0XHRcdGlmKEFycmF5LmlzQXJyYXkoY2hpbGQpKSB7XHJcblx0XHRcdFx0Y2hpbGQgPSB7XHJcblx0XHRcdFx0XHRncm91cDogY2hpbGRcclxuXHRcdFx0XHR9O1xyXG5cdFx0XHR9XHJcblxyXG5cdFx0XHQvLyBhdHRhY2ggaW5mb3JtYXRpb24gZm9yIHRoZSBncm91cFxyXG5cdFx0XHRjaGlsZC5wYXJlbnQgPSAkZWw7XHJcblx0XHRcdGNoaWxkLmRpc3AgPSBvcHRzLmRpc3A7XHJcblx0XHRcdGNoaWxkLm1hcHBlZCA9IG1hcHBlZDtcclxuXHJcblx0XHRcdC8vIGJ1aWxkIHRoZSBub2RlIG9yIGdyb3VwXHJcblx0XHRcdG1ha2UoY2hpbGQpO1xyXG5cdFx0fVxyXG5cdH1cclxuXHJcblx0cmV0dXJuIG1hcHBlZDtcclxufVxyXG5cclxuLy8gYnVpbGQgYSBncm91cCBvZiBkb20gbm9kZXNcclxudmFyIG1ha2VHcm91cCA9IGZ1bmN0aW9uKGdyb3VwKSB7XHJcblx0Ly8gc2hvcnRoYW5kIGZvciBhIGdyb3Vwc1xyXG5cdGlmKEFycmF5LmlzQXJyYXkoZ3JvdXApKSB7XHJcblx0XHRncm91cCA9IHtcclxuXHRcdFx0Y2hpbGRyZW46IGdyb3VwXHJcblx0XHR9O1xyXG5cdH1cclxuXHJcblx0Ly8gZ2V0IG9yIGNyZWF0ZSB0aGUgbmFtZSBtYXBwaW5nXHJcblx0dmFyIG1hcHBlZCA9IHt9O1xyXG5cclxuXHRmb3IobGV0IG5vZGUgb2YgZ3JvdXAuZ3JvdXApIHtcclxuXHRcdC8vIGNvcHkgb3ZlciBwcm9wZXJ0aWVzIGZyb20gdGhlIGdyb3VwXHJcblx0XHRub2RlLnBhcmVudCB8fCAobm9kZS5wYXJlbnQgPSBncm91cC5wYXJlbnQpO1xyXG5cdFx0bm9kZS5kaXNwIHx8IChub2RlLmRpc3AgPSBncm91cC5kaXNwKTtcclxuXHRcdG5vZGUubWFwcGVkID0gbWFwcGVkO1xyXG5cclxuXHRcdC8vIG1ha2UgdGhlIGRvbVxyXG5cdFx0bWFrZShub2RlKTtcclxuXHR9XHJcblxyXG5cdC8vIGNhbGwgdGhlIGNhbGxiYWNrIHdpdGggdGhlIG1hcHBlZCBuYW1lc1xyXG5cdGlmKGdyb3VwLmJpbmQpIHtcclxuXHRcdHZhciBzdWJzY3JpcHRpb24gPSBncm91cC5iaW5kKG1hcHBlZCk7XHJcblxyXG5cdFx0Ly8gaWYgdGhlIHJldHVybiBhIHN1YnNjcmlwdGlvbiBhdHRhY2ggaXQgdG8gdGhlIGRpc3Bvc2FibGVcclxuXHRcdGlmKHN1YnNjcmlwdGlvbiAmJiBncm91cC5kaXNwKSB7XHJcblx0XHRcdGdyb3VwLmRpc3AuYWRkKHN1YnNjcmlwdGlvbik7XHJcblx0XHR9XHJcblx0fVxyXG5cclxuXHRyZXR1cm4gbWFwcGVkO1xyXG59O1xyXG5cclxuLy8gYSBjb2xsZWN0aW9uIG9mIHdpZGdldHNcclxudmFyIHdpZGdldHMgPSB7fTtcclxuXHJcbnZhciBtYWtlID0gbW9kdWxlLmV4cG9ydHMgPSBmdW5jdGlvbihvcHRzKSB7XHJcblx0Ly8gaGFuZGxlIGEgZ3JvdXBcclxuXHRpZihBcnJheS5pc0FycmF5KG9wdHMpIHx8IG9wdHMuZ3JvdXApIHtcclxuXHRcdHJldHVybiBtYWtlR3JvdXAob3B0cyk7XHJcblx0fVxyXG5cdC8vIG1ha2UgYSB3aWRnZXRcclxuXHRlbHNlIGlmKG9wdHMud2lkZ2V0KSB7XHJcblx0XHR2YXIgd2lkZ2V0ID0gd2lkZ2V0c1tvcHRzLndpZGdldF07XHJcblxyXG5cdFx0Ly8gbm90IGRlZmluZWRcclxuXHRcdGlmKCF3aWRnZXQpIHtcclxuXHRcdFx0dGhyb3cgbmV3IEVycm9yKGBXaWRnZXQgJyR7b3B0cy53aWRnZXR9JyBpcyBub3QgZGVmaW5lZCBtYWtlIHN1cmUgaXRzIGJlZW4gaW1wb3J0ZWRgKTtcclxuXHRcdH1cclxuXHJcblx0XHQvLyBnZW5lcmF0ZSB0aGUgd2lkZ2V0IGNvbnRlbnRcclxuXHRcdHZhciBidWlsdCA9IHdpZGdldC5tYWtlKG9wdHMpO1xyXG5cclxuXHRcdHJldHVybiBtYWtlR3JvdXAoe1xyXG5cdFx0XHRwYXJlbnQ6IG9wdHMucGFyZW50LFxyXG5cdFx0XHRkaXNwOiBvcHRzLmRpc3AsXHJcblx0XHRcdGdyb3VwOiBBcnJheS5pc0FycmF5KGJ1aWx0KSA/IGJ1aWx0IDogW2J1aWx0XSxcclxuXHRcdFx0YmluZDogd2lkZ2V0LmJpbmQgJiYgd2lkZ2V0LmJpbmQuYmluZCh3aWRnZXQsIG9wdHMpXHJcblx0XHR9KTtcclxuXHR9XHJcblx0Ly8gbWFrZSBhIHNpbmdsZSBub2RlXHJcblx0ZWxzZSB7XHJcblx0XHRyZXR1cm4gbWFrZURvbShvcHRzKTtcclxuXHR9XHJcbn07XHJcblxyXG4vLyByZWdpc3RlciBhIHdpZGdldFxyXG5tYWtlLnJlZ2lzdGVyID0gZnVuY3Rpb24obmFtZSwgd2lkZ2V0KSB7XHJcblx0d2lkZ2V0c1tuYW1lXSA9IHdpZGdldDtcclxufTtcclxuIiwiLyoqXHJcbiAqIEEgdmlldyBmb3IgYWNjZXNzaW5nL21vZGlmeWluZyBpbmZvcm1hdGlvbiBhYm91dCB0aGUgY3VycmVudCB1c2VyXHJcbiAqL1xyXG5cclxudmFyIHtnZW5CYWNrdXBOYW1lfSA9IHJlcXVpcmUoXCIuLi8uLi9jb21tb24vYmFja3VwXCIpO1xyXG5cclxubGlmZUxpbmUubmF2LnJlZ2lzdGVyKHtcclxuXHRtYXRjaGVyOiAvXig/OlxcL3VzZXJcXC8oLis/KXxcXC9hY2NvdW50KSQvLFxyXG5cclxuXHRtYWtlKHtzZXRUaXRsZSwgY29udGVudCwgbWF0Y2h9KSB7XHJcblx0XHRzZXRUaXRsZShcIkFjY291bnRcIik7XHJcblxyXG5cdFx0dmFyIHVybCA9IFwiL2FwaS9hdXRoL2luZm8vZ2V0XCI7XHJcblxyXG5cdFx0Ly8gYWRkIHRoZSB1c2VybmFtZSBpZiBvbmUgaXMgZ2l2ZW5cclxuXHRcdGlmKG1hdGNoWzFdKSB1cmwgKz0gYD91c2VybmFtZT0ke21hdGNoWzFdfWA7XHJcblxyXG5cdFx0Ly8gbG9hZCB0aGUgdXNlciBkYXRhXHJcblx0XHRmZXRjaCh1cmwsIHsgY3JlZGVudGlhbHM6IFwiaW5jbHVkZVwiIH0pXHJcblxyXG5cdFx0LnRoZW4ocmVzID0+IHJlcy5qc29uKCkpXHJcblxyXG5cdFx0LnRoZW4ocmVzID0+IHtcclxuXHRcdFx0Ly8gbm8gc3VjaCB1c2VyIG9yIGFjY2VzcyBpcyBkZW5pZWRcclxuXHRcdFx0aWYocmVzLnN0YXR1cyA9PSBcImZhaWxcIikge1xyXG5cdFx0XHRcdGxpZmVMaW5lLm1ha2VEb20oe1xyXG5cdFx0XHRcdFx0cGFyZW50OiBjb250ZW50LFxyXG5cdFx0XHRcdFx0Y2xhc3NlczogXCJjb250ZW50LXBhZGRlZFwiLFxyXG5cdFx0XHRcdFx0dGV4dDogXCJDb3VsZCBub3QgYWNjZXNzIHRoZSB1c2VyIHlvdSB3ZXJlIGxvb2tpbmcgZm9yXCJcclxuXHRcdFx0XHR9KTtcclxuXHJcblx0XHRcdFx0cmV0dXJuO1xyXG5cdFx0XHR9XHJcblxyXG5cdFx0XHR2YXIgdXNlciA9IHJlcy5kYXRhO1xyXG5cclxuXHRcdFx0Ly8gZ2VuZXJhdGUgdGhlIHBhZ2VcclxuXHRcdFx0dmFyIGNoaWxkcmVuID0gW107XHJcblxyXG5cdFx0XHRjaGlsZHJlbi5wdXNoKHtcclxuXHRcdFx0XHR0YWc6IFwiaDJcIixcclxuXHRcdFx0XHR0ZXh0OiB1c2VyLnVzZXJuYW1lXHJcblx0XHRcdH0pO1xyXG5cclxuXHRcdFx0Ly8gZGlzcGxheSB0aGUgYWRtaW4gc3RhdHVzIG9mIGFub3RoZXIgdXNlclxyXG5cdFx0XHRpZihtYXRjaFsxXSkge1xyXG5cdFx0XHRcdGNoaWxkcmVuLnB1c2goe1xyXG5cdFx0XHRcdFx0dGV4dDogYCR7dXNlci51c2VybmFtZX0gaXMgJHt1c2VyLmFkbWluID8gXCJcIiA6IFwibm90XCJ9IGFuIGFkbWluYFxyXG5cdFx0XHRcdH0pO1xyXG5cdFx0XHR9XHJcblx0XHRcdC8vIGRpc3BsYXkgdGhlIGFkbWluIHN0YXR1cyBvZiB0aGlzIHVzZXJcclxuXHRcdFx0ZWxzZSB7XHJcblx0XHRcdFx0Y2hpbGRyZW4ucHVzaCh7XHJcblx0XHRcdFx0XHR0ZXh0OiBgWW91IGFyZSAke3VzZXIuYWRtaW4gPyBcIlwiIDogXCJub3RcIn0gYW4gYWRtaW5gXHJcblx0XHRcdFx0fSk7XHJcblxyXG5cdFx0XHRcdC8vIGFkZCBhIGxpbmsgYXQgYSBsaXN0IG9mIGFsbCB1c2Vyc1xyXG5cdFx0XHRcdGlmKHVzZXIuYWRtaW4pIHtcclxuXHRcdFx0XHRcdGNoaWxkcmVuLnB1c2goeyB0YWc6IFwiYnJcIiB9KTtcclxuXHJcblx0XHRcdFx0XHRjaGlsZHJlbi5wdXNoKHtcclxuXHRcdFx0XHRcdFx0d2lkZ2V0OiBcImxpbmtcIixcclxuXHRcdFx0XHRcdFx0aHJlZjogXCIvdXNlcnNcIixcclxuXHRcdFx0XHRcdFx0dGV4dDogXCJWaWV3IGFsbCB1c2Vyc1wiXHJcblx0XHRcdFx0XHR9KTtcclxuXHRcdFx0XHR9XHJcblx0XHRcdH1cclxuXHJcblx0XHRcdC8vIGNyZWF0ZSBhIGJhY2t1cCBsaW5rXHJcblx0XHRcdGlmKCFtYXRjaFsxXSkge1xyXG5cdFx0XHRcdGNoaWxkcmVuLnB1c2goeyB0YWc6IFwiYnJcIiB9KTtcclxuXHRcdFx0XHRjaGlsZHJlbi5wdXNoKHsgdGFnOiBcImJyXCIgfSk7XHJcblxyXG5cdFx0XHRcdGNoaWxkcmVuLnB1c2goe1xyXG5cdFx0XHRcdFx0dGFnOiBcImFcIixcclxuXHRcdFx0XHRcdHRleHQ6IFwiRG93bmxvYWQgYmFja3VwXCIsXHJcblx0XHRcdFx0XHRhdHRyczoge1xyXG5cdFx0XHRcdFx0XHRocmVmOiBcIi9hcGkvYmFja3VwXCIsXHJcblx0XHRcdFx0XHRcdGRvd25sb2FkOiBnZW5CYWNrdXBOYW1lKClcclxuXHRcdFx0XHRcdH1cclxuXHRcdFx0XHR9KTtcclxuXHRcdFx0fVxyXG5cclxuXHRcdFx0dmFyIHBhc3N3b3JkQ2hhbmdlID0ge307XHJcblxyXG5cdFx0XHRjaGlsZHJlbi5wdXNoKHtcclxuXHRcdFx0XHR0YWc6IFwiZm9ybVwiLFxyXG5cdFx0XHRcdGNoaWxkcmVuOiBbXHJcblx0XHRcdFx0XHR7XHJcblx0XHRcdFx0XHRcdGNsYXNzZXM6IFwiZWRpdG9yLXJvd1wiLFxyXG5cdFx0XHRcdFx0XHRjaGlsZHJlbjogW1xyXG5cdFx0XHRcdFx0XHRcdHtcclxuXHRcdFx0XHRcdFx0XHRcdHdpZGdldDogXCJpbnB1dFwiLFxyXG5cdFx0XHRcdFx0XHRcdFx0dHlwZTogXCJwYXNzd29yZFwiLFxyXG5cdFx0XHRcdFx0XHRcdFx0cGxhY2Vob2xkZXI6IFwiT2xkIHBhc3N3b3JkXCIsXHJcblx0XHRcdFx0XHRcdFx0XHRiaW5kOiBwYXNzd29yZENoYW5nZSxcclxuXHRcdFx0XHRcdFx0XHRcdHByb3A6IFwib2xkUGFzc3dvcmRcIlxyXG5cdFx0XHRcdFx0XHRcdH0sXHJcblx0XHRcdFx0XHRcdFx0e1xyXG5cdFx0XHRcdFx0XHRcdFx0d2lkZ2V0OiBcImlucHV0XCIsXHJcblx0XHRcdFx0XHRcdFx0XHR0eXBlOiBcInBhc3N3b3JkXCIsXHJcblx0XHRcdFx0XHRcdFx0XHRwbGFjZWhvbGRlcjogXCJOZXcgcGFzc3dvcmRcIixcclxuXHRcdFx0XHRcdFx0XHRcdGJpbmQ6IHBhc3N3b3JkQ2hhbmdlLFxyXG5cdFx0XHRcdFx0XHRcdFx0cHJvcDogXCJwYXNzd29yZFwiXHJcblx0XHRcdFx0XHRcdFx0fVxyXG5cdFx0XHRcdFx0XHRdXHJcblx0XHRcdFx0XHR9LFxyXG5cdFx0XHRcdFx0e1xyXG5cdFx0XHRcdFx0XHR0YWc6IFwiYnV0dG9uXCIsXHJcblx0XHRcdFx0XHRcdGNsYXNzZXM6IFwiZmFuY3ktYnV0dG9uXCIsXHJcblx0XHRcdFx0XHRcdHRleHQ6IFwiQ2hhbmdlIHBhc3N3b3JkXCIsXHJcblx0XHRcdFx0XHRcdGF0dHJzOiB7XHJcblx0XHRcdFx0XHRcdFx0dHlwZTogXCJzdWJtaXRcIlxyXG5cdFx0XHRcdFx0XHR9XHJcblx0XHRcdFx0XHR9LFxyXG5cdFx0XHRcdFx0e1xyXG5cdFx0XHRcdFx0XHRuYW1lOiBcIm1zZ1wiXHJcblx0XHRcdFx0XHR9XHJcblx0XHRcdFx0XSxcclxuXHRcdFx0XHRvbjoge1xyXG5cdFx0XHRcdFx0Ly8gY2hhbmdlIHRoZSBwYXNzd29yZFxyXG5cdFx0XHRcdFx0c3VibWl0OiBlID0+IHtcclxuXHRcdFx0XHRcdFx0ZS5wcmV2ZW50RGVmYXVsdCgpO1xyXG5cclxuXHRcdFx0XHRcdFx0Ly8gbm8gcGFzc3dvcmQgc3VwcGxpZWRcclxuXHRcdFx0XHRcdFx0aWYoIXBhc3N3b3JkQ2hhbmdlLnBhc3N3b3JkKSB7XHJcblx0XHRcdFx0XHRcdFx0c2hvd01zZyhcIkVudGVyIGEgbmV3IHBhc3N3b3JkXCIpO1xyXG5cdFx0XHRcdFx0XHRcdHJldHVybjtcclxuXHRcdFx0XHRcdFx0fVxyXG5cclxuXHRcdFx0XHRcdFx0Ly8gc2VuZCB0aGUgcGFzc3dvcmQgY2hhbmdlIHJlcXVlc3RcclxuXHRcdFx0XHRcdFx0ZmV0Y2goYC9hcGkvYXV0aC9pbmZvL3NldD91c2VybmFtZT0ke3VzZXIudXNlcm5hbWV9YCwge1xyXG5cdFx0XHRcdFx0XHRcdGNyZWRlbnRpYWxzOiBcImluY2x1ZGVcIixcclxuXHRcdFx0XHRcdFx0XHRtZXRob2Q6IFwiUE9TVFwiLFxyXG5cdFx0XHRcdFx0XHRcdGJvZHk6IEpTT04uc3RyaW5naWZ5KHBhc3N3b3JkQ2hhbmdlKVxyXG5cdFx0XHRcdFx0XHR9KVxyXG5cclxuXHRcdFx0XHRcdFx0LnRoZW4ocmVzID0+IHJlcy5qc29uKCkpXHJcblxyXG5cdFx0XHRcdFx0XHQudGhlbihyZXMgPT4ge1xyXG5cdFx0XHRcdFx0XHRcdC8vIHBhc3N3b3JkIGNoYW5nZSBmYWlsZWRcclxuXHRcdFx0XHRcdFx0XHRpZihyZXMuc3RhdHVzID09IFwiZmFpbFwiKSB7XHJcblx0XHRcdFx0XHRcdFx0XHRzaG93TXNnKHJlcy5kYXRhLm1zZyk7XHJcblx0XHRcdFx0XHRcdFx0fVxyXG5cclxuXHRcdFx0XHRcdFx0XHRpZihyZXMuc3RhdHVzID09IFwic3VjY2Vzc1wiKSB7XHJcblx0XHRcdFx0XHRcdFx0XHRzaG93TXNnKFwiUGFzc3dvcmQgY2hhbmdlZFwiKTtcclxuXHRcdFx0XHRcdFx0XHR9XHJcblx0XHRcdFx0XHRcdH0pO1xyXG5cdFx0XHRcdFx0fVxyXG5cdFx0XHRcdH1cclxuXHRcdFx0fSk7XHJcblxyXG5cdFx0XHRjaGlsZHJlbi5wdXNoKHsgdGFnOiBcImJyXCIgfSk7XHJcblx0XHRcdGNoaWxkcmVuLnB1c2goeyB0YWc6IFwiYnJcIiB9KTtcclxuXHJcblx0XHRcdC8vIG9ubHkgZGlzcGxheSB0aGUgbG9nb3V0IGJ1dHRvbiBpZiB3ZSBhcmUgb24gdGhlIC9hY2NvdW50IHBhZ2VcclxuXHRcdFx0aWYoIW1hdGNoWzFdKSB7XHJcblx0XHRcdFx0Y2hpbGRyZW4ucHVzaCh7XHJcblx0XHRcdFx0XHR0YWc6IFwiYnV0dG9uXCIsXHJcblx0XHRcdFx0XHRjbGFzc2VzOiBcImZhbmN5LWJ1dHRvblwiLFxyXG5cdFx0XHRcdFx0dGV4dDogXCJMb2dvdXRcIixcclxuXHRcdFx0XHRcdG9uOiB7XHJcblx0XHRcdFx0XHRcdGNsaWNrOiAoKSA9PiB7XHJcblx0XHRcdFx0XHRcdFx0Ly8gc2VuZCB0aGUgbG9nb3V0IHJlcXVlc3RcclxuXHRcdFx0XHRcdFx0XHRmZXRjaChcIi9hcGkvYXV0aC9sb2dvdXRcIiwgeyBjcmVkZW50aWFsczogXCJpbmNsdWRlXCIgfSlcclxuXHJcblx0XHRcdFx0XHRcdFx0Ly8gcmV0dXJuIHRvIHRoZSBsb2dpbiBwYWdlXHJcblx0XHRcdFx0XHRcdFx0LnRoZW4oKCkgPT4gbGlmZUxpbmUubmF2Lm5hdmlnYXRlKFwiL2xvZ2luXCIpKTtcclxuXHRcdFx0XHRcdFx0fVxyXG5cdFx0XHRcdFx0fVxyXG5cdFx0XHRcdH0pO1xyXG5cdFx0XHR9XHJcblxyXG5cdFx0XHR2YXIge21zZ30gPSBsaWZlTGluZS5tYWtlRG9tKHtcclxuXHRcdFx0XHRwYXJlbnQ6IGNvbnRlbnQsXHJcblx0XHRcdFx0Y2xhc3NlczogXCJjb250ZW50LXBhZGRlZFwiLFxyXG5cdFx0XHRcdGNoaWxkcmVuXHJcblx0XHRcdH0pO1xyXG5cclxuXHRcdFx0Ly8gc2hvdyBhIG1lc3NhZ2VcclxuXHRcdFx0dmFyIHNob3dNc2cgPSBmdW5jdGlvbih0ZXh0KSB7XHJcblx0XHRcdFx0bXNnLmlubmVyVGV4dCA9IHRleHQ7XHJcblx0XHRcdH07XHJcblx0XHR9KVxyXG5cdH1cclxufSk7XHJcbiIsIi8qKlxyXG4gKiBFZGl0IGFuIGFzc2lnbmVtbnRcclxuICovXHJcblxyXG52YXIge2RheXNGcm9tTm93LCBzdHJpbmdpZnlEYXRlfSA9IHJlcXVpcmUoXCIuLi91dGlsL2RhdGVcIik7XHJcbnZhciB7YXNzaWdubWVudHN9ID0gcmVxdWlyZShcIi4uL2RhdGEtc3RvcmVzXCIpOztcclxuXHJcbmxpZmVMaW5lLm5hdi5yZWdpc3Rlcih7XHJcblx0bWF0Y2hlcjogL15cXC9lZGl0XFwvKC4rPykkLyxcclxuXHJcblx0bWFrZSh7bWF0Y2gsIGNvbnRlbnQsIHNldFRpdGxlLCBkaXNwb3NhYmxlfSkge1xyXG5cdFx0dmFyIGFjdGlvblN1YiwgZGVsZXRlU3ViO1xyXG5cclxuXHRcdC8vIGlmIHdlIG1ha2UgYSBjaGFuZ2UgZG9uJ3QgcmVmcmVzaCB0aGUgcGFnZVxyXG5cdFx0dmFyIGRlYm91bmNlO1xyXG5cclxuXHRcdC8vIHN5bmMgaWYgYW55dGhpbmcgaXMgY2hhbmdlZFxyXG5cdFx0dmFyIGNoYW5nZWQgPSBmYWxzZTtcclxuXHJcblx0XHR2YXIgY2hhbmdlU3ViID0gYXNzaWdubWVudHMucXVlcnkoeyBpZDogbWF0Y2hbMV0gfSwgZnVuY3Rpb24oW2l0ZW1dKSB7XHJcblx0XHRcdC8vIGlmIHdlIG1ha2UgYSBjaGFuZ2UgZG9uJ3QgcmVmcmVzaCB0aGUgcGFnZVxyXG5cdFx0XHRpZihkZWJvdW5jZSkge1xyXG5cdFx0XHRcdGRlYm91bmNlID0gZmFsc2U7XHJcblxyXG5cdFx0XHRcdHJldHVybjtcclxuXHRcdFx0fVxyXG5cclxuXHRcdFx0Ly8gY2xlYXIgdGhlIGNvbnRlbnRcclxuXHRcdFx0Y29udGVudC5pbm5lckhUTUwgPSBcIlwiO1xyXG5cclxuXHRcdFx0Ly8gcmVtb3ZlIHRoZSBwcmV2aW91cyBhY3Rpb25cclxuXHRcdFx0aWYoYWN0aW9uU3ViKSB7XHJcblx0XHRcdFx0YWN0aW9uU3ViLnVuc3Vic2NyaWJlKCk7XHJcblx0XHRcdFx0ZGVsZXRlU3ViLnVuc3Vic2NyaWJlKCk7XHJcblx0XHRcdH1cclxuXHJcblx0XHRcdC8vIGFkZCBhIGJ1dHRvbiBiYWNrIHRvIHRoZSB2aWV3XHJcblx0XHRcdGlmKGl0ZW0pIHtcclxuXHRcdFx0XHRhY3Rpb25TdWIgPSBsaWZlTGluZS5hZGRBY3Rpb24oXCJWaWV3XCIsICgpID0+IGxpZmVMaW5lLm5hdi5uYXZpZ2F0ZShcIi9pdGVtL1wiICsgaXRlbS5pZCkpO1xyXG5cclxuXHRcdFx0XHRkZWxldGVTdWIgPSBsaWZlTGluZS5hZGRBY3Rpb24oXCJEZWxldGVcIiwgKCkgPT4ge1xyXG5cdFx0XHRcdFx0Ly8gcmVtb3ZlIHRoZSBpdGVtXHJcblx0XHRcdFx0XHRhc3NpZ25tZW50cy5yZW1vdmUoaXRlbS5pZCk7XHJcblxyXG5cdFx0XHRcdFx0Ly8gbmF2aWdhdGUgYXdheVxyXG5cdFx0XHRcdFx0bGlmZUxpbmUubmF2Lm5hdmlnYXRlKFwiL1wiKTtcclxuXHJcblx0XHRcdFx0XHQvLyBzeW5jIHRoZSBjaGFuZ2VzXHJcblx0XHRcdFx0XHRsaWZlTGluZS5zeW5jKCk7XHJcblx0XHRcdFx0fSk7XHJcblx0XHRcdH1cclxuXHJcblx0XHRcdC8vIGlmIHRoZSBpdGVtIGRvZXMgbm90IGV4aXN0IGNyZWF0ZSBpdFxyXG5cdFx0XHRpZighaXRlbSkge1xyXG5cdFx0XHRcdGl0ZW0gPSB7XHJcblx0XHRcdFx0XHRuYW1lOiBcIlVubmFtZWQgaXRlbVwiLFxyXG5cdFx0XHRcdFx0Y2xhc3M6IFwiQ2xhc3NcIixcclxuXHRcdFx0XHRcdGRhdGU6IGdlbkRhdGUoKSxcclxuXHRcdFx0XHRcdGlkOiBtYXRjaFsxXSxcclxuXHRcdFx0XHRcdGRlc2NyaXB0aW9uOiBcIlwiLFxyXG5cdFx0XHRcdFx0bW9kaWZpZWQ6IERhdGUubm93KCksXHJcblx0XHRcdFx0XHR0eXBlOiBcImFzc2lnbm1lbnRcIixcclxuXHRcdFx0XHRcdGRvbmU6IGZhbHNlXHJcblx0XHRcdFx0fTtcclxuXHRcdFx0fVxyXG5cclxuXHRcdFx0Ly8gc2V0IHRoZSBpbml0YWwgdGl0bGVcclxuXHRcdFx0c2V0VGl0bGUoXCJFZGl0aW5nXCIpO1xyXG5cclxuXHRcdFx0Ly8gc2F2ZSBjaGFuZ2VzXHJcblx0XHRcdHZhciBjaGFuZ2UgPSAoKSA9PiB7XHJcblx0XHRcdFx0Ly8gdXBkYXRlIHRoZSBtb2RpZmllZCBkYXRlXHJcblx0XHRcdFx0aXRlbS5tb2RpZmllZCA9IERhdGUubm93KCk7XHJcblxyXG5cdFx0XHRcdC8vIGZpbmQgdGhlIGRhdGUgYW5kIHRpbWUgaW5wdXRzXHJcblx0XHRcdFx0dmFyIGRhdGVJbnB1dCA9IGRvY3VtZW50LnF1ZXJ5U2VsZWN0b3IoXCJpbnB1dFt0eXBlPWRhdGVdXCIpO1xyXG5cdFx0XHRcdHZhciB0aW1lSW5wdXQgPSBkb2N1bWVudC5xdWVyeVNlbGVjdG9yKFwiaW5wdXRbdHlwZT10aW1lXVwiKTtcclxuXHJcblx0XHRcdFx0Ly8gcGFyc2UgdGhlIGRhdGVcclxuXHRcdFx0XHRpdGVtLmRhdGUgPSBuZXcgRGF0ZShkYXRlSW5wdXQudmFsdWUgKyBcIiBcIiArIHRpbWVJbnB1dC52YWx1ZSk7XHJcblxyXG5cdFx0XHRcdC8vIHJlbW92ZSBhc3NpZ25lbW50IGZpZWxkcyBmcm9tIHRhc2tzXHJcblx0XHRcdFx0aWYoaXRlbS50eXBlID09IFwidGFza1wiKSB7XHJcblx0XHRcdFx0XHRkZWxldGUgaXRlbS5kYXRlO1xyXG5cdFx0XHRcdFx0ZGVsZXRlIGl0ZW0uY2xhc3M7XHJcblx0XHRcdFx0fVxyXG5cclxuXHRcdFx0XHQvLyBhZGQgYSBidXR0b24gYmFjayB0byB0aGUgdmlld1xyXG5cdFx0XHRcdGlmKCFhY3Rpb25TdWIpIHtcclxuXHRcdFx0XHRcdGFjdGlvblN1YiA9IGxpZmVMaW5lLmFkZEFjdGlvbihcIlZpZXdcIiwgKCkgPT4gbGlmZUxpbmUubmF2Lm5hdmlnYXRlKFwiL2l0ZW0vXCIgKyBpdGVtLmlkKSk7XHJcblxyXG5cdFx0XHRcdFx0ZGVsZXRlU3ViID0gbGlmZUxpbmUuYWRkQWN0aW9uKFwiRGVsZXRlXCIsICgpID0+IHtcclxuXHRcdFx0XHRcdFx0Ly8gcmVtb3ZlIHRoZSBpdGVtXHJcblx0XHRcdFx0XHRcdGFzc2lnbm1lbnRzLnJlbW92ZShpdGVtLmlkKTtcclxuXHJcblx0XHRcdFx0XHRcdC8vIG5hdmlnYXRlIGF3YXlcclxuXHRcdFx0XHRcdFx0bGlmZUxpbmUubmF2Lm5hdmlnYXRlKFwiL1wiKTtcclxuXHRcdFx0XHRcdH0pO1xyXG5cdFx0XHRcdH1cclxuXHJcblx0XHRcdFx0ZGVib3VuY2UgPSB0cnVlO1xyXG5cdFx0XHRcdGNoYW5nZWQgPSB0cnVlO1xyXG5cclxuXHRcdFx0XHQvLyBzYXZlIHRoZSBjaGFuZ2VzXHJcblx0XHRcdFx0YXNzaWdubWVudHMuc2V0KGl0ZW0pO1xyXG5cdFx0XHR9O1xyXG5cclxuXHRcdFx0Ly8gaGlkZSBhbmQgc2hvdyBzcGVjaWZpYyBmaWVsZHMgZm9yIGRpZmZlcmVudCBhc3NpZ25tZW50IHR5cGVzXHJcblx0XHRcdHZhciB0b2dnbGVGaWVsZHMgPSAoKSA9PiB7XHJcblx0XHRcdFx0aWYoaXRlbS50eXBlID09IFwidGFza1wiKSB7XHJcblx0XHRcdFx0XHRtYXBwZWQuY2xhc3NGaWVsZC5zdHlsZS5kaXNwbGF5ID0gXCJub25lXCI7XHJcblx0XHRcdFx0XHRtYXBwZWQuZGF0ZUZpZWxkLnN0eWxlLmRpc3BsYXkgPSBcIm5vbmVcIjtcclxuXHRcdFx0XHR9XHJcblx0XHRcdFx0ZWxzZSB7XHJcblx0XHRcdFx0XHRtYXBwZWQuY2xhc3NGaWVsZC5zdHlsZS5kaXNwbGF5ID0gXCJcIjtcclxuXHRcdFx0XHRcdG1hcHBlZC5kYXRlRmllbGQuc3R5bGUuZGlzcGxheSA9IFwiXCI7XHJcblx0XHRcdFx0fVxyXG5cclxuXHRcdFx0XHQvLyBmaWxsIGluIGRhdGUgaWYgaXQgaXMgbWlzc2luZ1xyXG5cdFx0XHRcdGlmKCFpdGVtLmRhdGUpIHtcclxuXHRcdFx0XHRcdGl0ZW0uZGF0ZSA9IGdlbkRhdGUoKTtcclxuXHRcdFx0XHR9XHJcblxyXG5cdFx0XHRcdGlmKCFpdGVtLmNsYXNzKSB7XHJcblx0XHRcdFx0XHRpdGVtLmNsYXNzID0gXCJDbGFzc1wiO1xyXG5cdFx0XHRcdH1cclxuXHRcdFx0fTtcclxuXHJcblx0XHRcdC8vIHJlbmRlciB0aGUgdWlcclxuXHRcdFx0dmFyIG1hcHBlZCA9IGxpZmVMaW5lLm1ha2VEb20oe1xyXG5cdFx0XHRcdHBhcmVudDogY29udGVudCxcclxuXHRcdFx0XHRncm91cDogW1xyXG5cdFx0XHRcdFx0e1xyXG5cdFx0XHRcdFx0XHRjbGFzc2VzOiBcImVkaXRvci1yb3dcIixcclxuXHRcdFx0XHRcdFx0Y2hpbGRyZW46IFtcclxuXHRcdFx0XHRcdFx0XHR7XHJcblx0XHRcdFx0XHRcdFx0XHR3aWRnZXQ6IFwiaW5wdXRcIixcclxuXHRcdFx0XHRcdFx0XHRcdGJpbmQ6IGl0ZW0sXHJcblx0XHRcdFx0XHRcdFx0XHRwcm9wOiBcIm5hbWVcIixcclxuXHRcdFx0XHRcdFx0XHRcdGNoYW5nZVxyXG5cdFx0XHRcdFx0XHRcdH1cclxuXHRcdFx0XHRcdFx0XVxyXG5cdFx0XHRcdFx0fSxcclxuXHRcdFx0XHRcdHtcclxuXHRcdFx0XHRcdFx0Y2xhc3NlczogXCJlZGl0b3Itcm93XCIsXHJcblx0XHRcdFx0XHRcdGNoaWxkcmVuOiBbXHJcblx0XHRcdFx0XHRcdFx0e1xyXG5cdFx0XHRcdFx0XHRcdFx0d2lkZ2V0OiBcInRvZ2dsZS1idG5zXCIsXHJcblx0XHRcdFx0XHRcdFx0XHRidG5zOiBbXHJcblx0XHRcdFx0XHRcdFx0XHRcdHsgdGV4dDogXCJBc3NpZ25tZW50XCIsIHZhbHVlOiBcImFzc2lnbm1lbnRcIiB9LFxyXG5cdFx0XHRcdFx0XHRcdFx0XHR7IHRleHQ6IFwiVGFza1wiLCB2YWx1ZTogXCJ0YXNrXCIgfSxcclxuXHRcdFx0XHRcdFx0XHRcdF0sXHJcblx0XHRcdFx0XHRcdFx0XHR2YWx1ZTogaXRlbS50eXBlLFxyXG5cdFx0XHRcdFx0XHRcdFx0Y2hhbmdlOiB0eXBlID0+IHtcclxuXHRcdFx0XHRcdFx0XHRcdFx0Ly8gdXBkYXRlIHRoZSBpdGVtIHR5cGVcclxuXHRcdFx0XHRcdFx0XHRcdFx0aXRlbS50eXBlID0gdHlwZTtcclxuXHJcblx0XHRcdFx0XHRcdFx0XHRcdC8vIGhpZGUvc2hvdyBzcGVjaWZpYyBmaWVsZHNcclxuXHRcdFx0XHRcdFx0XHRcdFx0dG9nZ2xlRmllbGRzKCk7XHJcblxyXG5cdFx0XHRcdFx0XHRcdFx0XHQvLyBlbWl0IHRoZSBjaGFuZ2VcclxuXHRcdFx0XHRcdFx0XHRcdFx0Y2hhbmdlKCk7XHJcblx0XHRcdFx0XHRcdFx0XHR9XHJcblx0XHRcdFx0XHRcdFx0fVxyXG5cdFx0XHRcdFx0XHRdXHJcblx0XHRcdFx0XHR9LFxyXG5cdFx0XHRcdFx0e1xyXG5cdFx0XHRcdFx0XHRuYW1lOiBcImNsYXNzRmllbGRcIixcclxuXHRcdFx0XHRcdFx0Y2xhc3NlczogXCJlZGl0b3Itcm93XCIsXHJcblx0XHRcdFx0XHRcdGNoaWxkcmVuOiBbXHJcblx0XHRcdFx0XHRcdFx0e1xyXG5cdFx0XHRcdFx0XHRcdFx0d2lkZ2V0OiBcImlucHV0XCIsXHJcblx0XHRcdFx0XHRcdFx0XHRiaW5kOiBpdGVtLFxyXG5cdFx0XHRcdFx0XHRcdFx0cHJvcDogXCJjbGFzc1wiLFxyXG5cdFx0XHRcdFx0XHRcdFx0Y2hhbmdlXHJcblx0XHRcdFx0XHRcdFx0fVxyXG5cdFx0XHRcdFx0XHRdXHJcblx0XHRcdFx0XHR9LFxyXG5cdFx0XHRcdFx0e1xyXG5cdFx0XHRcdFx0XHRuYW1lOiBcImRhdGVGaWVsZFwiLFxyXG5cdFx0XHRcdFx0XHRjbGFzc2VzOiBcImVkaXRvci1yb3dcIixcclxuXHRcdFx0XHRcdFx0Y2hpbGRyZW46IFtcclxuXHRcdFx0XHRcdFx0XHR7XHJcblx0XHRcdFx0XHRcdFx0XHR3aWRnZXQ6IFwiaW5wdXRcIixcclxuXHRcdFx0XHRcdFx0XHRcdHR5cGU6IFwiZGF0ZVwiLFxyXG5cdFx0XHRcdFx0XHRcdFx0dmFsdWU6IGl0ZW0uZGF0ZSAmJiBgJHtpdGVtLmRhdGUuZ2V0RnVsbFllYXIoKX0tJHtwYWQoaXRlbS5kYXRlLmdldE1vbnRoKCkgKyAxKX0tJHtwYWQoaXRlbS5kYXRlLmdldERhdGUoKSl9YCxcclxuXHRcdFx0XHRcdFx0XHRcdGNoYW5nZVxyXG5cdFx0XHRcdFx0XHRcdH0sXHJcblx0XHRcdFx0XHRcdFx0e1xyXG5cdFx0XHRcdFx0XHRcdFx0d2lkZ2V0OiBcImlucHV0XCIsXHJcblx0XHRcdFx0XHRcdFx0XHR0eXBlOiBcInRpbWVcIixcclxuXHRcdFx0XHRcdFx0XHRcdHZhbHVlOiBpdGVtLmRhdGUgJiYgYCR7aXRlbS5kYXRlLmdldEhvdXJzKCl9OiR7cGFkKGl0ZW0uZGF0ZS5nZXRNaW51dGVzKCkpfWAsXHJcblx0XHRcdFx0XHRcdFx0XHRjaGFuZ2VcclxuXHRcdFx0XHRcdFx0XHR9XHJcblx0XHRcdFx0XHRcdF1cclxuXHRcdFx0XHRcdH0sXHJcblx0XHRcdFx0XHR7XHJcblx0XHRcdFx0XHRcdGNsYXNzZXM6IFwidGV4dGFyZWEtd3JhcHBlclwiLFxyXG5cdFx0XHRcdFx0XHRjaGlsZHJlbjogW1xyXG5cdFx0XHRcdFx0XHRcdHtcclxuXHRcdFx0XHRcdFx0XHRcdHdpZGdldDogXCJpbnB1dFwiLFxyXG5cdFx0XHRcdFx0XHRcdFx0dGFnOiBcInRleHRhcmVhXCIsXHJcblx0XHRcdFx0XHRcdFx0XHRjbGFzc2VzOiBcInRleHRhcmVhLWZpbGxcIixcclxuXHRcdFx0XHRcdFx0XHRcdHBsYWNlaG9sZGVyOiBcIkRlc2NyaXB0aW9uXCIsXHJcblx0XHRcdFx0XHRcdFx0XHRiaW5kOiBpdGVtLFxyXG5cdFx0XHRcdFx0XHRcdFx0cHJvcDogXCJkZXNjcmlwdGlvblwiLFxyXG5cdFx0XHRcdFx0XHRcdFx0Y2hhbmdlXHJcblx0XHRcdFx0XHRcdFx0fVxyXG5cdFx0XHRcdFx0XHRdXHJcblx0XHRcdFx0XHR9XHJcblx0XHRcdFx0XVxyXG5cdFx0XHR9KTtcclxuXHJcblx0XHRcdC8vIHNob3cgdGhlIGZpZWxkcyBmb3IgdGhpcyBpdGVtIHR5cGVcclxuXHRcdFx0dG9nZ2xlRmllbGRzKCk7XHJcblx0XHR9KTtcclxuXHJcblx0XHQvLyByZW1vdmUgdGhlIHN1YnNjcmlwdGlvbiB3aGVuIHRoaXMgdmlldyBpcyBkZXN0cm95ZWRcclxuXHRcdGRpc3Bvc2FibGUuYWRkKGNoYW5nZVN1Yik7XHJcblxyXG5cdFx0Ly8gc3luYyBpZiB3ZSBjaGFuZ2VkIGFueXRoaW5nXHJcblx0XHRkaXNwb3NhYmxlLmFkZCh7XHJcblx0XHRcdHVuc3Vic2NyaWJlOiBmdW5jdGlvbigpIHtcclxuXHRcdFx0XHRpZihjaGFuZ2VkKSB7XHJcblx0XHRcdFx0XHRsaWZlTGluZS5zeW5jKCk7XHJcblx0XHRcdFx0fVxyXG5cdFx0XHR9XHJcblx0XHR9KTtcclxuXHR9XHJcbn0pO1xyXG5cclxuLy8gYWRkIGEgbGVhZGluZyAwIGlmIGEgbnVtYmVyIGlzIGxlc3MgdGhhbiAxMFxyXG52YXIgcGFkID0gbnVtYmVyID0+IChudW1iZXIgPCAxMCkgPyBcIjBcIiArIG51bWJlciA6IG51bWJlcjtcclxuXHJcbi8vIGNyZWF0ZSBhIGRhdGUgb2YgdG9kYXkgYXQgMTE6NTlwbVxyXG52YXIgZ2VuRGF0ZSA9ICgpID0+IHtcclxuXHR2YXIgZGF0ZSA9IG5ldyBEYXRlKCk7XHJcblxyXG5cdC8vIHNldCB0aGUgdGltZVxyXG5cdGRhdGUuc2V0SG91cnMoMjMpO1xyXG5cdGRhdGUuc2V0TWludXRlcyg1OSk7XHJcblxyXG5cdHJldHVybiBkYXRlO1xyXG59O1xyXG4iLCIvKipcclxuICogVGhlIHZpZXcgZm9yIGFuIGFzc2lnbm1lbnRcclxuICovXHJcblxyXG52YXIge2RheXNGcm9tTm93LCBzdHJpbmdpZnlEYXRlfSA9IHJlcXVpcmUoXCIuLi91dGlsL2RhdGVcIik7XHJcbnZhciB7YXNzaWdubWVudHN9ID0gcmVxdWlyZShcIi4uL2RhdGEtc3RvcmVzXCIpO1xyXG5cclxubGlmZUxpbmUubmF2LnJlZ2lzdGVyKHtcclxuXHRtYXRjaGVyOiAvXlxcL2l0ZW1cXC8oLis/KSQvLFxyXG5cclxuXHRtYWtlKHttYXRjaCwgc2V0VGl0bGUsIGNvbnRlbnQsIGRpc3Bvc2FibGV9KSB7XHJcblx0XHR2YXIgYWN0aW9uRG9uZVN1YiwgYWN0aW9uRWRpdFN1YjtcclxuXHJcblx0IFx0ZGlzcG9zYWJsZS5hZGQoXHJcblx0XHRcdGFzc2lnbm1lbnRzLnF1ZXJ5KHsgaWQ6IG1hdGNoWzFdIH0sIGZ1bmN0aW9uKFtpdGVtXSkge1xyXG5cdFx0XHRcdC8vIGNsZWFyIHRoZSBjb250ZW50XHJcblx0XHRcdFx0Y29udGVudC5pbm5lckhUTUwgPSBcIlwiO1xyXG5cclxuXHRcdFx0XHQvLyByZW1vdmUgdGhlIG9sZCBhY3Rpb25cclxuXHRcdFx0XHRpZihhY3Rpb25Eb25lU3ViKSB7XHJcblx0XHRcdFx0XHRhY3Rpb25Eb25lU3ViLnVuc3Vic2NyaWJlKCk7XHJcblx0XHRcdFx0XHRhY3Rpb25FZGl0U3ViLnVuc3Vic2NyaWJlKCk7XHJcblx0XHRcdFx0fVxyXG5cclxuXHRcdFx0XHQvLyBubyBzdWNoIGFzc2lnbm1lbnRcclxuXHRcdFx0XHRpZighaXRlbSkge1xyXG5cdFx0XHRcdFx0c2V0VGl0bGUoXCJOb3QgZm91bmRcIik7XHJcblxyXG5cdFx0XHRcdFx0bGlmZUxpbmUubWFrZURvbSh7XHJcblx0XHRcdFx0XHRcdHBhcmVudDogY29udGVudCxcclxuXHRcdFx0XHRcdFx0Y2xhc3NlczogXCJjb250ZW50LXBhZGRlZFwiLFxyXG5cdFx0XHRcdFx0XHRjaGlsZHJlbjogW1xyXG5cdFx0XHRcdFx0XHRcdHtcclxuXHRcdFx0XHRcdFx0XHRcdHRhZzogXCJzcGFuXCIsXHJcblx0XHRcdFx0XHRcdFx0XHR0ZXh0OiBcIlRoZSBhc3NpZ25tZW50IHlvdSB3aGVyZSBsb29raW5nIGZvciBjb3VsZCBub3QgYmUgZm91bmQuIFwiXHJcblx0XHRcdFx0XHRcdFx0fSxcclxuXHRcdFx0XHRcdFx0XHR7XHJcblx0XHRcdFx0XHRcdFx0XHR3aWRnZXQ6IFwibGlua1wiLFxyXG5cdFx0XHRcdFx0XHRcdFx0aHJlZjogXCIvXCIsXHJcblx0XHRcdFx0XHRcdFx0XHR0ZXh0OiBcIkdvIGhvbWUuXCJcclxuXHRcdFx0XHRcdFx0XHR9XHJcblx0XHRcdFx0XHRcdF1cclxuXHRcdFx0XHRcdH0pO1xyXG5cclxuXHRcdFx0XHRcdHJldHVybjtcclxuXHRcdFx0XHR9XHJcblxyXG5cdFx0XHRcdC8vIHNldCB0aGUgdGl0bGUgZm9yIHRoZSBjb250ZW50XHJcblx0XHRcdFx0c2V0VGl0bGUoXCJBc3NpZ25tZW50XCIpO1xyXG5cclxuXHRcdFx0XHQvLyBtYXJrIHRoZSBpdGVtIGFzIGRvbmVcclxuXHRcdFx0XHRhY3Rpb25Eb25lU3ViID0gbGlmZUxpbmUuYWRkQWN0aW9uKGl0ZW0uZG9uZSA/IFwiRG9uZVwiIDogXCJOb3QgZG9uZVwiLCAoKSA9PiB7XHJcblx0XHRcdFx0XHQvLyBtYXJrIHRoZSBpdGVtIGRvbmVcclxuXHRcdFx0XHRcdGl0ZW0uZG9uZSA9ICFpdGVtLmRvbmU7XHJcblxyXG5cdFx0XHRcdFx0Ly8gdXBkYXRlIHRoZSBtb2RpZmllZCB0aW1lXHJcblx0XHRcdFx0XHRpdGVtLm1vZGlmaWVkID0gRGF0ZS5ub3coKTtcclxuXHJcblx0XHRcdFx0XHQvLyBzYXZlIHRoZSBjaGFuZ2VcclxuXHRcdFx0XHRcdGFzc2lnbm1lbnRzLnNldChpdGVtKTtcclxuXHJcblx0XHRcdFx0XHQvLyBzeW5jIHRoZSBjaGFuZ2VcclxuXHRcdFx0XHRcdGxpZmVMaW5lLnN5bmMoKTtcclxuXHRcdFx0XHR9KTtcclxuXHJcblx0XHRcdFx0Ly8gZWRpdCB0aGUgaXRlbVxyXG5cdFx0XHRcdGFjdGlvbkVkaXRTdWIgPSBsaWZlTGluZS5hZGRBY3Rpb24oXCJFZGl0XCIsXHJcblx0XHRcdFx0XHQoKSA9PiBsaWZlTGluZS5uYXYubmF2aWdhdGUoXCIvZWRpdC9cIiArIGl0ZW0uaWQpKTtcclxuXHJcblx0XHRcdFx0Ly8gdGltZXMgdG8gc2tpcFxyXG5cdFx0XHRcdHZhciBza2lwVGltZXMgPSBbXHJcblx0XHRcdFx0XHR7IGhvdXI6IDIzLCBtaW51dGU6IDU5IH1cclxuXHRcdFx0XHRdO1xyXG5cclxuXHRcdFx0XHRsaWZlTGluZS5tYWtlRG9tKHtcclxuXHRcdFx0XHRcdHBhcmVudDogY29udGVudCxcclxuXHRcdFx0XHRcdGNsYXNzZXM6IFwiY29udGVudC1wYWRkZWRcIixcclxuXHRcdFx0XHRcdGNoaWxkcmVuOiBbXHJcblx0XHRcdFx0XHRcdHtcclxuXHRcdFx0XHRcdFx0XHRjbGFzc2VzOiBcImFzc2lnbm1lbnQtbmFtZVwiLFxyXG5cdFx0XHRcdFx0XHRcdHRleHQ6IGl0ZW0ubmFtZVxyXG5cdFx0XHRcdFx0XHR9LFxyXG5cdFx0XHRcdFx0XHR7XHJcblx0XHRcdFx0XHRcdFx0Y2xhc3NlczogXCJhc3NpZ25tZW50LWluZm8tcm93XCIsXHJcblx0XHRcdFx0XHRcdFx0Y2hpbGRyZW46IFtcclxuXHRcdFx0XHRcdFx0XHRcdHtcclxuXHRcdFx0XHRcdFx0XHRcdFx0Y2xhc3NlczogXCJhc3NpZ25tZW50LWluZm8tZ3Jvd1wiLFxyXG5cdFx0XHRcdFx0XHRcdFx0XHR0ZXh0OiBpdGVtLmNsYXNzXHJcblx0XHRcdFx0XHRcdFx0XHR9LFxyXG5cdFx0XHRcdFx0XHRcdFx0e1xyXG5cdFx0XHRcdFx0XHRcdFx0XHR0ZXh0OiBpdGVtLmRhdGUgJiYgc3RyaW5naWZ5RGF0ZShpdGVtLmRhdGUsIHsgaW5jbHVkZVRpbWU6IHRydWUsIHNraXBUaW1lcyB9KVxyXG5cdFx0XHRcdFx0XHRcdFx0fVxyXG5cdFx0XHRcdFx0XHRcdF1cclxuXHRcdFx0XHRcdFx0fSxcclxuXHRcdFx0XHRcdFx0e1xyXG5cdFx0XHRcdFx0XHRcdGNsYXNzZXM6IFwiYXNzaWdubWVudC1kZXNjcmlwdGlvblwiLFxyXG5cdFx0XHRcdFx0XHRcdHRleHQ6IGl0ZW0uZGVzY3JpcHRpb25cclxuXHRcdFx0XHRcdFx0fVxyXG5cdFx0XHRcdFx0XVxyXG5cdFx0XHRcdH0pO1xyXG5cdFx0XHR9KVxyXG5cdFx0KTtcclxuXHR9XHJcbn0pO1xyXG4iLCIvKipcclxuICogRGlzcGxheSBhIGxpc3Qgb2YgdXBjb21taW5nIGFzc2lnbm1lbnRzXHJcbiAqL1xyXG5cclxudmFyIHtkYXlzRnJvbU5vdywgaXNTYW1lRGF0ZSwgc3RyaW5naWZ5RGF0ZSwgc3RyaW5naWZ5VGltZSwgaXNTb29uZXJEYXRlfSA9IHJlcXVpcmUoXCIuLi91dGlsL2RhdGVcIik7XHJcbnZhciB7YXNzaWdubWVudHN9ID0gcmVxdWlyZShcIi4uL2RhdGEtc3RvcmVzXCIpO1xyXG5cclxuLy8gYWxsIHRoZSBkaWZmZXJlbnQgbGlzdHNcclxuY29uc3QgTElTVFMgPSBbXHJcblx0e1xyXG5cdFx0dXJsOiBcIi93ZWVrXCIsXHJcblx0XHR0aXRsZTogXCJUaGlzIHdlZWtcIixcclxuXHRcdGNyZWF0ZUN0eDogKCkgPT4gKHtcclxuXHRcdFx0Ly8gZGF5cyB0byB0aGUgZW5kIG9mIHRoaXMgd2Vla1xyXG5cdFx0XHRlbmREYXRlOiBkYXlzRnJvbU5vdyg3IC0gKG5ldyBEYXRlKCkpLmdldERheSgpKSxcclxuXHRcdFx0Ly8gdG9kYXlzIGRhdGVcclxuXHRcdFx0dG9kYXk6IG5ldyBEYXRlKClcclxuXHRcdH0pLFxyXG5cdFx0Ly8gc2hvdyBhbGwgYXQgcmVhc29uYWJsZSBudW1iZXIgb2YgaW5jb21wbGV0ZSBhc3NpZ25tZW50c1xyXG5cdFx0ZmlsdGVyOiAoaXRlbSwge3RvZGF5LCBlbmREYXRlfSkgPT4ge1xyXG5cdFx0XHQvLyBzaG93IGFsbCB0YXNrc1xyXG5cdFx0XHRpZihpdGVtLnR5cGUgPT0gXCJ0YXNrXCIpIHJldHVybiB0cnVlO1xyXG5cclxuXHRcdFx0Ly8gY2hlY2sgaWYgdGhlIGl0ZW0gaXMgcGFzdCB0aGlzIHdlZWtcclxuXHRcdFx0aWYoIWlzU29vbmVyRGF0ZShpdGVtLmRhdGUsIGVuZERhdGUpICYmICFpc1NhbWVEYXRlKGl0ZW0uZGF0ZSwgZW5kRGF0ZSkpIHJldHVybjtcclxuXHJcblx0XHRcdC8vIGNoZWNrIGlmIHRoZSBkYXRlIGlzIGJlZm9yZSB0b2RheVxyXG5cdFx0XHRpZihpc1Nvb25lckRhdGUoaXRlbS5kYXRlLCB0b2RheSkpIHJldHVybjtcclxuXHJcblx0XHRcdHJldHVybiB0cnVlO1xyXG5cdFx0fSxcclxuXHRcdHF1ZXJ5OiB7IGRvbmU6IGZhbHNlIH1cclxuXHR9LFxyXG5cdHtcclxuXHRcdHVybDogXCIvdXBjb21pbmdcIixcclxuXHRcdHF1ZXJ5OiB7IGRvbmU6IGZhbHNlIH0sXHJcblx0XHR0aXRsZTogXCJVcGNvbWluZ1wiXHJcblx0fSxcclxuXHR7XHJcblx0XHR1cmw6IFwiL2RvbmVcIixcclxuXHRcdHF1ZXJ5OiB7IGRvbmU6IHRydWUgfSxcclxuXHRcdHRpdGxlOiBcIkRvbmVcIlxyXG5cdH1cclxuXTtcclxuXHJcbi8vIGFkZCBsaXN0IHZpZXcgbGlua3MgdG8gdGhlIG5hdmJhclxyXG5leHBvcnRzLmluaXROYXZCYXIgPSBmdW5jdGlvbigpIHtcclxuXHRMSVNUUy5mb3JFYWNoKGxpc3QgPT4gbGlmZUxpbmUuYWRkTmF2Q29tbWFuZChsaXN0LnRpdGxlLCBsaXN0LnVybCkpO1xyXG59O1xyXG5cclxubGlmZUxpbmUubmF2LnJlZ2lzdGVyKHtcclxuXHRtYXRjaGVyKHVybCkge1xyXG5cdFx0cmV0dXJuIExJU1RTLmZpbmQobGlzdCA9PiBsaXN0LnVybCA9PSB1cmwpO1xyXG5cdH0sXHJcblxyXG5cdC8vIG1ha2UgdGhlIGxpc3RcclxuXHRtYWtlKHtzZXRUaXRsZSwgY29udGVudCwgZGlzcG9zYWJsZSwgbWF0Y2h9KSB7XHJcblx0XHRkaXNwb3NhYmxlLmFkZChcclxuXHRcdFx0YXNzaWdubWVudHMucXVlcnkobWF0Y2gucXVlcnkgfHwge30sIGZ1bmN0aW9uKGRhdGEpIHtcclxuXHRcdFx0XHQvLyBjbGVhciB0aGUgY29udGVudFxyXG5cdFx0XHRcdGNvbnRlbnQuaW5uZXJIVE1MID0gXCJcIjtcclxuXHJcblx0XHRcdFx0Ly8gc2V0IHRoZSBwYWdlIHRpdGxlXHJcblx0XHRcdFx0c2V0VGl0bGUobWF0Y2gudGl0bGUpO1xyXG5cclxuXHRcdFx0XHQvLyB0aGUgY29udGV4dCBmb3IgdGhlIGZpbHRlciBmdW5jdGlvblxyXG5cdFx0XHRcdHZhciBjdHg7XHJcblxyXG5cdFx0XHRcdGlmKG1hdGNoLmNyZWF0ZUN0eCkge1xyXG5cdFx0XHRcdFx0Y3R4ID0gbWF0Y2guY3JlYXRlQ3R4KCk7XHJcblx0XHRcdFx0fVxyXG5cclxuXHRcdFx0XHQvLyBydW4gdGhlIGZpbHRlciBmdW5jdGlvblxyXG5cdFx0XHRcdGlmKG1hdGNoLmZpbHRlcikge1xyXG5cdFx0XHRcdFx0ZGF0YSA9IGRhdGEuZmlsdGVyKGl0ZW0gPT4gbWF0Y2guZmlsdGVyKGl0ZW0sIGN0eCkpO1xyXG5cdFx0XHRcdH1cclxuXHJcblx0XHRcdFx0Ly8gc29ydCB0aGUgYXNzaW5nbWVudHNcclxuXHRcdFx0XHRkYXRhLnNvcnQoKGEsIGIpID0+IHtcclxuXHRcdFx0XHRcdC8vIHRhc2tzIGFyZSBiZWxvdyBhc3NpZ25tZW50c1xyXG5cdFx0XHRcdFx0aWYoYS50eXBlID09IFwidGFza1wiICYmIGIudHlwZSAhPSBcInRhc2tcIikgcmV0dXJuIDE7XHJcblx0XHRcdFx0XHRpZihhLnR5cGUgIT0gXCJ0YXNrXCIgJiYgYi50eXBlID09IFwidGFza1wiKSByZXR1cm4gLTE7XHJcblxyXG5cdFx0XHRcdFx0Ly8gc29ydCBieSBkdWUgZGF0ZVxyXG5cdFx0XHRcdFx0aWYoYS50eXBlID09IFwiYXNzaWdubWVudFwiICYmIGIudHlwZSA9PSBcImFzc2lnbm1lbnRcIikge1xyXG5cdFx0XHRcdFx0XHRpZihhLmRhdGUuZ2V0VGltZSgpICE9IGIuZGF0ZS5nZXRUaW1lKCkpIHtcclxuXHRcdFx0XHRcdFx0XHRyZXR1cm4gYS5kYXRlLmdldFRpbWUoKSAtIGIuZGF0ZS5nZXRUaW1lKCk7XHJcblx0XHRcdFx0XHRcdH1cclxuXHRcdFx0XHRcdH1cclxuXHJcblx0XHRcdFx0XHQvLyBvcmRlciBieSBuYW1lXHJcblx0XHRcdFx0XHRpZihhLm5hbWUgPCBiLm5hbWUpIHJldHVybiAtMTtcclxuXHRcdFx0XHRcdGlmKGEubmFtZSA+IGIubmFtZSkgcmV0dXJuIDE7XHJcblxyXG5cdFx0XHRcdFx0cmV0dXJuIDA7XHJcblx0XHRcdFx0fSk7XHJcblxyXG5cdFx0XHRcdC8vIG1ha2UgdGhlIGdyb3Vwc1xyXG5cdFx0XHRcdHZhciBncm91cHMgPSB7fTtcclxuXHJcblx0XHRcdFx0Ly8gcmVuZGVyIHRoZSBsaXN0XHJcblx0XHRcdFx0ZGF0YS5mb3JFYWNoKChpdGVtLCBpKSA9PiB7XHJcblx0XHRcdFx0XHQvLyBnZXQgdGhlIGhlYWRlciBuYW1lXHJcblx0XHRcdFx0XHR2YXIgZGF0ZVN0ciA9IGl0ZW0udHlwZSA9PSBcInRhc2tcIiA/IFwiVGFza3NcIiA6IHN0cmluZ2lmeURhdGUoaXRlbS5kYXRlKTtcclxuXHJcblx0XHRcdFx0XHQvLyBtYWtlIHN1cmUgdGhlIGhlYWRlciBleGlzdHNcclxuXHRcdFx0XHRcdGdyb3Vwc1tkYXRlU3RyXSB8fCAoZ3JvdXBzW2RhdGVTdHJdID0gW10pO1xyXG5cclxuXHRcdFx0XHRcdC8vIGFkZCB0aGUgaXRlbSB0byB0aGUgbGlzdFxyXG5cdFx0XHRcdFx0dmFyIGl0ZW1zID0gW1xyXG5cdFx0XHRcdFx0XHR7IHRleHQ6IGl0ZW0ubmFtZSwgZ3JvdzogdHJ1ZSB9XHJcblx0XHRcdFx0XHRdO1xyXG5cclxuXHRcdFx0XHRcdGlmKGl0ZW0udHlwZSAhPSBcInRhc2tcIikge1xyXG5cdFx0XHRcdFx0XHQvLyBzaG93IHRoZSBlbmQgdGltZSBmb3IgYW55IG5vbiAxMTo1OXBtIHRpbWVzXHJcblx0XHRcdFx0XHRcdGlmKGl0ZW0uZGF0ZS5nZXRIb3VycygpICE9IDIzIHx8IGl0ZW0uZGF0ZS5nZXRNaW51dGVzKCkgIT0gNTkpIHtcclxuXHRcdFx0XHRcdFx0XHRpdGVtcy5wdXNoKHN0cmluZ2lmeVRpbWUoaXRlbS5kYXRlKSk7XHJcblx0XHRcdFx0XHRcdH1cclxuXHJcblx0XHRcdFx0XHRcdC8vIHNob3cgdGhlIGNsYXNzXHJcblx0XHRcdFx0XHRcdGl0ZW1zLnB1c2goaXRlbS5jbGFzcyk7XHJcblx0XHRcdFx0XHR9XHJcblxyXG5cdFx0XHRcdFx0Z3JvdXBzW2RhdGVTdHJdLnB1c2goe1xuXHRcdFx0XHRcdFx0aHJlZjogYC9pdGVtLyR7aXRlbS5pZH1gLFxuXHRcdFx0XHRcdFx0aXRlbXNcclxuXHRcdFx0XHRcdH0pO1xyXG5cdFx0XHRcdH0pO1xyXG5cclxuXHRcdFx0XHQvLyBkaXNwbGF5IGFsbCBpdGVtc1xyXG5cdFx0XHRcdGxpZmVMaW5lLm1ha2VEb20oe1xyXG5cdFx0XHRcdFx0cGFyZW50OiBjb250ZW50LFxyXG5cdFx0XHRcdFx0d2lkZ2V0OiBcImxpc3RcIixcclxuXHRcdFx0XHRcdGl0ZW1zOiBncm91cHNcclxuXHRcdFx0XHR9KTtcclxuXHRcdFx0fSlcclxuXHRcdCk7XHJcblx0fVxyXG59KTtcclxuIiwiLyoqXHJcbiAqIFNob3cgYSBsb2dpbiBidXR0b24gdG8gdGhlIHVzZXJcclxuICovXHJcblxyXG5saWZlTGluZS5uYXYucmVnaXN0ZXIoe1xyXG5cdG1hdGNoZXI6IFwiL2xvZ2luXCIsXHJcblxyXG5cdG1ha2Uoe3NldFRpdGxlLCBjb250ZW50fSkge1xyXG5cdFx0Ly8gc2V0IHRoZSBwYWdlIHRpdGxlXHJcblx0XHRzZXRUaXRsZShcIkxvZ2luXCIpO1xyXG5cclxuXHRcdC8vIHRoZSB1c2VycyBjcmVkZW50aWFsc1xyXG5cdFx0dmFyIGF1dGggPSB7fTtcclxuXHJcblx0XHQvLyBjcmVhdGUgdGhlIGxvZ2luIGZvcm1cclxuXHRcdHZhciB7dXNlcm5hbWUsIHBhc3N3b3JkLCBtc2d9ID0gbGlmZUxpbmUubWFrZURvbSh7XHJcblx0XHRcdHBhcmVudDogY29udGVudCxcclxuXHRcdFx0dGFnOiBcImZvcm1cIixcclxuXHRcdFx0Y2xhc3NlczogXCJjb250ZW50LXBhZGRlZFwiLFxyXG5cdFx0XHRjaGlsZHJlbjogW1xyXG5cdFx0XHRcdHtcclxuXHRcdFx0XHRcdGNsYXNzZXM6IFwiZWRpdG9yLXJvd1wiLFxyXG5cdFx0XHRcdFx0Y2hpbGRyZW46IFtcclxuXHRcdFx0XHRcdFx0e1xyXG5cdFx0XHRcdFx0XHRcdHdpZGdldDogXCJpbnB1dFwiLFxyXG5cdFx0XHRcdFx0XHRcdGJpbmQ6IGF1dGgsXHJcblx0XHRcdFx0XHRcdFx0cHJvcDogXCJ1c2VybmFtZVwiLFxyXG5cdFx0XHRcdFx0XHRcdHBsYWNlaG9sZGVyOiBcIlVzZXJuYW1lXCJcclxuXHRcdFx0XHRcdFx0fVxyXG5cdFx0XHRcdFx0XVxyXG5cdFx0XHRcdH0sXHJcblx0XHRcdFx0e1xyXG5cdFx0XHRcdFx0Y2xhc3NlczogXCJlZGl0b3Itcm93XCIsXHJcblx0XHRcdFx0XHRjaGlsZHJlbjogW1xyXG5cdFx0XHRcdFx0XHR7XHJcblx0XHRcdFx0XHRcdFx0d2lkZ2V0OiBcImlucHV0XCIsXHJcblx0XHRcdFx0XHRcdFx0YmluZDogYXV0aCxcclxuXHRcdFx0XHRcdFx0XHRwcm9wOiBcInBhc3N3b3JkXCIsXHJcblx0XHRcdFx0XHRcdFx0dHlwZTogXCJwYXNzd29yZFwiLFxyXG5cdFx0XHRcdFx0XHRcdHBsYWNlaG9sZGVyOiBcIlBhc3N3b3JkXCJcclxuXHRcdFx0XHRcdFx0fVxyXG5cdFx0XHRcdFx0XVxyXG5cdFx0XHRcdH0sXHJcblx0XHRcdFx0e1xyXG5cdFx0XHRcdFx0dGFnOiBcImJ1dHRvblwiLFxyXG5cdFx0XHRcdFx0dGV4dDogXCJMb2dpblwiLFxyXG5cdFx0XHRcdFx0Y2xhc3NlczogXCJmYW5jeS1idXR0b25cIixcclxuXHRcdFx0XHRcdGF0dHJzOiB7XHJcblx0XHRcdFx0XHRcdHR5cGU6IFwic3VibWl0XCJcclxuXHRcdFx0XHRcdH1cclxuXHRcdFx0XHR9LFxyXG5cdFx0XHRcdHtcclxuXHRcdFx0XHRcdGNsYXNzZXM6IFwiZXJyb3ItbXNnXCIsXHJcblx0XHRcdFx0XHRuYW1lOiBcIm1zZ1wiXHJcblx0XHRcdFx0fVxyXG5cdFx0XHRdLFxyXG5cdFx0XHRvbjoge1xyXG5cdFx0XHRcdHN1Ym1pdDogZSA9PiB7XHJcblx0XHRcdFx0XHRlLnByZXZlbnREZWZhdWx0KCk7XHJcblxyXG5cdFx0XHRcdFx0Ly8gc2VuZCB0aGUgbG9naW4gcmVxdWVzdFxyXG5cdFx0XHRcdFx0ZmV0Y2goXCIvYXBpL2F1dGgvbG9naW5cIiwge1xyXG5cdFx0XHRcdFx0XHRtZXRob2Q6IFwiUE9TVFwiLFxyXG5cdFx0XHRcdFx0XHRjcmVkZW50aWFsczogXCJpbmNsdWRlXCIsXHJcblx0XHRcdFx0XHRcdGJvZHk6IEpTT04uc3RyaW5naWZ5KGF1dGgpXHJcblx0XHRcdFx0XHR9KVxyXG5cclxuXHRcdFx0XHRcdC8vIHBhcnNlIHRoZSBqc29uXHJcblx0XHRcdFx0XHQudGhlbihyZXMgPT4gcmVzLmpzb24oKSlcclxuXHJcblx0XHRcdFx0XHQvLyBwcm9jZXNzIHRoZSByZXNwb25zZVxyXG5cdFx0XHRcdFx0LnRoZW4ocmVzID0+IHtcclxuXHRcdFx0XHRcdFx0Ly8gbG9naW4gc3VjZWVkZWQgZ28gaG9tZVxyXG5cdFx0XHRcdFx0XHRpZihyZXMuc3RhdHVzID09IFwic3VjY2Vzc1wiKSB7XHJcblx0XHRcdFx0XHRcdFx0bGlmZUxpbmUubmF2Lm5hdmlnYXRlKFwiL1wiKTtcclxuXHJcblx0XHRcdFx0XHRcdFx0Ly8gc3luYyBub3cgdGhhdCB3ZSBhcmUgbG9nZ2VkIGluXHJcblx0XHRcdFx0XHRcdFx0aWYobGlmZUxpbmUuc3luYykge1xyXG5cdFx0XHRcdFx0XHRcdFx0bGlmZUxpbmUuc3luYygpO1xyXG5cdFx0XHRcdFx0XHRcdH1cclxuXHJcblx0XHRcdFx0XHRcdFx0cmV0dXJuO1xyXG5cdFx0XHRcdFx0XHR9XHJcblxyXG5cdFx0XHRcdFx0XHQvLyBsb2dpbiBmYWlsZWRcclxuXHRcdFx0XHRcdFx0aWYocmVzLnN0YXR1cyA9PSBcImZhaWxcIikge1xyXG5cdFx0XHRcdFx0XHRcdGVycm9yTXNnKFwiTG9naW4gZmFpbGVkXCIpO1xyXG5cdFx0XHRcdFx0XHR9XHJcblx0XHRcdFx0XHR9KTtcclxuXHRcdFx0XHR9XHJcblx0XHRcdH1cclxuXHRcdH0pO1xyXG5cclxuXHRcdC8vIGRpc3BsYXkgYW4gZXJyb3IgbWVzc2FnZVxyXG5cdFx0dmFyIGVycm9yTXNnID0gZnVuY3Rpb24odGV4dCkge1xyXG5cdFx0XHRtc2cuaW5uZXJUZXh0ID0gdGV4dDtcclxuXHRcdH07XHJcblx0fVxyXG59KTtcclxuXHJcbi8vIGxvZ291dFxyXG5saWZlTGluZS5sb2dvdXQgPSBmdW5jdGlvbigpIHtcclxuXHQvLyBzZW5kIHRoZSBsb2dvdXQgcmVxdWVzdFxyXG5cdGZldGNoKFwiL2FwaS9hdXRoL2xvZ291dFwiLCB7XHJcblx0XHRjcmVkZW50aWFsczogXCJpbmNsdWRlXCJcclxuXHR9KVxyXG5cclxuXHQvLyBnbyB0byB0aGUgbG9naW4gcGFnZVxyXG5cdC50aGVuKCgpID0+IGxpZmVMaW5lLm5hdi5uYXZpZ2F0ZShcIi9sb2dpblwiKSk7XHJcbn07XHJcbiIsIi8qKlxyXG4gKiBBIGxpc3Qgb2YgdGhpbmdzIHRvZG9cclxuICovXHJcblxyXG52YXIge2RheXNGcm9tTm93LCBpc1NhbWVEYXRlLCBzdHJpbmdpZnlUaW1lfSA9IHJlcXVpcmUoXCIuLi91dGlsL2RhdGVcIik7XHJcbnZhciB7YXNzaWdubWVudHN9ID0gcmVxdWlyZShcIi4uL2RhdGEtc3RvcmVzXCIpO1xyXG5cclxubGlmZUxpbmUubmF2LnJlZ2lzdGVyKHtcclxuXHRtYXRjaGVyOiBcIi9cIixcclxuXHJcblx0bWFrZSh7c2V0VGl0bGUsIGNvbnRlbnQsIGRpc3Bvc2FibGV9KSB7XHJcblx0XHRzZXRUaXRsZShcIlRvZG9cIik7XHJcblxyXG5cdFx0Ly8gbG9hZCB0aGUgaXRlbXNcclxuXHRcdGRpc3Bvc2FibGUuYWRkKFxyXG5cdFx0XHRhc3NpZ25tZW50cy5xdWVyeSh7XHJcblx0XHRcdFx0ZG9uZTogZmFsc2UsXHJcblx0XHRcdFx0Ly8gbWFrZSBzdXJlIHRoZSBhc3NpZ25tZW50IGlzIGluIHRoZSBmdXR1cmVcclxuXHRcdFx0XHRkYXRlOiBkYXRlID0+ICFkYXRlIHx8IG5ldyBEYXRlKGRhdGUpLmdldFRpbWUoKSA+IERhdGUubm93KClcclxuXHRcdFx0fSwgZnVuY3Rpb24oZGF0YSkge1xyXG5cdFx0XHRcdC8vIGNsZWFyIHRoZSBvbGQgY29udGVudFxyXG5cdFx0XHRcdGNvbnRlbnQuaW5uZXJIVE1MID0gXCJcIjtcclxuXHJcblx0XHRcdFx0dmFyIGdyb3VwcyA9IHtcclxuXHRcdFx0XHRcdFRhc2tzOiBbXSxcclxuXHRcdFx0XHRcdFRvZGF5OiBbXSxcclxuXHRcdFx0XHRcdFRvbW9ycm93OiBbXSxcclxuXHRcdFx0XHRcdFVwY29tbWluZzogW11cclxuXHRcdFx0XHR9O1xyXG5cclxuXHRcdFx0XHQvLyB0b2RheSBhbmQgdG9tb3Jyb3dzIGRhdGVzXHJcblx0XHRcdFx0dmFyIHRvZGF5ID0gbmV3IERhdGUoKTtcclxuXHRcdFx0XHR2YXIgdG9tb3Jyb3cgPSBkYXlzRnJvbU5vdygxKTtcclxuXHJcblx0XHRcdFx0Ly8gc29ydCBieSBkYXRlXHJcblx0XHRcdFx0ZGF0YS5zb3J0KChhLCBiKSA9PiB7XHJcblx0XHRcdFx0XHRpZihhLnR5cGUgPT0gXCJhc3NpZ25tZW50XCIgJiYgYi50eXBlID09IFwiYXNzaWdubWVudFwiKSB7XHJcblx0XHRcdFx0XHRcdHJldHVybiBhLmRhdGUuZ2V0VGltZSgpIC0gYi5kYXRlLmdldFRpbWUoKTtcclxuXHRcdFx0XHRcdH1cclxuXHRcdFx0XHR9KTtcclxuXHJcblx0XHRcdFx0Ly8gc2VsZWN0IHRoZSBpdGVtcyB0byBkaXNwbGF5XHJcblx0XHRcdFx0ZGF0YS5mb3JFYWNoKGl0ZW0gPT4ge1xyXG5cdFx0XHRcdFx0Ly8gYXNzaWdubWVudHMgZm9yIHRvZGF5XHJcblx0XHRcdFx0XHRpZihpdGVtLnR5cGUgPT0gXCJhc3NpZ25tZW50XCIpIHtcclxuXHRcdFx0XHRcdFx0Ly8gdG9kYXlcclxuXHRcdFx0XHRcdFx0aWYoaXNTYW1lRGF0ZSh0b2RheSwgaXRlbS5kYXRlKSkge1xyXG5cdFx0XHRcdFx0XHRcdGdyb3Vwcy5Ub2RheS5wdXNoKGNyZWF0ZVVpKGl0ZW0pKTtcclxuXHRcdFx0XHRcdFx0fVxyXG5cdFx0XHRcdFx0XHQvLyB0b21vcnJvd1xyXG5cdFx0XHRcdFx0XHRlbHNlIGlmKGlzU2FtZURhdGUodG9tb3Jyb3csIGl0ZW0uZGF0ZSkpIHtcclxuXHRcdFx0XHRcdFx0XHRncm91cHMuVG9tb3Jyb3cucHVzaChjcmVhdGVVaShpdGVtKSk7XHJcblx0XHRcdFx0XHRcdH1cclxuXHRcdFx0XHRcdFx0Ly8gYWRkIHVwY29tbWluZyBpdGVtc1xyXG5cdFx0XHRcdFx0XHRlbHNlIGlmKGdyb3Vwcy5VcGNvbW1pbmcubGVuZ3RoIDwgNSkge1xyXG5cdFx0XHRcdFx0XHRcdGdyb3Vwcy5VcGNvbW1pbmcucHVzaChjcmVhdGVVaShpdGVtKSk7XHJcblx0XHRcdFx0XHRcdH1cclxuXHRcdFx0XHRcdH1cclxuXHJcblx0XHRcdFx0XHQvLyBzaG93IGFueSB0YXNrc1xyXG5cdFx0XHRcdFx0aWYoaXRlbS50eXBlID09IFwidGFza1wiKSB7XHJcblx0XHRcdFx0XHRcdGdyb3Vwcy5UYXNrcy5wdXNoKGNyZWF0ZVVpKGl0ZW0pKTtcclxuXHRcdFx0XHRcdH1cclxuXHRcdFx0XHR9KTtcclxuXHJcblx0XHRcdFx0Ly8gcmVtb3ZlIGFueSBlbXB0eSBmaWVsZHNcclxuXHRcdFx0XHRPYmplY3QuZ2V0T3duUHJvcGVydHlOYW1lcyhncm91cHMpXHJcblxyXG5cdFx0XHRcdC5mb3JFYWNoKG5hbWUgPT4ge1xyXG5cdFx0XHRcdFx0Ly8gcmVtb3ZlIGVtcHR5IGdyb3Vwc1xyXG5cdFx0XHRcdFx0aWYoZ3JvdXBzW25hbWVdLmxlbmd0aCA9PT0gMCkge1xyXG5cdFx0XHRcdFx0XHRkZWxldGUgZ3JvdXBzW25hbWVdO1xyXG5cdFx0XHRcdFx0fVxyXG5cdFx0XHRcdH0pO1xyXG5cclxuXHRcdFx0XHQvLyByZW5kZXIgdGhlIGxpc3RcclxuXHRcdFx0XHRsaWZlTGluZS5tYWtlRG9tKHtcclxuXHRcdFx0XHRcdHBhcmVudDogY29udGVudCxcclxuXHRcdFx0XHRcdHdpZGdldDogXCJsaXN0XCIsXHJcblx0XHRcdFx0XHRpdGVtczogZ3JvdXBzXHJcblx0XHRcdFx0fSk7XHJcblx0XHRcdH0pXHJcblx0XHQpO1xyXG5cdH1cclxufSk7XHJcblxyXG4vLyBjcmVhdGUgYSBsaXN0IGl0ZW1cclxudmFyIGNyZWF0ZVVpID0gZnVuY3Rpb24oaXRlbSkge1xyXG5cdC8vIHJlbmRlciBhIHRhc2tcclxuXHRpZihpdGVtLnR5cGUgPT0gXCJ0YXNrXCIpIHtcclxuXHRcdHJldHVybiB7XHJcblx0XHRcdGhyZWY6IGAvaXRlbS8ke2l0ZW0uaWR9YCxcclxuXHRcdFx0aXRlbXM6IFtcclxuXHRcdFx0XHR7XHJcblx0XHRcdFx0XHR0ZXh0OiBpdGVtLm5hbWUsXHJcblx0XHRcdFx0XHRncm93OiB0cnVlXHJcblx0XHRcdFx0fVxyXG5cdFx0XHRdXHJcblx0XHR9O1xyXG5cdH1cclxuXHQvLyByZW5kZXIgYW4gaXRlbVxyXG5cdGVsc2Uge1xyXG5cdFx0cmV0dXJuIHtcclxuXHRcdFx0aHJlZjogYC9pdGVtLyR7aXRlbS5pZH1gLFxyXG5cdFx0XHRpdGVtczogW1xyXG5cdFx0XHRcdHtcclxuXHRcdFx0XHRcdHRleHQ6IGl0ZW0ubmFtZSxcclxuXHRcdFx0XHRcdGdyb3c6IHRydWVcclxuXHRcdFx0XHR9LFxyXG5cdFx0XHRcdHN0cmluZ2lmeVRpbWUoaXRlbS5kYXRlKSxcclxuXHRcdFx0XHRpdGVtLmNsYXNzXHJcblx0XHRcdF1cclxuXHRcdH07XHJcblx0fVxyXG59O1xyXG4iLCIvKipcclxuICogQSBwYWdlIHdpdGggbGlua3MgdG8gYWxsIHVzZXJzXHJcbiAqL1xyXG5cclxubGlmZUxpbmUubmF2LnJlZ2lzdGVyKHtcclxuXHRtYXRjaGVyOiBcIi91c2Vyc1wiLFxyXG5cclxuXHRtYWtlKHtzZXRUaXRsZSwgY29udGVudH0pIHtcclxuXHRcdHNldFRpdGxlKFwiQWxsIHVzZXJzXCIpO1xyXG5cclxuXHRcdC8vIGxvYWQgdGhlIGxpc3Qgb2YgdXNlcnNcclxuXHRcdGZldGNoKFwiL2FwaS9hdXRoL2luZm8vdXNlcnNcIiwge1xyXG5cdFx0XHRjcmVkZW50aWFsczogXCJpbmNsdWRlXCJcclxuXHRcdH0pXHJcblxyXG5cdFx0LnRoZW4ocmVzID0+IHJlcy5qc29uKCkpXHJcblxyXG5cdFx0LnRoZW4oKHtzdGF0dXMsIGRhdGE6IHVzZXJzfSkgPT4ge1xyXG5cdFx0XHQvLyBub3QgYXV0aGVudGljYXRlZFxyXG5cdFx0XHRpZihzdGF0dXMgPT0gXCJmYWlsXCIpIHtcclxuXHRcdFx0XHRsaWZlTGluZS5tYWtlRG9tKHtcclxuXHRcdFx0XHRcdHBhcmVudDogY29udGVudCxcclxuXHRcdFx0XHRcdGNsYXNzZXM6IFwiY29udGVudC1wYWRkZWRcIixcclxuXHRcdFx0XHRcdHRleHQ6IFwiWW91IGRvIG5vdCBoYXZlIGFjY2VzcyB0byB0aGUgdXNlciBsaXN0XCJcclxuXHRcdFx0XHR9KTtcclxuXHJcblx0XHRcdFx0cmV0dXJuO1xyXG5cdFx0XHR9XHJcblxyXG5cdFx0XHQvLyBzb3J0IGJ5IGFkbWluIHN0YXR1c1xyXG5cdFx0XHR1c2Vycy5zb3J0KChhLCBiKSA9PiB7XHJcblx0XHRcdFx0Ly8gc29ydCBhZG1pbnNcclxuXHRcdFx0XHRpZihhLmFkbWluICYmICFiLmFkbWluKSByZXR1cm4gLTE7XHJcblx0XHRcdFx0aWYoIWEuYWRtaW4gJiYgYi5hZG1pbikgcmV0dXJuIDE7XHJcblxyXG5cdFx0XHRcdC8vIHNvcnQgYnkgdXNlcm5hbWVcclxuXHRcdFx0XHRpZihhLnVzZXJuYW1lIDwgYi51c2VybmFtZSkgcmV0dXJuIC0xO1xyXG5cdFx0XHRcdGlmKGEudXNlcm5hbWUgPiBiLnVzZXJuYW1lKSByZXR1cm4gMTtcclxuXHJcblx0XHRcdFx0cmV0dXJuIDA7XHJcblx0XHRcdH0pO1xyXG5cclxuXHRcdFx0dmFyIGRpc3BsYXlVc2VycyA9IHtcclxuXHRcdFx0XHRBZG1pbnM6IFtdLFxyXG5cdFx0XHRcdFVzZXJzOiBbXVxyXG5cdFx0XHR9O1xyXG5cclxuXHRcdFx0Ly8gZ2VuZXJhdGUgdGhlIHVzZXIgbGlzdFxyXG5cdFx0XHR1c2Vycy5mb3JFYWNoKHVzZXIgPT4ge1xyXG5cdFx0XHRcdC8vIHNvcnQgdGhlIHVzZXJzIGludG8gYWRtaW5zIGFuZCB1c2Vyc1xyXG5cdFx0XHRcdGRpc3BsYXlVc2Vyc1t1c2VyLmFkbWluID8gXCJBZG1pbnNcIiA6IFwiVXNlcnNcIl1cclxuXHJcblx0XHRcdFx0LnB1c2goe1xyXG5cdFx0XHRcdFx0aHJlZjogYC91c2VyLyR7dXNlci51c2VybmFtZX1gLFxyXG5cdFx0XHRcdFx0aXRlbXM6IFt7XHJcblx0XHRcdFx0XHRcdHRleHQ6IHVzZXIudXNlcm5hbWUsXHJcblx0XHRcdFx0XHRcdGdyb3c6IHRydWVcclxuXHRcdFx0XHRcdH1dXHJcblx0XHRcdFx0fSk7XHJcblx0XHRcdH0pO1xyXG5cclxuXHRcdFx0Ly8gZGlzcGxheSB0aGUgdXNlciBsaXN0XHJcblx0XHRcdGxpZmVMaW5lLm1ha2VEb20oe1xyXG5cdFx0XHRcdHBhcmVudDogY29udGVudCxcclxuXHRcdFx0XHR3aWRnZXQ6IFwibGlzdFwiLFxyXG5cdFx0XHRcdGl0ZW1zOiBkaXNwbGF5VXNlcnNcclxuXHRcdFx0fSk7XHJcblx0XHR9KVxyXG5cclxuXHRcdC8vIHNvbWV0aGluZyB3ZW50IHdyb25nIHNob3cgYW4gZXJyb3IgbWVzc2FnZVxyXG5cdFx0LmNhdGNoKGVyciA9PiB7XHJcblx0XHRcdGxpZmVMaW5lLm1ha2VEb20oe1xyXG5cdFx0XHRcdGNsYXNzZXM6IFwiY29udGVudC1wYWRkZWRcIixcclxuXHRcdFx0XHR0ZXh0OiBlcnIubWVzc2FnZVxyXG5cdFx0XHR9KTtcclxuXHRcdH0pO1xyXG5cdH1cclxufSk7XHJcbiIsIi8qKlxyXG4gKiBUaGUgbWFpbiBjb250ZW50IHBhbmUgZm9yIHRoZSBhcHBcclxuICovXHJcblxyXG5saWZlTGluZS5tYWtlRG9tLnJlZ2lzdGVyKFwiY29udGVudFwiLCB7XHJcblx0bWFrZSgpIHtcclxuXHRcdHJldHVybiBbXHJcblx0XHRcdHtcclxuXHRcdFx0XHRjbGFzc2VzOiBcInRvb2xiYXJcIixcclxuXHRcdFx0XHRjaGlsZHJlbjogW1xyXG5cdFx0XHRcdFx0e1xyXG5cdFx0XHRcdFx0XHR0YWc6IFwic3ZnXCIsXHJcblx0XHRcdFx0XHRcdGNsYXNzZXM6IFwibWVudS1pY29uXCIsXHJcblx0XHRcdFx0XHRcdGF0dHJzOiB7XHJcblx0XHRcdFx0XHRcdFx0dmlld0JveDogXCIwIDAgNjAgNTBcIixcclxuXHRcdFx0XHRcdFx0XHR3aWR0aDogXCIyMFwiLFxyXG5cdFx0XHRcdFx0XHRcdGhlaWdodDogXCIxNVwiXHJcblx0XHRcdFx0XHRcdH0sXHJcblx0XHRcdFx0XHRcdGNoaWxkcmVuOiBbXHJcblx0XHRcdFx0XHRcdFx0eyB0YWc6IFwibGluZVwiLCBhdHRyczogeyB4MTogXCIwXCIsIHkxOiBcIjVcIiwgeDI6IFwiNjBcIiwgeTI6IFwiNVwiIH0gfSxcclxuXHRcdFx0XHRcdFx0XHR7IHRhZzogXCJsaW5lXCIsIGF0dHJzOiB7IHgxOiBcIjBcIiwgeTE6IFwiMjVcIiwgeDI6IFwiNjBcIiwgeTI6IFwiMjVcIiB9IH0sXHJcblx0XHRcdFx0XHRcdFx0eyB0YWc6IFwibGluZVwiLCBhdHRyczogeyB4MTogXCIwXCIsIHkxOiBcIjQ1XCIsIHgyOiBcIjYwXCIsIHkyOiBcIjQ1XCIgfSB9XHJcblx0XHRcdFx0XHRcdF0sXHJcblx0XHRcdFx0XHRcdG9uOiB7XHJcblx0XHRcdFx0XHRcdFx0Y2xpY2s6ICgpID0+IGRvY3VtZW50LmJvZHkuY2xhc3NMaXN0LnRvZ2dsZShcInNpZGViYXItb3BlblwiKVxyXG5cdFx0XHRcdFx0XHR9XHJcblx0XHRcdFx0XHR9LFxyXG5cdFx0XHRcdFx0e1xyXG5cdFx0XHRcdFx0XHRjbGFzc2VzOiBcInRvb2xiYXItdGl0bGVcIixcclxuXHRcdFx0XHRcdFx0bmFtZTogXCJ0aXRsZVwiXHJcblx0XHRcdFx0XHR9LFxyXG5cdFx0XHRcdFx0e1xyXG5cdFx0XHRcdFx0XHRjbGFzc2VzOiBcInRvb2xiYXItYnV0dG9uc1wiLFxyXG5cdFx0XHRcdFx0XHRuYW1lOiBcImJ0bnNcIlxyXG5cdFx0XHRcdFx0fVxyXG5cdFx0XHRcdF1cclxuXHRcdFx0fSxcclxuXHRcdFx0e1xyXG5cdFx0XHRcdGNsYXNzZXM6IFwiY29udGVudFwiLFxyXG5cdFx0XHRcdG5hbWU6IFwiY29udGVudFwiXHJcblx0XHRcdH1cclxuXHRcdF07XHJcblx0fSxcclxuXHJcblx0YmluZChvcHRzLCB7dGl0bGUsIGJ0bnMsIGNvbnRlbnR9KSB7XHJcblx0XHR2YXIgZGlzcG9zYWJsZTtcclxuXHJcblx0XHQvLyBzZXQgdGhlIHBhZ2UgdGl0bGVcclxuXHRcdHZhciBzZXRUaXRsZSA9IGZ1bmN0aW9uKHRpdGxlVGV4dCkge1xyXG5cdFx0XHR0aXRsZS5pbm5lclRleHQgPSB0aXRsZVRleHQ7XHJcblx0XHRcdGRvY3VtZW50LnRpdGxlID0gdGl0bGVUZXh0O1xyXG5cdFx0fTtcclxuXHJcblx0XHQvLyBhZGQgYW4gYWN0aW9uIGJ1dHRvblxyXG5cdFx0bGlmZUxpbmUub24oXCJhY3Rpb24tY3JlYXRlXCIsIG5hbWUgPT4ge1xyXG5cdFx0XHRsaWZlTGluZS5tYWtlRG9tKHtcclxuXHRcdFx0XHRwYXJlbnQ6IGJ0bnMsXHJcblx0XHRcdFx0dGFnOiBcImJ1dHRvblwiLFxyXG5cdFx0XHRcdGNsYXNzZXM6IFwidG9vbGJhci1idXR0b25cIixcclxuXHRcdFx0XHR0ZXh0OiBuYW1lLFxyXG5cdFx0XHRcdGF0dHJzOiB7XHJcblx0XHRcdFx0XHRcImRhdGEtbmFtZVwiOiBuYW1lXHJcblx0XHRcdFx0fSxcclxuXHRcdFx0XHRvbjoge1xyXG5cdFx0XHRcdFx0Y2xpY2s6ICgpID0+IGxpZmVMaW5lLmVtaXQoXCJhY3Rpb24tZXhlYy1cIiArIG5hbWUpXHJcblx0XHRcdFx0fVxyXG5cdFx0XHR9KTtcclxuXHRcdH0pO1xyXG5cclxuXHRcdC8vIHJlbW92ZSBhbiBhY3Rpb24gYnV0dG9uXHJcblx0XHRsaWZlTGluZS5vbihcImFjdGlvbi1yZW1vdmVcIiwgbmFtZSA9PiB7XHJcblx0XHRcdHZhciBidG4gPSBidG5zLnF1ZXJ5U2VsZWN0b3IoYFtkYXRhLW5hbWU9XCIke25hbWV9XCJdYCk7XHJcblxyXG5cdFx0XHRpZihidG4pIGJ0bi5yZW1vdmUoKTtcclxuXHRcdH0pO1xyXG5cclxuXHRcdC8vIHJlbW92ZSBhbGwgdGhlIGFjdGlvbiBidXR0b25zXHJcblx0XHRsaWZlTGluZS5vbihcImFjdGlvbi1yZW1vdmUtYWxsXCIsICgpID0+IGJ0bnMuaW5uZXJIVE1MID0gXCJcIik7XHJcblxyXG5cdFx0Ly8gZGlzcGxheSB0aGUgY29udGVudCBmb3IgdGhlIHZpZXdcclxuXHRcdHZhciB1cGRhdGVWaWV3ID0gKCkgPT4ge1xyXG5cdFx0XHQvLyBkZXN0cm95IGFueSBsaXN0ZW5lcnMgZnJvbSBvbGQgY29udGVudFxyXG5cdFx0XHRpZihkaXNwb3NhYmxlKSB7XHJcblx0XHRcdFx0ZGlzcG9zYWJsZS5kaXNwb3NlKCk7XHJcblx0XHRcdH1cclxuXHJcblx0XHRcdC8vIHJlbW92ZSBhbnkgYWN0aW9uIGJ1dHRvbnNcclxuXHRcdFx0bGlmZUxpbmUuZW1pdChcImFjdGlvbi1yZW1vdmUtYWxsXCIpO1xyXG5cclxuXHRcdFx0Ly8gY2xlYXIgYWxsIHRoZSBvbGQgY29udGVudFxyXG5cdFx0XHRjb250ZW50LmlubmVySFRNTCA9IFwiXCI7XHJcblxyXG5cdFx0XHQvLyBjcmVhdGUgdGhlIGRpc3Bvc2FibGUgZm9yIHRoZSBjb250ZW50XHJcblx0XHRcdGRpc3Bvc2FibGUgPSBuZXcgbGlmZUxpbmUuRGlzcG9zYWJsZSgpO1xyXG5cclxuXHRcdFx0dmFyIG1ha2VyID0gbm90Rm91bmRNYWtlciwgbWF0Y2g7XHJcblxyXG5cdFx0XHQvLyBmaW5kIHRoZSBjb3JyZWN0IGNvbnRlbnQgbWFrZXJcclxuXHRcdFx0Zm9yKGxldCAkbWFrZXIgb2YgY29udGVudE1ha2Vycykge1xyXG5cdFx0XHRcdC8vIHJ1biBhIG1hdGNoZXIgZnVuY3Rpb25cclxuXHRcdFx0XHRpZih0eXBlb2YgJG1ha2VyLm1hdGNoZXIgPT0gXCJmdW5jdGlvblwiKSB7XHJcblx0XHRcdFx0XHRtYXRjaCA9ICRtYWtlci5tYXRjaGVyKGxvY2F0aW9uLnBhdGhuYW1lKTtcclxuXHRcdFx0XHR9XHJcblx0XHRcdFx0Ly8gYSBzdHJpbmcgbWF0Y2hcclxuXHRcdFx0XHRlbHNlIGlmKHR5cGVvZiAkbWFrZXIubWF0Y2hlciA9PSBcInN0cmluZ1wiKSB7XHJcblx0XHRcdFx0XHRpZigkbWFrZXIubWF0Y2hlciA9PSBsb2NhdGlvbi5wYXRobmFtZSkge1xyXG5cdFx0XHRcdFx0XHRtYXRjaCA9ICRtYWtlci5tYXRjaGVyO1xyXG5cdFx0XHRcdFx0fVxyXG5cdFx0XHRcdH1cclxuXHRcdFx0XHQvLyBhIHJlZ2V4IG1hdGNoXHJcblx0XHRcdFx0ZWxzZSB7XHJcblx0XHRcdFx0XHRtYXRjaCA9ICRtYWtlci5tYXRjaGVyLmV4ZWMobG9jYXRpb24ucGF0aG5hbWUpO1xyXG5cdFx0XHRcdH1cclxuXHJcblx0XHRcdFx0Ly8gbWF0Y2ggZm91bmQgc3RvcCBzZWFyY2hpbmdcclxuXHRcdFx0XHRpZihtYXRjaCkge1xyXG5cdFx0XHRcdFx0bWFrZXIgPSAkbWFrZXI7XHJcblxyXG5cdFx0XHRcdFx0YnJlYWs7XHJcblx0XHRcdFx0fVxyXG5cdFx0XHR9XHJcblxyXG5cdFx0XHQvLyBtYWtlIHRoZSBjb250ZW50IGZvciB0aGlzIHJvdXRlXHJcblx0XHRcdG1ha2VyLm1ha2Uoe2Rpc3Bvc2FibGUsIHNldFRpdGxlLCBjb250ZW50LCBtYXRjaH0pO1xyXG5cdFx0fTtcclxuXHJcblx0XHQvLyBzd2l0Y2ggcGFnZXNcclxuXHRcdGxpZmVMaW5lLm5hdi5uYXZpZ2F0ZSA9IGZ1bmN0aW9uKHVybCkge1xyXG5cdFx0XHQvLyB1cGRhdGUgdGhlIHVybFxyXG5cdFx0XHRoaXN0b3J5LnB1c2hTdGF0ZShudWxsLCBudWxsLCB1cmwpO1xyXG5cclxuXHRcdFx0Ly8gc2hvdyB0aGUgbmV3IHZpZXdcclxuXHRcdFx0dXBkYXRlVmlldygpO1xyXG5cdFx0fTtcclxuXHJcblx0XHQvLyBzd2l0Y2ggcGFnZXMgd2hlbiB0aGUgdXNlciBwdXNoZXMgdGhlIGJhY2sgYnV0dG9uXHJcblx0XHR3aW5kb3cuYWRkRXZlbnRMaXN0ZW5lcihcInBvcHN0YXRlXCIsICgpID0+IHVwZGF0ZVZpZXcoKSk7XHJcblxyXG5cdFx0Ly8gc2hvdyB0aGUgaW5pdGlhbCB2aWV3XHJcblx0XHR1cGRhdGVWaWV3KCk7XHJcblx0fVxyXG59KTtcclxuXHJcbi8vIGFsbCBjb250ZW50IHByb2R1Y2Vyc1xyXG52YXIgY29udGVudE1ha2VycyA9IFtdO1xyXG5cclxuLy8gY3JlYXRlIHRoZSBuYW1lc3BhY2VcclxubGlmZUxpbmUubmF2ID0ge307XHJcblxyXG4vLyByZWdpc3RlciBhIGNvbnRlbnQgbWFrZXJcclxubGlmZUxpbmUubmF2LnJlZ2lzdGVyID0gZnVuY3Rpb24obWFrZXIpIHtcclxuXHRjb250ZW50TWFrZXJzLnB1c2gobWFrZXIpO1xyXG59O1xyXG5cclxuLy8gdGhlIGZhbGwgYmFjayBtYWtlciBmb3Igbm8gc3VjaCBwYWdlXHJcbnZhciBub3RGb3VuZE1ha2VyID0ge1xyXG5cdG1ha2Uoe3NldFRpdGxlLCBjb250ZW50fSkge1xyXG5cdFx0Ly8gdXBkYXRlIHRoZSBwYWdlIHRpdGxlXHJcblx0XHRzZXRUaXRsZShcIk5vdCBmb3VuZFwiKTtcclxuXHJcblx0XHRsaWZlTGluZS5tYWtlRG9tKHtcclxuXHRcdFx0cGFyZW50OiBjb250ZW50LFxyXG5cdFx0XHRjbGFzc2VzOiBcImNvbnRlbnQtcGFkZGVkXCIsXHJcblx0XHRcdGNoaWxkcmVuOiBbXHJcblx0XHRcdFx0e1xyXG5cdFx0XHRcdFx0dGFnOiBcInNwYW5cIixcclxuXHRcdFx0XHRcdHRleHQ6IFwiVGhlIHBhZ2UgeW91IGFyZSBsb29raW5nIGZvciBjb3VsZCBub3QgYmUgZm91bmQuIFwiXHJcblx0XHRcdFx0fSxcclxuXHRcdFx0XHR7XHJcblx0XHRcdFx0XHR3aWRnZXQ6IFwibGlua1wiLFxyXG5cdFx0XHRcdFx0aHJlZjogXCIvXCIsXHJcblx0XHRcdFx0XHR0ZXh0OiBcIkdvIGhvbWVcIlxyXG5cdFx0XHRcdH1cclxuXHRcdFx0XVxyXG5cdFx0fSk7XHJcblx0fVxyXG59O1xyXG4iLCIvKipcclxuICogQ3JlYXRlIGFuIGlucHV0IGZpZWxkXHJcbiAqL1xyXG5cclxubGlmZUxpbmUubWFrZURvbS5yZWdpc3RlcihcImlucHV0XCIsIHtcclxuXHRtYWtlKHt0YWcsIHR5cGUsIHZhbHVlLCBjaGFuZ2UsIGJpbmQsIHByb3AsIHBsYWNlaG9sZGVyLCBjbGFzc2VzfSkge1xyXG5cdFx0Ly8gc2V0IHRoZSBpbml0aWFsIHZhbHVlIG9mIHRoZSBib3VuZCBvYmplY3RcclxuXHRcdGlmKHR5cGVvZiBiaW5kID09IFwib2JqZWN0XCIgJiYgIXZhbHVlKSB7XHJcblx0XHRcdHZhbHVlID0gYmluZFtwcm9wXTtcclxuXHRcdH1cclxuXHJcblx0XHR2YXIgaW5wdXQgPSB7XHJcblx0XHRcdHRhZzogdGFnIHx8IFwiaW5wdXRcIixcclxuXHRcdFx0Y2xhc3NlczogY2xhc3NlcyB8fCBgJHt0YWcgPT0gXCJ0ZXh0YXJlYVwiID8gXCJ0ZXh0YXJlYVwiIDogXCJpbnB1dFwifS1maWxsYCxcclxuXHRcdFx0YXR0cnM6IHt9LFxyXG5cdFx0XHRvbjoge1xyXG5cdFx0XHRcdGlucHV0OiBlID0+IHtcclxuXHRcdFx0XHRcdC8vIHVwZGF0ZSB0aGUgcHJvcGVydHkgY2hhbmdlZFxyXG5cdFx0XHRcdFx0aWYodHlwZW9mIGJpbmQgPT0gXCJvYmplY3RcIikge1xyXG5cdFx0XHRcdFx0XHRiaW5kW3Byb3BdID0gZS50YXJnZXQudmFsdWU7XHJcblx0XHRcdFx0XHR9XHJcblxyXG5cdFx0XHRcdFx0Ly8gY2FsbCB0aGUgY2FsbGJhY2tcclxuXHRcdFx0XHRcdGlmKHR5cGVvZiBjaGFuZ2UgPT0gXCJmdW5jdGlvblwiKSB7XHJcblx0XHRcdFx0XHRcdGNoYW5nZShlLnRhcmdldC52YWx1ZSk7XHJcblx0XHRcdFx0XHR9XHJcblx0XHRcdFx0fVxyXG5cdFx0XHR9XHJcblx0XHR9O1xyXG5cclxuXHRcdC8vIGF0dGFjaCB2YWx1ZXMgaWYgdGhleSBhcmUgZ2l2ZW5cclxuXHRcdGlmKHR5cGUpIGlucHV0LmF0dHJzLnR5cGUgPSB0eXBlO1xyXG5cdFx0aWYodmFsdWUpIGlucHV0LmF0dHJzLnZhbHVlID0gdmFsdWU7XHJcblx0XHRpZihwbGFjZWhvbGRlcikgaW5wdXQuYXR0cnMucGxhY2Vob2xkZXIgPSBwbGFjZWhvbGRlcjtcclxuXHJcblx0XHQvLyBmb3IgdGV4dGFyZWFzIHNldCBpbm5lclRleHRcclxuXHRcdGlmKHRhZyA9PSBcInRleHRhcmVhXCIpIHtcclxuXHRcdFx0aW5wdXQudGV4dCA9IHZhbHVlO1xyXG5cdFx0fVxyXG5cclxuXHRcdHJldHVybiBpbnB1dDtcclxuXHR9XHJcbn0pO1xyXG4iLCIvKipcclxuICogQSB3aWRnZXQgdGhhdCBjcmVhdGVzIGEgbGluayB0aGF0IGhvb2tzIGludG8gdGhlIG5hdmlnYXRvclxyXG4gKi9cclxuXHJcbmxpZmVMaW5lLm1ha2VEb20ucmVnaXN0ZXIoXCJsaW5rXCIsIHtcclxuXHRtYWtlKG9wdHMpIHtcclxuXHRcdHJldHVybiB7XHJcblx0XHRcdHRhZzogXCJhXCIsXHJcblx0XHRcdGF0dHJzOiB7XHJcblx0XHRcdFx0aHJlZjogb3B0cy5ocmVmXHJcblx0XHRcdH0sXHJcblx0XHRcdG9uOiB7XHJcblx0XHRcdFx0Y2xpY2s6IGUgPT4ge1xyXG5cdFx0XHRcdFx0Ly8gZG9uJ3Qgb3ZlciByaWRlIGN0cmwgb3IgYWx0IG9yIHNoaWZ0IGNsaWNrc1xyXG5cdFx0XHRcdFx0aWYoZS5jdHJsS2V5IHx8IGUuYWx0S2V5IHx8IGUuc2hpZnRLZXkpIHJldHVybjtcclxuXHJcblx0XHRcdFx0XHQvLyBkb24ndCBuYXZpZ2F0ZSB0aGUgcGFnZVxyXG5cdFx0XHRcdFx0ZS5wcmV2ZW50RGVmYXVsdCgpO1xyXG5cclxuXHRcdFx0XHRcdGxpZmVMaW5lLm5hdi5uYXZpZ2F0ZShvcHRzLmhyZWYpXHJcblx0XHRcdFx0fVxyXG5cdFx0XHR9LFxyXG5cdFx0XHR0ZXh0OiBvcHRzLnRleHRcclxuXHRcdH07XHJcblx0fVxyXG59KTtcclxuIiwiLyoqXHJcbiAqIERpc3BsYXkgYSBsaXN0IHdpdGggZ3JvdXAgaGVhZGluZ3NcclxuICovXHJcblxyXG5saWZlTGluZS5tYWtlRG9tLnJlZ2lzdGVyKFwibGlzdFwiLCB7XHJcblx0bWFrZSh7aXRlbXN9KSB7XHJcblx0XHQvLyBhZGQgYWxsIHRoZSBncm91cHNcclxuXHRcdHJldHVybiBPYmplY3QuZ2V0T3duUHJvcGVydHlOYW1lcyhpdGVtcylcclxuXHJcblx0XHQubWFwKGdyb3VwTmFtZSA9PiBtYWtlR3JvdXAoZ3JvdXBOYW1lLCBpdGVtc1tncm91cE5hbWVdKSk7XHJcblx0fVxyXG59KTtcclxuXHJcbi8vIG1ha2UgYSBzaW5nbGUgZ3JvdXBcclxudmFyIG1ha2VHcm91cCA9IGZ1bmN0aW9uKG5hbWUsIGl0ZW1zLCBwYXJlbnQpIHtcclxuXHQvLyBhZGQgdGhlIGxpc3QgaGVhZGVyXHJcblx0aXRlbXMudW5zaGlmdCh7XHJcblx0XHRjbGFzc2VzOiBcImxpc3QtaGVhZGVyXCIsXHJcblx0XHR0ZXh0OiBuYW1lXHJcblx0fSk7XHJcblxyXG5cdC8vIHJlbmRlciB0aGUgaXRlbVxyXG5cdHJldHVybiB7XHJcblx0XHRwYXJlbnQsXHJcblx0XHRjbGFzc2VzOiBcImxpc3Qtc2VjdGlvblwiLFxyXG5cdFx0Y2hpbGRyZW46IGl0ZW1zLm1hcCgoaXRlbSwgaW5kZXgpID0+IHtcclxuXHRcdFx0Ly8gZG9uJ3QgbW9kaWZ5IHRoZSBoZWFkZXJcclxuXHRcdFx0aWYoaW5kZXggPT09IDApIHJldHVybiBpdGVtO1xyXG5cclxuXHRcdFx0dmFyIGl0ZW1Eb207XHJcblxyXG5cdFx0XHQvLyBjcmVhdGUgYW4gaXRlbVxyXG5cdFx0XHRpZih0eXBlb2YgaXRlbSAhPSBcInN0cmluZ1wiKSB7XHJcblx0XHRcdFx0aXRlbURvbSA9IHtcclxuXHRcdFx0XHRcdGNsYXNzZXM6IFwibGlzdC1pdGVtXCIsXHJcblx0XHRcdFx0XHRjaGlsZHJlbjogKGl0ZW0uaXRlbXMgfHwgaXRlbSkubWFwKGl0ZW0gPT4ge1xyXG5cdFx0XHRcdFx0XHRyZXR1cm4ge1xyXG5cdFx0XHRcdFx0XHRcdC8vIGdldCB0aGUgbmFtZSBvZiB0aGUgaXRlbVxyXG5cdFx0XHRcdFx0XHRcdHRleHQ6IHR5cGVvZiBpdGVtID09IFwic3RyaW5nXCIgPyBpdGVtIDogaXRlbS50ZXh0LFxyXG5cdFx0XHRcdFx0XHRcdC8vIHNldCB3aGV0aGVyIHRoZSBpdGVtIHNob3VsZCBncm93XHJcblx0XHRcdFx0XHRcdFx0Y2xhc3NlczogaXRlbS5ncm93ID8gXCJsaXN0LWl0ZW0tZ3Jvd1wiIDogXCJsaXN0LWl0ZW0tcGFydFwiXHJcblx0XHRcdFx0XHRcdH07XHJcblx0XHRcdFx0XHR9KVxyXG5cdFx0XHRcdH07XHJcblx0XHRcdH1cclxuXHRcdFx0ZWxzZSB7XHJcblx0XHRcdFx0aXRlbURvbSA9IHtcclxuXHRcdFx0XHRcdGNsYXNzZXM6IFwibGlzdC1pdGVtXCIsXHJcblx0XHRcdFx0XHR0ZXh0OiBpdGVtXHJcblx0XHRcdFx0fTtcclxuXHRcdFx0fVxyXG5cclxuXHRcdFx0Ly8gbWFrZSB0aGUgaXRlbSBhIGxpbmtcclxuXHRcdFx0aWYoaXRlbS5ocmVmKSB7XHJcblx0XHRcdFx0aXRlbURvbS5vbiA9IHtcclxuXHRcdFx0XHRcdGNsaWNrOiAoKSA9PiBsaWZlTGluZS5uYXYubmF2aWdhdGUoaXRlbS5ocmVmKVxyXG5cdFx0XHRcdH07XHJcblx0XHRcdH1cclxuXHJcblx0XHRcdHJldHVybiBpdGVtRG9tO1xyXG5cdFx0fSlcclxuXHR9O1xyXG59O1xyXG4iLCIvKipcclxuICogVGhlIHByb2dyZXNzIGJhciBhdCB0aGUgdG9wIG9mIHRoZSBwYWdlXHJcbiAqL1xyXG5cclxubGlmZUxpbmUubWFrZURvbS5yZWdpc3RlcihcInByb2dyZXNzXCIsIHtcclxuXHRtYWtlKCkge1xyXG5cdFx0cmV0dXJuIHtcclxuXHRcdFx0Y2xhc3NlczogXCJwcm9ncmVzc1wiLFxyXG5cdFx0XHRuYW1lOiBcInByb2dyZXNzXCJcclxuXHRcdH07XHJcblx0fSxcclxuXHJcblx0YmluZChvcHRzLCB7cHJvZ3Jlc3N9KSB7XHJcblx0XHQvLyBzZXQgdGhlIHByb2dyZXNzIGJhciB2YWx1ZSBbMCwgMV1cclxuXHRcdHZhciBzZXRQcm9ncmVzcyA9IGZ1bmN0aW9uKHZhbHVlKSB7XHJcblx0XHRcdHZhciBhZGp1c3RCeSA9IDA7XHJcblxyXG5cdFx0XHRpZih2YWx1ZSA+IDApIHtcclxuXHRcdFx0XHQvLyBzY2FsZSBsZWF2ZXMgdGhlIHByb2dyZXNzIGJhciBwZXJmZWN0bHkgaW4gdGhlIG1pZGRsZSBvZiB0aGUgcGFnZVxyXG5cdFx0XHRcdC8vIDEgLSB2YWx1ZSBnZXRzIHRoZSBhbW91bnQgb2Ygc3BhY2UgcmVtYWluaW5nXHJcblx0XHRcdFx0Ly8gLyAyIGdldHMganVzdCB0aGUgc3BhY2Ugb24gb25lIHNpZGVcclxuXHRcdFx0XHQvLyAvIHZhbHVlIGdldHMgdGhhdCBhbW91bnQgcmVsaXRpdmUgdG8gdGhlIHByb2dyZXNzIGJhcnMgc2NhbGVkIHdpZHRoXHJcblx0XHRcdFx0Ly8gKiAxMDAgY29udmVydHMgaXQgdG8gYSBwZXJjZW50XHJcblx0XHRcdFx0YWRqdXN0QnkgPSAoMSAtIHZhbHVlKSAvIDIgLyB2YWx1ZSAqIDEwMDtcclxuXHRcdFx0fVxyXG5cclxuXHRcdFx0cHJvZ3Jlc3Muc3R5bGUudHJhbnNmb3JtID0gYHNjYWxlWCgke3ZhbHVlfSkgdHJhbnNsYXRlWCgtJHthZGp1c3RCeX0lKWA7XHJcblx0XHR9O1xyXG5cclxuXHRcdC8vIGhpZGUgdGhlIHByb2dyZXNzIGJhciBpbml0aWFsbHlcclxuXHRcdHByb2dyZXNzLnN0eWxlLnRyYW5zZm9ybSA9IFwic2NhbGVYKDApXCI7XHJcblxyXG5cdFx0cmVuZGVyID0gZnVuY3Rpb24oKSB7XHJcblx0XHRcdC8vIGNhbGN1bGF0ZSBob3cgbXVjaCB0aGlzIHBlcmNlbnQgY29udHJpYnV0ZXMgdG8gdGhlIG92ZXJhbGwgcHJvZ3Jlc3NcclxuXHRcdFx0dmFyIGNvbnRyaWJ1dGlvbiA9IDEgLyBwcm9ncmVzc2VzLmxlbmd0aDtcclxuXHJcblx0XHRcdHNldFByb2dyZXNzKFxyXG5cdFx0XHRcdHByb2dyZXNzZXMucmVkdWNlKChwcm9nLCBwZXJjKSA9PiBwcm9nICsgcGVyYy52YWx1ZSAqIGNvbnRyaWJ1dGlvbiwgMClcclxuXHRcdFx0KTtcclxuXHRcdH07XHJcblxyXG5cdFx0cmVuZGVyKCk7XHJcblx0fVxyXG59KTtcclxuXHJcbi8vIHN1YiByZW5kZXIgdW50aWwgcHJvZ3Jlc3MgaXMgY3JlYXRlZFxyXG52YXIgcmVuZGVyID0gKCkgPT4ge307XHJcblxyXG52YXIgcHJvZ3Jlc3NlcyA9IFtdO1xyXG5cclxuLy8gY29tYmluZSBtdWx0aXBsZSBwcm9ncmVzcyBsZXZlbHNcclxubGlmZUxpbmUuUHJvZ3Jlc3MgPSBjbGFzcyB7XHJcblx0Y29uc3RydWN0b3IoKSB7XHJcblx0XHR0aGlzLnZhbHVlID0gMDtcclxuXHJcblx0XHRwcm9ncmVzc2VzLnB1c2godGhpcyk7XHJcblxyXG5cdFx0cmVuZGVyKCk7XHJcblx0fVxyXG5cclxuXHQvLyBzZXQgdGhlIHByb2dyZXNzXHJcblx0c2V0KHZhbHVlKSB7XHJcblx0XHR0aGlzLnZhbHVlID0gdmFsdWU7XHJcblxyXG5cdFx0Ly8gYWxsIHRoZSBqb2JzIGFyZSBkb25lIHJlbW92ZSB0aGVtXHJcblx0XHRpZihwcm9ncmVzc2VzLmV2ZXJ5KHByb2cgPT4gcHJvZy52YWx1ZSA9PSAxKSkge1xyXG5cdFx0XHRwcm9ncmVzc2VzID0gW107XHJcblx0XHR9XHJcblxyXG5cdFx0cmVuZGVyKCk7XHJcblx0fVxyXG59O1xyXG4iLCIvKipcclxuICogVGhlIHdpZGdldCBmb3IgdGhlIHNpZGViYXJcclxuICovXHJcblxyXG5saWZlTGluZS5tYWtlRG9tLnJlZ2lzdGVyKFwic2lkZWJhclwiLCB7XHJcblx0bWFrZSgpIHtcclxuXHRcdHJldHVybiBbXHJcblx0XHRcdHtcclxuXHRcdFx0XHRjbGFzc2VzOiBcInNpZGViYXJcIixcclxuXHRcdFx0XHRuYW1lOiBcInNpZGViYXJcIixcclxuXHRcdFx0XHRjaGlsZHJlbjogW1xyXG5cdFx0XHRcdFx0e1xyXG5cdFx0XHRcdFx0XHRjbGFzc2VzOiBbXCJzaWRlYmFyLWFjdGlvbnNcIiwgXCJoaWRkZW5cIl0sXHJcblx0XHRcdFx0XHRcdG5hbWU6IFwiYWN0aW9uc1wiLFxyXG5cdFx0XHRcdFx0XHRjaGlsZHJlbjogW1xyXG5cdFx0XHRcdFx0XHRcdHtcclxuXHRcdFx0XHRcdFx0XHRcdGNsYXNzZXM6IFwic2lkZWJhci1oZWFkaW5nXCIsXHJcblx0XHRcdFx0XHRcdFx0XHR0ZXh0OiBcIlBhZ2UgYWN0aW9uc1wiXHJcblx0XHRcdFx0XHRcdFx0fVxyXG5cdFx0XHRcdFx0XHRdXHJcblx0XHRcdFx0XHR9LFxyXG5cdFx0XHRcdFx0e1xyXG5cdFx0XHRcdFx0XHRjbGFzc2VzOiBcInNpZGViYXItaGVhZGluZ1wiLFxyXG5cdFx0XHRcdFx0XHR0ZXh0OiBcIk1vcmUgYWN0aW9uc1wiXHJcblx0XHRcdFx0XHR9XHJcblx0XHRcdFx0XVxyXG5cdFx0XHR9LFxyXG5cdFx0XHR7XHJcblx0XHRcdFx0Y2xhc3NlczogXCJzaGFkZVwiLFxyXG5cdFx0XHRcdG9uOiB7XHJcblx0XHRcdFx0XHQvLyBjbG9zZSB0aGUgc2lkZWJhclxyXG5cdFx0XHRcdFx0Y2xpY2s6ICgpID0+IGRvY3VtZW50LmJvZHkuY2xhc3NMaXN0LnJlbW92ZShcInNpZGViYXItb3BlblwiKVxyXG5cdFx0XHRcdH1cclxuXHRcdFx0fVxyXG5cdFx0XTtcclxuXHR9LFxyXG5cclxuXHRiaW5kKG9wdHMsIHthY3Rpb25zLCBzaWRlYmFyfSkge1xyXG5cdFx0Ly8gYWRkIGEgY29tbWFuZCB0byB0aGUgc2lkZWJhclxyXG5cdFx0bGlmZUxpbmUuYWRkQ29tbWFuZCA9IGZ1bmN0aW9uKG5hbWUsIGZuKSB7XHJcblx0XHRcdC8vIG1ha2UgdGhlIHNpZGViYXIgaXRlbVxyXG5cdFx0XHR2YXIge2l0ZW19ID0gbGlmZUxpbmUubWFrZURvbSh7XHJcblx0XHRcdFx0cGFyZW50OiBzaWRlYmFyLFxyXG5cdFx0XHRcdHRhZzogXCJkaXZcIixcclxuXHRcdFx0XHRuYW1lOiBcIml0ZW1cIixcclxuXHRcdFx0XHRjbGFzc2VzOiBcInNpZGViYXItaXRlbVwiLFxyXG5cdFx0XHRcdHRleHQ6IG5hbWUsXHJcblx0XHRcdFx0b246IHtcclxuXHRcdFx0XHRcdGNsaWNrOiAoKSA9PiB7XHJcblx0XHRcdFx0XHRcdC8vIGNsb3NlIHRoZSBzaWRlYmFyXHJcblx0XHRcdFx0XHRcdGRvY3VtZW50LmJvZHkuY2xhc3NMaXN0LnJlbW92ZShcInNpZGViYXItb3BlblwiKTtcclxuXHJcblx0XHRcdFx0XHRcdC8vIGNhbGwgdGhlIGxpc3RlbmVyXHJcblx0XHRcdFx0XHRcdGZuKCk7XHJcblx0XHRcdFx0XHR9XHJcblx0XHRcdFx0fVxyXG5cdFx0XHR9KTtcclxuXHJcblx0XHRcdHJldHVybiB7XHJcblx0XHRcdFx0dW5zdWJzY3JpYmU6ICgpID0+IGl0ZW0ucmVtb3ZlKClcclxuXHRcdFx0fTtcclxuXHRcdH07XHJcblxyXG5cdFx0Ly8gYWRkIGEgbmF2aWdhdGlvbmFsIGNvbW1hbmRcclxuXHRcdGxpZmVMaW5lLmFkZE5hdkNvbW1hbmQgPSBmdW5jdGlvbihuYW1lLCB0bykge1xyXG5cdFx0XHRsaWZlTGluZS5hZGRDb21tYW5kKG5hbWUsICgpID0+IGxpZmVMaW5lLm5hdi5uYXZpZ2F0ZSh0bykpO1xyXG5cdFx0fTtcclxuXHJcblx0XHQvLyBhZGQgYSBzaWRlYmFyIGFjdGlvblxyXG5cdFx0bGlmZUxpbmUub24oXCJhY3Rpb24tY3JlYXRlXCIsIG5hbWUgPT4ge1xyXG5cdFx0XHQvLyBzaG93IHRoZSBhY3Rpb25zXHJcblx0XHRcdGFjdGlvbnMuY2xhc3NMaXN0LnJlbW92ZShcImhpZGRlblwiKTtcclxuXHJcblx0XHRcdC8vIGNyZWF0ZSB0aGUgYnV0dG9uXHJcblx0XHRcdGxpZmVMaW5lLm1ha2VEb20oe1xyXG5cdFx0XHRcdHBhcmVudDogYWN0aW9ucyxcclxuXHRcdFx0XHR0YWc6IFwiZGl2XCIsXHJcblx0XHRcdFx0bmFtZTogXCJpdGVtXCIsXHJcblx0XHRcdFx0Y2xhc3NlczogXCJzaWRlYmFyLWl0ZW1cIixcclxuXHRcdFx0XHR0ZXh0OiBuYW1lLFxyXG5cdFx0XHRcdGF0dHJzOiB7XHJcblx0XHRcdFx0XHRcImRhdGEtbmFtZVwiOiBuYW1lXHJcblx0XHRcdFx0fSxcclxuXHRcdFx0XHRvbjoge1xyXG5cdFx0XHRcdFx0Y2xpY2s6ICgpID0+IHtcclxuXHRcdFx0XHRcdFx0Ly8gY2xvc2UgdGhlIHNpZGViYXJcclxuXHRcdFx0XHRcdFx0ZG9jdW1lbnQuYm9keS5jbGFzc0xpc3QucmVtb3ZlKFwic2lkZWJhci1vcGVuXCIpO1xyXG5cclxuXHRcdFx0XHRcdFx0Ly8gdHJpZ2dlciB0aGUgYWN0aW9uXHJcblx0XHRcdFx0XHRcdGxpZmVMaW5lLmVtaXQoXCJhY3Rpb24tZXhlYy1cIiArIG5hbWUpO1xyXG5cdFx0XHRcdFx0fVxyXG5cdFx0XHRcdH1cclxuXHRcdFx0fSk7XHJcblxyXG5cdFx0XHQvLyByZW1vdmUgYSBzaWRlYmFyIGFjdGlvblxyXG5cdFx0XHRsaWZlTGluZS5vbihcImFjdGlvbi1yZW1vdmVcIiwgbmFtZSA9PiB7XHJcblx0XHRcdFx0Ly8gcmVtb3ZlIHRoZSBidXR0b25cclxuXHRcdFx0XHR2YXIgYnRuID0gYWN0aW9ucy5xdWVyeVNlbGVjdG9yKGBbZGF0YS1uYW1lPVwiJHtuYW1lfVwiXWApO1xyXG5cclxuXHRcdFx0XHRpZihidG4pIGJ0bi5yZW1vdmUoKTtcclxuXHJcblx0XHRcdFx0Ly8gaGlkZSB0aGUgcGFnZSBhY3Rpb25zIGlmIHRoZXJlIGFyZSBub25lXHJcblx0XHRcdFx0aWYoYWN0aW9ucy5jaGlsZHJlbi5sZW5ndGggPT0gMSkge1xyXG5cdFx0XHRcdFx0YWN0aW9ucy5jbGFzc0xpc3QuYWRkKFwiaGlkZGVuXCIpO1xyXG5cdFx0XHRcdH1cclxuXHRcdFx0fSk7XHJcblxyXG5cdFx0XHQvLyByZW1vdmUgYWxsIHRoZSBzaWRlYmFyIGFjdGlvbnNcclxuXHRcdFx0bGlmZUxpbmUub24oXCJhY3Rpb24tcmVtb3ZlLWFsbFwiLCAoKSA9PiB7XHJcblx0XHRcdFx0Ly8gcmVtb3ZlIGFsbCB0aGUgYWN0aW9uc1xyXG5cdFx0XHRcdHZhciBfYWN0aW9ucyA9IEFycmF5LmZyb20oYWN0aW9ucy5xdWVyeVNlbGVjdG9yQWxsKFwiLnNpZGViYXItaXRlbVwiKSk7XHJcblxyXG5cdFx0XHRcdF9hY3Rpb25zLmZvckVhY2goYWN0aW9uID0+IGFjdGlvbi5yZW1vdmUoKSk7XHJcblxyXG5cdFx0XHRcdC8vIHNpZGUgdGhlIHBhZ2UgYWN0aW9uc1xyXG5cdFx0XHRcdGFjdGlvbnMuY2xhc3NMaXN0LmFkZChcImhpZGRlblwiKTtcclxuXHRcdFx0fSk7XHJcblx0XHR9KTtcclxuXHR9XHJcbn0pO1xyXG4iLCIvKipcclxuICogQSByb3cgb2YgcmFkaW8gc3R5bGUgYnV0dG9uc1xyXG4gKi9cclxuXHJcbmxpZmVMaW5lLm1ha2VEb20ucmVnaXN0ZXIoXCJ0b2dnbGUtYnRuc1wiLCB7XHJcblx0bWFrZSh7YnRucywgdmFsdWV9KSB7XHJcblx0XHQvLyBhdXRvIHNlbGVjdCB0aGUgZmlyc3QgYnV0dG9uXHJcblx0XHRpZighdmFsdWUpIHtcclxuXHRcdFx0dmFsdWUgPSB0eXBlb2YgYnRuc1swXSA9PSBcInN0cmluZ1wiID8gYnRuc1swXSA6IGJ0bnNbMF0udmFsdWU7XHJcblx0XHR9XHJcblxyXG5cdFx0cmV0dXJuIHtcclxuXHRcdFx0bmFtZTogXCJ0b2dnbGVCYXJcIixcclxuXHRcdFx0Y2xhc3NlczogXCJ0b2dnbGUtYmFyXCIsXHJcblx0XHRcdGNoaWxkcmVuOiBidG5zLm1hcChidG4gPT4ge1xyXG5cdFx0XHRcdC8vIGNvbnZlcnQgdGhlIHBsYWluIHN0cmluZyB0byBhbiBvYmplY3RcclxuXHRcdFx0XHRpZih0eXBlb2YgYnRuID09IFwic3RyaW5nXCIpIHtcclxuXHRcdFx0XHRcdGJ0biA9IHsgdGV4dDogYnRuLCB2YWx1ZTogYnRuIH07XHJcblx0XHRcdFx0fVxyXG5cclxuXHRcdFx0XHR2YXIgY2xhc3NlcyA9IFtcInRvZ2dsZS1idG5cIl07XHJcblxyXG5cdFx0XHRcdC8vIGFkZCB0aGUgc2VsZWN0ZWQgY2xhc3NcclxuXHRcdFx0XHRpZih2YWx1ZSA9PSBidG4udmFsdWUpIHtcclxuXHRcdFx0XHRcdGNsYXNzZXMucHVzaChcInRvZ2dsZS1idG4tc2VsZWN0ZWRcIik7XHJcblxyXG5cdFx0XHRcdFx0Ly8gZG9uJ3Qgc2VsZWN0IHR3byBidXR0b25zXHJcblx0XHRcdFx0XHR2YWx1ZSA9IHVuZGVmaW5lZDtcclxuXHRcdFx0XHR9XHJcblxyXG5cdFx0XHRcdHJldHVybiB7XHJcblx0XHRcdFx0XHR0YWc6IFwiYnV0dG9uXCIsXHJcblx0XHRcdFx0XHRjbGFzc2VzLFxyXG5cdFx0XHRcdFx0dGV4dDogYnRuLnRleHQsXHJcblx0XHRcdFx0XHRhdHRyczoge1xyXG5cdFx0XHRcdFx0XHRcImRhdGEtdmFsdWVcIjogYnRuLnZhbHVlXHJcblx0XHRcdFx0XHR9XHJcblx0XHRcdFx0fTtcclxuXHRcdFx0fSlcclxuXHRcdH07XHJcblx0fSxcclxuXHJcblx0YmluZCh7Y2hhbmdlfSwge3RvZ2dsZUJhcn0pIHtcclxuXHRcdC8vIGF0dGFjaCBsaXN0ZW5lcnNcclxuXHRcdGZvcihsZXQgYnRuIG9mIHRvZ2dsZUJhci5xdWVyeVNlbGVjdG9yQWxsKFwiLnRvZ2dsZS1idG5cIikpIHtcclxuXHRcdFx0YnRuLmFkZEV2ZW50TGlzdGVuZXIoXCJjbGlja1wiLCAoKSA9PiB7XHJcblx0XHRcdFx0dmFyIHNlbGVjdGVkID0gdG9nZ2xlQmFyLnF1ZXJ5U2VsZWN0b3IoXCIudG9nZ2xlLWJ0bi1zZWxlY3RlZFwiKTtcclxuXHJcblx0XHRcdFx0Ly8gdGhlIGJ1dHRvbiBoYXMgYWxyZWFkeSBiZWVuIHNlbGVjdGVkXHJcblx0XHRcdFx0aWYoc2VsZWN0ZWQgPT0gYnRuKSB7XHJcblx0XHRcdFx0XHRyZXR1cm47XHJcblx0XHRcdFx0fVxyXG5cclxuXHRcdFx0XHQvLyB1bnRvZ2dsZSB0aGUgb3RoZXIgYnV0dG9uXHJcblx0XHRcdFx0aWYoc2VsZWN0ZWQpIHtcclxuXHRcdFx0XHRcdHNlbGVjdGVkLmNsYXNzTGlzdC5yZW1vdmUoXCJ0b2dnbGUtYnRuLXNlbGVjdGVkXCIpO1xyXG5cdFx0XHRcdH1cclxuXHJcblx0XHRcdFx0Ly8gc2VsZWN0IHRoaXMgYnV0dG9uXHJcblx0XHRcdFx0YnRuLmNsYXNzTGlzdC5hZGQoXCJ0b2dnbGUtYnRuLXNlbGVjdGVkXCIpO1xyXG5cclxuXHRcdFx0XHQvLyB0cmlnZ2VyIGEgc2VsZWN0aW9uIGNoYW5nZVxyXG5cdFx0XHRcdGNoYW5nZShidG4uZGF0YXNldC52YWx1ZSk7XHJcblx0XHRcdH0pO1xyXG5cdFx0fVxyXG5cdH1cclxufSk7XHJcbiIsIi8qKlxyXG4gKiBOYW1lIGdlbmVyYXRvciBmb3IgYmFja3Vwc1xyXG4gKi9cclxuXHJcbmV4cG9ydHMuZ2VuQmFja3VwTmFtZSA9IGZ1bmN0aW9uKGRhdGUgPSBuZXcgRGF0ZSgpKSB7XHJcblx0cmV0dXJuIGBiYWNrdXAtJHtkYXRlLmdldEZ1bGxZZWFyKCl9LSR7ZGF0ZS5nZXRNb250aCgpKzF9LSR7ZGF0ZS5nZXREYXRlKCl9YFxyXG5cdFx0KyBgLSR7ZGF0ZS5nZXRIb3VycygpfS0ke2RhdGUuZ2V0TWludXRlcygpfS56aXBgO1xyXG59O1xyXG4iLCIvKipcclxuICogQW4gYWRhcHRvciBmb3IgaHR0cCBiYXNlZCBzdG9yZXNcclxuICovXHJcblxyXG5pZih0eXBlb2Ygd2luZG93ICE9IFwib2JqZWN0XCIpIHtcclxuXHQvLyBwb2x5ZmlsbCBmZXRjaCBmb3Igbm9kZVxyXG5cdGZldGNoID0gcmVxdWlyZShcIm5vZGUtZmV0Y2hcIik7XHJcbn1cclxuXHJcbmNsYXNzIEh0dHBBZGFwdG9yIHtcclxuXHRjb25zdHJ1Y3RvcihvcHRzKSB7XHJcblx0XHQvLyBpZiB3ZSBhcmUganVzdCBnaXZlbiBhIHN0cmluZyB1c2UgaXQgYXMgdGhlIHNvdXJjZVxyXG5cdFx0aWYodHlwZW9mIG9wdHMgPT0gXCJzdHJpbmdcIikge1xyXG5cdFx0XHRvcHRzID0ge1xyXG5cdFx0XHRcdHNyYzogb3B0c1xyXG5cdFx0XHR9O1xyXG5cdFx0fVxyXG5cclxuXHRcdC8vIHNhdmUgdGhlIG9wdGlvbnNcclxuXHRcdHRoaXMuX29wdHMgPSBvcHRzO1xyXG5cdH1cclxuXHJcblx0Ly8gY3JlYXRlIHRoZSBvcHRpb25zIGZvciBhIGZldGNoIHJlcXVlc3RcclxuXHRfY3JlYXRlT3B0cygpIHtcclxuXHRcdHZhciBvcHRzID0ge307XHJcblxyXG5cdFx0Ly8gdXNlIHRoZSBzZXNzaW9uIGNvb2tpZSB3ZSB3ZXJlIGdpdmVuXHJcblx0XHRpZih0aGlzLl9vcHRzLnNlc3Npb24pIHtcclxuXHRcdFx0b3B0cy5oZWFkZXJzID0ge1xyXG5cdFx0XHRcdGNvb2tpZTogYHNlc3Npb249JHt0aGlzLl9vcHRzLnNlc3Npb259YFxyXG5cdFx0XHR9O1xyXG5cdFx0fVxyXG5cdFx0Ly8gdXNlIHRoZSBjcmVhZGVudGlhbHMgZnJvbSB0aGUgYnJvd3NlclxyXG5cdFx0ZWxzZSB7XHJcblx0XHRcdG9wdHMuY3JlZGVudGlhbHMgPSBcImluY2x1ZGVcIjtcclxuXHRcdH1cclxuXHJcblx0XHRyZXR1cm4gb3B0cztcclxuXHR9XHJcblxyXG5cdC8qKlxyXG5cdCAqIEdldCBhbGwgdGhlIHZhbHVlcyBpbiBhIHN0b3JlXHJcblx0ICovXHJcblx0Z2V0QWxsKCkge1xyXG5cdFx0cmV0dXJuIGZldGNoKHRoaXMuX29wdHMuc3JjLCB0aGlzLl9jcmVhdGVPcHRzKCkpXHJcblxyXG5cdFx0Ly8gcGFyc2UgdGhlIGpzb24gcmVzcG9uc2VcclxuXHRcdC50aGVuKHJlcyA9PiB7XHJcblx0XHRcdC8vIHNlcnZlci9zZXJ2aWNlIHdvcmtlciBlcnJvclxyXG5cdFx0XHRpZihyZXMuc3RhdHVzID09IDUwMCkge1xyXG5cdFx0XHRcdHJldHVybiByZXMudGV4dCgpXHJcblxyXG5cdFx0XHRcdC50aGVuKG1zZyA9PiB7XHJcblx0XHRcdFx0XHR0aHJvdyBuZXcgRXJyb3IobXNnKTtcclxuXHRcdFx0XHR9KTtcclxuXHRcdFx0fVxyXG5cclxuXHRcdFx0cmV0dXJuIHJlcy5qc29uKCk7XHJcblx0XHR9KVxyXG5cclxuXHRcdC50aGVuKGpzb24gPT4ge1xyXG5cdFx0XHQvLyBhbiBlcnJvciBvY2N1cmVkIG9uIHRoZSBzZXJ2ZXJcclxuXHRcdFx0aWYoanNvbi5zdGF0dXMgPT0gXCJlcnJvclwiKSB7XHJcblx0XHRcdFx0dGhyb3cgbmV3IEVycm9yKGpzb24uZGF0YSk7XHJcblx0XHRcdH1cclxuXHJcblx0XHRcdHJldHVybiBqc29uO1xyXG5cdFx0fSk7XHJcblx0fVxyXG5cclxuXHQvKipcclxuXHQgKiBHZXQgYSBzaW5nbGUgdmFsdWVcclxuXHQgKi9cclxuXHRnZXQoa2V5KSB7XHJcblx0XHRyZXR1cm4gZmV0Y2godGhpcy5fb3B0cy5zcmMgKyBcInZhbHVlL1wiICsga2V5LCB0aGlzLl9jcmVhdGVPcHRzKCkpXHJcblxyXG5cdFx0LnRoZW4ocmVzID0+IHtcclxuXHRcdFx0Ly8gbm90IGxvZ2dlZCBpblxyXG5cdFx0XHRpZihyZXMuc3RhdHVzID09IDQwMykge1xyXG5cdFx0XHRcdGxldCBlcnJvciA9IG5ldyBFcnJvcihcIk5vdCBsb2dnZWQgaW5cIik7XHJcblxyXG5cdFx0XHRcdC8vIGFkZCBhbiBlcnJvciBjb2RlXHJcblx0XHRcdFx0ZXJyb3IuY29kZSA9IFwibm90LWxvZ2dlZC1pblwiO1xyXG5cclxuXHRcdFx0XHR0aHJvdyBlcnJvcjtcclxuXHRcdFx0fVxyXG5cclxuXHRcdFx0Ly8gbm8gc3VjaCBpdGVtXHJcblx0XHRcdGlmKHJlcy5zdGF0dXMgPT0gNDA0KSB7XHJcblx0XHRcdFx0cmV0dXJuIHVuZGVmaW5lZDtcclxuXHRcdFx0fVxyXG5cclxuXHRcdFx0Ly8gc2VydmVyL3NlcnZpY2Ugd29ya2VyIGVycm9yXHJcblx0XHRcdGlmKHJlcy5zdGF0dXMgPT0gNTAwKSB7XHJcblx0XHRcdFx0cmV0dXJuIHJlcy50ZXh0KClcclxuXHJcblx0XHRcdFx0LnRoZW4obXNnID0+IHtcclxuXHRcdFx0XHRcdHRocm93IG5ldyBFcnJvcihtc2cpO1xyXG5cdFx0XHRcdH0pO1xyXG5cdFx0XHR9XHJcblxyXG5cdFx0XHQvLyBwYXJzZSB0aGUgaXRlbVxyXG5cdFx0XHRyZXR1cm4gcmVzLmpzb24oKTtcclxuXHRcdH0pXHJcblxyXG5cdFx0LnRoZW4oanNvbiA9PiB7XHJcblx0XHRcdC8vIGFuIGVycm9yIG9jY3VyZWQgb24gdGhlIHNlcnZlclxyXG5cdFx0XHRpZihqc29uLnN0YXR1cyA9PSBcImVycm9yXCIpIHtcclxuXHRcdFx0XHR0aHJvdyBuZXcgRXJyb3IoanNvbi5kYXRhKTtcclxuXHRcdFx0fVxyXG5cclxuXHRcdFx0cmV0dXJuIGpzb247XHJcblx0XHR9KTtcclxuXHR9XHJcblxyXG5cdC8qKlxyXG5cdCAqIFN0b3JlIGFuIHZhbHVlIG9uIHRoZSBzZXJ2ZXJcclxuXHQgKi9cclxuXHRzZXQodmFsdWUpIHtcclxuXHRcdHZhciBmZXRjaE9wdHMgPSB0aGlzLl9jcmVhdGVPcHRzKCk7XHJcblxyXG5cdFx0Ly8gYWRkIHRoZSBoZWFkZXJzIHRvIHRoZSBkZWZhdWx0IGhlYWRlcnNcclxuXHRcdGZldGNoT3B0cy5tZXRob2QgPSBcIlBVVFwiO1xyXG5cdFx0ZmV0Y2hPcHRzLmJvZHkgPSBKU09OLnN0cmluZ2lmeSh2YWx1ZSk7XHJcblxyXG5cdFx0Ly8gc2VuZCB0aGUgaXRlbVxyXG5cdFx0cmV0dXJuIGZldGNoKHRoaXMuX29wdHMuc3JjICsgXCJ2YWx1ZS9cIiArIHZhbHVlLmlkLCBmZXRjaE9wdHMpXHJcblxyXG5cdFx0LnRoZW4ocmVzID0+IHtcclxuXHRcdFx0Ly8gbm90IGxvZ2dlZCBpblxyXG5cdFx0XHRpZihyZXMuc3RhdHVzID09IDQwMykge1xyXG5cdFx0XHRcdGxldCBlcnJvciA9IG5ldyBFcnJvcihcIk5vdCBsb2dnZWQgaW5cIik7XHJcblxyXG5cdFx0XHRcdC8vIGFkZCBhbiBlcnJvciBjb2RlXHJcblx0XHRcdFx0ZXJyb3IuY29kZSA9IFwibm90LWxvZ2dlZC1pblwiO1xyXG5cclxuXHRcdFx0XHR0aHJvdyBlcnJvcjtcclxuXHRcdFx0fVxyXG5cclxuXHRcdFx0Ly8gc2VydmVyL3NlcnZpY2Ugd29ya2VyIGVycm9yXHJcblx0XHRcdGlmKHJlcy5zdGF0dXMgPT0gNTAwKSB7XHJcblx0XHRcdFx0cmV0dXJuIHJlcy50ZXh0KClcclxuXHJcblx0XHRcdFx0LnRoZW4obXNnID0+IHtcclxuXHRcdFx0XHRcdHRocm93IG5ldyBFcnJvcihtc2cpO1xyXG5cdFx0XHRcdH0pO1xyXG5cdFx0XHR9XHJcblxyXG5cdFx0XHQvLyBwYXJzZSB0aGUgZXJyb3IgbWVzc2FnZVxyXG5cdFx0XHRpZihyZXMuc3RhdHVzICE9IDMwNCkge1xyXG5cdFx0XHRcdHJldHVybiByZXMuanNvbigpO1xyXG5cdFx0XHR9XHJcblx0XHR9KVxyXG5cclxuXHRcdC50aGVuKGpzb24gPT4ge1xyXG5cdFx0XHQvLyBhbiBlcnJvciBvY2N1cmVkIG9uIHRoZSBzZXJ2ZXJcclxuXHRcdFx0aWYoanNvbi5zdGF0dXMgPT0gXCJlcnJvclwiKSB7XHJcblx0XHRcdFx0dGhyb3cgbmV3IEVycm9yKGpzb24uZGF0YSk7XHJcblx0XHRcdH1cclxuXHJcblx0XHRcdHJldHVybiBqc29uO1xyXG5cdFx0fSk7XHJcblx0fVxyXG5cclxuXHQvKipcclxuXHQgKiBSZW1vdmUgdGhlIHZhbHVlIGZyb20gdGhlIHN0b3JlXHJcblx0ICovXHJcblx0cmVtb3ZlKGtleSkge1xyXG5cdFx0dmFyIGZldGNoT3B0cyA9IHRoaXMuX2NyZWF0ZU9wdHMoKTtcclxuXHJcblx0XHQvLyBhZGQgdGhlIGhlYWRlcnMgdG8gdGhlIGRlZmF1bHQgaGVhZGVyc1xyXG5cdFx0ZmV0Y2hPcHRzLm1ldGhvZCA9IFwiREVMRVRFXCI7XHJcblxyXG5cdFx0Ly8gc2VuZCB0aGUgaXRlbVxyXG5cdFx0cmV0dXJuIGZldGNoKHRoaXMuX29wdHMuc3JjICsgXCJ2YWx1ZS9cIiArIGtleSwgZmV0Y2hPcHRzKVxyXG5cclxuXHRcdC50aGVuKHJlcyA9PiB7XHJcblx0XHRcdC8vIG5vdCBsb2dnZWQgaW5cclxuXHRcdFx0aWYocmVzLnN0YXR1cyA9PSA0MDMpIHtcclxuXHRcdFx0XHRsZXQgZXJyb3IgPSBuZXcgRXJyb3IoXCJOb3QgbG9nZ2VkIGluXCIpO1xyXG5cclxuXHRcdFx0XHQvLyBhZGQgYW4gZXJyb3IgY29kZVxyXG5cdFx0XHRcdGVycm9yLmNvZGUgPSBcIm5vdC1sb2dnZWQtaW5cIjtcclxuXHJcblx0XHRcdFx0dGhyb3cgZXJyb3I7XHJcblx0XHRcdH1cclxuXHJcblx0XHRcdC8vIHNlcnZlci9zZXJ2aWNlIHdvcmtlciBlcnJvclxyXG5cdFx0XHRpZihyZXMuc3RhdHVzID09IDUwMCkge1xyXG5cdFx0XHRcdHJldHVybiByZXMudGV4dCgpXHJcblxyXG5cdFx0XHRcdC50aGVuKG1zZyA9PiB7XHJcblx0XHRcdFx0XHR0aHJvdyBuZXcgRXJyb3IobXNnKTtcclxuXHRcdFx0XHR9KTtcclxuXHRcdFx0fVxyXG5cclxuXHRcdFx0Ly8gcGFyc2UgdGhlIGVycm9yIG1lc3NhZ2VcclxuXHRcdFx0aWYocmVzLnN0YXR1cyAhPSAzMDQpIHtcclxuXHRcdFx0XHRyZXR1cm4gcmVzLmpzb24oKTtcclxuXHRcdFx0fVxyXG5cdFx0fSlcclxuXHJcblx0XHQudGhlbihqc29uID0+IHtcclxuXHRcdFx0Ly8gYW4gZXJyb3Igb2NjdXJlZCBvbiB0aGUgc2VydmVyXHJcblx0XHRcdGlmKGpzb24uc3RhdHVzID09IFwiZXJyb3JcIikge1xyXG5cdFx0XHRcdHRocm93IG5ldyBFcnJvcihqc29uLmRhdGEpO1xyXG5cdFx0XHR9XHJcblxyXG5cdFx0XHRyZXR1cm4ganNvbjtcclxuXHRcdH0pO1xyXG5cdH1cclxuXHJcblx0Ly8gY2hlY2sgb3VyIGFjY2VzcyBsZXZlbFxyXG5cdGFjY2Vzc0xldmVsKCkge1xyXG5cdFx0cmV0dXJuIGZldGNoKHRoaXMuX29wdHMuc3JjICsgXCJhY2Nlc3NcIiwgdGhpcy5fY3JlYXRlT3B0cygpKVxyXG5cdFx0XHQvLyB0aGUgcmVzcG9uc2UgaXMganVzdCBhIHN0cmluZ1xyXG5cdFx0XHQudGhlbihyZXMgPT4gcmVzLnRleHQoKSk7XHJcblx0fVxyXG59XHJcblxyXG5tb2R1bGUuZXhwb3J0cyA9IEh0dHBBZGFwdG9yO1xyXG4iLCIvKipcclxuICogQSBiYXNpYyBrZXkgdmFsdWUgZGF0YSBzdG9yZVxyXG4gKi9cclxuXHJcbnZhciBFdmVudEVtaXR0ZXIgPSByZXF1aXJlKFwiLi4vdXRpbC9ldmVudC1lbWl0dGVyXCIpO1xyXG5cclxuY2xhc3MgS2V5VmFsdWVTdG9yZSBleHRlbmRzIEV2ZW50RW1pdHRlciB7XHJcblx0Y29uc3RydWN0b3IoYWRhcHRvcikge1xyXG5cdFx0c3VwZXIoKTtcclxuXHRcdHRoaXMuX2FkYXB0b3IgPSBhZGFwdG9yO1xyXG5cclxuXHRcdC8vIG1ha2Ugc3VyZSB3ZSBoYXZlIGFuIGFkYXB0b3JcclxuXHRcdGlmKCFhZGFwdG9yKSB7XHJcblx0XHRcdHRocm93IG5ldyBFcnJvcihcIktleVZhbHVlU3RvcmUgbXVzdCBiZSBpbml0aWFsaXplZCB3aXRoIGFuIGFkYXB0b3JcIilcclxuXHRcdH1cclxuXHR9XHJcblxyXG5cdC8qKlxyXG5cdCAqIEdldCB0aGUgY29ycmlzcG9uZGluZyB2YWx1ZSBvdXQgb2YgdGhlIGRhdGEgc3RvcmUgb3RoZXJ3aXNlIHJldHVybiBkZWZhdWx0XHJcblx0ICovXHJcblx0Z2V0KGtleSwgX2RlZmF1bHQpIHtcclxuXHRcdC8vIGNoZWNrIGlmIHRoaXMgdmFsdWUgaGFzIGJlZW4gb3ZlcnJpZGVuXHJcblx0XHRpZih0aGlzLl9vdmVycmlkZXMgJiYgdGhpcy5fb3ZlcnJpZGVzLmhhc093blByb3BlcnR5KGtleSkpIHtcclxuXHRcdFx0cmV0dXJuIFByb21pc2UucmVzb2x2ZSh0aGlzLl9vdmVycmlkZXNba2V5XSk7XHJcblx0XHR9XHJcblxyXG5cdFx0cmV0dXJuIHRoaXMuX2FkYXB0b3IuZ2V0KGtleSlcclxuXHJcblx0XHQudGhlbihyZXN1bHQgPT4ge1xyXG5cdFx0XHQvLyB0aGUgaXRlbSBpcyBub3QgZGVmaW5lZFxyXG5cdFx0XHRpZighcmVzdWx0KSB7XHJcblx0XHRcdFx0cmV0dXJuIF9kZWZhdWx0O1xyXG5cdFx0XHR9XHJcblxyXG5cdFx0XHRyZXR1cm4gcmVzdWx0LnZhbHVlO1xyXG5cdFx0fSk7XHJcblx0fVxyXG5cclxuXHQvKipcclxuXHQgKiBTZXQgYSBzaW5nbGUgdmFsdWUgb3Igc2V2ZXJhbCB2YWx1ZXNcclxuXHQgKlxyXG5cdCAqIGtleSAtPiB2YWx1ZVxyXG5cdCAqIG9yXHJcblx0ICogeyBrZXk6IHZhbHVlIH1cclxuXHQgKi9cclxuXHRzZXQoa2V5LCB2YWx1ZSkge1xyXG5cdFx0Ly8gc2V0IGEgc2luZ2xlIHZhbHVlXHJcblx0XHRpZih0eXBlb2Yga2V5ID09IFwic3RyaW5nXCIpIHtcclxuXHRcdFx0dmFyIHByb21pc2UgPSB0aGlzLl9hZGFwdG9yLnNldCh7XHJcblx0XHRcdFx0aWQ6IGtleSxcclxuXHRcdFx0XHR2YWx1ZSxcclxuXHRcdFx0XHRtb2RpZmllZDogRGF0ZS5ub3coKVxyXG5cdFx0XHR9KTtcclxuXHJcblx0XHRcdC8vIHRyaWdnZXIgdGhlIGNoYW5nZVxyXG5cdFx0XHR0aGlzLmVtaXQoa2V5LCB2YWx1ZSk7XHJcblxyXG5cdFx0XHRyZXR1cm4gcHJvbWlzZTtcclxuXHRcdH1cclxuXHRcdC8vIHNldCBzZXZlcmFsIHZhbHVlc1xyXG5cdFx0ZWxzZSB7XHJcblx0XHRcdC8vIHRlbGwgdGhlIGNhbGxlciB3aGVuIHdlIGFyZSBkb25lXHJcblx0XHRcdGxldCBwcm9taXNlcyA9IFtdO1xyXG5cclxuXHRcdFx0Zm9yKGxldCBfa2V5IG9mIE9iamVjdC5nZXRPd25Qcm9wZXJ0eU5hbWVzKGtleSkpIHtcclxuXHRcdFx0XHRwcm9taXNlcy5wdXNoKFxyXG5cdFx0XHRcdFx0dGhpcy5fYWRhcHRvci5zZXQoe1xyXG5cdFx0XHRcdFx0XHRpZDogX2tleSxcclxuXHRcdFx0XHRcdFx0dmFsdWU6IGtleVtfa2V5XSxcclxuXHRcdFx0XHRcdFx0bW9kaWZpZWQ6IERhdGUubm93KClcclxuXHRcdFx0XHRcdH0pXHJcblx0XHRcdFx0KTtcclxuXHJcblx0XHRcdFx0Ly8gdHJpZ2dlciB0aGUgY2hhbmdlXHJcblx0XHRcdFx0dGhpcy5lbWl0KF9rZXksIGtleVtfa2V5XSk7XHJcblx0XHRcdH1cclxuXHJcblx0XHRcdHJldHVybiBQcm9taXNlLmFsbChwcm9taXNlcyk7XHJcblx0XHR9XHJcblx0fVxyXG5cclxuXHQgLyoqXHJcblx0ICAqIFdhdGNoIHRoZSB2YWx1ZSBmb3IgY2hhbmdlc1xyXG5cdCAgKlxyXG5cdCAgKiBvcHRzLmN1cnJlbnQgLSBzZW5kIHRoZSBjdXJyZW50IHZhbHVlIG9mIGtleSAoZGVmYXVsdDogZmFsc2UpXHJcblx0ICAqIG9wdHMuZGVmYXVsdCAtIHRoZSBkZWZhdWx0IHZhbHVlIHRvIHNlbmQgZm9yIG9wdHMuY3VycmVudFxyXG5cdCAgKi9cclxuXHQgd2F0Y2goa2V5LCBvcHRzLCBmbikge1xyXG5cdFx0IC8vIG1ha2Ugb3B0cyBvcHRpb25hbFxyXG5cdFx0IGlmKHR5cGVvZiBvcHRzID09IFwiZnVuY3Rpb25cIikge1xyXG5cdFx0XHQgZm4gPSBvcHRzO1xyXG5cdFx0XHQgb3B0cyA9IHt9O1xyXG5cdFx0IH1cclxuXHJcblx0XHQgLy8gaWYgYSBjaGFuZ2UgaXMgdHJpZ2dlcmVkIGJlZm9yZSBnZXQgY29tZXMgYmFjayBkb24ndCBlbWl0IHRoZSB2YWx1ZSBmcm9tIGdldFxyXG5cdFx0IHZhciBjaGFuZ2VSZWNpZXZlZCA9IGZhbHNlO1xyXG5cclxuXHRcdCAvLyBzZW5kIHRoZSBjdXJyZW50IHZhbHVlXHJcblx0XHQgaWYob3B0cy5jdXJyZW50KSB7XHJcblx0XHRcdCB0aGlzLmdldChrZXksIG9wdHMuZGVmYXVsdClcclxuXHJcblx0XHQgXHQudGhlbih2YWx1ZSA9PiB7XHJcblx0XHRcdFx0aWYoIWNoYW5nZVJlY2lldmVkKSB7XHJcblx0XHRcdFx0XHRmbih2YWx1ZSk7XHJcblx0XHRcdFx0fVxyXG5cdFx0XHR9KTtcclxuXHRcdCB9XHJcblxyXG5cdFx0IC8vIGxpc3RlbiBmb3IgYW55IGNoYW5nZXNcclxuXHRcdCByZXR1cm4gdGhpcy5vbihrZXksIHZhbHVlID0+IHtcclxuXHRcdFx0IC8vIG9ubHkgZW1pdCB0aGUgY2hhbmdlIGlmIHRoZXJlIGlzIG5vdCBhbiBvdmVycmlkZSBpbiBwbGFjZVxyXG5cdFx0XHQgaWYoIXRoaXMuX292ZXJyaWRlcyB8fCAhdGhpcy5fb3ZlcnJpZGVzLmhhc093blByb3BlcnR5KGtleSkpIHtcclxuXHRcdFx0XHQgZm4odmFsdWUpO1xyXG5cdFx0XHQgfVxyXG5cclxuXHRcdFx0IGNoYW5nZVJlY2lldmVkID0gdHJ1ZTtcclxuXHRcdCB9KTtcclxuXHQgfVxyXG5cclxuXHQgLyoqXHJcblx0ICAqIE92ZXJyaWRlIHRoZSB2YWx1ZXMgZnJvbSB0aGUgYWRhcHRvciB3aXRob3V0IHdyaXRpbmcgdG8gdGhlbVxyXG5cdCAgKlxyXG5cdCAgKiBVc2VmdWwgZm9yIGNvbWJpbmluZyBqc29uIHNldHRpbmdzIHdpdGggY29tbWFuZCBsaW5lIGZsYWdzXHJcblx0ICAqL1xyXG5cdCBzZXRPdmVycmlkZXMob3ZlcnJpZGVzKSB7XHJcblx0XHQgLy8gZW1pdCBjaGFuZ2VzIGZvciBlYWNoIG9mIHRoZSBvdmVycmlkZXNcclxuXHRcdCBPYmplY3QuZ2V0T3duUHJvcGVydHlOYW1lcyhvdmVycmlkZXMpXHJcblxyXG5cdFx0IC5mb3JFYWNoKGtleSA9PiB0aGlzLmVtaXQoa2V5LCBvdmVycmlkZXNba2V5XSkpO1xyXG5cclxuXHRcdCAvLyBzZXQgdGhlIG92ZXJyaWRlcyBhZnRlciBzbyB0aGUgZW1pdCBpcyBub3QgYmxvY2tlZFxyXG5cdFx0IHRoaXMuX292ZXJyaWRlcyA9IG92ZXJyaWRlcztcclxuXHQgfVxyXG59XHJcblxyXG5tb2R1bGUuZXhwb3J0cyA9IEtleVZhbHVlU3RvcmU7XHJcbiIsIi8qKlxyXG4gKiBBIGRhdGEgc3RvcmUgd2hpY2ggY29udGFpbnMgYSBwb29sIG9mIG9iamVjdHMgd2hpY2ggYXJlIHF1ZXJ5YWJsZSBieSBhbnkgcHJvcGVydHlcclxuICovXHJcblxyXG52YXIgRXZlbnRFbWl0dGVyID0gcmVxdWlyZShcIi4uL3V0aWwvZXZlbnQtZW1pdHRlclwiKTtcclxuXHJcbmNsYXNzIFBvb2xTdG9yZSBleHRlbmRzIEV2ZW50RW1pdHRlciB7XHJcblx0Y29uc3RydWN0b3IoYWRhcHRvciwgaW5pdEZuKSB7XHJcblx0XHRzdXBlcigpO1xyXG5cdFx0dGhpcy5fYWRhcHRvciA9IGFkYXB0b3I7XHJcblx0XHR0aGlzLl9pbml0Rm4gPSBpbml0Rm47XHJcblx0fVxyXG5cclxuXHQvKipcclxuXHQgKiBHZXQgYWxsIGl0ZW1zIG1hdGNpbmcgdGhlIHByb3ZpZGVkIHByb3BlcnRpZXNcclxuXHQgKi9cclxuXHRxdWVyeShwcm9wcywgZm4pIHtcclxuXHRcdC8vIGNoZWNrIGlmIGEgdmFsdWUgbWF0Y2hlcyB0aGUgcXVlcnlcclxuXHRcdHZhciBmaWx0ZXIgPSB2YWx1ZSA9PiB7XHJcblx0XHRcdC8vIG5vdCBhbiBpdGVtXHJcblx0XHRcdGlmKCF2YWx1ZSkgcmV0dXJuIGZhbHNlO1xyXG5cclxuXHRcdFx0Ly8gY2hlY2sgdGhhdCBhbGwgdGhlIHByb3BlcnRpZXMgbWF0Y2hcclxuXHRcdFx0cmV0dXJuIE9iamVjdC5nZXRPd25Qcm9wZXJ0eU5hbWVzKHByb3BzKVxyXG5cclxuXHRcdFx0LmV2ZXJ5KHByb3BOYW1lID0+IHtcclxuXHRcdFx0XHQvLyBhIGZ1bmN0aW9uIHRvIGNoZWNrIGlmIGEgdmFsdWUgbWF0Y2hlc1xyXG5cdFx0XHRcdGlmKHR5cGVvZiBwcm9wc1twcm9wTmFtZV0gPT0gXCJmdW5jdGlvblwiKSB7XHJcblx0XHRcdFx0XHRyZXR1cm4gcHJvcHNbcHJvcE5hbWVdKHZhbHVlW3Byb3BOYW1lXSk7XHJcblx0XHRcdFx0fVxyXG5cdFx0XHRcdC8vIHBsYWluIGVxdWFsaXR5XHJcblx0XHRcdFx0ZWxzZSB7XHJcblx0XHRcdFx0XHRyZXR1cm4gcHJvcHNbcHJvcE5hbWVdID09IHZhbHVlW3Byb3BOYW1lXVxyXG5cdFx0XHRcdH1cclxuXHRcdFx0fSk7XHJcblx0XHR9O1xyXG5cclxuXHRcdC8vIGdldCBhbGwgY3VycmVudCBpdGVtcyB0aGF0IG1hdGNoIHRoZSBmaWx0ZXJcclxuXHRcdHZhciBjdXJyZW50ID0gKFwiaWRcIiBpbiBwcm9wcykgP1xyXG5cdFx0XHR0aGlzLl9hZGFwdG9yLmdldChwcm9wcy5pZCkudGhlbih2YWx1ZSA9PiBbdmFsdWVdKTpcclxuXHRcdFx0dGhpcy5fYWRhcHRvci5nZXRBbGwoKTtcclxuXHJcblx0XHRjdXJyZW50ID0gY3VycmVudC50aGVuKHZhbHVlcyA9PiB7XHJcblx0XHRcdC8vIGZpbHRlciBvdXQgdGhlIHZhbHVlc1xyXG5cdFx0XHR2YWx1ZXMgPSB2YWx1ZXMuZmlsdGVyKGZpbHRlcik7XHJcblxyXG5cdFx0XHQvLyBkbyBhbnkgaW5pdGlhbGl6YXRpb25cclxuXHRcdFx0aWYodGhpcy5faW5pdEZuKSB7XHJcblx0XHRcdFx0dmFsdWVzID0gdmFsdWVzLm1hcCh2YWx1ZSA9PiB0aGlzLl9pbml0Rm4odmFsdWUpIHx8IHZhbHVlKTtcclxuXHRcdFx0fVxyXG5cclxuXHRcdFx0cmV0dXJuIHZhbHVlcztcclxuXHRcdH0pO1xyXG5cclxuXHRcdC8vIG9wdGlvbmFseSBydW4gY2hhbmdlcyB0aHJvdWdoIHRoZSBxdWVyeSBhcyB3ZWxsXHJcblx0XHRpZih0eXBlb2YgZm4gPT0gXCJmdW5jdGlvblwiKSB7XHJcblx0XHRcdGxldCBzdWJzY3JpcHRpb24sIHN0b3BwZWQ7XHJcblxyXG5cdFx0XHQvLyB3cmFwIHRoZSB2YWx1ZXMgaW4gY2hhbmdlIG9iamVjdHMgYW5kIHNlbmQgdGhlIHRvIHRoZSBjb25zdW1lclxyXG5cdFx0XHRjdXJyZW50LnRoZW4odmFsdWVzID0+IHtcclxuXHRcdFx0XHQvLyBkb24ndCBsaXN0ZW4gaWYgdW5zdWJzY3JpYmUgd2FzIGFscmVhZHkgY2FsbGVkXHJcblx0XHRcdFx0aWYoc3RvcHBlZCkgcmV0dXJuO1xyXG5cclxuXHRcdFx0XHQvLyBzZW5kIHRoZSB2YWx1ZXMgd2UgY3VycmVudGx5IGhhdmVcclxuXHRcdFx0XHRmbih2YWx1ZXMuc2xpY2UoMCkpO1xyXG5cclxuXHRcdFx0XHQvLyB3YXRjaCBmb3IgY2hhbmdlcyBhZnRlciB0aGUgaW5pdGlhbCB2YWx1ZXMgYXJlIHNlbmRcclxuXHRcdFx0XHRzdWJzY3JpcHRpb24gPSB0aGlzLm9uKFwiY2hhbmdlXCIsIGNoYW5nZSA9PiB7XHJcblx0XHRcdFx0XHQvLyBmaW5kIHRoZSBwcmV2aW91cyB2YWx1ZVxyXG5cdFx0XHRcdFx0dmFyIGluZGV4ID0gdmFsdWVzLmZpbmRJbmRleCh2YWx1ZSA9PiB2YWx1ZS5pZCA9PSBjaGFuZ2UuaWQpO1xyXG5cclxuXHRcdFx0XHRcdGlmKGNoYW5nZS50eXBlID09IFwiY2hhbmdlXCIpIHtcclxuXHRcdFx0XHRcdFx0Ly8gY2hlY2sgaWYgdGhlIHZhbHVlIG1hdGNoZXMgdGhlIHF1ZXJ5XHJcblx0XHRcdFx0XHRcdGxldCBtYXRjaGVzID0gZmlsdGVyKGNoYW5nZS52YWx1ZSk7XHJcblxyXG5cdFx0XHRcdFx0XHRpZihtYXRjaGVzKSB7XHJcblx0XHRcdFx0XHRcdFx0Ly8gZnJlc2hseSBjcmVhdGVkXHJcblx0XHRcdFx0XHRcdFx0aWYoaW5kZXggPT09IC0xKSB7XHJcblx0XHRcdFx0XHRcdFx0XHRsZXQge3ZhbHVlfSA9IGNoYW5nZTtcclxuXHJcblx0XHRcdFx0XHRcdFx0XHQvLyBkbyBhbnkgaW5pdGlhbGl6YXRpb25cclxuXHRcdFx0XHRcdFx0XHRcdGlmKHRoaXMuX2luaXRGbikge1xyXG5cdFx0XHRcdFx0XHRcdFx0XHR2YWx1ZSA9IHRoaXMuX2luaXRGbih2YWx1ZSkgfHwgdmFsdWU7XHJcblx0XHRcdFx0XHRcdFx0XHR9XHJcblxyXG5cdFx0XHRcdFx0XHRcdFx0dmFsdWVzLnB1c2godmFsdWUpO1xyXG5cdFx0XHRcdFx0XHRcdH1cclxuXHRcdFx0XHRcdFx0XHQvLyB1cGRhdGUgYW4gZXhpc3RpbmcgdmFsdWVcclxuXHRcdFx0XHRcdFx0XHRlbHNlIHtcclxuXHRcdFx0XHRcdFx0XHRcdHZhbHVlc1tpbmRleF0gPSBjaGFuZ2UudmFsdWU7XHJcblx0XHRcdFx0XHRcdFx0fVxyXG5cclxuXHRcdFx0XHRcdFx0XHRmbih2YWx1ZXMuc2xpY2UoMCkpO1xyXG5cdFx0XHRcdFx0XHR9XHJcblx0XHRcdFx0XHRcdC8vIHRlbGwgdGhlIGNvbnN1bWVyIHRoaXMgdmFsdWUgbm8gbG9uZ2VyIG1hdGNoZXNcclxuXHRcdFx0XHRcdFx0ZWxzZSBpZihpbmRleCAhPT0gLTEpIHtcclxuXHRcdFx0XHRcdFx0XHQvLyByZW1vdmUgdGhlIGl0ZW1cclxuXHRcdFx0XHRcdFx0XHRpZihpbmRleCAhPT0gLTEpIHtcclxuXHRcdFx0XHRcdFx0XHRcdHZhbHVlcy5zcGxpY2UoaW5kZXgsIDEpO1xyXG5cdFx0XHRcdFx0XHRcdH1cclxuXHJcblx0XHRcdFx0XHRcdFx0Zm4odmFsdWVzLnNsaWNlKDApKTtcclxuXHRcdFx0XHRcdFx0fVxyXG5cdFx0XHRcdFx0fVxyXG5cdFx0XHRcdFx0ZWxzZSBpZihjaGFuZ2UudHlwZSA9PSBcInJlbW92ZVwiICYmIGluZGV4ICE9PSAtMSkge1xyXG5cdFx0XHRcdFx0XHQvLyByZW1vdmUgdGhlIGl0ZW1cclxuXHRcdFx0XHRcdFx0aWYoaW5kZXggIT09IC0xKSB7XHJcblx0XHRcdFx0XHRcdFx0dmFsdWVzLnNwbGljZShpbmRleCwgMSk7XHJcblx0XHRcdFx0XHRcdH1cclxuXHJcblx0XHRcdFx0XHRcdGZuKHZhbHVlcy5zbGljZSgwKSk7XHJcblx0XHRcdFx0XHR9XHJcblx0XHRcdFx0fSk7XHJcblx0XHRcdH0pO1xyXG5cclxuXHRcdFx0cmV0dXJuIHtcclxuXHRcdFx0XHR1bnN1YnNjcmliZSgpIHtcclxuXHRcdFx0XHRcdC8vIGlmIHdlIGFyZSBsaXN0ZW5pbmcgc3RvcFxyXG5cdFx0XHRcdFx0aWYoc3Vic2NyaXB0aW9uKSB7XHJcblx0XHRcdFx0XHRcdHN1YnNjcmlwdGlvbi51bnN1YnNjcmliZSgpXHJcblx0XHRcdFx0XHR9XHJcblxyXG5cdFx0XHRcdFx0Ly8gZG9uJ3QgbGlzdGVuXHJcblx0XHRcdFx0XHRzdG9wcGVkID0gdHJ1ZTtcclxuXHRcdFx0XHR9XHJcblx0XHRcdH1cclxuXHRcdH1cclxuXHRcdGVsc2Uge1xyXG5cdFx0XHRyZXR1cm4gY3VycmVudDtcclxuXHRcdH1cclxuXHR9XHJcblxyXG5cdC8qKlxyXG5cdCAqIFN0b3JlIGEgdmFsdWUgaW4gdGhlIHBvb2xcclxuXHQgKi9cclxuXHRzZXQodmFsdWUpIHtcclxuXHRcdC8vIHNldCB0aGUgbW9kaWZpZWQgZGF0ZVxyXG5cdFx0dmFsdWUubW9kaWZpZWQgPSBEYXRlLm5vdygpO1xyXG5cclxuXHRcdC8vIHN0b3JlIHRoZSB2YWx1ZSBpbiB0aGUgYWRhcHRvclxyXG5cdFx0dGhpcy5fYWRhcHRvci5zZXQodmFsdWUpO1xyXG5cclxuXHRcdC8vIHByb3BvZ2F0ZSB0aGUgY2hhbmdlXHJcblx0XHR0aGlzLmVtaXQoXCJjaGFuZ2VcIiwge1xyXG5cdFx0XHR0eXBlOiBcImNoYW5nZVwiLFxyXG5cdFx0XHRpZDogdmFsdWUuaWQsXHJcblx0XHRcdHZhbHVlXHJcblx0XHR9KTtcclxuXHR9XHJcblxyXG5cdC8qKlxyXG5cdCAqIFJlbW92ZSBhIHZhbHVlIGZyb20gdGhlIHBvb2xcclxuXHQgKi9cclxuXHRyZW1vdmUoaWQpIHtcclxuXHRcdC8vIHJlbW92ZSB0aGUgdmFsdWUgZnJvbSB0aGUgYWRhcHRvclxyXG5cdFx0dGhpcy5fYWRhcHRvci5yZW1vdmUoaWQsIERhdGUubm93KCkpO1xyXG5cclxuXHRcdC8vIHByb3BvZ2F0ZSB0aGUgY2hhbmdlXHJcblx0XHR0aGlzLmVtaXQoXCJjaGFuZ2VcIiwge1xyXG5cdFx0XHR0eXBlOiBcInJlbW92ZVwiLFxyXG5cdFx0XHRpZFxyXG5cdFx0fSk7XHJcblx0fVxyXG59XHJcblxyXG5tb2R1bGUuZXhwb3J0cyA9IFBvb2xTdG9yZTtcclxuIiwiLyoqXHJcbiAqIEEgd3JhcHBlciB0aGF0IHN5bmNyb25pemVzIGxvY2FsIGNoYW5nZXMgd2l0aCBhIHJlbW90ZSBob3N0XHJcbiAqL1xyXG5cclxudmFyIEtleVZhbHVlU3RvcmUgPSByZXF1aXJlKFwiLi9rZXktdmFsdWUtc3RvcmVcIik7XHJcbnZhciBFdmVudEVtaXR0ZXIgPSByZXF1aXJlKFwiLi4vdXRpbC9ldmVudC1lbWl0dGVyXCIpO1xyXG5cclxuY2xhc3MgU3luY2VyIGV4dGVuZHMgRXZlbnRFbWl0dGVyIHtcclxuXHRjb25zdHJ1Y3RvcihvcHRzKSB7XHJcblx0XHRzdXBlcigpO1xyXG5cclxuXHRcdHRoaXMuX2xvY2FsID0gb3B0cy5sb2NhbDtcclxuXHRcdHRoaXMuX3JlbW90ZSA9IG9wdHMucmVtb3RlO1xyXG5cdFx0dGhpcy5fY2hhbmdlU3RvcmUgPSBuZXcgS2V5VmFsdWVTdG9yZShvcHRzLmNoYW5nZVN0b3JlKTtcclxuXHRcdHRoaXMuX2NoYW5nZXNOYW1lID0gb3B0cy5jaGFuZ2VzTmFtZSB8fCBcImNoYW5nZXNcIjtcclxuXHJcblx0XHQvLyBzYXZlIGFsbCB0aGUgaWRzIHRvIG9wdGltaXplIGNyZWF0ZXNcclxuXHRcdHRoaXMuX2lkcyA9IHRoaXMuZ2V0QWxsKClcclxuXHRcdFx0LnRoZW4oYWxsID0+IGFsbC5tYXAodmFsdWUgPT4gdmFsdWUuaWQpKTtcclxuXHR9XHJcblxyXG5cdC8vIHBhc3MgdGhyb3VnaCBnZXQgYW5kIGdldEFsbFxyXG5cdGdldEFsbCgpIHsgcmV0dXJuIHRoaXMuX2xvY2FsLmdldEFsbCgpOyB9XHJcblx0Z2V0KGtleSkgeyByZXR1cm4gdGhpcy5fbG9jYWwuZ2V0KGtleSk7IH1cclxuXHJcblx0Ly8ga2VlcCB0cmFjayBvZiBhbnkgY3JlYXRlZCB2YWx1ZXNcclxuXHRzZXQodmFsdWUpIHtcclxuXHRcdC8vIGNoZWNrIGlmIHRoaXMgaXMgYSBjcmVhdGVcclxuXHRcdHRoaXMuX2lkcyA9IHRoaXMuX2lkcy50aGVuKGlkcyA9PiB7XHJcblx0XHRcdC8vIG5ldyB2YWx1ZVxyXG5cdFx0XHRpZihpZHMuaW5kZXhPZih2YWx1ZS5pZCkgPT09IC0xKSB7XHJcblx0XHRcdFx0aWRzLnB1c2godmFsdWUuaWQpO1xyXG5cclxuXHRcdFx0XHQvLyBzYXZlIHRoZSBjaGFuZ2VcclxuXHRcdFx0XHR0aGlzLl9jaGFuZ2UoXCJjcmVhdGVcIiwgdmFsdWUuaWQpO1xyXG5cdFx0XHR9XHJcblxyXG5cdFx0XHRyZXR1cm4gaWRzO1xyXG5cdFx0fSk7XHJcblxyXG5cdFx0Ly8gc3RvcmUgdGhlIHZhbHVlXHJcblx0XHRyZXR1cm4gdGhpcy5faWRzLnRoZW4oKCkgPT4gdGhpcy5fbG9jYWwuc2V0KHZhbHVlKSk7XHJcblx0fVxyXG5cclxuXHQvLyBrZWVwIHRyYWNrIG9mIGRlbGV0ZWQgdmFsdWVzXHJcblx0cmVtb3ZlKGtleSkge1xyXG5cdFx0dGhpcy5faWRzID0gdGhpcy5faWRzLnRoZW4oaWRzID0+IHtcclxuXHRcdFx0Ly8gcmVtb3ZlIHRoaXMgZnJvbSB0aGUgYWxsIGlkcyBsaXN0XHJcblx0XHRcdHZhciBpbmRleCA9IGlkcy5pbmRleE9mKGtleSk7XHJcblxyXG5cdFx0XHRpZihpbmRleCAhPT0gLTEpIHtcclxuXHRcdFx0XHRpZHMuc3BsaWNlKGluZGV4LCAxKTtcclxuXHRcdFx0fVxyXG5cclxuXHRcdFx0Ly8gc2F2ZSB0aGUgY2hhbmdlXHJcblx0XHRcdHRoaXMuX2NoYW5nZShcInJlbW92ZVwiLCBrZXkpO1xyXG5cdFx0fSk7XHJcblxyXG5cdFx0Ly8gcmVtb3ZlIHRoZSBhY3R1YWwgdmFsdWVcclxuXHRcdHJldHVybiB0aGlzLl9pZHMudGhlbigoKSA9PiB0aGlzLl9sb2NhbC5yZW1vdmUoa2V5KSk7XHJcblx0fVxyXG5cclxuXHQvLyBzdG9yZSBhIGNoYW5nZSBpbiB0aGUgY2hhbmdlIHN0b3JlXHJcblx0X2NoYW5nZSh0eXBlLCBpZCkge1xyXG5cdFx0Ly8gZ2V0IHRoZSBjaGFuZ2VzXHJcblx0XHR0aGlzLl9jaGFuZ2VTdG9yZS5nZXQodGhpcy5fY2hhbmdlc05hbWUsIFtdKVxyXG5cclxuXHRcdC50aGVuKGNoYW5nZXMgPT4ge1xyXG5cdFx0XHQvLyBhZGQgdGhlIGNoYW5nZVxyXG5cdFx0XHRjaGFuZ2VzLnB1c2goeyB0eXBlLCBpZCwgdGltZXN0YW1wOiBEYXRlLm5vdygpIH0pO1xyXG5cclxuXHRcdFx0Ly8gc2F2ZSB0aGUgY2hhbmdlc1xyXG5cdFx0XHRyZXR1cm4gdGhpcy5fY2hhbmdlU3RvcmUuc2V0KHRoaXMuX2NoYW5nZXNOYW1lLCBjaGFuZ2VzKTtcclxuXHRcdH0pO1xyXG5cdH1cclxuXHJcblx0Ly8gc3luYyB0aGUgdHdvIHN0b3Jlc1xyXG5cdHN5bmMoKSB7XHJcblx0XHQvLyBvbmx5IHJ1biBvbmUgc3luYyBhdCBhIHRpbWVcclxuXHRcdGlmKHRoaXMuX3N5bmNpbmcpIHJldHVybiB0aGlzLl9zeW5jaW5nO1xyXG5cclxuXHRcdHZhciByZXRyeUNvdW50ID0gMztcclxuXHRcdHZhciAkc3luYyA9IG5ldyBTeW5jKHRoaXMuX2xvY2FsLCB0aGlzLl9yZW1vdGUsIHRoaXMuX2NoYW5nZVN0b3JlLCB0aGlzLl9jaGFuZ2VzTmFtZSk7XHJcblxyXG5cdFx0Ly8gcGFzcyBvbiB0aGUgcHJvZ3Jlc3NcclxuXHRcdHZhciBzdWIgPSAkc3luYy5vbihcInByb2dyZXNzXCIsIHZhbHVlID0+IHRoaXMuZW1pdChcInByb2dyZXNzXCIsIHZhbHVlKSk7XHJcblxyXG5cdFx0dmFyIHN5bmMgPSAoKSA9PiB7XHJcblx0XHRcdC8vIHRlbGwgdGhlIHVpIHdlIGFyZSBzeW5jaW5nXHJcblx0XHRcdHRoaXMuZW1pdChcInN5bmMtc3RhcnRcIik7XHJcblxyXG5cdFx0XHQvLyBhdHRlbXB0IHRvIHN5bmNcclxuXHRcdFx0cmV0dXJuICRzeW5jLnN5bmMoKVxyXG5cclxuXHRcdFx0LnRoZW4oKCkgPT4ge1xyXG5cdFx0XHRcdC8vIHRoZSB0aGUgdWkgdGhlIHN5bmMgaGFzIHN1Y2NlZWRlZFxyXG5cdFx0XHRcdHRoaXMuZW1pdChcInN5bmMtY29tcGxldGVcIiwgeyBmYWlsZWQ6IGZhbHNlIH0pO1xyXG5cdFx0XHR9KVxyXG5cclxuXHRcdFx0LmNhdGNoKGVyciA9PiB7XHJcblx0XHRcdFx0dmFyIHJldHJ5aW5nID0gcmV0cnlDb3VudC0tID4gMCAmJiAodHlwZW9mIG5hdmlnYXRvciAhPSBcIm9iamVjdFwiIHx8IG5hdmlnYXRvci5vbkxpbmUpO1xyXG5cclxuXHRcdFx0XHQvLyB0ZWxsIHRoZSB1aSB0aGUgc3luYyBmYWlsZWRcclxuXHRcdFx0XHR0aGlzLmVtaXQoXCJzeW5jLWNvbXBsZXRlXCIsIHsgcmV0cnlpbmcsIGZhaWxlZDogdHJ1ZSB9KTtcclxuXHJcblx0XHRcdFx0Ly8gcmV0cnkgaWYgaXQgZmFpbHNcclxuXHRcdFx0XHRpZihyZXRyeWluZykge1xyXG5cdFx0XHRcdFx0cmV0dXJuIG5ldyBQcm9taXNlKHJlc29sdmUgPT4ge1xyXG5cdFx0XHRcdFx0XHQvLyB3YWl0IDEgc2Vjb25kXHJcblx0XHRcdFx0XHRcdHNldFRpbWVvdXQoKCkgPT4gcmVzb2x2ZShzeW5jKCkpLCAxMDAwKTtcclxuXHRcdFx0XHRcdH0pO1xyXG5cdFx0XHRcdH1cclxuXHRcdFx0fSk7XHJcblx0XHR9O1xyXG5cclxuXHRcdC8vIHN0YXJ0IHRoZSBzeW5jXHJcblx0XHR0aGlzLl9zeW5jaW5nID0gc3luYygpXHJcblxyXG5cdFx0Ly8gcmVsZWFzZSB0aGUgbG9ja1xyXG5cdFx0LnRoZW4oKCkgPT4ge1xyXG5cdFx0XHR0aGlzLl9zeW5jaW5nID0gdW5kZWZpbmVkO1xyXG5cdFx0XHRzdWIudW5zdWJzY3JpYmUoKTtcclxuXHRcdH0pO1xyXG5cclxuXHRcdHJldHVybiB0aGlzLl9zeW5jaW5nO1xyXG5cdH1cclxuXHJcblx0Ly8gZ2V0IHRoZSByZW1vdGUgYWNjZXNzIGxldmVsXHJcblx0YWNjZXNzTGV2ZWwoKSB7XHJcblx0XHRyZXR1cm4gdGhpcy5fcmVtb3RlLmFjY2Vzc0xldmVsKClcclxuXHJcblx0XHQvLyBpZiBhbnl0aGluZyBnb2VzIHdyb25nIGFzc3VtZSBmdWxsIHBlcm1pc3Npb25zXHJcblx0XHQuY2F0Y2goKCkgPT4gXCJmdWxsXCIpO1xyXG5cdH1cclxufVxyXG5cclxuLy8gYSBzaW5nbGUgc3luY1xyXG5jbGFzcyBTeW5jIGV4dGVuZHMgRXZlbnRFbWl0dGVyIHtcclxuXHRjb25zdHJ1Y3Rvcihsb2NhbCwgcmVtb3RlLCBjaGFuZ2VTdG9yZSwgY2hhbmdlc05hbWUpIHtcclxuXHRcdHN1cGVyKCk7XHJcblx0XHR0aGlzLl9sb2NhbCA9IGxvY2FsO1xyXG5cdFx0dGhpcy5fcmVtb3RlID0gcmVtb3RlO1xyXG5cdFx0dGhpcy5fY2hhbmdlU3RvcmUgPSBjaGFuZ2VTdG9yZTtcclxuXHRcdHRoaXMuX2NoYW5nZXNOYW1lID0gY2hhbmdlc05hbWU7XHJcblx0XHR0aGlzLl9wcm9ncmVzcyA9IDA7XHJcblx0fVxyXG5cclxuXHRzdGVwUHJvZ3Jlc3MoKSB7XHJcblx0XHR0aGlzLl9wcm9ncmVzcyArPSAxIC8gNztcclxuXHJcblx0XHR0aGlzLmVtaXQoXCJwcm9ncmVzc1wiLCB0aGlzLl9wcm9ncmVzcyk7XHJcblx0fVxyXG5cclxuXHRzeW5jKCkge1xyXG5cdFx0dGhpcy5zdGVwUHJvZ3Jlc3MoKTtcclxuXHJcblx0XHQvLyBnZXQgdGhlIGlkcyBhbmQgbGFzdCBtb2RpZmllZCBkYXRlcyBmb3IgYWxsIHJlbW90ZSB2YWx1ZXNcclxuXHRcdHJldHVybiB0aGlzLmdldE1vZGlmaWVkcygpXHJcblxyXG5cdFx0LnRoZW4obW9kaWZpZWRzID0+IHtcclxuXHRcdFx0dGhpcy5zdGVwUHJvZ3Jlc3MoKTtcclxuXHRcdFx0Ly8gcmVtb3ZlIHRoZSB2YWx1ZXMgd2UgZGVsZXRlZCBmcm9tIHRoZSByZW1vdGUgaG9zdFxyXG5cdFx0XHRyZXR1cm4gdGhpcy5yZW1vdmUobW9kaWZpZWRzKVxyXG5cclxuXHRcdFx0Ly8gbWVyZ2UgbW9kaWZpZWQgdmFsdWVzXHJcblx0XHRcdC50aGVuKCgpID0+IHtcclxuXHRcdFx0XHR0aGlzLnN0ZXBQcm9ncmVzcygpO1xyXG5cclxuXHRcdFx0XHRyZXR1cm4gdGhpcy5tZXJnZU1vZGlmaWVkcyhtb2RpZmllZHMpO1xyXG5cdFx0XHR9KTtcclxuXHRcdH0pXHJcblxyXG5cdFx0LnRoZW4ocmVtb3RlRGVsZXRlcyA9PiB7XHJcblx0XHRcdHRoaXMuc3RlcFByb2dyZXNzKCk7XHJcblxyXG5cdFx0XHQvLyBzZW5kIHZhbHVlcyB3ZSBjcmVhdGVkIHNpbmNlIHRoZSBsYXN0IHN5bmNcclxuXHRcdFx0cmV0dXJuIHRoaXMuY3JlYXRlKHJlbW90ZURlbGV0ZXMpXHJcblxyXG5cdFx0XHQvLyByZW1vdmUgYW55IGl0ZW1zIHRoYXQgd2hlcmUgZGVsZXRlZCByZW1vdGx5XHJcblx0XHRcdC50aGVuKCgpID0+IHtcclxuXHRcdFx0XHR0aGlzLnN0ZXBQcm9ncmVzcygpO1xyXG5cclxuXHRcdFx0XHRyZXR1cm4gdGhpcy5hcHBseURlbGV0ZXMocmVtb3RlRGVsZXRlcyk7XHJcblx0XHRcdH0pO1xyXG5cdFx0fSlcclxuXHJcblx0XHQvLyBjbGVhciB0aGUgY2hhbmdlc1xyXG5cdFx0LnRoZW4oKCkgPT4ge1xyXG5cdFx0XHR0aGlzLnN0ZXBQcm9ncmVzcygpO1xyXG5cclxuXHRcdFx0cmV0dXJuIHRoaXMuX2NoYW5nZVN0b3JlLnNldCh0aGlzLl9jaGFuZ2VzTmFtZSwgW10pO1xyXG5cdFx0fSlcclxuXHJcblx0XHQudGhlbigoKSA9PiB7XHJcblx0XHRcdHRoaXMuc3RlcFByb2dyZXNzKCk7XHJcblx0XHR9KTtcclxuXHR9XHJcblxyXG5cdC8vIGdldCB0aGUgbGFzdCBtb2RpZmllZCB0aW1lcyBmb3IgZWFjaCB2YWx1ZVxyXG5cdGdldE1vZGlmaWVkcygpIHtcclxuXHRcdHRoaXMuX2l0ZW1zID0ge307XHJcblxyXG5cdFx0cmV0dXJuIHRoaXMuX3JlbW90ZS5nZXRBbGwoKVxyXG5cclxuXHRcdC50aGVuKHZhbHVlcyA9PiB7XHJcblx0XHRcdHZhciBtb2RpZmllZHMgPSB7fTtcclxuXHJcblx0XHRcdGZvcihsZXQgdmFsdWUgb2YgdmFsdWVzKSB7XHJcblx0XHRcdFx0Ly8gc3RvcmUgdGhlIGl0ZW1zXHJcblx0XHRcdFx0dGhpcy5faXRlbXNbdmFsdWUuaWRdID0gdmFsdWU7XHJcblx0XHRcdFx0Ly8gZ2V0IHRoZSBtb2RpZmllZCB0aW1lc1xyXG5cdFx0XHRcdG1vZGlmaWVkc1t2YWx1ZS5pZF0gPSB2YWx1ZS5tb2RpZmllZDtcclxuXHRcdFx0fVxyXG5cclxuXHRcdFx0cmV0dXJuIG1vZGlmaWVkcztcclxuXHRcdH0pO1xyXG5cdH1cclxuXHJcblx0Ly8gcmVtb3ZlIHZhbHVlcyB3ZSBoYXZlIGRlbGV0ZWQgc2luY2UgdGhlIGxhc3Qgc3luY1xyXG5cdHJlbW92ZShtb2RpZmllZHMpIHtcclxuXHRcdHJldHVybiB0aGlzLl9jaGFuZ2VTdG9yZS5nZXQodGhpcy5fY2hhbmdlc05hbWUsIFtdKVxyXG5cclxuXHRcdC50aGVuKGNoYW5nZXMgPT4ge1xyXG5cdFx0XHR2YXIgcHJvbWlzZXMgPSBbXTtcclxuXHJcblx0XHRcdC8vIHJlbW92ZSB0aGUgaXRlbXMgd2UgcmVtb3ZlIGZyb20gbW9kaWZpZWRzXHJcblx0XHRcdGZvcihsZXQgY2hhbmdlIG9mIGNoYW5nZXMpIHtcclxuXHRcdFx0XHRpZihjaGFuZ2UudHlwZSA9PSBcInJlbW92ZVwiICYmIGNoYW5nZS50aW1lc3RhbXAgPj0gbW9kaWZpZWRzW2NoYW5nZS5pZF0pIHtcclxuXHRcdFx0XHRcdC8vIGRvbid0IHRyeSB0byBjcmVhdGUgdGhlIGl0ZW0gbG9jYWxseVxyXG5cdFx0XHRcdFx0ZGVsZXRlIG1vZGlmaWVkc1tjaGFuZ2UuaWRdO1xyXG5cclxuXHRcdFx0XHRcdC8vIGRlbGV0ZSBpdCByZW1vdGVseVxyXG5cdFx0XHRcdFx0cHJvbWlzZXMucHVzaCh0aGlzLl9yZW1vdGUucmVtb3ZlKGNoYW5nZS5pZCkpXHJcblx0XHRcdFx0fVxyXG5cdFx0XHR9XHJcblxyXG5cdFx0XHRyZXR1cm4gUHJvbWlzZS5hbGwocHJvbWlzZXMpO1xyXG5cdFx0fSk7XHJcblx0fVxyXG5cclxuXHQvLyB1cGRhdGUgdGhlIGxvY2FsL3JlbW90ZSB2YWx1ZXMgdGhhdCB3aGVyZSBjaGFuZ2VkXHJcblx0bWVyZ2VNb2RpZmllZHMobW9kaWZpZWRzKSB7XHJcblx0XHR2YXIgcmVtb3RlRGVsZXRlcyA9IFtdO1xyXG5cclxuXHRcdC8vIGdvIHRocm91Z2ggYWxsIHRoZSBtb2RpZmllZHNcclxuXHRcdHJldHVybiB0aGlzLl9sb2NhbC5nZXRBbGwoKVxyXG5cclxuXHRcdC50aGVuKHZhbHVlcyA9PiB7XHJcblx0XHRcdHZhciBwcm9taXNlcyA9IFtdO1xyXG5cdFx0XHQvLyBzdGFydCB3aXRoIGEgbGlzdCBvZiBhbGwgdGhlIGlkcyBhbmQgcmVtb3ZlIGlkcyB3ZSBoYXZlIGxvY2FsbHlcclxuXHRcdFx0dmFyIHJlbW90ZUNyZWF0ZXMgPSBPYmplY3QuZ2V0T3duUHJvcGVydHlOYW1lcyhtb2RpZmllZHMpO1xyXG5cclxuXHRcdFx0Ly8gY2hlY2sgYWxsIHRoZSBsb2NhbCB2YWx1ZXMgYWdhaW5zdCB0aGUgcmVtb3RlIG9uZXNcclxuXHRcdFx0Zm9yKGxldCB2YWx1ZSBvZiB2YWx1ZXMpIHtcclxuXHRcdFx0XHQvLyByZW1vdmUgaXRlbXMgd2UgYWxyZWFkeSBoYXZlIGZyb20gdGhlIGNyZWF0ZXNcclxuXHRcdFx0XHRsZXQgaW5kZXggPSByZW1vdGVDcmVhdGVzLmluZGV4T2YodmFsdWUuaWQpO1xyXG5cclxuXHRcdFx0XHRpZihpbmRleCAhPT0gLTEpIHtcclxuXHRcdFx0XHRcdHJlbW90ZUNyZWF0ZXMuc3BsaWNlKGluZGV4LCAxKTtcclxuXHRcdFx0XHR9XHJcblxyXG5cdFx0XHRcdC8vIGRlbGV0ZWQgZnJvbSB0aGUgcmVtb3RlIGFkYXB0b3JcclxuXHRcdFx0XHRpZighbW9kaWZpZWRzW3ZhbHVlLmlkXSkge1xyXG5cdFx0XHRcdFx0cmVtb3RlRGVsZXRlcy5wdXNoKHZhbHVlLmlkKTtcclxuXHRcdFx0XHR9XHJcblx0XHRcdFx0Ly8gdGhlIHJlbW90ZSB2ZXJzaW9uIGlzIG5ld2VyXHJcblx0XHRcdFx0ZWxzZSBpZihtb2RpZmllZHNbdmFsdWUuaWRdID4gdmFsdWUubW9kaWZpZWQpIHtcclxuXHRcdFx0XHRcdHByb21pc2VzLnB1c2goXHJcblx0XHRcdFx0XHRcdC8vIGZldGNoIHRoZSByZW1vdGUgdmFsdWVcclxuXHRcdFx0XHRcdFx0dGhpcy5nZXQodmFsdWUuaWQpXHJcblxyXG5cdFx0XHRcdFx0XHQudGhlbihuZXdWYWx1ZSA9PiB0aGlzLl9sb2NhbC5zZXQobmV3VmFsdWUpKVxyXG5cdFx0XHRcdFx0KTtcclxuXHRcdFx0XHR9XHJcblx0XHRcdFx0Ly8gdGhlIGxvY2FsIHZlcnNpb24gaXMgbmV3ZXJcclxuXHRcdFx0XHRlbHNlIGlmKG1vZGlmaWVkc1t2YWx1ZS5pZF0gPCB2YWx1ZS5tb2RpZmllZCkge1xyXG5cdFx0XHRcdFx0cHJvbWlzZXMucHVzaCh0aGlzLl9yZW1vdGUuc2V0KHZhbHVlKSk7XHJcblx0XHRcdFx0fVxyXG5cdFx0XHR9XHJcblxyXG5cdFx0XHQvLyBnZXQgdmFsdWVzIGZyb20gdGhlIHJlbW90ZSB3ZSBhcmUgbWlzc2luZ1xyXG5cdFx0XHRmb3IobGV0IGlkIG9mIHJlbW90ZUNyZWF0ZXMpIHtcclxuXHRcdFx0XHRwcm9taXNlcy5wdXNoKFxyXG5cdFx0XHRcdFx0dGhpcy5nZXQoaWQpXHJcblxyXG5cdFx0XHRcdFx0LnRoZW4obmV3VmFsdWUgPT4gdGhpcy5fbG9jYWwuc2V0KG5ld1ZhbHVlKSlcclxuXHRcdFx0XHQpO1xyXG5cdFx0XHR9XHJcblxyXG5cdFx0XHRyZXR1cm4gUHJvbWlzZS5hbGwocHJvbWlzZXMpO1xyXG5cdFx0fSlcclxuXHJcblx0XHQvLyByZXR1cm4gdGhlIGRlbGV0ZXNcclxuXHRcdC50aGVuKCgpID0+IHJlbW90ZURlbGV0ZXMpO1xyXG5cdH1cclxuXHJcblx0Ly8gZ2V0IGEgcmVtb3RlIHZhbHVlXHJcblx0Z2V0KGlkKSB7XHJcblx0XHRyZXR1cm4gUHJvbWlzZS5yZXNvbHZlKHRoaXMuX2l0ZW1zW2lkXSk7XHJcblx0fVxyXG5cclxuXHQvLyBzZW5kIGNyZWF0ZWQgdmFsdWVzIHRvIHRoZSBzZXJ2ZXJcclxuXHRjcmVhdGUocmVtb3RlRGVsZXRlcykge1xyXG5cdFx0cmV0dXJuIHRoaXMuX2NoYW5nZVN0b3JlLmdldCh0aGlzLl9jaGFuZ2VzTmFtZSlcclxuXHJcblx0XHQudGhlbigoY2hhbmdlcyA9IFtdKSA9PiB7XHJcblx0XHRcdHZhciBwcm9taXNlcyA9IFtdO1xyXG5cclxuXHRcdFx0Ly8gcmVtb3ZlIHRoZSBpdGVtcyB3ZSByZW1vdmUgZnJvbSBtb2RpZmllZHNcclxuXHRcdFx0Zm9yKGxldCBjaGFuZ2Ugb2YgY2hhbmdlcykge1xyXG5cdFx0XHRcdGlmKGNoYW5nZS50eXBlID09IFwiY3JlYXRlXCIpIHtcclxuXHRcdFx0XHRcdC8vIGlmIHdlIG1hcmtlZCB0aGlzIHZhbHVlIGFzIGEgZGVsZXRlIHVuZG8gdGhhdFxyXG5cdFx0XHRcdFx0bGV0IGluZGV4ID0gcmVtb3RlRGVsZXRlcy5pbmRleE9mKGNoYW5nZS5pZCk7XHJcblxyXG5cdFx0XHRcdFx0aWYoaW5kZXggIT09IC0xKSB7XHJcblx0XHRcdFx0XHRcdHJlbW90ZURlbGV0ZXMuc3BsaWNlKGluZGV4LCAxKTtcclxuXHRcdFx0XHRcdH1cclxuXHJcblx0XHRcdFx0XHQvLyBzYXZlIHRoZSB2YWx1ZSB0byB0aGUgcmVtb3RlXHJcblx0XHRcdFx0XHRwcm9taXNlcy5wdXNoKFxyXG5cdFx0XHRcdFx0XHR0aGlzLl9sb2NhbC5nZXQoY2hhbmdlLmlkKVxyXG5cclxuXHRcdFx0XHRcdFx0LnRoZW4odmFsdWUgPT4gdGhpcy5fcmVtb3RlLnNldCh2YWx1ZSkpXHJcblx0XHRcdFx0XHQpO1xyXG5cdFx0XHRcdH1cclxuXHRcdFx0fVxyXG5cclxuXHRcdFx0cmV0dXJuIFByb21pc2UuYWxsKHByb21pc2VzKTtcclxuXHRcdH0pO1xyXG5cdH1cclxuXHJcblx0Ly8gZGVsZXRlIHZhbHVlcyB0aGF0IHdoZXJlIGRlbGV0ZWQgZnJvbSB0aGUgcmVtb3RlIGhvc3RcclxuXHRhcHBseURlbGV0ZXMocmVtb3RlRGVsZXRlcykge1xyXG5cdFx0cmV0dXJuIFByb21pc2UuYWxsKHJlbW90ZURlbGV0ZXMubWFwKGlkID0+IHRoaXMuX2xvY2FsLnJlbW92ZShpZCkpKTtcclxuXHR9XHJcbn1cclxuXHJcbm1vZHVsZS5leHBvcnRzID0gU3luY2VyO1xyXG4iLCIvKipcclxuICogQ3JlYXRlIGEgZ2xvYmFsIG9iamVjdCB3aXRoIGNvbW1vbmx5IHVzZWQgbW9kdWxlcyB0byBhdm9pZCA1MCBtaWxsaW9uIHJlcXVpcmVzXHJcbiAqL1xyXG5cclxudmFyIEV2ZW50RW1pdHRlciA9IHJlcXVpcmUoXCIuL3V0aWwvZXZlbnQtZW1pdHRlclwiKTtcclxuXHJcbnZhciBsaWZlTGluZSA9IG5ldyBFdmVudEVtaXR0ZXIoKTtcclxuXHJcbi8vIGF0dGFjaCB1dGlsc1xyXG5saWZlTGluZS5EaXNwb3NhYmxlID0gcmVxdWlyZShcIi4vdXRpbC9kaXNwb3NhYmxlXCIpO1xyXG5saWZlTGluZS5FdmVudEVtaXR0ZXIgPSBFdmVudEVtaXR0ZXI7XHJcblxyXG4vLyBhdHRhY2ggbGlmZWxpbmUgdG8gdGhlIGdsb2JhbCBvYmplY3RcclxuKHR5cGVvZiB3aW5kb3cgPT0gXCJvYmplY3RcIiA/IHdpbmRvdyA6IHNlbGYpLmxpZmVMaW5lID0gbGlmZUxpbmU7XHJcbiIsIi8qKlxyXG4gKiBLZWVwIGEgbGlzdCBvZiBzdWJzY3JpcHRpb25zIHRvIHVuc3Vic2NyaWJlIGZyb20gdG9nZXRoZXJcclxuICovXHJcblxyXG5jbGFzcyBEaXNwb3NhYmxlIHtcclxuXHRjb25zdHJ1Y3RvcigpIHtcclxuXHRcdHRoaXMuX3N1YnNjcmlwdGlvbnMgPSBbXTtcclxuXHR9XHJcblxyXG5cdC8vIFVuc3Vic2NyaWJlIGZyb20gYWxsIHN1YnNjcmlwdGlvbnNcclxuXHRkaXNwb3NlKCkge1xyXG5cdFx0Ly8gcmVtb3ZlIHRoZSBmaXJzdCBzdWJzY3JpcHRpb24gdW50aWwgdGhlcmUgYXJlIG5vbmUgbGVmdFxyXG5cdFx0d2hpbGUodGhpcy5fc3Vic2NyaXB0aW9ucy5sZW5ndGggPiAwKSB7XHJcblx0XHRcdHRoaXMuX3N1YnNjcmlwdGlvbnMuc2hpZnQoKS51bnN1YnNjcmliZSgpO1xyXG5cdFx0fVxyXG5cdH1cclxuXHJcblx0Ly8gQWRkIGEgc3Vic2NyaXB0aW9uIHRvIHRoZSBkaXNwb3NhYmxlXHJcblx0YWRkKHN1YnNjcmlwdGlvbikge1xyXG5cdFx0dGhpcy5fc3Vic2NyaXB0aW9ucy5wdXNoKHN1YnNjcmlwdGlvbik7XHJcblx0fVxyXG5cclxuXHQvLyBkaXNwb3NlIHdoZW4gYW4gZXZlbnQgaXMgZmlyZWRcclxuXHRkaXNwb3NlT24oZW1pdHRlciwgZXZlbnQpIHtcclxuXHRcdHRoaXMuYWRkKGVtaXR0ZXIub24oZXZlbnQsICgpID0+IHRoaXMuZGlzcG9zZSgpKSk7XHJcblx0fVxyXG59O1xyXG5cclxubW9kdWxlLmV4cG9ydHMgPSBEaXNwb3NhYmxlO1xyXG4iLCIvKipcclxuICogQSBiYXNpYyBldmVudCBlbWl0dGVyXHJcbiAqL1xyXG5cclxuY2xhc3MgRXZlbnRFbWl0dGVyIHtcclxuXHRjb25zdHJ1Y3RvcigpIHtcclxuXHRcdHRoaXMuX2xpc3RlbmVycyA9IHt9O1xyXG5cdH1cclxuXHJcblx0LyoqXHJcblx0ICogQWRkIGFuIGV2ZW50IGxpc3RlbmVyXHJcblx0ICovXHJcblx0b24obmFtZSwgbGlzdGVuZXIpIHtcclxuXHRcdC8vIGlmIHdlIGRvbid0IGhhdmUgYW4gZXhpc3RpbmcgbGlzdGVuZXJzIGFycmF5IGNyZWF0ZSBvbmVcclxuXHRcdGlmKCF0aGlzLl9saXN0ZW5lcnNbbmFtZV0pIHtcclxuXHRcdFx0dGhpcy5fbGlzdGVuZXJzW25hbWVdID0gW107XHJcblx0XHR9XHJcblxyXG5cdFx0Ly8gYWRkIHRoZSBsaXN0ZW5lclxyXG5cdFx0dGhpcy5fbGlzdGVuZXJzW25hbWVdLnB1c2gobGlzdGVuZXIpO1xyXG5cclxuXHRcdC8vIGdpdmUgdGhlbSBhIHN1YnNjcmlwdGlvblxyXG5cdFx0cmV0dXJuIHtcclxuXHRcdFx0X2xpc3RlbmVyOiBsaXN0ZW5lcixcclxuXHJcblx0XHRcdHVuc3Vic2NyaWJlOiAoKSA9PiB7XHJcblx0XHRcdFx0Ly8gZmluZCB0aGUgbGlzdGVuZXJcclxuXHRcdFx0XHR2YXIgaW5kZXggPSB0aGlzLl9saXN0ZW5lcnNbbmFtZV0uaW5kZXhPZihsaXN0ZW5lcik7XHJcblxyXG5cdFx0XHRcdGlmKGluZGV4ICE9PSAtMSkge1xyXG5cdFx0XHRcdFx0dGhpcy5fbGlzdGVuZXJzW25hbWVdLnNwbGljZShpbmRleCwgMSk7XHJcblx0XHRcdFx0fVxyXG5cdFx0XHR9XHJcblx0XHR9O1xyXG5cdH1cclxuXHJcblx0LyoqXHJcblx0ICogRW1pdCBhbiBldmVudFxyXG5cdCAqL1xyXG5cdGVtaXQobmFtZSwgLi4uYXJncykge1xyXG5cdFx0Ly8gY2hlY2sgZm9yIGxpc3RlbmVyc1xyXG5cdFx0aWYodGhpcy5fbGlzdGVuZXJzW25hbWVdKSB7XHJcblx0XHRcdGZvcihsZXQgbGlzdGVuZXIgb2YgdGhpcy5fbGlzdGVuZXJzW25hbWVdKSB7XHJcblx0XHRcdFx0Ly8gY2FsbCB0aGUgbGlzdGVuZXJzXHJcblx0XHRcdFx0bGlzdGVuZXIoLi4uYXJncyk7XHJcblx0XHRcdH1cclxuXHRcdH1cclxuXHR9XHJcblxyXG5cdC8qKlxyXG5cdCAqIEVtaXQgYW4gZXZlbnQgYW5kIHNraXAgc29tZSBsaXN0ZW5lcnNcclxuXHQgKi9cclxuXHRwYXJ0aWFsRW1pdChuYW1lLCBza2lwcyA9IFtdLCAuLi5hcmdzKSB7XHJcblx0XHQvLyBhbGxvdyBhIHNpbmdsZSBpdGVtXHJcblx0XHRpZighQXJyYXkuaXNBcnJheShza2lwcykpIHtcclxuXHRcdFx0c2tpcHMgPSBbc2tpcHNdO1xyXG5cdFx0fVxyXG5cclxuXHRcdC8vIGNoZWNrIGZvciBsaXN0ZW5lcnNcclxuXHRcdGlmKHRoaXMuX2xpc3RlbmVyc1tuYW1lXSkge1xyXG5cdFx0XHRmb3IobGV0IGxpc3RlbmVyIG9mIHRoaXMuX2xpc3RlbmVyc1tuYW1lXSkge1xyXG5cdFx0XHRcdC8vIHRoaXMgZXZlbnQgbGlzdGVuZXIgaXMgYmVpbmcgc2tpcGVkXHJcblx0XHRcdFx0aWYoc2tpcHMuZmluZChza2lwID0+IHNraXAuX2xpc3RlbmVyID09IGxpc3RlbmVyKSkge1xyXG5cdFx0XHRcdFx0Y29udGludWU7XHJcblx0XHRcdFx0fVxyXG5cclxuXHRcdFx0XHQvLyBjYWxsIHRoZSBsaXN0ZW5lcnNcclxuXHRcdFx0XHRsaXN0ZW5lciguLi5hcmdzKTtcclxuXHRcdFx0fVxyXG5cdFx0fVxyXG5cdH1cclxufVxyXG5cclxubW9kdWxlLmV4cG9ydHMgPSBFdmVudEVtaXR0ZXI7XHJcbiJdfQ==
