-- Auth modernisation.
--
-- Run once against an existing 2019 database:
--   mysql pokemon < db/migrations/001_modernise_auth.sql
--   php scripts/hash-legacy-passwords.php
--
-- `password` was varchar(32) holding the password in clear text. bcrypt
-- hashes are 60 characters, and future algorithms are longer still, so the
-- column is widened before scripts/hash-legacy-passwords.php rewrites the
-- stored values.
ALTER TABLE `users`
    MODIFY `password` VARCHAR(255) NOT NULL;

-- Login reads `users` by taikhoan (the login name) and by username (the
-- character name); registration checks both for collisions. The table only
-- had a primary key on `id`, so each of those was a full scan.
--
-- taikhoan is TEXT, which cannot be indexed without a prefix length; 64
-- characters is well beyond the 19 the validator allows.
ALTER TABLE `users`
    ADD INDEX `idx_users_taikhoan` (`taikhoan`(64)),
    ADD INDEX `idx_users_username` (`username`);
