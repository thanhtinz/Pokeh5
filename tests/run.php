<?php

declare(strict_types=1);

/**
 * Test suite.
 *
 *   php tests/run.php
 *
 * Needs a database reachable through the usual config (env or
 * config.local.php) with the schema from db/. Rows created here are prefixed
 * ZZTest and removed afterwards.
 */

require_once \dirname(__DIR__) . '/app/bootstrap.php';

use Pokeh5\Auth;
use Pokeh5\Database;
use Pokeh5\Legacy\Result;
use Pokeh5\Realtime\Bus;

$passed = 0;
$failed = 0;

function test(string $name, callable $body): void
{
    global $passed, $failed;

    try {
        $body();
        $passed++;
        echo "  ok    {$name}\n";
    } catch (\Throwable $e) {
        $failed++;
        echo "  FAIL  {$name}\n";
        echo '        ' . $e->getMessage() . "\n";
    }
}

function assertTrue(mixed $value, string $message = 'expected true'): void
{
    if ($value !== true) {
        throw new \RuntimeException($message . ', got ' . \var_export($value, true));
    }
}

function assertSame(mixed $expected, mixed $actual, string $message = 'mismatch'): void
{
    if ($expected !== $actual) {
        throw new \RuntimeException(
            $message . ': expected ' . \var_export($expected, true)
            . ', got ' . \var_export($actual, true)
        );
    }
}

function cleanup(): void
{
    Database::run('DELETE FROM `users` WHERE `username` LIKE ?', ['ZZTest%']);
}

cleanup();

echo "auth\n";

test('createCharacter writes a complete row under strict SQL mode', function (): void {
    $id  = Auth::createCharacter('ZZTestHero', 'Hero-Male.png');
    $row = Database::first('SELECT * FROM `users` WHERE `id` = ?', [$id]);

    assertTrue($row !== null, 'row should exist');
    assertSame('ZZTestHero', $row['username']);
    assertSame(1, (int) $row['test'], 'new characters start unverified');
    assertSame(1, (int) $row['level']);
    assertSame($id, (int) $row['user_id'], 'user_id mirrors id');
});

test('character names must be unique', function (): void {
    assertTrue(Auth::characterNameTaken('ZZTestHero'));
    assertSame(false, Auth::characterNameTaken('ZZTestNobody'));
});

test('name validation matches the documented rule', function (): void {
    assertTrue(Auth::isValidName('Player1'));
    assertSame(false, Auth::isValidName('abc'), 'too short');
    assertSame(false, Auth::isValidName('1player'), 'must start with a letter');
    assertSame(false, Auth::isValidName('has space'));
    assertSame(false, Auth::isValidName('waytoolongusernamehere'));
});

test('linkAccount stores a hash, never the password', function (): void {
    $id = (int) Database::value('SELECT `id` FROM `users` WHERE `username` = ?', ['ZZTestHero']);
    Auth::linkAccount($id, 'ZZTestAcct', 'hunter2x');

    $stored = (string) Database::value('SELECT `password` FROM `users` WHERE `id` = ?', [$id]);

    assertTrue(Auth::isHashed($stored));
    assertSame(false, \str_contains($stored, 'hunter2x'));
});

test('login accepts the right password and rejects everything else', function (): void {
    assertTrue(Auth::login('ZZTestAcct', 'hunter2x') !== null);
    assertSame(null, Auth::login('ZZTestAcct', 'wrong'));
    assertSame(null, Auth::login('ZZTestNoSuchAccount', 'hunter2x'));
});

test('an empty login does not match guest characters', function (): void {
    // Guests have taikhoan = '', so an empty submitted login must not be
    // treated as a match for the first such row.
    assertSame(null, Auth::login('', ''));
    assertSame(null, Auth::login('', 'anything'));
});

test('legacy clear-text passwords still log in and are rehashed', function (): void {
    $id = (int) Database::value('SELECT `id` FROM `users` WHERE `taikhoan` = ?', ['ZZTestAcct']);
    Database::run('UPDATE `users` SET `password` = ? WHERE `id` = ?', ['oldplain', $id]);

    assertTrue(Auth::login('ZZTestAcct', 'oldplain') !== null);

    $after = (string) Database::value('SELECT `password` FROM `users` WHERE `id` = ?', [$id]);
    assertTrue(Auth::isHashed($after), 'should be upgraded in place on login');
});

