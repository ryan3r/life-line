/**
 * Serve an adaptor over http
 */

module.exports = function(adaptor, permissor = {}) {
	return function(url, req) {
		// get all the values in the adaptor
		if(req.method == "GET" && url == "/") {
			return adaptor.getAll()

			.then(values => {
				// no access restrictions
				if(!permissor.read) {
					return values;
				}

				// if we have a read restriction check that
				return Promise.all(
					// check if the values accessable
					values.map(value => permissor.read(value.id, req))
				)

				.then(allows => {
					// filter out items this user does not have access to
					return values.filter((value, i) => allows[i]);
				});
			})

			.then(values => {
				// create the response
				return new lifeLine.Response({
					body: values
				});
			});
		}
		// get a single value
		else if(req.method == "GET") {
			// extract the key from the url
			var key = url.substr(1);

			var allow = Promise.resolve(true);

			// check authentication
			if(permissor.read) {
				allow = Promise.resolve(permissor.read(key, req));
			}

			return allow.then(allowed => {
				// not given access
				if(!allowed) {
					return new lifeLine.Response({
						status: 403,
						body: "You do not have premission to access " + key
					});
				}

				// send the value
				return adaptor.get(key)

				.then(value => {
					// send the value
					if(value) {
						return new lifeLine.Response({
							body: value
						});
					}
					// no such value :(
					else {
						return new lifeLine.Response({
							status: 404,
							body: "Value " + key + " could not be found"
						});
					}
				});
			});
		}
		// store a value
		else if(req.method == "PUT") {
			// extract the key from the url
			var key = url.substr(1);

			var allow = Promise.resolve(true);

			// check authentication
			if(permissor.write) {
				allow = Promise.resolve(permissor.write(key, req));
			}

			return allow.then(allowed => {
				// not given access
				if(!allowed) {
					return new lifeLine.Response({
						status: 403,
						body: "You do not have premission to write to " + key
					});
				}

				// parse the body
				return req.json()

				// store the value
				.then(value => adaptor.set(value))

				// send the success response
				.then(() => {
					return new lifeLine.Response({
						status: 204
					});
				});
			});
		}
		// delete a value
		else if(req.method == "DELETE") {
			// extract the key from the url
			var key = url.substr(1);

			var allow = Promise.resolve(true);

			// check authentication
			if(permissor.write) {
				allow = Promise.resolve(permissor.write(key, req));
			}

			return allow.then(allowed => {
				// not given access
				if(!allowed) {
					return new lifeLine.Response({
						status: 403,
						body: "You do not have premission to delete " + key
					});
				}

				return adaptor.remove(key)

				// send the success response
				.then(() => {
					return new lifeLine.Response({
						status: 204
					});
				});
			});
		}
		// method not supported
		else {
			return Promise.resolve(
				new lifeLine.Response({
					status: 405
				})
			);
		}
	};
};
