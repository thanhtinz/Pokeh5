# What the release actually contains

Taken from <https://github.com/thanhtinz/Pokeh5/releases/tag/Source>. Read this
before planning work: two of the four components have no source code, which
decides what can and cannot be changed.

| Asset | Size | What it is | Source? |
| --- | --- | --- | --- |
| `XJLserver.rar` | 414 MB (3.1 GB extracted) | Game server + client + prebuilt apps | partial |
| `www.m.i.zip` | 13 MB | Web portal + a bundled phpMyAdmin | ✅ PHP source |
| `pokemon.sql` | 37 KB | Database, 46 tables, MySQL 5.7 | ✅ |
| `x_keygift.sql` | 2 KB | Gift code tables | ✅ |

## Inside `XJLserver.rar`

```
Run/            10 .NET Framework 4.5 Windows services   ❌ compiled binaries only
  AgentService/            AuthenticationService/
  DataStorageService/      PokemonGameService/
  HDGameService/           HuaXianGameService/
  MessengerService/        StaticResService/
  ManagementService/       wxTokenService/
client/Pokemon/            Egret Engine 5.2.3 web client  ❌ minified JS only
client/Pokemon_适配_BT/    High-rate ("BT") client variant ❌ minified JS only
test/Pokemon.apk           Prebuilt Android app
test/pokemon.ipa           Prebuilt iOS app
环境/常用环境.exe          Windows environment installer   ⚠ unvetted binary
www.zip                    Another copy of the web portal
```

The client has `tsconfig.json`, `egretProperties.json` and `wingProperties.json`
— the shape of an Egret project — but no `src/` directory. What ships is
`js/main.min_*.js`, a 2.5 MB minified bundle.

## What this means in practice

| You want to… | Possible? |
| --- | --- |
| Run the stack | ✅ Yes — Windows host for the services, this repo for everything else |
| Change the portal | ✅ Yes — it has source, and is rewritten in `portal/` |
| Change the database schema | ✅ Yes, for portal-owned tables |
| Rebuild the client from source | ❌ No source. Only hand-patching the minified bundle |
| Fix a server bug | ❌ Not without decompiling the .NET assemblies |
| Add a server feature | ❌ Same |
| Rebuild the APK | ⚠ Only by repackaging the existing web client — which `app/` does |

Recovering approximate C# with ILSpy or dnSpy is the only route to server-side
changes. Expect machine-generated code that does not build again without
substantial work.

## Extracting the archive

The RAR uses compression method `m3:25`. Debian and Ubuntu ship 7-Zip with the
RAR decoder removed (the `+dfsg` in `23.01+dfsg-11`), so `7z` extracts only the
few stored entries and reports `Unsupported Method` for the rest. libarchive
has its own RAR5 reader and works:

```bash
apt-get install -y libarchive-tools
bsdtar -xf XJLserver.rar
```

libarchive aborts the whole stream on a header it cannot parse, and this
archive has three such files. Exclude them and re-run — the archive is
non-solid, so already-extracted files are kept:

```bash
bsdtar -xf XJLserver.rar \
  --exclude '*.pdb' \
  --exclude 'XJLserver/Run/DataStorageService/Server.Protocol.dll' \
  --exclude 'XJLserver/Run/PokemonGameService/Server.Protocol.dll'
```

Those three are a debug symbol file and two copies of a DLL that also exists
under `Run/`, so nothing is actually lost.

## Hardcoded values worth knowing about

Found while surveying the package. Change all of them before running anything
publicly:

| Where | Value |
| --- | --- |
| `Run/PokemonGameService/PokemonGameService.cfg` | `server=192.168.31.188;uid=root;pwd=123456` |
| `client/Pokemon/js/main.min_*.js` | `Auth.$serverUrl = "http://xjl.zgymw.com:8000"` |
| `client/Pokemon/index.html` | `http://pokemon.qcymw.com/` (commented) |
| `www/connect.php`, `www/gm/set.php` | `mysqli_connect("localhost","root","12345678","pokemon")` |
| `www/*.php` | `103.195.236.201` in every nav link |
| `www/naptien.php` | A named individual's phone and bank account numbers |

The last one is somebody's personal data. It is not carried into `portal/`, and
you should not republish it.
