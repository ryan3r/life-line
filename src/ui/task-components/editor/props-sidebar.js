import Component from "../../component";
import React from "react";
import Drawer from "material-ui/Drawer";
import {PROP_SIDEBAR_WIDTH} from "../../../constants";
import {propDrawerTask} from "../../../stores/states";
import {focusController} from "./focus-controller";
import currentTask from "../../../data/current-task";
import EditTaskProp from "./edit-task-prop";
import {TASK_PROPS} from "../../../constants";
import AppBar from "material-ui/AppBar";

export default class PropDrawer extends Component {
	constructor() {
		super();

		propDrawerTask.bind(this, "task");
	}

	render() {
		let sidebar;

		// add the editors
		if(this.state.task) {
			const editors = TASK_PROPS
				// remove any non editable props
				.filter(prop => prop.editor)
				// create the editor
				.map(prop => {
					return <EditTaskProp
						key={prop.name}
						task={this.state.task}
						type={prop.editor}
						prop={prop.name}/>
				});

			sidebar = <div className="content">{editors}</div>;
		}

		return <Drawer
			docked={false}
			width={PROP_SIDEBAR_WIDTH}
			open={!!this.state.task}
			onRequestChange={() => propDrawerTask.set(undefined)}
			openSecondary={true}>
				<AppBar title="Task props" iconElementLeft={<span></span>}/>
				{sidebar}
		</Drawer>
	}
}
