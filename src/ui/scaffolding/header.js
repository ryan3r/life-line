import TaskProp from "../task-components/task-prop";
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
		let headerMenu = null;

		// use what ever title we are given
		if(this.state.pageTitle) {
			title = this.state.pageTitle;
		}
		else if(this.state.task) {
			// edit the current task
			title = <TaskProp
				task={this.state.task}
				prop="name"/>;

			// Show editing view options
			headerMenu = <HeaderMenu task={this.state.task}/>;
		}

		return <AppBar
			title={title}
			onLeftIconButtonTouchTap={() => drawerOpen.set(true)}
			style={{flexShrink: 0}}
			iconElementLeft={this.state.docked ? <span></span> : null}
			iconElementRight={headerMenu}/>
	}
}
