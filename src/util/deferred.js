// create a deferred promise
export default function defer() {
	let status = "pending", value;

	// in case the user calls resolve/reject before the promise method is ready
	let deferred = {
		resolve: val => {
			status = "resolved";
			value = val;
		},

		reject: err => {
			status = "rejected";
			value = err;
		}
	};

	deferred.promise = new Promise((resolve, reject) => {
		// not handled yet
		if(status == "pending") {
			deferred.resolve = resolve;
			deferred.reject = reject;
		}
		// already resolved
		else if(status == "resolved") {
			resolve(value);
		}
		// aleady rejected
		else if(status == "rejected") {
			reject(value)
		}
	});

	return deferred;
}
