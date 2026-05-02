import 'reflect-metadata';
import { DataSource } from 'typeorm';
import { randomBytes, scryptSync } from 'crypto';
import { User, UserRole } from '../src/entities/user.entity';

const dataSource = new DataSource({
  type: 'mysql',
  host: process.env.DB_HOST ?? 'localhost',
  port: Number(process.env.DB_PORT ?? 3306),
  username: process.env.DB_USERNAME ?? process.env.DB_USER ?? 'root',
  password: process.env.DB_PASSWORD ?? 'Root@123',
  database: process.env.DB_DATABASE ?? process.env.DB_NAME ?? 'gestao_espacos',
  entities: [User],
  synchronize: false,
});

function hashPassword(password: string): string {
  const salt = randomBytes(16).toString('hex');
  const hash = scryptSync(password, salt, 64).toString('hex');

  return `scrypt:${salt}:${hash}`;
}

async function seedAdmin() {
  await dataSource.initialize();

  const usersRepository = dataSource.getRepository(User);
  const email = process.env.SEED_ADMIN_EMAIL ?? 'admin@gestao.local';
  const password = process.env.SEED_ADMIN_PASSWORD ?? 'Admin123!';
  const name = process.env.SEED_ADMIN_NOME ?? 'Administrador';

  const adminExistente = await usersRepository.findOne({ where: { email } });

  if (adminExistente) {
    console.log(`Admin já existe: ${email}`);
    await dataSource.destroy();
    return;
  }

  const admin = usersRepository.create({
    name,
    email,
    password: hashPassword(password),
    role: UserRole.Admin,
  });

  await usersRepository.save(admin);
  console.log(`Admin criado: ${email}`);
  console.log('Senha inicial definida pela variável SEED_ADMIN_PASSWORD.');

  await dataSource.destroy();
}

seedAdmin().catch(async (error) => {
  console.error('Erro ao executar seed de admin:', error);

  if (dataSource.isInitialized) {
    await dataSource.destroy();
  }

  process.exit(1);
});
