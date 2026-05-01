import { Attendance } from '../dashboard.interfaces';

export function visibleAttendancesForMonitor(
  attendances: readonly Attendance[],
  currentUserId: string | undefined,
): Attendance[] {
  const monitorAttendance = attendances.find((attendance) => attendance.userId === currentUserId);

  return monitorAttendance
    ? attendances.filter((attendance) => attendance.spaceId === monitorAttendance.spaceId)
    : [];
}
