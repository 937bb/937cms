-- Search Optimization Migration
-- Adds full-text search indexes and composite indexes for better search performance

-- Add full-text search index on VOD table
ALTER TABLE `bb_vod` ADD FULLTEXT INDEX `ft_vod_name` (`vod_name`);
ALTER TABLE `bb_vod` ADD FULLTEXT INDEX `ft_vod_search` (`vod_name`, `vod_en`, `vod_actor`, `vod_director`);

-- Add composite indexes for common search patterns
ALTER TABLE `bb_vod` ADD KEY `idx_status_type_name` (`vod_status`, `type_id`, `vod_name`);
ALTER TABLE `bb_vod` ADD KEY `idx_status_level_time` (`vod_status`, `vod_level`, `vod_time`);
ALTER TABLE `bb_vod` ADD KEY `idx_type_status_time` (`type_id`, `vod_status`, `vod_time`);

-- Add full-text search index on article table
ALTER TABLE `bb_article` ADD FULLTEXT INDEX `ft_article_name` (`name`);
ALTER TABLE `bb_article` ADD FULLTEXT INDEX `ft_article_search` (`name`, `tag`);

-- Add composite indexes for article search
ALTER TABLE `bb_article` ADD KEY `idx_status_type_name` (`status`, `type_id`, `name`);
ALTER TABLE `bb_article` ADD KEY `idx_status_time` (`status`, `created_at`);
