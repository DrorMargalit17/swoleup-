// Onboarding: 9-question flow with animated progress + step transitions.
// Tailwind + ds + motion; profile shape and logic unchanged.
import React, { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from './vendor/framer-motion.vendor.mjs';
import { Profile, Goal, Level, Place } from './data';
import { Button, Chip, TextInput, spring, easeOut } from './ds';

interface Props { initial?: Profile; onDone: (p: Profile) => void }

const MOTIVATIONS = ['לראות תוצאות במראה', 'להרגיש חזק', 'בריאות לטווח ארוך', 'ביטחון עצמי', 'אתגר מול חברים', 'משמעת ושגרה'];
const EQUIP_HOME = ['משקל גוף בלבד', 'מתקן מתח', 'דמבלים', 'גומיות', 'ספסל'];
const LIMITS = ['אין', 'גב תחתון', 'ברכיים', 'כתפיים', 'צוואר'];

function BigChoice({ on, title, desc, onClick }: { on: boolean; title: string; desc: string; onClick: () => void }) {
    return <motion.button
        whileTap={{ scale: 0.98 }} transition={spring}
        className={`w-full text-right rounded-2xl border p-4 flex flex-col gap-0.5 transition-colors ${on ? 'bg-accdim border-acc/60' : 'bg-card border-hairline'}`}
        onClick={onClick}>
        <strong className={`text-[15.5px] font-extrabold ${on ? 'text-acc' : 'text-ink'}`}>{title}</strong>
        <span className="text-[12.5px] text-muted">{desc}</span>
    </motion.button>;
}

function Sub({ children }: { children: React.ReactNode }) {
    return <p className="text-[13.5px] text-muted mt-4 mb-1">{children}</p>;
}

export function Onboarding({ initial, onDone }: Props) {
    const [step, setStep] = useState(0);
    // preventScroll: a plain autoFocus makes the host viewer page scroll down and
    // its sticky header then covers the top of the app.
    const nameRef = useRef<HTMLInputElement>(null);
    useEffect(() => { if (step === 0) nameRef.current?.focus({ preventScroll: true }); }, [step]);
    const [p, setP] = useState<Profile>(initial || {
        name: '', gender: 'male', age: 18, heightCm: 175, weightKg: 70,
        goal: 'muscle', level: 'beginner', place: 'gym', equipment: [],
        daysPerWeek: 3, sessionMin: 45, limitations: '', sleepH: 7,
        dailyActivity: 'mixed', diet: 'everything', motivation: [], createdAt: new Date().toISOString(),
    });
    const set = <K extends keyof Profile>(k: K, v: Profile[K]) => setP((prev) => ({ ...prev, [k]: v }));
    const toggle = (k: 'motivation' | 'equipment', v: string) =>
        setP((prev) => ({ ...prev, [k]: prev[k].includes(v) ? prev[k].filter((x) => x !== v) : [...prev[k], v] }));

    const steps: { title: string; sub?: string; valid: boolean; body: React.ReactNode }[] = [
        {
            title: 'אז קודם כל, איך קוראים לך?',
            sub: 'והאפליקציה תדבר אליך בהתאם',
            valid: p.name.trim().length >= 2,
            body: <>
                <TextInput ref={nameRef} value={p.name} placeholder="השם שלך" onChange={(e) => set('name', e.target.value)} />
                <div className="flex gap-2 mt-3">
                    {([['male', 'זכר'], ['female', 'נקבה'], ['other', 'אחר']] as const).map(([v, l]) => (
                        <Chip key={v} active={p.gender === v} onClick={() => set('gender', v)}>{l}</Chip>
                    ))}
                </div>
            </>,
        },
        {
            title: `${p.name || 'היי'}, כמה פרטי גוף בסיסיים`,
            sub: 'ככה אחשב לך יעדים אמיתיים, לא גנריים',
            valid: p.age >= 12 && p.age <= 100 && p.heightCm >= 120 && p.heightCm <= 230 && p.weightKg >= 30 && p.weightKg <= 250,
            body: <div className="flex flex-col gap-3">
                <label className="flex flex-col gap-1.5 text-[13px] text-muted">גיל
                    <TextInput type="number" inputMode="numeric" value={p.age} onChange={(e) => set('age', Number(e.target.value))} /></label>
                <label className="flex flex-col gap-1.5 text-[13px] text-muted">גובה (ס״מ)
                    <TextInput type="number" inputMode="numeric" value={p.heightCm} onChange={(e) => set('heightCm', Number(e.target.value))} /></label>
                <label className="flex flex-col gap-1.5 text-[13px] text-muted">משקל (ק״ג)
                    <TextInput type="number" inputMode="decimal" value={p.weightKg} onChange={(e) => set('weightKg', Number(e.target.value))} /></label>
            </div>,
        },
        {
            title: 'מה המטרה שלך?',
            sub: 'זה יקבע את מבנה התוכנית',
            valid: true,
            body: <div className="flex flex-col gap-2.5">
                {([['muscle', 'בניית שריר', 'יותר מסה, יותר נוכחות'], ['fatloss', 'ירידה בשומן', 'חיטוב ואנרגיה'], ['fitness', 'כושר כללי', 'להיות בכושר ולהרגיש טוב'], ['strength', 'כוח', 'להרים כבד יותר']] as const).map(([v, l, d]) => (
                    <BigChoice key={v} on={p.goal === v} title={l} desc={d} onClick={() => set('goal', v as Goal)} />
                ))}
            </div>,
        },
        {
            title: 'מה הניסיון שלך באימונים?',
            valid: true,
            body: <div className="flex flex-col gap-2.5">
                {([['beginner', 'מתחיל', 'פחות מחצי שנה של אימונים'], ['some', 'יש קצת ניסיון', 'מתאמן מדי פעם, מכיר תרגילים'], ['regular', 'מתאמן קבוע', 'שנה ומעלה של אימונים עקביים']] as const).map(([v, l, d]) => (
                    <BigChoice key={v} on={p.level === v} title={l} desc={d} onClick={() => set('level', v as Level)} />
                ))}
            </div>,
        },
        {
            title: 'איפה נוח לך להתאמן?',
            valid: true,
            body: <>
                <div className="flex flex-col gap-2.5">
                    {([['gym', 'חדר כושר', 'גישה מלאה לציוד'], ['home', 'בבית', 'בלי לצאת מהבית'], ['both', 'גם וגם', 'גמישות מלאה']] as const).map(([v, l, d]) => (
                        <BigChoice key={v} on={p.place === v} title={l} desc={d} onClick={() => set('place', v as Place)} />
                    ))}
                </div>
                {p.place !== 'gym' && <>
                    <Sub>מה יש לך בבית?</Sub>
                    <div className="flex flex-wrap gap-2">
                        {EQUIP_HOME.map((e) => <Chip key={e} active={p.equipment.includes(e)} onClick={() => toggle('equipment', e)}>{e}</Chip>)}
                    </div>
                </>}
            </>,
        },
        {
            title: 'כמה זמן בשבוע אתה נותן לזה?',
            sub: 'תוכנית שמתאימה לחיים שלך, לא להפך',
            valid: true,
            body: <>
                <Sub>ימים בשבוע: <b className="text-ink">{p.daysPerWeek}</b></Sub>
                <input type="range" min={2} max={6} value={p.daysPerWeek} onChange={(e) => set('daysPerWeek', Number(e.target.value))} className="slider" />
                <Sub>אורך אימון: <b className="text-ink">{p.sessionMin} דקות</b></Sub>
                <input type="range" min={20} max={90} step={5} value={p.sessionMin} onChange={(e) => set('sessionMin', Number(e.target.value))} className="slider" />
            </>,
        },
        {
            title: 'איך נראה היום שלך?',
            valid: true,
            body: <>
                <Sub>רמת פעילות יומומית</Sub>
                <div className="flex flex-wrap gap-2">
                    {([['sitting', 'בעיקר יושב'], ['mixed', 'מעורב'], ['active', 'הרבה בתנועה']] as const).map(([v, l]) => (
                        <Chip key={v} active={p.dailyActivity === v} onClick={() => set('dailyActivity', v)}>{l}</Chip>
                    ))}
                </div>
                <Sub>שעות שינה: <b className="text-ink">{p.sleepH}</b></Sub>
                <input type="range" min={4} max={10} step={0.5} value={p.sleepH} onChange={(e) => set('sleepH', Number(e.target.value))} className="slider" />
                <Sub>תזונה</Sub>
                <div className="flex flex-wrap gap-2">
                    {([['everything', 'אוכל הכל'], ['vegetarian', 'צמחוני'], ['vegan', 'טבעוני']] as const).map(([v, l]) => (
                        <Chip key={v} active={p.diet === v} onClick={() => set('diet', v)}>{l}</Chip>
                    ))}
                </div>
            </>,
        },
        {
            title: 'יש מגבלות שצריך לדעת עליהן?',
            sub: 'פציעות, כאבים, דברים להימנע מהם',
            valid: true,
            body: <>
                <div className="flex flex-wrap gap-2">
                    {LIMITS.map((l) => (
                        <Chip key={l} active={l === 'אין' ? p.limitations === '' : p.limitations.includes(l)}
                            onClick={() => set('limitations', l === 'אין' ? '' : (p.limitations.includes(l) ? p.limitations.replace(l, '').replace(/,\s*,/, ',').trim().replace(/^,|,$/g, '') : (p.limitations ? p.limitations + ', ' + l : l)))}>{l}</Chip>
                    ))}
                </div>
                <div className="mt-3">
                    <TextInput value={p.limitations} placeholder="או כתוב במילים שלך (לא חובה)" onChange={(e) => set('limitations', e.target.value)} />
                </div>
            </>,
        },
        {
            title: 'ואחרון: מה מדליק אותך?',
            sub: 'המאמן ידע איך לדבר אליך בימים קשים',
            valid: p.motivation.length > 0,
            body: <div className="flex flex-wrap gap-2">
                {MOTIVATIONS.map((m) => <Chip key={m} active={p.motivation.includes(m)} onClick={() => toggle('motivation', m)}>{m}</Chip>)}
            </div>,
        },
    ];

    const cur = steps[step];
    const last = step === steps.length - 1;

    return <div className="flex flex-col gap-3 pb-6">
        <div className="h-1.5 rounded-full bg-card2 overflow-hidden">
            <motion.div className="h-full bg-acc rounded-full"
                animate={{ width: `${((step + 1) / steps.length) * 100}%` }} transition={easeOut} />
        </div>
        <p className="text-[12px] text-faint">שאלה {step + 1} מתוך {steps.length}</p>
        <AnimatePresence mode="wait" initial={false}>
            <motion.div key={step}
                initial={{ opacity: 0, x: -24 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 24 }}
                transition={easeOut}>
                <h1 className="text-[22px] font-extrabold text-ink leading-snug mb-1">{cur.title}</h1>
                {cur.sub && <p className="text-[13.5px] text-muted mb-3">{cur.sub}</p>}
                <div>{cur.body}</div>
            </motion.div>
        </AnimatePresence>
        <div className="flex gap-2 mt-4">
            {step > 0 && <Button variant="ghost" onClick={() => setStep(step - 1)}>חזרה</Button>}
            <Button variant="primary" className="flex-1" disabled={!cur.valid} onClick={() => (last ? onDone({ ...p, createdAt: p.createdAt || new Date().toISOString() }) : setStep(step + 1))}>
                {last ? 'בנה לי תוכנית' : 'המשך'}
            </Button>
        </div>
    </div>;
}
