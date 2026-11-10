import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import '@fontsource-variable/heebo';
import '@fontsource/secular-one';
import './styles.css';
import { App } from './App';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);

// עבודה אופליין והתקנה כאפליקציה (רק בגרסת הייצור)
if (import.meta.env.PROD && 'serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./sw.js').catch(() => {});
  });
}
