import Component from "../component";
import {router} from "../../router";
import React from "react";
import {List, ListItem} from "material-ui/List";
import IconButton from "material-ui/IconButton";
import ClearIcon from "material-ui/svg-icons/content/clear";
import AddIcon from "material-ui/svg-icons/content/add";
import TextField from "material-ui/TextField";
import {lists} from "../../data/lists";
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
					loading: false
				});
			})
		);
	}

	removeList(id) {
		// delete the list
		return () => lists.delete(id);
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

	render() {
		// show the loader
		if(this.state.loading) {
			return null;
		}

		return <div>
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
		</div>;
	}
}
