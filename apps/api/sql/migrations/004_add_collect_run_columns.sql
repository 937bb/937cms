-- 添加采集运行表缺失的列
ALTER TABLE `bb_collect_run` ADD COLUMN `created_count` int unsigned NOT NULL DEFAULT 0 COMMENT '新增数量' AFTER `updated_count`;
