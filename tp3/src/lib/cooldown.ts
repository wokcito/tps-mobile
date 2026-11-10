import { COOLDOWN_SECONDS } from './authErrors';

/** Cooldowns en memoria por clave (p. ej. `recover:email@x.com`). */
const until = new Map<string, number>();

export function startCooldown(key: string, seconds = COOLDOWN_SECONDS, now = Date.now()): void {
  until.set(key, now + seconds * 1000);
}

export function cooldownRemaining(key: string, now = Date.now()): number {
  const end = until.get(key);
  if (!end) return 0;
  const left = Math.ceil((end - now) / 1000);
  if (left <= 0) {
    until.delete(key);
    return 0;
  }
  return left;
}

export function clearCooldowns(): void {
  until.clear();
}
