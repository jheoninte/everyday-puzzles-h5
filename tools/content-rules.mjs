export const games = ['password', 'hashtag', 'anygram', 'sudoku'];
const word = (value, length) => typeof value === 'string' && /^[A-Z]+$/.test(value) && (!length || value.length === length);
const check = (condition, message) => { if (!condition) throw new Error(message); };
const matrix = (value, size, cell) => Array.isArray(value) && value.length === size && value.every((row) => Array.isArray(row) && row.length === size && row.every(cell));
export const signature = (letters) => [...letters].sort().join('');
export function canSpell(letters, target) {
  const remaining = [...letters];
  return [...target].every((letter) => { const index = remaining.indexOf(letter); return index < 0 ? false : (remaining.splice(index, 1), true); });
}
export function sudokuSolutions(givens, limit = 2) {
  const board = givens.map((row) => [...row]);
  const found = [];
  function visit() {
    if (found.length >= limit) return;
    let target = null;
    for (let r = 0; r < 4; r++) for (let c = 0; c < 4; c++) {
      if (board[r][c]) continue;
      const choices = [1, 2, 3, 4].filter((n) => !board[r].includes(n) && !board.some((row) => row[c] === n) &&
        ![0, 1].some((dr) => [0, 1].some((dc) => board[r - r % 2 + dr][c - c % 2 + dc] === n)));
      if (!choices.length) return;
      if (!target || choices.length < target.choices.length) target = { r, c, choices };
    }
    if (!target) { found.push(board.map((row) => [...row])); return; }
    for (const n of target.choices) { board[target.r][target.c] = n; visit(); }
    board[target.r][target.c] = 0;
  }
  visit();
  return found;
}
export function hashtagWords(grid) {
  return [0, 2, 4].map((r) => grid[r].join('')).concat([0, 2, 4].map((c) => grid.map((row) => row[c]).join('')));
}
export function hashtagGrid(rows, columns) {
  check(Array.isArray(rows) && rows.length === 3 && rows.every((v) => word(v, 5)), 'Hashtag needs three five-letter rows');
  check(Array.isArray(columns) && columns.length === 3 && columns.every((v) => word(v, 5)), 'Hashtag needs three five-letter columns');
  const grid = Array.from({ length: 5 }, () => Array(5).fill(null));
  rows.forEach((value, i) => [...value].forEach((letter, c) => { grid[i * 2][c] = letter; }));
  columns.forEach((value, i) => [...value].forEach((letter, r) => {
    check(grid[r][i * 2] === null || grid[r][i * 2] === letter, `Hashtag crossing mismatch at row ${r + 1}, column ${i * 2 + 1}`);
    grid[r][i * 2] = letter;
  }));
  return grid;
}
export function hashtagSwaps(initial, solution) {
  const positions = [];
  for (let r = 0; r < 5; r++) for (let c = 0; c < 5; c++) if (solution[r][c] !== null) positions.push([r, c]);
  const source = positions.map(([r, c]) => initial[r][c]);
  const target = positions.map(([r, c]) => solution[r][c]);
  check(signature(source) === signature(target), 'Hashtag letter counts differ');
  const swaps = [];
  for (let i = 0; i < source.length; i++) {
    if (source[i] === target[i]) continue;
    const candidates = source.map((letter, j) => letter === target[i] && j > i && letter !== target[j] ? j : -1).filter((j) => j >= 0);
    const j = candidates.find((j) => target[j] === source[i]) ?? candidates[0];
    check(j !== undefined, 'Hashtag cannot be solved');
    [source[i], source[j]] = [source[j], source[i]];
    swaps.push([positions[i], positions[j]]);
  }
  return swaps;
}
export function validatePack(pack, { release = false } = {}) {
  const errors = [];
  const details = {};
  if (!pack || pack.version !== 1 || typeof pack.date !== 'string') errors.push('Invalid pack metadata');
  for (const game of games) {
    try {
      const p = pack?.games?.[game];
      check(p && typeof p === 'object', `Missing ${game}`);
      if (game === 'password') {
        check(p.wordLength === 5 && p.maxAttempts === 6 && word(p.answer, 5), 'Invalid Password rules or answer');
        check(typeof p.hint === 'string' && p.hint.trim().length > 5 && !p.hint.toUpperCase().includes(p.answer), 'Missing hint or hint reveals answer');
        check(Array.isArray(p.validDictionary) && p.validDictionary.includes(p.answer) && p.validDictionary.every((v) => word(v, 5)), 'Invalid Password dictionary');
        details.password = p.answer;
      } else if (game === 'anygram') {
        check(Array.isArray(p.baseLetters) && p.baseLetters.length === 6 && p.baseLetters.every((v) => word(v, 1)), 'Anygram needs six letters');
        check(Array.isArray(p.validWords) && p.validWords.length >= (release ? 5 : 1) && p.validWords.length <= (release ? 8 : 100), 'Anygram needs 5–8 target words for release');
        check(new Set(p.validWords).size === p.validWords.length && p.validWords.every((v) => word(v) && v.length >= 2 && v.length <= 6 && canSpell(p.baseLetters, v)), 'Invalid, repeated or unspellable Anygram target');
        details.anygram = signature(p.baseLetters);
      } else if (game === 'hashtag') {
        const validGrid = (grid) => matrix(grid, 5, (v) => v === null || word(v, 1)) && grid.every((row, r) => row.every((cell, c) => (cell === null) === (r % 2 === 1 && c % 2 === 1)));
        check(p.gridSize === 5 && p.maxMoves === 15 && validGrid(p.solutionGrid), 'Invalid Hashtag solution shape/rules');
        const words = hashtagWords(p.solutionGrid);
        check(new Set(words).size === 6, 'Hashtag must contain six distinct words');
        let initial = p.initialGrid;
        if (!initial && !release) {
          const letters = p.solutionGrid.flat().filter((v) => v !== null);
          let i = 0;
          initial = p.solutionGrid.map((row) => row.map((v) => v === null ? null : letters[(i++ + 3) % letters.length]));
        }
        check(validGrid(initial), 'Missing or invalid Hashtag initial grid');
        const swaps = hashtagSwaps(initial, p.solutionGrid);
        check(swaps.length > 0 && swaps.length <= p.maxMoves, 'No verified Hashtag solution within 15 swaps (constructive upper bound)');
        details.hashtag = { words, solutionSwaps: swaps.length, witness: swaps };
      } else {
        check(p.size === 4 && p.subgridRows === 2 && p.subgridCols === 2 && p.maxMistakes === 3 && p.hintCount === 3, 'Invalid Sudoku rules');
        check(['easy', 'medium', 'hard'].includes(p.difficulty), 'Invalid Sudoku difficulty');
        check(matrix(p.givens, 4, (v) => Number.isInteger(v) && v >= 0 && v <= 4) && matrix(p.solution, 4, (v) => Number.isInteger(v) && v >= 1 && v <= 4), 'Invalid Sudoku matrices');
        const lines = [...p.solution, ...[0, 1, 2, 3].map((c) => p.solution.map((r) => r[c])), ...[0, 2].flatMap((r) => [0, 2].map((c) => [p.solution[r][c], p.solution[r][c + 1], p.solution[r + 1][c], p.solution[r + 1][c + 1]]))];
        check(lines.every((line) => new Set(line).size === 4), 'Sudoku solution violates row, column or box rules');
        check(p.givens.flat().includes(0) && p.givens.every((row, r) => row.every((n, c) => n === 0 || n === p.solution[r][c])), 'Sudoku clues disagree with solution');
        const solutions = sudokuSolutions(p.givens);
        check(solutions.length === 1, `Sudoku has ${solutions.length >= 2 ? 'multiple' : 'no'} solutions`);
        check(JSON.stringify(solutions[0]) === JSON.stringify(p.solution), 'Sudoku solver disagrees with solution');
        details.sudoku = { clues: p.givens.flat().filter(Boolean).length, solutions: solutions.length };
      }
    } catch (error) { errors.push(`${game}: ${error.message}`); }
  }
  return { errors, details };
}
