import { Dimensions } from "react-native";

export type WmImageParams = { imageUri: string; scale: number; offsetX: number; offsetY: number };
export type WatermelonPreset = {
  id: string;
  name: string;
  difficulty: string;
  wmImages: Record<number, WmImageParams>;
};

const { width } = Dimensions.get("window");
export const WATERMELON_GAME_WIDTH = Math.min(width - 32, 500);
export const WATERMELON_GAME_HEIGHT = Math.min(680, WATERMELON_GAME_WIDTH * 1.7);
const SCALE_RATIO = WATERMELON_GAME_WIDTH / 380;

export const FRUITS = [
  { level: 0, radius: 12 * SCALE_RATIO, color: '#FF4757', name: '체리' },
  { level: 1, radius: 18 * SCALE_RATIO, color: '#FFA502', name: '딸기' },
  { level: 2, radius: 25 * SCALE_RATIO, color: '#ECCC68', name: '포도' },
  { level: 3, radius: 32 * SCALE_RATIO, color: '#7BED9F', name: '귤' },
  { level: 4, radius: 39 * SCALE_RATIO, color: '#FF7F50', name: '오렌지' },
  { level: 5, radius: 46 * SCALE_RATIO, color: '#FF6348', name: '사과' },
  { level: 6, radius: 54 * SCALE_RATIO, color: '#EADB5D', name: '배' },
  { level: 7, radius: 62 * SCALE_RATIO, color: '#FF9FF3', name: '복숭아' },
  { level: 8, radius: 70 * SCALE_RATIO, color: '#F368E0', name: '파인애플' },
  { level: 9, radius: 80 * SCALE_RATIO, color: '#10AC84', name: '메론' },
  { level: 10, radius: 95 * SCALE_RATIO, color: '#EE5253', name: '수박' }, 
];

export const WATERMELON_DIFFICULTIES = [
  { id: 'very_easy', name: '베이비', levels: [3, 4] },
  { id: 'easy', name: '이지', levels: [2, 3] },
  { id: 'normal', name: '노멀', levels: [0, 1, 2] },
  { id: 'hard', name: '하드', levels: [0, 1] },
  { id: 'extreme', name: '익스트림', levels: [0] },
];

export const getRandomNextFruit = (difficultyId: string) => {
  const diff = WATERMELON_DIFFICULTIES.find(d => d.id === difficultyId) || WATERMELON_DIFFICULTIES[2];
  return diff.levels[Math.floor(Math.random() * diff.levels.length)];
};