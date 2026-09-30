import { defineConfig } from 'vite';

// Relative base so the build works at a GitHub Pages user site (/) or a project site (/repo/).
export default defineConfig({
  base: './',
});
