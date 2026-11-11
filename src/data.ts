// Types, exercise library (with difficulty, form cues, video links) and the plan generator.

export type Goal = 'muscle' | 'fatloss' | 'fitness' | 'strength';
export type Level = 'beginner' | 'some' | 'regular';
export type Place = 'gym' | 'home' | 'both';

export interface Profile {
    name: string;
    gender: 'male' | 'female' | 'other';
    age: number;
    heightCm: number;
    weightKg: number;
    goal: Goal;
    level: Level;
    place: Place;
    equipment: string[];
    daysPerWeek: number;
    sessionMin: number;
    limitations: string;
    sleepH: number;
    dailyActivity: 'sitting' | 'mixed' | 'active';
    diet: 'everything' | 'vegetarian' | 'vegan';
    motivation: string[];
    createdAt: string;
    // Optional manual overrides from nutrition settings; when set they win over the computed targets.
    kcalTarget?: number;
    proteinTarget?: number;
}

export interface Exercise {
    id: string;
    he: string;
    en: string;
    muscle: string;
    group: string;       // movement group for smart swapping
    diff: 1 | 2 | 3 | 4 | 5; // skill difficulty: 1 easiest, 5 hardest
    equip: 'gym' | 'home' | 'both';
    compound: boolean;
    cues: string[];
    feel?: string;   // what correct execution should feel like
}

export interface PlanExercise { id: string; he: string; en: string; sets: number; reps: string; restSec: number; note?: string }
export interface PlanDay { label: string; focus: string; exercises: PlanExercise[] }
export interface Plan { version: number; generatedAt: string; splitName: string; summary: string; days: PlanDay[] }

export interface SetLog { kg: number; reps: number; done: boolean }
export interface ExerciseLog { exerciseId: string; he: string; en: string; sets: SetLog[] }
export interface WorkoutLog { id: string; date: string; startedAt: string; durationMin: number; planDayLabel: string; focus: string; exercises: ExerciseLog[]; note?: string; rating?: number; feedback?: string }

// A paused, resumable workout: everything needed to pick up exactly where the user stopped.
export interface WorkoutSession { day: PlanDay; exs: ExerciseLog[]; ei: number; si: number; elapsedMs: number; restLeftMs: number; savedAt: string }

// User's equipment weights from settings (e.g. their dumbbell pair), auto-filled into sets.
export interface EquipWeight { id: string; name: string; kg: number }

// Which settings weight auto-fills which exercise (only weighted free-weight moves).
const EQUIP_TAG: Record<string, string> = {
    squat: 'מוט', deadlift: 'מוט', rdl: 'מוט', bench: 'מוט', incline: 'מוט', ohp: 'מוט', row: 'מוט', hipthrust: 'מוט',
    goblet: 'דמבלים', dbrow: 'דמבלים', dbohp: 'דמבלים', skull: 'דמבלים', lateral: 'דמבלים', curl: 'דמבלים', hammer: 'דמבלים', lunge: 'דמבלים', bulgarian: 'דמבלים',
    rdl1: 'דמבלים', dbfly: 'דמבלים', floorpress: 'דמבלים', arnold: 'דמבלים', frontraise: 'דמבלים', shrug: 'דמבלים', overheadtri: 'דמבלים',
    goodmorning: 'מוט',
};
export function equipTagOf(exId: string): string | undefined {
    return EQUIP_TAG[exId];
}

export interface WeightEntry { date: string; kg: number }
export interface FoodEntry { id: string; name: string; kcal: number; protein?: number; carbs?: number; fat?: number; slot?: string }

// Fixed rest-timer preference: when on, every rest between sets uses `sec` instead of the plan's per-exercise rest.
export interface RestTimer { on: boolean; sec: number }
export interface ProgressEntry { kg: number; updatedAt: string; easyBump?: boolean }

export const GOAL_LABEL: Record<Goal, string> = {
    muscle: 'בניית שריר',
    fatloss: 'ירידה בשומן',
    fitness: 'כושר כללי',
    strength: 'כוח',
};

export const LEVEL_LABEL: Record<Level, string> = { beginner: 'מתחיל', some: 'קצת ניסיון', regular: 'מתאמן קבוע' };

// Maximum skill difficulty per experience level. Beginners never get pull-ups, dips, deadlifts or barbell squats.
const LEVEL_MAX_DIFF: Record<Level, number> = { beginner: 3, some: 4, regular: 5 };

