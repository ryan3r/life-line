import {Component} from "./component";

export class TaskProp extends Component {
	componentDidMount() {
		// get the initial state
		this.setState({
			task: this.props.task,
			value: this.props.task[this.props.prop]
		});

		// listen for changes to the property
		this.addSub(
			this.props.task.on(this.props.prop, value => {
				this.setState({
					task: this.props.task,
					value
				});
			})
		);
	}

	render() {
		// the task changed
		if(this.state.task && this.state.task !== this.props.task) {
			this.reboot();
		}

		return this.state.value;
	}
}
