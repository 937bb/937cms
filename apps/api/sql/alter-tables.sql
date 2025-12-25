-- 修复8个表的字段不匹配问题
-- 执行此脚本来更新生产数据库

-- 1. bb_topic - 重命名id为topic_id，添加缺失字段
ALTER TABLE `bb_topic`
  CHANGE COLUMN `id` `topic_id` int unsigned NOT NULL AUTO_INCREMENT,
  CHANGE COLUMN `name` `topic_name` varchar(128) NOT NULL DEFAULT '',
  ADD COLUMN `topic_en` varchar(128) NOT NULL DEFAULT '' AFTER `topic_name`,
  ADD COLUMN `topic_sub` varchar(255) NOT NULL DEFAULT '' AFTER `topic_en`,
  CHANGE COLUMN `status` `topic_status` tinyint unsigned NOT NULL DEFAULT 1,
  CHANGE COLUMN `sort` `topic_sort` int unsigned NOT NULL DEFAULT 0,
  ADD COLUMN `topic_letter` char(1) NOT NULL DEFAULT '' AFTER `topic_sort`,
  ADD COLUMN `topic_color` varchar(6) NOT NULL DEFAULT '' AFTER `topic_letter`,
  ADD COLUMN `topic_tpl` varchar(30) NOT NULL DEFAULT '' AFTER `topic_color`,
  ADD COLUMN `topic_type` varchar(30) NOT NULL DEFAULT '' AFTER `topic_tpl`,
  CHANGE COLUMN `cover` `topic_pic` varchar(1024) NOT NULL DEFAULT '',
  ADD COLUMN `topic_pic_thumb` varchar(1024) NOT NULL DEFAULT '' AFTER `topic_pic`,
  ADD COLUMN `topic_pic_slide` varchar(1024) NOT NULL DEFAULT '' AFTER `topic_pic_thumb`,
  ADD COLUMN `topic_key` varchar(255) NOT NULL DEFAULT '' AFTER `topic_pic_slide`,
  ADD COLUMN `topic_des` varchar(255) NOT NULL DEFAULT '' AFTER `topic_key`,
  ADD COLUMN `topic_title` varchar(255) NOT NULL DEFAULT '' AFTER `topic_des`,
  ADD COLUMN `topic_blurb` varchar(255) NOT NULL DEFAULT '' AFTER `topic_title`,
  ADD COLUMN `topic_remarks` varchar(100) NOT NULL DEFAULT '' AFTER `topic_blurb`,
  ADD COLUMN `topic_level` int unsigned NOT NULL DEFAULT 0 AFTER `topic_remarks`,
  ADD COLUMN `topic_tag` varchar(100) NOT NULL DEFAULT '' AFTER `topic_level`,
  ADD COLUMN `topic_rel_vod` varchar(255) NOT NULL DEFAULT '' AFTER `topic_tag`,
  ADD COLUMN `topic_rel_art` varchar(255) NOT NULL DEFAULT '' AFTER `topic_rel_vod`,
  ADD COLUMN `topic_content` mediumtext NOT NULL AFTER `topic_rel_art`,
  ADD COLUMN `topic_time` int unsigned NOT NULL DEFAULT 0 AFTER `topic_content`,
  ADD COLUMN `topic_time_add` int unsigned NOT NULL DEFAULT 0 AFTER `topic_time`,
  ADD COLUMN `topic_hits` int unsigned NOT NULL DEFAULT 0 AFTER `topic_time_add`,
  DROP COLUMN `description`,
  DROP COLUMN `created_at`,
  DROP COLUMN `updated_at`,
  DROP KEY `idx_status`,
  DROP KEY `idx_sort`,
  ADD KEY `idx_topic_status` (`topic_status`),
  ADD KEY `idx_topic_sort` (`topic_sort`);

-- 2. bb_gbook - 添加user_id, reply, reply_time, updated_at
ALTER TABLE `bb_gbook`
  ADD COLUMN `user_id` int unsigned NOT NULL DEFAULT 0 COMMENT '会员ID' FIRST,
  ADD COLUMN `reply` text COMMENT '回复内容' AFTER `content`,
  ADD COLUMN `reply_time` int unsigned NOT NULL DEFAULT 0 COMMENT '回复时间' AFTER `reply`,
  ADD COLUMN `updated_at` int unsigned NOT NULL DEFAULT 0 AFTER `created_at`;

-- 3. bb_comment - 添加user_id, 重命名vod_id为mid, 添加updated_at
ALTER TABLE `bb_comment`
  ADD COLUMN `mid` int unsigned NOT NULL DEFAULT 0 COMMENT '视频ID' FIRST,
  ADD COLUMN `user_id` int unsigned NOT NULL DEFAULT 0 COMMENT '会员ID' AFTER `mid`,
  DROP COLUMN `vod_id`,
  DROP COLUMN `member_id`,
  ADD COLUMN `updated_at` int unsigned NOT NULL DEFAULT 0 AFTER `created_at`,
  DROP KEY `idx_vod_id`,
  DROP KEY `idx_member_id`,
  ADD KEY `idx_mid` (`mid`),
  ADD KEY `idx_user_id` (`user_id`);

