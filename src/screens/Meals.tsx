// AI meal-ideas flow: quiz, loading, results, detail, favorites.
// Tailwind + ds + motion; logic and store keys unchanged.
import React, { useState } from 'react';
import { motion, AnimatePresence } from '../vendor/framer-motion.vendor.mjs';
import { Profile, FoodEntry, WorkoutLog, calorieTarget, proteinTarget } from '../data';
import { useStore, todayKey, uid, capDayMap } from '../store';
import { CoachSettings, DEFAULT_SETTINGS, GEMINI_MODEL } from '../coach';
import { MealSuggestion, MealAnswers, suggestMeals } from '../meals';
import { mealImage } from '../mealImages';
import { Icon } from '../ui';
import { IconButton, Button, Card, Chip, TextInput, spring, springSoft, easeOut } from '../ds';

const TASTES = ['חריף', 'מתוק', 'מנחם', 'קליל וטרי', 'חלבוני', 'בשרי'];

const PREP_OPTIONS: [string, string][] = [['10', 'עד 10 דק׳'], ['20', 'עד 20 דק׳'], ['40', 'עד 40 דק׳'], ['any', 'לא משנה']];
const SIZE_OPTIONS: [string, string][] = [['קל', 'משהו קל'], ['משביע', 'משביע'], ['גדול', 'ארוחה גדולה']];
const FOCUS_OPTIONS: [string, string][] = [['חלבון', 'עשיר בחלבון'], ['דל קלוריות', 'דל קלוריות'], ['מאוזן', 'מאוזן']];

function Star({ on, onToggle, floating = true }: { on: boolean; onToggle: () => void; floating?: boolean }) {
    return <motion.button
        whileTap={{ scale: 0.75 }} transition={spring}
        className={`${floating ? 'absolute top-2.5 left-2.5' : 'shrink-0 relative'} w-9 h-9 rounded-full grid place-items-center border backdrop-blur-sm ${on ? 'bg-acc text-accink border-acc' : 'bg-black/40 text-white/85 border-white/20'}`}
        onClick={(e) => { e.stopPropagation(); onToggle(); }} aria-label={on ? 'הסר מהשמורים' : 'שמור'}>
        <motion.span animate={on ? { scale: [1, 1.3, 1] } : {}} transition={{ duration: 0.3 }}>
            <Icon name="star" size={18} />
        </motion.span>
    </motion.button>;
}

function QuizCard({ title, children }: { title: string; children: React.ReactNode }) {
    return <motion.div initial={{ opacity: 0, y: 14 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, margin: '-20px' }} transition={easeOut}
        className="bg-card border border-hairline rounded-2xl p-4 flex flex-col gap-3">
        <h2 className="text-[16px] font-extrabold text-ink">{title}</h2>
        {children}
    </motion.div>;
}

