import 'reflect-metadata';
import { DataSource } from 'typeorm';
import { readFileSync } from 'fs';
import { join } from 'path';

const dataSource = new DataSource({
  type: 'mysql',
  host: process.env.DB_HOST ?? 'localhost',
  port: Number(process.env.DB_PORT ?? 3306),
  username: process.env.DB_USER ?? 'root',
  password: process.env.DB_PASSWORD ?? 'Root@123',
  database: 'mysql', // Connect to mysql database initially to create gestao_espacos
  synchronize: false,
});

async function seedSchema() {
  await dataSource.initialize();

  const schemaPath = join(process.cwd(), '..', '..', 'database', 'schema.sql');
  const schemaSQL = readFileSync(schemaPath, 'utf-8');

  // Split SQL into individual statements
  const statements = schemaSQL.split(';').map(stmt => stmt.trim()).filter(stmt => stmt.length > 0);

  for (const statement of statements) {
    if (statement) {
      await dataSource.manager.query(statement);
    }
  }

  console.log('Schema executado com sucesso.');
  await dataSource.destroy();
}

seedSchema().catch(console.error);