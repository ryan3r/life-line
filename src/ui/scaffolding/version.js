import React from "react";
import Component from "../component";
import FlatButton from "material-ui/FlatButton";
import CircularProgress from "material-ui/CircularProgress";

export default class Version extends Component {
	constructor() {
		super();

		this.state.updating = false;
		// save the mounted/unmounted state
		this._mounted = true;

		if(navigator.serviceWorker) {
			// get the registration
			navigator.serviceWorker.getRegistration()

			.then(registration => {
				if(this._mounted && registration) {
					// the service worker is in control
					this.setState({ swEnabled: true });

					// save the registration
					this.registration = registration;

					// we are updating
					this.listen(registration, "updatefound", () => {
						if(registration.installing &&
							registration.installing.state == "installing") {
							// show that we are updating
							this.setState({ updating: true });

							// wait until the service worker has been installed
							registration.installing.onstatechange = e => {
								if(e.currentTarget.state == "activated") {
									this.setState({ updating: false });
								}
							};
						}
					});
				}
			});
		}
	}

	componentWillUnmount() {
		super.componentWillUnmount();

		this._mounted = false;
	}

	update = () => {
		// force an update
		if(this.registration) {
			this.registration.update()

			// catch any service worker errors
			.catch(() => {})

			.then(() => {
				this.setState({ checking: false });
			});

			this.setState({ checking: true });
		}
	}

	render() {
		// show the service worker status
		if(this.state.swEnabled) {
			// we are updating the service worker
			if(this.state.updating || this.state.checking) {
				return <div className="flex flex-center flex-vcenter">
					<CircularProgress size={17} thickness={2}/>
					<span style={{marginLeft: 10}}>
						{this.state.updating ? "Updating" : "Checking"}
					</span>
				</div>;
			}
			// show the version and an update button
			else {
				return <div className="flex flex-center flex-vcenter">
					<FlatButton onClick={this.update}>
						Life line v{VERSION}
					</FlatButton>
				</div>;
			}
		}

		// no service worker show the plain version
		return <div className="version">Life line v{VERSION}</div>;
	}
}
