import { describe, expect, it } from 'vitest';
import { createPz2PdfBlob } from './pz2Report';
import type { Pz2PdfSummary } from './pz2Report';
import type { Pz2Result } from '../bridge/schema';

const result: Pz2Result = {
  works: [
    {
      id: 'w1',
      kind: 'earthworks',
      lengthKm: 120.5,
      count: null,
      stageId: 's1',
      conditions: ['weakSoil'],
      span: { fromKm: 0, toKm: 120.5 },
    },
    { id: 'w2', kind: 'turnout', lengthKm: null, count: 4, stageId: null, conditions: [] },
  ],
  stages: [{ id: 's1', title: 'Северный участок', order: 0 }],
  criticalPath: [],
  plan: {
    totalWorkers: 90,
    workersByStage: { s1: 90 },
    durationDays: 412,
    peakWorkers: 90,
    overloadDays: 0,
  },
  report: {
    laborHours: 254_000,
    machineHours: 41_000,
    materials: [{ title: 'Грунт карьерный', unit: 'м³', amount: 5_061_000 }],
    machines: [{ title: 'Экскаватор', unit: 'маш.-ч', amount: 25_305 }],
    normsAreDraft: true,
  },
  routeLengthKm: 125,
  measuredLengthKm: 120.5,
};

const summary: Pz2PdfSummary = {
  team: 'Юнит-3',
  lineTitle: 'ТЭД-21',
  createdAt: '2026-09-09T10:00:00.000Z',
  runId: 'run-1',
  routeLengthKm: 125,
  result,
  workKindLabels: { earthworks: 'Линия на земляном полотне', turnout: 'Стрелочный перевод 1/25' },
  conditionLabels: { weakSoil: 'Слабые грунты', rocky: 'Скальные породы' },
};

describe('отчёт ПЗ2 в PDF', () => {
  it('собирается в непустой PDF-файл', async () => {
    const blob = await createPz2PdfBlob(summary);
    const head = new TextDecoder().decode((await blob.arrayBuffer()).slice(0, 5));

    expect(blob.size).toBeGreaterThan(10_000);
    expect(head).toBe('%PDF-');
  }, 30_000);

  it('собирается и на пустой работе — студент мог не дойти до конца', async () => {
    const empty: Pz2PdfSummary = {
      ...summary,
      result: {
        ...result,
        works: [],
        stages: [],
        plan: { totalWorkers: 0, workersByStage: {}, durationDays: 0, peakWorkers: 0, overloadDays: 0 },
        report: { laborHours: 0, machineHours: 0, materials: [], machines: [], normsAreDraft: true },
        measuredLengthKm: 0,
      },
    };

    await expect(createPz2PdfBlob(empty)).resolves.toBeInstanceOf(Blob);
  }, 30_000);
});
