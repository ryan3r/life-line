import {Component} from "./component";
import React from "react";

export class TaskComponent extends Component {
	componentWillMount() {
		this.task = this.props.task;

		// no task yet
		if(!this.task) return;

		// listen to all our task related events
		this.addListeners();
	}

	componentWillReceiveProps(props) {
		// we changed tasks
		if(this.task != props.task) {
			// remove all task listeners
			this.unsubscribeAll("task");

			this.task = props.task;

			// listen to all our task related events
			this.addListeners();
		}
	}

	addListeners() {
		// get all the methods
		const methods = Object.getOwnPropertyNames(Object.getPrototypeOf(this));

		for(let key of methods) {
			// we found a task related method
			if(key.substr(0, 6) == "onTask") {
				let prop = key.substr(6).toLowerCase();

				// add the listener
				this.addSub(
					this.task.on(prop, this[key].bind(this))
				);

				// pass in the current value
				this[key](this.task[prop]);
			}
		}
	}
}
