// Profile: level/xp, stats, weight chart, calorie bars, badges, history,
// appearance, install, weigh-in sheet. Tailwind + ds + motion; logic unchanged.
import React, { useMemo, useState } from 'react';
import { motion } from '../vendor/framer-motion.vendor.mjs';
import { Profile, Plan, WorkoutLog, WeightEntry, FoodEntry } from '../data';
import { useStore, todayKey, capWeights } from '../store';
import { coachAvatar } from '../mealImages';
import { Icon } from '../ui';
import { IconButton, Button, MotionCard, SectionTitle, Sheet, spring, easeOut } from '../ds';
import { Settings } from './Settings';
import { BodyMap } from '../BodyMap';

const LEVELS: { min: number; name: string }[] = [
    { min: 0, name: 'מתחיל' },
    { min: 5, name: 'מתאמן' },
    { min: 15, name: 'חזק' },
    { min: 30, name: 'אלוף' },
];

function levelOf(workouts: number): { name: string; idx: number; pct: number } {
    let idx = 0;
    for (let i = 0; i < LEVELS.length; i++) if (workouts >= LEVELS[i].min) idx = i;
    const cur = LEVELS[idx], next = LEVELS[idx + 1];
    const pct = next ? (workouts - cur.min) / (next.min - cur.min) : 1;
    return { name: cur.name, idx, pct: Math.min(1, Math.max(0.04, pct)) };
}

function weekStreak(logs: WorkoutLog[]): number {
    const weeks = new Set(logs.map((l) => { const d = new Date(l.date); d.setDate(d.getDate() - d.getDay()); return d.toISOString().slice(0, 10); }));
    let streak = 0;
    const d = new Date(); d.setDate(d.getDate() - d.getDay());
    for (let i = 0; i < 200; i++) {
        const k = d.toISOString().slice(0, 10);
        if (weeks.has(k)) { streak++; d.setDate(d.getDate() - 7); }
        else if (i === 0) { d.setDate(d.getDate() - 7); } // current week may be empty
        else break;
    }
    return streak;
}

interface BadgeStats { workouts: number; streak: number; tonnage: number; foods: number; weighs: number }
const BADGES: { id: string; icon: string; name: string; sub: string; test: (s: BadgeStats) => boolean }[] = [
    { id: 'first', icon: 'medal', name: 'אימון ראשון', sub: 'התחלת', test: (s) => s.workouts >= 1 },
    { id: 'three', icon: 'medal', name: '3 אימונים', sub: 'בדרך', test: (s) => s.workouts >= 3 },
    { id: 'five', icon: 'medal', name: '5 אימונים', sub: 'מתמיד', test: (s) => s.workouts >= 5 },
    { id: 'ten', icon: 'medal', name: '10 אימונים', sub: 'במומחיות', test: (s) => s.workouts >= 10 },
    { id: 'streak', icon: 'flame', name: 'רצף של 3', sub: 'שבועות', test: (s) => s.streak >= 3 },
    { id: 'food', icon: 'apple', name: 'מתעד תזונה', sub: 'ארוחה ראשונה', test: (s) => s.foods >= 1 },
    { id: 'weigh', icon: 'timer', name: 'מודד משקל', sub: 'מדידה ראשונה', test: (s) => s.weighs >= 1 },
    { id: 'ton', icon: 'dumbbell', name: '10 טון', sub: 'סה״כ הורם', test: (s) => s.tonnage >= 10000 },
    { id: 'twenty', icon: 'dumbbell', name: '20 אימונים', sub: 'חזק', test: (s) => s.workouts >= 20 },
    { id: 'fifty', icon: 'star', name: '50 אימונים', sub: 'אלוף', test: (s) => s.workouts >= 50 },
];

type CalTab = 'week' | 'month' | '3m';

