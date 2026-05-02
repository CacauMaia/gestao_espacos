import { BadRequestException, ConflictException } from '@nestjs/common';
import { Space, SpaceType } from '../../entities/space.entity';
import { User, UserRole } from '../../entities/user.entity';
import { CheckInPolicy } from './check-in.policy';

describe('CheckInPolicy', () => {
  let policy: CheckInPolicy;

  const user: User = {
    id: 'user-id',
    name: 'Ana',
    email: 'ana@example.com',
    password: 'hash',
    role: UserRole.Student,
    active: true,
    createdAt: new Date('2026-01-01T00:00:00.000Z'),
  };

  const space: Space = {
    id: 'space-id',
    name: 'Lab',
    type: SpaceType.Laboratory,
    capacity: 2,
    createdAt: new Date('2026-01-01T00:00:00.000Z'),
  };

  beforeEach(() => {
    policy = new CheckInPolicy();
  });

  it('deve permitir aluno ou monitor ativo', () => {
    expect(() => policy.assertUserCanCheckIn(user)).not.toThrow();
    expect(() =>
      policy.assertUserCanCheckIn({ ...user, role: UserRole.Monitor }),
    ).not.toThrow();
  });

  it('deve bloquear usuário desativado ou admin', () => {
    expect(() =>
      policy.assertUserCanCheckIn({ ...user, active: false }),
    ).toThrow(BadRequestException);
    expect(() =>
      policy.assertUserCanCheckIn({ ...user, role: UserRole.Admin }),
    ).toThrow('Apenas alunos e monitores podem marcar presença.');
  });

  it('deve bloquear presença ativa duplicada e ambiente cheio', () => {
    expect(() => policy.assertUserHasNoActiveAttendance(true)).toThrow(
      ConflictException,
    );
    expect(() => policy.assertSpaceHasCapacity(space, 2)).toThrow(
      'Space está cheio.',
    );
    expect(() => policy.assertSpaceHasCapacity(space, 1)).not.toThrow();
  });

  it('deve calcular saída esperada para laboratório e sala de estudos', () => {
    const entryAt = new Date('2026-01-01T10:00:00.000Z');

    expect(policy.calculateExpectedExitAt(space, entryAt)).toEqual(
      new Date('2026-01-01T11:00:00.000Z'),
    );
    expect(
      policy.calculateExpectedExitAt(
        { ...space, type: SpaceType.Study },
        entryAt,
      ),
    ).toEqual(new Date('2026-01-01T13:00:00.000Z'));
  });

  it('deve calcular saída esperada de sala de aula por período local', () => {
    const classroom = { ...space, type: SpaceType.Classroom };

    expect(
      policy.calculateExpectedExitAt(
        classroom,
        new Date('2026-01-01T11:00:00.000Z'),
      ),
    ).toEqual(new Date('2026-01-01T14:30:00.000Z'));
  });

  it('deve bloquear entrada em sala de aula fora dos períodos', () => {
    expect(() =>
      policy.calculateExpectedExitAt(
        { ...space, type: SpaceType.Classroom },
        new Date('2026-01-01T21:00:00.000Z'),
      ),
    ).toThrow(BadRequestException);
  });

  it('deve bloquear entrada em sala de aula quando resta menos de 50 minutos no período', () => {
    expect(() =>
      policy.calculateExpectedExitAt(
        { ...space, type: SpaceType.Classroom },
        new Date('2026-01-01T13:50:00.000Z'),
      ),
    ).toThrow(
      'Entrada em sala de aula bloqueada quando faltam menos de 50 minutos para o fim do período.',
    );
  });
});
