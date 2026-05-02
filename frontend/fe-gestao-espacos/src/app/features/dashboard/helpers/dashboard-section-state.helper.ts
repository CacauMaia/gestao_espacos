import { WritableSignal } from '@angular/core';
import { StudentRoleFilter } from './dashboard-student-filter.helper';
import { DashboardSection } from './dashboard-sections.helper';
import { createCheckInForm, createEditUserForm, createSpaceForm, createStudentForm } from './dashboard-forms.helper';
import { Attendance, Occupancy, Space, User } from '../dashboard.interfaces';

interface SectionState {
  searchQuery: WritableSignal<string>;
  studentRoleFilter: WritableSignal<StudentRoleFilter>;
  studentForm: ReturnType<typeof createStudentForm>;
  editUserForm: ReturnType<typeof createEditUserForm>;
  spaceForm: ReturnType<typeof createSpaceForm>;
  editSpaceForm: ReturnType<typeof createSpaceForm>;
  checkInForm: ReturnType<typeof createCheckInForm>;
  students: WritableSignal<User[]>;
  spaces: WritableSignal<Space[]>;
  activeAttendances: WritableSignal<Attendance[]>;
  attendanceHistory: WritableSignal<Attendance[]>;
  currentAttendance: WritableSignal<Attendance | null>;
  occupancy: WritableSignal<Occupancy[]>;
}

export function resetDashboardSectionState(section: DashboardSection, state: SectionState): void {
  if (section === 'students') {
    state.searchQuery.set('');
    state.studentRoleFilter.set('ALL');
    state.studentForm.reset({ name: '', email: '', password: '', role: 'STUDENT' });
    state.editUserForm.reset({ name: '', email: '', password: '', role: 'STUDENT' });
    state.students.set([]);
    return;
  }

  if (section === 'spaces') {
    state.spaceForm.reset({ name: '', type: 'classroom', capacity: 24 });
    state.editSpaceForm.reset({ name: '', type: 'classroom', capacity: 24 });
    state.spaces.set([]);
    state.occupancy.set([]);
    return;
  }

  if (section === 'attendance') {
    state.checkInForm.reset({ spaceId: '' });
    state.activeAttendances.set([]);
    state.attendanceHistory.set([]);
    state.currentAttendance.set(null);
    state.spaces.set([]);
    state.occupancy.set([]);
    return;
  }

  state.students.set([]);
  state.spaces.set([]);
  state.activeAttendances.set([]);
  state.attendanceHistory.set([]);
  state.currentAttendance.set(null);
  state.occupancy.set([]);
}
