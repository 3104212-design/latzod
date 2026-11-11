#!/usr/bin/env bash
# התקנה ועדכון של שירות ההזמנות בשרת הענן (אפשר להריץ שוב בבטחה: מעדכן את הקוד ומפעיל מחדש).
#   bash deploy/setup-invites.sh
# 1. מעתיק את server/invites.mjs ל-/opt/latzod/invites/ ואת היחידה ל-/etc/systemd/system/
# 2. מפעיל את השירות latzod-invites ובודק שהוא עונה מקומית
# 3. מעדכן את קובץ האתר של Caddy (עם /api), בודק את ההגדרות, ורק אם הן תקינות טוען מחדש.
#    אחרת מחזיר את הקובץ הקודם. רשת הסוכנים לא נוגעת כאן: Caddy נטען מחדש בלי הפסקה.
set -euo pipefail

HOST="${LATZOD_HOST:-64.176.173.124}"
KEY="${LATZOD_KEY:-$HOME/.ssh/atn_cloud}"
SITE="${LATZOD_SITE:-https://latzod.64-176-173-124.sslip.io}"
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
SSH=(ssh -i "$KEY" -o BatchMode=yes -o ConnectTimeout=20 "root@$HOST")

echo "== העתקת השירות"
"${SSH[@]}" 'mkdir -p /opt/latzod/invites'
"${SSH[@]}" 'cat > /opt/latzod/invites/invites.new.mjs' < "$ROOT/server/invites.mjs"
"${SSH[@]}" 'cat > /etc/systemd/system/latzod-invites.service.new' < "$ROOT/deploy/latzod-invites.service"
"${SSH[@]}" 'cat > /etc/caddy/sites/latzod.caddy.new' < "$ROOT/deploy/latzod.caddy"

"${SSH[@]}" 'bash -s' <<'EOF'
set -euo pipefail
node --check /opt/latzod/invites/invites.new.mjs
mv -f /opt/latzod/invites/invites.new.mjs /opt/latzod/invites/invites.mjs
chmod -R a+rX /opt/latzod/invites
mv -f /etc/systemd/system/latzod-invites.service.new /etc/systemd/system/latzod-invites.service
systemctl daemon-reload
systemctl enable latzod-invites >/dev/null 2>&1
systemctl restart latzod-invites
for i in $(seq 1 20); do
  curl -sf http://127.0.0.1:3741/api/health >/dev/null && break
  sleep 0.5
done
curl -sf http://127.0.0.1:3741/api/health >/dev/null || { echo "השירות לא עלה:"; journalctl -u latzod-invites -n 20 --no-pager; exit 1; }
echo "השירות פעיל"

echo "== Caddy"
STAMP=$(date +%Y%m%d-%H%M%S)
cp -a /etc/caddy/sites/latzod.caddy "/etc/caddy/sites/latzod.caddy.bak-$STAMP" 2>/dev/null || true
mv -f /etc/caddy/sites/latzod.caddy.new /etc/caddy/sites/latzod.caddy
if caddy validate --config /etc/caddy/Caddyfile --adapter caddyfile >/tmp/latzod-validate.log 2>&1; then
  systemctl reload caddy
  echo "ההגדרות תקינות ונטענו. עותק קודם: /etc/caddy/sites/latzod.caddy.bak-$STAMP"
else
  # מחזירים את קובץ האתר הקודם (לא מוחקים אותו: האתר ממשיך לעבוד)
  cp -a "/etc/caddy/sites/latzod.caddy.bak-$STAMP" /etc/caddy/sites/latzod.caddy
  echo "ההגדרות לא תקינות, הקובץ הקודם הוחזר:"; tail -5 /tmp/latzod-validate.log; exit 1
fi
# עותקי גיבוי: שומרים 5 אחרונים. הסיומת .bak-* לא נטענת (הייבוא הוא *.caddy)
ls -1 /etc/caddy/sites/latzod.caddy.bak-* 2>/dev/null | sort | head -n -5 | xargs -r rm -f
EOF

echo "== בדיקה"
code=$(curl -s -o /dev/null -w '%{http_code}' "$SITE/api/health")
echo "$SITE/api/health -> $code"
[[ "$code" == "200" ]] || { echo "ה-API לא עונה מבחוץ"; exit 1; }
"${SSH[@]}" 'test -f /var/lib/latzod-invites/setup-code.txt && echo "קוד ניהול ממתין לחיבור: /var/lib/latzod-invites/setup-code.txt" || echo "אין קוד ניהול ממתין (המנהל כבר מחובר)"'
