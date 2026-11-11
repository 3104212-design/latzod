import { useCallback, useEffect, useState } from 'react';
import { BottomNav } from './components/Chrome';
import { CelebrationLayer, Toasts } from './components/Feedback';
import { LockGate } from './components/Lock';
import { SosSheet } from './components/SosSheet';
import { DocumentSync, MilestoneWatcher, WhatsNew } from './components/Watchers';
import { todayISO } from './lib/dates';
import { useRoute } from './lib/router';
import { useAppState } from './lib/store';
import { CounterScreen } from './screens/CounterScreen';
import { DayView } from './screens/DayView';
import { JournalScreen } from './screens/JournalScreen';
import { MoreScreen } from './screens/MoreScreen';
import { Onboarding } from './screens/Onboarding';
import { PathScreen, StepScreen } from './screens/PathScreen';

/** מתעדכן כשהיום מתחלף (חצות), כדי שמסך "היום" יציג תמיד את היום הנכון */
function useToday() {
  const [today, setToday] = useState(todayISO());
  useEffect(() => {
    const check = () => setToday(todayISO());
    const t = setInterval(check, 60000);
    document.addEventListener('visibilitychange', check);
    return () => {
      clearInterval(t);
      document.removeEventListener('visibilitychange', check);
    };
  }, []);
  return today;
}

export function App() {
  return (
    <>
      <DocumentSync />
      <LockGate>
        <Shell />
      </LockGate>
      <CelebrationLayer />
      <Toasts />
    </>
  );
}

function Shell() {
  const s = useAppState();
  const route = useRoute();
  const today = useToday();
  const [sos, setSos] = useState(false);
  const openSos = useCallback(() => setSos(true), []);
  const closeSos = useCallback(() => setSos(false), []);

  if (!s.onboarded) return <Onboarding />;

  let screen;
  let key: string = route.name;
  switch (route.name) {
    case 'day':
      screen = <DayView date={route.date} onSos={openSos} />;
      key = route.date;
      break;
    case 'clean':
      screen = <CounterScreen onSos={openSos} />;
      break;
    case 'path':
      screen = <PathScreen onSos={openSos} />;
      break;
    case 'step':
      screen = <StepScreen step={route.step} onSos={openSos} />;
      key = `step-${route.step}`;
      break;
    case 'journal':
      screen = <JournalScreen onSos={openSos} />;
      break;
    case 'more':
      screen = <MoreScreen onSos={openSos} />;
      break;
    default:
      screen = <DayView date={today} onSos={openSos} />;
      key = today;
  }

  return (
    <div className="app">
      <a className="skip-link" href="#main">
        דילוג לתוכן
      </a>
      <main id="main" key={key} className="route">
        {screen}
      </main>
      <BottomNav route={route} />
      {sos && <SosSheet onClose={closeSos} />}
      <MilestoneWatcher />
      <WhatsNew />
    </div>
  );
}
