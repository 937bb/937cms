-- 937 CMS schema (bb_ prefix)
-- Notes:
-- - Keep column names compatible with collector payload (vod_* / type_*)
-- - Table names use `bb_` prefix (no `mac_`).

SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS = 0;

-- 删除旧表（用于重新初始化）
DROP TABLE IF EXISTS `bb_collect_type_bind`;
DROP TABLE IF EXISTS `bb_collect_record`;
DROP TABLE IF EXISTS `bb_collect_task`;
DROP TABLE IF EXISTS `bb_ulog`;
DROP TABLE IF EXISTS `bb_theme_config`;
DROP TABLE IF EXISTS `bb_server_group`;
DROP TABLE IF EXISTS `bb_downloader`;
DROP TABLE IF EXISTS `bb_gbook`;
DROP TABLE IF EXISTS `bb_comment`;
DROP TABLE IF EXISTS `bb_attachment`;
DROP TABLE IF EXISTS `bb_article`;
DROP TABLE IF EXISTS `bb_actor`;
DROP TABLE IF EXISTS `bb_api_key`;
DROP TABLE IF EXISTS `bb_role`;
DROP TABLE IF EXISTS `bb_session_token`;
DROP TABLE IF EXISTS `bb_session_token_config`;
DROP TABLE IF EXISTS `bb_link`;
DROP TABLE IF EXISTS `bb_member_play_history`;
DROP TABLE IF EXISTS `bb_member_favorite`;
DROP TABLE IF EXISTS `bb_vod_download`;
DROP TABLE IF EXISTS `bb_vod_download_source`;
DROP TABLE IF EXISTS `bb_vod_episode`;
DROP TABLE IF EXISTS `bb_vod_source`;
DROP TABLE IF EXISTS `bb_vod`;
DROP TABLE IF EXISTS `bb_topic`;
DROP TABLE IF EXISTS `bb_type`;
DROP TABLE IF EXISTS `bb_collect_job_source`;
DROP TABLE IF EXISTS `bb_collect_job`;
DROP TABLE IF EXISTS `bb_collect_source`;
DROP TABLE IF EXISTS `bb_member`;
DROP TABLE IF EXISTS `bb_member_group`;
DROP TABLE IF EXISTS `bb_player`;
DROP TABLE IF EXISTS `bb_theme_setting`;
DROP TABLE IF EXISTS `bb_setting`;
DROP TABLE IF EXISTS `bb_admin`;
DROP TABLE IF EXISTS `bb_install`;
DROP TABLE IF EXISTS `bb_migration`;

