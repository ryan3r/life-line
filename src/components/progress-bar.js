import {TaskComponent} from "./task-component";
import React from "react";
import LinearProgress from "material-ui/LinearProgress";

export class ProgressBar extends TaskComponent {
	onTaskState(state) {
		this.setState(state);
	}

	render() {
		// TODO: Change colors
		
		return <LinearProgress
			mode="determinate"
			value={this.state.percentDone * 100 | 0}
			style={{borderRadius: "0px"}}/>;
	}
}
