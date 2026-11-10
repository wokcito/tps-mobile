// Node 24 native TS stripping: runs the SAME pure Orbital Engine as the app.
import { writeFile } from 'node:fs/promises';
import { createOrbit, position, positionError } from '../src/orbital.ts';
const fetchJson=async url=>{const r=await fetch(url,{signal:AbortSignal.timeout(20000)});if(!r.ok)throw Error(`HTTP ${r.status}`);return r.json();};
const report={measuredAt:new Date().toISOString(),orbitalSource:'CelesTrak GP JSON',validationSource:'Where the ISS at?',n2yo:'PENDIENTE: requiere API key en backend',samples:[]};
try{
 const rows=await fetchJson('https://celestrak.org/NORAD/elements/gp.php?CATNR=25544&FORMAT=json');
 const omm=rows[0],orbit=createOrbit(omm),epoch=Date.parse(omm.EPOCH+'Z');report.omm=omm;
 for(let i=0;i<3;i++){
  if(i)await new Promise(r=>setTimeout(r,1200));
  const reference=await fetchJson('https://api.wheretheiss.at/v1/satellites/25544');
  const time=reference.timestamp*1000,computed=position(orbit,time);
  report.samples.push({time:new Date(time).toISOString(),orbitalAgeHours:(time-epoch)/3600000,errorKm:positionError(computed,reference),computed,reference});
 }
 report.status='MEDIDO';
}catch(error){report.status='PENDIENTE';report.error=String(error);process.exitCode=1;}
const output=JSON.stringify(report,null,2)+'\n';console.log(output);await writeFile(new URL('../../docs/validation-real.json',import.meta.url),output);
