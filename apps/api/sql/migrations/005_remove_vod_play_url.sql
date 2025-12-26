-- Remove vod_play_url column from bb_vod table
-- This field has been moved to bb_vod_episode table

ALTER TABLE `bb_vod` DROP COLUMN `vod_play_url`;
