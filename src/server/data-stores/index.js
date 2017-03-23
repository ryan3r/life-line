/**
 * Create all the data stores for the client
 */

var KeyValueStore = require("../../common/data-stores/key-value-store");
var PoolStore = require("../../common/data-stores/pool-store");
var MemAdaptor = require("../../common/data-stores/mem-adaptor");
var FolderAdaptor = require("./folder-adaptor");
var JsonFileAdaptor = require("./json-file-adaptor");
var path = require("path");

var initItem = item => {
	// instantiate the date
	if(item.date) {
		item.date = new Date(item.date);
	}
};

exports.config = new KeyValueStore(new MemAdaptor());

// create the data stores and adaptors
exports.users = new KeyValueStore(new JsonFileAdaptor());
exports.sessions = new KeyValueStore(new JsonFileAdaptor());
exports.assignments = new PoolStore(new FolderAdaptor(), initItem);
exports.apiKeys = new KeyValueStore(new JsonFileAdaptor({ mode: "object" }));

// set the data dir for data stores
exports.config.watch("dataDir", { current: true }, dsDir => {
	// no initial value (do nothing)
	if(!dsDir) return;

	exports.users._adaptor.setFile(path.join(dsDir, "users.json"));
	exports.sessions._adaptor.setFile(path.join(dsDir, "sessions.json"));
	exports.assignments._adaptor.setFolder(path.join(dsDir, "assignments"));
	exports.apiKeys._adaptor.setFile(path.join(dsDir, "api-keys.json"));
});
