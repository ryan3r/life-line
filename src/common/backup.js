/**
 * Name generator for backups
 */

export function genBackupName() {
	var date = new Date();

	return `backup-${date.getFullYear()}-${date.getMonth()+1}-${date.getDate()}`
		+ `-${date.getHours()}-${date.getMinutes()}.zip`;
}
