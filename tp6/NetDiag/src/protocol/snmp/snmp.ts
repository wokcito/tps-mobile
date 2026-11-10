/**
 * Minimal SNMP v1/v2c codec (RFC 1157 / RFC 1905 subset).
 * Supports GetRequest and GetResponse only; no SNMPv3, no SET, no traps.
 * Pure TypeScript over Uint8Array so it runs in Hermes and in Jest alike.
 */

export class SnmpError extends Error {}

export const OIDS = {
  sysDescr: '1.3.6.1.2.1.1.1.0',
  sysUpTime: '1.3.6.1.2.1.1.3.0',
  sysName: '1.3.6.1.2.1.1.5.0',
  ifNumber: '1.3.6.1.2.1.2.1.0',
  ifInOctets: (i: number) => `1.3.6.1.2.1.2.2.1.10.${i}`,
  ifOutOctets: (i: number) => `1.3.6.1.2.1.2.2.1.16.${i}`,
} as const;

const TAG = {
  INTEGER: 0x02,
  OCTET_STRING: 0x04,
  NULL: 0x05,
  OID: 0x06,
  SEQUENCE: 0x30,
  COUNTER32: 0x41,
  GAUGE32: 0x42,
  TIMETICKS: 0x43,
  COUNTER64: 0x46,
  GET_REQUEST: 0xa0,
  GET_RESPONSE: 0xa2,
  NO_SUCH_OBJECT: 0x80,
  NO_SUCH_INSTANCE: 0x81,
  END_OF_MIB_VIEW: 0x82,
};

export type SnmpValue = string | number | null;
export interface VarBind {
  oid: string;
  value: SnmpValue;
}
export interface SnmpResponse {
  version: number;
  community: string;
  requestId: number;
  varbinds: VarBind[];
}

// ---------- encoding ----------

const concat = (parts: Uint8Array[]): Uint8Array => {
  const out = new Uint8Array(parts.reduce((n, p) => n + p.length, 0));
  let o = 0;
  for (const p of parts) {
    out.set(p, o);
    o += p.length;
  }
  return out;
};

const encodeLength = (n: number): Uint8Array => {
  if (n < 0x80) {
    return new Uint8Array([n]);
  }
  const bytes: number[] = [];
  for (let v = n; v > 0; v = Math.floor(v / 256)) {
    bytes.unshift(v & 0xff);
  }
  return new Uint8Array([0x80 | bytes.length, ...bytes]);
};

const tlv = (tag: number, content: Uint8Array): Uint8Array =>
  concat([new Uint8Array([tag]), encodeLength(content.length), content]);

const encodeInteger = (n: number): Uint8Array => {
  const bytes: number[] = [];
  let v = n;
  do {
    bytes.unshift(v & 0xff);
    v = Math.floor(v / 256);
  } while (v > 0 && bytes.length < 6);
  if (bytes[0] & 0x80) {
    bytes.unshift(0); // keep it positive
  }
  return tlv(TAG.INTEGER, new Uint8Array(bytes));
};

export const encodeOid = (oid: string): Uint8Array => {
  const arcs = oid.split('.').map(Number);
  if (arcs.length < 2 || arcs.some(a => !Number.isInteger(a) || a < 0)) {
    throw new SnmpError(`Invalid OID: ${oid}`);
  }
  const out: number[] = [arcs[0] * 40 + arcs[1]];
  for (const arc of arcs.slice(2)) {
    const chunk: number[] = [arc & 0x7f];
    for (let v = Math.floor(arc / 128); v > 0; v = Math.floor(v / 128)) {
      chunk.unshift((v & 0x7f) | 0x80);
    }
    out.push(...chunk);
  }
  return new Uint8Array(out);
};

export interface GetRequestOptions {
  /** 0 = SNMPv1, 1 = SNMPv2c */
  version: 0 | 1;
  community: string;
  requestId: number;
  oids: string[];
}

export const encodeGetRequest = (o: GetRequestOptions): Uint8Array => {
  const communityBytes = new Uint8Array(
    Array.from(o.community, c => c.charCodeAt(0) & 0xff),
  );
  const varbinds = o.oids.map(oid =>
    tlv(
      TAG.SEQUENCE,
      concat([tlv(TAG.OID, encodeOid(oid)), tlv(TAG.NULL, new Uint8Array(0))]),
    ),
  );
  const pdu = tlv(
    TAG.GET_REQUEST,
    concat([
      encodeInteger(o.requestId),
      encodeInteger(0), // error-status
      encodeInteger(0), // error-index
      tlv(TAG.SEQUENCE, concat(varbinds)),
    ]),
  );
  return tlv(
    TAG.SEQUENCE,
    concat([encodeInteger(o.version), tlv(TAG.OCTET_STRING, communityBytes), pdu]),
  );
};

