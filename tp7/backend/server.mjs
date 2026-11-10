import http from 'node:http';
import { pathToFileURL } from 'node:url';
const clockDefault={now:Date.now,sleep:ms=>new Promise(r=>setTimeout(r,ms))};
export class WindowLimiter {
 constructor(rules,clock=clockDefault){this.rules=rules;this.clock=clock;this.hits=[];this.queue=Promise.resolve();}
 acquire(){const work=this.queue.then(async()=>{for(;;){const now=this.clock.now();this.hits=this.hits.filter(t=>now-t<Math.max(...this.rules.map(r=>r.ms)));let delay=0;for(const r of this.rules){const recent=this.hits.filter(t=>now-t<r.ms);if(recent.length>=r.limit)delay=Math.max(delay,recent[recent.length-r.limit]+r.ms-now);}if(delay<=0){this.hits.push(now);return;}await this.clock.sleep(delay);}});this.queue=work.catch(()=>{});return work;}
}
export async function retry(fn,clock=clockDefault){for(let i=0;;i++){try{return await fn();}catch(e){if(i>=2)throw e;await clock.sleep(500*2**i);}}}
const validNorad=n=>{if(!Number.isSafeInteger(n)||n<1)throw Error('NORAD inválido');return n;};
const groups={stations:'stations',starlink:'starlink',gps:'gps-ops',weather:'weather',active:'active',geo:'geo'};
const ommRecord=(omm,group='active')=>({norad:validNorad(Number(omm.NORAD_CAT_ID)),name:String(omm.OBJECT_NAME),group,epoch:Date.parse(omm.EPOCH.endsWith('Z')?omm.EPOCH:omm.EPOCH+'Z'),omm});
class HttpProvider {
 constructor(fetcher=fetch,rules=[{limit:1,ms:1000}]){this.fetcher=fetcher;this.limiter=new WindowLimiter(rules);}
 async json(url,init={},extraLimiter){return retry(async()=>{if(extraLimiter)await extraLimiter.acquire();await this.limiter.acquire();const response=await this.fetcher(url,{...init,signal:AbortSignal.timeout(15000)});if(!response.ok)throw Error('Error de proveedor');return response.json();});}
 async getCatalog(){throw Error('Catálogo no soportado');}
 async getOrbitalData(){throw Error('Órbita no soportada');}
 async getValidationPosition(){throw Error('Validación no soportada');}
}
export class CelesTrakProvider extends HttpProvider {
 name='CelesTrak';
 async getCatalog(group='stations'){if(!(group in groups))throw Error('Grupo inválido');const query=group==='starlink'?'sup-gp.php?FILE=starlink&FORMAT=json':`gp.php?GROUP=${groups[group]}&FORMAT=json`;return (await this.json(`https://celestrak.org/NORAD/elements/${query}`)).map(r=>ommRecord(r,group));}
 async getOrbitalData(n){const rows=await this.json(`https://celestrak.org/NORAD/elements/gp.php?CATNR=${validNorad(n)}&FORMAT=json`);if(!rows.length)throw Error('Sin órbita');return ommRecord(rows[0]);}
}
export class SpaceTrackProvider extends HttpProvider {
 name='spacetrack';cookie='';sessionUntil=0;loginFlight=null;
 constructor(credentials,fetcher=fetch){super(fetcher,[{limit:29,ms:60000},{limit:299,ms:3600000}]);this.credentials=credentials;}
 async login(){
  if(this.cookie&&Date.now()<this.sessionUntil)return;
  if(this.loginFlight)return this.loginFlight;
  this.loginFlight=(async()=>{await this.limiter.acquire();const r=await this.fetcher('https://www.space-track.org/ajaxauth/login',{method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded'},body:new URLSearchParams(this.credentials).toString(),signal:AbortSignal.timeout(15000)});if(!r.ok)throw Error('Login no disponible');this.cookie=r.headers.get('set-cookie')?.split(';')[0]??'';if(!this.cookie)throw Error('Sesión no disponible');this.sessionUntil=Date.now()+1800000;})();
  try{await this.loginFlight;}finally{this.loginFlight=null;}
 }
 async gp(query,group='active'){await this.login();try{return (await this.json(`https://www.space-track.org/basicspacedata/query/class/gp/${query}/format/json`,{headers:{Cookie:this.cookie}})).map(r=>ommRecord(r,group));}catch(e){this.cookie='';throw e;}}
 async getCatalog(group='stations'){
  const filters={stations:'NORAD_CAT_ID/25544',starlink:'OBJECT_NAME/STARLINK~~',gps:'OBJECT_NAME/NAVSTAR~~',weather:'OBJECT_NAME/NOAA~~',geo:'MEAN_MOTION/0.9--1.1',active:'DECAY_DATE/null-val'};
  if(!(group in filters))throw Error('Grupo inválido');return this.gp(filters[group],group);
 }
 async getOrbitalData(n){const rows=await this.gp(`NORAD_CAT_ID/${validNorad(n)}`);if(!rows.length)throw Error('Sin órbita');return rows[0];}
}
export class N2yoProvider extends HttpProvider {
 name='n2yo';
 constructor(key,fetcher=fetch){super(fetcher,[{limit:999,ms:3600000}]);this.key=key;this.passLimiter=new WindowLimiter([{limit:99,ms:3600000}]);}
 url(path){return `https://api.n2yo.com/rest/v1/satellite/${path}${path.includes('?')?'&':'?'}apiKey=${encodeURIComponent(this.key)}`;}
 async getOrbitalData(n){const r=await this.json(this.url(`tle/${validNorad(n)}`));if(!r.tle)throw Error('Sin TLE');const tle=r.tle.trim().split(/\r?\n/);const yy=Number(tle[0].slice(18,20)),year=yy<57?2000+yy:1900+yy,day=Number(tle[0].slice(20,32));return {norad:n,name:r.info?.satname??String(n),group:'active',epoch:Date.UTC(year,0,1)+(day-1)*86400000,tle};}
 async getValidationPosition(n){const r=await this.json(this.url(`positions/${validNorad(n)}/0/0/0/1`));const p=r.positions?.[0];if(!p)throw Error('Sin posición');return {latitude:p.satlatitude,longitude:p.satlongitude,altitude:p.sataltitude,time:p.timestamp*1000,source:'N2YO'};}
 async getVisualPasses(n,observer,days=2){if(days<1||days>10)throw Error('Horizonte inválido');return this.json(this.url(`visualpasses/${validNorad(n)}/${observer.latitude}/${observer.longitude}/${observer.altitude*1000}/${days}/0`),{},this.passLimiter);}
}
export class WhereTheIssProvider extends HttpProvider {
 name='wheretheiss';
 async getOrbitalData(n){if(n!==25544)throw Error('Solo ISS');const r=await this.json('https://api.wheretheiss.at/v1/satellites/25544/tles');const yy=Number(r.line1.slice(18,20)),day=Number(r.line1.slice(20,32));return {norad:n,name:'ISS (ZARYA)',group:'stations',epoch:Date.UTC(yy<57?2000+yy:1900+yy,0,1)+(day-1)*86400000,tle:[r.line1,r.line2]};}
 async getValidationPosition(n){if(n!==25544)throw Error('Solo ISS');const r=await this.json('https://api.wheretheiss.at/v1/satellites/25544');return {latitude:r.latitude,longitude:r.longitude,altitude:r.altitude,time:r.timestamp*1000,source:'Where the ISS at?'};}
}
export function providersFromEnvironment(env=process.env){const providers=[new CelesTrakProvider()];if(env.SPACETRACK_IDENTITY&&env.SPACETRACK_PASSWORD)providers.push(new SpaceTrackProvider({identity:env.SPACETRACK_IDENTITY,password:env.SPACETRACK_PASSWORD}));if(env.N2YO_API_KEY)providers.push(new N2yoProvider(env.N2YO_API_KEY));providers.push(new WhereTheIssProvider());return providers;}
export function createProxy({providers=providersFromEnvironment(),now=Date.now,ttl=24*3600000}={}){
 const cache=new Map(),flights=new Map(),clients=new Map();
 function admit(client){
  const time=now();for(const [key,hits] of clients)if(!hits.length||time-hits[hits.length-1]>=60000)clients.delete(key);
  const recent=(clients.get(client)??[]).filter(t=>time-t<60000);
  if(recent.length>=120)return false;
  // Bound memory even when directly exposed; upstream protection is still recommended.
  if(clients.size>=10000&&!clients.has(client))return false;
  recent.push(time);clients.set(client,recent);return true;
 }
 async function load(key,method,arg,source){
  const hit=cache.get(key);if(hit&&now()-hit.savedAt<(method==='getValidationPosition'?5000:ttl))return hit.value;
  if(flights.has(key))return flights.get(key);
  const work=(async()=>{for(const p of providers){if(source&&p.name!==source)continue;try{const value=await p[method](arg);cache.set(key,{value,savedAt:now()});if(cache.size>2000)cache.delete(cache.keys().next().value);return value;}catch{/* never expose upstream URLs, cookies or secrets */}}throw Error('Fuentes no disponibles');})();
  flights.set(key,work);try{return await work;}finally{flights.delete(key);}
 }
 async function handle(path,client='local'){
  const url=new URL(path,'http://localhost'),parts=url.pathname.split('/').filter(Boolean);let method,arg;
  if(parts.length===1&&parts[0]==='catalog'){method='getCatalog';arg=url.searchParams.get('group')??'stations';if(!(arg in groups))return {status:400,body:{error:'Grupo inválido'}};}
  else if(parts.length===2&&['orbital','validate'].includes(parts[0])){method=parts[0]==='orbital'?'getOrbitalData':'getValidationPosition';arg=Number(parts[1]);if(!/^\d+$/.test(parts[1])||!Number.isSafeInteger(arg)||arg<1)return {status:400,body:{error:'NORAD inválido'}};}
  else return {status:404,body:{error:'Ruta no encontrada'}};
  const source=url.searchParams.get('source');if(source&&!['spacetrack','n2yo','wheretheiss','CelesTrak'].includes(source))return {status:400,body:{error:'Fuente inválida'}};
  if(!admit(client))return {status:429,body:{error:'Límite del proxy: 120 solicitudes/minuto'}};
  try{return {status:200,body:await load(`${method}:${arg}:${source??''}`,method,arg,source)};}catch{return {status:503,body:{error:'Fuentes no disponibles'}};}
 }
 const server=http.createServer(async(req,res)=>{
  res.setHeader('Access-Control-Allow-Origin','*');res.setHeader('Content-Type','application/json; charset=utf-8');res.setHeader('Cache-Control','no-store');
  if(req.method==='OPTIONS'){res.writeHead(204);res.end();return;}
  if(req.method!=='GET'){res.writeHead(405);res.end(JSON.stringify({error:'Método no permitido'}));return;}
  const result=await handle(req.url??'/',req.socket.remoteAddress??'unknown');if(result.status===429)res.setHeader('Retry-After','60');res.writeHead(result.status);res.end(JSON.stringify(result.body));
 });return {handle,server};
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){const port=Number(process.env.PORT??3000);createProxy().server.listen(port,'0.0.0.0',()=>console.log(`Satellite proxy escuchando en ${port}`));}
