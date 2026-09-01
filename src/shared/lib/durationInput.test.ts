import { describe, expect, it } from 'vitest';
import { isDurationInvalid, maskDurationInput, normalizeDurationInput, parseDurationToMinutes } from './durationInput';

describe('maskDurationInput', () => {
  it('ставит двоеточие само, пока студент печатает цифры', () => {
    expect(maskDurationInput('1')).toBe('1');
    expect(maskDurationInput('13')).toBe('13');
    expect(maskDurationInput('130')).toBe('1:30');
    expect(maskDurationInput('1300')).toBe('13:00');
  });

  it('принимает уже набранное двоеточие и не ломает его', () => {
    expect(maskDurationInput('1:30')).toBe('1:30');
    expect(maskDurationInput('01:30')).toBe('01:30');
  });

  it('игнорирует буквы и лишние символы', () => {
    expect(maskDurationInput('1a3b0')).toBe('1:30');
    expect(maskDurationInput('  ')).toBe('');
  });

  it('обрезает лишние цифры, а не переполняет поле', () => {
    expect(maskDurationInput('123456')).toBe('12:34');
  });
});

describe('normalizeDurationInput', () => {
  it('дополняет нулями при потере фокуса', () => {
    expect(normalizeDurationInput('130')).toBe('01:30');
    expect(normalizeDurationInput('1300')).toBe('13:00');
    expect(normalizeDurationInput('5')).toBe('00:05');
    expect(normalizeDurationInput('45')).toBe('00:45');
  });

  it('пустой ввод оставляет пустым', () => {
    expect(normalizeDurationInput('')).toBe('');
    expect(normalizeDurationInput('   ')).toBe('');
  });

  it('минуты больше 59 — не время, возвращает null', () => {
    // null значит «оставить введённое и показать ошибку», а не стереть.
    expect(normalizeDurationInput('199')).toBeNull();
    expect(normalizeDurationInput('60')).toBeNull();
  });

  it('уже нормализованное значение не меняется', () => {
    expect(normalizeDurationInput('01:30')).toBe('01:30');
    expect(normalizeDurationInput('00:00')).toBe('00:00');
  });
});

describe('parseDurationToMinutes', () => {
  it('считает минуты', () => {
    expect(parseDurationToMinutes('01:30')).toBe(90);
    expect(parseDurationToMinutes('00:00')).toBe(0);
    expect(parseDurationToMinutes('13:05')).toBe(785);
  });

  it('мусор и неполный ввод дают null', () => {
    expect(parseDurationToMinutes('130')).toBeNull();
    expect(parseDurationToMinutes('01:99')).toBeNull();
    expect(parseDurationToMinutes('')).toBeNull();
  });
});

describe('isDurationInvalid', () => {
  it('пустое значение ошибкой не считается', () => {
    expect(isDurationInvalid('')).toBe(false);
  });

  it('ловит некорректное введённое значение', () => {
    expect(isDurationInvalid('01:99')).toBe(true);
    expect(isDurationInvalid('01:30')).toBe(false);
  });
});
