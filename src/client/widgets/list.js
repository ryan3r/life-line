/**
 * Display a list with group headings
 */

lifeLine.makeDom.register("list", {
	make({items}) {
		// add all the groups
		return Object.getOwnPropertyNames(items)

		.map(groupName => makeGroup(groupName, items[groupName]));
	}
});

// make a single group
var makeGroup = function(name, items, parent) {
	// add the list header
	items.unshift({
		classes: "list-header",
		text: name
	});

	// render the item
	return {
		parent,
		classes: "list-section",
		children: items.map((item, index) => {
			// don't modify the header
			if(index === 0) return item;

			var itemDom;

			// create an item
			if(typeof item != "string") {
				itemDom = {
					classes: "list-item",
					children: (item.items || item).map(item => {
						return {
							// get the name of the item
							text: typeof item == "string" ? item : item.text,
							// set whether the item should grow
							classes: item.grow ? "list-item-grow" : "list-item-part"
						};
					})
				};
			}
			else {
				itemDom = {
					classes: "list-item",
					text: item
				};
			}

			// make the item a link
			if(item.href) {
				itemDom.on = {
					click: () => lifeLine.nav.navigate(item.href)
				};
			}

			return itemDom;
		})
	};
};
