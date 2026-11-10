const toInt = (ip: string): number => {
  const p = ip.split('.').map(Number);
  if (p.length !== 4 || p.some(n => !Number.isInteger(n) || n < 0 || n > 255)) {
    throw new Error(`Invalid IPv4 address: ${ip}`);
  }
  return ((p[0] << 24) | (p[1] << 16) | (p[2] << 8) | p[3]) >>> 0;
};
const toIp = (n: number): string =>
  [n >>> 24, (n >>> 16) & 255, (n >>> 8) & 255, n & 255].join('.');

export const parseCidr = (cidr: string): { ip: string; mask: string } => {
  const [ip, bits] = cidr.split('/');
  const b = Number(bits);
  if (!Number.isInteger(b) || b < 0 || b > 32) {
    throw new Error(`Invalid CIDR: ${cidr}`);
  }
  const mask = b === 0 ? 0 : (0xffffffff << (32 - b)) >>> 0;
  return { ip, mask: toIp(mask) };
};

const MAX_HOSTS = 1022; // /22

/** Usable host addresses of the subnet containing `ip` (network/broadcast excluded). */
export const subnetHosts = (ip: string, mask: string): string[] => {
  const m = toInt(mask);
  const network = (toInt(ip) & m) >>> 0;
  const broadcast = (network | (~m >>> 0)) >>> 0;
  const count = broadcast - network - 1;
  if (count > MAX_HOSTS) {
    throw new Error('Subnet too large to scan from a phone (max /22)');
  }
  if (count < 1) {
    return []; // /31 and /32 have no conventional usable range
  }
  const out: string[] = [];
  for (let a = network + 1; a < broadcast; a++) {
    out.push(toIp(a));
  }
  return out;
};
