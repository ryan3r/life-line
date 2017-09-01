const fs = require("fs");
const crypto = require("crypto");
const path = require("path");

module.exports = function(dev) {
	// load the build config
	const build = JSON.parse(
		fs.readFileSync(path.join(__dirname, "static/build.json"), "utf8")
	);

	// the file registry
	let files = {};

	for(let entry of build) {
		// only build this in dev mode
		if(!dev && entry.devOnly) continue;

		// do nothing in the to files in public in dev mode
		if(entry.publicDir && dev) continue;

		const dir = entry.publicDir ? "public" : "static";
		// load the file
		const rawFile = fs.readFileSync(path.join(__dirname, dir, entry.name), "utf8");

		// fill in the template
		const content = rawFile.replace(/\{\{\s*(.+?)\s*\}\}/g, (txt, name) => {
			return files[name] || name;
		});

		// hash this file
		let hash = crypto.createHash("md5");
		hash.update(content);
		const hashStr = hash.digest("hex");

		// get the file extension
		const ext = path.extname(entry.name);
		// get the name before the extension
		const baseName = entry.name.substr(0, entry.name.length - ext.length);

		// get the name for the file
		const outName = entry.hash && !dev ? `${baseName}.${hashStr}${ext}` : entry.name;

		// save the file name
		files[entry.name] = outName;

		// save the file
		fs.writeFile(path.join(__dirname, "public", outName), content);
	}
};

// run the build
if(require.main == module) {
	module.exports(process.argv[2] != "prod");
}
