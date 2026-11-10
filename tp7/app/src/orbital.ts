import { json2satrec, twoline2satrec, propagate, gstime, eciToGeodetic, eciToEcf, ecfToLookAngles, degreesToRadians, radiansToDegrees, type SatRec } from 'satellite.js';
export type Geo = { latitude:number; longitude:number; altitude:number };
export type Observer = Geo;
export type OrbitalPosition = Geo & { time:number; azimuth:number; elevation:number; speed:number };
export type Orbit = { satrec:SatRec; periodMinutes:number; inclination:number };
export const EARTH_RADIUS = 6371.0088;
const rad=degreesToRadians, deg=radiansToDegrees;
export const normalizeLongitude=(n:number)=>((n+180)%360+360)%360-180;
export function createOrbit(input:Record<string,unknown>|readonly [string,string]):Orbit {
 const satrec=Array.isArray(input)?twoline2satrec(input[0],input[1]):json2satrec(input as unknown as Parameters<typeof json2satrec>[0]);
 if(satrec.error || !Number.isFinite(satrec.no) || satrec.no<=0) throw Error('Datos orbitales inválidos');
 return {satrec,periodMinutes:2*Math.PI/satrec.no,inclination:deg(satrec.inclo)};
}
export function position(orbit:Orbit,time:number,observer:Observer={latitude:0,longitude:0,altitude:0}):OrbitalPosition {
 const date=new Date(time), result=propagate(orbit.satrec,date);
 if(!result || !result.position || !result.velocity || orbit.satrec.error) throw Error('No se pudo propagar la órbita');
 const gmst=gstime(date), geo=eciToGeodetic(result.position,gmst);
 const look=ecfToLookAngles({latitude:rad(observer.latitude),longitude:rad(observer.longitude),height:observer.altitude},eciToEcf(result.position,gmst));
 const p={latitude:deg(geo.latitude),longitude:normalizeLongitude(deg(geo.longitude)),altitude:geo.height,time,azimuth:(deg(look.azimuth)+360)%360,elevation:deg(look.elevation),speed:Math.hypot(result.velocity.x,result.velocity.y,result.velocity.z)};
 if(!Object.values(p).every(Number.isFinite))throw Error('Posición no finita');
 return p;
}
export function splitAntimeridian(points:Geo[]):Geo[][] {
 const segments:Geo[][]=[];
 for(const p of points){const last=segments[segments.length-1];if(!last || Math.abs(last[last.length-1].longitude-p.longitude)>180)segments.push([p]);else last.push(p);}
 return segments;
}
export function groundTrack(orbit:Orbit,now:number,stepSeconds=60,orbits=1) {
 if(stepSeconds<30 || stepSeconds>60 || orbits<1)throw Error('Muestreo: 30–60 s, al menos una órbita');
 const span=orbit.periodMinutes*60000*orbits;
 const sample=(start:number,end:number)=>{const points:Geo[]=[];for(let t=start;t<end;t+=stepSeconds*1000)points.push(position(orbit,t));points.push(position(orbit,end));return splitAntimeridian(points);};
 return {past:sample(now-span,now),future:sample(now,now+span)};
}
// Central angle ψ = acos(R/(R+h) cos ε) − ε; spherical geometric horizon, km.
export function footprintRadius(altitude:number,minElevation=0):number {
 if(altitude<0 || minElevation<0 || minElevation>90)throw Error('Cobertura fuera de rango');
 return EARTH_RADIUS*Math.max(0,Math.acos(EARTH_RADIUS/(EARTH_RADIUS+altitude)*Math.cos(rad(minElevation)))-rad(minElevation));
}
// Tessellate spherical cap in latitude bands; clip longitude intervals to map strips.
// No ring crosses a pole or spans >180°. Bands use midpoint integration (≤1° error).
export function footprintRings(center:Geo,minElevation=0):Geo[][] {
 const angle=footprintRadius(center.altitude,minElevation)/EARTH_RADIUS;
 if(angle<1e-10)return [];
 const low=Math.max(-90,center.latitude-deg(angle)), high=Math.min(90,center.latitude+deg(angle));
 const n=Math.max(1,Math.ceil(high-low)), rings:Geo[][]=[];
 for(let i=0;i<n;i++){
  const south=low+(high-low)*i/n,north=low+(high-low)*(i+1)/n,lat=rad((south+north)/2),c=rad(center.latitude);
  const q=(Math.cos(angle)-Math.sin(lat)*Math.sin(c))/(Math.cos(lat)*Math.cos(c));
  const half=q<=-1?180:q>=1?0:deg(Math.acos(q));
  const left=center.longitude-half,right=center.longitude+half;
  for(let strip=-2;strip<=2;strip++)for(const [a,b] of [[-180,0],[0,180]]){
   const x=Math.max(left,a+strip*360),y=Math.min(right,b+strip*360);if(y<=x)continue;
   rings.push([{latitude:south,longitude:x-strip*360,altitude:0},{latitude:south,longitude:y-strip*360,altitude:0},{latitude:north,longitude:y-strip*360,altitude:0},{latitude:north,longitude:x-strip*360,altitude:0}]);
  }
 }
 return rings;
}
export function orientation(heading:number,azimuth:number,pitch:number,elevation:number){return {turn:normalizeLongitude(azimuth-heading),elevation:elevation-pitch};}
export function positionError(a:Geo,b:Geo):number {
 const dlat=rad(b.latitude-a.latitude),dlon=rad(b.longitude-a.longitude);
 const h=Math.sin(dlat/2)**2+Math.cos(rad(a.latitude))*Math.cos(rad(b.latitude))*Math.sin(dlon/2)**2;
 const surface=2*EARTH_RADIUS*Math.asin(Math.sqrt(Math.min(1,h)));
 return Math.hypot(surface,b.altitude-a.altitude);
}
