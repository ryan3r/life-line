/**
 * A basic stream implementaion designed to allow easy transformation of
 * streams of values
 */

var createStream = module.exports = function() {
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
	push(value) {
		// send the value to the consumer
		this._stream.emit("data", value);
	}

	end(value) {
		// if a final value was given send it to the consumer
		if(value) this.push(value);

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
}
