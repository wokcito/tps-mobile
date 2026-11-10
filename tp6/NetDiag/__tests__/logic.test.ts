import { subnetHosts, parseCidr } from '../src/discovery/subnet';
import { buildReportHtml } from '../src/reporting/reportHtml';
import { trafficRate } from '../src/diagnostics/traffic';
import { DIAGNOSTIC_COMMANDS, isAllowedCommand } from '../src/diagnostics/commands';

describe('subnet', () => {
  it('lists usable hosts of a /30', () => {
    expect(subnetHosts('192.168.1.1', '255.255.255.252')).toEqual(['192.168.1.1', '192.168.1.2']);
  });
  it('excludes network and broadcast on /24 (254 hosts)', () => {
    const h = subnetHosts('10.0.0.57', '255.255.255.0');
    expect(h).toHaveLength(254);
    expect(h[0]).toBe('10.0.0.1');
    expect(h[253]).toBe('10.0.0.254');
  });
  it('refuses to scan anything larger than /22', () => {
    expect(() => subnetHosts('10.0.0.1', '255.255.0.0')).toThrow(/too large/i);
  });
  it('parses CIDR', () => {
    expect(parseCidr('192.168.0.0/24')).toEqual({ ip: '192.168.0.0', mask: '255.255.255.0' });
  });
});

describe('trafficRate', () => {
  it('computes bytes/s between two samples', () => {
    expect(trafficRate(1000, 3000, 2000)).toBe(1000);
  });
  it('handles 32-bit counter wrap', () => {
    expect(trafficRate(4294967200, 100, 1000)).toBe(196);
  });
  it('returns null when no time elapsed', () => {
    expect(trafficRate(1, 2, 0)).toBeNull();
  });
});

describe('ssh command allowlist', () => {
  it('only allows predefined commands', () => {
    expect(isAllowedCommand(DIAGNOSTIC_COMMANDS[0].command)).toBe(true);
    expect(isAllowedCommand('rm -rf /')).toBe(false);
    expect(isAllowedCommand(DIAGNOSTIC_COMMANDS[0].command + '; reboot')).toBe(false);
  });
});

describe('report html', () => {
  const base = {
    title: 'Instalación <ONT>',
    siteName: 'Sitio "A"',
    notes: 'a & b',
    technician: 'Ana',
    createdAt: Date.UTC(2026, 0, 2, 3, 4, 5),
    latitude: -27.36,
    longitude: -55.89,
    photos: [{ uri: 'file:///p1.jpg', latitude: -27.36, longitude: -55.89 }],
  };
  it('escapes user content', () => {
    const html = buildReportHtml(base);
    expect(html).toContain('Instalación &lt;ONT&gt;');
    expect(html).toContain('Sitio &quot;A&quot;');
    expect(html).toContain('a &amp; b');
    expect(html).not.toContain('<ONT>');
  });
  it('embeds photos with their coordinates and the GPS of the report', () => {
    const html = buildReportHtml(base);
    expect(html).toContain('src="file:///p1.jpg"');
    expect(html).toContain('-27.360000, -55.890000');
  });
  it('says so when there is no GPS fix', () => {
    const html = buildReportHtml({ ...base, latitude: undefined, longitude: undefined, photos: [] });
    expect(html).toContain('Sin ubicación GPS');
    expect(html).toContain('Sin fotos');
  });
});
