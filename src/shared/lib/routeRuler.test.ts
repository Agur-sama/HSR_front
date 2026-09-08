import { describe, expect, it } from 'vitest';
import {
  createRouteRuler,
  createRouteRulerFromSegments,
  measureRouteSpanKm,
  pointAtDistance,
  projectOntoRoute,
} from './routeRuler';

/** Ломаная по экватору: два колена по 1° долготы, ≈111,19 км каждое. */
const equatorLine = [
  { lat: 0, lon: 0 },
  { lat: 0, lon: 1 },
  { lat: 0, lon: 2 },
];

describe('createRouteRuler', () => {
  it('накапливает расстояние по вершинам', () => {
    const ruler = createRouteRuler(equatorLine);

    expect(ruler.cumulativeKm[0]).toBe(0);
    expect(ruler.cumulativeKm[1]).toBeCloseTo(111.19, 1);
    expect(ruler.totalKm).toBeCloseTo(222.39, 1);
  });

  it('отбрасывает мусорные координаты, а не превращает их в нули', () => {
    const ruler = createRouteRuler([
      { lat: 0, lon: 0 },
      { lat: Number.NaN, lon: 1 },
      { lat: 0, lon: 1 },
    ]);

    expect(ruler.points).toHaveLength(2);
    expect(ruler.totalKm).toBeCloseTo(111.19, 1);
  });

  it('пустая и одиночная линия не ломают линейку', () => {
    expect(createRouteRuler([]).totalKm).toBe(0);
    expect(createRouteRuler([{ lat: 10, lon: 20 }]).totalKm).toBe(0);
  });
});

describe('projectOntoRoute', () => {
  it('притягивает клик сбоку от линии к ближайшей точке на ней', () => {
    const ruler = createRouteRuler(equatorLine);

    // Клик в стороне от линии, напротив её середины.
    const position = projectOntoRoute(ruler, { lat: 0.2, lon: 0.5 });

    expect(position).not.toBeNull();
    expect(position?.point.lat).toBeCloseTo(0, 6);
    expect(position?.point.lon).toBeCloseTo(0.5, 6);
    expect(position?.distanceKm).toBeCloseTo(55.6, 1);
  });

  it('клик за концом линии садится на конец, а не улетает по касательной', () => {
    const ruler = createRouteRuler(equatorLine);

    const position = projectOntoRoute(ruler, { lat: 0, lon: 5 });

    expect(position?.point.lon).toBeCloseTo(2, 6);
    expect(position?.distanceKm).toBeCloseTo(ruler.totalKm, 3);
  });

  it('выбирает ближайшее колено, а не первое подходящее', () => {
    const ruler = createRouteRuler(equatorLine);

    const position = projectOntoRoute(ruler, { lat: 0.01, lon: 1.8 });

    expect(position?.distanceKm).toBeGreaterThan(ruler.cumulativeKm[1]);
  });

  it('без линии мерить нечего', () => {
    expect(projectOntoRoute(createRouteRuler([]), { lat: 0, lon: 0 })).toBeNull();
  });
});

describe('pointAtDistance', () => {
  it('возвращает точку на заданном километре', () => {
    const ruler = createRouteRuler(equatorLine);
    const point = pointAtDistance(ruler, ruler.totalKm / 2);

    expect(point?.lon).toBeCloseTo(1, 4);
  });

  it('за пределами линии прижимается к её концам', () => {
    const ruler = createRouteRuler(equatorLine);

    expect(pointAtDistance(ruler, -50)?.lon).toBeCloseTo(0, 6);
    expect(pointAtDistance(ruler, 10_000)?.lon).toBeCloseTo(2, 6);
  });
});

