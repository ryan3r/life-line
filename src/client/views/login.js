/**
 * Show a login button to the user
 */

lifeLine.nav.register({
	matcher: "/login",

	make({setTitle, content}) {
		// set the page title
		setTitle("Login");

		// the users credentials
		var auth = {};

		// create the login form
		var {username, password, msg} = lifeLine.makeDom({
			parent: content,
			tag: "form",
			classes: "content-padded",
			children: [
				{
					classes: "editor-row",
					children: [
						{
							widget: "input",
							bind: auth,
							prop: "username",
							placeholder: "Username"
						}
					]
				},
				{
					classes: "editor-row",
					children: [
						{
							widget: "input",
							bind: auth,
							prop: "password",
							type: "password",
							placeholder: "Password"
						}
					]
				},
				{
					tag: "button",
					text: "Login",
					classes: "fancy-button",
					attrs: {
						type: "submit"
					}
				},
				{
					classes: "error-msg",
					name: "msg"
				}
			],
			on: {
				submit: e => {
					e.preventDefault();

					// send the login request
					fetch("/api/auth/login", {
						method: "POST",
						credentials: "include",
						body: JSON.stringify(auth)
					})

					// parse the json
					.then(res => res.json())

					// process the response
					.then(res => {
						// login suceeded go home
						if(res.status == "success") {
							lifeLine.nav.navigate("/");

							// sync now that we are logged in
							if(lifeLine.sync) {
								lifeLine.sync();
							}

							return;
						}

						// login failed
						if(res.status == "fail") {
							errorMsg("Login failed");
						}
					});
				}
			}
		});

		// display an error message
		var errorMsg = function(text) {
			msg.innerText = text;
		};
	}
});

// logout
lifeLine.logout = function() {
	// send the logout request
	fetch("/api/auth/logout", {
		credentials: "include"
	})

	// go to the login page
	.then(() => lifeLine.nav.navigate("/login"));
};
