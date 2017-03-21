/**
 * The progress bar at the top of the page
 */

lifeLine.makeDom.register("progress", {
	make() {
		return {
			classes: "progress",
			name: "progress"
		};
	},

	bind(opts, {progress}) {
		// set the progress bar value [0, 1]
		var setProgress = function(value) {
			var adjustBy = 0;

			if(value > 0) {
				// scale leaves the progress bar perfectly in the middle of the page
				// 1 - value gets the amount of space remaining
				// / 2 gets just the space on one side
				// / value gets that amount relitive to the progress bars scaled width
				// * 100 converts it to a percent
				adjustBy = (1 - value) / 2 / value * 100;
			}

			progress.style.transform = `scaleX(${value}) translateX(-${adjustBy}%)`;
		};

		// hide the progress bar initially
		progress.style.transform = "scaleX(0)";

		render = function() {
			// calculate how much this percent contributes to the overall progress
			var contribution = 1 / progresses.length;

			setProgress(
				progresses.reduce((prog, perc) => prog + perc.value * contribution, 0)
			);
		};

		render();
	}
});

// sub render until progress is created
var render = () => {};

var progresses = [];

// combine multiple progress levels
lifeLine.Progress = class {
	constructor() {
		this.value = 0;

		progresses.push(this);

		render();
	}

	// set the progress
	set(value) {
		this.value = value;

		// all the jobs are done remove them
		if(progresses.every(prog => prog.value == 1)) {
			progresses = [];
		}

		render();
	}
};
