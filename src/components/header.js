import {TaskProp} from "./task-prop";
import {EditTaskProp} from "./edit-task-prop";
import {ListsDrawer} from "./lists-drawer";
import {CurrentUser} from "./current-user";

export let Header = ({task, onHeaderToggle}) => {
	return <div class="header flex flex-vcenter">
		<button class="btn nocolor drawer-btn" onClick={onHeaderToggle}>
			<i class="material-icons">menu</i>
		</button>
		<h2 class="header-title flex-fill flex">
			<EditTaskProp class="flex-fill invisible" task={task} prop="name"/>
		</h2>
		<CurrentUser/>
	</div>;
}
