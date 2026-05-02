import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Between, IsNull, LessThanOrEqual, Like, Not } from 'typeorm';
import { Space, SpaceType } from '../entities/space.entity';
import { Attendance, CheckoutReason } from '../entities/attendance.entity';
import { User, UserRole } from '../entities/user.entity';
import { CheckInUseCase } from './application/use-cases/check-in.use-case';
import { CheckOutUseCase } from './application/use-cases/check-out.use-case';
import { CleanupExpiredAttendancesUseCase } from './application/use-cases/cleanup-expired-attendances.use-case';
import { ForceCheckOutUseCase } from './application/use-cases/force-check-out.use-case';
import { AttendancesService } from './attendances.service';

function createCleanupQueryBuilderMock() {
  const subQueryBuilder = {
    select: jest.fn().mockReturnThis(),
    from: jest.fn().mockReturnThis(),
    where: jest.fn().mockReturnThis(),
    getQuery: jest.fn().mockReturnValue('(SELECT user.id FROM users user)'),
  };

  return {
    subQuery: jest.fn().mockReturnValue(subQueryBuilder),
    update: jest.fn().mockReturnThis(),
    set: jest.fn().mockReturnThis(),
    where: jest.fn().mockReturnThis(),
    andWhere: jest.fn().mockReturnThis(),
    execute: jest.fn().mockResolvedValue({ affected: 0 }),
  };
}

