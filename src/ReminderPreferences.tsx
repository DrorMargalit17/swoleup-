import React,{useState} from 'react';
import {useStore} from './store';
import {unlockRestAudio,playRestChime} from './restSound';
export type ReminderPreferencesValue={sound:boolean;times:string[]};
export const DEFAULT_REMINDERS:ReminderPreferencesValue={sound:true,times:[]};
export function ReminderPreferences(){
 const [settings,setSettings]=useStore<ReminderPreferencesValue>('reminders.v1',DEFAULT_REMINDERS);
 const [time,setTime]=useState('18:00');const [status,setStatus]=useState('');
 return <section className="reminder-preferences">
  <h2>זמן לזוז</h2><p>צליל לסט הבא ושעות שנוח לך להתאמן.</p>
  <label className="reminder-switch"><span>צליל בסיום המנוחה</span><input type="checkbox" checked={settings.sound} onChange={e=>{setSettings({...settings,sound:e.target.checked});if(e.target.checked)void unlockRestAudio()}} /></label>
  <button className="reminder-action" onClick={async()=>{const ok=await unlockRestAudio();setStatus(ok&&playRestChime()?'צליל הבדיקה הופעל. ודא שעוצמת השמע מתאימה.':'לא הצלחנו להפעיל שמע. נסה שוב ובדוק את הרשאות השמע.')}}>בדיקת צליל</button>
  <p className="reminder-note">הצליל פועל כשהאימון פתוח על המסך. כשהאפליקציה ברקע או כשהמסך נעול, iPhone עשוי להשהות את הטיימר והשמע. בדוק גם עוצמת שמע ומצב שקט.</p>
  <h3>השעות שלך לאימון</h3><p>אפשר לשמור עד 3 שעות מועדפות. אלה הגדרות הכנה בלבד, לא תזכורות פעילות.</p>
  <div className="reminder-time-row"><input aria-label="שעה מועדפת לאימון" dir="ltr" type="time" value={time} onChange={e=>setTime(e.target.value)} /><button className="reminder-action" disabled={!time||settings.times.includes(time)||settings.times.length>=3} onClick={()=>setSettings({...settings,times:[...settings.times,time].sort()})}>הוסף שעה</button></div>
  <div className="reminder-times">{settings.times.map(t=><div key={t}><span dir="ltr">{t}</span><button aria-label={'הסר שעה '+t} onClick={()=>setSettings({...settings,times:settings.times.filter(x=>x!==t)})}>הסר</button></div>)}</div>
  <div className="reminder-pending"><strong>התראות Push עדיין לא פעילות</strong><p>תזכורות כשהאפליקציה סגורה, וגם התראה לסט הבא באפליקציה אחרת, דורשות שירות שליחה והפעלה נפרדת. שמירת שעה כאן אינה מפעילה התראה.</p></div>
  {status&&<p role="status">{status}</p>}
 </section>;
}
