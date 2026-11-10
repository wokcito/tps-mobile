import dgram from 'react-native-udp';
import { decodeResponse, encodeGetRequest, OIDS, SnmpResponse } from './snmp/snmp';
import { SNMP_PORT, SNMP_TIMEOUT_MS } from '../config';
import { trafficRate } from '../diagnostics/traffic';

let reqId = Math.floor(Math.random() * 0x7fffff);

export const snmpGet = (
  host: string,
  community: string,
  oids: string[],
  timeoutMs = SNMP_TIMEOUT_MS,
): Promise<SnmpResponse> =>
  new Promise<SnmpResponse>((resolve, reject) => {
    const socket = dgram.createSocket({ type: 'udp4' });
    const id = ++reqId;
    let done = false;
    const finish = (fn: () => void) => {
      if (done) {
        return;
      }
      done = true;
      clearTimeout(timer);
      try {
        socket.close();
      } catch {}
      fn();
    };
    const timer = setTimeout(
      () => finish(() => reject(new Error('SNMP timeout'))),
      timeoutMs,
    );
    socket.on('error', (e: Error) => finish(() => reject(e)));
    socket.on('message', (msg: Uint8Array) =>
      finish(() => {
        try {
          const r = decodeResponse(new Uint8Array(msg));
          r.requestId === id ? resolve(r) : reject(new Error('Mismatched request id'));
        } catch (e) {
          reject(e);
        }
      }),
    );
    socket.bind(0, (err?: Error) => {
      if (err) {
        return finish(() => reject(err));
      }
      const pkt = encodeGetRequest({ version: 1, community, requestId: id, oids });
      socket.send(pkt, 0, pkt.length, SNMP_PORT, host, (e?: Error) => {
        if (e) {
          finish(() => reject(e));
        }
      });
    });
  });

export interface SystemInfo {
  sysName: string | null;
  sysDescr: string | null;
  uptimeSeconds: number | null;
}

export const querySystem = async (host: string, community: string): Promise<SystemInfo> => {
  const r = await snmpGet(host, community, [OIDS.sysName, OIDS.sysDescr, OIDS.sysUpTime]);
  const v = (oid: string) => r.varbinds.find(b => b.oid === oid)?.value ?? null;
  const ticks = v(OIDS.sysUpTime);
  return {
    sysName: (v(OIDS.sysName) as string) ?? null,
    sysDescr: (v(OIDS.sysDescr) as string) ?? null,
    uptimeSeconds: typeof ticks === 'number' ? Math.floor(ticks / 100) : null,
  };
};

export interface InterfaceTraffic {
  index: number;
  inBytesPerSec: number | null;
  outBytesPerSec: number | null;
  inOctets: number;
  outOctets: number;
}

/** Two samples `intervalMs` apart give a throughput estimate for one interface. */
export const sampleInterface = async (
  host: string,
  community: string,
  index: number,
  intervalMs = 2000,
): Promise<InterfaceTraffic> => {
  const oids = [OIDS.ifInOctets(index), OIDS.ifOutOctets(index)];
  const t0 = Date.now();
  const a = await snmpGet(host, community, oids);
  await new Promise<void>(r => setTimeout(r, intervalMs));
  const b = await snmpGet(host, community, oids);
  const dt = Date.now() - t0;
  const n = (r: SnmpResponse, i: number) => Number(r.varbinds[i]?.value ?? 0);
  return {
    index,
    inOctets: n(b, 0),
    outOctets: n(b, 1),
    inBytesPerSec: trafficRate(n(a, 0), n(b, 0), dt),
    outBytesPerSec: trafficRate(n(a, 1), n(b, 1), dt),
  };
};
