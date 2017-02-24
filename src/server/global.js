/**
 * Node specific global modules
 */

lifeLine.Response = require("../server/response");
lifeLine.jsend = require("../server/jsend");

// polyfill fetch for node
global.fetch = require("node-fetch");