export function ProfileScreen({ profile, plan, onRedoOnboarding, onReset, goCoach }: { profile: Profile; plan: Plan | null; onRedoOnboarding: () => void; onReset: () => void; goCoach: () => void }) {
    const [logs, setLogs] = useStore<WorkoutLog[]>('logs.v1', []);
    const [weights, setWeights] = useStore<WeightEntry[]>('weights.v1', []);
    const [foods] = useStore<Record<string, FoodEntry[]>>('foods.v1', {});
    const [showSettings, setShowSettings] = useState(false);
    const [weighOpen, setWeighOpen] = useState(false);
    const [draftKg, setDraftKg] = useState(profile.weightKg);
    const [calTab, setCalTab] = useState<CalTab>('week');

    const lvl = levelOf(logs.length);
    const streak = weekStreak(logs);
    const totalKg = logs.reduce((n, l) => n + l.exercises.reduce((m, e) => m + e.sets.filter((s) => s.done).reduce((k, s) => k + s.kg * s.reps, 0), 0), 0);
    const foodCount = Object.values(foods).reduce((n, arr) => n + arr.length, 0);
    const sortedW = useMemo(() => [...weights].sort((a, b) => a.date.localeCompare(b.date)), [weights]);
    const curKg = sortedW.length ? sortedW[sortedW.length - 1].kg : profile.weightKg;

    const saveWeight = () => {
        if (!draftKg) return;
        const rest = sortedW.filter((w) => w.date !== todayKey());
        setWeights(capWeights([...rest, { date: todayKey(), kg: Math.round(draftKg * 10) / 10 }].sort((a, b) => a.date.localeCompare(b.date))));
        setWeighOpen(false);
    };

    // weight area chart geometry (last 12 entries)
    const wpts = sortedW.slice(-12);
    const wChart = useMemo(() => {
        if (wpts.length < 2) return null;
        const W = 320, H = 120, PAD = 8;
        const kgs = wpts.map((w) => w.kg);
        const min = Math.min(...kgs) - 1, max = Math.max(...kgs) + 1;
        const x = (i: number) => PAD + (i / (wpts.length - 1)) * (W - PAD * 2);
        const y = (kg: number) => H - PAD - ((kg - min) / (max - min)) * (H - PAD * 2);
        const line = wpts.map((w, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)},${y(w.kg).toFixed(1)}`).join(' ');
        return { W, H, PAD, line, area: `${line} L${x(wpts.length - 1).toFixed(1)},${H} L${x(0).toFixed(1)},${H} Z`, min, max, x, y };
    }, [wpts]);

    // calorie stacked bars
    const calBars = useMemo(() => {
        const dayKcal = (k: string) => (foods[k] || []).reduce((n, f) => n + f.kcal, 0);
        const dayPro = (k: string) => (foods[k] || []).reduce((n, f) => n + (f.protein || 0), 0);
        const bars: { label: string; kcal: number; proteinKcal: number }[] = [];
        const push = (label: string, keys: string[]) => {
            const withData = keys.filter((k) => dayKcal(k) > 0);
            if (!withData.length) { bars.push({ label, kcal: 0, proteinKcal: 0 }); return; }
            const kcal = Math.round(withData.reduce((n, k) => n + dayKcal(k), 0) / withData.length);
            const pro = Math.round(withData.reduce((n, k) => n + dayPro(k), 0) / withData.length) * 4;
            bars.push({ label, kcal, proteinKcal: Math.min(pro, kcal) });
        };
        const dayKey = (offset: number) => { const d = new Date(); d.setDate(d.getDate() - offset); return todayKey(d); };
        const weekKeys = (weeksAgo: number) => Array.from({ length: 7 }, (_, i) => dayKey(weeksAgo * 7 + (6 - i)));
        const DOW = ['א', 'ב', 'ג', 'ד', 'ה', 'ו', 'ש'];
        if (calTab === 'week') {
            for (let i = 6; i >= 0; i--) { const d = new Date(); d.setDate(d.getDate() - i); push(DOW[d.getDay()], [todayKey(d)]); }
        } else if (calTab === 'month') {
            for (let w = 3; w >= 0; w--) push(`שבוע ${4 - w}`, weekKeys(w));
        } else {
            for (let w = 11; w >= 0; w--) push(`${12 - w}`, weekKeys(w));
        }
        return bars;
    }, [foods, calTab]);
    const calMax = Math.max(500, ...calBars.map((b) => b.kcal));
    const calAvg = (() => { const nz = calBars.filter((b) => b.kcal > 0); return nz.length ? Math.round(nz.reduce((n, b) => n + b.kcal, 0) / nz.length) : 0; })();

    if (showSettings) {
        return <Settings onBack={() => setShowSettings(false)} onRedoOnboarding={onRedoOnboarding} onReset={onReset} />;
    }

    const stat = (icon: string, value: number, label: string) => (
        <MotionCard className="flex-1 p-4 flex flex-col gap-1 items-center">
            <div className="flex items-center gap-2">
                <span className="w-9 h-9 rounded-xl bg-accdim text-acc grid place-items-center"><Icon name={icon} size={18} /></span>
                <strong className="text-[24px] font-extrabold text-ink tabular-nums">{value}</strong>
            </div>
            <span className="text-[12.5px] text-muted">{label}</span>
        </MotionCard>
    );

    return <div className="screen">
        <div className="flex items-center justify-between">
            <span className="w-10" />
            <h1 className="text-[20px] font-extrabold text-ink">הפרופיל שלך</h1>
            <IconButton label="הגדרות" onClick={() => setShowSettings(true)}><Icon name="gear" size={19} /></IconButton>
        </div>

        <MotionCard className="p-4 flex flex-col gap-2.5">
            <div className="flex items-center justify-between">
                <span className="inline-flex items-center gap-1.5 text-[13px] font-bold text-acc"><Icon name="medal" size={16} /> רמה {lvl.idx + 1}</span>
                {LEVELS[lvl.idx + 1] && <span className="text-[12.5px] text-muted">רמה {lvl.idx + 2}</span>}
            </div>
            <div className="relative h-7 rounded-full bg-card2 overflow-hidden">
                <motion.div
                    className="absolute inset-y-0 right-0 bg-acc rounded-full grid place-items-center"
                    initial={{ width: 0 }}
                    animate={{ width: `${lvl.pct * 100}%` }}
                    transition={{ ...easeOut, duration: 0.7 }}
                >
                    <span className="text-[11.5px] font-extrabold text-accink tabular-nums">{Math.round(lvl.pct * 100)}%</span>
                </motion.div>
            </div>
            <span className="text-[12.5px] text-muted">{LEVELS[lvl.idx + 1] ? `עוד ${LEVELS[lvl.idx + 1].min - logs.length} אימונים לרמה הבאה` : 'הגעת לרמה הגבוהה ביותר'} · {lvl.name}</span>
        </MotionCard>

        <div className="flex gap-3">
            {stat('flame', streak, 'אימונים ברצף')}
            {stat('dumbbell', logs.length, 'אימונים סך הכל')}
        </div>

        <MotionCard className="p-4">
            <div className="flex items-start justify-between gap-3">
                <div className="flex items-baseline gap-2">
                    <h2 className="text-[16px] font-extrabold text-ink">המשקל שלך: {curKg} ק״ג</h2>
                    {sortedW.length >= 2 && (() => { const d = Math.round((sortedW[sortedW.length - 1].kg - sortedW[sortedW.length - 2].kg) * 10) / 10; return <span className={`text-[12.5px] font-bold ${d <= 0 ? 'text-acc' : 'text-danger'}`}>{d > 0 ? '+' : ''}{d} ק״ג</span>; })()}
                </div>
                <IconButton label="הוספת שקילה" onClick={() => { setDraftKg(curKg); setWeighOpen(true); }}><Icon name="plus" size={18} /></IconButton>
            </div>
            {wChart ? <div className="flex gap-2 mt-2">
                <svg className="grow h-[120px]" viewBox={`0 0 ${wChart.W} ${wChart.H}`} preserveAspectRatio="none">
                    {[0.25, 0.5, 0.75].map((f) => <line key={f} x1="0" x2={wChart.W} y1={wChart.H * f} y2={wChart.H * f} stroke="rgba(255,255,255,0.06)" strokeWidth="1" />)}
                    <defs><linearGradient id="wg" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0" stopColor="#cdf14c" stopOpacity="0.35" />
                        <stop offset="1" stopColor="#cdf14c" stopOpacity="0" />
                    </linearGradient></defs>
                    <motion.path d={wChart.area} fill="url(#wg)" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.5, duration: 0.6 }} />
                    <motion.path d={wChart.line} fill="none" stroke="#cdf14c" strokeWidth="2.5" strokeLinecap="round"
                        initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: 0.9, ease: 'easeOut' }} />
                    {wpts.map((w, i) => <motion.circle key={w.date} cx={wChart.x(i)} cy={wChart.y(w.kg)} r="3" fill="#cdf14c"
                        initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ ...spring, delay: 0.15 + i * 0.05 }} />)}
                </svg>
                <div className="flex flex-col justify-between text-[10.5px] text-faint py-1 tabular-nums">
                    <span>{Math.round(wChart.max - 1)}</span><span>{Math.round((wChart.max + wChart.min) / 2)}</span><span>{Math.round(wChart.min + 1)}</span>
                </div>
            </div> : <p className="text-[13px] text-muted mt-1">עוד אין מספיק מדידות לגרף. לחצו + להוספת שקילה ראשונה.</p>}
        </MotionCard>

        <MotionCard className="p-4">
            <div className="flex items-center justify-between mb-3">
                <h2 className="text-[16px] font-extrabold text-ink">קלוריות יומיות</h2>
                <div className="flex bg-card2 rounded-full p-0.5 border border-hairline">
                    {([['week', 'שבוע'], ['month', 'חודש'], ['3m', '3 חוד׳']] as [CalTab, string][]).map(([id, label]) => (
                        <button key={id}
                            className={`rounded-full px-3 min-h-[28px] text-[12px] font-bold transition ${calTab === id ? 'bg-acc text-accink' : 'text-muted'}`}
                            onClick={() => setCalTab(id)}>{label}</button>
                    ))}
                </div>
            </div>
            <div className="relative flex items-end justify-between h-[130px] px-1">
                {[0.33, 0.66].map((f) => <span key={f} className="absolute inset-x-1 border-t border-white/5" style={{ bottom: `${f * 100}%` }} />)}
                {calBars.map((b, i) => (
                    <div key={`${calTab}-${i}`} className="flex flex-col items-center gap-1.5 w-8">
                        <motion.div
                            className="relative w-5 rounded-md bg-card2 overflow-hidden flex flex-col-reverse"
                            initial={{ height: 2 }}
                            animate={{ height: `${Math.max(2, (b.kcal / calMax) * 104)}px` }}
                            transition={{ ...easeOut, duration: 0.5, delay: i * 0.03 }}
                        >
                            <span className="block w-full bg-acc" style={{ height: b.kcal ? `${(b.proteinKcal / b.kcal) * 100}%` : 0 }} />
                        </motion.div>
                        <span className="text-[10.5px] text-faint">{b.label}</span>
                    </div>
                ))}
            </div>
            <div className="flex items-center gap-4 mt-3 text-[12px] text-muted">
                <span className="inline-flex items-center gap-1.5"><i className="w-2 h-2 rounded-full bg-acc inline-block" /> חלבון</span>
                <span className="inline-flex items-center gap-1.5"><i className="w-2 h-2 rounded-full bg-card2 border border-hairline inline-block" /> שאר הקק״ל</span>
                <strong className="ms-auto text-[12px] font-bold text-ink">{calAvg ? `ממוצע ${calAvg} קק״ל ליום` : 'אין עדיין נתוני תזונה'}</strong>
            </div>
        </MotionCard>

        <MotionCard className="p-4">
            <h2 className="text-[16px] font-extrabold text-ink">ההישגים שלך:</h2>
            <p className="text-[12px] text-faint mb-3">סה״כ {Math.round(totalKg).toLocaleString()} ק״ג הורמו בכל האימונים</p>
            <div className="grid grid-cols-2 gap-2.5">
                {BADGES.map((b, i) => {
                    const on = b.test({ workouts: logs.length, streak, tonnage: totalKg, foods: foodCount, weighs: sortedW.length });
                    return <motion.div key={b.id}
                        initial={{ opacity: 0, scale: 0.94 }} whileInView={{ opacity: 1, scale: 1 }} viewport={{ once: true }}
                        transition={{ ...easeOut, delay: i * 0.02 }}
                        className={`rounded-xl p-3 flex flex-col items-center gap-1 text-center border ${on ? 'bg-accdim border-acc/30' : 'bg-card2/60 border-hairline opacity-45'}`}>
                        <span className={`w-10 h-10 rounded-full grid place-items-center ${on ? 'bg-acc text-accink' : 'bg-card2 text-muted'}`}><Icon name={b.icon} size={20} /></span>
                        <strong className="text-[13px] font-bold text-ink">{b.name}</strong>
                        <span className="text-[11.5px] text-muted">{b.sub}</span>
                    </motion.div>;
                })}
            </div>
        </MotionCard>

        <motion.button whileTap={{ scale: 0.98 }} transition={spring}
            className="w-full bg-card border border-hairline rounded-2xl p-4 flex items-center gap-3 text-right"
            onClick={goCoach}>
            <img className="w-11 h-11 rounded-full object-cover border border-hairline" src={coachAvatar} alt="המאמן" decoding="async" />
            <span className="flex flex-col gap-0.5 grow">
                <strong className="text-[15px] font-bold text-ink">אנחנו כאן בשבילך!</strong>
                <span className="text-[12.5px] text-muted">שאלה, התלבטות או צורך בשינוי? המאמן האישי זמין 24/7</span>
            </span>
            <Icon name="fwd" size={18} />
        </motion.button>

        <MotionCard className="p-4">
            <h2 className="text-[16px] font-extrabold text-ink mb-2">היסטוריית אימונים ({logs.length})</h2>
            {logs.length === 0 && <p className="text-[13px] text-muted">עוד לא תועד אימון. הראשון שלך מחכה.</p>}
            <div className="flex flex-col divide-y divide-white/5">
                {logs.slice(0, 12).map((l) => (
                    <div key={l.id} className="py-3 flex items-center gap-3">
                        <div className="grow flex flex-col gap-0.5 min-w-0">
                            <span className="text-[11px] text-faint tabular-nums">{l.date}</span>
                            <strong className="text-[14.5px] font-bold text-ink truncate">{l.planDayLabel}</strong>
                            <span className="text-[12.5px] text-muted">{l.focus}{l.note ? ` · ${l.note}` : ''}</span>
                            <span className="text-[12px] text-faint">{l.durationMin} דק׳ · {l.exercises.reduce((n, e) => n + e.sets.filter((s) => s.done).length, 0)} סטים</span>
                        </div>
                        <BodyMap focus={l.focus} size={42} />
                        <IconButton label="מחק" onClick={() => setLogs(logs.filter((x) => x.id !== l.id))}><Icon name="trash" size={15} /></IconButton>
                    </div>
                ))}
            </div>
        </MotionCard>

        <p className="text-center text-[12px] text-faint">SwoleUp v6.5 · נבנה אישית בשבילך.</p>

        <Sheet open={weighOpen} onClose={() => setWeighOpen(false)} title="מה המשקל שלך?">
            <div className="flex items-center justify-center gap-6 my-2">
                <motion.button whileTap={{ scale: 0.9 }} transition={spring}
                    className="w-12 h-12 rounded-full bg-card2 border border-hairline text-ink grid place-items-center"
                    onClick={() => setDraftKg((k) => Math.round((k + 0.1) * 10) / 10)} aria-label="העלה"><Icon name="plus" size={20} /></motion.button>
                <div className="flex items-baseline gap-1.5">
                    <strong className="text-[40px] font-extrabold text-ink tabular-nums">{draftKg.toFixed(1)}</strong>
                    <span className="text-[14px] text-muted">ק״ג</span>
                </div>
                <motion.button whileTap={{ scale: 0.9 }} transition={spring}
                    className="w-12 h-12 rounded-full bg-card2 border border-hairline text-ink grid place-items-center"
                    onClick={() => setDraftKg((k) => Math.max(30, Math.round((k - 0.1) * 10) / 10))} aria-label="הורד"><Icon name="minus" size={20} /></motion.button>
            </div>
            <Button variant="primary" onClick={saveWeight}>הוספת שקילה</Button>
        </Sheet>
    </div>;
}
