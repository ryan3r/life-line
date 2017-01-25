// set up babel
require("babel-register");

// load the server
module.exports = require("./src/server").default;

// auto run in dev mode
if(module == require.main) {
	module.exports(true);
}
