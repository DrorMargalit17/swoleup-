import React, { useEffect, useMemo, useRef, useState } from 'react';


import { Profile, FoodEntry, calorieTarget, waterTargetMl, proteinTarget } from '../data';
import { useStore, todayKey, uid, capDayMap } from '../store';
import { MealsFlow } from './Meals';
import { MealSuggestion, FoodEstimate, estimateFood } from '../meals';
import { CoachSettings, DEFAULT_SETTINGS, GEMINI_MODEL } from '../coach';
import { mealImage } from '../mealImages';
import { Icon } from '../ui';
import { motion } from '../vendor/framer-motion.vendor.mjs';
import { Sheet, Button, Segmented, TextInput, Chip, staggerParent, spring, easeOut } from '../ds';

const DAY_LETTERS = ['א', 'ב', 'ג', 'ד', 'ה', 'ו', 'ש'];
const SLOTS = [
    { id: 'בוקר', label: 'ארוחת בוקר', icon: 'sunrise' },
    { id: 'צהריים', label: 'ארוחת צהריים', icon: 'cutlery' },
    { id: 'ערב', label: 'ארוחת ערב', icon: 'cutlery' },
];

function weekDates(center: Date): Date[] {
    const s = new Date(center);
    s.setDate(s.getDate() - s.getDay());
    return Array.from({ length: 7 }, (_, i) => { const d = new Date(s); d.setDate(s.getDate() + i); return d; });
}

