import {Component} from "./component";

export let Filter = ({showCompleted, onToggleShowCompleted, task}) => {
	// detect the show/hide completed state
	let btnMsg = showCompleted ? "Hide" : "Show";

	// delete completed children
	const deleteCompleted = () => task.deleteCompleted();

	return <div class="filter">
		<button class="text-btn" onClick={onToggleShowCompleted}>
			{btnMsg} completed
		</button>
		<button class="text-btn" onClick={deleteCompleted}>
			Delete completed
		</button>
	</div>;
};
