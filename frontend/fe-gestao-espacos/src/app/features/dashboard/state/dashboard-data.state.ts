import { DestroyRef, inject, Injectable, Signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { forkJoin, of } from 'rxjs';
import { UserRole } from '../../../core/auth/auth.interfaces';
import { Attendance, User } from '../dashboard.interfaces';
import { SpacesFacade } from '../facades/spaces.facade';
import { UsersFacade } from '../facades/users.facade';
import { StudentRoleFilter } from '../helpers/dashboard-student-filter.helper';
import { AttendanceState } from './attendance.state';
import { SpacesState } from './spaces.state';
import { UsersState } from './users.state';

@Injectable()
export class DashboardDataState {
  private readonly destroyRef = inject(DestroyRef);
  private readonly usersFacade = inject(UsersFacade);
  private readonly spacesFacade = inject(SpacesFacade);
  private readonly usersState = inject(UsersState);
  private readonly spacesState = inject(SpacesState);
  private readonly attendanceState = inject(AttendanceState);

  public readonly students = this.usersState.students;
  public readonly spaces = this.spacesState.spaces;
  public readonly activeAttendances = this.attendanceState.activeAttendances;
  public readonly attendanceHistory = this.attendanceState.attendanceHistory;
  public readonly notifications = this.attendanceState.notifications;
  public readonly currentAttendance = this.attendanceState.currentAttendance;
  public readonly occupancy = this.spacesState.occupancy;
  public readonly usersPaginationMeta = this.usersState.usersPaginationMeta;
  public readonly spacesPaginationMeta = this.spacesState.spacesPaginationMeta;
  public readonly activeAttendancesPaginationMeta =
    this.attendanceState.activeAttendancesPaginationMeta;
  public readonly attendanceHistoryPaginationMeta =
    this.attendanceState.attendanceHistoryPaginationMeta;
  public readonly totalCapacity = this.spacesState.totalCapacity;
  public readonly currentOccupancy = this.spacesState.currentOccupancy;
  public readonly occupancyRate = this.spacesState.occupancyRate;
  public readonly occupancyDonutBackground =
    this.spacesState.occupancyDonutBackground;
  public readonly availableCapacity = this.spacesState.availableCapacity;
  public readonly occupancyChartItems = this.spacesState.occupancyChartItems;
  public readonly activeAttendanceCount = this.spacesState.activeAttendanceCount;

  public visibleActiveAttendances(
    currentRole: Signal<UserRole | null>,
    currentUser: Signal<User | null>,
    canViewActiveAttendances: Signal<boolean>,
  ): Signal<Attendance[]> {
    return this.attendanceState.visibleActiveAttendances(
      currentRole,
      currentUser,
      canViewActiveAttendances,
    );
  }

  public loadDashboard(search: string, setError: () => void): void {
    forkJoin({
      students: this.usersFacade.list(search),
      spaces: this.spacesFacade.list(),
      activeAttendances: of([]),
      occupancy: this.spacesFacade.listOccupancy(),
    })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: ({ students, spaces, activeAttendances, occupancy }) => {
          this.students.set(students);
          this.spaces.set(spaces);
          this.activeAttendances.set(activeAttendances);
          this.occupancy.set(occupancy);
        },
        error: setError,
      });
  }

  public loadUsers(
    context: {
      currentRole: UserRole | null;
      currentUser: User | null;
      roleFilter: StudentRoleFilter;
      search: string;
      append: boolean;
    },
    setError: () => void,
  ): void {
    this.usersState.loadUsers(context, setError);
  }

  public loadSpaces(
    append: boolean,
    paginated: boolean,
    setError: () => void,
  ): void {
    this.spacesState.loadSpaces(append, paginated, setError);
  }

  public loadActiveAttendances(
    context: {
      currentRole: UserRole | null;
      currentAttendance: Attendance | null;
      canViewActiveAttendances: boolean;
      append: boolean;
    },
    setError: () => void,
  ): void {
    this.attendanceState.loadActiveAttendances(context, setError);
  }

  public loadAttendanceHistory(append: boolean, setError: () => void): void {
    this.attendanceState.loadAttendanceHistory(append, setError);
  }

  public loadCurrentAttendance(
    canManageAttendance: boolean,
    onLoaded: () => void,
    setError: () => void,
  ): void {
    this.attendanceState.loadCurrentAttendance(
      canManageAttendance,
      onLoaded,
      setError,
    );
  }

  public loadOccupancy(setError: () => void): void {
    this.spacesState.loadOccupancy(setError);
  }

  public loadNotifications(
    canManageAttendance: boolean,
    setError: () => void,
  ): void {
    this.attendanceState.loadNotifications(canManageAttendance, setError);
  }
}
