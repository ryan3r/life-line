import EditTaskName from "../task-components/editor/edit-task-name";
import AppBar from "material-ui/AppBar";
import currentTask from "../../data/current-task";
import React from "react";
import {SIDEBAR_OPEN} from "../../constants";
import Component from "../component";
import HeaderMenu from "./header-menu";
import {dockedStore, drawerOpen} from "../../stores/states";

export default class Header extends Component {
	constructor() {
		super();

		dockedStore.bind(this);
	}

	componentWillMount() {
		// store the current task in the state
		this.addSub(
			currentTask.onTask(task => {
				this.setState({
					task
				});
			})
		);
	}

	render() {
		return <AppBar
			title={<EditTaskName
				className="invisible"
				task={this.state.task}
				prop="name"/>}
			onLeftIconButtonTouchTap={() => drawerOpen.set(true)}
			style={{flexShrink: 0}}
			iconElementLeft={this.state.docked ? <span></span> : null}
			iconElementRight={<HeaderMenu task={this.state.task}/>}/>
	}
}
