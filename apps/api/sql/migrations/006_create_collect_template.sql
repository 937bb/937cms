-- 采集模板表
CREATE TABLE IF NOT EXISTS `bb_collect_template` (
  `id` int unsigned NOT NULL AUTO_INCREMENT,
  `name` varchar(128) NOT NULL COMMENT '模板名称',
  `type` tinyint unsigned NOT NULL COMMENT '采集类型: 1=VOD, 2=Article, 3=Actor',
  `description` text COMMENT '模板描述',
  `config` json NOT NULL COMMENT '模板配置 (JSON)',
  `status` tinyint unsigned NOT NULL DEFAULT 1 COMMENT '状态: 0=禁用, 1=启用',
  `created_at` int unsigned NOT NULL DEFAULT 0,
  `updated_at` int unsigned NOT NULL DEFAULT 0,
  PRIMARY KEY (`id`),
  KEY `idx_type_status` (`type`, `status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='采集模板表';

-- 采集模板字段映射表
CREATE TABLE IF NOT EXISTS `bb_collect_template_field` (
  `id` int unsigned NOT NULL AUTO_INCREMENT,
  `template_id` int unsigned NOT NULL,
  `field_name` varchar(64) NOT NULL COMMENT '字段名',
  `xpath` varchar(255) NOT NULL COMMENT 'XPath 表达式',
  `regex` varchar(255) COMMENT '正则表达式',
  `sort` int unsigned NOT NULL DEFAULT 0,
  PRIMARY KEY (`id`),
  KEY `idx_template_id` (`template_id`),
  FOREIGN KEY (`template_id`) REFERENCES `bb_collect_template` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='采集模板字段映射表';

-- 插入初始模板
INSERT INTO `bb_collect_template` (`name`, `type`, `description`, `config`, `status`, `created_at`, `updated_at`) VALUES
('MacCMS VOD 标准模板', 1, '标准 MacCMS 视频采集模板', '{"listUrl":"","detailUrl":"","pagination":{"pageParam":"page","pageStart":1},"fields":{}}', 1, UNIX_TIMESTAMP(), UNIX_TIMESTAMP()),
('通用资讯采集模板', 2, '通用资讯采集模板', '{"listUrl":"","detailUrl":"","pagination":{"pageParam":"page","pageStart":1},"fields":{}}', 1, UNIX_TIMESTAMP(), UNIX_TIMESTAMP()),
('通用演员采集模板', 3, '通用演员采集模板', '{"listUrl":"","detailUrl":"","pagination":{"pageParam":"page","pageStart":1},"fields":{}}', 1, UNIX_TIMESTAMP(), UNIX_TIMESTAMP());
