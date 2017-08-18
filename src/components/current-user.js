import {Component} from "./component";
import React from "react";
import IconButton from "material-ui/IconButton";

export class CurrentUser extends Component {
	constructor() {
		super();

		this.logout = this.logout.bind(this);
	}

	componentWillMount() {
		// show the current user
		firebase.auth().onAuthStateChanged(user => {
			// no user is logged in wait to be redirected
			if(!user) return;

			this.setState({
				name: user.displayName,
				photoUrl: user.photoURL
			});
		});
	}

	logout() {
		// log the current user out
		if(confirm("You are about to be logged out")) {
			firebase.auth().signOut();
		}
	}

	render() {
		// the user info has not loaded yet
		if(!this.state.photoUrl) return null;

		return <IconButton>
			<img src={this.state.photoUrl} width="30" height="30" onClick={this.logout}/>
		</IconButton>;
	}
}
