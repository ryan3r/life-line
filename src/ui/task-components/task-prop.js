import {TaskComponent} from "./task-component";
import React from "react";

export class TaskProp extends TaskComponent {
	addListeners() {
		// get the initial state
		this.setState({
			value: this.task[this.props.prop]
		});

		// listen for changes to the property
		this.addSub(
			this.task.on(this.props.prop, value => {
				this.setState({
					value
				});
			})
		);
	}

	render() {
		return <span>{this.state.value}</span>;
	}
}
