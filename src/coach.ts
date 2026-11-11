// AI coach: direct browser calls to the user's own LLM key.
import { apiCspSince, recordApi } from './apiDiagnostics';
import { Profile, Plan, WorkoutLog, WeightEntry, GOAL_LABEL, calorieTarget, waterTargetMl, proteinTarget } from './data';

export interface CoachMsg { role: 'user' | 'coach'; text: string; ts: number }
export interface CoachSettings { provider: 'gemini' | 'openai'; apiKey: string; model: string }

// Current default: Gemini 3.8 Flash (GA since 2026-09-02, free on the free tier).
// https://aistudio.google.com/docs/pricing / https://aistudio.google.com/docs/deprecations
export const GEMINI_MODEL = 'gemini-3.8-flash';
export const DEFAULT_SETTINGS: CoachSettings = { provider: 'gemini', apiKey: '', model: GEMINI_MODEL };

// Degrade gracefully when a project rejects a model (not enabled for it, model
// gone, or that model's free quota exhausted - limits are per model): try the
// chosen/default model, then the previous GA Flash, then the legacy preview.
export const GEMINI_FALLBACKS = ['gemini-3.8-flash', 'gemini-3.6-flash', 'gemini-3-flash-preview'];

// Stored legacy defaults (gemini-2.*, the old 3-flash-preview default) upgrade
// at call time; a deliberate custom model choice is respected.
export function geminiModelOf(s: CoachSettings): string {
    if (!s.model || s.model.startsWith('gemini-2.') || s.model === 'gemini-3-flash-preview') return GEMINI_MODEL;
    return s.model;
}

export interface GeminiResponse { candidates?: { content?: { parts?: { text?: string }[] } }[] }

