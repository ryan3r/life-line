import TaskComponent from "./task-component";
import React from "react";

// capitalize the first letter
const capitalizeFirst = word => word.charAt(0).toUpperCase() + word.substr(1);

export default class TaskProp extends TaskComponent {
	addListeners() {
		// get the initial state
		this.setState({
			value: this.task[this.props.prop]
		});

		// listen for changes to the property
		this.addSub(
			this.task.on(capitalizeFirst(this.props.prop), value => {
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
