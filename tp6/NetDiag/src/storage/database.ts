import { Database, Q } from '@nozbe/watermelondb';
import SQLiteAdapter from '@nozbe/watermelondb/adapters/sqlite';
import { schema } from './schema';
import { Device, Diagnostic, Installation, OutboxRow } from './models';
import { OutboxAction, OutboxStore } from '../sync/outbox';

export const database = new Database({
  adapter: new SQLiteAdapter({ schema, jsi: true }),
  modelClasses: [Device, Diagnostic, Installation, OutboxRow],
});

export const devices = () => database.get<Device>('devices');
export const diagnostics = () => database.get<Diagnostic>('diagnostics');
export const installations = () => database.get<Installation>('installations');
const outboxTable = () => database.get<OutboxRow>('outbox');

export const upsertDevice = async (d: { ip: string; mac?: string; hostname?: string }) => {
  await database.write(async () => {
    const [existing] = await devices().query(Q.where('ip', d.ip)).fetch();
    if (existing) {
      await existing.update(r => {
        r.hostname = d.hostname ?? r.hostname;
        r.mac = d.mac ?? r.mac;
        r.lastSeen = Date.now();
      });
    } else {
      await devices().create(r => {
        r.ip = d.ip;
        r.mac = d.mac;
        r.hostname = d.hostname;
        r.lastSeen = Date.now();
      });
    }
  });
};

export const saveDiagnostic = (
  deviceId: string,
  site: string | undefined,
  kind: 'snmp' | 'ssh',
  summary: string,
  result: unknown,
) =>
  database.write(() =>
    diagnostics().create(r => {
      r.deviceId = deviceId;
      r.site = site;
      r.kind = kind;
      r.summary = summary;
      r.resultJson = JSON.stringify(result);
      r.createdAt = Date.now();
    }),
  );

const toAction = (r: OutboxRow): OutboxAction => ({
  id: r.id,
  type: r.type,
  payload: JSON.parse(r.payloadJson),
  createdAt: r.createdAt,
  attempts: r.attempts,
  nextAttemptAt: r.nextAttemptAt,
  status: r.status as OutboxAction['status'],
  serverVersion: r.serverVersionJson ? JSON.parse(r.serverVersionJson) : undefined,
});

const fill = (r: OutboxRow, a: OutboxAction) => {
  r.type = a.type;
  r.payloadJson = JSON.stringify(a.payload);
  r.createdAt = a.createdAt;
  r.attempts = a.attempts;
  r.nextAttemptAt = a.nextAttemptAt;
  r.status = a.status;
  r.serverVersionJson = a.serverVersion === undefined ? undefined : JSON.stringify(a.serverVersion);
};

/** Persistent outbox: survives app restarts, which is the point of the pattern. */
export const watermelonOutboxStore: OutboxStore = {
  add: a =>
    database.write(async () => {
      await outboxTable().create(r => {
        r._raw.id = a.id; // keep the outbox-generated id so update/remove can find it
        fill(r, a);
      });
    }),
  update: a =>
    database.write(async () => {
      const row = await outboxTable().find(a.id);
      await row.update(r => fill(r, a));
    }),
  remove: id =>
    database.write(async () => {
      const row = await outboxTable().find(id);
      await row.destroyPermanently();
    }),
  all: async () =>
    (await outboxTable().query(Q.sortBy('created_at', Q.asc)).fetch()).map(toAction),
};
