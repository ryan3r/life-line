(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
(function (global){
'use strict';

// compare and isBuffer taken from https://github.com/feross/buffer/blob/680e9e5e488f22aac27599a57dc844a6315928dd/index.js
// original notice:

/*!
 * The buffer module from node.js, for the browser.
 *
 * @author   Feross Aboukhadijeh <feross@feross.org> <http://feross.org>
 * @license  MIT
 */
function compare(a, b) {
  if (a === b) {
    return 0;
  }

  var x = a.length;
  var y = b.length;

  for (var i = 0, len = Math.min(x, y); i < len; ++i) {
    if (a[i] !== b[i]) {
      x = a[i];
      y = b[i];
      break;
    }
  }

  if (x < y) {
    return -1;
  }
  if (y < x) {
    return 1;
  }
  return 0;
}
function isBuffer(b) {
  if (global.Buffer && typeof global.Buffer.isBuffer === 'function') {
    return global.Buffer.isBuffer(b);
  }
  return !!(b != null && b._isBuffer);
}

// based on node assert, original notice:

// http://wiki.commonjs.org/wiki/Unit_Testing/1.0
//
// THIS IS NOT TESTED NOR LIKELY TO WORK OUTSIDE V8!
//
// Originally from narwhal.js (http://narwhaljs.org)
// Copyright (c) 2009 Thomas Robinson <280north.com>
//
// Permission is hereby granted, free of charge, to any person obtaining a copy
// of this software and associated documentation files (the 'Software'), to
// deal in the Software without restriction, including without limitation the
// rights to use, copy, modify, merge, publish, distribute, sublicense, and/or
// sell copies of the Software, and to permit persons to whom the Software is
// furnished to do so, subject to the following conditions:
//
// The above copyright notice and this permission notice shall be included in
// all copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED 'AS IS', WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
// IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
// FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
// AUTHORS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN
// ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION
// WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.

var util = require('util/');
var hasOwn = Object.prototype.hasOwnProperty;
var pSlice = Array.prototype.slice;
var functionsHaveNames = (function () {
  return function foo() {}.name === 'foo';
}());
function pToString (obj) {
  return Object.prototype.toString.call(obj);
}
function isView(arrbuf) {
  if (isBuffer(arrbuf)) {
    return false;
  }
  if (typeof global.ArrayBuffer !== 'function') {
    return false;
  }
  if (typeof ArrayBuffer.isView === 'function') {
    return ArrayBuffer.isView(arrbuf);
  }
  if (!arrbuf) {
    return false;
  }
  if (arrbuf instanceof DataView) {
    return true;
  }
  if (arrbuf.buffer && arrbuf.buffer instanceof ArrayBuffer) {
    return true;
  }
  return false;
}
// 1. The assert module provides functions that throw
// AssertionError's when particular conditions are not met. The
// assert module must conform to the following interface.

var assert = module.exports = ok;

// 2. The AssertionError is defined in assert.
// new assert.AssertionError({ message: message,
//                             actual: actual,
//                             expected: expected })

var regex = /\s*function\s+([^\(\s]*)\s*/;
// based on https://github.com/ljharb/function.prototype.name/blob/adeeeec8bfcc6068b187d7d9fb3d5bb1d3a30899/implementation.js
function getName(func) {
  if (!util.isFunction(func)) {
    return;
  }
  if (functionsHaveNames) {
    return func.name;
  }
  var str = func.toString();
  var match = str.match(regex);
  return match && match[1];
}
assert.AssertionError = function AssertionError(options) {
  this.name = 'AssertionError';
  this.actual = options.actual;
  this.expected = options.expected;
  this.operator = options.operator;
  if (options.message) {
    this.message = options.message;
    this.generatedMessage = false;
  } else {
    this.message = getMessage(this);
    this.generatedMessage = true;
  }
  var stackStartFunction = options.stackStartFunction || fail;
  if (Error.captureStackTrace) {
    Error.captureStackTrace(this, stackStartFunction);
  } else {
    // non v8 browsers so we can have a stacktrace
    var err = new Error();
    if (err.stack) {
      var out = err.stack;

      // try to strip useless frames
      var fn_name = getName(stackStartFunction);
      var idx = out.indexOf('\n' + fn_name);
      if (idx >= 0) {
        // once we have located the function frame
        // we need to strip out everything before it (and its line)
        var next_line = out.indexOf('\n', idx + 1);
        out = out.substring(next_line + 1);
      }

      this.stack = out;
    }
  }
};

// assert.AssertionError instanceof Error
util.inherits(assert.AssertionError, Error);

function truncate(s, n) {
  if (typeof s === 'string') {
    return s.length < n ? s : s.slice(0, n);
  } else {
    return s;
  }
}
function inspect(something) {
  if (functionsHaveNames || !util.isFunction(something)) {
    return util.inspect(something);
  }
  var rawname = getName(something);
  var name = rawname ? ': ' + rawname : '';
  return '[Function' +  name + ']';
}
function getMessage(self) {
  return truncate(inspect(self.actual), 128) + ' ' +
         self.operator + ' ' +
         truncate(inspect(self.expected), 128);
}

// At present only the three keys mentioned above are used and
// understood by the spec. Implementations or sub modules can pass
// other keys to the AssertionError's constructor - they will be
// ignored.

// 3. All of the following functions must throw an AssertionError
// when a corresponding condition is not met, with a message that
// may be undefined if not provided.  All assertion methods provide
// both the actual and expected values to the assertion error for
// display purposes.

function fail(actual, expected, message, operator, stackStartFunction) {
  throw new assert.AssertionError({
    message: message,
    actual: actual,
    expected: expected,
    operator: operator,
    stackStartFunction: stackStartFunction
  });
}

// EXTENSION! allows for well behaved errors defined elsewhere.
assert.fail = fail;

// 4. Pure assertion tests whether a value is truthy, as determined
// by !!guard.
// assert.ok(guard, message_opt);
// This statement is equivalent to assert.equal(true, !!guard,
// message_opt);. To test strictly for the value true, use
// assert.strictEqual(true, guard, message_opt);.

function ok(value, message) {
  if (!value) fail(value, true, message, '==', assert.ok);
}
assert.ok = ok;

// 5. The equality assertion tests shallow, coercive equality with
// ==.
// assert.equal(actual, expected, message_opt);

assert.equal = function equal(actual, expected, message) {
  if (actual != expected) fail(actual, expected, message, '==', assert.equal);
};

// 6. The non-equality assertion tests for whether two objects are not equal
// with != assert.notEqual(actual, expected, message_opt);

assert.notEqual = function notEqual(actual, expected, message) {
  if (actual == expected) {
    fail(actual, expected, message, '!=', assert.notEqual);
  }
};

// 7. The equivalence assertion tests a deep equality relation.
// assert.deepEqual(actual, expected, message_opt);

assert.deepEqual = function deepEqual(actual, expected, message) {
  if (!_deepEqual(actual, expected, false)) {
    fail(actual, expected, message, 'deepEqual', assert.deepEqual);
  }
};

assert.deepStrictEqual = function deepStrictEqual(actual, expected, message) {
  if (!_deepEqual(actual, expected, true)) {
    fail(actual, expected, message, 'deepStrictEqual', assert.deepStrictEqual);
  }
};

function _deepEqual(actual, expected, strict, memos) {
  // 7.1. All identical values are equivalent, as determined by ===.
  if (actual === expected) {
    return true;
  } else if (isBuffer(actual) && isBuffer(expected)) {
    return compare(actual, expected) === 0;

  // 7.2. If the expected value is a Date object, the actual value is
  // equivalent if it is also a Date object that refers to the same time.
  } else if (util.isDate(actual) && util.isDate(expected)) {
    return actual.getTime() === expected.getTime();

  // 7.3 If the expected value is a RegExp object, the actual value is
  // equivalent if it is also a RegExp object with the same source and
  // properties (`global`, `multiline`, `lastIndex`, `ignoreCase`).
  } else if (util.isRegExp(actual) && util.isRegExp(expected)) {
    return actual.source === expected.source &&
           actual.global === expected.global &&
           actual.multiline === expected.multiline &&
           actual.lastIndex === expected.lastIndex &&
           actual.ignoreCase === expected.ignoreCase;

  // 7.4. Other pairs that do not both pass typeof value == 'object',
  // equivalence is determined by ==.
  } else if ((actual === null || typeof actual !== 'object') &&
             (expected === null || typeof expected !== 'object')) {
    return strict ? actual === expected : actual == expected;

  // If both values are instances of typed arrays, wrap their underlying
  // ArrayBuffers in a Buffer each to increase performance
  // This optimization requires the arrays to have the same type as checked by
  // Object.prototype.toString (aka pToString). Never perform binary
  // comparisons for Float*Arrays, though, since e.g. +0 === -0 but their
  // bit patterns are not identical.
  } else if (isView(actual) && isView(expected) &&
             pToString(actual) === pToString(expected) &&
             !(actual instanceof Float32Array ||
               actual instanceof Float64Array)) {
    return compare(new Uint8Array(actual.buffer),
                   new Uint8Array(expected.buffer)) === 0;

  // 7.5 For all other Object pairs, including Array objects, equivalence is
  // determined by having the same number of owned properties (as verified
  // with Object.prototype.hasOwnProperty.call), the same set of keys
  // (although not necessarily the same order), equivalent values for every
  // corresponding key, and an identical 'prototype' property. Note: this
  // accounts for both named and indexed properties on Arrays.
  } else if (isBuffer(actual) !== isBuffer(expected)) {
    return false;
  } else {
    memos = memos || {actual: [], expected: []};

    var actualIndex = memos.actual.indexOf(actual);
    if (actualIndex !== -1) {
      if (actualIndex === memos.expected.indexOf(expected)) {
        return true;
      }
    }

    memos.actual.push(actual);
    memos.expected.push(expected);

    return objEquiv(actual, expected, strict, memos);
  }
}

function isArguments(object) {
  return Object.prototype.toString.call(object) == '[object Arguments]';
}

function objEquiv(a, b, strict, actualVisitedObjects) {
  if (a === null || a === undefined || b === null || b === undefined)
    return false;
  // if one is a primitive, the other must be same
  if (util.isPrimitive(a) || util.isPrimitive(b))
    return a === b;
  if (strict && Object.getPrototypeOf(a) !== Object.getPrototypeOf(b))
    return false;
  var aIsArgs = isArguments(a);
  var bIsArgs = isArguments(b);
  if ((aIsArgs && !bIsArgs) || (!aIsArgs && bIsArgs))
    return false;
  if (aIsArgs) {
    a = pSlice.call(a);
    b = pSlice.call(b);
    return _deepEqual(a, b, strict);
  }
  var ka = objectKeys(a);
  var kb = objectKeys(b);
  var key, i;
  // having the same number of owned properties (keys incorporates
  // hasOwnProperty)
  if (ka.length !== kb.length)
    return false;
  //the same set of keys (although not necessarily the same order),
  ka.sort();
  kb.sort();
  //~~~cheap key test
  for (i = ka.length - 1; i >= 0; i--) {
    if (ka[i] !== kb[i])
      return false;
  }
  //equivalent values for every corresponding key, and
  //~~~possibly expensive deep test
  for (i = ka.length - 1; i >= 0; i--) {
    key = ka[i];
    if (!_deepEqual(a[key], b[key], strict, actualVisitedObjects))
      return false;
  }
  return true;
}

// 8. The non-equivalence assertion tests for any deep inequality.
// assert.notDeepEqual(actual, expected, message_opt);

assert.notDeepEqual = function notDeepEqual(actual, expected, message) {
  if (_deepEqual(actual, expected, false)) {
    fail(actual, expected, message, 'notDeepEqual', assert.notDeepEqual);
  }
};

assert.notDeepStrictEqual = notDeepStrictEqual;
function notDeepStrictEqual(actual, expected, message) {
  if (_deepEqual(actual, expected, true)) {
    fail(actual, expected, message, 'notDeepStrictEqual', notDeepStrictEqual);
  }
}


// 9. The strict equality assertion tests strict equality, as determined by ===.
// assert.strictEqual(actual, expected, message_opt);

assert.strictEqual = function strictEqual(actual, expected, message) {
  if (actual !== expected) {
    fail(actual, expected, message, '===', assert.strictEqual);
  }
};

// 10. The strict non-equality assertion tests for strict inequality, as
// determined by !==.  assert.notStrictEqual(actual, expected, message_opt);

assert.notStrictEqual = function notStrictEqual(actual, expected, message) {
  if (actual === expected) {
    fail(actual, expected, message, '!==', assert.notStrictEqual);
  }
};

function expectedException(actual, expected) {
  if (!actual || !expected) {
    return false;
  }

  if (Object.prototype.toString.call(expected) == '[object RegExp]') {
    return expected.test(actual);
  }

  try {
    if (actual instanceof expected) {
      return true;
    }
  } catch (e) {
    // Ignore.  The instanceof check doesn't work for arrow functions.
  }

  if (Error.isPrototypeOf(expected)) {
    return false;
  }

  return expected.call({}, actual) === true;
}

function _tryBlock(block) {
  var error;
  try {
    block();
  } catch (e) {
    error = e;
  }
  return error;
}

function _throws(shouldThrow, block, expected, message) {
  var actual;

  if (typeof block !== 'function') {
    throw new TypeError('"block" argument must be a function');
  }

  if (typeof expected === 'string') {
    message = expected;
    expected = null;
  }

  actual = _tryBlock(block);

  message = (expected && expected.name ? ' (' + expected.name + ').' : '.') +
            (message ? ' ' + message : '.');

  if (shouldThrow && !actual) {
    fail(actual, expected, 'Missing expected exception' + message);
  }

  var userProvidedMessage = typeof message === 'string';
  var isUnwantedException = !shouldThrow && util.isError(actual);
  var isUnexpectedException = !shouldThrow && actual && !expected;

  if ((isUnwantedException &&
      userProvidedMessage &&
      expectedException(actual, expected)) ||
      isUnexpectedException) {
    fail(actual, expected, 'Got unwanted exception' + message);
  }

  if ((shouldThrow && actual && expected &&
      !expectedException(actual, expected)) || (!shouldThrow && actual)) {
    throw actual;
  }
}

// 11. Expected to throw an error:
// assert.throws(block, Error_opt, message_opt);

assert.throws = function(block, /*optional*/error, /*optional*/message) {
  _throws(true, block, error, message);
};

// EXTENSION! This is annoying to write outside this module.
assert.doesNotThrow = function(block, /*optional*/error, /*optional*/message) {
  _throws(false, block, error, message);
};

assert.ifError = function(err) { if (err) throw err; };

var objectKeys = Object.keys || function (obj) {
  var keys = [];
  for (var key in obj) {
    if (hasOwn.call(obj, key)) keys.push(key);
  }
  return keys;
};

}).call(this,typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})

},{"util/":5}],2:[function(require,module,exports){
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

},{}],3:[function(require,module,exports){
if (typeof Object.create === 'function') {
  // implementation from standard node.js 'util' module
  module.exports = function inherits(ctor, superCtor) {
    ctor.super_ = superCtor
    ctor.prototype = Object.create(superCtor.prototype, {
      constructor: {
        value: ctor,
        enumerable: false,
        writable: true,
        configurable: true
      }
    });
  };
} else {
  // old school shim for old browsers
  module.exports = function inherits(ctor, superCtor) {
    ctor.super_ = superCtor
    var TempCtor = function () {}
    TempCtor.prototype = superCtor.prototype
    ctor.prototype = new TempCtor()
    ctor.prototype.constructor = ctor
  }
}

},{}],4:[function(require,module,exports){
module.exports = function isBuffer(arg) {
  return arg && typeof arg === 'object'
    && typeof arg.copy === 'function'
    && typeof arg.fill === 'function'
    && typeof arg.readUInt8 === 'function';
}
},{}],5:[function(require,module,exports){
(function (process,global){
// Copyright Joyent, Inc. and other Node contributors.
//
// Permission is hereby granted, free of charge, to any person obtaining a
// copy of this software and associated documentation files (the
// "Software"), to deal in the Software without restriction, including
// without limitation the rights to use, copy, modify, merge, publish,
// distribute, sublicense, and/or sell copies of the Software, and to permit
// persons to whom the Software is furnished to do so, subject to the
// following conditions:
//
// The above copyright notice and this permission notice shall be included
// in all copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS
// OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
// MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN
// NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM,
// DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR
// OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE
// USE OR OTHER DEALINGS IN THE SOFTWARE.

var formatRegExp = /%[sdj%]/g;
exports.format = function(f) {
  if (!isString(f)) {
    var objects = [];
    for (var i = 0; i < arguments.length; i++) {
      objects.push(inspect(arguments[i]));
    }
    return objects.join(' ');
  }

  var i = 1;
  var args = arguments;
  var len = args.length;
  var str = String(f).replace(formatRegExp, function(x) {
    if (x === '%%') return '%';
    if (i >= len) return x;
    switch (x) {
      case '%s': return String(args[i++]);
      case '%d': return Number(args[i++]);
      case '%j':
        try {
          return JSON.stringify(args[i++]);
        } catch (_) {
          return '[Circular]';
        }
      default:
        return x;
    }
  });
  for (var x = args[i]; i < len; x = args[++i]) {
    if (isNull(x) || !isObject(x)) {
      str += ' ' + x;
    } else {
      str += ' ' + inspect(x);
    }
  }
  return str;
};


// Mark that a method should not be used.
// Returns a modified function which warns once by default.
// If --no-deprecation is set, then it is a no-op.
exports.deprecate = function(fn, msg) {
  // Allow for deprecating things in the process of starting up.
  if (isUndefined(global.process)) {
    return function() {
      return exports.deprecate(fn, msg).apply(this, arguments);
    };
  }

  if (process.noDeprecation === true) {
    return fn;
  }

  var warned = false;
  function deprecated() {
    if (!warned) {
      if (process.throwDeprecation) {
        throw new Error(msg);
      } else if (process.traceDeprecation) {
        console.trace(msg);
      } else {
        console.error(msg);
      }
      warned = true;
    }
    return fn.apply(this, arguments);
  }

  return deprecated;
};


var debugs = {};
var debugEnviron;
exports.debuglog = function(set) {
  if (isUndefined(debugEnviron))
    debugEnviron = process.env.NODE_DEBUG || '';
  set = set.toUpperCase();
  if (!debugs[set]) {
    if (new RegExp('\\b' + set + '\\b', 'i').test(debugEnviron)) {
      var pid = process.pid;
      debugs[set] = function() {
        var msg = exports.format.apply(exports, arguments);
        console.error('%s %d: %s', set, pid, msg);
      };
    } else {
      debugs[set] = function() {};
    }
  }
  return debugs[set];
};


/**
 * Echos the value of a value. Trys to print the value out
 * in the best way possible given the different types.
 *
 * @param {Object} obj The object to print out.
 * @param {Object} opts Optional options object that alters the output.
 */
/* legacy: obj, showHidden, depth, colors*/
function inspect(obj, opts) {
  // default options
  var ctx = {
    seen: [],
    stylize: stylizeNoColor
  };
  // legacy...
  if (arguments.length >= 3) ctx.depth = arguments[2];
  if (arguments.length >= 4) ctx.colors = arguments[3];
  if (isBoolean(opts)) {
    // legacy...
    ctx.showHidden = opts;
  } else if (opts) {
    // got an "options" object
    exports._extend(ctx, opts);
  }
  // set default options
  if (isUndefined(ctx.showHidden)) ctx.showHidden = false;
  if (isUndefined(ctx.depth)) ctx.depth = 2;
  if (isUndefined(ctx.colors)) ctx.colors = false;
  if (isUndefined(ctx.customInspect)) ctx.customInspect = true;
  if (ctx.colors) ctx.stylize = stylizeWithColor;
  return formatValue(ctx, obj, ctx.depth);
}
exports.inspect = inspect;


// http://en.wikipedia.org/wiki/ANSI_escape_code#graphics
inspect.colors = {
  'bold' : [1, 22],
  'italic' : [3, 23],
  'underline' : [4, 24],
  'inverse' : [7, 27],
  'white' : [37, 39],
  'grey' : [90, 39],
  'black' : [30, 39],
  'blue' : [34, 39],
  'cyan' : [36, 39],
  'green' : [32, 39],
  'magenta' : [35, 39],
  'red' : [31, 39],
  'yellow' : [33, 39]
};

// Don't use 'blue' not visible on cmd.exe
inspect.styles = {
  'special': 'cyan',
  'number': 'yellow',
  'boolean': 'yellow',
  'undefined': 'grey',
  'null': 'bold',
  'string': 'green',
  'date': 'magenta',
  // "name": intentionally not styling
  'regexp': 'red'
};


function stylizeWithColor(str, styleType) {
  var style = inspect.styles[styleType];

  if (style) {
    return '\u001b[' + inspect.colors[style][0] + 'm' + str +
           '\u001b[' + inspect.colors[style][1] + 'm';
  } else {
    return str;
  }
}


function stylizeNoColor(str, styleType) {
  return str;
}


function arrayToHash(array) {
  var hash = {};

  array.forEach(function(val, idx) {
    hash[val] = true;
  });

  return hash;
}


function formatValue(ctx, value, recurseTimes) {
  // Provide a hook for user-specified inspect functions.
  // Check that value is an object with an inspect function on it
  if (ctx.customInspect &&
      value &&
      isFunction(value.inspect) &&
      // Filter out the util module, it's inspect function is special
      value.inspect !== exports.inspect &&
      // Also filter out any prototype objects using the circular check.
      !(value.constructor && value.constructor.prototype === value)) {
    var ret = value.inspect(recurseTimes, ctx);
    if (!isString(ret)) {
      ret = formatValue(ctx, ret, recurseTimes);
    }
    return ret;
  }

  // Primitive types cannot have properties
  var primitive = formatPrimitive(ctx, value);
  if (primitive) {
    return primitive;
  }

  // Look up the keys of the object.
  var keys = Object.keys(value);
  var visibleKeys = arrayToHash(keys);

  if (ctx.showHidden) {
    keys = Object.getOwnPropertyNames(value);
  }

  // IE doesn't make error fields non-enumerable
  // http://msdn.microsoft.com/en-us/library/ie/dww52sbt(v=vs.94).aspx
  if (isError(value)
      && (keys.indexOf('message') >= 0 || keys.indexOf('description') >= 0)) {
    return formatError(value);
  }

  // Some type of object without properties can be shortcutted.
  if (keys.length === 0) {
    if (isFunction(value)) {
      var name = value.name ? ': ' + value.name : '';
      return ctx.stylize('[Function' + name + ']', 'special');
    }
    if (isRegExp(value)) {
      return ctx.stylize(RegExp.prototype.toString.call(value), 'regexp');
    }
    if (isDate(value)) {
      return ctx.stylize(Date.prototype.toString.call(value), 'date');
    }
    if (isError(value)) {
      return formatError(value);
    }
  }

  var base = '', array = false, braces = ['{', '}'];

  // Make Array say that they are Array
  if (isArray(value)) {
    array = true;
    braces = ['[', ']'];
  }

  // Make functions say that they are functions
  if (isFunction(value)) {
    var n = value.name ? ': ' + value.name : '';
    base = ' [Function' + n + ']';
  }

  // Make RegExps say that they are RegExps
  if (isRegExp(value)) {
    base = ' ' + RegExp.prototype.toString.call(value);
  }

  // Make dates with properties first say the date
  if (isDate(value)) {
    base = ' ' + Date.prototype.toUTCString.call(value);
  }

  // Make error with message first say the error
  if (isError(value)) {
    base = ' ' + formatError(value);
  }

  if (keys.length === 0 && (!array || value.length == 0)) {
    return braces[0] + base + braces[1];
  }

  if (recurseTimes < 0) {
    if (isRegExp(value)) {
      return ctx.stylize(RegExp.prototype.toString.call(value), 'regexp');
    } else {
      return ctx.stylize('[Object]', 'special');
    }
  }

  ctx.seen.push(value);

  var output;
  if (array) {
    output = formatArray(ctx, value, recurseTimes, visibleKeys, keys);
  } else {
    output = keys.map(function(key) {
      return formatProperty(ctx, value, recurseTimes, visibleKeys, key, array);
    });
  }

  ctx.seen.pop();

  return reduceToSingleString(output, base, braces);
}


function formatPrimitive(ctx, value) {
  if (isUndefined(value))
    return ctx.stylize('undefined', 'undefined');
  if (isString(value)) {
    var simple = '\'' + JSON.stringify(value).replace(/^"|"$/g, '')
                                             .replace(/'/g, "\\'")
                                             .replace(/\\"/g, '"') + '\'';
    return ctx.stylize(simple, 'string');
  }
  if (isNumber(value))
    return ctx.stylize('' + value, 'number');
  if (isBoolean(value))
    return ctx.stylize('' + value, 'boolean');
  // For some reason typeof null is "object", so special case here.
  if (isNull(value))
    return ctx.stylize('null', 'null');
}


function formatError(value) {
  return '[' + Error.prototype.toString.call(value) + ']';
}


function formatArray(ctx, value, recurseTimes, visibleKeys, keys) {
  var output = [];
  for (var i = 0, l = value.length; i < l; ++i) {
    if (hasOwnProperty(value, String(i))) {
      output.push(formatProperty(ctx, value, recurseTimes, visibleKeys,
          String(i), true));
    } else {
      output.push('');
    }
  }
  keys.forEach(function(key) {
    if (!key.match(/^\d+$/)) {
      output.push(formatProperty(ctx, value, recurseTimes, visibleKeys,
          key, true));
    }
  });
  return output;
}


function formatProperty(ctx, value, recurseTimes, visibleKeys, key, array) {
  var name, str, desc;
  desc = Object.getOwnPropertyDescriptor(value, key) || { value: value[key] };
  if (desc.get) {
    if (desc.set) {
      str = ctx.stylize('[Getter/Setter]', 'special');
    } else {
      str = ctx.stylize('[Getter]', 'special');
    }
  } else {
    if (desc.set) {
      str = ctx.stylize('[Setter]', 'special');
    }
  }
  if (!hasOwnProperty(visibleKeys, key)) {
    name = '[' + key + ']';
  }
  if (!str) {
    if (ctx.seen.indexOf(desc.value) < 0) {
      if (isNull(recurseTimes)) {
        str = formatValue(ctx, desc.value, null);
      } else {
        str = formatValue(ctx, desc.value, recurseTimes - 1);
      }
      if (str.indexOf('\n') > -1) {
        if (array) {
          str = str.split('\n').map(function(line) {
            return '  ' + line;
          }).join('\n').substr(2);
        } else {
          str = '\n' + str.split('\n').map(function(line) {
            return '   ' + line;
          }).join('\n');
        }
      }
    } else {
      str = ctx.stylize('[Circular]', 'special');
    }
  }
  if (isUndefined(name)) {
    if (array && key.match(/^\d+$/)) {
      return str;
    }
    name = JSON.stringify('' + key);
    if (name.match(/^"([a-zA-Z_][a-zA-Z_0-9]*)"$/)) {
      name = name.substr(1, name.length - 2);
      name = ctx.stylize(name, 'name');
    } else {
      name = name.replace(/'/g, "\\'")
                 .replace(/\\"/g, '"')
                 .replace(/(^"|"$)/g, "'");
      name = ctx.stylize(name, 'string');
    }
  }

  return name + ': ' + str;
}


function reduceToSingleString(output, base, braces) {
  var numLinesEst = 0;
  var length = output.reduce(function(prev, cur) {
    numLinesEst++;
    if (cur.indexOf('\n') >= 0) numLinesEst++;
    return prev + cur.replace(/\u001b\[\d\d?m/g, '').length + 1;
  }, 0);

  if (length > 60) {
    return braces[0] +
           (base === '' ? '' : base + '\n ') +
           ' ' +
           output.join(',\n  ') +
           ' ' +
           braces[1];
  }

  return braces[0] + base + ' ' + output.join(', ') + ' ' + braces[1];
}


// NOTE: These type checking functions intentionally don't use `instanceof`
// because it is fragile and can be easily faked with `Object.create()`.
function isArray(ar) {
  return Array.isArray(ar);
}
exports.isArray = isArray;

function isBoolean(arg) {
  return typeof arg === 'boolean';
}
exports.isBoolean = isBoolean;

function isNull(arg) {
  return arg === null;
}
exports.isNull = isNull;

function isNullOrUndefined(arg) {
  return arg == null;
}
exports.isNullOrUndefined = isNullOrUndefined;

function isNumber(arg) {
  return typeof arg === 'number';
}
exports.isNumber = isNumber;

function isString(arg) {
  return typeof arg === 'string';
}
exports.isString = isString;

function isSymbol(arg) {
  return typeof arg === 'symbol';
}
exports.isSymbol = isSymbol;

function isUndefined(arg) {
  return arg === void 0;
}
exports.isUndefined = isUndefined;

function isRegExp(re) {
  return isObject(re) && objectToString(re) === '[object RegExp]';
}
exports.isRegExp = isRegExp;

function isObject(arg) {
  return typeof arg === 'object' && arg !== null;
}
exports.isObject = isObject;

function isDate(d) {
  return isObject(d) && objectToString(d) === '[object Date]';
}
exports.isDate = isDate;

function isError(e) {
  return isObject(e) &&
      (objectToString(e) === '[object Error]' || e instanceof Error);
}
exports.isError = isError;

function isFunction(arg) {
  return typeof arg === 'function';
}
exports.isFunction = isFunction;

function isPrimitive(arg) {
  return arg === null ||
         typeof arg === 'boolean' ||
         typeof arg === 'number' ||
         typeof arg === 'string' ||
         typeof arg === 'symbol' ||  // ES6 symbol
         typeof arg === 'undefined';
}
exports.isPrimitive = isPrimitive;

exports.isBuffer = require('./support/isBuffer');

function objectToString(o) {
  return Object.prototype.toString.call(o);
}


function pad(n) {
  return n < 10 ? '0' + n.toString(10) : n.toString(10);
}


var months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep',
              'Oct', 'Nov', 'Dec'];

// 26 Feb 16:19:34
function timestamp() {
  var d = new Date();
  var time = [pad(d.getHours()),
              pad(d.getMinutes()),
              pad(d.getSeconds())].join(':');
  return [d.getDate(), months[d.getMonth()], time].join(' ');
}


// log is just a thin wrapper to console.log that prepends a timestamp
exports.log = function() {
  console.log('%s - %s', timestamp(), exports.format.apply(exports, arguments));
};


/**
 * Inherit the prototype methods from one constructor into another.
 *
 * The Function.prototype.inherits from lang.js rewritten as a standalone
 * function (not on Function.prototype). NOTE: If this file is to be loaded
 * during bootstrapping this function needs to be rewritten using some native
 * functions as prototype setup using normal JavaScript does not work as
 * expected during bootstrapping (see mirror.js in r114903).
 *
 * @param {function} ctor Constructor function which needs to inherit the
 *     prototype.
 * @param {function} superCtor Constructor function to inherit prototype from.
 */
exports.inherits = require('inherits');

exports._extend = function(origin, add) {
  // Don't do anything if add isn't an object
  if (!add || !isObject(add)) return origin;

  var keys = Object.keys(add);
  var i = keys.length;
  while (i--) {
    origin[keys[i]] = add[keys[i]];
  }
  return origin;
};

function hasOwnProperty(obj, prop) {
  return Object.prototype.hasOwnProperty.call(obj, prop);
}

}).call(this,require('_process'),typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})

},{"./support/isBuffer":4,"_process":2,"inherits":3}],6:[function(require,module,exports){
"use strict";

/**
 * Name generator for backups
 */

exports.genBackupName = function () {
  var date = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : new Date();

  return "backup-" + date.getFullYear() + "-" + (date.getMonth() + 1) + "-" + date.getDate() + ("-" + date.getHours() + "-" + date.getMinutes() + ".zip");
};

},{}],7:[function(require,module,exports){
"use strict";

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _possibleConstructorReturn(self, call) { if (!self) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return call && (typeof call === "object" || typeof call === "function") ? call : self; }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }

/**
 * A basic key value data store
 */

var KeyValueStore = function (_lifeLine$EventEmitte) {
	_inherits(KeyValueStore, _lifeLine$EventEmitte);

	function KeyValueStore(adapter) {
		_classCallCheck(this, KeyValueStore);

		var _this = _possibleConstructorReturn(this, (KeyValueStore.__proto__ || Object.getPrototypeOf(KeyValueStore)).call(this));

		_this._adapter = adapter;

		// make sure we have an adapter
		if (!adapter) {
			throw new Error("KeyValueStore must be initialized with an adapter");
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

			return this._adapter.get(key).then(function (result) {
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
				var promise = this._adapter.set({
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

							promises.push(this._adapter.set({
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

			// send the current value
			if (opts.current) {
				this.get(key, opts.default).then(function (value) {
					return fn(value);
				});
			}

			// listen for any changes
			return this.on(key, function (value) {
				// only emit the change if there is not an override in place
				if (!_this2._overrides || !_this2._overrides.hasOwnProperty(key)) {
					fn(value);
				}
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

			this._overrides = overrides;

			// emit changes for each of the overrides
			Object.getOwnPropertyNames(overrides).forEach(function (key) {
				return _this3.emit(key, overrides[key]);
			});
		}
	}]);

	return KeyValueStore;
}(lifeLine.EventEmitter);

module.exports = KeyValueStore;

},{}],8:[function(require,module,exports){
"use strict";

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

/**
 * An in memory adapter for data stores
 */

var MemAdaptor = function () {
	function MemAdaptor() {
		_classCallCheck(this, MemAdaptor);

		this._data = {};
	}

	/**
  * Get an array of values
  */


	_createClass(MemAdaptor, [{
		key: "getAll",
		value: function getAll() {
			var _this = this;

			return Promise.resolve(Object.getOwnPropertyNames(this._data).map(function (name) {
				return _this._data[name];
			}));
		}

		/**
   * Lookup a value
   *
   * returns {id, value}
   */

	}, {
		key: "get",
		value: function get(id) {
			// check if we have the value
			if (this._data.hasOwnProperty(id)) {
				return Promise.resolve(this._data[id]);
			}

			return Promise.resolve();
		}

		/**
   * Store a value
   *
   * The value is stored by its id property
   */

	}, {
		key: "set",
		value: function set(value) {
			// store the value
			this._data[value.id] = value;

			return Promise.resolve();
		}

		/**
   * Remove a value from the adaptor
   */

	}, {
		key: "remove",
		value: function remove(key) {
			delete this._data[key];

			return Promise.resolve();
		}
	}]);

	return MemAdaptor;
}();

module.exports = MemAdaptor;

},{}],9:[function(require,module,exports){
"use strict";

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _possibleConstructorReturn(self, call) { if (!self) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return call && (typeof call === "object" || typeof call === "function") ? call : self; }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }

/**
 * A data store which contains a pool of objects which are queryable by any property
 */

var PoolStore = function (_lifeLine$EventEmitte) {
	_inherits(PoolStore, _lifeLine$EventEmitte);

	function PoolStore(adaptor) {
		_classCallCheck(this, PoolStore);

		var _this = _possibleConstructorReturn(this, (PoolStore.__proto__ || Object.getPrototypeOf(PoolStore)).call(this));

		_this._adaptor = adaptor;
		return _this;
	}

	/**
  * Get all items matcing the provided properties
  */


	_createClass(PoolStore, [{
		key: "query",
		value: function query(props, opts, fn) {
			var _this2 = this;

			// make opts optional
			if (typeof opts == "function") {
				fn = opts;
				opts = {};
			}

			opts || (opts = {});

			// check if a value matches the query
			var filter = function (value) {
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

			// keep track of the current list of items so when items
			// stop fiting the query we can notify the consumer
			var currentItems = [];

			// get all current items that match the filter
			var current = this._adaptor.getAll().then(function (values) {
				var matches = values.filter(filter);

				// track the id
				var _iteratorNormalCompletion = true;
				var _didIteratorError = false;
				var _iteratorError = undefined;

				try {
					for (var _iterator = matches[Symbol.iterator](), _step; !(_iteratorNormalCompletion = (_step = _iterator.next()).done); _iteratorNormalCompletion = true) {
						var value = _step.value;

						currentItems.push(value.id);
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

				return matches;
			});

			// optionaly run changes through the query as well
			if (opts.watch) {
				// wrap the values in change objects and send the to the consumer
				current.then(function (values) {
					// send the values we currently have
					var _iteratorNormalCompletion2 = true;
					var _didIteratorError2 = false;
					var _iteratorError2 = undefined;

					try {
						for (var _iterator2 = values[Symbol.iterator](), _step2; !(_iteratorNormalCompletion2 = (_step2 = _iterator2.next()).done); _iteratorNormalCompletion2 = true) {
							var value = _step2.value;

							fn({ type: "change", id: value.id, value: value });
						}

						// watch for changes after the initial values are send
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

					_this2.on("change", function (change) {
						if (change.type == "change") {
							// check if the value matches the query
							var matches = filter(change.value);

							if (matches) {
								// if this isn't in the currentItems list add it
								if (currentItems.indexOf(change.id) === -1) {
									currentItems.push(change.id);
								}

								// pass the change along
								fn(change);
							}
							// tell the consumer this value no longer matches
							else if (currentItems.indexOf(change.id) !== -1) {
									// remove the item from the current items list
									currentItems.splice(currentItems.indexOf(change.id), 1);

									fn({
										type: "unmatch",
										id: change.id
									});
								}
						} else if (change.type == "remove" && currentItems.indexOf(change.id) !== -1) {
							// remove the item from the current items list
							currentItems.splice(currentItems.indexOf(change.id), 1);

							fn({
								type: "remove",
								id: change.id
							});
						}
					});
				});
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
}(lifeLine.EventEmitter);

module.exports = PoolStore;

},{}],10:[function(require,module,exports){
(function (process,global){
"use strict";

/**
 * Create a global object with commonly used modules to avoid 50 million requires
 */

var EventEmitter = require("./util/event-emitter");

var lifeLine = new EventEmitter();

// platform detection
lifeLine.node = typeof process == "object";
lifeLine.browser = typeof window == "object";

// attach utils
lifeLine.Disposable = require("./util/disposable");
lifeLine.EventEmitter = EventEmitter;

// attach lifeline to the global object
(lifeLine.node ? global : browser).lifeLine = lifeLine;

// attach config
var MemAdaptor = require("./data-stores/mem-adaptor");
var KeyValueStore = require("./data-stores/key-value-store");

lifeLine.config = new KeyValueStore(new MemAdaptor());

}).call(this,require('_process'),typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})

},{"./data-stores/key-value-store":7,"./data-stores/mem-adaptor":8,"./util/disposable":11,"./util/event-emitter":12,"_process":2}],11:[function(require,module,exports){
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

},{}],12:[function(require,module,exports){
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

},{}],13:[function(require,module,exports){
"use strict";

/**
 * All client side and common tests to bundle together
 */

//require("./common/data-stores/http-adaptor.js");
require("./common/data-stores/key-value-store");
require("./common/data-stores/mem-adaptor");
require("./common/data-stores/pool-store");
require("./common/util/disposable");
require("./common/backup");

},{"./common/backup":14,"./common/data-stores/key-value-store":15,"./common/data-stores/mem-adaptor":16,"./common/data-stores/pool-store":17,"./common/util/disposable":18}],14:[function(require,module,exports){
"use strict";

var assert = require("assert");
var backup = require("../../src/common/backup");

describe("Backup", function () {
	it("can generate backup names from the date", function () {
		assert.equal(backup.genBackupName(new Date("2017-01-01T11:00:00.000Z")), "backup-2017-1-1-5-0.zip");
	});
});

},{"../../src/common/backup":6,"assert":1}],15:[function(require,module,exports){
"use strict";

require("../../../src/common/global");
var assert = require("assert");
var MemAdaptor = require("../../../src/common/data-stores/mem-adaptor");
var KeyValueStore = require("../../../src/common/data-stores/key-value-store");

describe("Key value store", function () {
		it("can get a value", function () {
				// create an adaptor
				var adaptor = new MemAdaptor();

				// put a value in it
				adaptor.set({ id: "Foo", value: "Bar" });

				// create a store using the adaptor
				var store = new KeyValueStore(adaptor);

				// get the value
				return store.get("Foo").then(function (value) {
						// check the value
						assert.equal(value, "Bar");
				});
		});

		it("gives the default value if no value is defined", function () {
				// create the empty store and adaptor;
				var store = new KeyValueStore(new MemAdaptor());

				// get the default value
				return store.get("Foo", "Bar").then(function (value) {
						assert.equal(value, "Bar");
				});
		});

		it("can override values", function () {
				// create an adaptor
				var adaptor = new MemAdaptor();

				// put a value in it
				adaptor.set({ id: "Foo", value: "Bar" });

				// create a store using the adaptor
				var store = new KeyValueStore(adaptor);

				// put in overrides for Foo
				store.setOverrides({
						Foo: "Baz"
				});

				// get the value
				return store.get("Foo").then(function (value) {
						// check the value
						assert.equal(value, "Baz");
				});
		});

		it("can store values", function () {
				// create the empty store and adaptor
				var adaptor = new MemAdaptor();
				var store = new KeyValueStore(adaptor);

				// store the value
				store.set("Foo", "Bar");

				// check the value
				return adaptor.get("Foo").then(function (value) {
						// remove the modified date
						delete value.modified;

						assert.deepEqual(value, {
								id: "Foo",
								value: "Bar"
						});
				});
		});

		it("can store values (object form)", function () {
				// create the empty store and adaptor
				var adaptor = new MemAdaptor();
				var store = new KeyValueStore(adaptor);

				// store the value
				store.set({ Foo: "Bar" });

				// check the value
				return adaptor.get("Foo").then(function (value) {
						// remove the modified date
						delete value.modified;

						assert.deepEqual(value, {
								id: "Foo",
								value: "Bar"
						});
				});
		});

		it("can watch changes in the store", function () {
				// create the store and adaptor
				var store = new KeyValueStore(new MemAdaptor());

				// collect all vaules that come through the watcher
				var changes = [];

				// watch for changes to the "real" key
				var subscription = store.watch("real", function (change) {
						return changes.push(change);
				});

				// trigger some changes
				store.set("real", "Ok");
				store.set("real", "Ok");

				// change another property (should not trigger a change)
				store.set("other", "Other property");

				// stop listening
				subscription.unsubscribe();

				// change the real value this should not cause any changes
				store.set("real", "Unsubscribed");

				assert.deepEqual(changes, ["Ok", "Ok"]);
		});
});

},{"../../../src/common/data-stores/key-value-store":7,"../../../src/common/data-stores/mem-adaptor":8,"../../../src/common/global":10,"assert":1}],16:[function(require,module,exports){
"use strict";

require("../../../src/common/global");
var assert = require("assert");
var MemAdaptor = require("../../../src/common/data-stores/mem-adaptor");

describe("In memory adaptor", function () {
	it("Returns undefined if there is no value", function () {
		var memAdaptor = new MemAdaptor();

		// retreve the value
		return memAdaptor.get("not-defined").then(function (result) {
			assert.equal(result, undefined);
		});
	});

	it("Values can be stored and retreved", function () {
		var memAdaptor = new MemAdaptor();

		// store the value
		var promise = memAdaptor.set({
			id: "foo",
			value: "Yay!"
		});

		// make sure set is returing a promise
		assert(promise instanceof Promise);

		// retreve the value
		return memAdaptor.get("foo").then(function (result) {
			assert.deepEqual(result, {
				id: "foo",
				value: "Yay!"
			});
		});
	});
});

},{"../../../src/common/data-stores/mem-adaptor":8,"../../../src/common/global":10,"assert":1}],17:[function(require,module,exports){
"use strict";

require("../../../src/common/global");
var assert = require("assert");
var MemAdaptor = require("../../../src/common/data-stores/mem-adaptor");
var PoolStore = require("../../../src/common/data-stores/pool-store");

describe("Pool store", function () {
	it("objects can be queried by any property", function (done) {
		// create an adpator and store for testing
		var pool = new PoolStore(new MemAdaptor());

		// fill the adaptor
		pool.set({ id: "foo", name: "Foo", type: "a" });
		pool.set({ id: "bar", name: "Bar", type: "b" });
		pool.set({ id: "baz", name: "Baz", type: "a" });

		// query all type a elements
		pool.query({ type: "a" }).then(function (collection) {
			// remove modified dates
			var _iteratorNormalCompletion = true;
			var _didIteratorError = false;
			var _iteratorError = undefined;

			try {
				for (var _iterator = collection[Symbol.iterator](), _step; !(_iteratorNormalCompletion = (_step = _iterator.next()).done); _iteratorNormalCompletion = true) {
					var value = _step.value;

					delete value.modified;
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

			assert.deepEqual(collection, [{ id: "foo", name: "Foo", type: "a" }, { id: "baz", name: "Baz", type: "a" }]);

			done();
		}).catch(function (err) {
			return done(err);
		});
	});

	it("querys can also be updated when values change", function (done) {
		// create an adpator and store for testing
		var pool = new PoolStore(new MemAdaptor());

		// fill the pool
		pool.set({ id: "foo", name: "Foo", type: "a" });

		// collect values that match
		var collection = [];

		// query all type a elements
		pool.query({ type: "a" }, { watch: true }, function (r) {
			return collection.push(r);
		});

		setTimeout(function () {
			// change a value that matches the query
			pool.set({ id: "baz", name: "Baz", type: "a" });

			// change the value so it doesn't match
			pool.set({ id: "baz", name: "Baz", type: "b" });

			// remove the other value
			pool.remove("foo");

			// remove modified dates
			var _iteratorNormalCompletion2 = true;
			var _didIteratorError2 = false;
			var _iteratorError2 = undefined;

			try {
				for (var _iterator2 = collection[Symbol.iterator](), _step2; !(_iteratorNormalCompletion2 = (_step2 = _iterator2.next()).done); _iteratorNormalCompletion2 = true) {
					var change = _step2.value;

					if (change.value) {
						delete change.value.modified;
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

			assert.deepEqual(collection, [{ type: "change", id: "foo", value: { id: "foo", name: "Foo", type: "a" } }, { type: "change", id: "baz", value: { id: "baz", name: "Baz", type: "a" } }, { type: "unmatch", id: "baz" }, { type: "remove", id: "foo" }]);

			done();
		});
	});

	it("queries can be passed functions to test their values against", function () {
		// create an adpator and store for testing
		var pool = new PoolStore(new MemAdaptor());

		// fill the adaptor
		pool.set({ id: "foo", name: "Foo", value: 1 });
		pool.set({ id: "bar", name: "Bar", value: 2 });
		pool.set({ id: "baz", name: "Baz", value: 3 });

		// query all type a elements
		return pool.query({ value: function (val) {
				return val > 1;
			} }).then(function (collection) {
			// remove modified dates
			var _iteratorNormalCompletion3 = true;
			var _didIteratorError3 = false;
			var _iteratorError3 = undefined;

			try {
				for (var _iterator3 = collection[Symbol.iterator](), _step3; !(_iteratorNormalCompletion3 = (_step3 = _iterator3.next()).done); _iteratorNormalCompletion3 = true) {
					var value = _step3.value;

					delete value.modified;
				}
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

			assert.deepEqual(collection, [{ id: "bar", name: "Bar", value: 2 }, { id: "baz", name: "Baz", value: 3 }]);
		});
	});
});

},{"../../../src/common/data-stores/mem-adaptor":8,"../../../src/common/data-stores/pool-store":9,"../../../src/common/global":10,"assert":1}],18:[function(require,module,exports){
"use strict";

var Disposable = require("../../../src/common/util/disposable");
var EventEmitter = require("../../../src/common/util/event-emitter");
var assert = require("assert");

describe("Disposable", function () {
		it("can collect subscriptions and remove the together", function () {
				// count how many subscription have been unsubscribed
				var ref = { count: 0 };
				// create the disposable
				var disp = new Disposable();

				// add some subscriptions
				disp.add(createSub(ref));
				disp.add(createSub(ref));
				disp.add(createSub(ref));

				// dispose the subscriptions
				disp.dispose();

				// dispose again to check that disposables only trigger once
				disp.dispose();

				assert.equal(ref.count, 3);
		});

		it("can be disposed by an event", function () {
				// count how many subscription have been unsubscribed
				var ref = { count: 0 };
				// create the disposable
				var disp = new Disposable();
				// create an event emitter to watch
				var emitter = new EventEmitter();

				// add some subscriptions
				disp.add(createSub(ref));
				disp.add(createSub(ref));
				disp.add(createSub(ref));

				// dispose the subscriptions
				disp.disposeOn(emitter, "dispose");

				// trigger the disposable
				emitter.emit("dispose");

				assert.equal(ref.count, 3);

				// check the dispose listener was removed
				assert.equal(emitter._listeners.dispose.length, 0);
		});
});

// helper to create a subscription that increments a counter when it is removed
var createSub = function (ref) {
		return {
				unsubscribe: function () {
						++ref.count;
				}
		};
};

},{"../../../src/common/util/disposable":11,"../../../src/common/util/event-emitter":12,"assert":1}]},{},[13])
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCJub2RlX21vZHVsZXMvYXNzZXJ0L2Fzc2VydC5qcyIsIm5vZGVfbW9kdWxlcy9wcm9jZXNzL2Jyb3dzZXIuanMiLCJub2RlX21vZHVsZXMvdXRpbC9ub2RlX21vZHVsZXMvaW5oZXJpdHMvaW5oZXJpdHNfYnJvd3Nlci5qcyIsIm5vZGVfbW9kdWxlcy91dGlsL3N1cHBvcnQvaXNCdWZmZXJCcm93c2VyLmpzIiwibm9kZV9tb2R1bGVzL3V0aWwvdXRpbC5qcyIsInNyY1xcY29tbW9uXFxiYWNrdXAuanMiLCJzcmNcXGNvbW1vblxcZGF0YS1zdG9yZXNcXGtleS12YWx1ZS1zdG9yZS5qcyIsInNyY1xcY29tbW9uXFxkYXRhLXN0b3Jlc1xcbWVtLWFkYXB0b3IuanMiLCJzcmNcXGNvbW1vblxcZGF0YS1zdG9yZXNcXHBvb2wtc3RvcmUuanMiLCJzcmNcXGNvbW1vblxcc3JjXFxjb21tb25cXGdsb2JhbC5qcyIsInNyY1xcY29tbW9uXFx1dGlsXFxkaXNwb3NhYmxlLmpzIiwic3JjXFxjb21tb25cXHV0aWxcXGV2ZW50LWVtaXR0ZXIuanMiLCJ0ZXN0c1xcYWxsLmpzIiwidGVzdHNcXGNvbW1vblxcYmFja3VwLmpzIiwidGVzdHNcXGNvbW1vblxcZGF0YS1zdG9yZXNcXGtleS12YWx1ZS1zdG9yZS5qcyIsInRlc3RzXFxjb21tb25cXGRhdGEtc3RvcmVzXFxtZW0tYWRhcHRvci5qcyIsInRlc3RzXFxjb21tb25cXGRhdGEtc3RvcmVzXFxwb29sLXN0b3JlLmpzIiwidGVzdHNcXGNvbW1vblxcdXRpbFxcZGlzcG9zYWJsZS5qcyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7QUNBQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOzs7O0FDMWVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3BMQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDdkJBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7O0FDTEE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FB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SSxVQUFKLEVBQVg7O0FBRUE7QUFDQSxTQUFLLEdBQUwsQ0FBUyxVQUFVLEdBQVYsQ0FBVDtBQUNBLFNBQUssR0FBTCxDQUFTLFVBQVUsR0FBVixDQUFUO0FBQ0EsU0FBSyxHQUFMLENBQVMsVUFBVSxHQUFWLENBQVQ7O0FBRUE7QUFDQSxTQUFLLE9BQUw7O0FBRUE7QUFDQSxTQUFLLE9BQUw7O0FBRUEsV0FBTyxLQUFQLENBQWEsSUFBSSxLQUFqQixFQUF3QixDQUF4QjtBQUNBLEdBbEJEOztBQW9CQSxLQUFHLDZCQUFILEVBQWtDLFlBQVc7QUFDNUM7QUFDQSxRQUFJLE1BQU0sRUFBRSxPQUFPLENBQVQsRUFBVjtBQUNBO0FBQ0EsUUFBSSxPQUFPLElBQUksVUFBSixFQUFYO0FBQ0E7QUFDQSxRQUFJLFVBQVUsSUFBSSxZQUFKLEVBQWQ7O0FBRUE7QUFDQSxTQUFLLEdBQUwsQ0FBUyxVQUFVLEdBQVYsQ0FBVDtBQUNBLFNBQUssR0FBTCxDQUFTLFVBQVUsR0FBVixDQUFUO0FBQ0EsU0FBSyxHQUFMLENBQVMsVUFBVSxHQUFWLENBQVQ7O0FBRUE7QUFDQSxTQUFLLFNBQUwsQ0FBZSxPQUFmLEVBQXdCLFNBQXhCOztBQUVBO0FBQ0EsWUFBUSxJQUFSLENBQWEsU0FBYjs7QUFFQSxXQUFPLEtBQVAsQ0FBYSxJQUFJLEtBQWpCLEVBQXdCLENBQXhCOztBQUVBO0FBQ0EsV0FBTyxLQUFQLENBQWEsUUFBUSxVQUFSLENBQW1CLE9BQW5CLENBQTJCLE1BQXhDLEVBQWdELENBQWhEO0FBQ0EsR0F2QkQ7QUF3QkEsQ0E3Q0Q7O0FBK0NBO0FBQ0EsSUFBSSxZQUFZLFVBQVMsR0FBVCxFQUFjO0FBQzdCLFNBQU87QUFDTixlQURNLGNBQ1E7QUFDYixRQUFFLElBQUksS0FBTjtBQUNBO0FBSEssR0FBUDtBQUtBLENBTkQiLCJmaWxlIjoiZ2VuZXJhdGVkLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXNDb250ZW50IjpbIihmdW5jdGlvbiBlKHQsbixyKXtmdW5jdGlvbiBzKG8sdSl7aWYoIW5bb10pe2lmKCF0W29dKXt2YXIgYT10eXBlb2YgcmVxdWlyZT09XCJmdW5jdGlvblwiJiZyZXF1aXJlO2lmKCF1JiZhKXJldHVybiBhKG8sITApO2lmKGkpcmV0dXJuIGkobywhMCk7dmFyIGY9bmV3IEVycm9yKFwiQ2Fubm90IGZpbmQgbW9kdWxlICdcIitvK1wiJ1wiKTt0aHJvdyBmLmNvZGU9XCJNT0RVTEVfTk9UX0ZPVU5EXCIsZn12YXIgbD1uW29dPXtleHBvcnRzOnt9fTt0W29dWzBdLmNhbGwobC5leHBvcnRzLGZ1bmN0aW9uKGUpe3ZhciBuPXRbb11bMV1bZV07cmV0dXJuIHMobj9uOmUpfSxsLGwuZXhwb3J0cyxlLHQsbixyKX1yZXR1cm4gbltvXS5leHBvcnRzfXZhciBpPXR5cGVvZiByZXF1aXJlPT1cImZ1bmN0aW9uXCImJnJlcXVpcmU7Zm9yKHZhciBvPTA7bzxyLmxlbmd0aDtvKyspcyhyW29dKTtyZXR1cm4gc30pIiwiJ3VzZSBzdHJpY3QnO1xuXG4vLyBjb21wYXJlIGFuZCBpc0J1ZmZlciB0YWtlbiBmcm9tIGh0dHBzOi8vZ2l0aHViLmNvbS9mZXJvc3MvYnVmZmVyL2Jsb2IvNjgwZTllNWU0ODhmMjJhYWMyNzU5OWE1N2RjODQ0YTYzMTU5MjhkZC9pbmRleC5qc1xuLy8gb3JpZ2luYWwgbm90aWNlOlxuXG4vKiFcbiAqIFRoZSBidWZmZXIgbW9kdWxlIGZyb20gbm9kZS5qcywgZm9yIHRoZSBicm93c2VyLlxuICpcbiAqIEBhdXRob3IgICBGZXJvc3MgQWJvdWtoYWRpamVoIDxmZXJvc3NAZmVyb3NzLm9yZz4gPGh0dHA6Ly9mZXJvc3Mub3JnPlxuICogQGxpY2Vuc2UgIE1JVFxuICovXG5mdW5jdGlvbiBjb21wYXJlKGEsIGIpIHtcbiAgaWYgKGEgPT09IGIpIHtcbiAgICByZXR1cm4gMDtcbiAgfVxuXG4gIHZhciB4ID0gYS5sZW5ndGg7XG4gIHZhciB5ID0gYi5sZW5ndGg7XG5cbiAgZm9yICh2YXIgaSA9IDAsIGxlbiA9IE1hdGgubWluKHgsIHkpOyBpIDwgbGVuOyArK2kpIHtcbiAgICBpZiAoYVtpXSAhPT0gYltpXSkge1xuICAgICAgeCA9IGFbaV07XG4gICAgICB5ID0gYltpXTtcbiAgICAgIGJyZWFrO1xuICAgIH1cbiAgfVxuXG4gIGlmICh4IDwgeSkge1xuICAgIHJldHVybiAtMTtcbiAgfVxuICBpZiAoeSA8IHgpIHtcbiAgICByZXR1cm4gMTtcbiAgfVxuICByZXR1cm4gMDtcbn1cbmZ1bmN0aW9uIGlzQnVmZmVyKGIpIHtcbiAgaWYgKGdsb2JhbC5CdWZmZXIgJiYgdHlwZW9mIGdsb2JhbC5CdWZmZXIuaXNCdWZmZXIgPT09ICdmdW5jdGlvbicpIHtcbiAgICByZXR1cm4gZ2xvYmFsLkJ1ZmZlci5pc0J1ZmZlcihiKTtcbiAgfVxuICByZXR1cm4gISEoYiAhPSBudWxsICYmIGIuX2lzQnVmZmVyKTtcbn1cblxuLy8gYmFzZWQgb24gbm9kZSBhc3NlcnQsIG9yaWdpbmFsIG5vdGljZTpcblxuLy8gaHR0cDovL3dpa2kuY29tbW9uanMub3JnL3dpa2kvVW5pdF9UZXN0aW5nLzEuMFxuLy9cbi8vIFRISVMgSVMgTk9UIFRFU1RFRCBOT1IgTElLRUxZIFRPIFdPUksgT1VUU0lERSBWOCFcbi8vXG4vLyBPcmlnaW5hbGx5IGZyb20gbmFyd2hhbC5qcyAoaHR0cDovL25hcndoYWxqcy5vcmcpXG4vLyBDb3B5cmlnaHQgKGMpIDIwMDkgVGhvbWFzIFJvYmluc29uIDwyODBub3J0aC5jb20+XG4vL1xuLy8gUGVybWlzc2lvbiBpcyBoZXJlYnkgZ3JhbnRlZCwgZnJlZSBvZiBjaGFyZ2UsIHRvIGFueSBwZXJzb24gb2J0YWluaW5nIGEgY29weVxuLy8gb2YgdGhpcyBzb2Z0d2FyZSBhbmQgYXNzb2NpYXRlZCBkb2N1bWVudGF0aW9uIGZpbGVzICh0aGUgJ1NvZnR3YXJlJyksIHRvXG4vLyBkZWFsIGluIHRoZSBTb2Z0d2FyZSB3aXRob3V0IHJlc3RyaWN0aW9uLCBpbmNsdWRpbmcgd2l0aG91dCBsaW1pdGF0aW9uIHRoZVxuLy8gcmlnaHRzIHRvIHVzZSwgY29weSwgbW9kaWZ5LCBtZXJnZSwgcHVibGlzaCwgZGlzdHJpYnV0ZSwgc3VibGljZW5zZSwgYW5kL29yXG4vLyBzZWxsIGNvcGllcyBvZiB0aGUgU29mdHdhcmUsIGFuZCB0byBwZXJtaXQgcGVyc29ucyB0byB3aG9tIHRoZSBTb2Z0d2FyZSBpc1xuLy8gZnVybmlzaGVkIHRvIGRvIHNvLCBzdWJqZWN0IHRvIHRoZSBmb2xsb3dpbmcgY29uZGl0aW9uczpcbi8vXG4vLyBUaGUgYWJvdmUgY29weXJpZ2h0IG5vdGljZSBhbmQgdGhpcyBwZXJtaXNzaW9uIG5vdGljZSBzaGFsbCBiZSBpbmNsdWRlZCBpblxuLy8gYWxsIGNvcGllcyBvciBzdWJzdGFudGlhbCBwb3J0aW9ucyBvZiB0aGUgU29mdHdhcmUuXG4vL1xuLy8gVEhFIFNPRlRXQVJFIElTIFBST1ZJREVEICdBUyBJUycsIFdJVEhPVVQgV0FSUkFOVFkgT0YgQU5ZIEtJTkQsIEVYUFJFU1MgT1Jcbi8vIElNUExJRUQsIElOQ0xVRElORyBCVVQgTk9UIExJTUlURUQgVE8gVEhFIFdBUlJBTlRJRVMgT0YgTUVSQ0hBTlRBQklMSVRZLFxuLy8gRklUTkVTUyBGT1IgQSBQQVJUSUNVTEFSIFBVUlBPU0UgQU5EIE5PTklORlJJTkdFTUVOVC4gSU4gTk8gRVZFTlQgU0hBTEwgVEhFXG4vLyBBVVRIT1JTIEJFIExJQUJMRSBGT1IgQU5ZIENMQUlNLCBEQU1BR0VTIE9SIE9USEVSIExJQUJJTElUWSwgV0hFVEhFUiBJTiBBTlxuLy8gQUNUSU9OIE9GIENPTlRSQUNULCBUT1JUIE9SIE9USEVSV0lTRSwgQVJJU0lORyBGUk9NLCBPVVQgT0YgT1IgSU4gQ09OTkVDVElPTlxuLy8gV0lUSCBUSEUgU09GVFdBUkUgT1IgVEhFIFVTRSBPUiBPVEhFUiBERUFMSU5HUyBJTiBUSEUgU09GVFdBUkUuXG5cbnZhciB1dGlsID0gcmVxdWlyZSgndXRpbC8nKTtcbnZhciBoYXNPd24gPSBPYmplY3QucHJvdG90eXBlLmhhc093blByb3BlcnR5O1xudmFyIHBTbGljZSA9IEFycmF5LnByb3RvdHlwZS5zbGljZTtcbnZhciBmdW5jdGlvbnNIYXZlTmFtZXMgPSAoZnVuY3Rpb24gKCkge1xuICByZXR1cm4gZnVuY3Rpb24gZm9vKCkge30ubmFtZSA9PT0gJ2Zvbyc7XG59KCkpO1xuZnVuY3Rpb24gcFRvU3RyaW5nIChvYmopIHtcbiAgcmV0dXJuIE9iamVjdC5wcm90b3R5cGUudG9TdHJpbmcuY2FsbChvYmopO1xufVxuZnVuY3Rpb24gaXNWaWV3KGFycmJ1Zikge1xuICBpZiAoaXNCdWZmZXIoYXJyYnVmKSkge1xuICAgIHJldHVybiBmYWxzZTtcbiAgfVxuICBpZiAodHlwZW9mIGdsb2JhbC5BcnJheUJ1ZmZlciAhPT0gJ2Z1bmN0aW9uJykge1xuICAgIHJldHVybiBmYWxzZTtcbiAgfVxuICBpZiAodHlwZW9mIEFycmF5QnVmZmVyLmlzVmlldyA9PT0gJ2Z1bmN0aW9uJykge1xuICAgIHJldHVybiBBcnJheUJ1ZmZlci5pc1ZpZXcoYXJyYnVmKTtcbiAgfVxuICBpZiAoIWFycmJ1Zikge1xuICAgIHJldHVybiBmYWxzZTtcbiAgfVxuICBpZiAoYXJyYnVmIGluc3RhbmNlb2YgRGF0YVZpZXcpIHtcbiAgICByZXR1cm4gdHJ1ZTtcbiAgfVxuICBpZiAoYXJyYnVmLmJ1ZmZlciAmJiBhcnJidWYuYnVmZmVyIGluc3RhbmNlb2YgQXJyYXlCdWZmZXIpIHtcbiAgICByZXR1cm4gdHJ1ZTtcbiAgfVxuICByZXR1cm4gZmFsc2U7XG59XG4vLyAxLiBUaGUgYXNzZXJ0IG1vZHVsZSBwcm92aWRlcyBmdW5jdGlvbnMgdGhhdCB0aHJvd1xuLy8gQXNzZXJ0aW9uRXJyb3IncyB3aGVuIHBhcnRpY3VsYXIgY29uZGl0aW9ucyBhcmUgbm90IG1ldC4gVGhlXG4vLyBhc3NlcnQgbW9kdWxlIG11c3QgY29uZm9ybSB0byB0aGUgZm9sbG93aW5nIGludGVyZmFjZS5cblxudmFyIGFzc2VydCA9IG1vZHVsZS5leHBvcnRzID0gb2s7XG5cbi8vIDIuIFRoZSBBc3NlcnRpb25FcnJvciBpcyBkZWZpbmVkIGluIGFzc2VydC5cbi8vIG5ldyBhc3NlcnQuQXNzZXJ0aW9uRXJyb3IoeyBtZXNzYWdlOiBtZXNzYWdlLFxuLy8gICAgICAgICAgICAgICAgICAgICAgICAgICAgIGFjdHVhbDogYWN0dWFsLFxuLy8gICAgICAgICAgICAgICAgICAgICAgICAgICAgIGV4cGVjdGVkOiBleHBlY3RlZCB9KVxuXG52YXIgcmVnZXggPSAvXFxzKmZ1bmN0aW9uXFxzKyhbXlxcKFxcc10qKVxccyovO1xuLy8gYmFzZWQgb24gaHR0cHM6Ly9naXRodWIuY29tL2xqaGFyYi9mdW5jdGlvbi5wcm90b3R5cGUubmFtZS9ibG9iL2FkZWVlZWM4YmZjYzYwNjhiMTg3ZDdkOWZiM2Q1YmIxZDNhMzA4OTkvaW1wbGVtZW50YXRpb24uanNcbmZ1bmN0aW9uIGdldE5hbWUoZnVuYykge1xuICBpZiAoIXV0aWwuaXNGdW5jdGlvbihmdW5jKSkge1xuICAgIHJldHVybjtcbiAgfVxuICBpZiAoZnVuY3Rpb25zSGF2ZU5hbWVzKSB7XG4gICAgcmV0dXJuIGZ1bmMubmFtZTtcbiAgfVxuICB2YXIgc3RyID0gZnVuYy50b1N0cmluZygpO1xuICB2YXIgbWF0Y2ggPSBzdHIubWF0Y2gocmVnZXgpO1xuICByZXR1cm4gbWF0Y2ggJiYgbWF0Y2hbMV07XG59XG5hc3NlcnQuQXNzZXJ0aW9uRXJyb3IgPSBmdW5jdGlvbiBBc3NlcnRpb25FcnJvcihvcHRpb25zKSB7XG4gIHRoaXMubmFtZSA9ICdBc3NlcnRpb25FcnJvcic7XG4gIHRoaXMuYWN0dWFsID0gb3B0aW9ucy5hY3R1YWw7XG4gIHRoaXMuZXhwZWN0ZWQgPSBvcHRpb25zLmV4cGVjdGVkO1xuICB0aGlzLm9wZXJhdG9yID0gb3B0aW9ucy5vcGVyYXRvcjtcbiAgaWYgKG9wdGlvbnMubWVzc2FnZSkge1xuICAgIHRoaXMubWVzc2FnZSA9IG9wdGlvbnMubWVzc2FnZTtcbiAgICB0aGlzLmdlbmVyYXRlZE1lc3NhZ2UgPSBmYWxzZTtcbiAgfSBlbHNlIHtcbiAgICB0aGlzLm1lc3NhZ2UgPSBnZXRNZXNzYWdlKHRoaXMpO1xuICAgIHRoaXMuZ2VuZXJhdGVkTWVzc2FnZSA9IHRydWU7XG4gIH1cbiAgdmFyIHN0YWNrU3RhcnRGdW5jdGlvbiA9IG9wdGlvbnMuc3RhY2tTdGFydEZ1bmN0aW9uIHx8IGZhaWw7XG4gIGlmIChFcnJvci5jYXB0dXJlU3RhY2tUcmFjZSkge1xuICAgIEVycm9yLmNhcHR1cmVTdGFja1RyYWNlKHRoaXMsIHN0YWNrU3RhcnRGdW5jdGlvbik7XG4gIH0gZWxzZSB7XG4gICAgLy8gbm9uIHY4IGJyb3dzZXJzIHNvIHdlIGNhbiBoYXZlIGEgc3RhY2t0cmFjZVxuICAgIHZhciBlcnIgPSBuZXcgRXJyb3IoKTtcbiAgICBpZiAoZXJyLnN0YWNrKSB7XG4gICAgICB2YXIgb3V0ID0gZXJyLnN0YWNrO1xuXG4gICAgICAvLyB0cnkgdG8gc3RyaXAgdXNlbGVzcyBmcmFtZXNcbiAgICAgIHZhciBmbl9uYW1lID0gZ2V0TmFtZShzdGFja1N0YXJ0RnVuY3Rpb24pO1xuICAgICAgdmFyIGlkeCA9IG91dC5pbmRleE9mKCdcXG4nICsgZm5fbmFtZSk7XG4gICAgICBpZiAoaWR4ID49IDApIHtcbiAgICAgICAgLy8gb25jZSB3ZSBoYXZlIGxvY2F0ZWQgdGhlIGZ1bmN0aW9uIGZyYW1lXG4gICAgICAgIC8vIHdlIG5lZWQgdG8gc3RyaXAgb3V0IGV2ZXJ5dGhpbmcgYmVmb3JlIGl0IChhbmQgaXRzIGxpbmUpXG4gICAgICAgIHZhciBuZXh0X2xpbmUgPSBvdXQuaW5kZXhPZignXFxuJywgaWR4ICsgMSk7XG4gICAgICAgIG91dCA9IG91dC5zdWJzdHJpbmcobmV4dF9saW5lICsgMSk7XG4gICAgICB9XG5cbiAgICAgIHRoaXMuc3RhY2sgPSBvdXQ7XG4gICAgfVxuICB9XG59O1xuXG4vLyBhc3NlcnQuQXNzZXJ0aW9uRXJyb3IgaW5zdGFuY2VvZiBFcnJvclxudXRpbC5pbmhlcml0cyhhc3NlcnQuQXNzZXJ0aW9uRXJyb3IsIEVycm9yKTtcblxuZnVuY3Rpb24gdHJ1bmNhdGUocywgbikge1xuICBpZiAodHlwZW9mIHMgPT09ICdzdHJpbmcnKSB7XG4gICAgcmV0dXJuIHMubGVuZ3RoIDwgbiA/IHMgOiBzLnNsaWNlKDAsIG4pO1xuICB9IGVsc2Uge1xuICAgIHJldHVybiBzO1xuICB9XG59XG5mdW5jdGlvbiBpbnNwZWN0KHNvbWV0aGluZykge1xuICBpZiAoZnVuY3Rpb25zSGF2ZU5hbWVzIHx8ICF1dGlsLmlzRnVuY3Rpb24oc29tZXRoaW5nKSkge1xuICAgIHJldHVybiB1dGlsLmluc3BlY3Qoc29tZXRoaW5nKTtcbiAgfVxuICB2YXIgcmF3bmFtZSA9IGdldE5hbWUoc29tZXRoaW5nKTtcbiAgdmFyIG5hbWUgPSByYXduYW1lID8gJzogJyArIHJhd25hbWUgOiAnJztcbiAgcmV0dXJuICdbRnVuY3Rpb24nICsgIG5hbWUgKyAnXSc7XG59XG5mdW5jdGlvbiBnZXRNZXNzYWdlKHNlbGYpIHtcbiAgcmV0dXJuIHRydW5jYXRlKGluc3BlY3Qoc2VsZi5hY3R1YWwpLCAxMjgpICsgJyAnICtcbiAgICAgICAgIHNlbGYub3BlcmF0b3IgKyAnICcgK1xuICAgICAgICAgdHJ1bmNhdGUoaW5zcGVjdChzZWxmLmV4cGVjdGVkKSwgMTI4KTtcbn1cblxuLy8gQXQgcHJlc2VudCBvbmx5IHRoZSB0aHJlZSBrZXlzIG1lbnRpb25lZCBhYm92ZSBhcmUgdXNlZCBhbmRcbi8vIHVuZGVyc3Rvb2QgYnkgdGhlIHNwZWMuIEltcGxlbWVudGF0aW9ucyBvciBzdWIgbW9kdWxlcyBjYW4gcGFzc1xuLy8gb3RoZXIga2V5cyB0byB0aGUgQXNzZXJ0aW9uRXJyb3IncyBjb25zdHJ1Y3RvciAtIHRoZXkgd2lsbCBiZVxuLy8gaWdub3JlZC5cblxuLy8gMy4gQWxsIG9mIHRoZSBmb2xsb3dpbmcgZnVuY3Rpb25zIG11c3QgdGhyb3cgYW4gQXNzZXJ0aW9uRXJyb3Jcbi8vIHdoZW4gYSBjb3JyZXNwb25kaW5nIGNvbmRpdGlvbiBpcyBub3QgbWV0LCB3aXRoIGEgbWVzc2FnZSB0aGF0XG4vLyBtYXkgYmUgdW5kZWZpbmVkIGlmIG5vdCBwcm92aWRlZC4gIEFsbCBhc3NlcnRpb24gbWV0aG9kcyBwcm92aWRlXG4vLyBib3RoIHRoZSBhY3R1YWwgYW5kIGV4cGVjdGVkIHZhbHVlcyB0byB0aGUgYXNzZXJ0aW9uIGVycm9yIGZvclxuLy8gZGlzcGxheSBwdXJwb3Nlcy5cblxuZnVuY3Rpb24gZmFpbChhY3R1YWwsIGV4cGVjdGVkLCBtZXNzYWdlLCBvcGVyYXRvciwgc3RhY2tTdGFydEZ1bmN0aW9uKSB7XG4gIHRocm93IG5ldyBhc3NlcnQuQXNzZXJ0aW9uRXJyb3Ioe1xuICAgIG1lc3NhZ2U6IG1lc3NhZ2UsXG4gICAgYWN0dWFsOiBhY3R1YWwsXG4gICAgZXhwZWN0ZWQ6IGV4cGVjdGVkLFxuICAgIG9wZXJhdG9yOiBvcGVyYXRvcixcbiAgICBzdGFja1N0YXJ0RnVuY3Rpb246IHN0YWNrU3RhcnRGdW5jdGlvblxuICB9KTtcbn1cblxuLy8gRVhURU5TSU9OISBhbGxvd3MgZm9yIHdlbGwgYmVoYXZlZCBlcnJvcnMgZGVmaW5lZCBlbHNld2hlcmUuXG5hc3NlcnQuZmFpbCA9IGZhaWw7XG5cbi8vIDQuIFB1cmUgYXNzZXJ0aW9uIHRlc3RzIHdoZXRoZXIgYSB2YWx1ZSBpcyB0cnV0aHksIGFzIGRldGVybWluZWRcbi8vIGJ5ICEhZ3VhcmQuXG4vLyBhc3NlcnQub2soZ3VhcmQsIG1lc3NhZ2Vfb3B0KTtcbi8vIFRoaXMgc3RhdGVtZW50IGlzIGVxdWl2YWxlbnQgdG8gYXNzZXJ0LmVxdWFsKHRydWUsICEhZ3VhcmQsXG4vLyBtZXNzYWdlX29wdCk7LiBUbyB0ZXN0IHN0cmljdGx5IGZvciB0aGUgdmFsdWUgdHJ1ZSwgdXNlXG4vLyBhc3NlcnQuc3RyaWN0RXF1YWwodHJ1ZSwgZ3VhcmQsIG1lc3NhZ2Vfb3B0KTsuXG5cbmZ1bmN0aW9uIG9rKHZhbHVlLCBtZXNzYWdlKSB7XG4gIGlmICghdmFsdWUpIGZhaWwodmFsdWUsIHRydWUsIG1lc3NhZ2UsICc9PScsIGFzc2VydC5vayk7XG59XG5hc3NlcnQub2sgPSBvaztcblxuLy8gNS4gVGhlIGVxdWFsaXR5IGFzc2VydGlvbiB0ZXN0cyBzaGFsbG93LCBjb2VyY2l2ZSBlcXVhbGl0eSB3aXRoXG4vLyA9PS5cbi8vIGFzc2VydC5lcXVhbChhY3R1YWwsIGV4cGVjdGVkLCBtZXNzYWdlX29wdCk7XG5cbmFzc2VydC5lcXVhbCA9IGZ1bmN0aW9uIGVxdWFsKGFjdHVhbCwgZXhwZWN0ZWQsIG1lc3NhZ2UpIHtcbiAgaWYgKGFjdHVhbCAhPSBleHBlY3RlZCkgZmFpbChhY3R1YWwsIGV4cGVjdGVkLCBtZXNzYWdlLCAnPT0nLCBhc3NlcnQuZXF1YWwpO1xufTtcblxuLy8gNi4gVGhlIG5vbi1lcXVhbGl0eSBhc3NlcnRpb24gdGVzdHMgZm9yIHdoZXRoZXIgdHdvIG9iamVjdHMgYXJlIG5vdCBlcXVhbFxuLy8gd2l0aCAhPSBhc3NlcnQubm90RXF1YWwoYWN0dWFsLCBleHBlY3RlZCwgbWVzc2FnZV9vcHQpO1xuXG5hc3NlcnQubm90RXF1YWwgPSBmdW5jdGlvbiBub3RFcXVhbChhY3R1YWwsIGV4cGVjdGVkLCBtZXNzYWdlKSB7XG4gIGlmIChhY3R1YWwgPT0gZXhwZWN0ZWQpIHtcbiAgICBmYWlsKGFjdHVhbCwgZXhwZWN0ZWQsIG1lc3NhZ2UsICchPScsIGFzc2VydC5ub3RFcXVhbCk7XG4gIH1cbn07XG5cbi8vIDcuIFRoZSBlcXVpdmFsZW5jZSBhc3NlcnRpb24gdGVzdHMgYSBkZWVwIGVxdWFsaXR5IHJlbGF0aW9uLlxuLy8gYXNzZXJ0LmRlZXBFcXVhbChhY3R1YWwsIGV4cGVjdGVkLCBtZXNzYWdlX29wdCk7XG5cbmFzc2VydC5kZWVwRXF1YWwgPSBmdW5jdGlvbiBkZWVwRXF1YWwoYWN0dWFsLCBleHBlY3RlZCwgbWVzc2FnZSkge1xuICBpZiAoIV9kZWVwRXF1YWwoYWN0dWFsLCBleHBlY3RlZCwgZmFsc2UpKSB7XG4gICAgZmFpbChhY3R1YWwsIGV4cGVjdGVkLCBtZXNzYWdlLCAnZGVlcEVxdWFsJywgYXNzZXJ0LmRlZXBFcXVhbCk7XG4gIH1cbn07XG5cbmFzc2VydC5kZWVwU3RyaWN0RXF1YWwgPSBmdW5jdGlvbiBkZWVwU3RyaWN0RXF1YWwoYWN0dWFsLCBleHBlY3RlZCwgbWVzc2FnZSkge1xuICBpZiAoIV9kZWVwRXF1YWwoYWN0dWFsLCBleHBlY3RlZCwgdHJ1ZSkpIHtcbiAgICBmYWlsKGFjdHVhbCwgZXhwZWN0ZWQsIG1lc3NhZ2UsICdkZWVwU3RyaWN0RXF1YWwnLCBhc3NlcnQuZGVlcFN0cmljdEVxdWFsKTtcbiAgfVxufTtcblxuZnVuY3Rpb24gX2RlZXBFcXVhbChhY3R1YWwsIGV4cGVjdGVkLCBzdHJpY3QsIG1lbW9zKSB7XG4gIC8vIDcuMS4gQWxsIGlkZW50aWNhbCB2YWx1ZXMgYXJlIGVxdWl2YWxlbnQsIGFzIGRldGVybWluZWQgYnkgPT09LlxuICBpZiAoYWN0dWFsID09PSBleHBlY3RlZCkge1xuICAgIHJldHVybiB0cnVlO1xuICB9IGVsc2UgaWYgKGlzQnVmZmVyKGFjdHVhbCkgJiYgaXNCdWZmZXIoZXhwZWN0ZWQpKSB7XG4gICAgcmV0dXJuIGNvbXBhcmUoYWN0dWFsLCBleHBlY3RlZCkgPT09IDA7XG5cbiAgLy8gNy4yLiBJZiB0aGUgZXhwZWN0ZWQgdmFsdWUgaXMgYSBEYXRlIG9iamVjdCwgdGhlIGFjdHVhbCB2YWx1ZSBpc1xuICAvLyBlcXVpdmFsZW50IGlmIGl0IGlzIGFsc28gYSBEYXRlIG9iamVjdCB0aGF0IHJlZmVycyB0byB0aGUgc2FtZSB0aW1lLlxuICB9IGVsc2UgaWYgKHV0aWwuaXNEYXRlKGFjdHVhbCkgJiYgdXRpbC5pc0RhdGUoZXhwZWN0ZWQpKSB7XG4gICAgcmV0dXJuIGFjdHVhbC5nZXRUaW1lKCkgPT09IGV4cGVjdGVkLmdldFRpbWUoKTtcblxuICAvLyA3LjMgSWYgdGhlIGV4cGVjdGVkIHZhbHVlIGlzIGEgUmVnRXhwIG9iamVjdCwgdGhlIGFjdHVhbCB2YWx1ZSBpc1xuICAvLyBlcXVpdmFsZW50IGlmIGl0IGlzIGFsc28gYSBSZWdFeHAgb2JqZWN0IHdpdGggdGhlIHNhbWUgc291cmNlIGFuZFxuICAvLyBwcm9wZXJ0aWVzIChgZ2xvYmFsYCwgYG11bHRpbGluZWAsIGBsYXN0SW5kZXhgLCBgaWdub3JlQ2FzZWApLlxuICB9IGVsc2UgaWYgKHV0aWwuaXNSZWdFeHAoYWN0dWFsKSAmJiB1dGlsLmlzUmVnRXhwKGV4cGVjdGVkKSkge1xuICAgIHJldHVybiBhY3R1YWwuc291cmNlID09PSBleHBlY3RlZC5zb3VyY2UgJiZcbiAgICAgICAgICAgYWN0dWFsLmdsb2JhbCA9PT0gZXhwZWN0ZWQuZ2xvYmFsICYmXG4gICAgICAgICAgIGFjdHVhbC5tdWx0aWxpbmUgPT09IGV4cGVjdGVkLm11bHRpbGluZSAmJlxuICAgICAgICAgICBhY3R1YWwubGFzdEluZGV4ID09PSBleHBlY3RlZC5sYXN0SW5kZXggJiZcbiAgICAgICAgICAgYWN0dWFsLmlnbm9yZUNhc2UgPT09IGV4cGVjdGVkLmlnbm9yZUNhc2U7XG5cbiAgLy8gNy40LiBPdGhlciBwYWlycyB0aGF0IGRvIG5vdCBib3RoIHBhc3MgdHlwZW9mIHZhbHVlID09ICdvYmplY3QnLFxuICAvLyBlcXVpdmFsZW5jZSBpcyBkZXRlcm1pbmVkIGJ5ID09LlxuICB9IGVsc2UgaWYgKChhY3R1YWwgPT09IG51bGwgfHwgdHlwZW9mIGFjdHVhbCAhPT0gJ29iamVjdCcpICYmXG4gICAgICAgICAgICAgKGV4cGVjdGVkID09PSBudWxsIHx8IHR5cGVvZiBleHBlY3RlZCAhPT0gJ29iamVjdCcpKSB7XG4gICAgcmV0dXJuIHN0cmljdCA/IGFjdHVhbCA9PT0gZXhwZWN0ZWQgOiBhY3R1YWwgPT0gZXhwZWN0ZWQ7XG5cbiAgLy8gSWYgYm90aCB2YWx1ZXMgYXJlIGluc3RhbmNlcyBvZiB0eXBlZCBhcnJheXMsIHdyYXAgdGhlaXIgdW5kZXJseWluZ1xuICAvLyBBcnJheUJ1ZmZlcnMgaW4gYSBCdWZmZXIgZWFjaCB0byBpbmNyZWFzZSBwZXJmb3JtYW5jZVxuICAvLyBUaGlzIG9wdGltaXphdGlvbiByZXF1aXJlcyB0aGUgYXJyYXlzIHRvIGhhdmUgdGhlIHNhbWUgdHlwZSBhcyBjaGVja2VkIGJ5XG4gIC8vIE9iamVjdC5wcm90b3R5cGUudG9TdHJpbmcgKGFrYSBwVG9TdHJpbmcpLiBOZXZlciBwZXJmb3JtIGJpbmFyeVxuICAvLyBjb21wYXJpc29ucyBmb3IgRmxvYXQqQXJyYXlzLCB0aG91Z2gsIHNpbmNlIGUuZy4gKzAgPT09IC0wIGJ1dCB0aGVpclxuICAvLyBiaXQgcGF0dGVybnMgYXJlIG5vdCBpZGVudGljYWwuXG4gIH0gZWxzZSBpZiAoaXNWaWV3KGFjdHVhbCkgJiYgaXNWaWV3KGV4cGVjdGVkKSAmJlxuICAgICAgICAgICAgIHBUb1N0cmluZyhhY3R1YWwpID09PSBwVG9TdHJpbmcoZXhwZWN0ZWQpICYmXG4gICAgICAgICAgICAgIShhY3R1YWwgaW5zdGFuY2VvZiBGbG9hdDMyQXJyYXkgfHxcbiAgICAgICAgICAgICAgIGFjdHVhbCBpbnN0YW5jZW9mIEZsb2F0NjRBcnJheSkpIHtcbiAgICByZXR1cm4gY29tcGFyZShuZXcgVWludDhBcnJheShhY3R1YWwuYnVmZmVyKSxcbiAgICAgICAgICAgICAgICAgICBuZXcgVWludDhBcnJheShleHBlY3RlZC5idWZmZXIpKSA9PT0gMDtcblxuICAvLyA3LjUgRm9yIGFsbCBvdGhlciBPYmplY3QgcGFpcnMsIGluY2x1ZGluZyBBcnJheSBvYmplY3RzLCBlcXVpdmFsZW5jZSBpc1xuICAvLyBkZXRlcm1pbmVkIGJ5IGhhdmluZyB0aGUgc2FtZSBudW1iZXIgb2Ygb3duZWQgcHJvcGVydGllcyAoYXMgdmVyaWZpZWRcbiAgLy8gd2l0aCBPYmplY3QucHJvdG90eXBlLmhhc093blByb3BlcnR5LmNhbGwpLCB0aGUgc2FtZSBzZXQgb2Yga2V5c1xuICAvLyAoYWx0aG91Z2ggbm90IG5lY2Vzc2FyaWx5IHRoZSBzYW1lIG9yZGVyKSwgZXF1aXZhbGVudCB2YWx1ZXMgZm9yIGV2ZXJ5XG4gIC8vIGNvcnJlc3BvbmRpbmcga2V5LCBhbmQgYW4gaWRlbnRpY2FsICdwcm90b3R5cGUnIHByb3BlcnR5LiBOb3RlOiB0aGlzXG4gIC8vIGFjY291bnRzIGZvciBib3RoIG5hbWVkIGFuZCBpbmRleGVkIHByb3BlcnRpZXMgb24gQXJyYXlzLlxuICB9IGVsc2UgaWYgKGlzQnVmZmVyKGFjdHVhbCkgIT09IGlzQnVmZmVyKGV4cGVjdGVkKSkge1xuICAgIHJldHVybiBmYWxzZTtcbiAgfSBlbHNlIHtcbiAgICBtZW1vcyA9IG1lbW9zIHx8IHthY3R1YWw6IFtdLCBleHBlY3RlZDogW119O1xuXG4gICAgdmFyIGFjdHVhbEluZGV4ID0gbWVtb3MuYWN0dWFsLmluZGV4T2YoYWN0dWFsKTtcbiAgICBpZiAoYWN0dWFsSW5kZXggIT09IC0xKSB7XG4gICAgICBpZiAoYWN0dWFsSW5kZXggPT09IG1lbW9zLmV4cGVjdGVkLmluZGV4T2YoZXhwZWN0ZWQpKSB7XG4gICAgICAgIHJldHVybiB0cnVlO1xuICAgICAgfVxuICAgIH1cblxuICAgIG1lbW9zLmFjdHVhbC5wdXNoKGFjdHVhbCk7XG4gICAgbWVtb3MuZXhwZWN0ZWQucHVzaChleHBlY3RlZCk7XG5cbiAgICByZXR1cm4gb2JqRXF1aXYoYWN0dWFsLCBleHBlY3RlZCwgc3RyaWN0LCBtZW1vcyk7XG4gIH1cbn1cblxuZnVuY3Rpb24gaXNBcmd1bWVudHMob2JqZWN0KSB7XG4gIHJldHVybiBPYmplY3QucHJvdG90eXBlLnRvU3RyaW5nLmNhbGwob2JqZWN0KSA9PSAnW29iamVjdCBBcmd1bWVudHNdJztcbn1cblxuZnVuY3Rpb24gb2JqRXF1aXYoYSwgYiwgc3RyaWN0LCBhY3R1YWxWaXNpdGVkT2JqZWN0cykge1xuICBpZiAoYSA9PT0gbnVsbCB8fCBhID09PSB1bmRlZmluZWQgfHwgYiA9PT0gbnVsbCB8fCBiID09PSB1bmRlZmluZWQpXG4gICAgcmV0dXJuIGZhbHNlO1xuICAvLyBpZiBvbmUgaXMgYSBwcmltaXRpdmUsIHRoZSBvdGhlciBtdXN0IGJlIHNhbWVcbiAgaWYgKHV0aWwuaXNQcmltaXRpdmUoYSkgfHwgdXRpbC5pc1ByaW1pdGl2ZShiKSlcbiAgICByZXR1cm4gYSA9PT0gYjtcbiAgaWYgKHN0cmljdCAmJiBPYmplY3QuZ2V0UHJvdG90eXBlT2YoYSkgIT09IE9iamVjdC5nZXRQcm90b3R5cGVPZihiKSlcbiAgICByZXR1cm4gZmFsc2U7XG4gIHZhciBhSXNBcmdzID0gaXNBcmd1bWVudHMoYSk7XG4gIHZhciBiSXNBcmdzID0gaXNBcmd1bWVudHMoYik7XG4gIGlmICgoYUlzQXJncyAmJiAhYklzQXJncykgfHwgKCFhSXNBcmdzICYmIGJJc0FyZ3MpKVxuICAgIHJldHVybiBmYWxzZTtcbiAgaWYgKGFJc0FyZ3MpIHtcbiAgICBhID0gcFNsaWNlLmNhbGwoYSk7XG4gICAgYiA9IHBTbGljZS5jYWxsKGIpO1xuICAgIHJldHVybiBfZGVlcEVxdWFsKGEsIGIsIHN0cmljdCk7XG4gIH1cbiAgdmFyIGthID0gb2JqZWN0S2V5cyhhKTtcbiAgdmFyIGtiID0gb2JqZWN0S2V5cyhiKTtcbiAgdmFyIGtleSwgaTtcbiAgLy8gaGF2aW5nIHRoZSBzYW1lIG51bWJlciBvZiBvd25lZCBwcm9wZXJ0aWVzIChrZXlzIGluY29ycG9yYXRlc1xuICAvLyBoYXNPd25Qcm9wZXJ0eSlcbiAgaWYgKGthLmxlbmd0aCAhPT0ga2IubGVuZ3RoKVxuICAgIHJldHVybiBmYWxzZTtcbiAgLy90aGUgc2FtZSBzZXQgb2Yga2V5cyAoYWx0aG91Z2ggbm90IG5lY2Vzc2FyaWx5IHRoZSBzYW1lIG9yZGVyKSxcbiAga2Euc29ydCgpO1xuICBrYi5zb3J0KCk7XG4gIC8vfn5+Y2hlYXAga2V5IHRlc3RcbiAgZm9yIChpID0ga2EubGVuZ3RoIC0gMTsgaSA+PSAwOyBpLS0pIHtcbiAgICBpZiAoa2FbaV0gIT09IGtiW2ldKVxuICAgICAgcmV0dXJuIGZhbHNlO1xuICB9XG4gIC8vZXF1aXZhbGVudCB2YWx1ZXMgZm9yIGV2ZXJ5IGNvcnJlc3BvbmRpbmcga2V5LCBhbmRcbiAgLy9+fn5wb3NzaWJseSBleHBlbnNpdmUgZGVlcCB0ZXN0XG4gIGZvciAoaSA9IGthLmxlbmd0aCAtIDE7IGkgPj0gMDsgaS0tKSB7XG4gICAga2V5ID0ga2FbaV07XG4gICAgaWYgKCFfZGVlcEVxdWFsKGFba2V5XSwgYltrZXldLCBzdHJpY3QsIGFjdHVhbFZpc2l0ZWRPYmplY3RzKSlcbiAgICAgIHJldHVybiBmYWxzZTtcbiAgfVxuICByZXR1cm4gdHJ1ZTtcbn1cblxuLy8gOC4gVGhlIG5vbi1lcXVpdmFsZW5jZSBhc3NlcnRpb24gdGVzdHMgZm9yIGFueSBkZWVwIGluZXF1YWxpdHkuXG4vLyBhc3NlcnQubm90RGVlcEVxdWFsKGFjdHVhbCwgZXhwZWN0ZWQsIG1lc3NhZ2Vfb3B0KTtcblxuYXNzZXJ0Lm5vdERlZXBFcXVhbCA9IGZ1bmN0aW9uIG5vdERlZXBFcXVhbChhY3R1YWwsIGV4cGVjdGVkLCBtZXNzYWdlKSB7XG4gIGlmIChfZGVlcEVxdWFsKGFjdHVhbCwgZXhwZWN0ZWQsIGZhbHNlKSkge1xuICAgIGZhaWwoYWN0dWFsLCBleHBlY3RlZCwgbWVzc2FnZSwgJ25vdERlZXBFcXVhbCcsIGFzc2VydC5ub3REZWVwRXF1YWwpO1xuICB9XG59O1xuXG5hc3NlcnQubm90RGVlcFN0cmljdEVxdWFsID0gbm90RGVlcFN0cmljdEVxdWFsO1xuZnVuY3Rpb24gbm90RGVlcFN0cmljdEVxdWFsKGFjdHVhbCwgZXhwZWN0ZWQsIG1lc3NhZ2UpIHtcbiAgaWYgKF9kZWVwRXF1YWwoYWN0dWFsLCBleHBlY3RlZCwgdHJ1ZSkpIHtcbiAgICBmYWlsKGFjdHVhbCwgZXhwZWN0ZWQsIG1lc3NhZ2UsICdub3REZWVwU3RyaWN0RXF1YWwnLCBub3REZWVwU3RyaWN0RXF1YWwpO1xuICB9XG59XG5cblxuLy8gOS4gVGhlIHN0cmljdCBlcXVhbGl0eSBhc3NlcnRpb24gdGVzdHMgc3RyaWN0IGVxdWFsaXR5LCBhcyBkZXRlcm1pbmVkIGJ5ID09PS5cbi8vIGFzc2VydC5zdHJpY3RFcXVhbChhY3R1YWwsIGV4cGVjdGVkLCBtZXNzYWdlX29wdCk7XG5cbmFzc2VydC5zdHJpY3RFcXVhbCA9IGZ1bmN0aW9uIHN0cmljdEVxdWFsKGFjdHVhbCwgZXhwZWN0ZWQsIG1lc3NhZ2UpIHtcbiAgaWYgKGFjdHVhbCAhPT0gZXhwZWN0ZWQpIHtcbiAgICBmYWlsKGFjdHVhbCwgZXhwZWN0ZWQsIG1lc3NhZ2UsICc9PT0nLCBhc3NlcnQuc3RyaWN0RXF1YWwpO1xuICB9XG59O1xuXG4vLyAxMC4gVGhlIHN0cmljdCBub24tZXF1YWxpdHkgYXNzZXJ0aW9uIHRlc3RzIGZvciBzdHJpY3QgaW5lcXVhbGl0eSwgYXNcbi8vIGRldGVybWluZWQgYnkgIT09LiAgYXNzZXJ0Lm5vdFN0cmljdEVxdWFsKGFjdHVhbCwgZXhwZWN0ZWQsIG1lc3NhZ2Vfb3B0KTtcblxuYXNzZXJ0Lm5vdFN0cmljdEVxdWFsID0gZnVuY3Rpb24gbm90U3RyaWN0RXF1YWwoYWN0dWFsLCBleHBlY3RlZCwgbWVzc2FnZSkge1xuICBpZiAoYWN0dWFsID09PSBleHBlY3RlZCkge1xuICAgIGZhaWwoYWN0dWFsLCBleHBlY3RlZCwgbWVzc2FnZSwgJyE9PScsIGFzc2VydC5ub3RTdHJpY3RFcXVhbCk7XG4gIH1cbn07XG5cbmZ1bmN0aW9uIGV4cGVjdGVkRXhjZXB0aW9uKGFjdHVhbCwgZXhwZWN0ZWQpIHtcbiAgaWYgKCFhY3R1YWwgfHwgIWV4cGVjdGVkKSB7XG4gICAgcmV0dXJuIGZhbHNlO1xuICB9XG5cbiAgaWYgKE9iamVjdC5wcm90b3R5cGUudG9TdHJpbmcuY2FsbChleHBlY3RlZCkgPT0gJ1tvYmplY3QgUmVnRXhwXScpIHtcbiAgICByZXR1cm4gZXhwZWN0ZWQudGVzdChhY3R1YWwpO1xuICB9XG5cbiAgdHJ5IHtcbiAgICBpZiAoYWN0dWFsIGluc3RhbmNlb2YgZXhwZWN0ZWQpIHtcbiAgICAgIHJldHVybiB0cnVlO1xuICAgIH1cbiAgfSBjYXRjaCAoZSkge1xuICAgIC8vIElnbm9yZS4gIFRoZSBpbnN0YW5jZW9mIGNoZWNrIGRvZXNuJ3Qgd29yayBmb3IgYXJyb3cgZnVuY3Rpb25zLlxuICB9XG5cbiAgaWYgKEVycm9yLmlzUHJvdG90eXBlT2YoZXhwZWN0ZWQpKSB7XG4gICAgcmV0dXJuIGZhbHNlO1xuICB9XG5cbiAgcmV0dXJuIGV4cGVjdGVkLmNhbGwoe30sIGFjdHVhbCkgPT09IHRydWU7XG59XG5cbmZ1bmN0aW9uIF90cnlCbG9jayhibG9jaykge1xuICB2YXIgZXJyb3I7XG4gIHRyeSB7XG4gICAgYmxvY2soKTtcbiAgfSBjYXRjaCAoZSkge1xuICAgIGVycm9yID0gZTtcbiAgfVxuICByZXR1cm4gZXJyb3I7XG59XG5cbmZ1bmN0aW9uIF90aHJvd3Moc2hvdWxkVGhyb3csIGJsb2NrLCBleHBlY3RlZCwgbWVzc2FnZSkge1xuICB2YXIgYWN0dWFsO1xuXG4gIGlmICh0eXBlb2YgYmxvY2sgIT09ICdmdW5jdGlvbicpIHtcbiAgICB0aHJvdyBuZXcgVHlwZUVycm9yKCdcImJsb2NrXCIgYXJndW1lbnQgbXVzdCBiZSBhIGZ1bmN0aW9uJyk7XG4gIH1cblxuICBpZiAodHlwZW9mIGV4cGVjdGVkID09PSAnc3RyaW5nJykge1xuICAgIG1lc3NhZ2UgPSBleHBlY3RlZDtcbiAgICBleHBlY3RlZCA9IG51bGw7XG4gIH1cblxuICBhY3R1YWwgPSBfdHJ5QmxvY2soYmxvY2spO1xuXG4gIG1lc3NhZ2UgPSAoZXhwZWN0ZWQgJiYgZXhwZWN0ZWQubmFtZSA/ICcgKCcgKyBleHBlY3RlZC5uYW1lICsgJykuJyA6ICcuJykgK1xuICAgICAgICAgICAgKG1lc3NhZ2UgPyAnICcgKyBtZXNzYWdlIDogJy4nKTtcblxuICBpZiAoc2hvdWxkVGhyb3cgJiYgIWFjdHVhbCkge1xuICAgIGZhaWwoYWN0dWFsLCBleHBlY3RlZCwgJ01pc3NpbmcgZXhwZWN0ZWQgZXhjZXB0aW9uJyArIG1lc3NhZ2UpO1xuICB9XG5cbiAgdmFyIHVzZXJQcm92aWRlZE1lc3NhZ2UgPSB0eXBlb2YgbWVzc2FnZSA9PT0gJ3N0cmluZyc7XG4gIHZhciBpc1Vud2FudGVkRXhjZXB0aW9uID0gIXNob3VsZFRocm93ICYmIHV0aWwuaXNFcnJvcihhY3R1YWwpO1xuICB2YXIgaXNVbmV4cGVjdGVkRXhjZXB0aW9uID0gIXNob3VsZFRocm93ICYmIGFjdHVhbCAmJiAhZXhwZWN0ZWQ7XG5cbiAgaWYgKChpc1Vud2FudGVkRXhjZXB0aW9uICYmXG4gICAgICB1c2VyUHJvdmlkZWRNZXNzYWdlICYmXG4gICAgICBleHBlY3RlZEV4Y2VwdGlvbihhY3R1YWwsIGV4cGVjdGVkKSkgfHxcbiAgICAgIGlzVW5leHBlY3RlZEV4Y2VwdGlvbikge1xuICAgIGZhaWwoYWN0dWFsLCBleHBlY3RlZCwgJ0dvdCB1bndhbnRlZCBleGNlcHRpb24nICsgbWVzc2FnZSk7XG4gIH1cblxuICBpZiAoKHNob3VsZFRocm93ICYmIGFjdHVhbCAmJiBleHBlY3RlZCAmJlxuICAgICAgIWV4cGVjdGVkRXhjZXB0aW9uKGFjdHVhbCwgZXhwZWN0ZWQpKSB8fCAoIXNob3VsZFRocm93ICYmIGFjdHVhbCkpIHtcbiAgICB0aHJvdyBhY3R1YWw7XG4gIH1cbn1cblxuLy8gMTEuIEV4cGVjdGVkIHRvIHRocm93IGFuIGVycm9yOlxuLy8gYXNzZXJ0LnRocm93cyhibG9jaywgRXJyb3Jfb3B0LCBtZXNzYWdlX29wdCk7XG5cbmFzc2VydC50aHJvd3MgPSBmdW5jdGlvbihibG9jaywgLypvcHRpb25hbCovZXJyb3IsIC8qb3B0aW9uYWwqL21lc3NhZ2UpIHtcbiAgX3Rocm93cyh0cnVlLCBibG9jaywgZXJyb3IsIG1lc3NhZ2UpO1xufTtcblxuLy8gRVhURU5TSU9OISBUaGlzIGlzIGFubm95aW5nIHRvIHdyaXRlIG91dHNpZGUgdGhpcyBtb2R1bGUuXG5hc3NlcnQuZG9lc05vdFRocm93ID0gZnVuY3Rpb24oYmxvY2ssIC8qb3B0aW9uYWwqL2Vycm9yLCAvKm9wdGlvbmFsKi9tZXNzYWdlKSB7XG4gIF90aHJvd3MoZmFsc2UsIGJsb2NrLCBlcnJvciwgbWVzc2FnZSk7XG59O1xuXG5hc3NlcnQuaWZFcnJvciA9IGZ1bmN0aW9uKGVycikgeyBpZiAoZXJyKSB0aHJvdyBlcnI7IH07XG5cbnZhciBvYmplY3RLZXlzID0gT2JqZWN0LmtleXMgfHwgZnVuY3Rpb24gKG9iaikge1xuICB2YXIga2V5cyA9IFtdO1xuICBmb3IgKHZhciBrZXkgaW4gb2JqKSB7XG4gICAgaWYgKGhhc093bi5jYWxsKG9iaiwga2V5KSkga2V5cy5wdXNoKGtleSk7XG4gIH1cbiAgcmV0dXJuIGtleXM7XG59O1xuIiwiLy8gc2hpbSBmb3IgdXNpbmcgcHJvY2VzcyBpbiBicm93c2VyXG52YXIgcHJvY2VzcyA9IG1vZHVsZS5leHBvcnRzID0ge307XG5cbi8vIGNhY2hlZCBmcm9tIHdoYXRldmVyIGdsb2JhbCBpcyBwcmVzZW50IHNvIHRoYXQgdGVzdCBydW5uZXJzIHRoYXQgc3R1YiBpdFxuLy8gZG9uJ3QgYnJlYWsgdGhpbmdzLiAgQnV0IHdlIG5lZWQgdG8gd3JhcCBpdCBpbiBhIHRyeSBjYXRjaCBpbiBjYXNlIGl0IGlzXG4vLyB3cmFwcGVkIGluIHN0cmljdCBtb2RlIGNvZGUgd2hpY2ggZG9lc24ndCBkZWZpbmUgYW55IGdsb2JhbHMuICBJdCdzIGluc2lkZSBhXG4vLyBmdW5jdGlvbiBiZWNhdXNlIHRyeS9jYXRjaGVzIGRlb3B0aW1pemUgaW4gY2VydGFpbiBlbmdpbmVzLlxuXG52YXIgY2FjaGVkU2V0VGltZW91dDtcbnZhciBjYWNoZWRDbGVhclRpbWVvdXQ7XG5cbmZ1bmN0aW9uIGRlZmF1bHRTZXRUaW1vdXQoKSB7XG4gICAgdGhyb3cgbmV3IEVycm9yKCdzZXRUaW1lb3V0IGhhcyBub3QgYmVlbiBkZWZpbmVkJyk7XG59XG5mdW5jdGlvbiBkZWZhdWx0Q2xlYXJUaW1lb3V0ICgpIHtcbiAgICB0aHJvdyBuZXcgRXJyb3IoJ2NsZWFyVGltZW91dCBoYXMgbm90IGJlZW4gZGVmaW5lZCcpO1xufVxuKGZ1bmN0aW9uICgpIHtcbiAgICB0cnkge1xuICAgICAgICBpZiAodHlwZW9mIHNldFRpbWVvdXQgPT09ICdmdW5jdGlvbicpIHtcbiAgICAgICAgICAgIGNhY2hlZFNldFRpbWVvdXQgPSBzZXRUaW1lb3V0O1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgY2FjaGVkU2V0VGltZW91dCA9IGRlZmF1bHRTZXRUaW1vdXQ7XG4gICAgICAgIH1cbiAgICB9IGNhdGNoIChlKSB7XG4gICAgICAgIGNhY2hlZFNldFRpbWVvdXQgPSBkZWZhdWx0U2V0VGltb3V0O1xuICAgIH1cbiAgICB0cnkge1xuICAgICAgICBpZiAodHlwZW9mIGNsZWFyVGltZW91dCA9PT0gJ2Z1bmN0aW9uJykge1xuICAgICAgICAgICAgY2FjaGVkQ2xlYXJUaW1lb3V0ID0gY2xlYXJUaW1lb3V0O1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgY2FjaGVkQ2xlYXJUaW1lb3V0ID0gZGVmYXVsdENsZWFyVGltZW91dDtcbiAgICAgICAgfVxuICAgIH0gY2F0Y2ggKGUpIHtcbiAgICAgICAgY2FjaGVkQ2xlYXJUaW1lb3V0ID0gZGVmYXVsdENsZWFyVGltZW91dDtcbiAgICB9XG59ICgpKVxuZnVuY3Rpb24gcnVuVGltZW91dChmdW4pIHtcbiAgICBpZiAoY2FjaGVkU2V0VGltZW91dCA9PT0gc2V0VGltZW91dCkge1xuICAgICAgICAvL25vcm1hbCBlbnZpcm9tZW50cyBpbiBzYW5lIHNpdHVhdGlvbnNcbiAgICAgICAgcmV0dXJuIHNldFRpbWVvdXQoZnVuLCAwKTtcbiAgICB9XG4gICAgLy8gaWYgc2V0VGltZW91dCB3YXNuJ3QgYXZhaWxhYmxlIGJ1dCB3YXMgbGF0dGVyIGRlZmluZWRcbiAgICBpZiAoKGNhY2hlZFNldFRpbWVvdXQgPT09IGRlZmF1bHRTZXRUaW1vdXQgfHwgIWNhY2hlZFNldFRpbWVvdXQpICYmIHNldFRpbWVvdXQpIHtcbiAgICAgICAgY2FjaGVkU2V0VGltZW91dCA9IHNldFRpbWVvdXQ7XG4gICAgICAgIHJldHVybiBzZXRUaW1lb3V0KGZ1biwgMCk7XG4gICAgfVxuICAgIHRyeSB7XG4gICAgICAgIC8vIHdoZW4gd2hlbiBzb21lYm9keSBoYXMgc2NyZXdlZCB3aXRoIHNldFRpbWVvdXQgYnV0IG5vIEkuRS4gbWFkZG5lc3NcbiAgICAgICAgcmV0dXJuIGNhY2hlZFNldFRpbWVvdXQoZnVuLCAwKTtcbiAgICB9IGNhdGNoKGUpe1xuICAgICAgICB0cnkge1xuICAgICAgICAgICAgLy8gV2hlbiB3ZSBhcmUgaW4gSS5FLiBidXQgdGhlIHNjcmlwdCBoYXMgYmVlbiBldmFsZWQgc28gSS5FLiBkb2Vzbid0IHRydXN0IHRoZSBnbG9iYWwgb2JqZWN0IHdoZW4gY2FsbGVkIG5vcm1hbGx5XG4gICAgICAgICAgICByZXR1cm4gY2FjaGVkU2V0VGltZW91dC5jYWxsKG51bGwsIGZ1biwgMCk7XG4gICAgICAgIH0gY2F0Y2goZSl7XG4gICAgICAgICAgICAvLyBzYW1lIGFzIGFib3ZlIGJ1dCB3aGVuIGl0J3MgYSB2ZXJzaW9uIG9mIEkuRS4gdGhhdCBtdXN0IGhhdmUgdGhlIGdsb2JhbCBvYmplY3QgZm9yICd0aGlzJywgaG9wZnVsbHkgb3VyIGNvbnRleHQgY29ycmVjdCBvdGhlcndpc2UgaXQgd2lsbCB0aHJvdyBhIGdsb2JhbCBlcnJvclxuICAgICAgICAgICAgcmV0dXJuIGNhY2hlZFNldFRpbWVvdXQuY2FsbCh0aGlzLCBmdW4sIDApO1xuICAgICAgICB9XG4gICAgfVxuXG5cbn1cbmZ1bmN0aW9uIHJ1bkNsZWFyVGltZW91dChtYXJrZXIpIHtcbiAgICBpZiAoY2FjaGVkQ2xlYXJUaW1lb3V0ID09PSBjbGVhclRpbWVvdXQpIHtcbiAgICAgICAgLy9ub3JtYWwgZW52aXJvbWVudHMgaW4gc2FuZSBzaXR1YXRpb25zXG4gICAgICAgIHJldHVybiBjbGVhclRpbWVvdXQobWFya2VyKTtcbiAgICB9XG4gICAgLy8gaWYgY2xlYXJUaW1lb3V0IHdhc24ndCBhdmFpbGFibGUgYnV0IHdhcyBsYXR0ZXIgZGVmaW5lZFxuICAgIGlmICgoY2FjaGVkQ2xlYXJUaW1lb3V0ID09PSBkZWZhdWx0Q2xlYXJUaW1lb3V0IHx8ICFjYWNoZWRDbGVhclRpbWVvdXQpICYmIGNsZWFyVGltZW91dCkge1xuICAgICAgICBjYWNoZWRDbGVhclRpbWVvdXQgPSBjbGVhclRpbWVvdXQ7XG4gICAgICAgIHJldHVybiBjbGVhclRpbWVvdXQobWFya2VyKTtcbiAgICB9XG4gICAgdHJ5IHtcbiAgICAgICAgLy8gd2hlbiB3aGVuIHNvbWVib2R5IGhhcyBzY3Jld2VkIHdpdGggc2V0VGltZW91dCBidXQgbm8gSS5FLiBtYWRkbmVzc1xuICAgICAgICByZXR1cm4gY2FjaGVkQ2xlYXJUaW1lb3V0KG1hcmtlcik7XG4gICAgfSBjYXRjaCAoZSl7XG4gICAgICAgIHRyeSB7XG4gICAgICAgICAgICAvLyBXaGVuIHdlIGFyZSBpbiBJLkUuIGJ1dCB0aGUgc2NyaXB0IGhhcyBiZWVuIGV2YWxlZCBzbyBJLkUuIGRvZXNuJ3QgIHRydXN0IHRoZSBnbG9iYWwgb2JqZWN0IHdoZW4gY2FsbGVkIG5vcm1hbGx5XG4gICAgICAgICAgICByZXR1cm4gY2FjaGVkQ2xlYXJUaW1lb3V0LmNhbGwobnVsbCwgbWFya2VyKTtcbiAgICAgICAgfSBjYXRjaCAoZSl7XG4gICAgICAgICAgICAvLyBzYW1lIGFzIGFib3ZlIGJ1dCB3aGVuIGl0J3MgYSB2ZXJzaW9uIG9mIEkuRS4gdGhhdCBtdXN0IGhhdmUgdGhlIGdsb2JhbCBvYmplY3QgZm9yICd0aGlzJywgaG9wZnVsbHkgb3VyIGNvbnRleHQgY29ycmVjdCBvdGhlcndpc2UgaXQgd2lsbCB0aHJvdyBhIGdsb2JhbCBlcnJvci5cbiAgICAgICAgICAgIC8vIFNvbWUgdmVyc2lvbnMgb2YgSS5FLiBoYXZlIGRpZmZlcmVudCBydWxlcyBmb3IgY2xlYXJUaW1lb3V0IHZzIHNldFRpbWVvdXRcbiAgICAgICAgICAgIHJldHVybiBjYWNoZWRDbGVhclRpbWVvdXQuY2FsbCh0aGlzLCBtYXJrZXIpO1xuICAgICAgICB9XG4gICAgfVxuXG5cblxufVxudmFyIHF1ZXVlID0gW107XG52YXIgZHJhaW5pbmcgPSBmYWxzZTtcbnZhciBjdXJyZW50UXVldWU7XG52YXIgcXVldWVJbmRleCA9IC0xO1xuXG5mdW5jdGlvbiBjbGVhblVwTmV4dFRpY2soKSB7XG4gICAgaWYgKCFkcmFpbmluZyB8fCAhY3VycmVudFF1ZXVlKSB7XG4gICAgICAgIHJldHVybjtcbiAgICB9XG4gICAgZHJhaW5pbmcgPSBmYWxzZTtcbiAgICBpZiAoY3VycmVudFF1ZXVlLmxlbmd0aCkge1xuICAgICAgICBxdWV1ZSA9IGN1cnJlbnRRdWV1ZS5jb25jYXQocXVldWUpO1xuICAgIH0gZWxzZSB7XG4gICAgICAgIHF1ZXVlSW5kZXggPSAtMTtcbiAgICB9XG4gICAgaWYgKHF1ZXVlLmxlbmd0aCkge1xuICAgICAgICBkcmFpblF1ZXVlKCk7XG4gICAgfVxufVxuXG5mdW5jdGlvbiBkcmFpblF1ZXVlKCkge1xuICAgIGlmIChkcmFpbmluZykge1xuICAgICAgICByZXR1cm47XG4gICAgfVxuICAgIHZhciB0aW1lb3V0ID0gcnVuVGltZW91dChjbGVhblVwTmV4dFRpY2spO1xuICAgIGRyYWluaW5nID0gdHJ1ZTtcblxuICAgIHZhciBsZW4gPSBxdWV1ZS5sZW5ndGg7XG4gICAgd2hpbGUobGVuKSB7XG4gICAgICAgIGN1cnJlbnRRdWV1ZSA9IHF1ZXVlO1xuICAgICAgICBxdWV1ZSA9IFtdO1xuICAgICAgICB3aGlsZSAoKytxdWV1ZUluZGV4IDwgbGVuKSB7XG4gICAgICAgICAgICBpZiAoY3VycmVudFF1ZXVlKSB7XG4gICAgICAgICAgICAgICAgY3VycmVudFF1ZXVlW3F1ZXVlSW5kZXhdLnJ1bigpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIHF1ZXVlSW5kZXggPSAtMTtcbiAgICAgICAgbGVuID0gcXVldWUubGVuZ3RoO1xuICAgIH1cbiAgICBjdXJyZW50UXVldWUgPSBudWxsO1xuICAgIGRyYWluaW5nID0gZmFsc2U7XG4gICAgcnVuQ2xlYXJUaW1lb3V0KHRpbWVvdXQpO1xufVxuXG5wcm9jZXNzLm5leHRUaWNrID0gZnVuY3Rpb24gKGZ1bikge1xuICAgIHZhciBhcmdzID0gbmV3IEFycmF5KGFyZ3VtZW50cy5sZW5ndGggLSAxKTtcbiAgICBpZiAoYXJndW1lbnRzLmxlbmd0aCA+IDEpIHtcbiAgICAgICAgZm9yICh2YXIgaSA9IDE7IGkgPCBhcmd1bWVudHMubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgICAgIGFyZ3NbaSAtIDFdID0gYXJndW1lbnRzW2ldO1xuICAgICAgICB9XG4gICAgfVxuICAgIHF1ZXVlLnB1c2gobmV3IEl0ZW0oZnVuLCBhcmdzKSk7XG4gICAgaWYgKHF1ZXVlLmxlbmd0aCA9PT0gMSAmJiAhZHJhaW5pbmcpIHtcbiAgICAgICAgcnVuVGltZW91dChkcmFpblF1ZXVlKTtcbiAgICB9XG59O1xuXG4vLyB2OCBsaWtlcyBwcmVkaWN0aWJsZSBvYmplY3RzXG5mdW5jdGlvbiBJdGVtKGZ1biwgYXJyYXkpIHtcbiAgICB0aGlzLmZ1biA9IGZ1bjtcbiAgICB0aGlzLmFycmF5ID0gYXJyYXk7XG59XG5JdGVtLnByb3RvdHlwZS5ydW4gPSBmdW5jdGlvbiAoKSB7XG4gICAgdGhpcy5mdW4uYXBwbHkobnVsbCwgdGhpcy5hcnJheSk7XG59O1xucHJvY2Vzcy50aXRsZSA9ICdicm93c2VyJztcbnByb2Nlc3MuYnJvd3NlciA9IHRydWU7XG5wcm9jZXNzLmVudiA9IHt9O1xucHJvY2Vzcy5hcmd2ID0gW107XG5wcm9jZXNzLnZlcnNpb24gPSAnJzsgLy8gZW1wdHkgc3RyaW5nIHRvIGF2b2lkIHJlZ2V4cCBpc3N1ZXNcbnByb2Nlc3MudmVyc2lvbnMgPSB7fTtcblxuZnVuY3Rpb24gbm9vcCgpIHt9XG5cbnByb2Nlc3Mub24gPSBub29wO1xucHJvY2Vzcy5hZGRMaXN0ZW5lciA9IG5vb3A7XG5wcm9jZXNzLm9uY2UgPSBub29wO1xucHJvY2Vzcy5vZmYgPSBub29wO1xucHJvY2Vzcy5yZW1vdmVMaXN0ZW5lciA9IG5vb3A7XG5wcm9jZXNzLnJlbW92ZUFsbExpc3RlbmVycyA9IG5vb3A7XG5wcm9jZXNzLmVtaXQgPSBub29wO1xuXG5wcm9jZXNzLmJpbmRpbmcgPSBmdW5jdGlvbiAobmFtZSkge1xuICAgIHRocm93IG5ldyBFcnJvcigncHJvY2Vzcy5iaW5kaW5nIGlzIG5vdCBzdXBwb3J0ZWQnKTtcbn07XG5cbnByb2Nlc3MuY3dkID0gZnVuY3Rpb24gKCkgeyByZXR1cm4gJy8nIH07XG5wcm9jZXNzLmNoZGlyID0gZnVuY3Rpb24gKGRpcikge1xuICAgIHRocm93IG5ldyBFcnJvcigncHJvY2Vzcy5jaGRpciBpcyBub3Qgc3VwcG9ydGVkJyk7XG59O1xucHJvY2Vzcy51bWFzayA9IGZ1bmN0aW9uKCkgeyByZXR1cm4gMDsgfTtcbiIsImlmICh0eXBlb2YgT2JqZWN0LmNyZWF0ZSA9PT0gJ2Z1bmN0aW9uJykge1xuICAvLyBpbXBsZW1lbnRhdGlvbiBmcm9tIHN0YW5kYXJkIG5vZGUuanMgJ3V0aWwnIG1vZHVsZVxuICBtb2R1bGUuZXhwb3J0cyA9IGZ1bmN0aW9uIGluaGVyaXRzKGN0b3IsIHN1cGVyQ3Rvcikge1xuICAgIGN0b3Iuc3VwZXJfID0gc3VwZXJDdG9yXG4gICAgY3Rvci5wcm90b3R5cGUgPSBPYmplY3QuY3JlYXRlKHN1cGVyQ3Rvci5wcm90b3R5cGUsIHtcbiAgICAgIGNvbnN0cnVjdG9yOiB7XG4gICAgICAgIHZhbHVlOiBjdG9yLFxuICAgICAgICBlbnVtZXJhYmxlOiBmYWxzZSxcbiAgICAgICAgd3JpdGFibGU6IHRydWUsXG4gICAgICAgIGNvbmZpZ3VyYWJsZTogdHJ1ZVxuICAgICAgfVxuICAgIH0pO1xuICB9O1xufSBlbHNlIHtcbiAgLy8gb2xkIHNjaG9vbCBzaGltIGZvciBvbGQgYnJvd3NlcnNcbiAgbW9kdWxlLmV4cG9ydHMgPSBmdW5jdGlvbiBpbmhlcml0cyhjdG9yLCBzdXBlckN0b3IpIHtcbiAgICBjdG9yLnN1cGVyXyA9IHN1cGVyQ3RvclxuICAgIHZhciBUZW1wQ3RvciA9IGZ1bmN0aW9uICgpIHt9XG4gICAgVGVtcEN0b3IucHJvdG90eXBlID0gc3VwZXJDdG9yLnByb3RvdHlwZVxuICAgIGN0b3IucHJvdG90eXBlID0gbmV3IFRlbXBDdG9yKClcbiAgICBjdG9yLnByb3RvdHlwZS5jb25zdHJ1Y3RvciA9IGN0b3JcbiAgfVxufVxuIiwibW9kdWxlLmV4cG9ydHMgPSBmdW5jdGlvbiBpc0J1ZmZlcihhcmcpIHtcbiAgcmV0dXJuIGFyZyAmJiB0eXBlb2YgYXJnID09PSAnb2JqZWN0J1xuICAgICYmIHR5cGVvZiBhcmcuY29weSA9PT0gJ2Z1bmN0aW9uJ1xuICAgICYmIHR5cGVvZiBhcmcuZmlsbCA9PT0gJ2Z1bmN0aW9uJ1xuICAgICYmIHR5cGVvZiBhcmcucmVhZFVJbnQ4ID09PSAnZnVuY3Rpb24nO1xufSIsIi8vIENvcHlyaWdodCBKb3llbnQsIEluYy4gYW5kIG90aGVyIE5vZGUgY29udHJpYnV0b3JzLlxuLy9cbi8vIFBlcm1pc3Npb24gaXMgaGVyZWJ5IGdyYW50ZWQsIGZyZWUgb2YgY2hhcmdlLCB0byBhbnkgcGVyc29uIG9idGFpbmluZyBhXG4vLyBjb3B5IG9mIHRoaXMgc29mdHdhcmUgYW5kIGFzc29jaWF0ZWQgZG9jdW1lbnRhdGlvbiBmaWxlcyAodGhlXG4vLyBcIlNvZnR3YXJlXCIpLCB0byBkZWFsIGluIHRoZSBTb2Z0d2FyZSB3aXRob3V0IHJlc3RyaWN0aW9uLCBpbmNsdWRpbmdcbi8vIHdpdGhvdXQgbGltaXRhdGlvbiB0aGUgcmlnaHRzIHRvIHVzZSwgY29weSwgbW9kaWZ5LCBtZXJnZSwgcHVibGlzaCxcbi8vIGRpc3RyaWJ1dGUsIHN1YmxpY2Vuc2UsIGFuZC9vciBzZWxsIGNvcGllcyBvZiB0aGUgU29mdHdhcmUsIGFuZCB0byBwZXJtaXRcbi8vIHBlcnNvbnMgdG8gd2hvbSB0aGUgU29mdHdhcmUgaXMgZnVybmlzaGVkIHRvIGRvIHNvLCBzdWJqZWN0IHRvIHRoZVxuLy8gZm9sbG93aW5nIGNvbmRpdGlvbnM6XG4vL1xuLy8gVGhlIGFib3ZlIGNvcHlyaWdodCBub3RpY2UgYW5kIHRoaXMgcGVybWlzc2lvbiBub3RpY2Ugc2hhbGwgYmUgaW5jbHVkZWRcbi8vIGluIGFsbCBjb3BpZXMgb3Igc3Vic3RhbnRpYWwgcG9ydGlvbnMgb2YgdGhlIFNvZnR3YXJlLlxuLy9cbi8vIFRIRSBTT0ZUV0FSRSBJUyBQUk9WSURFRCBcIkFTIElTXCIsIFdJVEhPVVQgV0FSUkFOVFkgT0YgQU5ZIEtJTkQsIEVYUFJFU1Ncbi8vIE9SIElNUExJRUQsIElOQ0xVRElORyBCVVQgTk9UIExJTUlURUQgVE8gVEhFIFdBUlJBTlRJRVMgT0Zcbi8vIE1FUkNIQU5UQUJJTElUWSwgRklUTkVTUyBGT1IgQSBQQVJUSUNVTEFSIFBVUlBPU0UgQU5EIE5PTklORlJJTkdFTUVOVC4gSU5cbi8vIE5PIEVWRU5UIFNIQUxMIFRIRSBBVVRIT1JTIE9SIENPUFlSSUdIVCBIT0xERVJTIEJFIExJQUJMRSBGT1IgQU5ZIENMQUlNLFxuLy8gREFNQUdFUyBPUiBPVEhFUiBMSUFCSUxJVFksIFdIRVRIRVIgSU4gQU4gQUNUSU9OIE9GIENPTlRSQUNULCBUT1JUIE9SXG4vLyBPVEhFUldJU0UsIEFSSVNJTkcgRlJPTSwgT1VUIE9GIE9SIElOIENPTk5FQ1RJT04gV0lUSCBUSEUgU09GVFdBUkUgT1IgVEhFXG4vLyBVU0UgT1IgT1RIRVIgREVBTElOR1MgSU4gVEhFIFNPRlRXQVJFLlxuXG52YXIgZm9ybWF0UmVnRXhwID0gLyVbc2RqJV0vZztcbmV4cG9ydHMuZm9ybWF0ID0gZnVuY3Rpb24oZikge1xuICBpZiAoIWlzU3RyaW5nKGYpKSB7XG4gICAgdmFyIG9iamVjdHMgPSBbXTtcbiAgICBmb3IgKHZhciBpID0gMDsgaSA8IGFyZ3VtZW50cy5sZW5ndGg7IGkrKykge1xuICAgICAgb2JqZWN0cy5wdXNoKGluc3BlY3QoYXJndW1lbnRzW2ldKSk7XG4gICAgfVxuICAgIHJldHVybiBvYmplY3RzLmpvaW4oJyAnKTtcbiAgfVxuXG4gIHZhciBpID0gMTtcbiAgdmFyIGFyZ3MgPSBhcmd1bWVudHM7XG4gIHZhciBsZW4gPSBhcmdzLmxlbmd0aDtcbiAgdmFyIHN0ciA9IFN0cmluZyhmKS5yZXBsYWNlKGZvcm1hdFJlZ0V4cCwgZnVuY3Rpb24oeCkge1xuICAgIGlmICh4ID09PSAnJSUnKSByZXR1cm4gJyUnO1xuICAgIGlmIChpID49IGxlbikgcmV0dXJuIHg7XG4gICAgc3dpdGNoICh4KSB7XG4gICAgICBjYXNlICclcyc6IHJldHVybiBTdHJpbmcoYXJnc1tpKytdKTtcbiAgICAgIGNhc2UgJyVkJzogcmV0dXJuIE51bWJlcihhcmdzW2krK10pO1xuICAgICAgY2FzZSAnJWonOlxuICAgICAgICB0cnkge1xuICAgICAgICAgIHJldHVybiBKU09OLnN0cmluZ2lmeShhcmdzW2krK10pO1xuICAgICAgICB9IGNhdGNoIChfKSB7XG4gICAgICAgICAgcmV0dXJuICdbQ2lyY3VsYXJdJztcbiAgICAgICAgfVxuICAgICAgZGVmYXVsdDpcbiAgICAgICAgcmV0dXJuIHg7XG4gICAgfVxuICB9KTtcbiAgZm9yICh2YXIgeCA9IGFyZ3NbaV07IGkgPCBsZW47IHggPSBhcmdzWysraV0pIHtcbiAgICBpZiAoaXNOdWxsKHgpIHx8ICFpc09iamVjdCh4KSkge1xuICAgICAgc3RyICs9ICcgJyArIHg7XG4gICAgfSBlbHNlIHtcbiAgICAgIHN0ciArPSAnICcgKyBpbnNwZWN0KHgpO1xuICAgIH1cbiAgfVxuICByZXR1cm4gc3RyO1xufTtcblxuXG4vLyBNYXJrIHRoYXQgYSBtZXRob2Qgc2hvdWxkIG5vdCBiZSB1c2VkLlxuLy8gUmV0dXJucyBhIG1vZGlmaWVkIGZ1bmN0aW9uIHdoaWNoIHdhcm5zIG9uY2UgYnkgZGVmYXVsdC5cbi8vIElmIC0tbm8tZGVwcmVjYXRpb24gaXMgc2V0LCB0aGVuIGl0IGlzIGEgbm8tb3AuXG5leHBvcnRzLmRlcHJlY2F0ZSA9IGZ1bmN0aW9uKGZuLCBtc2cpIHtcbiAgLy8gQWxsb3cgZm9yIGRlcHJlY2F0aW5nIHRoaW5ncyBpbiB0aGUgcHJvY2VzcyBvZiBzdGFydGluZyB1cC5cbiAgaWYgKGlzVW5kZWZpbmVkKGdsb2JhbC5wcm9jZXNzKSkge1xuICAgIHJldHVybiBmdW5jdGlvbigpIHtcbiAgICAgIHJldHVybiBleHBvcnRzLmRlcHJlY2F0ZShmbiwgbXNnKS5hcHBseSh0aGlzLCBhcmd1bWVudHMpO1xuICAgIH07XG4gIH1cblxuICBpZiAocHJvY2Vzcy5ub0RlcHJlY2F0aW9uID09PSB0cnVlKSB7XG4gICAgcmV0dXJuIGZuO1xuICB9XG5cbiAgdmFyIHdhcm5lZCA9IGZhbHNlO1xuICBmdW5jdGlvbiBkZXByZWNhdGVkKCkge1xuICAgIGlmICghd2FybmVkKSB7XG4gICAgICBpZiAocHJvY2Vzcy50aHJvd0RlcHJlY2F0aW9uKSB7XG4gICAgICAgIHRocm93IG5ldyBFcnJvcihtc2cpO1xuICAgICAgfSBlbHNlIGlmIChwcm9jZXNzLnRyYWNlRGVwcmVjYXRpb24pIHtcbiAgICAgICAgY29uc29sZS50cmFjZShtc2cpO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgY29uc29sZS5lcnJvcihtc2cpO1xuICAgICAgfVxuICAgICAgd2FybmVkID0gdHJ1ZTtcbiAgICB9XG4gICAgcmV0dXJuIGZuLmFwcGx5KHRoaXMsIGFyZ3VtZW50cyk7XG4gIH1cblxuICByZXR1cm4gZGVwcmVjYXRlZDtcbn07XG5cblxudmFyIGRlYnVncyA9IHt9O1xudmFyIGRlYnVnRW52aXJvbjtcbmV4cG9ydHMuZGVidWdsb2cgPSBmdW5jdGlvbihzZXQpIHtcbiAgaWYgKGlzVW5kZWZpbmVkKGRlYnVnRW52aXJvbikpXG4gICAgZGVidWdFbnZpcm9uID0gcHJvY2Vzcy5lbnYuTk9ERV9ERUJVRyB8fCAnJztcbiAgc2V0ID0gc2V0LnRvVXBwZXJDYXNlKCk7XG4gIGlmICghZGVidWdzW3NldF0pIHtcbiAgICBpZiAobmV3IFJlZ0V4cCgnXFxcXGInICsgc2V0ICsgJ1xcXFxiJywgJ2knKS50ZXN0KGRlYnVnRW52aXJvbikpIHtcbiAgICAgIHZhciBwaWQgPSBwcm9jZXNzLnBpZDtcbiAgICAgIGRlYnVnc1tzZXRdID0gZnVuY3Rpb24oKSB7XG4gICAgICAgIHZhciBtc2cgPSBleHBvcnRzLmZvcm1hdC5hcHBseShleHBvcnRzLCBhcmd1bWVudHMpO1xuICAgICAgICBjb25zb2xlLmVycm9yKCclcyAlZDogJXMnLCBzZXQsIHBpZCwgbXNnKTtcbiAgICAgIH07XG4gICAgfSBlbHNlIHtcbiAgICAgIGRlYnVnc1tzZXRdID0gZnVuY3Rpb24oKSB7fTtcbiAgICB9XG4gIH1cbiAgcmV0dXJuIGRlYnVnc1tzZXRdO1xufTtcblxuXG4vKipcbiAqIEVjaG9zIHRoZSB2YWx1ZSBvZiBhIHZhbHVlLiBUcnlzIHRvIHByaW50IHRoZSB2YWx1ZSBvdXRcbiAqIGluIHRoZSBiZXN0IHdheSBwb3NzaWJsZSBnaXZlbiB0aGUgZGlmZmVyZW50IHR5cGVzLlxuICpcbiAqIEBwYXJhbSB7T2JqZWN0fSBvYmogVGhlIG9iamVjdCB0byBwcmludCBvdXQuXG4gKiBAcGFyYW0ge09iamVjdH0gb3B0cyBPcHRpb25hbCBvcHRpb25zIG9iamVjdCB0aGF0IGFsdGVycyB0aGUgb3V0cHV0LlxuICovXG4vKiBsZWdhY3k6IG9iaiwgc2hvd0hpZGRlbiwgZGVwdGgsIGNvbG9ycyovXG5mdW5jdGlvbiBpbnNwZWN0KG9iaiwgb3B0cykge1xuICAvLyBkZWZhdWx0IG9wdGlvbnNcbiAgdmFyIGN0eCA9IHtcbiAgICBzZWVuOiBbXSxcbiAgICBzdHlsaXplOiBzdHlsaXplTm9Db2xvclxuICB9O1xuICAvLyBsZWdhY3kuLi5cbiAgaWYgKGFyZ3VtZW50cy5sZW5ndGggPj0gMykgY3R4LmRlcHRoID0gYXJndW1lbnRzWzJdO1xuICBpZiAoYXJndW1lbnRzLmxlbmd0aCA+PSA0KSBjdHguY29sb3JzID0gYXJndW1lbnRzWzNdO1xuICBpZiAoaXNCb29sZWFuKG9wdHMpKSB7XG4gICAgLy8gbGVnYWN5Li4uXG4gICAgY3R4LnNob3dIaWRkZW4gPSBvcHRzO1xuICB9IGVsc2UgaWYgKG9wdHMpIHtcbiAgICAvLyBnb3QgYW4gXCJvcHRpb25zXCIgb2JqZWN0XG4gICAgZXhwb3J0cy5fZXh0ZW5kKGN0eCwgb3B0cyk7XG4gIH1cbiAgLy8gc2V0IGRlZmF1bHQgb3B0aW9uc1xuICBpZiAoaXNVbmRlZmluZWQoY3R4LnNob3dIaWRkZW4pKSBjdHguc2hvd0hpZGRlbiA9IGZhbHNlO1xuICBpZiAoaXNVbmRlZmluZWQoY3R4LmRlcHRoKSkgY3R4LmRlcHRoID0gMjtcbiAgaWYgKGlzVW5kZWZpbmVkKGN0eC5jb2xvcnMpKSBjdHguY29sb3JzID0gZmFsc2U7XG4gIGlmIChpc1VuZGVmaW5lZChjdHguY3VzdG9tSW5zcGVjdCkpIGN0eC5jdXN0b21JbnNwZWN0ID0gdHJ1ZTtcbiAgaWYgKGN0eC5jb2xvcnMpIGN0eC5zdHlsaXplID0gc3R5bGl6ZVdpdGhDb2xvcjtcbiAgcmV0dXJuIGZvcm1hdFZhbHVlKGN0eCwgb2JqLCBjdHguZGVwdGgpO1xufVxuZXhwb3J0cy5pbnNwZWN0ID0gaW5zcGVjdDtcblxuXG4vLyBodHRwOi8vZW4ud2lraXBlZGlhLm9yZy93aWtpL0FOU0lfZXNjYXBlX2NvZGUjZ3JhcGhpY3Ncbmluc3BlY3QuY29sb3JzID0ge1xuICAnYm9sZCcgOiBbMSwgMjJdLFxuICAnaXRhbGljJyA6IFszLCAyM10sXG4gICd1bmRlcmxpbmUnIDogWzQsIDI0XSxcbiAgJ2ludmVyc2UnIDogWzcsIDI3XSxcbiAgJ3doaXRlJyA6IFszNywgMzldLFxuICAnZ3JleScgOiBbOTAsIDM5XSxcbiAgJ2JsYWNrJyA6IFszMCwgMzldLFxuICAnYmx1ZScgOiBbMzQsIDM5XSxcbiAgJ2N5YW4nIDogWzM2LCAzOV0sXG4gICdncmVlbicgOiBbMzIsIDM5XSxcbiAgJ21hZ2VudGEnIDogWzM1LCAzOV0sXG4gICdyZWQnIDogWzMxLCAzOV0sXG4gICd5ZWxsb3cnIDogWzMzLCAzOV1cbn07XG5cbi8vIERvbid0IHVzZSAnYmx1ZScgbm90IHZpc2libGUgb24gY21kLmV4ZVxuaW5zcGVjdC5zdHlsZXMgPSB7XG4gICdzcGVjaWFsJzogJ2N5YW4nLFxuICAnbnVtYmVyJzogJ3llbGxvdycsXG4gICdib29sZWFuJzogJ3llbGxvdycsXG4gICd1bmRlZmluZWQnOiAnZ3JleScsXG4gICdudWxsJzogJ2JvbGQnLFxuICAnc3RyaW5nJzogJ2dyZWVuJyxcbiAgJ2RhdGUnOiAnbWFnZW50YScsXG4gIC8vIFwibmFtZVwiOiBpbnRlbnRpb25hbGx5IG5vdCBzdHlsaW5nXG4gICdyZWdleHAnOiAncmVkJ1xufTtcblxuXG5mdW5jdGlvbiBzdHlsaXplV2l0aENvbG9yKHN0ciwgc3R5bGVUeXBlKSB7XG4gIHZhciBzdHlsZSA9IGluc3BlY3Quc3R5bGVzW3N0eWxlVHlwZV07XG5cbiAgaWYgKHN0eWxlKSB7XG4gICAgcmV0dXJuICdcXHUwMDFiWycgKyBpbnNwZWN0LmNvbG9yc1tzdHlsZV1bMF0gKyAnbScgKyBzdHIgK1xuICAgICAgICAgICAnXFx1MDAxYlsnICsgaW5zcGVjdC5jb2xvcnNbc3R5bGVdWzFdICsgJ20nO1xuICB9IGVsc2Uge1xuICAgIHJldHVybiBzdHI7XG4gIH1cbn1cblxuXG5mdW5jdGlvbiBzdHlsaXplTm9Db2xvcihzdHIsIHN0eWxlVHlwZSkge1xuICByZXR1cm4gc3RyO1xufVxuXG5cbmZ1bmN0aW9uIGFycmF5VG9IYXNoKGFycmF5KSB7XG4gIHZhciBoYXNoID0ge307XG5cbiAgYXJyYXkuZm9yRWFjaChmdW5jdGlvbih2YWwsIGlkeCkge1xuICAgIGhhc2hbdmFsXSA9IHRydWU7XG4gIH0pO1xuXG4gIHJldHVybiBoYXNoO1xufVxuXG5cbmZ1bmN0aW9uIGZvcm1hdFZhbHVlKGN0eCwgdmFsdWUsIHJlY3Vyc2VUaW1lcykge1xuICAvLyBQcm92aWRlIGEgaG9vayBmb3IgdXNlci1zcGVjaWZpZWQgaW5zcGVjdCBmdW5jdGlvbnMuXG4gIC8vIENoZWNrIHRoYXQgdmFsdWUgaXMgYW4gb2JqZWN0IHdpdGggYW4gaW5zcGVjdCBmdW5jdGlvbiBvbiBpdFxuICBpZiAoY3R4LmN1c3RvbUluc3BlY3QgJiZcbiAgICAgIHZhbHVlICYmXG4gICAgICBpc0Z1bmN0aW9uKHZhbHVlLmluc3BlY3QpICYmXG4gICAgICAvLyBGaWx0ZXIgb3V0IHRoZSB1dGlsIG1vZHVsZSwgaXQncyBpbnNwZWN0IGZ1bmN0aW9uIGlzIHNwZWNpYWxcbiAgICAgIHZhbHVlLmluc3BlY3QgIT09IGV4cG9ydHMuaW5zcGVjdCAmJlxuICAgICAgLy8gQWxzbyBmaWx0ZXIgb3V0IGFueSBwcm90b3R5cGUgb2JqZWN0cyB1c2luZyB0aGUgY2lyY3VsYXIgY2hlY2suXG4gICAgICAhKHZhbHVlLmNvbnN0cnVjdG9yICYmIHZhbHVlLmNvbnN0cnVjdG9yLnByb3RvdHlwZSA9PT0gdmFsdWUpKSB7XG4gICAgdmFyIHJldCA9IHZhbHVlLmluc3BlY3QocmVjdXJzZVRpbWVzLCBjdHgpO1xuICAgIGlmICghaXNTdHJpbmcocmV0KSkge1xuICAgICAgcmV0ID0gZm9ybWF0VmFsdWUoY3R4LCByZXQsIHJlY3Vyc2VUaW1lcyk7XG4gICAgfVxuICAgIHJldHVybiByZXQ7XG4gIH1cblxuICAvLyBQcmltaXRpdmUgdHlwZXMgY2Fubm90IGhhdmUgcHJvcGVydGllc1xuICB2YXIgcHJpbWl0aXZlID0gZm9ybWF0UHJpbWl0aXZlKGN0eCwgdmFsdWUpO1xuICBpZiAocHJpbWl0aXZlKSB7XG4gICAgcmV0dXJuIHByaW1pdGl2ZTtcbiAgfVxuXG4gIC8vIExvb2sgdXAgdGhlIGtleXMgb2YgdGhlIG9iamVjdC5cbiAgdmFyIGtleXMgPSBPYmplY3Qua2V5cyh2YWx1ZSk7XG4gIHZhciB2aXNpYmxlS2V5cyA9IGFycmF5VG9IYXNoKGtleXMpO1xuXG4gIGlmIChjdHguc2hvd0hpZGRlbikge1xuICAgIGtleXMgPSBPYmplY3QuZ2V0T3duUHJvcGVydHlOYW1lcyh2YWx1ZSk7XG4gIH1cblxuICAvLyBJRSBkb2Vzbid0IG1ha2UgZXJyb3IgZmllbGRzIG5vbi1lbnVtZXJhYmxlXG4gIC8vIGh0dHA6Ly9tc2RuLm1pY3Jvc29mdC5jb20vZW4tdXMvbGlicmFyeS9pZS9kd3c1MnNidCh2PXZzLjk0KS5hc3B4XG4gIGlmIChpc0Vycm9yKHZhbHVlKVxuICAgICAgJiYgKGtleXMuaW5kZXhPZignbWVzc2FnZScpID49IDAgfHwga2V5cy5pbmRleE9mKCdkZXNjcmlwdGlvbicpID49IDApKSB7XG4gICAgcmV0dXJuIGZvcm1hdEVycm9yKHZhbHVlKTtcbiAgfVxuXG4gIC8vIFNvbWUgdHlwZSBvZiBvYmplY3Qgd2l0aG91dCBwcm9wZXJ0aWVzIGNhbiBiZSBzaG9ydGN1dHRlZC5cbiAgaWYgKGtleXMubGVuZ3RoID09PSAwKSB7XG4gICAgaWYgKGlzRnVuY3Rpb24odmFsdWUpKSB7XG4gICAgICB2YXIgbmFtZSA9IHZhbHVlLm5hbWUgPyAnOiAnICsgdmFsdWUubmFtZSA6ICcnO1xuICAgICAgcmV0dXJuIGN0eC5zdHlsaXplKCdbRnVuY3Rpb24nICsgbmFtZSArICddJywgJ3NwZWNpYWwnKTtcbiAgICB9XG4gICAgaWYgKGlzUmVnRXhwKHZhbHVlKSkge1xuICAgICAgcmV0dXJuIGN0eC5zdHlsaXplKFJlZ0V4cC5wcm90b3R5cGUudG9TdHJpbmcuY2FsbCh2YWx1ZSksICdyZWdleHAnKTtcbiAgICB9XG4gICAgaWYgKGlzRGF0ZSh2YWx1ZSkpIHtcbiAgICAgIHJldHVybiBjdHguc3R5bGl6ZShEYXRlLnByb3RvdHlwZS50b1N0cmluZy5jYWxsKHZhbHVlKSwgJ2RhdGUnKTtcbiAgICB9XG4gICAgaWYgKGlzRXJyb3IodmFsdWUpKSB7XG4gICAgICByZXR1cm4gZm9ybWF0RXJyb3IodmFsdWUpO1xuICAgIH1cbiAgfVxuXG4gIHZhciBiYXNlID0gJycsIGFycmF5ID0gZmFsc2UsIGJyYWNlcyA9IFsneycsICd9J107XG5cbiAgLy8gTWFrZSBBcnJheSBzYXkgdGhhdCB0aGV5IGFyZSBBcnJheVxuICBpZiAoaXNBcnJheSh2YWx1ZSkpIHtcbiAgICBhcnJheSA9IHRydWU7XG4gICAgYnJhY2VzID0gWydbJywgJ10nXTtcbiAgfVxuXG4gIC8vIE1ha2UgZnVuY3Rpb25zIHNheSB0aGF0IHRoZXkgYXJlIGZ1bmN0aW9uc1xuICBpZiAoaXNGdW5jdGlvbih2YWx1ZSkpIHtcbiAgICB2YXIgbiA9IHZhbHVlLm5hbWUgPyAnOiAnICsgdmFsdWUubmFtZSA6ICcnO1xuICAgIGJhc2UgPSAnIFtGdW5jdGlvbicgKyBuICsgJ10nO1xuICB9XG5cbiAgLy8gTWFrZSBSZWdFeHBzIHNheSB0aGF0IHRoZXkgYXJlIFJlZ0V4cHNcbiAgaWYgKGlzUmVnRXhwKHZhbHVlKSkge1xuICAgIGJhc2UgPSAnICcgKyBSZWdFeHAucHJvdG90eXBlLnRvU3RyaW5nLmNhbGwodmFsdWUpO1xuICB9XG5cbiAgLy8gTWFrZSBkYXRlcyB3aXRoIHByb3BlcnRpZXMgZmlyc3Qgc2F5IHRoZSBkYXRlXG4gIGlmIChpc0RhdGUodmFsdWUpKSB7XG4gICAgYmFzZSA9ICcgJyArIERhdGUucHJvdG90eXBlLnRvVVRDU3RyaW5nLmNhbGwodmFsdWUpO1xuICB9XG5cbiAgLy8gTWFrZSBlcnJvciB3aXRoIG1lc3NhZ2UgZmlyc3Qgc2F5IHRoZSBlcnJvclxuICBpZiAoaXNFcnJvcih2YWx1ZSkpIHtcbiAgICBiYXNlID0gJyAnICsgZm9ybWF0RXJyb3IodmFsdWUpO1xuICB9XG5cbiAgaWYgKGtleXMubGVuZ3RoID09PSAwICYmICghYXJyYXkgfHwgdmFsdWUubGVuZ3RoID09IDApKSB7XG4gICAgcmV0dXJuIGJyYWNlc1swXSArIGJhc2UgKyBicmFjZXNbMV07XG4gIH1cblxuICBpZiAocmVjdXJzZVRpbWVzIDwgMCkge1xuICAgIGlmIChpc1JlZ0V4cCh2YWx1ZSkpIHtcbiAgICAgIHJldHVybiBjdHguc3R5bGl6ZShSZWdFeHAucHJvdG90eXBlLnRvU3RyaW5nLmNhbGwodmFsdWUpLCAncmVnZXhwJyk7XG4gICAgfSBlbHNlIHtcbiAgICAgIHJldHVybiBjdHguc3R5bGl6ZSgnW09iamVjdF0nLCAnc3BlY2lhbCcpO1xuICAgIH1cbiAgfVxuXG4gIGN0eC5zZWVuLnB1c2godmFsdWUpO1xuXG4gIHZhciBvdXRwdXQ7XG4gIGlmIChhcnJheSkge1xuICAgIG91dHB1dCA9IGZvcm1hdEFycmF5KGN0eCwgdmFsdWUsIHJlY3Vyc2VUaW1lcywgdmlzaWJsZUtleXMsIGtleXMpO1xuICB9IGVsc2Uge1xuICAgIG91dHB1dCA9IGtleXMubWFwKGZ1bmN0aW9uKGtleSkge1xuICAgICAgcmV0dXJuIGZvcm1hdFByb3BlcnR5KGN0eCwgdmFsdWUsIHJlY3Vyc2VUaW1lcywgdmlzaWJsZUtleXMsIGtleSwgYXJyYXkpO1xuICAgIH0pO1xuICB9XG5cbiAgY3R4LnNlZW4ucG9wKCk7XG5cbiAgcmV0dXJuIHJlZHVjZVRvU2luZ2xlU3RyaW5nKG91dHB1dCwgYmFzZSwgYnJhY2VzKTtcbn1cblxuXG5mdW5jdGlvbiBmb3JtYXRQcmltaXRpdmUoY3R4LCB2YWx1ZSkge1xuICBpZiAoaXNVbmRlZmluZWQodmFsdWUpKVxuICAgIHJldHVybiBjdHguc3R5bGl6ZSgndW5kZWZpbmVkJywgJ3VuZGVmaW5lZCcpO1xuICBpZiAoaXNTdHJpbmcodmFsdWUpKSB7XG4gICAgdmFyIHNpbXBsZSA9ICdcXCcnICsgSlNPTi5zdHJpbmdpZnkodmFsdWUpLnJlcGxhY2UoL15cInxcIiQvZywgJycpXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAucmVwbGFjZSgvJy9nLCBcIlxcXFwnXCIpXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAucmVwbGFjZSgvXFxcXFwiL2csICdcIicpICsgJ1xcJyc7XG4gICAgcmV0dXJuIGN0eC5zdHlsaXplKHNpbXBsZSwgJ3N0cmluZycpO1xuICB9XG4gIGlmIChpc051bWJlcih2YWx1ZSkpXG4gICAgcmV0dXJuIGN0eC5zdHlsaXplKCcnICsgdmFsdWUsICdudW1iZXInKTtcbiAgaWYgKGlzQm9vbGVhbih2YWx1ZSkpXG4gICAgcmV0dXJuIGN0eC5zdHlsaXplKCcnICsgdmFsdWUsICdib29sZWFuJyk7XG4gIC8vIEZvciBzb21lIHJlYXNvbiB0eXBlb2YgbnVsbCBpcyBcIm9iamVjdFwiLCBzbyBzcGVjaWFsIGNhc2UgaGVyZS5cbiAgaWYgKGlzTnVsbCh2YWx1ZSkpXG4gICAgcmV0dXJuIGN0eC5zdHlsaXplKCdudWxsJywgJ251bGwnKTtcbn1cblxuXG5mdW5jdGlvbiBmb3JtYXRFcnJvcih2YWx1ZSkge1xuICByZXR1cm4gJ1snICsgRXJyb3IucHJvdG90eXBlLnRvU3RyaW5nLmNhbGwodmFsdWUpICsgJ10nO1xufVxuXG5cbmZ1bmN0aW9uIGZvcm1hdEFycmF5KGN0eCwgdmFsdWUsIHJlY3Vyc2VUaW1lcywgdmlzaWJsZUtleXMsIGtleXMpIHtcbiAgdmFyIG91dHB1dCA9IFtdO1xuICBmb3IgKHZhciBpID0gMCwgbCA9IHZhbHVlLmxlbmd0aDsgaSA8IGw7ICsraSkge1xuICAgIGlmIChoYXNPd25Qcm9wZXJ0eSh2YWx1ZSwgU3RyaW5nKGkpKSkge1xuICAgICAgb3V0cHV0LnB1c2goZm9ybWF0UHJvcGVydHkoY3R4LCB2YWx1ZSwgcmVjdXJzZVRpbWVzLCB2aXNpYmxlS2V5cyxcbiAgICAgICAgICBTdHJpbmcoaSksIHRydWUpKTtcbiAgICB9IGVsc2Uge1xuICAgICAgb3V0cHV0LnB1c2goJycpO1xuICAgIH1cbiAgfVxuICBrZXlzLmZvckVhY2goZnVuY3Rpb24oa2V5KSB7XG4gICAgaWYgKCFrZXkubWF0Y2goL15cXGQrJC8pKSB7XG4gICAgICBvdXRwdXQucHVzaChmb3JtYXRQcm9wZXJ0eShjdHgsIHZhbHVlLCByZWN1cnNlVGltZXMsIHZpc2libGVLZXlzLFxuICAgICAgICAgIGtleSwgdHJ1ZSkpO1xuICAgIH1cbiAgfSk7XG4gIHJldHVybiBvdXRwdXQ7XG59XG5cblxuZnVuY3Rpb24gZm9ybWF0UHJvcGVydHkoY3R4LCB2YWx1ZSwgcmVjdXJzZVRpbWVzLCB2aXNpYmxlS2V5cywga2V5LCBhcnJheSkge1xuICB2YXIgbmFtZSwgc3RyLCBkZXNjO1xuICBkZXNjID0gT2JqZWN0LmdldE93blByb3BlcnR5RGVzY3JpcHRvcih2YWx1ZSwga2V5KSB8fCB7IHZhbHVlOiB2YWx1ZVtrZXldIH07XG4gIGlmIChkZXNjLmdldCkge1xuICAgIGlmIChkZXNjLnNldCkge1xuICAgICAgc3RyID0gY3R4LnN0eWxpemUoJ1tHZXR0ZXIvU2V0dGVyXScsICdzcGVjaWFsJyk7XG4gICAgfSBlbHNlIHtcbiAgICAgIHN0ciA9IGN0eC5zdHlsaXplKCdbR2V0dGVyXScsICdzcGVjaWFsJyk7XG4gICAgfVxuICB9IGVsc2Uge1xuICAgIGlmIChkZXNjLnNldCkge1xuICAgICAgc3RyID0gY3R4LnN0eWxpemUoJ1tTZXR0ZXJdJywgJ3NwZWNpYWwnKTtcbiAgICB9XG4gIH1cbiAgaWYgKCFoYXNPd25Qcm9wZXJ0eSh2aXNpYmxlS2V5cywga2V5KSkge1xuICAgIG5hbWUgPSAnWycgKyBrZXkgKyAnXSc7XG4gIH1cbiAgaWYgKCFzdHIpIHtcbiAgICBpZiAoY3R4LnNlZW4uaW5kZXhPZihkZXNjLnZhbHVlKSA8IDApIHtcbiAgICAgIGlmIChpc051bGwocmVjdXJzZVRpbWVzKSkge1xuICAgICAgICBzdHIgPSBmb3JtYXRWYWx1ZShjdHgsIGRlc2MudmFsdWUsIG51bGwpO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgc3RyID0gZm9ybWF0VmFsdWUoY3R4LCBkZXNjLnZhbHVlLCByZWN1cnNlVGltZXMgLSAxKTtcbiAgICAgIH1cbiAgICAgIGlmIChzdHIuaW5kZXhPZignXFxuJykgPiAtMSkge1xuICAgICAgICBpZiAoYXJyYXkpIHtcbiAgICAgICAgICBzdHIgPSBzdHIuc3BsaXQoJ1xcbicpLm1hcChmdW5jdGlvbihsaW5lKSB7XG4gICAgICAgICAgICByZXR1cm4gJyAgJyArIGxpbmU7XG4gICAgICAgICAgfSkuam9pbignXFxuJykuc3Vic3RyKDIpO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIHN0ciA9ICdcXG4nICsgc3RyLnNwbGl0KCdcXG4nKS5tYXAoZnVuY3Rpb24obGluZSkge1xuICAgICAgICAgICAgcmV0dXJuICcgICAnICsgbGluZTtcbiAgICAgICAgICB9KS5qb2luKCdcXG4nKTtcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH0gZWxzZSB7XG4gICAgICBzdHIgPSBjdHguc3R5bGl6ZSgnW0NpcmN1bGFyXScsICdzcGVjaWFsJyk7XG4gICAgfVxuICB9XG4gIGlmIChpc1VuZGVmaW5lZChuYW1lKSkge1xuICAgIGlmIChhcnJheSAmJiBrZXkubWF0Y2goL15cXGQrJC8pKSB7XG4gICAgICByZXR1cm4gc3RyO1xuICAgIH1cbiAgICBuYW1lID0gSlNPTi5zdHJpbmdpZnkoJycgKyBrZXkpO1xuICAgIGlmIChuYW1lLm1hdGNoKC9eXCIoW2EtekEtWl9dW2EtekEtWl8wLTldKilcIiQvKSkge1xuICAgICAgbmFtZSA9IG5hbWUuc3Vic3RyKDEsIG5hbWUubGVuZ3RoIC0gMik7XG4gICAgICBuYW1lID0gY3R4LnN0eWxpemUobmFtZSwgJ25hbWUnKTtcbiAgICB9IGVsc2Uge1xuICAgICAgbmFtZSA9IG5hbWUucmVwbGFjZSgvJy9nLCBcIlxcXFwnXCIpXG4gICAgICAgICAgICAgICAgIC5yZXBsYWNlKC9cXFxcXCIvZywgJ1wiJylcbiAgICAgICAgICAgICAgICAgLnJlcGxhY2UoLyheXCJ8XCIkKS9nLCBcIidcIik7XG4gICAgICBuYW1lID0gY3R4LnN0eWxpemUobmFtZSwgJ3N0cmluZycpO1xuICAgIH1cbiAgfVxuXG4gIHJldHVybiBuYW1lICsgJzogJyArIHN0cjtcbn1cblxuXG5mdW5jdGlvbiByZWR1Y2VUb1NpbmdsZVN0cmluZyhvdXRwdXQsIGJhc2UsIGJyYWNlcykge1xuICB2YXIgbnVtTGluZXNFc3QgPSAwO1xuICB2YXIgbGVuZ3RoID0gb3V0cHV0LnJlZHVjZShmdW5jdGlvbihwcmV2LCBjdXIpIHtcbiAgICBudW1MaW5lc0VzdCsrO1xuICAgIGlmIChjdXIuaW5kZXhPZignXFxuJykgPj0gMCkgbnVtTGluZXNFc3QrKztcbiAgICByZXR1cm4gcHJldiArIGN1ci5yZXBsYWNlKC9cXHUwMDFiXFxbXFxkXFxkP20vZywgJycpLmxlbmd0aCArIDE7XG4gIH0sIDApO1xuXG4gIGlmIChsZW5ndGggPiA2MCkge1xuICAgIHJldHVybiBicmFjZXNbMF0gK1xuICAgICAgICAgICAoYmFzZSA9PT0gJycgPyAnJyA6IGJhc2UgKyAnXFxuICcpICtcbiAgICAgICAgICAgJyAnICtcbiAgICAgICAgICAgb3V0cHV0LmpvaW4oJyxcXG4gICcpICtcbiAgICAgICAgICAgJyAnICtcbiAgICAgICAgICAgYnJhY2VzWzFdO1xuICB9XG5cbiAgcmV0dXJuIGJyYWNlc1swXSArIGJhc2UgKyAnICcgKyBvdXRwdXQuam9pbignLCAnKSArICcgJyArIGJyYWNlc1sxXTtcbn1cblxuXG4vLyBOT1RFOiBUaGVzZSB0eXBlIGNoZWNraW5nIGZ1bmN0aW9ucyBpbnRlbnRpb25hbGx5IGRvbid0IHVzZSBgaW5zdGFuY2VvZmBcbi8vIGJlY2F1c2UgaXQgaXMgZnJhZ2lsZSBhbmQgY2FuIGJlIGVhc2lseSBmYWtlZCB3aXRoIGBPYmplY3QuY3JlYXRlKClgLlxuZnVuY3Rpb24gaXNBcnJheShhcikge1xuICByZXR1cm4gQXJyYXkuaXNBcnJheShhcik7XG59XG5leHBvcnRzLmlzQXJyYXkgPSBpc0FycmF5O1xuXG5mdW5jdGlvbiBpc0Jvb2xlYW4oYXJnKSB7XG4gIHJldHVybiB0eXBlb2YgYXJnID09PSAnYm9vbGVhbic7XG59XG5leHBvcnRzLmlzQm9vbGVhbiA9IGlzQm9vbGVhbjtcblxuZnVuY3Rpb24gaXNOdWxsKGFyZykge1xuICByZXR1cm4gYXJnID09PSBudWxsO1xufVxuZXhwb3J0cy5pc051bGwgPSBpc051bGw7XG5cbmZ1bmN0aW9uIGlzTnVsbE9yVW5kZWZpbmVkKGFyZykge1xuICByZXR1cm4gYXJnID09IG51bGw7XG59XG5leHBvcnRzLmlzTnVsbE9yVW5kZWZpbmVkID0gaXNOdWxsT3JVbmRlZmluZWQ7XG5cbmZ1bmN0aW9uIGlzTnVtYmVyKGFyZykge1xuICByZXR1cm4gdHlwZW9mIGFyZyA9PT0gJ251bWJlcic7XG59XG5leHBvcnRzLmlzTnVtYmVyID0gaXNOdW1iZXI7XG5cbmZ1bmN0aW9uIGlzU3RyaW5nKGFyZykge1xuICByZXR1cm4gdHlwZW9mIGFyZyA9PT0gJ3N0cmluZyc7XG59XG5leHBvcnRzLmlzU3RyaW5nID0gaXNTdHJpbmc7XG5cbmZ1bmN0aW9uIGlzU3ltYm9sKGFyZykge1xuICByZXR1cm4gdHlwZW9mIGFyZyA9PT0gJ3N5bWJvbCc7XG59XG5leHBvcnRzLmlzU3ltYm9sID0gaXNTeW1ib2w7XG5cbmZ1bmN0aW9uIGlzVW5kZWZpbmVkKGFyZykge1xuICByZXR1cm4gYXJnID09PSB2b2lkIDA7XG59XG5leHBvcnRzLmlzVW5kZWZpbmVkID0gaXNVbmRlZmluZWQ7XG5cbmZ1bmN0aW9uIGlzUmVnRXhwKHJlKSB7XG4gIHJldHVybiBpc09iamVjdChyZSkgJiYgb2JqZWN0VG9TdHJpbmcocmUpID09PSAnW29iamVjdCBSZWdFeHBdJztcbn1cbmV4cG9ydHMuaXNSZWdFeHAgPSBpc1JlZ0V4cDtcblxuZnVuY3Rpb24gaXNPYmplY3QoYXJnKSB7XG4gIHJldHVybiB0eXBlb2YgYXJnID09PSAnb2JqZWN0JyAmJiBhcmcgIT09IG51bGw7XG59XG5leHBvcnRzLmlzT2JqZWN0ID0gaXNPYmplY3Q7XG5cbmZ1bmN0aW9uIGlzRGF0ZShkKSB7XG4gIHJldHVybiBpc09iamVjdChkKSAmJiBvYmplY3RUb1N0cmluZyhkKSA9PT0gJ1tvYmplY3QgRGF0ZV0nO1xufVxuZXhwb3J0cy5pc0RhdGUgPSBpc0RhdGU7XG5cbmZ1bmN0aW9uIGlzRXJyb3IoZSkge1xuICByZXR1cm4gaXNPYmplY3QoZSkgJiZcbiAgICAgIChvYmplY3RUb1N0cmluZyhlKSA9PT0gJ1tvYmplY3QgRXJyb3JdJyB8fCBlIGluc3RhbmNlb2YgRXJyb3IpO1xufVxuZXhwb3J0cy5pc0Vycm9yID0gaXNFcnJvcjtcblxuZnVuY3Rpb24gaXNGdW5jdGlvbihhcmcpIHtcbiAgcmV0dXJuIHR5cGVvZiBhcmcgPT09ICdmdW5jdGlvbic7XG59XG5leHBvcnRzLmlzRnVuY3Rpb24gPSBpc0Z1bmN0aW9uO1xuXG5mdW5jdGlvbiBpc1ByaW1pdGl2ZShhcmcpIHtcbiAgcmV0dXJuIGFyZyA9PT0gbnVsbCB8fFxuICAgICAgICAgdHlwZW9mIGFyZyA9PT0gJ2Jvb2xlYW4nIHx8XG4gICAgICAgICB0eXBlb2YgYXJnID09PSAnbnVtYmVyJyB8fFxuICAgICAgICAgdHlwZW9mIGFyZyA9PT0gJ3N0cmluZycgfHxcbiAgICAgICAgIHR5cGVvZiBhcmcgPT09ICdzeW1ib2wnIHx8ICAvLyBFUzYgc3ltYm9sXG4gICAgICAgICB0eXBlb2YgYXJnID09PSAndW5kZWZpbmVkJztcbn1cbmV4cG9ydHMuaXNQcmltaXRpdmUgPSBpc1ByaW1pdGl2ZTtcblxuZXhwb3J0cy5pc0J1ZmZlciA9IHJlcXVpcmUoJy4vc3VwcG9ydC9pc0J1ZmZlcicpO1xuXG5mdW5jdGlvbiBvYmplY3RUb1N0cmluZyhvKSB7XG4gIHJldHVybiBPYmplY3QucHJvdG90eXBlLnRvU3RyaW5nLmNhbGwobyk7XG59XG5cblxuZnVuY3Rpb24gcGFkKG4pIHtcbiAgcmV0dXJuIG4gPCAxMCA/ICcwJyArIG4udG9TdHJpbmcoMTApIDogbi50b1N0cmluZygxMCk7XG59XG5cblxudmFyIG1vbnRocyA9IFsnSmFuJywgJ0ZlYicsICdNYXInLCAnQXByJywgJ01heScsICdKdW4nLCAnSnVsJywgJ0F1ZycsICdTZXAnLFxuICAgICAgICAgICAgICAnT2N0JywgJ05vdicsICdEZWMnXTtcblxuLy8gMjYgRmViIDE2OjE5OjM0XG5mdW5jdGlvbiB0aW1lc3RhbXAoKSB7XG4gIHZhciBkID0gbmV3IERhdGUoKTtcbiAgdmFyIHRpbWUgPSBbcGFkKGQuZ2V0SG91cnMoKSksXG4gICAgICAgICAgICAgIHBhZChkLmdldE1pbnV0ZXMoKSksXG4gICAgICAgICAgICAgIHBhZChkLmdldFNlY29uZHMoKSldLmpvaW4oJzonKTtcbiAgcmV0dXJuIFtkLmdldERhdGUoKSwgbW9udGhzW2QuZ2V0TW9udGgoKV0sIHRpbWVdLmpvaW4oJyAnKTtcbn1cblxuXG4vLyBsb2cgaXMganVzdCBhIHRoaW4gd3JhcHBlciB0byBjb25zb2xlLmxvZyB0aGF0IHByZXBlbmRzIGEgdGltZXN0YW1wXG5leHBvcnRzLmxvZyA9IGZ1bmN0aW9uKCkge1xuICBjb25zb2xlLmxvZygnJXMgLSAlcycsIHRpbWVzdGFtcCgpLCBleHBvcnRzLmZvcm1hdC5hcHBseShleHBvcnRzLCBhcmd1bWVudHMpKTtcbn07XG5cblxuLyoqXG4gKiBJbmhlcml0IHRoZSBwcm90b3R5cGUgbWV0aG9kcyBmcm9tIG9uZSBjb25zdHJ1Y3RvciBpbnRvIGFub3RoZXIuXG4gKlxuICogVGhlIEZ1bmN0aW9uLnByb3RvdHlwZS5pbmhlcml0cyBmcm9tIGxhbmcuanMgcmV3cml0dGVuIGFzIGEgc3RhbmRhbG9uZVxuICogZnVuY3Rpb24gKG5vdCBvbiBGdW5jdGlvbi5wcm90b3R5cGUpLiBOT1RFOiBJZiB0aGlzIGZpbGUgaXMgdG8gYmUgbG9hZGVkXG4gKiBkdXJpbmcgYm9vdHN0cmFwcGluZyB0aGlzIGZ1bmN0aW9uIG5lZWRzIHRvIGJlIHJld3JpdHRlbiB1c2luZyBzb21lIG5hdGl2ZVxuICogZnVuY3Rpb25zIGFzIHByb3RvdHlwZSBzZXR1cCB1c2luZyBub3JtYWwgSmF2YVNjcmlwdCBkb2VzIG5vdCB3b3JrIGFzXG4gKiBleHBlY3RlZCBkdXJpbmcgYm9vdHN0cmFwcGluZyAoc2VlIG1pcnJvci5qcyBpbiByMTE0OTAzKS5cbiAqXG4gKiBAcGFyYW0ge2Z1bmN0aW9ufSBjdG9yIENvbnN0cnVjdG9yIGZ1bmN0aW9uIHdoaWNoIG5lZWRzIHRvIGluaGVyaXQgdGhlXG4gKiAgICAgcHJvdG90eXBlLlxuICogQHBhcmFtIHtmdW5jdGlvbn0gc3VwZXJDdG9yIENvbnN0cnVjdG9yIGZ1bmN0aW9uIHRvIGluaGVyaXQgcHJvdG90eXBlIGZyb20uXG4gKi9cbmV4cG9ydHMuaW5oZXJpdHMgPSByZXF1aXJlKCdpbmhlcml0cycpO1xuXG5leHBvcnRzLl9leHRlbmQgPSBmdW5jdGlvbihvcmlnaW4sIGFkZCkge1xuICAvLyBEb24ndCBkbyBhbnl0aGluZyBpZiBhZGQgaXNuJ3QgYW4gb2JqZWN0XG4gIGlmICghYWRkIHx8ICFpc09iamVjdChhZGQpKSByZXR1cm4gb3JpZ2luO1xuXG4gIHZhciBrZXlzID0gT2JqZWN0LmtleXMoYWRkKTtcbiAgdmFyIGkgPSBrZXlzLmxlbmd0aDtcbiAgd2hpbGUgKGktLSkge1xuICAgIG9yaWdpbltrZXlzW2ldXSA9IGFkZFtrZXlzW2ldXTtcbiAgfVxuICByZXR1cm4gb3JpZ2luO1xufTtcblxuZnVuY3Rpb24gaGFzT3duUHJvcGVydHkob2JqLCBwcm9wKSB7XG4gIHJldHVybiBPYmplY3QucHJvdG90eXBlLmhhc093blByb3BlcnR5LmNhbGwob2JqLCBwcm9wKTtcbn1cbiIsIi8qKlxyXG4gKiBOYW1lIGdlbmVyYXRvciBmb3IgYmFja3Vwc1xyXG4gKi9cclxuXHJcbmV4cG9ydHMuZ2VuQmFja3VwTmFtZSA9IGZ1bmN0aW9uKGRhdGUgPSBuZXcgRGF0ZSgpKSB7XHJcblx0cmV0dXJuIGBiYWNrdXAtJHtkYXRlLmdldEZ1bGxZZWFyKCl9LSR7ZGF0ZS5nZXRNb250aCgpKzF9LSR7ZGF0ZS5nZXREYXRlKCl9YFxyXG5cdFx0KyBgLSR7ZGF0ZS5nZXRIb3VycygpfS0ke2RhdGUuZ2V0TWludXRlcygpfS56aXBgO1xyXG59O1xyXG4iLCIvKipcclxuICogQSBiYXNpYyBrZXkgdmFsdWUgZGF0YSBzdG9yZVxyXG4gKi9cclxuXHJcbmNsYXNzIEtleVZhbHVlU3RvcmUgZXh0ZW5kcyBsaWZlTGluZS5FdmVudEVtaXR0ZXIge1xyXG5cdGNvbnN0cnVjdG9yKGFkYXB0ZXIpIHtcclxuXHRcdHN1cGVyKCk7XHJcblx0XHR0aGlzLl9hZGFwdGVyID0gYWRhcHRlcjtcclxuXHJcblx0XHQvLyBtYWtlIHN1cmUgd2UgaGF2ZSBhbiBhZGFwdGVyXHJcblx0XHRpZighYWRhcHRlcikge1xyXG5cdFx0XHR0aHJvdyBuZXcgRXJyb3IoXCJLZXlWYWx1ZVN0b3JlIG11c3QgYmUgaW5pdGlhbGl6ZWQgd2l0aCBhbiBhZGFwdGVyXCIpXHJcblx0XHR9XHJcblx0fVxyXG5cclxuXHQvKipcclxuXHQgKiBHZXQgdGhlIGNvcnJpc3BvbmRpbmcgdmFsdWUgb3V0IG9mIHRoZSBkYXRhIHN0b3JlIG90aGVyd2lzZSByZXR1cm4gZGVmYXVsdFxyXG5cdCAqL1xyXG5cdGdldChrZXksIF9kZWZhdWx0KSB7XHJcblx0XHQvLyBjaGVjayBpZiB0aGlzIHZhbHVlIGhhcyBiZWVuIG92ZXJyaWRlblxyXG5cdFx0aWYodGhpcy5fb3ZlcnJpZGVzICYmIHRoaXMuX292ZXJyaWRlcy5oYXNPd25Qcm9wZXJ0eShrZXkpKSB7XHJcblx0XHRcdHJldHVybiBQcm9taXNlLnJlc29sdmUodGhpcy5fb3ZlcnJpZGVzW2tleV0pO1xyXG5cdFx0fVxyXG5cclxuXHRcdHJldHVybiB0aGlzLl9hZGFwdGVyLmdldChrZXkpXHJcblxyXG5cdFx0LnRoZW4ocmVzdWx0ID0+IHtcclxuXHRcdFx0Ly8gdGhlIGl0ZW0gaXMgbm90IGRlZmluZWRcclxuXHRcdFx0aWYoIXJlc3VsdCkge1xyXG5cdFx0XHRcdHJldHVybiBfZGVmYXVsdDtcclxuXHRcdFx0fVxyXG5cclxuXHRcdFx0cmV0dXJuIHJlc3VsdC52YWx1ZTtcclxuXHRcdH0pO1xyXG5cdH1cclxuXHJcblx0LyoqXHJcblx0ICogU2V0IGEgc2luZ2xlIHZhbHVlIG9yIHNldmVyYWwgdmFsdWVzXHJcblx0ICpcclxuXHQgKiBrZXkgLT4gdmFsdWVcclxuXHQgKiBvclxyXG5cdCAqIHsga2V5OiB2YWx1ZSB9XHJcblx0ICovXHJcblx0c2V0KGtleSwgdmFsdWUpIHtcclxuXHRcdC8vIHNldCBhIHNpbmdsZSB2YWx1ZVxyXG5cdFx0aWYodHlwZW9mIGtleSA9PSBcInN0cmluZ1wiKSB7XHJcblx0XHRcdHZhciBwcm9taXNlID0gdGhpcy5fYWRhcHRlci5zZXQoe1xyXG5cdFx0XHRcdGlkOiBrZXksXHJcblx0XHRcdFx0dmFsdWUsXHJcblx0XHRcdFx0bW9kaWZpZWQ6IERhdGUubm93KClcclxuXHRcdFx0fSk7XHJcblxyXG5cdFx0XHQvLyB0cmlnZ2VyIHRoZSBjaGFuZ2VcclxuXHRcdFx0dGhpcy5lbWl0KGtleSwgdmFsdWUpO1xyXG5cclxuXHRcdFx0cmV0dXJuIHByb21pc2U7XHJcblx0XHR9XHJcblx0XHQvLyBzZXQgc2V2ZXJhbCB2YWx1ZXNcclxuXHRcdGVsc2Uge1xyXG5cdFx0XHQvLyB0ZWxsIHRoZSBjYWxsZXIgd2hlbiB3ZSBhcmUgZG9uZVxyXG5cdFx0XHRsZXQgcHJvbWlzZXMgPSBbXTtcclxuXHJcblx0XHRcdGZvcihsZXQgX2tleSBvZiBPYmplY3QuZ2V0T3duUHJvcGVydHlOYW1lcyhrZXkpKSB7XHJcblx0XHRcdFx0cHJvbWlzZXMucHVzaChcclxuXHRcdFx0XHRcdHRoaXMuX2FkYXB0ZXIuc2V0KHtcclxuXHRcdFx0XHRcdFx0aWQ6IF9rZXksXHJcblx0XHRcdFx0XHRcdHZhbHVlOiBrZXlbX2tleV0sXHJcblx0XHRcdFx0XHRcdG1vZGlmaWVkOiBEYXRlLm5vdygpXHJcblx0XHRcdFx0XHR9KVxyXG5cdFx0XHRcdCk7XHJcblxyXG5cdFx0XHRcdC8vIHRyaWdnZXIgdGhlIGNoYW5nZVxyXG5cdFx0XHRcdHRoaXMuZW1pdChfa2V5LCBrZXlbX2tleV0pO1xyXG5cdFx0XHR9XHJcblxyXG5cdFx0XHRyZXR1cm4gUHJvbWlzZS5hbGwocHJvbWlzZXMpO1xyXG5cdFx0fVxyXG5cdH1cclxuXHJcblx0IC8qKlxyXG5cdCAgKiBXYXRjaCB0aGUgdmFsdWUgZm9yIGNoYW5nZXNcclxuXHQgICpcclxuXHQgICogb3B0cy5jdXJyZW50IC0gc2VuZCB0aGUgY3VycmVudCB2YWx1ZSBvZiBrZXkgKGRlZmF1bHQ6IGZhbHNlKVxyXG5cdCAgKiBvcHRzLmRlZmF1bHQgLSB0aGUgZGVmYXVsdCB2YWx1ZSB0byBzZW5kIGZvciBvcHRzLmN1cnJlbnRcclxuXHQgICovXHJcblx0IHdhdGNoKGtleSwgb3B0cywgZm4pIHtcclxuXHRcdCAvLyBtYWtlIG9wdHMgb3B0aW9uYWxcclxuXHRcdCBpZih0eXBlb2Ygb3B0cyA9PSBcImZ1bmN0aW9uXCIpIHtcclxuXHRcdFx0IGZuID0gb3B0cztcclxuXHRcdFx0IG9wdHMgPSB7fTtcclxuXHRcdCB9XHJcblxyXG5cdFx0IC8vIHNlbmQgdGhlIGN1cnJlbnQgdmFsdWVcclxuXHRcdCBpZihvcHRzLmN1cnJlbnQpIHtcclxuXHRcdFx0IHRoaXMuZ2V0KGtleSwgb3B0cy5kZWZhdWx0KVxyXG5cdFx0XHQgXHQudGhlbih2YWx1ZSA9PiBmbih2YWx1ZSkpO1xyXG5cdFx0IH1cclxuXHJcblx0XHQgLy8gbGlzdGVuIGZvciBhbnkgY2hhbmdlc1xyXG5cdFx0IHJldHVybiB0aGlzLm9uKGtleSwgdmFsdWUgPT4ge1xyXG5cdFx0XHQgLy8gb25seSBlbWl0IHRoZSBjaGFuZ2UgaWYgdGhlcmUgaXMgbm90IGFuIG92ZXJyaWRlIGluIHBsYWNlXHJcblx0XHRcdCBpZighdGhpcy5fb3ZlcnJpZGVzIHx8ICF0aGlzLl9vdmVycmlkZXMuaGFzT3duUHJvcGVydHkoa2V5KSkge1xyXG5cdFx0XHRcdCBmbih2YWx1ZSk7XHJcblx0XHRcdCB9XHJcblx0XHQgfSk7XHJcblx0IH1cclxuXHJcblx0IC8qKlxyXG5cdCAgKiBPdmVycmlkZSB0aGUgdmFsdWVzIGZyb20gdGhlIGFkYXB0b3Igd2l0aG91dCB3cml0aW5nIHRvIHRoZW1cclxuXHQgICpcclxuXHQgICogVXNlZnVsIGZvciBjb21iaW5pbmcganNvbiBzZXR0aW5ncyB3aXRoIGNvbW1hbmQgbGluZSBmbGFnc1xyXG5cdCAgKi9cclxuXHQgc2V0T3ZlcnJpZGVzKG92ZXJyaWRlcykge1xyXG5cdFx0IHRoaXMuX292ZXJyaWRlcyA9IG92ZXJyaWRlcztcclxuXHJcblx0XHQgLy8gZW1pdCBjaGFuZ2VzIGZvciBlYWNoIG9mIHRoZSBvdmVycmlkZXNcclxuXHRcdCBPYmplY3QuZ2V0T3duUHJvcGVydHlOYW1lcyhvdmVycmlkZXMpXHJcblxyXG5cdFx0IC5mb3JFYWNoKGtleSA9PiB0aGlzLmVtaXQoa2V5LCBvdmVycmlkZXNba2V5XSkpO1xyXG5cdCB9XHJcbn1cclxuXHJcbm1vZHVsZS5leHBvcnRzID0gS2V5VmFsdWVTdG9yZTtcclxuIiwiLyoqXHJcbiAqIEFuIGluIG1lbW9yeSBhZGFwdGVyIGZvciBkYXRhIHN0b3Jlc1xyXG4gKi9cclxuXHJcbmNsYXNzIE1lbUFkYXB0b3Ige1xyXG5cdGNvbnN0cnVjdG9yKCkge1xyXG5cdFx0dGhpcy5fZGF0YSA9IHt9O1xyXG5cdH1cclxuXHJcblx0LyoqXHJcblx0ICogR2V0IGFuIGFycmF5IG9mIHZhbHVlc1xyXG5cdCAqL1xyXG5cdGdldEFsbCgpIHtcclxuXHRcdHJldHVybiBQcm9taXNlLnJlc29sdmUoXHJcblx0XHRcdE9iamVjdC5nZXRPd25Qcm9wZXJ0eU5hbWVzKHRoaXMuX2RhdGEpXHJcblxyXG5cdFx0XHQubWFwKG5hbWUgPT4gdGhpcy5fZGF0YVtuYW1lXSlcclxuXHRcdCk7XHJcblx0fVxyXG5cclxuXHQvKipcclxuXHQgKiBMb29rdXAgYSB2YWx1ZVxyXG5cdCAqXHJcblx0ICogcmV0dXJucyB7aWQsIHZhbHVlfVxyXG5cdCAqL1xyXG5cdGdldChpZCkge1xyXG5cdFx0Ly8gY2hlY2sgaWYgd2UgaGF2ZSB0aGUgdmFsdWVcclxuXHRcdGlmKHRoaXMuX2RhdGEuaGFzT3duUHJvcGVydHkoaWQpKSB7XHJcblx0XHRcdHJldHVybiBQcm9taXNlLnJlc29sdmUodGhpcy5fZGF0YVtpZF0pO1xyXG5cdFx0fVxyXG5cclxuXHRcdHJldHVybiBQcm9taXNlLnJlc29sdmUoKTtcclxuXHR9XHJcblxyXG5cdC8qKlxyXG5cdCAqIFN0b3JlIGEgdmFsdWVcclxuXHQgKlxyXG5cdCAqIFRoZSB2YWx1ZSBpcyBzdG9yZWQgYnkgaXRzIGlkIHByb3BlcnR5XHJcblx0ICovXHJcblx0c2V0KHZhbHVlKSB7XHJcblx0XHQvLyBzdG9yZSB0aGUgdmFsdWVcclxuXHRcdHRoaXMuX2RhdGFbdmFsdWUuaWRdID0gdmFsdWU7XHJcblxyXG5cdFx0cmV0dXJuIFByb21pc2UucmVzb2x2ZSgpO1xyXG5cdH1cclxuXHJcblx0LyoqXHJcblx0ICogUmVtb3ZlIGEgdmFsdWUgZnJvbSB0aGUgYWRhcHRvclxyXG5cdCAqL1xyXG5cdHJlbW92ZShrZXkpIHtcclxuXHRcdGRlbGV0ZSB0aGlzLl9kYXRhW2tleV07XHJcblxyXG5cdFx0cmV0dXJuIFByb21pc2UucmVzb2x2ZSgpO1xyXG5cdH1cclxufVxyXG5cclxubW9kdWxlLmV4cG9ydHMgPSBNZW1BZGFwdG9yO1xyXG4iLCIvKipcclxuICogQSBkYXRhIHN0b3JlIHdoaWNoIGNvbnRhaW5zIGEgcG9vbCBvZiBvYmplY3RzIHdoaWNoIGFyZSBxdWVyeWFibGUgYnkgYW55IHByb3BlcnR5XHJcbiAqL1xyXG5cclxuY2xhc3MgUG9vbFN0b3JlIGV4dGVuZHMgbGlmZUxpbmUuRXZlbnRFbWl0dGVyIHtcclxuXHRjb25zdHJ1Y3RvcihhZGFwdG9yKSB7XHJcblx0XHRzdXBlcigpO1xyXG5cdFx0dGhpcy5fYWRhcHRvciA9IGFkYXB0b3I7XHJcblx0fVxyXG5cclxuXHQvKipcclxuXHQgKiBHZXQgYWxsIGl0ZW1zIG1hdGNpbmcgdGhlIHByb3ZpZGVkIHByb3BlcnRpZXNcclxuXHQgKi9cclxuXHRxdWVyeShwcm9wcywgb3B0cywgZm4pIHtcclxuXHRcdC8vIG1ha2Ugb3B0cyBvcHRpb25hbFxyXG5cdFx0aWYodHlwZW9mIG9wdHMgPT0gXCJmdW5jdGlvblwiKSB7XHJcblx0XHRcdGZuID0gb3B0cztcclxuXHRcdFx0b3B0cyA9IHt9O1xyXG5cdFx0fVxyXG5cclxuXHRcdG9wdHMgfHwgKG9wdHMgPSB7fSk7XHJcblxyXG5cdFx0Ly8gY2hlY2sgaWYgYSB2YWx1ZSBtYXRjaGVzIHRoZSBxdWVyeVxyXG5cdFx0dmFyIGZpbHRlciA9IHZhbHVlID0+IHtcclxuXHRcdFx0Ly8gY2hlY2sgdGhhdCBhbGwgdGhlIHByb3BlcnRpZXMgbWF0Y2hcclxuXHRcdFx0cmV0dXJuIE9iamVjdC5nZXRPd25Qcm9wZXJ0eU5hbWVzKHByb3BzKVxyXG5cclxuXHRcdFx0LmV2ZXJ5KHByb3BOYW1lID0+IHtcclxuXHRcdFx0XHQvLyBhIGZ1bmN0aW9uIHRvIGNoZWNrIGlmIGEgdmFsdWUgbWF0Y2hlc1xyXG5cdFx0XHRcdGlmKHR5cGVvZiBwcm9wc1twcm9wTmFtZV0gPT0gXCJmdW5jdGlvblwiKSB7XHJcblx0XHRcdFx0XHRyZXR1cm4gcHJvcHNbcHJvcE5hbWVdKHZhbHVlW3Byb3BOYW1lXSk7XHJcblx0XHRcdFx0fVxyXG5cdFx0XHRcdC8vIHBsYWluIGVxdWFsaXR5XHJcblx0XHRcdFx0ZWxzZSB7XHJcblx0XHRcdFx0XHRyZXR1cm4gcHJvcHNbcHJvcE5hbWVdID09IHZhbHVlW3Byb3BOYW1lXVxyXG5cdFx0XHRcdH1cclxuXHRcdFx0fSk7XHJcblx0XHR9O1xyXG5cclxuXHRcdC8vIGtlZXAgdHJhY2sgb2YgdGhlIGN1cnJlbnQgbGlzdCBvZiBpdGVtcyBzbyB3aGVuIGl0ZW1zXHJcblx0XHQvLyBzdG9wIGZpdGluZyB0aGUgcXVlcnkgd2UgY2FuIG5vdGlmeSB0aGUgY29uc3VtZXJcclxuXHRcdHZhciBjdXJyZW50SXRlbXMgPSBbXTtcclxuXHJcblx0XHQvLyBnZXQgYWxsIGN1cnJlbnQgaXRlbXMgdGhhdCBtYXRjaCB0aGUgZmlsdGVyXHJcblx0XHR2YXIgY3VycmVudCA9IHRoaXMuX2FkYXB0b3IuZ2V0QWxsKClcclxuXHJcblx0XHQudGhlbih2YWx1ZXMgPT4ge1xyXG5cdFx0XHR2YXIgbWF0Y2hlcyA9IHZhbHVlcy5maWx0ZXIoZmlsdGVyKTtcclxuXHJcblx0XHRcdC8vIHRyYWNrIHRoZSBpZFxyXG5cdFx0XHRmb3IobGV0IHZhbHVlIG9mIG1hdGNoZXMpIHtcclxuXHRcdFx0XHRjdXJyZW50SXRlbXMucHVzaCh2YWx1ZS5pZCk7XHJcblx0XHRcdH1cclxuXHJcblx0XHRcdHJldHVybiBtYXRjaGVzO1xyXG5cdFx0fSk7XHJcblxyXG5cdFx0Ly8gb3B0aW9uYWx5IHJ1biBjaGFuZ2VzIHRocm91Z2ggdGhlIHF1ZXJ5IGFzIHdlbGxcclxuXHRcdGlmKG9wdHMud2F0Y2gpIHtcclxuXHRcdFx0Ly8gd3JhcCB0aGUgdmFsdWVzIGluIGNoYW5nZSBvYmplY3RzIGFuZCBzZW5kIHRoZSB0byB0aGUgY29uc3VtZXJcclxuXHRcdFx0Y3VycmVudC50aGVuKHZhbHVlcyA9PiB7XHJcblx0XHRcdFx0Ly8gc2VuZCB0aGUgdmFsdWVzIHdlIGN1cnJlbnRseSBoYXZlXHJcblx0XHRcdFx0Zm9yKGxldCB2YWx1ZSBvZiB2YWx1ZXMpIHtcclxuXHRcdFx0XHRcdGZuKHsgdHlwZTogXCJjaGFuZ2VcIiwgaWQ6IHZhbHVlLmlkLCB2YWx1ZSB9KTtcclxuXHRcdFx0XHR9XHJcblxyXG5cdFx0XHRcdC8vIHdhdGNoIGZvciBjaGFuZ2VzIGFmdGVyIHRoZSBpbml0aWFsIHZhbHVlcyBhcmUgc2VuZFxyXG5cdFx0XHRcdHRoaXMub24oXCJjaGFuZ2VcIiwgY2hhbmdlID0+IHtcclxuXHRcdFx0XHRcdGlmKGNoYW5nZS50eXBlID09IFwiY2hhbmdlXCIpIHtcclxuXHRcdFx0XHRcdFx0Ly8gY2hlY2sgaWYgdGhlIHZhbHVlIG1hdGNoZXMgdGhlIHF1ZXJ5XHJcblx0XHRcdFx0XHRcdGxldCBtYXRjaGVzID0gZmlsdGVyKGNoYW5nZS52YWx1ZSk7XHJcblxyXG5cdFx0XHRcdFx0XHRpZihtYXRjaGVzKSB7XHJcblx0XHRcdFx0XHRcdFx0Ly8gaWYgdGhpcyBpc24ndCBpbiB0aGUgY3VycmVudEl0ZW1zIGxpc3QgYWRkIGl0XHJcblx0XHRcdFx0XHRcdFx0aWYoY3VycmVudEl0ZW1zLmluZGV4T2YoY2hhbmdlLmlkKSA9PT0gLTEpIHtcclxuXHRcdFx0XHRcdFx0XHRcdGN1cnJlbnRJdGVtcy5wdXNoKGNoYW5nZS5pZCk7XHJcblx0XHRcdFx0XHRcdFx0fVxyXG5cclxuXHRcdFx0XHRcdFx0XHQvLyBwYXNzIHRoZSBjaGFuZ2UgYWxvbmdcclxuXHRcdFx0XHRcdFx0XHRmbihjaGFuZ2UpO1xyXG5cdFx0XHRcdFx0XHR9XHJcblx0XHRcdFx0XHRcdC8vIHRlbGwgdGhlIGNvbnN1bWVyIHRoaXMgdmFsdWUgbm8gbG9uZ2VyIG1hdGNoZXNcclxuXHRcdFx0XHRcdFx0ZWxzZSBpZihjdXJyZW50SXRlbXMuaW5kZXhPZihjaGFuZ2UuaWQpICE9PSAtMSkge1xyXG5cdFx0XHRcdFx0XHRcdC8vIHJlbW92ZSB0aGUgaXRlbSBmcm9tIHRoZSBjdXJyZW50IGl0ZW1zIGxpc3RcclxuXHRcdFx0XHRcdFx0XHRjdXJyZW50SXRlbXMuc3BsaWNlKGN1cnJlbnRJdGVtcy5pbmRleE9mKGNoYW5nZS5pZCksIDEpO1xyXG5cclxuXHRcdFx0XHRcdFx0XHRmbih7XHJcblx0XHRcdFx0XHRcdFx0XHR0eXBlOiBcInVubWF0Y2hcIixcclxuXHRcdFx0XHRcdFx0XHRcdGlkOiBjaGFuZ2UuaWRcclxuXHRcdFx0XHRcdFx0XHR9KTtcclxuXHRcdFx0XHRcdFx0fVxyXG5cdFx0XHRcdFx0fVxyXG5cdFx0XHRcdFx0ZWxzZSBpZihjaGFuZ2UudHlwZSA9PSBcInJlbW92ZVwiICYmIGN1cnJlbnRJdGVtcy5pbmRleE9mKGNoYW5nZS5pZCkgIT09IC0xKSB7XHJcblx0XHRcdFx0XHRcdC8vIHJlbW92ZSB0aGUgaXRlbSBmcm9tIHRoZSBjdXJyZW50IGl0ZW1zIGxpc3RcclxuXHRcdFx0XHRcdFx0Y3VycmVudEl0ZW1zLnNwbGljZShjdXJyZW50SXRlbXMuaW5kZXhPZihjaGFuZ2UuaWQpLCAxKTtcclxuXHJcblx0XHRcdFx0XHRcdGZuKHtcclxuXHRcdFx0XHRcdFx0XHR0eXBlOiBcInJlbW92ZVwiLFxyXG5cdFx0XHRcdFx0XHRcdGlkOiBjaGFuZ2UuaWRcclxuXHRcdFx0XHRcdFx0fSk7XHJcblx0XHRcdFx0XHR9XHJcblx0XHRcdFx0fSk7XHJcblx0XHRcdH0pO1xyXG5cdFx0fVxyXG5cdFx0ZWxzZSB7XHJcblx0XHRcdHJldHVybiBjdXJyZW50O1xyXG5cdFx0fVxyXG5cdH1cclxuXHJcblx0LyoqXHJcblx0ICogU3RvcmUgYSB2YWx1ZSBpbiB0aGUgcG9vbFxyXG5cdCAqL1xyXG5cdHNldCh2YWx1ZSkge1xyXG5cdFx0Ly8gc2V0IHRoZSBtb2RpZmllZCBkYXRlXHJcblx0XHR2YWx1ZS5tb2RpZmllZCA9IERhdGUubm93KCk7XHJcblxyXG5cdFx0Ly8gc3RvcmUgdGhlIHZhbHVlIGluIHRoZSBhZGFwdG9yXHJcblx0XHR0aGlzLl9hZGFwdG9yLnNldCh2YWx1ZSk7XHJcblxyXG5cdFx0Ly8gcHJvcG9nYXRlIHRoZSBjaGFuZ2VcclxuXHRcdHRoaXMuZW1pdChcImNoYW5nZVwiLCB7XHJcblx0XHRcdHR5cGU6IFwiY2hhbmdlXCIsXHJcblx0XHRcdGlkOiB2YWx1ZS5pZCxcclxuXHRcdFx0dmFsdWVcclxuXHRcdH0pO1xyXG5cdH1cclxuXHJcblx0LyoqXHJcblx0ICogUmVtb3ZlIGEgdmFsdWUgZnJvbSB0aGUgcG9vbFxyXG5cdCAqL1xyXG5cdHJlbW92ZShpZCkge1xyXG5cdFx0Ly8gcmVtb3ZlIHRoZSB2YWx1ZSBmcm9tIHRoZSBhZGFwdG9yXHJcblx0XHR0aGlzLl9hZGFwdG9yLnJlbW92ZShpZCwgRGF0ZS5ub3coKSk7XHJcblxyXG5cdFx0Ly8gcHJvcG9nYXRlIHRoZSBjaGFuZ2VcclxuXHRcdHRoaXMuZW1pdChcImNoYW5nZVwiLCB7XHJcblx0XHRcdHR5cGU6IFwicmVtb3ZlXCIsXHJcblx0XHRcdGlkXHJcblx0XHR9KTtcclxuXHR9XHJcbn1cclxuXHJcbm1vZHVsZS5leHBvcnRzID0gUG9vbFN0b3JlO1xyXG4iLCIvKipcclxuICogQ3JlYXRlIGEgZ2xvYmFsIG9iamVjdCB3aXRoIGNvbW1vbmx5IHVzZWQgbW9kdWxlcyB0byBhdm9pZCA1MCBtaWxsaW9uIHJlcXVpcmVzXHJcbiAqL1xyXG5cclxudmFyIEV2ZW50RW1pdHRlciA9IHJlcXVpcmUoXCIuL3V0aWwvZXZlbnQtZW1pdHRlclwiKTtcclxuXHJcbnZhciBsaWZlTGluZSA9IG5ldyBFdmVudEVtaXR0ZXIoKTtcclxuXHJcbi8vIHBsYXRmb3JtIGRldGVjdGlvblxyXG5saWZlTGluZS5ub2RlID0gdHlwZW9mIHByb2Nlc3MgPT0gXCJvYmplY3RcIjtcclxubGlmZUxpbmUuYnJvd3NlciA9IHR5cGVvZiB3aW5kb3cgPT0gXCJvYmplY3RcIjtcclxuXHJcbi8vIGF0dGFjaCB1dGlsc1xyXG5saWZlTGluZS5EaXNwb3NhYmxlID0gcmVxdWlyZShcIi4vdXRpbC9kaXNwb3NhYmxlXCIpO1xyXG5saWZlTGluZS5FdmVudEVtaXR0ZXIgPSBFdmVudEVtaXR0ZXI7XHJcblxyXG4vLyBhdHRhY2ggbGlmZWxpbmUgdG8gdGhlIGdsb2JhbCBvYmplY3RcclxuKGxpZmVMaW5lLm5vZGUgPyBnbG9iYWwgOiBicm93c2VyKS5saWZlTGluZSA9IGxpZmVMaW5lO1xyXG5cclxuLy8gYXR0YWNoIGNvbmZpZ1xyXG52YXIgTWVtQWRhcHRvciA9IHJlcXVpcmUoXCIuL2RhdGEtc3RvcmVzL21lbS1hZGFwdG9yXCIpO1xyXG52YXIgS2V5VmFsdWVTdG9yZSA9IHJlcXVpcmUoXCIuL2RhdGEtc3RvcmVzL2tleS12YWx1ZS1zdG9yZVwiKTtcclxuXHJcbmxpZmVMaW5lLmNvbmZpZyA9IG5ldyBLZXlWYWx1ZVN0b3JlKG5ldyBNZW1BZGFwdG9yKCkpO1xyXG4iLCIvKipcclxuICogS2VlcCBhIGxpc3Qgb2Ygc3Vic2NyaXB0aW9ucyB0byB1bnN1YnNjcmliZSBmcm9tIHRvZ2V0aGVyXHJcbiAqL1xyXG5cclxuY2xhc3MgRGlzcG9zYWJsZSB7XHJcblx0Y29uc3RydWN0b3IoKSB7XHJcblx0XHR0aGlzLl9zdWJzY3JpcHRpb25zID0gW107XHJcblx0fVxyXG5cclxuXHQvLyBVbnN1YnNjcmliZSBmcm9tIGFsbCBzdWJzY3JpcHRpb25zXHJcblx0ZGlzcG9zZSgpIHtcclxuXHRcdC8vIHJlbW92ZSB0aGUgZmlyc3Qgc3Vic2NyaXB0aW9uIHVudGlsIHRoZXJlIGFyZSBub25lIGxlZnRcclxuXHRcdHdoaWxlKHRoaXMuX3N1YnNjcmlwdGlvbnMubGVuZ3RoID4gMCkge1xyXG5cdFx0XHR0aGlzLl9zdWJzY3JpcHRpb25zLnNoaWZ0KCkudW5zdWJzY3JpYmUoKTtcclxuXHRcdH1cclxuXHR9XHJcblxyXG5cdC8vIEFkZCBhIHN1YnNjcmlwdGlvbiB0byB0aGUgZGlzcG9zYWJsZVxyXG5cdGFkZChzdWJzY3JpcHRpb24pIHtcclxuXHRcdHRoaXMuX3N1YnNjcmlwdGlvbnMucHVzaChzdWJzY3JpcHRpb24pO1xyXG5cdH1cclxuXHJcblx0Ly8gZGlzcG9zZSB3aGVuIGFuIGV2ZW50IGlzIGZpcmVkXHJcblx0ZGlzcG9zZU9uKGVtaXR0ZXIsIGV2ZW50KSB7XHJcblx0XHR0aGlzLmFkZChlbWl0dGVyLm9uKGV2ZW50LCAoKSA9PiB0aGlzLmRpc3Bvc2UoKSkpO1xyXG5cdH1cclxufTtcclxuXHJcbm1vZHVsZS5leHBvcnRzID0gRGlzcG9zYWJsZTtcclxuIiwiLyoqXHJcbiAqIEEgYmFzaWMgZXZlbnQgZW1pdHRlclxyXG4gKi9cclxuXHJcbmNsYXNzIEV2ZW50RW1pdHRlciB7XHJcblx0Y29uc3RydWN0b3IoKSB7XHJcblx0XHR0aGlzLl9saXN0ZW5lcnMgPSB7fTtcclxuXHR9XHJcblxyXG5cdC8qKlxyXG5cdCAqIEFkZCBhbiBldmVudCBsaXN0ZW5lclxyXG5cdCAqL1xyXG5cdG9uKG5hbWUsIGxpc3RlbmVyKSB7XHJcblx0XHQvLyBpZiB3ZSBkb24ndCBoYXZlIGFuIGV4aXN0aW5nIGxpc3RlbmVycyBhcnJheSBjcmVhdGUgb25lXHJcblx0XHRpZighdGhpcy5fbGlzdGVuZXJzW25hbWVdKSB7XHJcblx0XHRcdHRoaXMuX2xpc3RlbmVyc1tuYW1lXSA9IFtdO1xyXG5cdFx0fVxyXG5cclxuXHRcdC8vIGFkZCB0aGUgbGlzdGVuZXJcclxuXHRcdHRoaXMuX2xpc3RlbmVyc1tuYW1lXS5wdXNoKGxpc3RlbmVyKTtcclxuXHJcblx0XHQvLyBnaXZlIHRoZW0gYSBzdWJzY3JpcHRpb25cclxuXHRcdHJldHVybiB7XHJcblx0XHRcdF9saXN0ZW5lcjogbGlzdGVuZXIsXHJcblxyXG5cdFx0XHR1bnN1YnNjcmliZTogKCkgPT4ge1xyXG5cdFx0XHRcdC8vIGZpbmQgdGhlIGxpc3RlbmVyXHJcblx0XHRcdFx0dmFyIGluZGV4ID0gdGhpcy5fbGlzdGVuZXJzW25hbWVdLmluZGV4T2YobGlzdGVuZXIpO1xyXG5cclxuXHRcdFx0XHRpZihpbmRleCAhPT0gLTEpIHtcclxuXHRcdFx0XHRcdHRoaXMuX2xpc3RlbmVyc1tuYW1lXS5zcGxpY2UoaW5kZXgsIDEpO1xyXG5cdFx0XHRcdH1cclxuXHRcdFx0fVxyXG5cdFx0fTtcclxuXHR9XHJcblxyXG5cdC8qKlxyXG5cdCAqIEVtaXQgYW4gZXZlbnRcclxuXHQgKi9cclxuXHRlbWl0KG5hbWUsIC4uLmFyZ3MpIHtcclxuXHRcdC8vIGNoZWNrIGZvciBsaXN0ZW5lcnNcclxuXHRcdGlmKHRoaXMuX2xpc3RlbmVyc1tuYW1lXSkge1xyXG5cdFx0XHRmb3IobGV0IGxpc3RlbmVyIG9mIHRoaXMuX2xpc3RlbmVyc1tuYW1lXSkge1xyXG5cdFx0XHRcdC8vIGNhbGwgdGhlIGxpc3RlbmVyc1xyXG5cdFx0XHRcdGxpc3RlbmVyKC4uLmFyZ3MpO1xyXG5cdFx0XHR9XHJcblx0XHR9XHJcblx0fVxyXG5cclxuXHQvKipcclxuXHQgKiBFbWl0IGFuIGV2ZW50IGFuZCBza2lwIHNvbWUgbGlzdGVuZXJzXHJcblx0ICovXHJcblx0cGFydGlhbEVtaXQobmFtZSwgc2tpcHMgPSBbXSwgLi4uYXJncykge1xyXG5cdFx0Ly8gYWxsb3cgYSBzaW5nbGUgaXRlbVxyXG5cdFx0aWYoIUFycmF5LmlzQXJyYXkoc2tpcHMpKSB7XHJcblx0XHRcdHNraXBzID0gW3NraXBzXTtcclxuXHRcdH1cclxuXHJcblx0XHQvLyBjaGVjayBmb3IgbGlzdGVuZXJzXHJcblx0XHRpZih0aGlzLl9saXN0ZW5lcnNbbmFtZV0pIHtcclxuXHRcdFx0Zm9yKGxldCBsaXN0ZW5lciBvZiB0aGlzLl9saXN0ZW5lcnNbbmFtZV0pIHtcclxuXHRcdFx0XHQvLyB0aGlzIGV2ZW50IGxpc3RlbmVyIGlzIGJlaW5nIHNraXBlZFxyXG5cdFx0XHRcdGlmKHNraXBzLmZpbmQoc2tpcCA9PiBza2lwLl9saXN0ZW5lciA9PSBsaXN0ZW5lcikpIHtcclxuXHRcdFx0XHRcdGNvbnRpbnVlO1xyXG5cdFx0XHRcdH1cclxuXHJcblx0XHRcdFx0Ly8gY2FsbCB0aGUgbGlzdGVuZXJzXHJcblx0XHRcdFx0bGlzdGVuZXIoLi4uYXJncyk7XHJcblx0XHRcdH1cclxuXHRcdH1cclxuXHR9XHJcbn1cclxuXHJcbm1vZHVsZS5leHBvcnRzID0gRXZlbnRFbWl0dGVyO1xyXG4iLCIvKipcclxuICogQWxsIGNsaWVudCBzaWRlIGFuZCBjb21tb24gdGVzdHMgdG8gYnVuZGxlIHRvZ2V0aGVyXHJcbiAqL1xyXG5cclxuLy9yZXF1aXJlKFwiLi9jb21tb24vZGF0YS1zdG9yZXMvaHR0cC1hZGFwdG9yLmpzXCIpO1xyXG5yZXF1aXJlKFwiLi9jb21tb24vZGF0YS1zdG9yZXMva2V5LXZhbHVlLXN0b3JlXCIpO1xyXG5yZXF1aXJlKFwiLi9jb21tb24vZGF0YS1zdG9yZXMvbWVtLWFkYXB0b3JcIik7XHJcbnJlcXVpcmUoXCIuL2NvbW1vbi9kYXRhLXN0b3Jlcy9wb29sLXN0b3JlXCIpO1xyXG5yZXF1aXJlKFwiLi9jb21tb24vdXRpbC9kaXNwb3NhYmxlXCIpO1xyXG5yZXF1aXJlKFwiLi9jb21tb24vYmFja3VwXCIpO1xyXG4iLCJ2YXIgYXNzZXJ0ID0gcmVxdWlyZShcImFzc2VydFwiKTtcclxudmFyIGJhY2t1cCA9IHJlcXVpcmUoXCIuLi8uLi9zcmMvY29tbW9uL2JhY2t1cFwiKTtcclxuXHJcbmRlc2NyaWJlKFwiQmFja3VwXCIsIGZ1bmN0aW9uKCkge1xyXG5cdGl0KFwiY2FuIGdlbmVyYXRlIGJhY2t1cCBuYW1lcyBmcm9tIHRoZSBkYXRlXCIsIGZ1bmN0aW9uKCkge1xyXG5cdFx0YXNzZXJ0LmVxdWFsKFxyXG5cdFx0XHRiYWNrdXAuZ2VuQmFja3VwTmFtZShuZXcgRGF0ZShcIjIwMTctMDEtMDFUMTE6MDA6MDAuMDAwWlwiKSksXHJcblx0XHRcdFwiYmFja3VwLTIwMTctMS0xLTUtMC56aXBcIlxyXG5cdFx0KTtcclxuXHR9KTtcclxufSk7XHJcbiIsInJlcXVpcmUoXCIuLi8uLi8uLi9zcmMvY29tbW9uL2dsb2JhbFwiKTtcclxudmFyIGFzc2VydCA9IHJlcXVpcmUoXCJhc3NlcnRcIik7XHJcbnZhciBNZW1BZGFwdG9yID0gcmVxdWlyZShcIi4uLy4uLy4uL3NyYy9jb21tb24vZGF0YS1zdG9yZXMvbWVtLWFkYXB0b3JcIik7XHJcbnZhciBLZXlWYWx1ZVN0b3JlID0gcmVxdWlyZShcIi4uLy4uLy4uL3NyYy9jb21tb24vZGF0YS1zdG9yZXMva2V5LXZhbHVlLXN0b3JlXCIpO1xyXG5cclxuZGVzY3JpYmUoXCJLZXkgdmFsdWUgc3RvcmVcIiwgZnVuY3Rpb24oKSB7XHJcblx0aXQoXCJjYW4gZ2V0IGEgdmFsdWVcIiwgZnVuY3Rpb24oKSB7XHJcblx0XHQvLyBjcmVhdGUgYW4gYWRhcHRvclxyXG5cdFx0dmFyIGFkYXB0b3IgPSBuZXcgTWVtQWRhcHRvcigpO1xyXG5cclxuXHRcdC8vIHB1dCBhIHZhbHVlIGluIGl0XHJcblx0XHRhZGFwdG9yLnNldCh7IGlkOiBcIkZvb1wiLCB2YWx1ZTogXCJCYXJcIiB9KTtcclxuXHJcblx0XHQvLyBjcmVhdGUgYSBzdG9yZSB1c2luZyB0aGUgYWRhcHRvclxyXG5cdFx0dmFyIHN0b3JlID0gbmV3IEtleVZhbHVlU3RvcmUoYWRhcHRvcik7XHJcblxyXG5cdFx0Ly8gZ2V0IHRoZSB2YWx1ZVxyXG5cdFx0cmV0dXJuIHN0b3JlLmdldChcIkZvb1wiKVxyXG5cclxuXHRcdC50aGVuKHZhbHVlID0+IHtcclxuXHRcdFx0Ly8gY2hlY2sgdGhlIHZhbHVlXHJcblx0XHRcdGFzc2VydC5lcXVhbCh2YWx1ZSwgXCJCYXJcIik7XHJcblx0XHR9KTtcclxuXHR9KTtcclxuXHJcblx0aXQoXCJnaXZlcyB0aGUgZGVmYXVsdCB2YWx1ZSBpZiBubyB2YWx1ZSBpcyBkZWZpbmVkXCIsIGZ1bmN0aW9uKCkge1xyXG5cdFx0Ly8gY3JlYXRlIHRoZSBlbXB0eSBzdG9yZSBhbmQgYWRhcHRvcjtcclxuXHRcdHZhciBzdG9yZSA9IG5ldyBLZXlWYWx1ZVN0b3JlKG5ldyBNZW1BZGFwdG9yKCkpO1xyXG5cclxuXHRcdC8vIGdldCB0aGUgZGVmYXVsdCB2YWx1ZVxyXG5cdFx0cmV0dXJuIHN0b3JlLmdldChcIkZvb1wiLCBcIkJhclwiKVxyXG5cclxuXHRcdC50aGVuKHZhbHVlID0+IHtcclxuXHRcdFx0YXNzZXJ0LmVxdWFsKHZhbHVlLCBcIkJhclwiKTtcclxuXHRcdH0pO1xyXG5cdH0pO1xyXG5cclxuXHRpdChcImNhbiBvdmVycmlkZSB2YWx1ZXNcIiwgZnVuY3Rpb24oKSB7XHJcblx0XHQvLyBjcmVhdGUgYW4gYWRhcHRvclxyXG5cdFx0dmFyIGFkYXB0b3IgPSBuZXcgTWVtQWRhcHRvcigpO1xyXG5cclxuXHRcdC8vIHB1dCBhIHZhbHVlIGluIGl0XHJcblx0XHRhZGFwdG9yLnNldCh7IGlkOiBcIkZvb1wiLCB2YWx1ZTogXCJCYXJcIiB9KTtcclxuXHJcblx0XHQvLyBjcmVhdGUgYSBzdG9yZSB1c2luZyB0aGUgYWRhcHRvclxyXG5cdFx0dmFyIHN0b3JlID0gbmV3IEtleVZhbHVlU3RvcmUoYWRhcHRvcik7XHJcblxyXG5cdFx0Ly8gcHV0IGluIG92ZXJyaWRlcyBmb3IgRm9vXHJcblx0XHRzdG9yZS5zZXRPdmVycmlkZXMoe1xyXG5cdFx0XHRGb28gOiBcIkJhelwiXHJcblx0XHR9KTtcclxuXHJcblx0XHQvLyBnZXQgdGhlIHZhbHVlXHJcblx0XHRyZXR1cm4gc3RvcmUuZ2V0KFwiRm9vXCIpXHJcblxyXG5cdFx0LnRoZW4odmFsdWUgPT4ge1xyXG5cdFx0XHQvLyBjaGVjayB0aGUgdmFsdWVcclxuXHRcdFx0YXNzZXJ0LmVxdWFsKHZhbHVlLCBcIkJhelwiKTtcclxuXHRcdH0pO1xyXG5cdH0pO1xyXG5cclxuXHRpdChcImNhbiBzdG9yZSB2YWx1ZXNcIiwgZnVuY3Rpb24oKSB7XHJcblx0XHQvLyBjcmVhdGUgdGhlIGVtcHR5IHN0b3JlIGFuZCBhZGFwdG9yXHJcblx0XHR2YXIgYWRhcHRvciA9IG5ldyBNZW1BZGFwdG9yKCk7XHJcblx0XHR2YXIgc3RvcmUgPSBuZXcgS2V5VmFsdWVTdG9yZShhZGFwdG9yKTtcclxuXHJcblx0XHQvLyBzdG9yZSB0aGUgdmFsdWVcclxuXHRcdHN0b3JlLnNldChcIkZvb1wiLCBcIkJhclwiKTtcclxuXHJcblx0XHQvLyBjaGVjayB0aGUgdmFsdWVcclxuXHRcdHJldHVybiBhZGFwdG9yLmdldChcIkZvb1wiKVxyXG5cclxuXHRcdC50aGVuKHZhbHVlID0+IHtcclxuXHRcdFx0Ly8gcmVtb3ZlIHRoZSBtb2RpZmllZCBkYXRlXHJcblx0XHRcdGRlbGV0ZSB2YWx1ZS5tb2RpZmllZDtcclxuXHJcblx0XHRcdGFzc2VydC5kZWVwRXF1YWwodmFsdWUsIHtcclxuXHRcdFx0XHRpZDogXCJGb29cIixcclxuXHRcdFx0XHR2YWx1ZTogXCJCYXJcIlxyXG5cdFx0XHR9KTtcclxuXHRcdH0pO1xyXG5cdH0pO1xyXG5cclxuXHRpdChcImNhbiBzdG9yZSB2YWx1ZXMgKG9iamVjdCBmb3JtKVwiLCBmdW5jdGlvbigpIHtcclxuXHRcdC8vIGNyZWF0ZSB0aGUgZW1wdHkgc3RvcmUgYW5kIGFkYXB0b3JcclxuXHRcdHZhciBhZGFwdG9yID0gbmV3IE1lbUFkYXB0b3IoKTtcclxuXHRcdHZhciBzdG9yZSA9IG5ldyBLZXlWYWx1ZVN0b3JlKGFkYXB0b3IpO1xyXG5cclxuXHRcdC8vIHN0b3JlIHRoZSB2YWx1ZVxyXG5cdFx0c3RvcmUuc2V0KHsgRm9vOiBcIkJhclwiIH0pO1xyXG5cclxuXHRcdC8vIGNoZWNrIHRoZSB2YWx1ZVxyXG5cdFx0cmV0dXJuIGFkYXB0b3IuZ2V0KFwiRm9vXCIpXHJcblxyXG5cdFx0LnRoZW4odmFsdWUgPT4ge1xyXG5cdFx0XHQvLyByZW1vdmUgdGhlIG1vZGlmaWVkIGRhdGVcclxuXHRcdFx0ZGVsZXRlIHZhbHVlLm1vZGlmaWVkO1xyXG5cclxuXHRcdFx0YXNzZXJ0LmRlZXBFcXVhbCh2YWx1ZSwge1xyXG5cdFx0XHRcdGlkOiBcIkZvb1wiLFxyXG5cdFx0XHRcdHZhbHVlOiBcIkJhclwiXHJcblx0XHRcdH0pO1xyXG5cdFx0fSk7XHJcblx0fSk7XHJcblxyXG5cdGl0KFwiY2FuIHdhdGNoIGNoYW5nZXMgaW4gdGhlIHN0b3JlXCIsIGZ1bmN0aW9uKCkge1xyXG5cdFx0Ly8gY3JlYXRlIHRoZSBzdG9yZSBhbmQgYWRhcHRvclxyXG5cdFx0dmFyIHN0b3JlID0gbmV3IEtleVZhbHVlU3RvcmUobmV3IE1lbUFkYXB0b3IoKSk7XHJcblxyXG5cdFx0Ly8gY29sbGVjdCBhbGwgdmF1bGVzIHRoYXQgY29tZSB0aHJvdWdoIHRoZSB3YXRjaGVyXHJcblx0XHR2YXIgY2hhbmdlcyA9IFtdO1xyXG5cclxuXHRcdC8vIHdhdGNoIGZvciBjaGFuZ2VzIHRvIHRoZSBcInJlYWxcIiBrZXlcclxuXHRcdHZhciBzdWJzY3JpcHRpb24gPSBzdG9yZS53YXRjaChcInJlYWxcIiwgY2hhbmdlID0+IGNoYW5nZXMucHVzaChjaGFuZ2UpKTtcclxuXHJcblx0XHQvLyB0cmlnZ2VyIHNvbWUgY2hhbmdlc1xyXG5cdFx0c3RvcmUuc2V0KFwicmVhbFwiLCBcIk9rXCIpO1xyXG5cdFx0c3RvcmUuc2V0KFwicmVhbFwiLCBcIk9rXCIpO1xyXG5cclxuXHRcdC8vIGNoYW5nZSBhbm90aGVyIHByb3BlcnR5IChzaG91bGQgbm90IHRyaWdnZXIgYSBjaGFuZ2UpXHJcblx0XHRzdG9yZS5zZXQoXCJvdGhlclwiLCBcIk90aGVyIHByb3BlcnR5XCIpO1xyXG5cclxuXHRcdC8vIHN0b3AgbGlzdGVuaW5nXHJcblx0XHRzdWJzY3JpcHRpb24udW5zdWJzY3JpYmUoKTtcclxuXHJcblx0XHQvLyBjaGFuZ2UgdGhlIHJlYWwgdmFsdWUgdGhpcyBzaG91bGQgbm90IGNhdXNlIGFueSBjaGFuZ2VzXHJcblx0XHRzdG9yZS5zZXQoXCJyZWFsXCIsIFwiVW5zdWJzY3JpYmVkXCIpO1xyXG5cclxuXHRcdGFzc2VydC5kZWVwRXF1YWwoY2hhbmdlcywgW1wiT2tcIiwgXCJPa1wiXSk7XHJcblx0fSk7XHJcbn0pO1xyXG4iLCJyZXF1aXJlKFwiLi4vLi4vLi4vc3JjL2NvbW1vbi9nbG9iYWxcIik7XHJcbnZhciBhc3NlcnQgPSByZXF1aXJlKFwiYXNzZXJ0XCIpO1xyXG52YXIgTWVtQWRhcHRvciA9IHJlcXVpcmUoXCIuLi8uLi8uLi9zcmMvY29tbW9uL2RhdGEtc3RvcmVzL21lbS1hZGFwdG9yXCIpO1xyXG5cclxuZGVzY3JpYmUoXCJJbiBtZW1vcnkgYWRhcHRvclwiLCBmdW5jdGlvbigpIHtcclxuXHRpdChcIlJldHVybnMgdW5kZWZpbmVkIGlmIHRoZXJlIGlzIG5vIHZhbHVlXCIsIGZ1bmN0aW9uKCkge1xyXG5cdFx0dmFyIG1lbUFkYXB0b3IgPSBuZXcgTWVtQWRhcHRvcigpO1xyXG5cclxuXHRcdC8vIHJldHJldmUgdGhlIHZhbHVlXHJcblx0XHRyZXR1cm4gbWVtQWRhcHRvci5nZXQoXCJub3QtZGVmaW5lZFwiKVxyXG5cclxuXHRcdC50aGVuKHJlc3VsdCA9PiB7XHJcblx0XHRcdGFzc2VydC5lcXVhbChyZXN1bHQsIHVuZGVmaW5lZCk7XHJcblx0XHR9KTtcclxuXHR9KTtcclxuXHJcblx0aXQoXCJWYWx1ZXMgY2FuIGJlIHN0b3JlZCBhbmQgcmV0cmV2ZWRcIiwgZnVuY3Rpb24oKSB7XHJcblx0XHR2YXIgbWVtQWRhcHRvciA9IG5ldyBNZW1BZGFwdG9yKCk7XHJcblxyXG5cdFx0Ly8gc3RvcmUgdGhlIHZhbHVlXHJcblx0XHR2YXIgcHJvbWlzZSA9IG1lbUFkYXB0b3Iuc2V0KHtcclxuXHRcdFx0aWQ6IFwiZm9vXCIsXHJcblx0XHRcdHZhbHVlOiBcIllheSFcIlxyXG5cdFx0fSk7XHJcblxyXG5cdFx0Ly8gbWFrZSBzdXJlIHNldCBpcyByZXR1cmluZyBhIHByb21pc2VcclxuXHRcdGFzc2VydChwcm9taXNlIGluc3RhbmNlb2YgUHJvbWlzZSk7XHJcblxyXG5cdFx0Ly8gcmV0cmV2ZSB0aGUgdmFsdWVcclxuXHRcdHJldHVybiBtZW1BZGFwdG9yLmdldChcImZvb1wiKVxyXG5cclxuXHRcdC50aGVuKHJlc3VsdCA9PiB7XHJcblx0XHRcdGFzc2VydC5kZWVwRXF1YWwocmVzdWx0LCB7XHJcblx0XHRcdFx0aWQ6IFwiZm9vXCIsXHJcblx0XHRcdFx0dmFsdWU6IFwiWWF5IVwiXHJcblx0XHRcdH0pO1xyXG5cdFx0fSk7XHJcblx0fSk7XHJcbn0pO1xyXG4iLCJyZXF1aXJlKFwiLi4vLi4vLi4vc3JjL2NvbW1vbi9nbG9iYWxcIik7XHJcbnZhciBhc3NlcnQgPSByZXF1aXJlKFwiYXNzZXJ0XCIpO1xyXG52YXIgTWVtQWRhcHRvciA9IHJlcXVpcmUoXCIuLi8uLi8uLi9zcmMvY29tbW9uL2RhdGEtc3RvcmVzL21lbS1hZGFwdG9yXCIpO1xyXG52YXIgUG9vbFN0b3JlID0gcmVxdWlyZShcIi4uLy4uLy4uL3NyYy9jb21tb24vZGF0YS1zdG9yZXMvcG9vbC1zdG9yZVwiKTtcclxuXHJcbmRlc2NyaWJlKFwiUG9vbCBzdG9yZVwiLCBmdW5jdGlvbigpIHtcclxuXHRpdChcIm9iamVjdHMgY2FuIGJlIHF1ZXJpZWQgYnkgYW55IHByb3BlcnR5XCIsIGZ1bmN0aW9uKGRvbmUpIHtcclxuXHRcdC8vIGNyZWF0ZSBhbiBhZHBhdG9yIGFuZCBzdG9yZSBmb3IgdGVzdGluZ1xyXG5cdFx0dmFyIHBvb2wgPSBuZXcgUG9vbFN0b3JlKG5ldyBNZW1BZGFwdG9yKCkpO1xyXG5cclxuXHRcdC8vIGZpbGwgdGhlIGFkYXB0b3JcclxuXHRcdHBvb2wuc2V0KHsgaWQ6IFwiZm9vXCIsIG5hbWU6IFwiRm9vXCIsIHR5cGU6IFwiYVwiIH0pO1xyXG5cdFx0cG9vbC5zZXQoeyBpZDogXCJiYXJcIiwgbmFtZTogXCJCYXJcIiwgdHlwZTogXCJiXCIgfSk7XHJcblx0XHRwb29sLnNldCh7IGlkOiBcImJhelwiLCBuYW1lOiBcIkJhelwiLCB0eXBlOiBcImFcIiB9KTtcclxuXHJcblx0XHQvLyBxdWVyeSBhbGwgdHlwZSBhIGVsZW1lbnRzXHJcblx0XHRwb29sLnF1ZXJ5KHsgdHlwZTogXCJhXCIgfSlcclxuXHJcblx0XHQudGhlbihjb2xsZWN0aW9uID0+IHtcclxuXHRcdFx0Ly8gcmVtb3ZlIG1vZGlmaWVkIGRhdGVzXHJcblx0XHRcdGZvcihsZXQgdmFsdWUgb2YgY29sbGVjdGlvbikge1xyXG5cdFx0XHRcdGRlbGV0ZSB2YWx1ZS5tb2RpZmllZDtcclxuXHRcdFx0fVxyXG5cclxuXHRcdFx0YXNzZXJ0LmRlZXBFcXVhbChjb2xsZWN0aW9uLCBbXHJcblx0XHRcdFx0eyBpZDogXCJmb29cIiwgbmFtZTogXCJGb29cIiwgdHlwZTogXCJhXCIgfSxcclxuXHRcdFx0XHR7IGlkOiBcImJhelwiLCBuYW1lOiBcIkJhelwiLCB0eXBlOiBcImFcIiB9XHJcblx0XHRcdF0pO1xyXG5cclxuXHRcdFx0ZG9uZSgpO1xyXG5cdFx0fSlcclxuXHJcblx0XHQuY2F0Y2goZXJyID0+IGRvbmUoZXJyKSk7XHJcblx0fSk7XHJcblxyXG5cdGl0KFwicXVlcnlzIGNhbiBhbHNvIGJlIHVwZGF0ZWQgd2hlbiB2YWx1ZXMgY2hhbmdlXCIsIGZ1bmN0aW9uKGRvbmUpIHtcclxuXHRcdC8vIGNyZWF0ZSBhbiBhZHBhdG9yIGFuZCBzdG9yZSBmb3IgdGVzdGluZ1xyXG5cdFx0dmFyIHBvb2wgPSBuZXcgUG9vbFN0b3JlKG5ldyBNZW1BZGFwdG9yKCkpO1xyXG5cclxuXHRcdC8vIGZpbGwgdGhlIHBvb2xcclxuXHRcdHBvb2wuc2V0KHsgaWQ6IFwiZm9vXCIsIG5hbWU6IFwiRm9vXCIsIHR5cGU6IFwiYVwiIH0pO1xyXG5cclxuXHRcdC8vIGNvbGxlY3QgdmFsdWVzIHRoYXQgbWF0Y2hcclxuXHRcdHZhciBjb2xsZWN0aW9uID0gW107XHJcblxyXG5cdFx0Ly8gcXVlcnkgYWxsIHR5cGUgYSBlbGVtZW50c1xyXG5cdFx0cG9vbC5xdWVyeSh7IHR5cGU6IFwiYVwiIH0sIHsgd2F0Y2g6IHRydWUgfSwgciA9PiBjb2xsZWN0aW9uLnB1c2gocikpO1xyXG5cclxuXHRcdHNldFRpbWVvdXQoKCkgPT4ge1xyXG5cdFx0XHQvLyBjaGFuZ2UgYSB2YWx1ZSB0aGF0IG1hdGNoZXMgdGhlIHF1ZXJ5XHJcblx0XHRcdHBvb2wuc2V0KHsgaWQ6IFwiYmF6XCIsIG5hbWU6IFwiQmF6XCIsIHR5cGU6IFwiYVwiIH0pO1xyXG5cclxuXHRcdFx0Ly8gY2hhbmdlIHRoZSB2YWx1ZSBzbyBpdCBkb2Vzbid0IG1hdGNoXHJcblx0XHRcdHBvb2wuc2V0KHsgaWQ6IFwiYmF6XCIsIG5hbWU6IFwiQmF6XCIsIHR5cGU6IFwiYlwiIH0pO1xyXG5cclxuXHRcdFx0Ly8gcmVtb3ZlIHRoZSBvdGhlciB2YWx1ZVxyXG5cdFx0XHRwb29sLnJlbW92ZShcImZvb1wiKTtcclxuXHJcblx0XHRcdC8vIHJlbW92ZSBtb2RpZmllZCBkYXRlc1xyXG5cdFx0XHRmb3IobGV0IGNoYW5nZSBvZiBjb2xsZWN0aW9uKSB7XHJcblx0XHRcdFx0aWYoY2hhbmdlLnZhbHVlKSB7XHJcblx0XHRcdFx0XHRkZWxldGUgY2hhbmdlLnZhbHVlLm1vZGlmaWVkO1xyXG5cdFx0XHRcdH1cclxuXHRcdFx0fVxyXG5cclxuXHRcdFx0YXNzZXJ0LmRlZXBFcXVhbChjb2xsZWN0aW9uLCBbXHJcblx0XHRcdFx0eyB0eXBlOiBcImNoYW5nZVwiLCBpZDogXCJmb29cIiwgdmFsdWU6IHsgaWQ6IFwiZm9vXCIsIG5hbWU6IFwiRm9vXCIsIHR5cGU6IFwiYVwiIH0gfSxcclxuXHRcdFx0XHR7IHR5cGU6IFwiY2hhbmdlXCIsIGlkOiBcImJhelwiLCB2YWx1ZTogeyBpZDogXCJiYXpcIiwgbmFtZTogXCJCYXpcIiwgdHlwZTogXCJhXCIgfSB9LFxyXG5cdFx0XHRcdHsgdHlwZTogXCJ1bm1hdGNoXCIsIGlkOiBcImJhelwiIH0sXHJcblx0XHRcdFx0eyB0eXBlOiBcInJlbW92ZVwiLCBpZDogXCJmb29cIiB9XHJcblx0XHRcdF0pO1xyXG5cclxuXHRcdFx0ZG9uZSgpO1xyXG5cdFx0fSk7XHJcblx0fSk7XHJcblxyXG5cdGl0KFwicXVlcmllcyBjYW4gYmUgcGFzc2VkIGZ1bmN0aW9ucyB0byB0ZXN0IHRoZWlyIHZhbHVlcyBhZ2FpbnN0XCIsIGZ1bmN0aW9uKCkge1xyXG5cdFx0Ly8gY3JlYXRlIGFuIGFkcGF0b3IgYW5kIHN0b3JlIGZvciB0ZXN0aW5nXHJcblx0XHR2YXIgcG9vbCA9IG5ldyBQb29sU3RvcmUobmV3IE1lbUFkYXB0b3IoKSk7XHJcblxyXG5cdFx0Ly8gZmlsbCB0aGUgYWRhcHRvclxyXG5cdFx0cG9vbC5zZXQoeyBpZDogXCJmb29cIiwgbmFtZTogXCJGb29cIiwgdmFsdWU6IDEgfSk7XHJcblx0XHRwb29sLnNldCh7IGlkOiBcImJhclwiLCBuYW1lOiBcIkJhclwiLCB2YWx1ZTogMiB9KTtcclxuXHRcdHBvb2wuc2V0KHsgaWQ6IFwiYmF6XCIsIG5hbWU6IFwiQmF6XCIsIHZhbHVlOiAzIH0pO1xyXG5cclxuXHRcdC8vIHF1ZXJ5IGFsbCB0eXBlIGEgZWxlbWVudHNcclxuXHRcdHJldHVybiBwb29sLnF1ZXJ5KHsgdmFsdWU6IHZhbCA9PiB2YWwgPiAxIH0pXHJcblxyXG5cdFx0LnRoZW4oY29sbGVjdGlvbiA9PiB7XHJcblx0XHRcdC8vIHJlbW92ZSBtb2RpZmllZCBkYXRlc1xyXG5cdFx0XHRmb3IobGV0IHZhbHVlIG9mIGNvbGxlY3Rpb24pIHtcclxuXHRcdFx0XHRkZWxldGUgdmFsdWUubW9kaWZpZWQ7XHJcblx0XHRcdH1cclxuXHJcblx0XHRcdGFzc2VydC5kZWVwRXF1YWwoY29sbGVjdGlvbiwgW1xyXG5cdFx0XHRcdHsgaWQ6IFwiYmFyXCIsIG5hbWU6IFwiQmFyXCIsIHZhbHVlOiAyIH0sXHJcblx0XHRcdFx0eyBpZDogXCJiYXpcIiwgbmFtZTogXCJCYXpcIiwgdmFsdWU6IDMgfVxyXG5cdFx0XHRdKTtcclxuXHRcdH0pO1xyXG5cdH0pO1xyXG59KTtcclxuIiwidmFyIERpc3Bvc2FibGUgPSByZXF1aXJlKFwiLi4vLi4vLi4vc3JjL2NvbW1vbi91dGlsL2Rpc3Bvc2FibGVcIik7XHJcbnZhciBFdmVudEVtaXR0ZXIgPSByZXF1aXJlKFwiLi4vLi4vLi4vc3JjL2NvbW1vbi91dGlsL2V2ZW50LWVtaXR0ZXJcIik7XHJcbnZhciBhc3NlcnQgPSByZXF1aXJlKFwiYXNzZXJ0XCIpO1xyXG5cclxuZGVzY3JpYmUoXCJEaXNwb3NhYmxlXCIsIGZ1bmN0aW9uKCkge1xyXG5cdGl0KFwiY2FuIGNvbGxlY3Qgc3Vic2NyaXB0aW9ucyBhbmQgcmVtb3ZlIHRoZSB0b2dldGhlclwiLCBmdW5jdGlvbigpIHtcclxuXHRcdC8vIGNvdW50IGhvdyBtYW55IHN1YnNjcmlwdGlvbiBoYXZlIGJlZW4gdW5zdWJzY3JpYmVkXHJcblx0XHR2YXIgcmVmID0geyBjb3VudDogMCB9O1xyXG5cdFx0Ly8gY3JlYXRlIHRoZSBkaXNwb3NhYmxlXHJcblx0XHR2YXIgZGlzcCA9IG5ldyBEaXNwb3NhYmxlKCk7XHJcblxyXG5cdFx0Ly8gYWRkIHNvbWUgc3Vic2NyaXB0aW9uc1xyXG5cdFx0ZGlzcC5hZGQoY3JlYXRlU3ViKHJlZikpO1xyXG5cdFx0ZGlzcC5hZGQoY3JlYXRlU3ViKHJlZikpO1xyXG5cdFx0ZGlzcC5hZGQoY3JlYXRlU3ViKHJlZikpO1xyXG5cclxuXHRcdC8vIGRpc3Bvc2UgdGhlIHN1YnNjcmlwdGlvbnNcclxuXHRcdGRpc3AuZGlzcG9zZSgpO1xyXG5cclxuXHRcdC8vIGRpc3Bvc2UgYWdhaW4gdG8gY2hlY2sgdGhhdCBkaXNwb3NhYmxlcyBvbmx5IHRyaWdnZXIgb25jZVxyXG5cdFx0ZGlzcC5kaXNwb3NlKCk7XHJcblxyXG5cdFx0YXNzZXJ0LmVxdWFsKHJlZi5jb3VudCwgMyk7XHJcblx0fSk7XHJcblxyXG5cdGl0KFwiY2FuIGJlIGRpc3Bvc2VkIGJ5IGFuIGV2ZW50XCIsIGZ1bmN0aW9uKCkge1xyXG5cdFx0Ly8gY291bnQgaG93IG1hbnkgc3Vic2NyaXB0aW9uIGhhdmUgYmVlbiB1bnN1YnNjcmliZWRcclxuXHRcdHZhciByZWYgPSB7IGNvdW50OiAwIH07XHJcblx0XHQvLyBjcmVhdGUgdGhlIGRpc3Bvc2FibGVcclxuXHRcdHZhciBkaXNwID0gbmV3IERpc3Bvc2FibGUoKTtcclxuXHRcdC8vIGNyZWF0ZSBhbiBldmVudCBlbWl0dGVyIHRvIHdhdGNoXHJcblx0XHR2YXIgZW1pdHRlciA9IG5ldyBFdmVudEVtaXR0ZXIoKTtcclxuXHJcblx0XHQvLyBhZGQgc29tZSBzdWJzY3JpcHRpb25zXHJcblx0XHRkaXNwLmFkZChjcmVhdGVTdWIocmVmKSk7XHJcblx0XHRkaXNwLmFkZChjcmVhdGVTdWIocmVmKSk7XHJcblx0XHRkaXNwLmFkZChjcmVhdGVTdWIocmVmKSk7XHJcblxyXG5cdFx0Ly8gZGlzcG9zZSB0aGUgc3Vic2NyaXB0aW9uc1xyXG5cdFx0ZGlzcC5kaXNwb3NlT24oZW1pdHRlciwgXCJkaXNwb3NlXCIpO1xyXG5cclxuXHRcdC8vIHRyaWdnZXIgdGhlIGRpc3Bvc2FibGVcclxuXHRcdGVtaXR0ZXIuZW1pdChcImRpc3Bvc2VcIik7XHJcblxyXG5cdFx0YXNzZXJ0LmVxdWFsKHJlZi5jb3VudCwgMyk7XHJcblxyXG5cdFx0Ly8gY2hlY2sgdGhlIGRpc3Bvc2UgbGlzdGVuZXIgd2FzIHJlbW92ZWRcclxuXHRcdGFzc2VydC5lcXVhbChlbWl0dGVyLl9saXN0ZW5lcnMuZGlzcG9zZS5sZW5ndGgsIDApO1xyXG5cdH0pO1xyXG59KTtcclxuXHJcbi8vIGhlbHBlciB0byBjcmVhdGUgYSBzdWJzY3JpcHRpb24gdGhhdCBpbmNyZW1lbnRzIGEgY291bnRlciB3aGVuIGl0IGlzIHJlbW92ZWRcclxudmFyIGNyZWF0ZVN1YiA9IGZ1bmN0aW9uKHJlZikge1xyXG5cdHJldHVybiB7XHJcblx0XHR1bnN1YnNjcmliZSgpIHtcclxuXHRcdFx0KytyZWYuY291bnQ7XHJcblx0XHR9XHJcblx0fTtcclxufTtcclxuIl19
