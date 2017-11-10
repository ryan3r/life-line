import TaskComponent from "../task-component";
import React from "react";
import DatePicker from "material-ui/DatePicker";
import TimePicker from "material-ui/TimePicker";
import TextField from "material-ui/TextField";
import Toggle from "material-ui/Toggle";
import FlatButton from "material-ui/FlatButton";
const moment = require("moment");
import capitalizeFirst from "../../../util/capitalize-first";
import {DAY_LETTER} from "../../../constants";

export default class EditTaskProp extends TaskComponent {
	addListeners() {
		// listen to value changes from the tasks
		this.taskDisposable.add(
			this.task["on" + capitalizeFirst(this.props.prop)](value => {
				this.setState({ value });
			})
		);
	}

	// take the value from a field
	setValue = (_, value) => {
		this.task[this.props.prop] = value || undefined;
	}

	// take the date value from a field
	setDate = (_, value) => {
		const oldDate = this.task[this.props.prop];

		// save the old time
		if(oldDate) {
			value.setHours(oldDate.getHours());
			value.setMinutes(oldDate.getMinutes());
		}

		this.task[this.props.prop] = value;
	}

	// toggle the state of a day
	toggleState = i => {
		return () => {
			this.task[this.props.prop] = +this.state.value ^ (1 << i);
		};
	}

	render() {
		let editor;
		// the pretty name for the field
		const fieldName = capitalizeFirst(this.props.prop);

		switch(this.props.type) {
			// show a date picker
			case "date":
				editor = <div>
					<DatePicker
						hintText={fieldName + " date"}
						onChange={this.setDate}
						value={this.state.value}
						formatDate={date => moment(date).format("MM/DD/YYYY")}
						firstDayOfWeek={0}/>
					<TimePicker
						hintText={fieldName + " time"}
						onChange={this.setValue}
						value={this.state.value}/>
					<FlatButton onClick={() => this.setValue(undefined)}>
						Remove date
					</FlatButton>
				</div>;

				break;

			// show a switch
			case "switch":
				editor = <Toggle
					label={fieldName}
					defaultToggled={this.state.value}
					onToggle={this.setValue}/>;

				break;

			// pick days of the week
			case "days":
				let days = [];
				const value = +this.state.value;

				// render the day buttons
				for(let i = 1; i <= 7; ++i) {
					days.push(
						<FlatButton
							primary={!!(value & (1 << i))}
							key={i}
							label={DAY_LETTER[i - 1]}
							onClick={this.toggleState(i)}/>
					);
				}

				editor = <div>{days}</div>;

				break;

			// show a textarea
			case "textarea":
				editor = <TextField
					floatingLabelText={fieldName}
					onChange={this.setValue}
					value={this.state.value || ""}
					multiLine={true}
					rows={1}/>
				break

			// other wise show a text field
			default:
				editor = <TextField
					floatingLabelText={fieldName}
					onChange={this.setValue}
					value={this.state.value}/>;

				break;
		}

		return <div style={{padding: "10px"}}>
			{editor}
		</div>;
	}
}
