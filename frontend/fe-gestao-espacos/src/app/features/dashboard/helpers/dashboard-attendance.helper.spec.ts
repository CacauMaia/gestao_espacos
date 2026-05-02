import { Attendance } from '../dashboard.interfaces';
import { visibleAttendancesForMonitor } from './dashboard-attendance.helper';

describe('dashboard attendance helpers', () => {
  const attendances: Attendance[] = [
    { id: '1', userId: 'monitor-1', spaceId: 'lab', entryAt: '', exitAt: null, checkoutReason: null },
    { id: '2', userId: 'student-1', spaceId: 'lab', entryAt: '', exitAt: null, checkoutReason: null },
    { id: '3', userId: 'student-2', spaceId: 'library', entryAt: '', exitAt: null, checkoutReason: null },
  ];

  it('shows only attendances from the monitor active space', () => {
    expect(visibleAttendancesForMonitor(attendances, 'monitor-1').map((attendance) => attendance.id)).toEqual(['1', '2']);
  });

  it('hides other attendances when the monitor has no active attendance', () => {
    expect(visibleAttendancesForMonitor(attendances, 'monitor-2')).toEqual([]);
  });
});
