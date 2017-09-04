export default class SelectionSnapshot {
	constructor() {
		let selection = getSelection();

		if(selection.rangeCount > 0) {
			let range = selection.getRangeAt(0);

			// save the current range
			this.start = range.startOffset;
			this.end = range.endOffset;
			this.node = range.startContainer;
		}
	}

	// restore the selected range
	restore(node = this.node) {
		let selection = getSelection();

		// remove the old ranges
		selection.removeAllRanges();

		// recreate the selection
		let range = document.createRange();

		// make sure the end is still inside the node
		if(node.textContent.length < this.end) {
			this.end = node.textContent.length;
		}

		range.setStart(node, this.start);
		range.setEnd(node, this.end);

		// reselect content
		selection.addRange(range);
	}
}
