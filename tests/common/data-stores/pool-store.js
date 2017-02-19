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
			// remove modified dates
			for(let value of collection) {
				delete value.modified;
			}

			assert.deepEqual(collection, [
				{ id: "foo", name: "Foo", type: "a" },
				{ id: "baz", name: "Baz", type: "a" }
			]);

			done();
		})

		.catch(err => done(err));
	});

	it("querys can also be updated when values change", function(done) {
		// create an adpator and store for testing
		var pool = new PoolStore(new MemAdaptor());

		// fill the pool
		pool.set({ id: "foo", name: "Foo", type: "a" });

		// collect values that match
		var collection = [];

		// query all type a elements
		pool.query({ type: "a" }, { watch: true }, r => collection.push(r));

		setTimeout(() => {
			// change a value that matches the query
			pool.set({ id: "baz", name: "Baz", type: "a" });

			// change the value so it doesn't match
			pool.set({ id: "baz", name: "Baz", type: "b" });

			// remove the other value
			pool.remove("foo");

			// remove modified dates
			for(let change of collection) {
				if(change.value) {
					delete change.value.modified;
				}
			}

			assert.deepEqual(collection, [
				{ type: "change", id: "foo", value: { id: "foo", name: "Foo", type: "a" } },
				{ type: "change", id: "baz", value: { id: "baz", name: "Baz", type: "a" } },
				{ type: "unmatch", id: "baz" },
				{ type: "remove", id: "foo" }
			]);

			done();
		});
	});

	it("queries can be passed functions to test their values against", function() {
		// create an adpator and store for testing
		var pool = new PoolStore(new MemAdaptor());

		// fill the adaptor
		pool.set({ id: "foo", name: "Foo", value: 1 });
		pool.set({ id: "bar", name: "Bar", value: 2 });
		pool.set({ id: "baz", name: "Baz", value: 3 });

		// query all type a elements
		return pool.query({ value: val => val > 1 })

		.then(collection => {
			// remove modified dates
			for(let value of collection) {
				delete value.modified;
			}

			assert.deepEqual(collection, [
				{ id: "bar", name: "Bar", value: 2 },
				{ id: "baz", name: "Baz", value: 3 }
			]);
		});
	});
});
