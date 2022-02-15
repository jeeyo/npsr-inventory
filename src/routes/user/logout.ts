import { deleteSessionById } from '$lib/db';
import type { RequestHandler } from '@sveltejs/kit';
import type { Locals } from '$lib/types';
import cookie from 'cookie';

// GET /user/logout
export const get: RequestHandler<Locals> = async (event) => {

	const cookies = cookie.parse(event.request.headers.get('cookie') || '');

	if (cookies.khem_session_id) {
		await deleteSessionById(cookies.khem_session_id);
		event.locals.user = undefined;
	}

	return {
		status: 302,
		headers: {
			'Set-Cookie': cookie.serialize('khem_session_id', '', {
				path: '/',
				httpOnly: true,
				sameSite: 'strict',
				// secure: process.env.NODE_ENV === 'production',
				maxAge: 0, // expire now
			}),
			'Location': '/',
		},
	};
};
