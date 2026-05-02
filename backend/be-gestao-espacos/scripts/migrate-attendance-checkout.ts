import 'reflect-metadata';
import { DataSource } from 'typeorm';

const database = process.env.DB_DATABASE ?? 'gestao_espacos';

const dataSource = new DataSource({
  type: 'mysql',
  host: process.env.DB_HOST ?? 'localhost',
  port: Number(process.env.DB_PORT ?? 3306),
  username: process.env.DB_USERNAME ?? process.env.DB_USER ?? 'root',
  password: process.env.DB_PASSWORD ?? 'Root@123',
  database,
  synchronize: false,
});

async function columnExists(tableName: string, columnName: string): Promise<boolean> {
  const rows = await dataSource.manager.query(
    `
      SELECT COUNT(*) AS total
      FROM information_schema.columns
      WHERE table_schema = ? AND table_name = ? AND column_name = ?
    `,
    [database, tableName, columnName],
  );

  return Number(rows[0]?.total ?? 0) > 0;
}

async function tableExists(tableName: string): Promise<boolean> {
  const rows = await dataSource.manager.query(
    `
      SELECT COUNT(*) AS total
      FROM information_schema.tables
      WHERE table_schema = ? AND table_name = ?
    `,
    [database, tableName],
  );

  return Number(rows[0]?.total ?? 0) > 0;
}

async function indexExists(tableName: string, indexName: string): Promise<boolean> {
  const rows = await dataSource.manager.query(
    `
      SELECT COUNT(*) AS total
      FROM information_schema.statistics
      WHERE table_schema = ? AND table_name = ? AND index_name = ?
    `,
    [database, tableName, indexName],
  );

  return Number(rows[0]?.total ?? 0) > 0;
}

async function constraintExists(tableName: string, constraintName: string): Promise<boolean> {
  const rows = await dataSource.manager.query(
    `
      SELECT COUNT(*) AS total
      FROM information_schema.table_constraints
      WHERE table_schema = ? AND table_name = ? AND constraint_name = ?
    `,
    [database, tableName, constraintName],
  );

  return Number(rows[0]?.total ?? 0) > 0;
}

async function addColumnIfMissing(
  tableName: string,
  columnName: string,
  definition: string,
): Promise<void> {
  if (await columnExists(tableName, columnName)) {
    return;
  }

  await dataSource.manager.query(`ALTER TABLE ${tableName} ADD COLUMN ${definition}`);
}

async function addIndexIfMissing(
  tableName: string,
  indexName: string,
  statement: string,
): Promise<void> {
  if (await indexExists(tableName, indexName)) {
    return;
  }

  await dataSource.manager.query(statement);
}

async function migrateRefreshTokens(): Promise<void> {
  if (!(await tableExists('refresh_tokens'))) {
    await dataSource.manager.query(`
      CREATE TABLE refresh_tokens (
        id CHAR(36) PRIMARY KEY,
        user_id CHAR(36) NOT NULL,
        token_hash CHAR(64) UNIQUE NOT NULL,
        expires_at TIMESTAMP NOT NULL,
        revoked_at TIMESTAMP NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

        CONSTRAINT fk_refresh_token_user
          FOREIGN KEY (user_id)
          REFERENCES users(id)
          ON DELETE CASCADE
      )
    `);
  }

  await addIndexIfMissing(
    'refresh_tokens',
    'idx_refresh_tokens_user',
    'CREATE INDEX idx_refresh_tokens_user ON refresh_tokens(user_id)',
  );
  await addIndexIfMissing(
    'refresh_tokens',
    'idx_refresh_tokens_expires',
    'CREATE INDEX idx_refresh_tokens_expires ON refresh_tokens(expires_at)',
  );
  await addIndexIfMissing(
    'refresh_tokens',
    'idx_refresh_tokens_revoked',
    'CREATE INDEX idx_refresh_tokens_revoked ON refresh_tokens(revoked_at)',
  );
}

async function migrateAttendances(): Promise<void> {
  if (!(await tableExists('attendances'))) {
    return;
  }

  await addColumnIfMissing(
    'attendances',
    'checkout_reason',
    "checkout_reason ENUM('manual', 'auto_expired', 'forced') NULL AFTER overstay_notified_at",
  );
  await addColumnIfMissing(
    'attendances',
    'closed_by_user_id',
    'closed_by_user_id CHAR(36) NULL AFTER checkout_reason',
  );
  await addColumnIfMissing(
    'attendances',
    'checkout_note',
    'checkout_note VARCHAR(255) NULL AFTER closed_by_user_id',
  );

  await addIndexIfMissing(
    'attendances',
    'idx_attendances_checkout_reason',
    'CREATE INDEX idx_attendances_checkout_reason ON attendances(checkout_reason)',
  );
  await addIndexIfMissing(
    'attendances',
    'idx_attendances_closed_by_user',
    'CREATE INDEX idx_attendances_closed_by_user ON attendances(closed_by_user_id)',
  );

  if (!(await constraintExists('attendances', 'fk_attendance_closed_by_user'))) {
    await dataSource.manager.query(`
      ALTER TABLE attendances
      ADD CONSTRAINT fk_attendance_closed_by_user
      FOREIGN KEY (closed_by_user_id) REFERENCES users(id)
      ON DELETE SET NULL
    `);
  }
}

async function migrate() {
  await dataSource.initialize();

  await migrateRefreshTokens();
  await migrateAttendances();

  await dataSource.destroy();
  console.log('Migração incremental executada com sucesso.');
}

migrate().catch(async (error) => {
  console.error('Erro ao executar migração de presenças.', error);
  if (dataSource.isInitialized) {
    await dataSource.destroy();
  }
  process.exit(1);
});
