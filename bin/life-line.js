#!/usr/bin/env node

/**
 * Create a backup or start the server
 */

var nopt = require("nopt");
var lifeLine = require("..");

// parse the command line arguments
var parsed = nopt({
	backup: String,
	port: Number,
	localhost: Boolean,
	devMode: Boolean,
	certs: String,
	dataDir: String
});

// update the configuration
lifeLine.config.setOverrides(parsed);

// run a backup
if(parsed.backup) {
	// build and save the backup
	lifeLine.backup(parsed.backup);
}
// start the server
else {
	lifeLine.startServer();
}
