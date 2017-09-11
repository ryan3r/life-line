import TaskComponent from "./task-component";
import React from "react";
const moment = require("moment");
import capitalizeFirst from "../../util/capitalize-first";

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
		// nothing to show
		if(!this.state.value) return null;

		// display the description
		if(this.props.prop == "description") {
			return <div>
				{/* Make each line a div */}
				{this.state.value.split("\n").map((line, i) => {
					return <div key={i}>{line}</div>
				})}
			</div>;
		}

		// display the date
		if(this.props.prop == "due") {
			return <div style={{color: "purple", marginBottom: 15}}>
				due {moment(this.state.value).fromNow()}
			</div>;
		}

		return <span>{this.state.value}</span>;
	}
}
