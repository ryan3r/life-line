import {maxNestingDepth} from "../constants";
import currentTask from "../data/current-task";

export default function isTaskVisible(task) {
	// the deepest we can go
	const maxDepth = currentTask.task.depth + maxNestingDepth();

	return task.depth <= maxDepth;
}
