// סמלים אחידים לכל האפליקציה (קו של 1.8, פינות מעוגלות), במקום תווים כמו ✕ › ✓.
// בעברית "הקודם" מצביע ימינה ו"הבא" שמאלה: back = חץ ימינה, forward = חץ שמאלה.

import type { ReactNode } from 'react';

function Svg({ children, className, size = 22 }: { children: ReactNode; className?: string; size?: number }) {
  return (
    <svg
      className={`ic${className ? ` ${className}` : ''}`}
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      {children}
    </svg>
  );
}

type P = { className?: string; size?: number };

export const I = {
  close: (p: P = {}) => (
    <Svg {...p}>
      <path d="M6 6l12 12M18 6L6 18" />
    </Svg>
  ),
  /** הקודם (בעברית: ימינה) */
  back: (p: P = {}) => (
    <Svg {...p}>
      <path d="M9 5l7 7-7 7" />
    </Svg>
  ),
  /** הבא (בעברית: שמאלה) */
  forward: (p: P = {}) => (
    <Svg {...p}>
      <path d="M15 5l-7 7 7 7" />
    </Svg>
  ),
  check: (p: P = {}) => (
    <Svg {...p}>
      <path d="M5 12.5l4.5 4.5L19 7.5" />
    </Svg>
  ),
  plus: (p: P = {}) => (
    <Svg {...p}>
      <path d="M12 5v14M5 12h14" />
    </Svg>
  ),
  share: (p: P = {}) => (
    <Svg {...p}>
      <path d="M12 15V3.5M7.5 8L12 3.5 16.5 8" />
      <path d="M5 12.5v6A1.5 1.5 0 0 0 6.5 20h11a1.5 1.5 0 0 0 1.5-1.5v-6" />
    </Svg>
  ),
  copy: (p: P = {}) => (
    <Svg {...p}>
      <rect x="8.5" y="8.5" width="11" height="11" rx="2.2" />
      <path d="M15.5 5.5v-.3A1.7 1.7 0 0 0 13.8 3.5H6.2A1.7 1.7 0 0 0 4.5 5.2v7.6a1.7 1.7 0 0 0 1.7 1.7h.3" />
    </Svg>
  ),
  qr: (p: P = {}) => (
    <Svg {...p}>
      <rect x="4" y="4" width="6" height="6" rx="1" />
      <rect x="14" y="4" width="6" height="6" rx="1" />
      <rect x="4" y="14" width="6" height="6" rx="1" />
      <path d="M14 14h2.5v2.5H14zM17.5 17.5H20V20h-2.5zM14 19.5h1M19.5 14v1" />
    </Svg>
  ),
  edit: (p: P = {}) => (
    <Svg {...p}>
      <path d="M4.5 19.5l1-4L15.8 5.2a2 2 0 0 1 2.8 0l.2.2a2 2 0 0 1 0 2.8L8.5 18.5z" />
      <path d="M13.5 7.5l3 3" />
    </Svg>
  ),
  trash: (p: P = {}) => (
    <Svg {...p}>
      <path d="M4.5 7h15M10 11v6M14 11v6M6.5 7l1 12a1.5 1.5 0 0 0 1.5 1.4h6a1.5 1.5 0 0 0 1.5-1.4l1-12M9.5 7V4.8a1 1 0 0 1 1-1h3a1 1 0 0 1 1 1V7" />
    </Svg>
  ),
  pen: (p: P = {}) => (
    <Svg {...p}>
      <path d="M12 20h8M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z" />
    </Svg>
  ),
  flag: (p: P = {}) => (
    <Svg {...p}>
      <path d="M5 21V4M5 4.5c4-2.5 7 2.5 14 0v9c-7 2.5-10-2.5-14 0" />
    </Svg>
  ),
  heart: (p: P = {}) => (
    <Svg {...p}>
      <path d="M12 20s-7.5-4.6-7.5-10.2A4.3 4.3 0 0 1 12 7.2a4.3 4.3 0 0 1 7.5 2.6C19.5 15.4 12 20 12 20z" />
    </Svg>
  ),
  smile: (p: P = {}) => (
    <Svg {...p}>
      <circle cx="12" cy="12" r="8.5" />
      <path d="M8.5 14c.9 1.3 2.1 2 3.5 2s2.6-.7 3.5-2M9.2 9.5h.01M14.8 9.5h.01" />
    </Svg>
  ),
  coin: (p: P = {}) => (
    <Svg {...p}>
      <ellipse cx="12" cy="7" rx="7" ry="3" />
      <path d="M5 7v5c0 1.7 3.1 3 7 3s7-1.3 7-3V7M5 12v5c0 1.7 3.1 3 7 3s7-1.3 7-3v-5" />
    </Svg>
  ),
  clock: (p: P = {}) => (
    <Svg {...p}>
      <circle cx="12" cy="12" r="8.5" />
      <path d="M12 7.5V12l3 2" />
    </Svg>
  ),
  trophy: (p: P = {}) => (
    <Svg {...p}>
      <path d="M8 4h8v5a4 4 0 0 1-8 0zM8 6H5a3 3 0 0 0 3 4.5M16 6h3a3 3 0 0 1-3 4.5M12 13v4M8.5 20h7M9.5 17h5" />
    </Svg>
  ),
  bell: (p: P = {}) => (
    <Svg {...p}>
      <path d="M6 16.5V11a6 6 0 0 1 12 0v5.5l1.5 2h-15zM10 20.5a2.2 2.2 0 0 0 4 0" />
    </Svg>
  ),
  lock: (p: P = {}) => (
    <Svg {...p}>
      <rect x="5" y="10.5" width="14" height="10" rx="2.2" />
      <path d="M8.5 10.5V8a3.5 3.5 0 0 1 7 0v2.5" />
    </Svg>
  ),
  user: (p: P = {}) => (
    <Svg {...p}>
      <circle cx="12" cy="8.5" r="3.8" />
      <path d="M4.5 20a7.5 7.5 0 0 1 15 0" />
    </Svg>
  ),
  users: (p: P = {}) => (
    <Svg {...p}>
      <circle cx="9" cy="9" r="3.4" />
      <path d="M3 19.5a6 6 0 0 1 12 0M15.5 5.8a3.3 3.3 0 0 1 0 6.4M17.5 14.2a6 6 0 0 1 3.5 5.3" />
    </Svg>
  ),
  phone: (p: P = {}) => (
    <Svg {...p}>
      <path d="M6.5 3.5h3l1.5 4-2 1.3a10 10 0 0 0 6.2 6.2l1.3-2 4 1.5v3a2 2 0 0 1-2.2 2A16.5 16.5 0 0 1 4.5 5.7a2 2 0 0 1 2-2.2z" />
    </Svg>
  ),
  book: (p: P = {}) => (
    <Svg {...p}>
      <path d="M12 6.5C10.5 5 8 4.5 4.5 4.5v13c3.5 0 6 .5 7.5 2 1.5-1.5 4-2 7.5-2v-13C16 4.5 13.5 5 12 6.5zM12 6.5v13" />
    </Svg>
  ),
  calendar: (p: P = {}) => (
    <Svg {...p}>
      <rect x="4" y="5.5" width="16" height="14.5" rx="2.2" />
      <path d="M4 10h16M8.5 3.5v4M15.5 3.5v4" />
    </Svg>
  ),
  display: (p: P = {}) => (
    <Svg {...p}>
      <circle cx="12" cy="12" r="8.5" />
      <path d="M12 3.5v17a8.5 8.5 0 0 0 0-17z" fill="currentColor" stroke="none" />
    </Svg>
  ),
  data: (p: P = {}) => (
    <Svg {...p}>
      <ellipse cx="12" cy="6" rx="7" ry="2.8" />
      <path d="M5 6v12c0 1.5 3.1 2.8 7 2.8s7-1.3 7-2.8V6M5 12c0 1.5 3.1 2.8 7 2.8s7-1.3 7-2.8" />
    </Svg>
  ),
  link: (p: P = {}) => (
    <Svg {...p}>
      <path d="M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1" />
    </Svg>
  ),
  sparkle: (p: P = {}) => (
    <Svg {...p}>
      <path d="M12 3.5l1.8 5 5 1.8-5 1.8-1.8 5-1.8-5-5-1.8 5-1.8zM18.5 15.5l.7 1.8 1.8.7-1.8.7-.7 1.8-.7-1.8-1.8-.7 1.8-.7z" />
    </Svg>
  ),
  info: (p: P = {}) => (
    <Svg {...p}>
      <circle cx="12" cy="12" r="8.5" />
      <path d="M12 11v5.5M12 7.8h.01" />
    </Svg>
  ),
  /** היום: ההתחייבות */
  sun: (p: P = {}) => (
    <Svg {...p}>
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2.8v2M12 19.2v2M2.8 12h2M19.2 12h2M5.5 5.5l1.4 1.4M17.1 17.1l1.4 1.4M5.5 18.5l1.4-1.4M17.1 6.9l1.4-1.4" />
    </Svg>
  ),
  /** הערב: סיכום היום */
  moon: (p: P = {}) => (
    <Svg {...p}>
      <path d="M19.5 14.2A7.8 7.8 0 0 1 9.8 4.5a7.8 7.8 0 1 0 9.7 9.7z" />
    </Svg>
  ),
  /** סדר היום */
  list: (p: P = {}) => (
    <Svg {...p}>
      <path d="M9.5 6.5h10M9.5 12h10M9.5 17.5h10" />
      <path d="M4.5 6.5l1 1 2-2M4.5 12l1 1 2-2" />
      <circle cx="5.8" cy="17.5" r="1.1" />
    </Svg>
  ),
};
