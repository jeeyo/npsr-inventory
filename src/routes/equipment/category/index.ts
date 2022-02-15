import type { RequestHandler } from '@sveltejs/kit';
import type { Locals } from '$lib/types';
import { Equipment, EquipmentCategory, createOrEditEquipmentCategory } from '$lib/db';
import Sequelize from 'sequelize';

// GET /equipment/category
// get a list of max 50 equipment categories starting from `offset`
export const get: RequestHandler<Locals> = async (event) => {

	// unauthorized user
	if (!event.locals.user) {
		return {
			status: 401,
			body: 'Unauthorized',
		};
	}

	// sanitize `offset`
	let offset = event.url.searchParams.has('offset') ? +event.url.searchParams.get('offset') : NaN;
	if (isNaN(offset)) {
		offset = 0;
	}

	// count how many pages there are
	const numberOfEquipmentCategories = await EquipmentCategory.count({
		where: {
			deletedAt: null,
		}
	});

	// get a list of equipment categories from `offset`
	const equipment_categories = await EquipmentCategory.findAll({
		where: {
			deletedAt: null,
		},
		attributes: {
			include: [
				[Sequelize.literal(`(SELECT COUNT(*) FROM \`equipments\` WHERE \`equipments\`.\`category_id\` = \`equipment_category\`.\`id\`)`), 'nbr_of_eqpts'],
			],
			exclude: ['deletedAt'],
		},
		order: [['id', 'ASC']],
		offset: offset,
		limit: 50,
	});

	return {
		status: 200,
		body: {
			count: numberOfEquipmentCategories,
			items: equipment_categories,
		},
	};
};

// POST /equipment/category
// edit or create a new equipment category
export const post: RequestHandler<Locals> = async (event) => {

	// unauthorized user
	if (!event.locals.user || event.locals.user.role < 1) {
		return {
			status: 401,
			body: 'Unauthorized',
		};
	}

	const data = await event.request.formData();

	const equipment_category_id = data.has('id') ? +data.get('id').toString() : undefined;
	const name = data.has('name') ? data.get('name').toString() : '';

	if (name === '') {
		return {
			status: 400,
			body: 'Invalid Equipment Category Name',
		};
	}

	// not specifying `equipment_category_id` to create a new one
	try {
		await createOrEditEquipmentCategory({
			...(equipment_category_id ? { id: equipment_category_id } : {}),
			name: name,
		});
	} catch(err) {

		return {
			status: 400,
			body: (err as Error).message,
		};
	}

	return { status: 200 };
};

// DELETE /equipment/category
// delete an equipment category
export const del: RequestHandler<Locals> = async (event) => {

	if (!event.locals.user || event.locals.user.role < 1) {
		return {
			status: 401,
			body: 'Unauthorized',
		};
	}

	const data = await event.request.formData();

	const equipment_category_id = data.has('id') ? +data.get('id').toString() : undefined;

	if (equipment_category_id === undefined) {
		return {
			status: 400,
			body: 'Invalid Equipment Category ID',
		};
	}

	const affected_row = await EquipmentCategory.destroy({
		where: {
			id: equipment_category_id,
		},
	});

	// the equipment was not destroyed
	if (!affected_row) {
		return {
			status: 404,
			body: 'The equipment category was not destroyed',
		};
	}

	return { status: 200 };
};
