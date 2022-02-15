import type { RequestHandler } from '@sveltejs/kit';
import type { Locals } from '$lib/types';
import { Equipment, Lending, User } from '$lib/db';

// GET /lending
// get a list of max 50 lendings starting from `offset`
export const get: RequestHandler<Locals> = async (event) => {

	// sanitize `offset`
	let offset = event.url.searchParams.has('offset') ? +event.url.searchParams.get('offset') : NaN;
	if (isNaN(offset)) {
		offset = 0;
	}

	// count how many pages there are
	const numberOfLendings = await Lending.count({
		where: {
			deletedAt: null,
		},
	});

	// get a list of lendings from `offset`
	const lendings = await Lending.findAll({
		where: {
			deletedAt: null,
		},
		attributes: {
			exclude: ['deletedAt'],
		},
		include: [
			{
				model: User,
				attributes: {
					exclude: ['password', 'deletedAt'],
				},
				paranoid: false,
			},
			{
				model: Equipment,
				attributes: {
					exclude: ['deletedAt'],
				},
				paranoid: false,
			},
		],
		order: [['id', 'DESC']],
		offset: offset,
		limit: 50,
	});

	return {
		status: 200,
		body: {
			count: numberOfLendings,
			items: lendings,
		},
	};
};

// PUT /lending
// borrow or return a lending
export const put: RequestHandler<Locals> = async (event) => {

	if (!event.locals.user) {
		return {
			status: 401,
			body: 'Unauthorized',
		};
	}

	const data = await event.request.formData();
	const force = data.has('force') ? !!(+data.get('force').toString()) : false;

	const barcode = data.has('barcode') ? data.get('barcode').toString() : '';
	if (barcode === '') {
		return {
			status: 400,
			body: 'Barcode is not defined',
		};
	}

	// find the equipment with barcode `barcode`
	const equipment = await Equipment.findOne({
		where: {
			barcode: barcode,
		},
		include: [
			{
				model: Lending,
				include: [{
					model: User,
					attributes: {
						exclude: ['password', 'deletedAt'],
					},
					paranoid: false,
				}],
				order: [['id', 'DESC']],
				limit: 1,
				required: false,
			},
		],
	});

	// unable to find the equipment
	if (equipment === null) {
		return {
			status: 404,
			body: 'The equipment could not be found',
		};
	}

	// borrowed
	if (equipment.lendings.length > 0 && equipment.lendings[0].status === 0) {

		// borrowed by current user
		if (equipment.lendings[0].user_id === event.locals.user.id) {

			// return the equipment
			const affected = await Lending.update({
				status: 1,
				return_date: new Date(),
			},
			{
				where: {
					id: equipment.lendings[0].id,
				},
				limit: 1,
			});

			// the lending was not updated
			if (affected[0] <= 0) {
				return {
					status: 404,
					body: 'The lending was not updated',
				};
			}

			return {
				status: 200,
				body: `${event.locals.user.fullname} has successfully returned ${equipment.name} (${equipment.barcode})`,
			};

		// borrowed by another user
		} else {

			// forcefully transfer to current user
			if (force) {
				const affected = await Lending.update({
					user_id: event.locals.user.id,
				},
				{
					where: {
						id: equipment.lendings[0].id,
					},
					limit: 1,
				});
	
				// the lending was not updated
				if (affected[0] <= 0) {
					return {
						status: 404,
						body: 'The lending was not updated',
					};
				}

				return {
					status: 200,
					body: `${equipment.name} (${equipment.barcode}) has successfully transferred to ${event.locals.user.fullname}`,
				};
			}

			return {
				status: 409,
				body: `The equipment is currently borrowed by ${equipment.lendings[0].user.fullname}`,
			};
		}

	// available to lend
	} else if (equipment.lendings.length === 0 || equipment.lendings[0].status === 1) {

		// create a new lending
		const lending = await Lending.create({
			user_id: event.locals.user.id,
			equipment_id: equipment.id,
			lending_date: new Date(),
			status: 0,
			remarks: '',
		});

		// a new lending was not created
		if (lending === null) {
			return {
				status: 400,
				body: 'A new lending was not created',
			};
		}

		return {
			status: 200,
			body: `${event.locals.user.fullname} has successfully borrowed ${equipment.name} (${equipment.barcode})`,
		};
	}

	return {
		status: 500,
		body: 'Unexpected Error',
	};
};

// POST /lending
// edit a lending remarks
export const post: RequestHandler<Locals> = async (event) => {

	if (!event.locals.user) {
		return {
			status: 401,
			body: 'Unauthorized',
		};
	}

	const data = await event.request.formData();
	const id = data.has('id') ? +data.get('id').toString() : NaN;
	const remarks = data.has('remarks') ? data.get('remarks').toString() : '';

	// verify `id`
	if (isNaN(id)) {
		return {
			status: 400,
			body: 'Invalid Lending ID',
		};
	};

	// an Administrator can change anyone's remarks
	const condition_for_admin = event.locals.user.role > 0 ? {} : { user_id: event.locals.user.id };

	// update the remark
	const affected = await Lending.update({
		remarks: remarks,
	},
	{
		where: {
			id: id,
			...condition_for_admin,
		},
	});

	// the lending was not updated
	if (affected[0] <= 0) {
		return {
			status: 404,
			body: 'The lending could not be found',
		};
	}

	return {
		status: 200,
		body: `The lending remarks was updated`,
	};
};
