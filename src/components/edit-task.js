import {Component} from "./component";
import {TasksWidget} from "./tasks";
import {Checkbox} from "./checkbox";
import {EditTaskProp} from "./edit-task-prop";

export class EditTask extends Component {
	constructor() {
		super();

		this.create = this.create.bind(this);
		this.remove = this.remove.bind(this);
		this.handleKey = this.handleKey.bind(this);
	}

	componentDidMount() {
		// remove old subscriptions
		this.unsubscribeAll();

		// save the current task
		this.setState({
			task: this.props.task
		});

		// a child was added
		this.addSub(
			this.props.task.on("attach-child", () => {
				this.setState({
					task: this.props.task
				});
			})
		);

		// a child was removed
		this.addSub(
			this.props.task.on("detach-child", () => {
				this.setState({
					task: this.props.task
				});
			})
		);
	}

	create() {
		this.props.task.create();
	}

	remove() {
		this.props.task.delete();
	}

	handleKey(e) {
		// handle the enter key
		if(e.keyCode == 13) {
			e.preventDefault();

			// create a new sibling task
			this.props.task.parent.create();
		}
		// handle backspace when the input is empty
		else if(e.keyCode == 8 && e.target.value === "") {
			e.preventDefault();

			// focus the last sibling
			if(this.base.previousElementSibling) {
				this.base.previousElementSibling.querySelector("input").focus();
			}

			// delete this task
			this.props.task.delete();
		}
		// outdent tasks on tab
		else if(e.keyCode == 9 && e.shiftKey) {
			// get our current parent
			const {parent} = this.props.task;

			// attach this task to its grandparent after the current parent
			this.props.task.attachTo(parent.parent, parent);
		}
		// indent tasks on tab
		else if(e.keyCode == 9) {
			e.preventDefault();

			let attachTo = this.props.task.getLastSibling();

			if(attachTo) {
				this.props.task.attachTo(attachTo);
			}
		}
	}

	render() {
		// the task changed
		if(this.state.task && this.state.task !== this.props.task) {
			this.reboot();
		}

		// a button to add a subtask
		const addBtn = <button class="btn nopad" onClick={this.create}>
			<i class="material-icons">add</i>
		</button>;

		let endingAddBtn, inlineAddBtn;

		// display an add button if our children a visible
		if(this.props.depth > 0) {
			// if we have children put it at the end
			if(this.props.task.children.length > 0) {
				endingAddBtn = addBtn;
			}
			// if we don't have children keep it inline to save space
			else {
				inlineAddBtn = addBtn;
			}
		}

		return <div>
			<div class="task flex flex-vcenter" style={`margin-right: ${20 * this.props.depth}px`}>
				<Checkbox task={this.props.task}/>
				<EditTaskProp class="flex-fill" task={this.props.task} prop="name"
					onKeyDown={this.handleKey}/>
				{inlineAddBtn}
				<button class="btn" onClick={this.remove}>
					<i class="material-icons">clear</i>
				</button>
			</div>
			<div class="subtasks">
				<TasksWidget editMode task={this.props.task} depth={this.props.depth}/>
				{endingAddBtn}
			</div>
		</div>;
	}
};
