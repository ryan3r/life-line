import undoManager from "../../data/undo-manager";
import Component from "../component";
import Snackbar from "material-ui/Snackbar";
import React from "react";

export default class UndoToast extends Component {
	constructor() {
		super();

		this.state.open = false;
	}

	componentDidMount() {
		// notify users when their changes are saved
		this.addSub(
			undoManager.onCurrent(transaction => {
				// no transaction to get
				if(!transaction || !transaction.hasTasks()) return;

				// open for a new transaction
				this.setState({
					msg: transaction.name,
					open: true,
					transaction
				});
			})
		);
	}

	close = () => {
		this.setState({
			open: false
		});
	}

	// undo the changes and close
	undo = () => {
		if(this.state.transaction) {
			this.state.transaction.undo();

			this.close();
		}
	}

	render() {
		return <Snackbar
			open={this.state.open}
			message={this.state.msg || ""}
			autoHideDuration={3000}
			onRequestClose={this.close}
			action="Undo"
			onActionTouchTap={this.undo}/>
	}
}
