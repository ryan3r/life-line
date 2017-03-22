/**
 * A list of things todo
 */

var {daysFromNow, isSameDate, stringifyTime, stringifyDate} = require("../util/date");
var {assignments} = require("../data-stores");

lifeLine.nav.register({
	matcher: "/",

	make({setTitle, content, disposable}) {
		setTitle("Todo");

		// load the items
		disposable.add(
			assignments.query({
				done: false,
				// make sure the assignment is in the future
				date: date => !date || new Date(date).getTime() > Date.now()
			}, function(data) {
				// clear the old content
				content.innerHTML = "";

				var groups = {
					Tasks: [],
					Today: [],
					Tomorrow: []
				};

				var upcomming = [];

				// today and tomorrows dates
				var today = new Date();
				var tomorrow = daysFromNow(1);

				// sort by date
				data.sort((a, b) => {
					if(a.type != "task" && b.type != "task") {
						return a.date.getTime() - b.date.getTime();
					}
				});

				// select the items to display
				data.forEach(item => {
					// assignments for today
					if(item.type != "task") {
						// today
						if(isSameDate(today, item.date)) {
							groups.Today.push(createUi(item));
						}
						// tomorrow
						else if(isSameDate(tomorrow, item.date)) {
							groups.Tomorrow.push(createUi(item));
						}
						// add upcomming items
						else if(upcomming.length < 10) {
							upcomming.push([
								item,
								createUi(item)
							]);
						}
					}

					// show any tasks
					if(item.type == "task") {
						groups.Tasks.push(createUi(item));
					}
				});

				// don't have too many items in the todo page
				var toRemove = groups.Today.length + groups.Tomorrow.length + groups.Tasks.length;

				upcomming = upcomming.slice(0, Math.max(0, 10 - toRemove));

				// add groups for each of the upcoming
				for(let day of upcomming) {
					let strDate = stringifyDate(day[0].date);

					groups[strDate] || (groups[strDate] = []);

					groups[strDate].push(day[1]);
				}

				// remove any empty fields
				Object.getOwnPropertyNames(groups)

				.forEach(name => {
					// remove empty groups
					if(groups[name].length === 0) {
						delete groups[name];
					}
				});

				// render the list
				lifeLine.makeDom({
					parent: content,
					widget: "list",
					items: groups
				});
			})
		);
	}
});

// create a list item
var createUi = function(item) {
	// render a task
	if(item.type == "task") {
		return {
			href: `/item/${item.id}`,
			items: [
				{
					text: item.name,
					grow: true
				}
			]
		};
	}
	// render an assignment or exam
	else {
		return {
			href: `/item/${item.id}`,
			items: [
				{
					text: item.type == "assignment" ?  item.name : `${item.name} - ${item.class}`,
					grow: true
				},
				stringifyTime(item.date),
				item.type == "assignment" ? item.class : item.location
			]
		};
	}
};
