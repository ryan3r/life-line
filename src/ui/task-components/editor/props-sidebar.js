import Component from "../../component";
import React from "react";
import Drawer from "material-ui/Drawer";
import {PROP_SIDEBAR_WIDTH} from "../../../constants";
import {propDrawerTask, dockedPropStore} from "../../../stores/states";
import {focusController} from "./focus-controller";
import currentTask from "../../../data/current-task";
import EditTaskProp from "./edit-task-prop";
import {TASK_PROPS} from "../../../constants";
import AppBar from "material-ui/AppBar";

export default class PropDrawer extends Component {
	constructor() {
		super();

		propDrawerTask.bind(this, "task");
		dockedPropStore.bind(this, "docked");
	}

	componentWillMount() {
		// listen to focus changes
		this.addSub(
			focusController.onFocus(id => {
				const task = currentTask.tasks.get(id);

				// no task to switch to
				if(!task) return;

				this.setState({
					hoveredTask: task
				});
			})
		);
	}

	render() {
		let sidebar;

		// get the task to render
		const task = this.state.task || this.state.hoveredTask;

		// add the editors
		if(task) {
			const editors = TASK_PROPS
				// remove any non editable props
				.filter(prop => prop.editor)
				// create the editor
				.map(prop => {
					return <EditTaskProp
						key={prop.name}
						task={task}
						type={prop.editor}
						prop={prop.name}/>
				});

			sidebar = <div>{editors}</div>;
		}

		// determine the open state
		let open;

		if(this.state.task !== undefined) {
			open = true;
		}

		return <Drawer
			docked={this.state.docked}
			width={PROP_SIDEBAR_WIDTH}
			open={open}
			onRequestChange={() => propDrawerTask.set(undefined)}
			openSecondary={true}>
				<AppBar title="Task props" iconElementLeft={<span></span>}/>
				{sidebar}
		</Drawer>
	}
}
