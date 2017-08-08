import {TaskComponent} from "./task-component";

const DEBOUNCE_TIMER = 500;

export class EditTaskProp extends TaskComponent {
	constructor() {
		super();

		this.update = this.update.bind(this);
	}

	addListeners() {
		// get the initial state
		this.setState({
			value: this.task[this.props.prop]
		});

		// listen for changes to the property
		this.addSub(
			this.task.on(this.props.prop, value => {
				this.setState({
					value
				});
			})
		);
	}

	update(e) {
		// clear the old timer
		clearTimeout(this._debounce);
		// don't save while the user is typing
		this._debounce = setTimeout(() => {
			this.props.task[this.props.prop] = e.target.value;
		}, DEBOUNCE_TIMER);
	}

	render() {
		// if this is a new or empty task draw focus to it
		if(this.state.task && !this.state.value && this.base) {
			this.base.focus();
		}

		return <input class={`editor ${this.props.class}`}
			value={this.state.value} onInput={this.update}
			onKeyDown={this.props.onKeyDown}/>;
	}
}
