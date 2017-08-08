import {Component} from "./component";
import {TasksWidget} from "./tasks";
import {Checkbox} from "./checkbox";
import {EditTaskProp} from "./edit-task-prop";

// the task id that was in focus before it was moved
let nextActiveElement;

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
		let preventDefault = true;

		// handle the enter key
		if(e.keyCode == 13) {
			// create a new sibling task
			this.props.task.parent.create();
		}
		// handle backspace when the input is empty
		else if(e.keyCode == 8 && e.target.value === "") {
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

			// no grandparent to add this to
			if(!parent.parent) return;

			// make sure we foucs this task when we rerender
			nextActiveElement = this.props.task.id;

			// attach this task to its grandparent after the current parent
			this.props.task.attachTo(parent.parent, parent);
		}
		// indent tasks on tab
		else if(e.keyCode == 9) {
			// get the sibling that will become the parent
			let attachTo = this.props.task.getLastSibling();

			if(attachTo) {
				// make sure we foucs this task when we rerender
				nextActiveElement = this.props.task.id;

				this.props.task.attachTo(attachTo);
			}
		}
		// up arrow move to the next task
		else if(e.keyCode == 38) {
			let target;

			// go to the child above us
			if(this.base.previousElementSibling) {
				target = this.base.previousElementSibling;

				// find the last child in this element
				for(;;) {
					let subtasks = target.querySelector(".subtasks>div");

					// go to the last child in this element
					if(subtasks.childElementCount > 0) {
						target = subtasks.lastElementChild;
					}
					// we found the next element
					else {
						break;
					}
				}
			}
			// go to our parent
			else {
				// NOTE: Event if we are the first element in the entire list
				// 		this jumps back to the same element

				target = this.base
					.parentElement // <div> created by Tasks
					.parentElement // .subtasks
					.parentElement // <div> wrapping the parent task
					.firstElementChild; // the actual task
			}

			target.querySelector("input").focus();
		}
		// down arrow move to the last task
		else if(e.keyCode == 40) {
			let target = this.base;
			let subtasks = this.base.querySelector(".subtasks>div");

			// go to the first child in this element
			if(subtasks.childElementCount > 0) {
				target = subtasks.firstElementChild;
			}
			// go to the next sibling
			else if(this.base.nextElementSibling) {
				target = this.base.nextElementSibling;
			}
			// go to our parent
			else {
				for(;;) {
					target = target
						.parentElement // <div> created by Tasks
						.parentElement // .subtasks
						.parentElement; // <div> wrapping the parent task

					// we found a task to go to
					if(target.nextElementSibling) {
						target = target.nextElementSibling

						break;
					}
					// we are on the last task
					else if(target.className !== "") {
						target = undefined;

						break;
					}
				}
			}

			// focus the element
			if(target) {
				target.querySelector("input").focus();
			}
		}
		// if none of our handlers were called go with the brower default
		else {
			preventDefault = false;
		}

		if(preventDefault) {
			e.preventDefault();
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

		// this element should be focused
		if(this.props.task && nextActiveElement == this.props.task.id && this.base) {
			nextActiveElement = undefined;

			// focus the imput
			this.base.querySelector("input").focus();
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
