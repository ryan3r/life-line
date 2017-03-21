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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCJub2RlX21vZHVsZXMvYnJvd3NlcmlmeS9saWIvX2VtcHR5LmpzIiwibm9kZV9tb2R1bGVzL2lkYi9saWIvaWRiLmpzIiwic3JjXFxjbGllbnRcXGRhdGEtc3RvcmVzXFxpZGItYWRhcHRvci5qcyIsInNyY1xcY2xpZW50XFxkYXRhLXN0b3Jlc1xcaW5kZXguanMiLCJzcmNcXGNsaWVudFxcZ2xvYmFsLmpzIiwic3JjXFxjbGllbnRcXGluZGV4LmpzIiwic3JjXFxjbGllbnRcXHN3LWhlbHBlci5qcyIsInNyY1xcY2xpZW50XFx1dGlsXFxkYXRlLmpzIiwic3JjXFxjbGllbnRcXHV0aWxcXGRvbS1tYWtlci5qcyIsInNyY1xcY2xpZW50XFx2aWV3c1xcYWNjb3VudC5qcyIsInNyY1xcY2xpZW50XFx2aWV3c1xcZWRpdC5qcyIsInNyY1xcY2xpZW50XFx2aWV3c1xcaXRlbS5qcyIsInNyY1xcY2xpZW50XFx2aWV3c1xcbGlzdHMuanMiLCJzcmNcXGNsaWVudFxcdmlld3NcXGxvZ2luLmpzIiwic3JjXFxjbGllbnRcXHZpZXdzXFx0b2RvLmpzIiwic3JjXFxjbGllbnRcXHZpZXdzXFx1c2Vycy5qcyIsInNyY1xcY2xpZW50XFx3aWRnZXRzXFxjb250ZW50LmpzIiwic3JjXFxjbGllbnRcXHdpZGdldHNcXGlucHV0LmpzIiwic3JjXFxjbGllbnRcXHdpZGdldHNcXGxpbmsuanMiLCJzcmNcXGNsaWVudFxcd2lkZ2V0c1xcbGlzdC5qcyIsInNyY1xcY2xpZW50XFx3aWRnZXRzXFxwcm9ncmVzcy5qcyIsInNyY1xcY2xpZW50XFx3aWRnZXRzXFxzaWRlYmFyLmpzIiwic3JjXFxjbGllbnRcXHdpZGdldHNcXHRvZ2dsZS1idG5zLmpzIiwic3JjXFxjb21tb25cXGJhY2t1cC5qcyIsInNyY1xcY29tbW9uXFxkYXRhLXN0b3Jlc1xcaHR0cC1hZGFwdG9yLmpzIiwic3JjXFxjb21tb25cXGRhdGEtc3RvcmVzXFxrZXktdmFsdWUtc3RvcmUuanMiLCJzcmNcXGNvbW1vblxcZGF0YS1zdG9yZXNcXHBvb2wtc3RvcmUuanMiLCJzcmNcXGNvbW1vblxcZGF0YS1zdG9yZXNcXHN5bmNlci5qcyIsInNyY1xcY29tbW9uXFxnbG9iYWwuanMiLCJzcmNcXGNvbW1vblxcdXRpbFxcZGlzcG9zYWJsZS5qcyIsInNyY1xcY29tbW9uXFx1dGlsXFxldmVudC1lbWl0dGVyLmpzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBO0FDQUE7O0FDQUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7Ozs7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b290IjoiIiwic291cmNlc0NvbnRlbnQiOlsiKGZ1bmN0aW9uIGUodCxuLHIpe2Z1bmN0aW9uIHMobyx1KXtpZighbltvXSl7aWYoIXRbb10pe3ZhciBhPXR5cGVvZiByZXF1aXJlPT1cImZ1bmN0aW9uXCImJnJlcXVpcmU7aWYoIXUmJmEpcmV0dXJuIGEobywhMCk7aWYoaSlyZXR1cm4gaShvLCEwKTt2YXIgZj1uZXcgRXJyb3IoXCJDYW5ub3QgZmluZCBtb2R1bGUgJ1wiK28rXCInXCIpO3Rocm93IGYuY29kZT1cIk1PRFVMRV9OT1RfRk9VTkRcIixmfXZhciBsPW5bb109e2V4cG9ydHM6e319O3Rbb11bMF0uY2FsbChsLmV4cG9ydHMsZnVuY3Rpb24oZSl7dmFyIG49dFtvXVsxXVtlXTtyZXR1cm4gcyhuP246ZSl9LGwsbC5leHBvcnRzLGUsdCxuLHIpfXJldHVybiBuW29dLmV4cG9ydHN9dmFyIGk9dHlwZW9mIHJlcXVpcmU9PVwiZnVuY3Rpb25cIiYmcmVxdWlyZTtmb3IodmFyIG89MDtvPHIubGVuZ3RoO28rKylzKHJbb10pO3JldHVybiBzfSkiLCIiLCIndXNlIHN0cmljdCc7XG5cbihmdW5jdGlvbigpIHtcbiAgZnVuY3Rpb24gdG9BcnJheShhcnIpIHtcbiAgICByZXR1cm4gQXJyYXkucHJvdG90eXBlLnNsaWNlLmNhbGwoYXJyKTtcbiAgfVxuXG4gIGZ1bmN0aW9uIHByb21pc2lmeVJlcXVlc3QocmVxdWVzdCkge1xuICAgIHJldHVybiBuZXcgUHJvbWlzZShmdW5jdGlvbihyZXNvbHZlLCByZWplY3QpIHtcbiAgICAgIHJlcXVlc3Qub25zdWNjZXNzID0gZnVuY3Rpb24oKSB7XG4gICAgICAgIHJlc29sdmUocmVxdWVzdC5yZXN1bHQpO1xuICAgICAgfTtcblxuICAgICAgcmVxdWVzdC5vbmVycm9yID0gZnVuY3Rpb24oKSB7XG4gICAgICAgIHJlamVjdChyZXF1ZXN0LmVycm9yKTtcbiAgICAgIH07XG4gICAgfSk7XG4gIH1cblxuICBmdW5jdGlvbiBwcm9taXNpZnlSZXF1ZXN0Q2FsbChvYmosIG1ldGhvZCwgYXJncykge1xuICAgIHZhciByZXF1ZXN0O1xuICAgIHZhciBwID0gbmV3IFByb21pc2UoZnVuY3Rpb24ocmVzb2x2ZSwgcmVqZWN0KSB7XG4gICAgICByZXF1ZXN0ID0gb2JqW21ldGhvZF0uYXBwbHkob2JqLCBhcmdzKTtcbiAgICAgIHByb21pc2lmeVJlcXVlc3QocmVxdWVzdCkudGhlbihyZXNvbHZlLCByZWplY3QpO1xuICAgIH0pO1xuXG4gICAgcC5yZXF1ZXN0ID0gcmVxdWVzdDtcbiAgICByZXR1cm4gcDtcbiAgfVxuXG4gIGZ1bmN0aW9uIHByb21pc2lmeUN1cnNvclJlcXVlc3RDYWxsKG9iaiwgbWV0aG9kLCBhcmdzKSB7XG4gICAgdmFyIHAgPSBwcm9taXNpZnlSZXF1ZXN0Q2FsbChvYmosIG1ldGhvZCwgYXJncyk7XG4gICAgcmV0dXJuIHAudGhlbihmdW5jdGlvbih2YWx1ZSkge1xuICAgICAgaWYgKCF2YWx1ZSkgcmV0dXJuO1xuICAgICAgcmV0dXJuIG5ldyBDdXJzb3IodmFsdWUsIHAucmVxdWVzdCk7XG4gICAgfSk7XG4gIH1cblxuICBmdW5jdGlvbiBwcm94eVByb3BlcnRpZXMoUHJveHlDbGFzcywgdGFyZ2V0UHJvcCwgcHJvcGVydGllcykge1xuICAgIHByb3BlcnRpZXMuZm9yRWFjaChmdW5jdGlvbihwcm9wKSB7XG4gICAgICBPYmplY3QuZGVmaW5lUHJvcGVydHkoUHJveHlDbGFzcy5wcm90b3R5cGUsIHByb3AsIHtcbiAgICAgICAgZ2V0OiBmdW5jdGlvbigpIHtcbiAgICAgICAgICByZXR1cm4gdGhpc1t0YXJnZXRQcm9wXVtwcm9wXTtcbiAgICAgICAgfSxcbiAgICAgICAgc2V0OiBmdW5jdGlvbih2YWwpIHtcbiAgICAgICAgICB0aGlzW3RhcmdldFByb3BdW3Byb3BdID0gdmFsO1xuICAgICAgICB9XG4gICAgICB9KTtcbiAgICB9KTtcbiAgfVxuXG4gIGZ1bmN0aW9uIHByb3h5UmVxdWVzdE1ldGhvZHMoUHJveHlDbGFzcywgdGFyZ2V0UHJvcCwgQ29uc3RydWN0b3IsIHByb3BlcnRpZXMpIHtcbiAgICBwcm9wZXJ0aWVzLmZvckVhY2goZnVuY3Rpb24ocHJvcCkge1xuICAgICAgaWYgKCEocHJvcCBpbiBDb25zdHJ1Y3Rvci5wcm90b3R5cGUpKSByZXR1cm47XG4gICAgICBQcm94eUNsYXNzLnByb3RvdHlwZVtwcm9wXSA9IGZ1bmN0aW9uKCkge1xuICAgICAgICByZXR1cm4gcHJvbWlzaWZ5UmVxdWVzdENhbGwodGhpc1t0YXJnZXRQcm9wXSwgcHJvcCwgYXJndW1lbnRzKTtcbiAgICAgIH07XG4gICAgfSk7XG4gIH1cblxuICBmdW5jdGlvbiBwcm94eU1ldGhvZHMoUHJveHlDbGFzcywgdGFyZ2V0UHJvcCwgQ29uc3RydWN0b3IsIHByb3BlcnRpZXMpIHtcbiAgICBwcm9wZXJ0aWVzLmZvckVhY2goZnVuY3Rpb24ocHJvcCkge1xuICAgICAgaWYgKCEocHJvcCBpbiBDb25zdHJ1Y3Rvci5wcm90b3R5cGUpKSByZXR1cm47XG4gICAgICBQcm94eUNsYXNzLnByb3RvdHlwZVtwcm9wXSA9IGZ1bmN0aW9uKCkge1xuICAgICAgICByZXR1cm4gdGhpc1t0YXJnZXRQcm9wXVtwcm9wXS5hcHBseSh0aGlzW3RhcmdldFByb3BdLCBhcmd1bWVudHMpO1xuICAgICAgfTtcbiAgICB9KTtcbiAgfVxuXG4gIGZ1bmN0aW9uIHByb3h5Q3Vyc29yUmVxdWVzdE1ldGhvZHMoUHJveHlDbGFzcywgdGFyZ2V0UHJvcCwgQ29uc3RydWN0b3IsIHByb3BlcnRpZXMpIHtcbiAgICBwcm9wZXJ0aWVzLmZvckVhY2goZnVuY3Rpb24ocHJvcCkge1xuICAgICAgaWYgKCEocHJvcCBpbiBDb25zdHJ1Y3Rvci5wcm90b3R5cGUpKSByZXR1cm47XG4gICAgICBQcm94eUNsYXNzLnByb3RvdHlwZVtwcm9wXSA9IGZ1bmN0aW9uKCkge1xuICAgICAgICByZXR1cm4gcHJvbWlzaWZ5Q3Vyc29yUmVxdWVzdENhbGwodGhpc1t0YXJnZXRQcm9wXSwgcHJvcCwgYXJndW1lbnRzKTtcbiAgICAgIH07XG4gICAgfSk7XG4gIH1cblxuICBmdW5jdGlvbiBJbmRleChpbmRleCkge1xuICAgIHRoaXMuX2luZGV4ID0gaW5kZXg7XG4gIH1cblxuICBwcm94eVByb3BlcnRpZXMoSW5kZXgsICdfaW5kZXgnLCBbXG4gICAgJ25hbWUnLFxuICAgICdrZXlQYXRoJyxcbiAgICAnbXVsdGlFbnRyeScsXG4gICAgJ3VuaXF1ZSdcbiAgXSk7XG5cbiAgcHJveHlSZXF1ZXN0TWV0aG9kcyhJbmRleCwgJ19pbmRleCcsIElEQkluZGV4LCBbXG4gICAgJ2dldCcsXG4gICAgJ2dldEtleScsXG4gICAgJ2dldEFsbCcsXG4gICAgJ2dldEFsbEtleXMnLFxuICAgICdjb3VudCdcbiAgXSk7XG5cbiAgcHJveHlDdXJzb3JSZXF1ZXN0TWV0aG9kcyhJbmRleCwgJ19pbmRleCcsIElEQkluZGV4LCBbXG4gICAgJ29wZW5DdXJzb3InLFxuICAgICdvcGVuS2V5Q3Vyc29yJ1xuICBdKTtcblxuICBmdW5jdGlvbiBDdXJzb3IoY3Vyc29yLCByZXF1ZXN0KSB7XG4gICAgdGhpcy5fY3Vyc29yID0gY3Vyc29yO1xuICAgIHRoaXMuX3JlcXVlc3QgPSByZXF1ZXN0O1xuICB9XG5cbiAgcHJveHlQcm9wZXJ0aWVzKEN1cnNvciwgJ19jdXJzb3InLCBbXG4gICAgJ2RpcmVjdGlvbicsXG4gICAgJ2tleScsXG4gICAgJ3ByaW1hcnlLZXknLFxuICAgICd2YWx1ZSdcbiAgXSk7XG5cbiAgcHJveHlSZXF1ZXN0TWV0aG9kcyhDdXJzb3IsICdfY3Vyc29yJywgSURCQ3Vyc29yLCBbXG4gICAgJ3VwZGF0ZScsXG4gICAgJ2RlbGV0ZSdcbiAgXSk7XG5cbiAgLy8gcHJveHkgJ25leHQnIG1ldGhvZHNcbiAgWydhZHZhbmNlJywgJ2NvbnRpbnVlJywgJ2NvbnRpbnVlUHJpbWFyeUtleSddLmZvckVhY2goZnVuY3Rpb24obWV0aG9kTmFtZSkge1xuICAgIGlmICghKG1ldGhvZE5hbWUgaW4gSURCQ3Vyc29yLnByb3RvdHlwZSkpIHJldHVybjtcbiAgICBDdXJzb3IucHJvdG90eXBlW21ldGhvZE5hbWVdID0gZnVuY3Rpb24oKSB7XG4gICAgICB2YXIgY3Vyc29yID0gdGhpcztcbiAgICAgIHZhciBhcmdzID0gYXJndW1lbnRzO1xuICAgICAgcmV0dXJuIFByb21pc2UucmVzb2x2ZSgpLnRoZW4oZnVuY3Rpb24oKSB7XG4gICAgICAgIGN1cnNvci5fY3Vyc29yW21ldGhvZE5hbWVdLmFwcGx5KGN1cnNvci5fY3Vyc29yLCBhcmdzKTtcbiAgICAgICAgcmV0dXJuIHByb21pc2lmeVJlcXVlc3QoY3Vyc29yLl9yZXF1ZXN0KS50aGVuKGZ1bmN0aW9uKHZhbHVlKSB7XG4gICAgICAgICAgaWYgKCF2YWx1ZSkgcmV0dXJuO1xuICAgICAgICAgIHJldHVybiBuZXcgQ3Vyc29yKHZhbHVlLCBjdXJzb3IuX3JlcXVlc3QpO1xuICAgICAgICB9KTtcbiAgICAgIH0pO1xuICAgIH07XG4gIH0pO1xuXG4gIGZ1bmN0aW9uIE9iamVjdFN0b3JlKHN0b3JlKSB7XG4gICAgdGhpcy5fc3RvcmUgPSBzdG9yZTtcbiAgfVxuXG4gIE9iamVjdFN0b3JlLnByb3RvdHlwZS5jcmVhdGVJbmRleCA9IGZ1bmN0aW9uKCkge1xuICAgIHJldHVybiBuZXcgSW5kZXgodGhpcy5fc3RvcmUuY3JlYXRlSW5kZXguYXBwbHkodGhpcy5fc3RvcmUsIGFyZ3VtZW50cykpO1xuICB9O1xuXG4gIE9iamVjdFN0b3JlLnByb3RvdHlwZS5pbmRleCA9IGZ1bmN0aW9uKCkge1xuICAgIHJldHVybiBuZXcgSW5kZXgodGhpcy5fc3RvcmUuaW5kZXguYXBwbHkodGhpcy5fc3RvcmUsIGFyZ3VtZW50cykpO1xuICB9O1xuXG4gIHByb3h5UHJvcGVydGllcyhPYmplY3RTdG9yZSwgJ19zdG9yZScsIFtcbiAgICAnbmFtZScsXG4gICAgJ2tleVBhdGgnLFxuICAgICdpbmRleE5hbWVzJyxcbiAgICAnYXV0b0luY3JlbWVudCdcbiAgXSk7XG5cbiAgcHJveHlSZXF1ZXN0TWV0aG9kcyhPYmplY3RTdG9yZSwgJ19zdG9yZScsIElEQk9iamVjdFN0b3JlLCBbXG4gICAgJ3B1dCcsXG4gICAgJ2FkZCcsXG4gICAgJ2RlbGV0ZScsXG4gICAgJ2NsZWFyJyxcbiAgICAnZ2V0JyxcbiAgICAnZ2V0QWxsJyxcbiAgICAnZ2V0S2V5JyxcbiAgICAnZ2V0QWxsS2V5cycsXG4gICAgJ2NvdW50J1xuICBdKTtcblxuICBwcm94eUN1cnNvclJlcXVlc3RNZXRob2RzKE9iamVjdFN0b3JlLCAnX3N0b3JlJywgSURCT2JqZWN0U3RvcmUsIFtcbiAgICAnb3BlbkN1cnNvcicsXG4gICAgJ29wZW5LZXlDdXJzb3InXG4gIF0pO1xuXG4gIHByb3h5TWV0aG9kcyhPYmplY3RTdG9yZSwgJ19zdG9yZScsIElEQk9iamVjdFN0b3JlLCBbXG4gICAgJ2RlbGV0ZUluZGV4J1xuICBdKTtcblxuICBmdW5jdGlvbiBUcmFuc2FjdGlvbihpZGJUcmFuc2FjdGlvbikge1xuICAgIHRoaXMuX3R4ID0gaWRiVHJhbnNhY3Rpb247XG4gICAgdGhpcy5jb21wbGV0ZSA9IG5ldyBQcm9taXNlKGZ1bmN0aW9uKHJlc29sdmUsIHJlamVjdCkge1xuICAgICAgaWRiVHJhbnNhY3Rpb24ub25jb21wbGV0ZSA9IGZ1bmN0aW9uKCkge1xuICAgICAgICByZXNvbHZlKCk7XG4gICAgICB9O1xuICAgICAgaWRiVHJhbnNhY3Rpb24ub25lcnJvciA9IGZ1bmN0aW9uKCkge1xuICAgICAgICByZWplY3QoaWRiVHJhbnNhY3Rpb24uZXJyb3IpO1xuICAgICAgfTtcbiAgICAgIGlkYlRyYW5zYWN0aW9uLm9uYWJvcnQgPSBmdW5jdGlvbigpIHtcbiAgICAgICAgcmVqZWN0KGlkYlRyYW5zYWN0aW9uLmVycm9yKTtcbiAgICAgIH07XG4gICAgfSk7XG4gIH1cblxuICBUcmFuc2FjdGlvbi5wcm90b3R5cGUub2JqZWN0U3RvcmUgPSBmdW5jdGlvbigpIHtcbiAgICByZXR1cm4gbmV3IE9iamVjdFN0b3JlKHRoaXMuX3R4Lm9iamVjdFN0b3JlLmFwcGx5KHRoaXMuX3R4LCBhcmd1bWVudHMpKTtcbiAgfTtcblxuICBwcm94eVByb3BlcnRpZXMoVHJhbnNhY3Rpb24sICdfdHgnLCBbXG4gICAgJ29iamVjdFN0b3JlTmFtZXMnLFxuICAgICdtb2RlJ1xuICBdKTtcblxuICBwcm94eU1ldGhvZHMoVHJhbnNhY3Rpb24sICdfdHgnLCBJREJUcmFuc2FjdGlvbiwgW1xuICAgICdhYm9ydCdcbiAgXSk7XG5cbiAgZnVuY3Rpb24gVXBncmFkZURCKGRiLCBvbGRWZXJzaW9uLCB0cmFuc2FjdGlvbikge1xuICAgIHRoaXMuX2RiID0gZGI7XG4gICAgdGhpcy5vbGRWZXJzaW9uID0gb2xkVmVyc2lvbjtcbiAgICB0aGlzLnRyYW5zYWN0aW9uID0gbmV3IFRyYW5zYWN0aW9uKHRyYW5zYWN0aW9uKTtcbiAgfVxuXG4gIFVwZ3JhZGVEQi5wcm90b3R5cGUuY3JlYXRlT2JqZWN0U3RvcmUgPSBmdW5jdGlvbigpIHtcbiAgICByZXR1cm4gbmV3IE9iamVjdFN0b3JlKHRoaXMuX2RiLmNyZWF0ZU9iamVjdFN0b3JlLmFwcGx5KHRoaXMuX2RiLCBhcmd1bWVudHMpKTtcbiAgfTtcblxuICBwcm94eVByb3BlcnRpZXMoVXBncmFkZURCLCAnX2RiJywgW1xuICAgICduYW1lJyxcbiAgICAndmVyc2lvbicsXG4gICAgJ29iamVjdFN0b3JlTmFtZXMnXG4gIF0pO1xuXG4gIHByb3h5TWV0aG9kcyhVcGdyYWRlREIsICdfZGInLCBJREJEYXRhYmFzZSwgW1xuICAgICdkZWxldGVPYmplY3RTdG9yZScsXG4gICAgJ2Nsb3NlJ1xuICBdKTtcblxuICBmdW5jdGlvbiBEQihkYikge1xuICAgIHRoaXMuX2RiID0gZGI7XG4gIH1cblxuICBEQi5wcm90b3R5cGUudHJhbnNhY3Rpb24gPSBmdW5jdGlvbigpIHtcbiAgICByZXR1cm4gbmV3IFRyYW5zYWN0aW9uKHRoaXMuX2RiLnRyYW5zYWN0aW9uLmFwcGx5KHRoaXMuX2RiLCBhcmd1bWVudHMpKTtcbiAgfTtcblxuICBwcm94eVByb3BlcnRpZXMoREIsICdfZGInLCBbXG4gICAgJ25hbWUnLFxuICAgICd2ZXJzaW9uJyxcbiAgICAnb2JqZWN0U3RvcmVOYW1lcydcbiAgXSk7XG5cbiAgcHJveHlNZXRob2RzKERCLCAnX2RiJywgSURCRGF0YWJhc2UsIFtcbiAgICAnY2xvc2UnXG4gIF0pO1xuXG4gIC8vIEFkZCBjdXJzb3IgaXRlcmF0b3JzXG4gIC8vIFRPRE86IHJlbW92ZSB0aGlzIG9uY2UgYnJvd3NlcnMgZG8gdGhlIHJpZ2h0IHRoaW5nIHdpdGggcHJvbWlzZXNcbiAgWydvcGVuQ3Vyc29yJywgJ29wZW5LZXlDdXJzb3InXS5mb3JFYWNoKGZ1bmN0aW9uKGZ1bmNOYW1lKSB7XG4gICAgW09iamVjdFN0b3JlLCBJbmRleF0uZm9yRWFjaChmdW5jdGlvbihDb25zdHJ1Y3Rvcikge1xuICAgICAgQ29uc3RydWN0b3IucHJvdG90eXBlW2Z1bmNOYW1lLnJlcGxhY2UoJ29wZW4nLCAnaXRlcmF0ZScpXSA9IGZ1bmN0aW9uKCkge1xuICAgICAgICB2YXIgYXJncyA9IHRvQXJyYXkoYXJndW1lbnRzKTtcbiAgICAgICAgdmFyIGNhbGxiYWNrID0gYXJnc1thcmdzLmxlbmd0aCAtIDFdO1xuICAgICAgICB2YXIgbmF0aXZlT2JqZWN0ID0gdGhpcy5fc3RvcmUgfHwgdGhpcy5faW5kZXg7XG4gICAgICAgIHZhciByZXF1ZXN0ID0gbmF0aXZlT2JqZWN0W2Z1bmNOYW1lXS5hcHBseShuYXRpdmVPYmplY3QsIGFyZ3Muc2xpY2UoMCwgLTEpKTtcbiAgICAgICAgcmVxdWVzdC5vbnN1Y2Nlc3MgPSBmdW5jdGlvbigpIHtcbiAgICAgICAgICBjYWxsYmFjayhyZXF1ZXN0LnJlc3VsdCk7XG4gICAgICAgIH07XG4gICAgICB9O1xuICAgIH0pO1xuICB9KTtcblxuICAvLyBwb2x5ZmlsbCBnZXRBbGxcbiAgW0luZGV4LCBPYmplY3RTdG9yZV0uZm9yRWFjaChmdW5jdGlvbihDb25zdHJ1Y3Rvcikge1xuICAgIGlmIChDb25zdHJ1Y3Rvci5wcm90b3R5cGUuZ2V0QWxsKSByZXR1cm47XG4gICAgQ29uc3RydWN0b3IucHJvdG90eXBlLmdldEFsbCA9IGZ1bmN0aW9uKHF1ZXJ5LCBjb3VudCkge1xuICAgICAgdmFyIGluc3RhbmNlID0gdGhpcztcbiAgICAgIHZhciBpdGVtcyA9IFtdO1xuXG4gICAgICByZXR1cm4gbmV3IFByb21pc2UoZnVuY3Rpb24ocmVzb2x2ZSkge1xuICAgICAgICBpbnN0YW5jZS5pdGVyYXRlQ3Vyc29yKHF1ZXJ5LCBmdW5jdGlvbihjdXJzb3IpIHtcbiAgICAgICAgICBpZiAoIWN1cnNvcikge1xuICAgICAgICAgICAgcmVzb2x2ZShpdGVtcyk7XG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgICAgfVxuICAgICAgICAgIGl0ZW1zLnB1c2goY3Vyc29yLnZhbHVlKTtcblxuICAgICAgICAgIGlmIChjb3VudCAhPT0gdW5kZWZpbmVkICYmIGl0ZW1zLmxlbmd0aCA9PSBjb3VudCkge1xuICAgICAgICAgICAgcmVzb2x2ZShpdGVtcyk7XG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgICAgfVxuICAgICAgICAgIGN1cnNvci5jb250aW51ZSgpO1xuICAgICAgICB9KTtcbiAgICAgIH0pO1xuICAgIH07XG4gIH0pO1xuXG4gIHZhciBleHAgPSB7XG4gICAgb3BlbjogZnVuY3Rpb24obmFtZSwgdmVyc2lvbiwgdXBncmFkZUNhbGxiYWNrKSB7XG4gICAgICB2YXIgcCA9IHByb21pc2lmeVJlcXVlc3RDYWxsKGluZGV4ZWREQiwgJ29wZW4nLCBbbmFtZSwgdmVyc2lvbl0pO1xuICAgICAgdmFyIHJlcXVlc3QgPSBwLnJlcXVlc3Q7XG5cbiAgICAgIHJlcXVlc3Qub251cGdyYWRlbmVlZGVkID0gZnVuY3Rpb24oZXZlbnQpIHtcbiAgICAgICAgaWYgKHVwZ3JhZGVDYWxsYmFjaykge1xuICAgICAgICAgIHVwZ3JhZGVDYWxsYmFjayhuZXcgVXBncmFkZURCKHJlcXVlc3QucmVzdWx0LCBldmVudC5vbGRWZXJzaW9uLCByZXF1ZXN0LnRyYW5zYWN0aW9uKSk7XG4gICAgICAgIH1cbiAgICAgIH07XG5cbiAgICAgIHJldHVybiBwLnRoZW4oZnVuY3Rpb24oZGIpIHtcbiAgICAgICAgcmV0dXJuIG5ldyBEQihkYik7XG4gICAgICB9KTtcbiAgICB9LFxuICAgIGRlbGV0ZTogZnVuY3Rpb24obmFtZSkge1xuICAgICAgcmV0dXJuIHByb21pc2lmeVJlcXVlc3RDYWxsKGluZGV4ZWREQiwgJ2RlbGV0ZURhdGFiYXNlJywgW25hbWVdKTtcbiAgICB9XG4gIH07XG5cbiAgaWYgKHR5cGVvZiBtb2R1bGUgIT09ICd1bmRlZmluZWQnKSB7XG4gICAgbW9kdWxlLmV4cG9ydHMgPSBleHA7XG4gIH1cbiAgZWxzZSB7XG4gICAgc2VsZi5pZGIgPSBleHA7XG4gIH1cbn0oKSk7XG4iLCIvKipcclxuICogQW4gaW5kZXhlZCBkYiBhZGFwdG9yXHJcbiAqL1xyXG5cclxudmFyIGlkYiA9IHJlcXVpcmUoXCJpZGJcIik7XHJcblxyXG5jb25zdCBWQUxJRF9TVE9SRVMgPSBbXCJhc3NpZ25tZW50c1wiLCBcInN5bmMtc3RvcmVcIl07XHJcblxyXG4vLyBvcGVuL3NldHVwIHRoZSBkYXRhYmFzZVxyXG52YXIgZGJQcm9taXNlID0gaWRiLm9wZW4oXCJkYXRhLXN0b3Jlc1wiLCAzLCBkYiA9PiB7XHJcblx0Ly8gdXBncmFkZSBvciBjcmVhdGUgdGhlIGRiXHJcblx0aWYoZGIub2xkVmVyc2lvbiA8IDEpXHJcblx0XHRkYi5jcmVhdGVPYmplY3RTdG9yZShcImFzc2lnbm1lbnRzXCIsIHsga2V5UGF0aDogXCJpZFwiIH0pO1xyXG5cdGlmKGRiLm9sZFZlcnNpb24gPCAyKVxyXG5cdFx0ZGIuY3JlYXRlT2JqZWN0U3RvcmUoXCJzeW5jLXN0b3JlXCIsIHsga2V5UGF0aDogXCJpZFwiIH0pO1xyXG5cclxuXHQvLyB0aGUgdmVyc2lvbiAyIHN5bmMtc3RvcmUgaGFkIGEgZGlmZmVyZW50IHN0cnVjdHVyZSB0aGF0IHRoZSB2ZXJzaW9uIDNcclxuXHRpZihkYi5vbGRWZXJzaW9uID09IDIpIHtcclxuXHRcdGRiLmRlbGV0ZU9iamVjdFN0b3JlKFwic3luYy1zdG9yZVwiKTtcclxuXHRcdGRiLmNyZWF0ZU9iamVjdFN0b3JlKFwic3luYy1zdG9yZVwiLCB7IGtleVBhdGg6IFwiaWRcIiB9KTtcclxuXHR9XHJcbn0pO1xyXG5cclxuY2xhc3MgSWRiQWRhcHRvciB7XHJcblx0Y29uc3RydWN0b3IobmFtZSkge1xyXG5cdFx0dGhpcy5uYW1lID0gbmFtZTtcclxuXHJcblx0XHQvLyBjaGVjayB0aGUgc3RvcmUgaXMgdmFsaWRcclxuXHRcdGlmKFZBTElEX1NUT1JFUy5pbmRleE9mKG5hbWUpID09PSAtMSkge1xyXG5cdFx0XHR0aHJvdyBuZXcgRXJyb3IoYFRoZSBkYXRhIHN0b3JlICR7bmFtZX0gaXMgbm90IGluIGlkYiB1cGRhdGUgdGhlIGRiYCk7XHJcblx0XHR9XHJcblx0fVxyXG5cclxuXHQvLyBjcmVhdGUgYSB0cmFuc2FjdGlvblxyXG5cdF90cmFuc2FjdGlvbihyZWFkV3JpdGUpIHtcclxuXHRcdHJldHVybiBkYlByb21pc2UudGhlbihkYiA9PiB7XHJcblx0XHRcdHJldHVybiBkYlxyXG5cdFx0XHRcdC50cmFuc2FjdGlvbih0aGlzLm5hbWUsIHJlYWRXcml0ZSAmJiBcInJlYWR3cml0ZVwiKVxyXG5cdFx0XHRcdC5vYmplY3RTdG9yZSh0aGlzLm5hbWUpO1xyXG5cdFx0fSk7XHJcblx0fVxyXG5cclxuXHQvKipcclxuXHQgKiBHZXQgYWxsIHRoZSB2YWx1ZXMgaW4gdGhlIG9iamVjdCBzdG9yZVxyXG5cdCAqL1xyXG5cdGdldEFsbCgpIHtcclxuXHRcdHJldHVybiB0aGlzLl90cmFuc2FjdGlvbigpXHJcblx0XHRcdC50aGVuKHRyYW5zID0+IHRyYW5zLmdldEFsbCgpKTtcclxuXHR9XHJcblxyXG5cdC8qKlxyXG5cdCAqIEdldCBhIHNwZWNpZmljIHZhbHVlXHJcblx0ICovXHJcblx0Z2V0KGtleSkge1xyXG5cdFx0cmV0dXJuIHRoaXMuX3RyYW5zYWN0aW9uKClcclxuXHRcdFx0LnRoZW4odHJhbnMgPT4gdHJhbnMuZ2V0KGtleSkpO1xyXG5cdH1cclxuXHJcblx0LyoqXHJcblx0ICogU3RvcmUgYSB2YWx1ZSBpbiBpZGJcclxuXHQgKi9cclxuXHRzZXQodmFsdWUpIHtcclxuXHRcdHJldHVybiB0aGlzLl90cmFuc2FjdGlvbih0cnVlKVxyXG5cdFx0XHQudGhlbih0cmFucyA9PiB0cmFucy5wdXQodmFsdWUpKTtcclxuXHR9XHJcblxyXG5cdC8qKlxyXG5cdCAqIFJlbW92ZSBhIHZhbHVlIGZyb20gaWRiXHJcblx0ICovXHJcblx0cmVtb3ZlKGtleSkge1xyXG5cdFx0cmV0dXJuIHRoaXMuX3RyYW5zYWN0aW9uKHRydWUpXHJcblx0XHRcdC50aGVuKHRyYW5zID0+IHRyYW5zLmRlbGV0ZShrZXkpKTtcclxuXHR9XHJcbn1cclxuXHJcbm1vZHVsZS5leHBvcnRzID0gSWRiQWRhcHRvcjtcclxuIiwiLyoqXHJcbiAqIEluc3RhbnRpYXRlIGFsbCB0aGUgZGF0YSBzdG9yZXNcclxuICovXHJcblxyXG52YXIgSHR0cEFkYXB0b3IgPSByZXF1aXJlKFwiLi4vLi4vY29tbW9uL2RhdGEtc3RvcmVzL2h0dHAtYWRhcHRvclwiKTtcclxudmFyIFBvb2xTdG9yZSA9IHJlcXVpcmUoXCIuLi8uLi9jb21tb24vZGF0YS1zdG9yZXMvcG9vbC1zdG9yZVwiKTtcclxudmFyIFN5bmNlciA9IHJlcXVpcmUoXCIuLi8uLi9jb21tb24vZGF0YS1zdG9yZXMvc3luY2VyXCIpO1xyXG52YXIgSWRiQWRhcHRvciA9IHJlcXVpcmUoXCIuL2lkYi1hZGFwdG9yXCIpO1xyXG5cclxudmFyIGluaXRJdGVtID0gaXRlbSA9PiB7XHJcblx0Ly8gaW5zdGFudGlhdGUgdGhlIGRhdGVcclxuXHRpZihpdGVtLmRhdGUpIHtcclxuXHRcdGl0ZW0uZGF0ZSA9IG5ldyBEYXRlKGl0ZW0uZGF0ZSk7XHJcblx0fVxyXG59O1xyXG5cclxuLy8gY3JlYXRlIGEgc3luY2VyXHJcbnZhciBhc3NpZ25tZW50c0FkYXB0b3IgPSBuZXcgU3luY2VyKHtcclxuXHRyZW1vdGU6IG5ldyBIdHRwQWRhcHRvcihcIi9hcGkvZGF0YS9cIiksXHJcblx0bG9jYWw6IG5ldyBJZGJBZGFwdG9yKFwiYXNzaWdubWVudHNcIiksXHJcblx0Y2hhbmdlU3RvcmU6IG5ldyBJZGJBZGFwdG9yKFwic3luYy1zdG9yZVwiKVxyXG59KTtcclxuXHJcbmV4cG9ydHMuYXNzaWdubWVudHMgPSBuZXcgUG9vbFN0b3JlKGFzc2lnbm1lbnRzQWRhcHRvciwgaW5pdEl0ZW0pO1xyXG5cclxuLy8gY2hlY2sgb3VyIGFjY2VzcyBsZXZlbFxyXG5hc3NpZ25tZW50c0FkYXB0b3IuYWNjZXNzTGV2ZWwoKVxyXG5cclxuLnRoZW4obGV2ZWwgPT4ge1xyXG5cdC8vIHdlIGFyZSBsb2dnZWQgb3V0XHJcblx0aWYobGV2ZWwgPT0gXCJub25lXCIpIHtcclxuXHRcdGxpZmVMaW5lLm5hdi5uYXZpZ2F0ZShcIi9sb2dpblwiKTtcclxuXHR9XHJcbn0pO1xyXG5cclxudmFyIHByb2dyZXNzO1xyXG5cclxuLy8gc3RhcnQgdGhlIHN5bmNcclxuYXNzaWdubWVudHNBZGFwdG9yLm9uKFwic3luYy1zdGFydFwiLCAoKSA9PiBwcm9ncmVzcyA9IG5ldyBsaWZlTGluZS5Qcm9ncmVzcygpKVxyXG4vLyB1cGRhdGUgdGhlIHByb2dyZXNzXHJcbmFzc2lnbm1lbnRzQWRhcHRvci5vbihcInByb2dyZXNzXCIsIHZhbHVlID0+IHByb2dyZXNzLnNldCh2YWx1ZSkpO1xyXG4vLyB0aGUgc3luYyBpcyBkb25lXHJcbmFzc2lnbm1lbnRzQWRhcHRvci5vbihcInN5bmMtY29tcGxldGVcIiwgdmFsdWUgPT4gcHJvZ3Jlc3Muc2V0KDEpKTtcclxuXHJcbi8vIHRyaWdnZXIgYSBzeW5jXHJcbmxpZmVMaW5lLnN5bmMgPSBmdW5jdGlvbigpIHtcclxuXHQvLyB0cmlnZ2VyIGEgc3luY1xyXG5cdHJldHVybiBhc3NpZ25tZW50c0FkYXB0b3Iuc3luYygpXHJcblxyXG5cdC8vIGZvcmNlIGEgcmVmZXNoXHJcblx0LnRoZW4oKCkgPT4gbGlmZUxpbmUubmF2Lm5hdmlnYXRlKGxvY2F0aW9uLnBhdGhuYW1lKSk7XHJcbn07XHJcblxyXG5pZih0eXBlb2Ygd2luZG93ID09IFwib2JqZWN0XCIpIHtcclxuXHQvLyBpbml0aWFsIHN5bmNcclxuXHRzZXRUaW1lb3V0KCgpID0+IGxpZmVMaW5lLnN5bmMoKSk7XHJcblxyXG5cdC8vIHN5bmMgd2hlbiB3ZSByZXZpc2l0IHRoZSBwYWdlXHJcblx0d2luZG93LmFkZEV2ZW50TGlzdGVuZXIoXCJ2aXNpYmlsaXR5Y2hhbmdlXCIsICgpID0+IHtcclxuXHRcdGlmKCFkb2N1bWVudC5oaWRkZW4pIHtcclxuXHRcdFx0bGlmZUxpbmUuc3luYygpO1xyXG5cdFx0fVxyXG5cdH0pO1xyXG5cclxuXHQvLyBzeW5jIHdoZW4gd2UgcmVjb25uZWN0XHJcblx0d2luZG93LmFkZEV2ZW50TGlzdGVuZXIoXCJvbmxpbmVcIiwgKCkgPT4ge1xyXG5cdFx0bGlmZUxpbmUuc3luYygpO1xyXG5cdH0pO1xyXG59XHJcbiIsIi8qKlxyXG4gKiBCcm93c2VyIHNwZWNpZmljIGdsb2JhbHNcclxuICovXHJcblxyXG5saWZlTGluZS5tYWtlRG9tID0gcmVxdWlyZShcIi4vdXRpbC9kb20tbWFrZXJcIik7XHJcblxyXG4vLyBhZGQgYSBmdW5jdGlvbiBmb3IgYWRkaW5nIGFjdGlvbnNcclxubGlmZUxpbmUuYWRkQWN0aW9uID0gZnVuY3Rpb24obmFtZSwgZm4pIHtcclxuXHQvLyBhdHRhY2ggdGhlIGNhbGxiYWNrXHJcblx0dmFyIGxpc3RlbmVyID0gbGlmZUxpbmUub24oXCJhY3Rpb24tZXhlYy1cIiArIG5hbWUsIGZuKTtcclxuXHJcblx0Ly8gaW5mb3JtIGFueSBhY3Rpb24gcHJvdmlkZXJzXHJcblx0bGlmZUxpbmUuZW1pdChcImFjdGlvbi1jcmVhdGVcIiwgbmFtZSk7XHJcblxyXG5cdC8vIGFsbCBhY3Rpb25zIHJlbW92ZWRcclxuXHR2YXIgcmVtb3ZlQWxsID0gbGlmZUxpbmUub24oXCJhY3Rpb24tcmVtb3ZlLWFsbFwiLCAoKSA9PiB7XHJcblx0XHQvLyByZW1vdmUgdGhlIGFjdGlvbiBsaXN0ZW5lclxyXG5cdFx0bGlzdGVuZXIudW5zdWJzY3JpYmUoKTtcclxuXHRcdHJlbW92ZUFsbC51bnN1YnNjcmliZSgpO1xyXG5cdH0pO1xyXG5cclxuXHRyZXR1cm4ge1xyXG5cdFx0dW5zdWJzY3JpYmUoKSB7XHJcblx0XHRcdC8vIHJlbW92ZSB0aGUgYWN0aW9uIGxpc3RlbmVyXHJcblx0XHRcdGxpc3RlbmVyLnVuc3Vic2NyaWJlKCk7XHJcblx0XHRcdHJlbW92ZUFsbC51bnN1YnNjcmliZSgpO1xyXG5cclxuXHRcdFx0Ly8gaW5mb3JtIGFueSBhY3Rpb24gcHJvdmlkZXJzXHJcblx0XHRcdGxpZmVMaW5lLmVtaXQoXCJhY3Rpb24tcmVtb3ZlXCIsIG5hbWUpO1xyXG5cdFx0fVxyXG5cdH07XHJcbn07XHJcbiIsIi8vIGNyZWF0ZSB0aGUgZ2xvYmFsIG9iamVjdFxyXG5yZXF1aXJlKFwiLi4vY29tbW9uL2dsb2JhbFwiKTtcclxucmVxdWlyZShcIi4vZ2xvYmFsXCIpO1xyXG5cclxuLy8gbG9hZCBhbGwgdGhlIHdpZGdldHNcclxucmVxdWlyZShcIi4vd2lkZ2V0cy9zaWRlYmFyXCIpO1xyXG5yZXF1aXJlKFwiLi93aWRnZXRzL2NvbnRlbnRcIik7XHJcbnJlcXVpcmUoXCIuL3dpZGdldHMvbGlua1wiKTtcclxucmVxdWlyZShcIi4vd2lkZ2V0cy9saXN0XCIpO1xyXG5yZXF1aXJlKFwiLi93aWRnZXRzL2lucHV0XCIpO1xyXG5yZXF1aXJlKFwiLi93aWRnZXRzL3Byb2dyZXNzXCIpO1xyXG5yZXF1aXJlKFwiLi93aWRnZXRzL3RvZ2dsZS1idG5zXCIpO1xyXG5cclxuLy8gbG9hZCBhbGwgdGhlIHZpZXdzXHJcbnZhciB7aW5pdE5hdkJhcn0gPSByZXF1aXJlKFwiLi92aWV3cy9saXN0c1wiKTtcclxucmVxdWlyZShcIi4vdmlld3MvaXRlbVwiKTtcclxucmVxdWlyZShcIi4vdmlld3MvZWRpdFwiKTtcclxucmVxdWlyZShcIi4vdmlld3MvbG9naW5cIik7XHJcbnJlcXVpcmUoXCIuL3ZpZXdzL2FjY291bnRcIik7XHJcbnJlcXVpcmUoXCIuL3ZpZXdzL3VzZXJzXCIpO1xyXG5yZXF1aXJlKFwiLi92aWV3cy90b2RvXCIpO1xyXG5cclxuLy8gaW5zdGFudGlhdGUgdGhlIGRvbVxyXG5saWZlTGluZS5tYWtlRG9tKHtcclxuXHRwYXJlbnQ6IGRvY3VtZW50LmJvZHksXHJcblx0Z3JvdXA6IFtcclxuXHRcdHsgd2lkZ2V0OiBcInNpZGViYXJcIiB9LFxyXG5cdFx0eyB3aWRnZXQ6IFwicHJvZ3Jlc3NcIiB9LFxyXG5cdFx0eyB3aWRnZXQ6IFwiY29udGVudFwiIH1cclxuXHRdXHJcbn0pO1xyXG5cclxuLy8gQWRkIGEgbGluayB0byB0aGUgdG9kYS9ob21lIHBhZ2VcclxubGlmZUxpbmUuYWRkTmF2Q29tbWFuZChcIlRvZG9cIiwgXCIvXCIpO1xyXG5cclxuLy8gYWRkIGxpc3Qgdmlld3MgdG8gdGhlIG5hdmJhclxyXG5pbml0TmF2QmFyKCk7XHJcblxyXG4vLyBjcmVhdGUgYSBuZXcgYXNzaWdubWVudFxyXG5saWZlTGluZS5hZGRDb21tYW5kKFwiTmV3IGFzc2lnbm1lbnRcIiwgKCkgPT4ge1xyXG5cdHZhciBpZCA9IE1hdGguZmxvb3IoTWF0aC5yYW5kb20oKSAqIDEwMDAwMDAwMCk7XHJcblxyXG5cdGxpZmVMaW5lLm5hdi5uYXZpZ2F0ZShcIi9lZGl0L1wiICsgaWQpO1xyXG59KTtcclxuXHJcbi8vIGNyZWF0ZSB0aGUgbG9nb3V0IGJ1dHRvblxyXG5saWZlTGluZS5hZGROYXZDb21tYW5kKFwiQWNjb3VudFwiLCBcIi9hY2NvdW50XCIpO1xyXG5cclxuLy8gcmVnaXN0ZXIgdGhlIHNlcnZpY2Ugd29ya2VyXHJcbnJlcXVpcmUoXCIuL3N3LWhlbHBlclwiKTtcclxuIiwiLyoqXHJcbiAqIFJlZ2lzdGVyIGFuZCBjb21tdW5pY2F0ZSB3aXRoIHRoZSBzZXJ2aWNlIHdvcmtlclxyXG4gKi9cclxuXHJcbiAvLyByZWdpc3RlciB0aGUgc2VydmljZSB3b3JrZXJcclxuIGlmKG5hdmlnYXRvci5zZXJ2aWNlV29ya2VyKSB7XHJcblx0IC8vIG1ha2Ugc3VyZSBpdCdzIHJlZ2lzdGVyZWRcclxuXHQgbmF2aWdhdG9yLnNlcnZpY2VXb3JrZXIucmVnaXN0ZXIoXCIvc2VydmljZS13b3JrZXIuanNcIik7XHJcblxyXG5cdCAvLyBsaXN0ZW4gZm9yIG1lc3NhZ2VzXHJcblx0IG5hdmlnYXRvci5zZXJ2aWNlV29ya2VyLmFkZEV2ZW50TGlzdGVuZXIoXCJtZXNzYWdlXCIsIGUgPT4ge1xyXG5cdFx0IC8vIHdlIGp1c3QgdXBkYXRlZFxyXG5cdFx0IGlmKGUuZGF0YS50eXBlID09IFwidmVyc2lvbi1jaGFuZ2VcIikge1xyXG5cdFx0XHQgY29uc29sZS5sb2coXCJVcGRhdGVkIHRvXCIsIGUuZGF0YS52ZXJzaW9uKTtcclxuXHJcblx0XHRcdCAvLyBpbiBkZXYgbW9kZSByZWxvYWQgdGhlIHBhZ2VcclxuXHRcdFx0IGlmKGUuZGF0YS52ZXJzaW9uLmluZGV4T2YoXCJAXCIpICE9PSAtMSkge1xyXG5cdFx0XHRcdCBsb2NhdGlvbi5yZWxvYWQoKTtcclxuXHRcdFx0IH1cclxuXHRcdCB9XHJcblx0IH0pO1xyXG4gfVxyXG4iLCIvKipcclxuKiBEYXRlIHJlbGF0ZWQgdG9vbHNcclxuKi9cclxuXHJcbi8vIGNoZWNrIGlmIHRoZSBkYXRlcyBhcmUgdGhlIHNhbWUgZGF5XHJcbmV4cG9ydHMuaXNTYW1lRGF0ZSA9IGZ1bmN0aW9uKGRhdGUxLCBkYXRlMikge1xyXG5cdHJldHVybiBkYXRlMS5nZXRGdWxsWWVhcigpID09IGRhdGUyLmdldEZ1bGxZZWFyKCkgJiZcclxuXHRcdGRhdGUxLmdldE1vbnRoKCkgPT0gZGF0ZTIuZ2V0TW9udGgoKSAmJlxyXG5cdFx0ZGF0ZTEuZ2V0RGF0ZSgpID09IGRhdGUyLmdldERhdGUoKTtcclxufTtcclxuXHJcbi8vIGNoZWNrIGlmIGEgZGF0ZSBpcyBsZXNzIHRoYW4gYW5vdGhlclxyXG5leHBvcnRzLmlzU29vbmVyRGF0ZSA9IGZ1bmN0aW9uKGRhdGUxLCBkYXRlMikge1xyXG4gICAgLy8gY2hlY2sgdGhlIHllYXIgZmlyc3RcclxuICAgIGlmKGRhdGUxLmdldEZ1bGxZZWFyKCkgIT0gZGF0ZTIuZ2V0RnVsbFllYXIoKSkge1xyXG4gICAgICAgIHJldHVybiBkYXRlMS5nZXRGdWxsWWVhcigpIDwgZGF0ZTIuZ2V0RnVsbFllYXIoKTtcclxuICAgIH1cclxuXHJcbiAgICAvLyBjaGVjayB0aGUgbW9udGggbmV4dFxyXG4gICAgaWYoZGF0ZTEuZ2V0TW9udGgoKSAhPSBkYXRlMi5nZXRNb250aCgpKSB7XHJcbiAgICAgICAgcmV0dXJuIGRhdGUxLmdldE1vbnRoKCkgPCBkYXRlMi5nZXRNb250aCgpO1xyXG4gICAgfVxyXG5cclxuICAgIC8vIGNoZWNrIHRoZSBkYXlcclxuICAgIHJldHVybiBkYXRlMS5nZXREYXRlKCkgPCBkYXRlMi5nZXREYXRlKCk7XHJcbn07XHJcblxyXG4vLyBnZXQgdGhlIGRhdGUgZGF5cyBmcm9tIG5vd1xyXG5leHBvcnRzLmRheXNGcm9tTm93ID0gZnVuY3Rpb24oZGF5cykge1xyXG5cdHZhciBkYXRlID0gbmV3IERhdGUoKTtcclxuXHJcblx0Ly8gYWR2YW5jZSB0aGUgZGF0ZVxyXG5cdGRhdGUuc2V0RGF0ZShkYXRlLmdldERhdGUoKSArIGRheXMpO1xyXG5cclxuXHRyZXR1cm4gZGF0ZTtcclxufTtcclxuXHJcbmNvbnN0IFNUUklOR19EQVlTID0gW1wiU3VuZGF5XCIsIFwiTW9uZGF5XCIsIFwiVHVlc2RheVwiLCBcIldlZGVuc2RheVwiLCBcIlRodXJzZGF5XCIsIFwiRnJpZGF5XCIsIFwiU2F0dXJkYXlcIl07XHJcblxyXG4vLyBjb252ZXJ0IGEgZGF0ZSB0byBhIHN0cmluZ1xyXG5leHBvcnRzLnN0cmluZ2lmeURhdGUgPSBmdW5jdGlvbihkYXRlLCBvcHRzID0ge30pIHtcclxuXHQgdmFyIHN0ckRhdGUsIHN0clRpbWUgPSBcIlwiO1xyXG5cclxuICAgIC8vIGNoZWNrIGlmIHRoZSBkYXRlIGlzIGJlZm9yZSB0b2RheVxyXG4gICAgdmFyIGJlZm9yZU5vdyA9IGRhdGUuZ2V0VGltZSgpIDwgRGF0ZS5ub3coKTtcclxuXHJcblx0Ly8gVG9kYXlcclxuXHRpZihleHBvcnRzLmlzU2FtZURhdGUoZGF0ZSwgbmV3IERhdGUoKSkpXHJcblx0XHRzdHJEYXRlID0gXCJUb2RheVwiO1xyXG5cclxuXHQvLyBUb21vcnJvd1xyXG5cdGVsc2UgaWYoZXhwb3J0cy5pc1NhbWVEYXRlKGRhdGUsIGV4cG9ydHMuZGF5c0Zyb21Ob3coMSkpICYmICFiZWZvcmVOb3cpXHJcblx0XHRzdHJEYXRlID0gXCJUb21vcnJvd1wiO1xyXG5cclxuXHQvLyBkYXkgb2YgdGhlIHdlZWsgKHRoaXMgd2VlaylcclxuXHRlbHNlIGlmKGV4cG9ydHMuaXNTb29uZXJEYXRlKGRhdGUsIGV4cG9ydHMuZGF5c0Zyb21Ob3coNykpICYmICFiZWZvcmVOb3cpXHJcblx0XHRzdHJEYXRlID0gU1RSSU5HX0RBWVNbZGF0ZS5nZXREYXkoKV07XHJcblxyXG5cdC8vIHByaW50IHRoZSBkYXRlXHJcblx0ZWxzZVxyXG5cdCBcdHN0ckRhdGUgPSBgJHtTVFJJTkdfREFZU1tkYXRlLmdldERheSgpXX0gJHtkYXRlLmdldE1vbnRoKCkgKyAxfS8ke2RhdGUuZ2V0RGF0ZSgpfWA7XHJcblxyXG5cdC8vIGFkZCB0aGUgdGltZSBvblxyXG5cdGlmKG9wdHMuaW5jbHVkZVRpbWUgJiYgIWV4cG9ydHMuaXNTa2lwVGltZShkYXRlLCBvcHRzLnNraXBUaW1lcykpIHtcclxuXHRcdHJldHVybiBzdHJEYXRlICsgXCIsIFwiICsgZXhwb3J0cy5zdHJpbmdpZnlUaW1lKGRhdGUpO1xyXG5cdH1cclxuXHJcblx0cmV0dXJuIHN0ckRhdGU7XHJcbn07XHJcblxyXG4vLyBjaGVjayBpZiB0aGlzIGlzIG9uZSBvZiB0aGUgZ2l2ZW4gc2tpcCB0aW1lc1xyXG5leHBvcnRzLmlzU2tpcFRpbWUgPSBmdW5jdGlvbihkYXRlLCBza2lwcyA9IFtdKSB7XHJcblx0cmV0dXJuIHNraXBzLmZpbmQoc2tpcCA9PiB7XHJcblx0XHRyZXR1cm4gc2tpcC5ob3VyID09PSBkYXRlLmdldEhvdXJzKCkgJiYgc2tpcC5taW51dGUgPT09IGRhdGUuZ2V0TWludXRlcygpO1xyXG5cdH0pO1xyXG59O1xyXG5cclxuLy8gY29udmVydCBhIHRpbWUgdG8gYSBzdHJpbmdcclxuZXhwb3J0cy5zdHJpbmdpZnlUaW1lID0gZnVuY3Rpb24oZGF0ZSkge1xyXG5cdHZhciBob3VyID0gZGF0ZS5nZXRIb3VycygpO1xyXG5cclxuXHQvLyBnZXQgdGhlIGFtL3BtIHRpbWVcclxuXHR2YXIgaXNBbSA9IGhvdXIgPCAxMjtcclxuXHJcblx0Ly8gbWlkbmlnaHRcclxuXHRpZihob3VyID09PSAwKSBob3VyID0gMTI7XHJcblx0Ly8gYWZ0ZXIgbm9vblxyXG5cdGlmKGhvdXIgPiAxMikgaG91ciA9IGhvdXIgLSAxMjtcclxuXHJcblx0dmFyIG1pbnV0ZSA9IGRhdGUuZ2V0TWludXRlcygpO1xyXG5cclxuXHQvLyBhZGQgYSBsZWFkaW5nIDBcclxuXHRpZihtaW51dGUgPCAxMCkgbWludXRlID0gXCIwXCIgKyBtaW51dGU7XHJcblxyXG5cdHJldHVybiBob3VyICsgXCI6XCIgKyBtaW51dGUgKyAoaXNBbSA/IFwiYW1cIiA6IFwicG1cIik7XHJcbn1cclxuIiwiLyoqXHJcbiAqIEEgaGVscGVyIGZvciBidWlsZGluZyBkb20gbm9kZXNcclxuICovXHJcblxyXG5jb25zdCBTVkdfRUxFTUVOVFMgPSBbXCJzdmdcIiwgXCJsaW5lXCJdO1xyXG5jb25zdCBTVkdfTkFNRVNQQUNFID0gXCJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2Z1wiO1xyXG5cclxuLy8gYnVpbGQgYSBzaW5nbGUgZG9tIG5vZGVcclxudmFyIG1ha2VEb20gPSBmdW5jdGlvbihvcHRzID0ge30pIHtcclxuXHQvLyBnZXQgb3IgY3JlYXRlIHRoZSBuYW1lIG1hcHBpbmdcclxuXHR2YXIgbWFwcGVkID0gb3B0cy5tYXBwZWQgfHwge307XHJcblxyXG5cdHZhciAkZWw7XHJcblxyXG5cdC8vIHRoZSBlbGVtZW50IGlzIHBhcnQgb2YgdGhlIHN2ZyBuYW1lc3BhY2VcclxuXHRpZihTVkdfRUxFTUVOVFMuaW5kZXhPZihvcHRzLnRhZykgIT09IC0xKSB7XHJcblx0XHQkZWwgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50TlMoU1ZHX05BTUVTUEFDRSwgb3B0cy50YWcpO1xyXG5cdH1cclxuXHQvLyBhIHBsYWluIGVsZW1lbnRcclxuXHRlbHNlIHtcclxuXHRcdCRlbCA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQob3B0cy50YWcgfHwgXCJkaXZcIik7XHJcblx0fVxyXG5cclxuXHQvLyBzZXQgdGhlIGNsYXNzZXNcclxuXHRpZihvcHRzLmNsYXNzZXMpIHtcclxuXHRcdCRlbC5zZXRBdHRyaWJ1dGUoXCJjbGFzc1wiLCB0eXBlb2Ygb3B0cy5jbGFzc2VzID09IFwic3RyaW5nXCIgPyBvcHRzLmNsYXNzZXMgOiBvcHRzLmNsYXNzZXMuam9pbihcIiBcIikpO1xyXG5cdH1cclxuXHJcblx0Ly8gYXR0YWNoIHRoZSBhdHRyaWJ1dGVzXHJcblx0aWYob3B0cy5hdHRycykge1xyXG5cdFx0T2JqZWN0LmdldE93blByb3BlcnR5TmFtZXMob3B0cy5hdHRycylcclxuXHJcblx0XHQuZm9yRWFjaChhdHRyID0+ICRlbC5zZXRBdHRyaWJ1dGUoYXR0ciwgb3B0cy5hdHRyc1thdHRyXSkpO1xyXG5cdH1cclxuXHJcblx0Ly8gc2V0IHRoZSB0ZXh0IGNvbnRlbnRcclxuXHRpZihvcHRzLnRleHQpIHtcclxuXHRcdCRlbC5pbm5lclRleHQgPSBvcHRzLnRleHQ7XHJcblx0fVxyXG5cclxuXHQvLyBhdHRhY2ggdGhlIG5vZGUgdG8gaXRzIHBhcmVudFxyXG5cdGlmKG9wdHMucGFyZW50KSB7XHJcblx0XHRvcHRzLnBhcmVudC5pbnNlcnRCZWZvcmUoJGVsLCBvcHRzLmJlZm9yZSk7XHJcblx0fVxyXG5cclxuXHQvLyBhZGQgZXZlbnQgbGlzdGVuZXJzXHJcblx0aWYob3B0cy5vbikge1xyXG5cdFx0Zm9yKGxldCBuYW1lIG9mIE9iamVjdC5nZXRPd25Qcm9wZXJ0eU5hbWVzKG9wdHMub24pKSB7XHJcblx0XHRcdCRlbC5hZGRFdmVudExpc3RlbmVyKG5hbWUsIG9wdHMub25bbmFtZV0pO1xyXG5cclxuXHRcdFx0Ly8gYXR0YWNoIHRoZSBkb20gdG8gYSBkaXNwb3NhYmxlXHJcblx0XHRcdGlmKG9wdHMuZGlzcCkge1xyXG5cdFx0XHRcdG9wdHMuZGlzcC5hZGQoe1xyXG5cdFx0XHRcdFx0dW5zdWJzY3JpYmU6ICgpID0+ICRlbC5yZW1vdmVFdmVudExpc3RlbmVyKG5hbWUsIG9wdHMub25bbmFtZV0pXHJcblx0XHRcdFx0fSk7XHJcblx0XHRcdH1cclxuXHRcdH1cclxuXHR9XHJcblxyXG5cdC8vIHNldCB0aGUgdmFsdWUgb2YgYW4gaW5wdXQgZWxlbWVudFxyXG5cdGlmKG9wdHMudmFsdWUpIHtcclxuXHRcdCRlbC52YWx1ZSA9IG9wdHMudmFsdWU7XHJcblx0fVxyXG5cclxuXHQvLyBhZGQgdGhlIG5hbWUgbWFwcGluZ1xyXG5cdGlmKG9wdHMubmFtZSkge1xyXG5cdFx0bWFwcGVkW29wdHMubmFtZV0gPSAkZWw7XHJcblx0fVxyXG5cclxuXHQvLyBjcmVhdGUgdGhlIGNoaWxkIGRvbSBub2Rlc1xyXG5cdGlmKG9wdHMuY2hpbGRyZW4pIHtcclxuXHRcdGZvcihsZXQgY2hpbGQgb2Ygb3B0cy5jaGlsZHJlbikge1xyXG5cdFx0XHQvLyBtYWtlIGFuIGFycmF5IGludG8gYSBncm91cCBPYmplY3RcclxuXHRcdFx0aWYoQXJyYXkuaXNBcnJheShjaGlsZCkpIHtcclxuXHRcdFx0XHRjaGlsZCA9IHtcclxuXHRcdFx0XHRcdGdyb3VwOiBjaGlsZFxyXG5cdFx0XHRcdH07XHJcblx0XHRcdH1cclxuXHJcblx0XHRcdC8vIGF0dGFjaCBpbmZvcm1hdGlvbiBmb3IgdGhlIGdyb3VwXHJcblx0XHRcdGNoaWxkLnBhcmVudCA9ICRlbDtcclxuXHRcdFx0Y2hpbGQuZGlzcCA9IG9wdHMuZGlzcDtcclxuXHRcdFx0Y2hpbGQubWFwcGVkID0gbWFwcGVkO1xyXG5cclxuXHRcdFx0Ly8gYnVpbGQgdGhlIG5vZGUgb3IgZ3JvdXBcclxuXHRcdFx0bWFrZShjaGlsZCk7XHJcblx0XHR9XHJcblx0fVxyXG5cclxuXHRyZXR1cm4gbWFwcGVkO1xyXG59XHJcblxyXG4vLyBidWlsZCBhIGdyb3VwIG9mIGRvbSBub2Rlc1xyXG52YXIgbWFrZUdyb3VwID0gZnVuY3Rpb24oZ3JvdXApIHtcclxuXHQvLyBzaG9ydGhhbmQgZm9yIGEgZ3JvdXBzXHJcblx0aWYoQXJyYXkuaXNBcnJheShncm91cCkpIHtcclxuXHRcdGdyb3VwID0ge1xyXG5cdFx0XHRjaGlsZHJlbjogZ3JvdXBcclxuXHRcdH07XHJcblx0fVxyXG5cclxuXHQvLyBnZXQgb3IgY3JlYXRlIHRoZSBuYW1lIG1hcHBpbmdcclxuXHR2YXIgbWFwcGVkID0ge307XHJcblxyXG5cdGZvcihsZXQgbm9kZSBvZiBncm91cC5ncm91cCkge1xyXG5cdFx0Ly8gY29weSBvdmVyIHByb3BlcnRpZXMgZnJvbSB0aGUgZ3JvdXBcclxuXHRcdG5vZGUucGFyZW50IHx8IChub2RlLnBhcmVudCA9IGdyb3VwLnBhcmVudCk7XHJcblx0XHRub2RlLmRpc3AgfHwgKG5vZGUuZGlzcCA9IGdyb3VwLmRpc3ApO1xyXG5cdFx0bm9kZS5tYXBwZWQgPSBtYXBwZWQ7XHJcblxyXG5cdFx0Ly8gbWFrZSB0aGUgZG9tXHJcblx0XHRtYWtlKG5vZGUpO1xyXG5cdH1cclxuXHJcblx0Ly8gY2FsbCB0aGUgY2FsbGJhY2sgd2l0aCB0aGUgbWFwcGVkIG5hbWVzXHJcblx0aWYoZ3JvdXAuYmluZCkge1xyXG5cdFx0dmFyIHN1YnNjcmlwdGlvbiA9IGdyb3VwLmJpbmQobWFwcGVkKTtcclxuXHJcblx0XHQvLyBpZiB0aGUgcmV0dXJuIGEgc3Vic2NyaXB0aW9uIGF0dGFjaCBpdCB0byB0aGUgZGlzcG9zYWJsZVxyXG5cdFx0aWYoc3Vic2NyaXB0aW9uICYmIGdyb3VwLmRpc3ApIHtcclxuXHRcdFx0Z3JvdXAuZGlzcC5hZGQoc3Vic2NyaXB0aW9uKTtcclxuXHRcdH1cclxuXHR9XHJcblxyXG5cdHJldHVybiBtYXBwZWQ7XHJcbn07XHJcblxyXG4vLyBhIGNvbGxlY3Rpb24gb2Ygd2lkZ2V0c1xyXG52YXIgd2lkZ2V0cyA9IHt9O1xyXG5cclxudmFyIG1ha2UgPSBtb2R1bGUuZXhwb3J0cyA9IGZ1bmN0aW9uKG9wdHMpIHtcclxuXHQvLyBoYW5kbGUgYSBncm91cFxyXG5cdGlmKEFycmF5LmlzQXJyYXkob3B0cykgfHwgb3B0cy5ncm91cCkge1xyXG5cdFx0cmV0dXJuIG1ha2VHcm91cChvcHRzKTtcclxuXHR9XHJcblx0Ly8gbWFrZSBhIHdpZGdldFxyXG5cdGVsc2UgaWYob3B0cy53aWRnZXQpIHtcclxuXHRcdHZhciB3aWRnZXQgPSB3aWRnZXRzW29wdHMud2lkZ2V0XTtcclxuXHJcblx0XHQvLyBub3QgZGVmaW5lZFxyXG5cdFx0aWYoIXdpZGdldCkge1xyXG5cdFx0XHR0aHJvdyBuZXcgRXJyb3IoYFdpZGdldCAnJHtvcHRzLndpZGdldH0nIGlzIG5vdCBkZWZpbmVkIG1ha2Ugc3VyZSBpdHMgYmVlbiBpbXBvcnRlZGApO1xyXG5cdFx0fVxyXG5cclxuXHRcdC8vIGdlbmVyYXRlIHRoZSB3aWRnZXQgY29udGVudFxyXG5cdFx0dmFyIGJ1aWx0ID0gd2lkZ2V0Lm1ha2Uob3B0cyk7XHJcblxyXG5cdFx0cmV0dXJuIG1ha2VHcm91cCh7XHJcblx0XHRcdHBhcmVudDogb3B0cy5wYXJlbnQsXHJcblx0XHRcdGRpc3A6IG9wdHMuZGlzcCxcclxuXHRcdFx0Z3JvdXA6IEFycmF5LmlzQXJyYXkoYnVpbHQpID8gYnVpbHQgOiBbYnVpbHRdLFxyXG5cdFx0XHRiaW5kOiB3aWRnZXQuYmluZCAmJiB3aWRnZXQuYmluZC5iaW5kKHdpZGdldCwgb3B0cylcclxuXHRcdH0pO1xyXG5cdH1cclxuXHQvLyBtYWtlIGEgc2luZ2xlIG5vZGVcclxuXHRlbHNlIHtcclxuXHRcdHJldHVybiBtYWtlRG9tKG9wdHMpO1xyXG5cdH1cclxufTtcclxuXHJcbi8vIHJlZ2lzdGVyIGEgd2lkZ2V0XHJcbm1ha2UucmVnaXN0ZXIgPSBmdW5jdGlvbihuYW1lLCB3aWRnZXQpIHtcclxuXHR3aWRnZXRzW25hbWVdID0gd2lkZ2V0O1xyXG59O1xyXG4iLCIvKipcclxuICogQSB2aWV3IGZvciBhY2Nlc3NpbmcvbW9kaWZ5aW5nIGluZm9ybWF0aW9uIGFib3V0IHRoZSBjdXJyZW50IHVzZXJcclxuICovXHJcblxyXG52YXIge2dlbkJhY2t1cE5hbWV9ID0gcmVxdWlyZShcIi4uLy4uL2NvbW1vbi9iYWNrdXBcIik7XHJcblxyXG5saWZlTGluZS5uYXYucmVnaXN0ZXIoe1xyXG5cdG1hdGNoZXI6IC9eKD86XFwvdXNlclxcLyguKz8pfFxcL2FjY291bnQpJC8sXHJcblxyXG5cdG1ha2Uoe3NldFRpdGxlLCBjb250ZW50LCBtYXRjaH0pIHtcclxuXHRcdHNldFRpdGxlKFwiQWNjb3VudFwiKTtcclxuXHJcblx0XHR2YXIgdXJsID0gXCIvYXBpL2F1dGgvaW5mby9nZXRcIjtcclxuXHJcblx0XHQvLyBhZGQgdGhlIHVzZXJuYW1lIGlmIG9uZSBpcyBnaXZlblxyXG5cdFx0aWYobWF0Y2hbMV0pIHVybCArPSBgP3VzZXJuYW1lPSR7bWF0Y2hbMV19YDtcclxuXHJcblx0XHQvLyBsb2FkIHRoZSB1c2VyIGRhdGFcclxuXHRcdGZldGNoKHVybCwgeyBjcmVkZW50aWFsczogXCJpbmNsdWRlXCIgfSlcclxuXHJcblx0XHQudGhlbihyZXMgPT4gcmVzLmpzb24oKSlcclxuXHJcblx0XHQudGhlbihyZXMgPT4ge1xyXG5cdFx0XHQvLyBubyBzdWNoIHVzZXIgb3IgYWNjZXNzIGlzIGRlbmllZFxyXG5cdFx0XHRpZihyZXMuc3RhdHVzID09IFwiZmFpbFwiKSB7XHJcblx0XHRcdFx0bGlmZUxpbmUubWFrZURvbSh7XHJcblx0XHRcdFx0XHRwYXJlbnQ6IGNvbnRlbnQsXHJcblx0XHRcdFx0XHRjbGFzc2VzOiBcImNvbnRlbnQtcGFkZGVkXCIsXHJcblx0XHRcdFx0XHR0ZXh0OiBcIkNvdWxkIG5vdCBhY2Nlc3MgdGhlIHVzZXIgeW91IHdlcmUgbG9va2luZyBmb3JcIlxyXG5cdFx0XHRcdH0pO1xyXG5cclxuXHRcdFx0XHRyZXR1cm47XHJcblx0XHRcdH1cclxuXHJcblx0XHRcdHZhciB1c2VyID0gcmVzLmRhdGE7XHJcblxyXG5cdFx0XHQvLyBnZW5lcmF0ZSB0aGUgcGFnZVxyXG5cdFx0XHR2YXIgY2hpbGRyZW4gPSBbXTtcclxuXHJcblx0XHRcdGNoaWxkcmVuLnB1c2goe1xyXG5cdFx0XHRcdHRhZzogXCJoMlwiLFxyXG5cdFx0XHRcdHRleHQ6IHVzZXIudXNlcm5hbWVcclxuXHRcdFx0fSk7XHJcblxyXG5cdFx0XHQvLyBkaXNwbGF5IHRoZSBhZG1pbiBzdGF0dXMgb2YgYW5vdGhlciB1c2VyXHJcblx0XHRcdGlmKG1hdGNoWzFdKSB7XHJcblx0XHRcdFx0Y2hpbGRyZW4ucHVzaCh7XHJcblx0XHRcdFx0XHR0ZXh0OiBgJHt1c2VyLnVzZXJuYW1lfSBpcyAke3VzZXIuYWRtaW4gPyBcIlwiIDogXCJub3RcIn0gYW4gYWRtaW5gXHJcblx0XHRcdFx0fSk7XHJcblx0XHRcdH1cclxuXHRcdFx0Ly8gZGlzcGxheSB0aGUgYWRtaW4gc3RhdHVzIG9mIHRoaXMgdXNlclxyXG5cdFx0XHRlbHNlIHtcclxuXHRcdFx0XHRjaGlsZHJlbi5wdXNoKHtcclxuXHRcdFx0XHRcdHRleHQ6IGBZb3UgYXJlICR7dXNlci5hZG1pbiA/IFwiXCIgOiBcIm5vdFwifSBhbiBhZG1pbmBcclxuXHRcdFx0XHR9KTtcclxuXHJcblx0XHRcdFx0Ly8gYWRkIGEgbGluayBhdCBhIGxpc3Qgb2YgYWxsIHVzZXJzXHJcblx0XHRcdFx0aWYodXNlci5hZG1pbikge1xyXG5cdFx0XHRcdFx0Y2hpbGRyZW4ucHVzaCh7IHRhZzogXCJiclwiIH0pO1xyXG5cclxuXHRcdFx0XHRcdGNoaWxkcmVuLnB1c2goe1xyXG5cdFx0XHRcdFx0XHR3aWRnZXQ6IFwibGlua1wiLFxyXG5cdFx0XHRcdFx0XHRocmVmOiBcIi91c2Vyc1wiLFxyXG5cdFx0XHRcdFx0XHR0ZXh0OiBcIlZpZXcgYWxsIHVzZXJzXCJcclxuXHRcdFx0XHRcdH0pO1xyXG5cdFx0XHRcdH1cclxuXHRcdFx0fVxyXG5cclxuXHRcdFx0Ly8gY3JlYXRlIGEgYmFja3VwIGxpbmtcclxuXHRcdFx0aWYoIW1hdGNoWzFdKSB7XHJcblx0XHRcdFx0Y2hpbGRyZW4ucHVzaCh7IHRhZzogXCJiclwiIH0pO1xyXG5cdFx0XHRcdGNoaWxkcmVuLnB1c2goeyB0YWc6IFwiYnJcIiB9KTtcclxuXHJcblx0XHRcdFx0Y2hpbGRyZW4ucHVzaCh7XHJcblx0XHRcdFx0XHR0YWc6IFwiYVwiLFxyXG5cdFx0XHRcdFx0dGV4dDogXCJEb3dubG9hZCBiYWNrdXBcIixcclxuXHRcdFx0XHRcdGF0dHJzOiB7XHJcblx0XHRcdFx0XHRcdGhyZWY6IFwiL2FwaS9iYWNrdXBcIixcclxuXHRcdFx0XHRcdFx0ZG93bmxvYWQ6IGdlbkJhY2t1cE5hbWUoKVxyXG5cdFx0XHRcdFx0fVxyXG5cdFx0XHRcdH0pO1xyXG5cdFx0XHR9XHJcblxyXG5cdFx0XHR2YXIgcGFzc3dvcmRDaGFuZ2UgPSB7fTtcclxuXHJcblx0XHRcdGNoaWxkcmVuLnB1c2goe1xyXG5cdFx0XHRcdHRhZzogXCJmb3JtXCIsXHJcblx0XHRcdFx0Y2hpbGRyZW46IFtcclxuXHRcdFx0XHRcdHtcclxuXHRcdFx0XHRcdFx0Y2xhc3NlczogXCJlZGl0b3Itcm93XCIsXHJcblx0XHRcdFx0XHRcdGNoaWxkcmVuOiBbXHJcblx0XHRcdFx0XHRcdFx0e1xyXG5cdFx0XHRcdFx0XHRcdFx0d2lkZ2V0OiBcImlucHV0XCIsXHJcblx0XHRcdFx0XHRcdFx0XHR0eXBlOiBcInBhc3N3b3JkXCIsXHJcblx0XHRcdFx0XHRcdFx0XHRwbGFjZWhvbGRlcjogXCJPbGQgcGFzc3dvcmRcIixcclxuXHRcdFx0XHRcdFx0XHRcdGJpbmQ6IHBhc3N3b3JkQ2hhbmdlLFxyXG5cdFx0XHRcdFx0XHRcdFx0cHJvcDogXCJvbGRQYXNzd29yZFwiXHJcblx0XHRcdFx0XHRcdFx0fSxcclxuXHRcdFx0XHRcdFx0XHR7XHJcblx0XHRcdFx0XHRcdFx0XHR3aWRnZXQ6IFwiaW5wdXRcIixcclxuXHRcdFx0XHRcdFx0XHRcdHR5cGU6IFwicGFzc3dvcmRcIixcclxuXHRcdFx0XHRcdFx0XHRcdHBsYWNlaG9sZGVyOiBcIk5ldyBwYXNzd29yZFwiLFxyXG5cdFx0XHRcdFx0XHRcdFx0YmluZDogcGFzc3dvcmRDaGFuZ2UsXHJcblx0XHRcdFx0XHRcdFx0XHRwcm9wOiBcInBhc3N3b3JkXCJcclxuXHRcdFx0XHRcdFx0XHR9XHJcblx0XHRcdFx0XHRcdF1cclxuXHRcdFx0XHRcdH0sXHJcblx0XHRcdFx0XHR7XHJcblx0XHRcdFx0XHRcdHRhZzogXCJidXR0b25cIixcclxuXHRcdFx0XHRcdFx0Y2xhc3NlczogXCJmYW5jeS1idXR0b25cIixcclxuXHRcdFx0XHRcdFx0dGV4dDogXCJDaGFuZ2UgcGFzc3dvcmRcIixcclxuXHRcdFx0XHRcdFx0YXR0cnM6IHtcclxuXHRcdFx0XHRcdFx0XHR0eXBlOiBcInN1Ym1pdFwiXHJcblx0XHRcdFx0XHRcdH1cclxuXHRcdFx0XHRcdH0sXHJcblx0XHRcdFx0XHR7XHJcblx0XHRcdFx0XHRcdG5hbWU6IFwibXNnXCJcclxuXHRcdFx0XHRcdH1cclxuXHRcdFx0XHRdLFxyXG5cdFx0XHRcdG9uOiB7XHJcblx0XHRcdFx0XHQvLyBjaGFuZ2UgdGhlIHBhc3N3b3JkXHJcblx0XHRcdFx0XHRzdWJtaXQ6IGUgPT4ge1xyXG5cdFx0XHRcdFx0XHRlLnByZXZlbnREZWZhdWx0KCk7XHJcblxyXG5cdFx0XHRcdFx0XHQvLyBubyBwYXNzd29yZCBzdXBwbGllZFxyXG5cdFx0XHRcdFx0XHRpZighcGFzc3dvcmRDaGFuZ2UucGFzc3dvcmQpIHtcclxuXHRcdFx0XHRcdFx0XHRzaG93TXNnKFwiRW50ZXIgYSBuZXcgcGFzc3dvcmRcIik7XHJcblx0XHRcdFx0XHRcdFx0cmV0dXJuO1xyXG5cdFx0XHRcdFx0XHR9XHJcblxyXG5cdFx0XHRcdFx0XHQvLyBzZW5kIHRoZSBwYXNzd29yZCBjaGFuZ2UgcmVxdWVzdFxyXG5cdFx0XHRcdFx0XHRmZXRjaChgL2FwaS9hdXRoL2luZm8vc2V0P3VzZXJuYW1lPSR7dXNlci51c2VybmFtZX1gLCB7XHJcblx0XHRcdFx0XHRcdFx0Y3JlZGVudGlhbHM6IFwiaW5jbHVkZVwiLFxyXG5cdFx0XHRcdFx0XHRcdG1ldGhvZDogXCJQT1NUXCIsXHJcblx0XHRcdFx0XHRcdFx0Ym9keTogSlNPTi5zdHJpbmdpZnkocGFzc3dvcmRDaGFuZ2UpXHJcblx0XHRcdFx0XHRcdH0pXHJcblxyXG5cdFx0XHRcdFx0XHQudGhlbihyZXMgPT4gcmVzLmpzb24oKSlcclxuXHJcblx0XHRcdFx0XHRcdC50aGVuKHJlcyA9PiB7XHJcblx0XHRcdFx0XHRcdFx0Ly8gcGFzc3dvcmQgY2hhbmdlIGZhaWxlZFxyXG5cdFx0XHRcdFx0XHRcdGlmKHJlcy5zdGF0dXMgPT0gXCJmYWlsXCIpIHtcclxuXHRcdFx0XHRcdFx0XHRcdHNob3dNc2cocmVzLmRhdGEubXNnKTtcclxuXHRcdFx0XHRcdFx0XHR9XHJcblxyXG5cdFx0XHRcdFx0XHRcdGlmKHJlcy5zdGF0dXMgPT0gXCJzdWNjZXNzXCIpIHtcclxuXHRcdFx0XHRcdFx0XHRcdHNob3dNc2coXCJQYXNzd29yZCBjaGFuZ2VkXCIpO1xyXG5cdFx0XHRcdFx0XHRcdH1cclxuXHRcdFx0XHRcdFx0fSk7XHJcblx0XHRcdFx0XHR9XHJcblx0XHRcdFx0fVxyXG5cdFx0XHR9KTtcclxuXHJcblx0XHRcdGNoaWxkcmVuLnB1c2goeyB0YWc6IFwiYnJcIiB9KTtcclxuXHRcdFx0Y2hpbGRyZW4ucHVzaCh7IHRhZzogXCJiclwiIH0pO1xyXG5cclxuXHRcdFx0Ly8gb25seSBkaXNwbGF5IHRoZSBsb2dvdXQgYnV0dG9uIGlmIHdlIGFyZSBvbiB0aGUgL2FjY291bnQgcGFnZVxyXG5cdFx0XHRpZighbWF0Y2hbMV0pIHtcclxuXHRcdFx0XHRjaGlsZHJlbi5wdXNoKHtcclxuXHRcdFx0XHRcdHRhZzogXCJidXR0b25cIixcclxuXHRcdFx0XHRcdGNsYXNzZXM6IFwiZmFuY3ktYnV0dG9uXCIsXHJcblx0XHRcdFx0XHR0ZXh0OiBcIkxvZ291dFwiLFxyXG5cdFx0XHRcdFx0b246IHtcclxuXHRcdFx0XHRcdFx0Y2xpY2s6ICgpID0+IHtcclxuXHRcdFx0XHRcdFx0XHQvLyBzZW5kIHRoZSBsb2dvdXQgcmVxdWVzdFxyXG5cdFx0XHRcdFx0XHRcdGZldGNoKFwiL2FwaS9hdXRoL2xvZ291dFwiLCB7IGNyZWRlbnRpYWxzOiBcImluY2x1ZGVcIiB9KVxyXG5cclxuXHRcdFx0XHRcdFx0XHQvLyByZXR1cm4gdG8gdGhlIGxvZ2luIHBhZ2VcclxuXHRcdFx0XHRcdFx0XHQudGhlbigoKSA9PiBsaWZlTGluZS5uYXYubmF2aWdhdGUoXCIvbG9naW5cIikpO1xyXG5cdFx0XHRcdFx0XHR9XHJcblx0XHRcdFx0XHR9XHJcblx0XHRcdFx0fSk7XHJcblx0XHRcdH1cclxuXHJcblx0XHRcdHZhciB7bXNnfSA9IGxpZmVMaW5lLm1ha2VEb20oe1xyXG5cdFx0XHRcdHBhcmVudDogY29udGVudCxcclxuXHRcdFx0XHRjbGFzc2VzOiBcImNvbnRlbnQtcGFkZGVkXCIsXHJcblx0XHRcdFx0Y2hpbGRyZW5cclxuXHRcdFx0fSk7XHJcblxyXG5cdFx0XHQvLyBzaG93IGEgbWVzc2FnZVxyXG5cdFx0XHR2YXIgc2hvd01zZyA9IGZ1bmN0aW9uKHRleHQpIHtcclxuXHRcdFx0XHRtc2cuaW5uZXJUZXh0ID0gdGV4dDtcclxuXHRcdFx0fTtcclxuXHRcdH0pXHJcblx0fVxyXG59KTtcclxuIiwiLyoqXHJcbiAqIEVkaXQgYW4gYXNzaWduZW1udFxyXG4gKi9cclxuXHJcbnZhciB7ZGF5c0Zyb21Ob3csIHN0cmluZ2lmeURhdGV9ID0gcmVxdWlyZShcIi4uL3V0aWwvZGF0ZVwiKTtcclxudmFyIHthc3NpZ25tZW50c30gPSByZXF1aXJlKFwiLi4vZGF0YS1zdG9yZXNcIik7O1xyXG5cclxubGlmZUxpbmUubmF2LnJlZ2lzdGVyKHtcclxuXHRtYXRjaGVyOiAvXlxcL2VkaXRcXC8oLis/KSQvLFxyXG5cclxuXHRtYWtlKHttYXRjaCwgY29udGVudCwgc2V0VGl0bGUsIGRpc3Bvc2FibGV9KSB7XHJcblx0XHR2YXIgYWN0aW9uU3ViLCBkZWxldGVTdWI7XHJcblxyXG5cdFx0Ly8gaWYgd2UgbWFrZSBhIGNoYW5nZSBkb24ndCByZWZyZXNoIHRoZSBwYWdlXHJcblx0XHR2YXIgZGVib3VuY2U7XHJcblxyXG5cdFx0Ly8gc3luYyBpZiBhbnl0aGluZyBpcyBjaGFuZ2VkXHJcblx0XHR2YXIgY2hhbmdlZCA9IGZhbHNlO1xyXG5cclxuXHRcdHZhciBjaGFuZ2VTdWIgPSBhc3NpZ25tZW50cy5xdWVyeSh7IGlkOiBtYXRjaFsxXSB9LCBmdW5jdGlvbihbaXRlbV0pIHtcclxuXHRcdFx0Ly8gaWYgd2UgbWFrZSBhIGNoYW5nZSBkb24ndCByZWZyZXNoIHRoZSBwYWdlXHJcblx0XHRcdGlmKGRlYm91bmNlKSB7XHJcblx0XHRcdFx0ZGVib3VuY2UgPSBmYWxzZTtcclxuXHJcblx0XHRcdFx0cmV0dXJuO1xyXG5cdFx0XHR9XHJcblxyXG5cdFx0XHQvLyBjbGVhciB0aGUgY29udGVudFxyXG5cdFx0XHRjb250ZW50LmlubmVySFRNTCA9IFwiXCI7XHJcblxyXG5cdFx0XHQvLyByZW1vdmUgdGhlIHByZXZpb3VzIGFjdGlvblxyXG5cdFx0XHRpZihhY3Rpb25TdWIpIHtcclxuXHRcdFx0XHRhY3Rpb25TdWIudW5zdWJzY3JpYmUoKTtcclxuXHRcdFx0XHRkZWxldGVTdWIudW5zdWJzY3JpYmUoKTtcclxuXHRcdFx0fVxyXG5cclxuXHRcdFx0Ly8gYWRkIGEgYnV0dG9uIGJhY2sgdG8gdGhlIHZpZXdcclxuXHRcdFx0aWYoaXRlbSkge1xyXG5cdFx0XHRcdGFjdGlvblN1YiA9IGxpZmVMaW5lLmFkZEFjdGlvbihcIlZpZXdcIiwgKCkgPT4gbGlmZUxpbmUubmF2Lm5hdmlnYXRlKFwiL2l0ZW0vXCIgKyBpdGVtLmlkKSk7XHJcblxyXG5cdFx0XHRcdGRlbGV0ZVN1YiA9IGxpZmVMaW5lLmFkZEFjdGlvbihcIkRlbGV0ZVwiLCAoKSA9PiB7XHJcblx0XHRcdFx0XHQvLyByZW1vdmUgdGhlIGl0ZW1cclxuXHRcdFx0XHRcdGFzc2lnbm1lbnRzLnJlbW92ZShpdGVtLmlkKTtcclxuXHJcblx0XHRcdFx0XHQvLyBuYXZpZ2F0ZSBhd2F5XHJcblx0XHRcdFx0XHRsaWZlTGluZS5uYXYubmF2aWdhdGUoXCIvXCIpO1xyXG5cclxuXHRcdFx0XHRcdC8vIHN5bmMgdGhlIGNoYW5nZXNcclxuXHRcdFx0XHRcdGxpZmVMaW5lLnN5bmMoKTtcclxuXHRcdFx0XHR9KTtcclxuXHRcdFx0fVxyXG5cclxuXHRcdFx0Ly8gaWYgdGhlIGl0ZW0gZG9lcyBub3QgZXhpc3QgY3JlYXRlIGl0XHJcblx0XHRcdGlmKCFpdGVtKSB7XHJcblx0XHRcdFx0aXRlbSA9IHtcclxuXHRcdFx0XHRcdG5hbWU6IFwiVW5uYW1lZCBpdGVtXCIsXHJcblx0XHRcdFx0XHRjbGFzczogXCJDbGFzc1wiLFxyXG5cdFx0XHRcdFx0ZGF0ZTogZ2VuRGF0ZSgpLFxyXG5cdFx0XHRcdFx0aWQ6IG1hdGNoWzFdLFxyXG5cdFx0XHRcdFx0ZGVzY3JpcHRpb246IFwiXCIsXHJcblx0XHRcdFx0XHRtb2RpZmllZDogRGF0ZS5ub3coKSxcclxuXHRcdFx0XHRcdHR5cGU6IFwiYXNzaWdubWVudFwiLFxyXG5cdFx0XHRcdFx0ZG9uZTogZmFsc2VcclxuXHRcdFx0XHR9O1xyXG5cdFx0XHR9XHJcblxyXG5cdFx0XHQvLyBzZXQgdGhlIGluaXRhbCB0aXRsZVxyXG5cdFx0XHRzZXRUaXRsZShcIkVkaXRpbmdcIik7XHJcblxyXG5cdFx0XHQvLyBzYXZlIGNoYW5nZXNcclxuXHRcdFx0dmFyIGNoYW5nZSA9ICgpID0+IHtcclxuXHRcdFx0XHQvLyB1cGRhdGUgdGhlIG1vZGlmaWVkIGRhdGVcclxuXHRcdFx0XHRpdGVtLm1vZGlmaWVkID0gRGF0ZS5ub3coKTtcclxuXHJcblx0XHRcdFx0Ly8gZmluZCB0aGUgZGF0ZSBhbmQgdGltZSBpbnB1dHNcclxuXHRcdFx0XHR2YXIgZGF0ZUlucHV0ID0gZG9jdW1lbnQucXVlcnlTZWxlY3RvcihcImlucHV0W3R5cGU9ZGF0ZV1cIik7XHJcblx0XHRcdFx0dmFyIHRpbWVJbnB1dCA9IGRvY3VtZW50LnF1ZXJ5U2VsZWN0b3IoXCJpbnB1dFt0eXBlPXRpbWVdXCIpO1xyXG5cclxuXHRcdFx0XHQvLyBwYXJzZSB0aGUgZGF0ZVxyXG5cdFx0XHRcdGl0ZW0uZGF0ZSA9IG5ldyBEYXRlKGRhdGVJbnB1dC52YWx1ZSArIFwiIFwiICsgdGltZUlucHV0LnZhbHVlKTtcclxuXHJcblx0XHRcdFx0Ly8gcmVtb3ZlIGFzc2lnbmVtbnQgZmllbGRzIGZyb20gdGFza3NcclxuXHRcdFx0XHRpZihpdGVtLnR5cGUgPT0gXCJ0YXNrXCIpIHtcclxuXHRcdFx0XHRcdGRlbGV0ZSBpdGVtLmRhdGU7XHJcblx0XHRcdFx0XHRkZWxldGUgaXRlbS5jbGFzcztcclxuXHRcdFx0XHR9XHJcblxyXG5cdFx0XHRcdC8vIGFkZCBhIGJ1dHRvbiBiYWNrIHRvIHRoZSB2aWV3XHJcblx0XHRcdFx0aWYoIWFjdGlvblN1Yikge1xyXG5cdFx0XHRcdFx0YWN0aW9uU3ViID0gbGlmZUxpbmUuYWRkQWN0aW9uKFwiVmlld1wiLCAoKSA9PiBsaWZlTGluZS5uYXYubmF2aWdhdGUoXCIvaXRlbS9cIiArIGl0ZW0uaWQpKTtcclxuXHJcblx0XHRcdFx0XHRkZWxldGVTdWIgPSBsaWZlTGluZS5hZGRBY3Rpb24oXCJEZWxldGVcIiwgKCkgPT4ge1xyXG5cdFx0XHRcdFx0XHQvLyByZW1vdmUgdGhlIGl0ZW1cclxuXHRcdFx0XHRcdFx0YXNzaWdubWVudHMucmVtb3ZlKGl0ZW0uaWQpO1xyXG5cclxuXHRcdFx0XHRcdFx0Ly8gbmF2aWdhdGUgYXdheVxyXG5cdFx0XHRcdFx0XHRsaWZlTGluZS5uYXYubmF2aWdhdGUoXCIvXCIpO1xyXG5cdFx0XHRcdFx0fSk7XHJcblx0XHRcdFx0fVxyXG5cclxuXHRcdFx0XHRkZWJvdW5jZSA9IHRydWU7XHJcblx0XHRcdFx0Y2hhbmdlZCA9IHRydWU7XHJcblxyXG5cdFx0XHRcdC8vIHNhdmUgdGhlIGNoYW5nZXNcclxuXHRcdFx0XHRhc3NpZ25tZW50cy5zZXQoaXRlbSk7XHJcblx0XHRcdH07XHJcblxyXG5cdFx0XHQvLyBoaWRlIGFuZCBzaG93IHNwZWNpZmljIGZpZWxkcyBmb3IgZGlmZmVyZW50IGFzc2lnbm1lbnQgdHlwZXNcclxuXHRcdFx0dmFyIHRvZ2dsZUZpZWxkcyA9ICgpID0+IHtcclxuXHRcdFx0XHRpZihpdGVtLnR5cGUgPT0gXCJ0YXNrXCIpIHtcclxuXHRcdFx0XHRcdG1hcHBlZC5jbGFzc0ZpZWxkLnN0eWxlLmRpc3BsYXkgPSBcIm5vbmVcIjtcclxuXHRcdFx0XHRcdG1hcHBlZC5kYXRlRmllbGQuc3R5bGUuZGlzcGxheSA9IFwibm9uZVwiO1xyXG5cdFx0XHRcdH1cclxuXHRcdFx0XHRlbHNlIHtcclxuXHRcdFx0XHRcdG1hcHBlZC5jbGFzc0ZpZWxkLnN0eWxlLmRpc3BsYXkgPSBcIlwiO1xyXG5cdFx0XHRcdFx0bWFwcGVkLmRhdGVGaWVsZC5zdHlsZS5kaXNwbGF5ID0gXCJcIjtcclxuXHRcdFx0XHR9XHJcblxyXG5cdFx0XHRcdC8vIGZpbGwgaW4gZGF0ZSBpZiBpdCBpcyBtaXNzaW5nXHJcblx0XHRcdFx0aWYoIWl0ZW0uZGF0ZSkge1xyXG5cdFx0XHRcdFx0aXRlbS5kYXRlID0gZ2VuRGF0ZSgpO1xyXG5cdFx0XHRcdH1cclxuXHJcblx0XHRcdFx0aWYoIWl0ZW0uY2xhc3MpIHtcclxuXHRcdFx0XHRcdGl0ZW0uY2xhc3MgPSBcIkNsYXNzXCI7XHJcblx0XHRcdFx0fVxyXG5cdFx0XHR9O1xyXG5cclxuXHRcdFx0Ly8gcmVuZGVyIHRoZSB1aVxyXG5cdFx0XHR2YXIgbWFwcGVkID0gbGlmZUxpbmUubWFrZURvbSh7XHJcblx0XHRcdFx0cGFyZW50OiBjb250ZW50LFxyXG5cdFx0XHRcdGdyb3VwOiBbXHJcblx0XHRcdFx0XHR7XHJcblx0XHRcdFx0XHRcdGNsYXNzZXM6IFwiZWRpdG9yLXJvd1wiLFxyXG5cdFx0XHRcdFx0XHRjaGlsZHJlbjogW1xyXG5cdFx0XHRcdFx0XHRcdHtcclxuXHRcdFx0XHRcdFx0XHRcdHdpZGdldDogXCJpbnB1dFwiLFxyXG5cdFx0XHRcdFx0XHRcdFx0YmluZDogaXRlbSxcclxuXHRcdFx0XHRcdFx0XHRcdHByb3A6IFwibmFtZVwiLFxyXG5cdFx0XHRcdFx0XHRcdFx0Y2hhbmdlXHJcblx0XHRcdFx0XHRcdFx0fVxyXG5cdFx0XHRcdFx0XHRdXHJcblx0XHRcdFx0XHR9LFxyXG5cdFx0XHRcdFx0e1xyXG5cdFx0XHRcdFx0XHRjbGFzc2VzOiBcImVkaXRvci1yb3dcIixcclxuXHRcdFx0XHRcdFx0Y2hpbGRyZW46IFtcclxuXHRcdFx0XHRcdFx0XHR7XHJcblx0XHRcdFx0XHRcdFx0XHR3aWRnZXQ6IFwidG9nZ2xlLWJ0bnNcIixcclxuXHRcdFx0XHRcdFx0XHRcdGJ0bnM6IFtcclxuXHRcdFx0XHRcdFx0XHRcdFx0eyB0ZXh0OiBcIkFzc2lnbm1lbnRcIiwgdmFsdWU6IFwiYXNzaWdubWVudFwiIH0sXHJcblx0XHRcdFx0XHRcdFx0XHRcdHsgdGV4dDogXCJUYXNrXCIsIHZhbHVlOiBcInRhc2tcIiB9LFxyXG5cdFx0XHRcdFx0XHRcdFx0XSxcclxuXHRcdFx0XHRcdFx0XHRcdHZhbHVlOiBpdGVtLnR5cGUsXHJcblx0XHRcdFx0XHRcdFx0XHRjaGFuZ2U6IHR5cGUgPT4ge1xyXG5cdFx0XHRcdFx0XHRcdFx0XHQvLyB1cGRhdGUgdGhlIGl0ZW0gdHlwZVxyXG5cdFx0XHRcdFx0XHRcdFx0XHRpdGVtLnR5cGUgPSB0eXBlO1xyXG5cclxuXHRcdFx0XHRcdFx0XHRcdFx0Ly8gaGlkZS9zaG93IHNwZWNpZmljIGZpZWxkc1xyXG5cdFx0XHRcdFx0XHRcdFx0XHR0b2dnbGVGaWVsZHMoKTtcclxuXHJcblx0XHRcdFx0XHRcdFx0XHRcdC8vIGVtaXQgdGhlIGNoYW5nZVxyXG5cdFx0XHRcdFx0XHRcdFx0XHRjaGFuZ2UoKTtcclxuXHRcdFx0XHRcdFx0XHRcdH1cclxuXHRcdFx0XHRcdFx0XHR9XHJcblx0XHRcdFx0XHRcdF1cclxuXHRcdFx0XHRcdH0sXHJcblx0XHRcdFx0XHR7XHJcblx0XHRcdFx0XHRcdG5hbWU6IFwiY2xhc3NGaWVsZFwiLFxyXG5cdFx0XHRcdFx0XHRjbGFzc2VzOiBcImVkaXRvci1yb3dcIixcclxuXHRcdFx0XHRcdFx0Y2hpbGRyZW46IFtcclxuXHRcdFx0XHRcdFx0XHR7XHJcblx0XHRcdFx0XHRcdFx0XHR3aWRnZXQ6IFwiaW5wdXRcIixcclxuXHRcdFx0XHRcdFx0XHRcdGJpbmQ6IGl0ZW0sXHJcblx0XHRcdFx0XHRcdFx0XHRwcm9wOiBcImNsYXNzXCIsXHJcblx0XHRcdFx0XHRcdFx0XHRjaGFuZ2VcclxuXHRcdFx0XHRcdFx0XHR9XHJcblx0XHRcdFx0XHRcdF1cclxuXHRcdFx0XHRcdH0sXHJcblx0XHRcdFx0XHR7XHJcblx0XHRcdFx0XHRcdG5hbWU6IFwiZGF0ZUZpZWxkXCIsXHJcblx0XHRcdFx0XHRcdGNsYXNzZXM6IFwiZWRpdG9yLXJvd1wiLFxyXG5cdFx0XHRcdFx0XHRjaGlsZHJlbjogW1xyXG5cdFx0XHRcdFx0XHRcdHtcclxuXHRcdFx0XHRcdFx0XHRcdHdpZGdldDogXCJpbnB1dFwiLFxyXG5cdFx0XHRcdFx0XHRcdFx0dHlwZTogXCJkYXRlXCIsXHJcblx0XHRcdFx0XHRcdFx0XHR2YWx1ZTogaXRlbS5kYXRlICYmIGAke2l0ZW0uZGF0ZS5nZXRGdWxsWWVhcigpfS0ke3BhZChpdGVtLmRhdGUuZ2V0TW9udGgoKSArIDEpfS0ke3BhZChpdGVtLmRhdGUuZ2V0RGF0ZSgpKX1gLFxyXG5cdFx0XHRcdFx0XHRcdFx0Y2hhbmdlXHJcblx0XHRcdFx0XHRcdFx0fSxcclxuXHRcdFx0XHRcdFx0XHR7XHJcblx0XHRcdFx0XHRcdFx0XHR3aWRnZXQ6IFwiaW5wdXRcIixcclxuXHRcdFx0XHRcdFx0XHRcdHR5cGU6IFwidGltZVwiLFxyXG5cdFx0XHRcdFx0XHRcdFx0dmFsdWU6IGl0ZW0uZGF0ZSAmJiBgJHtpdGVtLmRhdGUuZ2V0SG91cnMoKX06JHtwYWQoaXRlbS5kYXRlLmdldE1pbnV0ZXMoKSl9YCxcclxuXHRcdFx0XHRcdFx0XHRcdGNoYW5nZVxyXG5cdFx0XHRcdFx0XHRcdH1cclxuXHRcdFx0XHRcdFx0XVxyXG5cdFx0XHRcdFx0fSxcclxuXHRcdFx0XHRcdHtcclxuXHRcdFx0XHRcdFx0Y2xhc3NlczogXCJ0ZXh0YXJlYS13cmFwcGVyXCIsXHJcblx0XHRcdFx0XHRcdGNoaWxkcmVuOiBbXHJcblx0XHRcdFx0XHRcdFx0e1xyXG5cdFx0XHRcdFx0XHRcdFx0d2lkZ2V0OiBcImlucHV0XCIsXHJcblx0XHRcdFx0XHRcdFx0XHR0YWc6IFwidGV4dGFyZWFcIixcclxuXHRcdFx0XHRcdFx0XHRcdGNsYXNzZXM6IFwidGV4dGFyZWEtZmlsbFwiLFxyXG5cdFx0XHRcdFx0XHRcdFx0cGxhY2Vob2xkZXI6IFwiRGVzY3JpcHRpb25cIixcclxuXHRcdFx0XHRcdFx0XHRcdGJpbmQ6IGl0ZW0sXHJcblx0XHRcdFx0XHRcdFx0XHRwcm9wOiBcImRlc2NyaXB0aW9uXCIsXHJcblx0XHRcdFx0XHRcdFx0XHRjaGFuZ2VcclxuXHRcdFx0XHRcdFx0XHR9XHJcblx0XHRcdFx0XHRcdF1cclxuXHRcdFx0XHRcdH1cclxuXHRcdFx0XHRdXHJcblx0XHRcdH0pO1xyXG5cclxuXHRcdFx0Ly8gc2hvdyB0aGUgZmllbGRzIGZvciB0aGlzIGl0ZW0gdHlwZVxyXG5cdFx0XHR0b2dnbGVGaWVsZHMoKTtcclxuXHRcdH0pO1xyXG5cclxuXHRcdC8vIHJlbW92ZSB0aGUgc3Vic2NyaXB0aW9uIHdoZW4gdGhpcyB2aWV3IGlzIGRlc3Ryb3llZFxyXG5cdFx0ZGlzcG9zYWJsZS5hZGQoY2hhbmdlU3ViKTtcclxuXHJcblx0XHQvLyBzeW5jIGlmIHdlIGNoYW5nZWQgYW55dGhpbmdcclxuXHRcdGRpc3Bvc2FibGUuYWRkKHtcclxuXHRcdFx0dW5zdWJzY3JpYmU6IGZ1bmN0aW9uKCkge1xyXG5cdFx0XHRcdGlmKGNoYW5nZWQpIHtcclxuXHRcdFx0XHRcdGxpZmVMaW5lLnN5bmMoKTtcclxuXHRcdFx0XHR9XHJcblx0XHRcdH1cclxuXHRcdH0pO1xyXG5cdH1cclxufSk7XHJcblxyXG4vLyBhZGQgYSBsZWFkaW5nIDAgaWYgYSBudW1iZXIgaXMgbGVzcyB0aGFuIDEwXHJcbnZhciBwYWQgPSBudW1iZXIgPT4gKG51bWJlciA8IDEwKSA/IFwiMFwiICsgbnVtYmVyIDogbnVtYmVyO1xyXG5cclxuLy8gY3JlYXRlIGEgZGF0ZSBvZiB0b2RheSBhdCAxMTo1OXBtXHJcbnZhciBnZW5EYXRlID0gKCkgPT4ge1xyXG5cdHZhciBkYXRlID0gbmV3IERhdGUoKTtcclxuXHJcblx0Ly8gc2V0IHRoZSB0aW1lXHJcblx0ZGF0ZS5zZXRIb3VycygyMyk7XHJcblx0ZGF0ZS5zZXRNaW51dGVzKDU5KTtcclxuXHJcblx0cmV0dXJuIGRhdGU7XHJcbn07XHJcbiIsIi8qKlxyXG4gKiBUaGUgdmlldyBmb3IgYW4gYXNzaWdubWVudFxyXG4gKi9cclxuXHJcbnZhciB7ZGF5c0Zyb21Ob3csIHN0cmluZ2lmeURhdGV9ID0gcmVxdWlyZShcIi4uL3V0aWwvZGF0ZVwiKTtcclxudmFyIHthc3NpZ25tZW50c30gPSByZXF1aXJlKFwiLi4vZGF0YS1zdG9yZXNcIik7XHJcblxyXG5saWZlTGluZS5uYXYucmVnaXN0ZXIoe1xyXG5cdG1hdGNoZXI6IC9eXFwvaXRlbVxcLyguKz8pJC8sXHJcblxyXG5cdG1ha2Uoe21hdGNoLCBzZXRUaXRsZSwgY29udGVudCwgZGlzcG9zYWJsZX0pIHtcclxuXHRcdHZhciBhY3Rpb25Eb25lU3ViLCBhY3Rpb25FZGl0U3ViO1xyXG5cclxuXHQgXHRkaXNwb3NhYmxlLmFkZChcclxuXHRcdFx0YXNzaWdubWVudHMucXVlcnkoeyBpZDogbWF0Y2hbMV0gfSwgZnVuY3Rpb24oW2l0ZW1dKSB7XHJcblx0XHRcdFx0Ly8gY2xlYXIgdGhlIGNvbnRlbnRcclxuXHRcdFx0XHRjb250ZW50LmlubmVySFRNTCA9IFwiXCI7XHJcblxyXG5cdFx0XHRcdC8vIHJlbW92ZSB0aGUgb2xkIGFjdGlvblxyXG5cdFx0XHRcdGlmKGFjdGlvbkRvbmVTdWIpIHtcclxuXHRcdFx0XHRcdGFjdGlvbkRvbmVTdWIudW5zdWJzY3JpYmUoKTtcclxuXHRcdFx0XHRcdGFjdGlvbkVkaXRTdWIudW5zdWJzY3JpYmUoKTtcclxuXHRcdFx0XHR9XHJcblxyXG5cdFx0XHRcdC8vIG5vIHN1Y2ggYXNzaWdubWVudFxyXG5cdFx0XHRcdGlmKCFpdGVtKSB7XHJcblx0XHRcdFx0XHRzZXRUaXRsZShcIk5vdCBmb3VuZFwiKTtcclxuXHJcblx0XHRcdFx0XHRsaWZlTGluZS5tYWtlRG9tKHtcclxuXHRcdFx0XHRcdFx0cGFyZW50OiBjb250ZW50LFxyXG5cdFx0XHRcdFx0XHRjbGFzc2VzOiBcImNvbnRlbnQtcGFkZGVkXCIsXHJcblx0XHRcdFx0XHRcdGNoaWxkcmVuOiBbXHJcblx0XHRcdFx0XHRcdFx0e1xyXG5cdFx0XHRcdFx0XHRcdFx0dGFnOiBcInNwYW5cIixcclxuXHRcdFx0XHRcdFx0XHRcdHRleHQ6IFwiVGhlIGFzc2lnbm1lbnQgeW91IHdoZXJlIGxvb2tpbmcgZm9yIGNvdWxkIG5vdCBiZSBmb3VuZC4gXCJcclxuXHRcdFx0XHRcdFx0XHR9LFxyXG5cdFx0XHRcdFx0XHRcdHtcclxuXHRcdFx0XHRcdFx0XHRcdHdpZGdldDogXCJsaW5rXCIsXHJcblx0XHRcdFx0XHRcdFx0XHRocmVmOiBcIi9cIixcclxuXHRcdFx0XHRcdFx0XHRcdHRleHQ6IFwiR28gaG9tZS5cIlxyXG5cdFx0XHRcdFx0XHRcdH1cclxuXHRcdFx0XHRcdFx0XVxyXG5cdFx0XHRcdFx0fSk7XHJcblxyXG5cdFx0XHRcdFx0cmV0dXJuO1xyXG5cdFx0XHRcdH1cclxuXHJcblx0XHRcdFx0Ly8gc2V0IHRoZSB0aXRsZSBmb3IgdGhlIGNvbnRlbnRcclxuXHRcdFx0XHRzZXRUaXRsZShcIkFzc2lnbm1lbnRcIik7XHJcblxyXG5cdFx0XHRcdC8vIG1hcmsgdGhlIGl0ZW0gYXMgZG9uZVxyXG5cdFx0XHRcdGFjdGlvbkRvbmVTdWIgPSBsaWZlTGluZS5hZGRBY3Rpb24oaXRlbS5kb25lID8gXCJEb25lXCIgOiBcIk5vdCBkb25lXCIsICgpID0+IHtcclxuXHRcdFx0XHRcdC8vIG1hcmsgdGhlIGl0ZW0gZG9uZVxyXG5cdFx0XHRcdFx0aXRlbS5kb25lID0gIWl0ZW0uZG9uZTtcclxuXHJcblx0XHRcdFx0XHQvLyB1cGRhdGUgdGhlIG1vZGlmaWVkIHRpbWVcclxuXHRcdFx0XHRcdGl0ZW0ubW9kaWZpZWQgPSBEYXRlLm5vdygpO1xyXG5cclxuXHRcdFx0XHRcdC8vIHNhdmUgdGhlIGNoYW5nZVxyXG5cdFx0XHRcdFx0YXNzaWdubWVudHMuc2V0KGl0ZW0pO1xyXG5cclxuXHRcdFx0XHRcdC8vIHN5bmMgdGhlIGNoYW5nZVxyXG5cdFx0XHRcdFx0bGlmZUxpbmUuc3luYygpO1xyXG5cdFx0XHRcdH0pO1xyXG5cclxuXHRcdFx0XHQvLyBlZGl0IHRoZSBpdGVtXHJcblx0XHRcdFx0YWN0aW9uRWRpdFN1YiA9IGxpZmVMaW5lLmFkZEFjdGlvbihcIkVkaXRcIixcclxuXHRcdFx0XHRcdCgpID0+IGxpZmVMaW5lLm5hdi5uYXZpZ2F0ZShcIi9lZGl0L1wiICsgaXRlbS5pZCkpO1xyXG5cclxuXHRcdFx0XHQvLyB0aW1lcyB0byBza2lwXHJcblx0XHRcdFx0dmFyIHNraXBUaW1lcyA9IFtcclxuXHRcdFx0XHRcdHsgaG91cjogMjMsIG1pbnV0ZTogNTkgfVxyXG5cdFx0XHRcdF07XHJcblxyXG5cdFx0XHRcdGxpZmVMaW5lLm1ha2VEb20oe1xyXG5cdFx0XHRcdFx0cGFyZW50OiBjb250ZW50LFxyXG5cdFx0XHRcdFx0Y2xhc3NlczogXCJjb250ZW50LXBhZGRlZFwiLFxyXG5cdFx0XHRcdFx0Y2hpbGRyZW46IFtcclxuXHRcdFx0XHRcdFx0e1xyXG5cdFx0XHRcdFx0XHRcdGNsYXNzZXM6IFwiYXNzaWdubWVudC1uYW1lXCIsXHJcblx0XHRcdFx0XHRcdFx0dGV4dDogaXRlbS5uYW1lXHJcblx0XHRcdFx0XHRcdH0sXHJcblx0XHRcdFx0XHRcdHtcclxuXHRcdFx0XHRcdFx0XHRjbGFzc2VzOiBcImFzc2lnbm1lbnQtaW5mby1yb3dcIixcclxuXHRcdFx0XHRcdFx0XHRjaGlsZHJlbjogW1xyXG5cdFx0XHRcdFx0XHRcdFx0e1xyXG5cdFx0XHRcdFx0XHRcdFx0XHRjbGFzc2VzOiBcImFzc2lnbm1lbnQtaW5mby1ncm93XCIsXHJcblx0XHRcdFx0XHRcdFx0XHRcdHRleHQ6IGl0ZW0uY2xhc3NcclxuXHRcdFx0XHRcdFx0XHRcdH0sXHJcblx0XHRcdFx0XHRcdFx0XHR7XHJcblx0XHRcdFx0XHRcdFx0XHRcdHRleHQ6IGl0ZW0uZGF0ZSAmJiBzdHJpbmdpZnlEYXRlKGl0ZW0uZGF0ZSwgeyBpbmNsdWRlVGltZTogdHJ1ZSwgc2tpcFRpbWVzIH0pXHJcblx0XHRcdFx0XHRcdFx0XHR9XHJcblx0XHRcdFx0XHRcdFx0XVxyXG5cdFx0XHRcdFx0XHR9LFxyXG5cdFx0XHRcdFx0XHR7XHJcblx0XHRcdFx0XHRcdFx0Y2xhc3NlczogXCJhc3NpZ25tZW50LWRlc2NyaXB0aW9uXCIsXHJcblx0XHRcdFx0XHRcdFx0dGV4dDogaXRlbS5kZXNjcmlwdGlvblxyXG5cdFx0XHRcdFx0XHR9XHJcblx0XHRcdFx0XHRdXHJcblx0XHRcdFx0fSk7XHJcblx0XHRcdH0pXHJcblx0XHQpO1xyXG5cdH1cclxufSk7XHJcbiIsIi8qKlxyXG4gKiBEaXNwbGF5IGEgbGlzdCBvZiB1cGNvbW1pbmcgYXNzaWdubWVudHNcclxuICovXHJcblxyXG52YXIge2RheXNGcm9tTm93LCBpc1NhbWVEYXRlLCBzdHJpbmdpZnlEYXRlLCBzdHJpbmdpZnlUaW1lLCBpc1Nvb25lckRhdGV9ID0gcmVxdWlyZShcIi4uL3V0aWwvZGF0ZVwiKTtcclxudmFyIHthc3NpZ25tZW50c30gPSByZXF1aXJlKFwiLi4vZGF0YS1zdG9yZXNcIik7XHJcblxyXG4vLyBhbGwgdGhlIGRpZmZlcmVudCBsaXN0c1xyXG5jb25zdCBMSVNUUyA9IFtcclxuXHR7XHJcblx0XHR1cmw6IFwiL3dlZWtcIixcclxuXHRcdHRpdGxlOiBcIlRoaXMgd2Vla1wiLFxyXG5cdFx0Y3JlYXRlQ3R4OiAoKSA9PiAoe1xyXG5cdFx0XHQvLyBkYXlzIHRvIHRoZSBlbmQgb2YgdGhpcyB3ZWVrXHJcblx0XHRcdGVuZERhdGU6IGRheXNGcm9tTm93KDcgLSAobmV3IERhdGUoKSkuZ2V0RGF5KCkpLFxyXG5cdFx0XHQvLyB0b2RheXMgZGF0ZVxyXG5cdFx0XHR0b2RheTogbmV3IERhdGUoKVxyXG5cdFx0fSksXHJcblx0XHQvLyBzaG93IGFsbCBhdCByZWFzb25hYmxlIG51bWJlciBvZiBpbmNvbXBsZXRlIGFzc2lnbm1lbnRzXHJcblx0XHRmaWx0ZXI6IChpdGVtLCB7dG9kYXksIGVuZERhdGV9KSA9PiB7XHJcblx0XHRcdC8vIHNob3cgYWxsIHRhc2tzXHJcblx0XHRcdGlmKGl0ZW0udHlwZSA9PSBcInRhc2tcIikgcmV0dXJuIHRydWU7XHJcblxyXG5cdFx0XHQvLyBjaGVjayBpZiB0aGUgaXRlbSBpcyBwYXN0IHRoaXMgd2Vla1xyXG5cdFx0XHRpZighaXNTb29uZXJEYXRlKGl0ZW0uZGF0ZSwgZW5kRGF0ZSkgJiYgIWlzU2FtZURhdGUoaXRlbS5kYXRlLCBlbmREYXRlKSkgcmV0dXJuO1xyXG5cclxuXHRcdFx0Ly8gY2hlY2sgaWYgdGhlIGRhdGUgaXMgYmVmb3JlIHRvZGF5XHJcblx0XHRcdGlmKGlzU29vbmVyRGF0ZShpdGVtLmRhdGUsIHRvZGF5KSkgcmV0dXJuO1xyXG5cclxuXHRcdFx0cmV0dXJuIHRydWU7XHJcblx0XHR9LFxyXG5cdFx0cXVlcnk6IHsgZG9uZTogZmFsc2UgfVxyXG5cdH0sXHJcblx0e1xyXG5cdFx0dXJsOiBcIi91cGNvbWluZ1wiLFxyXG5cdFx0cXVlcnk6IHsgZG9uZTogZmFsc2UgfSxcclxuXHRcdHRpdGxlOiBcIlVwY29taW5nXCJcclxuXHR9LFxyXG5cdHtcclxuXHRcdHVybDogXCIvZG9uZVwiLFxyXG5cdFx0cXVlcnk6IHsgZG9uZTogdHJ1ZSB9LFxyXG5cdFx0dGl0bGU6IFwiRG9uZVwiXHJcblx0fVxyXG5dO1xyXG5cclxuLy8gYWRkIGxpc3QgdmlldyBsaW5rcyB0byB0aGUgbmF2YmFyXHJcbmV4cG9ydHMuaW5pdE5hdkJhciA9IGZ1bmN0aW9uKCkge1xyXG5cdExJU1RTLmZvckVhY2gobGlzdCA9PiBsaWZlTGluZS5hZGROYXZDb21tYW5kKGxpc3QudGl0bGUsIGxpc3QudXJsKSk7XHJcbn07XHJcblxyXG5saWZlTGluZS5uYXYucmVnaXN0ZXIoe1xyXG5cdG1hdGNoZXIodXJsKSB7XHJcblx0XHRyZXR1cm4gTElTVFMuZmluZChsaXN0ID0+IGxpc3QudXJsID09IHVybCk7XHJcblx0fSxcclxuXHJcblx0Ly8gbWFrZSB0aGUgbGlzdFxyXG5cdG1ha2Uoe3NldFRpdGxlLCBjb250ZW50LCBkaXNwb3NhYmxlLCBtYXRjaH0pIHtcclxuXHRcdGRpc3Bvc2FibGUuYWRkKFxyXG5cdFx0XHRhc3NpZ25tZW50cy5xdWVyeShtYXRjaC5xdWVyeSB8fCB7fSwgZnVuY3Rpb24oZGF0YSkge1xyXG5cdFx0XHRcdC8vIGNsZWFyIHRoZSBjb250ZW50XHJcblx0XHRcdFx0Y29udGVudC5pbm5lckhUTUwgPSBcIlwiO1xyXG5cclxuXHRcdFx0XHQvLyBzZXQgdGhlIHBhZ2UgdGl0bGVcclxuXHRcdFx0XHRzZXRUaXRsZShtYXRjaC50aXRsZSk7XHJcblxyXG5cdFx0XHRcdC8vIHRoZSBjb250ZXh0IGZvciB0aGUgZmlsdGVyIGZ1bmN0aW9uXHJcblx0XHRcdFx0dmFyIGN0eDtcclxuXHJcblx0XHRcdFx0aWYobWF0Y2guY3JlYXRlQ3R4KSB7XHJcblx0XHRcdFx0XHRjdHggPSBtYXRjaC5jcmVhdGVDdHgoKTtcclxuXHRcdFx0XHR9XHJcblxyXG5cdFx0XHRcdC8vIHJ1biB0aGUgZmlsdGVyIGZ1bmN0aW9uXHJcblx0XHRcdFx0aWYobWF0Y2guZmlsdGVyKSB7XHJcblx0XHRcdFx0XHRkYXRhID0gZGF0YS5maWx0ZXIoaXRlbSA9PiBtYXRjaC5maWx0ZXIoaXRlbSwgY3R4KSk7XHJcblx0XHRcdFx0fVxyXG5cclxuXHRcdFx0XHQvLyBzb3J0IHRoZSBhc3NpbmdtZW50c1xyXG5cdFx0XHRcdGRhdGEuc29ydCgoYSwgYikgPT4ge1xyXG5cdFx0XHRcdFx0Ly8gdGFza3MgYXJlIGJlbG93IGFzc2lnbm1lbnRzXHJcblx0XHRcdFx0XHRpZihhLnR5cGUgPT0gXCJ0YXNrXCIgJiYgYi50eXBlICE9IFwidGFza1wiKSByZXR1cm4gMTtcclxuXHRcdFx0XHRcdGlmKGEudHlwZSAhPSBcInRhc2tcIiAmJiBiLnR5cGUgPT0gXCJ0YXNrXCIpIHJldHVybiAtMTtcclxuXHJcblx0XHRcdFx0XHQvLyBzb3J0IGJ5IGR1ZSBkYXRlXHJcblx0XHRcdFx0XHRpZihhLnR5cGUgPT0gXCJhc3NpZ25tZW50XCIgJiYgYi50eXBlID09IFwiYXNzaWdubWVudFwiKSB7XHJcblx0XHRcdFx0XHRcdGlmKGEuZGF0ZS5nZXRUaW1lKCkgIT0gYi5kYXRlLmdldFRpbWUoKSkge1xyXG5cdFx0XHRcdFx0XHRcdHJldHVybiBhLmRhdGUuZ2V0VGltZSgpIC0gYi5kYXRlLmdldFRpbWUoKTtcclxuXHRcdFx0XHRcdFx0fVxyXG5cdFx0XHRcdFx0fVxyXG5cclxuXHRcdFx0XHRcdC8vIG9yZGVyIGJ5IG5hbWVcclxuXHRcdFx0XHRcdGlmKGEubmFtZSA8IGIubmFtZSkgcmV0dXJuIC0xO1xyXG5cdFx0XHRcdFx0aWYoYS5uYW1lID4gYi5uYW1lKSByZXR1cm4gMTtcclxuXHJcblx0XHRcdFx0XHRyZXR1cm4gMDtcclxuXHRcdFx0XHR9KTtcclxuXHJcblx0XHRcdFx0Ly8gbWFrZSB0aGUgZ3JvdXBzXHJcblx0XHRcdFx0dmFyIGdyb3VwcyA9IHt9O1xyXG5cclxuXHRcdFx0XHQvLyByZW5kZXIgdGhlIGxpc3RcclxuXHRcdFx0XHRkYXRhLmZvckVhY2goKGl0ZW0sIGkpID0+IHtcclxuXHRcdFx0XHRcdC8vIGdldCB0aGUgaGVhZGVyIG5hbWVcclxuXHRcdFx0XHRcdHZhciBkYXRlU3RyID0gaXRlbS50eXBlID09IFwidGFza1wiID8gXCJUYXNrc1wiIDogc3RyaW5naWZ5RGF0ZShpdGVtLmRhdGUpO1xyXG5cclxuXHRcdFx0XHRcdC8vIG1ha2Ugc3VyZSB0aGUgaGVhZGVyIGV4aXN0c1xyXG5cdFx0XHRcdFx0Z3JvdXBzW2RhdGVTdHJdIHx8IChncm91cHNbZGF0ZVN0cl0gPSBbXSk7XHJcblxyXG5cdFx0XHRcdFx0Ly8gYWRkIHRoZSBpdGVtIHRvIHRoZSBsaXN0XHJcblx0XHRcdFx0XHR2YXIgaXRlbXMgPSBbXHJcblx0XHRcdFx0XHRcdHsgdGV4dDogaXRlbS5uYW1lLCBncm93OiB0cnVlIH1cclxuXHRcdFx0XHRcdF07XHJcblxyXG5cdFx0XHRcdFx0aWYoaXRlbS50eXBlICE9IFwidGFza1wiKSB7XHJcblx0XHRcdFx0XHRcdC8vIHNob3cgdGhlIGVuZCB0aW1lIGZvciBhbnkgbm9uIDExOjU5cG0gdGltZXNcclxuXHRcdFx0XHRcdFx0aWYoaXRlbS5kYXRlLmdldEhvdXJzKCkgIT0gMjMgfHwgaXRlbS5kYXRlLmdldE1pbnV0ZXMoKSAhPSA1OSkge1xyXG5cdFx0XHRcdFx0XHRcdGl0ZW1zLnB1c2goc3RyaW5naWZ5VGltZShpdGVtLmRhdGUpKTtcclxuXHRcdFx0XHRcdFx0fVxyXG5cclxuXHRcdFx0XHRcdFx0Ly8gc2hvdyB0aGUgY2xhc3NcclxuXHRcdFx0XHRcdFx0aXRlbXMucHVzaChpdGVtLmNsYXNzKTtcclxuXHRcdFx0XHRcdH1cclxuXHJcblx0XHRcdFx0XHRncm91cHNbZGF0ZVN0cl0ucHVzaCh7XG5cdFx0XHRcdFx0XHRocmVmOiBgL2l0ZW0vJHtpdGVtLmlkfWAsXG5cdFx0XHRcdFx0XHRpdGVtc1xyXG5cdFx0XHRcdFx0fSk7XHJcblx0XHRcdFx0fSk7XHJcblxyXG5cdFx0XHRcdC8vIGRpc3BsYXkgYWxsIGl0ZW1zXHJcblx0XHRcdFx0bGlmZUxpbmUubWFrZURvbSh7XHJcblx0XHRcdFx0XHRwYXJlbnQ6IGNvbnRlbnQsXHJcblx0XHRcdFx0XHR3aWRnZXQ6IFwibGlzdFwiLFxyXG5cdFx0XHRcdFx0aXRlbXM6IGdyb3Vwc1xyXG5cdFx0XHRcdH0pO1xyXG5cdFx0XHR9KVxyXG5cdFx0KTtcclxuXHR9XHJcbn0pO1xyXG4iLCIvKipcclxuICogU2hvdyBhIGxvZ2luIGJ1dHRvbiB0byB0aGUgdXNlclxyXG4gKi9cclxuXHJcbmxpZmVMaW5lLm5hdi5yZWdpc3Rlcih7XHJcblx0bWF0Y2hlcjogXCIvbG9naW5cIixcclxuXHJcblx0bWFrZSh7c2V0VGl0bGUsIGNvbnRlbnR9KSB7XHJcblx0XHQvLyBzZXQgdGhlIHBhZ2UgdGl0bGVcclxuXHRcdHNldFRpdGxlKFwiTG9naW5cIik7XHJcblxyXG5cdFx0Ly8gdGhlIHVzZXJzIGNyZWRlbnRpYWxzXHJcblx0XHR2YXIgYXV0aCA9IHt9O1xyXG5cclxuXHRcdC8vIGNyZWF0ZSB0aGUgbG9naW4gZm9ybVxyXG5cdFx0dmFyIHt1c2VybmFtZSwgcGFzc3dvcmQsIG1zZ30gPSBsaWZlTGluZS5tYWtlRG9tKHtcclxuXHRcdFx0cGFyZW50OiBjb250ZW50LFxyXG5cdFx0XHR0YWc6IFwiZm9ybVwiLFxyXG5cdFx0XHRjbGFzc2VzOiBcImNvbnRlbnQtcGFkZGVkXCIsXHJcblx0XHRcdGNoaWxkcmVuOiBbXHJcblx0XHRcdFx0e1xyXG5cdFx0XHRcdFx0Y2xhc3NlczogXCJlZGl0b3Itcm93XCIsXHJcblx0XHRcdFx0XHRjaGlsZHJlbjogW1xyXG5cdFx0XHRcdFx0XHR7XHJcblx0XHRcdFx0XHRcdFx0d2lkZ2V0OiBcImlucHV0XCIsXHJcblx0XHRcdFx0XHRcdFx0YmluZDogYXV0aCxcclxuXHRcdFx0XHRcdFx0XHRwcm9wOiBcInVzZXJuYW1lXCIsXHJcblx0XHRcdFx0XHRcdFx0cGxhY2Vob2xkZXI6IFwiVXNlcm5hbWVcIlxyXG5cdFx0XHRcdFx0XHR9XHJcblx0XHRcdFx0XHRdXHJcblx0XHRcdFx0fSxcclxuXHRcdFx0XHR7XHJcblx0XHRcdFx0XHRjbGFzc2VzOiBcImVkaXRvci1yb3dcIixcclxuXHRcdFx0XHRcdGNoaWxkcmVuOiBbXHJcblx0XHRcdFx0XHRcdHtcclxuXHRcdFx0XHRcdFx0XHR3aWRnZXQ6IFwiaW5wdXRcIixcclxuXHRcdFx0XHRcdFx0XHRiaW5kOiBhdXRoLFxyXG5cdFx0XHRcdFx0XHRcdHByb3A6IFwicGFzc3dvcmRcIixcclxuXHRcdFx0XHRcdFx0XHR0eXBlOiBcInBhc3N3b3JkXCIsXHJcblx0XHRcdFx0XHRcdFx0cGxhY2Vob2xkZXI6IFwiUGFzc3dvcmRcIlxyXG5cdFx0XHRcdFx0XHR9XHJcblx0XHRcdFx0XHRdXHJcblx0XHRcdFx0fSxcclxuXHRcdFx0XHR7XHJcblx0XHRcdFx0XHR0YWc6IFwiYnV0dG9uXCIsXHJcblx0XHRcdFx0XHR0ZXh0OiBcIkxvZ2luXCIsXHJcblx0XHRcdFx0XHRjbGFzc2VzOiBcImZhbmN5LWJ1dHRvblwiLFxyXG5cdFx0XHRcdFx0YXR0cnM6IHtcclxuXHRcdFx0XHRcdFx0dHlwZTogXCJzdWJtaXRcIlxyXG5cdFx0XHRcdFx0fVxyXG5cdFx0XHRcdH0sXHJcblx0XHRcdFx0e1xyXG5cdFx0XHRcdFx0Y2xhc3NlczogXCJlcnJvci1tc2dcIixcclxuXHRcdFx0XHRcdG5hbWU6IFwibXNnXCJcclxuXHRcdFx0XHR9XHJcblx0XHRcdF0sXHJcblx0XHRcdG9uOiB7XHJcblx0XHRcdFx0c3VibWl0OiBlID0+IHtcclxuXHRcdFx0XHRcdGUucHJldmVudERlZmF1bHQoKTtcclxuXHJcblx0XHRcdFx0XHQvLyBzZW5kIHRoZSBsb2dpbiByZXF1ZXN0XHJcblx0XHRcdFx0XHRmZXRjaChcIi9hcGkvYXV0aC9sb2dpblwiLCB7XHJcblx0XHRcdFx0XHRcdG1ldGhvZDogXCJQT1NUXCIsXHJcblx0XHRcdFx0XHRcdGNyZWRlbnRpYWxzOiBcImluY2x1ZGVcIixcclxuXHRcdFx0XHRcdFx0Ym9keTogSlNPTi5zdHJpbmdpZnkoYXV0aClcclxuXHRcdFx0XHRcdH0pXHJcblxyXG5cdFx0XHRcdFx0Ly8gcGFyc2UgdGhlIGpzb25cclxuXHRcdFx0XHRcdC50aGVuKHJlcyA9PiByZXMuanNvbigpKVxyXG5cclxuXHRcdFx0XHRcdC8vIHByb2Nlc3MgdGhlIHJlc3BvbnNlXHJcblx0XHRcdFx0XHQudGhlbihyZXMgPT4ge1xyXG5cdFx0XHRcdFx0XHQvLyBsb2dpbiBzdWNlZWRlZCBnbyBob21lXHJcblx0XHRcdFx0XHRcdGlmKHJlcy5zdGF0dXMgPT0gXCJzdWNjZXNzXCIpIHtcclxuXHRcdFx0XHRcdFx0XHRsaWZlTGluZS5uYXYubmF2aWdhdGUoXCIvXCIpO1xyXG5cclxuXHRcdFx0XHRcdFx0XHQvLyBzeW5jIG5vdyB0aGF0IHdlIGFyZSBsb2dnZWQgaW5cclxuXHRcdFx0XHRcdFx0XHRpZihsaWZlTGluZS5zeW5jKSB7XHJcblx0XHRcdFx0XHRcdFx0XHRsaWZlTGluZS5zeW5jKCk7XHJcblx0XHRcdFx0XHRcdFx0fVxyXG5cclxuXHRcdFx0XHRcdFx0XHRyZXR1cm47XHJcblx0XHRcdFx0XHRcdH1cclxuXHJcblx0XHRcdFx0XHRcdC8vIGxvZ2luIGZhaWxlZFxyXG5cdFx0XHRcdFx0XHRpZihyZXMuc3RhdHVzID09IFwiZmFpbFwiKSB7XHJcblx0XHRcdFx0XHRcdFx0ZXJyb3JNc2coXCJMb2dpbiBmYWlsZWRcIik7XHJcblx0XHRcdFx0XHRcdH1cclxuXHRcdFx0XHRcdH0pO1xyXG5cdFx0XHRcdH1cclxuXHRcdFx0fVxyXG5cdFx0fSk7XHJcblxyXG5cdFx0Ly8gZGlzcGxheSBhbiBlcnJvciBtZXNzYWdlXHJcblx0XHR2YXIgZXJyb3JNc2cgPSBmdW5jdGlvbih0ZXh0KSB7XHJcblx0XHRcdG1zZy5pbm5lclRleHQgPSB0ZXh0O1xyXG5cdFx0fTtcclxuXHR9XHJcbn0pO1xyXG5cclxuLy8gbG9nb3V0XHJcbmxpZmVMaW5lLmxvZ291dCA9IGZ1bmN0aW9uKCkge1xyXG5cdC8vIHNlbmQgdGhlIGxvZ291dCByZXF1ZXN0XHJcblx0ZmV0Y2goXCIvYXBpL2F1dGgvbG9nb3V0XCIsIHtcclxuXHRcdGNyZWRlbnRpYWxzOiBcImluY2x1ZGVcIlxyXG5cdH0pXHJcblxyXG5cdC8vIGdvIHRvIHRoZSBsb2dpbiBwYWdlXHJcblx0LnRoZW4oKCkgPT4gbGlmZUxpbmUubmF2Lm5hdmlnYXRlKFwiL2xvZ2luXCIpKTtcclxufTtcclxuIiwiLyoqXHJcbiAqIEEgbGlzdCBvZiB0aGluZ3MgdG9kb1xyXG4gKi9cclxuXHJcbnZhciB7ZGF5c0Zyb21Ob3csIGlzU2FtZURhdGUsIHN0cmluZ2lmeVRpbWV9ID0gcmVxdWlyZShcIi4uL3V0aWwvZGF0ZVwiKTtcclxudmFyIHthc3NpZ25tZW50c30gPSByZXF1aXJlKFwiLi4vZGF0YS1zdG9yZXNcIik7XHJcblxyXG5saWZlTGluZS5uYXYucmVnaXN0ZXIoe1xyXG5cdG1hdGNoZXI6IFwiL1wiLFxyXG5cclxuXHRtYWtlKHtzZXRUaXRsZSwgY29udGVudCwgZGlzcG9zYWJsZX0pIHtcclxuXHRcdHNldFRpdGxlKFwiVG9kb1wiKTtcclxuXHJcblx0XHQvLyBsb2FkIHRoZSBpdGVtc1xyXG5cdFx0ZGlzcG9zYWJsZS5hZGQoXHJcblx0XHRcdGFzc2lnbm1lbnRzLnF1ZXJ5KHtcclxuXHRcdFx0XHRkb25lOiBmYWxzZSxcclxuXHRcdFx0XHQvLyBtYWtlIHN1cmUgdGhlIGFzc2lnbm1lbnQgaXMgaW4gdGhlIGZ1dHVyZVxyXG5cdFx0XHRcdGRhdGU6IGRhdGUgPT4gIWRhdGUgfHwgbmV3IERhdGUoZGF0ZSkuZ2V0VGltZSgpID4gRGF0ZS5ub3coKVxyXG5cdFx0XHR9LCBmdW5jdGlvbihkYXRhKSB7XHJcblx0XHRcdFx0Ly8gY2xlYXIgdGhlIG9sZCBjb250ZW50XHJcblx0XHRcdFx0Y29udGVudC5pbm5lckhUTUwgPSBcIlwiO1xyXG5cclxuXHRcdFx0XHR2YXIgZ3JvdXBzID0ge1xyXG5cdFx0XHRcdFx0VGFza3M6IFtdLFxyXG5cdFx0XHRcdFx0VG9kYXk6IFtdLFxyXG5cdFx0XHRcdFx0VG9tb3Jyb3c6IFtdLFxyXG5cdFx0XHRcdFx0VXBjb21taW5nOiBbXVxyXG5cdFx0XHRcdH07XHJcblxyXG5cdFx0XHRcdC8vIHRvZGF5IGFuZCB0b21vcnJvd3MgZGF0ZXNcclxuXHRcdFx0XHR2YXIgdG9kYXkgPSBuZXcgRGF0ZSgpO1xyXG5cdFx0XHRcdHZhciB0b21vcnJvdyA9IGRheXNGcm9tTm93KDEpO1xyXG5cclxuXHRcdFx0XHQvLyBzb3J0IGJ5IGRhdGVcclxuXHRcdFx0XHRkYXRhLnNvcnQoKGEsIGIpID0+IHtcclxuXHRcdFx0XHRcdGlmKGEudHlwZSA9PSBcImFzc2lnbm1lbnRcIiAmJiBiLnR5cGUgPT0gXCJhc3NpZ25tZW50XCIpIHtcclxuXHRcdFx0XHRcdFx0cmV0dXJuIGEuZGF0ZS5nZXRUaW1lKCkgLSBiLmRhdGUuZ2V0VGltZSgpO1xyXG5cdFx0XHRcdFx0fVxyXG5cdFx0XHRcdH0pO1xyXG5cclxuXHRcdFx0XHQvLyBzZWxlY3QgdGhlIGl0ZW1zIHRvIGRpc3BsYXlcclxuXHRcdFx0XHRkYXRhLmZvckVhY2goaXRlbSA9PiB7XHJcblx0XHRcdFx0XHQvLyBhc3NpZ25tZW50cyBmb3IgdG9kYXlcclxuXHRcdFx0XHRcdGlmKGl0ZW0udHlwZSA9PSBcImFzc2lnbm1lbnRcIikge1xyXG5cdFx0XHRcdFx0XHQvLyB0b2RheVxyXG5cdFx0XHRcdFx0XHRpZihpc1NhbWVEYXRlKHRvZGF5LCBpdGVtLmRhdGUpKSB7XHJcblx0XHRcdFx0XHRcdFx0Z3JvdXBzLlRvZGF5LnB1c2goY3JlYXRlVWkoaXRlbSkpO1xyXG5cdFx0XHRcdFx0XHR9XHJcblx0XHRcdFx0XHRcdC8vIHRvbW9ycm93XHJcblx0XHRcdFx0XHRcdGVsc2UgaWYoaXNTYW1lRGF0ZSh0b21vcnJvdywgaXRlbS5kYXRlKSkge1xyXG5cdFx0XHRcdFx0XHRcdGdyb3Vwcy5Ub21vcnJvdy5wdXNoKGNyZWF0ZVVpKGl0ZW0pKTtcclxuXHRcdFx0XHRcdFx0fVxyXG5cdFx0XHRcdFx0XHQvLyBhZGQgdXBjb21taW5nIGl0ZW1zXHJcblx0XHRcdFx0XHRcdGVsc2UgaWYoZ3JvdXBzLlVwY29tbWluZy5sZW5ndGggPCA1KSB7XHJcblx0XHRcdFx0XHRcdFx0Z3JvdXBzLlVwY29tbWluZy5wdXNoKGNyZWF0ZVVpKGl0ZW0pKTtcclxuXHRcdFx0XHRcdFx0fVxyXG5cdFx0XHRcdFx0fVxyXG5cclxuXHRcdFx0XHRcdC8vIHNob3cgYW55IHRhc2tzXHJcblx0XHRcdFx0XHRpZihpdGVtLnR5cGUgPT0gXCJ0YXNrXCIpIHtcclxuXHRcdFx0XHRcdFx0Z3JvdXBzLlRhc2tzLnB1c2goY3JlYXRlVWkoaXRlbSkpO1xyXG5cdFx0XHRcdFx0fVxyXG5cdFx0XHRcdH0pO1xyXG5cclxuXHRcdFx0XHQvLyByZW1vdmUgYW55IGVtcHR5IGZpZWxkc1xyXG5cdFx0XHRcdE9iamVjdC5nZXRPd25Qcm9wZXJ0eU5hbWVzKGdyb3VwcylcclxuXHJcblx0XHRcdFx0LmZvckVhY2gobmFtZSA9PiB7XHJcblx0XHRcdFx0XHQvLyByZW1vdmUgZW1wdHkgZ3JvdXBzXHJcblx0XHRcdFx0XHRpZihncm91cHNbbmFtZV0ubGVuZ3RoID09PSAwKSB7XHJcblx0XHRcdFx0XHRcdGRlbGV0ZSBncm91cHNbbmFtZV07XHJcblx0XHRcdFx0XHR9XHJcblx0XHRcdFx0fSk7XHJcblxyXG5cdFx0XHRcdC8vIHJlbmRlciB0aGUgbGlzdFxyXG5cdFx0XHRcdGxpZmVMaW5lLm1ha2VEb20oe1xyXG5cdFx0XHRcdFx0cGFyZW50OiBjb250ZW50LFxyXG5cdFx0XHRcdFx0d2lkZ2V0OiBcImxpc3RcIixcclxuXHRcdFx0XHRcdGl0ZW1zOiBncm91cHNcclxuXHRcdFx0XHR9KTtcclxuXHRcdFx0fSlcclxuXHRcdCk7XHJcblx0fVxyXG59KTtcclxuXHJcbi8vIGNyZWF0ZSBhIGxpc3QgaXRlbVxyXG52YXIgY3JlYXRlVWkgPSBmdW5jdGlvbihpdGVtKSB7XHJcblx0Ly8gcmVuZGVyIGEgdGFza1xyXG5cdGlmKGl0ZW0udHlwZSA9PSBcInRhc2tcIikge1xyXG5cdFx0cmV0dXJuIHtcclxuXHRcdFx0aHJlZjogYC9pdGVtLyR7aXRlbS5pZH1gLFxyXG5cdFx0XHRpdGVtczogW1xyXG5cdFx0XHRcdHtcclxuXHRcdFx0XHRcdHRleHQ6IGl0ZW0ubmFtZSxcclxuXHRcdFx0XHRcdGdyb3c6IHRydWVcclxuXHRcdFx0XHR9XHJcblx0XHRcdF1cclxuXHRcdH07XHJcblx0fVxyXG5cdC8vIHJlbmRlciBhbiBpdGVtXHJcblx0ZWxzZSB7XHJcblx0XHRyZXR1cm4ge1xyXG5cdFx0XHRocmVmOiBgL2l0ZW0vJHtpdGVtLmlkfWAsXHJcblx0XHRcdGl0ZW1zOiBbXHJcblx0XHRcdFx0e1xyXG5cdFx0XHRcdFx0dGV4dDogaXRlbS5uYW1lLFxyXG5cdFx0XHRcdFx0Z3JvdzogdHJ1ZVxyXG5cdFx0XHRcdH0sXHJcblx0XHRcdFx0c3RyaW5naWZ5VGltZShpdGVtLmRhdGUpLFxyXG5cdFx0XHRcdGl0ZW0uY2xhc3NcclxuXHRcdFx0XVxyXG5cdFx0fTtcclxuXHR9XHJcbn07XHJcbiIsIi8qKlxyXG4gKiBBIHBhZ2Ugd2l0aCBsaW5rcyB0byBhbGwgdXNlcnNcclxuICovXHJcblxyXG5saWZlTGluZS5uYXYucmVnaXN0ZXIoe1xyXG5cdG1hdGNoZXI6IFwiL3VzZXJzXCIsXHJcblxyXG5cdG1ha2Uoe3NldFRpdGxlLCBjb250ZW50fSkge1xyXG5cdFx0c2V0VGl0bGUoXCJBbGwgdXNlcnNcIik7XHJcblxyXG5cdFx0Ly8gbG9hZCB0aGUgbGlzdCBvZiB1c2Vyc1xyXG5cdFx0ZmV0Y2goXCIvYXBpL2F1dGgvaW5mby91c2Vyc1wiLCB7XHJcblx0XHRcdGNyZWRlbnRpYWxzOiBcImluY2x1ZGVcIlxyXG5cdFx0fSlcclxuXHJcblx0XHQudGhlbihyZXMgPT4gcmVzLmpzb24oKSlcclxuXHJcblx0XHQudGhlbigoe3N0YXR1cywgZGF0YTogdXNlcnN9KSA9PiB7XHJcblx0XHRcdC8vIG5vdCBhdXRoZW50aWNhdGVkXHJcblx0XHRcdGlmKHN0YXR1cyA9PSBcImZhaWxcIikge1xyXG5cdFx0XHRcdGxpZmVMaW5lLm1ha2VEb20oe1xyXG5cdFx0XHRcdFx0cGFyZW50OiBjb250ZW50LFxyXG5cdFx0XHRcdFx0Y2xhc3NlczogXCJjb250ZW50LXBhZGRlZFwiLFxyXG5cdFx0XHRcdFx0dGV4dDogXCJZb3UgZG8gbm90IGhhdmUgYWNjZXNzIHRvIHRoZSB1c2VyIGxpc3RcIlxyXG5cdFx0XHRcdH0pO1xyXG5cclxuXHRcdFx0XHRyZXR1cm47XHJcblx0XHRcdH1cclxuXHJcblx0XHRcdC8vIHNvcnQgYnkgYWRtaW4gc3RhdHVzXHJcblx0XHRcdHVzZXJzLnNvcnQoKGEsIGIpID0+IHtcclxuXHRcdFx0XHQvLyBzb3J0IGFkbWluc1xyXG5cdFx0XHRcdGlmKGEuYWRtaW4gJiYgIWIuYWRtaW4pIHJldHVybiAtMTtcclxuXHRcdFx0XHRpZighYS5hZG1pbiAmJiBiLmFkbWluKSByZXR1cm4gMTtcclxuXHJcblx0XHRcdFx0Ly8gc29ydCBieSB1c2VybmFtZVxyXG5cdFx0XHRcdGlmKGEudXNlcm5hbWUgPCBiLnVzZXJuYW1lKSByZXR1cm4gLTE7XHJcblx0XHRcdFx0aWYoYS51c2VybmFtZSA+IGIudXNlcm5hbWUpIHJldHVybiAxO1xyXG5cclxuXHRcdFx0XHRyZXR1cm4gMDtcclxuXHRcdFx0fSk7XHJcblxyXG5cdFx0XHR2YXIgZGlzcGxheVVzZXJzID0ge1xyXG5cdFx0XHRcdEFkbWluczogW10sXHJcblx0XHRcdFx0VXNlcnM6IFtdXHJcblx0XHRcdH07XHJcblxyXG5cdFx0XHQvLyBnZW5lcmF0ZSB0aGUgdXNlciBsaXN0XHJcblx0XHRcdHVzZXJzLmZvckVhY2godXNlciA9PiB7XHJcblx0XHRcdFx0Ly8gc29ydCB0aGUgdXNlcnMgaW50byBhZG1pbnMgYW5kIHVzZXJzXHJcblx0XHRcdFx0ZGlzcGxheVVzZXJzW3VzZXIuYWRtaW4gPyBcIkFkbWluc1wiIDogXCJVc2Vyc1wiXVxyXG5cclxuXHRcdFx0XHQucHVzaCh7XHJcblx0XHRcdFx0XHRocmVmOiBgL3VzZXIvJHt1c2VyLnVzZXJuYW1lfWAsXHJcblx0XHRcdFx0XHRpdGVtczogW3tcclxuXHRcdFx0XHRcdFx0dGV4dDogdXNlci51c2VybmFtZSxcclxuXHRcdFx0XHRcdFx0Z3JvdzogdHJ1ZVxyXG5cdFx0XHRcdFx0fV1cclxuXHRcdFx0XHR9KTtcclxuXHRcdFx0fSk7XHJcblxyXG5cdFx0XHQvLyBkaXNwbGF5IHRoZSB1c2VyIGxpc3RcclxuXHRcdFx0bGlmZUxpbmUubWFrZURvbSh7XHJcblx0XHRcdFx0cGFyZW50OiBjb250ZW50LFxyXG5cdFx0XHRcdHdpZGdldDogXCJsaXN0XCIsXHJcblx0XHRcdFx0aXRlbXM6IGRpc3BsYXlVc2Vyc1xyXG5cdFx0XHR9KTtcclxuXHRcdH0pXHJcblxyXG5cdFx0Ly8gc29tZXRoaW5nIHdlbnQgd3Jvbmcgc2hvdyBhbiBlcnJvciBtZXNzYWdlXHJcblx0XHQuY2F0Y2goZXJyID0+IHtcclxuXHRcdFx0bGlmZUxpbmUubWFrZURvbSh7XHJcblx0XHRcdFx0Y2xhc3NlczogXCJjb250ZW50LXBhZGRlZFwiLFxyXG5cdFx0XHRcdHRleHQ6IGVyci5tZXNzYWdlXHJcblx0XHRcdH0pO1xyXG5cdFx0fSk7XHJcblx0fVxyXG59KTtcclxuIiwiLyoqXHJcbiAqIFRoZSBtYWluIGNvbnRlbnQgcGFuZSBmb3IgdGhlIGFwcFxyXG4gKi9cclxuXHJcbmxpZmVMaW5lLm1ha2VEb20ucmVnaXN0ZXIoXCJjb250ZW50XCIsIHtcclxuXHRtYWtlKCkge1xyXG5cdFx0cmV0dXJuIFtcclxuXHRcdFx0e1xyXG5cdFx0XHRcdGNsYXNzZXM6IFwidG9vbGJhclwiLFxyXG5cdFx0XHRcdGNoaWxkcmVuOiBbXHJcblx0XHRcdFx0XHR7XHJcblx0XHRcdFx0XHRcdHRhZzogXCJzdmdcIixcclxuXHRcdFx0XHRcdFx0Y2xhc3NlczogXCJtZW51LWljb25cIixcclxuXHRcdFx0XHRcdFx0YXR0cnM6IHtcclxuXHRcdFx0XHRcdFx0XHR2aWV3Qm94OiBcIjAgMCA2MCA1MFwiLFxyXG5cdFx0XHRcdFx0XHRcdHdpZHRoOiBcIjIwXCIsXHJcblx0XHRcdFx0XHRcdFx0aGVpZ2h0OiBcIjE1XCJcclxuXHRcdFx0XHRcdFx0fSxcclxuXHRcdFx0XHRcdFx0Y2hpbGRyZW46IFtcclxuXHRcdFx0XHRcdFx0XHR7IHRhZzogXCJsaW5lXCIsIGF0dHJzOiB7IHgxOiBcIjBcIiwgeTE6IFwiNVwiLCB4MjogXCI2MFwiLCB5MjogXCI1XCIgfSB9LFxyXG5cdFx0XHRcdFx0XHRcdHsgdGFnOiBcImxpbmVcIiwgYXR0cnM6IHsgeDE6IFwiMFwiLCB5MTogXCIyNVwiLCB4MjogXCI2MFwiLCB5MjogXCIyNVwiIH0gfSxcclxuXHRcdFx0XHRcdFx0XHR7IHRhZzogXCJsaW5lXCIsIGF0dHJzOiB7IHgxOiBcIjBcIiwgeTE6IFwiNDVcIiwgeDI6IFwiNjBcIiwgeTI6IFwiNDVcIiB9IH1cclxuXHRcdFx0XHRcdFx0XSxcclxuXHRcdFx0XHRcdFx0b246IHtcclxuXHRcdFx0XHRcdFx0XHRjbGljazogKCkgPT4gZG9jdW1lbnQuYm9keS5jbGFzc0xpc3QudG9nZ2xlKFwic2lkZWJhci1vcGVuXCIpXHJcblx0XHRcdFx0XHRcdH1cclxuXHRcdFx0XHRcdH0sXHJcblx0XHRcdFx0XHR7XHJcblx0XHRcdFx0XHRcdGNsYXNzZXM6IFwidG9vbGJhci10aXRsZVwiLFxyXG5cdFx0XHRcdFx0XHRuYW1lOiBcInRpdGxlXCJcclxuXHRcdFx0XHRcdH0sXHJcblx0XHRcdFx0XHR7XHJcblx0XHRcdFx0XHRcdGNsYXNzZXM6IFwidG9vbGJhci1idXR0b25zXCIsXHJcblx0XHRcdFx0XHRcdG5hbWU6IFwiYnRuc1wiXHJcblx0XHRcdFx0XHR9XHJcblx0XHRcdFx0XVxyXG5cdFx0XHR9LFxyXG5cdFx0XHR7XHJcblx0XHRcdFx0Y2xhc3NlczogXCJjb250ZW50XCIsXHJcblx0XHRcdFx0bmFtZTogXCJjb250ZW50XCJcclxuXHRcdFx0fVxyXG5cdFx0XTtcclxuXHR9LFxyXG5cclxuXHRiaW5kKG9wdHMsIHt0aXRsZSwgYnRucywgY29udGVudH0pIHtcclxuXHRcdHZhciBkaXNwb3NhYmxlO1xyXG5cclxuXHRcdC8vIHNldCB0aGUgcGFnZSB0aXRsZVxyXG5cdFx0dmFyIHNldFRpdGxlID0gZnVuY3Rpb24odGl0bGVUZXh0KSB7XHJcblx0XHRcdHRpdGxlLmlubmVyVGV4dCA9IHRpdGxlVGV4dDtcclxuXHRcdFx0ZG9jdW1lbnQudGl0bGUgPSB0aXRsZVRleHQ7XHJcblx0XHR9O1xyXG5cclxuXHRcdC8vIGFkZCBhbiBhY3Rpb24gYnV0dG9uXHJcblx0XHRsaWZlTGluZS5vbihcImFjdGlvbi1jcmVhdGVcIiwgbmFtZSA9PiB7XHJcblx0XHRcdGxpZmVMaW5lLm1ha2VEb20oe1xyXG5cdFx0XHRcdHBhcmVudDogYnRucyxcclxuXHRcdFx0XHR0YWc6IFwiYnV0dG9uXCIsXHJcblx0XHRcdFx0Y2xhc3NlczogXCJ0b29sYmFyLWJ1dHRvblwiLFxyXG5cdFx0XHRcdHRleHQ6IG5hbWUsXHJcblx0XHRcdFx0YXR0cnM6IHtcclxuXHRcdFx0XHRcdFwiZGF0YS1uYW1lXCI6IG5hbWVcclxuXHRcdFx0XHR9LFxyXG5cdFx0XHRcdG9uOiB7XHJcblx0XHRcdFx0XHRjbGljazogKCkgPT4gbGlmZUxpbmUuZW1pdChcImFjdGlvbi1leGVjLVwiICsgbmFtZSlcclxuXHRcdFx0XHR9XHJcblx0XHRcdH0pO1xyXG5cdFx0fSk7XHJcblxyXG5cdFx0Ly8gcmVtb3ZlIGFuIGFjdGlvbiBidXR0b25cclxuXHRcdGxpZmVMaW5lLm9uKFwiYWN0aW9uLXJlbW92ZVwiLCBuYW1lID0+IHtcclxuXHRcdFx0dmFyIGJ0biA9IGJ0bnMucXVlcnlTZWxlY3RvcihgW2RhdGEtbmFtZT1cIiR7bmFtZX1cIl1gKTtcclxuXHJcblx0XHRcdGlmKGJ0bikgYnRuLnJlbW92ZSgpO1xyXG5cdFx0fSk7XHJcblxyXG5cdFx0Ly8gcmVtb3ZlIGFsbCB0aGUgYWN0aW9uIGJ1dHRvbnNcclxuXHRcdGxpZmVMaW5lLm9uKFwiYWN0aW9uLXJlbW92ZS1hbGxcIiwgKCkgPT4gYnRucy5pbm5lckhUTUwgPSBcIlwiKTtcclxuXHJcblx0XHQvLyBkaXNwbGF5IHRoZSBjb250ZW50IGZvciB0aGUgdmlld1xyXG5cdFx0dmFyIHVwZGF0ZVZpZXcgPSAoKSA9PiB7XHJcblx0XHRcdC8vIGRlc3Ryb3kgYW55IGxpc3RlbmVycyBmcm9tIG9sZCBjb250ZW50XHJcblx0XHRcdGlmKGRpc3Bvc2FibGUpIHtcclxuXHRcdFx0XHRkaXNwb3NhYmxlLmRpc3Bvc2UoKTtcclxuXHRcdFx0fVxyXG5cclxuXHRcdFx0Ly8gcmVtb3ZlIGFueSBhY3Rpb24gYnV0dG9uc1xyXG5cdFx0XHRsaWZlTGluZS5lbWl0KFwiYWN0aW9uLXJlbW92ZS1hbGxcIik7XHJcblxyXG5cdFx0XHQvLyBjbGVhciBhbGwgdGhlIG9sZCBjb250ZW50XHJcblx0XHRcdGNvbnRlbnQuaW5uZXJIVE1MID0gXCJcIjtcclxuXHJcblx0XHRcdC8vIGNyZWF0ZSB0aGUgZGlzcG9zYWJsZSBmb3IgdGhlIGNvbnRlbnRcclxuXHRcdFx0ZGlzcG9zYWJsZSA9IG5ldyBsaWZlTGluZS5EaXNwb3NhYmxlKCk7XHJcblxyXG5cdFx0XHR2YXIgbWFrZXIgPSBub3RGb3VuZE1ha2VyLCBtYXRjaDtcclxuXHJcblx0XHRcdC8vIGZpbmQgdGhlIGNvcnJlY3QgY29udGVudCBtYWtlclxyXG5cdFx0XHRmb3IobGV0ICRtYWtlciBvZiBjb250ZW50TWFrZXJzKSB7XHJcblx0XHRcdFx0Ly8gcnVuIGEgbWF0Y2hlciBmdW5jdGlvblxyXG5cdFx0XHRcdGlmKHR5cGVvZiAkbWFrZXIubWF0Y2hlciA9PSBcImZ1bmN0aW9uXCIpIHtcclxuXHRcdFx0XHRcdG1hdGNoID0gJG1ha2VyLm1hdGNoZXIobG9jYXRpb24ucGF0aG5hbWUpO1xyXG5cdFx0XHRcdH1cclxuXHRcdFx0XHQvLyBhIHN0cmluZyBtYXRjaFxyXG5cdFx0XHRcdGVsc2UgaWYodHlwZW9mICRtYWtlci5tYXRjaGVyID09IFwic3RyaW5nXCIpIHtcclxuXHRcdFx0XHRcdGlmKCRtYWtlci5tYXRjaGVyID09IGxvY2F0aW9uLnBhdGhuYW1lKSB7XHJcblx0XHRcdFx0XHRcdG1hdGNoID0gJG1ha2VyLm1hdGNoZXI7XHJcblx0XHRcdFx0XHR9XHJcblx0XHRcdFx0fVxyXG5cdFx0XHRcdC8vIGEgcmVnZXggbWF0Y2hcclxuXHRcdFx0XHRlbHNlIHtcclxuXHRcdFx0XHRcdG1hdGNoID0gJG1ha2VyLm1hdGNoZXIuZXhlYyhsb2NhdGlvbi5wYXRobmFtZSk7XHJcblx0XHRcdFx0fVxyXG5cclxuXHRcdFx0XHQvLyBtYXRjaCBmb3VuZCBzdG9wIHNlYXJjaGluZ1xyXG5cdFx0XHRcdGlmKG1hdGNoKSB7XHJcblx0XHRcdFx0XHRtYWtlciA9ICRtYWtlcjtcclxuXHJcblx0XHRcdFx0XHRicmVhaztcclxuXHRcdFx0XHR9XHJcblx0XHRcdH1cclxuXHJcblx0XHRcdC8vIG1ha2UgdGhlIGNvbnRlbnQgZm9yIHRoaXMgcm91dGVcclxuXHRcdFx0bWFrZXIubWFrZSh7ZGlzcG9zYWJsZSwgc2V0VGl0bGUsIGNvbnRlbnQsIG1hdGNofSk7XHJcblx0XHR9O1xyXG5cclxuXHRcdC8vIHN3aXRjaCBwYWdlc1xyXG5cdFx0bGlmZUxpbmUubmF2Lm5hdmlnYXRlID0gZnVuY3Rpb24odXJsKSB7XHJcblx0XHRcdC8vIHVwZGF0ZSB0aGUgdXJsXHJcblx0XHRcdGhpc3RvcnkucHVzaFN0YXRlKG51bGwsIG51bGwsIHVybCk7XHJcblxyXG5cdFx0XHQvLyBzaG93IHRoZSBuZXcgdmlld1xyXG5cdFx0XHR1cGRhdGVWaWV3KCk7XHJcblx0XHR9O1xyXG5cclxuXHRcdC8vIHN3aXRjaCBwYWdlcyB3aGVuIHRoZSB1c2VyIHB1c2hlcyB0aGUgYmFjayBidXR0b25cclxuXHRcdHdpbmRvdy5hZGRFdmVudExpc3RlbmVyKFwicG9wc3RhdGVcIiwgKCkgPT4gdXBkYXRlVmlldygpKTtcclxuXHJcblx0XHQvLyBzaG93IHRoZSBpbml0aWFsIHZpZXdcclxuXHRcdHVwZGF0ZVZpZXcoKTtcclxuXHR9XHJcbn0pO1xyXG5cclxuLy8gYWxsIGNvbnRlbnQgcHJvZHVjZXJzXHJcbnZhciBjb250ZW50TWFrZXJzID0gW107XHJcblxyXG4vLyBjcmVhdGUgdGhlIG5hbWVzcGFjZVxyXG5saWZlTGluZS5uYXYgPSB7fTtcclxuXHJcbi8vIHJlZ2lzdGVyIGEgY29udGVudCBtYWtlclxyXG5saWZlTGluZS5uYXYucmVnaXN0ZXIgPSBmdW5jdGlvbihtYWtlcikge1xyXG5cdGNvbnRlbnRNYWtlcnMucHVzaChtYWtlcik7XHJcbn07XHJcblxyXG4vLyB0aGUgZmFsbCBiYWNrIG1ha2VyIGZvciBubyBzdWNoIHBhZ2VcclxudmFyIG5vdEZvdW5kTWFrZXIgPSB7XHJcblx0bWFrZSh7c2V0VGl0bGUsIGNvbnRlbnR9KSB7XHJcblx0XHQvLyB1cGRhdGUgdGhlIHBhZ2UgdGl0bGVcclxuXHRcdHNldFRpdGxlKFwiTm90IGZvdW5kXCIpO1xyXG5cclxuXHRcdGxpZmVMaW5lLm1ha2VEb20oe1xyXG5cdFx0XHRwYXJlbnQ6IGNvbnRlbnQsXHJcblx0XHRcdGNsYXNzZXM6IFwiY29udGVudC1wYWRkZWRcIixcclxuXHRcdFx0Y2hpbGRyZW46IFtcclxuXHRcdFx0XHR7XHJcblx0XHRcdFx0XHR0YWc6IFwic3BhblwiLFxyXG5cdFx0XHRcdFx0dGV4dDogXCJUaGUgcGFnZSB5b3UgYXJlIGxvb2tpbmcgZm9yIGNvdWxkIG5vdCBiZSBmb3VuZC4gXCJcclxuXHRcdFx0XHR9LFxyXG5cdFx0XHRcdHtcclxuXHRcdFx0XHRcdHdpZGdldDogXCJsaW5rXCIsXHJcblx0XHRcdFx0XHRocmVmOiBcIi9cIixcclxuXHRcdFx0XHRcdHRleHQ6IFwiR28gaG9tZVwiXHJcblx0XHRcdFx0fVxyXG5cdFx0XHRdXHJcblx0XHR9KTtcclxuXHR9XHJcbn07XHJcbiIsIi8qKlxyXG4gKiBDcmVhdGUgYW4gaW5wdXQgZmllbGRcclxuICovXHJcblxyXG5saWZlTGluZS5tYWtlRG9tLnJlZ2lzdGVyKFwiaW5wdXRcIiwge1xyXG5cdG1ha2Uoe3RhZywgdHlwZSwgdmFsdWUsIGNoYW5nZSwgYmluZCwgcHJvcCwgcGxhY2Vob2xkZXIsIGNsYXNzZXN9KSB7XHJcblx0XHQvLyBzZXQgdGhlIGluaXRpYWwgdmFsdWUgb2YgdGhlIGJvdW5kIG9iamVjdFxyXG5cdFx0aWYodHlwZW9mIGJpbmQgPT0gXCJvYmplY3RcIiAmJiAhdmFsdWUpIHtcclxuXHRcdFx0dmFsdWUgPSBiaW5kW3Byb3BdO1xyXG5cdFx0fVxyXG5cclxuXHRcdHZhciBpbnB1dCA9IHtcclxuXHRcdFx0dGFnOiB0YWcgfHwgXCJpbnB1dFwiLFxyXG5cdFx0XHRjbGFzc2VzOiBjbGFzc2VzIHx8IGAke3RhZyA9PSBcInRleHRhcmVhXCIgPyBcInRleHRhcmVhXCIgOiBcImlucHV0XCJ9LWZpbGxgLFxyXG5cdFx0XHRhdHRyczoge30sXHJcblx0XHRcdG9uOiB7XHJcblx0XHRcdFx0aW5wdXQ6IGUgPT4ge1xyXG5cdFx0XHRcdFx0Ly8gdXBkYXRlIHRoZSBwcm9wZXJ0eSBjaGFuZ2VkXHJcblx0XHRcdFx0XHRpZih0eXBlb2YgYmluZCA9PSBcIm9iamVjdFwiKSB7XHJcblx0XHRcdFx0XHRcdGJpbmRbcHJvcF0gPSBlLnRhcmdldC52YWx1ZTtcclxuXHRcdFx0XHRcdH1cclxuXHJcblx0XHRcdFx0XHQvLyBjYWxsIHRoZSBjYWxsYmFja1xyXG5cdFx0XHRcdFx0aWYodHlwZW9mIGNoYW5nZSA9PSBcImZ1bmN0aW9uXCIpIHtcclxuXHRcdFx0XHRcdFx0Y2hhbmdlKGUudGFyZ2V0LnZhbHVlKTtcclxuXHRcdFx0XHRcdH1cclxuXHRcdFx0XHR9XHJcblx0XHRcdH1cclxuXHRcdH07XHJcblxyXG5cdFx0Ly8gYXR0YWNoIHZhbHVlcyBpZiB0aGV5IGFyZSBnaXZlblxyXG5cdFx0aWYodHlwZSkgaW5wdXQuYXR0cnMudHlwZSA9IHR5cGU7XHJcblx0XHRpZih2YWx1ZSkgaW5wdXQuYXR0cnMudmFsdWUgPSB2YWx1ZTtcclxuXHRcdGlmKHBsYWNlaG9sZGVyKSBpbnB1dC5hdHRycy5wbGFjZWhvbGRlciA9IHBsYWNlaG9sZGVyO1xyXG5cclxuXHRcdC8vIGZvciB0ZXh0YXJlYXMgc2V0IGlubmVyVGV4dFxyXG5cdFx0aWYodGFnID09IFwidGV4dGFyZWFcIikge1xyXG5cdFx0XHRpbnB1dC50ZXh0ID0gdmFsdWU7XHJcblx0XHR9XHJcblxyXG5cdFx0cmV0dXJuIGlucHV0O1xyXG5cdH1cclxufSk7XHJcbiIsIi8qKlxyXG4gKiBBIHdpZGdldCB0aGF0IGNyZWF0ZXMgYSBsaW5rIHRoYXQgaG9va3MgaW50byB0aGUgbmF2aWdhdG9yXHJcbiAqL1xyXG5cclxubGlmZUxpbmUubWFrZURvbS5yZWdpc3RlcihcImxpbmtcIiwge1xyXG5cdG1ha2Uob3B0cykge1xyXG5cdFx0cmV0dXJuIHtcclxuXHRcdFx0dGFnOiBcImFcIixcclxuXHRcdFx0YXR0cnM6IHtcclxuXHRcdFx0XHRocmVmOiBvcHRzLmhyZWZcclxuXHRcdFx0fSxcclxuXHRcdFx0b246IHtcclxuXHRcdFx0XHRjbGljazogZSA9PiB7XHJcblx0XHRcdFx0XHQvLyBkb24ndCBvdmVyIHJpZGUgY3RybCBvciBhbHQgb3Igc2hpZnQgY2xpY2tzXHJcblx0XHRcdFx0XHRpZihlLmN0cmxLZXkgfHwgZS5hbHRLZXkgfHwgZS5zaGlmdEtleSkgcmV0dXJuO1xyXG5cclxuXHRcdFx0XHRcdC8vIGRvbid0IG5hdmlnYXRlIHRoZSBwYWdlXHJcblx0XHRcdFx0XHRlLnByZXZlbnREZWZhdWx0KCk7XHJcblxyXG5cdFx0XHRcdFx0bGlmZUxpbmUubmF2Lm5hdmlnYXRlKG9wdHMuaHJlZilcclxuXHRcdFx0XHR9XHJcblx0XHRcdH0sXHJcblx0XHRcdHRleHQ6IG9wdHMudGV4dFxyXG5cdFx0fTtcclxuXHR9XHJcbn0pO1xyXG4iLCIvKipcclxuICogRGlzcGxheSBhIGxpc3Qgd2l0aCBncm91cCBoZWFkaW5nc1xyXG4gKi9cclxuXHJcbmxpZmVMaW5lLm1ha2VEb20ucmVnaXN0ZXIoXCJsaXN0XCIsIHtcclxuXHRtYWtlKHtpdGVtc30pIHtcclxuXHRcdC8vIGFkZCBhbGwgdGhlIGdyb3Vwc1xyXG5cdFx0cmV0dXJuIE9iamVjdC5nZXRPd25Qcm9wZXJ0eU5hbWVzKGl0ZW1zKVxyXG5cclxuXHRcdC5tYXAoZ3JvdXBOYW1lID0+IG1ha2VHcm91cChncm91cE5hbWUsIGl0ZW1zW2dyb3VwTmFtZV0pKTtcclxuXHR9XHJcbn0pO1xyXG5cclxuLy8gbWFrZSBhIHNpbmdsZSBncm91cFxyXG52YXIgbWFrZUdyb3VwID0gZnVuY3Rpb24obmFtZSwgaXRlbXMsIHBhcmVudCkge1xyXG5cdC8vIGFkZCB0aGUgbGlzdCBoZWFkZXJcclxuXHRpdGVtcy51bnNoaWZ0KHtcclxuXHRcdGNsYXNzZXM6IFwibGlzdC1oZWFkZXJcIixcclxuXHRcdHRleHQ6IG5hbWVcclxuXHR9KTtcclxuXHJcblx0Ly8gcmVuZGVyIHRoZSBpdGVtXHJcblx0cmV0dXJuIHtcclxuXHRcdHBhcmVudCxcclxuXHRcdGNsYXNzZXM6IFwibGlzdC1zZWN0aW9uXCIsXHJcblx0XHRjaGlsZHJlbjogaXRlbXMubWFwKChpdGVtLCBpbmRleCkgPT4ge1xyXG5cdFx0XHQvLyBkb24ndCBtb2RpZnkgdGhlIGhlYWRlclxyXG5cdFx0XHRpZihpbmRleCA9PT0gMCkgcmV0dXJuIGl0ZW07XHJcblxyXG5cdFx0XHR2YXIgaXRlbURvbTtcclxuXHJcblx0XHRcdC8vIGNyZWF0ZSBhbiBpdGVtXHJcblx0XHRcdGlmKHR5cGVvZiBpdGVtICE9IFwic3RyaW5nXCIpIHtcclxuXHRcdFx0XHRpdGVtRG9tID0ge1xyXG5cdFx0XHRcdFx0Y2xhc3NlczogXCJsaXN0LWl0ZW1cIixcclxuXHRcdFx0XHRcdGNoaWxkcmVuOiAoaXRlbS5pdGVtcyB8fCBpdGVtKS5tYXAoaXRlbSA9PiB7XHJcblx0XHRcdFx0XHRcdHJldHVybiB7XHJcblx0XHRcdFx0XHRcdFx0Ly8gZ2V0IHRoZSBuYW1lIG9mIHRoZSBpdGVtXHJcblx0XHRcdFx0XHRcdFx0dGV4dDogdHlwZW9mIGl0ZW0gPT0gXCJzdHJpbmdcIiA/IGl0ZW0gOiBpdGVtLnRleHQsXHJcblx0XHRcdFx0XHRcdFx0Ly8gc2V0IHdoZXRoZXIgdGhlIGl0ZW0gc2hvdWxkIGdyb3dcclxuXHRcdFx0XHRcdFx0XHRjbGFzc2VzOiBpdGVtLmdyb3cgPyBcImxpc3QtaXRlbS1ncm93XCIgOiBcImxpc3QtaXRlbS1wYXJ0XCJcclxuXHRcdFx0XHRcdFx0fTtcclxuXHRcdFx0XHRcdH0pXHJcblx0XHRcdFx0fTtcclxuXHRcdFx0fVxyXG5cdFx0XHRlbHNlIHtcclxuXHRcdFx0XHRpdGVtRG9tID0ge1xyXG5cdFx0XHRcdFx0Y2xhc3NlczogXCJsaXN0LWl0ZW1cIixcclxuXHRcdFx0XHRcdHRleHQ6IGl0ZW1cclxuXHRcdFx0XHR9O1xyXG5cdFx0XHR9XHJcblxyXG5cdFx0XHQvLyBtYWtlIHRoZSBpdGVtIGEgbGlua1xyXG5cdFx0XHRpZihpdGVtLmhyZWYpIHtcclxuXHRcdFx0XHRpdGVtRG9tLm9uID0ge1xyXG5cdFx0XHRcdFx0Y2xpY2s6ICgpID0+IGxpZmVMaW5lLm5hdi5uYXZpZ2F0ZShpdGVtLmhyZWYpXHJcblx0XHRcdFx0fTtcclxuXHRcdFx0fVxyXG5cclxuXHRcdFx0cmV0dXJuIGl0ZW1Eb207XHJcblx0XHR9KVxyXG5cdH07XHJcbn07XHJcbiIsIi8qKlxyXG4gKiBUaGUgcHJvZ3Jlc3MgYmFyIGF0IHRoZSB0b3Agb2YgdGhlIHBhZ2VcclxuICovXHJcblxyXG5saWZlTGluZS5tYWtlRG9tLnJlZ2lzdGVyKFwicHJvZ3Jlc3NcIiwge1xyXG5cdG1ha2UoKSB7XHJcblx0XHRyZXR1cm4ge1xyXG5cdFx0XHRjbGFzc2VzOiBcInByb2dyZXNzXCIsXHJcblx0XHRcdG5hbWU6IFwicHJvZ3Jlc3NcIlxyXG5cdFx0fTtcclxuXHR9LFxyXG5cclxuXHRiaW5kKG9wdHMsIHtwcm9ncmVzc30pIHtcclxuXHRcdC8vIHNldCB0aGUgcHJvZ3Jlc3MgYmFyIHZhbHVlIFswLCAxXVxyXG5cdFx0dmFyIHNldFByb2dyZXNzID0gZnVuY3Rpb24odmFsdWUpIHtcclxuXHRcdFx0dmFyIGFkanVzdEJ5ID0gMDtcclxuXHJcblx0XHRcdGlmKHZhbHVlID4gMCkge1xyXG5cdFx0XHRcdC8vIHNjYWxlIGxlYXZlcyB0aGUgcHJvZ3Jlc3MgYmFyIHBlcmZlY3RseSBpbiB0aGUgbWlkZGxlIG9mIHRoZSBwYWdlXHJcblx0XHRcdFx0Ly8gMSAtIHZhbHVlIGdldHMgdGhlIGFtb3VudCBvZiBzcGFjZSByZW1haW5pbmdcclxuXHRcdFx0XHQvLyAvIDIgZ2V0cyBqdXN0IHRoZSBzcGFjZSBvbiBvbmUgc2lkZVxyXG5cdFx0XHRcdC8vIC8gdmFsdWUgZ2V0cyB0aGF0IGFtb3VudCByZWxpdGl2ZSB0byB0aGUgcHJvZ3Jlc3MgYmFycyBzY2FsZWQgd2lkdGhcclxuXHRcdFx0XHQvLyAqIDEwMCBjb252ZXJ0cyBpdCB0byBhIHBlcmNlbnRcclxuXHRcdFx0XHRhZGp1c3RCeSA9ICgxIC0gdmFsdWUpIC8gMiAvIHZhbHVlICogMTAwO1xyXG5cdFx0XHR9XHJcblxyXG5cdFx0XHRwcm9ncmVzcy5zdHlsZS50cmFuc2Zvcm0gPSBgc2NhbGVYKCR7dmFsdWV9KSB0cmFuc2xhdGVYKC0ke2FkanVzdEJ5fSUpYDtcclxuXHRcdH07XHJcblxyXG5cdFx0Ly8gaGlkZSB0aGUgcHJvZ3Jlc3MgYmFyIGluaXRpYWxseVxyXG5cdFx0cHJvZ3Jlc3Muc3R5bGUudHJhbnNmb3JtID0gXCJzY2FsZVgoMClcIjtcclxuXHJcblx0XHRyZW5kZXIgPSBmdW5jdGlvbigpIHtcclxuXHRcdFx0Ly8gY2FsY3VsYXRlIGhvdyBtdWNoIHRoaXMgcGVyY2VudCBjb250cmlidXRlcyB0byB0aGUgb3ZlcmFsbCBwcm9ncmVzc1xyXG5cdFx0XHR2YXIgY29udHJpYnV0aW9uID0gMSAvIHByb2dyZXNzZXMubGVuZ3RoO1xyXG5cclxuXHRcdFx0c2V0UHJvZ3Jlc3MoXHJcblx0XHRcdFx0cHJvZ3Jlc3Nlcy5yZWR1Y2UoKHByb2csIHBlcmMpID0+IHByb2cgKyBwZXJjLnZhbHVlICogY29udHJpYnV0aW9uLCAwKVxyXG5cdFx0XHQpO1xyXG5cdFx0fTtcclxuXHJcblx0XHRyZW5kZXIoKTtcclxuXHR9XHJcbn0pO1xyXG5cclxuLy8gc3ViIHJlbmRlciB1bnRpbCBwcm9ncmVzcyBpcyBjcmVhdGVkXHJcbnZhciByZW5kZXIgPSAoKSA9PiB7fTtcclxuXHJcbnZhciBwcm9ncmVzc2VzID0gW107XHJcblxyXG4vLyBjb21iaW5lIG11bHRpcGxlIHByb2dyZXNzIGxldmVsc1xyXG5saWZlTGluZS5Qcm9ncmVzcyA9IGNsYXNzIHtcclxuXHRjb25zdHJ1Y3RvcigpIHtcclxuXHRcdHRoaXMudmFsdWUgPSAwO1xyXG5cclxuXHRcdHByb2dyZXNzZXMucHVzaCh0aGlzKTtcclxuXHJcblx0XHRyZW5kZXIoKTtcclxuXHR9XHJcblxyXG5cdC8vIHNldCB0aGUgcHJvZ3Jlc3NcclxuXHRzZXQodmFsdWUpIHtcclxuXHRcdHRoaXMudmFsdWUgPSB2YWx1ZTtcclxuXHJcblx0XHQvLyBhbGwgdGhlIGpvYnMgYXJlIGRvbmUgcmVtb3ZlIHRoZW1cclxuXHRcdGlmKHByb2dyZXNzZXMuZXZlcnkocHJvZyA9PiBwcm9nLnZhbHVlID09IDEpKSB7XHJcblx0XHRcdHByb2dyZXNzZXMgPSBbXTtcclxuXHRcdH1cclxuXHJcblx0XHRyZW5kZXIoKTtcclxuXHR9XHJcbn07XHJcbiIsIi8qKlxyXG4gKiBUaGUgd2lkZ2V0IGZvciB0aGUgc2lkZWJhclxyXG4gKi9cclxuXHJcbmxpZmVMaW5lLm1ha2VEb20ucmVnaXN0ZXIoXCJzaWRlYmFyXCIsIHtcclxuXHRtYWtlKCkge1xyXG5cdFx0cmV0dXJuIFtcclxuXHRcdFx0e1xyXG5cdFx0XHRcdGNsYXNzZXM6IFwic2lkZWJhclwiLFxyXG5cdFx0XHRcdG5hbWU6IFwic2lkZWJhclwiLFxyXG5cdFx0XHRcdGNoaWxkcmVuOiBbXHJcblx0XHRcdFx0XHR7XHJcblx0XHRcdFx0XHRcdGNsYXNzZXM6IFtcInNpZGViYXItYWN0aW9uc1wiLCBcImhpZGRlblwiXSxcclxuXHRcdFx0XHRcdFx0bmFtZTogXCJhY3Rpb25zXCIsXHJcblx0XHRcdFx0XHRcdGNoaWxkcmVuOiBbXHJcblx0XHRcdFx0XHRcdFx0e1xyXG5cdFx0XHRcdFx0XHRcdFx0Y2xhc3NlczogXCJzaWRlYmFyLWhlYWRpbmdcIixcclxuXHRcdFx0XHRcdFx0XHRcdHRleHQ6IFwiUGFnZSBhY3Rpb25zXCJcclxuXHRcdFx0XHRcdFx0XHR9XHJcblx0XHRcdFx0XHRcdF1cclxuXHRcdFx0XHRcdH0sXHJcblx0XHRcdFx0XHR7XHJcblx0XHRcdFx0XHRcdGNsYXNzZXM6IFwic2lkZWJhci1oZWFkaW5nXCIsXHJcblx0XHRcdFx0XHRcdHRleHQ6IFwiTW9yZSBhY3Rpb25zXCJcclxuXHRcdFx0XHRcdH1cclxuXHRcdFx0XHRdXHJcblx0XHRcdH0sXHJcblx0XHRcdHtcclxuXHRcdFx0XHRjbGFzc2VzOiBcInNoYWRlXCIsXHJcblx0XHRcdFx0b246IHtcclxuXHRcdFx0XHRcdC8vIGNsb3NlIHRoZSBzaWRlYmFyXHJcblx0XHRcdFx0XHRjbGljazogKCkgPT4gZG9jdW1lbnQuYm9keS5jbGFzc0xpc3QucmVtb3ZlKFwic2lkZWJhci1vcGVuXCIpXHJcblx0XHRcdFx0fVxyXG5cdFx0XHR9XHJcblx0XHRdO1xyXG5cdH0sXHJcblxyXG5cdGJpbmQob3B0cywge2FjdGlvbnMsIHNpZGViYXJ9KSB7XHJcblx0XHQvLyBhZGQgYSBjb21tYW5kIHRvIHRoZSBzaWRlYmFyXHJcblx0XHRsaWZlTGluZS5hZGRDb21tYW5kID0gZnVuY3Rpb24obmFtZSwgZm4pIHtcclxuXHRcdFx0Ly8gbWFrZSB0aGUgc2lkZWJhciBpdGVtXHJcblx0XHRcdHZhciB7aXRlbX0gPSBsaWZlTGluZS5tYWtlRG9tKHtcclxuXHRcdFx0XHRwYXJlbnQ6IHNpZGViYXIsXHJcblx0XHRcdFx0dGFnOiBcImRpdlwiLFxyXG5cdFx0XHRcdG5hbWU6IFwiaXRlbVwiLFxyXG5cdFx0XHRcdGNsYXNzZXM6IFwic2lkZWJhci1pdGVtXCIsXHJcblx0XHRcdFx0dGV4dDogbmFtZSxcclxuXHRcdFx0XHRvbjoge1xyXG5cdFx0XHRcdFx0Y2xpY2s6ICgpID0+IHtcclxuXHRcdFx0XHRcdFx0Ly8gY2xvc2UgdGhlIHNpZGViYXJcclxuXHRcdFx0XHRcdFx0ZG9jdW1lbnQuYm9keS5jbGFzc0xpc3QucmVtb3ZlKFwic2lkZWJhci1vcGVuXCIpO1xyXG5cclxuXHRcdFx0XHRcdFx0Ly8gY2FsbCB0aGUgbGlzdGVuZXJcclxuXHRcdFx0XHRcdFx0Zm4oKTtcclxuXHRcdFx0XHRcdH1cclxuXHRcdFx0XHR9XHJcblx0XHRcdH0pO1xyXG5cclxuXHRcdFx0cmV0dXJuIHtcclxuXHRcdFx0XHR1bnN1YnNjcmliZTogKCkgPT4gaXRlbS5yZW1vdmUoKVxyXG5cdFx0XHR9O1xyXG5cdFx0fTtcclxuXHJcblx0XHQvLyBhZGQgYSBuYXZpZ2F0aW9uYWwgY29tbWFuZFxyXG5cdFx0bGlmZUxpbmUuYWRkTmF2Q29tbWFuZCA9IGZ1bmN0aW9uKG5hbWUsIHRvKSB7XHJcblx0XHRcdGxpZmVMaW5lLmFkZENvbW1hbmQobmFtZSwgKCkgPT4gbGlmZUxpbmUubmF2Lm5hdmlnYXRlKHRvKSk7XHJcblx0XHR9O1xyXG5cclxuXHRcdC8vIGFkZCBhIHNpZGViYXIgYWN0aW9uXHJcblx0XHRsaWZlTGluZS5vbihcImFjdGlvbi1jcmVhdGVcIiwgbmFtZSA9PiB7XHJcblx0XHRcdC8vIHNob3cgdGhlIGFjdGlvbnNcclxuXHRcdFx0YWN0aW9ucy5jbGFzc0xpc3QucmVtb3ZlKFwiaGlkZGVuXCIpO1xyXG5cclxuXHRcdFx0Ly8gY3JlYXRlIHRoZSBidXR0b25cclxuXHRcdFx0bGlmZUxpbmUubWFrZURvbSh7XHJcblx0XHRcdFx0cGFyZW50OiBhY3Rpb25zLFxyXG5cdFx0XHRcdHRhZzogXCJkaXZcIixcclxuXHRcdFx0XHRuYW1lOiBcIml0ZW1cIixcclxuXHRcdFx0XHRjbGFzc2VzOiBcInNpZGViYXItaXRlbVwiLFxyXG5cdFx0XHRcdHRleHQ6IG5hbWUsXHJcblx0XHRcdFx0YXR0cnM6IHtcclxuXHRcdFx0XHRcdFwiZGF0YS1uYW1lXCI6IG5hbWVcclxuXHRcdFx0XHR9LFxyXG5cdFx0XHRcdG9uOiB7XHJcblx0XHRcdFx0XHRjbGljazogKCkgPT4ge1xyXG5cdFx0XHRcdFx0XHQvLyBjbG9zZSB0aGUgc2lkZWJhclxyXG5cdFx0XHRcdFx0XHRkb2N1bWVudC5ib2R5LmNsYXNzTGlzdC5yZW1vdmUoXCJzaWRlYmFyLW9wZW5cIik7XHJcblxyXG5cdFx0XHRcdFx0XHQvLyB0cmlnZ2VyIHRoZSBhY3Rpb25cclxuXHRcdFx0XHRcdFx0bGlmZUxpbmUuZW1pdChcImFjdGlvbi1leGVjLVwiICsgbmFtZSk7XHJcblx0XHRcdFx0XHR9XHJcblx0XHRcdFx0fVxyXG5cdFx0XHR9KTtcclxuXHJcblx0XHRcdC8vIHJlbW92ZSBhIHNpZGViYXIgYWN0aW9uXHJcblx0XHRcdGxpZmVMaW5lLm9uKFwiYWN0aW9uLXJlbW92ZVwiLCBuYW1lID0+IHtcclxuXHRcdFx0XHQvLyByZW1vdmUgdGhlIGJ1dHRvblxyXG5cdFx0XHRcdHZhciBidG4gPSBhY3Rpb25zLnF1ZXJ5U2VsZWN0b3IoYFtkYXRhLW5hbWU9XCIke25hbWV9XCJdYCk7XHJcblxyXG5cdFx0XHRcdGlmKGJ0bikgYnRuLnJlbW92ZSgpO1xyXG5cclxuXHRcdFx0XHQvLyBoaWRlIHRoZSBwYWdlIGFjdGlvbnMgaWYgdGhlcmUgYXJlIG5vbmVcclxuXHRcdFx0XHRpZihhY3Rpb25zLmNoaWxkcmVuLmxlbmd0aCA9PSAxKSB7XHJcblx0XHRcdFx0XHRhY3Rpb25zLmNsYXNzTGlzdC5hZGQoXCJoaWRkZW5cIik7XHJcblx0XHRcdFx0fVxyXG5cdFx0XHR9KTtcclxuXHJcblx0XHRcdC8vIHJlbW92ZSBhbGwgdGhlIHNpZGViYXIgYWN0aW9uc1xyXG5cdFx0XHRsaWZlTGluZS5vbihcImFjdGlvbi1yZW1vdmUtYWxsXCIsICgpID0+IHtcclxuXHRcdFx0XHQvLyByZW1vdmUgYWxsIHRoZSBhY3Rpb25zXHJcblx0XHRcdFx0dmFyIF9hY3Rpb25zID0gQXJyYXkuZnJvbShhY3Rpb25zLnF1ZXJ5U2VsZWN0b3JBbGwoXCIuc2lkZWJhci1pdGVtXCIpKTtcclxuXHJcblx0XHRcdFx0X2FjdGlvbnMuZm9yRWFjaChhY3Rpb24gPT4gYWN0aW9uLnJlbW92ZSgpKTtcclxuXHJcblx0XHRcdFx0Ly8gc2lkZSB0aGUgcGFnZSBhY3Rpb25zXHJcblx0XHRcdFx0YWN0aW9ucy5jbGFzc0xpc3QuYWRkKFwiaGlkZGVuXCIpO1xyXG5cdFx0XHR9KTtcclxuXHRcdH0pO1xyXG5cdH1cclxufSk7XHJcbiIsIi8qKlxyXG4gKiBBIHJvdyBvZiByYWRpbyBzdHlsZSBidXR0b25zXHJcbiAqL1xyXG5cclxubGlmZUxpbmUubWFrZURvbS5yZWdpc3RlcihcInRvZ2dsZS1idG5zXCIsIHtcclxuXHRtYWtlKHtidG5zLCB2YWx1ZX0pIHtcclxuXHRcdC8vIGF1dG8gc2VsZWN0IHRoZSBmaXJzdCBidXR0b25cclxuXHRcdGlmKCF2YWx1ZSkge1xyXG5cdFx0XHR2YWx1ZSA9IHR5cGVvZiBidG5zWzBdID09IFwic3RyaW5nXCIgPyBidG5zWzBdIDogYnRuc1swXS52YWx1ZTtcclxuXHRcdH1cclxuXHJcblx0XHRyZXR1cm4ge1xyXG5cdFx0XHRuYW1lOiBcInRvZ2dsZUJhclwiLFxyXG5cdFx0XHRjbGFzc2VzOiBcInRvZ2dsZS1iYXJcIixcclxuXHRcdFx0Y2hpbGRyZW46IGJ0bnMubWFwKGJ0biA9PiB7XHJcblx0XHRcdFx0Ly8gY29udmVydCB0aGUgcGxhaW4gc3RyaW5nIHRvIGFuIG9iamVjdFxyXG5cdFx0XHRcdGlmKHR5cGVvZiBidG4gPT0gXCJzdHJpbmdcIikge1xyXG5cdFx0XHRcdFx0YnRuID0geyB0ZXh0OiBidG4sIHZhbHVlOiBidG4gfTtcclxuXHRcdFx0XHR9XHJcblxyXG5cdFx0XHRcdHZhciBjbGFzc2VzID0gW1widG9nZ2xlLWJ0blwiXTtcclxuXHJcblx0XHRcdFx0Ly8gYWRkIHRoZSBzZWxlY3RlZCBjbGFzc1xyXG5cdFx0XHRcdGlmKHZhbHVlID09IGJ0bi52YWx1ZSkge1xyXG5cdFx0XHRcdFx0Y2xhc3Nlcy5wdXNoKFwidG9nZ2xlLWJ0bi1zZWxlY3RlZFwiKTtcclxuXHJcblx0XHRcdFx0XHQvLyBkb24ndCBzZWxlY3QgdHdvIGJ1dHRvbnNcclxuXHRcdFx0XHRcdHZhbHVlID0gdW5kZWZpbmVkO1xyXG5cdFx0XHRcdH1cclxuXHJcblx0XHRcdFx0cmV0dXJuIHtcclxuXHRcdFx0XHRcdHRhZzogXCJidXR0b25cIixcclxuXHRcdFx0XHRcdGNsYXNzZXMsXHJcblx0XHRcdFx0XHR0ZXh0OiBidG4udGV4dCxcclxuXHRcdFx0XHRcdGF0dHJzOiB7XHJcblx0XHRcdFx0XHRcdFwiZGF0YS12YWx1ZVwiOiBidG4udmFsdWVcclxuXHRcdFx0XHRcdH1cclxuXHRcdFx0XHR9O1xyXG5cdFx0XHR9KVxyXG5cdFx0fTtcclxuXHR9LFxyXG5cclxuXHRiaW5kKHtjaGFuZ2V9LCB7dG9nZ2xlQmFyfSkge1xyXG5cdFx0Ly8gYXR0YWNoIGxpc3RlbmVyc1xyXG5cdFx0Zm9yKGxldCBidG4gb2YgdG9nZ2xlQmFyLnF1ZXJ5U2VsZWN0b3JBbGwoXCIudG9nZ2xlLWJ0blwiKSkge1xyXG5cdFx0XHRidG4uYWRkRXZlbnRMaXN0ZW5lcihcImNsaWNrXCIsICgpID0+IHtcclxuXHRcdFx0XHR2YXIgc2VsZWN0ZWQgPSB0b2dnbGVCYXIucXVlcnlTZWxlY3RvcihcIi50b2dnbGUtYnRuLXNlbGVjdGVkXCIpO1xyXG5cclxuXHRcdFx0XHQvLyB0aGUgYnV0dG9uIGhhcyBhbHJlYWR5IGJlZW4gc2VsZWN0ZWRcclxuXHRcdFx0XHRpZihzZWxlY3RlZCA9PSBidG4pIHtcclxuXHRcdFx0XHRcdHJldHVybjtcclxuXHRcdFx0XHR9XHJcblxyXG5cdFx0XHRcdC8vIHVudG9nZ2xlIHRoZSBvdGhlciBidXR0b25cclxuXHRcdFx0XHRpZihzZWxlY3RlZCkge1xyXG5cdFx0XHRcdFx0c2VsZWN0ZWQuY2xhc3NMaXN0LnJlbW92ZShcInRvZ2dsZS1idG4tc2VsZWN0ZWRcIik7XHJcblx0XHRcdFx0fVxyXG5cclxuXHRcdFx0XHQvLyBzZWxlY3QgdGhpcyBidXR0b25cclxuXHRcdFx0XHRidG4uY2xhc3NMaXN0LmFkZChcInRvZ2dsZS1idG4tc2VsZWN0ZWRcIik7XHJcblxyXG5cdFx0XHRcdC8vIHRyaWdnZXIgYSBzZWxlY3Rpb24gY2hhbmdlXHJcblx0XHRcdFx0Y2hhbmdlKGJ0bi5kYXRhc2V0LnZhbHVlKTtcclxuXHRcdFx0fSk7XHJcblx0XHR9XHJcblx0fVxyXG59KTtcclxuIiwiLyoqXHJcbiAqIE5hbWUgZ2VuZXJhdG9yIGZvciBiYWNrdXBzXHJcbiAqL1xyXG5cclxuZXhwb3J0cy5nZW5CYWNrdXBOYW1lID0gZnVuY3Rpb24oZGF0ZSA9IG5ldyBEYXRlKCkpIHtcclxuXHRyZXR1cm4gYGJhY2t1cC0ke2RhdGUuZ2V0RnVsbFllYXIoKX0tJHtkYXRlLmdldE1vbnRoKCkrMX0tJHtkYXRlLmdldERhdGUoKX1gXHJcblx0XHQrIGAtJHtkYXRlLmdldEhvdXJzKCl9LSR7ZGF0ZS5nZXRNaW51dGVzKCl9LnppcGA7XHJcbn07XHJcbiIsIi8qKlxyXG4gKiBBbiBhZGFwdG9yIGZvciBodHRwIGJhc2VkIHN0b3Jlc1xyXG4gKi9cclxuXHJcbmlmKHR5cGVvZiB3aW5kb3cgIT0gXCJvYmplY3RcIikge1xyXG5cdC8vIHBvbHlmaWxsIGZldGNoIGZvciBub2RlXHJcblx0ZmV0Y2ggPSByZXF1aXJlKFwibm9kZS1mZXRjaFwiKTtcclxufVxyXG5cclxuY2xhc3MgSHR0cEFkYXB0b3Ige1xyXG5cdGNvbnN0cnVjdG9yKG9wdHMpIHtcclxuXHRcdC8vIGlmIHdlIGFyZSBqdXN0IGdpdmVuIGEgc3RyaW5nIHVzZSBpdCBhcyB0aGUgc291cmNlXHJcblx0XHRpZih0eXBlb2Ygb3B0cyA9PSBcInN0cmluZ1wiKSB7XHJcblx0XHRcdG9wdHMgPSB7XHJcblx0XHRcdFx0c3JjOiBvcHRzXHJcblx0XHRcdH07XHJcblx0XHR9XHJcblxyXG5cdFx0Ly8gc2F2ZSB0aGUgb3B0aW9uc1xyXG5cdFx0dGhpcy5fb3B0cyA9IG9wdHM7XHJcblx0fVxyXG5cclxuXHQvLyBjcmVhdGUgdGhlIG9wdGlvbnMgZm9yIGEgZmV0Y2ggcmVxdWVzdFxyXG5cdF9jcmVhdGVPcHRzKCkge1xyXG5cdFx0dmFyIG9wdHMgPSB7fTtcclxuXHJcblx0XHQvLyB1c2UgdGhlIHNlc3Npb24gY29va2llIHdlIHdlcmUgZ2l2ZW5cclxuXHRcdGlmKHRoaXMuX29wdHMuc2Vzc2lvbikge1xyXG5cdFx0XHRvcHRzLmhlYWRlcnMgPSB7XHJcblx0XHRcdFx0Y29va2llOiBgc2Vzc2lvbj0ke3RoaXMuX29wdHMuc2Vzc2lvbn1gXHJcblx0XHRcdH07XHJcblx0XHR9XHJcblx0XHQvLyB1c2UgdGhlIGNyZWFkZW50aWFscyBmcm9tIHRoZSBicm93c2VyXHJcblx0XHRlbHNlIHtcclxuXHRcdFx0b3B0cy5jcmVkZW50aWFscyA9IFwiaW5jbHVkZVwiO1xyXG5cdFx0fVxyXG5cclxuXHRcdHJldHVybiBvcHRzO1xyXG5cdH1cclxuXHJcblx0LyoqXHJcblx0ICogR2V0IGFsbCB0aGUgdmFsdWVzIGluIGEgc3RvcmVcclxuXHQgKi9cclxuXHRnZXRBbGwoKSB7XHJcblx0XHRyZXR1cm4gZmV0Y2godGhpcy5fb3B0cy5zcmMsIHRoaXMuX2NyZWF0ZU9wdHMoKSlcclxuXHJcblx0XHQvLyBwYXJzZSB0aGUganNvbiByZXNwb25zZVxyXG5cdFx0LnRoZW4ocmVzID0+IHtcclxuXHRcdFx0Ly8gc2VydmVyL3NlcnZpY2Ugd29ya2VyIGVycm9yXHJcblx0XHRcdGlmKHJlcy5zdGF0dXMgPT0gNTAwKSB7XHJcblx0XHRcdFx0cmV0dXJuIHJlcy50ZXh0KClcclxuXHJcblx0XHRcdFx0LnRoZW4obXNnID0+IHtcclxuXHRcdFx0XHRcdHRocm93IG5ldyBFcnJvcihtc2cpO1xyXG5cdFx0XHRcdH0pO1xyXG5cdFx0XHR9XHJcblxyXG5cdFx0XHRyZXR1cm4gcmVzLmpzb24oKTtcclxuXHRcdH0pXHJcblxyXG5cdFx0LnRoZW4oanNvbiA9PiB7XHJcblx0XHRcdC8vIGFuIGVycm9yIG9jY3VyZWQgb24gdGhlIHNlcnZlclxyXG5cdFx0XHRpZihqc29uLnN0YXR1cyA9PSBcImVycm9yXCIpIHtcclxuXHRcdFx0XHR0aHJvdyBuZXcgRXJyb3IoanNvbi5kYXRhKTtcclxuXHRcdFx0fVxyXG5cclxuXHRcdFx0cmV0dXJuIGpzb247XHJcblx0XHR9KTtcclxuXHR9XHJcblxyXG5cdC8qKlxyXG5cdCAqIEdldCBhIHNpbmdsZSB2YWx1ZVxyXG5cdCAqL1xyXG5cdGdldChrZXkpIHtcclxuXHRcdHJldHVybiBmZXRjaCh0aGlzLl9vcHRzLnNyYyArIFwidmFsdWUvXCIgKyBrZXksIHRoaXMuX2NyZWF0ZU9wdHMoKSlcclxuXHJcblx0XHQudGhlbihyZXMgPT4ge1xyXG5cdFx0XHQvLyBub3QgbG9nZ2VkIGluXHJcblx0XHRcdGlmKHJlcy5zdGF0dXMgPT0gNDAzKSB7XHJcblx0XHRcdFx0bGV0IGVycm9yID0gbmV3IEVycm9yKFwiTm90IGxvZ2dlZCBpblwiKTtcclxuXHJcblx0XHRcdFx0Ly8gYWRkIGFuIGVycm9yIGNvZGVcclxuXHRcdFx0XHRlcnJvci5jb2RlID0gXCJub3QtbG9nZ2VkLWluXCI7XHJcblxyXG5cdFx0XHRcdHRocm93IGVycm9yO1xyXG5cdFx0XHR9XHJcblxyXG5cdFx0XHQvLyBubyBzdWNoIGl0ZW1cclxuXHRcdFx0aWYocmVzLnN0YXR1cyA9PSA0MDQpIHtcclxuXHRcdFx0XHRyZXR1cm4gdW5kZWZpbmVkO1xyXG5cdFx0XHR9XHJcblxyXG5cdFx0XHQvLyBzZXJ2ZXIvc2VydmljZSB3b3JrZXIgZXJyb3JcclxuXHRcdFx0aWYocmVzLnN0YXR1cyA9PSA1MDApIHtcclxuXHRcdFx0XHRyZXR1cm4gcmVzLnRleHQoKVxyXG5cclxuXHRcdFx0XHQudGhlbihtc2cgPT4ge1xyXG5cdFx0XHRcdFx0dGhyb3cgbmV3IEVycm9yKG1zZyk7XHJcblx0XHRcdFx0fSk7XHJcblx0XHRcdH1cclxuXHJcblx0XHRcdC8vIHBhcnNlIHRoZSBpdGVtXHJcblx0XHRcdHJldHVybiByZXMuanNvbigpO1xyXG5cdFx0fSlcclxuXHJcblx0XHQudGhlbihqc29uID0+IHtcclxuXHRcdFx0Ly8gYW4gZXJyb3Igb2NjdXJlZCBvbiB0aGUgc2VydmVyXHJcblx0XHRcdGlmKGpzb24gJiYganNvbi5zdGF0dXMgPT0gXCJlcnJvclwiKSB7XHJcblx0XHRcdFx0dGhyb3cgbmV3IEVycm9yKGpzb24uZGF0YSk7XHJcblx0XHRcdH1cclxuXHJcblx0XHRcdHJldHVybiBqc29uO1xyXG5cdFx0fSk7XHJcblx0fVxyXG5cclxuXHQvKipcclxuXHQgKiBTdG9yZSBhbiB2YWx1ZSBvbiB0aGUgc2VydmVyXHJcblx0ICovXHJcblx0c2V0KHZhbHVlKSB7XHJcblx0XHR2YXIgZmV0Y2hPcHRzID0gdGhpcy5fY3JlYXRlT3B0cygpO1xyXG5cclxuXHRcdC8vIGFkZCB0aGUgaGVhZGVycyB0byB0aGUgZGVmYXVsdCBoZWFkZXJzXHJcblx0XHRmZXRjaE9wdHMubWV0aG9kID0gXCJQVVRcIjtcclxuXHRcdGZldGNoT3B0cy5ib2R5ID0gSlNPTi5zdHJpbmdpZnkodmFsdWUpO1xyXG5cclxuXHRcdC8vIHNlbmQgdGhlIGl0ZW1cclxuXHRcdHJldHVybiBmZXRjaCh0aGlzLl9vcHRzLnNyYyArIFwidmFsdWUvXCIgKyB2YWx1ZS5pZCwgZmV0Y2hPcHRzKVxyXG5cclxuXHRcdC50aGVuKHJlcyA9PiB7XHJcblx0XHRcdC8vIG5vdCBsb2dnZWQgaW5cclxuXHRcdFx0aWYocmVzLnN0YXR1cyA9PSA0MDMpIHtcclxuXHRcdFx0XHRsZXQgZXJyb3IgPSBuZXcgRXJyb3IoXCJOb3QgbG9nZ2VkIGluXCIpO1xyXG5cclxuXHRcdFx0XHQvLyBhZGQgYW4gZXJyb3IgY29kZVxyXG5cdFx0XHRcdGVycm9yLmNvZGUgPSBcIm5vdC1sb2dnZWQtaW5cIjtcclxuXHJcblx0XHRcdFx0dGhyb3cgZXJyb3I7XHJcblx0XHRcdH1cclxuXHJcblx0XHRcdC8vIHNlcnZlci9zZXJ2aWNlIHdvcmtlciBlcnJvclxyXG5cdFx0XHRpZihyZXMuc3RhdHVzID09IDUwMCkge1xyXG5cdFx0XHRcdHJldHVybiByZXMudGV4dCgpXHJcblxyXG5cdFx0XHRcdC50aGVuKG1zZyA9PiB7XHJcblx0XHRcdFx0XHR0aHJvdyBuZXcgRXJyb3IobXNnKTtcclxuXHRcdFx0XHR9KTtcclxuXHRcdFx0fVxyXG5cclxuXHRcdFx0Ly8gcGFyc2UgdGhlIGVycm9yIG1lc3NhZ2VcclxuXHRcdFx0aWYocmVzLnN0YXR1cyAhPSAzMDQpIHtcclxuXHRcdFx0XHRyZXR1cm4gcmVzLmpzb24oKTtcclxuXHRcdFx0fVxyXG5cdFx0fSlcclxuXHJcblx0XHQudGhlbihqc29uID0+IHtcclxuXHRcdFx0Ly8gYW4gZXJyb3Igb2NjdXJlZCBvbiB0aGUgc2VydmVyXHJcblx0XHRcdGlmKGpzb24uc3RhdHVzID09IFwiZXJyb3JcIikge1xyXG5cdFx0XHRcdHRocm93IG5ldyBFcnJvcihqc29uLmRhdGEpO1xyXG5cdFx0XHR9XHJcblxyXG5cdFx0XHRyZXR1cm4ganNvbjtcclxuXHRcdH0pO1xyXG5cdH1cclxuXHJcblx0LyoqXHJcblx0ICogUmVtb3ZlIHRoZSB2YWx1ZSBmcm9tIHRoZSBzdG9yZVxyXG5cdCAqL1xyXG5cdHJlbW92ZShrZXkpIHtcclxuXHRcdHZhciBmZXRjaE9wdHMgPSB0aGlzLl9jcmVhdGVPcHRzKCk7XHJcblxyXG5cdFx0Ly8gYWRkIHRoZSBoZWFkZXJzIHRvIHRoZSBkZWZhdWx0IGhlYWRlcnNcclxuXHRcdGZldGNoT3B0cy5tZXRob2QgPSBcIkRFTEVURVwiO1xyXG5cclxuXHRcdC8vIHNlbmQgdGhlIGl0ZW1cclxuXHRcdHJldHVybiBmZXRjaCh0aGlzLl9vcHRzLnNyYyArIFwidmFsdWUvXCIgKyBrZXksIGZldGNoT3B0cylcclxuXHJcblx0XHQudGhlbihyZXMgPT4ge1xyXG5cdFx0XHQvLyBub3QgbG9nZ2VkIGluXHJcblx0XHRcdGlmKHJlcy5zdGF0dXMgPT0gNDAzKSB7XHJcblx0XHRcdFx0bGV0IGVycm9yID0gbmV3IEVycm9yKFwiTm90IGxvZ2dlZCBpblwiKTtcclxuXHJcblx0XHRcdFx0Ly8gYWRkIGFuIGVycm9yIGNvZGVcclxuXHRcdFx0XHRlcnJvci5jb2RlID0gXCJub3QtbG9nZ2VkLWluXCI7XHJcblxyXG5cdFx0XHRcdHRocm93IGVycm9yO1xyXG5cdFx0XHR9XHJcblxyXG5cdFx0XHQvLyBzZXJ2ZXIvc2VydmljZSB3b3JrZXIgZXJyb3JcclxuXHRcdFx0aWYocmVzLnN0YXR1cyA9PSA1MDApIHtcclxuXHRcdFx0XHRyZXR1cm4gcmVzLnRleHQoKVxyXG5cclxuXHRcdFx0XHQudGhlbihtc2cgPT4ge1xyXG5cdFx0XHRcdFx0dGhyb3cgbmV3IEVycm9yKG1zZyk7XHJcblx0XHRcdFx0fSk7XHJcblx0XHRcdH1cclxuXHJcblx0XHRcdC8vIHBhcnNlIHRoZSBlcnJvciBtZXNzYWdlXHJcblx0XHRcdGlmKHJlcy5zdGF0dXMgIT0gMzA0KSB7XHJcblx0XHRcdFx0cmV0dXJuIHJlcy5qc29uKCk7XHJcblx0XHRcdH1cclxuXHRcdH0pXHJcblxyXG5cdFx0LnRoZW4oanNvbiA9PiB7XHJcblx0XHRcdC8vIGFuIGVycm9yIG9jY3VyZWQgb24gdGhlIHNlcnZlclxyXG5cdFx0XHRpZihqc29uLnN0YXR1cyA9PSBcImVycm9yXCIpIHtcclxuXHRcdFx0XHR0aHJvdyBuZXcgRXJyb3IoanNvbi5kYXRhKTtcclxuXHRcdFx0fVxyXG5cclxuXHRcdFx0cmV0dXJuIGpzb247XHJcblx0XHR9KTtcclxuXHR9XHJcblxyXG5cdC8vIGNoZWNrIG91ciBhY2Nlc3MgbGV2ZWxcclxuXHRhY2Nlc3NMZXZlbCgpIHtcclxuXHRcdHJldHVybiBmZXRjaCh0aGlzLl9vcHRzLnNyYyArIFwiYWNjZXNzXCIsIHRoaXMuX2NyZWF0ZU9wdHMoKSlcclxuXHRcdFx0Ly8gdGhlIHJlc3BvbnNlIGlzIGp1c3QgYSBzdHJpbmdcclxuXHRcdFx0LnRoZW4ocmVzID0+IHJlcy50ZXh0KCkpO1xyXG5cdH1cclxufVxyXG5cclxubW9kdWxlLmV4cG9ydHMgPSBIdHRwQWRhcHRvcjtcclxuIiwiLyoqXHJcbiAqIEEgYmFzaWMga2V5IHZhbHVlIGRhdGEgc3RvcmVcclxuICovXHJcblxyXG52YXIgRXZlbnRFbWl0dGVyID0gcmVxdWlyZShcIi4uL3V0aWwvZXZlbnQtZW1pdHRlclwiKTtcclxuXHJcbmNsYXNzIEtleVZhbHVlU3RvcmUgZXh0ZW5kcyBFdmVudEVtaXR0ZXIge1xyXG5cdGNvbnN0cnVjdG9yKGFkYXB0b3IpIHtcclxuXHRcdHN1cGVyKCk7XHJcblx0XHR0aGlzLl9hZGFwdG9yID0gYWRhcHRvcjtcclxuXHJcblx0XHQvLyBtYWtlIHN1cmUgd2UgaGF2ZSBhbiBhZGFwdG9yXHJcblx0XHRpZighYWRhcHRvcikge1xyXG5cdFx0XHR0aHJvdyBuZXcgRXJyb3IoXCJLZXlWYWx1ZVN0b3JlIG11c3QgYmUgaW5pdGlhbGl6ZWQgd2l0aCBhbiBhZGFwdG9yXCIpXHJcblx0XHR9XHJcblx0fVxyXG5cclxuXHQvKipcclxuXHQgKiBHZXQgdGhlIGNvcnJpc3BvbmRpbmcgdmFsdWUgb3V0IG9mIHRoZSBkYXRhIHN0b3JlIG90aGVyd2lzZSByZXR1cm4gZGVmYXVsdFxyXG5cdCAqL1xyXG5cdGdldChrZXksIF9kZWZhdWx0KSB7XHJcblx0XHQvLyBjaGVjayBpZiB0aGlzIHZhbHVlIGhhcyBiZWVuIG92ZXJyaWRlblxyXG5cdFx0aWYodGhpcy5fb3ZlcnJpZGVzICYmIHRoaXMuX292ZXJyaWRlcy5oYXNPd25Qcm9wZXJ0eShrZXkpKSB7XHJcblx0XHRcdHJldHVybiBQcm9taXNlLnJlc29sdmUodGhpcy5fb3ZlcnJpZGVzW2tleV0pO1xyXG5cdFx0fVxyXG5cclxuXHRcdHJldHVybiB0aGlzLl9hZGFwdG9yLmdldChrZXkpXHJcblxyXG5cdFx0LnRoZW4ocmVzdWx0ID0+IHtcclxuXHRcdFx0Ly8gdGhlIGl0ZW0gaXMgbm90IGRlZmluZWRcclxuXHRcdFx0aWYoIXJlc3VsdCkge1xyXG5cdFx0XHRcdHJldHVybiBfZGVmYXVsdDtcclxuXHRcdFx0fVxyXG5cclxuXHRcdFx0cmV0dXJuIHJlc3VsdC52YWx1ZTtcclxuXHRcdH0pO1xyXG5cdH1cclxuXHJcblx0LyoqXHJcblx0ICogU2V0IGEgc2luZ2xlIHZhbHVlIG9yIHNldmVyYWwgdmFsdWVzXHJcblx0ICpcclxuXHQgKiBrZXkgLT4gdmFsdWVcclxuXHQgKiBvclxyXG5cdCAqIHsga2V5OiB2YWx1ZSB9XHJcblx0ICovXHJcblx0c2V0KGtleSwgdmFsdWUpIHtcclxuXHRcdC8vIHNldCBhIHNpbmdsZSB2YWx1ZVxyXG5cdFx0aWYodHlwZW9mIGtleSA9PSBcInN0cmluZ1wiKSB7XHJcblx0XHRcdHZhciBwcm9taXNlID0gdGhpcy5fYWRhcHRvci5zZXQoe1xyXG5cdFx0XHRcdGlkOiBrZXksXHJcblx0XHRcdFx0dmFsdWUsXHJcblx0XHRcdFx0bW9kaWZpZWQ6IERhdGUubm93KClcclxuXHRcdFx0fSk7XHJcblxyXG5cdFx0XHQvLyB0cmlnZ2VyIHRoZSBjaGFuZ2VcclxuXHRcdFx0dGhpcy5lbWl0KGtleSwgdmFsdWUpO1xyXG5cclxuXHRcdFx0cmV0dXJuIHByb21pc2U7XHJcblx0XHR9XHJcblx0XHQvLyBzZXQgc2V2ZXJhbCB2YWx1ZXNcclxuXHRcdGVsc2Uge1xyXG5cdFx0XHQvLyB0ZWxsIHRoZSBjYWxsZXIgd2hlbiB3ZSBhcmUgZG9uZVxyXG5cdFx0XHRsZXQgcHJvbWlzZXMgPSBbXTtcclxuXHJcblx0XHRcdGZvcihsZXQgX2tleSBvZiBPYmplY3QuZ2V0T3duUHJvcGVydHlOYW1lcyhrZXkpKSB7XHJcblx0XHRcdFx0cHJvbWlzZXMucHVzaChcclxuXHRcdFx0XHRcdHRoaXMuX2FkYXB0b3Iuc2V0KHtcclxuXHRcdFx0XHRcdFx0aWQ6IF9rZXksXHJcblx0XHRcdFx0XHRcdHZhbHVlOiBrZXlbX2tleV0sXHJcblx0XHRcdFx0XHRcdG1vZGlmaWVkOiBEYXRlLm5vdygpXHJcblx0XHRcdFx0XHR9KVxyXG5cdFx0XHRcdCk7XHJcblxyXG5cdFx0XHRcdC8vIHRyaWdnZXIgdGhlIGNoYW5nZVxyXG5cdFx0XHRcdHRoaXMuZW1pdChfa2V5LCBrZXlbX2tleV0pO1xyXG5cdFx0XHR9XHJcblxyXG5cdFx0XHRyZXR1cm4gUHJvbWlzZS5hbGwocHJvbWlzZXMpO1xyXG5cdFx0fVxyXG5cdH1cclxuXHJcblx0IC8qKlxyXG5cdCAgKiBXYXRjaCB0aGUgdmFsdWUgZm9yIGNoYW5nZXNcclxuXHQgICpcclxuXHQgICogb3B0cy5jdXJyZW50IC0gc2VuZCB0aGUgY3VycmVudCB2YWx1ZSBvZiBrZXkgKGRlZmF1bHQ6IGZhbHNlKVxyXG5cdCAgKiBvcHRzLmRlZmF1bHQgLSB0aGUgZGVmYXVsdCB2YWx1ZSB0byBzZW5kIGZvciBvcHRzLmN1cnJlbnRcclxuXHQgICovXHJcblx0IHdhdGNoKGtleSwgb3B0cywgZm4pIHtcclxuXHRcdCAvLyBtYWtlIG9wdHMgb3B0aW9uYWxcclxuXHRcdCBpZih0eXBlb2Ygb3B0cyA9PSBcImZ1bmN0aW9uXCIpIHtcclxuXHRcdFx0IGZuID0gb3B0cztcclxuXHRcdFx0IG9wdHMgPSB7fTtcclxuXHRcdCB9XHJcblxyXG5cdFx0IC8vIGlmIGEgY2hhbmdlIGlzIHRyaWdnZXJlZCBiZWZvcmUgZ2V0IGNvbWVzIGJhY2sgZG9uJ3QgZW1pdCB0aGUgdmFsdWUgZnJvbSBnZXRcclxuXHRcdCB2YXIgY2hhbmdlUmVjaWV2ZWQgPSBmYWxzZTtcclxuXHJcblx0XHQgLy8gc2VuZCB0aGUgY3VycmVudCB2YWx1ZVxyXG5cdFx0IGlmKG9wdHMuY3VycmVudCkge1xyXG5cdFx0XHQgdGhpcy5nZXQoa2V5LCBvcHRzLmRlZmF1bHQpXHJcblxyXG5cdFx0IFx0LnRoZW4odmFsdWUgPT4ge1xyXG5cdFx0XHRcdGlmKCFjaGFuZ2VSZWNpZXZlZCkge1xyXG5cdFx0XHRcdFx0Zm4odmFsdWUpO1xyXG5cdFx0XHRcdH1cclxuXHRcdFx0fSk7XHJcblx0XHQgfVxyXG5cclxuXHRcdCAvLyBsaXN0ZW4gZm9yIGFueSBjaGFuZ2VzXHJcblx0XHQgcmV0dXJuIHRoaXMub24oa2V5LCB2YWx1ZSA9PiB7XHJcblx0XHRcdCAvLyBvbmx5IGVtaXQgdGhlIGNoYW5nZSBpZiB0aGVyZSBpcyBub3QgYW4gb3ZlcnJpZGUgaW4gcGxhY2VcclxuXHRcdFx0IGlmKCF0aGlzLl9vdmVycmlkZXMgfHwgIXRoaXMuX292ZXJyaWRlcy5oYXNPd25Qcm9wZXJ0eShrZXkpKSB7XHJcblx0XHRcdFx0IGZuKHZhbHVlKTtcclxuXHRcdFx0IH1cclxuXHJcblx0XHRcdCBjaGFuZ2VSZWNpZXZlZCA9IHRydWU7XHJcblx0XHQgfSk7XHJcblx0IH1cclxuXHJcblx0IC8qKlxyXG5cdCAgKiBPdmVycmlkZSB0aGUgdmFsdWVzIGZyb20gdGhlIGFkYXB0b3Igd2l0aG91dCB3cml0aW5nIHRvIHRoZW1cclxuXHQgICpcclxuXHQgICogVXNlZnVsIGZvciBjb21iaW5pbmcganNvbiBzZXR0aW5ncyB3aXRoIGNvbW1hbmQgbGluZSBmbGFnc1xyXG5cdCAgKi9cclxuXHQgc2V0T3ZlcnJpZGVzKG92ZXJyaWRlcykge1xyXG5cdFx0IC8vIGVtaXQgY2hhbmdlcyBmb3IgZWFjaCBvZiB0aGUgb3ZlcnJpZGVzXHJcblx0XHQgT2JqZWN0LmdldE93blByb3BlcnR5TmFtZXMob3ZlcnJpZGVzKVxyXG5cclxuXHRcdCAuZm9yRWFjaChrZXkgPT4gdGhpcy5lbWl0KGtleSwgb3ZlcnJpZGVzW2tleV0pKTtcclxuXHJcblx0XHQgLy8gc2V0IHRoZSBvdmVycmlkZXMgYWZ0ZXIgc28gdGhlIGVtaXQgaXMgbm90IGJsb2NrZWRcclxuXHRcdCB0aGlzLl9vdmVycmlkZXMgPSBvdmVycmlkZXM7XHJcblx0IH1cclxufVxyXG5cclxubW9kdWxlLmV4cG9ydHMgPSBLZXlWYWx1ZVN0b3JlO1xyXG4iLCIvKipcclxuICogQSBkYXRhIHN0b3JlIHdoaWNoIGNvbnRhaW5zIGEgcG9vbCBvZiBvYmplY3RzIHdoaWNoIGFyZSBxdWVyeWFibGUgYnkgYW55IHByb3BlcnR5XHJcbiAqL1xyXG5cclxudmFyIEV2ZW50RW1pdHRlciA9IHJlcXVpcmUoXCIuLi91dGlsL2V2ZW50LWVtaXR0ZXJcIik7XHJcblxyXG5jbGFzcyBQb29sU3RvcmUgZXh0ZW5kcyBFdmVudEVtaXR0ZXIge1xyXG5cdGNvbnN0cnVjdG9yKGFkYXB0b3IsIGluaXRGbikge1xyXG5cdFx0c3VwZXIoKTtcclxuXHRcdHRoaXMuX2FkYXB0b3IgPSBhZGFwdG9yO1xyXG5cdFx0dGhpcy5faW5pdEZuID0gaW5pdEZuO1xyXG5cdH1cclxuXHJcblx0LyoqXHJcblx0ICogR2V0IGFsbCBpdGVtcyBtYXRjaW5nIHRoZSBwcm92aWRlZCBwcm9wZXJ0aWVzXHJcblx0ICovXHJcblx0cXVlcnkocHJvcHMsIGZuKSB7XHJcblx0XHQvLyBjaGVjayBpZiBhIHZhbHVlIG1hdGNoZXMgdGhlIHF1ZXJ5XHJcblx0XHR2YXIgZmlsdGVyID0gdmFsdWUgPT4ge1xyXG5cdFx0XHQvLyBub3QgYW4gaXRlbVxyXG5cdFx0XHRpZighdmFsdWUpIHJldHVybiBmYWxzZTtcclxuXHJcblx0XHRcdC8vIGNoZWNrIHRoYXQgYWxsIHRoZSBwcm9wZXJ0aWVzIG1hdGNoXHJcblx0XHRcdHJldHVybiBPYmplY3QuZ2V0T3duUHJvcGVydHlOYW1lcyhwcm9wcylcclxuXHJcblx0XHRcdC5ldmVyeShwcm9wTmFtZSA9PiB7XHJcblx0XHRcdFx0Ly8gYSBmdW5jdGlvbiB0byBjaGVjayBpZiBhIHZhbHVlIG1hdGNoZXNcclxuXHRcdFx0XHRpZih0eXBlb2YgcHJvcHNbcHJvcE5hbWVdID09IFwiZnVuY3Rpb25cIikge1xyXG5cdFx0XHRcdFx0cmV0dXJuIHByb3BzW3Byb3BOYW1lXSh2YWx1ZVtwcm9wTmFtZV0pO1xyXG5cdFx0XHRcdH1cclxuXHRcdFx0XHQvLyBwbGFpbiBlcXVhbGl0eVxyXG5cdFx0XHRcdGVsc2Uge1xyXG5cdFx0XHRcdFx0cmV0dXJuIHByb3BzW3Byb3BOYW1lXSA9PSB2YWx1ZVtwcm9wTmFtZV1cclxuXHRcdFx0XHR9XHJcblx0XHRcdH0pO1xyXG5cdFx0fTtcclxuXHJcblx0XHQvLyBnZXQgYWxsIGN1cnJlbnQgaXRlbXMgdGhhdCBtYXRjaCB0aGUgZmlsdGVyXHJcblx0XHR2YXIgY3VycmVudCA9IChcImlkXCIgaW4gcHJvcHMpID9cclxuXHRcdFx0dGhpcy5fYWRhcHRvci5nZXQocHJvcHMuaWQpLnRoZW4odmFsdWUgPT4gW3ZhbHVlXSk6XHJcblx0XHRcdHRoaXMuX2FkYXB0b3IuZ2V0QWxsKCk7XHJcblxyXG5cdFx0Y3VycmVudCA9IGN1cnJlbnQudGhlbih2YWx1ZXMgPT4ge1xyXG5cdFx0XHQvLyBmaWx0ZXIgb3V0IHRoZSB2YWx1ZXNcclxuXHRcdFx0dmFsdWVzID0gdmFsdWVzLmZpbHRlcihmaWx0ZXIpO1xyXG5cclxuXHRcdFx0Ly8gZG8gYW55IGluaXRpYWxpemF0aW9uXHJcblx0XHRcdGlmKHRoaXMuX2luaXRGbikge1xyXG5cdFx0XHRcdHZhbHVlcyA9IHZhbHVlcy5tYXAodmFsdWUgPT4gdGhpcy5faW5pdEZuKHZhbHVlKSB8fCB2YWx1ZSk7XHJcblx0XHRcdH1cclxuXHJcblx0XHRcdHJldHVybiB2YWx1ZXM7XHJcblx0XHR9KTtcclxuXHJcblx0XHQvLyBvcHRpb25hbHkgcnVuIGNoYW5nZXMgdGhyb3VnaCB0aGUgcXVlcnkgYXMgd2VsbFxyXG5cdFx0aWYodHlwZW9mIGZuID09IFwiZnVuY3Rpb25cIikge1xyXG5cdFx0XHRsZXQgc3Vic2NyaXB0aW9uLCBzdG9wcGVkO1xyXG5cclxuXHRcdFx0Ly8gd3JhcCB0aGUgdmFsdWVzIGluIGNoYW5nZSBvYmplY3RzIGFuZCBzZW5kIHRoZSB0byB0aGUgY29uc3VtZXJcclxuXHRcdFx0Y3VycmVudC50aGVuKHZhbHVlcyA9PiB7XHJcblx0XHRcdFx0Ly8gZG9uJ3QgbGlzdGVuIGlmIHVuc3Vic2NyaWJlIHdhcyBhbHJlYWR5IGNhbGxlZFxyXG5cdFx0XHRcdGlmKHN0b3BwZWQpIHJldHVybjtcclxuXHJcblx0XHRcdFx0Ly8gc2VuZCB0aGUgdmFsdWVzIHdlIGN1cnJlbnRseSBoYXZlXHJcblx0XHRcdFx0Zm4odmFsdWVzLnNsaWNlKDApKTtcclxuXHJcblx0XHRcdFx0Ly8gd2F0Y2ggZm9yIGNoYW5nZXMgYWZ0ZXIgdGhlIGluaXRpYWwgdmFsdWVzIGFyZSBzZW5kXHJcblx0XHRcdFx0c3Vic2NyaXB0aW9uID0gdGhpcy5vbihcImNoYW5nZVwiLCBjaGFuZ2UgPT4ge1xyXG5cdFx0XHRcdFx0Ly8gZmluZCB0aGUgcHJldmlvdXMgdmFsdWVcclxuXHRcdFx0XHRcdHZhciBpbmRleCA9IHZhbHVlcy5maW5kSW5kZXgodmFsdWUgPT4gdmFsdWUuaWQgPT0gY2hhbmdlLmlkKTtcclxuXHJcblx0XHRcdFx0XHRpZihjaGFuZ2UudHlwZSA9PSBcImNoYW5nZVwiKSB7XHJcblx0XHRcdFx0XHRcdC8vIGNoZWNrIGlmIHRoZSB2YWx1ZSBtYXRjaGVzIHRoZSBxdWVyeVxyXG5cdFx0XHRcdFx0XHRsZXQgbWF0Y2hlcyA9IGZpbHRlcihjaGFuZ2UudmFsdWUpO1xyXG5cclxuXHRcdFx0XHRcdFx0aWYobWF0Y2hlcykge1xyXG5cdFx0XHRcdFx0XHRcdC8vIGZyZXNobHkgY3JlYXRlZFxyXG5cdFx0XHRcdFx0XHRcdGlmKGluZGV4ID09PSAtMSkge1xyXG5cdFx0XHRcdFx0XHRcdFx0bGV0IHt2YWx1ZX0gPSBjaGFuZ2U7XHJcblxyXG5cdFx0XHRcdFx0XHRcdFx0Ly8gZG8gYW55IGluaXRpYWxpemF0aW9uXHJcblx0XHRcdFx0XHRcdFx0XHRpZih0aGlzLl9pbml0Rm4pIHtcclxuXHRcdFx0XHRcdFx0XHRcdFx0dmFsdWUgPSB0aGlzLl9pbml0Rm4odmFsdWUpIHx8IHZhbHVlO1xyXG5cdFx0XHRcdFx0XHRcdFx0fVxyXG5cclxuXHRcdFx0XHRcdFx0XHRcdHZhbHVlcy5wdXNoKHZhbHVlKTtcclxuXHRcdFx0XHRcdFx0XHR9XHJcblx0XHRcdFx0XHRcdFx0Ly8gdXBkYXRlIGFuIGV4aXN0aW5nIHZhbHVlXHJcblx0XHRcdFx0XHRcdFx0ZWxzZSB7XHJcblx0XHRcdFx0XHRcdFx0XHR2YWx1ZXNbaW5kZXhdID0gY2hhbmdlLnZhbHVlO1xyXG5cdFx0XHRcdFx0XHRcdH1cclxuXHJcblx0XHRcdFx0XHRcdFx0Zm4odmFsdWVzLnNsaWNlKDApKTtcclxuXHRcdFx0XHRcdFx0fVxyXG5cdFx0XHRcdFx0XHQvLyB0ZWxsIHRoZSBjb25zdW1lciB0aGlzIHZhbHVlIG5vIGxvbmdlciBtYXRjaGVzXHJcblx0XHRcdFx0XHRcdGVsc2UgaWYoaW5kZXggIT09IC0xKSB7XHJcblx0XHRcdFx0XHRcdFx0Ly8gcmVtb3ZlIHRoZSBpdGVtXHJcblx0XHRcdFx0XHRcdFx0aWYoaW5kZXggIT09IC0xKSB7XHJcblx0XHRcdFx0XHRcdFx0XHR2YWx1ZXMuc3BsaWNlKGluZGV4LCAxKTtcclxuXHRcdFx0XHRcdFx0XHR9XHJcblxyXG5cdFx0XHRcdFx0XHRcdGZuKHZhbHVlcy5zbGljZSgwKSk7XHJcblx0XHRcdFx0XHRcdH1cclxuXHRcdFx0XHRcdH1cclxuXHRcdFx0XHRcdGVsc2UgaWYoY2hhbmdlLnR5cGUgPT0gXCJyZW1vdmVcIiAmJiBpbmRleCAhPT0gLTEpIHtcclxuXHRcdFx0XHRcdFx0Ly8gcmVtb3ZlIHRoZSBpdGVtXHJcblx0XHRcdFx0XHRcdGlmKGluZGV4ICE9PSAtMSkge1xyXG5cdFx0XHRcdFx0XHRcdHZhbHVlcy5zcGxpY2UoaW5kZXgsIDEpO1xyXG5cdFx0XHRcdFx0XHR9XHJcblxyXG5cdFx0XHRcdFx0XHRmbih2YWx1ZXMuc2xpY2UoMCkpO1xyXG5cdFx0XHRcdFx0fVxyXG5cdFx0XHRcdH0pO1xyXG5cdFx0XHR9KTtcclxuXHJcblx0XHRcdHJldHVybiB7XHJcblx0XHRcdFx0dW5zdWJzY3JpYmUoKSB7XHJcblx0XHRcdFx0XHQvLyBpZiB3ZSBhcmUgbGlzdGVuaW5nIHN0b3BcclxuXHRcdFx0XHRcdGlmKHN1YnNjcmlwdGlvbikge1xyXG5cdFx0XHRcdFx0XHRzdWJzY3JpcHRpb24udW5zdWJzY3JpYmUoKVxyXG5cdFx0XHRcdFx0fVxyXG5cclxuXHRcdFx0XHRcdC8vIGRvbid0IGxpc3RlblxyXG5cdFx0XHRcdFx0c3RvcHBlZCA9IHRydWU7XHJcblx0XHRcdFx0fVxyXG5cdFx0XHR9XHJcblx0XHR9XHJcblx0XHRlbHNlIHtcclxuXHRcdFx0cmV0dXJuIGN1cnJlbnQ7XHJcblx0XHR9XHJcblx0fVxyXG5cclxuXHQvKipcclxuXHQgKiBTdG9yZSBhIHZhbHVlIGluIHRoZSBwb29sXHJcblx0ICovXHJcblx0c2V0KHZhbHVlKSB7XHJcblx0XHQvLyBzZXQgdGhlIG1vZGlmaWVkIGRhdGVcclxuXHRcdHZhbHVlLm1vZGlmaWVkID0gRGF0ZS5ub3coKTtcclxuXHJcblx0XHQvLyBzdG9yZSB0aGUgdmFsdWUgaW4gdGhlIGFkYXB0b3JcclxuXHRcdHRoaXMuX2FkYXB0b3Iuc2V0KHZhbHVlKTtcclxuXHJcblx0XHQvLyBwcm9wb2dhdGUgdGhlIGNoYW5nZVxyXG5cdFx0dGhpcy5lbWl0KFwiY2hhbmdlXCIsIHtcclxuXHRcdFx0dHlwZTogXCJjaGFuZ2VcIixcclxuXHRcdFx0aWQ6IHZhbHVlLmlkLFxyXG5cdFx0XHR2YWx1ZVxyXG5cdFx0fSk7XHJcblx0fVxyXG5cclxuXHQvKipcclxuXHQgKiBSZW1vdmUgYSB2YWx1ZSBmcm9tIHRoZSBwb29sXHJcblx0ICovXHJcblx0cmVtb3ZlKGlkKSB7XHJcblx0XHQvLyByZW1vdmUgdGhlIHZhbHVlIGZyb20gdGhlIGFkYXB0b3JcclxuXHRcdHRoaXMuX2FkYXB0b3IucmVtb3ZlKGlkLCBEYXRlLm5vdygpKTtcclxuXHJcblx0XHQvLyBwcm9wb2dhdGUgdGhlIGNoYW5nZVxyXG5cdFx0dGhpcy5lbWl0KFwiY2hhbmdlXCIsIHtcclxuXHRcdFx0dHlwZTogXCJyZW1vdmVcIixcclxuXHRcdFx0aWRcclxuXHRcdH0pO1xyXG5cdH1cclxufVxyXG5cclxubW9kdWxlLmV4cG9ydHMgPSBQb29sU3RvcmU7XHJcbiIsIi8qKlxyXG4gKiBBIHdyYXBwZXIgdGhhdCBzeW5jcm9uaXplcyBsb2NhbCBjaGFuZ2VzIHdpdGggYSByZW1vdGUgaG9zdFxyXG4gKi9cclxuXHJcbnZhciBLZXlWYWx1ZVN0b3JlID0gcmVxdWlyZShcIi4va2V5LXZhbHVlLXN0b3JlXCIpO1xyXG52YXIgRXZlbnRFbWl0dGVyID0gcmVxdWlyZShcIi4uL3V0aWwvZXZlbnQtZW1pdHRlclwiKTtcclxuXHJcbmNsYXNzIFN5bmNlciBleHRlbmRzIEV2ZW50RW1pdHRlciB7XHJcblx0Y29uc3RydWN0b3Iob3B0cykge1xyXG5cdFx0c3VwZXIoKTtcclxuXHJcblx0XHR0aGlzLl9sb2NhbCA9IG9wdHMubG9jYWw7XHJcblx0XHR0aGlzLl9yZW1vdGUgPSBvcHRzLnJlbW90ZTtcclxuXHRcdHRoaXMuX2NoYW5nZVN0b3JlID0gbmV3IEtleVZhbHVlU3RvcmUob3B0cy5jaGFuZ2VTdG9yZSk7XHJcblx0XHR0aGlzLl9jaGFuZ2VzTmFtZSA9IG9wdHMuY2hhbmdlc05hbWUgfHwgXCJjaGFuZ2VzXCI7XHJcblxyXG5cdFx0Ly8gc2F2ZSBhbGwgdGhlIGlkcyB0byBvcHRpbWl6ZSBjcmVhdGVzXHJcblx0XHR0aGlzLl9pZHMgPSB0aGlzLmdldEFsbCgpXHJcblx0XHRcdC50aGVuKGFsbCA9PiBhbGwubWFwKHZhbHVlID0+IHZhbHVlLmlkKSk7XHJcblx0fVxyXG5cclxuXHQvLyBwYXNzIHRocm91Z2ggZ2V0IGFuZCBnZXRBbGxcclxuXHRnZXRBbGwoKSB7IHJldHVybiB0aGlzLl9sb2NhbC5nZXRBbGwoKTsgfVxyXG5cdGdldChrZXkpIHsgcmV0dXJuIHRoaXMuX2xvY2FsLmdldChrZXkpOyB9XHJcblxyXG5cdC8vIGtlZXAgdHJhY2sgb2YgYW55IGNyZWF0ZWQgdmFsdWVzXHJcblx0c2V0KHZhbHVlKSB7XHJcblx0XHQvLyBjaGVjayBpZiB0aGlzIGlzIGEgY3JlYXRlXHJcblx0XHR0aGlzLl9pZHMgPSB0aGlzLl9pZHMudGhlbihpZHMgPT4ge1xyXG5cdFx0XHQvLyBuZXcgdmFsdWVcclxuXHRcdFx0aWYoaWRzLmluZGV4T2YodmFsdWUuaWQpID09PSAtMSkge1xyXG5cdFx0XHRcdGlkcy5wdXNoKHZhbHVlLmlkKTtcclxuXHJcblx0XHRcdFx0Ly8gc2F2ZSB0aGUgY2hhbmdlXHJcblx0XHRcdFx0dGhpcy5fY2hhbmdlKFwiY3JlYXRlXCIsIHZhbHVlLmlkKTtcclxuXHRcdFx0fVxyXG5cclxuXHRcdFx0cmV0dXJuIGlkcztcclxuXHRcdH0pO1xyXG5cclxuXHRcdC8vIHN0b3JlIHRoZSB2YWx1ZVxyXG5cdFx0cmV0dXJuIHRoaXMuX2lkcy50aGVuKCgpID0+IHRoaXMuX2xvY2FsLnNldCh2YWx1ZSkpO1xyXG5cdH1cclxuXHJcblx0Ly8ga2VlcCB0cmFjayBvZiBkZWxldGVkIHZhbHVlc1xyXG5cdHJlbW92ZShrZXkpIHtcclxuXHRcdHRoaXMuX2lkcyA9IHRoaXMuX2lkcy50aGVuKGlkcyA9PiB7XHJcblx0XHRcdC8vIHJlbW92ZSB0aGlzIGZyb20gdGhlIGFsbCBpZHMgbGlzdFxyXG5cdFx0XHR2YXIgaW5kZXggPSBpZHMuaW5kZXhPZihrZXkpO1xyXG5cclxuXHRcdFx0aWYoaW5kZXggIT09IC0xKSB7XHJcblx0XHRcdFx0aWRzLnNwbGljZShpbmRleCwgMSk7XHJcblx0XHRcdH1cclxuXHJcblx0XHRcdC8vIHNhdmUgdGhlIGNoYW5nZVxyXG5cdFx0XHR0aGlzLl9jaGFuZ2UoXCJyZW1vdmVcIiwga2V5KTtcclxuXHRcdH0pO1xyXG5cclxuXHRcdC8vIHJlbW92ZSB0aGUgYWN0dWFsIHZhbHVlXHJcblx0XHRyZXR1cm4gdGhpcy5faWRzLnRoZW4oKCkgPT4gdGhpcy5fbG9jYWwucmVtb3ZlKGtleSkpO1xyXG5cdH1cclxuXHJcblx0Ly8gc3RvcmUgYSBjaGFuZ2UgaW4gdGhlIGNoYW5nZSBzdG9yZVxyXG5cdF9jaGFuZ2UodHlwZSwgaWQpIHtcclxuXHRcdC8vIGdldCB0aGUgY2hhbmdlc1xyXG5cdFx0dGhpcy5fY2hhbmdlU3RvcmUuZ2V0KHRoaXMuX2NoYW5nZXNOYW1lLCBbXSlcclxuXHJcblx0XHQudGhlbihjaGFuZ2VzID0+IHtcclxuXHRcdFx0Ly8gYWRkIHRoZSBjaGFuZ2VcclxuXHRcdFx0Y2hhbmdlcy5wdXNoKHsgdHlwZSwgaWQsIHRpbWVzdGFtcDogRGF0ZS5ub3coKSB9KTtcclxuXHJcblx0XHRcdC8vIHNhdmUgdGhlIGNoYW5nZXNcclxuXHRcdFx0cmV0dXJuIHRoaXMuX2NoYW5nZVN0b3JlLnNldCh0aGlzLl9jaGFuZ2VzTmFtZSwgY2hhbmdlcyk7XHJcblx0XHR9KTtcclxuXHR9XHJcblxyXG5cdC8vIHN5bmMgdGhlIHR3byBzdG9yZXNcclxuXHRzeW5jKCkge1xyXG5cdFx0Ly8gb25seSBydW4gb25lIHN5bmMgYXQgYSB0aW1lXHJcblx0XHRpZih0aGlzLl9zeW5jaW5nKSByZXR1cm4gdGhpcy5fc3luY2luZztcclxuXHJcblx0XHR2YXIgcmV0cnlDb3VudCA9IDM7XHJcblx0XHR2YXIgJHN5bmMgPSBuZXcgU3luYyh0aGlzLl9sb2NhbCwgdGhpcy5fcmVtb3RlLCB0aGlzLl9jaGFuZ2VTdG9yZSwgdGhpcy5fY2hhbmdlc05hbWUpO1xyXG5cclxuXHRcdC8vIHBhc3Mgb24gdGhlIHByb2dyZXNzXHJcblx0XHR2YXIgc3ViID0gJHN5bmMub24oXCJwcm9ncmVzc1wiLCB2YWx1ZSA9PiB0aGlzLmVtaXQoXCJwcm9ncmVzc1wiLCB2YWx1ZSkpO1xyXG5cclxuXHRcdHZhciBzeW5jID0gKCkgPT4ge1xyXG5cdFx0XHQvLyB0ZWxsIHRoZSB1aSB3ZSBhcmUgc3luY2luZ1xyXG5cdFx0XHR0aGlzLmVtaXQoXCJzeW5jLXN0YXJ0XCIpO1xyXG5cclxuXHRcdFx0Ly8gYXR0ZW1wdCB0byBzeW5jXHJcblx0XHRcdHJldHVybiAkc3luYy5zeW5jKClcclxuXHJcblx0XHRcdC50aGVuKCgpID0+IHtcclxuXHRcdFx0XHQvLyB0aGUgdGhlIHVpIHRoZSBzeW5jIGhhcyBzdWNjZWVkZWRcclxuXHRcdFx0XHR0aGlzLmVtaXQoXCJzeW5jLWNvbXBsZXRlXCIsIHsgZmFpbGVkOiBmYWxzZSB9KTtcclxuXHRcdFx0fSlcclxuXHJcblx0XHRcdC5jYXRjaChlcnIgPT4ge1xyXG5cdFx0XHRcdHZhciByZXRyeWluZyA9IHJldHJ5Q291bnQtLSA+IDAgJiYgKHR5cGVvZiBuYXZpZ2F0b3IgIT0gXCJvYmplY3RcIiB8fCBuYXZpZ2F0b3Iub25MaW5lKTtcclxuXHJcblx0XHRcdFx0Ly8gdGVsbCB0aGUgdWkgdGhlIHN5bmMgZmFpbGVkXHJcblx0XHRcdFx0dGhpcy5lbWl0KFwic3luYy1jb21wbGV0ZVwiLCB7IHJldHJ5aW5nLCBmYWlsZWQ6IHRydWUgfSk7XHJcblxyXG5cdFx0XHRcdC8vIHJldHJ5IGlmIGl0IGZhaWxzXHJcblx0XHRcdFx0aWYocmV0cnlpbmcpIHtcclxuXHRcdFx0XHRcdHJldHVybiBuZXcgUHJvbWlzZShyZXNvbHZlID0+IHtcclxuXHRcdFx0XHRcdFx0Ly8gd2FpdCAxIHNlY29uZFxyXG5cdFx0XHRcdFx0XHRzZXRUaW1lb3V0KCgpID0+IHJlc29sdmUoc3luYygpKSwgMTAwMCk7XHJcblx0XHRcdFx0XHR9KTtcclxuXHRcdFx0XHR9XHJcblx0XHRcdH0pO1xyXG5cdFx0fTtcclxuXHJcblx0XHQvLyBzdGFydCB0aGUgc3luY1xyXG5cdFx0dGhpcy5fc3luY2luZyA9IHN5bmMoKVxyXG5cclxuXHRcdC8vIHJlbGVhc2UgdGhlIGxvY2tcclxuXHRcdC50aGVuKCgpID0+IHtcclxuXHRcdFx0dGhpcy5fc3luY2luZyA9IHVuZGVmaW5lZDtcclxuXHRcdFx0c3ViLnVuc3Vic2NyaWJlKCk7XHJcblx0XHR9KTtcclxuXHJcblx0XHRyZXR1cm4gdGhpcy5fc3luY2luZztcclxuXHR9XHJcblxyXG5cdC8vIGdldCB0aGUgcmVtb3RlIGFjY2VzcyBsZXZlbFxyXG5cdGFjY2Vzc0xldmVsKCkge1xyXG5cdFx0cmV0dXJuIHRoaXMuX3JlbW90ZS5hY2Nlc3NMZXZlbCgpXHJcblxyXG5cdFx0Ly8gaWYgYW55dGhpbmcgZ29lcyB3cm9uZyBhc3N1bWUgZnVsbCBwZXJtaXNzaW9uc1xyXG5cdFx0LmNhdGNoKCgpID0+IFwiZnVsbFwiKTtcclxuXHR9XHJcbn1cclxuXHJcbi8vIGEgc2luZ2xlIHN5bmNcclxuY2xhc3MgU3luYyBleHRlbmRzIEV2ZW50RW1pdHRlciB7XHJcblx0Y29uc3RydWN0b3IobG9jYWwsIHJlbW90ZSwgY2hhbmdlU3RvcmUsIGNoYW5nZXNOYW1lKSB7XHJcblx0XHRzdXBlcigpO1xyXG5cdFx0dGhpcy5fbG9jYWwgPSBsb2NhbDtcclxuXHRcdHRoaXMuX3JlbW90ZSA9IHJlbW90ZTtcclxuXHRcdHRoaXMuX2NoYW5nZVN0b3JlID0gY2hhbmdlU3RvcmU7XHJcblx0XHR0aGlzLl9jaGFuZ2VzTmFtZSA9IGNoYW5nZXNOYW1lO1xyXG5cdFx0dGhpcy5fcHJvZ3Jlc3MgPSAwO1xyXG5cdH1cclxuXHJcblx0c3RlcFByb2dyZXNzKCkge1xyXG5cdFx0dGhpcy5fcHJvZ3Jlc3MgKz0gMSAvIDc7XHJcblxyXG5cdFx0dGhpcy5lbWl0KFwicHJvZ3Jlc3NcIiwgdGhpcy5fcHJvZ3Jlc3MpO1xyXG5cdH1cclxuXHJcblx0c3luYygpIHtcclxuXHRcdHRoaXMuc3RlcFByb2dyZXNzKCk7XHJcblxyXG5cdFx0Ly8gZ2V0IHRoZSBpZHMgYW5kIGxhc3QgbW9kaWZpZWQgZGF0ZXMgZm9yIGFsbCByZW1vdGUgdmFsdWVzXHJcblx0XHRyZXR1cm4gdGhpcy5nZXRNb2RpZmllZHMoKVxyXG5cclxuXHRcdC50aGVuKG1vZGlmaWVkcyA9PiB7XHJcblx0XHRcdHRoaXMuc3RlcFByb2dyZXNzKCk7XHJcblxyXG5cdFx0XHQvLyByZW1vdmUgdGhlIHZhbHVlcyB3ZSBkZWxldGVkIGZyb20gdGhlIHJlbW90ZSBob3N0XHJcblx0XHRcdHJldHVybiB0aGlzLnJlbW92ZShtb2RpZmllZHMpXHJcblxyXG5cdFx0XHQvLyBtZXJnZSBtb2RpZmllZCB2YWx1ZXNcclxuXHRcdFx0LnRoZW4oKCkgPT4ge1xyXG5cdFx0XHRcdHRoaXMuc3RlcFByb2dyZXNzKCk7XHJcblxyXG5cdFx0XHRcdHJldHVybiB0aGlzLm1lcmdlTW9kaWZpZWRzKG1vZGlmaWVkcyk7XHJcblx0XHRcdH0pO1xyXG5cdFx0fSlcclxuXHJcblx0XHQudGhlbihyZW1vdGVEZWxldGVzID0+IHtcclxuXHRcdFx0dGhpcy5zdGVwUHJvZ3Jlc3MoKTtcclxuXHJcblx0XHRcdC8vIHNlbmQgdmFsdWVzIHdlIGNyZWF0ZWQgc2luY2UgdGhlIGxhc3Qgc3luY1xyXG5cdFx0XHRyZXR1cm4gdGhpcy5jcmVhdGUocmVtb3RlRGVsZXRlcylcclxuXHJcblx0XHRcdC8vIHJlbW92ZSBhbnkgaXRlbXMgdGhhdCB3aGVyZSBkZWxldGVkIHJlbW90bHlcclxuXHRcdFx0LnRoZW4oKCkgPT4ge1xyXG5cdFx0XHRcdHRoaXMuc3RlcFByb2dyZXNzKCk7XHJcblxyXG5cdFx0XHRcdHJldHVybiB0aGlzLmFwcGx5RGVsZXRlcyhyZW1vdGVEZWxldGVzKTtcclxuXHRcdFx0fSk7XHJcblx0XHR9KVxyXG5cclxuXHRcdC8vIGNsZWFyIHRoZSBjaGFuZ2VzXHJcblx0XHQudGhlbigoKSA9PiB7XHJcblx0XHRcdHRoaXMuc3RlcFByb2dyZXNzKCk7XHJcblxyXG5cdFx0XHRyZXR1cm4gdGhpcy5fY2hhbmdlU3RvcmUuc2V0KHRoaXMuX2NoYW5nZXNOYW1lLCBbXSk7XHJcblx0XHR9KVxyXG5cclxuXHRcdC50aGVuKCgpID0+IHtcclxuXHRcdFx0dGhpcy5zdGVwUHJvZ3Jlc3MoKTtcclxuXHRcdH0pO1xyXG5cdH1cclxuXHJcblx0Ly8gZ2V0IHRoZSBsYXN0IG1vZGlmaWVkIHRpbWVzIGZvciBlYWNoIHZhbHVlXHJcblx0Z2V0TW9kaWZpZWRzKCkge1xyXG5cdFx0dGhpcy5faXRlbXMgPSB7fTtcclxuXHJcblx0XHRyZXR1cm4gdGhpcy5fcmVtb3RlLmdldEFsbCgpXHJcblxyXG5cdFx0LnRoZW4odmFsdWVzID0+IHtcclxuXHRcdFx0dmFyIG1vZGlmaWVkcyA9IHt9O1xyXG5cclxuXHRcdFx0Zm9yKGxldCB2YWx1ZSBvZiB2YWx1ZXMpIHtcclxuXHRcdFx0XHQvLyBzdG9yZSB0aGUgaXRlbXNcclxuXHRcdFx0XHR0aGlzLl9pdGVtc1t2YWx1ZS5pZF0gPSB2YWx1ZTtcclxuXHRcdFx0XHQvLyBnZXQgdGhlIG1vZGlmaWVkIHRpbWVzXHJcblx0XHRcdFx0bW9kaWZpZWRzW3ZhbHVlLmlkXSA9IHZhbHVlLm1vZGlmaWVkO1xyXG5cdFx0XHR9XHJcblxyXG5cdFx0XHRyZXR1cm4gbW9kaWZpZWRzO1xyXG5cdFx0fSk7XHJcblx0fVxyXG5cclxuXHQvLyByZW1vdmUgdmFsdWVzIHdlIGhhdmUgZGVsZXRlZCBzaW5jZSB0aGUgbGFzdCBzeW5jXHJcblx0cmVtb3ZlKG1vZGlmaWVkcykge1xyXG5cdFx0cmV0dXJuIHRoaXMuX2NoYW5nZVN0b3JlLmdldCh0aGlzLl9jaGFuZ2VzTmFtZSwgW10pXHJcblxyXG5cdFx0LnRoZW4oY2hhbmdlcyA9PiB7XHJcblx0XHRcdHZhciBwcm9taXNlcyA9IFtdO1xyXG5cclxuXHRcdFx0Ly8gcmVtb3ZlIHRoZSBpdGVtcyB3ZSByZW1vdmUgZnJvbSBtb2RpZmllZHNcclxuXHRcdFx0Zm9yKGxldCBjaGFuZ2Ugb2YgY2hhbmdlcykge1xyXG5cdFx0XHRcdGlmKGNoYW5nZS50eXBlID09IFwicmVtb3ZlXCIgJiYgY2hhbmdlLnRpbWVzdGFtcCA+PSBtb2RpZmllZHNbY2hhbmdlLmlkXSkge1xyXG5cdFx0XHRcdFx0Ly8gZG9uJ3QgdHJ5IHRvIGNyZWF0ZSB0aGUgaXRlbSBsb2NhbGx5XHJcblx0XHRcdFx0XHRkZWxldGUgbW9kaWZpZWRzW2NoYW5nZS5pZF07XHJcblxyXG5cdFx0XHRcdFx0Ly8gZGVsZXRlIGl0IHJlbW90ZWx5XHJcblx0XHRcdFx0XHRwcm9taXNlcy5wdXNoKHRoaXMuX3JlbW90ZS5yZW1vdmUoY2hhbmdlLmlkKSlcclxuXHRcdFx0XHR9XHJcblx0XHRcdH1cclxuXHJcblx0XHRcdHJldHVybiBQcm9taXNlLmFsbChwcm9taXNlcyk7XHJcblx0XHR9KTtcclxuXHR9XHJcblxyXG5cdC8vIHVwZGF0ZSB0aGUgbG9jYWwvcmVtb3RlIHZhbHVlcyB0aGF0IHdoZXJlIGNoYW5nZWRcclxuXHRtZXJnZU1vZGlmaWVkcyhtb2RpZmllZHMpIHtcclxuXHRcdHZhciByZW1vdGVEZWxldGVzID0gW107XHJcblxyXG5cdFx0Ly8gZ28gdGhyb3VnaCBhbGwgdGhlIG1vZGlmaWVkc1xyXG5cdFx0cmV0dXJuIHRoaXMuX2xvY2FsLmdldEFsbCgpXHJcblxyXG5cdFx0LnRoZW4odmFsdWVzID0+IHtcclxuXHRcdFx0dmFyIHByb21pc2VzID0gW107XHJcblxyXG5cdFx0XHQvLyBjaGVjayBhbGwgdGhlIGxvY2FsIHZhbHVlcyBhZ2FpbnN0IHRoZSByZW1vdGUgb25lc1xyXG5cdFx0XHRmb3IobGV0IHZhbHVlIG9mIHZhbHVlcykge1xyXG5cdFx0XHRcdC8vIGRlbGV0ZWQgZnJvbSB0aGUgcmVtb3RlIGFkYXB0b3JcclxuXHRcdFx0XHRpZighbW9kaWZpZWRzW3ZhbHVlLmlkXSkge1xyXG5cdFx0XHRcdFx0cmVtb3RlRGVsZXRlcy5wdXNoKHZhbHVlLmlkKTtcclxuXHRcdFx0XHR9XHJcblx0XHRcdFx0Ly8gdGhlIHJlbW90ZSB2ZXJzaW9uIGlzIG5ld2VyXHJcblx0XHRcdFx0ZWxzZSBpZihtb2RpZmllZHNbdmFsdWUuaWRdID4gdmFsdWUubW9kaWZpZWQpIHtcclxuXHRcdFx0XHRcdHByb21pc2VzLnB1c2goXHJcblx0XHRcdFx0XHRcdC8vIGZldGNoIHRoZSByZW1vdGUgdmFsdWVcclxuXHRcdFx0XHRcdFx0dGhpcy5nZXQodmFsdWUuaWQpXHJcblxyXG5cdFx0XHRcdFx0XHQudGhlbihuZXdWYWx1ZSA9PiB0aGlzLl9sb2NhbC5zZXQobmV3VmFsdWUpKVxyXG5cdFx0XHRcdFx0KTtcclxuXHRcdFx0XHR9XHJcblx0XHRcdFx0Ly8gdGhlIGxvY2FsIHZlcnNpb24gaXMgbmV3ZXJcclxuXHRcdFx0XHRlbHNlIGlmKG1vZGlmaWVkc1t2YWx1ZS5pZF0gPCB2YWx1ZS5tb2RpZmllZCkge1xyXG5cdFx0XHRcdFx0cHJvbWlzZXMucHVzaCh0aGlzLl9yZW1vdGUuc2V0KHZhbHVlKSk7XHJcblx0XHRcdFx0fVxyXG5cclxuXHRcdFx0XHQvLyByZW1vdmUgaXRlbXMgd2UgYWxyZWFkeSBoYXZlIGZyb20gdGhlIGNyZWF0ZXNcclxuXHRcdFx0XHRpZihtb2RpZmllZHNbdmFsdWUuaWRdKSB7XHJcblx0XHRcdFx0XHRkZWxldGUgbW9kaWZpZWRzW3ZhbHVlLmlkXTtcclxuXHRcdFx0XHR9XHJcblx0XHRcdH1cclxuXHJcblx0XHRcdC8vIGdldCB2YWx1ZXMgZnJvbSB0aGUgcmVtb3RlIHdlIGFyZSBtaXNzaW5nXHJcblx0XHRcdGZvcihsZXQgaWQgb2YgT2JqZWN0LmdldE93blByb3BlcnR5TmFtZXMobW9kaWZpZWRzKSkge1xyXG5cdFx0XHRcdHByb21pc2VzLnB1c2goXHJcblx0XHRcdFx0XHR0aGlzLmdldChpZClcclxuXHJcblx0XHRcdFx0XHQudGhlbihuZXdWYWx1ZSA9PiB0aGlzLl9sb2NhbC5zZXQobmV3VmFsdWUpKVxyXG5cdFx0XHRcdCk7XHJcblx0XHRcdH1cclxuXHJcblx0XHRcdHJldHVybiBQcm9taXNlLmFsbChwcm9taXNlcyk7XHJcblx0XHR9KVxyXG5cclxuXHRcdC8vIHJldHVybiB0aGUgZGVsZXRlc1xyXG5cdFx0LnRoZW4oKCkgPT4gcmVtb3RlRGVsZXRlcyk7XHJcblx0fVxyXG5cclxuXHQvLyBnZXQgYSByZW1vdGUgdmFsdWVcclxuXHRnZXQoaWQpIHtcclxuXHRcdHJldHVybiBQcm9taXNlLnJlc29sdmUodGhpcy5faXRlbXNbaWRdKTtcclxuXHR9XHJcblxyXG5cdC8vIHNlbmQgY3JlYXRlZCB2YWx1ZXMgdG8gdGhlIHNlcnZlclxyXG5cdGNyZWF0ZShyZW1vdGVEZWxldGVzKSB7XHJcblx0XHRyZXR1cm4gdGhpcy5fY2hhbmdlU3RvcmUuZ2V0KHRoaXMuX2NoYW5nZXNOYW1lKVxyXG5cclxuXHRcdC50aGVuKChjaGFuZ2VzID0gW10pID0+IHtcclxuXHRcdFx0dmFyIHByb21pc2VzID0gW107XHJcblxyXG5cdFx0XHQvLyByZW1vdmUgdGhlIGl0ZW1zIHdlIHJlbW92ZSBmcm9tIG1vZGlmaWVkc1xyXG5cdFx0XHRmb3IobGV0IGNoYW5nZSBvZiBjaGFuZ2VzKSB7XHJcblx0XHRcdFx0aWYoY2hhbmdlLnR5cGUgPT0gXCJjcmVhdGVcIikge1xyXG5cdFx0XHRcdFx0Ly8gaWYgd2UgbWFya2VkIHRoaXMgdmFsdWUgYXMgYSBkZWxldGUgdW5kbyB0aGF0XHJcblx0XHRcdFx0XHRsZXQgaW5kZXggPSByZW1vdGVEZWxldGVzLmluZGV4T2YoY2hhbmdlLmlkKTtcclxuXHJcblx0XHRcdFx0XHRpZihpbmRleCAhPT0gLTEpIHtcclxuXHRcdFx0XHRcdFx0cmVtb3RlRGVsZXRlcy5zcGxpY2UoaW5kZXgsIDEpO1xyXG5cdFx0XHRcdFx0fVxyXG5cclxuXHRcdFx0XHRcdC8vIHNhdmUgdGhlIHZhbHVlIHRvIHRoZSByZW1vdGVcclxuXHRcdFx0XHRcdHByb21pc2VzLnB1c2goXHJcblx0XHRcdFx0XHRcdHRoaXMuX2xvY2FsLmdldChjaGFuZ2UuaWQpXHJcblxyXG5cdFx0XHRcdFx0XHQudGhlbih2YWx1ZSA9PiB0aGlzLl9yZW1vdGUuc2V0KHZhbHVlKSlcclxuXHRcdFx0XHRcdCk7XHJcblx0XHRcdFx0fVxyXG5cdFx0XHR9XHJcblxyXG5cdFx0XHRyZXR1cm4gUHJvbWlzZS5hbGwocHJvbWlzZXMpO1xyXG5cdFx0fSk7XHJcblx0fVxyXG5cclxuXHQvLyBkZWxldGUgdmFsdWVzIHRoYXQgd2hlcmUgZGVsZXRlZCBmcm9tIHRoZSByZW1vdGUgaG9zdFxyXG5cdGFwcGx5RGVsZXRlcyhyZW1vdGVEZWxldGVzKSB7XHJcblx0XHRyZXR1cm4gUHJvbWlzZS5hbGwocmVtb3RlRGVsZXRlcy5tYXAoaWQgPT4gdGhpcy5fbG9jYWwucmVtb3ZlKGlkKSkpO1xyXG5cdH1cclxufVxyXG5cclxubW9kdWxlLmV4cG9ydHMgPSBTeW5jZXI7XHJcbiIsIi8qKlxyXG4gKiBDcmVhdGUgYSBnbG9iYWwgb2JqZWN0IHdpdGggY29tbW9ubHkgdXNlZCBtb2R1bGVzIHRvIGF2b2lkIDUwIG1pbGxpb24gcmVxdWlyZXNcclxuICovXHJcblxyXG52YXIgRXZlbnRFbWl0dGVyID0gcmVxdWlyZShcIi4vdXRpbC9ldmVudC1lbWl0dGVyXCIpO1xyXG5cclxudmFyIGxpZmVMaW5lID0gbmV3IEV2ZW50RW1pdHRlcigpO1xyXG5cclxuLy8gYXR0YWNoIHV0aWxzXHJcbmxpZmVMaW5lLkRpc3Bvc2FibGUgPSByZXF1aXJlKFwiLi91dGlsL2Rpc3Bvc2FibGVcIik7XHJcbmxpZmVMaW5lLkV2ZW50RW1pdHRlciA9IEV2ZW50RW1pdHRlcjtcclxuXHJcbi8vIGF0dGFjaCBsaWZlbGluZSB0byB0aGUgZ2xvYmFsIG9iamVjdFxyXG4odHlwZW9mIHdpbmRvdyA9PSBcIm9iamVjdFwiID8gd2luZG93IDogc2VsZikubGlmZUxpbmUgPSBsaWZlTGluZTtcclxuIiwiLyoqXHJcbiAqIEtlZXAgYSBsaXN0IG9mIHN1YnNjcmlwdGlvbnMgdG8gdW5zdWJzY3JpYmUgZnJvbSB0b2dldGhlclxyXG4gKi9cclxuXHJcbmNsYXNzIERpc3Bvc2FibGUge1xyXG5cdGNvbnN0cnVjdG9yKCkge1xyXG5cdFx0dGhpcy5fc3Vic2NyaXB0aW9ucyA9IFtdO1xyXG5cdH1cclxuXHJcblx0Ly8gVW5zdWJzY3JpYmUgZnJvbSBhbGwgc3Vic2NyaXB0aW9uc1xyXG5cdGRpc3Bvc2UoKSB7XHJcblx0XHQvLyByZW1vdmUgdGhlIGZpcnN0IHN1YnNjcmlwdGlvbiB1bnRpbCB0aGVyZSBhcmUgbm9uZSBsZWZ0XHJcblx0XHR3aGlsZSh0aGlzLl9zdWJzY3JpcHRpb25zLmxlbmd0aCA+IDApIHtcclxuXHRcdFx0dGhpcy5fc3Vic2NyaXB0aW9ucy5zaGlmdCgpLnVuc3Vic2NyaWJlKCk7XHJcblx0XHR9XHJcblx0fVxyXG5cclxuXHQvLyBBZGQgYSBzdWJzY3JpcHRpb24gdG8gdGhlIGRpc3Bvc2FibGVcclxuXHRhZGQoc3Vic2NyaXB0aW9uKSB7XHJcblx0XHR0aGlzLl9zdWJzY3JpcHRpb25zLnB1c2goc3Vic2NyaXB0aW9uKTtcclxuXHR9XHJcblxyXG5cdC8vIGRpc3Bvc2Ugd2hlbiBhbiBldmVudCBpcyBmaXJlZFxyXG5cdGRpc3Bvc2VPbihlbWl0dGVyLCBldmVudCkge1xyXG5cdFx0dGhpcy5hZGQoZW1pdHRlci5vbihldmVudCwgKCkgPT4gdGhpcy5kaXNwb3NlKCkpKTtcclxuXHR9XHJcbn07XHJcblxyXG5tb2R1bGUuZXhwb3J0cyA9IERpc3Bvc2FibGU7XHJcbiIsIi8qKlxyXG4gKiBBIGJhc2ljIGV2ZW50IGVtaXR0ZXJcclxuICovXHJcblxyXG5jbGFzcyBFdmVudEVtaXR0ZXIge1xyXG5cdGNvbnN0cnVjdG9yKCkge1xyXG5cdFx0dGhpcy5fbGlzdGVuZXJzID0ge307XHJcblx0fVxyXG5cclxuXHQvKipcclxuXHQgKiBBZGQgYW4gZXZlbnQgbGlzdGVuZXJcclxuXHQgKi9cclxuXHRvbihuYW1lLCBsaXN0ZW5lcikge1xyXG5cdFx0Ly8gaWYgd2UgZG9uJ3QgaGF2ZSBhbiBleGlzdGluZyBsaXN0ZW5lcnMgYXJyYXkgY3JlYXRlIG9uZVxyXG5cdFx0aWYoIXRoaXMuX2xpc3RlbmVyc1tuYW1lXSkge1xyXG5cdFx0XHR0aGlzLl9saXN0ZW5lcnNbbmFtZV0gPSBbXTtcclxuXHRcdH1cclxuXHJcblx0XHQvLyBhZGQgdGhlIGxpc3RlbmVyXHJcblx0XHR0aGlzLl9saXN0ZW5lcnNbbmFtZV0ucHVzaChsaXN0ZW5lcik7XHJcblxyXG5cdFx0Ly8gZ2l2ZSB0aGVtIGEgc3Vic2NyaXB0aW9uXHJcblx0XHRyZXR1cm4ge1xyXG5cdFx0XHRfbGlzdGVuZXI6IGxpc3RlbmVyLFxyXG5cclxuXHRcdFx0dW5zdWJzY3JpYmU6ICgpID0+IHtcclxuXHRcdFx0XHQvLyBmaW5kIHRoZSBsaXN0ZW5lclxyXG5cdFx0XHRcdHZhciBpbmRleCA9IHRoaXMuX2xpc3RlbmVyc1tuYW1lXS5pbmRleE9mKGxpc3RlbmVyKTtcclxuXHJcblx0XHRcdFx0aWYoaW5kZXggIT09IC0xKSB7XHJcblx0XHRcdFx0XHR0aGlzLl9saXN0ZW5lcnNbbmFtZV0uc3BsaWNlKGluZGV4LCAxKTtcclxuXHRcdFx0XHR9XHJcblx0XHRcdH1cclxuXHRcdH07XHJcblx0fVxyXG5cclxuXHQvKipcclxuXHQgKiBFbWl0IGFuIGV2ZW50XHJcblx0ICovXHJcblx0ZW1pdChuYW1lLCAuLi5hcmdzKSB7XHJcblx0XHQvLyBjaGVjayBmb3IgbGlzdGVuZXJzXHJcblx0XHRpZih0aGlzLl9saXN0ZW5lcnNbbmFtZV0pIHtcclxuXHRcdFx0Zm9yKGxldCBsaXN0ZW5lciBvZiB0aGlzLl9saXN0ZW5lcnNbbmFtZV0pIHtcclxuXHRcdFx0XHQvLyBjYWxsIHRoZSBsaXN0ZW5lcnNcclxuXHRcdFx0XHRsaXN0ZW5lciguLi5hcmdzKTtcclxuXHRcdFx0fVxyXG5cdFx0fVxyXG5cdH1cclxuXHJcblx0LyoqXHJcblx0ICogRW1pdCBhbiBldmVudCBhbmQgc2tpcCBzb21lIGxpc3RlbmVyc1xyXG5cdCAqL1xyXG5cdHBhcnRpYWxFbWl0KG5hbWUsIHNraXBzID0gW10sIC4uLmFyZ3MpIHtcclxuXHRcdC8vIGFsbG93IGEgc2luZ2xlIGl0ZW1cclxuXHRcdGlmKCFBcnJheS5pc0FycmF5KHNraXBzKSkge1xyXG5cdFx0XHRza2lwcyA9IFtza2lwc107XHJcblx0XHR9XHJcblxyXG5cdFx0Ly8gY2hlY2sgZm9yIGxpc3RlbmVyc1xyXG5cdFx0aWYodGhpcy5fbGlzdGVuZXJzW25hbWVdKSB7XHJcblx0XHRcdGZvcihsZXQgbGlzdGVuZXIgb2YgdGhpcy5fbGlzdGVuZXJzW25hbWVdKSB7XHJcblx0XHRcdFx0Ly8gdGhpcyBldmVudCBsaXN0ZW5lciBpcyBiZWluZyBza2lwZWRcclxuXHRcdFx0XHRpZihza2lwcy5maW5kKHNraXAgPT4gc2tpcC5fbGlzdGVuZXIgPT0gbGlzdGVuZXIpKSB7XHJcblx0XHRcdFx0XHRjb250aW51ZTtcclxuXHRcdFx0XHR9XHJcblxyXG5cdFx0XHRcdC8vIGNhbGwgdGhlIGxpc3RlbmVyc1xyXG5cdFx0XHRcdGxpc3RlbmVyKC4uLmFyZ3MpO1xyXG5cdFx0XHR9XHJcblx0XHR9XHJcblx0fVxyXG59XHJcblxyXG5tb2R1bGUuZXhwb3J0cyA9IEV2ZW50RW1pdHRlcjtcclxuIl19
