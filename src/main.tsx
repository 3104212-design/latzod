import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import '@fontsource-variable/heebo';
import '@fontsource/secular-one';
import './styles.css';
import './styles-v2.css';
import './styles-ios.css';
import { App } from './App';
import { registerServiceWorker } from './lib/pwa';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);

// עבודה אופליין, התקנה כאפליקציה והודעה על גרסה חדשה (רק בגרסת הייצור)
registerServiceWorker();
