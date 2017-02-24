/**
 * Create a zip archive containing all the user data
 */

var path = require("path");
var fs = require("fs");
var archiver = require("archiver");
var {assignments} = require("./data-stores");
var {genBackupName} = require("../common/backup");

// create a backup archive
module.exports = function(outdir) {
	// create the backup archive
	var zip = archiver("zip", { store: true });

	// load all the assignments
	assignments.query({})

	.then(assignments => {
		// add the assignments to the archive
		for(let assignment of assignments) {
			zip.append(JSON.stringify(assignment), { name: assignment.id + ".json" });
		}

		// finish writing to the archive
		zip.finalize();
	});

	// write to an out dir
	if(outdir) {
		zip.pipe(fs.createWriteStream(path.join(outdir, genBackupName())));
	}

	return zip;
}
