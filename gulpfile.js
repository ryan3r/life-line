const gulp = require("gulp");
const babel = require("gulp-babel");
const del = require("del");
const watch = require("gulp-watch");
const sourcemaps = require("gulp-sourcemaps");
const livereload = require("gulp-livereload");
const plumber = require("gulp-plumber");

// build the source and tests
gulp.task("default", ["clean"], function() {
	return Promise.all([
		// watch and build the code
		promiseifyStream(
			build("src/**/*.js", "public/js")
		),

		// watch and build the tests
		promiseifyStream(
			build("tests/**/*.js", "public/tests/js")
		)
	])

	.then(() => {
		// reload the page
		livereload.reload();
	});
});

// build the source for production
gulp.task("prod", ["clean"], function() {
	// build the code
	return promiseifyStream(
		build("src/**/*.js", "public/js")
	);
});

// continuously build the code
gulp.task("watch", ["default"], function() {
	// start livereload
	livereload.listen({ quiet: true });

	// watch for changes
	gulp.watch("{src,tests}/**/*.js", ["default"]);
});

// build a module
const build = function(src, dest) {
	return gulp.src(src)

	// use plumber to catch any errors
	.pipe(plumber(err => console.log(err.stack)))

	// start recoding source maps
	.pipe(sourcemaps.init())

	// compile the code
	.pipe(babel({
		presets: ["es2015"],
		plugins: [
			["transform-react-jsx", { pragma: "preact.h" }],
			"transform-es2015-modules-amd"
		]
	}))

	// save the source maps
	.pipe(sourcemaps.write("."))

	// pass errors on to gulp
	.pipe(plumber.stop())

	// write the files
	.pipe(gulp.dest(dest));
};

// return a promise for when a stream ends
const promiseifyStream = function(stream) {
	return new Promise((resolve, reject) => {
		// add stream listeners
		stream.on("end", resolve);
		stream.on("error", reject);
	});
};

// delete the compiled files
gulp.task("clean", function() {
	return Promise.all([
		del(["public/js/**/*.{js,map}"]),
		del(["public/tests/js/**/*.{js,map}"])
	]);
});
