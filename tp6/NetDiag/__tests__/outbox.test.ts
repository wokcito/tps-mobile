import {
  Outbox,
  MemoryOutboxStore,
  SyncTransport,
  backoffMs,
} from '../src/sync/outbox';

const mk = (transport: SyncTransport, now = () => 1000) =>
  new Outbox(new MemoryOutboxStore(), transport, { now, maxAttempts: 3 });

describe('Outbox', () => {
  it('enqueues pending actions without touching the network', async () => {
    const send = jest.fn();
    const ob = mk({ send });
    await ob.enqueue('report', { id: 'r1' });
    expect(send).not.toHaveBeenCalled();
    expect((await ob.list()).map(a => a.status)).toEqual(['pending']);
  });

  it('flush sends in FIFO order and removes acknowledged actions', async () => {
    const sent: string[] = [];
    const ob = mk({
      send: async a => {
        sent.push(a.payload.id as string);
        return { kind: 'ok' };
      },
    });
    await ob.enqueue('report', { id: 'a' });
    await ob.enqueue('report', { id: 'b' });
    await ob.flush();
    expect(sent).toEqual(['a', 'b']);
    expect(await ob.list()).toEqual([]);
  });

  it('keeps the action and schedules a retry on network failure, stopping the run', async () => {
    const send = jest.fn().mockRejectedValue(new Error('offline'));
    const ob = mk({ send });
    await ob.enqueue('report', { id: 'a' });
    await ob.enqueue('report', { id: 'b' });
    const res = await ob.flush();
    expect(send).toHaveBeenCalledTimes(1); // preserves ordering
    expect(res).toEqual({ sent: 0, failed: 1, conflicts: 0 });
    const [a] = await ob.list();
    expect(a.attempts).toBe(1);
    expect(a.nextAttemptAt).toBe(1000 + backoffMs(1));
  });

  it('skips actions whose nextAttemptAt is in the future', async () => {
    let t = 1000;
    const send = jest.fn().mockRejectedValueOnce(new Error('x')).mockResolvedValue({ kind: 'ok' });
    const ob = mk({ send }, () => t);
    await ob.enqueue('report', { id: 'a' });
    await ob.flush();
    await ob.flush(); // still backing off
    expect(send).toHaveBeenCalledTimes(1);
    t += backoffMs(1);
    await ob.flush();
    expect(send).toHaveBeenCalledTimes(2);
    expect(await ob.list()).toEqual([]);
  });

  it('marks an action failed after maxAttempts and stops retrying it', async () => {
    let t = 0;
    const send = jest.fn().mockRejectedValue(new Error('x'));
    const ob = mk({ send }, () => t);
    await ob.enqueue('report', { id: 'a' });
    for (let i = 0; i < 5; i++) {
      await ob.flush();
      t += 10 * 60 * 1000;
    }
    expect(send).toHaveBeenCalledTimes(3);
    expect((await ob.list())[0].status).toBe('failed');
  });

  it('server conflict (409) is recorded as conflict and does not block later actions', async () => {
    const ob = mk({
      send: async a =>
        a.payload.id === 'a' ? { kind: 'conflict', serverVersion: { v: 2 } } : { kind: 'ok' },
    });
    await ob.enqueue('report', { id: 'a' });
    await ob.enqueue('report', { id: 'b' });
    const res = await ob.flush();
    expect(res).toEqual({ sent: 1, failed: 0, conflicts: 1 });
    const left = await ob.list();
    expect(left).toHaveLength(1);
    expect(left[0]).toMatchObject({ status: 'conflict', serverVersion: { v: 2 } });
  });

  it('does not run two flushes concurrently', async () => {
    let release!: () => void;
    const gate = new Promise<void>(r => (release = r));
    const send = jest.fn(async () => {
      await gate;
      return { kind: 'ok' as const };
    });
    const ob = mk({ send });
    await ob.enqueue('report', { id: 'a' });
    const p1 = ob.flush();
    const p2 = ob.flush();
    release();
    await Promise.all([p1, p2]);
    expect(send).toHaveBeenCalledTimes(1);
  });
});

describe('backoffMs', () => {
  it('grows exponentially and is capped', () => {
    expect(backoffMs(1)).toBe(2000);
    expect(backoffMs(2)).toBe(4000);
    expect(backoffMs(20)).toBe(5 * 60 * 1000);
  });
});
