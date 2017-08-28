// the approimate width of an edit task widget
export const BASELINE = 350;

// the indentation for sub tasks
export const INDENT_SIZE = 30;

// the sidebar sizing
export const SIDEBAR_OPEN = 750;
export const SIDEBAR_WIDTH = 300;

// the maximum number of children to show for a non-toplevel task
export const MAX_CHILDREN = 5;

// the number of milliseconds to wait before hiding a completed task
export const HIDE_COMPLETED_TIMEOUT = 500;

// calculate the max nesting depth
// NOTE: the + 1 is because the first row of tasks are not indented
export const maxNestingDepth = () => {
	// check if the sidebar is open
	const SIDEBAR_WIDTH_IN_BASELINE = innerWidth > SIDEBAR_OPEN ? SIDEBAR_WIDTH : 0;

	// calculate the baseline for the app
	const baseline = BASELINE + SIDEBAR_WIDTH_IN_BASELINE;

	// divy up the rest of the width to tasks
	const depth = ((innerWidth - baseline) / INDENT_SIZE | 0) + 1;

	// make sure we at least have a depth of 1
	return depth < 1 ? 1 : depth;
};
