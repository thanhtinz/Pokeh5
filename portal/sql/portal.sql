-- Portal-owned schema. Everything here is prefixed `x_portal_` or is a table
-- the original portal author added (`x_keygift`, `x_listgift`, `list_items`);
-- none of it is touched by the closed-source .NET game services, which is what
-- makes it safe to change.
--
-- Apply after loading pokemon.sql and x_keygift.sql.

SET NAMES utf8mb4;

-- ---------------------------------------------------------------------------
-- Gift claims
--
-- The shipped table had no unique key, and the portal checked "already
-- claimed?" with a SELECT before the INSERT. Two requests arriving together
-- both passed the check and both handed out the reward. The constraint is what
-- actually prevents that; the application now relies on it rather than on a
-- read-then-write.
-- ---------------------------------------------------------------------------

-- Widths are narrowed to match `t_account.account` so the unique key fits well
-- inside the index limit without prefix lengths.
ALTER TABLE `x_keygift`
  MODIFY `uid` VARCHAR(64) COLLATE utf8mb4_vietnamese_ci NOT NULL,
  MODIFY `keygift` VARCHAR(100) COLLATE utf8mb4_vietnamese_ci NOT NULL;

-- Remove duplicates left behind by the old race before the key can be added.
DELETE k1 FROM `x_keygift` k1
  INNER JOIN `x_keygift` k2
  WHERE k1.id > k2.id AND k1.uid = k2.uid AND k1.keygift = k2.keygift;

ALTER TABLE `x_keygift`
  ADD UNIQUE KEY `uniq_claim` (`uid`, `keygift`);

-- `time` arrived as VARCHAR(20) holding formatted dates; a real column sorts
-- and compares correctly.
ALTER TABLE `x_keygift`
  MODIFY `time` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- ---------------------------------------------------------------------------
-- Portal administrators
--
-- Kept separate from `t_account` on purpose. Player passwords live in a
-- CHAR(32) MD5 column that the game services read and write, so the portal
-- cannot upgrade that format without locking players out of the game itself.
-- GM access is portal-only, so it gets bcrypt.
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `x_portal_admin` (
  `id` INT(11) NOT NULL AUTO_INCREMENT,
  `username` VARCHAR(64) NOT NULL,
  `password_hash` VARCHAR(255) NOT NULL,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uniq_username` (`username`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ---------------------------------------------------------------------------
-- Login throttling, for both player and admin logins.
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `x_portal_login_attempt` (
  `id_key` VARCHAR(96) NOT NULL,
  `attempts` INT(11) NOT NULL DEFAULT 0,
  `last_attempt` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id_key`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ---------------------------------------------------------------------------
-- Audit trail. Handing out items is irreversible from the player's side, so
-- every GM action is recorded with who did it.
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `x_portal_audit` (
  `id` INT(11) NOT NULL AUTO_INCREMENT,
  `admin_id` INT(11) NOT NULL,
  `admin_name` VARCHAR(64) NOT NULL,
  `action` VARCHAR(32) NOT NULL,
  `detail` TEXT,
  `time` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_time` (`time`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ---------------------------------------------------------------------------
-- Item lookup used by the GM panel.
--
-- The release references this table but never ships it: the original author
-- populated it from `gm/log.txt` with a throwaway script that was left
-- commented out. `portal/bin/import-items.php` does the same job properly.
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `list_items` (
  `uid` INT(11) NOT NULL,
  `name` VARCHAR(190) NOT NULL,
  PRIMARY KEY (`uid`),
  KEY `idx_name` (`name`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
