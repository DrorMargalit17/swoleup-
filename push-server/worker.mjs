import { DurableObject } from 'cloudflare:workers';
import handler,{PushSchedule as ScheduleCore} from './core.mjs';
export class PushSchedule extends DurableObject {
 constructor(ctx,env){super(ctx,env);this.schedule=new ScheduleCore(ctx,env);}
 fetch(request){return this.schedule.fetch(request);}
 alarm(){return this.schedule.alarm();}
}
export default handler;
