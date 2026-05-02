import { DestroyRef, WritableSignal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { UserRole } from '../../../core/auth/auth.interfaces';
import { Attendance, PaginationMeta, Space, User } from '../dashboard.interfaces';
import { AttendanceFacade } from '../facades/attendance.facade';
import { SpacesFacade } from '../facades/spaces.facade';
import { UsersFacade } from '../facades/users.facade';
import { StudentRoleFilter } from './dashboard-student-filter.helper';

export const DASHBOARD_PAGE_SIZE = 10;

export const EMPTY_PAGINATION_META: PaginationMeta = {
  page: 0,
  limit: DASHBOARD_PAGE_SIZE,
  totalItems: 0,
  totalPages: 0,
  hasNextPage: false,
  hasPreviousPage: false,
};

interface DashboardPaginationContext {
  destroyRef: DestroyRef;
  setError: () => void;
}

interface UsersPageContext extends DashboardPaginationContext {
  usersFacade: UsersFacade;
  currentRole: UserRole | null;
  currentUser: User | null;
  roleFilter: StudentRoleFilter;
  search: string;
  append: boolean;
  users: WritableSignal<User[]>;
  meta: WritableSignal<PaginationMeta>;
}

interface SpacesPageContext extends DashboardPaginationContext {
  spacesFacade: SpacesFacade;
  append: boolean;
  paginated: boolean;
  spaces: WritableSignal<Space[]>;
  meta: WritableSignal<PaginationMeta>;
}

interface ActiveAttendancesPageContext extends DashboardPaginationContext {
  attendanceFacade: AttendanceFacade;
  currentRole: UserRole | null;
  currentAttendance: Attendance | null;
  canViewActiveAttendances: boolean;
  append: boolean;
  attendances: WritableSignal<Attendance[]>;
  meta: WritableSignal<PaginationMeta>;
}

export function loadUsersPage(context: UsersPageContext): void {
  if (context.currentRole !== 'ADMIN') {
    context.users.set(context.currentUser ? [context.currentUser] : []);
    context.meta.set(EMPTY_PAGINATION_META);
    return;
  }

  const role = context.roleFilter === 'ALL' ? undefined : context.roleFilter;
  const page = nextPage(context.meta(), context.append);

  context.usersFacade.listPage({
    search: context.search,
    role,
    page,
    limit: DASHBOARD_PAGE_SIZE,
  }).pipe(takeUntilDestroyed(context.destroyRef)).subscribe({
    next: (response) => {
      context.users.set(context.append ? [...context.users(), ...response.items] : response.items);
      context.meta.set(response.meta);
    },
    error: context.setError,
  });
}

export function loadSpacesPage(context: SpacesPageContext): void {
  if (!context.paginated) {
    context.spacesFacade.list().pipe(takeUntilDestroyed(context.destroyRef)).subscribe({
      next: (spaces) => {
        context.spaces.set(spaces);
        context.meta.set(EMPTY_PAGINATION_META);
      },
      error: context.setError,
    });
    return;
  }

  context.spacesFacade.listPage({
    page: nextPage(context.meta(), context.append),
    limit: DASHBOARD_PAGE_SIZE,
  }).pipe(takeUntilDestroyed(context.destroyRef)).subscribe({
    next: (response) => {
      context.spaces.set(context.append ? [...context.spaces(), ...response.items] : response.items);
      context.meta.set(response.meta);
    },
    error: context.setError,
  });
}

export function loadActiveAttendancesPage(context: ActiveAttendancesPageContext): void {
  if (!context.canViewActiveAttendances || (context.currentRole === 'MONITOR' && !context.currentAttendance)) {
    context.attendances.set([]);
    context.meta.set(EMPTY_PAGINATION_META);
    return;
  }

  context.attendanceFacade.listActivePage({
    spaceId: context.currentAttendance?.spaceId,
    page: nextPage(context.meta(), context.append),
    limit: DASHBOARD_PAGE_SIZE,
  }).pipe(takeUntilDestroyed(context.destroyRef)).subscribe({
    next: (response) => {
      context.attendances.set(context.append ? [...context.attendances(), ...response.items] : response.items);
      context.meta.set(response.meta);
    },
    error: context.setError,
  });
}

function nextPage(meta: PaginationMeta, append: boolean): number {
  return append ? meta.page + 1 : 1;
}
