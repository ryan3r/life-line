import {showCompleted} from "./stores/states";
import {Events} from "./util";

export class Filter extends Events {
	constructor() {
		super();

		// listen to state changes
		showCompleted.onStateChange(state => {
			// update the state
			this._showCompleted = state;

			// refresh the tasks
			this.emit("refresh");
		});
	}

	isVisible = task => {
		// this task is hidden
		if(!this._showCompleted && task.state.type == "done") {
			return false;
		}

		return true;
	}
}
