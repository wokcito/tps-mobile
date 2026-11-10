// Plain accessors instead of @field decorators: decorators + TS definite-assignment
// fields break under the RN Babel preset. Behavior is identical (raw getters/setters).
import { Model } from '@nozbe/watermelondb';

export class Device extends Model {
  static table = 'devices';
  get ip(): string {
    return this._getRaw('ip') as string;
  }
  set ip(v: string) {
    this._setRaw('ip', v ?? null);
  }
  get mac(): string | undefined {
    return this._getRaw('mac') as string | undefined;
  }
  set mac(v: string | undefined) {
    this._setRaw('mac', v ?? null);
  }
  get hostname(): string | undefined {
    return this._getRaw('hostname') as string | undefined;
  }
  set hostname(v: string | undefined) {
    this._setRaw('hostname', v ?? null);
  }
  get code(): string | undefined {
    return this._getRaw('code') as string | undefined;
  }
  set code(v: string | undefined) {
    this._setRaw('code', v ?? null);
  }
  get site(): string | undefined {
    return this._getRaw('site') as string | undefined;
  }
  set site(v: string | undefined) {
    this._setRaw('site', v ?? null);
  }
  get sheetJson(): string | undefined {
    return this._getRaw('sheet_json') as string | undefined;
  }
  set sheetJson(v: string | undefined) {
    this._setRaw('sheet_json', v ?? null);
  }
  get lastSeen(): number {
    return this._getRaw('last_seen') as number;
  }
  set lastSeen(v: number) {
    this._setRaw('last_seen', v ?? null);
  }
}
export class Diagnostic extends Model {
  static table = 'diagnostics';
  get deviceId(): string {
    return this._getRaw('device_id') as string;
  }
  set deviceId(v: string) {
    this._setRaw('device_id', v ?? null);
  }
  get site(): string | undefined {
    return this._getRaw('site') as string | undefined;
  }
  set site(v: string | undefined) {
    this._setRaw('site', v ?? null);
  }
  get kind(): string {
    return this._getRaw('kind') as string;
  }
  set kind(v: string) {
    this._setRaw('kind', v ?? null);
  }
  get summary(): string {
    return this._getRaw('summary') as string;
  }
  set summary(v: string) {
    this._setRaw('summary', v ?? null);
  }
  get resultJson(): string {
    return this._getRaw('result_json') as string;
  }
  set resultJson(v: string) {
    this._setRaw('result_json', v ?? null);
  }
  get createdAt(): number {
    return this._getRaw('created_at') as number;
  }
  set createdAt(v: number) {
    this._setRaw('created_at', v ?? null);
  }
}
export class Installation extends Model {
  static table = 'installations';
  get title(): string {
    return this._getRaw('title') as string;
  }
  set title(v: string) {
    this._setRaw('title', v ?? null);
  }
  get site(): string {
    return this._getRaw('site') as string;
  }
  set site(v: string) {
    this._setRaw('site', v ?? null);
  }
  get deviceId(): string | undefined {
    return this._getRaw('device_id') as string | undefined;
  }
  set deviceId(v: string | undefined) {
    this._setRaw('device_id', v ?? null);
  }
  get notes(): string {
    return this._getRaw('notes') as string;
  }
  set notes(v: string) {
    this._setRaw('notes', v ?? null);
  }
  get latitude(): number | undefined {
    return this._getRaw('latitude') as number | undefined;
  }
  set latitude(v: number | undefined) {
    this._setRaw('latitude', v ?? null);
  }
  get longitude(): number | undefined {
    return this._getRaw('longitude') as number | undefined;
  }
  set longitude(v: number | undefined) {
    this._setRaw('longitude', v ?? null);
  }
  get photosJson(): string {
    return this._getRaw('photos_json') as string;
  }
  set photosJson(v: string) {
    this._setRaw('photos_json', v ?? null);
  }
  get pdfPath(): string | undefined {
    return this._getRaw('pdf_path') as string | undefined;
  }
  set pdfPath(v: string | undefined) {
    this._setRaw('pdf_path', v ?? null);
  }
  get createdAt(): number {
    return this._getRaw('created_at') as number;
  }
  set createdAt(v: number) {
    this._setRaw('created_at', v ?? null);
  }
}
export class OutboxRow extends Model {
  static table = 'outbox';
  get type(): string {
    return this._getRaw('type') as string;
  }
  set type(v: string) {
    this._setRaw('type', v ?? null);
  }
  get payloadJson(): string {
    return this._getRaw('payload_json') as string;
  }
  set payloadJson(v: string) {
    this._setRaw('payload_json', v ?? null);
  }
  get createdAt(): number {
    return this._getRaw('created_at') as number;
  }
  set createdAt(v: number) {
    this._setRaw('created_at', v ?? null);
  }
  get attempts(): number {
    return this._getRaw('attempts') as number;
  }
  set attempts(v: number) {
    this._setRaw('attempts', v ?? null);
  }
  get nextAttemptAt(): number {
    return this._getRaw('next_attempt_at') as number;
  }
  set nextAttemptAt(v: number) {
    this._setRaw('next_attempt_at', v ?? null);
  }
  get status(): string {
    return this._getRaw('status') as string;
  }
  set status(v: string) {
    this._setRaw('status', v ?? null);
  }
  get serverVersionJson(): string | undefined {
    return this._getRaw('server_version_json') as string | undefined;
  }
  set serverVersionJson(v: string | undefined) {
    this._setRaw('server_version_json', v ?? null);
  }
}
