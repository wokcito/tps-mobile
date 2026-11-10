import NetInfo from '@react-native-community/netinfo';
import { Outbox } from './outbox';
import { watermelonOutboxStore } from '../storage/database';
import { httpTransport } from './transport';

export const outbox = new Outbox(watermelonOutboxStore, httpTransport);

/** Flush on startup and every time connectivity is regained. */
export const startAutoSync = (onResult?: (sent: number) => void): (() => void) => {
  let wasOnline = false;
  const trigger = async () => {
    const r = await outbox.flush();
    onResult?.(r.sent);
  };
  const unsub = NetInfo.addEventListener(s => {
    const online = !!s.isConnected && s.isInternetReachable !== false;
    if (online && !wasOnline) {
      trigger();
    }
    wasOnline = online;
  });
  const retry = setInterval(() => wasOnline && trigger(), 30000); // pick up backed-off retries
  return () => {
    unsub();
    clearInterval(retry);
  };
};