export const EXERCISES: Exercise[] = [
    // Legs
    { id: 'squat', he: 'סקוואט', en: 'Squat', muscle: 'רגליים', group: 'squat', diff: 4, equip: 'gym', compound: true, cues: ['כפות הרגליים ברוחב כתפיים, עקבים על הרצפה כל התנועה', 'יורדים עד שהירך מקבילה לרצפה לפחות', 'הברכיים עוקבות אחרי קו האצבעות, לא קורסות פנימה', 'הגב נשאר ניטרלי והבטן אסופה'] },
    { id: 'goblet', he: 'גובלט סקוואט', en: 'Goblet squat', muscle: 'רגליים', group: 'squat', diff: 3, equip: 'both', compound: true, cues: ['מחזיקים משקולת צמוד לחזה, מרפקים מצביעים מטה', 'יושבים "אחורה" כאילו לכיסא', 'עולים על ידי דחיפת הרצפה בעקבים'] },
    { id: 'bwsquat', he: 'סקוואט משקל גוף', en: 'Bodyweight squat', muscle: 'רגליים', group: 'squat', diff: 1, equip: 'home', compound: true, cues: ['ידיים מלאכות קדימה לאיזון', 'יורדים לאט ובשליטה, עולים בקצב רגיל', 'כל כף הרגל נשארת על הרצפה'] },
    { id: 'deadlift', he: 'דדליפט', en: 'Deadlift', muscle: 'גב ורגליים', group: 'hinge', diff: 4, equip: 'gym', compound: true, cues: ['המוט נשאר צמוד לשוקיים לאורך כל הדרך', 'דוחפים את הרצפה עם הרגליים, לא מושכים בגב', 'הגב שטוח לחלוטין - אם הוא מתעגל, המשקל כבד מדי'] },
    { id: 'rdl', he: 'דדליפט רומני', en: 'Romanian deadlift', muscle: 'רגל אחורית', group: 'hinge', diff: 3, equip: 'gym', compound: true, cues: ['ברכיים כמעט ישרות, הירך הולך אחורה', 'יורדים עד מתיחה חזקה בשריר האחורי, לא יותר', 'המשקל צמוד לרגליים, הגב שטוח'] },
    { id: 'legpress', he: 'לחיצת רגליים', en: 'Leg press', muscle: 'רגליים', group: 'squat', diff: 2, equip: 'gym', compound: true, cues: ['יורדים עד 90 מעלות בברך בערך, הגב לא מתרומם מהמושב', 'דוחפים דרך כל כף הרגל, לא רק הבוהן', 'לא נועלים את הברכיים בנעילה מלאה למעלה'] },
    { id: 'lunge', he: 'לאנג׳ים', en: 'Lunges', muscle: 'רגליים', group: 'lunge', diff: 2, equip: 'both', compound: true, cues: ['צעד ארוך מספיק שהברך הקדמית לא עוברת את קו האצבעות', 'הגו זקוף, הברך האחורית יורדת לכיוון הרצפה', 'דוחפים חזרה עם העקב הקדמי'] },
    { id: 'bulgarian', he: 'סקוואט בולגרי', en: 'Bulgarian split squat', muscle: 'רגליים', group: 'lunge', diff: 4, equip: 'both', compound: false, cues: ['הרגל האחורית על ספסל, רוב המשקל על הרגל הקדמית', 'יורדים לאט עד שהברך האחורית קרובה לרצפה', 'הגו זקוף, בלי להישען קדימה'] },
    { id: 'legcurl', he: 'כפיפת רגליים', en: 'Leg curl', muscle: 'רגל אחורית', group: 'hams', diff: 1, equip: 'gym', compound: false, cues: ['מכווצים למעלה בשנייה אחת, מורידים ב-2-3 שניות', 'הירכיים צמודות למושב כל התנועה'] },
    { id: 'legext', he: 'פשיטת רגליים', en: 'Leg extension', muscle: 'רגל קדמית', group: 'quads', diff: 1, equip: 'gym', compound: false, cues: ['עוצרים שנייה בכיווץ למעלה', 'מורידים בשליטה מלאה, בלי להפיל את המשקל'] },
    { id: 'hipthrust', he: 'היפ תראסט', en: 'Hip thrust', muscle: 'ישבן', group: 'hinge', diff: 2, equip: 'gym', compound: true, cues: ['השכמות נשענות על הספסל, הסנטר צמוד לחזה', 'למעלה: קו ישר מכתפיים לברכיים, כיווץ ישבן חזק', 'הדחיפה מהעקבים, לא מקשתים את הגב התחתון'] },
    { id: 'glutebridge', he: 'גשר ירך', en: 'Glute bridge', muscle: 'ישבן', group: 'hinge', diff: 1, equip: 'home', compound: true, cues: ['דוחפים את האגן למעלה מהעקבים', 'למעלה מכווצים את הישבן שנייה מלאה', 'הצלעות לא בולטות - הבטן אסופה'] },
    { id: 'calf', he: 'הרמת עקבים', en: 'Calf raise', muscle: 'שוקיים', group: 'calves', diff: 1, equip: 'both', compound: false, cues: ['עולים על הבוהן עד הסוף ועוצרים שנייה', 'יורדים לאט עד מתיחה מלאה בשוק'] },
    // Chest
    { id: 'bench', he: 'לחיצת ספסל', en: 'Bench press', muscle: 'חזה', group: 'hpush', diff: 3, equip: 'gym', compound: true, cues: ['שכמות מכווצות וצמודות לספסל, קשת קטנה בגב', 'המוט נוגע בחזה בגובה הפטמות בערך', 'כפות הרגליים נעוצות ברצפה, דוחפים דרך הרגליים'] },
    { id: 'incline', he: 'לחיצת חזה עליון', en: 'Incline press', muscle: 'חזה עליון', group: 'hpush', diff: 3, equip: 'gym', compound: true, cues: ['ספסל ב-30-45 מעלות, לא יותר תלול', 'אותו כלל של לחיצת ספסל: שכמות אחורה, מרפקים ב-45 מעלות מהגו'] },
    { id: 'pushup', he: 'שכיבות סמיכה', en: 'Push-up', muscle: 'חזה', group: 'hpush', diff: 2, equip: 'home', compound: true, cues: ['הגו בקו ישר אחד מהראש לעקבים, בלי צלעות פתוחות', 'מרפקים בזווית של כ-45 מעלות מהגו, לא פרושות לצדדים', 'יורדים עד שהחזה כמעט נוגע ברצפה'] },
    { id: 'pushupdecline', he: 'שכיבות סמיכה ברגל מורמת', en: 'Decline push-up', muscle: 'חזה עליון', group: 'hpush', diff: 3, equip: 'home', compound: true, cues: ['כפות הרגליים על ספסל או ספה, הגו בקו ישר', 'אותם כללים כמו שכיבות סמיכה רגילה'] },
    { id: 'fly', he: 'פליי בכבלים', en: 'Cable fly', muscle: 'חזה', group: 'fly', diff: 2, equip: 'gym', compound: false, cues: ['מרפקים מעט כפופים וקבועים לאורך התנועה', 'מקרבים את הידיים כמו חיבוק גדול, מכווצים את החזה', 'חוזרים לאט עד מתיחה נעימה בחזה'] },
    { id: 'dips', he: 'מקבילים', en: 'Dips', muscle: 'חזה וטריצפס', group: 'dips', diff: 4, equip: 'both', compound: true, cues: ['שיפוע קל קדימה מדגיש חזה, גו זקוף מדגיש טריצפס', 'יורדים עד 90 מעלות במרפק בערך, לא עמוק מדי', 'בלי להתנדנד או לקפוץ מהתחתית'] },
    { id: 'chairdips', he: 'טריצפס על כיסא', en: 'Chair dips', muscle: 'טריצפס', group: 'dips', diff: 2, equip: 'home', compound: false, cues: ['הידיים על הכיסא מאחורי הגו, הגב קרוב לכיסא', 'יורדים עד 90 מעלות בערך במרפקים', 'ככל שהרגליים רחוקות יותר, זה קשה יותר'] },
    // Back
    { id: 'pullup', he: 'מתח', en: 'Pull-up', muscle: 'גב', group: 'vpull', diff: 4, equip: 'both', compound: true, cues: ['מתחילים מתלייה מלאה, מושכים את הסנטר מעל המתקן', 'מדמיינים שהמרפקים יורדים לכיסים, לא מושכים עם הידיים', 'יורדים לאט ובשליטה מלאה, בלי נדנוד'] },
    { id: 'pulldown', he: 'משיכת פולי עליון', en: 'Lat pulldown', muscle: 'גב', group: 'vpull', diff: 2, equip: 'gym', compound: true, cues: ['אחיזה רחבה מעט מרוחב הכתפיים', 'מושכים את המוט לחזה העליון, מרפקים מטה ואחורה', 'מניחים לגב לעבוד - לא מושכים עם הביספס'] },
    { id: 'row', he: 'חתירה במוט', en: 'Barbell row', muscle: 'גב', group: 'hpull', diff: 3, equip: 'gym', compound: true, cues: ['גב שטוח בזווית 45 מעלות בערך, בטן אסופה', 'מושכים את המוט לבטן התחתונה, מרפקים צמודים לגו', 'מכווצים את השכמות בנקודת הסיום'] },
    { id: 'cablerow', he: 'חתירה בכבל', en: 'Cable row', muscle: 'גב', group: 'hpull', diff: 2, equip: 'gym', compound: true, cues: ['גו זקוף, בלי להיטות קדימה ואחורה', 'מושכים לבטן ומכווצים שכמות שנייה', 'מחזירים לאט בלי לתת למשקל למשוך אותך'] },
    { id: 'dbrow', he: 'חתירה בדמבל', en: 'Dumbbell row', muscle: 'גב', group: 'hpull', diff: 2, equip: 'both', compound: true, cues: ['יד וברך על הספסל, הגב מקביל לרצפה', 'מושכים את הדמבל לירך, לא לחזה', 'המרפק עובר את קו הגב, כיווץ שכמה בסוף'] },
    { id: 'superman', he: 'סופרמן', en: 'Superman', muscle: 'גב תחתון', group: 'lowerback', diff: 1, equip: 'home', compound: false, cues: ['שוכבים על הבטן, מרימים ידיים ורגליים ביחד', 'מחזיקים 2 שניות למעלה, מורידים לאט', 'המבט על הרצפה, הצוואר ניטרלי'] },
    { id: 'facepull', he: 'פייס פול', en: 'Face pull', muscle: 'כתף אחורית', group: 'hpull', diff: 2, equip: 'gym', compound: false, cues: ['מושכים את החבל לכיוון המצח, מרפקים גבוהים', 'בסוף התנועה הידיים כמו "דאבל ביספס"', 'משקל קל - זה תרגיל דיוק, לא כוח'] },
    // Shoulders
    { id: 'ohp', he: 'לחיצת כתפיים בעמידה', en: 'Overhead press', muscle: 'כתפיים', group: 'vpush', diff: 3, equip: 'gym', compound: true, cues: ['בטן וישבן אסופים, בלי קשת בגב התחתון', 'המוט נע בקו ישר, הראש זז מעט אחורה וחוזר', 'נועלים מעלה עם הכתפיים מתחת לאוזניים'] },
    { id: 'dbohp', he: 'לחיצת כתפיים בדמבלים', en: 'Dumbbell shoulder press', muscle: 'כתפיים', group: 'vpush', diff: 3, equip: 'both', compound: true, cues: ['מרפקים מעט קדימה, לא פרושים לגמרי לצדדים', 'דוחפים עד כמעט נעילה, בלי להקיש את הדמבלים', 'הגב התחתון לא מתקשת - אסוק בטן'] },
    { id: 'lateral', he: 'הרחקת כתפיים', en: 'Lateral raise', muscle: 'כתף אמצעית', group: 'raise', diff: 2, equip: 'both', compound: false, cues: ['מרימים עד גובה הכתף, לא מעל', 'מרפק מעט כפוף, "שופכים את הקנקן" בסוף התנועה', 'מורידים לאט פי שניים מהעלייה'] },
    { id: 'pike', he: 'שכיבות סמיכה פייק', en: 'Pike push-up', muscle: 'כתפיים', group: 'vpush', diff: 3, equip: 'home', compound: true, cues: ['ישבן למעלה בצורת V הפוך, עקבים ברצפה', 'יורדים עם הראש לכיוון הרצפה בין הידיים', 'דוחפים חזרה בקו אנכי'] },
    // Arms
    { id: 'curl', he: 'כפיפת מרפקים', en: 'Biceps curl', muscle: 'ביספס', group: 'biceps', diff: 1, equip: 'both', compound: false, cues: ['המרפקים צמודים לצלעות ולא זזים', 'מכווצים למעלה, מורידים בשליטה 2-3 שניות', 'בלי להטות את הגב או "לזרוק" את המשקל'] },
    { id: 'hammer', he: 'כפיפת פטיש', en: 'Hammer curl', muscle: 'ביספס', group: 'biceps', diff: 1, equip: 'both', compound: false, cues: ['אחיזה ניטרלית כמו פטיש, אגרופים אחד מול השני', 'אותם כללים כמו כפיפת מרפקים: מרפק קבוע, ירידה איטית'] },
    { id: 'pushdown', he: 'פשיטת מרפקים בכבל', en: 'Rope pushdown', muscle: 'טריספס', group: 'triceps', diff: 1, equip: 'gym', compound: false, cues: ['מרפקים נעולים לצדדי הגו, רק האמות זזות', 'פושטים עד נעילה מלאה ומכווצים שנייה', 'לא נשענים על הכבל במשקל הגוף'] },
    { id: 'skull', he: 'פשיטת מרפקים בשכיבה', en: 'Skull crusher', muscle: 'טריספס', group: 'triceps', diff: 2, equip: 'both', compound: false, cues: ['המרפקים מצביעים לתקרה ולא נפרשים', 'מורידים את המשקל לכיוון המצח בכיפוף מרפק בלבד', 'משקל מתון ותנועה איטית - זה לא תרגיל כוח'] },
    // Core
    { id: 'plank', he: 'פלאנק', en: 'Plank', muscle: 'בטן', group: 'core', diff: 1, equip: 'home', compound: false, cues: ['קו ישר מראש לעקבים, אגן לא שקוע ולא מורם', 'נושמים רגיל, לא עוצרים אוויר', 'אם הגב התחתון כואב - מסיימים את הסט'] },
    { id: 'sideplank', he: 'פלאנק צד', en: 'Side plank', muscle: 'בטן', group: 'core', diff: 2, equip: 'home', compound: false, cues: ['מרפק מתחת לכתף בדיוק, הגו בקו ישר', 'הירך מורמת ולא נופלת קדימה'] },
    { id: 'legraise', he: 'הרמות רגליים', en: 'Leg raise', muscle: 'בטן תחתונה', group: 'core', diff: 2, equip: 'both', compound: false, cues: ['הגב התחתון הדבוק לרצפה כל התנועה', 'מורידים את הרגליים לאט, בלי לגעת ברצפה', 'אם הגב מתרומם - כופפים ברכיים'] },
    { id: 'crunch', he: 'כפיפות בטן', en: 'Crunch', muscle: 'בטן', group: 'core', diff: 1, equip: 'home', compound: false, cues: ['מרימים רק את השכמות מהרצפה, לא את כל הגב', 'הסנטר לא צמוד לחזה, המבט לתקרה', 'נושפים בעלייה, שואפים בירידה'] },
    { id: 'cablecrunch', he: 'כפיפת בטן בכבל', en: 'Cable crunch', muscle: 'בטן', group: 'core', diff: 2, equip: 'gym', compound: false, cues: ['הירך נשארת קבועה, רק עמוד השדרה מתכופף', 'מקרבים את הצלעות לאגן, לא את הראש לברכיים'] },
    // Conditioning
    { id: 'burpee', he: 'בורפי', en: 'Burpee', muscle: 'כל הגוף', group: 'cond', diff: 3, equip: 'home', compound: true, cues: ['נוחתים רך על הברכיים בקפיצה', 'בשכיבת הסמיכה הגו נשאר בקו ישר', 'קצב קבוע שאפשר לשמור לאורך כל הסט'] },
    { id: 'climbers', he: 'טיפוס הרים', en: 'Mountain climbers', muscle: 'כל הגוף', group: 'cond', diff: 2, equip: 'home', compound: true, cues: ['הידיים מתחת לכתפיים, הגו בקו פלאנק', 'הברכיים מתקרבות לחזה לסירוגין בקצב', 'הישבן לא מתרומם למעלה'] },
    { id: 'jacks', he: 'ג׳מפינג ג׳קס', en: 'Jumping jacks', muscle: 'כל הגוף', group: 'cond', diff: 1, equip: 'home', compound: true, cues: ['נחיתה רכה על כריות כפות הרגליים', 'ברכיים מעט כפופות בכל נחיתה'] },
    // --- Round 3 expansion: more variety per muscle group, home-friendly ---
    // Legs
    { id: 'sumosquat', he: 'סקוואט סומו', en: 'Sumo squat', muscle: 'רגליים', group: 'squat', diff: 2, equip: 'both', compound: true, cues: ['עמידה רחבה משמעותית מרוחב הכתפיים, אצבעות מופנות אלכסונית החוצה', 'יורדים עד שהירכיים מקבילות לרצפה בערך', 'הברכיים עוקבות אחרי קו האצבעות, הגו זקוף'] },
    { id: 'wallsit', he: 'ישיבת קיר', en: 'Wall sit', muscle: 'רגל קדמית', group: 'quads', diff: 1, equip: 'home', compound: false, cues: ['הגב צמוד לקיר, יורדים עד 90 מעלות בברכיים בערך', 'הברכיים מעל הקרסוליים, לא מעבר לאצבעות', 'נושמים רגיל ומחזיקים'] },
    { id: 'sidelunge', he: 'לאנג׳ צד', en: 'Side lunge', muscle: 'רגליים', group: 'lunge', diff: 2, equip: 'home', compound: true, cues: ['צעד רחב לצד, הישבן הולך אחורה כמו בישיבה', 'הרגל הישרה נשארת עם כף הרגל על הרצפה', 'דוחפים חזרה למרכז עם הרגל הפועלת'] },
    { id: 'stepup', he: 'עלייה על מדרגה', en: 'Step-up', muscle: 'רגליים', group: 'lunge', diff: 2, equip: 'both', compound: true, cues: ['כל כף הרגל על המדרגה או הספסל, לא רק הבוהן', 'עולים בדחיפה של הרגל העליונה, בלי דחיפה מהרגל התחתונה', 'יורדים לאט ובשליטה'] },
    { id: 'rdl1', he: 'דדליפט רומני רגל אחת', en: 'Single-leg Romanian deadlift', muscle: 'רגל אחורית', group: 'hinge', diff: 4, equip: 'both', compound: false, cues: ['עומדים על רגל אחת, השנייה מתרוממת אחורה בקו עם הגב', 'יורדים עד מתיחה בשריר האחורי, האגן נשאר מכוון לרצפה', 'אפשר להחזיק דמבל או להישען ביד על קיר לאיזון'] },
    { id: 'jumpsquat', he: 'סקוואט קפיצה', en: 'Jump squat', muscle: 'רגליים', group: 'squat', diff: 3, equip: 'home', compound: true, cues: ['סקוואט רגיל ובעלייה קופצים בפיצוץ מבוקר', 'נוחתים רך על כריות כפות הרגליים עם ברכיים כפופות', 'אם הנחיתה רועשת - לחזור לסקוואט רגיל'] },
    { id: 'kickback', he: 'בעיטת חמור', en: 'Glute kickback', muscle: 'ישבן', group: 'glutes', diff: 1, equip: 'home', compound: false, cues: ['עומדים על שש, הגב ניטרלי והבטן אסופה', 'מרימים רגל כפופה אחורה ומעלה כמו בעיטה, בלי לקשת את הגב', 'עוצרים שנייה בכיווץ הישבן למעלה'] },
    // Chest
    { id: 'pushupincline', he: 'שכיבות סמיכה בידיים מורמות', en: 'Incline push-up', muscle: 'חזה', group: 'hpush', diff: 1, equip: 'home', compound: true, cues: ['הידיים על ספסל, ספה או קיר, הגו בקו ישר אחד', 'ככל שהידיים גבוהות יותר - קל יותר', 'מרפקים ב-45 מעלות מהגו, יורדים עד שהחזה כמעט נוגע'] },
    { id: 'dbfly', he: 'פליי בדמבלים', en: 'Dumbbell fly', muscle: 'חזה', group: 'fly', diff: 2, equip: 'both', compound: false, cues: ['שוכבים על ספסל או רצפה, דמבלים מעל החזה', 'מרפקים מעט כפופים וקבועים, פותחים בקשת רחבה כמו חיבוק', 'מורידים עד מתיחה נעימה בחזה ומכווצים בחזרה'] },
    { id: 'floorpress', he: 'לחיצת רצפה בדמבלים', en: 'Dumbbell floor press', muscle: 'חזה', group: 'hpush', diff: 2, equip: 'both', compound: true, cues: ['שוכבים על הרצפה, ברכיים כפופות, דמבלים מעל החזה', 'המרפקים נוגעים ברצפה ברגע ומיד דוחפים חזרה', 'הטווח קצר יותר - עדין יותר על הכתפיים'] },
    // Back
    { id: 'bandrow', he: 'חתירה בגומייה', en: 'Resistance band row', muscle: 'גב', group: 'hpull', diff: 1, equip: 'home', compound: true, cues: ['יושבים עם רגליים ישרות, הגומייה סביב כפות הרגליים', 'גב זקוף, מושכים את הידיות לבטן ומכווצים שכמות', 'מחזירים לאט בלי שהגו נמשך קדימה'] },
    { id: 'pullapart', he: 'מתיחת גומייה לצדדים', en: 'Band pull-apart', muscle: 'גב עליון וכתף אחורית', group: 'hpull', diff: 1, equip: 'home', compound: false, cues: ['מחזיקים את הגומייה בידיים ישרות בגובה החזה', 'מותחים לצדדים עד שהגומייה נוגעת בחזה, שכמות מכווצות', 'חוזרים לאט ובשליטה, בלי לתת לגומייה לקפוץ'] },
    { id: 'deadhang', he: 'תלייה פסיבית', en: 'Dead hang', muscle: 'גב', group: 'vpull', diff: 2, equip: 'both', compound: false, cues: ['אחיזה מלאה במתקן, כתפיים פעילות מעט (לא שקועות לגמרי)', 'הגו תלוי רגוע, בלי נדנוד', 'נושמים רגיל ומחזיקים עד שהאחיזה נחלשת'] },
    { id: 'goodmorning', he: 'גוד מורנינג', en: 'Good morning', muscle: 'רגל אחורית', group: 'hinge', diff: 3, equip: 'gym', compound: true, cues: ['המוט על הטרפזים, לא על הצוואר', 'דוחפים את הישבן אחורה עם ברכיים כמעט ישרות, הגב שטוח', 'יורדים עד שהגב כמעט מקביל לרצפה ועולים בכוח הירך האחורית'] },
    { id: 'backext', he: 'פשיטת גב על ספסל', en: 'Back extension', muscle: 'גב תחתון', group: 'lowerback', diff: 2, equip: 'gym', compound: false, cues: ['האגן על הכרית, הרגליים נעוצות', 'יורדים עם גב מעוגל קל ועולים לקו ישר בלבד - לא מעבר', 'התנועה מהירך, לא מהמותניים'] },
    // Shoulders
    { id: 'arnold', he: 'ארנולד פרס', en: 'Arnold press', muscle: 'כתפיים', group: 'vpush', diff: 3, equip: 'both', compound: true, cues: ['מתחילים עם דמבלים מול החזה, כפות הידיים פונות אליך', 'בדחיפה מסובבים את הידיים החוצה עד שהאגרופים פונים קדימה', 'יורדים באותה דרך בדיוק, בלי קשת בגב'] },
    { id: 'frontraise', he: 'הרמת כתפיים קדימה', en: 'Front raise', muscle: 'כתף קדמית', group: 'raise', diff: 1, equip: 'both', compound: false, cues: ['מרימים דמבל אחד או שני דמבלים לסירוגין עד גובה הכתף', 'בלי נדנוד של הגו - המשקל עולה רק מהכתף', 'מורידים לאט פי שניים מהעלייה'] },
    { id: 'bandfacepull', he: 'פייס פול בגומייה', en: 'Band face pull', muscle: 'כתף אחורית', group: 'hpull', diff: 1, equip: 'home', compound: false, cues: ['הגומייה עגונה בגובה פנים, מושכים אל המצח', 'המרפקים גבוהים ופונים החוצה, כמו מחיאת כף אחורית', 'משקל התנגדות קל - תרגיל דיוק לכתף האחורית'] },
    { id: 'shrug', he: 'כיווץ טרפזים', en: 'Dumbbell shrug', muscle: 'טרפזים', group: 'raise', diff: 1, equip: 'both', compound: false, cues: ['דמבלים לצדי הגו, מרימים את הכתפיים לאוזניים', 'עוצרים שנייה למעלה בכיווץ מלא', 'בלי סיבובי כתפיים - רק למעלה ולמטה'] },
    // Arms
    { id: 'overheadtri', he: 'פשיטת מרפקים מעל הראש בדמבל', en: 'Overhead dumbbell extension', muscle: 'טריצפס', group: 'triceps', diff: 2, equip: 'both', compound: false, cues: ['מחזיקים דמבל אחד בשתי ידיים מעל הראש', 'המרפקים צמודים לראש ומצביעים קדימה, רק האמות זזות', 'מורידים מאחורי הראש עד מתיחה ומפשיטים לנעילה'] },
    { id: 'diamond', he: 'שכיבות סמיכה יהלום', en: 'Diamond push-up', muscle: 'טריצפס', group: 'triceps', diff: 3, equip: 'home', compound: true, cues: ['הידיים מתחת לחזה בצורת יהלום עם האגודלים והאצבעות', 'המרפקים דבוקים לצלעות בירידה', 'הגו בקו ישר - אם קשה מדי, מהברכיים'] },
    { id: 'bandcurl', he: 'כפיפת מרפקים בגומייה', en: 'Band biceps curl', muscle: 'ביספס', group: 'biceps', diff: 1, equip: 'home', compound: false, cues: ['עומדים על הגומייה, ידיות בידיים לצדי הגו', 'מכווצים למעלה עם מרפקים צמודים לצלעות', 'מורידים בשליטה נגד המתיחה של הגומייה'] },
    // Core
    { id: 'russiantwist', he: 'טוויסט רוסי', en: 'Russian twist', muscle: 'בטן', group: 'core', diff: 2, equip: 'home', compound: false, cues: ['יושבים עם גב ב-45 מעלות ורגליים מורמות קלות', 'מסובבים את כל פלג הגוף העליון מצד לצד, לא רק את הידיים', 'הבטן אסופה כל הזמן; להקשחה אפשר עם דמבל או בקבוק'] },
    { id: 'bicycle', he: 'כפיפות בטן אופניים', en: 'Bicycle crunch', muscle: 'בטן', group: 'core', diff: 2, equip: 'home', compound: false, cues: ['מרפק לברך נגדית לסירוגין, הרגל השנייה ישרה באוויר', 'הגב התחתון דבוק לרצפה', 'איטי ומבוקר - לא מרוץ של מרפקים'] },
    { id: 'vup', he: 'וי-אפ', en: 'V-up', muscle: 'בטן', group: 'core', diff: 3, equip: 'home', compound: false, cues: ['שוכבים שטוחים עם ידיים מעל הראש', 'עולים בבת אחת: ידיים ורגליים נפגשים מעל האגן בצורת V', 'יורדים לאט ובשליטה בלי לפגוע בגב התחתון'] },
    // Conditioning
    { id: 'highknees', he: 'ברכיים גבוהות', en: 'High knees', muscle: 'כל הגוף', group: 'cond', diff: 1, equip: 'home', compound: true, cues: ['ריצה במקום עם ברכיים שמגיעות לגובה האגן', 'נחיתה על כריות כפות הרגליים, קצב מהיר ואחיד', 'הגו זקוף, הידיים עובדות כמו בריצה'] },
];


