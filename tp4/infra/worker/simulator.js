import {db,kafka,sleep,setup,checked,logError} from './shared.js';
await setup();
const producer=kafka.producer();await producer.connect();
const disabled=new Set((process.env.DISABLED_STATION_IDS||'30000000-0000-4000-8000-000000000003').split(','));
const stations=checked(await db.from('stations').select('id,plot_id,plots(name)'));
/** @param {any} station */
async function run(station){
 let moisture=station.plots?.name==='Costa 2'?18:35;
 while(true){
  if(!disabled.has(station.id)){
   try{
    moisture=Math.max(0,Math.min(100,moisture+(Math.random()-.5)*1.2));
    const ts=new Date().toISOString();
    /** @type {[string,Record<string,unknown>][]} */
    const events=[['soil.moisture',{station_id:station.id,moisture_pct:moisture,temp_c:24+(Math.random()-.5)*4,ts}],['weather.tick',{station_id:station.id,rain_mm:Math.random()<.1?Math.random()*2:0,ts}]];
    for(const [topic,payload] of events){await producer.send({topic,messages:[{key:station.id,value:JSON.stringify(payload)}]});console.log('produced',topic,station.id,ts);}
   }catch(e){logError(e);}
  }else console.log('station disabled',station.id);
  await sleep(3000+Math.floor(Math.random()*5001));
 }
}
await Promise.all(stations.map(run));
