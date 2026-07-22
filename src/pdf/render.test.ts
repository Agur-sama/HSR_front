import { describe, expect, it } from 'vitest';
import { createPz1PdfSections } from './render';

describe('pdf render', () => {
  it('creates Russian PZ1 report sections without placeholder text', () => {
    const sections = createPz1PdfSections({
      team: 'Бригада 7',
      lineTitle: 'Москва - Санкт-Петербург',
      variantTitle: 'Вариант 1',
      stationCount: 4,
      routePointCount: 7,
      totalLengthKm: 654.3,
      filledConsumerCells: 25,
      filledIndicatorCount: 13,
      createdAt: '2026-07-12T00:00:00.000Z',
    });

    const text = sections.flatMap((section) => [section.title, ...section.rows.flat()]).join('\n');

    expect(text).toContain('1. Исходные данные');
    expect(text).toContain('Команда');
    expect(text).toContain('Бригада 7');
    expect(text).toContain('Название линии');
    expect(text).toContain('Москва - Санкт-Петербург');
    expect(text).toContain('Технико-экономические показатели');
    expect(text).toContain('13');
    expect(text).not.toContain('PZ1 MVP report');
    expect(text).not.toContain('TODO');
  });
});
