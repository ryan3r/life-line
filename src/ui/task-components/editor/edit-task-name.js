import TaskComponent from "../task-component";
import React from "react";
import {DEBOUNCE_TIMER} from "../../../constants";
import SelectionSnapshot from "../../../util/selection-snapshot";

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
					let snapshot;

					// save the current selection
					if(document.activeElement == this.el) {
						snapshot = new SelectionSnapshot();
					}

					// set the new value
					this.el.innerText = value;

					// restore the previous selection
					if(snapshot) {
						snapshot.restore();
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

		// clear the formatting on paste
		this.listen(this.el, "paste", () => {
			// wait for the paste to execute
			setTimeout(() => {
				// save the current selection
				let snapshot = new SelectionSnapshot();

				// clear the formatting
		        this.el.innerText = this.el.innerText;

				snapshot.restore(this.el.childNodes[0]);
		    }, 0);
		});

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
