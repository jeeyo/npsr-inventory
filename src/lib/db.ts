import Sequelize from 'sequelize';
import mysql2 from 'mysql2';
import bcrypt from 'bcryptjs';
import { v4 as uuid } from '@lukeed/uuid';
import { DateTime } from 'luxon';

const PRODUCTION_ENV = (process.env['NODE_ENV'] === 'production') ? true : false;

// database configuration
const sequelize = new Sequelize.Sequelize({
	database: 'npsrinventorymgmt',
	username: 'npsrinventorymgmt',
	password: PRODUCTION_ENV ? process.env['NPSR_DB_PASS'] : 'somerandompassword',
	host: PRODUCTION_ENV ? process.env['NPSR_DB_HOST'] : 'localhost',
	port: 3306,
	dialect: 'mysql',
	dialectModule: mysql2,
	dialectOptions: {
		dateStrings: true,
		typeCast: true,
	},
	timezone: '+07:00',
	logging: false,
});

// database connection
sequelize
	.authenticate()
	.catch(err => {
		console.error(`Unable to connect to the database: ${err}`);
	});

// database model definitions
export class User extends Sequelize.Model {
	id?: number;
	username?: string;
	password?: string;
	fullname?: string;
	email?: string;
	role?: number;
	deletedAt?: Date | null;

	sessions?: Session[];
	lendings?: Lending[];
};
User.init({
	id: { type: Sequelize.DataTypes.INTEGER, primaryKey: true, allowNull: false, autoIncrement: true },
	username: { type: Sequelize.DataTypes.STRING, allowNull: false },
	password: { type: Sequelize.DataTypes.STRING, allowNull: false },
	fullname: { type: Sequelize.DataTypes.STRING, allowNull: false },
	email: { type: Sequelize.DataTypes.STRING, allowNull: false },
	role: { type: Sequelize.DataTypes.INTEGER, allowNull: false },
	deletedAt: { type: Sequelize.DataTypes.DATE, allowNull: true },
},
{
	timestamps: true,
	createdAt: false,
	updatedAt: false,
	paranoid: true,
	freezeTableName: true,
	tableName: 'users',
	modelName: 'user',
	sequelize,
});

export class Equipment extends Sequelize.Model {
	id?: number;
	name?: string;
	barcode?: string;
	category_id?: number;
	status?: number;
	deletedAt?: Date | null;

	category?: EquipmentCategory;
	photos?: EquipmentPhoto[];
	lendings?: Lending[];
};
Equipment.init({
	id: { type: Sequelize.DataTypes.INTEGER, primaryKey: true, allowNull: false, autoIncrement: true },
	name: { type: Sequelize.DataTypes.STRING, allowNull: false },
	barcode: { type: Sequelize.DataTypes.STRING, allowNull: false },
	category_id: { type: Sequelize.DataTypes.INTEGER, allowNull: false },
	status: { type: Sequelize.DataTypes.INTEGER, allowNull: false },
	deletedAt: { type: Sequelize.DataTypes.DATE, allowNull: true },
},
{
	timestamps: true,
	createdAt: false,
	updatedAt: false,
	paranoid: true,
	freezeTableName: true,
	tableName: 'equipments',
	modelName: 'equipment',
	sequelize,
});

export class EquipmentCategory extends Sequelize.Model {
	id?: string;
	name?: string;
};
EquipmentCategory.init({
	id: { type: Sequelize.DataTypes.INTEGER, primaryKey: true, allowNull: false, autoIncrement: true },
	name: { type: Sequelize.DataTypes.STRING, allowNull: false },
},
{
	timestamps: true,
	createdAt: false,
	updatedAt: false,
	paranoid: true,
	freezeTableName: true,
	tableName: 'equipment_categories',
	modelName: 'equipment_category',
	sequelize,
});

export class EquipmentPhoto extends Sequelize.Model {
	id?: string;
	equipment_id?: number;
	filename?: string;
};
EquipmentPhoto.init({
	id: { type: Sequelize.DataTypes.INTEGER, primaryKey: true, allowNull: false, autoIncrement: true },
	equipment_id: { type: Sequelize.DataTypes.INTEGER, allowNull: false },
	filename: { type: Sequelize.DataTypes.STRING, allowNull: false },
},
{
	timestamps: false,
	paranoid: false,
	freezeTableName: true,
	tableName: 'equipment_photos',
	modelName: 'equipment_photo',
	sequelize,
});

