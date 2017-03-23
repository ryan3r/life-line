/**
 * A view for accessing/modifying information about the current user
 */

var {genBackupName} = require("../../common/backup");

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

			// add the enable reminders button
			children.push({
				tag: "button",
				classes: "fancy-button",
				attrs: { style: "display: none;" },
				text: "Enable reminders",
				name: "pushBtn",
				on: {
					click: () => {
						navigator.serviceWorker.ready.then(reg => {
							// get the public key
							fetch("/api/public-key", {
								credentials: "include"
							})

							.then(res => res.arrayBuffer())

							.then(key => {
								// get a subscription
								return reg.pushManager.subscribe({
									userVisibleOnly: true,
									applicationServerKey: new Uint8Array(key)
								});
							})

							.then(sub => {
								// send the subscription to the server
								fetch("/api/subscription", {
									method: "POST",
									body: JSON.stringify(sub),
									credentials: "include"
								})

								// hide the button
								.then(() => pushBtn.style.display = "none")
							});
						});
					}
				}
			});

			// check if they are already enabled
			if(navigator.serviceWorker) {
				navigator.serviceWorker.ready.then(reg => {
					// check that push is supported
					if(reg.pushManager) {
						reg.pushManager.getSubscription().then(sub => {
							// no subscription
							if(!sub) {
								pushBtn.style.display = "block";
							}
						});
					}
				});
			}

			// create a backup link
			if(!match[1]) {
				children.push({ tag: "br" });
				children.push({ tag: "br" });

				children.push({
					tag: "a",
					text: "Download backup",
					attrs: {
						href: "/api/backup",
						download: genBackupName()
					}
				});
			}

			var passwordChange = {};

			children.push({
				tag: "form",
				children: [
					{
						classes: "editor-row",
						children: [
							{
								widget: "input",
								type: "password",
								placeholder: "Old password",
								bind: passwordChange,
								prop: "oldPassword"
							},
							{
								widget: "input",
								type: "password",
								placeholder: "New password",
								bind: passwordChange,
								prop: "password"
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
						if(!passwordChange.password) {
							showMsg("Enter a new password");
							return;
						}

						// send the password change request
						fetch(`/api/auth/info/set?username=${user.username}`, {
							credentials: "include",
							method: "POST",
							body: JSON.stringify(passwordChange)
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

			var {msg, pushBtn} = lifeLine.makeDom({
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
