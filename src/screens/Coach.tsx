// AI coach chat: key gate, chat bubbles, quick prompts, typing indicator.
// Design system: Tailwind + ds + motion. Logic and store keys unchanged.
import React, { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from '../vendor/framer-motion.vendor.mjs';
import { Profile, Plan, WorkoutLog, WeightEntry } from '../data';
import { useStore, capMsgs } from '../store';
import { askCoach, CoachMsg, CoachSettings, DEFAULT_SETTINGS, GEMINI_MODEL } from '../coach';
import { coachAvatar } from '../mealImages';
import { Icon } from '../ui';
import { TextInput, Chip, spring, easeOut } from '../ds';

const QUICK = ['אין לי כוח היום, מה עושים?', 'מה לאכול אחרי אימון?', 'תתאים לי אימון ביתי קצר', 'איך לשפר את הסקוואט?'];

export function Coach({ profile, plan, active = true, onSettings }: { profile: Profile; plan: Plan | null; active?: boolean; onSettings: () => void }) {
    const [msgs, setMsgs] = useStore<CoachMsg[]>('coach.v1', []);
    const [settings, setSettings] = useStore<CoachSettings>('coachsettings.v1', DEFAULT_SETTINGS);
    const [logs] = useStore<WorkoutLog[]>('logs.v1', []);
    const [weights] = useStore<WeightEntry[]>('weights.v1', []);
    const [input, setInput] = useState('');
    const [busy, setBusy] = useState(false);
    const [retryStatus, setRetryStatus] = useState('');
    const [error, setError] = useState('');
    const bottomRef = useRef<HTMLDivElement>(null);

    // Scroll the app's own scroller only: scrollIntoView would also scroll the
    // host viewer page and push the app under its sticky header.
    useEffect(() => {
        const c = bottomRef.current?.closest('.chat');
        if (active && c) c.scrollTo({ top: c.scrollHeight, behavior: 'smooth' });
    }, [msgs.length, busy, active]);

    const send = async (q: string) => {
        const question = q.trim();
        if (!question || busy) return;
        setInput(''); setError(''); setRetryStatus('');
        const next: CoachMsg[] = [...msgs, { role: 'user', text: question, ts: Date.now() }];
        setMsgs(capMsgs(next));
        setBusy(true);
        try {
            const answer = await askCoach(settings, profile, plan, logs, weights, next.slice(0, -1), question, setRetryStatus);
            setMsgs(capMsgs([...next, { role: 'coach', text: answer, ts: Date.now() }]));
        } catch (e) {
            setError(e instanceof Error ? e.message : 'שגיאה לא צפויה. בדוק את המפתח והחיבור.');
        } finally {
            setBusy(false); setRetryStatus('');
        }
    };

    const head = <div className="flex items-center gap-3">
        <span className="coach-head-icon"><Icon name="chat" size={22} /></span>
        <div>
            <h1 className="text-[22px] font-extrabold text-ink leading-tight">המאמן האישי שלך</h1>
            <p className="text-[13px] text-muted">זמין לך תמיד, לכל שאלה</p>
        </div>
    </div>;

    if (!settings.apiKey) {
        return <div className="screen coach-screen">
            {head}
            <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={easeOut}
                className="bg-card border border-hairline rounded-2xl p-5 flex flex-col gap-3.5 mt-2">
                <h2 className="text-[17px] font-extrabold text-ink">צריך מפתח API משלך</h2>
                <p className="text-[14px] text-ink/90 leading-relaxed">המאמן רץ ישירות מהטלפון שלך מול ספק AI שתבחר, בלי שרת באמצע. המפתח נשמר רק במכשיר.</p>
                <p className="text-[14px] text-muted leading-relaxed">אפשר להוסיף או לשנות את המפתח רק בהגדרות האפליקציה, תחת מפתח API.</p>
                <button className="coach-settings-button" onClick={onSettings}>פתח הגדרות</button>
            </motion.div>
        </div>;
    }

    return <div className="screen coach-screen">
        {head}
        <div className="chat flex flex-col gap-3 mt-1">
            {msgs.length === 0 && <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={easeOut} className="coach-welcome">
                <div className="coach-welcome-author"><img src={coachAvatar} alt="המאמן" /><strong>המאמן שלך</strong></div>
                <p>היי {profile.name}. אני מכיר את הפרופיל, התוכנית והאימונים שלך. שאל אותי כל דבר.</p>
                <div className="coach-prompts">{QUICK.map(q => <motion.button key={q} whileTap={{ scale: 0.98 }} onClick={() => send(q)}>{q}<span aria-hidden="true">‹</span></motion.button>)}</div>
            </motion.div>}
            <AnimatePresence initial={false}>
                {msgs.map((m, i) => (
                    <motion.div
                        key={i}
                        initial={{ opacity: 0, y: 12, scale: 0.98 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        transition={easeOut}
                        className={`flex gap-2.5 items-end ${m.role === 'user' ? 'flex-row' : 'flex-row'}`}
                    >
                        {m.role === 'coach' && <img className="w-9 h-9 rounded-full object-cover shrink-0 border border-hairline" src={coachAvatar} alt="" decoding="async" />}
                        <div className={m.role === 'user'
                            ? 'mr-auto bg-acc text-accink rounded-2xl rounded-tl-sm px-4 py-3 max-w-[85%] text-[14.5px] leading-relaxed font-medium'
                            : 'bg-card border border-hairline rounded-2xl rounded-tr-sm px-4 py-3 max-w-[85%] text-[14.5px] text-ink leading-relaxed'}>
                            {m.text}
                        </div>
                    </motion.div>
                ))}
            </AnimatePresence>
            {busy && <div className="flex gap-2.5 items-end">
                <img className="w-9 h-9 rounded-full object-cover shrink-0 border border-hairline" src={coachAvatar} alt="" decoding="async" />
                <div className="bg-card border border-hairline rounded-2xl rounded-tr-sm px-4 py-3.5 flex gap-1.5">
                    {[0, 1, 2].map((i) => (
                        <motion.span key={i} className="w-2 h-2 rounded-full bg-muted"
                            animate={{ opacity: [0.3, 1, 0.3] }} transition={{ duration: 1, repeat: Infinity, delay: i * 0.18 }} />
                    ))}
                </div>
            </div>}
            {busy && retryStatus && <p role="status" className="text-[13px] text-muted">{retryStatus}</p>}
            {error && <div className="bg-danger/10 border border-danger/30 rounded-xl px-4 py-3 text-[13px] text-danger">{error}</div>}
            <div ref={bottomRef} />
        </div>
        <div className="coach-composer">
            <input
                className="min-w-0 grow box-border bg-input border border-hairline rounded-full px-4 py-3 text-[16px] text-ink placeholder:text-faint outline-none focus:border-acc/70 focus:ring-2 focus:ring-acc/20 transition"
                placeholder="מה אתה יכול לעשות?" value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') send(input); }}
            />
            <motion.button whileTap={{ scale: 0.9 }} transition={spring}
                className="coach-send"
                onClick={() => send(input)} disabled={!input.trim() || busy} aria-label="שלח">
                <Icon name="send" size={20} />
            </motion.button>
        </div>
    </div>;
}
