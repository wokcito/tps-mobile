import { appSchema, tableSchema } from '@nozbe/watermelondb';

export const schema = appSchema({
  version: 1,
  tables: [
    tableSchema({
      name: 'devices',
      columns: [
        { name: 'ip', type: 'string', isIndexed: true },
        { name: 'mac', type: 'string', isOptional: true },
        { name: 'hostname', type: 'string', isOptional: true },
        { name: 'code', type: 'string', isOptional: true, isIndexed: true }, // QR / barcode
        { name: 'site', type: 'string', isOptional: true, isIndexed: true },
        { name: 'sheet_json', type: 'string', isOptional: true }, // cached technical sheet
        { name: 'last_seen', type: 'number' },
      ],
    }),
    tableSchema({
      name: 'diagnostics',
      columns: [
        { name: 'device_id', type: 'string', isIndexed: true },
        { name: 'site', type: 'string', isOptional: true, isIndexed: true },
        { name: 'kind', type: 'string' }, // snmp | ssh
        { name: 'summary', type: 'string' },
        { name: 'result_json', type: 'string' },
        { name: 'created_at', type: 'number', isIndexed: true },
      ],
    }),
    tableSchema({
      name: 'installations',
      columns: [
        { name: 'title', type: 'string' },
        { name: 'site', type: 'string' },
        { name: 'device_id', type: 'string', isOptional: true },
        { name: 'notes', type: 'string' },
        { name: 'latitude', type: 'number', isOptional: true },
        { name: 'longitude', type: 'number', isOptional: true },
        { name: 'photos_json', type: 'string' },
        { name: 'pdf_path', type: 'string', isOptional: true },
        { name: 'created_at', type: 'number', isIndexed: true },
      ],
    }),
    tableSchema({
      name: 'outbox',
      columns: [
        { name: 'type', type: 'string' },
        { name: 'payload_json', type: 'string' },
        { name: 'created_at', type: 'number', isIndexed: true },
        { name: 'attempts', type: 'number' },
        { name: 'next_attempt_at', type: 'number' },
        { name: 'status', type: 'string' },
        { name: 'server_version_json', type: 'string', isOptional: true },
      ],
    }),
  ],
});
