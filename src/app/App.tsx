import { moduleRegistry } from '../modules/registry';
import type { PzNumber } from '../modules/types';

export function App() {
  const requestedPz = new URLSearchParams(window.location.search).get('pz');
  const pzNumber = readPzNumber(window.location.search);
  const module = pzNumber === null ? undefined : moduleRegistry[pzNumber];

  if (!module) {
    return <ModuleNotFound requestedPz={requestedPz} />;
  }

  const SelectedModule = module.Component;
  return <SelectedModule />;
}

function readPzNumber(search: string): PzNumber | null {
  const rawValue = new URLSearchParams(search).get('pz');
  const parsed = Number(rawValue);

  if (!Number.isInteger(parsed) || parsed < 1 || parsed > 8) {
    return null;
  }

  return parsed as PzNumber;
}

/**
 * Показываем то, что реально стоит в адресе, а не разобранное число: раньше
 * «?pz=99» сообщал «не указан», хотя номер указан — и опечатка в адресе
 * Web Object выглядела как отсутствие параметра.
 */
function ModuleNotFound({ requestedPz }: { requestedPz: string | null }) {
  const label = requestedPz === null || requestedPz.trim() === '' ? 'не указан' : requestedPz;

  return (
    <main className="module-shell module-shell--empty">
      <section className="empty-module">
        <h1>Модуль не найден</h1>
        <p>
          Параметр <code>?pz=</code> сейчас равен: <strong>{label}</strong>. Доступны модули <code>?pz=1</code> и{' '}
          <code>?pz=2</code>.
        </p>
      </section>
    </main>
  );
}
