/** @param {unknown} x */
const uuid = x => typeof x==='string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(x);
/** @param {unknown} x */
const utc = x => typeof x==='string' && /^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d(?:\.\d+)?Z$/.test(x) && Number.isFinite(Date.parse(x));
/** @param {string} topic @param {any} p */
function validate(topic,p){
 if(!p||typeof p!=='object')return false;
 switch(topic){
 case 'soil.moisture':return uuid(p.station_id)&&utc(p.ts)&&Number.isFinite(p.moisture_pct)&&p.moisture_pct>=0&&p.moisture_pct<=100&&Number.isFinite(p.temp_c);
 case 'weather.tick':return uuid(p.station_id)&&utc(p.ts)&&Number.isFinite(p.rain_mm)&&p.rain_mm>=0;
 case 'irrigation.commands':return uuid(p.command_id)&&uuid(p.valve_id)&&['open','close'].includes(p.action)&&(p.duration_min==null||(p.action==='open'&&Number.isInteger(p.duration_min)&&p.duration_min>=1&&p.duration_min<=120));
 case 'valve.status':return uuid(p.valve_id)&&uuid(p.command_id)&&utc(p.ts)&&['open','closed'].includes(p.status);
 default:return false;
 }
}
/** @param {{station_id:string,moisture_pct:number,temp_c:number,ts:string}} p */
function toReading(p){return {station_id:p.station_id,moisture_pct:p.moisture_pct,temp_c:p.temp_c,measured_at:p.ts,source:'sensor'};}
/** @param {string} status @param {number} random */
function commandOutcome(status,random){return status!=='pending'?null:random<0.1?{status:'failed',failure_reason:'valve_timeout'}:{status:'applied',failure_reason:null};}
module.exports={validate,toReading,commandOutcome};
