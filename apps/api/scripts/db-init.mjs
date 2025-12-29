import fs from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import mysql from 'mysql2/promise';

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

function splitSQL(sqlText) {
  const statements = [];
  let buf = '';
  let inSingle = false;
  let inDouble = false;
  let inLineComment = false;
  let inBlockComment = false;

  for (let i = 0; i < sqlText.length; i++) {
    const ch = sqlText[i];
    const next = sqlText[i + 1];

    if (!inSingle && !inDouble && !inBlockComment && ch === '-' && next === '-') {
      inLineComment = true;
    }
    if (!inSingle && !inDouble && !inLineComment && ch === '/' && next === '*') {
      inBlockComment = true;
    }

    if (inLineComment) {
      if (ch === '\n') inLineComment = false;
      buf += ch;
      continue;
    }
    if (inBlockComment) {
      if (ch === '*' && next === '/') {
        inBlockComment = false;
        buf += '*/';
        i++;
      } else {
        buf += ch;
      }
      continue;
    }

    if (ch === "'" && !inDouble) inSingle = !inSingle;
    if (ch === '"' && !inSingle) inDouble = !inDouble;

    if (ch === ';' && !inSingle && !inDouble) {
      const stmt = buf.trim();
      if (stmt) statements.push(stmt);
      buf = '';
      continue;
    }
    buf += ch;
  }
  const tail = buf.trim();
  if (tail) statements.push(tail);
  return statements;
}

async function main() {
  const host = env('MYSQL_HOST', '127.0.0.1');
  const port = Number(env('MYSQL_PORT', '3306'));
  const rootUser = env('MYSQL_ROOT_USER', 'root');
  const rootPass = env('MYSQL_ROOT_PASSWORD', '');

  const database = required('MYSQL_DATABASE');
  const appUser = required('MYSQL_USER');
  const appPass = required('MYSQL_PASSWORD');

  const schemaPath = path.join(process.cwd(), 'sql', 'schema.sql');
  const schemaSQL = await fs.readFile(schemaPath, 'utf8');
  const statements = splitSQL(schemaSQL).filter((s) => s && !s.startsWith('--'));

  const rootConn = await mysql.createConnection({
    host,
    port,
    user: rootUser,
    password: rootPass,
    multipleStatements: true,
  });

  try {
    await rootConn.query(`CREATE DATABASE IF NOT EXISTS \`${database}\` DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`);
    await rootConn.query(`CREATE USER IF NOT EXISTS '${appUser}'@'%' IDENTIFIED BY ?`, [appPass]);
    await rootConn.query(`GRANT ALL PRIVILEGES ON \`${database}\`.* TO '${appUser}'@'%'`);
    await rootConn.query('FLUSH PRIVILEGES');

    await rootConn.query(`USE \`${database}\``);
    for (const stmt of statements) {
      const trimmed = stmt.trim();
      if (!trimmed) continue;
      await rootConn.query(trimmed);
    }
  } finally {
    await rootConn.end();
  }

  // eslint-disable-next-line no-console
  console.log(`OK: database '${database}' initialized and schema applied.`);
}

main().catch((err) => {
  // eslint-disable-next-line no-console
  console.error(err);
  process.exit(1);
});

