/**
 * Name generator for backups
 */

exports.genBackupName = function(date = new Date()) {
	return `backup-${date.getFullYear()}-${date.getMonth()+1}-${date.getDate()}`
		+ `-${date.getHours()}-${date.getMinutes()}.zip`;
};
