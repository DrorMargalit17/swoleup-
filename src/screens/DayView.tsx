// Day view, FitBuddy layout: hero photo with the day title, muscle-group
// sections with add buttons, exercise cards with thumbnails, and the big
// lime start pill with a skip link. Design system: Tailwind + ds + motion.
import React, { useMemo, useState } from 'react';
import { motion } from '../vendor/framer-motion.vendor.mjs';
import { PlanDay, PlanExercise, Exercise, EXERCISES, exerciseById, sectionOf, SECTION_ORDER, WEEKDAY_HE, topOfRange } from '../data';
import { Icon } from '../ui';
import { sectionImg, HERO_IMG } from '../images';
import { Sheet, Button, staggerParent, spring } from '../ds';
import { ExerciseExplain } from '../explain';
import { isHoldExercise, swapPrescription } from '../trainingSwap';

interface Props {
    day: PlanDay;
    weekday: number;
    sessionMin: number;
    onBack: () => void;
    onStart: () => void;
    onSkip: () => void;
    onUpdateDay: (d: PlanDay) => void;
}

const DIFF_LABEL = ['', 'קל', 'קל', 'בינוני', 'מתקדם', 'מתקדם מאוד'];
const EQUIP_LABEL = (eq: string) => eq === 'home' ? 'בית' : eq === 'gym' ? 'חדר כושר' : 'בית/חדר כושר';

