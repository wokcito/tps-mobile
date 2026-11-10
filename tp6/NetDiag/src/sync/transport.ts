import { BACKEND_URL } from '../config';
import { OutboxAction, SyncTransport } from './outbox';

export const httpTransport: SyncTransport = {
  async send(action: OutboxAction) {
    const res = await fetch(`${BACKEND_URL}/sync`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        id: action.id,
        type: action.type,
        payload: action.payload,
        baseVersion: action.payload.baseVersion,
      }),
    });
    if (res.status === 409) {
      const body = await res.json().catch(() => ({}));
      return { kind: 'conflict', serverVersion: body.serverVersion };
    }
    if (res.status >= 400 && res.status < 500) {
      // Permanent rejection: surface as conflict so it stops retrying and is visible.
      return { kind: 'conflict', serverVersion: { httpStatus: res.status } };
    }
    if (!res.ok) {
      throw new Error(`HTTP ${res.status}`); // 5xx: retry later
    }
    return { kind: 'ok' };
  },
};
