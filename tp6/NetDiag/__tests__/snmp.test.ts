import {
  encodeOid,
  decodeOid,
  encodeGetRequest,
  decodeResponse,
  OIDS,
  SnmpError,
} from '../src/protocol/snmp/snmp';

const hex = (b: Uint8Array) =>
  Array.from(b, x => x.toString(16).padStart(2, '0')).join('');
const fromHex = (s: string) =>
  new Uint8Array(s.match(/../g)!.map(h => parseInt(h, 16)));

// Independent TLV builder (short-form lengths only) so response fixtures are
// not produced by the code under test.
const tlv = (tag: number, ...parts: Uint8Array[]) => {
  const len = parts.reduce((n, p) => n + p.length, 0);
  const out = new Uint8Array(2 + len);
  out[0] = tag;
  out[1] = len;
  let o = 2;
  for (const p of parts) {
    out.set(p, o);
    o += p.length;
  }
  return out;
};
const int = (n: number) => tlv(0x02, new Uint8Array([n]));
const response = (
  opts: { version?: number; errStatus?: number; value: Uint8Array },
  oidHex = '2b06010201010500',
) =>
  tlv(
    0x30,
    int(opts.version ?? 0),
    tlv(0x04, new Uint8Array([0x70, 0x75, 0x62, 0x6c, 0x69, 0x63])),
    tlv(
      0xa2,
      int(1),
      int(opts.errStatus ?? 0),
      int(0),
      tlv(0x30, tlv(0x30, tlv(0x06, fromHex(oidHex)), opts.value)),
    ),
  );

describe('OID encoding', () => {
  it('encodes sysDescr using the 40*first+second rule', () => {
    expect(hex(encodeOid('1.3.6.1.2.1.1.1.0'))).toBe('2b06010201010100');
  });
  it('encodes arcs >= 128 as base-128 multi-byte', () => {
    expect(hex(encodeOid('1.3.6.1.4.1.311'))).toBe('2b060104018237');
  });
  it('round-trips', () => {
    expect(decodeOid(encodeOid('1.3.6.1.2.1.2.2.1.10.3'))).toBe(
      '1.3.6.1.2.1.2.2.1.10.3',
    );
  });
});

describe('GetRequest', () => {
  it('matches the canonical v1 packet for sysDescr.0 (community "public", id 1)', () => {
    const pkt = encodeGetRequest({
      version: 0,
      community: 'public',
      requestId: 1,
      oids: [OIDS.sysDescr],
    });
    expect(hex(pkt)).toBe(
      '302602010004067075626c6963a019020101020100020100' +
        '300e300c06082b060102010101000500',
    );
  });
  it('uses version 1 for v2c', () => {
    const pkt = encodeGetRequest({
      version: 1,
      community: 'public',
      requestId: 7,
      oids: [OIDS.sysUpTime],
    });
    expect(pkt[4]).toBe(1);
  });
  it('uses long-form lengths when needed', () => {
    const pkt = encodeGetRequest({
      version: 1,
      community: 'x'.repeat(200),
      requestId: 1,
      oids: [OIDS.sysName],
    });
    expect(pkt[1]).toBe(0x81);
  });
});

describe('GetResponse', () => {
  it('decodes OctetString', () => {
    const r = decodeResponse(
      response({ value: tlv(0x04, new Uint8Array([0x73, 0x77, 0x31])) }),
    );
    expect(r.requestId).toBe(1);
    expect(r.varbinds[0]).toEqual({ oid: '1.3.6.1.2.1.1.5.0', value: 'sw1' });
  });
  it('decodes TimeTicks (uptime)', () => {
    const r = decodeResponse(
      response({ value: tlv(0x43, fromHex('01e240')) }, '2b06010201010300'),
    );
    expect(r.varbinds[0].value).toBe(123456);
  });
  it('decodes Counter32 above 2^31 without sign errors', () => {
    const r = decodeResponse(
      response({ value: tlv(0x41, fromHex('00ffffffff')) }, '2b060102010202010a03'),
    );
    expect(r.varbinds[0].value).toBe(4294967295);
  });
  it('flags noSuchName errors', () => {
    expect(() =>
      decodeResponse(
        response({ errStatus: 2, value: tlv(0x05, new Uint8Array(0)) }),
      ),
    ).toThrow(SnmpError);
  });
  it('rejects garbage and truncated input', () => {
    expect(() => decodeResponse(fromHex('3003020100'))).toThrow(SnmpError);
    expect(() => decodeResponse(new Uint8Array([]))).toThrow(SnmpError);
  });
  it('treats noSuchObject (v2c exception) as null', () => {
    const r = decodeResponse(
      response({ version: 1, value: tlv(0x80, new Uint8Array(0)) }),
    );
    expect(r.varbinds[0].value).toBeNull();
  });
});
