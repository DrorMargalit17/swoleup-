// Generated licensing-safe photos (created for SwoleUp, no stock or third-party assets).
import hero from './photos/hero-workout.webp';
import chest from './photos/muscle-chest.webp';
import back from './photos/muscle-back.webp';
import shoulders from './photos/muscle-shoulders.webp';
import arms from './photos/muscle-arms.webp';
import legs from './photos/muscle-legs.webp';
import abs from './photos/muscle-abs.webp';
import glutes from './photos/muscle-glutes.webp';
import cond from './photos/muscle-cond.webp';
import catHome from './photos/cat-home.webp';
import catGym from './photos/cat-gym.webp';
import catLibrary from './photos/cat-library.webp';

export const HERO_IMG = hero;

export const SECTION_IMG: Record<string, string> = {
    'חזה': chest,
    'גב': back,
    'כתפיים': shoulders,
    'ידיים': arms,
    'רגליים': legs,
    'ישבן': glutes,
    'בטן': abs,
    'כל הגוף': cond,
};

export const CAT_IMGS = { home: catHome, gym: catGym, library: catLibrary };

export function sectionImg(section: string): string {
    return SECTION_IMG[section] || hero;
}

// Per-exercise art overrides where the section photo would depict a different
// movement (e.g. the shoulders section photo shows an overhead press, which
// must not illustrate a shrug). Generated for SwoleUp, licensing-safe.
import shrug from './photos/muscle-shrug.webp';
const EXERCISE_IMG: Record<string, string> = { shrug };
export function exerciseImg(id: string, section: string): string {
    return EXERCISE_IMG[id] || sectionImg(section);
}
