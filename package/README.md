# `astro-startup-code`

An Astro Integration that allows you to run code alongside a NodeJS deployment.

## Prerequisites
- Astro 5
- The `@astrojs/node` adapter

## Getting Started
First, install the integration:

```bash
# npm
npx astro add astro-startup-code

# pnpm
pnpm astro add astro-startup-code

# yarn
yarn astro add astro-startup-code
```

Alternatively, you can manually install the package and add it to your astro.config.mjs file:
```bash
# npm
npm install astro-startup-code

# pnpm
pnpm add astro-startup-code

# yarn
yarn add astro-startup-code
```

```js
// @ts-check
import { defineConfig } from "astro/config";
import startupCode from 'astro-startup-code';

// https://astro.build/config
export default defineConfig({
	// ...
	integrations: [
		startupCode({
			// ...
		})
	],
});
```

Once installed, you need to configure the entrypoint to be loaded when the server starts:

```js
export default defineConfig({
	// ...
	integrations: [
		startupCode({
			entrypoint: "./src/path/to/my/entrypoint.ts"
		})
	],
});
```

### Disabling in Development
You can set the `runInDev` option to false if you want to stop the integration from loading your entrypoint during development:

```js
export default defineConfig({
	// ...
	integrations: [
		startupCode({
			entrypoint: "./src/path/to/my/entrypoint.ts",
			runInDev: false,
		})
	],
});
```