describe('measureRouteSpanKm', () => {
  it('длина участка не зависит от порядка отметок', () => {
    const ruler = createRouteRuler(equatorLine);
    const start = projectOntoRoute(ruler, { lat: 0, lon: 0.5 });
    const end = projectOntoRoute(ruler, { lat: 0, lon: 1.5 });

    expect(start && end && measureRouteSpanKm(start, end)).toBeCloseTo(111.19, 1);
    expect(end && start && measureRouteSpanKm(end, start)).toBeCloseTo(111.19, 1);
  });

  it('сумма участков подряд равна длине трассы — на этом держится проверка длины', () => {
    const ruler = createRouteRuler(equatorLine);
    const marks = [0, 0.4, 1.3, 2].map((lon) => projectOntoRoute(ruler, { lat: 0, lon }));
    const total = marks
      .slice(1)
      .reduce((sum, mark, index) => sum + (mark && marks[index] ? measureRouteSpanKm(marks[index]!, mark) : 0), 0);

    expect(total).toBeCloseTo(ruler.totalKm, 6);
  });
});

describe('удалённость клика от трассы', () => {
  it('клик по самой линии даёт нулевое отклонение', () => {
    const ruler = createRouteRuler(equatorLine);

    expect(projectOntoRoute(ruler, { lat: 0, lon: 0.5 })?.offsetKm).toBeCloseTo(0, 6);
  });

  it('клик в стороне возвращает расстояние до трассы, а не молча притягивается', () => {
    const ruler = createRouteRuler(equatorLine);
    const position = projectOntoRoute(ruler, { lat: 1, lon: 0.5 });

    // Градус широты — примерно 111 км в любой точке земного шара.
    expect(position?.offsetKm).toBeCloseTo(111.19, 1);
    expect(position?.point.lat).toBeCloseTo(0, 6);
  });
});

describe('линейка по длинам сегментов', () => {
  const equatorDegreeKm = 111.19;

  it('итог равен сумме длин сегментов, а не сумме звеньев ломаной', () => {
    // Ломаная из четырёх звеньев, но сегмент объявлен длиной 100 км.
    const points = [0, 0.5, 1, 1.5, 2].map((lon) => ({ lat: 0, lon }));
    const ruler = createRouteRulerFromSegments([{ points, lengthKm: 100 }]);

    expect(ruler.totalKm).toBeCloseTo(100, 6);
    expect(ruler.cumulativeKm.at(-1)).toBeCloseTo(100, 6);
  });

  it('внутри сегмента расстояния идут пропорционально ломаной', () => {
    const points = [0, 1, 2].map((lon) => ({ lat: 0, lon }));
    const ruler = createRouteRulerFromSegments([{ points, lengthKm: 200 }]);

    expect(ruler.cumulativeKm).toEqual([0, expect.closeTo(100, 6), expect.closeTo(200, 6)]);
  });

  it('сегменты стыкуются: конец одного — начало следующего', () => {
    const ruler = createRouteRulerFromSegments([
      { points: [0, 1].map((lon) => ({ lat: 0, lon })), lengthKm: 50 },
      { points: [1, 2].map((lon) => ({ lat: 0, lon })), lengthKm: 70 },
    ]);

    expect(ruler.points).toHaveLength(3);
    expect(ruler.cumulativeKm).toEqual([0, expect.closeTo(50, 6), expect.closeTo(120, 6)]);
  });

  it('сегмент нулевой длины не ломает линейку', () => {
    const ruler = createRouteRulerFromSegments([
      { points: [{ lat: 0, lon: 0 }, { lat: 0, lon: 0 }], lengthKm: 0 },
      { points: [0, 1].map((lon) => ({ lat: 0, lon })), lengthKm: equatorDegreeKm },
    ]);

    expect(Number.isFinite(ruler.totalKm)).toBe(true);
    expect(ruler.totalKm).toBeCloseTo(equatorDegreeKm, 6);
  });

  it('без сегментов линейка пустая', () => {
    expect(createRouteRulerFromSegments([]).totalKm).toBe(0);
    expect(createRouteRulerFromSegments([]).points).toEqual([]);
  });
});
