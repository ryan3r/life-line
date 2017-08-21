import {Component} from "./component";
import React from "react";
import RaisedButton from "material-ui/RaisedButton";
import MenuItem from "material-ui/MenuItem";
import IconMenu from "material-ui/IconMenu";
import MoreVertIcon from "material-ui/svg-icons/navigation/more-vert";
import IconButton from "material-ui/IconButton";
import {showCompleted} from "../stores/states";

export class Filter extends Component {
	constructor() {
		super();

		showCompleted.bind(this);
	}

	onToggleShowCompleted = () => {
		showCompleted.set(!this.state.showCompleted);
	}

	render() {
		// detect the show/hide completed state
		let btnMsg = this.state.showCompleted ? "Hide" : "Show";

		// delete completed children
		const deleteCompleted = () => task.deleteCompleted();

		// the icon for the filter menu
		const menuIcon = <IconButton iconStyle={{ storke: "#fff", fill: "#fff" }}>
				<MoreVertIcon/>
		</IconButton>;

		return <IconMenu iconButtonElement={menuIcon}>
			<MenuItem
				onClick={this.onToggleShowCompleted}
				primaryText={`${btnMsg} completed`}/>
			<MenuItem
				onClick={deleteCompleted}
				primaryText="Delete completed"/>
		</IconMenu>;
	}
};
