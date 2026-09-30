export type PuzzlePreset = {
  id: string;
  name: string;
  imageUri: string;
  size: number;
  scale: number;
  offsetX: number;
  offsetY: number;
};

export type Tile = number | null;

export type LineDrag = { path: number[]; delta: number; axis: "x" | "y" } | null;

export const COLORS = {
  ink: "#1A1D20",
  muted: "#868E96",
  paper: "#F4F2EB",
  panel: "#FFFFFF",
  coral: "#FF5A5F",
  teal: "#0CA678",
  line: "#E9ECEF",
};

export const makeGoal = (size: number): Tile[] => [
  null,
  ...Array.from({ length: size * size }, (_, index) => index),
];

export const getCoord = (idx: number, size: number) =>
  idx === 0 ? { r: -1, c: 0 } : { r: Math.floor((idx - 1) / size), c: (idx - 1) % size };

export const getIndex = (r: number, c: number, size: number) => {
  if (r === -1 && c === 0) return 0;
  if (r >= 0 && r < size && c >= 0 && c < size) return r * size + c + 1;
  return -1;
};

export const getShiftPath = (fromIdx: number, emptyIdx: number, size: number): number[] | null => {
  if (fromIdx === emptyIdx) return null;
  const from = getCoord(fromIdx, size);
  const to = getCoord(emptyIdx, size);

  if (from.r === to.r) {
    const step = Math.sign(to.c - from.c);
    const path = [];
    for (let c = from.c; c !== to.c; c += step) path.push(getIndex(from.r, c, size));
    path.push(emptyIdx);
    return path.includes(-1) ? null : path;
  }
  if (from.c === to.c) {
    const step = Math.sign(to.r - from.r);
    const path = [];
    for (let r = from.r; r !== to.r; r += step) path.push(getIndex(r, from.c, size));
    path.push(emptyIdx);
    return path.includes(-1) ? null : path;
  }
  return null;
};

export const shufflePuzzle = (size: number): Tile[] => {
  const totalTiles = size * size;
  while (true) {
    const numbers = Array.from({ length: totalTiles - 1 }, (_, i) => i + 1);
    for (let i = numbers.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [numbers[i], numbers[j]] = [numbers[j], numbers[i]];
    }
    let isOriginal = false;
    for (let i = 0; i < numbers.length; i++) {
      if (numbers[i] === i + 1) { isOriginal = true; break; }
    }
    if (isOriginal) continue;
    let inv = 0;
    for (let i = 0; i < numbers.length - 1; i++) {
      for (let j = i + 1; j < numbers.length; j++) {
        if (numbers[i] > numbers[j]) inv++;
      }
    }
    if (inv % 2 === 0) return [null, 0, ...numbers];
  }
};

export const isSolved = (tiles: Tile[], size: number) =>
  tiles.every((tile, index) => tile === (index === 0 ? null : index - 1));

export const clamp = (value: number, minimum: number, maximum: number) =>
  Math.min(maximum, Math.max(minimum, value));