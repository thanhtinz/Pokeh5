# Database seed files

Everything in this directory runs once, in filename order, the first time the
`db-data` volume is created. Copy the release's dumps in with these names:

```
cp /path/to/pokemon.sql      deploy/mysql/init/01-pokemon.sql
cp /path/to/x_keygift.sql    deploy/mysql/init/02-x_keygift.sql
cp portal/sql/portal.sql     deploy/mysql/init/03-portal.sql
cp deploy/mysql/init/04-grants.sql.example deploy/mysql/init/04-grants.sql
```

The dumps are **not** committed — they contain the previous operator's account
data. Take them from the release assets.

To re-seed after changing these files, remove the volume first:

```
docker compose -f deploy/docker-compose.yml down -v
```

That deletes every character and account in the database, so only do it on a
server you are still setting up.
