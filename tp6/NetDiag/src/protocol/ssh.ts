import SSHClient from 'react-native-ssh-sftp';
import { isAllowedCommand } from '../diagnostics/commands';
import { loadSshCredentials } from '../security/credentials';

/** Runs one allow-listed command; credentials are read from the Keystore at call time. */
export const runDiagnostic = async (host: string, command: string): Promise<string> => {
  if (!isAllowedCommand(command)) {
    throw new Error('Command not in the diagnostic allowlist');
  }
  const creds = await loadSshCredentials(host);
  if (!creds) {
    throw new Error('No stored credentials for this device');
  }
  return new Promise((resolve, reject) => {
    const client = new SSHClient(host, 22, creds.user, creds.password, (err: unknown) => {
      if (err) {
        return reject(new Error(String(err)));
      }
      client.execute(command, (e: unknown, out: unknown) => {
        client.disconnect();
        e ? reject(new Error(String(e))) : resolve(Array.isArray(out) ? out.join('\n') : String(out ?? ''));
      });
    });
  });
};
