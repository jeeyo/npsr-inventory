import { DateTime } from 'luxon';

// extract error message from /src/routes/__error.svelte
export const errorHtmlToPlaintext = (html: string) => {
	const match = html.match(/<h1>(.*?)<\/h1>/i);
	return (match === null) ? html : match[1].replace(/<!--[\s\S]*?-->/gm, '');
}

// relative time formatter
// https://github.com/moment/luxon/issues/274#issuecomment-649347238
const units: Intl.RelativeTimeFormatUnit[] = [
	'year',
	'month',
	'week',
	'day',
	'hour',
	'minute',
	'second',
];

export const timeAgo = (dateTime: DateTime) => {
	const diff = dateTime.diffNow().shiftTo(...units);
	const unit = units.find((unit) => diff.get(unit) !== 0) || 'second';

	const relativeFormatter = new Intl.RelativeTimeFormat('en', { numeric: 'auto' });
	return relativeFormatter.format(Math.trunc(diff.as(unit)), unit);
};