export function MealsFlow({ profile, onClose, openMeal }: { profile: Profile; onClose: () => void; openMeal?: MealSuggestion | null }) {
    const [settings, setSettings] = useStore<CoachSettings>('coachsettings.v1', DEFAULT_SETTINGS);
    const [favs, setFavs] = useStore<MealSuggestion[]>('mealfavs.v1', []);
    const [foods, setFoods] = useStore<Record<string, FoodEntry[]>>('foods.v1', {});
    const [view, setView] = useState<'quiz' | 'loading' | 'results' | 'detail'>(openMeal ? 'detail' : 'quiz');
    const [answers, setAnswers] = useState<MealAnswers>({ craving: '', atHome: '', prepTime: '20', mealType: 'ארוחה', size: 'משביע', focus: 'מאוזן' });
    const [meals, setMeals] = useState<MealSuggestion[]>([]);
    const [selected, setSelected] = useState<MealSuggestion | null>(openMeal || null);
    const [avoid, setAvoid] = useStore<string[]>('mealhistory.v1', []);
    const [workoutLogs] = useStore<WorkoutLog[]>('logs.v1', []);
    const [error, setError] = useState('');
    const [logged, setLogged] = useState(false);

    const t = todayKey();
    const foodsToday = foods[t] || [];
    const kcalLeft = calorieTarget(profile) - foodsToday.reduce((n, f) => n + f.kcal, 0);
    const proteinLeft = proteinTarget(profile) - foodsToday.reduce((n, f) => n + (f.protein || 0), 0);

    const isFav = (m: MealSuggestion) => favs.some((f) => f.id === m.id || f.name === m.name);
    const toggleFav = (m: MealSuggestion) => {
        setFavs(isFav(m) ? favs.filter((f) => !(f.id === m.id || f.name === m.name)) : [m, ...favs].slice(0, 24));
    };

    const run = async (refresh: boolean) => {
        setView('loading'); setError(''); setLogged(false);
        try {
            const result = await suggestMeals(settings, profile, foodsToday, answers, refresh ? [...avoid, ...meals.map((m) => m.name)] : avoid, {
                favorites: favs.map(m => m.name),
                recentFoods: Object.keys(foods).sort().reverse().slice(0, 7).flatMap(day => (foods[day] || []).map(f => `${day}: ${f.name}`)).slice(0, 24),
                recentWorkouts: workoutLogs.slice(0, 3).map(w => `${w.date}: ${w.focus}, ${w.durationMin} דקות`),
            });
            if (result.length === 0) throw new Error('empty');
            setMeals(result);
            setAvoid([...avoid, ...result.map((m) => m.name)].slice(-60));
            setView('results');
        } catch (e) {
            setError(e instanceof Error ? e.message : 'משהו השתבש. נסה שוב.');
            setView(meals.length ? 'results' : 'quiz');
        }
    };

    const addToLog = (m: MealSuggestion) => {
        setFoods(capDayMap({ ...foods, [t]: [...foodsToday, { id: uid(), name: m.name, kcal: m.kcal, protein: m.protein || undefined }] }));
        setLogged(true);
    };

    const head = (title: string, sub?: string) => (
        <div className="flex items-center gap-3">
            <IconButton label="חזרה" onClick={() => {
                if (view === 'detail' && meals.length) { setView('results'); setLogged(false); }
                else if (view === 'detail') setView('quiz');
                else if (view === 'results') setView('quiz');
                else onClose();
            }}><Icon name="back" size={18} /></IconButton>
            <div>
                <h1 className="text-[20px] font-extrabold text-ink leading-tight">{title}</h1>
                {sub && <p className="text-[13px] text-muted">{sub}</p>}
            </div>
        </div>
    );

    const errBox = error && <div className="bg-danger/10 border border-danger/30 rounded-xl px-4 py-3 text-[13px] text-danger">{error}</div>;

    // No API key yet: same deal as the coach, the meal ideas run on his own key.
    if (!settings.apiKey) {
        return <div className="screen">
            {head('רעיונות לארוחה')}
            <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={easeOut}>
                <Card className="p-5 flex flex-col gap-3.5">
                    <h2 className="text-[17px] font-extrabold text-ink">צריך מפתח API פעם אחת</h2>
                    <p className="text-[14px] text-ink/90 leading-relaxed">רעיונות הארוחות רצים על אותו מפתח AI של המאמן האישי - ישירות מהטלפון שלך, בלי שרת באמצע. המפתח נשמר רק במכשיר.</p>
                    <p className="text-[14px] text-muted">להוספת מפתח: פרופיל ← הגדרות ← מפתח API.</p>
                </Card>
            </motion.div>
        </div>;
    }

    if (view === 'loading') {
        return <div className="screen">
            {head('רעיונות לארוחה')}
            <div className="flex flex-col items-center gap-4 py-16 text-center">
                <div className="flex gap-2">
                    {[0, 1, 2].map((i) => (
                        <motion.span key={i} className="w-3.5 h-3.5 rounded-full bg-acc"
                            animate={{ scale: [1, 1.35, 1], opacity: [0.5, 1, 0.5] }}
                            transition={{ duration: 0.9, repeat: Infinity, delay: i * 0.15 }} />
                    ))}
                </div>
                <h2 className="text-[18px] font-extrabold text-ink">חושב על {answers.mealType === 'נשנוש' ? 'נשנושים' : 'ארוחות'} בשבילך…</h2>
                <p className="text-[13.5px] text-muted leading-relaxed max-w-[300px]">משלב את מה שמתחשק לך עם מה שנשאר לך היום: עוד {Math.max(0, kcalLeft)} קק״ל ו-{Math.max(0, proteinLeft)} גרם חלבון.</p>
            </div>
        </div>;
    }

    if (view === 'detail' && selected) {
        const m = selected;
        return <div className="screen">
            {head(m.name, `${m.kcal} קק״ל · ${m.protein} גרם חלבון · כ-${m.prepMin} דק׳`)}
            <motion.div initial={{ opacity: 0, scale: 0.97 }} animate={{ opacity: 1, scale: 1 }} transition={easeOut}
                className="relative rounded-2xl overflow-hidden border border-hairline">
                <img className="w-full h-[190px] object-cover" src={mealImage(m.category)} alt={m.name} loading="lazy" decoding="async" />
                <Star on={isFav(m)} onToggle={() => toggleFav(m)} />
            </motion.div>
            <p className="text-[12px] text-muted">תמונת השראה שנוצרה ב-AI לסוג המנה, לא צילום המתכון המדויק</p>
            {m.desc && <p className="text-[14.5px] text-ink/90 leading-relaxed">{m.desc}</p>}
            <div className="flex gap-2 flex-wrap">
                <span className="bg-card2 border border-hairline rounded-full px-3.5 py-1.5 text-[13px] text-ink"><b className="font-extrabold">{m.kcal}</b> קק״ל</span>
                <span className="bg-card2 border border-hairline rounded-full px-3.5 py-1.5 text-[13px] text-ink"><b className="font-extrabold">{m.protein}</b> ג׳ חלבון</span>
                {m.carbs !== undefined && <span className="bg-card2 border border-hairline rounded-full px-3.5 py-1.5 text-[13px] text-ink"><b className="font-extrabold">{m.carbs}</b> ג׳ פחמ׳</span>}
                {m.fat !== undefined && <span className="bg-card2 border border-hairline rounded-full px-3.5 py-1.5 text-[13px] text-ink"><b className="font-extrabold">{m.fat}</b> ג׳ שומן</span>}
            </div>
            {m.missing && m.missing.length > 0 && <p className="text-[13px] leading-relaxed" style={{ color: 'var(--cal)' }}>חסר לך בבית: {m.missing.join(', ')}</p>}
            {m.ingredients.length > 0 && <Card className="p-4">
                <h2 className="text-[16px] font-extrabold text-ink mb-2">מצרכים</h2>
                <ul className="flex flex-col gap-1.5 text-[14px] text-ink/90">
                    {m.ingredients.map((ing, i) => <li key={i} className="flex gap-2"><span className="text-acc">•</span>{ing}</li>)}
                </ul>
            </Card>}
            {m.steps.length > 0 && <Card className="p-4">
                <h2 className="text-[16px] font-extrabold text-ink mb-2">אופן ההכנה</h2>
                <ol className="flex flex-col gap-2.5 text-[14px] text-ink/90">
                    {m.steps.map((s, i) => <li key={i} className="flex gap-2.5">
                        <span className="w-6 h-6 rounded-full bg-accdim text-acc grid place-items-center text-[12px] font-extrabold shrink-0">{i + 1}</span>
                        <span className="leading-relaxed">{s}</span>
                    </li>)}
                </ol>
            </Card>}
            <Button variant="primary" className="w-full" onClick={() => addToLog(m)} disabled={logged}>
                {logged ? 'נוסף ליומן של היום ✓' : `הוספה ליומן (${m.kcal} קק״ל)`}
            </Button>
        </div>;
    }

    if (view === 'results') {
        return <div className="screen">
            {head(`${meals.length} רעיונות בשבילך`, answers.mealType === 'נשנוש' ? 'נשנושים בריאים ומשביעים' : 'מותאם למה שנשאר לך היום')}
            {errBox}
            <AnimatePresence initial={false}>
                {meals.map((m, i) => (
                    <motion.button key={m.id}
                        initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                        transition={{ ...springSoft, delay: i * 0.07 }}
                        whileTap={{ scale: 0.98 }}
                        className="w-full text-right bg-card border border-hairline rounded-2xl overflow-hidden"
                        onClick={() => { setSelected(m); setLogged(false); setView('detail'); }}>
                        <div className="relative h-[130px]">
                            <img className="w-full h-full object-cover" src={mealImage(m.category)} alt={m.name} loading="lazy" />
                            <Star on={isFav(m)} onToggle={() => toggleFav(m)} />
                        </div>
                        <div className="p-3.5 flex flex-col gap-1">
                            <span className="text-[12px] text-muted">תמונת השראה לסוג המנה · AI</span>
                            <strong className="text-[15.5px] font-bold text-ink">{m.name}</strong>
                            <span className="text-[12.5px] text-muted">{m.kcal} קק״ל · {m.protein} ג׳ חלבון · {m.prepMin} דק׳</span>
                        </div>
                    </motion.button>
                ))}
            </AnimatePresence>
            <div className="flex gap-2">
                <Button variant="secondary" className="flex-1" onClick={() => run(true)}>
                    <Icon name="refresh" size={16} /> עוד 3 רעיונות
                </Button>
                <Button variant="ghost" onClick={() => setView('quiz')}>שינוי תשובות</Button>
            </div>
            {/* Disabled preview: per-meal AI image generation exists in code but is
                intentionally not wired to any live call until Dror approves the cost
                (paid-only per Google docs). See meals.ts generateMealImage. */}
            <div className="bg-card border border-hairline rounded-2xl p-4 flex flex-col gap-1.5 opacity-80">
                <div className="flex items-center gap-2">
                    <Icon name="spark" size={16} className="text-acc" />
                    <strong className="text-[14px] font-bold text-ink">תמונות AI מדויקות לכל מנה - בקרוב</strong>
                </div>
                <p className="text-[12.5px] text-muted leading-relaxed">אפשר לייצר תמונה מדויקת לכל מנה דרך מפתח ה-Gemini שלך (כ-12 אגורות לתמונה, דורש הפעלת חיוב ב-Google AI Studio). התכונה מושבתת כרגע ותופעל רק אחרי האישור שלך. בינתיים מוצגות תמונות השראה לסוג המנה.</p>
            </div>
        </div>;
    }

    // quiz
    const setA = <K extends keyof MealAnswers>(k: K, v: MealAnswers[K]) => setAnswers((a) => ({ ...a, [k]: v }));
    return <div className="screen">
        {head('רעיונות לארוחה', 'ענה על כמה שאלות וקבל 3 הצעות מותאמות לך')}

        <QuizCard title="מה מתחשק לך?">
            <TextInput placeholder="למשל: חביתה, משהו מנחם עם גבינה…" value={answers.craving} onChange={(e) => setA('craving', e.target.value)} />
            <div className="flex flex-wrap gap-2">
                {TASTES.map((t2) => <motion.button key={t2} whileTap={{ scale: 0.95 }} transition={spring}
                    className="rounded-full px-3 min-h-[34px] text-[12.5px] font-semibold bg-card2 border border-hairline text-ink"
                    onClick={() => setA('craving', answers.craving ? answers.craving + ', ' + t2 : t2)}>{t2}</motion.button>)}
            </div>
        </QuizCard>

        <QuizCard title="מה יש לך בבית?">
            <TextInput placeholder="למשל: אורז, חזה עוף, ביצים, עגבניות…" value={answers.atHome} onChange={(e) => setA('atHome', e.target.value)} />
            <p className="text-[12px] text-faint">ריק? נציע מנות עם מצרכים בסיסיים שיש ברוב הבתים.</p>
        </QuizCard>

        <QuizCard title="ארוחה או נשנוש?">
            <div className="flex gap-2">
                {(['ארוחה', 'נשנוש'] as const).map((v) => <Chip key={v} active={answers.mealType === v} onClick={() => setA('mealType', v)}>{v}</Chip>)}
            </div>
            {answers.mealType === 'נשנוש' && <p className="text-[12px] text-faint">נשנושים בריאים ומשביעים - פירות, פופקורן, יוגורט ועוד דברים טעימים שכן מתחשק.</p>}
        </QuizCard>

        <QuizCard title="כמה זמן יש לך?">
            <div className="flex flex-wrap gap-2">
                {PREP_OPTIONS.map(([v, l]) => <Chip key={v} active={answers.prepTime === v} onClick={() => setA('prepTime', v)}>{l}</Chip>)}
            </div>
        </QuizCard>

        <QuizCard title="כמה רעב אתה?">
            <div className="flex flex-wrap gap-2">
                {SIZE_OPTIONS.map(([v, l]) => <Chip key={v} active={answers.size === v} onClick={() => setA('size', v)}>{l}</Chip>)}
            </div>
        </QuizCard>

        <QuizCard title="דגש תזונתי">
            <div className="flex flex-wrap gap-2">
                {FOCUS_OPTIONS.map(([v, l]) => <Chip key={v} active={answers.focus === v} onClick={() => setA('focus', v)}>{l}</Chip>)}
            </div>
            <p className="text-[12px] text-faint">נותרו לך היום כ-{Math.max(0, kcalLeft)} קק״ל ו-{Math.max(0, proteinLeft)} גרם חלבון - ההצעות יתחשבו בזה.</p>
        </QuizCard>

        {errBox}
        <Button variant="primary" className="w-full" onClick={() => run(false)}>
            <Icon name="spark" size={18} /> תן לי {answers.mealType === 'נשנוש' ? 'נשנושים' : 'ארוחות'}
        </Button>

        {favs.length > 0 && <>
            <h2 className="text-[17px] font-extrabold text-ink mt-2">השמורים שלך</h2>
            {favs.map((m) => (
                <motion.button key={m.id} whileTap={{ scale: 0.98 }} transition={spring}
                    className="w-full flex items-center gap-3 bg-card border border-hairline rounded-2xl p-2.5 text-right"
                    onClick={() => { setSelected(m); setLogged(false); setView('detail'); }}>
                    <img className="w-14 h-14 rounded-xl object-cover shrink-0" src={mealImage(m.category)} alt="" loading="lazy" decoding="async" />
                    <div className="grow flex flex-col gap-0.5 min-w-0">
                        <strong className="text-[14.5px] font-bold text-ink truncate">{m.name}</strong>
                        <span className="text-[12.5px] text-muted">{m.kcal} קק״ל · {m.protein} ג׳ חלבון</span>
                    </div>
                    <Star floating={false} on={true} onToggle={() => toggleFav(m)} />
                </motion.button>
            ))}
        </>}
    </div>;
}
