import {Component} from "./component";
import React from "react";
import RaisedButton from "material-ui/RaisedButton";

export let Filter = ({showCompleted, onToggleShowCompleted, task}) => {
	// detect the show/hide completed state
	let btnMsg = showCompleted ? "Hide" : "Show";

	// delete completed children
	const deleteCompleted = () => task.deleteCompleted();

	// set the margins
	const style = { margin: "10px" };

	return <div className="filter">
		<RaisedButton
			onClick={onToggleShowCompleted}
			label={`${btnMsg} completed`}
			style={style}/>
		<RaisedButton
			onClick={deleteCompleted}
			label="Delete completed"
			style={style}/>
	</div>;
};