-- 4. bb_attachment - 添加缺失字段
ALTER TABLE `bb_attachment`
  ADD COLUMN `url` varchar(255) NOT NULL DEFAULT '' COMMENT '附件URL' AFTER `path`,
  ADD COLUMN `ext` varchar(32) NOT NULL DEFAULT '' COMMENT '文件扩展名' AFTER `mime_type`,
  ADD COLUMN `md5` varchar(32) NOT NULL DEFAULT '' COMMENT 'MD5值' AFTER `ext`,
  ADD COLUMN `module` varchar(64) NOT NULL DEFAULT '' COMMENT '模块' AFTER `md5`,
  ADD COLUMN `ref_id` int unsigned NOT NULL DEFAULT 0 COMMENT '关联ID' AFTER `module`,
  ADD COLUMN `admin_id` int unsigned NOT NULL DEFAULT 0 COMMENT '管理员ID' AFTER `ref_id`,
  ADD COLUMN `member_id` int unsigned NOT NULL DEFAULT 0 COMMENT '会员ID' AFTER `admin_id`,
  ADD COLUMN `status` tinyint unsigned NOT NULL DEFAULT 1 COMMENT '状态' AFTER `member_id`,
  ADD COLUMN `updated_at` int unsigned NOT NULL DEFAULT 0 AFTER `created_at`,
  ADD KEY `idx_module` (`module`),
  ADD KEY `idx_ref_id` (`ref_id`);

-- 5. bb_server_group - 添加remark, status, sort
ALTER TABLE `bb_server_group`
  ADD COLUMN `remark` varchar(255) NOT NULL DEFAULT '' COMMENT '备注' AFTER `name`,
  ADD COLUMN `status` tinyint unsigned NOT NULL DEFAULT 1 COMMENT '状态' AFTER `remark`,
  ADD COLUMN `sort` int unsigned NOT NULL DEFAULT 0 COMMENT '排序' AFTER `status`,
  DROP COLUMN `description`,
  ADD KEY `idx_status` (`status`),
  ADD KEY `idx_sort` (`sort`);

-- 6. bb_downloader - 重命名name为from_key，添加缺失字段
ALTER TABLE `bb_downloader`
  ADD COLUMN `from_key` varchar(64) NOT NULL COMMENT '下载器编码' FIRST,
  ADD COLUMN `display_name` varchar(128) NOT NULL DEFAULT '' COMMENT '显示名称' AFTER `from_key`,
  ADD COLUMN `description` varchar(255) NOT NULL DEFAULT '' COMMENT '描述' AFTER `display_name`,
  ADD COLUMN `tip` varchar(255) NOT NULL DEFAULT '' COMMENT '提示信息' AFTER `description`,
  ADD COLUMN `parse_url` varchar(512) NOT NULL DEFAULT '' COMMENT '解析地址' AFTER `tip`,
  ADD COLUMN `parse_mode` tinyint unsigned NOT NULL DEFAULT 0 COMMENT '解析模式' AFTER `parse_url`,
  ADD COLUMN `target` varchar(16) NOT NULL DEFAULT '_self' COMMENT '打开方式' AFTER `parse_mode`,
  ADD COLUMN `downloader_code` mediumtext COMMENT '自定义下载器代码' AFTER `target`,
  DROP COLUMN `name`,
  DROP COLUMN `url`,
  ADD COLUMN `sort` int unsigned NOT NULL DEFAULT 0 COMMENT '排序' AFTER `downloader_code`,
  ADD UNIQUE KEY `uniq_from_key` (`from_key`),
  ADD KEY `idx_status_sort` (`status`, `sort`);

