const sinon = require("sinon");
import Disposable from "../../util/disposable";

describe("Disposable", function() {
	it("can collect and remove subscriptions", function() {
		let spy = sinon.spy();
		let disposable = new Disposable();

		// add the subscription
		disposable.add({
			unsubscribe: spy
		});

		// remove it
		disposable.dispose();

		expect(spy.calledOnce).to.be.ok();
	});
});
