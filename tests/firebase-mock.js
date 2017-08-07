// create a mock fore firebase.database()
const mockProto = {
	// add an event listener
	on: function(name, fn) {
		this["$" + name] = fn;
	},

	// add an event listener
	once: function(name, fn) {
		this["$" + name] = fn;
	},

	// remove all listeners
	off: function() {
		this._offed = true;
	},

	child: function(name) {
		// multi part path
		if(name && name.indexOf("/") !== -1) {
			// go several layers deep
			const paths = name.split("/");
			let ref = this;

			// get the children
			for(const path of paths) ref = ref.child(path);

			return ref;
		}
		// find and existing child
		else if(this._children.has(name)) {
			return this._children.get(name);
		}
		// create a new child
		else {
			// create a mock for this child
			let child = Object.create(mockProto);

			// initialize the object
			child._children = new Map();

			// save the child
			this._children.set(name, child);

			return child;
		}
	},

	// get a ref
	ref: function(ref) {
		this._ref = ref;

		return this;
	},

	// set the value of this ref
	set: function(value) {
		this._value = value;
	},

	// remove the value of this ref
	remove: function() {
		// mark this as removed
		this._removed = true;

		// clear the value
		this._value = undefined;
	},

	// update the value of this ref
	update: function(value) {
		// copy over the properties
		if(this._value) {
			Object.assign(this._value, value);
		}
		// assign to the ref
		else {
			this._value = value;
		}
	},

	// reset the state of the mock
	$reset: function() {
		// remove all properties
		for(let key of Object.getOwnPropertyNames(this)) {
			delete this[key];
		}

		// reset the children
		this._children = new Map();
	}
};

// basic firebase mocks
window.firebase = {
	// create a global version
	_database: Object.create(mockProto, {
		_children: {
			value: new Map(),
			writable: true,
			configurable: true
		}
	}),

	// access the database instance
	database() {
		return this._database;
	}
};
