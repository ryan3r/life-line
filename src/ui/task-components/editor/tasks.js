import {TaskComponent} from "./task-component";
import {EditTask} from "./edit-task";
import {TaskLink} from "./task-link";
import React from "react";
import {showCompleted} from "../stores/states";
import {maxNestingDepth} from "../constants";

export class TasksWidget extends TaskComponent {
	constructor() {
		super();

		this.state.children = [];

		showCompleted.bind(this);
	}

	componentWillMount() {
		super.componentWillMount();

		let depth;

		// we calculate the max depth
		if(this.props.toplevel) {
			// recalculate how deep we can go
			this.listen(window, "resize", () => {
				this.setState({
					depth: maxNestingDepth()
				});
			}, { passive: true });

			// calculate the max depth
			depth = maxNestingDepth();
		}

		this.setState({
			depth
		});
	}

	onTaskChildren(children) {
		// update the state
		this.setState({
			children
		});
	}

	onTaskState() {
		// one of our children has changed state refresh if that matters
		if(this.state.showCompleted) return;

		// update the state
		this.setState({
			children: this.task.children
		});
	}

	render() {
		// no task yet
		if(!this.task) return;

		let {children} = this.state;

		// get the number of layers of subitems we have left
		const depth = this.props.depth !== undefined ?
			this.props.depth :
			this.state.depth;

		// we can't add any more children
		if(depth === 0) {
			if(children.length > 0) {
				return <TaskLink id={this.task.id} className="hidden">
					{`${children.length} subtasks not shown`}
				</TaskLink>;
			}
			else {
				return null;
			}
		}

		let hiddenMsg;

		// limit the children for non-top level tasks
		/*if(this.task.children.length !== children.length) {
			// tell the user we hid some tasks
			hiddenMsg = <div className="hidden">
				<TaskLink id={this.task.id} className="hidden">
					{`${this.task.children.length - children.length} subtasks not shown`}
				</TaskLink>
			</div>;
		}*/

		return <div>
			{children.map(child => {
				return <EditTask
					key={child.id}
					task={child}
					depth={depth - 1}
					showCompleted={this.state.showCompleted}/>;
			})}
			{hiddenMsg}
		</div>;
	}
}
