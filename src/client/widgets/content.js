/**
 * The main content pane for the app
 */

lifeLine.makeDom.register("content", {
	make() {
		return [
			{
				classes: "toolbar",
				children: [
					{
						tag: "svg",
						classes: "menu-icon",
						attrs: {
							viewBox: "0 0 60 50",
							width: "20",
							height: "15"
						},
						children: [
							{ tag: "line", attrs: { x1: "0", y1: "5", x2: "60", y2: "5" } },
							{ tag: "line", attrs: { x1: "0", y1: "25", x2: "60", y2: "25" } },
							{ tag: "line", attrs: { x1: "0", y1: "45", x2: "60", y2: "45" } }
						],
						on: {
							click: () => document.body.classList.toggle("sidebar-open")
						}
					},
					{
						classes: "toolbar-title",
						name: "title"
					},
					{
						classes: "toolbar-buttons",
						name: "btns"
					}
				]
			},
			{
				classes: "content",
				name: "content"
			},
			// add a sign in flyover or logging in
			{
				classes: ["flyover", "hidden"],
				children: [
					{
						classes: "g-signin2",
						attrs: {
							"data-onsuccess": "glogin"
						}
					}
				]
			},
			{
				classes: ["shade", "hidden"]
			}
		];
	},

	bind(opts, {title, btns, content}) {
		var disposable;

		// set the page title
		var setTitle = function(titleText) {
			title.innerText = titleText;
			document.title = titleText;
		};

		// add an action button
		lifeLine.on("action-create", name => {
			lifeLine.makeDom({
				parent: btns,
				tag: "button",
				classes: "toolbar-button",
				text: name,
				attrs: {
					"data-name": name
				},
				on: {
					click: () => lifeLine.emit("action-exec-" + name)
				}
			});
		});

		// remove an action button
		lifeLine.on("action-remove", name => {
			var btn = btns.querySelector(`[data-name="${name}"]`);

			if(btn) btn.remove();
		});

		// remove all the action buttons
		lifeLine.on("action-remove-all", () => btns.innerHTML = "");

		// display the content for the view
		var updateView = () => {
			// destroy any listeners from old content
			if(disposable) {
				disposable.dispose();
			}

			// remove any action buttons
			lifeLine.emit("action-remove-all");

			// clear all the old content
			content.innerHTML = "";

			// create the disposable for the content
			disposable = new lifeLine.Disposable();

			var maker = notFoundMaker, match;

			// find the correct content maker
			for(let $maker of contentMakers) {
				// run a matcher function
				if(typeof $maker.matcher == "function") {
					match = $maker.matcher(location.pathname);
				}
				// a string match
				else if(typeof $maker.matcher == "string") {
					if($maker.matcher == location.pathname) {
						match = $maker.matcher;
					}
				}
				// a regex match
				else {
					match = $maker.matcher.exec(location.pathname);
				}

				// match found stop searching
				if(match) {
					maker = $maker;

					break;
				}
			}

			// make the content for this route
			maker.make({disposable, setTitle, content, match});
		};

		// switch pages
		lifeLine.nav.navigate = function(url) {
			// update the url
			history.pushState(null, null, url);

			// show the new view
			updateView();
		};

		// switch pages when the user pushes the back button
		window.addEventListener("popstate", () => updateView());

		// show the initial view
		updateView();
	}
});

// all content producers
var contentMakers = [];

// create the namespace
lifeLine.nav = {};

// register a content maker
lifeLine.nav.register = function(maker) {
	contentMakers.push(maker);
};

// the fall back maker for no such page
var notFoundMaker = {
	make({setTitle, content}) {
		// update the page title
		setTitle("Not found");

		lifeLine.makeDom({
			parent: content,
			classes: "content-padded",
			children: [
				{
					tag: "span",
					text: "The page you are looking for could not be found. "
				},
				{
					widget: "link",
					href: "/",
					text: "Go home"
				}
			]
		});
	}
};
