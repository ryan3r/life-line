/**
 * Create a zip archive containing all the user data
 */

var fs = require("fs");
var archiver = require("archiver");

import {Store} from "./data-store";

// get the assignments data store
var assignments = new Store("assignments");

// create a backup archive
export default function backup() {
	// create the backup archive
	var zip = archiver("zip", { store: true });

	// load all the assignments
	assignments.getAll()

	.then(assignments => {
		// add the assignments to the archive
		for(let assignment of assignments) {
			zip.append(JSON.stringify(assignment), { name: assignment.id + ".json" });
		}

		// finish writing to the archive
		zip.finalize();
	});

	return zip;
}
