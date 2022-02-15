import type { RequestHandler } from '@sveltejs/kit';
import type { Locals } from '$lib/types';
import { Equipment, EquipmentPhoto } from '$lib/db';
import { v4 as uuid } from '@lukeed/uuid';
import busboy from 'busboy';
import typer from 'media-typer';
import sharp from 'sharp';
import fs from 'fs';
import path from 'path';

export const UPLOAD_SINK = `${process.cwd()}/cdn`;

// GET /equipment/photo
// get all photos of the specified equipment with id `equipment_id`
export const get: RequestHandler<Locals> = async (event) => {

	// unauthorized user
	if (!event.locals.user) {
		return {
			status: 401,
			body: 'Unauthorized',
		};
	}

	// sanitize `equipment_id`
	const equipment_id = event.url.searchParams.has('equipment_id') ? +event.url.searchParams.get('equipment_id') : NaN;
	if (isNaN(equipment_id)) {
		return {
			status: 400,
			body: 'Invalid Equipment ID',
		};
	}

	// get all photos of the equipment with id `equipment_id`
	const photos = await EquipmentPhoto.findAll({
		where: {
			equipment_id: equipment_id,
		},
		order: [['id', 'ASC']],
	});

	return {
		status: 200,
		body: {
			count: photos.length,
			items: photos,
		},
	};
};

// PUT /equipment/photo
// upload a new equipment photo
export const put: RequestHandler<Locals> = async (event) => {

	// unauthorized user
	if (!event.locals.user || event.locals.user.role < 1) {
		return {
			status: 401,
			body: 'Unauthorized',
		};
	}

	const buf = await event.request.arrayBuffer();
	const u8buf = new Uint8Array(buf);

	return await new Promise((resolve) => {

		// parse multipart content
		const bb = busboy({
			headers: {
				'content-type': event.request.headers.get('content-type'),
			},
			limits: {
				files: 1,	// 1 file per request
				fileSize: 10 * 1024 * 1024,	// 10MB
			},
		});

		// on a file uploaded
		bb.on('file', async (name, file, info) => {

			// check if the equipment exists
			const equipment = await Equipment.findOne({
				where: {
					id: +name,
				},
			});

			// unable to find the equipment
			if (equipment === null) {
				return resolve({
					status: 404,
					body: 'The equipment could not be found',
				});
			}

			try {

				// parse MIME type
				const mime = typer.parse(info.mimeType);

				// only allows image files
				if (mime.type !== 'image') {
					return resolve({
						status: 400,
						body: 'Invalid file type',
					});
				}

				// compress and resize
				const webPEncoder = sharp()
						.resize(1024)
						.webp();
				const webPThumbnailEncoder = sharp()
						.resize(300, 300)
						.webp();

				// then write to file
				const filename = uuid();
				file
					.pipe(webPEncoder)
					.pipe(fs.createWriteStream(path.join(UPLOAD_SINK, `${filename}.webp`)));
				file
					.pipe(webPThumbnailEncoder)
					.pipe(fs.createWriteStream(path.join(UPLOAD_SINK, `${filename}_thumbnail.webp`)));

				// save filename to database
				const photo = await EquipmentPhoto.create({
					equipment_id: equipment.id,
					filename: filename,
				});

				// unable to save the filename
				if (photo === null) {
					return resolve({
						status: 500,
						body: 'Unable to save to database',
					});
				}

				resolve({
					status: 200,
					headers: {
						'Connection': 'close',
					},
				});

			// catch an error on uploading
			} catch(err) {
				resolve({
					status: 400,
					body: (err as Error).message,
				});
			}
		});

		// // on connection closed
		// bb.on('close', () => {
		// 	resolve({
		// 		status: 200,
		// 		headers: {
		// 			'Connection': 'close',
		// 		},
		// 	});
		// });

		// on error occurred
		bb.on('error', (err) => {
			resolve({
				status: 500,
				body: (err as Error).message,
				headers: {
					'Connection': 'close',
				},
			});
		});

		bb.write(u8buf);
	});
};

// DELETE /equipment/photo
// delete an equipment photo
export const del: RequestHandler<Locals> = async (event) => {

	if (!event.locals.user || event.locals.user.role < 1) {
		return {
			status: 401,
			body: 'Unauthorized',
		};
	}

	const data = await event.request.formData();

	const equipment_photo_id = data.has('id') ? +data.get('id').toString() : undefined;

	if (equipment_photo_id === undefined) {
		return {
			status: 400,
			body: 'Invalid Equipment ID',
		};
	}

	// check if the equipment photo exists
	const photo = await EquipmentPhoto.findOne({
		where: {
			id: equipment_photo_id,
		},
	});

	// unable to find the equipment photo
	if (photo === null) {
		return {
			status: 404,
			body: 'The equipment photo could not be found',
		};
	}

	// delete the photo in the database
	const affected_row = await EquipmentPhoto.destroy({
		where: {
			id: equipment_photo_id,
		},
	});

	// the photo was not destroyed
	if (!affected_row) {
		return {
			status: 400,
			body: 'The equipment photo was not destroyed',
		};
	}

	// delete the file
	fs.unlinkSync(path.join(UPLOAD_SINK, `${photo.filename}.webp`));
	fs.unlinkSync(path.join(UPLOAD_SINK, `${photo.filename}_thumbnail.webp`));

	return { status: 200 };
};
