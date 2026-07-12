import type { BridgeSchema, Passport } from './schema';

const SUPPORTED_SCHEMA_VERSION = '1.0';

export function createBridge(passport: Passport, completed: BridgeSchema['completed'] = {}): BridgeSchema {
  return {
    schemaVersion: SUPPORTED_SCHEMA_VERSION,
    passport,
    completed,
  };
}

export function serializeBridge(bridge: BridgeSchema): string {
  return `${JSON.stringify(bridge, null, 2)}\n`;
}

export function parseBridgeJson(input: string): BridgeSchema {
  let parsed: unknown;

  try {
    parsed = JSON.parse(input);
  } catch {
    throw new Error('JSON-файл поврежден или имеет неверный формат.');
  }

  if (!isBridgeSchema(parsed)) {
    throw new Error('Файл моста не соответствует schemaVersion 1.0.');
  }

  return parsed;
}

export function downloadBridgeJson(bridge: BridgeSchema, fileName = 'vsm-bridge.json'): void {
  downloadTextFile(fileName, 'application/json;charset=utf-8', serializeBridge(bridge));
}

export function downloadTextFile(fileName: string, mimeType: string, content: string | ArrayBuffer): void {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  document.body.append(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

function isBridgeSchema(value: unknown): value is BridgeSchema {
  if (!isRecord(value)) {
    return false;
  }

  return value.schemaVersion === SUPPORTED_SCHEMA_VERSION && isPassport(value.passport) && isRecord(value.completed);
}

function isPassport(value: unknown): value is Passport {
  if (!isRecord(value)) {
    return false;
  }

  const defaultVariantIsValid = value.defaultVariant === undefined || typeof value.defaultVariant === 'number';

  return (
    typeof value.team === 'string' &&
    typeof value.lineTitle === 'string' &&
    typeof value.createdAt === 'string' &&
    defaultVariantIsValid
  );
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
