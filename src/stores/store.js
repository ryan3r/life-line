import Events from "../util/events";

export default class Store extends Events {
	constructor(name, state) {
		super();

		this.defineEvent("StateChange", "value");

		this.name = name;
		this.value = value;
	}

	// change the state
	set(state) {
		this.state = state;

		this.emit("StateChange");
	}

	// bind a store to the react state
	bind(component, name = this.name) {
		// listen for state changes
		component.addSub(
			this.on("state-change", state => {
				// update the component's state
				component.setState({
					[name]: state
				});
			})
		);
	}
}
