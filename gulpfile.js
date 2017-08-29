const gulp = require("gulp");
const plumber = require("gulp-plumber");
const gulpWebpack = require("gulp-webpack");
const webpack = require("webpack");
const path = require("path");
const uglify = require("gulp-uglify");

// build the source
gulp.task("default", function() {
	return build(false);
});

// build for production
gulp.task("prod", function() {
	return build({ production: true });
});

// build the source and watch for changes
gulp.task("watch", function() {
	build({ watch: true });
	build({ watch: true, tests: true });
});

// build the tests
gulp.task("tests", function() {
	build({ tests: true });
});

function build({watch, production, tests}) {
	let buildPipe = gulp.src(tests ? "src/tests/index.js" : "src/index.js")

	// use plumber to catch any errors
	.pipe(plumber(err => console.log(err.stack)))

	// compile the code
	.pipe(gulpWebpack({
		watch,
		module: {
			rules: [
				{
					test: /\.js$/,
					exclude: /node_modules/,
					loader: "babel-loader",
					options: {
						presets: ["es2015", "stage-1"],
						plugins: [
							"transform-react-jsx",
							"transform-es2015-modules-amd"
						]
					}
				}
			]
		},
		output: {
			filename: tests ? "test-bundle.js" : "bundle.js"
		},
		devtool: !production && "eval",
		target: "web",
		plugins: [
			new webpack.DefinePlugin({
				VERSION: production ?
					`"${require("./package.json").version}"` :
					`"${require("./package.json").version}-dev"`
			})
		],
		resolve: {
			alias: production && {
				"react": path.join(__dirname, "node_modules/react/dist/react.min.js"),
				"react-dom": path.join(__dirname, "node_modules/react-dom/dist/react-dom.min.js")
			}
		}
	}, webpack));

	// uglify in production
	if(production) {
		buildPipe = buildPipe.pipe(uglify());
	}

	return buildPipe
		// pass errors on to gulp
		.pipe(plumber.stop())

		// write the files
		.pipe(gulp.dest("public"));
};
