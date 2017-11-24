const fs = require("fs");
const crypto = require("crypto");
const path = require("path");

// check beta version
let IS_BETA = process.argv[3] == "beta";

module.exports = function(dev) {
	// load the build config
	const build = JSON.parse(
		fs.readFileSync(path.join(__dirname, "static/build.json"), "utf8")
	);

	// the file registry
	let files = {};

	files.appTitle = IS_BETA ? "Life line beta" : "Life line";

	for(let entry of build) {
		// only build this in dev mode
		if(!dev && entry.devOnly) continue;

		// do nothing in the to files in public in dev mode
		if(entry.publicDir && dev) continue;

		// show specific files in beta mode
		if(entry.beta !== undefined && entry.beta !== IS_BETA) continue;

		const dir = entry.publicDir ? "public" : "static";
		// load the file
		let rawFile = fs.readFileSync(path.join(__dirname, dir, entry.name));

		// fill in the template
		if(!entry.binary) {
			rawFile = rawFile.toString("utf8").replace(/\{\{\s*(.+?)\s*\}\}/g, (txt, name) => {
				return files[name] || name;
			});
		}

		// hash this file
		let hash = crypto.createHash("md5");
		hash.update(rawFile);
		const hashStr = hash.digest("hex");

		let destName = entry.rename || entry.name;

		// get the file extension
		const ext = path.extname(destName);
		// get the name before the extension
		const baseName = destName.substr(0, destName.length - ext.length);

		// get the name for the file
		const outName = entry.hash && !dev ? `${baseName}.${hashStr}${ext}` : destName;

		// save the file name
		files[destName] = outName;

		// save the file
		fs.writeFile(path.join(__dirname, "public", outName), rawFile, () => {});
	}
};

// run the build
if(require.main == module) {
	module.exports(process.argv[2] != "prod");
}
