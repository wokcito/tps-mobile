export type Reading = { moisture_pct: number; measured_at: string };
export type Polygon = { type: 'Polygon'; coordinates: number[][][] };
export type ManualReading = Reading & {client_request_id:string; station_id:string; note:string; lat:number|null; lng:number|null};
export const stateLabels = {stale:'◷ Sin datos confiables',dry:'⚠ Seco',optimal:'✓ Óptimo',wet:'≈ Húmedo'};
export const stateColors = {stale:'#64748b',dry:'#b91c1c',optimal:'#15803d',wet:'#1d4ed8'};
export function status(r:Reading|null,min:number|null=25,max:number|null=45,now=Date.now()): keyof typeof stateLabels {
 if(!r || !Number.isFinite(Date.parse(r.measured_at)) || now-Date.parse(r.measured_at)>900000) return 'stale';
 return r.moisture_pct<(min??25)?'dry':r.moisture_pct>(max??45)?'wet':'optimal';
}
export function ageLabel(date:string,now=Date.now()){const seconds=Math.max(0,Math.floor((now-Date.parse(date))/1000));if(!Number.isFinite(seconds))return 'sin datos';return seconds<60?`hace ${seconds} s`:seconds<3600?`hace ${Math.floor(seconds/60)} min`:`hace ${Math.floor(seconds/3600)} h`;}
export function validateDuration(n:number){if(!Number.isInteger(n)||n<1||n>120)throw new Error('La duración debe ser un entero entre 1 y 120 minutos');return n;}
export function canRequest(commands:{valve_id:string;status:string}[],valveId:string){return !commands.some(c=>c.valve_id===valveId&&c.status==='pending');}
export function parsePolygon(text:string):Polygon {
 const parsed=JSON.parse(text);const p=parsed.type==='Feature'?parsed.geometry:parsed;
 if(p?.type!=='Polygon'||!Array.isArray(p.coordinates)||p.coordinates.length!==1)throw new Error('Usá un Polygon GeoJSON sin huecos');
 const ring=p.coordinates[0];if(!Array.isArray(ring)||ring.length<4||ring.length>101||ring.some((v:unknown)=>!Array.isArray(v)||v.length!==2||!v.every(Number.isFinite)||Math.abs(v[0])>180||Math.abs(v[1])>90))throw new Error('Vértices inválidos: [longitud, latitud]');
 if(ring[0][0]!==ring.at(-1)[0]||ring[0][1]!==ring.at(-1)[1])ring.push([...ring[0]]);
 if(new Set(ring.slice(0,-1).map((v:number[])=>v.join(','))).size<3)throw new Error('Se requieren tres vértices distintos');
 const area=ring.slice(0,-1).reduce((sum:number,v:number[],i:number)=>sum+v[0]*ring[i+1][1]-ring[i+1][0]*v[1],0);if(Math.abs(area)<1e-12)throw new Error('El polígono no tiene área');
 return p;
}
export function contains(p:Polygon,[x,y]:number[]){let inside=false;const ring=p.coordinates[0];for(let i=0,j=ring.length-1;i<ring.length;j=i++){const [xi,yi]=ring[i],[xj,yj]=ring[j];const cross=(x-xi)*(yj-yi)-(y-yi)*(xj-xi);if(Math.abs(cross)<1e-10&&x>=Math.min(xi,xj)&&x<=Math.max(xi,xj)&&y>=Math.min(yi,yj)&&y<=Math.max(yi,yj))return true;if((yi>y)!==(yj>y)&&x<(xj-xi)*(y-yi)/(yj-yi)+xi)inside=!inside;}return inside;}
export function enqueue(q:ManualReading[],item:ManualReading){return q.some(r=>r.client_request_id===item.client_request_id)?q:[...q,item];}
export async function flushQueue(q:ManualReading[],send:(r:ManualReading)=>Promise<void>){for(let i=0;i<q.length;i++){try{await send(q[i]);}catch{return q.slice(i);}}return [] as ManualReading[];}
