import TcpSocket from 'react-native-tcp-socket';
import {Probe,throwIfCancelled} from '../engine/probes';
/** TCP connect RTT includes handshake and DNS, not ICMP or application echo. */
export const tcpProbe:Probe=(host,port,signal)=>new Promise((resolve,reject)=>{
 try {throwIfCancelled(signal);}catch(e){reject(e);return;}
 let socket:ReturnType<typeof TcpSocket.createConnection>|undefined;let settled=false;
 const start=performance.now();
 const finish=(error?:Error)=>{if(settled)return;settled=true;clearTimeout(timer);signal.removeEventListener('abort',abort);socket?.destroy();error?reject(error):resolve(performance.now()-start);};
 const abort=()=>finish(new Error('Medición cancelada'));
 const timer=setTimeout(()=>finish(new Error('Timeout TCP')),3000);
 signal.addEventListener('abort',abort,{once:true});
 try {socket=TcpSocket.createConnection({host,port},()=>finish());socket.on('error',e=>finish(e));socket.on('close',()=>finish(new Error('Socket cerrado')));}catch(e){finish(e instanceof Error?e:new Error('Error TCP'));}
});
