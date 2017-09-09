import TaskComponent from "../task-component";
import EditTask from "./edit-task";
import TaskLink from "../task-link";
import React from "react";
import {showCompleted} from "../../../stores/states";
import {maxNestingDepth} from "../../../constants";
import RaisedButton from "material-ui/RaisedButton";
import {focusController} from "./focus-controller";
import Debouncer from "../../../util/debouncer";

export default class TasksWidget extends TaskComponent {
	constructor() {
		super();

		this.state.children = [];

		showCompleted.bind(this);

		this._refreshTimer = new Debouncer(() => {
			this.setState({
				children: this.task.children
			});
		}, 700);
	}

	componentWillUnmount() {
		super.componentWillUnmount();

		this._refreshTimer.cancel();
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

	onTaskHideChildren() {
		// update the state
		this.setState({
			children: this.task.children
		});
	}

	// create a new child task for the root task
	createChild = () => {
		const task = this.task.create();

		// focus that child
		focusController.focusTask(task.id, 0);
	}

	render() {
		// no task yet
		if(!this.task) return;

		if(this.props.toplevel && this.task.children.length === 0) {
			return <div style={{ textAlign: "center" }}>
				<h2 style={{ marginBottom: "50px" }}>No tasks yet</h2>
				<RaisedButton
					label="Create one"
					onClick={this.createChild}
					primary={true}/>
			</div>;
		}

		// our children are hidden
		if(this.task.hideChildren && !this.props.toplevel) {
			return null;
		}

		let {children} = this.state;

		// hide completed tasks
		if(!this.state.showCompleted) {
			let hasAnimatingChildren = false;

			children = children.filter(task => {
				// calculate the time since the state change
				const doneTime = Date.now() - task._stateModified;

				if(task.state.type == "done" && doneTime < 500) {
					hasAnimatingChildren = true;

					return true;
				}

				return task.state.type !== "done";;
			});

			// refresh after the animations are done
			if(hasAnimatingChildren) {
				this._refreshTimer.trigger();
			}
		}

		// get the number of layers of subitems we have left
		const depth = this.props.depth !== undefined ?
			this.props.depth :
			this.state.depth;

		// we can't add any more children
		if(depth === 0) {
			return null;
		}

		return <div>
			{children.map(child => {
				return <EditTask
					toplevel={this.props.toplevel}
					key={child.id}
					task={child}
					depth={depth - 1}
					showCompleted={this.state.showCompleted}/>;
			})}
		</div>;
	}
}
