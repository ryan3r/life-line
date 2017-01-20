/**
 * Show a login button to the user
 */

lifeLine.nav.register({
	matcher: "/login",

	make({setTitle, content}) {
		// set the page title
		setTitle("Login");

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
							tag: "input",
							name: "username",
							classes: "input-fill",
							attrs: {
								placeholder: "Username",
							}
						}
					]
				},
				{
					classes: "editor-row",
					children: [
						{
							tag: "input",
							name: "password",
							classes: "input-fill",
							attrs: {
								type: "password",
								placeholder: "Password"
							}
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
						body: JSON.stringify({
							username: username.value,
							password: password.value
						})
					})

					// parse the json
					.then(res => res.json())

					// process the response
					.then(res => {
						// login suceeded go home
						if(res.status == "success") {
							lifeLine.nav.navigate("/");
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
