// Settings: grouped rows + sub-screens (api key, medical, equipment, diet,
// backup, rest timer, sources). Tailwind + ds + motion; logic unchanged.
import React, { useRef, useState } from 'react';
import { motion, AnimatePresence } from '../vendor/framer-motion.vendor.mjs';
import { Profile, Plan, WorkoutLog, WeightEntry, FoodEntry, ProgressEntry, RestTimer, EquipWeight, generatePlan, calorieTarget, waterTargetMl, proteinTarget } from '../data';
import { useStore, capLogs, capDayMap, capWeights, capMsgs } from '../store';
import { CoachMsg, CoachSettings, DEFAULT_SETTINGS, GEMINI_MODEL } from '../coach';
import { MealSuggestion } from '../meals';
import { Icon } from '../ui';
import { IconButton, Button, Card, Chip, TextInput, spring, easeOut } from '../ds';

const EQUIP_OPTIONS = ['משקל גוף בלבד', 'מתקן מתח', 'דמבלים', 'גומיות', 'ספסל'];
const DIET_OPTIONS: [Profile['diet'], string][] = [['everything', 'אוכל הכל'], ['vegetarian', 'צמחוני'], ['vegan', 'טבעוני']];

type Sub = 'main' | 'diet' | 'medical' | 'equipment' | 'weights' | 'backup' | 'sources' | 'apikey' | 'timer';

