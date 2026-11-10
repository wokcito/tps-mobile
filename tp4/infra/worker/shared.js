import { Kafka, logLevel } from 'kafkajs';
import { createClient } from '@supabase/supabase-js';
/** @param {string} key */
function required(key){const value=process.env[key];if(!value)throw new Error(`Missing server environment variable: ${key}`);return value;}
export const db=createClient(required('SUPABASE_URL'),required('SUPABASE_SERVICE_ROLE_KEY'),{auth:{persistSession:false,autoRefreshToken:false}});
export const kafka=new Kafka({clientId:'agropulse',brokers:(process.env.KAFKA_BROKERS||'redpanda:9092').split(','),logLevel:logLevel.WARN});
export const topics=['soil.moisture','weather.tick','irrigation.commands','valve.status'];
/** @param {number} ms */
export const sleep=ms=>new Promise(resolve=>setTimeout(resolve,ms));
export async function setup(){const admin=kafka.admin();await admin.connect();await admin.createTopics({topics:topics.map(topic=>({topic,numPartitions:1,replicationFactor:1}))});await admin.disconnect();}
/** @template T @param {{data:T,error: {message:string}|null}} result @returns {NonNullable<T>} */
export function checked(result){if(result.error)throw new Error(result.error.message);return /** @type {NonNullable<T>} */(result.data);}
/** @param {unknown} error */
export function logError(error){console.error('operation failed',error instanceof Error?error.message:'unknown error');}
