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

				// if our current task still exists stay on that one
				if(!task &&
					(!this.state.hoveredTask ||
					currentTask.tasks.get(this.state.hoveredTask.id))) return;

				this.setState({
					hoveredTask: task
				});
			})
		);
	}

	render() {
		let sidebar;

		// get the task to render
		const task = this.state.task ||
			this.state.hoveredTask ||
			this.props.task;

		// add the editors
		if(task) {
			const editors = TASK_PROPS
				// remove any non editable props
				.filter(prop => prop.editor &&
					// remove the name property when we arn't looking at the root task
					(this.props.task == task || prop.name != "name"))
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
