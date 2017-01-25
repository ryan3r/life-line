/**
 * Display a list of upcomming assignments
 */

import {daysFromNow, isSameDate, stringifyDate, isSoonerDate} from "../util/date";
import {store} from "../data-store";

var assignments = store("assignments");

const MIN_LENGTH = 10;

// all the different lists
const LISTS = [
	{
		url: "/",
		title: "Today",
		// show all at reasonable number of incomplete assignments
		manualFilter: data => {
			// todays date
			var today = new Date();

			return data.filter(item => !item.done && isSameDate(today, item.date));
		}
	},
	{
		url: "/week",
		title: "This week",
		// show all at reasonable number of incomplete assignments
		manualFilter: data => {
			var taken = [];
			// days to the end of this week
			var endDate = daysFromNow(7 - (new Date()).getDay());

			for(let item of data) {
				// already done
				if(item.done) continue;

				// if we have already hit the required length go by date
				if(taken.length >= MIN_LENGTH && !isSoonerDate(item.date, endDate)) {
					continue;
				}

				taken.push(item);
			}

			return taken;
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

				if(match.manualFilter) {
					data = match.manualFilter(data);
				}
				// remove completed items
				else {
					data = data.filter(match.filter);
				}

				// the last item rendered
				var last;

				// render the list
				data.forEach((item, i) => {
					// render the headers
					if(i === 0 || !isSameDate(item.date, last.date)) {
						lifeLine.makeDom({
							parent: content,
							classes: "list-header",
							text: stringifyDate(item.date)
						});
					}

					// make this the last item
					last = item;

					// render the item
					lifeLine.makeDom({
						parent: content,
						classes: "list-item",
						children: [
							{ classes: "list-item-name", text: item.name },
							{ classes: "list-item-class", text: item.class }
						],
						on: {
							click: () => lifeLine.nav.navigate("/item/" + item.id)
						}
					});
				});
			})
		);
	}
});
