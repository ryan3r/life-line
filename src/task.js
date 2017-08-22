import {Events} from "./util";

const db = firebase.database();

const TASK_PROPS = ["name"];

export class Task extends Events {
	constructor({id, raw, tasks}) {
		super("task");

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
			this["_" + prop] = raw[prop];
		}

		// update the state
		this._state = raw.state;

		// set up the list of children
		this.children = [];

		this._subscriptions = [
			// reset the filtered children
			this._tasks.filter.on("refresh", () => {
				this._refreshVisibleChildren();
			})
		];
	}

	// recieve updates from firebase
	_update(raw) {
		// update the properties
		for(const prop of TASK_PROPS) {
			this._updateProp(prop, raw[prop]);
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
		// remove any for this task subscriptions
		this.dispose();

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
			this._tasks._ref.child(`${this.id}/state`).remove();
		}

		return task;
	}

	// delete this task
	delete(opts) {
		// mark this task as deleted
		this._deleted = true;

		this._updateParent(undefined, opts);

		// delete the task from tasks
		this._tasks.delete(this.id);

		// remove any for this task subscriptions
		this.dispose();

		// Delete all the children as well
		// I iterate backwards because children will be deleting themselvs from this array
		for(let i = this.children.length - 1; i >= 0; --i) {
			this.children[i].delete({ isLastChild: true });
		}
	}

	// remove any subscriptions
	dispose() {
		while(this._subscriptions.length) {
			this._subscriptions.shift().unsubscribe();
		}
	}

	// add this task to a parent
	attachTo(task, after) {
		this._updateParent(task, {after});

		// save the change to firebase
		this._tasks._ref.child(`${this.id}/parent`).set(this.parent.id);
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
			this.parent.emit("children", this.parent.children);

			// update the parent's visible children
			this.parent._refreshVisibleChildren();
		}

		// update the internal parent reference
		this.parent = newParent;

		if(this.parent) {
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
			this.parent.emit("children", this.parent.children);

			// update the parent's visible children
			this.parent._refreshVisibleChildren();
		}
	}

	// force the visible children to be refreshed
	_refreshVisibleChildren() {
		// clear the visible children cache
		this._visibleChildren = undefined;

		// emit the change event
		this.emit("visibleChildren", this.visibleChildren);
	}

	// get the children that are visible
	get visibleChildren() {
		// filter out the invisible children
		if(!this._visibleChildren) {
			this._visibleChildren = this.children.filter(this._tasks.filter.isVisible);
		}

		return this._visibleChildren;
	}

	// update the value of a property
	_updateProp(prop, value) {
		// check if the value has changed
		if(this["_" + prop] === value) return false;

		// update the value
		this["_" + prop] = value;

		// emit the change
		this.emit(prop, value);

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
		if(this.hasListeners("state")) {
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
			this._tasks._ref.child(`${this.id}/state`).remove();
		}

		// set the default state
		this._cachedState = {
			type: "done",
			percentDone: 0
		};

		// the percent of the overall percentDone each child gets
		const taskPercent = 1 / this.children.length;

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
			this._cachedState.percentDone += taskPercent * child.state.percentDone;
		}

		// round to the 5th decimal place to avild floating point errors
		this._cachedState.percentDone = Math.round(this._cachedState.percentDone * 100000) / 100000;
	}

	// emit a state change event
	_stateChange() {
		this.emit("state", this.state);

		// update the parent's visible children
		if(this.parent) {
			this.parent._refreshVisibleChildren();
		}
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

	// check if this task is showing more than the maximum number of children
	childCountExcedes({maxChildren, showCompleted}) {
		// the number of children that we can have before we exceed the allotment
		let childrenRemaining = maxChildren;

		for(let child of this.children) {
			// this child is hidden ignore it
			if(!showCompleted && child.state.type == "done") continue;

			--childrenRemaining;

			// we have exceded the maximum number of children allowed
			if(childrenRemaining < 0) {
				return true;
			}
		}

		return false;
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
			this._tasks._ref.child(`${this.id}/state`).set(this._state);
		}
		// pass this change on to our children
		else {
			for(let child of this.children) {
				child.state = state;
			}
		}
	}
}

for(let prop of TASK_PROPS) {
	Object.defineProperty(Task.prototype, prop, {
		// get the name
		get() {
			return this["_" + prop];
		},

		// store the value of the property
		set(value) {
			// update our internal version of prop
			const changed = this._updateProp(prop, value);

			// save changes to firebase
			if(changed && !this._deleted) {
				this._tasks._ref.child(`${this.id}/${prop}`).set(value);

				// if this is the root task
				if(prop == "name" && !this.parent) {
					db.ref(`/users/${this._tasks.lists.userId}/${this._tasks.listId}`).set(value);
				}
			}
		}
	});
}
