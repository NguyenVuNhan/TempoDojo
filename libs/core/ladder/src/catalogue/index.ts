import type { Exercise } from '../types';
import { COORDINATION } from './coordination';
import { FEET } from './feet';
import { HANDS } from './hands';

export { COORDINATION, FEET, HANDS };

export const CATALOGUE: Exercise[] = [...HANDS, ...COORDINATION, ...FEET];

const BY_ID = new Map<string, Exercise>(CATALOGUE.map((ex) => [ex.id, ex]));

export function exerciseById(id: string): Exercise | undefined {
  return BY_ID.get(id);
}
