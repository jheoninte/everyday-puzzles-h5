import { DailyPuzzlePack, GAME_IDS, PackEntry, PackManifest } from '../core/types/PuzzlePackTypes';

async function readContent(path: string): Promise<unknown> {
  const response = await fetch(`${import.meta.env.BASE_URL}${path}`);
  if (!response.ok) throw new Error('Unable to load puzzles. Check your connection and try again.');
  return response.json();
}

export async function loadPackManifest(): Promise<PackManifest> {
  const manifest = await readContent('puzzles/manifest.json') as PackManifest;
  if (manifest?.version !== 1 || !Array.isArray(manifest.packs) || !manifest.packs.every((entry) =>
    entry && typeof entry.id === 'string' && /^[a-zA-Z0-9-]+$/.test(entry.id) &&
    typeof entry.title === 'string' && Number.isInteger(entry.order) &&
    ['easy', 'medium', 'hard'].includes(entry.difficulty) && Number.isInteger(entry.revision) && entry.revision > 0 &&
    typeof entry.path === 'string' && /^puzzles\/[a-zA-Z0-9/_-]+\.json$/.test(entry.path),
  ) || new Set(manifest.packs.map((entry) => entry.id)).size !== manifest.packs.length) {
    throw new Error('Unable to read the puzzle collection. Check for an app update.');
  }
  return { version: 1, packs: [...manifest.packs].sort((left, right) => left.order - right.order) };
}

export async function loadPuzzlePack(entry: PackEntry): Promise<DailyPuzzlePack> {
  const pack = await readContent(entry.path) as DailyPuzzlePack;
  if (!pack || typeof pack.date !== 'string' || !Number.isInteger(pack.version) ||
    !pack.games || !GAME_IDS.every((gameId) => pack.games[gameId])) {
    throw new Error('This puzzle data is invalid. Choose another pack or try again.');
  }
  return pack;
}
