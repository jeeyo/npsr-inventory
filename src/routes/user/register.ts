// import { createOrEditUser, createSessionForUser } from '$lib/db';
// import type { RequestHandler } from '@sveltejs/kit';
// import type { Locals } from '$lib/types';
// import cookie from 'cookie';

// // POST /user/register
// export const post: RequestHandler<Locals> = async (event) => {

// 	const data = await event.request.formData();

// 	const username = data.get('username').toString();
// 	const password = data.get('password').toString();
// 	const fullname = data.get('fullname').toString();
// 	const email = data.get('email').toString();

// 	// not specifying user id to create a new one
// 	try {
// 		const user = await createOrEditUser({
// 			username: username,
// 			password: password,
// 			fullname: fullname,
// 			email: email,
// 		});
// 		if (user === null) {
// 			return { status: 400 };
// 		}

// 		const session = await createSessionForUser(user.id, event.request.headers.get('User-Agent'));

// 		event.locals.user = {
// 			id: user.id,
// 			username: user.username,
// 			fullname: user.fullname,
// 			email: user.email,
// 			role: user.role,
// 			// avatar: user.avatar,
// 		};

// 		return {
// 			status: 200,
// 			headers: {
// 				'Set-Cookie': cookie.serialize('khem_session_id', session.id, {
// 					path: '/',
// 					httpOnly: true,
// 					sameSite: 'strict',
// 					// secure: process.env.NODE_ENV === 'production',
// 					maxAge: 60 * 60 * 24 * 7, // one week
// 				}),
// 			},
// 		};

// 	} catch(err) {

// 		return {
// 			status: 400,
// 			body: (err as Error).message,
// 		};
// 	}
// };