// What correct execution should feel like, per exercise.
export const FEEL: Record<string, string> = {
    squat: "רוב העבודה בירך הקדמית ובישבן; העקבים דוחקים את הרצפה והחזה זקוף. אם הברכיים כואבות - המשקל כבד מדי או שהברכיים קורסות פנימה.",
    goblet: "עבודה בירכיים הקדמיות ובישבן, והבטן מתאמצת לשמור על הגו זקוף מול המשקל.",
    bwsquat: "שריפה נעימה בירכיים לקראת סוף הסט, בלי שום כאב בברכיים.",
    deadlift: "העומס מורגש בגב הירך ובישבן, לא בגב התחתון; הגב רק מחזיק, הרגליים דוחפות את הרצפה.",
    rdl: "מתיחה חזקה בגב הירך בירידה, כיווץ בישבן בעלייה. הגב התחתון לא אמור לשרוף.",
    legpress: "הירך הקדמית עובדת קשה, הגב התחתון רגוע וצמוד למושב.",
    lunge: "הרגל הקדמית עושה את רוב העבודה - ירך קדמית וישבן; מאתגר שיווי משקל קל.",
    bulgarian: "שריפה חזקה בירך הקדמית של רגל העבודה; הרגל האחורית רק נשענת.",
    legcurl: "כיווץ ממוקד בגב הירך, בלי שהירכיים מתרוממות מהמושב.",
    legext: "שריפה בקדמת הירך בנקודה הגבוהה, שליטה מלאה בירידה.",
    hipthrust: "כיווץ חזק בישבן בנקודה הגבוהה; אם מרגישים בגב התחתון - סנטר צמוד וטווח קטן יותר.",
    glutebridge: "הישבן מוביל את התנועה, הגב נשאר ניטרלי, הדחיפה מהעקבים.",
    calf: "שריפה בשוקיים ועצירה של רגע בפסגת התנועה.",
    bench: "החזה עושה את הדחיפה, הכתפיים שקטות ומכווצות אחורה, כפות הרגליים נעוצות ברצפה.",
    incline: "אותה דחיפה של לחיצת ספסל, עם דגש על החזה העליון מתחת לעצם הבריח.",
    pushup: "החזה והטריצפס עובדים, הגו נשאר קשיח כמו קרש; אם הישבן שוקע - לרדת לברכיים.",
    pushupdecline: "כמו שכיבת סמיכה רגילה, עם עומס גדול יותר על החזה העליון והכתפיים.",
    fly: "מתיחה נעימה בחזה בפתיחה, כיווץ חזק בחיבוק; המרפקים כמעט לא זזים.",
    dips: "החזה התחתון והטריצפס לוקחים את העומס; כאב חד בכתף = לעצור מיד.",
    chairdips: "רוב העבודה בטריצפס; הכתפיים נשארות רחוקות מהאוזניים.",
    pullup: "הגב הרחב מושך (מתחת לבתי השחי), לא הידיים; אם רק הביספס שורף - לחשוב על מרפקים שיורדים לכיסים.",
    pulldown: "אותה תחושת גב רחב כמו מתח; החזה מתרומם לקראת המוט.",
    row: "כיווץ בין השכמות בכל חזרה; הגב מרגיש את העבודה, לא הזרועות.",
    cablerow: "שכמות מכווצות שנייה בכל חזרה, הגו זקוף ושקט בלי נדנוד.",
    dbrow: "משיכה לכיוון הירך עם כיווץ בגב האמצעי; הצד שלא עובד יציב לגמרי.",
    superman: "כיווץ עדין בגב התחתון ובישבן, בלי מתיחה חדה בצוואר.",
    facepull: "עבודה בכתף האחורית ובין השכמות; משקל קל ותחושת פתיחה של הכתפיים.",
    ohp: "הכתפיים דוחפות, הגו יציב כמו עמוד; הגב התחתון לא אמור להתקשת.",
    dbohp: "כמו לחיצה במוט, עם דרישת יציבות גדולה יותר בכל יד בנפרד.",
    lateral: "שריפה בצד הכתף; אם הטרפז שורף יותר מהכתף - המשקל כבד מדי.",
    pike: "העומס מורגש על הכתפיים יותר מאשר על החזה; ככל שהישבן גבוה יותר, יותר כתפיים.",
    curl: "הביספס מתנפח ושורף לקראת הסוף; המרפק לא זז קדימה.",
    hammer: "כמו כפיפה רגילה, עם דגש נוסף על האמה והצד החיצוני של הזרוע.",
    pushdown: "אחורי הזרוע עושה את כל העבודה; המרפקים מודבקים לצלעות.",
    skull: "מתיחה בטריצפס בירידה, כיווץ חזק בפישוט; המרפקים מצביעים לתקרה.",
    plank: "הבטן כולה אסופה ונושמים דרכה; שריפה שקטה בבטן, לא בגב התחתון.",
    sideplank: "האלכסונים בצד התחתון מחזיקים את כל הגו בקו ישר אחד.",
    legraise: "הבטן התחתונה עובדת קשה שהגב לא יתרומם; אם הגב קופץ - לכופף ברכיים.",
    crunch: "כיווץ קצר וחד בבטן, כמו קיפול של הצלעות לכיוון האגן; הצוואר רגוע.",
    cablecrunch: "אותו קיפול של הבטן עם התנגדות חלקה; הירך לא זזה בכלל.",
    burpee: "דופק גבוה ונשימה כבדה, אבל תנועות נקיות וקצב אחיד לאורך הסט.",
    climbers: "הבטן שומרת על קו הגו בזמן שהרגליים רצות; הדופק עולה מהר.",
    jacks: "חימום כללי: דופק עולה בהדרגה, נחיתות שקטות ורכות.",
    sumosquat: "עבודה בירך הקדמית, בישבן ובירך הפנימית בגלל העמידה הרחבה; הברכיים נשארות בקו האצבעות.",
    wallsit: "שריפה הולכת וגוברת בקדמת הירך תוך כדי ההחזקה; הגב רגוע על הקיר והנשימה רגילה.",
    sidelunge: "מתיחה בירך הפנימית של הרגל הישרה, עבודה בירך ובישבן של הרגל הפועלת.",
    stepup: "הרגל העליונה עושה את כל העלייה - שריפה בירך הקדמית ובישבן שלה; הרגל התחתונה רק מתנועעת.",
    rdl1: "מתיחה חזקה בגב הירך של רגל העבודה ואתגר שיווי משקל; הרגל האחורית רק מרחפת.",
    jumpsquat: "אותה עבודת סקוואט עם פיצוץ; הדופק עולה מהר והנחיתה שקטה.",
    kickback: "כיווץ ממוקד בישבן בפסגת התנועה, בלי שהגב התחתון מתקשת.",
    pushupincline: "אותה עבודת חזה וטריצפס של שכיבת סמיכה, בעומס קל יותר; ככל שהידיים גבוהות יותר - קל יותר.",
    dbfly: "מתיחה עמוקה בחזה בפתיחה וכיווץ חזק בחיבוק; המרפקים נשארים באותה זווית.",
    floorpress: "החזה והטריצפס דוחפים, עם עצירה רכה של המרפקים על הרצפה; נעים לכתפיים.",
    bandrow: "כיווץ בין השכמות בכל חזרה; ההתנגדות גדלה ככל שהגומייה נמתחת.",
    pullapart: "עבודה בין השכמות ובכתף האחורית; תנועה קטנה ומדויקת בלי להתנדנד.",
    deadhang: "מתיחה נעימה בגב ובכתפיים, האחיזה נשחקת לאט; נשימה רגועה לאורך ההחזקה.",
    goodmorning: "מתיחה בגב הירך בירידה, כיווץ בישבן בעלייה; הגב נשאר שטוח לגמרי.",
    backext: "כיווץ בגב התחתון ובישבן בעלייה לקו ישר בלבד, בלי קשת יתר.",
    arnold: "הכתף עובדת בטווח גדול יותר מלחיצה רגילה; הסיבוב חלק ומבוקר.",
    frontraise: "שריפה בקדמת הכתף; אם הגב מתנדנד - המשקל כבד מדי.",
    bandfacepull: "כיווץ בכתף האחורית ובין השכמות; המרפקים נשארים גבוהים.",
    shrug: "כיווץ חזק בטרפזים בפסגה; תנועה אנכית בלבד בלי סיבוב.",
    overheadtri: "מתיחה בטריצפס בתחתית, כיווץ חזק בנעילה; המרפקים לא נפתחים לצדדים.",
    diamond: "רוב העומס עובר לאחורי הזרוע; החזה והכתפיים רק מייצבים.",
    bandcurl: "כמו כפיפה רגילה, עם התנגדות שגדלה בכיווץ; המרפקים צמודים לגו.",
    russiantwist: "האלכסונים מסובבים את הגו; אם הגב התחתון מתעגל - להוריד את הרגליים לרצפה.",
    bicycle: "כיווץ סיבובי בבטן בכל מגע מרפק-ברך, הגב התחתון דבוק לרצפה.",
    vup: "כיווץ חד של כל הבטן בנקודת המפגש; הירידה האיטית שורפת לא פחות.",
    highknees: "הדופק עולה מהר, הנחיתות קלות והברכיים ממשיכות לטפס.",
};

