import path from "node:path";
import { configDefaults, defineConfig } from "vitest/config";

export default defineConfig({
	resolve: {
		alias: {
			"@": path.resolve(__dirname, "src"),
		},
	},
	test: {
		environment: "jsdom",
		exclude: [...configDefaults.exclude, "**/.worktrees/**"],
		setupFiles: ["./src/test/setup.ts"],
	},
});
