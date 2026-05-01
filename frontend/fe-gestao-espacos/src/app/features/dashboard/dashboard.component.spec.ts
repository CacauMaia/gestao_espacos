import { importProvidersFrom, signal } from '@angular/core';
import { provideRouter } from '@angular/router';
import { provideTransloco, TranslocoLoader, Translation } from '@jsverse/transloco';
import { byText, createComponentFactory, Spectator } from '@ngneat/spectator/vitest';
import {
  Bell,
  Building2,
  ChevronRight,
  DoorOpen,
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
import { DashboardService } from './dashboard.service';

class InlineLoader implements TranslocoLoader {
  public getTranslation() {
    return of({
      app: { subtitle: 'Teaching spaces' },
      common: { actions: 'Actions', add: 'Add', cancel: 'Cancel', edit: 'Edit', save: 'Save' },
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
      },
      students: {
        name: 'Student',
      },
      attendance: {
        live: 'Live',
        active: 'Active presences',
        entryAt: 'Entry',
        empty: 'There are no active presences.',
        quickAction: 'Quick action',
        checkIn: 'Check in',
        checkOut: 'Check out',
        registerEntry: 'Register entry',
        registerExit: 'Register exit',
        currentUser: 'Signed-in user',
        studentFlow: 'You can register your own entry and exit.',
      },
    } satisfies Translation);
  }
}

describe('DashboardComponent', () => {
  let spectator: Spectator<DashboardComponent>;

  const dashboardService = {
    listUsers: () => of([{ id: 'student-1', name: 'Ana', email: 'ana@example.com', role: 'STUDENT' as const }]),
    listSpaces: () => of([{ id: 'space-1', name: 'Lab 01', type: 'laboratory' as const, capacity: 20 }]),
    listActiveAttendances: () => of([]),
    listAttendanceNotifications: () => of([]),
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

  const authService = {
    currentUser: signal({ id: 'student-1', name: 'Ana', email: 'ana@example.com', role: 'STUDENT' as const }),
    logout: () => undefined,
  };

  const createComponent = createComponentFactory({
    component: DashboardComponent,
    providers: [
      provideRouter([]),
      { provide: DashboardService, useValue: dashboardService },
      { provide: AuthService, useValue: authService },
      importProvidersFrom(
        LucideAngularModule.pick({
          Bell,
          Building2,
          ChevronRight,
          DoorOpen,
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
    expect(spectator.query(byText('Check in'))).toBeTruthy();
  });
});
