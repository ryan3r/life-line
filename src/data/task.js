import Events from "../util/events";
import Disposable from "../util/disposable";
import {lists} from "./lists";
import {TASK_PROPS} from "../constants";
import saveTracker from "../util/save-tracker";
import {DEBOUNCE_TIMER} from "../constants";
import Debouncer from "../util/debouncer";
import localforage from "localforage";

const db = firebase.database();

// capitalize the first letter
const capitalizeFirst = word => word.charAt(0).toUpperCase() + word.substr(1);

export default class Task extends Events {
	constructor({id, raw, tasks}) {
		super();

		// save a reference to the tasks object
		this._tasks = tasks;

		// get our id
		this.id = id;

		// get our parent
		if(raw.parent) {
			// wait for the parent to be loaded
			tasks.getAsync(raw.parent)

			.then(parent => {
				this._updateParent(parent, raw.index);
			});
		}

		// set the props
		for(const prop of TASK_PROPS) {
			this["_" + prop.name] = raw[prop.name];

			// define the change event
			this.defineEvent(capitalizeFirst(prop.name), prop.name);

			// set up the save to firebase deferred
			if(prop.syncToFirebase) {
				this["_save" + prop.name] = new Debouncer(
					this._makePropSave(prop.name),
					DEBOUNCE_TIMER
				);
			}
		}

		// update the state
		this._state = raw.state;

		// set up the list of children
		this.children = [];

		// add the evnts for state and children
		this.defineEvent("State", "state");
		this.defineEvent("Children", "children");
		this.defineEvent("HasGrandchildren", "hasGrandchildren");

		// start with a depth of 0
		this.depth = 0;
	}

	// all tasks have been loaded
	init() {
		// sort the children
		this.children.sort((a, b) => a.index - b.index);

		if(this.children.length > 0) {
			// get the value of hideChildren
			return localforage.getItem(`hideChildren-${this.id}`)

			.then(hideChildren => {
				this._updateProp("hideChildren", hideChildren);
			});
		}
	}

	// recieve updates from firebase
	_update(raw) {
		// update the properties
		for(const prop of TASK_PROPS) {
			this._updateProp(prop.name, raw[prop.name]);
		}

		// update the state
		this._updateState(raw.state);

		// update the parent
		if(raw.parent && (!this.parent || raw.parent != this.parent.id)) {
			this._updateParent(this._tasks.get(raw.parent), raw.index);
		}
		// update the index
		else if(this.index !== raw.index) {
			// remove this from its old locaiton
			if(this.parent.children[this.index] == this) {
				this.parent.children.splice(this.index, 1);
			}

			// put it in its new one
			if(this.parent.children[raw.index] != this) {
				this.parent.children.splice(raw.index, 0, this);
			}

			// update our index
			this.index = raw.index;

			// notify the listeners
			this.parent.emit("Children");

			if(this.parent.parent) {
				this.parent.parent._updateGrandchildren();
			}
		}
	}

	// remove this task
	_remove() {
		this._updateParent();

		// clear the hideChildren state
		if(this.hideChildren) {
			localforage.removeItem(`hideChildren-${this.id}`);
		}
	}

	// create a child task
	create({name = "", index} = {}) {
		// assign an index
		if(index === undefined) {
			index = this.children.length;
		}

		// create the new task
		const task = this._tasks.create({
			name,
			state: "none",
			parent: this.id,
			index
		});

		// push back any children that are displased by this task
		this._updateChildIndexes("increment", index - 1);

		// remove the state property from firebase
		if(this.children.length === 0) {
			saveTracker.addSaveJob(
				this._tasks._ref.child(`${this.id}/state`).remove()
			);
		}

		// make sure the children are visible we a new one is created
		this.hideChildren = false;

		return task;
	}

	// delete this task
	delete() {
		// mark this task as deleted
		this._deleted = true;

		// update the indexes of all the other tasks
		this.parent._updateChildIndexes("decrement", this.index);

		this._updateParent();

		// clear the hideChildren state
		if(this.hideChildren) {
			localforage.removeItem(`hideChildren-${this.id}`);
		}

		// delete the task from tasks
		this._tasks.delete(this.id);

		// Delete all the children as well
		// I iterate backwards because children will be deleting themselves from this array
		for(let i = this.children.length - 1; i >= 0; --i) {
			this.children[i].delete();
		}
	}

