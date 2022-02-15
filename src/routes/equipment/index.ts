import type { RequestHandler } from '@sveltejs/kit';
import type { Locals } from '$lib/types';
import { Equipment, EquipmentCategory, EquipmentPhoto, createOrEditEquipment, Lending, User } from '$lib/db';
import Sequelize from 'sequelize';

// GET /equipment
// get a list of max 50 equipment starting from `offset`
export const get: RequestHandler<Locals> = async (event) => {

	// unauthorized user
	if (!event.locals.user) {
		return {
			status: 401,
			body: 'Unauthorized',
		};
	}

	const query = event.url.searchParams.has('query') ? event.url.searchParams.get('query') : '';

	// search conditions for equipment
	const equipmentQueries = query.replace(/(\w*):(\w*)/g, '').split(' ').filter(q => q !== '');
	const equipmentSearchableColumns = ['name', 'barcode'];
	const equipmentSearchConditions = (equipmentQueries.length > 0)
		? {
			[Sequelize.Op.or]: equipmentQueries.map(q => {
				return equipmentSearchableColumns.reduce((accumulator, column) => {
					accumulator[column] = {
						[Sequelize.Op.like]: `%${q}%`,
					};
					return accumulator;
				}, {})
			})
		}
		: {};

	// search conditions for equipment category
	const matches = query.match(/(?:category):(\w*)/i);
	const categoryQuery = matches !== null ? matches[1] : '';
	const categorySearchableColumns = ['name'];
	const categorySearchConditions = (categoryQuery !== '')
		? {
			[Sequelize.Op.or] : categorySearchableColumns.reduce((accumulator, column) => {
				accumulator[column] = {
					[Sequelize.Op.like]: `%${categoryQuery}%`,
				};
				return accumulator;
			}, {}),
		}
		: {};

	// sanitize `offset`
	let offset = event.url.searchParams.has('offset') ? +event.url.searchParams.get('offset') : NaN;
	if (isNaN(offset)) {
		offset = 0;
	}

	// count how many pages there are
	const numberOfEquipments = await Equipment.count({
		where: {
			...equipmentSearchConditions,
			deletedAt: null,
		},
		include: [
			{
				model: EquipmentCategory,
				where: {
					...categorySearchConditions,
				},
				as: 'category',
				paranoid: false,
			},
		],
	});

	// get a list of equipment from `offset`
	const equipments = await Equipment.findAll({
		where: {
			...equipmentSearchConditions,
			deletedAt: null,
		},
		attributes: {
			exclude: ['deletedAt'],
		},
		include: [
			{
				model: Lending,
				// where: {
				// 	status: 0,
				// },
				include: [{
					model: User,
					attributes: {
						exclude: ['password', 'deletedAt'],
					},
					paranoid: false,
				}],
				order: [['id', 'DESC']],
				limit: 10,
				required: false,
			},
			{
				model: EquipmentCategory,
				where: {
					...categorySearchConditions,
				},
				as: 'category',
				paranoid: false,
			},
			{
				model: EquipmentPhoto,
				as: 'photos',
				attributes: {
					exclude: ['equipment_id'],
				},
			},
		],
		order: [['id', 'ASC']],
		offset: offset,
		limit: 50,
	});

	return {
		status: 200,
		body: {
			count: numberOfEquipments,
			items: equipments,
		},
	};
};

// POST /equipment
// edit or create a new equipment
export const post: RequestHandler<Locals> = async (event) => {

	// unauthorized user
	if (!event.locals.user || event.locals.user.role < 1) {
		return {
			status: 401,
			body: 'Unauthorized',
		};
	}

	const data = await event.request.formData();

	const equipment_id = data.has('id') ? +data.get('id').toString() : undefined;
	const name = data.has('name') ? data.get('name').toString() : '';
	const barcode = data.has('barcode') ? data.get('barcode').toString() : null;
	const category_id = data.has('category_id') ? +data.get('category_id').toString() : NaN;
	let status = data.has('status') ? +data.get('status').toString() : NaN;

	// sanitize `status`
	if (isNaN(status) && (status < 0 || status > 1)) {
		status = 0;
	}

	// not specifying `equipment_id` to create a new one
	const equipment = await createOrEditEquipment({
		...(equipment_id ? { id: equipment_id } : {}),
		name: name,
		barcode: barcode,
		...(!isNaN(category_id) ? { category_id: category_id } : {}),
		...(!isNaN(status) ? { status: status } : {}),
	});

	// the equipment was not updated or created
	if (equipment === null) {
		return {
			status: 400,
			body: 'The equipment was not updated or created',
		};
	}

	return { status: 200 };
};

// DELETE /equipment
// delete an equipment
export const del: RequestHandler<Locals> = async (event) => {

	if (!event.locals.user || event.locals.user.role < 1) {
		return {
			status: 401,
			body: 'Unauthorized',
		};
	}

	const data = await event.request.formData();

	const equipment_id = data.has('id') ? +data.get('id').toString() : undefined;

	if (equipment_id === undefined) {
		return {
			status: 400,
			body: 'Invalid Equipment ID',
		};
	}

	const affected_row = await Equipment.destroy({
		where: {
			id: equipment_id,
		},
	});

	// the equipment was not destroyed
	if (!affected_row) {
		return {
			status: 404,
			body: 'The equipment was not destroyed',
		};
	}

	return { status: 200 };
};
