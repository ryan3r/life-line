import {Component} from "./component";
import {router} from "../router";
import React from "react";

export class TaskLink extends Component {
	constructor() {
		super();

		this.open = this.open.bind(this);
	}

	open(e) {
		// let the standard modifiers do their thing
		if(e.ctrlKey || e.altKey || e.shiftKey) return;

		e.preventDefault();

		// pick the correct type
		if(this.props.isList) {
			router.openList(this.props.id);
		}
		else {
			router.openTask(this.props.id);
		}

		// call the click handler
		if(this.props.onClick) {
			this.props.onClick();
		}
	}

	render() {
		let href;

		// get the location we will navigate to
		if(this.props.isList) {
			href = `/${this.props.id}/`;
		}
		else {
			href = `/${router.listId}/${this.props.id}`;
		}

		return <a href={href} className={this.props.className} onClick={this.open}>
			{this.props.children}
		</a>;
	}
};
