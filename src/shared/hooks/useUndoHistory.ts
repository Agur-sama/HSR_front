import { useCallback, useEffect, useRef, useState } from 'react';

/** Глубина истории: дальше отменять уже бессмысленно, а память копить незачем. */
const HISTORY_LIMIT = 50;

/**
 * История правок карты с отменой по Ctrl+Z.
 *
 * Снимок кладётся ПЕРЕД изменением — тем, кто это изменение вызывает. Поэтому
 * в историю попадают только действия на карте (клик, перетаскивание точки,
 * удаление), а не ввод координат руками.
 *
 * Клавиша перехватывается всегда, в том числе когда фокус стоит в поле ввода.
 * Сначала было наоборот — казалось правильным оставить полю его собственную
 * отмену. На проверке выяснилось, что встроенная отмена браузера в этой форме
 * откатывает последнюю правку в документе, а не в том поле, где курсор:
 * Ctrl+Z в поле широты станции А стирал долготу станции Г. Механизм, который
 * молча портит соседние данные, лучше отключить: студент в этом шаге ждёт от
 * Ctrl+Z отмены на карте, так и написано в подсказке.
 */
export function useUndoHistory<TSnapshot>(applySnapshot: (snapshot: TSnapshot) => void) {
  const historyRef = useRef<TSnapshot[]>([]);
  const applyRef = useRef(applySnapshot);
  const [canUndo, setCanUndo] = useState(false);

  useEffect(() => {
    applyRef.current = applySnapshot;
  }, [applySnapshot]);

  const remember = useCallback((snapshot: TSnapshot) => {
    historyRef.current = [...historyRef.current, snapshot].slice(-HISTORY_LIMIT);
    setCanUndo(true);
  }, []);

  const undo = useCallback(() => {
    const previous = historyRef.current.at(-1);

    if (previous === undefined) {
      return false;
    }

    historyRef.current = historyRef.current.slice(0, -1);
    setCanUndo(historyRef.current.length > 0);
    applyRef.current(previous);

    return true;
  }, []);

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      const isUndoCombo = (event.ctrlKey || event.metaKey) && !event.shiftKey && event.key.toLowerCase() === 'z';

      if (!isUndoCombo) {
        return;
      }

      // preventDefault до проверки истории: даже когда отменять нечего, отдавать
      // клавишу встроенной отмене нельзя — она правит не то поле.
      event.preventDefault();
      undo();
    }

    window.addEventListener('keydown', handleKeyDown);

    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [undo]);

  return { canUndo, remember, undo };
}
