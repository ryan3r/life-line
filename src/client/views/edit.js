/**
 * Edit an assignemnt
 */

var {daysFromNow, stringifyDate} = require("../util/date");
var {assignments} = require("../data-stores");;

lifeLine.nav.register({
	matcher: /^\/edit\/(.+?)$/,

	make({match, content, setTitle, disposable}) {
		var actionSub, deleteSub;

		// if we make a change don't refresh the page
		var debounce;

		// sync if anything is changed
		var changed = false;

		var changeSub = assignments.query({ id: match[1] }, function([item]) {
			// if we make a change don't refresh the page
			if(debounce) {
				debounce = false;

				return;
			}

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

					// sync the changes
					lifeLine.sync();
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
					type: "assignment",
					done: false
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

				// remove exam fields from tasks and assignments
				if(item.type != "exam") {
					delete item.location;
				}
				else {
					delete item.description;
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

				debounce = true;
				changed = true;

				// save the changes
				assignments.set(item);
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

				if(item.type == "exam") {
					mapped.descriptionField.style.display = "none";
					mapped.locationField.style.display = "";
				}
				else {
					mapped.descriptionField.style.display = "";
					mapped.locationField.style.display = "none";
				}

				// fill in date if it is missing
				if(item.type != "task") {
					if(!item.date) {
						item.date = genDate();
					}

					if(!item.class) {
						item.class = "Class";
					}

					if(item.type == "exam" && !item.location) {
						item.location = "Location";
					}
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
									{ text: "Exam", value: "exam" }
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
						name: "locationField",
						classes: "editor-row",
						children: [
							{
								widget: "input",
								bind: item,
								prop: "location",
								change
							}
						]
					},
					{
						name: "descriptionField",
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

		// sync if we changed anything
		disposable.add({
			unsubscribe: function() {
				if(changed) {
					lifeLine.sync();
				}
			}
		});
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
