/**
 * Show a login button to the user
 */

const G_AUTH_SRC = "https://apis.google.com/js/platform.js";

var apiReady, noLogin;

// show the signin button
lifeLine.login = function() {
	// load the script
	loadGAuth();

	// show the button
	document.querySelector(".flyover").classList.remove("hidden");
	document.querySelector(".shade").classList.remove("hidden");
};

// handle the login
window.glogin = function(user) {
	// the signin api is ready
	if(apiReady) {
		apiReady();
	}

	// we are just going to logout
	if(noLogin) {
		noLogin = false;
		return;
	}

	// send the token back to be authenticated
	fetch("/api/auth/login", {
		method: "post",
		body: user.getAuthResponse().id_token,
		credentials: "include"
	})

	// go home when we are done
	.then(() => {
		// hide the signin button
		document.querySelector(".flyover").classList.add("hidden");
		document.querySelector(".shade").classList.add("hidden");

		// refresh the current view
		lifeLine.nav.navigate(location.pathname);
	});
};

// logout
lifeLine.logout = function() {
	// don't send a login request when the button loads
	noLogin = true;

	loadGAuth()

	.then(() => {
		return Promise.all([
			// sign out of google
			gapi.auth2.getAuthInstance().signOut(),

			// logout of the server
			fetch("/api/auth/logout", {
				credentials: "include"
			})
		])
	})

	.then(() => {
		// clear the login lock
		noLogin = false;

		// show the login dialog
		lifeLine.login();
	});
};

// load the authentication script
var loadGAuth = function() {
	// check if the script has already been loaded
	if(document.querySelector(`script[src="${G_AUTH_SRC}"]`)) {
		return Promise.resolve();
	}

	// load the script
	var script = document.createElement("script");
	script.src = G_AUTH_SRC;
	document.head.appendChild(script);

	// return a promise for when the api is ready
	return new Promise(resolve => apiReady = resolve);
};
