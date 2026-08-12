-- Fixtures for portal/tests/smoke.sh.
--
-- Self-contained on purpose: the test must not depend on whatever gift codes
-- happen to be in the operator's database, and must not disturb them either.
-- Everything here uses a `smoke-` prefix and is reset on each run.

SET NAMES utf8mb4;

-- Player account. `t_account.password` is CHAR(32) MD5 because the game
-- services own that column — see docs/SECURITY.md.
INSERT INTO t_account (account, password, pid, registerTime)
VALUES ('smoketester', MD5('secret123'), 990001, NOW())
ON DUPLICATE KEY UPDATE password = VALUES(password), pid = VALUES(pid);

-- Two codes: one for the ordinary claim path, one burned by the race test.
DELETE FROM x_listgift WHERE giftkey IN ('smoke-a', 'smoke-b');
INSERT INTO x_listgift (id, title, noidung, giftkey, thoigian, server, items) VALUES
  (990001, 'Smoke A', 'Fixture A', 'smoke-a', '', 1, '1;1000'),
  (990002, 'Smoke B', 'Fixture B', 'smoke-b', '', 1, '2;50');

-- Clear anything a previous run left behind.
DELETE FROM x_keygift WHERE uid = 'smoketester';
DELETE FROM t_player_mails WHERE pid = 990001;
DELETE FROM x_portal_login_attempt WHERE id_key IN ('smoketester', 'admin:smokeadmin');
