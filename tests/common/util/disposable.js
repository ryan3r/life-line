var Disposable = require("../../../src/common/util/disposable");
var EventEmitter = require("../../../src/common/util/event-emitter");
var assert = require("assert");

describe("Disposable", function() {
	it("can collect subscriptions and remove the together", function() {
		// count how many subscription have been unsubscribed
		var ref = { count: 0 };
		// create the disposable
		var disp = new Disposable();

		// add some subscriptions
		disp.add(createSub(ref));
		disp.add(createSub(ref));
		disp.add(createSub(ref));

		// dispose the subscriptions
		disp.dispose();

		// dispose again to check that disposables only trigger once
		disp.dispose();

		assert.equal(ref.count, 3);
	});

	it("can be disposed by an event", function() {
		// count how many subscription have been unsubscribed
		var ref = { count: 0 };
		// create the disposable
		var disp = new Disposable();
		// create an event emitter to watch
		var emitter = new EventEmitter();

		// add some subscriptions
		disp.add(createSub(ref));
		disp.add(createSub(ref));
		disp.add(createSub(ref));

		// dispose the subscriptions
		disp.disposeOn(emitter, "dispose");

		// trigger the disposable
		emitter.emit("dispose");

		assert.equal(ref.count, 3);

		// check the dispose listener was removed
		assert.equal(emitter._listeners.dispose.length, 0);
	});
});

// helper to create a subscription that increments a counter when it is removed
var createSub = function(ref) {
	return {
		unsubscribe() {
			++ref.count;
		}
	};
};
