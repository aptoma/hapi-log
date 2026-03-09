export function timestamp(ts: number | string): string {
	const d = new Date(typeof ts === 'string' ? parseInt(ts, 10) : ts);

	let month: string | number = d.getMonth() + 1;
	month = month < 10 ? `0${month}` : month;

	let day: string | number = d.getDate();
	day = day < 10 ? `0${day}` : day;

	let hours: string | number = d.getHours();
	hours = hours < 10 ? `0${hours}` : hours;

	let minutes: string | number = d.getMinutes();
	minutes = minutes < 10 ? `0${minutes}` : minutes;

	let seconds: string | number = d.getSeconds();
	seconds = seconds < 10 ? `0${seconds}` : seconds;

	return `${d.getFullYear()}-${month}-${day} ${hours}:${minutes}:${seconds}.${d.getMilliseconds()}`;
}
