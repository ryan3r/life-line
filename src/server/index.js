/**
 * Create a backup or start the server
 */

var path = require("path");
var fs = require("fs");

import startServer from "./server";
import backup from "./backup";
import {genBackupName} from "../common/backup";
import checkData from "./update-data";

export default function start(devMode) {
	// check if we need to update the data
	checkData()

	.then(() => {
		// check for the backup command
		if(process.argv[2] == "backup") {
			var backupPath = path.join(process.argv[3], genBackupName());

			// build and save the backup
			backup()
				.pipe(fs.createWriteStream(backupPath));
		}
		// start the server
		else {
			startServer(devMode);
		}
	});
};
