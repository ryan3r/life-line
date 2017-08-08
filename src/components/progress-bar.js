import {TaskComponent} from "./task-component";

export class ProgressBar extends TaskComponent {
	addListeners() {
		this.setState({
			state: this.task.state
		});

		// listen for state changes
		this.addSub(
			this.task.on("state", () => {
				this.setState({
					state: this.task.state
				});
			})
		);
	}

	render() {
		let {state} = this.state;

		if(!state) return;

		// set the width
		const style = `width: ${state.percentDone * 100 | 0}%;`;

		return <div class="progress">
			<div class={`progress-inner ${state.type}`} style={style}></div>
		</div>;
	}
}
