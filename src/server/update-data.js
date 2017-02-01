/**
 * Upgrade our data from a previous version
 */

var fs = require("fs");
var path = require("path");
var levelup = require("levelup");

const DATA_DIR = path.join(__dirname, "../../../life-line-data");

export default function checkData() {
	var dataVersion;

	// check the version of out current data
	try {
		dataVersion = require(path.join(DATA_DIR, "version.json"));
	}
	catch(err) {
		// we have existing data
		if(fs.existsSync(DATA_DIR)) {
			dataVersion = 0;
		}
	}

	// upgrade from version 0
	if(dataVersion === 0) {
		console.log("Upgrading data");

		var donePromises = [];

		// convert json files to levelup dbs
		for(let dataSet of fs.readdirSync(DATA_DIR)) {
			// get the full path
			var dataSet = path.join(DATA_DIR, dataSet);

			// ignore files
			if(fs.statSync(dataSet).isFile()) continue;

			// load the json files
			var dataStore = [];

			for(let key of fs.readdirSync(dataSet)) {
				// path to the json file
				let jsonFile = path.join(dataSet, key);

				// strip the .json
				key = key.substr(0, key.length - 5);

				// save the data
				dataStore.push([key, JSON.parse(fs.readFileSync(jsonFile, "utf8"))]);

				// remove the file
				fs.unlinkSync(jsonFile);
			}

			// remove the parent folder
			fs.rmdirSync(dataSet);

			// create the level db database
			var db = levelup(dataSet, { valueEncoding: "json" });

			// batch add everything
			var batch = db.batch();

			for(let item of dataStore) {
				batch.put(item[0], item[1]);
			}

			// write the changes
			donePromises.push(
				new Promise(function(resolve, reject) {
					batch.write(err => {
						// pass the result on to the promise
						if(err) reject(err);
						else resolve();
					})
				})
			);
		}

		// save the new version
		saveVersion("1");

		return Promise.all(donePromises)

		.then(() => console.log("Data upgraded"));
	}

	return Promise.resolve();
}

// save the upgraded version
var saveVersion = version => {
	fs.writeFileSync(path.join(DATA_DIR, "version.json"), `{"version":${version}}`);
};
