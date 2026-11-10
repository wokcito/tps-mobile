import TcpSocket from 'react-native-tcp-socket';
import Zeroconf from 'react-native-zeroconf';
import NetInfo from '@react-native-community/netinfo';
import { subnetHosts } from './subnet';

export interface DiscoveredDevice {
  ip: string;
  mac?: string; // not obtainable from userland on Android 10+; filled by mDNS/SNMP when possible
  hostname?: string;
  source: 'tcp' | 'mdns';
}

const PROBE_PORTS = [22, 80, 443, 161];

const probe = (ip: string, port: number, timeoutMs: number): Promise<boolean> =>
  new Promise(resolve => {
    let settled = false;
    const done = (ok: boolean) => {
      if (!settled) {
        settled = true;
        try {
          sock.destroy();
        } catch {}
        resolve(ok);
      }
    };
    const sock = TcpSocket.createConnection({ host: ip, port }, () => done(true));
    sock.setTimeout(timeoutMs);
    sock.on('timeout', () => done(false));
    sock.on('error', (e: { message?: string }) =>
      // An immediate "connection refused" still proves the host is up.
      done(/refused|ECONNREFUSED/i.test(e?.message ?? '')),
    );
  });

/** ARP-like sweep: a host that answers (or refuses) on any common port is alive. */
export const scanSubnet = async (
  onFound: (d: DiscoveredDevice) => void,
  concurrency = 48,
  timeoutMs = 700,
): Promise<void> => {
  const state = await NetInfo.fetch();
  const details = state.details as { ipAddress?: string; subnet?: string } | null;
  if (state.type !== 'wifi' || !details?.ipAddress || !details.subnet) {
    throw new Error('Conectate a una red Wi-Fi para escanear');
  }
  const hosts = subnetHosts(details.ipAddress, details.subnet).filter(
    h => h !== details.ipAddress,
  );
  let next = 0;
  const worker = async () => {
    while (next < hosts.length) {
      const ip = hosts[next++];
      for (const port of PROBE_PORTS) {
        if (await probe(ip, port, timeoutMs)) {
          onFound({ ip, source: 'tcp' });
          break;
        }
      }
    }
  };
  await Promise.all(Array.from({ length: concurrency }, worker));
};

export const startMdns = (onFound: (d: DiscoveredDevice) => void): (() => void) => {
  const zc = new Zeroconf();
  zc.on('resolved', (s: { host?: string; name?: string; addresses?: string[] }) => {
    const ip = s.addresses?.find(a => a.includes('.'));
    if (ip) {
      onFound({ ip, hostname: s.host ?? s.name, source: 'mdns' });
    }
  });
  zc.scan('http', 'tcp', 'local.');
  zc.scan('ssh', 'tcp', 'local.');
  return () => zc.stop();
};
