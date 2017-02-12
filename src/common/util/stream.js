/**
 * A basic stream implementaion designed to allow easy transformation of
 * streams of values
 */

var createStream = exports.create = function() {
	// create a stream and Source
	var stream = new Stream();
	var source = new Source();

	// link the now
	stream._source = source;
	source._stream = stream;

	return {stream, source};
};

// the source half is used by the producer to send values
class Source extends lifeLine.EventEmitter {
	constructor() {
		super();
		this._ready = Promise.resolve();
	}

	push(value) {
		// make sure any previously written promises are send before this one
		this._ready = this._ready.then(() => value)
			// send the value to the consumer
			.then(value => this._stream.emit("data", value));
	}

	end(value) {
		// if a final value was given send it to the consumer
		if(value) this.push(value);

		this._ready.then(() => {
			// tell the consumer the stream is done
			this._stream.emit("end");

			// remove the streams refrence to us
			this._stream.source = undefined;
			// remove all event listeners from the stream
			this._stream._listeners = undefined;
			// remove our refrence to the stream
			this._stream = undefined;
			// remove all event listeners
			this._listeners = undefined;
		});
	}
}

// the stream half is used by consumers to observe and mutate the values
class Stream extends lifeLine.EventEmitter {
	constructor() {
		super();

		// track the number of consumers listening
		this._refrences = 0;
	}

	on(name, fn) {
		// add the event listener
		var subscription = super.on(name, fn);

		// if the event isn't data don't do anything special
		if(name != "data") return subscription;

		// up the refrence count now that we have a listener
		++this._refrences;

		// since we now have listeners tell the source to start sending data
		if(this._refrences == 1) {
			this._source.emit("resume");
		}

		var unsubscribed = false;

		return {
			unsubscribe: () => {
				// don't unsubscribe twice
				if(unsubscribed) return;

				unsubscribed = true;

				// lower the refrence count now that we don't have a listener
				--this._refrences;

				// tell the source to stop sending data now that we have no listeners
				if(this._refrences === 0) {
					this._source.emit("pause");
				}

				// remove the underlying listener
				subscription.unsubscribe();
			}
		};
	}

	/**
	 * Pass a call back which is given the source to the new stream and a value
	 * from this stream
	 */
	pipe(transformer) {
		var {source, stream} = createStream();
		var subscription;

		// when the transformed stream has listeners listen to the source stream
		source.on("resume", () => {
			subscription = this.on("data", value => transformer(value, source));
		});

		// when the transformed stream has no listeners stop listening to the source stream
		source.on("pause", () => {
			subscription.unsubscribe();
		});

		return stream;
	}

	/**
	 * Transform individual values in a stream
	 */
	map(transformer) {
		return this.pipe((value, source) => {
			// run all the values through the transformer
			source.push(transformer(value));
		});
	}

	/**
	 * Filter out individual values in a stream
	 */
	filter(filter) {
		return this.pipe((value, source) => {
			// check all values with the filter
			if(filter(value)) {
				source.push(value);
			}
		});
	}
}

// create a stream from an array
exports.from = function(array) {
	var {stream, source} = createStream();

	source.on("resume", () => {
		// push the values through the stream
		array.forEach(value => source.push(value));

		// end the stream
		source.end();
	});

	return stream;
};

// combine the values of two or more streams the values
exports.concat = function(streams) {
	var {stream, source} = createStream();
	var index = -1;

	// save subscriptions for the pause/resume events
	var pauseSub, resumeSub;

	// start sending a stream
	var sendStream = () => {
		// remove any existing subscriptions
		if(pauseSub) pauseSub.unsubscribe();
		if(resumeSub) resumeSub.unsubscribe();

		// the last stream has been passed on
		if(++index >= streams.length) {
			// end the combined stream
			source.end();

			return;
		}

		var dataSub;
		var stream = streams[index];

		// pass the values on to the combined stream
		var resume = () => dataSub = stream.on("data", data => source.push(data));

		// when this stream is done move on to the next one
		stream.on("end", () => sendStream());

		// pause and resume with the combined stream
		pauseSub = source.on("pause", () => dataSub.unsubscribe());
		resumeSub = source.on("resume", resume);

		// start the stream
		resume();
	};

	// start the stream when our source starts
	resumeSub = source.on("resume", () => sendStream());

	return stream;
};
