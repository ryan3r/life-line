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

	it("can emit events to multiple listeners", function() {
		let evt = new Events();

		// define an event
		evt.defineEvent("Foo");

		let [spy1, spy2] = [sinon.spy(), sinon.spy()];

		// listen to the event
		evt.onFoo(spy1);
		evt.onFoo(spy2);

		// emit the event
		evt.emit("Foo");

		expect(spy1.called).to.be.ok();
		expect(spy2.called).to.be.ok();
	});

	it("can unsubscribe only one listener", function() {
		let evt = new Events();

		// define an event
		evt.defineEvent("Foo");

		let [spy1, spy2] = [sinon.spy(), sinon.spy()];

		// listen to the event
		evt.onFoo(spy1).unsubscribe();
		evt.onFoo(spy2);

		// emit the event
		evt.emit("Foo");

		expect(spy1.called).to.not.be.ok();
		expect(spy2.called).to.be.ok();
	});

	it("can initialize a listener with a property", function() {
		let evt = new Events();

		// define an event
		evt.defineEvent("Foo", "foo");

		evt.foo = "Yay!";

		let spy = sinon.spy();

		// listen to the event
		evt.onFoo(spy);

		expect(spy.calledWith("Yay!")).to.be.ok();

		// emit the event
		evt.emit("Foo");

		expect(spy.calledWith("Yay!")).to.be.ok();
	});

	it("the init property can be a Promise", function() {
		let evt = new Events();

		// define an event
		evt.defineEvent("Foo", "foo");

		evt.foo = Promise.resolve("Yay!");

		let spy = sinon.spy();

		// listen to the event
		evt.onFoo(spy);

		return evt.foo.then(() => {
			expect(spy.calledWith("Yay!")).to.be.ok();
		});
	});

	it("the user won't get a value if they unsubscribe before the promise resolves",
	function() {
		let evt = new Events();

		// define an event
		evt.defineEvent("Foo", "foo");

		// wait before resolving the promise
		evt.foo = new Promise(r => setTimeout(r, 1));

		let spy = sinon.spy();

		// listen to the event
		evt.onFoo(spy).unsubscribe();

		expect(spy.called).to.not.be.ok();

		return evt.foo;
	});

	it("init value can be dynamic", function() {
		let evt = new Events();

		// define an event
		evt.defineEvent("Foo", () => "Yay!");

		let spy = sinon.spy();

		// listen to the event
		evt.onFoo(spy);

		expect(spy.calledWith("Yay!")).to.be.ok();
	});

	it("can check if there are any listeners for an event", function() {
		let evt = new Events();

		// define an event
		evt.defineEvent("Foo");

		// check for listeners (none found)
		expect(evt.hasListeners("Foo")).to.not.be.ok();

		// add a listener
		evt.onFoo(() => {});

		// check for listeners (one found)
		expect(evt.hasListeners("Foo")).to.be.ok();
	});
});
