import {TaskComponent} from "./task-component";
import {TasksWidget} from "./tasks";
import {Checkbox} from "./checkbox";
import {EditTaskProp} from "./edit-task-prop";
import {TaskLink} from "./task-link";
import {router} from "../router";

// the task id that was in focus before it was moved
let nextActiveElement;

export class EditTask extends TaskComponent {
	constructor() {
		super();

		this.create = this.create.bind(this);
		this.remove = this.remove.bind(this);
		this.handleKey = this.handleKey.bind(this);
		this.toggleMenu = this.toggleMenu.bind(this);
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

	handleKey(e) {
		let preventDefault = true;

		// create a new child on ctrl+enter
		if(e.keyCode == 13 && e.ctrlKey) {
			this.task.create();
		}
		// handle the enter key
		else if(e.keyCode == 13) {
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

 	// toggle the menu for this task
	toggleMenu(e) {
		// toggle the menu state
		let toState = {
			menuOpen: !this.state.menuOpen
		};

		// we are opening the menu
		if(toState.menuOpen) {
			const {top, right} = e.target.getBoundingClientRect();

			toState.menuX = innerWidth - right;
			toState.menuY = top;

			// too close to the bottom
			toState.menuCoordsAreBottom = top > innerHeight / 2;
		}

		// update the state
		this.setState(toState);
	}

	render() {
		// show the menu
		let menu;

		if(this.state.menuOpen) {
			const {menuX, menuY} = this.state;

			let menuStyle = `right: ${menuX}px;`;

			// position the menu correctly
			if(this.state.menuCoordsAreBottom) {
				menuStyle += `bottom: ${innerHeight - menuY}px;`;
			}
			else {
				menuStyle += `top: ${menuY}px;`;
			}

			menu = [
				<div class="menu-overlay" onClick={this.toggleMenu}></div>,
				<div class="menu" style={menuStyle} onClick={this.toggleMenu}>
					<TaskLink id={this.task.id} class="no-underline">
						<div class="menu-item">Open</div>
					</TaskLink>
					<div class="menu-item" onClick={this.create}>
						Add subtask
					</div>
					<div class="menu-item" onClick={this.remove}>Delete</div>
				</div>
			];
		}

		return <div>
			<div class="task flex flex-vcenter">
				<Checkbox task={this.task}/>
				<EditTaskProp class="flex-fill" task={this.task} prop="name"
					onKeyDown={this.handleKey}/>
				<button class="btn" onClick={this.toggleMenu}>
					<i class="material-icons">more_vert</i>
				</button>
				{menu}
			</div>
			<div class="subtasks">
				<TasksWidget editMode task={this.task} depth={this.props.depth}/>
			</div>
		</div>;
	}
};
