import {Store} from "./store";
import {SIDEBAR_OPEN} from "../constants";

// the docked state of the sidebar
export let dockedStore = new Store("docked", innerWidth > SIDEBAR_OPEN);

// listen for window size changes
window.addEventListener("resize", () => {
	dockedStore.set(innerWidth > SIDEBAR_OPEN);
});
