import {App} from "./components/app";
import {Lists} from "./lists";
import ReactDom from "react-dom";
import React from "react";
import MuiThemeProvider from "material-ui/styles/MuiThemeProvider";

firebase.auth().onAuthStateChanged(function(user) {
	// make the user authenticate them self
	if(!user) {
		location.href = "/login.html";
	}

	// load the lists
	let lists = new Lists(user.uid);

	// render the app
	ReactDom.render(<MuiThemeProvider>
		<App lists={lists}/>
	</MuiThemeProvider>, document.querySelector(".app-wrapper"));
});
