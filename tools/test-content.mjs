import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { canSpell, hashtagGrid, hashtagSwaps, hashtagWords, sudokuSolutions, validatePack } from './content-rules.mjs';
import { constructHashtags, scrambleHashtag } from './construct-hashtags.mjs';

const sudoku = JSON.parse(fs.readFileSync('content/staging/sudoku.json', 'utf8'));
const solutionGrid = hashtagGrid(['GREAT', 'ALIVE', 'SPEED'], ['GLASS', 'ELITE', 'TREND']);
function fixture(index) {
  return { version: 1, date: 'test-pack', games: {
    password: { wordLength: 5, maxAttempts: 6, answer: 'APPLE', hint: 'A fruit that grows on trees', validDictionary: ['APPLE', 'GREAT'] },
    hashtag: { gridSize: 5, maxMoves: 15, solutionGrid, initialGrid: scrambleHashtag(solutionGrid, index) },
    anygram: { baseLetters: [...'PLANET'], validWords: ['PLANET', 'PLANT', 'PLATE', 'PANEL', 'PLANE', 'TAPE'] },
    sudoku: sudoku[index],
  } };
}
assert.equal(sudoku.length, 20);
assert.equal(new Set(sudoku.map((s) => JSON.stringify(s.solution))).size, 20);
for (let i = 0; i < 20; i++) {
  const pack = fixture(i);
  const result = validatePack(pack, { release: true });
  assert.deepEqual(result.errors, [], `fixture ${i}: ${result.errors.join('; ')}`);
  const swaps = hashtagSwaps(pack.games.hashtag.initialGrid, solutionGrid);
  assert.ok(swaps.length <= 10);
  const replay = pack.games.hashtag.initialGrid.map((row) => [...row]);
  for (const [[r, c], [r2, c2]] of swaps) [replay[r][c], replay[r2][c2]] = [replay[r2][c2], replay[r][c]];
  assert.deepEqual(replay, solutionGrid);
}
console.log('PASS 20 distinct Sudoku answers with unique solutions; all constructed scramble witnesses replay within limits');
assert.equal(sudokuSolutions(Array.from({ length: 4 }, () => [0, 0, 0, 0])).length, 2);
const ambiguous = fixture(0);
ambiguous.games.sudoku = { ...sudoku[0], givens: Array.from({ length: 4 }, () => [0, 0, 0, 0]) };
assert.ok(validatePack(ambiguous).errors.some((e) => e.includes('multiple')));
const badAnswer = fixture(0);
badAnswer.games.sudoku = { ...sudoku[0], solution: sudoku[0].solution.map(() => [1, 1, 1, 1]) };
assert.ok(validatePack(badAnswer).errors.some((e) => e.includes('violates')));
assert.equal(canSpell('PLANET', 'APPLE'), false);
assert.equal(canSpell('LETTER', 'TREE'), true);
const badWord = fixture(0);
badWord.games.anygram.validWords.push('APPLE');
assert.ok(validatePack(badWord).errors.some((e) => e.includes('unspellable')));
const badGrid = fixture(0);
badGrid.games.hashtag.initialGrid[0][0] = 'Z';
assert.ok(validatePack(badGrid).errors.some((e) => e.includes('counts differ')));
assert.throws(() => hashtagGrid(['GREAT', 'ALIVE', 'SPEED'], ['GLASS', 'APPLE', 'TREND']), /crossing/);
console.log('PASS ambiguous/invalid Sudoku, repeated letters and broken crossword crossings/counts reject');
const grids = constructHashtags(['GREAT', 'ALIVE', 'SPEED', 'GLASS', 'ELITE', 'TREND'], 1);
assert.equal(grids.length, 1);
assert.throws(() => constructHashtags(['APPLE'], 1), /Constructed 0/);
console.log('PASS constraint constructor produces a crossed grid and rejects insufficient word banks');
// Synthetic strings test capacity and crossing structure only; they are never shipped as words.
const synthetic = Array.from({ length: 500 }, (_, i) => {
  let n = i;
  return Array.from({ length: 5 }, () => { const letter = 'ABCDE'[n % 5]; n = Math.floor(n / 5); return letter; }).join('');
});
const twenty = constructHashtags(synthetic);
assert.equal(twenty.length, 20);
const usage = new Map();
for (const grid of twenty) for (const w of hashtagWords(grid)) usage.set(w, (usage.get(w) ?? 0) + 1);
assert.ok([...usage.values()].every((n) => n <= 3));
assert.equal(new Set(twenty.map((g) => JSON.stringify(g))).size, 20);
console.log('PASS 500-entry synthetic capacity test constructs 20 distinct grids with word reuse capped at three');
const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'puzzle-content-test-'));
try {
  fs.mkdirSync(path.join(tempRoot, 'content/staging'), { recursive: true });
  fs.copyFileSync('content/staging/sudoku.json', path.join(tempRoot, 'content/staging/sudoku.json'));
  const input = {
    schemaVersion: 1, guessWords: synthetic,
    packs: Array.from({ length: 20 }, (_, i) => ({
      id: 'launch-' + String(i + 1).padStart(2, '0'), title: 'Fixture ' + String.fromCharCode(65 + i),
      difficulty: i < 4 ? 'easy' : i < 16 ? 'medium' : 'hard',
      password: { answer: synthetic[i], hint: 'Synthetic fixture for structural tests' },
      anygram: { baseLetters: 'ABCDE' + String.fromCharCode(69 + i), validWords: ['ABCDE' + String.fromCharCode(69 + i), 'ABC', 'ABD', 'ACD', 'BCD'] },
    })),
  };
  const inputPath = path.join(tempRoot, 'fixture.json');
  fs.writeFileSync(inputPath, JSON.stringify(input));
  const run = spawnSync(process.execPath, [path.resolve('tools/stage-content.mjs'), inputPath], { cwd: tempRoot, encoding: 'utf8', timeout: 30000 });
  assert.equal(run.status, 0, run.stderr || run.error?.message);
  const manifest = JSON.parse(fs.readFileSync(path.join(tempRoot, 'content/staging/release/manifest.json')));
  assert.equal(manifest.packs.length, 20);
  for (const entry of manifest.packs) {
    const pack = JSON.parse(fs.readFileSync(path.join(tempRoot, 'content/staging/release', entry.id + '.json')));
    assert.deepEqual(validatePack(pack, { release: true }).errors, []);
  }
  input.packs[1].password.answer = input.packs[0].password.answer;
  fs.writeFileSync(inputPath, JSON.stringify(input));
  const bad = spawnSync(process.execPath, [path.resolve('tools/stage-content.mjs'), inputPath], { cwd: tempRoot, encoding: 'utf8', timeout: 30000 });
  assert.equal(bad.status, 1);
  assert.match(bad.stderr, /duplicate/);
  assert.equal(fs.existsSync(path.join(tempRoot, 'public')), false);
  console.log('PASS full import stages 80 structural fixtures; invalid input rejects; public files remain untouched');
} finally {
  // Only delete the exact temporary directory this test created under the system temp folder.
  const resolved = path.resolve(tempRoot);
  if (path.dirname(resolved) !== path.resolve(os.tmpdir()) || !path.basename(resolved).startsWith('puzzle-content-test-')) throw new Error('Unexpected test temp path');
  fs.rmSync(resolved, { recursive: true, force: true });
}
