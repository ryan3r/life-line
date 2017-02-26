/**
 * Display a list of upcomming assignments
 */

var {daysFromNow, isSameDate, stringifyDate, stringifyTime, isSoonerDate} = require("../util/date");
var {assignments} = require("../data-stores");

// all the different lists
const LISTS = [
	{
		url: "/week",
		title: "This week",
		createCtx: () => ({
			// days to the end of this week
			endDate: daysFromNow(7 - (new Date()).getDay()),
			// todays date
			today: new Date()
		}),
		// show all at reasonable number of incomplete assignments
		filter: (item, {today, endDate}) => {
			// show all tasks
			if(item.type == "task") return true;

			// check if the item is past this week
			if(!isSoonerDate(item.date, endDate) && !isSameDate(item.date, endDate)) return;

			// check if the date is before today
			if(isSoonerDate(item.date, today)) return;

			return true;
		},
		query: { done: false }
	},
	{
		url: "/upcoming",
		query: { done: false },
		title: "Upcoming"
	},
	{
		url: "/done",
		query: { done: true },
		title: "Done"
	}
];

// add list view links to the navbar
exports.initNavBar = function() {
	LISTS.forEach(list => lifeLine.addNavCommand(list.title, list.url));
};

lifeLine.nav.register({
	matcher(url) {
		return LISTS.find(list => list.url == url);
	},

	// make the list
	make({setTitle, content, disposable, match}) {
		disposable.add(
			assignments.query(match.query || {}, function(data) {
				// clear the content
				content.innerHTML = "";

				// set the page title
				setTitle(match.title);

				// the context for the filter function
				var ctx;

				if(match.createCtx) {
					ctx = match.createCtx();
				}

				// run the filter function
				if(match.filter) {
					data = data.filter(item => match.filter(item, ctx));
				}

				// sort the assingments
				data.sort((a, b) => {
					// tasks are below assignments
					if(a.type == "task" && b.type != "task") return 1;
					if(a.type != "task" && b.type == "task") return -1;

					// sort by due date
					if(a.type == "assignment" && b.type == "assignment") {
						if(a.date.getTime() != b.date.getTime()) {
							return a.date.getTime() - b.date.getTime();
						}
					}

					// order by name
					if(a.name < b.name) return -1;
					if(a.name > b.name) return 1;

					return 0;
				});

				// make the groups
				var groups = {};

				// render the list
				data.forEach((item, i) => {
					// get the header name
					var dateStr = item.type == "task" ? "Tasks" : stringifyDate(item.date);

					// make sure the header exists
					groups[dateStr] || (groups[dateStr] = []);

					// add the item to the list
					var items = [
						{ text: item.name, grow: true }
					];

					if(item.type != "task") {
						// show the end time for any non 11:59pm times
						if(item.date.getHours() != 23 || item.date.getMinutes() != 59) {
							items.push(stringifyTime(item.date));
						}

						// show the class
						items.push(item.class);
					}

					groups[dateStr].push({
						href: `/item/${item.id}`,
						items
					});
				});

				// display all items
				lifeLine.makeDom({
					parent: content,
					widget: "list",
					items: groups
				});
			})
		);
	}
});
