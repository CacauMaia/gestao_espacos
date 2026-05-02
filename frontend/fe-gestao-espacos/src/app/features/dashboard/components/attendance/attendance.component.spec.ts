import { FormBuilder } from '@angular/forms';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { importProvidersFrom } from '@angular/core';
import { provideTransloco, TranslocoLoader, Translation } from '@jsverse/transloco';
import { DoorOpen, FileText, LogOut, LucideAngularModule, Plus, Search, UserCheck, Users } from 'lucide-angular';
import { of } from 'rxjs';
import { Attendance } from '../../dashboard.interfaces';
import { createCheckInForm } from '../../helpers/dashboard-forms.helper';
import { AttendanceComponent } from './attendance.component';

class InlineLoader implements TranslocoLoader {
  public getTranslation() {
    return of({
      common: { actions: 'Actions', loadMore: 'Load more' },
      spaces: { available: 'Available', capacity: 'Capacity', name: 'Space', type: 'Type' },
      spaceTypes: { classroom: 'Classroom', laboratory: 'Laboratory', study: 'Study room' },
      students: { name: 'Student' },
      attendance: {
        active: 'Active presences',
        allSpaceTypes: 'All types',
        allCheckoutReasons: 'All closures',
        availableBoard: 'Available spaces',
        checkoutReason: 'Closure',
        checkoutReasonFilter: 'Closure',
        checkoutReasons: { legacy: 'Registered exit', manual: 'Registered by user', auto_expired: 'Automatic by time limit', forced: 'Closed by monitor/admin' },
        checkOut: 'Check out',
        controls: 'Filters',
        currentBoard: 'Your current space',
        currentSpace: 'Current space',
        currentSummary: 'Your attendance',
        currentUser: 'Signed-in user',
        duration: 'Duration',
        empty: 'There are no active presences.',
        entryAt: 'Entry',
        exitAt: 'Exit',
        expectedExitAt: 'Expected exit',
        explore: 'Entry',
        findSpace: 'Find a space',
        forceCheckOut: 'Close',
        history: 'Attendance history',
        historyEmpty: 'No closed attendances found.',
        historyEyebrow: 'History',
        inProgress: 'In progress',
        live: 'Live',
        loadMoreSpaces: 'Load more spaces',
        minutesShort: 'min',
        noSpacesFound: 'No spaces found.',
        registerEntry: 'Register entry',
        registerExit: 'Register exit',
        searchHistory: 'Search history',
        searchSpace: 'Search by name or type',
        status: 'Status',
        spaceStatus: { available: 'Has capacity', full: 'Full', inProgress: 'Entry already registered' },
      },
    } satisfies Translation);
  }
}

