import { useCallback, useEffect, useRef, useState } from 'react';

/** Глубина истории: дальше отменять уже бессмысленно, а память копить незачем. */
const HISTORY_LIMIT = 50;

/**
 * История правок карты с отменой по Ctrl+Z.
 *
 * Снимок кладётся ПЕРЕД изменением — тем, кто это изменение вызывает. Поэтому
 * в историю попадают только действия на карте (клик, перетаскивание точки,
 * удаление), а не ввод координат руками: у текстового поля есть собственная
 * отмена, и перехватывать её нельзя.
 *
 * По той же причине горячая клавиша не срабатывает, когда фокус стоит в поле
 * ввода: там Ctrl+Z должен отменять набор текста, а не последнюю точку трассы.
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

      if (!isUndoCombo || isTextEntryTarget(event.target)) {
        return;
      }

      if (undo()) {
        event.preventDefault();
      }
    }

    window.addEventListener('keydown', handleKeyDown);

    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [undo]);

  return { canUndo, remember, undo };
}

function isTextEntryTarget(target: EventTarget | null) {
  if (!(target instanceof HTMLElement)) {
    return false;
  }

  if (target.isContentEditable) {
    return true;
  }

  const tagName = target.tagName.toLowerCase();

  return tagName === 'input' || tagName === 'textarea' || tagName === 'select';
}
