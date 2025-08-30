import { createResolver, defineIntegration, injectDevRoute } from "astro-integration-kit";
import type { PluginOption } from "vite";
import type { TransformPluginContext, TransformResult } from "rollup";
import MagicString from "magic-string";
import { z } from "astro/zod";

const MODULE_ID = "virtual:rss-poller";
const RESOLVED_MODULE_ID = "\x00virtual:rss-poller";

type Transformer = (
	ctx: TransformPluginContext,
	code: string,
	id: string
) => TransformResult | null;

const entrypointTransformer: Transformer = (ctx, code, id) => {
	if (!id.includes("@astrojs-ssr-virtual-entry")) return;
	
	const ms = new MagicString(code);
	ms.append(`import ${JSON.stringify(MODULE_ID)};\n`);

	return {
		code: ms.toString(),
		map: ms.generateMap(),
	};
}

const plugin = (resolvedEntrypoint: string): PluginOption => {
	let code = ``;

	return {
		name: "astro-startup-code",
		enforce: 'post',
		async configResolved() {
			// TODO:
			code = `import "${resolvedEntrypoint}"`;
		},
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

export default defineIntegration({
	name: "astro-startup-code",
	optionsSchema: z.object({
		entrypoint: z.string(),
	}),
	setup: ({ options }) => {
		return {
			hooks: {
				"astro:config:setup": async (params) => {
					const { resolve } = createResolver(params.config.root.pathname);

					const { updateConfig } = params;

					const resolvedEntrypoint = resolve(options.entrypoint);

					updateConfig({ vite: {plugins: [plugin(resolvedEntrypoint)] } });

					injectDevRoute(params, {
						entrypoint: resolvedEntrypoint,
						pattern: "/dev-only/astro-startup-code",
						prerender: false,
					});
				},
			}
		}
	}
});