// ---------- decoding ----------

interface Node {
  tag: number;
  content: Uint8Array;
  next: number;
}

const readTlv = (buf: Uint8Array, offset: number): Node => {
  if (offset + 2 > buf.length) {
    throw new SnmpError('Truncated TLV header');
  }
  const tag = buf[offset];
  let len = buf[offset + 1];
  let pos = offset + 2;
  if (len & 0x80) {
    const n = len & 0x7f;
    if (n === 0 || n > 4 || pos + n > buf.length) {
      throw new SnmpError('Bad length encoding');
    }
    len = 0;
    for (let i = 0; i < n; i++) {
      len = len * 256 + buf[pos++];
    }
  }
  if (pos + len > buf.length) {
    throw new SnmpError('Truncated TLV content');
  }
  return { tag, content: buf.subarray(pos, pos + len), next: pos + len };
};

const expect = (n: Node, tag: number, what: string): Node => {
  if (n.tag !== tag) {
    throw new SnmpError(`Expected ${what}, got tag 0x${n.tag.toString(16)}`);
  }
  return n;
};

const decodeUnsigned = (b: Uint8Array): number => {
  let v = 0;
  for (const x of b) {
    v = v * 256 + x;
  }
  return v;
};

const decodeSigned = (b: Uint8Array): number => {
  if (b.length === 0) {
    return 0;
  }
  const v = decodeUnsigned(b);
  return b[0] & 0x80 ? v - Math.pow(256, b.length) : v;
};

export const decodeOid = (b: Uint8Array): string => {
  if (b.length === 0) {
    throw new SnmpError('Empty OID');
  }
  const arcs: number[] = [Math.floor(b[0] / 40), b[0] % 40];
  let v = 0;
  for (let i = 1; i < b.length; i++) {
    v = v * 128 + (b[i] & 0x7f);
    if (!(b[i] & 0x80)) {
      arcs.push(v);
      v = 0;
    }
  }
  return arcs.join('.');
};

const decodeValue = (n: Node): SnmpValue => {
  switch (n.tag) {
    case TAG.INTEGER:
      return decodeSigned(n.content);
    case TAG.COUNTER32:
    case TAG.GAUGE32:
    case TAG.TIMETICKS:
    case TAG.COUNTER64:
      return decodeUnsigned(n.content);
    case TAG.OCTET_STRING:
      return String.fromCharCode(...n.content);
    case TAG.OID:
      return decodeOid(n.content);
    case TAG.NULL:
    case TAG.NO_SUCH_OBJECT:
    case TAG.NO_SUCH_INSTANCE:
    case TAG.END_OF_MIB_VIEW:
      return null;
    default:
      return null;
  }
};

const ERROR_NAMES = [
  'noError',
  'tooBig',
  'noSuchName',
  'badValue',
  'readOnly',
  'genErr',
];

export const decodeResponse = (buf: Uint8Array): SnmpResponse => {
  const msg = expect(readTlv(buf, 0), TAG.SEQUENCE, 'message SEQUENCE');
  const version = decodeSigned(
    expect(readTlv(msg.content, 0), TAG.INTEGER, 'version').content,
  );
  const comm = expect(
    readTlv(msg.content, readTlv(msg.content, 0).next),
    TAG.OCTET_STRING,
    'community',
  );
  const pdu = expect(readTlv(msg.content, comm.next), TAG.GET_RESPONSE, 'GetResponse');
  const reqId = expect(readTlv(pdu.content, 0), TAG.INTEGER, 'request-id');
  const errStatus = expect(readTlv(pdu.content, reqId.next), TAG.INTEGER, 'error-status');
  const errIndex = expect(readTlv(pdu.content, errStatus.next), TAG.INTEGER, 'error-index');
  const status = decodeSigned(errStatus.content);
  if (status !== 0) {
    throw new SnmpError(`SNMP error: ${ERROR_NAMES[status] ?? status}`);
  }
  const list = expect(readTlv(pdu.content, errIndex.next), TAG.SEQUENCE, 'varbind list');
  const varbinds: VarBind[] = [];
  for (let off = 0; off < list.content.length; ) {
    const vb = expect(readTlv(list.content, off), TAG.SEQUENCE, 'varbind');
    const oid = expect(readTlv(vb.content, 0), TAG.OID, 'varbind OID');
    const val = readTlv(vb.content, oid.next);
    varbinds.push({ oid: decodeOid(oid.content), value: decodeValue(val) });
    off = vb.next;
  }
  return {
    version,
    community: String.fromCharCode(...comm.content),
    requestId: decodeSigned(reqId.content),
    varbinds,
  };
};
