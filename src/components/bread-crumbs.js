import {TaskProp} from "./task-prop";
import {TaskLink} from "./task-link";

export let BreadCrumbs = function({task}) {
	// don't display anything on the root
	if(!task.parent) return;

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

	return <div class="bread-crumbs flex flex-vcenter">
		{tasks.map((task, index) => {
			// display a link and a carrot
			if(index < tasks.length - 1) {
				return [
					<TaskLink id={task.id}>
						<TaskProp task={task} prop="name"/>
					</TaskLink>,
					<div class="crumb">
						<i class="material-icons">keyboard_arrow_right</i>
					</div>
				];
			}
			// just display the name of the last task
			else {
				return <TaskProp task={task} prop="name"/>;
			}
		})}
	</div>;
};
