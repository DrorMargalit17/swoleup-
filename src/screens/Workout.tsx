// Active workout: single-tap start (clock runs from entry), editable set rows
// (add/remove sets, per-set reps, tap-to-edit weight auto-filled from settings),
// free navigation between exercises with data preserved, pause/resume, rest
// timer with ±15s, end-workout rating slider + feedback sheet.
import { unlockRestAudio, playRestChime } from '../restSound';
import { DEFAULT_REMINDERS, ReminderPreferencesValue } from '../ReminderPreferences';
import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from '../vendor/framer-motion.vendor.mjs';
import { PlanDay, WorkoutLog, ExerciseLog, RestTimer, WorkoutSession, EquipWeight, exerciseById, sectionOf, topOfRange } from '../data';
import { todayKey, uid, useStore } from '../store';
import { Icon } from '../ui';
import { sectionImg } from '../images';
import { Sheet, Button, spring, easeOut } from '../ds';
import { ExerciseExplain } from '../explain';

function fmtClock(totalSec: number): string {
    const m = Math.floor(totalSec / 60);
    const s = totalSec % 60;
    return `${m}:${String(s).padStart(2, '0')}`;
}

function useTicker(active: boolean): number {
    const [, force] = useState(0);
    useEffect(() => {
        if (!active) return;
        const visible=()=>force(x=>x+1);document.addEventListener('visibilitychange',visible);
        const t = setInterval(() => force((x) => x + 1), 1000);
        return () => {clearInterval(t);document.removeEventListener('visibilitychange',visible)};
    }, [active]);
    return Date.now();
}

const RATE_LABELS = ['', 'קל מדי לגמרי', 'קל מדי', 'די קל', 'קל', 'בינוני', 'דורש מאמץ', 'מאתגר', 'קשה', 'קשה מאוד', 'גבולי'];

interface Props {
    day: PlanDay;
    prefill: (exId: string) => number;
    resume: WorkoutSession | null;
    onFinish: (log: WorkoutLog) => void;
    onCancel: () => void;
    onPause: (s: WorkoutSession) => void;
}

type Phase = 'idle' | 'rest';
type View = 'exercise' | 'list' | 'rate';

