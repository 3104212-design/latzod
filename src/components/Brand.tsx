// סימני המותג: כותרת הכריכה "לצעוד לתוך היום" ולוגו ההוצאה, כקבצי SVG שנגזרו מהספר.

import titleSvg from '../assets/title.svg?raw';
import logoSvg from '../assets/publisher-logo.svg?raw';

/** כותרת הספר בעיצוב הכריכה. הצבע נלקח מ-color של ההורה */
export function TitleMark({ height, className }: { height: number | string; className?: string }) {
  return (
    <span
      className={`title-mark${className ? ` ${className}` : ''}`}
      style={{ height }}
      role="img"
      aria-label="לצעוד לתוך היום"
      dangerouslySetInnerHTML={{ __html: titleSvg }}
    />
  );
}

/** כותרת בתוך ריבוע ירוק מעוגל, כמו בראש הסימניה של הספר */
export function TitleBadge({ height }: { height: number }) {
  return (
    <span className="title-badge" style={{ padding: height * 0.14, borderRadius: height * 0.2 }}>
      <TitleMark height={height} />
    </span>
  );
}

export function PublisherLogo({ height }: { height: number }) {
  return (
    <span
      className="publisher-logo"
      style={{ height }}
      role="img"
      aria-label="לוגו הוצאת ספרים לפרוש כנפיים"
      dangerouslySetInnerHTML={{ __html: logoSvg }}
    />
  );
}

const WHATSAPP = '054-4480666';
const WHATSAPP_LINK = 'https://wa.me/972544480666';
const EMAIL = '12steps.3414@gmail.com';

/** פרטי הספר וההוצאה, כמו בגב הסימניה */
export function BookCredit({ compact }: { compact?: boolean }) {
  return (
    <div className={`book-credit${compact ? ' compact' : ''}`}>
      <PublisherLogo height={compact ? 56 : 84} />
      <div className="publisher-name">
        הוצאת ספרים
        <br />
        לפרוש כנפיים
      </div>
      <div className="credit-title">ניתן להשיג את הספר</div>
      <a className="credit-link credit-phone" href={WHATSAPP_LINK} target="_blank" rel="noopener noreferrer">
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path
            d="M12 3a9 9 0 0 0-7.8 13.5L3 21l4.6-1.2A9 9 0 1 0 12 3Z"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinejoin="round"
          />
          <path
            d="M9.2 8.2c.2-.4.5-.4.8-.4h.5c.2 0 .4 0 .5.4l.7 1.6c.1.2 0 .4-.1.6l-.5.6c.4.8 1.2 1.7 2.2 2.2l.6-.5c.2-.1.4-.2.6-.1l1.6.7c.3.1.4.3.4.5v.5c0 .3 0 .6-.4.8-.5.3-1.2.5-1.8.3-2.4-.6-4.3-2.5-4.9-4.9-.2-.6 0-1.3.3-1.8Z"
            fill="currentColor"
          />
        </svg>
        <span dir="ltr">{WHATSAPP}</span>
      </a>
      <a className="credit-link credit-email" href={`mailto:${EMAIL}`} dir="ltr">
        {EMAIL}
      </a>
    </div>
  );
}
