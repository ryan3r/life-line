import {Component} from "./component";

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
		if(confirm("Would you like to logout?")) {
			firebase.auth().signOut();
		}
	}

	render() {
		let name = `Hi, ${this.state.name.match(/(.+?)\s/)[1]}`;

		return <div class="profile">
			<span class="profile-name">{name}</span>
			<img src={this.state.photoUrl} class="profile-image" onClick={this.logout}/>
		</div>;
	}
}
