import TaskComponent from "../task-component";
import React from "react";
import LinearProgress from "material-ui/LinearProgress";
import {blue500, green700} from "material-ui/styles/colors";

export default class ProgressBar extends TaskComponent {
	onTaskState(state) {
		this.setState(state);
	}

	render() {
		return <LinearProgress
			mode="determinate"
			value={this.state.percentDone * 100 | 0}
			style={{borderRadius: "0px"}}
			color={this.state.type == "done" ? green700 : blue500}/>;
	}
}