describe('AttendanceComponent', () => {
  let fixture: ComponentFixture<AttendanceComponent>;

  const spaces = [
    { id: 'space-1', name: 'Lab 01', type: 'laboratory' as const, capacity: 20 },
    { id: 'space-2', name: 'Room A', type: 'classroom' as const, capacity: 30 },
  ];

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AttendanceComponent],
      providers: [
        importProvidersFrom(LucideAngularModule.pick({ DoorOpen, FileText, LogOut, Plus, Search, UserCheck, Users })),
        provideTransloco({ config: { availableLangs: ['en'], defaultLang: 'en' }, loader: InlineLoader }),
      ],
    }).compileComponents();
  });

  function createWithInputs(currentAttendance: Attendance | null = null): AttendanceComponent {
    fixture = TestBed.createComponent(AttendanceComponent);
    fixture.componentRef.setInput('checkInForm', createCheckInForm(new FormBuilder()));
    fixture.componentRef.setInput('currentUser', { id: 'user-1', name: 'Ana', email: 'ana@example.com', role: 'STUDENT' });
    fixture.componentRef.setInput('spaces', spaces);
    fixture.componentRef.setInput('occupancy', [
      { spaceId: 'space-1', name: 'Lab 01', type: 'laboratory', capacity: 20, currentOccupancy: 4, availableSlots: 16, occupancyPercentage: 20 },
      { spaceId: 'space-2', name: 'Room A', type: 'classroom', capacity: 30, currentOccupancy: 30, availableSlots: 0, occupancyPercentage: 100 },
    ]);
    fixture.componentRef.setInput('notifications', []);
    fixture.componentRef.setInput('currentAttendance', currentAttendance);
    fixture.componentRef.setInput('visibleActiveAttendances', []);
    fixture.componentRef.setInput('attendanceHistory', []);
    fixture.componentRef.setInput('isMutating', false);
    fixture.componentRef.setInput('canManageAttendance', true);
    fixture.componentRef.setInput('canSubmitCheckIn', true);
    fixture.componentRef.setInput('canViewActiveAttendances', false);
    fixture.componentRef.setInput('canForceCheckOutAttendances', false);
    fixture.componentRef.setInput('hasMoreActiveAttendances', false);
    fixture.componentRef.setInput('hasMoreAttendanceHistory', false);
    fixture.detectChanges();
    return fixture.componentInstance;
  }

  it('renders space cards and emits check-in for an available space', () => {
    const component = createWithInputs();
    const checkInSpy = vi.fn();
    component.checkInSubmitted.subscribe(checkInSpy);

    expect(fixture.nativeElement.querySelector('[data-test="attendance-current-user"]').textContent).toContain('Ana');
    expect(fixture.nativeElement.querySelector('[data-test="attendance-space-cards"]')).toBeTruthy();

    fixture.nativeElement.querySelector('[data-test="attendance-check-in-button"]').click();

    expect(checkInSpy).toHaveBeenCalledOnce();
    expect(component.checkInForm().controls.spaceId.value).toBe('space-1');
  });

  it('shows the current attendance card and emits checkout', () => {
    const component = createWithInputs({
      id: 'attendance-1',
      userId: 'user-1',
      spaceId: 'space-1',
      entryAt: '2026-05-02T10:00:00.000Z',
      expectedExitAt: '2026-05-02T11:00:00.000Z',
      exitAt: null,
      checkoutReason: null,
      space: spaces[0],
    });
    const checkoutSpy = vi.fn();
    component.currentUserCheckOut.subscribe(checkoutSpy);

    expect(fixture.nativeElement.querySelector('[data-test="attendance-current-card"]')).toBeTruthy();
    expect(fixture.nativeElement.querySelector('[data-test="attendance-space-cards"]')).toBeFalsy();

    fixture.nativeElement.querySelector('[data-test="attendance-check-out-button"]').click();

    expect(checkoutSpy).toHaveBeenCalledOnce();
  });

  it('renders history and emits forced checkout actions', () => {
    const component = createWithInputs();
    const activeAttendance: Attendance = {
      id: 'attendance-1',
      userId: 'user-2',
      spaceId: 'space-1',
      entryAt: '2026-05-02T10:00:00.000Z',
      exitAt: null,
      checkoutReason: null,
      user: { id: 'user-2', name: 'Rafa', email: 'rafa@example.com', role: 'STUDENT' },
      space: spaces[0],
    };
    const closedAttendance: Attendance = {
      ...activeAttendance,
      id: 'attendance-2',
      exitAt: '2026-05-02T10:45:00.000Z',
      checkoutReason: 'forced',
    };
    const returnedActiveAttendance: Attendance = {
      ...activeAttendance,
      id: 'attendance-3',
    };
    const forceSpy = vi.fn();
    const historySpy = vi.fn();

    component.attendanceForceCheckOut.subscribe(forceSpy);
    component.attendanceHistoryRequested.subscribe(historySpy);
    fixture.componentRef.setInput('visibleActiveAttendances', [activeAttendance]);
    fixture.componentRef.setInput('attendanceHistory', [closedAttendance, returnedActiveAttendance]);
    fixture.componentRef.setInput('canViewActiveAttendances', true);
    fixture.componentRef.setInput('canForceCheckOutAttendances', true);
    fixture.componentRef.setInput('hasMoreAttendanceHistory', true);
    fixture.detectChanges();

    fixture.nativeElement.querySelector('.table-action.danger').click();
    fixture.nativeElement.querySelector('.load-more-row:last-of-type button').click();

    expect(forceSpy).toHaveBeenCalledWith(activeAttendance);
    expect(historySpy).toHaveBeenCalledOnce();
    expect(fixture.nativeElement.textContent).toContain('Closed by monitor/admin');
    expect(fixture.nativeElement.textContent).not.toContain('attendance-3');
  });
});
