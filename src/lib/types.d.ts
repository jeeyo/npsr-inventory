/**
 * Can be made globally available by placing this
 * inside `global.d.ts` and removing `export` keyword
 */
export interface Locals {
	user: {
		id: number;
		username: string;
		fullname: string;
		email: string;
		role: number;
		// avatar: Uint8Array;
	};
}