// Which schematic body areas a Hebrew muscle label lights up (front/back map).
export function muscleAreas(muscle: string): string[] {
    const areas: string[] = [];
    if (muscle.includes('כל הגוף')) return ['chest','shoulders','biceps','triceps','abs','back','glutes','quads','hamstrings','calves'];
    if (muscle.includes('חזה')) areas.push('chest');
    if (/כתפ|כתף/.test(muscle)) areas.push('shoulders');
    if (muscle.includes('טרפז')) areas.push('traps');
    if (/ביספס/.test(muscle)) areas.push('biceps');
    if (/טריצפס|טריספס/.test(muscle)) areas.push('triceps');
    if (muscle.includes('בטן')) areas.push('abs');
    if (muscle.includes('גב')) areas.push('back');
    if (muscle.includes('גב עליון')) areas.push('traps');
    if (muscle.includes('ישבן')) areas.push('glutes');
    if (/רגליים/.test(muscle)) areas.push('quads','hamstrings','calves');
    if (muscle.includes('רגל קדמית')) areas.push('quads');
    if (muscle.includes('רגל אחורית')) areas.push('hamstrings');
    if (muscle.includes('שוקיים')) areas.push('calves');
    return Array.from(new Set(areas));
}

export function feelOf(ex: Exercise): string {
    return ex.feel || FEEL[ex.id] || '';
}

