export interface DiagnosticCommand {
  id: string;
  label: string;
  command: string;
}

/**
 * Only these exact strings can reach the SSH client. Generic Linux-based
 * equipment (OpenWrt, many ONTs); vendor sets can be added per profile.
 */
export const DIAGNOSTIC_COMMANDS: DiagnosticCommand[] = [
  { id: 'uptime', label: 'Uptime', command: 'uptime' },
  { id: 'ifaces', label: 'Interfaces', command: 'ip -s link' },
  { id: 'routes', label: 'Rutas', command: 'ip route' },
  { id: 'arp', label: 'Tabla ARP', command: 'ip neigh' },
  { id: 'ping-gw', label: 'Ping gateway', command: 'ping -c 3 -W 2 $(ip route | awk \'/default/ {print $3; exit}\')' },
];

export const isAllowedCommand = (cmd: string): boolean =>
  DIAGNOSTIC_COMMANDS.some(c => c.command === cmd);
