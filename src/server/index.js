/**
 * Export all modules in one place
 */

exports.startServer = require("./server");
exports.backup = require("./backup");

// export the data store stuff
exports.HttpAdaptor = require("../common/data-stores/http-adaptor");
exports.MemAdaptor = require("../common/data-stores/mem-adaptor");
exports.KeyValueStore = require("../common/data-stores/key-value-store");
exports.PoolStore = require("../common/data-stores/pool-store");
exports.Syncer = require("../common/data-stores/syncer");
exports.FolderAdaptor = require("./data-stores/folder-adaptor");
exports.JsonFileAdaptor = require("./data-stores/json-file-adaptor");
exports.adpatorServer = require("./data-stores/adaptor-server");

// export common data stores
exports.datastores = require("./data-stores");
exports.config = exports.datastores.config;
