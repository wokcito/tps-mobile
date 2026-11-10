import {NativeModules} from 'react-native';
import {readTelephony} from '../src/native/telephony';
import {tcpProbe} from '../src/native/tcp';
import TcpSocket from 'react-native-tcp-socket';
jest.mock('react-native-tcp-socket',()=>({createConnection:jest.fn()}));
test('bridge ausente o permiso revocado siempre devuelve null seguro',async()=>{
 const previous=NativeModules.TelephonyModule;delete NativeModules.TelephonyModule;
 expect(await readTelephony()).toEqual({operator:null,radio:null,signalDbm:null});
 NativeModules.TelephonyModule={getSnapshot:async()=>{throw Error('denied');}};
 expect(await readTelephony()).toEqual({operator:null,radio:null,signalDbm:null});
 NativeModules.TelephonyModule=previous;
});
test('socket timeout/cancelación destruyen socket y eliminan timers',async()=>{
 jest.useFakeTimers();const destroy=jest.fn(),on=jest.fn();jest.mocked(TcpSocket.createConnection).mockReturnValue({destroy,on} as never);
 const p=tcpProbe('a',80,new AbortController().signal);const assertion=expect(p).rejects.toThrow('Timeout TCP');await jest.advanceTimersByTimeAsync(3000);await assertion;
 expect(destroy).toHaveBeenCalledTimes(1);expect(jest.getTimerCount()).toBe(0);
 const c=new AbortController();const p2=tcpProbe('a',80,c.signal);const cancelled=expect(p2).rejects.toThrow('cancelada');c.abort();await cancelled;expect(destroy).toHaveBeenCalledTimes(2);expect(jest.getTimerCount()).toBe(0);jest.useRealTimers();
});
