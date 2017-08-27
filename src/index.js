import App from "./ui/scaffolding/app";
import {lists} from "./data/lists";
import ReactDom from "react-dom";
import React from "react";
import MuiThemeProvider from "material-ui/styles/MuiThemeProvider";
import theme from "./ui/theme";

firebase.auth().onAuthStateChanged(function(user) {
	// make the user authenticate them self
	if(!user) {
		location.href = "/login.html";
	}

	// load the lists for this list
	lists.setUid(user.uid);
});

// render the app
ReactDom.render(
	<MuiThemeProvider muiTheme={theme}>
		<App/>
	</MuiThemeProvider>,
	document.querySelector(".app-wrapper")
);
