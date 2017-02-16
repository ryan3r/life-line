var assert = require("assert");
var JsonFileAdaptor = require("../../../src/server/data-stores/json-file-adaptor");
var path = require("path");
var fs = require("fs");

// remove a file if it exists
var removeFile = function(src) {
	if(fs.existsSync(src)) {
		fs.unlinkSync(src);
	}
};

describe("Json file adaptor", function(done) {
	it("can be loaded and queried in object mode", function() {
		// load an existing file
		var jfile = new JsonFileAdaptor({
			src: path.join(__dirname, "../../test-files/reads/jfile-object.json"),
			mode: "object"
		});

		// get the value of foo
		return jfile.get("foo")

		.then(val => {
			// check the result
			assert.deepEqual(val, { id: "foo", value: "bar" });

			// get all the values
			return jfile.getAll();
		})

		.then(vals => {
			// check we got the correct values
			assert.deepEqual(vals, [
				{ id: "foo", value: "bar" }
			]);
		});
	});

	it("can be loaded and queried in array mode", function() {
		// load an existing file
		var jfile = new JsonFileAdaptor({
			src: path.join(__dirname, "../../test-files/reads/jfile-array.json"),
			mode: "array"
		});

		// get the value of foo
		return jfile.get("foo")

		.then(val => {
			// check the result
			assert.deepEqual(val, { id: "foo", value: "bar" });

			// get all the values
			return jfile.getAll();
		})

		.then(vals => {
			// check we got the correct values
			assert.deepEqual(vals, [
				{ id: "foo", value: "bar" }
			]);
		});
	});

	it("can write to a json file in object mode", function() {
		var src = path.join(__dirname, "../../test-files/writes/jfile-object.json");

		// craete an object mode file
		var jfile = new JsonFileAdaptor({
			src,
			mode: "object"
		});

		// store a value
		return jfile.set({ id: "foo", value: "bar" })

		.then(() => {
			var file = JSON.parse(fs.readFileSync(src, "utf8"));

			assert.deepEqual(file, { foo: "bar" });

			removeFile(src);
		});
	});

	it("can write to a json file in array mode", function() {
		var src = path.join(__dirname, "../../test-files/writes/jfile-array.json");

		// craete an object mode file
		var jfile = new JsonFileAdaptor({
			src,
			mode: "array"
		});

		// store a value
		return jfile.set({ id: "foo", value: "bar" })

		.then(() => {
			var file = JSON.parse(fs.readFileSync(src, "utf8"));

			assert.deepEqual(file, [{ id: "foo", value: "bar" }]);

			removeFile(src);
		});
	});

	it("can remove a value from a file", function() {
		var src = path.join(__dirname, "../../test-files/writes/jfile-remove.json");

		// craete an object mode file
		var jfile = new JsonFileAdaptor({
			src,
			mode: "object"
		});

		// store a value
		return jfile.set({ id: "foo", value: "bar" })

		// remove said file
		.then(() => jfile.remove({ id: "foo", value: "bar" }))

		.then(() => {
			var file = JSON.parse(fs.readFileSync(src, "utf8"));

			assert.deepEqual(file, {});

			removeFile(src);
		});
	});
});
