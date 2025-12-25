-- Add cron field to bb_collect_job table if it doesn't exist
ALTER TABLE `bb_collect_job` ADD COLUMN `cron` varchar(64) NOT NULL DEFAULT '' COMMENT 'cron expression for scheduling' AFTER `filter_keywords`;
