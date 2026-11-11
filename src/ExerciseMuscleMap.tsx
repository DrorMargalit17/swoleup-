import React from 'react';
import { muscleAreas } from './data';

// Original schematic SVG. No image download, pose model or third-party anatomy art.
const silhouette = 'M38 24 Q50 20 62 24 L70 30 L78 66 L72 69 L62 44 L61 76 L60 98 L58 157 L51 157 L50 105 L49 105 L48 157 L41 157 L39 98 L38 76 L38 44 L28 69 L22 66 L30 30 Z';
export function ExerciseMuscleMap({ muscle }: { muscle: string }) {
    const lit = new Set(muscleAreas(muscle));
    const color = (key: string) => lit.has(key) ? 'var(--lime)' : 'var(--card2)';
    return <section className="bg-card2 border border-hairline rounded-xl p-3.5 mb-4">
        <h4 className="text-[14px] font-extrabold text-ink">אזורי עבודה עיקריים</h4>
        <p className="text-[13px] text-muted">{muscle} · המחשה סכמטית</p>
        <svg role="img" aria-label={`מפת שרירים: ${muscle}`} viewBox="0 0 220 188" style={{ width: '100%', height: 180, marginTop: 8, direction: 'ltr' }}>
            {[0,120].map(x => <g key={x} transform={`translate(${x} 0)`} fill="var(--bm-body)"><circle cx="50" cy="12" r="9" /><path d={silhouette}/></g>)}
            <g stroke="var(--bg)" strokeWidth="1.5">
                <path fill={color('chest')} d="M35 33 Q50 28 65 33 L61 47 L51 49 L50 36 L49 49 L39 47 Z"/>
                <path fill={color('traps')} d="M40 28 L48 25 L46 32 L38 33 Z M52 25 L60 28 L62 33 L54 32 Z"/>
                <path fill={color('shoulders')} d="M30 29 Q34 24 40 28 L36 39 L27 40 Z M60 28 Q66 24 70 29 L73 40 L64 39 Z"/>
                <path fill={color('biceps')} d="M27 41 L35 40 L32 58 L25 57 Z M65 40 L73 41 L75 57 L68 58 Z"/>
                <path fill={color('abs')} d="M41 50 L59 50 L58 75 L42 75 Z"/>
                <path fill={color('quads')} d="M40 85 L49 87 L48 119 L41 119 Z M51 87 L60 85 L59 119 L52 119 Z"/>
                <g transform="translate(120 0)">
                    <path fill={color('shoulders')} d="M30 29 L40 27 L36 39 L27 40 Z M60 27 L70 29 L73 40 L64 39 Z"/>
                    <path fill={color('back')} d="M38 31 L62 31 L59 67 L50 76 L41 67 Z"/>
                    <path fill={color('traps')} d="M38 31 L62 31 L56 46 L50 53 L44 46 Z"/>
                    <path fill={color('triceps')} d="M27 41 L35 40 L32 58 L25 57 Z M65 40 L73 41 L75 57 L68 58 Z"/>
                    <path fill={color('glutes')} d="M40 76 L60 76 L60 92 L51 95 L50 84 L49 95 L40 92 Z"/>
                    <path fill={color('hamstrings')} d="M40 96 L49 98 L48 122 L41 122 Z M51 98 L60 96 L59 122 L52 122 Z"/>
                    <path fill={color('calves')} d="M41 126 L48 126 L47 148 L42 148 Z M52 126 L59 126 L58 148 L53 148 Z"/>
                </g>
            </g>
            {/* Labels bound inside the same translation as their figure so the
                front/back pairing cannot detach on any engine. */}
            <g fill="var(--ink2)" textAnchor="middle" fontSize="10">
                <g transform="translate(0 0)"><text x="50" y="178">קדמי</text></g>
                <g transform="translate(120 0)"><text x="50" y="178">אחורי</text></g>
            </g>
        </svg>
    </section>;
}
