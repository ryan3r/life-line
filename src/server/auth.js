/**
 * The central handler for authentication based stuff
 */

var dataStore = require("./data-store");

// data stores for tracking users
var users = dataStore.store("users");
var sessions = dataStore.store("sessions");

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
					return lifeLine.jsend.fail();
				}

				// verify the password
				// TODO: Hash passwords
				if(user.password != login.password) {
					return lifeLine.jsend.fail();
				}

				// generate the session
				var {session, cookie, id} = generateSession(login.username);

				// save the session
				return sessions.set(id, session)

				// send the cookie and success response
				.then(() => new lifeLine.Response({
					cookie,
					extension: ".json",
					body: JSON.stringify({
						status: "success"
					})
				}));
			});
		});
	}
	// log the current user out
	else if(url == "logout") {
		// send a success response and remove the cookie
		let done = () => new lifeLine.Response({
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
		return sessions.delete(req.cookies.session)

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
				return lifeLine.jsend.fail();
			}

			// get a specific user
			if(req.query.username) {
				// not allowed to view other users
				if(!user.admin) {
					return lifeLine.jsend.fail();
				}

				// get the user
				return users.get(req.query.username)

				.then(viewUser => {
					// no such user
					if(!viewUser) {
						return lifeLine.jsend.fail();
					}

					// remove the password
					delete viewUser.password;

					return lifeLine.jsend.success(viewUser);
				});
			}
			// get the currently logged in user
			else {
				// remove the password
				delete user.password;

				return lifeLine.jsend.success(user);
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
				return lifeLine.jsend.fail({
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
							return lifeLine.jsend.fail({
								msg: "You must enter your old password to change your password"
							});
						}

						// check that the passwords match
						if(body.oldPassword != user.password) {
							return lifeLine.jsend.fail({
								msg: "The old password you supplied is not correct"
							});
						}
					}

					targetUser.password = body.password;
				}

				// make the user an admin or remove admin privilages
				if("admin" in body) {
					// the user must be an admin
					if(!user.admin) {
						return lifeLine.jsend.fail({
							msg: "You must be an admin to change the admin status of a user"
						});
					}

					targetUser.admin = body.admin;
				}

				// save the changes
				return users.set(req.query.username, targetUser)

				// send back a succes response
				.then(() => lifeLine.jsend.success());
			});
		});
	}
	// get a list of all users
	else if(url == "info/users") {
		return exports.getLoggedInUser(req)

		.then(user => {
			// not allowed to access the user list
			if(!user || !user.admin) {
				return lifeLine.jsend.fail();
			}

			// send the user list
			return users.getAll()

			.then(users => lifeLine.jsend.success(users));
		});
	}
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
