import { reactRouter } from "@react-router/dev/vite";
import tailwindcss from "@tailwindcss/vite";
import { defineConfig } from "vite";
import type { Plugin } from "vite";
import tsconfigPaths from "vite-tsconfig-paths";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { createHash } from "node:crypto";

function swCacheVersion(): Plugin {
	return {
		name: "sw-cache-version",
		apply: "build",
		generateBundle() {
			const swPath = resolve(__dirname, "public/sw.js");
			let swSource = readFileSync(swPath, "utf-8");
			const hash = createHash("md5")
				.update(Date.now().toString())
				.digest("hex")
				.slice(0, 8);
			swSource = swSource.replace(
				/regulate-v1/g,
				`regulate-${hash}`,
			);
			this.emitFile({
				type: "asset",
				fileName: "sw.js",
				source: swSource,
			});
		},
	};
}

export default defineConfig({
	base: "/regulate-app/",
	plugins: [tailwindcss(), reactRouter(), tsconfigPaths(), swCacheVersion()],
});
