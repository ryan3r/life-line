var assert = require("assert");
var MemAdaptor = require("../../../src/common/data-stores/mem-adaptor");
var AdaptorServer = require("../../../src/server/data-stores/adaptor-server");
var HttpAdaptor = require("../../../src/common/data-stores/http-adaptor");
var Request = require("../../../src/server/request");
var http = require("http");

var server, memAdaptor;

const PORT = 7834;
const ADDRESS = `http://localhost:${PORT}/`;

describe("Http adaptor", function() {
	before(function(done) {
		// restrict access
		var access = (key, req) => req.cookies.session == "let-in";

		// create the adaptor to serve
		memAdaptor = new MemAdaptor();
		var serveFn = AdaptorServer(memAdaptor, { read: access, write: access });

		// serve the adaptor
		server = http.createServer(function(req, res) {
			serveFn(req.url, new Request(req))

			.then(r => r.$send(req, res)).catch(err => console.log(err.stack));
		});

		// start the server
		server.listen(PORT, "localhost", done);
	});

	beforeEach(function() {
		// clear the adaptor
		memAdaptor._data = {};
	});

	after(function(done) {
		// close the server
		server.close(done);
	});

	it("can get all items", function() {
		var httpAdaptor = new HttpAdaptor({
			src: ADDRESS,
			session: "let-in"
		});

		// put some data in the in memory store
		return memAdaptor.set({
			id: "foo",
			name: "Foo"
		})

		// fetch all the items from the adaptor
		.then(() => httpAdaptor.getAll())

		.then(all => {
			assert.deepEqual(all, [
				{ id: "foo", name: "Foo" }
			]);
		});
	});

	it("can get a value by id", function() {
		var httpAdaptor = new HttpAdaptor({
			src: ADDRESS,
			session: "let-in"
		});

		// put some data in the in memory store
		return memAdaptor.set({
			id: "foo",
			name: "Foo"
		})

		// fetch the item from the adaptor
		.then(() => httpAdaptor.get("foo"))

		.then(value => {
			assert.deepEqual(value, { id: "foo", name: "Foo" });

			// check an undefined item
			return httpAdaptor.get("not-defined");
		})

		.then(value => {
			assert.equal(value, undefined);
		});
	});

	it("can store a value", function() {
		var httpAdaptor = new HttpAdaptor({
			src: ADDRESS,
			session: "let-in"
		});

		// store the value in the adapotr
		return httpAdaptor.set({
			id: "bar",
			name: "Bar"
		})

		// verify the item was saved
		.then(() => memAdaptor.get("bar"))

		.then(value => {
			assert.deepEqual(value, { id: "bar", name: "Bar" });
		});
	});

	it("can remove a value", function() {
		var httpAdaptor = new HttpAdaptor({
			src: ADDRESS,
			session: "let-in"
		});

		// create the value to delete
		return memAdaptor.set({
			id: "bar",
			name: "Bar"
		})

		// delete the item
		.then(() => httpAdaptor.remove("bar"))

		// verify the item was deleted
		.then(() => memAdaptor.get("bar"))

		.then(value => {
			assert.equal(value, undefined);
		});
	});

	it("handles access denied", function() {
		var httpAdaptor = new HttpAdaptor(ADDRESS);

		// check that all of the methods fail
		return Promise.all([
			httpAdaptor.get("foo")
				.catch(err => assert.equal(err.code, "not-logged-in")),

			httpAdaptor.set({ id: "foo"})
				.catch(err => assert.equal(err.code, "not-logged-in")),

			httpAdaptor.remove("foo")
				.catch(err => assert.equal(err.code, "not-logged-in"))
		]);
	});
});
