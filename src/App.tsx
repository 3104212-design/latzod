import { useCallback, useEffect, useState } from 'react';
import { BottomNav } from './components/Chrome';
import { SosSheet } from './components/SosSheet';
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
  const s = useAppState();
  const route = useRoute();
  const today = useToday();
  const [sos, setSos] = useState(false);
  const openSos = useCallback(() => setSos(true), []);
  const closeSos = useCallback(() => setSos(false), []);

  useEffect(() => {
    const root = document.documentElement;
    if (s.theme === 'light' || s.theme === 'dark') root.dataset.theme = s.theme;
    else delete root.dataset.theme;
  }, [s.theme]);

  if (!s.onboarded) return <Onboarding />;

  let screen;
  switch (route.name) {
    case 'day':
      screen = <DayView date={route.date} onSos={openSos} />;
      break;
    case 'clean':
      screen = <CounterScreen onSos={openSos} />;
      break;
    case 'path':
      screen = <PathScreen onSos={openSos} />;
      break;
    case 'step':
      screen = <StepScreen step={route.step} onSos={openSos} />;
      break;
    case 'journal':
      screen = <JournalScreen onSos={openSos} />;
      break;
    case 'more':
      screen = <MoreScreen onSos={openSos} />;
      break;
    default:
      screen = <DayView date={today} onSos={openSos} />;
  }

  return (
    <div className="app">
      <main>{screen}</main>
      <BottomNav route={route} />
      {sos && <SosSheet onClose={closeSos} />}
    </div>
  );
}
