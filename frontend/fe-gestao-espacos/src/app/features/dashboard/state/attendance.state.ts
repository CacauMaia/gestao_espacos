import { computed, DestroyRef, inject, Injectable, Signal, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { UserRole } from '../../../core/auth/auth.interfaces';
import {
  Attendance,
  AttendanceNotification,
  PaginationMeta,
  User,
} from '../dashboard.interfaces';
import { AttendanceFacade } from '../facades/attendance.facade';
import {
  EMPTY_PAGINATION_META,
  loadActiveAttendancesPage,
} from '../helpers/dashboard-pagination.helper';
import { visibleAttendancesForMonitor } from '../helpers/dashboard-attendance.helper';

@Injectable()
export class AttendanceState {
  private readonly destroyRef = inject(DestroyRef);
  private readonly attendanceFacade = inject(AttendanceFacade);

  public readonly activeAttendances = signal<Attendance[]>([]);
  public readonly attendanceHistory = signal<Attendance[]>([]);
  public readonly notifications = signal<AttendanceNotification[]>([]);
  public readonly currentAttendance = signal<Attendance | null>(null);
  public readonly activeAttendancesPaginationMeta =
    signal<PaginationMeta>(EMPTY_PAGINATION_META);
  public readonly attendanceHistoryPaginationMeta =
    signal<PaginationMeta>(EMPTY_PAGINATION_META);

  public visibleActiveAttendances(
    currentRole: Signal<UserRole | null>,
    currentUser: Signal<User | null>,
    canViewActiveAttendances: Signal<boolean>,
  ): Signal<Attendance[]> {
    return computed(() => {
      if (!canViewActiveAttendances()) {
        return [];
      }

      if (currentRole() === 'ADMIN') {
        return this.activeAttendances();
      }

      return visibleAttendancesForMonitor(
        this.activeAttendances(),
        currentUser()?.id,
      );
    });
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
    loadActiveAttendancesPage({
      attendanceFacade: this.attendanceFacade,
      destroyRef: this.destroyRef,
      attendances: this.activeAttendances,
      meta: this.activeAttendancesPaginationMeta,
      setError,
      ...context,
    });
  }

  public loadAttendanceHistory(append: boolean, setError: () => void): void {
    this.attendanceFacade
      .listHistoryPage({
        page:
          this.attendanceHistoryPaginationMeta().page && append
            ? this.attendanceHistoryPaginationMeta().page + 1
            : 1,
        limit: 10,
      })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (response) => {
          this.attendanceHistory.set(
            append
              ? [...this.attendanceHistory(), ...response.items]
              : response.items,
          );
          this.attendanceHistoryPaginationMeta.set(response.meta);
        },
        error: setError,
      });
  }

  public loadCurrentAttendance(
    canManageAttendance: boolean,
    onLoaded: () => void,
    setError: () => void,
  ): void {
    if (!canManageAttendance) {
      this.currentAttendance.set(null);
      onLoaded();
      return;
    }

    this.attendanceFacade
      .listCurrent()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (attendance) => {
          this.currentAttendance.set(attendance);
          onLoaded();
        },
        error: setError,
      });
  }

  public loadNotifications(
    canManageAttendance: boolean,
    setError: () => void,
  ): void {
    if (!canManageAttendance) {
      this.notifications.set([]);
      return;
    }

    this.attendanceFacade
      .listNotifications()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (notifications) => this.notifications.set(notifications),
        error: setError,
      });
  }
}
