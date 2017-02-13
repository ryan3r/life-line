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
		var typeA = pool.query({ type: "a" });

		// turn the stream into an array
		var collection = [];

		typeA.on("data", value => collection.push(value.name));

		setTimeout(() => {
			assert.deepEqual(collection, ["Foo", "Baz"]);

			done();
		});
	});

	it("querys can also be updated when values change", function(done) {
		// create an adpator and store for testing
		var pool = new PoolStore(new MemAdaptor());

		// fill the pool
		pool.set({ id: "foo", name: "Foo", type: "a" });

		// query all type a elements
		var typeA = pool.query({ type: "a" }, { watch: true });

		// turn the stream into an array
		var collection = [];

		typeA.on("data", value => collection.push(value.name));

		setTimeout(() => {
			// change a value that matches the query
			pool.set({ id: "baz", name: "Baz", type: "a" });

			setTimeout(() => {
				assert.deepEqual(collection, ["Foo", "Baz"]);

				done();
			});
		});
	});
});
