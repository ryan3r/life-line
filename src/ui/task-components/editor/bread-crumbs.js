import Component from "../../component";
import TaskProp from "../task-prop";
import React from "react";
import KeyboardArrowRightIcon from "material-ui/svg-icons/hardware/keyboard-arrow-right";
import MenuItem from "material-ui/MenuItem";
import IconMenu from "material-ui/IconMenu";
import MoreIcon from "material-ui/svg-icons/navigation/more-horiz";
import IconButton from "material-ui/IconButton";
import {router} from "../../../router";
import {
	SIDEBAR_WIDTH,
	PROP_SIDEBAR_WIDTH,
	SIDEBAR_OPEN,
	PROP_SIDEBAR_OPEN
} from "../../../constants";

// the width of an arrow
const ARROW_WIDTH = 34;
// the width or the menu icon
const MENU_WIDTH = 48;
// the padding on the content
const CONTENT_PADDING = 15;

// create a canvas for text measuring
const _canvas = document.createElement("canvas").getContext("2d");

export default class BreadCrumbs extends Component {
	constructor() {
		super();

		this.state.width = innerWidth;

		// listen to window size changes
		this.listen(window, "resize", () => {
			this.setState({
				width: innerWidth
			});
		});
	}

	// create a listener to open a task
	open(task) {
		return e => {
			e.preventDefault();

			router.openTask(task.id);
		};
	}

	// render a bread crumb
	crumb(task, afterArrow) {
		// just display the name for the last one
		if(!afterArrow) {
			return <span key={task.id}>
				<TaskProp task={task} prop="name"/>
			</span>;
		}

		return <div className="flex flex-vcenter" key={task.id}>
			<a href="#" onClick={this.open(task)}>
				<TaskProp task={task} prop="name"/>
			</a>
			{/* the arrow after the bread crumb */}
			<div className="crumb">
				<KeyboardArrowRightIcon/>
			</div>
		</div>;
	}

	// get the width available to us
	getWidth() {
		let width = this.state.width;

		// remove the content padding
		width -= CONTENT_PADDING * 2;

		// remove the sidebars
		if(innerWidth > SIDEBAR_OPEN) {
			width -= SIDEBAR_WIDTH;
		}

		if(innerWidth > PROP_SIDEBAR_OPEN) {
			width -= PROP_SIDEBAR_WIDTH;
		}

		// account for the collapsed menu
		width -= ARROW_WIDTH + MENU_WIDTH;

		return width * 0.70 | 0;
	}

	// get the crumb list
	getTasks() {
		let {task} = this.props;

		// the list of tasks
		let tasks = [];
		let width = this.getWidth();

		while(task) {
			// measure the width of this task
			const taskWidth = _canvas.measureText(task.name).width + ARROW_WIDTH;

			// add the task to the list
			if(taskWidth < width) {
				tasks.unshift(task);
			}
			// compact the task
			else {
				// if we don't already have a compacted array add one
				if(!Array.isArray(tasks[0])) {
					tasks.unshift([]);
				}

				// add this to the compacted array
				tasks[0].unshift(task);
			}

			// go to the parent
			task = task.parent;

			// update the remaining width
			width -= taskWidth;
		}

		return tasks;
	}

	render() {
		// don't display anything on the root
		if(!this.props.task.parent) return null;

		// get the tasks to display
		const tasks = this.getTasks();

		return <div className="bread-crumbs flex flex-vcenter">
			{tasks.map((task, index) => {
				// render hidden tasks
				if(Array.isArray(task)) {
					// the menu icon
					const menuBtn = <IconButton><MoreIcon/></IconButton>;

					return <div className="flex flex-vcenter" key="compacted">
						{/* The collapsed tasks */}
						<IconMenu iconButtonElement={menuBtn}>
							{task.map(task => {
								return <MenuItem
									primaryText={task.name}
									onClick={this.open(task)}
									key={task.id}/>
							})}
						</IconMenu>
						{/* The arrow after the compacted menu */}
						<div className="crumb">
							<KeyboardArrowRightIcon/>
						</div>
					</div>
				}
				// render a task
				else {
					return this.crumb(task, index < tasks.length - 1);
				}
			})}
		</div>;
	}
};
