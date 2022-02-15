import type { RequestHandler } from '@sveltejs/kit';
import type { Locals } from '$lib/types';
import { User, createOrEditUser, Lending, Equipment } from '$lib/db';

// GET /user
// get a list of max 50 users starting from `offset`
export const get: RequestHandler<Locals> = async (event) => {

	// unauthorized user
	if (!event.locals.user) {
		return {
			status: 401,
			body: 'Unauthorized',
		};
	}

	// sanitize `offset`
	let offset = +event.url.searchParams.get('offset');
	if (isNaN(offset)) {
		offset = 0;
	}

	// count how many pages there are
	const numberOfUsers = await User.count({
		where: {
			deletedAt: null,
		},
	});

	// get a list of users from `offset` excluding their passwords
	const users = await User.findAll({
		where: {
			deletedAt: null,
		},
		attributes: {
			exclude: ['password', 'deletedAt'],
		},
		include: [{
			model: Lending,
			where: {
				status: 0,
				deletedAt: null,
			},
			include: [{
				model: Equipment,
				where: {
					deletedAt: null,
				},
				required: false,
			}],
			required: false,
		}],
		offset: offset,
		limit: 50,
	});

	return {
		status: 200,
		body: {
			count: numberOfUsers,
			items: users,
		},
	};
};

// POST /user
// edit or create a new user
export const post: RequestHandler<Locals> = async (event) => {

	// unauthorized user
	if (!event.locals.user) {
		return {
			status: 401,
			body: 'Unauthorized',
		};
	}

	const data = await event.request.formData();

	const user_id = data.has('id') ? +data.get('id').toString() : undefined;
	const username = data.get('username').toString();
	const password = data.has('password') ? data.get('password').toString() : undefined;
	const fullname = data.get('fullname').toString();
	const email = data.get('email').toString();
	let role = data.has('role') ? +data.get('role').toString() : NaN;

	// allow a User to edit itself
	if (event.locals.user.role < 1 && (user_id === undefined || user_id !== event.locals.user.id)) {
		return {
			status: 401,
			body: 'Unauthorized',
		};
	}

	// sanitize `role`
	if (isNaN(role) && (role < 0 || role > 1)) {
		role = 0;
	}

	// a User cannot change its role
	if (event.locals.user.role < 1) {
		role = event.locals.user.role;
	}

	// not specifying `user_id` to create a new one
	try {
		await createOrEditUser({
			...(user_id ? { id: user_id } : {}),
			username: username,
			...(password ? { password: password } : {}),
			fullname: fullname,
			email: email,
			...(!isNaN(role) ? { role: role } : {}),
		});
	} catch(err) {

		return {
			status: 400,
			body: (err as Error).message,
		};
	}

	return { status: 200 };
};

// DELETE /user
// delete a user
export const del: RequestHandler<Locals> = async (event) => {

	if (!event.locals.user || event.locals.user.role < 1) {
		return {
			status: 401,
			body: 'Unauthorized',
		};
	}

	const data = await event.request.formData();

	const user_id = data.has('id') ? +data.get('id').toString() : undefined;

	if (user_id === undefined) {
		return {
			status: 400,
			body: 'Invalid User ID',
		};
	}

	if (user_id === event.locals.user.id) {
		return {
			status: 400,
			body: 'Unable to delete self',
		};
	}

	// check if the user has returned all of its equipment
	const user = await User.findOne({
		where: {
			id: user_id,
			deletedAt: null,
		},
		include: [{
			model: Lending,
			where: {
				status: 0,
				deletedAt: null,
			},
			include: [{
				model: Equipment,
				where: {
					deletedAt: null,
				},
				required: false,
			}],
			required: false,
		}],
	});

	if (user === null) {
		return {
			status: 404,
			body: 'The user could not be found',
		};
	}

	if (user.lendings.length > 0) {
		return {
			status: 400,
			body: 'The user has not returned all of its equipment',
		};
	}

	const affected_row = await User.destroy({
		where: {
			id: user_id,
		},
	});

	// the user was not destroyed
	if (!affected_row) {
		return {
			status: 404,
			body: 'The user was not destroyed',
		};
	}

	return { status: 200 };
};
