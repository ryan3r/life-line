var browserify = require("browserify");
var watchify = require("watchify");
var fs = require("fs");
var package = require("./package.json");
var buildInfo = require("./build.json");
var codeFrame = require("babel-code-frame");

const DEV_BUNDLE = process.argv[2] !== "-p";

// a regular expression for parsing error messages
const ERROR_EXPR = /^.+?: (.+?) \((\d+):(\d+)\) while parsing file: (.+?)$/;

// a list of bundles to build
const BUNDLES = [
	{
		entry: "./src/client/index.js",
		output: "static/bundle.js",
		updateBuildNumber: true
	},
	{
		entry: "./src/client/sw-index.js",
		output: "static/service-worker.js"
	},
	{
		entry: "./tests/all.js",
		output: "static/tests.js"
	}
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
	bundler.on("log", msg => {
		console.log(msg);

		// update the build number in the package
		if(bundle.updateBuildNumber) {
			++buildInfo.rawBuildNumber;

			// use base 32 to keep the number short
			buildInfo.buildNumber = buildInfo.rawBuildNumber.toString(36);

			// loop back to 0 to keep the size down
			if(buildInfo.buildNumber.length > 5) {
				buildInfo.rawBuildNumber = 0;
			}

			fs.writeFileSync("build.json", JSON.stringify(buildInfo, null, "\t"));
		}
	});

	// run the initial build
	buildBundle();
}
