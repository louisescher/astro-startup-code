import { createResolver, defineIntegration, injectDevRoute } from "astro-integration-kit";
import type { PluginOption } from "vite";
import type { TransformPluginContext, TransformResult } from "rollup";
import MagicString from "magic-string";
import { z } from "astro/zod";

const MODULE_ID = "virtual:astro-startup-code";
const RESOLVED_MODULE_ID = "\x00virtual:astro-startup-code";

const DEV_ROUTE = "/dev-only/astro-startup-code";

const ALLOWED_ADAPTERS = [
	"@astrojs/node",
	"@deno/astro-adapter"
];

type Transformer = (
	ctx: TransformPluginContext,
	code: string,
	id: string
) => TransformResult | null;

/**
 * Modifies the generated entrypoint so that the virtual module for the users
 * entrypoint can get imported.
 * @param ctx The plugin context.
 * @param code The code of the module to be transformed.
 * @param id The ID of the module to be transformed.
 * @returns The modified code of the entrypoint, or nothing if another module is passed.
 */
const entrypointTransformer: Transformer = (ctx, code, id) => {
	if (!id.includes("@astrojs-ssr-virtual-entry")) return;

	const ms = new MagicString(code);
	ms.append(`import ${JSON.stringify(MODULE_ID)};\n`);

	return {
		code: ms.toString(),
		map: ms.generateMap(),
	};
}

/**
 * A Vite plugin that both creates a virtual module for the users entrypoint and
 * injects a transformer so the newly created virtual module can be imported
 * by the Astro servers entrypoint.
 * @param resolvedEntrypoint The path to the users entrypoint which should be loaded when the server starts.
 * @returns
 */
const plugin = (resolvedEntrypoint: string): PluginOption => {
	const code = `import "${resolvedEntrypoint}"`;

	return {
		name: "astro-startup-code",
		enforce: 'post',
		resolveId: (id) => {
			if (id === MODULE_ID) return RESOLVED_MODULE_ID;

			return null;
		},
		load: (id, { ssr } = {}) => {
			if (id !== RESOLVED_MODULE_ID) return;
			if (!ssr) throw new Error("This shouldn't happen. Please file an issue for astro-startup-code.");

			return code;
		},
		async transform(code, id, { ssr } = {}) {
			if (!ssr) return;

			const transformers: Transformer[] = [
				entrypointTransformer
			];

			for (const transformer of transformers) {
				const result = transformer(this, code, id);
				if (result) return result;
			}

			return;
		}
	}
}

/**
 * An integration that allows you to run code alongside the Astro dev and production servers,
 * for example to run a scheduled database cleanup every few hours using a `setInterval` callback.
 */
export default defineIntegration({
	name: "astro-startup-code",
	optionsSchema: z.object({
		/**
		 * The file you want to load when the server starts.
		 */
		entrypoint: z.string(),
		/**
		 * Whether to load the endpoint in development mode or not.
			* @default true
		 */
		runInDev: z.boolean().optional().default(true),
	}),
	setup: ({ options }) => {
		let resolvedEntrypoint: string;
		let isDev = false;

		return {
			hooks: {
				"astro:config:setup": async (params) => {
					if (params.command === "dev" && options.runInDev) isDev = true;

					if (!params.config.adapter || !ALLOWED_ADAPTERS.includes(params.config.adapter.name)) {
						throw new Error(`astro-startup-code currently only works with one of the following adapters: ${ALLOWED_ADAPTERS.join(", ")}`);
					}

					const { resolve } = createResolver(params.config.root.pathname);

					const { updateConfig } = params;

					resolvedEntrypoint = resolve(options.entrypoint);

					updateConfig({ vite: {plugins: [plugin(resolvedEntrypoint)] } });

					injectDevRoute(params, {
						entrypoint: resolvedEntrypoint,
						pattern: DEV_ROUTE,
						prerender: true,
					});
				},
				"astro:server:setup": async ({ server }) => {
					if (isDev) {
						await server.ssrLoadModule(resolvedEntrypoint, { fixStacktrace: true });
					}
				}
			}
		}
	}
});
