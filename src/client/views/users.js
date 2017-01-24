/**
 * A page with links to all users
 */

lifeLine.nav.register({
	matcher: "/users",

	make({setTitle, content}) {
		setTitle("All users");

		// load the list of users
		fetch("/api/auth/info/users")

		.then(users => {
			// sort by admin status
			users.sort((a, b) => {
				// sort admins
				if(a.admin && !b.admin) return -1;
				if(!a.admin && b.admin) return 1;

				// sort by username
				if(a.username < b.username) return -1;
				if(a.username > b.username) return 1;

				return 0;
			});

			// display the user list
			lifeLine.makeDom({
				parent: content,
				// render a single user
				group: users.map(user => {
					var userField = [];

					// display the username
					userField.push({ classes: "list-item-name", text: user.username });

					// mark admins as admins
					if(user.admin) {
						userField.push({
							classes: "list-item-class",
							text: "Admin"
						});
					}

					return {
						classes: "list-item",
						children: userField,
						on: {
							click: () => lifeLine.nav.navigate(`/user/${user.username}`)
						}
					};
				})
			});
		})

		// something went wrong show an error message
		.catch(err => {
			lifeLine.makeDom({
				classes: "content-padded",
				text: err.message
			});
		});
	}
});
