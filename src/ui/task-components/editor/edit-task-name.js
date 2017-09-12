import TaskComponent from "../task-component";
import React from "react";
import {DEBOUNCE_TIMER} from "../../../constants";
import SelectionSnapshot from "../../../util/selection-snapshot";

export default class EditTaskName extends TaskComponent {
	addListeners() {
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
					this.el.innerText = value || "";

					// restore the previous selection
					if(snapshot) {
						snapshot.restore();
					}
				}
			})
		);
	}

	update = (e) => {
		this.props.task.name = this.el.innerText;
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

	render() {
		// create an unmanaged component
		return <div ref={el => this.el = el}></div>;
	}
}
