import TaskComponent from "../task-component";
import Checkbox from "./checkbox";
import EditTaskName from "./edit-task-name";
import {router} from "../../../router";
import React from "react";
import MoreVertIcon from "material-ui/svg-icons/navigation/more-vert";
import IconMenu from "material-ui/IconMenu";
import MenuItem from "material-ui/MenuItem";
import IconButton from "material-ui/IconButton";
import {focusController} from "./focus-controller";
import TasksWidget from "./tasks";
import {showCompleted} from "../../../stores/states";
import KeyboardArrowRightIcon from "material-ui/svg-icons/hardware/keyboard-arrow-right";
import ArrowForwardIcon from "material-ui/svg-icons/navigation/arrow-forward";
import {previousVisibleTask, nextVisibleTask, outdent, indent, moveTo} from "./task-utils";
import TaskProp from "../task-prop";

// if the keyboard is opened make sure it doesn't cover the current editor
window.addEventListener("resize", () => {
	if(document.activeElement) {
		document.activeElement.scrollIntoViewIfNeeded();
	}
});

// split the currently selected text field (removing the selected parts)
const splitSelectedText = () => {
	const range = getSelection().getRangeAt(0);

	// get the parts of the selection
	return [
		range.startContainer.textContent.substr(0, range.startOffset),
		range.endContainer.textContent.substr(range.endOffset)
	];
};

export default class EditTask extends TaskComponent {
	addListeners() {
		super.addListeners();

		// listen for grandchildren changes
		this.taskDisposable.add(
			this.task.parent.onHasGrandchildren(siblingsHaveChildren => {
				this.setState({
					siblingsHaveChildren
				});
			})
		);
	}

	onTaskChildren() {
		// save the current task
		this.setState({
			task: this.task,
			showChildrenToggle:
				this.task.children.length > 0 ||
				this.task.description !== undefined ||
				this.task.due !== undefined
		});
	}

	onTaskState() {
		// save the current task
		this.setState({
			task: this.task
		});
	}

	onTaskDue() {
		// save the current task
		this.setState({
			task: this.task,
			showChildrenToggle:
				this.task.children.length > 0 ||
				this.task.description !== undefined ||
				this.task.due !== undefined
		});
	}

	onTaskDescription() {
		// save the current task
		this.setState({
			task: this.task,
			showChildrenToggle:
				this.task.children.length > 0 ||
				this.task.description !== undefined ||
				this.task.due !== undefined
		});
	}

	onTaskHideChildren() {
		this.setState({
			showChildrenToggle:
				this.task.children.length > 0 ||
				this.task.description !== undefined ||
				this.task.due !== undefined
		});
	}

	onTaskDelete() {
		// if we have focus remove it
		if(focusController.hasFocus(this.task.id)) {
			focusController.lostFocus(this.task.id);
		}
	}

	open = () => {
		router.openTask(this.task.id);
	}