export function DayView({ day, weekday, sessionMin, onBack, onStart, onSkip, onUpdateDay }: Props) {
    const [detail, setDetail] = useState<number | null>(null);
    const [addSection, setAddSection] = useState<string | null>(null);
    const [swapIdx, setSwapIdx] = useState<number | null>(null);
    const [confirmSkip, setConfirmSkip] = useState(false);

    const sections = useMemo(() => {
        const map = new Map<string, { ex: PlanExercise; idx: number }[]>();
        day.exercises.forEach((e, idx) => {
            const full = exerciseById(e.id);
            const sec = full ? sectionOf(full.muscle) : 'כל הגוף';
            if (!map.has(sec)) map.set(sec, []);
            map.get(sec)!.push({ ex: e, idx });
        });
        return SECTION_ORDER.filter((s) => map.has(s)).map((s) => ({ name: s, items: map.get(s)! }));
    }, [day]);

    const swapOptions = (currentId: string): Exercise[] => {
        const cur = exerciseById(currentId);
        if (!cur) return [];
        return EXERCISES
            .filter((e) => e.id !== currentId && !day.exercises.some(x => x.id === e.id) && (e.group === cur.group || e.muscle === cur.muscle) && isHoldExercise(e) === isHoldExercise(cur) && (cur.equip !== 'home' || e.equip !== 'gym'))
            .sort((a, b) => Math.abs(a.diff - cur.diff) - Math.abs(b.diff - cur.diff) || a.diff - b.diff);
    };

    const addOptions = (section: string): Exercise[] =>
        EXERCISES.filter((e) => sectionOf(e.muscle) === section && !day.exercises.some((x) => x.id === e.id))
            .sort((a, b) => a.diff - b.diff);

    const doSwap = (idx: number, newId: string) => {
        const ex = exerciseById(newId);
        if (!ex) return;
        onUpdateDay({
            ...day,
            exercises: day.exercises.map((e, j) => (j === idx ? swapPrescription(e, ex) : e)),
        });
        setSwapIdx(null);
        setDetail(null);
    };

    const doAdd = (section: string, ex: Exercise) => {
        void section;
        const pe: PlanExercise = { id: ex.id, he: ex.he, en: ex.en, sets: 3, reps: ex.compound ? '8-12' : '10-15', restSec: 60 };
        let at = day.exercises.length;
        for (let i = day.exercises.length - 1; i >= 0; i--) {
            const f = exerciseById(day.exercises[i].id);
            if (f && sectionOf(f.muscle) === section) { at = i + 1; break; }
        }
        const next = [...day.exercises];
        next.splice(at, 0, pe);
        onUpdateDay({ ...day, exercises: next });
        setAddSection(null);
    };

    const doRemove = (idx: number) => {
        onUpdateDay({ ...day, exercises: day.exercises.filter((_, j) => j !== idx) });
        setDetail(null);
    };

    const detailEx = detail !== null ? day.exercises[detail] : null;
    const detailFull = detailEx ? exerciseById(detailEx.id) : undefined;

    return <div className="screen">
        {/* Hero */}
        <div className="relative -mx-4 -mt-4 h-[240px] overflow-hidden rounded-b-[28px]">
            <motion.img
                initial={{ scale: 1.08, opacity: 0.6 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
                src={HERO_IMG} alt="אדם מתאמן" fetchPriority="high" decoding="async" className="absolute inset-0 w-full h-full object-cover"
            />
            <div className="absolute inset-0" style={{ background: 'linear-gradient(180deg, rgba(14,16,24,0.25) 0%, rgba(14,16,24,0.05) 40%, rgba(14,16,24,0.97) 100%)' }} />
            <motion.button
                whileTap={{ scale: 0.9 }} transition={spring}
                className="absolute top-4 right-4 w-10 h-10 rounded-full bg-black/35 backdrop-blur-sm text-ink grid place-items-center border border-white/10"
                onClick={onBack} aria-label="חזרה"
            >
                <Icon name="back" size={20} />
            </motion.button>
            <div className="absolute bottom-4 right-5 left-5">
                <p className="text-[13px] font-semibold text-acc">{`יום ${WEEKDAY_HE[weekday]}`}</p>
                <h1 className="text-[28px] font-extrabold text-ink leading-tight mt-0.5">{day.label}</h1>
                <span className="text-[13px] text-ink/75">{day.focus} · {day.exercises.length} תרגילים · כ-{sessionMin} דקות</span>
            </div>
        </div>

        {/* Muscle sections */}
        <motion.div variants={staggerParent(0.05, 0.1)} initial="initial" animate="animate" className="mt-2">
            {sections.map((sec) => (
                <motion.section
                    key={sec.name}
                    variants={{ initial: { opacity: 0, y: 12 }, animate: { opacity: 1, y: 0, transition: { duration: 0.22, ease: [0.22, 1, 0.36, 1] } } }}
                    className="mt-5"
                >
                    <div className="flex items-center justify-between mb-2.5">
                        <h2 className="text-[17px] font-extrabold text-ink">{sec.name}</h2>
                        <motion.button
                            whileTap={{ scale: 0.88 }} transition={spring}
                            className="w-9 h-9 rounded-full bg-acc/15 text-acc grid place-items-center border border-acc/25"
                            onClick={() => setAddSection(sec.name)} aria-label={`הוסף תרגיל ל${sec.name}`}
                        >
                            <Icon name="plus" size={18} />
                        </motion.button>
                    </div>
                    <div className="flex flex-col gap-2">
                        {sec.items.map(({ ex, idx }) => (
                            <motion.button
                                key={idx}
                                whileTap={{ scale: 0.98 }} transition={spring}
                                className="w-full flex items-center gap-3 bg-card border border-hairline rounded-2xl p-3 text-start"
                                onClick={() => setDetail(idx)}
                            >
                                <img className="w-[56px] h-[56px] rounded-xl object-cover shrink-0 bg-card2" src={sectionImg(sec.name)} alt="" loading="lazy" />
                                <span className="min-w-0 grow">
                                    <strong className="block text-[15.5px] font-bold text-ink leading-snug">{ex.he}</strong>
                                    <span className="block text-[12.5px] text-muted mt-0.5">{ex.en}</span>
                                    <span className="block text-[13px] text-muted mt-0.5">{ex.sets} סטים, {ex.reps} חזרות</span>
                                </span>
                                <Icon name="back" size={16} className="text-faint shrink-0" />
                            </motion.button>
                        ))}
                    </div>
                </motion.section>
            ))}
        </motion.div>

        {/* Start block */}
        <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1], delay: 0.15 }}
            className="mt-7 mb-2"
        >
            <Button className="w-full !min-h-[54px] !text-[17px]" onClick={onStart}>התחלת אימון</Button>
            <button className="block mx-auto mt-3 text-[13.5px] text-muted underline underline-offset-4 decoration-hairline" onClick={() => setConfirmSkip(true)}>דילוג על האימון</button>
        </motion.div>

        {/* Exercise detail sheet */}
        <Sheet open={detailEx !== null && !!detailFull} onClose={() => setDetail(null)}>
            {detailEx && detailFull && <>
                <div className="flex items-center gap-3.5 mb-4">
                    <img className="w-[72px] h-[72px] rounded-2xl object-cover shrink-0" src={sectionImg(sectionOf(detailFull.muscle))} alt="" loading="lazy" decoding="async" />
                    <div className="min-w-0">
                        <h3 className="text-[19px] font-extrabold text-ink leading-snug">{detailEx.he}</h3>
                        <p className="text-[13px] text-muted mt-0.5">{detailEx.en} · {detailFull.muscle} · {detailEx.sets} סטים, {detailEx.reps} חזרות</p>
                    </div>
                </div>
                <div className="mb-4">
                    <ExerciseExplain ex={detailFull} />
                </div>
                <div className="flex gap-2.5">
                    <Button variant="secondary" className="flex-1" onClick={() => { setSwapIdx(detail); }}><Icon name="swap" size={16} /> החלף תרגיל</Button>
                    {day.exercises.length > 3 && <Button variant="danger" onClick={() => doRemove(detail!)}>הסר</Button>}
                </div>
            </>}
        </Sheet>

        {/* Add exercise sheet */}
        <Sheet open={addSection !== null} onClose={() => setAddSection(null)} title={`הוספת תרגיל · ${addSection ?? ''}`}>
            <p className="text-[13px] text-muted mb-3">מהספרייה, לפי קושי עולה.</p>
            <div className="flex flex-col gap-2">
                {addSection && addOptions(addSection).length === 0 && <p className="text-[13px] text-muted">כל התרגילים בקבוצה כבר באימון.</p>}
                {addSection && addOptions(addSection).map((e) => (
                    <motion.button
                        key={e.id}
                        whileTap={{ scale: 0.98 }} transition={spring}
                        className="w-full flex flex-col gap-1 bg-card2 border border-hairline rounded-xl p-3.5 text-start"
                        onClick={() => doAdd(addSection, e)}
                    >
                        <strong className="text-[15px] font-bold text-ink">{e.he}</strong>
                        <span className="text-[12.5px] text-muted">{e.en} · {e.muscle}</span>
                        <span className="text-[11.5px] font-semibold text-acc mt-0.5">{DIFF_LABEL[e.diff]} · {EQUIP_LABEL(e.equip)}</span>
                    </motion.button>
                ))}
            </div>
        </Sheet>

        {/* Swap sheet */}
        <Sheet open={swapIdx !== null} onClose={() => setSwapIdx(null)} title={swapIdx !== null ? `החלפת ${exerciseById(day.exercises[swapIdx].id)?.he ?? ''}` : ''}>
            <p className="text-[13px] text-muted mb-3">תרגילים לאותו אזור, מדורגים לפי קושי. יעד החזרות מותאם כנקודת פתיחה, לא כהבטחה לעומס זהה. כוון למאמץ דומה עם 2-3 חזרות ברזרבה.</p>
            <div className="flex flex-col gap-2">
                {swapIdx !== null && (() => {
                    const cur = exerciseById(day.exercises[swapIdx].id);
                    return swapOptions(day.exercises[swapIdx].id).map((e) => (
                        <motion.button
                            key={e.id}
                            whileTap={{ scale: 0.98 }} transition={spring}
                            className="w-full flex flex-col gap-1 bg-card2 border border-hairline rounded-xl p-3.5 text-start"
                            onClick={() => doSwap(swapIdx, e.id)}
                        >
                            <strong className="text-[15px] font-bold text-ink">{e.he}</strong>
                            <span className="text-[12.5px] text-muted">{e.en} · {e.muscle}</span>
                            <span className={`text-[11.5px] font-semibold mt-0.5 ${e.diff < (cur?.diff || 1) ? 'text-blue' : e.diff === cur?.diff ? 'text-acc' : 'text-danger'}`}>
                                {e.diff < (cur?.diff || 1) ? 'קל יותר' : e.diff === cur?.diff ? 'דומה' : 'קשה יותר'} · {DIFF_LABEL[e.diff]} · יעד {swapPrescription(day.exercises[swapIdx], e).reps}{isHoldExercise(e) ? '' : ' חזרות'}
                            </span>
                        </motion.button>
                    ));
                })()}
            </div>
        </Sheet>

        {/* Skip confirm sheet */}
        <Sheet open={confirmSkip} onClose={() => setConfirmSkip(false)} title="לדלג על האימון?">
            <p className="text-[13.5px] text-muted leading-relaxed mb-4">האימון הבא בתור יוצג במקומו. אפשר תמיד לחזור ולבצע אותו מהמסך הראשי.</p>
            <div className="flex gap-2.5">
                <Button className="flex-1" onClick={() => { setConfirmSkip(false); onSkip(); }}>כן, דלג</Button>
                <Button variant="secondary" className="flex-1" onClick={() => setConfirmSkip(false)}>ביטול</Button>
            </div>
        </Sheet>
    </div>;
}

export function targetReps(e: PlanExercise): number {
    return topOfRange(e.reps);
}
