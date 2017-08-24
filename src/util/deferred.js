// create a deferred promise
export default function defer() {
	let status = "pending", value;

	let deferred = {};

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
