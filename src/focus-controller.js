import {Events} from "./util";

export class FocusController extends Events {
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

		// notify any listeners that we focused a task
		this.emit(`focus-${id}`);
	}

	// select a task and keep the currenly selected range
	focusTaskWithCurrentRange(id) {
		this.focusTask(id, getSelection().getRangeAt(0));
	}

	// check if a task has focus and listen for focus changes
	onFocus(id, fn) {
		// check if the task is already focused
		if(this._id == id) {
			fn();
		}

		// add a focus listener
		return this.on(`focus-${id}`, fn);
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
