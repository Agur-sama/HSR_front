import { describe, expect, it } from 'vitest';
import { createPdfBytes, createPz1PdfLines } from './render';

describe('pdf render', () => {
  it('creates Russian PZ1 report lines without placeholder text', () => {
    const lines = createPz1PdfLines({
      team: 'Бригада 7',
      lineTitle: 'Москва - Санкт-Петербург',
      variantTitle: 'Вариант 1',
      stationCount: 4,
      filledConsumerCells: 25,
      filledIndicatorCount: 13,
      createdAt: '2026-07-12T00:00:00.000Z',
    });

    const text = lines.map((line) => line.text).join('\n');

    expect(text).toContain('ПЗ1. Технико-экономическое обоснование');
    expect(text).toContain('Команда: Бригада 7');
    expect(text).toContain('Линия: Москва - Санкт-Петербург');
    expect(text).toContain('Итоговые показатели: 13');
    expect(text).not.toContain('PZ1 MVP report');
    expect(text).not.toContain('TODO');
  });

  it('wraps a JPEG page into a valid PDF container', () => {
    const bytes = createPdfBytes({
      data: new Uint8Array([0xff, 0xd8, 0xff, 0xd9]),
      width: 2,
      height: 2,
    });
    const header = new TextDecoder().decode(new Uint8Array(bytes.slice(0, 8)));
    const body = new TextDecoder().decode(new Uint8Array(bytes));

    expect(header).toBe('%PDF-1.4');
    expect(body).toContain('/Subtype /Image');
    expect(body).toContain('xref');
    expect(body).toContain('%%EOF');
  });
});
