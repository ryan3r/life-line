/**
 * A view for accessing/modifying information about the current user
 */

lifeLine.nav.register({
	matcher: /^(?:\/user\/(.+?)|\/account)$/,

	make({setTitle, content, match}) {
		setTitle("Account");

		var url = "/api/auth/info/get";

		// add the username if one is given
		if(match[1]) url += `?username=${match[1]}`;

		// load the user data
		fetch(url, { credentials: "include" })

		.then(res => res.json())

		.then(res => {
			// no such user or access is denied
			if(res.status == "fail") {
				lifeLine.makeDom({
					parent: content,
					classes: "content-padded",
					text: "Could not access the user you were looking for"
				});

				return;
			}

			var user = res.data;

			// generate the page
			var children = [];

			children.push({
				tag: "h2",
				text: user.username
			});

			// display the admin status of another user
			if(match[1]) {
				children.push({
					text: `${user.username} is ${user.admin ? "" : "not"} an admin`
				});
			}
			// display the admin status of this user
			else {
				children.push({
					text: `You are ${user.admin ? "" : "not"} an admin`
				});

				// add a link at a list of all users
				if(user.admin) {
					children.push({ tag: "br" });

					children.push({
						widget: "link",
						href: "/users",
						text: "View all users"
					});
				}
			}

			children.push({
				tag: "form",
				children: [
					{
						classes: "editor-row",
						children: [
							{
								tag: "input",
								classes: "input-fill",
								attrs: {
									type: "password",
									placeholder: "Old password"
								},
								name: "oldPassword"
							},
							{
								tag: "input",
								classes: "input-fill",
								attrs: {
									type: "password",
									placeholder: "New password"
								},
								name: "password"
							}
						]
					},
					{
						tag: "button",
						classes: "fancy-button",
						text: "Change password",
						attrs: {
							type: "submit"
						}
					},
					{
						name: "msg"
					}
				],
				on: {
					// change the password
					submit: e => {
						e.preventDefault();

						// no password supplied
						if(!password.value) {
							showMsg("Enter a new password");
							return;
						}

						// send the password change request
						fetch(`/api/auth/info/set?username=${user.username}`, {
							credentials: "include",
							method: "POST",
							body: JSON.stringify({
								password: password.value,
								oldPassword: oldPassword.value
							})
						})

						.then(res => res.json())

						.then(res => {
							// password change failed
							if(res.status == "fail") {
								showMsg(res.data.msg);
							}

							if(res.status == "success") {
								showMsg("Password changed");
							}

							// clear the fields
							password.value = "";
							oldPassword.value = "";
						});
					}
				}
			});

			children.push({ tag: "br" });
			children.push({ tag: "br" });

			// only display the logout button if we are on the /account page
			if(!match[1]) {
				children.push({
					tag: "button",
					classes: "fancy-button",
					text: "Logout",
					on: {
						click: () => {
							// send the logout request
							fetch("/api/auth/logout", { credentials: "include" })

							// return to the login page
							.then(() => lifeLine.nav.navigate("/login"));
						}
					}
				});
			}

			var {password, oldPassword, msg} = lifeLine.makeDom({
				parent: content,
				classes: "content-padded",
				children
			});

			// show a message
			var showMsg = function(text) {
				msg.innerText = text;
			};
		})
	}
});
