(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
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

},{}],2:[function(require,module,exports){
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
		return _this;
	}

	// set the function to deserialize all data from the server


	_createClass(Store, [{
		key: "setInit",
		value: function setInit(fn) {
			this._deserializer = fn;
		}

		// send a request to the server

	}, {
		key: "_request",
		value: function _request(method, url, body) {
			var _this2 = this;

			url = DATA_STORE_ROOT + url;

			// don't duplicate requests
			if (method == "get") {
				// already making this request
				if (this._requesting.indexOf(url) !== -1) return;

				this._requesting.push(url);
			}

			// make the actual request
			return fetch(url, {
				method: method,
				credentials: "include",
				body: body && JSON.stringify(body)
			})

			// parse the response
			.then(function (res) {
				return res.json();
			}).then(function (res) {
				// remove the lock
				if (method == "get") {
					var index = _this2._requesting.indexOf(url);

					if (index !== -1) _this2._requesting.splice(index, 1);
				}

				// update the cache and emit a change
				if (res.status == "success" && method == "get") {
					// store the value in the cache
					if (Array.isArray(res.data)) {
						res.data.forEach(function (item) {
							// deserialize the item
							if (_this2._deserializer) {
								item = _this2._deserializer(item) || item;
							}

							// store teh item
							_this2._cache[item.id] = item;
						});
					} else {
						var item = res.data;

						// deserialize the item
						if (_this2._deserializer) {
							item = _this2._deserializer(item) || item;
						}

						_this2._cache[res.data.id] = item;
					}

					// emit a change
					_this2.emit("change");
				}

				// throw the error
				if (res.status == "error") {
					throw new Error(res.data);
				}

				// the user is not logged in
				if (res.status == "fail" && res.data.reason == "logged-out") {
					lifeLine.nav.navigate("/login");
				}
			});
		}

		// get all the items and listen for any changes

	}, {
		key: "getAll",
		value: function getAll(fn) {
			var _this3 = this;

			// go to the cache first
			fn(arrayFromObject(this._cache));

			// send a request to the server for the items
			this._request("get", this.name);

			// listen for any changes
			return this.on("change", function () {
				// the changes will we in the cache
				fn(arrayFromObject(_this3._cache));
			});
		}

		// get a single item and listen for changes

	}, {
		key: "get",
		value: function get(id, fn) {
			var _this4 = this;

			// go to the cache first
			fn(this._cache[id]);

			// send a request to the server for the item
			this._request("get", this.name + "/" + id);

			// listen for any changes
			return this.on("change", function () {
				fn(_this4._cache[id]);
			});
		}

		// store a value in the store

	}, {
		key: "set",
		value: function set(value, skips) {
			var _this5 = this;

			// store the value in the cache
			this._cache[value.id] = value;

			// save the item
			debounce(value.id, function () {
				_this5._request("put", _this5.name + "/" + value.id, value);
			});

			// emit a change
			this.partialEmit("change", skips);
		}

		// remove a value from the store

	}, {
		key: "remove",
		value: function remove(id, skips) {
			// remove the value from the cache
			delete this._cache[id];

			// send the delete request
			this._request("delete", this.name + "/" + id);

			// emit a change
			this.partialEmit("change", skips);
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

},{}],3:[function(require,module,exports){
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

},{"./util/dom-maker":6}],4:[function(require,module,exports){
"use strict";

require("../common/global");

require("./global");

require("./widgets/sidebar");

require("./widgets/content");

require("./widgets/link");

require("./widgets/list");

require("./widgets/input");

var _lists = require("./views/lists");

require("./views/item");

require("./views/edit");

require("./views/login");

require("./views/account");

require("./views/users");

var _dataStore = require("./data-store");

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


// load all the views
lifeLine.makeDom({
	parent: document.body,
	group: [{ widget: "sidebar" }, { widget: "content" }]
});

// add list views to the navbar
(0, _lists.initNavBar)();

// create a new assignment
lifeLine.addCommand("New assignment", function () {
	var id = Math.floor(Math.random() * 100000000);

	lifeLine.nav.navigate("/edit/" + id);
});

// create the logout button
lifeLine.addNavCommand("Account", "/account");

},{"../common/global":20,"./data-store":2,"./global":3,"./views/account":7,"./views/edit":8,"./views/item":9,"./views/lists":10,"./views/login":11,"./views/users":12,"./widgets/content":13,"./widgets/input":14,"./widgets/link":15,"./widgets/list":16,"./widgets/sidebar":17}],5:[function(require,module,exports){
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
  return date1.getFullYear() <= date2.getFullYear() && date1.getMonth() <= date2.getMonth() && date1.getDate() < date2.getDate();
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

},{}],6:[function(require,module,exports){
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

},{}],7:[function(require,module,exports){
"use strict";

/**
 * A view for accessing/modifying information about the current user
 */

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

			children.push({
				tag: "form",
				children: [{
					classes: "editor-row",
					children: [{
						tag: "input",
						classes: "input-fill",
						attrs: {
							type: "password",
							placeholder: "Old password"
						},
						name: "oldPassword"
					}, {
						tag: "input",
						classes: "input-fill",
						attrs: {
							type: "password",
							placeholder: "New password"
						},
						name: "password"
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
						if (!password.value) {
							showMsg("Enter a new password");
							return;
						}

						// send the password change request
						fetch("/api/auth/info/set?username=" + user.username, {
							credentials: "include",
							method: "POST",
							body: JSON.stringify({
								password: password.value,
								oldPassword: oldPassword.value
							})
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

							// clear the fields
							password.value = "";
							oldPassword.value = "";
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
			    password = _lifeLine$makeDom.password,
			    oldPassword = _lifeLine$makeDom.oldPassword,
			    msg = _lifeLine$makeDom.msg;

			// show a message


			var showMsg = function (text) {
				msg.innerText = text;
			};
		});
	}
});

},{}],8:[function(require,module,exports){
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
					modified: Date.now()
				};
			}

			// set the inital title
			setTitle("Editing");

			// save changes
			var change = function () {
				// update the modified date
				item.modified = Date.now();

				// parse the date
				item.date = new Date(item.date);

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

			// render the ui
			var mapped = lifeLine.makeDom({
				parent: content,
				tag: "form",
				children: [{
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
						widget: "input",
						bind: item,
						prop: "class",
						change: change
					}]
				}, {
					classes: "editor-row",
					children: [{
						widget: "input",
						type: "date",
						value: item.date.getFullYear() + "-" + pad(item.date.getMonth() + 1) + "-" + pad(item.date.getDate()),
						bind: item,
						prop: "date",
						change: change
					}, {
						widget: "input",
						type: "time",
						value: item.date.getHours() + ":" + pad(item.date.getMinutes()),
						bind: item,
						prop: "time",
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

},{"../data-store":2,"../util/date":5}],9:[function(require,module,exports){
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
						text: (0, _date.stringifyDate)(item.date, { includeTime: true, skipTimes: skipTimes })
					}]
				}, {
					classes: "assignment-description",
					text: item.description
				}]
			});
		}));
	}
});

},{"../data-store":2,"../util/date":5}],10:[function(require,module,exports){
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
	url: "/",
	title: "Today",
	createCtx: function () {
		return new Date();
	},
	// show all at reasonable number of incomplete assignments
	filter: function (item, today) {
		return !item.done && (0, _date.isSameDate)(today, item.date);
	}
}, {
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

			// sort the assingments
			data.sort(function (a, b) {
				// different dates
				if (a.date.getTime() != b.date.getTime()) {
					return a.date.getTime() - b.date.getTime();
				}

				// order by name
				if (a.name < b.name) return -1;
				if (a.name > b.name) return 1;

				return 0;
			});

			// the context for the filter function
			var ctx;

			if (match.createCtx) {
				ctx = match.createCtx();
			}

			// run the filter function
			data = data.filter(function (item) {
				return match.filter(item, ctx);
			});

			// make the groups
			var groups = {};

			// render the list
			data.forEach(function (item, i) {
				// get the header name
				var dateStr = (0, _date.stringifyDate)(item.date);

				// make sure the header exists
				groups[dateStr] || (groups[dateStr] = []);

				// add the item to the list
				var items = [{ text: item.name, grow: true }, item.class];

				// show the end time for any non 11:59pm times
				if (item.date.getHours() != 23 || item.date.getMinutes() != 59) {
					items.splice(1, 0, (0, _date.stringifyTime)(item.date));
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

},{"../data-store":2,"../util/date":5}],11:[function(require,module,exports){
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

},{}],12:[function(require,module,exports){
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

},{}],13:[function(require,module,exports){
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

},{}],14:[function(require,module,exports){
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

		// done put the literal undefined in if no value is given
		value || (value = "");

		var input = {
			tag: tag || "input",
			classes: classes || (tag == "textarea" ? "textarea" : "input") + "-fill",
			attrs: {
				placeholder: placeholder,
				type: type,
				value: value
			},
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

		// for textareas set innerText
		if (tag == "textarea") {
			input.text = value;
		}

		return input;
	}
});

},{}],15:[function(require,module,exports){
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

},{}],16:[function(require,module,exports){
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

},{}],17:[function(require,module,exports){
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

},{}],18:[function(require,module,exports){
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

},{}],19:[function(require,module,exports){
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

},{}],20:[function(require,module,exports){
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

},{"./disposable":18,"./event-emitter":19,"_process":1}]},{},[4])
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCJub2RlX21vZHVsZXMvcHJvY2Vzcy9icm93c2VyLmpzIiwic3JjXFxjbGllbnRcXGRhdGEtc3RvcmUuanMiLCJzcmNcXGNsaWVudFxcZ2xvYmFsLmpzIiwic3JjXFxjbGllbnRcXGluZGV4LmpzIiwic3JjXFxjbGllbnRcXHV0aWxcXGRhdGUuanMiLCJzcmNcXGNsaWVudFxcdXRpbFxcZG9tLW1ha2VyLmpzIiwic3JjXFxjbGllbnRcXHZpZXdzXFxhY2NvdW50LmpzIiwic3JjXFxjbGllbnRcXHZpZXdzXFxlZGl0LmpzIiwic3JjXFxjbGllbnRcXHZpZXdzXFxpdGVtLmpzIiwic3JjXFxjbGllbnRcXHZpZXdzXFxsaXN0cy5qcyIsInNyY1xcY2xpZW50XFx2aWV3c1xcbG9naW4uanMiLCJzcmNcXGNsaWVudFxcdmlld3NcXHVzZXJzLmpzIiwic3JjXFxjbGllbnRcXHdpZGdldHNcXGNvbnRlbnQuanMiLCJzcmNcXGNsaWVudFxcd2lkZ2V0c1xcaW5wdXQuanMiLCJzcmNcXGNsaWVudFxcd2lkZ2V0c1xcbGluay5qcyIsInNyY1xcY2xpZW50XFx3aWRnZXRzXFxsaXN0LmpzIiwic3JjXFxjbGllbnRcXHdpZGdldHNcXHNpZGViYXIuanMiLCJzcmNcXGNvbW1vblxcZGlzcG9zYWJsZS5qcyIsInNyY1xcY29tbW9uXFxldmVudC1lbWl0dGVyLmpzIiwic3JjXFxjb21tb25cXHNyY1xcY29tbW9uXFxnbG9iYWwuanMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7QUNBQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7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QVBNLElBT047QUFQTSxTQU9OO0FBQUE7O0FBQUEsMEJBQ2pCLFFBRGlCO0FBRXhCO0FBQ0EsU0FBRyxNQUFNLElBQU4sQ0FBVztBQUFBLGFBQVEsS0FBSyxTQUFMLElBQWtCLFFBQTFCO0FBQUEsTUFBWCxDQUFILEVBQW1EO0FBQ2xEO0FBQ0E7O0FBRUQ7QUFDQSwrQkFBWSxJQUFaO0FBUndCOztBQUFBO0FBQUE7QUFBQTs7QUFBQTtBQUN6QiwyQkFBb0IsS0FBSyxVQUFMLENBQWdCLElBQWhCLENBQXBCLG1JQUEyQztBQUFBLFVBQW5DLFFBQW1DOztBQUFBLHVCQUFuQyxRQUFtQzs7QUFBQSwrQkFHekM7QUFLRDtBQVR3QjtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBVXpCO0FBQ0Q7Ozs7OztrQkFsRW1CLFk7Ozs7OztBQ0FyQjs7Ozs7O0FBRUEsSUFBSSxXQUFXLDRCQUFmOztBQUVBO0FBUkE7Ozs7QUFTQSxTQUFTLElBQVQsR0FBZ0IsT0FBTyxPQUFQLElBQWtCLFFBQWxDO0FBQ0EsU0FBUyxPQUFULEdBQW1CLE9BQU8sTUFBUCxJQUFpQixRQUFwQzs7QUFFQTtBQUNBLFNBQVMsVUFBVCxHQUFzQixRQUFRLGNBQVIsRUFBd0IsT0FBOUM7QUFDQSxTQUFTLFlBQVQ7O0FBRUE7QUFDQSxDQUFDLFNBQVMsSUFBVCxHQUFnQixNQUFoQixHQUF5QixPQUExQixFQUFtQyxRQUFuQyxHQUE4QyxRQUE5QyIsImZpbGUiOiJnZW5lcmF0ZWQuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlc0NvbnRlbnQiOlsiKGZ1bmN0aW9uIGUodCxuLHIpe2Z1bmN0aW9uIHMobyx1KXtpZighbltvXSl7aWYoIXRbb10pe3ZhciBhPXR5cGVvZiByZXF1aXJlPT1cImZ1bmN0aW9uXCImJnJlcXVpcmU7aWYoIXUmJmEpcmV0dXJuIGEobywhMCk7aWYoaSlyZXR1cm4gaShvLCEwKTt2YXIgZj1uZXcgRXJyb3IoXCJDYW5ub3QgZmluZCBtb2R1bGUgJ1wiK28rXCInXCIpO3Rocm93IGYuY29kZT1cIk1PRFVMRV9OT1RfRk9VTkRcIixmfXZhciBsPW5bb109e2V4cG9ydHM6e319O3Rbb11bMF0uY2FsbChsLmV4cG9ydHMsZnVuY3Rpb24oZSl7dmFyIG49dFtvXVsxXVtlXTtyZXR1cm4gcyhuP246ZSl9LGwsbC5leHBvcnRzLGUsdCxuLHIpfXJldHVybiBuW29dLmV4cG9ydHN9dmFyIGk9dHlwZW9mIHJlcXVpcmU9PVwiZnVuY3Rpb25cIiYmcmVxdWlyZTtmb3IodmFyIG89MDtvPHIubGVuZ3RoO28rKylzKHJbb10pO3JldHVybiBzfSkiLCIvLyBzaGltIGZvciB1c2luZyBwcm9jZXNzIGluIGJyb3dzZXJcbnZhciBwcm9jZXNzID0gbW9kdWxlLmV4cG9ydHMgPSB7fTtcblxuLy8gY2FjaGVkIGZyb20gd2hhdGV2ZXIgZ2xvYmFsIGlzIHByZXNlbnQgc28gdGhhdCB0ZXN0IHJ1bm5lcnMgdGhhdCBzdHViIGl0XG4vLyBkb24ndCBicmVhayB0aGluZ3MuICBCdXQgd2UgbmVlZCB0byB3cmFwIGl0IGluIGEgdHJ5IGNhdGNoIGluIGNhc2UgaXQgaXNcbi8vIHdyYXBwZWQgaW4gc3RyaWN0IG1vZGUgY29kZSB3aGljaCBkb2Vzbid0IGRlZmluZSBhbnkgZ2xvYmFscy4gIEl0J3MgaW5zaWRlIGFcbi8vIGZ1bmN0aW9uIGJlY2F1c2UgdHJ5L2NhdGNoZXMgZGVvcHRpbWl6ZSBpbiBjZXJ0YWluIGVuZ2luZXMuXG5cbnZhciBjYWNoZWRTZXRUaW1lb3V0O1xudmFyIGNhY2hlZENsZWFyVGltZW91dDtcblxuZnVuY3Rpb24gZGVmYXVsdFNldFRpbW91dCgpIHtcbiAgICB0aHJvdyBuZXcgRXJyb3IoJ3NldFRpbWVvdXQgaGFzIG5vdCBiZWVuIGRlZmluZWQnKTtcbn1cbmZ1bmN0aW9uIGRlZmF1bHRDbGVhclRpbWVvdXQgKCkge1xuICAgIHRocm93IG5ldyBFcnJvcignY2xlYXJUaW1lb3V0IGhhcyBub3QgYmVlbiBkZWZpbmVkJyk7XG59XG4oZnVuY3Rpb24gKCkge1xuICAgIHRyeSB7XG4gICAgICAgIGlmICh0eXBlb2Ygc2V0VGltZW91dCA9PT0gJ2Z1bmN0aW9uJykge1xuICAgICAgICAgICAgY2FjaGVkU2V0VGltZW91dCA9IHNldFRpbWVvdXQ7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBjYWNoZWRTZXRUaW1lb3V0ID0gZGVmYXVsdFNldFRpbW91dDtcbiAgICAgICAgfVxuICAgIH0gY2F0Y2ggKGUpIHtcbiAgICAgICAgY2FjaGVkU2V0VGltZW91dCA9IGRlZmF1bHRTZXRUaW1vdXQ7XG4gICAgfVxuICAgIHRyeSB7XG4gICAgICAgIGlmICh0eXBlb2YgY2xlYXJUaW1lb3V0ID09PSAnZnVuY3Rpb24nKSB7XG4gICAgICAgICAgICBjYWNoZWRDbGVhclRpbWVvdXQgPSBjbGVhclRpbWVvdXQ7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBjYWNoZWRDbGVhclRpbWVvdXQgPSBkZWZhdWx0Q2xlYXJUaW1lb3V0O1xuICAgICAgICB9XG4gICAgfSBjYXRjaCAoZSkge1xuICAgICAgICBjYWNoZWRDbGVhclRpbWVvdXQgPSBkZWZhdWx0Q2xlYXJUaW1lb3V0O1xuICAgIH1cbn0gKCkpXG5mdW5jdGlvbiBydW5UaW1lb3V0KGZ1bikge1xuICAgIGlmIChjYWNoZWRTZXRUaW1lb3V0ID09PSBzZXRUaW1lb3V0KSB7XG4gICAgICAgIC8vbm9ybWFsIGVudmlyb21lbnRzIGluIHNhbmUgc2l0dWF0aW9uc1xuICAgICAgICByZXR1cm4gc2V0VGltZW91dChmdW4sIDApO1xuICAgIH1cbiAgICAvLyBpZiBzZXRUaW1lb3V0IHdhc24ndCBhdmFpbGFibGUgYnV0IHdhcyBsYXR0ZXIgZGVmaW5lZFxuICAgIGlmICgoY2FjaGVkU2V0VGltZW91dCA9PT0gZGVmYXVsdFNldFRpbW91dCB8fCAhY2FjaGVkU2V0VGltZW91dCkgJiYgc2V0VGltZW91dCkge1xuICAgICAgICBjYWNoZWRTZXRUaW1lb3V0ID0gc2V0VGltZW91dDtcbiAgICAgICAgcmV0dXJuIHNldFRpbWVvdXQoZnVuLCAwKTtcbiAgICB9XG4gICAgdHJ5IHtcbiAgICAgICAgLy8gd2hlbiB3aGVuIHNvbWVib2R5IGhhcyBzY3Jld2VkIHdpdGggc2V0VGltZW91dCBidXQgbm8gSS5FLiBtYWRkbmVzc1xuICAgICAgICByZXR1cm4gY2FjaGVkU2V0VGltZW91dChmdW4sIDApO1xuICAgIH0gY2F0Y2goZSl7XG4gICAgICAgIHRyeSB7XG4gICAgICAgICAgICAvLyBXaGVuIHdlIGFyZSBpbiBJLkUuIGJ1dCB0aGUgc2NyaXB0IGhhcyBiZWVuIGV2YWxlZCBzbyBJLkUuIGRvZXNuJ3QgdHJ1c3QgdGhlIGdsb2JhbCBvYmplY3Qgd2hlbiBjYWxsZWQgbm9ybWFsbHlcbiAgICAgICAgICAgIHJldHVybiBjYWNoZWRTZXRUaW1lb3V0LmNhbGwobnVsbCwgZnVuLCAwKTtcbiAgICAgICAgfSBjYXRjaChlKXtcbiAgICAgICAgICAgIC8vIHNhbWUgYXMgYWJvdmUgYnV0IHdoZW4gaXQncyBhIHZlcnNpb24gb2YgSS5FLiB0aGF0IG11c3QgaGF2ZSB0aGUgZ2xvYmFsIG9iamVjdCBmb3IgJ3RoaXMnLCBob3BmdWxseSBvdXIgY29udGV4dCBjb3JyZWN0IG90aGVyd2lzZSBpdCB3aWxsIHRocm93IGEgZ2xvYmFsIGVycm9yXG4gICAgICAgICAgICByZXR1cm4gY2FjaGVkU2V0VGltZW91dC5jYWxsKHRoaXMsIGZ1biwgMCk7XG4gICAgICAgIH1cbiAgICB9XG5cblxufVxuZnVuY3Rpb24gcnVuQ2xlYXJUaW1lb3V0KG1hcmtlcikge1xuICAgIGlmIChjYWNoZWRDbGVhclRpbWVvdXQgPT09IGNsZWFyVGltZW91dCkge1xuICAgICAgICAvL25vcm1hbCBlbnZpcm9tZW50cyBpbiBzYW5lIHNpdHVhdGlvbnNcbiAgICAgICAgcmV0dXJuIGNsZWFyVGltZW91dChtYXJrZXIpO1xuICAgIH1cbiAgICAvLyBpZiBjbGVhclRpbWVvdXQgd2Fzbid0IGF2YWlsYWJsZSBidXQgd2FzIGxhdHRlciBkZWZpbmVkXG4gICAgaWYgKChjYWNoZWRDbGVhclRpbWVvdXQgPT09IGRlZmF1bHRDbGVhclRpbWVvdXQgfHwgIWNhY2hlZENsZWFyVGltZW91dCkgJiYgY2xlYXJUaW1lb3V0KSB7XG4gICAgICAgIGNhY2hlZENsZWFyVGltZW91dCA9IGNsZWFyVGltZW91dDtcbiAgICAgICAgcmV0dXJuIGNsZWFyVGltZW91dChtYXJrZXIpO1xuICAgIH1cbiAgICB0cnkge1xuICAgICAgICAvLyB3aGVuIHdoZW4gc29tZWJvZHkgaGFzIHNjcmV3ZWQgd2l0aCBzZXRUaW1lb3V0IGJ1dCBubyBJLkUuIG1hZGRuZXNzXG4gICAgICAgIHJldHVybiBjYWNoZWRDbGVhclRpbWVvdXQobWFya2VyKTtcbiAgICB9IGNhdGNoIChlKXtcbiAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgIC8vIFdoZW4gd2UgYXJlIGluIEkuRS4gYnV0IHRoZSBzY3JpcHQgaGFzIGJlZW4gZXZhbGVkIHNvIEkuRS4gZG9lc24ndCAgdHJ1c3QgdGhlIGdsb2JhbCBvYmplY3Qgd2hlbiBjYWxsZWQgbm9ybWFsbHlcbiAgICAgICAgICAgIHJldHVybiBjYWNoZWRDbGVhclRpbWVvdXQuY2FsbChudWxsLCBtYXJrZXIpO1xuICAgICAgICB9IGNhdGNoIChlKXtcbiAgICAgICAgICAgIC8vIHNhbWUgYXMgYWJvdmUgYnV0IHdoZW4gaXQncyBhIHZlcnNpb24gb2YgSS5FLiB0aGF0IG11c3QgaGF2ZSB0aGUgZ2xvYmFsIG9iamVjdCBmb3IgJ3RoaXMnLCBob3BmdWxseSBvdXIgY29udGV4dCBjb3JyZWN0IG90aGVyd2lzZSBpdCB3aWxsIHRocm93IGEgZ2xvYmFsIGVycm9yLlxuICAgICAgICAgICAgLy8gU29tZSB2ZXJzaW9ucyBvZiBJLkUuIGhhdmUgZGlmZmVyZW50IHJ1bGVzIGZvciBjbGVhclRpbWVvdXQgdnMgc2V0VGltZW91dFxuICAgICAgICAgICAgcmV0dXJuIGNhY2hlZENsZWFyVGltZW91dC5jYWxsKHRoaXMsIG1hcmtlcik7XG4gICAgICAgIH1cbiAgICB9XG5cblxuXG59XG52YXIgcXVldWUgPSBbXTtcbnZhciBkcmFpbmluZyA9IGZhbHNlO1xudmFyIGN1cnJlbnRRdWV1ZTtcbnZhciBxdWV1ZUluZGV4ID0gLTE7XG5cbmZ1bmN0aW9uIGNsZWFuVXBOZXh0VGljaygpIHtcbiAgICBpZiAoIWRyYWluaW5nIHx8ICFjdXJyZW50UXVldWUpIHtcbiAgICAgICAgcmV0dXJuO1xuICAgIH1cbiAgICBkcmFpbmluZyA9IGZhbHNlO1xuICAgIGlmIChjdXJyZW50UXVldWUubGVuZ3RoKSB7XG4gICAgICAgIHF1ZXVlID0gY3VycmVudFF1ZXVlLmNvbmNhdChxdWV1ZSk7XG4gICAgfSBlbHNlIHtcbiAgICAgICAgcXVldWVJbmRleCA9IC0xO1xuICAgIH1cbiAgICBpZiAocXVldWUubGVuZ3RoKSB7XG4gICAgICAgIGRyYWluUXVldWUoKTtcbiAgICB9XG59XG5cbmZ1bmN0aW9uIGRyYWluUXVldWUoKSB7XG4gICAgaWYgKGRyYWluaW5nKSB7XG4gICAgICAgIHJldHVybjtcbiAgICB9XG4gICAgdmFyIHRpbWVvdXQgPSBydW5UaW1lb3V0KGNsZWFuVXBOZXh0VGljayk7XG4gICAgZHJhaW5pbmcgPSB0cnVlO1xuXG4gICAgdmFyIGxlbiA9IHF1ZXVlLmxlbmd0aDtcbiAgICB3aGlsZShsZW4pIHtcbiAgICAgICAgY3VycmVudFF1ZXVlID0gcXVldWU7XG4gICAgICAgIHF1ZXVlID0gW107XG4gICAgICAgIHdoaWxlICgrK3F1ZXVlSW5kZXggPCBsZW4pIHtcbiAgICAgICAgICAgIGlmIChjdXJyZW50UXVldWUpIHtcbiAgICAgICAgICAgICAgICBjdXJyZW50UXVldWVbcXVldWVJbmRleF0ucnVuKCk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgcXVldWVJbmRleCA9IC0xO1xuICAgICAgICBsZW4gPSBxdWV1ZS5sZW5ndGg7XG4gICAgfVxuICAgIGN1cnJlbnRRdWV1ZSA9IG51bGw7XG4gICAgZHJhaW5pbmcgPSBmYWxzZTtcbiAgICBydW5DbGVhclRpbWVvdXQodGltZW91dCk7XG59XG5cbnByb2Nlc3MubmV4dFRpY2sgPSBmdW5jdGlvbiAoZnVuKSB7XG4gICAgdmFyIGFyZ3MgPSBuZXcgQXJyYXkoYXJndW1lbnRzLmxlbmd0aCAtIDEpO1xuICAgIGlmIChhcmd1bWVudHMubGVuZ3RoID4gMSkge1xuICAgICAgICBmb3IgKHZhciBpID0gMTsgaSA8IGFyZ3VtZW50cy5sZW5ndGg7IGkrKykge1xuICAgICAgICAgICAgYXJnc1tpIC0gMV0gPSBhcmd1bWVudHNbaV07XG4gICAgICAgIH1cbiAgICB9XG4gICAgcXVldWUucHVzaChuZXcgSXRlbShmdW4sIGFyZ3MpKTtcbiAgICBpZiAocXVldWUubGVuZ3RoID09PSAxICYmICFkcmFpbmluZykge1xuICAgICAgICBydW5UaW1lb3V0KGRyYWluUXVldWUpO1xuICAgIH1cbn07XG5cbi8vIHY4IGxpa2VzIHByZWRpY3RpYmxlIG9iamVjdHNcbmZ1bmN0aW9uIEl0ZW0oZnVuLCBhcnJheSkge1xuICAgIHRoaXMuZnVuID0gZnVuO1xuICAgIHRoaXMuYXJyYXkgPSBhcnJheTtcbn1cbkl0ZW0ucHJvdG90eXBlLnJ1biA9IGZ1bmN0aW9uICgpIHtcbiAgICB0aGlzLmZ1bi5hcHBseShudWxsLCB0aGlzLmFycmF5KTtcbn07XG5wcm9jZXNzLnRpdGxlID0gJ2Jyb3dzZXInO1xucHJvY2Vzcy5icm93c2VyID0gdHJ1ZTtcbnByb2Nlc3MuZW52ID0ge307XG5wcm9jZXNzLmFyZ3YgPSBbXTtcbnByb2Nlc3MudmVyc2lvbiA9ICcnOyAvLyBlbXB0eSBzdHJpbmcgdG8gYXZvaWQgcmVnZXhwIGlzc3Vlc1xucHJvY2Vzcy52ZXJzaW9ucyA9IHt9O1xuXG5mdW5jdGlvbiBub29wKCkge31cblxucHJvY2Vzcy5vbiA9IG5vb3A7XG5wcm9jZXNzLmFkZExpc3RlbmVyID0gbm9vcDtcbnByb2Nlc3Mub25jZSA9IG5vb3A7XG5wcm9jZXNzLm9mZiA9IG5vb3A7XG5wcm9jZXNzLnJlbW92ZUxpc3RlbmVyID0gbm9vcDtcbnByb2Nlc3MucmVtb3ZlQWxsTGlzdGVuZXJzID0gbm9vcDtcbnByb2Nlc3MuZW1pdCA9IG5vb3A7XG5cbnByb2Nlc3MuYmluZGluZyA9IGZ1bmN0aW9uIChuYW1lKSB7XG4gICAgdGhyb3cgbmV3IEVycm9yKCdwcm9jZXNzLmJpbmRpbmcgaXMgbm90IHN1cHBvcnRlZCcpO1xufTtcblxucHJvY2Vzcy5jd2QgPSBmdW5jdGlvbiAoKSB7IHJldHVybiAnLycgfTtcbnByb2Nlc3MuY2hkaXIgPSBmdW5jdGlvbiAoZGlyKSB7XG4gICAgdGhyb3cgbmV3IEVycm9yKCdwcm9jZXNzLmNoZGlyIGlzIG5vdCBzdXBwb3J0ZWQnKTtcbn07XG5wcm9jZXNzLnVtYXNrID0gZnVuY3Rpb24oKSB7IHJldHVybiAwOyB9O1xuIiwiLyoqXHJcbiAqIFdvcmsgd2l0aCBkYXRhIHN0b3Jlc1xyXG4gKi9cclxuXHJcbmNvbnN0IERFQk9VTkNFX1RJTUUgPSAyMDAwO1xyXG5jb25zdCBEQVRBX1NUT1JFX1JPT1QgPSBcIi9hcGkvZGF0YS9cIjtcclxuXHJcbi8vIGNhY2hlIGRhdGEgc3RvcmUgaW5zdGFuY2VzXHJcbnZhciBzdG9yZXMgPSB7fTtcclxuXHJcbi8vIGdldC9jcmVhdGUgYSBkYXRhc3RvcmVcclxuZXhwb3J0IGZ1bmN0aW9uIHN0b3JlKG5hbWUpIHtcclxuXHQvLyB1c2UgdGhlIGNhY2hlZCBzdG9yZVxyXG5cdGlmKG5hbWUgaW4gc3RvcmVzKSB7XHJcblx0XHRyZXR1cm4gc3RvcmVzW25hbWVdO1xyXG5cdH1cclxuXHJcblx0dmFyIHN0b3JlID0gbmV3IFN0b3JlKG5hbWUpO1xyXG5cclxuXHQvLyBjYWNoZSB0aGUgZGF0YSBzdG9yZSBpbnN0YW5jZVxyXG5cdHN0b3Jlc1tuYW1lXSA9IHN0b3JlO1xyXG5cclxuXHRyZXR1cm4gc3RvcmU7XHJcbn07XHJcblxyXG5jbGFzcyBTdG9yZSBleHRlbmRzIGxpZmVMaW5lLkV2ZW50RW1pdHRlciB7XHJcblx0Y29uc3RydWN0b3IobmFtZSkge1xyXG5cdFx0c3VwZXIoKTtcclxuXHRcdHRoaXMubmFtZSA9IG5hbWU7XHJcblx0XHR0aGlzLl9jYWNoZSA9IHt9O1xyXG5cdFx0Ly8gZG9uJ3Qgc2VuZCBkdXBsaWNhdGUgcmVxdWVzdHNcclxuXHRcdHRoaXMuX3JlcXVlc3RpbmcgPSBbXTtcclxuXHR9XHJcblxyXG5cdC8vIHNldCB0aGUgZnVuY3Rpb24gdG8gZGVzZXJpYWxpemUgYWxsIGRhdGEgZnJvbSB0aGUgc2VydmVyXHJcblx0c2V0SW5pdChmbikge1xyXG5cdFx0dGhpcy5fZGVzZXJpYWxpemVyID0gZm47XHJcblx0fVxyXG5cclxuXHQvLyBzZW5kIGEgcmVxdWVzdCB0byB0aGUgc2VydmVyXHJcblx0X3JlcXVlc3QobWV0aG9kLCB1cmwsIGJvZHkpIHtcclxuXHRcdHVybCA9IERBVEFfU1RPUkVfUk9PVCArIHVybDtcclxuXHJcblx0XHQvLyBkb24ndCBkdXBsaWNhdGUgcmVxdWVzdHNcclxuXHRcdGlmKG1ldGhvZCA9PSBcImdldFwiKSB7XHJcblx0XHRcdC8vIGFscmVhZHkgbWFraW5nIHRoaXMgcmVxdWVzdFxyXG5cdFx0XHRpZih0aGlzLl9yZXF1ZXN0aW5nLmluZGV4T2YodXJsKSAhPT0gLTEpIHJldHVybjtcclxuXHJcblx0XHRcdHRoaXMuX3JlcXVlc3RpbmcucHVzaCh1cmwpO1xyXG5cdFx0fVxyXG5cclxuXHRcdC8vIG1ha2UgdGhlIGFjdHVhbCByZXF1ZXN0XHJcblx0XHRyZXR1cm4gZmV0Y2godXJsLCB7XHJcblx0XHRcdG1ldGhvZDogbWV0aG9kLFxyXG5cdFx0XHRjcmVkZW50aWFsczogXCJpbmNsdWRlXCIsXHJcblx0XHRcdGJvZHk6IGJvZHkgJiYgSlNPTi5zdHJpbmdpZnkoYm9keSlcclxuXHRcdH0pXHJcblxyXG5cdFx0Ly8gcGFyc2UgdGhlIHJlc3BvbnNlXHJcblx0XHQudGhlbihyZXMgPT4gcmVzLmpzb24oKSlcclxuXHJcblx0XHQudGhlbihyZXMgPT4ge1xyXG5cdFx0XHQvLyByZW1vdmUgdGhlIGxvY2tcclxuXHRcdFx0aWYobWV0aG9kID09IFwiZ2V0XCIpIHtcclxuXHRcdFx0XHR2YXIgaW5kZXggPSB0aGlzLl9yZXF1ZXN0aW5nLmluZGV4T2YodXJsKTtcclxuXHJcblx0XHRcdFx0aWYoaW5kZXggIT09IC0xKSB0aGlzLl9yZXF1ZXN0aW5nLnNwbGljZShpbmRleCwgMSk7XHJcblx0XHRcdH1cclxuXHJcblx0XHRcdC8vIHVwZGF0ZSB0aGUgY2FjaGUgYW5kIGVtaXQgYSBjaGFuZ2VcclxuXHRcdFx0aWYocmVzLnN0YXR1cyA9PSBcInN1Y2Nlc3NcIiAmJiBtZXRob2QgPT0gXCJnZXRcIikge1xyXG5cdFx0XHRcdC8vIHN0b3JlIHRoZSB2YWx1ZSBpbiB0aGUgY2FjaGVcclxuXHRcdFx0XHRpZihBcnJheS5pc0FycmF5KHJlcy5kYXRhKSkge1xyXG5cdFx0XHRcdFx0cmVzLmRhdGEuZm9yRWFjaChpdGVtID0+IHtcclxuXHRcdFx0XHRcdFx0Ly8gZGVzZXJpYWxpemUgdGhlIGl0ZW1cclxuXHRcdFx0XHRcdFx0aWYodGhpcy5fZGVzZXJpYWxpemVyKSB7XHJcblx0XHRcdFx0XHRcdFx0aXRlbSA9IHRoaXMuX2Rlc2VyaWFsaXplcihpdGVtKSB8fCBpdGVtO1xyXG5cdFx0XHRcdFx0XHR9XHJcblxyXG5cdFx0XHRcdFx0XHQvLyBzdG9yZSB0ZWggaXRlbVxyXG5cdFx0XHRcdFx0XHR0aGlzLl9jYWNoZVtpdGVtLmlkXSA9IGl0ZW1cclxuXHRcdFx0XHRcdH0pO1xyXG5cdFx0XHRcdH1cclxuXHRcdFx0XHRlbHNlIHtcclxuXHRcdFx0XHRcdGxldCBpdGVtID0gcmVzLmRhdGE7XHJcblxyXG5cdFx0XHRcdFx0Ly8gZGVzZXJpYWxpemUgdGhlIGl0ZW1cclxuXHRcdFx0XHRcdGlmKHRoaXMuX2Rlc2VyaWFsaXplcikge1xyXG5cdFx0XHRcdFx0XHRpdGVtID0gdGhpcy5fZGVzZXJpYWxpemVyKGl0ZW0pIHx8IGl0ZW07XHJcblx0XHRcdFx0XHR9XHJcblxyXG5cdFx0XHRcdFx0dGhpcy5fY2FjaGVbcmVzLmRhdGEuaWRdID0gaXRlbTtcclxuXHRcdFx0XHR9XHJcblxyXG5cdFx0XHRcdC8vIGVtaXQgYSBjaGFuZ2VcclxuXHRcdFx0XHR0aGlzLmVtaXQoXCJjaGFuZ2VcIik7XHJcblx0XHRcdH1cclxuXHJcblx0XHRcdC8vIHRocm93IHRoZSBlcnJvclxyXG5cdFx0XHRpZihyZXMuc3RhdHVzID09IFwiZXJyb3JcIikge1xyXG5cdFx0XHRcdHRocm93IG5ldyBFcnJvcihyZXMuZGF0YSk7XHJcblx0XHRcdH1cclxuXHJcblx0XHRcdC8vIHRoZSB1c2VyIGlzIG5vdCBsb2dnZWQgaW5cclxuXHRcdFx0aWYocmVzLnN0YXR1cyA9PSBcImZhaWxcIiAmJiByZXMuZGF0YS5yZWFzb24gPT0gXCJsb2dnZWQtb3V0XCIpIHtcclxuXHRcdFx0XHRsaWZlTGluZS5uYXYubmF2aWdhdGUoXCIvbG9naW5cIik7XHJcblx0XHRcdH1cclxuXHRcdH0pO1xyXG5cdH1cclxuXHJcblx0Ly8gZ2V0IGFsbCB0aGUgaXRlbXMgYW5kIGxpc3RlbiBmb3IgYW55IGNoYW5nZXNcclxuXHRnZXRBbGwoZm4pIHtcclxuXHRcdC8vIGdvIHRvIHRoZSBjYWNoZSBmaXJzdFxyXG5cdFx0Zm4oYXJyYXlGcm9tT2JqZWN0KHRoaXMuX2NhY2hlKSk7XHJcblxyXG5cdFx0Ly8gc2VuZCBhIHJlcXVlc3QgdG8gdGhlIHNlcnZlciBmb3IgdGhlIGl0ZW1zXHJcblx0XHR0aGlzLl9yZXF1ZXN0KFwiZ2V0XCIsIHRoaXMubmFtZSk7XHJcblxyXG5cdFx0Ly8gbGlzdGVuIGZvciBhbnkgY2hhbmdlc1xyXG5cdFx0cmV0dXJuIHRoaXMub24oXCJjaGFuZ2VcIiwgKCkgPT4ge1xyXG5cdFx0XHQvLyB0aGUgY2hhbmdlcyB3aWxsIHdlIGluIHRoZSBjYWNoZVxyXG5cdFx0XHRmbihhcnJheUZyb21PYmplY3QodGhpcy5fY2FjaGUpKTtcclxuXHRcdH0pO1xyXG5cdH1cclxuXHJcblx0Ly8gZ2V0IGEgc2luZ2xlIGl0ZW0gYW5kIGxpc3RlbiBmb3IgY2hhbmdlc1xyXG5cdGdldChpZCwgZm4pIHtcclxuXHRcdC8vIGdvIHRvIHRoZSBjYWNoZSBmaXJzdFxyXG5cdFx0Zm4odGhpcy5fY2FjaGVbaWRdKTtcclxuXHJcblx0XHQvLyBzZW5kIGEgcmVxdWVzdCB0byB0aGUgc2VydmVyIGZvciB0aGUgaXRlbVxyXG5cdFx0dGhpcy5fcmVxdWVzdChcImdldFwiLCB0aGlzLm5hbWUgKyBcIi9cIiArIGlkKTtcclxuXHJcblx0XHQvLyBsaXN0ZW4gZm9yIGFueSBjaGFuZ2VzXHJcblx0XHRyZXR1cm4gdGhpcy5vbihcImNoYW5nZVwiLCAoKSA9PiB7XHJcblx0XHRcdGZuKHRoaXMuX2NhY2hlW2lkXSk7XHJcblx0XHR9KTtcclxuXHR9XHJcblxyXG5cdC8vIHN0b3JlIGEgdmFsdWUgaW4gdGhlIHN0b3JlXHJcblx0c2V0KHZhbHVlLCBza2lwcykge1xyXG5cdFx0Ly8gc3RvcmUgdGhlIHZhbHVlIGluIHRoZSBjYWNoZVxyXG5cdFx0dGhpcy5fY2FjaGVbdmFsdWUuaWRdID0gdmFsdWU7XHJcblxyXG5cdFx0Ly8gc2F2ZSB0aGUgaXRlbVxyXG5cdFx0ZGVib3VuY2UodmFsdWUuaWQsICgpID0+IHtcclxuXHRcdFx0dGhpcy5fcmVxdWVzdChcInB1dFwiLCBgJHt0aGlzLm5hbWV9LyR7dmFsdWUuaWR9YCwgdmFsdWUpO1xyXG5cdFx0fSk7XHJcblxyXG5cdFx0Ly8gZW1pdCBhIGNoYW5nZVxyXG5cdFx0dGhpcy5wYXJ0aWFsRW1pdChcImNoYW5nZVwiLCBza2lwcyk7XHJcblx0fVxyXG5cclxuXHQvLyByZW1vdmUgYSB2YWx1ZSBmcm9tIHRoZSBzdG9yZVxyXG5cdHJlbW92ZShpZCwgc2tpcHMpIHtcclxuXHRcdC8vIHJlbW92ZSB0aGUgdmFsdWUgZnJvbSB0aGUgY2FjaGVcclxuXHRcdGRlbGV0ZSB0aGlzLl9jYWNoZVtpZF07XHJcblxyXG5cdFx0Ly8gc2VuZCB0aGUgZGVsZXRlIHJlcXVlc3RcclxuXHRcdHRoaXMuX3JlcXVlc3QoXCJkZWxldGVcIiwgYCR7dGhpcy5uYW1lfS8ke2lkfWApO1xyXG5cclxuXHRcdC8vIGVtaXQgYSBjaGFuZ2VcclxuXHRcdHRoaXMucGFydGlhbEVtaXQoXCJjaGFuZ2VcIiwgc2tpcHMpO1xyXG5cdH1cclxufVxyXG5cclxuLy8gZ2V0IGFuIGFycmF5IGZyb20gYW4gb2JqZWN0XHJcbnZhciBhcnJheUZyb21PYmplY3QgPSBmdW5jdGlvbihvYmopIHtcclxuXHRyZXR1cm4gT2JqZWN0LmdldE93blByb3BlcnR5TmFtZXMob2JqKVxyXG5cdFx0Lm1hcChuYW1lID0+IG9ialtuYW1lXSk7XHJcbn07XHJcblxyXG4vLyBkb24ndCBjYWxsIGEgZnVuY3Rpb24gdG9vIG9mdGVuXHJcbnZhciBkZWJvdW5jZVRpbWVycyA9IHt9O1xyXG5cclxudmFyIGRlYm91bmNlID0gKGlkLCBmbikgPT4ge1xyXG5cdC8vIGNhbmNlbCB0aGUgcHJldmlvdXMgZGVsYXlcclxuXHRjbGVhclRpbWVvdXQoZGVib3VuY2VUaW1lcnNbaWRdKTtcclxuXHQvLyBzdGFydCBhIG5ldyBkZWxheVxyXG5cdGRlYm91bmNlVGltZXJzW2lkXSA9IHNldFRpbWVvdXQoZm4sIERFQk9VTkNFX1RJTUUpO1xyXG59O1xyXG4iLCIvKipcclxuICogQnJvd3NlciBzcGVjaWZpYyBnbG9iYWxzXHJcbiAqL1xyXG5cclxubGlmZUxpbmUubWFrZURvbSA9IHJlcXVpcmUoXCIuL3V0aWwvZG9tLW1ha2VyXCIpLmRlZmF1bHQ7XHJcblxyXG4vLyBhZGQgYSBmdW5jdGlvbiBmb3IgYWRkaW5nIGFjdGlvbnNcclxubGlmZUxpbmUuYWRkQWN0aW9uID0gZnVuY3Rpb24obmFtZSwgZm4pIHtcclxuXHQvLyBhdHRhY2ggdGhlIGNhbGxiYWNrXHJcblx0dmFyIGxpc3RlbmVyID0gbGlmZUxpbmUub24oXCJhY3Rpb24tZXhlYy1cIiArIG5hbWUsIGZuKTtcclxuXHJcblx0Ly8gaW5mb3JtIGFueSBhY3Rpb24gcHJvdmlkZXJzXHJcblx0bGlmZUxpbmUuZW1pdChcImFjdGlvbi1jcmVhdGVcIiwgbmFtZSk7XHJcblxyXG5cdC8vIGFsbCBhY3Rpb25zIHJlbW92ZWRcclxuXHR2YXIgcmVtb3ZlQWxsID0gbGlmZUxpbmUub24oXCJhY3Rpb24tcmVtb3ZlLWFsbFwiLCAoKSA9PiB7XHJcblx0XHQvLyByZW1vdmUgdGhlIGFjdGlvbiBsaXN0ZW5lclxyXG5cdFx0bGlzdGVuZXIudW5zdWJzY3JpYmUoKTtcclxuXHRcdHJlbW92ZUFsbC51bnN1YnNjcmliZSgpO1xyXG5cdH0pO1xyXG5cclxuXHRyZXR1cm4ge1xyXG5cdFx0dW5zdWJzY3JpYmUoKSB7XHJcblx0XHRcdC8vIHJlbW92ZSB0aGUgYWN0aW9uIGxpc3RlbmVyXHJcblx0XHRcdGxpc3RlbmVyLnVuc3Vic2NyaWJlKCk7XHJcblx0XHRcdHJlbW92ZUFsbC51bnN1YnNjcmliZSgpO1xyXG5cclxuXHRcdFx0Ly8gaW5mb3JtIGFueSBhY3Rpb24gcHJvdmlkZXJzXHJcblx0XHRcdGxpZmVMaW5lLmVtaXQoXCJhY3Rpb24tcmVtb3ZlXCIsIG5hbWUpO1xyXG5cdFx0fVxyXG5cdH07XHJcbn07XHJcbiIsIi8vIGNyZWF0ZSB0aGUgZ2xvYmFsIG9iamVjdFxyXG5pbXBvcnQgXCIuLi9jb21tb24vZ2xvYmFsXCI7XHJcbmltcG9ydCBcIi4vZ2xvYmFsXCI7XHJcblxyXG4vLyBsb2FkIGFsbCB0aGUgd2lkZ2V0c1xyXG5pbXBvcnQgXCIuL3dpZGdldHMvc2lkZWJhclwiO1xyXG5pbXBvcnQgXCIuL3dpZGdldHMvY29udGVudFwiO1xyXG5pbXBvcnQgXCIuL3dpZGdldHMvbGlua1wiO1xyXG5pbXBvcnQgXCIuL3dpZGdldHMvbGlzdFwiO1xyXG5pbXBvcnQgXCIuL3dpZGdldHMvaW5wdXRcIjtcclxuXHJcbi8vIGxvYWQgYWxsIHRoZSB2aWV3c1xyXG5pbXBvcnQge2luaXROYXZCYXJ9IGZyb20gXCIuL3ZpZXdzL2xpc3RzXCI7XHJcbmltcG9ydCBcIi4vdmlld3MvaXRlbVwiO1xyXG5pbXBvcnQgXCIuL3ZpZXdzL2VkaXRcIjtcclxuaW1wb3J0IFwiLi92aWV3cy9sb2dpblwiO1xyXG5pbXBvcnQgXCIuL3ZpZXdzL2FjY291bnRcIjtcclxuaW1wb3J0IFwiLi92aWV3cy91c2Vyc1wiO1xyXG5cclxuLy8gc2V0IHVwIHRoZSBkYXRhIHN0b3JlXHJcbmltcG9ydCB7c3RvcmV9IGZyb20gXCIuL2RhdGEtc3RvcmVcIjtcclxuXHJcbnN0b3JlKFwiYXNzaWdubWVudHNcIikuc2V0SW5pdChmdW5jdGlvbihpdGVtKSB7XHJcblx0Ly8gcGFyc2UgdGhlIGRhdGVcclxuXHRpZih0eXBlb2YgaXRlbS5kYXRlID09IFwic3RyaW5nXCIpIHtcclxuXHRcdGl0ZW0uZGF0ZSA9IG5ldyBEYXRlKGl0ZW0uZGF0ZSk7XHJcblx0fVxyXG59KTtcclxuXHJcbi8vIGluc3RhbnRpYXRlIHRoZSBkb21cclxubGlmZUxpbmUubWFrZURvbSh7XHJcblx0cGFyZW50OiBkb2N1bWVudC5ib2R5LFxyXG5cdGdyb3VwOiBbXHJcblx0XHR7IHdpZGdldDogXCJzaWRlYmFyXCIgfSxcclxuXHRcdHsgd2lkZ2V0OiBcImNvbnRlbnRcIiB9XHJcblx0XVxyXG59KTtcclxuXHJcbi8vIGFkZCBsaXN0IHZpZXdzIHRvIHRoZSBuYXZiYXJcclxuaW5pdE5hdkJhcigpO1xyXG5cclxuLy8gY3JlYXRlIGEgbmV3IGFzc2lnbm1lbnRcclxubGlmZUxpbmUuYWRkQ29tbWFuZChcIk5ldyBhc3NpZ25tZW50XCIsICgpID0+IHtcclxuXHR2YXIgaWQgPSBNYXRoLmZsb29yKE1hdGgucmFuZG9tKCkgKiAxMDAwMDAwMDApO1xyXG5cclxuXHRsaWZlTGluZS5uYXYubmF2aWdhdGUoXCIvZWRpdC9cIiArIGlkKTtcclxufSk7XHJcblxyXG4vLyBjcmVhdGUgdGhlIGxvZ291dCBidXR0b25cclxubGlmZUxpbmUuYWRkTmF2Q29tbWFuZChcIkFjY291bnRcIiwgXCIvYWNjb3VudFwiKTtcclxuIiwiLyoqXHJcbiAqIERhdGUgcmVsYXRlZCB0b29sc1xyXG4gKi9cclxuXHJcbiAvLyBjaGVjayBpZiB0aGUgZGF0ZXMgYXJlIHRoZSBzYW1lIGRheVxyXG4gZXhwb3J0IGZ1bmN0aW9uIGlzU2FtZURhdGUoZGF0ZTEsIGRhdGUyKSB7XHJcbiBcdHJldHVybiBkYXRlMS5nZXRGdWxsWWVhcigpID09IGRhdGUyLmdldEZ1bGxZZWFyKCkgJiZcclxuIFx0XHRkYXRlMS5nZXRNb250aCgpID09IGRhdGUyLmdldE1vbnRoKCkgJiZcclxuIFx0XHRkYXRlMS5nZXREYXRlKCkgPT0gZGF0ZTIuZ2V0RGF0ZSgpO1xyXG4gfTtcclxuXHJcbiAvLyBjaGVjayBpZiBhIGRhdGUgaXMgbGVzcyB0aGFuIGFub3RoZXJcclxuIGV4cG9ydCBmdW5jdGlvbiBpc1Nvb25lckRhdGUoZGF0ZTEsIGRhdGUyKSB7XHJcbiBcdHJldHVybiBkYXRlMS5nZXRGdWxsWWVhcigpIDw9IGRhdGUyLmdldEZ1bGxZZWFyKCkgJiZcclxuIFx0XHRkYXRlMS5nZXRNb250aCgpIDw9IGRhdGUyLmdldE1vbnRoKCkgJiZcclxuIFx0XHRkYXRlMS5nZXREYXRlKCkgPCBkYXRlMi5nZXREYXRlKCk7XHJcbiB9O1xyXG5cclxuIC8vIGdldCB0aGUgZGF0ZSBkYXlzIGZyb20gbm93XHJcbiBleHBvcnQgZnVuY3Rpb24gZGF5c0Zyb21Ob3coZGF5cykge1xyXG4gXHR2YXIgZGF0ZSA9IG5ldyBEYXRlKCk7XHJcblxyXG4gXHQvLyBhZHZhbmNlIHRoZSBkYXRlXHJcbiBcdGRhdGUuc2V0RGF0ZShkYXRlLmdldERhdGUoKSArIGRheXMpO1xyXG5cclxuIFx0cmV0dXJuIGRhdGU7XHJcbiB9O1xyXG5cclxuIGNvbnN0IFNUUklOR19EQVlTID0gW1wiU3VuZGF5XCIsIFwiTW9uZGF5XCIsIFwiVHVlc2RheVwiLCBcIldlZGVuc2RheVwiLCBcIlRodXJzZGF5XCIsIFwiRnJpZGF5XCIsIFwiU2F0dXJkYXlcIl07XHJcblxyXG4gLy8gY29udmVydCBhIGRhdGUgdG8gYSBzdHJpbmdcclxuIGV4cG9ydCBmdW5jdGlvbiBzdHJpbmdpZnlEYXRlKGRhdGUsIG9wdHMgPSB7fSkge1xyXG5cdCB2YXIgc3RyRGF0ZSwgc3RyVGltZSA9IFwiXCI7XHJcblxyXG4gICAgIC8vIGNoZWNrIGlmIHRoZSBkYXRlIGlzIGJlZm9yZSB0b2RheVxyXG4gICAgIHZhciBiZWZvcmVOb3cgPSBkYXRlLmdldFRpbWUoKSA8IERhdGUubm93KCk7XHJcblxyXG4gXHQvLyBUb2RheVxyXG4gXHRpZihpc1NhbWVEYXRlKGRhdGUsIG5ldyBEYXRlKCkpKVxyXG4gXHRcdHN0ckRhdGUgPSBcIlRvZGF5XCI7XHJcblxyXG4gXHQvLyBUb21vcnJvd1xyXG4gXHRlbHNlIGlmKGlzU2FtZURhdGUoZGF0ZSwgZGF5c0Zyb21Ob3coMSkpICYmICFiZWZvcmVOb3cpXHJcbiBcdFx0c3RyRGF0ZSA9IFwiVG9tb3Jyb3dcIjtcclxuXHJcbiBcdC8vIGRheSBvZiB0aGUgd2VlayAodGhpcyB3ZWVrKVxyXG4gXHRlbHNlIGlmKGlzU29vbmVyRGF0ZShkYXRlLCBkYXlzRnJvbU5vdyg3KSkgJiYgIWJlZm9yZU5vdylcclxuIFx0XHRzdHJEYXRlID0gU1RSSU5HX0RBWVNbZGF0ZS5nZXREYXkoKV07XHJcblxyXG4gXHQvLyBwcmludCB0aGUgZGF0ZVxyXG4gXHRlbHNlXHJcblx0IFx0c3RyRGF0ZSA9IGAke1NUUklOR19EQVlTW2RhdGUuZ2V0RGF5KCldfSAke2RhdGUuZ2V0TW9udGgoKSArIDF9LyR7ZGF0ZS5nZXREYXRlKCl9YDtcclxuXHJcblx0Ly8gYWRkIHRoZSB0aW1lIG9uXHJcblx0aWYob3B0cy5pbmNsdWRlVGltZSAmJiAhaXNTa2lwVGltZShkYXRlLCBvcHRzLnNraXBUaW1lcykpIHtcclxuXHRcdHJldHVybiBzdHJEYXRlICsgXCIsIFwiICsgc3RyaW5naWZ5VGltZShkYXRlKTtcclxuXHR9XHJcblxyXG5cdHJldHVybiBzdHJEYXRlO1xyXG4gfTtcclxuXHJcbi8vIGNoZWNrIGlmIHRoaXMgaXMgb25lIG9mIHRoZSBnaXZlbiBza2lwIHRpbWVzXHJcbmV4cG9ydCBmdW5jdGlvbiBpc1NraXBUaW1lKGRhdGUsIHNraXBzID0gW10pIHtcclxuXHRyZXR1cm4gc2tpcHMuZmluZChza2lwID0+IHtcclxuXHRcdHJldHVybiBza2lwLmhvdXIgPT09IGRhdGUuZ2V0SG91cnMoKSAmJiBza2lwLm1pbnV0ZSA9PT0gZGF0ZS5nZXRNaW51dGVzKCk7XHJcblx0fSk7XHJcbn07XHJcblxyXG4vLyBjb252ZXJ0IGEgdGltZSB0byBhIHN0cmluZ1xyXG5leHBvcnQgZnVuY3Rpb24gc3RyaW5naWZ5VGltZShkYXRlKSB7XHJcblx0dmFyIGhvdXIgPSBkYXRlLmdldEhvdXJzKCk7XHJcblxyXG5cdC8vIGdldCB0aGUgYW0vcG0gdGltZVxyXG5cdHZhciBpc0FtID0gaG91ciA8IDEyO1xyXG5cclxuXHQvLyBtaWRuaWdodFxyXG5cdGlmKGhvdXIgPT09IDApIGhvdXIgPSAxMjtcclxuXHQvLyBhZnRlciBub29uXHJcblx0aWYoaG91ciA+IDEyKSBob3VyID0gaG91ciAtIDEyO1xyXG5cclxuXHR2YXIgbWludXRlID0gZGF0ZS5nZXRNaW51dGVzKCk7XHJcblxyXG5cdC8vIGFkZCBhIGxlYWRpbmcgMFxyXG5cdGlmKG1pbnV0ZSA8IDEwKSBtaW51dGUgPSBcIjBcIiArIG1pbnV0ZTtcclxuXHJcblx0cmV0dXJuIGhvdXIgKyBcIjpcIiArIG1pbnV0ZSArIChpc0FtID8gXCJhbVwiIDogXCJwbVwiKTtcclxufVxyXG4iLCIvKipcclxuICogQSBoZWxwZXIgZm9yIGJ1aWxkaW5nIGRvbSBub2Rlc1xyXG4gKi9cclxuXHJcbmNvbnN0IFNWR19FTEVNRU5UUyA9IFtcInN2Z1wiLCBcImxpbmVcIl07XHJcbmNvbnN0IFNWR19OQU1FU1BBQ0UgPSBcImh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnXCI7XHJcblxyXG4vLyBidWlsZCBhIHNpbmdsZSBkb20gbm9kZVxyXG52YXIgbWFrZURvbSA9IGZ1bmN0aW9uKG9wdHMgPSB7fSkge1xyXG5cdC8vIGdldCBvciBjcmVhdGUgdGhlIG5hbWUgbWFwcGluZ1xyXG5cdHZhciBtYXBwZWQgPSBvcHRzLm1hcHBlZCB8fCB7fTtcclxuXHJcblx0dmFyICRlbDtcclxuXHJcblx0Ly8gdGhlIGVsZW1lbnQgaXMgcGFydCBvZiB0aGUgc3ZnIG5hbWVzcGFjZVxyXG5cdGlmKFNWR19FTEVNRU5UUy5pbmRleE9mKG9wdHMudGFnKSAhPT0gLTEpIHtcclxuXHRcdCRlbCA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnROUyhTVkdfTkFNRVNQQUNFLCBvcHRzLnRhZyk7XHJcblx0fVxyXG5cdC8vIGEgcGxhaW4gZWxlbWVudFxyXG5cdGVsc2Uge1xyXG5cdFx0JGVsID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudChvcHRzLnRhZyB8fCBcImRpdlwiKTtcclxuXHR9XHJcblxyXG5cdC8vIHNldCB0aGUgY2xhc3Nlc1xyXG5cdGlmKG9wdHMuY2xhc3Nlcykge1xyXG5cdFx0JGVsLnNldEF0dHJpYnV0ZShcImNsYXNzXCIsIHR5cGVvZiBvcHRzLmNsYXNzZXMgPT0gXCJzdHJpbmdcIiA/IG9wdHMuY2xhc3NlcyA6IG9wdHMuY2xhc3Nlcy5qb2luKFwiIFwiKSk7XHJcblx0fVxyXG5cclxuXHQvLyBhdHRhY2ggdGhlIGF0dHJpYnV0ZXNcclxuXHRpZihvcHRzLmF0dHJzKSB7XHJcblx0XHRPYmplY3QuZ2V0T3duUHJvcGVydHlOYW1lcyhvcHRzLmF0dHJzKVxyXG5cclxuXHRcdC5mb3JFYWNoKGF0dHIgPT4gJGVsLnNldEF0dHJpYnV0ZShhdHRyLCBvcHRzLmF0dHJzW2F0dHJdKSk7XHJcblx0fVxyXG5cclxuXHQvLyBzZXQgdGhlIHRleHQgY29udGVudFxyXG5cdGlmKG9wdHMudGV4dCkge1xyXG5cdFx0JGVsLmlubmVyVGV4dCA9IG9wdHMudGV4dDtcclxuXHR9XHJcblxyXG5cdC8vIGF0dGFjaCB0aGUgbm9kZSB0byBpdHMgcGFyZW50XHJcblx0aWYob3B0cy5wYXJlbnQpIHtcclxuXHRcdG9wdHMucGFyZW50Lmluc2VydEJlZm9yZSgkZWwsIG9wdHMuYmVmb3JlKTtcclxuXHR9XHJcblxyXG5cdC8vIGFkZCBldmVudCBsaXN0ZW5lcnNcclxuXHRpZihvcHRzLm9uKSB7XHJcblx0XHRmb3IobGV0IG5hbWUgb2YgT2JqZWN0LmdldE93blByb3BlcnR5TmFtZXMob3B0cy5vbikpIHtcclxuXHRcdFx0JGVsLmFkZEV2ZW50TGlzdGVuZXIobmFtZSwgb3B0cy5vbltuYW1lXSk7XHJcblxyXG5cdFx0XHQvLyBhdHRhY2ggdGhlIGRvbSB0byBhIGRpc3Bvc2FibGVcclxuXHRcdFx0aWYob3B0cy5kaXNwKSB7XHJcblx0XHRcdFx0b3B0cy5kaXNwLmFkZCh7XHJcblx0XHRcdFx0XHR1bnN1YnNjcmliZTogKCkgPT4gJGVsLnJlbW92ZUV2ZW50TGlzdGVuZXIobmFtZSwgb3B0cy5vbltuYW1lXSlcclxuXHRcdFx0XHR9KTtcclxuXHRcdFx0fVxyXG5cdFx0fVxyXG5cdH1cclxuXHJcblx0Ly8gc2V0IHRoZSB2YWx1ZSBvZiBhbiBpbnB1dCBlbGVtZW50XHJcblx0aWYob3B0cy52YWx1ZSkge1xyXG5cdFx0JGVsLnZhbHVlID0gb3B0cy52YWx1ZTtcclxuXHR9XHJcblxyXG5cdC8vIGFkZCB0aGUgbmFtZSBtYXBwaW5nXHJcblx0aWYob3B0cy5uYW1lKSB7XHJcblx0XHRtYXBwZWRbb3B0cy5uYW1lXSA9ICRlbDtcclxuXHR9XHJcblxyXG5cdC8vIGNyZWF0ZSB0aGUgY2hpbGQgZG9tIG5vZGVzXHJcblx0aWYob3B0cy5jaGlsZHJlbikge1xyXG5cdFx0Zm9yKGxldCBjaGlsZCBvZiBvcHRzLmNoaWxkcmVuKSB7XHJcblx0XHRcdC8vIG1ha2UgYW4gYXJyYXkgaW50byBhIGdyb3VwIE9iamVjdFxyXG5cdFx0XHRpZihBcnJheS5pc0FycmF5KGNoaWxkKSkge1xyXG5cdFx0XHRcdGNoaWxkID0ge1xyXG5cdFx0XHRcdFx0Z3JvdXA6IGNoaWxkXHJcblx0XHRcdFx0fTtcclxuXHRcdFx0fVxyXG5cclxuXHRcdFx0Ly8gYXR0YWNoIGluZm9ybWF0aW9uIGZvciB0aGUgZ3JvdXBcclxuXHRcdFx0Y2hpbGQucGFyZW50ID0gJGVsO1xyXG5cdFx0XHRjaGlsZC5kaXNwID0gb3B0cy5kaXNwO1xyXG5cdFx0XHRjaGlsZC5tYXBwZWQgPSBtYXBwZWQ7XHJcblxyXG5cdFx0XHQvLyBidWlsZCB0aGUgbm9kZSBvciBncm91cFxyXG5cdFx0XHRtYWtlKGNoaWxkKTtcclxuXHRcdH1cclxuXHR9XHJcblxyXG5cdHJldHVybiBtYXBwZWQ7XHJcbn1cclxuXHJcbi8vIGJ1aWxkIGEgZ3JvdXAgb2YgZG9tIG5vZGVzXHJcbnZhciBtYWtlR3JvdXAgPSBmdW5jdGlvbihncm91cCkge1xyXG5cdC8vIHNob3J0aGFuZCBmb3IgYSBncm91cHNcclxuXHRpZihBcnJheS5pc0FycmF5KGdyb3VwKSkge1xyXG5cdFx0Z3JvdXAgPSB7XHJcblx0XHRcdGNoaWxkcmVuOiBncm91cFxyXG5cdFx0fTtcclxuXHR9XHJcblxyXG5cdC8vIGdldCBvciBjcmVhdGUgdGhlIG5hbWUgbWFwcGluZ1xyXG5cdHZhciBtYXBwZWQgPSB7fTtcclxuXHJcblx0Zm9yKGxldCBub2RlIG9mIGdyb3VwLmdyb3VwKSB7XHJcblx0XHQvLyBjb3B5IG92ZXIgcHJvcGVydGllcyBmcm9tIHRoZSBncm91cFxyXG5cdFx0bm9kZS5wYXJlbnQgfHwgKG5vZGUucGFyZW50ID0gZ3JvdXAucGFyZW50KTtcclxuXHRcdG5vZGUuZGlzcCB8fCAobm9kZS5kaXNwID0gZ3JvdXAuZGlzcCk7XHJcblx0XHRub2RlLm1hcHBlZCA9IG1hcHBlZDtcclxuXHJcblx0XHQvLyBtYWtlIHRoZSBkb21cclxuXHRcdG1ha2Uobm9kZSk7XHJcblx0fVxyXG5cclxuXHQvLyBjYWxsIHRoZSBjYWxsYmFjayB3aXRoIHRoZSBtYXBwZWQgbmFtZXNcclxuXHRpZihncm91cC5iaW5kKSB7XHJcblx0XHR2YXIgc3Vic2NyaXB0aW9uID0gZ3JvdXAuYmluZChtYXBwZWQpO1xyXG5cclxuXHRcdC8vIGlmIHRoZSByZXR1cm4gYSBzdWJzY3JpcHRpb24gYXR0YWNoIGl0IHRvIHRoZSBkaXNwb3NhYmxlXHJcblx0XHRpZihzdWJzY3JpcHRpb24gJiYgZ3JvdXAuZGlzcCkge1xyXG5cdFx0XHRncm91cC5kaXNwLmFkZChzdWJzY3JpcHRpb24pO1xyXG5cdFx0fVxyXG5cdH1cclxuXHJcblx0cmV0dXJuIG1hcHBlZDtcclxufTtcclxuXHJcbi8vIGEgY29sbGVjdGlvbiBvZiB3aWRnZXRzXHJcbnZhciB3aWRnZXRzID0ge307XHJcblxyXG5leHBvcnQgZGVmYXVsdCBmdW5jdGlvbiBtYWtlKG9wdHMpIHtcclxuXHQvLyBoYW5kbGUgYSBncm91cFxyXG5cdGlmKEFycmF5LmlzQXJyYXkob3B0cykgfHwgb3B0cy5ncm91cCkge1xyXG5cdFx0cmV0dXJuIG1ha2VHcm91cChvcHRzKTtcclxuXHR9XHJcblx0Ly8gbWFrZSBhIHdpZGdldFxyXG5cdGVsc2UgaWYob3B0cy53aWRnZXQpIHtcclxuXHRcdHZhciB3aWRnZXQgPSB3aWRnZXRzW29wdHMud2lkZ2V0XTtcclxuXHJcblx0XHQvLyBub3QgZGVmaW5lZFxyXG5cdFx0aWYoIXdpZGdldCkge1xyXG5cdFx0XHR0aHJvdyBuZXcgRXJyb3IoYFdpZGdldCAnJHtvcHRzLndpZGdldH0nIGlzIG5vdCBkZWZpbmVkIG1ha2Ugc3VyZSBpdHMgYmVlbiBpbXBvcnRlZGApO1xyXG5cdFx0fVxyXG5cclxuXHRcdC8vIGdlbmVyYXRlIHRoZSB3aWRnZXQgY29udGVudFxyXG5cdFx0dmFyIGJ1aWx0ID0gd2lkZ2V0Lm1ha2Uob3B0cyk7XHJcblxyXG5cdFx0cmV0dXJuIG1ha2VHcm91cCh7XHJcblx0XHRcdHBhcmVudDogb3B0cy5wYXJlbnQsXHJcblx0XHRcdGRpc3A6IG9wdHMuZGlzcCxcclxuXHRcdFx0Z3JvdXA6IEFycmF5LmlzQXJyYXkoYnVpbHQpID8gYnVpbHQgOiBbYnVpbHRdLFxyXG5cdFx0XHRiaW5kOiB3aWRnZXQuYmluZCAmJiB3aWRnZXQuYmluZC5iaW5kKHdpZGdldCwgb3B0cylcclxuXHRcdH0pO1xyXG5cdH1cclxuXHQvLyBtYWtlIGEgc2luZ2xlIG5vZGVcclxuXHRlbHNlIHtcclxuXHRcdHJldHVybiBtYWtlRG9tKG9wdHMpO1xyXG5cdH1cclxufTtcclxuXHJcbi8vIHJlZ2lzdGVyIGEgd2lkZ2V0XHJcbm1ha2UucmVnaXN0ZXIgPSBmdW5jdGlvbihuYW1lLCB3aWRnZXQpIHtcclxuXHR3aWRnZXRzW25hbWVdID0gd2lkZ2V0O1xyXG59O1xyXG4iLCIvKipcclxuICogQSB2aWV3IGZvciBhY2Nlc3NpbmcvbW9kaWZ5aW5nIGluZm9ybWF0aW9uIGFib3V0IHRoZSBjdXJyZW50IHVzZXJcclxuICovXHJcblxyXG5saWZlTGluZS5uYXYucmVnaXN0ZXIoe1xyXG5cdG1hdGNoZXI6IC9eKD86XFwvdXNlclxcLyguKz8pfFxcL2FjY291bnQpJC8sXHJcblxyXG5cdG1ha2Uoe3NldFRpdGxlLCBjb250ZW50LCBtYXRjaH0pIHtcclxuXHRcdHNldFRpdGxlKFwiQWNjb3VudFwiKTtcclxuXHJcblx0XHR2YXIgdXJsID0gXCIvYXBpL2F1dGgvaW5mby9nZXRcIjtcclxuXHJcblx0XHQvLyBhZGQgdGhlIHVzZXJuYW1lIGlmIG9uZSBpcyBnaXZlblxyXG5cdFx0aWYobWF0Y2hbMV0pIHVybCArPSBgP3VzZXJuYW1lPSR7bWF0Y2hbMV19YDtcclxuXHJcblx0XHQvLyBsb2FkIHRoZSB1c2VyIGRhdGFcclxuXHRcdGZldGNoKHVybCwgeyBjcmVkZW50aWFsczogXCJpbmNsdWRlXCIgfSlcclxuXHJcblx0XHQudGhlbihyZXMgPT4gcmVzLmpzb24oKSlcclxuXHJcblx0XHQudGhlbihyZXMgPT4ge1xyXG5cdFx0XHQvLyBubyBzdWNoIHVzZXIgb3IgYWNjZXNzIGlzIGRlbmllZFxyXG5cdFx0XHRpZihyZXMuc3RhdHVzID09IFwiZmFpbFwiKSB7XHJcblx0XHRcdFx0bGlmZUxpbmUubWFrZURvbSh7XHJcblx0XHRcdFx0XHRwYXJlbnQ6IGNvbnRlbnQsXHJcblx0XHRcdFx0XHRjbGFzc2VzOiBcImNvbnRlbnQtcGFkZGVkXCIsXHJcblx0XHRcdFx0XHR0ZXh0OiBcIkNvdWxkIG5vdCBhY2Nlc3MgdGhlIHVzZXIgeW91IHdlcmUgbG9va2luZyBmb3JcIlxyXG5cdFx0XHRcdH0pO1xyXG5cclxuXHRcdFx0XHRyZXR1cm47XHJcblx0XHRcdH1cclxuXHJcblx0XHRcdHZhciB1c2VyID0gcmVzLmRhdGE7XHJcblxyXG5cdFx0XHQvLyBnZW5lcmF0ZSB0aGUgcGFnZVxyXG5cdFx0XHR2YXIgY2hpbGRyZW4gPSBbXTtcclxuXHJcblx0XHRcdGNoaWxkcmVuLnB1c2goe1xyXG5cdFx0XHRcdHRhZzogXCJoMlwiLFxyXG5cdFx0XHRcdHRleHQ6IHVzZXIudXNlcm5hbWVcclxuXHRcdFx0fSk7XHJcblxyXG5cdFx0XHQvLyBkaXNwbGF5IHRoZSBhZG1pbiBzdGF0dXMgb2YgYW5vdGhlciB1c2VyXHJcblx0XHRcdGlmKG1hdGNoWzFdKSB7XHJcblx0XHRcdFx0Y2hpbGRyZW4ucHVzaCh7XHJcblx0XHRcdFx0XHR0ZXh0OiBgJHt1c2VyLnVzZXJuYW1lfSBpcyAke3VzZXIuYWRtaW4gPyBcIlwiIDogXCJub3RcIn0gYW4gYWRtaW5gXHJcblx0XHRcdFx0fSk7XHJcblx0XHRcdH1cclxuXHRcdFx0Ly8gZGlzcGxheSB0aGUgYWRtaW4gc3RhdHVzIG9mIHRoaXMgdXNlclxyXG5cdFx0XHRlbHNlIHtcclxuXHRcdFx0XHRjaGlsZHJlbi5wdXNoKHtcclxuXHRcdFx0XHRcdHRleHQ6IGBZb3UgYXJlICR7dXNlci5hZG1pbiA/IFwiXCIgOiBcIm5vdFwifSBhbiBhZG1pbmBcclxuXHRcdFx0XHR9KTtcclxuXHJcblx0XHRcdFx0Ly8gYWRkIGEgbGluayBhdCBhIGxpc3Qgb2YgYWxsIHVzZXJzXHJcblx0XHRcdFx0aWYodXNlci5hZG1pbikge1xyXG5cdFx0XHRcdFx0Y2hpbGRyZW4ucHVzaCh7IHRhZzogXCJiclwiIH0pO1xyXG5cclxuXHRcdFx0XHRcdGNoaWxkcmVuLnB1c2goe1xyXG5cdFx0XHRcdFx0XHR3aWRnZXQ6IFwibGlua1wiLFxyXG5cdFx0XHRcdFx0XHRocmVmOiBcIi91c2Vyc1wiLFxyXG5cdFx0XHRcdFx0XHR0ZXh0OiBcIlZpZXcgYWxsIHVzZXJzXCJcclxuXHRcdFx0XHRcdH0pO1xyXG5cdFx0XHRcdH1cclxuXHRcdFx0fVxyXG5cclxuXHRcdFx0Y2hpbGRyZW4ucHVzaCh7XHJcblx0XHRcdFx0dGFnOiBcImZvcm1cIixcclxuXHRcdFx0XHRjaGlsZHJlbjogW1xyXG5cdFx0XHRcdFx0e1xyXG5cdFx0XHRcdFx0XHRjbGFzc2VzOiBcImVkaXRvci1yb3dcIixcclxuXHRcdFx0XHRcdFx0Y2hpbGRyZW46IFtcclxuXHRcdFx0XHRcdFx0XHR7XHJcblx0XHRcdFx0XHRcdFx0XHR0YWc6IFwiaW5wdXRcIixcclxuXHRcdFx0XHRcdFx0XHRcdGNsYXNzZXM6IFwiaW5wdXQtZmlsbFwiLFxyXG5cdFx0XHRcdFx0XHRcdFx0YXR0cnM6IHtcclxuXHRcdFx0XHRcdFx0XHRcdFx0dHlwZTogXCJwYXNzd29yZFwiLFxyXG5cdFx0XHRcdFx0XHRcdFx0XHRwbGFjZWhvbGRlcjogXCJPbGQgcGFzc3dvcmRcIlxyXG5cdFx0XHRcdFx0XHRcdFx0fSxcclxuXHRcdFx0XHRcdFx0XHRcdG5hbWU6IFwib2xkUGFzc3dvcmRcIlxyXG5cdFx0XHRcdFx0XHRcdH0sXHJcblx0XHRcdFx0XHRcdFx0e1xyXG5cdFx0XHRcdFx0XHRcdFx0dGFnOiBcImlucHV0XCIsXHJcblx0XHRcdFx0XHRcdFx0XHRjbGFzc2VzOiBcImlucHV0LWZpbGxcIixcclxuXHRcdFx0XHRcdFx0XHRcdGF0dHJzOiB7XHJcblx0XHRcdFx0XHRcdFx0XHRcdHR5cGU6IFwicGFzc3dvcmRcIixcclxuXHRcdFx0XHRcdFx0XHRcdFx0cGxhY2Vob2xkZXI6IFwiTmV3IHBhc3N3b3JkXCJcclxuXHRcdFx0XHRcdFx0XHRcdH0sXHJcblx0XHRcdFx0XHRcdFx0XHRuYW1lOiBcInBhc3N3b3JkXCJcclxuXHRcdFx0XHRcdFx0XHR9XHJcblx0XHRcdFx0XHRcdF1cclxuXHRcdFx0XHRcdH0sXHJcblx0XHRcdFx0XHR7XHJcblx0XHRcdFx0XHRcdHRhZzogXCJidXR0b25cIixcclxuXHRcdFx0XHRcdFx0Y2xhc3NlczogXCJmYW5jeS1idXR0b25cIixcclxuXHRcdFx0XHRcdFx0dGV4dDogXCJDaGFuZ2UgcGFzc3dvcmRcIixcclxuXHRcdFx0XHRcdFx0YXR0cnM6IHtcclxuXHRcdFx0XHRcdFx0XHR0eXBlOiBcInN1Ym1pdFwiXHJcblx0XHRcdFx0XHRcdH1cclxuXHRcdFx0XHRcdH0sXHJcblx0XHRcdFx0XHR7XHJcblx0XHRcdFx0XHRcdG5hbWU6IFwibXNnXCJcclxuXHRcdFx0XHRcdH1cclxuXHRcdFx0XHRdLFxyXG5cdFx0XHRcdG9uOiB7XHJcblx0XHRcdFx0XHQvLyBjaGFuZ2UgdGhlIHBhc3N3b3JkXHJcblx0XHRcdFx0XHRzdWJtaXQ6IGUgPT4ge1xyXG5cdFx0XHRcdFx0XHRlLnByZXZlbnREZWZhdWx0KCk7XHJcblxyXG5cdFx0XHRcdFx0XHQvLyBubyBwYXNzd29yZCBzdXBwbGllZFxyXG5cdFx0XHRcdFx0XHRpZighcGFzc3dvcmQudmFsdWUpIHtcclxuXHRcdFx0XHRcdFx0XHRzaG93TXNnKFwiRW50ZXIgYSBuZXcgcGFzc3dvcmRcIik7XHJcblx0XHRcdFx0XHRcdFx0cmV0dXJuO1xyXG5cdFx0XHRcdFx0XHR9XHJcblxyXG5cdFx0XHRcdFx0XHQvLyBzZW5kIHRoZSBwYXNzd29yZCBjaGFuZ2UgcmVxdWVzdFxyXG5cdFx0XHRcdFx0XHRmZXRjaChgL2FwaS9hdXRoL2luZm8vc2V0P3VzZXJuYW1lPSR7dXNlci51c2VybmFtZX1gLCB7XHJcblx0XHRcdFx0XHRcdFx0Y3JlZGVudGlhbHM6IFwiaW5jbHVkZVwiLFxyXG5cdFx0XHRcdFx0XHRcdG1ldGhvZDogXCJQT1NUXCIsXHJcblx0XHRcdFx0XHRcdFx0Ym9keTogSlNPTi5zdHJpbmdpZnkoe1xyXG5cdFx0XHRcdFx0XHRcdFx0cGFzc3dvcmQ6IHBhc3N3b3JkLnZhbHVlLFxyXG5cdFx0XHRcdFx0XHRcdFx0b2xkUGFzc3dvcmQ6IG9sZFBhc3N3b3JkLnZhbHVlXHJcblx0XHRcdFx0XHRcdFx0fSlcclxuXHRcdFx0XHRcdFx0fSlcclxuXHJcblx0XHRcdFx0XHRcdC50aGVuKHJlcyA9PiByZXMuanNvbigpKVxyXG5cclxuXHRcdFx0XHRcdFx0LnRoZW4ocmVzID0+IHtcclxuXHRcdFx0XHRcdFx0XHQvLyBwYXNzd29yZCBjaGFuZ2UgZmFpbGVkXHJcblx0XHRcdFx0XHRcdFx0aWYocmVzLnN0YXR1cyA9PSBcImZhaWxcIikge1xyXG5cdFx0XHRcdFx0XHRcdFx0c2hvd01zZyhyZXMuZGF0YS5tc2cpO1xyXG5cdFx0XHRcdFx0XHRcdH1cclxuXHJcblx0XHRcdFx0XHRcdFx0aWYocmVzLnN0YXR1cyA9PSBcInN1Y2Nlc3NcIikge1xyXG5cdFx0XHRcdFx0XHRcdFx0c2hvd01zZyhcIlBhc3N3b3JkIGNoYW5nZWRcIik7XHJcblx0XHRcdFx0XHRcdFx0fVxyXG5cclxuXHRcdFx0XHRcdFx0XHQvLyBjbGVhciB0aGUgZmllbGRzXHJcblx0XHRcdFx0XHRcdFx0cGFzc3dvcmQudmFsdWUgPSBcIlwiO1xyXG5cdFx0XHRcdFx0XHRcdG9sZFBhc3N3b3JkLnZhbHVlID0gXCJcIjtcclxuXHRcdFx0XHRcdFx0fSk7XHJcblx0XHRcdFx0XHR9XHJcblx0XHRcdFx0fVxyXG5cdFx0XHR9KTtcclxuXHJcblx0XHRcdGNoaWxkcmVuLnB1c2goeyB0YWc6IFwiYnJcIiB9KTtcclxuXHRcdFx0Y2hpbGRyZW4ucHVzaCh7IHRhZzogXCJiclwiIH0pO1xyXG5cclxuXHRcdFx0Ly8gb25seSBkaXNwbGF5IHRoZSBsb2dvdXQgYnV0dG9uIGlmIHdlIGFyZSBvbiB0aGUgL2FjY291bnQgcGFnZVxyXG5cdFx0XHRpZighbWF0Y2hbMV0pIHtcclxuXHRcdFx0XHRjaGlsZHJlbi5wdXNoKHtcclxuXHRcdFx0XHRcdHRhZzogXCJidXR0b25cIixcclxuXHRcdFx0XHRcdGNsYXNzZXM6IFwiZmFuY3ktYnV0dG9uXCIsXHJcblx0XHRcdFx0XHR0ZXh0OiBcIkxvZ291dFwiLFxyXG5cdFx0XHRcdFx0b246IHtcclxuXHRcdFx0XHRcdFx0Y2xpY2s6ICgpID0+IHtcclxuXHRcdFx0XHRcdFx0XHQvLyBzZW5kIHRoZSBsb2dvdXQgcmVxdWVzdFxyXG5cdFx0XHRcdFx0XHRcdGZldGNoKFwiL2FwaS9hdXRoL2xvZ291dFwiLCB7IGNyZWRlbnRpYWxzOiBcImluY2x1ZGVcIiB9KVxyXG5cclxuXHRcdFx0XHRcdFx0XHQvLyByZXR1cm4gdG8gdGhlIGxvZ2luIHBhZ2VcclxuXHRcdFx0XHRcdFx0XHQudGhlbigoKSA9PiBsaWZlTGluZS5uYXYubmF2aWdhdGUoXCIvbG9naW5cIikpO1xyXG5cdFx0XHRcdFx0XHR9XHJcblx0XHRcdFx0XHR9XHJcblx0XHRcdFx0fSk7XHJcblx0XHRcdH1cclxuXHJcblx0XHRcdHZhciB7cGFzc3dvcmQsIG9sZFBhc3N3b3JkLCBtc2d9ID0gbGlmZUxpbmUubWFrZURvbSh7XHJcblx0XHRcdFx0cGFyZW50OiBjb250ZW50LFxyXG5cdFx0XHRcdGNsYXNzZXM6IFwiY29udGVudC1wYWRkZWRcIixcclxuXHRcdFx0XHRjaGlsZHJlblxyXG5cdFx0XHR9KTtcclxuXHJcblx0XHRcdC8vIHNob3cgYSBtZXNzYWdlXHJcblx0XHRcdHZhciBzaG93TXNnID0gZnVuY3Rpb24odGV4dCkge1xyXG5cdFx0XHRcdG1zZy5pbm5lclRleHQgPSB0ZXh0O1xyXG5cdFx0XHR9O1xyXG5cdFx0fSlcclxuXHR9XHJcbn0pO1xyXG4iLCIvKipcclxuICogRWRpdCBhbiBhc3NpZ25lbW50XHJcbiAqL1xyXG5cclxuaW1wb3J0IHtkYXlzRnJvbU5vdywgc3RyaW5naWZ5RGF0ZX0gZnJvbSBcIi4uL3V0aWwvZGF0ZVwiO1xyXG5pbXBvcnQge3N0b3JlfSBmcm9tIFwiLi4vZGF0YS1zdG9yZVwiO1xyXG5cclxudmFyIGFzc2lnbm1lbnRzID0gc3RvcmUoXCJhc3NpZ25tZW50c1wiKTtcclxuXHJcbmxpZmVMaW5lLm5hdi5yZWdpc3Rlcih7XHJcblx0bWF0Y2hlcjogL15cXC9lZGl0XFwvKC4rPykkLyxcclxuXHJcblx0bWFrZSh7bWF0Y2gsIGNvbnRlbnQsIHNldFRpdGxlLCBkaXNwb3NhYmxlfSkge1xyXG5cdFx0dmFyIGFjdGlvblN1YiwgZGVsZXRlU3ViO1xyXG5cclxuXHRcdHZhciBjaGFuZ2VTdWIgPSBhc3NpZ25tZW50cy5nZXQobWF0Y2hbMV0sIGZ1bmN0aW9uKGl0ZW0pIHtcclxuXHRcdFx0Ly8gY2xlYXIgdGhlIGNvbnRlbnRcclxuXHRcdFx0Y29udGVudC5pbm5lckhUTUwgPSBcIlwiO1xyXG5cclxuXHRcdFx0Ly8gcmVtb3ZlIHRoZSBwcmV2aW91cyBhY3Rpb25cclxuXHRcdFx0aWYoYWN0aW9uU3ViKSB7XHJcblx0XHRcdFx0YWN0aW9uU3ViLnVuc3Vic2NyaWJlKCk7XHJcblx0XHRcdFx0ZGVsZXRlU3ViLnVuc3Vic2NyaWJlKCk7XHJcblx0XHRcdH1cclxuXHJcblx0XHRcdC8vIGFkZCBhIGJ1dHRvbiBiYWNrIHRvIHRoZSB2aWV3XHJcblx0XHRcdGlmKGl0ZW0pIHtcclxuXHRcdFx0XHRhY3Rpb25TdWIgPSBsaWZlTGluZS5hZGRBY3Rpb24oXCJWaWV3XCIsICgpID0+IGxpZmVMaW5lLm5hdi5uYXZpZ2F0ZShcIi9pdGVtL1wiICsgaXRlbS5pZCkpO1xyXG5cclxuXHRcdFx0XHRkZWxldGVTdWIgPSBsaWZlTGluZS5hZGRBY3Rpb24oXCJEZWxldGVcIiwgKCkgPT4ge1xyXG5cdFx0XHRcdFx0Ly8gcmVtb3ZlIHRoZSBpdGVtXHJcblx0XHRcdFx0XHRhc3NpZ25tZW50cy5yZW1vdmUoaXRlbS5pZCk7XHJcblxyXG5cdFx0XHRcdFx0Ly8gbmF2aWdhdGUgYXdheVxyXG5cdFx0XHRcdFx0bGlmZUxpbmUubmF2Lm5hdmlnYXRlKFwiL1wiKTtcclxuXHRcdFx0XHR9KTtcclxuXHRcdFx0fVxyXG5cclxuXHRcdFx0Ly8gaWYgdGhlIGl0ZW0gZG9lcyBub3QgZXhpc3QgY3JlYXRlIGl0XHJcblx0XHRcdGlmKCFpdGVtKSB7XHJcblx0XHRcdFx0aXRlbSA9IHtcclxuXHRcdFx0XHRcdG5hbWU6IFwiVW5uYW1lZCBpdGVtXCIsXHJcblx0XHRcdFx0XHRjbGFzczogXCJDbGFzc1wiLFxyXG5cdFx0XHRcdFx0ZGF0ZTogZ2VuRGF0ZSgpLFxyXG5cdFx0XHRcdFx0aWQ6IG1hdGNoWzFdLFxyXG5cdFx0XHRcdFx0ZGVzY3JpcHRpb246IFwiXCIsXHJcblx0XHRcdFx0XHRtb2RpZmllZDogRGF0ZS5ub3coKVxyXG5cdFx0XHRcdH07XHJcblx0XHRcdH1cclxuXHJcblx0XHRcdC8vIHNldCB0aGUgaW5pdGFsIHRpdGxlXHJcblx0XHRcdHNldFRpdGxlKFwiRWRpdGluZ1wiKTtcclxuXHJcblx0XHRcdC8vIHNhdmUgY2hhbmdlc1xyXG5cdFx0XHR2YXIgY2hhbmdlID0gKCkgPT4ge1xyXG5cdFx0XHRcdC8vIHVwZGF0ZSB0aGUgbW9kaWZpZWQgZGF0ZVxyXG5cdFx0XHRcdGl0ZW0ubW9kaWZpZWQgPSBEYXRlLm5vdygpO1xyXG5cclxuXHRcdFx0XHQvLyBwYXJzZSB0aGUgZGF0ZVxyXG5cdFx0XHRcdGl0ZW0uZGF0ZSA9IG5ldyBEYXRlKGl0ZW0uZGF0ZSk7XHJcblxyXG5cdFx0XHRcdC8vIGFkZCBhIGJ1dHRvbiBiYWNrIHRvIHRoZSB2aWV3XHJcblx0XHRcdFx0aWYoIWFjdGlvblN1Yikge1xyXG5cdFx0XHRcdFx0YWN0aW9uU3ViID0gbGlmZUxpbmUuYWRkQWN0aW9uKFwiVmlld1wiLCAoKSA9PiBsaWZlTGluZS5uYXYubmF2aWdhdGUoXCIvaXRlbS9cIiArIGl0ZW0uaWQpKTtcclxuXHJcblx0XHRcdFx0XHRkZWxldGVTdWIgPSBsaWZlTGluZS5hZGRBY3Rpb24oXCJEZWxldGVcIiwgKCkgPT4ge1xyXG5cdFx0XHRcdFx0XHQvLyByZW1vdmUgdGhlIGl0ZW1cclxuXHRcdFx0XHRcdFx0YXNzaWdubWVudHMucmVtb3ZlKGl0ZW0uaWQpO1xyXG5cclxuXHRcdFx0XHRcdFx0Ly8gbmF2aWdhdGUgYXdheVxyXG5cdFx0XHRcdFx0XHRsaWZlTGluZS5uYXYubmF2aWdhdGUoXCIvXCIpO1xyXG5cdFx0XHRcdFx0fSk7XHJcblx0XHRcdFx0fVxyXG5cclxuXHRcdFx0XHQvLyBzYXZlIHRoZSBjaGFuZ2VzXHJcblx0XHRcdFx0YXNzaWdubWVudHMuc2V0KGl0ZW0sIGNoYW5nZVN1Yik7XHJcblx0XHRcdH07XHJcblxyXG5cdFx0XHQvLyByZW5kZXIgdGhlIHVpXHJcblx0XHRcdHZhciBtYXBwZWQgPSBsaWZlTGluZS5tYWtlRG9tKHtcclxuXHRcdFx0XHRwYXJlbnQ6IGNvbnRlbnQsXHJcblx0XHRcdFx0dGFnOiBcImZvcm1cIixcclxuXHRcdFx0XHRjaGlsZHJlbjogW1xyXG5cdFx0XHRcdFx0e1xyXG5cdFx0XHRcdFx0XHRjbGFzc2VzOiBcImVkaXRvci1yb3dcIixcclxuXHRcdFx0XHRcdFx0Y2hpbGRyZW46IFtcclxuXHRcdFx0XHRcdFx0XHR7XHJcblx0XHRcdFx0XHRcdFx0XHR3aWRnZXQ6IFwiaW5wdXRcIixcclxuXHRcdFx0XHRcdFx0XHRcdGJpbmQ6IGl0ZW0sXHJcblx0XHRcdFx0XHRcdFx0XHRwcm9wOiBcIm5hbWVcIixcclxuXHRcdFx0XHRcdFx0XHRcdGNoYW5nZVxyXG5cdFx0XHRcdFx0XHRcdH1cclxuXHRcdFx0XHRcdFx0XVxyXG5cdFx0XHRcdFx0fSxcclxuXHRcdFx0XHRcdHtcclxuXHRcdFx0XHRcdFx0Y2xhc3NlczogXCJlZGl0b3Itcm93XCIsXHJcblx0XHRcdFx0XHRcdGNoaWxkcmVuOiBbXHJcblx0XHRcdFx0XHRcdFx0e1xyXG5cdFx0XHRcdFx0XHRcdFx0d2lkZ2V0OiBcImlucHV0XCIsXHJcblx0XHRcdFx0XHRcdFx0XHRiaW5kOiBpdGVtLFxyXG5cdFx0XHRcdFx0XHRcdFx0cHJvcDogXCJjbGFzc1wiLFxyXG5cdFx0XHRcdFx0XHRcdFx0Y2hhbmdlXHJcblx0XHRcdFx0XHRcdFx0fVxyXG5cdFx0XHRcdFx0XHRdXHJcblx0XHRcdFx0XHR9LFxyXG5cdFx0XHRcdFx0e1xyXG5cdFx0XHRcdFx0XHRjbGFzc2VzOiBcImVkaXRvci1yb3dcIixcclxuXHRcdFx0XHRcdFx0Y2hpbGRyZW46IFtcclxuXHRcdFx0XHRcdFx0XHR7XHJcblx0XHRcdFx0XHRcdFx0XHR3aWRnZXQ6IFwiaW5wdXRcIixcclxuXHRcdFx0XHRcdFx0XHRcdHR5cGU6IFwiZGF0ZVwiLFxyXG5cdFx0XHRcdFx0XHRcdFx0dmFsdWU6IGAke2l0ZW0uZGF0ZS5nZXRGdWxsWWVhcigpfS0ke3BhZChpdGVtLmRhdGUuZ2V0TW9udGgoKSArIDEpfS0ke3BhZChpdGVtLmRhdGUuZ2V0RGF0ZSgpKX1gLFxyXG5cdFx0XHRcdFx0XHRcdFx0YmluZDogaXRlbSxcclxuXHRcdFx0XHRcdFx0XHRcdHByb3A6IFwiZGF0ZVwiLFxyXG5cdFx0XHRcdFx0XHRcdFx0Y2hhbmdlXHJcblx0XHRcdFx0XHRcdFx0fSxcclxuXHRcdFx0XHRcdFx0XHR7XHJcblx0XHRcdFx0XHRcdFx0XHR3aWRnZXQ6IFwiaW5wdXRcIixcclxuXHRcdFx0XHRcdFx0XHRcdHR5cGU6IFwidGltZVwiLFxyXG5cdFx0XHRcdFx0XHRcdFx0dmFsdWU6IGAke2l0ZW0uZGF0ZS5nZXRIb3VycygpfToke3BhZChpdGVtLmRhdGUuZ2V0TWludXRlcygpKX1gLFxyXG5cdFx0XHRcdFx0XHRcdFx0YmluZDogaXRlbSxcclxuXHRcdFx0XHRcdFx0XHRcdHByb3A6IFwidGltZVwiLFxyXG5cdFx0XHRcdFx0XHRcdFx0Y2hhbmdlXHJcblx0XHRcdFx0XHRcdFx0fVxyXG5cdFx0XHRcdFx0XHRdXHJcblx0XHRcdFx0XHR9LFxyXG5cdFx0XHRcdFx0e1xyXG5cdFx0XHRcdFx0XHRjbGFzc2VzOiBcInRleHRhcmVhLXdyYXBwZXJcIixcclxuXHRcdFx0XHRcdFx0Y2hpbGRyZW46IFtcclxuXHRcdFx0XHRcdFx0XHR7XHJcblx0XHRcdFx0XHRcdFx0XHR3aWRnZXQ6IFwiaW5wdXRcIixcclxuXHRcdFx0XHRcdFx0XHRcdHRhZzogXCJ0ZXh0YXJlYVwiLFxyXG5cdFx0XHRcdFx0XHRcdFx0Y2xhc3NlczogXCJ0ZXh0YXJlYS1maWxsXCIsXHJcblx0XHRcdFx0XHRcdFx0XHRwbGFjZWhvbGRlcjogXCJEZXNjcmlwdGlvblwiLFxyXG5cdFx0XHRcdFx0XHRcdFx0YmluZDogaXRlbSxcclxuXHRcdFx0XHRcdFx0XHRcdHByb3A6IFwiZGVzY3JpcHRpb25cIixcclxuXHRcdFx0XHRcdFx0XHRcdGNoYW5nZVxyXG5cdFx0XHRcdFx0XHRcdH1cclxuXHRcdFx0XHRcdFx0XVxyXG5cdFx0XHRcdFx0fVxyXG5cdFx0XHRcdF1cclxuXHRcdFx0fSk7XHJcblx0XHR9KTtcclxuXHJcblx0XHQvLyByZW1vdmUgdGhlIHN1YnNjcmlwdGlvbiB3aGVuIHRoaXMgdmlldyBpcyBkZXN0cm95ZWRcclxuXHRcdGRpc3Bvc2FibGUuYWRkKGNoYW5nZVN1Yik7XHJcblx0fVxyXG59KTtcclxuXHJcbi8vIGFkZCBhIGxlYWRpbmcgMCBpZiBhIG51bWJlciBpcyBsZXNzIHRoYW4gMTBcclxudmFyIHBhZCA9IG51bWJlciA9PiAobnVtYmVyIDwgMTApID8gXCIwXCIgKyBudW1iZXIgOiBudW1iZXI7XHJcblxyXG4vLyBjcmVhdGUgYSBkYXRlIG9mIHRvZGF5IGF0IDExOjU5cG1cclxudmFyIGdlbkRhdGUgPSAoKSA9PiB7XHJcblx0dmFyIGRhdGUgPSBuZXcgRGF0ZSgpO1xyXG5cclxuXHQvLyBzZXQgdGhlIHRpbWVcclxuXHRkYXRlLnNldEhvdXJzKDIzKTtcclxuXHRkYXRlLnNldE1pbnV0ZXMoNTkpO1xyXG5cclxuXHRyZXR1cm4gZGF0ZTtcclxufTtcclxuIiwiLyoqXHJcbiAqIFRoZSB2aWV3IGZvciBhbiBhc3NpZ25tZW50XHJcbiAqL1xyXG5cclxuaW1wb3J0IHtkYXlzRnJvbU5vdywgc3RyaW5naWZ5RGF0ZX0gZnJvbSBcIi4uL3V0aWwvZGF0ZVwiO1xyXG5pbXBvcnQge3N0b3JlfSBmcm9tIFwiLi4vZGF0YS1zdG9yZVwiO1xyXG5cclxudmFyIGFzc2lnbm1lbnRzID0gc3RvcmUoXCJhc3NpZ25tZW50c1wiKTtcclxuXHJcbmxpZmVMaW5lLm5hdi5yZWdpc3Rlcih7XHJcblx0bWF0Y2hlcjogL15cXC9pdGVtXFwvKC4rPykkLyxcclxuXHJcblx0bWFrZSh7bWF0Y2gsIHNldFRpdGxlLCBjb250ZW50LCBkaXNwb3NhYmxlfSkge1xyXG5cdFx0dmFyIGFjdGlvbkRvbmVTdWIsIGFjdGlvbkVkaXRTdWI7XHJcblxyXG5cdCBcdGRpc3Bvc2FibGUuYWRkKFxyXG5cdFx0XHRhc3NpZ25tZW50cy5nZXQobWF0Y2hbMV0sIGZ1bmN0aW9uKGl0ZW0pIHtcclxuXHRcdFx0XHQvLyBjbGVhciB0aGUgY29udGVudFxyXG5cdFx0XHRcdGNvbnRlbnQuaW5uZXJIVE1MID0gXCJcIjtcclxuXHJcblx0XHRcdFx0Ly8gcmVtb3ZlIHRoZSBvbGQgYWN0aW9uXHJcblx0XHRcdFx0aWYoYWN0aW9uRG9uZVN1Yikge1xyXG5cdFx0XHRcdFx0YWN0aW9uRG9uZVN1Yi51bnN1YnNjcmliZSgpO1xyXG5cdFx0XHRcdFx0YWN0aW9uRWRpdFN1Yi51bnN1YnNjcmliZSgpO1xyXG5cdFx0XHRcdH1cclxuXHJcblx0XHRcdFx0Ly8gbm8gc3VjaCBhc3NpZ25tZW50XHJcblx0XHRcdFx0aWYoIWl0ZW0pIHtcclxuXHRcdFx0XHRcdHNldFRpdGxlKFwiTm90IGZvdW5kXCIpO1xyXG5cclxuXHRcdFx0XHRcdGxpZmVMaW5lLm1ha2VEb20oe1xyXG5cdFx0XHRcdFx0XHRwYXJlbnQ6IGNvbnRlbnQsXHJcblx0XHRcdFx0XHRcdGNsYXNzZXM6IFwiY29udGVudC1wYWRkZWRcIixcclxuXHRcdFx0XHRcdFx0Y2hpbGRyZW46IFtcclxuXHRcdFx0XHRcdFx0XHR7XHJcblx0XHRcdFx0XHRcdFx0XHR0YWc6IFwic3BhblwiLFxyXG5cdFx0XHRcdFx0XHRcdFx0dGV4dDogXCJUaGUgYXNzaWdubWVudCB5b3Ugd2hlcmUgbG9va2luZyBmb3IgY291bGQgbm90IGJlIGZvdW5kLiBcIlxyXG5cdFx0XHRcdFx0XHRcdH0sXHJcblx0XHRcdFx0XHRcdFx0e1xyXG5cdFx0XHRcdFx0XHRcdFx0d2lkZ2V0OiBcImxpbmtcIixcclxuXHRcdFx0XHRcdFx0XHRcdGhyZWY6IFwiL1wiLFxyXG5cdFx0XHRcdFx0XHRcdFx0dGV4dDogXCJHbyBob21lLlwiXHJcblx0XHRcdFx0XHRcdFx0fVxyXG5cdFx0XHRcdFx0XHRdXHJcblx0XHRcdFx0XHR9KVxyXG5cclxuXHRcdFx0XHRcdHJldHVybjtcclxuXHRcdFx0XHR9XHJcblxyXG5cdFx0XHRcdC8vIHNldCB0aGUgdGl0bGUgZm9yIHRoZSBjb250ZW50XHJcblx0XHRcdFx0c2V0VGl0bGUoXCJBc3NpZ25tZW50XCIpO1xyXG5cclxuXHRcdFx0XHQvLyBtYXJrIHRoZSBpdGVtIGFzIGRvbmVcclxuXHRcdFx0XHRhY3Rpb25Eb25lU3ViID0gbGlmZUxpbmUuYWRkQWN0aW9uKGl0ZW0uZG9uZSA/IFwiRG9uZVwiIDogXCJOb3QgZG9uZVwiLCAoKSA9PiB7XHJcblx0XHRcdFx0XHQvLyBtYXJrIHRoZSBpdGVtIGRvbmVcclxuXHRcdFx0XHRcdGl0ZW0uZG9uZSA9ICFpdGVtLmRvbmU7XHJcblxyXG5cdFx0XHRcdFx0Ly8gdXBkYXRlIHRoZSBtb2RpZmllZCB0aW1lXHJcblx0XHRcdFx0XHRpdGVtLm1vZGlmaWVkID0gRGF0ZS5ub3coKTtcclxuXHJcblx0XHRcdFx0XHQvLyBzYXZlIHRoZSBjaGFuZ2VcclxuXHRcdFx0XHRcdGFzc2lnbm1lbnRzLnNldChpdGVtKTtcclxuXHRcdFx0XHR9KTtcclxuXHJcblx0XHRcdFx0Ly8gZWRpdCB0aGUgaXRlbVxyXG5cdFx0XHRcdGFjdGlvbkVkaXRTdWIgPSBsaWZlTGluZS5hZGRBY3Rpb24oXCJFZGl0XCIsXHJcblx0XHRcdFx0XHQoKSA9PiBsaWZlTGluZS5uYXYubmF2aWdhdGUoXCIvZWRpdC9cIiArIGl0ZW0uaWQpKTtcclxuXHJcblx0XHRcdFx0Ly8gdGltZXMgdG8gc2tpcFxyXG5cdFx0XHRcdHZhciBza2lwVGltZXMgPSBbXHJcblx0XHRcdFx0XHR7IGhvdXI6IDIzLCBtaW51dGU6IDU5IH1cclxuXHRcdFx0XHRdO1xyXG5cclxuXHRcdFx0XHRsaWZlTGluZS5tYWtlRG9tKHtcclxuXHRcdFx0XHRcdHBhcmVudDogY29udGVudCxcclxuXHRcdFx0XHRcdGNsYXNzZXM6IFwiY29udGVudC1wYWRkZWRcIixcclxuXHRcdFx0XHRcdGNoaWxkcmVuOiBbXHJcblx0XHRcdFx0XHRcdHtcclxuXHRcdFx0XHRcdFx0XHRjbGFzc2VzOiBcImFzc2lnbm1lbnQtbmFtZVwiLFxyXG5cdFx0XHRcdFx0XHRcdHRleHQ6IGl0ZW0ubmFtZVxyXG5cdFx0XHRcdFx0XHR9LFxyXG5cdFx0XHRcdFx0XHR7XHJcblx0XHRcdFx0XHRcdFx0Y2xhc3NlczogXCJhc3NpZ25tZW50LWluZm8tcm93XCIsXHJcblx0XHRcdFx0XHRcdFx0Y2hpbGRyZW46IFtcclxuXHRcdFx0XHRcdFx0XHRcdHtcclxuXHRcdFx0XHRcdFx0XHRcdFx0Y2xhc3NlczogXCJhc3NpZ25tZW50LWluZm8tZ3Jvd1wiLFxyXG5cdFx0XHRcdFx0XHRcdFx0XHR0ZXh0OiBpdGVtLmNsYXNzXHJcblx0XHRcdFx0XHRcdFx0XHR9LFxyXG5cdFx0XHRcdFx0XHRcdFx0e1xyXG5cdFx0XHRcdFx0XHRcdFx0XHR0ZXh0OiBzdHJpbmdpZnlEYXRlKGl0ZW0uZGF0ZSwgeyBpbmNsdWRlVGltZTogdHJ1ZSwgc2tpcFRpbWVzIH0pXHJcblx0XHRcdFx0XHRcdFx0XHR9XHJcblx0XHRcdFx0XHRcdFx0XVxyXG5cdFx0XHRcdFx0XHR9LFxyXG5cdFx0XHRcdFx0XHR7XHJcblx0XHRcdFx0XHRcdFx0Y2xhc3NlczogXCJhc3NpZ25tZW50LWRlc2NyaXB0aW9uXCIsXHJcblx0XHRcdFx0XHRcdFx0dGV4dDogaXRlbS5kZXNjcmlwdGlvblxyXG5cdFx0XHRcdFx0XHR9XHJcblx0XHRcdFx0XHRdXHJcblx0XHRcdFx0fSk7XHJcblx0XHRcdH0pXHJcblx0XHQpO1xyXG5cdH1cclxufSk7XHJcbiIsIi8qKlxyXG4gKiBEaXNwbGF5IGEgbGlzdCBvZiB1cGNvbW1pbmcgYXNzaWdubWVudHNcclxuICovXHJcblxyXG5pbXBvcnQge2RheXNGcm9tTm93LCBpc1NhbWVEYXRlLCBzdHJpbmdpZnlEYXRlLCBzdHJpbmdpZnlUaW1lLCBpc1Nvb25lckRhdGV9IGZyb20gXCIuLi91dGlsL2RhdGVcIjtcclxuaW1wb3J0IHtzdG9yZX0gZnJvbSBcIi4uL2RhdGEtc3RvcmVcIjtcclxuXHJcbnZhciBhc3NpZ25tZW50cyA9IHN0b3JlKFwiYXNzaWdubWVudHNcIik7XHJcblxyXG4vLyBhbGwgdGhlIGRpZmZlcmVudCBsaXN0c1xyXG5jb25zdCBMSVNUUyA9IFtcclxuXHR7XHJcblx0XHR1cmw6IFwiL1wiLFxyXG5cdFx0dGl0bGU6IFwiVG9kYXlcIixcclxuXHRcdGNyZWF0ZUN0eDogKCkgPT4gbmV3IERhdGUoKSxcclxuXHRcdC8vIHNob3cgYWxsIGF0IHJlYXNvbmFibGUgbnVtYmVyIG9mIGluY29tcGxldGUgYXNzaWdubWVudHNcclxuXHRcdGZpbHRlcjogKGl0ZW0sIHRvZGF5KSA9PiAhaXRlbS5kb25lICYmIGlzU2FtZURhdGUodG9kYXksIGl0ZW0uZGF0ZSlcclxuXHR9LFxyXG5cdHtcclxuXHRcdHVybDogXCIvd2Vla1wiLFxyXG5cdFx0dGl0bGU6IFwiVGhpcyB3ZWVrXCIsXHJcblx0XHRjcmVhdGVDdHg6ICgpID0+ICh7XHJcblx0XHRcdC8vIGRheXMgdG8gdGhlIGVuZCBvZiB0aGlzIHdlZWtcclxuXHRcdFx0ZW5kRGF0ZTogZGF5c0Zyb21Ob3coNyAtIChuZXcgRGF0ZSgpKS5nZXREYXkoKSksXHJcblx0XHRcdC8vIHRvZGF5cyBkYXRlXHJcblx0XHRcdHRvZGF5OiBuZXcgRGF0ZSgpXHJcblx0XHR9KSxcclxuXHRcdC8vIHNob3cgYWxsIGF0IHJlYXNvbmFibGUgbnVtYmVyIG9mIGluY29tcGxldGUgYXNzaWdubWVudHNcclxuXHRcdGZpbHRlcjogKGl0ZW0sIHt0b2RheSwgZW5kRGF0ZX0pID0+IHtcclxuXHRcdFx0Ly8gYWxyZWFkeSBkb25lXHJcblx0XHRcdGlmKGl0ZW0uZG9uZSkgcmV0dXJuO1xyXG5cclxuXHRcdFx0Ly8gY2hlY2sgaWYgdGhlIGl0ZW0gaXMgcGFzdCB0aGlzIHdlZWtcclxuXHRcdFx0aWYoIWlzU29vbmVyRGF0ZShpdGVtLmRhdGUsIGVuZERhdGUpICYmICFpc1NhbWVEYXRlKGl0ZW0uZGF0ZSwgZW5kRGF0ZSkpIHJldHVybjtcclxuXHJcblx0XHRcdC8vIGNoZWNrIGlmIHRoZSBkYXRlIGlzIGJlZm9yZSB0b2RheVxyXG5cdFx0XHRpZihpc1Nvb25lckRhdGUoaXRlbS5kYXRlLCB0b2RheSkpIHJldHVybjtcclxuXHJcblx0XHRcdHJldHVybiB0cnVlO1xyXG5cdFx0fVxyXG5cdH0sXHJcblx0e1xyXG5cdFx0dXJsOiBcIi91cGNvbWluZ1wiLFxyXG5cdFx0ZmlsdGVyOiBpdGVtID0+ICFpdGVtLmRvbmUsXHJcblx0XHR0aXRsZTogXCJVcGNvbWluZ1wiXHJcblx0fSxcclxuXHR7XHJcblx0XHR1cmw6IFwiL2RvbmVcIixcclxuXHRcdGZpbHRlcjogaXRlbSA9PiBpdGVtLmRvbmUsXHJcblx0XHR0aXRsZTogXCJEb25lXCJcclxuXHR9XHJcbl07XHJcblxyXG4vLyBhZGQgbGlzdCB2aWV3IGxpbmtzIHRvIHRoZSBuYXZiYXJcclxuZXhwb3J0IGZ1bmN0aW9uIGluaXROYXZCYXIoKSB7XHJcblx0TElTVFMuZm9yRWFjaChsaXN0ID0+IGxpZmVMaW5lLmFkZE5hdkNvbW1hbmQobGlzdC50aXRsZSwgbGlzdC51cmwpKTtcclxufTtcclxuXHJcbmxpZmVMaW5lLm5hdi5yZWdpc3Rlcih7XHJcblx0bWF0Y2hlcih1cmwpIHtcclxuXHRcdHJldHVybiBMSVNUUy5maW5kKGxpc3QgPT4gbGlzdC51cmwgPT0gdXJsKTtcclxuXHR9LFxyXG5cclxuXHQvLyBtYWtlIHRoZSBsaXN0XHJcblx0bWFrZSh7c2V0VGl0bGUsIGNvbnRlbnQsIGRpc3Bvc2FibGUsIG1hdGNofSkge1xyXG5cdFx0ZGlzcG9zYWJsZS5hZGQoXHJcblx0XHRcdGFzc2lnbm1lbnRzLmdldEFsbChmdW5jdGlvbihkYXRhKSB7XHJcblx0XHRcdFx0Ly8gY2xlYXIgdGhlIGNvbnRlbnRcclxuXHRcdFx0XHRjb250ZW50LmlubmVySFRNTCA9IFwiXCI7XHJcblxyXG5cdFx0XHRcdC8vIHNldCB0aGUgcGFnZSB0aXRsZVxyXG5cdFx0XHRcdHNldFRpdGxlKG1hdGNoLnRpdGxlKTtcclxuXHJcblx0XHRcdFx0Ly8gc29ydCB0aGUgYXNzaW5nbWVudHNcclxuXHRcdFx0XHRkYXRhLnNvcnQoKGEsIGIpID0+IHtcclxuXHRcdFx0XHRcdC8vIGRpZmZlcmVudCBkYXRlc1xyXG5cdFx0XHRcdFx0aWYoYS5kYXRlLmdldFRpbWUoKSAhPSBiLmRhdGUuZ2V0VGltZSgpKSB7XHJcblx0XHRcdFx0XHRcdHJldHVybiBhLmRhdGUuZ2V0VGltZSgpIC0gYi5kYXRlLmdldFRpbWUoKTtcclxuXHRcdFx0XHRcdH1cclxuXHJcblx0XHRcdFx0XHQvLyBvcmRlciBieSBuYW1lXHJcblx0XHRcdFx0XHRpZihhLm5hbWUgPCBiLm5hbWUpIHJldHVybiAtMTtcclxuXHRcdFx0XHRcdGlmKGEubmFtZSA+IGIubmFtZSkgcmV0dXJuIDE7XHJcblxyXG5cdFx0XHRcdFx0cmV0dXJuIDA7XHJcblx0XHRcdFx0fSk7XHJcblxyXG5cdFx0XHRcdC8vIHRoZSBjb250ZXh0IGZvciB0aGUgZmlsdGVyIGZ1bmN0aW9uXHJcblx0XHRcdFx0dmFyIGN0eDtcclxuXHJcblx0XHRcdFx0aWYobWF0Y2guY3JlYXRlQ3R4KSB7XHJcblx0XHRcdFx0XHRjdHggPSBtYXRjaC5jcmVhdGVDdHgoKTtcclxuXHRcdFx0XHR9XHJcblxyXG5cdFx0XHRcdC8vIHJ1biB0aGUgZmlsdGVyIGZ1bmN0aW9uXHJcblx0XHRcdFx0ZGF0YSA9IGRhdGEuZmlsdGVyKGl0ZW0gPT4gbWF0Y2guZmlsdGVyKGl0ZW0sIGN0eCkpO1xyXG5cclxuXHRcdFx0XHQvLyBtYWtlIHRoZSBncm91cHNcclxuXHRcdFx0XHR2YXIgZ3JvdXBzID0ge307XHJcblxyXG5cdFx0XHRcdC8vIHJlbmRlciB0aGUgbGlzdFxyXG5cdFx0XHRcdGRhdGEuZm9yRWFjaCgoaXRlbSwgaSkgPT4ge1xyXG5cdFx0XHRcdFx0Ly8gZ2V0IHRoZSBoZWFkZXIgbmFtZVxyXG5cdFx0XHRcdFx0dmFyIGRhdGVTdHIgPSBzdHJpbmdpZnlEYXRlKGl0ZW0uZGF0ZSk7XHJcblxyXG5cdFx0XHRcdFx0Ly8gbWFrZSBzdXJlIHRoZSBoZWFkZXIgZXhpc3RzXHJcblx0XHRcdFx0XHRncm91cHNbZGF0ZVN0cl0gfHwgKGdyb3Vwc1tkYXRlU3RyXSA9IFtdKTtcclxuXHJcblx0XHRcdFx0XHQvLyBhZGQgdGhlIGl0ZW0gdG8gdGhlIGxpc3RcclxuXHRcdFx0XHRcdHZhciBpdGVtcyA9IFtcclxuXHRcdFx0XHRcdFx0eyB0ZXh0OiBpdGVtLm5hbWUsIGdyb3c6IHRydWUgfSxcclxuXHRcdFx0XHRcdFx0aXRlbS5jbGFzc1xyXG5cdFx0XHRcdFx0XTtcclxuXHJcblx0XHRcdFx0XHQvLyBzaG93IHRoZSBlbmQgdGltZSBmb3IgYW55IG5vbiAxMTo1OXBtIHRpbWVzXHJcblx0XHRcdFx0XHRpZihpdGVtLmRhdGUuZ2V0SG91cnMoKSAhPSAyMyB8fCBpdGVtLmRhdGUuZ2V0TWludXRlcygpICE9IDU5KSB7XHJcblx0XHRcdFx0XHRcdGl0ZW1zLnNwbGljZSgxLCAwLCBzdHJpbmdpZnlUaW1lKGl0ZW0uZGF0ZSkpO1xyXG5cdFx0XHRcdFx0fVxyXG5cclxuXHRcdFx0XHRcdGdyb3Vwc1tkYXRlU3RyXS5wdXNoKHtcblx0XHRcdFx0XHRcdGhyZWY6IGAvaXRlbS8ke2l0ZW0uaWR9YCxcblx0XHRcdFx0XHRcdGl0ZW1zXHJcblx0XHRcdFx0XHR9KTtcclxuXHRcdFx0XHR9KTtcclxuXHJcblx0XHRcdFx0Ly8gZGlzcGxheSBhbGwgaXRlbXNcclxuXHRcdFx0XHRsaWZlTGluZS5tYWtlRG9tKHtcclxuXHRcdFx0XHRcdHBhcmVudDogY29udGVudCxcclxuXHRcdFx0XHRcdHdpZGdldDogXCJsaXN0XCIsXHJcblx0XHRcdFx0XHRpdGVtczogZ3JvdXBzXHJcblx0XHRcdFx0fSk7XHJcblx0XHRcdH0pXHJcblx0XHQpO1xyXG5cdH1cclxufSk7XHJcbiIsIi8qKlxyXG4gKiBTaG93IGEgbG9naW4gYnV0dG9uIHRvIHRoZSB1c2VyXHJcbiAqL1xyXG5cclxubGlmZUxpbmUubmF2LnJlZ2lzdGVyKHtcclxuXHRtYXRjaGVyOiBcIi9sb2dpblwiLFxyXG5cclxuXHRtYWtlKHtzZXRUaXRsZSwgY29udGVudH0pIHtcclxuXHRcdC8vIHNldCB0aGUgcGFnZSB0aXRsZVxyXG5cdFx0c2V0VGl0bGUoXCJMb2dpblwiKTtcclxuXHJcblx0XHQvLyB0aGUgdXNlcnMgY3JlZGVudGlhbHNcclxuXHRcdHZhciBhdXRoID0ge307XHJcblxyXG5cdFx0Ly8gY3JlYXRlIHRoZSBsb2dpbiBmb3JtXHJcblx0XHR2YXIge3VzZXJuYW1lLCBwYXNzd29yZCwgbXNnfSA9IGxpZmVMaW5lLm1ha2VEb20oe1xyXG5cdFx0XHRwYXJlbnQ6IGNvbnRlbnQsXHJcblx0XHRcdHRhZzogXCJmb3JtXCIsXHJcblx0XHRcdGNsYXNzZXM6IFwiY29udGVudC1wYWRkZWRcIixcclxuXHRcdFx0Y2hpbGRyZW46IFtcclxuXHRcdFx0XHR7XHJcblx0XHRcdFx0XHRjbGFzc2VzOiBcImVkaXRvci1yb3dcIixcclxuXHRcdFx0XHRcdGNoaWxkcmVuOiBbXHJcblx0XHRcdFx0XHRcdHtcclxuXHRcdFx0XHRcdFx0XHR3aWRnZXQ6IFwiaW5wdXRcIixcclxuXHRcdFx0XHRcdFx0XHRiaW5kOiBhdXRoLFxyXG5cdFx0XHRcdFx0XHRcdHByb3A6IFwidXNlcm5hbWVcIixcclxuXHRcdFx0XHRcdFx0XHRwbGFjZWhvbGRlcjogXCJVc2VybmFtZVwiXHJcblx0XHRcdFx0XHRcdH1cclxuXHRcdFx0XHRcdF1cclxuXHRcdFx0XHR9LFxyXG5cdFx0XHRcdHtcclxuXHRcdFx0XHRcdGNsYXNzZXM6IFwiZWRpdG9yLXJvd1wiLFxyXG5cdFx0XHRcdFx0Y2hpbGRyZW46IFtcclxuXHRcdFx0XHRcdFx0e1xyXG5cdFx0XHRcdFx0XHRcdHdpZGdldDogXCJpbnB1dFwiLFxyXG5cdFx0XHRcdFx0XHRcdGJpbmQ6IGF1dGgsXHJcblx0XHRcdFx0XHRcdFx0cHJvcDogXCJwYXNzd29yZFwiLFxyXG5cdFx0XHRcdFx0XHRcdHR5cGU6IFwicGFzc3dvcmRcIixcclxuXHRcdFx0XHRcdFx0XHRwbGFjZWhvbGRlcjogXCJQYXNzd29yZFwiXHJcblx0XHRcdFx0XHRcdH1cclxuXHRcdFx0XHRcdF1cclxuXHRcdFx0XHR9LFxyXG5cdFx0XHRcdHtcclxuXHRcdFx0XHRcdHRhZzogXCJidXR0b25cIixcclxuXHRcdFx0XHRcdHRleHQ6IFwiTG9naW5cIixcclxuXHRcdFx0XHRcdGNsYXNzZXM6IFwiZmFuY3ktYnV0dG9uXCIsXHJcblx0XHRcdFx0XHRhdHRyczoge1xyXG5cdFx0XHRcdFx0XHR0eXBlOiBcInN1Ym1pdFwiXHJcblx0XHRcdFx0XHR9XHJcblx0XHRcdFx0fSxcclxuXHRcdFx0XHR7XHJcblx0XHRcdFx0XHRjbGFzc2VzOiBcImVycm9yLW1zZ1wiLFxyXG5cdFx0XHRcdFx0bmFtZTogXCJtc2dcIlxyXG5cdFx0XHRcdH1cclxuXHRcdFx0XSxcclxuXHRcdFx0b246IHtcclxuXHRcdFx0XHRzdWJtaXQ6IGUgPT4ge1xyXG5cdFx0XHRcdFx0ZS5wcmV2ZW50RGVmYXVsdCgpO1xyXG5cclxuXHRcdFx0XHRcdC8vIHNlbmQgdGhlIGxvZ2luIHJlcXVlc3RcclxuXHRcdFx0XHRcdGZldGNoKFwiL2FwaS9hdXRoL2xvZ2luXCIsIHtcclxuXHRcdFx0XHRcdFx0bWV0aG9kOiBcIlBPU1RcIixcclxuXHRcdFx0XHRcdFx0Y3JlZGVudGlhbHM6IFwiaW5jbHVkZVwiLFxyXG5cdFx0XHRcdFx0XHRib2R5OiBKU09OLnN0cmluZ2lmeShhdXRoKVxyXG5cdFx0XHRcdFx0fSlcclxuXHJcblx0XHRcdFx0XHQvLyBwYXJzZSB0aGUganNvblxyXG5cdFx0XHRcdFx0LnRoZW4ocmVzID0+IHJlcy5qc29uKCkpXHJcblxyXG5cdFx0XHRcdFx0Ly8gcHJvY2VzcyB0aGUgcmVzcG9uc2VcclxuXHRcdFx0XHRcdC50aGVuKHJlcyA9PiB7XHJcblx0XHRcdFx0XHRcdC8vIGxvZ2luIHN1Y2VlZGVkIGdvIGhvbWVcclxuXHRcdFx0XHRcdFx0aWYocmVzLnN0YXR1cyA9PSBcInN1Y2Nlc3NcIikge1xyXG5cdFx0XHRcdFx0XHRcdGxpZmVMaW5lLm5hdi5uYXZpZ2F0ZShcIi9cIik7XHJcblx0XHRcdFx0XHRcdFx0cmV0dXJuO1xyXG5cdFx0XHRcdFx0XHR9XHJcblxyXG5cdFx0XHRcdFx0XHQvLyBsb2dpbiBmYWlsZWRcclxuXHRcdFx0XHRcdFx0aWYocmVzLnN0YXR1cyA9PSBcImZhaWxcIikge1xyXG5cdFx0XHRcdFx0XHRcdGVycm9yTXNnKFwiTG9naW4gZmFpbGVkXCIpO1xyXG5cdFx0XHRcdFx0XHR9XHJcblx0XHRcdFx0XHR9KTtcclxuXHRcdFx0XHR9XHJcblx0XHRcdH1cclxuXHRcdH0pO1xyXG5cclxuXHRcdC8vIGRpc3BsYXkgYW4gZXJyb3IgbWVzc2FnZVxyXG5cdFx0dmFyIGVycm9yTXNnID0gZnVuY3Rpb24odGV4dCkge1xyXG5cdFx0XHRtc2cuaW5uZXJUZXh0ID0gdGV4dDtcclxuXHRcdH07XHJcblx0fVxyXG59KTtcclxuXHJcbi8vIGxvZ291dFxyXG5saWZlTGluZS5sb2dvdXQgPSBmdW5jdGlvbigpIHtcclxuXHQvLyBzZW5kIHRoZSBsb2dvdXQgcmVxdWVzdFxyXG5cdGZldGNoKFwiL2FwaS9hdXRoL2xvZ291dFwiLCB7XHJcblx0XHRjcmVkZW50aWFsczogXCJpbmNsdWRlXCJcclxuXHR9KVxyXG5cclxuXHQvLyBnbyB0byB0aGUgbG9naW4gcGFnZVxyXG5cdC50aGVuKCgpID0+IGxpZmVMaW5lLm5hdi5uYXZpZ2F0ZShcIi9sb2dpblwiKSk7XHJcbn07XHJcbiIsIi8qKlxyXG4gKiBBIHBhZ2Ugd2l0aCBsaW5rcyB0byBhbGwgdXNlcnNcclxuICovXHJcblxyXG5saWZlTGluZS5uYXYucmVnaXN0ZXIoe1xyXG5cdG1hdGNoZXI6IFwiL3VzZXJzXCIsXHJcblxyXG5cdG1ha2Uoe3NldFRpdGxlLCBjb250ZW50fSkge1xyXG5cdFx0c2V0VGl0bGUoXCJBbGwgdXNlcnNcIik7XHJcblxyXG5cdFx0Ly8gbG9hZCB0aGUgbGlzdCBvZiB1c2Vyc1xyXG5cdFx0ZmV0Y2goXCIvYXBpL2F1dGgvaW5mby91c2Vyc1wiLCB7XHJcblx0XHRcdGNyZWRlbnRpYWxzOiBcImluY2x1ZGVcIlxyXG5cdFx0fSlcclxuXHJcblx0XHQudGhlbihyZXMgPT4gcmVzLmpzb24oKSlcclxuXHJcblx0XHQudGhlbigoe3N0YXR1cywgZGF0YTogdXNlcnN9KSA9PiB7XHJcblx0XHRcdC8vIG5vdCBhdXRoZW50aWNhdGVkXHJcblx0XHRcdGlmKHN0YXR1cyA9PSBcImZhaWxcIikge1xyXG5cdFx0XHRcdGxpZmVMaW5lLm1ha2VEb20oe1xyXG5cdFx0XHRcdFx0cGFyZW50OiBjb250ZW50LFxyXG5cdFx0XHRcdFx0Y2xhc3NlczogXCJjb250ZW50LXBhZGRlZFwiLFxyXG5cdFx0XHRcdFx0dGV4dDogXCJZb3UgZG8gbm90IGhhdmUgYWNjZXNzIHRvIHRoZSB1c2VyIGxpc3RcIlxyXG5cdFx0XHRcdH0pO1xyXG5cclxuXHRcdFx0XHRyZXR1cm47XHJcblx0XHRcdH1cclxuXHJcblx0XHRcdC8vIHNvcnQgYnkgYWRtaW4gc3RhdHVzXHJcblx0XHRcdHVzZXJzLnNvcnQoKGEsIGIpID0+IHtcclxuXHRcdFx0XHQvLyBzb3J0IGFkbWluc1xyXG5cdFx0XHRcdGlmKGEuYWRtaW4gJiYgIWIuYWRtaW4pIHJldHVybiAtMTtcclxuXHRcdFx0XHRpZighYS5hZG1pbiAmJiBiLmFkbWluKSByZXR1cm4gMTtcclxuXHJcblx0XHRcdFx0Ly8gc29ydCBieSB1c2VybmFtZVxyXG5cdFx0XHRcdGlmKGEudXNlcm5hbWUgPCBiLnVzZXJuYW1lKSByZXR1cm4gLTE7XHJcblx0XHRcdFx0aWYoYS51c2VybmFtZSA+IGIudXNlcm5hbWUpIHJldHVybiAxO1xyXG5cclxuXHRcdFx0XHRyZXR1cm4gMDtcclxuXHRcdFx0fSk7XHJcblxyXG5cdFx0XHR2YXIgZGlzcGxheVVzZXJzID0ge1xyXG5cdFx0XHRcdEFkbWluczogW10sXHJcblx0XHRcdFx0VXNlcnM6IFtdXHJcblx0XHRcdH07XHJcblxyXG5cdFx0XHQvLyBnZW5lcmF0ZSB0aGUgdXNlciBsaXN0XHJcblx0XHRcdHVzZXJzLmZvckVhY2godXNlciA9PiB7XHJcblx0XHRcdFx0Ly8gc29ydCB0aGUgdXNlcnMgaW50byBhZG1pbnMgYW5kIHVzZXJzXHJcblx0XHRcdFx0ZGlzcGxheVVzZXJzW3VzZXIuYWRtaW4gPyBcIkFkbWluc1wiIDogXCJVc2Vyc1wiXVxyXG5cclxuXHRcdFx0XHQucHVzaCh7XHJcblx0XHRcdFx0XHRocmVmOiBgL3VzZXIvJHt1c2VyLnVzZXJuYW1lfWAsXHJcblx0XHRcdFx0XHRpdGVtczogW3tcclxuXHRcdFx0XHRcdFx0dGV4dDogdXNlci51c2VybmFtZSxcclxuXHRcdFx0XHRcdFx0Z3JvdzogdHJ1ZVxyXG5cdFx0XHRcdFx0fV1cclxuXHRcdFx0XHR9KTtcclxuXHRcdFx0fSk7XHJcblxyXG5cdFx0XHQvLyBkaXNwbGF5IHRoZSB1c2VyIGxpc3RcclxuXHRcdFx0bGlmZUxpbmUubWFrZURvbSh7XHJcblx0XHRcdFx0cGFyZW50OiBjb250ZW50LFxyXG5cdFx0XHRcdHdpZGdldDogXCJsaXN0XCIsXHJcblx0XHRcdFx0aXRlbXM6IGRpc3BsYXlVc2Vyc1xyXG5cdFx0XHR9KTtcclxuXHRcdH0pXHJcblxyXG5cdFx0Ly8gc29tZXRoaW5nIHdlbnQgd3Jvbmcgc2hvdyBhbiBlcnJvciBtZXNzYWdlXHJcblx0XHQuY2F0Y2goZXJyID0+IHtcclxuXHRcdFx0bGlmZUxpbmUubWFrZURvbSh7XHJcblx0XHRcdFx0Y2xhc3NlczogXCJjb250ZW50LXBhZGRlZFwiLFxyXG5cdFx0XHRcdHRleHQ6IGVyci5tZXNzYWdlXHJcblx0XHRcdH0pO1xyXG5cdFx0fSk7XHJcblx0fVxyXG59KTtcclxuIiwiLyoqXHJcbiAqIFRoZSBtYWluIGNvbnRlbnQgcGFuZSBmb3IgdGhlIGFwcFxyXG4gKi9cclxuXHJcbmxpZmVMaW5lLm1ha2VEb20ucmVnaXN0ZXIoXCJjb250ZW50XCIsIHtcclxuXHRtYWtlKCkge1xyXG5cdFx0cmV0dXJuIFtcclxuXHRcdFx0e1xyXG5cdFx0XHRcdGNsYXNzZXM6IFwidG9vbGJhclwiLFxyXG5cdFx0XHRcdGNoaWxkcmVuOiBbXHJcblx0XHRcdFx0XHR7XHJcblx0XHRcdFx0XHRcdHRhZzogXCJzdmdcIixcclxuXHRcdFx0XHRcdFx0Y2xhc3NlczogXCJtZW51LWljb25cIixcclxuXHRcdFx0XHRcdFx0YXR0cnM6IHtcclxuXHRcdFx0XHRcdFx0XHR2aWV3Qm94OiBcIjAgMCA2MCA1MFwiLFxyXG5cdFx0XHRcdFx0XHRcdHdpZHRoOiBcIjIwXCIsXHJcblx0XHRcdFx0XHRcdFx0aGVpZ2h0OiBcIjE1XCJcclxuXHRcdFx0XHRcdFx0fSxcclxuXHRcdFx0XHRcdFx0Y2hpbGRyZW46IFtcclxuXHRcdFx0XHRcdFx0XHR7IHRhZzogXCJsaW5lXCIsIGF0dHJzOiB7IHgxOiBcIjBcIiwgeTE6IFwiNVwiLCB4MjogXCI2MFwiLCB5MjogXCI1XCIgfSB9LFxyXG5cdFx0XHRcdFx0XHRcdHsgdGFnOiBcImxpbmVcIiwgYXR0cnM6IHsgeDE6IFwiMFwiLCB5MTogXCIyNVwiLCB4MjogXCI2MFwiLCB5MjogXCIyNVwiIH0gfSxcclxuXHRcdFx0XHRcdFx0XHR7IHRhZzogXCJsaW5lXCIsIGF0dHJzOiB7IHgxOiBcIjBcIiwgeTE6IFwiNDVcIiwgeDI6IFwiNjBcIiwgeTI6IFwiNDVcIiB9IH1cclxuXHRcdFx0XHRcdFx0XSxcclxuXHRcdFx0XHRcdFx0b246IHtcclxuXHRcdFx0XHRcdFx0XHRjbGljazogKCkgPT4gZG9jdW1lbnQuYm9keS5jbGFzc0xpc3QudG9nZ2xlKFwic2lkZWJhci1vcGVuXCIpXHJcblx0XHRcdFx0XHRcdH1cclxuXHRcdFx0XHRcdH0sXHJcblx0XHRcdFx0XHR7XHJcblx0XHRcdFx0XHRcdGNsYXNzZXM6IFwidG9vbGJhci10aXRsZVwiLFxyXG5cdFx0XHRcdFx0XHRuYW1lOiBcInRpdGxlXCJcclxuXHRcdFx0XHRcdH0sXHJcblx0XHRcdFx0XHR7XHJcblx0XHRcdFx0XHRcdGNsYXNzZXM6IFwidG9vbGJhci1idXR0b25zXCIsXHJcblx0XHRcdFx0XHRcdG5hbWU6IFwiYnRuc1wiXHJcblx0XHRcdFx0XHR9XHJcblx0XHRcdFx0XVxyXG5cdFx0XHR9LFxyXG5cdFx0XHR7XHJcblx0XHRcdFx0Y2xhc3NlczogXCJjb250ZW50XCIsXHJcblx0XHRcdFx0bmFtZTogXCJjb250ZW50XCJcclxuXHRcdFx0fVxyXG5cdFx0XTtcclxuXHR9LFxyXG5cclxuXHRiaW5kKG9wdHMsIHt0aXRsZSwgYnRucywgY29udGVudH0pIHtcclxuXHRcdHZhciBkaXNwb3NhYmxlO1xyXG5cclxuXHRcdC8vIHNldCB0aGUgcGFnZSB0aXRsZVxyXG5cdFx0dmFyIHNldFRpdGxlID0gZnVuY3Rpb24odGl0bGVUZXh0KSB7XHJcblx0XHRcdHRpdGxlLmlubmVyVGV4dCA9IHRpdGxlVGV4dDtcclxuXHRcdFx0ZG9jdW1lbnQudGl0bGUgPSB0aXRsZVRleHQ7XHJcblx0XHR9O1xyXG5cclxuXHRcdC8vIGFkZCBhbiBhY3Rpb24gYnV0dG9uXHJcblx0XHRsaWZlTGluZS5vbihcImFjdGlvbi1jcmVhdGVcIiwgbmFtZSA9PiB7XHJcblx0XHRcdGxpZmVMaW5lLm1ha2VEb20oe1xyXG5cdFx0XHRcdHBhcmVudDogYnRucyxcclxuXHRcdFx0XHR0YWc6IFwiYnV0dG9uXCIsXHJcblx0XHRcdFx0Y2xhc3NlczogXCJ0b29sYmFyLWJ1dHRvblwiLFxyXG5cdFx0XHRcdHRleHQ6IG5hbWUsXHJcblx0XHRcdFx0YXR0cnM6IHtcclxuXHRcdFx0XHRcdFwiZGF0YS1uYW1lXCI6IG5hbWVcclxuXHRcdFx0XHR9LFxyXG5cdFx0XHRcdG9uOiB7XHJcblx0XHRcdFx0XHRjbGljazogKCkgPT4gbGlmZUxpbmUuZW1pdChcImFjdGlvbi1leGVjLVwiICsgbmFtZSlcclxuXHRcdFx0XHR9XHJcblx0XHRcdH0pO1xyXG5cdFx0fSk7XHJcblxyXG5cdFx0Ly8gcmVtb3ZlIGFuIGFjdGlvbiBidXR0b25cclxuXHRcdGxpZmVMaW5lLm9uKFwiYWN0aW9uLXJlbW92ZVwiLCBuYW1lID0+IHtcclxuXHRcdFx0dmFyIGJ0biA9IGJ0bnMucXVlcnlTZWxlY3RvcihgW2RhdGEtbmFtZT1cIiR7bmFtZX1cIl1gKTtcclxuXHJcblx0XHRcdGlmKGJ0bikgYnRuLnJlbW92ZSgpO1xyXG5cdFx0fSk7XHJcblxyXG5cdFx0Ly8gcmVtb3ZlIGFsbCB0aGUgYWN0aW9uIGJ1dHRvbnNcclxuXHRcdGxpZmVMaW5lLm9uKFwiYWN0aW9uLXJlbW92ZS1hbGxcIiwgKCkgPT4gYnRucy5pbm5lckhUTUwgPSBcIlwiKTtcclxuXHJcblx0XHQvLyBkaXNwbGF5IHRoZSBjb250ZW50IGZvciB0aGUgdmlld1xyXG5cdFx0dmFyIHVwZGF0ZVZpZXcgPSAoKSA9PiB7XHJcblx0XHRcdC8vIGRlc3Ryb3kgYW55IGxpc3RlbmVycyBmcm9tIG9sZCBjb250ZW50XHJcblx0XHRcdGlmKGRpc3Bvc2FibGUpIHtcclxuXHRcdFx0XHRkaXNwb3NhYmxlLmRpc3Bvc2UoKTtcclxuXHRcdFx0fVxyXG5cclxuXHRcdFx0Ly8gcmVtb3ZlIGFueSBhY3Rpb24gYnV0dG9uc1xyXG5cdFx0XHRsaWZlTGluZS5lbWl0KFwiYWN0aW9uLXJlbW92ZS1hbGxcIik7XHJcblxyXG5cdFx0XHQvLyBjbGVhciBhbGwgdGhlIG9sZCBjb250ZW50XHJcblx0XHRcdGNvbnRlbnQuaW5uZXJIVE1MID0gXCJcIjtcclxuXHJcblx0XHRcdC8vIGNyZWF0ZSB0aGUgZGlzcG9zYWJsZSBmb3IgdGhlIGNvbnRlbnRcclxuXHRcdFx0ZGlzcG9zYWJsZSA9IG5ldyBsaWZlTGluZS5EaXNwb3NhYmxlKCk7XHJcblxyXG5cdFx0XHR2YXIgbWFrZXIgPSBub3RGb3VuZE1ha2VyLCBtYXRjaDtcclxuXHJcblx0XHRcdC8vIGZpbmQgdGhlIGNvcnJlY3QgY29udGVudCBtYWtlclxyXG5cdFx0XHRmb3IobGV0ICRtYWtlciBvZiBjb250ZW50TWFrZXJzKSB7XHJcblx0XHRcdFx0Ly8gcnVuIGEgbWF0Y2hlciBmdW5jdGlvblxyXG5cdFx0XHRcdGlmKHR5cGVvZiAkbWFrZXIubWF0Y2hlciA9PSBcImZ1bmN0aW9uXCIpIHtcclxuXHRcdFx0XHRcdG1hdGNoID0gJG1ha2VyLm1hdGNoZXIobG9jYXRpb24ucGF0aG5hbWUpO1xyXG5cdFx0XHRcdH1cclxuXHRcdFx0XHQvLyBhIHN0cmluZyBtYXRjaFxyXG5cdFx0XHRcdGVsc2UgaWYodHlwZW9mICRtYWtlci5tYXRjaGVyID09IFwic3RyaW5nXCIpIHtcclxuXHRcdFx0XHRcdGlmKCRtYWtlci5tYXRjaGVyID09IGxvY2F0aW9uLnBhdGhuYW1lKSB7XHJcblx0XHRcdFx0XHRcdG1hdGNoID0gJG1ha2VyLm1hdGNoZXI7XHJcblx0XHRcdFx0XHR9XHJcblx0XHRcdFx0fVxyXG5cdFx0XHRcdC8vIGEgcmVnZXggbWF0Y2hcclxuXHRcdFx0XHRlbHNlIHtcclxuXHRcdFx0XHRcdG1hdGNoID0gJG1ha2VyLm1hdGNoZXIuZXhlYyhsb2NhdGlvbi5wYXRobmFtZSk7XHJcblx0XHRcdFx0fVxyXG5cclxuXHRcdFx0XHQvLyBtYXRjaCBmb3VuZCBzdG9wIHNlYXJjaGluZ1xyXG5cdFx0XHRcdGlmKG1hdGNoKSB7XHJcblx0XHRcdFx0XHRtYWtlciA9ICRtYWtlcjtcclxuXHJcblx0XHRcdFx0XHRicmVhaztcclxuXHRcdFx0XHR9XHJcblx0XHRcdH1cclxuXHJcblx0XHRcdC8vIG1ha2UgdGhlIGNvbnRlbnQgZm9yIHRoaXMgcm91dGVcclxuXHRcdFx0bWFrZXIubWFrZSh7ZGlzcG9zYWJsZSwgc2V0VGl0bGUsIGNvbnRlbnQsIG1hdGNofSk7XHJcblx0XHR9O1xyXG5cclxuXHRcdC8vIHN3aXRjaCBwYWdlc1xyXG5cdFx0bGlmZUxpbmUubmF2Lm5hdmlnYXRlID0gZnVuY3Rpb24odXJsKSB7XHJcblx0XHRcdC8vIHVwZGF0ZSB0aGUgdXJsXHJcblx0XHRcdGhpc3RvcnkucHVzaFN0YXRlKG51bGwsIG51bGwsIHVybCk7XHJcblxyXG5cdFx0XHQvLyBzaG93IHRoZSBuZXcgdmlld1xyXG5cdFx0XHR1cGRhdGVWaWV3KCk7XHJcblx0XHR9O1xyXG5cclxuXHRcdC8vIHN3aXRjaCBwYWdlcyB3aGVuIHRoZSB1c2VyIHB1c2hlcyB0aGUgYmFjayBidXR0b25cclxuXHRcdHdpbmRvdy5hZGRFdmVudExpc3RlbmVyKFwicG9wc3RhdGVcIiwgKCkgPT4gdXBkYXRlVmlldygpKTtcclxuXHJcblx0XHQvLyBzaG93IHRoZSBpbml0aWFsIHZpZXdcclxuXHRcdHVwZGF0ZVZpZXcoKTtcclxuXHR9XHJcbn0pO1xyXG5cclxuLy8gYWxsIGNvbnRlbnQgcHJvZHVjZXJzXHJcbnZhciBjb250ZW50TWFrZXJzID0gW107XHJcblxyXG4vLyBjcmVhdGUgdGhlIG5hbWVzcGFjZVxyXG5saWZlTGluZS5uYXYgPSB7fTtcclxuXHJcbi8vIHJlZ2lzdGVyIGEgY29udGVudCBtYWtlclxyXG5saWZlTGluZS5uYXYucmVnaXN0ZXIgPSBmdW5jdGlvbihtYWtlcikge1xyXG5cdGNvbnRlbnRNYWtlcnMucHVzaChtYWtlcik7XHJcbn07XHJcblxyXG4vLyB0aGUgZmFsbCBiYWNrIG1ha2VyIGZvciBubyBzdWNoIHBhZ2VcclxudmFyIG5vdEZvdW5kTWFrZXIgPSB7XHJcblx0bWFrZSh7c2V0VGl0bGUsIGNvbnRlbnR9KSB7XHJcblx0XHQvLyB1cGRhdGUgdGhlIHBhZ2UgdGl0bGVcclxuXHRcdHNldFRpdGxlKFwiTm90IGZvdW5kXCIpO1xyXG5cclxuXHRcdGxpZmVMaW5lLm1ha2VEb20oe1xyXG5cdFx0XHRwYXJlbnQ6IGNvbnRlbnQsXHJcblx0XHRcdGNsYXNzZXM6IFwiY29udGVudC1wYWRkZWRcIixcclxuXHRcdFx0Y2hpbGRyZW46IFtcclxuXHRcdFx0XHR7XHJcblx0XHRcdFx0XHR0YWc6IFwic3BhblwiLFxyXG5cdFx0XHRcdFx0dGV4dDogXCJUaGUgcGFnZSB5b3UgYXJlIGxvb2tpbmcgZm9yIGNvdWxkIG5vdCBiZSBmb3VuZC4gXCJcclxuXHRcdFx0XHR9LFxyXG5cdFx0XHRcdHtcclxuXHRcdFx0XHRcdHdpZGdldDogXCJsaW5rXCIsXHJcblx0XHRcdFx0XHRocmVmOiBcIi9cIixcclxuXHRcdFx0XHRcdHRleHQ6IFwiR28gaG9tZVwiXHJcblx0XHRcdFx0fVxyXG5cdFx0XHRdXHJcblx0XHR9KTtcclxuXHR9XHJcbn07XHJcbiIsIi8qKlxyXG4gKiBDcmVhdGUgYW4gaW5wdXQgZmllbGRcclxuICovXHJcblxyXG5saWZlTGluZS5tYWtlRG9tLnJlZ2lzdGVyKFwiaW5wdXRcIiwge1xyXG5cdG1ha2Uoe3RhZywgdHlwZSwgdmFsdWUsIGNoYW5nZSwgYmluZCwgcHJvcCwgcGxhY2Vob2xkZXIsIGNsYXNzZXN9KSB7XHJcblx0XHQvLyBzZXQgdGhlIGluaXRpYWwgdmFsdWUgb2YgdGhlIGJvdW5kIG9iamVjdFxyXG5cdFx0aWYodHlwZW9mIGJpbmQgPT0gXCJvYmplY3RcIiAmJiAhdmFsdWUpIHtcclxuXHRcdFx0dmFsdWUgPSBiaW5kW3Byb3BdO1xyXG5cdFx0fVxyXG5cclxuXHRcdC8vIGRvbmUgcHV0IHRoZSBsaXRlcmFsIHVuZGVmaW5lZCBpbiBpZiBubyB2YWx1ZSBpcyBnaXZlblxyXG5cdFx0dmFsdWUgfHwgKHZhbHVlID0gXCJcIik7XHJcblxyXG5cdFx0dmFyIGlucHV0ID0ge1xyXG5cdFx0XHR0YWc6IHRhZyB8fCBcImlucHV0XCIsXHJcblx0XHRcdGNsYXNzZXM6IGNsYXNzZXMgfHwgYCR7dGFnID09IFwidGV4dGFyZWFcIiA/IFwidGV4dGFyZWFcIiA6IFwiaW5wdXRcIn0tZmlsbGAsXHJcblx0XHRcdGF0dHJzOiB7XHJcblx0XHRcdFx0cGxhY2Vob2xkZXIsXHJcblx0XHRcdFx0dHlwZSxcclxuXHRcdFx0XHR2YWx1ZVxyXG5cdFx0XHR9LFxyXG5cdFx0XHRvbjoge1xyXG5cdFx0XHRcdGlucHV0OiBlID0+IHtcclxuXHRcdFx0XHRcdC8vIHVwZGF0ZSB0aGUgcHJvcGVydHkgY2hhbmdlZFxyXG5cdFx0XHRcdFx0aWYodHlwZW9mIGJpbmQgPT0gXCJvYmplY3RcIikge1xyXG5cdFx0XHRcdFx0XHRiaW5kW3Byb3BdID0gZS50YXJnZXQudmFsdWU7XHJcblx0XHRcdFx0XHR9XHJcblxyXG5cdFx0XHRcdFx0Ly8gY2FsbCB0aGUgY2FsbGJhY2tcclxuXHRcdFx0XHRcdGlmKHR5cGVvZiBjaGFuZ2UgPT0gXCJmdW5jdGlvblwiKSB7XHJcblx0XHRcdFx0XHRcdGNoYW5nZShlLnRhcmdldC52YWx1ZSk7XHJcblx0XHRcdFx0XHR9XHJcblx0XHRcdFx0fVxyXG5cdFx0XHR9XHJcblx0XHR9O1xyXG5cclxuXHRcdC8vIGZvciB0ZXh0YXJlYXMgc2V0IGlubmVyVGV4dFxyXG5cdFx0aWYodGFnID09IFwidGV4dGFyZWFcIikge1xyXG5cdFx0XHRpbnB1dC50ZXh0ID0gdmFsdWU7XHJcblx0XHR9XHJcblxyXG5cdFx0cmV0dXJuIGlucHV0O1xyXG5cdH1cclxufSk7XHJcbiIsIi8qKlxyXG4gKiBBIHdpZGdldCB0aGF0IGNyZWF0ZXMgYSBsaW5rIHRoYXQgaG9va3MgaW50byB0aGUgbmF2aWdhdG9yXHJcbiAqL1xyXG5cclxubGlmZUxpbmUubWFrZURvbS5yZWdpc3RlcihcImxpbmtcIiwge1xyXG5cdG1ha2Uob3B0cykge1xyXG5cdFx0cmV0dXJuIHtcclxuXHRcdFx0dGFnOiBcImFcIixcclxuXHRcdFx0YXR0cnM6IHtcclxuXHRcdFx0XHRocmVmOiBvcHRzLmhyZWZcclxuXHRcdFx0fSxcclxuXHRcdFx0b246IHtcclxuXHRcdFx0XHRjbGljazogZSA9PiB7XHJcblx0XHRcdFx0XHQvLyBkb24ndCBvdmVyIHJpZGUgY3RybCBvciBhbHQgb3Igc2hpZnQgY2xpY2tzXHJcblx0XHRcdFx0XHRpZihlLmN0cmxLZXkgfHwgZS5hbHRLZXkgfHwgZS5zaGlmdEtleSkgcmV0dXJuO1xyXG5cclxuXHRcdFx0XHRcdC8vIGRvbid0IG5hdmlnYXRlIHRoZSBwYWdlXHJcblx0XHRcdFx0XHRlLnByZXZlbnREZWZhdWx0KCk7XHJcblxyXG5cdFx0XHRcdFx0bGlmZUxpbmUubmF2Lm5hdmlnYXRlKG9wdHMuaHJlZilcclxuXHRcdFx0XHR9XHJcblx0XHRcdH0sXHJcblx0XHRcdHRleHQ6IG9wdHMudGV4dFxyXG5cdFx0fTtcclxuXHR9XHJcbn0pO1xyXG4iLCIvKipcclxuICogRGlzcGxheSBhIGxpc3Qgd2l0aCBncm91cCBoZWFkaW5nc1xyXG4gKi9cclxuXHJcbmxpZmVMaW5lLm1ha2VEb20ucmVnaXN0ZXIoXCJsaXN0XCIsIHtcclxuXHRtYWtlKHtpdGVtc30pIHtcclxuXHRcdC8vIGFkZCBhbGwgdGhlIGdyb3Vwc1xyXG5cdFx0cmV0dXJuIE9iamVjdC5nZXRPd25Qcm9wZXJ0eU5hbWVzKGl0ZW1zKVxyXG5cclxuXHRcdC5tYXAoZ3JvdXBOYW1lID0+IG1ha2VHcm91cChncm91cE5hbWUsIGl0ZW1zW2dyb3VwTmFtZV0pKTtcclxuXHR9XHJcbn0pO1xyXG5cclxuLy8gbWFrZSBhIHNpbmdsZSBncm91cFxyXG52YXIgbWFrZUdyb3VwID0gZnVuY3Rpb24obmFtZSwgaXRlbXMsIHBhcmVudCkge1xyXG5cdC8vIGFkZCB0aGUgbGlzdCBoZWFkZXJcclxuXHRpdGVtcy51bnNoaWZ0KHtcclxuXHRcdGNsYXNzZXM6IFwibGlzdC1oZWFkZXJcIixcclxuXHRcdHRleHQ6IG5hbWVcclxuXHR9KTtcclxuXHJcblx0Ly8gcmVuZGVyIHRoZSBpdGVtXHJcblx0cmV0dXJuIHtcclxuXHRcdHBhcmVudCxcclxuXHRcdGNsYXNzZXM6IFwibGlzdC1zZWN0aW9uXCIsXHJcblx0XHRjaGlsZHJlbjogaXRlbXMubWFwKChpdGVtLCBpbmRleCkgPT4ge1xyXG5cdFx0XHQvLyBkb24ndCBtb2RpZnkgdGhlIGhlYWRlclxyXG5cdFx0XHRpZihpbmRleCA9PT0gMCkgcmV0dXJuIGl0ZW07XHJcblxyXG5cdFx0XHR2YXIgaXRlbURvbTtcclxuXHJcblx0XHRcdC8vIGNyZWF0ZSBhbiBpdGVtXHJcblx0XHRcdGlmKHR5cGVvZiBpdGVtICE9IFwic3RyaW5nXCIpIHtcclxuXHRcdFx0XHRpdGVtRG9tID0ge1xyXG5cdFx0XHRcdFx0Y2xhc3NlczogXCJsaXN0LWl0ZW1cIixcclxuXHRcdFx0XHRcdGNoaWxkcmVuOiAoaXRlbS5pdGVtcyB8fCBpdGVtKS5tYXAoaXRlbSA9PiB7XHJcblx0XHRcdFx0XHRcdHJldHVybiB7XHJcblx0XHRcdFx0XHRcdFx0Ly8gZ2V0IHRoZSBuYW1lIG9mIHRoZSBpdGVtXHJcblx0XHRcdFx0XHRcdFx0dGV4dDogdHlwZW9mIGl0ZW0gPT0gXCJzdHJpbmdcIiA/IGl0ZW0gOiBpdGVtLnRleHQsXHJcblx0XHRcdFx0XHRcdFx0Ly8gc2V0IHdoZXRoZXIgdGhlIGl0ZW0gc2hvdWxkIGdyb3dcclxuXHRcdFx0XHRcdFx0XHRjbGFzc2VzOiBpdGVtLmdyb3cgPyBcImxpc3QtaXRlbS1ncm93XCIgOiBcImxpc3QtaXRlbS1wYXJ0XCJcclxuXHRcdFx0XHRcdFx0fTtcclxuXHRcdFx0XHRcdH0pXHJcblx0XHRcdFx0fTtcclxuXHRcdFx0fVxyXG5cdFx0XHRlbHNlIHtcclxuXHRcdFx0XHRpdGVtRG9tID0ge1xyXG5cdFx0XHRcdFx0Y2xhc3NlczogXCJsaXN0LWl0ZW1cIixcclxuXHRcdFx0XHRcdHRleHQ6IGl0ZW1cclxuXHRcdFx0XHR9O1xyXG5cdFx0XHR9XHJcblxyXG5cdFx0XHQvLyBtYWtlIHRoZSBpdGVtIGEgbGlua1xyXG5cdFx0XHRpZihpdGVtLmhyZWYpIHtcclxuXHRcdFx0XHRpdGVtRG9tLm9uID0ge1xyXG5cdFx0XHRcdFx0Y2xpY2s6ICgpID0+IGxpZmVMaW5lLm5hdi5uYXZpZ2F0ZShpdGVtLmhyZWYpXHJcblx0XHRcdFx0fTtcclxuXHRcdFx0fVxyXG5cclxuXHRcdFx0cmV0dXJuIGl0ZW1Eb207XHJcblx0XHR9KVxyXG5cdH07XHJcbn07XHJcbiIsIi8qKlxyXG4gKiBUaGUgd2lkZ2V0IGZvciB0aGUgc2lkZWJhclxyXG4gKi9cclxuXHJcbmxpZmVMaW5lLm1ha2VEb20ucmVnaXN0ZXIoXCJzaWRlYmFyXCIsIHtcclxuXHRtYWtlKCkge1xyXG5cdFx0cmV0dXJuIFtcclxuXHRcdFx0e1xyXG5cdFx0XHRcdGNsYXNzZXM6IFwic2lkZWJhclwiLFxyXG5cdFx0XHRcdG5hbWU6IFwic2lkZWJhclwiLFxyXG5cdFx0XHRcdGNoaWxkcmVuOiBbXHJcblx0XHRcdFx0XHR7XHJcblx0XHRcdFx0XHRcdGNsYXNzZXM6IFtcInNpZGViYXItYWN0aW9uc1wiLCBcImhpZGRlblwiXSxcclxuXHRcdFx0XHRcdFx0bmFtZTogXCJhY3Rpb25zXCIsXHJcblx0XHRcdFx0XHRcdGNoaWxkcmVuOiBbXHJcblx0XHRcdFx0XHRcdFx0e1xyXG5cdFx0XHRcdFx0XHRcdFx0Y2xhc3NlczogXCJzaWRlYmFyLWhlYWRpbmdcIixcclxuXHRcdFx0XHRcdFx0XHRcdHRleHQ6IFwiUGFnZSBhY3Rpb25zXCJcclxuXHRcdFx0XHRcdFx0XHR9XHJcblx0XHRcdFx0XHRcdF1cclxuXHRcdFx0XHRcdH0sXHJcblx0XHRcdFx0XHR7XHJcblx0XHRcdFx0XHRcdGNsYXNzZXM6IFwic2lkZWJhci1oZWFkaW5nXCIsXHJcblx0XHRcdFx0XHRcdHRleHQ6IFwiTW9yZSBhY3Rpb25zXCJcclxuXHRcdFx0XHRcdH1cclxuXHRcdFx0XHRdXHJcblx0XHRcdH0sXHJcblx0XHRcdHtcclxuXHRcdFx0XHRjbGFzc2VzOiBcInNoYWRlXCIsXHJcblx0XHRcdFx0b246IHtcclxuXHRcdFx0XHRcdC8vIGNsb3NlIHRoZSBzaWRlYmFyXHJcblx0XHRcdFx0XHRjbGljazogKCkgPT4gZG9jdW1lbnQuYm9keS5jbGFzc0xpc3QucmVtb3ZlKFwic2lkZWJhci1vcGVuXCIpXHJcblx0XHRcdFx0fVxyXG5cdFx0XHR9XHJcblx0XHRdO1xyXG5cdH0sXHJcblxyXG5cdGJpbmQob3B0cywge2FjdGlvbnMsIHNpZGViYXJ9KSB7XHJcblx0XHQvLyBhZGQgYSBjb21tYW5kIHRvIHRoZSBzaWRlYmFyXHJcblx0XHRsaWZlTGluZS5hZGRDb21tYW5kID0gZnVuY3Rpb24obmFtZSwgZm4pIHtcclxuXHRcdFx0Ly8gbWFrZSB0aGUgc2lkZWJhciBpdGVtXHJcblx0XHRcdHZhciB7aXRlbX0gPSBsaWZlTGluZS5tYWtlRG9tKHtcclxuXHRcdFx0XHRwYXJlbnQ6IHNpZGViYXIsXHJcblx0XHRcdFx0dGFnOiBcImRpdlwiLFxyXG5cdFx0XHRcdG5hbWU6IFwiaXRlbVwiLFxyXG5cdFx0XHRcdGNsYXNzZXM6IFwic2lkZWJhci1pdGVtXCIsXHJcblx0XHRcdFx0dGV4dDogbmFtZSxcclxuXHRcdFx0XHRvbjoge1xyXG5cdFx0XHRcdFx0Y2xpY2s6ICgpID0+IHtcclxuXHRcdFx0XHRcdFx0Ly8gY2xvc2UgdGhlIHNpZGViYXJcclxuXHRcdFx0XHRcdFx0ZG9jdW1lbnQuYm9keS5jbGFzc0xpc3QucmVtb3ZlKFwic2lkZWJhci1vcGVuXCIpO1xyXG5cclxuXHRcdFx0XHRcdFx0Ly8gY2FsbCB0aGUgbGlzdGVuZXJcclxuXHRcdFx0XHRcdFx0Zm4oKTtcclxuXHRcdFx0XHRcdH1cclxuXHRcdFx0XHR9XHJcblx0XHRcdH0pO1xyXG5cclxuXHRcdFx0cmV0dXJuIHtcclxuXHRcdFx0XHR1bnN1YnNjcmliZTogKCkgPT4gaXRlbS5yZW1vdmUoKVxyXG5cdFx0XHR9O1xyXG5cdFx0fTtcclxuXHJcblx0XHQvLyBhZGQgYSBuYXZpZ2F0aW9uYWwgY29tbWFuZFxyXG5cdFx0bGlmZUxpbmUuYWRkTmF2Q29tbWFuZCA9IGZ1bmN0aW9uKG5hbWUsIHRvKSB7XHJcblx0XHRcdGxpZmVMaW5lLmFkZENvbW1hbmQobmFtZSwgKCkgPT4gbGlmZUxpbmUubmF2Lm5hdmlnYXRlKHRvKSk7XHJcblx0XHR9O1xyXG5cclxuXHRcdC8vIGFkZCBhIHNpZGViYXIgYWN0aW9uXHJcblx0XHRsaWZlTGluZS5vbihcImFjdGlvbi1jcmVhdGVcIiwgbmFtZSA9PiB7XHJcblx0XHRcdC8vIHNob3cgdGhlIGFjdGlvbnNcclxuXHRcdFx0YWN0aW9ucy5jbGFzc0xpc3QucmVtb3ZlKFwiaGlkZGVuXCIpO1xyXG5cclxuXHRcdFx0Ly8gY3JlYXRlIHRoZSBidXR0b25cclxuXHRcdFx0bGlmZUxpbmUubWFrZURvbSh7XHJcblx0XHRcdFx0cGFyZW50OiBhY3Rpb25zLFxyXG5cdFx0XHRcdHRhZzogXCJkaXZcIixcclxuXHRcdFx0XHRuYW1lOiBcIml0ZW1cIixcclxuXHRcdFx0XHRjbGFzc2VzOiBcInNpZGViYXItaXRlbVwiLFxyXG5cdFx0XHRcdHRleHQ6IG5hbWUsXHJcblx0XHRcdFx0YXR0cnM6IHtcclxuXHRcdFx0XHRcdFwiZGF0YS1uYW1lXCI6IG5hbWVcclxuXHRcdFx0XHR9LFxyXG5cdFx0XHRcdG9uOiB7XHJcblx0XHRcdFx0XHRjbGljazogKCkgPT4ge1xyXG5cdFx0XHRcdFx0XHQvLyBjbG9zZSB0aGUgc2lkZWJhclxyXG5cdFx0XHRcdFx0XHRkb2N1bWVudC5ib2R5LmNsYXNzTGlzdC5yZW1vdmUoXCJzaWRlYmFyLW9wZW5cIik7XHJcblxyXG5cdFx0XHRcdFx0XHQvLyB0cmlnZ2VyIHRoZSBhY3Rpb25cclxuXHRcdFx0XHRcdFx0bGlmZUxpbmUuZW1pdChcImFjdGlvbi1leGVjLVwiICsgbmFtZSk7XHJcblx0XHRcdFx0XHR9XHJcblx0XHRcdFx0fVxyXG5cdFx0XHR9KTtcclxuXHJcblx0XHRcdC8vIHJlbW92ZSBhIHNpZGViYXIgYWN0aW9uXHJcblx0XHRcdGxpZmVMaW5lLm9uKFwiYWN0aW9uLXJlbW92ZVwiLCBuYW1lID0+IHtcclxuXHRcdFx0XHQvLyByZW1vdmUgdGhlIGJ1dHRvblxyXG5cdFx0XHRcdHZhciBidG4gPSBhY3Rpb25zLnF1ZXJ5U2VsZWN0b3IoYFtkYXRhLW5hbWU9XCIke25hbWV9XCJdYCk7XHJcblxyXG5cdFx0XHRcdGlmKGJ0bikgYnRuLnJlbW92ZSgpO1xyXG5cclxuXHRcdFx0XHQvLyBoaWRlIHRoZSBwYWdlIGFjdGlvbnMgaWYgdGhlcmUgYXJlIG5vbmVcclxuXHRcdFx0XHRpZihhY3Rpb25zLmNoaWxkcmVuLmxlbmd0aCA9PSAxKSB7XHJcblx0XHRcdFx0XHRhY3Rpb25zLmNsYXNzTGlzdC5hZGQoXCJoaWRkZW5cIik7XHJcblx0XHRcdFx0fVxyXG5cdFx0XHR9KTtcclxuXHJcblx0XHRcdC8vIHJlbW92ZSBhbGwgdGhlIHNpZGViYXIgYWN0aW9uc1xyXG5cdFx0XHRsaWZlTGluZS5vbihcImFjdGlvbi1yZW1vdmUtYWxsXCIsICgpID0+IHtcclxuXHRcdFx0XHQvLyByZW1vdmUgYWxsIHRoZSBhY3Rpb25zXHJcblx0XHRcdFx0dmFyIF9hY3Rpb25zID0gQXJyYXkuZnJvbShhY3Rpb25zLnF1ZXJ5U2VsZWN0b3JBbGwoXCIuc2lkZWJhci1pdGVtXCIpKTtcclxuXHJcblx0XHRcdFx0X2FjdGlvbnMuZm9yRWFjaChhY3Rpb24gPT4gYWN0aW9uLnJlbW92ZSgpKTtcclxuXHJcblx0XHRcdFx0Ly8gc2lkZSB0aGUgcGFnZSBhY3Rpb25zXHJcblx0XHRcdFx0YWN0aW9ucy5jbGFzc0xpc3QuYWRkKFwiaGlkZGVuXCIpO1xyXG5cdFx0XHR9KTtcclxuXHRcdH0pO1xyXG5cdH1cclxufSk7XHJcbiIsIi8qKlxyXG4gKiBLZWVwIGEgbGlzdCBvZiBzdWJzY3JpcHRpb25zIHRvIHVuc3Vic2NyaWJlIGZyb20gdG9nZXRoZXJcclxuICovXHJcblxyXG5leHBvcnQgZGVmYXVsdCBjbGFzcyBEaXNwb3NhYmxlIHtcclxuXHRjb25zdHJ1Y3RvcigpIHtcclxuXHRcdHRoaXMuX3N1YnNjcmlwdGlvbnMgPSBbXTtcclxuXHR9XHJcblxyXG5cdC8vIFVuc3Vic2NyaWJlIGZyb20gYWxsIHN1YnNjcmlwdGlvbnNcclxuXHRkaXNwb3NlKCkge1xyXG5cdFx0Ly8gcmVtb3ZlIHRoZSBmaXJzdCBzdWJzY3JpcHRpb24gdW50aWwgdGhlcmUgYXJlIG5vbmUgbGVmdFxyXG5cdFx0d2hpbGUodGhpcy5fc3Vic2NyaXB0aW9ucy5sZW5ndGggPiAwKSB7XHJcblx0XHRcdHRoaXMuX3N1YnNjcmlwdGlvbnMuc2hpZnQoKS51bnN1YnNjcmliZSgpO1xyXG5cdFx0fVxyXG5cdH1cclxuXHJcblx0Ly8gQWRkIGEgc3Vic2NyaXB0aW9uIHRvIHRoZSBkaXNwb3NhYmxlXHJcblx0YWRkKHN1YnNjcmlwdGlvbikge1xyXG5cdFx0Ly8gY29weSB0aGUgZGlzcG9zYWJsZVxyXG5cdFx0aWYoc3Vic2NyaXB0aW9uIGluc3RhbmNlb2YgRGlzcG9zYWJsZSkge1xyXG5cdFx0XHQvLyBjb3B5IHRoZSBzdWJzY3JpcHRpb25zIGZyb20gdGhlIGRpc3Bvc2FibGVcclxuXHRcdFx0dGhpcy5fc3Vic2NyaXB0aW9ucyA9IHRoaXMuX3N1YnNjcmlwdGlvbnMuY29uY2F0KHN1YnNjcmlwdGlvbi5fc3Vic2NyaXB0aW9ucyk7XHJcblxyXG5cdFx0XHQvLyByZW1vdmUgdGhlIHJlZnJlbmNlcyBmcm9tIHRoZSBkaXNwb3NhYmxlXHJcblx0XHRcdHN1YnNjcmlwdGlvbi5fc3Vic2NyaXB0aW9ucyA9IFtdO1xyXG5cdFx0fVxyXG5cdFx0Ly8gYWRkIGEgc3Vic2NyaXB0aW9uXHJcblx0XHRlbHNlIHtcclxuXHRcdFx0dGhpcy5fc3Vic2NyaXB0aW9ucy5wdXNoKHN1YnNjcmlwdGlvbik7XHJcblx0XHR9XHJcblx0fVxyXG5cclxuXHQvLyBkaXNwb3NlIHdoZW4gYW4gZXZlbnQgaXMgZmlyZWRcclxuXHRkaXNwb3NlT24oZW1pdHRlciwgZXZlbnQpIHtcclxuXHRcdHRoaXMuYWRkKGVtaXR0ZXIub24oZXZlbnQsICgpID0+IHRoaXMuZGlzcG9zZSgpKSk7XHJcblx0fVxyXG59O1xyXG4iLCIvKipcclxuICogQSBiYXNpYyBldmVudCBlbWl0dGVyXHJcbiAqL1xyXG5cclxuZXhwb3J0IGRlZmF1bHQgY2xhc3MgRXZlbnRFbWl0dGVyIHtcclxuXHRjb25zdHJ1Y3RvcigpIHtcclxuXHRcdHRoaXMuX2xpc3RlbmVycyA9IHt9O1xyXG5cdH1cclxuXHJcblx0LyoqXHJcblx0ICogQWRkIGFuIGV2ZW50IGxpc3RlbmVyXHJcblx0ICovXHJcblx0b24obmFtZSwgbGlzdGVuZXIpIHtcclxuXHRcdC8vIGlmIHdlIGRvbid0IGhhdmUgYW4gZXhpc3RpbmcgbGlzdGVuZXJzIGFycmF5IGNyZWF0ZSBvbmVcclxuXHRcdGlmKCF0aGlzLl9saXN0ZW5lcnNbbmFtZV0pIHtcclxuXHRcdFx0dGhpcy5fbGlzdGVuZXJzW25hbWVdID0gW107XHJcblx0XHR9XHJcblxyXG5cdFx0Ly8gYWRkIHRoZSBsaXN0ZW5lclxyXG5cdFx0dGhpcy5fbGlzdGVuZXJzW25hbWVdLnB1c2gobGlzdGVuZXIpO1xyXG5cclxuXHRcdC8vIGdpdmUgdGhlbSBhIHN1YnNjcmlwdGlvblxyXG5cdFx0cmV0dXJuIHtcclxuXHRcdFx0X2xpc3RlbmVyOiBsaXN0ZW5lcixcclxuXHJcblx0XHRcdHVuc3Vic2NyaWJlOiAoKSA9PiB7XHJcblx0XHRcdFx0Ly8gZmluZCB0aGUgbGlzdGVuZXJcclxuXHRcdFx0XHR2YXIgaW5kZXggPSB0aGlzLl9saXN0ZW5lcnNbbmFtZV0uaW5kZXhPZihsaXN0ZW5lcik7XHJcblxyXG5cdFx0XHRcdGlmKGluZGV4ICE9PSAtMSkge1xyXG5cdFx0XHRcdFx0dGhpcy5fbGlzdGVuZXJzW25hbWVdLnNwbGljZShpbmRleCwgMSk7XHJcblx0XHRcdFx0fVxyXG5cdFx0XHR9XHJcblx0XHR9O1xyXG5cdH1cclxuXHJcblx0LyoqXHJcblx0ICogRW1pdCBhbiBldmVudFxyXG5cdCAqL1xyXG5cdGVtaXQobmFtZSwgLi4uYXJncykge1xyXG5cdFx0Ly8gY2hlY2sgZm9yIGxpc3RlbmVyc1xyXG5cdFx0aWYodGhpcy5fbGlzdGVuZXJzW25hbWVdKSB7XHJcblx0XHRcdGZvcihsZXQgbGlzdGVuZXIgb2YgdGhpcy5fbGlzdGVuZXJzW25hbWVdKSB7XHJcblx0XHRcdFx0Ly8gY2FsbCB0aGUgbGlzdGVuZXJzXHJcblx0XHRcdFx0bGlzdGVuZXIoLi4uYXJncyk7XHJcblx0XHRcdH1cclxuXHRcdH1cclxuXHR9XHJcblxyXG5cdC8qKlxyXG5cdCAqIEVtaXQgYW4gZXZlbnQgYW5kIHNraXAgc29tZSBsaXN0ZW5lcnNcclxuXHQgKi9cclxuXHRwYXJ0aWFsRW1pdChuYW1lLCBza2lwcyA9IFtdLCAuLi5hcmdzKSB7XHJcblx0XHQvLyBhbGxvdyBhIHNpbmdsZSBpdGVtXHJcblx0XHRpZighQXJyYXkuaXNBcnJheShza2lwcykpIHtcclxuXHRcdFx0c2tpcHMgPSBbc2tpcHNdO1xyXG5cdFx0fVxyXG5cclxuXHRcdC8vIGNoZWNrIGZvciBsaXN0ZW5lcnNcclxuXHRcdGlmKHRoaXMuX2xpc3RlbmVyc1tuYW1lXSkge1xyXG5cdFx0XHRmb3IobGV0IGxpc3RlbmVyIG9mIHRoaXMuX2xpc3RlbmVyc1tuYW1lXSkge1xyXG5cdFx0XHRcdC8vIHRoaXMgZXZlbnQgbGlzdGVuZXIgaXMgYmVpbmcgc2tpcGVkXHJcblx0XHRcdFx0aWYoc2tpcHMuZmluZChza2lwID0+IHNraXAuX2xpc3RlbmVyID09IGxpc3RlbmVyKSkge1xyXG5cdFx0XHRcdFx0Y29udGludWU7XHJcblx0XHRcdFx0fVxyXG5cclxuXHRcdFx0XHQvLyBjYWxsIHRoZSBsaXN0ZW5lcnNcclxuXHRcdFx0XHRsaXN0ZW5lciguLi5hcmdzKTtcclxuXHRcdFx0fVxyXG5cdFx0fVxyXG5cdH1cclxufVxyXG4iLCIvKipcclxuICogQ3JlYXRlIGEgZ2xvYmFsIG9iamVjdCB3aXRoIGNvbW1vbmx5IHVzZWQgbW9kdWxlcyB0byBhdm9pZCA1MCBtaWxsaW9uIHJlcXVpcmVzXHJcbiAqL1xyXG5cclxuaW1wb3J0IEV2ZW50RW1pdHRlciBmcm9tIFwiLi9ldmVudC1lbWl0dGVyXCI7XHJcblxyXG52YXIgbGlmZUxpbmUgPSBuZXcgRXZlbnRFbWl0dGVyKCk7XHJcblxyXG4vLyBwbGF0Zm9ybSBkZXRlY3Rpb25cclxubGlmZUxpbmUubm9kZSA9IHR5cGVvZiBwcm9jZXNzID09IFwib2JqZWN0XCI7XHJcbmxpZmVMaW5lLmJyb3dzZXIgPSB0eXBlb2Ygd2luZG93ID09IFwib2JqZWN0XCI7XHJcblxyXG4vLyBhdHRhY2ggdXRpbHNcclxubGlmZUxpbmUuRGlzcG9zYWJsZSA9IHJlcXVpcmUoXCIuL2Rpc3Bvc2FibGVcIikuZGVmYXVsdDtcclxubGlmZUxpbmUuRXZlbnRFbWl0dGVyID0gRXZlbnRFbWl0dGVyO1xyXG5cclxuLy8gYXR0YWNoIGxpZmVsaW5lIHRvIHRoZSBnbG9iYWwgb2JqZWN0XHJcbihsaWZlTGluZS5ub2RlID8gZ2xvYmFsIDogYnJvd3NlcikubGlmZUxpbmUgPSBsaWZlTGluZTtcclxuIl19
