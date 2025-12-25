-- 支持多线路并发采集和断点续采
-- 添加采集任务表，支持按线路和页码进行断点续采

CREATE TABLE IF NOT EXISTS `bb_collect_task` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `run_id` bigint unsigned NOT NULL COMMENT '采集运行ID',
  `source_id` int unsigned NOT NULL COMMENT '采集源ID',
  `status` tinyint unsigned NOT NULL DEFAULT 0 COMMENT '0=pending,1=running,2=done,3=failed',
  `current_page` int unsigned NOT NULL DEFAULT 1 COMMENT '当前页码',
  `total_pages` int unsigned NOT NULL DEFAULT 0 COMMENT '总页数',
  `created_count` int unsigned NOT NULL DEFAULT 0 COMMENT '新增数量',
  `updated_count` int unsigned NOT NULL DEFAULT 0 COMMENT '更新数量',
  `error_count` int unsigned NOT NULL DEFAULT 0 COMMENT '错误数量',
  `error_message` varchar(500) NOT NULL DEFAULT '' COMMENT '错误信息',
  `started_at` int unsigned NOT NULL DEFAULT 0,
  `finished_at` int unsigned NOT NULL DEFAULT 0,
  `created_at` int unsigned NOT NULL DEFAULT 0,
  `updated_at` int unsigned NOT NULL DEFAULT 0,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uniq_run_source` (`run_id`, `source_id`),
  KEY `idx_run_status` (`run_id`, `status`),
  KEY `idx_source_status` (`source_id`, `status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='采集任务表（支持多线路并发）';

-- 记录已采集的资源，避免重复采集
CREATE TABLE IF NOT EXISTS `bb_collect_record` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `task_id` bigint unsigned NOT NULL COMMENT '采集任务ID',
  `source_id` int unsigned NOT NULL COMMENT '采集源ID',
  `remote_id` varchar(100) NOT NULL COMMENT '远程资源ID',
  `local_id` int unsigned COMMENT '本地资源ID',
  `is_new` tinyint unsigned NOT NULL DEFAULT 1 COMMENT '1=新增,0=更新',
  `created_at` int unsigned NOT NULL DEFAULT 0,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uniq_source_remote` (`source_id`, `remote_id`),
  KEY `idx_task_id` (`task_id`),
  KEY `idx_source_id` (`source_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='采集记录表';

-- 修改 bb_collect_run 表，添加统计字段
ALTER TABLE `bb_collect_run` ADD COLUMN `total_created_count` int unsigned NOT NULL DEFAULT 0 COMMENT '总新增数量' AFTER `created_count`;
ALTER TABLE `bb_collect_run` ADD COLUMN `total_updated_count` int unsigned NOT NULL DEFAULT 0 COMMENT '总更新数量' AFTER `total_created_count`;
ALTER TABLE `bb_collect_run` ADD COLUMN `total_error_count` int unsigned NOT NULL DEFAULT 0 COMMENT '总错误数量' AFTER `total_updated_count`;

-- 添加索引以提高查询性能
ALTER TABLE `bb_collect_run` ADD KEY `idx_created_at` (`created_at`);
ALTER TABLE `bb_collect_task` ADD KEY `idx_created_at` (`created_at`);
