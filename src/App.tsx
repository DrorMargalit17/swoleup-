import React, { useEffect, useMemo, useState } from 'react';
import { motion, AnimatePresence } from './vendor/framer-motion.vendor.mjs';
import { Profile, Plan, generatePlan } from './data';
import { useStore } from './store';
import { useStorageStatus } from './localState';
import { Onboarding } from './onboarding';
import { Workouts } from './screens/Workouts';
import { Track } from './screens/Track';
import { Coach } from './screens/Coach';
import { ProfileScreen } from './screens/Profile';
import { Icon } from './ui';
import { spring, easeOut } from './ds';
import hero from './photos/drorfit-hero.webp';
import './style.css';
import { PageLoadOverlay } from './PageLoadOverlay';

type Tab = 'workouts' | 'nutrition' | 'coach' | 'profile';

const TABS: { id: Tab; label: string; icon: string }[] = [
    { id: 'workouts', label: 'אימונים', icon: 'dumbbell' },
    { id: 'nutrition', label: 'תזונה', icon: 'apple' },
    { id: 'coach', label: 'מאמן אישי', icon: 'chat' },
    { id: 'profile', label: 'פרופיל', icon: 'user' },
];

function Building() {
    const [line, setLine] = useState(0);
    const lines = ['מנתח את הפרופיל שלך…', 'בוחר תרגילים שמתאימים לך…', 'מאזן עומסים ומנוחות…', 'מסדר את השבוע שלך…'];
    useEffect(() => {
        const t = setInterval(() => setLine((l) => Math.min(l + 1, lines.length - 1)), 700);
        return () => clearInterval(t);
    }, []);
    return <div className="grid place-items-center min-h-[60vh] text-center gap-4 content-center">
        <motion.span
            className="w-16 h-16 rounded-2xl bg-acc grid place-items-center text-accink shadow-acc"
            animate={{ scale: [1, 1.12, 1], rotate: [0, 4, -4, 0] }}
            transition={{ duration: 1.6, repeat: Infinity, ease: 'easeInOut' }}
        >
            <Icon name="dumbbell" size={30} />
        </motion.span>
        <h1 className="text-[22px] font-extrabold text-ink">בונה לך תוכנית אישית</h1>
        <AnimatePresence mode="wait">
            <motion.p key={line}
                initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}
                transition={easeOut}
                className="text-[14px] text-muted">{lines[line]}</motion.p>
        </AnimatePresence>
    </div>;
}

