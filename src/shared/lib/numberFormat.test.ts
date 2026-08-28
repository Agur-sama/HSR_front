import { describe, expect, it } from 'vitest';
import { formatGroupedNumber, stripGroupSeparators } from './numberFormat';

const NBSP = '\u00A0';

describe('formatGroupedNumber', () => {
  it('группирует разряды в примере из ТЗ v3.5 §3 П-05', () => {
    expect(formatGroupedNumber('12000000')).toBe(`12${NBSP}000${NBSP}000`);
  });

  it('не трогает числа короче четырёх цифр', () => {
    expect(formatGroupedNumber('999')).toBe('999');
    expect(formatGroupedNumber('0')).toBe('0');
  });

  it('группирует только целую часть, дробную оставляет как есть', () => {
    expect(formatGroupedNumber('1234567,89')).toBe(`1${NBSP}234${NBSP}567,89`);
    expect(formatGroupedNumber('1234567.5')).toBe(`1${NBSP}234${NBSP}567.5`);
  });

  it('сохраняет знак минуса', () => {
    expect(formatGroupedNumber('-45000')).toBe(`-45${NBSP}000`);
  });

  it('возвращает незаконченный ввод без изменений, чтобы не портить набор', () => {
    expect(formatGroupedNumber('12,')).toBe(`12,`);
    expect(formatGroupedNumber('-')).toBe('-');
    expect(formatGroupedNumber('не число')).toBe('не число');
  });

  it('пустую строку отдаёт пустой', () => {
    expect(formatGroupedNumber('')).toBe('');
    expect(formatGroupedNumber('   ')).toBe('');
  });

  it('повторное форматирование уже сгруппированного значения ничего не ломает', () => {
    expect(formatGroupedNumber(`12${NBSP}000${NBSP}000`)).toBe(`12${NBSP}000${NBSP}000`);
  });
});

describe('stripGroupSeparators', () => {
  it('снимает неразрывные и обычные пробелы', () => {
    expect(stripGroupSeparators(`12${NBSP}000${NBSP}000`)).toBe('12000000');
    expect(stripGroupSeparators('12 000 000')).toBe('12000000');
  });

  it('обратно к формату хранения: strip(format(x)) === x', () => {
    for (const value of ['12000000', '1234567,89', '-45000', '0', '999']) {
      expect(stripGroupSeparators(formatGroupedNumber(value))).toBe(value);
    }
  });
});
