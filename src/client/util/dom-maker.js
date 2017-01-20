/**
 * A helper for building dom nodes
 */

const SVG_ELEMENTS = ["svg", "line"];
const SVG_NAMESPACE = "http://www.w3.org/2000/svg";

// build a single dom node
var makeDom = function(opts = {}) {
	// get or create the name mapping
	var mapped = opts.mapped || {};

	var $el;

	// the element is part of the svg namespace
	if(SVG_ELEMENTS.indexOf(opts.tag) !== -1) {
		$el = document.createElementNS(SVG_NAMESPACE, opts.tag);
	}
	// a plain element
	else {
		$el = document.createElement(opts.tag || "div");
	}

	// set the classes
	if(opts.classes) {
		$el.setAttribute("class", typeof opts.classes == "string" ? opts.classes : opts.classes.join(" "));
	}

	// attach the attributes
	if(opts.attrs) {
		Object.getOwnPropertyNames(opts.attrs)

		.forEach(attr => $el.setAttribute(attr, opts.attrs[attr]));
	}

	// set the text content
	if(opts.text) {
		$el.innerText = opts.text;
	}

	// attach the node to its parent
	if(opts.parent) {
		opts.parent.insertBefore($el, opts.before);
	}

	// add event listeners
	if(opts.on) {
		for(let name of Object.getOwnPropertyNames(opts.on)) {
			$el.addEventListener(name, opts.on[name]);

			// attach the dom to a disposable
			if(opts.disp) {
				opts.disp.add({
					unsubscribe: () => $el.removeEventListener(name, opts.on[name])
				});
			}
		}
	}

	// set the value of an input element
	if(opts.value) {
		$el.value = opts.value;
	}

	// add the name mapping
	if(opts.name) {
		mapped[opts.name] = $el;
	}

	// create the child dom nodes
	if(opts.children) {
		for(let child of opts.children) {
			// make an array into a group Object
			if(Array.isArray(child)) {
				child = {
					group: child
				};
			}

			// attach information for the group
			child.parent = $el;
			child.disp = opts.disp;
			child.mapped = mapped;

			// build the node or group
			module.exports(child);
		}
	}

	return mapped;
}

// build a group of dom nodes
var makeGroup = function(group) {
	// shorthand for a groups
	if(Array.isArray(group)) {
		group = {
			children: group
		};
	}

	// get or create the name mapping
	var mapped = {};

	for(let node of group.group) {
		// copy over properties from the group
		node.parent || (node.parent = group.parent);
		node.disp || (node.disp = group.disp);
		node.mapped = mapped;

		// make the dom
		module.exports(node);
	}

	// call the callback with the mapped names
	if(group.bind) {
		var subscription = group.bind(mapped);

		// if the return a subscription attach it to the disposable
		if(subscription && group.disp) {
			group.disp.add(subscription);
		}
	}

	return mapped;
};

// a collection of widgets
var widgets = {};

module.exports = function(opts) {
	// handle a group
	if(Array.isArray(opts) || opts.group) {
		return makeGroup(opts);
	}
	// make a widget
	else if(opts.widget) {
		var widget = widgets[opts.widget];

		// not defined
		if(!widget) {
			throw new Error(`Widget '${opts.widget}' is not defined make sure its been imported`);
		}

		// generate the widget content
		var built = widget.make(opts);

		return makeGroup({
			parent: opts.parent,
			disp: opts.disp,
			group: Array.isArray(built) ? built : [built],
			bind: widget.bind && widget.bind.bind(widget, opts)
		});
	}
	// make a single node
	else {
		return makeDom(opts);
	}
};

// register a widget
module.exports.register = function(name, widget) {
	widgets[name] = widget;
};