export function Track({ profile }: { profile: Profile }) {
    const [water, setWater] = useStore<Record<string, number>>('water.v1', {});
    const [foods, setFoods] = useStore<Record<string, FoodEntry[]>>('foods.v1', {});
    const [favs] = useStore<MealSuggestion[]>('mealfavs.v1', []);
    const [mealsOpen, setMealsOpen] = useState(false);
    const [openMeal, setOpenMeal] = useState<MealSuggestion | null>(null);
    const [mode, setMode] = useState<'track' | 'menu'>('track');
    const [dayKey, setDayKey] = useState(todayKey());
    const [settings, setSettings] = useStore<CoachSettings>('coachsettings.v1', DEFAULT_SETTINGS);
    const [addSlot, setAddSlot] = useState<string | null>(null);
    const [sheetView, setSheetView] = useState<'tiles' | 'manual' | 'describe' | 'photo' | 'saved' | 'result'>('tiles');
    const [foodName, setFoodName] = useState('');
    const [foodKcal, setFoodKcal] = useState('');
    const [foodProtein, setFoodProtein] = useState('');
    const [desc, setDesc] = useState('');
    const [photo, setPhoto] = useState<{ url: string; base64: string; mime: string } | null>(null);
    const [photoNote, setPhotoNote] = useState('');
    const [estimating, setEstimating] = useState(false);
    const [estimate, setEstimate] = useState<FoodEstimate | null>(null);
    const [estErr, setEstErr] = useState('');
    const fileRef = useRef<HTMLInputElement>(null);
    const carouselRef = useRef<HTMLDivElement>(null);
    const nameFocusRef = useRef<HTMLInputElement>(null);
    const descFocusRef = useRef<HTMLTextAreaElement>(null);
    // preventScroll: a plain autoFocus scrolls the host viewer page under its sticky header.
    useEffect(() => { if (sheetView === 'manual') nameFocusRef.current?.focus({ preventScroll: true }); }, [sheetView]);
    useEffect(() => { if (sheetView === 'describe') descFocusRef.current?.focus({ preventScroll: true }); }, [sheetView]);
    const [cardIdx, setCardIdx] = useState(0);

    const t = todayKey();
    const isToday = dayKey === t;
    const foodsDay = foods[dayKey] || [];
    const waterDay = water[dayKey] || 0;
    const kcalDay = foodsDay.reduce((n, f) => n + f.kcal, 0);
    const proteinDay = foodsDay.reduce((n, f) => n + (f.protein || 0), 0);
    const kcalGoal = calorieTarget(profile);
    const proteinGoal = proteinTarget(profile);
    const waterGoal = waterTargetMl(profile);

    const week = useMemo(() => weekDates(new Date()), []);
    const slotFoods = (slot: string) => foodsDay.filter((f) => (f.slot || 'צהריים') === slot);
    // Derive additional slots from existing data, including old snack entries.
    const extraIds = Array.from(new Set(foodsDay.map(f => f.slot || 'צהריים'))).filter(id => !SLOTS.some(s => s.id === id));
    const slots = [...SLOTS, ...extraIds.map((id, i) => ({ id, label: `ארוחה נוספת ${i + 1}`, icon: 'apple' }))];
    const addExtraMeal = () => {
        setSheetView('tiles'); setAddSlot('extra-' + uid());
    };

    const closeSheet = () => {
        setAddSlot(null); setSheetView('tiles'); setFoodName(''); setFoodKcal(''); setFoodProtein('');
        setDesc(''); setPhoto(null); setPhotoNote(''); setEstimating(false); setEstimate(null); setEstErr('');
    };
    const addEntry = (e: Omit<FoodEntry, 'id' | 'slot'>) => {
        if (!addSlot) return;
        setFoods(capDayMap({ ...foods, [dayKey]: [...foodsDay, { id: uid(), slot: addSlot, ...e }] }));
        closeSheet();
    };
    const addFood = () => {
        const kcal = Number(foodKcal);
        if (!foodName.trim() || !kcal) return;
        addEntry({ name: foodName.trim(), kcal, protein: Number(foodProtein) || undefined });
    };
    const onPhoto = (file: File) => {
        const img = new Image();
        const url = URL.createObjectURL(file);
        img.onload = () => {
            const scale = Math.min(1, 1024 / Math.max(img.width, img.height));
            const c = document.createElement('canvas');
            c.width = Math.round(img.width * scale); c.height = Math.round(img.height * scale);
            c.getContext('2d')?.drawImage(img, 0, 0, c.width, c.height);
            const dataUrl = c.toDataURL('image/jpeg', 0.85);
            setPhoto({ url: dataUrl, base64: dataUrl.split(',')[1], mime: 'image/jpeg' });
            URL.revokeObjectURL(url);
        };
        img.src = url;
    };
    const runEstimate = async (text: string, img?: { base64: string; mime: string }) => {
        setEstimating(true); setEstErr('');
        try {
            const est = await estimateFood(settings, text, img);
            setEstimate(est); setSheetView('result');
        } catch (err) {
            setEstErr(err instanceof Error && err.message.includes('401') ? 'המפתח לא תקין - בדקו אותו בהגדרות' : 'לא הצלחתי לחשב. נסו שוב או רשמו ידנית.');
        } finally { setEstimating(false); }
    };
    const delFood = (id: string) => setFoods(capDayMap({ ...foods, [dayKey]: foodsDay.filter((f) => f.id !== id) }));
    const addWater = (ml: number) => setWater(capDayMap({ ...water, [dayKey]: Math.max(0, (water[dayKey] || 0) + ml) }));

    if (mealsOpen) {
        return <MealsFlow profile={profile} openMeal={openMeal} onClose={() => { setMealsOpen(false); setOpenMeal(null); }} />;
    }

    const Bar = ({ pct }: { pct: number }) => (
        <div className="fb-bar"><div style={{ width: `${Math.min(100, Math.max(0, pct * 100))}%` }} /></div>
    );

    return <div className="screen fb-screen">
        <h1 className="text-[26px] font-extrabold text-ink tracking-tight">תזונה</h1>

        <Segmented
            options={[{ id: 'track', label: 'מעקב יומי' }, { id: 'menu', label: 'התפריט שלך' }]}
            value={mode}
            onChange={(id) => setMode(id as 'track' | 'menu')}
        />

        <div className="flex justify-between gap-1">
            {week.map((d) => {
                const k = todayKey(d);
                const future = k > t;
                const on = k === dayKey;
                return <motion.button key={k} whileTap={future ? undefined : { scale: 0.9 }} transition={spring} disabled={future}
                    onClick={() => setDayKey(k)}
                    className={`flex flex-col items-center gap-1 py-1.5 rounded-2xl min-w-[44px] transition-colors ${future ? 'opacity-35' : ''}`}>
                    <span className="text-[11px] font-semibold text-muted">{DAY_LETTERS[d.getDay()]}</span>
                    <span className={`w-9 h-9 grid place-items-center rounded-full text-[15px] font-bold transition-colors ${on ? 'bg-acc text-accink shadow-acc' : 'text-ink'}`}>{d.getDate()}</span>
                </motion.button>;
            })}
        </div>

        {mode === 'menu' ? <>
            <motion.button whileTap={{ scale: 0.98 }} transition={spring} onClick={() => setMealsOpen(true)}
                className="w-full flex items-center gap-3.5 rounded-2xl p-4 text-start border border-acc/35"
                style={{ background: 'linear-gradient(135deg, rgba(205,241,76,0.14), rgba(205,241,76,0.05))' }}>
                <span className="w-12 h-12 rounded-2xl bg-acc text-accink grid place-items-center shrink-0 shadow-acc"><Icon name="spark" size={22} /></span>
                <span className="min-w-0 grow">
                    <strong className="block text-[16px] font-extrabold text-ink">רעבים ואין רעיון מה לאכול?</strong>
                    <span className="block text-[12.5px] text-muted mt-0.5 leading-relaxed">ענו על כמה שאלות וקבלו 3 הצעות לארוחה או נשנוש, מותאמות ליום שלכם</span>
                </span>
                <Icon name="fwd" size={18} className="text-acc shrink-0" />
            </motion.button>
            {favs.length === 0 && <div className="bg-card border border-hairline rounded-2xl p-4"><p className="text-[13.5px] text-muted">עוד לא שמרת ארוחות. ב״רעיונות לארוחה״ אפשר לסמן בכוכב ולשמור להמשך.</p></div>}
            {favs.map((m) => (
                <motion.button key={m.id} whileTap={{ scale: 0.98 }} transition={spring} onClick={() => { setOpenMeal(m); setMealsOpen(true); }}
                    className="w-full flex items-center gap-3 bg-card border border-hairline rounded-2xl p-3 text-start">
                    <img src={mealImage(m.category)} alt="" className="w-[52px] h-[52px] rounded-xl object-cover shrink-0 bg-card2" loading="lazy" decoding="async" />
                    <span className="min-w-0 grow">
                        <strong className="block text-[15px] font-bold text-ink">{m.name}</strong>
                        <span className="block text-[12.5px] text-muted mt-0.5">{m.kcal} קק״ל · {m.protein} ג׳ חלבון · {m.prepMin} דק׳</span>
                    </span>
                    <Icon name="fwd" size={16} className="text-faint shrink-0" />
                </motion.button>
            ))}
        </> : <>
            <div className="flex gap-3 overflow-x-auto snap-x snap-mandatory pb-1 -mx-4 px-4 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden" ref={carouselRef} onScroll={(e) => {
                const el = e.currentTarget;
                setCardIdx(Math.round(Math.abs(el.scrollLeft) / (el.clientWidth * 0.62)));
            }}>
                {[
                    { icon: 'dumbbell', tint: 'text-acc', label: 'חלבון', val: `${proteinDay}/${proteinGoal}`, pct: proteinDay / proteinGoal, extra: null },
                    { icon: 'flame', tint: 'text-acc', label: 'קלוריות', val: `${kcalDay}/${kcalGoal}`, pct: kcalDay / kcalGoal, extra: null },
                    { icon: 'drop', tint: 'text-blue', label: 'מים', val: `${(waterDay / 1000).toFixed(2)}/${(waterGoal / 1000).toFixed(1)}ל׳`, pct: waterDay / waterGoal, extra: 'water' },
                ].map((c) => (
                    <div key={c.label} className="min-w-[62%] snap-center bg-card border border-hairline rounded-2xl p-4 flex flex-col gap-1.5">
                        <span className={`w-10 h-10 rounded-xl bg-card2 border border-hairline grid place-items-center ${c.tint}`}><Icon name={c.icon} size={20} /></span>
                        <strong className="text-[14px] font-bold text-muted">{c.label}</strong>
                        <span className="text-[20px] font-extrabold text-ink tabular-nums">{c.val}</span>
                        <div className="h-[7px] rounded-full bg-card2 overflow-hidden" dir="ltr">
                            <motion.div className={`h-full rounded-full ${c.label === 'מים' ? 'bg-blue' : 'bg-acc'}`} initial={{ width: 0 }} animate={{ width: `${Math.min(100, Math.max(0, c.pct * 100))}%` }} transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }} />
                        </div>
                        {c.extra === 'water' && (
                            <div className="flex gap-2 mt-1">
                                <motion.button whileTap={{ scale: 0.93 }} transition={spring} className="flex-1 h-9 rounded-full bg-card2 border border-hairline text-[13px] font-bold text-ink" onClick={() => addWater(250)}>+250</motion.button>
                                <motion.button whileTap={{ scale: 0.93 }} transition={spring} className="flex-1 h-9 rounded-full bg-card2 border border-hairline text-[13px] font-bold text-ink" onClick={() => addWater(500)}>+500</motion.button>
                            </div>
                        )}
                    </div>
                ))}
            </div>
            <div className="flex justify-center gap-1.5 mt-1">{[0, 1, 2].map((i) => <span key={i} className={`h-1.5 rounded-full transition-all ${Math.min(2, Math.max(0, cardIdx)) === i ? 'w-4 bg-acc' : 'w-1.5 bg-card2'}`} />)}</div>

            <h2 className="text-[17px] font-extrabold text-ink mt-2">תיעוד הארוחות שלך</h2>
            <Button variant="secondary" onClick={addExtraMeal}><Icon name="plus" size={16} /> תיעוד ארוחה נוספת</Button>
            <div className="flex flex-col gap-2.5">
                {slots.map((s) => {
                    const items = slotFoods(s.id);
                    return <div key={s.id} className="flex flex-col gap-2">
                        <div className="flex items-center gap-3 bg-card border border-hairline rounded-2xl p-3">
                            <motion.button whileTap={{ scale: 0.88 }} transition={spring} className="w-10 h-10 rounded-full bg-acc text-accink grid place-items-center shrink-0 shadow-acc" onClick={() => { setSheetView('tiles'); setAddSlot(s.id); }} aria-label={`הוספה ל${s.label}`}><Icon name="plus" size={18} /></motion.button>
                            <span className="grow text-[15px] font-bold text-ink">{s.label}</span>
                            <span className="w-10 h-10 rounded-xl bg-card2 border border-hairline grid place-items-center text-muted shrink-0"><Icon name={s.icon} size={20} /></span>
                        </div>
                        {items.map((f) => (
                            <motion.div key={f.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={easeOut}
                                className="flex items-center gap-3 bg-card2/60 border border-hairline rounded-2xl px-3 py-2.5 me-6">
                                <motion.button whileTap={{ scale: 0.85 }} transition={spring} className="w-7 h-7 rounded-full bg-card border border-hairline text-muted grid place-items-center shrink-0" onClick={() => delFood(f.id)} aria-label="מחק"><Icon name="x" size={13} /></motion.button>
                                <span className="grow text-[14px] font-semibold text-ink">{f.name}</span>
                                <span className="text-[12.5px] text-muted tabular-nums shrink-0">{f.kcal} קק״ל{f.protein ? ` · ${f.protein} חלבון` : ''}{f.carbs ? ` · ${f.carbs} פחמ׳` : ''}{f.fat ? ` · ${f.fat} שומן` : ''}</span>
                            </motion.div>
                        ))}
                    </div>;
                })}
                <motion.button whileTap={{ scale: 0.98 }} transition={spring} onClick={() => setMealsOpen(true)}
                    className="flex items-center gap-3 rounded-2xl p-3 border border-acc/35" style={{ background: 'linear-gradient(135deg, rgba(205,241,76,0.10), rgba(205,241,76,0.03))' }}>
                    <span className="w-10 h-10 rounded-xl bg-acc/15 border border-acc/25 grid place-items-center text-acc shrink-0"><Icon name="spark" size={18} /></span>
                    <span className="grow text-[15px] font-bold text-ink">רעיונות לארוחה עם AI</span>
                    <Icon name="fwd" size={16} className="text-acc shrink-0" />
                </motion.button>
            </div>

            <div className="grid grid-cols-4 gap-2 mt-2">
                {[
                    { v: (waterDay / 1000).toFixed(2), l: 'ליטר מים' },
                    { v: String(foodsDay.length), l: 'פריטים' },
                    { v: String(proteinDay), l: 'גרם חלבון' },
                    { v: String(kcalDay), l: 'קק״ל' },
                ].map((x) => (
                    <div key={x.l} className="bg-card border border-hairline rounded-2xl py-3 flex flex-col items-center gap-0.5">
                        <strong className="text-[17px] font-extrabold text-ink tabular-nums">{x.v}</strong>
                        <span className="text-[11px] text-muted">{x.l}</span>
                    </div>
                ))}
            </div>
        </>}

        <Sheet open={addSlot !== null} onClose={closeSheet} title={
            <span className="flex items-center gap-2">
                {sheetView !== 'tiles' && (
                    <motion.button whileTap={{ scale: 0.9 }} transition={spring} className="w-8 h-8 rounded-full bg-card2 border border-hairline grid place-items-center text-ink" onClick={() => { setSheetView('tiles'); setEstErr(''); }} aria-label="חזרה">
                        <Icon name="back" size={16} />
                    </motion.button>
                )}
                הוספה ל{(slots.find((x) => x.id === addSlot)?.label || 'ארוחה נוספת')}
            </span>
        }>

            {sheetView === 'tiles' && <div className="grid grid-cols-2 gap-2.5">
                {[
                    { view: 'manual', icon: 'edit', t: 'רישום ידני', d: 'שם, קלוריות וחלבון' },
                    { view: 'describe', icon: 'spark', t: 'תיאור חופשי', d: 'כותבים מה אכלתם, ה-AI מחשב' },
                    { view: 'photo', icon: 'camera', t: 'צילום', d: 'מצלמים את המנה, ה-AI מחשב' },
                    { view: 'saved', icon: 'heart', t: 'ארוחות שמורות', d: 'מהמועדפים שלכם' },
                ].map((tile) => (
                    <motion.button key={tile.view} whileTap={{ scale: 0.96 }} transition={spring}
                        className="flex flex-col items-start gap-2 bg-card2 border border-hairline rounded-2xl p-4 text-start min-h-[110px]"
                        onClick={() => setSheetView(tile.view as typeof sheetView)}>
                        <span className="w-10 h-10 rounded-xl bg-acc/15 border border-acc/25 grid place-items-center text-acc"><Icon name={tile.icon} size={20} /></span>
                        <strong className="text-[14.5px] font-bold text-ink">{tile.t}</strong>
                        <span className="text-[11.5px] text-muted leading-snug">{tile.d}</span>
                    </motion.button>
                ))}
            </div>}

            {sheetView === 'manual' && <div className="flex flex-col gap-3">
                <TextInput ref={nameFocusRef} placeholder="מה אכלת?" value={foodName} onChange={(e) => setFoodName(e.target.value)} />
                <div className="flex gap-2.5">
                    <TextInput type="number" inputMode="numeric" placeholder="קק״ל" value={foodKcal} onChange={(e) => setFoodKcal(e.target.value)} />
                    <TextInput type="number" inputMode="numeric" placeholder="חלבון" value={foodProtein} onChange={(e) => setFoodProtein(e.target.value)} />
                </div>
                <Button className="w-full" onClick={addFood} disabled={!foodName.trim() || !foodKcal}>הוספה</Button>
            </div>}

            {(sheetView === 'describe' || sheetView === 'photo') && !settings.apiKey && <div className="flex flex-col gap-3">
                <p className="text-[13.5px] text-muted leading-relaxed">כדי שה-AI יחשב ערכים תזונתיים צריך מפתח API פעם אחת - ישירות מהטלפון, בלי שרת באמצע. נשמר רק במכשיר.</p>
                <p className="text-[14px] text-muted">להוספת מפתח: פרופיל ← הגדרות ← מפתח API.</p>
            </div>}

            {sheetView === 'describe' && settings.apiKey && <div className="flex flex-col gap-3">
                <p className="text-[13px] text-muted leading-relaxed">כתבו מה אכלתם ובאיזו כמות, ונחשב קלוריות, חלבון, פחמימות ושומן. למשל: 2 טוסטים עם קוטג׳ ומלפפון.</p>
                <textarea className="w-full box-border bg-input border border-hairline rounded-xl px-4 py-3.5 text-[16px] text-ink placeholder:text-faint outline-none focus:border-acc/70 focus:ring-2 focus:ring-acc/20 transition min-h-[96px] resize-none" placeholder="מה אכלתם?" value={desc} onChange={(e) => setDesc(e.target.value)} ref={descFocusRef} />
                {estErr && <p className="text-[13px] font-semibold text-danger">{estErr}</p>}
                <Button className="w-full" onClick={() => runEstimate(desc.trim())} disabled={!desc.trim() || estimating}>
                    {estimating ? 'מחשב נתונים…' : 'חישוב נתונים'}
                </Button>
            </div>}

            {sheetView === 'photo' && settings.apiKey && <div className="flex flex-col gap-3">
                <input ref={fileRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={(e) => { const f = e.target.files?.[0]; if (f) onPhoto(f); e.target.value = ''; }} />
                {photo
                    ? <img className="w-full max-h-[220px] object-cover rounded-2xl border border-hairline" src={photo.url} alt="המנה" decoding="async" />
                    : <motion.button whileTap={{ scale: 0.97 }} transition={spring} className="w-full min-h-[140px] rounded-2xl border-2 border-dashed border-hairline bg-input flex flex-col items-center justify-center gap-2 text-ink" onClick={() => fileRef.current?.click()}>
                        <span className="w-12 h-12 rounded-2xl bg-acc/15 border border-acc/25 grid place-items-center text-acc"><Icon name="camera" size={24} /></span>
                        <strong className="text-[14.5px] font-bold">צילום או בחירת תמונה</strong>
                    </motion.button>}
                {photo && <TextInput placeholder="הערה לחישוב מדויק יותר (לא חובה)" value={photoNote} onChange={(e) => setPhotoNote(e.target.value)} />}
                {estErr && <p className="text-[13px] font-semibold text-danger">{estErr}</p>}
                <Button className="w-full" onClick={() => photo && runEstimate(photoNote.trim(), photo)} disabled={!photo || estimating}>
                    {estimating ? 'מחשב נתונים…' : 'חישוב נתונים'}
                </Button>
            </div>}

            {sheetView === 'saved' && (favs.length === 0
                ? <p className="text-[13.5px] text-muted leading-relaxed">עוד אין ארוחות שמורות. שמרו מועדפים עם הכוכב במסך רעיונות לארוחה, והן יחכו כאן.</p>
                : <div className="flex flex-col gap-2">
                    {favs.map((m) => (
                        <motion.button key={m.id} whileTap={{ scale: 0.98 }} transition={spring} onClick={() => addEntry({ name: m.name, kcal: m.kcal, protein: m.protein, carbs: m.carbs, fat: m.fat })}
                            className="w-full flex items-center gap-3 bg-card2 border border-hairline rounded-2xl p-3 text-start">
                            <img src={mealImage(m.category)} alt="" className="w-[52px] h-[52px] rounded-xl object-cover shrink-0" loading="lazy" decoding="async" />
                            <span className="min-w-0 grow">
                                <strong className="block text-[15px] font-bold text-ink">{m.name}</strong>
                                <span className="block text-[12.5px] text-muted mt-0.5">{m.kcal} קק״ל · {m.protein} ג׳ חלבון</span>
                            </span>
                            <span className="w-8 h-8 rounded-full bg-acc/15 border border-acc/25 grid place-items-center text-acc shrink-0"><Icon name="plus" size={16} /></span>
                        </motion.button>
                    ))}
                </div>)}

            {sheetView === 'result' && estimate && <div className="flex flex-col gap-3">
                <motion.div initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }} transition={easeOut}
                    className="rounded-2xl p-5 text-center border border-acc/30" style={{ background: 'linear-gradient(160deg, rgba(205,241,76,0.12), rgba(205,241,76,0.03))' }}>
                    <strong className="block text-[17px] font-extrabold text-ink">{estimate.name}</strong>
                    <div className="text-[40px] font-extrabold text-acc leading-tight mt-1 tabular-nums">{estimate.kcal}<span className="text-[16px] font-bold"> קק״ל</span></div>
                    <div className="flex justify-center gap-2 mt-2 flex-wrap">
                        {estimate.protein !== undefined && <span className="bg-card2 border border-hairline rounded-full px-3 py-1 text-[12.5px] font-semibold text-ink"><b className="text-acc">{estimate.protein}</b> ג׳ חלבון</span>}
                        {estimate.carbs !== undefined && <span className="bg-card2 border border-hairline rounded-full px-3 py-1 text-[12.5px] font-semibold text-ink"><b className="text-acc">{estimate.carbs}</b> ג׳ פחמ׳</span>}
                        {estimate.fat !== undefined && <span className="bg-card2 border border-hairline rounded-full px-3 py-1 text-[12.5px] font-semibold text-ink"><b className="text-acc">{estimate.fat}</b> ג׳ שומן</span>}
                    </div>
                </motion.div>
                <Button className="w-full" onClick={() => addEntry(estimate)}>הוספה</Button>
                <Button variant="ghost" className="w-full" onClick={() => { setEstimate(null); setSheetView(photo ? 'photo' : 'describe'); }}>תיקון התיאור</Button>
            </div>}

            {!isToday && <p className="text-[12px] text-faint text-center mt-3">מוסיף ליום {dayKey.split('-').reverse().join('.')}</p>}
        </Sheet>
    </div>;
}
