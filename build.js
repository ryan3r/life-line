var browserify = require("browserify");
var watchify = require("watchify");
var fs = require("fs");
var package = require("./package.json");
var codeFrame = require("babel-code-frame");

const DEV_BUNDLE = process.argv[2] !== "-p";

// a regular expression for parsing error messages
const ERROR_EXPR = /^.+?: (.+?) \((\d+):(\d+)\) while parsing file: (.+?)$/;

// a list of bundles to build
const BUNDLES = [
	{
		entry: "./src/client/index.js",
		output: "static/bundle.js"
	},
	{
		entry: "./src/client/sw-index.js",
		output: "static/service-worker.js"
	},
];

for(let bundle of BUNDLES) {
	// setup the bundler
	let bundler = browserify(bundle.entry, {
		cache: {},
		packageCache: {},
		plugin: DEV_BUNDLE ? [watchify] : [],
		debug: DEV_BUNDLE
	});

	// configure babelify
	bundler = bundler.transform("babelify");

	// build the bundle
	let buildBundle = function() {
		// build
		var buildStream = bundler.bundle();

		// save
		buildStream.pipe(fs.createWriteStream(bundle.output));

		// catch errors
		buildStream.on("error", err => {
			// break down the error message
			var match = err.message.match(ERROR_EXPR);

			// we don't understand the error message
			if(!match) {
				console.log("COULD NOT PARSE ERROR");
				console.log(err.message);
				return;
			}

			// load the file
			var file = fs.readFileSync(match[4], "utf8");

			// display the error message
			console.log("Error:", match[1], `(${match[2]},${match[3]})`);
			console.log(codeFrame(file, +match[2], +match[3], {
				highlightCode: true
			}));
		});
	};

	// rebuild on refresh
	bundler.on("update", buildBundle);
	// log out the build size and time
	bundler.on("log", msg => console.log(msg));

	// run the initial build
	buildBundle();
}
