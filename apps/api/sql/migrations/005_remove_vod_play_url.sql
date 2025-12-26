SET @col_exists = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'bb_vod' AND COLUMN_NAME = 'vod_play_url' AND TABLE_SCHEMA = DATABASE());
SET @sql = IF(@col_exists > 0, 'ALTER TABLE `bb_vod` DROP COLUMN `vod_play_url`', 'SELECT 1');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;
