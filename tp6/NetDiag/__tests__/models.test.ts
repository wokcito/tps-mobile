// Guards the decorator setup: if babel/tsconfig decorators regress, the app
// crashes at startup on device, so fail here instead.
import { Device, OutboxRow } from '../src/storage/models';
import { schema } from '../src/storage/schema';

describe('storage setup', () => {
  it('models compile with decorators and match schema tables', () => {
    const tables = schema.tables;
    expect(Object.keys(tables)).toEqual(
      expect.arrayContaining([Device.table, OutboxRow.table, 'diagnostics', 'installations']),
    );
  });
});
