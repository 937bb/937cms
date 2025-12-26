-- 初始化采集类型绑定
-- 将远程类型 ID 映射到本地分类 ID
-- source_id=1 对应的远程类型映射

INSERT IGNORE INTO `bb_collect_type_bind`
  (`source_id`, `remote_type_id`, `remote_type_name`, `local_type_id`, `created_at`, `updated_at`)
VALUES
  -- 电影类型
  (1, 1, '电影', 1, UNIX_TIMESTAMP(), UNIX_TIMESTAMP()),
  (1, 2, '动漫', 2, UNIX_TIMESTAMP(), UNIX_TIMESTAMP()),
  (1, 3, '电视剧', 3, UNIX_TIMESTAMP(), UNIX_TIMESTAMP()),
  (1, 4, '综艺', 4, UNIX_TIMESTAMP(), UNIX_TIMESTAMP()),
  (1, 5, '短剧', 5, UNIX_TIMESTAMP(), UNIX_TIMESTAMP()),
  (1, 6, '纪录片', 1, UNIX_TIMESTAMP(), UNIX_TIMESTAMP()),
  (1, 10, '体育', 1, UNIX_TIMESTAMP(), UNIX_TIMESTAMP()),
  (1, 12, '音乐', 1, UNIX_TIMESTAMP(), UNIX_TIMESTAMP()),
  (1, 13, '脱口秀', 4, UNIX_TIMESTAMP(), UNIX_TIMESTAMP()),
  (1, 14, '相声', 4, UNIX_TIMESTAMP(), UNIX_TIMESTAMP()),
  (1, 23, '儿童', 1, UNIX_TIMESTAMP(), UNIX_TIMESTAMP()),
  (1, 24, '教育', 1, UNIX_TIMESTAMP(), UNIX_TIMESTAMP());
