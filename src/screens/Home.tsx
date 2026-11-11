// Plan home, FitBuddy layout: streak header, lime program card with progress
// ring, stacked week day cards with photos, and a variety section.
// Design system: Tailwind utilities + ds primitives + Framer Motion (our own code).
import React, { useMemo } from 'react';
import { motion } from '../vendor/framer-motion.vendor.mjs';
import { Profile, Plan, WorkoutLog, WorkoutSession, dayWeekdays, WEEKDAY_HE, programName, programWeek, PROGRAM_WEEKS, weekKey, sectionOf, exerciseById } from '../data';
import { todayKey } from '../store';
import { Icon, Ring } from '../ui';
import { sectionImg, CAT_IMGS } from '../images';
import { staggerParent, spring } from '../ds';

interface Props {
    profile: Profile;
    plan: Plan;
    logs: WorkoutLog[];
    skips: Record<string, number>;
    paused: WorkoutSession | null;
    onResume: () => void;
    onDiscardPaused: () => void;
    onOpenDay: (i: number) => void;
    onBonus: (kind: 'home' | 'gym') => void;
    onLibrary: () => void;
    goProfile: () => void;
}

export function Home({ profile, plan, logs, skips, paused, onResume, onDiscardPaused, onOpenDay, onBonus, onLibrary, goProfile }: Props) {
    const wk = weekKey();
    const doneThisWeek = logs.filter((l) => l.date >= wk).length;
    const skippedThisWeek = skips[wk] || 0;
    const completed = Math.min(plan.days.length, doneThisWeek + skippedThisWeek);
    const nextIdx = completed % plan.days.length;
    const weekdays = dayWeekdays(plan);
    const weekPct = plan.days.length ? completed / plan.days.length : 0;

    const streak = useMemo(() => {
        let s = 0;
        const dates = new Set(logs.map((l) => l.date));
        for (let i = 0; i < 90; i++) {
            const d = new Date(); d.setDate(d.getDate() - i);
            if (dates.has(todayKey(d))) s++;
            else if (i > 0) break;
        }
        return s;
    }, [logs]);

    const hour = new Date().getHours();
    const greet = hour < 12 ? 'בוקר טוב' : hour < 17 ? 'צהריים טובים' : hour < 21 ? 'ערב טוב' : 'לילה טוב';
    const dateStr = `יום ${WEEKDAY_HE[new Date().getDay()]}, ${new Date().getDate()}.${new Date().getMonth() + 1}`;

    return <div className="screen">
        <motion.header
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.25, ease: 'easeOut' }}
            className="flex items-start justify-between gap-3 pt-1"
        >
            <div>
                <p className="text-[13px] text-muted">{dateStr}</p>
                <h1 className="text-[26px] font-extrabold text-ink leading-tight mt-0.5">{greet}, {profile.name}</h1>
            </div>
            <div className="flex items-center gap-2 shrink-0">
                <span className="flex items-center gap-1.5 h-10 px-3 rounded-full bg-card2 border border-hairline text-ink">
                    <Icon name="flame" size={17} className="text-acc" />
                    <b className="text-[14px]">{streak}</b>
                </span>
                <motion.button
                    whileTap={{ scale: 0.9 }}
                    transition={spring}
                    onClick={goProfile}
                    aria-label="הגדרות"
                    className="w-10 h-10 rounded-full bg-card2 border border-hairline text-ink grid place-items-center"
                >
                    <Icon name="sliders" size={20} />
                </motion.button>
            </div>
        </motion.header>

        <motion.section
            initial={{ opacity: 0, scale: 0.97 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1], delay: 0.08 }}
            className="relative overflow-hidden rounded-3xl p-5 mt-4 flex items-center justify-between gap-4"
            style={{ background: 'linear-gradient(135deg, #cdf14c 0%, #b8e33a 55%, #a3cf2e 100%)', boxShadow: '0 10px 30px rgba(205,241,76,0.28)' }}
        >
            <div className="text-accink min-w-0">
                <p className="text-[12px] font-bold opacity-70 tracking-wide">התוכנית שלך</p>
                <h2 className="text-[21px] font-extrabold leading-snug mt-1">{programName(profile)}</h2>
                <p className="text-[13px] font-semibold opacity-75 mt-1">שבוע {programWeek(profile)}/{PROGRAM_WEEKS}</p>
            </div>
            <div className="shrink-0">
                <Ring pct={weekPct} onLime color="#1d2505" label={`${Math.round(weekPct * 100)}%`} sub={`${completed}/${plan.days.length} אימונים`} size={104} />
            </div>
        </motion.section>

        {/* Paused workout: resume where you stopped, clock excluded while paused */}
        {paused && (
            <motion.section
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1], delay: 0.1 }}
                className="rounded-2xl border border-acc/50 p-4 mt-4 flex items-center gap-3"
                style={{ background: 'linear-gradient(160deg, rgba(205,241,76,0.12), rgba(205,241,76,0.03))' }}
            >
                <span className="w-11 h-11 rounded-xl bg-acc text-accink grid place-items-center shrink-0 shadow-acc">
                    <Icon name="pause" size={20} />
                </span>
                <span className="min-w-0 grow">
                    <strong className="block text-[15px] font-extrabold text-ink">אימון מושהה: {paused.day.label}</strong>
                    <span className="block text-[12.5px] text-muted mt-0.5">
                        {paused.exs.reduce((n, e) => n + e.sets.filter((s) => s.done).length, 0)}/{paused.exs.reduce((n, e) => n + e.sets.length, 0)} סטים · {Math.floor(paused.elapsedMs / 60000)} דקות · הנתונים שמורים
                    </span>
                </span>
                <span className="flex flex-col gap-1.5 shrink-0">
                    <motion.button whileTap={{ scale: 0.94 }} transition={spring} onClick={onResume}
                        className="h-9 px-4 rounded-full bg-acc text-accink text-[13px] font-bold shadow-acc">המשך</motion.button>
                    <button onClick={onDiscardPaused} className="text-[11.5px] font-semibold text-muted underline underline-offset-2 decoration-hairline">מחיקה</button>
                </span>
            </motion.section>
        )}

        <motion.div variants={staggerParent(0.06, 0.12)} initial="initial" animate="animate" className="mt-6">
            <h2 className="text-[17px] font-extrabold text-ink mb-3">האימונים שלך השבוע</h2>
            {/* Timeline rail: done = lime check, next = hollow ring, later = dot */}
            <div className="relative">
                <span className="absolute top-5 bottom-5 right-[13px] w-[2px] rounded bg-hairline" aria-hidden="true" />
                <div className="flex flex-col gap-3">
                    {plan.days.map((d, i) => {
                        const first = exerciseById(d.exercises[0]?.id || '');
                        const img = sectionImg(first ? sectionOf(first.muscle) : 'כל הגוף');
                        const isDone = i < completed;
                        const isNext = i === nextIdx && !isDone;
                        return <motion.div
                            key={i}
                            variants={{ initial: { opacity: 0, y: 12 }, animate: { opacity: 1, y: 0, transition: { duration: 0.22, ease: [0.22, 1, 0.36, 1] } } }}
                            className="relative pr-9"
                        >
                            {/* Rail node */}
                            {isDone ? (
                                <span className="absolute right-0 top-1/2 -translate-y-1/2 z-10 w-7 h-7 rounded-full bg-acc text-accink grid place-items-center shadow-acc">
                                    <Icon name="check" size={15} />
                                </span>
                            ) : isNext ? (
                                <span className="absolute right-[3px] top-1/2 -translate-y-1/2 z-10 w-[22px] h-[22px] rounded-full border-2 border-acc bg-page" />
                            ) : (
                                <span className="absolute right-[7px] top-1/2 -translate-y-1/2 z-10 w-3.5 h-3.5 rounded-full bg-card2 border border-hairline" />
                            )}
                            <motion.button
                                whileTap={{ scale: 0.98 }}
                                transition={spring}
                                onClick={() => onOpenDay(i)}
                                className={`relative w-full h-[104px] rounded-2xl overflow-hidden border text-start ${isNext ? 'border-acc shadow-acc' : 'border-hairline'}`}
                            >
                                <img src={img} alt="" loading="lazy" decoding="async" className={`absolute inset-0 w-full h-full object-cover ${isDone ? 'opacity-50' : ''}`} />
                                <span className="absolute inset-0" style={{ background: 'linear-gradient(270deg, rgba(14,16,24,0.96) 22%, rgba(14,16,24,0.62) 55%, rgba(14,16,24,0.12) 100%)' }} />
                                <span className="absolute bottom-3.5 right-4 left-4">
                                    <span className="block text-[12px] font-semibold text-ink/70">{`יום ${WEEKDAY_HE[weekdays[i] ?? 0]}`}</span>
                                    <strong className="block text-[19px] font-extrabold text-ink leading-snug">{d.label}</strong>
                                    <span className="block text-[12px] text-ink/70 mt-0.5">{d.focus} · {d.exercises.length} תרגילים</span>
                                </span>
                                {isNext && (
                                    <span className="absolute bottom-3.5 left-3.5 bg-acc text-accink text-[12px] font-bold rounded-full px-3 py-1.5 shadow-acc">
                                        האימון הבא
                                    </span>
                                )}
                            </motion.button>
                        </motion.div>;
                    })}
                </div>
            </div>
        </motion.div>

        <motion.div variants={staggerParent(0.06, 0.1)} initial="initial" animate="animate" className="mt-7">
            <h2 className="text-[17px] font-extrabold text-ink mb-3">מרגיש צורך לגוון?</h2>
            <div className="grid grid-cols-3 gap-2.5">
                {[
                    { img: CAT_IMGS.home, label: 'אימונים ביתיים', onClick: () => onBonus('home') },
                    { img: CAT_IMGS.gym, label: 'אתגרים לחדר כושר', onClick: () => onBonus('gym') },
                    { img: CAT_IMGS.library, label: 'ספריית התרגילים', onClick: onLibrary },
                ].map((v) => (
                    <motion.button
                        key={v.label}
                        variants={{ initial: { opacity: 0, y: 12 }, animate: { opacity: 1, y: 0, transition: { duration: 0.22, ease: [0.22, 1, 0.36, 1] } } }}
                        whileTap={{ scale: 0.95 }}
                        transition={spring}
                        onClick={v.onClick}
                        className="relative aspect-[3/4] rounded-2xl overflow-hidden border border-hairline"
                    >
                        <img src={v.img} alt={v.label} loading="lazy" decoding="async" className="absolute inset-0 w-full h-full object-cover" />
                        <span className="absolute inset-0" style={{ background: 'linear-gradient(180deg, rgba(14,16,24,0) 35%, rgba(14,16,24,0.85) 100%)' }} />
                        <span className="absolute bottom-2.5 inset-x-2 text-[12.5px] font-bold text-ink leading-tight text-center">{v.label}</span>
                    </motion.button>
                ))}
            </div>
        </motion.div>

        <p className="text-center text-[12px] text-faint mt-6">{plan.splitName} · {plan.summary}</p>
    </div>;
}
