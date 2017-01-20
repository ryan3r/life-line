/**
 * The widget for the sidebar
 */

lifeLine.makeDom.register("sidebar", {
	make() {
		return [
			{
				classes: "sidebar",
				name: "sidebar",
				children: [
					{
						classes: ["sidebar-actions", "hidden"],
						name: "actions",
						children: [
							{
								classes: "sidebar-heading",
								text: "Page actions"
							}
						]
					},
					{
						classes: "sidebar-heading",
						text: "More actions"
					}
				]
			},
			{
				classes: "shade",
				on: {
					// close the sidebar
					click: () => document.body.classList.remove("sidebar-open")
				}
			}
		];
	},

	bind(opts, {actions, sidebar}) {
		// add a command to the sidebar
		lifeLine.addCommand = function(name, fn) {
			// make the sidebar item
			var {item} = lifeLine.makeDom({
				parent: sidebar,
				tag: "div",
				name: "item",
				classes: "sidebar-item",
				text: name,
				on: {
					click: () => {
						// close the sidebar
						document.body.classList.remove("sidebar-open");

						// call the listener
						fn();
					}
				}
			});

			return {
				unsubscribe: () => item.remove()
			};
		};

		// add a navigational command
		lifeLine.addNavCommand = function(name, to) {
			lifeLine.addCommand(name, () => lifeLine.nav.navigate(to));
		};

		// add a sidebar action
		lifeLine.on("action-create", name => {
			// show the actions
			actions.classList.remove("hidden");

			// create the button
			lifeLine.makeDom({
				parent: actions,
				tag: "div",
				name: "item",
				classes: "sidebar-item",
				text: name,
				attrs: {
					"data-name": name
				},
				on: {
					click: () => {
						// close the sidebar
						document.body.classList.remove("sidebar-open");

						// trigger the action
						lifeLine.emit("action-exec-" + name);
					}
				}
			});

			// remove a sidebar action
			lifeLine.on("action-remove", name => {
				// remove the button
				var btn = actions.querySelector(`[data-name="${name}"]`);

				if(btn) btn.remove();

				// hide the page actions if there are none
				if(actions.children.length == 1) {
					actions.classList.add("hidden");
				}
			});

			// remove all the sidebar actions
			lifeLine.on("action-remove-all", () => {
				// remove all the actions
				var _actions = Array.from(actions.querySelectorAll(".sidebar-item"));

				_actions.forEach(action => action.remove());

				// side the page actions
				actions.classList.add("hidden");
			});
		});
	}
});
