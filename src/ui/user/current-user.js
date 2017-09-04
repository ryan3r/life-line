import Component from "../component";
import React from "react";
import FlatButton from "material-ui/FlatButton";
import Dialog from "material-ui/Dialog";
import IconMenu from "material-ui/IconMenu";
import IconButton from "material-ui/IconButton";
import MenuItem from "material-ui/MenuItem";

const auth = firebase.auth();

export default class CurrentUser extends Component {
	constructor() {
		super();

		this.state.dialogOpen = false;
		this.state.loading = true;
		this.state.actionName = "?";
		this.state.actionMsg = "";
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

	// log the user out
	logout = () => {
		// close the dialog
		this.hideDialog();

		// sign out
		auth.signOut()
			// make sure we have nothing from the old session
			.then(() => location.reload());
	}

	// delete their account
	deleteAccount = () => {
		// close the dialog
		this.hideDialog();

		// delete the account
		auth.currentUser.delete()

		.then(() => {
			alert("Your account has been deleted");

			location.href = "/";
		});
	}

	// go to the login page
	login = () => {
		location.href = "/login.html";
	}

	// hide the current dialog
	hideDialog = () => {
		this.setState({
			dialogOpen: false
		});
	}

	// show a dialog
	showDialog = dialog => {
		return () => {
			// show the logout dialog
			if(dialog == "logout") {
				this.setState({
					dialogOpen: true,
					actionName: "Logout",
					actionMsg: "logout",
					action: this.logout
				});
			}
			// show the delete account dialog
			else {
				this.setState({
					dialogOpen: true,
					actionName: "Delete",
					actionMsg: "delete your account",
					action: this.deleteAccount
				});
			}
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
			<FlatButton
				label="Cancel"
				onClick={this.hideDialog}/>
			<FlatButton
				label={this.state.actionName}
				onClick={this.state.action}
				primary={true}/>
		</div>

		// the profile image for the user
		const userIcon = <IconButton>
			<img
				src={this.state.photoUrl}
				width="30"
				height="30"
				style={{marginTop: "10px"}}/>
		</IconButton>;

		return <div>
			<Dialog
				title={this.state.actionName}
				actions={actions}
				modal={false}
				open={this.state.dialogOpen}
				onRequestClose={this.hideDialog}>
				Are you sure you want to {this.state.actionMsg}.
			</Dialog>
			<IconMenu
				iconButtonElement={userIcon}>
					<MenuItem
						primaryText="Logout"
						onClick={this.showDialog("logout")}/>
					<MenuItem
						primaryText="Delete account"
						onClick={this.showDialog("delete")}/>
			</IconMenu>

			{/* <IconButton>
				<img
					src={this.state.photoUrl}
					width="30"
					height="30"
					onClick={this.logoutDialog(true)}/>
			</IconButton> */}
		</div>;
	}
}
