import {db,kafka,topics,sleep,setup,checked,logError} from './shared.js';
import domain from './domain.cjs';
const {validate,toReading,commandOutcome}=domain;
await setup();
const producer=kafka.producer();await producer.connect();
const consumer=kafka.consumer({groupId:'agropulse-sql-v1'});await consumer.connect();await consumer.subscribe({topics,fromBeginning:true});
/** @param {string} topic @param {Record<string,any>} payload */
async function publish(topic,payload){await producer.send({topic,messages:[{value:JSON.stringify(payload)}]});console.log('produced',topic,payload.command_id||payload.station_id||payload.valve_id);}
await consumer.run({eachMessage:async({topic,message})=>{
 let p;try{p=JSON.parse(message.value?.toString()||'');}catch{console.warn('discard invalid JSON',topic);return;}
 if(!validate(topic,p)){console.warn('discard invalid payload',topic);return;}
 console.log('consumed',topic,p.station_id||p.command_id);
 if(topic==='soil.moisture'||topic==='weather.tick'){
  const station=checked(await db.from('stations').select('id').eq('id',p.station_id).maybeSingle());
  if(!station){console.warn('discard unknown station_id',p.station_id);return;}
  if(topic==='soil.moisture'){
   const {data:weather,error}=await db.from('weather_readings').select('rain_mm').eq('station_id',p.station_id).eq('measured_at',p.ts).maybeSingle();if(error)throw error;
   checked(await db.from('readings').upsert({...toReading(p),rain_mm:weather?.rain_mm??null},{onConflict:'station_id,measured_at,source'}));console.log('upsert reading',p.station_id,p.ts);
  } else {
   checked(await db.from('weather_readings').upsert({station_id:p.station_id,measured_at:p.ts,rain_mm:p.rain_mm},{onConflict:'station_id,measured_at'}));
   checked(await db.from('readings').update({rain_mm:p.rain_mm}).eq('station_id',p.station_id).eq('measured_at',p.ts).eq('source','sensor'));
  }
 } else if(topic==='irrigation.commands'){
  const c=checked(await db.from('irrigation_commands').select('*').eq('id',p.command_id).maybeSingle());
  if(!c||c.valve_id!==p.valve_id||c.action!==p.action||c.duration_min!==p.duration_min||c.status!=='pending')return;
  await sleep(1000+Math.floor(Math.random()*3000));
  const outcome=commandOutcome('pending',Math.random());
  const result=checked(await db.rpc('apply_command',{command:c.id,fail:outcome?.status==='failed'}));
  if(result?.valve_id)await publish('valve.status',result);
 } else if(topic==='valve.status'){
  // apply_command already atomically updated SQL; replay must never overwrite a newer command.
  console.log('valve.status acknowledged',p.valve_id,p.status);
 }
}});
// Database outbox bridge: repeated publication is safe because apply_command locks and checks pending.
async function bridge(){while(true){try{const rows=checked(await db.from('irrigation_commands').select('*').eq('status','pending').order('created_at').limit(50));for(const c of rows)await publish('irrigation.commands',{command_id:c.id,valve_id:c.valve_id,action:c.action,duration_min:c.duration_min});checked(await db.rpc('maintenance'));checked(await db.rpc('prune_weather'));}catch(e){logError(e);}await sleep(750);}}
void bridge();
async function shutdown(){await consumer.disconnect();await producer.disconnect();process.exit(0);}process.on('SIGTERM',shutdown);process.on('SIGINT',shutdown);
