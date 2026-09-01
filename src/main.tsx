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
import './styles.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
