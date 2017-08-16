import {Component} from "./component";
import {Header} from "./header";
import {TasksWidget} from "./tasks";
import {router} from "../router";
import {Tasks} from "../tasks";
import {ListsDrawer} from "./lists-drawer";
import {BreadCrumbs} from "./bread-crumbs";
import {ProgressBar} from "./progress-bar";

export class App extends Component {
	constructor() {
		super();

		// bind event listeners to this class
		this.toggleEditMode = this.toggleEditMode.bind(this);
		this.toggleDrawer = this.toggleDrawer.bind(this);
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

	// switch between viewing and edit modes
	toggleEditMode() {
		console.log("You missed one");
	}

	toggleDrawer() {
		this.setState({
			drawerOpen: !this.state.drawerOpen
		});
	}

	// create a new child task for the root task
	createChild() {
		return this.state.task.create();
	}

	// display a minimal app frame with a message
	message(header, content) {
		return <div class="container flex-column">
			<div class="header flex flex-vcenter">
				<button class="btn nocolor drawer-btn" onClick={this.toggleDrawer}>
					<i class="material-icons">menu</i>
				</button>
				<h2 class="header-title">{header}</h2>
			</div>
			<div class="flex-fill flex container">
				<ListsDrawer open={this.state.drawerOpen} onClose={this.toggleDrawer}
					lists={this.props.lists}/>
				<div class="content flex-fill">{content}</div>
			</div>
			<div class={`shade ${this.state.drawerOpen ? "open" : ""}`}
				onClick={this.toggleDrawer}></div>
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
				"An unexpected error occured while loading your list: " + this.state.errorMessage
			);
		}

		// show the select list message
		if(this.state.loaded && !router.listId) {
			return this.message("Select a list", "Please select a list.");
		}

		if(this.state.loaded && !this.state.task) {
			return this.message("No such tasks", "The url does not match any task in this list.");
		}

		// show the loading page
		if(!this.state.task) {
			return this.message("Loading...", "");
		}

		const ctrlPressed = this.state.ctrlPressed ? "ctrl-pressed" : "";

		// show the app
		return <div class={`container flex-column ${ctrlPressed}`}>
			<Header task={this.state.task} onHeaderToggle={this.toggleDrawer}/>
			<ProgressBar task={this.state.task}/>
			<div class="flex-fill flex container">
				<ListsDrawer open={this.state.drawerOpen} onClose={this.toggleDrawer}
					lists={this.props.lists}/>
				<div class="scrollable flex-fill">
					<BreadCrumbs task={this.state.task}/>
					<div class="content">
						<TasksWidget task={this.state.task} toplevel/>
						<button class="btn nopad" onClick={this.createChild}>
							<i class="material-icons">add</i>
						</button>
					</div>
				</div>
			</div>
			<div class={`shade ${this.state.drawerOpen ? "open" : ""}`}
				onClick={this.toggleDrawer}></div>
		</div>;
	}
}
