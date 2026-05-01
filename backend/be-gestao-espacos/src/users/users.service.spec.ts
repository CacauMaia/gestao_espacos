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
    createdAt: new Date('2026-01-01T00:00:00.000Z'),
  };

  beforeEach(async () => {
    usersRepository = {
      findOne: jest.fn(),
      find: jest.fn(),
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

  it('deve filtrar users por role e nome', async () => {
    usersRepository.find.mockResolvedValue([user]);

    const result = await service.list(UserRole.Student, ' Ana ');

    expect(usersRepository.find).toHaveBeenCalledWith({
      where: {
        role: UserRole.Student,
        name: Like('%Ana%'),
      },
      order: { name: 'ASC' },
    });
    expect(result).toEqual([user]);
  });
});
