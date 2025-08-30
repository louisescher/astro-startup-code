// @ts-check
import { defineConfig } from 'astro/config';
import startupCode from "astro-startup-code";

import node from "@astrojs/node";

// https://astro.build/config
export default defineConfig({
	integrations: [
		startupCode({
			entrypoint: "./src/cron/example.ts"
		})
	],
	adapter: node({
		mode: "standalone"
	})
});
