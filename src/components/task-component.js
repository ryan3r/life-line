import {Component} from "./component";

export class TaskComponent extends Component {
	constructor() {
		super();
	}

	componentDidMount() {
		this.task = this.props.task;

		// no task yet
		if(!this.task) return;

		// listen to all our task related events
		if(this.addListeners) {
			this.addListeners();
		}
	}

	componentWillReceiveProps(props) {
		// we changed tasks
		if(this.task != props.task) {
			// remove all task listeners
			this.unsubscribeAll();

			this.task = props.task;

			// listen to all our task related events
			if(this.addListeners) {
				this.addListeners();
			}
		}
	}
}
