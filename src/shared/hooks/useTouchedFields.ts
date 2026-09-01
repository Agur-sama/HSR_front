import { useCallback, useState } from 'react';

/**
 * Отслеживает, каких полей студент уже касался.
 *
 * Нужно, чтобы пустая форма не встречала студента красным: ошибка «заполните
 * поле» осмысленна только после того, как поле побывало в фокусе, либо если
 * в нём уже что-то введено и это что-то неверно.
 *
 * Состояние держится в компоненте шага и намеренно не попадает в черновик:
 * это факт текущего сеанса работы, а не данные, которые нужно сохранять
 * в JSON-мост и восстанавливать из файла.
 */
export function useTouchedFields() {
  const [touchedFields, setTouchedFields] = useState<ReadonlySet<string>>(() => new Set());

  const markTouched = useCallback((fieldId: string) => {
    setTouchedFields((current) => {
      if (current.has(fieldId)) {
        return current;
      }

      const next = new Set(current);
      next.add(fieldId);

      return next;
    });
  }, []);

  const isTouched = useCallback((fieldId: string) => touchedFields.has(fieldId), [touchedFields]);

  /**
   * Показывать ли ошибку: либо поле уже трогали, либо в нём есть значение
   * (тогда ошибка про само значение, а не про незаполненность).
   */
  const shouldShowError = useCallback(
    (fieldId: string, value: string) => touchedFields.has(fieldId) || value.trim().length > 0,
    [touchedFields],
  );

  return { isTouched, markTouched, shouldShowError };
}
