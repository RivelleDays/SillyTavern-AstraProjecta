import { defineConfig } from 'vitest/config'

export default defineConfig({
	test: {
		environment: 'node',
		globals: true,
	},
	esbuild: {
		loader: {
			'.js': 'jsx',
		},
	},
})
