import process from 'node:process';
import mysql from 'mysql2/promise';
import bcrypt from 'bcryptjs';

function env(name, fallback = '') {
  const val = process.env[name];
  if (val === undefined || val === null || String(val).trim() === '') return fallback;
  return String(val);
}

function required(name) {
  const val = env(name);
  if (!val) throw new Error(`Missing required env: ${name}`);
  return val;
}

async function main() {
  const host = env('MYSQL_HOST', '127.0.0.1');
  const port = Number(env('MYSQL_PORT', '3306'));
  const database = required('MYSQL_DATABASE');
  const user = required('MYSQL_USER');
  const password = required('MYSQL_PASSWORD');

  const adminUser = env('CMS_ADMIN_USER', 'admin');
  const adminPass = env('CMS_ADMIN_PASSWORD', 'admin123456');
  const now = Math.floor(Date.now() / 1000);

  const conn = await mysql.createConnection({
    host,
    port,
    user,
    password,
    database,
  });

  try {
    const [rows] = await conn.query('SELECT id FROM bb_admin WHERE username = ? LIMIT 1', [adminUser]);
    if (Array.isArray(rows) && rows.length > 0) {
      // eslint-disable-next-line no-console
      console.log('OK: admin already exists, skip seed.');
      return;
    }

    const hash = await bcrypt.hash(adminPass, 10);
    await conn.query(
      'INSERT INTO bb_admin (username, password_hash, role, created_at, updated_at) VALUES (?,?,?,?,?)',
      [adminUser, hash, 'owner', now, now],
    );
    // eslint-disable-next-line no-console
    console.log(`OK: seeded admin user '${adminUser}'.`);

    // default member group
    await conn.query(
      'INSERT INTO bb_member_group (id, name, remark, level, status, created_at, updated_at) VALUES (1,?,?,?,?,?,?) ON DUPLICATE KEY UPDATE name=VALUES(name)',
      ['默认会员', 'Default group', 0, 1, now, now],
    );
  } finally {
    await conn.end();
  }
}

main().catch((err) => {
  // eslint-disable-next-line no-console
  console.error(err);
  process.exit(1);
});
