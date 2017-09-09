import Events from "../../../util/events";

export class FocusController extends Events {
	constructor() {
		super();

		this.defineEvent("Focus", "_id");
	}

	// focus a task
	focusTask(id, start, end) {
		this._id = id;

		// unwrap a range
		if(start instanceof Range) {
			end = start.endOffset;
			start = start.startOffset;
		}

		// save the start and end
		this._start = start;
		this._end = end;

		// we should refocus for these
		this.trueFocus = true;

		// notify any listeners that we focused a task
		this.emit("Focus");

		// make sure that the task always gets focus
		this._focusTracker();
	}

	lostFocus(id) {
		if(this._id == id) {
			this._id = undefined;

			// we should not refocus for these
			this.trueFocus = false;

			// notify any listeners that we focused a task
			this.emit("Focus");

			// make sure that the task always gets focus
			this._focusTracker();
		}
	}

	// make sure that a task takes the focus
	_focusTracker() {
		setTimeout(() => {
			// the task we tried to focus has not claimed its focus revoke it
			if(document.activeElement == document.body) {
				this.lostFocus(this._id);
			}
		}, 50);
	}

	gotFocus(id) {
		// already got focus
		if(this._id == id) return;

		this._id = id;

		// we should not refocus for these
		this.trueFocus = false;

		// notify any listeners that we focused a task
		this.emit("Focus");
	}

	// select a task and keep the currenly selected range
	focusTaskWithCurrentRange(id, {length} = {}) {
		// get the current position
		const selection = getSelection();
		let position = selection.getRangeAt(0);

		// if we are at the end of a line stay there
		if(selection.type == "Caret" && position.startOffset === length) {
			position = -1;
		}

		this.focusTask(id, position);
	}

	// get the info for the range
	getRangeInfo(name) {
		let {_start: start, _end: end} = this;

		// go to the end of the name
		if(start === -1) {
			start = name.length;
		}

		// use the same start and end
		if(end === undefined) {
			end = start;
		}

		return {
			startAt: start,
			endAt: end
		};
	}

	// check if a task has focus
	hasFocus(id) {
		return this._id == id;
	}
}

// create the global focus controller
export let focusController = new FocusController();
