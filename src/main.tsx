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
import './styles-v26.css';
import { App } from './App';
import { startIntro } from './lib/intro';
import { registerServiceWorker } from './lib/pwa';

// פתיחה מונפשת, פעם אחת בכל פתיחה. כשיש מסך פתיחה, היא מתחילה כשהוא נעלם (App.tsx)
if (!document.getElementById('splash')) startIntro();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);

// עבודה אופליין, התקנה כאפליקציה והודעה על גרסה חדשה (רק בגרסת הייצור)
registerServiceWorker();
