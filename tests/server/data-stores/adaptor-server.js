require("../../../src/common/global");
require("../../../src/server/global");
var assert = require("assert");
var AdaptorServer = require("../../../src/server/data-stores/adaptor-server");
var MemAdaptor = require("../../../src/common/data-stores/mem-adaptor");

describe("Adaptor server", function() {
	it("can get all the items in a data store", function() {
		// create an adaptor and server
		var adaptor = new MemAdaptor();
		var server = AdaptorServer(adaptor);

		// set some test values
		adaptor.set({ id: "foo", value: "bar" });

		// pass a fake request
		return server("/", { method: "GET" })

		.then(res => {
			// check the status
			assert.equal(res.status, 200);

			// check the body
			assert.deepEqual(res.body, [
				{ id: "foo", value: "bar" }
			]);
		});
	});

	it("can get a single item in a data store", function() {
		// create an adaptor and server
		var adaptor = new MemAdaptor();
		var server = AdaptorServer(adaptor);

		// set some test values
		adaptor.set({ id: "foo", value: "bar" });

		// pass a fake request
		return server("/value/foo", { method: "GET" })

		.then(res => {
			// check the status
			assert.equal(res.status, 200);

			// check the body
			assert.deepEqual(res.body, { id: "foo", value: "bar" });
		});
	});

	it("returns not found if a value does not exist", function() {
		// create an adaptor and server
		var adaptor = new MemAdaptor();
		var server = AdaptorServer(adaptor);

		// pass a fake request
		return server("/value/foo", { method: "GET" })

		.then(res => {
			// check the status
			assert.equal(res.status, 404);
		});
	});

	it("can store a value in the data store", function() {
		// create an adaptor and server
		var adaptor = new MemAdaptor();
		var server = AdaptorServer(adaptor);

		return server("/value/foo", {
			method: "PUT",
			json() {
				return Promise.resolve({
					id: "foo",
					value: "bar"
				});
			}
		})

		.then(res => {
			// check the status
			assert.equal(res.status, 204);

			// check that the value was stored
			return adaptor.get("foo");
		})

		.then(value => {
			assert.deepEqual(value, { id: "foo", value: "bar" });
		});
	});

	it("can delete values from a data store", function() {
		// create an adaptor and server
		var adaptor = new MemAdaptor();
		var server = AdaptorServer(adaptor);

		// set some test values
		adaptor.set({ id: "foo", value: "bar" });

		return server("/value/foo", {
			method: "DELETE",
			headers: {}
		})

		.then(res => {
			// check the status
			assert.equal(res.status, 204);

			// check that the value was deleted
			return adaptor.get("foo");
		})

		.then(value => {
			assert.equal(value, undefined);
		});
	});

	it("can control access to single items", function() {
		// create an adaptor and server
		var adaptor = new MemAdaptor();
		var server = AdaptorServer(adaptor, {
			// block all request for foo
			read(id) {
				return id != "foo";
			}
		});

		// set some test values
		adaptor.set({ id: "foo", value: "Foo" });
		adaptor.set({ id: "bar", value: "Bar" });

		// pass a fake request
		return Promise.all([
			server("/value/foo", { method: "GET" }),
			server("/value/bar", { method: "GET" })
		])

		.then(([foo, bar]) => {
			// check the statuses
			assert.equal(foo.status, 403);
			assert.equal(bar.status, 200);

			// check the body
			assert.deepEqual(bar.body, { id: "bar", value: "Bar" });
		});
	});

	it("can control write access", function() {
		// create an adaptor and server
		var adaptor = new MemAdaptor();
		var server = AdaptorServer(adaptor, {
			write(id) {
				return id !== "foo";
			}
		});

		return server("/value/foo", {
			method: "PUT",
			json() {
				return Promise.resolve({
					id: "foo",
					value: "bar"
				});
			}
		})

		.then(res => {
			// check the status
			assert.equal(res.status, 403);

			// check that the value was stored
			return adaptor.get("foo");
		})

		.then(value => {
			assert.equal(value, undefined);
		});
	});

	it("can control delete access", function() {
		// create an adaptor and server
		var adaptor = new MemAdaptor();
		var server = AdaptorServer(adaptor, {
			write(id) {
				return id !== "foo";
			}
		});

		// set some test values
		adaptor.set({ id: "foo", value: "bar" });

		return server("/value/foo", { method: "DELETE" })

		.then(res => {
			// check the status
			assert.equal(res.status, 403);

			// check that the value was deleted
			return adaptor.get("foo");
		})

		.then(value => {
			assert.deepEqual(value, { id: "foo", value: "bar" });
		});
	});

	it("gives a method not allowed error when an unsupported method is used", function() {
		// create an adaptor and server
		var adaptor = new MemAdaptor();
		var server = AdaptorServer(adaptor);

		return server("/", { method: "HEAD" })

		.then(res => {
			// check the status
			assert.equal(res.status, 405);
		});
	});

	it("can get all the items that the user can access", function() {
		// create an adaptor and server
		var adaptor = new MemAdaptor();
		var server = AdaptorServer(adaptor, {
			read(id) {
				return id == "bar";
			}
		});

		// set some test values
		adaptor.set({ id: "foo", value: "Foo" });
		adaptor.set({ id: "bar", value: "Bar" });
		adaptor.set({ id: "baz", value: "Baz" });

		// pass a fake request
		return server("/", { method: "GET" })

		.then(res => {
			// check the status
			assert.equal(res.status, 200);

			// check the body
			assert.deepEqual(res.body, [
				{ id: "bar", value: "Bar" }
			]);
		});
	});
});
