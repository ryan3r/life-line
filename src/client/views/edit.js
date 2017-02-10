/**
 * Edit an assignemnt
 */

var {daysFromNow, stringifyDate} = require("../util/date");
var {store} = require("../data-store");

var assignments = store("assignments");

lifeLine.nav.register({
	matcher: /^\/edit\/(.+?)$/,

	make({match, content, setTitle, disposable}) {
		var actionSub, deleteSub;

		// push the changes through when the page is closed
		disposable.add({
			unsubscribe: () => assignments.forceSave()
		});

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
					modified: Date.now(),
					type: "assignment"
				};
			}

			// set the inital title
			setTitle("Editing");

			// save changes
			var change = () => {
				// update the modified date
				item.modified = Date.now();

				// find the date and time inputs
				var dateInput = document.querySelector("input[type=date]");
				var timeInput = document.querySelector("input[type=time]");

				// parse the date
				item.date = new Date(dateInput.value + " " + timeInput.value);

				// remove assignemnt fields from tasks
				if(item.type == "task") {
					delete item.date;
					delete item.class;
				}

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

			// hide and show specific fields for different assignment types
			var toggleFields = () => {
				if(item.type == "task") {
					mapped.classField.style.display = "none";
					mapped.dateField.style.display = "none";
				}
				else {
					mapped.classField.style.display = "";
					mapped.dateField.style.display = "";
				}

				// fill in date if it is missing
				if(!item.date) {
					item.date = genDate();
				}

				if(!item.class) {
					item.class = "Class";
				}
			};

			// render the ui
			var mapped = lifeLine.makeDom({
				parent: content,
				group: [
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
								widget: "toggle-btns",
								btns: [
									{ text: "Assignment", value: "assignment" },
									{ text: "Task", value: "task" },
								],
								value: item.type,
								change: type => {
									// update the item type
									item.type = type;

									// hide/show specific fields
									toggleFields();

									// emit the change
									change();
								}
							}
						]
					},
					{
						name: "classField",
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
						name: "dateField",
						classes: "editor-row",
						children: [
							{
								widget: "input",
								type: "date",
								value: item.date && `${item.date.getFullYear()}-${pad(item.date.getMonth() + 1)}-${pad(item.date.getDate())}`,
								change
							},
							{
								widget: "input",
								type: "time",
								value: item.date && `${item.date.getHours()}:${pad(item.date.getMinutes())}`,
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

			// show the fields for this item type
			toggleFields();
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
