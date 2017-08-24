import Events from "./util/events";
import genId from "./util/gen-id";
import defer from "./util/deferred";
import {router} from "./router";

const db = firebase.database();

export class Lists extends Events {
	constructor() {
		super();

		// start the loaders
		this.emit("loading");

		this._loaded = false;
	}

	// listen for the uid to be set
	onLoaded(fn) {
		// already loaded
		if(this._loaded) {
			fn();
		}

		// listen for changes
		return this.on("loaded", fn);
	}

	// set the uid and login
	setUid(userId) {
		// remove the old ref
		if(this._ref) {
			this.dispose();
		}

		// set the internal state
		this._lists = new Map();
		this.userId = userId;
		this._isFirstList = true;
		this._loaded = true;

		// hide the loaders
		this.emit("loaded");

		// get the firebase ref
		this._ref = db.ref(`/users/${userId}`);

		// listen to the database
		this._ref.on("child_added", this._added.bind(this));
		this._ref.on("child_changed", this._changed.bind(this));
		this._ref.on("child_removed", this._removed.bind(this));
	}

	_added(snap) {
		// store the list
		this._lists.set(snap.key, {
			name: snap.val(),
			id: snap.key
		});

		// tell any listeners to refresh
		this.emit("change");

		// open this list if there is not already a list open
		if(this._isFirstList && !router.listId) {
			this._isFirstList = false;

			router.openList(snap.key);
		}
	}

	_changed(snap) {
		// store the list
		this._lists.set(snap.key, {
			name: snap.val(),
			id: snap.key
		});

		// tell any listeners to refresh
		this.emit("change");
	}

	_removed(snap) {
		// remove the list
		this._lists.delete(snap.key);

		// tell any listeners to refresh
		this.emit("change");

		if(snap.key == router.listId) {
			// get the first list
			const nextList = this._lists.keys().next().value;

			router.openList(nextList);
		}
	}

	// disconnect the listeners
	dispose() {
		this._ref.off();

		this._ref = undefined;
	}

	// create a list
	create(name) {
		// generate the ids
		const listId = genId();
		const rootId = genId();

		// add the list to the user's list of lists
		this._ref.child(listId).set(name);

		// create the actual list
		db.ref(`/lists/${listId}`).set({
			owner: this.userId,
			tasks: {
				[rootId]: {
					name
				}
			}
		});

		return listId;
	}

	// delete a list
	delete(id) {
		// remove the list from the users lists
		this._ref.child(id).remove();

		// remove the actual list
		db.ref(`/lists/${id}`).remove();
	}

	// get all the lists
	get lists() {
		return this._lists ? Array.from(this._lists.values()) : [];
	}
};

// create the global lists instance
export let lists = new Lists();
