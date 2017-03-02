/**
 * An adaptor that stores its data in a json file
 */

var fs = require("fs-promise");
var os = require("os");

const OBJECT_MODE = "object";
const ARRAY_MODE = "array";

class JsonFileAdaptor {
	constructor(opts) {
		// configure the adaptor
		if(typeof opts == "object") {
			this.mode = opts.mode;
			this.src = opts.src;
		}
		// default to array mode
		else {
			this.mode = ARRAY_MODE;
			this.src = opts;
		}
	}

	// open and parse a file
	_openFile() {
		// if the file is already open don't do anything
		if(this._file) return this._file;

		this._file = fs.readFile(this.src, "utf8")

		.then(file => {
			// if the file is empty treat it as such (don't error out)
			if(file.trim().length === 0) {
				return {};
			}

			// parse the file
			file = JSON.parse(file);

			// already in the correct format
			if(this.mode == OBJECT_MODE) {
				// convert key: value pairs to key: { id: key, value } pairs
				for(let id of Object.getOwnPropertyNames(file)) {
					file[id] = {
						id: id,
						value: file[id]
					};
				}

				return file;
			}
			else {
				// map the values by id
				var mapped = {};

				file.forEach(value => mapped[value.id] = value);

				return mapped;
			}
		})

		.catch(err => {
			// ignore file not found errors
			if(err.code == "ENOENT") {
				return {};
			}

			// rethrow any other errors
			throw err;
		});

		return this._file;
	}

	/**
	 * Change the file this store is using
	 */
	setFile(src) {
		// update the source string
		this.src = src;
		// remove the old file from memory
		delete this._file;
	}

	/**
	 * Get all the values in the json file
	 */
	getAll() {
		return this._openFile().then(file => {
			// get all the ids
			return Object.getOwnPropertyNames(file)

			.map(id => {
				return file[id];
			});
		});
	}

	/**
	 * Get a specific item by id
	 */
	get(id) {
		return this._openFile().then(file => {
			return file[id];
		});
	}

	// write the current values to the disk
	_writeFile() {
		var file;

		// the file is already correctly formatted
		if(this.mode == OBJECT_MODE) {
			file = this._openFile().then(file => {
				var mapped = {};

				// convert the form id: {id, value} to id: value
				for(let id of Object.getOwnPropertyNames(file)) {
					mapped[id] = file[id].value;
				}

				return mapped;
			});
		}
		// the output from getAll() is the array mode formatted
		else {
			file = this.getAll();
		}

		// write to the disk
		return file.then(file => {
			// convert the file to a string
			file = JSON.stringify(file, null, "\t");

			// convert LF to CRLF on windows
			if(os.EOL !== "\n") {
				file = file.replace(/\n/g, os.EOL);
			}

			return fs.writeFile(this.src, file);
		});
	}

	/**
	 * Store a value in the file
	 */
	set(value) {
		this._file = this._openFile().then(file => {
			// store it
			file[value.id] = value;

			return file;
		});

		return this._writeFile();
	}

	/**
	 * Remove a value in the file
	 */
	remove(value) {
		this._file = this._openFile().then(file => {
			// delete it
			delete file[value.id];

			return file;
		});

		return this._writeFile();
	}
}

module.exports = JsonFileAdaptor;