export function Workout({ day, prefill, resume, onFinish, onCancel, onPause }: Props) {
    const [started] = useState(() => Date.now() - (resume?.elapsedMs ?? 0));
    const [exs, setExs] = useState<ExerciseLog[]>(() => resume?.exs ?? day.exercises.map((e) => ({
        exerciseId: e.id, he: e.he, en: e.en,
        sets: Array.from({ length: e.sets }, () => ({ kg: prefill(e.id), reps: topOfRange(e.reps), done: false })),
    })));
    const [ei, setEi] = useState(resume?.ei ?? 0);
    const [si, setSi] = useState(resume?.si ?? 0);
    const [view, setView] = useState<View>('exercise');
    const [phase, setPhase] = useState<Phase>(resume && resume.restLeftMs > 0 ? 'rest' : 'idle');
    const [restSec, setRestSec] = useState(resume ? Math.ceil(resume.restLeftMs / 1000) : 0);
    const [restEnd, setRestEnd] = useState(resume && resume.restLeftMs > 0 ? Date.now() + resume.restLeftMs : 0);
    const [restCfg] = useStore<RestTimer>('rest.v1', { on: false, sec: 90 });
    const [reminders] = useStore<ReminderPreferencesValue>('reminders.v1', DEFAULT_REMINDERS);
    const sounded=React.useRef(0);
    useEffect(()=>{const unlock=()=>{if(reminders.sound)void unlockRestAudio()};document.addEventListener('click',unlock);return()=>document.removeEventListener('click',unlock)},[reminders.sound]);
    const [equipW] = useStore<EquipWeight[]>('equipw.v1', []);
    const [helpOpen, setHelpOpen] = useState(false);
    const [kgEdit, setKgEdit] = useState<number | null>(null); // set index of current exercise
    const [rating, setRating] = useState(7);
    const [feedback, setFeedback] = useState('');
    const [fbOpen, setFbOpen] = useState(false);
    const fbRef = React.useRef<HTMLTextAreaElement>(null);
    const now = useTicker(view !== 'rate');

    const planEx = day.exercises[Math.min(ei, day.exercises.length - 1)];
    const full = exerciseById(planEx.id);
    const img = sectionImg(full ? sectionOf(full.muscle) : 'כל הגוף');
    const curSets = exs[ei]?.sets ?? [];
    const totalSets = exs.reduce((n, e) => n + e.sets.length, 0);
    const doneSets = exs.reduce((n, e) => n + e.sets.filter((s) => s.done).length, 0);
    const allDone = doneSets === totalSets && totalSets > 0;
    const workoutClock = fmtClock(Math.max(0, Math.floor((now - started) / 1000)));
    const restLeft = Math.max(0, Math.ceil((restEnd - now) / 1000));

    const firstUndoneSet = (exIdx: number): number => {
        const sets = exs[exIdx]?.sets ?? [];
        const u = sets.findIndex((s) => !s.done);
        return u === -1 ? 0 : u;
    };

    const advance = () => {
        // Next undone set, walking forward through the workout (wraps to first undone).
        for (let i = ei; i < exs.length; i++) {
            const from = i === ei ? si : 0;
            for (let j = from; j < exs[i].sets.length; j++) {
                if (!exs[i].sets[j].done) { setEi(i); setSi(j); setPhase('idle'); return; }
            }
        }
        for (let i = 0; i < ei; i++) {
            for (let j = 0; j < exs[i].sets.length; j++) {
                if (!exs[i].sets[j].done) { setEi(i); setSi(j); setPhase('idle'); return; }
            }
        }
        setPhase('idle');
    };

    useEffect(() => {
        if (phase === 'rest' && restLeft <= 0) {
            if(sounded.current!==restEnd){sounded.current=restEnd;if(reminders.sound&&Date.now()-restEnd<10000)playRestChime();if(document.visibilityState==='visible')try{navigator.vibrate?.([150,80,150])}catch{}}
            advance();
        }
    }, [phase, restLeft]);

    const patchSet = (exIdx: number, setIdx: number, patch: Partial<{ kg: number; reps: number; done: boolean }>) => {
        setExs((prev) => prev.map((ex, i) => i === exIdx ? { ...ex, sets: ex.sets.map((s, j) => j === setIdx ? { ...s, ...patch } : s) } : ex));
    };


    const completeSet = () => {
        if(reminders.sound)void unlockRestAudio();
        patchSet(ei, si, { done: true });
        if (allDoneAfter(ei, si)) { setView('rate'); setPhase('idle'); return; }
        const rest = restCfg.on ? restCfg.sec : planEx.restSec;
        if (rest > 0) {
            setRestSec(rest);
            setRestEnd(Date.now() + rest * 1000);
            setPhase('rest');
        } else {
            advance();
        }
    };

    const allDoneAfter = (exIdx: number, setIdx: number): boolean =>
        exs.every((ex, i) => ex.sets.every((s, j) => s.done || (i === exIdx && j === setIdx)));

    const toggleSet = (exIdx: number, setIdx: number) => {
        const s = exs[exIdx].sets[setIdx];
        patchSet(exIdx, setIdx, { done: !s.done });
        if (!s.done && allDoneAfter(exIdx, setIdx)) { setView('rate'); setPhase('idle'); }
    };

    const addSet = (exIdx: number) => {
        setExs((prev) => prev.map((ex, i) => {
            if (i !== exIdx) return ex;
            const last = ex.sets[ex.sets.length - 1];
            const target = topOfRange(day.exercises[i].reps);
            return { ...ex, sets: [...ex.sets, { kg: last ? last.kg : prefill(ex.exerciseId), reps: last ? last.reps : target, done: false }] };
        }));
    };

    const removeSet = (exIdx: number, setIdx: number) => {
        setExs((prev) => prev.map((ex, i) => i === exIdx && ex.sets.length > 1 ? { ...ex, sets: ex.sets.filter((_, j) => j !== setIdx) } : ex));
        if (exIdx === ei && setIdx === si && curSets.length > 1) setSi(Math.min(si, curSets.length - 2));
    };

    const jumpExercise = (idx: number) => {
        setEi(idx);
        setSi(firstUndoneSet(idx));
        setPhase('idle');
        setView('exercise');
    };

    const restAdj = (d: number) => {
        setRestEnd((e) => Math.max(Date.now(), e + d * 1000));
        setRestSec((s) => Math.max(15, s + d));
    };

    const pause = () => {
        onPause({
            day, exs, ei, si,
            elapsedMs: Date.now() - started,
            restLeftMs: phase === 'rest' ? Math.max(0, restEnd - Date.now()) : 0,
            savedAt: new Date().toISOString(),
        });
    };

    const finish = (withFeedback: boolean) => {
        const dur = Math.max(1, Math.round((Date.now() - started) / 60000));
        const fb = withFeedback ? feedback.trim() : '';
        onFinish({
            id: uid(), date: todayKey(), startedAt: new Date(started).toISOString(),
            durationMin: dur, planDayLabel: day.label, focus: day.focus, exercises: exs,
            rating, feedback: fb || undefined,
        });
    };

    const nextUndoneLabel = (() => {
        for (let i = ei; i < exs.length; i++) {
            const from = i === ei ? si : 0;
            for (let j = from; j < exs[i].sets.length; j++) {
                if (!exs[i].sets[j].done) return i === ei ? `${exs[i].he} · סט ${j + 1}` : exs[i].he;
            }
        }
        return '';
    })();

    /* ---------- Rating view ---------- */
    if (view === 'rate') {
        return <div className="workout flex flex-col min-h-full">
            <div className="grow flex flex-col items-center justify-center gap-5 py-8">
                <motion.div initial={{ scale: 0.6, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={spring}
                    className="w-16 h-16 rounded-full grid place-items-center shadow-acc" style={{ background: 'linear-gradient(135deg, #cdf14c, #a3cf2e)' }}>
                    <Icon name="flag" size={28} className="text-accink" />
                </motion.div>
                <div className="text-center">
                    <h1 className="text-[24px] font-extrabold text-ink">איך היה האימון?</h1>
                    <p className="text-[13.5px] text-muted mt-1">דרג מ-1 עד 10 כדי שנתאים לך את ההמשך</p>
                </div>
                <div className="flex flex-col items-center gap-1">
                    <motion.span key={rating} initial={{ scale: 0.85, opacity: 0.5 }} animate={{ scale: 1, opacity: 1 }} transition={spring}
                        className="text-[64px] font-extrabold text-acc tabular-nums leading-none">{rating}</motion.span>
                    <AnimatePresence mode="wait">
                        <motion.span key={RATE_LABELS[rating]} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }} transition={easeOut}
                            className="text-[15px] font-bold text-ink">{RATE_LABELS[rating]}</motion.span>
                    </AnimatePresence>
                </div>
                <div className="w-full px-2" dir="ltr">
                    <input
                        type="range" min={1} max={10} step={1} value={rating}
                        onChange={(e) => setRating(Number(e.target.value))}
                        className="w-full h-2 rounded-full appearance-none bg-card2 outline-none [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-7 [&::-webkit-slider-thumb]:h-7 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-acc [&::-webkit-slider-thumb]:shadow-acc [&::-webkit-slider-thumb]:cursor-pointer"
                        aria-label="דירוג האימון"
                    />
                    <div className="flex justify-between mt-1.5 px-0.5">
                        {Array.from({ length: 10 }, (_, i) => i + 1).map((n) => (
                            <button key={n} onClick={() => setRating(n)}
                                className={`w-6 text-[12px] font-bold tabular-nums ${n === rating ? 'text-acc' : 'text-faint'}`}>{n}</button>
                        ))}
                    </div>
                    <div className="flex justify-between mt-1 px-0.5" dir="rtl">
                        <span className="text-[11px] text-faint">1 - קל מדי</span>
                        <span className="text-[11px] text-faint">10 - גבולי</span>
                    </div>
                </div>
                <Button className="w-full !min-h-[54px] !text-[17px] mt-2" onClick={() => { setFbOpen(true); setTimeout(() => fbRef.current?.focus({ preventScroll: true }), 450); }}>המשך</Button>
            </div>

            {/* Workout feedback, slides up after the rating */}
            <Sheet open={fbOpen} onClose={() => setFbOpen(false)} title="משהו שהמערכת צריכה לדעת?">
                <p className="text-[13px] text-muted leading-relaxed mb-3">איך הרגיש האימון, כאבים, תרגיל שהיה קל או קשה מדי - זה עוזר לנו להתאים לך את ההמשך ולדעת מה לשאול.</p>
                <textarea
                    ref={fbRef}
                    className="w-full box-border bg-input border border-hairline rounded-xl px-4 py-3.5 text-[16px] text-ink placeholder:text-faint outline-none focus:border-acc/70 focus:ring-2 focus:ring-acc/20 transition resize-none mb-3"
                    style={{ minHeight: 110 }}
                    placeholder="למשל: כאב קל במרפק ימין בסט האחרון, הסקוואט היה קל מדי…"
                    value={feedback}
                    onChange={(e) => setFeedback(e.target.value)}
                />
                <Button className="w-full !min-h-[50px]" onClick={() => finish(true)}>שמירה וסיום</Button>
                <button className="block mx-auto mt-3 text-[13.5px] text-muted underline underline-offset-4 decoration-hairline" onClick={() => finish(false)}>דלג וסיים</button>
            </Sheet>
        </div>;
    }

    /* ---------- Exercise list view (free navigation, pause, end) ---------- */
    if (view === 'list') {
        return <div className="workout flex flex-col min-h-full">
            <div className="flex items-center justify-between gap-3">
                <motion.button whileTap={{ scale: 0.9 }} transition={spring} className="w-10 h-10 rounded-full bg-card2 border border-hairline text-ink grid place-items-center" onClick={() => setView('exercise')} aria-label="חזרה לתרגיל">
                    <Icon name="back" size={20} />
                </motion.button>
                <h1 className="text-[20px] font-extrabold text-ink">{day.label}</h1>
                <span className="flex items-center gap-1.5 h-9 px-3 rounded-full bg-card2 border border-hairline text-[13px] font-bold text-ink tabular-nums">
                    <Icon name="timer" size={14} className="text-acc" />{workoutClock}
                </span>
            </div>
            <p className="text-[13px] text-muted">{doneSets} מתוך {totalSets} סטים הושלמו · הנתונים נשמרים גם אם תחליף תרגיל</p>

            <div className="flex flex-col gap-2 grow">
                {exs.map((ex, i) => {
                    const f = exerciseById(ex.exerciseId);
                    const done = ex.sets.filter((s) => s.done).length;
                    const complete = done === ex.sets.length;
                    return (
                        <motion.button
                            key={ex.exerciseId + i}
                            whileTap={{ scale: 0.98 }} transition={spring}
                            onClick={() => jumpExercise(i)}
                            className={`w-full flex items-center gap-3 rounded-2xl border p-3 text-start transition-colors ${i === ei ? 'bg-card2 border-acc/50' : 'bg-card border-hairline'}`}
                        >
                            <img className="w-[52px] h-[52px] rounded-xl object-cover shrink-0 bg-card2" src={sectionImg(f ? sectionOf(f.muscle) : 'כל הגוף')} alt="" loading="lazy" />
                            <span className="min-w-0 grow">
                                <strong className="block text-[15px] font-bold text-ink leading-snug">{ex.he}</strong>
                                <span className="block text-[12.5px] text-muted mt-0.5">{ex.en}</span>
                                <span className="flex gap-1 mt-1.5" dir="ltr">
                                    {ex.sets.map((s, j) => (
                                        <span key={j} className={`h-[5px] w-6 rounded-full ${s.done ? 'bg-acc' : 'bg-card2 border border-hairline'}`} />
                                    ))}
                                </span>
                            </span>
                            {complete
                                ? <span className="w-7 h-7 rounded-full bg-acc/15 border border-acc/25 grid place-items-center text-acc shrink-0"><Icon name="check" size={14} /></span>
                                : <span className="text-[12.5px] font-bold text-muted tabular-nums shrink-0">{done}/{ex.sets.length}</span>}
                        </motion.button>
                    );
                })}
            </div>

            <div className="flex gap-2.5 mt-2">
                <Button variant="secondary" className="flex-1" onClick={pause}><Icon name="pause" size={16} /> השהה אימון</Button>
                <Button className="flex-1" onClick={() => setView('rate')}><Icon name="flag" size={16} /> סיום אימון</Button>
            </div>
        </div>;
    }

    /* ---------- Exercise view ---------- */
    return <div className="workout flex flex-col min-h-full">
        {/* Top bar */}
        <div className="sticky top-0 z-20 -mx-4 px-4 pt-1 pb-2 bg-page/95 backdrop-blur-sm">
            <div className="flex items-center justify-between gap-2">
                <motion.button whileTap={{ scale: 0.9 }} transition={spring} className="w-10 h-10 rounded-full bg-card2 border border-hairline text-ink grid place-items-center" onClick={onCancel} aria-label="יציאה בלי שמירה">
                    <Icon name="x" size={20} />
                </motion.button>
                <span className="flex items-center gap-1.5 h-9 px-3.5 rounded-full bg-card2 border border-hairline text-[13.5px] font-bold text-ink tabular-nums">
                    <Icon name="timer" size={15} className="text-acc" />{workoutClock}
                </span>
                <div className="flex gap-2">
                    <motion.button whileTap={{ scale: 0.9 }} transition={spring} className="w-10 h-10 rounded-full bg-card2 border border-hairline text-ink grid place-items-center" onClick={pause} aria-label="השהה אימון">
                        <Icon name="pause" size={18} />
                    </motion.button>
                    <motion.button whileTap={{ scale: 0.9 }} transition={spring} className="w-10 h-10 rounded-full bg-card2 border border-hairline text-ink grid place-items-center" onClick={() => setView('list')} aria-label="רשימת התרגילים">
                        <Icon name="list" size={18} />
                    </motion.button>
                </div>
            </div>

            {/* Segmented progress bar */}
            <div className="flex gap-1 mt-2.5" dir="ltr">
                {exs.flatMap((ex, i) => ex.sets.map((s, j) => {
                    const isNow = i === ei && j === si;
                    return (
                        <span key={`${i}-${j}`} className="relative h-[5px] grow rounded-full bg-card2 overflow-hidden">
                            <motion.span
                                className="absolute inset-y-0 left-0 rounded-full bg-acc"
                                initial={false}
                                animate={{ width: s.done ? '100%' : isNow ? '50%' : '0%' }}
                                transition={easeOut}
                            />
                        </span>
                    );
                }))}
            </div>
        </div>

        <AnimatePresence mode="wait">
            {phase === 'rest' ? (
                <motion.div
                    key="rest"
                    initial={{ opacity: 0, scale: 0.96 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.98 }}
                    transition={easeOut}
                    className="grow flex flex-col items-center justify-center gap-4 py-10"
                >
                    <p className="text-[14px] font-semibold text-muted tracking-wide">מנוחה</p>
                    <div className="text-[72px] font-extrabold text-ink tabular-nums leading-none" key={restLeft}>{fmtClock(restLeft)}</div>
                    <div className="w-56 h-2 rounded-full bg-card2 overflow-hidden" dir="ltr">
                        <div className="h-full rounded-full bg-acc transition-[width] duration-1000 ease-linear" style={{ width: `${restSec ? (restLeft / restSec) * 100 : 0}%` }} />
                    </div>
                    {/* Rest length adjusters */}
                    <div className="flex items-center gap-3" dir="ltr">
                        <motion.button whileTap={{ scale: 0.9 }} transition={spring}
                            className="h-11 px-4 rounded-full bg-card2 border border-hairline text-ink text-[15px] font-bold tabular-nums"
                            onClick={() => restAdj(-15)} aria-label="הורד 15 שניות">−15</motion.button>
                        <motion.button whileTap={{ scale: 0.9 }} transition={spring}
                            className="h-11 px-4 rounded-full bg-card2 border border-hairline text-ink text-[15px] font-bold tabular-nums"
                            onClick={() => restAdj(15)} aria-label="הוסף 15 שניות">+15</motion.button>
                    </div>
                    {nextUndoneLabel && <p className="text-[14px] text-muted">הבא: <strong className="text-ink">{nextUndoneLabel}</strong></p>}
                    <Button className="mt-1 px-8" onClick={advance}>דלג על מנוחה</Button>
                </motion.div>
            ) : (
                <motion.div
                    key={`ex-${ei}`}
                    initial={{ opacity: 0, x: -22 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 16 }}
                    transition={easeOut}
                    className="grow flex flex-col mt-4"
                >
                    {/* Photo */}
                    <div className="relative h-[150px] rounded-2xl overflow-hidden border border-hairline shrink-0">
                        <img src={img} alt={planEx.he} className="absolute inset-0 w-full h-full object-cover" decoding="async" />
                        <div className="absolute inset-0" style={{ background: 'linear-gradient(180deg, rgba(14,16,24,0) 45%, rgba(14,16,24,0.55) 100%)' }} />
                        <motion.button
                            whileTap={{ scale: 0.93 }} transition={spring}
                            className="absolute bottom-3 left-3 flex items-center gap-1.5 h-9 px-3.5 rounded-full bg-black/45 backdrop-blur-sm border border-white/15 text-[13px] font-bold text-ink"
                            onClick={() => setHelpOpen(true)}
                        >
                            <Icon name="question" size={16} className="text-acc" /> הסבר
                        </motion.button>
                    </div>

                    {/* Title + exercise navigation */}
                    <div className="flex flex-col gap-2 mt-3">
                        <div className="min-w-0 w-full" style={{ overflowWrap: 'anywhere' }}>
                            <h1 className="text-[22px] font-extrabold text-ink leading-tight">{planEx.he}</h1>
                            <p className="text-[13px] text-muted mt-0.5">{planEx.en} · יעד: {planEx.reps} חזרות</p>
                        </div>
                        <div className="flex items-center gap-1.5 shrink-0 pt-1">
                            <motion.button whileTap={{ scale: 0.88 }} transition={spring} disabled={ei === 0}
                                className="w-9 h-9 rounded-full bg-card2 border border-hairline text-ink grid place-items-center disabled:opacity-35"
                                onClick={() => jumpExercise(ei - 1)} aria-label="תרגיל קודם">
                                <Icon name="back" size={16} />
                            </motion.button>
                            <span className="text-[12.5px] font-bold text-muted tabular-nums px-1">{ei + 1}/{day.exercises.length}</span>
                            <motion.button whileTap={{ scale: 0.88 }} transition={spring} disabled={ei === day.exercises.length - 1}
                                className="w-9 h-9 rounded-full bg-card2 border border-hairline text-ink grid place-items-center disabled:opacity-35"
                                onClick={() => jumpExercise(ei + 1)} aria-label="תרגיל הבא">
                                <Icon name="fwd" size={16} />
                            </motion.button>
                        </div>
                    </div>

                    {/* Editable set rows */}
                    <div className="flex flex-col gap-2 mt-3">
                        {curSets.map((s, j) => {
                            const isCur = j === si && !s.done;
                            return (
                                <motion.div
                                    key={j}
                                    layout
                                    initial={{ opacity: 0, y: 8 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={easeOut}
                                    className={`flex items-center gap-2 rounded-2xl border p-2.5 ${s.done ? 'bg-acc/10 border-acc/30' : isCur ? 'bg-card2 border-acc' : 'bg-card border-hairline'}`}
                                >
                                    <motion.button
                                        whileTap={{ scale: 0.85 }} transition={spring}
                                        onClick={() => toggleSet(ei, j)}
                                        aria-label={s.done ? 'בטל סימון סט' : 'סמן סט כבוצע'}
                                        className={`w-8 h-8 rounded-full grid place-items-center shrink-0 border text-[13px] font-extrabold tabular-nums ${s.done ? 'bg-acc text-accink border-acc' : 'bg-card border-hairline text-muted'}`}
                                    >
                                        {s.done ? <Icon name="check" size={15} /> : j + 1}
                                    </motion.button>

                                    {/* Weight: auto-filled, changed only by a pointed tap */}
                                    <button
                                        onClick={() => setKgEdit(j)}
                                        className={`flex flex-col items-center rounded-xl px-2.5 py-1 min-w-[64px] ${s.done ? '' : 'bg-input border border-hairline'}`}
                                        aria-label="שנה משקל"
                                    >
                                        <span className={`text-[15px] font-extrabold tabular-nums ${s.done ? 'text-acc' : 'text-ink'}`}>{s.kg > 0 ? s.kg : '—'}</span>
                                        <span className={`text-[10.5px] font-semibold ${s.done ? 'text-acc/70' : 'text-muted'}`}>{s.kg > 0 ? 'ק״ג' : 'משקל גוף'}</span>
                                    </button>

                                    <span className="grow" />

                                    {/* Reps stepper */}
                                    {s.done ? (
                                        <span className="text-[14px] font-bold text-acc tabular-nums px-2">{s.reps} חזרות</span>
                                    ) : (
                                        <div className="flex items-center gap-1 bg-input border border-hairline rounded-xl p-1" dir="ltr">
                                            <motion.button whileTap={{ scale: 0.85 }} transition={spring} className="w-7 h-7 rounded-lg bg-card2 text-ink grid place-items-center" onClick={() => patchSet(ei, j, { reps: Math.max(1, s.reps - 1) })} aria-label="פחות חזרה">
                                                <Icon name="minus" size={14} />
                                            </motion.button>
                                            <span className="w-8 text-center text-[15px] font-extrabold text-ink tabular-nums">{s.reps}</span>
                                            <motion.button whileTap={{ scale: 0.85 }} transition={spring} className="w-7 h-7 rounded-lg bg-card2 text-ink grid place-items-center" onClick={() => patchSet(ei, j, { reps: Math.min(60, s.reps + 1) })} aria-label="עוד חזרה">
                                                <Icon name="plus" size={14} />
                                            </motion.button>
                                        </div>
                                    )}

                                    {curSets.length > 1 && !s.done && (
                                        <motion.button whileTap={{ scale: 0.85 }} transition={spring} className="w-8 h-8 rounded-full text-faint grid place-items-center" onClick={() => removeSet(ei, j)} aria-label="הסר סט">
                                            <Icon name="trash" size={15} />
                                        </motion.button>
                                    )}
                                </motion.div>
                            );
                        })}

                        <motion.button
                            whileTap={{ scale: 0.98 }} transition={spring}
                            onClick={() => addSet(ei)}
                            className="w-full min-h-[44px] rounded-2xl border border-dashed border-hairline text-muted text-[13.5px] font-bold flex items-center justify-center gap-1.5"
                        >
                            <Icon name="plus" size={15} /> הוסף סט
                        </motion.button>
                    </div>

                    {/* Phase stage */}
                    <div className="grow flex flex-col justify-end mt-4">
                        <AnimatePresence mode="wait">
                            {phase === 'idle' && (
                                <motion.div key="idle" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={easeOut}>
                                    <p className="text-[13.5px] text-muted mb-3">מתחילים בזמן שלך. מדווחים רק בסיום הסט.</p>
                                    <Button className="w-full !min-h-[54px] !text-[17px]" onClick={completeSet} disabled={curSets[si]?.done}>סיימתי את הסט</Button>
                                </motion.div>
                            )}
                        </AnimatePresence>
                        <div className="flex items-center justify-between mt-3.5">
                            <p className="text-[12px] text-faint">{doneSets} סטים הושלמו מתוך {totalSets}</p>
                            <button className="flex items-center gap-1 text-[12.5px] font-semibold text-muted" onClick={() => setView('rate')}>
                                <Icon name="flag" size={13} /> סיום אימון
                            </button>
                        </div>
                    </div>
                </motion.div>
            )}
        </AnimatePresence>

        {/* Help sheet: two sections - how to perform + how it should feel */}
        <Sheet open={helpOpen && !!full} onClose={() => setHelpOpen(false)} title={full ? `${full.he} · ${full.en}` : ''}>
            {full && <ExerciseExplain ex={full} />}
        </Sheet>

        {/* Weight editor: opened only by a pointed tap on a set's weight */}
        <Sheet open={kgEdit !== null} onClose={() => setKgEdit(null)} title={kgEdit !== null ? `משקל · סט ${kgEdit + 1}` : ''}>
            {kgEdit !== null && curSets[kgEdit] && (() => {
                const s = curSets[kgEdit];
                const setKg = (kg: number) => patchSet(ei, kgEdit, { kg: Math.max(0, Math.round(kg * 4) / 4) });
                return <>
                    <div className="flex items-center justify-center gap-3 mb-4" dir="ltr">
                        <motion.button whileTap={{ scale: 0.88 }} transition={spring} className="w-11 h-11 rounded-xl bg-card2 border border-hairline text-ink grid place-items-center" onClick={() => setKg(s.kg - 2.5)} aria-label="פחות משקל">
                            <Icon name="minus" size={18} />
                        </motion.button>
                        <div className="flex flex-col items-center min-w-[110px]">
                            <span className="text-[36px] font-extrabold text-ink tabular-nums leading-none">{s.kg > 0 ? s.kg : '0'}</span>
                            <span className="text-[12px] font-semibold text-muted mt-1">{s.kg > 0 ? 'ק״ג' : 'משקל גוף'}</span>
                        </div>
                        <motion.button whileTap={{ scale: 0.88 }} transition={spring} className="w-11 h-11 rounded-xl bg-card2 border border-hairline text-ink grid place-items-center" onClick={() => setKg(s.kg + 2.5)} aria-label="עוד משקל">
                            <Icon name="plus" size={18} />
                        </motion.button>
                    </div>
                    {equipW.length > 0 && <>
                        <p className="text-[12.5px] font-semibold text-muted mb-2">מהציוד שלך:</p>
                        <div className="flex flex-wrap gap-2 mb-4">
                            {equipW.map((w) => (
                                <button key={w.id} onClick={() => setKg(w.kg)}
                                    className={`rounded-full px-3.5 min-h-[40px] text-[13.5px] font-bold border transition-colors ${s.kg === w.kg ? 'bg-acc text-accink border-acc' : 'bg-card2 text-ink border-hairline'}`}>
                                    {w.name} · {w.kg}
                                </button>
                            ))}
                        </div>
                    </>}
                    <button className="text-[13.5px] font-semibold text-muted underline underline-offset-4 decoration-hairline" onClick={() => setKg(0)}>משקל גוף בלבד</button>
                </>;
            })()}
        </Sheet>
    </div>;
}
