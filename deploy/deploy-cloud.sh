#!/usr/bin/env bash
# העלאת האתר לשרת הענן (אותו שרת של רשת הסוכנים, בכתובת נפרדת).
#   bash deploy/deploy-cloud.sh            בנייה, העלאה ומעבר לגרסה החדשה
#   bash deploy/deploy-cloud.sh --rollback חזרה לגרסה הקודמת
# כל גרסה נשמרת בתיקייה משלה ב-/opt/latzod/releases, ו-/opt/latzod/current מצביע על הפעילה.
# נשמרות 5 הגרסאות האחרונות. רשת הסוכנים עצמה לא נוגעת כאן.
set -euo pipefail

HOST="${LATZOD_HOST:-64.176.173.124}"
KEY="${LATZOD_KEY:-$HOME/.ssh/atn_cloud}"
SITE="${LATZOD_SITE:-https://latzod.64-176-173-124.sslip.io}"
SSH=(ssh -i "$KEY" -o BatchMode=yes -o ConnectTimeout=20 "root@$HOST")
ROOT="$(cd "$(dirname "$0")/.." && pwd)"

if [[ "${1:-}" == "--rollback" ]]; then
  "${SSH[@]}" 'set -e; cd /opt/latzod/releases
    cur=$(basename "$(readlink -f /opt/latzod/current)")
    prev=$(ls -1 | sort | grep -B1 -x "$cur" | head -1)
    [ -n "$prev" ] && [ "$prev" != "$cur" ] || { echo "אין גרסה קודמת"; exit 1; }
    ln -sfn "/opt/latzod/releases/$prev" /opt/latzod/current.tmp && mv -T /opt/latzod/current.tmp /opt/latzod/current
    echo "חזרה ל-$prev"'
  exit 0
fi

cd "$ROOT"
echo "== בנייה"
npm run build >/dev/null

STAMP="$(date +%Y%m%d-%H%M%S)"
echo "== העלאה ($STAMP)"
tar -C dist -czf - . | "${SSH[@]}" "set -e
  mkdir -p /opt/latzod/releases/$STAMP
  tar -xzf - -C /opt/latzod/releases/$STAMP
  chmod -R a+rX /opt/latzod
  test -f /opt/latzod/releases/$STAMP/index.html
  ln -sfn /opt/latzod/releases/$STAMP /opt/latzod/current.tmp && mv -T /opt/latzod/current.tmp /opt/latzod/current
  cd /opt/latzod/releases && ls -1 | sort | head -n -5 | xargs -r rm -rf
  echo \"פעיל: \$(readlink /opt/latzod/current)\""

echo "== בדיקה"
code=$(curl -s -o /dev/null -w '%{http_code}' "$SITE/")
sw=$(curl -s "$SITE/sw.js" | grep -o "latzod-[0-9]*" || true)
echo "$SITE -> $code ($sw)"
[[ "$code" == "200" ]] || { echo "האתר לא עונה כמו שצריך"; exit 1; }
