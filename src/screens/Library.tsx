// Exercise library: every exercise grouped by muscle, with form cues,
// "how it should feel" and a demo video link. Design system: Tailwind + ds + motion.
import React, { useState } from 'react';
import { motion } from '../vendor/framer-motion.vendor.mjs';
import { Exercise, EXERCISES, sectionOf, SECTION_ORDER } from '../data';
import { Icon } from '../ui';
import { sectionImg, exerciseImg } from '../images';
import { Sheet, staggerParent, spring } from '../ds';
import { ExerciseExplain } from '../explain';

const DIFF_LABEL = ['', 'קל', 'קל', 'בינוני', 'מתקדם', 'מתקדם מאוד'];
const DIFF_TINT = ['', 'text-acc', 'text-acc', 'text-blue', 'text-danger', 'text-danger'];

export function Library({ onBack }: { onBack: () => void }) {
    const [open, setOpen] = useState<Exercise | null>(null);
    const groups = SECTION_ORDER.map((s) => ({ name: s, items: EXERCISES.filter((e) => sectionOf(e.muscle) === s) })).filter((g) => g.items.length > 0);

    return <div className="screen">
        <div className="flex items-center gap-3">
            <motion.button whileTap={{ scale: 0.9 }} transition={spring} className="w-10 h-10 rounded-full bg-card2 border border-hairline text-ink grid place-items-center shrink-0" onClick={onBack} aria-label="חזרה">
                <Icon name="back" size={20} />
            </motion.button>
            <h1 className="text-[24px] font-extrabold text-ink tracking-tight">ספריית התרגילים</h1>
        </div>
        <p className="text-[13.5px] text-muted">{EXERCISES.length} תרגילים עם הוראות ביצוע וסרטוני הדגמה.</p>

        <motion.div variants={staggerParent(0.04)} initial="initial" animate="animate" className="flex flex-col gap-5 mt-1">
            {groups.map((g) => (
                <motion.section key={g.name} variants={{ initial: { opacity: 0, y: 12 }, animate: { opacity: 1, y: 0, transition: { duration: 0.22, ease: [0.22, 1, 0.36, 1] } } }}>
                    <div className="flex items-center justify-between mb-2.5">
                        <h2 className="text-[17px] font-extrabold text-ink">{g.name}</h2>
                        <span className="text-[12px] font-semibold text-muted bg-card2 border border-hairline rounded-full px-2.5 py-0.5">{g.items.length}</span>
                    </div>
                    <div className="flex flex-col gap-2">
                        {g.items.map((e) => (
                            <motion.button key={e.id} whileTap={{ scale: 0.98 }} transition={spring}
                                className="w-full flex items-center gap-3 bg-card border border-hairline rounded-2xl p-3 text-start"
                                onClick={() => setOpen(e)}>
                                <img className="w-[56px] h-[56px] rounded-xl object-cover shrink-0 bg-card2" src={sectionImg(g.name)} alt="" loading="lazy" />
                                <span className="min-w-0 grow">
                                    <strong className="block text-[15.5px] font-bold text-ink leading-snug">{e.he}</strong>
                                    <span className="block text-[12.5px] text-muted mt-0.5">{e.en} · <span className={`font-semibold ${DIFF_TINT[e.diff]}`}>{DIFF_LABEL[e.diff]}</span></span>
                                </span>
                                <Icon name="fwd" size={16} className="text-faint shrink-0" />
                            </motion.button>
                        ))}
                    </div>
                </motion.section>
            ))}
        </motion.div>

        <Sheet open={open !== null} onClose={() => setOpen(null)}>
            {open && <>
                <div className="flex items-center gap-3.5 mb-4">
                    <img className="w-[72px] h-[72px] rounded-2xl object-cover shrink-0" src={exerciseImg(open.id, sectionOf(open.muscle))} alt="" loading="lazy" decoding="async" />
                    <div className="min-w-0">
                        <h3 className="text-[19px] font-extrabold text-ink leading-snug">{open.he}</h3>
                        <p className="text-[13px] text-muted mt-0.5">{open.en} · {open.muscle} · <span className={`font-semibold ${DIFF_TINT[open.diff]}`}>{DIFF_LABEL[open.diff]}</span></p>
                    </div>
                </div>
                <ExerciseExplain ex={open} />
            </>}
        </Sheet>
    </div>;
}
