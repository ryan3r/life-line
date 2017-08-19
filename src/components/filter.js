import {Component} from "./component";
import React from "react";
import RaisedButton from "material-ui/RaisedButton";
import MenuItem from "material-ui/MenuItem";
import IconMenu from "material-ui/IconMenu";
import MoreVertIcon from "material-ui/svg-icons/navigation/more-vert";
import IconButton from "material-ui/IconButton";

export let Filter = ({showCompleted, onToggleShowCompleted, task}) => {
	// detect the show/hide completed state
	let btnMsg = showCompleted ? "Hide" : "Show";

	// delete completed children
	const deleteCompleted = () => task.deleteCompleted();

	// the icon for the filter menu
	const menuIcon = <IconButton iconStyle={{ storke: "#fff", fill: "#fff" }}>
			<MoreVertIcon/>
	</IconButton>;

	return <IconMenu iconButtonElement={menuIcon}>
		<MenuItem
			onClick={onToggleShowCompleted}
			primaryText={`${btnMsg} completed`}/>
		<MenuItem
			onClick={deleteCompleted}
			primaryText="Delete completed"/>
	</IconMenu>;
};
