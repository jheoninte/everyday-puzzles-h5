import fs from 'node:fs';
import path from 'node:path';
import { constructHashtags, scrambleHashtag } from './construct-hashtags.mjs';
import { validatePack, signature } from './content-rules.mjs';

const source = process.argv[2];
if (!source) throw new Error('Usage: node tools/stage-content.mjs path/to/gemini-content.json');
const raw = fs.readFileSync(source, 'utf8').replace(/^\uFEFF/, '').trim();
const content = JSON.parse(raw.startsWith('```') ? raw.replace(/^```(?:json)?\s*/, '').replace(/\s*```$/, '') : raw);
const errors = [];
if (content.schemaVersion !== 1) errors.push('schemaVersion must be 1');
if (!Array.isArray(content.guessWords) || content.guessWords.length < 500 || new Set(content.guessWords).size !== content.guessWords.length || !content.guessWords.every((w) => typeof w === 'string' && /^[A-Z]{5}$/.test(w))) errors.push('guessWords needs at least 500 unique uppercase five-letter words');
if (!Array.isArray(content.packs) || content.packs.length !== 20) errors.push('Exactly 20 packs required');
if (errors.length) { console.error(errors.join('\n')); process.exit(1); }
const answers = new Set(), anagrams = new Set(), titles = new Set();
if (Array.isArray(content.packs)) for (const [i, p] of content.packs.entries()) {
  const expected = 'launch-' + String(i + 1).padStart(2, '0');
  if (!p || typeof p !== 'object') { errors.push(`${expected}: invalid entry`); continue; }
  if (p.id !== expected || p.difficulty !== (i < 4 ? 'easy' : i < 16 ? 'medium' : 'hard')) errors.push(`${expected}: invalid ID/order/difficulty`);
  if (typeof p.title !== 'string' || !/^[A-Za-z][A-Za-z '\-]{2,59}$/.test(p.title) || titles.has(p.title.toLowerCase())) errors.push(`${expected}: invalid or repeated English title`);
  else titles.add(p.title.toLowerCase());
  if (!/^[A-Z]{5}$/.test(p.password?.answer ?? '') || answers.has(p.password?.answer) || !content.guessWords?.includes(p.password?.answer)) errors.push(`${expected}: invalid, duplicate or unlisted Password answer`);
  answers.add(p.password?.answer);
  const letters = p.anygram?.baseLetters;
  if (typeof letters !== 'string' || !/^[A-Z]{6}$/.test(letters) || anagrams.has(signature(letters))) errors.push(`${expected}: invalid or duplicate Anygram letters`);
  else anagrams.add(signature(letters));
  if (!Array.isArray(p.anygram?.validWords) || !p.anygram.validWords.some((w) => typeof w === 'string' && w.length === 6) || !p.anygram.validWords.every((w) => typeof w === 'string' && /^[A-Z]{3,6}$/.test(w))) errors.push(`${expected}: Anygram needs common 3–6 letter targets including one six-letter word`);
}
if (errors.length) { console.error(errors.join('\n')); process.exit(1); }
const sudoku = JSON.parse(fs.readFileSync('content/staging/sudoku.json', 'utf8'));
const grids = constructHashtags(content.guessWords);
const staged = content.packs.map((candidate, i) => {
  const pack = { version: 1, date: candidate.id, games: {
    password: { wordLength: 5, maxAttempts: 6, ...candidate.password, validDictionary: content.guessWords },
    hashtag: { gridSize: 5, maxMoves: 15, solutionGrid: grids[i], initialGrid: scrambleHashtag(grids[i], i) },
    anygram: { baseLetters: [...candidate.anygram.baseLetters], validWords: candidate.anygram.validWords },
    sudoku: sudoku[i],
  } };
  const result = validatePack(pack, { release: true });
  errors.push(...result.errors.map((e) => `${candidate.id}: ${e}`));
  return { candidate, pack, result };
});
if (errors.length) { console.error(errors.join('\n')); process.exit(1); }
// Staging never edits the playable manifest or existing IDs. Publication follows editorial review.
const out = 'content/staging/release';
fs.mkdirSync(out, { recursive: true });
for (const { candidate, pack } of staged) fs.writeFileSync(path.join(out, candidate.id + '.json'), JSON.stringify(pack, null, 2) + '\n');
fs.writeFileSync(path.join(out, 'manifest.json'), JSON.stringify({ version: 1, packs: staged.map(({ candidate }, i) => ({ id: candidate.id, title: candidate.title, order: i + 1, difficulty: candidate.difficulty, path: `puzzles/release-v1/${candidate.id}.json`, revision: 1 })) }, null, 2) + '\n');
fs.writeFileSync(path.join(out, 'validation.json'), JSON.stringify({ status: 'Structural validation passed; editorial review and playtime testing pending', puzzles: 80, packs: staged.map(({ candidate, result }) => ({ id: candidate.id, ...result })) }, null, 2) + '\n');
console.log('Staged 20 packs / 80 puzzles. Review English words and playtest before replacing the public manifest.');
