import { inject, Injectable } from '@angular/core';
import { CreateSpacePayload, UpdateSpacePayload } from '../dashboard.interfaces';
import { DashboardService } from '../dashboard.service';

export interface SpaceListPageQuery {
  page: number;
  limit: number;
}

@Injectable({ providedIn: 'root' })
export class SpacesFacade {
  private readonly dashboardService = inject(DashboardService);

  public list() {
    return this.dashboardService.listSpaces();
  }

  public listPage(query: SpaceListPageQuery) {
    return this.dashboardService.listSpacesPage(query);
  }

  public listOccupancy() {
    return this.dashboardService.listOccupancy();
  }

  public create(payload: CreateSpacePayload) {
    return this.dashboardService.createSpace(payload);
  }

  public update(id: string, payload: UpdateSpacePayload) {
    return this.dashboardService.updateSpace(id, payload);
  }

  public delete(id: string) {
    return this.dashboardService.deleteSpace(id);
  }
}
