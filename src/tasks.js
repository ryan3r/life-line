import {defer, genId} from "./util";
import {Task} from "./task";

const db = firebase.database();

export class Tasks {
	constructor(listId) {
		this._tasks = new Map();
		this._pending = new Map();

		// save the id for this list
		this.listId = listId;

		// get the firebase ref
		this._ref = db.ref(`/lists/${listId}/tasks`);

		// listen to the database
		this._ref.on("child_added", this._added.bind(this));
		this._ref.on("child_changed", this._changed.bind(this));
		this._ref.on("child_removed", this._removed.bind(this));

		// a promise for when all tasks have been loaded
		this.ready = this._ref.once("value");

		// save the loaded state
		this.ready.then(() => {
			this.allLoaded = true;

			// resolve all tasks
			for(let [id, pending] of this._pending) {
				// remove the promise
				this._pending.delete(id);

				// resolve the promise
				pending.resolve();
			}

			// refresh all tasks state now that everything has loaded
			for(let [_, task] of this._tasks) {
				if(task.children.length > 0) {
					task._invalidateState();
				}
			}
		});
	}

	_added(snap) {
		// we already have this task
		if(this._tasks.has(snap.key)) return;

		const task = new Task({
			id: snap.key,
			raw: snap.val(),
			tasks: this
		});

		// add the task to internal storage
		this._tasks.set(snap.key, task);

		// if anyone is waiting for this task
		if(this._pending.has(snap.key)) {
			// mark this as loaded
			this._pending.get(snap.key).resolve(task);

			// remove the deferred for this task
			this._pending.delete(snap.key);
		}
	}

	_changed(snap) {
		// update the actual task
		this._tasks.get(snap.key)._update(snap.val());
	}

	_removed(snap) {
		// make sure we have the task
		if(!this._tasks.has(snap.key)) return;

		// tell the task it has been removed
		this._tasks.get(snap.key)._remove();

		// delete the task from our list
		this._tasks.delete(snap.key);
	}

	// get a task by id
	get(id) {
		return this._tasks.get(id);
	}

	// get a task by id or wait for it
	getAsync(id) {
		// already loaded
		if(this.allLoaded || this._tasks.has(id)) {
			return Promise.resolve(this._tasks.get(id));
		}
		// wait for the task to load
		else {
			let deferred = defer();

			this._pending.set(id, deferred);

			return deferred.promise;
		}
	}

	// wait for all tasks to load then get the root
	getRootAsync() {
		return this.ready.then(() => {
			// find the root task
			for(let [_, task] of this._tasks) {
				if(!task.parent) {
					return task;
				}
			}
		});
	}

	// create a new task
	create(raw) {
		// generate an id for the new task
		const id = genId();

		const task = new Task({
			id,
			raw,
			tasks: this
		});

		// add the task to the task list
		this._tasks.set(id, task);

		// save the task
		this._ref.child(id).set(raw);

		return task;
	}

	// delete a task
	delete(id) {
		if(this._tasks.has(id)) {
			// remove the task
			this._tasks.delete(id);

			// remove the task from firebase
			this._ref.child(id).remove();
		}
	}

	// disconnect the listeners
	dispose() {
		this._ref.off();
	}
};
