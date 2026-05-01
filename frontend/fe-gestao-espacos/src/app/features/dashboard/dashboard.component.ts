import { ChangeDetectionStrategy, Component, DestroyRef, ViewEncapsulation, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed, toSignal } from '@angular/core/rxjs-interop';
import { FormBuilder } from '@angular/forms';
import { Router } from '@angular/router';
import { TranslocoPipe } from '@jsverse/transloco';
import { LucideAngularModule } from 'lucide-angular';
import { Subject, Observable, debounceTime, distinctUntilChanged, finalize, forkJoin, of } from 'rxjs';
import { AuthService } from '../../core/auth/auth.service';
import { UserRole } from '../../core/auth/auth.interfaces';
import { StatusPillComponent } from '../../shared/ui/status-pill.component';
import { DashboardAttendanceComponent } from './components/dashboard-attendance.component';
import { DashboardOverviewComponent } from './components/dashboard-overview.component';
import { DashboardSpacesComponent } from './components/dashboard-spaces.component';
import { DashboardUsersComponent } from './components/dashboard-users.component';
import { Attendance, AttendanceNotification, CreateSpacePayload, CreateUserPayload, Occupancy, Space, User } from './dashboard.interfaces';
import { DashboardService } from './dashboard.service';
import { visibleAttendancesForMonitor } from './helpers/dashboard-attendance.helper';
import { buildOccupancyChartItems, buildOccupancyDonutBackground } from './helpers/dashboard-charts.helper';
import { createCheckInForm, createEditUserForm, createSpaceForm, createStudentForm } from './helpers/dashboard-forms.helper';
import { extractBackendErrorMessage } from './helpers/dashboard-http-error.helper';
import { resetDashboardSectionState } from './helpers/dashboard-section-state.helper';
import { canAccessDashboardSection, DASHBOARD_SECTION_CARDS, DashboardSection, defaultDashboardSection } from './helpers/dashboard-sections.helper';
import { StudentRoleFilter } from './helpers/dashboard-student-filter.helper';
import { buildUpdateUserPayload, filterUsersByRole, getUserInitials } from './helpers/dashboard-users.helper';

interface SectionNotice { message: string; section: DashboardSection; translate: boolean; }

