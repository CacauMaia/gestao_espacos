import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Like } from 'typeorm';
import { PasswordService } from '../auth/services/password.service';
import { User, UserRole } from '../entities/user.entity';
import { UsersService } from './users.service';

describe('UsersService', () => {
  let service: UsersService;
  let usersRepository: {
    findOne: jest.Mock;
    find: jest.Mock;
    findAndCount: jest.Mock;
    create: jest.Mock;
    merge: jest.Mock;
    save: jest.Mock;
    remove: jest.Mock;
  };
  const passwordService = {
    hash: jest.fn((password: string) => `hashed-${password}`),
  };

  const user: User = {
    id: 'user-id',
    name: 'Ana Souza',
    email: 'ana.souza@example.com',
    password: 'password-teste',
    role: UserRole.Student,
    active: true,
    createdAt: new Date('2026-01-01T00:00:00.000Z'),
  };

  beforeEach(async () => {
    usersRepository = {
      findOne: jest.fn(),
      find: jest.fn(),
      findAndCount: jest.fn(),
      create: jest.fn(),
      merge: jest.fn(),
      save: jest.fn(),
      remove: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsersService,
        {
          provide: getRepositoryToken(User),
          useValue: usersRepository,
        },
        {
          provide: PasswordService,
          useValue: passwordService,
        },
      ],
    }).compile();

    service = module.get<UsersService>(UsersService);
  });

  it('deve create user com email único', async () => {
    const dto = {
      name: user.name,
      email: user.email,
      password: user.password,
    };

    usersRepository.findOne.mockResolvedValue(null);
    const userParaSalvar = {
      ...dto,
      role: UserRole.Student,
      password: `hashed-${dto.password}`,
    };

    usersRepository.create.mockReturnValue(userParaSalvar);
    usersRepository.save.mockResolvedValue(user);

    const result = await service.create(dto);

    expect(usersRepository.findOne).toHaveBeenCalledWith({
      where: { email: user.email },
    });
    expect(passwordService.hash).toHaveBeenCalledWith(dto.password);
    expect(usersRepository.create).toHaveBeenCalledWith(userParaSalvar);
    expect(usersRepository.save).toHaveBeenCalledWith(userParaSalvar);
    expect(result).toEqual(user);
  });

  it('deve lançar erro se email já estiver cadastrado', async () => {
    const dto = {
      name: user.name,
      email: user.email,
      password: user.password,
    };

    usersRepository.findOne.mockResolvedValue(user);

    await expect(service.create(dto)).rejects.toThrow('Email já cadastrado.');
    expect(usersRepository.save).not.toHaveBeenCalled();
  });

  it('deve lançar erro se user não existir', async () => {
    usersRepository.findOne.mockResolvedValue(null);

    await expect(service.findById('user-inexistente')).rejects.toThrow(
      'User não encontrado.',
    );
  });

  it('deve bloquear autodeleção de admin', async () => {
    const adminUser: User = {
      ...user,
      id: 'admin-id',
      role: UserRole.Admin,
    };

    usersRepository.findOne.mockResolvedValue(adminUser);

    await expect(
      service.remove('admin-id', {
        sub: 'admin-id',
        email: 'admin@example.com',
        role: UserRole.Admin,
        iat: 0,
        exp: 0,
      }),
    ).rejects.toThrow('Administrador não pode se autodeletar.');

    expect(usersRepository.remove).not.toHaveBeenCalled();
  });

  it('deve bloquear exclusão de outro admin', async () => {
    const adminUser: User = {
      ...user,
      id: 'admin-id',
      role: UserRole.Admin,
      active: true,
    };

    usersRepository.findOne.mockResolvedValue(adminUser);

    await expect(
      service.remove('admin-id', {
        sub: 'other-admin-id',
        email: 'other-admin@example.com',
        role: UserRole.Admin,
        iat: 0,
        exp: 0,
      }),
    ).rejects.toThrow('Administrador não pode deletar outro administrador.');

    expect(usersRepository.remove).not.toHaveBeenCalled();
  });

  it('deve desativar user não-admin quando admin autenticado', async () => {
    usersRepository.findOne.mockResolvedValue(user);

    await service.remove('user-id', {
      sub: 'admin-id',
      email: 'admin@example.com',
      role: UserRole.Admin,
      iat: 0,
      exp: 0,
    });

    expect(usersRepository.save).toHaveBeenCalledWith({
      ...user,
      active: false,
    });
    expect(usersRepository.remove).not.toHaveBeenCalled();
  });

  it('deve ativar ou desativar user não-admin pelo update', async () => {
    const inactiveUser: User = {
      ...user,
      active: false,
    };

    usersRepository.findOne.mockResolvedValue(inactiveUser);
    usersRepository.merge.mockReturnValue({ ...inactiveUser, active: true });
    usersRepository.save.mockResolvedValue({ ...inactiveUser, active: true });

    const result = await service.update('user-id', { active: true });

    expect(usersRepository.merge).toHaveBeenCalledWith(inactiveUser, {
      active: true,
    });
    expect(usersRepository.save).toHaveBeenCalledWith({
      ...inactiveUser,
      active: true,
    });
    expect(result.active).toBe(true);
  });

  it('deve bloquear ativação/desativação de admin pelo update', async () => {
    const adminUser: User = {
      ...user,
      id: 'admin-id',
      role: UserRole.Admin,
      active: true,
    };

    usersRepository.findOne.mockResolvedValue(adminUser);

    await expect(service.update('admin-id', { active: false })).rejects.toThrow(
      'Administrador não pode ser ativado ou desativado.',
    );
    expect(usersRepository.save).not.toHaveBeenCalled();
  });

  it('deve filtrar users por role e nome', async () => {
    usersRepository.find.mockResolvedValue([user]);

    const result = await service.list({
      role: UserRole.Student,
      search: ' Ana ',
    });

    expect(usersRepository.find).toHaveBeenCalledWith({
      where: [
        { role: UserRole.Student, name: Like('%Ana%') },
        { role: UserRole.Student, email: Like('%Ana%') },
      ],
      order: { name: 'ASC' },
    });
    expect(result).toEqual([user]);
  });

  it('deve paginar users com filtros de role, active e busca', async () => {
    usersRepository.findAndCount.mockResolvedValue([[user], 12]);

    const result = await service.list({
      role: UserRole.Student,
      search: 'ana',
      active: 'true',
      page: '2',
      limit: '5',
    });

    expect(usersRepository.findAndCount).toHaveBeenCalledWith({
      where: [
        { role: UserRole.Student, active: true, name: Like('%ana%') },
        { role: UserRole.Student, active: true, email: Like('%ana%') },
      ],
      order: { name: 'ASC' },
      skip: 5,
      take: 5,
    });
    expect(result).toEqual({
      items: [user],
      meta: {
        page: 2,
        limit: 5,
        totalItems: 12,
        totalPages: 3,
        hasNextPage: true,
        hasPreviousPage: true,
      },
    });
  });

  it('deve validar filtro active', async () => {
    await expect(service.list({ active: 'talvez' })).rejects.toThrow(
      'active deve ser true ou false.',
    );
    expect(usersRepository.find).not.toHaveBeenCalled();
  });
});
