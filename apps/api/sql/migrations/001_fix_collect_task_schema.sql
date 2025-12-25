-- Fix bb_collect_task table schema to match service implementation
-- This migration updates the table structure to support run-based task tracking

-- Drop old table if it exists with wrong schema
DROP TABLE IF EXISTS `bb_collect_task_old`;

-- Rename current table to backup
ALTER TABLE `bb_collect_task` RENAME TO `bb_collect_task_old`;

-- Create new table with correct schema
CREATE TABLE `bb_collect_task` (
  `id` int unsigned NOT NULL AUTO_INCREMENT,
  `run_id` int unsigned NOT NULL DEFAULT 0 COMMENT '采集运行ID',
  `source_id` int unsigned NOT NULL DEFAULT 0 COMMENT '采集源ID',
  `status` tinyint unsigned NOT NULL DEFAULT 0 COMMENT '0=待处理,1=运行中,2=完成,3=失败',
  `started_at` int unsigned NOT NULL DEFAULT 0,
  `created_at` int unsigned NOT NULL DEFAULT 0,
  `updated_at` int unsigned NOT NULL DEFAULT 0,
  PRIMARY KEY (`id`),
  KEY `idx_run_id` (`run_id`),
  KEY `idx_source_id` (`source_id`),
  KEY `idx_status` (`status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='采集任务';

-- Drop backup table
DROP TABLE IF EXISTS `bb_collect_task_old`;
