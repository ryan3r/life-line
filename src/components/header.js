import {TaskProp} from "./task-prop";
import {EditTaskProp} from "./edit-task-prop";
import {ListsDrawer} from "./lists-drawer";

export let Header = ({editMode, task, onToggle, onHeaderToggle}) => {
	return <div class="header flex flex-vcenter">
		<button class="btn nocolor drawer-btn" onClick={onHeaderToggle}>
			<i class="material-icons">menu</i>
		</button>
		<h2 class="header-title flex-fill flex">
			{editMode ?
				<EditTaskProp class="flex-fill invisible" task={task} prop="name"/>:
				<TaskProp task={task} prop="name"/>}
		</h2>
		<button class="btn nocolor" onClick={onToggle}>
			<i class="material-icons">
				{editMode ? "done" : "create"}
			</i>
		</button>
	</div>;
}
