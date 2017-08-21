import {Store} from "./store";
import {SIDEBAR_OPEN} from "../constants";

// the docked state of the sidebar
export let dockedStore = new Store("docked", innerWidth > SIDEBAR_OPEN);

// listen for window size changes
window.addEventListener("resize", () => {
	dockedStore.set(innerWidth > SIDEBAR_OPEN);
});

// the state of the side bar
export let drawerOpen = new Store("drawerOpen");

// show or don't show completed tasks
export let showCompleted = new Store("showCompleted");
