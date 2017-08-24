import Events from "../util/events";

export default class Store extends Events {
	constructor(name, state) {
		super();

		this.name = name;
		this._state = state;
	}

	// change the state
	set(state) {
		this._state = state;

		this.emit("state-change", state);
	}

	// get the current state and listen for changes
	onStateChange(fn) {
		// emit the current state
		fn(this._state);

		return this.on("state-change", fn);
	}

	// bind a store to the react state
	bind(component, name = this.name) {
		// set the current state in the component
		component.state[name] = this._state;

		// listen for state changes
		component.addSub(
			this.on("state-change", () => {
				// update the component's state
				component.setState({
					[name]: this._state
				});
			})
		);
	}
}
