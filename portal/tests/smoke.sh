#!/usr/bin/env bash
#
# End-to-end smoke test for the portal. Drives a real HTTP server with real
# cookies, so it exercises sessions, CSRF and the database the same way a
# browser would.
#
#   mariadb pokemon < portal/tests/fixtures.sql
#   BASE=http://127.0.0.1:8099 portal/tests/smoke.sh
#
# Load fixtures.sql first; it creates the `smoketester` account and the
# `smoke-a` / `smoke-b` codes this script uses, and resets them each run.
#
# For the race check to mean anything the server must handle requests
# concurrently. PHP's built-in server is single-threaded unless started with
# PHP_CLI_SERVER_WORKERS=4; behind nginx/php-fpm it is concurrent already.

set -uo pipefail

BASE="${BASE:-http://127.0.0.1:8099}"
JAR="$(mktemp)"
PASS=0
FAIL=0

cleanup() { rm -f "$JAR" "$JAR.admin"; }
trap cleanup EXIT

check() {
  local name="$1" expected="$2" actual="$3"
  if [ "$expected" = "$actual" ]; then
    printf '  ok   %-52s %s\n' "$name" "$actual"
    PASS=$((PASS + 1))
  else
    printf '  FAIL %-52s expected %s, got %s\n' "$name" "$expected" "$actual"
    FAIL=$((FAIL + 1))
  fi
}

contains() {
  local name="$1" needle="$2" haystack="$3"
  if printf '%s' "$haystack" | grep -qF -- "$needle"; then
    printf '  ok   %-52s\n' "$name"
    PASS=$((PASS + 1))
  else
    printf '  FAIL %-52s missing %q\n' "$name" "$needle"
    FAIL=$((FAIL + 1))
  fi
}

status() { curl -sS -o /dev/null -w '%{http_code}' -b "$JAR" -c "$JAR" "$@"; }
body() { curl -sS -b "$JAR" -c "$JAR" "$@"; }

# The token lives in a hidden input; scraping it is what a browser effectively
# does, and it proves the token is actually being issued.
csrf_from() { grep -o 'name="csrf" value="[^"]*"' | head -1 | cut -d'"' -f4; }

echo "== unauthenticated access =="
check "homepage"                        200 "$(status "$BASE/")"
check "giftcode redirects to login"     302 "$(status "$BASE/giftcode/")"
check "GM mail endpoint refuses"        403 "$(status -X POST -d 'act=gui_mail&nguoinhan=1001&items=1,999999' "$BASE/gm/send-mail.php")"
check "GM item search refuses"          403 "$(status -X POST -d 'keyword=vang' "$BASE/gm/search-items.php")"
check "gift claim refuses"              419 "$(status -X POST -d 'giftkey=smoke-a' "$BASE/giftcode/claim.php")"

echo
echo "== login =="
TOKEN="$(body "$BASE/login.php" | csrf_from)"
contains "login page issues a CSRF token" "$(printf '%.8s' "$TOKEN")" "$TOKEN"

check "login without CSRF is rejected"  419 "$(status -X POST -d 'account=smoketester&password=secret123' "$BASE/login.php")"

# A classic injection payload. With prepared statements it is just a username
# that does not exist, so the response is the ordinary failure page.
INJECT="$(body -X POST --data-urlencode "csrf=$TOKEN" \
  --data-urlencode "account=smoketester' OR '1'='1" --data-urlencode "password=x" "$BASE/login.php")"
contains "SQL injection in account does not log in" "Tài khoản hoặc mật khẩu không đúng" "$INJECT"

TOKEN="$(body "$BASE/login.php" | csrf_from)"
WRONG="$(body -X POST -d "csrf=$TOKEN" -d 'account=smoketester&password=wrong' "$BASE/login.php")"
contains "wrong password is rejected" "Tài khoản hoặc mật khẩu không đúng" "$WRONG"

TOKEN="$(body "$BASE/login.php" | csrf_from)"
check "correct password logs in"        302 "$(status -X POST -d "csrf=$TOKEN" -d 'account=smoketester&password=secret123' "$BASE/login.php")"
check "giftcode page now loads"         200 "$(status "$BASE/giftcode/")"

echo
echo "== gift claim =="
TOKEN="$(body "$BASE/giftcode/" | grep -o 'const CSRF = "[^"]*"' | cut -d'"' -f2)"
check "claim without CSRF is rejected"  419 "$(status -X POST -d 'giftkey=smoke-a' "$BASE/giftcode/claim.php")"

FIRST="$(body -X POST -d "csrf=$TOKEN" -d 'giftkey=smoke-a' "$BASE/giftcode/claim.php")"
contains "first claim succeeds" '"ok":true' "$FIRST"

SECOND="$(body -X POST -d "csrf=$TOKEN" -d 'giftkey=smoke-a' "$BASE/giftcode/claim.php")"
contains "second claim is refused" "đã nhận quà này rồi" "$SECOND"

UNKNOWN="$(body -X POST -d "csrf=$TOKEN" -d 'giftkey=does-not-exist' "$BASE/giftcode/claim.php")"
contains "unknown code is refused" "không tồn tại" "$UNKNOWN"

echo
echo "== concurrent claim =="
# Ten simultaneous claims of a fresh code. The unique key must let exactly one
# through; the old read-then-write let every racing request win.
for _ in $(seq 1 10); do
  curl -sS -b "$JAR" -X POST -d "csrf=$TOKEN" -d 'giftkey=smoke-b' \
    "$BASE/giftcode/claim.php" &
done > /tmp/portal-race.txt 2>&1
wait
WINNERS="$(grep -c '"ok":true' /tmp/portal-race.txt || true)"
check "exactly one of ten racing claims wins" 1 "$WINNERS"
rm -f /tmp/portal-race.txt

echo
echo "== summary =="
echo "  $PASS passed, $FAIL failed"
[ "$FAIL" -eq 0 ]
