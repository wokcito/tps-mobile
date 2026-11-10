import { position, type Orbit, type Observer } from './orbital';
export type Pass={aos:number;tca:number;los:number;maxElevation:number};
export function predictPasses(orbit:Orbit,observer:Observer,start:number,days=2,minElevation=10,stepSeconds=60):Pass[]{
 if(days<0 || days>10 || minElevation<0 || minElevation>=90 || stepSeconds<1 || stepSeconds>60)throw Error('Predicción fuera de rango');
 const end=start+days*86400000,step=stepSeconds*1000,passes:Pass[]=[];
 const elevation=(t:number)=>position(orbit,t,observer).elevation;
 const crossing=(a:number,b:number,rising:boolean)=>{while(b-a>250){const mid=(a+b)/2;if((elevation(mid)>=minElevation)===rising)b=mid;else a=mid;}return (a+b)/2;};
 let previous=elevation(start),aos:number|undefined; // Omit already ongoing/incomplete windows.
 for(let t=start+step;t<=end;t+=step){
  const current=elevation(t);
  if(previous<minElevation && current>=minElevation)aos=crossing(t-step,t,true);
  if(previous>=minElevation && current<minElevation && aos!==undefined){
   const los=crossing(t-step,t,false);let a=aos,b=los;
   // Unimodal elevation within a pass; ternary maximum search to <0.25 s.
   while(b-a>250){const m1=a+(b-a)/3,m2=b-(b-a)/3;if(elevation(m1)<elevation(m2))a=m1;else b=m2;}
   const tca=(a+b)/2;passes.push({aos,tca,los,maxElevation:elevation(tca)});aos=undefined;
  }
  previous=current;
 }
 return passes;
}
// Cooperative day-sized chunks yield to JS between work units; UI uses 6-hour chunks.
export async function predictPassesAsync(orbit:Orbit,observer:Observer,start:number,days:number,minElevation:number):Promise<Pass[]>{
 const result:Pass[]=[];const seen=new Set<number>();
 for(let offset=0;offset<days;offset+=0.25){
  const segmentStart=start+offset*86400000;
  // Overlap by one orbital period to keep complete windows at chunk boundaries.
  const span=Math.min(0.25+orbit.periodMinutes/1440,days-offset);
  for(const p of predictPasses(orbit,observer,segmentStart,span,minElevation))if(p.aos<segmentStart+0.25*86400000 && !seen.has(Math.round(p.aos/1000))){result.push(p);seen.add(Math.round(p.aos/1000));}
  await new Promise<void>(resolve=>setTimeout(resolve,0));
 }
 return result.sort((a,b)=>a.aos-b.aos);
}
export function planReminders(norad:number,passes:Pass[],minutes:number,now:number){
 const unique=new Map<string,{key:string;at:number;aos:number;norad:number}>();
 for(const p of passes){const at=p.aos-minutes*60000,key=`${norad}:${p.aos}`;if(minutes>=0 && at>now)unique.set(key,{key,at,aos:p.aos,norad});}
 return [...unique.values()].sort((a,b)=>a.at-b.at);
}
