// SwoleUp design system - shadcn-style primitives on Tailwind utilities + Framer Motion.
// All our own code. Visual language: FitBuddy navy/lime, shadcn component patterns.
import React from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from './vendor/framer-motion.vendor.mjs';

/* ---------- Motion presets ---------- */
export const spring = { type: 'spring', stiffness: 380, damping: 32 } as const;
export const springSoft = { type: 'spring', stiffness: 260, damping: 28 } as const;
export const easeOut = { duration: 0.22, ease: [0.22, 1, 0.36, 1] } as const;

export const fadeUp = {
    initial: { opacity: 0, y: 14 },
    animate: { opacity: 1, y: 0 },
    exit: { opacity: 0, y: -8 },
    transition: easeOut,
};

export const staggerParent = (stagger = 0.05, delay = 0) => ({
    animate: { transition: { staggerChildren: stagger, delayChildren: delay } },
});
export const staggerChild = {
    initial: { opacity: 0, y: 12 },
    animate: { opacity: 1, y: 0, transition: easeOut },
};

/* ---------- Primitives ---------- */
type PressableProps = React.ButtonHTMLAttributes<HTMLButtonElement> & { children: React.ReactNode };

export function Pressable({ children, className = '', ...rest }: PressableProps) {
    return (
        <motion.button whileTap={{ scale: 0.97 }} transition={spring} className={className} {...(rest as any)}>
            {children}
        </motion.button>
    );
}

type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'outline';
const btnBase =
    'inline-flex items-center justify-center gap-2 rounded-full font-bold transition-colors min-h-[46px] px-5 text-[15px] disabled:opacity-50 disabled:pointer-events-none select-none';
const btnVariants: Record<ButtonVariant, string> = {
    primary: 'bg-acc text-accink shadow-acc active:bg-[#bfe13e]',
    secondary: 'bg-card2 text-ink border border-hairline',
    outline: 'bg-transparent text-acc border border-acc/60',
    ghost: 'bg-transparent text-acc',
    danger: 'bg-danger/15 text-danger border border-danger/30',
};

export function Button({ variant = 'primary', className = '', children, ...rest }: PressableProps & { variant?: ButtonVariant }) {
    return (
        <motion.button whileTap={{ scale: 0.965 }} transition={spring} className={`${btnBase} ${btnVariants[variant]} ${className}`} {...(rest as any)}>
            {children}
        </motion.button>
    );
}

export function IconButton({ className = '', children, label, ...rest }: PressableProps & { label: string }) {
    return (
        <motion.button
            whileTap={{ scale: 0.9 }}
            transition={spring}
            aria-label={label}
            className={`inline-flex items-center justify-center w-10 h-10 rounded-full bg-card2 border border-hairline text-ink ${className}`}
            {...(rest as any)}
        >
            {children}
        </motion.button>
    );
}

export function Card({ className = '', children, ...rest }: React.HTMLAttributes<HTMLDivElement>) {
    return <div className={`bg-card border border-hairline rounded-2xl ${className}`} {...rest}>{children}</div>;
}

export function MotionCard({ className = '', children, ...rest }: React.HTMLAttributes<HTMLDivElement>) {
    return (
        <motion.div variants={staggerChild} className={`bg-card border border-hairline rounded-2xl ${className}`} {...(rest as any)}>
            {children}
        </motion.div>
    );
}

export function SectionTitle({ children, className = '' }: { children: React.ReactNode; className?: string }) {
    return <h2 className={`text-[17px] font-extrabold text-ink ${className}`}>{children}</h2>;
}

export function Muted({ children, className = '' }: { children: React.ReactNode; className?: string }) {
    return <p className={`text-[13px] text-muted leading-relaxed ${className}`}>{children}</p>;
}

