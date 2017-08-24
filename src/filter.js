import {showCompleted} from "./stores/states";
import Events from "./util/events";
import {MAX_CHILDREN} from "./constants";
import {router} from "./router";
import Disposable from "./util/disposable";

export class Filter extends Events {
	constructor() {
		super();

		this.disposable = new Disposable();

		// listen to state changes
		this.disposable.add(
			showCompleted.onStateChange(state => {
				// update the state
				this._showCompleted = state;

				// refresh the tasks
				this.emit("refresh");
			})
		);
	}

	isVisible(task) {
		// this task is hidden
		if(!this._showCompleted && task.state.type == "done") {
			return false;
		}

		return true;
	}

	shouldContinue(children, parent) {
		// check if we have reached the max
		return children.length < MAX_CHILDREN || parent.id == router.taskId;
	}

	dispose() {
		this.disposable.dispose();
	}
}
