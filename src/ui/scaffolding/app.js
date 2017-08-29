import Component from "../component";
import Header from "./header";
import {router} from "../../router";
import ListsDrawer from "./lists-drawer";
import React from "react";
import AppBar from "material-ui/AppBar";
import IconButton from "material-ui/IconButton";
import {SIDEBAR_WIDTH} from "../../constants";
import {lists} from "../../data/lists";
import {dockedStore} from "../../stores/states";
import Editor from "../task-components/editor";
import UnsavedChanges from "./unsaved-changes";

export default class App extends Component {
	constructor() {
		super();

		dockedStore.bind(this);
	}

	render() {
		// show the app
		return <div className="container"
				style={{ marginLeft: this.state.docked ? SIDEBAR_WIDTH : 0 }}>
			<Header task={this.state.task}/>
			<ListsDrawer/>
			<Editor/>
			<UnsavedChanges/>
		</div>;
	}
}
