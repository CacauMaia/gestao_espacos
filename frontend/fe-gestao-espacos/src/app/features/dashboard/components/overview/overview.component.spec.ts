import { ComponentFixture, TestBed } from '@angular/core/testing';
import { importProvidersFrom } from '@angular/core';
import { provideTransloco, TranslocoLoader, Translation } from '@jsverse/transloco';
import { Building2, ChevronRight, DoorOpen, Gauge, LucideAngularModule, UserCheck, Users } from 'lucide-angular';
import { of } from 'rxjs';
import { OverviewComponent } from './overview.component';

class InlineLoader implements TranslocoLoader {
  public getTranslation() {
    return of({
      dashboard: {
        activePresences: 'Active presences',
        metrics: 'Metrics',
        occupancyRate: 'Occupancy rate',
        registeredStudents: 'Registered users',
        totalCapacity: 'Capacity in use',
        charts: {
          available: 'Available',
          bySpace: 'By space',
          capacityUsage: 'Capacity usage',
          empty: 'No data.',
          label: 'Charts',
          occupied: 'Occupied',
          occupancyBySpace: 'Occupancy by space',
          occupancyOverview: 'Overall summary',
        },
        sections: {
          label: 'Sections',
          attendance: 'Attendance',
          attendanceDescription: 'Entry and exit',
        },
      },
    } satisfies Translation);
  }
}

describe('OverviewComponent', () => {
  let fixture: ComponentFixture<OverviewComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [OverviewComponent],
      providers: [
        importProvidersFrom(LucideAngularModule.pick({ Building2, ChevronRight, DoorOpen, Gauge, UserCheck, Users })),
        provideTransloco({ config: { availableLangs: ['en'], defaultLang: 'en' }, loader: InlineLoader }),
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(OverviewComponent);
    fixture.componentRef.setInput('occupancyRate', 0.25);
    fixture.componentRef.setInput('activeAttendanceCount', 5);
    fixture.componentRef.setInput('registeredUsersCount', 12);
    fixture.componentRef.setInput('currentOccupancy', 5);
    fixture.componentRef.setInput('totalCapacity', 20);
    fixture.componentRef.setInput('availableCapacity', 15);
    fixture.componentRef.setInput('occupancyDonutBackground', 'conic-gradient(#000 25%, #fff 0)');
    fixture.componentRef.setInput('occupancyChartItems', [{ spaceId: 'space-1', name: 'Lab 01', capacity: 20, currentOccupancy: 5, availableSlots: 15, occupancyPercentage: 25 }]);
    fixture.componentRef.setInput('sectionCards', [
      { id: 'overview', icon: 'Gauge', titleKey: 'dashboard.sections.overview', descriptionKey: 'dashboard.sections.overviewDescription' },
      { id: 'attendance', icon: 'UserCheck', titleKey: 'dashboard.sections.attendance', descriptionKey: 'dashboard.sections.attendanceDescription' },
    ]);
    fixture.detectChanges();
  });

  it('renders dashboard metrics and emits section selection', () => {
    const sectionSpy = vi.fn();
    fixture.componentInstance.sectionSelected.subscribe(sectionSpy);

    expect(fixture.nativeElement.querySelector('[data-test="overview-metrics"]').textContent).toContain('25%');
    expect(fixture.nativeElement.querySelector('[data-test="overview-charts"]').textContent).toContain('Lab 01');

    fixture.nativeElement.querySelector('.section-card').click();

    expect(sectionSpy).toHaveBeenCalledWith('attendance');
  });
});
