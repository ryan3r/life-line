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
	devMode: Boolean,
	certs: String
});

// update the configuration
global.lifeLine.config.setOverrides(parsed);

// run a backup
if(parsed.backup) {
	// build and save the backup
	lifeLine.backup(parsed.backup);
}
// start the server
else {
	lifeLine.startServer();
}
