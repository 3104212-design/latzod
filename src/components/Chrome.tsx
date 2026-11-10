// מסגרת האפליקציה: סרגל עליון וניווט תחתון.

import type { Route } from '../lib/router';
import type { ReactNode } from 'react';
import { Icon } from './Visuals';
import { TitleBadge, TitleMark } from './Brand';

export function TopBar({ onHero, onSos }: { onHero?: boolean; onSos: () => void }) {
  return (
    <header className={`topbar${onHero ? ' on-hero' : ''}`}>
      <a href="#/" className="brand" aria-label="לצעוד לתוך היום, למסך הבית">
        {onHero ? <TitleMark height={104} /> : <TitleBadge height={54} />}
      </a>
      <button className="sos-btn" onClick={onSos}>
        עזרה עכשיו
      </button>
    </header>
  );
}

const TABS: { href: string; label: string; icon: ReactNode; match: Route['name'][] }[] = [
  { href: '#/', label: 'היום', icon: Icon.today, match: ['today', 'day'] },
  { href: '#/clean', label: 'ספירה', icon: Icon.clean, match: ['clean'] },
  { href: '#/path', label: 'המסלול', icon: Icon.path, match: ['path', 'step'] },
  { href: '#/journal', label: 'יומן', icon: Icon.journal, match: ['journal'] },
  { href: '#/more', label: 'עוד', icon: Icon.more, match: ['more'] },
];

export function BottomNav({ route }: { route: Route }) {
  return (
    <nav className="bottom-nav" aria-label="ניווט ראשי">
      <ul>
        {TABS.map((t) => (
          <li key={t.href}>
            <a href={t.href} aria-current={t.match.includes(route.name) ? 'page' : undefined}>
              {t.icon}
              {t.label}
            </a>
          </li>
        ))}
      </ul>
    </nav>
  );
}