export function App() {
    const [profile, setProfile] = useStore<Profile | null>('profile.v1', null);
    const [plan, setPlan] = useStore<Plan | null>('plan.v1', null);
    const [tab, setTab] = useState<Tab>('workouts');
    const [building, setBuilding] = useState(false);
    const [resetKey, setResetKey] = useState(0);
    // Dark navy is the SwoleUp identity (FitBuddy look) - default to dark regardless of OS setting.
    const prefersDark = useMemo(() => true, []);
    const [dark] = useStore<boolean>('dark.v1', prefersDark);
    const storage = useStorageStatus();
    useEffect(() => {
        const apply = () => {
            const vv = window.visualViewport;
            const h = vv?.height || window.innerHeight;
            document.documentElement.style.setProperty('--app-height', h + 'px');
            document.documentElement.style.setProperty('--app-top', (vv?.offsetTop || 0) + 'px');
            const typing = /INPUT|TEXTAREA/.test(document.activeElement?.tagName || '');
            document.documentElement.classList.toggle('keyboard-open', typing && window.innerHeight-h>120);
        };
        apply();
        window.addEventListener('resize', apply);
        window.visualViewport?.addEventListener('resize', apply);
        window.visualViewport?.addEventListener('scroll', apply);
        document.addEventListener('focusin', apply);
        document.addEventListener('focusout', apply);
        return () => {
            window.removeEventListener('resize', apply);
            window.visualViewport?.removeEventListener('resize', apply);
            window.visualViewport?.removeEventListener('scroll', apply);
            document.removeEventListener('focusin', apply);
            document.removeEventListener('focusout', apply);
        };
    }, []);

    // Migrate older plans to the level-aware v2 generator.
    useEffect(() => {
        if (profile && (!plan || (plan as Plan).version !== 2)) setPlan(generatePlan(profile));
    }, [profile]);

    const finishOnboarding = (p: Profile) => {
        setProfile(p);
        setBuilding(true);
        const newPlan = generatePlan(p);
        setPlan(newPlan);
        setTimeout(() => { setBuilding(false); setTab('workouts'); }, 3000);
    };

    if (!storage.ready) return <div className="app storage-loading" role="status">טוען את הנתונים השמורים…</div>;
    const saveWarning = storage.message && <div role="alert" className="storage-warning">{storage.message}</div>;
    if (building) return <div dir="rtl" lang="he" className={dark ? "app" : "app light"}><Building /></div>;

    if (!profile || !plan) {
        return <div dir="rtl" lang="he" className={dark ? "app" : "app light"}>
            {saveWarning}<div className="content">
                <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} transition={easeOut}
                    className="text-[30px] font-extrabold text-ink text-center tracking-tight">
                    Swole<span className="text-acc">Up</span>
                </motion.div>
                <motion.img
                    initial={{ opacity: 0, scale: 0.94 }} animate={{ opacity: 1, scale: 1 }} transition={{ ...easeOut, delay: 0.1 }}
                    className="welcome-img" width={525} height={700} src={hero} alt="איור של משקולת ובקבוק מים" fetchPriority="high" decoding="async" />
                <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ ...easeOut, delay: 0.2 }}
                    className="text-center text-[14.5px] text-muted leading-relaxed max-w-[300px] mx-auto">
                    אפליקציית הכושר האישית שלך. בחינם, בלי פרסומות, והנתונים נשארים אצלך.
                </motion.p>
                <Onboarding key={resetKey} initial={profile || undefined} onDone={finishOnboarding} />
            </div>
            <PageLoadOverlay route="onboarding" />
        </div>;
    }

    return <div dir="rtl" lang="he" className={dark ? "app" : "app light"}>
        {saveWarning}<main className="content">
            {/* key-remount slide-in only: no AnimatePresence exit, so a stuck
                exit animation can never freeze tab switching in the viewer iframe */}
            <motion.div key={tab} style={{ display: tab === 'coach' ? 'none' : 'block' }}
                    initial={{ opacity: 0, x: -14 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={easeOut}
                    className="h-full"
                >
                    {tab === 'workouts' && <Workouts profile={profile} plan={plan} goProfile={() => setTab('profile')} />}
                    {tab === 'nutrition' && <Track profile={profile} />}

                    {tab === 'profile' && <ProfileScreen profile={profile} plan={plan}
                        onRedoOnboarding={() => { setProfile(null); }}
                        onReset={() => { setResetKey((k) => k + 1); setProfile(null); setPlan(null); setTab('workouts'); }}
                        goCoach={() => setTab('coach')} />}
                </motion.div>
            {/* Keep the request-owning chat mounted while another tab is visible. */}
            <div style={{ display: tab === 'coach' ? 'block' : 'none' }} aria-hidden={tab !== 'coach'}>
                <Coach profile={profile} plan={plan} active={tab === 'coach'} />
            </div>
        </main>
        <PageLoadOverlay route={tab} />
        <nav className="tabbar">
            {TABS.map((t) => {
                const on = tab === t.id;
                return <button key={t.id} className={'tab' + (on ? ' on' : '')} onClick={() => setTab(t.id)} aria-label={t.label}>
                    {on && <motion.span layoutId="tabpill" transition={spring} className="tab-pill" />}
                    <span className="relative z-10 flex flex-col items-center gap-0.5">
                        <Icon name={t.icon} size={21} />
                        <span>{t.label}</span>
                    </span>
                </button>;
            })}
        </nav>
    </div>;
}
