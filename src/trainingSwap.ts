import { Exercise, PlanExercise, exerciseById } from './data';

export const isHoldExercise = (ex: Exercise) => /plank|wall.?sit|dead.?hang/i.test(ex.id + ' ' + ex.en);

// Conservative starting-point heuristic, not a physiological load equivalence.
// Actual effort depends on weight, technique and the individual.
export function swapPrescription(current: PlanExercise, next: Exercise): PlanExercise {
    const previous = exerciseById(current.id);
    const delta = (previous?.diff || next.diff) - next.diff;
    const numbers = current.reps.match(/\d+/g)?.map(Number) || [8, 12];
    const hold = isHoldExercise(next);
    const factor = Math.pow(1.15, delta);
    const clamp = (value: number) => Math.max(hold ? 10 : 3, Math.min(hold ? 90 : 25, Math.round(value * factor)));
    const low = clamp(numbers[0]), high = Math.max(low, clamp(numbers[1] || numbers[0]));
    const reps = `${low === high ? low : `${low}-${high}`}${hold ? ' שניות' : ''}`;
    return { ...current, id: next.id, he: next.he, en: next.en, reps,
        restSec: Math.min(180, current.restSec + (delta < 0 ? Math.min(30, -delta * 15) : 0)),
        note: 'יעד פתיחה משוער לאחר החלפה. כוון למאמץ דומה עם 2-3 חזרות ברזרבה; התאם משקל לפי התחושה והטכניקה. לא עומס זהה מובטח.' };
}
