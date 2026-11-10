import {defaultSettings,Filters,networks,NetworkType,Settings} from '../types';
export function parseSettings(hostText:string,url:string,interval:string,low:string,recovery:string,backgroundEnabled:boolean):Settings {
 const hosts=hostText.split(',').map(text=>{const match=text.trim().match(/^([^\s:/]+):(\d+)$/);if(!match)throw Error('Hosts: usá nombre:puerto separados por comas');const port=Number(match[2]);if(port<1||port>65535)throw Error('Puerto inválido');return {host:match[1],port};});
 if(hosts.length<3||hosts.length>10||new Set(hosts.map(h=>`${h.host}:${h.port}`)).size!==hosts.length)throw Error('Configurá entre 3 y 10 hosts distintos');
 if(!/^https?:\/\/[^\s/?#]+(?::\d+)?(?:\/[^\s?#]*)?$/.test(url.trim()))throw Error('URL HTTP/HTTPS inválida');
 const minutes=Number(interval),lo=Number(low),hi=Number(recovery);
 if(!interval.trim()||!Number.isInteger(minutes)||minutes<15||minutes>1440)throw Error('Intervalo entre 15 y 1440 minutos');
 if(!low.trim()||!recovery.trim()||!Number.isFinite(lo)||!Number.isFinite(hi)||lo<0||lo>=hi||hi>1)throw Error('Umbrales: 0 ≤ degradación < recuperación ≤ 1');
 return {...defaultSettings,hosts,backendUrl:url.trim().replace(/\/$/,''),intervalMinutes:minutes,thresholds:{low:lo,recovery:hi},backgroundEnabled};
}
function parseDate(text:string):number|undefined {
 if(!text.trim())return undefined;
 if(!/^\d{4}-\d{2}-\d{2}(T\d{2}:\d{2}:\d{2}(\.\d{3})?Z)?$/.test(text))throw Error('Fecha: AAAA-MM-DD o ISO UTC');
 const time=Date.parse(text);if(!Number.isFinite(time)||new Date(time).toISOString().slice(0,10)!==text.slice(0,10))throw Error('Fecha inválida');return time;
}
export function parseFilters(network:string,from:string,to:string,zone:string):Filters {
 const f:Filters={};if(network){if(!networks.includes(network as NetworkType))throw Error('Tipo de red inválido');f.network=network as NetworkType;}
 const start=parseDate(from),end=parseDate(to);if(start!==undefined)f.from=start;if(end!==undefined)f.to=end;
 if(start!==undefined&&end!==undefined&&start>end)throw Error('La fecha inicial supera la final');
 if(zone.trim()){
  const values=zone.split(',').map(v=>Number(v.trim()));
  if(values.length!==4||zone.split(',').some(v=>!v.trim())||values.some(v=>!Number.isFinite(v)))throw Error('Zona: sur,oeste,norte,este');
  const [south,west,north,east]=values;
  if(south< -90||north>90||south>north||west< -180||west>180||east< -180||east>180)throw Error('Coordenadas inválidas');
  f.bbox={south,west,north,east};
 }return f;
}
