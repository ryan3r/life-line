import {TaskComponent} from "./task-component";

const TAU = Math.PI * 2;

// the size of the widget
const SIZE = 25;
// the width of the progress curve (don't forget to update the css)
const CURVE_WIDTH = 3;

// the center of the circle
const ORIGIN = SIZE / 2;
// the radius of the circle
const RADIUS = ORIGIN - CURVE_WIDTH;
// the far right side of the circle
const RIGHT_X = ORIGIN;
const RIGHT_Y = ORIGIN - RADIUS;

export class Checkbox extends TaskComponent {
	constructor() {
		super();

		// bind event listeners
		this.toggle = this.toggle.bind(this);

		// set the preloaded state
		this.state.state = {
			type: "none",
			percentDone: 0
		};
	}

	addListeners() {
		// get the initial state
		this.setState({
			state: this.task.state
		});

		// listen for state changes
		this.addSub(
			this.task.on("state", value => {
				this.setState({
					state: value
				});
			})
		);
	}

	// toggle the state
	toggle() {
		this.task.state = this.state.state.type == "done" ? "none" : "done";
	}

	render() {
		let {percentDone, type} = this.state.state;

		// the checked state of a checkbox
		let ariaState = (percentDone === 0 || percentDone === 1) ?
			"" + !!percentDone :
			"mixed";

		// the circle/semicircle for the percent done
		let doneCircle;

		// 100% does not get properly rendered
		if(percentDone === 1) {
			doneCircle = <circle cx={ORIGIN} cy={ORIGIN} r={RADIUS}/>
		}
		else {
			// get the angle in radians
			const angle = percentDone * TAU;

			// get the x and y coordinates
			const x = (Math.cos(angle - (Math.PI / 2)) * RADIUS) + ORIGIN;
			const y = (Math.sin(angle - (Math.PI / 2)) * RADIUS) + ORIGIN;

			// large arc draws the long way around the circle (angle > pi)
			const largeArc = percentDone > 0.5;

			doneCircle = <path
				d={`M ${RIGHT_X} ${RIGHT_Y} A ${RADIUS} ${RADIUS} ${+!largeArc} ${+largeArc} 1 ${x} ${y}`}/>
		}

		return <svg width={SIZE} height={SIZE} class={`checkbox flex-noshrink ${type}`}
				onClick={this.toggle}
				aria-role="checkbox" aria-checked={ariaState}
				area-labelledby={`task-${this.props.task.id}`}>
			<circle cx={ORIGIN} cy={ORIGIN} r={RADIUS - CURVE_WIDTH * 1.5} class="inner"/>
			<circle cx={ORIGIN} cy={ORIGIN} r={RADIUS} class="backdrop"/>
			{doneCircle}
		</svg>;
	}
}
