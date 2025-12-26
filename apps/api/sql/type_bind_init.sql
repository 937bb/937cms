-- 为采集源 ID=1 (极速资源) 添加类型绑定
-- 将远程 type_id 映射到本地 type_id

INSERT INTO `bb_collect_type_bind` (source_id, remote_type_id, remote_type_name, local_type_id, created_at, updated_at) VALUES
(1, 1, '电影', 1, UNIX_TIMESTAMP(), UNIX_TIMESTAMP()),
(1, 2, '动漫', 2, UNIX_TIMESTAMP(), UNIX_TIMESTAMP()),
(1, 3, '电视剧', 3, UNIX_TIMESTAMP(), UNIX_TIMESTAMP()),
(1, 4, '综艺', 4, UNIX_TIMESTAMP(), UNIX_TIMESTAMP()),
(1, 5, '短剧', 5, UNIX_TIMESTAMP(), UNIX_TIMESTAMP()),
(1, 10, '电影', 1, UNIX_TIMESTAMP(), UNIX_TIMESTAMP()),
(1, 13, '电影', 1, UNIX_TIMESTAMP(), UNIX_TIMESTAMP()),
(1, 14, '电视剧', 3, UNIX_TIMESTAMP(), UNIX_TIMESTAMP()),
(1, 23, '动漫', 2, UNIX_TIMESTAMP(), UNIX_TIMESTAMP())
ON DUPLICATE KEY UPDATE local_type_id = VALUES(local_type_id), updated_at = UNIX_TIMESTAMP();
