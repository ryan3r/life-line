import Component from "../../component";
import currentTask from "../../../data/current-task";
import {focusController} from "./focus-controller";
import AddIcon from "material-ui/svg-icons/content/add";
import IconButton from "material-ui/IconButton";
import TasksWidget from "./tasks";
import BreadCrumbs from "./bread-crumbs";
import ProgressBar from "./progress-bar";
import React from "react";
import CircularProgress from "material-ui/CircularProgress";

export default class Editor extends Component {
	componentWillMount() {
		// store the current task in the state
		this.addSub(
			currentTask.onTask(task => {
				this.setState({
					task
				});
			})
		);

		// store the current task in the state
		this.addSub(
			currentTask.onTasksError(error => {
				this.setState(error);
			})
		);
	}

	componentDidMount() {
		this._mounted = true;
	}

	// create a new child task for the root task
	createChild = () => {
		const task = this.state.task.create();

		// focus that child
		focusController.focusTask(task.id, 0);
	}

	// display a message to the user
	message(title, content) {
		return <div className="flex-fill flex container">
			<div className="scrollable flex-fill flex-column">
				<div className="content flex flex-fill flex-vcenter flex-hcenter">
					{content}
				</div>
			</div>
		</div>;
	}

	render() {
		// show any errors
		if(this.state.errorType == "access") {
			return this.message(
				"Access denied",
				"Either the list you requested does not exist or you do not have access."
			);
		}

		if(this.state.errorType == "unknown") {
			return this.message(
				"Unexpected error",
				"An unexpected error occured while loading your list: "
					+ this.state.errorMessage
			);
		}

		// show the loading page
		if(!this.state.task) {
			return this.message("Loading...", <CircularProgress/>);
		}

		// the styles for the add button
		const addBtnStyle = {
			padding: 0,
			width: 24,
			height: 24
		};

		return <div style={{height: "calc(100% - 68px)"}}>
			<ProgressBar task={this.state.task}/>
			<div style={{height: "100%"}} className="flex">
				<div className="scrollable flex-fill">
					<BreadCrumbs task={this.state.task}/>
					<div className="content">
						<TasksWidget task={this.state.task} toplevel/>
						<IconButton
							onClick={this.createChild}
							style={addBtnStyle}
							iconStyle={addBtnStyle}>
								<AddIcon/>
						</IconButton>
					</div>
				</div>
			</div>
		</div>;
	}
}
