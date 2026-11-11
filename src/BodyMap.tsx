import React from 'react';

// Stylized front-body silhouette with muscle zones that light up by workout focus.
const ZONES: Record<string, [number, number, number, number][]> = {
    'חזה': [[50, 33, 8, 5]],
    'כתפיים': [[34, 22, 5.5, 4.5], [66, 22, 5.5, 4.5]],
    'ידיים': [[28, 38, 4, 11], [72, 38, 4, 11]],
    'בטן': [[50, 51, 6, 8]],
    'רגליים': [[44, 80, 5, 15], [56, 80, 5, 15]],
    'גב': [[50, 34, 7, 7]],
    'ישבן': [[50, 63, 7, 5]],
};

export function litZones(focus: string): string[] {
    const out: string[] = [];
    for (const z of Object.keys(ZONES)) if (focus.includes(z)) out.push(z);
    if (focus.includes('כל הגוף') || focus.includes('פלג גוף עליון') || focus.includes('פלג גוף תחתון')) {
        if (focus.includes('עליון')) out.push('חזה', 'גב', 'כתפיים', 'ידיים');
        else if (focus.includes('תחתון')) out.push('רגליים', 'ישבן', 'בטן');
        else out.push(...Object.keys(ZONES));
    }
    return Array.from(new Set(out));
}

export function BodyMap({ focus, size = 54 }: { focus: string; size?: number }) {
    const lit = new Set(litZones(focus));
    return <svg className="bodymap" width={size} height={size * 1.9} viewBox="0 0 100 190" aria-hidden="true">
        {/* silhouette */}
        <g fill="var(--bm-body)">
            <circle cx="50" cy="11" r="8" />
            <path d="M38 22 Q50 18 62 22 L66 24 Q72 27 72 36 L73 52 Q73 56 70 56 L68 56 L66 44 L64 58 Q63 66 62 70 L61 96 Q60 100 58 100 L57 120 L58 150 Q58 158 55 158 Q52 158 52 150 L51 122 L49 122 L48 150 Q48 158 45 158 Q42 158 42 150 L43 120 L42 100 Q40 100 39 96 L38 70 Q37 66 36 58 L34 44 L32 56 L30 56 Q27 56 27 52 L28 36 Q28 27 34 24 Z" />
        </g>
        {/* lit muscle zones */}
        {Array.from(lit).map((z) => ZONES[z].map(([cx, cy, rx, ry], i) => (
            <ellipse key={`${z}${i}`} cx={cx} cy={cy} rx={rx} ry={ry} className="bm-lit" />
        )))}
    </svg>;
}
