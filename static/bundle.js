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
var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

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
exports.store = function (name) {
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

},{"./util/dom-maker":6}],4:[function(require,module,exports){
// create the global object
require("../common/global");
require("./global");

// load all the widgets
require("./widgets/sidebar");
require("./widgets/content");
require("./widgets/link");

// load all the views
var listViews = require("./views/lists");
require("./views/item");
require("./views/edit");
require("./views/login");
require("./views/account");
require("./views/users");

// set up the data store

var _require = require("./data-store"),
    store = _require.store;

store("assignments").setInit(function (item) {
	// parse the date
	if (typeof item.date == "string") {
		item.date = new Date(item.date);
	}
});

// instantiate the dom
lifeLine.makeDom({
	parent: document.body,
	group: [{ widget: "sidebar" }, { widget: "content" }]
});

// add list views to the navbar
listViews.initNavBar();

// create a new assignment
lifeLine.addCommand("New assignment", function () {
	var id = Math.floor(Math.random() * 100000000);

	lifeLine.nav.navigate("/edit/" + id);
});

// create the logout button
lifeLine.addNavCommand("Account", "/account");

},{"../common/global":18,"./data-store":2,"./global":3,"./views/account":7,"./views/edit":8,"./views/item":9,"./views/lists":10,"./views/login":11,"./views/users":12,"./widgets/content":13,"./widgets/link":14,"./widgets/sidebar":15}],5:[function(require,module,exports){
/**
 * Date related tools
 */

// check if the dates are the same day
var isSameDate = exports.isSameDate = function (date1, date2) {
  return date1.getFullYear() == date2.getFullYear() && date1.getMonth() == date2.getMonth() && date1.getDate() == date2.getDate();
};

// check if a date is less than another
var isSoonerDate = exports.isSoonerDate = function (date1, date2) {
  return date1.getFullYear() <= date2.getFullYear() && date1.getMonth() <= date2.getMonth() && date1.getDate() < date2.getDate();
};

// get the date days from now
var daysFromNow = exports.daysFromNow = function (days) {
  var date = new Date();

  // advance the date
  date.setDate(date.getDate() + days);

  return date;
};

var STRING_DAYS = ["Sunday", "Monday", "Tuesday", "Wedensday", "Thursday", "Friday", "Saturday"];

// convert a date to a string
var stringifyDate = exports.stringifyDate = function (date) {
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
var isSkipTime = function (date) {
  var skips = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : [];

  return skips.find(function (skip) {
    return skip.hour === date.getHours() && skip.minute === date.getMinutes();
  });
};

// convert a time to a string
var stringifyTime = function (date) {
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

},{}],6:[function(require,module,exports){
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
				module.exports(child);
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
			module.exports(node);
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

module.exports = function (opts) {
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
module.exports.register = function (name, widget) {
	widgets[name] = widget;
};

},{}],7:[function(require,module,exports){
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
/**
 * Edit an assignemnt
 */

var _require = require("../util/date"),
    daysFromNow = _require.daysFromNow,
    stringifyDate = _require.stringifyDate;

var _require2 = require("../data-store"),
    store = _require2.store;

var assignments = store("assignments");

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
				// build the new item
				item = {
					id: item.id,
					name: mapped.name.value,
					class: mapped.class.value,
					date: new Date(mapped.date.value + " " + mapped.time.value),
					description: mapped.description.value,
					modified: Date.now()
				};

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
						classes: "input-fill",
						tag: "input",
						value: item.name,
						name: "name",
						on: {
							input: change
						}
					}]
				}, {
					classes: "editor-row",
					children: [{
						classes: "input-fill",
						tag: "input",
						value: item.class,
						name: "class",
						on: {
							input: change
						}
					}]
				}, {
					classes: "editor-row",
					children: [{
						classes: "input-fill",
						tag: "input",
						attrs: {
							type: "date"
						},
						value: item.date.getFullYear() + "-" + pad(item.date.getMonth() + 1) + "-" + pad(item.date.getDate()),
						name: "date",
						on: {
							input: change
						}
					}, {
						classes: "input-fill",
						tag: "input",
						attrs: {
							type: "time"
						},
						value: item.date.getHours() + ":" + pad(item.date.getMinutes()),
						name: "time",
						on: {
							input: change
						}
					}]
				}, {
					classes: "textarea-wrapper",
					children: [{
						tag: "textarea",
						classes: "textarea-fill",
						value: item.description,
						attrs: {
							placeholder: "Description"
						},
						name: "description",
						on: {
							input: change
						}
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
/**
 * The view for an assignment
 */

var _require = require("../util/date"),
    daysFromNow = _require.daysFromNow,
    stringifyDate = _require.stringifyDate;

var _require2 = require("../data-store"),
    store = _require2.store;

var assignments = store("assignments");

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
						text: stringifyDate(item.date, { includeTime: true, skipTimes: skipTimes })
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
/**
 * Display a list of upcomming assignments
 */

var _require = require("../util/date"),
    daysFromNow = _require.daysFromNow,
    isSameDate = _require.isSameDate,
    stringifyDate = _require.stringifyDate,
    isSoonerDate = _require.isSoonerDate;

var _require2 = require("../data-store"),
    store = _require2.store;

var assignments = store("assignments");

var MIN_LENGTH = 10;

// all the different lists
var LISTS = [{
	url: "/",
	title: "Today",
	// show all at reasonable number of incomplete assignments
	manualFilter: function (data) {
		// todays date
		var today = new Date();

		return data.filter(function (item) {
			return !item.done && isSameDate(today, item.date);
		});
	}
}, {
	url: "/week",
	title: "This week",
	// show all at reasonable number of incomplete assignments
	manualFilter: function (data) {
		var taken = [];
		// days to the end of this week
		var endDate = daysFromNow(7 - new Date().getDay());

		var _iteratorNormalCompletion = true;
		var _didIteratorError = false;
		var _iteratorError = undefined;

		try {
			for (var _iterator = data[Symbol.iterator](), _step; !(_iteratorNormalCompletion = (_step = _iterator.next()).done); _iteratorNormalCompletion = true) {
				var item = _step.value;

				// already done
				if (item.done) continue;

				// if we have already hit the required length go by date
				if (taken.length >= MIN_LENGTH && !isSoonerDate(item.date, endDate)) {
					continue;
				}

				taken.push(item);
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

		return taken;
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
	make: function (_ref) {
		var setTitle = _ref.setTitle,
		    content = _ref.content,
		    disposable = _ref.disposable,
		    match = _ref.match;

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

			if (match.manualFilter) {
				data = match.manualFilter(data);
			}
			// remove completed items
			else {
					data = data.filter(match.filter);
				}

			// the last item rendered
			var last;

			// render the list
			data.forEach(function (item, i) {
				// render the headers
				if (i === 0 || !isSameDate(item.date, last.date)) {
					lifeLine.makeDom({
						parent: content,
						classes: "list-header",
						text: stringifyDate(item.date)
					});
				}

				// make this the last item
				last = item;

				// render the item
				lifeLine.makeDom({
					parent: content,
					classes: "list-item",
					children: [{ classes: "list-item-name", text: item.name }, { classes: "list-item-class", text: item.class }],
					on: {
						click: function () {
							return lifeLine.nav.navigate("/item/" + item.id);
						}
					}
				});
			});
		}));
	}
});

},{"../data-store":2,"../util/date":5}],11:[function(require,module,exports){
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

		// create the login form

		var _lifeLine$makeDom = lifeLine.makeDom({
			parent: content,
			tag: "form",
			classes: "content-padded",
			children: [{
				classes: "editor-row",
				children: [{
					tag: "input",
					name: "username",
					classes: "input-fill",
					attrs: {
						placeholder: "Username"
					}
				}]
			}, {
				classes: "editor-row",
				children: [{
					tag: "input",
					name: "password",
					classes: "input-fill",
					attrs: {
						type: "password",
						placeholder: "Password"
					}
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
						body: JSON.stringify({
							username: username.value,
							password: password.value
						})
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

			var displayUsers = [];

			displayUsers.push({
				classes: "list-header",
				text: "Admins"
			});

			var adminSectionDone = false;

			// generate the user list
			users.forEach(function (user) {
				// render headers for admin and normal users
				if (!user.admin && !adminSectionDone) {
					// only display one users header
					adminSectionDone = true;

					displayUsers.push({
						classes: "list-header",
						text: "Users"
					});
				}

				// display the user
				displayUsers.push({
					classes: "list-item",
					children: [{
						classes: "list-item-name",
						text: user.username
					}],
					on: {
						click: function () {
							return lifeLine.nav.navigate("/user/" + user.username);
						}
					}
				});
			});

			// display the user list
			lifeLine.makeDom({
				parent: content,
				group: displayUsers
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
					// don't navigate the page
					e.preventDefault();

					lifeLine.nav.navigate(opts.href);
				}
			},
			text: opts.text
		};
	}
});

},{}],15:[function(require,module,exports){
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

},{}],16:[function(require,module,exports){
var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

/**
 * Keep a list of subscriptions to unsubscribe from together
 */

var Disposable = module.exports = function () {
	function _class() {
		_classCallCheck(this, _class);

		this._subscriptions = [];
	}

	// Unsubscribe from all subscriptions


	_createClass(_class, [{
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

	return _class;
}();

},{}],17:[function(require,module,exports){
var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

/**
 * A basic event emitter
 */

module.exports = function () {
	function _class() {
		_classCallCheck(this, _class);

		this._listeners = {};
	}

	/**
  * Add an event listener
  */


	_createClass(_class, [{
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

	return _class;
}();

},{}],18:[function(require,module,exports){
(function (process,global){
/**
 * Create a global object with commonly used modules to avoid 50 million requires
 */

var EventEmitter = require("./event-emitter");

var lifeLine = new EventEmitter();

// platform detection
lifeLine.node = typeof process == "object";
lifeLine.browser = typeof window == "object";

// attach utils
lifeLine.Disposable = require("./disposable");
lifeLine.EventEmitter = EventEmitter;

// attach lifeline to the global object
(lifeLine.node ? global : browser).lifeLine = lifeLine;

}).call(this,require('_process'),typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})

},{"./disposable":16,"./event-emitter":17,"_process":1}]},{},[4])
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCJub2RlX21vZHVsZXMvcHJvY2Vzcy9icm93c2VyLmpzIiwic3JjXFxjbGllbnRcXGRhdGEtc3RvcmUuanMiLCJzcmNcXGNsaWVudFxcZ2xvYmFsLmpzIiwic3JjXFxjbGllbnRcXGluZGV4LmpzIiwic3JjXFxjbGllbnRcXHV0aWxcXGRhdGUuanMiLCJzcmNcXGNsaWVudFxcdXRpbFxcZG9tLW1ha2VyLmpzIiwic3JjXFxjbGllbnRcXHZpZXdzXFxhY2NvdW50LmpzIiwic3JjXFxjbGllbnRcXHZpZXdzXFxlZGl0LmpzIiwic3JjXFxjbGllbnRcXHZpZXdzXFxpdGVtLmpzIiwic3JjXFxjbGllbnRcXHZpZXdzXFxsaXN0cy5qcyIsInNyY1xcY2xpZW50XFx2aWV3c1xcbG9naW4uanMiLCJzcmNcXGNsaWVudFxcdmlld3NcXHVzZXJzLmpzIiwic3JjXFxjbGllbnRcXHdpZGdldHNcXGNvbnRlbnQuanMiLCJzcmNcXGNsaWVudFxcd2lkZ2V0c1xcbGluay5qcyIsInNyY1xcY2xpZW50XFx3aWRnZXRzXFxzaWRlYmFyLmpzIiwic3JjXFxjb21tb25cXGRpc3Bvc2FibGUuanMiLCJzcmNcXGNvbW1vblxcZXZlbnQtZW1pdHRlci5qcyIsInNyY1xcY29tbW9uXFxzcmNcXGNvbW1vblxcZ2xvYmFsLmpzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBO0FDQUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7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MUI7QUFBQSxNQUFYLENBQUgsRUFBbUQ7QUFDbEQ7QUFDQTs7QUFFRDtBQUNBLCtCQUFZLElBQVo7QUFSd0I7O0FBQUE7QUFBQTtBQUFBOztBQUFBO0FBQ3pCLDJCQUFvQixLQUFLLFVBQUwsQ0FBZ0IsSUFBaEIsQ0FBcEIsbUlBQTJDO0FBQUEsVUFBbkMsUUFBbUM7O0FBQUEsdUJBQW5DLFFBQW1DOztBQUFBLCtCQUd6QztBQUtEO0FBVHdCO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFVekI7QUFDRDtBQWxFRjs7QUFBQTtBQUFBOzs7O0FDSkE7Ozs7QUFJQSxJQUFJLGVBQWUsUUFBUSxpQkFBUixDQUFuQjs7QUFFQSxJQUFJLFdBQVcsSUFBSSxZQUFKLEVBQWY7O0FBRUE7QUFDQSxTQUFTLElBQVQsR0FBZ0IsT0FBTyxPQUFQLElBQWtCLFFBQWxDO0FBQ0EsU0FBUyxPQUFULEdBQW1CLE9BQU8sTUFBUCxJQUFpQixRQUFwQzs7QUFFQTtBQUNBLFNBQVMsVUFBVCxHQUFzQixRQUFRLGNBQVIsQ0FBdEI7QUFDQSxTQUFTLFlBQVQsR0FBd0IsWUFBeEI7O0FBRUE7QUFDQSxDQUFDLFNBQVMsSUFBVCxHQUFnQixNQUFoQixHQUF5QixPQUExQixFQUFtQyxRQUFuQyxHQUE4QyxRQUE5QyIsImZpbGUiOiJnZW5lcmF0ZWQuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlc0NvbnRlbnQiOlsiKGZ1bmN0aW9uIGUodCxuLHIpe2Z1bmN0aW9uIHMobyx1KXtpZighbltvXSl7aWYoIXRbb10pe3ZhciBhPXR5cGVvZiByZXF1aXJlPT1cImZ1bmN0aW9uXCImJnJlcXVpcmU7aWYoIXUmJmEpcmV0dXJuIGEobywhMCk7aWYoaSlyZXR1cm4gaShvLCEwKTt2YXIgZj1uZXcgRXJyb3IoXCJDYW5ub3QgZmluZCBtb2R1bGUgJ1wiK28rXCInXCIpO3Rocm93IGYuY29kZT1cIk1PRFVMRV9OT1RfRk9VTkRcIixmfXZhciBsPW5bb109e2V4cG9ydHM6e319O3Rbb11bMF0uY2FsbChsLmV4cG9ydHMsZnVuY3Rpb24oZSl7dmFyIG49dFtvXVsxXVtlXTtyZXR1cm4gcyhuP246ZSl9LGwsbC5leHBvcnRzLGUsdCxuLHIpfXJldHVybiBuW29dLmV4cG9ydHN9dmFyIGk9dHlwZW9mIHJlcXVpcmU9PVwiZnVuY3Rpb25cIiYmcmVxdWlyZTtmb3IodmFyIG89MDtvPHIubGVuZ3RoO28rKylzKHJbb10pO3JldHVybiBzfSkiLCIvLyBzaGltIGZvciB1c2luZyBwcm9jZXNzIGluIGJyb3dzZXJcbnZhciBwcm9jZXNzID0gbW9kdWxlLmV4cG9ydHMgPSB7fTtcblxuLy8gY2FjaGVkIGZyb20gd2hhdGV2ZXIgZ2xvYmFsIGlzIHByZXNlbnQgc28gdGhhdCB0ZXN0IHJ1bm5lcnMgdGhhdCBzdHViIGl0XG4vLyBkb24ndCBicmVhayB0aGluZ3MuICBCdXQgd2UgbmVlZCB0byB3cmFwIGl0IGluIGEgdHJ5IGNhdGNoIGluIGNhc2UgaXQgaXNcbi8vIHdyYXBwZWQgaW4gc3RyaWN0IG1vZGUgY29kZSB3aGljaCBkb2Vzbid0IGRlZmluZSBhbnkgZ2xvYmFscy4gIEl0J3MgaW5zaWRlIGFcbi8vIGZ1bmN0aW9uIGJlY2F1c2UgdHJ5L2NhdGNoZXMgZGVvcHRpbWl6ZSBpbiBjZXJ0YWluIGVuZ2luZXMuXG5cbnZhciBjYWNoZWRTZXRUaW1lb3V0O1xudmFyIGNhY2hlZENsZWFyVGltZW91dDtcblxuZnVuY3Rpb24gZGVmYXVsdFNldFRpbW91dCgpIHtcbiAgICB0aHJvdyBuZXcgRXJyb3IoJ3NldFRpbWVvdXQgaGFzIG5vdCBiZWVuIGRlZmluZWQnKTtcbn1cbmZ1bmN0aW9uIGRlZmF1bHRDbGVhclRpbWVvdXQgKCkge1xuICAgIHRocm93IG5ldyBFcnJvcignY2xlYXJUaW1lb3V0IGhhcyBub3QgYmVlbiBkZWZpbmVkJyk7XG59XG4oZnVuY3Rpb24gKCkge1xuICAgIHRyeSB7XG4gICAgICAgIGlmICh0eXBlb2Ygc2V0VGltZW91dCA9PT0gJ2Z1bmN0aW9uJykge1xuICAgICAgICAgICAgY2FjaGVkU2V0VGltZW91dCA9IHNldFRpbWVvdXQ7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBjYWNoZWRTZXRUaW1lb3V0ID0gZGVmYXVsdFNldFRpbW91dDtcbiAgICAgICAgfVxuICAgIH0gY2F0Y2ggKGUpIHtcbiAgICAgICAgY2FjaGVkU2V0VGltZW91dCA9IGRlZmF1bHRTZXRUaW1vdXQ7XG4gICAgfVxuICAgIHRyeSB7XG4gICAgICAgIGlmICh0eXBlb2YgY2xlYXJUaW1lb3V0ID09PSAnZnVuY3Rpb24nKSB7XG4gICAgICAgICAgICBjYWNoZWRDbGVhclRpbWVvdXQgPSBjbGVhclRpbWVvdXQ7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBjYWNoZWRDbGVhclRpbWVvdXQgPSBkZWZhdWx0Q2xlYXJUaW1lb3V0O1xuICAgICAgICB9XG4gICAgfSBjYXRjaCAoZSkge1xuICAgICAgICBjYWNoZWRDbGVhclRpbWVvdXQgPSBkZWZhdWx0Q2xlYXJUaW1lb3V0O1xuICAgIH1cbn0gKCkpXG5mdW5jdGlvbiBydW5UaW1lb3V0KGZ1bikge1xuICAgIGlmIChjYWNoZWRTZXRUaW1lb3V0ID09PSBzZXRUaW1lb3V0KSB7XG4gICAgICAgIC8vbm9ybWFsIGVudmlyb21lbnRzIGluIHNhbmUgc2l0dWF0aW9uc1xuICAgICAgICByZXR1cm4gc2V0VGltZW91dChmdW4sIDApO1xuICAgIH1cbiAgICAvLyBpZiBzZXRUaW1lb3V0IHdhc24ndCBhdmFpbGFibGUgYnV0IHdhcyBsYXR0ZXIgZGVmaW5lZFxuICAgIGlmICgoY2FjaGVkU2V0VGltZW91dCA9PT0gZGVmYXVsdFNldFRpbW91dCB8fCAhY2FjaGVkU2V0VGltZW91dCkgJiYgc2V0VGltZW91dCkge1xuICAgICAgICBjYWNoZWRTZXRUaW1lb3V0ID0gc2V0VGltZW91dDtcbiAgICAgICAgcmV0dXJuIHNldFRpbWVvdXQoZnVuLCAwKTtcbiAgICB9XG4gICAgdHJ5IHtcbiAgICAgICAgLy8gd2hlbiB3aGVuIHNvbWVib2R5IGhhcyBzY3Jld2VkIHdpdGggc2V0VGltZW91dCBidXQgbm8gSS5FLiBtYWRkbmVzc1xuICAgICAgICByZXR1cm4gY2FjaGVkU2V0VGltZW91dChmdW4sIDApO1xuICAgIH0gY2F0Y2goZSl7XG4gICAgICAgIHRyeSB7XG4gICAgICAgICAgICAvLyBXaGVuIHdlIGFyZSBpbiBJLkUuIGJ1dCB0aGUgc2NyaXB0IGhhcyBiZWVuIGV2YWxlZCBzbyBJLkUuIGRvZXNuJ3QgdHJ1c3QgdGhlIGdsb2JhbCBvYmplY3Qgd2hlbiBjYWxsZWQgbm9ybWFsbHlcbiAgICAgICAgICAgIHJldHVybiBjYWNoZWRTZXRUaW1lb3V0LmNhbGwobnVsbCwgZnVuLCAwKTtcbiAgICAgICAgfSBjYXRjaChlKXtcbiAgICAgICAgICAgIC8vIHNhbWUgYXMgYWJvdmUgYnV0IHdoZW4gaXQncyBhIHZlcnNpb24gb2YgSS5FLiB0aGF0IG11c3QgaGF2ZSB0aGUgZ2xvYmFsIG9iamVjdCBmb3IgJ3RoaXMnLCBob3BmdWxseSBvdXIgY29udGV4dCBjb3JyZWN0IG90aGVyd2lzZSBpdCB3aWxsIHRocm93IGEgZ2xvYmFsIGVycm9yXG4gICAgICAgICAgICByZXR1cm4gY2FjaGVkU2V0VGltZW91dC5jYWxsKHRoaXMsIGZ1biwgMCk7XG4gICAgICAgIH1cbiAgICB9XG5cblxufVxuZnVuY3Rpb24gcnVuQ2xlYXJUaW1lb3V0KG1hcmtlcikge1xuICAgIGlmIChjYWNoZWRDbGVhclRpbWVvdXQgPT09IGNsZWFyVGltZW91dCkge1xuICAgICAgICAvL25vcm1hbCBlbnZpcm9tZW50cyBpbiBzYW5lIHNpdHVhdGlvbnNcbiAgICAgICAgcmV0dXJuIGNsZWFyVGltZW91dChtYXJrZXIpO1xuICAgIH1cbiAgICAvLyBpZiBjbGVhclRpbWVvdXQgd2Fzbid0IGF2YWlsYWJsZSBidXQgd2FzIGxhdHRlciBkZWZpbmVkXG4gICAgaWYgKChjYWNoZWRDbGVhclRpbWVvdXQgPT09IGRlZmF1bHRDbGVhclRpbWVvdXQgfHwgIWNhY2hlZENsZWFyVGltZW91dCkgJiYgY2xlYXJUaW1lb3V0KSB7XG4gICAgICAgIGNhY2hlZENsZWFyVGltZW91dCA9IGNsZWFyVGltZW91dDtcbiAgICAgICAgcmV0dXJuIGNsZWFyVGltZW91dChtYXJrZXIpO1xuICAgIH1cbiAgICB0cnkge1xuICAgICAgICAvLyB3aGVuIHdoZW4gc29tZWJvZHkgaGFzIHNjcmV3ZWQgd2l0aCBzZXRUaW1lb3V0IGJ1dCBubyBJLkUuIG1hZGRuZXNzXG4gICAgICAgIHJldHVybiBjYWNoZWRDbGVhclRpbWVvdXQobWFya2VyKTtcbiAgICB9IGNhdGNoIChlKXtcbiAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgIC8vIFdoZW4gd2UgYXJlIGluIEkuRS4gYnV0IHRoZSBzY3JpcHQgaGFzIGJlZW4gZXZhbGVkIHNvIEkuRS4gZG9lc24ndCAgdHJ1c3QgdGhlIGdsb2JhbCBvYmplY3Qgd2hlbiBjYWxsZWQgbm9ybWFsbHlcbiAgICAgICAgICAgIHJldHVybiBjYWNoZWRDbGVhclRpbWVvdXQuY2FsbChudWxsLCBtYXJrZXIpO1xuICAgICAgICB9IGNhdGNoIChlKXtcbiAgICAgICAgICAgIC8vIHNhbWUgYXMgYWJvdmUgYnV0IHdoZW4gaXQncyBhIHZlcnNpb24gb2YgSS5FLiB0aGF0IG11c3QgaGF2ZSB0aGUgZ2xvYmFsIG9iamVjdCBmb3IgJ3RoaXMnLCBob3BmdWxseSBvdXIgY29udGV4dCBjb3JyZWN0IG90aGVyd2lzZSBpdCB3aWxsIHRocm93IGEgZ2xvYmFsIGVycm9yLlxuICAgICAgICAgICAgLy8gU29tZSB2ZXJzaW9ucyBvZiBJLkUuIGhhdmUgZGlmZmVyZW50IHJ1bGVzIGZvciBjbGVhclRpbWVvdXQgdnMgc2V0VGltZW91dFxuICAgICAgICAgICAgcmV0dXJuIGNhY2hlZENsZWFyVGltZW91dC5jYWxsKHRoaXMsIG1hcmtlcik7XG4gICAgICAgIH1cbiAgICB9XG5cblxuXG59XG52YXIgcXVldWUgPSBbXTtcbnZhciBkcmFpbmluZyA9IGZhbHNlO1xudmFyIGN1cnJlbnRRdWV1ZTtcbnZhciBxdWV1ZUluZGV4ID0gLTE7XG5cbmZ1bmN0aW9uIGNsZWFuVXBOZXh0VGljaygpIHtcbiAgICBpZiAoIWRyYWluaW5nIHx8ICFjdXJyZW50UXVldWUpIHtcbiAgICAgICAgcmV0dXJuO1xuICAgIH1cbiAgICBkcmFpbmluZyA9IGZhbHNlO1xuICAgIGlmIChjdXJyZW50UXVldWUubGVuZ3RoKSB7XG4gICAgICAgIHF1ZXVlID0gY3VycmVudFF1ZXVlLmNvbmNhdChxdWV1ZSk7XG4gICAgfSBlbHNlIHtcbiAgICAgICAgcXVldWVJbmRleCA9IC0xO1xuICAgIH1cbiAgICBpZiAocXVldWUubGVuZ3RoKSB7XG4gICAgICAgIGRyYWluUXVldWUoKTtcbiAgICB9XG59XG5cbmZ1bmN0aW9uIGRyYWluUXVldWUoKSB7XG4gICAgaWYgKGRyYWluaW5nKSB7XG4gICAgICAgIHJldHVybjtcbiAgICB9XG4gICAgdmFyIHRpbWVvdXQgPSBydW5UaW1lb3V0KGNsZWFuVXBOZXh0VGljayk7XG4gICAgZHJhaW5pbmcgPSB0cnVlO1xuXG4gICAgdmFyIGxlbiA9IHF1ZXVlLmxlbmd0aDtcbiAgICB3aGlsZShsZW4pIHtcbiAgICAgICAgY3VycmVudFF1ZXVlID0gcXVldWU7XG4gICAgICAgIHF1ZXVlID0gW107XG4gICAgICAgIHdoaWxlICgrK3F1ZXVlSW5kZXggPCBsZW4pIHtcbiAgICAgICAgICAgIGlmIChjdXJyZW50UXVldWUpIHtcbiAgICAgICAgICAgICAgICBjdXJyZW50UXVldWVbcXVldWVJbmRleF0ucnVuKCk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgcXVldWVJbmRleCA9IC0xO1xuICAgICAgICBsZW4gPSBxdWV1ZS5sZW5ndGg7XG4gICAgfVxuICAgIGN1cnJlbnRRdWV1ZSA9IG51bGw7XG4gICAgZHJhaW5pbmcgPSBmYWxzZTtcbiAgICBydW5DbGVhclRpbWVvdXQodGltZW91dCk7XG59XG5cbnByb2Nlc3MubmV4dFRpY2sgPSBmdW5jdGlvbiAoZnVuKSB7XG4gICAgdmFyIGFyZ3MgPSBuZXcgQXJyYXkoYXJndW1lbnRzLmxlbmd0aCAtIDEpO1xuICAgIGlmIChhcmd1bWVudHMubGVuZ3RoID4gMSkge1xuICAgICAgICBmb3IgKHZhciBpID0gMTsgaSA8IGFyZ3VtZW50cy5sZW5ndGg7IGkrKykge1xuICAgICAgICAgICAgYXJnc1tpIC0gMV0gPSBhcmd1bWVudHNbaV07XG4gICAgICAgIH1cbiAgICB9XG4gICAgcXVldWUucHVzaChuZXcgSXRlbShmdW4sIGFyZ3MpKTtcbiAgICBpZiAocXVldWUubGVuZ3RoID09PSAxICYmICFkcmFpbmluZykge1xuICAgICAgICBydW5UaW1lb3V0KGRyYWluUXVldWUpO1xuICAgIH1cbn07XG5cbi8vIHY4IGxpa2VzIHByZWRpY3RpYmxlIG9iamVjdHNcbmZ1bmN0aW9uIEl0ZW0oZnVuLCBhcnJheSkge1xuICAgIHRoaXMuZnVuID0gZnVuO1xuICAgIHRoaXMuYXJyYXkgPSBhcnJheTtcbn1cbkl0ZW0ucHJvdG90eXBlLnJ1biA9IGZ1bmN0aW9uICgpIHtcbiAgICB0aGlzLmZ1bi5hcHBseShudWxsLCB0aGlzLmFycmF5KTtcbn07XG5wcm9jZXNzLnRpdGxlID0gJ2Jyb3dzZXInO1xucHJvY2Vzcy5icm93c2VyID0gdHJ1ZTtcbnByb2Nlc3MuZW52ID0ge307XG5wcm9jZXNzLmFyZ3YgPSBbXTtcbnByb2Nlc3MudmVyc2lvbiA9ICcnOyAvLyBlbXB0eSBzdHJpbmcgdG8gYXZvaWQgcmVnZXhwIGlzc3Vlc1xucHJvY2Vzcy52ZXJzaW9ucyA9IHt9O1xuXG5mdW5jdGlvbiBub29wKCkge31cblxucHJvY2Vzcy5vbiA9IG5vb3A7XG5wcm9jZXNzLmFkZExpc3RlbmVyID0gbm9vcDtcbnByb2Nlc3Mub25jZSA9IG5vb3A7XG5wcm9jZXNzLm9mZiA9IG5vb3A7XG5wcm9jZXNzLnJlbW92ZUxpc3RlbmVyID0gbm9vcDtcbnByb2Nlc3MucmVtb3ZlQWxsTGlzdGVuZXJzID0gbm9vcDtcbnByb2Nlc3MuZW1pdCA9IG5vb3A7XG5cbnByb2Nlc3MuYmluZGluZyA9IGZ1bmN0aW9uIChuYW1lKSB7XG4gICAgdGhyb3cgbmV3IEVycm9yKCdwcm9jZXNzLmJpbmRpbmcgaXMgbm90IHN1cHBvcnRlZCcpO1xufTtcblxucHJvY2Vzcy5jd2QgPSBmdW5jdGlvbiAoKSB7IHJldHVybiAnLycgfTtcbnByb2Nlc3MuY2hkaXIgPSBmdW5jdGlvbiAoZGlyKSB7XG4gICAgdGhyb3cgbmV3IEVycm9yKCdwcm9jZXNzLmNoZGlyIGlzIG5vdCBzdXBwb3J0ZWQnKTtcbn07XG5wcm9jZXNzLnVtYXNrID0gZnVuY3Rpb24oKSB7IHJldHVybiAwOyB9O1xuIiwiLyoqXHJcbiAqIFdvcmsgd2l0aCBkYXRhIHN0b3Jlc1xyXG4gKi9cclxuXHJcbmNvbnN0IERFQk9VTkNFX1RJTUUgPSAyMDAwO1xyXG5jb25zdCBEQVRBX1NUT1JFX1JPT1QgPSBcIi9hcGkvZGF0YS9cIjtcclxuXHJcbi8vIGNhY2hlIGRhdGEgc3RvcmUgaW5zdGFuY2VzXHJcbnZhciBzdG9yZXMgPSB7fTtcclxuXHJcbi8vIGdldC9jcmVhdGUgYSBkYXRhc3RvcmVcclxuZXhwb3J0cy5zdG9yZSA9IGZ1bmN0aW9uKG5hbWUpIHtcclxuXHQvLyB1c2UgdGhlIGNhY2hlZCBzdG9yZVxyXG5cdGlmKG5hbWUgaW4gc3RvcmVzKSB7XHJcblx0XHRyZXR1cm4gc3RvcmVzW25hbWVdO1xyXG5cdH1cclxuXHJcblx0dmFyIHN0b3JlID0gbmV3IFN0b3JlKG5hbWUpO1xyXG5cclxuXHQvLyBjYWNoZSB0aGUgZGF0YSBzdG9yZSBpbnN0YW5jZVxyXG5cdHN0b3Jlc1tuYW1lXSA9IHN0b3JlO1xyXG5cclxuXHRyZXR1cm4gc3RvcmU7XHJcbn07XHJcblxyXG5jbGFzcyBTdG9yZSBleHRlbmRzIGxpZmVMaW5lLkV2ZW50RW1pdHRlciB7XHJcblx0Y29uc3RydWN0b3IobmFtZSkge1xyXG5cdFx0c3VwZXIoKTtcclxuXHRcdHRoaXMubmFtZSA9IG5hbWU7XHJcblx0XHR0aGlzLl9jYWNoZSA9IHt9O1xyXG5cdFx0Ly8gZG9uJ3Qgc2VuZCBkdXBsaWNhdGUgcmVxdWVzdHNcclxuXHRcdHRoaXMuX3JlcXVlc3RpbmcgPSBbXTtcclxuXHR9XHJcblxyXG5cdC8vIHNldCB0aGUgZnVuY3Rpb24gdG8gZGVzZXJpYWxpemUgYWxsIGRhdGEgZnJvbSB0aGUgc2VydmVyXHJcblx0c2V0SW5pdChmbikge1xyXG5cdFx0dGhpcy5fZGVzZXJpYWxpemVyID0gZm47XHJcblx0fVxyXG5cclxuXHQvLyBzZW5kIGEgcmVxdWVzdCB0byB0aGUgc2VydmVyXHJcblx0X3JlcXVlc3QobWV0aG9kLCB1cmwsIGJvZHkpIHtcclxuXHRcdHVybCA9IERBVEFfU1RPUkVfUk9PVCArIHVybDtcclxuXHJcblx0XHQvLyBkb24ndCBkdXBsaWNhdGUgcmVxdWVzdHNcclxuXHRcdGlmKG1ldGhvZCA9PSBcImdldFwiKSB7XHJcblx0XHRcdC8vIGFscmVhZHkgbWFraW5nIHRoaXMgcmVxdWVzdFxyXG5cdFx0XHRpZih0aGlzLl9yZXF1ZXN0aW5nLmluZGV4T2YodXJsKSAhPT0gLTEpIHJldHVybjtcclxuXHJcblx0XHRcdHRoaXMuX3JlcXVlc3RpbmcucHVzaCh1cmwpO1xyXG5cdFx0fVxyXG5cclxuXHRcdC8vIG1ha2UgdGhlIGFjdHVhbCByZXF1ZXN0XHJcblx0XHRyZXR1cm4gZmV0Y2godXJsLCB7XHJcblx0XHRcdG1ldGhvZDogbWV0aG9kLFxyXG5cdFx0XHRjcmVkZW50aWFsczogXCJpbmNsdWRlXCIsXHJcblx0XHRcdGJvZHk6IGJvZHkgJiYgSlNPTi5zdHJpbmdpZnkoYm9keSlcclxuXHRcdH0pXHJcblxyXG5cdFx0Ly8gcGFyc2UgdGhlIHJlc3BvbnNlXHJcblx0XHQudGhlbihyZXMgPT4gcmVzLmpzb24oKSlcclxuXHJcblx0XHQudGhlbihyZXMgPT4ge1xyXG5cdFx0XHQvLyByZW1vdmUgdGhlIGxvY2tcclxuXHRcdFx0aWYobWV0aG9kID09IFwiZ2V0XCIpIHtcclxuXHRcdFx0XHR2YXIgaW5kZXggPSB0aGlzLl9yZXF1ZXN0aW5nLmluZGV4T2YodXJsKTtcclxuXHJcblx0XHRcdFx0aWYoaW5kZXggIT09IC0xKSB0aGlzLl9yZXF1ZXN0aW5nLnNwbGljZShpbmRleCwgMSk7XHJcblx0XHRcdH1cclxuXHJcblx0XHRcdC8vIHVwZGF0ZSB0aGUgY2FjaGUgYW5kIGVtaXQgYSBjaGFuZ2VcclxuXHRcdFx0aWYocmVzLnN0YXR1cyA9PSBcInN1Y2Nlc3NcIiAmJiBtZXRob2QgPT0gXCJnZXRcIikge1xyXG5cdFx0XHRcdC8vIHN0b3JlIHRoZSB2YWx1ZSBpbiB0aGUgY2FjaGVcclxuXHRcdFx0XHRpZihBcnJheS5pc0FycmF5KHJlcy5kYXRhKSkge1xyXG5cdFx0XHRcdFx0cmVzLmRhdGEuZm9yRWFjaChpdGVtID0+IHtcclxuXHRcdFx0XHRcdFx0Ly8gZGVzZXJpYWxpemUgdGhlIGl0ZW1cclxuXHRcdFx0XHRcdFx0aWYodGhpcy5fZGVzZXJpYWxpemVyKSB7XHJcblx0XHRcdFx0XHRcdFx0aXRlbSA9IHRoaXMuX2Rlc2VyaWFsaXplcihpdGVtKSB8fCBpdGVtO1xyXG5cdFx0XHRcdFx0XHR9XHJcblxyXG5cdFx0XHRcdFx0XHQvLyBzdG9yZSB0ZWggaXRlbVxyXG5cdFx0XHRcdFx0XHR0aGlzLl9jYWNoZVtpdGVtLmlkXSA9IGl0ZW1cclxuXHRcdFx0XHRcdH0pO1xyXG5cdFx0XHRcdH1cclxuXHRcdFx0XHRlbHNlIHtcclxuXHRcdFx0XHRcdGxldCBpdGVtID0gcmVzLmRhdGE7XHJcblxyXG5cdFx0XHRcdFx0Ly8gZGVzZXJpYWxpemUgdGhlIGl0ZW1cclxuXHRcdFx0XHRcdGlmKHRoaXMuX2Rlc2VyaWFsaXplcikge1xyXG5cdFx0XHRcdFx0XHRpdGVtID0gdGhpcy5fZGVzZXJpYWxpemVyKGl0ZW0pIHx8IGl0ZW07XHJcblx0XHRcdFx0XHR9XHJcblxyXG5cdFx0XHRcdFx0dGhpcy5fY2FjaGVbcmVzLmRhdGEuaWRdID0gaXRlbTtcclxuXHRcdFx0XHR9XHJcblxyXG5cdFx0XHRcdC8vIGVtaXQgYSBjaGFuZ2VcclxuXHRcdFx0XHR0aGlzLmVtaXQoXCJjaGFuZ2VcIik7XHJcblx0XHRcdH1cclxuXHJcblx0XHRcdC8vIHRocm93IHRoZSBlcnJvclxyXG5cdFx0XHRpZihyZXMuc3RhdHVzID09IFwiZXJyb3JcIikge1xyXG5cdFx0XHRcdHRocm93IG5ldyBFcnJvcihyZXMuZGF0YSk7XHJcblx0XHRcdH1cclxuXHJcblx0XHRcdC8vIHRoZSB1c2VyIGlzIG5vdCBsb2dnZWQgaW5cclxuXHRcdFx0aWYocmVzLnN0YXR1cyA9PSBcImZhaWxcIiAmJiByZXMuZGF0YS5yZWFzb24gPT0gXCJsb2dnZWQtb3V0XCIpIHtcclxuXHRcdFx0XHRsaWZlTGluZS5uYXYubmF2aWdhdGUoXCIvbG9naW5cIik7XHJcblx0XHRcdH1cclxuXHRcdH0pO1xyXG5cdH1cclxuXHJcblx0Ly8gZ2V0IGFsbCB0aGUgaXRlbXMgYW5kIGxpc3RlbiBmb3IgYW55IGNoYW5nZXNcclxuXHRnZXRBbGwoZm4pIHtcclxuXHRcdC8vIGdvIHRvIHRoZSBjYWNoZSBmaXJzdFxyXG5cdFx0Zm4oYXJyYXlGcm9tT2JqZWN0KHRoaXMuX2NhY2hlKSk7XHJcblxyXG5cdFx0Ly8gc2VuZCBhIHJlcXVlc3QgdG8gdGhlIHNlcnZlciBmb3IgdGhlIGl0ZW1zXHJcblx0XHR0aGlzLl9yZXF1ZXN0KFwiZ2V0XCIsIHRoaXMubmFtZSk7XHJcblxyXG5cdFx0Ly8gbGlzdGVuIGZvciBhbnkgY2hhbmdlc1xyXG5cdFx0cmV0dXJuIHRoaXMub24oXCJjaGFuZ2VcIiwgKCkgPT4ge1xyXG5cdFx0XHQvLyB0aGUgY2hhbmdlcyB3aWxsIHdlIGluIHRoZSBjYWNoZVxyXG5cdFx0XHRmbihhcnJheUZyb21PYmplY3QodGhpcy5fY2FjaGUpKTtcclxuXHRcdH0pO1xyXG5cdH1cclxuXHJcblx0Ly8gZ2V0IGEgc2luZ2xlIGl0ZW0gYW5kIGxpc3RlbiBmb3IgY2hhbmdlc1xyXG5cdGdldChpZCwgZm4pIHtcclxuXHRcdC8vIGdvIHRvIHRoZSBjYWNoZSBmaXJzdFxyXG5cdFx0Zm4odGhpcy5fY2FjaGVbaWRdKTtcclxuXHJcblx0XHQvLyBzZW5kIGEgcmVxdWVzdCB0byB0aGUgc2VydmVyIGZvciB0aGUgaXRlbVxyXG5cdFx0dGhpcy5fcmVxdWVzdChcImdldFwiLCB0aGlzLm5hbWUgKyBcIi9cIiArIGlkKTtcclxuXHJcblx0XHQvLyBsaXN0ZW4gZm9yIGFueSBjaGFuZ2VzXHJcblx0XHRyZXR1cm4gdGhpcy5vbihcImNoYW5nZVwiLCAoKSA9PiB7XHJcblx0XHRcdGZuKHRoaXMuX2NhY2hlW2lkXSk7XHJcblx0XHR9KTtcclxuXHR9XHJcblxyXG5cdC8vIHN0b3JlIGEgdmFsdWUgaW4gdGhlIHN0b3JlXHJcblx0c2V0KHZhbHVlLCBza2lwcykge1xyXG5cdFx0Ly8gc3RvcmUgdGhlIHZhbHVlIGluIHRoZSBjYWNoZVxyXG5cdFx0dGhpcy5fY2FjaGVbdmFsdWUuaWRdID0gdmFsdWU7XHJcblxyXG5cdFx0Ly8gc2F2ZSB0aGUgaXRlbVxyXG5cdFx0ZGVib3VuY2UodmFsdWUuaWQsICgpID0+IHtcclxuXHRcdFx0dGhpcy5fcmVxdWVzdChcInB1dFwiLCBgJHt0aGlzLm5hbWV9LyR7dmFsdWUuaWR9YCwgdmFsdWUpO1xyXG5cdFx0fSk7XHJcblxyXG5cdFx0Ly8gZW1pdCBhIGNoYW5nZVxyXG5cdFx0dGhpcy5wYXJ0aWFsRW1pdChcImNoYW5nZVwiLCBza2lwcyk7XHJcblx0fVxyXG5cclxuXHQvLyByZW1vdmUgYSB2YWx1ZSBmcm9tIHRoZSBzdG9yZVxyXG5cdHJlbW92ZShpZCwgc2tpcHMpIHtcclxuXHRcdC8vIHJlbW92ZSB0aGUgdmFsdWUgZnJvbSB0aGUgY2FjaGVcclxuXHRcdGRlbGV0ZSB0aGlzLl9jYWNoZVtpZF07XHJcblxyXG5cdFx0Ly8gc2VuZCB0aGUgZGVsZXRlIHJlcXVlc3RcclxuXHRcdHRoaXMuX3JlcXVlc3QoXCJkZWxldGVcIiwgYCR7dGhpcy5uYW1lfS8ke2lkfWApO1xyXG5cclxuXHRcdC8vIGVtaXQgYSBjaGFuZ2VcclxuXHRcdHRoaXMucGFydGlhbEVtaXQoXCJjaGFuZ2VcIiwgc2tpcHMpO1xyXG5cdH1cclxufVxyXG5cclxuLy8gZ2V0IGFuIGFycmF5IGZyb20gYW4gb2JqZWN0XHJcbnZhciBhcnJheUZyb21PYmplY3QgPSBmdW5jdGlvbihvYmopIHtcclxuXHRyZXR1cm4gT2JqZWN0LmdldE93blByb3BlcnR5TmFtZXMob2JqKVxyXG5cdFx0Lm1hcChuYW1lID0+IG9ialtuYW1lXSk7XHJcbn07XHJcblxyXG4vLyBkb24ndCBjYWxsIGEgZnVuY3Rpb24gdG9vIG9mdGVuXHJcbnZhciBkZWJvdW5jZVRpbWVycyA9IHt9O1xyXG5cclxudmFyIGRlYm91bmNlID0gKGlkLCBmbikgPT4ge1xyXG5cdC8vIGNhbmNlbCB0aGUgcHJldmlvdXMgZGVsYXlcclxuXHRjbGVhclRpbWVvdXQoZGVib3VuY2VUaW1lcnNbaWRdKTtcclxuXHQvLyBzdGFydCBhIG5ldyBkZWxheVxyXG5cdGRlYm91bmNlVGltZXJzW2lkXSA9IHNldFRpbWVvdXQoZm4sIERFQk9VTkNFX1RJTUUpO1xyXG59O1xyXG4iLCIvKipcclxuICogQnJvd3NlciBzcGVjaWZpYyBnbG9iYWxzXHJcbiAqL1xyXG5cclxubGlmZUxpbmUubWFrZURvbSA9IHJlcXVpcmUoXCIuL3V0aWwvZG9tLW1ha2VyXCIpO1xyXG5cclxuLy8gYWRkIGEgZnVuY3Rpb24gZm9yIGFkZGluZyBhY3Rpb25zXHJcbmxpZmVMaW5lLmFkZEFjdGlvbiA9IGZ1bmN0aW9uKG5hbWUsIGZuKSB7XHJcblx0Ly8gYXR0YWNoIHRoZSBjYWxsYmFja1xyXG5cdHZhciBsaXN0ZW5lciA9IGxpZmVMaW5lLm9uKFwiYWN0aW9uLWV4ZWMtXCIgKyBuYW1lLCBmbik7XHJcblxyXG5cdC8vIGluZm9ybSBhbnkgYWN0aW9uIHByb3ZpZGVyc1xyXG5cdGxpZmVMaW5lLmVtaXQoXCJhY3Rpb24tY3JlYXRlXCIsIG5hbWUpO1xyXG5cclxuXHQvLyBhbGwgYWN0aW9ucyByZW1vdmVkXHJcblx0dmFyIHJlbW92ZUFsbCA9IGxpZmVMaW5lLm9uKFwiYWN0aW9uLXJlbW92ZS1hbGxcIiwgKCkgPT4ge1xyXG5cdFx0Ly8gcmVtb3ZlIHRoZSBhY3Rpb24gbGlzdGVuZXJcclxuXHRcdGxpc3RlbmVyLnVuc3Vic2NyaWJlKCk7XHJcblx0XHRyZW1vdmVBbGwudW5zdWJzY3JpYmUoKTtcclxuXHR9KTtcclxuXHJcblx0cmV0dXJuIHtcclxuXHRcdHVuc3Vic2NyaWJlKCkge1xyXG5cdFx0XHQvLyByZW1vdmUgdGhlIGFjdGlvbiBsaXN0ZW5lclxyXG5cdFx0XHRsaXN0ZW5lci51bnN1YnNjcmliZSgpO1xyXG5cdFx0XHRyZW1vdmVBbGwudW5zdWJzY3JpYmUoKTtcclxuXHJcblx0XHRcdC8vIGluZm9ybSBhbnkgYWN0aW9uIHByb3ZpZGVyc1xyXG5cdFx0XHRsaWZlTGluZS5lbWl0KFwiYWN0aW9uLXJlbW92ZVwiLCBuYW1lKTtcclxuXHRcdH1cclxuXHR9O1xyXG59O1xyXG4iLCIvLyBjcmVhdGUgdGhlIGdsb2JhbCBvYmplY3RcclxucmVxdWlyZShcIi4uL2NvbW1vbi9nbG9iYWxcIik7XHJcbnJlcXVpcmUoXCIuL2dsb2JhbFwiKTtcclxuXHJcbi8vIGxvYWQgYWxsIHRoZSB3aWRnZXRzXHJcbnJlcXVpcmUoXCIuL3dpZGdldHMvc2lkZWJhclwiKTtcclxucmVxdWlyZShcIi4vd2lkZ2V0cy9jb250ZW50XCIpO1xyXG5yZXF1aXJlKFwiLi93aWRnZXRzL2xpbmtcIik7XHJcblxyXG4vLyBsb2FkIGFsbCB0aGUgdmlld3NcclxudmFyIGxpc3RWaWV3cyA9IHJlcXVpcmUoXCIuL3ZpZXdzL2xpc3RzXCIpO1xyXG5yZXF1aXJlKFwiLi92aWV3cy9pdGVtXCIpO1xyXG5yZXF1aXJlKFwiLi92aWV3cy9lZGl0XCIpO1xyXG5yZXF1aXJlKFwiLi92aWV3cy9sb2dpblwiKTtcclxucmVxdWlyZShcIi4vdmlld3MvYWNjb3VudFwiKTtcclxucmVxdWlyZShcIi4vdmlld3MvdXNlcnNcIik7XHJcblxyXG4vLyBzZXQgdXAgdGhlIGRhdGEgc3RvcmVcclxudmFyIHtzdG9yZX0gPSByZXF1aXJlKFwiLi9kYXRhLXN0b3JlXCIpO1xyXG5cclxuc3RvcmUoXCJhc3NpZ25tZW50c1wiKS5zZXRJbml0KGZ1bmN0aW9uKGl0ZW0pIHtcclxuXHQvLyBwYXJzZSB0aGUgZGF0ZVxyXG5cdGlmKHR5cGVvZiBpdGVtLmRhdGUgPT0gXCJzdHJpbmdcIikge1xyXG5cdFx0aXRlbS5kYXRlID0gbmV3IERhdGUoaXRlbS5kYXRlKTtcclxuXHR9XHJcbn0pO1xyXG5cclxuLy8gaW5zdGFudGlhdGUgdGhlIGRvbVxyXG5saWZlTGluZS5tYWtlRG9tKHtcclxuXHRwYXJlbnQ6IGRvY3VtZW50LmJvZHksXHJcblx0Z3JvdXA6IFtcclxuXHRcdHsgd2lkZ2V0OiBcInNpZGViYXJcIiB9LFxyXG5cdFx0eyB3aWRnZXQ6IFwiY29udGVudFwiIH1cclxuXHRdXHJcbn0pO1xyXG5cclxuLy8gYWRkIGxpc3Qgdmlld3MgdG8gdGhlIG5hdmJhclxyXG5saXN0Vmlld3MuaW5pdE5hdkJhcigpO1xyXG5cclxuLy8gY3JlYXRlIGEgbmV3IGFzc2lnbm1lbnRcclxubGlmZUxpbmUuYWRkQ29tbWFuZChcIk5ldyBhc3NpZ25tZW50XCIsICgpID0+IHtcclxuXHR2YXIgaWQgPSBNYXRoLmZsb29yKE1hdGgucmFuZG9tKCkgKiAxMDAwMDAwMDApO1xyXG5cclxuXHRsaWZlTGluZS5uYXYubmF2aWdhdGUoXCIvZWRpdC9cIiArIGlkKTtcclxufSk7XHJcblxyXG4vLyBjcmVhdGUgdGhlIGxvZ291dCBidXR0b25cclxubGlmZUxpbmUuYWRkTmF2Q29tbWFuZChcIkFjY291bnRcIiwgXCIvYWNjb3VudFwiKTtcclxuIiwiLyoqXHJcbiAqIERhdGUgcmVsYXRlZCB0b29sc1xyXG4gKi9cclxuXHJcbiAvLyBjaGVjayBpZiB0aGUgZGF0ZXMgYXJlIHRoZSBzYW1lIGRheVxyXG4gdmFyIGlzU2FtZURhdGUgPSBleHBvcnRzLmlzU2FtZURhdGUgPSBmdW5jdGlvbihkYXRlMSwgZGF0ZTIpIHtcclxuIFx0cmV0dXJuIGRhdGUxLmdldEZ1bGxZZWFyKCkgPT0gZGF0ZTIuZ2V0RnVsbFllYXIoKSAmJlxyXG4gXHRcdGRhdGUxLmdldE1vbnRoKCkgPT0gZGF0ZTIuZ2V0TW9udGgoKSAmJlxyXG4gXHRcdGRhdGUxLmdldERhdGUoKSA9PSBkYXRlMi5nZXREYXRlKCk7XHJcbiB9O1xyXG5cclxuIC8vIGNoZWNrIGlmIGEgZGF0ZSBpcyBsZXNzIHRoYW4gYW5vdGhlclxyXG4gdmFyIGlzU29vbmVyRGF0ZSA9IGV4cG9ydHMuaXNTb29uZXJEYXRlID0gZnVuY3Rpb24oZGF0ZTEsIGRhdGUyKSB7XHJcbiBcdHJldHVybiBkYXRlMS5nZXRGdWxsWWVhcigpIDw9IGRhdGUyLmdldEZ1bGxZZWFyKCkgJiZcclxuIFx0XHRkYXRlMS5nZXRNb250aCgpIDw9IGRhdGUyLmdldE1vbnRoKCkgJiZcclxuIFx0XHRkYXRlMS5nZXREYXRlKCkgPCBkYXRlMi5nZXREYXRlKCk7XHJcbiB9O1xyXG5cclxuIC8vIGdldCB0aGUgZGF0ZSBkYXlzIGZyb20gbm93XHJcbiB2YXIgZGF5c0Zyb21Ob3cgPSBleHBvcnRzLmRheXNGcm9tTm93ID0gZnVuY3Rpb24oZGF5cykge1xyXG4gXHR2YXIgZGF0ZSA9IG5ldyBEYXRlKCk7XHJcblxyXG4gXHQvLyBhZHZhbmNlIHRoZSBkYXRlXHJcbiBcdGRhdGUuc2V0RGF0ZShkYXRlLmdldERhdGUoKSArIGRheXMpO1xyXG5cclxuIFx0cmV0dXJuIGRhdGU7XHJcbiB9O1xyXG5cclxuIGNvbnN0IFNUUklOR19EQVlTID0gW1wiU3VuZGF5XCIsIFwiTW9uZGF5XCIsIFwiVHVlc2RheVwiLCBcIldlZGVuc2RheVwiLCBcIlRodXJzZGF5XCIsIFwiRnJpZGF5XCIsIFwiU2F0dXJkYXlcIl07XHJcblxyXG4gLy8gY29udmVydCBhIGRhdGUgdG8gYSBzdHJpbmdcclxuIHZhciBzdHJpbmdpZnlEYXRlID0gZXhwb3J0cy5zdHJpbmdpZnlEYXRlID0gZnVuY3Rpb24oZGF0ZSwgb3B0cyA9IHt9KSB7XHJcblx0IHZhciBzdHJEYXRlLCBzdHJUaW1lID0gXCJcIjtcclxuXHJcbiAgICAgLy8gY2hlY2sgaWYgdGhlIGRhdGUgaXMgYmVmb3JlIHRvZGF5XHJcbiAgICAgdmFyIGJlZm9yZU5vdyA9IGRhdGUuZ2V0VGltZSgpIDwgRGF0ZS5ub3coKTtcclxuXHJcbiBcdC8vIFRvZGF5XHJcbiBcdGlmKGlzU2FtZURhdGUoZGF0ZSwgbmV3IERhdGUoKSkpXHJcbiBcdFx0c3RyRGF0ZSA9IFwiVG9kYXlcIjtcclxuXHJcbiBcdC8vIFRvbW9ycm93XHJcbiBcdGVsc2UgaWYoaXNTYW1lRGF0ZShkYXRlLCBkYXlzRnJvbU5vdygxKSkgJiYgIWJlZm9yZU5vdylcclxuIFx0XHRzdHJEYXRlID0gXCJUb21vcnJvd1wiO1xyXG5cclxuIFx0Ly8gZGF5IG9mIHRoZSB3ZWVrICh0aGlzIHdlZWspXHJcbiBcdGVsc2UgaWYoaXNTb29uZXJEYXRlKGRhdGUsIGRheXNGcm9tTm93KDcpKSAmJiAhYmVmb3JlTm93KVxyXG4gXHRcdHN0ckRhdGUgPSBTVFJJTkdfREFZU1tkYXRlLmdldERheSgpXTtcclxuXHJcbiBcdC8vIHByaW50IHRoZSBkYXRlXHJcbiBcdGVsc2VcclxuXHQgXHRzdHJEYXRlID0gYCR7U1RSSU5HX0RBWVNbZGF0ZS5nZXREYXkoKV19ICR7ZGF0ZS5nZXRNb250aCgpICsgMX0vJHtkYXRlLmdldERhdGUoKX1gO1xyXG5cclxuXHQvLyBhZGQgdGhlIHRpbWUgb25cclxuXHRpZihvcHRzLmluY2x1ZGVUaW1lICYmICFpc1NraXBUaW1lKGRhdGUsIG9wdHMuc2tpcFRpbWVzKSkge1xyXG5cdFx0cmV0dXJuIHN0ckRhdGUgKyBcIiwgXCIgKyBzdHJpbmdpZnlUaW1lKGRhdGUpO1xyXG5cdH1cclxuXHJcblx0cmV0dXJuIHN0ckRhdGU7XHJcbiB9O1xyXG5cclxuLy8gY2hlY2sgaWYgdGhpcyBpcyBvbmUgb2YgdGhlIGdpdmVuIHNraXAgdGltZXNcclxudmFyIGlzU2tpcFRpbWUgPSAoZGF0ZSwgc2tpcHMgPSBbXSkgPT4ge1xyXG5cdHJldHVybiBza2lwcy5maW5kKHNraXAgPT4ge1xyXG5cdFx0cmV0dXJuIHNraXAuaG91ciA9PT0gZGF0ZS5nZXRIb3VycygpICYmIHNraXAubWludXRlID09PSBkYXRlLmdldE1pbnV0ZXMoKTtcclxuXHR9KTtcclxufTtcclxuXHJcbi8vIGNvbnZlcnQgYSB0aW1lIHRvIGEgc3RyaW5nXHJcbnZhciBzdHJpbmdpZnlUaW1lID0gZnVuY3Rpb24oZGF0ZSkge1xyXG5cdHZhciBob3VyID0gZGF0ZS5nZXRIb3VycygpO1xyXG5cclxuXHQvLyBnZXQgdGhlIGFtL3BtIHRpbWVcclxuXHR2YXIgaXNBbSA9IGhvdXIgPCAxMjtcclxuXHJcblx0Ly8gbWlkbmlnaHRcclxuXHRpZihob3VyID09PSAwKSBob3VyID0gMTI7XHJcblx0Ly8gYWZ0ZXIgbm9vblxyXG5cdGlmKGhvdXIgPiAxMikgaG91ciA9IGhvdXIgLSAxMjtcclxuXHJcblx0dmFyIG1pbnV0ZSA9IGRhdGUuZ2V0TWludXRlcygpO1xyXG5cclxuXHQvLyBhZGQgYSBsZWFkaW5nIDBcclxuXHRpZihtaW51dGUgPCAxMCkgbWludXRlID0gXCIwXCIgKyBtaW51dGU7XHJcblxyXG5cdHJldHVybiBob3VyICsgXCI6XCIgKyBtaW51dGUgKyAoaXNBbSA/IFwiYW1cIiA6IFwicG1cIik7XHJcbn1cclxuIiwiLyoqXHJcbiAqIEEgaGVscGVyIGZvciBidWlsZGluZyBkb20gbm9kZXNcclxuICovXHJcblxyXG5jb25zdCBTVkdfRUxFTUVOVFMgPSBbXCJzdmdcIiwgXCJsaW5lXCJdO1xyXG5jb25zdCBTVkdfTkFNRVNQQUNFID0gXCJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2Z1wiO1xyXG5cclxuLy8gYnVpbGQgYSBzaW5nbGUgZG9tIG5vZGVcclxudmFyIG1ha2VEb20gPSBmdW5jdGlvbihvcHRzID0ge30pIHtcclxuXHQvLyBnZXQgb3IgY3JlYXRlIHRoZSBuYW1lIG1hcHBpbmdcclxuXHR2YXIgbWFwcGVkID0gb3B0cy5tYXBwZWQgfHwge307XHJcblxyXG5cdHZhciAkZWw7XHJcblxyXG5cdC8vIHRoZSBlbGVtZW50IGlzIHBhcnQgb2YgdGhlIHN2ZyBuYW1lc3BhY2VcclxuXHRpZihTVkdfRUxFTUVOVFMuaW5kZXhPZihvcHRzLnRhZykgIT09IC0xKSB7XHJcblx0XHQkZWwgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50TlMoU1ZHX05BTUVTUEFDRSwgb3B0cy50YWcpO1xyXG5cdH1cclxuXHQvLyBhIHBsYWluIGVsZW1lbnRcclxuXHRlbHNlIHtcclxuXHRcdCRlbCA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQob3B0cy50YWcgfHwgXCJkaXZcIik7XHJcblx0fVxyXG5cclxuXHQvLyBzZXQgdGhlIGNsYXNzZXNcclxuXHRpZihvcHRzLmNsYXNzZXMpIHtcclxuXHRcdCRlbC5zZXRBdHRyaWJ1dGUoXCJjbGFzc1wiLCB0eXBlb2Ygb3B0cy5jbGFzc2VzID09IFwic3RyaW5nXCIgPyBvcHRzLmNsYXNzZXMgOiBvcHRzLmNsYXNzZXMuam9pbihcIiBcIikpO1xyXG5cdH1cclxuXHJcblx0Ly8gYXR0YWNoIHRoZSBhdHRyaWJ1dGVzXHJcblx0aWYob3B0cy5hdHRycykge1xyXG5cdFx0T2JqZWN0LmdldE93blByb3BlcnR5TmFtZXMob3B0cy5hdHRycylcclxuXHJcblx0XHQuZm9yRWFjaChhdHRyID0+ICRlbC5zZXRBdHRyaWJ1dGUoYXR0ciwgb3B0cy5hdHRyc1thdHRyXSkpO1xyXG5cdH1cclxuXHJcblx0Ly8gc2V0IHRoZSB0ZXh0IGNvbnRlbnRcclxuXHRpZihvcHRzLnRleHQpIHtcclxuXHRcdCRlbC5pbm5lclRleHQgPSBvcHRzLnRleHQ7XHJcblx0fVxyXG5cclxuXHQvLyBhdHRhY2ggdGhlIG5vZGUgdG8gaXRzIHBhcmVudFxyXG5cdGlmKG9wdHMucGFyZW50KSB7XHJcblx0XHRvcHRzLnBhcmVudC5pbnNlcnRCZWZvcmUoJGVsLCBvcHRzLmJlZm9yZSk7XHJcblx0fVxyXG5cclxuXHQvLyBhZGQgZXZlbnQgbGlzdGVuZXJzXHJcblx0aWYob3B0cy5vbikge1xyXG5cdFx0Zm9yKGxldCBuYW1lIG9mIE9iamVjdC5nZXRPd25Qcm9wZXJ0eU5hbWVzKG9wdHMub24pKSB7XHJcblx0XHRcdCRlbC5hZGRFdmVudExpc3RlbmVyKG5hbWUsIG9wdHMub25bbmFtZV0pO1xyXG5cclxuXHRcdFx0Ly8gYXR0YWNoIHRoZSBkb20gdG8gYSBkaXNwb3NhYmxlXHJcblx0XHRcdGlmKG9wdHMuZGlzcCkge1xyXG5cdFx0XHRcdG9wdHMuZGlzcC5hZGQoe1xyXG5cdFx0XHRcdFx0dW5zdWJzY3JpYmU6ICgpID0+ICRlbC5yZW1vdmVFdmVudExpc3RlbmVyKG5hbWUsIG9wdHMub25bbmFtZV0pXHJcblx0XHRcdFx0fSk7XHJcblx0XHRcdH1cclxuXHRcdH1cclxuXHR9XHJcblxyXG5cdC8vIHNldCB0aGUgdmFsdWUgb2YgYW4gaW5wdXQgZWxlbWVudFxyXG5cdGlmKG9wdHMudmFsdWUpIHtcclxuXHRcdCRlbC52YWx1ZSA9IG9wdHMudmFsdWU7XHJcblx0fVxyXG5cclxuXHQvLyBhZGQgdGhlIG5hbWUgbWFwcGluZ1xyXG5cdGlmKG9wdHMubmFtZSkge1xyXG5cdFx0bWFwcGVkW29wdHMubmFtZV0gPSAkZWw7XHJcblx0fVxyXG5cclxuXHQvLyBjcmVhdGUgdGhlIGNoaWxkIGRvbSBub2Rlc1xyXG5cdGlmKG9wdHMuY2hpbGRyZW4pIHtcclxuXHRcdGZvcihsZXQgY2hpbGQgb2Ygb3B0cy5jaGlsZHJlbikge1xyXG5cdFx0XHQvLyBtYWtlIGFuIGFycmF5IGludG8gYSBncm91cCBPYmplY3RcclxuXHRcdFx0aWYoQXJyYXkuaXNBcnJheShjaGlsZCkpIHtcclxuXHRcdFx0XHRjaGlsZCA9IHtcclxuXHRcdFx0XHRcdGdyb3VwOiBjaGlsZFxyXG5cdFx0XHRcdH07XHJcblx0XHRcdH1cclxuXHJcblx0XHRcdC8vIGF0dGFjaCBpbmZvcm1hdGlvbiBmb3IgdGhlIGdyb3VwXHJcblx0XHRcdGNoaWxkLnBhcmVudCA9ICRlbDtcclxuXHRcdFx0Y2hpbGQuZGlzcCA9IG9wdHMuZGlzcDtcclxuXHRcdFx0Y2hpbGQubWFwcGVkID0gbWFwcGVkO1xyXG5cclxuXHRcdFx0Ly8gYnVpbGQgdGhlIG5vZGUgb3IgZ3JvdXBcclxuXHRcdFx0bW9kdWxlLmV4cG9ydHMoY2hpbGQpO1xyXG5cdFx0fVxyXG5cdH1cclxuXHJcblx0cmV0dXJuIG1hcHBlZDtcclxufVxyXG5cclxuLy8gYnVpbGQgYSBncm91cCBvZiBkb20gbm9kZXNcclxudmFyIG1ha2VHcm91cCA9IGZ1bmN0aW9uKGdyb3VwKSB7XHJcblx0Ly8gc2hvcnRoYW5kIGZvciBhIGdyb3Vwc1xyXG5cdGlmKEFycmF5LmlzQXJyYXkoZ3JvdXApKSB7XHJcblx0XHRncm91cCA9IHtcclxuXHRcdFx0Y2hpbGRyZW46IGdyb3VwXHJcblx0XHR9O1xyXG5cdH1cclxuXHJcblx0Ly8gZ2V0IG9yIGNyZWF0ZSB0aGUgbmFtZSBtYXBwaW5nXHJcblx0dmFyIG1hcHBlZCA9IHt9O1xyXG5cclxuXHRmb3IobGV0IG5vZGUgb2YgZ3JvdXAuZ3JvdXApIHtcclxuXHRcdC8vIGNvcHkgb3ZlciBwcm9wZXJ0aWVzIGZyb20gdGhlIGdyb3VwXHJcblx0XHRub2RlLnBhcmVudCB8fCAobm9kZS5wYXJlbnQgPSBncm91cC5wYXJlbnQpO1xyXG5cdFx0bm9kZS5kaXNwIHx8IChub2RlLmRpc3AgPSBncm91cC5kaXNwKTtcclxuXHRcdG5vZGUubWFwcGVkID0gbWFwcGVkO1xyXG5cclxuXHRcdC8vIG1ha2UgdGhlIGRvbVxyXG5cdFx0bW9kdWxlLmV4cG9ydHMobm9kZSk7XHJcblx0fVxyXG5cclxuXHQvLyBjYWxsIHRoZSBjYWxsYmFjayB3aXRoIHRoZSBtYXBwZWQgbmFtZXNcclxuXHRpZihncm91cC5iaW5kKSB7XHJcblx0XHR2YXIgc3Vic2NyaXB0aW9uID0gZ3JvdXAuYmluZChtYXBwZWQpO1xyXG5cclxuXHRcdC8vIGlmIHRoZSByZXR1cm4gYSBzdWJzY3JpcHRpb24gYXR0YWNoIGl0IHRvIHRoZSBkaXNwb3NhYmxlXHJcblx0XHRpZihzdWJzY3JpcHRpb24gJiYgZ3JvdXAuZGlzcCkge1xyXG5cdFx0XHRncm91cC5kaXNwLmFkZChzdWJzY3JpcHRpb24pO1xyXG5cdFx0fVxyXG5cdH1cclxuXHJcblx0cmV0dXJuIG1hcHBlZDtcclxufTtcclxuXHJcbi8vIGEgY29sbGVjdGlvbiBvZiB3aWRnZXRzXHJcbnZhciB3aWRnZXRzID0ge307XHJcblxyXG5tb2R1bGUuZXhwb3J0cyA9IGZ1bmN0aW9uKG9wdHMpIHtcclxuXHQvLyBoYW5kbGUgYSBncm91cFxyXG5cdGlmKEFycmF5LmlzQXJyYXkob3B0cykgfHwgb3B0cy5ncm91cCkge1xyXG5cdFx0cmV0dXJuIG1ha2VHcm91cChvcHRzKTtcclxuXHR9XHJcblx0Ly8gbWFrZSBhIHdpZGdldFxyXG5cdGVsc2UgaWYob3B0cy53aWRnZXQpIHtcclxuXHRcdHZhciB3aWRnZXQgPSB3aWRnZXRzW29wdHMud2lkZ2V0XTtcclxuXHJcblx0XHQvLyBub3QgZGVmaW5lZFxyXG5cdFx0aWYoIXdpZGdldCkge1xyXG5cdFx0XHR0aHJvdyBuZXcgRXJyb3IoYFdpZGdldCAnJHtvcHRzLndpZGdldH0nIGlzIG5vdCBkZWZpbmVkIG1ha2Ugc3VyZSBpdHMgYmVlbiBpbXBvcnRlZGApO1xyXG5cdFx0fVxyXG5cclxuXHRcdC8vIGdlbmVyYXRlIHRoZSB3aWRnZXQgY29udGVudFxyXG5cdFx0dmFyIGJ1aWx0ID0gd2lkZ2V0Lm1ha2Uob3B0cyk7XHJcblxyXG5cdFx0cmV0dXJuIG1ha2VHcm91cCh7XHJcblx0XHRcdHBhcmVudDogb3B0cy5wYXJlbnQsXHJcblx0XHRcdGRpc3A6IG9wdHMuZGlzcCxcclxuXHRcdFx0Z3JvdXA6IEFycmF5LmlzQXJyYXkoYnVpbHQpID8gYnVpbHQgOiBbYnVpbHRdLFxyXG5cdFx0XHRiaW5kOiB3aWRnZXQuYmluZCAmJiB3aWRnZXQuYmluZC5iaW5kKHdpZGdldCwgb3B0cylcclxuXHRcdH0pO1xyXG5cdH1cclxuXHQvLyBtYWtlIGEgc2luZ2xlIG5vZGVcclxuXHRlbHNlIHtcclxuXHRcdHJldHVybiBtYWtlRG9tKG9wdHMpO1xyXG5cdH1cclxufTtcclxuXHJcbi8vIHJlZ2lzdGVyIGEgd2lkZ2V0XHJcbm1vZHVsZS5leHBvcnRzLnJlZ2lzdGVyID0gZnVuY3Rpb24obmFtZSwgd2lkZ2V0KSB7XHJcblx0d2lkZ2V0c1tuYW1lXSA9IHdpZGdldDtcclxufTtcclxuIiwiLyoqXHJcbiAqIEEgdmlldyBmb3IgYWNjZXNzaW5nL21vZGlmeWluZyBpbmZvcm1hdGlvbiBhYm91dCB0aGUgY3VycmVudCB1c2VyXHJcbiAqL1xyXG5cclxubGlmZUxpbmUubmF2LnJlZ2lzdGVyKHtcclxuXHRtYXRjaGVyOiAvXig/OlxcL3VzZXJcXC8oLis/KXxcXC9hY2NvdW50KSQvLFxyXG5cclxuXHRtYWtlKHtzZXRUaXRsZSwgY29udGVudCwgbWF0Y2h9KSB7XHJcblx0XHRzZXRUaXRsZShcIkFjY291bnRcIik7XHJcblxyXG5cdFx0dmFyIHVybCA9IFwiL2FwaS9hdXRoL2luZm8vZ2V0XCI7XHJcblxyXG5cdFx0Ly8gYWRkIHRoZSB1c2VybmFtZSBpZiBvbmUgaXMgZ2l2ZW5cclxuXHRcdGlmKG1hdGNoWzFdKSB1cmwgKz0gYD91c2VybmFtZT0ke21hdGNoWzFdfWA7XHJcblxyXG5cdFx0Ly8gbG9hZCB0aGUgdXNlciBkYXRhXHJcblx0XHRmZXRjaCh1cmwsIHsgY3JlZGVudGlhbHM6IFwiaW5jbHVkZVwiIH0pXHJcblxyXG5cdFx0LnRoZW4ocmVzID0+IHJlcy5qc29uKCkpXHJcblxyXG5cdFx0LnRoZW4ocmVzID0+IHtcclxuXHRcdFx0Ly8gbm8gc3VjaCB1c2VyIG9yIGFjY2VzcyBpcyBkZW5pZWRcclxuXHRcdFx0aWYocmVzLnN0YXR1cyA9PSBcImZhaWxcIikge1xyXG5cdFx0XHRcdGxpZmVMaW5lLm1ha2VEb20oe1xyXG5cdFx0XHRcdFx0cGFyZW50OiBjb250ZW50LFxyXG5cdFx0XHRcdFx0Y2xhc3NlczogXCJjb250ZW50LXBhZGRlZFwiLFxyXG5cdFx0XHRcdFx0dGV4dDogXCJDb3VsZCBub3QgYWNjZXNzIHRoZSB1c2VyIHlvdSB3ZXJlIGxvb2tpbmcgZm9yXCJcclxuXHRcdFx0XHR9KTtcclxuXHJcblx0XHRcdFx0cmV0dXJuO1xyXG5cdFx0XHR9XHJcblxyXG5cdFx0XHR2YXIgdXNlciA9IHJlcy5kYXRhO1xyXG5cclxuXHRcdFx0Ly8gZ2VuZXJhdGUgdGhlIHBhZ2VcclxuXHRcdFx0dmFyIGNoaWxkcmVuID0gW107XHJcblxyXG5cdFx0XHRjaGlsZHJlbi5wdXNoKHtcclxuXHRcdFx0XHR0YWc6IFwiaDJcIixcclxuXHRcdFx0XHR0ZXh0OiB1c2VyLnVzZXJuYW1lXHJcblx0XHRcdH0pO1xyXG5cclxuXHRcdFx0Ly8gZGlzcGxheSB0aGUgYWRtaW4gc3RhdHVzIG9mIGFub3RoZXIgdXNlclxyXG5cdFx0XHRpZihtYXRjaFsxXSkge1xyXG5cdFx0XHRcdGNoaWxkcmVuLnB1c2goe1xyXG5cdFx0XHRcdFx0dGV4dDogYCR7dXNlci51c2VybmFtZX0gaXMgJHt1c2VyLmFkbWluID8gXCJcIiA6IFwibm90XCJ9IGFuIGFkbWluYFxyXG5cdFx0XHRcdH0pO1xyXG5cdFx0XHR9XHJcblx0XHRcdC8vIGRpc3BsYXkgdGhlIGFkbWluIHN0YXR1cyBvZiB0aGlzIHVzZXJcclxuXHRcdFx0ZWxzZSB7XHJcblx0XHRcdFx0Y2hpbGRyZW4ucHVzaCh7XHJcblx0XHRcdFx0XHR0ZXh0OiBgWW91IGFyZSAke3VzZXIuYWRtaW4gPyBcIlwiIDogXCJub3RcIn0gYW4gYWRtaW5gXHJcblx0XHRcdFx0fSk7XHJcblxyXG5cdFx0XHRcdC8vIGFkZCBhIGxpbmsgYXQgYSBsaXN0IG9mIGFsbCB1c2Vyc1xyXG5cdFx0XHRcdGlmKHVzZXIuYWRtaW4pIHtcclxuXHRcdFx0XHRcdGNoaWxkcmVuLnB1c2goeyB0YWc6IFwiYnJcIiB9KTtcclxuXHJcblx0XHRcdFx0XHRjaGlsZHJlbi5wdXNoKHtcclxuXHRcdFx0XHRcdFx0d2lkZ2V0OiBcImxpbmtcIixcclxuXHRcdFx0XHRcdFx0aHJlZjogXCIvdXNlcnNcIixcclxuXHRcdFx0XHRcdFx0dGV4dDogXCJWaWV3IGFsbCB1c2Vyc1wiXHJcblx0XHRcdFx0XHR9KTtcclxuXHRcdFx0XHR9XHJcblx0XHRcdH1cclxuXHJcblx0XHRcdGNoaWxkcmVuLnB1c2goe1xyXG5cdFx0XHRcdHRhZzogXCJmb3JtXCIsXHJcblx0XHRcdFx0Y2hpbGRyZW46IFtcclxuXHRcdFx0XHRcdHtcclxuXHRcdFx0XHRcdFx0Y2xhc3NlczogXCJlZGl0b3Itcm93XCIsXHJcblx0XHRcdFx0XHRcdGNoaWxkcmVuOiBbXHJcblx0XHRcdFx0XHRcdFx0e1xyXG5cdFx0XHRcdFx0XHRcdFx0dGFnOiBcImlucHV0XCIsXHJcblx0XHRcdFx0XHRcdFx0XHRjbGFzc2VzOiBcImlucHV0LWZpbGxcIixcclxuXHRcdFx0XHRcdFx0XHRcdGF0dHJzOiB7XHJcblx0XHRcdFx0XHRcdFx0XHRcdHR5cGU6IFwicGFzc3dvcmRcIixcclxuXHRcdFx0XHRcdFx0XHRcdFx0cGxhY2Vob2xkZXI6IFwiT2xkIHBhc3N3b3JkXCJcclxuXHRcdFx0XHRcdFx0XHRcdH0sXHJcblx0XHRcdFx0XHRcdFx0XHRuYW1lOiBcIm9sZFBhc3N3b3JkXCJcclxuXHRcdFx0XHRcdFx0XHR9LFxyXG5cdFx0XHRcdFx0XHRcdHtcclxuXHRcdFx0XHRcdFx0XHRcdHRhZzogXCJpbnB1dFwiLFxyXG5cdFx0XHRcdFx0XHRcdFx0Y2xhc3NlczogXCJpbnB1dC1maWxsXCIsXHJcblx0XHRcdFx0XHRcdFx0XHRhdHRyczoge1xyXG5cdFx0XHRcdFx0XHRcdFx0XHR0eXBlOiBcInBhc3N3b3JkXCIsXHJcblx0XHRcdFx0XHRcdFx0XHRcdHBsYWNlaG9sZGVyOiBcIk5ldyBwYXNzd29yZFwiXHJcblx0XHRcdFx0XHRcdFx0XHR9LFxyXG5cdFx0XHRcdFx0XHRcdFx0bmFtZTogXCJwYXNzd29yZFwiXHJcblx0XHRcdFx0XHRcdFx0fVxyXG5cdFx0XHRcdFx0XHRdXHJcblx0XHRcdFx0XHR9LFxyXG5cdFx0XHRcdFx0e1xyXG5cdFx0XHRcdFx0XHR0YWc6IFwiYnV0dG9uXCIsXHJcblx0XHRcdFx0XHRcdGNsYXNzZXM6IFwiZmFuY3ktYnV0dG9uXCIsXHJcblx0XHRcdFx0XHRcdHRleHQ6IFwiQ2hhbmdlIHBhc3N3b3JkXCIsXHJcblx0XHRcdFx0XHRcdGF0dHJzOiB7XHJcblx0XHRcdFx0XHRcdFx0dHlwZTogXCJzdWJtaXRcIlxyXG5cdFx0XHRcdFx0XHR9XHJcblx0XHRcdFx0XHR9LFxyXG5cdFx0XHRcdFx0e1xyXG5cdFx0XHRcdFx0XHRuYW1lOiBcIm1zZ1wiXHJcblx0XHRcdFx0XHR9XHJcblx0XHRcdFx0XSxcclxuXHRcdFx0XHRvbjoge1xyXG5cdFx0XHRcdFx0Ly8gY2hhbmdlIHRoZSBwYXNzd29yZFxyXG5cdFx0XHRcdFx0c3VibWl0OiBlID0+IHtcclxuXHRcdFx0XHRcdFx0ZS5wcmV2ZW50RGVmYXVsdCgpO1xyXG5cclxuXHRcdFx0XHRcdFx0Ly8gbm8gcGFzc3dvcmQgc3VwcGxpZWRcclxuXHRcdFx0XHRcdFx0aWYoIXBhc3N3b3JkLnZhbHVlKSB7XHJcblx0XHRcdFx0XHRcdFx0c2hvd01zZyhcIkVudGVyIGEgbmV3IHBhc3N3b3JkXCIpO1xyXG5cdFx0XHRcdFx0XHRcdHJldHVybjtcclxuXHRcdFx0XHRcdFx0fVxyXG5cclxuXHRcdFx0XHRcdFx0Ly8gc2VuZCB0aGUgcGFzc3dvcmQgY2hhbmdlIHJlcXVlc3RcclxuXHRcdFx0XHRcdFx0ZmV0Y2goYC9hcGkvYXV0aC9pbmZvL3NldD91c2VybmFtZT0ke3VzZXIudXNlcm5hbWV9YCwge1xyXG5cdFx0XHRcdFx0XHRcdGNyZWRlbnRpYWxzOiBcImluY2x1ZGVcIixcclxuXHRcdFx0XHRcdFx0XHRtZXRob2Q6IFwiUE9TVFwiLFxyXG5cdFx0XHRcdFx0XHRcdGJvZHk6IEpTT04uc3RyaW5naWZ5KHtcclxuXHRcdFx0XHRcdFx0XHRcdHBhc3N3b3JkOiBwYXNzd29yZC52YWx1ZSxcclxuXHRcdFx0XHRcdFx0XHRcdG9sZFBhc3N3b3JkOiBvbGRQYXNzd29yZC52YWx1ZVxyXG5cdFx0XHRcdFx0XHRcdH0pXHJcblx0XHRcdFx0XHRcdH0pXHJcblxyXG5cdFx0XHRcdFx0XHQudGhlbihyZXMgPT4gcmVzLmpzb24oKSlcclxuXHJcblx0XHRcdFx0XHRcdC50aGVuKHJlcyA9PiB7XHJcblx0XHRcdFx0XHRcdFx0Ly8gcGFzc3dvcmQgY2hhbmdlIGZhaWxlZFxyXG5cdFx0XHRcdFx0XHRcdGlmKHJlcy5zdGF0dXMgPT0gXCJmYWlsXCIpIHtcclxuXHRcdFx0XHRcdFx0XHRcdHNob3dNc2cocmVzLmRhdGEubXNnKTtcclxuXHRcdFx0XHRcdFx0XHR9XHJcblxyXG5cdFx0XHRcdFx0XHRcdGlmKHJlcy5zdGF0dXMgPT0gXCJzdWNjZXNzXCIpIHtcclxuXHRcdFx0XHRcdFx0XHRcdHNob3dNc2coXCJQYXNzd29yZCBjaGFuZ2VkXCIpO1xyXG5cdFx0XHRcdFx0XHRcdH1cclxuXHJcblx0XHRcdFx0XHRcdFx0Ly8gY2xlYXIgdGhlIGZpZWxkc1xyXG5cdFx0XHRcdFx0XHRcdHBhc3N3b3JkLnZhbHVlID0gXCJcIjtcclxuXHRcdFx0XHRcdFx0XHRvbGRQYXNzd29yZC52YWx1ZSA9IFwiXCI7XHJcblx0XHRcdFx0XHRcdH0pO1xyXG5cdFx0XHRcdFx0fVxyXG5cdFx0XHRcdH1cclxuXHRcdFx0fSk7XHJcblxyXG5cdFx0XHRjaGlsZHJlbi5wdXNoKHsgdGFnOiBcImJyXCIgfSk7XHJcblx0XHRcdGNoaWxkcmVuLnB1c2goeyB0YWc6IFwiYnJcIiB9KTtcclxuXHJcblx0XHRcdC8vIG9ubHkgZGlzcGxheSB0aGUgbG9nb3V0IGJ1dHRvbiBpZiB3ZSBhcmUgb24gdGhlIC9hY2NvdW50IHBhZ2VcclxuXHRcdFx0aWYoIW1hdGNoWzFdKSB7XHJcblx0XHRcdFx0Y2hpbGRyZW4ucHVzaCh7XHJcblx0XHRcdFx0XHR0YWc6IFwiYnV0dG9uXCIsXHJcblx0XHRcdFx0XHRjbGFzc2VzOiBcImZhbmN5LWJ1dHRvblwiLFxyXG5cdFx0XHRcdFx0dGV4dDogXCJMb2dvdXRcIixcclxuXHRcdFx0XHRcdG9uOiB7XHJcblx0XHRcdFx0XHRcdGNsaWNrOiAoKSA9PiB7XHJcblx0XHRcdFx0XHRcdFx0Ly8gc2VuZCB0aGUgbG9nb3V0IHJlcXVlc3RcclxuXHRcdFx0XHRcdFx0XHRmZXRjaChcIi9hcGkvYXV0aC9sb2dvdXRcIiwgeyBjcmVkZW50aWFsczogXCJpbmNsdWRlXCIgfSlcclxuXHJcblx0XHRcdFx0XHRcdFx0Ly8gcmV0dXJuIHRvIHRoZSBsb2dpbiBwYWdlXHJcblx0XHRcdFx0XHRcdFx0LnRoZW4oKCkgPT4gbGlmZUxpbmUubmF2Lm5hdmlnYXRlKFwiL2xvZ2luXCIpKTtcclxuXHRcdFx0XHRcdFx0fVxyXG5cdFx0XHRcdFx0fVxyXG5cdFx0XHRcdH0pO1xyXG5cdFx0XHR9XHJcblxyXG5cdFx0XHR2YXIge3Bhc3N3b3JkLCBvbGRQYXNzd29yZCwgbXNnfSA9IGxpZmVMaW5lLm1ha2VEb20oe1xyXG5cdFx0XHRcdHBhcmVudDogY29udGVudCxcclxuXHRcdFx0XHRjbGFzc2VzOiBcImNvbnRlbnQtcGFkZGVkXCIsXHJcblx0XHRcdFx0Y2hpbGRyZW5cclxuXHRcdFx0fSk7XHJcblxyXG5cdFx0XHQvLyBzaG93IGEgbWVzc2FnZVxyXG5cdFx0XHR2YXIgc2hvd01zZyA9IGZ1bmN0aW9uKHRleHQpIHtcclxuXHRcdFx0XHRtc2cuaW5uZXJUZXh0ID0gdGV4dDtcclxuXHRcdFx0fTtcclxuXHRcdH0pXHJcblx0fVxyXG59KTtcclxuIiwiLyoqXHJcbiAqIEVkaXQgYW4gYXNzaWduZW1udFxyXG4gKi9cclxuXHJcbnZhciB7ZGF5c0Zyb21Ob3csIHN0cmluZ2lmeURhdGV9ID0gcmVxdWlyZShcIi4uL3V0aWwvZGF0ZVwiKTtcclxudmFyIHtzdG9yZX0gPSByZXF1aXJlKFwiLi4vZGF0YS1zdG9yZVwiKTtcclxuXHJcbnZhciBhc3NpZ25tZW50cyA9IHN0b3JlKFwiYXNzaWdubWVudHNcIik7XHJcblxyXG5saWZlTGluZS5uYXYucmVnaXN0ZXIoe1xyXG5cdG1hdGNoZXI6IC9eXFwvZWRpdFxcLyguKz8pJC8sXHJcblxyXG5cdG1ha2Uoe21hdGNoLCBjb250ZW50LCBzZXRUaXRsZSwgZGlzcG9zYWJsZX0pIHtcclxuXHRcdHZhciBhY3Rpb25TdWIsIGRlbGV0ZVN1YjtcclxuXHJcblx0XHR2YXIgY2hhbmdlU3ViID0gYXNzaWdubWVudHMuZ2V0KG1hdGNoWzFdLCBmdW5jdGlvbihpdGVtKSB7XHJcblx0XHRcdC8vIGNsZWFyIHRoZSBjb250ZW50XHJcblx0XHRcdGNvbnRlbnQuaW5uZXJIVE1MID0gXCJcIjtcclxuXHJcblx0XHRcdC8vIHJlbW92ZSB0aGUgcHJldmlvdXMgYWN0aW9uXHJcblx0XHRcdGlmKGFjdGlvblN1Yikge1xyXG5cdFx0XHRcdGFjdGlvblN1Yi51bnN1YnNjcmliZSgpO1xyXG5cdFx0XHRcdGRlbGV0ZVN1Yi51bnN1YnNjcmliZSgpO1xyXG5cdFx0XHR9XHJcblxyXG5cdFx0XHQvLyBhZGQgYSBidXR0b24gYmFjayB0byB0aGUgdmlld1xyXG5cdFx0XHRpZihpdGVtKSB7XHJcblx0XHRcdFx0YWN0aW9uU3ViID0gbGlmZUxpbmUuYWRkQWN0aW9uKFwiVmlld1wiLCAoKSA9PiBsaWZlTGluZS5uYXYubmF2aWdhdGUoXCIvaXRlbS9cIiArIGl0ZW0uaWQpKTtcclxuXHJcblx0XHRcdFx0ZGVsZXRlU3ViID0gbGlmZUxpbmUuYWRkQWN0aW9uKFwiRGVsZXRlXCIsICgpID0+IHtcclxuXHRcdFx0XHRcdC8vIHJlbW92ZSB0aGUgaXRlbVxyXG5cdFx0XHRcdFx0YXNzaWdubWVudHMucmVtb3ZlKGl0ZW0uaWQpO1xyXG5cclxuXHRcdFx0XHRcdC8vIG5hdmlnYXRlIGF3YXlcclxuXHRcdFx0XHRcdGxpZmVMaW5lLm5hdi5uYXZpZ2F0ZShcIi9cIik7XHJcblx0XHRcdFx0fSk7XHJcblx0XHRcdH1cclxuXHJcblx0XHRcdC8vIGlmIHRoZSBpdGVtIGRvZXMgbm90IGV4aXN0IGNyZWF0ZSBpdFxyXG5cdFx0XHRpZighaXRlbSkge1xyXG5cdFx0XHRcdGl0ZW0gPSB7XHJcblx0XHRcdFx0XHRuYW1lOiBcIlVubmFtZWQgaXRlbVwiLFxyXG5cdFx0XHRcdFx0Y2xhc3M6IFwiQ2xhc3NcIixcclxuXHRcdFx0XHRcdGRhdGU6IGdlbkRhdGUoKSxcclxuXHRcdFx0XHRcdGlkOiBtYXRjaFsxXSxcclxuXHRcdFx0XHRcdGRlc2NyaXB0aW9uOiBcIlwiLFxyXG5cdFx0XHRcdFx0bW9kaWZpZWQ6IERhdGUubm93KClcclxuXHRcdFx0XHR9O1xyXG5cdFx0XHR9XHJcblxyXG5cdFx0XHQvLyBzZXQgdGhlIGluaXRhbCB0aXRsZVxyXG5cdFx0XHRzZXRUaXRsZShcIkVkaXRpbmdcIik7XHJcblxyXG5cdFx0XHQvLyBzYXZlIGNoYW5nZXNcclxuXHRcdFx0dmFyIGNoYW5nZSA9ICgpID0+IHtcclxuXHRcdFx0XHQvLyBidWlsZCB0aGUgbmV3IGl0ZW1cclxuXHRcdFx0XHRpdGVtID0ge1xyXG5cdFx0XHRcdFx0aWQ6IGl0ZW0uaWQsXHJcblx0XHRcdFx0XHRuYW1lOiBtYXBwZWQubmFtZS52YWx1ZSxcclxuXHRcdFx0XHRcdGNsYXNzOiBtYXBwZWQuY2xhc3MudmFsdWUsXHJcblx0XHRcdFx0XHRkYXRlOiBuZXcgRGF0ZShtYXBwZWQuZGF0ZS52YWx1ZSArIFwiIFwiICsgbWFwcGVkLnRpbWUudmFsdWUpLFxyXG5cdFx0XHRcdFx0ZGVzY3JpcHRpb246IG1hcHBlZC5kZXNjcmlwdGlvbi52YWx1ZSxcclxuXHRcdFx0XHRcdG1vZGlmaWVkOiBEYXRlLm5vdygpXHJcblx0XHRcdFx0fTtcclxuXHJcblx0XHRcdFx0Ly8gYWRkIGEgYnV0dG9uIGJhY2sgdG8gdGhlIHZpZXdcclxuXHRcdFx0XHRpZighYWN0aW9uU3ViKSB7XHJcblx0XHRcdFx0XHRhY3Rpb25TdWIgPSBsaWZlTGluZS5hZGRBY3Rpb24oXCJWaWV3XCIsICgpID0+IGxpZmVMaW5lLm5hdi5uYXZpZ2F0ZShcIi9pdGVtL1wiICsgaXRlbS5pZCkpO1xyXG5cclxuXHRcdFx0XHRcdGRlbGV0ZVN1YiA9IGxpZmVMaW5lLmFkZEFjdGlvbihcIkRlbGV0ZVwiLCAoKSA9PiB7XHJcblx0XHRcdFx0XHRcdC8vIHJlbW92ZSB0aGUgaXRlbVxyXG5cdFx0XHRcdFx0XHRhc3NpZ25tZW50cy5yZW1vdmUoaXRlbS5pZCk7XHJcblxyXG5cdFx0XHRcdFx0XHQvLyBuYXZpZ2F0ZSBhd2F5XHJcblx0XHRcdFx0XHRcdGxpZmVMaW5lLm5hdi5uYXZpZ2F0ZShcIi9cIik7XHJcblx0XHRcdFx0XHR9KTtcclxuXHRcdFx0XHR9XHJcblxyXG5cdFx0XHRcdC8vIHNhdmUgdGhlIGNoYW5nZXNcclxuXHRcdFx0XHRhc3NpZ25tZW50cy5zZXQoaXRlbSwgY2hhbmdlU3ViKTtcclxuXHRcdFx0fTtcclxuXHJcblx0XHRcdC8vIHJlbmRlciB0aGUgdWlcclxuXHRcdFx0dmFyIG1hcHBlZCA9IGxpZmVMaW5lLm1ha2VEb20oe1xyXG5cdFx0XHRcdHBhcmVudDogY29udGVudCxcclxuXHRcdFx0XHR0YWc6IFwiZm9ybVwiLFxyXG5cdFx0XHRcdGNoaWxkcmVuOiBbXHJcblx0XHRcdFx0XHR7XHJcblx0XHRcdFx0XHRcdGNsYXNzZXM6IFwiZWRpdG9yLXJvd1wiLFxyXG5cdFx0XHRcdFx0XHRjaGlsZHJlbjogW1xyXG5cdFx0XHRcdFx0XHRcdHtcclxuXHRcdFx0XHRcdFx0XHRcdGNsYXNzZXM6IFwiaW5wdXQtZmlsbFwiLFxyXG5cdFx0XHRcdFx0XHRcdFx0dGFnOiBcImlucHV0XCIsXHJcblx0XHRcdFx0XHRcdFx0XHR2YWx1ZTogaXRlbS5uYW1lLFxyXG5cdFx0XHRcdFx0XHRcdFx0bmFtZTogXCJuYW1lXCIsXHJcblx0XHRcdFx0XHRcdFx0XHRvbjoge1xyXG5cdFx0XHRcdFx0XHRcdFx0XHRpbnB1dDogY2hhbmdlXHJcblx0XHRcdFx0XHRcdFx0XHR9XHJcblx0XHRcdFx0XHRcdFx0fVxyXG5cdFx0XHRcdFx0XHRdXHJcblx0XHRcdFx0XHR9LFxyXG5cdFx0XHRcdFx0e1xyXG5cdFx0XHRcdFx0XHRjbGFzc2VzOiBcImVkaXRvci1yb3dcIixcclxuXHRcdFx0XHRcdFx0Y2hpbGRyZW46IFtcclxuXHRcdFx0XHRcdFx0XHR7XHJcblx0XHRcdFx0XHRcdFx0XHRjbGFzc2VzOiBcImlucHV0LWZpbGxcIixcclxuXHRcdFx0XHRcdFx0XHRcdHRhZzogXCJpbnB1dFwiLFxyXG5cdFx0XHRcdFx0XHRcdFx0dmFsdWU6IGl0ZW0uY2xhc3MsXHJcblx0XHRcdFx0XHRcdFx0XHRuYW1lOiBcImNsYXNzXCIsXHJcblx0XHRcdFx0XHRcdFx0XHRvbjoge1xyXG5cdFx0XHRcdFx0XHRcdFx0XHRpbnB1dDogY2hhbmdlXHJcblx0XHRcdFx0XHRcdFx0XHR9XHJcblx0XHRcdFx0XHRcdFx0fVxyXG5cdFx0XHRcdFx0XHRdXHJcblx0XHRcdFx0XHR9LFxyXG5cdFx0XHRcdFx0e1xyXG5cdFx0XHRcdFx0XHRjbGFzc2VzOiBcImVkaXRvci1yb3dcIixcclxuXHRcdFx0XHRcdFx0Y2hpbGRyZW46IFtcclxuXHRcdFx0XHRcdFx0XHR7XHJcblx0XHRcdFx0XHRcdFx0XHRjbGFzc2VzOiBcImlucHV0LWZpbGxcIixcclxuXHRcdFx0XHRcdFx0XHRcdHRhZzogXCJpbnB1dFwiLFxyXG5cdFx0XHRcdFx0XHRcdFx0YXR0cnM6IHtcclxuXHRcdFx0XHRcdFx0XHRcdFx0dHlwZTogXCJkYXRlXCJcclxuXHRcdFx0XHRcdFx0XHRcdH0sXHJcblx0XHRcdFx0XHRcdFx0XHR2YWx1ZTogYCR7aXRlbS5kYXRlLmdldEZ1bGxZZWFyKCl9LSR7cGFkKGl0ZW0uZGF0ZS5nZXRNb250aCgpICsgMSl9LSR7cGFkKGl0ZW0uZGF0ZS5nZXREYXRlKCkpfWAsXHJcblx0XHRcdFx0XHRcdFx0XHRuYW1lOiBcImRhdGVcIixcclxuXHRcdFx0XHRcdFx0XHRcdG9uOiB7XHJcblx0XHRcdFx0XHRcdFx0XHRcdGlucHV0OiBjaGFuZ2VcclxuXHRcdFx0XHRcdFx0XHRcdH1cclxuXHRcdFx0XHRcdFx0XHR9LFxyXG5cdFx0XHRcdFx0XHRcdHtcclxuXHRcdFx0XHRcdFx0XHRcdGNsYXNzZXM6IFwiaW5wdXQtZmlsbFwiLFxyXG5cdFx0XHRcdFx0XHRcdFx0dGFnOiBcImlucHV0XCIsXHJcblx0XHRcdFx0XHRcdFx0XHRhdHRyczoge1xyXG5cdFx0XHRcdFx0XHRcdFx0XHR0eXBlOiBcInRpbWVcIlxyXG5cdFx0XHRcdFx0XHRcdFx0fSxcclxuXHRcdFx0XHRcdFx0XHRcdHZhbHVlOiBgJHtpdGVtLmRhdGUuZ2V0SG91cnMoKX06JHtwYWQoaXRlbS5kYXRlLmdldE1pbnV0ZXMoKSl9YCxcclxuXHRcdFx0XHRcdFx0XHRcdG5hbWU6IFwidGltZVwiLFxyXG5cdFx0XHRcdFx0XHRcdFx0b246IHtcclxuXHRcdFx0XHRcdFx0XHRcdFx0aW5wdXQ6IGNoYW5nZVxyXG5cdFx0XHRcdFx0XHRcdFx0fVxyXG5cdFx0XHRcdFx0XHRcdH1cclxuXHRcdFx0XHRcdFx0XVxyXG5cdFx0XHRcdFx0fSxcclxuXHRcdFx0XHRcdHtcclxuXHRcdFx0XHRcdFx0Y2xhc3NlczogXCJ0ZXh0YXJlYS13cmFwcGVyXCIsXHJcblx0XHRcdFx0XHRcdGNoaWxkcmVuOiBbXHJcblx0XHRcdFx0XHRcdFx0e1xyXG5cdFx0XHRcdFx0XHRcdFx0dGFnOiBcInRleHRhcmVhXCIsXHJcblx0XHRcdFx0XHRcdFx0XHRjbGFzc2VzOiBcInRleHRhcmVhLWZpbGxcIixcclxuXHRcdFx0XHRcdFx0XHRcdHZhbHVlOiBpdGVtLmRlc2NyaXB0aW9uLFxyXG5cdFx0XHRcdFx0XHRcdFx0YXR0cnM6IHtcclxuXHRcdFx0XHRcdFx0XHRcdFx0cGxhY2Vob2xkZXI6IFwiRGVzY3JpcHRpb25cIlxyXG5cdFx0XHRcdFx0XHRcdFx0fSxcclxuXHRcdFx0XHRcdFx0XHRcdG5hbWU6IFwiZGVzY3JpcHRpb25cIixcclxuXHRcdFx0XHRcdFx0XHRcdG9uOiB7XHJcblx0XHRcdFx0XHRcdFx0XHRcdGlucHV0OiBjaGFuZ2VcclxuXHRcdFx0XHRcdFx0XHRcdH1cclxuXHRcdFx0XHRcdFx0XHR9XHJcblx0XHRcdFx0XHRcdF1cclxuXHRcdFx0XHRcdH1cclxuXHRcdFx0XHRdXHJcblx0XHRcdH0pO1xyXG5cdFx0fSk7XHJcblxyXG5cdFx0Ly8gcmVtb3ZlIHRoZSBzdWJzY3JpcHRpb24gd2hlbiB0aGlzIHZpZXcgaXMgZGVzdHJveWVkXHJcblx0XHRkaXNwb3NhYmxlLmFkZChjaGFuZ2VTdWIpO1xyXG5cdH1cclxufSk7XHJcblxyXG4vLyBhZGQgYSBsZWFkaW5nIDAgaWYgYSBudW1iZXIgaXMgbGVzcyB0aGFuIDEwXHJcbnZhciBwYWQgPSBudW1iZXIgPT4gKG51bWJlciA8IDEwKSA/IFwiMFwiICsgbnVtYmVyIDogbnVtYmVyO1xyXG5cclxuLy8gY3JlYXRlIGEgZGF0ZSBvZiB0b2RheSBhdCAxMTo1OXBtXHJcbnZhciBnZW5EYXRlID0gKCkgPT4ge1xyXG5cdHZhciBkYXRlID0gbmV3IERhdGUoKTtcclxuXHJcblx0Ly8gc2V0IHRoZSB0aW1lXHJcblx0ZGF0ZS5zZXRIb3VycygyMyk7XHJcblx0ZGF0ZS5zZXRNaW51dGVzKDU5KTtcclxuXHJcblx0cmV0dXJuIGRhdGU7XHJcbn07XHJcbiIsIi8qKlxyXG4gKiBUaGUgdmlldyBmb3IgYW4gYXNzaWdubWVudFxyXG4gKi9cclxuXHJcbnZhciB7ZGF5c0Zyb21Ob3csIHN0cmluZ2lmeURhdGV9ID0gcmVxdWlyZShcIi4uL3V0aWwvZGF0ZVwiKTtcclxudmFyIHtzdG9yZX0gPSByZXF1aXJlKFwiLi4vZGF0YS1zdG9yZVwiKTtcclxuXHJcbnZhciBhc3NpZ25tZW50cyA9IHN0b3JlKFwiYXNzaWdubWVudHNcIik7XHJcblxyXG5saWZlTGluZS5uYXYucmVnaXN0ZXIoe1xyXG5cdG1hdGNoZXI6IC9eXFwvaXRlbVxcLyguKz8pJC8sXHJcblxyXG5cdG1ha2Uoe21hdGNoLCBzZXRUaXRsZSwgY29udGVudCwgZGlzcG9zYWJsZX0pIHtcclxuXHRcdHZhciBhY3Rpb25Eb25lU3ViLCBhY3Rpb25FZGl0U3ViO1xyXG5cclxuXHQgXHRkaXNwb3NhYmxlLmFkZChcclxuXHRcdFx0YXNzaWdubWVudHMuZ2V0KG1hdGNoWzFdLCBmdW5jdGlvbihpdGVtKSB7XHJcblx0XHRcdFx0Ly8gY2xlYXIgdGhlIGNvbnRlbnRcclxuXHRcdFx0XHRjb250ZW50LmlubmVySFRNTCA9IFwiXCI7XHJcblxyXG5cdFx0XHRcdC8vIHJlbW92ZSB0aGUgb2xkIGFjdGlvblxyXG5cdFx0XHRcdGlmKGFjdGlvbkRvbmVTdWIpIHtcclxuXHRcdFx0XHRcdGFjdGlvbkRvbmVTdWIudW5zdWJzY3JpYmUoKTtcclxuXHRcdFx0XHRcdGFjdGlvbkVkaXRTdWIudW5zdWJzY3JpYmUoKTtcclxuXHRcdFx0XHR9XHJcblxyXG5cdFx0XHRcdC8vIG5vIHN1Y2ggYXNzaWdubWVudFxyXG5cdFx0XHRcdGlmKCFpdGVtKSB7XHJcblx0XHRcdFx0XHRzZXRUaXRsZShcIk5vdCBmb3VuZFwiKTtcclxuXHJcblx0XHRcdFx0XHRsaWZlTGluZS5tYWtlRG9tKHtcclxuXHRcdFx0XHRcdFx0cGFyZW50OiBjb250ZW50LFxyXG5cdFx0XHRcdFx0XHRjbGFzc2VzOiBcImNvbnRlbnQtcGFkZGVkXCIsXHJcblx0XHRcdFx0XHRcdGNoaWxkcmVuOiBbXHJcblx0XHRcdFx0XHRcdFx0e1xyXG5cdFx0XHRcdFx0XHRcdFx0dGFnOiBcInNwYW5cIixcclxuXHRcdFx0XHRcdFx0XHRcdHRleHQ6IFwiVGhlIGFzc2lnbm1lbnQgeW91IHdoZXJlIGxvb2tpbmcgZm9yIGNvdWxkIG5vdCBiZSBmb3VuZC4gXCJcclxuXHRcdFx0XHRcdFx0XHR9LFxyXG5cdFx0XHRcdFx0XHRcdHtcclxuXHRcdFx0XHRcdFx0XHRcdHdpZGdldDogXCJsaW5rXCIsXHJcblx0XHRcdFx0XHRcdFx0XHRocmVmOiBcIi9cIixcclxuXHRcdFx0XHRcdFx0XHRcdHRleHQ6IFwiR28gaG9tZS5cIlxyXG5cdFx0XHRcdFx0XHRcdH1cclxuXHRcdFx0XHRcdFx0XVxyXG5cdFx0XHRcdFx0fSlcclxuXHJcblx0XHRcdFx0XHRyZXR1cm47XHJcblx0XHRcdFx0fVxyXG5cclxuXHRcdFx0XHQvLyBzZXQgdGhlIHRpdGxlIGZvciB0aGUgY29udGVudFxyXG5cdFx0XHRcdHNldFRpdGxlKFwiQXNzaWdubWVudFwiKTtcclxuXHJcblx0XHRcdFx0Ly8gbWFyayB0aGUgaXRlbSBhcyBkb25lXHJcblx0XHRcdFx0YWN0aW9uRG9uZVN1YiA9IGxpZmVMaW5lLmFkZEFjdGlvbihpdGVtLmRvbmUgPyBcIkRvbmVcIiA6IFwiTm90IGRvbmVcIiwgKCkgPT4ge1xyXG5cdFx0XHRcdFx0Ly8gbWFyayB0aGUgaXRlbSBkb25lXHJcblx0XHRcdFx0XHRpdGVtLmRvbmUgPSAhaXRlbS5kb25lO1xyXG5cclxuXHRcdFx0XHRcdC8vIHVwZGF0ZSB0aGUgbW9kaWZpZWQgdGltZVxyXG5cdFx0XHRcdFx0aXRlbS5tb2RpZmllZCA9IERhdGUubm93KCk7XHJcblxyXG5cdFx0XHRcdFx0Ly8gc2F2ZSB0aGUgY2hhbmdlXHJcblx0XHRcdFx0XHRhc3NpZ25tZW50cy5zZXQoaXRlbSk7XHJcblx0XHRcdFx0fSk7XHJcblxyXG5cdFx0XHRcdC8vIGVkaXQgdGhlIGl0ZW1cclxuXHRcdFx0XHRhY3Rpb25FZGl0U3ViID0gbGlmZUxpbmUuYWRkQWN0aW9uKFwiRWRpdFwiLFxyXG5cdFx0XHRcdFx0KCkgPT4gbGlmZUxpbmUubmF2Lm5hdmlnYXRlKFwiL2VkaXQvXCIgKyBpdGVtLmlkKSk7XHJcblxyXG5cdFx0XHRcdC8vIHRpbWVzIHRvIHNraXBcclxuXHRcdFx0XHR2YXIgc2tpcFRpbWVzID0gW1xyXG5cdFx0XHRcdFx0eyBob3VyOiAyMywgbWludXRlOiA1OSB9XHJcblx0XHRcdFx0XTtcclxuXHJcblx0XHRcdFx0bGlmZUxpbmUubWFrZURvbSh7XHJcblx0XHRcdFx0XHRwYXJlbnQ6IGNvbnRlbnQsXHJcblx0XHRcdFx0XHRjbGFzc2VzOiBcImNvbnRlbnQtcGFkZGVkXCIsXHJcblx0XHRcdFx0XHRjaGlsZHJlbjogW1xyXG5cdFx0XHRcdFx0XHR7XHJcblx0XHRcdFx0XHRcdFx0Y2xhc3NlczogXCJhc3NpZ25tZW50LW5hbWVcIixcclxuXHRcdFx0XHRcdFx0XHR0ZXh0OiBpdGVtLm5hbWVcclxuXHRcdFx0XHRcdFx0fSxcclxuXHRcdFx0XHRcdFx0e1xyXG5cdFx0XHRcdFx0XHRcdGNsYXNzZXM6IFwiYXNzaWdubWVudC1pbmZvLXJvd1wiLFxyXG5cdFx0XHRcdFx0XHRcdGNoaWxkcmVuOiBbXHJcblx0XHRcdFx0XHRcdFx0XHR7XHJcblx0XHRcdFx0XHRcdFx0XHRcdGNsYXNzZXM6IFwiYXNzaWdubWVudC1pbmZvLWdyb3dcIixcclxuXHRcdFx0XHRcdFx0XHRcdFx0dGV4dDogaXRlbS5jbGFzc1xyXG5cdFx0XHRcdFx0XHRcdFx0fSxcclxuXHRcdFx0XHRcdFx0XHRcdHtcclxuXHRcdFx0XHRcdFx0XHRcdFx0dGV4dDogc3RyaW5naWZ5RGF0ZShpdGVtLmRhdGUsIHsgaW5jbHVkZVRpbWU6IHRydWUsIHNraXBUaW1lcyB9KVxyXG5cdFx0XHRcdFx0XHRcdFx0fVxyXG5cdFx0XHRcdFx0XHRcdF1cclxuXHRcdFx0XHRcdFx0fSxcclxuXHRcdFx0XHRcdFx0e1xyXG5cdFx0XHRcdFx0XHRcdGNsYXNzZXM6IFwiYXNzaWdubWVudC1kZXNjcmlwdGlvblwiLFxyXG5cdFx0XHRcdFx0XHRcdHRleHQ6IGl0ZW0uZGVzY3JpcHRpb25cclxuXHRcdFx0XHRcdFx0fVxyXG5cdFx0XHRcdFx0XVxyXG5cdFx0XHRcdH0pO1xyXG5cdFx0XHR9KVxyXG5cdFx0KTtcclxuXHR9XHJcbn0pO1xyXG4iLCIvKipcclxuICogRGlzcGxheSBhIGxpc3Qgb2YgdXBjb21taW5nIGFzc2lnbm1lbnRzXHJcbiAqL1xyXG5cclxudmFyIHtkYXlzRnJvbU5vdywgaXNTYW1lRGF0ZSwgc3RyaW5naWZ5RGF0ZSwgaXNTb29uZXJEYXRlfSA9IHJlcXVpcmUoXCIuLi91dGlsL2RhdGVcIik7XHJcbnZhciB7c3RvcmV9ID0gcmVxdWlyZShcIi4uL2RhdGEtc3RvcmVcIik7XHJcblxyXG52YXIgYXNzaWdubWVudHMgPSBzdG9yZShcImFzc2lnbm1lbnRzXCIpO1xyXG5cclxuY29uc3QgTUlOX0xFTkdUSCA9IDEwO1xyXG5cclxuLy8gYWxsIHRoZSBkaWZmZXJlbnQgbGlzdHNcclxuY29uc3QgTElTVFMgPSBbXHJcblx0e1xyXG5cdFx0dXJsOiBcIi9cIixcclxuXHRcdHRpdGxlOiBcIlRvZGF5XCIsXHJcblx0XHQvLyBzaG93IGFsbCBhdCByZWFzb25hYmxlIG51bWJlciBvZiBpbmNvbXBsZXRlIGFzc2lnbm1lbnRzXHJcblx0XHRtYW51YWxGaWx0ZXI6IGRhdGEgPT4ge1xyXG5cdFx0XHQvLyB0b2RheXMgZGF0ZVxyXG5cdFx0XHR2YXIgdG9kYXkgPSBuZXcgRGF0ZSgpO1xyXG5cclxuXHRcdFx0cmV0dXJuIGRhdGEuZmlsdGVyKGl0ZW0gPT4gIWl0ZW0uZG9uZSAmJiBpc1NhbWVEYXRlKHRvZGF5LCBpdGVtLmRhdGUpKTtcclxuXHRcdH1cclxuXHR9LFxyXG5cdHtcclxuXHRcdHVybDogXCIvd2Vla1wiLFxyXG5cdFx0dGl0bGU6IFwiVGhpcyB3ZWVrXCIsXHJcblx0XHQvLyBzaG93IGFsbCBhdCByZWFzb25hYmxlIG51bWJlciBvZiBpbmNvbXBsZXRlIGFzc2lnbm1lbnRzXHJcblx0XHRtYW51YWxGaWx0ZXI6IGRhdGEgPT4ge1xyXG5cdFx0XHR2YXIgdGFrZW4gPSBbXTtcclxuXHRcdFx0Ly8gZGF5cyB0byB0aGUgZW5kIG9mIHRoaXMgd2Vla1xyXG5cdFx0XHR2YXIgZW5kRGF0ZSA9IGRheXNGcm9tTm93KDcgLSAobmV3IERhdGUoKSkuZ2V0RGF5KCkpO1xyXG5cclxuXHRcdFx0Zm9yKGxldCBpdGVtIG9mIGRhdGEpIHtcclxuXHRcdFx0XHQvLyBhbHJlYWR5IGRvbmVcclxuXHRcdFx0XHRpZihpdGVtLmRvbmUpIGNvbnRpbnVlO1xyXG5cclxuXHRcdFx0XHQvLyBpZiB3ZSBoYXZlIGFscmVhZHkgaGl0IHRoZSByZXF1aXJlZCBsZW5ndGggZ28gYnkgZGF0ZVxyXG5cdFx0XHRcdGlmKHRha2VuLmxlbmd0aCA+PSBNSU5fTEVOR1RIICYmICFpc1Nvb25lckRhdGUoaXRlbS5kYXRlLCBlbmREYXRlKSkge1xyXG5cdFx0XHRcdFx0Y29udGludWU7XHJcblx0XHRcdFx0fVxyXG5cclxuXHRcdFx0XHR0YWtlbi5wdXNoKGl0ZW0pO1xyXG5cdFx0XHR9XHJcblxyXG5cdFx0XHRyZXR1cm4gdGFrZW47XHJcblx0XHR9XHJcblx0fSxcclxuXHR7XHJcblx0XHR1cmw6IFwiL3VwY29taW5nXCIsXHJcblx0XHRmaWx0ZXI6IGl0ZW0gPT4gIWl0ZW0uZG9uZSxcclxuXHRcdHRpdGxlOiBcIlVwY29taW5nXCJcclxuXHR9LFxyXG5cdHtcclxuXHRcdHVybDogXCIvZG9uZVwiLFxyXG5cdFx0ZmlsdGVyOiBpdGVtID0+IGl0ZW0uZG9uZSxcclxuXHRcdHRpdGxlOiBcIkRvbmVcIlxyXG5cdH1cclxuXTtcclxuXHJcbi8vIGFkZCBsaXN0IHZpZXcgbGlua3MgdG8gdGhlIG5hdmJhclxyXG5leHBvcnRzLmluaXROYXZCYXIgPSBmdW5jdGlvbigpIHtcclxuXHRMSVNUUy5mb3JFYWNoKGxpc3QgPT4gbGlmZUxpbmUuYWRkTmF2Q29tbWFuZChsaXN0LnRpdGxlLCBsaXN0LnVybCkpO1xyXG59O1xyXG5cclxubGlmZUxpbmUubmF2LnJlZ2lzdGVyKHtcclxuXHRtYXRjaGVyKHVybCkge1xyXG5cdFx0cmV0dXJuIExJU1RTLmZpbmQobGlzdCA9PiBsaXN0LnVybCA9PSB1cmwpO1xyXG5cdH0sXHJcblxyXG5cdC8vIG1ha2UgdGhlIGxpc3RcclxuXHRtYWtlKHtzZXRUaXRsZSwgY29udGVudCwgZGlzcG9zYWJsZSwgbWF0Y2h9KSB7XHJcblx0XHRkaXNwb3NhYmxlLmFkZChcclxuXHRcdFx0YXNzaWdubWVudHMuZ2V0QWxsKGZ1bmN0aW9uKGRhdGEpIHtcclxuXHRcdFx0XHQvLyBjbGVhciB0aGUgY29udGVudFxyXG5cdFx0XHRcdGNvbnRlbnQuaW5uZXJIVE1MID0gXCJcIjtcclxuXHJcblx0XHRcdFx0Ly8gc2V0IHRoZSBwYWdlIHRpdGxlXHJcblx0XHRcdFx0c2V0VGl0bGUobWF0Y2gudGl0bGUpO1xyXG5cclxuXHRcdFx0XHQvLyBzb3J0IHRoZSBhc3NpbmdtZW50c1xyXG5cdFx0XHRcdGRhdGEuc29ydCgoYSwgYikgPT4ge1xyXG5cdFx0XHRcdFx0Ly8gZGlmZmVyZW50IGRhdGVzXHJcblx0XHRcdFx0XHRpZihhLmRhdGUuZ2V0VGltZSgpICE9IGIuZGF0ZS5nZXRUaW1lKCkpIHtcclxuXHRcdFx0XHRcdFx0cmV0dXJuIGEuZGF0ZS5nZXRUaW1lKCkgLSBiLmRhdGUuZ2V0VGltZSgpO1xyXG5cdFx0XHRcdFx0fVxyXG5cclxuXHRcdFx0XHRcdC8vIG9yZGVyIGJ5IG5hbWVcclxuXHRcdFx0XHRcdGlmKGEubmFtZSA8IGIubmFtZSkgcmV0dXJuIC0xO1xyXG5cdFx0XHRcdFx0aWYoYS5uYW1lID4gYi5uYW1lKSByZXR1cm4gMTtcclxuXHJcblx0XHRcdFx0XHRyZXR1cm4gMDtcclxuXHRcdFx0XHR9KTtcclxuXHJcblx0XHRcdFx0aWYobWF0Y2gubWFudWFsRmlsdGVyKSB7XHJcblx0XHRcdFx0XHRkYXRhID0gbWF0Y2gubWFudWFsRmlsdGVyKGRhdGEpO1xyXG5cdFx0XHRcdH1cclxuXHRcdFx0XHQvLyByZW1vdmUgY29tcGxldGVkIGl0ZW1zXHJcblx0XHRcdFx0ZWxzZSB7XHJcblx0XHRcdFx0XHRkYXRhID0gZGF0YS5maWx0ZXIobWF0Y2guZmlsdGVyKTtcclxuXHRcdFx0XHR9XHJcblxyXG5cdFx0XHRcdC8vIHRoZSBsYXN0IGl0ZW0gcmVuZGVyZWRcclxuXHRcdFx0XHR2YXIgbGFzdDtcclxuXHJcblx0XHRcdFx0Ly8gcmVuZGVyIHRoZSBsaXN0XHJcblx0XHRcdFx0ZGF0YS5mb3JFYWNoKChpdGVtLCBpKSA9PiB7XHJcblx0XHRcdFx0XHQvLyByZW5kZXIgdGhlIGhlYWRlcnNcclxuXHRcdFx0XHRcdGlmKGkgPT09IDAgfHwgIWlzU2FtZURhdGUoaXRlbS5kYXRlLCBsYXN0LmRhdGUpKSB7XHJcblx0XHRcdFx0XHRcdGxpZmVMaW5lLm1ha2VEb20oe1xyXG5cdFx0XHRcdFx0XHRcdHBhcmVudDogY29udGVudCxcclxuXHRcdFx0XHRcdFx0XHRjbGFzc2VzOiBcImxpc3QtaGVhZGVyXCIsXHJcblx0XHRcdFx0XHRcdFx0dGV4dDogc3RyaW5naWZ5RGF0ZShpdGVtLmRhdGUpXHJcblx0XHRcdFx0XHRcdH0pO1xyXG5cdFx0XHRcdFx0fVxyXG5cclxuXHRcdFx0XHRcdC8vIG1ha2UgdGhpcyB0aGUgbGFzdCBpdGVtXHJcblx0XHRcdFx0XHRsYXN0ID0gaXRlbTtcclxuXHJcblx0XHRcdFx0XHQvLyByZW5kZXIgdGhlIGl0ZW1cclxuXHRcdFx0XHRcdGxpZmVMaW5lLm1ha2VEb20oe1xyXG5cdFx0XHRcdFx0XHRwYXJlbnQ6IGNvbnRlbnQsXHJcblx0XHRcdFx0XHRcdGNsYXNzZXM6IFwibGlzdC1pdGVtXCIsXHJcblx0XHRcdFx0XHRcdGNoaWxkcmVuOiBbXHJcblx0XHRcdFx0XHRcdFx0eyBjbGFzc2VzOiBcImxpc3QtaXRlbS1uYW1lXCIsIHRleHQ6IGl0ZW0ubmFtZSB9LFxyXG5cdFx0XHRcdFx0XHRcdHsgY2xhc3NlczogXCJsaXN0LWl0ZW0tY2xhc3NcIiwgdGV4dDogaXRlbS5jbGFzcyB9XHJcblx0XHRcdFx0XHRcdF0sXHJcblx0XHRcdFx0XHRcdG9uOiB7XHJcblx0XHRcdFx0XHRcdFx0Y2xpY2s6ICgpID0+IGxpZmVMaW5lLm5hdi5uYXZpZ2F0ZShcIi9pdGVtL1wiICsgaXRlbS5pZClcclxuXHRcdFx0XHRcdFx0fVxyXG5cdFx0XHRcdFx0fSk7XHJcblx0XHRcdFx0fSk7XHJcblx0XHRcdH0pXHJcblx0XHQpO1xyXG5cdH1cclxufSk7XHJcbiIsIi8qKlxyXG4gKiBTaG93IGEgbG9naW4gYnV0dG9uIHRvIHRoZSB1c2VyXHJcbiAqL1xyXG5cclxubGlmZUxpbmUubmF2LnJlZ2lzdGVyKHtcclxuXHRtYXRjaGVyOiBcIi9sb2dpblwiLFxyXG5cclxuXHRtYWtlKHtzZXRUaXRsZSwgY29udGVudH0pIHtcclxuXHRcdC8vIHNldCB0aGUgcGFnZSB0aXRsZVxyXG5cdFx0c2V0VGl0bGUoXCJMb2dpblwiKTtcclxuXHJcblx0XHQvLyBjcmVhdGUgdGhlIGxvZ2luIGZvcm1cclxuXHRcdHZhciB7dXNlcm5hbWUsIHBhc3N3b3JkLCBtc2d9ID0gbGlmZUxpbmUubWFrZURvbSh7XHJcblx0XHRcdHBhcmVudDogY29udGVudCxcclxuXHRcdFx0dGFnOiBcImZvcm1cIixcclxuXHRcdFx0Y2xhc3NlczogXCJjb250ZW50LXBhZGRlZFwiLFxyXG5cdFx0XHRjaGlsZHJlbjogW1xyXG5cdFx0XHRcdHtcclxuXHRcdFx0XHRcdGNsYXNzZXM6IFwiZWRpdG9yLXJvd1wiLFxyXG5cdFx0XHRcdFx0Y2hpbGRyZW46IFtcclxuXHRcdFx0XHRcdFx0e1xyXG5cdFx0XHRcdFx0XHRcdHRhZzogXCJpbnB1dFwiLFxyXG5cdFx0XHRcdFx0XHRcdG5hbWU6IFwidXNlcm5hbWVcIixcclxuXHRcdFx0XHRcdFx0XHRjbGFzc2VzOiBcImlucHV0LWZpbGxcIixcclxuXHRcdFx0XHRcdFx0XHRhdHRyczoge1xyXG5cdFx0XHRcdFx0XHRcdFx0cGxhY2Vob2xkZXI6IFwiVXNlcm5hbWVcIixcclxuXHRcdFx0XHRcdFx0XHR9XHJcblx0XHRcdFx0XHRcdH1cclxuXHRcdFx0XHRcdF1cclxuXHRcdFx0XHR9LFxyXG5cdFx0XHRcdHtcclxuXHRcdFx0XHRcdGNsYXNzZXM6IFwiZWRpdG9yLXJvd1wiLFxyXG5cdFx0XHRcdFx0Y2hpbGRyZW46IFtcclxuXHRcdFx0XHRcdFx0e1xyXG5cdFx0XHRcdFx0XHRcdHRhZzogXCJpbnB1dFwiLFxyXG5cdFx0XHRcdFx0XHRcdG5hbWU6IFwicGFzc3dvcmRcIixcclxuXHRcdFx0XHRcdFx0XHRjbGFzc2VzOiBcImlucHV0LWZpbGxcIixcclxuXHRcdFx0XHRcdFx0XHRhdHRyczoge1xyXG5cdFx0XHRcdFx0XHRcdFx0dHlwZTogXCJwYXNzd29yZFwiLFxyXG5cdFx0XHRcdFx0XHRcdFx0cGxhY2Vob2xkZXI6IFwiUGFzc3dvcmRcIlxyXG5cdFx0XHRcdFx0XHRcdH1cclxuXHRcdFx0XHRcdFx0fVxyXG5cdFx0XHRcdFx0XVxyXG5cdFx0XHRcdH0sXHJcblx0XHRcdFx0e1xyXG5cdFx0XHRcdFx0dGFnOiBcImJ1dHRvblwiLFxyXG5cdFx0XHRcdFx0dGV4dDogXCJMb2dpblwiLFxyXG5cdFx0XHRcdFx0Y2xhc3NlczogXCJmYW5jeS1idXR0b25cIixcclxuXHRcdFx0XHRcdGF0dHJzOiB7XHJcblx0XHRcdFx0XHRcdHR5cGU6IFwic3VibWl0XCJcclxuXHRcdFx0XHRcdH1cclxuXHRcdFx0XHR9LFxyXG5cdFx0XHRcdHtcclxuXHRcdFx0XHRcdGNsYXNzZXM6IFwiZXJyb3ItbXNnXCIsXHJcblx0XHRcdFx0XHRuYW1lOiBcIm1zZ1wiXHJcblx0XHRcdFx0fVxyXG5cdFx0XHRdLFxyXG5cdFx0XHRvbjoge1xyXG5cdFx0XHRcdHN1Ym1pdDogZSA9PiB7XHJcblx0XHRcdFx0XHRlLnByZXZlbnREZWZhdWx0KCk7XHJcblxyXG5cdFx0XHRcdFx0Ly8gc2VuZCB0aGUgbG9naW4gcmVxdWVzdFxyXG5cdFx0XHRcdFx0ZmV0Y2goXCIvYXBpL2F1dGgvbG9naW5cIiwge1xyXG5cdFx0XHRcdFx0XHRtZXRob2Q6IFwiUE9TVFwiLFxyXG5cdFx0XHRcdFx0XHRjcmVkZW50aWFsczogXCJpbmNsdWRlXCIsXHJcblx0XHRcdFx0XHRcdGJvZHk6IEpTT04uc3RyaW5naWZ5KHtcclxuXHRcdFx0XHRcdFx0XHR1c2VybmFtZTogdXNlcm5hbWUudmFsdWUsXHJcblx0XHRcdFx0XHRcdFx0cGFzc3dvcmQ6IHBhc3N3b3JkLnZhbHVlXHJcblx0XHRcdFx0XHRcdH0pXHJcblx0XHRcdFx0XHR9KVxyXG5cclxuXHRcdFx0XHRcdC8vIHBhcnNlIHRoZSBqc29uXHJcblx0XHRcdFx0XHQudGhlbihyZXMgPT4gcmVzLmpzb24oKSlcclxuXHJcblx0XHRcdFx0XHQvLyBwcm9jZXNzIHRoZSByZXNwb25zZVxyXG5cdFx0XHRcdFx0LnRoZW4ocmVzID0+IHtcclxuXHRcdFx0XHRcdFx0Ly8gbG9naW4gc3VjZWVkZWQgZ28gaG9tZVxyXG5cdFx0XHRcdFx0XHRpZihyZXMuc3RhdHVzID09IFwic3VjY2Vzc1wiKSB7XHJcblx0XHRcdFx0XHRcdFx0bGlmZUxpbmUubmF2Lm5hdmlnYXRlKFwiL1wiKTtcclxuXHRcdFx0XHRcdFx0XHRyZXR1cm47XHJcblx0XHRcdFx0XHRcdH1cclxuXHJcblx0XHRcdFx0XHRcdC8vIGxvZ2luIGZhaWxlZFxyXG5cdFx0XHRcdFx0XHRpZihyZXMuc3RhdHVzID09IFwiZmFpbFwiKSB7XHJcblx0XHRcdFx0XHRcdFx0ZXJyb3JNc2coXCJMb2dpbiBmYWlsZWRcIik7XHJcblx0XHRcdFx0XHRcdH1cclxuXHRcdFx0XHRcdH0pO1xyXG5cdFx0XHRcdH1cclxuXHRcdFx0fVxyXG5cdFx0fSk7XHJcblxyXG5cdFx0Ly8gZGlzcGxheSBhbiBlcnJvciBtZXNzYWdlXHJcblx0XHR2YXIgZXJyb3JNc2cgPSBmdW5jdGlvbih0ZXh0KSB7XHJcblx0XHRcdG1zZy5pbm5lclRleHQgPSB0ZXh0O1xyXG5cdFx0fTtcclxuXHR9XHJcbn0pO1xyXG5cclxuLy8gbG9nb3V0XHJcbmxpZmVMaW5lLmxvZ291dCA9IGZ1bmN0aW9uKCkge1xyXG5cdC8vIHNlbmQgdGhlIGxvZ291dCByZXF1ZXN0XHJcblx0ZmV0Y2goXCIvYXBpL2F1dGgvbG9nb3V0XCIsIHtcclxuXHRcdGNyZWRlbnRpYWxzOiBcImluY2x1ZGVcIlxyXG5cdH0pXHJcblxyXG5cdC8vIGdvIHRvIHRoZSBsb2dpbiBwYWdlXHJcblx0LnRoZW4oKCkgPT4gbGlmZUxpbmUubmF2Lm5hdmlnYXRlKFwiL2xvZ2luXCIpKTtcclxufTtcclxuIiwiLyoqXHJcbiAqIEEgcGFnZSB3aXRoIGxpbmtzIHRvIGFsbCB1c2Vyc1xyXG4gKi9cclxuXHJcbmxpZmVMaW5lLm5hdi5yZWdpc3Rlcih7XHJcblx0bWF0Y2hlcjogXCIvdXNlcnNcIixcclxuXHJcblx0bWFrZSh7c2V0VGl0bGUsIGNvbnRlbnR9KSB7XHJcblx0XHRzZXRUaXRsZShcIkFsbCB1c2Vyc1wiKTtcclxuXHJcblx0XHQvLyBsb2FkIHRoZSBsaXN0IG9mIHVzZXJzXHJcblx0XHRmZXRjaChcIi9hcGkvYXV0aC9pbmZvL3VzZXJzXCIsIHtcclxuXHRcdFx0Y3JlZGVudGlhbHM6IFwiaW5jbHVkZVwiXHJcblx0XHR9KVxyXG5cclxuXHRcdC50aGVuKHJlcyA9PiByZXMuanNvbigpKVxyXG5cclxuXHRcdC50aGVuKCh7c3RhdHVzLCBkYXRhOiB1c2Vyc30pID0+IHtcclxuXHRcdFx0Ly8gbm90IGF1dGhlbnRpY2F0ZWRcclxuXHRcdFx0aWYoc3RhdHVzID09IFwiZmFpbFwiKSB7XHJcblx0XHRcdFx0bGlmZUxpbmUubWFrZURvbSh7XHJcblx0XHRcdFx0XHRwYXJlbnQ6IGNvbnRlbnQsXHJcblx0XHRcdFx0XHRjbGFzc2VzOiBcImNvbnRlbnQtcGFkZGVkXCIsXHJcblx0XHRcdFx0XHR0ZXh0OiBcIllvdSBkbyBub3QgaGF2ZSBhY2Nlc3MgdG8gdGhlIHVzZXIgbGlzdFwiXHJcblx0XHRcdFx0fSk7XHJcblxyXG5cdFx0XHRcdHJldHVybjtcclxuXHRcdFx0fVxyXG5cclxuXHRcdFx0Ly8gc29ydCBieSBhZG1pbiBzdGF0dXNcclxuXHRcdFx0dXNlcnMuc29ydCgoYSwgYikgPT4ge1xyXG5cdFx0XHRcdC8vIHNvcnQgYWRtaW5zXHJcblx0XHRcdFx0aWYoYS5hZG1pbiAmJiAhYi5hZG1pbikgcmV0dXJuIC0xO1xyXG5cdFx0XHRcdGlmKCFhLmFkbWluICYmIGIuYWRtaW4pIHJldHVybiAxO1xyXG5cclxuXHRcdFx0XHQvLyBzb3J0IGJ5IHVzZXJuYW1lXHJcblx0XHRcdFx0aWYoYS51c2VybmFtZSA8IGIudXNlcm5hbWUpIHJldHVybiAtMTtcclxuXHRcdFx0XHRpZihhLnVzZXJuYW1lID4gYi51c2VybmFtZSkgcmV0dXJuIDE7XHJcblxyXG5cdFx0XHRcdHJldHVybiAwO1xyXG5cdFx0XHR9KTtcclxuXHJcblx0XHRcdHZhciBkaXNwbGF5VXNlcnMgPSBbXTtcclxuXHJcblx0XHRcdGRpc3BsYXlVc2Vycy5wdXNoKHtcclxuXHRcdFx0XHRjbGFzc2VzOiBcImxpc3QtaGVhZGVyXCIsXHJcblx0XHRcdFx0dGV4dDogXCJBZG1pbnNcIlxyXG5cdFx0XHR9KTtcclxuXHJcblx0XHRcdHZhciBhZG1pblNlY3Rpb25Eb25lID0gZmFsc2U7XHJcblxyXG5cdFx0XHQvLyBnZW5lcmF0ZSB0aGUgdXNlciBsaXN0XHJcblx0XHRcdHVzZXJzLmZvckVhY2godXNlciA9PiB7XHJcblx0XHRcdFx0Ly8gcmVuZGVyIGhlYWRlcnMgZm9yIGFkbWluIGFuZCBub3JtYWwgdXNlcnNcclxuXHRcdFx0XHRpZighdXNlci5hZG1pbiAmJiAhYWRtaW5TZWN0aW9uRG9uZSkge1xyXG5cdFx0XHRcdFx0Ly8gb25seSBkaXNwbGF5IG9uZSB1c2VycyBoZWFkZXJcclxuXHRcdFx0XHRcdGFkbWluU2VjdGlvbkRvbmUgPSB0cnVlO1xyXG5cclxuXHRcdFx0XHRcdGRpc3BsYXlVc2Vycy5wdXNoKHtcclxuXHRcdFx0XHRcdFx0Y2xhc3NlczogXCJsaXN0LWhlYWRlclwiLFxyXG5cdFx0XHRcdFx0XHR0ZXh0OiBcIlVzZXJzXCJcclxuXHRcdFx0XHRcdH0pO1xyXG5cdFx0XHRcdH1cclxuXHJcblx0XHRcdFx0Ly8gZGlzcGxheSB0aGUgdXNlclxyXG5cdFx0XHRcdGRpc3BsYXlVc2Vycy5wdXNoKHtcclxuXHRcdFx0XHRcdGNsYXNzZXM6IFwibGlzdC1pdGVtXCIsXHJcblx0XHRcdFx0XHRjaGlsZHJlbjogW1xyXG5cdFx0XHRcdFx0XHR7XHJcblx0XHRcdFx0XHRcdFx0Y2xhc3NlczogXCJsaXN0LWl0ZW0tbmFtZVwiLFxyXG5cdFx0XHRcdFx0XHRcdHRleHQ6IHVzZXIudXNlcm5hbWVcclxuXHRcdFx0XHRcdFx0fVxyXG5cdFx0XHRcdFx0XSxcclxuXHRcdFx0XHRcdG9uOiB7XHJcblx0XHRcdFx0XHRcdGNsaWNrOiAoKSA9PiBsaWZlTGluZS5uYXYubmF2aWdhdGUoYC91c2VyLyR7dXNlci51c2VybmFtZX1gKVxyXG5cdFx0XHRcdFx0fVxyXG5cdFx0XHRcdH0pO1xyXG5cdFx0XHR9KTtcclxuXHJcblx0XHRcdC8vIGRpc3BsYXkgdGhlIHVzZXIgbGlzdFxyXG5cdFx0XHRsaWZlTGluZS5tYWtlRG9tKHtcclxuXHRcdFx0XHRwYXJlbnQ6IGNvbnRlbnQsXHJcblx0XHRcdFx0Z3JvdXA6IGRpc3BsYXlVc2Vyc1xyXG5cdFx0XHR9KTtcclxuXHRcdH0pXHJcblxyXG5cdFx0Ly8gc29tZXRoaW5nIHdlbnQgd3Jvbmcgc2hvdyBhbiBlcnJvciBtZXNzYWdlXHJcblx0XHQuY2F0Y2goZXJyID0+IHtcclxuXHRcdFx0bGlmZUxpbmUubWFrZURvbSh7XHJcblx0XHRcdFx0Y2xhc3NlczogXCJjb250ZW50LXBhZGRlZFwiLFxyXG5cdFx0XHRcdHRleHQ6IGVyci5tZXNzYWdlXHJcblx0XHRcdH0pO1xyXG5cdFx0fSk7XHJcblx0fVxyXG59KTtcclxuIiwiLyoqXHJcbiAqIFRoZSBtYWluIGNvbnRlbnQgcGFuZSBmb3IgdGhlIGFwcFxyXG4gKi9cclxuXHJcbmxpZmVMaW5lLm1ha2VEb20ucmVnaXN0ZXIoXCJjb250ZW50XCIsIHtcclxuXHRtYWtlKCkge1xyXG5cdFx0cmV0dXJuIFtcclxuXHRcdFx0e1xyXG5cdFx0XHRcdGNsYXNzZXM6IFwidG9vbGJhclwiLFxyXG5cdFx0XHRcdGNoaWxkcmVuOiBbXHJcblx0XHRcdFx0XHR7XHJcblx0XHRcdFx0XHRcdHRhZzogXCJzdmdcIixcclxuXHRcdFx0XHRcdFx0Y2xhc3NlczogXCJtZW51LWljb25cIixcclxuXHRcdFx0XHRcdFx0YXR0cnM6IHtcclxuXHRcdFx0XHRcdFx0XHR2aWV3Qm94OiBcIjAgMCA2MCA1MFwiLFxyXG5cdFx0XHRcdFx0XHRcdHdpZHRoOiBcIjIwXCIsXHJcblx0XHRcdFx0XHRcdFx0aGVpZ2h0OiBcIjE1XCJcclxuXHRcdFx0XHRcdFx0fSxcclxuXHRcdFx0XHRcdFx0Y2hpbGRyZW46IFtcclxuXHRcdFx0XHRcdFx0XHR7IHRhZzogXCJsaW5lXCIsIGF0dHJzOiB7IHgxOiBcIjBcIiwgeTE6IFwiNVwiLCB4MjogXCI2MFwiLCB5MjogXCI1XCIgfSB9LFxyXG5cdFx0XHRcdFx0XHRcdHsgdGFnOiBcImxpbmVcIiwgYXR0cnM6IHsgeDE6IFwiMFwiLCB5MTogXCIyNVwiLCB4MjogXCI2MFwiLCB5MjogXCIyNVwiIH0gfSxcclxuXHRcdFx0XHRcdFx0XHR7IHRhZzogXCJsaW5lXCIsIGF0dHJzOiB7IHgxOiBcIjBcIiwgeTE6IFwiNDVcIiwgeDI6IFwiNjBcIiwgeTI6IFwiNDVcIiB9IH1cclxuXHRcdFx0XHRcdFx0XSxcclxuXHRcdFx0XHRcdFx0b246IHtcclxuXHRcdFx0XHRcdFx0XHRjbGljazogKCkgPT4gZG9jdW1lbnQuYm9keS5jbGFzc0xpc3QudG9nZ2xlKFwic2lkZWJhci1vcGVuXCIpXHJcblx0XHRcdFx0XHRcdH1cclxuXHRcdFx0XHRcdH0sXHJcblx0XHRcdFx0XHR7XHJcblx0XHRcdFx0XHRcdGNsYXNzZXM6IFwidG9vbGJhci10aXRsZVwiLFxyXG5cdFx0XHRcdFx0XHRuYW1lOiBcInRpdGxlXCJcclxuXHRcdFx0XHRcdH0sXHJcblx0XHRcdFx0XHR7XHJcblx0XHRcdFx0XHRcdGNsYXNzZXM6IFwidG9vbGJhci1idXR0b25zXCIsXHJcblx0XHRcdFx0XHRcdG5hbWU6IFwiYnRuc1wiXHJcblx0XHRcdFx0XHR9XHJcblx0XHRcdFx0XVxyXG5cdFx0XHR9LFxyXG5cdFx0XHR7XHJcblx0XHRcdFx0Y2xhc3NlczogXCJjb250ZW50XCIsXHJcblx0XHRcdFx0bmFtZTogXCJjb250ZW50XCJcclxuXHRcdFx0fVxyXG5cdFx0XTtcclxuXHR9LFxyXG5cclxuXHRiaW5kKG9wdHMsIHt0aXRsZSwgYnRucywgY29udGVudH0pIHtcclxuXHRcdHZhciBkaXNwb3NhYmxlO1xyXG5cclxuXHRcdC8vIHNldCB0aGUgcGFnZSB0aXRsZVxyXG5cdFx0dmFyIHNldFRpdGxlID0gZnVuY3Rpb24odGl0bGVUZXh0KSB7XHJcblx0XHRcdHRpdGxlLmlubmVyVGV4dCA9IHRpdGxlVGV4dDtcclxuXHRcdFx0ZG9jdW1lbnQudGl0bGUgPSB0aXRsZVRleHQ7XHJcblx0XHR9O1xyXG5cclxuXHRcdC8vIGFkZCBhbiBhY3Rpb24gYnV0dG9uXHJcblx0XHRsaWZlTGluZS5vbihcImFjdGlvbi1jcmVhdGVcIiwgbmFtZSA9PiB7XHJcblx0XHRcdGxpZmVMaW5lLm1ha2VEb20oe1xyXG5cdFx0XHRcdHBhcmVudDogYnRucyxcclxuXHRcdFx0XHR0YWc6IFwiYnV0dG9uXCIsXHJcblx0XHRcdFx0Y2xhc3NlczogXCJ0b29sYmFyLWJ1dHRvblwiLFxyXG5cdFx0XHRcdHRleHQ6IG5hbWUsXHJcblx0XHRcdFx0YXR0cnM6IHtcclxuXHRcdFx0XHRcdFwiZGF0YS1uYW1lXCI6IG5hbWVcclxuXHRcdFx0XHR9LFxyXG5cdFx0XHRcdG9uOiB7XHJcblx0XHRcdFx0XHRjbGljazogKCkgPT4gbGlmZUxpbmUuZW1pdChcImFjdGlvbi1leGVjLVwiICsgbmFtZSlcclxuXHRcdFx0XHR9XHJcblx0XHRcdH0pO1xyXG5cdFx0fSk7XHJcblxyXG5cdFx0Ly8gcmVtb3ZlIGFuIGFjdGlvbiBidXR0b25cclxuXHRcdGxpZmVMaW5lLm9uKFwiYWN0aW9uLXJlbW92ZVwiLCBuYW1lID0+IHtcclxuXHRcdFx0dmFyIGJ0biA9IGJ0bnMucXVlcnlTZWxlY3RvcihgW2RhdGEtbmFtZT1cIiR7bmFtZX1cIl1gKTtcclxuXHJcblx0XHRcdGlmKGJ0bikgYnRuLnJlbW92ZSgpO1xyXG5cdFx0fSk7XHJcblxyXG5cdFx0Ly8gcmVtb3ZlIGFsbCB0aGUgYWN0aW9uIGJ1dHRvbnNcclxuXHRcdGxpZmVMaW5lLm9uKFwiYWN0aW9uLXJlbW92ZS1hbGxcIiwgKCkgPT4gYnRucy5pbm5lckhUTUwgPSBcIlwiKTtcclxuXHJcblx0XHQvLyBkaXNwbGF5IHRoZSBjb250ZW50IGZvciB0aGUgdmlld1xyXG5cdFx0dmFyIHVwZGF0ZVZpZXcgPSAoKSA9PiB7XHJcblx0XHRcdC8vIGRlc3Ryb3kgYW55IGxpc3RlbmVycyBmcm9tIG9sZCBjb250ZW50XHJcblx0XHRcdGlmKGRpc3Bvc2FibGUpIHtcclxuXHRcdFx0XHRkaXNwb3NhYmxlLmRpc3Bvc2UoKTtcclxuXHRcdFx0fVxyXG5cclxuXHRcdFx0Ly8gcmVtb3ZlIGFueSBhY3Rpb24gYnV0dG9uc1xyXG5cdFx0XHRsaWZlTGluZS5lbWl0KFwiYWN0aW9uLXJlbW92ZS1hbGxcIik7XHJcblxyXG5cdFx0XHQvLyBjbGVhciBhbGwgdGhlIG9sZCBjb250ZW50XHJcblx0XHRcdGNvbnRlbnQuaW5uZXJIVE1MID0gXCJcIjtcclxuXHJcblx0XHRcdC8vIGNyZWF0ZSB0aGUgZGlzcG9zYWJsZSBmb3IgdGhlIGNvbnRlbnRcclxuXHRcdFx0ZGlzcG9zYWJsZSA9IG5ldyBsaWZlTGluZS5EaXNwb3NhYmxlKCk7XHJcblxyXG5cdFx0XHR2YXIgbWFrZXIgPSBub3RGb3VuZE1ha2VyLCBtYXRjaDtcclxuXHJcblx0XHRcdC8vIGZpbmQgdGhlIGNvcnJlY3QgY29udGVudCBtYWtlclxyXG5cdFx0XHRmb3IobGV0ICRtYWtlciBvZiBjb250ZW50TWFrZXJzKSB7XHJcblx0XHRcdFx0Ly8gcnVuIGEgbWF0Y2hlciBmdW5jdGlvblxyXG5cdFx0XHRcdGlmKHR5cGVvZiAkbWFrZXIubWF0Y2hlciA9PSBcImZ1bmN0aW9uXCIpIHtcclxuXHRcdFx0XHRcdG1hdGNoID0gJG1ha2VyLm1hdGNoZXIobG9jYXRpb24ucGF0aG5hbWUpO1xyXG5cdFx0XHRcdH1cclxuXHRcdFx0XHQvLyBhIHN0cmluZyBtYXRjaFxyXG5cdFx0XHRcdGVsc2UgaWYodHlwZW9mICRtYWtlci5tYXRjaGVyID09IFwic3RyaW5nXCIpIHtcclxuXHRcdFx0XHRcdGlmKCRtYWtlci5tYXRjaGVyID09IGxvY2F0aW9uLnBhdGhuYW1lKSB7XHJcblx0XHRcdFx0XHRcdG1hdGNoID0gJG1ha2VyLm1hdGNoZXI7XHJcblx0XHRcdFx0XHR9XHJcblx0XHRcdFx0fVxyXG5cdFx0XHRcdC8vIGEgcmVnZXggbWF0Y2hcclxuXHRcdFx0XHRlbHNlIHtcclxuXHRcdFx0XHRcdG1hdGNoID0gJG1ha2VyLm1hdGNoZXIuZXhlYyhsb2NhdGlvbi5wYXRobmFtZSk7XHJcblx0XHRcdFx0fVxyXG5cclxuXHRcdFx0XHQvLyBtYXRjaCBmb3VuZCBzdG9wIHNlYXJjaGluZ1xyXG5cdFx0XHRcdGlmKG1hdGNoKSB7XHJcblx0XHRcdFx0XHRtYWtlciA9ICRtYWtlcjtcclxuXHJcblx0XHRcdFx0XHRicmVhaztcclxuXHRcdFx0XHR9XHJcblx0XHRcdH1cclxuXHJcblx0XHRcdC8vIG1ha2UgdGhlIGNvbnRlbnQgZm9yIHRoaXMgcm91dGVcclxuXHRcdFx0bWFrZXIubWFrZSh7ZGlzcG9zYWJsZSwgc2V0VGl0bGUsIGNvbnRlbnQsIG1hdGNofSk7XHJcblx0XHR9O1xyXG5cclxuXHRcdC8vIHN3aXRjaCBwYWdlc1xyXG5cdFx0bGlmZUxpbmUubmF2Lm5hdmlnYXRlID0gZnVuY3Rpb24odXJsKSB7XHJcblx0XHRcdC8vIHVwZGF0ZSB0aGUgdXJsXHJcblx0XHRcdGhpc3RvcnkucHVzaFN0YXRlKG51bGwsIG51bGwsIHVybCk7XHJcblxyXG5cdFx0XHQvLyBzaG93IHRoZSBuZXcgdmlld1xyXG5cdFx0XHR1cGRhdGVWaWV3KCk7XHJcblx0XHR9O1xyXG5cclxuXHRcdC8vIHN3aXRjaCBwYWdlcyB3aGVuIHRoZSB1c2VyIHB1c2hlcyB0aGUgYmFjayBidXR0b25cclxuXHRcdHdpbmRvdy5hZGRFdmVudExpc3RlbmVyKFwicG9wc3RhdGVcIiwgKCkgPT4gdXBkYXRlVmlldygpKTtcclxuXHJcblx0XHQvLyBzaG93IHRoZSBpbml0aWFsIHZpZXdcclxuXHRcdHVwZGF0ZVZpZXcoKTtcclxuXHR9XHJcbn0pO1xyXG5cclxuLy8gYWxsIGNvbnRlbnQgcHJvZHVjZXJzXHJcbnZhciBjb250ZW50TWFrZXJzID0gW107XHJcblxyXG4vLyBjcmVhdGUgdGhlIG5hbWVzcGFjZVxyXG5saWZlTGluZS5uYXYgPSB7fTtcclxuXHJcbi8vIHJlZ2lzdGVyIGEgY29udGVudCBtYWtlclxyXG5saWZlTGluZS5uYXYucmVnaXN0ZXIgPSBmdW5jdGlvbihtYWtlcikge1xyXG5cdGNvbnRlbnRNYWtlcnMucHVzaChtYWtlcik7XHJcbn07XHJcblxyXG4vLyB0aGUgZmFsbCBiYWNrIG1ha2VyIGZvciBubyBzdWNoIHBhZ2VcclxudmFyIG5vdEZvdW5kTWFrZXIgPSB7XHJcblx0bWFrZSh7c2V0VGl0bGUsIGNvbnRlbnR9KSB7XHJcblx0XHQvLyB1cGRhdGUgdGhlIHBhZ2UgdGl0bGVcclxuXHRcdHNldFRpdGxlKFwiTm90IGZvdW5kXCIpO1xyXG5cclxuXHRcdGxpZmVMaW5lLm1ha2VEb20oe1xyXG5cdFx0XHRwYXJlbnQ6IGNvbnRlbnQsXHJcblx0XHRcdGNsYXNzZXM6IFwiY29udGVudC1wYWRkZWRcIixcclxuXHRcdFx0Y2hpbGRyZW46IFtcclxuXHRcdFx0XHR7XHJcblx0XHRcdFx0XHR0YWc6IFwic3BhblwiLFxyXG5cdFx0XHRcdFx0dGV4dDogXCJUaGUgcGFnZSB5b3UgYXJlIGxvb2tpbmcgZm9yIGNvdWxkIG5vdCBiZSBmb3VuZC4gXCJcclxuXHRcdFx0XHR9LFxyXG5cdFx0XHRcdHtcclxuXHRcdFx0XHRcdHdpZGdldDogXCJsaW5rXCIsXHJcblx0XHRcdFx0XHRocmVmOiBcIi9cIixcclxuXHRcdFx0XHRcdHRleHQ6IFwiR28gaG9tZVwiXHJcblx0XHRcdFx0fVxyXG5cdFx0XHRdXHJcblx0XHR9KTtcclxuXHR9XHJcbn07XHJcbiIsIi8qKlxyXG4gKiBBIHdpZGdldCB0aGF0IGNyZWF0ZXMgYSBsaW5rIHRoYXQgaG9va3MgaW50byB0aGUgbmF2aWdhdG9yXHJcbiAqL1xyXG5cclxubGlmZUxpbmUubWFrZURvbS5yZWdpc3RlcihcImxpbmtcIiwge1xyXG5cdG1ha2Uob3B0cykge1xyXG5cdFx0cmV0dXJuIHtcclxuXHRcdFx0dGFnOiBcImFcIixcclxuXHRcdFx0YXR0cnM6IHtcclxuXHRcdFx0XHRocmVmOiBvcHRzLmhyZWZcclxuXHRcdFx0fSxcclxuXHRcdFx0b246IHtcclxuXHRcdFx0XHRjbGljazogZSA9PiB7XHJcblx0XHRcdFx0XHQvLyBkb24ndCBuYXZpZ2F0ZSB0aGUgcGFnZVxyXG5cdFx0XHRcdFx0ZS5wcmV2ZW50RGVmYXVsdCgpO1xyXG5cclxuXHRcdFx0XHRcdGxpZmVMaW5lLm5hdi5uYXZpZ2F0ZShvcHRzLmhyZWYpXHJcblx0XHRcdFx0fVxyXG5cdFx0XHR9LFxyXG5cdFx0XHR0ZXh0OiBvcHRzLnRleHRcclxuXHRcdH07XHJcblx0fVxyXG59KTtcclxuIiwiLyoqXHJcbiAqIFRoZSB3aWRnZXQgZm9yIHRoZSBzaWRlYmFyXHJcbiAqL1xyXG5cclxubGlmZUxpbmUubWFrZURvbS5yZWdpc3RlcihcInNpZGViYXJcIiwge1xyXG5cdG1ha2UoKSB7XHJcblx0XHRyZXR1cm4gW1xyXG5cdFx0XHR7XHJcblx0XHRcdFx0Y2xhc3NlczogXCJzaWRlYmFyXCIsXHJcblx0XHRcdFx0bmFtZTogXCJzaWRlYmFyXCIsXHJcblx0XHRcdFx0Y2hpbGRyZW46IFtcclxuXHRcdFx0XHRcdHtcclxuXHRcdFx0XHRcdFx0Y2xhc3NlczogW1wic2lkZWJhci1hY3Rpb25zXCIsIFwiaGlkZGVuXCJdLFxyXG5cdFx0XHRcdFx0XHRuYW1lOiBcImFjdGlvbnNcIixcclxuXHRcdFx0XHRcdFx0Y2hpbGRyZW46IFtcclxuXHRcdFx0XHRcdFx0XHR7XHJcblx0XHRcdFx0XHRcdFx0XHRjbGFzc2VzOiBcInNpZGViYXItaGVhZGluZ1wiLFxyXG5cdFx0XHRcdFx0XHRcdFx0dGV4dDogXCJQYWdlIGFjdGlvbnNcIlxyXG5cdFx0XHRcdFx0XHRcdH1cclxuXHRcdFx0XHRcdFx0XVxyXG5cdFx0XHRcdFx0fSxcclxuXHRcdFx0XHRcdHtcclxuXHRcdFx0XHRcdFx0Y2xhc3NlczogXCJzaWRlYmFyLWhlYWRpbmdcIixcclxuXHRcdFx0XHRcdFx0dGV4dDogXCJNb3JlIGFjdGlvbnNcIlxyXG5cdFx0XHRcdFx0fVxyXG5cdFx0XHRcdF1cclxuXHRcdFx0fSxcclxuXHRcdFx0e1xyXG5cdFx0XHRcdGNsYXNzZXM6IFwic2hhZGVcIixcclxuXHRcdFx0XHRvbjoge1xyXG5cdFx0XHRcdFx0Ly8gY2xvc2UgdGhlIHNpZGViYXJcclxuXHRcdFx0XHRcdGNsaWNrOiAoKSA9PiBkb2N1bWVudC5ib2R5LmNsYXNzTGlzdC5yZW1vdmUoXCJzaWRlYmFyLW9wZW5cIilcclxuXHRcdFx0XHR9XHJcblx0XHRcdH1cclxuXHRcdF07XHJcblx0fSxcclxuXHJcblx0YmluZChvcHRzLCB7YWN0aW9ucywgc2lkZWJhcn0pIHtcclxuXHRcdC8vIGFkZCBhIGNvbW1hbmQgdG8gdGhlIHNpZGViYXJcclxuXHRcdGxpZmVMaW5lLmFkZENvbW1hbmQgPSBmdW5jdGlvbihuYW1lLCBmbikge1xyXG5cdFx0XHQvLyBtYWtlIHRoZSBzaWRlYmFyIGl0ZW1cclxuXHRcdFx0dmFyIHtpdGVtfSA9IGxpZmVMaW5lLm1ha2VEb20oe1xyXG5cdFx0XHRcdHBhcmVudDogc2lkZWJhcixcclxuXHRcdFx0XHR0YWc6IFwiZGl2XCIsXHJcblx0XHRcdFx0bmFtZTogXCJpdGVtXCIsXHJcblx0XHRcdFx0Y2xhc3NlczogXCJzaWRlYmFyLWl0ZW1cIixcclxuXHRcdFx0XHR0ZXh0OiBuYW1lLFxyXG5cdFx0XHRcdG9uOiB7XHJcblx0XHRcdFx0XHRjbGljazogKCkgPT4ge1xyXG5cdFx0XHRcdFx0XHQvLyBjbG9zZSB0aGUgc2lkZWJhclxyXG5cdFx0XHRcdFx0XHRkb2N1bWVudC5ib2R5LmNsYXNzTGlzdC5yZW1vdmUoXCJzaWRlYmFyLW9wZW5cIik7XHJcblxyXG5cdFx0XHRcdFx0XHQvLyBjYWxsIHRoZSBsaXN0ZW5lclxyXG5cdFx0XHRcdFx0XHRmbigpO1xyXG5cdFx0XHRcdFx0fVxyXG5cdFx0XHRcdH1cclxuXHRcdFx0fSk7XHJcblxyXG5cdFx0XHRyZXR1cm4ge1xyXG5cdFx0XHRcdHVuc3Vic2NyaWJlOiAoKSA9PiBpdGVtLnJlbW92ZSgpXHJcblx0XHRcdH07XHJcblx0XHR9O1xyXG5cclxuXHRcdC8vIGFkZCBhIG5hdmlnYXRpb25hbCBjb21tYW5kXHJcblx0XHRsaWZlTGluZS5hZGROYXZDb21tYW5kID0gZnVuY3Rpb24obmFtZSwgdG8pIHtcclxuXHRcdFx0bGlmZUxpbmUuYWRkQ29tbWFuZChuYW1lLCAoKSA9PiBsaWZlTGluZS5uYXYubmF2aWdhdGUodG8pKTtcclxuXHRcdH07XHJcblxyXG5cdFx0Ly8gYWRkIGEgc2lkZWJhciBhY3Rpb25cclxuXHRcdGxpZmVMaW5lLm9uKFwiYWN0aW9uLWNyZWF0ZVwiLCBuYW1lID0+IHtcclxuXHRcdFx0Ly8gc2hvdyB0aGUgYWN0aW9uc1xyXG5cdFx0XHRhY3Rpb25zLmNsYXNzTGlzdC5yZW1vdmUoXCJoaWRkZW5cIik7XHJcblxyXG5cdFx0XHQvLyBjcmVhdGUgdGhlIGJ1dHRvblxyXG5cdFx0XHRsaWZlTGluZS5tYWtlRG9tKHtcclxuXHRcdFx0XHRwYXJlbnQ6IGFjdGlvbnMsXHJcblx0XHRcdFx0dGFnOiBcImRpdlwiLFxyXG5cdFx0XHRcdG5hbWU6IFwiaXRlbVwiLFxyXG5cdFx0XHRcdGNsYXNzZXM6IFwic2lkZWJhci1pdGVtXCIsXHJcblx0XHRcdFx0dGV4dDogbmFtZSxcclxuXHRcdFx0XHRhdHRyczoge1xyXG5cdFx0XHRcdFx0XCJkYXRhLW5hbWVcIjogbmFtZVxyXG5cdFx0XHRcdH0sXHJcblx0XHRcdFx0b246IHtcclxuXHRcdFx0XHRcdGNsaWNrOiAoKSA9PiB7XHJcblx0XHRcdFx0XHRcdC8vIGNsb3NlIHRoZSBzaWRlYmFyXHJcblx0XHRcdFx0XHRcdGRvY3VtZW50LmJvZHkuY2xhc3NMaXN0LnJlbW92ZShcInNpZGViYXItb3BlblwiKTtcclxuXHJcblx0XHRcdFx0XHRcdC8vIHRyaWdnZXIgdGhlIGFjdGlvblxyXG5cdFx0XHRcdFx0XHRsaWZlTGluZS5lbWl0KFwiYWN0aW9uLWV4ZWMtXCIgKyBuYW1lKTtcclxuXHRcdFx0XHRcdH1cclxuXHRcdFx0XHR9XHJcblx0XHRcdH0pO1xyXG5cclxuXHRcdFx0Ly8gcmVtb3ZlIGEgc2lkZWJhciBhY3Rpb25cclxuXHRcdFx0bGlmZUxpbmUub24oXCJhY3Rpb24tcmVtb3ZlXCIsIG5hbWUgPT4ge1xyXG5cdFx0XHRcdC8vIHJlbW92ZSB0aGUgYnV0dG9uXHJcblx0XHRcdFx0dmFyIGJ0biA9IGFjdGlvbnMucXVlcnlTZWxlY3RvcihgW2RhdGEtbmFtZT1cIiR7bmFtZX1cIl1gKTtcclxuXHJcblx0XHRcdFx0aWYoYnRuKSBidG4ucmVtb3ZlKCk7XHJcblxyXG5cdFx0XHRcdC8vIGhpZGUgdGhlIHBhZ2UgYWN0aW9ucyBpZiB0aGVyZSBhcmUgbm9uZVxyXG5cdFx0XHRcdGlmKGFjdGlvbnMuY2hpbGRyZW4ubGVuZ3RoID09IDEpIHtcclxuXHRcdFx0XHRcdGFjdGlvbnMuY2xhc3NMaXN0LmFkZChcImhpZGRlblwiKTtcclxuXHRcdFx0XHR9XHJcblx0XHRcdH0pO1xyXG5cclxuXHRcdFx0Ly8gcmVtb3ZlIGFsbCB0aGUgc2lkZWJhciBhY3Rpb25zXHJcblx0XHRcdGxpZmVMaW5lLm9uKFwiYWN0aW9uLXJlbW92ZS1hbGxcIiwgKCkgPT4ge1xyXG5cdFx0XHRcdC8vIHJlbW92ZSBhbGwgdGhlIGFjdGlvbnNcclxuXHRcdFx0XHR2YXIgX2FjdGlvbnMgPSBBcnJheS5mcm9tKGFjdGlvbnMucXVlcnlTZWxlY3RvckFsbChcIi5zaWRlYmFyLWl0ZW1cIikpO1xyXG5cclxuXHRcdFx0XHRfYWN0aW9ucy5mb3JFYWNoKGFjdGlvbiA9PiBhY3Rpb24ucmVtb3ZlKCkpO1xyXG5cclxuXHRcdFx0XHQvLyBzaWRlIHRoZSBwYWdlIGFjdGlvbnNcclxuXHRcdFx0XHRhY3Rpb25zLmNsYXNzTGlzdC5hZGQoXCJoaWRkZW5cIik7XHJcblx0XHRcdH0pO1xyXG5cdFx0fSk7XHJcblx0fVxyXG59KTtcclxuIiwiLyoqXHJcbiAqIEtlZXAgYSBsaXN0IG9mIHN1YnNjcmlwdGlvbnMgdG8gdW5zdWJzY3JpYmUgZnJvbSB0b2dldGhlclxyXG4gKi9cclxuXHJcbnZhciBEaXNwb3NhYmxlID0gbW9kdWxlLmV4cG9ydHMgPSBjbGFzcyB7XHJcblx0Y29uc3RydWN0b3IoKSB7XHJcblx0XHR0aGlzLl9zdWJzY3JpcHRpb25zID0gW107XHJcblx0fVxyXG5cclxuXHQvLyBVbnN1YnNjcmliZSBmcm9tIGFsbCBzdWJzY3JpcHRpb25zXHJcblx0ZGlzcG9zZSgpIHtcclxuXHRcdC8vIHJlbW92ZSB0aGUgZmlyc3Qgc3Vic2NyaXB0aW9uIHVudGlsIHRoZXJlIGFyZSBub25lIGxlZnRcclxuXHRcdHdoaWxlKHRoaXMuX3N1YnNjcmlwdGlvbnMubGVuZ3RoID4gMCkge1xyXG5cdFx0XHR0aGlzLl9zdWJzY3JpcHRpb25zLnNoaWZ0KCkudW5zdWJzY3JpYmUoKTtcclxuXHRcdH1cclxuXHR9XHJcblxyXG5cdC8vIEFkZCBhIHN1YnNjcmlwdGlvbiB0byB0aGUgZGlzcG9zYWJsZVxyXG5cdGFkZChzdWJzY3JpcHRpb24pIHtcclxuXHRcdC8vIGNvcHkgdGhlIGRpc3Bvc2FibGVcclxuXHRcdGlmKHN1YnNjcmlwdGlvbiBpbnN0YW5jZW9mIERpc3Bvc2FibGUpIHtcclxuXHRcdFx0Ly8gY29weSB0aGUgc3Vic2NyaXB0aW9ucyBmcm9tIHRoZSBkaXNwb3NhYmxlXHJcblx0XHRcdHRoaXMuX3N1YnNjcmlwdGlvbnMgPSB0aGlzLl9zdWJzY3JpcHRpb25zLmNvbmNhdChzdWJzY3JpcHRpb24uX3N1YnNjcmlwdGlvbnMpO1xyXG5cclxuXHRcdFx0Ly8gcmVtb3ZlIHRoZSByZWZyZW5jZXMgZnJvbSB0aGUgZGlzcG9zYWJsZVxyXG5cdFx0XHRzdWJzY3JpcHRpb24uX3N1YnNjcmlwdGlvbnMgPSBbXTtcclxuXHRcdH1cclxuXHRcdC8vIGFkZCBhIHN1YnNjcmlwdGlvblxyXG5cdFx0ZWxzZSB7XHJcblx0XHRcdHRoaXMuX3N1YnNjcmlwdGlvbnMucHVzaChzdWJzY3JpcHRpb24pO1xyXG5cdFx0fVxyXG5cdH1cclxuXHJcblx0Ly8gZGlzcG9zZSB3aGVuIGFuIGV2ZW50IGlzIGZpcmVkXHJcblx0ZGlzcG9zZU9uKGVtaXR0ZXIsIGV2ZW50KSB7XHJcblx0XHR0aGlzLmFkZChlbWl0dGVyLm9uKGV2ZW50LCAoKSA9PiB0aGlzLmRpc3Bvc2UoKSkpO1xyXG5cdH1cclxufTtcclxuIiwiLyoqXHJcbiAqIEEgYmFzaWMgZXZlbnQgZW1pdHRlclxyXG4gKi9cclxuXHJcbm1vZHVsZS5leHBvcnRzID0gY2xhc3Mge1xyXG5cdGNvbnN0cnVjdG9yKCkge1xyXG5cdFx0dGhpcy5fbGlzdGVuZXJzID0ge307XHJcblx0fVxyXG5cclxuXHQvKipcclxuXHQgKiBBZGQgYW4gZXZlbnQgbGlzdGVuZXJcclxuXHQgKi9cclxuXHRvbihuYW1lLCBsaXN0ZW5lcikge1xyXG5cdFx0Ly8gaWYgd2UgZG9uJ3QgaGF2ZSBhbiBleGlzdGluZyBsaXN0ZW5lcnMgYXJyYXkgY3JlYXRlIG9uZVxyXG5cdFx0aWYoIXRoaXMuX2xpc3RlbmVyc1tuYW1lXSkge1xyXG5cdFx0XHR0aGlzLl9saXN0ZW5lcnNbbmFtZV0gPSBbXTtcclxuXHRcdH1cclxuXHJcblx0XHQvLyBhZGQgdGhlIGxpc3RlbmVyXHJcblx0XHR0aGlzLl9saXN0ZW5lcnNbbmFtZV0ucHVzaChsaXN0ZW5lcik7XHJcblxyXG5cdFx0Ly8gZ2l2ZSB0aGVtIGEgc3Vic2NyaXB0aW9uXHJcblx0XHRyZXR1cm4ge1xyXG5cdFx0XHRfbGlzdGVuZXI6IGxpc3RlbmVyLFxyXG5cclxuXHRcdFx0dW5zdWJzY3JpYmU6ICgpID0+IHtcclxuXHRcdFx0XHQvLyBmaW5kIHRoZSBsaXN0ZW5lclxyXG5cdFx0XHRcdHZhciBpbmRleCA9IHRoaXMuX2xpc3RlbmVyc1tuYW1lXS5pbmRleE9mKGxpc3RlbmVyKTtcclxuXHJcblx0XHRcdFx0aWYoaW5kZXggIT09IC0xKSB7XHJcblx0XHRcdFx0XHR0aGlzLl9saXN0ZW5lcnNbbmFtZV0uc3BsaWNlKGluZGV4LCAxKTtcclxuXHRcdFx0XHR9XHJcblx0XHRcdH1cclxuXHRcdH07XHJcblx0fVxyXG5cclxuXHQvKipcclxuXHQgKiBFbWl0IGFuIGV2ZW50XHJcblx0ICovXHJcblx0ZW1pdChuYW1lLCAuLi5hcmdzKSB7XHJcblx0XHQvLyBjaGVjayBmb3IgbGlzdGVuZXJzXHJcblx0XHRpZih0aGlzLl9saXN0ZW5lcnNbbmFtZV0pIHtcclxuXHRcdFx0Zm9yKGxldCBsaXN0ZW5lciBvZiB0aGlzLl9saXN0ZW5lcnNbbmFtZV0pIHtcclxuXHRcdFx0XHQvLyBjYWxsIHRoZSBsaXN0ZW5lcnNcclxuXHRcdFx0XHRsaXN0ZW5lciguLi5hcmdzKTtcclxuXHRcdFx0fVxyXG5cdFx0fVxyXG5cdH1cclxuXHJcblx0LyoqXHJcblx0ICogRW1pdCBhbiBldmVudCBhbmQgc2tpcCBzb21lIGxpc3RlbmVyc1xyXG5cdCAqL1xyXG5cdHBhcnRpYWxFbWl0KG5hbWUsIHNraXBzID0gW10sIC4uLmFyZ3MpIHtcclxuXHRcdC8vIGFsbG93IGEgc2luZ2xlIGl0ZW1cclxuXHRcdGlmKCFBcnJheS5pc0FycmF5KHNraXBzKSkge1xyXG5cdFx0XHRza2lwcyA9IFtza2lwc107XHJcblx0XHR9XHJcblxyXG5cdFx0Ly8gY2hlY2sgZm9yIGxpc3RlbmVyc1xyXG5cdFx0aWYodGhpcy5fbGlzdGVuZXJzW25hbWVdKSB7XHJcblx0XHRcdGZvcihsZXQgbGlzdGVuZXIgb2YgdGhpcy5fbGlzdGVuZXJzW25hbWVdKSB7XHJcblx0XHRcdFx0Ly8gdGhpcyBldmVudCBsaXN0ZW5lciBpcyBiZWluZyBza2lwZWRcclxuXHRcdFx0XHRpZihza2lwcy5maW5kKHNraXAgPT4gc2tpcC5fbGlzdGVuZXIgPT0gbGlzdGVuZXIpKSB7XHJcblx0XHRcdFx0XHRjb250aW51ZTtcclxuXHRcdFx0XHR9XHJcblxyXG5cdFx0XHRcdC8vIGNhbGwgdGhlIGxpc3RlbmVyc1xyXG5cdFx0XHRcdGxpc3RlbmVyKC4uLmFyZ3MpO1xyXG5cdFx0XHR9XHJcblx0XHR9XHJcblx0fVxyXG59XHJcbiIsIi8qKlxyXG4gKiBDcmVhdGUgYSBnbG9iYWwgb2JqZWN0IHdpdGggY29tbW9ubHkgdXNlZCBtb2R1bGVzIHRvIGF2b2lkIDUwIG1pbGxpb24gcmVxdWlyZXNcclxuICovXHJcblxyXG52YXIgRXZlbnRFbWl0dGVyID0gcmVxdWlyZShcIi4vZXZlbnQtZW1pdHRlclwiKTtcclxuXHJcbnZhciBsaWZlTGluZSA9IG5ldyBFdmVudEVtaXR0ZXIoKTtcclxuXHJcbi8vIHBsYXRmb3JtIGRldGVjdGlvblxyXG5saWZlTGluZS5ub2RlID0gdHlwZW9mIHByb2Nlc3MgPT0gXCJvYmplY3RcIjtcclxubGlmZUxpbmUuYnJvd3NlciA9IHR5cGVvZiB3aW5kb3cgPT0gXCJvYmplY3RcIjtcclxuXHJcbi8vIGF0dGFjaCB1dGlsc1xyXG5saWZlTGluZS5EaXNwb3NhYmxlID0gcmVxdWlyZShcIi4vZGlzcG9zYWJsZVwiKTtcclxubGlmZUxpbmUuRXZlbnRFbWl0dGVyID0gRXZlbnRFbWl0dGVyO1xyXG5cclxuLy8gYXR0YWNoIGxpZmVsaW5lIHRvIHRoZSBnbG9iYWwgb2JqZWN0XHJcbihsaWZlTGluZS5ub2RlID8gZ2xvYmFsIDogYnJvd3NlcikubGlmZUxpbmUgPSBsaWZlTGluZTtcclxuIl19