// Bounded retries for transient provider failures. Never retry bad credentials.
const TRANSIENT_STATUSES = new Set([408,429,500,502,503,504]);
export async function geminiGenerate(settings: CoachSettings, body: unknown, onStatus?: (message:string)=>void, fastChat=false): Promise<GeminiResponse> {
    const models=[...new Set([geminiModelOf(settings), ...GEMINI_FALLBACKS])];
    let lastStatus=503, attempt=0;
    for(let i=0;i<models.length;i++) {
        const model=models[i];
        const attempts=i===0?2:1;
        for(let n=0;n<attempts;n++) {
            attempt++;
            let res:Response;
            const payload=fastChat ? {...(body as object), generationConfig:{...((body as any).generationConfig||{}),maxOutputTokens:(body as any).generationConfig?.maxOutputTokens||4096,thinkingConfig:{thinkingLevel:model==='gemini-3.6-flash'||model==='gemini-3-flash-preview'?'MINIMAL':'LOW'}}} : body;
            const raw=JSON.stringify(payload);
            const details={model:GEMINI_FALLBACKS.includes(model)?model:'custom-model',phase:'headers',bytes:new TextEncoder().encode(raw).length};
            const started=Date.now();recordApi('request',attempt,started,undefined,details);
            const controller=new AbortController();let timer:ReturnType<typeof setTimeout>;
            const deadline=new Promise<never>((_,reject)=>{timer=setTimeout(()=>{controller.abort();reject(new DOMException('Deadline','TimeoutError'));},fastChat?15000:45000)});
            try {
                res=await Promise.race([fetch(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`, {
                    method:'POST', headers:{'Content-Type':'application/json','x-goog-api-key':settings.apiKey}, body:raw, signal:controller.signal,
                }),deadline]);
                recordApi('headers',attempt,started,res.status,details);
            } catch(e) {
                // CSP delivery may follow fetch rejection by one event-loop turn.
                await new Promise(r=>setTimeout(r,0));
                const reason=apiCspSince(started)?'csp':e instanceof DOMException && (e.name==='TimeoutError'||e.name==='AbortError')?'timeout':!navigator.onLine?'offline':'network';
                clearTimeout(timer!);recordApi(reason,attempt,started,undefined,details);
                if(reason==='timeout'&&fastChat){lastStatus=0;onStatus?.('המודל מתעכב, מנסה מודל חלופי…');break;}
                throw new Error(reason==='csp'?'הדפדפן חסם את החיבור לגוגל בגלל מדיניות האתר. קוד בדיקה: csp.':reason==='timeout'?'גוגל לא ענתה בזמן. נסה שוב בעוד רגע. קוד בדיקה: timeout.':reason==='offline'?'המכשיר מדווח שאין חיבור לאינטרנט. קוד בדיקה: offline.':'החיבור לגוגל נכשל לפני שהתקבלה תשובה. זה יכול להיות חיבור, סינון או תקלה אצל הספק. קוד בדיקה: network.');
            }
            if(res.ok){
                onStatus?.('');
                try{const result=await Promise.race([res.json(),deadline]);clearTimeout(timer!);recordApi('success',attempt,started,res.status,{...details,phase:'body'});return result;}
                catch(e){clearTimeout(timer!);const reason=controller.signal.aborted?'timeout':'response';recordApi(reason,attempt,started,res.status,{...details,phase:'body'});if(reason==='timeout'&&fastChat){lastStatus=0;onStatus?.('המודל מתעכב, מנסה מודל חלופי…');break;}throw new Error(reason==='timeout'?'גוגל לא ענתה בזמן. קוד בדיקה: timeout.':'התקבלה תשובה שלא ניתן לקרוא מגוגל. קוד בדיקה: response.');}
            }
            clearTimeout(timer!);lastStatus=res.status;recordApi('status',attempt,started,res.status,details);
            if(res.status===400||res.status===401||res.status===403) throw new Error('גוגל דחתה את הבקשה. בדוק את המפתח, הרשאות ה-API והמודל בהגדרות.');
            if(res.status===404) break; // Only the missing model justifies immediate fallback.
            if(!TRANSIENT_STATUSES.has(res.status))throw new Error('לא התקבלה תשובה מגוגל. נסה שוב בעוד רגע.');
            const hasNext=n+1<attempts||i+1<models.length;
            if(!hasNext)break;
            const header=res.headers.get('Retry-After');
            const seconds=header ? Number(header) : NaN;
            const retryAfter=header ? (Number.isFinite(seconds)?seconds*1000:Date.parse(header)-Date.now()) : 0;
            if(retryAfter>30000)throw new Error(res.status===429?'הגעת כרגע למגבלת הבקשות של גוגל. נסה שוב מאוחר יותר; אין צורך להחליף מפתח.':'השרתים של גוגל עמוסים. נסה שוב בעוד רגע.');
            onStatus?.(res.status===429?'גוגל מגבילה כרגע את קצב הבקשות, מנסה שוב…':'השרתים של גוגל עמוסים, מנסה שוב…');
            await new Promise(r=>setTimeout(r,Math.max(retryAfter||0,Math.min(4000,1000*2**(attempt-1)))+Math.floor(Math.random()*250)));
        }
    }
    throw new Error(lastStatus===0?'כל המודלים התעכבו מעבר לזמן ההמתנה. נסה שוב מאוחר יותר. קוד בדיקה: timeout.':lastStatus===429?'הגעת כרגע למגבלת הבקשות של גוגל. נסה שוב מאוחר יותר; אין צורך להחליף מפתח.':lastStatus===404?'המודל לא זמין כרגע. בדוק את בחירת המודל בהגדרות.':'השרתים של גוגל עמוסים כרגע. נסה שוב בעוד רגע; זו לא בהכרח בעיה במפתח.');
}

function systemPrompt(profile: Profile, plan: Plan | null, logs: WorkoutLog[], weights: WeightEntry[]): string {
    const last = logs.slice(0, 5).map((l) => {
        const moves = l.exercises.map((e) => {
            const best = e.sets.filter((s) => s.done).map((s) => `${s.kg}kg x${s.reps}`).join(', ');
            return `${e.he}: ${best}`;
        }).join(' | ');
        const extra = [l.rating !== undefined ? `דירוג ${l.rating}/10` : '', l.feedback ? `המשוב שלו: ${l.feedback}` : ''].filter(Boolean).join('. ');
        return `${l.date} (${l.focus}): ${moves}${extra ? ' — ' + extra : ''}`;
    }).join('\n');
    const wTrend = weights.length >= 2
        ? `משקל אחרון ${weights[weights.length - 1].kg} ק"ג, קודם ${weights[weights.length - 2].kg} ק"ג`
        : weights.length === 1 ? `משקל אחרון ${weights[0].kg} ק"ג` : 'אין עדיין מדידות משקל';
    return [
        'אתה מאמן כושר אישי ישראלי בשם דרור-פיט. אתה מדבר עברית טבעית, ישירה ומעודדת, בגובה העיניים, עם מונחים מקצועיים באנגלית כשזה מקובל (squat, sets, reps).',
        'אתה מכיר את המתאמן אישית ומתייחס לנתונים שלו בתשובות. תשובות קצרות וקולעות, עד 120 מילים, בלי רשימות ארוכות אלא אם התבקש תוכנית.',
        'אתה נותן עצות כושר ותזונה כלליות בלבד. בבעיה רפואית הפנה לאיש מקצוע.',
        '',
        `פרופיל: ${profile.name}, בן ${profile.age}, ${profile.heightCm} ס"מ, ${profile.weightKg} ק"ג. מטרה: ${GOAL_LABEL[profile.goal]}. רמה: ${profile.level === 'beginner' ? 'מתחיל' : profile.level === 'some' ? 'קצת ניסיון' : 'מתאמן קבוע'}. מקום: ${profile.place === 'gym' ? 'חדר כושר' : profile.place === 'home' ? 'בית' : 'גם וגם'}. ${profile.daysPerWeek} אימונים בשבוע, כ-${profile.sessionMin} דקות. ${profile.limitations ? 'מגבלות: ' + profile.limitations : ''}`,
        `יעדים יומיים: ${calorieTarget(profile)} קק"ל, ${proteinTarget(profile)} גרם חלבון, ${waterTargetMl(profile)} מ"ל מים.`,
        `ציוד זמין: ${profile.equipment && profile.equipment.length ? profile.equipment.join(', ') : 'לא צוין'}.`,
        profile.limitations ? [
            `מגבלות רפואיות: ${profile.limitations}.`,
            'חשוב: תוכנית האימון הבסיסית לא שונתה לפי המגבלות האלה. כשהן רלוונטיות לשיחה (תרגיל שעלול להחמיר, כאב שדווח, בקשת התאמה) - התאם את ההמלצות אליהן באופן שמרני, הסבר למה, והצע חלופות בטוחות.',
            'בנושאים רפואיים הסתמך רק על הנחיות מקובלות ומקורות מהימנים (ACSM, Mayo Clinic, משרד הבריאות) וציין את המקור. לעולם אל תאבחן; בכל ספק הפנה לאיש מקצוע.',
        ].join('\n') : 'מגבלות רפואיות: לא צוין.',
        plan ? `תוכנית: ${plan.splitName}. ימים: ${plan.days.map((d) => d.label + ' (' + d.focus + ')').join(', ')}.` : 'אין עדיין תוכנית.',
        last ? `אימונים אחרונים:\n${last}` : 'עוד לא תועדו אימונים.',
        wTrend,
    ].join('\n');
}

export async function askCoach(
    settings: CoachSettings,
    profile: Profile,
    plan: Plan | null,
    logs: WorkoutLog[],
    weights: WeightEntry[],
    history: CoachMsg[],
    question: string,
    onStatus?: (message:string)=>void,
): Promise<string> {
    const sys = systemPrompt(profile, plan, logs, weights);
    if (settings.provider === 'openai') {
        const res = await fetch('https://api.openai.com/v1/chat/completions', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${settings.apiKey}` },
            body: JSON.stringify({
                model: settings.model || 'gpt-4o-mini',
                messages: [
                    { role: 'system', content: sys },
                    ...history.slice(-10).map((m) => ({ role: m.role === 'user' ? 'user' : 'assistant', content: m.text })),
                    { role: 'user', content: question },
                ],
            }),
        });
        if (!res.ok) throw new Error(`OpenAI ${res.status}: בדוק את המפתח, הרשאות הספק והמכסה.`);
        const j = await res.json();
        return j.choices?.[0]?.message?.content?.trim() || 'לא קיבלתי תשובה, נסה שוב.';
    }
    const j = await geminiGenerate(settings, {
        systemInstruction: { parts: [{ text: sys }] },
        contents: [
            ...history.slice(-10).map((m) => ({ role: m.role === 'user' ? 'user' : 'model', parts: [{ text: m.text }] })),
            { role: 'user', parts: [{ text: question }] },
        ],
    }, onStatus, true);
    const text = j.candidates?.[0]?.content?.parts?.map((p: { text?: string }) => p.text || '').join('').trim();
    return text || 'לא קיבלתי תשובה, נסה שוב.';
}
