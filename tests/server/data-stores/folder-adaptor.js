var fs = require("fs");
var assert = require("assert");
var path = require("path");
var FolderAdaptor = require("../../../src/server/data-stores/folder-adaptor");

// remove a folder
function remove(src) {
	// remove all children
	for(let name of fs.readdirSync(src)) {
		fs.unlinkSync(path.join(src, name));
	}

	// remove the folder
	fs.rmdirSync(src);
}

describe("Folder adaptor", function() {
	it("can load individual values", function() {
		var src = path.join(__dirname, "../../test-files/reads/folder");

		// create the adaptor
		var adaptor = new FolderAdaptor(src);

		// get a value
		return adaptor.get("foo")

		.then(value => {
			assert.deepEqual(value, { id: "foo", value: "bar" });
		});
	});

	it("can get undefined values", function() {
		var src = path.join(__dirname, "../../test-files/reads/folder");

		// create the adaptor
		var adaptor = new FolderAdaptor(src);

		return adaptor.get("not-defined")

		.then(value => {
			assert.deepEqual(value, undefined);
		});
	});

	it("can get all values", function() {
		var src = path.join(__dirname, "../../test-files/reads/folder");

		// create the adaptor
		var adaptor = new FolderAdaptor(src);

		return adaptor.getAll()

		.then(values => {
			assert.deepEqual(values, [
				{ id: "foo", value: "bar" }
			]);
		});
	});

	it("can store values", function() {
		var src = path.join(__dirname, "../../test-files/writes/folder");

		// create the adaptor
		var adaptor = new FolderAdaptor(src);

		return adaptor.set({ id: "foo", value: "bar" })

		.then(() => {
			// load and parse the file
			var written = JSON.parse(fs.readFileSync(src + "/foo.json", "utf8"));

			assert.deepEqual(written, { id: "foo", value: "bar" });

			// delete the written files
			remove(src);
		});
	});

	it("can remove values", function() {
		var src = path.join(__dirname, "../../test-files/writes/folder");

		// create the adaptor
		var adaptor = new FolderAdaptor(src);

		// store a value in the adaptor
		return adaptor.set({ id: "foo", value: "bar" })

		// remove the value
		.then(() => adaptor.remove("foo"))

		.then(() => {
			// check that there is no such problem
			assert(!fs.existsSync(path.join(src, "foo.json")));

			// delete the written files
			remove(src);
		});
	});
});