	// increment or decrement all the children after this
	_updateChildIndexes(mode, index) {
		const increment = mode == "increment";

		// get all the children after them
		for(let i = index + 1; i < this.children.length; ++i) {
			const task = this.children[i];

			// update the index
			increment ? ++task.index : --task.index;

			// save the index to firebase
			saveTracker.addSaveJob(
				this._tasks._ref.child(`${task.id}/index`).set(task.index)
			);
		}
	}

	// add this task to a parent
	attachTo(task, index) {
		// update the indexes for the children of the parent we are leaving
		this.parent._updateChildIndexes("decrement", this.index);

		this._updateParent(task, index);

		// update the indexes after this child
		this.parent._updateChildIndexes("increment", this.index);

		// save the index to firebase
		saveTracker.addSaveJob(
			this._tasks._ref.child(`${this.id}`).update({
				index: this.index,
				parent: this.parent.id
			})
		);
	}

	// switch this task with another task that has the same parent
	switchWith(sibling) {
		// check that these tasks are siblings
		if(this.parent != sibling.parent) {
			throw new Error("The switch with method can only be called on siblings.");
		}

		// switch indexes
		const tmpIndex = this.index;
		this.index = sibling.index;
		sibling.index = tmpIndex;

		// switch places
		this.parent.children.splice(this.index, 1, this);
		this.parent.children.splice(sibling.index, 1, sibling);

		// refresh the ui
		this.parent.emit("Children");

		if(this.parent.parent) {
			this.parent.parent._updateGrandchildren();
		}

		// save our index to firebase
		saveTracker.addSaveJob(
			this._tasks._ref.child(`${this.id}/index`).set(this.index)
		);

		// save the sibling's index to firebase
		saveTracker.addSaveJob(
			this._tasks._ref.child(`${sibling.id}/index`).set(sibling.index)
		);
	}

	// change our parent
	_updateParent(newParent, index, {noEmitChildren} = {}) {
		// remove the old parent
		if(this.parent) {
			// remove ourself from our parent
			this.parent.children.splice(this.index, 1);

			// force a state refresh
			if(this.parent.children.length > 0) {
				this.parent._invalidateState();
			}
			// send a state change event so the ui switches back to the task's internal state
			else {
				this.parent._stateChange();
			}

			// notify the parent's listeners that we have been removed
			if(!noEmitChildren) {
				this.parent.emit("Children");

				if(this.parent.parent) {
					this.parent.parent._updateGrandchildren();
				}
			}
		}

		// update the internal parent and index references
		this.parent = newParent;
		this.index = index;

		if(this.parent) {
			// update our depth
			this.depth = this.parent.depth + 1;

			// no index specified go to the end
			if(this.index === undefined) {
				this.index = this.parent.children.length;
			}

			// add this task to the new parent
			this.parent.children.splice(this.index, 0, this);

			// force a state refresh
			this.parent._invalidateState();

			// notify the parent's listeners that we have been added
			if(!noEmitChildren) {
				this.parent.emit("Children");

				if(this.parent.parent) {
					this.parent.parent._updateGrandchildren();
				}
			}
		}
	}

	// update the value of a property
	_updateProp(prop, value) {
		// check if the value has changed
		if(this["_" + prop] === value) return false;

		// update the value
		this["_" + prop] = value;

		// emit the change
		this.emit(capitalizeFirst(prop), value);

		return true;
	}

	// mark the calculated state for this task as invalid and recaclulate it if
	// there are any state listeners
	_invalidateState() {
		// can not be used on a task with no children
		if(this.children.length === 0) {
			throw new Error(
				"_invalidateState() can not be called on a task with no children"
			);
		}

		// remove the cached state
		delete this._cachedState;

		// check for state listeners
		if(this.hasListeners("State")) {
			this._calculateState();

			// notify the listeners
			this._stateChange();
		}

		// if we have a parent invalidate its state
		if(this.parent) {
			this.parent._invalidateState();
		}
	}

