import { CheckInUseCase } from './check-in.use-case';
import { CheckInPolicy } from '../../domain/check-in.policy';
import { Attendance } from '../../../entities/attendance.entity';
import { Space, SpaceType } from '../../../entities/space.entity';
import { User, UserRole } from '../../../entities/user.entity';
import { AttendanceCheckInRepositoryPort } from '../ports/attendance-check-in.repository.port';

describe('CheckInUseCase', () => {
  let repository: jest.Mocked<AttendanceCheckInRepositoryPort>;
  let useCase: CheckInUseCase;

  const user: User = {
    id: 'user-id',
    name: 'Ana',
    email: 'ana@example.com',
    password: 'password',
    role: UserRole.Student,
    active: true,
    createdAt: new Date('2026-01-01T00:00:00.000Z'),
  };
  const space: Space = {
    id: 'space-id',
    name: 'Laboratório',
    type: SpaceType.Laboratory,
    capacity: 2,
    createdAt: new Date('2026-01-01T00:00:00.000Z'),
  };
  const attendance: Attendance = {
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

  beforeEach(() => {
    repository = {
      withLockedCheckInContext: jest.fn(),
    };
    useCase = new CheckInUseCase(repository, new CheckInPolicy());
  });

  it('deve criar presença quando política permite entrada', async () => {
    repository.withLockedCheckInContext.mockImplementation(
      (_userId, _spaceId, handler) =>
        handler({
          user,
          space,
          hasActiveAttendance: false,
          currentOccupancy: 1,
          createAttendance: jest.fn().mockResolvedValue(attendance),
        }),
    );

    const result = await useCase.execute(user.id, { spaceId: space.id });

    expect(repository.withLockedCheckInContext.mock.calls[0]).toEqual([
      user.id,
      space.id,
      expect.any(Function),
    ]);
    expect(result).toEqual(attendance);
  });

  it('deve rejeitar usuário com presença ativa', async () => {
    repository.withLockedCheckInContext.mockImplementation(
      (_userId, _spaceId, handler) =>
        handler({
          user,
          space,
          hasActiveAttendance: true,
          currentOccupancy: 1,
          createAttendance: jest.fn(),
        }),
    );

    await expect(
      useCase.execute(user.id, { spaceId: space.id }),
    ).rejects.toThrow('User já possui presença ativa.');
  });
});
