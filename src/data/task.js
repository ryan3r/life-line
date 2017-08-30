import Events from "../util/events";
import Disposable from "../util/disposable";
import {lists} from "./lists";
import {TASK_PROPS} from "../constants";
import saveTracker from "../util/save-tracker";
import {DEBOUNCE_TIMER} from "../constants";
import Debouncer from "../util/debouncer";

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
				this._updateParent(parent);
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

		// start with a depth of 0
		this.depth = 0;
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
			this._updateParent(this._tasks.get(raw.parent));
		}
	}

	// remove this task
	_remove() {
		this._updateParent();
	}

	// create a child task
	create(name = "") {
		// create the new task
		const task = this._tasks.create({
			name,
			state: "none",
			parent: this.id
		});

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
	delete(opts) {
		// mark this task as deleted
		this._deleted = true;

		this._updateParent(undefined, opts);

		// delete the task from tasks
		this._tasks.delete(this.id);

		// Delete all the children as well
		// I iterate backwards because children will be deleting themselvs from this array
		for(let i = this.children.length - 1; i >= 0; --i) {
			this.children[i].delete({ isLastChild: true });
		}
	}

	// add this task to a parent
	attachTo(task, after) {
		this._updateParent(task, {after});

		// save the change to firebase
		saveTracker.addSaveJob(
			this._tasks._ref.child(`${this.id}/parent`).set(this.parent.id)
		);
	}

	// get the sibling before this one
	getLastSibling() {
		// no parent
		if(!this.parent) return;

		// find this task in the parent
		const index = this.parent.children.indexOf(this);

		// no sibling before this one
		if(index === 0) return;

		return this.parent.children[index - 1];
	}

	// change our parent
	_updateParent(newParent, {isLastChild, after} = {}) {
		// remove the old parent
		if(this.parent) {
			// just use pop if we know we are the last child
			if(isLastChild) {
				this.parent.children.pop();
			}
			// find this task in the parent's children
			else {
				const index = this.parent.children.indexOf(this);

				if(index !== -1) {
					this.parent.children.splice(index, 1);
				}
			}

			// force a state refresh
			if(this.parent.children.length > 0) {
				this.parent._invalidateState();
			}
			// send a state change event so the ui switches back to the task's internal state
			else {
				this.parent._stateChange();
			}

			// notify the parent's listeners that we have been removed
			this.parent.emit("Children", this.parent.children);
		}

		// update the internal parent reference
		this.parent = newParent;

		if(this.parent) {
			// update our depth
			this.depth = this.parent.depth + 1;

			// add this to the parents children after the child after
			if(after) {
				const index = this.parent.children.indexOf(after);

				if(index !== -1) {
					this.parent.children.splice(index + 1, 0, this);
				}
				else {
					throw new Error(`${after.id} is not a child of ${this.parent.id}`);
				}
			}
			// add this to the parents children at the end
			else {
				this.parent.children.push(this);
			}

			// force a state refresh
			this.parent._invalidateState();

			// notify the parent's listeners that we have been added
			this.parent.emit("Children", this.parent.children);
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

			promises.push(
				this._tasks._ref.child(`${this.id}/${name}`).set(value)
			);

			// if this is the root task
			if(name == "name" && !this.parent) {
				promises.push(
					db.ref(`/users/${lists.userId}/${this._tasks.listId}`).set(value)
				);
			}

			return Promise.all(promises);
		};
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

			// save changes to firebase
			if(changed && !this._deleted && prop.syncToFirebase) {
				saveTracker.addSaveJob(
					this["_save" + prop.name].trigger()
				);
			}
		}
	});
}
