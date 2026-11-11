// מדליה של אבן דרך. לכל רמה צורה משלה, שנעשית חגיגית יותר ככל שהרמה עולה:
// רמה 1 עיגול, רמה 2 רוזטה, רמה 3 כוכב בן שמונה קצוות, רמה 4 שמש עם סרט.
// אבן דרך מרכזית (major) מקבלת כוכב קטן למעלה. הצבע מגיע מהמחלקה lvl-N (styles-v25.css).

const C = 32;

/** צורה של חותם: קודקודים לסירוגין על שני רדיוסים */
function seal(points: number, outer: number, inner: number): string {
  const pts: string[] = [];
  for (let i = 0; i < points * 2; i++) {
    const r = i % 2 ? inner : outer;
    const a = (Math.PI * i) / points - Math.PI / 2;
    pts.push(`${(C + r * Math.cos(a)).toFixed(2)},${(C + r * Math.sin(a)).toFixed(2)}`);
  }
  return `M${pts.join('L')}Z`;
}

const SHAPES: Record<number, string> = {
  2: seal(14, 29.5, 26.2),
  3: seal(8, 30.5, 24.5),
  4: seal(18, 31.2, 25.8),
};

/** כוכב קטן בן חמישה קצוות, למעלה במרכז */
const STAR = (() => {
  const pts: string[] = [];
  for (let i = 0; i < 10; i++) {
    const r = i % 2 ? 2.9 : 6.6;
    const a = (Math.PI * i) / 5 - Math.PI / 2;
    pts.push(`${(C + r * Math.cos(a)).toFixed(2)},${(7 + r * Math.sin(a)).toFixed(2)}`);
  }
  return `M${pts.join('L')}Z`;
})();

export function Medal({
  state,
  level = 1,
  major,
  progress = 0,
}: {
  state: 'got' | 'next' | 'future';
  level?: number;
  major?: boolean;
  progress?: number;
}) {
  const r = 21.5;
  const c = 2 * Math.PI * r;
  return (
    <svg className={`medal l${level} ${state}`} viewBox="0 0 64 64" aria-hidden="true">
      {level === 4 && (
        // סרט מתחת לשמש
        <g className="medal-ribbon">
          <path d="M23 44 L17.5 62 L22.5 58.6 L26.5 62.5 L30.5 47 Z" />
          <path d="M41 44 L46.5 62 L41.5 58.6 L37.5 62.5 L33.5 47 Z" />
        </g>
      )}
      {level === 1 ? <circle className="medal-shape" cx={C} cy={C} r="28" /> : <path className="medal-shape" d={SHAPES[level]} />}
      <circle className="medal-face" cx={C} cy={C} r="20" />
      {state === 'next' && (
        <circle className="medal-progress" cx={C} cy={C} r={r} strokeDasharray={c} strokeDashoffset={c * (1 - Math.min(1, progress))} />
      )}
      <g className="medal-foot" transform="translate(26.5 19) scale(0.095)">
        <path d="M60 0C96 0 118 30 118 74c0 38-14 64-18 86H20C16 138 2 112 2 74 2 30 24 0 60 0Z" />
        <rect x="18" y="174" width="84" height="66" rx="26" />
      </g>
      {major && <path className="medal-star" d={STAR} />}
    </svg>
  );
}
