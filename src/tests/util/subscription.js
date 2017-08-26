import Subscription from "../../util/subscription";
const sinon = require("sinon");

describe("Subscription", function() {
	it("can call the cleanup method once", function() {
		let spy = sinon.spy();
		// create a subscription
		let sub = new Subscription(spy);

		// check the active flag
		expect(sub.active).to.be.ok();

		// remove the subscription
		sub.unsubscribe();
		// unsubscribe should be a no-op now
		sub.unsubscribe();

		// check the active flag
		expect(sub.active).to.not.be.ok();

		// check that the cleanup method was called
		expect(spy.calledOnce).to.be.ok();
	});
});
