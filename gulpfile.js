const gulp = require("gulp");
const plumber = require("gulp-plumber");
const gulpWebpack = require("gulp-webpack");
const webpack = require("webpack");

// build the source
gulp.task("default", function() {
	return build(false);
});

// build the source and watch for changes
gulp.task("watch", function() {
	return build(true);
});

function build(watch) {
	return gulp.src("src/index.js")

	// use plumber to catch any errors
	.pipe(plumber(err => console.log(err.stack)))

	// compile the code
	.pipe(gulpWebpack({
		watch,
		module: {
			rules: [
				{
					test: /\.js$/,
					loader: "babel-loader",
					options: {
						presets: ["es2015"],
						plugins: [
							["transform-react-jsx", { pragma: "preact.h" }],
							"transform-es2015-modules-amd"
						]
					}
				}
			]
		},
		output: {
			filename: "bundle.js"
		},
		devtool: "source-map",
		target: "web"
	}, webpack))

	// pass errors on to gulp
	.pipe(plumber.stop())

	// write the files
	.pipe(gulp.dest("public"));
};
