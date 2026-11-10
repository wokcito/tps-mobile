import { createOrbit, position, groundTrack, footprintRadius, footprintRings, orientation, positionError } from '../orbital';
import { predictPasses, predictPassesAsync, planReminders } from '../prediction';
import { ISS, TLE } from './fixtures';
const now = Date.parse(ISS.EPOCH+'Z');
const observer = {latitude:-31.392,longitude:-58.021,altitude:0.03};
describe('SGP4 / geometry public API',()=>{
 test('real OMM and TLE: physical invariants and observer angles',()=>{
  const orbit=createOrbit(ISS); const p=position(orbit,now,observer);
  expect(p.altitude).toBeGreaterThan(380); expect(p.altitude).toBeLessThan(440);
  expect(orbit.inclination).toBeCloseTo(51.6321,3); expect(orbit.periodMinutes).toBeGreaterThan(92); expect(orbit.periodMinutes).toBeLessThan(93);
  expect(Math.abs(p.latitude)).toBeLessThan(52); expect(p.azimuth).toBeGreaterThanOrEqual(0); expect(p.azimuth).toBeLessThan(360); expect(p.speed).toBeGreaterThan(7);expect(p.speed).toBeLessThan(8);
  expect(position(createOrbit(TLE),Date.UTC(2021,9,2,12)).altitude).toBeGreaterThan(380);
 });
 test('full past and future orbit, antimeridian split, bounded polar footprints',()=>{
  const orbit=createOrbit(ISS); const t=groundTrack(orbit,now);
  expect(t.past.flat().length).toBeGreaterThan(90);expect(t.future.flat().length).toBeGreaterThan(90);
  for(const segment of [...t.past,...t.future]) for(let i=1;i<segment.length;i++) expect(Math.abs(segment[i].longitude-segment[i-1].longitude)).toBeLessThanOrEqual(180);
  expect(footprintRadius(420,0)).toBeGreaterThan(2200);expect(footprintRadius(420,0)).toBeLessThan(2300);
  expect(footprintRadius(420,10)).toBeLessThan(footprintRadius(420,0));expect(footprintRadius(420,90)).toBeCloseTo(0);
  for(const latitude of [0,85,-85]) for(const ring of footprintRings({latitude,longitude:179,altitude:420},0)) {
   expect(ring.length).toBeGreaterThanOrEqual(3);
   for(let i=0;i<ring.length;i++){expect(Math.abs(ring[i].latitude)).toBeLessThanOrEqual(90);expect(Math.abs(ring[i].longitude-ring[(i+1)%ring.length].longitude)).toBeLessThanOrEqual(180);}
  }
 });
 test('refined windows: ordered crossings within one second, configurable horizon',()=>{
  const orbit=createOrbit(ISS); const passes=predictPasses(orbit,observer,now,2,10);
  expect(passes.length).toBeGreaterThan(0);
  for(const pass of passes){expect(pass.aos).toBeLessThan(pass.tca);expect(pass.tca).toBeLessThan(pass.los);expect(pass.maxElevation).toBeGreaterThan(10);expect(position(orbit,pass.aos,observer).elevation).toBeCloseTo(10,1);expect(position(orbit,pass.los,observer).elevation).toBeCloseTo(10,1);expect(pass.los).toBeLessThanOrEqual(now+2*86400000);}
  expect(predictPasses(orbit,observer,now,0,10)).toEqual([]);
 });
 test('orientation wrap and 3D validation metric',()=>{
  expect(orientation(350,5,10,20)).toEqual({turn:15,elevation:10});
  expect(orientation(5,350,20,10)).toEqual({turn:-15,elevation:-10});
  expect(positionError({latitude:0,longitude:0,altitude:420},{latitude:0,longitude:0,altitude:425})).toBe(5);
 });
 test('six-digit OMM keeps physical orbit without lossy TLE conversion',()=>{
  const orbit=createOrbit({...ISS,NORAD_CAT_ID:123456});
  expect(position(orbit,now).latitude).toBeCloseTo(position(createOrbit(ISS),now).latitude,8);
  expect(orbit.satrec.satnum).toBe('123456');
 });
 test('invalid geometry/prediction input fails explicitly',()=>{
  expect(()=>createOrbit({})).toThrow();
  expect(()=>footprintRadius(-1,0)).toThrow('Cobertura fuera de rango');
  expect(()=>footprintRadius(420,91)).toThrow('Cobertura fuera de rango');
  expect(()=>groundTrack(createOrbit(ISS),now,29)).toThrow('Muestreo');
  expect(()=>predictPasses(createOrbit(ISS),observer,now,11)).toThrow('Predicción fuera de rango');
 });
 test('asynchronous cooperative predictor preserves all chunk-boundary windows',async()=>{
  const orbit=createOrbit(ISS),expected=predictPasses(orbit,observer,now,2,10),actual=await predictPassesAsync(orbit,observer,now,2,10);
  expect(actual).toHaveLength(expected.length);
  actual.forEach((p,i)=>{expect(Math.abs(p.aos-expected[i].aos)).toBeLessThan(1000);expect(Math.abs(p.los-expected[i].los)).toBeLessThan(1000);});
 });
 test('reminder planner excludes past and deduplicates by satellite + AOS',()=>{
  const passes=[{aos:now+600000,tca:now+660000,los:now+720000,maxElevation:50}];
  expect(planReminders(25544,[...passes,...passes],5,now)).toEqual([{key:`25544:${now+600000}`,at:now+300000,aos:now+600000,norad:25544}]);
  expect(planReminders(25544,passes,15,now)).toEqual([]);
 });
});
