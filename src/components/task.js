import {Component} from "./component";
import {TasksWidget} from "./tasks";
import {Checkbox} from "./checkbox";
import {TaskLink} from "./task-link";
import {router} from "../router";
import {TaskProp} from "./task-prop";

export class TaskWidget extends Component {
	render() {
		return <div>
			<div class="task flex flex-vcenter">
				<Checkbox task={this.props.task}/>
				<TaskLink id={this.props.task.id}>
					<div class="flex-grow" id={`task-${this.props.task.id}`}>
						<TaskProp task={this.props.task} prop="name"/>
					</div>
				</TaskLink>
			</div>
			<div class="subtasks">
				<TasksWidget task={this.props.task} depth={this.props.depth}/>
			</div>
		</div>;
	}
};
