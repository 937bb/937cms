import { spawnSync } from 'node:child_process';
import path from 'node:path';
import process from 'node:process';

function run(cmd, args, opts = {}) {
  const res = spawnSync(cmd, args, { stdio: 'inherit', ...opts });
  if (res.status !== 0) process.exit(res.status || 1);
}

const repoRoot = path.resolve(process.cwd(), '..');
const collectorDir = path.join(repoRoot, 'collector');

const target = process.argv[2] || '';

if (!target || target === 'current') {
  run('go', ['build', '-o', path.join(collectorDir, 'dist', process.platform === 'win32' ? 'collector.exe' : 'collector'), './cmd/collector'], {
    cwd: collectorDir,
  });
  process.exit(0);
}

// target format: goos-goarch (e.g. linux-amd64)
const m = String(target).trim().match(/^([a-z0-9_]+)-([a-z0-9_]+)$/i);
if (!m) {
  console.error('Usage: node build-collector.mjs [current|goos-goarch]');
  process.exit(2);
}

const goos = m[1];
const goarch = m[2];
const ext = goos === 'windows' ? '.exe' : '';
const out = path.join(collectorDir, 'dist', `collector-${goos}-${goarch}${ext}`);

run('go', ['build', '-o', out, './cmd/collector'], {
  cwd: collectorDir,
  env: { ...process.env, GOOS: goos, GOARCH: goarch },
});

