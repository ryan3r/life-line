import {TaskComponent} from "./task-component";
import {TasksWidget} from "./tasks";
import {Checkbox} from "./checkbox";
import {EditTaskProp} from "./edit-task-prop";
import {TaskLink} from "./task-link";
import {router} from "../router";
import {MAX_CHILDREN} from "../constants";
import React from "react";
import MoreVertIcon from "material-ui/svg-icons/navigation/more-vert";
import IconMenu from "material-ui/IconMenu";
import MenuItem from "material-ui/MenuItem";
import IconButton from "material-ui/IconButton";

// the task id that was in focus before it was moved
let nextActiveElement;

export class EditTask extends TaskComponent {
	constructor() {
		super();

		this.create = this.create.bind(this);
		this.remove = this.remove.bind(this);
		this.open = this.open.bind(this);
		this.handleKey = this.handleKey.bind(this);
	}

	addListeners() {
		super.addListeners();

		// autofocus new tasks
		if(this.task.name === "" && this.base) {
			this.base.querySelector(".editor").focus();
		}
	}

	onTaskChildren() {
		// save the current task
		this.setState({
			task: this.task
		});
	}

	onTaskState() {
		// save the current task
		this.setState({
			task: this.task
		});
	}

	create() {
		// we need to change the view
		if(this.props.depth <= 0) {
			router.openTask(this.task.id);
		}

		this.task.create();
	}

	remove() {
		this.task.delete();
	}

	open(e) {
		// we were ctrl clicked open this task
		if(e.ctrlKey) {
			e.preventDefault();

			this.actualOpen();
		}
	}

	actualOpen = () => {
		router.openTask(this.task.id);
	}

	handleKey(e) {
		let preventDefault = true;

		// create a new child on ctrl+enter
		if(e.keyCode == 13 && e.ctrlKey) {
			this.task.create();
		}
		// handle the enter key
		else if(e.keyCode == 13) {
			// we have all the children
			const parentIsFull = this.task.parent.childCountExcedes({
				maxChildren: MAX_CHILDREN,
				showCompleted: this.props.showCompleted
			});

			// open the parent since the children are hidden
			if(parentIsFull) {
				router.openTask(this.task.parent.id);
			}

			// create a new sibling task
			this.task.parent.create();
		}
		// handle backspace when the input is empty
		else if(e.keyCode == 8 && e.target.innerText === "") {
			// focus the last sibling
			if(this.base.previousElementSibling) {
				this.base.previousElementSibling.querySelector(".editor").focus();
			}
			// focus the parent
			else {
				const parentInput = this.base
					.parentElement // <div> created by Tasks
					.parentElement // .subtasks
					.parentElement // <div> wrapping the parent task
					.querySelector(".editor");

				// if this is not the top level focus the parent
				if(parentInput) {
					parentInput.focus();
				}
			}

			// delete this task
			this.task.delete();
		}
		// outdent tasks on tab
		else if(e.keyCode == 9 && e.shiftKey) {
			// get our current parent
			const {parent} = this.task;

			// no grandparent to add this to
			if(!parent.parent) return;

			// make sure we foucs this task when we rerender
			nextActiveElement = this.task.id;

			// the task we are being moved to is not shown
			if(parent.id == router.taskId) {
				router.openTask(parent.parent.id);
			}

			// attach this task to its grandparent after the current parent
			this.task.attachTo(parent.parent, parent);
		}
		// indent tasks on tab
		else if(e.keyCode == 9) {
			// get the sibling that will become the parent
			let attachTo = this.task.getLastSibling();

			if(attachTo) {
				// make sure we foucs this task when we rerender
				nextActiveElement = this.task.id;

				const parentIsFull = attachTo.childCountExcedes({
					maxChildren: MAX_CHILDREN,
					showCompleted: this.props.showCompleted
				});

				// this tasks children are hidden open it so we can be seen
				if(parentIsFull) {
					router.openTask(attachTo.id);
				}

				this.task.attachTo(attachTo);
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

						// we found a not subtasks shown message
						if(target.classList.contains("hidden")) {
							target = target.previousElementSibling;
						}
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

			target.querySelector(".editor").focus();
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
			else if(this.base.nextElementSibling &&
				!this.base.nextElementSibling.classList.contains("hidden")) {
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
				target.querySelector(".editor").focus();
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

	componentDidMount() {
		// check if we should have focus
		if(this.task.id == nextActiveElement) {
			this.base.querySelector(".editor").focus();
		}
	}

	render() {
		// the styles to apply to the menu icon
		const iconStyles = {
		    width: 24,
		    height: 24,
		    padding: 0
		};

		const menuIcon = <IconButton
			style={iconStyles}
			iconStyle={iconStyles}>
				<MoreVertIcon/>
		</IconButton>;

		return <div ref={base => this.base = base}>
			<div className={`task flex flex-vcenter ${this.task.state.type}`}>
				<Checkbox task={this.task}/>
				<EditTaskProp className="flex-fill" task={this.task} prop="name"
					onKeyDown={this.handleKey} onMouseDown={this.open}/>
				<IconMenu
					iconButtonElement={menuIcon}>
						<MenuItem primaryText="Open" onClick={this.actualOpen}/>
						<MenuItem primaryText="Add subtask" onClick={this.create}/>
						<MenuItem primaryText="Delete" onClick={this.remove}/>
				</IconMenu>
			</div>
			<div className="subtasks">
				<TasksWidget editMode task={this.task} depth={this.props.depth}
					showCompleted={this.props.showCompleted}/>
			</div>
		</div>;
	}
};
