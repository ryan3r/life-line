var assert = require("assert");
var Syncer = require("../../../src/common/data-stores/syncer");
var MemAdaptor = require("../../../src/common/data-stores/mem-adaptor");

describe("Syncer", function() {
	it("can sync", function(done) {
		// create all the stores
		var local = new MemAdaptor();
		var remote = new MemAdaptor();
		var changeStore = new MemAdaptor();

		// store some values
		remote.set({ id: "change-me", value: "old", modified: 1 });
		local.set({ id: "change-me", value: "old", modified: 1 });
		local.set({ id: "remote", value: "old", modified: 1 });
		remote.set({ id: "delete-me", modified: 1 });
		local.set({ id: "remote-delete", modified: 1 });
		remote.set({ id: "remote-create", modified: 1 });

		// create the syncer
		var syncer = new Syncer({
			local,
			remote,
			changeStore
		});

		syncer.set({ id: "created", modified: 1 });

		// change some stuff
		syncer.set({ id: "change-me", value: "new", modified: 2 });
		remote.set({ id: "remote", value: "newer", modified: 2 });
		syncer.remove("delete-me");

		setTimeout(() => {
			// sync the stuff
			syncer.sync()

			.then(() => {
				assert.deepEqual(local._data, {
					"change-me": {
						id: "change-me",
						value: "new",
						modified: 2
					},
  					remote: {
						id: "remote",
						value: "newer",
						modified: 2
					},
  					created: {
						id: "created",
						modified: 1
					},
					"remote-create": {
						id: "remote-create",
						modified: 1
					}
				});

				assert.deepEqual(remote._data, local._data);
				assert.deepEqual(changeStore._data.changes.value, []);
			})

			// pass the result on to mocha
			.then(() => done(), err => done(err));
		});
	});
});
