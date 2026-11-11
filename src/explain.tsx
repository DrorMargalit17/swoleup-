// Shared exercise explanation, two sections everywhere it appears (workout
// help, day detail, library): how to perform it + how it should feel.
import React from 'react';
import { Exercise, feelOf, videoUrl } from './data';
import { Icon } from './ui';
import { ExerciseMuscleMap } from './ExerciseMuscleMap';

export function ExerciseExplain({ ex }: { ex: Exercise }) {
    const feel = feelOf(ex);
    return <>
        <ExerciseMuscleMap muscle={ex.muscle} />
        <section className="mb-4">
            <h4 className="flex items-center gap-2 text-[14px] font-extrabold text-ink mb-2.5">
                <span className="w-6 h-6 rounded-lg bg-acc/15 text-acc grid place-items-center"><Icon name="dumbbell" size={14} /></span>
                איך מבצעים
            </h4>
            <ul className="flex flex-col gap-2">
                {ex.cues.map((c, i) => (
                    <li key={i} className="flex gap-2.5 text-[14px] text-ink/90 leading-relaxed">
                        <span className="w-5 h-5 rounded-full bg-card2 border border-hairline text-acc text-[11px] font-bold grid place-items-center shrink-0 mt-0.5">{i + 1}</span>
                        {c}
                    </li>
                ))}
            </ul>
        </section>
        {feel && (
            <section className="mb-4">
                <h4 className="flex items-center gap-2 text-[14px] font-extrabold text-ink mb-2.5">
                    <span className="w-6 h-6 rounded-lg bg-acc/15 text-acc grid place-items-center"><Icon name="heart" size={13} /></span>
                    איך זה אמור להרגיש
                </h4>
                <div className="bg-acc/10 border border-acc/20 rounded-xl p-3.5">
                    <p className="text-[13.5px] text-ink leading-relaxed">{feel}</p>
                </div>
            </section>
        )}
        <a className="flex items-center justify-center gap-2 w-full min-h-[46px] rounded-full bg-card2 border border-hairline text-ink text-[14.5px] font-bold" href={videoUrl(ex)} target="_blank" rel="noopener noreferrer">
            <Icon name="play" size={16} className="text-acc" /> סרטון הדגמה ב-YouTube
        </a>
    </>;
}