	// calculate the state of this task
	_calculateState() {
		// can not be used on a task with no children
		if(this.children.length === 0) {
			throw new Error(
				"_calculateState() can not be called on a task with no children"
			);
		}

		// clear any old state value when we get children
		if(this._state) {
			delete this._state;

			// update firebase
			saveTracker.addSaveJob(
				this._tasks._ref.child(`${this.id}/state`).remove()
			);
		}

		// set the default state
		this._cachedState = {
			type: "done",
			percentDone: 0,
			completed: 0,
			total: 0
		};

		// combine the state of our children
		for(const child of this.children) {
			// update the state type
			if(child.state.type == "pending" && this._cachedState == "done") {
				this._cachedState.type = "pending";
			}
			else if(child.state.type == "none") {
				this._cachedState.type = "none";
			}

			// add the child's percentDone
			if(child.children.length > 0) {
				this._cachedState.completed += child.state.completed;
				this._cachedState.total += child.state.total;
			}
			else {
				this._cachedState.completed += child.state.type == "done";
				++this._cachedState.total;
			}
		}

		// calculate the percent done
		this._cachedState.percentDone =
			this._cachedState.completed / this._cachedState.total;

		// round to the 5th decimal place to avild floating point errors
		this._cachedState.percentDone =
			Math.round(this._cachedState.percentDone * 100000) / 100000;
	}

	// emit a state change event
	_stateChange() {
		this.emit("State");
	}

	// update the state
	_updateState(state) {
		// nothing changed
		if(this._state === state) return false;

		// save the state
		this._state = state;

		// notify listeners
		this._stateChange();

		// invalidate the parent
		this.parent._invalidateState();

		return true;
	}

	// delete all the children that have been completed
	deleteCompleted() {
		for(let i = this.children.length - 1; i >= 0; --i) {
			const child = this.children[i];

			// delete any children that are done
			if(child.state.type == "done") {
				child.delete();
			}
			// delete that child's completed tasks
			else {
				child.deleteCompleted();
			}
		}
	}

	// get the state of a task
	get state() {
		// get the state of a childless task
		if(this.children.length === 0) {
			return {
				type: this._state || "none",
				percentDone: this._state == "done" ? 1 : 0
			};
		}

		// if we don't have a cached value calculate
		if(!this._cachedState) {
			this._calculateState();
		}

		return this._cachedState;
	}

	set state(state) {
		// get the state of a childless task
		if(this.children.length === 0) {
			// update the state
			this._updateState(state);

			// save the change to firebase
			saveTracker.addSaveJob(
				this._tasks._ref.child(`${this.id}/state`).set(this._state)
			);
		}
		// pass this change on to our children
		else {
			for(let child of this.children) {
				child.state = state;
			}
		}
	}

	// make the save to firebase method for props
	_makePropSave(name) {
		return () => {
			let promises = [];
			const value = this[name];

			// save the value
			const ref = this._tasks._ref.child(`${this.id}/${name}`);

			promises.push(
				value === undefined ?
					ref.remove() : // firebase does not support undefined
					ref.set(value)
			);

			// if this is the root task
			if(name == "name" && !this._deleted && !this.parent) {
				promises.push(
					db.ref(`/users/${lists.userId}/${this._tasks.listId}`).set(value)
				);
			}

			return Promise.all(promises);
		};
	}

	// check if we have any grandchildren
	_updateGrandchildren() {
		this._hasGrandchildren = this.children.every(child => child.children.length === 0);

		this.emit("HasGrandchildren");
	}

	get hasGrandchildren() {
		// check if the value is cached
		if(this._hasGrandchildren === undefined) {
			this._updateGrandchildren();
		}

		return this._hasGrandchildren;
	}
}

for(let prop of TASK_PROPS) {
	Object.defineProperty(Task.prototype, prop.name, {
		// get the name
		get() {
			return this["_" + prop.name];
		},

		// store the value of the property
		set(value) {
			// update our internal version of prop
			const changed = this._updateProp(prop.name, value);

			if(changed) {
				// save changes to firebase
				if(prop.syncToFirebase) {
					saveTracker.addSaveJob(
						this["_save" + prop.name].trigger()
					);
				}

				// save to localforage
				if(prop.name == "hideChildren") {
					if(value) {
						localforage.setItem(`hideChildren-${this.id}`, true);
					}
					// only save the value if it's true to save space
					else {
						localforage.removeItem(`hideChildren-${this.id}`);
					}
				}
			}
		}
	});
}
