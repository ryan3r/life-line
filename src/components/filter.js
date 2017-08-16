import {Component} from "./component";

export let Filter = ({showCompleted, onToggleShowCompleted}) => {
	// detect the show/hide completed state
	let btnMsg = showCompleted ? "Hide" : "Show";

	return <div class="filter">
		<button class="text-btn" onClick={onToggleShowCompleted}>
			{btnMsg} completed
		</button>
	</div>;
};
