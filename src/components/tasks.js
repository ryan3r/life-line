import {Component} from "./component";
import {EditTask} from "./edit-task";
import {TaskWidget} from "./task";
import {TaskLink} from "./task-link";
import {Subscription} from "../util";

// the approimate width of an edit task widget
const BASELINE = 305;

// the indentation for sub tasks
const INDENT_SIZE = 30;

// the sidebar sizing
const SIDEBAR_OPEN = 650;
const SIDEBAR_WIDTH = 250;

// calculate the max nesting depth
// NOTE: the + 1 is because the first row of tasks are not indented
const maxNestingDepth = () => {
	const baseline = BASELINE + (innerWidth > SIDEBAR_OPEN ? SIDEBAR_WIDTH : 0);
	const depth = ((innerWidth - baseline) / INDENT_SIZE | 0) + 1;

	return depth < 1 ? 1 : depth;
};

export class TasksWidget extends Component {
	constructor() {
		super();

		this.state.children = [];
	}

	componentDidMount() {
		let depth;

		// we calculate the max depth
		if(this.props.depth === undefined) {
			// recalculate how deep we can go
			const resize = () => {
				this.setState({
					children: this.props.task.children,
					depth: maxNestingDepth()
				});
			};

			window.addEventListener("resize", resize);

			// add a subsciption for the listeners
			this.addSub(new Subscription(() => {
				window.removeEventListener("resize", resize);
			}));

			// calculate the max depth
			depth = maxNestingDepth();
		}

		// update the state
		this.setState({
			children: this.props.task.children,
			depth
		});

		// a child child was removed
		this.props.task.on("detach-child", () => {
			// refresh
			this.setState({
				children: this.props.task.children,
				depth: this.state.depth
			});
		});

		// a child child was added
		this.props.task.on("attach-child", () => {
			// refresh
			this.setState({
				children: this.props.task.children,
				depth: this.state.depth
			});
		});
	}

	render() {
		const {children} = this.state;

		// the task changed
		if(children && children !== this.props.task.children) {
			this.reboot();
		}

		// get the number of layers of subitems we have left
		const depth = this.props.depth !== undefined ?
			this.props.depth :
			this.state.depth;

		// we can't add any more children
		if(depth === 0) {
			// show the number of children we are hiding
			if(children.length > 0) {
				return <TaskLink class="hidden" id={this.props.task.id}>
					{`${children.length} subtask${children.length == 1 ? "" : "s"} not shown`}
				</TaskLink>;
			}
			// no children are hidden
			else {
				return "";
			}
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
