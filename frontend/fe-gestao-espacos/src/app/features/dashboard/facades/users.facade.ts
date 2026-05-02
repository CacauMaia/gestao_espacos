import { inject, Injectable } from '@angular/core';
import { UserRole } from '../../../core/auth/auth.interfaces';
import { CreateUserPayload, User, UpdateUserPayload } from '../dashboard.interfaces';
import { DashboardService } from '../dashboard.service';

export interface UserListPageQuery {
  search?: string;
  role?: UserRole;
  page: number;
  limit: number;
}

@Injectable({ providedIn: 'root' })
export class UsersFacade {
  private readonly dashboardService = inject(DashboardService);

  public list(search?: string) {
    return this.dashboardService.listUsers(search);
  }

  public listPage(query: UserListPageQuery) {
    return this.dashboardService.listUsersPage(query);
  }

  public create(payload: CreateUserPayload) {
    return this.dashboardService.createUser(payload);
  }

  public update(id: string, payload: UpdateUserPayload) {
    return this.dashboardService.updateUser(id, payload);
  }

  public toggleActive(id: string, active: boolean) {
    return this.dashboardService.toggleUserActive(id, active);
  }

  public delete(user: User) {
    return this.dashboardService.deleteUser(user.id);
  }
}
