import {TaskComponent} from "./task-component";

export class ProgressBar extends TaskComponent {
	onTaskState(state) {
		this.setState({
			state
		});
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
