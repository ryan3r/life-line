/**
 * The central handler for authentication based stuff
 */

var passwordLib = require("password-hash-and-salt");
var {users, sessions} = require("./data-stores");
var Response = require("./response");
var jsend = require("./jsend");

// the amount of time a session should live for (1 month)
const SESSION_LIFETIME = 30 * 24 * 60 * 60 * 1000;

exports.handle = function(url, req) {
	// login with a google account
	if(url == "login") {
		return req.json()

		// get the user
		.then(login => {
			return users.get(login.username)

			.then(user => {
				// no such user
				if(!user) {
					return jsend.fail();
				}

				// verify the password
				return verifyPassword(login.password, user.password)

				.then(valid => {
					// invalid password
					if(!valid) {
						return jsend.fail();
					}

					// generate the session
					var {session, cookie, id} = generateSession(login.username);

					// save the session
					return sessions.set(id, session)

					// send the cookie and success response
					.then(() => new Response({
						cookie,
						extension: ".json",
						body: JSON.stringify({
							status: "success"
						})
					}));
				})
			});
		});
	}
	// log the current user out
	else if(url == "logout") {
		// send a success response and remove the cookie
		let done = () => new Response({
			cookie: {
				name: "session",
				value: "",
				expres: 0
			},
			extension: ".json",
			body: JSON.stringify({ status: "success" })
		});

		// not logged in
		if(!req.cookies.session) {
			return done();
		}

		// remove the session
		return sessions.set(req.cookies.session, undefined)

		// catch session not defined
		.catch(() => {})

		// send the success response
		.then(() => done());
	}
	// get the signed in user for this session
	else if(url == "info/get") {
		return exports.getLoggedInUser(req)

		.then(user => {
			// no user/session
			if(!user) {
				return jsend.fail();
			}

			// get a specific user
			if(req.query.username) {
				// not allowed to view other users
				if(!user.admin) {
					return jsend.fail();
				}

				// get the user
				return users.get(req.query.username)

				.then(viewUser => {
					// no such user
					if(!viewUser) {
						return jsend.fail();
					}

					// remove the password
					delete viewUser.password;

					return jsend.success(viewUser);
				});
			}
			// get the currently logged in user
			else {
				// remove the password
				delete user.password;

				return jsend.success(user);
			}
		});
	}
	// update the users info
	else if(url == "info/set") {
		return Promise.all([
			exports.getLoggedInUser(req),
			req.json()
		])

		.then(([user, body]) => {
			// not allowed to change this user
			if(!user || (user.username != req.query.username && !user.admin)) {
				return jsend.fail({
					msg: "You do not have access to this user"
				});
			}

			var userPromise;

			// no need to fetch the user
			if(user.username == req.query.username) {
				userPromise = Promise.resolve(user);
			}
			// load the user we want to edit
			else {
				userPromise = users.get(req.query.username);
			}

			return userPromise.then(targetUser => {
				var response = Promise.resolve();

				// if the user did not already exist create them
				if(!targetUser) {
					targetUser = { username: req.query.username };
				}

				// set the password
				if(body.password) {
					// the old password must be supplied if the user is not an admin
					// changing another users password
					if(!user.admin || user.username == req.query.username) {
						// the old password must be supplied
						if(!body.oldPassword) {
							return jsend.fail({
								msg: "You must enter your old password to change your password"
							});
						}

						// check that the passwords match
						response = verifyPassword(body.oldPassword, user.password)

						.then(valid => {
							// not authenticated
							if(!valid) {
								return jsend.fail({
									msg: "The old password you supplied is not correct"
								});
							}
						});
					}

					response = response.then(res => {
						// login failed
						if(res) return res;

						return new Promise((resolve, reject) => {
							// hash the password
							passwordLib(body.password)

							.hash((err, hash) => {
								if(err) return reject(err);

								// update the password
								targetUser.password = hash;

								resolve();
							});
						});
					});
				}

				// make the user an admin or remove admin privilages
				if("admin" in body) {
					// the user must be an admin
					if(!user.admin) {
						return jsend.fail({
							msg: "You must be an admin to change the admin status of a user"
						});
					}

					targetUser.admin = body.admin;
				}

				// save the changes
				var save = () =>
					users.set(req.query.username, targetUser)

					// send back a succes response
					.then(() => jsend.success());

				// wait for the password to be checked and changed before saving
				return response.then(res => res || save());
			});
		});
	}
	// get a list of all users
	else if(url == "info/users") {
		return exports.getLoggedInUser(req)

		.then(user => {
			// not allowed to access the user list
			if(!user || !user.admin) {
				return jsend.fail();
			}

			// send the user list
			return users.getAll()

			.then(users => jsend.success(users));
		});
	}
};

// wrap verify password
var verifyPassword = function(password, hash) {
	return new Promise((resolve, reject) => {
		// verify the password
	passwordLib(password)

		.verifyAgainst(hash, (err, valid) => {
			// an error occured
			if(err) return reject(err);

			resolve(valid);
		});
	});
};

// check if a user is logged in
exports.getLoggedInUser = function(req) {
	// no cookie no user
	if(!req.cookies.session) return Promise.resolve();

	return sessions.get(req.cookies.session)

	.then(session => {
		// no session matching the sessionId
		if(!session) return;

		return users.get(session.username);
	});
};

// generate a session token
var generateSession = function(username) {
	// valid chars for a session token
	var chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
	var id = "";

	// generate the session token
	for(let i = 0; i < 10; ++i) {
		id += chars.charAt(Math.floor(Math.random() * chars.length));
	}

	// generate the end date
	var endDate = new Date(Date.now() + SESSION_LIFETIME);

	// generate the cookie
	var cookie = {
		name: "session",
		value: id,
		expires: endDate.toUTCString()
	};

	// generate the session
	var session = {
		username
	};

	return {session, cookie, id};
};
