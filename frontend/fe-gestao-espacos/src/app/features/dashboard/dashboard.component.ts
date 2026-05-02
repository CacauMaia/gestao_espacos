import { ChangeDetectionStrategy, Component, DestroyRef, ViewEncapsulation, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed, toSignal } from '@angular/core/rxjs-interop';
import { FormBuilder } from '@angular/forms';
import { Router } from '@angular/router';
import { TranslocoPipe } from '@jsverse/transloco';
import { LucideAngularModule } from 'lucide-angular';
import { Subject, Observable, debounceTime, distinctUntilChanged, finalize } from 'rxjs';
import { AuthService } from '../../core/auth/auth.service';
import { UserRole } from '../../core/auth/auth.interfaces';
import { StatusPillComponent } from '../../shared/ui/status-pill.component';
import { AttendanceComponent } from './components/attendance/attendance.component';
import { ForceCheckoutDialogComponent } from './components/force-checkout-dialog/force-checkout-dialog.component';
import { OverviewComponent } from './components/overview/overview.component';
import { SpacesComponent } from './components/spaces/spaces.component';
import { UsersComponent } from './components/users/users.component';
import { Attendance, CreateSpacePayload, CreateUserPayload, Space, UpdateSpacePayload, User } from './dashboard.interfaces';
import { AttendanceFacade } from './facades/attendance.facade';
import { SpacesFacade } from './facades/spaces.facade';
import { UsersFacade } from './facades/users.facade';
import { createCheckInForm, createEditUserForm, createSpaceForm, createStudentForm } from './helpers/dashboard-forms.helper';
import { resetDashboardSectionState } from './helpers/dashboard-section-state.helper';
import { canAccessDashboardSection, DASHBOARD_SECTION_CARDS, DashboardSection, defaultDashboardSection } from './helpers/dashboard-sections.helper';
import { StudentRoleFilter } from './helpers/dashboard-student-filter.helper';
import { buildUpdateUserPayload, filterUsersByRole, getUserInitials } from './helpers/dashboard-users.helper';
import { DashboardDataState } from './state/dashboard-data.state';
import { DashboardFeedbackState } from './state/dashboard-feedback.state';
import { AttendanceState } from './state/attendance.state';
import { SpacesState } from './state/spaces.state';
import { UsersState } from './state/users.state';

