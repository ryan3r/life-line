import TaskProp from "../task-prop";
import TaskLink from "../task-link";
import React from "react";
import KeyboardArrowRightIcon from "material-ui/svg-icons/hardware/keyboard-arrow-right";

let BreadCrumbs = function({task}) {
	// don't display anything on the root
	if(!task.parent) return null;

	// the list of tasks
	let tasks = [];
	let collected = 0;

	while(task && collected < 3) {
		// add the task to the list
		tasks.unshift(task);

		// go to the parent
		task = task.parent;

		++collected;
	}

	return <div className="bread-crumbs flex flex-vcenter">
		{tasks.map((task, index) => {
			// display a link and a carrot
			if(index < tasks.length - 1) {
				return <div key={task.id} className="flex flex-vcenter">
					<TaskLink id={task.id}>
						<TaskProp task={task} prop="name"/>
					</TaskLink>
					<div className="crumb">
						<KeyboardArrowRightIcon/>
					</div>
				</div>;
			}
			// just display the name of the last task
			else {
				return <TaskProp key={task.id} task={task} prop="name"/>;
			}
		})}
	</div>;
};

export default BreadCrumbs;
