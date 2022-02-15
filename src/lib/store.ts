import { writable } from 'svelte/store';

// page title
function createTitle() {

	const {subscribe, set, update} = writable('');
	
	return {
		subscribe,
		set: (value) => {
			set(`${value}`)
		},
		clear: () => {
			set('');
		}
	}
}

export const title = createTitle();
