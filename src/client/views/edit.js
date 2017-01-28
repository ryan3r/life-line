/**
 * Edit an assignemnt
 */

import {daysFromNow, stringifyDate} from "../util/date";
import {store} from "../data-store";

var assignments = store("assignments");

lifeLine.nav.register({
	matcher: /^\/edit\/(.+?)$/,

	make({match, content, setTitle, disposable}) {
		var actionSub, deleteSub;

		var changeSub = assignments.get(match[1], function(item) {
			// clear the content
			content.innerHTML = "";

			// remove the previous action
			if(actionSub) {
				actionSub.unsubscribe();
				deleteSub.unsubscribe();
			}

			// add a button back to the view
			if(item) {
				actionSub = lifeLine.addAction("View", () => lifeLine.nav.navigate("/item/" + item.id));

				deleteSub = lifeLine.addAction("Delete", () => {
					// remove the item
					assignments.remove(item.id);

					// navigate away
					lifeLine.nav.navigate("/");
				});
			}

			// if the item does not exist create it
			if(!item) {
				item = {
					name: "Unnamed item",
					class: "Class",
					date: genDate(),
					id: match[1],
					description: "",
					modified: Date.now()
				};
			}

			// set the inital title
			setTitle("Editing");

			// save changes
			var change = () => {
				// update the modified date
				item.modified = Date.now();

				// parse the date
				item.date = new Date(item.date);

				// add a button back to the view
				if(!actionSub) {
					actionSub = lifeLine.addAction("View", () => lifeLine.nav.navigate("/item/" + item.id));

					deleteSub = lifeLine.addAction("Delete", () => {
						// remove the item
						assignments.remove(item.id);

						// navigate away
						lifeLine.nav.navigate("/");
					});
				}

				// save the changes
				assignments.set(item, changeSub);
			};

			// render the ui
			var mapped = lifeLine.makeDom({
				parent: content,
				tag: "form",
				children: [
					{
						classes: "editor-row",
						children: [
							{
								widget: "input",
								bind: item,
								prop: "name",
								change
							}
						]
					},
					{
						classes: "editor-row",
						children: [
							{
								widget: "input",
								bind: item,
								prop: "class",
								change
							}
						]
					},
					{
						classes: "editor-row",
						children: [
							{
								widget: "input",
								type: "date",
								value: `${item.date.getFullYear()}-${pad(item.date.getMonth() + 1)}-${pad(item.date.getDate())}`,
								bind: item,
								prop: "date",
								change
							},
							{
								widget: "input",
								type: "time",
								value: `${item.date.getHours()}:${pad(item.date.getMinutes())}`,
								bind: item,
								prop: "time",
								change
							}
						]
					},
					{
						classes: "textarea-wrapper",
						children: [
							{
								widget: "input",
								tag: "textarea",
								classes: "textarea-fill",
								placeholder: "Description",
								bind: item,
								prop: "description",
								change
							}
						]
					}
				]
			});
		});

		// remove the subscription when this view is destroyed
		disposable.add(changeSub);
	}
});

// add a leading 0 if a number is less than 10
var pad = number => (number < 10) ? "0" + number : number;

// create a date of today at 11:59pm
var genDate = () => {
	var date = new Date();

	// set the time
	date.setHours(23);
	date.setMinutes(59);

	return date;
};
