import Component from "../component";
import {router} from "../../router";
import React from "react";
import {List, ListItem} from "material-ui/List";
import IconButton from "material-ui/IconButton";
import ClearIcon from "material-ui/svg-icons/content/clear";
import AddIcon from "material-ui/svg-icons/content/add";
import TextField from "material-ui/TextField";
import {lists} from "../../data/lists";
import FlatButton from "material-ui/FlatButton";
import Dialog from "material-ui/Dialog";
import LinearProgress from "material-ui/LinearProgress";

export default class Lists extends Component {
	constructor() {
		super();

		this.state.lists = [];
		this.state.newList = "";
		this.state.loading = true;
	}

	componentWillMount() {
		// listen for changes
		this.addSub(
			lists.onLists(lists => {
				this.setState({
					lists
				});
			})
		);

		// wait for the lists to load
		this.addSub(
			lists.onLoaded(() => {
				this.setState({
					loading: false,
					loggedIn: !!lists.userId
				});
			})
		);
	}

	removeList(list) {
		// delete the list
		return () => this.setState({ deleteList: list });
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
		const id = lists.create(this.state.newList);

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

	// close the delete confirmation dialog
	closeDialog = () => {
		this.setState({
			deleteList: undefined
		});
	}

	// delete the current list
	deleteCurrent = () => {
		lists.delete(this.state.deleteList.id);

		this.closeDialog();
	}

	render() {
		// show the loader
		if(this.state.loading) {
			return null;
		}

		// not logged in
		if(!this.state.loggedIn) {
			return <div style={{padding: "15px"}}>
				You need to login to see your lists.
			</div>;
		}

		// the delete dialog actions
		const actions = <div>
			<FlatButton
				label="Cancel"
				onClick={this.closeDialog}/>
			<FlatButton
				label="Delete"
				onClick={this.deleteCurrent}
				primary={true}/>
		</div>;

		return <div>
			<Dialog
				actions={actions}
				title="Delete list"
				modal={false}
				open={!!this.state.deleteList}
				onRequestClose={this.closeDialog}>
				Are you sure you want to delete {
					this.state.deleteList ? this.state.deleteList.name : null
				}.
			</Dialog>
			<List>
				{this.state.lists.map(list => {
					const deleteBtn = <IconButton onClick={this.removeList(list)}>
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
		</div>;
	}
}
