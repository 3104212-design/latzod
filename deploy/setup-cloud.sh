#!/usr/bin/env bash
# הקמה חד פעמית של האתר בשרת הענן (אפשר להריץ שוב בבטחה).
#   bash deploy/setup-cloud.sh
# 1. שומר עותק של /etc/caddy/Caddyfile
# 2. מעתיק את deploy/latzod.caddy ל-/etc/caddy/sites/
# 3. מוסיף ל-Caddyfile את השורה import /etc/caddy/sites/*.caddy (אם אינה שם)
# 4. בודק את ההגדרות, ורק אם הן תקינות טוען אותן מחדש. אחרת מחזיר את העותק.
# רשת הסוכנים ממשיכה לרוץ כרגיל: Caddy נטען מחדש בלי הפסקה, והשירות atn לא מופעל מחדש.
set -euo pipefail

HOST="${LATZOD_HOST:-64.176.173.124}"
KEY="${LATZOD_KEY:-$HOME/.ssh/atn_cloud}"
ROOT="$(cd "$(dirname "$0")/.." && pwd)"

ssh -i "$KEY" -o BatchMode=yes -o ConnectTimeout=20 "root@$HOST" 'bash -s' <<EOF
set -euo pipefail
STAMP=\$(date +%Y%m%d-%H%M%S)
cp -a /etc/caddy/Caddyfile /etc/caddy/Caddyfile.bak-\$STAMP
mkdir -p /etc/caddy/sites /opt/latzod/releases
cat > /etc/caddy/sites/latzod.caddy <<'CADDY'
$(cat "$ROOT/deploy/latzod.caddy")
CADDY
grep -qxF 'import /etc/caddy/sites/*.caddy' /etc/caddy/Caddyfile || printf '\nimport /etc/caddy/sites/*.caddy\n' >> /etc/caddy/Caddyfile
if caddy validate --config /etc/caddy/Caddyfile --adapter caddyfile >/tmp/latzod-validate.log 2>&1; then
  systemctl reload caddy
  echo "ההגדרות תקינות ונטענו. עותק: /etc/caddy/Caddyfile.bak-\$STAMP"
else
  cp -a /etc/caddy/Caddyfile.bak-\$STAMP /etc/caddy/Caddyfile
  rm -f /etc/caddy/sites/latzod.caddy
  echo "ההגדרות לא תקינות, הכל הוחזר:"; tail -5 /tmp/latzod-validate.log; exit 1
fi
EOF
