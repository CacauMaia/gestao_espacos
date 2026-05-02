import { Attendance } from '../../../entities/attendance.entity';
import { Space } from '../../../entities/space.entity';
import { User } from '../../../entities/user.entity';

export const ATTENDANCE_CHECK_IN_REPOSITORY = Symbol(
  'ATTENDANCE_CHECK_IN_REPOSITORY',
);

export interface LockedCheckInContext {
  user: User;
  space: Space;
  hasActiveAttendance: boolean;
  currentOccupancy: number;
  createAttendance(entryAt: Date, expectedExitAt: Date): Promise<Attendance>;
}

export interface AttendanceCheckInRepositoryPort {
  withLockedCheckInContext(
    userId: string,
    spaceId: string,
    handler: (context: LockedCheckInContext) => Promise<Attendance>,
  ): Promise<Attendance>;
}
