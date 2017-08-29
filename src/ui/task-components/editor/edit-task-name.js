import TaskComponent from "../task-component";
import React from "react";
import {DEBOUNCE_TIMER} from "../../../constants";

export default class EditTaskName extends TaskComponent {
	addListeners() {
		// clear any old save timers
		clearTimeout(this._debounce);

		// save the old task
		if(this.oldTask) {
			this.oldTask.name = this.el.innerText;
		}

		// make this the old task
		this.oldTask = this.task;

		// listen for changes to the property
		this.addSub(
			this.task.onName(value => {
				// if we are not in focus
				if(this.el && value != this.el.innerText) {
					let start, end, node;
					const restoreSelection = document.activeElement == this.el;

					// save the current selection
					if(restoreSelection) {
						let range = getSelection().getRangeAt(0);

						start = range.startOffset;
						end = range.endOffset;
						node = range.startContainer;
					}

					// set the new value
					this.el.innerText = value;

					// restore the previous selection
					if(restoreSelection) {
						let selection = getSelection();

						// remove the old ranges
						selection.removeAllRanges();

						// recreate the selection
						let range = document.createRange();

						// make sure the end is still inside the node
						if(node.textContent.length < end) {
							end = node.textContent.length;
						}

						range.setStart(node, start);
						range.setEnd(node, end);

						// reselect content
						selection.addRange(range);
					}
				}
			})
		);
	}

	update = (e) => {
		// clear the old timer
		clearTimeout(this._debounce);
		// don't save while the user is typing
		this._debounce = setTimeout(() => {
			this.props.task.name = this.el.innerText;
		}, DEBOUNCE_TIMER);
	}

	componentDidMount() {
		// set up the actual dom
		this.el.className = `editor ${this.props.className || ""}`;
		this.el.setAttribute("contenteditable", true);

		// add the event listeners
		this.listen(this.el, "input", this.update);
		this.listen(this.el, "keydown", this.props.onKeyDown);

		// set the content
		if(this.task) {
			this.el.innerText = this.task.name;
		}
	}

	componentWillUnmount() {
		// clear any old save timers
		clearTimeout(this._debounce);

		// save current value
		this.task.name = this.el.innerText;
	}

	render() {
		// create an unmanaged component
		return <div ref={el => this.el = el}></div>;
	}
}
