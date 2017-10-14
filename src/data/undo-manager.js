import {TASK_PROPS} from "../constants";
import Events from "../util/events";

class UndoManager extends Events {
	constructor() {
		super();

		this.defineEvent("Current", "current");
	}

	/**
	 * Create a collection of changes that happened recently
	 */
	transaction(name) {
		this.current = new Transaction(name);

		// notify any listeners that we have a new transaction
		this.current.finalize = () => this.emit("Current");

		return this.current;
	}
}

class Transaction {
	constructor(name) {
		this.name = name;
		this.undone = false;
		this._deletedTasks = [];
	}

	/**
	 * Preserve any infomation necessary to recreate this task
	 */
	delete(task) {
		// ignore tasks with no name
		if(task.name == "") return;

		let raw = {};

		// copy over properties
		for(let prop of TASK_PROPS) {
			// only save properties that are defined
			if(task[prop.name] !== undefined) {
				raw[prop.name] = task[prop.name];
			}
		}

		// copy unlisted properties
		if(task._state !== undefined) raw.state = task._state;
		if(task.parent !== undefined) raw.parent = task.parent.id;

		// save the id
		raw.id = task.id;

		this._deletedTasks.push({
			raw,
			tasks: task._tasks
		});
	}

	/**
	 * Undo all the changes done in this transaction
	 */
	undo() {
		// only undo a transaction once
		if(this.undone) {
			throw new Error("This transaction has already been undone.");
		}

		// recreate the tasks that were deleted
		for(let deletedTask of this._deletedTasks) {
			deletedTask.tasks.create(deletedTask.raw);
		}

		// make this transaction as undone
		this.undone = true;
	}

	/**
	 * Check if this transation has any deleted tasks
	 */
	hasTasks() {
		return this._deletedTasks.length > 0;
	}
}

// create the global undo manager instance
let undoManager = new UndoManager();

export default undoManager;
