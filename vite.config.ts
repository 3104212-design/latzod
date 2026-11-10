import { defineConfig, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import { readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';

/** נותן לכל בנייה מזהה משלה במטמון של ה-service worker, כדי שגרסה חדשה תחליף את הישנה בטלפון */
function swVersion(): Plugin {
  let outDir = 'dist';
  return {
    name: 'sw-version',
    apply: 'build',
    configResolved(c) {
      outDir = resolve(c.root, c.build.outDir);
    },
    async closeBundle() {
      const file = resolve(outDir, 'sw.js');
      const build = new Date().toISOString().replace(/[-:T]/g, '').slice(0, 12);
      const src = await readFile(file, 'utf8');
      await writeFile(file, src.replace("'latzod-v1'", `'latzod-${build}'`));
    },
  };
}

export default defineConfig({
  plugins: [react(), swVersion()],
  base: './',
  server: { port: 5180 },
  build: { chunkSizeWarningLimit: 1200 },
});
