require("../../../src/common/global");
var assert = require("assert");
var MemAdaptor = require("../../../src/common/data-stores/mem-adaptor");
var PoolStore = require("../../../src/common/data-stores/pool-store");

describe("Pool store", function() {
	it("objects can be queried by any property", function(done) {
		// create an adpator and store for testing
		var pool = new PoolStore(new MemAdaptor());

		// fill the adaptor
		pool.set({ id: "foo", name: "Foo", type: "a" });
		pool.set({ id: "bar", name: "Bar", type: "b" });
		pool.set({ id: "baz", name: "Baz", type: "a" });

		// query all type a elements
		pool.query({ type: "a" })

		.then(collection => {
			assert.deepEqual(collection, [
				{ id: "foo", name: "Foo", type: "a" },
				{ id: "baz", name: "Baz", type: "a" }
			]);

			done();
		})

		.catch(err => done(err));
	});

	it("querys can also be updated when values change", function() {
		// create an adpator and store for testing
		var pool = new PoolStore(new MemAdaptor());

		// fill the pool
		pool.set({ id: "foo", name: "Foo", type: "a" });

		// collect values that match
		var collection = [];

		// query all type a elements
		pool.query({ type: "a" }, { watch: true }, r => collection.push(r));

		// change a value that matches the query
		pool.set({ id: "baz", name: "Baz", type: "a" });

		// change the value so it doesn't match
		pool.set({ id: "baz", name: "Baz", type: "b" });

		// remove the other value
		pool.remove("foo");

		setTimeout(() => {
			assert.deepEqual(collection, [
				{ type: "change", id: "baz", value: { id: "baz", name: "Baz", type: "a" } },
				{ type: "change", id: "baz", value: { id: "baz", name: "Baz", type: "a" } },
				{ type: "unmatch", id: "baz" },
				{ type: "remove", id: "foo" },
				{ type: "change", id: "foo", value: { id: "foo", name: "Foo", type: "a" } },
			]);
		});
	});
});
