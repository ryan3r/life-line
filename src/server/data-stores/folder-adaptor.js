/**
 * An adaptor that stores values as json files
 */

var fs = require("fs-promise");
var path = require("path");
var os = require("os");

class FolderAdaptor {
	constructor(src) {
		this.src = src;
	}

	// if the containing folder does not exist create it
	_openFolder() {
		// if we are already open don't open again
		if(this._ready) return this._ready;

		this._ready = fs.exists(this.src)

		.then(exists => {
			if(!exists) {
				return fs.mkdir(this.src);
			}
		});

		return this._ready;
	}

	/**
	 * Change the directory to use
	 */
	setFolder(src) {
		this.src = src;
		// reset our state
		delete this._ready;
	}

	/**
	 * Get all the values in the store
	 */
	getAll() {
		return this._openFolder().then(() => {
			// get all the files in the folder
			return fs.readdir(this.src);
		})

		.then(files => {
			// load all the files
			return Promise.all(
				files.map(name => {
					return fs.readFile(path.join(this.src, name), "utf8")

					// parse the file
					.then(file => JSON.parse(file));
				})
			)
		});
	}

	/**
	 * Look up a value
	 */
	get(id) {
		// load the file
		return this._openFolder().then(() => {
			return fs.readFile(path.join(this.src, id + ".json"), "utf8")
		})

		// parse the file
		.then(file => JSON.parse(file))

		// catch not found errors
		.catch(err => {
			// return undefined if the file does not exist
			if(err.code == "ENOENT") {
				return;
			}

			throw err;
		});
	}

	/**
	 * Store a value
	 */
	set(value) {
		return this._openFolder().then(() => {
			// convert the file to a string
			var strValue = JSON.stringify(value, null, "\t");

			// convert LF to CRLF on windows
			if(os.EOL !== "\n") {
				strValue = strValue.replace(/\n/g, os.EOL);
			}

			// get the path for the file
			var fileSrc = path.join(this.src, value.id + ".json");

			return fs.writeFile(fileSrc, strValue);
		});
	}

	/**
	 * Remove a value
	 */
	remove(id) {
		return this._openFolder().then(() => {
			// delete the file
			return fs.unlink(path.join(this.src, id + ".json"));
		});
	}
}

module.exports = FolderAdaptor;