/* Segmented control (nutrition tracker/menu switch) */
export function Segmented({ options, value, onChange }: { options: { id: string; label: string }[]; value: string; onChange: (id: string) => void }) {
    return (
        <div className="flex bg-card2 border border-hairline rounded-full p-1 relative">
            {options.map((o) => {
                const active = o.id === value;
                return (
                    <button key={o.id} onClick={() => onChange(o.id)} className="relative flex-1 h-10 rounded-full text-[14px] font-bold z-10" style={{ color: active ? '#1a1d08' : '#9aa1b5' }}>
                        {active && <motion.span layoutId="seg-pill" transition={spring} className="absolute inset-0 bg-acc rounded-full" style={{ zIndex: -1 }} />}
                        {o.label}
                    </button>
                );
            })}
        </div>
    );
}

/* Chip (selectable) */
export function Chip({ active, children, onClick, className = '' }: { active?: boolean; children: React.ReactNode; onClick?: () => void; className?: string }) {
    return (
        <motion.button
            whileTap={{ scale: 0.95 }}
            transition={spring}
            onClick={onClick}
            className={`rounded-full px-4 min-h-[44px] text-[14px] font-semibold border transition-colors ${active ? 'bg-acc text-accink border-acc' : 'bg-input text-ink border-hairline'} ${className}`}
        >
            {children}
        </motion.button>
    );
}

/* Text input, shadcn-style */
export const TextInput = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(function TextInput({ className = '', ...rest }, ref) {
    return (
        <input
            ref={ref}
            className={`w-full box-border bg-input border border-hairline rounded-xl px-4 py-3.5 text-[16px] text-ink placeholder:text-faint outline-none focus:border-acc/70 focus:ring-2 focus:ring-acc/20 transition ${className}`}
            {...rest}
        />
    );
});

/* Bottom sheet with spring entrance + scrim. Portaled to the .app shell so a
   transformed or scrolling ancestor (screen transitions, .content) can never
   clip it or drop it under the tab bar; absolute, not fixed, because the shell
   is height-locked to the visible area in the hosted viewer. */
export function Sheet({ open, onClose, children, title }: { open: boolean; onClose?: () => void; children: React.ReactNode; title?: React.ReactNode }) {
    const host = typeof document !== 'undefined' ? (document.querySelector('.app') as HTMLElement | null) : null;
    const tree = (
        <AnimatePresence>
            {open && (
                <motion.div className="absolute inset-0 z-[100] flex items-end justify-center" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                    <div className="absolute inset-0 bg-black/60" onClick={onClose} />
                    <motion.div
                        initial={{ y: '100%' }}
                        animate={{ y: 0 }}
                        exit={{ y: '100%' }}
                        transition={springSoft}
                        className="relative w-full max-w-[430px] bg-card border border-hairline rounded-t-3xl shadow-sheet max-h-[88%] flex flex-col overflow-hidden"
                    >
                        <div className="pt-2.5 pb-1 grid place-items-center shrink-0">
                            <div className="w-10 h-1.5 rounded-full bg-hairline" />
                        </div>
                        {title && <div className="px-5 pb-2 text-[17px] font-extrabold text-ink shrink-0">{title}</div>}
                        <div className="overflow-y-auto overscroll-contain px-5 pb-6 grow">{children}</div>
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>
    );
    return host ? createPortal(tree, host) : tree;
}

/* Screen transition wrapper: slide-in from the left (RTL forward = left) */
export function Screen({ children, k, className = '' }: { children: React.ReactNode; k: string; className?: string }) {
    return (
        <motion.div
            key={k}
            initial={{ opacity: 0, x: -18 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 12 }}
            transition={easeOut}
            className={className}
        >
            {children}
        </motion.div>
    );
}

/* Animated number (kcal, water, counters) */
export function CountUp({ value, className = '' }: { value: number; className?: string }) {
    return <motion.span key={value} initial={{ opacity: 0.4, y: 4 }} animate={{ opacity: 1, y: 0 }} transition={easeOut} className={`inline-block ${className}`}>{value}</motion.span>;
}
