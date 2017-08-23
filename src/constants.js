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
	const baseline = BASELINE + (innerWidth > SIDEBAR_OPEN ? SIDEBAR_WIDTH : 0);
	const depth = ((innerWidth - baseline) / INDENT_SIZE | 0) + 1;

	return depth < 1 ? 1 : depth;
};
