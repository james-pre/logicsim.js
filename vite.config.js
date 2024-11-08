import { defineConfig } from 'vite';

export default defineConfig({
	base: './',
	root: './src',
	build: {
		outDir: '../build',
		emptyOutDir: true,
		target: 'esnext',
	},
	esbuild: {
		target: 'es2022',
	},
});
