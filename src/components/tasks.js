import {TaskComponent} from "./task-component";
import {EditTask} from "./edit-task";
import {TaskLink} from "./task-link";
import {
	BASELINE,
	INDENT_SIZE,
	SIDEBAR_OPEN,
	SIDEBAR_WIDTH,
	MAX_CHILDREN
} from "../constants";

// calculate the max nesting depth
// NOTE: the + 1 is because the first row of tasks are not indented
const maxNestingDepth = () => {
	const baseline = BASELINE + (innerWidth > SIDEBAR_OPEN ? SIDEBAR_WIDTH : 0);
	const depth = ((innerWidth - baseline) / INDENT_SIZE | 0) + 1;

	return depth < 1 ? 1 : depth;
};

export class TasksWidget extends TaskComponent {
	constructor() {
		super();

		this.state.children = [];
	}

	componentWillMount() {
		super.componentWillMount();

		let depth;

		// we calculate the max depth
		if(this.props.toplevel) {
			// recalculate how deep we can go
			this.listen(window, "resize", () => {
				this.setState({
					children: this.props.task.children,
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
				return <TaskLink id={this.task.id} class="hidden">
					{`${children.length} subtasks not shown`}
				</TaskLink>;
			}
			else {
				return "";
			}
		}

		let hiddenMsg;

		// limit the children for non-top level tasks
		if(!this.props.toplevel && children.length > MAX_CHILDREN) {
			// tell the user we hid some tasks
			hiddenMsg = <div class="hidden">
				<TaskLink id={this.task.id} class="hidden">
					{`${children.length - MAX_CHILDREN} subtasks not shown`}
				</TaskLink>
			</div>;

			// hide the tasks
			children = children.slice(0, MAX_CHILDREN);
		}

		return <div>
			{children.map(child => <EditTask task={child} depth={depth - 1}/>)}
			{hiddenMsg}
		</div>;
	}
}
