import {TaskProp} from "./task-prop";
import {EditTaskProp} from "./edit-task-prop";
import {ListsDrawer} from "./lists-drawer";
import {CurrentUser} from "./current-user";
import AppBar from "material-ui/AppBar";
import React from "react";

export let Header = ({task, onHeaderToggle}) => {
	return <AppBar
		title={<EditTaskProp className="invisible" task={task} prop="name"/>}
		onLeftIconButtonTouchTap={onHeaderToggle}
		iconElementRight={<CurrentUser/>}/>
}
