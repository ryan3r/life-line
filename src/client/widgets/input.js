/**
 * Create an input field
 */

lifeLine.makeDom.register("input", {
	make({tag, type, value, change, bind, prop, placeholder, classes}) {
		// set the initial value of the bound object
		if(typeof bind == "object" && !value) {
			value = bind[prop];
		}

		// done put the literal undefined in if no value is given
		value || (value = "");

		var input = {
			tag: tag || "input",
			classes: classes || `${tag == "textarea" ? "textarea" : "input"}-fill`,
			attrs: {
				placeholder,
				type,
				value
			},
			on: {
				input: e => {
					// update the property changed
					if(typeof bind == "object") {
						bind[prop] = e.target.value;
					}

					// call the callback
					if(typeof change == "function") {
						change(e.target.value);
					}
				}
			}
		};

		// for textareas set innerText
		if(tag == "textarea") {
			input.text = value;
		}

		return input;
	}
});
