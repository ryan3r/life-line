import Events from "../../util/events";
const sinon = require("sinon");

describe("Events", function() {
	it("can emit events", function() {
		let evt = new Events();

		// define an event
		evt.defineEvent("Foo");

		let spy = sinon.spy();

		// listen to the event
		evt.onFoo(spy);

		// emit the event
		evt.emit("Foo");

		expect(spy.calledOnce).to.be.ok();
	});

	it("stops emiting events after unsubscribe is called", function() {
		let evt = new Events();

		// define an event
		evt.defineEvent("Foo");

		let spy = sinon.spy();

		// listen to the event
		evt.onFoo(spy).unsubscribe();

		// emit the event
		evt.emit("Foo");

		expect(spy.called).to.not.be.ok();
	});
});
