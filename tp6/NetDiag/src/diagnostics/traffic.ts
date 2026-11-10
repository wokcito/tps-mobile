const WRAP = 4294967296; // Counter32

/** Bytes per second between two Counter32 samples, tolerating a single wrap. */
export const trafficRate = (
  before: number,
  after: number,
  elapsedMs: number,
): number | null => {
  if (elapsedMs <= 0) {
    return null;
  }
  const delta = after >= before ? after - before : after + WRAP - before;
  return Math.round((delta * 1000) / elapsedMs);
};
