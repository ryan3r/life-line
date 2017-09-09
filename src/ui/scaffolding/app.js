import Component from "../component";
import Header from "./header";
import {router} from "../../router";
import ListsDrawer from "./lists-drawer";
import React from "react";
import AppBar from "material-ui/AppBar";
import IconButton from "material-ui/IconButton";
import {SIDEBAR_WIDTH, PROP_SIDEBAR_WIDTH} from "../../constants";
import {lists} from "../../data/lists";
import {dockedStore, dockedPropStore} from "../../stores/states";
import Editor from "../task-components/editor";
import UnsavedChanges from "./unsaved-changes";

export default class App extends Component {
	constructor() {
		super();

		dockedStore.bind(this);
		dockedPropStore.bind(this);
	}

	render() {
		// the margins for the sidebars
		const margins = {
			marginLeft: this.state.docked ? SIDEBAR_WIDTH : 0,
			marginRight: this.state.dockedProp ? PROP_SIDEBAR_WIDTH : 0
		};

		// show the app
		return <div className="container"
				style={margins}>
			<Header/>
			<ListsDrawer/>
			<Editor/>
			<UnsavedChanges/>
		</div>;
	}
}
