import Component from "../component";
import React from "react";
import IconButton from "material-ui/IconButton";
import FlatButton from "material-ui/FlatButton";

const auth = firebase.auth();

export default class CurrentUser extends Component {
	componentWillMount() {
		// show the current user
		this.addSub(
			auth.onAuthStateChanged(user => {
				// this component not mounted anymore
				if(!this.updater.isMounted(this)) return;

				// display the current user
				if(user) {
					this.setState({
						loggedIn: true,
						name: user.displayName,
						photoUrl: user.photoURL
					});
				}
				// show a login button
				else {
					this.setState({
						loggedIn: false
					});
				}
			})
		);
	}

	logout = () => {
		// log the current user out
		if(confirm("You are about to be logged out")) {
			auth.signOut();
		}
	}

	login = () => {
		location.href = "/login.html";
	}

	render() {
		// show a logged in button
		if(!this.state.loggedIn) {
			return <FlatButton onClick={this.login} style={{color: "#fff"}}>
				Login
			</FlatButton>;
		}

		// the user info has not loaded yet
		if(!this.state.photoUrl) return null;

		return <IconButton>
			<img
				src={this.state.photoUrl}
				width="30"
				height="30"
				onClick={this.logout}/>
		</IconButton>;
	}
}
