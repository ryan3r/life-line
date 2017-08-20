import {Component} from "./component";
import React from "react";
import Drawer from "material-ui/Drawer";
import {SIDEBAR_WIDTH, SIDEBAR_OPEN} from "../constants";
import AppBar from "material-ui/AppBar";
import {CurrentUser} from "./current-user";
import {Tabs, Tab} from "material-ui/Tabs";
import {Lists} from "./lists";
import {dockedStore} from "../stores/states";

export class ListsDrawer extends Component {
	constructor() {
		super();

		this.state.title = "Lists";

		dockedStore.bind(this);
	}

	// update the title
	openTab(title) {
		return () => this.setState({ title });
	}

	// close the side bar if we are not docked
	onClose = () => {
		if(!this.state.docked) {
			this.props.onClose();
		}
	}

	render() {
		return <Drawer
				docked={this.state.docked}
				width={SIDEBAR_WIDTH}
				open={this.props.open}
				onRequestChange={this.props.onClose}>
			<AppBar
				title={this.state.title}
				iconElementLeft={<span></span>}
				iconElementRight={<CurrentUser/>}/>
			{/*<Tabs>
				<Tab label="Lists" onActive={this.openTab("Lists")}>*/}
					<Lists onClose={this.onClose}/>
				{/*</Tab>
				<Tab label="Other" onActive={this.openTab("Other")}>
					Filler content
				</Tab>
			</Tabs>*/}
		</Drawer>;
	}
}
