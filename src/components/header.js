import {EditTaskProp} from "./edit-task-prop";
import AppBar from "material-ui/AppBar";
import React from "react";
import {SIDEBAR_OPEN} from "../constants";
import {Component} from "./component";
import {Filter} from "./filter";

export class Header extends Component {
	constructor() {
		super();

		// listen to window resizes
		this.listen(window, "resize", this.resize);

		// set the initial size
		this.state.docked = innerWidth > SIDEBAR_OPEN;
	}

	// dock/undock the drawer
	resize = () => {
		this.setState({
			docked: innerWidth > SIDEBAR_OPEN
		});
	};

	render() {
		const filterMenu = <Filter
			showCompleted={this.props.showCompleted}
			onToggleShowCompleted={this.props.toggleState}
			task={this.props.task}/>;

		return <AppBar
			title={<EditTaskProp
				className="invisible"
				task={this.props.task}
				prop="name"/>}
			onLeftIconButtonTouchTap={this.props.onHeaderToggle}
			style={{flexShrink: 0}}
			iconElementLeft={this.state.docked ? <span></span> : null}
			iconElementRight={filterMenu}/>
	}
}
