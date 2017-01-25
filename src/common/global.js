/**
 * Create a global object with commonly used modules to avoid 50 million requires
 */

import EventEmitter from "./event-emitter";

var lifeLine = new EventEmitter();

// platform detection
lifeLine.node = typeof process == "object";
lifeLine.browser = typeof window == "object";

// attach utils
lifeLine.Disposable = require("./disposable").default;
lifeLine.EventEmitter = EventEmitter;

// attach lifeline to the global object
(lifeLine.node ? global : browser).lifeLine = lifeLine;
