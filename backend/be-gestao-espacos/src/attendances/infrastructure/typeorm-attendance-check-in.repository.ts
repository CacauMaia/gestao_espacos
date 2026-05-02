import { Injectable, NotFoundException } from '@nestjs/common';
import { DataSource, IsNull } from 'typeorm';
import {
  AttendanceCheckInRepositoryPort,
  LockedCheckInContext,
} from '../application/ports/attendance-check-in.repository.port';
import { Attendance } from '../../entities/attendance.entity';
import { Space } from '../../entities/space.entity';
import { User } from '../../entities/user.entity';

@Injectable()
export class TypeOrmAttendanceCheckInRepository implements AttendanceCheckInRepositoryPort {
  constructor(private readonly dataSource: DataSource) {}

  public withLockedCheckInContext(
    userId: string,
    spaceId: string,
    handler: (context: LockedCheckInContext) => Promise<Attendance>,
  ): Promise<Attendance> {
    return this.dataSource.transaction(async (manager) => {
      const user = await manager.findOne(User, {
        where: { id: userId },
        lock: { mode: 'pessimistic_write' },
      });

      if (!user) {
        throw new NotFoundException('User não encontrado.');
      }

      const activeAttendance = await manager.findOne(Attendance, {
        where: { userId, exitAt: IsNull() },
      });

      const space = await manager.findOne(Space, {
        where: { id: spaceId },
        lock: { mode: 'pessimistic_write' },
      });

      if (!space) {
        throw new NotFoundException('Space não encontrado.');
      }

      const currentOccupancy = await manager.count(Attendance, {
        where: { spaceId, exitAt: IsNull() },
      });

      return handler({
        user,
        space,
        hasActiveAttendance: Boolean(activeAttendance),
        currentOccupancy,
        createAttendance: (entryAt, expectedExitAt) => {
          const attendance = manager.create(Attendance, {
            user,
            userId,
            space,
            spaceId,
            entryAt,
            expectedExitAt,
            exitAt: null,
            overstayNotifiedAt: null,
          });

          return manager.save(Attendance, attendance);
        },
      });
    });
  }
}
