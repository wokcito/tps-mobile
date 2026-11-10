// Minimal sync backend (stub). In-memory storage, zero dependencies.
//   POST /sync          body: { id, type, payload, baseVersion? } -> 200 ack | 409 conflict | 400
//   GET  /devices/:code technical sheet for a scanned QR/barcode
//   GET  /sync/log      everything received (debug / demo)
const http = require('http');

const SHEETS = {
  'ONT-0001': { code: 'ONT-0001', vendor: 'Huawei', model: 'HG8245H', notes: 'ONT GPON, 4 LAN + 2 POTS' },
  'RTR-0042': { code: 'RTR-0042', vendor: 'MikroTik', model: 'hAP ac2', notes: 'Router de borde' },
};

function createServer() {
  const received = new Map(); // action id -> action (idempotency)
  const versions = new Map(); // entity id -> version

  const send = (res, status, body) => {
    res.writeHead(status, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(body));
  };

  const server = http.createServer((req, res) => {
    const url = new URL(req.url, 'http://x');
    if (req.method === 'GET' && url.pathname === '/sync/log') {
      return send(res, 200, [...received.values()]);
    }
    if (req.method === 'GET' && url.pathname.startsWith('/devices/')) {
      const sheet = SHEETS[decodeURIComponent(url.pathname.slice(9))];
      return sheet ? send(res, 200, sheet) : send(res, 404, { error: 'unknown device' });
    }
    if (req.method === 'POST' && url.pathname === '/sync') {
      let raw = '';
      req.on('data', c => (raw += c));
      req.on('end', () => {
        let a;
        try {
          a = JSON.parse(raw);
        } catch {
          return send(res, 400, { error: 'invalid json' });
        }
        if (!a || typeof a.id !== 'string' || typeof a.type !== 'string' || typeof a.payload !== 'object' || a.payload === null) {
          return send(res, 400, { error: 'id, type and payload are required' });
        }
        if (received.has(a.id)) {
          return send(res, 200, { status: 'duplicate' }); // idempotent retry
        }
        const entity = a.payload.id;
        const current = versions.get(entity) || 0;
        if (entity && a.baseVersion !== undefined && a.baseVersion < current) {
          return send(res, 409, { status: 'conflict', serverVersion: current });
        }
        if (entity) versions.set(entity, current + 1);
        received.set(a.id, { ...a, receivedAt: Date.now() });
        send(res, 200, { status: 'ok', version: entity ? current + 1 : undefined });
      });
      return;
    }
    send(res, 404, { error: 'not found' });
  });
  return server;
}

module.exports = { createServer };

if (require.main === module) {
  const port = process.env.PORT || 3000;
  createServer().listen(port, '0.0.0.0', () => console.log(`netdiag backend on :${port}`));
}
