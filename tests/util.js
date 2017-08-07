import {Subscription, defer, Events, genId} from "../../js/util";

describe("Util", function() {
	describe("Subscription", function() {
		it("can pass on unsubscribes", function() {
			let called = false;

			// a subscription to test
			const sub = new Subscription(() => called = true);

			sub.unsubscribe();

			// check that the function was called
			expect(called).to.be(true);
		});

		it("only called the unsubscribe function", function() {
			let calls = 0;

			// a subscription to test
			const sub = new Subscription(() => ++calls);

			sub.unsubscribe();
			sub.unsubscribe();

			// check that the function was called
			expect(calls).to.be(1);
		});
	});

	describe("Deferred", function() {
		it("can resolve the attached promise", function() {
			let deferred = defer();

			// resolve the promise
			deferred.resolve();

			// timeout means this failed
			return deferred.promise;
		});

		it("can reject the attached promise", function() {
			let error;
			let deferred = defer();

			// resolve the promise
			deferred.reject(new Error("Gaa"));

			// timeout means this failed
			return deferred.promise
				.catch(err => error = err)
				// check that the error was thrown
				.then(() => expect(error && error.message).to.be("Gaa"));
		});
	});

	describe("Events", function() {
		it("can emit and listen for events", function() {
			let recieved = false;
			let events = new Events();

			// listen to events
			events.on("event", () => recieved = true);

			// trigger an event
			events.emit("event");

			// check that the event has been recieved
			expect(recieved).to.be(true);
		});

		it("can emit events of specific types", function() {
			let recieved = 0;
			let events = new Events();

			// listen to events
			events.on("event", () => ++recieved);

			// trigger an event
			events.emit("event");

			// make sure events don't cross
			events.emit("other");

			// check that the event has been recieved
			expect(recieved).to.be(1);
		});

		it("can unsubscribe from events", function() {
			let recieved = 0;
			let events = new Events();

			// listen to events
			const sub = events.on("event", () => ++recieved);

			// trigger an event
			events.emit("event");

			// remove the subscription
			sub.unsubscribe();

			// this should not be recieved
			events.emit("event");

			// check that the event has been recieved
			expect(recieved).to.be(1);
		});

		it("can pass parameters to events", function() {
			let recieved;
			let events = new Events();

			// listen to events
			const sub = events.on("event", (foo, bar) => recieved = [foo, bar]);

			// trigger an event
			events.emit("event", "foo", "bar");

			// check that the event has been recieved
			expect(recieved).to.eql(["foo", "bar"]);
		});
	})
});
