import getMuiTheme from "material-ui/styles/getMuiTheme";
import {green500} from "material-ui/styles/colors";

const theme = getMuiTheme({
	palette: {
		primary1Color: green500
	},
	appBar: {
		height: 64
	}
});

export default theme;