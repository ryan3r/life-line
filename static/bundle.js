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

require("./widgets/toggle-btns");

var _lists = require("./views/lists");

require("./views/item");

require("./views/edit");

require("./views/login");

require("./views/account");

require("./views/users");

var _dataStore = require("./data-store");

(0, _dataStore.store)("assignments").setInit(function (item) {
	// parse the date
	if (typeof item.date == "string") {
		item.date = new Date(item.date);
	}
});

// instantiate the dom


// set up the data store


// load all the views


// load all the widgets
// create the global object
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

},{"../common/global":21,"./data-store":2,"./global":3,"./views/account":7,"./views/edit":8,"./views/item":9,"./views/lists":10,"./views/login":11,"./views/users":12,"./widgets/content":13,"./widgets/input":14,"./widgets/link":15,"./widgets/list":16,"./widgets/sidebar":17,"./widgets/toggle-btns":18}],5:[function(require,module,exports){
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
		return !item.done && (item.type == "task" || (0, _date.isSameDate)(today, item.date));
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

},{}],19:[function(require,module,exports){
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

},{}],20:[function(require,module,exports){
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

},{}],21:[function(require,module,exports){
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

},{"./disposable":19,"./event-emitter":20,"_process":1}]},{},[4])
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCJub2RlX21vZHVsZXMvcHJvY2Vzcy9icm93c2VyLmpzIiwic3JjXFxjbGllbnRcXGRhdGEtc3RvcmUuanMiLCJzcmNcXGNsaWVudFxcZ2xvYmFsLmpzIiwic3JjXFxjbGllbnRcXGluZGV4LmpzIiwic3JjXFxjbGllbnRcXHV0aWxcXGRhdGUuanMiLCJzcmNcXGNsaWVudFxcdXRpbFxcZG9tLW1ha2VyLmpzIiwic3JjXFxjbGllbnRcXHZpZXdzXFxhY2NvdW50LmpzIiwic3JjXFxjbGllbnRcXHZpZXdzXFxlZGl0LmpzIiwic3JjXFxjbGllbnRcXHZpZXdzXFxpdGVtLmpzIiwic3JjXFxjbGllbnRcXHZpZXdzXFxsaXN0cy5qcyIsInNyY1xcY2xpZW50XFx2aWV3c1xcbG9naW4uanMiLCJzcmNcXGNsaWVudFxcdmlld3NcXHVzZXJzLmpzIiwic3JjXFxjbGllbnRcXHdpZGdldHNcXGNvbnRlbnQuanMiLCJzcmNcXGNsaWVudFxcd2lkZ2V0c1xcaW5wdXQuanMiLCJzcmNcXGNsaWVudFxcd2lkZ2V0c1xcbGluay5qcyIsInNyY1xcY2xpZW50XFx3aWRnZXRzXFxsaXN0LmpzIiwic3JjXFxjbGllbnRcXHdpZGdldHNcXHNpZGViYXIuanMiLCJzcmNcXGNsaWVudFxcd2lkZ2V0c1xcdG9nZ2xlLWJ0bnMuanMiLCJzcmNcXGNvbW1vblxcZGlzcG9zYWJsZS5qcyIsInNyY1xcY29tbW9uXFxldmVudC1lbWl0dGVyLmpzIiwic3JjXFxjb21tb25cXHNyY1xcY29tbW9uXFxnbG9iYWwuanMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7QUNBQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7Ozs7Ozs7OztRQ3pLZ0IsSyxHQUFBLEs7Ozs7Ozs7O0FBWGhCOzs7O0FBSUEsSUFBTSxnQkFBZ0IsSUFBdEI7QUFDQSxJQUFNLGtCQUFrQixZQUF4Qjs7QUFFQTtBQUNBLElBQUksU0FBUyxFQUFiOztBQUVBO0FBQ08sU0FBUyxLQUFULENBQWUsSUFBZixFQUFxQjtBQUMzQjtBQUNBLEtBQUcsUUFBUSxNQUFYLEVBQW1CO0FBQ2xCLFNBQU8sT0FBTyxJQUFQLENBQVA7QUFDQTs7QUFFRCxLQUFJLFFBQVEsSUFBSSxLQUFKLENBQVUsSUFBVixDQUFaOztBQUVBO0FBQ0EsUUFBTyxJQUFQLElBQWUsS0FBZjs7QUFFQSxRQUFPLEtBQVA7QUFDQTs7SUFFSyxLOzs7QUFDTCxnQkFBWSxJQUFaLEVBQWtCO0FBQUE7O0FBQUE7O0FBRWpCLFFBQUssSUFBTCxHQUFZLElBQVo7QUFDQSxRQUFLLE1BQUwsR0FBYyxFQUFkO0FBQ0E7QUFDQSxRQUFLLFdBQUwsR0FBbUIsRUFBbkI7QUFMaUI7QUFNakI7O0FBRUQ7Ozs7OzBCQUNRLEUsRUFBSTtBQUNYLFFBQUssYUFBTCxHQUFxQixFQUFyQjtBQUNBOztBQUVEOzs7OzJCQUNTLE0sRUFBUSxHLEVBQUssSSxFQUFNO0FBQUE7O0FBQzNCLFNBQU0sa0JBQWtCLEdBQXhCOztBQUVBO0FBQ0EsT0FBRyxVQUFVLEtBQWIsRUFBb0I7QUFDbkI7QUFDQSxRQUFHLEtBQUssV0FBTCxDQUFpQixPQUFqQixDQUF5QixHQUF6QixNQUFrQyxDQUFDLENBQXRDLEVBQXlDOztBQUV6QyxTQUFLLFdBQUwsQ0FBaUIsSUFBakIsQ0FBc0IsR0FBdEI7QUFDQTs7QUFFRDtBQUNBLFVBQU8sTUFBTSxHQUFOLEVBQVc7QUFDakIsWUFBUSxNQURTO0FBRWpCLGlCQUFhLFNBRkk7QUFHakIsVUFBTSxRQUFRLEtBQUssU0FBTCxDQUFlLElBQWY7QUFIRyxJQUFYOztBQU1QO0FBTk8sSUFPTixJQVBNLENBT0Q7QUFBQSxXQUFPLElBQUksSUFBSixFQUFQO0FBQUEsSUFQQyxFQVNOLElBVE0sQ0FTRCxlQUFPO0FBQ1o7QUFDQSxRQUFHLFVBQVUsS0FBYixFQUFvQjtBQUNuQixTQUFJLFFBQVEsT0FBSyxXQUFMLENBQWlCLE9BQWpCLENBQXlCLEdBQXpCLENBQVo7O0FBRUEsU0FBRyxVQUFVLENBQUMsQ0FBZCxFQUFpQixPQUFLLFdBQUwsQ0FBaUIsTUFBakIsQ0FBd0IsS0FBeEIsRUFBK0IsQ0FBL0I7QUFDakI7O0FBRUQ7QUFDQSxRQUFHLElBQUksTUFBSixJQUFjLFNBQWQsSUFBMkIsVUFBVSxLQUF4QyxFQUErQztBQUM5QztBQUNBLFNBQUcsTUFBTSxPQUFOLENBQWMsSUFBSSxJQUFsQixDQUFILEVBQTRCO0FBQzNCLFVBQUksSUFBSixDQUFTLE9BQVQsQ0FBaUIsZ0JBQVE7QUFDeEI7QUFDQSxXQUFHLE9BQUssYUFBUixFQUF1QjtBQUN0QixlQUFPLE9BQUssYUFBTCxDQUFtQixJQUFuQixLQUE0QixJQUFuQztBQUNBOztBQUVEO0FBQ0EsY0FBSyxNQUFMLENBQVksS0FBSyxFQUFqQixJQUF1QixJQUF2QjtBQUNBLE9BUkQ7QUFTQSxNQVZELE1BV0s7QUFDSixVQUFJLE9BQU8sSUFBSSxJQUFmOztBQUVBO0FBQ0EsVUFBRyxPQUFLLGFBQVIsRUFBdUI7QUFDdEIsY0FBTyxPQUFLLGFBQUwsQ0FBbUIsSUFBbkIsS0FBNEIsSUFBbkM7QUFDQTs7QUFFRCxhQUFLLE1BQUwsQ0FBWSxJQUFJLElBQUosQ0FBUyxFQUFyQixJQUEyQixJQUEzQjtBQUNBOztBQUVEO0FBQ0EsWUFBSyxJQUFMLENBQVUsUUFBVjtBQUNBOztBQUVEO0FBQ0EsUUFBRyxJQUFJLE1BQUosSUFBYyxPQUFqQixFQUEwQjtBQUN6QixXQUFNLElBQUksS0FBSixDQUFVLElBQUksSUFBZCxDQUFOO0FBQ0E7O0FBRUQ7QUFDQSxRQUFHLElBQUksTUFBSixJQUFjLE1BQWQsSUFBd0IsSUFBSSxJQUFKLENBQVMsTUFBVCxJQUFtQixZQUE5QyxFQUE0RDtBQUMzRCxjQUFTLEdBQVQsQ0FBYSxRQUFiLENBQXNCLFFBQXRCO0FBQ0E7QUFDRCxJQXZETSxDQUFQO0FBd0RBOztBQUVEOzs7O3lCQUNPLEUsRUFBSTtBQUFBOztBQUNWO0FBQ0EsTUFBRyxnQkFBZ0IsS0FBSyxNQUFyQixDQUFIOztBQUVBO0FBQ0EsUUFBSyxRQUFMLENBQWMsS0FBZCxFQUFxQixLQUFLLElBQTFCOztBQUVBO0FBQ0EsVUFBTyxLQUFLLEVBQUwsQ0FBUSxRQUFSLEVBQWtCLFlBQU07QUFDOUI7QUFDQSxPQUFHLGdCQUFnQixPQUFLLE1BQXJCLENBQUg7QUFDQSxJQUhNLENBQVA7QUFJQTs7QUFFRDs7OztzQkFDSSxFLEVBQUksRSxFQUFJO0FBQUE7O0FBQ1g7QUFDQSxNQUFHLEtBQUssTUFBTCxDQUFZLEVBQVosQ0FBSDs7QUFFQTtBQUNBLFFBQUssUUFBTCxDQUFjLEtBQWQsRUFBcUIsS0FBSyxJQUFMLEdBQVksR0FBWixHQUFrQixFQUF2Qzs7QUFFQTtBQUNBLFVBQU8sS0FBSyxFQUFMLENBQVEsUUFBUixFQUFrQixZQUFNO0FBQzlCLE9BQUcsT0FBSyxNQUFMLENBQVksRUFBWixDQUFIO0FBQ0EsSUFGTSxDQUFQO0FBR0E7O0FBRUQ7Ozs7c0JBQ0ksSyxFQUFPLEssRUFBTztBQUFBOztBQUNqQjtBQUNBLFFBQUssTUFBTCxDQUFZLE1BQU0sRUFBbEIsSUFBd0IsS0FBeEI7O0FBRUE7QUFDQSxZQUFTLE1BQU0sRUFBZixFQUFtQixZQUFNO0FBQ3hCLFdBQUssUUFBTCxDQUFjLEtBQWQsRUFBd0IsT0FBSyxJQUE3QixTQUFxQyxNQUFNLEVBQTNDLEVBQWlELEtBQWpEO0FBQ0EsSUFGRDs7QUFJQTtBQUNBLFFBQUssV0FBTCxDQUFpQixRQUFqQixFQUEyQixLQUEzQjtBQUNBOztBQUVEOzs7O3lCQUNPLEUsRUFBSSxLLEVBQU87QUFDakI7QUFDQSxVQUFPLEtBQUssTUFBTCxDQUFZLEVBQVosQ0FBUDs7QUFFQTtBQUNBLFFBQUssUUFBTCxDQUFjLFFBQWQsRUFBMkIsS0FBSyxJQUFoQyxTQUF3QyxFQUF4Qzs7QUFFQTtBQUNBLFFBQUssV0FBTCxDQUFpQixRQUFqQixFQUEyQixLQUEzQjtBQUNBOzs7O0VBMUlrQixTQUFTLFk7O0FBNkk3Qjs7O0FBQ0EsSUFBSSxrQkFBa0IsVUFBUyxHQUFULEVBQWM7QUFDbkMsUUFBTyxPQUFPLG1CQUFQLENBQTJCLEdBQTNCLEVBQ0wsR0FESyxDQUNEO0FBQUEsU0FBUSxJQUFJLElBQUosQ0FBUjtBQUFBLEVBREMsQ0FBUDtBQUVBLENBSEQ7O0FBS0E7QUFDQSxJQUFJLGlCQUFpQixFQUFyQjs7QUFFQSxJQUFJLFdBQVcsVUFBQyxFQUFELEVBQUssRUFBTCxFQUFZO0FBQzFCO0FBQ0EsY0FBYSxlQUFlLEVBQWYsQ0FBYjtBQUNBO0FBQ0EsZ0JBQWUsRUFBZixJQUFxQixXQUFXLEVBQVgsRUFBZSxhQUFmLENBQXJCO0FBQ0EsQ0FMRDs7Ozs7QUMvS0E7Ozs7QUFJQSxTQUFTLE9BQVQsR0FBbUIsUUFBUSxrQkFBUixFQUE0QixPQUEvQzs7QUFFQTtBQUNBLFNBQVMsU0FBVCxHQUFxQixVQUFTLElBQVQsRUFBZSxFQUFmLEVBQW1CO0FBQ3ZDO0FBQ0EsS0FBSSxXQUFXLFNBQVMsRUFBVCxDQUFZLGlCQUFpQixJQUE3QixFQUFtQyxFQUFuQyxDQUFmOztBQUVBO0FBQ0EsVUFBUyxJQUFULENBQWMsZUFBZCxFQUErQixJQUEvQjs7QUFFQTtBQUNBLEtBQUksWUFBWSxTQUFTLEVBQVQsQ0FBWSxtQkFBWixFQUFpQyxZQUFNO0FBQ3REO0FBQ0EsV0FBUyxXQUFUO0FBQ0EsWUFBVSxXQUFWO0FBQ0EsRUFKZSxDQUFoQjs7QUFNQSxRQUFPO0FBQ04sYUFETSxjQUNRO0FBQ2I7QUFDQSxZQUFTLFdBQVQ7QUFDQSxhQUFVLFdBQVY7O0FBRUE7QUFDQSxZQUFTLElBQVQsQ0FBYyxlQUFkLEVBQStCLElBQS9CO0FBQ0E7QUFSSyxFQUFQO0FBVUEsQ0F4QkQ7Ozs7O0FDTkE7O0FBQ0E7O0FBR0E7O0FBQ0E7O0FBQ0E7O0FBQ0E7O0FBQ0E7O0FBQ0E7O0FBR0E7O0FBQ0E7O0FBQ0E7O0FBQ0E7O0FBQ0E7O0FBQ0E7O0FBR0E7O0FBRUEsc0JBQU0sYUFBTixFQUFxQixPQUFyQixDQUE2QixVQUFTLElBQVQsRUFBZTtBQUMzQztBQUNBLEtBQUcsT0FBTyxLQUFLLElBQVosSUFBb0IsUUFBdkIsRUFBaUM7QUFDaEMsT0FBSyxJQUFMLEdBQVksSUFBSSxJQUFKLENBQVMsS0FBSyxJQUFkLENBQVo7QUFDQTtBQUNELENBTEQ7O0FBT0E7OztBQVZBOzs7QUFSQTs7O0FBUkE7QUFKQTtBQStCQSxTQUFTLE9BQVQsQ0FBaUI7QUFDaEIsU0FBUSxTQUFTLElBREQ7QUFFaEIsUUFBTyxDQUNOLEVBQUUsUUFBUSxTQUFWLEVBRE0sRUFFTixFQUFFLFFBQVEsU0FBVixFQUZNO0FBRlMsQ0FBakI7O0FBUUE7QUFDQTs7QUFFQTtBQUNBLFNBQVMsVUFBVCxDQUFvQixnQkFBcEIsRUFBc0MsWUFBTTtBQUMzQyxLQUFJLEtBQUssS0FBSyxLQUFMLENBQVcsS0FBSyxNQUFMLEtBQWdCLFNBQTNCLENBQVQ7O0FBRUEsVUFBUyxHQUFULENBQWEsUUFBYixDQUFzQixXQUFXLEVBQWpDO0FBQ0EsQ0FKRDs7QUFNQTtBQUNBLFNBQVMsYUFBVCxDQUF1QixTQUF2QixFQUFrQyxVQUFsQzs7Ozs7Ozs7UUM3Q2lCLFUsR0FBQSxVO1FBT0EsWSxHQUFBLFk7UUFnQkEsVyxHQUFBLFc7UUFZQSxhLEdBQUEsYTtRQStCRCxVLEdBQUEsVTtRQU9BLGEsR0FBQSxhO0FBOUVoQjs7OztBQUlDO0FBQ08sU0FBUyxVQUFULENBQW9CLEtBQXBCLEVBQTJCLEtBQTNCLEVBQWtDO0FBQ3hDLFNBQU8sTUFBTSxXQUFOLE1BQXVCLE1BQU0sV0FBTixFQUF2QixJQUNOLE1BQU0sUUFBTixNQUFvQixNQUFNLFFBQU4sRUFEZCxJQUVOLE1BQU0sT0FBTixNQUFtQixNQUFNLE9BQU4sRUFGcEI7QUFHQTs7QUFFRDtBQUNPLFNBQVMsWUFBVCxDQUFzQixLQUF0QixFQUE2QixLQUE3QixFQUFvQztBQUN2QztBQUNBLE1BQUcsTUFBTSxXQUFOLE1BQXVCLE1BQU0sV0FBTixFQUExQixFQUErQztBQUMzQyxXQUFPLE1BQU0sV0FBTixLQUFzQixNQUFNLFdBQU4sRUFBN0I7QUFDSDs7QUFFRDtBQUNBLE1BQUcsTUFBTSxRQUFOLE1BQW9CLE1BQU0sUUFBTixFQUF2QixFQUF5QztBQUNyQyxXQUFPLE1BQU0sUUFBTixLQUFtQixNQUFNLFFBQU4sRUFBMUI7QUFDSDs7QUFFRDtBQUNBLFNBQU8sTUFBTSxPQUFOLEtBQWtCLE1BQU0sT0FBTixFQUF6QjtBQUNIOztBQUVEO0FBQ08sU0FBUyxXQUFULENBQXFCLElBQXJCLEVBQTJCO0FBQ2pDLE1BQUksT0FBTyxJQUFJLElBQUosRUFBWDs7QUFFQTtBQUNBLE9BQUssT0FBTCxDQUFhLEtBQUssT0FBTCxLQUFpQixJQUE5Qjs7QUFFQSxTQUFPLElBQVA7QUFDQTs7QUFFRCxJQUFNLGNBQWMsQ0FBQyxRQUFELEVBQVcsUUFBWCxFQUFxQixTQUFyQixFQUFnQyxXQUFoQyxFQUE2QyxVQUE3QyxFQUF5RCxRQUF6RCxFQUFtRSxVQUFuRSxDQUFwQjs7QUFFQTtBQUNPLFNBQVMsYUFBVCxDQUF1QixJQUF2QixFQUF3QztBQUFBLE1BQVgsSUFBVyx1RUFBSixFQUFJOztBQUM5QyxNQUFJLE9BQUo7QUFBQSxNQUFhLFVBQVUsRUFBdkI7O0FBRUc7QUFDQSxNQUFJLFlBQVksS0FBSyxPQUFMLEtBQWlCLEtBQUssR0FBTCxFQUFqQzs7QUFFSDtBQUNBLE1BQUcsV0FBVyxJQUFYLEVBQWlCLElBQUksSUFBSixFQUFqQixDQUFILEVBQ0MsVUFBVSxPQUFWOztBQUVEO0FBSEEsT0FJSyxJQUFHLFdBQVcsSUFBWCxFQUFpQixZQUFZLENBQVosQ0FBakIsS0FBb0MsQ0FBQyxTQUF4QyxFQUNKLFVBQVUsVUFBVjs7QUFFRDtBQUhLLFNBSUEsSUFBRyxhQUFhLElBQWIsRUFBbUIsWUFBWSxDQUFaLENBQW5CLEtBQXNDLENBQUMsU0FBMUMsRUFDSixVQUFVLFlBQVksS0FBSyxNQUFMLEVBQVosQ0FBVjs7QUFFRDtBQUhLLFdBS0osVUFBYSxZQUFZLEtBQUssTUFBTCxFQUFaLENBQWIsVUFBMkMsS0FBSyxRQUFMLEtBQWtCLENBQTdELFVBQWtFLEtBQUssT0FBTCxFQUFsRTs7QUFFRjtBQUNBLE1BQUcsS0FBSyxXQUFMLElBQW9CLENBQUMsV0FBVyxJQUFYLEVBQWlCLEtBQUssU0FBdEIsQ0FBeEIsRUFBMEQ7QUFDekQsV0FBTyxVQUFVLElBQVYsR0FBaUIsY0FBYyxJQUFkLENBQXhCO0FBQ0E7O0FBRUQsU0FBTyxPQUFQO0FBQ0M7O0FBRUY7QUFDTyxTQUFTLFVBQVQsQ0FBb0IsSUFBcEIsRUFBc0M7QUFBQSxNQUFaLEtBQVksdUVBQUosRUFBSTs7QUFDNUMsU0FBTyxNQUFNLElBQU4sQ0FBVyxnQkFBUTtBQUN6QixXQUFPLEtBQUssSUFBTCxLQUFjLEtBQUssUUFBTCxFQUFkLElBQWlDLEtBQUssTUFBTCxLQUFnQixLQUFLLFVBQUwsRUFBeEQ7QUFDQSxHQUZNLENBQVA7QUFHQTs7QUFFRDtBQUNPLFNBQVMsYUFBVCxDQUF1QixJQUF2QixFQUE2QjtBQUNuQyxNQUFJLE9BQU8sS0FBSyxRQUFMLEVBQVg7O0FBRUE7QUFDQSxNQUFJLE9BQU8sT0FBTyxFQUFsQjs7QUFFQTtBQUNBLE1BQUcsU0FBUyxDQUFaLEVBQWUsT0FBTyxFQUFQO0FBQ2Y7QUFDQSxNQUFHLE9BQU8sRUFBVixFQUFjLE9BQU8sT0FBTyxFQUFkOztBQUVkLE1BQUksU0FBUyxLQUFLLFVBQUwsRUFBYjs7QUFFQTtBQUNBLE1BQUcsU0FBUyxFQUFaLEVBQWdCLFNBQVMsTUFBTSxNQUFmOztBQUVoQixTQUFPLE9BQU8sR0FBUCxHQUFhLE1BQWIsSUFBdUIsT0FBTyxJQUFQLEdBQWMsSUFBckMsQ0FBUDtBQUNBOzs7Ozs7OztrQkNtQ3VCLEk7QUFsSXhCOzs7O0FBSUEsSUFBTSxlQUFlLENBQUMsS0FBRCxFQUFRLE1BQVIsQ0FBckI7QUFDQSxJQUFNLGdCQUFnQiw0QkFBdEI7O0FBRUE7QUFDQSxJQUFJLFVBQVUsWUFBb0I7QUFBQSxLQUFYLElBQVcsdUVBQUosRUFBSTs7QUFDakM7QUFDQSxLQUFJLFNBQVMsS0FBSyxNQUFMLElBQWUsRUFBNUI7O0FBRUEsS0FBSSxHQUFKOztBQUVBO0FBQ0EsS0FBRyxhQUFhLE9BQWIsQ0FBcUIsS0FBSyxHQUExQixNQUFtQyxDQUFDLENBQXZDLEVBQTBDO0FBQ3pDLFFBQU0sU0FBUyxlQUFULENBQXlCLGFBQXpCLEVBQXdDLEtBQUssR0FBN0MsQ0FBTjtBQUNBO0FBQ0Q7QUFIQSxNQUlLO0FBQ0osU0FBTSxTQUFTLGFBQVQsQ0FBdUIsS0FBSyxHQUFMLElBQVksS0FBbkMsQ0FBTjtBQUNBOztBQUVEO0FBQ0EsS0FBRyxLQUFLLE9BQVIsRUFBaUI7QUFDaEIsTUFBSSxZQUFKLENBQWlCLE9BQWpCLEVBQTBCLE9BQU8sS0FBSyxPQUFaLElBQXVCLFFBQXZCLEdBQWtDLEtBQUssT0FBdkMsR0FBaUQsS0FBSyxPQUFMLENBQWEsSUFBYixDQUFrQixHQUFsQixDQUEzRTtBQUNBOztBQUVEO0FBQ0EsS0FBRyxLQUFLLEtBQVIsRUFBZTtBQUNkLFNBQU8sbUJBQVAsQ0FBMkIsS0FBSyxLQUFoQyxFQUVDLE9BRkQsQ0FFUztBQUFBLFVBQVEsSUFBSSxZQUFKLENBQWlCLElBQWpCLEVBQXVCLEtBQUssS0FBTCxDQUFXLElBQVgsQ0FBdkIsQ0FBUjtBQUFBLEdBRlQ7QUFHQTs7QUFFRDtBQUNBLEtBQUcsS0FBSyxJQUFSLEVBQWM7QUFDYixNQUFJLFNBQUosR0FBZ0IsS0FBSyxJQUFyQjtBQUNBOztBQUVEO0FBQ0EsS0FBRyxLQUFLLE1BQVIsRUFBZ0I7QUFDZixPQUFLLE1BQUwsQ0FBWSxZQUFaLENBQXlCLEdBQXpCLEVBQThCLEtBQUssTUFBbkM7QUFDQTs7QUFFRDtBQUNBLEtBQUcsS0FBSyxFQUFSLEVBQVk7QUFBQSx3QkFDSCxJQURHO0FBRVYsT0FBSSxnQkFBSixDQUFxQixJQUFyQixFQUEyQixLQUFLLEVBQUwsQ0FBUSxJQUFSLENBQTNCOztBQUVBO0FBQ0EsT0FBRyxLQUFLLElBQVIsRUFBYztBQUNiLFNBQUssSUFBTCxDQUFVLEdBQVYsQ0FBYztBQUNiLGtCQUFhO0FBQUEsYUFBTSxJQUFJLG1CQUFKLENBQXdCLElBQXhCLEVBQThCLEtBQUssRUFBTCxDQUFRLElBQVIsQ0FBOUIsQ0FBTjtBQUFBO0FBREEsS0FBZDtBQUdBO0FBVFM7O0FBQUE7QUFBQTtBQUFBOztBQUFBO0FBQ1gsd0JBQWdCLE9BQU8sbUJBQVAsQ0FBMkIsS0FBSyxFQUFoQyxDQUFoQiw4SEFBcUQ7QUFBQSxRQUE3QyxJQUE2Qzs7QUFBQSxVQUE3QyxJQUE2QztBQVNwRDtBQVZVO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFXWDs7QUFFRDtBQUNBLEtBQUcsS0FBSyxLQUFSLEVBQWU7QUFDZCxNQUFJLEtBQUosR0FBWSxLQUFLLEtBQWpCO0FBQ0E7O0FBRUQ7QUFDQSxLQUFHLEtBQUssSUFBUixFQUFjO0FBQ2IsU0FBTyxLQUFLLElBQVosSUFBb0IsR0FBcEI7QUFDQTs7QUFFRDtBQUNBLEtBQUcsS0FBSyxRQUFSLEVBQWtCO0FBQUE7QUFBQTtBQUFBOztBQUFBO0FBQ2pCLHlCQUFpQixLQUFLLFFBQXRCLG1JQUFnQztBQUFBLFFBQXhCLEtBQXdCOztBQUMvQjtBQUNBLFFBQUcsTUFBTSxPQUFOLENBQWMsS0FBZCxDQUFILEVBQXlCO0FBQ3hCLGFBQVE7QUFDUCxhQUFPO0FBREEsTUFBUjtBQUdBOztBQUVEO0FBQ0EsVUFBTSxNQUFOLEdBQWUsR0FBZjtBQUNBLFVBQU0sSUFBTixHQUFhLEtBQUssSUFBbEI7QUFDQSxVQUFNLE1BQU4sR0FBZSxNQUFmOztBQUVBO0FBQ0EsU0FBSyxLQUFMO0FBQ0E7QUFoQmdCO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFpQmpCOztBQUVELFFBQU8sTUFBUDtBQUNBLENBbEZEOztBQW9GQTtBQUNBLElBQUksWUFBWSxVQUFTLEtBQVQsRUFBZ0I7QUFDL0I7QUFDQSxLQUFHLE1BQU0sT0FBTixDQUFjLEtBQWQsQ0FBSCxFQUF5QjtBQUN4QixVQUFRO0FBQ1AsYUFBVTtBQURILEdBQVI7QUFHQTs7QUFFRDtBQUNBLEtBQUksU0FBUyxFQUFiOztBQVQrQjtBQUFBO0FBQUE7O0FBQUE7QUFXL0Isd0JBQWdCLE1BQU0sS0FBdEIsbUlBQTZCO0FBQUEsT0FBckIsSUFBcUI7O0FBQzVCO0FBQ0EsUUFBSyxNQUFMLEtBQWdCLEtBQUssTUFBTCxHQUFjLE1BQU0sTUFBcEM7QUFDQSxRQUFLLElBQUwsS0FBYyxLQUFLLElBQUwsR0FBWSxNQUFNLElBQWhDO0FBQ0EsUUFBSyxNQUFMLEdBQWMsTUFBZDs7QUFFQTtBQUNBLFFBQUssSUFBTDtBQUNBOztBQUVEO0FBckIrQjtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBOztBQXNCL0IsS0FBRyxNQUFNLElBQVQsRUFBZTtBQUNkLE1BQUksZUFBZSxNQUFNLElBQU4sQ0FBVyxNQUFYLENBQW5COztBQUVBO0FBQ0EsTUFBRyxnQkFBZ0IsTUFBTSxJQUF6QixFQUErQjtBQUM5QixTQUFNLElBQU4sQ0FBVyxHQUFYLENBQWUsWUFBZjtBQUNBO0FBQ0Q7O0FBRUQsUUFBTyxNQUFQO0FBQ0EsQ0FoQ0Q7O0FBa0NBO0FBQ0EsSUFBSSxVQUFVLEVBQWQ7O0FBRWUsU0FBUyxJQUFULENBQWMsSUFBZCxFQUFvQjtBQUNsQztBQUNBLEtBQUcsTUFBTSxPQUFOLENBQWMsSUFBZCxLQUF1QixLQUFLLEtBQS9CLEVBQXNDO0FBQ3JDLFNBQU8sVUFBVSxJQUFWLENBQVA7QUFDQTtBQUNEO0FBSEEsTUFJSyxJQUFHLEtBQUssTUFBUixFQUFnQjtBQUNwQixPQUFJLFNBQVMsUUFBUSxLQUFLLE1BQWIsQ0FBYjs7QUFFQTtBQUNBLE9BQUcsQ0FBQyxNQUFKLEVBQVk7QUFDWCxVQUFNLElBQUksS0FBSixjQUFxQixLQUFLLE1BQTFCLGtEQUFOO0FBQ0E7O0FBRUQ7QUFDQSxPQUFJLFFBQVEsT0FBTyxJQUFQLENBQVksSUFBWixDQUFaOztBQUVBLFVBQU8sVUFBVTtBQUNoQixZQUFRLEtBQUssTUFERztBQUVoQixVQUFNLEtBQUssSUFGSztBQUdoQixXQUFPLE1BQU0sT0FBTixDQUFjLEtBQWQsSUFBdUIsS0FBdkIsR0FBK0IsQ0FBQyxLQUFELENBSHRCO0FBSWhCLFVBQU0sT0FBTyxJQUFQLElBQWUsT0FBTyxJQUFQLENBQVksSUFBWixDQUFpQixNQUFqQixFQUF5QixJQUF6QjtBQUpMLElBQVYsQ0FBUDtBQU1BO0FBQ0Q7QUFsQkssT0FtQkE7QUFDSixXQUFPLFFBQVEsSUFBUixDQUFQO0FBQ0E7QUFDRDs7QUFFRDtBQUNBLEtBQUssUUFBTCxHQUFnQixVQUFTLElBQVQsRUFBZSxNQUFmLEVBQXVCO0FBQ3RDLFNBQVEsSUFBUixJQUFnQixNQUFoQjtBQUNBLENBRkQ7Ozs7O0FDaktBOzs7O0FBSUEsU0FBUyxHQUFULENBQWEsUUFBYixDQUFzQjtBQUNyQixVQUFTLCtCQURZOztBQUdyQixLQUhxQixrQkFHWTtBQUFBLE1BQTNCLFFBQTJCLFFBQTNCLFFBQTJCO0FBQUEsTUFBakIsT0FBaUIsUUFBakIsT0FBaUI7QUFBQSxNQUFSLEtBQVEsUUFBUixLQUFROztBQUNoQyxXQUFTLFNBQVQ7O0FBRUEsTUFBSSxNQUFNLG9CQUFWOztBQUVBO0FBQ0EsTUFBRyxNQUFNLENBQU4sQ0FBSCxFQUFhLHNCQUFvQixNQUFNLENBQU4sQ0FBcEI7O0FBRWI7QUFDQSxRQUFNLEdBQU4sRUFBVyxFQUFFLGFBQWEsU0FBZixFQUFYLEVBRUMsSUFGRCxDQUVNO0FBQUEsVUFBTyxJQUFJLElBQUosRUFBUDtBQUFBLEdBRk4sRUFJQyxJQUpELENBSU0sZUFBTztBQUNaO0FBQ0EsT0FBRyxJQUFJLE1BQUosSUFBYyxNQUFqQixFQUF5QjtBQUN4QixhQUFTLE9BQVQsQ0FBaUI7QUFDaEIsYUFBUSxPQURRO0FBRWhCLGNBQVMsZ0JBRk87QUFHaEIsV0FBTTtBQUhVLEtBQWpCOztBQU1BO0FBQ0E7O0FBRUQsT0FBSSxPQUFPLElBQUksSUFBZjs7QUFFQTtBQUNBLE9BQUksV0FBVyxFQUFmOztBQUVBLFlBQVMsSUFBVCxDQUFjO0FBQ2IsU0FBSyxJQURRO0FBRWIsVUFBTSxLQUFLO0FBRkUsSUFBZDs7QUFLQTtBQUNBLE9BQUcsTUFBTSxDQUFOLENBQUgsRUFBYTtBQUNaLGFBQVMsSUFBVCxDQUFjO0FBQ2IsV0FBUyxLQUFLLFFBQWQsYUFBNkIsS0FBSyxLQUFMLEdBQWEsRUFBYixHQUFrQixLQUEvQztBQURhLEtBQWQ7QUFHQTtBQUNEO0FBTEEsUUFNSztBQUNKLGNBQVMsSUFBVCxDQUFjO0FBQ2IsMEJBQWlCLEtBQUssS0FBTCxHQUFhLEVBQWIsR0FBa0IsS0FBbkM7QUFEYSxNQUFkOztBQUlBO0FBQ0EsU0FBRyxLQUFLLEtBQVIsRUFBZTtBQUNkLGVBQVMsSUFBVCxDQUFjLEVBQUUsS0FBSyxJQUFQLEVBQWQ7O0FBRUEsZUFBUyxJQUFULENBQWM7QUFDYixlQUFRLE1BREs7QUFFYixhQUFNLFFBRk87QUFHYixhQUFNO0FBSE8sT0FBZDtBQUtBO0FBQ0Q7O0FBRUQsT0FBSSxpQkFBaUIsRUFBckI7O0FBRUEsWUFBUyxJQUFULENBQWM7QUFDYixTQUFLLE1BRFE7QUFFYixjQUFVLENBQ1Q7QUFDQyxjQUFTLFlBRFY7QUFFQyxlQUFVLENBQ1Q7QUFDQyxjQUFRLE9BRFQ7QUFFQyxZQUFNLFVBRlA7QUFHQyxtQkFBYSxjQUhkO0FBSUMsWUFBTSxjQUpQO0FBS0MsWUFBTTtBQUxQLE1BRFMsRUFRVDtBQUNDLGNBQVEsT0FEVDtBQUVDLFlBQU0sVUFGUDtBQUdDLG1CQUFhLGNBSGQ7QUFJQyxZQUFNLGNBSlA7QUFLQyxZQUFNO0FBTFAsTUFSUztBQUZYLEtBRFMsRUFvQlQ7QUFDQyxVQUFLLFFBRE47QUFFQyxjQUFTLGNBRlY7QUFHQyxXQUFNLGlCQUhQO0FBSUMsWUFBTztBQUNOLFlBQU07QUFEQTtBQUpSLEtBcEJTLEVBNEJUO0FBQ0MsV0FBTTtBQURQLEtBNUJTLENBRkc7QUFrQ2IsUUFBSTtBQUNIO0FBQ0EsYUFBUSxhQUFLO0FBQ1osUUFBRSxjQUFGOztBQUVBO0FBQ0EsVUFBRyxDQUFDLGVBQWUsUUFBbkIsRUFBNkI7QUFDNUIsZUFBUSxzQkFBUjtBQUNBO0FBQ0E7O0FBRUQ7QUFDQSw2Q0FBcUMsS0FBSyxRQUExQyxFQUFzRDtBQUNyRCxvQkFBYSxTQUR3QztBQUVyRCxlQUFRLE1BRjZDO0FBR3JELGFBQU0sS0FBSyxTQUFMLENBQWUsY0FBZjtBQUgrQyxPQUF0RCxFQU1DLElBTkQsQ0FNTTtBQUFBLGNBQU8sSUFBSSxJQUFKLEVBQVA7QUFBQSxPQU5OLEVBUUMsSUFSRCxDQVFNLGVBQU87QUFDWjtBQUNBLFdBQUcsSUFBSSxNQUFKLElBQWMsTUFBakIsRUFBeUI7QUFDeEIsZ0JBQVEsSUFBSSxJQUFKLENBQVMsR0FBakI7QUFDQTs7QUFFRCxXQUFHLElBQUksTUFBSixJQUFjLFNBQWpCLEVBQTRCO0FBQzNCLGdCQUFRLGtCQUFSO0FBQ0E7QUFDRCxPQWpCRDtBQWtCQTtBQTlCRTtBQWxDUyxJQUFkOztBQW9FQSxZQUFTLElBQVQsQ0FBYyxFQUFFLEtBQUssSUFBUCxFQUFkO0FBQ0EsWUFBUyxJQUFULENBQWMsRUFBRSxLQUFLLElBQVAsRUFBZDs7QUFFQTtBQUNBLE9BQUcsQ0FBQyxNQUFNLENBQU4sQ0FBSixFQUFjO0FBQ2IsYUFBUyxJQUFULENBQWM7QUFDYixVQUFLLFFBRFE7QUFFYixjQUFTLGNBRkk7QUFHYixXQUFNLFFBSE87QUFJYixTQUFJO0FBQ0gsYUFBTyxZQUFNO0FBQ1o7QUFDQSxhQUFNLGtCQUFOLEVBQTBCLEVBQUUsYUFBYSxTQUFmLEVBQTFCOztBQUVBO0FBRkEsUUFHQyxJQUhELENBR007QUFBQSxlQUFNLFNBQVMsR0FBVCxDQUFhLFFBQWIsQ0FBc0IsUUFBdEIsQ0FBTjtBQUFBLFFBSE47QUFJQTtBQVBFO0FBSlMsS0FBZDtBQWNBOztBQXZJVywyQkF5SUEsU0FBUyxPQUFULENBQWlCO0FBQzVCLFlBQVEsT0FEb0I7QUFFNUIsYUFBUyxnQkFGbUI7QUFHNUI7QUFINEIsSUFBakIsQ0F6SUE7QUFBQSxPQXlJUCxHQXpJTyxxQkF5SVAsR0F6SU87O0FBK0laOzs7QUFDQSxPQUFJLFVBQVUsVUFBUyxJQUFULEVBQWU7QUFDNUIsUUFBSSxTQUFKLEdBQWdCLElBQWhCO0FBQ0EsSUFGRDtBQUdBLEdBdkpEO0FBd0pBO0FBcEtvQixDQUF0Qjs7Ozs7QUNBQTs7QUFDQTs7QUFMQTs7OztBQU9BLElBQUksY0FBYyxzQkFBTSxhQUFOLENBQWxCOztBQUVBLFNBQVMsR0FBVCxDQUFhLFFBQWIsQ0FBc0I7QUFDckIsVUFBUyxpQkFEWTs7QUFHckIsS0FIcUIsa0JBR3dCO0FBQUEsTUFBdkMsS0FBdUMsUUFBdkMsS0FBdUM7QUFBQSxNQUFoQyxPQUFnQyxRQUFoQyxPQUFnQztBQUFBLE1BQXZCLFFBQXVCLFFBQXZCLFFBQXVCO0FBQUEsTUFBYixVQUFhLFFBQWIsVUFBYTs7QUFDNUMsTUFBSSxTQUFKLEVBQWUsU0FBZjs7QUFFQSxNQUFJLFlBQVksWUFBWSxHQUFaLENBQWdCLE1BQU0sQ0FBTixDQUFoQixFQUEwQixVQUFTLElBQVQsRUFBZTtBQUN4RDtBQUNBLFdBQVEsU0FBUixHQUFvQixFQUFwQjs7QUFFQTtBQUNBLE9BQUcsU0FBSCxFQUFjO0FBQ2IsY0FBVSxXQUFWO0FBQ0EsY0FBVSxXQUFWO0FBQ0E7O0FBRUQ7QUFDQSxPQUFHLElBQUgsRUFBUztBQUNSLGdCQUFZLFNBQVMsU0FBVCxDQUFtQixNQUFuQixFQUEyQjtBQUFBLFlBQU0sU0FBUyxHQUFULENBQWEsUUFBYixDQUFzQixXQUFXLEtBQUssRUFBdEMsQ0FBTjtBQUFBLEtBQTNCLENBQVo7O0FBRUEsZ0JBQVksU0FBUyxTQUFULENBQW1CLFFBQW5CLEVBQTZCLFlBQU07QUFDOUM7QUFDQSxpQkFBWSxNQUFaLENBQW1CLEtBQUssRUFBeEI7O0FBRUE7QUFDQSxjQUFTLEdBQVQsQ0FBYSxRQUFiLENBQXNCLEdBQXRCO0FBQ0EsS0FOVyxDQUFaO0FBT0E7O0FBRUQ7QUFDQSxPQUFHLENBQUMsSUFBSixFQUFVO0FBQ1QsV0FBTztBQUNOLFdBQU0sY0FEQTtBQUVOLFlBQU8sT0FGRDtBQUdOLFdBQU0sU0FIQTtBQUlOLFNBQUksTUFBTSxDQUFOLENBSkU7QUFLTixrQkFBYSxFQUxQO0FBTU4sZUFBVSxLQUFLLEdBQUwsRUFOSjtBQU9OLFdBQU07QUFQQSxLQUFQO0FBU0E7O0FBRUQ7QUFDQSxZQUFTLFNBQVQ7O0FBRUE7QUFDQSxPQUFJLFNBQVMsWUFBTTtBQUNsQjtBQUNBLFNBQUssUUFBTCxHQUFnQixLQUFLLEdBQUwsRUFBaEI7O0FBRUE7QUFDQSxRQUFJLFlBQVksU0FBUyxhQUFULENBQXVCLGtCQUF2QixDQUFoQjtBQUNBLFFBQUksWUFBWSxTQUFTLGFBQVQsQ0FBdUIsa0JBQXZCLENBQWhCOztBQUVBO0FBQ0EsU0FBSyxJQUFMLEdBQVksSUFBSSxJQUFKLENBQVMsVUFBVSxLQUFWLEdBQWtCLEdBQWxCLEdBQXdCLFVBQVUsS0FBM0MsQ0FBWjs7QUFFQTtBQUNBLFFBQUcsS0FBSyxJQUFMLElBQWEsTUFBaEIsRUFBd0I7QUFDdkIsWUFBTyxLQUFLLElBQVo7QUFDQSxZQUFPLEtBQUssS0FBWjtBQUNBOztBQUVEO0FBQ0EsUUFBRyxDQUFDLFNBQUosRUFBZTtBQUNkLGlCQUFZLFNBQVMsU0FBVCxDQUFtQixNQUFuQixFQUEyQjtBQUFBLGFBQU0sU0FBUyxHQUFULENBQWEsUUFBYixDQUFzQixXQUFXLEtBQUssRUFBdEMsQ0FBTjtBQUFBLE1BQTNCLENBQVo7O0FBRUEsaUJBQVksU0FBUyxTQUFULENBQW1CLFFBQW5CLEVBQTZCLFlBQU07QUFDOUM7QUFDQSxrQkFBWSxNQUFaLENBQW1CLEtBQUssRUFBeEI7O0FBRUE7QUFDQSxlQUFTLEdBQVQsQ0FBYSxRQUFiLENBQXNCLEdBQXRCO0FBQ0EsTUFOVyxDQUFaO0FBT0E7O0FBRUQ7QUFDQSxnQkFBWSxHQUFaLENBQWdCLElBQWhCLEVBQXNCLFNBQXRCO0FBQ0EsSUFoQ0Q7O0FBa0NBO0FBQ0EsT0FBSSxlQUFlLFlBQU07QUFDeEIsUUFBRyxLQUFLLElBQUwsSUFBYSxNQUFoQixFQUF3QjtBQUN2QixZQUFPLFVBQVAsQ0FBa0IsS0FBbEIsQ0FBd0IsT0FBeEIsR0FBa0MsTUFBbEM7QUFDQSxZQUFPLFNBQVAsQ0FBaUIsS0FBakIsQ0FBdUIsT0FBdkIsR0FBaUMsTUFBakM7QUFDQSxLQUhELE1BSUs7QUFDSixZQUFPLFVBQVAsQ0FBa0IsS0FBbEIsQ0FBd0IsT0FBeEIsR0FBa0MsRUFBbEM7QUFDQSxZQUFPLFNBQVAsQ0FBaUIsS0FBakIsQ0FBdUIsT0FBdkIsR0FBaUMsRUFBakM7QUFDQTtBQUNELElBVEQ7O0FBV0E7QUFDQSxPQUFJLFNBQVMsU0FBUyxPQUFULENBQWlCO0FBQzdCLFlBQVEsT0FEcUI7QUFFN0IsV0FBTyxDQUNOO0FBQ0MsY0FBUyxZQURWO0FBRUMsZUFBVSxDQUNUO0FBQ0MsY0FBUSxPQURUO0FBRUMsWUFBTSxJQUZQO0FBR0MsWUFBTSxNQUhQO0FBSUM7QUFKRCxNQURTO0FBRlgsS0FETSxFQVlOO0FBQ0MsY0FBUyxZQURWO0FBRUMsZUFBVSxDQUNUO0FBQ0MsY0FBUSxhQURUO0FBRUMsWUFBTSxDQUNMLEVBQUUsTUFBTSxZQUFSLEVBQXNCLE9BQU8sWUFBN0IsRUFESyxFQUVMLEVBQUUsTUFBTSxNQUFSLEVBQWdCLE9BQU8sTUFBdkIsRUFGSyxDQUZQO0FBTUMsYUFBTyxLQUFLLElBTmI7QUFPQyxjQUFRLGdCQUFRO0FBQ2Y7QUFDQSxZQUFLLElBQUwsR0FBWSxJQUFaOztBQUVBO0FBQ0E7O0FBRUE7QUFDQTtBQUNBO0FBaEJGLE1BRFM7QUFGWCxLQVpNLEVBbUNOO0FBQ0MsV0FBTSxZQURQO0FBRUMsY0FBUyxZQUZWO0FBR0MsZUFBVSxDQUNUO0FBQ0MsY0FBUSxPQURUO0FBRUMsWUFBTSxJQUZQO0FBR0MsWUFBTSxPQUhQO0FBSUM7QUFKRCxNQURTO0FBSFgsS0FuQ00sRUErQ047QUFDQyxXQUFNLFdBRFA7QUFFQyxjQUFTLFlBRlY7QUFHQyxlQUFVLENBQ1Q7QUFDQyxjQUFRLE9BRFQ7QUFFQyxZQUFNLE1BRlA7QUFHQyxhQUFPLEtBQUssSUFBTCxJQUFnQixLQUFLLElBQUwsQ0FBVSxXQUFWLEVBQWhCLFNBQTJDLElBQUksS0FBSyxJQUFMLENBQVUsUUFBVixLQUF1QixDQUEzQixDQUEzQyxTQUE0RSxJQUFJLEtBQUssSUFBTCxDQUFVLE9BQVYsRUFBSixDQUhwRjtBQUlDO0FBSkQsTUFEUyxFQU9UO0FBQ0MsY0FBUSxPQURUO0FBRUMsWUFBTSxNQUZQO0FBR0MsYUFBTyxLQUFLLElBQUwsSUFBZ0IsS0FBSyxJQUFMLENBQVUsUUFBVixFQUFoQixTQUF3QyxJQUFJLEtBQUssSUFBTCxDQUFVLFVBQVYsRUFBSixDQUhoRDtBQUlDO0FBSkQsTUFQUztBQUhYLEtBL0NNLEVBaUVOO0FBQ0MsY0FBUyxrQkFEVjtBQUVDLGVBQVUsQ0FDVDtBQUNDLGNBQVEsT0FEVDtBQUVDLFdBQUssVUFGTjtBQUdDLGVBQVMsZUFIVjtBQUlDLG1CQUFhLGFBSmQ7QUFLQyxZQUFNLElBTFA7QUFNQyxZQUFNLGFBTlA7QUFPQztBQVBELE1BRFM7QUFGWCxLQWpFTTtBQUZzQixJQUFqQixDQUFiOztBQW9GQTtBQUNBO0FBQ0EsR0E3S2UsQ0FBaEI7O0FBK0tBO0FBQ0EsYUFBVyxHQUFYLENBQWUsU0FBZjtBQUNBO0FBdkxvQixDQUF0Qjs7QUEwTEE7QUFDQSxJQUFJLE1BQU07QUFBQSxRQUFXLFNBQVMsRUFBVixHQUFnQixNQUFNLE1BQXRCLEdBQStCLE1BQXpDO0FBQUEsQ0FBVjs7QUFFQTtBQUNBLElBQUksVUFBVSxZQUFNO0FBQ25CLEtBQUksT0FBTyxJQUFJLElBQUosRUFBWDs7QUFFQTtBQUNBLE1BQUssUUFBTCxDQUFjLEVBQWQ7QUFDQSxNQUFLLFVBQUwsQ0FBZ0IsRUFBaEI7O0FBRUEsUUFBTyxJQUFQO0FBQ0EsQ0FSRDs7Ozs7QUNuTUE7O0FBQ0E7O0FBTEE7Ozs7QUFPQSxJQUFJLGNBQWMsc0JBQU0sYUFBTixDQUFsQjs7QUFFQSxTQUFTLEdBQVQsQ0FBYSxRQUFiLENBQXNCO0FBQ3JCLFVBQVMsaUJBRFk7O0FBR3JCLEtBSHFCLGtCQUd3QjtBQUFBLE1BQXZDLEtBQXVDLFFBQXZDLEtBQXVDO0FBQUEsTUFBaEMsUUFBZ0MsUUFBaEMsUUFBZ0M7QUFBQSxNQUF0QixPQUFzQixRQUF0QixPQUFzQjtBQUFBLE1BQWIsVUFBYSxRQUFiLFVBQWE7O0FBQzVDLE1BQUksYUFBSixFQUFtQixhQUFuQjs7QUFFQyxhQUFXLEdBQVgsQ0FDQSxZQUFZLEdBQVosQ0FBZ0IsTUFBTSxDQUFOLENBQWhCLEVBQTBCLFVBQVMsSUFBVCxFQUFlO0FBQ3hDO0FBQ0EsV0FBUSxTQUFSLEdBQW9CLEVBQXBCOztBQUVBO0FBQ0EsT0FBRyxhQUFILEVBQWtCO0FBQ2pCLGtCQUFjLFdBQWQ7QUFDQSxrQkFBYyxXQUFkO0FBQ0E7O0FBRUQ7QUFDQSxPQUFHLENBQUMsSUFBSixFQUFVO0FBQ1QsYUFBUyxXQUFUOztBQUVBLGFBQVMsT0FBVCxDQUFpQjtBQUNoQixhQUFRLE9BRFE7QUFFaEIsY0FBUyxnQkFGTztBQUdoQixlQUFVLENBQ1Q7QUFDQyxXQUFLLE1BRE47QUFFQyxZQUFNO0FBRlAsTUFEUyxFQUtUO0FBQ0MsY0FBUSxNQURUO0FBRUMsWUFBTSxHQUZQO0FBR0MsWUFBTTtBQUhQLE1BTFM7QUFITSxLQUFqQjs7QUFnQkE7QUFDQTs7QUFFRDtBQUNBLFlBQVMsWUFBVDs7QUFFQTtBQUNBLG1CQUFnQixTQUFTLFNBQVQsQ0FBbUIsS0FBSyxJQUFMLEdBQVksTUFBWixHQUFxQixVQUF4QyxFQUFvRCxZQUFNO0FBQ3pFO0FBQ0EsU0FBSyxJQUFMLEdBQVksQ0FBQyxLQUFLLElBQWxCOztBQUVBO0FBQ0EsU0FBSyxRQUFMLEdBQWdCLEtBQUssR0FBTCxFQUFoQjs7QUFFQTtBQUNBLGdCQUFZLEdBQVosQ0FBZ0IsSUFBaEI7QUFDQSxJQVRlLENBQWhCOztBQVdBO0FBQ0EsbUJBQWdCLFNBQVMsU0FBVCxDQUFtQixNQUFuQixFQUNmO0FBQUEsV0FBTSxTQUFTLEdBQVQsQ0FBYSxRQUFiLENBQXNCLFdBQVcsS0FBSyxFQUF0QyxDQUFOO0FBQUEsSUFEZSxDQUFoQjs7QUFHQTtBQUNBLE9BQUksWUFBWSxDQUNmLEVBQUUsTUFBTSxFQUFSLEVBQVksUUFBUSxFQUFwQixFQURlLENBQWhCOztBQUlBLFlBQVMsT0FBVCxDQUFpQjtBQUNoQixZQUFRLE9BRFE7QUFFaEIsYUFBUyxnQkFGTztBQUdoQixjQUFVLENBQ1Q7QUFDQyxjQUFTLGlCQURWO0FBRUMsV0FBTSxLQUFLO0FBRlosS0FEUyxFQUtUO0FBQ0MsY0FBUyxxQkFEVjtBQUVDLGVBQVUsQ0FDVDtBQUNDLGVBQVMsc0JBRFY7QUFFQyxZQUFNLEtBQUs7QUFGWixNQURTLEVBS1Q7QUFDQyxZQUFNLEtBQUssSUFBTCxJQUFhLHlCQUFjLEtBQUssSUFBbkIsRUFBeUIsRUFBRSxhQUFhLElBQWYsRUFBcUIsb0JBQXJCLEVBQXpCO0FBRHBCLE1BTFM7QUFGWCxLQUxTLEVBaUJUO0FBQ0MsY0FBUyx3QkFEVjtBQUVDLFdBQU0sS0FBSztBQUZaLEtBakJTO0FBSE0sSUFBakI7QUEwQkEsR0FuRkQsQ0FEQTtBQXNGRDtBQTVGb0IsQ0FBdEI7Ozs7Ozs7O1FDZ0RnQixVLEdBQUEsVTs7QUFyRGhCOztBQUNBOztBQUxBOzs7O0FBT0EsSUFBSSxjQUFjLHNCQUFNLGFBQU4sQ0FBbEI7O0FBRUE7QUFDQSxJQUFNLFFBQVEsQ0FDYjtBQUNDLE1BQUssR0FETjtBQUVDLFFBQU8sT0FGUjtBQUdDLFlBQVc7QUFBQSxTQUFNLElBQUksSUFBSixFQUFOO0FBQUEsRUFIWjtBQUlDO0FBQ0EsU0FBUSxVQUFDLElBQUQsRUFBTyxLQUFQO0FBQUEsU0FBaUIsQ0FBQyxLQUFLLElBQU4sS0FBZSxLQUFLLElBQUwsSUFBYSxNQUFiLElBQXVCLHNCQUFXLEtBQVgsRUFBa0IsS0FBSyxJQUF2QixDQUF0QyxDQUFqQjtBQUFBO0FBTFQsQ0FEYSxFQVFiO0FBQ0MsTUFBSyxPQUROO0FBRUMsUUFBTyxXQUZSO0FBR0MsWUFBVztBQUFBLFNBQU87QUFDakI7QUFDQSxZQUFTLHVCQUFZLElBQUssSUFBSSxJQUFKLEVBQUQsQ0FBYSxNQUFiLEVBQWhCLENBRlE7QUFHakI7QUFDQSxVQUFPLElBQUksSUFBSjtBQUpVLEdBQVA7QUFBQSxFQUhaO0FBU0M7QUFDQSxTQUFRLFVBQUMsSUFBRCxRQUE0QjtBQUFBLE1BQXBCLEtBQW9CLFFBQXBCLEtBQW9CO0FBQUEsTUFBYixPQUFhLFFBQWIsT0FBYTs7QUFDbkM7QUFDQSxNQUFHLEtBQUssSUFBUixFQUFjOztBQUVkO0FBQ0EsTUFBRyxLQUFLLElBQUwsSUFBYSxNQUFoQixFQUF3QixPQUFPLElBQVA7O0FBRXhCO0FBQ0EsTUFBRyxDQUFDLHdCQUFhLEtBQUssSUFBbEIsRUFBd0IsT0FBeEIsQ0FBRCxJQUFxQyxDQUFDLHNCQUFXLEtBQUssSUFBaEIsRUFBc0IsT0FBdEIsQ0FBekMsRUFBeUU7O0FBRXpFO0FBQ0EsTUFBRyx3QkFBYSxLQUFLLElBQWxCLEVBQXdCLEtBQXhCLENBQUgsRUFBbUM7O0FBRW5DLFNBQU8sSUFBUDtBQUNBO0FBeEJGLENBUmEsRUFrQ2I7QUFDQyxNQUFLLFdBRE47QUFFQyxTQUFRO0FBQUEsU0FBUSxDQUFDLEtBQUssSUFBZDtBQUFBLEVBRlQ7QUFHQyxRQUFPO0FBSFIsQ0FsQ2EsRUF1Q2I7QUFDQyxNQUFLLE9BRE47QUFFQyxTQUFRO0FBQUEsU0FBUSxLQUFLLElBQWI7QUFBQSxFQUZUO0FBR0MsUUFBTztBQUhSLENBdkNhLENBQWQ7O0FBOENBO0FBQ08sU0FBUyxVQUFULEdBQXNCO0FBQzVCLE9BQU0sT0FBTixDQUFjO0FBQUEsU0FBUSxTQUFTLGFBQVQsQ0FBdUIsS0FBSyxLQUE1QixFQUFtQyxLQUFLLEdBQXhDLENBQVI7QUFBQSxFQUFkO0FBQ0E7O0FBRUQsU0FBUyxHQUFULENBQWEsUUFBYixDQUFzQjtBQUNyQixRQURxQixZQUNiLEdBRGEsRUFDUjtBQUNaLFNBQU8sTUFBTSxJQUFOLENBQVc7QUFBQSxVQUFRLEtBQUssR0FBTCxJQUFZLEdBQXBCO0FBQUEsR0FBWCxDQUFQO0FBQ0EsRUFIb0I7OztBQUtyQjtBQUNBLEtBTnFCLG1CQU13QjtBQUFBLE1BQXZDLFFBQXVDLFNBQXZDLFFBQXVDO0FBQUEsTUFBN0IsT0FBNkIsU0FBN0IsT0FBNkI7QUFBQSxNQUFwQixVQUFvQixTQUFwQixVQUFvQjtBQUFBLE1BQVIsS0FBUSxTQUFSLEtBQVE7O0FBQzVDLGFBQVcsR0FBWCxDQUNDLFlBQVksTUFBWixDQUFtQixVQUFTLElBQVQsRUFBZTtBQUNqQztBQUNBLFdBQVEsU0FBUixHQUFvQixFQUFwQjs7QUFFQTtBQUNBLFlBQVMsTUFBTSxLQUFmOztBQUVBO0FBQ0EsT0FBSSxHQUFKOztBQUVBLE9BQUcsTUFBTSxTQUFULEVBQW9CO0FBQ25CLFVBQU0sTUFBTSxTQUFOLEVBQU47QUFDQTs7QUFFRDtBQUNBLFVBQU8sS0FBSyxNQUFMLENBQVk7QUFBQSxXQUFRLE1BQU0sTUFBTixDQUFhLElBQWIsRUFBbUIsR0FBbkIsQ0FBUjtBQUFBLElBQVosQ0FBUDs7QUFFQTtBQUNBLFFBQUssSUFBTCxDQUFVLFVBQUMsQ0FBRCxFQUFJLENBQUosRUFBVTtBQUNuQjtBQUNBLFFBQUcsRUFBRSxJQUFGLElBQVUsTUFBVixJQUFvQixFQUFFLElBQUYsSUFBVSxNQUFqQyxFQUF5QyxPQUFPLENBQVA7QUFDekMsUUFBRyxFQUFFLElBQUYsSUFBVSxNQUFWLElBQW9CLEVBQUUsSUFBRixJQUFVLE1BQWpDLEVBQXlDLE9BQU8sQ0FBQyxDQUFSO0FBQ3pDOztBQUVBO0FBQ0EsUUFBRyxFQUFFLElBQUYsSUFBVSxZQUFWLElBQTBCLEVBQUUsSUFBRixJQUFVLFlBQXZDLEVBQXFEO0FBQ3BELFNBQUcsRUFBRSxJQUFGLENBQU8sT0FBUCxNQUFvQixFQUFFLElBQUYsQ0FBTyxPQUFQLEVBQXZCLEVBQXlDO0FBQ3hDLGFBQU8sRUFBRSxJQUFGLENBQU8sT0FBUCxLQUFtQixFQUFFLElBQUYsQ0FBTyxPQUFQLEVBQTFCO0FBQ0E7QUFDRDs7QUFFRDtBQUNBLFFBQUcsRUFBRSxJQUFGLEdBQVMsRUFBRSxJQUFkLEVBQW9CLE9BQU8sQ0FBQyxDQUFSO0FBQ3BCLFFBQUcsRUFBRSxJQUFGLEdBQVMsRUFBRSxJQUFkLEVBQW9CLE9BQU8sQ0FBUDs7QUFFcEIsV0FBTyxDQUFQO0FBQ0EsSUFsQkQ7O0FBb0JBO0FBQ0EsT0FBSSxTQUFTLEVBQWI7O0FBRUE7QUFDQSxRQUFLLE9BQUwsQ0FBYSxVQUFDLElBQUQsRUFBTyxDQUFQLEVBQWE7QUFDekI7QUFDQSxRQUFJLFVBQVUsS0FBSyxJQUFMLElBQWEsTUFBYixHQUFzQixPQUF0QixHQUFnQyx5QkFBYyxLQUFLLElBQW5CLENBQTlDOztBQUVBO0FBQ0EsV0FBTyxPQUFQLE1BQW9CLE9BQU8sT0FBUCxJQUFrQixFQUF0Qzs7QUFFQTtBQUNBLFFBQUksUUFBUSxDQUNYLEVBQUUsTUFBTSxLQUFLLElBQWIsRUFBbUIsTUFBTSxJQUF6QixFQURXLENBQVo7O0FBSUEsUUFBRyxLQUFLLElBQUwsSUFBYSxNQUFoQixFQUF3QjtBQUN2QjtBQUNBLFNBQUcsS0FBSyxJQUFMLENBQVUsUUFBVixNQUF3QixFQUF4QixJQUE4QixLQUFLLElBQUwsQ0FBVSxVQUFWLE1BQTBCLEVBQTNELEVBQStEO0FBQzlELFlBQU0sSUFBTixDQUFXLHlCQUFjLEtBQUssSUFBbkIsQ0FBWDtBQUNBOztBQUVEO0FBQ0EsV0FBTSxJQUFOLENBQVcsS0FBSyxLQUFoQjtBQUNBOztBQUVELFdBQU8sT0FBUCxFQUFnQixJQUFoQixDQUFxQjtBQUNwQixzQkFBZSxLQUFLLEVBREE7QUFFcEI7QUFGb0IsS0FBckI7QUFJQSxJQTFCRDs7QUE0QkE7QUFDQSxZQUFTLE9BQVQsQ0FBaUI7QUFDaEIsWUFBUSxPQURRO0FBRWhCLFlBQVEsTUFGUTtBQUdoQixXQUFPO0FBSFMsSUFBakI7QUFLQSxHQTVFRCxDQUREO0FBK0VBO0FBdEZvQixDQUF0Qjs7Ozs7QUM3REE7Ozs7QUFJQSxTQUFTLEdBQVQsQ0FBYSxRQUFiLENBQXNCO0FBQ3JCLFVBQVMsUUFEWTs7QUFHckIsS0FIcUIsa0JBR0s7QUFBQSxNQUFwQixRQUFvQixRQUFwQixRQUFvQjtBQUFBLE1BQVYsT0FBVSxRQUFWLE9BQVU7O0FBQ3pCO0FBQ0EsV0FBUyxPQUFUOztBQUVBO0FBQ0EsTUFBSSxPQUFPLEVBQVg7O0FBRUE7O0FBUHlCLDBCQVFPLFNBQVMsT0FBVCxDQUFpQjtBQUNoRCxXQUFRLE9BRHdDO0FBRWhELFFBQUssTUFGMkM7QUFHaEQsWUFBUyxnQkFIdUM7QUFJaEQsYUFBVSxDQUNUO0FBQ0MsYUFBUyxZQURWO0FBRUMsY0FBVSxDQUNUO0FBQ0MsYUFBUSxPQURUO0FBRUMsV0FBTSxJQUZQO0FBR0MsV0FBTSxVQUhQO0FBSUMsa0JBQWE7QUFKZCxLQURTO0FBRlgsSUFEUyxFQVlUO0FBQ0MsYUFBUyxZQURWO0FBRUMsY0FBVSxDQUNUO0FBQ0MsYUFBUSxPQURUO0FBRUMsV0FBTSxJQUZQO0FBR0MsV0FBTSxVQUhQO0FBSUMsV0FBTSxVQUpQO0FBS0Msa0JBQWE7QUFMZCxLQURTO0FBRlgsSUFaUyxFQXdCVDtBQUNDLFNBQUssUUFETjtBQUVDLFVBQU0sT0FGUDtBQUdDLGFBQVMsY0FIVjtBQUlDLFdBQU87QUFDTixXQUFNO0FBREE7QUFKUixJQXhCUyxFQWdDVDtBQUNDLGFBQVMsV0FEVjtBQUVDLFVBQU07QUFGUCxJQWhDUyxDQUpzQztBQXlDaEQsT0FBSTtBQUNILFlBQVEsYUFBSztBQUNaLE9BQUUsY0FBRjs7QUFFQTtBQUNBLFdBQU0saUJBQU4sRUFBeUI7QUFDeEIsY0FBUSxNQURnQjtBQUV4QixtQkFBYSxTQUZXO0FBR3hCLFlBQU0sS0FBSyxTQUFMLENBQWUsSUFBZjtBQUhrQixNQUF6Qjs7QUFNQTtBQU5BLE1BT0MsSUFQRCxDQU9NO0FBQUEsYUFBTyxJQUFJLElBQUosRUFBUDtBQUFBLE1BUE47O0FBU0E7QUFUQSxNQVVDLElBVkQsQ0FVTSxlQUFPO0FBQ1o7QUFDQSxVQUFHLElBQUksTUFBSixJQUFjLFNBQWpCLEVBQTRCO0FBQzNCLGdCQUFTLEdBQVQsQ0FBYSxRQUFiLENBQXNCLEdBQXRCO0FBQ0E7QUFDQTs7QUFFRDtBQUNBLFVBQUcsSUFBSSxNQUFKLElBQWMsTUFBakIsRUFBeUI7QUFDeEIsZ0JBQVMsY0FBVDtBQUNBO0FBQ0QsTUFyQkQ7QUFzQkE7QUEzQkU7QUF6QzRDLEdBQWpCLENBUlA7QUFBQSxNQVFwQixRQVJvQixxQkFRcEIsUUFSb0I7QUFBQSxNQVFWLFFBUlUscUJBUVYsUUFSVTtBQUFBLE1BUUEsR0FSQSxxQkFRQSxHQVJBOztBQWdGekI7OztBQUNBLE1BQUksV0FBVyxVQUFTLElBQVQsRUFBZTtBQUM3QixPQUFJLFNBQUosR0FBZ0IsSUFBaEI7QUFDQSxHQUZEO0FBR0E7QUF2Rm9CLENBQXRCOztBQTBGQTtBQUNBLFNBQVMsTUFBVCxHQUFrQixZQUFXO0FBQzVCO0FBQ0EsT0FBTSxrQkFBTixFQUEwQjtBQUN6QixlQUFhO0FBRFksRUFBMUI7O0FBSUE7QUFKQSxFQUtDLElBTEQsQ0FLTTtBQUFBLFNBQU0sU0FBUyxHQUFULENBQWEsUUFBYixDQUFzQixRQUF0QixDQUFOO0FBQUEsRUFMTjtBQU1BLENBUkQ7Ozs7O0FDL0ZBOzs7O0FBSUEsU0FBUyxHQUFULENBQWEsUUFBYixDQUFzQjtBQUNyQixVQUFTLFFBRFk7O0FBR3JCLEtBSHFCLGtCQUdLO0FBQUEsTUFBcEIsUUFBb0IsUUFBcEIsUUFBb0I7QUFBQSxNQUFWLE9BQVUsUUFBVixPQUFVOztBQUN6QixXQUFTLFdBQVQ7O0FBRUE7QUFDQSxRQUFNLHNCQUFOLEVBQThCO0FBQzdCLGdCQUFhO0FBRGdCLEdBQTlCLEVBSUMsSUFKRCxDQUlNO0FBQUEsVUFBTyxJQUFJLElBQUosRUFBUDtBQUFBLEdBSk4sRUFNQyxJQU5ELENBTU0saUJBQTJCO0FBQUEsT0FBekIsTUFBeUIsU0FBekIsTUFBeUI7QUFBQSxPQUFYLEtBQVcsU0FBakIsSUFBaUI7O0FBQ2hDO0FBQ0EsT0FBRyxVQUFVLE1BQWIsRUFBcUI7QUFDcEIsYUFBUyxPQUFULENBQWlCO0FBQ2hCLGFBQVEsT0FEUTtBQUVoQixjQUFTLGdCQUZPO0FBR2hCLFdBQU07QUFIVSxLQUFqQjs7QUFNQTtBQUNBOztBQUVEO0FBQ0EsU0FBTSxJQUFOLENBQVcsVUFBQyxDQUFELEVBQUksQ0FBSixFQUFVO0FBQ3BCO0FBQ0EsUUFBRyxFQUFFLEtBQUYsSUFBVyxDQUFDLEVBQUUsS0FBakIsRUFBd0IsT0FBTyxDQUFDLENBQVI7QUFDeEIsUUFBRyxDQUFDLEVBQUUsS0FBSCxJQUFZLEVBQUUsS0FBakIsRUFBd0IsT0FBTyxDQUFQOztBQUV4QjtBQUNBLFFBQUcsRUFBRSxRQUFGLEdBQWEsRUFBRSxRQUFsQixFQUE0QixPQUFPLENBQUMsQ0FBUjtBQUM1QixRQUFHLEVBQUUsUUFBRixHQUFhLEVBQUUsUUFBbEIsRUFBNEIsT0FBTyxDQUFQOztBQUU1QixXQUFPLENBQVA7QUFDQSxJQVZEOztBQVlBLE9BQUksZUFBZTtBQUNsQixZQUFRLEVBRFU7QUFFbEIsV0FBTztBQUZXLElBQW5COztBQUtBO0FBQ0EsU0FBTSxPQUFOLENBQWMsZ0JBQVE7QUFDckI7QUFDQSxpQkFBYSxLQUFLLEtBQUwsR0FBYSxRQUFiLEdBQXdCLE9BQXJDLEVBRUMsSUFGRCxDQUVNO0FBQ0wsc0JBQWUsS0FBSyxRQURmO0FBRUwsWUFBTyxDQUFDO0FBQ1AsWUFBTSxLQUFLLFFBREo7QUFFUCxZQUFNO0FBRkMsTUFBRDtBQUZGLEtBRk47QUFTQSxJQVhEOztBQWFBO0FBQ0EsWUFBUyxPQUFULENBQWlCO0FBQ2hCLFlBQVEsT0FEUTtBQUVoQixZQUFRLE1BRlE7QUFHaEIsV0FBTztBQUhTLElBQWpCO0FBS0EsR0F4REQ7O0FBMERBO0FBMURBLEdBMkRDLEtBM0RELENBMkRPLGVBQU87QUFDYixZQUFTLE9BQVQsQ0FBaUI7QUFDaEIsYUFBUyxnQkFETztBQUVoQixVQUFNLElBQUk7QUFGTSxJQUFqQjtBQUlBLEdBaEVEO0FBaUVBO0FBeEVvQixDQUF0Qjs7Ozs7QUNKQTs7OztBQUlBLFNBQVMsT0FBVCxDQUFpQixRQUFqQixDQUEwQixTQUExQixFQUFxQztBQUNwQyxLQURvQyxjQUM3QjtBQUNOLFNBQU8sQ0FDTjtBQUNDLFlBQVMsU0FEVjtBQUVDLGFBQVUsQ0FDVDtBQUNDLFNBQUssS0FETjtBQUVDLGFBQVMsV0FGVjtBQUdDLFdBQU87QUFDTixjQUFTLFdBREg7QUFFTixZQUFPLElBRkQ7QUFHTixhQUFRO0FBSEYsS0FIUjtBQVFDLGNBQVUsQ0FDVCxFQUFFLEtBQUssTUFBUCxFQUFlLE9BQU8sRUFBRSxJQUFJLEdBQU4sRUFBVyxJQUFJLEdBQWYsRUFBb0IsSUFBSSxJQUF4QixFQUE4QixJQUFJLEdBQWxDLEVBQXRCLEVBRFMsRUFFVCxFQUFFLEtBQUssTUFBUCxFQUFlLE9BQU8sRUFBRSxJQUFJLEdBQU4sRUFBVyxJQUFJLElBQWYsRUFBcUIsSUFBSSxJQUF6QixFQUErQixJQUFJLElBQW5DLEVBQXRCLEVBRlMsRUFHVCxFQUFFLEtBQUssTUFBUCxFQUFlLE9BQU8sRUFBRSxJQUFJLEdBQU4sRUFBVyxJQUFJLElBQWYsRUFBcUIsSUFBSSxJQUF6QixFQUErQixJQUFJLElBQW5DLEVBQXRCLEVBSFMsQ0FSWDtBQWFDLFFBQUk7QUFDSCxZQUFPO0FBQUEsYUFBTSxTQUFTLElBQVQsQ0FBYyxTQUFkLENBQXdCLE1BQXhCLENBQStCLGNBQS9CLENBQU47QUFBQTtBQURKO0FBYkwsSUFEUyxFQWtCVDtBQUNDLGFBQVMsZUFEVjtBQUVDLFVBQU07QUFGUCxJQWxCUyxFQXNCVDtBQUNDLGFBQVMsaUJBRFY7QUFFQyxVQUFNO0FBRlAsSUF0QlM7QUFGWCxHQURNLEVBK0JOO0FBQ0MsWUFBUyxTQURWO0FBRUMsU0FBTTtBQUZQLEdBL0JNLENBQVA7QUFvQ0EsRUF0Q21DO0FBd0NwQyxLQXhDb0MsWUF3Qy9CLElBeEMrQixRQXdDRDtBQUFBLE1BQXZCLEtBQXVCLFFBQXZCLEtBQXVCO0FBQUEsTUFBaEIsSUFBZ0IsUUFBaEIsSUFBZ0I7QUFBQSxNQUFWLE9BQVUsUUFBVixPQUFVOztBQUNsQyxNQUFJLFVBQUo7O0FBRUE7QUFDQSxNQUFJLFdBQVcsVUFBUyxTQUFULEVBQW9CO0FBQ2xDLFNBQU0sU0FBTixHQUFrQixTQUFsQjtBQUNBLFlBQVMsS0FBVCxHQUFpQixTQUFqQjtBQUNBLEdBSEQ7O0FBS0E7QUFDQSxXQUFTLEVBQVQsQ0FBWSxlQUFaLEVBQTZCLGdCQUFRO0FBQ3BDLFlBQVMsT0FBVCxDQUFpQjtBQUNoQixZQUFRLElBRFE7QUFFaEIsU0FBSyxRQUZXO0FBR2hCLGFBQVMsZ0JBSE87QUFJaEIsVUFBTSxJQUpVO0FBS2hCLFdBQU87QUFDTixrQkFBYTtBQURQLEtBTFM7QUFRaEIsUUFBSTtBQUNILFlBQU87QUFBQSxhQUFNLFNBQVMsSUFBVCxDQUFjLGlCQUFpQixJQUEvQixDQUFOO0FBQUE7QUFESjtBQVJZLElBQWpCO0FBWUEsR0FiRDs7QUFlQTtBQUNBLFdBQVMsRUFBVCxDQUFZLGVBQVosRUFBNkIsZ0JBQVE7QUFDcEMsT0FBSSxNQUFNLEtBQUssYUFBTCxtQkFBa0MsSUFBbEMsU0FBVjs7QUFFQSxPQUFHLEdBQUgsRUFBUSxJQUFJLE1BQUo7QUFDUixHQUpEOztBQU1BO0FBQ0EsV0FBUyxFQUFULENBQVksbUJBQVosRUFBaUM7QUFBQSxVQUFNLEtBQUssU0FBTCxHQUFpQixFQUF2QjtBQUFBLEdBQWpDOztBQUVBO0FBQ0EsTUFBSSxhQUFhLFlBQU07QUFDdEI7QUFDQSxPQUFHLFVBQUgsRUFBZTtBQUNkLGVBQVcsT0FBWDtBQUNBOztBQUVEO0FBQ0EsWUFBUyxJQUFULENBQWMsbUJBQWQ7O0FBRUE7QUFDQSxXQUFRLFNBQVIsR0FBb0IsRUFBcEI7O0FBRUE7QUFDQSxnQkFBYSxJQUFJLFNBQVMsVUFBYixFQUFiOztBQUVBLE9BQUksUUFBUSxhQUFaO0FBQUEsT0FBMkIsS0FBM0I7O0FBRUE7QUFqQnNCO0FBQUE7QUFBQTs7QUFBQTtBQWtCdEIseUJBQWtCLGFBQWxCLDhIQUFpQztBQUFBLFNBQXpCLE1BQXlCOztBQUNoQztBQUNBLFNBQUcsT0FBTyxPQUFPLE9BQWQsSUFBeUIsVUFBNUIsRUFBd0M7QUFDdkMsY0FBUSxPQUFPLE9BQVAsQ0FBZSxTQUFTLFFBQXhCLENBQVI7QUFDQTtBQUNEO0FBSEEsVUFJSyxJQUFHLE9BQU8sT0FBTyxPQUFkLElBQXlCLFFBQTVCLEVBQXNDO0FBQzFDLFdBQUcsT0FBTyxPQUFQLElBQWtCLFNBQVMsUUFBOUIsRUFBd0M7QUFDdkMsZ0JBQVEsT0FBTyxPQUFmO0FBQ0E7QUFDRDtBQUNEO0FBTEssV0FNQTtBQUNKLGdCQUFRLE9BQU8sT0FBUCxDQUFlLElBQWYsQ0FBb0IsU0FBUyxRQUE3QixDQUFSO0FBQ0E7O0FBRUQ7QUFDQSxTQUFHLEtBQUgsRUFBVTtBQUNULGNBQVEsTUFBUjs7QUFFQTtBQUNBO0FBQ0Q7O0FBRUQ7QUExQ3NCO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7O0FBMkN0QixTQUFNLElBQU4sQ0FBVyxFQUFDLHNCQUFELEVBQWEsa0JBQWIsRUFBdUIsZ0JBQXZCLEVBQWdDLFlBQWhDLEVBQVg7QUFDQSxHQTVDRDs7QUE4Q0E7QUFDQSxXQUFTLEdBQVQsQ0FBYSxRQUFiLEdBQXdCLFVBQVMsR0FBVCxFQUFjO0FBQ3JDO0FBQ0EsV0FBUSxTQUFSLENBQWtCLElBQWxCLEVBQXdCLElBQXhCLEVBQThCLEdBQTlCOztBQUVBO0FBQ0E7QUFDQSxHQU5EOztBQVFBO0FBQ0EsU0FBTyxnQkFBUCxDQUF3QixVQUF4QixFQUFvQztBQUFBLFVBQU0sWUFBTjtBQUFBLEdBQXBDOztBQUVBO0FBQ0E7QUFDQTtBQXhJbUMsQ0FBckM7O0FBMklBO0FBQ0EsSUFBSSxnQkFBZ0IsRUFBcEI7O0FBRUE7QUFDQSxTQUFTLEdBQVQsR0FBZSxFQUFmOztBQUVBO0FBQ0EsU0FBUyxHQUFULENBQWEsUUFBYixHQUF3QixVQUFTLEtBQVQsRUFBZ0I7QUFDdkMsZUFBYyxJQUFkLENBQW1CLEtBQW5CO0FBQ0EsQ0FGRDs7QUFJQTtBQUNBLElBQUksZ0JBQWdCO0FBQ25CLEtBRG1CLG1CQUNPO0FBQUEsTUFBcEIsUUFBb0IsU0FBcEIsUUFBb0I7QUFBQSxNQUFWLE9BQVUsU0FBVixPQUFVOztBQUN6QjtBQUNBLFdBQVMsV0FBVDs7QUFFQSxXQUFTLE9BQVQsQ0FBaUI7QUFDaEIsV0FBUSxPQURRO0FBRWhCLFlBQVMsZ0JBRk87QUFHaEIsYUFBVSxDQUNUO0FBQ0MsU0FBSyxNQUROO0FBRUMsVUFBTTtBQUZQLElBRFMsRUFLVDtBQUNDLFlBQVEsTUFEVDtBQUVDLFVBQU0sR0FGUDtBQUdDLFVBQU07QUFIUCxJQUxTO0FBSE0sR0FBakI7QUFlQTtBQXBCa0IsQ0FBcEI7Ozs7O0FDM0pBOzs7O0FBSUEsU0FBUyxPQUFULENBQWlCLFFBQWpCLENBQTBCLE9BQTFCLEVBQW1DO0FBQ2xDLEtBRGtDLGtCQUNpQztBQUFBLE1BQTdELEdBQTZELFFBQTdELEdBQTZEO0FBQUEsTUFBeEQsSUFBd0QsUUFBeEQsSUFBd0Q7QUFBQSxNQUFsRCxLQUFrRCxRQUFsRCxLQUFrRDtBQUFBLE1BQTNDLE1BQTJDLFFBQTNDLE1BQTJDO0FBQUEsTUFBbkMsSUFBbUMsUUFBbkMsSUFBbUM7QUFBQSxNQUE3QixJQUE2QixRQUE3QixJQUE2QjtBQUFBLE1BQXZCLFdBQXVCLFFBQXZCLFdBQXVCO0FBQUEsTUFBVixPQUFVLFFBQVYsT0FBVTs7QUFDbEU7QUFDQSxNQUFHLE9BQU8sSUFBUCxJQUFlLFFBQWYsSUFBMkIsQ0FBQyxLQUEvQixFQUFzQztBQUNyQyxXQUFRLEtBQUssSUFBTCxDQUFSO0FBQ0E7O0FBRUQsTUFBSSxRQUFRO0FBQ1gsUUFBSyxPQUFPLE9BREQ7QUFFWCxZQUFTLFlBQWMsT0FBTyxVQUFQLEdBQW9CLFVBQXBCLEdBQWlDLE9BQS9DLFdBRkU7QUFHWCxVQUFPLEVBSEk7QUFJWCxPQUFJO0FBQ0gsV0FBTyxhQUFLO0FBQ1g7QUFDQSxTQUFHLE9BQU8sSUFBUCxJQUFlLFFBQWxCLEVBQTRCO0FBQzNCLFdBQUssSUFBTCxJQUFhLEVBQUUsTUFBRixDQUFTLEtBQXRCO0FBQ0E7O0FBRUQ7QUFDQSxTQUFHLE9BQU8sTUFBUCxJQUFpQixVQUFwQixFQUFnQztBQUMvQixhQUFPLEVBQUUsTUFBRixDQUFTLEtBQWhCO0FBQ0E7QUFDRDtBQVhFO0FBSk8sR0FBWjs7QUFtQkE7QUFDQSxNQUFHLElBQUgsRUFBUyxNQUFNLEtBQU4sQ0FBWSxJQUFaLEdBQW1CLElBQW5CO0FBQ1QsTUFBRyxLQUFILEVBQVUsTUFBTSxLQUFOLENBQVksS0FBWixHQUFvQixLQUFwQjtBQUNWLE1BQUcsV0FBSCxFQUFnQixNQUFNLEtBQU4sQ0FBWSxXQUFaLEdBQTBCLFdBQTFCOztBQUVoQjtBQUNBLE1BQUcsT0FBTyxVQUFWLEVBQXNCO0FBQ3JCLFNBQU0sSUFBTixHQUFhLEtBQWI7QUFDQTs7QUFFRCxTQUFPLEtBQVA7QUFDQTtBQXJDaUMsQ0FBbkM7Ozs7O0FDSkE7Ozs7QUFJQSxTQUFTLE9BQVQsQ0FBaUIsUUFBakIsQ0FBMEIsTUFBMUIsRUFBa0M7QUFDakMsS0FEaUMsWUFDNUIsSUFENEIsRUFDdEI7QUFDVixTQUFPO0FBQ04sUUFBSyxHQURDO0FBRU4sVUFBTztBQUNOLFVBQU0sS0FBSztBQURMLElBRkQ7QUFLTixPQUFJO0FBQ0gsV0FBTyxhQUFLO0FBQ1g7QUFDQSxTQUFHLEVBQUUsT0FBRixJQUFhLEVBQUUsTUFBZixJQUF5QixFQUFFLFFBQTlCLEVBQXdDOztBQUV4QztBQUNBLE9BQUUsY0FBRjs7QUFFQSxjQUFTLEdBQVQsQ0FBYSxRQUFiLENBQXNCLEtBQUssSUFBM0I7QUFDQTtBQVRFLElBTEU7QUFnQk4sU0FBTSxLQUFLO0FBaEJMLEdBQVA7QUFrQkE7QUFwQmdDLENBQWxDOzs7OztBQ0pBOzs7O0FBSUEsU0FBUyxPQUFULENBQWlCLFFBQWpCLENBQTBCLE1BQTFCLEVBQWtDO0FBQ2pDLEtBRGlDLGtCQUNuQjtBQUFBLE1BQVIsS0FBUSxRQUFSLEtBQVE7O0FBQ2I7QUFDQSxTQUFPLE9BQU8sbUJBQVAsQ0FBMkIsS0FBM0IsRUFFTixHQUZNLENBRUY7QUFBQSxVQUFhLFVBQVUsU0FBVixFQUFxQixNQUFNLFNBQU4sQ0FBckIsQ0FBYjtBQUFBLEdBRkUsQ0FBUDtBQUdBO0FBTmdDLENBQWxDOztBQVNBO0FBQ0EsSUFBSSxZQUFZLFVBQVMsSUFBVCxFQUFlLEtBQWYsRUFBc0IsTUFBdEIsRUFBOEI7QUFDN0M7QUFDQSxPQUFNLE9BQU4sQ0FBYztBQUNiLFdBQVMsYUFESTtBQUViLFFBQU07QUFGTyxFQUFkOztBQUtBO0FBQ0EsUUFBTztBQUNOLGdCQURNO0FBRU4sV0FBUyxjQUZIO0FBR04sWUFBVSxNQUFNLEdBQU4sQ0FBVSxVQUFDLElBQUQsRUFBTyxLQUFQLEVBQWlCO0FBQ3BDO0FBQ0EsT0FBRyxVQUFVLENBQWIsRUFBZ0IsT0FBTyxJQUFQOztBQUVoQixPQUFJLE9BQUo7O0FBRUE7QUFDQSxPQUFHLE9BQU8sSUFBUCxJQUFlLFFBQWxCLEVBQTRCO0FBQzNCLGNBQVU7QUFDVCxjQUFTLFdBREE7QUFFVCxlQUFVLENBQUMsS0FBSyxLQUFMLElBQWMsSUFBZixFQUFxQixHQUFyQixDQUF5QixnQkFBUTtBQUMxQyxhQUFPO0FBQ047QUFDQSxhQUFNLE9BQU8sSUFBUCxJQUFlLFFBQWYsR0FBMEIsSUFBMUIsR0FBaUMsS0FBSyxJQUZ0QztBQUdOO0FBQ0EsZ0JBQVMsS0FBSyxJQUFMLEdBQVksZ0JBQVosR0FBK0I7QUFKbEMsT0FBUDtBQU1BLE1BUFM7QUFGRCxLQUFWO0FBV0EsSUFaRCxNQWFLO0FBQ0osY0FBVTtBQUNULGNBQVMsV0FEQTtBQUVULFdBQU07QUFGRyxLQUFWO0FBSUE7O0FBRUQ7QUFDQSxPQUFHLEtBQUssSUFBUixFQUFjO0FBQ2IsWUFBUSxFQUFSLEdBQWE7QUFDWixZQUFPO0FBQUEsYUFBTSxTQUFTLEdBQVQsQ0FBYSxRQUFiLENBQXNCLEtBQUssSUFBM0IsQ0FBTjtBQUFBO0FBREssS0FBYjtBQUdBOztBQUVELFVBQU8sT0FBUDtBQUNBLEdBbkNTO0FBSEosRUFBUDtBQXdDQSxDQWhERDs7Ozs7QUNkQTs7OztBQUlBLFNBQVMsT0FBVCxDQUFpQixRQUFqQixDQUEwQixTQUExQixFQUFxQztBQUNwQyxLQURvQyxjQUM3QjtBQUNOLFNBQU8sQ0FDTjtBQUNDLFlBQVMsU0FEVjtBQUVDLFNBQU0sU0FGUDtBQUdDLGFBQVUsQ0FDVDtBQUNDLGFBQVMsQ0FBQyxpQkFBRCxFQUFvQixRQUFwQixDQURWO0FBRUMsVUFBTSxTQUZQO0FBR0MsY0FBVSxDQUNUO0FBQ0MsY0FBUyxpQkFEVjtBQUVDLFdBQU07QUFGUCxLQURTO0FBSFgsSUFEUyxFQVdUO0FBQ0MsYUFBUyxpQkFEVjtBQUVDLFVBQU07QUFGUCxJQVhTO0FBSFgsR0FETSxFQXFCTjtBQUNDLFlBQVMsT0FEVjtBQUVDLE9BQUk7QUFDSDtBQUNBLFdBQU87QUFBQSxZQUFNLFNBQVMsSUFBVCxDQUFjLFNBQWQsQ0FBd0IsTUFBeEIsQ0FBK0IsY0FBL0IsQ0FBTjtBQUFBO0FBRko7QUFGTCxHQXJCTSxDQUFQO0FBNkJBLEVBL0JtQztBQWlDcEMsS0FqQ29DLFlBaUMvQixJQWpDK0IsUUFpQ0w7QUFBQSxNQUFuQixPQUFtQixRQUFuQixPQUFtQjtBQUFBLE1BQVYsT0FBVSxRQUFWLE9BQVU7O0FBQzlCO0FBQ0EsV0FBUyxVQUFULEdBQXNCLFVBQVMsSUFBVCxFQUFlLEVBQWYsRUFBbUI7QUFDeEM7QUFEd0MsMkJBRTNCLFNBQVMsT0FBVCxDQUFpQjtBQUM3QixZQUFRLE9BRHFCO0FBRTdCLFNBQUssS0FGd0I7QUFHN0IsVUFBTSxNQUh1QjtBQUk3QixhQUFTLGNBSm9CO0FBSzdCLFVBQU0sSUFMdUI7QUFNN0IsUUFBSTtBQUNILFlBQU8sWUFBTTtBQUNaO0FBQ0EsZUFBUyxJQUFULENBQWMsU0FBZCxDQUF3QixNQUF4QixDQUErQixjQUEvQjs7QUFFQTtBQUNBO0FBQ0E7QUFQRTtBQU55QixJQUFqQixDQUYyQjtBQUFBLE9BRW5DLElBRm1DLHFCQUVuQyxJQUZtQzs7QUFtQnhDLFVBQU87QUFDTixpQkFBYTtBQUFBLFlBQU0sS0FBSyxNQUFMLEVBQU47QUFBQTtBQURQLElBQVA7QUFHQSxHQXRCRDs7QUF3QkE7QUFDQSxXQUFTLGFBQVQsR0FBeUIsVUFBUyxJQUFULEVBQWUsRUFBZixFQUFtQjtBQUMzQyxZQUFTLFVBQVQsQ0FBb0IsSUFBcEIsRUFBMEI7QUFBQSxXQUFNLFNBQVMsR0FBVCxDQUFhLFFBQWIsQ0FBc0IsRUFBdEIsQ0FBTjtBQUFBLElBQTFCO0FBQ0EsR0FGRDs7QUFJQTtBQUNBLFdBQVMsRUFBVCxDQUFZLGVBQVosRUFBNkIsZ0JBQVE7QUFDcEM7QUFDQSxXQUFRLFNBQVIsQ0FBa0IsTUFBbEIsQ0FBeUIsUUFBekI7O0FBRUE7QUFDQSxZQUFTLE9BQVQsQ0FBaUI7QUFDaEIsWUFBUSxPQURRO0FBRWhCLFNBQUssS0FGVztBQUdoQixVQUFNLE1BSFU7QUFJaEIsYUFBUyxjQUpPO0FBS2hCLFVBQU0sSUFMVTtBQU1oQixXQUFPO0FBQ04sa0JBQWE7QUFEUCxLQU5TO0FBU2hCLFFBQUk7QUFDSCxZQUFPLFlBQU07QUFDWjtBQUNBLGVBQVMsSUFBVCxDQUFjLFNBQWQsQ0FBd0IsTUFBeEIsQ0FBK0IsY0FBL0I7O0FBRUE7QUFDQSxlQUFTLElBQVQsQ0FBYyxpQkFBaUIsSUFBL0I7QUFDQTtBQVBFO0FBVFksSUFBakI7O0FBb0JBO0FBQ0EsWUFBUyxFQUFULENBQVksZUFBWixFQUE2QixnQkFBUTtBQUNwQztBQUNBLFFBQUksTUFBTSxRQUFRLGFBQVIsbUJBQXFDLElBQXJDLFNBQVY7O0FBRUEsUUFBRyxHQUFILEVBQVEsSUFBSSxNQUFKOztBQUVSO0FBQ0EsUUFBRyxRQUFRLFFBQVIsQ0FBaUIsTUFBakIsSUFBMkIsQ0FBOUIsRUFBaUM7QUFDaEMsYUFBUSxTQUFSLENBQWtCLEdBQWxCLENBQXNCLFFBQXRCO0FBQ0E7QUFDRCxJQVZEOztBQVlBO0FBQ0EsWUFBUyxFQUFULENBQVksbUJBQVosRUFBaUMsWUFBTTtBQUN0QztBQUNBLFFBQUksV0FBVyxNQUFNLElBQU4sQ0FBVyxRQUFRLGdCQUFSLENBQXlCLGVBQXpCLENBQVgsQ0FBZjs7QUFFQSxhQUFTLE9BQVQsQ0FBaUI7QUFBQSxZQUFVLE9BQU8sTUFBUCxFQUFWO0FBQUEsS0FBakI7O0FBRUE7QUFDQSxZQUFRLFNBQVIsQ0FBa0IsR0FBbEIsQ0FBc0IsUUFBdEI7QUFDQSxJQVJEO0FBU0EsR0FoREQ7QUFpREE7QUFsSG1DLENBQXJDOzs7OztBQ0pBOzs7O0FBSUEsU0FBUyxPQUFULENBQWlCLFFBQWpCLENBQTBCLGFBQTFCLEVBQXlDO0FBQ3hDLEtBRHdDLGtCQUNwQjtBQUFBLE1BQWQsSUFBYyxRQUFkLElBQWM7QUFBQSxNQUFSLEtBQVEsUUFBUixLQUFROztBQUNuQjtBQUNBLE1BQUcsQ0FBQyxLQUFKLEVBQVc7QUFDVixXQUFRLE9BQU8sS0FBSyxDQUFMLENBQVAsSUFBa0IsUUFBbEIsR0FBNkIsS0FBSyxDQUFMLENBQTdCLEdBQXVDLEtBQUssQ0FBTCxFQUFRLEtBQXZEO0FBQ0E7O0FBRUQsU0FBTztBQUNOLFNBQU0sV0FEQTtBQUVOLFlBQVMsWUFGSDtBQUdOLGFBQVUsS0FBSyxHQUFMLENBQVMsZUFBTztBQUN6QjtBQUNBLFFBQUcsT0FBTyxHQUFQLElBQWMsUUFBakIsRUFBMkI7QUFDMUIsV0FBTSxFQUFFLE1BQU0sR0FBUixFQUFhLE9BQU8sR0FBcEIsRUFBTjtBQUNBOztBQUVELFFBQUksVUFBVSxDQUFDLFlBQUQsQ0FBZDs7QUFFQTtBQUNBLFFBQUcsU0FBUyxJQUFJLEtBQWhCLEVBQXVCO0FBQ3RCLGFBQVEsSUFBUixDQUFhLHFCQUFiOztBQUVBO0FBQ0EsYUFBUSxTQUFSO0FBQ0E7O0FBRUQsV0FBTztBQUNOLFVBQUssUUFEQztBQUVOLHFCQUZNO0FBR04sV0FBTSxJQUFJLElBSEo7QUFJTixZQUFPO0FBQ04sb0JBQWMsSUFBSTtBQURaO0FBSkQsS0FBUDtBQVFBLElBeEJTO0FBSEosR0FBUDtBQTZCQSxFQXBDdUM7QUFzQ3hDLEtBdEN3QywwQkFzQ1o7QUFBQSxNQUF0QixNQUFzQixTQUF0QixNQUFzQjtBQUFBLE1BQVosU0FBWSxTQUFaLFNBQVk7O0FBQUEsd0JBRW5CLEdBRm1CO0FBRzFCLE9BQUksZ0JBQUosQ0FBcUIsT0FBckIsRUFBOEIsWUFBTTtBQUNuQyxRQUFJLFdBQVcsVUFBVSxhQUFWLENBQXdCLHNCQUF4QixDQUFmOztBQUVBO0FBQ0EsUUFBRyxZQUFZLEdBQWYsRUFBb0I7QUFDbkI7QUFDQTs7QUFFRDtBQUNBLFFBQUcsUUFBSCxFQUFhO0FBQ1osY0FBUyxTQUFULENBQW1CLE1BQW5CLENBQTBCLHFCQUExQjtBQUNBOztBQUVEO0FBQ0EsUUFBSSxTQUFKLENBQWMsR0FBZCxDQUFrQixxQkFBbEI7O0FBRUE7QUFDQSxXQUFPLElBQUksT0FBSixDQUFZLEtBQW5CO0FBQ0EsSUFsQkQ7QUFIMEI7O0FBQzNCO0FBRDJCO0FBQUE7QUFBQTs7QUFBQTtBQUUzQix3QkFBZSxVQUFVLGdCQUFWLENBQTJCLGFBQTNCLENBQWYsOEhBQTBEO0FBQUEsUUFBbEQsR0FBa0Q7O0FBQUEsVUFBbEQsR0FBa0Q7QUFvQnpEO0FBdEIwQjtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBdUIzQjtBQTdEdUMsQ0FBekM7Ozs7Ozs7Ozs7Ozs7QUNKQTs7OztJQUlxQixVO0FBQ3BCLHVCQUFjO0FBQUE7O0FBQ2IsT0FBSyxjQUFMLEdBQXNCLEVBQXRCO0FBQ0E7O0FBRUQ7Ozs7OzRCQUNVO0FBQ1Q7QUFDQSxVQUFNLEtBQUssY0FBTCxDQUFvQixNQUFwQixHQUE2QixDQUFuQyxFQUFzQztBQUNyQyxTQUFLLGNBQUwsQ0FBb0IsS0FBcEIsR0FBNEIsV0FBNUI7QUFDQTtBQUNEOztBQUVEOzs7O3NCQUNJLFksRUFBYztBQUNqQjtBQUNBLE9BQUcsd0JBQXdCLFVBQTNCLEVBQXVDO0FBQ3RDO0FBQ0EsU0FBSyxjQUFMLEdBQXNCLEtBQUssY0FBTCxDQUFvQixNQUFwQixDQUEyQixhQUFhLGNBQXhDLENBQXRCOztBQUVBO0FBQ0EsaUJBQWEsY0FBYixHQUE4QixFQUE5QjtBQUNBO0FBQ0Q7QUFQQSxRQVFLO0FBQ0osVUFBSyxjQUFMLENBQW9CLElBQXBCLENBQXlCLFlBQXpCO0FBQ0E7QUFDRDs7QUFFRDs7Ozs0QkFDVSxPLEVBQVMsSyxFQUFPO0FBQUE7O0FBQ3pCLFFBQUssR0FBTCxDQUFTLFFBQVEsRUFBUixDQUFXLEtBQVgsRUFBa0I7QUFBQSxXQUFNLE1BQUssT0FBTCxFQUFOO0FBQUEsSUFBbEIsQ0FBVDtBQUNBOzs7Ozs7a0JBaENtQixVO0FBaUNwQjs7Ozs7Ozs7Ozs7OztBQ3JDRDs7OztJQUlxQixZO0FBQ3BCLHlCQUFjO0FBQUE7O0FBQ2IsT0FBSyxVQUFMLEdBQWtCLEVBQWxCO0FBQ0E7O0FBRUQ7Ozs7Ozs7cUJBR0csSSxFQUFNLFEsRUFBVTtBQUFBOztBQUNsQjtBQUNBLE9BQUcsQ0FBQyxLQUFLLFVBQUwsQ0FBZ0IsSUFBaEIsQ0FBSixFQUEyQjtBQUMxQixTQUFLLFVBQUwsQ0FBZ0IsSUFBaEIsSUFBd0IsRUFBeEI7QUFDQTs7QUFFRDtBQUNBLFFBQUssVUFBTCxDQUFnQixJQUFoQixFQUFzQixJQUF0QixDQUEyQixRQUEzQjs7QUFFQTtBQUNBLFVBQU87QUFDTixlQUFXLFFBREw7O0FBR04saUJBQWEsWUFBTTtBQUNsQjtBQUNBLFNBQUksUUFBUSxNQUFLLFVBQUwsQ0FBZ0IsSUFBaEIsRUFBc0IsT0FBdEIsQ0FBOEIsUUFBOUIsQ0FBWjs7QUFFQSxTQUFHLFVBQVUsQ0FBQyxDQUFkLEVBQWlCO0FBQ2hCLFlBQUssVUFBTCxDQUFnQixJQUFoQixFQUFzQixNQUF0QixDQUE2QixLQUE3QixFQUFvQyxDQUFwQztBQUNBO0FBQ0Q7QUFWSyxJQUFQO0FBWUE7O0FBRUQ7Ozs7Ozt1QkFHSyxJLEVBQWU7QUFDbkI7QUFDQSxPQUFHLEtBQUssVUFBTCxDQUFnQixJQUFoQixDQUFILEVBQTBCO0FBQUEsc0NBRmIsSUFFYTtBQUZiLFNBRWE7QUFBQTs7QUFBQTtBQUFBO0FBQUE7O0FBQUE7QUFDekIsMEJBQW9CLEtBQUssVUFBTCxDQUFnQixJQUFoQixDQUFwQiw4SEFBMkM7QUFBQSxVQUFuQyxRQUFtQzs7QUFDMUM7QUFDQSxnQ0FBWSxJQUFaO0FBQ0E7QUFKd0I7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUt6QjtBQUNEOztBQUVEOzs7Ozs7OEJBR1ksSSxFQUEyQjtBQUFBLE9BQXJCLEtBQXFCLHVFQUFiLEVBQWE7O0FBQ3RDO0FBQ0EsT0FBRyxDQUFDLE1BQU0sT0FBTixDQUFjLEtBQWQsQ0FBSixFQUEwQjtBQUN6QixZQUFRLENBQUMsS0FBRCxDQUFSO0FBQ0E7O0FBRUQ7QUFDQSxPQUFHLEtBQUssVUFBTCxDQUFnQixJQUFoQixDQUFILEVBQTBCO0FBQUEsdUNBUE0sSUFPTjtBQVBNLFNBT047QUFBQTs7QUFBQSwwQkFDakIsUUFEaUI7QUFFeEI7QUFDQSxTQUFHLE1BQU0sSUFBTixDQUFXO0FBQUEsYUFBUSxLQUFLLFNBQUwsSUFBa0IsUUFBMUI7QUFBQSxNQUFYLENBQUgsRUFBbUQ7QUFDbEQ7QUFDQTs7QUFFRDtBQUNBLCtCQUFZLElBQVo7QUFSd0I7O0FBQUE7QUFBQTtBQUFBOztBQUFBO0FBQ3pCLDJCQUFvQixLQUFLLFVBQUwsQ0FBZ0IsSUFBaEIsQ0FBcEIsbUlBQTJDO0FBQUEsVUFBbkMsUUFBbUM7O0FBQUEsdUJBQW5DLFFBQW1DOztBQUFBLCtCQUd6QztBQUtEO0FBVHdCO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFVekI7QUFDRDs7Ozs7O2tCQWxFbUIsWTs7Ozs7O0FDQXJCOzs7Ozs7QUFFQSxJQUFJLFdBQVcsNEJBQWY7O0FBRUE7QUFSQTs7OztBQVNBLFNBQVMsSUFBVCxHQUFnQixPQUFPLE9BQVAsSUFBa0IsUUFBbEM7QUFDQSxTQUFTLE9BQVQsR0FBbUIsT0FBTyxNQUFQLElBQWlCLFFBQXBDOztBQUVBO0FBQ0EsU0FBUyxVQUFULEdBQXNCLFFBQVEsY0FBUixFQUF3QixPQUE5QztBQUNBLFNBQVMsWUFBVDs7QUFFQTtBQUNBLENBQUMsU0FBUyxJQUFULEdBQWdCLE1BQWhCLEdBQXlCLE9BQTFCLEVBQW1DLFFBQW5DLEdBQThDLFFBQTlDIiwiZmlsZSI6ImdlbmVyYXRlZC5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzQ29udGVudCI6WyIoZnVuY3Rpb24gZSh0LG4scil7ZnVuY3Rpb24gcyhvLHUpe2lmKCFuW29dKXtpZighdFtvXSl7dmFyIGE9dHlwZW9mIHJlcXVpcmU9PVwiZnVuY3Rpb25cIiYmcmVxdWlyZTtpZighdSYmYSlyZXR1cm4gYShvLCEwKTtpZihpKXJldHVybiBpKG8sITApO3ZhciBmPW5ldyBFcnJvcihcIkNhbm5vdCBmaW5kIG1vZHVsZSAnXCIrbytcIidcIik7dGhyb3cgZi5jb2RlPVwiTU9EVUxFX05PVF9GT1VORFwiLGZ9dmFyIGw9bltvXT17ZXhwb3J0czp7fX07dFtvXVswXS5jYWxsKGwuZXhwb3J0cyxmdW5jdGlvbihlKXt2YXIgbj10W29dWzFdW2VdO3JldHVybiBzKG4/bjplKX0sbCxsLmV4cG9ydHMsZSx0LG4scil9cmV0dXJuIG5bb10uZXhwb3J0c312YXIgaT10eXBlb2YgcmVxdWlyZT09XCJmdW5jdGlvblwiJiZyZXF1aXJlO2Zvcih2YXIgbz0wO288ci5sZW5ndGg7bysrKXMocltvXSk7cmV0dXJuIHN9KSIsIi8vIHNoaW0gZm9yIHVzaW5nIHByb2Nlc3MgaW4gYnJvd3NlclxudmFyIHByb2Nlc3MgPSBtb2R1bGUuZXhwb3J0cyA9IHt9O1xuXG4vLyBjYWNoZWQgZnJvbSB3aGF0ZXZlciBnbG9iYWwgaXMgcHJlc2VudCBzbyB0aGF0IHRlc3QgcnVubmVycyB0aGF0IHN0dWIgaXRcbi8vIGRvbid0IGJyZWFrIHRoaW5ncy4gIEJ1dCB3ZSBuZWVkIHRvIHdyYXAgaXQgaW4gYSB0cnkgY2F0Y2ggaW4gY2FzZSBpdCBpc1xuLy8gd3JhcHBlZCBpbiBzdHJpY3QgbW9kZSBjb2RlIHdoaWNoIGRvZXNuJ3QgZGVmaW5lIGFueSBnbG9iYWxzLiAgSXQncyBpbnNpZGUgYVxuLy8gZnVuY3Rpb24gYmVjYXVzZSB0cnkvY2F0Y2hlcyBkZW9wdGltaXplIGluIGNlcnRhaW4gZW5naW5lcy5cblxudmFyIGNhY2hlZFNldFRpbWVvdXQ7XG52YXIgY2FjaGVkQ2xlYXJUaW1lb3V0O1xuXG5mdW5jdGlvbiBkZWZhdWx0U2V0VGltb3V0KCkge1xuICAgIHRocm93IG5ldyBFcnJvcignc2V0VGltZW91dCBoYXMgbm90IGJlZW4gZGVmaW5lZCcpO1xufVxuZnVuY3Rpb24gZGVmYXVsdENsZWFyVGltZW91dCAoKSB7XG4gICAgdGhyb3cgbmV3IEVycm9yKCdjbGVhclRpbWVvdXQgaGFzIG5vdCBiZWVuIGRlZmluZWQnKTtcbn1cbihmdW5jdGlvbiAoKSB7XG4gICAgdHJ5IHtcbiAgICAgICAgaWYgKHR5cGVvZiBzZXRUaW1lb3V0ID09PSAnZnVuY3Rpb24nKSB7XG4gICAgICAgICAgICBjYWNoZWRTZXRUaW1lb3V0ID0gc2V0VGltZW91dDtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIGNhY2hlZFNldFRpbWVvdXQgPSBkZWZhdWx0U2V0VGltb3V0O1xuICAgICAgICB9XG4gICAgfSBjYXRjaCAoZSkge1xuICAgICAgICBjYWNoZWRTZXRUaW1lb3V0ID0gZGVmYXVsdFNldFRpbW91dDtcbiAgICB9XG4gICAgdHJ5IHtcbiAgICAgICAgaWYgKHR5cGVvZiBjbGVhclRpbWVvdXQgPT09ICdmdW5jdGlvbicpIHtcbiAgICAgICAgICAgIGNhY2hlZENsZWFyVGltZW91dCA9IGNsZWFyVGltZW91dDtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIGNhY2hlZENsZWFyVGltZW91dCA9IGRlZmF1bHRDbGVhclRpbWVvdXQ7XG4gICAgICAgIH1cbiAgICB9IGNhdGNoIChlKSB7XG4gICAgICAgIGNhY2hlZENsZWFyVGltZW91dCA9IGRlZmF1bHRDbGVhclRpbWVvdXQ7XG4gICAgfVxufSAoKSlcbmZ1bmN0aW9uIHJ1blRpbWVvdXQoZnVuKSB7XG4gICAgaWYgKGNhY2hlZFNldFRpbWVvdXQgPT09IHNldFRpbWVvdXQpIHtcbiAgICAgICAgLy9ub3JtYWwgZW52aXJvbWVudHMgaW4gc2FuZSBzaXR1YXRpb25zXG4gICAgICAgIHJldHVybiBzZXRUaW1lb3V0KGZ1biwgMCk7XG4gICAgfVxuICAgIC8vIGlmIHNldFRpbWVvdXQgd2Fzbid0IGF2YWlsYWJsZSBidXQgd2FzIGxhdHRlciBkZWZpbmVkXG4gICAgaWYgKChjYWNoZWRTZXRUaW1lb3V0ID09PSBkZWZhdWx0U2V0VGltb3V0IHx8ICFjYWNoZWRTZXRUaW1lb3V0KSAmJiBzZXRUaW1lb3V0KSB7XG4gICAgICAgIGNhY2hlZFNldFRpbWVvdXQgPSBzZXRUaW1lb3V0O1xuICAgICAgICByZXR1cm4gc2V0VGltZW91dChmdW4sIDApO1xuICAgIH1cbiAgICB0cnkge1xuICAgICAgICAvLyB3aGVuIHdoZW4gc29tZWJvZHkgaGFzIHNjcmV3ZWQgd2l0aCBzZXRUaW1lb3V0IGJ1dCBubyBJLkUuIG1hZGRuZXNzXG4gICAgICAgIHJldHVybiBjYWNoZWRTZXRUaW1lb3V0KGZ1biwgMCk7XG4gICAgfSBjYXRjaChlKXtcbiAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgIC8vIFdoZW4gd2UgYXJlIGluIEkuRS4gYnV0IHRoZSBzY3JpcHQgaGFzIGJlZW4gZXZhbGVkIHNvIEkuRS4gZG9lc24ndCB0cnVzdCB0aGUgZ2xvYmFsIG9iamVjdCB3aGVuIGNhbGxlZCBub3JtYWxseVxuICAgICAgICAgICAgcmV0dXJuIGNhY2hlZFNldFRpbWVvdXQuY2FsbChudWxsLCBmdW4sIDApO1xuICAgICAgICB9IGNhdGNoKGUpe1xuICAgICAgICAgICAgLy8gc2FtZSBhcyBhYm92ZSBidXQgd2hlbiBpdCdzIGEgdmVyc2lvbiBvZiBJLkUuIHRoYXQgbXVzdCBoYXZlIHRoZSBnbG9iYWwgb2JqZWN0IGZvciAndGhpcycsIGhvcGZ1bGx5IG91ciBjb250ZXh0IGNvcnJlY3Qgb3RoZXJ3aXNlIGl0IHdpbGwgdGhyb3cgYSBnbG9iYWwgZXJyb3JcbiAgICAgICAgICAgIHJldHVybiBjYWNoZWRTZXRUaW1lb3V0LmNhbGwodGhpcywgZnVuLCAwKTtcbiAgICAgICAgfVxuICAgIH1cblxuXG59XG5mdW5jdGlvbiBydW5DbGVhclRpbWVvdXQobWFya2VyKSB7XG4gICAgaWYgKGNhY2hlZENsZWFyVGltZW91dCA9PT0gY2xlYXJUaW1lb3V0KSB7XG4gICAgICAgIC8vbm9ybWFsIGVudmlyb21lbnRzIGluIHNhbmUgc2l0dWF0aW9uc1xuICAgICAgICByZXR1cm4gY2xlYXJUaW1lb3V0KG1hcmtlcik7XG4gICAgfVxuICAgIC8vIGlmIGNsZWFyVGltZW91dCB3YXNuJ3QgYXZhaWxhYmxlIGJ1dCB3YXMgbGF0dGVyIGRlZmluZWRcbiAgICBpZiAoKGNhY2hlZENsZWFyVGltZW91dCA9PT0gZGVmYXVsdENsZWFyVGltZW91dCB8fCAhY2FjaGVkQ2xlYXJUaW1lb3V0KSAmJiBjbGVhclRpbWVvdXQpIHtcbiAgICAgICAgY2FjaGVkQ2xlYXJUaW1lb3V0ID0gY2xlYXJUaW1lb3V0O1xuICAgICAgICByZXR1cm4gY2xlYXJUaW1lb3V0KG1hcmtlcik7XG4gICAgfVxuICAgIHRyeSB7XG4gICAgICAgIC8vIHdoZW4gd2hlbiBzb21lYm9keSBoYXMgc2NyZXdlZCB3aXRoIHNldFRpbWVvdXQgYnV0IG5vIEkuRS4gbWFkZG5lc3NcbiAgICAgICAgcmV0dXJuIGNhY2hlZENsZWFyVGltZW91dChtYXJrZXIpO1xuICAgIH0gY2F0Y2ggKGUpe1xuICAgICAgICB0cnkge1xuICAgICAgICAgICAgLy8gV2hlbiB3ZSBhcmUgaW4gSS5FLiBidXQgdGhlIHNjcmlwdCBoYXMgYmVlbiBldmFsZWQgc28gSS5FLiBkb2Vzbid0ICB0cnVzdCB0aGUgZ2xvYmFsIG9iamVjdCB3aGVuIGNhbGxlZCBub3JtYWxseVxuICAgICAgICAgICAgcmV0dXJuIGNhY2hlZENsZWFyVGltZW91dC5jYWxsKG51bGwsIG1hcmtlcik7XG4gICAgICAgIH0gY2F0Y2ggKGUpe1xuICAgICAgICAgICAgLy8gc2FtZSBhcyBhYm92ZSBidXQgd2hlbiBpdCdzIGEgdmVyc2lvbiBvZiBJLkUuIHRoYXQgbXVzdCBoYXZlIHRoZSBnbG9iYWwgb2JqZWN0IGZvciAndGhpcycsIGhvcGZ1bGx5IG91ciBjb250ZXh0IGNvcnJlY3Qgb3RoZXJ3aXNlIGl0IHdpbGwgdGhyb3cgYSBnbG9iYWwgZXJyb3IuXG4gICAgICAgICAgICAvLyBTb21lIHZlcnNpb25zIG9mIEkuRS4gaGF2ZSBkaWZmZXJlbnQgcnVsZXMgZm9yIGNsZWFyVGltZW91dCB2cyBzZXRUaW1lb3V0XG4gICAgICAgICAgICByZXR1cm4gY2FjaGVkQ2xlYXJUaW1lb3V0LmNhbGwodGhpcywgbWFya2VyKTtcbiAgICAgICAgfVxuICAgIH1cblxuXG5cbn1cbnZhciBxdWV1ZSA9IFtdO1xudmFyIGRyYWluaW5nID0gZmFsc2U7XG52YXIgY3VycmVudFF1ZXVlO1xudmFyIHF1ZXVlSW5kZXggPSAtMTtcblxuZnVuY3Rpb24gY2xlYW5VcE5leHRUaWNrKCkge1xuICAgIGlmICghZHJhaW5pbmcgfHwgIWN1cnJlbnRRdWV1ZSkge1xuICAgICAgICByZXR1cm47XG4gICAgfVxuICAgIGRyYWluaW5nID0gZmFsc2U7XG4gICAgaWYgKGN1cnJlbnRRdWV1ZS5sZW5ndGgpIHtcbiAgICAgICAgcXVldWUgPSBjdXJyZW50UXVldWUuY29uY2F0KHF1ZXVlKTtcbiAgICB9IGVsc2Uge1xuICAgICAgICBxdWV1ZUluZGV4ID0gLTE7XG4gICAgfVxuICAgIGlmIChxdWV1ZS5sZW5ndGgpIHtcbiAgICAgICAgZHJhaW5RdWV1ZSgpO1xuICAgIH1cbn1cblxuZnVuY3Rpb24gZHJhaW5RdWV1ZSgpIHtcbiAgICBpZiAoZHJhaW5pbmcpIHtcbiAgICAgICAgcmV0dXJuO1xuICAgIH1cbiAgICB2YXIgdGltZW91dCA9IHJ1blRpbWVvdXQoY2xlYW5VcE5leHRUaWNrKTtcbiAgICBkcmFpbmluZyA9IHRydWU7XG5cbiAgICB2YXIgbGVuID0gcXVldWUubGVuZ3RoO1xuICAgIHdoaWxlKGxlbikge1xuICAgICAgICBjdXJyZW50UXVldWUgPSBxdWV1ZTtcbiAgICAgICAgcXVldWUgPSBbXTtcbiAgICAgICAgd2hpbGUgKCsrcXVldWVJbmRleCA8IGxlbikge1xuICAgICAgICAgICAgaWYgKGN1cnJlbnRRdWV1ZSkge1xuICAgICAgICAgICAgICAgIGN1cnJlbnRRdWV1ZVtxdWV1ZUluZGV4XS5ydW4oKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICBxdWV1ZUluZGV4ID0gLTE7XG4gICAgICAgIGxlbiA9IHF1ZXVlLmxlbmd0aDtcbiAgICB9XG4gICAgY3VycmVudFF1ZXVlID0gbnVsbDtcbiAgICBkcmFpbmluZyA9IGZhbHNlO1xuICAgIHJ1bkNsZWFyVGltZW91dCh0aW1lb3V0KTtcbn1cblxucHJvY2Vzcy5uZXh0VGljayA9IGZ1bmN0aW9uIChmdW4pIHtcbiAgICB2YXIgYXJncyA9IG5ldyBBcnJheShhcmd1bWVudHMubGVuZ3RoIC0gMSk7XG4gICAgaWYgKGFyZ3VtZW50cy5sZW5ndGggPiAxKSB7XG4gICAgICAgIGZvciAodmFyIGkgPSAxOyBpIDwgYXJndW1lbnRzLmxlbmd0aDsgaSsrKSB7XG4gICAgICAgICAgICBhcmdzW2kgLSAxXSA9IGFyZ3VtZW50c1tpXTtcbiAgICAgICAgfVxuICAgIH1cbiAgICBxdWV1ZS5wdXNoKG5ldyBJdGVtKGZ1biwgYXJncykpO1xuICAgIGlmIChxdWV1ZS5sZW5ndGggPT09IDEgJiYgIWRyYWluaW5nKSB7XG4gICAgICAgIHJ1blRpbWVvdXQoZHJhaW5RdWV1ZSk7XG4gICAgfVxufTtcblxuLy8gdjggbGlrZXMgcHJlZGljdGlibGUgb2JqZWN0c1xuZnVuY3Rpb24gSXRlbShmdW4sIGFycmF5KSB7XG4gICAgdGhpcy5mdW4gPSBmdW47XG4gICAgdGhpcy5hcnJheSA9IGFycmF5O1xufVxuSXRlbS5wcm90b3R5cGUucnVuID0gZnVuY3Rpb24gKCkge1xuICAgIHRoaXMuZnVuLmFwcGx5KG51bGwsIHRoaXMuYXJyYXkpO1xufTtcbnByb2Nlc3MudGl0bGUgPSAnYnJvd3Nlcic7XG5wcm9jZXNzLmJyb3dzZXIgPSB0cnVlO1xucHJvY2Vzcy5lbnYgPSB7fTtcbnByb2Nlc3MuYXJndiA9IFtdO1xucHJvY2Vzcy52ZXJzaW9uID0gJyc7IC8vIGVtcHR5IHN0cmluZyB0byBhdm9pZCByZWdleHAgaXNzdWVzXG5wcm9jZXNzLnZlcnNpb25zID0ge307XG5cbmZ1bmN0aW9uIG5vb3AoKSB7fVxuXG5wcm9jZXNzLm9uID0gbm9vcDtcbnByb2Nlc3MuYWRkTGlzdGVuZXIgPSBub29wO1xucHJvY2Vzcy5vbmNlID0gbm9vcDtcbnByb2Nlc3Mub2ZmID0gbm9vcDtcbnByb2Nlc3MucmVtb3ZlTGlzdGVuZXIgPSBub29wO1xucHJvY2Vzcy5yZW1vdmVBbGxMaXN0ZW5lcnMgPSBub29wO1xucHJvY2Vzcy5lbWl0ID0gbm9vcDtcblxucHJvY2Vzcy5iaW5kaW5nID0gZnVuY3Rpb24gKG5hbWUpIHtcbiAgICB0aHJvdyBuZXcgRXJyb3IoJ3Byb2Nlc3MuYmluZGluZyBpcyBub3Qgc3VwcG9ydGVkJyk7XG59O1xuXG5wcm9jZXNzLmN3ZCA9IGZ1bmN0aW9uICgpIHsgcmV0dXJuICcvJyB9O1xucHJvY2Vzcy5jaGRpciA9IGZ1bmN0aW9uIChkaXIpIHtcbiAgICB0aHJvdyBuZXcgRXJyb3IoJ3Byb2Nlc3MuY2hkaXIgaXMgbm90IHN1cHBvcnRlZCcpO1xufTtcbnByb2Nlc3MudW1hc2sgPSBmdW5jdGlvbigpIHsgcmV0dXJuIDA7IH07XG4iLCIvKipcclxuICogV29yayB3aXRoIGRhdGEgc3RvcmVzXHJcbiAqL1xyXG5cclxuY29uc3QgREVCT1VOQ0VfVElNRSA9IDIwMDA7XHJcbmNvbnN0IERBVEFfU1RPUkVfUk9PVCA9IFwiL2FwaS9kYXRhL1wiO1xyXG5cclxuLy8gY2FjaGUgZGF0YSBzdG9yZSBpbnN0YW5jZXNcclxudmFyIHN0b3JlcyA9IHt9O1xyXG5cclxuLy8gZ2V0L2NyZWF0ZSBhIGRhdGFzdG9yZVxyXG5leHBvcnQgZnVuY3Rpb24gc3RvcmUobmFtZSkge1xyXG5cdC8vIHVzZSB0aGUgY2FjaGVkIHN0b3JlXHJcblx0aWYobmFtZSBpbiBzdG9yZXMpIHtcclxuXHRcdHJldHVybiBzdG9yZXNbbmFtZV07XHJcblx0fVxyXG5cclxuXHR2YXIgc3RvcmUgPSBuZXcgU3RvcmUobmFtZSk7XHJcblxyXG5cdC8vIGNhY2hlIHRoZSBkYXRhIHN0b3JlIGluc3RhbmNlXHJcblx0c3RvcmVzW25hbWVdID0gc3RvcmU7XHJcblxyXG5cdHJldHVybiBzdG9yZTtcclxufTtcclxuXHJcbmNsYXNzIFN0b3JlIGV4dGVuZHMgbGlmZUxpbmUuRXZlbnRFbWl0dGVyIHtcclxuXHRjb25zdHJ1Y3RvcihuYW1lKSB7XHJcblx0XHRzdXBlcigpO1xyXG5cdFx0dGhpcy5uYW1lID0gbmFtZTtcclxuXHRcdHRoaXMuX2NhY2hlID0ge307XHJcblx0XHQvLyBkb24ndCBzZW5kIGR1cGxpY2F0ZSByZXF1ZXN0c1xyXG5cdFx0dGhpcy5fcmVxdWVzdGluZyA9IFtdO1xyXG5cdH1cclxuXHJcblx0Ly8gc2V0IHRoZSBmdW5jdGlvbiB0byBkZXNlcmlhbGl6ZSBhbGwgZGF0YSBmcm9tIHRoZSBzZXJ2ZXJcclxuXHRzZXRJbml0KGZuKSB7XHJcblx0XHR0aGlzLl9kZXNlcmlhbGl6ZXIgPSBmbjtcclxuXHR9XHJcblxyXG5cdC8vIHNlbmQgYSByZXF1ZXN0IHRvIHRoZSBzZXJ2ZXJcclxuXHRfcmVxdWVzdChtZXRob2QsIHVybCwgYm9keSkge1xyXG5cdFx0dXJsID0gREFUQV9TVE9SRV9ST09UICsgdXJsO1xyXG5cclxuXHRcdC8vIGRvbid0IGR1cGxpY2F0ZSByZXF1ZXN0c1xyXG5cdFx0aWYobWV0aG9kID09IFwiZ2V0XCIpIHtcclxuXHRcdFx0Ly8gYWxyZWFkeSBtYWtpbmcgdGhpcyByZXF1ZXN0XHJcblx0XHRcdGlmKHRoaXMuX3JlcXVlc3RpbmcuaW5kZXhPZih1cmwpICE9PSAtMSkgcmV0dXJuO1xyXG5cclxuXHRcdFx0dGhpcy5fcmVxdWVzdGluZy5wdXNoKHVybCk7XHJcblx0XHR9XHJcblxyXG5cdFx0Ly8gbWFrZSB0aGUgYWN0dWFsIHJlcXVlc3RcclxuXHRcdHJldHVybiBmZXRjaCh1cmwsIHtcclxuXHRcdFx0bWV0aG9kOiBtZXRob2QsXHJcblx0XHRcdGNyZWRlbnRpYWxzOiBcImluY2x1ZGVcIixcclxuXHRcdFx0Ym9keTogYm9keSAmJiBKU09OLnN0cmluZ2lmeShib2R5KVxyXG5cdFx0fSlcclxuXHJcblx0XHQvLyBwYXJzZSB0aGUgcmVzcG9uc2VcclxuXHRcdC50aGVuKHJlcyA9PiByZXMuanNvbigpKVxyXG5cclxuXHRcdC50aGVuKHJlcyA9PiB7XHJcblx0XHRcdC8vIHJlbW92ZSB0aGUgbG9ja1xyXG5cdFx0XHRpZihtZXRob2QgPT0gXCJnZXRcIikge1xyXG5cdFx0XHRcdHZhciBpbmRleCA9IHRoaXMuX3JlcXVlc3RpbmcuaW5kZXhPZih1cmwpO1xyXG5cclxuXHRcdFx0XHRpZihpbmRleCAhPT0gLTEpIHRoaXMuX3JlcXVlc3Rpbmcuc3BsaWNlKGluZGV4LCAxKTtcclxuXHRcdFx0fVxyXG5cclxuXHRcdFx0Ly8gdXBkYXRlIHRoZSBjYWNoZSBhbmQgZW1pdCBhIGNoYW5nZVxyXG5cdFx0XHRpZihyZXMuc3RhdHVzID09IFwic3VjY2Vzc1wiICYmIG1ldGhvZCA9PSBcImdldFwiKSB7XHJcblx0XHRcdFx0Ly8gc3RvcmUgdGhlIHZhbHVlIGluIHRoZSBjYWNoZVxyXG5cdFx0XHRcdGlmKEFycmF5LmlzQXJyYXkocmVzLmRhdGEpKSB7XHJcblx0XHRcdFx0XHRyZXMuZGF0YS5mb3JFYWNoKGl0ZW0gPT4ge1xyXG5cdFx0XHRcdFx0XHQvLyBkZXNlcmlhbGl6ZSB0aGUgaXRlbVxyXG5cdFx0XHRcdFx0XHRpZih0aGlzLl9kZXNlcmlhbGl6ZXIpIHtcclxuXHRcdFx0XHRcdFx0XHRpdGVtID0gdGhpcy5fZGVzZXJpYWxpemVyKGl0ZW0pIHx8IGl0ZW07XHJcblx0XHRcdFx0XHRcdH1cclxuXHJcblx0XHRcdFx0XHRcdC8vIHN0b3JlIHRlaCBpdGVtXHJcblx0XHRcdFx0XHRcdHRoaXMuX2NhY2hlW2l0ZW0uaWRdID0gaXRlbVxyXG5cdFx0XHRcdFx0fSk7XHJcblx0XHRcdFx0fVxyXG5cdFx0XHRcdGVsc2Uge1xyXG5cdFx0XHRcdFx0bGV0IGl0ZW0gPSByZXMuZGF0YTtcclxuXHJcblx0XHRcdFx0XHQvLyBkZXNlcmlhbGl6ZSB0aGUgaXRlbVxyXG5cdFx0XHRcdFx0aWYodGhpcy5fZGVzZXJpYWxpemVyKSB7XHJcblx0XHRcdFx0XHRcdGl0ZW0gPSB0aGlzLl9kZXNlcmlhbGl6ZXIoaXRlbSkgfHwgaXRlbTtcclxuXHRcdFx0XHRcdH1cclxuXHJcblx0XHRcdFx0XHR0aGlzLl9jYWNoZVtyZXMuZGF0YS5pZF0gPSBpdGVtO1xyXG5cdFx0XHRcdH1cclxuXHJcblx0XHRcdFx0Ly8gZW1pdCBhIGNoYW5nZVxyXG5cdFx0XHRcdHRoaXMuZW1pdChcImNoYW5nZVwiKTtcclxuXHRcdFx0fVxyXG5cclxuXHRcdFx0Ly8gdGhyb3cgdGhlIGVycm9yXHJcblx0XHRcdGlmKHJlcy5zdGF0dXMgPT0gXCJlcnJvclwiKSB7XHJcblx0XHRcdFx0dGhyb3cgbmV3IEVycm9yKHJlcy5kYXRhKTtcclxuXHRcdFx0fVxyXG5cclxuXHRcdFx0Ly8gdGhlIHVzZXIgaXMgbm90IGxvZ2dlZCBpblxyXG5cdFx0XHRpZihyZXMuc3RhdHVzID09IFwiZmFpbFwiICYmIHJlcy5kYXRhLnJlYXNvbiA9PSBcImxvZ2dlZC1vdXRcIikge1xyXG5cdFx0XHRcdGxpZmVMaW5lLm5hdi5uYXZpZ2F0ZShcIi9sb2dpblwiKTtcclxuXHRcdFx0fVxyXG5cdFx0fSk7XHJcblx0fVxyXG5cclxuXHQvLyBnZXQgYWxsIHRoZSBpdGVtcyBhbmQgbGlzdGVuIGZvciBhbnkgY2hhbmdlc1xyXG5cdGdldEFsbChmbikge1xyXG5cdFx0Ly8gZ28gdG8gdGhlIGNhY2hlIGZpcnN0XHJcblx0XHRmbihhcnJheUZyb21PYmplY3QodGhpcy5fY2FjaGUpKTtcclxuXHJcblx0XHQvLyBzZW5kIGEgcmVxdWVzdCB0byB0aGUgc2VydmVyIGZvciB0aGUgaXRlbXNcclxuXHRcdHRoaXMuX3JlcXVlc3QoXCJnZXRcIiwgdGhpcy5uYW1lKTtcclxuXHJcblx0XHQvLyBsaXN0ZW4gZm9yIGFueSBjaGFuZ2VzXHJcblx0XHRyZXR1cm4gdGhpcy5vbihcImNoYW5nZVwiLCAoKSA9PiB7XHJcblx0XHRcdC8vIHRoZSBjaGFuZ2VzIHdpbGwgd2UgaW4gdGhlIGNhY2hlXHJcblx0XHRcdGZuKGFycmF5RnJvbU9iamVjdCh0aGlzLl9jYWNoZSkpO1xyXG5cdFx0fSk7XHJcblx0fVxyXG5cclxuXHQvLyBnZXQgYSBzaW5nbGUgaXRlbSBhbmQgbGlzdGVuIGZvciBjaGFuZ2VzXHJcblx0Z2V0KGlkLCBmbikge1xyXG5cdFx0Ly8gZ28gdG8gdGhlIGNhY2hlIGZpcnN0XHJcblx0XHRmbih0aGlzLl9jYWNoZVtpZF0pO1xyXG5cclxuXHRcdC8vIHNlbmQgYSByZXF1ZXN0IHRvIHRoZSBzZXJ2ZXIgZm9yIHRoZSBpdGVtXHJcblx0XHR0aGlzLl9yZXF1ZXN0KFwiZ2V0XCIsIHRoaXMubmFtZSArIFwiL1wiICsgaWQpO1xyXG5cclxuXHRcdC8vIGxpc3RlbiBmb3IgYW55IGNoYW5nZXNcclxuXHRcdHJldHVybiB0aGlzLm9uKFwiY2hhbmdlXCIsICgpID0+IHtcclxuXHRcdFx0Zm4odGhpcy5fY2FjaGVbaWRdKTtcclxuXHRcdH0pO1xyXG5cdH1cclxuXHJcblx0Ly8gc3RvcmUgYSB2YWx1ZSBpbiB0aGUgc3RvcmVcclxuXHRzZXQodmFsdWUsIHNraXBzKSB7XHJcblx0XHQvLyBzdG9yZSB0aGUgdmFsdWUgaW4gdGhlIGNhY2hlXHJcblx0XHR0aGlzLl9jYWNoZVt2YWx1ZS5pZF0gPSB2YWx1ZTtcclxuXHJcblx0XHQvLyBzYXZlIHRoZSBpdGVtXHJcblx0XHRkZWJvdW5jZSh2YWx1ZS5pZCwgKCkgPT4ge1xyXG5cdFx0XHR0aGlzLl9yZXF1ZXN0KFwicHV0XCIsIGAke3RoaXMubmFtZX0vJHt2YWx1ZS5pZH1gLCB2YWx1ZSk7XHJcblx0XHR9KTtcclxuXHJcblx0XHQvLyBlbWl0IGEgY2hhbmdlXHJcblx0XHR0aGlzLnBhcnRpYWxFbWl0KFwiY2hhbmdlXCIsIHNraXBzKTtcclxuXHR9XHJcblxyXG5cdC8vIHJlbW92ZSBhIHZhbHVlIGZyb20gdGhlIHN0b3JlXHJcblx0cmVtb3ZlKGlkLCBza2lwcykge1xyXG5cdFx0Ly8gcmVtb3ZlIHRoZSB2YWx1ZSBmcm9tIHRoZSBjYWNoZVxyXG5cdFx0ZGVsZXRlIHRoaXMuX2NhY2hlW2lkXTtcclxuXHJcblx0XHQvLyBzZW5kIHRoZSBkZWxldGUgcmVxdWVzdFxyXG5cdFx0dGhpcy5fcmVxdWVzdChcImRlbGV0ZVwiLCBgJHt0aGlzLm5hbWV9LyR7aWR9YCk7XHJcblxyXG5cdFx0Ly8gZW1pdCBhIGNoYW5nZVxyXG5cdFx0dGhpcy5wYXJ0aWFsRW1pdChcImNoYW5nZVwiLCBza2lwcyk7XHJcblx0fVxyXG59XHJcblxyXG4vLyBnZXQgYW4gYXJyYXkgZnJvbSBhbiBvYmplY3RcclxudmFyIGFycmF5RnJvbU9iamVjdCA9IGZ1bmN0aW9uKG9iaikge1xyXG5cdHJldHVybiBPYmplY3QuZ2V0T3duUHJvcGVydHlOYW1lcyhvYmopXHJcblx0XHQubWFwKG5hbWUgPT4gb2JqW25hbWVdKTtcclxufTtcclxuXHJcbi8vIGRvbid0IGNhbGwgYSBmdW5jdGlvbiB0b28gb2Z0ZW5cclxudmFyIGRlYm91bmNlVGltZXJzID0ge307XHJcblxyXG52YXIgZGVib3VuY2UgPSAoaWQsIGZuKSA9PiB7XHJcblx0Ly8gY2FuY2VsIHRoZSBwcmV2aW91cyBkZWxheVxyXG5cdGNsZWFyVGltZW91dChkZWJvdW5jZVRpbWVyc1tpZF0pO1xyXG5cdC8vIHN0YXJ0IGEgbmV3IGRlbGF5XHJcblx0ZGVib3VuY2VUaW1lcnNbaWRdID0gc2V0VGltZW91dChmbiwgREVCT1VOQ0VfVElNRSk7XHJcbn07XHJcbiIsIi8qKlxyXG4gKiBCcm93c2VyIHNwZWNpZmljIGdsb2JhbHNcclxuICovXHJcblxyXG5saWZlTGluZS5tYWtlRG9tID0gcmVxdWlyZShcIi4vdXRpbC9kb20tbWFrZXJcIikuZGVmYXVsdDtcclxuXHJcbi8vIGFkZCBhIGZ1bmN0aW9uIGZvciBhZGRpbmcgYWN0aW9uc1xyXG5saWZlTGluZS5hZGRBY3Rpb24gPSBmdW5jdGlvbihuYW1lLCBmbikge1xyXG5cdC8vIGF0dGFjaCB0aGUgY2FsbGJhY2tcclxuXHR2YXIgbGlzdGVuZXIgPSBsaWZlTGluZS5vbihcImFjdGlvbi1leGVjLVwiICsgbmFtZSwgZm4pO1xyXG5cclxuXHQvLyBpbmZvcm0gYW55IGFjdGlvbiBwcm92aWRlcnNcclxuXHRsaWZlTGluZS5lbWl0KFwiYWN0aW9uLWNyZWF0ZVwiLCBuYW1lKTtcclxuXHJcblx0Ly8gYWxsIGFjdGlvbnMgcmVtb3ZlZFxyXG5cdHZhciByZW1vdmVBbGwgPSBsaWZlTGluZS5vbihcImFjdGlvbi1yZW1vdmUtYWxsXCIsICgpID0+IHtcclxuXHRcdC8vIHJlbW92ZSB0aGUgYWN0aW9uIGxpc3RlbmVyXHJcblx0XHRsaXN0ZW5lci51bnN1YnNjcmliZSgpO1xyXG5cdFx0cmVtb3ZlQWxsLnVuc3Vic2NyaWJlKCk7XHJcblx0fSk7XHJcblxyXG5cdHJldHVybiB7XHJcblx0XHR1bnN1YnNjcmliZSgpIHtcclxuXHRcdFx0Ly8gcmVtb3ZlIHRoZSBhY3Rpb24gbGlzdGVuZXJcclxuXHRcdFx0bGlzdGVuZXIudW5zdWJzY3JpYmUoKTtcclxuXHRcdFx0cmVtb3ZlQWxsLnVuc3Vic2NyaWJlKCk7XHJcblxyXG5cdFx0XHQvLyBpbmZvcm0gYW55IGFjdGlvbiBwcm92aWRlcnNcclxuXHRcdFx0bGlmZUxpbmUuZW1pdChcImFjdGlvbi1yZW1vdmVcIiwgbmFtZSk7XHJcblx0XHR9XHJcblx0fTtcclxufTtcclxuIiwiLy8gY3JlYXRlIHRoZSBnbG9iYWwgb2JqZWN0XHJcbmltcG9ydCBcIi4uL2NvbW1vbi9nbG9iYWxcIjtcclxuaW1wb3J0IFwiLi9nbG9iYWxcIjtcclxuXHJcbi8vIGxvYWQgYWxsIHRoZSB3aWRnZXRzXHJcbmltcG9ydCBcIi4vd2lkZ2V0cy9zaWRlYmFyXCI7XHJcbmltcG9ydCBcIi4vd2lkZ2V0cy9jb250ZW50XCI7XHJcbmltcG9ydCBcIi4vd2lkZ2V0cy9saW5rXCI7XHJcbmltcG9ydCBcIi4vd2lkZ2V0cy9saXN0XCI7XHJcbmltcG9ydCBcIi4vd2lkZ2V0cy9pbnB1dFwiO1xyXG5pbXBvcnQgXCIuL3dpZGdldHMvdG9nZ2xlLWJ0bnNcIjtcclxuXHJcbi8vIGxvYWQgYWxsIHRoZSB2aWV3c1xyXG5pbXBvcnQge2luaXROYXZCYXJ9IGZyb20gXCIuL3ZpZXdzL2xpc3RzXCI7XHJcbmltcG9ydCBcIi4vdmlld3MvaXRlbVwiO1xyXG5pbXBvcnQgXCIuL3ZpZXdzL2VkaXRcIjtcclxuaW1wb3J0IFwiLi92aWV3cy9sb2dpblwiO1xyXG5pbXBvcnQgXCIuL3ZpZXdzL2FjY291bnRcIjtcclxuaW1wb3J0IFwiLi92aWV3cy91c2Vyc1wiO1xyXG5cclxuLy8gc2V0IHVwIHRoZSBkYXRhIHN0b3JlXHJcbmltcG9ydCB7c3RvcmV9IGZyb20gXCIuL2RhdGEtc3RvcmVcIjtcclxuXHJcbnN0b3JlKFwiYXNzaWdubWVudHNcIikuc2V0SW5pdChmdW5jdGlvbihpdGVtKSB7XHJcblx0Ly8gcGFyc2UgdGhlIGRhdGVcclxuXHRpZih0eXBlb2YgaXRlbS5kYXRlID09IFwic3RyaW5nXCIpIHtcclxuXHRcdGl0ZW0uZGF0ZSA9IG5ldyBEYXRlKGl0ZW0uZGF0ZSk7XHJcblx0fVxyXG59KTtcclxuXHJcbi8vIGluc3RhbnRpYXRlIHRoZSBkb21cclxubGlmZUxpbmUubWFrZURvbSh7XHJcblx0cGFyZW50OiBkb2N1bWVudC5ib2R5LFxyXG5cdGdyb3VwOiBbXHJcblx0XHR7IHdpZGdldDogXCJzaWRlYmFyXCIgfSxcclxuXHRcdHsgd2lkZ2V0OiBcImNvbnRlbnRcIiB9XHJcblx0XVxyXG59KTtcclxuXHJcbi8vIGFkZCBsaXN0IHZpZXdzIHRvIHRoZSBuYXZiYXJcclxuaW5pdE5hdkJhcigpO1xyXG5cclxuLy8gY3JlYXRlIGEgbmV3IGFzc2lnbm1lbnRcclxubGlmZUxpbmUuYWRkQ29tbWFuZChcIk5ldyBhc3NpZ25tZW50XCIsICgpID0+IHtcclxuXHR2YXIgaWQgPSBNYXRoLmZsb29yKE1hdGgucmFuZG9tKCkgKiAxMDAwMDAwMDApO1xyXG5cclxuXHRsaWZlTGluZS5uYXYubmF2aWdhdGUoXCIvZWRpdC9cIiArIGlkKTtcclxufSk7XHJcblxyXG4vLyBjcmVhdGUgdGhlIGxvZ291dCBidXR0b25cclxubGlmZUxpbmUuYWRkTmF2Q29tbWFuZChcIkFjY291bnRcIiwgXCIvYWNjb3VudFwiKTtcclxuIiwiLyoqXHJcbiAqIERhdGUgcmVsYXRlZCB0b29sc1xyXG4gKi9cclxuXHJcbiAvLyBjaGVjayBpZiB0aGUgZGF0ZXMgYXJlIHRoZSBzYW1lIGRheVxyXG4gZXhwb3J0IGZ1bmN0aW9uIGlzU2FtZURhdGUoZGF0ZTEsIGRhdGUyKSB7XHJcbiBcdHJldHVybiBkYXRlMS5nZXRGdWxsWWVhcigpID09IGRhdGUyLmdldEZ1bGxZZWFyKCkgJiZcclxuIFx0XHRkYXRlMS5nZXRNb250aCgpID09IGRhdGUyLmdldE1vbnRoKCkgJiZcclxuIFx0XHRkYXRlMS5nZXREYXRlKCkgPT0gZGF0ZTIuZ2V0RGF0ZSgpO1xyXG4gfTtcclxuXHJcbiAvLyBjaGVjayBpZiBhIGRhdGUgaXMgbGVzcyB0aGFuIGFub3RoZXJcclxuIGV4cG9ydCBmdW5jdGlvbiBpc1Nvb25lckRhdGUoZGF0ZTEsIGRhdGUyKSB7XHJcbiAgICAgLy8gY2hlY2sgdGhlIHllYXIgZmlyc3RcclxuICAgICBpZihkYXRlMS5nZXRGdWxsWWVhcigpICE9IGRhdGUyLmdldEZ1bGxZZWFyKCkpIHtcclxuICAgICAgICAgcmV0dXJuIGRhdGUxLmdldEZ1bGxZZWFyKCkgPCBkYXRlMi5nZXRGdWxsWWVhcigpO1xyXG4gICAgIH1cclxuXHJcbiAgICAgLy8gY2hlY2sgdGhlIG1vbnRoIG5leHRcclxuICAgICBpZihkYXRlMS5nZXRNb250aCgpICE9IGRhdGUyLmdldE1vbnRoKCkpIHtcclxuICAgICAgICAgcmV0dXJuIGRhdGUxLmdldE1vbnRoKCkgPCBkYXRlMi5nZXRNb250aCgpO1xyXG4gICAgIH1cclxuXHJcbiAgICAgLy8gY2hlY2sgdGhlIGRheVxyXG4gICAgIHJldHVybiBkYXRlMS5nZXREYXRlKCkgPCBkYXRlMi5nZXREYXRlKCk7XHJcbiB9O1xyXG5cclxuIC8vIGdldCB0aGUgZGF0ZSBkYXlzIGZyb20gbm93XHJcbiBleHBvcnQgZnVuY3Rpb24gZGF5c0Zyb21Ob3coZGF5cykge1xyXG4gXHR2YXIgZGF0ZSA9IG5ldyBEYXRlKCk7XHJcblxyXG4gXHQvLyBhZHZhbmNlIHRoZSBkYXRlXHJcbiBcdGRhdGUuc2V0RGF0ZShkYXRlLmdldERhdGUoKSArIGRheXMpO1xyXG5cclxuIFx0cmV0dXJuIGRhdGU7XHJcbiB9O1xyXG5cclxuIGNvbnN0IFNUUklOR19EQVlTID0gW1wiU3VuZGF5XCIsIFwiTW9uZGF5XCIsIFwiVHVlc2RheVwiLCBcIldlZGVuc2RheVwiLCBcIlRodXJzZGF5XCIsIFwiRnJpZGF5XCIsIFwiU2F0dXJkYXlcIl07XHJcblxyXG4gLy8gY29udmVydCBhIGRhdGUgdG8gYSBzdHJpbmdcclxuIGV4cG9ydCBmdW5jdGlvbiBzdHJpbmdpZnlEYXRlKGRhdGUsIG9wdHMgPSB7fSkge1xyXG5cdCB2YXIgc3RyRGF0ZSwgc3RyVGltZSA9IFwiXCI7XHJcblxyXG4gICAgIC8vIGNoZWNrIGlmIHRoZSBkYXRlIGlzIGJlZm9yZSB0b2RheVxyXG4gICAgIHZhciBiZWZvcmVOb3cgPSBkYXRlLmdldFRpbWUoKSA8IERhdGUubm93KCk7XHJcblxyXG4gXHQvLyBUb2RheVxyXG4gXHRpZihpc1NhbWVEYXRlKGRhdGUsIG5ldyBEYXRlKCkpKVxyXG4gXHRcdHN0ckRhdGUgPSBcIlRvZGF5XCI7XHJcblxyXG4gXHQvLyBUb21vcnJvd1xyXG4gXHRlbHNlIGlmKGlzU2FtZURhdGUoZGF0ZSwgZGF5c0Zyb21Ob3coMSkpICYmICFiZWZvcmVOb3cpXHJcbiBcdFx0c3RyRGF0ZSA9IFwiVG9tb3Jyb3dcIjtcclxuXHJcbiBcdC8vIGRheSBvZiB0aGUgd2VlayAodGhpcyB3ZWVrKVxyXG4gXHRlbHNlIGlmKGlzU29vbmVyRGF0ZShkYXRlLCBkYXlzRnJvbU5vdyg3KSkgJiYgIWJlZm9yZU5vdylcclxuIFx0XHRzdHJEYXRlID0gU1RSSU5HX0RBWVNbZGF0ZS5nZXREYXkoKV07XHJcblxyXG4gXHQvLyBwcmludCB0aGUgZGF0ZVxyXG4gXHRlbHNlXHJcblx0IFx0c3RyRGF0ZSA9IGAke1NUUklOR19EQVlTW2RhdGUuZ2V0RGF5KCldfSAke2RhdGUuZ2V0TW9udGgoKSArIDF9LyR7ZGF0ZS5nZXREYXRlKCl9YDtcclxuXHJcblx0Ly8gYWRkIHRoZSB0aW1lIG9uXHJcblx0aWYob3B0cy5pbmNsdWRlVGltZSAmJiAhaXNTa2lwVGltZShkYXRlLCBvcHRzLnNraXBUaW1lcykpIHtcclxuXHRcdHJldHVybiBzdHJEYXRlICsgXCIsIFwiICsgc3RyaW5naWZ5VGltZShkYXRlKTtcclxuXHR9XHJcblxyXG5cdHJldHVybiBzdHJEYXRlO1xyXG4gfTtcclxuXHJcbi8vIGNoZWNrIGlmIHRoaXMgaXMgb25lIG9mIHRoZSBnaXZlbiBza2lwIHRpbWVzXHJcbmV4cG9ydCBmdW5jdGlvbiBpc1NraXBUaW1lKGRhdGUsIHNraXBzID0gW10pIHtcclxuXHRyZXR1cm4gc2tpcHMuZmluZChza2lwID0+IHtcclxuXHRcdHJldHVybiBza2lwLmhvdXIgPT09IGRhdGUuZ2V0SG91cnMoKSAmJiBza2lwLm1pbnV0ZSA9PT0gZGF0ZS5nZXRNaW51dGVzKCk7XHJcblx0fSk7XHJcbn07XHJcblxyXG4vLyBjb252ZXJ0IGEgdGltZSB0byBhIHN0cmluZ1xyXG5leHBvcnQgZnVuY3Rpb24gc3RyaW5naWZ5VGltZShkYXRlKSB7XHJcblx0dmFyIGhvdXIgPSBkYXRlLmdldEhvdXJzKCk7XHJcblxyXG5cdC8vIGdldCB0aGUgYW0vcG0gdGltZVxyXG5cdHZhciBpc0FtID0gaG91ciA8IDEyO1xyXG5cclxuXHQvLyBtaWRuaWdodFxyXG5cdGlmKGhvdXIgPT09IDApIGhvdXIgPSAxMjtcclxuXHQvLyBhZnRlciBub29uXHJcblx0aWYoaG91ciA+IDEyKSBob3VyID0gaG91ciAtIDEyO1xyXG5cclxuXHR2YXIgbWludXRlID0gZGF0ZS5nZXRNaW51dGVzKCk7XHJcblxyXG5cdC8vIGFkZCBhIGxlYWRpbmcgMFxyXG5cdGlmKG1pbnV0ZSA8IDEwKSBtaW51dGUgPSBcIjBcIiArIG1pbnV0ZTtcclxuXHJcblx0cmV0dXJuIGhvdXIgKyBcIjpcIiArIG1pbnV0ZSArIChpc0FtID8gXCJhbVwiIDogXCJwbVwiKTtcclxufVxyXG4iLCIvKipcclxuICogQSBoZWxwZXIgZm9yIGJ1aWxkaW5nIGRvbSBub2Rlc1xyXG4gKi9cclxuXHJcbmNvbnN0IFNWR19FTEVNRU5UUyA9IFtcInN2Z1wiLCBcImxpbmVcIl07XHJcbmNvbnN0IFNWR19OQU1FU1BBQ0UgPSBcImh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnXCI7XHJcblxyXG4vLyBidWlsZCBhIHNpbmdsZSBkb20gbm9kZVxyXG52YXIgbWFrZURvbSA9IGZ1bmN0aW9uKG9wdHMgPSB7fSkge1xyXG5cdC8vIGdldCBvciBjcmVhdGUgdGhlIG5hbWUgbWFwcGluZ1xyXG5cdHZhciBtYXBwZWQgPSBvcHRzLm1hcHBlZCB8fCB7fTtcclxuXHJcblx0dmFyICRlbDtcclxuXHJcblx0Ly8gdGhlIGVsZW1lbnQgaXMgcGFydCBvZiB0aGUgc3ZnIG5hbWVzcGFjZVxyXG5cdGlmKFNWR19FTEVNRU5UUy5pbmRleE9mKG9wdHMudGFnKSAhPT0gLTEpIHtcclxuXHRcdCRlbCA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnROUyhTVkdfTkFNRVNQQUNFLCBvcHRzLnRhZyk7XHJcblx0fVxyXG5cdC8vIGEgcGxhaW4gZWxlbWVudFxyXG5cdGVsc2Uge1xyXG5cdFx0JGVsID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudChvcHRzLnRhZyB8fCBcImRpdlwiKTtcclxuXHR9XHJcblxyXG5cdC8vIHNldCB0aGUgY2xhc3Nlc1xyXG5cdGlmKG9wdHMuY2xhc3Nlcykge1xyXG5cdFx0JGVsLnNldEF0dHJpYnV0ZShcImNsYXNzXCIsIHR5cGVvZiBvcHRzLmNsYXNzZXMgPT0gXCJzdHJpbmdcIiA/IG9wdHMuY2xhc3NlcyA6IG9wdHMuY2xhc3Nlcy5qb2luKFwiIFwiKSk7XHJcblx0fVxyXG5cclxuXHQvLyBhdHRhY2ggdGhlIGF0dHJpYnV0ZXNcclxuXHRpZihvcHRzLmF0dHJzKSB7XHJcblx0XHRPYmplY3QuZ2V0T3duUHJvcGVydHlOYW1lcyhvcHRzLmF0dHJzKVxyXG5cclxuXHRcdC5mb3JFYWNoKGF0dHIgPT4gJGVsLnNldEF0dHJpYnV0ZShhdHRyLCBvcHRzLmF0dHJzW2F0dHJdKSk7XHJcblx0fVxyXG5cclxuXHQvLyBzZXQgdGhlIHRleHQgY29udGVudFxyXG5cdGlmKG9wdHMudGV4dCkge1xyXG5cdFx0JGVsLmlubmVyVGV4dCA9IG9wdHMudGV4dDtcclxuXHR9XHJcblxyXG5cdC8vIGF0dGFjaCB0aGUgbm9kZSB0byBpdHMgcGFyZW50XHJcblx0aWYob3B0cy5wYXJlbnQpIHtcclxuXHRcdG9wdHMucGFyZW50Lmluc2VydEJlZm9yZSgkZWwsIG9wdHMuYmVmb3JlKTtcclxuXHR9XHJcblxyXG5cdC8vIGFkZCBldmVudCBsaXN0ZW5lcnNcclxuXHRpZihvcHRzLm9uKSB7XHJcblx0XHRmb3IobGV0IG5hbWUgb2YgT2JqZWN0LmdldE93blByb3BlcnR5TmFtZXMob3B0cy5vbikpIHtcclxuXHRcdFx0JGVsLmFkZEV2ZW50TGlzdGVuZXIobmFtZSwgb3B0cy5vbltuYW1lXSk7XHJcblxyXG5cdFx0XHQvLyBhdHRhY2ggdGhlIGRvbSB0byBhIGRpc3Bvc2FibGVcclxuXHRcdFx0aWYob3B0cy5kaXNwKSB7XHJcblx0XHRcdFx0b3B0cy5kaXNwLmFkZCh7XHJcblx0XHRcdFx0XHR1bnN1YnNjcmliZTogKCkgPT4gJGVsLnJlbW92ZUV2ZW50TGlzdGVuZXIobmFtZSwgb3B0cy5vbltuYW1lXSlcclxuXHRcdFx0XHR9KTtcclxuXHRcdFx0fVxyXG5cdFx0fVxyXG5cdH1cclxuXHJcblx0Ly8gc2V0IHRoZSB2YWx1ZSBvZiBhbiBpbnB1dCBlbGVtZW50XHJcblx0aWYob3B0cy52YWx1ZSkge1xyXG5cdFx0JGVsLnZhbHVlID0gb3B0cy52YWx1ZTtcclxuXHR9XHJcblxyXG5cdC8vIGFkZCB0aGUgbmFtZSBtYXBwaW5nXHJcblx0aWYob3B0cy5uYW1lKSB7XHJcblx0XHRtYXBwZWRbb3B0cy5uYW1lXSA9ICRlbDtcclxuXHR9XHJcblxyXG5cdC8vIGNyZWF0ZSB0aGUgY2hpbGQgZG9tIG5vZGVzXHJcblx0aWYob3B0cy5jaGlsZHJlbikge1xyXG5cdFx0Zm9yKGxldCBjaGlsZCBvZiBvcHRzLmNoaWxkcmVuKSB7XHJcblx0XHRcdC8vIG1ha2UgYW4gYXJyYXkgaW50byBhIGdyb3VwIE9iamVjdFxyXG5cdFx0XHRpZihBcnJheS5pc0FycmF5KGNoaWxkKSkge1xyXG5cdFx0XHRcdGNoaWxkID0ge1xyXG5cdFx0XHRcdFx0Z3JvdXA6IGNoaWxkXHJcblx0XHRcdFx0fTtcclxuXHRcdFx0fVxyXG5cclxuXHRcdFx0Ly8gYXR0YWNoIGluZm9ybWF0aW9uIGZvciB0aGUgZ3JvdXBcclxuXHRcdFx0Y2hpbGQucGFyZW50ID0gJGVsO1xyXG5cdFx0XHRjaGlsZC5kaXNwID0gb3B0cy5kaXNwO1xyXG5cdFx0XHRjaGlsZC5tYXBwZWQgPSBtYXBwZWQ7XHJcblxyXG5cdFx0XHQvLyBidWlsZCB0aGUgbm9kZSBvciBncm91cFxyXG5cdFx0XHRtYWtlKGNoaWxkKTtcclxuXHRcdH1cclxuXHR9XHJcblxyXG5cdHJldHVybiBtYXBwZWQ7XHJcbn1cclxuXHJcbi8vIGJ1aWxkIGEgZ3JvdXAgb2YgZG9tIG5vZGVzXHJcbnZhciBtYWtlR3JvdXAgPSBmdW5jdGlvbihncm91cCkge1xyXG5cdC8vIHNob3J0aGFuZCBmb3IgYSBncm91cHNcclxuXHRpZihBcnJheS5pc0FycmF5KGdyb3VwKSkge1xyXG5cdFx0Z3JvdXAgPSB7XHJcblx0XHRcdGNoaWxkcmVuOiBncm91cFxyXG5cdFx0fTtcclxuXHR9XHJcblxyXG5cdC8vIGdldCBvciBjcmVhdGUgdGhlIG5hbWUgbWFwcGluZ1xyXG5cdHZhciBtYXBwZWQgPSB7fTtcclxuXHJcblx0Zm9yKGxldCBub2RlIG9mIGdyb3VwLmdyb3VwKSB7XHJcblx0XHQvLyBjb3B5IG92ZXIgcHJvcGVydGllcyBmcm9tIHRoZSBncm91cFxyXG5cdFx0bm9kZS5wYXJlbnQgfHwgKG5vZGUucGFyZW50ID0gZ3JvdXAucGFyZW50KTtcclxuXHRcdG5vZGUuZGlzcCB8fCAobm9kZS5kaXNwID0gZ3JvdXAuZGlzcCk7XHJcblx0XHRub2RlLm1hcHBlZCA9IG1hcHBlZDtcclxuXHJcblx0XHQvLyBtYWtlIHRoZSBkb21cclxuXHRcdG1ha2Uobm9kZSk7XHJcblx0fVxyXG5cclxuXHQvLyBjYWxsIHRoZSBjYWxsYmFjayB3aXRoIHRoZSBtYXBwZWQgbmFtZXNcclxuXHRpZihncm91cC5iaW5kKSB7XHJcblx0XHR2YXIgc3Vic2NyaXB0aW9uID0gZ3JvdXAuYmluZChtYXBwZWQpO1xyXG5cclxuXHRcdC8vIGlmIHRoZSByZXR1cm4gYSBzdWJzY3JpcHRpb24gYXR0YWNoIGl0IHRvIHRoZSBkaXNwb3NhYmxlXHJcblx0XHRpZihzdWJzY3JpcHRpb24gJiYgZ3JvdXAuZGlzcCkge1xyXG5cdFx0XHRncm91cC5kaXNwLmFkZChzdWJzY3JpcHRpb24pO1xyXG5cdFx0fVxyXG5cdH1cclxuXHJcblx0cmV0dXJuIG1hcHBlZDtcclxufTtcclxuXHJcbi8vIGEgY29sbGVjdGlvbiBvZiB3aWRnZXRzXHJcbnZhciB3aWRnZXRzID0ge307XHJcblxyXG5leHBvcnQgZGVmYXVsdCBmdW5jdGlvbiBtYWtlKG9wdHMpIHtcclxuXHQvLyBoYW5kbGUgYSBncm91cFxyXG5cdGlmKEFycmF5LmlzQXJyYXkob3B0cykgfHwgb3B0cy5ncm91cCkge1xyXG5cdFx0cmV0dXJuIG1ha2VHcm91cChvcHRzKTtcclxuXHR9XHJcblx0Ly8gbWFrZSBhIHdpZGdldFxyXG5cdGVsc2UgaWYob3B0cy53aWRnZXQpIHtcclxuXHRcdHZhciB3aWRnZXQgPSB3aWRnZXRzW29wdHMud2lkZ2V0XTtcclxuXHJcblx0XHQvLyBub3QgZGVmaW5lZFxyXG5cdFx0aWYoIXdpZGdldCkge1xyXG5cdFx0XHR0aHJvdyBuZXcgRXJyb3IoYFdpZGdldCAnJHtvcHRzLndpZGdldH0nIGlzIG5vdCBkZWZpbmVkIG1ha2Ugc3VyZSBpdHMgYmVlbiBpbXBvcnRlZGApO1xyXG5cdFx0fVxyXG5cclxuXHRcdC8vIGdlbmVyYXRlIHRoZSB3aWRnZXQgY29udGVudFxyXG5cdFx0dmFyIGJ1aWx0ID0gd2lkZ2V0Lm1ha2Uob3B0cyk7XHJcblxyXG5cdFx0cmV0dXJuIG1ha2VHcm91cCh7XHJcblx0XHRcdHBhcmVudDogb3B0cy5wYXJlbnQsXHJcblx0XHRcdGRpc3A6IG9wdHMuZGlzcCxcclxuXHRcdFx0Z3JvdXA6IEFycmF5LmlzQXJyYXkoYnVpbHQpID8gYnVpbHQgOiBbYnVpbHRdLFxyXG5cdFx0XHRiaW5kOiB3aWRnZXQuYmluZCAmJiB3aWRnZXQuYmluZC5iaW5kKHdpZGdldCwgb3B0cylcclxuXHRcdH0pO1xyXG5cdH1cclxuXHQvLyBtYWtlIGEgc2luZ2xlIG5vZGVcclxuXHRlbHNlIHtcclxuXHRcdHJldHVybiBtYWtlRG9tKG9wdHMpO1xyXG5cdH1cclxufTtcclxuXHJcbi8vIHJlZ2lzdGVyIGEgd2lkZ2V0XHJcbm1ha2UucmVnaXN0ZXIgPSBmdW5jdGlvbihuYW1lLCB3aWRnZXQpIHtcclxuXHR3aWRnZXRzW25hbWVdID0gd2lkZ2V0O1xyXG59O1xyXG4iLCIvKipcclxuICogQSB2aWV3IGZvciBhY2Nlc3NpbmcvbW9kaWZ5aW5nIGluZm9ybWF0aW9uIGFib3V0IHRoZSBjdXJyZW50IHVzZXJcclxuICovXHJcblxyXG5saWZlTGluZS5uYXYucmVnaXN0ZXIoe1xyXG5cdG1hdGNoZXI6IC9eKD86XFwvdXNlclxcLyguKz8pfFxcL2FjY291bnQpJC8sXHJcblxyXG5cdG1ha2Uoe3NldFRpdGxlLCBjb250ZW50LCBtYXRjaH0pIHtcclxuXHRcdHNldFRpdGxlKFwiQWNjb3VudFwiKTtcclxuXHJcblx0XHR2YXIgdXJsID0gXCIvYXBpL2F1dGgvaW5mby9nZXRcIjtcclxuXHJcblx0XHQvLyBhZGQgdGhlIHVzZXJuYW1lIGlmIG9uZSBpcyBnaXZlblxyXG5cdFx0aWYobWF0Y2hbMV0pIHVybCArPSBgP3VzZXJuYW1lPSR7bWF0Y2hbMV19YDtcclxuXHJcblx0XHQvLyBsb2FkIHRoZSB1c2VyIGRhdGFcclxuXHRcdGZldGNoKHVybCwgeyBjcmVkZW50aWFsczogXCJpbmNsdWRlXCIgfSlcclxuXHJcblx0XHQudGhlbihyZXMgPT4gcmVzLmpzb24oKSlcclxuXHJcblx0XHQudGhlbihyZXMgPT4ge1xyXG5cdFx0XHQvLyBubyBzdWNoIHVzZXIgb3IgYWNjZXNzIGlzIGRlbmllZFxyXG5cdFx0XHRpZihyZXMuc3RhdHVzID09IFwiZmFpbFwiKSB7XHJcblx0XHRcdFx0bGlmZUxpbmUubWFrZURvbSh7XHJcblx0XHRcdFx0XHRwYXJlbnQ6IGNvbnRlbnQsXHJcblx0XHRcdFx0XHRjbGFzc2VzOiBcImNvbnRlbnQtcGFkZGVkXCIsXHJcblx0XHRcdFx0XHR0ZXh0OiBcIkNvdWxkIG5vdCBhY2Nlc3MgdGhlIHVzZXIgeW91IHdlcmUgbG9va2luZyBmb3JcIlxyXG5cdFx0XHRcdH0pO1xyXG5cclxuXHRcdFx0XHRyZXR1cm47XHJcblx0XHRcdH1cclxuXHJcblx0XHRcdHZhciB1c2VyID0gcmVzLmRhdGE7XHJcblxyXG5cdFx0XHQvLyBnZW5lcmF0ZSB0aGUgcGFnZVxyXG5cdFx0XHR2YXIgY2hpbGRyZW4gPSBbXTtcclxuXHJcblx0XHRcdGNoaWxkcmVuLnB1c2goe1xyXG5cdFx0XHRcdHRhZzogXCJoMlwiLFxyXG5cdFx0XHRcdHRleHQ6IHVzZXIudXNlcm5hbWVcclxuXHRcdFx0fSk7XHJcblxyXG5cdFx0XHQvLyBkaXNwbGF5IHRoZSBhZG1pbiBzdGF0dXMgb2YgYW5vdGhlciB1c2VyXHJcblx0XHRcdGlmKG1hdGNoWzFdKSB7XHJcblx0XHRcdFx0Y2hpbGRyZW4ucHVzaCh7XHJcblx0XHRcdFx0XHR0ZXh0OiBgJHt1c2VyLnVzZXJuYW1lfSBpcyAke3VzZXIuYWRtaW4gPyBcIlwiIDogXCJub3RcIn0gYW4gYWRtaW5gXHJcblx0XHRcdFx0fSk7XHJcblx0XHRcdH1cclxuXHRcdFx0Ly8gZGlzcGxheSB0aGUgYWRtaW4gc3RhdHVzIG9mIHRoaXMgdXNlclxyXG5cdFx0XHRlbHNlIHtcclxuXHRcdFx0XHRjaGlsZHJlbi5wdXNoKHtcclxuXHRcdFx0XHRcdHRleHQ6IGBZb3UgYXJlICR7dXNlci5hZG1pbiA/IFwiXCIgOiBcIm5vdFwifSBhbiBhZG1pbmBcclxuXHRcdFx0XHR9KTtcclxuXHJcblx0XHRcdFx0Ly8gYWRkIGEgbGluayBhdCBhIGxpc3Qgb2YgYWxsIHVzZXJzXHJcblx0XHRcdFx0aWYodXNlci5hZG1pbikge1xyXG5cdFx0XHRcdFx0Y2hpbGRyZW4ucHVzaCh7IHRhZzogXCJiclwiIH0pO1xyXG5cclxuXHRcdFx0XHRcdGNoaWxkcmVuLnB1c2goe1xyXG5cdFx0XHRcdFx0XHR3aWRnZXQ6IFwibGlua1wiLFxyXG5cdFx0XHRcdFx0XHRocmVmOiBcIi91c2Vyc1wiLFxyXG5cdFx0XHRcdFx0XHR0ZXh0OiBcIlZpZXcgYWxsIHVzZXJzXCJcclxuXHRcdFx0XHRcdH0pO1xyXG5cdFx0XHRcdH1cclxuXHRcdFx0fVxyXG5cclxuXHRcdFx0dmFyIHBhc3N3b3JkQ2hhbmdlID0ge307XHJcblxyXG5cdFx0XHRjaGlsZHJlbi5wdXNoKHtcclxuXHRcdFx0XHR0YWc6IFwiZm9ybVwiLFxyXG5cdFx0XHRcdGNoaWxkcmVuOiBbXHJcblx0XHRcdFx0XHR7XHJcblx0XHRcdFx0XHRcdGNsYXNzZXM6IFwiZWRpdG9yLXJvd1wiLFxyXG5cdFx0XHRcdFx0XHRjaGlsZHJlbjogW1xyXG5cdFx0XHRcdFx0XHRcdHtcclxuXHRcdFx0XHRcdFx0XHRcdHdpZGdldDogXCJpbnB1dFwiLFxyXG5cdFx0XHRcdFx0XHRcdFx0dHlwZTogXCJwYXNzd29yZFwiLFxyXG5cdFx0XHRcdFx0XHRcdFx0cGxhY2Vob2xkZXI6IFwiT2xkIHBhc3N3b3JkXCIsXHJcblx0XHRcdFx0XHRcdFx0XHRiaW5kOiBwYXNzd29yZENoYW5nZSxcclxuXHRcdFx0XHRcdFx0XHRcdHByb3A6IFwib2xkUGFzc3dvcmRcIlxyXG5cdFx0XHRcdFx0XHRcdH0sXHJcblx0XHRcdFx0XHRcdFx0e1xyXG5cdFx0XHRcdFx0XHRcdFx0d2lkZ2V0OiBcImlucHV0XCIsXHJcblx0XHRcdFx0XHRcdFx0XHR0eXBlOiBcInBhc3N3b3JkXCIsXHJcblx0XHRcdFx0XHRcdFx0XHRwbGFjZWhvbGRlcjogXCJOZXcgcGFzc3dvcmRcIixcclxuXHRcdFx0XHRcdFx0XHRcdGJpbmQ6IHBhc3N3b3JkQ2hhbmdlLFxyXG5cdFx0XHRcdFx0XHRcdFx0cHJvcDogXCJwYXNzd29yZFwiXHJcblx0XHRcdFx0XHRcdFx0fVxyXG5cdFx0XHRcdFx0XHRdXHJcblx0XHRcdFx0XHR9LFxyXG5cdFx0XHRcdFx0e1xyXG5cdFx0XHRcdFx0XHR0YWc6IFwiYnV0dG9uXCIsXHJcblx0XHRcdFx0XHRcdGNsYXNzZXM6IFwiZmFuY3ktYnV0dG9uXCIsXHJcblx0XHRcdFx0XHRcdHRleHQ6IFwiQ2hhbmdlIHBhc3N3b3JkXCIsXHJcblx0XHRcdFx0XHRcdGF0dHJzOiB7XHJcblx0XHRcdFx0XHRcdFx0dHlwZTogXCJzdWJtaXRcIlxyXG5cdFx0XHRcdFx0XHR9XHJcblx0XHRcdFx0XHR9LFxyXG5cdFx0XHRcdFx0e1xyXG5cdFx0XHRcdFx0XHRuYW1lOiBcIm1zZ1wiXHJcblx0XHRcdFx0XHR9XHJcblx0XHRcdFx0XSxcclxuXHRcdFx0XHRvbjoge1xyXG5cdFx0XHRcdFx0Ly8gY2hhbmdlIHRoZSBwYXNzd29yZFxyXG5cdFx0XHRcdFx0c3VibWl0OiBlID0+IHtcclxuXHRcdFx0XHRcdFx0ZS5wcmV2ZW50RGVmYXVsdCgpO1xyXG5cclxuXHRcdFx0XHRcdFx0Ly8gbm8gcGFzc3dvcmQgc3VwcGxpZWRcclxuXHRcdFx0XHRcdFx0aWYoIXBhc3N3b3JkQ2hhbmdlLnBhc3N3b3JkKSB7XHJcblx0XHRcdFx0XHRcdFx0c2hvd01zZyhcIkVudGVyIGEgbmV3IHBhc3N3b3JkXCIpO1xyXG5cdFx0XHRcdFx0XHRcdHJldHVybjtcclxuXHRcdFx0XHRcdFx0fVxyXG5cclxuXHRcdFx0XHRcdFx0Ly8gc2VuZCB0aGUgcGFzc3dvcmQgY2hhbmdlIHJlcXVlc3RcclxuXHRcdFx0XHRcdFx0ZmV0Y2goYC9hcGkvYXV0aC9pbmZvL3NldD91c2VybmFtZT0ke3VzZXIudXNlcm5hbWV9YCwge1xyXG5cdFx0XHRcdFx0XHRcdGNyZWRlbnRpYWxzOiBcImluY2x1ZGVcIixcclxuXHRcdFx0XHRcdFx0XHRtZXRob2Q6IFwiUE9TVFwiLFxyXG5cdFx0XHRcdFx0XHRcdGJvZHk6IEpTT04uc3RyaW5naWZ5KHBhc3N3b3JkQ2hhbmdlKVxyXG5cdFx0XHRcdFx0XHR9KVxyXG5cclxuXHRcdFx0XHRcdFx0LnRoZW4ocmVzID0+IHJlcy5qc29uKCkpXHJcblxyXG5cdFx0XHRcdFx0XHQudGhlbihyZXMgPT4ge1xyXG5cdFx0XHRcdFx0XHRcdC8vIHBhc3N3b3JkIGNoYW5nZSBmYWlsZWRcclxuXHRcdFx0XHRcdFx0XHRpZihyZXMuc3RhdHVzID09IFwiZmFpbFwiKSB7XHJcblx0XHRcdFx0XHRcdFx0XHRzaG93TXNnKHJlcy5kYXRhLm1zZyk7XHJcblx0XHRcdFx0XHRcdFx0fVxyXG5cclxuXHRcdFx0XHRcdFx0XHRpZihyZXMuc3RhdHVzID09IFwic3VjY2Vzc1wiKSB7XHJcblx0XHRcdFx0XHRcdFx0XHRzaG93TXNnKFwiUGFzc3dvcmQgY2hhbmdlZFwiKTtcclxuXHRcdFx0XHRcdFx0XHR9XHJcblx0XHRcdFx0XHRcdH0pO1xyXG5cdFx0XHRcdFx0fVxyXG5cdFx0XHRcdH1cclxuXHRcdFx0fSk7XHJcblxyXG5cdFx0XHRjaGlsZHJlbi5wdXNoKHsgdGFnOiBcImJyXCIgfSk7XHJcblx0XHRcdGNoaWxkcmVuLnB1c2goeyB0YWc6IFwiYnJcIiB9KTtcclxuXHJcblx0XHRcdC8vIG9ubHkgZGlzcGxheSB0aGUgbG9nb3V0IGJ1dHRvbiBpZiB3ZSBhcmUgb24gdGhlIC9hY2NvdW50IHBhZ2VcclxuXHRcdFx0aWYoIW1hdGNoWzFdKSB7XHJcblx0XHRcdFx0Y2hpbGRyZW4ucHVzaCh7XHJcblx0XHRcdFx0XHR0YWc6IFwiYnV0dG9uXCIsXHJcblx0XHRcdFx0XHRjbGFzc2VzOiBcImZhbmN5LWJ1dHRvblwiLFxyXG5cdFx0XHRcdFx0dGV4dDogXCJMb2dvdXRcIixcclxuXHRcdFx0XHRcdG9uOiB7XHJcblx0XHRcdFx0XHRcdGNsaWNrOiAoKSA9PiB7XHJcblx0XHRcdFx0XHRcdFx0Ly8gc2VuZCB0aGUgbG9nb3V0IHJlcXVlc3RcclxuXHRcdFx0XHRcdFx0XHRmZXRjaChcIi9hcGkvYXV0aC9sb2dvdXRcIiwgeyBjcmVkZW50aWFsczogXCJpbmNsdWRlXCIgfSlcclxuXHJcblx0XHRcdFx0XHRcdFx0Ly8gcmV0dXJuIHRvIHRoZSBsb2dpbiBwYWdlXHJcblx0XHRcdFx0XHRcdFx0LnRoZW4oKCkgPT4gbGlmZUxpbmUubmF2Lm5hdmlnYXRlKFwiL2xvZ2luXCIpKTtcclxuXHRcdFx0XHRcdFx0fVxyXG5cdFx0XHRcdFx0fVxyXG5cdFx0XHRcdH0pO1xyXG5cdFx0XHR9XHJcblxyXG5cdFx0XHR2YXIge21zZ30gPSBsaWZlTGluZS5tYWtlRG9tKHtcclxuXHRcdFx0XHRwYXJlbnQ6IGNvbnRlbnQsXHJcblx0XHRcdFx0Y2xhc3NlczogXCJjb250ZW50LXBhZGRlZFwiLFxyXG5cdFx0XHRcdGNoaWxkcmVuXHJcblx0XHRcdH0pO1xyXG5cclxuXHRcdFx0Ly8gc2hvdyBhIG1lc3NhZ2VcclxuXHRcdFx0dmFyIHNob3dNc2cgPSBmdW5jdGlvbih0ZXh0KSB7XHJcblx0XHRcdFx0bXNnLmlubmVyVGV4dCA9IHRleHQ7XHJcblx0XHRcdH07XHJcblx0XHR9KVxyXG5cdH1cclxufSk7XHJcbiIsIi8qKlxyXG4gKiBFZGl0IGFuIGFzc2lnbmVtbnRcclxuICovXHJcblxyXG5pbXBvcnQge2RheXNGcm9tTm93LCBzdHJpbmdpZnlEYXRlfSBmcm9tIFwiLi4vdXRpbC9kYXRlXCI7XHJcbmltcG9ydCB7c3RvcmV9IGZyb20gXCIuLi9kYXRhLXN0b3JlXCI7XHJcblxyXG52YXIgYXNzaWdubWVudHMgPSBzdG9yZShcImFzc2lnbm1lbnRzXCIpO1xyXG5cclxubGlmZUxpbmUubmF2LnJlZ2lzdGVyKHtcclxuXHRtYXRjaGVyOiAvXlxcL2VkaXRcXC8oLis/KSQvLFxyXG5cclxuXHRtYWtlKHttYXRjaCwgY29udGVudCwgc2V0VGl0bGUsIGRpc3Bvc2FibGV9KSB7XHJcblx0XHR2YXIgYWN0aW9uU3ViLCBkZWxldGVTdWI7XHJcblxyXG5cdFx0dmFyIGNoYW5nZVN1YiA9IGFzc2lnbm1lbnRzLmdldChtYXRjaFsxXSwgZnVuY3Rpb24oaXRlbSkge1xyXG5cdFx0XHQvLyBjbGVhciB0aGUgY29udGVudFxyXG5cdFx0XHRjb250ZW50LmlubmVySFRNTCA9IFwiXCI7XHJcblxyXG5cdFx0XHQvLyByZW1vdmUgdGhlIHByZXZpb3VzIGFjdGlvblxyXG5cdFx0XHRpZihhY3Rpb25TdWIpIHtcclxuXHRcdFx0XHRhY3Rpb25TdWIudW5zdWJzY3JpYmUoKTtcclxuXHRcdFx0XHRkZWxldGVTdWIudW5zdWJzY3JpYmUoKTtcclxuXHRcdFx0fVxyXG5cclxuXHRcdFx0Ly8gYWRkIGEgYnV0dG9uIGJhY2sgdG8gdGhlIHZpZXdcclxuXHRcdFx0aWYoaXRlbSkge1xyXG5cdFx0XHRcdGFjdGlvblN1YiA9IGxpZmVMaW5lLmFkZEFjdGlvbihcIlZpZXdcIiwgKCkgPT4gbGlmZUxpbmUubmF2Lm5hdmlnYXRlKFwiL2l0ZW0vXCIgKyBpdGVtLmlkKSk7XHJcblxyXG5cdFx0XHRcdGRlbGV0ZVN1YiA9IGxpZmVMaW5lLmFkZEFjdGlvbihcIkRlbGV0ZVwiLCAoKSA9PiB7XHJcblx0XHRcdFx0XHQvLyByZW1vdmUgdGhlIGl0ZW1cclxuXHRcdFx0XHRcdGFzc2lnbm1lbnRzLnJlbW92ZShpdGVtLmlkKTtcclxuXHJcblx0XHRcdFx0XHQvLyBuYXZpZ2F0ZSBhd2F5XHJcblx0XHRcdFx0XHRsaWZlTGluZS5uYXYubmF2aWdhdGUoXCIvXCIpO1xyXG5cdFx0XHRcdH0pO1xyXG5cdFx0XHR9XHJcblxyXG5cdFx0XHQvLyBpZiB0aGUgaXRlbSBkb2VzIG5vdCBleGlzdCBjcmVhdGUgaXRcclxuXHRcdFx0aWYoIWl0ZW0pIHtcclxuXHRcdFx0XHRpdGVtID0ge1xyXG5cdFx0XHRcdFx0bmFtZTogXCJVbm5hbWVkIGl0ZW1cIixcclxuXHRcdFx0XHRcdGNsYXNzOiBcIkNsYXNzXCIsXHJcblx0XHRcdFx0XHRkYXRlOiBnZW5EYXRlKCksXHJcblx0XHRcdFx0XHRpZDogbWF0Y2hbMV0sXHJcblx0XHRcdFx0XHRkZXNjcmlwdGlvbjogXCJcIixcclxuXHRcdFx0XHRcdG1vZGlmaWVkOiBEYXRlLm5vdygpLFxyXG5cdFx0XHRcdFx0dHlwZTogXCJhc3NpZ25tZW50XCJcclxuXHRcdFx0XHR9O1xyXG5cdFx0XHR9XHJcblxyXG5cdFx0XHQvLyBzZXQgdGhlIGluaXRhbCB0aXRsZVxyXG5cdFx0XHRzZXRUaXRsZShcIkVkaXRpbmdcIik7XHJcblxyXG5cdFx0XHQvLyBzYXZlIGNoYW5nZXNcclxuXHRcdFx0dmFyIGNoYW5nZSA9ICgpID0+IHtcclxuXHRcdFx0XHQvLyB1cGRhdGUgdGhlIG1vZGlmaWVkIGRhdGVcclxuXHRcdFx0XHRpdGVtLm1vZGlmaWVkID0gRGF0ZS5ub3coKTtcclxuXHJcblx0XHRcdFx0Ly8gZmluZCB0aGUgZGF0ZSBhbmQgdGltZSBpbnB1dHNcclxuXHRcdFx0XHR2YXIgZGF0ZUlucHV0ID0gZG9jdW1lbnQucXVlcnlTZWxlY3RvcihcImlucHV0W3R5cGU9ZGF0ZV1cIik7XHJcblx0XHRcdFx0dmFyIHRpbWVJbnB1dCA9IGRvY3VtZW50LnF1ZXJ5U2VsZWN0b3IoXCJpbnB1dFt0eXBlPXRpbWVdXCIpO1xyXG5cclxuXHRcdFx0XHQvLyBwYXJzZSB0aGUgZGF0ZVxyXG5cdFx0XHRcdGl0ZW0uZGF0ZSA9IG5ldyBEYXRlKGRhdGVJbnB1dC52YWx1ZSArIFwiIFwiICsgdGltZUlucHV0LnZhbHVlKTtcclxuXHJcblx0XHRcdFx0Ly8gcmVtb3ZlIGFzc2lnbmVtbnQgZmllbGRzIGZyb20gdGFza3NcclxuXHRcdFx0XHRpZihpdGVtLnR5cGUgPT0gXCJ0YXNrXCIpIHtcclxuXHRcdFx0XHRcdGRlbGV0ZSBpdGVtLmRhdGU7XHJcblx0XHRcdFx0XHRkZWxldGUgaXRlbS5jbGFzcztcclxuXHRcdFx0XHR9XHJcblxyXG5cdFx0XHRcdC8vIGFkZCBhIGJ1dHRvbiBiYWNrIHRvIHRoZSB2aWV3XHJcblx0XHRcdFx0aWYoIWFjdGlvblN1Yikge1xyXG5cdFx0XHRcdFx0YWN0aW9uU3ViID0gbGlmZUxpbmUuYWRkQWN0aW9uKFwiVmlld1wiLCAoKSA9PiBsaWZlTGluZS5uYXYubmF2aWdhdGUoXCIvaXRlbS9cIiArIGl0ZW0uaWQpKTtcclxuXHJcblx0XHRcdFx0XHRkZWxldGVTdWIgPSBsaWZlTGluZS5hZGRBY3Rpb24oXCJEZWxldGVcIiwgKCkgPT4ge1xyXG5cdFx0XHRcdFx0XHQvLyByZW1vdmUgdGhlIGl0ZW1cclxuXHRcdFx0XHRcdFx0YXNzaWdubWVudHMucmVtb3ZlKGl0ZW0uaWQpO1xyXG5cclxuXHRcdFx0XHRcdFx0Ly8gbmF2aWdhdGUgYXdheVxyXG5cdFx0XHRcdFx0XHRsaWZlTGluZS5uYXYubmF2aWdhdGUoXCIvXCIpO1xyXG5cdFx0XHRcdFx0fSk7XHJcblx0XHRcdFx0fVxyXG5cclxuXHRcdFx0XHQvLyBzYXZlIHRoZSBjaGFuZ2VzXHJcblx0XHRcdFx0YXNzaWdubWVudHMuc2V0KGl0ZW0sIGNoYW5nZVN1Yik7XHJcblx0XHRcdH07XHJcblxyXG5cdFx0XHQvLyBoaWRlIGFuZCBzaG93IHNwZWNpZmljIGZpZWxkcyBmb3IgZGlmZmVyZW50IGFzc2lnbm1lbnQgdHlwZXNcclxuXHRcdFx0dmFyIHRvZ2dsZUZpZWxkcyA9ICgpID0+IHtcclxuXHRcdFx0XHRpZihpdGVtLnR5cGUgPT0gXCJ0YXNrXCIpIHtcclxuXHRcdFx0XHRcdG1hcHBlZC5jbGFzc0ZpZWxkLnN0eWxlLmRpc3BsYXkgPSBcIm5vbmVcIjtcclxuXHRcdFx0XHRcdG1hcHBlZC5kYXRlRmllbGQuc3R5bGUuZGlzcGxheSA9IFwibm9uZVwiO1xyXG5cdFx0XHRcdH1cclxuXHRcdFx0XHRlbHNlIHtcclxuXHRcdFx0XHRcdG1hcHBlZC5jbGFzc0ZpZWxkLnN0eWxlLmRpc3BsYXkgPSBcIlwiO1xyXG5cdFx0XHRcdFx0bWFwcGVkLmRhdGVGaWVsZC5zdHlsZS5kaXNwbGF5ID0gXCJcIjtcclxuXHRcdFx0XHR9XHJcblx0XHRcdH07XHJcblxyXG5cdFx0XHQvLyByZW5kZXIgdGhlIHVpXHJcblx0XHRcdHZhciBtYXBwZWQgPSBsaWZlTGluZS5tYWtlRG9tKHtcclxuXHRcdFx0XHRwYXJlbnQ6IGNvbnRlbnQsXHJcblx0XHRcdFx0Z3JvdXA6IFtcclxuXHRcdFx0XHRcdHtcclxuXHRcdFx0XHRcdFx0Y2xhc3NlczogXCJlZGl0b3Itcm93XCIsXHJcblx0XHRcdFx0XHRcdGNoaWxkcmVuOiBbXHJcblx0XHRcdFx0XHRcdFx0e1xyXG5cdFx0XHRcdFx0XHRcdFx0d2lkZ2V0OiBcImlucHV0XCIsXHJcblx0XHRcdFx0XHRcdFx0XHRiaW5kOiBpdGVtLFxyXG5cdFx0XHRcdFx0XHRcdFx0cHJvcDogXCJuYW1lXCIsXHJcblx0XHRcdFx0XHRcdFx0XHRjaGFuZ2VcclxuXHRcdFx0XHRcdFx0XHR9XHJcblx0XHRcdFx0XHRcdF1cclxuXHRcdFx0XHRcdH0sXHJcblx0XHRcdFx0XHR7XHJcblx0XHRcdFx0XHRcdGNsYXNzZXM6IFwiZWRpdG9yLXJvd1wiLFxyXG5cdFx0XHRcdFx0XHRjaGlsZHJlbjogW1xyXG5cdFx0XHRcdFx0XHRcdHtcclxuXHRcdFx0XHRcdFx0XHRcdHdpZGdldDogXCJ0b2dnbGUtYnRuc1wiLFxyXG5cdFx0XHRcdFx0XHRcdFx0YnRuczogW1xyXG5cdFx0XHRcdFx0XHRcdFx0XHR7IHRleHQ6IFwiQXNzaWdubWVudFwiLCB2YWx1ZTogXCJhc3NpZ25tZW50XCIgfSxcclxuXHRcdFx0XHRcdFx0XHRcdFx0eyB0ZXh0OiBcIlRhc2tcIiwgdmFsdWU6IFwidGFza1wiIH0sXHJcblx0XHRcdFx0XHRcdFx0XHRdLFxyXG5cdFx0XHRcdFx0XHRcdFx0dmFsdWU6IGl0ZW0udHlwZSxcclxuXHRcdFx0XHRcdFx0XHRcdGNoYW5nZTogdHlwZSA9PiB7XHJcblx0XHRcdFx0XHRcdFx0XHRcdC8vIHVwZGF0ZSB0aGUgaXRlbSB0eXBlXHJcblx0XHRcdFx0XHRcdFx0XHRcdGl0ZW0udHlwZSA9IHR5cGU7XHJcblxyXG5cdFx0XHRcdFx0XHRcdFx0XHQvLyBoaWRlL3Nob3cgc3BlY2lmaWMgZmllbGRzXHJcblx0XHRcdFx0XHRcdFx0XHRcdHRvZ2dsZUZpZWxkcygpO1xyXG5cclxuXHRcdFx0XHRcdFx0XHRcdFx0Ly8gZW1pdCB0aGUgY2hhbmdlXHJcblx0XHRcdFx0XHRcdFx0XHRcdGNoYW5nZSgpO1xyXG5cdFx0XHRcdFx0XHRcdFx0fVxyXG5cdFx0XHRcdFx0XHRcdH1cclxuXHRcdFx0XHRcdFx0XVxyXG5cdFx0XHRcdFx0fSxcclxuXHRcdFx0XHRcdHtcclxuXHRcdFx0XHRcdFx0bmFtZTogXCJjbGFzc0ZpZWxkXCIsXHJcblx0XHRcdFx0XHRcdGNsYXNzZXM6IFwiZWRpdG9yLXJvd1wiLFxyXG5cdFx0XHRcdFx0XHRjaGlsZHJlbjogW1xyXG5cdFx0XHRcdFx0XHRcdHtcclxuXHRcdFx0XHRcdFx0XHRcdHdpZGdldDogXCJpbnB1dFwiLFxyXG5cdFx0XHRcdFx0XHRcdFx0YmluZDogaXRlbSxcclxuXHRcdFx0XHRcdFx0XHRcdHByb3A6IFwiY2xhc3NcIixcclxuXHRcdFx0XHRcdFx0XHRcdGNoYW5nZVxyXG5cdFx0XHRcdFx0XHRcdH1cclxuXHRcdFx0XHRcdFx0XVxyXG5cdFx0XHRcdFx0fSxcclxuXHRcdFx0XHRcdHtcclxuXHRcdFx0XHRcdFx0bmFtZTogXCJkYXRlRmllbGRcIixcclxuXHRcdFx0XHRcdFx0Y2xhc3NlczogXCJlZGl0b3Itcm93XCIsXHJcblx0XHRcdFx0XHRcdGNoaWxkcmVuOiBbXHJcblx0XHRcdFx0XHRcdFx0e1xyXG5cdFx0XHRcdFx0XHRcdFx0d2lkZ2V0OiBcImlucHV0XCIsXHJcblx0XHRcdFx0XHRcdFx0XHR0eXBlOiBcImRhdGVcIixcclxuXHRcdFx0XHRcdFx0XHRcdHZhbHVlOiBpdGVtLmRhdGUgJiYgYCR7aXRlbS5kYXRlLmdldEZ1bGxZZWFyKCl9LSR7cGFkKGl0ZW0uZGF0ZS5nZXRNb250aCgpICsgMSl9LSR7cGFkKGl0ZW0uZGF0ZS5nZXREYXRlKCkpfWAsXHJcblx0XHRcdFx0XHRcdFx0XHRjaGFuZ2VcclxuXHRcdFx0XHRcdFx0XHR9LFxyXG5cdFx0XHRcdFx0XHRcdHtcclxuXHRcdFx0XHRcdFx0XHRcdHdpZGdldDogXCJpbnB1dFwiLFxyXG5cdFx0XHRcdFx0XHRcdFx0dHlwZTogXCJ0aW1lXCIsXHJcblx0XHRcdFx0XHRcdFx0XHR2YWx1ZTogaXRlbS5kYXRlICYmIGAke2l0ZW0uZGF0ZS5nZXRIb3VycygpfToke3BhZChpdGVtLmRhdGUuZ2V0TWludXRlcygpKX1gLFxyXG5cdFx0XHRcdFx0XHRcdFx0Y2hhbmdlXHJcblx0XHRcdFx0XHRcdFx0fVxyXG5cdFx0XHRcdFx0XHRdXHJcblx0XHRcdFx0XHR9LFxyXG5cdFx0XHRcdFx0e1xyXG5cdFx0XHRcdFx0XHRjbGFzc2VzOiBcInRleHRhcmVhLXdyYXBwZXJcIixcclxuXHRcdFx0XHRcdFx0Y2hpbGRyZW46IFtcclxuXHRcdFx0XHRcdFx0XHR7XHJcblx0XHRcdFx0XHRcdFx0XHR3aWRnZXQ6IFwiaW5wdXRcIixcclxuXHRcdFx0XHRcdFx0XHRcdHRhZzogXCJ0ZXh0YXJlYVwiLFxyXG5cdFx0XHRcdFx0XHRcdFx0Y2xhc3NlczogXCJ0ZXh0YXJlYS1maWxsXCIsXHJcblx0XHRcdFx0XHRcdFx0XHRwbGFjZWhvbGRlcjogXCJEZXNjcmlwdGlvblwiLFxyXG5cdFx0XHRcdFx0XHRcdFx0YmluZDogaXRlbSxcclxuXHRcdFx0XHRcdFx0XHRcdHByb3A6IFwiZGVzY3JpcHRpb25cIixcclxuXHRcdFx0XHRcdFx0XHRcdGNoYW5nZVxyXG5cdFx0XHRcdFx0XHRcdH1cclxuXHRcdFx0XHRcdFx0XVxyXG5cdFx0XHRcdFx0fVxyXG5cdFx0XHRcdF1cclxuXHRcdFx0fSk7XHJcblxyXG5cdFx0XHQvLyBzaG93IHRoZSBmaWVsZHMgZm9yIHRoaXMgaXRlbSB0eXBlXHJcblx0XHRcdHRvZ2dsZUZpZWxkcygpO1xyXG5cdFx0fSk7XHJcblxyXG5cdFx0Ly8gcmVtb3ZlIHRoZSBzdWJzY3JpcHRpb24gd2hlbiB0aGlzIHZpZXcgaXMgZGVzdHJveWVkXHJcblx0XHRkaXNwb3NhYmxlLmFkZChjaGFuZ2VTdWIpO1xyXG5cdH1cclxufSk7XHJcblxyXG4vLyBhZGQgYSBsZWFkaW5nIDAgaWYgYSBudW1iZXIgaXMgbGVzcyB0aGFuIDEwXHJcbnZhciBwYWQgPSBudW1iZXIgPT4gKG51bWJlciA8IDEwKSA/IFwiMFwiICsgbnVtYmVyIDogbnVtYmVyO1xyXG5cclxuLy8gY3JlYXRlIGEgZGF0ZSBvZiB0b2RheSBhdCAxMTo1OXBtXHJcbnZhciBnZW5EYXRlID0gKCkgPT4ge1xyXG5cdHZhciBkYXRlID0gbmV3IERhdGUoKTtcclxuXHJcblx0Ly8gc2V0IHRoZSB0aW1lXHJcblx0ZGF0ZS5zZXRIb3VycygyMyk7XHJcblx0ZGF0ZS5zZXRNaW51dGVzKDU5KTtcclxuXHJcblx0cmV0dXJuIGRhdGU7XHJcbn07XHJcbiIsIi8qKlxyXG4gKiBUaGUgdmlldyBmb3IgYW4gYXNzaWdubWVudFxyXG4gKi9cclxuXHJcbmltcG9ydCB7ZGF5c0Zyb21Ob3csIHN0cmluZ2lmeURhdGV9IGZyb20gXCIuLi91dGlsL2RhdGVcIjtcclxuaW1wb3J0IHtzdG9yZX0gZnJvbSBcIi4uL2RhdGEtc3RvcmVcIjtcclxuXHJcbnZhciBhc3NpZ25tZW50cyA9IHN0b3JlKFwiYXNzaWdubWVudHNcIik7XHJcblxyXG5saWZlTGluZS5uYXYucmVnaXN0ZXIoe1xyXG5cdG1hdGNoZXI6IC9eXFwvaXRlbVxcLyguKz8pJC8sXHJcblxyXG5cdG1ha2Uoe21hdGNoLCBzZXRUaXRsZSwgY29udGVudCwgZGlzcG9zYWJsZX0pIHtcclxuXHRcdHZhciBhY3Rpb25Eb25lU3ViLCBhY3Rpb25FZGl0U3ViO1xyXG5cclxuXHQgXHRkaXNwb3NhYmxlLmFkZChcclxuXHRcdFx0YXNzaWdubWVudHMuZ2V0KG1hdGNoWzFdLCBmdW5jdGlvbihpdGVtKSB7XHJcblx0XHRcdFx0Ly8gY2xlYXIgdGhlIGNvbnRlbnRcclxuXHRcdFx0XHRjb250ZW50LmlubmVySFRNTCA9IFwiXCI7XHJcblxyXG5cdFx0XHRcdC8vIHJlbW92ZSB0aGUgb2xkIGFjdGlvblxyXG5cdFx0XHRcdGlmKGFjdGlvbkRvbmVTdWIpIHtcclxuXHRcdFx0XHRcdGFjdGlvbkRvbmVTdWIudW5zdWJzY3JpYmUoKTtcclxuXHRcdFx0XHRcdGFjdGlvbkVkaXRTdWIudW5zdWJzY3JpYmUoKTtcclxuXHRcdFx0XHR9XHJcblxyXG5cdFx0XHRcdC8vIG5vIHN1Y2ggYXNzaWdubWVudFxyXG5cdFx0XHRcdGlmKCFpdGVtKSB7XHJcblx0XHRcdFx0XHRzZXRUaXRsZShcIk5vdCBmb3VuZFwiKTtcclxuXHJcblx0XHRcdFx0XHRsaWZlTGluZS5tYWtlRG9tKHtcclxuXHRcdFx0XHRcdFx0cGFyZW50OiBjb250ZW50LFxyXG5cdFx0XHRcdFx0XHRjbGFzc2VzOiBcImNvbnRlbnQtcGFkZGVkXCIsXHJcblx0XHRcdFx0XHRcdGNoaWxkcmVuOiBbXHJcblx0XHRcdFx0XHRcdFx0e1xyXG5cdFx0XHRcdFx0XHRcdFx0dGFnOiBcInNwYW5cIixcclxuXHRcdFx0XHRcdFx0XHRcdHRleHQ6IFwiVGhlIGFzc2lnbm1lbnQgeW91IHdoZXJlIGxvb2tpbmcgZm9yIGNvdWxkIG5vdCBiZSBmb3VuZC4gXCJcclxuXHRcdFx0XHRcdFx0XHR9LFxyXG5cdFx0XHRcdFx0XHRcdHtcclxuXHRcdFx0XHRcdFx0XHRcdHdpZGdldDogXCJsaW5rXCIsXHJcblx0XHRcdFx0XHRcdFx0XHRocmVmOiBcIi9cIixcclxuXHRcdFx0XHRcdFx0XHRcdHRleHQ6IFwiR28gaG9tZS5cIlxyXG5cdFx0XHRcdFx0XHRcdH1cclxuXHRcdFx0XHRcdFx0XVxyXG5cdFx0XHRcdFx0fSk7XHJcblxyXG5cdFx0XHRcdFx0cmV0dXJuO1xyXG5cdFx0XHRcdH1cclxuXHJcblx0XHRcdFx0Ly8gc2V0IHRoZSB0aXRsZSBmb3IgdGhlIGNvbnRlbnRcclxuXHRcdFx0XHRzZXRUaXRsZShcIkFzc2lnbm1lbnRcIik7XHJcblxyXG5cdFx0XHRcdC8vIG1hcmsgdGhlIGl0ZW0gYXMgZG9uZVxyXG5cdFx0XHRcdGFjdGlvbkRvbmVTdWIgPSBsaWZlTGluZS5hZGRBY3Rpb24oaXRlbS5kb25lID8gXCJEb25lXCIgOiBcIk5vdCBkb25lXCIsICgpID0+IHtcclxuXHRcdFx0XHRcdC8vIG1hcmsgdGhlIGl0ZW0gZG9uZVxyXG5cdFx0XHRcdFx0aXRlbS5kb25lID0gIWl0ZW0uZG9uZTtcclxuXHJcblx0XHRcdFx0XHQvLyB1cGRhdGUgdGhlIG1vZGlmaWVkIHRpbWVcclxuXHRcdFx0XHRcdGl0ZW0ubW9kaWZpZWQgPSBEYXRlLm5vdygpO1xyXG5cclxuXHRcdFx0XHRcdC8vIHNhdmUgdGhlIGNoYW5nZVxyXG5cdFx0XHRcdFx0YXNzaWdubWVudHMuc2V0KGl0ZW0pO1xyXG5cdFx0XHRcdH0pO1xyXG5cclxuXHRcdFx0XHQvLyBlZGl0IHRoZSBpdGVtXHJcblx0XHRcdFx0YWN0aW9uRWRpdFN1YiA9IGxpZmVMaW5lLmFkZEFjdGlvbihcIkVkaXRcIixcclxuXHRcdFx0XHRcdCgpID0+IGxpZmVMaW5lLm5hdi5uYXZpZ2F0ZShcIi9lZGl0L1wiICsgaXRlbS5pZCkpO1xyXG5cclxuXHRcdFx0XHQvLyB0aW1lcyB0byBza2lwXHJcblx0XHRcdFx0dmFyIHNraXBUaW1lcyA9IFtcclxuXHRcdFx0XHRcdHsgaG91cjogMjMsIG1pbnV0ZTogNTkgfVxyXG5cdFx0XHRcdF07XHJcblxyXG5cdFx0XHRcdGxpZmVMaW5lLm1ha2VEb20oe1xyXG5cdFx0XHRcdFx0cGFyZW50OiBjb250ZW50LFxyXG5cdFx0XHRcdFx0Y2xhc3NlczogXCJjb250ZW50LXBhZGRlZFwiLFxyXG5cdFx0XHRcdFx0Y2hpbGRyZW46IFtcclxuXHRcdFx0XHRcdFx0e1xyXG5cdFx0XHRcdFx0XHRcdGNsYXNzZXM6IFwiYXNzaWdubWVudC1uYW1lXCIsXHJcblx0XHRcdFx0XHRcdFx0dGV4dDogaXRlbS5uYW1lXHJcblx0XHRcdFx0XHRcdH0sXHJcblx0XHRcdFx0XHRcdHtcclxuXHRcdFx0XHRcdFx0XHRjbGFzc2VzOiBcImFzc2lnbm1lbnQtaW5mby1yb3dcIixcclxuXHRcdFx0XHRcdFx0XHRjaGlsZHJlbjogW1xyXG5cdFx0XHRcdFx0XHRcdFx0e1xyXG5cdFx0XHRcdFx0XHRcdFx0XHRjbGFzc2VzOiBcImFzc2lnbm1lbnQtaW5mby1ncm93XCIsXHJcblx0XHRcdFx0XHRcdFx0XHRcdHRleHQ6IGl0ZW0uY2xhc3NcclxuXHRcdFx0XHRcdFx0XHRcdH0sXHJcblx0XHRcdFx0XHRcdFx0XHR7XHJcblx0XHRcdFx0XHRcdFx0XHRcdHRleHQ6IGl0ZW0uZGF0ZSAmJiBzdHJpbmdpZnlEYXRlKGl0ZW0uZGF0ZSwgeyBpbmNsdWRlVGltZTogdHJ1ZSwgc2tpcFRpbWVzIH0pXHJcblx0XHRcdFx0XHRcdFx0XHR9XHJcblx0XHRcdFx0XHRcdFx0XVxyXG5cdFx0XHRcdFx0XHR9LFxyXG5cdFx0XHRcdFx0XHR7XHJcblx0XHRcdFx0XHRcdFx0Y2xhc3NlczogXCJhc3NpZ25tZW50LWRlc2NyaXB0aW9uXCIsXHJcblx0XHRcdFx0XHRcdFx0dGV4dDogaXRlbS5kZXNjcmlwdGlvblxyXG5cdFx0XHRcdFx0XHR9XHJcblx0XHRcdFx0XHRdXHJcblx0XHRcdFx0fSk7XHJcblx0XHRcdH0pXHJcblx0XHQpO1xyXG5cdH1cclxufSk7XHJcbiIsIi8qKlxyXG4gKiBEaXNwbGF5IGEgbGlzdCBvZiB1cGNvbW1pbmcgYXNzaWdubWVudHNcclxuICovXHJcblxyXG5pbXBvcnQge2RheXNGcm9tTm93LCBpc1NhbWVEYXRlLCBzdHJpbmdpZnlEYXRlLCBzdHJpbmdpZnlUaW1lLCBpc1Nvb25lckRhdGV9IGZyb20gXCIuLi91dGlsL2RhdGVcIjtcclxuaW1wb3J0IHtzdG9yZX0gZnJvbSBcIi4uL2RhdGEtc3RvcmVcIjtcclxuXHJcbnZhciBhc3NpZ25tZW50cyA9IHN0b3JlKFwiYXNzaWdubWVudHNcIik7XHJcblxyXG4vLyBhbGwgdGhlIGRpZmZlcmVudCBsaXN0c1xyXG5jb25zdCBMSVNUUyA9IFtcclxuXHR7XHJcblx0XHR1cmw6IFwiL1wiLFxyXG5cdFx0dGl0bGU6IFwiVG9kYXlcIixcclxuXHRcdGNyZWF0ZUN0eDogKCkgPT4gbmV3IERhdGUoKSxcclxuXHRcdC8vIHNob3cgYWxsIGF0IHJlYXNvbmFibGUgbnVtYmVyIG9mIGluY29tcGxldGUgYXNzaWdubWVudHNcclxuXHRcdGZpbHRlcjogKGl0ZW0sIHRvZGF5KSA9PiAhaXRlbS5kb25lICYmIChpdGVtLnR5cGUgPT0gXCJ0YXNrXCIgfHwgaXNTYW1lRGF0ZSh0b2RheSwgaXRlbS5kYXRlKSlcclxuXHR9LFxyXG5cdHtcclxuXHRcdHVybDogXCIvd2Vla1wiLFxyXG5cdFx0dGl0bGU6IFwiVGhpcyB3ZWVrXCIsXHJcblx0XHRjcmVhdGVDdHg6ICgpID0+ICh7XHJcblx0XHRcdC8vIGRheXMgdG8gdGhlIGVuZCBvZiB0aGlzIHdlZWtcclxuXHRcdFx0ZW5kRGF0ZTogZGF5c0Zyb21Ob3coNyAtIChuZXcgRGF0ZSgpKS5nZXREYXkoKSksXHJcblx0XHRcdC8vIHRvZGF5cyBkYXRlXHJcblx0XHRcdHRvZGF5OiBuZXcgRGF0ZSgpXHJcblx0XHR9KSxcclxuXHRcdC8vIHNob3cgYWxsIGF0IHJlYXNvbmFibGUgbnVtYmVyIG9mIGluY29tcGxldGUgYXNzaWdubWVudHNcclxuXHRcdGZpbHRlcjogKGl0ZW0sIHt0b2RheSwgZW5kRGF0ZX0pID0+IHtcclxuXHRcdFx0Ly8gYWxyZWFkeSBkb25lXHJcblx0XHRcdGlmKGl0ZW0uZG9uZSkgcmV0dXJuO1xyXG5cclxuXHRcdFx0Ly8gc2hvdyBhbGwgdGFza3NcclxuXHRcdFx0aWYoaXRlbS50eXBlID09IFwidGFza1wiKSByZXR1cm4gdHJ1ZTtcclxuXHJcblx0XHRcdC8vIGNoZWNrIGlmIHRoZSBpdGVtIGlzIHBhc3QgdGhpcyB3ZWVrXHJcblx0XHRcdGlmKCFpc1Nvb25lckRhdGUoaXRlbS5kYXRlLCBlbmREYXRlKSAmJiAhaXNTYW1lRGF0ZShpdGVtLmRhdGUsIGVuZERhdGUpKSByZXR1cm47XHJcblxyXG5cdFx0XHQvLyBjaGVjayBpZiB0aGUgZGF0ZSBpcyBiZWZvcmUgdG9kYXlcclxuXHRcdFx0aWYoaXNTb29uZXJEYXRlKGl0ZW0uZGF0ZSwgdG9kYXkpKSByZXR1cm47XHJcblxyXG5cdFx0XHRyZXR1cm4gdHJ1ZTtcclxuXHRcdH1cclxuXHR9LFxyXG5cdHtcclxuXHRcdHVybDogXCIvdXBjb21pbmdcIixcclxuXHRcdGZpbHRlcjogaXRlbSA9PiAhaXRlbS5kb25lLFxyXG5cdFx0dGl0bGU6IFwiVXBjb21pbmdcIlxyXG5cdH0sXHJcblx0e1xyXG5cdFx0dXJsOiBcIi9kb25lXCIsXHJcblx0XHRmaWx0ZXI6IGl0ZW0gPT4gaXRlbS5kb25lLFxyXG5cdFx0dGl0bGU6IFwiRG9uZVwiXHJcblx0fVxyXG5dO1xyXG5cclxuLy8gYWRkIGxpc3QgdmlldyBsaW5rcyB0byB0aGUgbmF2YmFyXHJcbmV4cG9ydCBmdW5jdGlvbiBpbml0TmF2QmFyKCkge1xyXG5cdExJU1RTLmZvckVhY2gobGlzdCA9PiBsaWZlTGluZS5hZGROYXZDb21tYW5kKGxpc3QudGl0bGUsIGxpc3QudXJsKSk7XHJcbn07XHJcblxyXG5saWZlTGluZS5uYXYucmVnaXN0ZXIoe1xyXG5cdG1hdGNoZXIodXJsKSB7XHJcblx0XHRyZXR1cm4gTElTVFMuZmluZChsaXN0ID0+IGxpc3QudXJsID09IHVybCk7XHJcblx0fSxcclxuXHJcblx0Ly8gbWFrZSB0aGUgbGlzdFxyXG5cdG1ha2Uoe3NldFRpdGxlLCBjb250ZW50LCBkaXNwb3NhYmxlLCBtYXRjaH0pIHtcclxuXHRcdGRpc3Bvc2FibGUuYWRkKFxyXG5cdFx0XHRhc3NpZ25tZW50cy5nZXRBbGwoZnVuY3Rpb24oZGF0YSkge1xyXG5cdFx0XHRcdC8vIGNsZWFyIHRoZSBjb250ZW50XHJcblx0XHRcdFx0Y29udGVudC5pbm5lckhUTUwgPSBcIlwiO1xyXG5cclxuXHRcdFx0XHQvLyBzZXQgdGhlIHBhZ2UgdGl0bGVcclxuXHRcdFx0XHRzZXRUaXRsZShtYXRjaC50aXRsZSk7XHJcblxyXG5cdFx0XHRcdC8vIHRoZSBjb250ZXh0IGZvciB0aGUgZmlsdGVyIGZ1bmN0aW9uXHJcblx0XHRcdFx0dmFyIGN0eDtcclxuXHJcblx0XHRcdFx0aWYobWF0Y2guY3JlYXRlQ3R4KSB7XHJcblx0XHRcdFx0XHRjdHggPSBtYXRjaC5jcmVhdGVDdHgoKTtcclxuXHRcdFx0XHR9XHJcblxyXG5cdFx0XHRcdC8vIHJ1biB0aGUgZmlsdGVyIGZ1bmN0aW9uXHJcblx0XHRcdFx0ZGF0YSA9IGRhdGEuZmlsdGVyKGl0ZW0gPT4gbWF0Y2guZmlsdGVyKGl0ZW0sIGN0eCkpO1xyXG5cclxuXHRcdFx0XHQvLyBzb3J0IHRoZSBhc3NpbmdtZW50c1xyXG5cdFx0XHRcdGRhdGEuc29ydCgoYSwgYikgPT4ge1xyXG5cdFx0XHRcdFx0Ly8gdGFza3MgYXJlIGJlbG93IGFzc2lnbm1lbnRzXHJcblx0XHRcdFx0XHRpZihhLnR5cGUgPT0gXCJ0YXNrXCIgJiYgYi50eXBlICE9IFwidGFza1wiKSByZXR1cm4gMTtcclxuXHRcdFx0XHRcdGlmKGEudHlwZSAhPSBcInRhc2tcIiAmJiBiLnR5cGUgPT0gXCJ0YXNrXCIpIHJldHVybiAtMTtcclxuXHRcdFx0XHRcdC8vaWYoYS50eXBlID09IFwidGFza1wiIHx8IGIudHlwZSA9PSBcInRhc2tcIikgcmV0dXJuIDA7XHJcblxyXG5cdFx0XHRcdFx0Ly8gc29ydCBieSBkdWUgZGF0ZVxyXG5cdFx0XHRcdFx0aWYoYS50eXBlID09IFwiYXNzaWdubWVudFwiICYmIGIudHlwZSA9PSBcImFzc2lnbm1lbnRcIikge1xyXG5cdFx0XHRcdFx0XHRpZihhLmRhdGUuZ2V0VGltZSgpICE9IGIuZGF0ZS5nZXRUaW1lKCkpIHtcclxuXHRcdFx0XHRcdFx0XHRyZXR1cm4gYS5kYXRlLmdldFRpbWUoKSAtIGIuZGF0ZS5nZXRUaW1lKCk7XHJcblx0XHRcdFx0XHRcdH1cclxuXHRcdFx0XHRcdH1cclxuXHJcblx0XHRcdFx0XHQvLyBvcmRlciBieSBuYW1lXHJcblx0XHRcdFx0XHRpZihhLm5hbWUgPCBiLm5hbWUpIHJldHVybiAtMTtcclxuXHRcdFx0XHRcdGlmKGEubmFtZSA+IGIubmFtZSkgcmV0dXJuIDE7XHJcblxyXG5cdFx0XHRcdFx0cmV0dXJuIDA7XHJcblx0XHRcdFx0fSk7XHJcblxyXG5cdFx0XHRcdC8vIG1ha2UgdGhlIGdyb3Vwc1xyXG5cdFx0XHRcdHZhciBncm91cHMgPSB7fTtcclxuXHJcblx0XHRcdFx0Ly8gcmVuZGVyIHRoZSBsaXN0XHJcblx0XHRcdFx0ZGF0YS5mb3JFYWNoKChpdGVtLCBpKSA9PiB7XHJcblx0XHRcdFx0XHQvLyBnZXQgdGhlIGhlYWRlciBuYW1lXHJcblx0XHRcdFx0XHR2YXIgZGF0ZVN0ciA9IGl0ZW0udHlwZSA9PSBcInRhc2tcIiA/IFwiVGFza3NcIiA6IHN0cmluZ2lmeURhdGUoaXRlbS5kYXRlKTtcclxuXHJcblx0XHRcdFx0XHQvLyBtYWtlIHN1cmUgdGhlIGhlYWRlciBleGlzdHNcclxuXHRcdFx0XHRcdGdyb3Vwc1tkYXRlU3RyXSB8fCAoZ3JvdXBzW2RhdGVTdHJdID0gW10pO1xyXG5cclxuXHRcdFx0XHRcdC8vIGFkZCB0aGUgaXRlbSB0byB0aGUgbGlzdFxyXG5cdFx0XHRcdFx0dmFyIGl0ZW1zID0gW1xyXG5cdFx0XHRcdFx0XHR7IHRleHQ6IGl0ZW0ubmFtZSwgZ3JvdzogdHJ1ZSB9XHJcblx0XHRcdFx0XHRdO1xyXG5cclxuXHRcdFx0XHRcdGlmKGl0ZW0udHlwZSAhPSBcInRhc2tcIikge1xyXG5cdFx0XHRcdFx0XHQvLyBzaG93IHRoZSBlbmQgdGltZSBmb3IgYW55IG5vbiAxMTo1OXBtIHRpbWVzXHJcblx0XHRcdFx0XHRcdGlmKGl0ZW0uZGF0ZS5nZXRIb3VycygpICE9IDIzIHx8IGl0ZW0uZGF0ZS5nZXRNaW51dGVzKCkgIT0gNTkpIHtcclxuXHRcdFx0XHRcdFx0XHRpdGVtcy5wdXNoKHN0cmluZ2lmeVRpbWUoaXRlbS5kYXRlKSk7XHJcblx0XHRcdFx0XHRcdH1cclxuXHJcblx0XHRcdFx0XHRcdC8vIHNob3cgdGhlIGNsYXNzXHJcblx0XHRcdFx0XHRcdGl0ZW1zLnB1c2goaXRlbS5jbGFzcyk7XHJcblx0XHRcdFx0XHR9XHJcblxyXG5cdFx0XHRcdFx0Z3JvdXBzW2RhdGVTdHJdLnB1c2goe1xuXHRcdFx0XHRcdFx0aHJlZjogYC9pdGVtLyR7aXRlbS5pZH1gLFxuXHRcdFx0XHRcdFx0aXRlbXNcclxuXHRcdFx0XHRcdH0pO1xyXG5cdFx0XHRcdH0pO1xyXG5cclxuXHRcdFx0XHQvLyBkaXNwbGF5IGFsbCBpdGVtc1xyXG5cdFx0XHRcdGxpZmVMaW5lLm1ha2VEb20oe1xyXG5cdFx0XHRcdFx0cGFyZW50OiBjb250ZW50LFxyXG5cdFx0XHRcdFx0d2lkZ2V0OiBcImxpc3RcIixcclxuXHRcdFx0XHRcdGl0ZW1zOiBncm91cHNcclxuXHRcdFx0XHR9KTtcclxuXHRcdFx0fSlcclxuXHRcdCk7XHJcblx0fVxyXG59KTtcclxuIiwiLyoqXHJcbiAqIFNob3cgYSBsb2dpbiBidXR0b24gdG8gdGhlIHVzZXJcclxuICovXHJcblxyXG5saWZlTGluZS5uYXYucmVnaXN0ZXIoe1xyXG5cdG1hdGNoZXI6IFwiL2xvZ2luXCIsXHJcblxyXG5cdG1ha2Uoe3NldFRpdGxlLCBjb250ZW50fSkge1xyXG5cdFx0Ly8gc2V0IHRoZSBwYWdlIHRpdGxlXHJcblx0XHRzZXRUaXRsZShcIkxvZ2luXCIpO1xyXG5cclxuXHRcdC8vIHRoZSB1c2VycyBjcmVkZW50aWFsc1xyXG5cdFx0dmFyIGF1dGggPSB7fTtcclxuXHJcblx0XHQvLyBjcmVhdGUgdGhlIGxvZ2luIGZvcm1cclxuXHRcdHZhciB7dXNlcm5hbWUsIHBhc3N3b3JkLCBtc2d9ID0gbGlmZUxpbmUubWFrZURvbSh7XHJcblx0XHRcdHBhcmVudDogY29udGVudCxcclxuXHRcdFx0dGFnOiBcImZvcm1cIixcclxuXHRcdFx0Y2xhc3NlczogXCJjb250ZW50LXBhZGRlZFwiLFxyXG5cdFx0XHRjaGlsZHJlbjogW1xyXG5cdFx0XHRcdHtcclxuXHRcdFx0XHRcdGNsYXNzZXM6IFwiZWRpdG9yLXJvd1wiLFxyXG5cdFx0XHRcdFx0Y2hpbGRyZW46IFtcclxuXHRcdFx0XHRcdFx0e1xyXG5cdFx0XHRcdFx0XHRcdHdpZGdldDogXCJpbnB1dFwiLFxyXG5cdFx0XHRcdFx0XHRcdGJpbmQ6IGF1dGgsXHJcblx0XHRcdFx0XHRcdFx0cHJvcDogXCJ1c2VybmFtZVwiLFxyXG5cdFx0XHRcdFx0XHRcdHBsYWNlaG9sZGVyOiBcIlVzZXJuYW1lXCJcclxuXHRcdFx0XHRcdFx0fVxyXG5cdFx0XHRcdFx0XVxyXG5cdFx0XHRcdH0sXHJcblx0XHRcdFx0e1xyXG5cdFx0XHRcdFx0Y2xhc3NlczogXCJlZGl0b3Itcm93XCIsXHJcblx0XHRcdFx0XHRjaGlsZHJlbjogW1xyXG5cdFx0XHRcdFx0XHR7XHJcblx0XHRcdFx0XHRcdFx0d2lkZ2V0OiBcImlucHV0XCIsXHJcblx0XHRcdFx0XHRcdFx0YmluZDogYXV0aCxcclxuXHRcdFx0XHRcdFx0XHRwcm9wOiBcInBhc3N3b3JkXCIsXHJcblx0XHRcdFx0XHRcdFx0dHlwZTogXCJwYXNzd29yZFwiLFxyXG5cdFx0XHRcdFx0XHRcdHBsYWNlaG9sZGVyOiBcIlBhc3N3b3JkXCJcclxuXHRcdFx0XHRcdFx0fVxyXG5cdFx0XHRcdFx0XVxyXG5cdFx0XHRcdH0sXHJcblx0XHRcdFx0e1xyXG5cdFx0XHRcdFx0dGFnOiBcImJ1dHRvblwiLFxyXG5cdFx0XHRcdFx0dGV4dDogXCJMb2dpblwiLFxyXG5cdFx0XHRcdFx0Y2xhc3NlczogXCJmYW5jeS1idXR0b25cIixcclxuXHRcdFx0XHRcdGF0dHJzOiB7XHJcblx0XHRcdFx0XHRcdHR5cGU6IFwic3VibWl0XCJcclxuXHRcdFx0XHRcdH1cclxuXHRcdFx0XHR9LFxyXG5cdFx0XHRcdHtcclxuXHRcdFx0XHRcdGNsYXNzZXM6IFwiZXJyb3ItbXNnXCIsXHJcblx0XHRcdFx0XHRuYW1lOiBcIm1zZ1wiXHJcblx0XHRcdFx0fVxyXG5cdFx0XHRdLFxyXG5cdFx0XHRvbjoge1xyXG5cdFx0XHRcdHN1Ym1pdDogZSA9PiB7XHJcblx0XHRcdFx0XHRlLnByZXZlbnREZWZhdWx0KCk7XHJcblxyXG5cdFx0XHRcdFx0Ly8gc2VuZCB0aGUgbG9naW4gcmVxdWVzdFxyXG5cdFx0XHRcdFx0ZmV0Y2goXCIvYXBpL2F1dGgvbG9naW5cIiwge1xyXG5cdFx0XHRcdFx0XHRtZXRob2Q6IFwiUE9TVFwiLFxyXG5cdFx0XHRcdFx0XHRjcmVkZW50aWFsczogXCJpbmNsdWRlXCIsXHJcblx0XHRcdFx0XHRcdGJvZHk6IEpTT04uc3RyaW5naWZ5KGF1dGgpXHJcblx0XHRcdFx0XHR9KVxyXG5cclxuXHRcdFx0XHRcdC8vIHBhcnNlIHRoZSBqc29uXHJcblx0XHRcdFx0XHQudGhlbihyZXMgPT4gcmVzLmpzb24oKSlcclxuXHJcblx0XHRcdFx0XHQvLyBwcm9jZXNzIHRoZSByZXNwb25zZVxyXG5cdFx0XHRcdFx0LnRoZW4ocmVzID0+IHtcclxuXHRcdFx0XHRcdFx0Ly8gbG9naW4gc3VjZWVkZWQgZ28gaG9tZVxyXG5cdFx0XHRcdFx0XHRpZihyZXMuc3RhdHVzID09IFwic3VjY2Vzc1wiKSB7XHJcblx0XHRcdFx0XHRcdFx0bGlmZUxpbmUubmF2Lm5hdmlnYXRlKFwiL1wiKTtcclxuXHRcdFx0XHRcdFx0XHRyZXR1cm47XHJcblx0XHRcdFx0XHRcdH1cclxuXHJcblx0XHRcdFx0XHRcdC8vIGxvZ2luIGZhaWxlZFxyXG5cdFx0XHRcdFx0XHRpZihyZXMuc3RhdHVzID09IFwiZmFpbFwiKSB7XHJcblx0XHRcdFx0XHRcdFx0ZXJyb3JNc2coXCJMb2dpbiBmYWlsZWRcIik7XHJcblx0XHRcdFx0XHRcdH1cclxuXHRcdFx0XHRcdH0pO1xyXG5cdFx0XHRcdH1cclxuXHRcdFx0fVxyXG5cdFx0fSk7XHJcblxyXG5cdFx0Ly8gZGlzcGxheSBhbiBlcnJvciBtZXNzYWdlXHJcblx0XHR2YXIgZXJyb3JNc2cgPSBmdW5jdGlvbih0ZXh0KSB7XHJcblx0XHRcdG1zZy5pbm5lclRleHQgPSB0ZXh0O1xyXG5cdFx0fTtcclxuXHR9XHJcbn0pO1xyXG5cclxuLy8gbG9nb3V0XHJcbmxpZmVMaW5lLmxvZ291dCA9IGZ1bmN0aW9uKCkge1xyXG5cdC8vIHNlbmQgdGhlIGxvZ291dCByZXF1ZXN0XHJcblx0ZmV0Y2goXCIvYXBpL2F1dGgvbG9nb3V0XCIsIHtcclxuXHRcdGNyZWRlbnRpYWxzOiBcImluY2x1ZGVcIlxyXG5cdH0pXHJcblxyXG5cdC8vIGdvIHRvIHRoZSBsb2dpbiBwYWdlXHJcblx0LnRoZW4oKCkgPT4gbGlmZUxpbmUubmF2Lm5hdmlnYXRlKFwiL2xvZ2luXCIpKTtcclxufTtcclxuIiwiLyoqXHJcbiAqIEEgcGFnZSB3aXRoIGxpbmtzIHRvIGFsbCB1c2Vyc1xyXG4gKi9cclxuXHJcbmxpZmVMaW5lLm5hdi5yZWdpc3Rlcih7XHJcblx0bWF0Y2hlcjogXCIvdXNlcnNcIixcclxuXHJcblx0bWFrZSh7c2V0VGl0bGUsIGNvbnRlbnR9KSB7XHJcblx0XHRzZXRUaXRsZShcIkFsbCB1c2Vyc1wiKTtcclxuXHJcblx0XHQvLyBsb2FkIHRoZSBsaXN0IG9mIHVzZXJzXHJcblx0XHRmZXRjaChcIi9hcGkvYXV0aC9pbmZvL3VzZXJzXCIsIHtcclxuXHRcdFx0Y3JlZGVudGlhbHM6IFwiaW5jbHVkZVwiXHJcblx0XHR9KVxyXG5cclxuXHRcdC50aGVuKHJlcyA9PiByZXMuanNvbigpKVxyXG5cclxuXHRcdC50aGVuKCh7c3RhdHVzLCBkYXRhOiB1c2Vyc30pID0+IHtcclxuXHRcdFx0Ly8gbm90IGF1dGhlbnRpY2F0ZWRcclxuXHRcdFx0aWYoc3RhdHVzID09IFwiZmFpbFwiKSB7XHJcblx0XHRcdFx0bGlmZUxpbmUubWFrZURvbSh7XHJcblx0XHRcdFx0XHRwYXJlbnQ6IGNvbnRlbnQsXHJcblx0XHRcdFx0XHRjbGFzc2VzOiBcImNvbnRlbnQtcGFkZGVkXCIsXHJcblx0XHRcdFx0XHR0ZXh0OiBcIllvdSBkbyBub3QgaGF2ZSBhY2Nlc3MgdG8gdGhlIHVzZXIgbGlzdFwiXHJcblx0XHRcdFx0fSk7XHJcblxyXG5cdFx0XHRcdHJldHVybjtcclxuXHRcdFx0fVxyXG5cclxuXHRcdFx0Ly8gc29ydCBieSBhZG1pbiBzdGF0dXNcclxuXHRcdFx0dXNlcnMuc29ydCgoYSwgYikgPT4ge1xyXG5cdFx0XHRcdC8vIHNvcnQgYWRtaW5zXHJcblx0XHRcdFx0aWYoYS5hZG1pbiAmJiAhYi5hZG1pbikgcmV0dXJuIC0xO1xyXG5cdFx0XHRcdGlmKCFhLmFkbWluICYmIGIuYWRtaW4pIHJldHVybiAxO1xyXG5cclxuXHRcdFx0XHQvLyBzb3J0IGJ5IHVzZXJuYW1lXHJcblx0XHRcdFx0aWYoYS51c2VybmFtZSA8IGIudXNlcm5hbWUpIHJldHVybiAtMTtcclxuXHRcdFx0XHRpZihhLnVzZXJuYW1lID4gYi51c2VybmFtZSkgcmV0dXJuIDE7XHJcblxyXG5cdFx0XHRcdHJldHVybiAwO1xyXG5cdFx0XHR9KTtcclxuXHJcblx0XHRcdHZhciBkaXNwbGF5VXNlcnMgPSB7XHJcblx0XHRcdFx0QWRtaW5zOiBbXSxcclxuXHRcdFx0XHRVc2VyczogW11cclxuXHRcdFx0fTtcclxuXHJcblx0XHRcdC8vIGdlbmVyYXRlIHRoZSB1c2VyIGxpc3RcclxuXHRcdFx0dXNlcnMuZm9yRWFjaCh1c2VyID0+IHtcclxuXHRcdFx0XHQvLyBzb3J0IHRoZSB1c2VycyBpbnRvIGFkbWlucyBhbmQgdXNlcnNcclxuXHRcdFx0XHRkaXNwbGF5VXNlcnNbdXNlci5hZG1pbiA/IFwiQWRtaW5zXCIgOiBcIlVzZXJzXCJdXHJcblxyXG5cdFx0XHRcdC5wdXNoKHtcclxuXHRcdFx0XHRcdGhyZWY6IGAvdXNlci8ke3VzZXIudXNlcm5hbWV9YCxcclxuXHRcdFx0XHRcdGl0ZW1zOiBbe1xyXG5cdFx0XHRcdFx0XHR0ZXh0OiB1c2VyLnVzZXJuYW1lLFxyXG5cdFx0XHRcdFx0XHRncm93OiB0cnVlXHJcblx0XHRcdFx0XHR9XVxyXG5cdFx0XHRcdH0pO1xyXG5cdFx0XHR9KTtcclxuXHJcblx0XHRcdC8vIGRpc3BsYXkgdGhlIHVzZXIgbGlzdFxyXG5cdFx0XHRsaWZlTGluZS5tYWtlRG9tKHtcclxuXHRcdFx0XHRwYXJlbnQ6IGNvbnRlbnQsXHJcblx0XHRcdFx0d2lkZ2V0OiBcImxpc3RcIixcclxuXHRcdFx0XHRpdGVtczogZGlzcGxheVVzZXJzXHJcblx0XHRcdH0pO1xyXG5cdFx0fSlcclxuXHJcblx0XHQvLyBzb21ldGhpbmcgd2VudCB3cm9uZyBzaG93IGFuIGVycm9yIG1lc3NhZ2VcclxuXHRcdC5jYXRjaChlcnIgPT4ge1xyXG5cdFx0XHRsaWZlTGluZS5tYWtlRG9tKHtcclxuXHRcdFx0XHRjbGFzc2VzOiBcImNvbnRlbnQtcGFkZGVkXCIsXHJcblx0XHRcdFx0dGV4dDogZXJyLm1lc3NhZ2VcclxuXHRcdFx0fSk7XHJcblx0XHR9KTtcclxuXHR9XHJcbn0pO1xyXG4iLCIvKipcclxuICogVGhlIG1haW4gY29udGVudCBwYW5lIGZvciB0aGUgYXBwXHJcbiAqL1xyXG5cclxubGlmZUxpbmUubWFrZURvbS5yZWdpc3RlcihcImNvbnRlbnRcIiwge1xyXG5cdG1ha2UoKSB7XHJcblx0XHRyZXR1cm4gW1xyXG5cdFx0XHR7XHJcblx0XHRcdFx0Y2xhc3NlczogXCJ0b29sYmFyXCIsXHJcblx0XHRcdFx0Y2hpbGRyZW46IFtcclxuXHRcdFx0XHRcdHtcclxuXHRcdFx0XHRcdFx0dGFnOiBcInN2Z1wiLFxyXG5cdFx0XHRcdFx0XHRjbGFzc2VzOiBcIm1lbnUtaWNvblwiLFxyXG5cdFx0XHRcdFx0XHRhdHRyczoge1xyXG5cdFx0XHRcdFx0XHRcdHZpZXdCb3g6IFwiMCAwIDYwIDUwXCIsXHJcblx0XHRcdFx0XHRcdFx0d2lkdGg6IFwiMjBcIixcclxuXHRcdFx0XHRcdFx0XHRoZWlnaHQ6IFwiMTVcIlxyXG5cdFx0XHRcdFx0XHR9LFxyXG5cdFx0XHRcdFx0XHRjaGlsZHJlbjogW1xyXG5cdFx0XHRcdFx0XHRcdHsgdGFnOiBcImxpbmVcIiwgYXR0cnM6IHsgeDE6IFwiMFwiLCB5MTogXCI1XCIsIHgyOiBcIjYwXCIsIHkyOiBcIjVcIiB9IH0sXHJcblx0XHRcdFx0XHRcdFx0eyB0YWc6IFwibGluZVwiLCBhdHRyczogeyB4MTogXCIwXCIsIHkxOiBcIjI1XCIsIHgyOiBcIjYwXCIsIHkyOiBcIjI1XCIgfSB9LFxyXG5cdFx0XHRcdFx0XHRcdHsgdGFnOiBcImxpbmVcIiwgYXR0cnM6IHsgeDE6IFwiMFwiLCB5MTogXCI0NVwiLCB4MjogXCI2MFwiLCB5MjogXCI0NVwiIH0gfVxyXG5cdFx0XHRcdFx0XHRdLFxyXG5cdFx0XHRcdFx0XHRvbjoge1xyXG5cdFx0XHRcdFx0XHRcdGNsaWNrOiAoKSA9PiBkb2N1bWVudC5ib2R5LmNsYXNzTGlzdC50b2dnbGUoXCJzaWRlYmFyLW9wZW5cIilcclxuXHRcdFx0XHRcdFx0fVxyXG5cdFx0XHRcdFx0fSxcclxuXHRcdFx0XHRcdHtcclxuXHRcdFx0XHRcdFx0Y2xhc3NlczogXCJ0b29sYmFyLXRpdGxlXCIsXHJcblx0XHRcdFx0XHRcdG5hbWU6IFwidGl0bGVcIlxyXG5cdFx0XHRcdFx0fSxcclxuXHRcdFx0XHRcdHtcclxuXHRcdFx0XHRcdFx0Y2xhc3NlczogXCJ0b29sYmFyLWJ1dHRvbnNcIixcclxuXHRcdFx0XHRcdFx0bmFtZTogXCJidG5zXCJcclxuXHRcdFx0XHRcdH1cclxuXHRcdFx0XHRdXHJcblx0XHRcdH0sXHJcblx0XHRcdHtcclxuXHRcdFx0XHRjbGFzc2VzOiBcImNvbnRlbnRcIixcclxuXHRcdFx0XHRuYW1lOiBcImNvbnRlbnRcIlxyXG5cdFx0XHR9XHJcblx0XHRdO1xyXG5cdH0sXHJcblxyXG5cdGJpbmQob3B0cywge3RpdGxlLCBidG5zLCBjb250ZW50fSkge1xyXG5cdFx0dmFyIGRpc3Bvc2FibGU7XHJcblxyXG5cdFx0Ly8gc2V0IHRoZSBwYWdlIHRpdGxlXHJcblx0XHR2YXIgc2V0VGl0bGUgPSBmdW5jdGlvbih0aXRsZVRleHQpIHtcclxuXHRcdFx0dGl0bGUuaW5uZXJUZXh0ID0gdGl0bGVUZXh0O1xyXG5cdFx0XHRkb2N1bWVudC50aXRsZSA9IHRpdGxlVGV4dDtcclxuXHRcdH07XHJcblxyXG5cdFx0Ly8gYWRkIGFuIGFjdGlvbiBidXR0b25cclxuXHRcdGxpZmVMaW5lLm9uKFwiYWN0aW9uLWNyZWF0ZVwiLCBuYW1lID0+IHtcclxuXHRcdFx0bGlmZUxpbmUubWFrZURvbSh7XHJcblx0XHRcdFx0cGFyZW50OiBidG5zLFxyXG5cdFx0XHRcdHRhZzogXCJidXR0b25cIixcclxuXHRcdFx0XHRjbGFzc2VzOiBcInRvb2xiYXItYnV0dG9uXCIsXHJcblx0XHRcdFx0dGV4dDogbmFtZSxcclxuXHRcdFx0XHRhdHRyczoge1xyXG5cdFx0XHRcdFx0XCJkYXRhLW5hbWVcIjogbmFtZVxyXG5cdFx0XHRcdH0sXHJcblx0XHRcdFx0b246IHtcclxuXHRcdFx0XHRcdGNsaWNrOiAoKSA9PiBsaWZlTGluZS5lbWl0KFwiYWN0aW9uLWV4ZWMtXCIgKyBuYW1lKVxyXG5cdFx0XHRcdH1cclxuXHRcdFx0fSk7XHJcblx0XHR9KTtcclxuXHJcblx0XHQvLyByZW1vdmUgYW4gYWN0aW9uIGJ1dHRvblxyXG5cdFx0bGlmZUxpbmUub24oXCJhY3Rpb24tcmVtb3ZlXCIsIG5hbWUgPT4ge1xyXG5cdFx0XHR2YXIgYnRuID0gYnRucy5xdWVyeVNlbGVjdG9yKGBbZGF0YS1uYW1lPVwiJHtuYW1lfVwiXWApO1xyXG5cclxuXHRcdFx0aWYoYnRuKSBidG4ucmVtb3ZlKCk7XHJcblx0XHR9KTtcclxuXHJcblx0XHQvLyByZW1vdmUgYWxsIHRoZSBhY3Rpb24gYnV0dG9uc1xyXG5cdFx0bGlmZUxpbmUub24oXCJhY3Rpb24tcmVtb3ZlLWFsbFwiLCAoKSA9PiBidG5zLmlubmVySFRNTCA9IFwiXCIpO1xyXG5cclxuXHRcdC8vIGRpc3BsYXkgdGhlIGNvbnRlbnQgZm9yIHRoZSB2aWV3XHJcblx0XHR2YXIgdXBkYXRlVmlldyA9ICgpID0+IHtcclxuXHRcdFx0Ly8gZGVzdHJveSBhbnkgbGlzdGVuZXJzIGZyb20gb2xkIGNvbnRlbnRcclxuXHRcdFx0aWYoZGlzcG9zYWJsZSkge1xyXG5cdFx0XHRcdGRpc3Bvc2FibGUuZGlzcG9zZSgpO1xyXG5cdFx0XHR9XHJcblxyXG5cdFx0XHQvLyByZW1vdmUgYW55IGFjdGlvbiBidXR0b25zXHJcblx0XHRcdGxpZmVMaW5lLmVtaXQoXCJhY3Rpb24tcmVtb3ZlLWFsbFwiKTtcclxuXHJcblx0XHRcdC8vIGNsZWFyIGFsbCB0aGUgb2xkIGNvbnRlbnRcclxuXHRcdFx0Y29udGVudC5pbm5lckhUTUwgPSBcIlwiO1xyXG5cclxuXHRcdFx0Ly8gY3JlYXRlIHRoZSBkaXNwb3NhYmxlIGZvciB0aGUgY29udGVudFxyXG5cdFx0XHRkaXNwb3NhYmxlID0gbmV3IGxpZmVMaW5lLkRpc3Bvc2FibGUoKTtcclxuXHJcblx0XHRcdHZhciBtYWtlciA9IG5vdEZvdW5kTWFrZXIsIG1hdGNoO1xyXG5cclxuXHRcdFx0Ly8gZmluZCB0aGUgY29ycmVjdCBjb250ZW50IG1ha2VyXHJcblx0XHRcdGZvcihsZXQgJG1ha2VyIG9mIGNvbnRlbnRNYWtlcnMpIHtcclxuXHRcdFx0XHQvLyBydW4gYSBtYXRjaGVyIGZ1bmN0aW9uXHJcblx0XHRcdFx0aWYodHlwZW9mICRtYWtlci5tYXRjaGVyID09IFwiZnVuY3Rpb25cIikge1xyXG5cdFx0XHRcdFx0bWF0Y2ggPSAkbWFrZXIubWF0Y2hlcihsb2NhdGlvbi5wYXRobmFtZSk7XHJcblx0XHRcdFx0fVxyXG5cdFx0XHRcdC8vIGEgc3RyaW5nIG1hdGNoXHJcblx0XHRcdFx0ZWxzZSBpZih0eXBlb2YgJG1ha2VyLm1hdGNoZXIgPT0gXCJzdHJpbmdcIikge1xyXG5cdFx0XHRcdFx0aWYoJG1ha2VyLm1hdGNoZXIgPT0gbG9jYXRpb24ucGF0aG5hbWUpIHtcclxuXHRcdFx0XHRcdFx0bWF0Y2ggPSAkbWFrZXIubWF0Y2hlcjtcclxuXHRcdFx0XHRcdH1cclxuXHRcdFx0XHR9XHJcblx0XHRcdFx0Ly8gYSByZWdleCBtYXRjaFxyXG5cdFx0XHRcdGVsc2Uge1xyXG5cdFx0XHRcdFx0bWF0Y2ggPSAkbWFrZXIubWF0Y2hlci5leGVjKGxvY2F0aW9uLnBhdGhuYW1lKTtcclxuXHRcdFx0XHR9XHJcblxyXG5cdFx0XHRcdC8vIG1hdGNoIGZvdW5kIHN0b3Agc2VhcmNoaW5nXHJcblx0XHRcdFx0aWYobWF0Y2gpIHtcclxuXHRcdFx0XHRcdG1ha2VyID0gJG1ha2VyO1xyXG5cclxuXHRcdFx0XHRcdGJyZWFrO1xyXG5cdFx0XHRcdH1cclxuXHRcdFx0fVxyXG5cclxuXHRcdFx0Ly8gbWFrZSB0aGUgY29udGVudCBmb3IgdGhpcyByb3V0ZVxyXG5cdFx0XHRtYWtlci5tYWtlKHtkaXNwb3NhYmxlLCBzZXRUaXRsZSwgY29udGVudCwgbWF0Y2h9KTtcclxuXHRcdH07XHJcblxyXG5cdFx0Ly8gc3dpdGNoIHBhZ2VzXHJcblx0XHRsaWZlTGluZS5uYXYubmF2aWdhdGUgPSBmdW5jdGlvbih1cmwpIHtcclxuXHRcdFx0Ly8gdXBkYXRlIHRoZSB1cmxcclxuXHRcdFx0aGlzdG9yeS5wdXNoU3RhdGUobnVsbCwgbnVsbCwgdXJsKTtcclxuXHJcblx0XHRcdC8vIHNob3cgdGhlIG5ldyB2aWV3XHJcblx0XHRcdHVwZGF0ZVZpZXcoKTtcclxuXHRcdH07XHJcblxyXG5cdFx0Ly8gc3dpdGNoIHBhZ2VzIHdoZW4gdGhlIHVzZXIgcHVzaGVzIHRoZSBiYWNrIGJ1dHRvblxyXG5cdFx0d2luZG93LmFkZEV2ZW50TGlzdGVuZXIoXCJwb3BzdGF0ZVwiLCAoKSA9PiB1cGRhdGVWaWV3KCkpO1xyXG5cclxuXHRcdC8vIHNob3cgdGhlIGluaXRpYWwgdmlld1xyXG5cdFx0dXBkYXRlVmlldygpO1xyXG5cdH1cclxufSk7XHJcblxyXG4vLyBhbGwgY29udGVudCBwcm9kdWNlcnNcclxudmFyIGNvbnRlbnRNYWtlcnMgPSBbXTtcclxuXHJcbi8vIGNyZWF0ZSB0aGUgbmFtZXNwYWNlXHJcbmxpZmVMaW5lLm5hdiA9IHt9O1xyXG5cclxuLy8gcmVnaXN0ZXIgYSBjb250ZW50IG1ha2VyXHJcbmxpZmVMaW5lLm5hdi5yZWdpc3RlciA9IGZ1bmN0aW9uKG1ha2VyKSB7XHJcblx0Y29udGVudE1ha2Vycy5wdXNoKG1ha2VyKTtcclxufTtcclxuXHJcbi8vIHRoZSBmYWxsIGJhY2sgbWFrZXIgZm9yIG5vIHN1Y2ggcGFnZVxyXG52YXIgbm90Rm91bmRNYWtlciA9IHtcclxuXHRtYWtlKHtzZXRUaXRsZSwgY29udGVudH0pIHtcclxuXHRcdC8vIHVwZGF0ZSB0aGUgcGFnZSB0aXRsZVxyXG5cdFx0c2V0VGl0bGUoXCJOb3QgZm91bmRcIik7XHJcblxyXG5cdFx0bGlmZUxpbmUubWFrZURvbSh7XHJcblx0XHRcdHBhcmVudDogY29udGVudCxcclxuXHRcdFx0Y2xhc3NlczogXCJjb250ZW50LXBhZGRlZFwiLFxyXG5cdFx0XHRjaGlsZHJlbjogW1xyXG5cdFx0XHRcdHtcclxuXHRcdFx0XHRcdHRhZzogXCJzcGFuXCIsXHJcblx0XHRcdFx0XHR0ZXh0OiBcIlRoZSBwYWdlIHlvdSBhcmUgbG9va2luZyBmb3IgY291bGQgbm90IGJlIGZvdW5kLiBcIlxyXG5cdFx0XHRcdH0sXHJcblx0XHRcdFx0e1xyXG5cdFx0XHRcdFx0d2lkZ2V0OiBcImxpbmtcIixcclxuXHRcdFx0XHRcdGhyZWY6IFwiL1wiLFxyXG5cdFx0XHRcdFx0dGV4dDogXCJHbyBob21lXCJcclxuXHRcdFx0XHR9XHJcblx0XHRcdF1cclxuXHRcdH0pO1xyXG5cdH1cclxufTtcclxuIiwiLyoqXHJcbiAqIENyZWF0ZSBhbiBpbnB1dCBmaWVsZFxyXG4gKi9cclxuXHJcbmxpZmVMaW5lLm1ha2VEb20ucmVnaXN0ZXIoXCJpbnB1dFwiLCB7XHJcblx0bWFrZSh7dGFnLCB0eXBlLCB2YWx1ZSwgY2hhbmdlLCBiaW5kLCBwcm9wLCBwbGFjZWhvbGRlciwgY2xhc3Nlc30pIHtcclxuXHRcdC8vIHNldCB0aGUgaW5pdGlhbCB2YWx1ZSBvZiB0aGUgYm91bmQgb2JqZWN0XHJcblx0XHRpZih0eXBlb2YgYmluZCA9PSBcIm9iamVjdFwiICYmICF2YWx1ZSkge1xyXG5cdFx0XHR2YWx1ZSA9IGJpbmRbcHJvcF07XHJcblx0XHR9XHJcblxyXG5cdFx0dmFyIGlucHV0ID0ge1xyXG5cdFx0XHR0YWc6IHRhZyB8fCBcImlucHV0XCIsXHJcblx0XHRcdGNsYXNzZXM6IGNsYXNzZXMgfHwgYCR7dGFnID09IFwidGV4dGFyZWFcIiA/IFwidGV4dGFyZWFcIiA6IFwiaW5wdXRcIn0tZmlsbGAsXHJcblx0XHRcdGF0dHJzOiB7fSxcclxuXHRcdFx0b246IHtcclxuXHRcdFx0XHRpbnB1dDogZSA9PiB7XHJcblx0XHRcdFx0XHQvLyB1cGRhdGUgdGhlIHByb3BlcnR5IGNoYW5nZWRcclxuXHRcdFx0XHRcdGlmKHR5cGVvZiBiaW5kID09IFwib2JqZWN0XCIpIHtcclxuXHRcdFx0XHRcdFx0YmluZFtwcm9wXSA9IGUudGFyZ2V0LnZhbHVlO1xyXG5cdFx0XHRcdFx0fVxyXG5cclxuXHRcdFx0XHRcdC8vIGNhbGwgdGhlIGNhbGxiYWNrXHJcblx0XHRcdFx0XHRpZih0eXBlb2YgY2hhbmdlID09IFwiZnVuY3Rpb25cIikge1xyXG5cdFx0XHRcdFx0XHRjaGFuZ2UoZS50YXJnZXQudmFsdWUpO1xyXG5cdFx0XHRcdFx0fVxyXG5cdFx0XHRcdH1cclxuXHRcdFx0fVxyXG5cdFx0fTtcclxuXHJcblx0XHQvLyBhdHRhY2ggdmFsdWVzIGlmIHRoZXkgYXJlIGdpdmVuXHJcblx0XHRpZih0eXBlKSBpbnB1dC5hdHRycy50eXBlID0gdHlwZTtcclxuXHRcdGlmKHZhbHVlKSBpbnB1dC5hdHRycy52YWx1ZSA9IHZhbHVlO1xyXG5cdFx0aWYocGxhY2Vob2xkZXIpIGlucHV0LmF0dHJzLnBsYWNlaG9sZGVyID0gcGxhY2Vob2xkZXI7XHJcblxyXG5cdFx0Ly8gZm9yIHRleHRhcmVhcyBzZXQgaW5uZXJUZXh0XHJcblx0XHRpZih0YWcgPT0gXCJ0ZXh0YXJlYVwiKSB7XHJcblx0XHRcdGlucHV0LnRleHQgPSB2YWx1ZTtcclxuXHRcdH1cclxuXHJcblx0XHRyZXR1cm4gaW5wdXQ7XHJcblx0fVxyXG59KTtcclxuIiwiLyoqXHJcbiAqIEEgd2lkZ2V0IHRoYXQgY3JlYXRlcyBhIGxpbmsgdGhhdCBob29rcyBpbnRvIHRoZSBuYXZpZ2F0b3JcclxuICovXHJcblxyXG5saWZlTGluZS5tYWtlRG9tLnJlZ2lzdGVyKFwibGlua1wiLCB7XHJcblx0bWFrZShvcHRzKSB7XHJcblx0XHRyZXR1cm4ge1xyXG5cdFx0XHR0YWc6IFwiYVwiLFxyXG5cdFx0XHRhdHRyczoge1xyXG5cdFx0XHRcdGhyZWY6IG9wdHMuaHJlZlxyXG5cdFx0XHR9LFxyXG5cdFx0XHRvbjoge1xyXG5cdFx0XHRcdGNsaWNrOiBlID0+IHtcclxuXHRcdFx0XHRcdC8vIGRvbid0IG92ZXIgcmlkZSBjdHJsIG9yIGFsdCBvciBzaGlmdCBjbGlja3NcclxuXHRcdFx0XHRcdGlmKGUuY3RybEtleSB8fCBlLmFsdEtleSB8fCBlLnNoaWZ0S2V5KSByZXR1cm47XHJcblxyXG5cdFx0XHRcdFx0Ly8gZG9uJ3QgbmF2aWdhdGUgdGhlIHBhZ2VcclxuXHRcdFx0XHRcdGUucHJldmVudERlZmF1bHQoKTtcclxuXHJcblx0XHRcdFx0XHRsaWZlTGluZS5uYXYubmF2aWdhdGUob3B0cy5ocmVmKVxyXG5cdFx0XHRcdH1cclxuXHRcdFx0fSxcclxuXHRcdFx0dGV4dDogb3B0cy50ZXh0XHJcblx0XHR9O1xyXG5cdH1cclxufSk7XHJcbiIsIi8qKlxyXG4gKiBEaXNwbGF5IGEgbGlzdCB3aXRoIGdyb3VwIGhlYWRpbmdzXHJcbiAqL1xyXG5cclxubGlmZUxpbmUubWFrZURvbS5yZWdpc3RlcihcImxpc3RcIiwge1xyXG5cdG1ha2Uoe2l0ZW1zfSkge1xyXG5cdFx0Ly8gYWRkIGFsbCB0aGUgZ3JvdXBzXHJcblx0XHRyZXR1cm4gT2JqZWN0LmdldE93blByb3BlcnR5TmFtZXMoaXRlbXMpXHJcblxyXG5cdFx0Lm1hcChncm91cE5hbWUgPT4gbWFrZUdyb3VwKGdyb3VwTmFtZSwgaXRlbXNbZ3JvdXBOYW1lXSkpO1xyXG5cdH1cclxufSk7XHJcblxyXG4vLyBtYWtlIGEgc2luZ2xlIGdyb3VwXHJcbnZhciBtYWtlR3JvdXAgPSBmdW5jdGlvbihuYW1lLCBpdGVtcywgcGFyZW50KSB7XHJcblx0Ly8gYWRkIHRoZSBsaXN0IGhlYWRlclxyXG5cdGl0ZW1zLnVuc2hpZnQoe1xyXG5cdFx0Y2xhc3NlczogXCJsaXN0LWhlYWRlclwiLFxyXG5cdFx0dGV4dDogbmFtZVxyXG5cdH0pO1xyXG5cclxuXHQvLyByZW5kZXIgdGhlIGl0ZW1cclxuXHRyZXR1cm4ge1xyXG5cdFx0cGFyZW50LFxyXG5cdFx0Y2xhc3NlczogXCJsaXN0LXNlY3Rpb25cIixcclxuXHRcdGNoaWxkcmVuOiBpdGVtcy5tYXAoKGl0ZW0sIGluZGV4KSA9PiB7XHJcblx0XHRcdC8vIGRvbid0IG1vZGlmeSB0aGUgaGVhZGVyXHJcblx0XHRcdGlmKGluZGV4ID09PSAwKSByZXR1cm4gaXRlbTtcclxuXHJcblx0XHRcdHZhciBpdGVtRG9tO1xyXG5cclxuXHRcdFx0Ly8gY3JlYXRlIGFuIGl0ZW1cclxuXHRcdFx0aWYodHlwZW9mIGl0ZW0gIT0gXCJzdHJpbmdcIikge1xyXG5cdFx0XHRcdGl0ZW1Eb20gPSB7XHJcblx0XHRcdFx0XHRjbGFzc2VzOiBcImxpc3QtaXRlbVwiLFxyXG5cdFx0XHRcdFx0Y2hpbGRyZW46IChpdGVtLml0ZW1zIHx8IGl0ZW0pLm1hcChpdGVtID0+IHtcclxuXHRcdFx0XHRcdFx0cmV0dXJuIHtcclxuXHRcdFx0XHRcdFx0XHQvLyBnZXQgdGhlIG5hbWUgb2YgdGhlIGl0ZW1cclxuXHRcdFx0XHRcdFx0XHR0ZXh0OiB0eXBlb2YgaXRlbSA9PSBcInN0cmluZ1wiID8gaXRlbSA6IGl0ZW0udGV4dCxcclxuXHRcdFx0XHRcdFx0XHQvLyBzZXQgd2hldGhlciB0aGUgaXRlbSBzaG91bGQgZ3Jvd1xyXG5cdFx0XHRcdFx0XHRcdGNsYXNzZXM6IGl0ZW0uZ3JvdyA/IFwibGlzdC1pdGVtLWdyb3dcIiA6IFwibGlzdC1pdGVtLXBhcnRcIlxyXG5cdFx0XHRcdFx0XHR9O1xyXG5cdFx0XHRcdFx0fSlcclxuXHRcdFx0XHR9O1xyXG5cdFx0XHR9XHJcblx0XHRcdGVsc2Uge1xyXG5cdFx0XHRcdGl0ZW1Eb20gPSB7XHJcblx0XHRcdFx0XHRjbGFzc2VzOiBcImxpc3QtaXRlbVwiLFxyXG5cdFx0XHRcdFx0dGV4dDogaXRlbVxyXG5cdFx0XHRcdH07XHJcblx0XHRcdH1cclxuXHJcblx0XHRcdC8vIG1ha2UgdGhlIGl0ZW0gYSBsaW5rXHJcblx0XHRcdGlmKGl0ZW0uaHJlZikge1xyXG5cdFx0XHRcdGl0ZW1Eb20ub24gPSB7XHJcblx0XHRcdFx0XHRjbGljazogKCkgPT4gbGlmZUxpbmUubmF2Lm5hdmlnYXRlKGl0ZW0uaHJlZilcclxuXHRcdFx0XHR9O1xyXG5cdFx0XHR9XHJcblxyXG5cdFx0XHRyZXR1cm4gaXRlbURvbTtcclxuXHRcdH0pXHJcblx0fTtcclxufTtcclxuIiwiLyoqXHJcbiAqIFRoZSB3aWRnZXQgZm9yIHRoZSBzaWRlYmFyXHJcbiAqL1xyXG5cclxubGlmZUxpbmUubWFrZURvbS5yZWdpc3RlcihcInNpZGViYXJcIiwge1xyXG5cdG1ha2UoKSB7XHJcblx0XHRyZXR1cm4gW1xyXG5cdFx0XHR7XHJcblx0XHRcdFx0Y2xhc3NlczogXCJzaWRlYmFyXCIsXHJcblx0XHRcdFx0bmFtZTogXCJzaWRlYmFyXCIsXHJcblx0XHRcdFx0Y2hpbGRyZW46IFtcclxuXHRcdFx0XHRcdHtcclxuXHRcdFx0XHRcdFx0Y2xhc3NlczogW1wic2lkZWJhci1hY3Rpb25zXCIsIFwiaGlkZGVuXCJdLFxyXG5cdFx0XHRcdFx0XHRuYW1lOiBcImFjdGlvbnNcIixcclxuXHRcdFx0XHRcdFx0Y2hpbGRyZW46IFtcclxuXHRcdFx0XHRcdFx0XHR7XHJcblx0XHRcdFx0XHRcdFx0XHRjbGFzc2VzOiBcInNpZGViYXItaGVhZGluZ1wiLFxyXG5cdFx0XHRcdFx0XHRcdFx0dGV4dDogXCJQYWdlIGFjdGlvbnNcIlxyXG5cdFx0XHRcdFx0XHRcdH1cclxuXHRcdFx0XHRcdFx0XVxyXG5cdFx0XHRcdFx0fSxcclxuXHRcdFx0XHRcdHtcclxuXHRcdFx0XHRcdFx0Y2xhc3NlczogXCJzaWRlYmFyLWhlYWRpbmdcIixcclxuXHRcdFx0XHRcdFx0dGV4dDogXCJNb3JlIGFjdGlvbnNcIlxyXG5cdFx0XHRcdFx0fVxyXG5cdFx0XHRcdF1cclxuXHRcdFx0fSxcclxuXHRcdFx0e1xyXG5cdFx0XHRcdGNsYXNzZXM6IFwic2hhZGVcIixcclxuXHRcdFx0XHRvbjoge1xyXG5cdFx0XHRcdFx0Ly8gY2xvc2UgdGhlIHNpZGViYXJcclxuXHRcdFx0XHRcdGNsaWNrOiAoKSA9PiBkb2N1bWVudC5ib2R5LmNsYXNzTGlzdC5yZW1vdmUoXCJzaWRlYmFyLW9wZW5cIilcclxuXHRcdFx0XHR9XHJcblx0XHRcdH1cclxuXHRcdF07XHJcblx0fSxcclxuXHJcblx0YmluZChvcHRzLCB7YWN0aW9ucywgc2lkZWJhcn0pIHtcclxuXHRcdC8vIGFkZCBhIGNvbW1hbmQgdG8gdGhlIHNpZGViYXJcclxuXHRcdGxpZmVMaW5lLmFkZENvbW1hbmQgPSBmdW5jdGlvbihuYW1lLCBmbikge1xyXG5cdFx0XHQvLyBtYWtlIHRoZSBzaWRlYmFyIGl0ZW1cclxuXHRcdFx0dmFyIHtpdGVtfSA9IGxpZmVMaW5lLm1ha2VEb20oe1xyXG5cdFx0XHRcdHBhcmVudDogc2lkZWJhcixcclxuXHRcdFx0XHR0YWc6IFwiZGl2XCIsXHJcblx0XHRcdFx0bmFtZTogXCJpdGVtXCIsXHJcblx0XHRcdFx0Y2xhc3NlczogXCJzaWRlYmFyLWl0ZW1cIixcclxuXHRcdFx0XHR0ZXh0OiBuYW1lLFxyXG5cdFx0XHRcdG9uOiB7XHJcblx0XHRcdFx0XHRjbGljazogKCkgPT4ge1xyXG5cdFx0XHRcdFx0XHQvLyBjbG9zZSB0aGUgc2lkZWJhclxyXG5cdFx0XHRcdFx0XHRkb2N1bWVudC5ib2R5LmNsYXNzTGlzdC5yZW1vdmUoXCJzaWRlYmFyLW9wZW5cIik7XHJcblxyXG5cdFx0XHRcdFx0XHQvLyBjYWxsIHRoZSBsaXN0ZW5lclxyXG5cdFx0XHRcdFx0XHRmbigpO1xyXG5cdFx0XHRcdFx0fVxyXG5cdFx0XHRcdH1cclxuXHRcdFx0fSk7XHJcblxyXG5cdFx0XHRyZXR1cm4ge1xyXG5cdFx0XHRcdHVuc3Vic2NyaWJlOiAoKSA9PiBpdGVtLnJlbW92ZSgpXHJcblx0XHRcdH07XHJcblx0XHR9O1xyXG5cclxuXHRcdC8vIGFkZCBhIG5hdmlnYXRpb25hbCBjb21tYW5kXHJcblx0XHRsaWZlTGluZS5hZGROYXZDb21tYW5kID0gZnVuY3Rpb24obmFtZSwgdG8pIHtcclxuXHRcdFx0bGlmZUxpbmUuYWRkQ29tbWFuZChuYW1lLCAoKSA9PiBsaWZlTGluZS5uYXYubmF2aWdhdGUodG8pKTtcclxuXHRcdH07XHJcblxyXG5cdFx0Ly8gYWRkIGEgc2lkZWJhciBhY3Rpb25cclxuXHRcdGxpZmVMaW5lLm9uKFwiYWN0aW9uLWNyZWF0ZVwiLCBuYW1lID0+IHtcclxuXHRcdFx0Ly8gc2hvdyB0aGUgYWN0aW9uc1xyXG5cdFx0XHRhY3Rpb25zLmNsYXNzTGlzdC5yZW1vdmUoXCJoaWRkZW5cIik7XHJcblxyXG5cdFx0XHQvLyBjcmVhdGUgdGhlIGJ1dHRvblxyXG5cdFx0XHRsaWZlTGluZS5tYWtlRG9tKHtcclxuXHRcdFx0XHRwYXJlbnQ6IGFjdGlvbnMsXHJcblx0XHRcdFx0dGFnOiBcImRpdlwiLFxyXG5cdFx0XHRcdG5hbWU6IFwiaXRlbVwiLFxyXG5cdFx0XHRcdGNsYXNzZXM6IFwic2lkZWJhci1pdGVtXCIsXHJcblx0XHRcdFx0dGV4dDogbmFtZSxcclxuXHRcdFx0XHRhdHRyczoge1xyXG5cdFx0XHRcdFx0XCJkYXRhLW5hbWVcIjogbmFtZVxyXG5cdFx0XHRcdH0sXHJcblx0XHRcdFx0b246IHtcclxuXHRcdFx0XHRcdGNsaWNrOiAoKSA9PiB7XHJcblx0XHRcdFx0XHRcdC8vIGNsb3NlIHRoZSBzaWRlYmFyXHJcblx0XHRcdFx0XHRcdGRvY3VtZW50LmJvZHkuY2xhc3NMaXN0LnJlbW92ZShcInNpZGViYXItb3BlblwiKTtcclxuXHJcblx0XHRcdFx0XHRcdC8vIHRyaWdnZXIgdGhlIGFjdGlvblxyXG5cdFx0XHRcdFx0XHRsaWZlTGluZS5lbWl0KFwiYWN0aW9uLWV4ZWMtXCIgKyBuYW1lKTtcclxuXHRcdFx0XHRcdH1cclxuXHRcdFx0XHR9XHJcblx0XHRcdH0pO1xyXG5cclxuXHRcdFx0Ly8gcmVtb3ZlIGEgc2lkZWJhciBhY3Rpb25cclxuXHRcdFx0bGlmZUxpbmUub24oXCJhY3Rpb24tcmVtb3ZlXCIsIG5hbWUgPT4ge1xyXG5cdFx0XHRcdC8vIHJlbW92ZSB0aGUgYnV0dG9uXHJcblx0XHRcdFx0dmFyIGJ0biA9IGFjdGlvbnMucXVlcnlTZWxlY3RvcihgW2RhdGEtbmFtZT1cIiR7bmFtZX1cIl1gKTtcclxuXHJcblx0XHRcdFx0aWYoYnRuKSBidG4ucmVtb3ZlKCk7XHJcblxyXG5cdFx0XHRcdC8vIGhpZGUgdGhlIHBhZ2UgYWN0aW9ucyBpZiB0aGVyZSBhcmUgbm9uZVxyXG5cdFx0XHRcdGlmKGFjdGlvbnMuY2hpbGRyZW4ubGVuZ3RoID09IDEpIHtcclxuXHRcdFx0XHRcdGFjdGlvbnMuY2xhc3NMaXN0LmFkZChcImhpZGRlblwiKTtcclxuXHRcdFx0XHR9XHJcblx0XHRcdH0pO1xyXG5cclxuXHRcdFx0Ly8gcmVtb3ZlIGFsbCB0aGUgc2lkZWJhciBhY3Rpb25zXHJcblx0XHRcdGxpZmVMaW5lLm9uKFwiYWN0aW9uLXJlbW92ZS1hbGxcIiwgKCkgPT4ge1xyXG5cdFx0XHRcdC8vIHJlbW92ZSBhbGwgdGhlIGFjdGlvbnNcclxuXHRcdFx0XHR2YXIgX2FjdGlvbnMgPSBBcnJheS5mcm9tKGFjdGlvbnMucXVlcnlTZWxlY3RvckFsbChcIi5zaWRlYmFyLWl0ZW1cIikpO1xyXG5cclxuXHRcdFx0XHRfYWN0aW9ucy5mb3JFYWNoKGFjdGlvbiA9PiBhY3Rpb24ucmVtb3ZlKCkpO1xyXG5cclxuXHRcdFx0XHQvLyBzaWRlIHRoZSBwYWdlIGFjdGlvbnNcclxuXHRcdFx0XHRhY3Rpb25zLmNsYXNzTGlzdC5hZGQoXCJoaWRkZW5cIik7XHJcblx0XHRcdH0pO1xyXG5cdFx0fSk7XHJcblx0fVxyXG59KTtcclxuIiwiLyoqXHJcbiAqIEEgcm93IG9mIHJhZGlvIHN0eWxlIGJ1dHRvbnNcclxuICovXHJcblxyXG5saWZlTGluZS5tYWtlRG9tLnJlZ2lzdGVyKFwidG9nZ2xlLWJ0bnNcIiwge1xyXG5cdG1ha2Uoe2J0bnMsIHZhbHVlfSkge1xyXG5cdFx0Ly8gYXV0byBzZWxlY3QgdGhlIGZpcnN0IGJ1dHRvblxyXG5cdFx0aWYoIXZhbHVlKSB7XHJcblx0XHRcdHZhbHVlID0gdHlwZW9mIGJ0bnNbMF0gPT0gXCJzdHJpbmdcIiA/IGJ0bnNbMF0gOiBidG5zWzBdLnZhbHVlO1xyXG5cdFx0fVxyXG5cclxuXHRcdHJldHVybiB7XHJcblx0XHRcdG5hbWU6IFwidG9nZ2xlQmFyXCIsXHJcblx0XHRcdGNsYXNzZXM6IFwidG9nZ2xlLWJhclwiLFxyXG5cdFx0XHRjaGlsZHJlbjogYnRucy5tYXAoYnRuID0+IHtcclxuXHRcdFx0XHQvLyBjb252ZXJ0IHRoZSBwbGFpbiBzdHJpbmcgdG8gYW4gb2JqZWN0XHJcblx0XHRcdFx0aWYodHlwZW9mIGJ0biA9PSBcInN0cmluZ1wiKSB7XHJcblx0XHRcdFx0XHRidG4gPSB7IHRleHQ6IGJ0biwgdmFsdWU6IGJ0biB9O1xyXG5cdFx0XHRcdH1cclxuXHJcblx0XHRcdFx0dmFyIGNsYXNzZXMgPSBbXCJ0b2dnbGUtYnRuXCJdO1xyXG5cclxuXHRcdFx0XHQvLyBhZGQgdGhlIHNlbGVjdGVkIGNsYXNzXHJcblx0XHRcdFx0aWYodmFsdWUgPT0gYnRuLnZhbHVlKSB7XHJcblx0XHRcdFx0XHRjbGFzc2VzLnB1c2goXCJ0b2dnbGUtYnRuLXNlbGVjdGVkXCIpO1xyXG5cclxuXHRcdFx0XHRcdC8vIGRvbid0IHNlbGVjdCB0d28gYnV0dG9uc1xyXG5cdFx0XHRcdFx0dmFsdWUgPSB1bmRlZmluZWQ7XHJcblx0XHRcdFx0fVxyXG5cclxuXHRcdFx0XHRyZXR1cm4ge1xyXG5cdFx0XHRcdFx0dGFnOiBcImJ1dHRvblwiLFxyXG5cdFx0XHRcdFx0Y2xhc3NlcyxcclxuXHRcdFx0XHRcdHRleHQ6IGJ0bi50ZXh0LFxyXG5cdFx0XHRcdFx0YXR0cnM6IHtcclxuXHRcdFx0XHRcdFx0XCJkYXRhLXZhbHVlXCI6IGJ0bi52YWx1ZVxyXG5cdFx0XHRcdFx0fVxyXG5cdFx0XHRcdH07XHJcblx0XHRcdH0pXHJcblx0XHR9O1xyXG5cdH0sXHJcblxyXG5cdGJpbmQoe2NoYW5nZX0sIHt0b2dnbGVCYXJ9KSB7XHJcblx0XHQvLyBhdHRhY2ggbGlzdGVuZXJzXHJcblx0XHRmb3IobGV0IGJ0biBvZiB0b2dnbGVCYXIucXVlcnlTZWxlY3RvckFsbChcIi50b2dnbGUtYnRuXCIpKSB7XHJcblx0XHRcdGJ0bi5hZGRFdmVudExpc3RlbmVyKFwiY2xpY2tcIiwgKCkgPT4ge1xyXG5cdFx0XHRcdHZhciBzZWxlY3RlZCA9IHRvZ2dsZUJhci5xdWVyeVNlbGVjdG9yKFwiLnRvZ2dsZS1idG4tc2VsZWN0ZWRcIik7XHJcblxyXG5cdFx0XHRcdC8vIHRoZSBidXR0b24gaGFzIGFscmVhZHkgYmVlbiBzZWxlY3RlZFxyXG5cdFx0XHRcdGlmKHNlbGVjdGVkID09IGJ0bikge1xyXG5cdFx0XHRcdFx0cmV0dXJuO1xyXG5cdFx0XHRcdH1cclxuXHJcblx0XHRcdFx0Ly8gdW50b2dnbGUgdGhlIG90aGVyIGJ1dHRvblxyXG5cdFx0XHRcdGlmKHNlbGVjdGVkKSB7XHJcblx0XHRcdFx0XHRzZWxlY3RlZC5jbGFzc0xpc3QucmVtb3ZlKFwidG9nZ2xlLWJ0bi1zZWxlY3RlZFwiKTtcclxuXHRcdFx0XHR9XHJcblxyXG5cdFx0XHRcdC8vIHNlbGVjdCB0aGlzIGJ1dHRvblxyXG5cdFx0XHRcdGJ0bi5jbGFzc0xpc3QuYWRkKFwidG9nZ2xlLWJ0bi1zZWxlY3RlZFwiKTtcclxuXHJcblx0XHRcdFx0Ly8gdHJpZ2dlciBhIHNlbGVjdGlvbiBjaGFuZ2VcclxuXHRcdFx0XHRjaGFuZ2UoYnRuLmRhdGFzZXQudmFsdWUpO1xyXG5cdFx0XHR9KTtcclxuXHRcdH1cclxuXHR9XHJcbn0pO1xyXG4iLCIvKipcclxuICogS2VlcCBhIGxpc3Qgb2Ygc3Vic2NyaXB0aW9ucyB0byB1bnN1YnNjcmliZSBmcm9tIHRvZ2V0aGVyXHJcbiAqL1xyXG5cclxuZXhwb3J0IGRlZmF1bHQgY2xhc3MgRGlzcG9zYWJsZSB7XHJcblx0Y29uc3RydWN0b3IoKSB7XHJcblx0XHR0aGlzLl9zdWJzY3JpcHRpb25zID0gW107XHJcblx0fVxyXG5cclxuXHQvLyBVbnN1YnNjcmliZSBmcm9tIGFsbCBzdWJzY3JpcHRpb25zXHJcblx0ZGlzcG9zZSgpIHtcclxuXHRcdC8vIHJlbW92ZSB0aGUgZmlyc3Qgc3Vic2NyaXB0aW9uIHVudGlsIHRoZXJlIGFyZSBub25lIGxlZnRcclxuXHRcdHdoaWxlKHRoaXMuX3N1YnNjcmlwdGlvbnMubGVuZ3RoID4gMCkge1xyXG5cdFx0XHR0aGlzLl9zdWJzY3JpcHRpb25zLnNoaWZ0KCkudW5zdWJzY3JpYmUoKTtcclxuXHRcdH1cclxuXHR9XHJcblxyXG5cdC8vIEFkZCBhIHN1YnNjcmlwdGlvbiB0byB0aGUgZGlzcG9zYWJsZVxyXG5cdGFkZChzdWJzY3JpcHRpb24pIHtcclxuXHRcdC8vIGNvcHkgdGhlIGRpc3Bvc2FibGVcclxuXHRcdGlmKHN1YnNjcmlwdGlvbiBpbnN0YW5jZW9mIERpc3Bvc2FibGUpIHtcclxuXHRcdFx0Ly8gY29weSB0aGUgc3Vic2NyaXB0aW9ucyBmcm9tIHRoZSBkaXNwb3NhYmxlXHJcblx0XHRcdHRoaXMuX3N1YnNjcmlwdGlvbnMgPSB0aGlzLl9zdWJzY3JpcHRpb25zLmNvbmNhdChzdWJzY3JpcHRpb24uX3N1YnNjcmlwdGlvbnMpO1xyXG5cclxuXHRcdFx0Ly8gcmVtb3ZlIHRoZSByZWZyZW5jZXMgZnJvbSB0aGUgZGlzcG9zYWJsZVxyXG5cdFx0XHRzdWJzY3JpcHRpb24uX3N1YnNjcmlwdGlvbnMgPSBbXTtcclxuXHRcdH1cclxuXHRcdC8vIGFkZCBhIHN1YnNjcmlwdGlvblxyXG5cdFx0ZWxzZSB7XHJcblx0XHRcdHRoaXMuX3N1YnNjcmlwdGlvbnMucHVzaChzdWJzY3JpcHRpb24pO1xyXG5cdFx0fVxyXG5cdH1cclxuXHJcblx0Ly8gZGlzcG9zZSB3aGVuIGFuIGV2ZW50IGlzIGZpcmVkXHJcblx0ZGlzcG9zZU9uKGVtaXR0ZXIsIGV2ZW50KSB7XHJcblx0XHR0aGlzLmFkZChlbWl0dGVyLm9uKGV2ZW50LCAoKSA9PiB0aGlzLmRpc3Bvc2UoKSkpO1xyXG5cdH1cclxufTtcclxuIiwiLyoqXHJcbiAqIEEgYmFzaWMgZXZlbnQgZW1pdHRlclxyXG4gKi9cclxuXHJcbmV4cG9ydCBkZWZhdWx0IGNsYXNzIEV2ZW50RW1pdHRlciB7XHJcblx0Y29uc3RydWN0b3IoKSB7XHJcblx0XHR0aGlzLl9saXN0ZW5lcnMgPSB7fTtcclxuXHR9XHJcblxyXG5cdC8qKlxyXG5cdCAqIEFkZCBhbiBldmVudCBsaXN0ZW5lclxyXG5cdCAqL1xyXG5cdG9uKG5hbWUsIGxpc3RlbmVyKSB7XHJcblx0XHQvLyBpZiB3ZSBkb24ndCBoYXZlIGFuIGV4aXN0aW5nIGxpc3RlbmVycyBhcnJheSBjcmVhdGUgb25lXHJcblx0XHRpZighdGhpcy5fbGlzdGVuZXJzW25hbWVdKSB7XHJcblx0XHRcdHRoaXMuX2xpc3RlbmVyc1tuYW1lXSA9IFtdO1xyXG5cdFx0fVxyXG5cclxuXHRcdC8vIGFkZCB0aGUgbGlzdGVuZXJcclxuXHRcdHRoaXMuX2xpc3RlbmVyc1tuYW1lXS5wdXNoKGxpc3RlbmVyKTtcclxuXHJcblx0XHQvLyBnaXZlIHRoZW0gYSBzdWJzY3JpcHRpb25cclxuXHRcdHJldHVybiB7XHJcblx0XHRcdF9saXN0ZW5lcjogbGlzdGVuZXIsXHJcblxyXG5cdFx0XHR1bnN1YnNjcmliZTogKCkgPT4ge1xyXG5cdFx0XHRcdC8vIGZpbmQgdGhlIGxpc3RlbmVyXHJcblx0XHRcdFx0dmFyIGluZGV4ID0gdGhpcy5fbGlzdGVuZXJzW25hbWVdLmluZGV4T2YobGlzdGVuZXIpO1xyXG5cclxuXHRcdFx0XHRpZihpbmRleCAhPT0gLTEpIHtcclxuXHRcdFx0XHRcdHRoaXMuX2xpc3RlbmVyc1tuYW1lXS5zcGxpY2UoaW5kZXgsIDEpO1xyXG5cdFx0XHRcdH1cclxuXHRcdFx0fVxyXG5cdFx0fTtcclxuXHR9XHJcblxyXG5cdC8qKlxyXG5cdCAqIEVtaXQgYW4gZXZlbnRcclxuXHQgKi9cclxuXHRlbWl0KG5hbWUsIC4uLmFyZ3MpIHtcclxuXHRcdC8vIGNoZWNrIGZvciBsaXN0ZW5lcnNcclxuXHRcdGlmKHRoaXMuX2xpc3RlbmVyc1tuYW1lXSkge1xyXG5cdFx0XHRmb3IobGV0IGxpc3RlbmVyIG9mIHRoaXMuX2xpc3RlbmVyc1tuYW1lXSkge1xyXG5cdFx0XHRcdC8vIGNhbGwgdGhlIGxpc3RlbmVyc1xyXG5cdFx0XHRcdGxpc3RlbmVyKC4uLmFyZ3MpO1xyXG5cdFx0XHR9XHJcblx0XHR9XHJcblx0fVxyXG5cclxuXHQvKipcclxuXHQgKiBFbWl0IGFuIGV2ZW50IGFuZCBza2lwIHNvbWUgbGlzdGVuZXJzXHJcblx0ICovXHJcblx0cGFydGlhbEVtaXQobmFtZSwgc2tpcHMgPSBbXSwgLi4uYXJncykge1xyXG5cdFx0Ly8gYWxsb3cgYSBzaW5nbGUgaXRlbVxyXG5cdFx0aWYoIUFycmF5LmlzQXJyYXkoc2tpcHMpKSB7XHJcblx0XHRcdHNraXBzID0gW3NraXBzXTtcclxuXHRcdH1cclxuXHJcblx0XHQvLyBjaGVjayBmb3IgbGlzdGVuZXJzXHJcblx0XHRpZih0aGlzLl9saXN0ZW5lcnNbbmFtZV0pIHtcclxuXHRcdFx0Zm9yKGxldCBsaXN0ZW5lciBvZiB0aGlzLl9saXN0ZW5lcnNbbmFtZV0pIHtcclxuXHRcdFx0XHQvLyB0aGlzIGV2ZW50IGxpc3RlbmVyIGlzIGJlaW5nIHNraXBlZFxyXG5cdFx0XHRcdGlmKHNraXBzLmZpbmQoc2tpcCA9PiBza2lwLl9saXN0ZW5lciA9PSBsaXN0ZW5lcikpIHtcclxuXHRcdFx0XHRcdGNvbnRpbnVlO1xyXG5cdFx0XHRcdH1cclxuXHJcblx0XHRcdFx0Ly8gY2FsbCB0aGUgbGlzdGVuZXJzXHJcblx0XHRcdFx0bGlzdGVuZXIoLi4uYXJncyk7XHJcblx0XHRcdH1cclxuXHRcdH1cclxuXHR9XHJcbn1cclxuIiwiLyoqXHJcbiAqIENyZWF0ZSBhIGdsb2JhbCBvYmplY3Qgd2l0aCBjb21tb25seSB1c2VkIG1vZHVsZXMgdG8gYXZvaWQgNTAgbWlsbGlvbiByZXF1aXJlc1xyXG4gKi9cclxuXHJcbmltcG9ydCBFdmVudEVtaXR0ZXIgZnJvbSBcIi4vZXZlbnQtZW1pdHRlclwiO1xyXG5cclxudmFyIGxpZmVMaW5lID0gbmV3IEV2ZW50RW1pdHRlcigpO1xyXG5cclxuLy8gcGxhdGZvcm0gZGV0ZWN0aW9uXHJcbmxpZmVMaW5lLm5vZGUgPSB0eXBlb2YgcHJvY2VzcyA9PSBcIm9iamVjdFwiO1xyXG5saWZlTGluZS5icm93c2VyID0gdHlwZW9mIHdpbmRvdyA9PSBcIm9iamVjdFwiO1xyXG5cclxuLy8gYXR0YWNoIHV0aWxzXHJcbmxpZmVMaW5lLkRpc3Bvc2FibGUgPSByZXF1aXJlKFwiLi9kaXNwb3NhYmxlXCIpLmRlZmF1bHQ7XHJcbmxpZmVMaW5lLkV2ZW50RW1pdHRlciA9IEV2ZW50RW1pdHRlcjtcclxuXHJcbi8vIGF0dGFjaCBsaWZlbGluZSB0byB0aGUgZ2xvYmFsIG9iamVjdFxyXG4obGlmZUxpbmUubm9kZSA/IGdsb2JhbCA6IGJyb3dzZXIpLmxpZmVMaW5lID0gbGlmZUxpbmU7XHJcbiJdfQ==