	handleKey = e => {
		let preventDefault = true;

		// handle the enter key (ctrl to create a child)
		if(e.keyCode == 13) {
			const [selfName, newName] = splitSelectedText();

			// update the name for this task
			this.task.name = selfName;

			// the parent for the new task
			// ctrlKey to create a child for this task
			const parent = e.ctrlKey ? this.task : this.task.parent;

			// create a new sibling task
			const newTask = parent.create({
				name: newName,
				index: e.ctrlKey ? 0 : this.task.index + 1
			});

			// focus the new task
			focusController.focusTask(newTask.id, 0);
		}
		// handle backspace when the cursor is at the beginning
		else if(e.keyCode == 8 &&
			getSelection().rangeCount > 0 &&
			getSelection().getRangeAt(0).startOffset === 0 &&
			getSelection().type == "Caret") {
			// get the next visible task
			let toTask = nextVisibleTask(this.task, { getTask: true });

			if(toTask) {
				let index = toTask.name.length;

				// add the content of this task to the new task
				toTask.name += this.task.name;

				// go to the current end of the to task
				focusController.focusTask(toTask.id, index);

				// delete this task
				this.task.delete();
			}
		}
		// outdent tasks on tab
		else if(e.keyCode == 9 && e.shiftKey) {
			outdent(this.task);
		}
		// indent tasks on tab
		else if(e.keyCode == 9) {
			indent(this.task);
		}
		// switch places with the next logical task
		else if((e.keyCode == 38 || e.keyCode == 40) && e.ctrlKey) {
			moveTo(this.task, e.keyCode == 38);
		}
		// up arrow move to the next task
		else if(e.keyCode == 38) {
			nextVisibleTask(this.task, {
				keepSelection: true
			});
		}
		// down arrow move to the last task
		else if(e.keyCode == 40) {
			previousVisibleTask(this.task);
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
		this.listen(this.base.querySelector(".editor"), "blur", () => {
			focusController.lostFocus(this.task.id);
		});

		// this task just got focus tell everyone
		this.listen(this.base.querySelector(".editor"), "focus", () => {
			focusController.gotFocus(this.task.id);
		});

		this.addSub(
			focusController.onFocus(id => {
				// not a focus for this task
				if(this.task.id !== id || !this.base) return;

				// we don't need to worry about this event
				if(!focusController.trueFocus) return;

				let {startAt, endAt} = focusController.getRangeInfo(this.task.name);
				// get the text node for the editor
				const editor = this.base.querySelector(".editor");
				let textNode = editor.childNodes[0];

				// if there is no text node create one
				if(!textNode) {
					textNode = document.createTextNode("");

					// add it to the editor
					editor.appendChild(textNode);
				}

				let range = document.createRange();

				if(startAt > textNode.textContent.length) {
					startAt = textNode.textContent.length;
				}

				if(endAt > textNode.textContent.length) {
					endAt = textNode.textContent.length;
				}

				// select the text
				range.setStart(textNode, startAt);
				range.setEnd(textNode, endAt);

				let selection = getSelection();

				// clear the current selection (if any)
				selection.removeAllRanges();

				// add the new selection
				selection.addRange(range);

				// make sure this task is in view
				this.base.querySelector(".editor").scrollIntoViewIfNeeded();
			})
		);
	}

	toggleHideChildren = () => this.task.hideChildren = !this.task.hideChildren;

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

		// rotate the arrow when hidden
		let iconArrow = Object.assign({
			transform: `rotate(${this.task.hideChildren ? 0 : 90}deg)`
		}, iconStyles);

		// give the checkbox some space
		const btnStyles = {
		    width: 24,
		    height: 24,
		    padding: 0,
			marginRight: 5
		};

		const showChildrenToggle = this.props.depth > 0 && this.state.showChildrenToggle;

		// show a open/close arrow for the children
		const hideShowChildren = showChildrenToggle ? <IconButton
			style={btnStyles}
			iconStyle={iconArrow}
			onClick={this.toggleHideChildren}>
				<KeyboardArrowRightIcon/>
		</IconButton> : null;

		// check if any of our siblings have children
		const noSiblingsChildren = this.task.parent.children.every(task => {
			return task.children.length === 0;
		});

		// Indent the task if we are not showing the collapse toggle.
		// If we are at the top level and either we are low on space or
		// none of our siblings have children don't indenet.
		const indentTask =
			!showChildrenToggle &&
			(!this.props.toplevel ||
				(!this.state.siblingsHaveChildren && this.props.depth > 0));

		// save the indented state
		this._wasIndented = indentTask;

		// show the fade animation
		const fadeClass = !showCompleted.value && this.task.state.type == "done" ?
			"fadeout-task" :
			"";

		// the styles for the arrow icon
		const arrowStyles = {
		    width: 25,
		    height: 25,
		    padding: 0,
			marginRight: 5
		};

		// show the open arrow for tasks with children
		const openArrow = this.state.showChildrenToggle ?
			<IconButton
				onClick={this.open}
				style={arrowStyles}
				iconStyle={arrowStyles}>
					<ArrowForwardIcon/>
			</IconButton>
			: null;

		// the indentation for the info section
		const infoIndentation = indentTask || this.state.showChildrenToggle ? 20 : 0;

		// show/hide the info
		let info = null;

		if(!this.task.hideChildren && this.props.depth > 0) {
			info = <div style={{marginLeft: infoIndentation}} className="task-info">
				<TaskProp task={this.task} prop="due"/>
				<TaskProp task={this.task} prop="description"/>
			</div>;
		}

		return <div ref={base => this.base = base}>
			<div className={`task flex flex-vcenter ${this.task.state.type} ${fadeClass}`}
				style={{marginLeft: indentTask ? 29 : 0}}>
				{hideShowChildren}
				<Checkbox task={this.task}/>
				<EditTaskName className="flex-fill" task={this.task} prop="name"
					onKeyDown={this.handleKey}/>
				{openArrow}
			</div>
			<div className="subtasks">
				{info}
				{/* TODO: Fix TasksWidget.default */}
				<TasksWidget.default editMode task={this.task} depth={this.props.depth}/>
			</div>
		</div>;
	}
};
