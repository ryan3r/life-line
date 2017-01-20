/**
 * The central handler for authentication based stuff
 */

var GoogleAuth = require("google-auth-library");
var dataStore = require("./data-store");

// the client id for this app
var CLIENT_ID = "226388429304-m3vsqoc28c927j9c1q6k6umqvemsc7ej.apps.googleusercontent.com";

// create the auth instance
var auth = new GoogleAuth();
var client = new auth.OAuth2(CLIENT_ID, "", "");

// data stores for tracking users
var users = dataStore.store("users");
var sessions = dataStore.store("sessions");

exports.handle = function(url, req) {
	// login with a google account
	if(url == "login") {
		return req.body()

		// verify the login token
		.then(verifyToken)

		// get the user
		.then(login => {
			return users.get(login.id)

			.then(user => {
				// create the user
				if(!user) {
					return users.set(login.id, login);
				}
			})

			.then(() => {
				// generate the session
				var {session, cookie, id} = generateSession(login.id);

				return sessions.set(id, session)

				.then(() => new lifeLine.Response({
					cookie,
					extension: ".json",
					body: JSON.stringify({
						status: "success"
					})
				}));
			});
		})

		// the login failed
		.catch(() => lifeLine.jsend.fail());
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

		return users.get(session.uid);
	});
};

// verify a login token
var verifyToken = function(token) {
	return new Promise((resolve, reject) => {
		client.verifyIdToken(token, CLIENT_ID, function(err, login) {
			// login failed
			if(err) reject(err);

			var payload = login.getPayload();

			// get the important parts
			resolve({
				id: payload.sub,
				icon: payload.picture,
				name: payload.given_name
			});
		});
	});
};

// generate a session token
var generateSession = function(uid) {
	// valid chars for a session token
	var chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
	var id = "";

	// generate the session token
	for(let i = 0; i < 10; ++i) {
		id += chars.charAt(Math.floor(Math.random() * chars.length));
	}

	// generate the cookie
	var cookie = {
		name: "session",
		value: id,
		expires: Date.now() + 10000000000
	};

	// generate the session
	var session = {
		uid
	};

	return {session, cookie, id};
};