-- 系统版本管理表（用于自动升级）
CREATE TABLE IF NOT EXISTS `bb_migration` (
  `id` int unsigned NOT NULL AUTO_INCREMENT,
  `version` varchar(32) NOT NULL COMMENT '版本号',
  `name` varchar(128) NOT NULL COMMENT '迁移名称',
  `executed_at` int unsigned NOT NULL DEFAULT 0 COMMENT '执行时间',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uniq_version` (`version`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='数据库迁移记录表';

-- 系统安装状态表
CREATE TABLE IF NOT EXISTS `bb_install` (
  `key` varchar(64) NOT NULL,
  `value` varchar(255) NOT NULL DEFAULT '',
  `updated_at` int unsigned NOT NULL DEFAULT 0,
  PRIMARY KEY (`key`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='系统安装状态表';

CREATE TABLE IF NOT EXISTS `bb_admin` (
  `id` int unsigned NOT NULL AUTO_INCREMENT,
  `username` varchar(64) NOT NULL,
  `password_hash` varchar(255) NOT NULL,
  `role` varchar(32) NOT NULL DEFAULT 'owner',
  `created_at` int unsigned NOT NULL DEFAULT 0,
  `updated_at` int unsigned NOT NULL DEFAULT 0,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uniq_username` (`username`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `bb_setting` (
  `key` varchar(64) NOT NULL,
  `value_json` mediumtext NOT NULL,
  `updated_at` int unsigned NOT NULL DEFAULT 0,
  PRIMARY KEY (`key`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `bb_theme_setting` (
  `theme_id` varchar(64) NOT NULL,
  `value_json` mediumtext NOT NULL,
  `updated_at` int unsigned NOT NULL DEFAULT 0,
  PRIMARY KEY (`theme_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `bb_player` (
  `id` int unsigned NOT NULL AUTO_INCREMENT,
  `from_key` varchar(64) NOT NULL COMMENT '播放器编码，用于匹配采集资源的播放来源',
  `display_name` varchar(128) NOT NULL DEFAULT '' COMMENT '显示名称',
  `description` varchar(255) NOT NULL DEFAULT '' COMMENT '播放器描述',
  `tip` varchar(255) NOT NULL DEFAULT '' COMMENT '提示信息，如"无需安装任何插件"',
  `parse_url` varchar(512) NOT NULL DEFAULT '' COMMENT '解析地址，parse_mode=1时使用',
  `parse_mode` tinyint unsigned NOT NULL DEFAULT 0 COMMENT '播放模式：0=直链(直接播放m3u8/mp4等)，1=解析(通过parse_url解析后播放)',
  `target` varchar(16) NOT NULL DEFAULT '_self' COMMENT '打开方式：_self=当前窗口，_blank=新窗口',
  `player_code` mediumtext COMMENT '自定义播放器JS代码',
  `sort` int unsigned NOT NULL DEFAULT 0 COMMENT '排序值，越大越靠前',
  `status` tinyint unsigned NOT NULL DEFAULT 1 COMMENT '状态：0=禁用，1=启用',
  `created_at` int unsigned NOT NULL DEFAULT 0,
  `updated_at` int unsigned NOT NULL DEFAULT 0,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uniq_from_key` (`from_key`),
  KEY `idx_status_sort` (`status`, `sort`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='播放器配置表';

-- Member groups / members
CREATE TABLE IF NOT EXISTS `bb_member_group` (
  `id` int unsigned NOT NULL AUTO_INCREMENT,
  `name` varchar(64) NOT NULL,
  `remark` varchar(255) NOT NULL DEFAULT '',
  `level` int unsigned NOT NULL DEFAULT 0 COMMENT '等级(0=游客)',
  `status` tinyint unsigned NOT NULL DEFAULT 1,
  `type_ids` text COMMENT '可访问的分类ID(逗号分隔,空=全部)',
  `popedom` text COMMENT '权限配置JSON',
  `points_day` int unsigned NOT NULL DEFAULT 0 COMMENT '每日赠送积分',
  `points_week` int unsigned NOT NULL DEFAULT 0 COMMENT '每周赠送积分',
  `points_month` int unsigned NOT NULL DEFAULT 0 COMMENT '每月赠送积分',
  `points_free` tinyint unsigned NOT NULL DEFAULT 0 COMMENT '是否免积分观看',
  `created_at` int unsigned NOT NULL DEFAULT 0,
  `updated_at` int unsigned NOT NULL DEFAULT 0,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uniq_name` (`name`),
  KEY `idx_status_level` (`status`, `level`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 初始化会员组数据
INSERT INTO `bb_member_group` (`id`, `name`, `remark`, `level`, `status`, `points_free`, `created_at`, `updated_at`) VALUES
(1, '游客', '未登录用户', 0, 1, 0, UNIX_TIMESTAMP(), UNIX_TIMESTAMP()),
(2, '普通会员', '注册用户默认组', 1, 1, 0, UNIX_TIMESTAMP(), UNIX_TIMESTAMP()),
(3, 'VIP会员', 'VIP用户', 5, 1, 1, UNIX_TIMESTAMP(), UNIX_TIMESTAMP())
ON DUPLICATE KEY UPDATE `name` = VALUES(`name`);

CREATE TABLE IF NOT EXISTS `bb_member` (
  `id` int unsigned NOT NULL AUTO_INCREMENT,
  `group_id` int unsigned NOT NULL DEFAULT 2 COMMENT '会员组ID(默认普通会员)',
  `username` varchar(64) NOT NULL,
  `password_hash` varchar(255) NOT NULL,
  `salt` varchar(255) NOT NULL DEFAULT '' COMMENT '密码盐值',
  `nickname` varchar(64) NOT NULL DEFAULT '',
  `email` varchar(128) NOT NULL DEFAULT '',
  `avatar` varchar(255) NOT NULL DEFAULT '',
  `points` int unsigned NOT NULL DEFAULT 0 COMMENT '当前积分',
  `points_used` int unsigned NOT NULL DEFAULT 0 COMMENT '已使用积分',
  `expire_at` int unsigned NOT NULL DEFAULT 0 COMMENT 'VIP过期时间',
  `status` tinyint unsigned NOT NULL DEFAULT 1,
  `last_login_at` int unsigned NOT NULL DEFAULT 0 COMMENT '最后登录时间',
  `last_login_ip` varchar(45) NOT NULL DEFAULT '' COMMENT '最后登录IP',
  `login_count` int unsigned NOT NULL DEFAULT 0 COMMENT '登录次数',
  `token` varchar(64) DEFAULT NULL COMMENT '登录token',
  `token_expire_at` int unsigned NOT NULL DEFAULT 0 COMMENT 'token过期时间',
  `created_at` int unsigned NOT NULL DEFAULT 0,
  `updated_at` int unsigned NOT NULL DEFAULT 0,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uniq_username` (`username`),
  KEY `idx_group_status` (`group_id`, `status`),
  KEY `idx_email` (`email`),
  KEY `idx_token` (`token`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Scheduled collect jobs (skeleton; actual fetching is done by Go worker)
CREATE TABLE IF NOT EXISTS `bb_collect_source` (
  `id` int unsigned NOT NULL AUTO_INCREMENT,
  `name` varchar(128) NOT NULL,
  `base_url` varchar(512) NOT NULL,
  `collect_type` tinyint unsigned NOT NULL DEFAULT 1 COMMENT '1=xml,2=json',
  `status` tinyint unsigned NOT NULL DEFAULT 1,
  `created_at` int unsigned NOT NULL DEFAULT 0,
  `updated_at` int unsigned NOT NULL DEFAULT 0,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uniq_base_url` (`base_url`),
  KEY `idx_status` (`status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `bb_collect_job` (
  `id` int unsigned NOT NULL AUTO_INCREMENT,
  `name` varchar(128) NOT NULL,
  `domain_url` varchar(512) NOT NULL COMMENT 'target site domain',
  `api_pass` varchar(64) NOT NULL COMMENT 'receive/vod pass',
  `collect_time` int unsigned NOT NULL DEFAULT 24 COMMENT 'hours; 0=all',
  `interval_seconds` int unsigned NOT NULL DEFAULT 1,
  `push_workers` int unsigned NOT NULL DEFAULT 1,
  `push_interval_seconds` int unsigned NOT NULL DEFAULT 2,
  `max_workers` int unsigned NOT NULL DEFAULT 2,
  `filter_keywords` varchar(1024) NOT NULL DEFAULT '' COMMENT 'csv keywords; worker skips vod_name matches',
  `cron` varchar(64) NOT NULL DEFAULT '' COMMENT 'optional cron expression',
  `status` tinyint unsigned NOT NULL DEFAULT 1,
  `created_at` int unsigned NOT NULL DEFAULT 0,
  `updated_at` int unsigned NOT NULL DEFAULT 0,
  PRIMARY KEY (`id`),
  KEY `idx_status` (`status`),
  KEY `idx_domain_url` (`domain_url`(255))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `bb_collect_job_source` (
  `job_id` int unsigned NOT NULL,
  `source_id` int unsigned NOT NULL,
  PRIMARY KEY (`job_id`, `source_id`),
  KEY `idx_source_id` (`source_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `bb_collect_run` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `job_id` int unsigned NOT NULL,
  `status` tinyint unsigned NOT NULL DEFAULT 0 COMMENT '0=pending,1=running,2=done,3=failed',
  `worker_id` varchar(64) NOT NULL DEFAULT '',
  `progress_page` int unsigned NOT NULL DEFAULT 0,
  `progress_total_pages` int unsigned NOT NULL DEFAULT 0,
  `pushed_count` int unsigned NOT NULL DEFAULT 0,
  `updated_count` int unsigned NOT NULL DEFAULT 0 COMMENT '更新数量',
  `created_count` int unsigned NOT NULL DEFAULT 0 COMMENT '新增数量',
  `error_count` int unsigned NOT NULL DEFAULT 0,
  `message` varchar(2000) NOT NULL DEFAULT '',
  `started_at` int unsigned NOT NULL DEFAULT 0,
  `finished_at` int unsigned NOT NULL DEFAULT 0,
  `created_at` int unsigned NOT NULL DEFAULT 0,
  `updated_at` int unsigned NOT NULL DEFAULT 0,
  PRIMARY KEY (`id`),
  KEY `idx_job_status` (`job_id`, `status`),
  KEY `idx_status_id` (`status`, `id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ----------------------------
-- bb_type / bb_vod (video-only; based on maccms columns)
-- ----------------------------
CREATE TABLE IF NOT EXISTS `bb_type` (
  `type_id` smallint unsigned NOT NULL AUTO_INCREMENT,
  `type_name` varchar(60) NOT NULL DEFAULT '',
  `type_en` varchar(60) NOT NULL DEFAULT '',
  `type_sort` smallint unsigned NOT NULL DEFAULT 0,
  `type_mid` smallint unsigned NOT NULL DEFAULT 1,
  `type_pid` smallint unsigned NOT NULL DEFAULT 0,
  `type_status` tinyint unsigned NOT NULL DEFAULT 1,
  `type_tpl` varchar(30) NOT NULL DEFAULT '',
  `type_tpl_list` varchar(30) NOT NULL DEFAULT '',
  `type_tpl_detail` varchar(30) NOT NULL DEFAULT '',
  `type_tpl_play` varchar(30) NOT NULL DEFAULT '',
  `type_tpl_down` varchar(30) NOT NULL DEFAULT '',
  `type_key` varchar(255) NOT NULL DEFAULT '',
  `type_des` varchar(255) NOT NULL DEFAULT '',
  `type_title` varchar(255) NOT NULL DEFAULT '',
  `type_union` varchar(255) NOT NULL DEFAULT '',
  `type_extend` text NOT NULL,
  `type_logo` varchar(255) NOT NULL DEFAULT '',
  `type_pic` varchar(1024) NOT NULL DEFAULT '',
  `type_jumpurl` varchar(150) NOT NULL DEFAULT '',
  PRIMARY KEY (`type_id`),
  KEY `idx_type_sort` (`type_sort`),
  KEY `idx_type_pid` (`type_pid`),
  KEY `idx_type_name` (`type_name`),
  KEY `idx_type_en` (`type_en`),
  KEY `idx_type_mid` (`type_mid`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 专题表
CREATE TABLE IF NOT EXISTS `bb_topic` (
  `topic_id` int unsigned NOT NULL AUTO_INCREMENT,
  `topic_name` varchar(128) NOT NULL DEFAULT '' COMMENT '专题名称',
  `topic_en` varchar(128) NOT NULL DEFAULT '' COMMENT '专题英文名',
  `topic_sub` varchar(255) NOT NULL DEFAULT '' COMMENT '专题副标题',
  `topic_status` tinyint unsigned NOT NULL DEFAULT 1 COMMENT '状态',
  `topic_sort` int unsigned NOT NULL DEFAULT 0 COMMENT '排序',
  `topic_letter` char(1) NOT NULL DEFAULT '' COMMENT '首字母',
  `topic_color` varchar(6) NOT NULL DEFAULT '' COMMENT '颜色',
  `topic_tpl` varchar(30) NOT NULL DEFAULT '' COMMENT '模板',
  `topic_type` varchar(30) NOT NULL DEFAULT '' COMMENT '类型',
  `topic_pic` varchar(1024) NOT NULL DEFAULT '' COMMENT '专题图片',
  `topic_pic_thumb` varchar(1024) NOT NULL DEFAULT '' COMMENT '专题缩略图',
  `topic_pic_slide` varchar(1024) NOT NULL DEFAULT '' COMMENT '专题幻灯片',
  `topic_key` varchar(255) NOT NULL DEFAULT '' COMMENT '关键词',
  `topic_des` varchar(255) NOT NULL DEFAULT '' COMMENT '描述',
  `topic_title` varchar(255) NOT NULL DEFAULT '' COMMENT '标题',
  `topic_blurb` varchar(255) NOT NULL DEFAULT '' COMMENT '简介',
  `topic_remarks` varchar(100) NOT NULL DEFAULT '' COMMENT '备注',
  `topic_level` int unsigned NOT NULL DEFAULT 0 COMMENT '等级',
  `topic_tag` varchar(100) NOT NULL DEFAULT '' COMMENT '标签',
  `topic_rel_vod` varchar(255) NOT NULL DEFAULT '' COMMENT '关联视频',
  `topic_rel_art` varchar(255) NOT NULL DEFAULT '' COMMENT '关联文章',
  `topic_content` mediumtext NOT NULL COMMENT '内容',
  `topic_time` int unsigned NOT NULL DEFAULT 0 COMMENT '更新时间',
  `topic_time_add` int unsigned NOT NULL DEFAULT 0 COMMENT '添加时间',
  `topic_hits` int unsigned NOT NULL DEFAULT 0 COMMENT '点击数',
  PRIMARY KEY (`topic_id`),
  KEY `idx_topic_status` (`topic_status`),
  KEY `idx_topic_sort` (`topic_sort`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='专题';

CREATE TABLE IF NOT EXISTS `bb_vod` (
  `vod_id` int unsigned NOT NULL AUTO_INCREMENT,
  `type_id` smallint NOT NULL DEFAULT 0,
  `type_id_1` smallint unsigned NOT NULL DEFAULT 0,
  `group_id` smallint unsigned NOT NULL DEFAULT 0,
  `vod_name` varchar(255) NOT NULL DEFAULT '',
  `vod_sub` varchar(255) NOT NULL DEFAULT '',
  `vod_en` varchar(255) NOT NULL DEFAULT '',
  `vod_status` tinyint unsigned NOT NULL DEFAULT 0,
  `vod_letter` char(1) NOT NULL DEFAULT '',
  `vod_color` varchar(6) NOT NULL DEFAULT '',
  `vod_tag` varchar(100) NOT NULL DEFAULT '',
  `vod_class` varchar(255) NOT NULL DEFAULT '',
  `vod_pic` varchar(1024) NOT NULL DEFAULT '',
  `vod_pic_thumb` varchar(1024) NOT NULL DEFAULT '',
  `vod_pic_slide` varchar(1024) NOT NULL DEFAULT '',
  `vod_pic_screenshot` text,
  `vod_actor` varchar(255) NOT NULL DEFAULT '',
  `vod_director` varchar(255) NOT NULL DEFAULT '',
  `vod_writer` varchar(100) NOT NULL DEFAULT '',
  `vod_behind` varchar(100) NOT NULL DEFAULT '',
  `vod_blurb` varchar(255) NOT NULL DEFAULT '',
  `vod_remarks` varchar(100) NOT NULL DEFAULT '',
  `vod_pubdate` varchar(100) NOT NULL DEFAULT '',
  `vod_total` mediumint unsigned NOT NULL DEFAULT 0,
  `vod_serial` varchar(20) NOT NULL DEFAULT '0',
  `vod_tv` varchar(30) NOT NULL DEFAULT '',
  `vod_weekday` varchar(30) NOT NULL DEFAULT '',
  `vod_area` varchar(20) NOT NULL DEFAULT '',
  `vod_lang` varchar(10) NOT NULL DEFAULT '',
  `vod_year` varchar(10) NOT NULL DEFAULT '',
  `vod_version` varchar(30) NOT NULL DEFAULT '',
  `vod_state` varchar(30) NOT NULL DEFAULT '',
  `vod_author` varchar(60) NOT NULL DEFAULT '',
  `vod_jumpurl` varchar(150) NOT NULL DEFAULT '',
  `vod_tpl` varchar(30) NOT NULL DEFAULT '',
  `vod_tpl_play` varchar(30) NOT NULL DEFAULT '',
  `vod_tpl_down` varchar(30) NOT NULL DEFAULT '',
  `vod_isend` tinyint unsigned NOT NULL DEFAULT 0,
  `vod_lock` tinyint unsigned NOT NULL DEFAULT 0,
  `vod_level` tinyint unsigned NOT NULL DEFAULT 0,
  `vod_copyright` tinyint unsigned NOT NULL DEFAULT 0,
  `vod_points` smallint unsigned NOT NULL DEFAULT 0,
  `vod_points_play` smallint unsigned NOT NULL DEFAULT 0,
  `vod_points_down` smallint unsigned NOT NULL DEFAULT 0,
  `vod_hits` mediumint unsigned NOT NULL DEFAULT 0,
  `vod_hits_day` mediumint unsigned NOT NULL DEFAULT 0,
  `vod_hits_week` mediumint unsigned NOT NULL DEFAULT 0,
  `vod_hits_month` mediumint unsigned NOT NULL DEFAULT 0,
  `vod_duration` varchar(10) NOT NULL DEFAULT '',
  `vod_up` mediumint unsigned NOT NULL DEFAULT 0,
  `vod_down` mediumint unsigned NOT NULL DEFAULT 0,
  `vod_score` decimal(3,1) unsigned NOT NULL DEFAULT 0.0,
  `vod_score_all` mediumint unsigned NOT NULL DEFAULT 0,
  `vod_score_num` mediumint unsigned NOT NULL DEFAULT 0,
  `vod_time` int unsigned NOT NULL DEFAULT 0,
  `vod_time_add` int unsigned NOT NULL DEFAULT 0,
  `vod_time_hits` int unsigned NOT NULL DEFAULT 0,
  `vod_time_make` int unsigned NOT NULL DEFAULT 0,
  `vod_trysee` smallint unsigned NOT NULL DEFAULT 0,
  `vod_douban_id` int unsigned NOT NULL DEFAULT 0,
  `vod_douban_score` decimal(3,1) unsigned NOT NULL DEFAULT 0.0,
  `vod_reurl` varchar(255) NOT NULL DEFAULT '',
  `vod_rel_vod` varchar(255) NOT NULL DEFAULT '',
  `vod_rel_art` varchar(255) NOT NULL DEFAULT '',
  `vod_pwd` varchar(10) NOT NULL DEFAULT '',
  `vod_pwd_url` varchar(255) NOT NULL DEFAULT '',
  `vod_pwd_play` varchar(10) NOT NULL DEFAULT '',
  `vod_pwd_play_url` varchar(255) NOT NULL DEFAULT '',
  `vod_pwd_down` varchar(10) NOT NULL DEFAULT '',
  `vod_pwd_down_url` varchar(255) NOT NULL DEFAULT '',
  `vod_content` mediumtext NOT NULL,
  `vod_play_from` varchar(255) NOT NULL DEFAULT '',
  `vod_play_server` varchar(255) NOT NULL DEFAULT '',
  `vod_play_note` varchar(255) NOT NULL DEFAULT '',
  `vod_play_url` mediumtext NOT NULL,
  `vod_down_from` varchar(255) NOT NULL DEFAULT '',
  `vod_down_server` varchar(255) NOT NULL DEFAULT '',
  `vod_down_note` varchar(255) NOT NULL DEFAULT '',
  `vod_down_url` mediumtext NOT NULL,
  `vod_plot` tinyint unsigned NOT NULL DEFAULT 0,
  `vod_plot_name` mediumtext NOT NULL,
  `vod_plot_detail` mediumtext NOT NULL,
  PRIMARY KEY (`vod_id`),
  KEY `idx_type_id` (`type_id`),
  KEY `idx_type_id_1` (`type_id_1`),
  KEY `idx_vod_level` (`vod_level`),
  KEY `idx_vod_hits` (`vod_hits`),
  KEY `idx_vod_letter` (`vod_letter`),
  KEY `idx_vod_name` (`vod_name`),
  KEY `idx_vod_year` (`vod_year`),
  KEY `idx_vod_area` (`vod_area`),
  KEY `idx_vod_lang` (`vod_lang`),
  KEY `idx_vod_tag` (`vod_tag`),
  KEY `idx_vod_class` (`vod_class`),
  KEY `idx_vod_lock` (`vod_lock`),
  KEY `idx_vod_up` (`vod_up`),
  KEY `idx_vod_down` (`vod_down`),
  KEY `idx_vod_en` (`vod_en`),
  KEY `idx_vod_hits_day` (`vod_hits_day`),
  KEY `idx_vod_hits_week` (`vod_hits_week`),
  KEY `idx_vod_hits_month` (`vod_hits_month`),
  KEY `idx_vod_plot` (`vod_plot`),
  KEY `idx_vod_points_play` (`vod_points_play`),
  KEY `idx_vod_points_down` (`vod_points_down`),
  KEY `idx_group_id` (`group_id`),
  KEY `idx_vod_time_add` (`vod_time_add`),
  KEY `idx_vod_time` (`vod_time`),
  KEY `idx_vod_time_make` (`vod_time_make`),
  KEY `idx_vod_actor` (`vod_actor`),
  KEY `idx_vod_director` (`vod_director`),
  KEY `idx_vod_score_all` (`vod_score_all`),
  KEY `idx_vod_score_num` (`vod_score_num`),
  KEY `idx_vod_total` (`vod_total`),
  KEY `idx_vod_score` (`vod_score`),
  KEY `idx_vod_version` (`vod_version`),
  KEY `idx_vod_state` (`vod_state`),
  KEY `idx_vod_isend` (`vod_isend`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 视频播放源表（规范化设计）
CREATE TABLE IF NOT EXISTS `bb_vod_source` (
  `id` int unsigned NOT NULL AUTO_INCREMENT,
  `vod_id` int unsigned NOT NULL DEFAULT 0 COMMENT '视频ID',
  `player_id` int unsigned NOT NULL DEFAULT 0 COMMENT '播放器ID',
  `player_name` varchar(60) NOT NULL DEFAULT '' COMMENT '播放器名称（冗余）',
  `sort` smallint unsigned NOT NULL DEFAULT 0 COMMENT '排序',
  `created_at` int unsigned NOT NULL DEFAULT 0,
  `updated_at` int unsigned NOT NULL DEFAULT 0,
  PRIMARY KEY (`id`),
  KEY `idx_vod_id` (`vod_id`),
  KEY `idx_player_id` (`player_id`),
  KEY `idx_vod_cover` (`vod_id`, `sort`, `id`, `player_name`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='视频播放源';

-- 视频剧集表（规范化设计）
CREATE TABLE IF NOT EXISTS `bb_vod_episode` (
  `id` int unsigned NOT NULL AUTO_INCREMENT,
  `vod_id` int unsigned NOT NULL DEFAULT 0 COMMENT '视频ID',
  `source_id` int unsigned NOT NULL DEFAULT 0 COMMENT '播放源ID',
  `episode_num` smallint unsigned NOT NULL DEFAULT 0 COMMENT '集数',
  `title` varchar(100) NOT NULL DEFAULT '' COMMENT '集标题',
  `url` varchar(1024) NOT NULL DEFAULT '' COMMENT '播放地址',
  `sort` smallint unsigned NOT NULL DEFAULT 0 COMMENT '排序',
  `created_at` int unsigned NOT NULL DEFAULT 0,
  `updated_at` int unsigned NOT NULL DEFAULT 0,
  PRIMARY KEY (`id`),
  KEY `idx_vod_id` (`vod_id`),
  KEY `idx_source_id` (`source_id`),
  KEY `idx_vod_source` (`vod_id`, `source_id`),
  KEY `idx_source_cover` (`source_id`, `sort`, `id`, `title`, `url`(255))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='视频剧集';

-- 视频下载源表（规范化设计）
CREATE TABLE IF NOT EXISTS `bb_vod_download_source` (
  `id` int unsigned NOT NULL AUTO_INCREMENT,
  `vod_id` int unsigned NOT NULL DEFAULT 0 COMMENT '视频ID',
  `downloader_id` int unsigned NOT NULL DEFAULT 0 COMMENT '下载器ID',
  `downloader_name` varchar(60) NOT NULL DEFAULT '' COMMENT '下载器名称（冗余）',
  `sort` smallint unsigned NOT NULL DEFAULT 0 COMMENT '排序',
  `created_at` int unsigned NOT NULL DEFAULT 0,
  `updated_at` int unsigned NOT NULL DEFAULT 0,
  PRIMARY KEY (`id`),
  KEY `idx_vod_id` (`vod_id`),
  KEY `idx_downloader_id` (`downloader_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='视频下载源';

-- 视频下载链接表（规范化设计）
CREATE TABLE IF NOT EXISTS `bb_vod_download` (
  `id` int unsigned NOT NULL AUTO_INCREMENT,
  `vod_id` int unsigned NOT NULL DEFAULT 0 COMMENT '视频ID',
  `source_id` int unsigned NOT NULL DEFAULT 0 COMMENT '下载源ID',
  `episode_num` smallint unsigned NOT NULL DEFAULT 0 COMMENT '集数',
  `title` varchar(100) NOT NULL DEFAULT '' COMMENT '标题',
  `url` varchar(1024) NOT NULL DEFAULT '' COMMENT '下载地址',
  `sort` smallint unsigned NOT NULL DEFAULT 0 COMMENT '排序',
  `created_at` int unsigned NOT NULL DEFAULT 0,
  `updated_at` int unsigned NOT NULL DEFAULT 0,
  PRIMARY KEY (`id`),
  KEY `idx_vod_id` (`vod_id`),
  KEY `idx_source_id` (`source_id`),
  KEY `idx_vod_source` (`vod_id`, `source_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='视频下载链接';

-- 会员收藏表
CREATE TABLE IF NOT EXISTS `bb_member_favorite` (
  `id` int unsigned NOT NULL AUTO_INCREMENT,
  `member_id` int unsigned NOT NULL DEFAULT 0 COMMENT '会员ID',
  `vod_id` int unsigned NOT NULL DEFAULT 0 COMMENT '视频ID',
  `created_at` int unsigned NOT NULL DEFAULT 0,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uniq_member_vod` (`member_id`, `vod_id`),
  KEY `idx_member_id` (`member_id`),
  KEY `idx_vod_id` (`vod_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='会员收藏';

-- 会员播放历史表
CREATE TABLE IF NOT EXISTS `bb_member_play_history` (
  `id` int unsigned NOT NULL AUTO_INCREMENT,
  `member_id` int unsigned NOT NULL DEFAULT 0 COMMENT '会员ID',
  `vod_id` int unsigned NOT NULL DEFAULT 0 COMMENT '视频ID',
  `episode_index` smallint unsigned NOT NULL DEFAULT 0 COMMENT '集数索引',
  `play_time` int unsigned NOT NULL DEFAULT 0 COMMENT '播放进度(秒)',
  `created_at` int unsigned NOT NULL DEFAULT 0,
  `updated_at` int unsigned NOT NULL DEFAULT 0,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uniq_member_vod` (`member_id`, `vod_id`),
  KEY `idx_member_id` (`member_id`),
  KEY `idx_vod_id` (`vod_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='会员播放历史';

-- 友情链接表
CREATE TABLE IF NOT EXISTS `bb_link` (
  `id` int unsigned NOT NULL AUTO_INCREMENT,
  `name` varchar(128) NOT NULL COMMENT '链接名称',
  `url` varchar(255) NOT NULL COMMENT '链接地址',
  `logo` varchar(255) NOT NULL DEFAULT '' COMMENT '链接logo',
  `sort` int unsigned NOT NULL DEFAULT 0 COMMENT '排序',
  `status` tinyint(1) NOT NULL DEFAULT 1 COMMENT '状态 1=启用 0=禁用',
  `created_at` int unsigned NOT NULL DEFAULT 0,
  `updated_at` int unsigned NOT NULL DEFAULT 0,
  PRIMARY KEY (`id`),
  KEY `idx_status` (`status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='友情链接';

-- Session Token 配置表
CREATE TABLE IF NOT EXISTS `bb_session_token_config` (
  `id` int unsigned NOT NULL AUTO_INCREMENT,
  `enabled` tinyint(1) NOT NULL DEFAULT 0 COMMENT '是否启用会话 Token 功能',
  `ttl` int unsigned NOT NULL DEFAULT 7200 COMMENT '会话 Token 过期时间（秒）',
  `created_at` int unsigned NOT NULL DEFAULT 0,
  `updated_at` int unsigned NOT NULL DEFAULT 0,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='会话 Token 配置';

-- Session Token 表
CREATE TABLE IF NOT EXISTS `bb_session_token` (
  `id` int unsigned NOT NULL AUTO_INCREMENT,
  `token` varchar(255) NOT NULL COMMENT '加密后的 Token',
  `api_key_id` int unsigned NOT NULL COMMENT 'API Key ID',
  `ip` varchar(45) NOT NULL DEFAULT '' COMMENT '客户端 IP',
  `user_agent` varchar(255) NOT NULL DEFAULT '' COMMENT '客户端 User-Agent',
  `expires_at` datetime NOT NULL COMMENT 'Token 过期时间',
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uniq_token` (`token`),
  KEY `idx_api_key_id` (`api_key_id`),
  KEY `idx_expires_at` (`expires_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='会话 Token 记录';

-- 角色表
CREATE TABLE IF NOT EXISTS `bb_role` (
  `role_id` int unsigned NOT NULL AUTO_INCREMENT,
  `role_name` varchar(128) NOT NULL DEFAULT '' COMMENT '角色名称',
  `role_en` varchar(128) NOT NULL DEFAULT '' COMMENT '角色英文名',
  `role_status` tinyint unsigned NOT NULL DEFAULT 1 COMMENT '状态',
  `role_lock` tinyint unsigned NOT NULL DEFAULT 0 COMMENT '锁定',
  `role_letter` char(1) NOT NULL DEFAULT '' COMMENT '首字母',
  `role_color` varchar(6) NOT NULL DEFAULT '' COMMENT '颜色',
  `role_actor_id` int unsigned NOT NULL DEFAULT 0 COMMENT '演员ID',
  `role_actor_name` varchar(128) NOT NULL DEFAULT '' COMMENT '演员名称',
  `role_pic` varchar(1024) NOT NULL DEFAULT '' COMMENT '角色图片',
  `role_blurb` varchar(255) NOT NULL DEFAULT '' COMMENT '简介',
  `role_remarks` varchar(100) NOT NULL DEFAULT '' COMMENT '备注',
  `role_tag` varchar(100) NOT NULL DEFAULT '' COMMENT '标签',
  `role_class` varchar(255) NOT NULL DEFAULT '' COMMENT '分类',
  `role_level` int unsigned NOT NULL DEFAULT 0 COMMENT '等级',
  `role_tpl` varchar(30) NOT NULL DEFAULT '' COMMENT '模板',
  `role_jumpurl` varchar(150) NOT NULL DEFAULT '' COMMENT '跳转URL',
  `role_content` mediumtext NOT NULL COMMENT '内容',
  `role_time` int unsigned NOT NULL DEFAULT 0 COMMENT '更新时间',
  `role_time_add` int unsigned NOT NULL DEFAULT 0 COMMENT '添加时间',
  `role_hits` int unsigned NOT NULL DEFAULT 0 COMMENT '点击数',
  PRIMARY KEY (`role_id`),
  KEY `idx_role_status` (`role_status`),
  KEY `idx_role_name` (`role_name`),
  KEY `idx_role_en` (`role_en`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='角色';

-- API Key 表
CREATE TABLE IF NOT EXISTS `bb_api_key` (
  `id` int unsigned NOT NULL AUTO_INCREMENT,
  `name` varchar(128) NOT NULL COMMENT 'API Key 名称',
  `key` varchar(255) NOT NULL COMMENT 'API Key',
  `secret` varchar(255) NOT NULL COMMENT 'API Secret',
  `status` tinyint(1) NOT NULL DEFAULT 1 COMMENT '状态',
  `created_at` int unsigned NOT NULL DEFAULT 0,
  `updated_at` int unsigned NOT NULL DEFAULT 0,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uniq_key` (`key`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='API Key';

-- 演员表
CREATE TABLE IF NOT EXISTS `bb_actor` (
  `id` int unsigned NOT NULL AUTO_INCREMENT,
  `name` varchar(128) NOT NULL COMMENT '演员名称',
  `description` text NOT NULL COMMENT '演员描述',
  `image` varchar(255) NOT NULL DEFAULT '' COMMENT '演员图片',
  `created_at` int unsigned NOT NULL DEFAULT 0,
  `updated_at` int unsigned NOT NULL DEFAULT 0,
  PRIMARY KEY (`id`),
  KEY `idx_name` (`name`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='演员';

-- 文章表
CREATE TABLE IF NOT EXISTS `bb_article` (
  `id` int unsigned NOT NULL AUTO_INCREMENT,
  `type_id` smallint unsigned NOT NULL DEFAULT 0 COMMENT '分类ID',
  `type_id_1` smallint unsigned NOT NULL DEFAULT 0 COMMENT '副分类ID',
  `name` varchar(255) NOT NULL DEFAULT '' COMMENT '文章标题',
  `sub` varchar(255) NOT NULL DEFAULT '' COMMENT '副标题',
  `letter` char(1) NOT NULL DEFAULT '' COMMENT '首字母',
  `color` varchar(6) NOT NULL DEFAULT '' COMMENT '颜色',
  `pic` varchar(1024) NOT NULL DEFAULT '' COMMENT '文章图片',
  `pic_thumb` varchar(1024) NOT NULL DEFAULT '' COMMENT '缩略图',
  `author` varchar(128) NOT NULL DEFAULT '' COMMENT '作者',
  `source` varchar(128) NOT NULL DEFAULT '' COMMENT '来源',
  `tag` varchar(100) NOT NULL DEFAULT '' COMMENT '标签',
  `blurb` varchar(255) NOT NULL DEFAULT '' COMMENT '简介',
  `remarks` varchar(100) NOT NULL DEFAULT '' COMMENT '备注',
  `content` mediumtext NOT NULL COMMENT '内容',
  `level` int unsigned NOT NULL DEFAULT 0 COMMENT '等级',
  `status` tinyint unsigned NOT NULL DEFAULT 1 COMMENT '状态',
  `jump_url` varchar(255) NOT NULL DEFAULT '' COMMENT '跳转URL',
  `hits` int unsigned NOT NULL DEFAULT 0 COMMENT '点击数',
  `created_at` int unsigned NOT NULL DEFAULT 0,
  `updated_at` int unsigned NOT NULL DEFAULT 0,
  PRIMARY KEY (`id`),
  KEY `idx_type_id` (`type_id`),
  KEY `idx_type_id_1` (`type_id_1`),
  KEY `idx_status` (`status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='文章';

-- 附件表
CREATE TABLE IF NOT EXISTS `bb_attachment` (
  `id` int unsigned NOT NULL AUTO_INCREMENT,
  `name` varchar(255) NOT NULL COMMENT '附件名称',
  `path` varchar(255) NOT NULL COMMENT '附件路径',
  `url` varchar(255) NOT NULL DEFAULT '' COMMENT '附件URL',
  `size` int unsigned NOT NULL DEFAULT 0 COMMENT '文件大小',
  `mime_type` varchar(64) NOT NULL DEFAULT '' COMMENT 'MIME 类型',
  `ext` varchar(32) NOT NULL DEFAULT '' COMMENT '文件扩展名',
  `md5` varchar(32) NOT NULL DEFAULT '' COMMENT 'MD5值',
  `module` varchar(64) NOT NULL DEFAULT '' COMMENT '模块',
  `ref_id` int unsigned NOT NULL DEFAULT 0 COMMENT '关联ID',
  `admin_id` int unsigned NOT NULL DEFAULT 0 COMMENT '管理员ID',
  `member_id` int unsigned NOT NULL DEFAULT 0 COMMENT '会员ID',
  `status` tinyint unsigned NOT NULL DEFAULT 1 COMMENT '状态',
  `created_at` int unsigned NOT NULL DEFAULT 0,
  `updated_at` int unsigned NOT NULL DEFAULT 0,
  PRIMARY KEY (`id`),
  KEY `idx_created_at` (`created_at`),
  KEY `idx_module` (`module`),
  KEY `idx_ref_id` (`ref_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='附件';

-- 评论表
CREATE TABLE IF NOT EXISTS `bb_comment` (
  `id` int unsigned NOT NULL AUTO_INCREMENT,
  `mid` int unsigned NOT NULL DEFAULT 0 COMMENT '视频ID',
  `user_id` int unsigned NOT NULL DEFAULT 0 COMMENT '会员ID',
  `content` text NOT NULL COMMENT '评论内容',
  `status` tinyint(1) NOT NULL DEFAULT 1 COMMENT '状态',
  `created_at` int unsigned NOT NULL DEFAULT 0,
  `updated_at` int unsigned NOT NULL DEFAULT 0,
  PRIMARY KEY (`id`),
  KEY `idx_mid` (`mid`),
  KEY `idx_user_id` (`user_id`),
  KEY `idx_status` (`status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='评论';

-- 留言板表
CREATE TABLE IF NOT EXISTS `bb_gbook` (
  `id` int unsigned NOT NULL AUTO_INCREMENT,
  `user_id` int unsigned NOT NULL DEFAULT 0 COMMENT '会员ID',
  `name` varchar(128) NOT NULL COMMENT '留言者名称',
  `email` varchar(128) NOT NULL DEFAULT '' COMMENT '邮箱',
  `content` text NOT NULL COMMENT '留言内容',
  `reply` text COMMENT '回复内容',
  `reply_time` int unsigned NOT NULL DEFAULT 0 COMMENT '回复时间',
  `status` tinyint(1) NOT NULL DEFAULT 0 COMMENT '状态',
  `created_at` int unsigned NOT NULL DEFAULT 0,
  `updated_at` int unsigned NOT NULL DEFAULT 0,
  PRIMARY KEY (`id`),
  KEY `idx_user_id` (`user_id`),
  KEY `idx_status` (`status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='留言板';

-- 下载器表
CREATE TABLE IF NOT EXISTS `bb_downloader` (
  `id` int unsigned NOT NULL AUTO_INCREMENT,
  `from_key` varchar(64) NOT NULL COMMENT '下载器编码',
  `display_name` varchar(128) NOT NULL DEFAULT '' COMMENT '显示名称',
  `description` varchar(255) NOT NULL DEFAULT '' COMMENT '描述',
  `tip` varchar(255) NOT NULL DEFAULT '' COMMENT '提示信息',
  `parse_url` varchar(512) NOT NULL DEFAULT '' COMMENT '解析地址',
  `parse_mode` tinyint unsigned NOT NULL DEFAULT 0 COMMENT '解析模式',
  `target` varchar(16) NOT NULL DEFAULT '_self' COMMENT '打开方式',
  `downloader_code` mediumtext COMMENT '自定义下载器代码',
  `sort` int unsigned NOT NULL DEFAULT 0 COMMENT '排序',
  `status` tinyint unsigned NOT NULL DEFAULT 1 COMMENT '状态',
  `created_at` int unsigned NOT NULL DEFAULT 0,
  `updated_at` int unsigned NOT NULL DEFAULT 0,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uniq_from_key` (`from_key`),
  KEY `idx_status_sort` (`status`, `sort`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='下载器';

-- 服务器组表
CREATE TABLE IF NOT EXISTS `bb_server_group` (
  `id` int unsigned NOT NULL AUTO_INCREMENT,
  `name` varchar(128) NOT NULL COMMENT '服务器组名称',
  `remark` varchar(255) NOT NULL DEFAULT '' COMMENT '备注',
  `status` tinyint unsigned NOT NULL DEFAULT 1 COMMENT '状态',
  `sort` int unsigned NOT NULL DEFAULT 0 COMMENT '排序',
  `created_at` int unsigned NOT NULL DEFAULT 0,
  `updated_at` int unsigned NOT NULL DEFAULT 0,
  PRIMARY KEY (`id`),
  KEY `idx_status` (`status`),
  KEY `idx_sort` (`sort`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='服务器组';

-- 主题配置表
CREATE TABLE IF NOT EXISTS `bb_theme_config` (
  `id` int unsigned NOT NULL AUTO_INCREMENT,
  `theme_id` varchar(64) NOT NULL COMMENT '主题ID',
  `key` varchar(128) NOT NULL COMMENT '配置键',
  `value` longtext NOT NULL COMMENT '配置值',
  `created_at` int unsigned NOT NULL DEFAULT 0,
  `updated_at` int unsigned NOT NULL DEFAULT 0,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uniq_theme_key` (`theme_id`, `key`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='主题配置';

-- 用户日志表
CREATE TABLE IF NOT EXISTS `bb_ulog` (
  `id` int unsigned NOT NULL AUTO_INCREMENT,
  `admin_id` int unsigned NOT NULL DEFAULT 0 COMMENT '管理员ID',
  `action` varchar(128) NOT NULL COMMENT '操作',
  `description` varchar(255) NOT NULL DEFAULT '' COMMENT '描述',
  `ip` varchar(45) NOT NULL DEFAULT '' COMMENT 'IP地址',
  `created_at` int unsigned NOT NULL DEFAULT 0,
  PRIMARY KEY (`id`),
  KEY `idx_admin_id` (`admin_id`),
  KEY `idx_created_at` (`created_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='用户日志';

-- 采集任务表
CREATE TABLE IF NOT EXISTS `bb_collect_task` (
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

-- 采集记录表
CREATE TABLE IF NOT EXISTS `bb_collect_record` (
  `id` int unsigned NOT NULL AUTO_INCREMENT,
  `job_id` int unsigned NOT NULL DEFAULT 0 COMMENT '采集任务ID',
  `status` varchar(32) NOT NULL DEFAULT 'pending' COMMENT '状态',
  `error_message` text NOT NULL COMMENT '错误信息',
  `created_at` int unsigned NOT NULL DEFAULT 0,
  `updated_at` int unsigned NOT NULL DEFAULT 0,
  PRIMARY KEY (`id`),
  KEY `idx_job_id` (`job_id`),
  KEY `idx_status` (`status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='采集记录';

-- 采集类型绑定表
CREATE TABLE IF NOT EXISTS `bb_collect_type_bind` (
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

SET FOREIGN_KEY_CHECKS = 1;
