import {Measurement,averageRtt} from '../types';
const columns=['id','sessionId','timestamp','network','operator','signalDbm','latitude','longitude','rttAvgMs','downloadMbps','uploadMbps'];
function cell(value:unknown):string {const text=value==null?'':String(value);return /[",\r\n]/.test(text)?`"${text.replace(/"/g,'""')}"`:text;}
export function exportCSV(rows:Measurement[]):string {
 return [columns.join(','),...rows.map(m=>[m.id,m.sessionId,m.timestamp,m.network,m.operator,m.signalDbm,m.position?.latitude,m.position?.longitude,averageRtt(m),m.throughput?.downloadMbps,m.throughput?.uploadMbps].map(cell).join(','))].join('\r\n')+'\r\n';
}
export function exportJSON(rows:Measurement[]):string {return JSON.stringify(rows,null,2);}