export function exerciseById(id: string): Exercise | undefined {
    return EXERCISES.find((e) => e.id === id);
}

export function videoUrl(ex: { en: string }): string {
    return `https://www.youtube.com/results?search_query=${encodeURIComponent(ex.en + ' proper form tutorial')}`;
}

// Home exercises that need a specific piece of equipment from the onboarding list.
const HOME_EQUIP_NEED: Record<string, string> = {
    pullup: 'מתקן מתח',
    deadhang: 'מתקן מתח',
    goblet: 'דמבלים',
    dbrow: 'דמבלים',
    dbohp: 'דמבלים',
    skull: 'דמבלים',
    rdl1: 'דמבלים',
    dbfly: 'דמבלים',
    floorpress: 'דמבלים',
    arnold: 'דמבלים',
    frontraise: 'דמבלים',
    shrug: 'דמבלים',
    overheadtri: 'דמבלים',
    stepup: 'ספסל',
    bandrow: 'גומיות',
    pullapart: 'גומיות',
    bandfacepull: 'גומיות',
    bandcurl: 'גומיות',
};

function pick(ids: string[], place: Place, level: Level, equipment: string[] = []): string[] {
    const maxDiff = LEVEL_MAX_DIFF[level];
    return ids.filter((id) => {
        const ex = exerciseById(id);
        if (!ex) return false;
        if (ex.diff > maxDiff) return false;
        if (place === 'gym') return ex.equip !== 'home';
        if (place === 'home') {
            if (ex.equip === 'gym') return false;
            const need = HOME_EQUIP_NEED[id];
            if (need && !equipment.includes(need)) return false;
        }
        return true;
    });
}

