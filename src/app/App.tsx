import { moduleRegistry } from '../modules/registry';
import type { PzNumber } from '../modules/types';

export function App() {
  const pzNumber = readPzNumber(window.location.search);
  const module = moduleRegistry[pzNumber];

  if (!module) {
    return <ModuleNotFound requestedPz={pzNumber} />;
  }

  const SelectedModule = module.Component;
  return <SelectedModule />;
}

function readPzNumber(search: string): PzNumber {
  const rawValue = new URLSearchParams(search).get('pz');
  if (rawValue === null) {
    return 1;
  }

  const parsed = Number(rawValue);

  if (!Number.isInteger(parsed) || parsed < 1 || parsed > 8) {
    return 1;
  }

  return parsed as PzNumber;
}

function ModuleNotFound({ requestedPz }: { requestedPz: PzNumber | null }) {
  const label = requestedPz === null ? 'не указан' : String(requestedPz);

  return (
    <main className="module-shell module-shell--empty">
      <section className="empty-module">
        <p className="eyebrow">Web Object ВСМ</p>
        <h1>Модуль не найден</h1>
        <p>
          Параметр <code>?pz=</code> сейчас равен: <strong>{label}</strong>. Для MVP подключен только модуль{' '}
          <code>?pz=1</code>.
        </p>
      </section>
    </main>
  );
}
