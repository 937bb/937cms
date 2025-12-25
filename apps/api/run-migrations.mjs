import mysql from 'mysql2/promise';

const pool = await mysql.createPool({
  host: 'localhost',
  port: 3306,
  user: 'root',
  password: '123456',
  database: 'bb_cms',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
});

const conn = await pool.getConnection();

try {
  console.log('执行迁移...');

  // 1. 启用会话令牌功能
  console.log('1. 启用会话令牌功能...');
  await conn.query('UPDATE `bb_session_token_config` SET `enabled` = 1 WHERE `id` = 1');
  console.log('✓ 完成');

  // 2. 确保 API 密钥存在
  console.log('2. 确保 API 密钥存在...');
  await conn.query(
    'INSERT IGNORE INTO `bb_api_key` (`key`, `name`, `enabled`, `created_at`, `updated_at`) VALUES (?, ?, 1, UNIX_TIMESTAMP(), UNIX_TIMESTAMP())',
    ['ffc01bbb2515ff3f8de91ca7ebdf25f825ff7b754c3f53554c6881cabdc19b97', 'Default API Key']
  );
  await conn.query(
    'UPDATE `bb_api_key` SET `enabled` = 1 WHERE `key` = ?',
    ['ffc01bbb2515ff3f8de91ca7ebdf25f825ff7b754c3f53554c6881cabdc19b97']
  );
  console.log('✓ 完成');

  // 3. 添加 api_key_id 字段（如果不存在）
  console.log('3. 检查并添加 api_key_id 字段...');
  try {
    await conn.query('ALTER TABLE `bb_session_token` ADD COLUMN `api_key_id` INT UNSIGNED COMMENT "API Key ID" AFTER `id`');
    console.log('✓ 字段已添加');
  } catch (e) {
    if (e.code === 'ER_DUP_FIELDNAME') {
      console.log('✓ 字段已存在');
    } else {
      throw e;
    }
  }

  // 4. 添加索引
  console.log('4. 检查并添加索引...');
  try {
    await conn.query('ALTER TABLE `bb_session_token` ADD INDEX `idx_api_key_id` (`api_key_id`)');
    console.log('✓ 索引已添加');
  } catch (e) {
    if (e.code === 'ER_DUP_KEYNAME') {
      console.log('✓ 索引已存在');
    } else {
      throw e;
    }
  }

  // 5. 验证
  console.log('\n验证配置...');
  const [config] = await conn.query('SELECT * FROM bb_session_token_config LIMIT 1');
  console.log('会话令牌配置:', config[0]);

  const [apiKey] = await conn.query(
    'SELECT id, `key`, name, enabled FROM bb_api_key WHERE `key` LIKE ? LIMIT 1',
    ['ffc01bbb%']
  );
  console.log('API 密钥:', apiKey[0]);

  console.log('\n✅ 所有迁移完成！');
} catch (error) {
  console.error('❌ 错误:', error.message);
  process.exit(1);
} finally {
  await conn.release();
  await pool.end();
}
