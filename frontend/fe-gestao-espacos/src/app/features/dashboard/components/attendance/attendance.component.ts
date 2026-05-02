import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, input, output, signal } from '@angular/core';
import { ReactiveFormsModule } from '@angular/forms';
import { TranslocoPipe } from '@jsverse/transloco';
import { LucideAngularModule } from 'lucide-angular';
import { Attendance, AttendanceNotification, Occupancy, Space, SpaceType, User } from '../../dashboard.interfaces';
import { createCheckInForm } from '../../helpers/dashboard-forms.helper';

@Component({
  selector: 'app-attendance',
  imports: [DatePipe, ReactiveFormsModule, TranslocoPipe, LucideAngularModule],
  templateUrl: './attendance.component.html',
  styleUrl: './attendance.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AttendanceComponent {
  public readonly checkInForm = input.required<ReturnType<typeof createCheckInForm>>();
  public readonly currentUser = input.required<User | null>();
  public readonly spaces = input.required<readonly Space[]>();
  public readonly occupancy = input.required<readonly Occupancy[]>();
  public readonly notifications = input.required<readonly AttendanceNotification[]>();
  public readonly currentAttendance = input.required<Attendance | null>();
  public readonly visibleActiveAttendances = input.required<readonly Attendance[]>();
  public readonly attendanceHistory = input.required<readonly Attendance[]>();
  public readonly isMutating = input.required<boolean>();
  public readonly canManageAttendance = input.required<boolean>();
  public readonly canSubmitCheckIn = input.required<boolean>();
  public readonly canViewActiveAttendances = input.required<boolean>();
  public readonly canForceCheckOutAttendances = input.required<boolean>();
  public readonly hasMoreActiveAttendances = input.required<boolean>();
  public readonly hasMoreAttendanceHistory = input.required<boolean>();

  public readonly checkInSubmitted = output<void>();
  public readonly currentUserCheckOut = output<void>();
  public readonly attendanceCheckOut = output<Attendance>();
  public readonly attendanceForceCheckOut = output<Attendance>();
  public readonly activeAttendancesRequested = output<void>();
  public readonly attendanceHistoryRequested = output<void>();

  protected readonly spaceSearchQuery = signal('');
  protected readonly spaceTypeFilter = signal<SpaceType | 'ALL'>('ALL');
  protected readonly historySearchQuery = signal('');
  protected readonly historyReasonFilter = signal<string>('ALL');
  protected readonly visibleSpaceCount = signal(6);
  protected readonly spaceTypes: readonly SpaceType[] = ['classroom', 'laboratory', 'study'];
  protected readonly checkoutReasons = ['manual', 'auto_expired', 'forced'] as const;

  protected readonly filteredSpaces = computed(() => {
    const query = this.spaceSearchQuery().trim().toLowerCase();
    const type = this.spaceTypeFilter();

    return this.spaces().filter((space) => {
      const matchesType = type === 'ALL' || space.type === type;
      const matchesQuery = !query || space.name.toLowerCase().includes(query) || space.type.toLowerCase().includes(query);

      return matchesType && matchesQuery;
    });
  });
  protected readonly displayedSpaces = computed(() => this.filteredSpaces().slice(0, this.visibleSpaceCount()));
  protected readonly filteredAttendanceHistory = computed(() => {
    const query = this.historySearchQuery().trim().toLowerCase();
    const reason = this.historyReasonFilter();

    return this.attendanceHistory().filter((attendance) => {
      const userName = attendance.user?.name ?? attendance.userId;
      const spaceName = attendance.space?.name ?? attendance.spaceId;
      const isClosed = Boolean(attendance.exitAt);
      const matchesQuery = !query || userName.toLowerCase().includes(query) || spaceName.toLowerCase().includes(query);
      const matchesReason = reason === 'ALL' || attendance.checkoutReason === reason;

      return isClosed && matchesQuery && matchesReason;
    });
  });
  protected readonly hasMoreSpaces = computed(() => this.filteredSpaces().length > this.visibleSpaceCount());
  protected readonly boardTitleKey = computed(() => this.currentAttendance() ? 'attendance.currentBoard' : 'attendance.availableBoard');
  protected readonly boardEyebrowKey = computed(() => this.currentAttendance() ? 'attendance.inProgress' : 'attendance.explore');

  protected submitCheckIn(): void {
    this.checkInSubmitted.emit();
  }

  protected checkInSpace(space: Space): void {
    if (!this.canCheckInSpace(space)) {
      return;
    }

    this.checkInForm().controls.spaceId.setValue(space.id);
    this.submitCheckIn();
  }

  protected checkOutCurrentUser(): void {
    this.currentUserCheckOut.emit();
  }

  protected checkOut(attendance: Attendance): void {
    this.attendanceCheckOut.emit(attendance);
  }

  protected forceCheckOut(attendance: Attendance): void {
    this.attendanceForceCheckOut.emit(attendance);
  }

  protected loadMoreActiveAttendances(): void {
    this.activeAttendancesRequested.emit();
  }

  protected loadMoreAttendanceHistory(): void {
    this.attendanceHistoryRequested.emit();
  }

  protected canCheckOutAttendance(attendance: Attendance): boolean {
    return this.canManageAttendance() && attendance.userId === this.currentUser()?.id;
  }

  protected canForceCheckOutAttendance(attendance: Attendance): boolean {
    return this.canForceCheckOutAttendances() && attendance.userId !== this.currentUser()?.id;
  }

  protected updateSpaceSearchQuery(query: string): void {
    this.spaceSearchQuery.set(query);
    this.visibleSpaceCount.set(6);
  }

  protected updateSpaceTypeFilter(type: string): void {
    this.spaceTypeFilter.set(type as SpaceType | 'ALL');
    this.visibleSpaceCount.set(6);
  }

  protected updateHistorySearchQuery(query: string): void {
    this.historySearchQuery.set(query);
  }

  protected updateHistoryReasonFilter(reason: string): void {
    this.historyReasonFilter.set(reason);
  }

  protected loadMoreSpaces(): void {
    this.visibleSpaceCount.update((count) => count + 6);
  }

  protected occupancyFor(space: Space): Occupancy {
    return this.occupancy().find((item) => item.spaceId === space.id) ?? {
      spaceId: space.id,
      name: space.name,
      type: space.type,
      capacity: space.capacity,
      currentOccupancy: 0,
      availableSlots: space.capacity,
      occupancyPercentage: 0,
    };
  }

  protected currentAttendanceSpace(): Space | null {
    const attendance = this.currentAttendance();
    return attendance?.space ?? this.spaces().find((space) => space.id === attendance?.spaceId) ?? null;
  }

  protected canCheckInSpace(space: Space): boolean {
    return this.canSubmitCheckIn() && this.occupancyFor(space).availableSlots > 0;
  }

  protected spaceStatusKey(space: Space): string {
    if (this.currentAttendance()) {
      return 'attendance.spaceStatus.inProgress';
    }

    return this.occupancyFor(space).availableSlots > 0
      ? 'attendance.spaceStatus.available'
      : 'attendance.spaceStatus.full';
  }

  protected checkoutReasonKey(attendance: Attendance): string {
    return attendance.checkoutReason ? `attendance.checkoutReasons.${attendance.checkoutReason}` : 'attendance.checkoutReasons.legacy';
  }

  protected attendanceDurationMinutes(attendance: Attendance): number {
    const entryAt = new Date(attendance.entryAt).getTime();
    const exitAt = new Date(attendance.exitAt ?? new Date().toISOString()).getTime();

    if (Number.isNaN(entryAt) || Number.isNaN(exitAt) || exitAt < entryAt) {
      return 0;
    }

    return Math.max(1, Math.round((exitAt - entryAt) / 60000));
  }
}
