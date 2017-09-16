import saveTracker from "../../../util/save-tracker";
import Component from "../../component";
import React from "react";
import DoneIcon from "material-ui/svg-icons/file/cloud-done";
import OfflineIcon from "material-ui/svg-icons/file/cloud-off";
import CircularProgress from "material-ui/CircularProgress";
import IconButton from "material-ui/IconButton";

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
		super.componentWillUnmount();

		this._connectedRef.off();
	}

	render() {
		let saveStatus;

		const iconStyles = {
			color: "#fff"
		};

		// offline
		if(!this.state.online) {
			saveStatus = <OfflineIcon style={iconStyles}/>;
		}
		// unsaved changes
		else if(this.state.dirty) {
			saveStatus = <CircularProgress size={20} thickness={2} color="#fff"/>;
		}
		// online, all saved
		else {
			saveStatus = <DoneIcon style={iconStyles}/>;
		}

		return <span className="save-status no-print">
			{saveStatus}
		</span>;
	}
}
