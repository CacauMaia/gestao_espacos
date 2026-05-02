import { inject, Injectable } from '@angular/core';
import { UserRole } from '../../../core/auth/auth.interfaces';
import { SpaceType } from '../dashboard.interfaces';
import { DashboardService } from '../dashboard.service';

export interface ActiveAttendanceListPageQuery {
  userId?: string;
  spaceId?: string;
  role?: UserRole;
  spaceType?: SpaceType;
  search?: string;
  page: number;
  limit: number;
}

@Injectable({ providedIn: 'root' })
export class AttendanceFacade {
  private readonly dashboardService = inject(DashboardService);

  public listActivePage(query: ActiveAttendanceListPageQuery) {
    return this.dashboardService.listActiveAttendancesPage(query);
  }

  public listHistoryPage(query: ActiveAttendanceListPageQuery) {
    return this.dashboardService.listAttendanceHistoryPage(query);
  }

  public listCurrent() {
    return this.dashboardService.listCurrentAttendance();
  }

  public listNotifications() {
    return this.dashboardService.listAttendanceNotifications();
  }

  public checkIn(spaceId: string) {
    return this.dashboardService.checkIn(spaceId);
  }

  public checkOut() {
    return this.dashboardService.checkOut();
  }

  public forceCheckOut(attendanceId: string, note?: string) {
    return this.dashboardService.forceCheckOut(attendanceId, note);
  }
}
