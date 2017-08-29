import defer from "../../util/deferred";

describe("Deferred", function() {
	it("can be resolved", function() {
		let deferred  = defer();

		// resolve the deferred
		deferred.resolve("Foo");

		// check the value
		return deferred.promise.then(value => {
			expect(value).to.be("Foo");
		})
	});

	it("can be rejected", function() {
		let deferred  = defer();

		// resolve the deferred
		deferred.reject("Foo");

		// check the value
		return deferred.promise.catch(value => {
			expect(value).to.be("Foo");
		})
	});
});