export function Settings({ onBack, onRedoOnboarding, onReset }: { onBack: () => void; onRedoOnboarding: () => void; onReset: () => void }) {
    const [displayInfo, setDisplayInfo] = useState('');
    const [updateMessage, setUpdateMessage] = useState('');
    const [updateAvailable, setUpdateAvailable] = useState(false);
    const checkUpdate = async () => {
        setUpdateMessage('בודק גרסה…');
        try {
            const registration=await navigator.serviceWorker?.getRegistration(); await registration?.update().catch(()=>{});
            const res=await fetch(new URL('./index.html',location.href),{cache:'no-store'});if(!res.ok)throw new Error();
            const html=await res.text();const latest=new DOMParser().parseFromString(html,'text/html').querySelector('meta[name="swoleup-version"]')?.getAttribute('content');
            const current=document.querySelector('meta[name="swoleup-version"]')?.getAttribute('content');if(!latest||!current)throw new Error();
            setUpdateAvailable(latest!==current);setUpdateMessage(latest===current?'הגרסה מעודכנת.':'יש גרסה חדשה. רענון יסגור מסכים פתוחים.');
        }catch{setUpdateMessage('לא ניתן לבדוק כרגע. בדוק את החיבור ונסה שוב.')}
    };
    const readDisplayInfo = () => {
        const app=document.querySelector('.app') as HTMLElement;
        const nav=document.querySelector('nav') as HTMLElement;
        const probe=document.createElement('div');probe.style.cssText='position:fixed;pointer-events:none;padding-top:env(safe-area-inset-top);padding-bottom:env(safe-area-inset-bottom)';document.body.appendChild(probe);const ps=getComputedStyle(probe);const safe=[ps.paddingTop,ps.paddingBottom];probe.remove();
        const units:Record<string,number>={}; for(const unit of ['vh','lvh','dvh','svh']) {const el=document.createElement('div');el.style.cssText='position:absolute;visibility:hidden;height:100'+unit;document.body.appendChild(el);units[unit]=el.getBoundingClientRect().height;el.remove();}
        const rect=(el:HTMLElement)=>{const r=el.getBoundingClientRect();return {top:r.top,bottom:r.bottom,height:r.height}};
        setDisplayInfo(JSON.stringify({version:'6.7',screen:[screen.width,screen.height],inner:[innerWidth,innerHeight],outer:[outerWidth,outerHeight],dpr:devicePixelRatio,units,visual:window.visualViewport?{height:visualViewport!.height,top:visualViewport!.offsetTop,scale:visualViewport!.scale}:null,safe,standalone:matchMedia('(display-mode:standalone)').matches,app:rect(app),nav:rect(nav),navPadding:getComputedStyle(nav).paddingBottom,root:rect(document.querySelector('#root') as HTMLElement)},null,0).replace(/,"(?=[a-zA-Z])/g,',\n"'));
    };
    const [dark, setDark] = useStore<boolean>('dark.v1', true);
    const [sub, setSub] = useState<Sub>('main');
    const [profile, setProfile] = useStore<Profile | null>('profile.v1', null);
    const [plan, setPlan] = useStore<Plan | null>('plan.v1', null);
    const [logs, setLogs] = useStore<WorkoutLog[]>('logs.v1', []);
    const [water, setWater] = useStore<Record<string, number>>('water.v1', {});
    const [weights, setWeights] = useStore<WeightEntry[]>('weights.v1', []);
    const [foods, setFoods] = useStore<Record<string, FoodEntry[]>>('foods.v1', {});
    const [coach, setCoach] = useStore<CoachMsg[]>('coach.v1', []);
    const [coachSettings, setCoachSettings] = useStore<CoachSettings>('coachsettings.v1', DEFAULT_SETTINGS);
    const [progress, setProgress] = useStore<Record<string, ProgressEntry>>('progress.v1', {});
    const [restTimer, setRestTimer] = useStore<RestTimer>('rest.v1', { on: false, sec: 90 });
    const [favs, setFavs] = useStore<MealSuggestion[]>('mealfavs.v1', []);
    const [skips, setSkips] = useStore<Record<string, number>>('skips.v1', {});
    const [equipW, setEquipW] = useStore<EquipWeight[]>('equipw.v1', []);
    const [mealHistory, setMealHistory] = useStore<string[]>('mealhistory.v1', []);
    const [msg, setMsg] = useState('');
    const [confirmReset, setConfirmReset] = useState(false);
    const [showImport, setShowImport] = useState(false);
    const [importText, setImportText] = useState('');
    const [exportText, setExportText] = useState('');
    const [medText, setMedText] = useState(profile?.limitations || '');
    const [keyDraft, setKeyDraft] = useState('');
    const [showKey, setShowKey] = useState(false);
    const fileRef = useRef<HTMLInputElement>(null);

    if (!profile) return null;

    const saveProfile = (p: Profile, regen: boolean) => {
        setProfile(p);
        if (regen) setPlan(generatePlan(p));
    };

    const bundle = () => JSON.stringify({
        app: 'SwoleUp', version: 1, exportedAt: new Date().toISOString(),
        'profile.v1': profile, 'plan.v1': plan, 'logs.v1': logs, 'water.v1': water,
        'weights.v1': weights, 'foods.v1': foods, 'coach.v1': coach, 'progress.v1': progress,
        'equipw.v1': equipW, 'mealhistory.v1': mealHistory,
        'dark.v1': dark, 'rest.v1': restTimer, 'mealfavs.v1': favs, 'skips.v1': skips,
    }, null, 2);

    const exportData = async () => {
        const text = bundle();
        try {
            const blob = new Blob([text], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `swoleup-backup-${new Date().toISOString().slice(0, 10)}.json`;
            document.body.appendChild(a);
            a.click();
            a.remove();
            URL.revokeObjectURL(url);
            setMsg('הגיבוי ירד. אם ההורדה לא נפתחה, השתמש ב״הצג גיבוי להעתקה״.');
        } catch {
            try { await navigator.clipboard.writeText(text); setMsg('הגיבוי הועתק ללוח. שמור אותו בפתק.'); }
            catch { setExportText(text); setMsg('הורדה והעתקה חסומות כאן, אז הנה הגיבוי כטקסט. סמן הכל והעתק.'); }
        }
    };

    const applyImport = (raw: string) => {
        try {
            const data = JSON.parse(raw) as Record<string, unknown>;
            if (data.app !== 'SwoleUp' && data.app !== 'DrorFit') throw new Error('bad');
            if (data['profile.v1']) setProfile(data['profile.v1'] as Profile);
            if (data['plan.v1']) setPlan(data['plan.v1'] as Plan);
            if (Array.isArray(data['logs.v1'])) setLogs(capLogs(data['logs.v1'] as WorkoutLog[]));
            if (data['water.v1']) setWater(capDayMap(data['water.v1'] as Record<string, number>));
            if (Array.isArray(data['weights.v1'])) setWeights(capWeights(data['weights.v1'] as WeightEntry[]));
            if (data['foods.v1']) setFoods(capDayMap(data['foods.v1'] as Record<string, FoodEntry[]>));
            if (Array.isArray(data['coach.v1'])) setCoach(capMsgs(data['coach.v1'] as CoachMsg[]));
            if (data['progress.v1']) setProgress(data['progress.v1'] as Record<string, ProgressEntry>);
            if (Array.isArray(data['equipw.v1'])) setEquipW(data['equipw.v1'] as EquipWeight[]);
            if (Array.isArray(data['mealhistory.v1'])) setMealHistory(data['mealhistory.v1'].filter(v => typeof v === 'string').slice(-60));
            if (typeof data['dark.v1'] === 'boolean') setDark(data['dark.v1']);
            if (data['rest.v1']) setRestTimer(data['rest.v1'] as RestTimer);
            if (Array.isArray(data['mealfavs.v1'])) setFavs(data['mealfavs.v1'] as MealSuggestion[]);
            if (data['skips.v1']) setSkips(data['skips.v1'] as Record<string, number>);
            setMsg('הגיבוי שוחזר בהצלחה.');
            setShowImport(false); setImportText('');
        } catch { setMsg('הטקסט לא תקין. ודא שהדבקת גיבוי של SwoleUp.'); }
    };

    const importFile = (file: File) => {
        const reader = new FileReader();
        reader.onload = () => applyImport(String(reader.result));
        reader.readAsText(file);
    };

    const head = (title: string, back: () => void) => (
        <div className="flex items-center gap-3">
            <IconButton label="חזרה" onClick={back}><Icon name="back" size={18} /></IconButton>
            <h1 className="text-[20px] font-extrabold text-ink">{title}</h1>
        </div>
    );

    if (sub === 'apikey') {
        const hasKey = !!coachSettings.apiKey;
        const tail = hasKey ? coachSettings.apiKey.slice(-4) : '';
        return <div className="screen">
            {head('מפתח API', () => setSub('main'))}
            <Card className="p-5 flex flex-col gap-3.5">
                <h2 className="text-[17px] font-extrabold text-ink">המפתח למאמן האישי ולרעיונות ארוחות</h2>
                <p className="text-[13px] text-muted leading-relaxed">המפתח נשמר באחסון המקומי של הדפדפן במכשיר הזה ונשלח ישירות לספק ה-AI שבחרת. הוא לא נכלל בגיבוי. זו אינה כספת מוצפנת: קוד שרץ באתר יכול לקרוא אותו. מומלץ להשתמש במפתח מוגבל ל-API הדרוש, בלי חיוב פתוח.</p>
                <div className="flex flex-col gap-3 border-t border-hairline pt-3">
                    <div className="flex flex-col gap-2">
                        <span className="text-[12.5px] text-muted">ספק</span>
                        <div className="flex gap-2">
                            <Chip active={coachSettings.provider === 'gemini'} onClick={() => setCoachSettings({ ...coachSettings, provider: 'gemini', model: GEMINI_MODEL })}>Gemini (חינם)</Chip>
                            <Chip active={coachSettings.provider === 'openai'} onClick={() => setCoachSettings({ ...coachSettings, provider: 'openai', model: 'gpt-4o-mini' })}>OpenAI</Chip>
                        </div>
                    </div>
                    <div className="flex items-center justify-between">
                        <span className="text-[12.5px] text-muted">סטטוס</span>
                        <strong className="text-[14px] text-ink">{hasKey ? `מפתח שמור (••••${tail})` : 'אין מפתח שמור'}</strong>
                    </div>
                </div>
                <div className="flex gap-2 items-center">
                    <TextInput dir="ltr" type={showKey ? 'text' : 'password'} autoComplete="off" placeholder="הדבקת מפתח חדש" value={keyDraft} onChange={(e) => setKeyDraft(e.target.value)} />
                    <IconButton label={showKey ? 'הסתר' : 'הצג'} onClick={() => setShowKey(!showKey)}><Icon name={showKey ? 'eyeoff' : 'eye'} size={16} /></IconButton>
                </div>
                <Button variant="primary" disabled={!keyDraft.trim()} onClick={() => { setCoachSettings({ ...coachSettings, apiKey: keyDraft.trim() }); setKeyDraft(''); setMsg('המפתח נשמר במכשיר.'); setSub('main'); }}>{hasKey ? 'עדכון המפתח' : 'שמירת המפתח'}</Button>
                {hasKey && <button className="text-[13.5px] font-semibold text-danger" onClick={() => { setCoachSettings({ ...coachSettings, apiKey: '' }); setMsg('המפתח הוסר מהמכשיר.'); setSub('main'); }}>הסרת המפתח מהמכשיר</button>}
                <p className="text-[12px] text-faint">אין מפתח? ב-Gemini זה חינם: נכנסים ל-aistudio.google.com/apikey, יוצרים מפתח ומדביקים כאן.</p>
            </Card>
        </div>;
    }

    if (sub === 'medical') {
        return <div className="screen">
            {head('מגבלות רפואיות', () => setSub('main'))}
            <Card className="p-5 flex flex-col gap-3.5">
                <h2 className="text-[17px] font-extrabold text-ink">מה חשוב שנדע?</h2>
                <p className="text-[13px] text-muted">פציעות, כאבים, מצבים רפואיים או מגבלות תנועה. למשל: כאבי גב תחתון, ברך ימין חלשה, אסתמה.</p>
                <textarea
                    className="w-full box-border bg-input border border-hairline rounded-xl px-4 py-3.5 text-[16px] text-ink placeholder:text-faint outline-none focus:border-acc/70 focus:ring-2 focus:ring-acc/20 transition resize-none"
                    style={{ minHeight: 110 }} placeholder="אין מגבלות / לכתוב כאן…" value={medText} onChange={(e) => setMedText(e.target.value)} />
                <Button variant="primary" onClick={() => { saveProfile({ ...profile, limitations: medText.trim() }, false); setSub('main'); }}>שמירה</Button>
            </Card>
            <Card className="p-5 flex flex-col gap-2">
                <h2 className="text-[17px] font-extrabold text-ink">איך זה עובד?</h2>
                <p className="text-[13px] text-muted leading-relaxed">המגבלות לא משנות את תוכנית האימונים שלך. הן מועברות למאמן האישי, וכשזה רלוונטי בשיחה איתו הוא יתאים את ההמלצות, יסביר למה, ויציע חלופות בטוחות.</p>
            </Card>
        </div>;
    }

    if (sub === 'equipment') {
        const eq = profile.equipment || [];
        const toggle = (v: string) => saveProfile({ ...profile, equipment: eq.includes(v) ? eq.filter((x) => x !== v) : [...eq, v] }, false);
        return <div className="screen">
            {head('ציוד נגיש', () => setSub('main'))}
            <Card className="p-5 flex flex-col gap-3.5">
                <h2 className="text-[17px] font-extrabold text-ink">מה יש לך להתאמן איתו?</h2>
                <p className="text-[13px] text-muted">לסמן את כל מה שזמין לך. באימונים ביתיים התוכנית תכלול רק תרגילים שמתאימים לציוד שסימנת.</p>
                <div className="flex flex-wrap gap-2">
                    {EQUIP_OPTIONS.map((v) => <Chip key={v} active={eq.includes(v)} onClick={() => toggle(v)}>{v}</Chip>)}
                </div>
                <div className="flex gap-2">
                    {([['gym', 'חדר כושר'], ['home', 'בית'], ['both', 'גם וגם']] as const).map(([v, l]) => (
                        <Chip key={v} active={profile.place === v} onClick={() => saveProfile({ ...profile, place: v }, true)}>{l}</Chip>
                    ))}
                </div>
                <Button variant="primary" onClick={() => { saveProfile({ ...profile }, true); setMsg('התוכנית עודכנה לפי הציוד שלך.'); setSub('main'); }}>שמירה ועדכון התוכנית</Button>
            </Card>
        </div>;
    }

    if (sub === 'diet') {
        return <div className="screen">
            {head('הגדרות תזונה', () => setSub('main'))}
            <Card className="p-5 flex flex-col gap-3">
                <h2 className="text-[17px] font-extrabold text-ink">העדפת תזונה</h2>
                <div className="flex flex-wrap gap-2">
                    {DIET_OPTIONS.map(([v, l]) => <Chip key={v} active={profile.diet === v} onClick={() => saveProfile({ ...profile, diet: v }, false)}>{l}</Chip>)}
                </div>
                <p className="text-[12px] text-faint">משפיע על רעיונות הארוחות ועל המאמן האישי.</p>
            </Card>
            <TargetsCard profile={profile} saveProfile={saveProfile} />
        </div>;
    }

    if (sub === 'backup') {
        return <div className="screen">
            {head('גיבוי ושחזור', () => setSub('main'))}
            <Card className="p-5 flex flex-col gap-3.5">
                <div className="flex flex-wrap gap-2">
                    <Button variant="secondary" onClick={exportData}>ייצוא גיבוי (JSON)</Button>
                    <Button variant="ghost" onClick={() => setShowImport(!showImport)}>שחזור</Button>
                    <Button variant="ghost" onClick={() => setExportText(exportText ? '' : bundle())}>{exportText ? 'הסתר גיבוי' : 'הצג גיבוי להעתקה'}</Button>
                </div>
                {exportText !== '' && <textarea
                    className="w-full box-border bg-input border border-hairline rounded-xl px-4 py-3.5 text-[12px] text-ink outline-none resize-none"
                    style={{ minHeight: 140 }} readOnly value={exportText} onFocus={(e) => e.target.select()} />}
                {showImport && <>
                    <textarea
                        className="w-full box-border bg-input border border-hairline rounded-xl px-4 py-3.5 text-[12px] text-ink placeholder:text-faint outline-none focus:border-acc/70 focus:ring-2 focus:ring-acc/20 transition resize-none"
                        style={{ minHeight: 140 }} dir="ltr" placeholder='הדבק כאן את תוכן הגיבוי' value={importText} onChange={(e) => setImportText(e.target.value)} />
                    <div className="flex gap-2">
                        <Button variant="primary" onClick={() => applyImport(importText)} disabled={!importText.trim()}>שחזר מהטקסט</Button>
                        <Button variant="ghost" onClick={() => fileRef.current?.click()}>או בחר קובץ</Button>
                    </div>
                    <input ref={fileRef} type="file" accept="application/json,.json" style={{ display: 'none' }}
                        onChange={(e) => { const f = e.target.files?.[0]; if (f) importFile(f); e.target.value = ''; }} />
                </>}
                {msg && <p className="text-[13px] text-muted">{msg}</p>}
            </Card>
        </div>;
    }

    if (sub === 'weights') {
        return <div className="screen">
            {head('המשקלים שלי', () => setSub('main'))}
            <Card className="p-5 flex flex-col gap-3.5">
                <h2 className="text-[17px] font-extrabold text-ink">משקלי הציוד שלך</h2>
                <p className="text-[13px] text-muted leading-relaxed">הוסף את המשקלים שיש לך (דמבלים, מוט, קטלבל…). באימון הם מוזנים אוטומטית בסטים של תרגילים מתאימים - בלי לשאול אותך כל פעם מחדש. שינוי נקודתי תמיד אפשרי בלחיצה על המשקל בסט.</p>
                <EquipWeightsEditor items={equipW} onChange={setEquipW} />
            </Card>
        </div>;
    }

    if (sub === 'timer') {
        const mm = Math.floor(restTimer.sec / 60);
        const ss = String(restTimer.sec % 60).padStart(2, '0');
        const bump = (d: number) => setRestTimer({ ...restTimer, sec: Math.min(300, Math.max(30, restTimer.sec + d)) });
        return <div className="screen">
            {head('שיימר מנוחה', () => setSub('main'))}
            <Card className="p-5 flex flex-col gap-3.5">
                <h2 className="text-[17px] font-extrabold text-ink">שיימר מנוחה קבוע</h2>
                <p className="text-[13px] text-muted">כשהוא פעיל, המנוחה בין סטים תמיד באותו אורך. כשהוא כבוי, המנוחה מותאמת לכל תרגיל לפי התוכנית.</p>
                <div className="flex gap-2">
                    <Chip active={restTimer.on} onClick={() => setRestTimer({ ...restTimer, on: true })}>פעיל</Chip>
                    <Chip active={!restTimer.on} onClick={() => setRestTimer({ ...restTimer, on: false })}>כבוי</Chip>
                </div>
                {restTimer.on && <>
                    <div className="flex items-center justify-center gap-6 my-1">
                        <motion.button whileTap={{ scale: 0.9 }} transition={spring}
                            className="w-12 h-12 rounded-full bg-card2 border border-hairline text-ink grid place-items-center text-[20px] font-bold"
                            onClick={() => bump(15)} aria-label="הוסף 15 שניות">+</motion.button>
                        <span className="text-[40px] font-extrabold text-ink tabular-nums">{mm}:{ss}</span>
                        <motion.button whileTap={{ scale: 0.9 }} transition={spring}
                            className="w-12 h-12 rounded-full bg-card2 border border-hairline text-ink grid place-items-center text-[20px] font-bold"
                            onClick={() => bump(-15)} aria-label="הורד 15 שניות">−</motion.button>
                    </div>
                    <p className="text-[12px] text-faint text-center">בין 0:30 ל-5:00, בצעדים של 15 שניות.</p>
                </>}
            </Card>
        </div>;
    }

    if (sub === 'sources') {
        return <div className="screen">
            {head('מידע רפואי ומקורות', () => setSub('main'))}
            <Card className="p-5 flex flex-col gap-3">
                <h2 className="text-[17px] font-extrabold text-ink">על מה המאמן מסתמך?</h2>
                <p className="text-[14px] text-ink/90 leading-relaxed">כשמגבלות רפואיות עולות בשיחה עם המאמן האישי, הוא נשען על הנחיות מקובלות ממקורות מוכרים כמו ACSM (הקולג׳ האמריקאי לרפואת ספורט), Mayo Clinic ומשרד הבריאות, ומציין את המקור בתשובה.</p>
                <p className="text-[13px] text-muted leading-relaxed">המידע הוא כללי בלבד ולא תחליף לייעוץ רפואי אישי. בכאב, פציעה או מצב רפואי - תמיד להתייעץ עם רופא או פיזיותרפיסט.</p>
            </Card>
        </div>;
    }

    const Row = ({ icon, label, sub2, onClick }: { icon: string; label: string; sub2?: string; onClick: () => void }) => (
        <motion.button whileTap={{ scale: 0.99 }} transition={spring}
            className="w-full flex items-center gap-3 px-4 py-3.5 text-right"
            onClick={onClick}>
            <span className="w-9 h-9 rounded-xl bg-accdim text-acc grid place-items-center shrink-0"><Icon name={icon} size={18} /></span>
            <span className="grow flex flex-col gap-0.5 min-w-0">
                <strong className="text-[14.5px] font-bold text-ink">{label}</strong>
                {sub2 && <span className="text-[12.5px] text-muted truncate">{sub2}</span>}
            </span>
            <span className="text-faint shrink-0"><Icon name="fwd" size={16} /></span>
        </motion.button>
    );

    const Group = ({ children }: { children: React.ReactNode }) => (
        <div className="bg-card border border-hairline rounded-2xl divide-y divide-white/5 overflow-hidden">{children}</div>
    );

    return <div className="screen">
        {head('הגדרות', onBack)}
        <AnimatePresence>
            {msg && <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={easeOut}
                className="bg-accdim border border-acc/30 text-acc rounded-xl px-4 py-3 text-[13.5px] font-semibold">{msg}</motion.div>}
        </AnimatePresence>

        <p className="text-[13px] font-bold text-faint mt-2">הגדרות משתמש</p>
        <Group>
            <Row icon="user" label="עריכת נתונים ומטרות" sub2="גיל, גובה, משקל, מטרה ובניית תוכנית מחדש" onClick={onRedoOnboarding} />
            <Row icon="apple" label="הגדרות תזונה" sub2="העדפת תזונה ויעדים יומיים" onClick={() => setSub('diet')} />
            <Row icon="plus" label="מגבלות רפואיות" sub2={profile.limitations ? profile.limitations.slice(0, 40) : 'לא צוין'} onClick={() => { setMedText(profile.limitations || ''); setSub('medical'); }} />
            <Row icon="dumbbell" label="ציוד נגיש" sub2="התאמת אימונים לציוד שיש לך" onClick={() => setSub('equipment')} />
            <Row icon="sliders" label="המשקלים שלי" sub2={equipW.length ? equipW.map((w) => `${w.name} ${w.kg}`).join(' · ') : 'משקלי ציוד שמוזנים אוטומטית באימון'} onClick={() => setSub('weights')} />
            <Row icon="timer" label="שיימר מנוחה" sub2={restTimer.on ? `קבוע - ${Math.floor(restTimer.sec / 60)}:${String(restTimer.sec % 60).padStart(2, '0')} בין סטים` : 'כבוי - מנוחה לפי התוכנית'} onClick={() => setSub('timer')} />
        </Group>

        <Card className="p-4">
            <h2 className="text-[16px] font-extrabold text-ink mb-3">מראה</h2>
            <Button variant="secondary" onClick={() => setDark(!dark)}>{dark ? 'עבור למצב בהיר' : 'עבור למצב כהה'}</Button>
        </Card>
        <p className="text-[13px] font-bold text-faint mt-2">AI ופרטיות</p>
        <Group>
            <Row icon="spark" label="מפתח API" sub2={coachSettings.apiKey ? 'מפתח שמור - עדכון או הסרה' : 'הזנה מאובטחת של מפתח למאמן ולארוחות'} onClick={() => { setKeyDraft(''); setShowKey(false); setSub('apikey'); }} />
        </Group>

        <p className="text-[13px] font-bold text-faint mt-2">נתונים</p>
        <Group>
            <Row icon="book" label="גיבוי ושחזור" sub2="ייצוא וייבוא של כל הנתונים" onClick={() => setSub('backup')} />
            <Row icon="question" label="מידע רפואי ומקורות" onClick={() => setSub('sources')} />
        </Group>

        <Card className="p-4 flex flex-col gap-3">
            <strong className="text-[14px] text-ink">SwoleUp v6.7</strong>
            <button className="text-[14px] text-acc text-right" onClick={checkUpdate}>בדוק עדכון</button>
            {updateMessage && <p className="text-[13px] text-muted">{updateMessage}</p>}
            {updateAvailable && <button className="text-acc" onClick={()=>location.reload()}>רענן לגרסה החדשה</button>}
            <button className="text-[14px] text-muted text-right" onClick={readDisplayInfo}>מידע תצוגה לבדיקה</button>
            {displayInfo && <pre dir="ltr" style={{fontSize:12,whiteSpace:'pre-wrap',margin:0,userSelect:'text'}}>{displayInfo}</pre>}
        </Card>

        <Card className="p-5 flex flex-col gap-3 border-danger/30">
            <h2 className="text-[17px] font-extrabold text-ink">איפוס</h2>
            {!confirmReset
                ? <button className="text-[14px] font-semibold text-danger text-right" onClick={() => setConfirmReset(true)}>מחיקת כל הנתונים</button>
                : <>
                    <p className="text-[14px] text-ink/90">בטוח? זה מוחק את הפרופיל, התוכנית וכל המעקב.</p>
                    <div className="flex gap-2">
                        <Button variant="danger" onClick={() => {
                            setProfile(null); setPlan(null); setLogs([]); setWater({}); setWeights([]);
                            setFoods({}); setMealHistory([]); setCoach([]); setCoachSettings(DEFAULT_SETTINGS); setProgress({}); setEquipW([]);
                            onReset();
                        }}>כן, מחק הכל</Button>
                        <Button variant="ghost" onClick={() => setConfirmReset(false)}>ביטול</Button>
                    </div>
                </>}
        </Card>
    </div>;
}

// Daily calorie/protein targets with manual override (FitBuddy's הגדרות תזונה):
// editable values, lime עדכן button, and a reset back to the computed targets.
function TargetsCard({ profile, saveProfile }: { profile: Profile; saveProfile: (p: Profile, regen: boolean) => void }) {
    const [kcal, setKcal] = useState(String(calorieTarget(profile)));
    const [protein, setProtein] = useState(String(proteinTarget(profile)));
    const [saved, setSaved] = useState(false);
    const kcalN = Math.round(Number(kcal));
    const proteinN = Math.round(Number(protein));
    const valid = kcalN >= 800 && kcalN <= 6000 && proteinN >= 20 && proteinN <= 400;
    const dirty = kcalN !== calorieTarget(profile) || proteinN !== proteinTarget(profile);
    return <Card className="p-5 flex flex-col gap-3.5">
        <h2 className="text-[17px] font-extrabold text-ink">היעדים היומיים שלך</h2>
        <label className="flex flex-col gap-1.5"><span className="text-[12.5px] text-muted">קלוריות יומיות</span>
            <TextInput type="number" inputMode="numeric" value={kcal} onChange={(e) => { setKcal(e.target.value); setSaved(false); }} />
        </label>
        <label className="flex flex-col gap-1.5"><span className="text-[12.5px] text-muted">נתח חלבון יומי (גרם)</span>
            <TextInput type="number" inputMode="numeric" value={protein} onChange={(e) => { setProtein(e.target.value); setSaved(false); }} />
        </label>
        <Button variant="primary" disabled={!valid || !dirty} onClick={() => {
            saveProfile({ ...profile, kcalTarget: kcalN, proteinTarget: proteinN }, false);
            setSaved(true);
        }}>{saved ? 'עודכן ✓' : 'עדכן'}</Button>
        {!valid && <p className="text-[12px] text-faint">קלוריות 800-6000, חלבון 20-400 גרם.</p>}
        {(profile.kcalTarget || profile.proteinTarget) && <button className="text-[13px] font-semibold text-muted underline underline-offset-4 decoration-hairline" onClick={() => {
            const next = { ...profile };
            delete next.kcalTarget; delete next.proteinTarget;
            saveProfile(next, false);
            setKcal(String(calorieTarget(next))); setProtein(String(proteinTarget(next)));
        }}>איפוס יעדים לחישוב האוטומטי</button>}
        <p className="text-[12px] text-faint leading-relaxed">החישוב האוטומטי מבוסס על נוסחת Mifflin-St Jeor מהנתונים שהזנת. מים: {(waterTargetMl(profile) / 1000).toFixed(1)} ליטר.</p>
    </Card>;
}

// Equipment weights editor: named weights (dumbbells, bar, kettlebell...) that
// auto-fill matching exercises during a workout. kg in 0.5 steps.
function EquipWeightsEditor({ items, onChange }: { items: EquipWeight[]; onChange: (v: EquipWeight[]) => void }) {
    const [name, setName] = useState('');
    const [kg, setKg] = useState(7.5);
    const presets = ['דמבלים', 'מוט', 'קטלבל', 'גומיות'];

    const add = (n: string) => {
        const trimmed = n.trim();
        if (!trimmed) return;
        if (items.some((w) => w.name === trimmed)) {
            onChange(items.map((w) => w.name === trimmed ? { ...w, kg } : w));
        } else {
            onChange([...items, { id: Math.random().toString(36).slice(2, 8), name: trimmed, kg }]);
        }
        setName('');
    };

    const bump = (id: string, d: number) =>
        onChange(items.map((w) => w.id === id ? { ...w, kg: Math.max(0.5, Math.round((w.kg + d) * 2) / 2) } : w));

    return <div className="flex flex-col gap-4">
        {items.length > 0 && (
            <div className="flex flex-col gap-2">
                {items.map((w) => (
                    <div key={w.id} className="flex items-center gap-3 bg-card2 border border-hairline rounded-xl p-2.5">
                        <strong className="grow text-[14.5px] font-bold text-ink">{w.name}</strong>
                        <div className="flex items-center gap-1.5" dir="ltr">
                            <motion.button whileTap={{ scale: 0.88 }} transition={spring} className="w-8 h-8 rounded-lg bg-card border border-hairline text-ink grid place-items-center" onClick={() => bump(w.id, -0.5)} aria-label="פחות">
                                <Icon name="minus" size={14} />
                            </motion.button>
                            <span className="w-16 text-center text-[15px] font-extrabold text-ink tabular-nums">{w.kg} ק״ג</span>
                            <motion.button whileTap={{ scale: 0.88 }} transition={spring} className="w-8 h-8 rounded-lg bg-card border border-hairline text-ink grid place-items-center" onClick={() => bump(w.id, 0.5)} aria-label="עוד">
                                <Icon name="plus" size={14} />
                            </motion.button>
                        </div>
                        <motion.button whileTap={{ scale: 0.88 }} transition={spring} className="w-8 h-8 rounded-lg text-faint grid place-items-center" onClick={() => onChange(items.filter((x) => x.id !== w.id))} aria-label={`מחק ${w.name}`}>
                            <Icon name="trash" size={15} />
                        </motion.button>
                    </div>
                ))}
            </div>
        )}

        <div className="flex flex-col gap-2.5 border-t border-hairline pt-3.5">
            <span className="text-[12.5px] font-semibold text-muted">הוספת משקל</span>
            <div className="flex flex-wrap gap-2">
                {presets.map((p) => <Chip key={p} active={name === p} onClick={() => setName(p)}>{p}</Chip>)}
            </div>
            <TextInput placeholder="או שם חופשי (למשל: משקל רוסי 12)" value={name} onChange={(e) => setName(e.target.value)} />
            <div className="flex items-center justify-center gap-4" dir="ltr">
                <motion.button whileTap={{ scale: 0.9 }} transition={spring} className="w-10 h-10 rounded-full bg-card2 border border-hairline text-ink grid place-items-center" onClick={() => setKg(Math.max(0.5, kg - 0.5))} aria-label="פחות משקל">
                    <Icon name="minus" size={16} />
                </motion.button>
                <span className="text-[24px] font-extrabold text-ink tabular-nums min-w-[90px] text-center">{kg} ק״ג</span>
                <motion.button whileTap={{ scale: 0.9 }} transition={spring} className="w-10 h-10 rounded-full bg-card2 border border-hairline text-ink grid place-items-center" onClick={() => setKg(kg + 0.5)} aria-label="עוד משקל">
                    <Icon name="plus" size={16} />
                </motion.button>
            </div>
            <Button variant="primary" disabled={!name.trim()} onClick={() => add(name)}>
                {items.some((w) => w.name === name.trim()) ? 'עדכון המשקל' : 'הוספה'}
            </Button>
        </div>
    </div>;
}
