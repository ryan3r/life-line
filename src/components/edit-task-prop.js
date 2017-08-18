import {TaskComponent} from "./task-component";
import React from "react";

const DEBOUNCE_TIMER = 500;

export class EditTaskProp extends TaskComponent {
	constructor() {
		super();

		this.update = this.update.bind(this);
	}

	addListeners() {
		// clear any old save timers
		clearTimeout(this._debounce);

		// save the old task
		if(this.oldTask) {
			this.oldTask[this.props.prop] = this.el.innerText;
		}

		// make this the old task
		this.oldTask = this.task;

		// get the initial state
		if(this.el) {
			this.el.innerText = this.task[this.props.prop];
		}

		// listen for changes to the property
		this.addSub(
			this.task.on(this.props.prop, value => {
				// if we are not in focus
				if(value != this.el.innerText && document.activeElement != this.el) {
					this.el.innerText = value;
				}
			})
		);
	}

	update(e) {
		// clear the old timer
		clearTimeout(this._debounce);
		// don't save while the user is typing
		this._debounce = setTimeout(() => {
			this.props.task[this.props.prop] = this.el.innerText;
		}, DEBOUNCE_TIMER);
	}

	componentDidMount() {
		// set up the actual dom
		this.el.className = `editor ${this.props.className || ""}`;
		this.el.setAttribute("contenteditable", true);

		// add the event listeners
		this.listen(this.el, "input", this.update);
		this.listen(this.el, "keydown", this.props.onKeyDown);
		this.listen(this.el, "mousedown", this.props.onMouseDown);

		// set the content
		this.el.innerText = this.task[this.props.prop];

		// if this is a new or empty task draw focus to it
		if(this.task && !this.el.innerText) {
			this.el.focus();
		}
	}

	componentWillUnmount() {
		// clear any old save timers
		clearTimeout(this._debounce);

		// save current value
		this.task[this.props.prop] = this.el.innerText;
	}

	render() {
		// create an unmanaged component
		return <div ref={el => this.el = el}></div>;
	}
}
