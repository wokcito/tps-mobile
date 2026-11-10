import * as Keychain from 'react-native-keychain';

// Device passwords live only in the OS Keystore/Keychain, one entry per host.
// They are never written to WatermelonDB, the outbox, logs or reports.
const service = (host: string) => `netdiag.ssh.${host}`;

export const saveSshCredentials = (host: string, user: string, password: string) =>
  Keychain.setGenericPassword(user, password, {
    service: service(host),
    accessible: Keychain.ACCESSIBLE.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
  });

export const loadSshCredentials = async (host: string) => {
  const c = await Keychain.getGenericPassword({ service: service(host) });
  return c ? { user: c.username, password: c.password } : null;
};

export const deleteSshCredentials = (host: string) =>
  Keychain.resetGenericPassword({ service: service(host) });
