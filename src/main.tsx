import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './app/App';
// Raleway кладём в сборку, а не тянем с Google Fonts: модуль открывают внутри
// iSpring в аудитории, где внешний CDN может быть недоступен, и тогда весь
// визуальный язык проекта молча подменялся системным шрифтом.
// Веса те же, что запрашивались у Google: 500, 600, 700, 800.
import '@fontsource/raleway/cyrillic-500.css';
import '@fontsource/raleway/cyrillic-600.css';
import '@fontsource/raleway/cyrillic-700.css';
import '@fontsource/raleway/cyrillic-800.css';
import '@fontsource/raleway/latin-500.css';
import '@fontsource/raleway/latin-600.css';
import '@fontsource/raleway/latin-700.css';
import '@fontsource/raleway/latin-800.css';
// Стили MapLibre подключаются здесь, а не в компонентах карты, и обязательно
// перед `styles.css`. Карта грузится отдельным куском по требованию, и её
// стили приезжали после наших — а они задают те же классы на том же уровне
// вложенности. Порядок переворачивался, `.maplibregl-map` перебивал
// `.maplibre-container`, контейнер переставал быть растянутым, и карта
// схлопывалась в пустую полосу. Один файл на входе — и порядок каскада
// перестаёт зависеть от того, когда приедет кусок.
import 'maplibre-gl/dist/maplibre-gl.css';
import './styles.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
