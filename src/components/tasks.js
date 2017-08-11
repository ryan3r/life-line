import {TaskComponent} from "./task-component";
import {EditTask} from "./edit-task";
import {TaskWidget} from "./task";
import {TaskLink} from "./task-link";

// the approimate width of an edit task widget
const BASELINE = 350;

// the indentation for sub tasks
const INDENT_SIZE = 30;

// the sidebar sizing
const SIDEBAR_OPEN = 700;
const SIDEBAR_WIDTH = 300;

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

	componentDidMount() {
		super.componentDidMount();

		let depth;

		// we calculate the max depth
		if(this.props.depth === undefined) {
			// recalculate how deep we can go
			this.listen(window, "resize", () => {
				this.setState({
					children: this.props.task.children,
					depth: maxNestingDepth()
				});
			});

			// calculate the max depth
			depth = maxNestingDepth();
		}

		this.setState({
			depth
		});
	}

	addListeners() {
		// update the state
		this.setState({
			children: this.task.children
		});

		// a child child was removed
		this.task.on("children", () => {
			// refresh
			this.setState({
				children: this.task.children
			});
		});
	}

	render() {
		const {children} = this.state;

		// get the number of layers of subitems we have left
		const depth = this.props.depth !== undefined ?
			this.props.depth :
			this.state.depth;

		// we can't add any more children
		if(depth === 0) {
			return "";
		}

		return <div>
			{children.map(child => {
				if(this.props.editMode) {
					return <EditTask task={child} depth={depth - 1}/>;
				}
				else {
					return <TaskWidget task={child} depth={depth - 1}/>;
				}
			})}
		</div>;
	}
}
