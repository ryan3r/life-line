import EditTaskName from "../task-components/editor/edit-task-name";
import AppBar from "material-ui/AppBar";
import currentTask from "../../data/current-task";
import React from "react";
import {SIDEBAR_OPEN} from "../../constants";
import Component from "../component";
import HeaderMenu from "./header-menu";
import {dockedStore, drawerOpen, pageTitle} from "../../stores/states";

export default class Header extends Component {
	constructor() {
		super();

		dockedStore.bind(this);
		pageTitle.bind(this);
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
		let title = null;

		// use what ever title we are given
		if(this.state.pageTitle) {
			title = this.state.pageTitle;
		}
		// edit the current task
		else if(this.state.task) {
			title = <EditTaskName
				className="invisible"
				task={this.state.task}
				prop="name"/>;
		}

		return <AppBar
			title={title}
			onLeftIconButtonTouchTap={() => drawerOpen.set(true)}
			style={{flexShrink: 0}}
			iconElementLeft={this.state.docked ? <span></span> : null}
			iconElementRight={<HeaderMenu task={this.state.task}/>}/>
	}
}
