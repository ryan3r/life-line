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
		// listen for state changes
		component.addSub(
			this.on("state-change", value => {
				// update the component's state
				component.setState({
					[name]: value
				});
			})
		);
	}
}
