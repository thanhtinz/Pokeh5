# Security findings in the shipped portal

The release's `www/` directory is the only component with source, and it had
several holes that were exploitable without an account. This is what was found
and what `portal/` does instead.

## 1. GM panel: authentication bypass — critical

`www/gm/insert.php`:

```php
if(isset($_SESSION['uid']) or isset($_POST['act'])){
```

The `or` makes the session check pointless. Any unauthenticated request
carrying an `act` field passes, so anyone who found the URL could grant
arbitrary items to any character:

```
POST /gm/insert.php
act=gui_mail&nguoinhan=1001&nguoigui=x&items=<anything>&server=1&tieude=x&mota=x
```

`www/gm/search-items.php` had no session check at all.

**Now:** every GM endpoint calls `requireAdmin()` as its first statement,
before the request body is read. `portal/tests/smoke.sh` fires the exact
payload above and asserts a 403.

## 2. SQL injection — every query

None of the queries used parameters. `htmlspecialchars()` was applied in a few
places, but that escapes HTML, not SQL:

```php
$user = htmlspecialchars($_POST['user']);
$read = mysqli_fetch_array(mysqli_query($conn,
    "SELECT * FROM t_account WHERE account='$user'"));
```

Reachable from the login form, gift claims, GM mail and item search.

**Now:** PDO with `ATTR_EMULATE_PREPARES => false`, so parameters are never
assembled into the SQL text. The smoke test submits `' OR '1'='1` as a username
and asserts it does not log in.

## 3. Database credentials in tracked source

`www/connect.php` and `www/gm/set.php` both connected as MySQL **root** with
the password in the file — and the file sat inside the web root.

**Now:** credentials come from `portal/config/config.php` (git-ignored) or
environment variables. `deploy/mysql/init/04-grants.sql.example` narrows the
runtime user to `SELECT` on accounts plus `INSERT` on the gift and mail tables.
nginx refuses to serve `config/`, `src/`, `bin/`, `sql/` and `tests/` at all.

## 4. Gift claims: a race condition

`giftcode/nhanqua.php` checked for an existing claim with a `SELECT`, then
inserted. `x_keygift` had no unique key, so simultaneous requests all passed
the check and all received the reward.

**Now:** `portal/sql/portal.sql` adds `UNIQUE KEY (uid, keygift)` and the claim
runs in a transaction that treats the constraint violation as "already
claimed". The smoke test fires ten claims at once and asserts exactly one wins.

## 5. No CSRF protection anywhere

No token on login, gift claims or any GM action. Any page on the internet could
make a logged-in admin send items.

**Now:** a per-session token on every state-changing request, cookies set
`SameSite=Lax`, `HttpOnly`, and `Secure` when `SECURE_COOKIES=true`.

## 6. Smaller issues

- `xuly.php` echoed the failed SQL query into the page via `console.log`,
  leaking the schema. Errors now go to the server log only.
- `error_reporting(0)` hid real faults from the operator too.
- Login distinguished "no such account" from "wrong password", enumerating
  valid accounts. One message now covers both, and attempts are rate limited.
- Session ids were never regenerated on login, allowing fixation.
- phpMyAdmin was bundled inside the web root. It is not carried over, and the
  nginx config blocks the path in case the original files are restored.

## The one thing that could not be fixed

`t_account.password` is `CHAR(32)` holding an unsalted MD5, and the
closed-source .NET services read and write that same column. Upgrading it to
bcrypt would lock every player out of the game itself, so player login still
verifies MD5 — through a prepared statement, with a constant-time comparison
and rate limiting, but MD5 all the same.

Portal administrators are a separate table (`x_portal_admin`) that nothing but
this project touches, so those passwords use bcrypt at cost 12.

Changing player password storage properly requires either the server source or
an authentication shim in front of it. Until then, treat player passwords as
recoverable by anyone who obtains a database dump, and tell players not to
reuse a password they use elsewhere.

## Before exposing this publicly

- Put it behind HTTPS and set `SECURE_COOKIES=true`.
- Change every credential in `docs/INVENTORY.md`.
- Keep MySQL bound to loopback; the compose file already does.
- Do not run `环境/常用环境.exe` or the service binaries on a machine holding
  anything you care about — they are unvetted executables from a redistributed
  package, and nobody in this chain has audited them.
