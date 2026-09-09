import { describe, expect, it } from 'vitest';
import { computePreviewCrop } from './mapPreview';

/**
 * Кадр снимка карты для отчёта. Проверяем именно геометрию: сама отрисовка
 * требует браузерной канвы, а промахи кадра — это как раз то, из-за чего в
 * отчёте оказывалась пустая карта или срезанные метки.
 */
describe('кадр снимка карты', () => {
  const frame = { width: 1000, height: 400 };

  it('без точек берётся весь кадр, вписанный в допустимые пропорции', () => {
    const crop = computePreviewCrop([], frame, 1);

    // Карта шире допустимого (2,5 против 2), но выправлять пропорции нечем:
    // расти можно только внутрь кадра, а кадр уже взят целиком.
    expect(crop.width).toBe(1000);
    expect(crop.height).toBe(400);
  });

  it('кадр обрезается по нарисованному, а не по всей карте', () => {
    const crop = computePreviewCrop(
      [
        { x: 400, y: 150 },
        { x: 600, y: 250 },
      ],
      frame,
      1,
    );

    expect(crop.width).toBeLessThan(frame.width);
    expect(crop.x).toBeGreaterThan(0);
    // Точки остаются внутри кадра вместе с полями.
    expect(crop.x).toBeLessThanOrEqual(400);
    expect(crop.x + crop.width).toBeGreaterThanOrEqual(600);
    expect(crop.y).toBeLessThanOrEqual(150);
    expect(crop.y + crop.height).toBeGreaterThanOrEqual(250);
  });

  it('узкий кадр расширяется вбок, а не подрезается сверху', () => {
    const crop = computePreviewCrop(
      [
        { x: 500, y: 60 },
        { x: 520, y: 340 },
      ],
      frame,
      1,
    );

    expect(crop.width / crop.height).toBeGreaterThanOrEqual(1.4 - 1e-9);
    expect(crop.y).toBeLessThanOrEqual(60);
    expect(crop.y + crop.height).toBeGreaterThanOrEqual(340);
  });

  it('кадр не выходит за пределы карты', () => {
    const crop = computePreviewCrop(
      [
        { x: 5, y: 5 },
        { x: 995, y: 395 },
      ],
      frame,
      1,
    );

    expect(crop.x).toBeGreaterThanOrEqual(0);
    expect(crop.y).toBeGreaterThanOrEqual(0);
    expect(crop.x + crop.width).toBeLessThanOrEqual(frame.width);
    expect(crop.y + crop.height).toBeLessThanOrEqual(frame.height);
  });

  it('на экране с двойной плотностью кадр считается в пикселях канвы', () => {
    const single = computePreviewCrop([{ x: 100, y: 100 }, { x: 300, y: 200 }], { width: 800, height: 400 }, 1);
    const double = computePreviewCrop([{ x: 100, y: 100 }, { x: 300, y: 200 }], { width: 1600, height: 800 }, 2);

    expect(double.x).toBeCloseTo(single.x * 2, 6);
    expect(double.width).toBeCloseTo(single.width * 2, 6);
  });

  it('испорченные координаты не превращают кадр в ничто', () => {
    const crop = computePreviewCrop([{ x: Number.NaN, y: Number.NaN }], frame, 1);

    expect(crop.width).toBe(frame.width);
    expect(crop.height).toBe(frame.height);
  });

  it('точки, ушедшие за край карты, кадр за её пределы не тянут', () => {
    const crop = computePreviewCrop([{ x: -500, y: -200 }, { x: 600, y: 300 }], frame, 1);

    expect(crop.x).toBe(0);
    expect(crop.y).toBe(0);
    expect(crop.x + crop.width).toBeLessThanOrEqual(frame.width);
  });
});
