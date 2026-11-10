/**
 * Outbox pattern: every outward action is first persisted locally, then
 * delivered in FIFO order whenever connectivity allows. Storage and transport
 * are injected so the engine is testable without a device.
 */

export type ActionStatus = 'pending' | 'failed' | 'conflict';

export interface OutboxAction {
  id: string;
  type: string;
  payload: Record<string, unknown>;
  createdAt: number;
  attempts: number;
  nextAttemptAt: number;
  status: ActionStatus;
  serverVersion?: unknown;
}

export type SendResult =
  | { kind: 'ok' }
  | { kind: 'conflict'; serverVersion?: unknown };

export interface SyncTransport {
  /** Resolve for ack/conflict; reject on network or 5xx failure (retryable). */
  send(action: OutboxAction): Promise<SendResult>;
}

export interface OutboxStore {
  add(a: OutboxAction): Promise<void>;
  update(a: OutboxAction): Promise<void>;
  remove(id: string): Promise<void>;
  all(): Promise<OutboxAction[]>; // ordered by createdAt asc
}

export class MemoryOutboxStore implements OutboxStore {
  private items: OutboxAction[] = [];
  async add(a: OutboxAction) {
    this.items.push({ ...a });
  }
  async update(a: OutboxAction) {
    this.items = this.items.map(i => (i.id === a.id ? { ...a } : i));
  }
  async remove(id: string) {
    this.items = this.items.filter(i => i.id !== id);
  }
  async all() {
    return this.items.map(i => ({ ...i }));
  }
}

export const backoffMs = (attempt: number): number =>
  Math.min(2000 * Math.pow(2, attempt - 1), 5 * 60 * 1000);

export interface FlushResult {
  sent: number;
  failed: number;
  conflicts: number;
}

interface Options {
  now?: () => number;
  maxAttempts?: number;
}

let seq = 0;

export class Outbox {
  private flushing: Promise<FlushResult> | null = null;
  private now: () => number;
  private maxAttempts: number;

  constructor(
    private store: OutboxStore,
    private transport: SyncTransport,
    opts: Options = {},
  ) {
    this.now = opts.now ?? Date.now;
    this.maxAttempts = opts.maxAttempts ?? 8;
  }

  async enqueue(type: string, payload: Record<string, unknown>): Promise<OutboxAction> {
    const t = this.now();
    const action: OutboxAction = {
      id: `${t}-${++seq}-${Math.random().toString(36).slice(2, 8)}`,
      type,
      payload,
      createdAt: t,
      attempts: 0,
      nextAttemptAt: t,
      status: 'pending',
    };
    await this.store.add(action);
    return action;
  }

  list(): Promise<OutboxAction[]> {
    return this.store.all();
  }

  /** Concurrent callers share the in-flight run. */
  flush(): Promise<FlushResult> {
    if (!this.flushing) {
      this.flushing = this.run().finally(() => {
        this.flushing = null;
      });
    }
    return this.flushing;
  }

  private async run(): Promise<FlushResult> {
    const res: FlushResult = { sent: 0, failed: 0, conflicts: 0 };
    const queue = (await this.store.all()).filter(a => a.status === 'pending');
    for (const action of queue) {
      if (action.nextAttemptAt > this.now()) {
        break; // preserve FIFO: do not overtake a backing-off action
      }
      try {
        const r = await this.transport.send(action);
        if (r.kind === 'ok') {
          await this.store.remove(action.id);
          res.sent++;
        } else {
          await this.store.update({
            ...action,
            status: 'conflict',
            serverVersion: r.serverVersion,
          });
          res.conflicts++;
        }
      } catch {
        const attempts = action.attempts + 1;
        const exhausted = attempts >= this.maxAttempts;
        await this.store.update({
          ...action,
          attempts,
          status: exhausted ? 'failed' : 'pending',
          nextAttemptAt: this.now() + backoffMs(attempts),
        });
        res.failed++;
        break; // likely offline: stop and wait for the next trigger
      }
    }
    return res;
  }
}
