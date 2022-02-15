import adapter from '@sveltejs/adapter-node';
import preprocess from 'svelte-preprocess';
import morgan from 'morgan';
import { DateTime } from 'luxon';

const morganLoggerPlugin = {
	name: 'morgan-logger-middleware',
	configureServer(server) {
		morgan.token('date', function() { return DateTime.now().toFormat('dd/MM/yyyy HH:mm:ss'); });
		server.middlewares.use(morgan(':remote-addr - :remote-user [:date] :method :url :status - :response-time ms'));
	}
};

/** @type {import('@sveltejs/kit').Config} */
const config = {
	// Consult https://github.com/sveltejs/svelte-preprocess
	// for more information about preprocessors
	preprocess: preprocess(),

	kit: {
		adapter: adapter({ out: 'build' }),

		// hydrate the <div id="svelte"> element in src/app.html
		target: '#svelte',
		vite: {

			plugins: [morganLoggerPlugin],

			optimizeDeps: {
				exclude: ['pg-hstore']
			},

			build: {
				rollupOptions: {
					output: {
						manualChunks: undefined
					}
				}
			},
		},

		// Override http methods
		methodOverride: {
			allowed: ['PUT', 'DELETE']
		}
	}
};

export default config;