@Component({
  selector: 'app-dashboard',
  imports: [TranslocoPipe, LucideAngularModule, StatusPillComponent, DashboardOverviewComponent, DashboardAttendanceComponent, DashboardUsersComponent, DashboardSpacesComponent],
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.scss',
  encapsulation: ViewEncapsulation.None,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DashboardComponent {
  private readonly destroyRef = inject(DestroyRef);
  private readonly formBuilder = inject(FormBuilder);
  private readonly dashboardService = inject(DashboardService);
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);
  private readonly userSearchTerms = new Subject<string>();

  protected readonly currentUser = this.authService.currentUser;
  protected readonly isMutating = signal(false);
  protected readonly searchQuery = signal('');
  protected readonly studentRoleFilter = signal<StudentRoleFilter>('ALL');
  protected readonly activeSection = signal<DashboardSection>('overview');
  protected readonly editingUserId = signal<string | null>(null);
  protected readonly notifications = signal<AttendanceNotification[]>([]);

  private readonly feedback = signal<SectionNotice | null>(null);
  private readonly error = signal<SectionNotice | null>(null);
  private readonly sectionCards = DASHBOARD_SECTION_CARDS;

  protected readonly activeSectionCard = computed(() => this.sectionCards.find((card) => card.id === this.activeSection()) ?? this.sectionCards[0]);
  protected readonly visibleFeedbackKey = computed(() => this.noticeKeyForActiveSection(this.feedback()));
  protected readonly visibleErrorKey = computed(() => this.noticeKeyForActiveSection(this.error()));
  protected readonly visibleErrorMessage = computed(() => this.noticeMessageForActiveSection(this.error()));
  private readonly currentRole = computed<UserRole | null>(() => this.currentUser()?.role ?? null);
  protected readonly canManageResources = computed(() => this.currentRole() === 'ADMIN');
  protected readonly canManageAttendance = computed(() => this.currentRole() === 'STUDENT' || this.currentRole() === 'MONITOR');
  protected readonly canViewActiveAttendances = computed(() => this.currentRole() === 'MONITOR');

  protected readonly visibleSectionCards = computed(() => this.sectionCards.filter((card) => this.canAccessSection(card.id)));
  protected readonly currentUserInitials = computed(() => getUserInitials(this.currentUser()?.name));

  protected readonly students = signal<User[]>([]);
  protected readonly spaces = signal<Space[]>([]);
  private readonly activeAttendances = signal<Attendance[]>([]);
  protected readonly occupancy = signal<Occupancy[]>([]);

  protected readonly studentForm = createStudentForm(this.formBuilder);
  protected readonly editUserForm = createEditUserForm(this.formBuilder);
  private readonly selectedStudentRole = toSignal(this.studentForm.controls.role.valueChanges, {
    initialValue: this.studentForm.controls.role.value,
  });
  private readonly studentFormStatus = toSignal(this.studentForm.statusChanges, {
    initialValue: this.studentForm.status,
  });

  protected readonly studentNamePlaceholderKey = computed(() => `students.placeholders.${this.selectedStudentRole()}.name`);
  protected readonly studentEmailPlaceholderKey = computed(() => `students.placeholders.${this.selectedStudentRole()}.email`);
  protected readonly studentPasswordPlaceholderKey = computed(() => `students.placeholders.${this.selectedStudentRole()}.password`);
  protected readonly canSubmitStudent = computed(() =>
    this.studentFormStatus() === 'VALID' && !this.isMutating() && this.canManageResources(),
  );
  private readonly editUserFormStatus = toSignal(this.editUserForm.statusChanges, {
    initialValue: this.editUserForm.status,
  });
  protected readonly canSubmitUserUpdate = computed(() =>
    Boolean(this.editingUserId()) && this.editUserFormStatus() === 'VALID' && !this.isMutating() && this.canManageResources(),
  );
  protected readonly isEditingUser = computed(() => Boolean(this.editingUserId()));

  protected readonly spaceForm = createSpaceForm(this.formBuilder);
  private readonly spaceFormStatus = toSignal(this.spaceForm.statusChanges, {
    initialValue: this.spaceForm.status,
  });
  protected readonly canSubmitSpace = computed(() =>
    this.spaceFormStatus() === 'VALID' && !this.isMutating() && this.canManageResources(),
  );

  protected readonly checkInForm = createCheckInForm(this.formBuilder);
  private readonly checkInFormStatus = toSignal(this.checkInForm.statusChanges, {
    initialValue: this.checkInForm.status,
  });
  protected readonly canSubmitCheckIn = computed(() =>
    this.checkInFormStatus() === 'VALID' && !this.isMutating() && this.canManageAttendance(),
  );

  protected readonly filteredStudents = computed(() => filterUsersByRole(this.students(), this.studentRoleFilter()));

  protected readonly totalCapacity = computed(() =>
    this.occupancy().reduce((total, item) => total + item.capacity, 0),
  );

  protected readonly currentOccupancy = computed(() =>
    this.occupancy().reduce((total, item) => total + item.currentOccupancy, 0),
  );

  protected readonly occupancyRate = computed(() => {
    const capacity = this.totalCapacity();
    return capacity ? this.currentOccupancy() / capacity : 0;
  });
  protected readonly occupancyDonutBackground = computed(() => buildOccupancyDonutBackground(this.occupancyRate()));
  protected readonly availableCapacity = computed(() => Math.max(0, this.totalCapacity() - this.currentOccupancy()));
  protected readonly occupancyChartItems = computed(() => buildOccupancyChartItems(this.occupancy()));

  protected readonly visibleActiveAttendances = computed(() => {
    if (this.currentRole() !== 'MONITOR') {
      return [];
    }

    return visibleAttendancesForMonitor(this.activeAttendances(), this.currentUser()?.id);
  });
  protected readonly activeAttendanceCount = computed(() => this.currentOccupancy());
  protected readonly notificationCount = computed(() => this.notifications().length);

  constructor() {
    this.userSearchTerms
      .pipe(
        debounceTime(300),
        distinctUntilChanged(),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe((query) => this.loadUsers(query));

    const initialSection = this.defaultSection();
    this.activeSection.set(initialSection);
    this.reloadSection(initialSection);
  }

  protected refreshActiveSection(): void {
    this.resetSectionState(this.activeSection());
    this.reloadSection(this.activeSection());
  }
  protected refreshNotifications(): void { this.loadNotifications(); }

  private loadDashboard(): void {
    this.clearError(this.activeSection());

    forkJoin({
      students: this.dashboardService.listUsers(this.searchQuery()),
      spaces: this.dashboardService.listSpaces(),
      activeAttendances: of([]),
      occupancy: this.dashboardService.listOccupancy(),
    })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: ({ students, spaces, activeAttendances, occupancy }) => {
          this.students.set(students);
          this.spaces.set(spaces);
          this.activeAttendances.set(activeAttendances);
          this.occupancy.set(occupancy);
        },
        error: () => this.setError('dashboard.loadError'),
      });
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

    this.mutate(this.dashboardService.createUser(this.studentForm.getRawValue() as CreateUserPayload), 'students.created', 'students', () => {
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

    this.mutate(this.dashboardService.updateUser(userId, buildUpdateUserPayload(this.editUserForm)), 'students.updated', 'students', () => {
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

    this.mutate(this.dashboardService.createSpace(this.spaceForm.getRawValue() as CreateSpacePayload), 'spaces.created', 'spaces', () => {
      this.spaceForm.reset({ name: '', type: 'classroom', capacity: 24 });
      this.loadSpaces();
      this.loadOccupancy();
    });
  }

  protected deleteStudent(student: User): void {
    if (!this.canManageResources()) {
      this.setError('dashboard.forbidden', 'students');
      return;
    }

    this.mutate(this.dashboardService.deleteUser(student.id), 'students.deleted', 'students', () => {
      this.loadUsers();
      this.loadActiveAttendances();
      this.loadOccupancy();
    });
  }

  protected deleteSpace(space: Space): void {
    if (!this.canManageResources()) {
      this.setError('dashboard.forbidden', 'spaces');
      return;
    }

    this.mutate(this.dashboardService.deleteSpace(space.id), 'spaces.deleted', 'spaces', () => {
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
    this.mutate(this.dashboardService.checkIn(this.currentUser()?.id ?? '', payload.spaceId), 'attendance.checkedIn', 'attendance', () => {
      this.checkInForm.reset({ spaceId: '' });
      this.loadNotifications();
      this.loadActiveAttendances();
      this.loadOccupancy();
    });
  }

  protected checkOut(attendance: Attendance): void {
    if (!this.canCheckOutAttendance(attendance)) {
      this.setError('dashboard.forbidden', 'attendance');
      return;
    }

    this.mutate(this.dashboardService.checkOut(attendance.userId), 'attendance.checkedOut', 'attendance', () => {
      this.loadNotifications();
      this.loadActiveAttendances();
      this.loadOccupancy();
    });
  }

  protected checkOutCurrentUser(): void {
    const userId = this.currentUser()?.id;

    if (!userId || !this.canManageAttendance()) {
      this.setError('dashboard.forbidden', 'attendance');
      return;
    }

    this.mutate(this.dashboardService.checkOut(userId), 'attendance.checkedOut', 'attendance', () => {
      this.loadNotifications();
      this.loadActiveAttendances();
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
  }

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
    this.clearFeedback(section);
    this.clearError(section);

    request$
      .pipe(finalize(() => this.isMutating.set(false)))
      .subscribe({
        next: () => {
          onSuccess?.();
          this.setFeedback(successKey, section);
        },
        error: (error: unknown) => this.setActionError(error, section),
      });
  }

  private loadUsers(search = this.searchQuery()): void {
    if (this.currentRole() !== 'ADMIN') {
      const currentUser = this.currentUser();
      this.students.set(currentUser ? [currentUser] : []);
      return;
    }

    this.dashboardService.listUsers(search).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: (users) => this.students.set(users),
      error: () => this.setError('dashboard.loadError', 'students'),
    });
  }

  private loadSpaces(): void {
    this.dashboardService.listSpaces().pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: (spaces) => this.spaces.set(spaces),
      error: () => this.setError('dashboard.loadError', 'spaces'),
    });
  }

  private loadActiveAttendances(): void {
    if (!this.canViewActiveAttendances()) {
      this.activeAttendances.set([]);
      return;
    }

    this.dashboardService.listActiveAttendances().pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: (attendances) => this.activeAttendances.set(attendances),
      error: () => this.setError('dashboard.loadError', 'attendance'),
    });
  }

  private loadOccupancy(): void {
    this.dashboardService.listOccupancy().pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: (occupancy) => this.occupancy.set(occupancy),
      error: () => this.setError('dashboard.loadError'),
    });
  }

  private loadNotifications(): void {
    if (!this.canManageAttendance()) {
      this.notifications.set([]);
      return;
    }

    this.dashboardService.listAttendanceNotifications().pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: (notifications) => this.notifications.set(notifications),
      error: () => this.setError('dashboard.loadError', 'attendance'),
    });
  }

  private resetSectionState(section: DashboardSection): void {
    this.clearFeedback(section);
    this.clearError(section);
    resetDashboardSectionState(section, {
      searchQuery: this.searchQuery,
      studentRoleFilter: this.studentRoleFilter,
      studentForm: this.studentForm,
      editUserForm: this.editUserForm,
      spaceForm: this.spaceForm,
      checkInForm: this.checkInForm,
      students: this.students,
      spaces: this.spaces,
      activeAttendances: this.activeAttendances,
      occupancy: this.occupancy,
    });
  }

  private reloadSection(section: DashboardSection): void {
    if (section === 'students') {
      this.loadUsers('');
      return;
    }

    if (section === 'spaces') {
      this.loadSpaces();
      this.loadOccupancy();
      return;
    }

    if (section === 'attendance') {
      this.loadSpaces();
      this.loadActiveAttendances();
      this.loadOccupancy();
      this.loadNotifications();
      return;
    }

    this.loadDashboard();
  }

  private setFeedback(key: string, section = this.activeSection()): void {
    this.feedback.set({ message: key, section, translate: true });
  }

  private setError(key: string, section = this.activeSection()): void {
    this.error.set({ message: key, section, translate: true });
  }

  private setActionError(error: unknown, section: DashboardSection): void {
    const message = extractBackendErrorMessage(error);
    this.error.set({ message: message ?? 'dashboard.actionError', section, translate: !message });
  }
  private clearFeedback(section: DashboardSection): void {
    if (this.feedback()?.section === section) {
      this.feedback.set(null);
    }
  }

  private clearError(section: DashboardSection): void {
    if (this.error()?.section === section) {
      this.error.set(null);
    }
  }

  private noticeKeyForActiveSection(notice: SectionNotice | null): string | null {
    return notice?.section === this.activeSection() && notice.translate ? notice.message : null;
  }

  private noticeMessageForActiveSection(notice: SectionNotice | null): string | null {
    return notice?.section === this.activeSection() && !notice.translate ? notice.message : null;
  }

  private defaultSection(): DashboardSection {
    return defaultDashboardSection(this.currentRole());
  }

  private canAccessSection(section: DashboardSection): boolean {
    return canAccessDashboardSection(section, this.currentRole());
  }

  private canCheckOutAttendance(attendance: Attendance): boolean {
    return this.canManageAttendance() && attendance.userId === this.currentUser()?.id;
  }
}
