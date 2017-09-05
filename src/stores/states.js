import Store from "./store";
import {SIDEBAR_OPEN} from "../constants";

// the docked state of the sidebar
export let dockedStore = new Store("docked", innerWidth > SIDEBAR_OPEN);

// listen for window size changes
window.addEventListener("resize", () => {
	drawerOpen.set(undefined);
	dockedStore.set(innerWidth > SIDEBAR_OPEN);
});

// the state of the side bar
export let drawerOpen = new Store("drawerOpen");

// the state of the props side bar
export let propDrawerTask = new Store("propDrawerTask");

// show or don't show completed tasks
export let showCompleted = new Store("showCompleted");

// the title for the current page
export let pageTitle = new Store("pageTitle");
