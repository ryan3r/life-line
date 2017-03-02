var assert = require("assert");
var MemAdaptor = require("../../../src/common/data-stores/mem-adaptor");
var KeyValueStore = require("../../../src/common/data-stores/key-value-store");

describe("Key value store", function() {
	it("can get a value", function() {
		// create an adaptor
		var adaptor = new MemAdaptor();

		// put a value in it
		adaptor.set({ id: "Foo", value: "Bar" });

		// create a store using the adaptor
		var store = new KeyValueStore(adaptor);

		// get the value
		return store.get("Foo")

		.then(value => {
			// check the value
			assert.equal(value, "Bar");
		});
	});

	it("gives the default value if no value is defined", function() {
		// create the empty store and adaptor;
		var store = new KeyValueStore(new MemAdaptor());

		// get the default value
		return store.get("Foo", "Bar")

		.then(value => {
			assert.equal(value, "Bar");
		});
	});

	it("can override values", function() {
		// create an adaptor
		var adaptor = new MemAdaptor();

		// put a value in it
		adaptor.set({ id: "Foo", value: "Bar" });

		// create a store using the adaptor
		var store = new KeyValueStore(adaptor);

		// put in overrides for Foo
		store.setOverrides({
			Foo : "Baz"
		});

		// get the value
		return store.get("Foo")

		.then(value => {
			// check the value
			assert.equal(value, "Baz");
		});
	});

	it("can store values", function() {
		// create the empty store and adaptor
		var adaptor = new MemAdaptor();
		var store = new KeyValueStore(adaptor);

		// store the value
		store.set("Foo", "Bar");

		// check the value
		return adaptor.get("Foo")

		.then(value => {
			// remove the modified date
			delete value.modified;

			assert.deepEqual(value, {
				id: "Foo",
				value: "Bar"
			});
		});
	});

	it("can store values (object form)", function() {
		// create the empty store and adaptor
		var adaptor = new MemAdaptor();
		var store = new KeyValueStore(adaptor);

		// store the value
		store.set({ Foo: "Bar" });

		// check the value
		return adaptor.get("Foo")

		.then(value => {
			// remove the modified date
			delete value.modified;

			assert.deepEqual(value, {
				id: "Foo",
				value: "Bar"
			});
		});
	});

	it("can watch changes in the store", function() {
		// create the store and adaptor
		var store = new KeyValueStore(new MemAdaptor());

		// collect all vaules that come through the watcher
		var changes = [];

		// watch for changes to the "real" key
		var subscription = store.watch("real", change => changes.push(change));

		// trigger some changes
		store.set("real", "Ok");
		store.set("real", "Ok");

		// change another property (should not trigger a change)
		store.set("other", "Other property");

		// stop listening
		subscription.unsubscribe();

		// change the real value this should not cause any changes
		store.set("real", "Unsubscribed");

		assert.deepEqual(changes, ["Ok", "Ok"]);
	});
});
