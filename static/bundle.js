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

							// emit the change
							change();
						}
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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCJub2RlX21vZHVsZXMvcHJvY2Vzcy9icm93c2VyLmpzIiwic3JjXFxjbGllbnRcXGRhdGEtc3RvcmUuanMiLCJzcmNcXGNsaWVudFxcZ2xvYmFsLmpzIiwic3JjXFxjbGllbnRcXGluZGV4LmpzIiwic3JjXFxjbGllbnRcXHV0aWxcXGRhdGUuanMiLCJzcmNcXGNsaWVudFxcdXRpbFxcZG9tLW1ha2VyLmpzIiwic3JjXFxjbGllbnRcXHZpZXdzXFxhY2NvdW50LmpzIiwic3JjXFxjbGllbnRcXHZpZXdzXFxlZGl0LmpzIiwic3JjXFxjbGllbnRcXHZpZXdzXFxpdGVtLmpzIiwic3JjXFxjbGllbnRcXHZpZXdzXFxsaXN0cy5qcyIsInNyY1xcY2xpZW50XFx2aWV3c1xcbG9naW4uanMiLCJzcmNcXGNsaWVudFxcdmlld3NcXHVzZXJzLmpzIiwic3JjXFxjbGllbnRcXHdpZGdldHNcXGNvbnRlbnQuanMiLCJzcmNcXGNsaWVudFxcd2lkZ2V0c1xcaW5wdXQuanMiLCJzcmNcXGNsaWVudFxcd2lkZ2V0c1xcbGluay5qcyIsInNyY1xcY2xpZW50XFx3aWRnZXRzXFxsaXN0LmpzIiwic3JjXFxjbGllbnRcXHdpZGdldHNcXHNpZGViYXIuanMiLCJzcmNcXGNsaWVudFxcd2lkZ2V0c1xcdG9nZ2xlLWJ0bnMuanMiLCJzcmNcXGNvbW1vblxcZGlzcG9zYWJsZS5qcyIsInNyY1xcY29tbW9uXFxldmVudC1lbWl0dGVyLmpzIiwic3JjXFxjb21tb25cXHNyY1xcY29tbW9uXFxnbG9iYWwuanMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7QUNBQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7Ozs7Ozs7OztRQ3pLZ0IsSyxHQUFBLEs7Ozs7Ozs7O0FBWGhCOzs7O0FBSUEsSUFBTSxnQkFBZ0IsSUFBdEI7QUFDQSxJQUFNLGtCQUFrQixZQUF4Qjs7QUFFQTtBQUNBLElBQUksU0FBUyxFQUFiOztBQUVBO0FBQ08sU0FBUyxLQUFULENB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QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFVekI7QUFDRDs7Ozs7O2tCQWxFbUIsWTs7Ozs7O0FDQXJCOzs7Ozs7QUFFQSxJQUFJLFdBQVcsNEJBQWY7O0FBRUE7QUFSQTs7OztBQVNBLFNBQVMsSUFBVCxHQUFnQixPQUFPLE9BQVAsSUFBa0IsUUFBbEM7QUFDQSxTQUFTLE9BQVQsR0FBbUIsT0FBTyxNQUFQLElBQWlCLFFBQXBDOztBQUVBO0FBQ0EsU0FBUyxVQUFULEdBQXNCLFFBQVEsY0FBUixFQUF3QixPQUE5QztBQUNBLFNBQVMsWUFBVDs7QUFFQTtBQUNBLENBQUMsU0FBUyxJQUFULEdBQWdCLE1BQWhCLEdBQXlCLE9BQTFCLEVBQW1DLFFBQW5DLEdBQThDLFFBQTlDIiwiZmlsZSI6ImdlbmVyYXRlZC5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzQ29udGVudCI6WyIoZnVuY3Rpb24gZSh0LG4scil7ZnVuY3Rpb24gcyhvLHUpe2lmKCFuW29dKXtpZighdFtvXSl7dmFyIGE9dHlwZW9mIHJlcXVpcmU9PVwiZnVuY3Rpb25cIiYmcmVxdWlyZTtpZighdSYmYSlyZXR1cm4gYShvLCEwKTtpZihpKXJldHVybiBpKG8sITApO3ZhciBmPW5ldyBFcnJvcihcIkNhbm5vdCBmaW5kIG1vZHVsZSAnXCIrbytcIidcIik7dGhyb3cgZi5jb2RlPVwiTU9EVUxFX05PVF9GT1VORFwiLGZ9dmFyIGw9bltvXT17ZXhwb3J0czp7fX07dFtvXVswXS5jYWxsKGwuZXhwb3J0cyxmdW5jdGlvbihlKXt2YXIgbj10W29dWzFdW2VdO3JldHVybiBzKG4/bjplKX0sbCxsLmV4cG9ydHMsZSx0LG4scil9cmV0dXJuIG5bb10uZXhwb3J0c312YXIgaT10eXBlb2YgcmVxdWlyZT09XCJmdW5jdGlvblwiJiZyZXF1aXJlO2Zvcih2YXIgbz0wO288ci5sZW5ndGg7bysrKXMocltvXSk7cmV0dXJuIHN9KSIsIi8vIHNoaW0gZm9yIHVzaW5nIHByb2Nlc3MgaW4gYnJvd3NlclxudmFyIHByb2Nlc3MgPSBtb2R1bGUuZXhwb3J0cyA9IHt9O1xuXG4vLyBjYWNoZWQgZnJvbSB3aGF0ZXZlciBnbG9iYWwgaXMgcHJlc2VudCBzbyB0aGF0IHRlc3QgcnVubmVycyB0aGF0IHN0dWIgaXRcbi8vIGRvbid0IGJyZWFrIHRoaW5ncy4gIEJ1dCB3ZSBuZWVkIHRvIHdyYXAgaXQgaW4gYSB0cnkgY2F0Y2ggaW4gY2FzZSBpdCBpc1xuLy8gd3JhcHBlZCBpbiBzdHJpY3QgbW9kZSBjb2RlIHdoaWNoIGRvZXNuJ3QgZGVmaW5lIGFueSBnbG9iYWxzLiAgSXQncyBpbnNpZGUgYVxuLy8gZnVuY3Rpb24gYmVjYXVzZSB0cnkvY2F0Y2hlcyBkZW9wdGltaXplIGluIGNlcnRhaW4gZW5naW5lcy5cblxudmFyIGNhY2hlZFNldFRpbWVvdXQ7XG52YXIgY2FjaGVkQ2xlYXJUaW1lb3V0O1xuXG5mdW5jdGlvbiBkZWZhdWx0U2V0VGltb3V0KCkge1xuICAgIHRocm93IG5ldyBFcnJvcignc2V0VGltZW91dCBoYXMgbm90IGJlZW4gZGVmaW5lZCcpO1xufVxuZnVuY3Rpb24gZGVmYXVsdENsZWFyVGltZW91dCAoKSB7XG4gICAgdGhyb3cgbmV3IEVycm9yKCdjbGVhclRpbWVvdXQgaGFzIG5vdCBiZWVuIGRlZmluZWQnKTtcbn1cbihmdW5jdGlvbiAoKSB7XG4gICAgdHJ5IHtcbiAgICAgICAgaWYgKHR5cGVvZiBzZXRUaW1lb3V0ID09PSAnZnVuY3Rpb24nKSB7XG4gICAgICAgICAgICBjYWNoZWRTZXRUaW1lb3V0ID0gc2V0VGltZW91dDtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIGNhY2hlZFNldFRpbWVvdXQgPSBkZWZhdWx0U2V0VGltb3V0O1xuICAgICAgICB9XG4gICAgfSBjYXRjaCAoZSkge1xuICAgICAgICBjYWNoZWRTZXRUaW1lb3V0ID0gZGVmYXVsdFNldFRpbW91dDtcbiAgICB9XG4gICAgdHJ5IHtcbiAgICAgICAgaWYgKHR5cGVvZiBjbGVhclRpbWVvdXQgPT09ICdmdW5jdGlvbicpIHtcbiAgICAgICAgICAgIGNhY2hlZENsZWFyVGltZW91dCA9IGNsZWFyVGltZW91dDtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIGNhY2hlZENsZWFyVGltZW91dCA9IGRlZmF1bHRDbGVhclRpbWVvdXQ7XG4gICAgICAgIH1cbiAgICB9IGNhdGNoIChlKSB7XG4gICAgICAgIGNhY2hlZENsZWFyVGltZW91dCA9IGRlZmF1bHRDbGVhclRpbWVvdXQ7XG4gICAgfVxufSAoKSlcbmZ1bmN0aW9uIHJ1blRpbWVvdXQoZnVuKSB7XG4gICAgaWYgKGNhY2hlZFNldFRpbWVvdXQgPT09IHNldFRpbWVvdXQpIHtcbiAgICAgICAgLy9ub3JtYWwgZW52aXJvbWVudHMgaW4gc2FuZSBzaXR1YXRpb25zXG4gICAgICAgIHJldHVybiBzZXRUaW1lb3V0KGZ1biwgMCk7XG4gICAgfVxuICAgIC8vIGlmIHNldFRpbWVvdXQgd2Fzbid0IGF2YWlsYWJsZSBidXQgd2FzIGxhdHRlciBkZWZpbmVkXG4gICAgaWYgKChjYWNoZWRTZXRUaW1lb3V0ID09PSBkZWZhdWx0U2V0VGltb3V0IHx8ICFjYWNoZWRTZXRUaW1lb3V0KSAmJiBzZXRUaW1lb3V0KSB7XG4gICAgICAgIGNhY2hlZFNldFRpbWVvdXQgPSBzZXRUaW1lb3V0O1xuICAgICAgICByZXR1cm4gc2V0VGltZW91dChmdW4sIDApO1xuICAgIH1cbiAgICB0cnkge1xuICAgICAgICAvLyB3aGVuIHdoZW4gc29tZWJvZHkgaGFzIHNjcmV3ZWQgd2l0aCBzZXRUaW1lb3V0IGJ1dCBubyBJLkUuIG1hZGRuZXNzXG4gICAgICAgIHJldHVybiBjYWNoZWRTZXRUaW1lb3V0KGZ1biwgMCk7XG4gICAgfSBjYXRjaChlKXtcbiAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgIC8vIFdoZW4gd2UgYXJlIGluIEkuRS4gYnV0IHRoZSBzY3JpcHQgaGFzIGJlZW4gZXZhbGVkIHNvIEkuRS4gZG9lc24ndCB0cnVzdCB0aGUgZ2xvYmFsIG9iamVjdCB3aGVuIGNhbGxlZCBub3JtYWxseVxuICAgICAgICAgICAgcmV0dXJuIGNhY2hlZFNldFRpbWVvdXQuY2FsbChudWxsLCBmdW4sIDApO1xuICAgICAgICB9IGNhdGNoKGUpe1xuICAgICAgICAgICAgLy8gc2FtZSBhcyBhYm92ZSBidXQgd2hlbiBpdCdzIGEgdmVyc2lvbiBvZiBJLkUuIHRoYXQgbXVzdCBoYXZlIHRoZSBnbG9iYWwgb2JqZWN0IGZvciAndGhpcycsIGhvcGZ1bGx5IG91ciBjb250ZXh0IGNvcnJlY3Qgb3RoZXJ3aXNlIGl0IHdpbGwgdGhyb3cgYSBnbG9iYWwgZXJyb3JcbiAgICAgICAgICAgIHJldHVybiBjYWNoZWRTZXRUaW1lb3V0LmNhbGwodGhpcywgZnVuLCAwKTtcbiAgICAgICAgfVxuICAgIH1cblxuXG59XG5mdW5jdGlvbiBydW5DbGVhclRpbWVvdXQobWFya2VyKSB7XG4gICAgaWYgKGNhY2hlZENsZWFyVGltZW91dCA9PT0gY2xlYXJUaW1lb3V0KSB7XG4gICAgICAgIC8vbm9ybWFsIGVudmlyb21lbnRzIGluIHNhbmUgc2l0dWF0aW9uc1xuICAgICAgICByZXR1cm4gY2xlYXJUaW1lb3V0KG1hcmtlcik7XG4gICAgfVxuICAgIC8vIGlmIGNsZWFyVGltZW91dCB3YXNuJ3QgYXZhaWxhYmxlIGJ1dCB3YXMgbGF0dGVyIGRlZmluZWRcbiAgICBpZiAoKGNhY2hlZENsZWFyVGltZW91dCA9PT0gZGVmYXVsdENsZWFyVGltZW91dCB8fCAhY2FjaGVkQ2xlYXJUaW1lb3V0KSAmJiBjbGVhclRpbWVvdXQpIHtcbiAgICAgICAgY2FjaGVkQ2xlYXJUaW1lb3V0ID0gY2xlYXJUaW1lb3V0O1xuICAgICAgICByZXR1cm4gY2xlYXJUaW1lb3V0KG1hcmtlcik7XG4gICAgfVxuICAgIHRyeSB7XG4gICAgICAgIC8vIHdoZW4gd2hlbiBzb21lYm9keSBoYXMgc2NyZXdlZCB3aXRoIHNldFRpbWVvdXQgYnV0IG5vIEkuRS4gbWFkZG5lc3NcbiAgICAgICAgcmV0dXJuIGNhY2hlZENsZWFyVGltZW91dChtYXJrZXIpO1xuICAgIH0gY2F0Y2ggKGUpe1xuICAgICAgICB0cnkge1xuICAgICAgICAgICAgLy8gV2hlbiB3ZSBhcmUgaW4gSS5FLiBidXQgdGhlIHNjcmlwdCBoYXMgYmVlbiBldmFsZWQgc28gSS5FLiBkb2Vzbid0ICB0cnVzdCB0aGUgZ2xvYmFsIG9iamVjdCB3aGVuIGNhbGxlZCBub3JtYWxseVxuICAgICAgICAgICAgcmV0dXJuIGNhY2hlZENsZWFyVGltZW91dC5jYWxsKG51bGwsIG1hcmtlcik7XG4gICAgICAgIH0gY2F0Y2ggKGUpe1xuICAgICAgICAgICAgLy8gc2FtZSBhcyBhYm92ZSBidXQgd2hlbiBpdCdzIGEgdmVyc2lvbiBvZiBJLkUuIHRoYXQgbXVzdCBoYXZlIHRoZSBnbG9iYWwgb2JqZWN0IGZvciAndGhpcycsIGhvcGZ1bGx5IG91ciBjb250ZXh0IGNvcnJlY3Qgb3RoZXJ3aXNlIGl0IHdpbGwgdGhyb3cgYSBnbG9iYWwgZXJyb3IuXG4gICAgICAgICAgICAvLyBTb21lIHZlcnNpb25zIG9mIEkuRS4gaGF2ZSBkaWZmZXJlbnQgcnVsZXMgZm9yIGNsZWFyVGltZW91dCB2cyBzZXRUaW1lb3V0XG4gICAgICAgICAgICByZXR1cm4gY2FjaGVkQ2xlYXJUaW1lb3V0LmNhbGwodGhpcywgbWFya2VyKTtcbiAgICAgICAgfVxuICAgIH1cblxuXG5cbn1cbnZhciBxdWV1ZSA9IFtdO1xudmFyIGRyYWluaW5nID0gZmFsc2U7XG52YXIgY3VycmVudFF1ZXVlO1xudmFyIHF1ZXVlSW5kZXggPSAtMTtcblxuZnVuY3Rpb24gY2xlYW5VcE5leHRUaWNrKCkge1xuICAgIGlmICghZHJhaW5pbmcgfHwgIWN1cnJlbnRRdWV1ZSkge1xuICAgICAgICByZXR1cm47XG4gICAgfVxuICAgIGRyYWluaW5nID0gZmFsc2U7XG4gICAgaWYgKGN1cnJlbnRRdWV1ZS5sZW5ndGgpIHtcbiAgICAgICAgcXVldWUgPSBjdXJyZW50UXVldWUuY29uY2F0KHF1ZXVlKTtcbiAgICB9IGVsc2Uge1xuICAgICAgICBxdWV1ZUluZGV4ID0gLTE7XG4gICAgfVxuICAgIGlmIChxdWV1ZS5sZW5ndGgpIHtcbiAgICAgICAgZHJhaW5RdWV1ZSgpO1xuICAgIH1cbn1cblxuZnVuY3Rpb24gZHJhaW5RdWV1ZSgpIHtcbiAgICBpZiAoZHJhaW5pbmcpIHtcbiAgICAgICAgcmV0dXJuO1xuICAgIH1cbiAgICB2YXIgdGltZW91dCA9IHJ1blRpbWVvdXQoY2xlYW5VcE5leHRUaWNrKTtcbiAgICBkcmFpbmluZyA9IHRydWU7XG5cbiAgICB2YXIgbGVuID0gcXVldWUubGVuZ3RoO1xuICAgIHdoaWxlKGxlbikge1xuICAgICAgICBjdXJyZW50UXVldWUgPSBxdWV1ZTtcbiAgICAgICAgcXVldWUgPSBbXTtcbiAgICAgICAgd2hpbGUgKCsrcXVldWVJbmRleCA8IGxlbikge1xuICAgICAgICAgICAgaWYgKGN1cnJlbnRRdWV1ZSkge1xuICAgICAgICAgICAgICAgIGN1cnJlbnRRdWV1ZVtxdWV1ZUluZGV4XS5ydW4oKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICBxdWV1ZUluZGV4ID0gLTE7XG4gICAgICAgIGxlbiA9IHF1ZXVlLmxlbmd0aDtcbiAgICB9XG4gICAgY3VycmVudFF1ZXVlID0gbnVsbDtcbiAgICBkcmFpbmluZyA9IGZhbHNlO1xuICAgIHJ1bkNsZWFyVGltZW91dCh0aW1lb3V0KTtcbn1cblxucHJvY2Vzcy5uZXh0VGljayA9IGZ1bmN0aW9uIChmdW4pIHtcbiAgICB2YXIgYXJncyA9IG5ldyBBcnJheShhcmd1bWVudHMubGVuZ3RoIC0gMSk7XG4gICAgaWYgKGFyZ3VtZW50cy5sZW5ndGggPiAxKSB7XG4gICAgICAgIGZvciAodmFyIGkgPSAxOyBpIDwgYXJndW1lbnRzLmxlbmd0aDsgaSsrKSB7XG4gICAgICAgICAgICBhcmdzW2kgLSAxXSA9IGFyZ3VtZW50c1tpXTtcbiAgICAgICAgfVxuICAgIH1cbiAgICBxdWV1ZS5wdXNoKG5ldyBJdGVtKGZ1biwgYXJncykpO1xuICAgIGlmIChxdWV1ZS5sZW5ndGggPT09IDEgJiYgIWRyYWluaW5nKSB7XG4gICAgICAgIHJ1blRpbWVvdXQoZHJhaW5RdWV1ZSk7XG4gICAgfVxufTtcblxuLy8gdjggbGlrZXMgcHJlZGljdGlibGUgb2JqZWN0c1xuZnVuY3Rpb24gSXRlbShmdW4sIGFycmF5KSB7XG4gICAgdGhpcy5mdW4gPSBmdW47XG4gICAgdGhpcy5hcnJheSA9IGFycmF5O1xufVxuSXRlbS5wcm90b3R5cGUucnVuID0gZnVuY3Rpb24gKCkge1xuICAgIHRoaXMuZnVuLmFwcGx5KG51bGwsIHRoaXMuYXJyYXkpO1xufTtcbnByb2Nlc3MudGl0bGUgPSAnYnJvd3Nlcic7XG5wcm9jZXNzLmJyb3dzZXIgPSB0cnVlO1xucHJvY2Vzcy5lbnYgPSB7fTtcbnByb2Nlc3MuYXJndiA9IFtdO1xucHJvY2Vzcy52ZXJzaW9uID0gJyc7IC8vIGVtcHR5IHN0cmluZyB0byBhdm9pZCByZWdleHAgaXNzdWVzXG5wcm9jZXNzLnZlcnNpb25zID0ge307XG5cbmZ1bmN0aW9uIG5vb3AoKSB7fVxuXG5wcm9jZXNzLm9uID0gbm9vcDtcbnByb2Nlc3MuYWRkTGlzdGVuZXIgPSBub29wO1xucHJvY2Vzcy5vbmNlID0gbm9vcDtcbnByb2Nlc3Mub2ZmID0gbm9vcDtcbnByb2Nlc3MucmVtb3ZlTGlzdGVuZXIgPSBub29wO1xucHJvY2Vzcy5yZW1vdmVBbGxMaXN0ZW5lcnMgPSBub29wO1xucHJvY2Vzcy5lbWl0ID0gbm9vcDtcblxucHJvY2Vzcy5iaW5kaW5nID0gZnVuY3Rpb24gKG5hbWUpIHtcbiAgICB0aHJvdyBuZXcgRXJyb3IoJ3Byb2Nlc3MuYmluZGluZyBpcyBub3Qgc3VwcG9ydGVkJyk7XG59O1xuXG5wcm9jZXNzLmN3ZCA9IGZ1bmN0aW9uICgpIHsgcmV0dXJuICcvJyB9O1xucHJvY2Vzcy5jaGRpciA9IGZ1bmN0aW9uIChkaXIpIHtcbiAgICB0aHJvdyBuZXcgRXJyb3IoJ3Byb2Nlc3MuY2hkaXIgaXMgbm90IHN1cHBvcnRlZCcpO1xufTtcbnByb2Nlc3MudW1hc2sgPSBmdW5jdGlvbigpIHsgcmV0dXJuIDA7IH07XG4iLCIvKipcclxuICogV29yayB3aXRoIGRhdGEgc3RvcmVzXHJcbiAqL1xyXG5cclxuY29uc3QgREVCT1VOQ0VfVElNRSA9IDIwMDA7XHJcbmNvbnN0IERBVEFfU1RPUkVfUk9PVCA9IFwiL2FwaS9kYXRhL1wiO1xyXG5cclxuLy8gY2FjaGUgZGF0YSBzdG9yZSBpbnN0YW5jZXNcclxudmFyIHN0b3JlcyA9IHt9O1xyXG5cclxuLy8gZ2V0L2NyZWF0ZSBhIGRhdGFzdG9yZVxyXG5leHBvcnQgZnVuY3Rpb24gc3RvcmUobmFtZSkge1xyXG5cdC8vIHVzZSB0aGUgY2FjaGVkIHN0b3JlXHJcblx0aWYobmFtZSBpbiBzdG9yZXMpIHtcclxuXHRcdHJldHVybiBzdG9yZXNbbmFtZV07XHJcblx0fVxyXG5cclxuXHR2YXIgc3RvcmUgPSBuZXcgU3RvcmUobmFtZSk7XHJcblxyXG5cdC8vIGNhY2hlIHRoZSBkYXRhIHN0b3JlIGluc3RhbmNlXHJcblx0c3RvcmVzW25hbWVdID0gc3RvcmU7XHJcblxyXG5cdHJldHVybiBzdG9yZTtcclxufTtcclxuXHJcbmNsYXNzIFN0b3JlIGV4dGVuZHMgbGlmZUxpbmUuRXZlbnRFbWl0dGVyIHtcclxuXHRjb25zdHJ1Y3RvcihuYW1lKSB7XHJcblx0XHRzdXBlcigpO1xyXG5cdFx0dGhpcy5uYW1lID0gbmFtZTtcclxuXHRcdHRoaXMuX2NhY2hlID0ge307XHJcblx0XHQvLyBkb24ndCBzZW5kIGR1cGxpY2F0ZSByZXF1ZXN0c1xyXG5cdFx0dGhpcy5fcmVxdWVzdGluZyA9IFtdO1xyXG5cdH1cclxuXHJcblx0Ly8gc2V0IHRoZSBmdW5jdGlvbiB0byBkZXNlcmlhbGl6ZSBhbGwgZGF0YSBmcm9tIHRoZSBzZXJ2ZXJcclxuXHRzZXRJbml0KGZuKSB7XHJcblx0XHR0aGlzLl9kZXNlcmlhbGl6ZXIgPSBmbjtcclxuXHR9XHJcblxyXG5cdC8vIHNlbmQgYSByZXF1ZXN0IHRvIHRoZSBzZXJ2ZXJcclxuXHRfcmVxdWVzdChtZXRob2QsIHVybCwgYm9keSkge1xyXG5cdFx0dXJsID0gREFUQV9TVE9SRV9ST09UICsgdXJsO1xyXG5cclxuXHRcdC8vIGRvbid0IGR1cGxpY2F0ZSByZXF1ZXN0c1xyXG5cdFx0aWYobWV0aG9kID09IFwiZ2V0XCIpIHtcclxuXHRcdFx0Ly8gYWxyZWFkeSBtYWtpbmcgdGhpcyByZXF1ZXN0XHJcblx0XHRcdGlmKHRoaXMuX3JlcXVlc3RpbmcuaW5kZXhPZih1cmwpICE9PSAtMSkgcmV0dXJuO1xyXG5cclxuXHRcdFx0dGhpcy5fcmVxdWVzdGluZy5wdXNoKHVybCk7XHJcblx0XHR9XHJcblxyXG5cdFx0Ly8gbWFrZSB0aGUgYWN0dWFsIHJlcXVlc3RcclxuXHRcdHJldHVybiBmZXRjaCh1cmwsIHtcclxuXHRcdFx0bWV0aG9kOiBtZXRob2QsXHJcblx0XHRcdGNyZWRlbnRpYWxzOiBcImluY2x1ZGVcIixcclxuXHRcdFx0Ym9keTogYm9keSAmJiBKU09OLnN0cmluZ2lmeShib2R5KVxyXG5cdFx0fSlcclxuXHJcblx0XHQvLyBwYXJzZSB0aGUgcmVzcG9uc2VcclxuXHRcdC50aGVuKHJlcyA9PiByZXMuanNvbigpKVxyXG5cclxuXHRcdC50aGVuKHJlcyA9PiB7XHJcblx0XHRcdC8vIHJlbW92ZSB0aGUgbG9ja1xyXG5cdFx0XHRpZihtZXRob2QgPT0gXCJnZXRcIikge1xyXG5cdFx0XHRcdHZhciBpbmRleCA9IHRoaXMuX3JlcXVlc3RpbmcuaW5kZXhPZih1cmwpO1xyXG5cclxuXHRcdFx0XHRpZihpbmRleCAhPT0gLTEpIHRoaXMuX3JlcXVlc3Rpbmcuc3BsaWNlKGluZGV4LCAxKTtcclxuXHRcdFx0fVxyXG5cclxuXHRcdFx0Ly8gdXBkYXRlIHRoZSBjYWNoZSBhbmQgZW1pdCBhIGNoYW5nZVxyXG5cdFx0XHRpZihyZXMuc3RhdHVzID09IFwic3VjY2Vzc1wiICYmIG1ldGhvZCA9PSBcImdldFwiKSB7XHJcblx0XHRcdFx0Ly8gc3RvcmUgdGhlIHZhbHVlIGluIHRoZSBjYWNoZVxyXG5cdFx0XHRcdGlmKEFycmF5LmlzQXJyYXkocmVzLmRhdGEpKSB7XHJcblx0XHRcdFx0XHRyZXMuZGF0YS5mb3JFYWNoKGl0ZW0gPT4ge1xyXG5cdFx0XHRcdFx0XHQvLyBkZXNlcmlhbGl6ZSB0aGUgaXRlbVxyXG5cdFx0XHRcdFx0XHRpZih0aGlzLl9kZXNlcmlhbGl6ZXIpIHtcclxuXHRcdFx0XHRcdFx0XHRpdGVtID0gdGhpcy5fZGVzZXJpYWxpemVyKGl0ZW0pIHx8IGl0ZW07XHJcblx0XHRcdFx0XHRcdH1cclxuXHJcblx0XHRcdFx0XHRcdC8vIHN0b3JlIHRlaCBpdGVtXHJcblx0XHRcdFx0XHRcdHRoaXMuX2NhY2hlW2l0ZW0uaWRdID0gaXRlbVxyXG5cdFx0XHRcdFx0fSk7XHJcblx0XHRcdFx0fVxyXG5cdFx0XHRcdGVsc2Uge1xyXG5cdFx0XHRcdFx0bGV0IGl0ZW0gPSByZXMuZGF0YTtcclxuXHJcblx0XHRcdFx0XHQvLyBkZXNlcmlhbGl6ZSB0aGUgaXRlbVxyXG5cdFx0XHRcdFx0aWYodGhpcy5fZGVzZXJpYWxpemVyKSB7XHJcblx0XHRcdFx0XHRcdGl0ZW0gPSB0aGlzLl9kZXNlcmlhbGl6ZXIoaXRlbSkgfHwgaXRlbTtcclxuXHRcdFx0XHRcdH1cclxuXHJcblx0XHRcdFx0XHR0aGlzLl9jYWNoZVtyZXMuZGF0YS5pZF0gPSBpdGVtO1xyXG5cdFx0XHRcdH1cclxuXHJcblx0XHRcdFx0Ly8gZW1pdCBhIGNoYW5nZVxyXG5cdFx0XHRcdHRoaXMuZW1pdChcImNoYW5nZVwiKTtcclxuXHRcdFx0fVxyXG5cclxuXHRcdFx0Ly8gdGhyb3cgdGhlIGVycm9yXHJcblx0XHRcdGlmKHJlcy5zdGF0dXMgPT0gXCJlcnJvclwiKSB7XHJcblx0XHRcdFx0dGhyb3cgbmV3IEVycm9yKHJlcy5kYXRhKTtcclxuXHRcdFx0fVxyXG5cclxuXHRcdFx0Ly8gdGhlIHVzZXIgaXMgbm90IGxvZ2dlZCBpblxyXG5cdFx0XHRpZihyZXMuc3RhdHVzID09IFwiZmFpbFwiICYmIHJlcy5kYXRhLnJlYXNvbiA9PSBcImxvZ2dlZC1vdXRcIikge1xyXG5cdFx0XHRcdGxpZmVMaW5lLm5hdi5uYXZpZ2F0ZShcIi9sb2dpblwiKTtcclxuXHRcdFx0fVxyXG5cdFx0fSk7XHJcblx0fVxyXG5cclxuXHQvLyBnZXQgYWxsIHRoZSBpdGVtcyBhbmQgbGlzdGVuIGZvciBhbnkgY2hhbmdlc1xyXG5cdGdldEFsbChmbikge1xyXG5cdFx0Ly8gZ28gdG8gdGhlIGNhY2hlIGZpcnN0XHJcblx0XHRmbihhcnJheUZyb21PYmplY3QodGhpcy5fY2FjaGUpKTtcclxuXHJcblx0XHQvLyBzZW5kIGEgcmVxdWVzdCB0byB0aGUgc2VydmVyIGZvciB0aGUgaXRlbXNcclxuXHRcdHRoaXMuX3JlcXVlc3QoXCJnZXRcIiwgdGhpcy5uYW1lKTtcclxuXHJcblx0XHQvLyBsaXN0ZW4gZm9yIGFueSBjaGFuZ2VzXHJcblx0XHRyZXR1cm4gdGhpcy5vbihcImNoYW5nZVwiLCAoKSA9PiB7XHJcblx0XHRcdC8vIHRoZSBjaGFuZ2VzIHdpbGwgd2UgaW4gdGhlIGNhY2hlXHJcblx0XHRcdGZuKGFycmF5RnJvbU9iamVjdCh0aGlzLl9jYWNoZSkpO1xyXG5cdFx0fSk7XHJcblx0fVxyXG5cclxuXHQvLyBnZXQgYSBzaW5nbGUgaXRlbSBhbmQgbGlzdGVuIGZvciBjaGFuZ2VzXHJcblx0Z2V0KGlkLCBmbikge1xyXG5cdFx0Ly8gZ28gdG8gdGhlIGNhY2hlIGZpcnN0XHJcblx0XHRmbih0aGlzLl9jYWNoZVtpZF0pO1xyXG5cclxuXHRcdC8vIHNlbmQgYSByZXF1ZXN0IHRvIHRoZSBzZXJ2ZXIgZm9yIHRoZSBpdGVtXHJcblx0XHR0aGlzLl9yZXF1ZXN0KFwiZ2V0XCIsIHRoaXMubmFtZSArIFwiL1wiICsgaWQpO1xyXG5cclxuXHRcdC8vIGxpc3RlbiBmb3IgYW55IGNoYW5nZXNcclxuXHRcdHJldHVybiB0aGlzLm9uKFwiY2hhbmdlXCIsICgpID0+IHtcclxuXHRcdFx0Zm4odGhpcy5fY2FjaGVbaWRdKTtcclxuXHRcdH0pO1xyXG5cdH1cclxuXHJcblx0Ly8gc3RvcmUgYSB2YWx1ZSBpbiB0aGUgc3RvcmVcclxuXHRzZXQodmFsdWUsIHNraXBzKSB7XHJcblx0XHQvLyBzdG9yZSB0aGUgdmFsdWUgaW4gdGhlIGNhY2hlXHJcblx0XHR0aGlzLl9jYWNoZVt2YWx1ZS5pZF0gPSB2YWx1ZTtcclxuXHJcblx0XHQvLyBzYXZlIHRoZSBpdGVtXHJcblx0XHRkZWJvdW5jZSh2YWx1ZS5pZCwgKCkgPT4ge1xyXG5cdFx0XHR0aGlzLl9yZXF1ZXN0KFwicHV0XCIsIGAke3RoaXMubmFtZX0vJHt2YWx1ZS5pZH1gLCB2YWx1ZSk7XHJcblx0XHR9KTtcclxuXHJcblx0XHQvLyBlbWl0IGEgY2hhbmdlXHJcblx0XHR0aGlzLnBhcnRpYWxFbWl0KFwiY2hhbmdlXCIsIHNraXBzKTtcclxuXHR9XHJcblxyXG5cdC8vIHJlbW92ZSBhIHZhbHVlIGZyb20gdGhlIHN0b3JlXHJcblx0cmVtb3ZlKGlkLCBza2lwcykge1xyXG5cdFx0Ly8gcmVtb3ZlIHRoZSB2YWx1ZSBmcm9tIHRoZSBjYWNoZVxyXG5cdFx0ZGVsZXRlIHRoaXMuX2NhY2hlW2lkXTtcclxuXHJcblx0XHQvLyBzZW5kIHRoZSBkZWxldGUgcmVxdWVzdFxyXG5cdFx0dGhpcy5fcmVxdWVzdChcImRlbGV0ZVwiLCBgJHt0aGlzLm5hbWV9LyR7aWR9YCk7XHJcblxyXG5cdFx0Ly8gZW1pdCBhIGNoYW5nZVxyXG5cdFx0dGhpcy5wYXJ0aWFsRW1pdChcImNoYW5nZVwiLCBza2lwcyk7XHJcblx0fVxyXG59XHJcblxyXG4vLyBnZXQgYW4gYXJyYXkgZnJvbSBhbiBvYmplY3RcclxudmFyIGFycmF5RnJvbU9iamVjdCA9IGZ1bmN0aW9uKG9iaikge1xyXG5cdHJldHVybiBPYmplY3QuZ2V0T3duUHJvcGVydHlOYW1lcyhvYmopXHJcblx0XHQubWFwKG5hbWUgPT4gb2JqW25hbWVdKTtcclxufTtcclxuXHJcbi8vIGRvbid0IGNhbGwgYSBmdW5jdGlvbiB0b28gb2Z0ZW5cclxudmFyIGRlYm91bmNlVGltZXJzID0ge307XHJcblxyXG52YXIgZGVib3VuY2UgPSAoaWQsIGZuKSA9PiB7XHJcblx0Ly8gY2FuY2VsIHRoZSBwcmV2aW91cyBkZWxheVxyXG5cdGNsZWFyVGltZW91dChkZWJvdW5jZVRpbWVyc1tpZF0pO1xyXG5cdC8vIHN0YXJ0IGEgbmV3IGRlbGF5XHJcblx0ZGVib3VuY2VUaW1lcnNbaWRdID0gc2V0VGltZW91dChmbiwgREVCT1VOQ0VfVElNRSk7XHJcbn07XHJcbiIsIi8qKlxyXG4gKiBCcm93c2VyIHNwZWNpZmljIGdsb2JhbHNcclxuICovXHJcblxyXG5saWZlTGluZS5tYWtlRG9tID0gcmVxdWlyZShcIi4vdXRpbC9kb20tbWFrZXJcIikuZGVmYXVsdDtcclxuXHJcbi8vIGFkZCBhIGZ1bmN0aW9uIGZvciBhZGRpbmcgYWN0aW9uc1xyXG5saWZlTGluZS5hZGRBY3Rpb24gPSBmdW5jdGlvbihuYW1lLCBmbikge1xyXG5cdC8vIGF0dGFjaCB0aGUgY2FsbGJhY2tcclxuXHR2YXIgbGlzdGVuZXIgPSBsaWZlTGluZS5vbihcImFjdGlvbi1leGVjLVwiICsgbmFtZSwgZm4pO1xyXG5cclxuXHQvLyBpbmZvcm0gYW55IGFjdGlvbiBwcm92aWRlcnNcclxuXHRsaWZlTGluZS5lbWl0KFwiYWN0aW9uLWNyZWF0ZVwiLCBuYW1lKTtcclxuXHJcblx0Ly8gYWxsIGFjdGlvbnMgcmVtb3ZlZFxyXG5cdHZhciByZW1vdmVBbGwgPSBsaWZlTGluZS5vbihcImFjdGlvbi1yZW1vdmUtYWxsXCIsICgpID0+IHtcclxuXHRcdC8vIHJlbW92ZSB0aGUgYWN0aW9uIGxpc3RlbmVyXHJcblx0XHRsaXN0ZW5lci51bnN1YnNjcmliZSgpO1xyXG5cdFx0cmVtb3ZlQWxsLnVuc3Vic2NyaWJlKCk7XHJcblx0fSk7XHJcblxyXG5cdHJldHVybiB7XHJcblx0XHR1bnN1YnNjcmliZSgpIHtcclxuXHRcdFx0Ly8gcmVtb3ZlIHRoZSBhY3Rpb24gbGlzdGVuZXJcclxuXHRcdFx0bGlzdGVuZXIudW5zdWJzY3JpYmUoKTtcclxuXHRcdFx0cmVtb3ZlQWxsLnVuc3Vic2NyaWJlKCk7XHJcblxyXG5cdFx0XHQvLyBpbmZvcm0gYW55IGFjdGlvbiBwcm92aWRlcnNcclxuXHRcdFx0bGlmZUxpbmUuZW1pdChcImFjdGlvbi1yZW1vdmVcIiwgbmFtZSk7XHJcblx0XHR9XHJcblx0fTtcclxufTtcclxuIiwiLy8gY3JlYXRlIHRoZSBnbG9iYWwgb2JqZWN0XHJcbmltcG9ydCBcIi4uL2NvbW1vbi9nbG9iYWxcIjtcclxuaW1wb3J0IFwiLi9nbG9iYWxcIjtcclxuXHJcbi8vIGxvYWQgYWxsIHRoZSB3aWRnZXRzXHJcbmltcG9ydCBcIi4vd2lkZ2V0cy9zaWRlYmFyXCI7XHJcbmltcG9ydCBcIi4vd2lkZ2V0cy9jb250ZW50XCI7XHJcbmltcG9ydCBcIi4vd2lkZ2V0cy9saW5rXCI7XHJcbmltcG9ydCBcIi4vd2lkZ2V0cy9saXN0XCI7XHJcbmltcG9ydCBcIi4vd2lkZ2V0cy9pbnB1dFwiO1xyXG5pbXBvcnQgXCIuL3dpZGdldHMvdG9nZ2xlLWJ0bnNcIjtcclxuXHJcbi8vIGxvYWQgYWxsIHRoZSB2aWV3c1xyXG5pbXBvcnQge2luaXROYXZCYXJ9IGZyb20gXCIuL3ZpZXdzL2xpc3RzXCI7XHJcbmltcG9ydCBcIi4vdmlld3MvaXRlbVwiO1xyXG5pbXBvcnQgXCIuL3ZpZXdzL2VkaXRcIjtcclxuaW1wb3J0IFwiLi92aWV3cy9sb2dpblwiO1xyXG5pbXBvcnQgXCIuL3ZpZXdzL2FjY291bnRcIjtcclxuaW1wb3J0IFwiLi92aWV3cy91c2Vyc1wiO1xyXG5cclxuLy8gc2V0IHVwIHRoZSBkYXRhIHN0b3JlXHJcbmltcG9ydCB7c3RvcmV9IGZyb20gXCIuL2RhdGEtc3RvcmVcIjtcclxuXHJcbnN0b3JlKFwiYXNzaWdubWVudHNcIikuc2V0SW5pdChmdW5jdGlvbihpdGVtKSB7XHJcblx0Ly8gcGFyc2UgdGhlIGRhdGVcclxuXHRpZih0eXBlb2YgaXRlbS5kYXRlID09IFwic3RyaW5nXCIpIHtcclxuXHRcdGl0ZW0uZGF0ZSA9IG5ldyBEYXRlKGl0ZW0uZGF0ZSk7XHJcblx0fVxyXG59KTtcclxuXHJcbi8vIGluc3RhbnRpYXRlIHRoZSBkb21cclxubGlmZUxpbmUubWFrZURvbSh7XHJcblx0cGFyZW50OiBkb2N1bWVudC5ib2R5LFxyXG5cdGdyb3VwOiBbXHJcblx0XHR7IHdpZGdldDogXCJzaWRlYmFyXCIgfSxcclxuXHRcdHsgd2lkZ2V0OiBcImNvbnRlbnRcIiB9XHJcblx0XVxyXG59KTtcclxuXHJcbi8vIGFkZCBsaXN0IHZpZXdzIHRvIHRoZSBuYXZiYXJcclxuaW5pdE5hdkJhcigpO1xyXG5cclxuLy8gY3JlYXRlIGEgbmV3IGFzc2lnbm1lbnRcclxubGlmZUxpbmUuYWRkQ29tbWFuZChcIk5ldyBhc3NpZ25tZW50XCIsICgpID0+IHtcclxuXHR2YXIgaWQgPSBNYXRoLmZsb29yKE1hdGgucmFuZG9tKCkgKiAxMDAwMDAwMDApO1xyXG5cclxuXHRsaWZlTGluZS5uYXYubmF2aWdhdGUoXCIvZWRpdC9cIiArIGlkKTtcclxufSk7XHJcblxyXG4vLyBjcmVhdGUgdGhlIGxvZ291dCBidXR0b25cclxubGlmZUxpbmUuYWRkTmF2Q29tbWFuZChcIkFjY291bnRcIiwgXCIvYWNjb3VudFwiKTtcclxuIiwiLyoqXHJcbiAqIERhdGUgcmVsYXRlZCB0b29sc1xyXG4gKi9cclxuXHJcbiAvLyBjaGVjayBpZiB0aGUgZGF0ZXMgYXJlIHRoZSBzYW1lIGRheVxyXG4gZXhwb3J0IGZ1bmN0aW9uIGlzU2FtZURhdGUoZGF0ZTEsIGRhdGUyKSB7XHJcbiBcdHJldHVybiBkYXRlMS5nZXRGdWxsWWVhcigpID09IGRhdGUyLmdldEZ1bGxZZWFyKCkgJiZcclxuIFx0XHRkYXRlMS5nZXRNb250aCgpID09IGRhdGUyLmdldE1vbnRoKCkgJiZcclxuIFx0XHRkYXRlMS5nZXREYXRlKCkgPT0gZGF0ZTIuZ2V0RGF0ZSgpO1xyXG4gfTtcclxuXHJcbiAvLyBjaGVjayBpZiBhIGRhdGUgaXMgbGVzcyB0aGFuIGFub3RoZXJcclxuIGV4cG9ydCBmdW5jdGlvbiBpc1Nvb25lckRhdGUoZGF0ZTEsIGRhdGUyKSB7XHJcbiBcdHJldHVybiBkYXRlMS5nZXRGdWxsWWVhcigpIDw9IGRhdGUyLmdldEZ1bGxZZWFyKCkgJiZcclxuIFx0XHRkYXRlMS5nZXRNb250aCgpIDw9IGRhdGUyLmdldE1vbnRoKCkgJiZcclxuIFx0XHRkYXRlMS5nZXREYXRlKCkgPCBkYXRlMi5nZXREYXRlKCk7XHJcbiB9O1xyXG5cclxuIC8vIGdldCB0aGUgZGF0ZSBkYXlzIGZyb20gbm93XHJcbiBleHBvcnQgZnVuY3Rpb24gZGF5c0Zyb21Ob3coZGF5cykge1xyXG4gXHR2YXIgZGF0ZSA9IG5ldyBEYXRlKCk7XHJcblxyXG4gXHQvLyBhZHZhbmNlIHRoZSBkYXRlXHJcbiBcdGRhdGUuc2V0RGF0ZShkYXRlLmdldERhdGUoKSArIGRheXMpO1xyXG5cclxuIFx0cmV0dXJuIGRhdGU7XHJcbiB9O1xyXG5cclxuIGNvbnN0IFNUUklOR19EQVlTID0gW1wiU3VuZGF5XCIsIFwiTW9uZGF5XCIsIFwiVHVlc2RheVwiLCBcIldlZGVuc2RheVwiLCBcIlRodXJzZGF5XCIsIFwiRnJpZGF5XCIsIFwiU2F0dXJkYXlcIl07XHJcblxyXG4gLy8gY29udmVydCBhIGRhdGUgdG8gYSBzdHJpbmdcclxuIGV4cG9ydCBmdW5jdGlvbiBzdHJpbmdpZnlEYXRlKGRhdGUsIG9wdHMgPSB7fSkge1xyXG5cdCB2YXIgc3RyRGF0ZSwgc3RyVGltZSA9IFwiXCI7XHJcblxyXG4gICAgIC8vIGNoZWNrIGlmIHRoZSBkYXRlIGlzIGJlZm9yZSB0b2RheVxyXG4gICAgIHZhciBiZWZvcmVOb3cgPSBkYXRlLmdldFRpbWUoKSA8IERhdGUubm93KCk7XHJcblxyXG4gXHQvLyBUb2RheVxyXG4gXHRpZihpc1NhbWVEYXRlKGRhdGUsIG5ldyBEYXRlKCkpKVxyXG4gXHRcdHN0ckRhdGUgPSBcIlRvZGF5XCI7XHJcblxyXG4gXHQvLyBUb21vcnJvd1xyXG4gXHRlbHNlIGlmKGlzU2FtZURhdGUoZGF0ZSwgZGF5c0Zyb21Ob3coMSkpICYmICFiZWZvcmVOb3cpXHJcbiBcdFx0c3RyRGF0ZSA9IFwiVG9tb3Jyb3dcIjtcclxuXHJcbiBcdC8vIGRheSBvZiB0aGUgd2VlayAodGhpcyB3ZWVrKVxyXG4gXHRlbHNlIGlmKGlzU29vbmVyRGF0ZShkYXRlLCBkYXlzRnJvbU5vdyg3KSkgJiYgIWJlZm9yZU5vdylcclxuIFx0XHRzdHJEYXRlID0gU1RSSU5HX0RBWVNbZGF0ZS5nZXREYXkoKV07XHJcblxyXG4gXHQvLyBwcmludCB0aGUgZGF0ZVxyXG4gXHRlbHNlXHJcblx0IFx0c3RyRGF0ZSA9IGAke1NUUklOR19EQVlTW2RhdGUuZ2V0RGF5KCldfSAke2RhdGUuZ2V0TW9udGgoKSArIDF9LyR7ZGF0ZS5nZXREYXRlKCl9YDtcclxuXHJcblx0Ly8gYWRkIHRoZSB0aW1lIG9uXHJcblx0aWYob3B0cy5pbmNsdWRlVGltZSAmJiAhaXNTa2lwVGltZShkYXRlLCBvcHRzLnNraXBUaW1lcykpIHtcclxuXHRcdHJldHVybiBzdHJEYXRlICsgXCIsIFwiICsgc3RyaW5naWZ5VGltZShkYXRlKTtcclxuXHR9XHJcblxyXG5cdHJldHVybiBzdHJEYXRlO1xyXG4gfTtcclxuXHJcbi8vIGNoZWNrIGlmIHRoaXMgaXMgb25lIG9mIHRoZSBnaXZlbiBza2lwIHRpbWVzXHJcbmV4cG9ydCBmdW5jdGlvbiBpc1NraXBUaW1lKGRhdGUsIHNraXBzID0gW10pIHtcclxuXHRyZXR1cm4gc2tpcHMuZmluZChza2lwID0+IHtcclxuXHRcdHJldHVybiBza2lwLmhvdXIgPT09IGRhdGUuZ2V0SG91cnMoKSAmJiBza2lwLm1pbnV0ZSA9PT0gZGF0ZS5nZXRNaW51dGVzKCk7XHJcblx0fSk7XHJcbn07XHJcblxyXG4vLyBjb252ZXJ0IGEgdGltZSB0byBhIHN0cmluZ1xyXG5leHBvcnQgZnVuY3Rpb24gc3RyaW5naWZ5VGltZShkYXRlKSB7XHJcblx0dmFyIGhvdXIgPSBkYXRlLmdldEhvdXJzKCk7XHJcblxyXG5cdC8vIGdldCB0aGUgYW0vcG0gdGltZVxyXG5cdHZhciBpc0FtID0gaG91ciA8IDEyO1xyXG5cclxuXHQvLyBtaWRuaWdodFxyXG5cdGlmKGhvdXIgPT09IDApIGhvdXIgPSAxMjtcclxuXHQvLyBhZnRlciBub29uXHJcblx0aWYoaG91ciA+IDEyKSBob3VyID0gaG91ciAtIDEyO1xyXG5cclxuXHR2YXIgbWludXRlID0gZGF0ZS5nZXRNaW51dGVzKCk7XHJcblxyXG5cdC8vIGFkZCBhIGxlYWRpbmcgMFxyXG5cdGlmKG1pbnV0ZSA8IDEwKSBtaW51dGUgPSBcIjBcIiArIG1pbnV0ZTtcclxuXHJcblx0cmV0dXJuIGhvdXIgKyBcIjpcIiArIG1pbnV0ZSArIChpc0FtID8gXCJhbVwiIDogXCJwbVwiKTtcclxufVxyXG4iLCIvKipcclxuICogQSBoZWxwZXIgZm9yIGJ1aWxkaW5nIGRvbSBub2Rlc1xyXG4gKi9cclxuXHJcbmNvbnN0IFNWR19FTEVNRU5UUyA9IFtcInN2Z1wiLCBcImxpbmVcIl07XHJcbmNvbnN0IFNWR19OQU1FU1BBQ0UgPSBcImh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnXCI7XHJcblxyXG4vLyBidWlsZCBhIHNpbmdsZSBkb20gbm9kZVxyXG52YXIgbWFrZURvbSA9IGZ1bmN0aW9uKG9wdHMgPSB7fSkge1xyXG5cdC8vIGdldCBvciBjcmVhdGUgdGhlIG5hbWUgbWFwcGluZ1xyXG5cdHZhciBtYXBwZWQgPSBvcHRzLm1hcHBlZCB8fCB7fTtcclxuXHJcblx0dmFyICRlbDtcclxuXHJcblx0Ly8gdGhlIGVsZW1lbnQgaXMgcGFydCBvZiB0aGUgc3ZnIG5hbWVzcGFjZVxyXG5cdGlmKFNWR19FTEVNRU5UUy5pbmRleE9mKG9wdHMudGFnKSAhPT0gLTEpIHtcclxuXHRcdCRlbCA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnROUyhTVkdfTkFNRVNQQUNFLCBvcHRzLnRhZyk7XHJcblx0fVxyXG5cdC8vIGEgcGxhaW4gZWxlbWVudFxyXG5cdGVsc2Uge1xyXG5cdFx0JGVsID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudChvcHRzLnRhZyB8fCBcImRpdlwiKTtcclxuXHR9XHJcblxyXG5cdC8vIHNldCB0aGUgY2xhc3Nlc1xyXG5cdGlmKG9wdHMuY2xhc3Nlcykge1xyXG5cdFx0JGVsLnNldEF0dHJpYnV0ZShcImNsYXNzXCIsIHR5cGVvZiBvcHRzLmNsYXNzZXMgPT0gXCJzdHJpbmdcIiA/IG9wdHMuY2xhc3NlcyA6IG9wdHMuY2xhc3Nlcy5qb2luKFwiIFwiKSk7XHJcblx0fVxyXG5cclxuXHQvLyBhdHRhY2ggdGhlIGF0dHJpYnV0ZXNcclxuXHRpZihvcHRzLmF0dHJzKSB7XHJcblx0XHRPYmplY3QuZ2V0T3duUHJvcGVydHlOYW1lcyhvcHRzLmF0dHJzKVxyXG5cclxuXHRcdC5mb3JFYWNoKGF0dHIgPT4gJGVsLnNldEF0dHJpYnV0ZShhdHRyLCBvcHRzLmF0dHJzW2F0dHJdKSk7XHJcblx0fVxyXG5cclxuXHQvLyBzZXQgdGhlIHRleHQgY29udGVudFxyXG5cdGlmKG9wdHMudGV4dCkge1xyXG5cdFx0JGVsLmlubmVyVGV4dCA9IG9wdHMudGV4dDtcclxuXHR9XHJcblxyXG5cdC8vIGF0dGFjaCB0aGUgbm9kZSB0byBpdHMgcGFyZW50XHJcblx0aWYob3B0cy5wYXJlbnQpIHtcclxuXHRcdG9wdHMucGFyZW50Lmluc2VydEJlZm9yZSgkZWwsIG9wdHMuYmVmb3JlKTtcclxuXHR9XHJcblxyXG5cdC8vIGFkZCBldmVudCBsaXN0ZW5lcnNcclxuXHRpZihvcHRzLm9uKSB7XHJcblx0XHRmb3IobGV0IG5hbWUgb2YgT2JqZWN0LmdldE93blByb3BlcnR5TmFtZXMob3B0cy5vbikpIHtcclxuXHRcdFx0JGVsLmFkZEV2ZW50TGlzdGVuZXIobmFtZSwgb3B0cy5vbltuYW1lXSk7XHJcblxyXG5cdFx0XHQvLyBhdHRhY2ggdGhlIGRvbSB0byBhIGRpc3Bvc2FibGVcclxuXHRcdFx0aWYob3B0cy5kaXNwKSB7XHJcblx0XHRcdFx0b3B0cy5kaXNwLmFkZCh7XHJcblx0XHRcdFx0XHR1bnN1YnNjcmliZTogKCkgPT4gJGVsLnJlbW92ZUV2ZW50TGlzdGVuZXIobmFtZSwgb3B0cy5vbltuYW1lXSlcclxuXHRcdFx0XHR9KTtcclxuXHRcdFx0fVxyXG5cdFx0fVxyXG5cdH1cclxuXHJcblx0Ly8gc2V0IHRoZSB2YWx1ZSBvZiBhbiBpbnB1dCBlbGVtZW50XHJcblx0aWYob3B0cy52YWx1ZSkge1xyXG5cdFx0JGVsLnZhbHVlID0gb3B0cy52YWx1ZTtcclxuXHR9XHJcblxyXG5cdC8vIGFkZCB0aGUgbmFtZSBtYXBwaW5nXHJcblx0aWYob3B0cy5uYW1lKSB7XHJcblx0XHRtYXBwZWRbb3B0cy5uYW1lXSA9ICRlbDtcclxuXHR9XHJcblxyXG5cdC8vIGNyZWF0ZSB0aGUgY2hpbGQgZG9tIG5vZGVzXHJcblx0aWYob3B0cy5jaGlsZHJlbikge1xyXG5cdFx0Zm9yKGxldCBjaGlsZCBvZiBvcHRzLmNoaWxkcmVuKSB7XHJcblx0XHRcdC8vIG1ha2UgYW4gYXJyYXkgaW50byBhIGdyb3VwIE9iamVjdFxyXG5cdFx0XHRpZihBcnJheS5pc0FycmF5KGNoaWxkKSkge1xyXG5cdFx0XHRcdGNoaWxkID0ge1xyXG5cdFx0XHRcdFx0Z3JvdXA6IGNoaWxkXHJcblx0XHRcdFx0fTtcclxuXHRcdFx0fVxyXG5cclxuXHRcdFx0Ly8gYXR0YWNoIGluZm9ybWF0aW9uIGZvciB0aGUgZ3JvdXBcclxuXHRcdFx0Y2hpbGQucGFyZW50ID0gJGVsO1xyXG5cdFx0XHRjaGlsZC5kaXNwID0gb3B0cy5kaXNwO1xyXG5cdFx0XHRjaGlsZC5tYXBwZWQgPSBtYXBwZWQ7XHJcblxyXG5cdFx0XHQvLyBidWlsZCB0aGUgbm9kZSBvciBncm91cFxyXG5cdFx0XHRtYWtlKGNoaWxkKTtcclxuXHRcdH1cclxuXHR9XHJcblxyXG5cdHJldHVybiBtYXBwZWQ7XHJcbn1cclxuXHJcbi8vIGJ1aWxkIGEgZ3JvdXAgb2YgZG9tIG5vZGVzXHJcbnZhciBtYWtlR3JvdXAgPSBmdW5jdGlvbihncm91cCkge1xyXG5cdC8vIHNob3J0aGFuZCBmb3IgYSBncm91cHNcclxuXHRpZihBcnJheS5pc0FycmF5KGdyb3VwKSkge1xyXG5cdFx0Z3JvdXAgPSB7XHJcblx0XHRcdGNoaWxkcmVuOiBncm91cFxyXG5cdFx0fTtcclxuXHR9XHJcblxyXG5cdC8vIGdldCBvciBjcmVhdGUgdGhlIG5hbWUgbWFwcGluZ1xyXG5cdHZhciBtYXBwZWQgPSB7fTtcclxuXHJcblx0Zm9yKGxldCBub2RlIG9mIGdyb3VwLmdyb3VwKSB7XHJcblx0XHQvLyBjb3B5IG92ZXIgcHJvcGVydGllcyBmcm9tIHRoZSBncm91cFxyXG5cdFx0bm9kZS5wYXJlbnQgfHwgKG5vZGUucGFyZW50ID0gZ3JvdXAucGFyZW50KTtcclxuXHRcdG5vZGUuZGlzcCB8fCAobm9kZS5kaXNwID0gZ3JvdXAuZGlzcCk7XHJcblx0XHRub2RlLm1hcHBlZCA9IG1hcHBlZDtcclxuXHJcblx0XHQvLyBtYWtlIHRoZSBkb21cclxuXHRcdG1ha2Uobm9kZSk7XHJcblx0fVxyXG5cclxuXHQvLyBjYWxsIHRoZSBjYWxsYmFjayB3aXRoIHRoZSBtYXBwZWQgbmFtZXNcclxuXHRpZihncm91cC5iaW5kKSB7XHJcblx0XHR2YXIgc3Vic2NyaXB0aW9uID0gZ3JvdXAuYmluZChtYXBwZWQpO1xyXG5cclxuXHRcdC8vIGlmIHRoZSByZXR1cm4gYSBzdWJzY3JpcHRpb24gYXR0YWNoIGl0IHRvIHRoZSBkaXNwb3NhYmxlXHJcblx0XHRpZihzdWJzY3JpcHRpb24gJiYgZ3JvdXAuZGlzcCkge1xyXG5cdFx0XHRncm91cC5kaXNwLmFkZChzdWJzY3JpcHRpb24pO1xyXG5cdFx0fVxyXG5cdH1cclxuXHJcblx0cmV0dXJuIG1hcHBlZDtcclxufTtcclxuXHJcbi8vIGEgY29sbGVjdGlvbiBvZiB3aWRnZXRzXHJcbnZhciB3aWRnZXRzID0ge307XHJcblxyXG5leHBvcnQgZGVmYXVsdCBmdW5jdGlvbiBtYWtlKG9wdHMpIHtcclxuXHQvLyBoYW5kbGUgYSBncm91cFxyXG5cdGlmKEFycmF5LmlzQXJyYXkob3B0cykgfHwgb3B0cy5ncm91cCkge1xyXG5cdFx0cmV0dXJuIG1ha2VHcm91cChvcHRzKTtcclxuXHR9XHJcblx0Ly8gbWFrZSBhIHdpZGdldFxyXG5cdGVsc2UgaWYob3B0cy53aWRnZXQpIHtcclxuXHRcdHZhciB3aWRnZXQgPSB3aWRnZXRzW29wdHMud2lkZ2V0XTtcclxuXHJcblx0XHQvLyBub3QgZGVmaW5lZFxyXG5cdFx0aWYoIXdpZGdldCkge1xyXG5cdFx0XHR0aHJvdyBuZXcgRXJyb3IoYFdpZGdldCAnJHtvcHRzLndpZGdldH0nIGlzIG5vdCBkZWZpbmVkIG1ha2Ugc3VyZSBpdHMgYmVlbiBpbXBvcnRlZGApO1xyXG5cdFx0fVxyXG5cclxuXHRcdC8vIGdlbmVyYXRlIHRoZSB3aWRnZXQgY29udGVudFxyXG5cdFx0dmFyIGJ1aWx0ID0gd2lkZ2V0Lm1ha2Uob3B0cyk7XHJcblxyXG5cdFx0cmV0dXJuIG1ha2VHcm91cCh7XHJcblx0XHRcdHBhcmVudDogb3B0cy5wYXJlbnQsXHJcblx0XHRcdGRpc3A6IG9wdHMuZGlzcCxcclxuXHRcdFx0Z3JvdXA6IEFycmF5LmlzQXJyYXkoYnVpbHQpID8gYnVpbHQgOiBbYnVpbHRdLFxyXG5cdFx0XHRiaW5kOiB3aWRnZXQuYmluZCAmJiB3aWRnZXQuYmluZC5iaW5kKHdpZGdldCwgb3B0cylcclxuXHRcdH0pO1xyXG5cdH1cclxuXHQvLyBtYWtlIGEgc2luZ2xlIG5vZGVcclxuXHRlbHNlIHtcclxuXHRcdHJldHVybiBtYWtlRG9tKG9wdHMpO1xyXG5cdH1cclxufTtcclxuXHJcbi8vIHJlZ2lzdGVyIGEgd2lkZ2V0XHJcbm1ha2UucmVnaXN0ZXIgPSBmdW5jdGlvbihuYW1lLCB3aWRnZXQpIHtcclxuXHR3aWRnZXRzW25hbWVdID0gd2lkZ2V0O1xyXG59O1xyXG4iLCIvKipcclxuICogQSB2aWV3IGZvciBhY2Nlc3NpbmcvbW9kaWZ5aW5nIGluZm9ybWF0aW9uIGFib3V0IHRoZSBjdXJyZW50IHVzZXJcclxuICovXHJcblxyXG5saWZlTGluZS5uYXYucmVnaXN0ZXIoe1xyXG5cdG1hdGNoZXI6IC9eKD86XFwvdXNlclxcLyguKz8pfFxcL2FjY291bnQpJC8sXHJcblxyXG5cdG1ha2Uoe3NldFRpdGxlLCBjb250ZW50LCBtYXRjaH0pIHtcclxuXHRcdHNldFRpdGxlKFwiQWNjb3VudFwiKTtcclxuXHJcblx0XHR2YXIgdXJsID0gXCIvYXBpL2F1dGgvaW5mby9nZXRcIjtcclxuXHJcblx0XHQvLyBhZGQgdGhlIHVzZXJuYW1lIGlmIG9uZSBpcyBnaXZlblxyXG5cdFx0aWYobWF0Y2hbMV0pIHVybCArPSBgP3VzZXJuYW1lPSR7bWF0Y2hbMV19YDtcclxuXHJcblx0XHQvLyBsb2FkIHRoZSB1c2VyIGRhdGFcclxuXHRcdGZldGNoKHVybCwgeyBjcmVkZW50aWFsczogXCJpbmNsdWRlXCIgfSlcclxuXHJcblx0XHQudGhlbihyZXMgPT4gcmVzLmpzb24oKSlcclxuXHJcblx0XHQudGhlbihyZXMgPT4ge1xyXG5cdFx0XHQvLyBubyBzdWNoIHVzZXIgb3IgYWNjZXNzIGlzIGRlbmllZFxyXG5cdFx0XHRpZihyZXMuc3RhdHVzID09IFwiZmFpbFwiKSB7XHJcblx0XHRcdFx0bGlmZUxpbmUubWFrZURvbSh7XHJcblx0XHRcdFx0XHRwYXJlbnQ6IGNvbnRlbnQsXHJcblx0XHRcdFx0XHRjbGFzc2VzOiBcImNvbnRlbnQtcGFkZGVkXCIsXHJcblx0XHRcdFx0XHR0ZXh0OiBcIkNvdWxkIG5vdCBhY2Nlc3MgdGhlIHVzZXIgeW91IHdlcmUgbG9va2luZyBmb3JcIlxyXG5cdFx0XHRcdH0pO1xyXG5cclxuXHRcdFx0XHRyZXR1cm47XHJcblx0XHRcdH1cclxuXHJcblx0XHRcdHZhciB1c2VyID0gcmVzLmRhdGE7XHJcblxyXG5cdFx0XHQvLyBnZW5lcmF0ZSB0aGUgcGFnZVxyXG5cdFx0XHR2YXIgY2hpbGRyZW4gPSBbXTtcclxuXHJcblx0XHRcdGNoaWxkcmVuLnB1c2goe1xyXG5cdFx0XHRcdHRhZzogXCJoMlwiLFxyXG5cdFx0XHRcdHRleHQ6IHVzZXIudXNlcm5hbWVcclxuXHRcdFx0fSk7XHJcblxyXG5cdFx0XHQvLyBkaXNwbGF5IHRoZSBhZG1pbiBzdGF0dXMgb2YgYW5vdGhlciB1c2VyXHJcblx0XHRcdGlmKG1hdGNoWzFdKSB7XHJcblx0XHRcdFx0Y2hpbGRyZW4ucHVzaCh7XHJcblx0XHRcdFx0XHR0ZXh0OiBgJHt1c2VyLnVzZXJuYW1lfSBpcyAke3VzZXIuYWRtaW4gPyBcIlwiIDogXCJub3RcIn0gYW4gYWRtaW5gXHJcblx0XHRcdFx0fSk7XHJcblx0XHRcdH1cclxuXHRcdFx0Ly8gZGlzcGxheSB0aGUgYWRtaW4gc3RhdHVzIG9mIHRoaXMgdXNlclxyXG5cdFx0XHRlbHNlIHtcclxuXHRcdFx0XHRjaGlsZHJlbi5wdXNoKHtcclxuXHRcdFx0XHRcdHRleHQ6IGBZb3UgYXJlICR7dXNlci5hZG1pbiA/IFwiXCIgOiBcIm5vdFwifSBhbiBhZG1pbmBcclxuXHRcdFx0XHR9KTtcclxuXHJcblx0XHRcdFx0Ly8gYWRkIGEgbGluayBhdCBhIGxpc3Qgb2YgYWxsIHVzZXJzXHJcblx0XHRcdFx0aWYodXNlci5hZG1pbikge1xyXG5cdFx0XHRcdFx0Y2hpbGRyZW4ucHVzaCh7IHRhZzogXCJiclwiIH0pO1xyXG5cclxuXHRcdFx0XHRcdGNoaWxkcmVuLnB1c2goe1xyXG5cdFx0XHRcdFx0XHR3aWRnZXQ6IFwibGlua1wiLFxyXG5cdFx0XHRcdFx0XHRocmVmOiBcIi91c2Vyc1wiLFxyXG5cdFx0XHRcdFx0XHR0ZXh0OiBcIlZpZXcgYWxsIHVzZXJzXCJcclxuXHRcdFx0XHRcdH0pO1xyXG5cdFx0XHRcdH1cclxuXHRcdFx0fVxyXG5cclxuXHRcdFx0dmFyIHBhc3N3b3JkQ2hhbmdlID0ge307XHJcblxyXG5cdFx0XHRjaGlsZHJlbi5wdXNoKHtcclxuXHRcdFx0XHR0YWc6IFwiZm9ybVwiLFxyXG5cdFx0XHRcdGNoaWxkcmVuOiBbXHJcblx0XHRcdFx0XHR7XHJcblx0XHRcdFx0XHRcdGNsYXNzZXM6IFwiZWRpdG9yLXJvd1wiLFxyXG5cdFx0XHRcdFx0XHRjaGlsZHJlbjogW1xyXG5cdFx0XHRcdFx0XHRcdHtcclxuXHRcdFx0XHRcdFx0XHRcdHdpZGdldDogXCJpbnB1dFwiLFxyXG5cdFx0XHRcdFx0XHRcdFx0dHlwZTogXCJwYXNzd29yZFwiLFxyXG5cdFx0XHRcdFx0XHRcdFx0cGxhY2Vob2xkZXI6IFwiT2xkIHBhc3N3b3JkXCIsXHJcblx0XHRcdFx0XHRcdFx0XHRiaW5kOiBwYXNzd29yZENoYW5nZSxcclxuXHRcdFx0XHRcdFx0XHRcdHByb3A6IFwib2xkUGFzc3dvcmRcIlxyXG5cdFx0XHRcdFx0XHRcdH0sXHJcblx0XHRcdFx0XHRcdFx0e1xyXG5cdFx0XHRcdFx0XHRcdFx0d2lkZ2V0OiBcImlucHV0XCIsXHJcblx0XHRcdFx0XHRcdFx0XHR0eXBlOiBcInBhc3N3b3JkXCIsXHJcblx0XHRcdFx0XHRcdFx0XHRwbGFjZWhvbGRlcjogXCJOZXcgcGFzc3dvcmRcIixcclxuXHRcdFx0XHRcdFx0XHRcdGJpbmQ6IHBhc3N3b3JkQ2hhbmdlLFxyXG5cdFx0XHRcdFx0XHRcdFx0cHJvcDogXCJwYXNzd29yZFwiXHJcblx0XHRcdFx0XHRcdFx0fVxyXG5cdFx0XHRcdFx0XHRdXHJcblx0XHRcdFx0XHR9LFxyXG5cdFx0XHRcdFx0e1xyXG5cdFx0XHRcdFx0XHR0YWc6IFwiYnV0dG9uXCIsXHJcblx0XHRcdFx0XHRcdGNsYXNzZXM6IFwiZmFuY3ktYnV0dG9uXCIsXHJcblx0XHRcdFx0XHRcdHRleHQ6IFwiQ2hhbmdlIHBhc3N3b3JkXCIsXHJcblx0XHRcdFx0XHRcdGF0dHJzOiB7XHJcblx0XHRcdFx0XHRcdFx0dHlwZTogXCJzdWJtaXRcIlxyXG5cdFx0XHRcdFx0XHR9XHJcblx0XHRcdFx0XHR9LFxyXG5cdFx0XHRcdFx0e1xyXG5cdFx0XHRcdFx0XHRuYW1lOiBcIm1zZ1wiXHJcblx0XHRcdFx0XHR9XHJcblx0XHRcdFx0XSxcclxuXHRcdFx0XHRvbjoge1xyXG5cdFx0XHRcdFx0Ly8gY2hhbmdlIHRoZSBwYXNzd29yZFxyXG5cdFx0XHRcdFx0c3VibWl0OiBlID0+IHtcclxuXHRcdFx0XHRcdFx0ZS5wcmV2ZW50RGVmYXVsdCgpO1xyXG5cclxuXHRcdFx0XHRcdFx0Ly8gbm8gcGFzc3dvcmQgc3VwcGxpZWRcclxuXHRcdFx0XHRcdFx0aWYoIXBhc3N3b3JkQ2hhbmdlLnBhc3N3b3JkKSB7XHJcblx0XHRcdFx0XHRcdFx0c2hvd01zZyhcIkVudGVyIGEgbmV3IHBhc3N3b3JkXCIpO1xyXG5cdFx0XHRcdFx0XHRcdHJldHVybjtcclxuXHRcdFx0XHRcdFx0fVxyXG5cclxuXHRcdFx0XHRcdFx0Ly8gc2VuZCB0aGUgcGFzc3dvcmQgY2hhbmdlIHJlcXVlc3RcclxuXHRcdFx0XHRcdFx0ZmV0Y2goYC9hcGkvYXV0aC9pbmZvL3NldD91c2VybmFtZT0ke3VzZXIudXNlcm5hbWV9YCwge1xyXG5cdFx0XHRcdFx0XHRcdGNyZWRlbnRpYWxzOiBcImluY2x1ZGVcIixcclxuXHRcdFx0XHRcdFx0XHRtZXRob2Q6IFwiUE9TVFwiLFxyXG5cdFx0XHRcdFx0XHRcdGJvZHk6IEpTT04uc3RyaW5naWZ5KHBhc3N3b3JkQ2hhbmdlKVxyXG5cdFx0XHRcdFx0XHR9KVxyXG5cclxuXHRcdFx0XHRcdFx0LnRoZW4ocmVzID0+IHJlcy5qc29uKCkpXHJcblxyXG5cdFx0XHRcdFx0XHQudGhlbihyZXMgPT4ge1xyXG5cdFx0XHRcdFx0XHRcdC8vIHBhc3N3b3JkIGNoYW5nZSBmYWlsZWRcclxuXHRcdFx0XHRcdFx0XHRpZihyZXMuc3RhdHVzID09IFwiZmFpbFwiKSB7XHJcblx0XHRcdFx0XHRcdFx0XHRzaG93TXNnKHJlcy5kYXRhLm1zZyk7XHJcblx0XHRcdFx0XHRcdFx0fVxyXG5cclxuXHRcdFx0XHRcdFx0XHRpZihyZXMuc3RhdHVzID09IFwic3VjY2Vzc1wiKSB7XHJcblx0XHRcdFx0XHRcdFx0XHRzaG93TXNnKFwiUGFzc3dvcmQgY2hhbmdlZFwiKTtcclxuXHRcdFx0XHRcdFx0XHR9XHJcblx0XHRcdFx0XHRcdH0pO1xyXG5cdFx0XHRcdFx0fVxyXG5cdFx0XHRcdH1cclxuXHRcdFx0fSk7XHJcblxyXG5cdFx0XHRjaGlsZHJlbi5wdXNoKHsgdGFnOiBcImJyXCIgfSk7XHJcblx0XHRcdGNoaWxkcmVuLnB1c2goeyB0YWc6IFwiYnJcIiB9KTtcclxuXHJcblx0XHRcdC8vIG9ubHkgZGlzcGxheSB0aGUgbG9nb3V0IGJ1dHRvbiBpZiB3ZSBhcmUgb24gdGhlIC9hY2NvdW50IHBhZ2VcclxuXHRcdFx0aWYoIW1hdGNoWzFdKSB7XHJcblx0XHRcdFx0Y2hpbGRyZW4ucHVzaCh7XHJcblx0XHRcdFx0XHR0YWc6IFwiYnV0dG9uXCIsXHJcblx0XHRcdFx0XHRjbGFzc2VzOiBcImZhbmN5LWJ1dHRvblwiLFxyXG5cdFx0XHRcdFx0dGV4dDogXCJMb2dvdXRcIixcclxuXHRcdFx0XHRcdG9uOiB7XHJcblx0XHRcdFx0XHRcdGNsaWNrOiAoKSA9PiB7XHJcblx0XHRcdFx0XHRcdFx0Ly8gc2VuZCB0aGUgbG9nb3V0IHJlcXVlc3RcclxuXHRcdFx0XHRcdFx0XHRmZXRjaChcIi9hcGkvYXV0aC9sb2dvdXRcIiwgeyBjcmVkZW50aWFsczogXCJpbmNsdWRlXCIgfSlcclxuXHJcblx0XHRcdFx0XHRcdFx0Ly8gcmV0dXJuIHRvIHRoZSBsb2dpbiBwYWdlXHJcblx0XHRcdFx0XHRcdFx0LnRoZW4oKCkgPT4gbGlmZUxpbmUubmF2Lm5hdmlnYXRlKFwiL2xvZ2luXCIpKTtcclxuXHRcdFx0XHRcdFx0fVxyXG5cdFx0XHRcdFx0fVxyXG5cdFx0XHRcdH0pO1xyXG5cdFx0XHR9XHJcblxyXG5cdFx0XHR2YXIge21zZ30gPSBsaWZlTGluZS5tYWtlRG9tKHtcclxuXHRcdFx0XHRwYXJlbnQ6IGNvbnRlbnQsXHJcblx0XHRcdFx0Y2xhc3NlczogXCJjb250ZW50LXBhZGRlZFwiLFxyXG5cdFx0XHRcdGNoaWxkcmVuXHJcblx0XHRcdH0pO1xyXG5cclxuXHRcdFx0Ly8gc2hvdyBhIG1lc3NhZ2VcclxuXHRcdFx0dmFyIHNob3dNc2cgPSBmdW5jdGlvbih0ZXh0KSB7XHJcblx0XHRcdFx0bXNnLmlubmVyVGV4dCA9IHRleHQ7XHJcblx0XHRcdH07XHJcblx0XHR9KVxyXG5cdH1cclxufSk7XHJcbiIsIi8qKlxyXG4gKiBFZGl0IGFuIGFzc2lnbmVtbnRcclxuICovXHJcblxyXG5pbXBvcnQge2RheXNGcm9tTm93LCBzdHJpbmdpZnlEYXRlfSBmcm9tIFwiLi4vdXRpbC9kYXRlXCI7XHJcbmltcG9ydCB7c3RvcmV9IGZyb20gXCIuLi9kYXRhLXN0b3JlXCI7XHJcblxyXG52YXIgYXNzaWdubWVudHMgPSBzdG9yZShcImFzc2lnbm1lbnRzXCIpO1xyXG5cclxubGlmZUxpbmUubmF2LnJlZ2lzdGVyKHtcclxuXHRtYXRjaGVyOiAvXlxcL2VkaXRcXC8oLis/KSQvLFxyXG5cclxuXHRtYWtlKHttYXRjaCwgY29udGVudCwgc2V0VGl0bGUsIGRpc3Bvc2FibGV9KSB7XHJcblx0XHR2YXIgYWN0aW9uU3ViLCBkZWxldGVTdWI7XHJcblxyXG5cdFx0dmFyIGNoYW5nZVN1YiA9IGFzc2lnbm1lbnRzLmdldChtYXRjaFsxXSwgZnVuY3Rpb24oaXRlbSkge1xyXG5cdFx0XHQvLyBjbGVhciB0aGUgY29udGVudFxyXG5cdFx0XHRjb250ZW50LmlubmVySFRNTCA9IFwiXCI7XHJcblxyXG5cdFx0XHQvLyByZW1vdmUgdGhlIHByZXZpb3VzIGFjdGlvblxyXG5cdFx0XHRpZihhY3Rpb25TdWIpIHtcclxuXHRcdFx0XHRhY3Rpb25TdWIudW5zdWJzY3JpYmUoKTtcclxuXHRcdFx0XHRkZWxldGVTdWIudW5zdWJzY3JpYmUoKTtcclxuXHRcdFx0fVxyXG5cclxuXHRcdFx0Ly8gYWRkIGEgYnV0dG9uIGJhY2sgdG8gdGhlIHZpZXdcclxuXHRcdFx0aWYoaXRlbSkge1xyXG5cdFx0XHRcdGFjdGlvblN1YiA9IGxpZmVMaW5lLmFkZEFjdGlvbihcIlZpZXdcIiwgKCkgPT4gbGlmZUxpbmUubmF2Lm5hdmlnYXRlKFwiL2l0ZW0vXCIgKyBpdGVtLmlkKSk7XHJcblxyXG5cdFx0XHRcdGRlbGV0ZVN1YiA9IGxpZmVMaW5lLmFkZEFjdGlvbihcIkRlbGV0ZVwiLCAoKSA9PiB7XHJcblx0XHRcdFx0XHQvLyByZW1vdmUgdGhlIGl0ZW1cclxuXHRcdFx0XHRcdGFzc2lnbm1lbnRzLnJlbW92ZShpdGVtLmlkKTtcclxuXHJcblx0XHRcdFx0XHQvLyBuYXZpZ2F0ZSBhd2F5XHJcblx0XHRcdFx0XHRsaWZlTGluZS5uYXYubmF2aWdhdGUoXCIvXCIpO1xyXG5cdFx0XHRcdH0pO1xyXG5cdFx0XHR9XHJcblxyXG5cdFx0XHQvLyBpZiB0aGUgaXRlbSBkb2VzIG5vdCBleGlzdCBjcmVhdGUgaXRcclxuXHRcdFx0aWYoIWl0ZW0pIHtcclxuXHRcdFx0XHRpdGVtID0ge1xyXG5cdFx0XHRcdFx0bmFtZTogXCJVbm5hbWVkIGl0ZW1cIixcclxuXHRcdFx0XHRcdGNsYXNzOiBcIkNsYXNzXCIsXHJcblx0XHRcdFx0XHRkYXRlOiBnZW5EYXRlKCksXHJcblx0XHRcdFx0XHRpZDogbWF0Y2hbMV0sXHJcblx0XHRcdFx0XHRkZXNjcmlwdGlvbjogXCJcIixcclxuXHRcdFx0XHRcdG1vZGlmaWVkOiBEYXRlLm5vdygpXHJcblx0XHRcdFx0fTtcclxuXHRcdFx0fVxyXG5cclxuXHRcdFx0Ly8gc2V0IHRoZSBpbml0YWwgdGl0bGVcclxuXHRcdFx0c2V0VGl0bGUoXCJFZGl0aW5nXCIpO1xyXG5cclxuXHRcdFx0Ly8gc2F2ZSBjaGFuZ2VzXHJcblx0XHRcdHZhciBjaGFuZ2UgPSAoKSA9PiB7XHJcblx0XHRcdFx0Ly8gdXBkYXRlIHRoZSBtb2RpZmllZCBkYXRlXHJcblx0XHRcdFx0aXRlbS5tb2RpZmllZCA9IERhdGUubm93KCk7XHJcblxyXG5cdFx0XHRcdC8vIHBhcnNlIHRoZSBkYXRlXHJcblx0XHRcdFx0aXRlbS5kYXRlID0gbmV3IERhdGUoaXRlbS5kYXRlKTtcclxuXHJcblx0XHRcdFx0Ly8gYWRkIGEgYnV0dG9uIGJhY2sgdG8gdGhlIHZpZXdcclxuXHRcdFx0XHRpZighYWN0aW9uU3ViKSB7XHJcblx0XHRcdFx0XHRhY3Rpb25TdWIgPSBsaWZlTGluZS5hZGRBY3Rpb24oXCJWaWV3XCIsICgpID0+IGxpZmVMaW5lLm5hdi5uYXZpZ2F0ZShcIi9pdGVtL1wiICsgaXRlbS5pZCkpO1xyXG5cclxuXHRcdFx0XHRcdGRlbGV0ZVN1YiA9IGxpZmVMaW5lLmFkZEFjdGlvbihcIkRlbGV0ZVwiLCAoKSA9PiB7XHJcblx0XHRcdFx0XHRcdC8vIHJlbW92ZSB0aGUgaXRlbVxyXG5cdFx0XHRcdFx0XHRhc3NpZ25tZW50cy5yZW1vdmUoaXRlbS5pZCk7XHJcblxyXG5cdFx0XHRcdFx0XHQvLyBuYXZpZ2F0ZSBhd2F5XHJcblx0XHRcdFx0XHRcdGxpZmVMaW5lLm5hdi5uYXZpZ2F0ZShcIi9cIik7XHJcblx0XHRcdFx0XHR9KTtcclxuXHRcdFx0XHR9XHJcblxyXG5cdFx0XHRcdC8vIHNhdmUgdGhlIGNoYW5nZXNcclxuXHRcdFx0XHRhc3NpZ25tZW50cy5zZXQoaXRlbSwgY2hhbmdlU3ViKTtcclxuXHRcdFx0fTtcclxuXHJcblx0XHRcdC8vIHJlbmRlciB0aGUgdWlcclxuXHRcdFx0dmFyIG1hcHBlZCA9IGxpZmVMaW5lLm1ha2VEb20oe1xyXG5cdFx0XHRcdHBhcmVudDogY29udGVudCxcclxuXHRcdFx0XHRncm91cDogW1xyXG5cdFx0XHRcdFx0e1xyXG5cdFx0XHRcdFx0XHRjbGFzc2VzOiBcImVkaXRvci1yb3dcIixcclxuXHRcdFx0XHRcdFx0Y2hpbGRyZW46IFtcclxuXHRcdFx0XHRcdFx0XHR7XHJcblx0XHRcdFx0XHRcdFx0XHR3aWRnZXQ6IFwiaW5wdXRcIixcclxuXHRcdFx0XHRcdFx0XHRcdGJpbmQ6IGl0ZW0sXHJcblx0XHRcdFx0XHRcdFx0XHRwcm9wOiBcIm5hbWVcIixcclxuXHRcdFx0XHRcdFx0XHRcdGNoYW5nZVxyXG5cdFx0XHRcdFx0XHRcdH1cclxuXHRcdFx0XHRcdFx0XVxyXG5cdFx0XHRcdFx0fSxcclxuXHRcdFx0XHRcdHtcclxuXHRcdFx0XHRcdFx0Y2xhc3NlczogXCJlZGl0b3Itcm93XCIsXHJcblx0XHRcdFx0XHRcdGNoaWxkcmVuOiBbXHJcblx0XHRcdFx0XHRcdFx0e1xyXG5cdFx0XHRcdFx0XHRcdFx0d2lkZ2V0OiBcInRvZ2dsZS1idG5zXCIsXHJcblx0XHRcdFx0XHRcdFx0XHRidG5zOiBbXHJcblx0XHRcdFx0XHRcdFx0XHRcdHsgdGV4dDogXCJBc3NpZ25tZW50XCIsIHZhbHVlOiBcImFzc2lnbm1lbnRcIiB9LFxyXG5cdFx0XHRcdFx0XHRcdFx0XHR7IHRleHQ6IFwiVGFza1wiLCB2YWx1ZTogXCJ0YXNrXCIgfSxcclxuXHRcdFx0XHRcdFx0XHRcdF0sXHJcblx0XHRcdFx0XHRcdFx0XHR2YWx1ZTogaXRlbS50eXBlLFxyXG5cdFx0XHRcdFx0XHRcdFx0Y2hhbmdlOiB0eXBlID0+IHtcclxuXHRcdFx0XHRcdFx0XHRcdFx0Ly8gdXBkYXRlIHRoZSBpdGVtIHR5cGVcclxuXHRcdFx0XHRcdFx0XHRcdFx0aXRlbS50eXBlID0gdHlwZTtcclxuXHJcblx0XHRcdFx0XHRcdFx0XHRcdC8vIGVtaXQgdGhlIGNoYW5nZVxyXG5cdFx0XHRcdFx0XHRcdFx0XHRjaGFuZ2UoKTtcclxuXHRcdFx0XHRcdFx0XHRcdH1cclxuXHRcdFx0XHRcdFx0XHR9XHJcblx0XHRcdFx0XHRcdF1cclxuXHRcdFx0XHRcdH0sXHJcblx0XHRcdFx0XHR7XHJcblx0XHRcdFx0XHRcdGNsYXNzZXM6IFwiZWRpdG9yLXJvd1wiLFxyXG5cdFx0XHRcdFx0XHRjaGlsZHJlbjogW1xyXG5cdFx0XHRcdFx0XHRcdHtcclxuXHRcdFx0XHRcdFx0XHRcdHdpZGdldDogXCJpbnB1dFwiLFxyXG5cdFx0XHRcdFx0XHRcdFx0YmluZDogaXRlbSxcclxuXHRcdFx0XHRcdFx0XHRcdHByb3A6IFwiY2xhc3NcIixcclxuXHRcdFx0XHRcdFx0XHRcdGNoYW5nZVxyXG5cdFx0XHRcdFx0XHRcdH1cclxuXHRcdFx0XHRcdFx0XVxyXG5cdFx0XHRcdFx0fSxcclxuXHRcdFx0XHRcdHtcclxuXHRcdFx0XHRcdFx0Y2xhc3NlczogXCJlZGl0b3Itcm93XCIsXHJcblx0XHRcdFx0XHRcdGNoaWxkcmVuOiBbXHJcblx0XHRcdFx0XHRcdFx0e1xyXG5cdFx0XHRcdFx0XHRcdFx0d2lkZ2V0OiBcImlucHV0XCIsXHJcblx0XHRcdFx0XHRcdFx0XHR0eXBlOiBcImRhdGVcIixcclxuXHRcdFx0XHRcdFx0XHRcdHZhbHVlOiBgJHtpdGVtLmRhdGUuZ2V0RnVsbFllYXIoKX0tJHtwYWQoaXRlbS5kYXRlLmdldE1vbnRoKCkgKyAxKX0tJHtwYWQoaXRlbS5kYXRlLmdldERhdGUoKSl9YCxcclxuXHRcdFx0XHRcdFx0XHRcdGJpbmQ6IGl0ZW0sXHJcblx0XHRcdFx0XHRcdFx0XHRwcm9wOiBcImRhdGVcIixcclxuXHRcdFx0XHRcdFx0XHRcdGNoYW5nZVxyXG5cdFx0XHRcdFx0XHRcdH0sXHJcblx0XHRcdFx0XHRcdFx0e1xyXG5cdFx0XHRcdFx0XHRcdFx0d2lkZ2V0OiBcImlucHV0XCIsXHJcblx0XHRcdFx0XHRcdFx0XHR0eXBlOiBcInRpbWVcIixcclxuXHRcdFx0XHRcdFx0XHRcdHZhbHVlOiBgJHtpdGVtLmRhdGUuZ2V0SG91cnMoKX06JHtwYWQoaXRlbS5kYXRlLmdldE1pbnV0ZXMoKSl9YCxcclxuXHRcdFx0XHRcdFx0XHRcdGJpbmQ6IGl0ZW0sXHJcblx0XHRcdFx0XHRcdFx0XHRwcm9wOiBcInRpbWVcIixcclxuXHRcdFx0XHRcdFx0XHRcdGNoYW5nZVxyXG5cdFx0XHRcdFx0XHRcdH1cclxuXHRcdFx0XHRcdFx0XVxyXG5cdFx0XHRcdFx0fSxcclxuXHRcdFx0XHRcdHtcclxuXHRcdFx0XHRcdFx0Y2xhc3NlczogXCJ0ZXh0YXJlYS13cmFwcGVyXCIsXHJcblx0XHRcdFx0XHRcdGNoaWxkcmVuOiBbXHJcblx0XHRcdFx0XHRcdFx0e1xyXG5cdFx0XHRcdFx0XHRcdFx0d2lkZ2V0OiBcImlucHV0XCIsXHJcblx0XHRcdFx0XHRcdFx0XHR0YWc6IFwidGV4dGFyZWFcIixcclxuXHRcdFx0XHRcdFx0XHRcdGNsYXNzZXM6IFwidGV4dGFyZWEtZmlsbFwiLFxyXG5cdFx0XHRcdFx0XHRcdFx0cGxhY2Vob2xkZXI6IFwiRGVzY3JpcHRpb25cIixcclxuXHRcdFx0XHRcdFx0XHRcdGJpbmQ6IGl0ZW0sXHJcblx0XHRcdFx0XHRcdFx0XHRwcm9wOiBcImRlc2NyaXB0aW9uXCIsXHJcblx0XHRcdFx0XHRcdFx0XHRjaGFuZ2VcclxuXHRcdFx0XHRcdFx0XHR9XHJcblx0XHRcdFx0XHRcdF1cclxuXHRcdFx0XHRcdH1cclxuXHRcdFx0XHRdXHJcblx0XHRcdH0pO1xyXG5cdFx0fSk7XHJcblxyXG5cdFx0Ly8gcmVtb3ZlIHRoZSBzdWJzY3JpcHRpb24gd2hlbiB0aGlzIHZpZXcgaXMgZGVzdHJveWVkXHJcblx0XHRkaXNwb3NhYmxlLmFkZChjaGFuZ2VTdWIpO1xyXG5cdH1cclxufSk7XHJcblxyXG4vLyBhZGQgYSBsZWFkaW5nIDAgaWYgYSBudW1iZXIgaXMgbGVzcyB0aGFuIDEwXHJcbnZhciBwYWQgPSBudW1iZXIgPT4gKG51bWJlciA8IDEwKSA/IFwiMFwiICsgbnVtYmVyIDogbnVtYmVyO1xyXG5cclxuLy8gY3JlYXRlIGEgZGF0ZSBvZiB0b2RheSBhdCAxMTo1OXBtXHJcbnZhciBnZW5EYXRlID0gKCkgPT4ge1xyXG5cdHZhciBkYXRlID0gbmV3IERhdGUoKTtcclxuXHJcblx0Ly8gc2V0IHRoZSB0aW1lXHJcblx0ZGF0ZS5zZXRIb3VycygyMyk7XHJcblx0ZGF0ZS5zZXRNaW51dGVzKDU5KTtcclxuXHJcblx0cmV0dXJuIGRhdGU7XHJcbn07XHJcbiIsIi8qKlxyXG4gKiBUaGUgdmlldyBmb3IgYW4gYXNzaWdubWVudFxyXG4gKi9cclxuXHJcbmltcG9ydCB7ZGF5c0Zyb21Ob3csIHN0cmluZ2lmeURhdGV9IGZyb20gXCIuLi91dGlsL2RhdGVcIjtcclxuaW1wb3J0IHtzdG9yZX0gZnJvbSBcIi4uL2RhdGEtc3RvcmVcIjtcclxuXHJcbnZhciBhc3NpZ25tZW50cyA9IHN0b3JlKFwiYXNzaWdubWVudHNcIik7XHJcblxyXG5saWZlTGluZS5uYXYucmVnaXN0ZXIoe1xyXG5cdG1hdGNoZXI6IC9eXFwvaXRlbVxcLyguKz8pJC8sXHJcblxyXG5cdG1ha2Uoe21hdGNoLCBzZXRUaXRsZSwgY29udGVudCwgZGlzcG9zYWJsZX0pIHtcclxuXHRcdHZhciBhY3Rpb25Eb25lU3ViLCBhY3Rpb25FZGl0U3ViO1xyXG5cclxuXHQgXHRkaXNwb3NhYmxlLmFkZChcclxuXHRcdFx0YXNzaWdubWVudHMuZ2V0KG1hdGNoWzFdLCBmdW5jdGlvbihpdGVtKSB7XHJcblx0XHRcdFx0Ly8gY2xlYXIgdGhlIGNvbnRlbnRcclxuXHRcdFx0XHRjb250ZW50LmlubmVySFRNTCA9IFwiXCI7XHJcblxyXG5cdFx0XHRcdC8vIHJlbW92ZSB0aGUgb2xkIGFjdGlvblxyXG5cdFx0XHRcdGlmKGFjdGlvbkRvbmVTdWIpIHtcclxuXHRcdFx0XHRcdGFjdGlvbkRvbmVTdWIudW5zdWJzY3JpYmUoKTtcclxuXHRcdFx0XHRcdGFjdGlvbkVkaXRTdWIudW5zdWJzY3JpYmUoKTtcclxuXHRcdFx0XHR9XHJcblxyXG5cdFx0XHRcdC8vIG5vIHN1Y2ggYXNzaWdubWVudFxyXG5cdFx0XHRcdGlmKCFpdGVtKSB7XHJcblx0XHRcdFx0XHRzZXRUaXRsZShcIk5vdCBmb3VuZFwiKTtcclxuXHJcblx0XHRcdFx0XHRsaWZlTGluZS5tYWtlRG9tKHtcclxuXHRcdFx0XHRcdFx0cGFyZW50OiBjb250ZW50LFxyXG5cdFx0XHRcdFx0XHRjbGFzc2VzOiBcImNvbnRlbnQtcGFkZGVkXCIsXHJcblx0XHRcdFx0XHRcdGNoaWxkcmVuOiBbXHJcblx0XHRcdFx0XHRcdFx0e1xyXG5cdFx0XHRcdFx0XHRcdFx0dGFnOiBcInNwYW5cIixcclxuXHRcdFx0XHRcdFx0XHRcdHRleHQ6IFwiVGhlIGFzc2lnbm1lbnQgeW91IHdoZXJlIGxvb2tpbmcgZm9yIGNvdWxkIG5vdCBiZSBmb3VuZC4gXCJcclxuXHRcdFx0XHRcdFx0XHR9LFxyXG5cdFx0XHRcdFx0XHRcdHtcclxuXHRcdFx0XHRcdFx0XHRcdHdpZGdldDogXCJsaW5rXCIsXHJcblx0XHRcdFx0XHRcdFx0XHRocmVmOiBcIi9cIixcclxuXHRcdFx0XHRcdFx0XHRcdHRleHQ6IFwiR28gaG9tZS5cIlxyXG5cdFx0XHRcdFx0XHRcdH1cclxuXHRcdFx0XHRcdFx0XVxyXG5cdFx0XHRcdFx0fSlcclxuXHJcblx0XHRcdFx0XHRyZXR1cm47XHJcblx0XHRcdFx0fVxyXG5cclxuXHRcdFx0XHQvLyBzZXQgdGhlIHRpdGxlIGZvciB0aGUgY29udGVudFxyXG5cdFx0XHRcdHNldFRpdGxlKFwiQXNzaWdubWVudFwiKTtcclxuXHJcblx0XHRcdFx0Ly8gbWFyayB0aGUgaXRlbSBhcyBkb25lXHJcblx0XHRcdFx0YWN0aW9uRG9uZVN1YiA9IGxpZmVMaW5lLmFkZEFjdGlvbihpdGVtLmRvbmUgPyBcIkRvbmVcIiA6IFwiTm90IGRvbmVcIiwgKCkgPT4ge1xyXG5cdFx0XHRcdFx0Ly8gbWFyayB0aGUgaXRlbSBkb25lXHJcblx0XHRcdFx0XHRpdGVtLmRvbmUgPSAhaXRlbS5kb25lO1xyXG5cclxuXHRcdFx0XHRcdC8vIHVwZGF0ZSB0aGUgbW9kaWZpZWQgdGltZVxyXG5cdFx0XHRcdFx0aXRlbS5tb2RpZmllZCA9IERhdGUubm93KCk7XHJcblxyXG5cdFx0XHRcdFx0Ly8gc2F2ZSB0aGUgY2hhbmdlXHJcblx0XHRcdFx0XHRhc3NpZ25tZW50cy5zZXQoaXRlbSk7XHJcblx0XHRcdFx0fSk7XHJcblxyXG5cdFx0XHRcdC8vIGVkaXQgdGhlIGl0ZW1cclxuXHRcdFx0XHRhY3Rpb25FZGl0U3ViID0gbGlmZUxpbmUuYWRkQWN0aW9uKFwiRWRpdFwiLFxyXG5cdFx0XHRcdFx0KCkgPT4gbGlmZUxpbmUubmF2Lm5hdmlnYXRlKFwiL2VkaXQvXCIgKyBpdGVtLmlkKSk7XHJcblxyXG5cdFx0XHRcdC8vIHRpbWVzIHRvIHNraXBcclxuXHRcdFx0XHR2YXIgc2tpcFRpbWVzID0gW1xyXG5cdFx0XHRcdFx0eyBob3VyOiAyMywgbWludXRlOiA1OSB9XHJcblx0XHRcdFx0XTtcclxuXHJcblx0XHRcdFx0bGlmZUxpbmUubWFrZURvbSh7XHJcblx0XHRcdFx0XHRwYXJlbnQ6IGNvbnRlbnQsXHJcblx0XHRcdFx0XHRjbGFzc2VzOiBcImNvbnRlbnQtcGFkZGVkXCIsXHJcblx0XHRcdFx0XHRjaGlsZHJlbjogW1xyXG5cdFx0XHRcdFx0XHR7XHJcblx0XHRcdFx0XHRcdFx0Y2xhc3NlczogXCJhc3NpZ25tZW50LW5hbWVcIixcclxuXHRcdFx0XHRcdFx0XHR0ZXh0OiBpdGVtLm5hbWVcclxuXHRcdFx0XHRcdFx0fSxcclxuXHRcdFx0XHRcdFx0e1xyXG5cdFx0XHRcdFx0XHRcdGNsYXNzZXM6IFwiYXNzaWdubWVudC1pbmZvLXJvd1wiLFxyXG5cdFx0XHRcdFx0XHRcdGNoaWxkcmVuOiBbXHJcblx0XHRcdFx0XHRcdFx0XHR7XHJcblx0XHRcdFx0XHRcdFx0XHRcdGNsYXNzZXM6IFwiYXNzaWdubWVudC1pbmZvLWdyb3dcIixcclxuXHRcdFx0XHRcdFx0XHRcdFx0dGV4dDogaXRlbS5jbGFzc1xyXG5cdFx0XHRcdFx0XHRcdFx0fSxcclxuXHRcdFx0XHRcdFx0XHRcdHtcclxuXHRcdFx0XHRcdFx0XHRcdFx0dGV4dDogc3RyaW5naWZ5RGF0ZShpdGVtLmRhdGUsIHsgaW5jbHVkZVRpbWU6IHRydWUsIHNraXBUaW1lcyB9KVxyXG5cdFx0XHRcdFx0XHRcdFx0fVxyXG5cdFx0XHRcdFx0XHRcdF1cclxuXHRcdFx0XHRcdFx0fSxcclxuXHRcdFx0XHRcdFx0e1xyXG5cdFx0XHRcdFx0XHRcdGNsYXNzZXM6IFwiYXNzaWdubWVudC1kZXNjcmlwdGlvblwiLFxyXG5cdFx0XHRcdFx0XHRcdHRleHQ6IGl0ZW0uZGVzY3JpcHRpb25cclxuXHRcdFx0XHRcdFx0fVxyXG5cdFx0XHRcdFx0XVxyXG5cdFx0XHRcdH0pO1xyXG5cdFx0XHR9KVxyXG5cdFx0KTtcclxuXHR9XHJcbn0pO1xyXG4iLCIvKipcclxuICogRGlzcGxheSBhIGxpc3Qgb2YgdXBjb21taW5nIGFzc2lnbm1lbnRzXHJcbiAqL1xyXG5cclxuaW1wb3J0IHtkYXlzRnJvbU5vdywgaXNTYW1lRGF0ZSwgc3RyaW5naWZ5RGF0ZSwgc3RyaW5naWZ5VGltZSwgaXNTb29uZXJEYXRlfSBmcm9tIFwiLi4vdXRpbC9kYXRlXCI7XHJcbmltcG9ydCB7c3RvcmV9IGZyb20gXCIuLi9kYXRhLXN0b3JlXCI7XHJcblxyXG52YXIgYXNzaWdubWVudHMgPSBzdG9yZShcImFzc2lnbm1lbnRzXCIpO1xyXG5cclxuLy8gYWxsIHRoZSBkaWZmZXJlbnQgbGlzdHNcclxuY29uc3QgTElTVFMgPSBbXHJcblx0e1xyXG5cdFx0dXJsOiBcIi9cIixcclxuXHRcdHRpdGxlOiBcIlRvZGF5XCIsXHJcblx0XHRjcmVhdGVDdHg6ICgpID0+IG5ldyBEYXRlKCksXHJcblx0XHQvLyBzaG93IGFsbCBhdCByZWFzb25hYmxlIG51bWJlciBvZiBpbmNvbXBsZXRlIGFzc2lnbm1lbnRzXHJcblx0XHRmaWx0ZXI6IChpdGVtLCB0b2RheSkgPT4gIWl0ZW0uZG9uZSAmJiBpc1NhbWVEYXRlKHRvZGF5LCBpdGVtLmRhdGUpXHJcblx0fSxcclxuXHR7XHJcblx0XHR1cmw6IFwiL3dlZWtcIixcclxuXHRcdHRpdGxlOiBcIlRoaXMgd2Vla1wiLFxyXG5cdFx0Y3JlYXRlQ3R4OiAoKSA9PiAoe1xyXG5cdFx0XHQvLyBkYXlzIHRvIHRoZSBlbmQgb2YgdGhpcyB3ZWVrXHJcblx0XHRcdGVuZERhdGU6IGRheXNGcm9tTm93KDcgLSAobmV3IERhdGUoKSkuZ2V0RGF5KCkpLFxyXG5cdFx0XHQvLyB0b2RheXMgZGF0ZVxyXG5cdFx0XHR0b2RheTogbmV3IERhdGUoKVxyXG5cdFx0fSksXHJcblx0XHQvLyBzaG93IGFsbCBhdCByZWFzb25hYmxlIG51bWJlciBvZiBpbmNvbXBsZXRlIGFzc2lnbm1lbnRzXHJcblx0XHRmaWx0ZXI6IChpdGVtLCB7dG9kYXksIGVuZERhdGV9KSA9PiB7XHJcblx0XHRcdC8vIGFscmVhZHkgZG9uZVxyXG5cdFx0XHRpZihpdGVtLmRvbmUpIHJldHVybjtcclxuXHJcblx0XHRcdC8vIGNoZWNrIGlmIHRoZSBpdGVtIGlzIHBhc3QgdGhpcyB3ZWVrXHJcblx0XHRcdGlmKCFpc1Nvb25lckRhdGUoaXRlbS5kYXRlLCBlbmREYXRlKSAmJiAhaXNTYW1lRGF0ZShpdGVtLmRhdGUsIGVuZERhdGUpKSByZXR1cm47XHJcblxyXG5cdFx0XHQvLyBjaGVjayBpZiB0aGUgZGF0ZSBpcyBiZWZvcmUgdG9kYXlcclxuXHRcdFx0aWYoaXNTb29uZXJEYXRlKGl0ZW0uZGF0ZSwgdG9kYXkpKSByZXR1cm47XHJcblxyXG5cdFx0XHRyZXR1cm4gdHJ1ZTtcclxuXHRcdH1cclxuXHR9LFxyXG5cdHtcclxuXHRcdHVybDogXCIvdXBjb21pbmdcIixcclxuXHRcdGZpbHRlcjogaXRlbSA9PiAhaXRlbS5kb25lLFxyXG5cdFx0dGl0bGU6IFwiVXBjb21pbmdcIlxyXG5cdH0sXHJcblx0e1xyXG5cdFx0dXJsOiBcIi9kb25lXCIsXHJcblx0XHRmaWx0ZXI6IGl0ZW0gPT4gaXRlbS5kb25lLFxyXG5cdFx0dGl0bGU6IFwiRG9uZVwiXHJcblx0fVxyXG5dO1xyXG5cclxuLy8gYWRkIGxpc3QgdmlldyBsaW5rcyB0byB0aGUgbmF2YmFyXHJcbmV4cG9ydCBmdW5jdGlvbiBpbml0TmF2QmFyKCkge1xyXG5cdExJU1RTLmZvckVhY2gobGlzdCA9PiBsaWZlTGluZS5hZGROYXZDb21tYW5kKGxpc3QudGl0bGUsIGxpc3QudXJsKSk7XHJcbn07XHJcblxyXG5saWZlTGluZS5uYXYucmVnaXN0ZXIoe1xyXG5cdG1hdGNoZXIodXJsKSB7XHJcblx0XHRyZXR1cm4gTElTVFMuZmluZChsaXN0ID0+IGxpc3QudXJsID09IHVybCk7XHJcblx0fSxcclxuXHJcblx0Ly8gbWFrZSB0aGUgbGlzdFxyXG5cdG1ha2Uoe3NldFRpdGxlLCBjb250ZW50LCBkaXNwb3NhYmxlLCBtYXRjaH0pIHtcclxuXHRcdGRpc3Bvc2FibGUuYWRkKFxyXG5cdFx0XHRhc3NpZ25tZW50cy5nZXRBbGwoZnVuY3Rpb24oZGF0YSkge1xyXG5cdFx0XHRcdC8vIGNsZWFyIHRoZSBjb250ZW50XHJcblx0XHRcdFx0Y29udGVudC5pbm5lckhUTUwgPSBcIlwiO1xyXG5cclxuXHRcdFx0XHQvLyBzZXQgdGhlIHBhZ2UgdGl0bGVcclxuXHRcdFx0XHRzZXRUaXRsZShtYXRjaC50aXRsZSk7XHJcblxyXG5cdFx0XHRcdC8vIHNvcnQgdGhlIGFzc2luZ21lbnRzXHJcblx0XHRcdFx0ZGF0YS5zb3J0KChhLCBiKSA9PiB7XHJcblx0XHRcdFx0XHQvLyBkaWZmZXJlbnQgZGF0ZXNcclxuXHRcdFx0XHRcdGlmKGEuZGF0ZS5nZXRUaW1lKCkgIT0gYi5kYXRlLmdldFRpbWUoKSkge1xyXG5cdFx0XHRcdFx0XHRyZXR1cm4gYS5kYXRlLmdldFRpbWUoKSAtIGIuZGF0ZS5nZXRUaW1lKCk7XHJcblx0XHRcdFx0XHR9XHJcblxyXG5cdFx0XHRcdFx0Ly8gb3JkZXIgYnkgbmFtZVxyXG5cdFx0XHRcdFx0aWYoYS5uYW1lIDwgYi5uYW1lKSByZXR1cm4gLTE7XHJcblx0XHRcdFx0XHRpZihhLm5hbWUgPiBiLm5hbWUpIHJldHVybiAxO1xyXG5cclxuXHRcdFx0XHRcdHJldHVybiAwO1xyXG5cdFx0XHRcdH0pO1xyXG5cclxuXHRcdFx0XHQvLyB0aGUgY29udGV4dCBmb3IgdGhlIGZpbHRlciBmdW5jdGlvblxyXG5cdFx0XHRcdHZhciBjdHg7XHJcblxyXG5cdFx0XHRcdGlmKG1hdGNoLmNyZWF0ZUN0eCkge1xyXG5cdFx0XHRcdFx0Y3R4ID0gbWF0Y2guY3JlYXRlQ3R4KCk7XHJcblx0XHRcdFx0fVxyXG5cclxuXHRcdFx0XHQvLyBydW4gdGhlIGZpbHRlciBmdW5jdGlvblxyXG5cdFx0XHRcdGRhdGEgPSBkYXRhLmZpbHRlcihpdGVtID0+IG1hdGNoLmZpbHRlcihpdGVtLCBjdHgpKTtcclxuXHJcblx0XHRcdFx0Ly8gbWFrZSB0aGUgZ3JvdXBzXHJcblx0XHRcdFx0dmFyIGdyb3VwcyA9IHt9O1xyXG5cclxuXHRcdFx0XHQvLyByZW5kZXIgdGhlIGxpc3RcclxuXHRcdFx0XHRkYXRhLmZvckVhY2goKGl0ZW0sIGkpID0+IHtcclxuXHRcdFx0XHRcdC8vIGdldCB0aGUgaGVhZGVyIG5hbWVcclxuXHRcdFx0XHRcdHZhciBkYXRlU3RyID0gc3RyaW5naWZ5RGF0ZShpdGVtLmRhdGUpO1xyXG5cclxuXHRcdFx0XHRcdC8vIG1ha2Ugc3VyZSB0aGUgaGVhZGVyIGV4aXN0c1xyXG5cdFx0XHRcdFx0Z3JvdXBzW2RhdGVTdHJdIHx8IChncm91cHNbZGF0ZVN0cl0gPSBbXSk7XHJcblxyXG5cdFx0XHRcdFx0Ly8gYWRkIHRoZSBpdGVtIHRvIHRoZSBsaXN0XHJcblx0XHRcdFx0XHR2YXIgaXRlbXMgPSBbXHJcblx0XHRcdFx0XHRcdHsgdGV4dDogaXRlbS5uYW1lLCBncm93OiB0cnVlIH0sXHJcblx0XHRcdFx0XHRcdGl0ZW0uY2xhc3NcclxuXHRcdFx0XHRcdF07XHJcblxyXG5cdFx0XHRcdFx0Ly8gc2hvdyB0aGUgZW5kIHRpbWUgZm9yIGFueSBub24gMTE6NTlwbSB0aW1lc1xyXG5cdFx0XHRcdFx0aWYoaXRlbS5kYXRlLmdldEhvdXJzKCkgIT0gMjMgfHwgaXRlbS5kYXRlLmdldE1pbnV0ZXMoKSAhPSA1OSkge1xyXG5cdFx0XHRcdFx0XHRpdGVtcy5zcGxpY2UoMSwgMCwgc3RyaW5naWZ5VGltZShpdGVtLmRhdGUpKTtcclxuXHRcdFx0XHRcdH1cclxuXHJcblx0XHRcdFx0XHRncm91cHNbZGF0ZVN0cl0ucHVzaCh7XG5cdFx0XHRcdFx0XHRocmVmOiBgL2l0ZW0vJHtpdGVtLmlkfWAsXG5cdFx0XHRcdFx0XHRpdGVtc1xyXG5cdFx0XHRcdFx0fSk7XHJcblx0XHRcdFx0fSk7XHJcblxyXG5cdFx0XHRcdC8vIGRpc3BsYXkgYWxsIGl0ZW1zXHJcblx0XHRcdFx0bGlmZUxpbmUubWFrZURvbSh7XHJcblx0XHRcdFx0XHRwYXJlbnQ6IGNvbnRlbnQsXHJcblx0XHRcdFx0XHR3aWRnZXQ6IFwibGlzdFwiLFxyXG5cdFx0XHRcdFx0aXRlbXM6IGdyb3Vwc1xyXG5cdFx0XHRcdH0pO1xyXG5cdFx0XHR9KVxyXG5cdFx0KTtcclxuXHR9XHJcbn0pO1xyXG4iLCIvKipcclxuICogU2hvdyBhIGxvZ2luIGJ1dHRvbiB0byB0aGUgdXNlclxyXG4gKi9cclxuXHJcbmxpZmVMaW5lLm5hdi5yZWdpc3Rlcih7XHJcblx0bWF0Y2hlcjogXCIvbG9naW5cIixcclxuXHJcblx0bWFrZSh7c2V0VGl0bGUsIGNvbnRlbnR9KSB7XHJcblx0XHQvLyBzZXQgdGhlIHBhZ2UgdGl0bGVcclxuXHRcdHNldFRpdGxlKFwiTG9naW5cIik7XHJcblxyXG5cdFx0Ly8gdGhlIHVzZXJzIGNyZWRlbnRpYWxzXHJcblx0XHR2YXIgYXV0aCA9IHt9O1xyXG5cclxuXHRcdC8vIGNyZWF0ZSB0aGUgbG9naW4gZm9ybVxyXG5cdFx0dmFyIHt1c2VybmFtZSwgcGFzc3dvcmQsIG1zZ30gPSBsaWZlTGluZS5tYWtlRG9tKHtcclxuXHRcdFx0cGFyZW50OiBjb250ZW50LFxyXG5cdFx0XHR0YWc6IFwiZm9ybVwiLFxyXG5cdFx0XHRjbGFzc2VzOiBcImNvbnRlbnQtcGFkZGVkXCIsXHJcblx0XHRcdGNoaWxkcmVuOiBbXHJcblx0XHRcdFx0e1xyXG5cdFx0XHRcdFx0Y2xhc3NlczogXCJlZGl0b3Itcm93XCIsXHJcblx0XHRcdFx0XHRjaGlsZHJlbjogW1xyXG5cdFx0XHRcdFx0XHR7XHJcblx0XHRcdFx0XHRcdFx0d2lkZ2V0OiBcImlucHV0XCIsXHJcblx0XHRcdFx0XHRcdFx0YmluZDogYXV0aCxcclxuXHRcdFx0XHRcdFx0XHRwcm9wOiBcInVzZXJuYW1lXCIsXHJcblx0XHRcdFx0XHRcdFx0cGxhY2Vob2xkZXI6IFwiVXNlcm5hbWVcIlxyXG5cdFx0XHRcdFx0XHR9XHJcblx0XHRcdFx0XHRdXHJcblx0XHRcdFx0fSxcclxuXHRcdFx0XHR7XHJcblx0XHRcdFx0XHRjbGFzc2VzOiBcImVkaXRvci1yb3dcIixcclxuXHRcdFx0XHRcdGNoaWxkcmVuOiBbXHJcblx0XHRcdFx0XHRcdHtcclxuXHRcdFx0XHRcdFx0XHR3aWRnZXQ6IFwiaW5wdXRcIixcclxuXHRcdFx0XHRcdFx0XHRiaW5kOiBhdXRoLFxyXG5cdFx0XHRcdFx0XHRcdHByb3A6IFwicGFzc3dvcmRcIixcclxuXHRcdFx0XHRcdFx0XHR0eXBlOiBcInBhc3N3b3JkXCIsXHJcblx0XHRcdFx0XHRcdFx0cGxhY2Vob2xkZXI6IFwiUGFzc3dvcmRcIlxyXG5cdFx0XHRcdFx0XHR9XHJcblx0XHRcdFx0XHRdXHJcblx0XHRcdFx0fSxcclxuXHRcdFx0XHR7XHJcblx0XHRcdFx0XHR0YWc6IFwiYnV0dG9uXCIsXHJcblx0XHRcdFx0XHR0ZXh0OiBcIkxvZ2luXCIsXHJcblx0XHRcdFx0XHRjbGFzc2VzOiBcImZhbmN5LWJ1dHRvblwiLFxyXG5cdFx0XHRcdFx0YXR0cnM6IHtcclxuXHRcdFx0XHRcdFx0dHlwZTogXCJzdWJtaXRcIlxyXG5cdFx0XHRcdFx0fVxyXG5cdFx0XHRcdH0sXHJcblx0XHRcdFx0e1xyXG5cdFx0XHRcdFx0Y2xhc3NlczogXCJlcnJvci1tc2dcIixcclxuXHRcdFx0XHRcdG5hbWU6IFwibXNnXCJcclxuXHRcdFx0XHR9XHJcblx0XHRcdF0sXHJcblx0XHRcdG9uOiB7XHJcblx0XHRcdFx0c3VibWl0OiBlID0+IHtcclxuXHRcdFx0XHRcdGUucHJldmVudERlZmF1bHQoKTtcclxuXHJcblx0XHRcdFx0XHQvLyBzZW5kIHRoZSBsb2dpbiByZXF1ZXN0XHJcblx0XHRcdFx0XHRmZXRjaChcIi9hcGkvYXV0aC9sb2dpblwiLCB7XHJcblx0XHRcdFx0XHRcdG1ldGhvZDogXCJQT1NUXCIsXHJcblx0XHRcdFx0XHRcdGNyZWRlbnRpYWxzOiBcImluY2x1ZGVcIixcclxuXHRcdFx0XHRcdFx0Ym9keTogSlNPTi5zdHJpbmdpZnkoYXV0aClcclxuXHRcdFx0XHRcdH0pXHJcblxyXG5cdFx0XHRcdFx0Ly8gcGFyc2UgdGhlIGpzb25cclxuXHRcdFx0XHRcdC50aGVuKHJlcyA9PiByZXMuanNvbigpKVxyXG5cclxuXHRcdFx0XHRcdC8vIHByb2Nlc3MgdGhlIHJlc3BvbnNlXHJcblx0XHRcdFx0XHQudGhlbihyZXMgPT4ge1xyXG5cdFx0XHRcdFx0XHQvLyBsb2dpbiBzdWNlZWRlZCBnbyBob21lXHJcblx0XHRcdFx0XHRcdGlmKHJlcy5zdGF0dXMgPT0gXCJzdWNjZXNzXCIpIHtcclxuXHRcdFx0XHRcdFx0XHRsaWZlTGluZS5uYXYubmF2aWdhdGUoXCIvXCIpO1xyXG5cdFx0XHRcdFx0XHRcdHJldHVybjtcclxuXHRcdFx0XHRcdFx0fVxyXG5cclxuXHRcdFx0XHRcdFx0Ly8gbG9naW4gZmFpbGVkXHJcblx0XHRcdFx0XHRcdGlmKHJlcy5zdGF0dXMgPT0gXCJmYWlsXCIpIHtcclxuXHRcdFx0XHRcdFx0XHRlcnJvck1zZyhcIkxvZ2luIGZhaWxlZFwiKTtcclxuXHRcdFx0XHRcdFx0fVxyXG5cdFx0XHRcdFx0fSk7XHJcblx0XHRcdFx0fVxyXG5cdFx0XHR9XHJcblx0XHR9KTtcclxuXHJcblx0XHQvLyBkaXNwbGF5IGFuIGVycm9yIG1lc3NhZ2VcclxuXHRcdHZhciBlcnJvck1zZyA9IGZ1bmN0aW9uKHRleHQpIHtcclxuXHRcdFx0bXNnLmlubmVyVGV4dCA9IHRleHQ7XHJcblx0XHR9O1xyXG5cdH1cclxufSk7XHJcblxyXG4vLyBsb2dvdXRcclxubGlmZUxpbmUubG9nb3V0ID0gZnVuY3Rpb24oKSB7XHJcblx0Ly8gc2VuZCB0aGUgbG9nb3V0IHJlcXVlc3RcclxuXHRmZXRjaChcIi9hcGkvYXV0aC9sb2dvdXRcIiwge1xyXG5cdFx0Y3JlZGVudGlhbHM6IFwiaW5jbHVkZVwiXHJcblx0fSlcclxuXHJcblx0Ly8gZ28gdG8gdGhlIGxvZ2luIHBhZ2VcclxuXHQudGhlbigoKSA9PiBsaWZlTGluZS5uYXYubmF2aWdhdGUoXCIvbG9naW5cIikpO1xyXG59O1xyXG4iLCIvKipcclxuICogQSBwYWdlIHdpdGggbGlua3MgdG8gYWxsIHVzZXJzXHJcbiAqL1xyXG5cclxubGlmZUxpbmUubmF2LnJlZ2lzdGVyKHtcclxuXHRtYXRjaGVyOiBcIi91c2Vyc1wiLFxyXG5cclxuXHRtYWtlKHtzZXRUaXRsZSwgY29udGVudH0pIHtcclxuXHRcdHNldFRpdGxlKFwiQWxsIHVzZXJzXCIpO1xyXG5cclxuXHRcdC8vIGxvYWQgdGhlIGxpc3Qgb2YgdXNlcnNcclxuXHRcdGZldGNoKFwiL2FwaS9hdXRoL2luZm8vdXNlcnNcIiwge1xyXG5cdFx0XHRjcmVkZW50aWFsczogXCJpbmNsdWRlXCJcclxuXHRcdH0pXHJcblxyXG5cdFx0LnRoZW4ocmVzID0+IHJlcy5qc29uKCkpXHJcblxyXG5cdFx0LnRoZW4oKHtzdGF0dXMsIGRhdGE6IHVzZXJzfSkgPT4ge1xyXG5cdFx0XHQvLyBub3QgYXV0aGVudGljYXRlZFxyXG5cdFx0XHRpZihzdGF0dXMgPT0gXCJmYWlsXCIpIHtcclxuXHRcdFx0XHRsaWZlTGluZS5tYWtlRG9tKHtcclxuXHRcdFx0XHRcdHBhcmVudDogY29udGVudCxcclxuXHRcdFx0XHRcdGNsYXNzZXM6IFwiY29udGVudC1wYWRkZWRcIixcclxuXHRcdFx0XHRcdHRleHQ6IFwiWW91IGRvIG5vdCBoYXZlIGFjY2VzcyB0byB0aGUgdXNlciBsaXN0XCJcclxuXHRcdFx0XHR9KTtcclxuXHJcblx0XHRcdFx0cmV0dXJuO1xyXG5cdFx0XHR9XHJcblxyXG5cdFx0XHQvLyBzb3J0IGJ5IGFkbWluIHN0YXR1c1xyXG5cdFx0XHR1c2Vycy5zb3J0KChhLCBiKSA9PiB7XHJcblx0XHRcdFx0Ly8gc29ydCBhZG1pbnNcclxuXHRcdFx0XHRpZihhLmFkbWluICYmICFiLmFkbWluKSByZXR1cm4gLTE7XHJcblx0XHRcdFx0aWYoIWEuYWRtaW4gJiYgYi5hZG1pbikgcmV0dXJuIDE7XHJcblxyXG5cdFx0XHRcdC8vIHNvcnQgYnkgdXNlcm5hbWVcclxuXHRcdFx0XHRpZihhLnVzZXJuYW1lIDwgYi51c2VybmFtZSkgcmV0dXJuIC0xO1xyXG5cdFx0XHRcdGlmKGEudXNlcm5hbWUgPiBiLnVzZXJuYW1lKSByZXR1cm4gMTtcclxuXHJcblx0XHRcdFx0cmV0dXJuIDA7XHJcblx0XHRcdH0pO1xyXG5cclxuXHRcdFx0dmFyIGRpc3BsYXlVc2VycyA9IHtcclxuXHRcdFx0XHRBZG1pbnM6IFtdLFxyXG5cdFx0XHRcdFVzZXJzOiBbXVxyXG5cdFx0XHR9O1xyXG5cclxuXHRcdFx0Ly8gZ2VuZXJhdGUgdGhlIHVzZXIgbGlzdFxyXG5cdFx0XHR1c2Vycy5mb3JFYWNoKHVzZXIgPT4ge1xyXG5cdFx0XHRcdC8vIHNvcnQgdGhlIHVzZXJzIGludG8gYWRtaW5zIGFuZCB1c2Vyc1xyXG5cdFx0XHRcdGRpc3BsYXlVc2Vyc1t1c2VyLmFkbWluID8gXCJBZG1pbnNcIiA6IFwiVXNlcnNcIl1cclxuXHJcblx0XHRcdFx0LnB1c2goe1xyXG5cdFx0XHRcdFx0aHJlZjogYC91c2VyLyR7dXNlci51c2VybmFtZX1gLFxyXG5cdFx0XHRcdFx0aXRlbXM6IFt7XHJcblx0XHRcdFx0XHRcdHRleHQ6IHVzZXIudXNlcm5hbWUsXHJcblx0XHRcdFx0XHRcdGdyb3c6IHRydWVcclxuXHRcdFx0XHRcdH1dXHJcblx0XHRcdFx0fSk7XHJcblx0XHRcdH0pO1xyXG5cclxuXHRcdFx0Ly8gZGlzcGxheSB0aGUgdXNlciBsaXN0XHJcblx0XHRcdGxpZmVMaW5lLm1ha2VEb20oe1xyXG5cdFx0XHRcdHBhcmVudDogY29udGVudCxcclxuXHRcdFx0XHR3aWRnZXQ6IFwibGlzdFwiLFxyXG5cdFx0XHRcdGl0ZW1zOiBkaXNwbGF5VXNlcnNcclxuXHRcdFx0fSk7XHJcblx0XHR9KVxyXG5cclxuXHRcdC8vIHNvbWV0aGluZyB3ZW50IHdyb25nIHNob3cgYW4gZXJyb3IgbWVzc2FnZVxyXG5cdFx0LmNhdGNoKGVyciA9PiB7XHJcblx0XHRcdGxpZmVMaW5lLm1ha2VEb20oe1xyXG5cdFx0XHRcdGNsYXNzZXM6IFwiY29udGVudC1wYWRkZWRcIixcclxuXHRcdFx0XHR0ZXh0OiBlcnIubWVzc2FnZVxyXG5cdFx0XHR9KTtcclxuXHRcdH0pO1xyXG5cdH1cclxufSk7XHJcbiIsIi8qKlxyXG4gKiBUaGUgbWFpbiBjb250ZW50IHBhbmUgZm9yIHRoZSBhcHBcclxuICovXHJcblxyXG5saWZlTGluZS5tYWtlRG9tLnJlZ2lzdGVyKFwiY29udGVudFwiLCB7XHJcblx0bWFrZSgpIHtcclxuXHRcdHJldHVybiBbXHJcblx0XHRcdHtcclxuXHRcdFx0XHRjbGFzc2VzOiBcInRvb2xiYXJcIixcclxuXHRcdFx0XHRjaGlsZHJlbjogW1xyXG5cdFx0XHRcdFx0e1xyXG5cdFx0XHRcdFx0XHR0YWc6IFwic3ZnXCIsXHJcblx0XHRcdFx0XHRcdGNsYXNzZXM6IFwibWVudS1pY29uXCIsXHJcblx0XHRcdFx0XHRcdGF0dHJzOiB7XHJcblx0XHRcdFx0XHRcdFx0dmlld0JveDogXCIwIDAgNjAgNTBcIixcclxuXHRcdFx0XHRcdFx0XHR3aWR0aDogXCIyMFwiLFxyXG5cdFx0XHRcdFx0XHRcdGhlaWdodDogXCIxNVwiXHJcblx0XHRcdFx0XHRcdH0sXHJcblx0XHRcdFx0XHRcdGNoaWxkcmVuOiBbXHJcblx0XHRcdFx0XHRcdFx0eyB0YWc6IFwibGluZVwiLCBhdHRyczogeyB4MTogXCIwXCIsIHkxOiBcIjVcIiwgeDI6IFwiNjBcIiwgeTI6IFwiNVwiIH0gfSxcclxuXHRcdFx0XHRcdFx0XHR7IHRhZzogXCJsaW5lXCIsIGF0dHJzOiB7IHgxOiBcIjBcIiwgeTE6IFwiMjVcIiwgeDI6IFwiNjBcIiwgeTI6IFwiMjVcIiB9IH0sXHJcblx0XHRcdFx0XHRcdFx0eyB0YWc6IFwibGluZVwiLCBhdHRyczogeyB4MTogXCIwXCIsIHkxOiBcIjQ1XCIsIHgyOiBcIjYwXCIsIHkyOiBcIjQ1XCIgfSB9XHJcblx0XHRcdFx0XHRcdF0sXHJcblx0XHRcdFx0XHRcdG9uOiB7XHJcblx0XHRcdFx0XHRcdFx0Y2xpY2s6ICgpID0+IGRvY3VtZW50LmJvZHkuY2xhc3NMaXN0LnRvZ2dsZShcInNpZGViYXItb3BlblwiKVxyXG5cdFx0XHRcdFx0XHR9XHJcblx0XHRcdFx0XHR9LFxyXG5cdFx0XHRcdFx0e1xyXG5cdFx0XHRcdFx0XHRjbGFzc2VzOiBcInRvb2xiYXItdGl0bGVcIixcclxuXHRcdFx0XHRcdFx0bmFtZTogXCJ0aXRsZVwiXHJcblx0XHRcdFx0XHR9LFxyXG5cdFx0XHRcdFx0e1xyXG5cdFx0XHRcdFx0XHRjbGFzc2VzOiBcInRvb2xiYXItYnV0dG9uc1wiLFxyXG5cdFx0XHRcdFx0XHRuYW1lOiBcImJ0bnNcIlxyXG5cdFx0XHRcdFx0fVxyXG5cdFx0XHRcdF1cclxuXHRcdFx0fSxcclxuXHRcdFx0e1xyXG5cdFx0XHRcdGNsYXNzZXM6IFwiY29udGVudFwiLFxyXG5cdFx0XHRcdG5hbWU6IFwiY29udGVudFwiXHJcblx0XHRcdH1cclxuXHRcdF07XHJcblx0fSxcclxuXHJcblx0YmluZChvcHRzLCB7dGl0bGUsIGJ0bnMsIGNvbnRlbnR9KSB7XHJcblx0XHR2YXIgZGlzcG9zYWJsZTtcclxuXHJcblx0XHQvLyBzZXQgdGhlIHBhZ2UgdGl0bGVcclxuXHRcdHZhciBzZXRUaXRsZSA9IGZ1bmN0aW9uKHRpdGxlVGV4dCkge1xyXG5cdFx0XHR0aXRsZS5pbm5lclRleHQgPSB0aXRsZVRleHQ7XHJcblx0XHRcdGRvY3VtZW50LnRpdGxlID0gdGl0bGVUZXh0O1xyXG5cdFx0fTtcclxuXHJcblx0XHQvLyBhZGQgYW4gYWN0aW9uIGJ1dHRvblxyXG5cdFx0bGlmZUxpbmUub24oXCJhY3Rpb24tY3JlYXRlXCIsIG5hbWUgPT4ge1xyXG5cdFx0XHRsaWZlTGluZS5tYWtlRG9tKHtcclxuXHRcdFx0XHRwYXJlbnQ6IGJ0bnMsXHJcblx0XHRcdFx0dGFnOiBcImJ1dHRvblwiLFxyXG5cdFx0XHRcdGNsYXNzZXM6IFwidG9vbGJhci1idXR0b25cIixcclxuXHRcdFx0XHR0ZXh0OiBuYW1lLFxyXG5cdFx0XHRcdGF0dHJzOiB7XHJcblx0XHRcdFx0XHRcImRhdGEtbmFtZVwiOiBuYW1lXHJcblx0XHRcdFx0fSxcclxuXHRcdFx0XHRvbjoge1xyXG5cdFx0XHRcdFx0Y2xpY2s6ICgpID0+IGxpZmVMaW5lLmVtaXQoXCJhY3Rpb24tZXhlYy1cIiArIG5hbWUpXHJcblx0XHRcdFx0fVxyXG5cdFx0XHR9KTtcclxuXHRcdH0pO1xyXG5cclxuXHRcdC8vIHJlbW92ZSBhbiBhY3Rpb24gYnV0dG9uXHJcblx0XHRsaWZlTGluZS5vbihcImFjdGlvbi1yZW1vdmVcIiwgbmFtZSA9PiB7XHJcblx0XHRcdHZhciBidG4gPSBidG5zLnF1ZXJ5U2VsZWN0b3IoYFtkYXRhLW5hbWU9XCIke25hbWV9XCJdYCk7XHJcblxyXG5cdFx0XHRpZihidG4pIGJ0bi5yZW1vdmUoKTtcclxuXHRcdH0pO1xyXG5cclxuXHRcdC8vIHJlbW92ZSBhbGwgdGhlIGFjdGlvbiBidXR0b25zXHJcblx0XHRsaWZlTGluZS5vbihcImFjdGlvbi1yZW1vdmUtYWxsXCIsICgpID0+IGJ0bnMuaW5uZXJIVE1MID0gXCJcIik7XHJcblxyXG5cdFx0Ly8gZGlzcGxheSB0aGUgY29udGVudCBmb3IgdGhlIHZpZXdcclxuXHRcdHZhciB1cGRhdGVWaWV3ID0gKCkgPT4ge1xyXG5cdFx0XHQvLyBkZXN0cm95IGFueSBsaXN0ZW5lcnMgZnJvbSBvbGQgY29udGVudFxyXG5cdFx0XHRpZihkaXNwb3NhYmxlKSB7XHJcblx0XHRcdFx0ZGlzcG9zYWJsZS5kaXNwb3NlKCk7XHJcblx0XHRcdH1cclxuXHJcblx0XHRcdC8vIHJlbW92ZSBhbnkgYWN0aW9uIGJ1dHRvbnNcclxuXHRcdFx0bGlmZUxpbmUuZW1pdChcImFjdGlvbi1yZW1vdmUtYWxsXCIpO1xyXG5cclxuXHRcdFx0Ly8gY2xlYXIgYWxsIHRoZSBvbGQgY29udGVudFxyXG5cdFx0XHRjb250ZW50LmlubmVySFRNTCA9IFwiXCI7XHJcblxyXG5cdFx0XHQvLyBjcmVhdGUgdGhlIGRpc3Bvc2FibGUgZm9yIHRoZSBjb250ZW50XHJcblx0XHRcdGRpc3Bvc2FibGUgPSBuZXcgbGlmZUxpbmUuRGlzcG9zYWJsZSgpO1xyXG5cclxuXHRcdFx0dmFyIG1ha2VyID0gbm90Rm91bmRNYWtlciwgbWF0Y2g7XHJcblxyXG5cdFx0XHQvLyBmaW5kIHRoZSBjb3JyZWN0IGNvbnRlbnQgbWFrZXJcclxuXHRcdFx0Zm9yKGxldCAkbWFrZXIgb2YgY29udGVudE1ha2Vycykge1xyXG5cdFx0XHRcdC8vIHJ1biBhIG1hdGNoZXIgZnVuY3Rpb25cclxuXHRcdFx0XHRpZih0eXBlb2YgJG1ha2VyLm1hdGNoZXIgPT0gXCJmdW5jdGlvblwiKSB7XHJcblx0XHRcdFx0XHRtYXRjaCA9ICRtYWtlci5tYXRjaGVyKGxvY2F0aW9uLnBhdGhuYW1lKTtcclxuXHRcdFx0XHR9XHJcblx0XHRcdFx0Ly8gYSBzdHJpbmcgbWF0Y2hcclxuXHRcdFx0XHRlbHNlIGlmKHR5cGVvZiAkbWFrZXIubWF0Y2hlciA9PSBcInN0cmluZ1wiKSB7XHJcblx0XHRcdFx0XHRpZigkbWFrZXIubWF0Y2hlciA9PSBsb2NhdGlvbi5wYXRobmFtZSkge1xyXG5cdFx0XHRcdFx0XHRtYXRjaCA9ICRtYWtlci5tYXRjaGVyO1xyXG5cdFx0XHRcdFx0fVxyXG5cdFx0XHRcdH1cclxuXHRcdFx0XHQvLyBhIHJlZ2V4IG1hdGNoXHJcblx0XHRcdFx0ZWxzZSB7XHJcblx0XHRcdFx0XHRtYXRjaCA9ICRtYWtlci5tYXRjaGVyLmV4ZWMobG9jYXRpb24ucGF0aG5hbWUpO1xyXG5cdFx0XHRcdH1cclxuXHJcblx0XHRcdFx0Ly8gbWF0Y2ggZm91bmQgc3RvcCBzZWFyY2hpbmdcclxuXHRcdFx0XHRpZihtYXRjaCkge1xyXG5cdFx0XHRcdFx0bWFrZXIgPSAkbWFrZXI7XHJcblxyXG5cdFx0XHRcdFx0YnJlYWs7XHJcblx0XHRcdFx0fVxyXG5cdFx0XHR9XHJcblxyXG5cdFx0XHQvLyBtYWtlIHRoZSBjb250ZW50IGZvciB0aGlzIHJvdXRlXHJcblx0XHRcdG1ha2VyLm1ha2Uoe2Rpc3Bvc2FibGUsIHNldFRpdGxlLCBjb250ZW50LCBtYXRjaH0pO1xyXG5cdFx0fTtcclxuXHJcblx0XHQvLyBzd2l0Y2ggcGFnZXNcclxuXHRcdGxpZmVMaW5lLm5hdi5uYXZpZ2F0ZSA9IGZ1bmN0aW9uKHVybCkge1xyXG5cdFx0XHQvLyB1cGRhdGUgdGhlIHVybFxyXG5cdFx0XHRoaXN0b3J5LnB1c2hTdGF0ZShudWxsLCBudWxsLCB1cmwpO1xyXG5cclxuXHRcdFx0Ly8gc2hvdyB0aGUgbmV3IHZpZXdcclxuXHRcdFx0dXBkYXRlVmlldygpO1xyXG5cdFx0fTtcclxuXHJcblx0XHQvLyBzd2l0Y2ggcGFnZXMgd2hlbiB0aGUgdXNlciBwdXNoZXMgdGhlIGJhY2sgYnV0dG9uXHJcblx0XHR3aW5kb3cuYWRkRXZlbnRMaXN0ZW5lcihcInBvcHN0YXRlXCIsICgpID0+IHVwZGF0ZVZpZXcoKSk7XHJcblxyXG5cdFx0Ly8gc2hvdyB0aGUgaW5pdGlhbCB2aWV3XHJcblx0XHR1cGRhdGVWaWV3KCk7XHJcblx0fVxyXG59KTtcclxuXHJcbi8vIGFsbCBjb250ZW50IHByb2R1Y2Vyc1xyXG52YXIgY29udGVudE1ha2VycyA9IFtdO1xyXG5cclxuLy8gY3JlYXRlIHRoZSBuYW1lc3BhY2VcclxubGlmZUxpbmUubmF2ID0ge307XHJcblxyXG4vLyByZWdpc3RlciBhIGNvbnRlbnQgbWFrZXJcclxubGlmZUxpbmUubmF2LnJlZ2lzdGVyID0gZnVuY3Rpb24obWFrZXIpIHtcclxuXHRjb250ZW50TWFrZXJzLnB1c2gobWFrZXIpO1xyXG59O1xyXG5cclxuLy8gdGhlIGZhbGwgYmFjayBtYWtlciBmb3Igbm8gc3VjaCBwYWdlXHJcbnZhciBub3RGb3VuZE1ha2VyID0ge1xyXG5cdG1ha2Uoe3NldFRpdGxlLCBjb250ZW50fSkge1xyXG5cdFx0Ly8gdXBkYXRlIHRoZSBwYWdlIHRpdGxlXHJcblx0XHRzZXRUaXRsZShcIk5vdCBmb3VuZFwiKTtcclxuXHJcblx0XHRsaWZlTGluZS5tYWtlRG9tKHtcclxuXHRcdFx0cGFyZW50OiBjb250ZW50LFxyXG5cdFx0XHRjbGFzc2VzOiBcImNvbnRlbnQtcGFkZGVkXCIsXHJcblx0XHRcdGNoaWxkcmVuOiBbXHJcblx0XHRcdFx0e1xyXG5cdFx0XHRcdFx0dGFnOiBcInNwYW5cIixcclxuXHRcdFx0XHRcdHRleHQ6IFwiVGhlIHBhZ2UgeW91IGFyZSBsb29raW5nIGZvciBjb3VsZCBub3QgYmUgZm91bmQuIFwiXHJcblx0XHRcdFx0fSxcclxuXHRcdFx0XHR7XHJcblx0XHRcdFx0XHR3aWRnZXQ6IFwibGlua1wiLFxyXG5cdFx0XHRcdFx0aHJlZjogXCIvXCIsXHJcblx0XHRcdFx0XHR0ZXh0OiBcIkdvIGhvbWVcIlxyXG5cdFx0XHRcdH1cclxuXHRcdFx0XVxyXG5cdFx0fSk7XHJcblx0fVxyXG59O1xyXG4iLCIvKipcclxuICogQ3JlYXRlIGFuIGlucHV0IGZpZWxkXHJcbiAqL1xyXG5cclxubGlmZUxpbmUubWFrZURvbS5yZWdpc3RlcihcImlucHV0XCIsIHtcclxuXHRtYWtlKHt0YWcsIHR5cGUsIHZhbHVlLCBjaGFuZ2UsIGJpbmQsIHByb3AsIHBsYWNlaG9sZGVyLCBjbGFzc2VzfSkge1xyXG5cdFx0Ly8gc2V0IHRoZSBpbml0aWFsIHZhbHVlIG9mIHRoZSBib3VuZCBvYmplY3RcclxuXHRcdGlmKHR5cGVvZiBiaW5kID09IFwib2JqZWN0XCIgJiYgIXZhbHVlKSB7XHJcblx0XHRcdHZhbHVlID0gYmluZFtwcm9wXTtcclxuXHRcdH1cclxuXHJcblx0XHR2YXIgaW5wdXQgPSB7XHJcblx0XHRcdHRhZzogdGFnIHx8IFwiaW5wdXRcIixcclxuXHRcdFx0Y2xhc3NlczogY2xhc3NlcyB8fCBgJHt0YWcgPT0gXCJ0ZXh0YXJlYVwiID8gXCJ0ZXh0YXJlYVwiIDogXCJpbnB1dFwifS1maWxsYCxcclxuXHRcdFx0YXR0cnM6IHt9LFxyXG5cdFx0XHRvbjoge1xyXG5cdFx0XHRcdGlucHV0OiBlID0+IHtcclxuXHRcdFx0XHRcdC8vIHVwZGF0ZSB0aGUgcHJvcGVydHkgY2hhbmdlZFxyXG5cdFx0XHRcdFx0aWYodHlwZW9mIGJpbmQgPT0gXCJvYmplY3RcIikge1xyXG5cdFx0XHRcdFx0XHRiaW5kW3Byb3BdID0gZS50YXJnZXQudmFsdWU7XHJcblx0XHRcdFx0XHR9XHJcblxyXG5cdFx0XHRcdFx0Ly8gY2FsbCB0aGUgY2FsbGJhY2tcclxuXHRcdFx0XHRcdGlmKHR5cGVvZiBjaGFuZ2UgPT0gXCJmdW5jdGlvblwiKSB7XHJcblx0XHRcdFx0XHRcdGNoYW5nZShlLnRhcmdldC52YWx1ZSk7XHJcblx0XHRcdFx0XHR9XHJcblx0XHRcdFx0fVxyXG5cdFx0XHR9XHJcblx0XHR9O1xyXG5cclxuXHRcdC8vIGF0dGFjaCB2YWx1ZXMgaWYgdGhleSBhcmUgZ2l2ZW5cclxuXHRcdGlmKHR5cGUpIGlucHV0LmF0dHJzLnR5cGUgPSB0eXBlO1xyXG5cdFx0aWYodmFsdWUpIGlucHV0LmF0dHJzLnZhbHVlID0gdmFsdWU7XHJcblx0XHRpZihwbGFjZWhvbGRlcikgaW5wdXQuYXR0cnMucGxhY2Vob2xkZXIgPSBwbGFjZWhvbGRlcjtcclxuXHJcblx0XHQvLyBmb3IgdGV4dGFyZWFzIHNldCBpbm5lclRleHRcclxuXHRcdGlmKHRhZyA9PSBcInRleHRhcmVhXCIpIHtcclxuXHRcdFx0aW5wdXQudGV4dCA9IHZhbHVlO1xyXG5cdFx0fVxyXG5cclxuXHRcdHJldHVybiBpbnB1dDtcclxuXHR9XHJcbn0pO1xyXG4iLCIvKipcclxuICogQSB3aWRnZXQgdGhhdCBjcmVhdGVzIGEgbGluayB0aGF0IGhvb2tzIGludG8gdGhlIG5hdmlnYXRvclxyXG4gKi9cclxuXHJcbmxpZmVMaW5lLm1ha2VEb20ucmVnaXN0ZXIoXCJsaW5rXCIsIHtcclxuXHRtYWtlKG9wdHMpIHtcclxuXHRcdHJldHVybiB7XHJcblx0XHRcdHRhZzogXCJhXCIsXHJcblx0XHRcdGF0dHJzOiB7XHJcblx0XHRcdFx0aHJlZjogb3B0cy5ocmVmXHJcblx0XHRcdH0sXHJcblx0XHRcdG9uOiB7XHJcblx0XHRcdFx0Y2xpY2s6IGUgPT4ge1xyXG5cdFx0XHRcdFx0Ly8gZG9uJ3Qgb3ZlciByaWRlIGN0cmwgb3IgYWx0IG9yIHNoaWZ0IGNsaWNrc1xyXG5cdFx0XHRcdFx0aWYoZS5jdHJsS2V5IHx8IGUuYWx0S2V5IHx8IGUuc2hpZnRLZXkpIHJldHVybjtcclxuXHJcblx0XHRcdFx0XHQvLyBkb24ndCBuYXZpZ2F0ZSB0aGUgcGFnZVxyXG5cdFx0XHRcdFx0ZS5wcmV2ZW50RGVmYXVsdCgpO1xyXG5cclxuXHRcdFx0XHRcdGxpZmVMaW5lLm5hdi5uYXZpZ2F0ZShvcHRzLmhyZWYpXHJcblx0XHRcdFx0fVxyXG5cdFx0XHR9LFxyXG5cdFx0XHR0ZXh0OiBvcHRzLnRleHRcclxuXHRcdH07XHJcblx0fVxyXG59KTtcclxuIiwiLyoqXHJcbiAqIERpc3BsYXkgYSBsaXN0IHdpdGggZ3JvdXAgaGVhZGluZ3NcclxuICovXHJcblxyXG5saWZlTGluZS5tYWtlRG9tLnJlZ2lzdGVyKFwibGlzdFwiLCB7XHJcblx0bWFrZSh7aXRlbXN9KSB7XHJcblx0XHQvLyBhZGQgYWxsIHRoZSBncm91cHNcclxuXHRcdHJldHVybiBPYmplY3QuZ2V0T3duUHJvcGVydHlOYW1lcyhpdGVtcylcclxuXHJcblx0XHQubWFwKGdyb3VwTmFtZSA9PiBtYWtlR3JvdXAoZ3JvdXBOYW1lLCBpdGVtc1tncm91cE5hbWVdKSk7XHJcblx0fVxyXG59KTtcclxuXHJcbi8vIG1ha2UgYSBzaW5nbGUgZ3JvdXBcclxudmFyIG1ha2VHcm91cCA9IGZ1bmN0aW9uKG5hbWUsIGl0ZW1zLCBwYXJlbnQpIHtcclxuXHQvLyBhZGQgdGhlIGxpc3QgaGVhZGVyXHJcblx0aXRlbXMudW5zaGlmdCh7XHJcblx0XHRjbGFzc2VzOiBcImxpc3QtaGVhZGVyXCIsXHJcblx0XHR0ZXh0OiBuYW1lXHJcblx0fSk7XHJcblxyXG5cdC8vIHJlbmRlciB0aGUgaXRlbVxyXG5cdHJldHVybiB7XHJcblx0XHRwYXJlbnQsXHJcblx0XHRjbGFzc2VzOiBcImxpc3Qtc2VjdGlvblwiLFxyXG5cdFx0Y2hpbGRyZW46IGl0ZW1zLm1hcCgoaXRlbSwgaW5kZXgpID0+IHtcclxuXHRcdFx0Ly8gZG9uJ3QgbW9kaWZ5IHRoZSBoZWFkZXJcclxuXHRcdFx0aWYoaW5kZXggPT09IDApIHJldHVybiBpdGVtO1xyXG5cclxuXHRcdFx0dmFyIGl0ZW1Eb207XHJcblxyXG5cdFx0XHQvLyBjcmVhdGUgYW4gaXRlbVxyXG5cdFx0XHRpZih0eXBlb2YgaXRlbSAhPSBcInN0cmluZ1wiKSB7XHJcblx0XHRcdFx0aXRlbURvbSA9IHtcclxuXHRcdFx0XHRcdGNsYXNzZXM6IFwibGlzdC1pdGVtXCIsXHJcblx0XHRcdFx0XHRjaGlsZHJlbjogKGl0ZW0uaXRlbXMgfHwgaXRlbSkubWFwKGl0ZW0gPT4ge1xyXG5cdFx0XHRcdFx0XHRyZXR1cm4ge1xyXG5cdFx0XHRcdFx0XHRcdC8vIGdldCB0aGUgbmFtZSBvZiB0aGUgaXRlbVxyXG5cdFx0XHRcdFx0XHRcdHRleHQ6IHR5cGVvZiBpdGVtID09IFwic3RyaW5nXCIgPyBpdGVtIDogaXRlbS50ZXh0LFxyXG5cdFx0XHRcdFx0XHRcdC8vIHNldCB3aGV0aGVyIHRoZSBpdGVtIHNob3VsZCBncm93XHJcblx0XHRcdFx0XHRcdFx0Y2xhc3NlczogaXRlbS5ncm93ID8gXCJsaXN0LWl0ZW0tZ3Jvd1wiIDogXCJsaXN0LWl0ZW0tcGFydFwiXHJcblx0XHRcdFx0XHRcdH07XHJcblx0XHRcdFx0XHR9KVxyXG5cdFx0XHRcdH07XHJcblx0XHRcdH1cclxuXHRcdFx0ZWxzZSB7XHJcblx0XHRcdFx0aXRlbURvbSA9IHtcclxuXHRcdFx0XHRcdGNsYXNzZXM6IFwibGlzdC1pdGVtXCIsXHJcblx0XHRcdFx0XHR0ZXh0OiBpdGVtXHJcblx0XHRcdFx0fTtcclxuXHRcdFx0fVxyXG5cclxuXHRcdFx0Ly8gbWFrZSB0aGUgaXRlbSBhIGxpbmtcclxuXHRcdFx0aWYoaXRlbS5ocmVmKSB7XHJcblx0XHRcdFx0aXRlbURvbS5vbiA9IHtcclxuXHRcdFx0XHRcdGNsaWNrOiAoKSA9PiBsaWZlTGluZS5uYXYubmF2aWdhdGUoaXRlbS5ocmVmKVxyXG5cdFx0XHRcdH07XHJcblx0XHRcdH1cclxuXHJcblx0XHRcdHJldHVybiBpdGVtRG9tO1xyXG5cdFx0fSlcclxuXHR9O1xyXG59O1xyXG4iLCIvKipcclxuICogVGhlIHdpZGdldCBmb3IgdGhlIHNpZGViYXJcclxuICovXHJcblxyXG5saWZlTGluZS5tYWtlRG9tLnJlZ2lzdGVyKFwic2lkZWJhclwiLCB7XHJcblx0bWFrZSgpIHtcclxuXHRcdHJldHVybiBbXHJcblx0XHRcdHtcclxuXHRcdFx0XHRjbGFzc2VzOiBcInNpZGViYXJcIixcclxuXHRcdFx0XHRuYW1lOiBcInNpZGViYXJcIixcclxuXHRcdFx0XHRjaGlsZHJlbjogW1xyXG5cdFx0XHRcdFx0e1xyXG5cdFx0XHRcdFx0XHRjbGFzc2VzOiBbXCJzaWRlYmFyLWFjdGlvbnNcIiwgXCJoaWRkZW5cIl0sXHJcblx0XHRcdFx0XHRcdG5hbWU6IFwiYWN0aW9uc1wiLFxyXG5cdFx0XHRcdFx0XHRjaGlsZHJlbjogW1xyXG5cdFx0XHRcdFx0XHRcdHtcclxuXHRcdFx0XHRcdFx0XHRcdGNsYXNzZXM6IFwic2lkZWJhci1oZWFkaW5nXCIsXHJcblx0XHRcdFx0XHRcdFx0XHR0ZXh0OiBcIlBhZ2UgYWN0aW9uc1wiXHJcblx0XHRcdFx0XHRcdFx0fVxyXG5cdFx0XHRcdFx0XHRdXHJcblx0XHRcdFx0XHR9LFxyXG5cdFx0XHRcdFx0e1xyXG5cdFx0XHRcdFx0XHRjbGFzc2VzOiBcInNpZGViYXItaGVhZGluZ1wiLFxyXG5cdFx0XHRcdFx0XHR0ZXh0OiBcIk1vcmUgYWN0aW9uc1wiXHJcblx0XHRcdFx0XHR9XHJcblx0XHRcdFx0XVxyXG5cdFx0XHR9LFxyXG5cdFx0XHR7XHJcblx0XHRcdFx0Y2xhc3NlczogXCJzaGFkZVwiLFxyXG5cdFx0XHRcdG9uOiB7XHJcblx0XHRcdFx0XHQvLyBjbG9zZSB0aGUgc2lkZWJhclxyXG5cdFx0XHRcdFx0Y2xpY2s6ICgpID0+IGRvY3VtZW50LmJvZHkuY2xhc3NMaXN0LnJlbW92ZShcInNpZGViYXItb3BlblwiKVxyXG5cdFx0XHRcdH1cclxuXHRcdFx0fVxyXG5cdFx0XTtcclxuXHR9LFxyXG5cclxuXHRiaW5kKG9wdHMsIHthY3Rpb25zLCBzaWRlYmFyfSkge1xyXG5cdFx0Ly8gYWRkIGEgY29tbWFuZCB0byB0aGUgc2lkZWJhclxyXG5cdFx0bGlmZUxpbmUuYWRkQ29tbWFuZCA9IGZ1bmN0aW9uKG5hbWUsIGZuKSB7XHJcblx0XHRcdC8vIG1ha2UgdGhlIHNpZGViYXIgaXRlbVxyXG5cdFx0XHR2YXIge2l0ZW19ID0gbGlmZUxpbmUubWFrZURvbSh7XHJcblx0XHRcdFx0cGFyZW50OiBzaWRlYmFyLFxyXG5cdFx0XHRcdHRhZzogXCJkaXZcIixcclxuXHRcdFx0XHRuYW1lOiBcIml0ZW1cIixcclxuXHRcdFx0XHRjbGFzc2VzOiBcInNpZGViYXItaXRlbVwiLFxyXG5cdFx0XHRcdHRleHQ6IG5hbWUsXHJcblx0XHRcdFx0b246IHtcclxuXHRcdFx0XHRcdGNsaWNrOiAoKSA9PiB7XHJcblx0XHRcdFx0XHRcdC8vIGNsb3NlIHRoZSBzaWRlYmFyXHJcblx0XHRcdFx0XHRcdGRvY3VtZW50LmJvZHkuY2xhc3NMaXN0LnJlbW92ZShcInNpZGViYXItb3BlblwiKTtcclxuXHJcblx0XHRcdFx0XHRcdC8vIGNhbGwgdGhlIGxpc3RlbmVyXHJcblx0XHRcdFx0XHRcdGZuKCk7XHJcblx0XHRcdFx0XHR9XHJcblx0XHRcdFx0fVxyXG5cdFx0XHR9KTtcclxuXHJcblx0XHRcdHJldHVybiB7XHJcblx0XHRcdFx0dW5zdWJzY3JpYmU6ICgpID0+IGl0ZW0ucmVtb3ZlKClcclxuXHRcdFx0fTtcclxuXHRcdH07XHJcblxyXG5cdFx0Ly8gYWRkIGEgbmF2aWdhdGlvbmFsIGNvbW1hbmRcclxuXHRcdGxpZmVMaW5lLmFkZE5hdkNvbW1hbmQgPSBmdW5jdGlvbihuYW1lLCB0bykge1xyXG5cdFx0XHRsaWZlTGluZS5hZGRDb21tYW5kKG5hbWUsICgpID0+IGxpZmVMaW5lLm5hdi5uYXZpZ2F0ZSh0bykpO1xyXG5cdFx0fTtcclxuXHJcblx0XHQvLyBhZGQgYSBzaWRlYmFyIGFjdGlvblxyXG5cdFx0bGlmZUxpbmUub24oXCJhY3Rpb24tY3JlYXRlXCIsIG5hbWUgPT4ge1xyXG5cdFx0XHQvLyBzaG93IHRoZSBhY3Rpb25zXHJcblx0XHRcdGFjdGlvbnMuY2xhc3NMaXN0LnJlbW92ZShcImhpZGRlblwiKTtcclxuXHJcblx0XHRcdC8vIGNyZWF0ZSB0aGUgYnV0dG9uXHJcblx0XHRcdGxpZmVMaW5lLm1ha2VEb20oe1xyXG5cdFx0XHRcdHBhcmVudDogYWN0aW9ucyxcclxuXHRcdFx0XHR0YWc6IFwiZGl2XCIsXHJcblx0XHRcdFx0bmFtZTogXCJpdGVtXCIsXHJcblx0XHRcdFx0Y2xhc3NlczogXCJzaWRlYmFyLWl0ZW1cIixcclxuXHRcdFx0XHR0ZXh0OiBuYW1lLFxyXG5cdFx0XHRcdGF0dHJzOiB7XHJcblx0XHRcdFx0XHRcImRhdGEtbmFtZVwiOiBuYW1lXHJcblx0XHRcdFx0fSxcclxuXHRcdFx0XHRvbjoge1xyXG5cdFx0XHRcdFx0Y2xpY2s6ICgpID0+IHtcclxuXHRcdFx0XHRcdFx0Ly8gY2xvc2UgdGhlIHNpZGViYXJcclxuXHRcdFx0XHRcdFx0ZG9jdW1lbnQuYm9keS5jbGFzc0xpc3QucmVtb3ZlKFwic2lkZWJhci1vcGVuXCIpO1xyXG5cclxuXHRcdFx0XHRcdFx0Ly8gdHJpZ2dlciB0aGUgYWN0aW9uXHJcblx0XHRcdFx0XHRcdGxpZmVMaW5lLmVtaXQoXCJhY3Rpb24tZXhlYy1cIiArIG5hbWUpO1xyXG5cdFx0XHRcdFx0fVxyXG5cdFx0XHRcdH1cclxuXHRcdFx0fSk7XHJcblxyXG5cdFx0XHQvLyByZW1vdmUgYSBzaWRlYmFyIGFjdGlvblxyXG5cdFx0XHRsaWZlTGluZS5vbihcImFjdGlvbi1yZW1vdmVcIiwgbmFtZSA9PiB7XHJcblx0XHRcdFx0Ly8gcmVtb3ZlIHRoZSBidXR0b25cclxuXHRcdFx0XHR2YXIgYnRuID0gYWN0aW9ucy5xdWVyeVNlbGVjdG9yKGBbZGF0YS1uYW1lPVwiJHtuYW1lfVwiXWApO1xyXG5cclxuXHRcdFx0XHRpZihidG4pIGJ0bi5yZW1vdmUoKTtcclxuXHJcblx0XHRcdFx0Ly8gaGlkZSB0aGUgcGFnZSBhY3Rpb25zIGlmIHRoZXJlIGFyZSBub25lXHJcblx0XHRcdFx0aWYoYWN0aW9ucy5jaGlsZHJlbi5sZW5ndGggPT0gMSkge1xyXG5cdFx0XHRcdFx0YWN0aW9ucy5jbGFzc0xpc3QuYWRkKFwiaGlkZGVuXCIpO1xyXG5cdFx0XHRcdH1cclxuXHRcdFx0fSk7XHJcblxyXG5cdFx0XHQvLyByZW1vdmUgYWxsIHRoZSBzaWRlYmFyIGFjdGlvbnNcclxuXHRcdFx0bGlmZUxpbmUub24oXCJhY3Rpb24tcmVtb3ZlLWFsbFwiLCAoKSA9PiB7XHJcblx0XHRcdFx0Ly8gcmVtb3ZlIGFsbCB0aGUgYWN0aW9uc1xyXG5cdFx0XHRcdHZhciBfYWN0aW9ucyA9IEFycmF5LmZyb20oYWN0aW9ucy5xdWVyeVNlbGVjdG9yQWxsKFwiLnNpZGViYXItaXRlbVwiKSk7XHJcblxyXG5cdFx0XHRcdF9hY3Rpb25zLmZvckVhY2goYWN0aW9uID0+IGFjdGlvbi5yZW1vdmUoKSk7XHJcblxyXG5cdFx0XHRcdC8vIHNpZGUgdGhlIHBhZ2UgYWN0aW9uc1xyXG5cdFx0XHRcdGFjdGlvbnMuY2xhc3NMaXN0LmFkZChcImhpZGRlblwiKTtcclxuXHRcdFx0fSk7XHJcblx0XHR9KTtcclxuXHR9XHJcbn0pO1xyXG4iLCIvKipcclxuICogQSByb3cgb2YgcmFkaW8gc3R5bGUgYnV0dG9uc1xyXG4gKi9cclxuXHJcbmxpZmVMaW5lLm1ha2VEb20ucmVnaXN0ZXIoXCJ0b2dnbGUtYnRuc1wiLCB7XHJcblx0bWFrZSh7YnRucywgdmFsdWV9KSB7XHJcblx0XHQvLyBhdXRvIHNlbGVjdCB0aGUgZmlyc3QgYnV0dG9uXHJcblx0XHRpZighdmFsdWUpIHtcclxuXHRcdFx0dmFsdWUgPSB0eXBlb2YgYnRuc1swXSA9PSBcInN0cmluZ1wiID8gYnRuc1swXSA6IGJ0bnNbMF0udmFsdWU7XHJcblx0XHR9XHJcblxyXG5cdFx0cmV0dXJuIHtcclxuXHRcdFx0bmFtZTogXCJ0b2dnbGVCYXJcIixcclxuXHRcdFx0Y2xhc3NlczogXCJ0b2dnbGUtYmFyXCIsXHJcblx0XHRcdGNoaWxkcmVuOiBidG5zLm1hcChidG4gPT4ge1xyXG5cdFx0XHRcdC8vIGNvbnZlcnQgdGhlIHBsYWluIHN0cmluZyB0byBhbiBvYmplY3RcclxuXHRcdFx0XHRpZih0eXBlb2YgYnRuID09IFwic3RyaW5nXCIpIHtcclxuXHRcdFx0XHRcdGJ0biA9IHsgdGV4dDogYnRuLCB2YWx1ZTogYnRuIH07XHJcblx0XHRcdFx0fVxyXG5cclxuXHRcdFx0XHR2YXIgY2xhc3NlcyA9IFtcInRvZ2dsZS1idG5cIl07XHJcblxyXG5cdFx0XHRcdC8vIGFkZCB0aGUgc2VsZWN0ZWQgY2xhc3NcclxuXHRcdFx0XHRpZih2YWx1ZSA9PSBidG4udmFsdWUpIHtcclxuXHRcdFx0XHRcdGNsYXNzZXMucHVzaChcInRvZ2dsZS1idG4tc2VsZWN0ZWRcIik7XHJcblxyXG5cdFx0XHRcdFx0Ly8gZG9uJ3Qgc2VsZWN0IHR3byBidXR0b25zXHJcblx0XHRcdFx0XHR2YWx1ZSA9IHVuZGVmaW5lZDtcclxuXHRcdFx0XHR9XHJcblxyXG5cdFx0XHRcdHJldHVybiB7XHJcblx0XHRcdFx0XHR0YWc6IFwiYnV0dG9uXCIsXHJcblx0XHRcdFx0XHRjbGFzc2VzLFxyXG5cdFx0XHRcdFx0dGV4dDogYnRuLnRleHQsXHJcblx0XHRcdFx0XHRhdHRyczoge1xyXG5cdFx0XHRcdFx0XHRcImRhdGEtdmFsdWVcIjogYnRuLnZhbHVlXHJcblx0XHRcdFx0XHR9XHJcblx0XHRcdFx0fTtcclxuXHRcdFx0fSlcclxuXHRcdH07XHJcblx0fSxcclxuXHJcblx0YmluZCh7Y2hhbmdlfSwge3RvZ2dsZUJhcn0pIHtcclxuXHRcdC8vIGF0dGFjaCBsaXN0ZW5lcnNcclxuXHRcdGZvcihsZXQgYnRuIG9mIHRvZ2dsZUJhci5xdWVyeVNlbGVjdG9yQWxsKFwiLnRvZ2dsZS1idG5cIikpIHtcclxuXHRcdFx0YnRuLmFkZEV2ZW50TGlzdGVuZXIoXCJjbGlja1wiLCAoKSA9PiB7XHJcblx0XHRcdFx0dmFyIHNlbGVjdGVkID0gdG9nZ2xlQmFyLnF1ZXJ5U2VsZWN0b3IoXCIudG9nZ2xlLWJ0bi1zZWxlY3RlZFwiKTtcclxuXHJcblx0XHRcdFx0Ly8gdGhlIGJ1dHRvbiBoYXMgYWxyZWFkeSBiZWVuIHNlbGVjdGVkXHJcblx0XHRcdFx0aWYoc2VsZWN0ZWQgPT0gYnRuKSB7XHJcblx0XHRcdFx0XHRyZXR1cm47XHJcblx0XHRcdFx0fVxyXG5cclxuXHRcdFx0XHQvLyB1bnRvZ2dsZSB0aGUgb3RoZXIgYnV0dG9uXHJcblx0XHRcdFx0aWYoc2VsZWN0ZWQpIHtcclxuXHRcdFx0XHRcdHNlbGVjdGVkLmNsYXNzTGlzdC5yZW1vdmUoXCJ0b2dnbGUtYnRuLXNlbGVjdGVkXCIpO1xyXG5cdFx0XHRcdH1cclxuXHJcblx0XHRcdFx0Ly8gc2VsZWN0IHRoaXMgYnV0dG9uXHJcblx0XHRcdFx0YnRuLmNsYXNzTGlzdC5hZGQoXCJ0b2dnbGUtYnRuLXNlbGVjdGVkXCIpO1xyXG5cclxuXHRcdFx0XHQvLyB0cmlnZ2VyIGEgc2VsZWN0aW9uIGNoYW5nZVxyXG5cdFx0XHRcdGNoYW5nZShidG4uZGF0YXNldC52YWx1ZSk7XHJcblx0XHRcdH0pO1xyXG5cdFx0fVxyXG5cdH1cclxufSk7XHJcbiIsIi8qKlxyXG4gKiBLZWVwIGEgbGlzdCBvZiBzdWJzY3JpcHRpb25zIHRvIHVuc3Vic2NyaWJlIGZyb20gdG9nZXRoZXJcclxuICovXHJcblxyXG5leHBvcnQgZGVmYXVsdCBjbGFzcyBEaXNwb3NhYmxlIHtcclxuXHRjb25zdHJ1Y3RvcigpIHtcclxuXHRcdHRoaXMuX3N1YnNjcmlwdGlvbnMgPSBbXTtcclxuXHR9XHJcblxyXG5cdC8vIFVuc3Vic2NyaWJlIGZyb20gYWxsIHN1YnNjcmlwdGlvbnNcclxuXHRkaXNwb3NlKCkge1xyXG5cdFx0Ly8gcmVtb3ZlIHRoZSBmaXJzdCBzdWJzY3JpcHRpb24gdW50aWwgdGhlcmUgYXJlIG5vbmUgbGVmdFxyXG5cdFx0d2hpbGUodGhpcy5fc3Vic2NyaXB0aW9ucy5sZW5ndGggPiAwKSB7XHJcblx0XHRcdHRoaXMuX3N1YnNjcmlwdGlvbnMuc2hpZnQoKS51bnN1YnNjcmliZSgpO1xyXG5cdFx0fVxyXG5cdH1cclxuXHJcblx0Ly8gQWRkIGEgc3Vic2NyaXB0aW9uIHRvIHRoZSBkaXNwb3NhYmxlXHJcblx0YWRkKHN1YnNjcmlwdGlvbikge1xyXG5cdFx0Ly8gY29weSB0aGUgZGlzcG9zYWJsZVxyXG5cdFx0aWYoc3Vic2NyaXB0aW9uIGluc3RhbmNlb2YgRGlzcG9zYWJsZSkge1xyXG5cdFx0XHQvLyBjb3B5IHRoZSBzdWJzY3JpcHRpb25zIGZyb20gdGhlIGRpc3Bvc2FibGVcclxuXHRcdFx0dGhpcy5fc3Vic2NyaXB0aW9ucyA9IHRoaXMuX3N1YnNjcmlwdGlvbnMuY29uY2F0KHN1YnNjcmlwdGlvbi5fc3Vic2NyaXB0aW9ucyk7XHJcblxyXG5cdFx0XHQvLyByZW1vdmUgdGhlIHJlZnJlbmNlcyBmcm9tIHRoZSBkaXNwb3NhYmxlXHJcblx0XHRcdHN1YnNjcmlwdGlvbi5fc3Vic2NyaXB0aW9ucyA9IFtdO1xyXG5cdFx0fVxyXG5cdFx0Ly8gYWRkIGEgc3Vic2NyaXB0aW9uXHJcblx0XHRlbHNlIHtcclxuXHRcdFx0dGhpcy5fc3Vic2NyaXB0aW9ucy5wdXNoKHN1YnNjcmlwdGlvbik7XHJcblx0XHR9XHJcblx0fVxyXG5cclxuXHQvLyBkaXNwb3NlIHdoZW4gYW4gZXZlbnQgaXMgZmlyZWRcclxuXHRkaXNwb3NlT24oZW1pdHRlciwgZXZlbnQpIHtcclxuXHRcdHRoaXMuYWRkKGVtaXR0ZXIub24oZXZlbnQsICgpID0+IHRoaXMuZGlzcG9zZSgpKSk7XHJcblx0fVxyXG59O1xyXG4iLCIvKipcclxuICogQSBiYXNpYyBldmVudCBlbWl0dGVyXHJcbiAqL1xyXG5cclxuZXhwb3J0IGRlZmF1bHQgY2xhc3MgRXZlbnRFbWl0dGVyIHtcclxuXHRjb25zdHJ1Y3RvcigpIHtcclxuXHRcdHRoaXMuX2xpc3RlbmVycyA9IHt9O1xyXG5cdH1cclxuXHJcblx0LyoqXHJcblx0ICogQWRkIGFuIGV2ZW50IGxpc3RlbmVyXHJcblx0ICovXHJcblx0b24obmFtZSwgbGlzdGVuZXIpIHtcclxuXHRcdC8vIGlmIHdlIGRvbid0IGhhdmUgYW4gZXhpc3RpbmcgbGlzdGVuZXJzIGFycmF5IGNyZWF0ZSBvbmVcclxuXHRcdGlmKCF0aGlzLl9saXN0ZW5lcnNbbmFtZV0pIHtcclxuXHRcdFx0dGhpcy5fbGlzdGVuZXJzW25hbWVdID0gW107XHJcblx0XHR9XHJcblxyXG5cdFx0Ly8gYWRkIHRoZSBsaXN0ZW5lclxyXG5cdFx0dGhpcy5fbGlzdGVuZXJzW25hbWVdLnB1c2gobGlzdGVuZXIpO1xyXG5cclxuXHRcdC8vIGdpdmUgdGhlbSBhIHN1YnNjcmlwdGlvblxyXG5cdFx0cmV0dXJuIHtcclxuXHRcdFx0X2xpc3RlbmVyOiBsaXN0ZW5lcixcclxuXHJcblx0XHRcdHVuc3Vic2NyaWJlOiAoKSA9PiB7XHJcblx0XHRcdFx0Ly8gZmluZCB0aGUgbGlzdGVuZXJcclxuXHRcdFx0XHR2YXIgaW5kZXggPSB0aGlzLl9saXN0ZW5lcnNbbmFtZV0uaW5kZXhPZihsaXN0ZW5lcik7XHJcblxyXG5cdFx0XHRcdGlmKGluZGV4ICE9PSAtMSkge1xyXG5cdFx0XHRcdFx0dGhpcy5fbGlzdGVuZXJzW25hbWVdLnNwbGljZShpbmRleCwgMSk7XHJcblx0XHRcdFx0fVxyXG5cdFx0XHR9XHJcblx0XHR9O1xyXG5cdH1cclxuXHJcblx0LyoqXHJcblx0ICogRW1pdCBhbiBldmVudFxyXG5cdCAqL1xyXG5cdGVtaXQobmFtZSwgLi4uYXJncykge1xyXG5cdFx0Ly8gY2hlY2sgZm9yIGxpc3RlbmVyc1xyXG5cdFx0aWYodGhpcy5fbGlzdGVuZXJzW25hbWVdKSB7XHJcblx0XHRcdGZvcihsZXQgbGlzdGVuZXIgb2YgdGhpcy5fbGlzdGVuZXJzW25hbWVdKSB7XHJcblx0XHRcdFx0Ly8gY2FsbCB0aGUgbGlzdGVuZXJzXHJcblx0XHRcdFx0bGlzdGVuZXIoLi4uYXJncyk7XHJcblx0XHRcdH1cclxuXHRcdH1cclxuXHR9XHJcblxyXG5cdC8qKlxyXG5cdCAqIEVtaXQgYW4gZXZlbnQgYW5kIHNraXAgc29tZSBsaXN0ZW5lcnNcclxuXHQgKi9cclxuXHRwYXJ0aWFsRW1pdChuYW1lLCBza2lwcyA9IFtdLCAuLi5hcmdzKSB7XHJcblx0XHQvLyBhbGxvdyBhIHNpbmdsZSBpdGVtXHJcblx0XHRpZighQXJyYXkuaXNBcnJheShza2lwcykpIHtcclxuXHRcdFx0c2tpcHMgPSBbc2tpcHNdO1xyXG5cdFx0fVxyXG5cclxuXHRcdC8vIGNoZWNrIGZvciBsaXN0ZW5lcnNcclxuXHRcdGlmKHRoaXMuX2xpc3RlbmVyc1tuYW1lXSkge1xyXG5cdFx0XHRmb3IobGV0IGxpc3RlbmVyIG9mIHRoaXMuX2xpc3RlbmVyc1tuYW1lXSkge1xyXG5cdFx0XHRcdC8vIHRoaXMgZXZlbnQgbGlzdGVuZXIgaXMgYmVpbmcgc2tpcGVkXHJcblx0XHRcdFx0aWYoc2tpcHMuZmluZChza2lwID0+IHNraXAuX2xpc3RlbmVyID09IGxpc3RlbmVyKSkge1xyXG5cdFx0XHRcdFx0Y29udGludWU7XHJcblx0XHRcdFx0fVxyXG5cclxuXHRcdFx0XHQvLyBjYWxsIHRoZSBsaXN0ZW5lcnNcclxuXHRcdFx0XHRsaXN0ZW5lciguLi5hcmdzKTtcclxuXHRcdFx0fVxyXG5cdFx0fVxyXG5cdH1cclxufVxyXG4iLCIvKipcclxuICogQ3JlYXRlIGEgZ2xvYmFsIG9iamVjdCB3aXRoIGNvbW1vbmx5IHVzZWQgbW9kdWxlcyB0byBhdm9pZCA1MCBtaWxsaW9uIHJlcXVpcmVzXHJcbiAqL1xyXG5cclxuaW1wb3J0IEV2ZW50RW1pdHRlciBmcm9tIFwiLi9ldmVudC1lbWl0dGVyXCI7XHJcblxyXG52YXIgbGlmZUxpbmUgPSBuZXcgRXZlbnRFbWl0dGVyKCk7XHJcblxyXG4vLyBwbGF0Zm9ybSBkZXRlY3Rpb25cclxubGlmZUxpbmUubm9kZSA9IHR5cGVvZiBwcm9jZXNzID09IFwib2JqZWN0XCI7XHJcbmxpZmVMaW5lLmJyb3dzZXIgPSB0eXBlb2Ygd2luZG93ID09IFwib2JqZWN0XCI7XHJcblxyXG4vLyBhdHRhY2ggdXRpbHNcclxubGlmZUxpbmUuRGlzcG9zYWJsZSA9IHJlcXVpcmUoXCIuL2Rpc3Bvc2FibGVcIikuZGVmYXVsdDtcclxubGlmZUxpbmUuRXZlbnRFbWl0dGVyID0gRXZlbnRFbWl0dGVyO1xyXG5cclxuLy8gYXR0YWNoIGxpZmVsaW5lIHRvIHRoZSBnbG9iYWwgb2JqZWN0XHJcbihsaWZlTGluZS5ub2RlID8gZ2xvYmFsIDogYnJvd3NlcikubGlmZUxpbmUgPSBsaWZlTGluZTtcclxuIl19
