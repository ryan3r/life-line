/**
 * Send push notifications
 */

var {apiKeys, assignments} = require("./data-stores");
var dsServer = require("./data-stores/server");
var webpush = require("web-push");

const MAX_TIMEOUT = 2147483647;

// ready is a promise for after start() has been called
var resolveReady;
var ready = new Promise(resolve => resolveReady = resolve);

var waiting;

exports.start = function() {
	// check if we have a gapi key
	var result = apiKeys.get("gapiKey").then(gapiKey => {
		// no gapi key
		if(!gapiKey) return;

		// set the gcm key
		webpush.setGCMAPIKey(gapiKey);

		// attempt to load the vapid keys
		Promise.all([
			apiKeys.get("publicKey"),
			apiKeys.get("privateKey")
		])

		.then(([publicKey, privateKey]) => {
			var ready = Promise.resolve();

			// no vapid keys generate them
			if(!publicKey) {
				let vapidKeys = webpush.generateVAPIDKeys();

				publicKey = vapidKeys.publicKey;
				privateKey = vapidKeys.privateKey;

				// save the keys
				ready = apiKeys.set({
					publicKey,
					privateKey
				})
			}

			// laod the email
			return apiKeys.get("email")

			.then(email => {
				// pass the keys to webpush
				webpush.setVapidDetails(
					"mailto:" + email,
					publicKey,
					privateKey
				);
			})

			// wait for the keys to be saved
			.then(() => ready);
		})

		// initilaize the reminder timer
		.then(() => init());
	});

	// attach this to the ready promise
	resolveReady(result);
};

// set the subscription
exports.setSubscription = function(subscription) {
	return apiKeys.set("subscription", subscription)

	// initialize the reminders
	.then(() => init());
};

var init = function() {
	ready.then(() => apiKeys.get("subscription"))

	.then(subscription => {
		// if we don't have the subscription stop
		if(!subscription) return;

		// send a notification
		var notify = function(payload) {
			webpush.sendNotification(subscription, JSON.stringify(payload));
		};

		// wait for the next reminder
		var awaitNext = function() {
			nextReminder()

			.then(reminder => {
				// timer canceled
				if(!reminder) return;

				// if we overflowed just restart the timer
				if(!reminder.overflowed) {
					notify(reminder.assignment);
				}

				// wait for the next reminder
				awaitNext();
			});
		};

		var debounceTimer;
		// refresh when changes are send
		dsServer.onchange = () => {
			clearTimeout(debounceTimer);
			debounceTimer = setTimeout(awaitNext, 1000);
		};

		// kick off the loop
		awaitNext();
	});
};

// get the next assginment or exam to remind the user about
var nextReminder = function() {
	// cancel any existing timers
	if(waiting) {
		waiting.cancel();
		waiting = undefined;
	}

	return assignments.query({
		// only take things with dates
		type: t => t == "exam" || t == "assignment",
		// don't send reminders for things we have completed
		done: false,
		// only take dates that are an hour from now
		date: d => {
			d = new Date(d);

			return d.getTime() >= Date.now() + (60 * 60 * 1000);
		}
	})

	// find the closes assignment
	.then(assignments => {
		return assignments.reduce((chosen, assignment) => {
			// we found a closer assignment
			if(!chosen || chosen.date.getTime() > assignment.date.getTime()) {
				return assignment;
			}

			return chosen;
		}, undefined);
	})

	.then(assignment => {
		// no upcomming assignment to remind
		if(!assignment) return;

		// calcuate the number of milliseconds to wait
		var wait = assignment.date.getTime() - Date.now() - (60 * 60 * 1000);

		// set timeout stops working after 2147483647 so we just wait that long and check again
		var overflowed = wait > MAX_TIMEOUT;

		if(overflowed) {
			wait = MAX_TIMEOUT;
		}

		waiting = timeout(wait);

		// resolve with next assignment
		return waiting.then(finished => finished && ({ overflowed, assignment}));
	});
};

// set timeout but with promises
var timeout = function(ms) {
	var timer, canceled = false, $resolve;

	var promise = new Promise(resolve => {
		// cancel was already called
		if(canceled) return resolve();

		$resolve = resolve;

		// set the timer
		timer = setTimeout(() => {
			$resolve = undefined;

			resolve(true);
		}, ms);
	});

	// cancel the timer
	promise.cancel = () => {
		canceled = true;

		clearTimeout(timer);

		if($resolve) $resolve();
	};

	return promise;
};
