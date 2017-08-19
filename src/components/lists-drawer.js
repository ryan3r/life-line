import {Component} from "./component";
import React from "react";
import Drawer from "material-ui/Drawer";
import {SIDEBAR_WIDTH} from "../constants";
import AppBar from "material-ui/AppBar";
import {CurrentUser} from "./current-user";
import {Tabs, Tab} from "material-ui/Tabs";
import {Lists} from "./lists";

export class ListsDrawer extends Component {
	constructor() {
		super();

		this.state.title = "Lists";
	}

	// update the title
	openTab(title) {
		return () => this.setState({ title });
	}

	render() {
		return <Drawer
				docked={false}
				width={SIDEBAR_WIDTH}
				open={this.props.open}
				onRequestChange={this.props.onClose}>
			<AppBar
				title={this.state.title}
				iconElementLeft={<span></span>}
				iconElementRight={<CurrentUser/>}/>
			{/*<Tabs>
				<Tab label="Lists" onActive={this.openTab("Lists")}>*/}
					<Lists lists={this.props.lists} onClose={this.props.onClose}/>
				{/*</Tab>
				<Tab label="Other" onActive={this.openTab("Other")}>
					Filler content
				</Tab>
			</Tabs>*/}
		</Drawer>;
	}
}
