import {App} from "./components/app";
import {Lists} from "./lists";

firebase.auth().onAuthStateChanged(function(user) {
	// make the user authenticate them self
	if(!user) {
		location.href = "/login.html";
	}

	// load the lists
	let lists = new Lists(user.uid);

	// render the app
	preact.render(<App lists={lists}/>, document.body, document.querySelector(".pre-loader"));
});