function scheme(goal: Goal, level: Level, compound: boolean): { sets: number; reps: string; restSec: number } {
    let s: { sets: number; reps: string; restSec: number };
    switch (goal) {
        case 'strength': s = compound ? { sets: 4, reps: '4-6', restSec: 150 } : { sets: 3, reps: '6-8', restSec: 90 }; break;
        case 'fatloss': s = { sets: 3, reps: '12-15', restSec: 40 }; break;
        case 'muscle': s = compound ? { sets: 4, reps: '6-10', restSec: 90 } : { sets: 3, reps: '10-14', restSec: 60 }; break;
        default: s = { sets: 3, reps: '10-12', restSec: 60 };
    }
    // Beginners start with one less set on compounds to manage load and soreness.
    if (level === 'beginner' && s.sets > 2) s = { ...s, sets: s.sets - 1 };
    return s;
}

function mk(id: string, goal: Goal, level: Level): PlanExercise | null {
    const ex = exerciseById(id);
    if (!ex) return null;
    const s = scheme(goal, level, ex.compound);
    return { id: ex.id, he: ex.he, en: ex.en, sets: s.sets, reps: s.reps, restSec: s.restSec };
}

export function topOfRange(reps: string): number {
    const m = reps.match(/(\d+)\s*-\s*(\d+)/);
    if (m) return Number(m[2]);
    const n = Number(reps);
    return Number.isFinite(n) && n > 0 ? n : 12;
}

