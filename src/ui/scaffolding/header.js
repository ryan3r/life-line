import TaskProp from "../task-components/task-prop";
import AppBar from "material-ui/AppBar";
import currentTask from "../../data/current-task";
import React from "react";
import {SIDEBAR_OPEN} from "../../constants";
import Component from "../component";
import HeaderMenu from "./header-menu";
import {dockedStore, drawerOpen, pageTitle} from "../../stores/states";
import {focusController} from "../task-components/editor/focus-controller";
import EditToolbar from "../task-components/editor/edit-toolbar";
import {green500} from "material-ui/styles/colors";

// get the theme color meta
const themeColor = document.querySelector("meta[name=theme-color]");

export default class Header extends Component {
	constructor() {
		super();

		dockedStore.bind(this);
		pageTitle.bind(this);

		// show the editing menu when we are editing
		this.addSub(
			focusController.onFocus(id => {
				// set the initial state
				if(!this.updater.isMounted(this)) {
					this.state.focused = id;
				}
				// update the state
				else {
					this.setState({
						focused: id
					});
				}
			})
		);
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

		// show the edit toolbar when we are editing
		if(this.state.focused) {
			return <EditToolbar taskId={this.state.focused}/>;
		}

		// switch the theme color
		themeColor.setAttribute("content", green500);

		return <AppBar
			className="no-print"
			title={title}
			onLeftIconButtonTouchTap={() => drawerOpen.set(true)}
			style={{flexShrink: 0}}
			showMenuIconButton={!this.state.docked}
			iconElementRight={headerMenu}/>
	}
}
