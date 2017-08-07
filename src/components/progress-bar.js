import {Component} from "./component";

export class ProgressBar extends Component {
	componentDidMount() {
		// remove old subscriptions
		this.unsubscribeAll();

		const {task} = this.props;

		this.setState({
			task: task,
			state: task.state
		});

		// listen for state changes
		this.addSub(
			task.on("state", () => {
				this.setState({
					task: this.props.task,
					state: this.props.task.state
				});
			})
		);
	}

	render() {
		// the task changed
		if(this.state.task && this.state.task !== this.props.task) {
			this.reboot();
		}

		let {state} = this.state;

		if(!state) return;

		// set the width
		const style = `width: ${state.percentDone * 100 | 0}%;`;

		return <div class="progress">
			<div class={`progress-inner ${state.type}`} style={style}></div>
		</div>;
	}
}
