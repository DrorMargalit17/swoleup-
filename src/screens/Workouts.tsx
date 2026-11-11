// Workouts tab container: plan home, day view, active workout, exercise
// library, finish screen, paused-session resume, skips and plan persistence.
import React, { useEffect, useState } from 'react';
import { Profile, Plan, PlanDay, WorkoutLog, ProgressEntry, WorkoutSession, EquipWeight, equipTagOf, nextWeightSuggestion, weekKey, dayWeekdays, bonusDay } from '../data';
import { useStore, todayKey, capLogs } from '../store';
import { Home } from './Home';
import { DayView } from './DayView';
import { Workout } from './Workout';
import { Library } from './Library';
import { Icon } from '../ui';
import { motion } from '../vendor/framer-motion.vendor.mjs';
import { Button, spring, easeOut } from '../ds';
import { exerciseById, sectionOf } from '../data';
import { sectionImg } from '../images';

type View =
    | { name: 'home' }
    | { name: 'day'; idx: number }
    | { name: 'workout'; day: PlanDay; resume: boolean }
    | { name: 'library' };

export function Workouts({ profile, plan, goProfile }: { profile: Profile; plan: Plan; goProfile: () => void }) {
    const [logs, setLogs] = useStore<WorkoutLog[]>('logs.v1', []);
    const [progress, setProgress] = useStore<Record<string, ProgressEntry>>('progress.v1', {});
    const [skips, setSkips] = useStore<Record<string, number>>('skips.v1', {});
    const [localPlan, setLocalPlan] = useStore<Plan | null>('plan.v1', null);
    const [session, setSession] = useStore<WorkoutSession | null>('session.v1', null);
    const [equipW] = useStore<EquipWeight[]>('equipw.v1', []);
    const [view, setView] = useState<View>({ name: 'home' });
    const [finishInfo, setFinishInfo] = useState<{ log: WorkoutLog; suggestions: { he: string; kg: number }[] } | null>(null);

    // Each sub-view starts at the top; the shared .content scroller keeps the
    // previous scroll position otherwise (e.g. circuit header was cut off).
    useEffect(() => {
        document.querySelector('.content')?.scrollTo({ top: 0 });
    }, [view.name, finishInfo]);

    const effectivePlan = localPlan && (localPlan as Plan).version === 2 ? localPlan : plan;
    const weekdays = dayWeekdays(effectivePlan);

    // Weight auto-fill: last logged for the exercise, else the matching
    // equipment weight from settings, else bodyweight (0).
    const prefill = (exId: string): number => {
        const p = progress[exId];
        if (p && p.kg > 0) return p.kg;
        for (const log of logs) {
            const ex = log.exercises.find((e) => e.exerciseId === exId);
            if (ex) {
                const best = Math.max(0, ...ex.sets.filter((s) => s.done).map((s) => s.kg));
                if (best > 0) return best;
            }
        }
        const tag = equipTagOf(exId);
        if (tag) {
            const w = equipW.find((x) => x.name === tag);
            if (w && w.kg > 0) return w.kg;
        }
        return 0;
    };

    const handleFinish = (log: WorkoutLog) => {
        const suggestions: { he: string; kg: number }[] = [];
        const newProgress = { ...progress };
        log.exercises.forEach((ex) => {
            const planEx = (view.name === 'workout' ? view.day : effectivePlan.days[0]).exercises.find((e) => e.id === ex.exerciseId);
            const sug = nextWeightSuggestion(ex.exerciseId, planEx ? planEx.reps : '10-12', ex.sets);
            const best = Math.max(0, ...ex.sets.filter((s) => s.done).map((s) => s.kg));
            if (best > 0) newProgress[ex.exerciseId] = { kg: sug ?? best, updatedAt: todayKey() };
            if (sug !== null) suggestions.push({ he: ex.he, kg: sug });
        });
        setProgress(newProgress);
        setLogs(capLogs([log, ...logs]));
        setSession(null);
        setView({ name: 'home' });
        setFinishInfo({ log, suggestions });
    };

    const pauseWorkout = (s: WorkoutSession) => {
        setSession(s);
        setView({ name: 'home' });
    };

    const tooEasy = () => {
        if (!finishInfo) return;
        const bumped = { ...progress };
        finishInfo.log.exercises.forEach((ex) => {
            const best = Math.max(0, ...ex.sets.filter((s) => s.done).map((s) => s.kg));
            if (best > 0) bumped[ex.exerciseId] = { kg: Math.round((best + 5) * 2) / 2, updatedAt: todayKey(), easyBump: true };
        });
        setProgress(bumped);
        setFinishInfo(null);
    };

    const skipDay = (idx: number) => {
        const wk = weekKey();
        setSkips({ ...skips, [wk]: (skips[wk] || 0) + 1 });
        const next = (idx + 1) % effectivePlan.days.length;
        setView({ name: 'day', idx: next });
    };

    const updateDay = (idx: number, d: PlanDay) => {
        setLocalPlan({
            ...effectivePlan,
            days: effectivePlan.days.map((x, i) => (i === idx ? d : x)),
        });
    };

    if (finishInfo) {
        const flog = finishInfo.log;
        const doneSets = flog.exercises.reduce((n, e) => n + e.sets.filter((s) => s.done).length, 0);
        const totalKg = Math.round(flog.exercises.reduce((n, e) => n + e.sets.filter((s) => s.done).reduce((m, s) => m + s.kg * s.reps, 0), 0));
        const kcal = Math.max(1, Math.round(flog.durationMin * 6));
        const sections = Array.from(new Set(flog.exercises.map((e) => {
            const full = exerciseById(e.exerciseId);
            return full ? sectionOf(full.muscle) : 'כל הגוף';
        }))).slice(0, 4);
        const share = async () => {
            const text = `סיימתי ${flog.planDayLabel}: ${doneSets} סטים, ${totalKg.toLocaleString()} ק״ג, ${flog.durationMin} דקות`;
            try {
                if (navigator.share) await navigator.share({ title: 'סיכום האימון', text });
                else await navigator.clipboard.writeText(text);
            } catch { /* user dismissed */ }
        };
        return <div className="screen">
            <div className="flex items-center justify-between">
                <motion.button whileTap={{ scale: 0.9 }} transition={spring} className="w-10 h-10 rounded-full bg-card2 border border-hairline text-ink grid place-items-center" onClick={() => setFinishInfo(null)} aria-label="חזרה">
                    <Icon name="back" size={20} />
                </motion.button>
                <h1 className="text-[20px] font-extrabold text-ink">סיכום האימון</h1>
                <motion.button whileTap={{ scale: 0.9 }} transition={spring} className="w-10 h-10 rounded-full bg-card2 border border-hairline text-ink grid place-items-center" onClick={share} aria-label="שתף סיכום">
                    <Icon name="share" size={18} />
                </motion.button>
            </div>

            {/* Celebration */}
            <div className="flex flex-col items-center mt-4">
                <motion.div
                    initial={{ scale: 0, rotate: -30 }}
                    animate={{ scale: 1, rotate: 0 }}
                    transition={{ type: 'spring', stiffness: 300, damping: 17, delay: 0.1 }}
                    className="w-20 h-20 rounded-full grid place-items-center shadow-acc"
                    style={{ background: 'linear-gradient(135deg, #cdf14c, #a3cf2e)' }}
                >
                    <motion.span initial={{ opacity: 0, scale: 0.4 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.35, ...spring }} className="text-accink">
                        <Icon name="check" size={40} />
                    </motion.span>
                </motion.div>
                <motion.h2 initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3, ...easeOut }} className="text-[24px] font-extrabold text-ink mt-4">
                    {flog.planDayLabel}
                </motion.h2>
                {flog.rating !== undefined && (
                    <motion.span initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.38 }}
                        className="mt-2 h-8 px-3.5 rounded-full bg-acc/15 border border-acc/25 text-acc text-[13px] font-bold inline-flex items-center gap-1.5">
                        <Icon name="star" size={14} /> דירגת {flog.rating}/10
                    </motion.span>
                )}
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.4 }} className="flex gap-2 mt-3">
                    {sections.map((sec) => (
                        <span key={sec} className="w-11 h-11 rounded-xl overflow-hidden border border-hairline">
                            <img src={sectionImg(sec)} alt={sec} className="w-full h-full object-cover" loading="lazy" decoding="async" />
                        </span>
                    ))}
                </motion.div>
            </div>

            {/* Stats */}
            <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.45, ...easeOut }} className="grid grid-cols-3 gap-2.5 mt-5">
                {[
                    { v: String(kcal), l: 'קלוריות שנשרפו' },
                    { v: totalKg.toLocaleString(), l: 'סה״כ ק״ג' },
                    { v: String(doneSets), l: 'סה״כ סטים' },
                ].map((x) => (
                    <div key={x.l} className="bg-card border border-hairline rounded-2xl py-4 flex flex-col items-center gap-1">
                        <strong className="text-[22px] font-extrabold text-acc tabular-nums">{x.v}</strong>
                        <span className="text-[11px] text-muted text-center leading-tight">{x.l}</span>
                    </div>
                ))}
            </motion.div>

            {/* Exercises */}
            <h3 className="text-[16px] font-extrabold text-ink mt-6">{flog.exercises.length} תרגילים:</h3>
            <motion.div variants={{ animate: { transition: { staggerChildren: 0.05, delayChildren: 0.5 } } }} initial="initial" animate="animate" className="flex flex-col gap-2">
                {flog.exercises.map((ex) => {
                    const full = exerciseById(ex.exerciseId);
                    const img = sectionImg(full ? sectionOf(full.muscle) : 'כל הגוף');
                    return <motion.div key={ex.exerciseId}
                        variants={{ initial: { opacity: 0, y: 10 }, animate: { opacity: 1, y: 0, transition: easeOut } }}
                        className="flex items-center gap-3 bg-card border border-hairline rounded-2xl p-3">
                        <img className="w-[52px] h-[52px] rounded-xl object-cover shrink-0 bg-card2" src={img} alt={ex.he} loading="lazy" decoding="async" />
                        <div className="min-w-0 grow">
                            <strong className="block text-[15px] font-bold text-ink">{ex.he}</strong>
                            <div className="flex flex-wrap gap-x-3 gap-y-0.5 mt-1">
                                {ex.sets.filter((st) => st.done).map((st, i) => (
                                    <span key={i} className="text-[12px] text-muted tabular-nums">{st.reps} חזרות{st.kg > 0 ? ` · ${st.kg} ק״ג` : ''}</span>
                                ))}
                            </div>
                        </div>
                        <span className="w-7 h-7 rounded-full bg-acc/15 border border-acc/25 grid place-items-center text-acc shrink-0"><Icon name="check" size={14} /></span>
                    </motion.div>;
                })}
            </motion.div>

            {finishInfo.suggestions.length > 0 && (
                <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.6, ...easeOut }}
                    className="rounded-2xl p-4 mt-4 border border-acc/30" style={{ background: 'linear-gradient(160deg, rgba(205,241,76,0.10), rgba(205,241,76,0.02))' }}>
                    <h2 className="text-[16px] font-extrabold text-ink mb-2.5">באימון הבא תנסה</h2>
                    {finishInfo.suggestions.map((sg, i) => (
                        <div key={i} className="flex items-center justify-between py-1.5">
                            <span className="text-[14px] text-ink">{sg.he}</span>
                            <strong className="text-[14px] font-extrabold text-acc tabular-nums">{sg.kg} ק״ג (+2.5)</strong>
                        </div>
                    ))}
                    <p className="text-[12px] text-muted mt-2 leading-relaxed">הגעת לקצה טווח החזרות בכל הסטים, סימן שהגיע הזמן להעלות.</p>
                </motion.div>
            )}

            <div className="mt-6 flex flex-col gap-2.5">
                <p className="text-center text-[13px] text-muted">האימון היה קל מדי?</p>
                <Button variant="secondary" className="w-full" onClick={tooEasy}>כן, תעלו לי עומס (+5 ק״ג)</Button>
                <Button className="w-full !min-h-[54px] !text-[17px]" onClick={() => setFinishInfo(null)}>מעולה, סיימתי</Button>
            </div>
        </div>;
    }

    if (view.name === 'workout') {
        return <Workout
            day={view.day}
            prefill={prefill}
            resume={view.resume ? session : null}
            onCancel={() => { setSession(null); setView({ name: 'home' }); }}
            onFinish={handleFinish}
            onPause={pauseWorkout}
        />;
    }

    if (view.name === 'library') {
        return <Library onBack={() => setView({ name: 'home' })} />;
    }

    if (view.name === 'day') {
        const day = effectivePlan.days[view.idx % effectivePlan.days.length];
        return <DayView
            day={day}
            weekday={weekdays[view.idx % effectivePlan.days.length] ?? 0}
            sessionMin={profile.sessionMin}
            onBack={() => setView({ name: 'home' })}
            onStart={() => { setSession(null); setView({ name: 'workout', day, resume: false }); }}
            onSkip={() => skipDay(view.idx)}
            onUpdateDay={(d) => updateDay(view.idx, d)}
        />;
    }

    return <Home
        profile={profile}
        plan={effectivePlan}
        logs={logs}
        skips={skips}
        paused={session}
        onResume={() => { if (session) setView({ name: 'workout', day: session.day, resume: true }); }}
        onDiscardPaused={() => setSession(null)}
        onOpenDay={(i) => setView({ name: 'day', idx: i })}
        onBonus={(kind) => { setSession(null); setView({ name: 'workout', day: bonusDay(kind), resume: false }); }}
        onLibrary={() => setView({ name: 'library' })}
        goProfile={goProfile}
    />;
}