export class Lending extends Sequelize.Model {
	id?: number;
	user_id?: number;
	equipment_id?: number;
	lending_date?: Date;
	return_date?: Date | null;
	status?: number;
	remarks?: string;
	deletedAt?: Date | null;

	user?: User;
	equipment?: Equipment;
};
Lending.init({
	id: { type: Sequelize.DataTypes.INTEGER, primaryKey: true, allowNull: false, autoIncrement: true },
	user_id: { type: Sequelize.DataTypes.INTEGER, allowNull: false },
	equipment_id: { type: Sequelize.DataTypes.INTEGER, allowNull: false },
	lending_date: { type: Sequelize.DataTypes.DATE, allowNull: false },
	return_date: { type: Sequelize.DataTypes.DATE, allowNull: true },
	status: { type: Sequelize.DataTypes.INTEGER, allowNull: false },
	remarks: { type: Sequelize.DataTypes.STRING, allowNull: false },
	deletedAt: { type: Sequelize.DataTypes.DATE, allowNull: true },
},
{
	timestamps: true,
	createdAt: false,
	updatedAt: false,
	paranoid: true,
	freezeTableName: true,
	tableName: 'lendings',
	modelName: 'lending',
	sequelize,
});

export class Session extends Sequelize.Model {
	id?: string;
	user_id?: number;
	expiry_date?: Date | null;
	useragent?: string;

	user?: User;
};
Session.init({
	id: { type: Sequelize.DataTypes.STRING, primaryKey: true, allowNull: false },
	user_id: { type: Sequelize.DataTypes.INTEGER, allowNull: false },
	expiry_date: { type: Sequelize.DataTypes.DATE, allowNull: true },
	useragent: { type: Sequelize.DataTypes.STRING, allowNull: false },
},
{
	timestamps: false,
	paranoid: false,
	freezeTableName: true,
	tableName: 'sessions',
	modelName: 'session',
	sequelize,
});

// database reference definitions
Session.belongsTo(User, { foreignKey: 'user_id' });
User.hasMany(Session, { foreignKey: 'user_id' });

Lending.belongsTo(User, { foreignKey: 'user_id' });
User.hasMany(Lending, { foreignKey: 'user_id' });

Lending.belongsTo(Equipment, { foreignKey: 'equipment_id' });
Equipment.hasMany(Lending, { foreignKey: 'equipment_id' });

Equipment.belongsTo(EquipmentCategory, { foreignKey: 'category_id', as: 'category' });
EquipmentCategory.hasMany(Equipment, { foreignKey: 'category_id' });

EquipmentPhoto.belongsTo(Equipment, { foreignKey: 'equipment_id' });
Equipment.hasMany(EquipmentPhoto, { foreignKey: 'equipment_id', as: 'photos' });

// utilities function for authentication
export const deleteExpiredSessions = async () => {

	await Session.destroy({
		where: {
			expiry_date: {
				[Sequelize.Op.lt]: DateTime.now().toJSDate(),
			},
		},
	});
};

export const getUserFromSession = async (session_id: string) => {

	// find session from `session_id`
	const session = await Session.findOne({
		where: {
			id: session_id,
		},
		include: [
			{ model: User },
		],
	});

	// return if the session could not be found
	if (session === null) {
		return null;
	}

	// update expiry date
	await Session.update({
		expiry_date: DateTime.now().plus({ days: 7 }).toJSDate(),
	},
	{
		where: {
			id: session_id,
		},
	});

	return session.user;
};

