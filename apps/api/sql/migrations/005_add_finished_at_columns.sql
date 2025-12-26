-- 添加采集表缺失的 finished_at 列
ALTER TABLE `bb_collect_run` ADD COLUMN `finished_at` int unsigned NOT NULL DEFAULT 0 COMMENT '完成时间' AFTER `started_at`;
ALTER TABLE `bb_collect_task` ADD COLUMN `finished_at` int unsigned NOT NULL DEFAULT 0 COMMENT '完成时间' AFTER `started_at`;
