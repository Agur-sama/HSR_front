import { describe, expect, it } from 'vitest';
import { normalizeRegionName, pickRegionFromAddress } from './reverseGeocode';

const knownRegions = [
  'Москва',
  'Московская область',
  'Приморский край',
  'Хабаровский край',
  'Республика Татарстан',
  'Республика Башкортостан',
  'Республика Северная Осетия — Алания',
  'Ханты-Мансийский автономный округ — Югра',
  'Ярославская область',
];

describe('pickRegionFromAddress', () => {
  it('берёт state и отдаёт название из справочника', () => {
    expect(pickRegionFromAddress({ state: 'Приморский край' }, knownRegions)).toBe('Приморский край');
  });

  it('дописывает «Республика», если Nominatim её опустил', () => {
    expect(pickRegionFromAddress({ state: 'Татарстан' }, knownRegions)).toBe('Республика Татарстан');
  });

  it('сводит разные тире к одному написанию', () => {
    // В ответе дефис, в справочнике длинное тире.
    expect(pickRegionFromAddress({ state: 'Ханты-Мансийский автономный округ - Югра' }, knownRegions)).toBe(
      'Ханты-Мансийский автономный округ — Югра',
    );
    expect(pickRegionFromAddress({ state: 'Республика Северная Осетия-Алания' }, knownRegions)).toBe(
      'Республика Северная Осетия — Алания',
    );
  });

  it('не путает город федерального значения с одноимённой областью', () => {
    expect(pickRegionFromAddress({ state: 'Москва' }, knownRegions)).toBe('Москва');
    expect(pickRegionFromAddress({ state: 'Московская область' }, knownRegions)).toBe('Московская область');
  });

  it('падает на region и county, если state не пришёл', () => {
    expect(pickRegionFromAddress({ region: 'Ярославская область' }, knownRegions)).toBe('Ярославская область');
    expect(pickRegionFromAddress({ county: 'Хабаровский край' }, knownRegions)).toBe('Хабаровский край');
  });

  it('незнакомое название отдаёт как есть, а не теряет', () => {
    expect(pickRegionFromAddress({ state: 'Оренбургская область' }, knownRegions)).toBe('Оренбургская область');
  });

  it('пустой ответ даёт null', () => {
    expect(pickRegionFromAddress(undefined, knownRegions)).toBeNull();
    expect(pickRegionFromAddress({}, knownRegions)).toBeNull();
    expect(pickRegionFromAddress({ state: '   ' }, knownRegions)).toBeNull();
  });
});

describe('normalizeRegionName', () => {
  it('снимает регистр, «ё» и лишние пробелы', () => {
    expect(normalizeRegionName('  Тюменская   Область ')).toBe('тюменская область');
    expect(normalizeRegionName('Орёл')).toBe(normalizeRegionName('Орел'));
  });

  it('вырезает «республика» с любого края', () => {
    expect(normalizeRegionName('Республика Татарстан')).toBe('татарстан');
    expect(normalizeRegionName('Чувашская Республика')).toBe('чувашская');
  });
});
