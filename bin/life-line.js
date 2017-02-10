#!/usr/bin/env node

/**
 * Create a backup or start the server
 */

var path = require("path");
var fs = require("fs");
var nopt = require("nopt");
var lifeLine = require("..");

// parse the command line arguments
var parsed = nopt({
	backup: String,
	port: Number,
	localhost: Boolean,
	dev: Boolean,
	certs: String,
	"data-dir": String
});

// configure the data stores
if(parsed["data-dir"]) {
	lifeLine.setDataDir(parsed["data-dir"]);
}

// run a backup
if(parsed.backup) {
	// build and save the backup
	lifeLine.backup(parsed.backup);
}
// start the server
else {
	lifeLine.startServer({
		devMode: parsed.dev,
		localhost: parsed.localhost,
		port: parsed.port,
		certs: parsed.certs
	});
}
