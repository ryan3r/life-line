/**
 * A wrapper that syncronizes local changes with a remote host
 */

var KeyValueStore = require("./key-value-store");
var EventEmitter = require("../util/event-emitter");

class Syncer extends EventEmitter {
	constructor(opts) {
		super();

		this._local = opts.local;
		this._remote = opts.remote;
		this._changeStore = new KeyValueStore(opts.changeStore);
		this._changesName = opts.changesName || "changes";

		// save all the ids to optimize creates
		this._ids = this.getAll()
			.then(all => all.map(value => value.id));
	}

	// pass through get and getAll
	getAll() { return this._local.getAll(); }
	get(key) { return this._local.get(key); }

	// keep track of any created values
	set(value) {
		// check if this is a create
		this._ids = this._ids.then(ids => {
			// new value
			if(ids.indexOf(value.id) === -1) {
				ids.push(value.id);

				// save the change
				this._change("create", value.id);
			}

			return ids;
		});

		// store the value
		return this._ids.then(() => this._local.set(value));
	}

	// keep track of deleted values
	remove(key) {
		this._ids = this._ids.then(ids => {
			// remove this from the all ids list
			var index = ids.indexOf(key);

			if(index !== -1) {
				ids.splice(index, 1);
			}

			// save the change
			this._change("remove", key);
		});

		// remove the actual value
		return this._ids.then(() => this._local.remove(key));
	}

	// store a change in the change store
	_change(type, id) {
		// get the changes
		this._changeStore.get(this._changesName, [])

		.then(changes => {
			// add the change
			changes.push({ type, id, timestamp: Date.now() });

			// save the changes
			return this._changeStore.set(this._changesName, changes);
		});
	}

	// sync the two stores
	sync() {
		// only run one sync at a time
		if(this._syncing) return this._syncing;

		var retryCount = 3;
		var $sync = new Sync(this._local, this._remote, this._changeStore, this._changesName);

		// pass on the progress
		var sub = $sync.on("progress", value => this.emit("progress", value));

		var sync = () => {
			// tell the ui we are syncing
			this.emit("sync-start");

			// attempt to sync
			return $sync.sync()

			.then(() => {
				// the the ui the sync has succeeded
				this.emit("sync-complete", { failed: false });
			})

			.catch(err => {
				var retrying = retryCount-- > 0 && (typeof navigator != "object" || navigator.onLine);

				// tell the ui the sync failed
				this.emit("sync-complete", { retrying, failed: true });

				// retry if it fails
				if(retrying) {
					return new Promise(resolve => {
						// wait 1 second
						setTimeout(() => resolve(sync()), 1000);
					});
				}
			});
		};

		// start the sync
		this._syncing = sync()

		// release the lock
		.then(() => {
			this._syncing = undefined;
			sub.unsubscribe();
		});

		return this._syncing;
	}

	// get the remote access level
	accessLevel() {
		return this._remote.accessLevel()

		// if anything goes wrong assume full permissions
		.catch(() => "full");
	}
}

// a single sync
class Sync extends EventEmitter {
	constructor(local, remote, changeStore, changesName) {
		super();
		this._local = local;
		this._remote = remote;
		this._changeStore = changeStore;
		this._changesName = changesName;
		this._progress = 0;
	}

	stepProgress() {
		this._progress += 1 / 7;

		this.emit("progress", this._progress);
	}

	sync() {
		this.stepProgress();

		// get the ids and last modified dates for all remote values
		return this.getModifieds()

		.then(modifieds => {
			this.stepProgress();

			// remove the values we deleted from the remote host
			return this.remove(modifieds)

			// merge modified values
			.then(() => {
				this.stepProgress();

				return this.mergeModifieds(modifieds);
			});
		})

		.then(remoteDeletes => {
			this.stepProgress();

			// send values we created since the last sync
			return this.create(remoteDeletes)

			// remove any items that where deleted remotly
			.then(() => {
				this.stepProgress();

				return this.applyDeletes(remoteDeletes);
			});
		})

		// clear the changes
		.then(() => {
			this.stepProgress();

			return this._changeStore.set(this._changesName, []);
		})

		.then(() => {
			this.stepProgress();
		});
	}

	// get the last modified times for each value
	getModifieds() {
		this._items = {};

		return this._remote.getAll()

		.then(values => {
			var modifieds = {};

			for(let value of values) {
				// store the items
				this._items[value.id] = value;
				// get the modified times
				modifieds[value.id] = value.modified;
			}

			return modifieds;
		});
	}

	// remove values we have deleted since the last sync
	remove(modifieds) {
		return this._changeStore.get(this._changesName, [])

		.then(changes => {
			var promises = [];

			// remove the items we remove from modifieds
			for(let change of changes) {
				if(change.type == "remove" && change.timestamp >= modifieds[change.id]) {
					// don't try to create the item locally
					delete modifieds[change.id];

					// delete it remotely
					promises.push(this._remote.remove(change.id))
				}
			}

			return Promise.all(promises);
		});
	}

	// update the local/remote values that where changed
	mergeModifieds(modifieds) {
		var remoteDeletes = [];

		// go through all the modifieds
		return this._local.getAll()

		.then(values => {
			var promises = [];

			// check all the local values against the remote ones
			for(let value of values) {
				// deleted from the remote adaptor
				if(!modifieds[value.id]) {
					remoteDeletes.push(value.id);
				}
				// the remote version is newer
				else if(modifieds[value.id] > value.modified) {
					promises.push(
						// fetch the remote value
						this.get(value.id)

						.then(newValue => this._local.set(newValue))
					);
				}
				// the local version is newer
				else if(modifieds[value.id] < value.modified) {
					promises.push(this._remote.set(value));
				}

				// remove items we already have from the creates
				if(modifieds[value.id]) {
					delete modifieds[value.id];
				}
			}

			// get values from the remote we are missing
			for(let id of Object.getOwnPropertyNames(modifieds)) {
				promises.push(
					this.get(id)

					.then(newValue => this._local.set(newValue))
				);
			}

			return Promise.all(promises);
		})

		// return the deletes
		.then(() => remoteDeletes);
	}

	// get a remote value
	get(id) {
		return Promise.resolve(this._items[id]);
	}

	// send created values to the server
	create(remoteDeletes) {
		return this._changeStore.get(this._changesName)

		.then((changes = []) => {
			var promises = [];

			// remove the items we remove from modifieds
			for(let change of changes) {
				if(change.type == "create") {
					// if we marked this value as a delete undo that
					let index = remoteDeletes.indexOf(change.id);

					if(index !== -1) {
						remoteDeletes.splice(index, 1);
					}

					// save the value to the remote
					promises.push(
						this._local.get(change.id)

						.then(value => this._remote.set(value))
					);
				}
			}

			return Promise.all(promises);
		});
	}

	// delete values that where deleted from the remote host
	applyDeletes(remoteDeletes) {
		return Promise.all(remoteDeletes.map(id => this._local.remove(id)));
	}
}

module.exports = Syncer;
