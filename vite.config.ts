import { defineConfig, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { buildReminders, EVENING_SLOTS, MORNING_SLOTS, slotFile } from './src/lib/reminders';

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

/** קובצי תזכורות מוכנים לאייפון: כל צירוף של שעת בוקר ושעת ערב, בחצאי שעות */
function reminderFiles(): Plugin {
  let outDir = 'dist';
  return {
    name: 'reminder-files',
    apply: 'build',
    configResolved(c) {
      outDir = resolve(c.root, c.build.outDir);
    },
    async closeBundle() {
      await mkdir(resolve(outDir, 'reminders'), { recursive: true });
      await Promise.all(
        MORNING_SLOTS.flatMap((m) =>
          EVENING_SLOTS.map((e) => writeFile(resolve(outDir, slotFile(m, e)), buildReminders(m, e, ''), 'utf8')),
        ),
      );
    },
  };
}

export default defineConfig({
  plugins: [react(), swVersion(), reminderFiles()],
  base: './',
  server: { port: 5180 },
  build: { chunkSizeWarningLimit: 1200 },
});
