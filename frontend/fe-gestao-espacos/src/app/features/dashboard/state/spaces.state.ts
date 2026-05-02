import { computed, DestroyRef, inject, Injectable, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Occupancy, PaginationMeta, Space } from '../dashboard.interfaces';
import { SpacesFacade } from '../facades/spaces.facade';
import {
  EMPTY_PAGINATION_META,
  loadSpacesPage,
} from '../helpers/dashboard-pagination.helper';
import {
  buildOccupancyChartItems,
  buildOccupancyDonutBackground,
} from '../helpers/dashboard-charts.helper';

@Injectable()
export class SpacesState {
  private readonly destroyRef = inject(DestroyRef);
  private readonly spacesFacade = inject(SpacesFacade);

  public readonly spaces = signal<Space[]>([]);
  public readonly occupancy = signal<Occupancy[]>([]);
  public readonly spacesPaginationMeta =
    signal<PaginationMeta>(EMPTY_PAGINATION_META);
  public readonly totalCapacity = computed(() =>
    this.occupancy().reduce((total, item) => total + item.capacity, 0),
  );
  public readonly currentOccupancy = computed(() =>
    this.occupancy().reduce((total, item) => total + item.currentOccupancy, 0),
  );
  public readonly occupancyRate = computed(() => {
    const capacity = this.totalCapacity();
    return capacity ? this.currentOccupancy() / capacity : 0;
  });
  public readonly occupancyDonutBackground = computed(() =>
    buildOccupancyDonutBackground(this.occupancyRate()),
  );
  public readonly availableCapacity = computed(() =>
    Math.max(0, this.totalCapacity() - this.currentOccupancy()),
  );
  public readonly occupancyChartItems = computed(() =>
    buildOccupancyChartItems(this.occupancy()),
  );
  public readonly activeAttendanceCount = this.currentOccupancy;

  public loadSpaces(
    append: boolean,
    paginated: boolean,
    setError: () => void,
  ): void {
    loadSpacesPage({
      spacesFacade: this.spacesFacade,
      destroyRef: this.destroyRef,
      append,
      paginated,
      spaces: this.spaces,
      meta: this.spacesPaginationMeta,
      setError,
    });
  }

  public loadOccupancy(setError: () => void): void {
    this.spacesFacade
      .listOccupancy()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (occupancy) => this.occupancy.set(occupancy),
        error: setError,
      });
  }
}
