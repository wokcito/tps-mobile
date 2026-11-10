import {Thresholds} from '../types';
const clamp=(v:number)=>Math.max(0,Math.min(1,v));
/** Weighted mean of available dimensions: RSSI 30%, RTT 40%, download 30%.
 * RSSI [-120,-50] dBm; RTT [300,0] ms; throughput [0,50] Mbps.
 * Missing dimensions are excluded, never interpreted as good or bad. */
export function qualityScore(signal:number|null,rtt:number|null,download:number|null):number|null {
 const parts:[number|null,number][]=[[signal===null?null:clamp((signal+120)/70),0.3],[rtt===null?null:clamp(1-rtt/300),0.4],[download===null?null:clamp(download/50),0.3]];
 const available=parts.filter((p):p is [number,number]=>p[0]!==null&&Number.isFinite(p[0]));
 return available.length?available.reduce((s,[v,w])=>s+v*w,0)/available.reduce((s,[,w])=>s+w,0):null;
}
export function detectDegradation(prev:boolean,current:number|null,thresholds:Thresholds):{degraded:boolean;notify:boolean} {
 if(!(thresholds.low>=0&&thresholds.low<thresholds.recovery&&thresholds.recovery<=1))throw Error('Umbrales inválidos');
 const degraded=current===null?prev:prev?current<thresholds.recovery:current<=thresholds.low;
 return {degraded,notify:degraded&&!prev};
}
