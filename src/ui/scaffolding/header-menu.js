import Component from "../component";
import React from "react";
import RaisedButton from "material-ui/RaisedButton";
import MenuItem from "material-ui/MenuItem";
import IconMenu from "material-ui/IconMenu";
import MoreVertIcon from "material-ui/svg-icons/navigation/more-vert";
import IconButton from "material-ui/IconButton";
import {showCompleted, propDrawerTask} from "../../stores/states";

export default class HeaderMenu extends Component {
	constructor() {
		super();

		showCompleted.bind(this);
	}

	onToggleShowCompleted = () => {
		showCompleted.set(!this.state.showCompleted);
	}

	// open the props sidebar for the current task
	showSidebar = () => {
		propDrawerTask.set(this.props.task);
	}

	render() {
		// detect the show/hide completed state
		let btnMsg = this.state.showCompleted ? "Hide" : "Show";

		// delete completed children
		const deleteCompleted = () => this.props.task.deleteCompleted();

		// the icon for the filter menu
		const menuIcon = <IconButton iconStyle={{ storke: "#fff", fill: "#fff" }}>
				<MoreVertIcon/>
		</IconButton>;

		return <IconMenu iconButtonElement={menuIcon}>
			<MenuItem
				onClick={this.onToggleShowCompleted}
				primaryText={`${btnMsg} completed`}/>
			<MenuItem
				onClick={this.showSidebar}
				primaryText="Edit props"/>
			<MenuItem
				onClick={deleteCompleted}
				primaryText="Delete completed"/>
		</IconMenu>;
	}
};
