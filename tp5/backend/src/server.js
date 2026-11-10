import net from 'node:net';
import {createApp} from './app.js';
const port=Number(process.env.PORT||3000),tcpPort=Number(process.env.TCP_PORT||9000);
const server=createApp({maxBytes:Number(process.env.MAX_BYTES||16777216)}).listen(port,'0.0.0.0',()=>console.log(`HTTP :${port}`));
server.requestTimeout=30000;server.headersTimeout=10000;
// Optional byte-for-byte echo, distinct from the app's TCP handshake RTT mode.
const tcp=tcpPort?net.createServer(socket=>{socket.setTimeout(10000,()=>socket.destroy());socket.on('error',()=>socket.destroy());socket.pipe(socket);}).listen(tcpPort,'0.0.0.0',()=>console.log(`TCP echo :${tcpPort}`)):null;
for(const signal of ['SIGINT','SIGTERM'])process.on(signal,()=>{tcp?.close();server.close();});
