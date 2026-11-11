import React,{useEffect,useState} from 'react';
import {pushStatus,enablePush,disablePush,testPush,syncPush} from './pushClient';
export function PushControls(){
 const [state,setState]=useState(pushStatus),[busy,setBusy]=useState(false),[error,setError]=useState('');
 useEffect(()=>{const update=()=>setState(pushStatus());window.addEventListener('swoleup-push-status',update);return()=>window.removeEventListener('swoleup-push-status',update)},[]);
 const run=async(fn:()=>Promise<any>)=>{setBusy(true);setError('');try{await fn();setState(pushStatus())}catch(e){setError((e as Error).message==='network'?'לא הצלחנו להגיע לשירות. בדוק את החיבור ונסה שוב.':(e as Error).message==='limit'?'אפשר לשלוח בדיקה אחת בדקה. נסה שוב מאוחר יותר.':/[א-ת]/.test((e as Error).message)?(e as Error).message:'לא הצלחנו להשלים את הפעולה. בדוק את החיבור ונסה שוב.')}finally{setBusy(false)}};
 return <div className="reminder-pending">
 <strong>{state.enabled?'הרשאת Push הופעלה במכשיר הזה':state.configured?'התראות גם מחוץ לאפליקציה':'התראות Push עדיין לא פעילות'}</strong>
 {state.configured?<>
 <p>ב-iPhone יש לפתוח ממסך הבית ולאשר התראות. שעות האימון נשמרות לפי אזור הזמן של המכשיר. אפשר לכבות כאן בכל רגע.</p>
 <p>אימון שהושלם או אימון פעיל משתיקים את תזכורת האימון. סיום מנוחה יכול לשלוח התראה כשעוברים לאפליקציה אחרת. לשינוי או לביטול נדרש סנכרון עם חיבור לאינטרנט. מצב מיקוד, נעילת מסך או חיבור חלש עלולים לעכב התראות. זה לא שעון מעורר מדויק.</p>
 <p>רק רישום ההתראות, השעות, אזור הזמן ומצב האימון נשלחים לשירות ב-Cloudflare. פרופיל, מפתח AI ושיחות לא נשלחים אליו. רישום שלא סונכרן 30 יום מפסיק לקבל תזכורות; אימון פעיל משתיק עד 6 שעות.</p>
 <div className="push-actions">{state.enabled?<><button className="reminder-action" disabled={busy} onClick={()=>run(enablePush)}>חדש רישום במכשיר</button><button className="reminder-action" disabled={busy} onClick={()=>run(testPush)}>שלח התראת בדיקה</button><button className="reminder-action" disabled={busy} onClick={()=>run(()=>syncPush())}>סנכרן עכשיו</button><button className="reminder-action" disabled={busy} onClick={()=>run(disablePush)}>כבה התראות</button></>:<button className="reminder-action" disabled={busy} onClick={()=>run(enablePush)}>הפעל התראות במכשיר הזה</button>}</div>
 </>:<p>תזכורות כשהאפליקציה סגורה, וגם התראה לסט הבא באפליקציה אחרת, דורשות שירות שליחה והפעלה נפרדת. שמירת שעה כאן אינה מפעילה התראה.</p>}
 {state.message&&<p role="status">{state.message}</p>}{error&&<p role="alert">{error}</p>}{busy&&<p role="status">מעדכן…</p>}
 </div>;
}
