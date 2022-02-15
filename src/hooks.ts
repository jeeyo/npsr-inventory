import cookie from 'cookie';
import type { Handle, GetSession } from '@sveltejs/kit';
import { deleteExpiredSessions, getUserFromSession } from '$lib/db';

export const handle: Handle = async ({ event, resolve }) => {

	// authenticate using cookie
	if (!event.locals.user) {

		const cookies = cookie.parse(event.request.headers.get('cookie') || '');

		// TO-DO: optimize this using crontab maybe?
		await deleteExpiredSessions();

		if (cookies.khem_session_id) {

			const user = await getUserFromSession(cookies.khem_session_id);
			if (user !== null) {
				event.locals.user = {
					id: user.id,
					username: user.username,
					fullname: user.fullname,
					email: user.email,
					role: user.role,
				};
			}
		}
	}

	const response = await resolve(event);
	return response;
};

export const getSession: GetSession = (event) => {
	return event.locals.user
		? { user: event.locals.user }
		: {};
}
