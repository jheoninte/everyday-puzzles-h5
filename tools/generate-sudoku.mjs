import fs from 'node:fs';
import { sudokuSolutions } from './content-rules.mjs';

// Fixed seed produces identical build artifacts. Clue counts are provisional difficulty labels.
let seed = 17112026;
const random = (n) => { seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0; return Math.floor(seed / 4294967296 * n); };
function shuffled(values) {
  const result = [...values];
  for (let i = result.length - 1; i > 0; i--) { const j = random(i + 1); [result[i], result[j]] = [result[j], result[i]]; }
  return result;
}
const base = [[1, 2, 3, 4], [3, 4, 1, 2], [2, 1, 4, 3], [4, 3, 2, 1]];
const generated = [];
const solutionsSeen = new Set();
for (let attempt = 0; generated.length < 20 && attempt < 10000; attempt++) {
  const digits = shuffled([1, 2, 3, 4]);
  const order = () => shuffled([0, 1]).flatMap((band) => shuffled([0, 1]).map((offset) => band * 2 + offset));
  const rows = order(), cols = order();
  const solution = rows.map((r) => cols.map((c) => digits[base[r][c] - 1]));
  const key = JSON.stringify(solution);
  if (solutionsSeen.has(key)) continue;
  const index = generated.length;
  const difficulty = index < 4 ? 'easy' : index < 16 ? 'medium' : 'hard';
  const targetClues = difficulty === 'easy' ? 9 : difficulty === 'medium' ? 7 : 5;
  const givens = solution.map((row) => [...row]);
  for (const pos of shuffled(Array.from({ length: 16 }, (_, i) => i))) {
    if (givens.flat().filter(Boolean).length <= targetClues) break;
    const r = Math.floor(pos / 4), c = pos % 4, old = givens[r][c];
    givens[r][c] = 0;
    if (sudokuSolutions(givens).length !== 1) givens[r][c] = old;
  }
  if (givens.flat().filter(Boolean).length !== targetClues) continue;
  solutionsSeen.add(key);
  generated.push({ difficulty, size: 4, subgridRows: 2, subgridCols: 2, maxMistakes: 3, hintCount: 3, givens, solution });
}
if (generated.length !== 20) throw new Error('Unable to generate 20 unique Sudoku boards');
fs.mkdirSync('content/staging', { recursive: true });
fs.writeFileSync('content/staging/sudoku.json', JSON.stringify(generated, null, 2) + '\n');
console.log('Generated 20 distinct Sudoku solutions, each with exactly one solution. Difficulty needs playtesting.');
