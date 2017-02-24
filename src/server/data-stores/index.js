/**
 * Create all the data stores for the client
 */

var KeyValueStore = require("../../common/data-stores/key-value-store");
var PoolStore = require("../../common/data-stores/pool-store");
var FolderAdaptor = require("./folder-adaptor");
var JsonFileAdaptor = require("./json-file-adaptor");
var path = require("path");

// TODO: DO SOMETHING ABOUT THIS
const DS_DIR = "../life-line-data";

exports.users = new KeyValueStore(
	new JsonFileAdaptor({
		src: path.join(DS_DIR, "users.json")
	})
);

exports.sessions = new KeyValueStore(
	new JsonFileAdaptor({
		src: path.join(DS_DIR, "sessions.json")
	})
);

exports.assignments = new PoolStore(new FolderAdaptor(path.join(DS_DIR, "assignments")));
