-- Fix bb_collect_type_bind table schema to match service implementation
-- This migration updates the table structure to support source-based type binding

-- Drop old table if it exists with wrong schema
DROP TABLE IF EXISTS `bb_collect_type_bind_old`;

-- Rename current table to backup
ALTER TABLE `bb_collect_type_bind` RENAME TO `bb_collect_type_bind_old`;

-- Create new table with correct schema
CREATE TABLE `bb_collect_type_bind` (
  `id` int unsigned NOT NULL AUTO_INCREMENT,
  `source_id` int unsigned NOT NULL DEFAULT 0 COMMENT '采集源ID',
  `remote_type_id` int unsigned NOT NULL DEFAULT 0 COMMENT '远程分类ID',
  `remote_type_name` varchar(128) NOT NULL DEFAULT '' COMMENT '远程分类名称',
  `local_type_id` smallint unsigned NOT NULL DEFAULT 0 COMMENT '本地分类ID',
  `created_at` int unsigned NOT NULL DEFAULT 0,
  `updated_at` int unsigned NOT NULL DEFAULT 0,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uniq_source_remote` (`source_id`, `remote_type_id`),
  KEY `idx_source_id` (`source_id`),
  KEY `idx_local_type_id` (`local_type_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='采集类型绑定';

-- Drop backup table
DROP TABLE IF EXISTS `bb_collect_type_bind_old`;