function day(label: string, focus: string, ids: string[], goal: Goal, level: Level): PlanDay {
    return { label, focus, exercises: ids.map((id) => mk(id, goal, level)).filter((e): e is PlanExercise => e !== null) };
}

export function generatePlan(p: Profile): Plan {
    const g = p.goal;
    const pl = p.place;
    const lv = p.level;
    const d = p.daysPerWeek;
    const P = (ids: string[]) => pick(ids, pl, lv, p.equipment || []);
    let days: PlanDay[] = [];
    let splitName = '';

    // New exercises are appended after the proven picks so existing priority stays stable;
    // they become swap/add variety and fallbacks when equipment or level filters earlier options out.
    const push = P(['bench', 'pushup', 'incline', 'ohp', 'dbohp', 'lateral', 'pushdown', 'fly', 'dips', 'pike', 'chairdips', 'pushupincline', 'floorpress', 'dbfly', 'arnold', 'frontraise', 'overheadtri', 'diamond', 'shrug']);
    const pull = P(['pullup', 'pulldown', 'row', 'cablerow', 'dbrow', 'facepull', 'curl', 'hammer', 'superman', 'bandrow', 'pullapart', 'deadhang', 'goodmorning', 'backext', 'bandfacepull', 'bandcurl']);
    const legs = P(['squat', 'goblet', 'bwsquat', 'legpress', 'rdl', 'lunge', 'bulgarian', 'hipthrust', 'glutebridge', 'legcurl', 'legext', 'calf', 'sumosquat', 'sidelunge', 'stepup', 'rdl1', 'jumpsquat', 'kickback', 'wallsit']);
    const core = P(['plank', 'legraise', 'cablecrunch', 'crunch', 'sideplank', 'russiantwist', 'bicycle', 'vup']);
    const cond = P(['burpee', 'climbers', 'jacks', 'highknees']);

    const take = (arr: string[], n: number, skip = 0) => arr.slice(skip, skip + n);
    const finishers = g === 'fatloss' ? take(cond, 2) : take(core, 2);

    if (d <= 2) {
        splitName = 'כל הגוף A/B';
        days = [
            day('אימון A', 'כל הגוף', [...take(legs, 1), ...take(push, 2), ...take(pull, 2), ...finishers], g, lv),
            day('אימון B', 'כל הגוף', [...take(legs, 1, 3), ...take(push, 2, 2), ...take(pull, 2, 2), ...take(core, 2, 2)], g, lv),
        ];
    } else if (d === 3) {
        splitName = 'דחיפה / משיכה / רגליים';
        days = [
            day('דחיפה', 'חזה, כתפיים וטריצפס', [...take(push, 4), ...take(push, 2, 6), ...take(finishers, 1)], g, lv),
            day('משיכה', 'גב וביספס', [...take(pull, 4), ...take(pull, 2, 4), ...take(finishers, 1, 1)], g, lv),
            day('רגליים', 'רגליים ובטן', [...take(legs, 4), ...take(legs, 1, 5), ...take(core, 2)], g, lv),
        ];
    } else if (d === 4) {
        splitName = 'פלג גוף עליון / תחתון';
        days = [
            day('עליון A', 'חזה, גב וכתפיים', [...take(push, 2), ...take(pull, 2), ...take(push, 1, 4), ...take(pull, 1, 5), ...take(core, 1)], g, lv),
            day('תחתון A', 'רגליים וישבן', [...take(legs, 3), ...take(legs, 2, 4), ...take(core, 1, 1)], g, lv),
            day('עליון B', 'כתפיים, גב וזרועות', [...take(push, 2, 2), ...take(pull, 2, 2), ...take(push, 2, 6), ...take(pull, 1, 4), ...take(core, 1, 2)], g, lv),
            day('תחתון B', 'רגליים ושוקיים', [...take(legs, 2, 2), ...take(legs, 2, 6), ...take(legs, 1, 9), ...take(core, 1, 3)], g, lv),
        ];
    } else {
        splitName = 'דחיפה / משיכה / רגליים +';
        days = [
            day('דחיפה A', 'חזה, כתפיים וטריצפס', [...take(push, 4), ...take(push, 2, 6)], g, lv),
            day('משיכה A', 'גב וביספס', [...take(pull, 4), ...take(pull, 2, 4)], g, lv),
            day('רגליים', 'רגליים ובטן', [...take(legs, 4), ...take(legs, 1, 5), ...take(core, 2)], g, lv),
            day('דחיפה B', 'חזה וכתפיים', [...take(push, 2, 2), ...take(push, 2, 4), ...take(push, 1, 7), ...take(finishers, 1)], g, lv),
            day('משיכה B', 'גב וזרועות', [...take(pull, 2, 2), ...take(pull, 2, 5), ...take(pull, 1, 6), ...take(finishers, 1, 1)], g, lv),
        ];
        if (d >= 6) days.push(day('כל הגוף', 'חיזוק וכושר', [...take(legs, 1, 1), ...take(push, 1, 1), ...take(pull, 1, 1), ...take(cond, 2)], g, lv));
    }

    days = days.filter((dd) => dd.exercises.length >= 3);
    if (days.length === 0) {
        days = [day('אימון כללי', 'כל הגוף', ['bwsquat', 'pushup', 'lunge', 'plank', 'climbers'], g, lv)];
        splitName = 'כל הגוף';
    }

    const levelNote = lv === 'beginner'
        ? 'שבועיים ראשונים: עצור 2-3 חזרות לפני הכשל ותן לטכניקה להוביל. כשאתה מגיע לקצה טווח החזרות בכל הסטים, העלה 2.5 ק"ג.'
        : lv === 'some'
            ? 'כשאתה מגיע לקצה טווח החזרות בכל הסטים, העלה 2.5 ק"ג באימון הבא.'
            : 'עומס פרוגרסיבי: תעד כל אימון וכוון לקצת יותר מהפעם הקודמת.';

    return {
        version: 2,
        generatedAt: new Date().toISOString(),
        splitName,
        summary: `${days.length} אימונים בשבוע · ${GOAL_LABEL[g]} · רמה: ${LEVEL_LABEL[lv]} · ${levelNote}`,
        days,
    };
}

