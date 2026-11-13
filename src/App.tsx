import { useCallback, useEffect, useState } from 'react';
import { BottomNav } from './components/Chrome';
import { CelebrationLayer, Toasts } from './components/Feedback';
import { LockGate } from './components/Lock';
import { SosSheet } from './components/SosSheet';
import { DocumentSync, MilestoneWatcher, WhatsNew } from './components/Watchers';
import { todayISO } from './lib/dates';
import { startIntro } from './lib/intro';
import { replaceRoute, useRoute } from './lib/router';
import { usePwa } from './lib/pwa';
import { toast } from './lib/feedback';
import { InviteGate, IosInstallTip } from './screens/InviteGate';
import { useAppState } from './lib/store';
import { noteVisit } from './lib/visits';
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
  // פס המצב באייפון: מטופל בתגית apple-mobile-web-app-status-bar-style="default" ב-index.html,
  // שבה הטלפון מצייר פס אטום משלו. אין רצועה משלנו, כי היא הבהבה בגלילה.
  useEffect(() => {
    // מסך הפתיחה (index.html) נעלם כשהאפליקציה עולה וגם שלוש הפסיעות הסתיימו. אז מתחילה הפתיחה המונפשת
    const sp = document.getElementById('splash');
    if (!sp) return startIntro();
    const walker = sp.querySelector('.sp-r');
    const out = () => {
      if (sp.classList.contains('out')) return;
      sp.classList.add('out');
      startIntro();
      // בלי ניקוי: ב-StrictMode האפקט רץ פעמיים, והמסך חייב לרדת מהעמוד
      setTimeout(() => sp.remove(), 400);
    };
    // בלי אנימציה (הפחתת תנועה, או שכבר הסתיימה): מיד
    const walked = !walker?.getAnimations || walker.getAnimations().every((a) => a.playState === 'finished');
    if (walked) out();
    walker?.addEventListener('animationend', out);
    // גיבוי, אם האירוע לא הגיע
    const t = setTimeout(out, Math.max(0, 1800 - performance.now()));
    return () => {
      walker?.removeEventListener('animationend', out);
      clearTimeout(t);
    };
  }, []);
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
  const pwa = usePwa();
  const [sos, setSos] = useState(false);
  const openSos = useCallback(() => setSos(true), []);
  const closeSos = useCallback(() => setSos(false), []);
  // "טוב שחזרת": בודקים בפתיחה ובכל פעם שהיום מתחלף
  useEffect(() => noteVisit(), [today, s.onboarded]);
  // קישור הזמנה במכשיר שהאפליקציה כבר פתוחה בו: לא מנצלים אותו
  useEffect(() => {
    if (s.onboarded && route.name === 'join') {
      replaceRoute('#/');
      toast('האפליקציה כבר פתוחה במכשיר הזה. את ההזמנה כדאי להעביר למי שהיא נועדה לו.');
    }
  }, [s.onboarded, route.name]);

  // משתמש חדש: קודם הזמנה (פעם אחת לכל הזמנה), ורק אז מסכי הפתיחה. מי שכבר משתמש לא נחסם
  if (!s.onboarded) {
    if (!s.access && !s.admin) return <InviteGate invite={route.name === 'join' ? route.invite : undefined} />;
    if (s.access && pwa.ios && !pwa.standalone && !s.access.tipDone) return <IosInstallTip />;
    return <Onboarding />;
  }

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
    case 'walk':
      // קיצור הדרך באייקון: מסך היום, והצעידה נפתחת מיד
      screen = <DayView date={today} onSos={openSos} autoWalk />;
      key = today;
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
