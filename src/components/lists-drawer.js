import {Component} from "./component";
import {TaskLink} from "./task-link";
import {router} from "../router";

export class ListsDrawer extends Component {
	constructor() {
		super();

		this.addList = this.addList.bind(this);
		this.newListUpdate = this.newListUpdate.bind(this);

		this.state.lists = [];
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
	newListUpdate(e) {
		this.setState({
			newList: e.target.value
		});
	}

	// add a new list
	addList(e) {
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

	render() {
		return <div class={`drawer ${this.props.open ? "open" : ""}`}>
			{this.state.lists.map(list => {
				return <div class="list-entry flex flex-vcenter">
					<TaskLink id={list.id} isList onClick={this.props.onClose} class="flex-fill">
						{list.name}
					</TaskLink>
					<button class="btn" onClick={this.removeList(list.id)}>
						<i class="material-icons">clear</i>
					</button>
				</div>
			})}
			<div class="list-entry">
				<form class="flex flex-vcenter" onSubmit={this.addList}>
					<input class="editor flex-fill" placeholder="New list"
						value={this.state.newList} onInput={this.newListUpdate}/>
					<button class="btn">
						<i class="material-icons">add</i>
					</button>
				</form>
			</div>
		</div>;
	}
}
