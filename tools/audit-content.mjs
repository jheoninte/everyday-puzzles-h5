import fs from 'node:fs';
import { validatePack, signature } from './content-rules.mjs';

const manifest = JSON.parse(fs.readFileSync('public/puzzles/manifest.json', 'utf8'));
const seen = new Map();
const report = { scope: 'Current playable candidates, not release-certified content', packs: [], lexicalReview: 'English word validity, obscurity and clues need editorial review; structural checks do not establish dictionary membership.' };
for (const entry of manifest.packs) {
  const pack = JSON.parse(fs.readFileSync('public/' + entry.path, 'utf8'));
  const result = validatePack(pack, { release: true });
  for (const [game, key] of Object.entries({ password: pack.games.password.answer, hashtag: JSON.stringify(pack.games.hashtag.solutionGrid), anygram: signature(pack.games.anygram.baseLetters), sudoku: JSON.stringify(pack.games.sudoku.givens) })) {
    const id = game + ':' + key;
    if (seen.has(id)) result.errors.push(`${game}: duplicates ${seen.get(id)}`);
    else seen.set(id, entry.id);
  }
  report.packs.push({ id: entry.id, ...result });
}
report.summary = { packs: report.packs.length, puzzles: report.packs.length * 4, packsPassingStructuralChecks: report.packs.filter((p) => !p.errors.length).length, errors: report.packs.reduce((n, p) => n + p.errors.length, 0) };
fs.mkdirSync('docs/content', { recursive: true });
fs.writeFileSync('docs/content/current-audit.json', JSON.stringify(report, null, 2) + '\n');
for (const p of report.packs) console.log(`${p.id}: ${p.errors.length ? p.errors.join('; ') : 'structural checks passed; editorial review pending'}`);
console.log(JSON.stringify(report.summary));
if (report.summary.errors) process.exitCode = 1;
