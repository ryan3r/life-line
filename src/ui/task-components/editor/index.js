import Component from "../../component";
import currentTask from "../../../data/current-task";
import {focusController} from "./focus-controller";
import TasksWidget from "./tasks";
import BreadCrumbs from "./bread-crumbs";
import ProgressBar from "./progress-bar";
import React from "react";
import CircularProgress from "material-ui/CircularProgress";
import {pageTitle} from "../../../stores/states";
import {router} from "../../../router";
import PropsSidebar from "./props-sidebar";
import TaskProp from "../task-prop";
import RaisedButton from "material-ui/RaisedButton";

export default class Editor extends Component {
	constructor() {
		super();

		this.state.loading = true;
	}

	componentWillMount() {
		// listen to the authenticated/not authenticated state
		this.addSub(
			firebase.auth().onAuthStateChanged(user => {
				this.setState({ loggedIn: !!user });
			})
		);

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

		// get the loading state of the current task
		this.addSub(
			currentTask.onLoading(loading => {
				let toState = { loading };

				// clear the previous error
				if(loading) {
					toState.errorType = undefined;
				}

				this.setState(toState);
			})
		);
	}

	componentDidMount() {
		this._mounted = true;
	}

	// display a message to the user
	message(title, content) {
		// update the page title
		setTimeout(() => pageTitle.set(title), 0);

		return <div className="flex-fill flex container">
			<div className="scrollable flex-fill flex-column">
				<div className="flex flex-fill flex-vcenter flex-hcenter">
					{content}
				</div>
			</div>
		</div>;
	}

	// go to the login page
	login = () => {
		location.href = "/login.html";
	}

	render() {
		// show any errors
		if(this.state.errorType == "access") {
			return this.message(
				"Access denied",
				"You do not have access to this list."
			);
		}

		if(this.state.errorType == "exists") {
			return this.message(
				"Not found",
				"The list and/or task you requested does not exist."
			);
		}

		if(this.state.errorType == "unknown") {
			return this.message(
				"Unexpected error",
				"An unexpected error occured while loading your list: "
					+ this.state.errorMessage
			);
		}

		// no url and no user account tell them to sign in or get a list url
		if(!this.state.loggedIn && !router.listId) {
			return this.message(
				"Nothing here",
				<div>
					{`Please either sign in/sign up or type the full url
				 	for the list you are looking for.`}
					<div style={{ marginTop: "15px", textAlign: "center" }}>
						<RaisedButton
							onClick={this.login}
							label="Sign in/Sign up"
							primary={true}/>
					</div>
				</div>
			);
		}

		// probably a new users
		if(!router.listId) {
			return this.message(
				"Welcome",
				"Either open an existing list or create a new one to get started."
			);
		}

		// show the loading page
		if(this.state.loading) {
			return this.message("Loading...", <CircularProgress/>);
		}

		// clear the page title
		setTimeout(() => pageTitle.set(undefined), 0);

		// the styles for the add button
		const addBtnStyle = {
			padding: 0,
			width: 24,
			height: 24
		};

		return <div style={{height: "calc(100% - 68px)"}}>
			<PropsSidebar task={this.state.task}/>
			<ProgressBar task={this.state.task}/>
			<div style={{height: "100%"}} className="flex">
				<div className="scrollable flex-fill">
					<BreadCrumbs task={this.state.task}/>
					<div className="content">
						<div className="task-info" style={{marginBottom: 10, marginTop: 10}}>
							<TaskProp
								task={this.state.task}
								prop="due"
								style={{marginBottom: 15}}/>
							<TaskProp task={this.state.task} prop="description"/>
						</div>
						<TasksWidget task={this.state.task} toplevel/>
					</div>
				</div>
			</div>
		</div>;
	}
}
