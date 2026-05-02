import { canAccessDashboardSection, defaultDashboardSection } from './dashboard-sections.helper';

describe('dashboard section helpers', () => {
  it('restricts students and monitors to attendance', () => {
    expect(defaultDashboardSection('STUDENT')).toBe('attendance');
    expect(defaultDashboardSection('MONITOR')).toBe('attendance');
    expect(canAccessDashboardSection('attendance', 'STUDENT')).toBe(true);
    expect(canAccessDashboardSection('attendance', 'MONITOR')).toBe(true);
    expect(canAccessDashboardSection('overview', 'STUDENT')).toBe(false);
    expect(canAccessDashboardSection('overview', 'MONITOR')).toBe(false);
  });

  it('keeps management sections admin-only', () => {
    expect(defaultDashboardSection('ADMIN')).toBe('overview');
    expect(canAccessDashboardSection('overview', 'ADMIN')).toBe(true);
    expect(canAccessDashboardSection('attendance', 'ADMIN')).toBe(true);
    expect(canAccessDashboardSection('students', 'ADMIN')).toBe(true);
    expect(canAccessDashboardSection('spaces', 'ADMIN')).toBe(true);
    expect(canAccessDashboardSection('students', 'MONITOR')).toBe(false);
    expect(canAccessDashboardSection('spaces', 'STUDENT')).toBe(false);
  });
});
