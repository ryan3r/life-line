import TaskComponent from "../task-component";
import React from "react";
import DatePicker from "material-ui/DatePicker";
import TimePicker from "material-ui/TimePicker";
import TextField from "material-ui/TextField";
import Toggle from "material-ui/Toggle";
import FlatButton from "material-ui/FlatButton";
const moment = require("moment");

// capitalize the first letter
const capitalizeFirst = word => word.charAt(0).toUpperCase() + word.substr(1);

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
		this.task[this.props.prop] = value;
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
						hintText={fieldName}
						onChange={this.setValue}
						value={this.state.value}
						formatDate={date => moment(date).format("MM/DD/YYYY")}
						firstDayOfWeek={0}/>
					<FlatButton onClick={() => this.setValue("")}>
						Remove date
					</FlatButton>
				</div>;

				break;

			// show a time picker
			case "time":
				editor = <TimePicker
					hintText={fieldName}
					onChange={this.setValue}
					value={this.state.value}/>;

				break;

			// show a switch
			case "switch":
				editor = <Toggle
					label={fieldName}
					defaultToggled={this.state.value}
					onChange={this.setValue}/>;

				break;

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
