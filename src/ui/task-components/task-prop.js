import TaskComponent from "./task-component";
import React from "react";
const moment = require("moment");
import capitalizeFirst from "../../util/capitalize-first";
import {TASK_PROPS} from "../../constants";

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

		// find the current task prop
		const propDef = TASK_PROPS.find(prop => prop.name == this.props.prop);

		// display the description
		if(propDef.editor == "textarea") {
			return <div>
				{/* Make each line a div */}
				{this.state.value.split("\n").map((line, i) => {
					return <div key={i}>{line}</div>
				})}
			</div>;
		}

		// display the date
		if(propDef.editor == "date") {
			const date = moment(this.state.value);
			// pick the color for this date
			let color = "black";
			// the number of days from now
			const days = date.diff(moment(), "days");

			// overdue is red
			if(date.isSameOrBefore(moment(), "days")) {
				color = "red";
			}
			// next few days is yellow
			else if(days <= 2) {
				color = "orange";
			}
			// next 5 days is cyan
			else if(days <= 5) {
				color = "#0dd";
			}

			// display the due date
			return <div style={{color, marginBottom: 15}}>
				due {date.fromNow()}
			</div>;
		}

		return <span>{this.state.value}</span>;
	}
}
