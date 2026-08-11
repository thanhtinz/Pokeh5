# Pokeh5

Browser-based multiplayer Pokémon game in PHP. Originally built in 2019 by
Trần Đỗ Đức Nghĩa against PHP 5.6, MySQL and a Node/socket.io server; this
repository is that code brought up to PHP 8.3+ with the realtime layer
rebuilt on Server-Sent Events.

## Requirements

| | |
|---|---|
| PHP | 8.3 or newer, with `pdo_mysql` |
| Database | MySQL 8.0 or MariaDB 10.6+ |
| Web server | Apache with `mod_rewrite`, or nginx (see below) |

No Node.js, no WebSocket server, no message broker.

## Install

```bash
git clone https://github.com/thanhtinz/Pokeh5.git
cd Pokeh5

# 1. Sprite pack (~218 MB, shipped as a release asset)
scripts/fetch-assets.sh

# 2. Database
mysql -e "CREATE DATABASE pokemon CHARACTER SET utf8mb4"
mysql pokemon < pokemon.sql                       # from the release
mysql pokemon < db/migrations/001_modernise_auth.sql

# 3. Credentials
cp config.local.example.php config.local.php      # then edit it
#    or set DB_HOST / DB_NAME / DB_USER / DB_PASS in the environment

# 4. Convert the 2019 clear-text passwords
php scripts/hash-legacy-passwords.php --dry-run
php scripts/hash-legacy-passwords.php

# 5. Check
php tests/run.php
```

`index.php` starts with a maintenance notice that stops the game before it
loads. Delete those first two lines to open the server.

### Running it locally

```bash
php -S 127.0.0.1:8000 -t . scripts/dev-router.php
```

The router is required: `php -S` does not read `.htaccess`, and the game boots
by pointing an iframe at `/game.json`, which only resolves through a rewrite.
Without it you get the background art and nothing else.

## How multiplayer works

The game used to open a WebSocket to a Node/socket.io process. That process
was never published, and the only reference to it in the source was the
placeholder URL `URLSOCKEY`. It has been replaced by two plain PHP endpoints:

```
socket.emit(name, ...args)   ->  POST realtime/publish.php
socket.on(name, handler)     ->  EventSource realtime/stream.php
```

`sql/realtime.js` keeps the `socket.emit()` / `socket.on()` surface, so the
call sites in `sql/data.js`, `sql/npm.js` and `style/js2.php` are unchanged.
`EventSource` reconnects on its own and resumes from `Last-Event-ID`.

State lives in `storage/realtime/`: an append-only event log and a presence
table, both written under `flock` and pruned on a retention window. Chat, PVP
invites and kicks flow through the log; the player list is presence, pushed on
a one-second timer.

**Each open stream holds one PHP worker for its lifetime.** Streams close
after 30 seconds and the client reconnects, so a worker is freed regularly,
but the pool still has to be sized for concurrent players. With PHP-FPM,
`pm.max_children` needs to comfortably exceed your peak player count. If you
outgrow that, `realtime.stream_ttl` can be lowered to recycle workers faster,
at the cost of more reconnects.

### nginx

```nginx
location /realtime/stream.php {
    include        fastcgi_params;
    fastcgi_pass   unix:/run/php/php8.3-fpm.sock;
    fastcgi_param  SCRIPT_FILENAME $document_root$fastcgi_script_name;

    # Without these the response is buffered and nothing arrives until the
    # connection closes.
    fastcgi_buffering    off;
    gzip                 off;
    fastcgi_read_timeout 120s;
}

location ~ ^/(storage|app|scripts|tests|db)/ { return 404; }
location = /config.local.php { return 404; }
```

## Configuration

`app/Config.php` reads the environment first, then a gitignored
`config.local.php` at the project root, which returns an array of overrides.

| Key | Default | |
|---|---|---|
| `db.host` `db.port` `db.name` `db.user` `db.pass` | | also `DB_*` env vars |
| `debug` | `false` | on: errors to the page. Leave off in production - warnings printed mid-response corrupt the JSON the client parses |
| `realtime.stream_ttl` | `30` | seconds a stream stays open |
| `realtime.presence_ttl` | `30` | seconds before an idle player drops off the online list |
| `realtime.retention` | `120` | seconds of event log kept |
| `storage.path` | `storage/` | must be writable by the web server |

## Layout

```
app/            PHP 8 core: Config, Database (PDO), Auth, Realtime, bootstrap
app/Legacy/     ext/mysql reimplemented on PDO
realtime/       SSE stream and publish endpoints
data/           front controller and the AJAX handlers
templates/      config, shared library, page chrome, the game's classes
attack/ xml/    battle system
sql/ UIs/       client-side JavaScript
maps/           map XML
db/migrations/  schema changes
scripts/        codemods and one-off maintenance tools
tests/          php tests/run.php
```

## Notes on the port

The 2019 code does not run on any supported PHP release. What was in the way:

- **`ext/mysql` was removed in PHP 7.0**, and the game calls it ~1,650 times.
  `app/Legacy/mysql.php` reimplements the functions on the PDO handle, so the
  call sites keep working while running on a modern driver. New code should
  use `Pokeh5\Database` with bound parameters instead.
- **PHP 4 constructors were removed in PHP 8.** `new user($id)` ran no
  constructor and handed back an empty object, so character state was read
  from and written to nothing.
- **Bareword array keys** (`$_POST[taikhoan]`) are a fatal `Undefined
  constant` error since PHP 8. 844 of them.
- **Short open tags** are off by default, which left whole `<? ... ?>` blocks
  emitted as HTML instead of executed.
- **Property auto-vivification was removed.** `$this->code->myip->{$ip} = ...`
  runs on every request and was failing every page with a 500.
- **Registration was rejected by strict SQL mode**, which MySQL 5.7 and
  MariaDB 10.2 turn on by default: the INSERT listed six of the table's
  columns and the rest are `NOT NULL` with no default. The return value was
  never checked, so players were told their character had been created while
  nothing was saved.

Passwords were stored, compared and displayed in clear text. They are hashed
now; `Auth::verify()` still accepts the old clear-text and md5 values so no
existing account is locked out, and upgrades them in place on next login.

The codemods under `scripts/codemod/` are token-stream rewrites, not regex,
and each takes `--dry-run`. They are kept in the repository so the mechanical
changes can be re-checked or re-applied.

## Credits

Original game by Trần Đỗ Đức Nghĩa. The battle engine descends from a Dutch
Pokémon codebase, which is why tables like `aanval`, `gebeurtenis` and
`pokemon_speler` still carry Dutch names.
