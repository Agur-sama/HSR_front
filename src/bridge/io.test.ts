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

    expect(bridge.schemaVersion).toBe('1.2');
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

  // Файл из ПЗ1, сохранённый до появления ПЗ2, должен открываться как раньше
  // (ТЗ ПЗ2 §10): версия поднялась, но ломающих изменений в ней нет.
  it('keeps backward compatibility with schema version 1.1', () => {
    const bridge = {
      schemaVersion: '1.1',
      passport: { team: 'Группа 1', lineTitle: 'Тестовая линия', createdAt: '2026-07-10T00:00:00.000Z' },
      completed: { pz1: { totalLengthKm: 512.85 } },
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
    ).toThrow('schemaVersion 1.0/1.1/1.2');
  });
});