export const createOrEditUser = async (user: {
	id?: number;
	username: string;
	password?: string;
	fullname: string;
	email: string;
	role?: number;
}) => {

	// validate `password`
	if (user.password !== undefined && user.password.length < 8) {
		throw new Error('The password length is less than 8 characters');
	}

	// validate the `email` format
	const is_email_valid = String(user.email)
		.toLowerCase()
		.match(
			/^(([^<>()[\]\\.,;:\s@"]+(\.[^<>()[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/
		);

	// return if the `email` is not valid
	if (!is_email_valid) {
		throw new Error('Invalid password');
	}

	// if `id` is not defined, then create a new user
	if (user.id === undefined) {

		if (user.password === undefined) {
			throw new Error('Please specify a password');
		}

		// find an existing user with the specified `username` or `email`
		const existing_user = await User.findOne({
			where: {
				[Sequelize.Op.or]: {
					username: user.username,
					email: user.email,
				},
			},
		});
		if (existing_user !== null) {
			throw new Error('Username or Email has been taken');
		}

		return await User.create(
			{
				username: user.username,
				password: await bcrypt.hash(user.password, 10),
				fullname: user.fullname,
				email: user.email,
				...(user.role !== undefined ? { role: user.role } : {}),
			},
			{
				validate: false,
			},
		);
	}

	// otherwise, edit the existing user with id `id`

	// but first, check if changing `role` of the user from Administrator to User
	// and prevent it if there are not enough administrators
	if (user.role < 1) {

		// find an existing user with the specified `id`
		const existing_user = await User.findOne({
			where: {
				id: user.id,
			},
		});
		if (existing_user === null) {
			throw new Error(`The user with ID ${user.id} could not be found`);
		}

		// find the number of current administrators
		const nbrOfAdmins = await User.count({
			where: {
				role: {
					[Sequelize.Op.gte]: 1,	// >= 1
				},
			},
		});

		// if the role-changing user was an Administrator and wanting to become a User
		// but there would be not enough Administrators after that
		// throw an error
		if (existing_user.role > 0 && user.role < 1 && nbrOfAdmins <= 1) {
			throw new Error('There are not enough Administrators');
		}
	}

	const affected = await User.update(
		{
			username: user.username,

			// hash password if specified
			...(user.password !== undefined ? { password: await bcrypt.hash(user.password, 10) } : {}),

			fullname: user.fullname,
			email: user.email,
			...(user.role !== undefined ? { role: user.role } : {}),
		},
		{
			where: {
				id: user.id,
			},
		},
	);

	// the user was not updated
	if (affected[0] <= 0) {
		throw new Error('The user was not updated');
	}

	return user;
};

export const createSessionForUser = async (user_id: number, useragent: string) => {

	// find a user with id `user_id`
	const user = await User.findOne({
		where: {
			id: user_id,
			deletedAt: null,
		},
	});

	// return if the user could not be found
	if (user === null) {
		throw new Error('The user could not be found');
	}

	// create a new session for the user
	const session = await Session.create({
		id: uuid(),
		user_id: user_id,
		expiry_date: DateTime.now().plus({ days: 7 }).toJSDate(),
		useragent: useragent,
	});

	return session;
};

export const deleteSessionById = async (session_id: string) => {

	// delete the session with `session_id`
	await Session.destroy({
		where: {
			id: session_id,
		},
	});
};

export const authenticateUser = async (username: string, password: string) => {

	// find a user with username `username`
	const user = await User.findOne({
		where: {
			username: username,
			deletedAt: null,
		},
	});

	// return if the user could not be found
	if (user === null) {
		return null;
	}

	// compare `password` to the stored hashed password
	const match: boolean = await bcrypt.compare(password, user.password);
	if (!match) {
		return null;
	}

	return user;
};

export const createOrEditEquipment = async (equipment: {
	id?: number;
	name: string;
	barcode?: string;
	category_id?: number;
	status?: number;
}) => {

	// if `id` is not defined, then create a new equipment
	if (equipment.id === undefined) {

		return await Equipment.create(
			{
				name: equipment.name,
				...(equipment.barcode !== undefined ? { barcode: equipment.barcode } : {}),
				...(equipment.category_id !== undefined ? { category_id: equipment.category_id } : {}),
				...(equipment.status !== undefined ? { status: equipment.status } : {}),
			},
			{
				validate: false,
			},
		);
	}

	// otherwise, edit the existing equipment with id `id`
	const affected = await Equipment.update(
		{
			name: equipment.name,
			...(equipment.barcode !== undefined ? { barcode: equipment.barcode } : {}),
			...(equipment.category_id !== undefined ? { category_id: equipment.category_id } : {}),
			...(equipment.status !== undefined ? { status: equipment.status } : {}),
		},
		{
			where: {
				id: equipment.id,
			},
		},
	);

	// the equipment was not updated
	if (affected[0] <= 0) {
		return null;
	}

	return equipment;
};

export const createOrEditEquipmentCategory = async (equipment_category: {
	id?: number;
	name: string;
}) => {

	// if `id` is not defined, then create a new equipment category
	if (equipment_category.id === undefined) {

		return await EquipmentCategory.create(
			{
				name: equipment_category.name,
			},
			{
				validate: false,
			},
		);
	}

	// otherwise, edit the existing equipment category with id `id`
	const affected = await EquipmentCategory.update(
		{
			name: equipment_category.name,
		},
		{
			where: {
				id: equipment_category.id,
			},
		},
	);

	// the equipment was not updated
	if (affected[0] <= 0) {
		return null;
	}

	return equipment_category;
};
