import {TaskComponent} from "../task-component";
import React from "react";

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

export default class Checkbox extends TaskComponent {
	constructor() {
		super();

		// set the preloaded state
		this.state.state = {
			type: "none",
			percentDone: 0
		};
	}

	onTaskState() {
		// get the initial state
		this.setState({
			state: this.task.state
		});
	}

	// toggle the state
	toggle = () => {
		this.task.state = this.state.state.type == "done" ? "none" : "done";
	}

	render() {
		let {percentDone, type} = this.state.state;

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

		return <svg width={SIZE} height={SIZE} className={`checkbox flex-noshrink ${type}`}
				onClick={this.toggle}>
			<circle cx={ORIGIN} cy={ORIGIN} r={RADIUS - CURVE_WIDTH * 1.5} className="inner"/>
			<circle cx={ORIGIN} cy={ORIGIN} r={RADIUS} className="backdrop"/>
			{doneCircle}
		</svg>;
	}
}
