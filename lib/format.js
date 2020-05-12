'use strict';

module.exports.timestamp = function (timestamp) {
	const d = new Date(parseInt(timestamp, 10));

	let month = d.getMonth() + 1;
	month = month < 10 ? `0${month}` : month;

	let day = d.getDate();
	day = day < 10 ? `0${day}` : day;

	let hours = d.getHours();
	hours = hours < 10 ? `0${hours}` : hours;

	let minutes = d.getMinutes();
	minutes = minutes < 10 ? `0${minutes}` : minutes;

	let seconds = d.getSeconds();
	seconds = seconds < 10 ? `0${seconds}` : seconds;

	return `${d.getFullYear()}-${month}-${day} ${hours}:${minutes}:${seconds}.${d.getMilliseconds()}`;
};
