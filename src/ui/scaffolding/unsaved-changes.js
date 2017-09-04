import saveTracker from "../../util/save-tracker";
import Component from "../component";
import Snackbar from "material-ui/Snackbar";
import React from "react";

export default class UnsavedChanges extends Component {
	constructor() {
		super();

		this.state.saveMsg = false;
	}

	componentDidMount() {
		// block page unload
		this.addSub(
			this.listen(window, "beforeunload", e => {
				// check if we have unsaved changes
				if(!saveTracker.isDirty) return;

				// remember that we told the user to wait
				this.blockedExit = true;

				return (e.returnValue = "Your changes are still being saved.");
			})
		);

		// notify users when their changes are saved
		this.addSub(
			saveTracker.onIsDirty(dirty => {
				// tell the user their changes have been saved
				if(!dirty && this.blockedExit) {
					this.blockedExit = false;

					this.setState({
						saveMsg: true
					});
				}
			})
		);
	}

	close = () => {
		this.setState({
			saveMsg: false
		});
	}

	render() {
		return <Snackbar
          open={this.state.saveMsg}
          message="Your changes have been saved."
          autoHideDuration={3000}
          onRequestClose={this.close}/>
	}
}