@Component({
  selector: 'app-dashboard',
  imports: [TranslocoPipe, LucideAngularModule, StatusPillComponent, OverviewComponent, AttendanceComponent, ForceCheckoutDialogComponent, UsersComponent, SpacesComponent],
  providers: [UsersState, SpacesState, AttendanceState, DashboardDataState, DashboardFeedbackState],
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.scss',
  encapsulation: ViewEncapsulation.None,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DashboardComponent {
  private readonly destroyRef = inject(DestroyRef);
  private readonly formBuilder = inject(FormBuilder);
  private readonly usersFacade = inject(UsersFacade);
  private readonly spacesFacade = inject(SpacesFacade);
  private readonly attendanceFacade = inject(AttendanceFacade);
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);
  private readonly dataState = inject(DashboardDataState);
  private readonly feedbackState = inject(DashboardFeedbackState);
  private readonly userSearchTerms = new Subject<string>();

  protected readonly currentUser = this.authService.currentUser;
  protected readonly isMutating = signal(false);
  protected readonly searchQuery = signal('');
  protected readonly studentRoleFilter = signal<StudentRoleFilter>('ALL');
  protected readonly activeSection = signal<DashboardSection>('overview');
  protected readonly editingUserId = signal<string | null>(null);
  protected readonly editingSpaceId = signal<string | null>(null);
  protected readonly pendingForceCheckOut = signal<Attendance | null>(null);
  protected readonly notifications = this.dataState.notifications;

  private readonly sectionCards = DASHBOARD_SECTION_CARDS;

  protected readonly activeSectionCard = computed(() => this.sectionCards.find((card) => card.id === this.activeSection()) ?? this.sectionCards[0]);
  protected readonly visibleToast = this.feedbackState.visibleToast(this.activeSection);
  private readonly currentRole = computed<UserRole | null>(() => this.currentUser()?.role ?? null);
  protected readonly canManageResources = computed(() => this.currentRole() === 'ADMIN');
  protected readonly canManageAttendance = computed(() => this.currentRole() === 'STUDENT' || this.currentRole() === 'MONITOR');
  protected readonly canViewActiveAttendances = computed(() => this.currentRole() === 'MONITOR' || this.currentRole() === 'ADMIN');
  protected readonly canForceCheckOutAttendances = computed(() => this.currentRole() === 'MONITOR' || this.currentRole() === 'ADMIN');

  protected readonly visibleSectionCards = computed(() => this.sectionCards.filter((card) => this.canAccessSection(card.id)));
  protected readonly currentUserInitials = computed(() => getUserInitials(this.currentUser()?.name));

  protected readonly students = this.dataState.students;
  protected readonly spaces = this.dataState.spaces;
  private readonly activeAttendances = this.dataState.activeAttendances;
  protected readonly attendanceHistory = this.dataState.attendanceHistory;
  protected readonly usersPaginationMeta = this.dataState.usersPaginationMeta;
  protected readonly spacesPaginationMeta = this.dataState.spacesPaginationMeta;
  protected readonly activeAttendancesPaginationMeta = this.dataState.activeAttendancesPaginationMeta;
  protected readonly attendanceHistoryPaginationMeta = this.dataState.attendanceHistoryPaginationMeta;
  protected readonly currentAttendance = this.dataState.currentAttendance;
  protected readonly occupancy = this.dataState.occupancy;

  protected readonly studentForm = createStudentForm(this.formBuilder);
  protected readonly editUserForm = createEditUserForm(this.formBuilder);
  private readonly selectedStudentRole = toSignal(this.studentForm.controls.role.valueChanges, { initialValue: this.studentForm.controls.role.value });
  private readonly studentFormStatus = toSignal(this.studentForm.statusChanges, { initialValue: this.studentForm.status });

  protected readonly studentNamePlaceholderKey = computed(() => `students.placeholders.${this.selectedStudentRole()}.name`);
  protected readonly studentEmailPlaceholderKey = computed(() => `students.placeholders.${this.selectedStudentRole()}.email`);
  protected readonly studentPasswordPlaceholderKey = computed(() => `students.placeholders.${this.selectedStudentRole()}.password`);
  protected readonly canSubmitStudent = computed(() => this.studentFormStatus() === 'VALID' && !this.isMutating() && this.canManageResources());
  private readonly editUserFormStatus = toSignal(this.editUserForm.statusChanges, { initialValue: this.editUserForm.status });
  protected readonly canSubmitUserUpdate = computed(() => Boolean(this.editingUserId()) && this.editUserFormStatus() === 'VALID' && !this.isMutating() && this.canManageResources());
  protected readonly isEditingUser = computed(() => Boolean(this.editingUserId()));

  protected readonly spaceForm = createSpaceForm(this.formBuilder);
  private readonly spaceFormStatus = toSignal(this.spaceForm.statusChanges, { initialValue: this.spaceForm.status });
  protected readonly editSpaceForm = createSpaceForm(this.formBuilder);
  private readonly editSpaceFormStatus = toSignal(this.editSpaceForm.statusChanges, { initialValue: this.editSpaceForm.status });
  protected readonly canSubmitSpace = computed(() => this.spaceFormStatus() === 'VALID' && !this.isMutating() && this.canManageResources());
  protected readonly canSubmitSpaceUpdate = computed(() => Boolean(this.editingSpaceId()) && this.editSpaceFormStatus() === 'VALID' && !this.isMutating() && this.canManageResources());
  protected readonly isEditingSpace = computed(() => Boolean(this.editingSpaceId()));

  protected readonly checkInForm = createCheckInForm(this.formBuilder);
  protected readonly canSubmitCheckIn = computed(() => !this.isMutating() && this.canManageAttendance() && !this.currentAttendance());

  protected readonly filteredStudents = computed(() => filterUsersByRole(this.students(), this.studentRoleFilter()));
  protected readonly hasMoreUsers = computed(() => this.usersPaginationMeta().hasNextPage);
  protected readonly hasMoreSpaces = computed(() => this.spacesPaginationMeta().hasNextPage);
  protected readonly hasMoreActiveAttendances = computed(() => this.activeAttendancesPaginationMeta().hasNextPage);
  protected readonly hasMoreAttendanceHistory = computed(() => this.attendanceHistoryPaginationMeta().hasNextPage);

  protected readonly totalCapacity = this.dataState.totalCapacity;
  protected readonly currentOccupancy = this.dataState.currentOccupancy;
  protected readonly occupancyRate = this.dataState.occupancyRate;
  protected readonly occupancyDonutBackground = this.dataState.occupancyDonutBackground;
  protected readonly availableCapacity = this.dataState.availableCapacity;
  protected readonly occupancyChartItems = this.dataState.occupancyChartItems;
  protected readonly visibleActiveAttendances = this.dataState.visibleActiveAttendances(this.currentRole, this.currentUser, this.canViewActiveAttendances);
  protected readonly activeAttendanceCount = this.dataState.activeAttendanceCount;
  protected readonly notificationCount = computed(() => this.notifications().length);

  constructor() {
    this.userSearchTerms.pipe(debounceTime(300), distinctUntilChanged(), takeUntilDestroyed(this.destroyRef)).subscribe((query) => this.loadUsers(query));

    const initialSection = this.defaultSection();
    this.activeSection.set(initialSection);
    this.reloadSection(initialSection);
  }

  protected refreshActiveSection(): void { this.resetSectionState(this.activeSection()); this.reloadSection(this.activeSection()); }
  protected refreshNotifications(): void { this.loadNotifications(); }

  private loadDashboard(): void {
    this.feedbackState.clearSection(this.activeSection());
    this.dataState.loadDashboard(this.searchQuery(), () => this.setError('dashboard.loadError'));
  }

  protected createStudent(): void {
    if (!this.canManageResources()) {
      this.setError('dashboard.forbidden', 'students');
      return;
    }

    if (this.studentForm.invalid) {
      this.studentForm.markAllAsTouched();
      return;
    }

    this.mutate(this.usersFacade.create(this.studentForm.getRawValue() as CreateUserPayload), 'students.created', 'students', () => {
      this.studentForm.reset({ name: '', email: '', password: '', role: 'STUDENT' });
      this.loadUsers();
    });
  }

  protected startUserEdit(user: User): void {
    this.editingUserId.set(user.id);
    this.editUserForm.reset({ name: user.name, email: user.email, password: '', role: user.role });
  }

  protected cancelUserEdit(): void {
    this.editingUserId.set(null);
    this.editUserForm.reset({ name: '', email: '', password: '', role: 'STUDENT' });
  }

  protected updateUser(): void {
    const userId = this.editingUserId();

    if (!userId || this.editUserForm.invalid || !this.canManageResources()) {
      this.editUserForm.markAllAsTouched();
      return;
    }

    this.mutate(this.usersFacade.update(userId, buildUpdateUserPayload(this.editUserForm)), 'students.updated', 'students', () => {
      this.cancelUserEdit();
      this.loadUsers();
    });
  }

  protected createSpace(): void {
    if (!this.canManageResources()) {
      this.setError('dashboard.forbidden', 'spaces');
      return;
    }

    if (this.spaceForm.invalid) {
      this.spaceForm.markAllAsTouched();
      return;
    }

    this.mutate(this.spacesFacade.create(this.spaceForm.getRawValue() as CreateSpacePayload), 'spaces.created', 'spaces', () => {
      this.spaceForm.reset({ name: '', type: 'classroom', capacity: 24 });
      this.loadSpaces();
      this.loadOccupancy();
    });
  }

  protected startSpaceEdit(space: Space): void {
    this.editingSpaceId.set(space.id);
    this.editSpaceForm.reset({ name: space.name, type: space.type, capacity: space.capacity });
  }

  protected cancelSpaceEdit(): void {
    this.editingSpaceId.set(null);
    this.editSpaceForm.reset({ name: '', type: 'classroom', capacity: 24 });
  }

  protected updateSpace(): void {
    const spaceId = this.editingSpaceId();

    if (!spaceId || this.editSpaceForm.invalid || !this.canManageResources()) {
      this.editSpaceForm.markAllAsTouched();
      return;
    }

    this.mutate(this.spacesFacade.update(spaceId, this.editSpaceForm.getRawValue() as UpdateSpacePayload), 'spaces.updated', 'spaces', () => {
      this.cancelSpaceEdit();
      this.loadSpaces();
      this.loadOccupancy();
    });
  }

  protected toggleStudentActive(student: User): void {
    if (!this.canManageResources()) {
      this.setError('dashboard.forbidden', 'students');
      return;
    }

    const isActivating = !student.active;
    const request = isActivating
      ? this.usersFacade.toggleActive(student.id, true)
      : this.usersFacade.delete(student);

    this.mutate(request, 'students.updated', 'students', () => {
      this.loadUsers();
      this.loadActiveAttendances();
      this.loadAttendanceHistory();
      this.loadOccupancy();
    });
  }

  protected deleteSpace(space: Space): void {
    if (!this.canManageResources()) {
      this.setError('dashboard.forbidden', 'spaces');
      return;
    }

    this.mutate(this.spacesFacade.delete(space.id), 'spaces.deleted', 'spaces', () => {
      this.loadSpaces();
      this.loadActiveAttendances();
      this.loadOccupancy();
    });
  }

  protected checkIn(): void {
    if (!this.canManageAttendance()) {
      this.setError('dashboard.forbidden', 'attendance');
      return;
    }

    if (this.checkInForm.invalid) {
      this.checkInForm.markAllAsTouched();
      return;
    }

    const payload = this.checkInForm.getRawValue();
    this.mutate(this.attendanceFacade.checkIn(payload.spaceId), 'attendance.checkedIn', 'attendance', () => {
      this.checkInForm.reset({ spaceId: '' });
      this.loadCurrentAttendance();
      this.loadNotifications();
      this.loadActiveAttendances();
      this.loadAttendanceHistory();
      this.loadOccupancy();
    });
  }

  protected checkOut(attendance: Attendance): void {
    if (!this.canCheckOutAttendance(attendance)) {
      this.setError('dashboard.forbidden', 'attendance');
      return;
    }

    this.mutate(this.attendanceFacade.checkOut(), 'attendance.checkedOut', 'attendance', () => {
      this.currentAttendance.set(null);
      this.loadNotifications();
      this.loadActiveAttendances();
      this.loadAttendanceHistory();
      this.loadOccupancy();
    });
  }

  protected checkOutCurrentUser(): void {
    if (!this.currentUser()?.id || !this.canManageAttendance()) {
      this.setError('dashboard.forbidden', 'attendance');
      return;
    }

    this.mutate(this.attendanceFacade.checkOut(), 'attendance.checkedOut', 'attendance', () => {
      this.currentAttendance.set(null);
      this.loadNotifications();
      this.loadActiveAttendances();
      this.loadAttendanceHistory();
      this.loadOccupancy();
    });
  }

  protected forceCheckOut(attendance: Attendance): void {
    if (!this.canForceCheckOutAttendances()) {
      this.setError('dashboard.forbidden', 'attendance');
      return;
    }

    this.pendingForceCheckOut.set(attendance);
  }

  protected cancelForceCheckOut(): void { if (!this.isMutating()) { this.pendingForceCheckOut.set(null); } }

  protected confirmForceCheckOut(note: string): void {
    const attendance = this.pendingForceCheckOut();

    if (!attendance || !this.canForceCheckOutAttendances()) {
      this.setError('dashboard.forbidden', 'attendance');
      return;
    }

    const normalizedNote = note.trim() || undefined;
    this.mutate(this.attendanceFacade.forceCheckOut(attendance.id, normalizedNote), 'attendance.forcedCheckOut', 'attendance', () => {
      this.pendingForceCheckOut.set(null);
      this.loadCurrentAttendance();
      this.loadNotifications();
      this.loadActiveAttendances();
      this.loadAttendanceHistory();
      this.loadOccupancy();
    });
  }

  protected logout(): void {
    this.authService.logout();
    void this.router.navigateByUrl('/login');
  }

  protected updateSearchQuery(query: string): void {
    this.searchQuery.set(query);
    this.userSearchTerms.next(query);
  }

  protected updateStudentRoleFilter(role: string): void {
    this.studentRoleFilter.set(role as StudentRoleFilter);
    this.loadUsers(this.searchQuery());
  }

  protected loadMoreUsers(): void { this.loadUsers(this.searchQuery(), true); }
  protected loadMoreSpaces(): void { this.loadSpaces(true); }
  protected loadMoreActiveAttendances(): void { this.loadActiveAttendances(true); }
  protected loadMoreAttendanceHistory(): void { this.loadAttendanceHistory(true); }

  protected selectSection(section: DashboardSection): void {
    if (!this.canAccessSection(section)) {
      const fallbackSection = this.defaultSection();
      this.activeSection.set(fallbackSection);
      this.setError('dashboard.forbidden', fallbackSection);
      this.resetSectionState(fallbackSection);
      this.reloadSection(fallbackSection);
      return;
    }

    this.activeSection.set(section);
    this.resetSectionState(section);
    this.reloadSection(section);
  }

  private mutate(
    request$: Observable<unknown>,
    successKey: string,
    section: DashboardSection,
    onSuccess?: () => void,
  ): void {
    this.isMutating.set(true);
    this.feedbackState.clearSection(section);

    request$
      .pipe(finalize(() => this.isMutating.set(false)))
      .subscribe({
        next: () => {
          onSuccess?.();
          this.feedbackState.setFeedback(successKey, section);
        },
        error: (error: unknown) => this.feedbackState.setActionError(error, section),
      });
  }

  private loadUsers(search = this.searchQuery(), append = false): void {
    this.dataState.loadUsers({
      currentRole: this.currentRole(),
      currentUser: this.currentUser(),
      roleFilter: this.studentRoleFilter(),
      search,
      append,
    }, () => this.setError('dashboard.loadError', 'students'));
  }

  private loadSpaces(append = false, paginated = this.activeSection() === 'spaces'): void {
    this.dataState.loadSpaces(append, paginated, () => this.setError('dashboard.loadError', 'spaces'));
  }

  private loadActiveAttendances(append = false): void {
    this.dataState.loadActiveAttendances({
      currentRole: this.currentRole(),
      currentAttendance: this.currentAttendance(),
      canViewActiveAttendances: this.canViewActiveAttendances(),
      append,
    }, () => this.setError('dashboard.loadError', 'attendance'));
  }

  private loadAttendanceHistory(append = false): void {
    this.dataState.loadAttendanceHistory(append, () => this.setError('dashboard.loadError', 'attendance'));
  }

  private loadCurrentAttendance(): void {
    this.dataState.loadCurrentAttendance(
      this.canManageAttendance(),
      () => {
        this.loadActiveAttendances();
        this.loadAttendanceHistory();
      },
      () => this.setError('dashboard.loadError', 'attendance'),
    );
  }

  private loadOccupancy(): void {
    this.dataState.loadOccupancy(() => this.setError('dashboard.loadError'));
  }

  private loadNotifications(): void {
    this.dataState.loadNotifications(this.canManageAttendance(), () => this.setError('dashboard.loadError', 'attendance'));
  }

  private resetSectionState(section: DashboardSection): void {
    this.feedbackState.clearSection(section);
    this.cancelSpaceEdit();
    resetDashboardSectionState(section, {
      searchQuery: this.searchQuery,
      studentRoleFilter: this.studentRoleFilter,
      studentForm: this.studentForm,
      editUserForm: this.editUserForm,
      spaceForm: this.spaceForm,
      editSpaceForm: this.editSpaceForm,
      checkInForm: this.checkInForm,
      students: this.students,
      spaces: this.spaces,
      activeAttendances: this.activeAttendances,
      attendanceHistory: this.attendanceHistory,
      currentAttendance: this.currentAttendance,
      occupancy: this.occupancy,
    });
  }

  private reloadSection(section: DashboardSection): void {
    if (section === 'students') {
      this.loadUsers('');
      return;
    }

    if (section === 'spaces') {
      this.loadSpaces(false, true);
      this.loadOccupancy();
      return;
    }

    if (section === 'attendance') {
      this.loadSpaces(false, false);
      this.loadCurrentAttendance();
      this.loadOccupancy();
      this.loadNotifications();
      return;
    }

    this.loadDashboard();
  }

  private setError(key: string, section = this.activeSection()): void { this.feedbackState.setError(key, section); }

  protected dismissToast(): void { this.feedbackState.dismiss(this.activeSection()); }

  private defaultSection(): DashboardSection { return defaultDashboardSection(this.currentRole()); }

  private canAccessSection(section: DashboardSection): boolean { return canAccessDashboardSection(section, this.currentRole()); }

  private canCheckOutAttendance(attendance: Attendance): boolean { return this.canManageAttendance() && attendance.userId === this.currentUser()?.id; }
}
