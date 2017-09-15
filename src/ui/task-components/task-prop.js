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
			return <div className={`${this.props.className || ""} description`}>
				{/* Make each line a div */}
				{this.state.value.split("\n").map((line, i) => {
					let parts = [];
					let j = -1;

					while(line.length) {
						// match a link
						const match = line.match(/https?:\/\/(?:www\.)?([^\/]+)\S*/);
						// the index at the end of the text
						const endIndex = match ? match.index : line.length;

						// get the text before the link
						if(endIndex > 0) {
							parts.push(<span key={++j}>{line.substr(0, endIndex)}</span>);
						}

						// get a link
						if(match) {
							parts.push(
								<a
									className="blue"
									key={++j}
									href={match[0]}
									target="_blank"
									rel="nofollow noopener noreferrer">
										{match[1]}
								</a>
							);
						}

						// remove the line
						line = line.substr(endIndex + (match ? match[0].length : 0));
					}

					return <div key={i}>{parts}</div>
				})}
			</div>;
		}

		// display the date
		if(propDef.editor == "date") {
			let style = this.props.style || {};

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

			// add the color
			style.color = color;

			// display the due date
			return <div style={style} className={this.props.className}>
				due {date.fromNow()}
			</div>;
		}

		return <span className={this.props.className}>{this.state.value}</span>;
	}
}