test('legacy md5 passwords still log in and are rehashed', function (): void {
    $id = (int) Database::value('SELECT `id` FROM `users` WHERE `taikhoan` = ?', ['ZZTestAcct']);
    Database::run('UPDATE `users` SET `password` = ? WHERE `id` = ?', [\md5('md5pass'), $id]);

    assertTrue(Auth::login('ZZTestAcct', 'md5pass') !== null);

    $after = (string) Database::value('SELECT `password` FROM `users` WHERE `id` = ?', [$id]);
    assertTrue(Auth::isHashed($after));
});

test('a quote in the login name cannot break out of the query', function (): void {
    assertSame(null, Auth::login("' OR '1'='1", 'x'));
    assertTrue(
        (int) Database::value('SELECT COUNT(*) FROM `users`') > 0,
        'table should still be there'
    );
});

echo "\nlegacy mysql_* shim\n";

test('mysql_query returns a seekable, countable result', function (): void {
    $result = mysql_query('SELECT `id`, `username` FROM `users` WHERE `username` LIKE \'ZZTest%\' ORDER BY `id`');

    assertTrue($result instanceof Result);
    assertSame(1, mysql_num_rows($result));

    $row = mysql_fetch_assoc($result);
    assertSame('ZZTestHero', $row['username']);

    assertSame(false, mysql_fetch_assoc($result), 'cursor is exhausted');
    assertTrue(mysql_data_seek($result, 0), 'and can be rewound');
    assertSame('ZZTestHero', mysql_fetch_assoc($result)['username']);
});

test('mysql_fetch_array exposes columns by name and by position', function (): void {
    $result = mysql_query('SELECT `id`, `username` FROM `users` WHERE `username` = \'ZZTestHero\'');
    $row    = mysql_fetch_array($result);

    assertSame($row['username'], $row[1]);
});

test('mysql_query returns true for writes and false for bad SQL', function (): void {
    assertSame(true, mysql_query('UPDATE `users` SET `xu` = 5 WHERE `username` = \'ZZTestHero\''));
    assertSame(false, mysql_query('SELECT * FROM `table_that_does_not_exist`'));
    assertTrue(mysql_error() !== '', 'the error is recorded');
});

test('mysql_real_escape_string neutralises a quote', function (): void {
    assertSame("O\\'Brien", mysql_real_escape_string("O'Brien"));
});

test('mysql_result reads a single cell', function (): void {
    $result = mysql_query('SELECT COUNT(*) FROM `users` WHERE `username` LIKE \'ZZTest%\'');
    assertSame('1', (string) mysql_result($result, 0));
});

echo "\nrealtime bus\n";

test('published events come back for a later subscriber cursor', function (): void {
    $bus = new Bus(\sys_get_temp_dir() . '/pokeh5-test-bus-' . \getmypid());
    $bus->reset();

    $first = $bus->publish('chat', ['text' => 'xin chao'], 1);
    $bus->publish('chat', ['text' => 'lan hai'], 1);

    $events = $bus->since($first - 1, null);

    assertSame(2, \count($events));
    assertSame('xin chao', $events[0]['data']['text']);
    assertSame('lan hai', $events[1]['data']['text']);

    // Nothing newer than the last id.
    assertSame(0, \count($bus->since($events[1]['id'], null)));

    $bus->reset();
});

test('direct events only reach their addressee', function (): void {
    $bus = new Bus(\sys_get_temp_dir() . '/pokeh5-test-bus-' . \getmypid());
    $bus->reset();

    $bus->publish('pvp_moi', ['from' => 7], 7, 42);

    assertSame(1, \count($bus->since(0, 42)), 'the addressee sees it');
    assertSame(0, \count($bus->since(0, 43)), 'nobody else does');

    $bus->reset();
});

test('presence lists players on the same map and expires them', function (): void {
    $bus = new Bus(\sys_get_temp_dir() . '/pokeh5-test-bus-' . \getmypid());
    $bus->reset();

    $bus->touchPresence(1, ['name' => 'A', 'map' => 3]);
    $bus->touchPresence(2, ['name' => 'B', 'map' => 3]);
    $bus->touchPresence(3, ['name' => 'C', 'map' => 9]);

    assertSame(2, \count($bus->presence(3)));
    assertSame(3, \count($bus->presence(null)));

    $bus->forget(2);
    assertSame(1, \count($bus->presence(3)));

    $bus->reset();
});

cleanup();

echo "\n{$passed} passed, {$failed} failed\n";

exit($failed === 0 ? 0 : 1);
