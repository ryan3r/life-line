import {Component} from "./component";
import {Header} from "./header";
import {TasksWidget} from "./tasks";
import {router} from "../router";
import {ListsDrawer} from "./lists-drawer";
import {BreadCrumbs} from "./bread-crumbs";
import {ProgressBar} from "./progress-bar";
import React from "react";
import AppBar from "material-ui/AppBar";
import CircularProgress from "material-ui/CircularProgress";
import IconButton from "material-ui/IconButton";
import AddIcon from "material-ui/svg-icons/content/add";
import {SIDEBAR_WIDTH, SIDEBAR_OPEN} from "../constants";
import {focusController} from "../focus-controller";
import {lists} from "../lists";
import {dockedStore} from "../stores/states";

export class App extends Component {
	constructor() {
		super();

		dockedStore.bind(this);
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
		// get the current task
		this.addSub(
			router.onCurrentRootTask(task => {
				this.setState({
					task,
					loaded: true
				});
			})
		);

		// listen for navigations
		this.addSub(
			router.on("navigate", () => {
				// clear current task and show the loader
				this.setState({
					task: undefined,
					loaded: false,
					errorType: undefined
				});
			})
		);

		// handle the error
		this.addSub(
			router.on("tasks-error", e => {
				this.setState(e);
			})
		);
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
	closeDrawer = () => {
		this.setState({
			drawerOpen: false
		});
	}

	// create a new child task for the root task
	createChild = () => {
		const task = this.state.task.create();

		// focus that child
		focusController.focusTask(task.id, 0);
	}

	// display a minimal app frame with a message
	message(header, content) {
		return <div className="container flex-column"
				style={{ marginLeft: this.state.docked ? SIDEBAR_WIDTH : 0 }}>
			<AppBar title={header}
				onLeftIconButtonTouchTap={this.toggleState("drawerOpen")}
				iconElementLeft={this.state.docked ? <span></span> : null}
				style={{flexShrink: 0}}/>
			<div className="flex-fill flex container">
				<ListsDrawer open={this.state.drawerOpen} onClose={this.closeDrawer}/>
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

		// the styles for the add button
		const addBtnStyle = {
			padding: 0,
			width: 24,
			height: 24
		};

		// show the app
		return <div className={`container flex-column ${ctrlPressed}`}
				style={{ marginLeft: this.state.docked ? SIDEBAR_WIDTH : 0 }}>
			<Header task={this.state.task}
				onHeaderToggle={this.toggleState("drawerOpen")}
				showCompleted={this.state.showCompleted}
				toggleState={this.toggleState("showCompleted")}/>
			<ProgressBar task={this.state.task}/>
			<div className="flex-fill flex container">
				<ListsDrawer open={this.state.drawerOpen} onClose={this.closeDrawer}/>
				<div className="scrollable flex-fill">
					<BreadCrumbs task={this.state.task}/>
					<div className="content">
						<TasksWidget task={this.state.task} toplevel
							showCompleted={this.state.showCompleted}/>
						<IconButton
							onClick={this.createChild}
							style={addBtnStyle}
							iconStyle={addBtnStyle}>
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
