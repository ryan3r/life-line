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

var EventEmitter = require("../util/event-emitter");

var KeyValueStore = function (_EventEmitter) {
	_inherits(KeyValueStore, _EventEmitter);

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
}(EventEmitter);

module.exports = KeyValueStore;

},{"../util/event-emitter":11}],8:[function(require,module,exports){
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

},{"../util/event-emitter":11}],10:[function(require,module,exports){
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

},{}],11:[function(require,module,exports){
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

},{}],12:[function(require,module,exports){
"use strict";

/**
 * All client side and common tests to bundle together
 */

// http-adaptor.js is technicaly in common but the test
// only works on node js
require("./common/data-stores/key-value-store");
require("./common/data-stores/mem-adaptor");
require("./common/data-stores/pool-store");
require("./common/util/disposable");
require("./common/backup");

},{"./common/backup":13,"./common/data-stores/key-value-store":14,"./common/data-stores/mem-adaptor":15,"./common/data-stores/pool-store":16,"./common/util/disposable":17}],13:[function(require,module,exports){
"use strict";

var assert = require("assert");
var backup = require("../../src/common/backup");

describe("Backup", function () {
	it("can generate backup names from the date", function () {
		assert.equal(backup.genBackupName(new Date("2017-01-01T11:00:00.000Z")), "backup-2017-1-1-5-0.zip");
	});
});

},{"../../src/common/backup":6,"assert":1}],14:[function(require,module,exports){
"use strict";

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

},{"../../../src/common/data-stores/key-value-store":7,"../../../src/common/data-stores/mem-adaptor":8,"assert":1}],15:[function(require,module,exports){
"use strict";

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

},{"../../../src/common/data-stores/mem-adaptor":8,"assert":1}],16:[function(require,module,exports){
"use strict";

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
		pool.query({ type: "a" }, function (values) {
			// remove modified fields
			var _iteratorNormalCompletion2 = true;
			var _didIteratorError2 = false;
			var _iteratorError2 = undefined;

			try {
				for (var _iterator2 = values[Symbol.iterator](), _step2; !(_iteratorNormalCompletion2 = (_step2 = _iterator2.next()).done); _iteratorNormalCompletion2 = true) {
					var value = _step2.value;

					delete value.modified;
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

			collection.push(values);
		});

		setTimeout(function () {
			// change a value that matches the query
			pool.set({ id: "baz", name: "Baz", type: "a" });

			// change the value so it doesn't match
			pool.set({ id: "baz", name: "Baz", type: "b" });

			// remove the other value
			pool.remove("foo");

			assert.deepEqual(collection, [[{ id: "foo", name: "Foo", type: "a" }], [{ id: "foo", name: "Foo", type: "a" }, { id: "baz", name: "Baz", type: "a" }], [{ id: "foo", name: "Foo", type: "a" }], []]);

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

},{"../../../src/common/data-stores/mem-adaptor":8,"../../../src/common/data-stores/pool-store":9,"assert":1}],17:[function(require,module,exports){
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

},{"../../../src/common/util/disposable":10,"../../../src/common/util/event-emitter":11,"assert":1}]},{},[12])
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCJub2RlX21vZHVsZXMvYXNzZXJ0L2Fzc2VydC5qcyIsIm5vZGVfbW9kdWxlcy9wcm9jZXNzL2Jyb3dzZXIuanMiLCJub2RlX21vZHVsZXMvdXRpbC9ub2RlX21vZHVsZXMvaW5oZXJpdHMvaW5oZXJpdHNfYnJvd3Nlci5qcyIsIm5vZGVfbW9kdWxlcy91dGlsL3N1cHBvcnQvaXNCdWZmZXJCcm93c2VyLmpzIiwibm9kZV9tb2R1bGVzL3V0aWwvdXRpbC5qcyIsInNyY1xcY29tbW9uXFxiYWNrdXAuanMiLCJzcmNcXGNvbW1vblxcZGF0YS1zdG9yZXNcXGtleS12YWx1ZS1zdG9yZS5qcyIsInNyY1xcY29tbW9uXFxkYXRhLXN0b3Jlc1xcbWVtLWFkYXB0b3IuanMiLCJzcmNcXGNvbW1vblxcZGF0YS1zdG9yZXNcXHBvb2wtc3RvcmUuanMiLCJzcmNcXGNvbW1vblxcdXRpbFxcZGlzcG9zYWJsZS5qcyIsInNyY1xcY29tbW9uXFx1dGlsXFxldmVudC1lbWl0dGVyLmpzIiwidGVzdHNcXGFsbC5qcyIsInRlc3RzXFxjb21tb25cXGJhY2t1cC5qcyIsInRlc3RzXFxjb21tb25cXGRhdGEtc3RvcmVzXFxrZXktdmFsdWUtc3RvcmUuanMiLCJ0ZXN0c1xcY29tbW9uXFxkYXRhLXN0b3Jlc1xcbWVtLWFkYXB0b3IuanMiLCJ0ZXN0c1xcY29tbW9uXFxkYXRhLXN0b3Jlc1xccG9vbC1zdG9yZS5qcyIsInRlc3RzXFxjb21tb25cXHV0aWxcXGRpc3Bvc2FibGUuanMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7O0FDQUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7OztBQzFlQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNwTEE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3ZCQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7OztBQ0xBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7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QVMsVUFBVSxHQUFWLENBQVQ7QUFDQSxTQUFLLEdBQUwsQ0FBUyxVQUFVLEdBQVYsQ0FBVDtBQUNBLFNBQUssR0FBTCxDQUFTLFVBQVUsR0FBVixDQUFUOztBQUVBO0FBQ0EsU0FBSyxTQUFMLENBQWUsT0FBZixFQUF3QixTQUF4Qjs7QUFFQTtBQUNBLFlBQVEsSUFBUixDQUFhLFNBQWI7O0FBRUEsV0FBTyxLQUFQLENBQWEsSUFBSSxLQUFqQixFQUF3QixDQUF4Qjs7QUFFQTtBQUNBLFdBQU8sS0FBUCxDQUFhLFFBQVEsVUFBUixDQUFtQixPQUFuQixDQUEyQixNQUF4QyxFQUFnRCxDQUFoRDtBQUNBLEdBdkJEO0FBd0JBLENBN0NEOztBQStDQTtBQUNBLElBQUksWUFBWSxVQUFTLEdBQVQsRUFBYztBQUM3QixTQUFPO0FBQ04sZUFETSxjQUNRO0FBQ2IsUUFBRSxJQUFJLEtBQU47QUFDQTtBQUhLLEdBQVA7QUFLQSxDQU5EIiwiZmlsZSI6ImdlbmVyYXRlZC5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzQ29udGVudCI6WyIoZnVuY3Rpb24gZSh0LG4scil7ZnVuY3Rpb24gcyhvLHUpe2lmKCFuW29dKXtpZighdFtvXSl7dmFyIGE9dHlwZW9mIHJlcXVpcmU9PVwiZnVuY3Rpb25cIiYmcmVxdWlyZTtpZighdSYmYSlyZXR1cm4gYShvLCEwKTtpZihpKXJldHVybiBpKG8sITApO3ZhciBmPW5ldyBFcnJvcihcIkNhbm5vdCBmaW5kIG1vZHVsZSAnXCIrbytcIidcIik7dGhyb3cgZi5jb2RlPVwiTU9EVUxFX05PVF9GT1VORFwiLGZ9dmFyIGw9bltvXT17ZXhwb3J0czp7fX07dFtvXVswXS5jYWxsKGwuZXhwb3J0cyxmdW5jdGlvbihlKXt2YXIgbj10W29dWzFdW2VdO3JldHVybiBzKG4/bjplKX0sbCxsLmV4cG9ydHMsZSx0LG4scil9cmV0dXJuIG5bb10uZXhwb3J0c312YXIgaT10eXBlb2YgcmVxdWlyZT09XCJmdW5jdGlvblwiJiZyZXF1aXJlO2Zvcih2YXIgbz0wO288ci5sZW5ndGg7bysrKXMocltvXSk7cmV0dXJuIHN9KSIsIid1c2Ugc3RyaWN0JztcblxuLy8gY29tcGFyZSBhbmQgaXNCdWZmZXIgdGFrZW4gZnJvbSBodHRwczovL2dpdGh1Yi5jb20vZmVyb3NzL2J1ZmZlci9ibG9iLzY4MGU5ZTVlNDg4ZjIyYWFjMjc1OTlhNTdkYzg0NGE2MzE1OTI4ZGQvaW5kZXguanNcbi8vIG9yaWdpbmFsIG5vdGljZTpcblxuLyohXG4gKiBUaGUgYnVmZmVyIG1vZHVsZSBmcm9tIG5vZGUuanMsIGZvciB0aGUgYnJvd3Nlci5cbiAqXG4gKiBAYXV0aG9yICAgRmVyb3NzIEFib3VraGFkaWplaCA8ZmVyb3NzQGZlcm9zcy5vcmc+IDxodHRwOi8vZmVyb3NzLm9yZz5cbiAqIEBsaWNlbnNlICBNSVRcbiAqL1xuZnVuY3Rpb24gY29tcGFyZShhLCBiKSB7XG4gIGlmIChhID09PSBiKSB7XG4gICAgcmV0dXJuIDA7XG4gIH1cblxuICB2YXIgeCA9IGEubGVuZ3RoO1xuICB2YXIgeSA9IGIubGVuZ3RoO1xuXG4gIGZvciAodmFyIGkgPSAwLCBsZW4gPSBNYXRoLm1pbih4LCB5KTsgaSA8IGxlbjsgKytpKSB7XG4gICAgaWYgKGFbaV0gIT09IGJbaV0pIHtcbiAgICAgIHggPSBhW2ldO1xuICAgICAgeSA9IGJbaV07XG4gICAgICBicmVhaztcbiAgICB9XG4gIH1cblxuICBpZiAoeCA8IHkpIHtcbiAgICByZXR1cm4gLTE7XG4gIH1cbiAgaWYgKHkgPCB4KSB7XG4gICAgcmV0dXJuIDE7XG4gIH1cbiAgcmV0dXJuIDA7XG59XG5mdW5jdGlvbiBpc0J1ZmZlcihiKSB7XG4gIGlmIChnbG9iYWwuQnVmZmVyICYmIHR5cGVvZiBnbG9iYWwuQnVmZmVyLmlzQnVmZmVyID09PSAnZnVuY3Rpb24nKSB7XG4gICAgcmV0dXJuIGdsb2JhbC5CdWZmZXIuaXNCdWZmZXIoYik7XG4gIH1cbiAgcmV0dXJuICEhKGIgIT0gbnVsbCAmJiBiLl9pc0J1ZmZlcik7XG59XG5cbi8vIGJhc2VkIG9uIG5vZGUgYXNzZXJ0LCBvcmlnaW5hbCBub3RpY2U6XG5cbi8vIGh0dHA6Ly93aWtpLmNvbW1vbmpzLm9yZy93aWtpL1VuaXRfVGVzdGluZy8xLjBcbi8vXG4vLyBUSElTIElTIE5PVCBURVNURUQgTk9SIExJS0VMWSBUTyBXT1JLIE9VVFNJREUgVjghXG4vL1xuLy8gT3JpZ2luYWxseSBmcm9tIG5hcndoYWwuanMgKGh0dHA6Ly9uYXJ3aGFsanMub3JnKVxuLy8gQ29weXJpZ2h0IChjKSAyMDA5IFRob21hcyBSb2JpbnNvbiA8Mjgwbm9ydGguY29tPlxuLy9cbi8vIFBlcm1pc3Npb24gaXMgaGVyZWJ5IGdyYW50ZWQsIGZyZWUgb2YgY2hhcmdlLCB0byBhbnkgcGVyc29uIG9idGFpbmluZyBhIGNvcHlcbi8vIG9mIHRoaXMgc29mdHdhcmUgYW5kIGFzc29jaWF0ZWQgZG9jdW1lbnRhdGlvbiBmaWxlcyAodGhlICdTb2Z0d2FyZScpLCB0b1xuLy8gZGVhbCBpbiB0aGUgU29mdHdhcmUgd2l0aG91dCByZXN0cmljdGlvbiwgaW5jbHVkaW5nIHdpdGhvdXQgbGltaXRhdGlvbiB0aGVcbi8vIHJpZ2h0cyB0byB1c2UsIGNvcHksIG1vZGlmeSwgbWVyZ2UsIHB1Ymxpc2gsIGRpc3RyaWJ1dGUsIHN1YmxpY2Vuc2UsIGFuZC9vclxuLy8gc2VsbCBjb3BpZXMgb2YgdGhlIFNvZnR3YXJlLCBhbmQgdG8gcGVybWl0IHBlcnNvbnMgdG8gd2hvbSB0aGUgU29mdHdhcmUgaXNcbi8vIGZ1cm5pc2hlZCB0byBkbyBzbywgc3ViamVjdCB0byB0aGUgZm9sbG93aW5nIGNvbmRpdGlvbnM6XG4vL1xuLy8gVGhlIGFib3ZlIGNvcHlyaWdodCBub3RpY2UgYW5kIHRoaXMgcGVybWlzc2lvbiBub3RpY2Ugc2hhbGwgYmUgaW5jbHVkZWQgaW5cbi8vIGFsbCBjb3BpZXMgb3Igc3Vic3RhbnRpYWwgcG9ydGlvbnMgb2YgdGhlIFNvZnR3YXJlLlxuLy9cbi8vIFRIRSBTT0ZUV0FSRSBJUyBQUk9WSURFRCAnQVMgSVMnLCBXSVRIT1VUIFdBUlJBTlRZIE9GIEFOWSBLSU5ELCBFWFBSRVNTIE9SXG4vLyBJTVBMSUVELCBJTkNMVURJTkcgQlVUIE5PVCBMSU1JVEVEIFRPIFRIRSBXQVJSQU5USUVTIE9GIE1FUkNIQU5UQUJJTElUWSxcbi8vIEZJVE5FU1MgRk9SIEEgUEFSVElDVUxBUiBQVVJQT1NFIEFORCBOT05JTkZSSU5HRU1FTlQuIElOIE5PIEVWRU5UIFNIQUxMIFRIRVxuLy8gQVVUSE9SUyBCRSBMSUFCTEUgRk9SIEFOWSBDTEFJTSwgREFNQUdFUyBPUiBPVEhFUiBMSUFCSUxJVFksIFdIRVRIRVIgSU4gQU5cbi8vIEFDVElPTiBPRiBDT05UUkFDVCwgVE9SVCBPUiBPVEhFUldJU0UsIEFSSVNJTkcgRlJPTSwgT1VUIE9GIE9SIElOIENPTk5FQ1RJT05cbi8vIFdJVEggVEhFIFNPRlRXQVJFIE9SIFRIRSBVU0UgT1IgT1RIRVIgREVBTElOR1MgSU4gVEhFIFNPRlRXQVJFLlxuXG52YXIgdXRpbCA9IHJlcXVpcmUoJ3V0aWwvJyk7XG52YXIgaGFzT3duID0gT2JqZWN0LnByb3RvdHlwZS5oYXNPd25Qcm9wZXJ0eTtcbnZhciBwU2xpY2UgPSBBcnJheS5wcm90b3R5cGUuc2xpY2U7XG52YXIgZnVuY3Rpb25zSGF2ZU5hbWVzID0gKGZ1bmN0aW9uICgpIHtcbiAgcmV0dXJuIGZ1bmN0aW9uIGZvbygpIHt9Lm5hbWUgPT09ICdmb28nO1xufSgpKTtcbmZ1bmN0aW9uIHBUb1N0cmluZyAob2JqKSB7XG4gIHJldHVybiBPYmplY3QucHJvdG90eXBlLnRvU3RyaW5nLmNhbGwob2JqKTtcbn1cbmZ1bmN0aW9uIGlzVmlldyhhcnJidWYpIHtcbiAgaWYgKGlzQnVmZmVyKGFycmJ1ZikpIHtcbiAgICByZXR1cm4gZmFsc2U7XG4gIH1cbiAgaWYgKHR5cGVvZiBnbG9iYWwuQXJyYXlCdWZmZXIgIT09ICdmdW5jdGlvbicpIHtcbiAgICByZXR1cm4gZmFsc2U7XG4gIH1cbiAgaWYgKHR5cGVvZiBBcnJheUJ1ZmZlci5pc1ZpZXcgPT09ICdmdW5jdGlvbicpIHtcbiAgICByZXR1cm4gQXJyYXlCdWZmZXIuaXNWaWV3KGFycmJ1Zik7XG4gIH1cbiAgaWYgKCFhcnJidWYpIHtcbiAgICByZXR1cm4gZmFsc2U7XG4gIH1cbiAgaWYgKGFycmJ1ZiBpbnN0YW5jZW9mIERhdGFWaWV3KSB7XG4gICAgcmV0dXJuIHRydWU7XG4gIH1cbiAgaWYgKGFycmJ1Zi5idWZmZXIgJiYgYXJyYnVmLmJ1ZmZlciBpbnN0YW5jZW9mIEFycmF5QnVmZmVyKSB7XG4gICAgcmV0dXJuIHRydWU7XG4gIH1cbiAgcmV0dXJuIGZhbHNlO1xufVxuLy8gMS4gVGhlIGFzc2VydCBtb2R1bGUgcHJvdmlkZXMgZnVuY3Rpb25zIHRoYXQgdGhyb3dcbi8vIEFzc2VydGlvbkVycm9yJ3Mgd2hlbiBwYXJ0aWN1bGFyIGNvbmRpdGlvbnMgYXJlIG5vdCBtZXQuIFRoZVxuLy8gYXNzZXJ0IG1vZHVsZSBtdXN0IGNvbmZvcm0gdG8gdGhlIGZvbGxvd2luZyBpbnRlcmZhY2UuXG5cbnZhciBhc3NlcnQgPSBtb2R1bGUuZXhwb3J0cyA9IG9rO1xuXG4vLyAyLiBUaGUgQXNzZXJ0aW9uRXJyb3IgaXMgZGVmaW5lZCBpbiBhc3NlcnQuXG4vLyBuZXcgYXNzZXJ0LkFzc2VydGlvbkVycm9yKHsgbWVzc2FnZTogbWVzc2FnZSxcbi8vICAgICAgICAgICAgICAgICAgICAgICAgICAgICBhY3R1YWw6IGFjdHVhbCxcbi8vICAgICAgICAgICAgICAgICAgICAgICAgICAgICBleHBlY3RlZDogZXhwZWN0ZWQgfSlcblxudmFyIHJlZ2V4ID0gL1xccypmdW5jdGlvblxccysoW15cXChcXHNdKilcXHMqLztcbi8vIGJhc2VkIG9uIGh0dHBzOi8vZ2l0aHViLmNvbS9samhhcmIvZnVuY3Rpb24ucHJvdG90eXBlLm5hbWUvYmxvYi9hZGVlZWVjOGJmY2M2MDY4YjE4N2Q3ZDlmYjNkNWJiMWQzYTMwODk5L2ltcGxlbWVudGF0aW9uLmpzXG5mdW5jdGlvbiBnZXROYW1lKGZ1bmMpIHtcbiAgaWYgKCF1dGlsLmlzRnVuY3Rpb24oZnVuYykpIHtcbiAgICByZXR1cm47XG4gIH1cbiAgaWYgKGZ1bmN0aW9uc0hhdmVOYW1lcykge1xuICAgIHJldHVybiBmdW5jLm5hbWU7XG4gIH1cbiAgdmFyIHN0ciA9IGZ1bmMudG9TdHJpbmcoKTtcbiAgdmFyIG1hdGNoID0gc3RyLm1hdGNoKHJlZ2V4KTtcbiAgcmV0dXJuIG1hdGNoICYmIG1hdGNoWzFdO1xufVxuYXNzZXJ0LkFzc2VydGlvbkVycm9yID0gZnVuY3Rpb24gQXNzZXJ0aW9uRXJyb3Iob3B0aW9ucykge1xuICB0aGlzLm5hbWUgPSAnQXNzZXJ0aW9uRXJyb3InO1xuICB0aGlzLmFjdHVhbCA9IG9wdGlvbnMuYWN0dWFsO1xuICB0aGlzLmV4cGVjdGVkID0gb3B0aW9ucy5leHBlY3RlZDtcbiAgdGhpcy5vcGVyYXRvciA9IG9wdGlvbnMub3BlcmF0b3I7XG4gIGlmIChvcHRpb25zLm1lc3NhZ2UpIHtcbiAgICB0aGlzLm1lc3NhZ2UgPSBvcHRpb25zLm1lc3NhZ2U7XG4gICAgdGhpcy5nZW5lcmF0ZWRNZXNzYWdlID0gZmFsc2U7XG4gIH0gZWxzZSB7XG4gICAgdGhpcy5tZXNzYWdlID0gZ2V0TWVzc2FnZSh0aGlzKTtcbiAgICB0aGlzLmdlbmVyYXRlZE1lc3NhZ2UgPSB0cnVlO1xuICB9XG4gIHZhciBzdGFja1N0YXJ0RnVuY3Rpb24gPSBvcHRpb25zLnN0YWNrU3RhcnRGdW5jdGlvbiB8fCBmYWlsO1xuICBpZiAoRXJyb3IuY2FwdHVyZVN0YWNrVHJhY2UpIHtcbiAgICBFcnJvci5jYXB0dXJlU3RhY2tUcmFjZSh0aGlzLCBzdGFja1N0YXJ0RnVuY3Rpb24pO1xuICB9IGVsc2Uge1xuICAgIC8vIG5vbiB2OCBicm93c2VycyBzbyB3ZSBjYW4gaGF2ZSBhIHN0YWNrdHJhY2VcbiAgICB2YXIgZXJyID0gbmV3IEVycm9yKCk7XG4gICAgaWYgKGVyci5zdGFjaykge1xuICAgICAgdmFyIG91dCA9IGVyci5zdGFjaztcblxuICAgICAgLy8gdHJ5IHRvIHN0cmlwIHVzZWxlc3MgZnJhbWVzXG4gICAgICB2YXIgZm5fbmFtZSA9IGdldE5hbWUoc3RhY2tTdGFydEZ1bmN0aW9uKTtcbiAgICAgIHZhciBpZHggPSBvdXQuaW5kZXhPZignXFxuJyArIGZuX25hbWUpO1xuICAgICAgaWYgKGlkeCA+PSAwKSB7XG4gICAgICAgIC8vIG9uY2Ugd2UgaGF2ZSBsb2NhdGVkIHRoZSBmdW5jdGlvbiBmcmFtZVxuICAgICAgICAvLyB3ZSBuZWVkIHRvIHN0cmlwIG91dCBldmVyeXRoaW5nIGJlZm9yZSBpdCAoYW5kIGl0cyBsaW5lKVxuICAgICAgICB2YXIgbmV4dF9saW5lID0gb3V0LmluZGV4T2YoJ1xcbicsIGlkeCArIDEpO1xuICAgICAgICBvdXQgPSBvdXQuc3Vic3RyaW5nKG5leHRfbGluZSArIDEpO1xuICAgICAgfVxuXG4gICAgICB0aGlzLnN0YWNrID0gb3V0O1xuICAgIH1cbiAgfVxufTtcblxuLy8gYXNzZXJ0LkFzc2VydGlvbkVycm9yIGluc3RhbmNlb2YgRXJyb3JcbnV0aWwuaW5oZXJpdHMoYXNzZXJ0LkFzc2VydGlvbkVycm9yLCBFcnJvcik7XG5cbmZ1bmN0aW9uIHRydW5jYXRlKHMsIG4pIHtcbiAgaWYgKHR5cGVvZiBzID09PSAnc3RyaW5nJykge1xuICAgIHJldHVybiBzLmxlbmd0aCA8IG4gPyBzIDogcy5zbGljZSgwLCBuKTtcbiAgfSBlbHNlIHtcbiAgICByZXR1cm4gcztcbiAgfVxufVxuZnVuY3Rpb24gaW5zcGVjdChzb21ldGhpbmcpIHtcbiAgaWYgKGZ1bmN0aW9uc0hhdmVOYW1lcyB8fCAhdXRpbC5pc0Z1bmN0aW9uKHNvbWV0aGluZykpIHtcbiAgICByZXR1cm4gdXRpbC5pbnNwZWN0KHNvbWV0aGluZyk7XG4gIH1cbiAgdmFyIHJhd25hbWUgPSBnZXROYW1lKHNvbWV0aGluZyk7XG4gIHZhciBuYW1lID0gcmF3bmFtZSA/ICc6ICcgKyByYXduYW1lIDogJyc7XG4gIHJldHVybiAnW0Z1bmN0aW9uJyArICBuYW1lICsgJ10nO1xufVxuZnVuY3Rpb24gZ2V0TWVzc2FnZShzZWxmKSB7XG4gIHJldHVybiB0cnVuY2F0ZShpbnNwZWN0KHNlbGYuYWN0dWFsKSwgMTI4KSArICcgJyArXG4gICAgICAgICBzZWxmLm9wZXJhdG9yICsgJyAnICtcbiAgICAgICAgIHRydW5jYXRlKGluc3BlY3Qoc2VsZi5leHBlY3RlZCksIDEyOCk7XG59XG5cbi8vIEF0IHByZXNlbnQgb25seSB0aGUgdGhyZWUga2V5cyBtZW50aW9uZWQgYWJvdmUgYXJlIHVzZWQgYW5kXG4vLyB1bmRlcnN0b29kIGJ5IHRoZSBzcGVjLiBJbXBsZW1lbnRhdGlvbnMgb3Igc3ViIG1vZHVsZXMgY2FuIHBhc3Ncbi8vIG90aGVyIGtleXMgdG8gdGhlIEFzc2VydGlvbkVycm9yJ3MgY29uc3RydWN0b3IgLSB0aGV5IHdpbGwgYmVcbi8vIGlnbm9yZWQuXG5cbi8vIDMuIEFsbCBvZiB0aGUgZm9sbG93aW5nIGZ1bmN0aW9ucyBtdXN0IHRocm93IGFuIEFzc2VydGlvbkVycm9yXG4vLyB3aGVuIGEgY29ycmVzcG9uZGluZyBjb25kaXRpb24gaXMgbm90IG1ldCwgd2l0aCBhIG1lc3NhZ2UgdGhhdFxuLy8gbWF5IGJlIHVuZGVmaW5lZCBpZiBub3QgcHJvdmlkZWQuICBBbGwgYXNzZXJ0aW9uIG1ldGhvZHMgcHJvdmlkZVxuLy8gYm90aCB0aGUgYWN0dWFsIGFuZCBleHBlY3RlZCB2YWx1ZXMgdG8gdGhlIGFzc2VydGlvbiBlcnJvciBmb3Jcbi8vIGRpc3BsYXkgcHVycG9zZXMuXG5cbmZ1bmN0aW9uIGZhaWwoYWN0dWFsLCBleHBlY3RlZCwgbWVzc2FnZSwgb3BlcmF0b3IsIHN0YWNrU3RhcnRGdW5jdGlvbikge1xuICB0aHJvdyBuZXcgYXNzZXJ0LkFzc2VydGlvbkVycm9yKHtcbiAgICBtZXNzYWdlOiBtZXNzYWdlLFxuICAgIGFjdHVhbDogYWN0dWFsLFxuICAgIGV4cGVjdGVkOiBleHBlY3RlZCxcbiAgICBvcGVyYXRvcjogb3BlcmF0b3IsXG4gICAgc3RhY2tTdGFydEZ1bmN0aW9uOiBzdGFja1N0YXJ0RnVuY3Rpb25cbiAgfSk7XG59XG5cbi8vIEVYVEVOU0lPTiEgYWxsb3dzIGZvciB3ZWxsIGJlaGF2ZWQgZXJyb3JzIGRlZmluZWQgZWxzZXdoZXJlLlxuYXNzZXJ0LmZhaWwgPSBmYWlsO1xuXG4vLyA0LiBQdXJlIGFzc2VydGlvbiB0ZXN0cyB3aGV0aGVyIGEgdmFsdWUgaXMgdHJ1dGh5LCBhcyBkZXRlcm1pbmVkXG4vLyBieSAhIWd1YXJkLlxuLy8gYXNzZXJ0Lm9rKGd1YXJkLCBtZXNzYWdlX29wdCk7XG4vLyBUaGlzIHN0YXRlbWVudCBpcyBlcXVpdmFsZW50IHRvIGFzc2VydC5lcXVhbCh0cnVlLCAhIWd1YXJkLFxuLy8gbWVzc2FnZV9vcHQpOy4gVG8gdGVzdCBzdHJpY3RseSBmb3IgdGhlIHZhbHVlIHRydWUsIHVzZVxuLy8gYXNzZXJ0LnN0cmljdEVxdWFsKHRydWUsIGd1YXJkLCBtZXNzYWdlX29wdCk7LlxuXG5mdW5jdGlvbiBvayh2YWx1ZSwgbWVzc2FnZSkge1xuICBpZiAoIXZhbHVlKSBmYWlsKHZhbHVlLCB0cnVlLCBtZXNzYWdlLCAnPT0nLCBhc3NlcnQub2spO1xufVxuYXNzZXJ0Lm9rID0gb2s7XG5cbi8vIDUuIFRoZSBlcXVhbGl0eSBhc3NlcnRpb24gdGVzdHMgc2hhbGxvdywgY29lcmNpdmUgZXF1YWxpdHkgd2l0aFxuLy8gPT0uXG4vLyBhc3NlcnQuZXF1YWwoYWN0dWFsLCBleHBlY3RlZCwgbWVzc2FnZV9vcHQpO1xuXG5hc3NlcnQuZXF1YWwgPSBmdW5jdGlvbiBlcXVhbChhY3R1YWwsIGV4cGVjdGVkLCBtZXNzYWdlKSB7XG4gIGlmIChhY3R1YWwgIT0gZXhwZWN0ZWQpIGZhaWwoYWN0dWFsLCBleHBlY3RlZCwgbWVzc2FnZSwgJz09JywgYXNzZXJ0LmVxdWFsKTtcbn07XG5cbi8vIDYuIFRoZSBub24tZXF1YWxpdHkgYXNzZXJ0aW9uIHRlc3RzIGZvciB3aGV0aGVyIHR3byBvYmplY3RzIGFyZSBub3QgZXF1YWxcbi8vIHdpdGggIT0gYXNzZXJ0Lm5vdEVxdWFsKGFjdHVhbCwgZXhwZWN0ZWQsIG1lc3NhZ2Vfb3B0KTtcblxuYXNzZXJ0Lm5vdEVxdWFsID0gZnVuY3Rpb24gbm90RXF1YWwoYWN0dWFsLCBleHBlY3RlZCwgbWVzc2FnZSkge1xuICBpZiAoYWN0dWFsID09IGV4cGVjdGVkKSB7XG4gICAgZmFpbChhY3R1YWwsIGV4cGVjdGVkLCBtZXNzYWdlLCAnIT0nLCBhc3NlcnQubm90RXF1YWwpO1xuICB9XG59O1xuXG4vLyA3LiBUaGUgZXF1aXZhbGVuY2UgYXNzZXJ0aW9uIHRlc3RzIGEgZGVlcCBlcXVhbGl0eSByZWxhdGlvbi5cbi8vIGFzc2VydC5kZWVwRXF1YWwoYWN0dWFsLCBleHBlY3RlZCwgbWVzc2FnZV9vcHQpO1xuXG5hc3NlcnQuZGVlcEVxdWFsID0gZnVuY3Rpb24gZGVlcEVxdWFsKGFjdHVhbCwgZXhwZWN0ZWQsIG1lc3NhZ2UpIHtcbiAgaWYgKCFfZGVlcEVxdWFsKGFjdHVhbCwgZXhwZWN0ZWQsIGZhbHNlKSkge1xuICAgIGZhaWwoYWN0dWFsLCBleHBlY3RlZCwgbWVzc2FnZSwgJ2RlZXBFcXVhbCcsIGFzc2VydC5kZWVwRXF1YWwpO1xuICB9XG59O1xuXG5hc3NlcnQuZGVlcFN0cmljdEVxdWFsID0gZnVuY3Rpb24gZGVlcFN0cmljdEVxdWFsKGFjdHVhbCwgZXhwZWN0ZWQsIG1lc3NhZ2UpIHtcbiAgaWYgKCFfZGVlcEVxdWFsKGFjdHVhbCwgZXhwZWN0ZWQsIHRydWUpKSB7XG4gICAgZmFpbChhY3R1YWwsIGV4cGVjdGVkLCBtZXNzYWdlLCAnZGVlcFN0cmljdEVxdWFsJywgYXNzZXJ0LmRlZXBTdHJpY3RFcXVhbCk7XG4gIH1cbn07XG5cbmZ1bmN0aW9uIF9kZWVwRXF1YWwoYWN0dWFsLCBleHBlY3RlZCwgc3RyaWN0LCBtZW1vcykge1xuICAvLyA3LjEuIEFsbCBpZGVudGljYWwgdmFsdWVzIGFyZSBlcXVpdmFsZW50LCBhcyBkZXRlcm1pbmVkIGJ5ID09PS5cbiAgaWYgKGFjdHVhbCA9PT0gZXhwZWN0ZWQpIHtcbiAgICByZXR1cm4gdHJ1ZTtcbiAgfSBlbHNlIGlmIChpc0J1ZmZlcihhY3R1YWwpICYmIGlzQnVmZmVyKGV4cGVjdGVkKSkge1xuICAgIHJldHVybiBjb21wYXJlKGFjdHVhbCwgZXhwZWN0ZWQpID09PSAwO1xuXG4gIC8vIDcuMi4gSWYgdGhlIGV4cGVjdGVkIHZhbHVlIGlzIGEgRGF0ZSBvYmplY3QsIHRoZSBhY3R1YWwgdmFsdWUgaXNcbiAgLy8gZXF1aXZhbGVudCBpZiBpdCBpcyBhbHNvIGEgRGF0ZSBvYmplY3QgdGhhdCByZWZlcnMgdG8gdGhlIHNhbWUgdGltZS5cbiAgfSBlbHNlIGlmICh1dGlsLmlzRGF0ZShhY3R1YWwpICYmIHV0aWwuaXNEYXRlKGV4cGVjdGVkKSkge1xuICAgIHJldHVybiBhY3R1YWwuZ2V0VGltZSgpID09PSBleHBlY3RlZC5nZXRUaW1lKCk7XG5cbiAgLy8gNy4zIElmIHRoZSBleHBlY3RlZCB2YWx1ZSBpcyBhIFJlZ0V4cCBvYmplY3QsIHRoZSBhY3R1YWwgdmFsdWUgaXNcbiAgLy8gZXF1aXZhbGVudCBpZiBpdCBpcyBhbHNvIGEgUmVnRXhwIG9iamVjdCB3aXRoIHRoZSBzYW1lIHNvdXJjZSBhbmRcbiAgLy8gcHJvcGVydGllcyAoYGdsb2JhbGAsIGBtdWx0aWxpbmVgLCBgbGFzdEluZGV4YCwgYGlnbm9yZUNhc2VgKS5cbiAgfSBlbHNlIGlmICh1dGlsLmlzUmVnRXhwKGFjdHVhbCkgJiYgdXRpbC5pc1JlZ0V4cChleHBlY3RlZCkpIHtcbiAgICByZXR1cm4gYWN0dWFsLnNvdXJjZSA9PT0gZXhwZWN0ZWQuc291cmNlICYmXG4gICAgICAgICAgIGFjdHVhbC5nbG9iYWwgPT09IGV4cGVjdGVkLmdsb2JhbCAmJlxuICAgICAgICAgICBhY3R1YWwubXVsdGlsaW5lID09PSBleHBlY3RlZC5tdWx0aWxpbmUgJiZcbiAgICAgICAgICAgYWN0dWFsLmxhc3RJbmRleCA9PT0gZXhwZWN0ZWQubGFzdEluZGV4ICYmXG4gICAgICAgICAgIGFjdHVhbC5pZ25vcmVDYXNlID09PSBleHBlY3RlZC5pZ25vcmVDYXNlO1xuXG4gIC8vIDcuNC4gT3RoZXIgcGFpcnMgdGhhdCBkbyBub3QgYm90aCBwYXNzIHR5cGVvZiB2YWx1ZSA9PSAnb2JqZWN0JyxcbiAgLy8gZXF1aXZhbGVuY2UgaXMgZGV0ZXJtaW5lZCBieSA9PS5cbiAgfSBlbHNlIGlmICgoYWN0dWFsID09PSBudWxsIHx8IHR5cGVvZiBhY3R1YWwgIT09ICdvYmplY3QnKSAmJlxuICAgICAgICAgICAgIChleHBlY3RlZCA9PT0gbnVsbCB8fCB0eXBlb2YgZXhwZWN0ZWQgIT09ICdvYmplY3QnKSkge1xuICAgIHJldHVybiBzdHJpY3QgPyBhY3R1YWwgPT09IGV4cGVjdGVkIDogYWN0dWFsID09IGV4cGVjdGVkO1xuXG4gIC8vIElmIGJvdGggdmFsdWVzIGFyZSBpbnN0YW5jZXMgb2YgdHlwZWQgYXJyYXlzLCB3cmFwIHRoZWlyIHVuZGVybHlpbmdcbiAgLy8gQXJyYXlCdWZmZXJzIGluIGEgQnVmZmVyIGVhY2ggdG8gaW5jcmVhc2UgcGVyZm9ybWFuY2VcbiAgLy8gVGhpcyBvcHRpbWl6YXRpb24gcmVxdWlyZXMgdGhlIGFycmF5cyB0byBoYXZlIHRoZSBzYW1lIHR5cGUgYXMgY2hlY2tlZCBieVxuICAvLyBPYmplY3QucHJvdG90eXBlLnRvU3RyaW5nIChha2EgcFRvU3RyaW5nKS4gTmV2ZXIgcGVyZm9ybSBiaW5hcnlcbiAgLy8gY29tcGFyaXNvbnMgZm9yIEZsb2F0KkFycmF5cywgdGhvdWdoLCBzaW5jZSBlLmcuICswID09PSAtMCBidXQgdGhlaXJcbiAgLy8gYml0IHBhdHRlcm5zIGFyZSBub3QgaWRlbnRpY2FsLlxuICB9IGVsc2UgaWYgKGlzVmlldyhhY3R1YWwpICYmIGlzVmlldyhleHBlY3RlZCkgJiZcbiAgICAgICAgICAgICBwVG9TdHJpbmcoYWN0dWFsKSA9PT0gcFRvU3RyaW5nKGV4cGVjdGVkKSAmJlxuICAgICAgICAgICAgICEoYWN0dWFsIGluc3RhbmNlb2YgRmxvYXQzMkFycmF5IHx8XG4gICAgICAgICAgICAgICBhY3R1YWwgaW5zdGFuY2VvZiBGbG9hdDY0QXJyYXkpKSB7XG4gICAgcmV0dXJuIGNvbXBhcmUobmV3IFVpbnQ4QXJyYXkoYWN0dWFsLmJ1ZmZlciksXG4gICAgICAgICAgICAgICAgICAgbmV3IFVpbnQ4QXJyYXkoZXhwZWN0ZWQuYnVmZmVyKSkgPT09IDA7XG5cbiAgLy8gNy41IEZvciBhbGwgb3RoZXIgT2JqZWN0IHBhaXJzLCBpbmNsdWRpbmcgQXJyYXkgb2JqZWN0cywgZXF1aXZhbGVuY2UgaXNcbiAgLy8gZGV0ZXJtaW5lZCBieSBoYXZpbmcgdGhlIHNhbWUgbnVtYmVyIG9mIG93bmVkIHByb3BlcnRpZXMgKGFzIHZlcmlmaWVkXG4gIC8vIHdpdGggT2JqZWN0LnByb3RvdHlwZS5oYXNPd25Qcm9wZXJ0eS5jYWxsKSwgdGhlIHNhbWUgc2V0IG9mIGtleXNcbiAgLy8gKGFsdGhvdWdoIG5vdCBuZWNlc3NhcmlseSB0aGUgc2FtZSBvcmRlciksIGVxdWl2YWxlbnQgdmFsdWVzIGZvciBldmVyeVxuICAvLyBjb3JyZXNwb25kaW5nIGtleSwgYW5kIGFuIGlkZW50aWNhbCAncHJvdG90eXBlJyBwcm9wZXJ0eS4gTm90ZTogdGhpc1xuICAvLyBhY2NvdW50cyBmb3IgYm90aCBuYW1lZCBhbmQgaW5kZXhlZCBwcm9wZXJ0aWVzIG9uIEFycmF5cy5cbiAgfSBlbHNlIGlmIChpc0J1ZmZlcihhY3R1YWwpICE9PSBpc0J1ZmZlcihleHBlY3RlZCkpIHtcbiAgICByZXR1cm4gZmFsc2U7XG4gIH0gZWxzZSB7XG4gICAgbWVtb3MgPSBtZW1vcyB8fCB7YWN0dWFsOiBbXSwgZXhwZWN0ZWQ6IFtdfTtcblxuICAgIHZhciBhY3R1YWxJbmRleCA9IG1lbW9zLmFjdHVhbC5pbmRleE9mKGFjdHVhbCk7XG4gICAgaWYgKGFjdHVhbEluZGV4ICE9PSAtMSkge1xuICAgICAgaWYgKGFjdHVhbEluZGV4ID09PSBtZW1vcy5leHBlY3RlZC5pbmRleE9mKGV4cGVjdGVkKSkge1xuICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICAgIH1cbiAgICB9XG5cbiAgICBtZW1vcy5hY3R1YWwucHVzaChhY3R1YWwpO1xuICAgIG1lbW9zLmV4cGVjdGVkLnB1c2goZXhwZWN0ZWQpO1xuXG4gICAgcmV0dXJuIG9iakVxdWl2KGFjdHVhbCwgZXhwZWN0ZWQsIHN0cmljdCwgbWVtb3MpO1xuICB9XG59XG5cbmZ1bmN0aW9uIGlzQXJndW1lbnRzKG9iamVjdCkge1xuICByZXR1cm4gT2JqZWN0LnByb3RvdHlwZS50b1N0cmluZy5jYWxsKG9iamVjdCkgPT0gJ1tvYmplY3QgQXJndW1lbnRzXSc7XG59XG5cbmZ1bmN0aW9uIG9iakVxdWl2KGEsIGIsIHN0cmljdCwgYWN0dWFsVmlzaXRlZE9iamVjdHMpIHtcbiAgaWYgKGEgPT09IG51bGwgfHwgYSA9PT0gdW5kZWZpbmVkIHx8IGIgPT09IG51bGwgfHwgYiA9PT0gdW5kZWZpbmVkKVxuICAgIHJldHVybiBmYWxzZTtcbiAgLy8gaWYgb25lIGlzIGEgcHJpbWl0aXZlLCB0aGUgb3RoZXIgbXVzdCBiZSBzYW1lXG4gIGlmICh1dGlsLmlzUHJpbWl0aXZlKGEpIHx8IHV0aWwuaXNQcmltaXRpdmUoYikpXG4gICAgcmV0dXJuIGEgPT09IGI7XG4gIGlmIChzdHJpY3QgJiYgT2JqZWN0LmdldFByb3RvdHlwZU9mKGEpICE9PSBPYmplY3QuZ2V0UHJvdG90eXBlT2YoYikpXG4gICAgcmV0dXJuIGZhbHNlO1xuICB2YXIgYUlzQXJncyA9IGlzQXJndW1lbnRzKGEpO1xuICB2YXIgYklzQXJncyA9IGlzQXJndW1lbnRzKGIpO1xuICBpZiAoKGFJc0FyZ3MgJiYgIWJJc0FyZ3MpIHx8ICghYUlzQXJncyAmJiBiSXNBcmdzKSlcbiAgICByZXR1cm4gZmFsc2U7XG4gIGlmIChhSXNBcmdzKSB7XG4gICAgYSA9IHBTbGljZS5jYWxsKGEpO1xuICAgIGIgPSBwU2xpY2UuY2FsbChiKTtcbiAgICByZXR1cm4gX2RlZXBFcXVhbChhLCBiLCBzdHJpY3QpO1xuICB9XG4gIHZhciBrYSA9IG9iamVjdEtleXMoYSk7XG4gIHZhciBrYiA9IG9iamVjdEtleXMoYik7XG4gIHZhciBrZXksIGk7XG4gIC8vIGhhdmluZyB0aGUgc2FtZSBudW1iZXIgb2Ygb3duZWQgcHJvcGVydGllcyAoa2V5cyBpbmNvcnBvcmF0ZXNcbiAgLy8gaGFzT3duUHJvcGVydHkpXG4gIGlmIChrYS5sZW5ndGggIT09IGtiLmxlbmd0aClcbiAgICByZXR1cm4gZmFsc2U7XG4gIC8vdGhlIHNhbWUgc2V0IG9mIGtleXMgKGFsdGhvdWdoIG5vdCBuZWNlc3NhcmlseSB0aGUgc2FtZSBvcmRlciksXG4gIGthLnNvcnQoKTtcbiAga2Iuc29ydCgpO1xuICAvL35+fmNoZWFwIGtleSB0ZXN0XG4gIGZvciAoaSA9IGthLmxlbmd0aCAtIDE7IGkgPj0gMDsgaS0tKSB7XG4gICAgaWYgKGthW2ldICE9PSBrYltpXSlcbiAgICAgIHJldHVybiBmYWxzZTtcbiAgfVxuICAvL2VxdWl2YWxlbnQgdmFsdWVzIGZvciBldmVyeSBjb3JyZXNwb25kaW5nIGtleSwgYW5kXG4gIC8vfn5+cG9zc2libHkgZXhwZW5zaXZlIGRlZXAgdGVzdFxuICBmb3IgKGkgPSBrYS5sZW5ndGggLSAxOyBpID49IDA7IGktLSkge1xuICAgIGtleSA9IGthW2ldO1xuICAgIGlmICghX2RlZXBFcXVhbChhW2tleV0sIGJba2V5XSwgc3RyaWN0LCBhY3R1YWxWaXNpdGVkT2JqZWN0cykpXG4gICAgICByZXR1cm4gZmFsc2U7XG4gIH1cbiAgcmV0dXJuIHRydWU7XG59XG5cbi8vIDguIFRoZSBub24tZXF1aXZhbGVuY2UgYXNzZXJ0aW9uIHRlc3RzIGZvciBhbnkgZGVlcCBpbmVxdWFsaXR5LlxuLy8gYXNzZXJ0Lm5vdERlZXBFcXVhbChhY3R1YWwsIGV4cGVjdGVkLCBtZXNzYWdlX29wdCk7XG5cbmFzc2VydC5ub3REZWVwRXF1YWwgPSBmdW5jdGlvbiBub3REZWVwRXF1YWwoYWN0dWFsLCBleHBlY3RlZCwgbWVzc2FnZSkge1xuICBpZiAoX2RlZXBFcXVhbChhY3R1YWwsIGV4cGVjdGVkLCBmYWxzZSkpIHtcbiAgICBmYWlsKGFjdHVhbCwgZXhwZWN0ZWQsIG1lc3NhZ2UsICdub3REZWVwRXF1YWwnLCBhc3NlcnQubm90RGVlcEVxdWFsKTtcbiAgfVxufTtcblxuYXNzZXJ0Lm5vdERlZXBTdHJpY3RFcXVhbCA9IG5vdERlZXBTdHJpY3RFcXVhbDtcbmZ1bmN0aW9uIG5vdERlZXBTdHJpY3RFcXVhbChhY3R1YWwsIGV4cGVjdGVkLCBtZXNzYWdlKSB7XG4gIGlmIChfZGVlcEVxdWFsKGFjdHVhbCwgZXhwZWN0ZWQsIHRydWUpKSB7XG4gICAgZmFpbChhY3R1YWwsIGV4cGVjdGVkLCBtZXNzYWdlLCAnbm90RGVlcFN0cmljdEVxdWFsJywgbm90RGVlcFN0cmljdEVxdWFsKTtcbiAgfVxufVxuXG5cbi8vIDkuIFRoZSBzdHJpY3QgZXF1YWxpdHkgYXNzZXJ0aW9uIHRlc3RzIHN0cmljdCBlcXVhbGl0eSwgYXMgZGV0ZXJtaW5lZCBieSA9PT0uXG4vLyBhc3NlcnQuc3RyaWN0RXF1YWwoYWN0dWFsLCBleHBlY3RlZCwgbWVzc2FnZV9vcHQpO1xuXG5hc3NlcnQuc3RyaWN0RXF1YWwgPSBmdW5jdGlvbiBzdHJpY3RFcXVhbChhY3R1YWwsIGV4cGVjdGVkLCBtZXNzYWdlKSB7XG4gIGlmIChhY3R1YWwgIT09IGV4cGVjdGVkKSB7XG4gICAgZmFpbChhY3R1YWwsIGV4cGVjdGVkLCBtZXNzYWdlLCAnPT09JywgYXNzZXJ0LnN0cmljdEVxdWFsKTtcbiAgfVxufTtcblxuLy8gMTAuIFRoZSBzdHJpY3Qgbm9uLWVxdWFsaXR5IGFzc2VydGlvbiB0ZXN0cyBmb3Igc3RyaWN0IGluZXF1YWxpdHksIGFzXG4vLyBkZXRlcm1pbmVkIGJ5ICE9PS4gIGFzc2VydC5ub3RTdHJpY3RFcXVhbChhY3R1YWwsIGV4cGVjdGVkLCBtZXNzYWdlX29wdCk7XG5cbmFzc2VydC5ub3RTdHJpY3RFcXVhbCA9IGZ1bmN0aW9uIG5vdFN0cmljdEVxdWFsKGFjdHVhbCwgZXhwZWN0ZWQsIG1lc3NhZ2UpIHtcbiAgaWYgKGFjdHVhbCA9PT0gZXhwZWN0ZWQpIHtcbiAgICBmYWlsKGFjdHVhbCwgZXhwZWN0ZWQsIG1lc3NhZ2UsICchPT0nLCBhc3NlcnQubm90U3RyaWN0RXF1YWwpO1xuICB9XG59O1xuXG5mdW5jdGlvbiBleHBlY3RlZEV4Y2VwdGlvbihhY3R1YWwsIGV4cGVjdGVkKSB7XG4gIGlmICghYWN0dWFsIHx8ICFleHBlY3RlZCkge1xuICAgIHJldHVybiBmYWxzZTtcbiAgfVxuXG4gIGlmIChPYmplY3QucHJvdG90eXBlLnRvU3RyaW5nLmNhbGwoZXhwZWN0ZWQpID09ICdbb2JqZWN0IFJlZ0V4cF0nKSB7XG4gICAgcmV0dXJuIGV4cGVjdGVkLnRlc3QoYWN0dWFsKTtcbiAgfVxuXG4gIHRyeSB7XG4gICAgaWYgKGFjdHVhbCBpbnN0YW5jZW9mIGV4cGVjdGVkKSB7XG4gICAgICByZXR1cm4gdHJ1ZTtcbiAgICB9XG4gIH0gY2F0Y2ggKGUpIHtcbiAgICAvLyBJZ25vcmUuICBUaGUgaW5zdGFuY2VvZiBjaGVjayBkb2Vzbid0IHdvcmsgZm9yIGFycm93IGZ1bmN0aW9ucy5cbiAgfVxuXG4gIGlmIChFcnJvci5pc1Byb3RvdHlwZU9mKGV4cGVjdGVkKSkge1xuICAgIHJldHVybiBmYWxzZTtcbiAgfVxuXG4gIHJldHVybiBleHBlY3RlZC5jYWxsKHt9LCBhY3R1YWwpID09PSB0cnVlO1xufVxuXG5mdW5jdGlvbiBfdHJ5QmxvY2soYmxvY2spIHtcbiAgdmFyIGVycm9yO1xuICB0cnkge1xuICAgIGJsb2NrKCk7XG4gIH0gY2F0Y2ggKGUpIHtcbiAgICBlcnJvciA9IGU7XG4gIH1cbiAgcmV0dXJuIGVycm9yO1xufVxuXG5mdW5jdGlvbiBfdGhyb3dzKHNob3VsZFRocm93LCBibG9jaywgZXhwZWN0ZWQsIG1lc3NhZ2UpIHtcbiAgdmFyIGFjdHVhbDtcblxuICBpZiAodHlwZW9mIGJsb2NrICE9PSAnZnVuY3Rpb24nKSB7XG4gICAgdGhyb3cgbmV3IFR5cGVFcnJvcignXCJibG9ja1wiIGFyZ3VtZW50IG11c3QgYmUgYSBmdW5jdGlvbicpO1xuICB9XG5cbiAgaWYgKHR5cGVvZiBleHBlY3RlZCA9PT0gJ3N0cmluZycpIHtcbiAgICBtZXNzYWdlID0gZXhwZWN0ZWQ7XG4gICAgZXhwZWN0ZWQgPSBudWxsO1xuICB9XG5cbiAgYWN0dWFsID0gX3RyeUJsb2NrKGJsb2NrKTtcblxuICBtZXNzYWdlID0gKGV4cGVjdGVkICYmIGV4cGVjdGVkLm5hbWUgPyAnICgnICsgZXhwZWN0ZWQubmFtZSArICcpLicgOiAnLicpICtcbiAgICAgICAgICAgIChtZXNzYWdlID8gJyAnICsgbWVzc2FnZSA6ICcuJyk7XG5cbiAgaWYgKHNob3VsZFRocm93ICYmICFhY3R1YWwpIHtcbiAgICBmYWlsKGFjdHVhbCwgZXhwZWN0ZWQsICdNaXNzaW5nIGV4cGVjdGVkIGV4Y2VwdGlvbicgKyBtZXNzYWdlKTtcbiAgfVxuXG4gIHZhciB1c2VyUHJvdmlkZWRNZXNzYWdlID0gdHlwZW9mIG1lc3NhZ2UgPT09ICdzdHJpbmcnO1xuICB2YXIgaXNVbndhbnRlZEV4Y2VwdGlvbiA9ICFzaG91bGRUaHJvdyAmJiB1dGlsLmlzRXJyb3IoYWN0dWFsKTtcbiAgdmFyIGlzVW5leHBlY3RlZEV4Y2VwdGlvbiA9ICFzaG91bGRUaHJvdyAmJiBhY3R1YWwgJiYgIWV4cGVjdGVkO1xuXG4gIGlmICgoaXNVbndhbnRlZEV4Y2VwdGlvbiAmJlxuICAgICAgdXNlclByb3ZpZGVkTWVzc2FnZSAmJlxuICAgICAgZXhwZWN0ZWRFeGNlcHRpb24oYWN0dWFsLCBleHBlY3RlZCkpIHx8XG4gICAgICBpc1VuZXhwZWN0ZWRFeGNlcHRpb24pIHtcbiAgICBmYWlsKGFjdHVhbCwgZXhwZWN0ZWQsICdHb3QgdW53YW50ZWQgZXhjZXB0aW9uJyArIG1lc3NhZ2UpO1xuICB9XG5cbiAgaWYgKChzaG91bGRUaHJvdyAmJiBhY3R1YWwgJiYgZXhwZWN0ZWQgJiZcbiAgICAgICFleHBlY3RlZEV4Y2VwdGlvbihhY3R1YWwsIGV4cGVjdGVkKSkgfHwgKCFzaG91bGRUaHJvdyAmJiBhY3R1YWwpKSB7XG4gICAgdGhyb3cgYWN0dWFsO1xuICB9XG59XG5cbi8vIDExLiBFeHBlY3RlZCB0byB0aHJvdyBhbiBlcnJvcjpcbi8vIGFzc2VydC50aHJvd3MoYmxvY2ssIEVycm9yX29wdCwgbWVzc2FnZV9vcHQpO1xuXG5hc3NlcnQudGhyb3dzID0gZnVuY3Rpb24oYmxvY2ssIC8qb3B0aW9uYWwqL2Vycm9yLCAvKm9wdGlvbmFsKi9tZXNzYWdlKSB7XG4gIF90aHJvd3ModHJ1ZSwgYmxvY2ssIGVycm9yLCBtZXNzYWdlKTtcbn07XG5cbi8vIEVYVEVOU0lPTiEgVGhpcyBpcyBhbm5veWluZyB0byB3cml0ZSBvdXRzaWRlIHRoaXMgbW9kdWxlLlxuYXNzZXJ0LmRvZXNOb3RUaHJvdyA9IGZ1bmN0aW9uKGJsb2NrLCAvKm9wdGlvbmFsKi9lcnJvciwgLypvcHRpb25hbCovbWVzc2FnZSkge1xuICBfdGhyb3dzKGZhbHNlLCBibG9jaywgZXJyb3IsIG1lc3NhZ2UpO1xufTtcblxuYXNzZXJ0LmlmRXJyb3IgPSBmdW5jdGlvbihlcnIpIHsgaWYgKGVycikgdGhyb3cgZXJyOyB9O1xuXG52YXIgb2JqZWN0S2V5cyA9IE9iamVjdC5rZXlzIHx8IGZ1bmN0aW9uIChvYmopIHtcbiAgdmFyIGtleXMgPSBbXTtcbiAgZm9yICh2YXIga2V5IGluIG9iaikge1xuICAgIGlmIChoYXNPd24uY2FsbChvYmosIGtleSkpIGtleXMucHVzaChrZXkpO1xuICB9XG4gIHJldHVybiBrZXlzO1xufTtcbiIsIi8vIHNoaW0gZm9yIHVzaW5nIHByb2Nlc3MgaW4gYnJvd3NlclxudmFyIHByb2Nlc3MgPSBtb2R1bGUuZXhwb3J0cyA9IHt9O1xuXG4vLyBjYWNoZWQgZnJvbSB3aGF0ZXZlciBnbG9iYWwgaXMgcHJlc2VudCBzbyB0aGF0IHRlc3QgcnVubmVycyB0aGF0IHN0dWIgaXRcbi8vIGRvbid0IGJyZWFrIHRoaW5ncy4gIEJ1dCB3ZSBuZWVkIHRvIHdyYXAgaXQgaW4gYSB0cnkgY2F0Y2ggaW4gY2FzZSBpdCBpc1xuLy8gd3JhcHBlZCBpbiBzdHJpY3QgbW9kZSBjb2RlIHdoaWNoIGRvZXNuJ3QgZGVmaW5lIGFueSBnbG9iYWxzLiAgSXQncyBpbnNpZGUgYVxuLy8gZnVuY3Rpb24gYmVjYXVzZSB0cnkvY2F0Y2hlcyBkZW9wdGltaXplIGluIGNlcnRhaW4gZW5naW5lcy5cblxudmFyIGNhY2hlZFNldFRpbWVvdXQ7XG52YXIgY2FjaGVkQ2xlYXJUaW1lb3V0O1xuXG5mdW5jdGlvbiBkZWZhdWx0U2V0VGltb3V0KCkge1xuICAgIHRocm93IG5ldyBFcnJvcignc2V0VGltZW91dCBoYXMgbm90IGJlZW4gZGVmaW5lZCcpO1xufVxuZnVuY3Rpb24gZGVmYXVsdENsZWFyVGltZW91dCAoKSB7XG4gICAgdGhyb3cgbmV3IEVycm9yKCdjbGVhclRpbWVvdXQgaGFzIG5vdCBiZWVuIGRlZmluZWQnKTtcbn1cbihmdW5jdGlvbiAoKSB7XG4gICAgdHJ5IHtcbiAgICAgICAgaWYgKHR5cGVvZiBzZXRUaW1lb3V0ID09PSAnZnVuY3Rpb24nKSB7XG4gICAgICAgICAgICBjYWNoZWRTZXRUaW1lb3V0ID0gc2V0VGltZW91dDtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIGNhY2hlZFNldFRpbWVvdXQgPSBkZWZhdWx0U2V0VGltb3V0O1xuICAgICAgICB9XG4gICAgfSBjYXRjaCAoZSkge1xuICAgICAgICBjYWNoZWRTZXRUaW1lb3V0ID0gZGVmYXVsdFNldFRpbW91dDtcbiAgICB9XG4gICAgdHJ5IHtcbiAgICAgICAgaWYgKHR5cGVvZiBjbGVhclRpbWVvdXQgPT09ICdmdW5jdGlvbicpIHtcbiAgICAgICAgICAgIGNhY2hlZENsZWFyVGltZW91dCA9IGNsZWFyVGltZW91dDtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIGNhY2hlZENsZWFyVGltZW91dCA9IGRlZmF1bHRDbGVhclRpbWVvdXQ7XG4gICAgICAgIH1cbiAgICB9IGNhdGNoIChlKSB7XG4gICAgICAgIGNhY2hlZENsZWFyVGltZW91dCA9IGRlZmF1bHRDbGVhclRpbWVvdXQ7XG4gICAgfVxufSAoKSlcbmZ1bmN0aW9uIHJ1blRpbWVvdXQoZnVuKSB7XG4gICAgaWYgKGNhY2hlZFNldFRpbWVvdXQgPT09IHNldFRpbWVvdXQpIHtcbiAgICAgICAgLy9ub3JtYWwgZW52aXJvbWVudHMgaW4gc2FuZSBzaXR1YXRpb25zXG4gICAgICAgIHJldHVybiBzZXRUaW1lb3V0KGZ1biwgMCk7XG4gICAgfVxuICAgIC8vIGlmIHNldFRpbWVvdXQgd2Fzbid0IGF2YWlsYWJsZSBidXQgd2FzIGxhdHRlciBkZWZpbmVkXG4gICAgaWYgKChjYWNoZWRTZXRUaW1lb3V0ID09PSBkZWZhdWx0U2V0VGltb3V0IHx8ICFjYWNoZWRTZXRUaW1lb3V0KSAmJiBzZXRUaW1lb3V0KSB7XG4gICAgICAgIGNhY2hlZFNldFRpbWVvdXQgPSBzZXRUaW1lb3V0O1xuICAgICAgICByZXR1cm4gc2V0VGltZW91dChmdW4sIDApO1xuICAgIH1cbiAgICB0cnkge1xuICAgICAgICAvLyB3aGVuIHdoZW4gc29tZWJvZHkgaGFzIHNjcmV3ZWQgd2l0aCBzZXRUaW1lb3V0IGJ1dCBubyBJLkUuIG1hZGRuZXNzXG4gICAgICAgIHJldHVybiBjYWNoZWRTZXRUaW1lb3V0KGZ1biwgMCk7XG4gICAgfSBjYXRjaChlKXtcbiAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgIC8vIFdoZW4gd2UgYXJlIGluIEkuRS4gYnV0IHRoZSBzY3JpcHQgaGFzIGJlZW4gZXZhbGVkIHNvIEkuRS4gZG9lc24ndCB0cnVzdCB0aGUgZ2xvYmFsIG9iamVjdCB3aGVuIGNhbGxlZCBub3JtYWxseVxuICAgICAgICAgICAgcmV0dXJuIGNhY2hlZFNldFRpbWVvdXQuY2FsbChudWxsLCBmdW4sIDApO1xuICAgICAgICB9IGNhdGNoKGUpe1xuICAgICAgICAgICAgLy8gc2FtZSBhcyBhYm92ZSBidXQgd2hlbiBpdCdzIGEgdmVyc2lvbiBvZiBJLkUuIHRoYXQgbXVzdCBoYXZlIHRoZSBnbG9iYWwgb2JqZWN0IGZvciAndGhpcycsIGhvcGZ1bGx5IG91ciBjb250ZXh0IGNvcnJlY3Qgb3RoZXJ3aXNlIGl0IHdpbGwgdGhyb3cgYSBnbG9iYWwgZXJyb3JcbiAgICAgICAgICAgIHJldHVybiBjYWNoZWRTZXRUaW1lb3V0LmNhbGwodGhpcywgZnVuLCAwKTtcbiAgICAgICAgfVxuICAgIH1cblxuXG59XG5mdW5jdGlvbiBydW5DbGVhclRpbWVvdXQobWFya2VyKSB7XG4gICAgaWYgKGNhY2hlZENsZWFyVGltZW91dCA9PT0gY2xlYXJUaW1lb3V0KSB7XG4gICAgICAgIC8vbm9ybWFsIGVudmlyb21lbnRzIGluIHNhbmUgc2l0dWF0aW9uc1xuICAgICAgICByZXR1cm4gY2xlYXJUaW1lb3V0KG1hcmtlcik7XG4gICAgfVxuICAgIC8vIGlmIGNsZWFyVGltZW91dCB3YXNuJ3QgYXZhaWxhYmxlIGJ1dCB3YXMgbGF0dGVyIGRlZmluZWRcbiAgICBpZiAoKGNhY2hlZENsZWFyVGltZW91dCA9PT0gZGVmYXVsdENsZWFyVGltZW91dCB8fCAhY2FjaGVkQ2xlYXJUaW1lb3V0KSAmJiBjbGVhclRpbWVvdXQpIHtcbiAgICAgICAgY2FjaGVkQ2xlYXJUaW1lb3V0ID0gY2xlYXJUaW1lb3V0O1xuICAgICAgICByZXR1cm4gY2xlYXJUaW1lb3V0KG1hcmtlcik7XG4gICAgfVxuICAgIHRyeSB7XG4gICAgICAgIC8vIHdoZW4gd2hlbiBzb21lYm9keSBoYXMgc2NyZXdlZCB3aXRoIHNldFRpbWVvdXQgYnV0IG5vIEkuRS4gbWFkZG5lc3NcbiAgICAgICAgcmV0dXJuIGNhY2hlZENsZWFyVGltZW91dChtYXJrZXIpO1xuICAgIH0gY2F0Y2ggKGUpe1xuICAgICAgICB0cnkge1xuICAgICAgICAgICAgLy8gV2hlbiB3ZSBhcmUgaW4gSS5FLiBidXQgdGhlIHNjcmlwdCBoYXMgYmVlbiBldmFsZWQgc28gSS5FLiBkb2Vzbid0ICB0cnVzdCB0aGUgZ2xvYmFsIG9iamVjdCB3aGVuIGNhbGxlZCBub3JtYWxseVxuICAgICAgICAgICAgcmV0dXJuIGNhY2hlZENsZWFyVGltZW91dC5jYWxsKG51bGwsIG1hcmtlcik7XG4gICAgICAgIH0gY2F0Y2ggKGUpe1xuICAgICAgICAgICAgLy8gc2FtZSBhcyBhYm92ZSBidXQgd2hlbiBpdCdzIGEgdmVyc2lvbiBvZiBJLkUuIHRoYXQgbXVzdCBoYXZlIHRoZSBnbG9iYWwgb2JqZWN0IGZvciAndGhpcycsIGhvcGZ1bGx5IG91ciBjb250ZXh0IGNvcnJlY3Qgb3RoZXJ3aXNlIGl0IHdpbGwgdGhyb3cgYSBnbG9iYWwgZXJyb3IuXG4gICAgICAgICAgICAvLyBTb21lIHZlcnNpb25zIG9mIEkuRS4gaGF2ZSBkaWZmZXJlbnQgcnVsZXMgZm9yIGNsZWFyVGltZW91dCB2cyBzZXRUaW1lb3V0XG4gICAgICAgICAgICByZXR1cm4gY2FjaGVkQ2xlYXJUaW1lb3V0LmNhbGwodGhpcywgbWFya2VyKTtcbiAgICAgICAgfVxuICAgIH1cblxuXG5cbn1cbnZhciBxdWV1ZSA9IFtdO1xudmFyIGRyYWluaW5nID0gZmFsc2U7XG52YXIgY3VycmVudFF1ZXVlO1xudmFyIHF1ZXVlSW5kZXggPSAtMTtcblxuZnVuY3Rpb24gY2xlYW5VcE5leHRUaWNrKCkge1xuICAgIGlmICghZHJhaW5pbmcgfHwgIWN1cnJlbnRRdWV1ZSkge1xuICAgICAgICByZXR1cm47XG4gICAgfVxuICAgIGRyYWluaW5nID0gZmFsc2U7XG4gICAgaWYgKGN1cnJlbnRRdWV1ZS5sZW5ndGgpIHtcbiAgICAgICAgcXVldWUgPSBjdXJyZW50UXVldWUuY29uY2F0KHF1ZXVlKTtcbiAgICB9IGVsc2Uge1xuICAgICAgICBxdWV1ZUluZGV4ID0gLTE7XG4gICAgfVxuICAgIGlmIChxdWV1ZS5sZW5ndGgpIHtcbiAgICAgICAgZHJhaW5RdWV1ZSgpO1xuICAgIH1cbn1cblxuZnVuY3Rpb24gZHJhaW5RdWV1ZSgpIHtcbiAgICBpZiAoZHJhaW5pbmcpIHtcbiAgICAgICAgcmV0dXJuO1xuICAgIH1cbiAgICB2YXIgdGltZW91dCA9IHJ1blRpbWVvdXQoY2xlYW5VcE5leHRUaWNrKTtcbiAgICBkcmFpbmluZyA9IHRydWU7XG5cbiAgICB2YXIgbGVuID0gcXVldWUubGVuZ3RoO1xuICAgIHdoaWxlKGxlbikge1xuICAgICAgICBjdXJyZW50UXVldWUgPSBxdWV1ZTtcbiAgICAgICAgcXVldWUgPSBbXTtcbiAgICAgICAgd2hpbGUgKCsrcXVldWVJbmRleCA8IGxlbikge1xuICAgICAgICAgICAgaWYgKGN1cnJlbnRRdWV1ZSkge1xuICAgICAgICAgICAgICAgIGN1cnJlbnRRdWV1ZVtxdWV1ZUluZGV4XS5ydW4oKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICBxdWV1ZUluZGV4ID0gLTE7XG4gICAgICAgIGxlbiA9IHF1ZXVlLmxlbmd0aDtcbiAgICB9XG4gICAgY3VycmVudFF1ZXVlID0gbnVsbDtcbiAgICBkcmFpbmluZyA9IGZhbHNlO1xuICAgIHJ1bkNsZWFyVGltZW91dCh0aW1lb3V0KTtcbn1cblxucHJvY2Vzcy5uZXh0VGljayA9IGZ1bmN0aW9uIChmdW4pIHtcbiAgICB2YXIgYXJncyA9IG5ldyBBcnJheShhcmd1bWVudHMubGVuZ3RoIC0gMSk7XG4gICAgaWYgKGFyZ3VtZW50cy5sZW5ndGggPiAxKSB7XG4gICAgICAgIGZvciAodmFyIGkgPSAxOyBpIDwgYXJndW1lbnRzLmxlbmd0aDsgaSsrKSB7XG4gICAgICAgICAgICBhcmdzW2kgLSAxXSA9IGFyZ3VtZW50c1tpXTtcbiAgICAgICAgfVxuICAgIH1cbiAgICBxdWV1ZS5wdXNoKG5ldyBJdGVtKGZ1biwgYXJncykpO1xuICAgIGlmIChxdWV1ZS5sZW5ndGggPT09IDEgJiYgIWRyYWluaW5nKSB7XG4gICAgICAgIHJ1blRpbWVvdXQoZHJhaW5RdWV1ZSk7XG4gICAgfVxufTtcblxuLy8gdjggbGlrZXMgcHJlZGljdGlibGUgb2JqZWN0c1xuZnVuY3Rpb24gSXRlbShmdW4sIGFycmF5KSB7XG4gICAgdGhpcy5mdW4gPSBmdW47XG4gICAgdGhpcy5hcnJheSA9IGFycmF5O1xufVxuSXRlbS5wcm90b3R5cGUucnVuID0gZnVuY3Rpb24gKCkge1xuICAgIHRoaXMuZnVuLmFwcGx5KG51bGwsIHRoaXMuYXJyYXkpO1xufTtcbnByb2Nlc3MudGl0bGUgPSAnYnJvd3Nlcic7XG5wcm9jZXNzLmJyb3dzZXIgPSB0cnVlO1xucHJvY2Vzcy5lbnYgPSB7fTtcbnByb2Nlc3MuYXJndiA9IFtdO1xucHJvY2Vzcy52ZXJzaW9uID0gJyc7IC8vIGVtcHR5IHN0cmluZyB0byBhdm9pZCByZWdleHAgaXNzdWVzXG5wcm9jZXNzLnZlcnNpb25zID0ge307XG5cbmZ1bmN0aW9uIG5vb3AoKSB7fVxuXG5wcm9jZXNzLm9uID0gbm9vcDtcbnByb2Nlc3MuYWRkTGlzdGVuZXIgPSBub29wO1xucHJvY2Vzcy5vbmNlID0gbm9vcDtcbnByb2Nlc3Mub2ZmID0gbm9vcDtcbnByb2Nlc3MucmVtb3ZlTGlzdGVuZXIgPSBub29wO1xucHJvY2Vzcy5yZW1vdmVBbGxMaXN0ZW5lcnMgPSBub29wO1xucHJvY2Vzcy5lbWl0ID0gbm9vcDtcblxucHJvY2Vzcy5iaW5kaW5nID0gZnVuY3Rpb24gKG5hbWUpIHtcbiAgICB0aHJvdyBuZXcgRXJyb3IoJ3Byb2Nlc3MuYmluZGluZyBpcyBub3Qgc3VwcG9ydGVkJyk7XG59O1xuXG5wcm9jZXNzLmN3ZCA9IGZ1bmN0aW9uICgpIHsgcmV0dXJuICcvJyB9O1xucHJvY2Vzcy5jaGRpciA9IGZ1bmN0aW9uIChkaXIpIHtcbiAgICB0aHJvdyBuZXcgRXJyb3IoJ3Byb2Nlc3MuY2hkaXIgaXMgbm90IHN1cHBvcnRlZCcpO1xufTtcbnByb2Nlc3MudW1hc2sgPSBmdW5jdGlvbigpIHsgcmV0dXJuIDA7IH07XG4iLCJpZiAodHlwZW9mIE9iamVjdC5jcmVhdGUgPT09ICdmdW5jdGlvbicpIHtcbiAgLy8gaW1wbGVtZW50YXRpb24gZnJvbSBzdGFuZGFyZCBub2RlLmpzICd1dGlsJyBtb2R1bGVcbiAgbW9kdWxlLmV4cG9ydHMgPSBmdW5jdGlvbiBpbmhlcml0cyhjdG9yLCBzdXBlckN0b3IpIHtcbiAgICBjdG9yLnN1cGVyXyA9IHN1cGVyQ3RvclxuICAgIGN0b3IucHJvdG90eXBlID0gT2JqZWN0LmNyZWF0ZShzdXBlckN0b3IucHJvdG90eXBlLCB7XG4gICAgICBjb25zdHJ1Y3Rvcjoge1xuICAgICAgICB2YWx1ZTogY3RvcixcbiAgICAgICAgZW51bWVyYWJsZTogZmFsc2UsXG4gICAgICAgIHdyaXRhYmxlOiB0cnVlLFxuICAgICAgICBjb25maWd1cmFibGU6IHRydWVcbiAgICAgIH1cbiAgICB9KTtcbiAgfTtcbn0gZWxzZSB7XG4gIC8vIG9sZCBzY2hvb2wgc2hpbSBmb3Igb2xkIGJyb3dzZXJzXG4gIG1vZHVsZS5leHBvcnRzID0gZnVuY3Rpb24gaW5oZXJpdHMoY3Rvciwgc3VwZXJDdG9yKSB7XG4gICAgY3Rvci5zdXBlcl8gPSBzdXBlckN0b3JcbiAgICB2YXIgVGVtcEN0b3IgPSBmdW5jdGlvbiAoKSB7fVxuICAgIFRlbXBDdG9yLnByb3RvdHlwZSA9IHN1cGVyQ3Rvci5wcm90b3R5cGVcbiAgICBjdG9yLnByb3RvdHlwZSA9IG5ldyBUZW1wQ3RvcigpXG4gICAgY3Rvci5wcm90b3R5cGUuY29uc3RydWN0b3IgPSBjdG9yXG4gIH1cbn1cbiIsIm1vZHVsZS5leHBvcnRzID0gZnVuY3Rpb24gaXNCdWZmZXIoYXJnKSB7XG4gIHJldHVybiBhcmcgJiYgdHlwZW9mIGFyZyA9PT0gJ29iamVjdCdcbiAgICAmJiB0eXBlb2YgYXJnLmNvcHkgPT09ICdmdW5jdGlvbidcbiAgICAmJiB0eXBlb2YgYXJnLmZpbGwgPT09ICdmdW5jdGlvbidcbiAgICAmJiB0eXBlb2YgYXJnLnJlYWRVSW50OCA9PT0gJ2Z1bmN0aW9uJztcbn0iLCIvLyBDb3B5cmlnaHQgSm95ZW50LCBJbmMuIGFuZCBvdGhlciBOb2RlIGNvbnRyaWJ1dG9ycy5cbi8vXG4vLyBQZXJtaXNzaW9uIGlzIGhlcmVieSBncmFudGVkLCBmcmVlIG9mIGNoYXJnZSwgdG8gYW55IHBlcnNvbiBvYnRhaW5pbmcgYVxuLy8gY29weSBvZiB0aGlzIHNvZnR3YXJlIGFuZCBhc3NvY2lhdGVkIGRvY3VtZW50YXRpb24gZmlsZXMgKHRoZVxuLy8gXCJTb2Z0d2FyZVwiKSwgdG8gZGVhbCBpbiB0aGUgU29mdHdhcmUgd2l0aG91dCByZXN0cmljdGlvbiwgaW5jbHVkaW5nXG4vLyB3aXRob3V0IGxpbWl0YXRpb24gdGhlIHJpZ2h0cyB0byB1c2UsIGNvcHksIG1vZGlmeSwgbWVyZ2UsIHB1Ymxpc2gsXG4vLyBkaXN0cmlidXRlLCBzdWJsaWNlbnNlLCBhbmQvb3Igc2VsbCBjb3BpZXMgb2YgdGhlIFNvZnR3YXJlLCBhbmQgdG8gcGVybWl0XG4vLyBwZXJzb25zIHRvIHdob20gdGhlIFNvZnR3YXJlIGlzIGZ1cm5pc2hlZCB0byBkbyBzbywgc3ViamVjdCB0byB0aGVcbi8vIGZvbGxvd2luZyBjb25kaXRpb25zOlxuLy9cbi8vIFRoZSBhYm92ZSBjb3B5cmlnaHQgbm90aWNlIGFuZCB0aGlzIHBlcm1pc3Npb24gbm90aWNlIHNoYWxsIGJlIGluY2x1ZGVkXG4vLyBpbiBhbGwgY29waWVzIG9yIHN1YnN0YW50aWFsIHBvcnRpb25zIG9mIHRoZSBTb2Z0d2FyZS5cbi8vXG4vLyBUSEUgU09GVFdBUkUgSVMgUFJPVklERUQgXCJBUyBJU1wiLCBXSVRIT1VUIFdBUlJBTlRZIE9GIEFOWSBLSU5ELCBFWFBSRVNTXG4vLyBPUiBJTVBMSUVELCBJTkNMVURJTkcgQlVUIE5PVCBMSU1JVEVEIFRPIFRIRSBXQVJSQU5USUVTIE9GXG4vLyBNRVJDSEFOVEFCSUxJVFksIEZJVE5FU1MgRk9SIEEgUEFSVElDVUxBUiBQVVJQT1NFIEFORCBOT05JTkZSSU5HRU1FTlQuIElOXG4vLyBOTyBFVkVOVCBTSEFMTCBUSEUgQVVUSE9SUyBPUiBDT1BZUklHSFQgSE9MREVSUyBCRSBMSUFCTEUgRk9SIEFOWSBDTEFJTSxcbi8vIERBTUFHRVMgT1IgT1RIRVIgTElBQklMSVRZLCBXSEVUSEVSIElOIEFOIEFDVElPTiBPRiBDT05UUkFDVCwgVE9SVCBPUlxuLy8gT1RIRVJXSVNFLCBBUklTSU5HIEZST00sIE9VVCBPRiBPUiBJTiBDT05ORUNUSU9OIFdJVEggVEhFIFNPRlRXQVJFIE9SIFRIRVxuLy8gVVNFIE9SIE9USEVSIERFQUxJTkdTIElOIFRIRSBTT0ZUV0FSRS5cblxudmFyIGZvcm1hdFJlZ0V4cCA9IC8lW3NkaiVdL2c7XG5leHBvcnRzLmZvcm1hdCA9IGZ1bmN0aW9uKGYpIHtcbiAgaWYgKCFpc1N0cmluZyhmKSkge1xuICAgIHZhciBvYmplY3RzID0gW107XG4gICAgZm9yICh2YXIgaSA9IDA7IGkgPCBhcmd1bWVudHMubGVuZ3RoOyBpKyspIHtcbiAgICAgIG9iamVjdHMucHVzaChpbnNwZWN0KGFyZ3VtZW50c1tpXSkpO1xuICAgIH1cbiAgICByZXR1cm4gb2JqZWN0cy5qb2luKCcgJyk7XG4gIH1cblxuICB2YXIgaSA9IDE7XG4gIHZhciBhcmdzID0gYXJndW1lbnRzO1xuICB2YXIgbGVuID0gYXJncy5sZW5ndGg7XG4gIHZhciBzdHIgPSBTdHJpbmcoZikucmVwbGFjZShmb3JtYXRSZWdFeHAsIGZ1bmN0aW9uKHgpIHtcbiAgICBpZiAoeCA9PT0gJyUlJykgcmV0dXJuICclJztcbiAgICBpZiAoaSA+PSBsZW4pIHJldHVybiB4O1xuICAgIHN3aXRjaCAoeCkge1xuICAgICAgY2FzZSAnJXMnOiByZXR1cm4gU3RyaW5nKGFyZ3NbaSsrXSk7XG4gICAgICBjYXNlICclZCc6IHJldHVybiBOdW1iZXIoYXJnc1tpKytdKTtcbiAgICAgIGNhc2UgJyVqJzpcbiAgICAgICAgdHJ5IHtcbiAgICAgICAgICByZXR1cm4gSlNPTi5zdHJpbmdpZnkoYXJnc1tpKytdKTtcbiAgICAgICAgfSBjYXRjaCAoXykge1xuICAgICAgICAgIHJldHVybiAnW0NpcmN1bGFyXSc7XG4gICAgICAgIH1cbiAgICAgIGRlZmF1bHQ6XG4gICAgICAgIHJldHVybiB4O1xuICAgIH1cbiAgfSk7XG4gIGZvciAodmFyIHggPSBhcmdzW2ldOyBpIDwgbGVuOyB4ID0gYXJnc1srK2ldKSB7XG4gICAgaWYgKGlzTnVsbCh4KSB8fCAhaXNPYmplY3QoeCkpIHtcbiAgICAgIHN0ciArPSAnICcgKyB4O1xuICAgIH0gZWxzZSB7XG4gICAgICBzdHIgKz0gJyAnICsgaW5zcGVjdCh4KTtcbiAgICB9XG4gIH1cbiAgcmV0dXJuIHN0cjtcbn07XG5cblxuLy8gTWFyayB0aGF0IGEgbWV0aG9kIHNob3VsZCBub3QgYmUgdXNlZC5cbi8vIFJldHVybnMgYSBtb2RpZmllZCBmdW5jdGlvbiB3aGljaCB3YXJucyBvbmNlIGJ5IGRlZmF1bHQuXG4vLyBJZiAtLW5vLWRlcHJlY2F0aW9uIGlzIHNldCwgdGhlbiBpdCBpcyBhIG5vLW9wLlxuZXhwb3J0cy5kZXByZWNhdGUgPSBmdW5jdGlvbihmbiwgbXNnKSB7XG4gIC8vIEFsbG93IGZvciBkZXByZWNhdGluZyB0aGluZ3MgaW4gdGhlIHByb2Nlc3Mgb2Ygc3RhcnRpbmcgdXAuXG4gIGlmIChpc1VuZGVmaW5lZChnbG9iYWwucHJvY2VzcykpIHtcbiAgICByZXR1cm4gZnVuY3Rpb24oKSB7XG4gICAgICByZXR1cm4gZXhwb3J0cy5kZXByZWNhdGUoZm4sIG1zZykuYXBwbHkodGhpcywgYXJndW1lbnRzKTtcbiAgICB9O1xuICB9XG5cbiAgaWYgKHByb2Nlc3Mubm9EZXByZWNhdGlvbiA9PT0gdHJ1ZSkge1xuICAgIHJldHVybiBmbjtcbiAgfVxuXG4gIHZhciB3YXJuZWQgPSBmYWxzZTtcbiAgZnVuY3Rpb24gZGVwcmVjYXRlZCgpIHtcbiAgICBpZiAoIXdhcm5lZCkge1xuICAgICAgaWYgKHByb2Nlc3MudGhyb3dEZXByZWNhdGlvbikge1xuICAgICAgICB0aHJvdyBuZXcgRXJyb3IobXNnKTtcbiAgICAgIH0gZWxzZSBpZiAocHJvY2Vzcy50cmFjZURlcHJlY2F0aW9uKSB7XG4gICAgICAgIGNvbnNvbGUudHJhY2UobXNnKTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIGNvbnNvbGUuZXJyb3IobXNnKTtcbiAgICAgIH1cbiAgICAgIHdhcm5lZCA9IHRydWU7XG4gICAgfVxuICAgIHJldHVybiBmbi5hcHBseSh0aGlzLCBhcmd1bWVudHMpO1xuICB9XG5cbiAgcmV0dXJuIGRlcHJlY2F0ZWQ7XG59O1xuXG5cbnZhciBkZWJ1Z3MgPSB7fTtcbnZhciBkZWJ1Z0Vudmlyb247XG5leHBvcnRzLmRlYnVnbG9nID0gZnVuY3Rpb24oc2V0KSB7XG4gIGlmIChpc1VuZGVmaW5lZChkZWJ1Z0Vudmlyb24pKVxuICAgIGRlYnVnRW52aXJvbiA9IHByb2Nlc3MuZW52Lk5PREVfREVCVUcgfHwgJyc7XG4gIHNldCA9IHNldC50b1VwcGVyQ2FzZSgpO1xuICBpZiAoIWRlYnVnc1tzZXRdKSB7XG4gICAgaWYgKG5ldyBSZWdFeHAoJ1xcXFxiJyArIHNldCArICdcXFxcYicsICdpJykudGVzdChkZWJ1Z0Vudmlyb24pKSB7XG4gICAgICB2YXIgcGlkID0gcHJvY2Vzcy5waWQ7XG4gICAgICBkZWJ1Z3Nbc2V0XSA9IGZ1bmN0aW9uKCkge1xuICAgICAgICB2YXIgbXNnID0gZXhwb3J0cy5mb3JtYXQuYXBwbHkoZXhwb3J0cywgYXJndW1lbnRzKTtcbiAgICAgICAgY29uc29sZS5lcnJvcignJXMgJWQ6ICVzJywgc2V0LCBwaWQsIG1zZyk7XG4gICAgICB9O1xuICAgIH0gZWxzZSB7XG4gICAgICBkZWJ1Z3Nbc2V0XSA9IGZ1bmN0aW9uKCkge307XG4gICAgfVxuICB9XG4gIHJldHVybiBkZWJ1Z3Nbc2V0XTtcbn07XG5cblxuLyoqXG4gKiBFY2hvcyB0aGUgdmFsdWUgb2YgYSB2YWx1ZS4gVHJ5cyB0byBwcmludCB0aGUgdmFsdWUgb3V0XG4gKiBpbiB0aGUgYmVzdCB3YXkgcG9zc2libGUgZ2l2ZW4gdGhlIGRpZmZlcmVudCB0eXBlcy5cbiAqXG4gKiBAcGFyYW0ge09iamVjdH0gb2JqIFRoZSBvYmplY3QgdG8gcHJpbnQgb3V0LlxuICogQHBhcmFtIHtPYmplY3R9IG9wdHMgT3B0aW9uYWwgb3B0aW9ucyBvYmplY3QgdGhhdCBhbHRlcnMgdGhlIG91dHB1dC5cbiAqL1xuLyogbGVnYWN5OiBvYmosIHNob3dIaWRkZW4sIGRlcHRoLCBjb2xvcnMqL1xuZnVuY3Rpb24gaW5zcGVjdChvYmosIG9wdHMpIHtcbiAgLy8gZGVmYXVsdCBvcHRpb25zXG4gIHZhciBjdHggPSB7XG4gICAgc2VlbjogW10sXG4gICAgc3R5bGl6ZTogc3R5bGl6ZU5vQ29sb3JcbiAgfTtcbiAgLy8gbGVnYWN5Li4uXG4gIGlmIChhcmd1bWVudHMubGVuZ3RoID49IDMpIGN0eC5kZXB0aCA9IGFyZ3VtZW50c1syXTtcbiAgaWYgKGFyZ3VtZW50cy5sZW5ndGggPj0gNCkgY3R4LmNvbG9ycyA9IGFyZ3VtZW50c1szXTtcbiAgaWYgKGlzQm9vbGVhbihvcHRzKSkge1xuICAgIC8vIGxlZ2FjeS4uLlxuICAgIGN0eC5zaG93SGlkZGVuID0gb3B0cztcbiAgfSBlbHNlIGlmIChvcHRzKSB7XG4gICAgLy8gZ290IGFuIFwib3B0aW9uc1wiIG9iamVjdFxuICAgIGV4cG9ydHMuX2V4dGVuZChjdHgsIG9wdHMpO1xuICB9XG4gIC8vIHNldCBkZWZhdWx0IG9wdGlvbnNcbiAgaWYgKGlzVW5kZWZpbmVkKGN0eC5zaG93SGlkZGVuKSkgY3R4LnNob3dIaWRkZW4gPSBmYWxzZTtcbiAgaWYgKGlzVW5kZWZpbmVkKGN0eC5kZXB0aCkpIGN0eC5kZXB0aCA9IDI7XG4gIGlmIChpc1VuZGVmaW5lZChjdHguY29sb3JzKSkgY3R4LmNvbG9ycyA9IGZhbHNlO1xuICBpZiAoaXNVbmRlZmluZWQoY3R4LmN1c3RvbUluc3BlY3QpKSBjdHguY3VzdG9tSW5zcGVjdCA9IHRydWU7XG4gIGlmIChjdHguY29sb3JzKSBjdHguc3R5bGl6ZSA9IHN0eWxpemVXaXRoQ29sb3I7XG4gIHJldHVybiBmb3JtYXRWYWx1ZShjdHgsIG9iaiwgY3R4LmRlcHRoKTtcbn1cbmV4cG9ydHMuaW5zcGVjdCA9IGluc3BlY3Q7XG5cblxuLy8gaHR0cDovL2VuLndpa2lwZWRpYS5vcmcvd2lraS9BTlNJX2VzY2FwZV9jb2RlI2dyYXBoaWNzXG5pbnNwZWN0LmNvbG9ycyA9IHtcbiAgJ2JvbGQnIDogWzEsIDIyXSxcbiAgJ2l0YWxpYycgOiBbMywgMjNdLFxuICAndW5kZXJsaW5lJyA6IFs0LCAyNF0sXG4gICdpbnZlcnNlJyA6IFs3LCAyN10sXG4gICd3aGl0ZScgOiBbMzcsIDM5XSxcbiAgJ2dyZXknIDogWzkwLCAzOV0sXG4gICdibGFjaycgOiBbMzAsIDM5XSxcbiAgJ2JsdWUnIDogWzM0LCAzOV0sXG4gICdjeWFuJyA6IFszNiwgMzldLFxuICAnZ3JlZW4nIDogWzMyLCAzOV0sXG4gICdtYWdlbnRhJyA6IFszNSwgMzldLFxuICAncmVkJyA6IFszMSwgMzldLFxuICAneWVsbG93JyA6IFszMywgMzldXG59O1xuXG4vLyBEb24ndCB1c2UgJ2JsdWUnIG5vdCB2aXNpYmxlIG9uIGNtZC5leGVcbmluc3BlY3Quc3R5bGVzID0ge1xuICAnc3BlY2lhbCc6ICdjeWFuJyxcbiAgJ251bWJlcic6ICd5ZWxsb3cnLFxuICAnYm9vbGVhbic6ICd5ZWxsb3cnLFxuICAndW5kZWZpbmVkJzogJ2dyZXknLFxuICAnbnVsbCc6ICdib2xkJyxcbiAgJ3N0cmluZyc6ICdncmVlbicsXG4gICdkYXRlJzogJ21hZ2VudGEnLFxuICAvLyBcIm5hbWVcIjogaW50ZW50aW9uYWxseSBub3Qgc3R5bGluZ1xuICAncmVnZXhwJzogJ3JlZCdcbn07XG5cblxuZnVuY3Rpb24gc3R5bGl6ZVdpdGhDb2xvcihzdHIsIHN0eWxlVHlwZSkge1xuICB2YXIgc3R5bGUgPSBpbnNwZWN0LnN0eWxlc1tzdHlsZVR5cGVdO1xuXG4gIGlmIChzdHlsZSkge1xuICAgIHJldHVybiAnXFx1MDAxYlsnICsgaW5zcGVjdC5jb2xvcnNbc3R5bGVdWzBdICsgJ20nICsgc3RyICtcbiAgICAgICAgICAgJ1xcdTAwMWJbJyArIGluc3BlY3QuY29sb3JzW3N0eWxlXVsxXSArICdtJztcbiAgfSBlbHNlIHtcbiAgICByZXR1cm4gc3RyO1xuICB9XG59XG5cblxuZnVuY3Rpb24gc3R5bGl6ZU5vQ29sb3Ioc3RyLCBzdHlsZVR5cGUpIHtcbiAgcmV0dXJuIHN0cjtcbn1cblxuXG5mdW5jdGlvbiBhcnJheVRvSGFzaChhcnJheSkge1xuICB2YXIgaGFzaCA9IHt9O1xuXG4gIGFycmF5LmZvckVhY2goZnVuY3Rpb24odmFsLCBpZHgpIHtcbiAgICBoYXNoW3ZhbF0gPSB0cnVlO1xuICB9KTtcblxuICByZXR1cm4gaGFzaDtcbn1cblxuXG5mdW5jdGlvbiBmb3JtYXRWYWx1ZShjdHgsIHZhbHVlLCByZWN1cnNlVGltZXMpIHtcbiAgLy8gUHJvdmlkZSBhIGhvb2sgZm9yIHVzZXItc3BlY2lmaWVkIGluc3BlY3QgZnVuY3Rpb25zLlxuICAvLyBDaGVjayB0aGF0IHZhbHVlIGlzIGFuIG9iamVjdCB3aXRoIGFuIGluc3BlY3QgZnVuY3Rpb24gb24gaXRcbiAgaWYgKGN0eC5jdXN0b21JbnNwZWN0ICYmXG4gICAgICB2YWx1ZSAmJlxuICAgICAgaXNGdW5jdGlvbih2YWx1ZS5pbnNwZWN0KSAmJlxuICAgICAgLy8gRmlsdGVyIG91dCB0aGUgdXRpbCBtb2R1bGUsIGl0J3MgaW5zcGVjdCBmdW5jdGlvbiBpcyBzcGVjaWFsXG4gICAgICB2YWx1ZS5pbnNwZWN0ICE9PSBleHBvcnRzLmluc3BlY3QgJiZcbiAgICAgIC8vIEFsc28gZmlsdGVyIG91dCBhbnkgcHJvdG90eXBlIG9iamVjdHMgdXNpbmcgdGhlIGNpcmN1bGFyIGNoZWNrLlxuICAgICAgISh2YWx1ZS5jb25zdHJ1Y3RvciAmJiB2YWx1ZS5jb25zdHJ1Y3Rvci5wcm90b3R5cGUgPT09IHZhbHVlKSkge1xuICAgIHZhciByZXQgPSB2YWx1ZS5pbnNwZWN0KHJlY3Vyc2VUaW1lcywgY3R4KTtcbiAgICBpZiAoIWlzU3RyaW5nKHJldCkpIHtcbiAgICAgIHJldCA9IGZvcm1hdFZhbHVlKGN0eCwgcmV0LCByZWN1cnNlVGltZXMpO1xuICAgIH1cbiAgICByZXR1cm4gcmV0O1xuICB9XG5cbiAgLy8gUHJpbWl0aXZlIHR5cGVzIGNhbm5vdCBoYXZlIHByb3BlcnRpZXNcbiAgdmFyIHByaW1pdGl2ZSA9IGZvcm1hdFByaW1pdGl2ZShjdHgsIHZhbHVlKTtcbiAgaWYgKHByaW1pdGl2ZSkge1xuICAgIHJldHVybiBwcmltaXRpdmU7XG4gIH1cblxuICAvLyBMb29rIHVwIHRoZSBrZXlzIG9mIHRoZSBvYmplY3QuXG4gIHZhciBrZXlzID0gT2JqZWN0LmtleXModmFsdWUpO1xuICB2YXIgdmlzaWJsZUtleXMgPSBhcnJheVRvSGFzaChrZXlzKTtcblxuICBpZiAoY3R4LnNob3dIaWRkZW4pIHtcbiAgICBrZXlzID0gT2JqZWN0LmdldE93blByb3BlcnR5TmFtZXModmFsdWUpO1xuICB9XG5cbiAgLy8gSUUgZG9lc24ndCBtYWtlIGVycm9yIGZpZWxkcyBub24tZW51bWVyYWJsZVxuICAvLyBodHRwOi8vbXNkbi5taWNyb3NvZnQuY29tL2VuLXVzL2xpYnJhcnkvaWUvZHd3NTJzYnQodj12cy45NCkuYXNweFxuICBpZiAoaXNFcnJvcih2YWx1ZSlcbiAgICAgICYmIChrZXlzLmluZGV4T2YoJ21lc3NhZ2UnKSA+PSAwIHx8IGtleXMuaW5kZXhPZignZGVzY3JpcHRpb24nKSA+PSAwKSkge1xuICAgIHJldHVybiBmb3JtYXRFcnJvcih2YWx1ZSk7XG4gIH1cblxuICAvLyBTb21lIHR5cGUgb2Ygb2JqZWN0IHdpdGhvdXQgcHJvcGVydGllcyBjYW4gYmUgc2hvcnRjdXR0ZWQuXG4gIGlmIChrZXlzLmxlbmd0aCA9PT0gMCkge1xuICAgIGlmIChpc0Z1bmN0aW9uKHZhbHVlKSkge1xuICAgICAgdmFyIG5hbWUgPSB2YWx1ZS5uYW1lID8gJzogJyArIHZhbHVlLm5hbWUgOiAnJztcbiAgICAgIHJldHVybiBjdHguc3R5bGl6ZSgnW0Z1bmN0aW9uJyArIG5hbWUgKyAnXScsICdzcGVjaWFsJyk7XG4gICAgfVxuICAgIGlmIChpc1JlZ0V4cCh2YWx1ZSkpIHtcbiAgICAgIHJldHVybiBjdHguc3R5bGl6ZShSZWdFeHAucHJvdG90eXBlLnRvU3RyaW5nLmNhbGwodmFsdWUpLCAncmVnZXhwJyk7XG4gICAgfVxuICAgIGlmIChpc0RhdGUodmFsdWUpKSB7XG4gICAgICByZXR1cm4gY3R4LnN0eWxpemUoRGF0ZS5wcm90b3R5cGUudG9TdHJpbmcuY2FsbCh2YWx1ZSksICdkYXRlJyk7XG4gICAgfVxuICAgIGlmIChpc0Vycm9yKHZhbHVlKSkge1xuICAgICAgcmV0dXJuIGZvcm1hdEVycm9yKHZhbHVlKTtcbiAgICB9XG4gIH1cblxuICB2YXIgYmFzZSA9ICcnLCBhcnJheSA9IGZhbHNlLCBicmFjZXMgPSBbJ3snLCAnfSddO1xuXG4gIC8vIE1ha2UgQXJyYXkgc2F5IHRoYXQgdGhleSBhcmUgQXJyYXlcbiAgaWYgKGlzQXJyYXkodmFsdWUpKSB7XG4gICAgYXJyYXkgPSB0cnVlO1xuICAgIGJyYWNlcyA9IFsnWycsICddJ107XG4gIH1cblxuICAvLyBNYWtlIGZ1bmN0aW9ucyBzYXkgdGhhdCB0aGV5IGFyZSBmdW5jdGlvbnNcbiAgaWYgKGlzRnVuY3Rpb24odmFsdWUpKSB7XG4gICAgdmFyIG4gPSB2YWx1ZS5uYW1lID8gJzogJyArIHZhbHVlLm5hbWUgOiAnJztcbiAgICBiYXNlID0gJyBbRnVuY3Rpb24nICsgbiArICddJztcbiAgfVxuXG4gIC8vIE1ha2UgUmVnRXhwcyBzYXkgdGhhdCB0aGV5IGFyZSBSZWdFeHBzXG4gIGlmIChpc1JlZ0V4cCh2YWx1ZSkpIHtcbiAgICBiYXNlID0gJyAnICsgUmVnRXhwLnByb3RvdHlwZS50b1N0cmluZy5jYWxsKHZhbHVlKTtcbiAgfVxuXG4gIC8vIE1ha2UgZGF0ZXMgd2l0aCBwcm9wZXJ0aWVzIGZpcnN0IHNheSB0aGUgZGF0ZVxuICBpZiAoaXNEYXRlKHZhbHVlKSkge1xuICAgIGJhc2UgPSAnICcgKyBEYXRlLnByb3RvdHlwZS50b1VUQ1N0cmluZy5jYWxsKHZhbHVlKTtcbiAgfVxuXG4gIC8vIE1ha2UgZXJyb3Igd2l0aCBtZXNzYWdlIGZpcnN0IHNheSB0aGUgZXJyb3JcbiAgaWYgKGlzRXJyb3IodmFsdWUpKSB7XG4gICAgYmFzZSA9ICcgJyArIGZvcm1hdEVycm9yKHZhbHVlKTtcbiAgfVxuXG4gIGlmIChrZXlzLmxlbmd0aCA9PT0gMCAmJiAoIWFycmF5IHx8IHZhbHVlLmxlbmd0aCA9PSAwKSkge1xuICAgIHJldHVybiBicmFjZXNbMF0gKyBiYXNlICsgYnJhY2VzWzFdO1xuICB9XG5cbiAgaWYgKHJlY3Vyc2VUaW1lcyA8IDApIHtcbiAgICBpZiAoaXNSZWdFeHAodmFsdWUpKSB7XG4gICAgICByZXR1cm4gY3R4LnN0eWxpemUoUmVnRXhwLnByb3RvdHlwZS50b1N0cmluZy5jYWxsKHZhbHVlKSwgJ3JlZ2V4cCcpO1xuICAgIH0gZWxzZSB7XG4gICAgICByZXR1cm4gY3R4LnN0eWxpemUoJ1tPYmplY3RdJywgJ3NwZWNpYWwnKTtcbiAgICB9XG4gIH1cblxuICBjdHguc2Vlbi5wdXNoKHZhbHVlKTtcblxuICB2YXIgb3V0cHV0O1xuICBpZiAoYXJyYXkpIHtcbiAgICBvdXRwdXQgPSBmb3JtYXRBcnJheShjdHgsIHZhbHVlLCByZWN1cnNlVGltZXMsIHZpc2libGVLZXlzLCBrZXlzKTtcbiAgfSBlbHNlIHtcbiAgICBvdXRwdXQgPSBrZXlzLm1hcChmdW5jdGlvbihrZXkpIHtcbiAgICAgIHJldHVybiBmb3JtYXRQcm9wZXJ0eShjdHgsIHZhbHVlLCByZWN1cnNlVGltZXMsIHZpc2libGVLZXlzLCBrZXksIGFycmF5KTtcbiAgICB9KTtcbiAgfVxuXG4gIGN0eC5zZWVuLnBvcCgpO1xuXG4gIHJldHVybiByZWR1Y2VUb1NpbmdsZVN0cmluZyhvdXRwdXQsIGJhc2UsIGJyYWNlcyk7XG59XG5cblxuZnVuY3Rpb24gZm9ybWF0UHJpbWl0aXZlKGN0eCwgdmFsdWUpIHtcbiAgaWYgKGlzVW5kZWZpbmVkKHZhbHVlKSlcbiAgICByZXR1cm4gY3R4LnN0eWxpemUoJ3VuZGVmaW5lZCcsICd1bmRlZmluZWQnKTtcbiAgaWYgKGlzU3RyaW5nKHZhbHVlKSkge1xuICAgIHZhciBzaW1wbGUgPSAnXFwnJyArIEpTT04uc3RyaW5naWZ5KHZhbHVlKS5yZXBsYWNlKC9eXCJ8XCIkL2csICcnKVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgLnJlcGxhY2UoLycvZywgXCJcXFxcJ1wiKVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgLnJlcGxhY2UoL1xcXFxcIi9nLCAnXCInKSArICdcXCcnO1xuICAgIHJldHVybiBjdHguc3R5bGl6ZShzaW1wbGUsICdzdHJpbmcnKTtcbiAgfVxuICBpZiAoaXNOdW1iZXIodmFsdWUpKVxuICAgIHJldHVybiBjdHguc3R5bGl6ZSgnJyArIHZhbHVlLCAnbnVtYmVyJyk7XG4gIGlmIChpc0Jvb2xlYW4odmFsdWUpKVxuICAgIHJldHVybiBjdHguc3R5bGl6ZSgnJyArIHZhbHVlLCAnYm9vbGVhbicpO1xuICAvLyBGb3Igc29tZSByZWFzb24gdHlwZW9mIG51bGwgaXMgXCJvYmplY3RcIiwgc28gc3BlY2lhbCBjYXNlIGhlcmUuXG4gIGlmIChpc051bGwodmFsdWUpKVxuICAgIHJldHVybiBjdHguc3R5bGl6ZSgnbnVsbCcsICdudWxsJyk7XG59XG5cblxuZnVuY3Rpb24gZm9ybWF0RXJyb3IodmFsdWUpIHtcbiAgcmV0dXJuICdbJyArIEVycm9yLnByb3RvdHlwZS50b1N0cmluZy5jYWxsKHZhbHVlKSArICddJztcbn1cblxuXG5mdW5jdGlvbiBmb3JtYXRBcnJheShjdHgsIHZhbHVlLCByZWN1cnNlVGltZXMsIHZpc2libGVLZXlzLCBrZXlzKSB7XG4gIHZhciBvdXRwdXQgPSBbXTtcbiAgZm9yICh2YXIgaSA9IDAsIGwgPSB2YWx1ZS5sZW5ndGg7IGkgPCBsOyArK2kpIHtcbiAgICBpZiAoaGFzT3duUHJvcGVydHkodmFsdWUsIFN0cmluZyhpKSkpIHtcbiAgICAgIG91dHB1dC5wdXNoKGZvcm1hdFByb3BlcnR5KGN0eCwgdmFsdWUsIHJlY3Vyc2VUaW1lcywgdmlzaWJsZUtleXMsXG4gICAgICAgICAgU3RyaW5nKGkpLCB0cnVlKSk7XG4gICAgfSBlbHNlIHtcbiAgICAgIG91dHB1dC5wdXNoKCcnKTtcbiAgICB9XG4gIH1cbiAga2V5cy5mb3JFYWNoKGZ1bmN0aW9uKGtleSkge1xuICAgIGlmICgha2V5Lm1hdGNoKC9eXFxkKyQvKSkge1xuICAgICAgb3V0cHV0LnB1c2goZm9ybWF0UHJvcGVydHkoY3R4LCB2YWx1ZSwgcmVjdXJzZVRpbWVzLCB2aXNpYmxlS2V5cyxcbiAgICAgICAgICBrZXksIHRydWUpKTtcbiAgICB9XG4gIH0pO1xuICByZXR1cm4gb3V0cHV0O1xufVxuXG5cbmZ1bmN0aW9uIGZvcm1hdFByb3BlcnR5KGN0eCwgdmFsdWUsIHJlY3Vyc2VUaW1lcywgdmlzaWJsZUtleXMsIGtleSwgYXJyYXkpIHtcbiAgdmFyIG5hbWUsIHN0ciwgZGVzYztcbiAgZGVzYyA9IE9iamVjdC5nZXRPd25Qcm9wZXJ0eURlc2NyaXB0b3IodmFsdWUsIGtleSkgfHwgeyB2YWx1ZTogdmFsdWVba2V5XSB9O1xuICBpZiAoZGVzYy5nZXQpIHtcbiAgICBpZiAoZGVzYy5zZXQpIHtcbiAgICAgIHN0ciA9IGN0eC5zdHlsaXplKCdbR2V0dGVyL1NldHRlcl0nLCAnc3BlY2lhbCcpO1xuICAgIH0gZWxzZSB7XG4gICAgICBzdHIgPSBjdHguc3R5bGl6ZSgnW0dldHRlcl0nLCAnc3BlY2lhbCcpO1xuICAgIH1cbiAgfSBlbHNlIHtcbiAgICBpZiAoZGVzYy5zZXQpIHtcbiAgICAgIHN0ciA9IGN0eC5zdHlsaXplKCdbU2V0dGVyXScsICdzcGVjaWFsJyk7XG4gICAgfVxuICB9XG4gIGlmICghaGFzT3duUHJvcGVydHkodmlzaWJsZUtleXMsIGtleSkpIHtcbiAgICBuYW1lID0gJ1snICsga2V5ICsgJ10nO1xuICB9XG4gIGlmICghc3RyKSB7XG4gICAgaWYgKGN0eC5zZWVuLmluZGV4T2YoZGVzYy52YWx1ZSkgPCAwKSB7XG4gICAgICBpZiAoaXNOdWxsKHJlY3Vyc2VUaW1lcykpIHtcbiAgICAgICAgc3RyID0gZm9ybWF0VmFsdWUoY3R4LCBkZXNjLnZhbHVlLCBudWxsKTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIHN0ciA9IGZvcm1hdFZhbHVlKGN0eCwgZGVzYy52YWx1ZSwgcmVjdXJzZVRpbWVzIC0gMSk7XG4gICAgICB9XG4gICAgICBpZiAoc3RyLmluZGV4T2YoJ1xcbicpID4gLTEpIHtcbiAgICAgICAgaWYgKGFycmF5KSB7XG4gICAgICAgICAgc3RyID0gc3RyLnNwbGl0KCdcXG4nKS5tYXAoZnVuY3Rpb24obGluZSkge1xuICAgICAgICAgICAgcmV0dXJuICcgICcgKyBsaW5lO1xuICAgICAgICAgIH0pLmpvaW4oJ1xcbicpLnN1YnN0cigyKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICBzdHIgPSAnXFxuJyArIHN0ci5zcGxpdCgnXFxuJykubWFwKGZ1bmN0aW9uKGxpbmUpIHtcbiAgICAgICAgICAgIHJldHVybiAnICAgJyArIGxpbmU7XG4gICAgICAgICAgfSkuam9pbignXFxuJyk7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9IGVsc2Uge1xuICAgICAgc3RyID0gY3R4LnN0eWxpemUoJ1tDaXJjdWxhcl0nLCAnc3BlY2lhbCcpO1xuICAgIH1cbiAgfVxuICBpZiAoaXNVbmRlZmluZWQobmFtZSkpIHtcbiAgICBpZiAoYXJyYXkgJiYga2V5Lm1hdGNoKC9eXFxkKyQvKSkge1xuICAgICAgcmV0dXJuIHN0cjtcbiAgICB9XG4gICAgbmFtZSA9IEpTT04uc3RyaW5naWZ5KCcnICsga2V5KTtcbiAgICBpZiAobmFtZS5tYXRjaCgvXlwiKFthLXpBLVpfXVthLXpBLVpfMC05XSopXCIkLykpIHtcbiAgICAgIG5hbWUgPSBuYW1lLnN1YnN0cigxLCBuYW1lLmxlbmd0aCAtIDIpO1xuICAgICAgbmFtZSA9IGN0eC5zdHlsaXplKG5hbWUsICduYW1lJyk7XG4gICAgfSBlbHNlIHtcbiAgICAgIG5hbWUgPSBuYW1lLnJlcGxhY2UoLycvZywgXCJcXFxcJ1wiKVxuICAgICAgICAgICAgICAgICAucmVwbGFjZSgvXFxcXFwiL2csICdcIicpXG4gICAgICAgICAgICAgICAgIC5yZXBsYWNlKC8oXlwifFwiJCkvZywgXCInXCIpO1xuICAgICAgbmFtZSA9IGN0eC5zdHlsaXplKG5hbWUsICdzdHJpbmcnKTtcbiAgICB9XG4gIH1cblxuICByZXR1cm4gbmFtZSArICc6ICcgKyBzdHI7XG59XG5cblxuZnVuY3Rpb24gcmVkdWNlVG9TaW5nbGVTdHJpbmcob3V0cHV0LCBiYXNlLCBicmFjZXMpIHtcbiAgdmFyIG51bUxpbmVzRXN0ID0gMDtcbiAgdmFyIGxlbmd0aCA9IG91dHB1dC5yZWR1Y2UoZnVuY3Rpb24ocHJldiwgY3VyKSB7XG4gICAgbnVtTGluZXNFc3QrKztcbiAgICBpZiAoY3VyLmluZGV4T2YoJ1xcbicpID49IDApIG51bUxpbmVzRXN0Kys7XG4gICAgcmV0dXJuIHByZXYgKyBjdXIucmVwbGFjZSgvXFx1MDAxYlxcW1xcZFxcZD9tL2csICcnKS5sZW5ndGggKyAxO1xuICB9LCAwKTtcblxuICBpZiAobGVuZ3RoID4gNjApIHtcbiAgICByZXR1cm4gYnJhY2VzWzBdICtcbiAgICAgICAgICAgKGJhc2UgPT09ICcnID8gJycgOiBiYXNlICsgJ1xcbiAnKSArXG4gICAgICAgICAgICcgJyArXG4gICAgICAgICAgIG91dHB1dC5qb2luKCcsXFxuICAnKSArXG4gICAgICAgICAgICcgJyArXG4gICAgICAgICAgIGJyYWNlc1sxXTtcbiAgfVxuXG4gIHJldHVybiBicmFjZXNbMF0gKyBiYXNlICsgJyAnICsgb3V0cHV0LmpvaW4oJywgJykgKyAnICcgKyBicmFjZXNbMV07XG59XG5cblxuLy8gTk9URTogVGhlc2UgdHlwZSBjaGVja2luZyBmdW5jdGlvbnMgaW50ZW50aW9uYWxseSBkb24ndCB1c2UgYGluc3RhbmNlb2ZgXG4vLyBiZWNhdXNlIGl0IGlzIGZyYWdpbGUgYW5kIGNhbiBiZSBlYXNpbHkgZmFrZWQgd2l0aCBgT2JqZWN0LmNyZWF0ZSgpYC5cbmZ1bmN0aW9uIGlzQXJyYXkoYXIpIHtcbiAgcmV0dXJuIEFycmF5LmlzQXJyYXkoYXIpO1xufVxuZXhwb3J0cy5pc0FycmF5ID0gaXNBcnJheTtcblxuZnVuY3Rpb24gaXNCb29sZWFuKGFyZykge1xuICByZXR1cm4gdHlwZW9mIGFyZyA9PT0gJ2Jvb2xlYW4nO1xufVxuZXhwb3J0cy5pc0Jvb2xlYW4gPSBpc0Jvb2xlYW47XG5cbmZ1bmN0aW9uIGlzTnVsbChhcmcpIHtcbiAgcmV0dXJuIGFyZyA9PT0gbnVsbDtcbn1cbmV4cG9ydHMuaXNOdWxsID0gaXNOdWxsO1xuXG5mdW5jdGlvbiBpc051bGxPclVuZGVmaW5lZChhcmcpIHtcbiAgcmV0dXJuIGFyZyA9PSBudWxsO1xufVxuZXhwb3J0cy5pc051bGxPclVuZGVmaW5lZCA9IGlzTnVsbE9yVW5kZWZpbmVkO1xuXG5mdW5jdGlvbiBpc051bWJlcihhcmcpIHtcbiAgcmV0dXJuIHR5cGVvZiBhcmcgPT09ICdudW1iZXInO1xufVxuZXhwb3J0cy5pc051bWJlciA9IGlzTnVtYmVyO1xuXG5mdW5jdGlvbiBpc1N0cmluZyhhcmcpIHtcbiAgcmV0dXJuIHR5cGVvZiBhcmcgPT09ICdzdHJpbmcnO1xufVxuZXhwb3J0cy5pc1N0cmluZyA9IGlzU3RyaW5nO1xuXG5mdW5jdGlvbiBpc1N5bWJvbChhcmcpIHtcbiAgcmV0dXJuIHR5cGVvZiBhcmcgPT09ICdzeW1ib2wnO1xufVxuZXhwb3J0cy5pc1N5bWJvbCA9IGlzU3ltYm9sO1xuXG5mdW5jdGlvbiBpc1VuZGVmaW5lZChhcmcpIHtcbiAgcmV0dXJuIGFyZyA9PT0gdm9pZCAwO1xufVxuZXhwb3J0cy5pc1VuZGVmaW5lZCA9IGlzVW5kZWZpbmVkO1xuXG5mdW5jdGlvbiBpc1JlZ0V4cChyZSkge1xuICByZXR1cm4gaXNPYmplY3QocmUpICYmIG9iamVjdFRvU3RyaW5nKHJlKSA9PT0gJ1tvYmplY3QgUmVnRXhwXSc7XG59XG5leHBvcnRzLmlzUmVnRXhwID0gaXNSZWdFeHA7XG5cbmZ1bmN0aW9uIGlzT2JqZWN0KGFyZykge1xuICByZXR1cm4gdHlwZW9mIGFyZyA9PT0gJ29iamVjdCcgJiYgYXJnICE9PSBudWxsO1xufVxuZXhwb3J0cy5pc09iamVjdCA9IGlzT2JqZWN0O1xuXG5mdW5jdGlvbiBpc0RhdGUoZCkge1xuICByZXR1cm4gaXNPYmplY3QoZCkgJiYgb2JqZWN0VG9TdHJpbmcoZCkgPT09ICdbb2JqZWN0IERhdGVdJztcbn1cbmV4cG9ydHMuaXNEYXRlID0gaXNEYXRlO1xuXG5mdW5jdGlvbiBpc0Vycm9yKGUpIHtcbiAgcmV0dXJuIGlzT2JqZWN0KGUpICYmXG4gICAgICAob2JqZWN0VG9TdHJpbmcoZSkgPT09ICdbb2JqZWN0IEVycm9yXScgfHwgZSBpbnN0YW5jZW9mIEVycm9yKTtcbn1cbmV4cG9ydHMuaXNFcnJvciA9IGlzRXJyb3I7XG5cbmZ1bmN0aW9uIGlzRnVuY3Rpb24oYXJnKSB7XG4gIHJldHVybiB0eXBlb2YgYXJnID09PSAnZnVuY3Rpb24nO1xufVxuZXhwb3J0cy5pc0Z1bmN0aW9uID0gaXNGdW5jdGlvbjtcblxuZnVuY3Rpb24gaXNQcmltaXRpdmUoYXJnKSB7XG4gIHJldHVybiBhcmcgPT09IG51bGwgfHxcbiAgICAgICAgIHR5cGVvZiBhcmcgPT09ICdib29sZWFuJyB8fFxuICAgICAgICAgdHlwZW9mIGFyZyA9PT0gJ251bWJlcicgfHxcbiAgICAgICAgIHR5cGVvZiBhcmcgPT09ICdzdHJpbmcnIHx8XG4gICAgICAgICB0eXBlb2YgYXJnID09PSAnc3ltYm9sJyB8fCAgLy8gRVM2IHN5bWJvbFxuICAgICAgICAgdHlwZW9mIGFyZyA9PT0gJ3VuZGVmaW5lZCc7XG59XG5leHBvcnRzLmlzUHJpbWl0aXZlID0gaXNQcmltaXRpdmU7XG5cbmV4cG9ydHMuaXNCdWZmZXIgPSByZXF1aXJlKCcuL3N1cHBvcnQvaXNCdWZmZXInKTtcblxuZnVuY3Rpb24gb2JqZWN0VG9TdHJpbmcobykge1xuICByZXR1cm4gT2JqZWN0LnByb3RvdHlwZS50b1N0cmluZy5jYWxsKG8pO1xufVxuXG5cbmZ1bmN0aW9uIHBhZChuKSB7XG4gIHJldHVybiBuIDwgMTAgPyAnMCcgKyBuLnRvU3RyaW5nKDEwKSA6IG4udG9TdHJpbmcoMTApO1xufVxuXG5cbnZhciBtb250aHMgPSBbJ0phbicsICdGZWInLCAnTWFyJywgJ0FwcicsICdNYXknLCAnSnVuJywgJ0p1bCcsICdBdWcnLCAnU2VwJyxcbiAgICAgICAgICAgICAgJ09jdCcsICdOb3YnLCAnRGVjJ107XG5cbi8vIDI2IEZlYiAxNjoxOTozNFxuZnVuY3Rpb24gdGltZXN0YW1wKCkge1xuICB2YXIgZCA9IG5ldyBEYXRlKCk7XG4gIHZhciB0aW1lID0gW3BhZChkLmdldEhvdXJzKCkpLFxuICAgICAgICAgICAgICBwYWQoZC5nZXRNaW51dGVzKCkpLFxuICAgICAgICAgICAgICBwYWQoZC5nZXRTZWNvbmRzKCkpXS5qb2luKCc6Jyk7XG4gIHJldHVybiBbZC5nZXREYXRlKCksIG1vbnRoc1tkLmdldE1vbnRoKCldLCB0aW1lXS5qb2luKCcgJyk7XG59XG5cblxuLy8gbG9nIGlzIGp1c3QgYSB0aGluIHdyYXBwZXIgdG8gY29uc29sZS5sb2cgdGhhdCBwcmVwZW5kcyBhIHRpbWVzdGFtcFxuZXhwb3J0cy5sb2cgPSBmdW5jdGlvbigpIHtcbiAgY29uc29sZS5sb2coJyVzIC0gJXMnLCB0aW1lc3RhbXAoKSwgZXhwb3J0cy5mb3JtYXQuYXBwbHkoZXhwb3J0cywgYXJndW1lbnRzKSk7XG59O1xuXG5cbi8qKlxuICogSW5oZXJpdCB0aGUgcHJvdG90eXBlIG1ldGhvZHMgZnJvbSBvbmUgY29uc3RydWN0b3IgaW50byBhbm90aGVyLlxuICpcbiAqIFRoZSBGdW5jdGlvbi5wcm90b3R5cGUuaW5oZXJpdHMgZnJvbSBsYW5nLmpzIHJld3JpdHRlbiBhcyBhIHN0YW5kYWxvbmVcbiAqIGZ1bmN0aW9uIChub3Qgb24gRnVuY3Rpb24ucHJvdG90eXBlKS4gTk9URTogSWYgdGhpcyBmaWxlIGlzIHRvIGJlIGxvYWRlZFxuICogZHVyaW5nIGJvb3RzdHJhcHBpbmcgdGhpcyBmdW5jdGlvbiBuZWVkcyB0byBiZSByZXdyaXR0ZW4gdXNpbmcgc29tZSBuYXRpdmVcbiAqIGZ1bmN0aW9ucyBhcyBwcm90b3R5cGUgc2V0dXAgdXNpbmcgbm9ybWFsIEphdmFTY3JpcHQgZG9lcyBub3Qgd29yayBhc1xuICogZXhwZWN0ZWQgZHVyaW5nIGJvb3RzdHJhcHBpbmcgKHNlZSBtaXJyb3IuanMgaW4gcjExNDkwMykuXG4gKlxuICogQHBhcmFtIHtmdW5jdGlvbn0gY3RvciBDb25zdHJ1Y3RvciBmdW5jdGlvbiB3aGljaCBuZWVkcyB0byBpbmhlcml0IHRoZVxuICogICAgIHByb3RvdHlwZS5cbiAqIEBwYXJhbSB7ZnVuY3Rpb259IHN1cGVyQ3RvciBDb25zdHJ1Y3RvciBmdW5jdGlvbiB0byBpbmhlcml0IHByb3RvdHlwZSBmcm9tLlxuICovXG5leHBvcnRzLmluaGVyaXRzID0gcmVxdWlyZSgnaW5oZXJpdHMnKTtcblxuZXhwb3J0cy5fZXh0ZW5kID0gZnVuY3Rpb24ob3JpZ2luLCBhZGQpIHtcbiAgLy8gRG9uJ3QgZG8gYW55dGhpbmcgaWYgYWRkIGlzbid0IGFuIG9iamVjdFxuICBpZiAoIWFkZCB8fCAhaXNPYmplY3QoYWRkKSkgcmV0dXJuIG9yaWdpbjtcblxuICB2YXIga2V5cyA9IE9iamVjdC5rZXlzKGFkZCk7XG4gIHZhciBpID0ga2V5cy5sZW5ndGg7XG4gIHdoaWxlIChpLS0pIHtcbiAgICBvcmlnaW5ba2V5c1tpXV0gPSBhZGRba2V5c1tpXV07XG4gIH1cbiAgcmV0dXJuIG9yaWdpbjtcbn07XG5cbmZ1bmN0aW9uIGhhc093blByb3BlcnR5KG9iaiwgcHJvcCkge1xuICByZXR1cm4gT2JqZWN0LnByb3RvdHlwZS5oYXNPd25Qcm9wZXJ0eS5jYWxsKG9iaiwgcHJvcCk7XG59XG4iLCIvKipcclxuICogTmFtZSBnZW5lcmF0b3IgZm9yIGJhY2t1cHNcclxuICovXHJcblxyXG5leHBvcnRzLmdlbkJhY2t1cE5hbWUgPSBmdW5jdGlvbihkYXRlID0gbmV3IERhdGUoKSkge1xyXG5cdHJldHVybiBgYmFja3VwLSR7ZGF0ZS5nZXRGdWxsWWVhcigpfS0ke2RhdGUuZ2V0TW9udGgoKSsxfS0ke2RhdGUuZ2V0RGF0ZSgpfWBcclxuXHRcdCsgYC0ke2RhdGUuZ2V0SG91cnMoKX0tJHtkYXRlLmdldE1pbnV0ZXMoKX0uemlwYDtcclxufTtcclxuIiwiLyoqXHJcbiAqIEEgYmFzaWMga2V5IHZhbHVlIGRhdGEgc3RvcmVcclxuICovXHJcblxyXG52YXIgRXZlbnRFbWl0dGVyID0gcmVxdWlyZShcIi4uL3V0aWwvZXZlbnQtZW1pdHRlclwiKTtcclxuXHJcbmNsYXNzIEtleVZhbHVlU3RvcmUgZXh0ZW5kcyBFdmVudEVtaXR0ZXIge1xyXG5cdGNvbnN0cnVjdG9yKGFkYXB0ZXIpIHtcclxuXHRcdHN1cGVyKCk7XHJcblx0XHR0aGlzLl9hZGFwdGVyID0gYWRhcHRlcjtcclxuXHJcblx0XHQvLyBtYWtlIHN1cmUgd2UgaGF2ZSBhbiBhZGFwdGVyXHJcblx0XHRpZighYWRhcHRlcikge1xyXG5cdFx0XHR0aHJvdyBuZXcgRXJyb3IoXCJLZXlWYWx1ZVN0b3JlIG11c3QgYmUgaW5pdGlhbGl6ZWQgd2l0aCBhbiBhZGFwdGVyXCIpXHJcblx0XHR9XHJcblx0fVxyXG5cclxuXHQvKipcclxuXHQgKiBHZXQgdGhlIGNvcnJpc3BvbmRpbmcgdmFsdWUgb3V0IG9mIHRoZSBkYXRhIHN0b3JlIG90aGVyd2lzZSByZXR1cm4gZGVmYXVsdFxyXG5cdCAqL1xyXG5cdGdldChrZXksIF9kZWZhdWx0KSB7XHJcblx0XHQvLyBjaGVjayBpZiB0aGlzIHZhbHVlIGhhcyBiZWVuIG92ZXJyaWRlblxyXG5cdFx0aWYodGhpcy5fb3ZlcnJpZGVzICYmIHRoaXMuX292ZXJyaWRlcy5oYXNPd25Qcm9wZXJ0eShrZXkpKSB7XHJcblx0XHRcdHJldHVybiBQcm9taXNlLnJlc29sdmUodGhpcy5fb3ZlcnJpZGVzW2tleV0pO1xyXG5cdFx0fVxyXG5cclxuXHRcdHJldHVybiB0aGlzLl9hZGFwdGVyLmdldChrZXkpXHJcblxyXG5cdFx0LnRoZW4ocmVzdWx0ID0+IHtcclxuXHRcdFx0Ly8gdGhlIGl0ZW0gaXMgbm90IGRlZmluZWRcclxuXHRcdFx0aWYoIXJlc3VsdCkge1xyXG5cdFx0XHRcdHJldHVybiBfZGVmYXVsdDtcclxuXHRcdFx0fVxyXG5cclxuXHRcdFx0cmV0dXJuIHJlc3VsdC52YWx1ZTtcclxuXHRcdH0pO1xyXG5cdH1cclxuXHJcblx0LyoqXHJcblx0ICogU2V0IGEgc2luZ2xlIHZhbHVlIG9yIHNldmVyYWwgdmFsdWVzXHJcblx0ICpcclxuXHQgKiBrZXkgLT4gdmFsdWVcclxuXHQgKiBvclxyXG5cdCAqIHsga2V5OiB2YWx1ZSB9XHJcblx0ICovXHJcblx0c2V0KGtleSwgdmFsdWUpIHtcclxuXHRcdC8vIHNldCBhIHNpbmdsZSB2YWx1ZVxyXG5cdFx0aWYodHlwZW9mIGtleSA9PSBcInN0cmluZ1wiKSB7XHJcblx0XHRcdHZhciBwcm9taXNlID0gdGhpcy5fYWRhcHRlci5zZXQoe1xyXG5cdFx0XHRcdGlkOiBrZXksXHJcblx0XHRcdFx0dmFsdWUsXHJcblx0XHRcdFx0bW9kaWZpZWQ6IERhdGUubm93KClcclxuXHRcdFx0fSk7XHJcblxyXG5cdFx0XHQvLyB0cmlnZ2VyIHRoZSBjaGFuZ2VcclxuXHRcdFx0dGhpcy5lbWl0KGtleSwgdmFsdWUpO1xyXG5cclxuXHRcdFx0cmV0dXJuIHByb21pc2U7XHJcblx0XHR9XHJcblx0XHQvLyBzZXQgc2V2ZXJhbCB2YWx1ZXNcclxuXHRcdGVsc2Uge1xyXG5cdFx0XHQvLyB0ZWxsIHRoZSBjYWxsZXIgd2hlbiB3ZSBhcmUgZG9uZVxyXG5cdFx0XHRsZXQgcHJvbWlzZXMgPSBbXTtcclxuXHJcblx0XHRcdGZvcihsZXQgX2tleSBvZiBPYmplY3QuZ2V0T3duUHJvcGVydHlOYW1lcyhrZXkpKSB7XHJcblx0XHRcdFx0cHJvbWlzZXMucHVzaChcclxuXHRcdFx0XHRcdHRoaXMuX2FkYXB0ZXIuc2V0KHtcclxuXHRcdFx0XHRcdFx0aWQ6IF9rZXksXHJcblx0XHRcdFx0XHRcdHZhbHVlOiBrZXlbX2tleV0sXHJcblx0XHRcdFx0XHRcdG1vZGlmaWVkOiBEYXRlLm5vdygpXHJcblx0XHRcdFx0XHR9KVxyXG5cdFx0XHRcdCk7XHJcblxyXG5cdFx0XHRcdC8vIHRyaWdnZXIgdGhlIGNoYW5nZVxyXG5cdFx0XHRcdHRoaXMuZW1pdChfa2V5LCBrZXlbX2tleV0pO1xyXG5cdFx0XHR9XHJcblxyXG5cdFx0XHRyZXR1cm4gUHJvbWlzZS5hbGwocHJvbWlzZXMpO1xyXG5cdFx0fVxyXG5cdH1cclxuXHJcblx0IC8qKlxyXG5cdCAgKiBXYXRjaCB0aGUgdmFsdWUgZm9yIGNoYW5nZXNcclxuXHQgICpcclxuXHQgICogb3B0cy5jdXJyZW50IC0gc2VuZCB0aGUgY3VycmVudCB2YWx1ZSBvZiBrZXkgKGRlZmF1bHQ6IGZhbHNlKVxyXG5cdCAgKiBvcHRzLmRlZmF1bHQgLSB0aGUgZGVmYXVsdCB2YWx1ZSB0byBzZW5kIGZvciBvcHRzLmN1cnJlbnRcclxuXHQgICovXHJcblx0IHdhdGNoKGtleSwgb3B0cywgZm4pIHtcclxuXHRcdCAvLyBtYWtlIG9wdHMgb3B0aW9uYWxcclxuXHRcdCBpZih0eXBlb2Ygb3B0cyA9PSBcImZ1bmN0aW9uXCIpIHtcclxuXHRcdFx0IGZuID0gb3B0cztcclxuXHRcdFx0IG9wdHMgPSB7fTtcclxuXHRcdCB9XHJcblxyXG5cdFx0IC8vIHNlbmQgdGhlIGN1cnJlbnQgdmFsdWVcclxuXHRcdCBpZihvcHRzLmN1cnJlbnQpIHtcclxuXHRcdFx0IHRoaXMuZ2V0KGtleSwgb3B0cy5kZWZhdWx0KVxyXG5cdFx0XHQgXHQudGhlbih2YWx1ZSA9PiBmbih2YWx1ZSkpO1xyXG5cdFx0IH1cclxuXHJcblx0XHQgLy8gbGlzdGVuIGZvciBhbnkgY2hhbmdlc1xyXG5cdFx0IHJldHVybiB0aGlzLm9uKGtleSwgdmFsdWUgPT4ge1xyXG5cdFx0XHQgLy8gb25seSBlbWl0IHRoZSBjaGFuZ2UgaWYgdGhlcmUgaXMgbm90IGFuIG92ZXJyaWRlIGluIHBsYWNlXHJcblx0XHRcdCBpZighdGhpcy5fb3ZlcnJpZGVzIHx8ICF0aGlzLl9vdmVycmlkZXMuaGFzT3duUHJvcGVydHkoa2V5KSkge1xyXG5cdFx0XHRcdCBmbih2YWx1ZSk7XHJcblx0XHRcdCB9XHJcblx0XHQgfSk7XHJcblx0IH1cclxuXHJcblx0IC8qKlxyXG5cdCAgKiBPdmVycmlkZSB0aGUgdmFsdWVzIGZyb20gdGhlIGFkYXB0b3Igd2l0aG91dCB3cml0aW5nIHRvIHRoZW1cclxuXHQgICpcclxuXHQgICogVXNlZnVsIGZvciBjb21iaW5pbmcganNvbiBzZXR0aW5ncyB3aXRoIGNvbW1hbmQgbGluZSBmbGFnc1xyXG5cdCAgKi9cclxuXHQgc2V0T3ZlcnJpZGVzKG92ZXJyaWRlcykge1xyXG5cdFx0IHRoaXMuX292ZXJyaWRlcyA9IG92ZXJyaWRlcztcclxuXHJcblx0XHQgLy8gZW1pdCBjaGFuZ2VzIGZvciBlYWNoIG9mIHRoZSBvdmVycmlkZXNcclxuXHRcdCBPYmplY3QuZ2V0T3duUHJvcGVydHlOYW1lcyhvdmVycmlkZXMpXHJcblxyXG5cdFx0IC5mb3JFYWNoKGtleSA9PiB0aGlzLmVtaXQoa2V5LCBvdmVycmlkZXNba2V5XSkpO1xyXG5cdCB9XHJcbn1cclxuXHJcbm1vZHVsZS5leHBvcnRzID0gS2V5VmFsdWVTdG9yZTtcclxuIiwiLyoqXHJcbiAqIEFuIGluIG1lbW9yeSBhZGFwdGVyIGZvciBkYXRhIHN0b3Jlc1xyXG4gKi9cclxuXHJcbmNsYXNzIE1lbUFkYXB0b3Ige1xyXG5cdGNvbnN0cnVjdG9yKCkge1xyXG5cdFx0dGhpcy5fZGF0YSA9IHt9O1xyXG5cdH1cclxuXHJcblx0LyoqXHJcblx0ICogR2V0IGFuIGFycmF5IG9mIHZhbHVlc1xyXG5cdCAqL1xyXG5cdGdldEFsbCgpIHtcclxuXHRcdHJldHVybiBQcm9taXNlLnJlc29sdmUoXHJcblx0XHRcdE9iamVjdC5nZXRPd25Qcm9wZXJ0eU5hbWVzKHRoaXMuX2RhdGEpXHJcblxyXG5cdFx0XHQubWFwKG5hbWUgPT4gdGhpcy5fZGF0YVtuYW1lXSlcclxuXHRcdCk7XHJcblx0fVxyXG5cclxuXHQvKipcclxuXHQgKiBMb29rdXAgYSB2YWx1ZVxyXG5cdCAqXHJcblx0ICogcmV0dXJucyB7aWQsIHZhbHVlfVxyXG5cdCAqL1xyXG5cdGdldChpZCkge1xyXG5cdFx0Ly8gY2hlY2sgaWYgd2UgaGF2ZSB0aGUgdmFsdWVcclxuXHRcdGlmKHRoaXMuX2RhdGEuaGFzT3duUHJvcGVydHkoaWQpKSB7XHJcblx0XHRcdHJldHVybiBQcm9taXNlLnJlc29sdmUodGhpcy5fZGF0YVtpZF0pO1xyXG5cdFx0fVxyXG5cclxuXHRcdHJldHVybiBQcm9taXNlLnJlc29sdmUoKTtcclxuXHR9XHJcblxyXG5cdC8qKlxyXG5cdCAqIFN0b3JlIGEgdmFsdWVcclxuXHQgKlxyXG5cdCAqIFRoZSB2YWx1ZSBpcyBzdG9yZWQgYnkgaXRzIGlkIHByb3BlcnR5XHJcblx0ICovXHJcblx0c2V0KHZhbHVlKSB7XHJcblx0XHQvLyBzdG9yZSB0aGUgdmFsdWVcclxuXHRcdHRoaXMuX2RhdGFbdmFsdWUuaWRdID0gdmFsdWU7XHJcblxyXG5cdFx0cmV0dXJuIFByb21pc2UucmVzb2x2ZSgpO1xyXG5cdH1cclxuXHJcblx0LyoqXHJcblx0ICogUmVtb3ZlIGEgdmFsdWUgZnJvbSB0aGUgYWRhcHRvclxyXG5cdCAqL1xyXG5cdHJlbW92ZShrZXkpIHtcclxuXHRcdGRlbGV0ZSB0aGlzLl9kYXRhW2tleV07XHJcblxyXG5cdFx0cmV0dXJuIFByb21pc2UucmVzb2x2ZSgpO1xyXG5cdH1cclxufVxyXG5cclxubW9kdWxlLmV4cG9ydHMgPSBNZW1BZGFwdG9yO1xyXG4iLCIvKipcclxuICogQSBkYXRhIHN0b3JlIHdoaWNoIGNvbnRhaW5zIGEgcG9vbCBvZiBvYmplY3RzIHdoaWNoIGFyZSBxdWVyeWFibGUgYnkgYW55IHByb3BlcnR5XHJcbiAqL1xyXG5cclxudmFyIEV2ZW50RW1pdHRlciA9IHJlcXVpcmUoXCIuLi91dGlsL2V2ZW50LWVtaXR0ZXJcIik7XHJcblxyXG5jbGFzcyBQb29sU3RvcmUgZXh0ZW5kcyBFdmVudEVtaXR0ZXIge1xyXG5cdGNvbnN0cnVjdG9yKGFkYXB0b3IsIGluaXRGbikge1xyXG5cdFx0c3VwZXIoKTtcclxuXHRcdHRoaXMuX2FkYXB0b3IgPSBhZGFwdG9yO1xyXG5cdFx0dGhpcy5faW5pdEZuID0gaW5pdEZuO1xyXG5cdH1cclxuXHJcblx0LyoqXHJcblx0ICogR2V0IGFsbCBpdGVtcyBtYXRjaW5nIHRoZSBwcm92aWRlZCBwcm9wZXJ0aWVzXHJcblx0ICovXHJcblx0cXVlcnkocHJvcHMsIGZuKSB7XHJcblx0XHQvLyBjaGVjayBpZiBhIHZhbHVlIG1hdGNoZXMgdGhlIHF1ZXJ5XHJcblx0XHR2YXIgZmlsdGVyID0gdmFsdWUgPT4ge1xyXG5cdFx0XHQvLyBjaGVjayB0aGF0IGFsbCB0aGUgcHJvcGVydGllcyBtYXRjaFxyXG5cdFx0XHRyZXR1cm4gT2JqZWN0LmdldE93blByb3BlcnR5TmFtZXMocHJvcHMpXHJcblxyXG5cdFx0XHQuZXZlcnkocHJvcE5hbWUgPT4ge1xyXG5cdFx0XHRcdC8vIGEgZnVuY3Rpb24gdG8gY2hlY2sgaWYgYSB2YWx1ZSBtYXRjaGVzXHJcblx0XHRcdFx0aWYodHlwZW9mIHByb3BzW3Byb3BOYW1lXSA9PSBcImZ1bmN0aW9uXCIpIHtcclxuXHRcdFx0XHRcdHJldHVybiBwcm9wc1twcm9wTmFtZV0odmFsdWVbcHJvcE5hbWVdKTtcclxuXHRcdFx0XHR9XHJcblx0XHRcdFx0Ly8gcGxhaW4gZXF1YWxpdHlcclxuXHRcdFx0XHRlbHNlIHtcclxuXHRcdFx0XHRcdHJldHVybiBwcm9wc1twcm9wTmFtZV0gPT0gdmFsdWVbcHJvcE5hbWVdXHJcblx0XHRcdFx0fVxyXG5cdFx0XHR9KTtcclxuXHRcdH07XHJcblxyXG5cdFx0Ly8gZ2V0IGFsbCBjdXJyZW50IGl0ZW1zIHRoYXQgbWF0Y2ggdGhlIGZpbHRlclxyXG5cdFx0dmFyIGN1cnJlbnQgPSAoXCJpZFwiIGluIHByb3BzKSA/XHJcblx0XHRcdHRoaXMuX2FkYXB0b3IuZ2V0KHByb3BzLmlkKS50aGVuKHZhbHVlID0+IFt2YWx1ZV0pOlxyXG5cdFx0XHR0aGlzLl9hZGFwdG9yLmdldEFsbCgpO1xyXG5cclxuXHRcdGN1cnJlbnQgPSBjdXJyZW50LnRoZW4odmFsdWVzID0+IHtcclxuXHRcdFx0Ly8gZmlsdGVyIG91dCB0aGUgdmFsdWVzXHJcblx0XHRcdHZhbHVlcyA9IHZhbHVlcy5maWx0ZXIoZmlsdGVyKTtcclxuXHJcblx0XHRcdC8vIGRvIGFueSBpbml0aWFsaXphdGlvblxyXG5cdFx0XHRpZih0aGlzLl9pbml0Rm4pIHtcclxuXHRcdFx0XHR2YWx1ZXMgPSB2YWx1ZXMubWFwKHZhbHVlID0+IHRoaXMuX2luaXRGbih2YWx1ZSkgfHwgdmFsdWUpO1xyXG5cdFx0XHR9XHJcblxyXG5cdFx0XHRyZXR1cm4gdmFsdWVzO1xyXG5cdFx0fSk7XHJcblxyXG5cdFx0Ly8gb3B0aW9uYWx5IHJ1biBjaGFuZ2VzIHRocm91Z2ggdGhlIHF1ZXJ5IGFzIHdlbGxcclxuXHRcdGlmKHR5cGVvZiBmbiA9PSBcImZ1bmN0aW9uXCIpIHtcclxuXHRcdFx0bGV0IHN1YnNjcmlwdGlvbiwgc3RvcHBlZDtcclxuXHJcblx0XHRcdC8vIHdyYXAgdGhlIHZhbHVlcyBpbiBjaGFuZ2Ugb2JqZWN0cyBhbmQgc2VuZCB0aGUgdG8gdGhlIGNvbnN1bWVyXHJcblx0XHRcdGN1cnJlbnQudGhlbih2YWx1ZXMgPT4ge1xyXG5cdFx0XHRcdC8vIGRvbid0IGxpc3RlbiBpZiB1bnN1YnNjcmliZSB3YXMgYWxyZWFkeSBjYWxsZWRcclxuXHRcdFx0XHRpZihzdG9wcGVkKSByZXR1cm47XHJcblxyXG5cdFx0XHRcdC8vIHNlbmQgdGhlIHZhbHVlcyB3ZSBjdXJyZW50bHkgaGF2ZVxyXG5cdFx0XHRcdGZuKHZhbHVlcy5zbGljZSgwKSk7XHJcblxyXG5cdFx0XHRcdC8vIHdhdGNoIGZvciBjaGFuZ2VzIGFmdGVyIHRoZSBpbml0aWFsIHZhbHVlcyBhcmUgc2VuZFxyXG5cdFx0XHRcdHN1YnNjcmlwdGlvbiA9IHRoaXMub24oXCJjaGFuZ2VcIiwgY2hhbmdlID0+IHtcclxuXHRcdFx0XHRcdC8vIGZpbmQgdGhlIHByZXZpb3VzIHZhbHVlXHJcblx0XHRcdFx0XHR2YXIgaW5kZXggPSB2YWx1ZXMuZmluZEluZGV4KHZhbHVlID0+IHZhbHVlLmlkID09IGNoYW5nZS5pZCk7XHJcblxyXG5cdFx0XHRcdFx0aWYoY2hhbmdlLnR5cGUgPT0gXCJjaGFuZ2VcIikge1xyXG5cdFx0XHRcdFx0XHQvLyBjaGVjayBpZiB0aGUgdmFsdWUgbWF0Y2hlcyB0aGUgcXVlcnlcclxuXHRcdFx0XHRcdFx0bGV0IG1hdGNoZXMgPSBmaWx0ZXIoY2hhbmdlLnZhbHVlKTtcclxuXHJcblx0XHRcdFx0XHRcdGlmKG1hdGNoZXMpIHtcclxuXHRcdFx0XHRcdFx0XHQvLyBmcmVzaGx5IGNyZWF0ZWRcclxuXHRcdFx0XHRcdFx0XHRpZihpbmRleCA9PT0gLTEpIHtcclxuXHRcdFx0XHRcdFx0XHRcdGxldCB7dmFsdWV9ID0gY2hhbmdlO1xyXG5cclxuXHRcdFx0XHRcdFx0XHRcdC8vIGRvIGFueSBpbml0aWFsaXphdGlvblxyXG5cdFx0XHRcdFx0XHRcdFx0aWYodGhpcy5faW5pdEZuKSB7XHJcblx0XHRcdFx0XHRcdFx0XHRcdHZhbHVlID0gdGhpcy5faW5pdEZuKHZhbHVlKSB8fCB2YWx1ZTtcclxuXHRcdFx0XHRcdFx0XHRcdH1cclxuXHJcblx0XHRcdFx0XHRcdFx0XHR2YWx1ZXMucHVzaCh2YWx1ZSk7XHJcblx0XHRcdFx0XHRcdFx0fVxyXG5cdFx0XHRcdFx0XHRcdC8vIHVwZGF0ZSBhbiBleGlzdGluZyB2YWx1ZVxyXG5cdFx0XHRcdFx0XHRcdGVsc2Uge1xyXG5cdFx0XHRcdFx0XHRcdFx0dmFsdWVzW2luZGV4XSA9IGNoYW5nZS52YWx1ZTtcclxuXHRcdFx0XHRcdFx0XHR9XHJcblxyXG5cdFx0XHRcdFx0XHRcdGZuKHZhbHVlcy5zbGljZSgwKSk7XHJcblx0XHRcdFx0XHRcdH1cclxuXHRcdFx0XHRcdFx0Ly8gdGVsbCB0aGUgY29uc3VtZXIgdGhpcyB2YWx1ZSBubyBsb25nZXIgbWF0Y2hlc1xyXG5cdFx0XHRcdFx0XHRlbHNlIGlmKGluZGV4ICE9PSAtMSkge1xyXG5cdFx0XHRcdFx0XHRcdC8vIHJlbW92ZSB0aGUgaXRlbVxyXG5cdFx0XHRcdFx0XHRcdGlmKGluZGV4ICE9PSAtMSkge1xyXG5cdFx0XHRcdFx0XHRcdFx0dmFsdWVzLnNwbGljZShpbmRleCwgMSk7XHJcblx0XHRcdFx0XHRcdFx0fVxyXG5cclxuXHRcdFx0XHRcdFx0XHRmbih2YWx1ZXMuc2xpY2UoMCkpO1xyXG5cdFx0XHRcdFx0XHR9XHJcblx0XHRcdFx0XHR9XHJcblx0XHRcdFx0XHRlbHNlIGlmKGNoYW5nZS50eXBlID09IFwicmVtb3ZlXCIgJiYgaW5kZXggIT09IC0xKSB7XHJcblx0XHRcdFx0XHRcdC8vIHJlbW92ZSB0aGUgaXRlbVxyXG5cdFx0XHRcdFx0XHRpZihpbmRleCAhPT0gLTEpIHtcclxuXHRcdFx0XHRcdFx0XHR2YWx1ZXMuc3BsaWNlKGluZGV4LCAxKTtcclxuXHRcdFx0XHRcdFx0fVxyXG5cclxuXHRcdFx0XHRcdFx0Zm4odmFsdWVzLnNsaWNlKDApKTtcclxuXHRcdFx0XHRcdH1cclxuXHRcdFx0XHR9KTtcclxuXHRcdFx0fSk7XHJcblxyXG5cdFx0XHRyZXR1cm4ge1xyXG5cdFx0XHRcdHVuc3Vic2NyaWJlKCkge1xyXG5cdFx0XHRcdFx0Ly8gaWYgd2UgYXJlIGxpc3RlbmluZyBzdG9wXHJcblx0XHRcdFx0XHRpZihzdWJzY3JpcHRpb24pIHtcclxuXHRcdFx0XHRcdFx0c3Vic2NyaXB0aW9uLnVuc3Vic2NyaWJlKClcclxuXHRcdFx0XHRcdH1cclxuXHJcblx0XHRcdFx0XHQvLyBkb24ndCBsaXN0ZW5cclxuXHRcdFx0XHRcdHN0b3BwZWQgPSB0cnVlO1xyXG5cdFx0XHRcdH1cclxuXHRcdFx0fVxyXG5cdFx0fVxyXG5cdFx0ZWxzZSB7XHJcblx0XHRcdHJldHVybiBjdXJyZW50O1xyXG5cdFx0fVxyXG5cdH1cclxuXHJcblx0LyoqXHJcblx0ICogU3RvcmUgYSB2YWx1ZSBpbiB0aGUgcG9vbFxyXG5cdCAqL1xyXG5cdHNldCh2YWx1ZSkge1xyXG5cdFx0Ly8gc2V0IHRoZSBtb2RpZmllZCBkYXRlXHJcblx0XHR2YWx1ZS5tb2RpZmllZCA9IERhdGUubm93KCk7XHJcblxyXG5cdFx0Ly8gc3RvcmUgdGhlIHZhbHVlIGluIHRoZSBhZGFwdG9yXHJcblx0XHR0aGlzLl9hZGFwdG9yLnNldCh2YWx1ZSk7XHJcblxyXG5cdFx0Ly8gcHJvcG9nYXRlIHRoZSBjaGFuZ2VcclxuXHRcdHRoaXMuZW1pdChcImNoYW5nZVwiLCB7XHJcblx0XHRcdHR5cGU6IFwiY2hhbmdlXCIsXHJcblx0XHRcdGlkOiB2YWx1ZS5pZCxcclxuXHRcdFx0dmFsdWVcclxuXHRcdH0pO1xyXG5cdH1cclxuXHJcblx0LyoqXHJcblx0ICogUmVtb3ZlIGEgdmFsdWUgZnJvbSB0aGUgcG9vbFxyXG5cdCAqL1xyXG5cdHJlbW92ZShpZCkge1xyXG5cdFx0Ly8gcmVtb3ZlIHRoZSB2YWx1ZSBmcm9tIHRoZSBhZGFwdG9yXHJcblx0XHR0aGlzLl9hZGFwdG9yLnJlbW92ZShpZCwgRGF0ZS5ub3coKSk7XHJcblxyXG5cdFx0Ly8gcHJvcG9nYXRlIHRoZSBjaGFuZ2VcclxuXHRcdHRoaXMuZW1pdChcImNoYW5nZVwiLCB7XHJcblx0XHRcdHR5cGU6IFwicmVtb3ZlXCIsXHJcblx0XHRcdGlkXHJcblx0XHR9KTtcclxuXHR9XHJcbn1cclxuXHJcbm1vZHVsZS5leHBvcnRzID0gUG9vbFN0b3JlO1xyXG4iLCIvKipcclxuICogS2VlcCBhIGxpc3Qgb2Ygc3Vic2NyaXB0aW9ucyB0byB1bnN1YnNjcmliZSBmcm9tIHRvZ2V0aGVyXHJcbiAqL1xyXG5cclxuY2xhc3MgRGlzcG9zYWJsZSB7XHJcblx0Y29uc3RydWN0b3IoKSB7XHJcblx0XHR0aGlzLl9zdWJzY3JpcHRpb25zID0gW107XHJcblx0fVxyXG5cclxuXHQvLyBVbnN1YnNjcmliZSBmcm9tIGFsbCBzdWJzY3JpcHRpb25zXHJcblx0ZGlzcG9zZSgpIHtcclxuXHRcdC8vIHJlbW92ZSB0aGUgZmlyc3Qgc3Vic2NyaXB0aW9uIHVudGlsIHRoZXJlIGFyZSBub25lIGxlZnRcclxuXHRcdHdoaWxlKHRoaXMuX3N1YnNjcmlwdGlvbnMubGVuZ3RoID4gMCkge1xyXG5cdFx0XHR0aGlzLl9zdWJzY3JpcHRpb25zLnNoaWZ0KCkudW5zdWJzY3JpYmUoKTtcclxuXHRcdH1cclxuXHR9XHJcblxyXG5cdC8vIEFkZCBhIHN1YnNjcmlwdGlvbiB0byB0aGUgZGlzcG9zYWJsZVxyXG5cdGFkZChzdWJzY3JpcHRpb24pIHtcclxuXHRcdHRoaXMuX3N1YnNjcmlwdGlvbnMucHVzaChzdWJzY3JpcHRpb24pO1xyXG5cdH1cclxuXHJcblx0Ly8gZGlzcG9zZSB3aGVuIGFuIGV2ZW50IGlzIGZpcmVkXHJcblx0ZGlzcG9zZU9uKGVtaXR0ZXIsIGV2ZW50KSB7XHJcblx0XHR0aGlzLmFkZChlbWl0dGVyLm9uKGV2ZW50LCAoKSA9PiB0aGlzLmRpc3Bvc2UoKSkpO1xyXG5cdH1cclxufTtcclxuXHJcbm1vZHVsZS5leHBvcnRzID0gRGlzcG9zYWJsZTtcclxuIiwiLyoqXHJcbiAqIEEgYmFzaWMgZXZlbnQgZW1pdHRlclxyXG4gKi9cclxuXHJcbmNsYXNzIEV2ZW50RW1pdHRlciB7XHJcblx0Y29uc3RydWN0b3IoKSB7XHJcblx0XHR0aGlzLl9saXN0ZW5lcnMgPSB7fTtcclxuXHR9XHJcblxyXG5cdC8qKlxyXG5cdCAqIEFkZCBhbiBldmVudCBsaXN0ZW5lclxyXG5cdCAqL1xyXG5cdG9uKG5hbWUsIGxpc3RlbmVyKSB7XHJcblx0XHQvLyBpZiB3ZSBkb24ndCBoYXZlIGFuIGV4aXN0aW5nIGxpc3RlbmVycyBhcnJheSBjcmVhdGUgb25lXHJcblx0XHRpZighdGhpcy5fbGlzdGVuZXJzW25hbWVdKSB7XHJcblx0XHRcdHRoaXMuX2xpc3RlbmVyc1tuYW1lXSA9IFtdO1xyXG5cdFx0fVxyXG5cclxuXHRcdC8vIGFkZCB0aGUgbGlzdGVuZXJcclxuXHRcdHRoaXMuX2xpc3RlbmVyc1tuYW1lXS5wdXNoKGxpc3RlbmVyKTtcclxuXHJcblx0XHQvLyBnaXZlIHRoZW0gYSBzdWJzY3JpcHRpb25cclxuXHRcdHJldHVybiB7XHJcblx0XHRcdF9saXN0ZW5lcjogbGlzdGVuZXIsXHJcblxyXG5cdFx0XHR1bnN1YnNjcmliZTogKCkgPT4ge1xyXG5cdFx0XHRcdC8vIGZpbmQgdGhlIGxpc3RlbmVyXHJcblx0XHRcdFx0dmFyIGluZGV4ID0gdGhpcy5fbGlzdGVuZXJzW25hbWVdLmluZGV4T2YobGlzdGVuZXIpO1xyXG5cclxuXHRcdFx0XHRpZihpbmRleCAhPT0gLTEpIHtcclxuXHRcdFx0XHRcdHRoaXMuX2xpc3RlbmVyc1tuYW1lXS5zcGxpY2UoaW5kZXgsIDEpO1xyXG5cdFx0XHRcdH1cclxuXHRcdFx0fVxyXG5cdFx0fTtcclxuXHR9XHJcblxyXG5cdC8qKlxyXG5cdCAqIEVtaXQgYW4gZXZlbnRcclxuXHQgKi9cclxuXHRlbWl0KG5hbWUsIC4uLmFyZ3MpIHtcclxuXHRcdC8vIGNoZWNrIGZvciBsaXN0ZW5lcnNcclxuXHRcdGlmKHRoaXMuX2xpc3RlbmVyc1tuYW1lXSkge1xyXG5cdFx0XHRmb3IobGV0IGxpc3RlbmVyIG9mIHRoaXMuX2xpc3RlbmVyc1tuYW1lXSkge1xyXG5cdFx0XHRcdC8vIGNhbGwgdGhlIGxpc3RlbmVyc1xyXG5cdFx0XHRcdGxpc3RlbmVyKC4uLmFyZ3MpO1xyXG5cdFx0XHR9XHJcblx0XHR9XHJcblx0fVxyXG5cclxuXHQvKipcclxuXHQgKiBFbWl0IGFuIGV2ZW50IGFuZCBza2lwIHNvbWUgbGlzdGVuZXJzXHJcblx0ICovXHJcblx0cGFydGlhbEVtaXQobmFtZSwgc2tpcHMgPSBbXSwgLi4uYXJncykge1xyXG5cdFx0Ly8gYWxsb3cgYSBzaW5nbGUgaXRlbVxyXG5cdFx0aWYoIUFycmF5LmlzQXJyYXkoc2tpcHMpKSB7XHJcblx0XHRcdHNraXBzID0gW3NraXBzXTtcclxuXHRcdH1cclxuXHJcblx0XHQvLyBjaGVjayBmb3IgbGlzdGVuZXJzXHJcblx0XHRpZih0aGlzLl9saXN0ZW5lcnNbbmFtZV0pIHtcclxuXHRcdFx0Zm9yKGxldCBsaXN0ZW5lciBvZiB0aGlzLl9saXN0ZW5lcnNbbmFtZV0pIHtcclxuXHRcdFx0XHQvLyB0aGlzIGV2ZW50IGxpc3RlbmVyIGlzIGJlaW5nIHNraXBlZFxyXG5cdFx0XHRcdGlmKHNraXBzLmZpbmQoc2tpcCA9PiBza2lwLl9saXN0ZW5lciA9PSBsaXN0ZW5lcikpIHtcclxuXHRcdFx0XHRcdGNvbnRpbnVlO1xyXG5cdFx0XHRcdH1cclxuXHJcblx0XHRcdFx0Ly8gY2FsbCB0aGUgbGlzdGVuZXJzXHJcblx0XHRcdFx0bGlzdGVuZXIoLi4uYXJncyk7XHJcblx0XHRcdH1cclxuXHRcdH1cclxuXHR9XHJcbn1cclxuXHJcbm1vZHVsZS5leHBvcnRzID0gRXZlbnRFbWl0dGVyO1xyXG4iLCIvKipcclxuICogQWxsIGNsaWVudCBzaWRlIGFuZCBjb21tb24gdGVzdHMgdG8gYnVuZGxlIHRvZ2V0aGVyXHJcbiAqL1xyXG5cclxuLy8gaHR0cC1hZGFwdG9yLmpzIGlzIHRlY2huaWNhbHkgaW4gY29tbW9uIGJ1dCB0aGUgdGVzdFxyXG4vLyBvbmx5IHdvcmtzIG9uIG5vZGUganNcclxucmVxdWlyZShcIi4vY29tbW9uL2RhdGEtc3RvcmVzL2tleS12YWx1ZS1zdG9yZVwiKTtcclxucmVxdWlyZShcIi4vY29tbW9uL2RhdGEtc3RvcmVzL21lbS1hZGFwdG9yXCIpO1xyXG5yZXF1aXJlKFwiLi9jb21tb24vZGF0YS1zdG9yZXMvcG9vbC1zdG9yZVwiKTtcclxucmVxdWlyZShcIi4vY29tbW9uL3V0aWwvZGlzcG9zYWJsZVwiKTtcclxucmVxdWlyZShcIi4vY29tbW9uL2JhY2t1cFwiKTtcclxuIiwidmFyIGFzc2VydCA9IHJlcXVpcmUoXCJhc3NlcnRcIik7XHJcbnZhciBiYWNrdXAgPSByZXF1aXJlKFwiLi4vLi4vc3JjL2NvbW1vbi9iYWNrdXBcIik7XHJcblxyXG5kZXNjcmliZShcIkJhY2t1cFwiLCBmdW5jdGlvbigpIHtcclxuXHRpdChcImNhbiBnZW5lcmF0ZSBiYWNrdXAgbmFtZXMgZnJvbSB0aGUgZGF0ZVwiLCBmdW5jdGlvbigpIHtcclxuXHRcdGFzc2VydC5lcXVhbChcclxuXHRcdFx0YmFja3VwLmdlbkJhY2t1cE5hbWUobmV3IERhdGUoXCIyMDE3LTAxLTAxVDExOjAwOjAwLjAwMFpcIikpLFxyXG5cdFx0XHRcImJhY2t1cC0yMDE3LTEtMS01LTAuemlwXCJcclxuXHRcdCk7XHJcblx0fSk7XHJcbn0pO1xyXG4iLCJ2YXIgYXNzZXJ0ID0gcmVxdWlyZShcImFzc2VydFwiKTtcclxudmFyIE1lbUFkYXB0b3IgPSByZXF1aXJlKFwiLi4vLi4vLi4vc3JjL2NvbW1vbi9kYXRhLXN0b3Jlcy9tZW0tYWRhcHRvclwiKTtcclxudmFyIEtleVZhbHVlU3RvcmUgPSByZXF1aXJlKFwiLi4vLi4vLi4vc3JjL2NvbW1vbi9kYXRhLXN0b3Jlcy9rZXktdmFsdWUtc3RvcmVcIik7XHJcblxyXG5kZXNjcmliZShcIktleSB2YWx1ZSBzdG9yZVwiLCBmdW5jdGlvbigpIHtcclxuXHRpdChcImNhbiBnZXQgYSB2YWx1ZVwiLCBmdW5jdGlvbigpIHtcclxuXHRcdC8vIGNyZWF0ZSBhbiBhZGFwdG9yXHJcblx0XHR2YXIgYWRhcHRvciA9IG5ldyBNZW1BZGFwdG9yKCk7XHJcblxyXG5cdFx0Ly8gcHV0IGEgdmFsdWUgaW4gaXRcclxuXHRcdGFkYXB0b3Iuc2V0KHsgaWQ6IFwiRm9vXCIsIHZhbHVlOiBcIkJhclwiIH0pO1xyXG5cclxuXHRcdC8vIGNyZWF0ZSBhIHN0b3JlIHVzaW5nIHRoZSBhZGFwdG9yXHJcblx0XHR2YXIgc3RvcmUgPSBuZXcgS2V5VmFsdWVTdG9yZShhZGFwdG9yKTtcclxuXHJcblx0XHQvLyBnZXQgdGhlIHZhbHVlXHJcblx0XHRyZXR1cm4gc3RvcmUuZ2V0KFwiRm9vXCIpXHJcblxyXG5cdFx0LnRoZW4odmFsdWUgPT4ge1xyXG5cdFx0XHQvLyBjaGVjayB0aGUgdmFsdWVcclxuXHRcdFx0YXNzZXJ0LmVxdWFsKHZhbHVlLCBcIkJhclwiKTtcclxuXHRcdH0pO1xyXG5cdH0pO1xyXG5cclxuXHRpdChcImdpdmVzIHRoZSBkZWZhdWx0IHZhbHVlIGlmIG5vIHZhbHVlIGlzIGRlZmluZWRcIiwgZnVuY3Rpb24oKSB7XHJcblx0XHQvLyBjcmVhdGUgdGhlIGVtcHR5IHN0b3JlIGFuZCBhZGFwdG9yO1xyXG5cdFx0dmFyIHN0b3JlID0gbmV3IEtleVZhbHVlU3RvcmUobmV3IE1lbUFkYXB0b3IoKSk7XHJcblxyXG5cdFx0Ly8gZ2V0IHRoZSBkZWZhdWx0IHZhbHVlXHJcblx0XHRyZXR1cm4gc3RvcmUuZ2V0KFwiRm9vXCIsIFwiQmFyXCIpXHJcblxyXG5cdFx0LnRoZW4odmFsdWUgPT4ge1xyXG5cdFx0XHRhc3NlcnQuZXF1YWwodmFsdWUsIFwiQmFyXCIpO1xyXG5cdFx0fSk7XHJcblx0fSk7XHJcblxyXG5cdGl0KFwiY2FuIG92ZXJyaWRlIHZhbHVlc1wiLCBmdW5jdGlvbigpIHtcclxuXHRcdC8vIGNyZWF0ZSBhbiBhZGFwdG9yXHJcblx0XHR2YXIgYWRhcHRvciA9IG5ldyBNZW1BZGFwdG9yKCk7XHJcblxyXG5cdFx0Ly8gcHV0IGEgdmFsdWUgaW4gaXRcclxuXHRcdGFkYXB0b3Iuc2V0KHsgaWQ6IFwiRm9vXCIsIHZhbHVlOiBcIkJhclwiIH0pO1xyXG5cclxuXHRcdC8vIGNyZWF0ZSBhIHN0b3JlIHVzaW5nIHRoZSBhZGFwdG9yXHJcblx0XHR2YXIgc3RvcmUgPSBuZXcgS2V5VmFsdWVTdG9yZShhZGFwdG9yKTtcclxuXHJcblx0XHQvLyBwdXQgaW4gb3ZlcnJpZGVzIGZvciBGb29cclxuXHRcdHN0b3JlLnNldE92ZXJyaWRlcyh7XHJcblx0XHRcdEZvbyA6IFwiQmF6XCJcclxuXHRcdH0pO1xyXG5cclxuXHRcdC8vIGdldCB0aGUgdmFsdWVcclxuXHRcdHJldHVybiBzdG9yZS5nZXQoXCJGb29cIilcclxuXHJcblx0XHQudGhlbih2YWx1ZSA9PiB7XHJcblx0XHRcdC8vIGNoZWNrIHRoZSB2YWx1ZVxyXG5cdFx0XHRhc3NlcnQuZXF1YWwodmFsdWUsIFwiQmF6XCIpO1xyXG5cdFx0fSk7XHJcblx0fSk7XHJcblxyXG5cdGl0KFwiY2FuIHN0b3JlIHZhbHVlc1wiLCBmdW5jdGlvbigpIHtcclxuXHRcdC8vIGNyZWF0ZSB0aGUgZW1wdHkgc3RvcmUgYW5kIGFkYXB0b3JcclxuXHRcdHZhciBhZGFwdG9yID0gbmV3IE1lbUFkYXB0b3IoKTtcclxuXHRcdHZhciBzdG9yZSA9IG5ldyBLZXlWYWx1ZVN0b3JlKGFkYXB0b3IpO1xyXG5cclxuXHRcdC8vIHN0b3JlIHRoZSB2YWx1ZVxyXG5cdFx0c3RvcmUuc2V0KFwiRm9vXCIsIFwiQmFyXCIpO1xyXG5cclxuXHRcdC8vIGNoZWNrIHRoZSB2YWx1ZVxyXG5cdFx0cmV0dXJuIGFkYXB0b3IuZ2V0KFwiRm9vXCIpXHJcblxyXG5cdFx0LnRoZW4odmFsdWUgPT4ge1xyXG5cdFx0XHQvLyByZW1vdmUgdGhlIG1vZGlmaWVkIGRhdGVcclxuXHRcdFx0ZGVsZXRlIHZhbHVlLm1vZGlmaWVkO1xyXG5cclxuXHRcdFx0YXNzZXJ0LmRlZXBFcXVhbCh2YWx1ZSwge1xyXG5cdFx0XHRcdGlkOiBcIkZvb1wiLFxyXG5cdFx0XHRcdHZhbHVlOiBcIkJhclwiXHJcblx0XHRcdH0pO1xyXG5cdFx0fSk7XHJcblx0fSk7XHJcblxyXG5cdGl0KFwiY2FuIHN0b3JlIHZhbHVlcyAob2JqZWN0IGZvcm0pXCIsIGZ1bmN0aW9uKCkge1xyXG5cdFx0Ly8gY3JlYXRlIHRoZSBlbXB0eSBzdG9yZSBhbmQgYWRhcHRvclxyXG5cdFx0dmFyIGFkYXB0b3IgPSBuZXcgTWVtQWRhcHRvcigpO1xyXG5cdFx0dmFyIHN0b3JlID0gbmV3IEtleVZhbHVlU3RvcmUoYWRhcHRvcik7XHJcblxyXG5cdFx0Ly8gc3RvcmUgdGhlIHZhbHVlXHJcblx0XHRzdG9yZS5zZXQoeyBGb286IFwiQmFyXCIgfSk7XHJcblxyXG5cdFx0Ly8gY2hlY2sgdGhlIHZhbHVlXHJcblx0XHRyZXR1cm4gYWRhcHRvci5nZXQoXCJGb29cIilcclxuXHJcblx0XHQudGhlbih2YWx1ZSA9PiB7XHJcblx0XHRcdC8vIHJlbW92ZSB0aGUgbW9kaWZpZWQgZGF0ZVxyXG5cdFx0XHRkZWxldGUgdmFsdWUubW9kaWZpZWQ7XHJcblxyXG5cdFx0XHRhc3NlcnQuZGVlcEVxdWFsKHZhbHVlLCB7XHJcblx0XHRcdFx0aWQ6IFwiRm9vXCIsXHJcblx0XHRcdFx0dmFsdWU6IFwiQmFyXCJcclxuXHRcdFx0fSk7XHJcblx0XHR9KTtcclxuXHR9KTtcclxuXHJcblx0aXQoXCJjYW4gd2F0Y2ggY2hhbmdlcyBpbiB0aGUgc3RvcmVcIiwgZnVuY3Rpb24oKSB7XHJcblx0XHQvLyBjcmVhdGUgdGhlIHN0b3JlIGFuZCBhZGFwdG9yXHJcblx0XHR2YXIgc3RvcmUgPSBuZXcgS2V5VmFsdWVTdG9yZShuZXcgTWVtQWRhcHRvcigpKTtcclxuXHJcblx0XHQvLyBjb2xsZWN0IGFsbCB2YXVsZXMgdGhhdCBjb21lIHRocm91Z2ggdGhlIHdhdGNoZXJcclxuXHRcdHZhciBjaGFuZ2VzID0gW107XHJcblxyXG5cdFx0Ly8gd2F0Y2ggZm9yIGNoYW5nZXMgdG8gdGhlIFwicmVhbFwiIGtleVxyXG5cdFx0dmFyIHN1YnNjcmlwdGlvbiA9IHN0b3JlLndhdGNoKFwicmVhbFwiLCBjaGFuZ2UgPT4gY2hhbmdlcy5wdXNoKGNoYW5nZSkpO1xyXG5cclxuXHRcdC8vIHRyaWdnZXIgc29tZSBjaGFuZ2VzXHJcblx0XHRzdG9yZS5zZXQoXCJyZWFsXCIsIFwiT2tcIik7XHJcblx0XHRzdG9yZS5zZXQoXCJyZWFsXCIsIFwiT2tcIik7XHJcblxyXG5cdFx0Ly8gY2hhbmdlIGFub3RoZXIgcHJvcGVydHkgKHNob3VsZCBub3QgdHJpZ2dlciBhIGNoYW5nZSlcclxuXHRcdHN0b3JlLnNldChcIm90aGVyXCIsIFwiT3RoZXIgcHJvcGVydHlcIik7XHJcblxyXG5cdFx0Ly8gc3RvcCBsaXN0ZW5pbmdcclxuXHRcdHN1YnNjcmlwdGlvbi51bnN1YnNjcmliZSgpO1xyXG5cclxuXHRcdC8vIGNoYW5nZSB0aGUgcmVhbCB2YWx1ZSB0aGlzIHNob3VsZCBub3QgY2F1c2UgYW55IGNoYW5nZXNcclxuXHRcdHN0b3JlLnNldChcInJlYWxcIiwgXCJVbnN1YnNjcmliZWRcIik7XHJcblxyXG5cdFx0YXNzZXJ0LmRlZXBFcXVhbChjaGFuZ2VzLCBbXCJPa1wiLCBcIk9rXCJdKTtcclxuXHR9KTtcclxufSk7XHJcbiIsInZhciBhc3NlcnQgPSByZXF1aXJlKFwiYXNzZXJ0XCIpO1xyXG52YXIgTWVtQWRhcHRvciA9IHJlcXVpcmUoXCIuLi8uLi8uLi9zcmMvY29tbW9uL2RhdGEtc3RvcmVzL21lbS1hZGFwdG9yXCIpO1xyXG5cclxuZGVzY3JpYmUoXCJJbiBtZW1vcnkgYWRhcHRvclwiLCBmdW5jdGlvbigpIHtcclxuXHRpdChcIlJldHVybnMgdW5kZWZpbmVkIGlmIHRoZXJlIGlzIG5vIHZhbHVlXCIsIGZ1bmN0aW9uKCkge1xyXG5cdFx0dmFyIG1lbUFkYXB0b3IgPSBuZXcgTWVtQWRhcHRvcigpO1xyXG5cclxuXHRcdC8vIHJldHJldmUgdGhlIHZhbHVlXHJcblx0XHRyZXR1cm4gbWVtQWRhcHRvci5nZXQoXCJub3QtZGVmaW5lZFwiKVxyXG5cclxuXHRcdC50aGVuKHJlc3VsdCA9PiB7XHJcblx0XHRcdGFzc2VydC5lcXVhbChyZXN1bHQsIHVuZGVmaW5lZCk7XHJcblx0XHR9KTtcclxuXHR9KTtcclxuXHJcblx0aXQoXCJWYWx1ZXMgY2FuIGJlIHN0b3JlZCBhbmQgcmV0cmV2ZWRcIiwgZnVuY3Rpb24oKSB7XHJcblx0XHR2YXIgbWVtQWRhcHRvciA9IG5ldyBNZW1BZGFwdG9yKCk7XHJcblxyXG5cdFx0Ly8gc3RvcmUgdGhlIHZhbHVlXHJcblx0XHR2YXIgcHJvbWlzZSA9IG1lbUFkYXB0b3Iuc2V0KHtcclxuXHRcdFx0aWQ6IFwiZm9vXCIsXHJcblx0XHRcdHZhbHVlOiBcIllheSFcIlxyXG5cdFx0fSk7XHJcblxyXG5cdFx0Ly8gbWFrZSBzdXJlIHNldCBpcyByZXR1cmluZyBhIHByb21pc2VcclxuXHRcdGFzc2VydChwcm9taXNlIGluc3RhbmNlb2YgUHJvbWlzZSk7XHJcblxyXG5cdFx0Ly8gcmV0cmV2ZSB0aGUgdmFsdWVcclxuXHRcdHJldHVybiBtZW1BZGFwdG9yLmdldChcImZvb1wiKVxyXG5cclxuXHRcdC50aGVuKHJlc3VsdCA9PiB7XHJcblx0XHRcdGFzc2VydC5kZWVwRXF1YWwocmVzdWx0LCB7XHJcblx0XHRcdFx0aWQ6IFwiZm9vXCIsXHJcblx0XHRcdFx0dmFsdWU6IFwiWWF5IVwiXHJcblx0XHRcdH0pO1xyXG5cdFx0fSk7XHJcblx0fSk7XHJcbn0pO1xyXG4iLCJ2YXIgYXNzZXJ0ID0gcmVxdWlyZShcImFzc2VydFwiKTtcclxudmFyIE1lbUFkYXB0b3IgPSByZXF1aXJlKFwiLi4vLi4vLi4vc3JjL2NvbW1vbi9kYXRhLXN0b3Jlcy9tZW0tYWRhcHRvclwiKTtcclxudmFyIFBvb2xTdG9yZSA9IHJlcXVpcmUoXCIuLi8uLi8uLi9zcmMvY29tbW9uL2RhdGEtc3RvcmVzL3Bvb2wtc3RvcmVcIik7XHJcblxyXG5kZXNjcmliZShcIlBvb2wgc3RvcmVcIiwgZnVuY3Rpb24oKSB7XHJcblx0aXQoXCJvYmplY3RzIGNhbiBiZSBxdWVyaWVkIGJ5IGFueSBwcm9wZXJ0eVwiLCBmdW5jdGlvbihkb25lKSB7XHJcblx0XHQvLyBjcmVhdGUgYW4gYWRwYXRvciBhbmQgc3RvcmUgZm9yIHRlc3RpbmdcclxuXHRcdHZhciBwb29sID0gbmV3IFBvb2xTdG9yZShuZXcgTWVtQWRhcHRvcigpKTtcclxuXHJcblx0XHQvLyBmaWxsIHRoZSBhZGFwdG9yXHJcblx0XHRwb29sLnNldCh7IGlkOiBcImZvb1wiLCBuYW1lOiBcIkZvb1wiLCB0eXBlOiBcImFcIiB9KTtcclxuXHRcdHBvb2wuc2V0KHsgaWQ6IFwiYmFyXCIsIG5hbWU6IFwiQmFyXCIsIHR5cGU6IFwiYlwiIH0pO1xyXG5cdFx0cG9vbC5zZXQoeyBpZDogXCJiYXpcIiwgbmFtZTogXCJCYXpcIiwgdHlwZTogXCJhXCIgfSk7XHJcblxyXG5cdFx0Ly8gcXVlcnkgYWxsIHR5cGUgYSBlbGVtZW50c1xyXG5cdFx0cG9vbC5xdWVyeSh7IHR5cGU6IFwiYVwiIH0pXHJcblxyXG5cdFx0LnRoZW4oY29sbGVjdGlvbiA9PiB7XHJcblx0XHRcdC8vIHJlbW92ZSBtb2RpZmllZCBkYXRlc1xyXG5cdFx0XHRmb3IobGV0IHZhbHVlIG9mIGNvbGxlY3Rpb24pIHtcclxuXHRcdFx0XHRkZWxldGUgdmFsdWUubW9kaWZpZWQ7XHJcblx0XHRcdH1cclxuXHJcblx0XHRcdGFzc2VydC5kZWVwRXF1YWwoY29sbGVjdGlvbiwgW1xyXG5cdFx0XHRcdHsgaWQ6IFwiZm9vXCIsIG5hbWU6IFwiRm9vXCIsIHR5cGU6IFwiYVwiIH0sXHJcblx0XHRcdFx0eyBpZDogXCJiYXpcIiwgbmFtZTogXCJCYXpcIiwgdHlwZTogXCJhXCIgfVxyXG5cdFx0XHRdKTtcclxuXHJcblx0XHRcdGRvbmUoKTtcclxuXHRcdH0pXHJcblxyXG5cdFx0LmNhdGNoKGVyciA9PiBkb25lKGVycikpO1xyXG5cdH0pO1xyXG5cclxuXHRpdChcInF1ZXJ5cyBjYW4gYWxzbyBiZSB1cGRhdGVkIHdoZW4gdmFsdWVzIGNoYW5nZVwiLCBmdW5jdGlvbihkb25lKSB7XHJcblx0XHQvLyBjcmVhdGUgYW4gYWRwYXRvciBhbmQgc3RvcmUgZm9yIHRlc3RpbmdcclxuXHRcdHZhciBwb29sID0gbmV3IFBvb2xTdG9yZShuZXcgTWVtQWRhcHRvcigpKTtcclxuXHJcblx0XHQvLyBmaWxsIHRoZSBwb29sXHJcblx0XHRwb29sLnNldCh7IGlkOiBcImZvb1wiLCBuYW1lOiBcIkZvb1wiLCB0eXBlOiBcImFcIiB9KTtcclxuXHJcblx0XHQvLyBjb2xsZWN0IHZhbHVlcyB0aGF0IG1hdGNoXHJcblx0XHR2YXIgY29sbGVjdGlvbiA9IFtdO1xyXG5cclxuXHRcdC8vIHF1ZXJ5IGFsbCB0eXBlIGEgZWxlbWVudHNcclxuXHRcdHBvb2wucXVlcnkoeyB0eXBlOiBcImFcIiB9LCB2YWx1ZXMgPT4ge1xyXG5cdFx0XHQvLyByZW1vdmUgbW9kaWZpZWQgZmllbGRzXHJcblx0XHRcdGZvcihsZXQgdmFsdWUgb2YgdmFsdWVzKSB7XHJcblx0XHRcdFx0ZGVsZXRlIHZhbHVlLm1vZGlmaWVkO1xyXG5cdFx0XHR9XHJcblxyXG5cdFx0XHRjb2xsZWN0aW9uLnB1c2godmFsdWVzKTtcclxuXHRcdH0pO1xyXG5cclxuXHRcdHNldFRpbWVvdXQoKCkgPT4ge1xyXG5cdFx0XHQvLyBjaGFuZ2UgYSB2YWx1ZSB0aGF0IG1hdGNoZXMgdGhlIHF1ZXJ5XHJcblx0XHRcdHBvb2wuc2V0KHsgaWQ6IFwiYmF6XCIsIG5hbWU6IFwiQmF6XCIsIHR5cGU6IFwiYVwiIH0pO1xyXG5cclxuXHRcdFx0Ly8gY2hhbmdlIHRoZSB2YWx1ZSBzbyBpdCBkb2Vzbid0IG1hdGNoXHJcblx0XHRcdHBvb2wuc2V0KHsgaWQ6IFwiYmF6XCIsIG5hbWU6IFwiQmF6XCIsIHR5cGU6IFwiYlwiIH0pO1xyXG5cclxuXHRcdFx0Ly8gcmVtb3ZlIHRoZSBvdGhlciB2YWx1ZVxyXG5cdFx0XHRwb29sLnJlbW92ZShcImZvb1wiKTtcclxuXHJcblx0XHRcdGFzc2VydC5kZWVwRXF1YWwoY29sbGVjdGlvbiwgW1xyXG5cdFx0XHRcdFt7IGlkOiBcImZvb1wiLCBuYW1lOiBcIkZvb1wiLCB0eXBlOiBcImFcIiB9XSxcclxuXHRcdFx0XHRbeyBpZDogXCJmb29cIiwgbmFtZTogXCJGb29cIiwgdHlwZTogXCJhXCIgfSwgeyBpZDogXCJiYXpcIiwgbmFtZTogXCJCYXpcIiwgdHlwZTogXCJhXCIgfV0sXHJcblx0XHRcdFx0W3sgaWQ6IFwiZm9vXCIsIG5hbWU6IFwiRm9vXCIsIHR5cGU6IFwiYVwiIH1dLFxyXG5cdFx0XHRcdFtdXHJcblx0XHRcdF0pO1xyXG5cclxuXHRcdFx0ZG9uZSgpO1xyXG5cdFx0fSk7XHJcblx0fSk7XHJcblxyXG5cdGl0KFwicXVlcmllcyBjYW4gYmUgcGFzc2VkIGZ1bmN0aW9ucyB0byB0ZXN0IHRoZWlyIHZhbHVlcyBhZ2FpbnN0XCIsIGZ1bmN0aW9uKCkge1xyXG5cdFx0Ly8gY3JlYXRlIGFuIGFkcGF0b3IgYW5kIHN0b3JlIGZvciB0ZXN0aW5nXHJcblx0XHR2YXIgcG9vbCA9IG5ldyBQb29sU3RvcmUobmV3IE1lbUFkYXB0b3IoKSk7XHJcblxyXG5cdFx0Ly8gZmlsbCB0aGUgYWRhcHRvclxyXG5cdFx0cG9vbC5zZXQoeyBpZDogXCJmb29cIiwgbmFtZTogXCJGb29cIiwgdmFsdWU6IDEgfSk7XHJcblx0XHRwb29sLnNldCh7IGlkOiBcImJhclwiLCBuYW1lOiBcIkJhclwiLCB2YWx1ZTogMiB9KTtcclxuXHRcdHBvb2wuc2V0KHsgaWQ6IFwiYmF6XCIsIG5hbWU6IFwiQmF6XCIsIHZhbHVlOiAzIH0pO1xyXG5cclxuXHRcdC8vIHF1ZXJ5IGFsbCB0eXBlIGEgZWxlbWVudHNcclxuXHRcdHJldHVybiBwb29sLnF1ZXJ5KHsgdmFsdWU6IHZhbCA9PiB2YWwgPiAxIH0pXHJcblxyXG5cdFx0LnRoZW4oY29sbGVjdGlvbiA9PiB7XHJcblx0XHRcdC8vIHJlbW92ZSBtb2RpZmllZCBkYXRlc1xyXG5cdFx0XHRmb3IobGV0IHZhbHVlIG9mIGNvbGxlY3Rpb24pIHtcclxuXHRcdFx0XHRkZWxldGUgdmFsdWUubW9kaWZpZWQ7XHJcblx0XHRcdH1cclxuXHJcblx0XHRcdGFzc2VydC5kZWVwRXF1YWwoY29sbGVjdGlvbiwgW1xyXG5cdFx0XHRcdHsgaWQ6IFwiYmFyXCIsIG5hbWU6IFwiQmFyXCIsIHZhbHVlOiAyIH0sXHJcblx0XHRcdFx0eyBpZDogXCJiYXpcIiwgbmFtZTogXCJCYXpcIiwgdmFsdWU6IDMgfVxyXG5cdFx0XHRdKTtcclxuXHRcdH0pO1xyXG5cdH0pO1xyXG59KTtcclxuIiwidmFyIERpc3Bvc2FibGUgPSByZXF1aXJlKFwiLi4vLi4vLi4vc3JjL2NvbW1vbi91dGlsL2Rpc3Bvc2FibGVcIik7XHJcbnZhciBFdmVudEVtaXR0ZXIgPSByZXF1aXJlKFwiLi4vLi4vLi4vc3JjL2NvbW1vbi91dGlsL2V2ZW50LWVtaXR0ZXJcIik7XHJcbnZhciBhc3NlcnQgPSByZXF1aXJlKFwiYXNzZXJ0XCIpO1xyXG5cclxuZGVzY3JpYmUoXCJEaXNwb3NhYmxlXCIsIGZ1bmN0aW9uKCkge1xyXG5cdGl0KFwiY2FuIGNvbGxlY3Qgc3Vic2NyaXB0aW9ucyBhbmQgcmVtb3ZlIHRoZSB0b2dldGhlclwiLCBmdW5jdGlvbigpIHtcclxuXHRcdC8vIGNvdW50IGhvdyBtYW55IHN1YnNjcmlwdGlvbiBoYXZlIGJlZW4gdW5zdWJzY3JpYmVkXHJcblx0XHR2YXIgcmVmID0geyBjb3VudDogMCB9O1xyXG5cdFx0Ly8gY3JlYXRlIHRoZSBkaXNwb3NhYmxlXHJcblx0XHR2YXIgZGlzcCA9IG5ldyBEaXNwb3NhYmxlKCk7XHJcblxyXG5cdFx0Ly8gYWRkIHNvbWUgc3Vic2NyaXB0aW9uc1xyXG5cdFx0ZGlzcC5hZGQoY3JlYXRlU3ViKHJlZikpO1xyXG5cdFx0ZGlzcC5hZGQoY3JlYXRlU3ViKHJlZikpO1xyXG5cdFx0ZGlzcC5hZGQoY3JlYXRlU3ViKHJlZikpO1xyXG5cclxuXHRcdC8vIGRpc3Bvc2UgdGhlIHN1YnNjcmlwdGlvbnNcclxuXHRcdGRpc3AuZGlzcG9zZSgpO1xyXG5cclxuXHRcdC8vIGRpc3Bvc2UgYWdhaW4gdG8gY2hlY2sgdGhhdCBkaXNwb3NhYmxlcyBvbmx5IHRyaWdnZXIgb25jZVxyXG5cdFx0ZGlzcC5kaXNwb3NlKCk7XHJcblxyXG5cdFx0YXNzZXJ0LmVxdWFsKHJlZi5jb3VudCwgMyk7XHJcblx0fSk7XHJcblxyXG5cdGl0KFwiY2FuIGJlIGRpc3Bvc2VkIGJ5IGFuIGV2ZW50XCIsIGZ1bmN0aW9uKCkge1xyXG5cdFx0Ly8gY291bnQgaG93IG1hbnkgc3Vic2NyaXB0aW9uIGhhdmUgYmVlbiB1bnN1YnNjcmliZWRcclxuXHRcdHZhciByZWYgPSB7IGNvdW50OiAwIH07XHJcblx0XHQvLyBjcmVhdGUgdGhlIGRpc3Bvc2FibGVcclxuXHRcdHZhciBkaXNwID0gbmV3IERpc3Bvc2FibGUoKTtcclxuXHRcdC8vIGNyZWF0ZSBhbiBldmVudCBlbWl0dGVyIHRvIHdhdGNoXHJcblx0XHR2YXIgZW1pdHRlciA9IG5ldyBFdmVudEVtaXR0ZXIoKTtcclxuXHJcblx0XHQvLyBhZGQgc29tZSBzdWJzY3JpcHRpb25zXHJcblx0XHRkaXNwLmFkZChjcmVhdGVTdWIocmVmKSk7XHJcblx0XHRkaXNwLmFkZChjcmVhdGVTdWIocmVmKSk7XHJcblx0XHRkaXNwLmFkZChjcmVhdGVTdWIocmVmKSk7XHJcblxyXG5cdFx0Ly8gZGlzcG9zZSB0aGUgc3Vic2NyaXB0aW9uc1xyXG5cdFx0ZGlzcC5kaXNwb3NlT24oZW1pdHRlciwgXCJkaXNwb3NlXCIpO1xyXG5cclxuXHRcdC8vIHRyaWdnZXIgdGhlIGRpc3Bvc2FibGVcclxuXHRcdGVtaXR0ZXIuZW1pdChcImRpc3Bvc2VcIik7XHJcblxyXG5cdFx0YXNzZXJ0LmVxdWFsKHJlZi5jb3VudCwgMyk7XHJcblxyXG5cdFx0Ly8gY2hlY2sgdGhlIGRpc3Bvc2UgbGlzdGVuZXIgd2FzIHJlbW92ZWRcclxuXHRcdGFzc2VydC5lcXVhbChlbWl0dGVyLl9saXN0ZW5lcnMuZGlzcG9zZS5sZW5ndGgsIDApO1xyXG5cdH0pO1xyXG59KTtcclxuXHJcbi8vIGhlbHBlciB0byBjcmVhdGUgYSBzdWJzY3JpcHRpb24gdGhhdCBpbmNyZW1lbnRzIGEgY291bnRlciB3aGVuIGl0IGlzIHJlbW92ZWRcclxudmFyIGNyZWF0ZVN1YiA9IGZ1bmN0aW9uKHJlZikge1xyXG5cdHJldHVybiB7XHJcblx0XHR1bnN1YnNjcmliZSgpIHtcclxuXHRcdFx0KytyZWYuY291bnQ7XHJcblx0XHR9XHJcblx0fTtcclxufTtcclxuIl19
