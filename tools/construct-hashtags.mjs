import { hashtagGrid } from './content-rules.mjs';

// Constraint search constructs six crossing words; a model never needs to guess grids.
export function constructHashtags(dictionary, count = 20) {
  const words = [...new Set(dictionary)].sort();
  const results = [], seen = new Set(), usage = new Map();
  let nodes = 0;
  const limit = 2_000_000;
  function search(slots) {
    if (++nodes > limit || results.length === count) return;
    if (slots.some((value) => value && (usage.get(value) ?? 0) >= 3)) return;
    let best;
    for (let slot = 0; slot < 6; slot++) {
      if (slots[slot]) continue;
      const horizontal = slot < 3, index = slot % 3;
      const candidates = words.filter((candidate) => {
        if (slots.includes(candidate) || (usage.get(candidate) ?? 0) >= 3) return false;
        for (let j = 0; j < 3; j++) {
          const crossing = slots[horizontal ? j + 3 : j];
          if (crossing && candidate[j * 2] !== crossing[index * 2]) return false;
        }
        return true;
      });
      if (!candidates.length) return;
      if (!best || candidates.length < best.candidates.length) best = { slot, candidates };
    }
    if (!best) {
      const key = [slots.join('/'), [...slots.slice(3), ...slots.slice(0, 3)].join('/')].sort()[0];
      if (!seen.has(key)) {
        seen.add(key);
        slots.forEach((value) => usage.set(value, (usage.get(value) ?? 0) + 1));
        results.push(hashtagGrid(slots.slice(0, 3), slots.slice(3)));
      }
      return;
    }
    for (const candidate of best.candidates) {
      if ((usage.get(candidate) ?? 0) >= 3) continue;
      slots[best.slot] = candidate;
      search(slots);
      slots[best.slot] = null;
      if (results.length === count || nodes > limit) return;
    }
  }
  search(Array(6).fill(null));
  if (results.length !== count) throw new Error(`Constructed ${results.length}/${count} grids in ${nodes} search nodes. Expand/review guessWords; no public files were changed.`);
  return results;
}

export function scrambleHashtag(solution, index) {
  const grid = solution.map((row) => [...row]);
  const positions = [];
  for (let r = 0; r < 5; r++) for (let c = 0; c < 5; c++) if (grid[r][c] !== null) positions.push([r, c]);
  const swaps = [];
  // Each pair uses fresh positions, so reversing the swaps solves the board in <=10 moves.
  const remaining = positions.map((_, i) => (i + index * 5) % positions.length);
  while (remaining.length > 1 && swaps.length < 8 + index % 3) {
    const i = remaining.shift();
    const [r, c] = positions[i];
    const match = remaining.findIndex((j) => grid[positions[j][0]][positions[j][1]] !== grid[r][c]);
    if (match < 0) break;
    const [j] = remaining.splice(match, 1), [r2, c2] = positions[j];
    [grid[r][c], grid[r2][c2]] = [grid[r2][c2], grid[r][c]];
    swaps.push([[r, c], [r2, c2]]);
  }
  if (swaps.length < 5) throw new Error('Not enough distinct letters for a useful scramble');
  return grid;
}
