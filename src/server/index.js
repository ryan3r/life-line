/**
 * Export all modules in one place
 */

var {setDataDir} = require("./data-store");

// set the default data dir
setDataDir("life-line-data");

exports.setDataDir = setDataDir;
exports.startServer = require("./server");
exports.backup = require("./backup");
