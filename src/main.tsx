import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import '@fontsource-variable/heebo';
import '@fontsource/secular-one';
import '@fontsource-variable/fredoka';
import './styles.css';
import './styles-v2.css';
import './styles-ios.css';
import './styles-v21.css';
import './styles-v23.css';
import './styles-v24.css';
import './styles-v25.css';
import { App } from './App';
import { registerServiceWorker } from './lib/pwa';

// פתיחה מונפשת, פעם אחת בכל פתיחה של האפליקציה (styles-v24.css: [data-intro])
document.documentElement.dataset.intro = '';
setTimeout(() => delete document.documentElement.dataset.intro, 2600);

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);

// עבודה אופליין, התקנה כאפליקציה והודעה על גרסה חדשה (רק בגרסת הייצור)
registerServiceWorker();
