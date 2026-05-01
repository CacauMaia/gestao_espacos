import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { User, UserRole } from '../entities/user.entity';
import { Space, SpaceType } from '../entities/space.entity';
import { Attendance } from '../entities/attendance.entity';
import { AttendancesService } from './attendances.service';

describe('AttendancesService', () => {
  let service: AttendancesService;
  let attendancesRepository: {
    findOne: jest.Mock;
    find: jest.Mock;
    count: jest.Mock;
    create: jest.Mock;
    save: jest.Mock;
  };
  let usersRepository: {
    findOne: jest.Mock;
  };
  let spacesRepository: {
    findOne: jest.Mock;
    find: jest.Mock;
  };

  const user: User = {
    id: 'user-id',
    name: 'Ana',
    email: 'ana@example.com',
    password: 'password',
    role: UserRole.Student,
    createdAt: new Date('2026-01-01T00:00:00.000Z'),
  };

  const space: Space = {
    id: 'space-id',
    name: 'Laboratório 1',
    type: SpaceType.Laboratory,
    capacity: 2,
    createdAt: new Date('2026-01-01T00:00:00.000Z'),
  };

  beforeEach(async () => {
    attendancesRepository = {
      findOne: jest.fn(),
      find: jest.fn(),
      count: jest.fn(),
      create: jest.fn(),
      save: jest.fn(),
    };
    usersRepository = {
      findOne: jest.fn(),
    };
    spacesRepository = {
      findOne: jest.fn(),
      find: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AttendancesService,
        {
          provide: getRepositoryToken(Attendance),
          useValue: attendancesRepository,
        },
        {
          provide: getRepositoryToken(User),
          useValue: usersRepository,
        },
        {
          provide: getRepositoryToken(Space),
          useValue: spacesRepository,
        },
      ],
    }).compile();

    service = module.get<AttendancesService>(AttendancesService);
  });

  it('deve create presença com entrada válida', async () => {
    const dto = { spaceId: space.id };
    const attendanceCriada = {
      ...dto,
      userId: user.id,
      user,
      space,
      entryAt: new Date('2026-04-30T10:00:00.000Z'),
      expectedExitAt: new Date('2026-04-30T11:00:00.000Z'),
      exitAt: null,
      overstayNotifiedAt: null,
    };
    const attendanceSalva = {
      id: 'attendance-id',
      ...attendanceCriada,
    };

    usersRepository.findOne.mockResolvedValue(user);
    spacesRepository.findOne.mockResolvedValue(space);
    attendancesRepository.findOne.mockResolvedValue(null);
    attendancesRepository.count.mockResolvedValue(1);
    attendancesRepository.create.mockReturnValue(attendanceCriada);
    attendancesRepository.save.mockResolvedValue(attendanceSalva);

    const result = await service.checkIn(user.id, dto);

    expect(usersRepository.findOne).toHaveBeenCalledWith({
      where: { id: user.id },
    });
    expect(spacesRepository.findOne).toHaveBeenCalledWith({
      where: { id: space.id },
    });
    expect(attendancesRepository.findOne).toHaveBeenCalledWith({
      where: { userId: user.id, exitAt: expect.any(Object) },
    });
    expect(attendancesRepository.count).toHaveBeenCalledWith({
      where: { spaceId: space.id, exitAt: expect.any(Object) },
    });
    expect(attendancesRepository.create).toHaveBeenCalledWith({
      user,
      userId: user.id,
      space,
      spaceId: space.id,
      entryAt: expect.any(Date),
      expectedExitAt: expect.any(Date),
      exitAt: null,
      overstayNotifiedAt: null,
    });
    expect(attendancesRepository.save).toHaveBeenCalledWith(attendanceCriada);
    expect(result).toEqual(attendanceSalva);
  });

  it('deve lançar erro se user já possui presença ativa', async () => {
    const dto = { spaceId: space.id };
    const attendanceAtiva = {
      id: 'attendance-ativa-id',
      ...dto,
      userId: user.id,
      user,
      space,
      entryAt: new Date('2026-04-30T10:00:00.000Z'),
      expectedExitAt: new Date('2026-04-30T11:00:00.000Z'),
      exitAt: null,
      overstayNotifiedAt: null,
    };

    usersRepository.findOne.mockResolvedValue(user);
    spacesRepository.findOne.mockResolvedValue(space);
    attendancesRepository.findOne.mockResolvedValue(attendanceAtiva);

    await expect(service.checkIn(user.id, dto)).rejects.toThrow(
      'User já possui presença ativa.',
    );
    expect(attendancesRepository.count).not.toHaveBeenCalled();
    expect(attendancesRepository.save).not.toHaveBeenCalled();
  });

  it('deve lançar erro se space estiver cheio', async () => {
    const dto = { spaceId: space.id };

    usersRepository.findOne.mockResolvedValue(user);
    spacesRepository.findOne.mockResolvedValue(space);
    attendancesRepository.findOne.mockResolvedValue(null);
    attendancesRepository.count.mockResolvedValue(space.capacity);

    await expect(service.checkIn(user.id, dto)).rejects.toThrow(
      'Space está cheio.',
    );
    expect(attendancesRepository.create).not.toHaveBeenCalled();
    expect(attendancesRepository.save).not.toHaveBeenCalled();
  });

  it('deve lançar erro se usuário admin tentar marcar presença', async () => {
    const dto = { spaceId: space.id };
    const admin = {
      ...user,
      role: UserRole.Admin,
    };

    usersRepository.findOne.mockResolvedValue(admin);
    spacesRepository.findOne.mockResolvedValue(space);

    await expect(service.checkIn(admin.id, dto)).rejects.toThrow(
      'Apenas alunos e monitores podem marcar presença.',
    );
    expect(attendancesRepository.findOne).not.toHaveBeenCalled();
    expect(attendancesRepository.count).not.toHaveBeenCalled();
    expect(attendancesRepository.save).not.toHaveBeenCalled();
  });

  it('deve registrar saída de presença ativa', async () => {
    const attendanceAtiva = {
      id: 'attendance-id',
      userId: user.id,
      spaceId: space.id,
      user,
      space,
      entryAt: new Date('2026-04-30T10:00:00.000Z'),
      expectedExitAt: new Date('2026-04-30T11:00:00.000Z'),
      exitAt: null,
      overstayNotifiedAt: null,
    };
    const attendanceComSaida = {
      ...attendanceAtiva,
      exitAt: new Date('2026-04-30T11:00:00.000Z'),
    };

    attendancesRepository.findOne.mockResolvedValue(attendanceAtiva);
    attendancesRepository.save.mockResolvedValue(attendanceComSaida);

    const result = await service.checkOut(user.id);

    expect(attendancesRepository.findOne).toHaveBeenCalledWith({
      where: { userId: user.id, exitAt: expect.any(Object) },
    });
    expect(attendancesRepository.save).toHaveBeenCalledWith({
      ...attendanceAtiva,
      exitAt: expect.any(Date),
    });
    expect(result).toEqual(attendanceComSaida);
  });

  it('deve lançar erro se não houver presença ativa na saída', async () => {
    attendancesRepository.findOne.mockResolvedValue(null);

    await expect(service.checkOut(user.id)).rejects.toThrow(
      'Presença ativa não encontrada.',
    );
    expect(attendancesRepository.save).not.toHaveBeenCalled();
  });
});
