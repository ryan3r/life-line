import saveTracker from "../../../util/save-tracker";
import Component from "../../component";
import React from "react";

export default class SaveStatus extends Component {
	componentDidMount() {
		// update the saved/saving state
		this.addSub(
			saveTracker.onIsDirty(dirty => {
				this.setState({
					dirty
				});
			})
		);
	}

	render() {
		return <div className="save-status">
			{this.state.dirty ? "Saving..." : "All changes saved."}
		</div>;
	}
}
