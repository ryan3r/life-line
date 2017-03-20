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

},{"idb":1}],3:[function(require,module,exports){
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

},{"./util/dom-maker":5}],4:[function(require,module,exports){
"use strict";

var _slicedToArray = function () { function sliceIterator(arr, i) { var _arr = []; var _n = true; var _d = false; var _e = undefined; try { for (var _i = arr[Symbol.iterator](), _s; !(_n = (_s = _i.next()).done); _n = true) { _arr.push(_s.value); if (i && _arr.length === i) break; } } catch (err) { _d = true; _e = err; } finally { try { if (!_n && _i["return"]) _i["return"](); } finally { if (_d) throw _e; } } return _arr; } return function (arr, i) { if (Array.isArray(arr)) { return arr; } else if (Symbol.iterator in Object(arr)) { return sliceIterator(arr, i); } else { throw new TypeError("Invalid attempt to destructure non-iterable instance"); } }; }();

// create the global object
require("../common/global");
require("./global");

var KeyValueStore = require("../common/data-stores/key-value-store");
var IdbAdaptor = require("./data-stores/idb-adaptor");

var syncStore = new KeyValueStore(new IdbAdaptor("sync-store"));

// all the files to cache
var CACHED_FILES = ["/", "/static/bundle.js", "/static/style.css", "/static/icon-144.png", "/static/manifest.json"];

var STATIC_CACHE = "static";

// cache the version of the client
var clientVersion;
// don't run 2 downloads at the same time
var downloading;
// we installed a new version in the install phase
var newVersionInstalled;

// download a new version
var download = function (install) {
	// already downloading
	if (downloading) {
		return downloading;
	}

	// save the new version
	var version;

	// open the cache
	downloading = caches.open(STATIC_CACHE).then(function (cache) {
		// download all the files
		return Promise.all(CACHED_FILES.map(function (url) {
			// download the file
			return fetch(url).then(function (res) {
				// save the file
				var promises = [cache.put(new Request(url), res)];

				// save the version
				if (!version) {
					version = clientVersion = res.headers.get("server");

					promises.push(syncStore.set("version", version));
				}

				return promises.length == 1 ? promises[0] : Promise.all(promises);
			});
		}))

		// notify the client(s) of the update
		.then(function () {
			// wait for activation
			if (install) {
				newVersionInstalled = version;
			}
			// updated on reload tell the clients
			else {
					return notifyClients(version);
				}
		});
	});

	return downloading

	// release the lock
	.then(function () {
		return downloading = undefined;
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
var checkForUpdates = function () {
	var _ref = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : {},
	    newVersion = _ref.newVersion,
	    install = _ref.install;

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
		oldVersion = syncStore.get("version");
	}

	return Promise.all([newVersion, oldVersion]).then(function (_ref2) {
		var _ref3 = _slicedToArray(_ref2, 2),
		    newVersion = _ref3[0],
		    oldVersion = _ref3[1];

		// same version do nothing
		if (newVersion == oldVersion) {
			return syncStore.set("version", oldVersion);
		}

		// download the new version
		return download(install);
	});
};

// when we are installed check for updates
self.addEventListener("install", function (e) {
	e.waitUntil(checkForUpdates({ install: true }).then(function () {
		return self.skipWaiting();
	}));
});

self.addEventListener("activate", function (e) {
	e.waitUntil(self.clients.claim().then(function () {
		// notify clients of the update
		if (newVersionInstalled) {
			notifyClients(newVersionInstalled);

			newVersionInstalled = undefined;
		}
	}));
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
			return new Response(err.message, {
				status: 500
			});
		}).then(function (res) {
			// check for updates
			checkForUpdates({
				newVersion: res.headers.get("server")
			});

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

},{"../common/data-stores/key-value-store":6,"../common/global":7,"./data-stores/idb-adaptor":2,"./global":3}],5:[function(require,module,exports){
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

},{}],6:[function(require,module,exports){
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

},{"../util/event-emitter":9}],7:[function(require,module,exports){
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

},{"./util/disposable":8,"./util/event-emitter":9}],8:[function(require,module,exports){
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

},{}],9:[function(require,module,exports){
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

},{}]},{},[4])
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCJub2RlX21vZHVsZXMvaWRiL2xpYi9pZGIuanMiLCJzcmNcXGNsaWVudFxcZGF0YS1zdG9yZXNcXGlkYi1hZGFwdG9yLmpzIiwic3JjXFxjbGllbnRcXGdsb2JhbC5qcyIsInNyY1xcY2xpZW50XFxzdy1pbmRleC5qcyIsInNyY1xcY2xpZW50XFx1dGlsXFxkb20tbWFrZXIuanMiLCJzcmNcXGNvbW1vblxcZGF0YS1zdG9yZXNcXGtleS12YWx1ZS1zdG9yZS5qcyIsInNyY1xcY29tbW9uXFxnbG9iYWwuanMiLCJzcmNcXGNvbW1vblxcdXRpbFxcZGlzcG9zYWJsZS5qcyIsInNyY1xcY29tbW9uXFx1dGlsXFxldmVudC1lbWl0dGVyLmpzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBO0FDQUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7Ozs7Ozs7QUN0VEE7Ozs7QUFJQSxJQUFJLE1BQU0sUUFBUSxLQUFSLENBQVY7O0FBRUEsSUFBTSxlQUFlLENBQUMsYUFBRCxFQUFnQixZQUFoQixDQUFyQjs7QUFFQTtBQUNBLElBQUksWUFBWSxJQUFJLElBQUosQ0FBUyxhQUFULEVBQXdCLENBQXhCLEVBQTJCLGNBQU07QUFDaEQ7QUFDQSxLQUFHLEdBQUcsVUFBSCxHQUFnQixDQUFuQixFQUNDLEdBQUcsaUJBQUgsQ0FBcUIsYUFBckIsRUFBb0MsRUFBRSxTQUFTLElBQVgsRUFBcEM7QUFDRCxLQUFHLEdBQUcsVUFBSCxHQUFnQixDQUFuQixFQUNDLEdBQUcsaUJBQUgsQ0FBcUIsWUFBckIsRUFBbUMsRUFBRSxTQUFTLElBQVgsRUFBbkM7O0FBRUQ7QUFDQSxLQUFHLEdBQUcsVUFBSCxJQUFpQixDQUFwQixFQUF1QjtBQUN0QixLQUFHLGlCQUFILENBQXFCLFlBQXJCO0FBQ0EsS0FBRyxpQkFBSCxDQUFxQixZQUFyQixFQUFtQyxFQUFFLFNBQVMsSUFBWCxFQUFuQztBQUNBO0FBQ0QsQ0FaZSxDQUFoQjs7SUFjTSxVO0FBQ0wscUJBQVksSUFBWixFQUFrQjtBQUFBOztBQUNqQixPQUFLLElBQUwsR0FBWSxJQUFaOztBQUVBO0FBQ0EsTUFBRyxhQUFhLE9BQWIsQ0FBcUIsSUFBckIsTUFBK0IsQ0FBQyxDQUFuQyxFQUFzQztBQUNyQyxTQUFNLElBQUksS0FBSixxQkFBNEIsSUFBNUIsa0NBQU47QUFDQTtBQUNEOztBQUVEOzs7OzsrQkFDYSxTLEVBQVc7QUFBQTs7QUFDdkIsVUFBTyxVQUFVLElBQVYsQ0FBZSxjQUFNO0FBQzNCLFdBQU8sR0FDTCxXQURLLENBQ08sTUFBSyxJQURaLEVBQ2tCLGFBQWEsV0FEL0IsRUFFTCxXQUZLLENBRU8sTUFBSyxJQUZaLENBQVA7QUFHQSxJQUpNLENBQVA7QUFLQTs7QUFFRDs7Ozs7OzJCQUdTO0FBQ1IsVUFBTyxLQUFLLFlBQUwsR0FDTCxJQURLLENBQ0E7QUFBQSxXQUFTLE1BQU0sTUFBTixFQUFUO0FBQUEsSUFEQSxDQUFQO0FBRUE7O0FBRUQ7Ozs7OztzQkFHSSxHLEVBQUs7QUFDUixVQUFPLEtBQUssWUFBTCxHQUNMLElBREssQ0FDQTtBQUFBLFdBQVMsTUFBTSxHQUFOLENBQVUsR0FBVixDQUFUO0FBQUEsSUFEQSxDQUFQO0FBRUE7O0FBRUQ7Ozs7OztzQkFHSSxLLEVBQU87QUFDVixVQUFPLEtBQUssWUFBTCxDQUFrQixJQUFsQixFQUNMLElBREssQ0FDQTtBQUFBLFdBQVMsTUFBTSxHQUFOLENBQVUsS0FBVixDQUFUO0FBQUEsSUFEQSxDQUFQO0FBRUE7O0FBRUQ7Ozs7Ozt5QkFHTyxHLEVBQUs7QUFDWCxVQUFPLEtBQUssWUFBTCxDQUFrQixJQUFsQixFQUNMLElBREssQ0FDQTtBQUFBLFdBQVMsTUFBTSxNQUFOLENBQWEsR0FBYixDQUFUO0FBQUEsSUFEQSxDQUFQO0FBRUE7Ozs7OztBQUdGLE9BQU8sT0FBUCxHQUFpQixVQUFqQjs7Ozs7QUMzRUE7Ozs7QUFJQSxTQUFTLE9BQVQsR0FBbUIsUUFBUSxrQkFBUixDQUFuQjs7QUFFQTtBQUNBLFNBQVMsU0FBVCxHQUFxQixVQUFTLElBQVQsRUFBZSxFQUFmLEVBQW1CO0FBQ3ZDO0FBQ0EsS0FBSSxXQUFXLFNBQVMsRUFBVCxDQUFZLGlCQUFpQixJQUE3QixFQUFtQyxFQUFuQyxDQUFmOztBQUVBO0FBQ0EsVUFBUyxJQUFULENBQWMsZUFBZCxFQUErQixJQUEvQjs7QUFFQTtBQUNBLEtBQUksWUFBWSxTQUFTLEVBQVQsQ0FBWSxtQkFBWixFQUFpQyxZQUFNO0FBQ3REO0FBQ0EsV0FBUyxXQUFUO0FBQ0EsWUFBVSxXQUFWO0FBQ0EsRUFKZSxDQUFoQjs7QUFNQSxRQUFPO0FBQ04sYUFETSxjQUNRO0FBQ2I7QUFDQSxZQUFTLFdBQVQ7QUFDQSxhQUFVLFdBQVY7O0FBRUE7QUFDQSxZQUFTLElBQVQsQ0FBYyxlQUFkLEVBQStCLElBQS9CO0FBQ0E7QUFSSyxFQUFQO0FBVUEsQ0F4QkQ7Ozs7Ozs7QUNQQTtBQUNBLFFBQVEsa0JBQVI7QUFDQSxRQUFRLFVBQVI7O0FBRUEsSUFBSSxnQkFBZ0IsUUFBUSx1Q0FBUixDQUFwQjtBQUNBLElBQUksYUFBYSxRQUFRLDJCQUFSLENBQWpCOztBQUVBLElBQUksWUFBWSxJQUFJLGFBQUosQ0FBa0IsSUFBSSxVQUFKLENBQWUsWUFBZixDQUFsQixDQUFoQjs7QUFFQTtBQUNBLElBQU0sZUFBZSxDQUNwQixHQURvQixFQUVwQixtQkFGb0IsRUFHcEIsbUJBSG9CLEVBSXBCLHNCQUpvQixFQUtwQix1QkFMb0IsQ0FBckI7O0FBUUEsSUFBTSxlQUFlLFFBQXJCOztBQUVBO0FBQ0EsSUFBSSxhQUFKO0FBQ0E7QUFDQSxJQUFJLFdBQUo7QUFDQTtBQUNBLElBQUksbUJBQUo7O0FBRUE7QUFDQSxJQUFJLFdBQVcsVUFBUyxPQUFULEVBQWtCO0FBQ2hDO0FBQ0EsS0FBRyxXQUFILEVBQWdCO0FBQ2YsU0FBTyxXQUFQO0FBQ0E7O0FBRUQ7QUFDQSxLQUFJLE9BQUo7O0FBRUE7QUFDQSxlQUFjLE9BQU8sSUFBUCxDQUFZLFlBQVosRUFFYixJQUZhLENBRVIsaUJBQVM7QUFDZDtBQUNBLFNBQU8sUUFBUSxHQUFSLENBQ04sYUFBYSxHQUFiLENBQWlCLGVBQU87QUFDdkI7QUFDQSxVQUFPLE1BQU0sR0FBTixFQUVOLElBRk0sQ0FFRCxlQUFPO0FBQ1o7QUFDQSxRQUFJLFdBQVcsQ0FDZCxNQUFNLEdBQU4sQ0FBVSxJQUFJLE9BQUosQ0FBWSxHQUFaLENBQVYsRUFBNEIsR0FBNUIsQ0FEYyxDQUFmOztBQUlBO0FBQ0EsUUFBRyxDQUFDLE9BQUosRUFBYTtBQUNaLGVBQVUsZ0JBQWdCLElBQUksT0FBSixDQUFZLEdBQVosQ0FBZ0IsUUFBaEIsQ0FBMUI7O0FBRUEsY0FBUyxJQUFULENBQWMsVUFBVSxHQUFWLENBQWMsU0FBZCxFQUF5QixPQUF6QixDQUFkO0FBQ0E7O0FBRUQsV0FBTyxTQUFTLE1BQVQsSUFBbUIsQ0FBbkIsR0FBdUIsU0FBUyxDQUFULENBQXZCLEdBQXFDLFFBQVEsR0FBUixDQUFZLFFBQVosQ0FBNUM7QUFDQSxJQWhCTSxDQUFQO0FBaUJBLEdBbkJELENBRE07O0FBdUJQO0FBdkJPLEdBd0JOLElBeEJNLENBd0JELFlBQU07QUFDWDtBQUNBLE9BQUcsT0FBSCxFQUFZO0FBQ1gsMEJBQXNCLE9BQXRCO0FBQ0E7QUFDRDtBQUhBLFFBSUs7QUFDSixZQUFPLGNBQWMsT0FBZCxDQUFQO0FBQ0E7QUFDRCxHQWpDTSxDQUFQO0FBa0NBLEVBdENhLENBQWQ7O0FBd0NBLFFBQU87O0FBRVA7QUFGTyxFQUdOLElBSE0sQ0FHRDtBQUFBLFNBQU0sY0FBYyxTQUFwQjtBQUFBLEVBSEMsQ0FBUDtBQUlBLENBdEREOztBQXdEQTtBQUNBLElBQUksZ0JBQWdCLFVBQVMsT0FBVCxFQUFrQjtBQUNyQztBQUNBLFFBQU8sUUFBUSxRQUFSLENBQWlCLEVBQWpCLEVBRU4sSUFGTSxDQUVELG1CQUFXO0FBQUE7QUFBQTtBQUFBOztBQUFBO0FBQ2hCLHdCQUFrQixPQUFsQiw4SEFBMkI7QUFBQSxRQUFuQixNQUFtQjs7QUFDMUI7QUFDQSxXQUFPLFdBQVAsQ0FBbUI7QUFDbEIsV0FBTSxnQkFEWTtBQUVsQjtBQUZrQixLQUFuQjtBQUlBO0FBUGU7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQVFoQixFQVZNLENBQVA7QUFXQSxDQWJEOztBQWVBO0FBQ0EsSUFBSSxrQkFBa0IsWUFBcUM7QUFBQSxnRkFBSixFQUFJO0FBQUEsS0FBM0IsVUFBMkIsUUFBM0IsVUFBMkI7QUFBQSxLQUFmLE9BQWUsUUFBZixPQUFlOztBQUMxRDtBQUNBLEtBQUcsVUFBSCxFQUFlO0FBQ2QsZUFBYSxRQUFRLE9BQVIsQ0FBZ0IsVUFBaEIsQ0FBYjtBQUNBO0FBQ0Q7QUFIQSxNQUlLO0FBQ0osZ0JBQWEsTUFBTSxHQUFOLEVBRVosSUFGWSxDQUVQO0FBQUEsV0FBTyxJQUFJLE9BQUosQ0FBWSxHQUFaLENBQWdCLFFBQWhCLENBQVA7QUFBQSxJQUZPLENBQWI7QUFHQTs7QUFFRCxLQUFJLFVBQUo7O0FBRUE7QUFDQSxLQUFHLGFBQUgsRUFBa0I7QUFDakIsZUFBYSxRQUFRLE9BQVIsQ0FBZ0IsYUFBaEIsQ0FBYjtBQUNBLEVBRkQsTUFHSztBQUNKLGVBQWEsVUFBVSxHQUFWLENBQWMsU0FBZCxDQUFiO0FBQ0E7O0FBRUQsUUFBTyxRQUFRLEdBQVIsQ0FBWSxDQUNsQixVQURrQixFQUVsQixVQUZrQixDQUFaLEVBS04sSUFMTSxDQUtELGlCQUE4QjtBQUFBO0FBQUEsTUFBNUIsVUFBNEI7QUFBQSxNQUFoQixVQUFnQjs7QUFDbkM7QUFDQSxNQUFHLGNBQWMsVUFBakIsRUFBNkI7QUFDNUIsVUFBTyxVQUFVLEdBQVYsQ0FBYyxTQUFkLEVBQXlCLFVBQXpCLENBQVA7QUFDQTs7QUFFRDtBQUNBLFNBQU8sU0FBUyxPQUFULENBQVA7QUFDQSxFQWJNLENBQVA7QUFjQSxDQXBDRDs7QUFzQ0E7QUFDQSxLQUFLLGdCQUFMLENBQXNCLFNBQXRCLEVBQWlDLGFBQUs7QUFDckMsR0FBRSxTQUFGLENBQ0MsZ0JBQWdCLEVBQUUsU0FBUyxJQUFYLEVBQWhCLEVBRUMsSUFGRCxDQUVNO0FBQUEsU0FBTSxLQUFLLFdBQUwsRUFBTjtBQUFBLEVBRk4sQ0FERDtBQUtBLENBTkQ7O0FBUUEsS0FBSyxnQkFBTCxDQUFzQixVQUF0QixFQUFrQyxhQUFLO0FBQ3RDLEdBQUUsU0FBRixDQUNDLEtBQUssT0FBTCxDQUFhLEtBQWIsR0FFQyxJQUZELENBRU0sWUFBTTtBQUNYO0FBQ0EsTUFBRyxtQkFBSCxFQUF3QjtBQUN2QixpQkFBYyxtQkFBZDs7QUFFQSx5QkFBc0IsU0FBdEI7QUFDQTtBQUNELEVBVEQsQ0FERDtBQVlBLENBYkQ7O0FBZUE7QUFDQSxLQUFLLGdCQUFMLENBQXNCLE9BQXRCLEVBQStCLGFBQUs7QUFDbkM7QUFDQSxLQUFJLE1BQU0sSUFBSSxHQUFKLENBQVEsRUFBRSxPQUFGLENBQVUsR0FBbEIsRUFBdUIsUUFBakM7O0FBRUE7QUFDQSxLQUFHLElBQUksTUFBSixDQUFXLENBQVgsRUFBYyxDQUFkLEtBQW9CLE9BQXZCLEVBQWdDO0FBQy9CLElBQUUsV0FBRixDQUNDLE1BQU0sRUFBRSxPQUFSLEVBQWlCO0FBQ2hCLGdCQUFhO0FBREcsR0FBakI7O0FBSUE7QUFKQSxHQUtDLEtBTEQsQ0FLTyxlQUFPO0FBQ2I7QUFDQSxVQUFPLElBQUksUUFBSixDQUFhLElBQUksT0FBakIsRUFBMEI7QUFDaEMsWUFBUTtBQUR3QixJQUExQixDQUFQO0FBR0EsR0FWRCxFQVlDLElBWkQsQ0FZTSxlQUFPO0FBQ1o7QUFDQSxtQkFBZ0I7QUFDZixnQkFBWSxJQUFJLE9BQUosQ0FBWSxHQUFaLENBQWdCLFFBQWhCO0FBREcsSUFBaEI7O0FBSUEsVUFBTyxHQUFQO0FBQ0EsR0FuQkQsQ0FERDtBQXNCQTtBQUNEO0FBeEJBLE1BeUJLO0FBQ0osS0FBRSxXQUFGLENBQ0MsT0FBTyxLQUFQLENBQWEsRUFBRSxPQUFmLEVBRUMsSUFGRCxDQUVNLGVBQU87QUFDWjtBQUNBLFFBQUcsQ0FBQyxHQUFKLEVBQVM7QUFDUixZQUFPLE9BQU8sS0FBUCxDQUFhLElBQUksT0FBSixDQUFZLEdBQVosQ0FBYixDQUFQO0FBQ0E7O0FBRUQsV0FBTyxHQUFQO0FBQ0EsSUFURCxDQUREO0FBWUE7QUFDRCxDQTVDRDs7Ozs7QUNwS0E7Ozs7QUFJQSxJQUFNLGVBQWUsQ0FBQyxLQUFELEVBQVEsTUFBUixDQUFyQjtBQUNBLElBQU0sZ0JBQWdCLDRCQUF0Qjs7QUFFQTtBQUNBLElBQUksVUFBVSxZQUFvQjtBQUFBLEtBQVgsSUFBVyx1RUFBSixFQUFJOztBQUNqQztBQUNBLEtBQUksU0FBUyxLQUFLLE1BQUwsSUFBZSxFQUE1Qjs7QUFFQSxLQUFJLEdBQUo7O0FBRUE7QUFDQSxLQUFHLGFBQWEsT0FBYixDQUFxQixLQUFLLEdBQTFCLE1BQW1DLENBQUMsQ0FBdkMsRUFBMEM7QUFDekMsUUFBTSxTQUFTLGVBQVQsQ0FBeUIsYUFBekIsRUFBd0MsS0FBSyxHQUE3QyxDQUFOO0FBQ0E7QUFDRDtBQUhBLE1BSUs7QUFDSixTQUFNLFNBQVMsYUFBVCxDQUF1QixLQUFLLEdBQUwsSUFBWSxLQUFuQyxDQUFOO0FBQ0E7O0FBRUQ7QUFDQSxLQUFHLEtBQUssT0FBUixFQUFpQjtBQUNoQixNQUFJLFlBQUosQ0FBaUIsT0FBakIsRUFBMEIsT0FBTyxLQUFLLE9BQVosSUFBdUIsUUFBdkIsR0FBa0MsS0FBSyxPQUF2QyxHQUFpRCxLQUFLLE9BQUwsQ0FBYSxJQUFiLENBQWtCLEdBQWxCLENBQTNFO0FBQ0E7O0FBRUQ7QUFDQSxLQUFHLEtBQUssS0FBUixFQUFlO0FBQ2QsU0FBTyxtQkFBUCxDQUEyQixLQUFLLEtBQWhDLEVBRUMsT0FGRCxDQUVTO0FBQUEsVUFBUSxJQUFJLFlBQUosQ0FBaUIsSUFBakIsRUFBdUIsS0FBSyxLQUFMLENBQVcsSUFBWCxDQUF2QixDQUFSO0FBQUEsR0FGVDtBQUdBOztBQUVEO0FBQ0EsS0FBRyxLQUFLLElBQVIsRUFBYztBQUNiLE1BQUksU0FBSixHQUFnQixLQUFLLElBQXJCO0FBQ0E7O0FBRUQ7QUFDQSxLQUFHLEtBQUssTUFBUixFQUFnQjtBQUNmLE9BQUssTUFBTCxDQUFZLFlBQVosQ0FBeUIsR0FBekIsRUFBOEIsS0FBSyxNQUFuQztBQUNBOztBQUVEO0FBQ0EsS0FBRyxLQUFLLEVBQVIsRUFBWTtBQUFBLHdCQUNILElBREc7QUFFVixPQUFJLGdCQUFKLENBQXFCLElBQXJCLEVBQTJCLEtBQUssRUFBTCxDQUFRLElBQVIsQ0FBM0I7O0FBRUE7QUFDQSxPQUFHLEtBQUssSUFBUixFQUFjO0FBQ2IsU0FBSyxJQUFMLENBQVUsR0FBVixDQUFjO0FBQ2Isa0JBQWE7QUFBQSxhQUFNLElBQUksbUJBQUosQ0FBd0IsSUFBeEIsRUFBOEIsS0FBSyxFQUFMLENBQVEsSUFBUixDQUE5QixDQUFOO0FBQUE7QUFEQSxLQUFkO0FBR0E7QUFUUzs7QUFBQTtBQUFBO0FBQUE7O0FBQUE7QUFDWCx3QkFBZ0IsT0FBTyxtQkFBUCxDQUEyQixLQUFLLEVBQWhDLENBQWhCLDhIQUFxRDtBQUFBLFFBQTdDLElBQTZDOztBQUFBLFVBQTdDLElBQTZDO0FBU3BEO0FBVlU7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQVdYOztBQUVEO0FBQ0EsS0FBRyxLQUFLLEtBQVIsRUFBZTtBQUNkLE1BQUksS0FBSixHQUFZLEtBQUssS0FBakI7QUFDQTs7QUFFRDtBQUNBLEtBQUcsS0FBSyxJQUFSLEVBQWM7QUFDYixTQUFPLEtBQUssSUFBWixJQUFvQixHQUFwQjtBQUNBOztBQUVEO0FBQ0EsS0FBRyxLQUFLLFFBQVIsRUFBa0I7QUFBQTtBQUFBO0FBQUE7O0FBQUE7QUFDakIseUJBQWlCLEtBQUssUUFBdEIsbUlBQWdDO0FBQUEsUUFBeEIsS0FBd0I7O0FBQy9CO0FBQ0EsUUFBRyxNQUFNLE9BQU4sQ0FBYyxLQUFkLENBQUgsRUFBeUI7QUFDeEIsYUFBUTtBQUNQLGFBQU87QUFEQSxNQUFSO0FBR0E7O0FBRUQ7QUFDQSxVQUFNLE1BQU4sR0FBZSxHQUFmO0FBQ0EsVUFBTSxJQUFOLEdBQWEsS0FBSyxJQUFsQjtBQUNBLFVBQU0sTUFBTixHQUFlLE1BQWY7O0FBRUE7QUFDQSxTQUFLLEtBQUw7QUFDQTtBQWhCZ0I7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQWlCakI7O0FBRUQsUUFBTyxNQUFQO0FBQ0EsQ0FsRkQ7O0FBb0ZBO0FBQ0EsSUFBSSxZQUFZLFVBQVMsS0FBVCxFQUFnQjtBQUMvQjtBQUNBLEtBQUcsTUFBTSxPQUFOLENBQWMsS0FBZCxDQUFILEVBQXlCO0FBQ3hCLFVBQVE7QUFDUCxhQUFVO0FBREgsR0FBUjtBQUdBOztBQUVEO0FBQ0EsS0FBSSxTQUFTLEVBQWI7O0FBVCtCO0FBQUE7QUFBQTs7QUFBQTtBQVcvQix3QkFBZ0IsTUFBTSxLQUF0QixtSUFBNkI7QUFBQSxPQUFyQixJQUFxQjs7QUFDNUI7QUFDQSxRQUFLLE1BQUwsS0FBZ0IsS0FBSyxNQUFMLEdBQWMsTUFBTSxNQUFwQztBQUNBLFFBQUssSUFBTCxLQUFjLEtBQUssSUFBTCxHQUFZLE1BQU0sSUFBaEM7QUFDQSxRQUFLLE1BQUwsR0FBYyxNQUFkOztBQUVBO0FBQ0EsUUFBSyxJQUFMO0FBQ0E7O0FBRUQ7QUFyQitCO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7O0FBc0IvQixLQUFHLE1BQU0sSUFBVCxFQUFlO0FBQ2QsTUFBSSxlQUFlLE1BQU0sSUFBTixDQUFXLE1BQVgsQ0FBbkI7O0FBRUE7QUFDQSxNQUFHLGdCQUFnQixNQUFNLElBQXpCLEVBQStCO0FBQzlCLFNBQU0sSUFBTixDQUFXLEdBQVgsQ0FBZSxZQUFmO0FBQ0E7QUFDRDs7QUFFRCxRQUFPLE1BQVA7QUFDQSxDQWhDRDs7QUFrQ0E7QUFDQSxJQUFJLFVBQVUsRUFBZDs7QUFFQSxJQUFJLE9BQU8sT0FBTyxPQUFQLEdBQWlCLFVBQVMsSUFBVCxFQUFlO0FBQzFDO0FBQ0EsS0FBRyxNQUFNLE9BQU4sQ0FBYyxJQUFkLEtBQXVCLEtBQUssS0FBL0IsRUFBc0M7QUFDckMsU0FBTyxVQUFVLElBQVYsQ0FBUDtBQUNBO0FBQ0Q7QUFIQSxNQUlLLElBQUcsS0FBSyxNQUFSLEVBQWdCO0FBQ3BCLE9BQUksU0FBUyxRQUFRLEtBQUssTUFBYixDQUFiOztBQUVBO0FBQ0EsT0FBRyxDQUFDLE1BQUosRUFBWTtBQUNYLFVBQU0sSUFBSSxLQUFKLGNBQXFCLEtBQUssTUFBMUIsa0RBQU47QUFDQTs7QUFFRDtBQUNBLE9BQUksUUFBUSxPQUFPLElBQVAsQ0FBWSxJQUFaLENBQVo7O0FBRUEsVUFBTyxVQUFVO0FBQ2hCLFlBQVEsS0FBSyxNQURHO0FBRWhCLFVBQU0sS0FBSyxJQUZLO0FBR2hCLFdBQU8sTUFBTSxPQUFOLENBQWMsS0FBZCxJQUF1QixLQUF2QixHQUErQixDQUFDLEtBQUQsQ0FIdEI7QUFJaEIsVUFBTSxPQUFPLElBQVAsSUFBZSxPQUFPLElBQVAsQ0FBWSxJQUFaLENBQWlCLE1BQWpCLEVBQXlCLElBQXpCO0FBSkwsSUFBVixDQUFQO0FBTUE7QUFDRDtBQWxCSyxPQW1CQTtBQUNKLFdBQU8sUUFBUSxJQUFSLENBQVA7QUFDQTtBQUNELENBNUJEOztBQThCQTtBQUNBLEtBQUssUUFBTCxHQUFnQixVQUFTLElBQVQsRUFBZSxNQUFmLEVBQXVCO0FBQ3RDLFNBQVEsSUFBUixJQUFnQixNQUFoQjtBQUNBLENBRkQ7Ozs7Ozs7Ozs7Ozs7QUNqS0E7Ozs7QUFJQSxJQUFJLGVBQWUsUUFBUSx1QkFBUixDQUFuQjs7SUFFTSxhOzs7QUFDTCx3QkFBWSxPQUFaLEVBQXFCO0FBQUE7O0FBQUE7O0FBRXBCLFFBQUssUUFBTCxHQUFnQixPQUFoQjs7QUFFQTtBQUNBLE1BQUcsQ0FBQyxPQUFKLEVBQWE7QUFDWixTQUFNLElBQUksS0FBSixDQUFVLG1EQUFWLENBQU47QUFDQTtBQVBtQjtBQVFwQjs7QUFFRDs7Ozs7OztzQkFHSSxHLEVBQUssUSxFQUFVO0FBQ2xCO0FBQ0EsT0FBRyxLQUFLLFVBQUwsSUFBbUIsS0FBSyxVQUFMLENBQWdCLGNBQWhCLENBQStCLEdBQS9CLENBQXRCLEVBQTJEO0FBQzFELFdBQU8sUUFBUSxPQUFSLENBQWdCLEtBQUssVUFBTCxDQUFnQixHQUFoQixDQUFoQixDQUFQO0FBQ0E7O0FBRUQsVUFBTyxLQUFLLFFBQUwsQ0FBYyxHQUFkLENBQWtCLEdBQWxCLEVBRU4sSUFGTSxDQUVELGtCQUFVO0FBQ2Y7QUFDQSxRQUFHLENBQUMsTUFBSixFQUFZO0FBQ1gsWUFBTyxRQUFQO0FBQ0E7O0FBRUQsV0FBTyxPQUFPLEtBQWQ7QUFDQSxJQVRNLENBQVA7QUFVQTs7QUFFRDs7Ozs7Ozs7OztzQkFPSSxHLEVBQUssSyxFQUFPO0FBQ2Y7QUFDQSxPQUFHLE9BQU8sR0FBUCxJQUFjLFFBQWpCLEVBQTJCO0FBQzFCLFFBQUksVUFBVSxLQUFLLFFBQUwsQ0FBYyxHQUFkLENBQWtCO0FBQy9CLFNBQUksR0FEMkI7QUFFL0IsaUJBRitCO0FBRy9CLGVBQVUsS0FBSyxHQUFMO0FBSHFCLEtBQWxCLENBQWQ7O0FBTUE7QUFDQSxTQUFLLElBQUwsQ0FBVSxHQUFWLEVBQWUsS0FBZjs7QUFFQSxXQUFPLE9BQVA7QUFDQTtBQUNEO0FBWkEsUUFhSztBQUNKO0FBQ0EsU0FBSSxXQUFXLEVBQWY7O0FBRkk7QUFBQTtBQUFBOztBQUFBO0FBSUosMkJBQWdCLE9BQU8sbUJBQVAsQ0FBMkIsR0FBM0IsQ0FBaEIsOEhBQWlEO0FBQUEsV0FBekMsSUFBeUM7O0FBQ2hELGdCQUFTLElBQVQsQ0FDQyxLQUFLLFFBQUwsQ0FBYyxHQUFkLENBQWtCO0FBQ2pCLFlBQUksSUFEYTtBQUVqQixlQUFPLElBQUksSUFBSixDQUZVO0FBR2pCLGtCQUFVLEtBQUssR0FBTDtBQUhPLFFBQWxCLENBREQ7O0FBUUE7QUFDQSxZQUFLLElBQUwsQ0FBVSxJQUFWLEVBQWdCLElBQUksSUFBSixDQUFoQjtBQUNBO0FBZkc7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTs7QUFpQkosWUFBTyxRQUFRLEdBQVIsQ0FBWSxRQUFaLENBQVA7QUFDQTtBQUNEOztBQUVBOzs7Ozs7Ozs7d0JBTU0sRyxFQUFLLEksRUFBTSxFLEVBQUk7QUFBQTs7QUFDcEI7QUFDQSxPQUFHLE9BQU8sSUFBUCxJQUFlLFVBQWxCLEVBQThCO0FBQzdCLFNBQUssSUFBTDtBQUNBLFdBQU8sRUFBUDtBQUNBOztBQUVEO0FBQ0EsT0FBSSxpQkFBaUIsS0FBckI7O0FBRUE7QUFDQSxPQUFHLEtBQUssT0FBUixFQUFpQjtBQUNoQixTQUFLLEdBQUwsQ0FBUyxHQUFULEVBQWMsS0FBSyxPQUFuQixFQUVDLElBRkQsQ0FFTSxpQkFBUztBQUNmLFNBQUcsQ0FBQyxjQUFKLEVBQW9CO0FBQ25CLFNBQUcsS0FBSDtBQUNBO0FBQ0QsS0FOQTtBQU9BOztBQUVEO0FBQ0EsVUFBTyxLQUFLLEVBQUwsQ0FBUSxHQUFSLEVBQWEsaUJBQVM7QUFDNUI7QUFDQSxRQUFHLENBQUMsT0FBSyxVQUFOLElBQW9CLENBQUMsT0FBSyxVQUFMLENBQWdCLGNBQWhCLENBQStCLEdBQS9CLENBQXhCLEVBQTZEO0FBQzVELFFBQUcsS0FBSDtBQUNBOztBQUVELHFCQUFpQixJQUFqQjtBQUNBLElBUE0sQ0FBUDtBQVFBOztBQUVEOzs7Ozs7OzsrQkFLYSxTLEVBQVc7QUFBQTs7QUFDdkI7QUFDQSxVQUFPLG1CQUFQLENBQTJCLFNBQTNCLEVBRUMsT0FGRCxDQUVTO0FBQUEsV0FBTyxPQUFLLElBQUwsQ0FBVSxHQUFWLEVBQWUsVUFBVSxHQUFWLENBQWYsQ0FBUDtBQUFBLElBRlQ7O0FBSUE7QUFDQSxRQUFLLFVBQUwsR0FBa0IsU0FBbEI7QUFDQTs7OztFQTlIeUIsWTs7QUFpSTVCLE9BQU8sT0FBUCxHQUFpQixhQUFqQjs7Ozs7QUN2SUE7Ozs7QUFJQSxJQUFJLGVBQWUsUUFBUSxzQkFBUixDQUFuQjs7QUFFQSxJQUFJLFdBQVcsSUFBSSxZQUFKLEVBQWY7O0FBRUE7QUFDQSxTQUFTLFVBQVQsR0FBc0IsUUFBUSxtQkFBUixDQUF0QjtBQUNBLFNBQVMsWUFBVCxHQUF3QixZQUF4Qjs7QUFFQTtBQUNBLENBQUMsT0FBTyxNQUFQLElBQWlCLFFBQWpCLEdBQTRCLE1BQTVCLEdBQXFDLElBQXRDLEVBQTRDLFFBQTVDLEdBQXVELFFBQXZEOzs7Ozs7Ozs7QUNiQTs7OztJQUlNLFU7QUFDTCx1QkFBYztBQUFBOztBQUNiLE9BQUssY0FBTCxHQUFzQixFQUF0QjtBQUNBOztBQUVEOzs7Ozs0QkFDVTtBQUNUO0FBQ0EsVUFBTSxLQUFLLGNBQUwsQ0FBb0IsTUFBcEIsR0FBNkIsQ0FBbkMsRUFBc0M7QUFDckMsU0FBSyxjQUFMLENBQW9CLEtBQXBCLEdBQTRCLFdBQTVCO0FBQ0E7QUFDRDs7QUFFRDs7OztzQkFDSSxZLEVBQWM7QUFDakIsUUFBSyxjQUFMLENBQW9CLElBQXBCLENBQXlCLFlBQXpCO0FBQ0E7O0FBRUQ7Ozs7NEJBQ1UsTyxFQUFTLEssRUFBTztBQUFBOztBQUN6QixRQUFLLEdBQUwsQ0FBUyxRQUFRLEVBQVIsQ0FBVyxLQUFYLEVBQWtCO0FBQUEsV0FBTSxNQUFLLE9BQUwsRUFBTjtBQUFBLElBQWxCLENBQVQ7QUFDQTs7Ozs7O0FBQ0Q7O0FBRUQsT0FBTyxPQUFQLEdBQWlCLFVBQWpCOzs7Ozs7Ozs7QUM1QkE7Ozs7SUFJTSxZO0FBQ0wseUJBQWM7QUFBQTs7QUFDYixPQUFLLFVBQUwsR0FBa0IsRUFBbEI7QUFDQTs7QUFFRDs7Ozs7OztxQkFHRyxJLEVBQU0sUSxFQUFVO0FBQUE7O0FBQ2xCO0FBQ0EsT0FBRyxDQUFDLEtBQUssVUFBTCxDQUFnQixJQUFoQixDQUFKLEVBQTJCO0FBQzFCLFNBQUssVUFBTCxDQUFnQixJQUFoQixJQUF3QixFQUF4QjtBQUNBOztBQUVEO0FBQ0EsUUFBSyxVQUFMLENBQWdCLElBQWhCLEVBQXNCLElBQXRCLENBQTJCLFFBQTNCOztBQUVBO0FBQ0EsVUFBTztBQUNOLGVBQVcsUUFETDs7QUFHTixpQkFBYSxZQUFNO0FBQ2xCO0FBQ0EsU0FBSSxRQUFRLE1BQUssVUFBTCxDQUFnQixJQUFoQixFQUFzQixPQUF0QixDQUE4QixRQUE5QixDQUFaOztBQUVBLFNBQUcsVUFBVSxDQUFDLENBQWQsRUFBaUI7QUFDaEIsWUFBSyxVQUFMLENBQWdCLElBQWhCLEVBQXNCLE1BQXRCLENBQTZCLEtBQTdCLEVBQW9DLENBQXBDO0FBQ0E7QUFDRDtBQVZLLElBQVA7QUFZQTs7QUFFRDs7Ozs7O3VCQUdLLEksRUFBZTtBQUNuQjtBQUNBLE9BQUcsS0FBSyxVQUFMLENBQWdCLElBQWhCLENBQUgsRUFBMEI7QUFBQSxzQ0FGYixJQUVhO0FBRmIsU0FFYTtBQUFBOztBQUFBO0FBQUE7QUFBQTs7QUFBQTtBQUN6QiwwQkFBb0IsS0FBSyxVQUFMLENBQWdCLElBQWhCLENBQXBCLDhIQUEyQztBQUFBLFVBQW5DLFFBQW1DOztBQUMxQztBQUNBLGdDQUFZLElBQVo7QUFDQTtBQUp3QjtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBS3pCO0FBQ0Q7O0FBRUQ7Ozs7Ozs4QkFHWSxJLEVBQTJCO0FBQUEsT0FBckIsS0FBcUIsdUVBQWIsRUFBYTs7QUFDdEM7QUFDQSxPQUFHLENBQUMsTUFBTSxPQUFOLENBQWMsS0FBZCxDQUFKLEVBQTBCO0FBQ3pCLFlBQVEsQ0FBQyxLQUFELENBQVI7QUFDQTs7QUFFRDtBQUNBLE9BQUcsS0FBSyxVQUFMLENBQWdCLElBQWhCLENBQUgsRUFBMEI7QUFBQSx1Q0FQTSxJQU9OO0FBUE0sU0FPTjtBQUFBOztBQUFBLDBCQUNqQixRQURpQjtBQUV4QjtBQUNBLFNBQUcsTUFBTSxJQUFOLENBQVc7QUFBQSxhQUFRLEtBQUssU0FBTCxJQUFrQixRQUExQjtBQUFBLE1BQVgsQ0FBSCxFQUFtRDtBQUNsRDtBQUNBOztBQUVEO0FBQ0EsK0JBQVksSUFBWjtBQVJ3Qjs7QUFBQTtBQUFBO0FBQUE7O0FBQUE7QUFDekIsMkJBQW9CLEtBQUssVUFBTCxDQUFnQixJQUFoQixDQUFwQixtSUFBMkM7QUFBQSxVQUFuQyxRQUFtQzs7QUFBQSx1QkFBbkMsUUFBbUM7O0FBQUEsK0JBR3pDO0FBS0Q7QUFUd0I7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQVV6QjtBQUNEOzs7Ozs7QUFHRixPQUFPLE9BQVAsR0FBaUIsWUFBakIiLCJmaWxlIjoiZ2VuZXJhdGVkLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXNDb250ZW50IjpbIihmdW5jdGlvbiBlKHQsbixyKXtmdW5jdGlvbiBzKG8sdSl7aWYoIW5bb10pe2lmKCF0W29dKXt2YXIgYT10eXBlb2YgcmVxdWlyZT09XCJmdW5jdGlvblwiJiZyZXF1aXJlO2lmKCF1JiZhKXJldHVybiBhKG8sITApO2lmKGkpcmV0dXJuIGkobywhMCk7dmFyIGY9bmV3IEVycm9yKFwiQ2Fubm90IGZpbmQgbW9kdWxlICdcIitvK1wiJ1wiKTt0aHJvdyBmLmNvZGU9XCJNT0RVTEVfTk9UX0ZPVU5EXCIsZn12YXIgbD1uW29dPXtleHBvcnRzOnt9fTt0W29dWzBdLmNhbGwobC5leHBvcnRzLGZ1bmN0aW9uKGUpe3ZhciBuPXRbb11bMV1bZV07cmV0dXJuIHMobj9uOmUpfSxsLGwuZXhwb3J0cyxlLHQsbixyKX1yZXR1cm4gbltvXS5leHBvcnRzfXZhciBpPXR5cGVvZiByZXF1aXJlPT1cImZ1bmN0aW9uXCImJnJlcXVpcmU7Zm9yKHZhciBvPTA7bzxyLmxlbmd0aDtvKyspcyhyW29dKTtyZXR1cm4gc30pIiwiJ3VzZSBzdHJpY3QnO1xuXG4oZnVuY3Rpb24oKSB7XG4gIGZ1bmN0aW9uIHRvQXJyYXkoYXJyKSB7XG4gICAgcmV0dXJuIEFycmF5LnByb3RvdHlwZS5zbGljZS5jYWxsKGFycik7XG4gIH1cblxuICBmdW5jdGlvbiBwcm9taXNpZnlSZXF1ZXN0KHJlcXVlc3QpIHtcbiAgICByZXR1cm4gbmV3IFByb21pc2UoZnVuY3Rpb24ocmVzb2x2ZSwgcmVqZWN0KSB7XG4gICAgICByZXF1ZXN0Lm9uc3VjY2VzcyA9IGZ1bmN0aW9uKCkge1xuICAgICAgICByZXNvbHZlKHJlcXVlc3QucmVzdWx0KTtcbiAgICAgIH07XG5cbiAgICAgIHJlcXVlc3Qub25lcnJvciA9IGZ1bmN0aW9uKCkge1xuICAgICAgICByZWplY3QocmVxdWVzdC5lcnJvcik7XG4gICAgICB9O1xuICAgIH0pO1xuICB9XG5cbiAgZnVuY3Rpb24gcHJvbWlzaWZ5UmVxdWVzdENhbGwob2JqLCBtZXRob2QsIGFyZ3MpIHtcbiAgICB2YXIgcmVxdWVzdDtcbiAgICB2YXIgcCA9IG5ldyBQcm9taXNlKGZ1bmN0aW9uKHJlc29sdmUsIHJlamVjdCkge1xuICAgICAgcmVxdWVzdCA9IG9ialttZXRob2RdLmFwcGx5KG9iaiwgYXJncyk7XG4gICAgICBwcm9taXNpZnlSZXF1ZXN0KHJlcXVlc3QpLnRoZW4ocmVzb2x2ZSwgcmVqZWN0KTtcbiAgICB9KTtcblxuICAgIHAucmVxdWVzdCA9IHJlcXVlc3Q7XG4gICAgcmV0dXJuIHA7XG4gIH1cblxuICBmdW5jdGlvbiBwcm9taXNpZnlDdXJzb3JSZXF1ZXN0Q2FsbChvYmosIG1ldGhvZCwgYXJncykge1xuICAgIHZhciBwID0gcHJvbWlzaWZ5UmVxdWVzdENhbGwob2JqLCBtZXRob2QsIGFyZ3MpO1xuICAgIHJldHVybiBwLnRoZW4oZnVuY3Rpb24odmFsdWUpIHtcbiAgICAgIGlmICghdmFsdWUpIHJldHVybjtcbiAgICAgIHJldHVybiBuZXcgQ3Vyc29yKHZhbHVlLCBwLnJlcXVlc3QpO1xuICAgIH0pO1xuICB9XG5cbiAgZnVuY3Rpb24gcHJveHlQcm9wZXJ0aWVzKFByb3h5Q2xhc3MsIHRhcmdldFByb3AsIHByb3BlcnRpZXMpIHtcbiAgICBwcm9wZXJ0aWVzLmZvckVhY2goZnVuY3Rpb24ocHJvcCkge1xuICAgICAgT2JqZWN0LmRlZmluZVByb3BlcnR5KFByb3h5Q2xhc3MucHJvdG90eXBlLCBwcm9wLCB7XG4gICAgICAgIGdldDogZnVuY3Rpb24oKSB7XG4gICAgICAgICAgcmV0dXJuIHRoaXNbdGFyZ2V0UHJvcF1bcHJvcF07XG4gICAgICAgIH0sXG4gICAgICAgIHNldDogZnVuY3Rpb24odmFsKSB7XG4gICAgICAgICAgdGhpc1t0YXJnZXRQcm9wXVtwcm9wXSA9IHZhbDtcbiAgICAgICAgfVxuICAgICAgfSk7XG4gICAgfSk7XG4gIH1cblxuICBmdW5jdGlvbiBwcm94eVJlcXVlc3RNZXRob2RzKFByb3h5Q2xhc3MsIHRhcmdldFByb3AsIENvbnN0cnVjdG9yLCBwcm9wZXJ0aWVzKSB7XG4gICAgcHJvcGVydGllcy5mb3JFYWNoKGZ1bmN0aW9uKHByb3ApIHtcbiAgICAgIGlmICghKHByb3AgaW4gQ29uc3RydWN0b3IucHJvdG90eXBlKSkgcmV0dXJuO1xuICAgICAgUHJveHlDbGFzcy5wcm90b3R5cGVbcHJvcF0gPSBmdW5jdGlvbigpIHtcbiAgICAgICAgcmV0dXJuIHByb21pc2lmeVJlcXVlc3RDYWxsKHRoaXNbdGFyZ2V0UHJvcF0sIHByb3AsIGFyZ3VtZW50cyk7XG4gICAgICB9O1xuICAgIH0pO1xuICB9XG5cbiAgZnVuY3Rpb24gcHJveHlNZXRob2RzKFByb3h5Q2xhc3MsIHRhcmdldFByb3AsIENvbnN0cnVjdG9yLCBwcm9wZXJ0aWVzKSB7XG4gICAgcHJvcGVydGllcy5mb3JFYWNoKGZ1bmN0aW9uKHByb3ApIHtcbiAgICAgIGlmICghKHByb3AgaW4gQ29uc3RydWN0b3IucHJvdG90eXBlKSkgcmV0dXJuO1xuICAgICAgUHJveHlDbGFzcy5wcm90b3R5cGVbcHJvcF0gPSBmdW5jdGlvbigpIHtcbiAgICAgICAgcmV0dXJuIHRoaXNbdGFyZ2V0UHJvcF1bcHJvcF0uYXBwbHkodGhpc1t0YXJnZXRQcm9wXSwgYXJndW1lbnRzKTtcbiAgICAgIH07XG4gICAgfSk7XG4gIH1cblxuICBmdW5jdGlvbiBwcm94eUN1cnNvclJlcXVlc3RNZXRob2RzKFByb3h5Q2xhc3MsIHRhcmdldFByb3AsIENvbnN0cnVjdG9yLCBwcm9wZXJ0aWVzKSB7XG4gICAgcHJvcGVydGllcy5mb3JFYWNoKGZ1bmN0aW9uKHByb3ApIHtcbiAgICAgIGlmICghKHByb3AgaW4gQ29uc3RydWN0b3IucHJvdG90eXBlKSkgcmV0dXJuO1xuICAgICAgUHJveHlDbGFzcy5wcm90b3R5cGVbcHJvcF0gPSBmdW5jdGlvbigpIHtcbiAgICAgICAgcmV0dXJuIHByb21pc2lmeUN1cnNvclJlcXVlc3RDYWxsKHRoaXNbdGFyZ2V0UHJvcF0sIHByb3AsIGFyZ3VtZW50cyk7XG4gICAgICB9O1xuICAgIH0pO1xuICB9XG5cbiAgZnVuY3Rpb24gSW5kZXgoaW5kZXgpIHtcbiAgICB0aGlzLl9pbmRleCA9IGluZGV4O1xuICB9XG5cbiAgcHJveHlQcm9wZXJ0aWVzKEluZGV4LCAnX2luZGV4JywgW1xuICAgICduYW1lJyxcbiAgICAna2V5UGF0aCcsXG4gICAgJ211bHRpRW50cnknLFxuICAgICd1bmlxdWUnXG4gIF0pO1xuXG4gIHByb3h5UmVxdWVzdE1ldGhvZHMoSW5kZXgsICdfaW5kZXgnLCBJREJJbmRleCwgW1xuICAgICdnZXQnLFxuICAgICdnZXRLZXknLFxuICAgICdnZXRBbGwnLFxuICAgICdnZXRBbGxLZXlzJyxcbiAgICAnY291bnQnXG4gIF0pO1xuXG4gIHByb3h5Q3Vyc29yUmVxdWVzdE1ldGhvZHMoSW5kZXgsICdfaW5kZXgnLCBJREJJbmRleCwgW1xuICAgICdvcGVuQ3Vyc29yJyxcbiAgICAnb3BlbktleUN1cnNvcidcbiAgXSk7XG5cbiAgZnVuY3Rpb24gQ3Vyc29yKGN1cnNvciwgcmVxdWVzdCkge1xuICAgIHRoaXMuX2N1cnNvciA9IGN1cnNvcjtcbiAgICB0aGlzLl9yZXF1ZXN0ID0gcmVxdWVzdDtcbiAgfVxuXG4gIHByb3h5UHJvcGVydGllcyhDdXJzb3IsICdfY3Vyc29yJywgW1xuICAgICdkaXJlY3Rpb24nLFxuICAgICdrZXknLFxuICAgICdwcmltYXJ5S2V5JyxcbiAgICAndmFsdWUnXG4gIF0pO1xuXG4gIHByb3h5UmVxdWVzdE1ldGhvZHMoQ3Vyc29yLCAnX2N1cnNvcicsIElEQkN1cnNvciwgW1xuICAgICd1cGRhdGUnLFxuICAgICdkZWxldGUnXG4gIF0pO1xuXG4gIC8vIHByb3h5ICduZXh0JyBtZXRob2RzXG4gIFsnYWR2YW5jZScsICdjb250aW51ZScsICdjb250aW51ZVByaW1hcnlLZXknXS5mb3JFYWNoKGZ1bmN0aW9uKG1ldGhvZE5hbWUpIHtcbiAgICBpZiAoIShtZXRob2ROYW1lIGluIElEQkN1cnNvci5wcm90b3R5cGUpKSByZXR1cm47XG4gICAgQ3Vyc29yLnByb3RvdHlwZVttZXRob2ROYW1lXSA9IGZ1bmN0aW9uKCkge1xuICAgICAgdmFyIGN1cnNvciA9IHRoaXM7XG4gICAgICB2YXIgYXJncyA9IGFyZ3VtZW50cztcbiAgICAgIHJldHVybiBQcm9taXNlLnJlc29sdmUoKS50aGVuKGZ1bmN0aW9uKCkge1xuICAgICAgICBjdXJzb3IuX2N1cnNvclttZXRob2ROYW1lXS5hcHBseShjdXJzb3IuX2N1cnNvciwgYXJncyk7XG4gICAgICAgIHJldHVybiBwcm9taXNpZnlSZXF1ZXN0KGN1cnNvci5fcmVxdWVzdCkudGhlbihmdW5jdGlvbih2YWx1ZSkge1xuICAgICAgICAgIGlmICghdmFsdWUpIHJldHVybjtcbiAgICAgICAgICByZXR1cm4gbmV3IEN1cnNvcih2YWx1ZSwgY3Vyc29yLl9yZXF1ZXN0KTtcbiAgICAgICAgfSk7XG4gICAgICB9KTtcbiAgICB9O1xuICB9KTtcblxuICBmdW5jdGlvbiBPYmplY3RTdG9yZShzdG9yZSkge1xuICAgIHRoaXMuX3N0b3JlID0gc3RvcmU7XG4gIH1cblxuICBPYmplY3RTdG9yZS5wcm90b3R5cGUuY3JlYXRlSW5kZXggPSBmdW5jdGlvbigpIHtcbiAgICByZXR1cm4gbmV3IEluZGV4KHRoaXMuX3N0b3JlLmNyZWF0ZUluZGV4LmFwcGx5KHRoaXMuX3N0b3JlLCBhcmd1bWVudHMpKTtcbiAgfTtcblxuICBPYmplY3RTdG9yZS5wcm90b3R5cGUuaW5kZXggPSBmdW5jdGlvbigpIHtcbiAgICByZXR1cm4gbmV3IEluZGV4KHRoaXMuX3N0b3JlLmluZGV4LmFwcGx5KHRoaXMuX3N0b3JlLCBhcmd1bWVudHMpKTtcbiAgfTtcblxuICBwcm94eVByb3BlcnRpZXMoT2JqZWN0U3RvcmUsICdfc3RvcmUnLCBbXG4gICAgJ25hbWUnLFxuICAgICdrZXlQYXRoJyxcbiAgICAnaW5kZXhOYW1lcycsXG4gICAgJ2F1dG9JbmNyZW1lbnQnXG4gIF0pO1xuXG4gIHByb3h5UmVxdWVzdE1ldGhvZHMoT2JqZWN0U3RvcmUsICdfc3RvcmUnLCBJREJPYmplY3RTdG9yZSwgW1xuICAgICdwdXQnLFxuICAgICdhZGQnLFxuICAgICdkZWxldGUnLFxuICAgICdjbGVhcicsXG4gICAgJ2dldCcsXG4gICAgJ2dldEFsbCcsXG4gICAgJ2dldEtleScsXG4gICAgJ2dldEFsbEtleXMnLFxuICAgICdjb3VudCdcbiAgXSk7XG5cbiAgcHJveHlDdXJzb3JSZXF1ZXN0TWV0aG9kcyhPYmplY3RTdG9yZSwgJ19zdG9yZScsIElEQk9iamVjdFN0b3JlLCBbXG4gICAgJ29wZW5DdXJzb3InLFxuICAgICdvcGVuS2V5Q3Vyc29yJ1xuICBdKTtcblxuICBwcm94eU1ldGhvZHMoT2JqZWN0U3RvcmUsICdfc3RvcmUnLCBJREJPYmplY3RTdG9yZSwgW1xuICAgICdkZWxldGVJbmRleCdcbiAgXSk7XG5cbiAgZnVuY3Rpb24gVHJhbnNhY3Rpb24oaWRiVHJhbnNhY3Rpb24pIHtcbiAgICB0aGlzLl90eCA9IGlkYlRyYW5zYWN0aW9uO1xuICAgIHRoaXMuY29tcGxldGUgPSBuZXcgUHJvbWlzZShmdW5jdGlvbihyZXNvbHZlLCByZWplY3QpIHtcbiAgICAgIGlkYlRyYW5zYWN0aW9uLm9uY29tcGxldGUgPSBmdW5jdGlvbigpIHtcbiAgICAgICAgcmVzb2x2ZSgpO1xuICAgICAgfTtcbiAgICAgIGlkYlRyYW5zYWN0aW9uLm9uZXJyb3IgPSBmdW5jdGlvbigpIHtcbiAgICAgICAgcmVqZWN0KGlkYlRyYW5zYWN0aW9uLmVycm9yKTtcbiAgICAgIH07XG4gICAgICBpZGJUcmFuc2FjdGlvbi5vbmFib3J0ID0gZnVuY3Rpb24oKSB7XG4gICAgICAgIHJlamVjdChpZGJUcmFuc2FjdGlvbi5lcnJvcik7XG4gICAgICB9O1xuICAgIH0pO1xuICB9XG5cbiAgVHJhbnNhY3Rpb24ucHJvdG90eXBlLm9iamVjdFN0b3JlID0gZnVuY3Rpb24oKSB7XG4gICAgcmV0dXJuIG5ldyBPYmplY3RTdG9yZSh0aGlzLl90eC5vYmplY3RTdG9yZS5hcHBseSh0aGlzLl90eCwgYXJndW1lbnRzKSk7XG4gIH07XG5cbiAgcHJveHlQcm9wZXJ0aWVzKFRyYW5zYWN0aW9uLCAnX3R4JywgW1xuICAgICdvYmplY3RTdG9yZU5hbWVzJyxcbiAgICAnbW9kZSdcbiAgXSk7XG5cbiAgcHJveHlNZXRob2RzKFRyYW5zYWN0aW9uLCAnX3R4JywgSURCVHJhbnNhY3Rpb24sIFtcbiAgICAnYWJvcnQnXG4gIF0pO1xuXG4gIGZ1bmN0aW9uIFVwZ3JhZGVEQihkYiwgb2xkVmVyc2lvbiwgdHJhbnNhY3Rpb24pIHtcbiAgICB0aGlzLl9kYiA9IGRiO1xuICAgIHRoaXMub2xkVmVyc2lvbiA9IG9sZFZlcnNpb247XG4gICAgdGhpcy50cmFuc2FjdGlvbiA9IG5ldyBUcmFuc2FjdGlvbih0cmFuc2FjdGlvbik7XG4gIH1cblxuICBVcGdyYWRlREIucHJvdG90eXBlLmNyZWF0ZU9iamVjdFN0b3JlID0gZnVuY3Rpb24oKSB7XG4gICAgcmV0dXJuIG5ldyBPYmplY3RTdG9yZSh0aGlzLl9kYi5jcmVhdGVPYmplY3RTdG9yZS5hcHBseSh0aGlzLl9kYiwgYXJndW1lbnRzKSk7XG4gIH07XG5cbiAgcHJveHlQcm9wZXJ0aWVzKFVwZ3JhZGVEQiwgJ19kYicsIFtcbiAgICAnbmFtZScsXG4gICAgJ3ZlcnNpb24nLFxuICAgICdvYmplY3RTdG9yZU5hbWVzJ1xuICBdKTtcblxuICBwcm94eU1ldGhvZHMoVXBncmFkZURCLCAnX2RiJywgSURCRGF0YWJhc2UsIFtcbiAgICAnZGVsZXRlT2JqZWN0U3RvcmUnLFxuICAgICdjbG9zZSdcbiAgXSk7XG5cbiAgZnVuY3Rpb24gREIoZGIpIHtcbiAgICB0aGlzLl9kYiA9IGRiO1xuICB9XG5cbiAgREIucHJvdG90eXBlLnRyYW5zYWN0aW9uID0gZnVuY3Rpb24oKSB7XG4gICAgcmV0dXJuIG5ldyBUcmFuc2FjdGlvbih0aGlzLl9kYi50cmFuc2FjdGlvbi5hcHBseSh0aGlzLl9kYiwgYXJndW1lbnRzKSk7XG4gIH07XG5cbiAgcHJveHlQcm9wZXJ0aWVzKERCLCAnX2RiJywgW1xuICAgICduYW1lJyxcbiAgICAndmVyc2lvbicsXG4gICAgJ29iamVjdFN0b3JlTmFtZXMnXG4gIF0pO1xuXG4gIHByb3h5TWV0aG9kcyhEQiwgJ19kYicsIElEQkRhdGFiYXNlLCBbXG4gICAgJ2Nsb3NlJ1xuICBdKTtcblxuICAvLyBBZGQgY3Vyc29yIGl0ZXJhdG9yc1xuICAvLyBUT0RPOiByZW1vdmUgdGhpcyBvbmNlIGJyb3dzZXJzIGRvIHRoZSByaWdodCB0aGluZyB3aXRoIHByb21pc2VzXG4gIFsnb3BlbkN1cnNvcicsICdvcGVuS2V5Q3Vyc29yJ10uZm9yRWFjaChmdW5jdGlvbihmdW5jTmFtZSkge1xuICAgIFtPYmplY3RTdG9yZSwgSW5kZXhdLmZvckVhY2goZnVuY3Rpb24oQ29uc3RydWN0b3IpIHtcbiAgICAgIENvbnN0cnVjdG9yLnByb3RvdHlwZVtmdW5jTmFtZS5yZXBsYWNlKCdvcGVuJywgJ2l0ZXJhdGUnKV0gPSBmdW5jdGlvbigpIHtcbiAgICAgICAgdmFyIGFyZ3MgPSB0b0FycmF5KGFyZ3VtZW50cyk7XG4gICAgICAgIHZhciBjYWxsYmFjayA9IGFyZ3NbYXJncy5sZW5ndGggLSAxXTtcbiAgICAgICAgdmFyIG5hdGl2ZU9iamVjdCA9IHRoaXMuX3N0b3JlIHx8IHRoaXMuX2luZGV4O1xuICAgICAgICB2YXIgcmVxdWVzdCA9IG5hdGl2ZU9iamVjdFtmdW5jTmFtZV0uYXBwbHkobmF0aXZlT2JqZWN0LCBhcmdzLnNsaWNlKDAsIC0xKSk7XG4gICAgICAgIHJlcXVlc3Qub25zdWNjZXNzID0gZnVuY3Rpb24oKSB7XG4gICAgICAgICAgY2FsbGJhY2socmVxdWVzdC5yZXN1bHQpO1xuICAgICAgICB9O1xuICAgICAgfTtcbiAgICB9KTtcbiAgfSk7XG5cbiAgLy8gcG9seWZpbGwgZ2V0QWxsXG4gIFtJbmRleCwgT2JqZWN0U3RvcmVdLmZvckVhY2goZnVuY3Rpb24oQ29uc3RydWN0b3IpIHtcbiAgICBpZiAoQ29uc3RydWN0b3IucHJvdG90eXBlLmdldEFsbCkgcmV0dXJuO1xuICAgIENvbnN0cnVjdG9yLnByb3RvdHlwZS5nZXRBbGwgPSBmdW5jdGlvbihxdWVyeSwgY291bnQpIHtcbiAgICAgIHZhciBpbnN0YW5jZSA9IHRoaXM7XG4gICAgICB2YXIgaXRlbXMgPSBbXTtcblxuICAgICAgcmV0dXJuIG5ldyBQcm9taXNlKGZ1bmN0aW9uKHJlc29sdmUpIHtcbiAgICAgICAgaW5zdGFuY2UuaXRlcmF0ZUN1cnNvcihxdWVyeSwgZnVuY3Rpb24oY3Vyc29yKSB7XG4gICAgICAgICAgaWYgKCFjdXJzb3IpIHtcbiAgICAgICAgICAgIHJlc29sdmUoaXRlbXMpO1xuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICAgIH1cbiAgICAgICAgICBpdGVtcy5wdXNoKGN1cnNvci52YWx1ZSk7XG5cbiAgICAgICAgICBpZiAoY291bnQgIT09IHVuZGVmaW5lZCAmJiBpdGVtcy5sZW5ndGggPT0gY291bnQpIHtcbiAgICAgICAgICAgIHJlc29sdmUoaXRlbXMpO1xuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICAgIH1cbiAgICAgICAgICBjdXJzb3IuY29udGludWUoKTtcbiAgICAgICAgfSk7XG4gICAgICB9KTtcbiAgICB9O1xuICB9KTtcblxuICB2YXIgZXhwID0ge1xuICAgIG9wZW46IGZ1bmN0aW9uKG5hbWUsIHZlcnNpb24sIHVwZ3JhZGVDYWxsYmFjaykge1xuICAgICAgdmFyIHAgPSBwcm9taXNpZnlSZXF1ZXN0Q2FsbChpbmRleGVkREIsICdvcGVuJywgW25hbWUsIHZlcnNpb25dKTtcbiAgICAgIHZhciByZXF1ZXN0ID0gcC5yZXF1ZXN0O1xuXG4gICAgICByZXF1ZXN0Lm9udXBncmFkZW5lZWRlZCA9IGZ1bmN0aW9uKGV2ZW50KSB7XG4gICAgICAgIGlmICh1cGdyYWRlQ2FsbGJhY2spIHtcbiAgICAgICAgICB1cGdyYWRlQ2FsbGJhY2sobmV3IFVwZ3JhZGVEQihyZXF1ZXN0LnJlc3VsdCwgZXZlbnQub2xkVmVyc2lvbiwgcmVxdWVzdC50cmFuc2FjdGlvbikpO1xuICAgICAgICB9XG4gICAgICB9O1xuXG4gICAgICByZXR1cm4gcC50aGVuKGZ1bmN0aW9uKGRiKSB7XG4gICAgICAgIHJldHVybiBuZXcgREIoZGIpO1xuICAgICAgfSk7XG4gICAgfSxcbiAgICBkZWxldGU6IGZ1bmN0aW9uKG5hbWUpIHtcbiAgICAgIHJldHVybiBwcm9taXNpZnlSZXF1ZXN0Q2FsbChpbmRleGVkREIsICdkZWxldGVEYXRhYmFzZScsIFtuYW1lXSk7XG4gICAgfVxuICB9O1xuXG4gIGlmICh0eXBlb2YgbW9kdWxlICE9PSAndW5kZWZpbmVkJykge1xuICAgIG1vZHVsZS5leHBvcnRzID0gZXhwO1xuICB9XG4gIGVsc2Uge1xuICAgIHNlbGYuaWRiID0gZXhwO1xuICB9XG59KCkpO1xuIiwiLyoqXHJcbiAqIEFuIGluZGV4ZWQgZGIgYWRhcHRvclxyXG4gKi9cclxuXHJcbnZhciBpZGIgPSByZXF1aXJlKFwiaWRiXCIpO1xyXG5cclxuY29uc3QgVkFMSURfU1RPUkVTID0gW1wiYXNzaWdubWVudHNcIiwgXCJzeW5jLXN0b3JlXCJdO1xyXG5cclxuLy8gb3Blbi9zZXR1cCB0aGUgZGF0YWJhc2VcclxudmFyIGRiUHJvbWlzZSA9IGlkYi5vcGVuKFwiZGF0YS1zdG9yZXNcIiwgMywgZGIgPT4ge1xyXG5cdC8vIHVwZ3JhZGUgb3IgY3JlYXRlIHRoZSBkYlxyXG5cdGlmKGRiLm9sZFZlcnNpb24gPCAxKVxyXG5cdFx0ZGIuY3JlYXRlT2JqZWN0U3RvcmUoXCJhc3NpZ25tZW50c1wiLCB7IGtleVBhdGg6IFwiaWRcIiB9KTtcclxuXHRpZihkYi5vbGRWZXJzaW9uIDwgMilcclxuXHRcdGRiLmNyZWF0ZU9iamVjdFN0b3JlKFwic3luYy1zdG9yZVwiLCB7IGtleVBhdGg6IFwiaWRcIiB9KTtcclxuXHJcblx0Ly8gdGhlIHZlcnNpb24gMiBzeW5jLXN0b3JlIGhhZCBhIGRpZmZlcmVudCBzdHJ1Y3R1cmUgdGhhdCB0aGUgdmVyc2lvbiAzXHJcblx0aWYoZGIub2xkVmVyc2lvbiA9PSAyKSB7XHJcblx0XHRkYi5kZWxldGVPYmplY3RTdG9yZShcInN5bmMtc3RvcmVcIik7XHJcblx0XHRkYi5jcmVhdGVPYmplY3RTdG9yZShcInN5bmMtc3RvcmVcIiwgeyBrZXlQYXRoOiBcImlkXCIgfSk7XHJcblx0fVxyXG59KTtcclxuXHJcbmNsYXNzIElkYkFkYXB0b3Ige1xyXG5cdGNvbnN0cnVjdG9yKG5hbWUpIHtcclxuXHRcdHRoaXMubmFtZSA9IG5hbWU7XHJcblxyXG5cdFx0Ly8gY2hlY2sgdGhlIHN0b3JlIGlzIHZhbGlkXHJcblx0XHRpZihWQUxJRF9TVE9SRVMuaW5kZXhPZihuYW1lKSA9PT0gLTEpIHtcclxuXHRcdFx0dGhyb3cgbmV3IEVycm9yKGBUaGUgZGF0YSBzdG9yZSAke25hbWV9IGlzIG5vdCBpbiBpZGIgdXBkYXRlIHRoZSBkYmApO1xyXG5cdFx0fVxyXG5cdH1cclxuXHJcblx0Ly8gY3JlYXRlIGEgdHJhbnNhY3Rpb25cclxuXHRfdHJhbnNhY3Rpb24ocmVhZFdyaXRlKSB7XHJcblx0XHRyZXR1cm4gZGJQcm9taXNlLnRoZW4oZGIgPT4ge1xyXG5cdFx0XHRyZXR1cm4gZGJcclxuXHRcdFx0XHQudHJhbnNhY3Rpb24odGhpcy5uYW1lLCByZWFkV3JpdGUgJiYgXCJyZWFkd3JpdGVcIilcclxuXHRcdFx0XHQub2JqZWN0U3RvcmUodGhpcy5uYW1lKTtcclxuXHRcdH0pO1xyXG5cdH1cclxuXHJcblx0LyoqXHJcblx0ICogR2V0IGFsbCB0aGUgdmFsdWVzIGluIHRoZSBvYmplY3Qgc3RvcmVcclxuXHQgKi9cclxuXHRnZXRBbGwoKSB7XHJcblx0XHRyZXR1cm4gdGhpcy5fdHJhbnNhY3Rpb24oKVxyXG5cdFx0XHQudGhlbih0cmFucyA9PiB0cmFucy5nZXRBbGwoKSk7XHJcblx0fVxyXG5cclxuXHQvKipcclxuXHQgKiBHZXQgYSBzcGVjaWZpYyB2YWx1ZVxyXG5cdCAqL1xyXG5cdGdldChrZXkpIHtcclxuXHRcdHJldHVybiB0aGlzLl90cmFuc2FjdGlvbigpXHJcblx0XHRcdC50aGVuKHRyYW5zID0+IHRyYW5zLmdldChrZXkpKTtcclxuXHR9XHJcblxyXG5cdC8qKlxyXG5cdCAqIFN0b3JlIGEgdmFsdWUgaW4gaWRiXHJcblx0ICovXHJcblx0c2V0KHZhbHVlKSB7XHJcblx0XHRyZXR1cm4gdGhpcy5fdHJhbnNhY3Rpb24odHJ1ZSlcclxuXHRcdFx0LnRoZW4odHJhbnMgPT4gdHJhbnMucHV0KHZhbHVlKSk7XHJcblx0fVxyXG5cclxuXHQvKipcclxuXHQgKiBSZW1vdmUgYSB2YWx1ZSBmcm9tIGlkYlxyXG5cdCAqL1xyXG5cdHJlbW92ZShrZXkpIHtcclxuXHRcdHJldHVybiB0aGlzLl90cmFuc2FjdGlvbih0cnVlKVxyXG5cdFx0XHQudGhlbih0cmFucyA9PiB0cmFucy5kZWxldGUoa2V5KSk7XHJcblx0fVxyXG59XHJcblxyXG5tb2R1bGUuZXhwb3J0cyA9IElkYkFkYXB0b3I7XHJcbiIsIi8qKlxyXG4gKiBCcm93c2VyIHNwZWNpZmljIGdsb2JhbHNcclxuICovXHJcblxyXG5saWZlTGluZS5tYWtlRG9tID0gcmVxdWlyZShcIi4vdXRpbC9kb20tbWFrZXJcIik7XHJcblxyXG4vLyBhZGQgYSBmdW5jdGlvbiBmb3IgYWRkaW5nIGFjdGlvbnNcclxubGlmZUxpbmUuYWRkQWN0aW9uID0gZnVuY3Rpb24obmFtZSwgZm4pIHtcclxuXHQvLyBhdHRhY2ggdGhlIGNhbGxiYWNrXHJcblx0dmFyIGxpc3RlbmVyID0gbGlmZUxpbmUub24oXCJhY3Rpb24tZXhlYy1cIiArIG5hbWUsIGZuKTtcclxuXHJcblx0Ly8gaW5mb3JtIGFueSBhY3Rpb24gcHJvdmlkZXJzXHJcblx0bGlmZUxpbmUuZW1pdChcImFjdGlvbi1jcmVhdGVcIiwgbmFtZSk7XHJcblxyXG5cdC8vIGFsbCBhY3Rpb25zIHJlbW92ZWRcclxuXHR2YXIgcmVtb3ZlQWxsID0gbGlmZUxpbmUub24oXCJhY3Rpb24tcmVtb3ZlLWFsbFwiLCAoKSA9PiB7XHJcblx0XHQvLyByZW1vdmUgdGhlIGFjdGlvbiBsaXN0ZW5lclxyXG5cdFx0bGlzdGVuZXIudW5zdWJzY3JpYmUoKTtcclxuXHRcdHJlbW92ZUFsbC51bnN1YnNjcmliZSgpO1xyXG5cdH0pO1xyXG5cclxuXHRyZXR1cm4ge1xyXG5cdFx0dW5zdWJzY3JpYmUoKSB7XHJcblx0XHRcdC8vIHJlbW92ZSB0aGUgYWN0aW9uIGxpc3RlbmVyXHJcblx0XHRcdGxpc3RlbmVyLnVuc3Vic2NyaWJlKCk7XHJcblx0XHRcdHJlbW92ZUFsbC51bnN1YnNjcmliZSgpO1xyXG5cclxuXHRcdFx0Ly8gaW5mb3JtIGFueSBhY3Rpb24gcHJvdmlkZXJzXHJcblx0XHRcdGxpZmVMaW5lLmVtaXQoXCJhY3Rpb24tcmVtb3ZlXCIsIG5hbWUpO1xyXG5cdFx0fVxyXG5cdH07XHJcbn07XHJcbiIsIi8vIGNyZWF0ZSB0aGUgZ2xvYmFsIG9iamVjdFxyXG5yZXF1aXJlKFwiLi4vY29tbW9uL2dsb2JhbFwiKTtcclxucmVxdWlyZShcIi4vZ2xvYmFsXCIpO1xyXG5cclxudmFyIEtleVZhbHVlU3RvcmUgPSByZXF1aXJlKFwiLi4vY29tbW9uL2RhdGEtc3RvcmVzL2tleS12YWx1ZS1zdG9yZVwiKTtcclxudmFyIElkYkFkYXB0b3IgPSByZXF1aXJlKFwiLi9kYXRhLXN0b3Jlcy9pZGItYWRhcHRvclwiKTtcclxuXHJcbnZhciBzeW5jU3RvcmUgPSBuZXcgS2V5VmFsdWVTdG9yZShuZXcgSWRiQWRhcHRvcihcInN5bmMtc3RvcmVcIikpO1xyXG5cclxuLy8gYWxsIHRoZSBmaWxlcyB0byBjYWNoZVxyXG5jb25zdCBDQUNIRURfRklMRVMgPSBbXHJcblx0XCIvXCIsXHJcblx0XCIvc3RhdGljL2J1bmRsZS5qc1wiLFxyXG5cdFwiL3N0YXRpYy9zdHlsZS5jc3NcIixcclxuXHRcIi9zdGF0aWMvaWNvbi0xNDQucG5nXCIsXHJcblx0XCIvc3RhdGljL21hbmlmZXN0Lmpzb25cIlxyXG5dO1xyXG5cclxuY29uc3QgU1RBVElDX0NBQ0hFID0gXCJzdGF0aWNcIjtcclxuXHJcbi8vIGNhY2hlIHRoZSB2ZXJzaW9uIG9mIHRoZSBjbGllbnRcclxudmFyIGNsaWVudFZlcnNpb247XHJcbi8vIGRvbid0IHJ1biAyIGRvd25sb2FkcyBhdCB0aGUgc2FtZSB0aW1lXHJcbnZhciBkb3dubG9hZGluZztcclxuLy8gd2UgaW5zdGFsbGVkIGEgbmV3IHZlcnNpb24gaW4gdGhlIGluc3RhbGwgcGhhc2VcclxudmFyIG5ld1ZlcnNpb25JbnN0YWxsZWQ7XHJcblxyXG4vLyBkb3dubG9hZCBhIG5ldyB2ZXJzaW9uXHJcbnZhciBkb3dubG9hZCA9IGZ1bmN0aW9uKGluc3RhbGwpIHtcclxuXHQvLyBhbHJlYWR5IGRvd25sb2FkaW5nXHJcblx0aWYoZG93bmxvYWRpbmcpIHtcclxuXHRcdHJldHVybiBkb3dubG9hZGluZztcclxuXHR9XHJcblxyXG5cdC8vIHNhdmUgdGhlIG5ldyB2ZXJzaW9uXHJcblx0dmFyIHZlcnNpb247XHJcblxyXG5cdC8vIG9wZW4gdGhlIGNhY2hlXHJcblx0ZG93bmxvYWRpbmcgPSBjYWNoZXMub3BlbihTVEFUSUNfQ0FDSEUpXHJcblxyXG5cdC50aGVuKGNhY2hlID0+IHtcclxuXHRcdC8vIGRvd25sb2FkIGFsbCB0aGUgZmlsZXNcclxuXHRcdHJldHVybiBQcm9taXNlLmFsbChcclxuXHRcdFx0Q0FDSEVEX0ZJTEVTLm1hcCh1cmwgPT4ge1xyXG5cdFx0XHRcdC8vIGRvd25sb2FkIHRoZSBmaWxlXHJcblx0XHRcdFx0cmV0dXJuIGZldGNoKHVybClcclxuXHJcblx0XHRcdFx0LnRoZW4ocmVzID0+IHtcclxuXHRcdFx0XHRcdC8vIHNhdmUgdGhlIGZpbGVcclxuXHRcdFx0XHRcdHZhciBwcm9taXNlcyA9IFtcclxuXHRcdFx0XHRcdFx0Y2FjaGUucHV0KG5ldyBSZXF1ZXN0KHVybCksIHJlcylcclxuXHRcdFx0XHRcdF07XHJcblxyXG5cdFx0XHRcdFx0Ly8gc2F2ZSB0aGUgdmVyc2lvblxyXG5cdFx0XHRcdFx0aWYoIXZlcnNpb24pIHtcclxuXHRcdFx0XHRcdFx0dmVyc2lvbiA9IGNsaWVudFZlcnNpb24gPSByZXMuaGVhZGVycy5nZXQoXCJzZXJ2ZXJcIik7XHJcblxyXG5cdFx0XHRcdFx0XHRwcm9taXNlcy5wdXNoKHN5bmNTdG9yZS5zZXQoXCJ2ZXJzaW9uXCIsIHZlcnNpb24pKTtcclxuXHRcdFx0XHRcdH1cclxuXHJcblx0XHRcdFx0XHRyZXR1cm4gcHJvbWlzZXMubGVuZ3RoID09IDEgPyBwcm9taXNlc1swXSA6IFByb21pc2UuYWxsKHByb21pc2VzKTtcclxuXHRcdFx0XHR9KTtcclxuXHRcdFx0fSlcclxuXHRcdClcclxuXHJcblx0XHQvLyBub3RpZnkgdGhlIGNsaWVudChzKSBvZiB0aGUgdXBkYXRlXHJcblx0XHQudGhlbigoKSA9PiB7XHJcblx0XHRcdC8vIHdhaXQgZm9yIGFjdGl2YXRpb25cclxuXHRcdFx0aWYoaW5zdGFsbCkge1xyXG5cdFx0XHRcdG5ld1ZlcnNpb25JbnN0YWxsZWQgPSB2ZXJzaW9uO1xyXG5cdFx0XHR9XHJcblx0XHRcdC8vIHVwZGF0ZWQgb24gcmVsb2FkIHRlbGwgdGhlIGNsaWVudHNcclxuXHRcdFx0ZWxzZSB7XHJcblx0XHRcdFx0cmV0dXJuIG5vdGlmeUNsaWVudHModmVyc2lvbik7XHJcblx0XHRcdH1cclxuXHRcdH0pO1xyXG5cdH0pO1xyXG5cclxuXHRyZXR1cm4gZG93bmxvYWRpbmdcclxuXHJcblx0Ly8gcmVsZWFzZSB0aGUgbG9ja1xyXG5cdC50aGVuKCgpID0+IGRvd25sb2FkaW5nID0gdW5kZWZpbmVkKTtcclxufTtcclxuXHJcbi8vIG5vdGlmeSB0aGUgY2xpZW50KHMpIG9mIGFuIHVwZGF0ZVxyXG52YXIgbm90aWZ5Q2xpZW50cyA9IGZ1bmN0aW9uKHZlcnNpb24pIHtcclxuXHQvLyBnZXQgYWxsIHRoZSBjbGllbnRzXHJcblx0cmV0dXJuIGNsaWVudHMubWF0Y2hBbGwoe30pXHJcblxyXG5cdC50aGVuKGNsaWVudHMgPT4ge1xyXG5cdFx0Zm9yKGxldCBjbGllbnQgb2YgY2xpZW50cykge1xyXG5cdFx0XHQvLyBzZW5kIHRoZSB2ZXJzaW9uXHJcblx0XHRcdGNsaWVudC5wb3N0TWVzc2FnZSh7XHJcblx0XHRcdFx0dHlwZTogXCJ2ZXJzaW9uLWNoYW5nZVwiLFxyXG5cdFx0XHRcdHZlcnNpb25cclxuXHRcdFx0fSk7XHJcblx0XHR9XHJcblx0fSk7XHJcbn07XHJcblxyXG4vLyBjaGVjayBmb3IgdXBkYXRlc1xyXG52YXIgY2hlY2tGb3JVcGRhdGVzID0gZnVuY3Rpb24oe25ld1ZlcnNpb24sIGluc3RhbGx9ID0ge30pIHtcclxuXHQvLyBpZiB3ZSBoYXZlIGEgdmVyc2lvbiB1c2UgdGhhdFxyXG5cdGlmKG5ld1ZlcnNpb24pIHtcclxuXHRcdG5ld1ZlcnNpb24gPSBQcm9taXNlLnJlc29sdmUobmV3VmVyc2lvbik7XHJcblx0fVxyXG5cdC8vIGZldGNoIHRoZSB2ZXJzaW9uXHJcblx0ZWxzZSB7XHJcblx0XHRuZXdWZXJzaW9uID0gZmV0Y2goXCIvXCIpXHJcblxyXG5cdFx0LnRoZW4ocmVzID0+IHJlcy5oZWFkZXJzLmdldChcInNlcnZlclwiKSk7XHJcblx0fVxyXG5cclxuXHR2YXIgb2xkVmVyc2lvbjtcclxuXHJcblx0Ly8gYWxyZWFkeSBpbiBtZW1vcnlcclxuXHRpZihjbGllbnRWZXJzaW9uKSB7XHJcblx0XHRvbGRWZXJzaW9uID0gUHJvbWlzZS5yZXNvbHZlKGNsaWVudFZlcnNpb24pO1xyXG5cdH1cclxuXHRlbHNlIHtcclxuXHRcdG9sZFZlcnNpb24gPSBzeW5jU3RvcmUuZ2V0KFwidmVyc2lvblwiKTtcclxuXHR9XHJcblxyXG5cdHJldHVybiBQcm9taXNlLmFsbChbXHJcblx0XHRuZXdWZXJzaW9uLFxyXG5cdFx0b2xkVmVyc2lvblxyXG5cdF0pXHJcblxyXG5cdC50aGVuKChbbmV3VmVyc2lvbiwgb2xkVmVyc2lvbl0pID0+IHtcclxuXHRcdC8vIHNhbWUgdmVyc2lvbiBkbyBub3RoaW5nXHJcblx0XHRpZihuZXdWZXJzaW9uID09IG9sZFZlcnNpb24pIHtcclxuXHRcdFx0cmV0dXJuIHN5bmNTdG9yZS5zZXQoXCJ2ZXJzaW9uXCIsIG9sZFZlcnNpb24pO1xyXG5cdFx0fVxyXG5cclxuXHRcdC8vIGRvd25sb2FkIHRoZSBuZXcgdmVyc2lvblxyXG5cdFx0cmV0dXJuIGRvd25sb2FkKGluc3RhbGwpO1xyXG5cdH0pO1xyXG59O1xyXG5cclxuLy8gd2hlbiB3ZSBhcmUgaW5zdGFsbGVkIGNoZWNrIGZvciB1cGRhdGVzXHJcbnNlbGYuYWRkRXZlbnRMaXN0ZW5lcihcImluc3RhbGxcIiwgZSA9PiB7XHJcblx0ZS53YWl0VW50aWwoXHJcblx0XHRjaGVja0ZvclVwZGF0ZXMoeyBpbnN0YWxsOiB0cnVlIH0pXHJcblxyXG5cdFx0LnRoZW4oKCkgPT4gc2VsZi5za2lwV2FpdGluZygpKVxyXG5cdCk7XHJcbn0pO1xyXG5cclxuc2VsZi5hZGRFdmVudExpc3RlbmVyKFwiYWN0aXZhdGVcIiwgZSA9PiB7XHJcblx0ZS53YWl0VW50aWwoXHJcblx0XHRzZWxmLmNsaWVudHMuY2xhaW0oKVxyXG5cclxuXHRcdC50aGVuKCgpID0+IHtcclxuXHRcdFx0Ly8gbm90aWZ5IGNsaWVudHMgb2YgdGhlIHVwZGF0ZVxyXG5cdFx0XHRpZihuZXdWZXJzaW9uSW5zdGFsbGVkKSB7XHJcblx0XHRcdFx0bm90aWZ5Q2xpZW50cyhuZXdWZXJzaW9uSW5zdGFsbGVkKTtcclxuXHJcblx0XHRcdFx0bmV3VmVyc2lvbkluc3RhbGxlZCA9IHVuZGVmaW5lZDtcclxuXHRcdFx0fVxyXG5cdFx0fSlcclxuXHQpXHJcbn0pO1xyXG5cclxuLy8gaGFuZGxlIGEgbmV0d29yayBSZXF1ZXN0XHJcbnNlbGYuYWRkRXZlbnRMaXN0ZW5lcihcImZldGNoXCIsIGUgPT4ge1xyXG5cdC8vIGdldCB0aGUgcGFnZSB1cmxcclxuXHR2YXIgdXJsID0gbmV3IFVSTChlLnJlcXVlc3QudXJsKS5wYXRobmFtZTtcclxuXHJcblx0Ly8ganVzdCBnbyB0byB0aGUgc2VydmVyIGZvciBhcGkgY2FsbHNcclxuXHRpZih1cmwuc3Vic3RyKDAsIDUpID09IFwiL2FwaS9cIikge1xyXG5cdFx0ZS5yZXNwb25kV2l0aChcclxuXHRcdFx0ZmV0Y2goZS5yZXF1ZXN0LCB7XHJcblx0XHRcdFx0Y3JlZGVudGlhbHM6IFwiaW5jbHVkZVwiXHJcblx0XHRcdH0pXHJcblxyXG5cdFx0XHQvLyBuZXR3b3JrIGVycm9yXHJcblx0XHRcdC5jYXRjaChlcnIgPT4ge1xyXG5cdFx0XHRcdC8vIHNlbmQgYW4gZXJyb3IgcmVzcG9uc2VcclxuXHRcdFx0XHRyZXR1cm4gbmV3IFJlc3BvbnNlKGVyci5tZXNzYWdlLCB7XHJcblx0XHRcdFx0XHRzdGF0dXM6IDUwMFxyXG5cdFx0XHRcdH0pO1xyXG5cdFx0XHR9KVxyXG5cclxuXHRcdFx0LnRoZW4ocmVzID0+IHtcclxuXHRcdFx0XHQvLyBjaGVjayBmb3IgdXBkYXRlc1xyXG5cdFx0XHRcdGNoZWNrRm9yVXBkYXRlcyh7XHJcblx0XHRcdFx0XHRuZXdWZXJzaW9uOiByZXMuaGVhZGVycy5nZXQoXCJzZXJ2ZXJcIilcclxuXHRcdFx0XHR9KTtcclxuXHJcblx0XHRcdFx0cmV0dXJuIHJlcztcclxuXHRcdFx0fSlcclxuXHRcdCk7XHJcblx0fVxyXG5cdC8vIHJlc3BvbmQgZnJvbSB0aGUgY2FjaGVcclxuXHRlbHNlIHtcclxuXHRcdGUucmVzcG9uZFdpdGgoXHJcblx0XHRcdGNhY2hlcy5tYXRjaChlLnJlcXVlc3QpXHJcblxyXG5cdFx0XHQudGhlbihyZXMgPT4ge1xyXG5cdFx0XHRcdC8vIGlmIHRoZXJlIHdhcyBubyBtYXRjaCBzZW5kIHRoZSBpbmRleCBwYWdlXHJcblx0XHRcdFx0aWYoIXJlcykge1xyXG5cdFx0XHRcdFx0cmV0dXJuIGNhY2hlcy5tYXRjaChuZXcgUmVxdWVzdChcIi9cIikpO1xyXG5cdFx0XHRcdH1cclxuXHJcblx0XHRcdFx0cmV0dXJuIHJlcztcclxuXHRcdFx0fSlcclxuXHRcdCk7XHJcblx0fVxyXG59KTtcclxuIiwiLyoqXHJcbiAqIEEgaGVscGVyIGZvciBidWlsZGluZyBkb20gbm9kZXNcclxuICovXHJcblxyXG5jb25zdCBTVkdfRUxFTUVOVFMgPSBbXCJzdmdcIiwgXCJsaW5lXCJdO1xyXG5jb25zdCBTVkdfTkFNRVNQQUNFID0gXCJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2Z1wiO1xyXG5cclxuLy8gYnVpbGQgYSBzaW5nbGUgZG9tIG5vZGVcclxudmFyIG1ha2VEb20gPSBmdW5jdGlvbihvcHRzID0ge30pIHtcclxuXHQvLyBnZXQgb3IgY3JlYXRlIHRoZSBuYW1lIG1hcHBpbmdcclxuXHR2YXIgbWFwcGVkID0gb3B0cy5tYXBwZWQgfHwge307XHJcblxyXG5cdHZhciAkZWw7XHJcblxyXG5cdC8vIHRoZSBlbGVtZW50IGlzIHBhcnQgb2YgdGhlIHN2ZyBuYW1lc3BhY2VcclxuXHRpZihTVkdfRUxFTUVOVFMuaW5kZXhPZihvcHRzLnRhZykgIT09IC0xKSB7XHJcblx0XHQkZWwgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50TlMoU1ZHX05BTUVTUEFDRSwgb3B0cy50YWcpO1xyXG5cdH1cclxuXHQvLyBhIHBsYWluIGVsZW1lbnRcclxuXHRlbHNlIHtcclxuXHRcdCRlbCA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQob3B0cy50YWcgfHwgXCJkaXZcIik7XHJcblx0fVxyXG5cclxuXHQvLyBzZXQgdGhlIGNsYXNzZXNcclxuXHRpZihvcHRzLmNsYXNzZXMpIHtcclxuXHRcdCRlbC5zZXRBdHRyaWJ1dGUoXCJjbGFzc1wiLCB0eXBlb2Ygb3B0cy5jbGFzc2VzID09IFwic3RyaW5nXCIgPyBvcHRzLmNsYXNzZXMgOiBvcHRzLmNsYXNzZXMuam9pbihcIiBcIikpO1xyXG5cdH1cclxuXHJcblx0Ly8gYXR0YWNoIHRoZSBhdHRyaWJ1dGVzXHJcblx0aWYob3B0cy5hdHRycykge1xyXG5cdFx0T2JqZWN0LmdldE93blByb3BlcnR5TmFtZXMob3B0cy5hdHRycylcclxuXHJcblx0XHQuZm9yRWFjaChhdHRyID0+ICRlbC5zZXRBdHRyaWJ1dGUoYXR0ciwgb3B0cy5hdHRyc1thdHRyXSkpO1xyXG5cdH1cclxuXHJcblx0Ly8gc2V0IHRoZSB0ZXh0IGNvbnRlbnRcclxuXHRpZihvcHRzLnRleHQpIHtcclxuXHRcdCRlbC5pbm5lclRleHQgPSBvcHRzLnRleHQ7XHJcblx0fVxyXG5cclxuXHQvLyBhdHRhY2ggdGhlIG5vZGUgdG8gaXRzIHBhcmVudFxyXG5cdGlmKG9wdHMucGFyZW50KSB7XHJcblx0XHRvcHRzLnBhcmVudC5pbnNlcnRCZWZvcmUoJGVsLCBvcHRzLmJlZm9yZSk7XHJcblx0fVxyXG5cclxuXHQvLyBhZGQgZXZlbnQgbGlzdGVuZXJzXHJcblx0aWYob3B0cy5vbikge1xyXG5cdFx0Zm9yKGxldCBuYW1lIG9mIE9iamVjdC5nZXRPd25Qcm9wZXJ0eU5hbWVzKG9wdHMub24pKSB7XHJcblx0XHRcdCRlbC5hZGRFdmVudExpc3RlbmVyKG5hbWUsIG9wdHMub25bbmFtZV0pO1xyXG5cclxuXHRcdFx0Ly8gYXR0YWNoIHRoZSBkb20gdG8gYSBkaXNwb3NhYmxlXHJcblx0XHRcdGlmKG9wdHMuZGlzcCkge1xyXG5cdFx0XHRcdG9wdHMuZGlzcC5hZGQoe1xyXG5cdFx0XHRcdFx0dW5zdWJzY3JpYmU6ICgpID0+ICRlbC5yZW1vdmVFdmVudExpc3RlbmVyKG5hbWUsIG9wdHMub25bbmFtZV0pXHJcblx0XHRcdFx0fSk7XHJcblx0XHRcdH1cclxuXHRcdH1cclxuXHR9XHJcblxyXG5cdC8vIHNldCB0aGUgdmFsdWUgb2YgYW4gaW5wdXQgZWxlbWVudFxyXG5cdGlmKG9wdHMudmFsdWUpIHtcclxuXHRcdCRlbC52YWx1ZSA9IG9wdHMudmFsdWU7XHJcblx0fVxyXG5cclxuXHQvLyBhZGQgdGhlIG5hbWUgbWFwcGluZ1xyXG5cdGlmKG9wdHMubmFtZSkge1xyXG5cdFx0bWFwcGVkW29wdHMubmFtZV0gPSAkZWw7XHJcblx0fVxyXG5cclxuXHQvLyBjcmVhdGUgdGhlIGNoaWxkIGRvbSBub2Rlc1xyXG5cdGlmKG9wdHMuY2hpbGRyZW4pIHtcclxuXHRcdGZvcihsZXQgY2hpbGQgb2Ygb3B0cy5jaGlsZHJlbikge1xyXG5cdFx0XHQvLyBtYWtlIGFuIGFycmF5IGludG8gYSBncm91cCBPYmplY3RcclxuXHRcdFx0aWYoQXJyYXkuaXNBcnJheShjaGlsZCkpIHtcclxuXHRcdFx0XHRjaGlsZCA9IHtcclxuXHRcdFx0XHRcdGdyb3VwOiBjaGlsZFxyXG5cdFx0XHRcdH07XHJcblx0XHRcdH1cclxuXHJcblx0XHRcdC8vIGF0dGFjaCBpbmZvcm1hdGlvbiBmb3IgdGhlIGdyb3VwXHJcblx0XHRcdGNoaWxkLnBhcmVudCA9ICRlbDtcclxuXHRcdFx0Y2hpbGQuZGlzcCA9IG9wdHMuZGlzcDtcclxuXHRcdFx0Y2hpbGQubWFwcGVkID0gbWFwcGVkO1xyXG5cclxuXHRcdFx0Ly8gYnVpbGQgdGhlIG5vZGUgb3IgZ3JvdXBcclxuXHRcdFx0bWFrZShjaGlsZCk7XHJcblx0XHR9XHJcblx0fVxyXG5cclxuXHRyZXR1cm4gbWFwcGVkO1xyXG59XHJcblxyXG4vLyBidWlsZCBhIGdyb3VwIG9mIGRvbSBub2Rlc1xyXG52YXIgbWFrZUdyb3VwID0gZnVuY3Rpb24oZ3JvdXApIHtcclxuXHQvLyBzaG9ydGhhbmQgZm9yIGEgZ3JvdXBzXHJcblx0aWYoQXJyYXkuaXNBcnJheShncm91cCkpIHtcclxuXHRcdGdyb3VwID0ge1xyXG5cdFx0XHRjaGlsZHJlbjogZ3JvdXBcclxuXHRcdH07XHJcblx0fVxyXG5cclxuXHQvLyBnZXQgb3IgY3JlYXRlIHRoZSBuYW1lIG1hcHBpbmdcclxuXHR2YXIgbWFwcGVkID0ge307XHJcblxyXG5cdGZvcihsZXQgbm9kZSBvZiBncm91cC5ncm91cCkge1xyXG5cdFx0Ly8gY29weSBvdmVyIHByb3BlcnRpZXMgZnJvbSB0aGUgZ3JvdXBcclxuXHRcdG5vZGUucGFyZW50IHx8IChub2RlLnBhcmVudCA9IGdyb3VwLnBhcmVudCk7XHJcblx0XHRub2RlLmRpc3AgfHwgKG5vZGUuZGlzcCA9IGdyb3VwLmRpc3ApO1xyXG5cdFx0bm9kZS5tYXBwZWQgPSBtYXBwZWQ7XHJcblxyXG5cdFx0Ly8gbWFrZSB0aGUgZG9tXHJcblx0XHRtYWtlKG5vZGUpO1xyXG5cdH1cclxuXHJcblx0Ly8gY2FsbCB0aGUgY2FsbGJhY2sgd2l0aCB0aGUgbWFwcGVkIG5hbWVzXHJcblx0aWYoZ3JvdXAuYmluZCkge1xyXG5cdFx0dmFyIHN1YnNjcmlwdGlvbiA9IGdyb3VwLmJpbmQobWFwcGVkKTtcclxuXHJcblx0XHQvLyBpZiB0aGUgcmV0dXJuIGEgc3Vic2NyaXB0aW9uIGF0dGFjaCBpdCB0byB0aGUgZGlzcG9zYWJsZVxyXG5cdFx0aWYoc3Vic2NyaXB0aW9uICYmIGdyb3VwLmRpc3ApIHtcclxuXHRcdFx0Z3JvdXAuZGlzcC5hZGQoc3Vic2NyaXB0aW9uKTtcclxuXHRcdH1cclxuXHR9XHJcblxyXG5cdHJldHVybiBtYXBwZWQ7XHJcbn07XHJcblxyXG4vLyBhIGNvbGxlY3Rpb24gb2Ygd2lkZ2V0c1xyXG52YXIgd2lkZ2V0cyA9IHt9O1xyXG5cclxudmFyIG1ha2UgPSBtb2R1bGUuZXhwb3J0cyA9IGZ1bmN0aW9uKG9wdHMpIHtcclxuXHQvLyBoYW5kbGUgYSBncm91cFxyXG5cdGlmKEFycmF5LmlzQXJyYXkob3B0cykgfHwgb3B0cy5ncm91cCkge1xyXG5cdFx0cmV0dXJuIG1ha2VHcm91cChvcHRzKTtcclxuXHR9XHJcblx0Ly8gbWFrZSBhIHdpZGdldFxyXG5cdGVsc2UgaWYob3B0cy53aWRnZXQpIHtcclxuXHRcdHZhciB3aWRnZXQgPSB3aWRnZXRzW29wdHMud2lkZ2V0XTtcclxuXHJcblx0XHQvLyBub3QgZGVmaW5lZFxyXG5cdFx0aWYoIXdpZGdldCkge1xyXG5cdFx0XHR0aHJvdyBuZXcgRXJyb3IoYFdpZGdldCAnJHtvcHRzLndpZGdldH0nIGlzIG5vdCBkZWZpbmVkIG1ha2Ugc3VyZSBpdHMgYmVlbiBpbXBvcnRlZGApO1xyXG5cdFx0fVxyXG5cclxuXHRcdC8vIGdlbmVyYXRlIHRoZSB3aWRnZXQgY29udGVudFxyXG5cdFx0dmFyIGJ1aWx0ID0gd2lkZ2V0Lm1ha2Uob3B0cyk7XHJcblxyXG5cdFx0cmV0dXJuIG1ha2VHcm91cCh7XHJcblx0XHRcdHBhcmVudDogb3B0cy5wYXJlbnQsXHJcblx0XHRcdGRpc3A6IG9wdHMuZGlzcCxcclxuXHRcdFx0Z3JvdXA6IEFycmF5LmlzQXJyYXkoYnVpbHQpID8gYnVpbHQgOiBbYnVpbHRdLFxyXG5cdFx0XHRiaW5kOiB3aWRnZXQuYmluZCAmJiB3aWRnZXQuYmluZC5iaW5kKHdpZGdldCwgb3B0cylcclxuXHRcdH0pO1xyXG5cdH1cclxuXHQvLyBtYWtlIGEgc2luZ2xlIG5vZGVcclxuXHRlbHNlIHtcclxuXHRcdHJldHVybiBtYWtlRG9tKG9wdHMpO1xyXG5cdH1cclxufTtcclxuXHJcbi8vIHJlZ2lzdGVyIGEgd2lkZ2V0XHJcbm1ha2UucmVnaXN0ZXIgPSBmdW5jdGlvbihuYW1lLCB3aWRnZXQpIHtcclxuXHR3aWRnZXRzW25hbWVdID0gd2lkZ2V0O1xyXG59O1xyXG4iLCIvKipcclxuICogQSBiYXNpYyBrZXkgdmFsdWUgZGF0YSBzdG9yZVxyXG4gKi9cclxuXHJcbnZhciBFdmVudEVtaXR0ZXIgPSByZXF1aXJlKFwiLi4vdXRpbC9ldmVudC1lbWl0dGVyXCIpO1xyXG5cclxuY2xhc3MgS2V5VmFsdWVTdG9yZSBleHRlbmRzIEV2ZW50RW1pdHRlciB7XHJcblx0Y29uc3RydWN0b3IoYWRhcHRvcikge1xyXG5cdFx0c3VwZXIoKTtcclxuXHRcdHRoaXMuX2FkYXB0b3IgPSBhZGFwdG9yO1xyXG5cclxuXHRcdC8vIG1ha2Ugc3VyZSB3ZSBoYXZlIGFuIGFkYXB0b3JcclxuXHRcdGlmKCFhZGFwdG9yKSB7XHJcblx0XHRcdHRocm93IG5ldyBFcnJvcihcIktleVZhbHVlU3RvcmUgbXVzdCBiZSBpbml0aWFsaXplZCB3aXRoIGFuIGFkYXB0b3JcIilcclxuXHRcdH1cclxuXHR9XHJcblxyXG5cdC8qKlxyXG5cdCAqIEdldCB0aGUgY29ycmlzcG9uZGluZyB2YWx1ZSBvdXQgb2YgdGhlIGRhdGEgc3RvcmUgb3RoZXJ3aXNlIHJldHVybiBkZWZhdWx0XHJcblx0ICovXHJcblx0Z2V0KGtleSwgX2RlZmF1bHQpIHtcclxuXHRcdC8vIGNoZWNrIGlmIHRoaXMgdmFsdWUgaGFzIGJlZW4gb3ZlcnJpZGVuXHJcblx0XHRpZih0aGlzLl9vdmVycmlkZXMgJiYgdGhpcy5fb3ZlcnJpZGVzLmhhc093blByb3BlcnR5KGtleSkpIHtcclxuXHRcdFx0cmV0dXJuIFByb21pc2UucmVzb2x2ZSh0aGlzLl9vdmVycmlkZXNba2V5XSk7XHJcblx0XHR9XHJcblxyXG5cdFx0cmV0dXJuIHRoaXMuX2FkYXB0b3IuZ2V0KGtleSlcclxuXHJcblx0XHQudGhlbihyZXN1bHQgPT4ge1xyXG5cdFx0XHQvLyB0aGUgaXRlbSBpcyBub3QgZGVmaW5lZFxyXG5cdFx0XHRpZighcmVzdWx0KSB7XHJcblx0XHRcdFx0cmV0dXJuIF9kZWZhdWx0O1xyXG5cdFx0XHR9XHJcblxyXG5cdFx0XHRyZXR1cm4gcmVzdWx0LnZhbHVlO1xyXG5cdFx0fSk7XHJcblx0fVxyXG5cclxuXHQvKipcclxuXHQgKiBTZXQgYSBzaW5nbGUgdmFsdWUgb3Igc2V2ZXJhbCB2YWx1ZXNcclxuXHQgKlxyXG5cdCAqIGtleSAtPiB2YWx1ZVxyXG5cdCAqIG9yXHJcblx0ICogeyBrZXk6IHZhbHVlIH1cclxuXHQgKi9cclxuXHRzZXQoa2V5LCB2YWx1ZSkge1xyXG5cdFx0Ly8gc2V0IGEgc2luZ2xlIHZhbHVlXHJcblx0XHRpZih0eXBlb2Yga2V5ID09IFwic3RyaW5nXCIpIHtcclxuXHRcdFx0dmFyIHByb21pc2UgPSB0aGlzLl9hZGFwdG9yLnNldCh7XHJcblx0XHRcdFx0aWQ6IGtleSxcclxuXHRcdFx0XHR2YWx1ZSxcclxuXHRcdFx0XHRtb2RpZmllZDogRGF0ZS5ub3coKVxyXG5cdFx0XHR9KTtcclxuXHJcblx0XHRcdC8vIHRyaWdnZXIgdGhlIGNoYW5nZVxyXG5cdFx0XHR0aGlzLmVtaXQoa2V5LCB2YWx1ZSk7XHJcblxyXG5cdFx0XHRyZXR1cm4gcHJvbWlzZTtcclxuXHRcdH1cclxuXHRcdC8vIHNldCBzZXZlcmFsIHZhbHVlc1xyXG5cdFx0ZWxzZSB7XHJcblx0XHRcdC8vIHRlbGwgdGhlIGNhbGxlciB3aGVuIHdlIGFyZSBkb25lXHJcblx0XHRcdGxldCBwcm9taXNlcyA9IFtdO1xyXG5cclxuXHRcdFx0Zm9yKGxldCBfa2V5IG9mIE9iamVjdC5nZXRPd25Qcm9wZXJ0eU5hbWVzKGtleSkpIHtcclxuXHRcdFx0XHRwcm9taXNlcy5wdXNoKFxyXG5cdFx0XHRcdFx0dGhpcy5fYWRhcHRvci5zZXQoe1xyXG5cdFx0XHRcdFx0XHRpZDogX2tleSxcclxuXHRcdFx0XHRcdFx0dmFsdWU6IGtleVtfa2V5XSxcclxuXHRcdFx0XHRcdFx0bW9kaWZpZWQ6IERhdGUubm93KClcclxuXHRcdFx0XHRcdH0pXHJcblx0XHRcdFx0KTtcclxuXHJcblx0XHRcdFx0Ly8gdHJpZ2dlciB0aGUgY2hhbmdlXHJcblx0XHRcdFx0dGhpcy5lbWl0KF9rZXksIGtleVtfa2V5XSk7XHJcblx0XHRcdH1cclxuXHJcblx0XHRcdHJldHVybiBQcm9taXNlLmFsbChwcm9taXNlcyk7XHJcblx0XHR9XHJcblx0fVxyXG5cclxuXHQgLyoqXHJcblx0ICAqIFdhdGNoIHRoZSB2YWx1ZSBmb3IgY2hhbmdlc1xyXG5cdCAgKlxyXG5cdCAgKiBvcHRzLmN1cnJlbnQgLSBzZW5kIHRoZSBjdXJyZW50IHZhbHVlIG9mIGtleSAoZGVmYXVsdDogZmFsc2UpXHJcblx0ICAqIG9wdHMuZGVmYXVsdCAtIHRoZSBkZWZhdWx0IHZhbHVlIHRvIHNlbmQgZm9yIG9wdHMuY3VycmVudFxyXG5cdCAgKi9cclxuXHQgd2F0Y2goa2V5LCBvcHRzLCBmbikge1xyXG5cdFx0IC8vIG1ha2Ugb3B0cyBvcHRpb25hbFxyXG5cdFx0IGlmKHR5cGVvZiBvcHRzID09IFwiZnVuY3Rpb25cIikge1xyXG5cdFx0XHQgZm4gPSBvcHRzO1xyXG5cdFx0XHQgb3B0cyA9IHt9O1xyXG5cdFx0IH1cclxuXHJcblx0XHQgLy8gaWYgYSBjaGFuZ2UgaXMgdHJpZ2dlcmVkIGJlZm9yZSBnZXQgY29tZXMgYmFjayBkb24ndCBlbWl0IHRoZSB2YWx1ZSBmcm9tIGdldFxyXG5cdFx0IHZhciBjaGFuZ2VSZWNpZXZlZCA9IGZhbHNlO1xyXG5cclxuXHRcdCAvLyBzZW5kIHRoZSBjdXJyZW50IHZhbHVlXHJcblx0XHQgaWYob3B0cy5jdXJyZW50KSB7XHJcblx0XHRcdCB0aGlzLmdldChrZXksIG9wdHMuZGVmYXVsdClcclxuXHJcblx0XHQgXHQudGhlbih2YWx1ZSA9PiB7XHJcblx0XHRcdFx0aWYoIWNoYW5nZVJlY2lldmVkKSB7XHJcblx0XHRcdFx0XHRmbih2YWx1ZSk7XHJcblx0XHRcdFx0fVxyXG5cdFx0XHR9KTtcclxuXHRcdCB9XHJcblxyXG5cdFx0IC8vIGxpc3RlbiBmb3IgYW55IGNoYW5nZXNcclxuXHRcdCByZXR1cm4gdGhpcy5vbihrZXksIHZhbHVlID0+IHtcclxuXHRcdFx0IC8vIG9ubHkgZW1pdCB0aGUgY2hhbmdlIGlmIHRoZXJlIGlzIG5vdCBhbiBvdmVycmlkZSBpbiBwbGFjZVxyXG5cdFx0XHQgaWYoIXRoaXMuX292ZXJyaWRlcyB8fCAhdGhpcy5fb3ZlcnJpZGVzLmhhc093blByb3BlcnR5KGtleSkpIHtcclxuXHRcdFx0XHQgZm4odmFsdWUpO1xyXG5cdFx0XHQgfVxyXG5cclxuXHRcdFx0IGNoYW5nZVJlY2lldmVkID0gdHJ1ZTtcclxuXHRcdCB9KTtcclxuXHQgfVxyXG5cclxuXHQgLyoqXHJcblx0ICAqIE92ZXJyaWRlIHRoZSB2YWx1ZXMgZnJvbSB0aGUgYWRhcHRvciB3aXRob3V0IHdyaXRpbmcgdG8gdGhlbVxyXG5cdCAgKlxyXG5cdCAgKiBVc2VmdWwgZm9yIGNvbWJpbmluZyBqc29uIHNldHRpbmdzIHdpdGggY29tbWFuZCBsaW5lIGZsYWdzXHJcblx0ICAqL1xyXG5cdCBzZXRPdmVycmlkZXMob3ZlcnJpZGVzKSB7XHJcblx0XHQgLy8gZW1pdCBjaGFuZ2VzIGZvciBlYWNoIG9mIHRoZSBvdmVycmlkZXNcclxuXHRcdCBPYmplY3QuZ2V0T3duUHJvcGVydHlOYW1lcyhvdmVycmlkZXMpXHJcblxyXG5cdFx0IC5mb3JFYWNoKGtleSA9PiB0aGlzLmVtaXQoa2V5LCBvdmVycmlkZXNba2V5XSkpO1xyXG5cclxuXHRcdCAvLyBzZXQgdGhlIG92ZXJyaWRlcyBhZnRlciBzbyB0aGUgZW1pdCBpcyBub3QgYmxvY2tlZFxyXG5cdFx0IHRoaXMuX292ZXJyaWRlcyA9IG92ZXJyaWRlcztcclxuXHQgfVxyXG59XHJcblxyXG5tb2R1bGUuZXhwb3J0cyA9IEtleVZhbHVlU3RvcmU7XHJcbiIsIi8qKlxyXG4gKiBDcmVhdGUgYSBnbG9iYWwgb2JqZWN0IHdpdGggY29tbW9ubHkgdXNlZCBtb2R1bGVzIHRvIGF2b2lkIDUwIG1pbGxpb24gcmVxdWlyZXNcclxuICovXHJcblxyXG52YXIgRXZlbnRFbWl0dGVyID0gcmVxdWlyZShcIi4vdXRpbC9ldmVudC1lbWl0dGVyXCIpO1xyXG5cclxudmFyIGxpZmVMaW5lID0gbmV3IEV2ZW50RW1pdHRlcigpO1xyXG5cclxuLy8gYXR0YWNoIHV0aWxzXHJcbmxpZmVMaW5lLkRpc3Bvc2FibGUgPSByZXF1aXJlKFwiLi91dGlsL2Rpc3Bvc2FibGVcIik7XHJcbmxpZmVMaW5lLkV2ZW50RW1pdHRlciA9IEV2ZW50RW1pdHRlcjtcclxuXHJcbi8vIGF0dGFjaCBsaWZlbGluZSB0byB0aGUgZ2xvYmFsIG9iamVjdFxyXG4odHlwZW9mIHdpbmRvdyA9PSBcIm9iamVjdFwiID8gd2luZG93IDogc2VsZikubGlmZUxpbmUgPSBsaWZlTGluZTtcclxuIiwiLyoqXHJcbiAqIEtlZXAgYSBsaXN0IG9mIHN1YnNjcmlwdGlvbnMgdG8gdW5zdWJzY3JpYmUgZnJvbSB0b2dldGhlclxyXG4gKi9cclxuXHJcbmNsYXNzIERpc3Bvc2FibGUge1xyXG5cdGNvbnN0cnVjdG9yKCkge1xyXG5cdFx0dGhpcy5fc3Vic2NyaXB0aW9ucyA9IFtdO1xyXG5cdH1cclxuXHJcblx0Ly8gVW5zdWJzY3JpYmUgZnJvbSBhbGwgc3Vic2NyaXB0aW9uc1xyXG5cdGRpc3Bvc2UoKSB7XHJcblx0XHQvLyByZW1vdmUgdGhlIGZpcnN0IHN1YnNjcmlwdGlvbiB1bnRpbCB0aGVyZSBhcmUgbm9uZSBsZWZ0XHJcblx0XHR3aGlsZSh0aGlzLl9zdWJzY3JpcHRpb25zLmxlbmd0aCA+IDApIHtcclxuXHRcdFx0dGhpcy5fc3Vic2NyaXB0aW9ucy5zaGlmdCgpLnVuc3Vic2NyaWJlKCk7XHJcblx0XHR9XHJcblx0fVxyXG5cclxuXHQvLyBBZGQgYSBzdWJzY3JpcHRpb24gdG8gdGhlIGRpc3Bvc2FibGVcclxuXHRhZGQoc3Vic2NyaXB0aW9uKSB7XHJcblx0XHR0aGlzLl9zdWJzY3JpcHRpb25zLnB1c2goc3Vic2NyaXB0aW9uKTtcclxuXHR9XHJcblxyXG5cdC8vIGRpc3Bvc2Ugd2hlbiBhbiBldmVudCBpcyBmaXJlZFxyXG5cdGRpc3Bvc2VPbihlbWl0dGVyLCBldmVudCkge1xyXG5cdFx0dGhpcy5hZGQoZW1pdHRlci5vbihldmVudCwgKCkgPT4gdGhpcy5kaXNwb3NlKCkpKTtcclxuXHR9XHJcbn07XHJcblxyXG5tb2R1bGUuZXhwb3J0cyA9IERpc3Bvc2FibGU7XHJcbiIsIi8qKlxyXG4gKiBBIGJhc2ljIGV2ZW50IGVtaXR0ZXJcclxuICovXHJcblxyXG5jbGFzcyBFdmVudEVtaXR0ZXIge1xyXG5cdGNvbnN0cnVjdG9yKCkge1xyXG5cdFx0dGhpcy5fbGlzdGVuZXJzID0ge307XHJcblx0fVxyXG5cclxuXHQvKipcclxuXHQgKiBBZGQgYW4gZXZlbnQgbGlzdGVuZXJcclxuXHQgKi9cclxuXHRvbihuYW1lLCBsaXN0ZW5lcikge1xyXG5cdFx0Ly8gaWYgd2UgZG9uJ3QgaGF2ZSBhbiBleGlzdGluZyBsaXN0ZW5lcnMgYXJyYXkgY3JlYXRlIG9uZVxyXG5cdFx0aWYoIXRoaXMuX2xpc3RlbmVyc1tuYW1lXSkge1xyXG5cdFx0XHR0aGlzLl9saXN0ZW5lcnNbbmFtZV0gPSBbXTtcclxuXHRcdH1cclxuXHJcblx0XHQvLyBhZGQgdGhlIGxpc3RlbmVyXHJcblx0XHR0aGlzLl9saXN0ZW5lcnNbbmFtZV0ucHVzaChsaXN0ZW5lcik7XHJcblxyXG5cdFx0Ly8gZ2l2ZSB0aGVtIGEgc3Vic2NyaXB0aW9uXHJcblx0XHRyZXR1cm4ge1xyXG5cdFx0XHRfbGlzdGVuZXI6IGxpc3RlbmVyLFxyXG5cclxuXHRcdFx0dW5zdWJzY3JpYmU6ICgpID0+IHtcclxuXHRcdFx0XHQvLyBmaW5kIHRoZSBsaXN0ZW5lclxyXG5cdFx0XHRcdHZhciBpbmRleCA9IHRoaXMuX2xpc3RlbmVyc1tuYW1lXS5pbmRleE9mKGxpc3RlbmVyKTtcclxuXHJcblx0XHRcdFx0aWYoaW5kZXggIT09IC0xKSB7XHJcblx0XHRcdFx0XHR0aGlzLl9saXN0ZW5lcnNbbmFtZV0uc3BsaWNlKGluZGV4LCAxKTtcclxuXHRcdFx0XHR9XHJcblx0XHRcdH1cclxuXHRcdH07XHJcblx0fVxyXG5cclxuXHQvKipcclxuXHQgKiBFbWl0IGFuIGV2ZW50XHJcblx0ICovXHJcblx0ZW1pdChuYW1lLCAuLi5hcmdzKSB7XHJcblx0XHQvLyBjaGVjayBmb3IgbGlzdGVuZXJzXHJcblx0XHRpZih0aGlzLl9saXN0ZW5lcnNbbmFtZV0pIHtcclxuXHRcdFx0Zm9yKGxldCBsaXN0ZW5lciBvZiB0aGlzLl9saXN0ZW5lcnNbbmFtZV0pIHtcclxuXHRcdFx0XHQvLyBjYWxsIHRoZSBsaXN0ZW5lcnNcclxuXHRcdFx0XHRsaXN0ZW5lciguLi5hcmdzKTtcclxuXHRcdFx0fVxyXG5cdFx0fVxyXG5cdH1cclxuXHJcblx0LyoqXHJcblx0ICogRW1pdCBhbiBldmVudCBhbmQgc2tpcCBzb21lIGxpc3RlbmVyc1xyXG5cdCAqL1xyXG5cdHBhcnRpYWxFbWl0KG5hbWUsIHNraXBzID0gW10sIC4uLmFyZ3MpIHtcclxuXHRcdC8vIGFsbG93IGEgc2luZ2xlIGl0ZW1cclxuXHRcdGlmKCFBcnJheS5pc0FycmF5KHNraXBzKSkge1xyXG5cdFx0XHRza2lwcyA9IFtza2lwc107XHJcblx0XHR9XHJcblxyXG5cdFx0Ly8gY2hlY2sgZm9yIGxpc3RlbmVyc1xyXG5cdFx0aWYodGhpcy5fbGlzdGVuZXJzW25hbWVdKSB7XHJcblx0XHRcdGZvcihsZXQgbGlzdGVuZXIgb2YgdGhpcy5fbGlzdGVuZXJzW25hbWVdKSB7XHJcblx0XHRcdFx0Ly8gdGhpcyBldmVudCBsaXN0ZW5lciBpcyBiZWluZyBza2lwZWRcclxuXHRcdFx0XHRpZihza2lwcy5maW5kKHNraXAgPT4gc2tpcC5fbGlzdGVuZXIgPT0gbGlzdGVuZXIpKSB7XHJcblx0XHRcdFx0XHRjb250aW51ZTtcclxuXHRcdFx0XHR9XHJcblxyXG5cdFx0XHRcdC8vIGNhbGwgdGhlIGxpc3RlbmVyc1xyXG5cdFx0XHRcdGxpc3RlbmVyKC4uLmFyZ3MpO1xyXG5cdFx0XHR9XHJcblx0XHR9XHJcblx0fVxyXG59XHJcblxyXG5tb2R1bGUuZXhwb3J0cyA9IEV2ZW50RW1pdHRlcjtcclxuIl19
