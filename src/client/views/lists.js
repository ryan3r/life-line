/**
 * Display a list of upcomming assignments
 */

import {daysFromNow, isSameDate, stringifyDate, stringifyTime, isSoonerDate} from "../util/date";
import {store} from "../data-store";

var assignments = store("assignments");

// all the different lists
const LISTS = [
	{
		url: "/",
		title: "Today",
		createCtx: () => new Date(),
		// show all at reasonable number of incomplete assignments
		filter: (item, today) => !item.done && isSameDate(today, item.date)
	},
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
			// already done
			if(item.done) return;

			// check if the item is past this week
			if(!isSoonerDate(item.date, endDate) && !isSameDate(item.date, endDate)) return;

			// check if the date is before today
			if(isSoonerDate(item.date, today)) return;

			return true;
		}
	},
	{
		url: "/upcoming",
		filter: item => !item.done,
		title: "Upcoming"
	},
	{
		url: "/done",
		filter: item => item.done,
		title: "Done"
	}
];

// add list view links to the navbar
export function initNavBar() {
	LISTS.forEach(list => lifeLine.addNavCommand(list.title, list.url));
};

lifeLine.nav.register({
	matcher(url) {
		return LISTS.find(list => list.url == url);
	},

	// make the list
	make({setTitle, content, disposable, match}) {
		disposable.add(
			assignments.getAll(function(data) {
				// clear the content
				content.innerHTML = "";

				// set the page title
				setTitle(match.title);

				// sort the assingments
				data.sort((a, b) => {
					// different dates
					if(a.date.getTime() != b.date.getTime()) {
						return a.date.getTime() - b.date.getTime();
					}

					// order by name
					if(a.name < b.name) return -1;
					if(a.name > b.name) return 1;

					return 0;
				});

				// the context for the filter function
				var ctx;

				if(match.createCtx) {
					ctx = match.createCtx();
				}

				// run the filter function
				data = data.filter(item => match.filter(item, ctx));

				// make the groups
				var groups = {};

				// render the list
				data.forEach((item, i) => {
					// get the header name
					var dateStr = stringifyDate(item.date);

					// make sure the header exists
					groups[dateStr] || (groups[dateStr] = []);

					// add the item to the list
					var items = [
						{ text: item.name, grow: true },
						item.class
					];

					// show the end time for any non 11:59pm times
					if(item.date.getHours() != 23 || item.date.getMinutes() != 59) {
						items.splice(1, 0, stringifyTime(item.date));
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
