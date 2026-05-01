import { UserRole } from '../../../core/auth/auth.interfaces';

export type DashboardSection = 'overview' | 'attendance' | 'students' | 'spaces';

export interface SectionCard {
  id: DashboardSection;
  icon: string;
  titleKey: string;
  descriptionKey: string;
}

export const DASHBOARD_SECTION_CARDS: readonly SectionCard[] = [
  { id: 'overview', icon: 'Gauge', titleKey: 'dashboard.sections.overview', descriptionKey: 'dashboard.sections.overviewDescription' },
  { id: 'attendance', icon: 'DoorOpen', titleKey: 'dashboard.sections.attendance', descriptionKey: 'dashboard.sections.attendanceDescription' },
  { id: 'students', icon: 'Users', titleKey: 'dashboard.sections.students', descriptionKey: 'dashboard.sections.studentsDescription' },
  { id: 'spaces', icon: 'Building2', titleKey: 'dashboard.sections.spaces', descriptionKey: 'dashboard.sections.spacesDescription' },
] as const;

export function defaultDashboardSection(role: UserRole | null): DashboardSection {
  return role === 'ADMIN' ? 'overview' : 'attendance';
}

export function canAccessDashboardSection(section: DashboardSection, role: UserRole | null): boolean {
  if (section === 'overview') {
    return role === 'ADMIN';
  }

  if (section === 'attendance') {
    return role === 'STUDENT' || role === 'MONITOR';
  }

  if (section === 'students' || section === 'spaces') {
    return role === 'ADMIN';
  }

  return false;
}
