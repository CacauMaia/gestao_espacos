import { PercentPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { TranslocoPipe } from '@jsverse/transloco';
import { LucideAngularModule } from 'lucide-angular';
import { OccupancyChartItem } from '../helpers/dashboard-charts.helper';
import { DashboardSection, SectionCard } from '../helpers/dashboard-sections.helper';

@Component({
  selector: 'app-dashboard-overview',
  imports: [PercentPipe, TranslocoPipe, LucideAngularModule],
  templateUrl: './dashboard-overview.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DashboardOverviewComponent {
  public readonly occupancyRate = input.required<number>();
  public readonly activeAttendanceCount = input.required<number>();
  public readonly registeredUsersCount = input.required<number>();
  public readonly currentOccupancy = input.required<number>();
  public readonly totalCapacity = input.required<number>();
  public readonly availableCapacity = input.required<number>();
  public readonly occupancyDonutBackground = input.required<string>();
  public readonly occupancyChartItems = input.required<readonly OccupancyChartItem[]>();
  public readonly sectionCards = input.required<readonly SectionCard[]>();

  public readonly sectionSelected = output<DashboardSection>();

  protected selectSection(section: DashboardSection): void {
    this.sectionSelected.emit(section);
  }
}
