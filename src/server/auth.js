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
