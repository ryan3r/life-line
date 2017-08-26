import Events from "../util/events";

export default class Store extends Events {
	constructor(name, value) {
		super();

		this.defineEvent("StateChange", "value");

		this.name = name;
		this.value = value;
	}

	// change the state
	set(value) {
		this.value = value;

		this.emit("StateChange");
	}

	// bind a store to the react state
	bind(component, name = this.name) {
		// set the initial state
		component.state[name] = this.value;

		// listen for state changes
		component.addSub(
			this.on("StateChange", () => {
				// update the component's state
				component.setState({
					[name]: this.value
				});
			})
		);
	}
}
