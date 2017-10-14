import getMuiTheme from "material-ui/styles/getMuiTheme";
import {green400, green500, green700} from "material-ui/styles/colors";

const theme = getMuiTheme({
	palette: {
		primary1Color: green500,
		primary2Color: green700
	},
	appBar: {
		height: 64
	}
});

export default theme;