describe('AttendancesService', () => {
  let service: AttendancesService;
  let attendancesRepository: {
    findOne: jest.Mock;
    find: jest.Mock;
    findAndCount: jest.Mock;
    count: jest.Mock;
    createQueryBuilder: jest.Mock;
    update: jest.Mock;
    save: jest.Mock;
  };
  let spacesRepository: {
    find: jest.Mock;
  };
  let checkInUseCase: {
    execute: jest.Mock;
  };

  const user: User = {
    id: 'user-id',
    name: 'Ana',
    email: 'ana@example.com',
    password: 'password',
    role: UserRole.Student,
    active: true,
    createdAt: new Date('2026-01-01T00:00:00.000Z'),
    toJSON: function (): Omit<User, 'password' | 'toJSON'> {
      throw new Error('Function not implemented.');
    },
  };

  const space: Space = {
    id: 'space-id',
    name: 'Laboratório 1',
    type: SpaceType.Laboratory,
    capacity: 2,
    createdAt: new Date('2026-01-01T00:00:00.000Z'),
  };

  const attendanceAtiva: Attendance = {
    id: 'attendance-id',
    userId: user.id,
    spaceId: space.id,
    user,
    space,
    entryAt: new Date('2026-04-30T10:00:00.000Z'),
    expectedExitAt: new Date('2026-04-30T11:00:00.000Z'),
    exitAt: null,
    overstayNotifiedAt: null,
    checkoutReason: null,
    closedByUserId: null,
    checkoutNote: null,
    closedByUser: null,
  };

  beforeEach(async () => {
    jest.useRealTimers();
    jest.restoreAllMocks();
    attendancesRepository = {
      findOne: jest.fn(),
      find: jest.fn(),
      findAndCount: jest.fn(),
      count: jest.fn(),
      createQueryBuilder: jest.fn(),
      update: jest.fn(),
      save: jest.fn(),
    };
    attendancesRepository.createQueryBuilder.mockImplementation(() =>
      createCleanupQueryBuilderMock(),
    );
    spacesRepository = {
      find: jest.fn(),
    };
    checkInUseCase = {
      execute: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AttendancesService,
        CheckOutUseCase,
        ForceCheckOutUseCase,
        CleanupExpiredAttendancesUseCase,
        {
          provide: getRepositoryToken(Attendance),
          useValue: attendancesRepository,
        },
        {
          provide: getRepositoryToken(Space),
          useValue: spacesRepository,
        },
        {
          provide: CheckInUseCase,
          useValue: checkInUseCase,
        },
      ],
    }).compile();

    service = module.get<AttendancesService>(AttendancesService);
  });

  it('deve delegar check-in para o use case', async () => {
    const dto = { spaceId: space.id };
    checkInUseCase.execute.mockResolvedValue(attendanceAtiva);

    const result = await service.checkIn(user.id, dto);

    expect(attendancesRepository.update).toHaveBeenCalledWith(
      {
        exitAt: expect.any(Object),
        expectedExitAt: expect.any(Object),
      },
      {
        exitAt: expect.any(Date),
        checkoutReason: CheckoutReason.AutoExpired,
        checkoutNote: 'Saída automática por tempo excedido.',
      },
    );
    expect(checkInUseCase.execute).toHaveBeenCalledWith(user.id, dto);
    expect(result).toEqual(attendanceAtiva);
  });

  it('deve encerrar presenças expiradas antes de consultar ocupação', async () => {
    jest.useFakeTimers().setSystemTime(new Date('2026-01-01T00:00:00.000Z'));
    spacesRepository.find.mockResolvedValue([space]);
    const cleanupSubQueryBuilder = createCleanupQueryBuilderMock();
    const cleanupUpdateBuilder = createCleanupQueryBuilderMock();
    const occupancyQueryBuilder = {
      select: jest.fn().mockReturnThis(),
      addSelect: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      groupBy: jest.fn().mockReturnThis(),
      getRawMany: jest.fn().mockResolvedValue([]),
    };
    attendancesRepository.createQueryBuilder
      .mockReturnValueOnce(cleanupSubQueryBuilder)
      .mockReturnValueOnce(cleanupUpdateBuilder)
      .mockReturnValueOnce(occupancyQueryBuilder);

    await service.listOccupancy();

    expect(attendancesRepository.update).toHaveBeenCalledWith(
      {
        exitAt: expect.any(Object),
        expectedExitAt: LessThanOrEqual(new Date('2025-12-31T18:00:00.000Z')),
      },
      {
        exitAt: new Date('2026-01-01T00:00:00.000Z'),
        checkoutReason: CheckoutReason.AutoExpired,
        checkoutNote: 'Saída automática por tempo excedido.',
      },
    );
    expect(cleanupUpdateBuilder.set).toHaveBeenCalledWith({
      exitAt: new Date('2026-01-01T00:00:00.000Z'),
      checkoutReason: CheckoutReason.AutoExpired,
      checkoutNote: 'Saída automática por usuário desativado.',
    });
    expect(cleanupUpdateBuilder.andWhere).toHaveBeenCalledWith(
      'expected_exit_at <= :now',
      { now: new Date('2026-01-01T00:00:00.000Z') },
    );
  });

  it('deve encerrar automaticamente presença vencida de usuário desativado', async () => {
    jest.useFakeTimers().setSystemTime(new Date('2026-01-01T12:00:00.000Z'));
    const cleanupSubQueryBuilder = createCleanupQueryBuilderMock();
    const cleanupUpdateBuilder = createCleanupQueryBuilderMock();
    attendancesRepository.createQueryBuilder
      .mockReturnValueOnce(cleanupSubQueryBuilder)
      .mockReturnValueOnce(cleanupUpdateBuilder);

    await service.cleanupExpiredAttendances();

    expect(cleanupSubQueryBuilder.subQuery).toHaveBeenCalled();
    expect(cleanupUpdateBuilder.update).toHaveBeenCalledWith(Attendance);
    expect(cleanupUpdateBuilder.set).toHaveBeenCalledWith({
      exitAt: new Date('2026-01-01T12:00:00.000Z'),
      checkoutReason: CheckoutReason.AutoExpired,
      checkoutNote: 'Saída automática por usuário desativado.',
    });
    expect(cleanupUpdateBuilder.where).toHaveBeenCalledWith('exit_at IS NULL');
    expect(cleanupUpdateBuilder.andWhere).toHaveBeenCalledWith(
      'expected_exit_at <= :now',
      { now: new Date('2026-01-01T12:00:00.000Z') },
    );
  });

  it('deve registrar saída de presença ativa', async () => {
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
      checkoutReason: CheckoutReason.Manual,
      closedByUserId: user.id,
      checkoutNote: null,
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

  it('deve encerrar presença ativa por monitor ou admin', async () => {
    const attendanceEncerrada = {
      ...attendanceAtiva,
      exitAt: new Date('2026-04-30T11:00:00.000Z'),
      checkoutReason: CheckoutReason.Forced,
      closedByUserId: 'monitor-id',
      checkoutNote: 'Usuário esqueceu de sair.',
    };
    attendancesRepository.findOne
      .mockResolvedValueOnce(attendanceAtiva)
      .mockResolvedValueOnce({
        ...attendanceAtiva,
        id: 'monitor-attendance-id',
        userId: 'monitor-id',
      });
    attendancesRepository.save.mockResolvedValue(attendanceEncerrada);

    const result = await service.forceCheckOut(
      attendanceAtiva.id,
      {
        sub: 'monitor-id',
        email: 'monitor@example.com',
        role: UserRole.Monitor,
        iat: 0,
        exp: 0,
      },
      ' Usuário esqueceu de sair. ',
    );

    expect(attendancesRepository.findOne).toHaveBeenNthCalledWith(1, {
      where: { id: attendanceAtiva.id, exitAt: expect.any(Object) },
      relations: { user: true, space: true },
    });
    expect(attendancesRepository.findOne).toHaveBeenNthCalledWith(2, {
      where: { userId: 'monitor-id', exitAt: expect.any(Object) },
    });
    expect(attendancesRepository.save).toHaveBeenCalledWith({
      ...attendanceAtiva,
      exitAt: expect.any(Date),
      checkoutReason: CheckoutReason.Forced,
      closedByUserId: 'monitor-id',
      checkoutNote: 'Usuário esqueceu de sair.',
    });
    expect(result).toEqual(attendanceEncerrada);
  });

  it('deve bloquear monitor encerrando presença fora do próprio ambiente', async () => {
    attendancesRepository.findOne
      .mockResolvedValueOnce(attendanceAtiva)
      .mockResolvedValueOnce({
        ...attendanceAtiva,
        id: 'monitor-attendance-id',
        userId: 'monitor-id',
        spaceId: 'outro-space-id',
      });

    await expect(
      service.forceCheckOut(attendanceAtiva.id, {
        sub: 'monitor-id',
        email: 'monitor@example.com',
        role: UserRole.Monitor,
        iat: 0,
        exp: 0,
      }),
    ).rejects.toThrow(
      'Monitor só pode encerrar presenças do próprio ambiente.',
    );
    expect(attendancesRepository.save).not.toHaveBeenCalled();
  });

  it('deve bloquear encerramento forçado sem permissão', async () => {
    await expect(
      service.forceCheckOut(attendanceAtiva.id, {
        sub: user.id,
        email: user.email,
        role: UserRole.Student,
        iat: 0,
        exp: 0,
      }),
    ).rejects.toThrow('Você não tem permissão para encerrar presença.');
    expect(attendancesRepository.findOne).not.toHaveBeenCalled();
  });

  it('deve consultar presença ativa do usuário logado', async () => {
    attendancesRepository.findOne.mockResolvedValue(attendanceAtiva);

    const result = await service.listCurrent(user.id);

    expect(attendancesRepository.findOne).toHaveBeenCalledWith({
      where: { userId: user.id, exitAt: expect.any(Object) },
      relations: { user: true, space: true },
    });
    expect(result).toEqual(attendanceAtiva);
  });

  it('deve listar presenças ativas sem paginação', async () => {
    attendancesRepository.find.mockResolvedValue([attendanceAtiva]);

    const result = await service.listActive();

    expect(attendancesRepository.find).toHaveBeenCalledWith({
      where: { exitAt: expect.any(Object) },
      relations: { user: true, space: true },
      order: { entryAt: 'DESC' },
    });
    expect(result).toEqual([attendanceAtiva]);
  });

  it('deve limitar presenças ativas de monitor ao próprio ambiente ativo', async () => {
    attendancesRepository.findOne.mockResolvedValue({
      ...attendanceAtiva,
      id: 'monitor-attendance-id',
      userId: 'monitor-id',
      spaceId: space.id,
    });
    attendancesRepository.find.mockResolvedValue([attendanceAtiva]);

    await service.listActive(
      { spaceId: 'outro-space-id' },
      {
        sub: 'monitor-id',
        email: 'monitor@example.com',
        role: UserRole.Monitor,
        iat: 0,
        exp: 0,
      },
    );

    expect(attendancesRepository.find).toHaveBeenCalledWith({
      where: { exitAt: IsNull(), spaceId: space.id },
      relations: { user: true, space: true },
      order: { entryAt: 'DESC' },
    });
  });

  it('deve retornar presenças ativas vazias se monitor não tiver ambiente ativo', async () => {
    attendancesRepository.findOne.mockResolvedValue(null);

    const result = await service.listActive(
      { page: '1', limit: '10' },
      {
        sub: 'monitor-id',
        email: 'monitor@example.com',
        role: UserRole.Monitor,
        iat: 0,
        exp: 0,
      },
    );

    expect(result).toEqual({
      items: [],
      meta: {
        page: 1,
        limit: 10,
        totalItems: 0,
        totalPages: 0,
        hasNextPage: false,
        hasPreviousPage: false,
      },
    });
    expect(attendancesRepository.findAndCount).not.toHaveBeenCalled();
  });

  it('deve paginar presenças ativas com filtros', async () => {
    attendancesRepository.findAndCount.mockResolvedValue([
      [attendanceAtiva],
      9,
    ]);

    const result = await service.listActive({
      role: UserRole.Student,
      spaceType: SpaceType.Laboratory,
      search: 'Ana',
      page: '2',
      limit: '4',
    });

    expect(attendancesRepository.findAndCount).toHaveBeenCalledWith({
      where: [
        {
          exitAt: expect.any(Object),
          user: { role: UserRole.Student, name: Like('%Ana%') },
          space: { type: SpaceType.Laboratory },
        },
        {
          exitAt: expect.any(Object),
          user: { role: UserRole.Student, email: Like('%Ana%') },
          space: { type: SpaceType.Laboratory },
        },
        {
          exitAt: expect.any(Object),
          user: { role: UserRole.Student },
          space: { type: SpaceType.Laboratory, name: Like('%Ana%') },
        },
      ],
      relations: { user: true, space: true },
      order: { entryAt: 'DESC' },
      skip: 4,
      take: 4,
    });
    expect(result).toEqual({
      items: [attendanceAtiva],
      meta: {
        page: 2,
        limit: 4,
        totalItems: 9,
        totalPages: 3,
        hasNextPage: true,
        hasPreviousPage: true,
      },
    });
  });

  it('deve validar filtros de presenças ativas', async () => {
    await expect(
      service.listActive({ role: 'GUEST' as UserRole }),
    ).rejects.toThrow('Role inválida.');
    await expect(
      service.listActive({ spaceType: 'auditorium' }),
    ).rejects.toThrow('Tipo de space inválido.');
    expect(attendancesRepository.find).not.toHaveBeenCalled();
  });

  it('deve listar histórico paginado com filtros', async () => {
    const attendanceEncerrada = {
      ...attendanceAtiva,
      exitAt: new Date('2026-04-30T11:00:00.000Z'),
      checkoutReason: CheckoutReason.Manual,
    };
    attendancesRepository.findAndCount.mockResolvedValue([
      [attendanceEncerrada],
      1,
    ]);

    const result = await service.listHistory(
      {
        role: UserRole.Student,
        spaceType: SpaceType.Laboratory,
        checkoutReason: CheckoutReason.Manual,
        from: '2026-04-01T00:00:00.000Z',
        to: '2026-04-30T23:59:59.000Z',
        search: 'Ana',
        page: '1',
        limit: '10',
      },
      {
        sub: 'admin-id',
        email: 'admin@example.com',
        role: UserRole.Admin,
        iat: 0,
        exp: 0,
      },
    );

    expect(attendancesRepository.findAndCount).toHaveBeenCalledWith({
      where: [
        {
          exitAt: Not(IsNull()),
          checkoutReason: CheckoutReason.Manual,
          entryAt: Between(
            new Date('2026-04-01T00:00:00.000Z'),
            new Date('2026-04-30T23:59:59.000Z'),
          ),
          user: { role: UserRole.Student, name: Like('%Ana%') },
          space: { type: SpaceType.Laboratory },
        },
        {
          exitAt: Not(IsNull()),
          checkoutReason: CheckoutReason.Manual,
          entryAt: Between(
            new Date('2026-04-01T00:00:00.000Z'),
            new Date('2026-04-30T23:59:59.000Z'),
          ),
          user: { role: UserRole.Student, email: Like('%Ana%') },
          space: { type: SpaceType.Laboratory },
        },
        {
          exitAt: Not(IsNull()),
          checkoutReason: CheckoutReason.Manual,
          entryAt: Between(
            new Date('2026-04-01T00:00:00.000Z'),
            new Date('2026-04-30T23:59:59.000Z'),
          ),
          user: { role: UserRole.Student },
          space: { type: SpaceType.Laboratory, name: Like('%Ana%') },
        },
      ],
      relations: { user: true, space: true, closedByUser: true },
      order: { entryAt: 'DESC' },
      skip: 0,
      take: 10,
    });
    expect(result).toEqual({
      items: [attendanceEncerrada],
      meta: {
        page: 1,
        limit: 10,
        totalItems: 1,
        totalPages: 1,
        hasNextPage: false,
        hasPreviousPage: false,
      },
    });
  });

  it('deve limitar histórico de estudante ao próprio usuário', async () => {
    attendancesRepository.find.mockResolvedValue([attendanceAtiva]);

    await service.listHistory(
      {},
      {
        sub: user.id,
        email: user.email,
        role: UserRole.Student,
        iat: 0,
        exp: 0,
      },
    );

    expect(attendancesRepository.find).toHaveBeenCalledWith({
      where: { exitAt: Not(IsNull()), userId: user.id },
      relations: { user: true, space: true, closedByUser: true },
      order: { entryAt: 'DESC' },
    });
  });

  it('deve limitar histórico de monitor ao próprio usuário', async () => {
    const attendanceEncerradaPorAdmin = {
      ...attendanceAtiva,
      userId: 'monitor-id',
      exitAt: new Date('2026-04-30T11:00:00.000Z'),
      checkoutReason: CheckoutReason.Forced,
      closedByUserId: 'admin-id',
    };
    attendancesRepository.find.mockResolvedValue([attendanceEncerradaPorAdmin]);

    await service.listHistory(
      { spaceId: 'outro-space-id' },
      {
        sub: 'monitor-id',
        email: 'monitor@example.com',
        role: UserRole.Monitor,
        iat: 0,
        exp: 0,
      },
    );

    expect(attendancesRepository.findOne).not.toHaveBeenCalled();
    expect(attendancesRepository.find).toHaveBeenCalledWith({
      where: { exitAt: Not(IsNull()), userId: 'monitor-id' },
      relations: { user: true, space: true, closedByUser: true },
      order: { entryAt: 'DESC' },
    });
  });

  it('deve listar histórico próprio do monitor mesmo sem ambiente ativo', async () => {
    const attendanceAutoEncerrada = {
      ...attendanceAtiva,
      userId: 'monitor-id',
      exitAt: new Date('2026-04-30T17:00:00.000Z'),
      checkoutReason: CheckoutReason.AutoExpired,
    };
    attendancesRepository.findAndCount.mockResolvedValue([
      [attendanceAutoEncerrada],
      1,
    ]);

    const result = await service.listHistory(
      { page: '1', limit: '10' },
      {
        sub: 'monitor-id',
        email: 'monitor@example.com',
        role: UserRole.Monitor,
        iat: 0,
        exp: 0,
      },
    );

    expect(attendancesRepository.findOne).not.toHaveBeenCalled();
    expect(attendancesRepository.findAndCount).toHaveBeenCalledWith({
      where: { exitAt: Not(IsNull()), userId: 'monitor-id' },
      relations: { user: true, space: true, closedByUser: true },
      order: { entryAt: 'DESC' },
      skip: 0,
      take: 10,
    });
    expect(result).toEqual({
      items: [attendanceAutoEncerrada],
      meta: {
        page: 1,
        limit: 10,
        totalItems: 1,
        totalPages: 1,
        hasNextPage: false,
        hasPreviousPage: false,
      },
    });
  });

  it('deve validar filtros de histórico', async () => {
    await expect(
      service.listHistory({ checkoutReason: 'lost' as CheckoutReason }),
    ).rejects.toThrow('Motivo de saída inválido.');
    await expect(
      service.listHistory({ from: 'data-invalida' }),
    ).rejects.toThrow('Filtro from inválido.');
  });

  it('deve retornar notificações de permanência excedida', async () => {
    const attendanceExpirada = {
      ...attendanceAtiva,
      expectedExitAt: new Date('2026-04-30T09:00:00.000Z'),
      overstayNotifiedAt: null,
    };

    attendancesRepository.findOne.mockResolvedValue(attendanceExpirada);
    attendancesRepository.save.mockResolvedValue({
      ...attendanceExpirada,
      overstayNotifiedAt: expect.any(Date),
    });

    const result = await service.listNotifications(user.id);

    expect(attendancesRepository.save).toHaveBeenCalledWith({
      ...attendanceExpirada,
      overstayNotifiedAt: expect.any(Date),
    });
    expect(result[0]).toMatchObject({
      attendanceId: attendanceAtiva.id,
      type: 'overdue',
      spaceId: space.id,
      message: 'Tempo de permanência excedido. Deixe o ambiente imediatamente.',
    });
  });

  it('deve retornar notificação preventiva antes do prazo expirar', async () => {
    jest.useFakeTimers().setSystemTime(new Date('2026-04-30T10:55:00.000Z'));
    const attendanceQuaseExpirada = {
      ...attendanceAtiva,
      expectedExitAt: new Date('2026-04-30T11:00:00.000Z'),
    };
    attendancesRepository.findOne.mockResolvedValue(attendanceQuaseExpirada);

    const result = await service.listNotifications(user.id);

    expect(attendancesRepository.save).not.toHaveBeenCalled();
    expect(result[0]).toMatchObject({
      type: 'leaving_soon',
      exceededMinutes: 0,
      message: 'Seu tempo de permanência termina em menos de 10 minutos.',
    });
  });

  it('deve listar ocupação por espaço', async () => {
    spacesRepository.find.mockResolvedValue([space]);
    const queryBuilder = {
      select: jest.fn().mockReturnThis(),
      addSelect: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      groupBy: jest.fn().mockReturnThis(),
      getRawMany: jest
        .fn()
        .mockResolvedValue([{ spaceId: space.id, currentOccupancy: '1' }]),
    };
    attendancesRepository.createQueryBuilder
      .mockReturnValueOnce(createCleanupQueryBuilderMock())
      .mockReturnValueOnce(createCleanupQueryBuilderMock())
      .mockReturnValueOnce(queryBuilder);

    const result = await service.listOccupancy();

    expect(queryBuilder.select).toHaveBeenCalledWith(
      'attendance.spaceId',
      'spaceId',
    );
    expect(queryBuilder.addSelect).toHaveBeenCalledWith(
      'COUNT(attendance.id)',
      'currentOccupancy',
    );
    expect(queryBuilder.where).toHaveBeenCalledWith(
      'attendance.exitAt IS NULL',
    );
    expect(queryBuilder.groupBy).toHaveBeenCalledWith('attendance.spaceId');
    expect(result).toEqual([
      {
        spaceId: space.id,
        name: space.name,
        type: space.type,
        capacity: space.capacity,
        currentOccupancy: 1,
        availableSlots: 1,
        occupancyPercentage: 50,
      },
    ]);
  });
});
