-- 主题表
CREATE TABLE IF NOT EXISTS `bb_theme` (
  `id` int unsigned NOT NULL AUTO_INCREMENT,
  `theme_id` varchar(64) NOT NULL UNIQUE COMMENT '主题唯一标识',
  `name` varchar(128) NOT NULL COMMENT '主题名称',
  `version` varchar(32) NOT NULL COMMENT '主题版本',
  `description` text COMMENT '主题描述',
  `author` varchar(128) COMMENT '主题作者',
  `homepage` varchar(255) COMMENT '主题主页',
  `repository` varchar(255) COMMENT '主题仓库',
  `config_schema` json NOT NULL COMMENT '配置字段定义 (JSON Schema)',
  `status` tinyint unsigned NOT NULL DEFAULT 1 COMMENT '状态: 0=禁用, 1=启用',
  `is_active` tinyint unsigned NOT NULL DEFAULT 0 COMMENT '是否激活: 0=否, 1=是',
  `created_at` int unsigned NOT NULL DEFAULT 0,
  `updated_at` int unsigned NOT NULL DEFAULT 0,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_theme_id` (`theme_id`),
  KEY `idx_is_active` (`is_active`),
  KEY `idx_status` (`status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='主题表';

-- 主题配置表
CREATE TABLE IF NOT EXISTS `bb_theme_setting` (
  `id` int unsigned NOT NULL AUTO_INCREMENT,
  `theme_id` varchar(64) NOT NULL COMMENT '主题ID',
  `config_key` varchar(128) NOT NULL COMMENT '配置键',
  `config_value` json NOT NULL COMMENT '配置值 (JSON)',
  `created_at` int unsigned NOT NULL DEFAULT 0,
  `updated_at` int unsigned NOT NULL DEFAULT 0,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_theme_config` (`theme_id`, `config_key`),
  KEY `idx_theme_id` (`theme_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='主题配置表';

-- 插入默认主题
INSERT INTO `bb_theme` (`theme_id`, `name`, `version`, `description`, `author`, `config_schema`, `status`, `is_active`, `created_at`, `updated_at`) VALUES
('default', '默认主题', '1.0.0', '系统默认主题', '937CMS', '{"title":{"type":"string","label":"网站标题","description":"网站名称","default":"937CMS"},"logo":{"type":"image","label":"网站Logo","description":"网站Logo图片"},"primaryColor":{"type":"color","label":"主色调","description":"主题主色调","default":"#1890ff"},"footerText":{"type":"textarea","label":"页脚文本","description":"页脚显示的文本内容"}}', 1, 1, UNIX_TIMESTAMP(), UNIX_TIMESTAMP());
