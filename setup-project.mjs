import fs from 'fs';
import path from 'path';

const projectRoot = process.cwd();
const directories = [
  'public/assets/audio',
  'public/assets/badges',
  'public/puzzles/2026-11',
  'src/core/games/password',
  'src/core/meta',
  'src/core/types',
  'src/services',
  'src/ui/components',
  'src/ui/games',
  'src/ui/layouts',
  'src/ui/screens',
  'docs',
];

for (const directory of directories) {
  fs.mkdirSync(path.join(projectRoot, directory), { recursive: true });
}

console.log('Project directories prepared.');
console.log('Copy this repository content or clone from GitHub to continue development.');

