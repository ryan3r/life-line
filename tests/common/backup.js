var assert = require("assert");
var backup = require("../../src/common/backup");

describe("Backup", function() {
	it("can generate backup names from the date", function() {
		assert.equal(
			backup.genBackupName(new Date("2017-01-01T11:00:00.000Z")),
			"backup-2017-1-1-5-0.zip"
		);
	});
});
