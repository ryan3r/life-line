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

},{"../../common/data-stores/http-adaptor":24,"../../common/data-stores/pool-store":26,"../../common/data-stores/syncer":27,"./idb-adaptor":3}],5:[function(require,module,exports){
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

},{"../common/global":28,"./global":5,"./sw-helper":7,"./views/account":10,"./views/edit":11,"./views/item":12,"./views/lists":13,"./views/login":14,"./views/todo":15,"./views/users":16,"./widgets/content":17,"./widgets/input":18,"./widgets/link":19,"./widgets/list":20,"./widgets/sidebar":21,"./widgets/toggle-btns":22}],7:[function(require,module,exports){
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

},{"node-fetch":1}],25:[function(require,module,exports){
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

},{"../util/event-emitter":30}],26:[function(require,module,exports){
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

},{"../util/event-emitter":30}],27:[function(require,module,exports){
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
							else if (modifieds[value.id] < value.modified) {
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

},{"./key-value-store":25}],28:[function(require,module,exports){
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

},{"./util/disposable":29,"./util/event-emitter":30}],29:[function(require,module,exports){
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

},{}],30:[function(require,module,exports){
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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCJub2RlX21vZHVsZXMvYnJvd3NlcmlmeS9saWIvX2VtcHR5LmpzIiwibm9kZV9tb2R1bGVzL2lkYi9saWIvaWRiLmpzIiwic3JjXFxjbGllbnRcXGRhdGEtc3RvcmVzXFxpZGItYWRhcHRvci5qcyIsInNyY1xcY2xpZW50XFxkYXRhLXN0b3Jlc1xcaW5kZXguanMiLCJzcmNcXGNsaWVudFxcZ2xvYmFsLmpzIiwic3JjXFxjbGllbnRcXGluZGV4LmpzIiwic3JjXFxjbGllbnRcXHN3LWhlbHBlci5qcyIsInNyY1xcY2xpZW50XFx1dGlsXFxkYXRlLmpzIiwic3JjXFxjbGllbnRcXHV0aWxcXGRvbS1tYWtlci5qcyIsInNyY1xcY2xpZW50XFx2aWV3c1xcYWNjb3VudC5qcyIsInNyY1xcY2xpZW50XFx2aWV3c1xcZWRpdC5qcyIsInNyY1xcY2xpZW50XFx2aWV3c1xcaXRlbS5qcyIsInNyY1xcY2xpZW50XFx2aWV3c1xcbGlzdHMuanMiLCJzcmNcXGNsaWVudFxcdmlld3NcXGxvZ2luLmpzIiwic3JjXFxjbGllbnRcXHZpZXdzXFx0b2RvLmpzIiwic3JjXFxjbGllbnRcXHZpZXdzXFx1c2Vycy5qcyIsInNyY1xcY2xpZW50XFx3aWRnZXRzXFxjb250ZW50LmpzIiwic3JjXFxjbGllbnRcXHdpZGdldHNcXGlucHV0LmpzIiwic3JjXFxjbGllbnRcXHdpZGdldHNcXGxpbmsuanMiLCJzcmNcXGNsaWVudFxcd2lkZ2V0c1xcbGlzdC5qcyIsInNyY1xcY2xpZW50XFx3aWRnZXRzXFxzaWRlYmFyLmpzIiwic3JjXFxjbGllbnRcXHdpZGdldHNcXHRvZ2dsZS1idG5zLmpzIiwic3JjXFxjb21tb25cXGJhY2t1cC5qcyIsInNyY1xcY29tbW9uXFxkYXRhLXN0b3Jlc1xcaHR0cC1hZGFwdG9yLmpzIiwic3JjXFxjb21tb25cXGRhdGEtc3RvcmVzXFxrZXktdmFsdWUtc3RvcmUuanMiLCJzcmNcXGNvbW1vblxcZGF0YS1zdG9yZXNcXHBvb2wtc3RvcmUuanMiLCJzcmNcXGNvbW1vblxcZGF0YS1zdG9yZXNcXHN5bmNlci5qcyIsInNyY1xcY29tbW9uXFxnbG9iYWwuanMiLCJzcmNcXGNvbW1vblxcdXRpbFxcZGlzcG9zYWJsZS5qcyIsInNyY1xcY29tbW9uXFx1dGlsXFxldmVudC1lbWl0dGVyLmpzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBO0FDQUE7O0FDQUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7Ozs7Ozs7QUN0VEE7Ozs7QUFJQSxJQUFJLE1BQU0sUUFBUSxLQUFS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aEIsQ0FBSCxFQUEwQjtBQUFBLHVDQVBNLElBT047QUFQTSxTQU9OO0FBQUE7O0FBQUEsMEJBQ2pCLFFBRGlCO0FBRXhCO0FBQ0EsU0FBRyxNQUFNLElBQU4sQ0FBVztBQUFBLGFBQVEsS0FBSyxTQUFMLElBQWtCLFFBQTFCO0FBQUEsTUFBWCxDQUFILEVBQW1EO0FBQ2xEO0FBQ0E7O0FBRUQ7QUFDQSwrQkFBWSxJQUFaO0FBUndCOztBQUFBO0FBQUE7QUFBQTs7QUFBQTtBQUN6QiwyQkFBb0IsS0FBSyxVQUFMLENBQWdCLElBQWhCLENBQXBCLG1JQUEyQztBQUFBLFVBQW5DLFFBQW1DOztBQUFBLHVCQUFuQyxRQUFtQzs7QUFBQSwrQkFHekM7QUFLRDtBQVR3QjtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBVXpCO0FBQ0Q7Ozs7OztBQUdGLE9BQU8sT0FBUCxHQUFpQixZQUFqQiIsImZpbGUiOiJnZW5lcmF0ZWQuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlc0NvbnRlbnQiOlsiKGZ1bmN0aW9uIGUodCxuLHIpe2Z1bmN0aW9uIHMobyx1KXtpZighbltvXSl7aWYoIXRbb10pe3ZhciBhPXR5cGVvZiByZXF1aXJlPT1cImZ1bmN0aW9uXCImJnJlcXVpcmU7aWYoIXUmJmEpcmV0dXJuIGEobywhMCk7aWYoaSlyZXR1cm4gaShvLCEwKTt2YXIgZj1uZXcgRXJyb3IoXCJDYW5ub3QgZmluZCBtb2R1bGUgJ1wiK28rXCInXCIpO3Rocm93IGYuY29kZT1cIk1PRFVMRV9OT1RfRk9VTkRcIixmfXZhciBsPW5bb109e2V4cG9ydHM6e319O3Rbb11bMF0uY2FsbChsLmV4cG9ydHMsZnVuY3Rpb24oZSl7dmFyIG49dFtvXVsxXVtlXTtyZXR1cm4gcyhuP246ZSl9LGwsbC5leHBvcnRzLGUsdCxuLHIpfXJldHVybiBuW29dLmV4cG9ydHN9dmFyIGk9dHlwZW9mIHJlcXVpcmU9PVwiZnVuY3Rpb25cIiYmcmVxdWlyZTtmb3IodmFyIG89MDtvPHIubGVuZ3RoO28rKylzKHJbb10pO3JldHVybiBzfSkiLCIiLCIndXNlIHN0cmljdCc7XG5cbihmdW5jdGlvbigpIHtcbiAgZnVuY3Rpb24gdG9BcnJheShhcnIpIHtcbiAgICByZXR1cm4gQXJyYXkucHJvdG90eXBlLnNsaWNlLmNhbGwoYXJyKTtcbiAgfVxuXG4gIGZ1bmN0aW9uIHByb21pc2lmeVJlcXVlc3QocmVxdWVzdCkge1xuICAgIHJldHVybiBuZXcgUHJvbWlzZShmdW5jdGlvbihyZXNvbHZlLCByZWplY3QpIHtcbiAgICAgIHJlcXVlc3Qub25zdWNjZXNzID0gZnVuY3Rpb24oKSB7XG4gICAgICAgIHJlc29sdmUocmVxdWVzdC5yZXN1bHQpO1xuICAgICAgfTtcblxuICAgICAgcmVxdWVzdC5vbmVycm9yID0gZnVuY3Rpb24oKSB7XG4gICAgICAgIHJlamVjdChyZXF1ZXN0LmVycm9yKTtcbiAgICAgIH07XG4gICAgfSk7XG4gIH1cblxuICBmdW5jdGlvbiBwcm9taXNpZnlSZXF1ZXN0Q2FsbChvYmosIG1ldGhvZCwgYXJncykge1xuICAgIHZhciByZXF1ZXN0O1xuICAgIHZhciBwID0gbmV3IFByb21pc2UoZnVuY3Rpb24ocmVzb2x2ZSwgcmVqZWN0KSB7XG4gICAgICByZXF1ZXN0ID0gb2JqW21ldGhvZF0uYXBwbHkob2JqLCBhcmdzKTtcbiAgICAgIHByb21pc2lmeVJlcXVlc3QocmVxdWVzdCkudGhlbihyZXNvbHZlLCByZWplY3QpO1xuICAgIH0pO1xuXG4gICAgcC5yZXF1ZXN0ID0gcmVxdWVzdDtcbiAgICByZXR1cm4gcDtcbiAgfVxuXG4gIGZ1bmN0aW9uIHByb21pc2lmeUN1cnNvclJlcXVlc3RDYWxsKG9iaiwgbWV0aG9kLCBhcmdzKSB7XG4gICAgdmFyIHAgPSBwcm9taXNpZnlSZXF1ZXN0Q2FsbChvYmosIG1ldGhvZCwgYXJncyk7XG4gICAgcmV0dXJuIHAudGhlbihmdW5jdGlvbih2YWx1ZSkge1xuICAgICAgaWYgKCF2YWx1ZSkgcmV0dXJuO1xuICAgICAgcmV0dXJuIG5ldyBDdXJzb3IodmFsdWUsIHAucmVxdWVzdCk7XG4gICAgfSk7XG4gIH1cblxuICBmdW5jdGlvbiBwcm94eVByb3BlcnRpZXMoUHJveHlDbGFzcywgdGFyZ2V0UHJvcCwgcHJvcGVydGllcykge1xuICAgIHByb3BlcnRpZXMuZm9yRWFjaChmdW5jdGlvbihwcm9wKSB7XG4gICAgICBPYmplY3QuZGVmaW5lUHJvcGVydHkoUHJveHlDbGFzcy5wcm90b3R5cGUsIHByb3AsIHtcbiAgICAgICAgZ2V0OiBmdW5jdGlvbigpIHtcbiAgICAgICAgICByZXR1cm4gdGhpc1t0YXJnZXRQcm9wXVtwcm9wXTtcbiAgICAgICAgfSxcbiAgICAgICAgc2V0OiBmdW5jdGlvbih2YWwpIHtcbiAgICAgICAgICB0aGlzW3RhcmdldFByb3BdW3Byb3BdID0gdmFsO1xuICAgICAgICB9XG4gICAgICB9KTtcbiAgICB9KTtcbiAgfVxuXG4gIGZ1bmN0aW9uIHByb3h5UmVxdWVzdE1ldGhvZHMoUHJveHlDbGFzcywgdGFyZ2V0UHJvcCwgQ29uc3RydWN0b3IsIHByb3BlcnRpZXMpIHtcbiAgICBwcm9wZXJ0aWVzLmZvckVhY2goZnVuY3Rpb24ocHJvcCkge1xuICAgICAgaWYgKCEocHJvcCBpbiBDb25zdHJ1Y3Rvci5wcm90b3R5cGUpKSByZXR1cm47XG4gICAgICBQcm94eUNsYXNzLnByb3RvdHlwZVtwcm9wXSA9IGZ1bmN0aW9uKCkge1xuICAgICAgICByZXR1cm4gcHJvbWlzaWZ5UmVxdWVzdENhbGwodGhpc1t0YXJnZXRQcm9wXSwgcHJvcCwgYXJndW1lbnRzKTtcbiAgICAgIH07XG4gICAgfSk7XG4gIH1cblxuICBmdW5jdGlvbiBwcm94eU1ldGhvZHMoUHJveHlDbGFzcywgdGFyZ2V0UHJvcCwgQ29uc3RydWN0b3IsIHByb3BlcnRpZXMpIHtcbiAgICBwcm9wZXJ0aWVzLmZvckVhY2goZnVuY3Rpb24ocHJvcCkge1xuICAgICAgaWYgKCEocHJvcCBpbiBDb25zdHJ1Y3Rvci5wcm90b3R5cGUpKSByZXR1cm47XG4gICAgICBQcm94eUNsYXNzLnByb3RvdHlwZVtwcm9wXSA9IGZ1bmN0aW9uKCkge1xuICAgICAgICByZXR1cm4gdGhpc1t0YXJnZXRQcm9wXVtwcm9wXS5hcHBseSh0aGlzW3RhcmdldFByb3BdLCBhcmd1bWVudHMpO1xuICAgICAgfTtcbiAgICB9KTtcbiAgfVxuXG4gIGZ1bmN0aW9uIHByb3h5Q3Vyc29yUmVxdWVzdE1ldGhvZHMoUHJveHlDbGFzcywgdGFyZ2V0UHJvcCwgQ29uc3RydWN0b3IsIHByb3BlcnRpZXMpIHtcbiAgICBwcm9wZXJ0aWVzLmZvckVhY2goZnVuY3Rpb24ocHJvcCkge1xuICAgICAgaWYgKCEocHJvcCBpbiBDb25zdHJ1Y3Rvci5wcm90b3R5cGUpKSByZXR1cm47XG4gICAgICBQcm94eUNsYXNzLnByb3RvdHlwZVtwcm9wXSA9IGZ1bmN0aW9uKCkge1xuICAgICAgICByZXR1cm4gcHJvbWlzaWZ5Q3Vyc29yUmVxdWVzdENhbGwodGhpc1t0YXJnZXRQcm9wXSwgcHJvcCwgYXJndW1lbnRzKTtcbiAgICAgIH07XG4gICAgfSk7XG4gIH1cblxuICBmdW5jdGlvbiBJbmRleChpbmRleCkge1xuICAgIHRoaXMuX2luZGV4ID0gaW5kZXg7XG4gIH1cblxuICBwcm94eVByb3BlcnRpZXMoSW5kZXgsICdfaW5kZXgnLCBbXG4gICAgJ25hbWUnLFxuICAgICdrZXlQYXRoJyxcbiAgICAnbXVsdGlFbnRyeScsXG4gICAgJ3VuaXF1ZSdcbiAgXSk7XG5cbiAgcHJveHlSZXF1ZXN0TWV0aG9kcyhJbmRleCwgJ19pbmRleCcsIElEQkluZGV4LCBbXG4gICAgJ2dldCcsXG4gICAgJ2dldEtleScsXG4gICAgJ2dldEFsbCcsXG4gICAgJ2dldEFsbEtleXMnLFxuICAgICdjb3VudCdcbiAgXSk7XG5cbiAgcHJveHlDdXJzb3JSZXF1ZXN0TWV0aG9kcyhJbmRleCwgJ19pbmRleCcsIElEQkluZGV4LCBbXG4gICAgJ29wZW5DdXJzb3InLFxuICAgICdvcGVuS2V5Q3Vyc29yJ1xuICBdKTtcblxuICBmdW5jdGlvbiBDdXJzb3IoY3Vyc29yLCByZXF1ZXN0KSB7XG4gICAgdGhpcy5fY3Vyc29yID0gY3Vyc29yO1xuICAgIHRoaXMuX3JlcXVlc3QgPSByZXF1ZXN0O1xuICB9XG5cbiAgcHJveHlQcm9wZXJ0aWVzKEN1cnNvciwgJ19jdXJzb3InLCBbXG4gICAgJ2RpcmVjdGlvbicsXG4gICAgJ2tleScsXG4gICAgJ3ByaW1hcnlLZXknLFxuICAgICd2YWx1ZSdcbiAgXSk7XG5cbiAgcHJveHlSZXF1ZXN0TWV0aG9kcyhDdXJzb3IsICdfY3Vyc29yJywgSURCQ3Vyc29yLCBbXG4gICAgJ3VwZGF0ZScsXG4gICAgJ2RlbGV0ZSdcbiAgXSk7XG5cbiAgLy8gcHJveHkgJ25leHQnIG1ldGhvZHNcbiAgWydhZHZhbmNlJywgJ2NvbnRpbnVlJywgJ2NvbnRpbnVlUHJpbWFyeUtleSddLmZvckVhY2goZnVuY3Rpb24obWV0aG9kTmFtZSkge1xuICAgIGlmICghKG1ldGhvZE5hbWUgaW4gSURCQ3Vyc29yLnByb3RvdHlwZSkpIHJldHVybjtcbiAgICBDdXJzb3IucHJvdG90eXBlW21ldGhvZE5hbWVdID0gZnVuY3Rpb24oKSB7XG4gICAgICB2YXIgY3Vyc29yID0gdGhpcztcbiAgICAgIHZhciBhcmdzID0gYXJndW1lbnRzO1xuICAgICAgcmV0dXJuIFByb21pc2UucmVzb2x2ZSgpLnRoZW4oZnVuY3Rpb24oKSB7XG4gICAgICAgIGN1cnNvci5fY3Vyc29yW21ldGhvZE5hbWVdLmFwcGx5KGN1cnNvci5fY3Vyc29yLCBhcmdzKTtcbiAgICAgICAgcmV0dXJuIHByb21pc2lmeVJlcXVlc3QoY3Vyc29yLl9yZXF1ZXN0KS50aGVuKGZ1bmN0aW9uKHZhbHVlKSB7XG4gICAgICAgICAgaWYgKCF2YWx1ZSkgcmV0dXJuO1xuICAgICAgICAgIHJldHVybiBuZXcgQ3Vyc29yKHZhbHVlLCBjdXJzb3IuX3JlcXVlc3QpO1xuICAgICAgICB9KTtcbiAgICAgIH0pO1xuICAgIH07XG4gIH0pO1xuXG4gIGZ1bmN0aW9uIE9iamVjdFN0b3JlKHN0b3JlKSB7XG4gICAgdGhpcy5fc3RvcmUgPSBzdG9yZTtcbiAgfVxuXG4gIE9iamVjdFN0b3JlLnByb3RvdHlwZS5jcmVhdGVJbmRleCA9IGZ1bmN0aW9uKCkge1xuICAgIHJldHVybiBuZXcgSW5kZXgodGhpcy5fc3RvcmUuY3JlYXRlSW5kZXguYXBwbHkodGhpcy5fc3RvcmUsIGFyZ3VtZW50cykpO1xuICB9O1xuXG4gIE9iamVjdFN0b3JlLnByb3RvdHlwZS5pbmRleCA9IGZ1bmN0aW9uKCkge1xuICAgIHJldHVybiBuZXcgSW5kZXgodGhpcy5fc3RvcmUuaW5kZXguYXBwbHkodGhpcy5fc3RvcmUsIGFyZ3VtZW50cykpO1xuICB9O1xuXG4gIHByb3h5UHJvcGVydGllcyhPYmplY3RTdG9yZSwgJ19zdG9yZScsIFtcbiAgICAnbmFtZScsXG4gICAgJ2tleVBhdGgnLFxuICAgICdpbmRleE5hbWVzJyxcbiAgICAnYXV0b0luY3JlbWVudCdcbiAgXSk7XG5cbiAgcHJveHlSZXF1ZXN0TWV0aG9kcyhPYmplY3RTdG9yZSwgJ19zdG9yZScsIElEQk9iamVjdFN0b3JlLCBbXG4gICAgJ3B1dCcsXG4gICAgJ2FkZCcsXG4gICAgJ2RlbGV0ZScsXG4gICAgJ2NsZWFyJyxcbiAgICAnZ2V0JyxcbiAgICAnZ2V0QWxsJyxcbiAgICAnZ2V0S2V5JyxcbiAgICAnZ2V0QWxsS2V5cycsXG4gICAgJ2NvdW50J1xuICBdKTtcblxuICBwcm94eUN1cnNvclJlcXVlc3RNZXRob2RzKE9iamVjdFN0b3JlLCAnX3N0b3JlJywgSURCT2JqZWN0U3RvcmUsIFtcbiAgICAnb3BlbkN1cnNvcicsXG4gICAgJ29wZW5LZXlDdXJzb3InXG4gIF0pO1xuXG4gIHByb3h5TWV0aG9kcyhPYmplY3RTdG9yZSwgJ19zdG9yZScsIElEQk9iamVjdFN0b3JlLCBbXG4gICAgJ2RlbGV0ZUluZGV4J1xuICBdKTtcblxuICBmdW5jdGlvbiBUcmFuc2FjdGlvbihpZGJUcmFuc2FjdGlvbikge1xuICAgIHRoaXMuX3R4ID0gaWRiVHJhbnNhY3Rpb247XG4gICAgdGhpcy5jb21wbGV0ZSA9IG5ldyBQcm9taXNlKGZ1bmN0aW9uKHJlc29sdmUsIHJlamVjdCkge1xuICAgICAgaWRiVHJhbnNhY3Rpb24ub25jb21wbGV0ZSA9IGZ1bmN0aW9uKCkge1xuICAgICAgICByZXNvbHZlKCk7XG4gICAgICB9O1xuICAgICAgaWRiVHJhbnNhY3Rpb24ub25lcnJvciA9IGZ1bmN0aW9uKCkge1xuICAgICAgICByZWplY3QoaWRiVHJhbnNhY3Rpb24uZXJyb3IpO1xuICAgICAgfTtcbiAgICAgIGlkYlRyYW5zYWN0aW9uLm9uYWJvcnQgPSBmdW5jdGlvbigpIHtcbiAgICAgICAgcmVqZWN0KGlkYlRyYW5zYWN0aW9uLmVycm9yKTtcbiAgICAgIH07XG4gICAgfSk7XG4gIH1cblxuICBUcmFuc2FjdGlvbi5wcm90b3R5cGUub2JqZWN0U3RvcmUgPSBmdW5jdGlvbigpIHtcbiAgICByZXR1cm4gbmV3IE9iamVjdFN0b3JlKHRoaXMuX3R4Lm9iamVjdFN0b3JlLmFwcGx5KHRoaXMuX3R4LCBhcmd1bWVudHMpKTtcbiAgfTtcblxuICBwcm94eVByb3BlcnRpZXMoVHJhbnNhY3Rpb24sICdfdHgnLCBbXG4gICAgJ29iamVjdFN0b3JlTmFtZXMnLFxuICAgICdtb2RlJ1xuICBdKTtcblxuICBwcm94eU1ldGhvZHMoVHJhbnNhY3Rpb24sICdfdHgnLCBJREJUcmFuc2FjdGlvbiwgW1xuICAgICdhYm9ydCdcbiAgXSk7XG5cbiAgZnVuY3Rpb24gVXBncmFkZURCKGRiLCBvbGRWZXJzaW9uLCB0cmFuc2FjdGlvbikge1xuICAgIHRoaXMuX2RiID0gZGI7XG4gICAgdGhpcy5vbGRWZXJzaW9uID0gb2xkVmVyc2lvbjtcbiAgICB0aGlzLnRyYW5zYWN0aW9uID0gbmV3IFRyYW5zYWN0aW9uKHRyYW5zYWN0aW9uKTtcbiAgfVxuXG4gIFVwZ3JhZGVEQi5wcm90b3R5cGUuY3JlYXRlT2JqZWN0U3RvcmUgPSBmdW5jdGlvbigpIHtcbiAgICByZXR1cm4gbmV3IE9iamVjdFN0b3JlKHRoaXMuX2RiLmNyZWF0ZU9iamVjdFN0b3JlLmFwcGx5KHRoaXMuX2RiLCBhcmd1bWVudHMpKTtcbiAgfTtcblxuICBwcm94eVByb3BlcnRpZXMoVXBncmFkZURCLCAnX2RiJywgW1xuICAgICduYW1lJyxcbiAgICAndmVyc2lvbicsXG4gICAgJ29iamVjdFN0b3JlTmFtZXMnXG4gIF0pO1xuXG4gIHByb3h5TWV0aG9kcyhVcGdyYWRlREIsICdfZGInLCBJREJEYXRhYmFzZSwgW1xuICAgICdkZWxldGVPYmplY3RTdG9yZScsXG4gICAgJ2Nsb3NlJ1xuICBdKTtcblxuICBmdW5jdGlvbiBEQihkYikge1xuICAgIHRoaXMuX2RiID0gZGI7XG4gIH1cblxuICBEQi5wcm90b3R5cGUudHJhbnNhY3Rpb24gPSBmdW5jdGlvbigpIHtcbiAgICByZXR1cm4gbmV3IFRyYW5zYWN0aW9uKHRoaXMuX2RiLnRyYW5zYWN0aW9uLmFwcGx5KHRoaXMuX2RiLCBhcmd1bWVudHMpKTtcbiAgfTtcblxuICBwcm94eVByb3BlcnRpZXMoREIsICdfZGInLCBbXG4gICAgJ25hbWUnLFxuICAgICd2ZXJzaW9uJyxcbiAgICAnb2JqZWN0U3RvcmVOYW1lcydcbiAgXSk7XG5cbiAgcHJveHlNZXRob2RzKERCLCAnX2RiJywgSURCRGF0YWJhc2UsIFtcbiAgICAnY2xvc2UnXG4gIF0pO1xuXG4gIC8vIEFkZCBjdXJzb3IgaXRlcmF0b3JzXG4gIC8vIFRPRE86IHJlbW92ZSB0aGlzIG9uY2UgYnJvd3NlcnMgZG8gdGhlIHJpZ2h0IHRoaW5nIHdpdGggcHJvbWlzZXNcbiAgWydvcGVuQ3Vyc29yJywgJ29wZW5LZXlDdXJzb3InXS5mb3JFYWNoKGZ1bmN0aW9uKGZ1bmNOYW1lKSB7XG4gICAgW09iamVjdFN0b3JlLCBJbmRleF0uZm9yRWFjaChmdW5jdGlvbihDb25zdHJ1Y3Rvcikge1xuICAgICAgQ29uc3RydWN0b3IucHJvdG90eXBlW2Z1bmNOYW1lLnJlcGxhY2UoJ29wZW4nLCAnaXRlcmF0ZScpXSA9IGZ1bmN0aW9uKCkge1xuICAgICAgICB2YXIgYXJncyA9IHRvQXJyYXkoYXJndW1lbnRzKTtcbiAgICAgICAgdmFyIGNhbGxiYWNrID0gYXJnc1thcmdzLmxlbmd0aCAtIDFdO1xuICAgICAgICB2YXIgbmF0aXZlT2JqZWN0ID0gdGhpcy5fc3RvcmUgfHwgdGhpcy5faW5kZXg7XG4gICAgICAgIHZhciByZXF1ZXN0ID0gbmF0aXZlT2JqZWN0W2Z1bmNOYW1lXS5hcHBseShuYXRpdmVPYmplY3QsIGFyZ3Muc2xpY2UoMCwgLTEpKTtcbiAgICAgICAgcmVxdWVzdC5vbnN1Y2Nlc3MgPSBmdW5jdGlvbigpIHtcbiAgICAgICAgICBjYWxsYmFjayhyZXF1ZXN0LnJlc3VsdCk7XG4gICAgICAgIH07XG4gICAgICB9O1xuICAgIH0pO1xuICB9KTtcblxuICAvLyBwb2x5ZmlsbCBnZXRBbGxcbiAgW0luZGV4LCBPYmplY3RTdG9yZV0uZm9yRWFjaChmdW5jdGlvbihDb25zdHJ1Y3Rvcikge1xuICAgIGlmIChDb25zdHJ1Y3Rvci5wcm90b3R5cGUuZ2V0QWxsKSByZXR1cm47XG4gICAgQ29uc3RydWN0b3IucHJvdG90eXBlLmdldEFsbCA9IGZ1bmN0aW9uKHF1ZXJ5LCBjb3VudCkge1xuICAgICAgdmFyIGluc3RhbmNlID0gdGhpcztcbiAgICAgIHZhciBpdGVtcyA9IFtdO1xuXG4gICAgICByZXR1cm4gbmV3IFByb21pc2UoZnVuY3Rpb24ocmVzb2x2ZSkge1xuICAgICAgICBpbnN0YW5jZS5pdGVyYXRlQ3Vyc29yKHF1ZXJ5LCBmdW5jdGlvbihjdXJzb3IpIHtcbiAgICAgICAgICBpZiAoIWN1cnNvcikge1xuICAgICAgICAgICAgcmVzb2x2ZShpdGVtcyk7XG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgICAgfVxuICAgICAgICAgIGl0ZW1zLnB1c2goY3Vyc29yLnZhbHVlKTtcblxuICAgICAgICAgIGlmIChjb3VudCAhPT0gdW5kZWZpbmVkICYmIGl0ZW1zLmxlbmd0aCA9PSBjb3VudCkge1xuICAgICAgICAgICAgcmVzb2x2ZShpdGVtcyk7XG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgICAgfVxuICAgICAgICAgIGN1cnNvci5jb250aW51ZSgpO1xuICAgICAgICB9KTtcbiAgICAgIH0pO1xuICAgIH07XG4gIH0pO1xuXG4gIHZhciBleHAgPSB7XG4gICAgb3BlbjogZnVuY3Rpb24obmFtZSwgdmVyc2lvbiwgdXBncmFkZUNhbGxiYWNrKSB7XG4gICAgICB2YXIgcCA9IHByb21pc2lmeVJlcXVlc3RDYWxsKGluZGV4ZWREQiwgJ29wZW4nLCBbbmFtZSwgdmVyc2lvbl0pO1xuICAgICAgdmFyIHJlcXVlc3QgPSBwLnJlcXVlc3Q7XG5cbiAgICAgIHJlcXVlc3Qub251cGdyYWRlbmVlZGVkID0gZnVuY3Rpb24oZXZlbnQpIHtcbiAgICAgICAgaWYgKHVwZ3JhZGVDYWxsYmFjaykge1xuICAgICAgICAgIHVwZ3JhZGVDYWxsYmFjayhuZXcgVXBncmFkZURCKHJlcXVlc3QucmVzdWx0LCBldmVudC5vbGRWZXJzaW9uLCByZXF1ZXN0LnRyYW5zYWN0aW9uKSk7XG4gICAgICAgIH1cbiAgICAgIH07XG5cbiAgICAgIHJldHVybiBwLnRoZW4oZnVuY3Rpb24oZGIpIHtcbiAgICAgICAgcmV0dXJuIG5ldyBEQihkYik7XG4gICAgICB9KTtcbiAgICB9LFxuICAgIGRlbGV0ZTogZnVuY3Rpb24obmFtZSkge1xuICAgICAgcmV0dXJuIHByb21pc2lmeVJlcXVlc3RDYWxsKGluZGV4ZWREQiwgJ2RlbGV0ZURhdGFiYXNlJywgW25hbWVdKTtcbiAgICB9XG4gIH07XG5cbiAgaWYgKHR5cGVvZiBtb2R1bGUgIT09ICd1bmRlZmluZWQnKSB7XG4gICAgbW9kdWxlLmV4cG9ydHMgPSBleHA7XG4gIH1cbiAgZWxzZSB7XG4gICAgc2VsZi5pZGIgPSBleHA7XG4gIH1cbn0oKSk7XG4iLCIvKipcclxuICogQW4gaW5kZXhlZCBkYiBhZGFwdG9yXHJcbiAqL1xyXG5cclxudmFyIGlkYiA9IHJlcXVpcmUoXCJpZGJcIik7XHJcblxyXG5jb25zdCBWQUxJRF9TVE9SRVMgPSBbXCJhc3NpZ25tZW50c1wiLCBcInN5bmMtc3RvcmVcIl07XHJcblxyXG4vLyBvcGVuL3NldHVwIHRoZSBkYXRhYmFzZVxyXG52YXIgZGJQcm9taXNlID0gaWRiLm9wZW4oXCJkYXRhLXN0b3Jlc1wiLCAzLCBkYiA9PiB7XHJcblx0Ly8gdXBncmFkZSBvciBjcmVhdGUgdGhlIGRiXHJcblx0aWYoZGIub2xkVmVyc2lvbiA8IDEpXHJcblx0XHRkYi5jcmVhdGVPYmplY3RTdG9yZShcImFzc2lnbm1lbnRzXCIsIHsga2V5UGF0aDogXCJpZFwiIH0pO1xyXG5cdGlmKGRiLm9sZFZlcnNpb24gPCAyKVxyXG5cdFx0ZGIuY3JlYXRlT2JqZWN0U3RvcmUoXCJzeW5jLXN0b3JlXCIsIHsga2V5UGF0aDogXCJpZFwiIH0pO1xyXG5cclxuXHQvLyB0aGUgdmVyc2lvbiAyIHN5bmMtc3RvcmUgaGFkIGEgZGlmZmVyZW50IHN0cnVjdHVyZSB0aGF0IHRoZSB2ZXJzaW9uIDNcclxuXHRpZihkYi5vbGRWZXJzaW9uID09IDIpIHtcclxuXHRcdGRiLmRlbGV0ZU9iamVjdFN0b3JlKFwic3luYy1zdG9yZVwiKTtcclxuXHRcdGRiLmNyZWF0ZU9iamVjdFN0b3JlKFwic3luYy1zdG9yZVwiLCB7IGtleVBhdGg6IFwiaWRcIiB9KTtcclxuXHR9XHJcbn0pO1xyXG5cclxuY2xhc3MgSWRiQWRhcHRvciB7XHJcblx0Y29uc3RydWN0b3IobmFtZSkge1xyXG5cdFx0dGhpcy5uYW1lID0gbmFtZTtcclxuXHJcblx0XHQvLyBjaGVjayB0aGUgc3RvcmUgaXMgdmFsaWRcclxuXHRcdGlmKFZBTElEX1NUT1JFUy5pbmRleE9mKG5hbWUpID09PSAtMSkge1xyXG5cdFx0XHR0aHJvdyBuZXcgRXJyb3IoYFRoZSBkYXRhIHN0b3JlICR7bmFtZX0gaXMgbm90IGluIGlkYiB1cGRhdGUgdGhlIGRiYCk7XHJcblx0XHR9XHJcblx0fVxyXG5cclxuXHQvLyBjcmVhdGUgYSB0cmFuc2FjdGlvblxyXG5cdF90cmFuc2FjdGlvbihyZWFkV3JpdGUpIHtcclxuXHRcdHJldHVybiBkYlByb21pc2UudGhlbihkYiA9PiB7XHJcblx0XHRcdHJldHVybiBkYlxyXG5cdFx0XHRcdC50cmFuc2FjdGlvbih0aGlzLm5hbWUsIHJlYWRXcml0ZSAmJiBcInJlYWR3cml0ZVwiKVxyXG5cdFx0XHRcdC5vYmplY3RTdG9yZSh0aGlzLm5hbWUpO1xyXG5cdFx0fSk7XHJcblx0fVxyXG5cclxuXHQvKipcclxuXHQgKiBHZXQgYWxsIHRoZSB2YWx1ZXMgaW4gdGhlIG9iamVjdCBzdG9yZVxyXG5cdCAqL1xyXG5cdGdldEFsbCgpIHtcclxuXHRcdHJldHVybiB0aGlzLl90cmFuc2FjdGlvbigpXHJcblx0XHRcdC50aGVuKHRyYW5zID0+IHRyYW5zLmdldEFsbCgpKTtcclxuXHR9XHJcblxyXG5cdC8qKlxyXG5cdCAqIEdldCBhIHNwZWNpZmljIHZhbHVlXHJcblx0ICovXHJcblx0Z2V0KGtleSkge1xyXG5cdFx0cmV0dXJuIHRoaXMuX3RyYW5zYWN0aW9uKClcclxuXHRcdFx0LnRoZW4odHJhbnMgPT4gdHJhbnMuZ2V0KGtleSkpO1xyXG5cdH1cclxuXHJcblx0LyoqXHJcblx0ICogU3RvcmUgYSB2YWx1ZSBpbiBpZGJcclxuXHQgKi9cclxuXHRzZXQodmFsdWUpIHtcclxuXHRcdHJldHVybiB0aGlzLl90cmFuc2FjdGlvbih0cnVlKVxyXG5cdFx0XHQudGhlbih0cmFucyA9PiB0cmFucy5wdXQodmFsdWUpKTtcclxuXHR9XHJcblxyXG5cdC8qKlxyXG5cdCAqIFJlbW92ZSBhIHZhbHVlIGZyb20gaWRiXHJcblx0ICovXHJcblx0cmVtb3ZlKGtleSkge1xyXG5cdFx0cmV0dXJuIHRoaXMuX3RyYW5zYWN0aW9uKHRydWUpXHJcblx0XHRcdC50aGVuKHRyYW5zID0+IHRyYW5zLmRlbGV0ZShrZXkpKTtcclxuXHR9XHJcbn1cclxuXHJcbm1vZHVsZS5leHBvcnRzID0gSWRiQWRhcHRvcjtcclxuIiwiLyoqXHJcbiAqIEluc3RhbnRpYXRlIGFsbCB0aGUgZGF0YSBzdG9yZXNcclxuICovXHJcblxyXG52YXIgSHR0cEFkYXB0b3IgPSByZXF1aXJlKFwiLi4vLi4vY29tbW9uL2RhdGEtc3RvcmVzL2h0dHAtYWRhcHRvclwiKTtcclxudmFyIFBvb2xTdG9yZSA9IHJlcXVpcmUoXCIuLi8uLi9jb21tb24vZGF0YS1zdG9yZXMvcG9vbC1zdG9yZVwiKTtcclxudmFyIFN5bmNlciA9IHJlcXVpcmUoXCIuLi8uLi9jb21tb24vZGF0YS1zdG9yZXMvc3luY2VyXCIpO1xyXG52YXIgSWRiQWRhcHRvciA9IHJlcXVpcmUoXCIuL2lkYi1hZGFwdG9yXCIpO1xyXG5cclxudmFyIGluaXRJdGVtID0gaXRlbSA9PiB7XHJcblx0Ly8gaW5zdGFudGlhdGUgdGhlIGRhdGVcclxuXHRpZihpdGVtLmRhdGUpIHtcclxuXHRcdGl0ZW0uZGF0ZSA9IG5ldyBEYXRlKGl0ZW0uZGF0ZSk7XHJcblx0fVxyXG59O1xyXG5cclxuLy8gY3JlYXRlIGEgc3luY2VyXHJcbnZhciBhc3NpZ25tZW50c0FkYXB0b3IgPSBuZXcgU3luY2VyKHtcclxuXHRyZW1vdGU6IG5ldyBIdHRwQWRhcHRvcihcIi9hcGkvZGF0YS9cIiksXHJcblx0bG9jYWw6IG5ldyBJZGJBZGFwdG9yKFwiYXNzaWdubWVudHNcIiksXHJcblx0Y2hhbmdlU3RvcmU6IG5ldyBJZGJBZGFwdG9yKFwic3luYy1zdG9yZVwiKVxyXG59KTtcclxuXHJcbmV4cG9ydHMuYXNzaWdubWVudHMgPSBuZXcgUG9vbFN0b3JlKGFzc2lnbm1lbnRzQWRhcHRvciwgaW5pdEl0ZW0pO1xyXG5cclxuLy8gY2hlY2sgb3VyIGFjY2VzcyBsZXZlbFxyXG5hc3NpZ25tZW50c0FkYXB0b3IuYWNjZXNzTGV2ZWwoKVxyXG5cclxuLnRoZW4obGV2ZWwgPT4ge1xyXG5cdC8vIHdlIGFyZSBsb2dnZWQgb3V0XHJcblx0aWYobGV2ZWwgPT0gXCJub25lXCIpIHtcclxuXHRcdGxpZmVMaW5lLm5hdi5uYXZpZ2F0ZShcIi9sb2dpblwiKTtcclxuXHR9XHJcbn0pO1xyXG5cclxuLy8gdHJpZ2dlciBhIHN5bmNcclxubGlmZUxpbmUuc3luYyA9IGZ1bmN0aW9uKCkge1xyXG5cdC8vIHRyaWdnZXIgYSBzeW5jXHJcblx0cmV0dXJuIGFzc2lnbm1lbnRzQWRhcHRvci5zeW5jKClcclxuXHJcblx0Ly8gZm9yY2UgYSByZWZlc2hcclxuXHQudGhlbigoKSA9PiBsaWZlTGluZS5uYXYubmF2aWdhdGUobG9jYXRpb24ucGF0aG5hbWUpKTtcclxufTtcclxuXHJcbmlmKHR5cGVvZiB3aW5kb3cgPT0gXCJvYmplY3RcIikge1xyXG5cdC8vIGluaXRpYWwgc3luY1xyXG5cdGxpZmVMaW5lLnN5bmMoKTtcclxuXHJcblx0Ly8gc3luYyB3aGVuIHdlIHJldmlzaXQgdGhlIHBhZ2VcclxuXHR3aW5kb3cuYWRkRXZlbnRMaXN0ZW5lcihcInZpc2liaWxpdHljaGFuZ2VcIiwgKCkgPT4ge1xyXG5cdFx0aWYoIWRvY3VtZW50LmhpZGRlbikge1xyXG5cdFx0XHRsaWZlTGluZS5zeW5jKCk7XHJcblx0XHR9XHJcblx0fSk7XHJcbn1cclxuIiwiLyoqXHJcbiAqIEJyb3dzZXIgc3BlY2lmaWMgZ2xvYmFsc1xyXG4gKi9cclxuXHJcbmxpZmVMaW5lLm1ha2VEb20gPSByZXF1aXJlKFwiLi91dGlsL2RvbS1tYWtlclwiKTtcclxuXHJcbi8vIGFkZCBhIGZ1bmN0aW9uIGZvciBhZGRpbmcgYWN0aW9uc1xyXG5saWZlTGluZS5hZGRBY3Rpb24gPSBmdW5jdGlvbihuYW1lLCBmbikge1xyXG5cdC8vIGF0dGFjaCB0aGUgY2FsbGJhY2tcclxuXHR2YXIgbGlzdGVuZXIgPSBsaWZlTGluZS5vbihcImFjdGlvbi1leGVjLVwiICsgbmFtZSwgZm4pO1xyXG5cclxuXHQvLyBpbmZvcm0gYW55IGFjdGlvbiBwcm92aWRlcnNcclxuXHRsaWZlTGluZS5lbWl0KFwiYWN0aW9uLWNyZWF0ZVwiLCBuYW1lKTtcclxuXHJcblx0Ly8gYWxsIGFjdGlvbnMgcmVtb3ZlZFxyXG5cdHZhciByZW1vdmVBbGwgPSBsaWZlTGluZS5vbihcImFjdGlvbi1yZW1vdmUtYWxsXCIsICgpID0+IHtcclxuXHRcdC8vIHJlbW92ZSB0aGUgYWN0aW9uIGxpc3RlbmVyXHJcblx0XHRsaXN0ZW5lci51bnN1YnNjcmliZSgpO1xyXG5cdFx0cmVtb3ZlQWxsLnVuc3Vic2NyaWJlKCk7XHJcblx0fSk7XHJcblxyXG5cdHJldHVybiB7XHJcblx0XHR1bnN1YnNjcmliZSgpIHtcclxuXHRcdFx0Ly8gcmVtb3ZlIHRoZSBhY3Rpb24gbGlzdGVuZXJcclxuXHRcdFx0bGlzdGVuZXIudW5zdWJzY3JpYmUoKTtcclxuXHRcdFx0cmVtb3ZlQWxsLnVuc3Vic2NyaWJlKCk7XHJcblxyXG5cdFx0XHQvLyBpbmZvcm0gYW55IGFjdGlvbiBwcm92aWRlcnNcclxuXHRcdFx0bGlmZUxpbmUuZW1pdChcImFjdGlvbi1yZW1vdmVcIiwgbmFtZSk7XHJcblx0XHR9XHJcblx0fTtcclxufTtcclxuIiwiLy8gY3JlYXRlIHRoZSBnbG9iYWwgb2JqZWN0XHJcbnJlcXVpcmUoXCIuLi9jb21tb24vZ2xvYmFsXCIpO1xyXG5yZXF1aXJlKFwiLi9nbG9iYWxcIik7XHJcblxyXG4vLyBsb2FkIGFsbCB0aGUgd2lkZ2V0c1xyXG5yZXF1aXJlKFwiLi93aWRnZXRzL3NpZGViYXJcIik7XHJcbnJlcXVpcmUoXCIuL3dpZGdldHMvY29udGVudFwiKTtcclxucmVxdWlyZShcIi4vd2lkZ2V0cy9saW5rXCIpO1xyXG5yZXF1aXJlKFwiLi93aWRnZXRzL2xpc3RcIik7XHJcbnJlcXVpcmUoXCIuL3dpZGdldHMvaW5wdXRcIik7XHJcbnJlcXVpcmUoXCIuL3dpZGdldHMvdG9nZ2xlLWJ0bnNcIik7XHJcblxyXG4vLyBsb2FkIGFsbCB0aGUgdmlld3NcclxudmFyIHtpbml0TmF2QmFyfSA9IHJlcXVpcmUoXCIuL3ZpZXdzL2xpc3RzXCIpO1xyXG5yZXF1aXJlKFwiLi92aWV3cy9pdGVtXCIpO1xyXG5yZXF1aXJlKFwiLi92aWV3cy9lZGl0XCIpO1xyXG5yZXF1aXJlKFwiLi92aWV3cy9sb2dpblwiKTtcclxucmVxdWlyZShcIi4vdmlld3MvYWNjb3VudFwiKTtcclxucmVxdWlyZShcIi4vdmlld3MvdXNlcnNcIik7XHJcbnJlcXVpcmUoXCIuL3ZpZXdzL3RvZG9cIik7XHJcblxyXG4vLyBpbnN0YW50aWF0ZSB0aGUgZG9tXHJcbmxpZmVMaW5lLm1ha2VEb20oe1xyXG5cdHBhcmVudDogZG9jdW1lbnQuYm9keSxcclxuXHRncm91cDogW1xyXG5cdFx0eyB3aWRnZXQ6IFwic2lkZWJhclwiIH0sXHJcblx0XHR7IHdpZGdldDogXCJjb250ZW50XCIgfVxyXG5cdF1cclxufSk7XHJcblxyXG4vLyBBZGQgYSBsaW5rIHRvIHRoZSB0b2RhL2hvbWUgcGFnZVxyXG5saWZlTGluZS5hZGROYXZDb21tYW5kKFwiVG9kb1wiLCBcIi9cIik7XHJcblxyXG4vLyBhZGQgbGlzdCB2aWV3cyB0byB0aGUgbmF2YmFyXHJcbmluaXROYXZCYXIoKTtcclxuXHJcbi8vIGNyZWF0ZSBhIG5ldyBhc3NpZ25tZW50XHJcbmxpZmVMaW5lLmFkZENvbW1hbmQoXCJOZXcgYXNzaWdubWVudFwiLCAoKSA9PiB7XHJcblx0dmFyIGlkID0gTWF0aC5mbG9vcihNYXRoLnJhbmRvbSgpICogMTAwMDAwMDAwKTtcclxuXHJcblx0bGlmZUxpbmUubmF2Lm5hdmlnYXRlKFwiL2VkaXQvXCIgKyBpZCk7XHJcbn0pO1xyXG5cclxuLy8gY3JlYXRlIHRoZSBsb2dvdXQgYnV0dG9uXHJcbmxpZmVMaW5lLmFkZE5hdkNvbW1hbmQoXCJBY2NvdW50XCIsIFwiL2FjY291bnRcIik7XHJcblxyXG4vLyByZWdpc3RlciB0aGUgc2VydmljZSB3b3JrZXJcclxucmVxdWlyZShcIi4vc3ctaGVscGVyXCIpO1xyXG4iLCIvKipcclxuICogUmVnaXN0ZXIgYW5kIGNvbW11bmljYXRlIHdpdGggdGhlIHNlcnZpY2Ugd29ya2VyXHJcbiAqL1xyXG5cclxuIC8vIHJlZ2lzdGVyIHRoZSBzZXJ2aWNlIHdvcmtlclxyXG4gaWYobmF2aWdhdG9yLnNlcnZpY2VXb3JrZXIpIHtcclxuXHQgLy8gbWFrZSBzdXJlIGl0J3MgcmVnaXN0ZXJlZFxyXG5cdCBuYXZpZ2F0b3Iuc2VydmljZVdvcmtlci5yZWdpc3RlcihcIi9zZXJ2aWNlLXdvcmtlci5qc1wiKTtcclxuXHJcblx0IC8vIGxpc3RlbiBmb3IgbWVzc2FnZXNcclxuXHQgbmF2aWdhdG9yLnNlcnZpY2VXb3JrZXIuYWRkRXZlbnRMaXN0ZW5lcihcIm1lc3NhZ2VcIiwgZSA9PiB7XHJcblx0XHQgLy8gd2UganVzdCB1cGRhdGVkXHJcblx0XHQgaWYoZS5kYXRhLnR5cGUgPT0gXCJ2ZXJzaW9uLWNoYW5nZVwiKSB7XHJcblx0XHRcdCBjb25zb2xlLmxvZyhcIlVwZGF0ZWQgdG9cIiwgZS5kYXRhLnZlcnNpb24pO1xyXG5cclxuXHRcdFx0IC8vIGluIGRldiBtb2RlIHJlbG9hZCB0aGUgcGFnZVxyXG5cdFx0XHQgaWYoZS5kYXRhLnZlcnNpb24uaW5kZXhPZihcIkBcIikgIT09IC0xKSB7XHJcblx0XHRcdFx0IGxvY2F0aW9uLnJlbG9hZCgpO1xyXG5cdFx0XHQgfVxyXG5cdFx0IH1cclxuXHQgfSk7XHJcbiB9XHJcbiIsIi8qKlxyXG4qIERhdGUgcmVsYXRlZCB0b29sc1xyXG4qL1xyXG5cclxuLy8gY2hlY2sgaWYgdGhlIGRhdGVzIGFyZSB0aGUgc2FtZSBkYXlcclxuZXhwb3J0cy5pc1NhbWVEYXRlID0gZnVuY3Rpb24oZGF0ZTEsIGRhdGUyKSB7XHJcblx0cmV0dXJuIGRhdGUxLmdldEZ1bGxZZWFyKCkgPT0gZGF0ZTIuZ2V0RnVsbFllYXIoKSAmJlxyXG5cdFx0ZGF0ZTEuZ2V0TW9udGgoKSA9PSBkYXRlMi5nZXRNb250aCgpICYmXHJcblx0XHRkYXRlMS5nZXREYXRlKCkgPT0gZGF0ZTIuZ2V0RGF0ZSgpO1xyXG59O1xyXG5cclxuLy8gY2hlY2sgaWYgYSBkYXRlIGlzIGxlc3MgdGhhbiBhbm90aGVyXHJcbmV4cG9ydHMuaXNTb29uZXJEYXRlID0gZnVuY3Rpb24oZGF0ZTEsIGRhdGUyKSB7XHJcbiAgICAvLyBjaGVjayB0aGUgeWVhciBmaXJzdFxyXG4gICAgaWYoZGF0ZTEuZ2V0RnVsbFllYXIoKSAhPSBkYXRlMi5nZXRGdWxsWWVhcigpKSB7XHJcbiAgICAgICAgcmV0dXJuIGRhdGUxLmdldEZ1bGxZZWFyKCkgPCBkYXRlMi5nZXRGdWxsWWVhcigpO1xyXG4gICAgfVxyXG5cclxuICAgIC8vIGNoZWNrIHRoZSBtb250aCBuZXh0XHJcbiAgICBpZihkYXRlMS5nZXRNb250aCgpICE9IGRhdGUyLmdldE1vbnRoKCkpIHtcclxuICAgICAgICByZXR1cm4gZGF0ZTEuZ2V0TW9udGgoKSA8IGRhdGUyLmdldE1vbnRoKCk7XHJcbiAgICB9XHJcblxyXG4gICAgLy8gY2hlY2sgdGhlIGRheVxyXG4gICAgcmV0dXJuIGRhdGUxLmdldERhdGUoKSA8IGRhdGUyLmdldERhdGUoKTtcclxufTtcclxuXHJcbi8vIGdldCB0aGUgZGF0ZSBkYXlzIGZyb20gbm93XHJcbmV4cG9ydHMuZGF5c0Zyb21Ob3cgPSBmdW5jdGlvbihkYXlzKSB7XHJcblx0dmFyIGRhdGUgPSBuZXcgRGF0ZSgpO1xyXG5cclxuXHQvLyBhZHZhbmNlIHRoZSBkYXRlXHJcblx0ZGF0ZS5zZXREYXRlKGRhdGUuZ2V0RGF0ZSgpICsgZGF5cyk7XHJcblxyXG5cdHJldHVybiBkYXRlO1xyXG59O1xyXG5cclxuY29uc3QgU1RSSU5HX0RBWVMgPSBbXCJTdW5kYXlcIiwgXCJNb25kYXlcIiwgXCJUdWVzZGF5XCIsIFwiV2VkZW5zZGF5XCIsIFwiVGh1cnNkYXlcIiwgXCJGcmlkYXlcIiwgXCJTYXR1cmRheVwiXTtcclxuXHJcbi8vIGNvbnZlcnQgYSBkYXRlIHRvIGEgc3RyaW5nXHJcbmV4cG9ydHMuc3RyaW5naWZ5RGF0ZSA9IGZ1bmN0aW9uKGRhdGUsIG9wdHMgPSB7fSkge1xyXG5cdCB2YXIgc3RyRGF0ZSwgc3RyVGltZSA9IFwiXCI7XHJcblxyXG4gICAgLy8gY2hlY2sgaWYgdGhlIGRhdGUgaXMgYmVmb3JlIHRvZGF5XHJcbiAgICB2YXIgYmVmb3JlTm93ID0gZGF0ZS5nZXRUaW1lKCkgPCBEYXRlLm5vdygpO1xyXG5cclxuXHQvLyBUb2RheVxyXG5cdGlmKGV4cG9ydHMuaXNTYW1lRGF0ZShkYXRlLCBuZXcgRGF0ZSgpKSlcclxuXHRcdHN0ckRhdGUgPSBcIlRvZGF5XCI7XHJcblxyXG5cdC8vIFRvbW9ycm93XHJcblx0ZWxzZSBpZihleHBvcnRzLmlzU2FtZURhdGUoZGF0ZSwgZXhwb3J0cy5kYXlzRnJvbU5vdygxKSkgJiYgIWJlZm9yZU5vdylcclxuXHRcdHN0ckRhdGUgPSBcIlRvbW9ycm93XCI7XHJcblxyXG5cdC8vIGRheSBvZiB0aGUgd2VlayAodGhpcyB3ZWVrKVxyXG5cdGVsc2UgaWYoZXhwb3J0cy5pc1Nvb25lckRhdGUoZGF0ZSwgZXhwb3J0cy5kYXlzRnJvbU5vdyg3KSkgJiYgIWJlZm9yZU5vdylcclxuXHRcdHN0ckRhdGUgPSBTVFJJTkdfREFZU1tkYXRlLmdldERheSgpXTtcclxuXHJcblx0Ly8gcHJpbnQgdGhlIGRhdGVcclxuXHRlbHNlXHJcblx0IFx0c3RyRGF0ZSA9IGAke1NUUklOR19EQVlTW2RhdGUuZ2V0RGF5KCldfSAke2RhdGUuZ2V0TW9udGgoKSArIDF9LyR7ZGF0ZS5nZXREYXRlKCl9YDtcclxuXHJcblx0Ly8gYWRkIHRoZSB0aW1lIG9uXHJcblx0aWYob3B0cy5pbmNsdWRlVGltZSAmJiAhZXhwb3J0cy5pc1NraXBUaW1lKGRhdGUsIG9wdHMuc2tpcFRpbWVzKSkge1xyXG5cdFx0cmV0dXJuIHN0ckRhdGUgKyBcIiwgXCIgKyBleHBvcnRzLnN0cmluZ2lmeVRpbWUoZGF0ZSk7XHJcblx0fVxyXG5cclxuXHRyZXR1cm4gc3RyRGF0ZTtcclxufTtcclxuXHJcbi8vIGNoZWNrIGlmIHRoaXMgaXMgb25lIG9mIHRoZSBnaXZlbiBza2lwIHRpbWVzXHJcbmV4cG9ydHMuaXNTa2lwVGltZSA9IGZ1bmN0aW9uKGRhdGUsIHNraXBzID0gW10pIHtcclxuXHRyZXR1cm4gc2tpcHMuZmluZChza2lwID0+IHtcclxuXHRcdHJldHVybiBza2lwLmhvdXIgPT09IGRhdGUuZ2V0SG91cnMoKSAmJiBza2lwLm1pbnV0ZSA9PT0gZGF0ZS5nZXRNaW51dGVzKCk7XHJcblx0fSk7XHJcbn07XHJcblxyXG4vLyBjb252ZXJ0IGEgdGltZSB0byBhIHN0cmluZ1xyXG5leHBvcnRzLnN0cmluZ2lmeVRpbWUgPSBmdW5jdGlvbihkYXRlKSB7XHJcblx0dmFyIGhvdXIgPSBkYXRlLmdldEhvdXJzKCk7XHJcblxyXG5cdC8vIGdldCB0aGUgYW0vcG0gdGltZVxyXG5cdHZhciBpc0FtID0gaG91ciA8IDEyO1xyXG5cclxuXHQvLyBtaWRuaWdodFxyXG5cdGlmKGhvdXIgPT09IDApIGhvdXIgPSAxMjtcclxuXHQvLyBhZnRlciBub29uXHJcblx0aWYoaG91ciA+IDEyKSBob3VyID0gaG91ciAtIDEyO1xyXG5cclxuXHR2YXIgbWludXRlID0gZGF0ZS5nZXRNaW51dGVzKCk7XHJcblxyXG5cdC8vIGFkZCBhIGxlYWRpbmcgMFxyXG5cdGlmKG1pbnV0ZSA8IDEwKSBtaW51dGUgPSBcIjBcIiArIG1pbnV0ZTtcclxuXHJcblx0cmV0dXJuIGhvdXIgKyBcIjpcIiArIG1pbnV0ZSArIChpc0FtID8gXCJhbVwiIDogXCJwbVwiKTtcclxufVxyXG4iLCIvKipcclxuICogQSBoZWxwZXIgZm9yIGJ1aWxkaW5nIGRvbSBub2Rlc1xyXG4gKi9cclxuXHJcbmNvbnN0IFNWR19FTEVNRU5UUyA9IFtcInN2Z1wiLCBcImxpbmVcIl07XHJcbmNvbnN0IFNWR19OQU1FU1BBQ0UgPSBcImh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnXCI7XHJcblxyXG4vLyBidWlsZCBhIHNpbmdsZSBkb20gbm9kZVxyXG52YXIgbWFrZURvbSA9IGZ1bmN0aW9uKG9wdHMgPSB7fSkge1xyXG5cdC8vIGdldCBvciBjcmVhdGUgdGhlIG5hbWUgbWFwcGluZ1xyXG5cdHZhciBtYXBwZWQgPSBvcHRzLm1hcHBlZCB8fCB7fTtcclxuXHJcblx0dmFyICRlbDtcclxuXHJcblx0Ly8gdGhlIGVsZW1lbnQgaXMgcGFydCBvZiB0aGUgc3ZnIG5hbWVzcGFjZVxyXG5cdGlmKFNWR19FTEVNRU5UUy5pbmRleE9mKG9wdHMudGFnKSAhPT0gLTEpIHtcclxuXHRcdCRlbCA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnROUyhTVkdfTkFNRVNQQUNFLCBvcHRzLnRhZyk7XHJcblx0fVxyXG5cdC8vIGEgcGxhaW4gZWxlbWVudFxyXG5cdGVsc2Uge1xyXG5cdFx0JGVsID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudChvcHRzLnRhZyB8fCBcImRpdlwiKTtcclxuXHR9XHJcblxyXG5cdC8vIHNldCB0aGUgY2xhc3Nlc1xyXG5cdGlmKG9wdHMuY2xhc3Nlcykge1xyXG5cdFx0JGVsLnNldEF0dHJpYnV0ZShcImNsYXNzXCIsIHR5cGVvZiBvcHRzLmNsYXNzZXMgPT0gXCJzdHJpbmdcIiA/IG9wdHMuY2xhc3NlcyA6IG9wdHMuY2xhc3Nlcy5qb2luKFwiIFwiKSk7XHJcblx0fVxyXG5cclxuXHQvLyBhdHRhY2ggdGhlIGF0dHJpYnV0ZXNcclxuXHRpZihvcHRzLmF0dHJzKSB7XHJcblx0XHRPYmplY3QuZ2V0T3duUHJvcGVydHlOYW1lcyhvcHRzLmF0dHJzKVxyXG5cclxuXHRcdC5mb3JFYWNoKGF0dHIgPT4gJGVsLnNldEF0dHJpYnV0ZShhdHRyLCBvcHRzLmF0dHJzW2F0dHJdKSk7XHJcblx0fVxyXG5cclxuXHQvLyBzZXQgdGhlIHRleHQgY29udGVudFxyXG5cdGlmKG9wdHMudGV4dCkge1xyXG5cdFx0JGVsLmlubmVyVGV4dCA9IG9wdHMudGV4dDtcclxuXHR9XHJcblxyXG5cdC8vIGF0dGFjaCB0aGUgbm9kZSB0byBpdHMgcGFyZW50XHJcblx0aWYob3B0cy5wYXJlbnQpIHtcclxuXHRcdG9wdHMucGFyZW50Lmluc2VydEJlZm9yZSgkZWwsIG9wdHMuYmVmb3JlKTtcclxuXHR9XHJcblxyXG5cdC8vIGFkZCBldmVudCBsaXN0ZW5lcnNcclxuXHRpZihvcHRzLm9uKSB7XHJcblx0XHRmb3IobGV0IG5hbWUgb2YgT2JqZWN0LmdldE93blByb3BlcnR5TmFtZXMob3B0cy5vbikpIHtcclxuXHRcdFx0JGVsLmFkZEV2ZW50TGlzdGVuZXIobmFtZSwgb3B0cy5vbltuYW1lXSk7XHJcblxyXG5cdFx0XHQvLyBhdHRhY2ggdGhlIGRvbSB0byBhIGRpc3Bvc2FibGVcclxuXHRcdFx0aWYob3B0cy5kaXNwKSB7XHJcblx0XHRcdFx0b3B0cy5kaXNwLmFkZCh7XHJcblx0XHRcdFx0XHR1bnN1YnNjcmliZTogKCkgPT4gJGVsLnJlbW92ZUV2ZW50TGlzdGVuZXIobmFtZSwgb3B0cy5vbltuYW1lXSlcclxuXHRcdFx0XHR9KTtcclxuXHRcdFx0fVxyXG5cdFx0fVxyXG5cdH1cclxuXHJcblx0Ly8gc2V0IHRoZSB2YWx1ZSBvZiBhbiBpbnB1dCBlbGVtZW50XHJcblx0aWYob3B0cy52YWx1ZSkge1xyXG5cdFx0JGVsLnZhbHVlID0gb3B0cy52YWx1ZTtcclxuXHR9XHJcblxyXG5cdC8vIGFkZCB0aGUgbmFtZSBtYXBwaW5nXHJcblx0aWYob3B0cy5uYW1lKSB7XHJcblx0XHRtYXBwZWRbb3B0cy5uYW1lXSA9ICRlbDtcclxuXHR9XHJcblxyXG5cdC8vIGNyZWF0ZSB0aGUgY2hpbGQgZG9tIG5vZGVzXHJcblx0aWYob3B0cy5jaGlsZHJlbikge1xyXG5cdFx0Zm9yKGxldCBjaGlsZCBvZiBvcHRzLmNoaWxkcmVuKSB7XHJcblx0XHRcdC8vIG1ha2UgYW4gYXJyYXkgaW50byBhIGdyb3VwIE9iamVjdFxyXG5cdFx0XHRpZihBcnJheS5pc0FycmF5KGNoaWxkKSkge1xyXG5cdFx0XHRcdGNoaWxkID0ge1xyXG5cdFx0XHRcdFx0Z3JvdXA6IGNoaWxkXHJcblx0XHRcdFx0fTtcclxuXHRcdFx0fVxyXG5cclxuXHRcdFx0Ly8gYXR0YWNoIGluZm9ybWF0aW9uIGZvciB0aGUgZ3JvdXBcclxuXHRcdFx0Y2hpbGQucGFyZW50ID0gJGVsO1xyXG5cdFx0XHRjaGlsZC5kaXNwID0gb3B0cy5kaXNwO1xyXG5cdFx0XHRjaGlsZC5tYXBwZWQgPSBtYXBwZWQ7XHJcblxyXG5cdFx0XHQvLyBidWlsZCB0aGUgbm9kZSBvciBncm91cFxyXG5cdFx0XHRtYWtlKGNoaWxkKTtcclxuXHRcdH1cclxuXHR9XHJcblxyXG5cdHJldHVybiBtYXBwZWQ7XHJcbn1cclxuXHJcbi8vIGJ1aWxkIGEgZ3JvdXAgb2YgZG9tIG5vZGVzXHJcbnZhciBtYWtlR3JvdXAgPSBmdW5jdGlvbihncm91cCkge1xyXG5cdC8vIHNob3J0aGFuZCBmb3IgYSBncm91cHNcclxuXHRpZihBcnJheS5pc0FycmF5KGdyb3VwKSkge1xyXG5cdFx0Z3JvdXAgPSB7XHJcblx0XHRcdGNoaWxkcmVuOiBncm91cFxyXG5cdFx0fTtcclxuXHR9XHJcblxyXG5cdC8vIGdldCBvciBjcmVhdGUgdGhlIG5hbWUgbWFwcGluZ1xyXG5cdHZhciBtYXBwZWQgPSB7fTtcclxuXHJcblx0Zm9yKGxldCBub2RlIG9mIGdyb3VwLmdyb3VwKSB7XHJcblx0XHQvLyBjb3B5IG92ZXIgcHJvcGVydGllcyBmcm9tIHRoZSBncm91cFxyXG5cdFx0bm9kZS5wYXJlbnQgfHwgKG5vZGUucGFyZW50ID0gZ3JvdXAucGFyZW50KTtcclxuXHRcdG5vZGUuZGlzcCB8fCAobm9kZS5kaXNwID0gZ3JvdXAuZGlzcCk7XHJcblx0XHRub2RlLm1hcHBlZCA9IG1hcHBlZDtcclxuXHJcblx0XHQvLyBtYWtlIHRoZSBkb21cclxuXHRcdG1ha2Uobm9kZSk7XHJcblx0fVxyXG5cclxuXHQvLyBjYWxsIHRoZSBjYWxsYmFjayB3aXRoIHRoZSBtYXBwZWQgbmFtZXNcclxuXHRpZihncm91cC5iaW5kKSB7XHJcblx0XHR2YXIgc3Vic2NyaXB0aW9uID0gZ3JvdXAuYmluZChtYXBwZWQpO1xyXG5cclxuXHRcdC8vIGlmIHRoZSByZXR1cm4gYSBzdWJzY3JpcHRpb24gYXR0YWNoIGl0IHRvIHRoZSBkaXNwb3NhYmxlXHJcblx0XHRpZihzdWJzY3JpcHRpb24gJiYgZ3JvdXAuZGlzcCkge1xyXG5cdFx0XHRncm91cC5kaXNwLmFkZChzdWJzY3JpcHRpb24pO1xyXG5cdFx0fVxyXG5cdH1cclxuXHJcblx0cmV0dXJuIG1hcHBlZDtcclxufTtcclxuXHJcbi8vIGEgY29sbGVjdGlvbiBvZiB3aWRnZXRzXHJcbnZhciB3aWRnZXRzID0ge307XHJcblxyXG52YXIgbWFrZSA9IG1vZHVsZS5leHBvcnRzID0gZnVuY3Rpb24ob3B0cykge1xyXG5cdC8vIGhhbmRsZSBhIGdyb3VwXHJcblx0aWYoQXJyYXkuaXNBcnJheShvcHRzKSB8fCBvcHRzLmdyb3VwKSB7XHJcblx0XHRyZXR1cm4gbWFrZUdyb3VwKG9wdHMpO1xyXG5cdH1cclxuXHQvLyBtYWtlIGEgd2lkZ2V0XHJcblx0ZWxzZSBpZihvcHRzLndpZGdldCkge1xyXG5cdFx0dmFyIHdpZGdldCA9IHdpZGdldHNbb3B0cy53aWRnZXRdO1xyXG5cclxuXHRcdC8vIG5vdCBkZWZpbmVkXHJcblx0XHRpZighd2lkZ2V0KSB7XHJcblx0XHRcdHRocm93IG5ldyBFcnJvcihgV2lkZ2V0ICcke29wdHMud2lkZ2V0fScgaXMgbm90IGRlZmluZWQgbWFrZSBzdXJlIGl0cyBiZWVuIGltcG9ydGVkYCk7XHJcblx0XHR9XHJcblxyXG5cdFx0Ly8gZ2VuZXJhdGUgdGhlIHdpZGdldCBjb250ZW50XHJcblx0XHR2YXIgYnVpbHQgPSB3aWRnZXQubWFrZShvcHRzKTtcclxuXHJcblx0XHRyZXR1cm4gbWFrZUdyb3VwKHtcclxuXHRcdFx0cGFyZW50OiBvcHRzLnBhcmVudCxcclxuXHRcdFx0ZGlzcDogb3B0cy5kaXNwLFxyXG5cdFx0XHRncm91cDogQXJyYXkuaXNBcnJheShidWlsdCkgPyBidWlsdCA6IFtidWlsdF0sXHJcblx0XHRcdGJpbmQ6IHdpZGdldC5iaW5kICYmIHdpZGdldC5iaW5kLmJpbmQod2lkZ2V0LCBvcHRzKVxyXG5cdFx0fSk7XHJcblx0fVxyXG5cdC8vIG1ha2UgYSBzaW5nbGUgbm9kZVxyXG5cdGVsc2Uge1xyXG5cdFx0cmV0dXJuIG1ha2VEb20ob3B0cyk7XHJcblx0fVxyXG59O1xyXG5cclxuLy8gcmVnaXN0ZXIgYSB3aWRnZXRcclxubWFrZS5yZWdpc3RlciA9IGZ1bmN0aW9uKG5hbWUsIHdpZGdldCkge1xyXG5cdHdpZGdldHNbbmFtZV0gPSB3aWRnZXQ7XHJcbn07XHJcbiIsIi8qKlxyXG4gKiBBIHZpZXcgZm9yIGFjY2Vzc2luZy9tb2RpZnlpbmcgaW5mb3JtYXRpb24gYWJvdXQgdGhlIGN1cnJlbnQgdXNlclxyXG4gKi9cclxuXHJcbnZhciB7Z2VuQmFja3VwTmFtZX0gPSByZXF1aXJlKFwiLi4vLi4vY29tbW9uL2JhY2t1cFwiKTtcclxuXHJcbmxpZmVMaW5lLm5hdi5yZWdpc3Rlcih7XHJcblx0bWF0Y2hlcjogL14oPzpcXC91c2VyXFwvKC4rPyl8XFwvYWNjb3VudCkkLyxcclxuXHJcblx0bWFrZSh7c2V0VGl0bGUsIGNvbnRlbnQsIG1hdGNofSkge1xyXG5cdFx0c2V0VGl0bGUoXCJBY2NvdW50XCIpO1xyXG5cclxuXHRcdHZhciB1cmwgPSBcIi9hcGkvYXV0aC9pbmZvL2dldFwiO1xyXG5cclxuXHRcdC8vIGFkZCB0aGUgdXNlcm5hbWUgaWYgb25lIGlzIGdpdmVuXHJcblx0XHRpZihtYXRjaFsxXSkgdXJsICs9IGA/dXNlcm5hbWU9JHttYXRjaFsxXX1gO1xyXG5cclxuXHRcdC8vIGxvYWQgdGhlIHVzZXIgZGF0YVxyXG5cdFx0ZmV0Y2godXJsLCB7IGNyZWRlbnRpYWxzOiBcImluY2x1ZGVcIiB9KVxyXG5cclxuXHRcdC50aGVuKHJlcyA9PiByZXMuanNvbigpKVxyXG5cclxuXHRcdC50aGVuKHJlcyA9PiB7XHJcblx0XHRcdC8vIG5vIHN1Y2ggdXNlciBvciBhY2Nlc3MgaXMgZGVuaWVkXHJcblx0XHRcdGlmKHJlcy5zdGF0dXMgPT0gXCJmYWlsXCIpIHtcclxuXHRcdFx0XHRsaWZlTGluZS5tYWtlRG9tKHtcclxuXHRcdFx0XHRcdHBhcmVudDogY29udGVudCxcclxuXHRcdFx0XHRcdGNsYXNzZXM6IFwiY29udGVudC1wYWRkZWRcIixcclxuXHRcdFx0XHRcdHRleHQ6IFwiQ291bGQgbm90IGFjY2VzcyB0aGUgdXNlciB5b3Ugd2VyZSBsb29raW5nIGZvclwiXHJcblx0XHRcdFx0fSk7XHJcblxyXG5cdFx0XHRcdHJldHVybjtcclxuXHRcdFx0fVxyXG5cclxuXHRcdFx0dmFyIHVzZXIgPSByZXMuZGF0YTtcclxuXHJcblx0XHRcdC8vIGdlbmVyYXRlIHRoZSBwYWdlXHJcblx0XHRcdHZhciBjaGlsZHJlbiA9IFtdO1xyXG5cclxuXHRcdFx0Y2hpbGRyZW4ucHVzaCh7XHJcblx0XHRcdFx0dGFnOiBcImgyXCIsXHJcblx0XHRcdFx0dGV4dDogdXNlci51c2VybmFtZVxyXG5cdFx0XHR9KTtcclxuXHJcblx0XHRcdC8vIGRpc3BsYXkgdGhlIGFkbWluIHN0YXR1cyBvZiBhbm90aGVyIHVzZXJcclxuXHRcdFx0aWYobWF0Y2hbMV0pIHtcclxuXHRcdFx0XHRjaGlsZHJlbi5wdXNoKHtcclxuXHRcdFx0XHRcdHRleHQ6IGAke3VzZXIudXNlcm5hbWV9IGlzICR7dXNlci5hZG1pbiA/IFwiXCIgOiBcIm5vdFwifSBhbiBhZG1pbmBcclxuXHRcdFx0XHR9KTtcclxuXHRcdFx0fVxyXG5cdFx0XHQvLyBkaXNwbGF5IHRoZSBhZG1pbiBzdGF0dXMgb2YgdGhpcyB1c2VyXHJcblx0XHRcdGVsc2Uge1xyXG5cdFx0XHRcdGNoaWxkcmVuLnB1c2goe1xyXG5cdFx0XHRcdFx0dGV4dDogYFlvdSBhcmUgJHt1c2VyLmFkbWluID8gXCJcIiA6IFwibm90XCJ9IGFuIGFkbWluYFxyXG5cdFx0XHRcdH0pO1xyXG5cclxuXHRcdFx0XHQvLyBhZGQgYSBsaW5rIGF0IGEgbGlzdCBvZiBhbGwgdXNlcnNcclxuXHRcdFx0XHRpZih1c2VyLmFkbWluKSB7XHJcblx0XHRcdFx0XHRjaGlsZHJlbi5wdXNoKHsgdGFnOiBcImJyXCIgfSk7XHJcblxyXG5cdFx0XHRcdFx0Y2hpbGRyZW4ucHVzaCh7XHJcblx0XHRcdFx0XHRcdHdpZGdldDogXCJsaW5rXCIsXHJcblx0XHRcdFx0XHRcdGhyZWY6IFwiL3VzZXJzXCIsXHJcblx0XHRcdFx0XHRcdHRleHQ6IFwiVmlldyBhbGwgdXNlcnNcIlxyXG5cdFx0XHRcdFx0fSk7XHJcblx0XHRcdFx0fVxyXG5cdFx0XHR9XHJcblxyXG5cdFx0XHQvLyBjcmVhdGUgYSBiYWNrdXAgbGlua1xyXG5cdFx0XHRpZighbWF0Y2hbMV0pIHtcclxuXHRcdFx0XHRjaGlsZHJlbi5wdXNoKHsgdGFnOiBcImJyXCIgfSk7XHJcblx0XHRcdFx0Y2hpbGRyZW4ucHVzaCh7IHRhZzogXCJiclwiIH0pO1xyXG5cclxuXHRcdFx0XHRjaGlsZHJlbi5wdXNoKHtcclxuXHRcdFx0XHRcdHRhZzogXCJhXCIsXHJcblx0XHRcdFx0XHR0ZXh0OiBcIkRvd25sb2FkIGJhY2t1cFwiLFxyXG5cdFx0XHRcdFx0YXR0cnM6IHtcclxuXHRcdFx0XHRcdFx0aHJlZjogXCIvYXBpL2JhY2t1cFwiLFxyXG5cdFx0XHRcdFx0XHRkb3dubG9hZDogZ2VuQmFja3VwTmFtZSgpXHJcblx0XHRcdFx0XHR9XHJcblx0XHRcdFx0fSk7XHJcblx0XHRcdH1cclxuXHJcblx0XHRcdHZhciBwYXNzd29yZENoYW5nZSA9IHt9O1xyXG5cclxuXHRcdFx0Y2hpbGRyZW4ucHVzaCh7XHJcblx0XHRcdFx0dGFnOiBcImZvcm1cIixcclxuXHRcdFx0XHRjaGlsZHJlbjogW1xyXG5cdFx0XHRcdFx0e1xyXG5cdFx0XHRcdFx0XHRjbGFzc2VzOiBcImVkaXRvci1yb3dcIixcclxuXHRcdFx0XHRcdFx0Y2hpbGRyZW46IFtcclxuXHRcdFx0XHRcdFx0XHR7XHJcblx0XHRcdFx0XHRcdFx0XHR3aWRnZXQ6IFwiaW5wdXRcIixcclxuXHRcdFx0XHRcdFx0XHRcdHR5cGU6IFwicGFzc3dvcmRcIixcclxuXHRcdFx0XHRcdFx0XHRcdHBsYWNlaG9sZGVyOiBcIk9sZCBwYXNzd29yZFwiLFxyXG5cdFx0XHRcdFx0XHRcdFx0YmluZDogcGFzc3dvcmRDaGFuZ2UsXHJcblx0XHRcdFx0XHRcdFx0XHRwcm9wOiBcIm9sZFBhc3N3b3JkXCJcclxuXHRcdFx0XHRcdFx0XHR9LFxyXG5cdFx0XHRcdFx0XHRcdHtcclxuXHRcdFx0XHRcdFx0XHRcdHdpZGdldDogXCJpbnB1dFwiLFxyXG5cdFx0XHRcdFx0XHRcdFx0dHlwZTogXCJwYXNzd29yZFwiLFxyXG5cdFx0XHRcdFx0XHRcdFx0cGxhY2Vob2xkZXI6IFwiTmV3IHBhc3N3b3JkXCIsXHJcblx0XHRcdFx0XHRcdFx0XHRiaW5kOiBwYXNzd29yZENoYW5nZSxcclxuXHRcdFx0XHRcdFx0XHRcdHByb3A6IFwicGFzc3dvcmRcIlxyXG5cdFx0XHRcdFx0XHRcdH1cclxuXHRcdFx0XHRcdFx0XVxyXG5cdFx0XHRcdFx0fSxcclxuXHRcdFx0XHRcdHtcclxuXHRcdFx0XHRcdFx0dGFnOiBcImJ1dHRvblwiLFxyXG5cdFx0XHRcdFx0XHRjbGFzc2VzOiBcImZhbmN5LWJ1dHRvblwiLFxyXG5cdFx0XHRcdFx0XHR0ZXh0OiBcIkNoYW5nZSBwYXNzd29yZFwiLFxyXG5cdFx0XHRcdFx0XHRhdHRyczoge1xyXG5cdFx0XHRcdFx0XHRcdHR5cGU6IFwic3VibWl0XCJcclxuXHRcdFx0XHRcdFx0fVxyXG5cdFx0XHRcdFx0fSxcclxuXHRcdFx0XHRcdHtcclxuXHRcdFx0XHRcdFx0bmFtZTogXCJtc2dcIlxyXG5cdFx0XHRcdFx0fVxyXG5cdFx0XHRcdF0sXHJcblx0XHRcdFx0b246IHtcclxuXHRcdFx0XHRcdC8vIGNoYW5nZSB0aGUgcGFzc3dvcmRcclxuXHRcdFx0XHRcdHN1Ym1pdDogZSA9PiB7XHJcblx0XHRcdFx0XHRcdGUucHJldmVudERlZmF1bHQoKTtcclxuXHJcblx0XHRcdFx0XHRcdC8vIG5vIHBhc3N3b3JkIHN1cHBsaWVkXHJcblx0XHRcdFx0XHRcdGlmKCFwYXNzd29yZENoYW5nZS5wYXNzd29yZCkge1xyXG5cdFx0XHRcdFx0XHRcdHNob3dNc2coXCJFbnRlciBhIG5ldyBwYXNzd29yZFwiKTtcclxuXHRcdFx0XHRcdFx0XHRyZXR1cm47XHJcblx0XHRcdFx0XHRcdH1cclxuXHJcblx0XHRcdFx0XHRcdC8vIHNlbmQgdGhlIHBhc3N3b3JkIGNoYW5nZSByZXF1ZXN0XHJcblx0XHRcdFx0XHRcdGZldGNoKGAvYXBpL2F1dGgvaW5mby9zZXQ/dXNlcm5hbWU9JHt1c2VyLnVzZXJuYW1lfWAsIHtcclxuXHRcdFx0XHRcdFx0XHRjcmVkZW50aWFsczogXCJpbmNsdWRlXCIsXHJcblx0XHRcdFx0XHRcdFx0bWV0aG9kOiBcIlBPU1RcIixcclxuXHRcdFx0XHRcdFx0XHRib2R5OiBKU09OLnN0cmluZ2lmeShwYXNzd29yZENoYW5nZSlcclxuXHRcdFx0XHRcdFx0fSlcclxuXHJcblx0XHRcdFx0XHRcdC50aGVuKHJlcyA9PiByZXMuanNvbigpKVxyXG5cclxuXHRcdFx0XHRcdFx0LnRoZW4ocmVzID0+IHtcclxuXHRcdFx0XHRcdFx0XHQvLyBwYXNzd29yZCBjaGFuZ2UgZmFpbGVkXHJcblx0XHRcdFx0XHRcdFx0aWYocmVzLnN0YXR1cyA9PSBcImZhaWxcIikge1xyXG5cdFx0XHRcdFx0XHRcdFx0c2hvd01zZyhyZXMuZGF0YS5tc2cpO1xyXG5cdFx0XHRcdFx0XHRcdH1cclxuXHJcblx0XHRcdFx0XHRcdFx0aWYocmVzLnN0YXR1cyA9PSBcInN1Y2Nlc3NcIikge1xyXG5cdFx0XHRcdFx0XHRcdFx0c2hvd01zZyhcIlBhc3N3b3JkIGNoYW5nZWRcIik7XHJcblx0XHRcdFx0XHRcdFx0fVxyXG5cdFx0XHRcdFx0XHR9KTtcclxuXHRcdFx0XHRcdH1cclxuXHRcdFx0XHR9XHJcblx0XHRcdH0pO1xyXG5cclxuXHRcdFx0Y2hpbGRyZW4ucHVzaCh7IHRhZzogXCJiclwiIH0pO1xyXG5cdFx0XHRjaGlsZHJlbi5wdXNoKHsgdGFnOiBcImJyXCIgfSk7XHJcblxyXG5cdFx0XHQvLyBvbmx5IGRpc3BsYXkgdGhlIGxvZ291dCBidXR0b24gaWYgd2UgYXJlIG9uIHRoZSAvYWNjb3VudCBwYWdlXHJcblx0XHRcdGlmKCFtYXRjaFsxXSkge1xyXG5cdFx0XHRcdGNoaWxkcmVuLnB1c2goe1xyXG5cdFx0XHRcdFx0dGFnOiBcImJ1dHRvblwiLFxyXG5cdFx0XHRcdFx0Y2xhc3NlczogXCJmYW5jeS1idXR0b25cIixcclxuXHRcdFx0XHRcdHRleHQ6IFwiTG9nb3V0XCIsXHJcblx0XHRcdFx0XHRvbjoge1xyXG5cdFx0XHRcdFx0XHRjbGljazogKCkgPT4ge1xyXG5cdFx0XHRcdFx0XHRcdC8vIHNlbmQgdGhlIGxvZ291dCByZXF1ZXN0XHJcblx0XHRcdFx0XHRcdFx0ZmV0Y2goXCIvYXBpL2F1dGgvbG9nb3V0XCIsIHsgY3JlZGVudGlhbHM6IFwiaW5jbHVkZVwiIH0pXHJcblxyXG5cdFx0XHRcdFx0XHRcdC8vIHJldHVybiB0byB0aGUgbG9naW4gcGFnZVxyXG5cdFx0XHRcdFx0XHRcdC50aGVuKCgpID0+IGxpZmVMaW5lLm5hdi5uYXZpZ2F0ZShcIi9sb2dpblwiKSk7XHJcblx0XHRcdFx0XHRcdH1cclxuXHRcdFx0XHRcdH1cclxuXHRcdFx0XHR9KTtcclxuXHRcdFx0fVxyXG5cclxuXHRcdFx0dmFyIHttc2d9ID0gbGlmZUxpbmUubWFrZURvbSh7XHJcblx0XHRcdFx0cGFyZW50OiBjb250ZW50LFxyXG5cdFx0XHRcdGNsYXNzZXM6IFwiY29udGVudC1wYWRkZWRcIixcclxuXHRcdFx0XHRjaGlsZHJlblxyXG5cdFx0XHR9KTtcclxuXHJcblx0XHRcdC8vIHNob3cgYSBtZXNzYWdlXHJcblx0XHRcdHZhciBzaG93TXNnID0gZnVuY3Rpb24odGV4dCkge1xyXG5cdFx0XHRcdG1zZy5pbm5lclRleHQgPSB0ZXh0O1xyXG5cdFx0XHR9O1xyXG5cdFx0fSlcclxuXHR9XHJcbn0pO1xyXG4iLCIvKipcclxuICogRWRpdCBhbiBhc3NpZ25lbW50XHJcbiAqL1xyXG5cclxudmFyIHtkYXlzRnJvbU5vdywgc3RyaW5naWZ5RGF0ZX0gPSByZXF1aXJlKFwiLi4vdXRpbC9kYXRlXCIpO1xyXG52YXIge2Fzc2lnbm1lbnRzfSA9IHJlcXVpcmUoXCIuLi9kYXRhLXN0b3Jlc1wiKTs7XHJcblxyXG5saWZlTGluZS5uYXYucmVnaXN0ZXIoe1xyXG5cdG1hdGNoZXI6IC9eXFwvZWRpdFxcLyguKz8pJC8sXHJcblxyXG5cdG1ha2Uoe21hdGNoLCBjb250ZW50LCBzZXRUaXRsZSwgZGlzcG9zYWJsZX0pIHtcclxuXHRcdHZhciBhY3Rpb25TdWIsIGRlbGV0ZVN1YjtcclxuXHJcblx0XHQvLyBpZiB3ZSBtYWtlIGEgY2hhbmdlIGRvbid0IHJlZnJlc2ggdGhlIHBhZ2VcclxuXHRcdHZhciBkZWJvdW5jZTtcclxuXHJcblx0XHR2YXIgY2hhbmdlU3ViID0gYXNzaWdubWVudHMucXVlcnkoeyBpZDogbWF0Y2hbMV0gfSwgZnVuY3Rpb24oW2l0ZW1dKSB7XHJcblx0XHRcdC8vIGlmIHdlIG1ha2UgYSBjaGFuZ2UgZG9uJ3QgcmVmcmVzaCB0aGUgcGFnZVxyXG5cdFx0XHRpZihkZWJvdW5jZSkge1xyXG5cdFx0XHRcdGRlYm91bmNlID0gZmFsc2U7XHJcblxyXG5cdFx0XHRcdHJldHVybjtcclxuXHRcdFx0fVxyXG5cclxuXHRcdFx0Ly8gY2xlYXIgdGhlIGNvbnRlbnRcclxuXHRcdFx0Y29udGVudC5pbm5lckhUTUwgPSBcIlwiO1xyXG5cclxuXHRcdFx0Ly8gcmVtb3ZlIHRoZSBwcmV2aW91cyBhY3Rpb25cclxuXHRcdFx0aWYoYWN0aW9uU3ViKSB7XHJcblx0XHRcdFx0YWN0aW9uU3ViLnVuc3Vic2NyaWJlKCk7XHJcblx0XHRcdFx0ZGVsZXRlU3ViLnVuc3Vic2NyaWJlKCk7XHJcblx0XHRcdH1cclxuXHJcblx0XHRcdC8vIGFkZCBhIGJ1dHRvbiBiYWNrIHRvIHRoZSB2aWV3XHJcblx0XHRcdGlmKGl0ZW0pIHtcclxuXHRcdFx0XHRhY3Rpb25TdWIgPSBsaWZlTGluZS5hZGRBY3Rpb24oXCJWaWV3XCIsICgpID0+IGxpZmVMaW5lLm5hdi5uYXZpZ2F0ZShcIi9pdGVtL1wiICsgaXRlbS5pZCkpO1xyXG5cclxuXHRcdFx0XHRkZWxldGVTdWIgPSBsaWZlTGluZS5hZGRBY3Rpb24oXCJEZWxldGVcIiwgKCkgPT4ge1xyXG5cdFx0XHRcdFx0Ly8gcmVtb3ZlIHRoZSBpdGVtXHJcblx0XHRcdFx0XHRhc3NpZ25tZW50cy5yZW1vdmUoaXRlbS5pZCk7XHJcblxyXG5cdFx0XHRcdFx0Ly8gbmF2aWdhdGUgYXdheVxyXG5cdFx0XHRcdFx0bGlmZUxpbmUubmF2Lm5hdmlnYXRlKFwiL1wiKTtcclxuXHRcdFx0XHR9KTtcclxuXHRcdFx0fVxyXG5cclxuXHRcdFx0Ly8gaWYgdGhlIGl0ZW0gZG9lcyBub3QgZXhpc3QgY3JlYXRlIGl0XHJcblx0XHRcdGlmKCFpdGVtKSB7XHJcblx0XHRcdFx0aXRlbSA9IHtcclxuXHRcdFx0XHRcdG5hbWU6IFwiVW5uYW1lZCBpdGVtXCIsXHJcblx0XHRcdFx0XHRjbGFzczogXCJDbGFzc1wiLFxyXG5cdFx0XHRcdFx0ZGF0ZTogZ2VuRGF0ZSgpLFxyXG5cdFx0XHRcdFx0aWQ6IG1hdGNoWzFdLFxyXG5cdFx0XHRcdFx0ZGVzY3JpcHRpb246IFwiXCIsXHJcblx0XHRcdFx0XHRtb2RpZmllZDogRGF0ZS5ub3coKSxcclxuXHRcdFx0XHRcdHR5cGU6IFwiYXNzaWdubWVudFwiLFxyXG5cdFx0XHRcdFx0ZG9uZTogZmFsc2VcclxuXHRcdFx0XHR9O1xyXG5cdFx0XHR9XHJcblxyXG5cdFx0XHQvLyBzZXQgdGhlIGluaXRhbCB0aXRsZVxyXG5cdFx0XHRzZXRUaXRsZShcIkVkaXRpbmdcIik7XHJcblxyXG5cdFx0XHQvLyBzYXZlIGNoYW5nZXNcclxuXHRcdFx0dmFyIGNoYW5nZSA9ICgpID0+IHtcclxuXHRcdFx0XHQvLyB1cGRhdGUgdGhlIG1vZGlmaWVkIGRhdGVcclxuXHRcdFx0XHRpdGVtLm1vZGlmaWVkID0gRGF0ZS5ub3coKTtcclxuXHJcblx0XHRcdFx0Ly8gZmluZCB0aGUgZGF0ZSBhbmQgdGltZSBpbnB1dHNcclxuXHRcdFx0XHR2YXIgZGF0ZUlucHV0ID0gZG9jdW1lbnQucXVlcnlTZWxlY3RvcihcImlucHV0W3R5cGU9ZGF0ZV1cIik7XHJcblx0XHRcdFx0dmFyIHRpbWVJbnB1dCA9IGRvY3VtZW50LnF1ZXJ5U2VsZWN0b3IoXCJpbnB1dFt0eXBlPXRpbWVdXCIpO1xyXG5cclxuXHRcdFx0XHQvLyBwYXJzZSB0aGUgZGF0ZVxyXG5cdFx0XHRcdGl0ZW0uZGF0ZSA9IG5ldyBEYXRlKGRhdGVJbnB1dC52YWx1ZSArIFwiIFwiICsgdGltZUlucHV0LnZhbHVlKTtcclxuXHJcblx0XHRcdFx0Ly8gcmVtb3ZlIGFzc2lnbmVtbnQgZmllbGRzIGZyb20gdGFza3NcclxuXHRcdFx0XHRpZihpdGVtLnR5cGUgPT0gXCJ0YXNrXCIpIHtcclxuXHRcdFx0XHRcdGRlbGV0ZSBpdGVtLmRhdGU7XHJcblx0XHRcdFx0XHRkZWxldGUgaXRlbS5jbGFzcztcclxuXHRcdFx0XHR9XHJcblxyXG5cdFx0XHRcdC8vIGFkZCBhIGJ1dHRvbiBiYWNrIHRvIHRoZSB2aWV3XHJcblx0XHRcdFx0aWYoIWFjdGlvblN1Yikge1xyXG5cdFx0XHRcdFx0YWN0aW9uU3ViID0gbGlmZUxpbmUuYWRkQWN0aW9uKFwiVmlld1wiLCAoKSA9PiBsaWZlTGluZS5uYXYubmF2aWdhdGUoXCIvaXRlbS9cIiArIGl0ZW0uaWQpKTtcclxuXHJcblx0XHRcdFx0XHRkZWxldGVTdWIgPSBsaWZlTGluZS5hZGRBY3Rpb24oXCJEZWxldGVcIiwgKCkgPT4ge1xyXG5cdFx0XHRcdFx0XHQvLyByZW1vdmUgdGhlIGl0ZW1cclxuXHRcdFx0XHRcdFx0YXNzaWdubWVudHMucmVtb3ZlKGl0ZW0uaWQpO1xyXG5cclxuXHRcdFx0XHRcdFx0Ly8gbmF2aWdhdGUgYXdheVxyXG5cdFx0XHRcdFx0XHRsaWZlTGluZS5uYXYubmF2aWdhdGUoXCIvXCIpO1xyXG5cdFx0XHRcdFx0fSk7XHJcblx0XHRcdFx0fVxyXG5cclxuXHRcdFx0XHRkZWJvdW5jZSA9IHRydWU7XHJcblxyXG5cdFx0XHRcdC8vIHNhdmUgdGhlIGNoYW5nZXNcclxuXHRcdFx0XHRhc3NpZ25tZW50cy5zZXQoaXRlbSk7XHJcblx0XHRcdH07XHJcblxyXG5cdFx0XHQvLyBoaWRlIGFuZCBzaG93IHNwZWNpZmljIGZpZWxkcyBmb3IgZGlmZmVyZW50IGFzc2lnbm1lbnQgdHlwZXNcclxuXHRcdFx0dmFyIHRvZ2dsZUZpZWxkcyA9ICgpID0+IHtcclxuXHRcdFx0XHRpZihpdGVtLnR5cGUgPT0gXCJ0YXNrXCIpIHtcclxuXHRcdFx0XHRcdG1hcHBlZC5jbGFzc0ZpZWxkLnN0eWxlLmRpc3BsYXkgPSBcIm5vbmVcIjtcclxuXHRcdFx0XHRcdG1hcHBlZC5kYXRlRmllbGQuc3R5bGUuZGlzcGxheSA9IFwibm9uZVwiO1xyXG5cdFx0XHRcdH1cclxuXHRcdFx0XHRlbHNlIHtcclxuXHRcdFx0XHRcdG1hcHBlZC5jbGFzc0ZpZWxkLnN0eWxlLmRpc3BsYXkgPSBcIlwiO1xyXG5cdFx0XHRcdFx0bWFwcGVkLmRhdGVGaWVsZC5zdHlsZS5kaXNwbGF5ID0gXCJcIjtcclxuXHRcdFx0XHR9XHJcblxyXG5cdFx0XHRcdC8vIGZpbGwgaW4gZGF0ZSBpZiBpdCBpcyBtaXNzaW5nXHJcblx0XHRcdFx0aWYoIWl0ZW0uZGF0ZSkge1xyXG5cdFx0XHRcdFx0aXRlbS5kYXRlID0gZ2VuRGF0ZSgpO1xyXG5cdFx0XHRcdH1cclxuXHJcblx0XHRcdFx0aWYoIWl0ZW0uY2xhc3MpIHtcclxuXHRcdFx0XHRcdGl0ZW0uY2xhc3MgPSBcIkNsYXNzXCI7XHJcblx0XHRcdFx0fVxyXG5cdFx0XHR9O1xyXG5cclxuXHRcdFx0Ly8gcmVuZGVyIHRoZSB1aVxyXG5cdFx0XHR2YXIgbWFwcGVkID0gbGlmZUxpbmUubWFrZURvbSh7XHJcblx0XHRcdFx0cGFyZW50OiBjb250ZW50LFxyXG5cdFx0XHRcdGdyb3VwOiBbXHJcblx0XHRcdFx0XHR7XHJcblx0XHRcdFx0XHRcdGNsYXNzZXM6IFwiZWRpdG9yLXJvd1wiLFxyXG5cdFx0XHRcdFx0XHRjaGlsZHJlbjogW1xyXG5cdFx0XHRcdFx0XHRcdHtcclxuXHRcdFx0XHRcdFx0XHRcdHdpZGdldDogXCJpbnB1dFwiLFxyXG5cdFx0XHRcdFx0XHRcdFx0YmluZDogaXRlbSxcclxuXHRcdFx0XHRcdFx0XHRcdHByb3A6IFwibmFtZVwiLFxyXG5cdFx0XHRcdFx0XHRcdFx0Y2hhbmdlXHJcblx0XHRcdFx0XHRcdFx0fVxyXG5cdFx0XHRcdFx0XHRdXHJcblx0XHRcdFx0XHR9LFxyXG5cdFx0XHRcdFx0e1xyXG5cdFx0XHRcdFx0XHRjbGFzc2VzOiBcImVkaXRvci1yb3dcIixcclxuXHRcdFx0XHRcdFx0Y2hpbGRyZW46IFtcclxuXHRcdFx0XHRcdFx0XHR7XHJcblx0XHRcdFx0XHRcdFx0XHR3aWRnZXQ6IFwidG9nZ2xlLWJ0bnNcIixcclxuXHRcdFx0XHRcdFx0XHRcdGJ0bnM6IFtcclxuXHRcdFx0XHRcdFx0XHRcdFx0eyB0ZXh0OiBcIkFzc2lnbm1lbnRcIiwgdmFsdWU6IFwiYXNzaWdubWVudFwiIH0sXHJcblx0XHRcdFx0XHRcdFx0XHRcdHsgdGV4dDogXCJUYXNrXCIsIHZhbHVlOiBcInRhc2tcIiB9LFxyXG5cdFx0XHRcdFx0XHRcdFx0XSxcclxuXHRcdFx0XHRcdFx0XHRcdHZhbHVlOiBpdGVtLnR5cGUsXHJcblx0XHRcdFx0XHRcdFx0XHRjaGFuZ2U6IHR5cGUgPT4ge1xyXG5cdFx0XHRcdFx0XHRcdFx0XHQvLyB1cGRhdGUgdGhlIGl0ZW0gdHlwZVxyXG5cdFx0XHRcdFx0XHRcdFx0XHRpdGVtLnR5cGUgPSB0eXBlO1xyXG5cclxuXHRcdFx0XHRcdFx0XHRcdFx0Ly8gaGlkZS9zaG93IHNwZWNpZmljIGZpZWxkc1xyXG5cdFx0XHRcdFx0XHRcdFx0XHR0b2dnbGVGaWVsZHMoKTtcclxuXHJcblx0XHRcdFx0XHRcdFx0XHRcdC8vIGVtaXQgdGhlIGNoYW5nZVxyXG5cdFx0XHRcdFx0XHRcdFx0XHRjaGFuZ2UoKTtcclxuXHRcdFx0XHRcdFx0XHRcdH1cclxuXHRcdFx0XHRcdFx0XHR9XHJcblx0XHRcdFx0XHRcdF1cclxuXHRcdFx0XHRcdH0sXHJcblx0XHRcdFx0XHR7XHJcblx0XHRcdFx0XHRcdG5hbWU6IFwiY2xhc3NGaWVsZFwiLFxyXG5cdFx0XHRcdFx0XHRjbGFzc2VzOiBcImVkaXRvci1yb3dcIixcclxuXHRcdFx0XHRcdFx0Y2hpbGRyZW46IFtcclxuXHRcdFx0XHRcdFx0XHR7XHJcblx0XHRcdFx0XHRcdFx0XHR3aWRnZXQ6IFwiaW5wdXRcIixcclxuXHRcdFx0XHRcdFx0XHRcdGJpbmQ6IGl0ZW0sXHJcblx0XHRcdFx0XHRcdFx0XHRwcm9wOiBcImNsYXNzXCIsXHJcblx0XHRcdFx0XHRcdFx0XHRjaGFuZ2VcclxuXHRcdFx0XHRcdFx0XHR9XHJcblx0XHRcdFx0XHRcdF1cclxuXHRcdFx0XHRcdH0sXHJcblx0XHRcdFx0XHR7XHJcblx0XHRcdFx0XHRcdG5hbWU6IFwiZGF0ZUZpZWxkXCIsXHJcblx0XHRcdFx0XHRcdGNsYXNzZXM6IFwiZWRpdG9yLXJvd1wiLFxyXG5cdFx0XHRcdFx0XHRjaGlsZHJlbjogW1xyXG5cdFx0XHRcdFx0XHRcdHtcclxuXHRcdFx0XHRcdFx0XHRcdHdpZGdldDogXCJpbnB1dFwiLFxyXG5cdFx0XHRcdFx0XHRcdFx0dHlwZTogXCJkYXRlXCIsXHJcblx0XHRcdFx0XHRcdFx0XHR2YWx1ZTogaXRlbS5kYXRlICYmIGAke2l0ZW0uZGF0ZS5nZXRGdWxsWWVhcigpfS0ke3BhZChpdGVtLmRhdGUuZ2V0TW9udGgoKSArIDEpfS0ke3BhZChpdGVtLmRhdGUuZ2V0RGF0ZSgpKX1gLFxyXG5cdFx0XHRcdFx0XHRcdFx0Y2hhbmdlXHJcblx0XHRcdFx0XHRcdFx0fSxcclxuXHRcdFx0XHRcdFx0XHR7XHJcblx0XHRcdFx0XHRcdFx0XHR3aWRnZXQ6IFwiaW5wdXRcIixcclxuXHRcdFx0XHRcdFx0XHRcdHR5cGU6IFwidGltZVwiLFxyXG5cdFx0XHRcdFx0XHRcdFx0dmFsdWU6IGl0ZW0uZGF0ZSAmJiBgJHtpdGVtLmRhdGUuZ2V0SG91cnMoKX06JHtwYWQoaXRlbS5kYXRlLmdldE1pbnV0ZXMoKSl9YCxcclxuXHRcdFx0XHRcdFx0XHRcdGNoYW5nZVxyXG5cdFx0XHRcdFx0XHRcdH1cclxuXHRcdFx0XHRcdFx0XVxyXG5cdFx0XHRcdFx0fSxcclxuXHRcdFx0XHRcdHtcclxuXHRcdFx0XHRcdFx0Y2xhc3NlczogXCJ0ZXh0YXJlYS13cmFwcGVyXCIsXHJcblx0XHRcdFx0XHRcdGNoaWxkcmVuOiBbXHJcblx0XHRcdFx0XHRcdFx0e1xyXG5cdFx0XHRcdFx0XHRcdFx0d2lkZ2V0OiBcImlucHV0XCIsXHJcblx0XHRcdFx0XHRcdFx0XHR0YWc6IFwidGV4dGFyZWFcIixcclxuXHRcdFx0XHRcdFx0XHRcdGNsYXNzZXM6IFwidGV4dGFyZWEtZmlsbFwiLFxyXG5cdFx0XHRcdFx0XHRcdFx0cGxhY2Vob2xkZXI6IFwiRGVzY3JpcHRpb25cIixcclxuXHRcdFx0XHRcdFx0XHRcdGJpbmQ6IGl0ZW0sXHJcblx0XHRcdFx0XHRcdFx0XHRwcm9wOiBcImRlc2NyaXB0aW9uXCIsXHJcblx0XHRcdFx0XHRcdFx0XHRjaGFuZ2VcclxuXHRcdFx0XHRcdFx0XHR9XHJcblx0XHRcdFx0XHRcdF1cclxuXHRcdFx0XHRcdH1cclxuXHRcdFx0XHRdXHJcblx0XHRcdH0pO1xyXG5cclxuXHRcdFx0Ly8gc2hvdyB0aGUgZmllbGRzIGZvciB0aGlzIGl0ZW0gdHlwZVxyXG5cdFx0XHR0b2dnbGVGaWVsZHMoKTtcclxuXHRcdH0pO1xyXG5cclxuXHRcdC8vIHJlbW92ZSB0aGUgc3Vic2NyaXB0aW9uIHdoZW4gdGhpcyB2aWV3IGlzIGRlc3Ryb3llZFxyXG5cdFx0ZGlzcG9zYWJsZS5hZGQoY2hhbmdlU3ViKTtcclxuXHR9XHJcbn0pO1xyXG5cclxuLy8gYWRkIGEgbGVhZGluZyAwIGlmIGEgbnVtYmVyIGlzIGxlc3MgdGhhbiAxMFxyXG52YXIgcGFkID0gbnVtYmVyID0+IChudW1iZXIgPCAxMCkgPyBcIjBcIiArIG51bWJlciA6IG51bWJlcjtcclxuXHJcbi8vIGNyZWF0ZSBhIGRhdGUgb2YgdG9kYXkgYXQgMTE6NTlwbVxyXG52YXIgZ2VuRGF0ZSA9ICgpID0+IHtcclxuXHR2YXIgZGF0ZSA9IG5ldyBEYXRlKCk7XHJcblxyXG5cdC8vIHNldCB0aGUgdGltZVxyXG5cdGRhdGUuc2V0SG91cnMoMjMpO1xyXG5cdGRhdGUuc2V0TWludXRlcyg1OSk7XHJcblxyXG5cdHJldHVybiBkYXRlO1xyXG59O1xyXG4iLCIvKipcclxuICogVGhlIHZpZXcgZm9yIGFuIGFzc2lnbm1lbnRcclxuICovXHJcblxyXG52YXIge2RheXNGcm9tTm93LCBzdHJpbmdpZnlEYXRlfSA9IHJlcXVpcmUoXCIuLi91dGlsL2RhdGVcIik7XHJcbnZhciB7YXNzaWdubWVudHN9ID0gcmVxdWlyZShcIi4uL2RhdGEtc3RvcmVzXCIpO1xyXG5cclxubGlmZUxpbmUubmF2LnJlZ2lzdGVyKHtcclxuXHRtYXRjaGVyOiAvXlxcL2l0ZW1cXC8oLis/KSQvLFxyXG5cclxuXHRtYWtlKHttYXRjaCwgc2V0VGl0bGUsIGNvbnRlbnQsIGRpc3Bvc2FibGV9KSB7XHJcblx0XHR2YXIgYWN0aW9uRG9uZVN1YiwgYWN0aW9uRWRpdFN1YjtcclxuXHJcblx0IFx0ZGlzcG9zYWJsZS5hZGQoXHJcblx0XHRcdGFzc2lnbm1lbnRzLnF1ZXJ5KHsgaWQ6IG1hdGNoWzFdIH0sIGZ1bmN0aW9uKFtpdGVtXSkge1xyXG5cdFx0XHRcdC8vIGNsZWFyIHRoZSBjb250ZW50XHJcblx0XHRcdFx0Y29udGVudC5pbm5lckhUTUwgPSBcIlwiO1xyXG5cclxuXHRcdFx0XHQvLyByZW1vdmUgdGhlIG9sZCBhY3Rpb25cclxuXHRcdFx0XHRpZihhY3Rpb25Eb25lU3ViKSB7XHJcblx0XHRcdFx0XHRhY3Rpb25Eb25lU3ViLnVuc3Vic2NyaWJlKCk7XHJcblx0XHRcdFx0XHRhY3Rpb25FZGl0U3ViLnVuc3Vic2NyaWJlKCk7XHJcblx0XHRcdFx0fVxyXG5cclxuXHRcdFx0XHQvLyBubyBzdWNoIGFzc2lnbm1lbnRcclxuXHRcdFx0XHRpZighaXRlbSkge1xyXG5cdFx0XHRcdFx0c2V0VGl0bGUoXCJOb3QgZm91bmRcIik7XHJcblxyXG5cdFx0XHRcdFx0bGlmZUxpbmUubWFrZURvbSh7XHJcblx0XHRcdFx0XHRcdHBhcmVudDogY29udGVudCxcclxuXHRcdFx0XHRcdFx0Y2xhc3NlczogXCJjb250ZW50LXBhZGRlZFwiLFxyXG5cdFx0XHRcdFx0XHRjaGlsZHJlbjogW1xyXG5cdFx0XHRcdFx0XHRcdHtcclxuXHRcdFx0XHRcdFx0XHRcdHRhZzogXCJzcGFuXCIsXHJcblx0XHRcdFx0XHRcdFx0XHR0ZXh0OiBcIlRoZSBhc3NpZ25tZW50IHlvdSB3aGVyZSBsb29raW5nIGZvciBjb3VsZCBub3QgYmUgZm91bmQuIFwiXHJcblx0XHRcdFx0XHRcdFx0fSxcclxuXHRcdFx0XHRcdFx0XHR7XHJcblx0XHRcdFx0XHRcdFx0XHR3aWRnZXQ6IFwibGlua1wiLFxyXG5cdFx0XHRcdFx0XHRcdFx0aHJlZjogXCIvXCIsXHJcblx0XHRcdFx0XHRcdFx0XHR0ZXh0OiBcIkdvIGhvbWUuXCJcclxuXHRcdFx0XHRcdFx0XHR9XHJcblx0XHRcdFx0XHRcdF1cclxuXHRcdFx0XHRcdH0pO1xyXG5cclxuXHRcdFx0XHRcdHJldHVybjtcclxuXHRcdFx0XHR9XHJcblxyXG5cdFx0XHRcdC8vIHNldCB0aGUgdGl0bGUgZm9yIHRoZSBjb250ZW50XHJcblx0XHRcdFx0c2V0VGl0bGUoXCJBc3NpZ25tZW50XCIpO1xyXG5cclxuXHRcdFx0XHQvLyBtYXJrIHRoZSBpdGVtIGFzIGRvbmVcclxuXHRcdFx0XHRhY3Rpb25Eb25lU3ViID0gbGlmZUxpbmUuYWRkQWN0aW9uKGl0ZW0uZG9uZSA/IFwiRG9uZVwiIDogXCJOb3QgZG9uZVwiLCAoKSA9PiB7XHJcblx0XHRcdFx0XHQvLyBtYXJrIHRoZSBpdGVtIGRvbmVcclxuXHRcdFx0XHRcdGl0ZW0uZG9uZSA9ICFpdGVtLmRvbmU7XHJcblxyXG5cdFx0XHRcdFx0Ly8gdXBkYXRlIHRoZSBtb2RpZmllZCB0aW1lXHJcblx0XHRcdFx0XHRpdGVtLm1vZGlmaWVkID0gRGF0ZS5ub3coKTtcclxuXHJcblx0XHRcdFx0XHQvLyBzYXZlIHRoZSBjaGFuZ2VcclxuXHRcdFx0XHRcdGFzc2lnbm1lbnRzLnNldChpdGVtKTtcclxuXHRcdFx0XHR9KTtcclxuXHJcblx0XHRcdFx0Ly8gZWRpdCB0aGUgaXRlbVxyXG5cdFx0XHRcdGFjdGlvbkVkaXRTdWIgPSBsaWZlTGluZS5hZGRBY3Rpb24oXCJFZGl0XCIsXHJcblx0XHRcdFx0XHQoKSA9PiBsaWZlTGluZS5uYXYubmF2aWdhdGUoXCIvZWRpdC9cIiArIGl0ZW0uaWQpKTtcclxuXHJcblx0XHRcdFx0Ly8gdGltZXMgdG8gc2tpcFxyXG5cdFx0XHRcdHZhciBza2lwVGltZXMgPSBbXHJcblx0XHRcdFx0XHR7IGhvdXI6IDIzLCBtaW51dGU6IDU5IH1cclxuXHRcdFx0XHRdO1xyXG5cclxuXHRcdFx0XHRsaWZlTGluZS5tYWtlRG9tKHtcclxuXHRcdFx0XHRcdHBhcmVudDogY29udGVudCxcclxuXHRcdFx0XHRcdGNsYXNzZXM6IFwiY29udGVudC1wYWRkZWRcIixcclxuXHRcdFx0XHRcdGNoaWxkcmVuOiBbXHJcblx0XHRcdFx0XHRcdHtcclxuXHRcdFx0XHRcdFx0XHRjbGFzc2VzOiBcImFzc2lnbm1lbnQtbmFtZVwiLFxyXG5cdFx0XHRcdFx0XHRcdHRleHQ6IGl0ZW0ubmFtZVxyXG5cdFx0XHRcdFx0XHR9LFxyXG5cdFx0XHRcdFx0XHR7XHJcblx0XHRcdFx0XHRcdFx0Y2xhc3NlczogXCJhc3NpZ25tZW50LWluZm8tcm93XCIsXHJcblx0XHRcdFx0XHRcdFx0Y2hpbGRyZW46IFtcclxuXHRcdFx0XHRcdFx0XHRcdHtcclxuXHRcdFx0XHRcdFx0XHRcdFx0Y2xhc3NlczogXCJhc3NpZ25tZW50LWluZm8tZ3Jvd1wiLFxyXG5cdFx0XHRcdFx0XHRcdFx0XHR0ZXh0OiBpdGVtLmNsYXNzXHJcblx0XHRcdFx0XHRcdFx0XHR9LFxyXG5cdFx0XHRcdFx0XHRcdFx0e1xyXG5cdFx0XHRcdFx0XHRcdFx0XHR0ZXh0OiBpdGVtLmRhdGUgJiYgc3RyaW5naWZ5RGF0ZShpdGVtLmRhdGUsIHsgaW5jbHVkZVRpbWU6IHRydWUsIHNraXBUaW1lcyB9KVxyXG5cdFx0XHRcdFx0XHRcdFx0fVxyXG5cdFx0XHRcdFx0XHRcdF1cclxuXHRcdFx0XHRcdFx0fSxcclxuXHRcdFx0XHRcdFx0e1xyXG5cdFx0XHRcdFx0XHRcdGNsYXNzZXM6IFwiYXNzaWdubWVudC1kZXNjcmlwdGlvblwiLFxyXG5cdFx0XHRcdFx0XHRcdHRleHQ6IGl0ZW0uZGVzY3JpcHRpb25cclxuXHRcdFx0XHRcdFx0fVxyXG5cdFx0XHRcdFx0XVxyXG5cdFx0XHRcdH0pO1xyXG5cdFx0XHR9KVxyXG5cdFx0KTtcclxuXHR9XHJcbn0pO1xyXG4iLCIvKipcclxuICogRGlzcGxheSBhIGxpc3Qgb2YgdXBjb21taW5nIGFzc2lnbm1lbnRzXHJcbiAqL1xyXG5cclxudmFyIHtkYXlzRnJvbU5vdywgaXNTYW1lRGF0ZSwgc3RyaW5naWZ5RGF0ZSwgc3RyaW5naWZ5VGltZSwgaXNTb29uZXJEYXRlfSA9IHJlcXVpcmUoXCIuLi91dGlsL2RhdGVcIik7XHJcbnZhciB7YXNzaWdubWVudHN9ID0gcmVxdWlyZShcIi4uL2RhdGEtc3RvcmVzXCIpO1xyXG5cclxuLy8gYWxsIHRoZSBkaWZmZXJlbnQgbGlzdHNcclxuY29uc3QgTElTVFMgPSBbXHJcblx0e1xyXG5cdFx0dXJsOiBcIi93ZWVrXCIsXHJcblx0XHR0aXRsZTogXCJUaGlzIHdlZWtcIixcclxuXHRcdGNyZWF0ZUN0eDogKCkgPT4gKHtcclxuXHRcdFx0Ly8gZGF5cyB0byB0aGUgZW5kIG9mIHRoaXMgd2Vla1xyXG5cdFx0XHRlbmREYXRlOiBkYXlzRnJvbU5vdyg3IC0gKG5ldyBEYXRlKCkpLmdldERheSgpKSxcclxuXHRcdFx0Ly8gdG9kYXlzIGRhdGVcclxuXHRcdFx0dG9kYXk6IG5ldyBEYXRlKClcclxuXHRcdH0pLFxyXG5cdFx0Ly8gc2hvdyBhbGwgYXQgcmVhc29uYWJsZSBudW1iZXIgb2YgaW5jb21wbGV0ZSBhc3NpZ25tZW50c1xyXG5cdFx0ZmlsdGVyOiAoaXRlbSwge3RvZGF5LCBlbmREYXRlfSkgPT4ge1xyXG5cdFx0XHQvLyBzaG93IGFsbCB0YXNrc1xyXG5cdFx0XHRpZihpdGVtLnR5cGUgPT0gXCJ0YXNrXCIpIHJldHVybiB0cnVlO1xyXG5cclxuXHRcdFx0Ly8gY2hlY2sgaWYgdGhlIGl0ZW0gaXMgcGFzdCB0aGlzIHdlZWtcclxuXHRcdFx0aWYoIWlzU29vbmVyRGF0ZShpdGVtLmRhdGUsIGVuZERhdGUpICYmICFpc1NhbWVEYXRlKGl0ZW0uZGF0ZSwgZW5kRGF0ZSkpIHJldHVybjtcclxuXHJcblx0XHRcdC8vIGNoZWNrIGlmIHRoZSBkYXRlIGlzIGJlZm9yZSB0b2RheVxyXG5cdFx0XHRpZihpc1Nvb25lckRhdGUoaXRlbS5kYXRlLCB0b2RheSkpIHJldHVybjtcclxuXHJcblx0XHRcdHJldHVybiB0cnVlO1xyXG5cdFx0fSxcclxuXHRcdHF1ZXJ5OiB7IGRvbmU6IGZhbHNlIH1cclxuXHR9LFxyXG5cdHtcclxuXHRcdHVybDogXCIvdXBjb21pbmdcIixcclxuXHRcdHF1ZXJ5OiB7IGRvbmU6IGZhbHNlIH0sXHJcblx0XHR0aXRsZTogXCJVcGNvbWluZ1wiXHJcblx0fSxcclxuXHR7XHJcblx0XHR1cmw6IFwiL2RvbmVcIixcclxuXHRcdHF1ZXJ5OiB7IGRvbmU6IHRydWUgfSxcclxuXHRcdHRpdGxlOiBcIkRvbmVcIlxyXG5cdH1cclxuXTtcclxuXHJcbi8vIGFkZCBsaXN0IHZpZXcgbGlua3MgdG8gdGhlIG5hdmJhclxyXG5leHBvcnRzLmluaXROYXZCYXIgPSBmdW5jdGlvbigpIHtcclxuXHRMSVNUUy5mb3JFYWNoKGxpc3QgPT4gbGlmZUxpbmUuYWRkTmF2Q29tbWFuZChsaXN0LnRpdGxlLCBsaXN0LnVybCkpO1xyXG59O1xyXG5cclxubGlmZUxpbmUubmF2LnJlZ2lzdGVyKHtcclxuXHRtYXRjaGVyKHVybCkge1xyXG5cdFx0cmV0dXJuIExJU1RTLmZpbmQobGlzdCA9PiBsaXN0LnVybCA9PSB1cmwpO1xyXG5cdH0sXHJcblxyXG5cdC8vIG1ha2UgdGhlIGxpc3RcclxuXHRtYWtlKHtzZXRUaXRsZSwgY29udGVudCwgZGlzcG9zYWJsZSwgbWF0Y2h9KSB7XHJcblx0XHRkaXNwb3NhYmxlLmFkZChcclxuXHRcdFx0YXNzaWdubWVudHMucXVlcnkobWF0Y2gucXVlcnkgfHwge30sIGZ1bmN0aW9uKGRhdGEpIHtcclxuXHRcdFx0XHQvLyBjbGVhciB0aGUgY29udGVudFxyXG5cdFx0XHRcdGNvbnRlbnQuaW5uZXJIVE1MID0gXCJcIjtcclxuXHJcblx0XHRcdFx0Ly8gc2V0IHRoZSBwYWdlIHRpdGxlXHJcblx0XHRcdFx0c2V0VGl0bGUobWF0Y2gudGl0bGUpO1xyXG5cclxuXHRcdFx0XHQvLyB0aGUgY29udGV4dCBmb3IgdGhlIGZpbHRlciBmdW5jdGlvblxyXG5cdFx0XHRcdHZhciBjdHg7XHJcblxyXG5cdFx0XHRcdGlmKG1hdGNoLmNyZWF0ZUN0eCkge1xyXG5cdFx0XHRcdFx0Y3R4ID0gbWF0Y2guY3JlYXRlQ3R4KCk7XHJcblx0XHRcdFx0fVxyXG5cclxuXHRcdFx0XHQvLyBydW4gdGhlIGZpbHRlciBmdW5jdGlvblxyXG5cdFx0XHRcdGlmKG1hdGNoLmZpbHRlcikge1xyXG5cdFx0XHRcdFx0ZGF0YSA9IGRhdGEuZmlsdGVyKGl0ZW0gPT4gbWF0Y2guZmlsdGVyKGl0ZW0sIGN0eCkpO1xyXG5cdFx0XHRcdH1cclxuXHJcblx0XHRcdFx0Ly8gc29ydCB0aGUgYXNzaW5nbWVudHNcclxuXHRcdFx0XHRkYXRhLnNvcnQoKGEsIGIpID0+IHtcclxuXHRcdFx0XHRcdC8vIHRhc2tzIGFyZSBiZWxvdyBhc3NpZ25tZW50c1xyXG5cdFx0XHRcdFx0aWYoYS50eXBlID09IFwidGFza1wiICYmIGIudHlwZSAhPSBcInRhc2tcIikgcmV0dXJuIDE7XHJcblx0XHRcdFx0XHRpZihhLnR5cGUgIT0gXCJ0YXNrXCIgJiYgYi50eXBlID09IFwidGFza1wiKSByZXR1cm4gLTE7XHJcblxyXG5cdFx0XHRcdFx0Ly8gc29ydCBieSBkdWUgZGF0ZVxyXG5cdFx0XHRcdFx0aWYoYS50eXBlID09IFwiYXNzaWdubWVudFwiICYmIGIudHlwZSA9PSBcImFzc2lnbm1lbnRcIikge1xyXG5cdFx0XHRcdFx0XHRpZihhLmRhdGUuZ2V0VGltZSgpICE9IGIuZGF0ZS5nZXRUaW1lKCkpIHtcclxuXHRcdFx0XHRcdFx0XHRyZXR1cm4gYS5kYXRlLmdldFRpbWUoKSAtIGIuZGF0ZS5nZXRUaW1lKCk7XHJcblx0XHRcdFx0XHRcdH1cclxuXHRcdFx0XHRcdH1cclxuXHJcblx0XHRcdFx0XHQvLyBvcmRlciBieSBuYW1lXHJcblx0XHRcdFx0XHRpZihhLm5hbWUgPCBiLm5hbWUpIHJldHVybiAtMTtcclxuXHRcdFx0XHRcdGlmKGEubmFtZSA+IGIubmFtZSkgcmV0dXJuIDE7XHJcblxyXG5cdFx0XHRcdFx0cmV0dXJuIDA7XHJcblx0XHRcdFx0fSk7XHJcblxyXG5cdFx0XHRcdC8vIG1ha2UgdGhlIGdyb3Vwc1xyXG5cdFx0XHRcdHZhciBncm91cHMgPSB7fTtcclxuXHJcblx0XHRcdFx0Ly8gcmVuZGVyIHRoZSBsaXN0XHJcblx0XHRcdFx0ZGF0YS5mb3JFYWNoKChpdGVtLCBpKSA9PiB7XHJcblx0XHRcdFx0XHQvLyBnZXQgdGhlIGhlYWRlciBuYW1lXHJcblx0XHRcdFx0XHR2YXIgZGF0ZVN0ciA9IGl0ZW0udHlwZSA9PSBcInRhc2tcIiA/IFwiVGFza3NcIiA6IHN0cmluZ2lmeURhdGUoaXRlbS5kYXRlKTtcclxuXHJcblx0XHRcdFx0XHQvLyBtYWtlIHN1cmUgdGhlIGhlYWRlciBleGlzdHNcclxuXHRcdFx0XHRcdGdyb3Vwc1tkYXRlU3RyXSB8fCAoZ3JvdXBzW2RhdGVTdHJdID0gW10pO1xyXG5cclxuXHRcdFx0XHRcdC8vIGFkZCB0aGUgaXRlbSB0byB0aGUgbGlzdFxyXG5cdFx0XHRcdFx0dmFyIGl0ZW1zID0gW1xyXG5cdFx0XHRcdFx0XHR7IHRleHQ6IGl0ZW0ubmFtZSwgZ3JvdzogdHJ1ZSB9XHJcblx0XHRcdFx0XHRdO1xyXG5cclxuXHRcdFx0XHRcdGlmKGl0ZW0udHlwZSAhPSBcInRhc2tcIikge1xyXG5cdFx0XHRcdFx0XHQvLyBzaG93IHRoZSBlbmQgdGltZSBmb3IgYW55IG5vbiAxMTo1OXBtIHRpbWVzXHJcblx0XHRcdFx0XHRcdGlmKGl0ZW0uZGF0ZS5nZXRIb3VycygpICE9IDIzIHx8IGl0ZW0uZGF0ZS5nZXRNaW51dGVzKCkgIT0gNTkpIHtcclxuXHRcdFx0XHRcdFx0XHRpdGVtcy5wdXNoKHN0cmluZ2lmeVRpbWUoaXRlbS5kYXRlKSk7XHJcblx0XHRcdFx0XHRcdH1cclxuXHJcblx0XHRcdFx0XHRcdC8vIHNob3cgdGhlIGNsYXNzXHJcblx0XHRcdFx0XHRcdGl0ZW1zLnB1c2goaXRlbS5jbGFzcyk7XHJcblx0XHRcdFx0XHR9XHJcblxyXG5cdFx0XHRcdFx0Z3JvdXBzW2RhdGVTdHJdLnB1c2goe1xuXHRcdFx0XHRcdFx0aHJlZjogYC9pdGVtLyR7aXRlbS5pZH1gLFxuXHRcdFx0XHRcdFx0aXRlbXNcclxuXHRcdFx0XHRcdH0pO1xyXG5cdFx0XHRcdH0pO1xyXG5cclxuXHRcdFx0XHQvLyBkaXNwbGF5IGFsbCBpdGVtc1xyXG5cdFx0XHRcdGxpZmVMaW5lLm1ha2VEb20oe1xyXG5cdFx0XHRcdFx0cGFyZW50OiBjb250ZW50LFxyXG5cdFx0XHRcdFx0d2lkZ2V0OiBcImxpc3RcIixcclxuXHRcdFx0XHRcdGl0ZW1zOiBncm91cHNcclxuXHRcdFx0XHR9KTtcclxuXHRcdFx0fSlcclxuXHRcdCk7XHJcblx0fVxyXG59KTtcclxuIiwiLyoqXHJcbiAqIFNob3cgYSBsb2dpbiBidXR0b24gdG8gdGhlIHVzZXJcclxuICovXHJcblxyXG5saWZlTGluZS5uYXYucmVnaXN0ZXIoe1xyXG5cdG1hdGNoZXI6IFwiL2xvZ2luXCIsXHJcblxyXG5cdG1ha2Uoe3NldFRpdGxlLCBjb250ZW50fSkge1xyXG5cdFx0Ly8gc2V0IHRoZSBwYWdlIHRpdGxlXHJcblx0XHRzZXRUaXRsZShcIkxvZ2luXCIpO1xyXG5cclxuXHRcdC8vIHRoZSB1c2VycyBjcmVkZW50aWFsc1xyXG5cdFx0dmFyIGF1dGggPSB7fTtcclxuXHJcblx0XHQvLyBjcmVhdGUgdGhlIGxvZ2luIGZvcm1cclxuXHRcdHZhciB7dXNlcm5hbWUsIHBhc3N3b3JkLCBtc2d9ID0gbGlmZUxpbmUubWFrZURvbSh7XHJcblx0XHRcdHBhcmVudDogY29udGVudCxcclxuXHRcdFx0dGFnOiBcImZvcm1cIixcclxuXHRcdFx0Y2xhc3NlczogXCJjb250ZW50LXBhZGRlZFwiLFxyXG5cdFx0XHRjaGlsZHJlbjogW1xyXG5cdFx0XHRcdHtcclxuXHRcdFx0XHRcdGNsYXNzZXM6IFwiZWRpdG9yLXJvd1wiLFxyXG5cdFx0XHRcdFx0Y2hpbGRyZW46IFtcclxuXHRcdFx0XHRcdFx0e1xyXG5cdFx0XHRcdFx0XHRcdHdpZGdldDogXCJpbnB1dFwiLFxyXG5cdFx0XHRcdFx0XHRcdGJpbmQ6IGF1dGgsXHJcblx0XHRcdFx0XHRcdFx0cHJvcDogXCJ1c2VybmFtZVwiLFxyXG5cdFx0XHRcdFx0XHRcdHBsYWNlaG9sZGVyOiBcIlVzZXJuYW1lXCJcclxuXHRcdFx0XHRcdFx0fVxyXG5cdFx0XHRcdFx0XVxyXG5cdFx0XHRcdH0sXHJcblx0XHRcdFx0e1xyXG5cdFx0XHRcdFx0Y2xhc3NlczogXCJlZGl0b3Itcm93XCIsXHJcblx0XHRcdFx0XHRjaGlsZHJlbjogW1xyXG5cdFx0XHRcdFx0XHR7XHJcblx0XHRcdFx0XHRcdFx0d2lkZ2V0OiBcImlucHV0XCIsXHJcblx0XHRcdFx0XHRcdFx0YmluZDogYXV0aCxcclxuXHRcdFx0XHRcdFx0XHRwcm9wOiBcInBhc3N3b3JkXCIsXHJcblx0XHRcdFx0XHRcdFx0dHlwZTogXCJwYXNzd29yZFwiLFxyXG5cdFx0XHRcdFx0XHRcdHBsYWNlaG9sZGVyOiBcIlBhc3N3b3JkXCJcclxuXHRcdFx0XHRcdFx0fVxyXG5cdFx0XHRcdFx0XVxyXG5cdFx0XHRcdH0sXHJcblx0XHRcdFx0e1xyXG5cdFx0XHRcdFx0dGFnOiBcImJ1dHRvblwiLFxyXG5cdFx0XHRcdFx0dGV4dDogXCJMb2dpblwiLFxyXG5cdFx0XHRcdFx0Y2xhc3NlczogXCJmYW5jeS1idXR0b25cIixcclxuXHRcdFx0XHRcdGF0dHJzOiB7XHJcblx0XHRcdFx0XHRcdHR5cGU6IFwic3VibWl0XCJcclxuXHRcdFx0XHRcdH1cclxuXHRcdFx0XHR9LFxyXG5cdFx0XHRcdHtcclxuXHRcdFx0XHRcdGNsYXNzZXM6IFwiZXJyb3ItbXNnXCIsXHJcblx0XHRcdFx0XHRuYW1lOiBcIm1zZ1wiXHJcblx0XHRcdFx0fVxyXG5cdFx0XHRdLFxyXG5cdFx0XHRvbjoge1xyXG5cdFx0XHRcdHN1Ym1pdDogZSA9PiB7XHJcblx0XHRcdFx0XHRlLnByZXZlbnREZWZhdWx0KCk7XHJcblxyXG5cdFx0XHRcdFx0Ly8gc2VuZCB0aGUgbG9naW4gcmVxdWVzdFxyXG5cdFx0XHRcdFx0ZmV0Y2goXCIvYXBpL2F1dGgvbG9naW5cIiwge1xyXG5cdFx0XHRcdFx0XHRtZXRob2Q6IFwiUE9TVFwiLFxyXG5cdFx0XHRcdFx0XHRjcmVkZW50aWFsczogXCJpbmNsdWRlXCIsXHJcblx0XHRcdFx0XHRcdGJvZHk6IEpTT04uc3RyaW5naWZ5KGF1dGgpXHJcblx0XHRcdFx0XHR9KVxyXG5cclxuXHRcdFx0XHRcdC8vIHBhcnNlIHRoZSBqc29uXHJcblx0XHRcdFx0XHQudGhlbihyZXMgPT4gcmVzLmpzb24oKSlcclxuXHJcblx0XHRcdFx0XHQvLyBwcm9jZXNzIHRoZSByZXNwb25zZVxyXG5cdFx0XHRcdFx0LnRoZW4ocmVzID0+IHtcclxuXHRcdFx0XHRcdFx0Ly8gbG9naW4gc3VjZWVkZWQgZ28gaG9tZVxyXG5cdFx0XHRcdFx0XHRpZihyZXMuc3RhdHVzID09IFwic3VjY2Vzc1wiKSB7XHJcblx0XHRcdFx0XHRcdFx0bGlmZUxpbmUubmF2Lm5hdmlnYXRlKFwiL1wiKTtcclxuXHJcblx0XHRcdFx0XHRcdFx0Ly8gc3luYyBub3cgdGhhdCB3ZSBhcmUgbG9nZ2VkIGluXHJcblx0XHRcdFx0XHRcdFx0aWYobGlmZUxpbmUuc3luYykge1xyXG5cdFx0XHRcdFx0XHRcdFx0bGlmZUxpbmUuc3luYygpO1xyXG5cdFx0XHRcdFx0XHRcdH1cclxuXHJcblx0XHRcdFx0XHRcdFx0cmV0dXJuO1xyXG5cdFx0XHRcdFx0XHR9XHJcblxyXG5cdFx0XHRcdFx0XHQvLyBsb2dpbiBmYWlsZWRcclxuXHRcdFx0XHRcdFx0aWYocmVzLnN0YXR1cyA9PSBcImZhaWxcIikge1xyXG5cdFx0XHRcdFx0XHRcdGVycm9yTXNnKFwiTG9naW4gZmFpbGVkXCIpO1xyXG5cdFx0XHRcdFx0XHR9XHJcblx0XHRcdFx0XHR9KTtcclxuXHRcdFx0XHR9XHJcblx0XHRcdH1cclxuXHRcdH0pO1xyXG5cclxuXHRcdC8vIGRpc3BsYXkgYW4gZXJyb3IgbWVzc2FnZVxyXG5cdFx0dmFyIGVycm9yTXNnID0gZnVuY3Rpb24odGV4dCkge1xyXG5cdFx0XHRtc2cuaW5uZXJUZXh0ID0gdGV4dDtcclxuXHRcdH07XHJcblx0fVxyXG59KTtcclxuXHJcbi8vIGxvZ291dFxyXG5saWZlTGluZS5sb2dvdXQgPSBmdW5jdGlvbigpIHtcclxuXHQvLyBzZW5kIHRoZSBsb2dvdXQgcmVxdWVzdFxyXG5cdGZldGNoKFwiL2FwaS9hdXRoL2xvZ291dFwiLCB7XHJcblx0XHRjcmVkZW50aWFsczogXCJpbmNsdWRlXCJcclxuXHR9KVxyXG5cclxuXHQvLyBnbyB0byB0aGUgbG9naW4gcGFnZVxyXG5cdC50aGVuKCgpID0+IGxpZmVMaW5lLm5hdi5uYXZpZ2F0ZShcIi9sb2dpblwiKSk7XHJcbn07XHJcbiIsIi8qKlxyXG4gKiBBIGxpc3Qgb2YgdGhpbmdzIHRvZG9cclxuICovXHJcblxyXG52YXIge2RheXNGcm9tTm93LCBpc1NhbWVEYXRlLCBzdHJpbmdpZnlUaW1lfSA9IHJlcXVpcmUoXCIuLi91dGlsL2RhdGVcIik7XHJcbnZhciB7YXNzaWdubWVudHN9ID0gcmVxdWlyZShcIi4uL2RhdGEtc3RvcmVzXCIpO1xyXG5cclxubGlmZUxpbmUubmF2LnJlZ2lzdGVyKHtcclxuXHRtYXRjaGVyOiBcIi9cIixcclxuXHJcblx0bWFrZSh7c2V0VGl0bGUsIGNvbnRlbnQsIGRpc3Bvc2FibGV9KSB7XHJcblx0XHRzZXRUaXRsZShcIlRvZG9cIik7XHJcblxyXG5cdFx0Ly8gbG9hZCB0aGUgaXRlbXNcclxuXHRcdGRpc3Bvc2FibGUuYWRkKFxyXG5cdFx0XHRhc3NpZ25tZW50cy5xdWVyeSh7XHJcblx0XHRcdFx0ZG9uZTogZmFsc2UsXHJcblx0XHRcdFx0Ly8gbWFrZSBzdXJlIHRoZSBhc3NpZ25tZW50IGlzIGluIHRoZSBmdXR1cmVcclxuXHRcdFx0XHRkYXRlOiBkYXRlID0+ICFkYXRlIHx8IG5ldyBEYXRlKGRhdGUpLmdldFRpbWUoKSA+IERhdGUubm93KClcclxuXHRcdFx0fSwgZnVuY3Rpb24oZGF0YSkge1xyXG5cdFx0XHRcdC8vIGNsZWFyIHRoZSBvbGQgY29udGVudFxyXG5cdFx0XHRcdGNvbnRlbnQuaW5uZXJIVE1MID0gXCJcIjtcclxuXHJcblx0XHRcdFx0dmFyIGdyb3VwcyA9IHtcclxuXHRcdFx0XHRcdFRhc2tzOiBbXSxcclxuXHRcdFx0XHRcdFRvZGF5OiBbXSxcclxuXHRcdFx0XHRcdFRvbW9ycm93OiBbXSxcclxuXHRcdFx0XHRcdFVwY29tbWluZzogW11cclxuXHRcdFx0XHR9O1xyXG5cclxuXHRcdFx0XHQvLyB0b2RheSBhbmQgdG9tb3Jyb3dzIGRhdGVzXHJcblx0XHRcdFx0dmFyIHRvZGF5ID0gbmV3IERhdGUoKTtcclxuXHRcdFx0XHR2YXIgdG9tb3Jyb3cgPSBkYXlzRnJvbU5vdygxKTtcclxuXHJcblx0XHRcdFx0Ly8gc29ydCBieSBkYXRlXHJcblx0XHRcdFx0ZGF0YS5zb3J0KChhLCBiKSA9PiB7XHJcblx0XHRcdFx0XHRpZihhLnR5cGUgPT0gXCJhc3NpZ25tZW50XCIgJiYgYi50eXBlID09IFwiYXNzaWdubWVudFwiKSB7XHJcblx0XHRcdFx0XHRcdHJldHVybiBhLmRhdGUuZ2V0VGltZSgpIC0gYi5kYXRlLmdldFRpbWUoKTtcclxuXHRcdFx0XHRcdH1cclxuXHRcdFx0XHR9KTtcclxuXHJcblx0XHRcdFx0Ly8gc2VsZWN0IHRoZSBpdGVtcyB0byBkaXNwbGF5XHJcblx0XHRcdFx0ZGF0YS5mb3JFYWNoKGl0ZW0gPT4ge1xyXG5cdFx0XHRcdFx0Ly8gYXNzaWdubWVudHMgZm9yIHRvZGF5XHJcblx0XHRcdFx0XHRpZihpdGVtLnR5cGUgPT0gXCJhc3NpZ25tZW50XCIpIHtcclxuXHRcdFx0XHRcdFx0Ly8gdG9kYXlcclxuXHRcdFx0XHRcdFx0aWYoaXNTYW1lRGF0ZSh0b2RheSwgaXRlbS5kYXRlKSkge1xyXG5cdFx0XHRcdFx0XHRcdGdyb3Vwcy5Ub2RheS5wdXNoKGNyZWF0ZVVpKGl0ZW0pKTtcclxuXHRcdFx0XHRcdFx0fVxyXG5cdFx0XHRcdFx0XHQvLyB0b21vcnJvd1xyXG5cdFx0XHRcdFx0XHRlbHNlIGlmKGlzU2FtZURhdGUodG9tb3Jyb3csIGl0ZW0uZGF0ZSkpIHtcclxuXHRcdFx0XHRcdFx0XHRncm91cHMuVG9tb3Jyb3cucHVzaChjcmVhdGVVaShpdGVtKSk7XHJcblx0XHRcdFx0XHRcdH1cclxuXHRcdFx0XHRcdFx0Ly8gYWRkIHVwY29tbWluZyBpdGVtc1xyXG5cdFx0XHRcdFx0XHRlbHNlIGlmKGdyb3Vwcy5VcGNvbW1pbmcubGVuZ3RoIDwgNSkge1xyXG5cdFx0XHRcdFx0XHRcdGdyb3Vwcy5VcGNvbW1pbmcucHVzaChjcmVhdGVVaShpdGVtKSk7XHJcblx0XHRcdFx0XHRcdH1cclxuXHRcdFx0XHRcdH1cclxuXHJcblx0XHRcdFx0XHQvLyBzaG93IGFueSB0YXNrc1xyXG5cdFx0XHRcdFx0aWYoaXRlbS50eXBlID09IFwidGFza1wiKSB7XHJcblx0XHRcdFx0XHRcdGdyb3Vwcy5UYXNrcy5wdXNoKGNyZWF0ZVVpKGl0ZW0pKTtcclxuXHRcdFx0XHRcdH1cclxuXHRcdFx0XHR9KTtcclxuXHJcblx0XHRcdFx0Ly8gcmVtb3ZlIGFueSBlbXB0eSBmaWVsZHNcclxuXHRcdFx0XHRPYmplY3QuZ2V0T3duUHJvcGVydHlOYW1lcyhncm91cHMpXHJcblxyXG5cdFx0XHRcdC5mb3JFYWNoKG5hbWUgPT4ge1xyXG5cdFx0XHRcdFx0Ly8gcmVtb3ZlIGVtcHR5IGdyb3Vwc1xyXG5cdFx0XHRcdFx0aWYoZ3JvdXBzW25hbWVdLmxlbmd0aCA9PT0gMCkge1xyXG5cdFx0XHRcdFx0XHRkZWxldGUgZ3JvdXBzW25hbWVdO1xyXG5cdFx0XHRcdFx0fVxyXG5cdFx0XHRcdH0pO1xyXG5cclxuXHRcdFx0XHQvLyByZW5kZXIgdGhlIGxpc3RcclxuXHRcdFx0XHRsaWZlTGluZS5tYWtlRG9tKHtcclxuXHRcdFx0XHRcdHBhcmVudDogY29udGVudCxcclxuXHRcdFx0XHRcdHdpZGdldDogXCJsaXN0XCIsXHJcblx0XHRcdFx0XHRpdGVtczogZ3JvdXBzXHJcblx0XHRcdFx0fSk7XHJcblx0XHRcdH0pXHJcblx0XHQpO1xyXG5cdH1cclxufSk7XHJcblxyXG4vLyBjcmVhdGUgYSBsaXN0IGl0ZW1cclxudmFyIGNyZWF0ZVVpID0gZnVuY3Rpb24oaXRlbSkge1xyXG5cdC8vIHJlbmRlciBhIHRhc2tcclxuXHRpZihpdGVtLnR5cGUgPT0gXCJ0YXNrXCIpIHtcclxuXHRcdHJldHVybiB7XHJcblx0XHRcdGhyZWY6IGAvaXRlbS8ke2l0ZW0uaWR9YCxcclxuXHRcdFx0aXRlbXM6IFtcclxuXHRcdFx0XHR7XHJcblx0XHRcdFx0XHR0ZXh0OiBpdGVtLm5hbWUsXHJcblx0XHRcdFx0XHRncm93OiB0cnVlXHJcblx0XHRcdFx0fVxyXG5cdFx0XHRdXHJcblx0XHR9O1xyXG5cdH1cclxuXHQvLyByZW5kZXIgYW4gaXRlbVxyXG5cdGVsc2Uge1xyXG5cdFx0cmV0dXJuIHtcclxuXHRcdFx0aHJlZjogYC9pdGVtLyR7aXRlbS5pZH1gLFxyXG5cdFx0XHRpdGVtczogW1xyXG5cdFx0XHRcdHtcclxuXHRcdFx0XHRcdHRleHQ6IGl0ZW0ubmFtZSxcclxuXHRcdFx0XHRcdGdyb3c6IHRydWVcclxuXHRcdFx0XHR9LFxyXG5cdFx0XHRcdHN0cmluZ2lmeVRpbWUoaXRlbS5kYXRlKSxcclxuXHRcdFx0XHRpdGVtLmNsYXNzXHJcblx0XHRcdF1cclxuXHRcdH07XHJcblx0fVxyXG59O1xyXG4iLCIvKipcclxuICogQSBwYWdlIHdpdGggbGlua3MgdG8gYWxsIHVzZXJzXHJcbiAqL1xyXG5cclxubGlmZUxpbmUubmF2LnJlZ2lzdGVyKHtcclxuXHRtYXRjaGVyOiBcIi91c2Vyc1wiLFxyXG5cclxuXHRtYWtlKHtzZXRUaXRsZSwgY29udGVudH0pIHtcclxuXHRcdHNldFRpdGxlKFwiQWxsIHVzZXJzXCIpO1xyXG5cclxuXHRcdC8vIGxvYWQgdGhlIGxpc3Qgb2YgdXNlcnNcclxuXHRcdGZldGNoKFwiL2FwaS9hdXRoL2luZm8vdXNlcnNcIiwge1xyXG5cdFx0XHRjcmVkZW50aWFsczogXCJpbmNsdWRlXCJcclxuXHRcdH0pXHJcblxyXG5cdFx0LnRoZW4ocmVzID0+IHJlcy5qc29uKCkpXHJcblxyXG5cdFx0LnRoZW4oKHtzdGF0dXMsIGRhdGE6IHVzZXJzfSkgPT4ge1xyXG5cdFx0XHQvLyBub3QgYXV0aGVudGljYXRlZFxyXG5cdFx0XHRpZihzdGF0dXMgPT0gXCJmYWlsXCIpIHtcclxuXHRcdFx0XHRsaWZlTGluZS5tYWtlRG9tKHtcclxuXHRcdFx0XHRcdHBhcmVudDogY29udGVudCxcclxuXHRcdFx0XHRcdGNsYXNzZXM6IFwiY29udGVudC1wYWRkZWRcIixcclxuXHRcdFx0XHRcdHRleHQ6IFwiWW91IGRvIG5vdCBoYXZlIGFjY2VzcyB0byB0aGUgdXNlciBsaXN0XCJcclxuXHRcdFx0XHR9KTtcclxuXHJcblx0XHRcdFx0cmV0dXJuO1xyXG5cdFx0XHR9XHJcblxyXG5cdFx0XHQvLyBzb3J0IGJ5IGFkbWluIHN0YXR1c1xyXG5cdFx0XHR1c2Vycy5zb3J0KChhLCBiKSA9PiB7XHJcblx0XHRcdFx0Ly8gc29ydCBhZG1pbnNcclxuXHRcdFx0XHRpZihhLmFkbWluICYmICFiLmFkbWluKSByZXR1cm4gLTE7XHJcblx0XHRcdFx0aWYoIWEuYWRtaW4gJiYgYi5hZG1pbikgcmV0dXJuIDE7XHJcblxyXG5cdFx0XHRcdC8vIHNvcnQgYnkgdXNlcm5hbWVcclxuXHRcdFx0XHRpZihhLnVzZXJuYW1lIDwgYi51c2VybmFtZSkgcmV0dXJuIC0xO1xyXG5cdFx0XHRcdGlmKGEudXNlcm5hbWUgPiBiLnVzZXJuYW1lKSByZXR1cm4gMTtcclxuXHJcblx0XHRcdFx0cmV0dXJuIDA7XHJcblx0XHRcdH0pO1xyXG5cclxuXHRcdFx0dmFyIGRpc3BsYXlVc2VycyA9IHtcclxuXHRcdFx0XHRBZG1pbnM6IFtdLFxyXG5cdFx0XHRcdFVzZXJzOiBbXVxyXG5cdFx0XHR9O1xyXG5cclxuXHRcdFx0Ly8gZ2VuZXJhdGUgdGhlIHVzZXIgbGlzdFxyXG5cdFx0XHR1c2Vycy5mb3JFYWNoKHVzZXIgPT4ge1xyXG5cdFx0XHRcdC8vIHNvcnQgdGhlIHVzZXJzIGludG8gYWRtaW5zIGFuZCB1c2Vyc1xyXG5cdFx0XHRcdGRpc3BsYXlVc2Vyc1t1c2VyLmFkbWluID8gXCJBZG1pbnNcIiA6IFwiVXNlcnNcIl1cclxuXHJcblx0XHRcdFx0LnB1c2goe1xyXG5cdFx0XHRcdFx0aHJlZjogYC91c2VyLyR7dXNlci51c2VybmFtZX1gLFxyXG5cdFx0XHRcdFx0aXRlbXM6IFt7XHJcblx0XHRcdFx0XHRcdHRleHQ6IHVzZXIudXNlcm5hbWUsXHJcblx0XHRcdFx0XHRcdGdyb3c6IHRydWVcclxuXHRcdFx0XHRcdH1dXHJcblx0XHRcdFx0fSk7XHJcblx0XHRcdH0pO1xyXG5cclxuXHRcdFx0Ly8gZGlzcGxheSB0aGUgdXNlciBsaXN0XHJcblx0XHRcdGxpZmVMaW5lLm1ha2VEb20oe1xyXG5cdFx0XHRcdHBhcmVudDogY29udGVudCxcclxuXHRcdFx0XHR3aWRnZXQ6IFwibGlzdFwiLFxyXG5cdFx0XHRcdGl0ZW1zOiBkaXNwbGF5VXNlcnNcclxuXHRcdFx0fSk7XHJcblx0XHR9KVxyXG5cclxuXHRcdC8vIHNvbWV0aGluZyB3ZW50IHdyb25nIHNob3cgYW4gZXJyb3IgbWVzc2FnZVxyXG5cdFx0LmNhdGNoKGVyciA9PiB7XHJcblx0XHRcdGxpZmVMaW5lLm1ha2VEb20oe1xyXG5cdFx0XHRcdGNsYXNzZXM6IFwiY29udGVudC1wYWRkZWRcIixcclxuXHRcdFx0XHR0ZXh0OiBlcnIubWVzc2FnZVxyXG5cdFx0XHR9KTtcclxuXHRcdH0pO1xyXG5cdH1cclxufSk7XHJcbiIsIi8qKlxyXG4gKiBUaGUgbWFpbiBjb250ZW50IHBhbmUgZm9yIHRoZSBhcHBcclxuICovXHJcblxyXG5saWZlTGluZS5tYWtlRG9tLnJlZ2lzdGVyKFwiY29udGVudFwiLCB7XHJcblx0bWFrZSgpIHtcclxuXHRcdHJldHVybiBbXHJcblx0XHRcdHtcclxuXHRcdFx0XHRjbGFzc2VzOiBcInRvb2xiYXJcIixcclxuXHRcdFx0XHRjaGlsZHJlbjogW1xyXG5cdFx0XHRcdFx0e1xyXG5cdFx0XHRcdFx0XHR0YWc6IFwic3ZnXCIsXHJcblx0XHRcdFx0XHRcdGNsYXNzZXM6IFwibWVudS1pY29uXCIsXHJcblx0XHRcdFx0XHRcdGF0dHJzOiB7XHJcblx0XHRcdFx0XHRcdFx0dmlld0JveDogXCIwIDAgNjAgNTBcIixcclxuXHRcdFx0XHRcdFx0XHR3aWR0aDogXCIyMFwiLFxyXG5cdFx0XHRcdFx0XHRcdGhlaWdodDogXCIxNVwiXHJcblx0XHRcdFx0XHRcdH0sXHJcblx0XHRcdFx0XHRcdGNoaWxkcmVuOiBbXHJcblx0XHRcdFx0XHRcdFx0eyB0YWc6IFwibGluZVwiLCBhdHRyczogeyB4MTogXCIwXCIsIHkxOiBcIjVcIiwgeDI6IFwiNjBcIiwgeTI6IFwiNVwiIH0gfSxcclxuXHRcdFx0XHRcdFx0XHR7IHRhZzogXCJsaW5lXCIsIGF0dHJzOiB7IHgxOiBcIjBcIiwgeTE6IFwiMjVcIiwgeDI6IFwiNjBcIiwgeTI6IFwiMjVcIiB9IH0sXHJcblx0XHRcdFx0XHRcdFx0eyB0YWc6IFwibGluZVwiLCBhdHRyczogeyB4MTogXCIwXCIsIHkxOiBcIjQ1XCIsIHgyOiBcIjYwXCIsIHkyOiBcIjQ1XCIgfSB9XHJcblx0XHRcdFx0XHRcdF0sXHJcblx0XHRcdFx0XHRcdG9uOiB7XHJcblx0XHRcdFx0XHRcdFx0Y2xpY2s6ICgpID0+IGRvY3VtZW50LmJvZHkuY2xhc3NMaXN0LnRvZ2dsZShcInNpZGViYXItb3BlblwiKVxyXG5cdFx0XHRcdFx0XHR9XHJcblx0XHRcdFx0XHR9LFxyXG5cdFx0XHRcdFx0e1xyXG5cdFx0XHRcdFx0XHRjbGFzc2VzOiBcInRvb2xiYXItdGl0bGVcIixcclxuXHRcdFx0XHRcdFx0bmFtZTogXCJ0aXRsZVwiXHJcblx0XHRcdFx0XHR9LFxyXG5cdFx0XHRcdFx0e1xyXG5cdFx0XHRcdFx0XHRjbGFzc2VzOiBcInRvb2xiYXItYnV0dG9uc1wiLFxyXG5cdFx0XHRcdFx0XHRuYW1lOiBcImJ0bnNcIlxyXG5cdFx0XHRcdFx0fVxyXG5cdFx0XHRcdF1cclxuXHRcdFx0fSxcclxuXHRcdFx0e1xyXG5cdFx0XHRcdGNsYXNzZXM6IFwiY29udGVudFwiLFxyXG5cdFx0XHRcdG5hbWU6IFwiY29udGVudFwiXHJcblx0XHRcdH1cclxuXHRcdF07XHJcblx0fSxcclxuXHJcblx0YmluZChvcHRzLCB7dGl0bGUsIGJ0bnMsIGNvbnRlbnR9KSB7XHJcblx0XHR2YXIgZGlzcG9zYWJsZTtcclxuXHJcblx0XHQvLyBzZXQgdGhlIHBhZ2UgdGl0bGVcclxuXHRcdHZhciBzZXRUaXRsZSA9IGZ1bmN0aW9uKHRpdGxlVGV4dCkge1xyXG5cdFx0XHR0aXRsZS5pbm5lclRleHQgPSB0aXRsZVRleHQ7XHJcblx0XHRcdGRvY3VtZW50LnRpdGxlID0gdGl0bGVUZXh0O1xyXG5cdFx0fTtcclxuXHJcblx0XHQvLyBhZGQgYW4gYWN0aW9uIGJ1dHRvblxyXG5cdFx0bGlmZUxpbmUub24oXCJhY3Rpb24tY3JlYXRlXCIsIG5hbWUgPT4ge1xyXG5cdFx0XHRsaWZlTGluZS5tYWtlRG9tKHtcclxuXHRcdFx0XHRwYXJlbnQ6IGJ0bnMsXHJcblx0XHRcdFx0dGFnOiBcImJ1dHRvblwiLFxyXG5cdFx0XHRcdGNsYXNzZXM6IFwidG9vbGJhci1idXR0b25cIixcclxuXHRcdFx0XHR0ZXh0OiBuYW1lLFxyXG5cdFx0XHRcdGF0dHJzOiB7XHJcblx0XHRcdFx0XHRcImRhdGEtbmFtZVwiOiBuYW1lXHJcblx0XHRcdFx0fSxcclxuXHRcdFx0XHRvbjoge1xyXG5cdFx0XHRcdFx0Y2xpY2s6ICgpID0+IGxpZmVMaW5lLmVtaXQoXCJhY3Rpb24tZXhlYy1cIiArIG5hbWUpXHJcblx0XHRcdFx0fVxyXG5cdFx0XHR9KTtcclxuXHRcdH0pO1xyXG5cclxuXHRcdC8vIHJlbW92ZSBhbiBhY3Rpb24gYnV0dG9uXHJcblx0XHRsaWZlTGluZS5vbihcImFjdGlvbi1yZW1vdmVcIiwgbmFtZSA9PiB7XHJcblx0XHRcdHZhciBidG4gPSBidG5zLnF1ZXJ5U2VsZWN0b3IoYFtkYXRhLW5hbWU9XCIke25hbWV9XCJdYCk7XHJcblxyXG5cdFx0XHRpZihidG4pIGJ0bi5yZW1vdmUoKTtcclxuXHRcdH0pO1xyXG5cclxuXHRcdC8vIHJlbW92ZSBhbGwgdGhlIGFjdGlvbiBidXR0b25zXHJcblx0XHRsaWZlTGluZS5vbihcImFjdGlvbi1yZW1vdmUtYWxsXCIsICgpID0+IGJ0bnMuaW5uZXJIVE1MID0gXCJcIik7XHJcblxyXG5cdFx0Ly8gZGlzcGxheSB0aGUgY29udGVudCBmb3IgdGhlIHZpZXdcclxuXHRcdHZhciB1cGRhdGVWaWV3ID0gKCkgPT4ge1xyXG5cdFx0XHQvLyBkZXN0cm95IGFueSBsaXN0ZW5lcnMgZnJvbSBvbGQgY29udGVudFxyXG5cdFx0XHRpZihkaXNwb3NhYmxlKSB7XHJcblx0XHRcdFx0ZGlzcG9zYWJsZS5kaXNwb3NlKCk7XHJcblx0XHRcdH1cclxuXHJcblx0XHRcdC8vIHJlbW92ZSBhbnkgYWN0aW9uIGJ1dHRvbnNcclxuXHRcdFx0bGlmZUxpbmUuZW1pdChcImFjdGlvbi1yZW1vdmUtYWxsXCIpO1xyXG5cclxuXHRcdFx0Ly8gY2xlYXIgYWxsIHRoZSBvbGQgY29udGVudFxyXG5cdFx0XHRjb250ZW50LmlubmVySFRNTCA9IFwiXCI7XHJcblxyXG5cdFx0XHQvLyBjcmVhdGUgdGhlIGRpc3Bvc2FibGUgZm9yIHRoZSBjb250ZW50XHJcblx0XHRcdGRpc3Bvc2FibGUgPSBuZXcgbGlmZUxpbmUuRGlzcG9zYWJsZSgpO1xyXG5cclxuXHRcdFx0dmFyIG1ha2VyID0gbm90Rm91bmRNYWtlciwgbWF0Y2g7XHJcblxyXG5cdFx0XHQvLyBmaW5kIHRoZSBjb3JyZWN0IGNvbnRlbnQgbWFrZXJcclxuXHRcdFx0Zm9yKGxldCAkbWFrZXIgb2YgY29udGVudE1ha2Vycykge1xyXG5cdFx0XHRcdC8vIHJ1biBhIG1hdGNoZXIgZnVuY3Rpb25cclxuXHRcdFx0XHRpZih0eXBlb2YgJG1ha2VyLm1hdGNoZXIgPT0gXCJmdW5jdGlvblwiKSB7XHJcblx0XHRcdFx0XHRtYXRjaCA9ICRtYWtlci5tYXRjaGVyKGxvY2F0aW9uLnBhdGhuYW1lKTtcclxuXHRcdFx0XHR9XHJcblx0XHRcdFx0Ly8gYSBzdHJpbmcgbWF0Y2hcclxuXHRcdFx0XHRlbHNlIGlmKHR5cGVvZiAkbWFrZXIubWF0Y2hlciA9PSBcInN0cmluZ1wiKSB7XHJcblx0XHRcdFx0XHRpZigkbWFrZXIubWF0Y2hlciA9PSBsb2NhdGlvbi5wYXRobmFtZSkge1xyXG5cdFx0XHRcdFx0XHRtYXRjaCA9ICRtYWtlci5tYXRjaGVyO1xyXG5cdFx0XHRcdFx0fVxyXG5cdFx0XHRcdH1cclxuXHRcdFx0XHQvLyBhIHJlZ2V4IG1hdGNoXHJcblx0XHRcdFx0ZWxzZSB7XHJcblx0XHRcdFx0XHRtYXRjaCA9ICRtYWtlci5tYXRjaGVyLmV4ZWMobG9jYXRpb24ucGF0aG5hbWUpO1xyXG5cdFx0XHRcdH1cclxuXHJcblx0XHRcdFx0Ly8gbWF0Y2ggZm91bmQgc3RvcCBzZWFyY2hpbmdcclxuXHRcdFx0XHRpZihtYXRjaCkge1xyXG5cdFx0XHRcdFx0bWFrZXIgPSAkbWFrZXI7XHJcblxyXG5cdFx0XHRcdFx0YnJlYWs7XHJcblx0XHRcdFx0fVxyXG5cdFx0XHR9XHJcblxyXG5cdFx0XHQvLyBtYWtlIHRoZSBjb250ZW50IGZvciB0aGlzIHJvdXRlXHJcblx0XHRcdG1ha2VyLm1ha2Uoe2Rpc3Bvc2FibGUsIHNldFRpdGxlLCBjb250ZW50LCBtYXRjaH0pO1xyXG5cdFx0fTtcclxuXHJcblx0XHQvLyBzd2l0Y2ggcGFnZXNcclxuXHRcdGxpZmVMaW5lLm5hdi5uYXZpZ2F0ZSA9IGZ1bmN0aW9uKHVybCkge1xyXG5cdFx0XHQvLyB1cGRhdGUgdGhlIHVybFxyXG5cdFx0XHRoaXN0b3J5LnB1c2hTdGF0ZShudWxsLCBudWxsLCB1cmwpO1xyXG5cclxuXHRcdFx0Ly8gc2hvdyB0aGUgbmV3IHZpZXdcclxuXHRcdFx0dXBkYXRlVmlldygpO1xyXG5cdFx0fTtcclxuXHJcblx0XHQvLyBzd2l0Y2ggcGFnZXMgd2hlbiB0aGUgdXNlciBwdXNoZXMgdGhlIGJhY2sgYnV0dG9uXHJcblx0XHR3aW5kb3cuYWRkRXZlbnRMaXN0ZW5lcihcInBvcHN0YXRlXCIsICgpID0+IHVwZGF0ZVZpZXcoKSk7XHJcblxyXG5cdFx0Ly8gc2hvdyB0aGUgaW5pdGlhbCB2aWV3XHJcblx0XHR1cGRhdGVWaWV3KCk7XHJcblx0fVxyXG59KTtcclxuXHJcbi8vIGFsbCBjb250ZW50IHByb2R1Y2Vyc1xyXG52YXIgY29udGVudE1ha2VycyA9IFtdO1xyXG5cclxuLy8gY3JlYXRlIHRoZSBuYW1lc3BhY2VcclxubGlmZUxpbmUubmF2ID0ge307XHJcblxyXG4vLyByZWdpc3RlciBhIGNvbnRlbnQgbWFrZXJcclxubGlmZUxpbmUubmF2LnJlZ2lzdGVyID0gZnVuY3Rpb24obWFrZXIpIHtcclxuXHRjb250ZW50TWFrZXJzLnB1c2gobWFrZXIpO1xyXG59O1xyXG5cclxuLy8gdGhlIGZhbGwgYmFjayBtYWtlciBmb3Igbm8gc3VjaCBwYWdlXHJcbnZhciBub3RGb3VuZE1ha2VyID0ge1xyXG5cdG1ha2Uoe3NldFRpdGxlLCBjb250ZW50fSkge1xyXG5cdFx0Ly8gdXBkYXRlIHRoZSBwYWdlIHRpdGxlXHJcblx0XHRzZXRUaXRsZShcIk5vdCBmb3VuZFwiKTtcclxuXHJcblx0XHRsaWZlTGluZS5tYWtlRG9tKHtcclxuXHRcdFx0cGFyZW50OiBjb250ZW50LFxyXG5cdFx0XHRjbGFzc2VzOiBcImNvbnRlbnQtcGFkZGVkXCIsXHJcblx0XHRcdGNoaWxkcmVuOiBbXHJcblx0XHRcdFx0e1xyXG5cdFx0XHRcdFx0dGFnOiBcInNwYW5cIixcclxuXHRcdFx0XHRcdHRleHQ6IFwiVGhlIHBhZ2UgeW91IGFyZSBsb29raW5nIGZvciBjb3VsZCBub3QgYmUgZm91bmQuIFwiXHJcblx0XHRcdFx0fSxcclxuXHRcdFx0XHR7XHJcblx0XHRcdFx0XHR3aWRnZXQ6IFwibGlua1wiLFxyXG5cdFx0XHRcdFx0aHJlZjogXCIvXCIsXHJcblx0XHRcdFx0XHR0ZXh0OiBcIkdvIGhvbWVcIlxyXG5cdFx0XHRcdH1cclxuXHRcdFx0XVxyXG5cdFx0fSk7XHJcblx0fVxyXG59O1xyXG4iLCIvKipcclxuICogQ3JlYXRlIGFuIGlucHV0IGZpZWxkXHJcbiAqL1xyXG5cclxubGlmZUxpbmUubWFrZURvbS5yZWdpc3RlcihcImlucHV0XCIsIHtcclxuXHRtYWtlKHt0YWcsIHR5cGUsIHZhbHVlLCBjaGFuZ2UsIGJpbmQsIHByb3AsIHBsYWNlaG9sZGVyLCBjbGFzc2VzfSkge1xyXG5cdFx0Ly8gc2V0IHRoZSBpbml0aWFsIHZhbHVlIG9mIHRoZSBib3VuZCBvYmplY3RcclxuXHRcdGlmKHR5cGVvZiBiaW5kID09IFwib2JqZWN0XCIgJiYgIXZhbHVlKSB7XHJcblx0XHRcdHZhbHVlID0gYmluZFtwcm9wXTtcclxuXHRcdH1cclxuXHJcblx0XHR2YXIgaW5wdXQgPSB7XHJcblx0XHRcdHRhZzogdGFnIHx8IFwiaW5wdXRcIixcclxuXHRcdFx0Y2xhc3NlczogY2xhc3NlcyB8fCBgJHt0YWcgPT0gXCJ0ZXh0YXJlYVwiID8gXCJ0ZXh0YXJlYVwiIDogXCJpbnB1dFwifS1maWxsYCxcclxuXHRcdFx0YXR0cnM6IHt9LFxyXG5cdFx0XHRvbjoge1xyXG5cdFx0XHRcdGlucHV0OiBlID0+IHtcclxuXHRcdFx0XHRcdC8vIHVwZGF0ZSB0aGUgcHJvcGVydHkgY2hhbmdlZFxyXG5cdFx0XHRcdFx0aWYodHlwZW9mIGJpbmQgPT0gXCJvYmplY3RcIikge1xyXG5cdFx0XHRcdFx0XHRiaW5kW3Byb3BdID0gZS50YXJnZXQudmFsdWU7XHJcblx0XHRcdFx0XHR9XHJcblxyXG5cdFx0XHRcdFx0Ly8gY2FsbCB0aGUgY2FsbGJhY2tcclxuXHRcdFx0XHRcdGlmKHR5cGVvZiBjaGFuZ2UgPT0gXCJmdW5jdGlvblwiKSB7XHJcblx0XHRcdFx0XHRcdGNoYW5nZShlLnRhcmdldC52YWx1ZSk7XHJcblx0XHRcdFx0XHR9XHJcblx0XHRcdFx0fVxyXG5cdFx0XHR9XHJcblx0XHR9O1xyXG5cclxuXHRcdC8vIGF0dGFjaCB2YWx1ZXMgaWYgdGhleSBhcmUgZ2l2ZW5cclxuXHRcdGlmKHR5cGUpIGlucHV0LmF0dHJzLnR5cGUgPSB0eXBlO1xyXG5cdFx0aWYodmFsdWUpIGlucHV0LmF0dHJzLnZhbHVlID0gdmFsdWU7XHJcblx0XHRpZihwbGFjZWhvbGRlcikgaW5wdXQuYXR0cnMucGxhY2Vob2xkZXIgPSBwbGFjZWhvbGRlcjtcclxuXHJcblx0XHQvLyBmb3IgdGV4dGFyZWFzIHNldCBpbm5lclRleHRcclxuXHRcdGlmKHRhZyA9PSBcInRleHRhcmVhXCIpIHtcclxuXHRcdFx0aW5wdXQudGV4dCA9IHZhbHVlO1xyXG5cdFx0fVxyXG5cclxuXHRcdHJldHVybiBpbnB1dDtcclxuXHR9XHJcbn0pO1xyXG4iLCIvKipcclxuICogQSB3aWRnZXQgdGhhdCBjcmVhdGVzIGEgbGluayB0aGF0IGhvb2tzIGludG8gdGhlIG5hdmlnYXRvclxyXG4gKi9cclxuXHJcbmxpZmVMaW5lLm1ha2VEb20ucmVnaXN0ZXIoXCJsaW5rXCIsIHtcclxuXHRtYWtlKG9wdHMpIHtcclxuXHRcdHJldHVybiB7XHJcblx0XHRcdHRhZzogXCJhXCIsXHJcblx0XHRcdGF0dHJzOiB7XHJcblx0XHRcdFx0aHJlZjogb3B0cy5ocmVmXHJcblx0XHRcdH0sXHJcblx0XHRcdG9uOiB7XHJcblx0XHRcdFx0Y2xpY2s6IGUgPT4ge1xyXG5cdFx0XHRcdFx0Ly8gZG9uJ3Qgb3ZlciByaWRlIGN0cmwgb3IgYWx0IG9yIHNoaWZ0IGNsaWNrc1xyXG5cdFx0XHRcdFx0aWYoZS5jdHJsS2V5IHx8IGUuYWx0S2V5IHx8IGUuc2hpZnRLZXkpIHJldHVybjtcclxuXHJcblx0XHRcdFx0XHQvLyBkb24ndCBuYXZpZ2F0ZSB0aGUgcGFnZVxyXG5cdFx0XHRcdFx0ZS5wcmV2ZW50RGVmYXVsdCgpO1xyXG5cclxuXHRcdFx0XHRcdGxpZmVMaW5lLm5hdi5uYXZpZ2F0ZShvcHRzLmhyZWYpXHJcblx0XHRcdFx0fVxyXG5cdFx0XHR9LFxyXG5cdFx0XHR0ZXh0OiBvcHRzLnRleHRcclxuXHRcdH07XHJcblx0fVxyXG59KTtcclxuIiwiLyoqXHJcbiAqIERpc3BsYXkgYSBsaXN0IHdpdGggZ3JvdXAgaGVhZGluZ3NcclxuICovXHJcblxyXG5saWZlTGluZS5tYWtlRG9tLnJlZ2lzdGVyKFwibGlzdFwiLCB7XHJcblx0bWFrZSh7aXRlbXN9KSB7XHJcblx0XHQvLyBhZGQgYWxsIHRoZSBncm91cHNcclxuXHRcdHJldHVybiBPYmplY3QuZ2V0T3duUHJvcGVydHlOYW1lcyhpdGVtcylcclxuXHJcblx0XHQubWFwKGdyb3VwTmFtZSA9PiBtYWtlR3JvdXAoZ3JvdXBOYW1lLCBpdGVtc1tncm91cE5hbWVdKSk7XHJcblx0fVxyXG59KTtcclxuXHJcbi8vIG1ha2UgYSBzaW5nbGUgZ3JvdXBcclxudmFyIG1ha2VHcm91cCA9IGZ1bmN0aW9uKG5hbWUsIGl0ZW1zLCBwYXJlbnQpIHtcclxuXHQvLyBhZGQgdGhlIGxpc3QgaGVhZGVyXHJcblx0aXRlbXMudW5zaGlmdCh7XHJcblx0XHRjbGFzc2VzOiBcImxpc3QtaGVhZGVyXCIsXHJcblx0XHR0ZXh0OiBuYW1lXHJcblx0fSk7XHJcblxyXG5cdC8vIHJlbmRlciB0aGUgaXRlbVxyXG5cdHJldHVybiB7XHJcblx0XHRwYXJlbnQsXHJcblx0XHRjbGFzc2VzOiBcImxpc3Qtc2VjdGlvblwiLFxyXG5cdFx0Y2hpbGRyZW46IGl0ZW1zLm1hcCgoaXRlbSwgaW5kZXgpID0+IHtcclxuXHRcdFx0Ly8gZG9uJ3QgbW9kaWZ5IHRoZSBoZWFkZXJcclxuXHRcdFx0aWYoaW5kZXggPT09IDApIHJldHVybiBpdGVtO1xyXG5cclxuXHRcdFx0dmFyIGl0ZW1Eb207XHJcblxyXG5cdFx0XHQvLyBjcmVhdGUgYW4gaXRlbVxyXG5cdFx0XHRpZih0eXBlb2YgaXRlbSAhPSBcInN0cmluZ1wiKSB7XHJcblx0XHRcdFx0aXRlbURvbSA9IHtcclxuXHRcdFx0XHRcdGNsYXNzZXM6IFwibGlzdC1pdGVtXCIsXHJcblx0XHRcdFx0XHRjaGlsZHJlbjogKGl0ZW0uaXRlbXMgfHwgaXRlbSkubWFwKGl0ZW0gPT4ge1xyXG5cdFx0XHRcdFx0XHRyZXR1cm4ge1xyXG5cdFx0XHRcdFx0XHRcdC8vIGdldCB0aGUgbmFtZSBvZiB0aGUgaXRlbVxyXG5cdFx0XHRcdFx0XHRcdHRleHQ6IHR5cGVvZiBpdGVtID09IFwic3RyaW5nXCIgPyBpdGVtIDogaXRlbS50ZXh0LFxyXG5cdFx0XHRcdFx0XHRcdC8vIHNldCB3aGV0aGVyIHRoZSBpdGVtIHNob3VsZCBncm93XHJcblx0XHRcdFx0XHRcdFx0Y2xhc3NlczogaXRlbS5ncm93ID8gXCJsaXN0LWl0ZW0tZ3Jvd1wiIDogXCJsaXN0LWl0ZW0tcGFydFwiXHJcblx0XHRcdFx0XHRcdH07XHJcblx0XHRcdFx0XHR9KVxyXG5cdFx0XHRcdH07XHJcblx0XHRcdH1cclxuXHRcdFx0ZWxzZSB7XHJcblx0XHRcdFx0aXRlbURvbSA9IHtcclxuXHRcdFx0XHRcdGNsYXNzZXM6IFwibGlzdC1pdGVtXCIsXHJcblx0XHRcdFx0XHR0ZXh0OiBpdGVtXHJcblx0XHRcdFx0fTtcclxuXHRcdFx0fVxyXG5cclxuXHRcdFx0Ly8gbWFrZSB0aGUgaXRlbSBhIGxpbmtcclxuXHRcdFx0aWYoaXRlbS5ocmVmKSB7XHJcblx0XHRcdFx0aXRlbURvbS5vbiA9IHtcclxuXHRcdFx0XHRcdGNsaWNrOiAoKSA9PiBsaWZlTGluZS5uYXYubmF2aWdhdGUoaXRlbS5ocmVmKVxyXG5cdFx0XHRcdH07XHJcblx0XHRcdH1cclxuXHJcblx0XHRcdHJldHVybiBpdGVtRG9tO1xyXG5cdFx0fSlcclxuXHR9O1xyXG59O1xyXG4iLCIvKipcclxuICogVGhlIHdpZGdldCBmb3IgdGhlIHNpZGViYXJcclxuICovXHJcblxyXG5saWZlTGluZS5tYWtlRG9tLnJlZ2lzdGVyKFwic2lkZWJhclwiLCB7XHJcblx0bWFrZSgpIHtcclxuXHRcdHJldHVybiBbXHJcblx0XHRcdHtcclxuXHRcdFx0XHRjbGFzc2VzOiBcInNpZGViYXJcIixcclxuXHRcdFx0XHRuYW1lOiBcInNpZGViYXJcIixcclxuXHRcdFx0XHRjaGlsZHJlbjogW1xyXG5cdFx0XHRcdFx0e1xyXG5cdFx0XHRcdFx0XHRjbGFzc2VzOiBbXCJzaWRlYmFyLWFjdGlvbnNcIiwgXCJoaWRkZW5cIl0sXHJcblx0XHRcdFx0XHRcdG5hbWU6IFwiYWN0aW9uc1wiLFxyXG5cdFx0XHRcdFx0XHRjaGlsZHJlbjogW1xyXG5cdFx0XHRcdFx0XHRcdHtcclxuXHRcdFx0XHRcdFx0XHRcdGNsYXNzZXM6IFwic2lkZWJhci1oZWFkaW5nXCIsXHJcblx0XHRcdFx0XHRcdFx0XHR0ZXh0OiBcIlBhZ2UgYWN0aW9uc1wiXHJcblx0XHRcdFx0XHRcdFx0fVxyXG5cdFx0XHRcdFx0XHRdXHJcblx0XHRcdFx0XHR9LFxyXG5cdFx0XHRcdFx0e1xyXG5cdFx0XHRcdFx0XHRjbGFzc2VzOiBcInNpZGViYXItaGVhZGluZ1wiLFxyXG5cdFx0XHRcdFx0XHR0ZXh0OiBcIk1vcmUgYWN0aW9uc1wiXHJcblx0XHRcdFx0XHR9XHJcblx0XHRcdFx0XVxyXG5cdFx0XHR9LFxyXG5cdFx0XHR7XHJcblx0XHRcdFx0Y2xhc3NlczogXCJzaGFkZVwiLFxyXG5cdFx0XHRcdG9uOiB7XHJcblx0XHRcdFx0XHQvLyBjbG9zZSB0aGUgc2lkZWJhclxyXG5cdFx0XHRcdFx0Y2xpY2s6ICgpID0+IGRvY3VtZW50LmJvZHkuY2xhc3NMaXN0LnJlbW92ZShcInNpZGViYXItb3BlblwiKVxyXG5cdFx0XHRcdH1cclxuXHRcdFx0fVxyXG5cdFx0XTtcclxuXHR9LFxyXG5cclxuXHRiaW5kKG9wdHMsIHthY3Rpb25zLCBzaWRlYmFyfSkge1xyXG5cdFx0Ly8gYWRkIGEgY29tbWFuZCB0byB0aGUgc2lkZWJhclxyXG5cdFx0bGlmZUxpbmUuYWRkQ29tbWFuZCA9IGZ1bmN0aW9uKG5hbWUsIGZuKSB7XHJcblx0XHRcdC8vIG1ha2UgdGhlIHNpZGViYXIgaXRlbVxyXG5cdFx0XHR2YXIge2l0ZW19ID0gbGlmZUxpbmUubWFrZURvbSh7XHJcblx0XHRcdFx0cGFyZW50OiBzaWRlYmFyLFxyXG5cdFx0XHRcdHRhZzogXCJkaXZcIixcclxuXHRcdFx0XHRuYW1lOiBcIml0ZW1cIixcclxuXHRcdFx0XHRjbGFzc2VzOiBcInNpZGViYXItaXRlbVwiLFxyXG5cdFx0XHRcdHRleHQ6IG5hbWUsXHJcblx0XHRcdFx0b246IHtcclxuXHRcdFx0XHRcdGNsaWNrOiAoKSA9PiB7XHJcblx0XHRcdFx0XHRcdC8vIGNsb3NlIHRoZSBzaWRlYmFyXHJcblx0XHRcdFx0XHRcdGRvY3VtZW50LmJvZHkuY2xhc3NMaXN0LnJlbW92ZShcInNpZGViYXItb3BlblwiKTtcclxuXHJcblx0XHRcdFx0XHRcdC8vIGNhbGwgdGhlIGxpc3RlbmVyXHJcblx0XHRcdFx0XHRcdGZuKCk7XHJcblx0XHRcdFx0XHR9XHJcblx0XHRcdFx0fVxyXG5cdFx0XHR9KTtcclxuXHJcblx0XHRcdHJldHVybiB7XHJcblx0XHRcdFx0dW5zdWJzY3JpYmU6ICgpID0+IGl0ZW0ucmVtb3ZlKClcclxuXHRcdFx0fTtcclxuXHRcdH07XHJcblxyXG5cdFx0Ly8gYWRkIGEgbmF2aWdhdGlvbmFsIGNvbW1hbmRcclxuXHRcdGxpZmVMaW5lLmFkZE5hdkNvbW1hbmQgPSBmdW5jdGlvbihuYW1lLCB0bykge1xyXG5cdFx0XHRsaWZlTGluZS5hZGRDb21tYW5kKG5hbWUsICgpID0+IGxpZmVMaW5lLm5hdi5uYXZpZ2F0ZSh0bykpO1xyXG5cdFx0fTtcclxuXHJcblx0XHQvLyBhZGQgYSBzaWRlYmFyIGFjdGlvblxyXG5cdFx0bGlmZUxpbmUub24oXCJhY3Rpb24tY3JlYXRlXCIsIG5hbWUgPT4ge1xyXG5cdFx0XHQvLyBzaG93IHRoZSBhY3Rpb25zXHJcblx0XHRcdGFjdGlvbnMuY2xhc3NMaXN0LnJlbW92ZShcImhpZGRlblwiKTtcclxuXHJcblx0XHRcdC8vIGNyZWF0ZSB0aGUgYnV0dG9uXHJcblx0XHRcdGxpZmVMaW5lLm1ha2VEb20oe1xyXG5cdFx0XHRcdHBhcmVudDogYWN0aW9ucyxcclxuXHRcdFx0XHR0YWc6IFwiZGl2XCIsXHJcblx0XHRcdFx0bmFtZTogXCJpdGVtXCIsXHJcblx0XHRcdFx0Y2xhc3NlczogXCJzaWRlYmFyLWl0ZW1cIixcclxuXHRcdFx0XHR0ZXh0OiBuYW1lLFxyXG5cdFx0XHRcdGF0dHJzOiB7XHJcblx0XHRcdFx0XHRcImRhdGEtbmFtZVwiOiBuYW1lXHJcblx0XHRcdFx0fSxcclxuXHRcdFx0XHRvbjoge1xyXG5cdFx0XHRcdFx0Y2xpY2s6ICgpID0+IHtcclxuXHRcdFx0XHRcdFx0Ly8gY2xvc2UgdGhlIHNpZGViYXJcclxuXHRcdFx0XHRcdFx0ZG9jdW1lbnQuYm9keS5jbGFzc0xpc3QucmVtb3ZlKFwic2lkZWJhci1vcGVuXCIpO1xyXG5cclxuXHRcdFx0XHRcdFx0Ly8gdHJpZ2dlciB0aGUgYWN0aW9uXHJcblx0XHRcdFx0XHRcdGxpZmVMaW5lLmVtaXQoXCJhY3Rpb24tZXhlYy1cIiArIG5hbWUpO1xyXG5cdFx0XHRcdFx0fVxyXG5cdFx0XHRcdH1cclxuXHRcdFx0fSk7XHJcblxyXG5cdFx0XHQvLyByZW1vdmUgYSBzaWRlYmFyIGFjdGlvblxyXG5cdFx0XHRsaWZlTGluZS5vbihcImFjdGlvbi1yZW1vdmVcIiwgbmFtZSA9PiB7XHJcblx0XHRcdFx0Ly8gcmVtb3ZlIHRoZSBidXR0b25cclxuXHRcdFx0XHR2YXIgYnRuID0gYWN0aW9ucy5xdWVyeVNlbGVjdG9yKGBbZGF0YS1uYW1lPVwiJHtuYW1lfVwiXWApO1xyXG5cclxuXHRcdFx0XHRpZihidG4pIGJ0bi5yZW1vdmUoKTtcclxuXHJcblx0XHRcdFx0Ly8gaGlkZSB0aGUgcGFnZSBhY3Rpb25zIGlmIHRoZXJlIGFyZSBub25lXHJcblx0XHRcdFx0aWYoYWN0aW9ucy5jaGlsZHJlbi5sZW5ndGggPT0gMSkge1xyXG5cdFx0XHRcdFx0YWN0aW9ucy5jbGFzc0xpc3QuYWRkKFwiaGlkZGVuXCIpO1xyXG5cdFx0XHRcdH1cclxuXHRcdFx0fSk7XHJcblxyXG5cdFx0XHQvLyByZW1vdmUgYWxsIHRoZSBzaWRlYmFyIGFjdGlvbnNcclxuXHRcdFx0bGlmZUxpbmUub24oXCJhY3Rpb24tcmVtb3ZlLWFsbFwiLCAoKSA9PiB7XHJcblx0XHRcdFx0Ly8gcmVtb3ZlIGFsbCB0aGUgYWN0aW9uc1xyXG5cdFx0XHRcdHZhciBfYWN0aW9ucyA9IEFycmF5LmZyb20oYWN0aW9ucy5xdWVyeVNlbGVjdG9yQWxsKFwiLnNpZGViYXItaXRlbVwiKSk7XHJcblxyXG5cdFx0XHRcdF9hY3Rpb25zLmZvckVhY2goYWN0aW9uID0+IGFjdGlvbi5yZW1vdmUoKSk7XHJcblxyXG5cdFx0XHRcdC8vIHNpZGUgdGhlIHBhZ2UgYWN0aW9uc1xyXG5cdFx0XHRcdGFjdGlvbnMuY2xhc3NMaXN0LmFkZChcImhpZGRlblwiKTtcclxuXHRcdFx0fSk7XHJcblx0XHR9KTtcclxuXHR9XHJcbn0pO1xyXG4iLCIvKipcclxuICogQSByb3cgb2YgcmFkaW8gc3R5bGUgYnV0dG9uc1xyXG4gKi9cclxuXHJcbmxpZmVMaW5lLm1ha2VEb20ucmVnaXN0ZXIoXCJ0b2dnbGUtYnRuc1wiLCB7XHJcblx0bWFrZSh7YnRucywgdmFsdWV9KSB7XHJcblx0XHQvLyBhdXRvIHNlbGVjdCB0aGUgZmlyc3QgYnV0dG9uXHJcblx0XHRpZighdmFsdWUpIHtcclxuXHRcdFx0dmFsdWUgPSB0eXBlb2YgYnRuc1swXSA9PSBcInN0cmluZ1wiID8gYnRuc1swXSA6IGJ0bnNbMF0udmFsdWU7XHJcblx0XHR9XHJcblxyXG5cdFx0cmV0dXJuIHtcclxuXHRcdFx0bmFtZTogXCJ0b2dnbGVCYXJcIixcclxuXHRcdFx0Y2xhc3NlczogXCJ0b2dnbGUtYmFyXCIsXHJcblx0XHRcdGNoaWxkcmVuOiBidG5zLm1hcChidG4gPT4ge1xyXG5cdFx0XHRcdC8vIGNvbnZlcnQgdGhlIHBsYWluIHN0cmluZyB0byBhbiBvYmplY3RcclxuXHRcdFx0XHRpZih0eXBlb2YgYnRuID09IFwic3RyaW5nXCIpIHtcclxuXHRcdFx0XHRcdGJ0biA9IHsgdGV4dDogYnRuLCB2YWx1ZTogYnRuIH07XHJcblx0XHRcdFx0fVxyXG5cclxuXHRcdFx0XHR2YXIgY2xhc3NlcyA9IFtcInRvZ2dsZS1idG5cIl07XHJcblxyXG5cdFx0XHRcdC8vIGFkZCB0aGUgc2VsZWN0ZWQgY2xhc3NcclxuXHRcdFx0XHRpZih2YWx1ZSA9PSBidG4udmFsdWUpIHtcclxuXHRcdFx0XHRcdGNsYXNzZXMucHVzaChcInRvZ2dsZS1idG4tc2VsZWN0ZWRcIik7XHJcblxyXG5cdFx0XHRcdFx0Ly8gZG9uJ3Qgc2VsZWN0IHR3byBidXR0b25zXHJcblx0XHRcdFx0XHR2YWx1ZSA9IHVuZGVmaW5lZDtcclxuXHRcdFx0XHR9XHJcblxyXG5cdFx0XHRcdHJldHVybiB7XHJcblx0XHRcdFx0XHR0YWc6IFwiYnV0dG9uXCIsXHJcblx0XHRcdFx0XHRjbGFzc2VzLFxyXG5cdFx0XHRcdFx0dGV4dDogYnRuLnRleHQsXHJcblx0XHRcdFx0XHRhdHRyczoge1xyXG5cdFx0XHRcdFx0XHRcImRhdGEtdmFsdWVcIjogYnRuLnZhbHVlXHJcblx0XHRcdFx0XHR9XHJcblx0XHRcdFx0fTtcclxuXHRcdFx0fSlcclxuXHRcdH07XHJcblx0fSxcclxuXHJcblx0YmluZCh7Y2hhbmdlfSwge3RvZ2dsZUJhcn0pIHtcclxuXHRcdC8vIGF0dGFjaCBsaXN0ZW5lcnNcclxuXHRcdGZvcihsZXQgYnRuIG9mIHRvZ2dsZUJhci5xdWVyeVNlbGVjdG9yQWxsKFwiLnRvZ2dsZS1idG5cIikpIHtcclxuXHRcdFx0YnRuLmFkZEV2ZW50TGlzdGVuZXIoXCJjbGlja1wiLCAoKSA9PiB7XHJcblx0XHRcdFx0dmFyIHNlbGVjdGVkID0gdG9nZ2xlQmFyLnF1ZXJ5U2VsZWN0b3IoXCIudG9nZ2xlLWJ0bi1zZWxlY3RlZFwiKTtcclxuXHJcblx0XHRcdFx0Ly8gdGhlIGJ1dHRvbiBoYXMgYWxyZWFkeSBiZWVuIHNlbGVjdGVkXHJcblx0XHRcdFx0aWYoc2VsZWN0ZWQgPT0gYnRuKSB7XHJcblx0XHRcdFx0XHRyZXR1cm47XHJcblx0XHRcdFx0fVxyXG5cclxuXHRcdFx0XHQvLyB1bnRvZ2dsZSB0aGUgb3RoZXIgYnV0dG9uXHJcblx0XHRcdFx0aWYoc2VsZWN0ZWQpIHtcclxuXHRcdFx0XHRcdHNlbGVjdGVkLmNsYXNzTGlzdC5yZW1vdmUoXCJ0b2dnbGUtYnRuLXNlbGVjdGVkXCIpO1xyXG5cdFx0XHRcdH1cclxuXHJcblx0XHRcdFx0Ly8gc2VsZWN0IHRoaXMgYnV0dG9uXHJcblx0XHRcdFx0YnRuLmNsYXNzTGlzdC5hZGQoXCJ0b2dnbGUtYnRuLXNlbGVjdGVkXCIpO1xyXG5cclxuXHRcdFx0XHQvLyB0cmlnZ2VyIGEgc2VsZWN0aW9uIGNoYW5nZVxyXG5cdFx0XHRcdGNoYW5nZShidG4uZGF0YXNldC52YWx1ZSk7XHJcblx0XHRcdH0pO1xyXG5cdFx0fVxyXG5cdH1cclxufSk7XHJcbiIsIi8qKlxyXG4gKiBOYW1lIGdlbmVyYXRvciBmb3IgYmFja3Vwc1xyXG4gKi9cclxuXHJcbmV4cG9ydHMuZ2VuQmFja3VwTmFtZSA9IGZ1bmN0aW9uKGRhdGUgPSBuZXcgRGF0ZSgpKSB7XHJcblx0cmV0dXJuIGBiYWNrdXAtJHtkYXRlLmdldEZ1bGxZZWFyKCl9LSR7ZGF0ZS5nZXRNb250aCgpKzF9LSR7ZGF0ZS5nZXREYXRlKCl9YFxyXG5cdFx0KyBgLSR7ZGF0ZS5nZXRIb3VycygpfS0ke2RhdGUuZ2V0TWludXRlcygpfS56aXBgO1xyXG59O1xyXG4iLCIvKipcclxuICogQW4gYWRhcHRvciBmb3IgaHR0cCBiYXNlZCBzdG9yZXNcclxuICovXHJcblxyXG5pZih0eXBlb2Ygd2luZG93ICE9IFwib2JqZWN0XCIpIHtcclxuXHQvLyBwb2x5ZmlsbCBmZXRjaCBmb3Igbm9kZVxyXG5cdGZldGNoID0gcmVxdWlyZShcIm5vZGUtZmV0Y2hcIik7XHJcbn1cclxuXHJcbmNsYXNzIEh0dHBBZGFwdG9yIHtcclxuXHRjb25zdHJ1Y3RvcihvcHRzKSB7XHJcblx0XHQvLyBpZiB3ZSBhcmUganVzdCBnaXZlbiBhIHN0cmluZyB1c2UgaXQgYXMgdGhlIHNvdXJjZVxyXG5cdFx0aWYodHlwZW9mIG9wdHMgPT0gXCJzdHJpbmdcIikge1xyXG5cdFx0XHRvcHRzID0ge1xyXG5cdFx0XHRcdHNyYzogb3B0c1xyXG5cdFx0XHR9O1xyXG5cdFx0fVxyXG5cclxuXHRcdC8vIHNhdmUgdGhlIG9wdGlvbnNcclxuXHRcdHRoaXMuX29wdHMgPSBvcHRzO1xyXG5cdH1cclxuXHJcblx0Ly8gY3JlYXRlIHRoZSBvcHRpb25zIGZvciBhIGZldGNoIHJlcXVlc3RcclxuXHRfY3JlYXRlT3B0cygpIHtcclxuXHRcdHZhciBvcHRzID0ge307XHJcblxyXG5cdFx0Ly8gdXNlIHRoZSBzZXNzaW9uIGNvb2tpZSB3ZSB3ZXJlIGdpdmVuXHJcblx0XHRpZih0aGlzLl9vcHRzLnNlc3Npb24pIHtcclxuXHRcdFx0b3B0cy5oZWFkZXJzID0ge1xyXG5cdFx0XHRcdGNvb2tpZTogYHNlc3Npb249JHt0aGlzLl9vcHRzLnNlc3Npb259YFxyXG5cdFx0XHR9O1xyXG5cdFx0fVxyXG5cdFx0Ly8gdXNlIHRoZSBjcmVhZGVudGlhbHMgZnJvbSB0aGUgYnJvd3NlclxyXG5cdFx0ZWxzZSB7XHJcblx0XHRcdG9wdHMuY3JlZGVudGlhbHMgPSBcImluY2x1ZGVcIjtcclxuXHRcdH1cclxuXHJcblx0XHRyZXR1cm4gb3B0cztcclxuXHR9XHJcblxyXG5cdC8qKlxyXG5cdCAqIEdldCBhbGwgdGhlIHZhbHVlcyBpbiBhIHN0b3JlXHJcblx0ICovXHJcblx0Z2V0QWxsKCkge1xyXG5cdFx0cmV0dXJuIGZldGNoKHRoaXMuX29wdHMuc3JjLCB0aGlzLl9jcmVhdGVPcHRzKCkpXHJcblxyXG5cdFx0Ly8gcGFyc2UgdGhlIGpzb24gcmVzcG9uc2VcclxuXHRcdC50aGVuKHJlcyA9PiByZXMuanNvbigpKVxyXG5cdH1cclxuXHJcblx0LyoqXHJcblx0ICogR2V0IGEgc2luZ2xlIHZhbHVlXHJcblx0ICovXHJcblx0Z2V0KGtleSkge1xyXG5cdFx0cmV0dXJuIGZldGNoKHRoaXMuX29wdHMuc3JjICsgXCJ2YWx1ZS9cIiArIGtleSwgdGhpcy5fY3JlYXRlT3B0cygpKVxyXG5cclxuXHRcdC50aGVuKHJlcyA9PiB7XHJcblx0XHRcdC8vIG5vdCBsb2dnZWQgaW5cclxuXHRcdFx0aWYocmVzLnN0YXR1cyA9PSA0MDMpIHtcclxuXHRcdFx0XHRsZXQgZXJyb3IgPSBuZXcgRXJyb3IoXCJOb3QgbG9nZ2VkIGluXCIpO1xyXG5cclxuXHRcdFx0XHQvLyBhZGQgYW4gZXJyb3IgY29kZVxyXG5cdFx0XHRcdGVycm9yLmNvZGUgPSBcIm5vdC1sb2dnZWQtaW5cIjtcclxuXHJcblx0XHRcdFx0dGhyb3cgZXJyb3I7XHJcblx0XHRcdH1cclxuXHJcblx0XHRcdC8vIG5vIHN1Y2ggaXRlbVxyXG5cdFx0XHRpZihyZXMuc3RhdHVzID09IDQwNCkge1xyXG5cdFx0XHRcdHJldHVybiB1bmRlZmluZWQ7XHJcblx0XHRcdH1cclxuXHJcblx0XHRcdC8vIHBhcnNlIHRoZSBpdGVtXHJcblx0XHRcdHJldHVybiByZXMuanNvbigpO1xyXG5cdFx0fSk7XHJcblx0fVxyXG5cclxuXHQvKipcclxuXHQgKiBTdG9yZSBhbiB2YWx1ZSBvbiB0aGUgc2VydmVyXHJcblx0ICovXHJcblx0c2V0KHZhbHVlKSB7XHJcblx0XHR2YXIgZmV0Y2hPcHRzID0gdGhpcy5fY3JlYXRlT3B0cygpO1xyXG5cclxuXHRcdC8vIGFkZCB0aGUgaGVhZGVycyB0byB0aGUgZGVmYXVsdCBoZWFkZXJzXHJcblx0XHRmZXRjaE9wdHMubWV0aG9kID0gXCJQVVRcIjtcclxuXHRcdGZldGNoT3B0cy5ib2R5ID0gSlNPTi5zdHJpbmdpZnkodmFsdWUpO1xyXG5cclxuXHRcdC8vIHNlbmQgdGhlIGl0ZW1cclxuXHRcdHJldHVybiBmZXRjaCh0aGlzLl9vcHRzLnNyYyArIFwidmFsdWUvXCIgKyB2YWx1ZS5pZCwgZmV0Y2hPcHRzKVxyXG5cclxuXHRcdC50aGVuKHJlcyA9PiB7XHJcblx0XHRcdC8vIG5vdCBsb2dnZWQgaW5cclxuXHRcdFx0aWYocmVzLnN0YXR1cyA9PSA0MDMpIHtcclxuXHRcdFx0XHRsZXQgZXJyb3IgPSBuZXcgRXJyb3IoXCJOb3QgbG9nZ2VkIGluXCIpO1xyXG5cclxuXHRcdFx0XHQvLyBhZGQgYW4gZXJyb3IgY29kZVxyXG5cdFx0XHRcdGVycm9yLmNvZGUgPSBcIm5vdC1sb2dnZWQtaW5cIjtcclxuXHJcblx0XHRcdFx0dGhyb3cgZXJyb3I7XHJcblx0XHRcdH1cclxuXHRcdH0pO1xyXG5cdH1cclxuXHJcblx0LyoqXHJcblx0ICogUmVtb3ZlIHRoZSB2YWx1ZSBmcm9tIHRoZSBzdG9yZVxyXG5cdCAqL1xyXG5cdHJlbW92ZShrZXkpIHtcclxuXHRcdHZhciBmZXRjaE9wdHMgPSB0aGlzLl9jcmVhdGVPcHRzKCk7XHJcblxyXG5cdFx0Ly8gYWRkIHRoZSBoZWFkZXJzIHRvIHRoZSBkZWZhdWx0IGhlYWRlcnNcclxuXHRcdGZldGNoT3B0cy5tZXRob2QgPSBcIkRFTEVURVwiO1xyXG5cclxuXHRcdC8vIHNlbmQgdGhlIGl0ZW1cclxuXHRcdHJldHVybiBmZXRjaCh0aGlzLl9vcHRzLnNyYyArIFwidmFsdWUvXCIgKyBrZXksIGZldGNoT3B0cylcclxuXHJcblx0XHQudGhlbihyZXMgPT4ge1xyXG5cdFx0XHQvLyBub3QgbG9nZ2VkIGluXHJcblx0XHRcdGlmKHJlcy5zdGF0dXMgPT0gNDAzKSB7XHJcblx0XHRcdFx0bGV0IGVycm9yID0gbmV3IEVycm9yKFwiTm90IGxvZ2dlZCBpblwiKTtcclxuXHJcblx0XHRcdFx0Ly8gYWRkIGFuIGVycm9yIGNvZGVcclxuXHRcdFx0XHRlcnJvci5jb2RlID0gXCJub3QtbG9nZ2VkLWluXCI7XHJcblxyXG5cdFx0XHRcdHRocm93IGVycm9yO1xyXG5cdFx0XHR9XHJcblx0XHR9KTtcclxuXHR9XHJcblxyXG5cdC8vIGNoZWNrIG91ciBhY2Nlc3MgbGV2ZWxcclxuXHRhY2Nlc3NMZXZlbCgpIHtcclxuXHRcdHJldHVybiBmZXRjaCh0aGlzLl9vcHRzLnNyYyArIFwiYWNjZXNzXCIsIHRoaXMuX2NyZWF0ZU9wdHMoKSlcclxuXHRcdFx0Ly8gdGhlIHJlc3BvbnNlIGlzIGp1c3QgYSBzdHJpbmdcclxuXHRcdFx0LnRoZW4ocmVzID0+IHJlcy50ZXh0KCkpO1xyXG5cdH1cclxufVxyXG5cclxubW9kdWxlLmV4cG9ydHMgPSBIdHRwQWRhcHRvcjtcclxuIiwiLyoqXHJcbiAqIEEgYmFzaWMga2V5IHZhbHVlIGRhdGEgc3RvcmVcclxuICovXHJcblxyXG52YXIgRXZlbnRFbWl0dGVyID0gcmVxdWlyZShcIi4uL3V0aWwvZXZlbnQtZW1pdHRlclwiKTtcclxuXHJcbmNsYXNzIEtleVZhbHVlU3RvcmUgZXh0ZW5kcyBFdmVudEVtaXR0ZXIge1xyXG5cdGNvbnN0cnVjdG9yKGFkYXB0b3IpIHtcclxuXHRcdHN1cGVyKCk7XHJcblx0XHR0aGlzLl9hZGFwdG9yID0gYWRhcHRvcjtcclxuXHJcblx0XHQvLyBtYWtlIHN1cmUgd2UgaGF2ZSBhbiBhZGFwdG9yXHJcblx0XHRpZighYWRhcHRvcikge1xyXG5cdFx0XHR0aHJvdyBuZXcgRXJyb3IoXCJLZXlWYWx1ZVN0b3JlIG11c3QgYmUgaW5pdGlhbGl6ZWQgd2l0aCBhbiBhZGFwdG9yXCIpXHJcblx0XHR9XHJcblx0fVxyXG5cclxuXHQvKipcclxuXHQgKiBHZXQgdGhlIGNvcnJpc3BvbmRpbmcgdmFsdWUgb3V0IG9mIHRoZSBkYXRhIHN0b3JlIG90aGVyd2lzZSByZXR1cm4gZGVmYXVsdFxyXG5cdCAqL1xyXG5cdGdldChrZXksIF9kZWZhdWx0KSB7XHJcblx0XHQvLyBjaGVjayBpZiB0aGlzIHZhbHVlIGhhcyBiZWVuIG92ZXJyaWRlblxyXG5cdFx0aWYodGhpcy5fb3ZlcnJpZGVzICYmIHRoaXMuX292ZXJyaWRlcy5oYXNPd25Qcm9wZXJ0eShrZXkpKSB7XHJcblx0XHRcdHJldHVybiBQcm9taXNlLnJlc29sdmUodGhpcy5fb3ZlcnJpZGVzW2tleV0pO1xyXG5cdFx0fVxyXG5cclxuXHRcdHJldHVybiB0aGlzLl9hZGFwdG9yLmdldChrZXkpXHJcblxyXG5cdFx0LnRoZW4ocmVzdWx0ID0+IHtcclxuXHRcdFx0Ly8gdGhlIGl0ZW0gaXMgbm90IGRlZmluZWRcclxuXHRcdFx0aWYoIXJlc3VsdCkge1xyXG5cdFx0XHRcdHJldHVybiBfZGVmYXVsdDtcclxuXHRcdFx0fVxyXG5cclxuXHRcdFx0cmV0dXJuIHJlc3VsdC52YWx1ZTtcclxuXHRcdH0pO1xyXG5cdH1cclxuXHJcblx0LyoqXHJcblx0ICogU2V0IGEgc2luZ2xlIHZhbHVlIG9yIHNldmVyYWwgdmFsdWVzXHJcblx0ICpcclxuXHQgKiBrZXkgLT4gdmFsdWVcclxuXHQgKiBvclxyXG5cdCAqIHsga2V5OiB2YWx1ZSB9XHJcblx0ICovXHJcblx0c2V0KGtleSwgdmFsdWUpIHtcclxuXHRcdC8vIHNldCBhIHNpbmdsZSB2YWx1ZVxyXG5cdFx0aWYodHlwZW9mIGtleSA9PSBcInN0cmluZ1wiKSB7XHJcblx0XHRcdHZhciBwcm9taXNlID0gdGhpcy5fYWRhcHRvci5zZXQoe1xyXG5cdFx0XHRcdGlkOiBrZXksXHJcblx0XHRcdFx0dmFsdWUsXHJcblx0XHRcdFx0bW9kaWZpZWQ6IERhdGUubm93KClcclxuXHRcdFx0fSk7XHJcblxyXG5cdFx0XHQvLyB0cmlnZ2VyIHRoZSBjaGFuZ2VcclxuXHRcdFx0dGhpcy5lbWl0KGtleSwgdmFsdWUpO1xyXG5cclxuXHRcdFx0cmV0dXJuIHByb21pc2U7XHJcblx0XHR9XHJcblx0XHQvLyBzZXQgc2V2ZXJhbCB2YWx1ZXNcclxuXHRcdGVsc2Uge1xyXG5cdFx0XHQvLyB0ZWxsIHRoZSBjYWxsZXIgd2hlbiB3ZSBhcmUgZG9uZVxyXG5cdFx0XHRsZXQgcHJvbWlzZXMgPSBbXTtcclxuXHJcblx0XHRcdGZvcihsZXQgX2tleSBvZiBPYmplY3QuZ2V0T3duUHJvcGVydHlOYW1lcyhrZXkpKSB7XHJcblx0XHRcdFx0cHJvbWlzZXMucHVzaChcclxuXHRcdFx0XHRcdHRoaXMuX2FkYXB0b3Iuc2V0KHtcclxuXHRcdFx0XHRcdFx0aWQ6IF9rZXksXHJcblx0XHRcdFx0XHRcdHZhbHVlOiBrZXlbX2tleV0sXHJcblx0XHRcdFx0XHRcdG1vZGlmaWVkOiBEYXRlLm5vdygpXHJcblx0XHRcdFx0XHR9KVxyXG5cdFx0XHRcdCk7XHJcblxyXG5cdFx0XHRcdC8vIHRyaWdnZXIgdGhlIGNoYW5nZVxyXG5cdFx0XHRcdHRoaXMuZW1pdChfa2V5LCBrZXlbX2tleV0pO1xyXG5cdFx0XHR9XHJcblxyXG5cdFx0XHRyZXR1cm4gUHJvbWlzZS5hbGwocHJvbWlzZXMpO1xyXG5cdFx0fVxyXG5cdH1cclxuXHJcblx0IC8qKlxyXG5cdCAgKiBXYXRjaCB0aGUgdmFsdWUgZm9yIGNoYW5nZXNcclxuXHQgICpcclxuXHQgICogb3B0cy5jdXJyZW50IC0gc2VuZCB0aGUgY3VycmVudCB2YWx1ZSBvZiBrZXkgKGRlZmF1bHQ6IGZhbHNlKVxyXG5cdCAgKiBvcHRzLmRlZmF1bHQgLSB0aGUgZGVmYXVsdCB2YWx1ZSB0byBzZW5kIGZvciBvcHRzLmN1cnJlbnRcclxuXHQgICovXHJcblx0IHdhdGNoKGtleSwgb3B0cywgZm4pIHtcclxuXHRcdCAvLyBtYWtlIG9wdHMgb3B0aW9uYWxcclxuXHRcdCBpZih0eXBlb2Ygb3B0cyA9PSBcImZ1bmN0aW9uXCIpIHtcclxuXHRcdFx0IGZuID0gb3B0cztcclxuXHRcdFx0IG9wdHMgPSB7fTtcclxuXHRcdCB9XHJcblxyXG5cdFx0IC8vIGlmIGEgY2hhbmdlIGlzIHRyaWdnZXJlZCBiZWZvcmUgZ2V0IGNvbWVzIGJhY2sgZG9uJ3QgZW1pdCB0aGUgdmFsdWUgZnJvbSBnZXRcclxuXHRcdCB2YXIgY2hhbmdlUmVjaWV2ZWQgPSBmYWxzZTtcclxuXHJcblx0XHQgLy8gc2VuZCB0aGUgY3VycmVudCB2YWx1ZVxyXG5cdFx0IGlmKG9wdHMuY3VycmVudCkge1xyXG5cdFx0XHQgdGhpcy5nZXQoa2V5LCBvcHRzLmRlZmF1bHQpXHJcblxyXG5cdFx0IFx0LnRoZW4odmFsdWUgPT4ge1xyXG5cdFx0XHRcdGlmKCFjaGFuZ2VSZWNpZXZlZCkge1xyXG5cdFx0XHRcdFx0Zm4odmFsdWUpO1xyXG5cdFx0XHRcdH1cclxuXHRcdFx0fSk7XHJcblx0XHQgfVxyXG5cclxuXHRcdCAvLyBsaXN0ZW4gZm9yIGFueSBjaGFuZ2VzXHJcblx0XHQgcmV0dXJuIHRoaXMub24oa2V5LCB2YWx1ZSA9PiB7XHJcblx0XHRcdCAvLyBvbmx5IGVtaXQgdGhlIGNoYW5nZSBpZiB0aGVyZSBpcyBub3QgYW4gb3ZlcnJpZGUgaW4gcGxhY2VcclxuXHRcdFx0IGlmKCF0aGlzLl9vdmVycmlkZXMgfHwgIXRoaXMuX292ZXJyaWRlcy5oYXNPd25Qcm9wZXJ0eShrZXkpKSB7XHJcblx0XHRcdFx0IGZuKHZhbHVlKTtcclxuXHRcdFx0IH1cclxuXHJcblx0XHRcdCBjaGFuZ2VSZWNpZXZlZCA9IHRydWU7XHJcblx0XHQgfSk7XHJcblx0IH1cclxuXHJcblx0IC8qKlxyXG5cdCAgKiBPdmVycmlkZSB0aGUgdmFsdWVzIGZyb20gdGhlIGFkYXB0b3Igd2l0aG91dCB3cml0aW5nIHRvIHRoZW1cclxuXHQgICpcclxuXHQgICogVXNlZnVsIGZvciBjb21iaW5pbmcganNvbiBzZXR0aW5ncyB3aXRoIGNvbW1hbmQgbGluZSBmbGFnc1xyXG5cdCAgKi9cclxuXHQgc2V0T3ZlcnJpZGVzKG92ZXJyaWRlcykge1xyXG5cdFx0IC8vIGVtaXQgY2hhbmdlcyBmb3IgZWFjaCBvZiB0aGUgb3ZlcnJpZGVzXHJcblx0XHQgT2JqZWN0LmdldE93blByb3BlcnR5TmFtZXMob3ZlcnJpZGVzKVxyXG5cclxuXHRcdCAuZm9yRWFjaChrZXkgPT4gdGhpcy5lbWl0KGtleSwgb3ZlcnJpZGVzW2tleV0pKTtcclxuXHJcblx0XHQgLy8gc2V0IHRoZSBvdmVycmlkZXMgYWZ0ZXIgc28gdGhlIGVtaXQgaXMgbm90IGJsb2NrZWRcclxuXHRcdCB0aGlzLl9vdmVycmlkZXMgPSBvdmVycmlkZXM7XHJcblx0IH1cclxufVxyXG5cclxubW9kdWxlLmV4cG9ydHMgPSBLZXlWYWx1ZVN0b3JlO1xyXG4iLCIvKipcclxuICogQSBkYXRhIHN0b3JlIHdoaWNoIGNvbnRhaW5zIGEgcG9vbCBvZiBvYmplY3RzIHdoaWNoIGFyZSBxdWVyeWFibGUgYnkgYW55IHByb3BlcnR5XHJcbiAqL1xyXG5cclxudmFyIEV2ZW50RW1pdHRlciA9IHJlcXVpcmUoXCIuLi91dGlsL2V2ZW50LWVtaXR0ZXJcIik7XHJcblxyXG5jbGFzcyBQb29sU3RvcmUgZXh0ZW5kcyBFdmVudEVtaXR0ZXIge1xyXG5cdGNvbnN0cnVjdG9yKGFkYXB0b3IsIGluaXRGbikge1xyXG5cdFx0c3VwZXIoKTtcclxuXHRcdHRoaXMuX2FkYXB0b3IgPSBhZGFwdG9yO1xyXG5cdFx0dGhpcy5faW5pdEZuID0gaW5pdEZuO1xyXG5cdH1cclxuXHJcblx0LyoqXHJcblx0ICogR2V0IGFsbCBpdGVtcyBtYXRjaW5nIHRoZSBwcm92aWRlZCBwcm9wZXJ0aWVzXHJcblx0ICovXHJcblx0cXVlcnkocHJvcHMsIGZuKSB7XHJcblx0XHQvLyBjaGVjayBpZiBhIHZhbHVlIG1hdGNoZXMgdGhlIHF1ZXJ5XHJcblx0XHR2YXIgZmlsdGVyID0gdmFsdWUgPT4ge1xyXG5cdFx0XHQvLyBub3QgYW4gaXRlbVxyXG5cdFx0XHRpZighdmFsdWUpIHJldHVybiBmYWxzZTtcclxuXHJcblx0XHRcdC8vIGNoZWNrIHRoYXQgYWxsIHRoZSBwcm9wZXJ0aWVzIG1hdGNoXHJcblx0XHRcdHJldHVybiBPYmplY3QuZ2V0T3duUHJvcGVydHlOYW1lcyhwcm9wcylcclxuXHJcblx0XHRcdC5ldmVyeShwcm9wTmFtZSA9PiB7XHJcblx0XHRcdFx0Ly8gYSBmdW5jdGlvbiB0byBjaGVjayBpZiBhIHZhbHVlIG1hdGNoZXNcclxuXHRcdFx0XHRpZih0eXBlb2YgcHJvcHNbcHJvcE5hbWVdID09IFwiZnVuY3Rpb25cIikge1xyXG5cdFx0XHRcdFx0cmV0dXJuIHByb3BzW3Byb3BOYW1lXSh2YWx1ZVtwcm9wTmFtZV0pO1xyXG5cdFx0XHRcdH1cclxuXHRcdFx0XHQvLyBwbGFpbiBlcXVhbGl0eVxyXG5cdFx0XHRcdGVsc2Uge1xyXG5cdFx0XHRcdFx0cmV0dXJuIHByb3BzW3Byb3BOYW1lXSA9PSB2YWx1ZVtwcm9wTmFtZV1cclxuXHRcdFx0XHR9XHJcblx0XHRcdH0pO1xyXG5cdFx0fTtcclxuXHJcblx0XHQvLyBnZXQgYWxsIGN1cnJlbnQgaXRlbXMgdGhhdCBtYXRjaCB0aGUgZmlsdGVyXHJcblx0XHR2YXIgY3VycmVudCA9IChcImlkXCIgaW4gcHJvcHMpID9cclxuXHRcdFx0dGhpcy5fYWRhcHRvci5nZXQocHJvcHMuaWQpLnRoZW4odmFsdWUgPT4gW3ZhbHVlXSk6XHJcblx0XHRcdHRoaXMuX2FkYXB0b3IuZ2V0QWxsKCk7XHJcblxyXG5cdFx0Y3VycmVudCA9IGN1cnJlbnQudGhlbih2YWx1ZXMgPT4ge1xyXG5cdFx0XHQvLyBmaWx0ZXIgb3V0IHRoZSB2YWx1ZXNcclxuXHRcdFx0dmFsdWVzID0gdmFsdWVzLmZpbHRlcihmaWx0ZXIpO1xyXG5cclxuXHRcdFx0Ly8gZG8gYW55IGluaXRpYWxpemF0aW9uXHJcblx0XHRcdGlmKHRoaXMuX2luaXRGbikge1xyXG5cdFx0XHRcdHZhbHVlcyA9IHZhbHVlcy5tYXAodmFsdWUgPT4gdGhpcy5faW5pdEZuKHZhbHVlKSB8fCB2YWx1ZSk7XHJcblx0XHRcdH1cclxuXHJcblx0XHRcdHJldHVybiB2YWx1ZXM7XHJcblx0XHR9KTtcclxuXHJcblx0XHQvLyBvcHRpb25hbHkgcnVuIGNoYW5nZXMgdGhyb3VnaCB0aGUgcXVlcnkgYXMgd2VsbFxyXG5cdFx0aWYodHlwZW9mIGZuID09IFwiZnVuY3Rpb25cIikge1xyXG5cdFx0XHRsZXQgc3Vic2NyaXB0aW9uLCBzdG9wcGVkO1xyXG5cclxuXHRcdFx0Ly8gd3JhcCB0aGUgdmFsdWVzIGluIGNoYW5nZSBvYmplY3RzIGFuZCBzZW5kIHRoZSB0byB0aGUgY29uc3VtZXJcclxuXHRcdFx0Y3VycmVudC50aGVuKHZhbHVlcyA9PiB7XHJcblx0XHRcdFx0Ly8gZG9uJ3QgbGlzdGVuIGlmIHVuc3Vic2NyaWJlIHdhcyBhbHJlYWR5IGNhbGxlZFxyXG5cdFx0XHRcdGlmKHN0b3BwZWQpIHJldHVybjtcclxuXHJcblx0XHRcdFx0Ly8gc2VuZCB0aGUgdmFsdWVzIHdlIGN1cnJlbnRseSBoYXZlXHJcblx0XHRcdFx0Zm4odmFsdWVzLnNsaWNlKDApKTtcclxuXHJcblx0XHRcdFx0Ly8gd2F0Y2ggZm9yIGNoYW5nZXMgYWZ0ZXIgdGhlIGluaXRpYWwgdmFsdWVzIGFyZSBzZW5kXHJcblx0XHRcdFx0c3Vic2NyaXB0aW9uID0gdGhpcy5vbihcImNoYW5nZVwiLCBjaGFuZ2UgPT4ge1xyXG5cdFx0XHRcdFx0Ly8gZmluZCB0aGUgcHJldmlvdXMgdmFsdWVcclxuXHRcdFx0XHRcdHZhciBpbmRleCA9IHZhbHVlcy5maW5kSW5kZXgodmFsdWUgPT4gdmFsdWUuaWQgPT0gY2hhbmdlLmlkKTtcclxuXHJcblx0XHRcdFx0XHRpZihjaGFuZ2UudHlwZSA9PSBcImNoYW5nZVwiKSB7XHJcblx0XHRcdFx0XHRcdC8vIGNoZWNrIGlmIHRoZSB2YWx1ZSBtYXRjaGVzIHRoZSBxdWVyeVxyXG5cdFx0XHRcdFx0XHRsZXQgbWF0Y2hlcyA9IGZpbHRlcihjaGFuZ2UudmFsdWUpO1xyXG5cclxuXHRcdFx0XHRcdFx0aWYobWF0Y2hlcykge1xyXG5cdFx0XHRcdFx0XHRcdC8vIGZyZXNobHkgY3JlYXRlZFxyXG5cdFx0XHRcdFx0XHRcdGlmKGluZGV4ID09PSAtMSkge1xyXG5cdFx0XHRcdFx0XHRcdFx0bGV0IHt2YWx1ZX0gPSBjaGFuZ2U7XHJcblxyXG5cdFx0XHRcdFx0XHRcdFx0Ly8gZG8gYW55IGluaXRpYWxpemF0aW9uXHJcblx0XHRcdFx0XHRcdFx0XHRpZih0aGlzLl9pbml0Rm4pIHtcclxuXHRcdFx0XHRcdFx0XHRcdFx0dmFsdWUgPSB0aGlzLl9pbml0Rm4odmFsdWUpIHx8IHZhbHVlO1xyXG5cdFx0XHRcdFx0XHRcdFx0fVxyXG5cclxuXHRcdFx0XHRcdFx0XHRcdHZhbHVlcy5wdXNoKHZhbHVlKTtcclxuXHRcdFx0XHRcdFx0XHR9XHJcblx0XHRcdFx0XHRcdFx0Ly8gdXBkYXRlIGFuIGV4aXN0aW5nIHZhbHVlXHJcblx0XHRcdFx0XHRcdFx0ZWxzZSB7XHJcblx0XHRcdFx0XHRcdFx0XHR2YWx1ZXNbaW5kZXhdID0gY2hhbmdlLnZhbHVlO1xyXG5cdFx0XHRcdFx0XHRcdH1cclxuXHJcblx0XHRcdFx0XHRcdFx0Zm4odmFsdWVzLnNsaWNlKDApKTtcclxuXHRcdFx0XHRcdFx0fVxyXG5cdFx0XHRcdFx0XHQvLyB0ZWxsIHRoZSBjb25zdW1lciB0aGlzIHZhbHVlIG5vIGxvbmdlciBtYXRjaGVzXHJcblx0XHRcdFx0XHRcdGVsc2UgaWYoaW5kZXggIT09IC0xKSB7XHJcblx0XHRcdFx0XHRcdFx0Ly8gcmVtb3ZlIHRoZSBpdGVtXHJcblx0XHRcdFx0XHRcdFx0aWYoaW5kZXggIT09IC0xKSB7XHJcblx0XHRcdFx0XHRcdFx0XHR2YWx1ZXMuc3BsaWNlKGluZGV4LCAxKTtcclxuXHRcdFx0XHRcdFx0XHR9XHJcblxyXG5cdFx0XHRcdFx0XHRcdGZuKHZhbHVlcy5zbGljZSgwKSk7XHJcblx0XHRcdFx0XHRcdH1cclxuXHRcdFx0XHRcdH1cclxuXHRcdFx0XHRcdGVsc2UgaWYoY2hhbmdlLnR5cGUgPT0gXCJyZW1vdmVcIiAmJiBpbmRleCAhPT0gLTEpIHtcclxuXHRcdFx0XHRcdFx0Ly8gcmVtb3ZlIHRoZSBpdGVtXHJcblx0XHRcdFx0XHRcdGlmKGluZGV4ICE9PSAtMSkge1xyXG5cdFx0XHRcdFx0XHRcdHZhbHVlcy5zcGxpY2UoaW5kZXgsIDEpO1xyXG5cdFx0XHRcdFx0XHR9XHJcblxyXG5cdFx0XHRcdFx0XHRmbih2YWx1ZXMuc2xpY2UoMCkpO1xyXG5cdFx0XHRcdFx0fVxyXG5cdFx0XHRcdH0pO1xyXG5cdFx0XHR9KTtcclxuXHJcblx0XHRcdHJldHVybiB7XHJcblx0XHRcdFx0dW5zdWJzY3JpYmUoKSB7XHJcblx0XHRcdFx0XHQvLyBpZiB3ZSBhcmUgbGlzdGVuaW5nIHN0b3BcclxuXHRcdFx0XHRcdGlmKHN1YnNjcmlwdGlvbikge1xyXG5cdFx0XHRcdFx0XHRzdWJzY3JpcHRpb24udW5zdWJzY3JpYmUoKVxyXG5cdFx0XHRcdFx0fVxyXG5cclxuXHRcdFx0XHRcdC8vIGRvbid0IGxpc3RlblxyXG5cdFx0XHRcdFx0c3RvcHBlZCA9IHRydWU7XHJcblx0XHRcdFx0fVxyXG5cdFx0XHR9XHJcblx0XHR9XHJcblx0XHRlbHNlIHtcclxuXHRcdFx0cmV0dXJuIGN1cnJlbnQ7XHJcblx0XHR9XHJcblx0fVxyXG5cclxuXHQvKipcclxuXHQgKiBTdG9yZSBhIHZhbHVlIGluIHRoZSBwb29sXHJcblx0ICovXHJcblx0c2V0KHZhbHVlKSB7XHJcblx0XHQvLyBzZXQgdGhlIG1vZGlmaWVkIGRhdGVcclxuXHRcdHZhbHVlLm1vZGlmaWVkID0gRGF0ZS5ub3coKTtcclxuXHJcblx0XHQvLyBzdG9yZSB0aGUgdmFsdWUgaW4gdGhlIGFkYXB0b3JcclxuXHRcdHRoaXMuX2FkYXB0b3Iuc2V0KHZhbHVlKTtcclxuXHJcblx0XHQvLyBwcm9wb2dhdGUgdGhlIGNoYW5nZVxyXG5cdFx0dGhpcy5lbWl0KFwiY2hhbmdlXCIsIHtcclxuXHRcdFx0dHlwZTogXCJjaGFuZ2VcIixcclxuXHRcdFx0aWQ6IHZhbHVlLmlkLFxyXG5cdFx0XHR2YWx1ZVxyXG5cdFx0fSk7XHJcblx0fVxyXG5cclxuXHQvKipcclxuXHQgKiBSZW1vdmUgYSB2YWx1ZSBmcm9tIHRoZSBwb29sXHJcblx0ICovXHJcblx0cmVtb3ZlKGlkKSB7XHJcblx0XHQvLyByZW1vdmUgdGhlIHZhbHVlIGZyb20gdGhlIGFkYXB0b3JcclxuXHRcdHRoaXMuX2FkYXB0b3IucmVtb3ZlKGlkLCBEYXRlLm5vdygpKTtcclxuXHJcblx0XHQvLyBwcm9wb2dhdGUgdGhlIGNoYW5nZVxyXG5cdFx0dGhpcy5lbWl0KFwiY2hhbmdlXCIsIHtcclxuXHRcdFx0dHlwZTogXCJyZW1vdmVcIixcclxuXHRcdFx0aWRcclxuXHRcdH0pO1xyXG5cdH1cclxufVxyXG5cclxubW9kdWxlLmV4cG9ydHMgPSBQb29sU3RvcmU7XHJcbiIsIi8qKlxyXG4gKiBBIHdyYXBwZXIgdGhhdCBzeW5jcm9uaXplcyBsb2NhbCBjaGFuZ2VzIHdpdGggYSByZW1vdGUgaG9zdFxyXG4gKi9cclxuXHJcbnZhciBLZXlWYWx1ZVN0b3JlID0gcmVxdWlyZShcIi4va2V5LXZhbHVlLXN0b3JlXCIpO1xyXG5cclxuY2xhc3MgU3luY2VyIHtcclxuXHRjb25zdHJ1Y3RvcihvcHRzKSB7XHJcblx0XHR0aGlzLl9sb2NhbCA9IG9wdHMubG9jYWw7XHJcblx0XHR0aGlzLl9yZW1vdGUgPSBvcHRzLnJlbW90ZTtcclxuXHRcdHRoaXMuX2NoYW5nZVN0b3JlID0gbmV3IEtleVZhbHVlU3RvcmUob3B0cy5jaGFuZ2VTdG9yZSk7XHJcblx0XHR0aGlzLl9jaGFuZ2VzTmFtZSA9IG9wdHMuY2hhbmdlc05hbWUgfHwgXCJjaGFuZ2VzXCI7XHJcblxyXG5cdFx0Ly8gc2F2ZSBhbGwgdGhlIGlkcyB0byBvcHRpbWl6ZSBjcmVhdGVzXHJcblx0XHR0aGlzLl9pZHMgPSB0aGlzLmdldEFsbCgpXHJcblx0XHRcdC50aGVuKGFsbCA9PiBhbGwubWFwKHZhbHVlID0+IHZhbHVlLmlkKSk7XHJcblx0fVxyXG5cclxuXHQvLyBwYXNzIHRocm91Z2ggZ2V0IGFuZCBnZXRBbGxcclxuXHRnZXRBbGwoKSB7IHJldHVybiB0aGlzLl9sb2NhbC5nZXRBbGwoKTsgfVxyXG5cdGdldChrZXkpIHsgcmV0dXJuIHRoaXMuX2xvY2FsLmdldChrZXkpOyB9XHJcblxyXG5cdC8vIGtlZXAgdHJhY2sgb2YgYW55IGNyZWF0ZWQgdmFsdWVzXHJcblx0c2V0KHZhbHVlKSB7XHJcblx0XHQvLyBjaGVjayBpZiB0aGlzIGlzIGEgY3JlYXRlXHJcblx0XHR0aGlzLl9pZHMgPSB0aGlzLl9pZHMudGhlbihpZHMgPT4ge1xyXG5cdFx0XHQvLyBuZXcgdmFsdWVcclxuXHRcdFx0aWYoaWRzLmluZGV4T2YodmFsdWUuaWQpID09PSAtMSkge1xyXG5cdFx0XHRcdGlkcy5wdXNoKHZhbHVlLmlkKTtcclxuXHJcblx0XHRcdFx0Ly8gc2F2ZSB0aGUgY2hhbmdlXHJcblx0XHRcdFx0dGhpcy5fY2hhbmdlKFwiY3JlYXRlXCIsIHZhbHVlLmlkKTtcclxuXHRcdFx0fVxyXG5cclxuXHRcdFx0cmV0dXJuIGlkcztcclxuXHRcdH0pO1xyXG5cclxuXHRcdC8vIHN0b3JlIHRoZSB2YWx1ZVxyXG5cdFx0cmV0dXJuIHRoaXMuX2lkcy50aGVuKCgpID0+IHRoaXMuX2xvY2FsLnNldCh2YWx1ZSkpO1xyXG5cdH1cclxuXHJcblx0Ly8ga2VlcCB0cmFjayBvZiBkZWxldGVkIHZhbHVlc1xyXG5cdHJlbW92ZShrZXkpIHtcclxuXHRcdHRoaXMuX2lkcyA9IHRoaXMuX2lkcy50aGVuKGlkcyA9PiB7XHJcblx0XHRcdC8vIHJlbW92ZSB0aGlzIGZyb20gdGhlIGFsbCBpZHMgbGlzdFxyXG5cdFx0XHR2YXIgaW5kZXggPSBpZHMuaW5kZXhPZihrZXkpO1xyXG5cclxuXHRcdFx0aWYoaW5kZXggIT09IC0xKSB7XHJcblx0XHRcdFx0aWRzLnNwbGljZShpbmRleCwgMSk7XHJcblx0XHRcdH1cclxuXHJcblx0XHRcdC8vIHNhdmUgdGhlIGNoYW5nZVxyXG5cdFx0XHR0aGlzLl9jaGFuZ2UoXCJyZW1vdmVcIiwga2V5KTtcclxuXHRcdH0pO1xyXG5cclxuXHRcdC8vIHJlbW92ZSB0aGUgYWN0dWFsIHZhbHVlXHJcblx0XHRyZXR1cm4gdGhpcy5faWRzLnRoZW4oKCkgPT4gdGhpcy5fbG9jYWwucmVtb3ZlKGtleSkpO1xyXG5cdH1cclxuXHJcblx0Ly8gc3RvcmUgYSBjaGFuZ2UgaW4gdGhlIGNoYW5nZSBzdG9yZVxyXG5cdF9jaGFuZ2UodHlwZSwgaWQpIHtcclxuXHRcdC8vIGdldCB0aGUgY2hhbmdlc1xyXG5cdFx0dGhpcy5fY2hhbmdlU3RvcmUuZ2V0KHRoaXMuX2NoYW5nZXNOYW1lLCBbXSlcclxuXHJcblx0XHQudGhlbihjaGFuZ2VzID0+IHtcclxuXHRcdFx0Ly8gYWRkIHRoZSBjaGFuZ2VcclxuXHRcdFx0Y2hhbmdlcy5wdXNoKHsgdHlwZSwgaWQsIHRpbWVzdGFtcDogRGF0ZS5ub3coKSB9KTtcclxuXHJcblx0XHRcdC8vIHNhdmUgdGhlIGNoYW5nZXNcclxuXHRcdFx0cmV0dXJuIHRoaXMuX2NoYW5nZVN0b3JlLnNldCh0aGlzLl9jaGFuZ2VzTmFtZSwgY2hhbmdlcyk7XHJcblx0XHR9KTtcclxuXHR9XHJcblxyXG5cdC8vIHN5bmMgdGhlIHR3byBzdG9yZXNcclxuXHRzeW5jKCkge1xyXG5cdFx0cmV0dXJuIG5ldyBTeW5jKHRoaXMuX2xvY2FsLCB0aGlzLl9yZW1vdGUsIHRoaXMuX2NoYW5nZVN0b3JlLCB0aGlzLl9jaGFuZ2VzTmFtZSkuc3luYygpO1xyXG5cdH1cclxuXHJcblx0Ly8gZ2V0IHRoZSByZW1vdGUgYWNjZXNzIGxldmVsXHJcblx0YWNjZXNzTGV2ZWwoKSB7XHJcblx0XHRyZXR1cm4gdGhpcy5fcmVtb3RlLmFjY2Vzc0xldmVsKClcclxuXHJcblx0XHQvLyBpZiBhbnl0aGluZyBnb2VzIHdyb25nIGFzc3VtZSBmdWxsIHBlcm1pc3Npb25zXHJcblx0XHQuY2F0Y2goKCkgPT4gXCJmdWxsXCIpO1xyXG5cdH1cclxufVxyXG5cclxuLy8gYSBzaW5nbGUgc3luY1xyXG5jbGFzcyBTeW5jIHtcclxuXHRjb25zdHJ1Y3Rvcihsb2NhbCwgcmVtb3RlLCBjaGFuZ2VTdG9yZSwgY2hhbmdlc05hbWUpIHtcclxuXHRcdHRoaXMuX2xvY2FsID0gbG9jYWw7XHJcblx0XHR0aGlzLl9yZW1vdGUgPSByZW1vdGU7XHJcblx0XHR0aGlzLl9jaGFuZ2VTdG9yZSA9IGNoYW5nZVN0b3JlO1xyXG5cdFx0dGhpcy5fY2hhbmdlc05hbWUgPSBjaGFuZ2VzTmFtZTtcclxuXHR9XHJcblxyXG5cdHN5bmMoKSB7XHJcblx0XHQvLyBnZXQgdGhlIGlkcyBhbmQgbGFzdCBtb2RpZmllZCBkYXRlcyBmb3IgYWxsIHJlbW90ZSB2YWx1ZXNcclxuXHRcdHJldHVybiB0aGlzLmdldE1vZGlmaWVkcygpXHJcblxyXG5cdFx0LnRoZW4obW9kaWZpZWRzID0+IHtcclxuXHRcdFx0Ly8gcmVtb3ZlIHRoZSB2YWx1ZXMgd2UgZGVsZXRlZCBmcm9tIHRoZSByZW1vdGUgaG9zdFxyXG5cdFx0XHRyZXR1cm4gdGhpcy5yZW1vdmUobW9kaWZpZWRzKVxyXG5cclxuXHRcdFx0Ly8gbWVyZ2UgbW9kaWZpZWQgdmFsdWVzXHJcblx0XHRcdC50aGVuKCgpID0+IHRoaXMubWVyZ2VNb2RpZmllZHMobW9kaWZpZWRzKSk7XHJcblx0XHR9KVxyXG5cclxuXHRcdC50aGVuKHJlbW90ZURlbGV0ZXMgPT4ge1xyXG5cdFx0XHQvLyBzZW5kIHZhbHVlcyB3ZSBjcmVhdGVkIHNpbmNlIHRoZSBsYXN0IHN5bmNcclxuXHRcdFx0cmV0dXJuIHRoaXMuY3JlYXRlKHJlbW90ZURlbGV0ZXMpXHJcblxyXG5cdFx0XHQvLyByZW1vdmUgYW55IGl0ZW1zIHRoYXQgd2hlcmUgZGVsZXRlZCByZW1vdGx5XHJcblx0XHRcdC50aGVuKCgpID0+IHRoaXMuYXBwbHlEZWxldGVzKHJlbW90ZURlbGV0ZXMpKTtcclxuXHRcdH0pXHJcblxyXG5cdFx0Ly8gY2xlYXIgdGhlIGNoYW5nZXNcclxuXHRcdC50aGVuKCgpID0+IHRoaXMuX2NoYW5nZVN0b3JlLnNldCh0aGlzLl9jaGFuZ2VzTmFtZSwgW10pKTtcclxuXHR9XHJcblxyXG5cdC8vIGdldCB0aGUgbGFzdCBtb2RpZmllZCB0aW1lcyBmb3IgZWFjaCB2YWx1ZVxyXG5cdGdldE1vZGlmaWVkcygpIHtcclxuXHRcdHRoaXMuX2l0ZW1zID0ge307XHJcblxyXG5cdFx0cmV0dXJuIHRoaXMuX3JlbW90ZS5nZXRBbGwoKVxyXG5cclxuXHRcdC50aGVuKHZhbHVlcyA9PiB7XHJcblx0XHRcdHZhciBtb2RpZmllZHMgPSB7fTtcclxuXHJcblx0XHRcdGZvcihsZXQgdmFsdWUgb2YgdmFsdWVzKSB7XHJcblx0XHRcdFx0Ly8gc3RvcmUgdGhlIGl0ZW1zXHJcblx0XHRcdFx0dGhpcy5faXRlbXNbdmFsdWUuaWRdID0gdmFsdWU7XHJcblx0XHRcdFx0Ly8gZ2V0IHRoZSBtb2RpZmllZCB0aW1lc1xyXG5cdFx0XHRcdG1vZGlmaWVkc1t2YWx1ZS5pZF0gPSB2YWx1ZS5tb2RpZmllZDtcclxuXHRcdFx0fVxyXG5cclxuXHRcdFx0cmV0dXJuIG1vZGlmaWVkcztcclxuXHRcdH0pO1xyXG5cdH1cclxuXHJcblx0Ly8gcmVtb3ZlIHZhbHVlcyB3ZSBoYXZlIGRlbGV0ZWQgc2luY2UgdGhlIGxhc3Qgc3luY1xyXG5cdHJlbW92ZShtb2RpZmllZHMpIHtcclxuXHRcdHJldHVybiB0aGlzLl9jaGFuZ2VTdG9yZS5nZXQodGhpcy5fY2hhbmdlc05hbWUsIFtdKVxyXG5cclxuXHRcdC50aGVuKGNoYW5nZXMgPT4ge1xyXG5cdFx0XHR2YXIgcHJvbWlzZXMgPSBbXTtcclxuXHJcblx0XHRcdC8vIHJlbW92ZSB0aGUgaXRlbXMgd2UgcmVtb3ZlIGZyb20gbW9kaWZpZWRzXHJcblx0XHRcdGZvcihsZXQgY2hhbmdlIG9mIGNoYW5nZXMpIHtcclxuXHRcdFx0XHRpZihjaGFuZ2UudHlwZSA9PSBcInJlbW92ZVwiICYmIGNoYW5nZS50aW1lc3RhbXAgPj0gbW9kaWZpZWRzW2NoYW5nZS5pZF0pIHtcclxuXHRcdFx0XHRcdC8vIGRvbid0IHRyeSB0byBjcmVhdGUgdGhlIGl0ZW0gbG9jYWxseVxyXG5cdFx0XHRcdFx0ZGVsZXRlIG1vZGlmaWVkc1tjaGFuZ2UuaWRdO1xyXG5cclxuXHRcdFx0XHRcdC8vIGRlbGV0ZSBpdCByZW1vdGVseVxyXG5cdFx0XHRcdFx0cHJvbWlzZXMucHVzaCh0aGlzLl9yZW1vdGUucmVtb3ZlKGNoYW5nZS5pZCkpXHJcblx0XHRcdFx0fVxyXG5cdFx0XHR9XHJcblxyXG5cdFx0XHRyZXR1cm4gUHJvbWlzZS5hbGwocHJvbWlzZXMpO1xyXG5cdFx0fSk7XHJcblx0fVxyXG5cclxuXHQvLyB1cGRhdGUgdGhlIGxvY2FsL3JlbW90ZSB2YWx1ZXMgdGhhdCB3aGVyZSBjaGFuZ2VkXHJcblx0bWVyZ2VNb2RpZmllZHMobW9kaWZpZWRzKSB7XHJcblx0XHR2YXIgcmVtb3RlRGVsZXRlcyA9IFtdO1xyXG5cclxuXHRcdC8vIGdvIHRocm91Z2ggYWxsIHRoZSBtb2RpZmllZHNcclxuXHRcdHJldHVybiB0aGlzLl9sb2NhbC5nZXRBbGwoKVxyXG5cclxuXHRcdC50aGVuKHZhbHVlcyA9PiB7XHJcblx0XHRcdHZhciBwcm9taXNlcyA9IFtdO1xyXG5cdFx0XHQvLyBzdGFydCB3aXRoIGEgbGlzdCBvZiBhbGwgdGhlIGlkcyBhbmQgcmVtb3ZlIGlkcyB3ZSBoYXZlIGxvY2FsbHlcclxuXHRcdFx0dmFyIHJlbW90ZUNyZWF0ZXMgPSBPYmplY3QuZ2V0T3duUHJvcGVydHlOYW1lcyhtb2RpZmllZHMpO1xyXG5cclxuXHRcdFx0Ly8gY2hlY2sgYWxsIHRoZSBsb2NhbCB2YWx1ZXMgYWdhaW5zdCB0aGUgcmVtb3RlIG9uZXNcclxuXHRcdFx0Zm9yKGxldCB2YWx1ZSBvZiB2YWx1ZXMpIHtcclxuXHRcdFx0XHQvLyByZW1vdmUgaXRlbXMgd2UgYWxyZWFkeSBoYXZlIGZyb20gdGhlIGNyZWF0ZXNcclxuXHRcdFx0XHRsZXQgaW5kZXggPSByZW1vdGVDcmVhdGVzLmluZGV4T2YodmFsdWUuaWQpO1xyXG5cclxuXHRcdFx0XHRpZihpbmRleCAhPT0gLTEpIHtcclxuXHRcdFx0XHRcdHJlbW90ZUNyZWF0ZXMuc3BsaWNlKGluZGV4LCAxKTtcclxuXHRcdFx0XHR9XHJcblxyXG5cdFx0XHRcdC8vIGRlbGV0ZWQgZnJvbSB0aGUgcmVtb3RlIGFkYXB0b3JcclxuXHRcdFx0XHRpZighbW9kaWZpZWRzW3ZhbHVlLmlkXSkge1xyXG5cdFx0XHRcdFx0cmVtb3RlRGVsZXRlcy5wdXNoKHZhbHVlLmlkKTtcclxuXHRcdFx0XHR9XHJcblx0XHRcdFx0Ly8gdGhlIHJlbW90ZSB2ZXJzaW9uIGlzIG5ld2VyXHJcblx0XHRcdFx0ZWxzZSBpZihtb2RpZmllZHNbdmFsdWUuaWRdID4gdmFsdWUubW9kaWZpZWQpIHtcclxuXHRcdFx0XHRcdHByb21pc2VzLnB1c2goXHJcblx0XHRcdFx0XHRcdC8vIGZldGNoIHRoZSByZW1vdGUgdmFsdWVcclxuXHRcdFx0XHRcdFx0dGhpcy5nZXQodmFsdWUuaWQpXHJcblxyXG5cdFx0XHRcdFx0XHQudGhlbihuZXdWYWx1ZSA9PiB0aGlzLl9sb2NhbC5zZXQobmV3VmFsdWUpKVxyXG5cdFx0XHRcdFx0KTtcclxuXHRcdFx0XHR9XHJcblx0XHRcdFx0Ly8gdGhlIGxvY2FsIHZlcnNpb24gaXMgbmV3ZXJcclxuXHRcdFx0XHRlbHNlIGlmKG1vZGlmaWVkc1t2YWx1ZS5pZF0gPCB2YWx1ZS5tb2RpZmllZCkge1xyXG5cdFx0XHRcdFx0cHJvbWlzZXMucHVzaCh0aGlzLl9yZW1vdGUuc2V0KHZhbHVlKSk7XHJcblx0XHRcdFx0fVxyXG5cdFx0XHR9XHJcblxyXG5cdFx0XHQvLyBnZXQgdmFsdWVzIGZyb20gdGhlIHJlbW90ZSB3ZSBhcmUgbWlzc2luZ1xyXG5cdFx0XHRmb3IobGV0IGlkIG9mIHJlbW90ZUNyZWF0ZXMpIHtcclxuXHRcdFx0XHRwcm9taXNlcy5wdXNoKFxyXG5cdFx0XHRcdFx0dGhpcy5nZXQoaWQpXHJcblxyXG5cdFx0XHRcdFx0LnRoZW4obmV3VmFsdWUgPT4gdGhpcy5fbG9jYWwuc2V0KG5ld1ZhbHVlKSlcclxuXHRcdFx0XHQpO1xyXG5cdFx0XHR9XHJcblxyXG5cdFx0XHRyZXR1cm4gUHJvbWlzZS5hbGwocHJvbWlzZXMpO1xyXG5cdFx0fSlcclxuXHJcblx0XHQvLyByZXR1cm4gdGhlIGRlbGV0ZXNcclxuXHRcdC50aGVuKCgpID0+IHJlbW90ZURlbGV0ZXMpO1xyXG5cdH1cclxuXHJcblx0Ly8gZ2V0IGEgcmVtb3RlIHZhbHVlXHJcblx0Z2V0KGlkKSB7XHJcblx0XHRyZXR1cm4gUHJvbWlzZS5yZXNvbHZlKHRoaXMuX2l0ZW1zW2lkXSk7XHJcblx0fVxyXG5cclxuXHQvLyBzZW5kIGNyZWF0ZWQgdmFsdWVzIHRvIHRoZSBzZXJ2ZXJcclxuXHRjcmVhdGUocmVtb3RlRGVsZXRlcykge1xyXG5cdFx0cmV0dXJuIHRoaXMuX2NoYW5nZVN0b3JlLmdldCh0aGlzLl9jaGFuZ2VzTmFtZSlcclxuXHJcblx0XHQudGhlbigoY2hhbmdlcyA9IFtdKSA9PiB7XHJcblx0XHRcdHZhciBwcm9taXNlcyA9IFtdO1xyXG5cclxuXHRcdFx0Ly8gcmVtb3ZlIHRoZSBpdGVtcyB3ZSByZW1vdmUgZnJvbSBtb2RpZmllZHNcclxuXHRcdFx0Zm9yKGxldCBjaGFuZ2Ugb2YgY2hhbmdlcykge1xyXG5cdFx0XHRcdGlmKGNoYW5nZS50eXBlID09IFwiY3JlYXRlXCIpIHtcclxuXHRcdFx0XHRcdC8vIGlmIHdlIG1hcmtlZCB0aGlzIHZhbHVlIGFzIGEgZGVsZXRlIHVuZG8gdGhhdFxyXG5cdFx0XHRcdFx0bGV0IGluZGV4ID0gcmVtb3RlRGVsZXRlcy5pbmRleE9mKGNoYW5nZS5pZCk7XHJcblxyXG5cdFx0XHRcdFx0aWYoaW5kZXggIT09IC0xKSB7XHJcblx0XHRcdFx0XHRcdHJlbW90ZURlbGV0ZXMuc3BsaWNlKGluZGV4LCAxKTtcclxuXHRcdFx0XHRcdH1cclxuXHJcblx0XHRcdFx0XHQvLyBzYXZlIHRoZSB2YWx1ZSB0byB0aGUgcmVtb3RlXHJcblx0XHRcdFx0XHRwcm9taXNlcy5wdXNoKFxyXG5cdFx0XHRcdFx0XHR0aGlzLl9sb2NhbC5nZXQoY2hhbmdlLmlkKVxyXG5cclxuXHRcdFx0XHRcdFx0LnRoZW4odmFsdWUgPT4gdGhpcy5fcmVtb3RlLnNldCh2YWx1ZSkpXHJcblx0XHRcdFx0XHQpO1xyXG5cdFx0XHRcdH1cclxuXHRcdFx0fVxyXG5cclxuXHRcdFx0cmV0dXJuIFByb21pc2UuYWxsKHByb21pc2VzKTtcclxuXHRcdH0pO1xyXG5cdH1cclxuXHJcblx0Ly8gZGVsZXRlIHZhbHVlcyB0aGF0IHdoZXJlIGRlbGV0ZWQgZnJvbSB0aGUgcmVtb3RlIGhvc3RcclxuXHRhcHBseURlbGV0ZXMocmVtb3RlRGVsZXRlcykge1xyXG5cdFx0cmV0dXJuIFByb21pc2UuYWxsKHJlbW90ZURlbGV0ZXMubWFwKGlkID0+IHRoaXMuX2xvY2FsLnJlbW92ZShpZCkpKTtcclxuXHR9XHJcbn1cclxuXHJcbm1vZHVsZS5leHBvcnRzID0gU3luY2VyO1xyXG4iLCIvKipcclxuICogQ3JlYXRlIGEgZ2xvYmFsIG9iamVjdCB3aXRoIGNvbW1vbmx5IHVzZWQgbW9kdWxlcyB0byBhdm9pZCA1MCBtaWxsaW9uIHJlcXVpcmVzXHJcbiAqL1xyXG5cclxudmFyIEV2ZW50RW1pdHRlciA9IHJlcXVpcmUoXCIuL3V0aWwvZXZlbnQtZW1pdHRlclwiKTtcclxuXHJcbnZhciBsaWZlTGluZSA9IG5ldyBFdmVudEVtaXR0ZXIoKTtcclxuXHJcbi8vIGF0dGFjaCB1dGlsc1xyXG5saWZlTGluZS5EaXNwb3NhYmxlID0gcmVxdWlyZShcIi4vdXRpbC9kaXNwb3NhYmxlXCIpO1xyXG5saWZlTGluZS5FdmVudEVtaXR0ZXIgPSBFdmVudEVtaXR0ZXI7XHJcblxyXG4vLyBhdHRhY2ggbGlmZWxpbmUgdG8gdGhlIGdsb2JhbCBvYmplY3RcclxuKHR5cGVvZiB3aW5kb3cgPT0gXCJvYmplY3RcIiA/IHdpbmRvdyA6IHNlbGYpLmxpZmVMaW5lID0gbGlmZUxpbmU7XHJcbiIsIi8qKlxyXG4gKiBLZWVwIGEgbGlzdCBvZiBzdWJzY3JpcHRpb25zIHRvIHVuc3Vic2NyaWJlIGZyb20gdG9nZXRoZXJcclxuICovXHJcblxyXG5jbGFzcyBEaXNwb3NhYmxlIHtcclxuXHRjb25zdHJ1Y3RvcigpIHtcclxuXHRcdHRoaXMuX3N1YnNjcmlwdGlvbnMgPSBbXTtcclxuXHR9XHJcblxyXG5cdC8vIFVuc3Vic2NyaWJlIGZyb20gYWxsIHN1YnNjcmlwdGlvbnNcclxuXHRkaXNwb3NlKCkge1xyXG5cdFx0Ly8gcmVtb3ZlIHRoZSBmaXJzdCBzdWJzY3JpcHRpb24gdW50aWwgdGhlcmUgYXJlIG5vbmUgbGVmdFxyXG5cdFx0d2hpbGUodGhpcy5fc3Vic2NyaXB0aW9ucy5sZW5ndGggPiAwKSB7XHJcblx0XHRcdHRoaXMuX3N1YnNjcmlwdGlvbnMuc2hpZnQoKS51bnN1YnNjcmliZSgpO1xyXG5cdFx0fVxyXG5cdH1cclxuXHJcblx0Ly8gQWRkIGEgc3Vic2NyaXB0aW9uIHRvIHRoZSBkaXNwb3NhYmxlXHJcblx0YWRkKHN1YnNjcmlwdGlvbikge1xyXG5cdFx0dGhpcy5fc3Vic2NyaXB0aW9ucy5wdXNoKHN1YnNjcmlwdGlvbik7XHJcblx0fVxyXG5cclxuXHQvLyBkaXNwb3NlIHdoZW4gYW4gZXZlbnQgaXMgZmlyZWRcclxuXHRkaXNwb3NlT24oZW1pdHRlciwgZXZlbnQpIHtcclxuXHRcdHRoaXMuYWRkKGVtaXR0ZXIub24oZXZlbnQsICgpID0+IHRoaXMuZGlzcG9zZSgpKSk7XHJcblx0fVxyXG59O1xyXG5cclxubW9kdWxlLmV4cG9ydHMgPSBEaXNwb3NhYmxlO1xyXG4iLCIvKipcclxuICogQSBiYXNpYyBldmVudCBlbWl0dGVyXHJcbiAqL1xyXG5cclxuY2xhc3MgRXZlbnRFbWl0dGVyIHtcclxuXHRjb25zdHJ1Y3RvcigpIHtcclxuXHRcdHRoaXMuX2xpc3RlbmVycyA9IHt9O1xyXG5cdH1cclxuXHJcblx0LyoqXHJcblx0ICogQWRkIGFuIGV2ZW50IGxpc3RlbmVyXHJcblx0ICovXHJcblx0b24obmFtZSwgbGlzdGVuZXIpIHtcclxuXHRcdC8vIGlmIHdlIGRvbid0IGhhdmUgYW4gZXhpc3RpbmcgbGlzdGVuZXJzIGFycmF5IGNyZWF0ZSBvbmVcclxuXHRcdGlmKCF0aGlzLl9saXN0ZW5lcnNbbmFtZV0pIHtcclxuXHRcdFx0dGhpcy5fbGlzdGVuZXJzW25hbWVdID0gW107XHJcblx0XHR9XHJcblxyXG5cdFx0Ly8gYWRkIHRoZSBsaXN0ZW5lclxyXG5cdFx0dGhpcy5fbGlzdGVuZXJzW25hbWVdLnB1c2gobGlzdGVuZXIpO1xyXG5cclxuXHRcdC8vIGdpdmUgdGhlbSBhIHN1YnNjcmlwdGlvblxyXG5cdFx0cmV0dXJuIHtcclxuXHRcdFx0X2xpc3RlbmVyOiBsaXN0ZW5lcixcclxuXHJcblx0XHRcdHVuc3Vic2NyaWJlOiAoKSA9PiB7XHJcblx0XHRcdFx0Ly8gZmluZCB0aGUgbGlzdGVuZXJcclxuXHRcdFx0XHR2YXIgaW5kZXggPSB0aGlzLl9saXN0ZW5lcnNbbmFtZV0uaW5kZXhPZihsaXN0ZW5lcik7XHJcblxyXG5cdFx0XHRcdGlmKGluZGV4ICE9PSAtMSkge1xyXG5cdFx0XHRcdFx0dGhpcy5fbGlzdGVuZXJzW25hbWVdLnNwbGljZShpbmRleCwgMSk7XHJcblx0XHRcdFx0fVxyXG5cdFx0XHR9XHJcblx0XHR9O1xyXG5cdH1cclxuXHJcblx0LyoqXHJcblx0ICogRW1pdCBhbiBldmVudFxyXG5cdCAqL1xyXG5cdGVtaXQobmFtZSwgLi4uYXJncykge1xyXG5cdFx0Ly8gY2hlY2sgZm9yIGxpc3RlbmVyc1xyXG5cdFx0aWYodGhpcy5fbGlzdGVuZXJzW25hbWVdKSB7XHJcblx0XHRcdGZvcihsZXQgbGlzdGVuZXIgb2YgdGhpcy5fbGlzdGVuZXJzW25hbWVdKSB7XHJcblx0XHRcdFx0Ly8gY2FsbCB0aGUgbGlzdGVuZXJzXHJcblx0XHRcdFx0bGlzdGVuZXIoLi4uYXJncyk7XHJcblx0XHRcdH1cclxuXHRcdH1cclxuXHR9XHJcblxyXG5cdC8qKlxyXG5cdCAqIEVtaXQgYW4gZXZlbnQgYW5kIHNraXAgc29tZSBsaXN0ZW5lcnNcclxuXHQgKi9cclxuXHRwYXJ0aWFsRW1pdChuYW1lLCBza2lwcyA9IFtdLCAuLi5hcmdzKSB7XHJcblx0XHQvLyBhbGxvdyBhIHNpbmdsZSBpdGVtXHJcblx0XHRpZighQXJyYXkuaXNBcnJheShza2lwcykpIHtcclxuXHRcdFx0c2tpcHMgPSBbc2tpcHNdO1xyXG5cdFx0fVxyXG5cclxuXHRcdC8vIGNoZWNrIGZvciBsaXN0ZW5lcnNcclxuXHRcdGlmKHRoaXMuX2xpc3RlbmVyc1tuYW1lXSkge1xyXG5cdFx0XHRmb3IobGV0IGxpc3RlbmVyIG9mIHRoaXMuX2xpc3RlbmVyc1tuYW1lXSkge1xyXG5cdFx0XHRcdC8vIHRoaXMgZXZlbnQgbGlzdGVuZXIgaXMgYmVpbmcgc2tpcGVkXHJcblx0XHRcdFx0aWYoc2tpcHMuZmluZChza2lwID0+IHNraXAuX2xpc3RlbmVyID09IGxpc3RlbmVyKSkge1xyXG5cdFx0XHRcdFx0Y29udGludWU7XHJcblx0XHRcdFx0fVxyXG5cclxuXHRcdFx0XHQvLyBjYWxsIHRoZSBsaXN0ZW5lcnNcclxuXHRcdFx0XHRsaXN0ZW5lciguLi5hcmdzKTtcclxuXHRcdFx0fVxyXG5cdFx0fVxyXG5cdH1cclxufVxyXG5cclxubW9kdWxlLmV4cG9ydHMgPSBFdmVudEVtaXR0ZXI7XHJcbiJdfQ==
