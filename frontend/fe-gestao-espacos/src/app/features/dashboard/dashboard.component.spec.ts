import { importProvidersFrom, signal } from '@angular/core';
import { provideRouter } from '@angular/router';
import { provideTransloco, TranslocoLoader, Translation } from '@jsverse/transloco';
import { byText, createComponentFactory, Spectator } from '@ngneat/spectator/vitest';
import {
  Bell,
  Building2,
  ChevronRight,
  DoorOpen,
  FileText,
  Gauge,
  LogOut,
  LucideAngularModule,
  Pencil,
  Plus,
  RefreshCw,
  Search,
  ShieldCheck,
  Trash2,
  UserCheck,
  Users,
} from 'lucide-angular';
import { of } from 'rxjs';
import { AuthService } from '../../core/auth/auth.service';
import { DashboardComponent } from './dashboard.component';
import { AttendanceFacade } from './facades/attendance.facade';
import { SpacesFacade } from './facades/spaces.facade';
import { UsersFacade } from './facades/users.facade';

class InlineLoader implements TranslocoLoader {
  public getTranslation() {
    return of({
      app: { subtitle: 'Teaching spaces' },
      common: { actions: 'Actions', add: 'Add', cancel: 'Cancel', edit: 'Edit', loadMore: 'Load more', save: 'Save' },
      dashboard: {
        title: 'Occupancy dashboard',
        refresh: 'Refresh data',
        logout: 'Sign out',
        notifications: 'Notifications',
        metrics: 'Dashboard metrics',
        occupancyRate: 'Occupancy rate',
        activePresences: 'Active presences',
        registeredStudents: 'Registered students',
        totalCapacity: 'Capacity in use',
        charts: {
          label: 'Occupancy charts',
          capacityUsage: 'Capacity usage',
          occupancyOverview: 'Overall summary',
          occupied: 'Occupied',
          available: 'Available',
          bySpace: 'By space',
          occupancyBySpace: 'Occupancy by space',
          empty: 'No occupancy data available.',
        },
        sections: {
          label: 'Section menu',
          overview: 'Overview',
          overviewDescription: 'Metrics and occupancy',
          attendance: 'Attendance',
          attendanceDescription: 'Entry and exit',
          students: 'Users',
          studentsDescription: 'Registry and search',
          spaces: 'Spaces',
          spacesDescription: 'Rooms and capacity',
        },
      },
      spaces: {
        name: 'Space',
        select: 'Select a space',
        type: 'Type',
        capacity: 'Capacity',
        available: 'Available',
      },
      spaceTypes: { classroom: 'Classroom', laboratory: 'Laboratory', study: 'Study room' },
      students: {
        name: 'Student',
      },
      attendance: {
        allSpaceTypes: 'All types',
        allCheckoutReasons: 'All closures',
        availableBoard: 'Available spaces',
        live: 'Live',
        active: 'Active presences',
        checkoutReason: 'Closure',
        checkoutReasonFilter: 'Closure',
        checkoutReasons: { legacy: 'Registered exit', manual: 'Registered by user', auto_expired: 'Automatic by time limit', forced: 'Closed by monitor/admin' },
        controls: 'Filters',
        currentBoard: 'Your current space',
        currentSpace: 'Current space',
        currentSummary: 'Your attendance',
        duration: 'Duration',
        entryAt: 'Entry',
        exitAt: 'Exit',
        empty: 'There are no active presences.',
        explore: 'Entry',
        findSpace: 'Find a space',
        forceCheckOut: 'Close',
        forceCheckOutNotePrompt: 'Optional note for closing this attendance:',
        history: 'Attendance history',
        historyEmpty: 'No closed attendances found.',
        historyEyebrow: 'History',
        inProgress: 'In progress',
        loadMoreSpaces: 'Load more spaces',
        minutesShort: 'min',
        noSpacesFound: 'No spaces found.',
        quickAction: 'Quick action',
        checkIn: 'Check in',
        checkOut: 'Check out',
        registerEntry: 'Register entry',
        registerExit: 'Register exit',
        currentUser: 'Signed-in user',
        searchHistory: 'Search history',
        searchSpace: 'Search by name or type',
        status: 'Status',
        studentFlow: 'You can register your own entry and exit.',
        spaceStatus: { available: 'Has capacity', full: 'Full', inProgress: 'Entry already registered' },
      },
    } satisfies Translation);
  }
}

describe('DashboardComponent', () => {
  let spectator: Spectator<DashboardComponent>;

  const usersFacade = {
    list: () => of([{ id: 'student-1', name: 'Ana', email: 'ana@example.com', role: 'STUDENT' as const }]),
  };

  const spacesFacade = {
    list: () => of([{ id: 'space-1', name: 'Lab 01', type: 'laboratory' as const, capacity: 20 }]),
    listOccupancy: () =>
      of([
        {
          spaceId: 'space-1',
          name: 'Lab 01',
          type: 'laboratory' as const,
          capacity: 20,
          currentOccupancy: 4,
          availableSlots: 16,
          occupancyPercentage: 20,
        },
      ]),
  };

  const attendanceFacade = {
    listCurrent: () => of(null),
    listHistoryPage: () => of({ items: [], meta: { page: 1, limit: 10, totalItems: 0, totalPages: 0, hasNextPage: false, hasPreviousPage: false } }),
    listNotifications: () => of([]),
  };

  const authService = {
    currentUser: signal({ id: 'student-1', name: 'Ana', email: 'ana@example.com', role: 'STUDENT' as const }),
    logout: () => undefined,
  };

  const createComponent = createComponentFactory({
    component: DashboardComponent,
    providers: [
      provideRouter([]),
      { provide: UsersFacade, useValue: usersFacade },
      { provide: SpacesFacade, useValue: spacesFacade },
      { provide: AttendanceFacade, useValue: attendanceFacade },
      { provide: AuthService, useValue: authService },
      importProvidersFrom(
        LucideAngularModule.pick({
          Bell,
          Building2,
          ChevronRight,
          DoorOpen,
          FileText,
          Gauge,
          LogOut,
          Pencil,
          Plus,
          RefreshCw,
          Search,
          ShieldCheck,
          Trash2,
          UserCheck,
          Users,
        }),
      ),
      provideTransloco({
        config: { availableLangs: ['en'], defaultLang: 'en' },
        loader: InlineLoader,
      }),
    ],
  });

  beforeEach(() => {
    spectator = createComponent();
  });

  it('should render the student attendance flow', () => {
    expect(spectator.query('[data-test="dashboard-page"]')).toBeTruthy();
    expect(spectator.query('[data-test="dashboard-attendance-section"]')).toBeTruthy();
    expect(spectator.query('[data-test="attendance-current-user"]')).toHaveText('Ana');
    expect(spectator.query(byText('Find a space'))).toBeTruthy();
  });
});