// Progression: compare the last logged performance of an exercise to its target rep range.
export function nextWeightSuggestion(exId: string, planReps: string, logged: SetLog[]): number | null {
    const done = logged.filter((s) => s.done && s.reps > 0);
    if (done.length === 0) return null;
    const top = topOfRange(planReps);
    const allHitTop = done.every((s) => s.reps >= top);
    if (!allHitTop) return null;
    const maxKg = Math.max(...done.map((s) => s.kg));
    if (maxKg <= 0) return null; // bodyweight: progress via reps/difficulty, not weight
    return Math.round((maxKg + 2.5) * 2) / 2;
}

export function calorieTarget(p: Profile): number {
    if (p.kcalTarget && p.kcalTarget > 0) return p.kcalTarget;
    const bmr = p.gender === 'female'
        ? 10 * p.weightKg + 6.25 * p.heightCm - 5 * p.age - 161
        : 10 * p.weightKg + 6.25 * p.heightCm - 5 * p.age + 5;
    const act = p.dailyActivity === 'sitting' ? 1.35 : p.dailyActivity === 'active' ? 1.6 : 1.45;
    const tdee = bmr * act + (p.daysPerWeek - 3) * 60;
    if (p.goal === 'fatloss') return Math.max(1400, Math.round(tdee - 400));
    if (p.goal === 'muscle') return Math.round(tdee + 250);
    return Math.round(tdee);
}

export function waterTargetMl(p: Profile): number {
    return Math.round((p.weightKg * 35) / 50) * 50;
}

export function proteinTarget(p: Profile): number {
    if (p.proteinTarget && p.proteinTarget > 0) return p.proteinTarget;
    return Math.round(p.weightKg * (p.goal === 'fatloss' ? 2 : 1.8));
}

// ---- FitBuddy-style home helpers ----
export const WEEKDAY_HE = ['ראשון', 'שני', 'שלישי', 'רביעי', 'חמישי', 'שישי', 'שבת'];

// Which weekdays the plan days land on, by workouts-per-week.
export const DAY_SCHEDULE: Record<number, number[]> = {
    1: [0],
    2: [0, 3],
    3: [0, 2, 4],
    4: [0, 1, 4, 5],
    5: [0, 1, 2, 4, 5],
    6: [0, 1, 2, 3, 4, 5],
    7: [0, 1, 2, 3, 4, 5, 6],
};

export function dayWeekdays(plan: Plan): number[] {
    return DAY_SCHEDULE[Math.min(7, Math.max(1, plan.days.length))] || DAY_SCHEDULE[3];
}

export const SECTION_ORDER = ['חזה', 'גב', 'כתפיים', 'ידיים', 'רגליים', 'ישבן', 'בטן', 'כל הגוף'];

export function sectionOf(muscle: string): string {
    if (muscle.includes('חזה')) return 'חזה';
    if (muscle.includes('בטן')) return 'בטן';
    if (muscle.includes('כתפ') || muscle.includes('כתף') || muscle.includes('טרפז')) return 'כתפיים';
    if (muscle.includes('ביספס') || muscle.includes('טריספס') || muscle.includes('טריצפס')) return 'ידיים';
    if (muscle.includes('ישבן')) return 'ישבן';
    if (muscle.includes('רגל') || muscle.includes('שוק') || muscle.includes('ירך')) return 'רגליים';
    if (muscle.includes('גב')) return 'גב';
    return 'כל הגוף';
}

export function programName(p: Profile): string {
    const place = p.place === 'home' ? 'ביתית' : p.place === 'gym' ? 'בחדר כושר' : 'משולבת';
    const level = p.level === 'beginner' ? 'למתחילים' : p.level === 'some' ? 'לבעלי ניסיון' : 'למתאמנים קבועים';
    return `תוכנית אימון ${place} ${level}`;
}

export const PROGRAM_WEEKS = 8;

export function programWeek(p: Profile): number {
    const start = Date.parse(p.createdAt || '');
    if (!Number.isFinite(start)) return 1;
    const w = Math.floor((Date.now() - start) / (7 * 24 * 3600 * 1000)) + 1;
    return Math.min(PROGRAM_WEEKS, Math.max(1, w));
}

export function weekKey(d = new Date()): string {
    const s = new Date(d);
    s.setDate(s.getDate() - s.getDay());
    const y = s.getFullYear();
    const m = String(s.getMonth() + 1).padStart(2, '0');
    const day = String(s.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
}

// A bonus workout outside the plan (variety section): quick circuit from the library.
export function bonusDay(kind: 'home' | 'gym'): PlanDay {
    const home = ['bwsquat', 'pushup', 'lunge', 'climbers', 'crunch', 'plank'];
    const gym = ['legpress', 'incline', 'pulldown', 'dbohp', 'legcurl', 'cablecrunch'];
    const ids = kind === 'home' ? home : gym;
    return {
        label: kind === 'home' ? 'אתגר ביתי' : 'אתגר חדר כושר',
        focus: kind === 'home' ? 'כל הגוף, בלי ציוד' : 'כל הגוף, ציוד מלא',
        exercises: ids.map((id) => {
            const ex = exerciseById(id)!;
            return { id: ex.id, he: ex.he, en: ex.en, sets: 3, reps: '12-15', restSec: 40 };
        }),
    };
}
