import Store from "../../stores/store";
const sinon = require("sinon");

describe("Store", function() {
	it("can store state and emit changes", function() {
		let spy = sinon.spy();

		// create a store
		let store = new Store("foo", 1);

		// check the value
		expect(store.value).to.be(1);

		// add a change listener
		store.onStateChange(spy);

		// check that the spy was called
		expect(spy.calledOnce).to.be.ok();

		// update the state
		store.set(2);

		// check that the value changed
		expect(store.value).to.be(2);

		// check that the listener was called again
		expect(spy.calledTwice).to.be.ok();
	});

	it("can bind to components", function() {
		let spy = sinon.spy();

		// create a store
		let store = new Store("foo", 1);

		// simulate a component
		let component = {
			setState: spy,
			addSub: () => {},
			state: {}
		};

		// bind the store
		store.bind(component);

		// check the we set the state correctly
		expect(component.state.foo).to.be(1);

		// update the state
		store.set(2);

		// check that the state was updated correctly
		expect(spy.calledWith({ foo: 2 })).to.be.ok();
	});
});
