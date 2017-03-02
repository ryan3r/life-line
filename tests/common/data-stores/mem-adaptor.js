var assert = require("assert");
var MemAdaptor = require("../../../src/common/data-stores/mem-adaptor");

describe("In memory adaptor", function() {
	it("Returns undefined if there is no value", function() {
		var memAdaptor = new MemAdaptor();

		// retreve the value
		return memAdaptor.get("not-defined")

		.then(result => {
			assert.equal(result, undefined);
		});
	});

	it("Values can be stored and retreved", function() {
		var memAdaptor = new MemAdaptor();

		// store the value
		var promise = memAdaptor.set({
			id: "foo",
			value: "Yay!"
		});

		// make sure set is returing a promise
		assert(promise instanceof Promise);

		// retreve the value
		return memAdaptor.get("foo")

		.then(result => {
			assert.deepEqual(result, {
				id: "foo",
				value: "Yay!"
			});
		});
	});
});
