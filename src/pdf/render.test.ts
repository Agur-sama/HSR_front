import { describe, expect, it } from 'vitest';
import { createPz1PdfBlob, createPz1PdfSections } from './render';

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
    expect(text).toContain('Учебная группа');
    expect(text).toContain('Москва - Санкт-Петербург');
    expect(text).toContain('Технико-экономические показатели');
    expect(text).toContain('13');
    expect(text).not.toContain('PZ1 MVP report');
    expect(text).not.toContain('TODO');
  });

  it('renders a full Russian PZ1 PDF blob with route and table data', async () => {
    const blob = await createPz1PdfBlob({
      team: 'Бригада 7',
      lineTitle: 'Москва - Санкт-Петербург',
      variantTitle: 'Вариант 1',
      stationCount: 2,
      routePointCount: 2,
      totalLengthKm: 654.3,
      filledConsumerCells: 4,
      filledIndicatorCount: 2,
      createdAt: '2026-07-12T00:00:00.000Z',
      consumerProperties: {
        'А-Г': {
          pairKey: 'А-Г',
          activeModes: ['hSR'],
          values: {
            travelTime: { hSR: '3,5' },
            discomfort: { hSR: '0' },
            dailyFrequency: { hSR: '12' },
            fare: { hSR: '3200' },
          },
        },
      },
      finalIndicators: {
        annualFlow: '1200000',
      },
      routeLine: {
        vertices: [
          { id: 'route-point-1', lon: 37.6173, lat: 55.7558 },
          { id: 'route-point-2', lon: 30.3351, lat: 59.9343 },
        ],
        segments: [{ id: 'route-point-1-route-point-2', fromVertexId: 'route-point-1', toVertexId: 'route-point-2', sagittaKm: 0 }],
      },
      stations: [
        { label: 'А', name: 'Москва', lat: 55.7558, lng: 37.6173, type: 'terminal' },
        { label: 'Г', name: 'Санкт-Петербург', lat: 59.9343, lng: 30.3351, type: 'terminal' },
      ],
    });

    expect(blob.type).toBe('application/pdf');
    expect(blob.size).toBeGreaterThan(10_000);
  });
});
