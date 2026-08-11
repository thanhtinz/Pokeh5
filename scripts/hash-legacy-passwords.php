<?php

declare(strict_types=1);

/**
 * Hash the clear-text passwords left over from the 2019 database.
 *
 * Run after db/migrations/001_modernise_auth.sql has widened the column:
 *
 *   php scripts/hash-legacy-passwords.php --dry-run
 *   php scripts/hash-legacy-passwords.php
 *
 * Rows that already hold a password_hash() value are skipped, so the script is
 * safe to re-run. Guest characters, whose password is the empty string, are
 * left alone - they get a hash when they verify their account.
 *
 * Auth::verify() also accepts clear text and bare md5 for accounts that have
 * not been converted yet, so logins keep working while this runs; the script
 * exists so that the clear text does not sit in the table indefinitely.
 */

require_once \dirname(__DIR__) . '/app/bootstrap.php';

use Pokeh5\Auth;
use Pokeh5\Database;

$dryRun = \in_array('--dry-run', $_SERVER['argv'], true);

$columnLength = Database::value(
    'SELECT CHARACTER_MAXIMUM_LENGTH
       FROM information_schema.columns
      WHERE table_schema = DATABASE()
        AND table_name = ?
        AND column_name = ?',
    ['users', 'password']
);

if ($columnLength !== null && (int) $columnLength < 60) {
    \fwrite(\STDERR, "users.password is only {$columnLength} characters wide; bcrypt needs 60.\n");
    \fwrite(\STDERR, "Run db/migrations/001_modernise_auth.sql first.\n");
    exit(1);
}

$rows = Database::all('SELECT `id`, `password` FROM `users` WHERE `password` <> ?', ['']);

$converted = 0;
$skipped   = 0;

foreach ($rows as $row) {
    $stored = (string) $row['password'];

    if (Auth::isHashed($stored)) {
        $skipped++;
        continue;
    }

    $converted++;

    if (!$dryRun) {
        Database::run(
            'UPDATE `users` SET `password` = ? WHERE `id` = ?',
            [Auth::hash($stored), (int) $row['id']]
        );
    }
}

echo ($dryRun ? 'would hash ' : 'hashed ') . $converted . " password(s)\n";
echo "already hashed: {$skipped}\n";
