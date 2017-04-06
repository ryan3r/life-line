/**
 * Create all the data stores for the client
 */

var KeyValueStore = require("../../common/data-stores/key-value-store");
var PoolStore = require("../../common/data-stores/pool-store");
var MemAdaptor = require("../../common/data-stores/mem-adaptor");
var FolderAdaptor = require("./folder-adaptor");
var JsonFileAdaptor = require("./json-file-adaptor");
var path = require("path");
var fs = require("fs");

var initItem = item => {
	// instantiate the date
	if(item.date) {
		item.date = new Date(item.date);
	}
};

// assume this is the data dir
var dsDir = process.cwd();

// if there is a life-line-data folder in the current directory use that
if(fs.existsSync(path.join(dsDir, "life-line-data"))) {
	dsDir = path.join(dsDir, "life-line-data");
}

// create the data stores and adaptors
exports.config = new KeyValueStore(new JsonFileAdaptor({
	src: path.join(dsDir, "config.json"),
	mode: "object"
}));

exports.users = new KeyValueStore(new JsonFileAdaptor(path.join(dsDir, "users.json")));
exports.sessions = new KeyValueStore(new JsonFileAdaptor(path.join(dsDir, "sessions.json")));
exports.assignments = new PoolStore(new FolderAdaptor(path.join(dsDir, "assignments")), initItem);

exports.apiKeys = new KeyValueStore(new JsonFileAdaptor({
	mode: "object",
	src: path.join(dsDir, "api-keys.json")
}));
