#!/usr/bin/env node

/**
 * Create a backup or start the server
 */

var lifeLine = require("..");

// pick the command
switch(process.argv[2]) {
	// start the server
	case "serve":
		lifeLine.startServer();
		break;

	// backup this directory or backup a remote server
	case "backup":
		lifeLine.backup(process.argv[3])

		.on("end", () => console.log("Backup complete"));
		break;
}

// handle unhandled rejections (the way the should be)
process.on("unhandledRejection", err => {
	console.log(err.stack);
	process.exit(8);
});
