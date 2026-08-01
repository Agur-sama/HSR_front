import { describe, expect, it } from 'vitest';
import { createBridge, parseBridgeJson, serializeBridge } from './io';

describe('bridge io', () => {
  it('parses a bridge with supported schema version', () => {
    const bridge = createBridge({
      team: 'Группа 1',
      lineTitle: 'Тестовая линия',
      defaultVariant: 1,
      createdAt: '2026-07-10T00:00:00.000Z',
    });

    expect(bridge.schemaVersion).toBe('1.1');
    expect(parseBridgeJson(serializeBridge(bridge))).toEqual(bridge);
  });

  it('keeps backward compatibility with schema version 1.0', () => {
    const bridge = {
      schemaVersion: '1.0',
      passport: { team: 'Группа 1', lineTitle: 'Тестовая линия', createdAt: '2026-07-10T00:00:00.000Z' },
      completed: {},
    };

    expect(parseBridgeJson(JSON.stringify(bridge))).toEqual(bridge);
  });

  it('rejects broken JSON', () => {
    expect(() => parseBridgeJson('{')).toThrow('JSON-файл поврежден');
  });

  it('rejects another schema version', () => {
    expect(() =>
      parseBridgeJson(
        JSON.stringify({
          schemaVersion: '2.0',
          passport: { team: 'A', lineTitle: 'B', createdAt: '2026-07-10T00:00:00.000Z' },
          completed: {},
        }),
      ),
    ).toThrow('schemaVersion 1.0/1.1');
  });
});
