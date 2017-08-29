import Component from "../component";
import React from "react";
import IconButton from "material-ui/IconButton";
import FlatButton from "material-ui/FlatButton";
import Dialog from "material-ui/Dialog";

const auth = firebase.auth();

export default class CurrentUser extends Component {
	constructor() {
		super();

		this.state.logoutOpen = false;
		this.state.loading = true;
	}

	componentWillMount() {
		// show the current user
		this.addSub(
			auth.onAuthStateChanged(user => {
				// this component not mounted anymore
				if(!this.updater.isMounted(this)) return;

				// display the current user
				if(user) {
					this.setState({
						loading: false,
						loggedIn: true,
						name: user.displayName,
						photoUrl: user.photoURL
					});
				}
				// show a login button
				else {
					this.setState({
						loading: false,
						loggedIn: false
					});
				}
			})
		);
	}

	logout = () => {
		// close the dialog
		this.logoutDialog(false)();

		// sign out
		auth.signOut()
			// make sure we have nothing from the old session
			.then(() => location.reload());
	}

	login = () => {
		location.href = "/login.html";
	}

	logoutDialog = state => {
		return () => {
			this.setState({
				logoutOpen: state
			});
		};
	}

	render() {
		// still loading show nothing
		if(this.state.loading) return null;

		// show a logged in button
		if(!this.state.loggedIn) {
			return <FlatButton onClick={this.login} style={{color: "#fff"}}>
				Login
			</FlatButton>;
		}

		// the user info has not loaded yet
		if(!this.state.photoUrl) return null;

		const actions = <div>
			<FlatButton label="Cancel" onClick={this.logoutDialog(false)}/>
			<FlatButton label="Logout" onClick={this.logout} primary={true}/>
		</div>

		return <div>
			<Dialog
				title="Logout"
				actions={actions}
				modal={false}
				open={this.state.logoutOpen}
				onRequestClose={this.logoutDialog(false)}>
				Are you sure you want to logout.
			</Dialog>
			<IconButton>
				<img
					src={this.state.photoUrl}
					width="30"
					height="30"
					onClick={this.logoutDialog(true)}/>
			</IconButton>
		</div>;
	}
}
