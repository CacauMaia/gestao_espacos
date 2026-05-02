#!/bin/sh
set -e

echo "[entrypoint] waiting for database at ${DB_HOST:-db}:${DB_PORT:-3306}..."
node <<'NODE'
const mysql = require('mysql2/promise');
const host = process.env.DB_HOST || 'db';
const port = Number(process.env.DB_PORT || 3306);
const user = process.env.DB_USERNAME || 'root';
const password = process.env.DB_PASSWORD || 'Root@123';
const timeoutMs = 30000;
const intervalMs = 1000;
let elapsed = 0;

(async function waitDb() {
  while (elapsed < timeoutMs) {
    try {
      const connection = await mysql.createConnection({ host, port, user, password });
      await connection.end();
      process.exit(0);
    } catch (err) {
      await new Promise((resolve) => setTimeout(resolve, intervalMs));
      elapsed += intervalMs;
    }
  }
  console.error('[entrypoint] timed out waiting for database');
  process.exit(1);
})();
NODE

echo "[entrypoint] running attendance migrations"
npm run migrate:attendance-checkout

if [ "${RUN_SEED_ADMIN:-false}" = "true" ]; then
  echo "[entrypoint] running admin seed"
  npm run seed:admin
fi

exec npm run start:dev
