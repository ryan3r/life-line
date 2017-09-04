import saveTracker from "../../../util/save-tracker";
import Component from "../../component";
import React from "react";

export default class SaveStatus extends Component {
	constructor() {
		super();

		this._connectedRef = firebase.database().ref(".info/connected");
	}

	componentDidMount() {
		// update the online offline state
		this._connectedRef.on("value", online => {
			this.setState({ online: online.val() });
		});

		// update the saved/saving state
		this.addSub(
			saveTracker.onIsDirty(dirty => {
				this.setState({
					dirty
				});
			})
		);
	}

	componentWillUnmount() {
		this._connectedRef.off();
	}

	render() {
		let saveStatus;

		// offline
		if(!this.state.online) {
			saveStatus = "Offline";
		}
		// unsaved changes
		else if(this.state.dirty) {
			saveStatus = "Saving...";
		}
		// online, all saved
		else {
			saveStatus = "All changes saved.";
		}

		return <div className="save-status">
			{saveStatus}
		</div>;
	}
}
