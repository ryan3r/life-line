import {Component} from "./component";
import {TaskLink} from "./task-link";
import {router} from "../router";
import React from "react";
import Drawer from "material-ui/Drawer";
import {SIDEBAR_WIDTH} from "../constants";
import {List, ListItem} from "material-ui/List";
import IconButton from "material-ui/IconButton";
import ClearIcon from "material-ui/svg-icons/content/clear";
import AddIcon from "material-ui/svg-icons/content/add";
import TextField from "material-ui/TextField";

export class ListsDrawer extends Component {
	constructor() {
		super();

		this.state.lists = [];
		this.state.newList = "";
	}

	componentDidMount() {
		let {lists} = this.props;

		// get the initial lists
		this.setState({
			lists: lists.lists
		});

		// listen for changes
		this.addSub(
			lists.on("change", () => {
				this.setState({
					lists: lists.lists
				});
			})
		);
	}

	removeList(id) {
		// delete the list
		return () => this.props.lists.delete(id);
	}

	// update the state with changes to the new list name
	newListUpdate = e => {
		this.setState({
			newList: e.target.value
		});
	}

	// add a new list
	addList = e => {
		e.preventDefault();

		// no list name
		if(!this.state.newList) {
			return;
		}

		// create the list
		const id = this.props.lists.create(this.state.newList);

		// clear the input
		this.setState({
			newList: ""
		});

		// navigate to the list
		router.openList(id);

		// close the sidebar
		this.props.onClose();
	}

	// switch lists
	openList(id) {
		return () => {
			// open the list
			router.openList(id);

			// close the sidebar
			this.props.onClose();
		};
	}

	render() {
		return <Drawer
				docked={false}
				width={SIDEBAR_WIDTH}
				open={this.props.open}
				onRequestChange={this.props.onClose}>
			<List>
				{this.state.lists.map(list => {
					const deleteBtn = <IconButton onClick={this.removeList(list.id)}>
						<ClearIcon/>
					</IconButton>;

					return <ListItem
						key={list.id}
						primaryText={list.name}
						rightIconButton={deleteBtn}
						onClick={this.openList(list.id)}/>
				})}
			</List>
			<div className="list-entry">
				<form className="flex flex-vcenter" onSubmit={this.addList}>
					<TextField
						placeholder="New list"
						value={this.state.newList}
						onChange={this.newListUpdate}
						type="text"
						id="new-list"/>
					<IconButton onClick={this.addList}>
						<AddIcon/>
					</IconButton>
				</form>
			</div>
		</Drawer>;
	}
}
