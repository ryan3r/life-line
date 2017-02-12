require("../../../src/common/global");
var assert = require("assert");
var Stream = require("../../../src/common/util/stream");

describe("Streams", function() {
	it("supports basic push and recieve", function(done) {
		// create a stream source pair
		var {stream, source} = Stream.create();

		// collect the values emitted by the stream
		var collected = [];

		// push one value through the stream that will no be recieved
		source.push("Before start");

		setTimeout(() => {
			// start listening
			var subscription = stream.on("data", data => collected.push(data));

			// send some data
			source.push("Foo");
			source.push("Bar");

			setTimeout(() => {
				// stop listening
				subscription.unsubscribe();

				// push a value through that will not be recieved
				source.push("After stop");

				setTimeout(() => {
					assert.deepEqual(collected, ["Foo", "Bar"]);

					done();
				});
			});
		});
	});

	it("supports pause and resume callbacks", function(done) {
		// create a stream source pair
		var {stream, source} = Stream.create();

		// collect the values emitted by the stream
		var calls = 0;

		var timer;

		// start sending values
		source.on("resume", () => {
			timer = setInterval(() => source.push(), 5);
		});

		// stop sending values
		source.on("pause", () => {
			clearInterval(timer);
		});

		// the handler for stream callbacks
		var handler = function() {
			// increment the call count
			++calls;

			// unsubscribe after a few values come through to pause the stream
			if(calls % 2 === 0) {
				sub.unsubscribe();

				setTimeout(() => {
					// restart the stream
					if(calls == 2) {
						sub = stream.on("data", handler);
					}
					// check the calls count is correct
					else {
						try {
							assert.equal(calls, 4);

							done();
						}
						catch(err) {
							done(err);
						}
					}
				}, 15);
			}
		};

		// start listening
		var sub = stream.on("data", handler);
	});

	it("streams can be closed", function(done) {
		// create a stream source pair
		var {stream, source} = Stream.create();

		var ended = false, value;

		// confirm the stream is ended
		stream.on("end", () => ended = true);

		// get any value we are given
		stream.on("data", val => value = val);

		// end the stream
		source.end();

		setTimeout(function() {
			// check the results
			assert(ended);
			assert.equal(value, undefined);

			done();
		});
	});

	it("streams can be closed with an extra value", function(done) {
		// create a stream source pair
		var {stream, source} = Stream.create();

		var ended = false, value;

		// confirm the stream is ended
		stream.on("end", () => ended = true);

		// get any value we are given
		stream.on("data", val => value = val);

		// end the stream
		source.end("last value");

		setTimeout(() => {
			// check the results
			assert(ended);
			assert.equal(value, "last value");

			done();
		});
	});

	it("Streams can be transformed with pipe", function(done) {
		// create a stream source pair
		var {stream, source} = Stream.create();

		// print n "Yay!"s for every value passed in
		var stream2 = stream.pipe((data, source) => {
			for(let i = 0; i < data; ++i) {
				source.push("Yay!");
			}
		});

		// collect the transformed values
		var collected = "";

		stream2.on("data", val => collected += val);

		// collect the original values to ensure the source stream is not altered
		var count = 0;

		stream.on("data", num => count += num);

		// push the values 1, 2, and 3 and collected should be 6 "Yay!"s
		source.push(1);
		source.push(2);
		source.push(3);

		setTimeout(() => {
			// check the results
			assert.equal(collected, "Yay!Yay!Yay!Yay!Yay!Yay!");
			assert.equal(count, 6);

			done();
		});
	});

	it("streams can be mapped", function(done) {
		// create a stream source pair
		var {stream, source} = Stream.create();

		// multiply the values by 2
		var stream2 = stream.map(val => val * 2);

		// total the transformed values
		var total = 0;

		stream2.on("data", val => total += val);

		source.push(1);
		source.push(2);
		source.push(3);

		setTimeout(() => {
			// check the results
			assert.equal(total, 12);

			done();
		});
	});

	it("streams can be mapped", function(done) {
		// create a stream source pair
		var {stream, source} = Stream.create();

		// filter even values
		var stream2 = stream.filter(val => val % 2 == 1);

		// total the transformed values
		var total = 0;

		stream2.on("data", val => total += val);

		source.push(1);
		source.push(2);
		source.push(3);

		setTimeout(() => {
			// check the results
			assert.equal(total, 4);

			done();
		});
	});

	it("Create streams from arrays", function(done) {
		var total = 0;

		Stream.from([1, 2, 3])
			.on("data", val => total += val);

		setTimeout(() => {
			assert.equal(total, 6);

			done();
		});
	})

	it("can combine 2 streams", function(done) {
		var total = 0;

		Stream.concat([
			Stream.from([1, 2, 3]),
			Stream.from([4, 5, 6])
		])

		.on("data", val => total += val);

		setTimeout(() => {
			assert.equal(total, 21);

			done();
		});
	});
});
