import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { Attendance } from '../../../entities/attendance.entity';
import { CreateAttendanceDto } from '../../dto/create-attendance.dto';
import { CheckInPolicy } from '../../domain/check-in.policy';
import { ATTENDANCE_CHECK_IN_REPOSITORY } from '../ports/attendance-check-in.repository.port';
import type { AttendanceCheckInRepositoryPort } from '../ports/attendance-check-in.repository.port';

@Injectable()
export class CheckInUseCase {
  constructor(
    @Inject(ATTENDANCE_CHECK_IN_REPOSITORY)
    private readonly attendanceRepository: AttendanceCheckInRepositoryPort,
    private readonly checkInPolicy: CheckInPolicy,
  ) {}

  public execute(
    userId: string,
    createAttendanceDto: CreateAttendanceDto,
  ): Promise<Attendance> {
    const { spaceId } = createAttendanceDto;

    return this.attendanceRepository.withLockedCheckInContext(
      userId,
      spaceId,
      async (context) => {
        if (!context.user) {
          throw new NotFoundException('User não encontrado.');
        }

        if (!context.space) {
          throw new NotFoundException('Space não encontrado.');
        }

        this.checkInPolicy.assertUserCanCheckIn(context.user);
        this.checkInPolicy.assertUserHasNoActiveAttendance(
          context.hasActiveAttendance,
        );
        this.checkInPolicy.assertSpaceHasCapacity(
          context.space,
          context.currentOccupancy,
        );

        const entryAt = new Date();
        const expectedExitAt = this.checkInPolicy.calculateExpectedExitAt(
          context.space,
          entryAt,
        );

        return context.createAttendance(entryAt, expectedExitAt);
      },
    );
  }
}