-- 7. bb_role - 重命名id为role_id，添加缺失字段
ALTER TABLE `bb_role`
  CHANGE COLUMN `id` `role_id` int unsigned NOT NULL AUTO_INCREMENT,
  ADD COLUMN `role_name` varchar(128) NOT NULL DEFAULT '' COMMENT '角色名称' AFTER `role_id`,
  ADD COLUMN `role_en` varchar(128) NOT NULL DEFAULT '' COMMENT '角色英文名' AFTER `role_name`,
  ADD COLUMN `role_status` tinyint unsigned NOT NULL DEFAULT 1 COMMENT '状态' AFTER `role_en`,
  ADD COLUMN `role_lock` tinyint unsigned NOT NULL DEFAULT 0 COMMENT '锁定' AFTER `role_status`,
  ADD COLUMN `role_letter` char(1) NOT NULL DEFAULT '' COMMENT '首字母' AFTER `role_lock`,
  ADD COLUMN `role_color` varchar(6) NOT NULL DEFAULT '' COMMENT '颜色' AFTER `role_letter`,
  ADD COLUMN `role_actor_id` int unsigned NOT NULL DEFAULT 0 COMMENT '演员ID' AFTER `role_color`,
  ADD COLUMN `role_actor_name` varchar(128) NOT NULL DEFAULT '' COMMENT '演员名称' AFTER `role_actor_id`,
  ADD COLUMN `role_pic` varchar(1024) NOT NULL DEFAULT '' COMMENT '角色图片' AFTER `role_actor_name`,
  ADD COLUMN `role_blurb` varchar(255) NOT NULL DEFAULT '' COMMENT '简介' AFTER `role_pic`,
  ADD COLUMN `role_remarks` varchar(100) NOT NULL DEFAULT '' COMMENT '备注' AFTER `role_blurb`,
  ADD COLUMN `role_tag` varchar(100) NOT NULL DEFAULT '' COMMENT '标签' AFTER `role_remarks`,
  ADD COLUMN `role_class` varchar(255) NOT NULL DEFAULT '' COMMENT '分类' AFTER `role_tag`,
  ADD COLUMN `role_level` int unsigned NOT NULL DEFAULT 0 COMMENT '等级' AFTER `role_class`,
  ADD COLUMN `role_tpl` varchar(30) NOT NULL DEFAULT '' COMMENT '模板' AFTER `role_level`,
  ADD COLUMN `role_jumpurl` varchar(150) NOT NULL DEFAULT '' COMMENT '跳转URL' AFTER `role_tpl`,
  ADD COLUMN `role_content` mediumtext NOT NULL COMMENT '内容' AFTER `role_jumpurl`,
  ADD COLUMN `role_time` int unsigned NOT NULL DEFAULT 0 COMMENT '更新时间' AFTER `role_content`,
  ADD COLUMN `role_time_add` int unsigned NOT NULL DEFAULT 0 COMMENT '添加时间' AFTER `role_time`,
  ADD COLUMN `role_hits` int unsigned NOT NULL DEFAULT 0 COMMENT '点击数' AFTER `role_time_add`,
  DROP COLUMN `name`,
  DROP COLUMN `description`,
  DROP COLUMN `permissions`,
  DROP COLUMN `created_at`,
  DROP COLUMN `updated_at`,
  DROP KEY `uniq_name`,
  ADD KEY `idx_role_status` (`role_status`),
  ADD KEY `idx_role_name` (`role_name`),
  ADD KEY `idx_role_en` (`role_en`);

-- 8. bb_article - 添加type_id, type_id_1等字段
ALTER TABLE `bb_article`
  ADD COLUMN `type_id` smallint unsigned NOT NULL DEFAULT 0 COMMENT '分类ID' AFTER `id`,
  ADD COLUMN `type_id_1` smallint unsigned NOT NULL DEFAULT 0 COMMENT '副分类ID' AFTER `type_id`,
  CHANGE COLUMN `title` `name` varchar(255) NOT NULL DEFAULT '' COMMENT '文章标题',
  ADD COLUMN `sub` varchar(255) NOT NULL DEFAULT '' COMMENT '副标题' AFTER `name`,
  ADD COLUMN `letter` char(1) NOT NULL DEFAULT '' COMMENT '首字母' AFTER `sub`,
  ADD COLUMN `color` varchar(6) NOT NULL DEFAULT '' COMMENT '颜色' AFTER `letter`,
  CHANGE COLUMN `cover` `pic` varchar(1024) NOT NULL DEFAULT '' COMMENT '文章图片',
  ADD COLUMN `pic_thumb` varchar(1024) NOT NULL DEFAULT '' COMMENT '缩略图' AFTER `pic`,
  ADD COLUMN `author` varchar(128) NOT NULL DEFAULT '' COMMENT '作者' AFTER `pic_thumb`,
  ADD COLUMN `source` varchar(128) NOT NULL DEFAULT '' COMMENT '来源' AFTER `author`,
  ADD COLUMN `tag` varchar(100) NOT NULL DEFAULT '' COMMENT '标签' AFTER `source`,
  CHANGE COLUMN `summary` `blurb` varchar(255) NOT NULL DEFAULT '' COMMENT '简介',
  ADD COLUMN `remarks` varchar(100) NOT NULL DEFAULT '' COMMENT '备注' AFTER `blurb`,
  ADD COLUMN `level` int unsigned NOT NULL DEFAULT 0 COMMENT '等级' AFTER `remarks`,
  ADD COLUMN `jump_url` varchar(255) NOT NULL DEFAULT '' COMMENT '跳转URL' AFTER `status`,
  ADD COLUMN `hits` int unsigned NOT NULL DEFAULT 0 COMMENT '点击数' AFTER `jump_url`,
  ADD KEY `idx_type_id` (`type_id`),
  ADD KEY `idx_type_id_1` (`type_id_1`);
