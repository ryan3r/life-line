import Component from "../../component";
import React from "react";
import AppBar from "material-ui/AppBar";
import IconButton from "material-ui/IconButton";
import OutdentIcon from "material-ui/svg-icons/editor/format-indent-decrease";
import IndentIcon from "material-ui/svg-icons/editor/format-indent-increase";
import AddIcon from "material-ui/svg-icons/content/add";
import DeleteIcon from "material-ui/svg-icons/action/delete";
import CloseIcon from "material-ui/svg-icons/navigation/close";
import currentTask from "../../../data/current-task";
import {propDrawerTask} from "../../../stores/states";
import {router} from "../../../router";
import {focusController} from "./focus-controller";
import {outdent, indent, moveTo} from "./task-utils";
import UpIcon from "material-ui/svg-icons/hardware/keyboard-arrow-up";
import DownIcon from "material-ui/svg-icons/hardware/keyboard-arrow-down";
import EditIcon from "material-ui/svg-icons/content/create";

// get the theme color meta
const themeColor = document.querySelector("meta[name=theme-color]");

export default class EditToolbar extends Component {
	// get the current task
	getTask() {
		return currentTask.tasks.get(this.props.taskId);
	}

	// create a new child task
	create = e => {
		e.preventDefault();

		const task = this.getTask();

		// we need to change the view
		if(task.depth <= 0) {
			router.openTask(task.id);
		}

		let newTask = task.create();

		// focus the new task
		focusController.focusTask(newTask.id, 0);
	}

	// indent the current task
	indent  = e => {
		e.preventDefault();

		indent(this.getTask());
	}

	// outdent the current task
	outdent = e => {
		e.preventDefault();

		outdent(this.getTask());
	}

	// delete the current task
	delete = e => {
		e.preventDefault();

		this.getTask().delete();
	}

	// show this in the props sidebar
	showSidebar = e => {
		e.preventDefault();

		propDrawerTask.set(this.getTask());
	}

	// swap with the task above
	moveUp = e => {
		e.preventDefault();

		moveTo(this.getTask(), true);
	}

	// swap with the task below
	moveDown = e => {
		e.preventDefault();

		moveTo(this.getTask(), false);
	}

	render() {
		// switch themes
		themeColor.setAttribute("content", "#673AB7");

		// make sure the butons contrast with the toolbar
		const iconStyles = {
			color: "#fff"
		};

		// the editing icons
		const BTNS = [
			{ name: "create", icon: <AddIcon/> },
			{ name: "moveUp", icon: <UpIcon/> },
			{ name: "moveDown", icon: <DownIcon/> },
			{ name: "outdent", icon: <OutdentIcon/> },
			{ name: "indent", icon: <IndentIcon/> },
			{ name: "showSidebar", icon: <EditIcon/> },
			{ name: "delete", icon: <DeleteIcon/> }
		];

		// the build editing icons
		const icons = <div>
			{BTNS.map(({name, icon}) => {
				return <IconButton
					onMouseDown={this[name]}
					iconStyle={iconStyles}
					key={name}>
						{icon}
				</IconButton>
			})}
		</div>;

		// the button to exit editing mode
		const closeBtn = <IconButton iconStyle={iconStyles}>
			<CloseIcon/>
		</IconButton>;

		return <AppBar
			showMenuIconButton={innerWidth > 400}
			iconElementRight={icons}
			iconElementLeft={closeBtn}
			style={{backgroundColor: "#673AB7"}}/>
	}
}
