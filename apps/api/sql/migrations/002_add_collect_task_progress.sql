-- 添加采集任务进度字段
ALTER TABLE `bb_collect_task` ADD COLUMN `current_page` int unsigned NOT NULL DEFAULT 1 COMMENT '当前页码' AFTER `status`;
ALTER TABLE `bb_collect_task` ADD COLUMN `total_pages` int unsigned NOT NULL DEFAULT 0 COMMENT '总页数' AFTER `current_page`;
