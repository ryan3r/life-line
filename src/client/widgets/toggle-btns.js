/**
 * A row of radio style buttons
 */

lifeLine.makeDom.register("toggle-btns", {
	make({btns, value}) {
		// auto select the first button
		if(!value) {
			value = typeof btns[0] == "string" ? btns[0] : btns[0].value;
		}

		return {
			name: "toggleBar",
			classes: "toggle-bar",
			children: btns.map(btn => {
				// convert the plain string to an object
				if(typeof btn == "string") {
					btn = { text: btn, value: btn };
				}

				var classes = ["toggle-btn"];

				// add the selected class
				if(value == btn.value) {
					classes.push("toggle-btn-selected");

					// don't select two buttons
					value = undefined;
				}

				return {
					tag: "button",
					classes,
					text: btn.text,
					attrs: {
						"data-value": btn.value
					}
				};
			})
		};
	},

	bind({change}, {toggleBar}) {
		// attach listeners
		for(let btn of toggleBar.querySelectorAll(".toggle-btn")) {
			btn.addEventListener("click", () => {
				var selected = toggleBar.querySelector(".toggle-btn-selected");

				// the button has already been selected
				if(selected == btn) {
					return;
				}

				// untoggle the other button
				if(selected) {
					selected.classList.remove("toggle-btn-selected");
				}

				// select this button
				btn.classList.add("toggle-btn-selected");

				// trigger a selection change
				change(btn.dataset.value);
			});
		}
	}
});
