// the approimate width of an edit task widget
export const BASELINE = 350;

// the indentation for sub tasks
export const INDENT_SIZE = 30;

// the time to wait from when a char is typed until we save
export const DEBOUNCE_TIMER = 500;

// the min width for the toolbar to show all the buttons
export const MIN_WIDE_TOOLBAR = 430;

// the sidebar sizing
export const SIDEBAR_WIDTH = 250;
export const PROP_SIDEBAR_WIDTH = 300;

export const SIDEBAR_OPEN = 450 + SIDEBAR_WIDTH;
export const PROP_SIDEBAR_OPEN = SIDEBAR_OPEN + PROP_SIDEBAR_WIDTH;

// the size to start show the bread crumbs at
export const BREAD_CRUMBS = 500;

// the maximum number of characters to display in a list (for description)
export const PROP_MAX_CHARS = 150;

// the properties for a task
export const TASK_PROPS = [
	{ name: "name", syncToFirebase: true, editor: "input" },
	{ name: "hideChildren" },
	{ name: "due", syncToFirebase: true, editor: "date" },
	{ name: "description", syncToFirebase: true, editor: "textarea" },
	{ name: "stateLastModified", syncToFirebase: true },
	{ name: "repeat", syncToFirebase: true },
	{ name: "repeatDay", syncToFirebase: true }
];

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
