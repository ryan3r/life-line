import {EditTaskProp} from "./edit-task-prop";
import AppBar from "material-ui/AppBar";
import React from "react";
import {SIDEBAR_OPEN} from "../constants";
import {Component} from "./component";
import {Filter} from "./filter";
import {dockedStore, drawerOpen} from "../stores/states";

export class Header extends Component {
	constructor() {
		super();

		dockedStore.bind(this);
	}

	render() {
		const filterMenu = <Filter task={this.props.task}/>;

		return <AppBar
			title={<EditTaskProp
				className="invisible"
				task={this.props.task}
				prop="name"/>}
			onLeftIconButtonTouchTap={() => drawerOpen.set(true)}
			style={{flexShrink: 0}}
			iconElementLeft={this.state.docked ? <span></span> : null}
			iconElementRight={filterMenu}/>
	}
}
