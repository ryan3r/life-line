import {Component} from "./component";
import {Header} from "./header";
import {TasksWidget} from "./tasks";
import {router} from "../router";
import {Tasks} from "../tasks";
import {ListsDrawer} from "./lists-drawer";
import {BreadCrumbs} from "./bread-crumbs";
import {ProgressBar} from "./progress-bar";
import {Filter} from "./filter";
import React from "react";
import AppBar from "material-ui/AppBar";
import CircularProgress from "material-ui/CircularProgress";
import {CurrentUser} from "./current-user";
import IconButton from "material-ui/IconButton";
import AddIcon from "material-ui/svg-icons/content/add";

export class App extends Component {
	constructor() {
		super();

		// bind event listeners to this class
		this.closeDrawer = this.closeDrawer.bind(this);
		this.createChild = this.createChild.bind(this);
	}

	componentDidMount() {
		this.listen(window, "keydown", e => {
			// listen for the ctrl key to be pressed
			if(e.keyCode == 17) {
				this.setState({ ctrlPressed: true });
			}
		});

		this.listen(window, "keyup", e => {
			// listen for the ctrl key to be released
			if(e.keyCode == 17) {
				this.setState({ ctrlPressed: false });
			}
		});
	}

	componentWillMount() {
		// we have a known task
		this.setupList();

		// listen for navigations
		this.addSub(
			router.on("navigate", () => this.setupList())
		);
	}

	// setup the current list
	setupList() {
		// clear old errors
		if(this.state.errorType !== undefined) {
			this.setState({
				errorType: undefined
			});
		}

		// if we have a new list load it
		if(router.listId && (!this._tasks || this._tasks.listId != router.listId)) {
			// dispose of the old tasks object
			if(this._tasks) {
				this._tasks.dispose();
			}

			this._tasks = new Tasks(this.props.lists, router.listId);

			// an error occured
			this._tasks.ready.catch(err => {
				// not allowed to access or it does not exist
				if(err.code == "PERMISSION_DENIED") {
					this.setState({
						errorType: "access"
					});
				}
				// unexpected error
				else {
					this.setState({
						errorType: "unknown",
						errorMessage: err.message
					});
				}
			});
		}

		// load the current task
		if(this._tasks) {
			this.loadRoot();
		}
	}

	// load the root task
	loadRoot() {
		let task;

		// clear current task
		this.setState({
			task: undefined,
			loaded: false
		});

		// load the requested task
		if(!router.taskId) {
			task = this._tasks.getRootAsync();
		}
		else {
			task = this._tasks.getAsync(router.taskId);
		}

		// update the component
		task.then(root => {
			this.setState({
				task: root,
				loaded: true
			});
		});
	}

	// toggle the state of a boolean
	toggleState(prop) {
		return () => {
			this.setState({
				[prop]: !this.state[prop]
			});
		};
	}

	// close the drawer
	closeDrawer() {
		this.setState({
			drawerOpen: false
		});
	}

	// create a new child task for the root task
	createChild() {
		return this.state.task.create();
	}

	// display a minimal app frame with a message
	message(header, content) {
		return <div className="container flex-column">
			<AppBar title={header}
				onLeftIconButtonTouchTap={this.toggleState("drawerOpen")}
				iconElementRight={<CurrentUser/>}/>
			<div className="flex-fill flex container">
				<ListsDrawer open={this.state.drawerOpen} onClose={this.closeDrawer}
					lists={this.props.lists}/>
				<div className="scrollable flex-fill flex">
					<div className="content flex flex-fill flex-vcenter flex-hcenter">
						{content}
					</div>
				</div>
			</div>
			<div className={`shade ${this.state.drawerOpen ? "open" : ""}`}
				onClick={this.toggleState("drawerOpen")}></div>
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

		// show the select list message
		if(this.state.loaded && !router.listId) {
			return this.message("Select a list", "Please select a list.");
		}

		if(this.state.loaded && !this.state.task) {
			return this.message(
				"No such tasks",
				"The url does not match any task in this list."
			);
		}

		// show the loading page
		if(!this.state.task) {
			return this.message("Loading...", <CircularProgress/>);
		}

		const ctrlPressed = this.state.ctrlPressed ? "ctrl-pressed" : "";

		// show the app
		return <div className={`container flex-column ${ctrlPressed}`}>
			<Header task={this.state.task}
				onHeaderToggle={this.toggleState("drawerOpen")}/>
			<ProgressBar task={this.state.task}/>
			<div className="flex-fill flex container">
				<ListsDrawer open={this.state.drawerOpen} onClose={this.closeDrawer}
					lists={this.props.lists}/>
				<div className="scrollable flex-fill">
					<BreadCrumbs task={this.state.task}/>
					<Filter showCompleted={this.state.showCompleted}
						onToggleShowCompleted={this.toggleState("showCompleted")}
						task={this.state.task}/>
					<div className="content">
						<TasksWidget task={this.state.task} toplevel
							showCompleted={this.state.showCompleted}/>
						<IconButton onClick={this.createChild}>
							<AddIcon/>
						</IconButton>
					</div>
				</div>
			</div>
			<div className={`shade ${this.state.drawerOpen ? "open" : ""}`}
				onClick={this.toggleState("drawerOpen")}></div>
		</div>;
	}
}
