/**
 * The view for an assignment
 */

import {daysFromNow, stringifyDate} from "../util/date";
import {store} from "../data-store";

var assignments = store("assignments");

lifeLine.nav.register({
	matcher: /^\/item\/(.+?)$/,

	make({match, setTitle, content, disposable}) {
		var actionDoneSub, actionEditSub;

	 	disposable.add(
			assignments.get(match[1], function(item) {
				// clear the content
				content.innerHTML = "";

				// remove the old action
				if(actionDoneSub) {
					actionDoneSub.unsubscribe();
					actionEditSub.unsubscribe();
				}

				// no such assignment
				if(!item) {
					setTitle("Not found");

					lifeLine.makeDom({
						parent: content,
						classes: "content-padded",
						children: [
							{
								tag: "span",
								text: "The assignment you where looking for could not be found. "
							},
							{
								widget: "link",
								href: "/",
								text: "Go home."
							}
						]
					});

					return;
				}

				// set the title for the content
				setTitle("Assignment");

				// mark the item as done
				actionDoneSub = lifeLine.addAction(item.done ? "Done" : "Not done", () => {
					// mark the item done
					item.done = !item.done;

					// update the modified time
					item.modified = Date.now();

					// save the change
					assignments.set(item, [], { saveNow: true });
				});

				// edit the item
				actionEditSub = lifeLine.addAction("Edit",
					() => lifeLine.nav.navigate("/edit/" + item.id));

				// times to skip
				var skipTimes = [
					{ hour: 23, minute: 59 }
				];

				lifeLine.makeDom({
					parent: content,
					classes: "content-padded",
					children: [
						{
							classes: "assignment-name",
							text: item.name
						},
						{
							classes: "assignment-info-row",
							children: [
								{
									classes: "assignment-info-grow",
									text: item.class
								},
								{
									text: item.date && stringifyDate(item.date, { includeTime: true, skipTimes })
								}
							]
						},
						{
							classes: "assignment-description",
							text: item.description
						}
					]
				});
			})
		);
	}
});
